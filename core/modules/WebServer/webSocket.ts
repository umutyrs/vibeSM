const modulename = 'WebSocket';
import { Server as SocketIO, Socket, RemoteSocket } from 'socket.io';
import consoleFactory from '@lib/console';
import statusRoom from './wsRooms/status';
import dashboardRoom from './wsRooms/dashboard';
import playerlistRoom from './wsRooms/playerlist';
import liveconsoleRoom from './wsRooms/liveconsole';
import serverlogRoom from './wsRooms/serverlog';
import { AuthedAdminType, checkRequestAuth } from './authLogic';
import { SocketWithSession } from './ctxTypes';
import { isIpAddressLocal } from '@lib/host/isIpAddressLocal';
import { vibeEnv } from '@core/globalData';
const console = consoleFactory(modulename);

//Types
export type RoomCommandHandlerType = {
    permission: string | true;
    handler: (admin: AuthedAdminType, ...args: any) => any
}

export type RoomType = {
    permission: string | true;
    eventName: string;
    cumulativeBuffer: boolean;
    outBuffer: any;
    commands?: Record<string, RoomCommandHandlerType>;
    initialData: () => any;
}

//NOTE: quen adding multiserver, create dynamic rooms like playerlist#<svname>
const VALID_ROOMS = ['status', 'dashboard', 'liveconsole', 'serverlog', 'playerlist'] as const;
type RoomNames = typeof VALID_ROOMS[number];


//Helpers
const getIP = (socket: SocketWithSession) => {
    return socket?.request?.socket?.remoteAddress ?? 'unknown';
};
const terminateSession = (socket: SocketWithSession, reason: string, shouldLog = true) => {
    try {
        socket.emit('logout', reason);
        socket.disconnect();
        if (shouldLog) {
            console.verbose.warn('SocketIO', 'dropping new connection:', reason);
        }
    } catch (error) { }
};
const forceUiReload = (socket: SocketWithSession) => {
    try {
        socket.emit('refreshToUpdate');
        socket.disconnect();
    } catch (error) { }
};
const sendShutdown = (socket: SocketWithSession) => {
    try {
        socket.emit('vibeSMShuttingDown');
        socket.disconnect();
    } catch (error) { }
};

export default class WebSocket {
    readonly #io: SocketIO;
    readonly #rooms: Record<RoomNames, RoomType>;
    #eventBuffer: { name: string, data: any }[] = [];
    #dynamicBuffers = new Map<string, {
        baseRoomName: RoomNames;
        cumulativeBuffer: boolean;
        outBuffer: any;
    }>();

    constructor(io: SocketIO) {
        this.#io = io;
        this.#rooms = {
            status: statusRoom,
            dashboard: dashboardRoom,
            playerlist: playerlistRoom,
            liveconsole: liveconsoleRoom,
            serverlog: serverlogRoom,
        };

        setInterval(this.flushBuffers.bind(this), 250);
    }


    /**
     * Sends a shutdown signal to all connected clients
     */
    public async handleShutdown() {
        const sockets = await this.#io.fetchSockets();
        for (const socket of sockets) {
            //@ts-ignore
            sendShutdown(socket);
        }
    }


    /**
     * Refreshes the auth data for all connected admins
     * If an admin is not authed anymore, they will be disconnected
     * If an admin lost permission to a room, they will be kicked out of it
     * This is called from AdminStore.refreshOnlineAdmins()
     */
    async reCheckAdminAuths() {
        const sockets = await this.#io.fetchSockets();
        console.verbose.warn(`SocketIO`, `AdminStore changed, refreshing auth for ${sockets.length} sockets.`);
        for (const socket of sockets) {
            //@ts-ignore
            const reqIp = getIP(socket);
            const authResult = checkRequestAuth(
                socket.handshake.headers,
                reqIp,
                isIpAddressLocal(reqIp),
                //@ts-ignore
                socket.sessTools
            );
            if (!authResult.success) {
                //@ts-ignore
                return terminateSession(socket, 'session invalidated by websocket.reCheckAdminAuths()', true);
            }

            //Sending auth data update - even if nothing changed
            const { admin: authedAdmin } = authResult;
            socket.emit('updateAuthData', authedAdmin.getAuthData());

            //Checking permission of all joined rooms
            for (const roomName of socket.rooms) {
                if (roomName === socket.id) continue;
                const [baseRoomName] = roomName.split('#');
                const roomData = this.#rooms[baseRoomName as RoomNames];
                if (roomData && roomData.permission !== true && !authedAdmin.hasPermission(roomData.permission)) {
                    socket.leave(roomName);
                }
            }
        }
    }


    /**
     * Handles incoming connection requests,
     */
    async handleConnection(socket: SocketWithSession) {
        //Check the UI version
        if (socket.handshake.query.uiVersion && socket.handshake.query.uiVersion !== vibeEnv.vibeVersion) {
            return forceUiReload(socket);
        }

        try {
            //Checking for session auth
            const reqIp = getIP(socket);
            const authResult = checkRequestAuth(
                socket.handshake.headers,
                reqIp,
                isIpAddressLocal(reqIp),
                socket.sessTools
            );
            if (!authResult.success) {
                return terminateSession(socket, 'invalid session', false);
            }
            const { admin: authedAdmin } = authResult;


            //Check if joining any room
            if (typeof socket.handshake.query.rooms !== 'string') {
                return terminateSession(socket, 'no query.rooms');
            }

            //Validating requested rooms
            const requestedRooms = socket.handshake.query.rooms
                .split(',')
                .filter((v, i, arr) => arr.indexOf(v) === i);
            if (!requestedRooms.length) {
                return terminateSession(socket, 'no valid room requested');
            }

            //To prevent user from receiving data duplicated in initial data and buffer data
            //we need to flush the buffers first. This is a bit hacky, but performance shouldn't
            //really be an issue since we are first validating the user auth.
            this.flushBuffers();

            //For each requested room
            for (let requestedRoomName of requestedRooms) {
                let [baseRoomName, roomServerId] = requestedRoomName.split('#');
                if (roomServerId === 'primary') {
                    requestedRoomName = baseRoomName;
                    roomServerId = undefined;
                }
                if (!VALID_ROOMS.includes(baseRoomName as any)) {
                    continue;
                }
                const room = this.#rooms[baseRoomName as RoomNames];

                //Checking Perms
                if (room.permission !== true && !authedAdmin.hasPermission(room.permission)) {
                    continue;
                }

                //Setting up event handlers
                for (const [commandName, commandData] of Object.entries(room.commands ?? [])) {
                    if (commandData.permission === true || authedAdmin.hasPermission(commandData.permission)) {
                        socket.on(commandName, (...args) => {
                            //Checking if admin is still in the room - perms change can make them be kicked out of room
                            if (socket.rooms.has(requestedRoomName)) {
                                if (commandName === 'consoleCommand' && roomServerId && roomServerId !== 'primary') {
                                    const { runningProcesses, loggerInstances } = require('@routes/multiHosting');
                                    const proc = runningProcesses.get(roomServerId);
                                    if (proc) {
                                        const command = args[0];
                                        if (typeof command === 'string') {
                                            const sanitized = command.replaceAll(/\n/g, ' ');
                                            if (sanitized.length > 0) {
                                                authedAdmin.logCommand(sanitized);
                                                const serverLogger = loggerInstances.get(roomServerId);
                                                if (serverLogger) {
                                                    serverLogger.logAdminCommand(authedAdmin.name, sanitized);
                                                }
                                            }
                                            proc.stdin?.write(sanitized + '\n');
                                        }
                                    }
                                } else {
                                    commandData.handler(authedAdmin, ...args);
                                }
                            } else {
                                console.verbose.debug('SocketIO', `Command '${requestedRoomName}#${commandName}' was ignored due to admin not being in the room.`);
                            }
                        });
                    }
                }

                //Sending initial data
                socket.join(requestedRoomName);
                
                let initialData: any;
                if (roomServerId && roomServerId !== 'primary') {
                    const { getServerContextStore } = require('@routes/multiHosting');
                    const store = await getServerContextStore(roomServerId);
                    if (store) {
                        const { vibeConfigStoreContext } = require('@core/vibeSM');
                        initialData = await vibeConfigStoreContext.run(store, async () => {
                            if (baseRoomName === 'liveconsole') {
                                const { loggerInstances } = require('@routes/multiHosting');
                                const serverLogger = loggerInstances.get(roomServerId);
                                return serverLogger ? serverLogger.getRecentBuffer() : '';
                            } else if (baseRoomName === 'dashboard') {
                                return room.initialData();
                            } else if (baseRoomName === 'status') {
                                return vibeManager.globalStatus;
                            }
                            return room.initialData();
                        });
                    } else {
                        initialData = room.initialData();
                    }
                } else {
                    initialData = room.initialData();
                }

                socket.emit(room.eventName, initialData);
            }

            //General events
            socket.on('disconnect', (reason) => {
                // console.verbose.debug('SocketIO', `Client disconnected with reason: ${reason}`);
            });
            socket.on('error', (error) => {
                console.verbose.debug('SocketIO', `Socket error with message: ${error.message}`);
            });

            // console.verbose.log('SocketIO', `Connected: ${authedAdmin.name} from ${getIP(socket)}`);
        } catch (error) {
            console.error('SocketIO', `Error handling new connection: ${(error as Error).message}`);
            socket.disconnect();
        }
    }


    /**
     * Adds data to the a room buffer
     */
    buffer<T>(roomName: string, data: T) {
        let baseRoomName: RoomNames;
        let suffix = '';
        if (roomName.includes('#')) {
            const parts = roomName.split('#');
            baseRoomName = parts[0] as RoomNames;
            suffix = '#' + parts[1];
        } else {
            baseRoomName = roomName as RoomNames;
        }

        const baseRoom = this.#rooms[baseRoomName];
        if (!baseRoom) throw new Error('Room not found');

        if (suffix) {
            let dyn = this.#dynamicBuffers.get(roomName);
            if (!dyn) {
                dyn = {
                    baseRoomName,
                    cumulativeBuffer: baseRoom.cumulativeBuffer,
                    outBuffer: baseRoom.cumulativeBuffer
                        ? (Array.isArray(baseRoom.outBuffer) ? [] : (typeof baseRoom.outBuffer === 'string' ? '' : null))
                        : null,
                };
                this.#dynamicBuffers.set(roomName, dyn);
            }
            if (dyn.cumulativeBuffer) {
                if (Array.isArray(dyn.outBuffer)) {
                    dyn.outBuffer.push(data);
                } else if (typeof dyn.outBuffer === 'string') {
                    dyn.outBuffer += data;
                } else {
                    throw new Error(`cumulative buffers can only be arrays or strings`);
                }
            } else {
                dyn.outBuffer = data;
            }
        } else {
            if (baseRoom.cumulativeBuffer) {
                if (Array.isArray(baseRoom.outBuffer)) {
                    baseRoom.outBuffer.push(data);
                } else if (typeof baseRoom.outBuffer === 'string') {
                    baseRoom.outBuffer += data;
                } else {
                    throw new Error(`cumulative buffers can only be arrays or strings`);
                }
            } else {
                baseRoom.outBuffer = data;
            }
        }
    }


    /**
     * Flushes the data buffers
     * NOTE: this will also send data to users that no longer have permissions
     */
    flushBuffers() {
        //Sending static room data
        for (const [roomName, room] of Object.entries(this.#rooms)) {
            if (room.cumulativeBuffer && room.outBuffer.length) {
                this.#io.to(roomName).emit(room.eventName, room.outBuffer);
                if (Array.isArray(room.outBuffer)) {
                    room.outBuffer = [];
                } else if (typeof room.outBuffer === 'string') {
                    room.outBuffer = '';
                } else {
                    throw new Error(`cumulative buffers can only be arrays or strings`);
                }
            } else if (!room.cumulativeBuffer && room.outBuffer !== null) {
                this.#io.to(roomName).emit(room.eventName, room.outBuffer);
                room.outBuffer = null;
            }
        }

        //Sending dynamic room data
        for (const [roomName, dyn] of this.#dynamicBuffers.entries()) {
            const baseRoom = this.#rooms[dyn.baseRoomName];
            if (dyn.cumulativeBuffer && dyn.outBuffer.length) {
                this.#io.to(roomName).emit(baseRoom.eventName, dyn.outBuffer);
                if (Array.isArray(dyn.outBuffer)) {
                    dyn.outBuffer = [];
                } else if (typeof dyn.outBuffer === 'string') {
                    dyn.outBuffer = '';
                } else {
                    throw new Error(`cumulative buffers can only be arrays or strings`);
                }
            } else if (!dyn.cumulativeBuffer && dyn.outBuffer !== null) {
                this.#io.to(roomName).emit(baseRoom.eventName, dyn.outBuffer);
                dyn.outBuffer = null;
            }
        }

        //Sending events
        for (const event of this.#eventBuffer) {
            this.#io.emit(event.name, event.data);
        }
        this.#eventBuffer = [];
    }


    /**
     * Pushes the initial data again for everyone in a room
     * NOTE: we probably don't need to wait one tick, but since we are working with 
     * event handling, things might take a tick to update their status (maybe discord bot?)
     */
    async pushRefresh(roomName: string) {
        let baseRoomName: RoomNames;
        let suffix = '';
        if (roomName.includes('#')) {
            const parts = roomName.split('#');
            baseRoomName = parts[0] as RoomNames;
            suffix = '#' + parts[1];
        } else {
            baseRoomName = roomName as RoomNames;
        }

        if (!VALID_ROOMS.includes(baseRoomName)) throw new Error(`Invalid room '${baseRoomName}'.`);
        const room = this.#rooms[baseRoomName];
        if (room.cumulativeBuffer) throw new Error(`The room '${baseRoomName}' has a cumulative buffer.`);

        if (suffix) {
            const serverId = suffix.substring(1);
            const { getServerContextStore } = require('@routes/multiHosting');
            const store = await getServerContextStore(serverId);
            if (store) {
                const { vibeConfigStoreContext } = require('@core/vibeSM');
                const initialData = await vibeConfigStoreContext.run(store, async () => {
                    if (baseRoomName === 'status') {
                        return vibeManager.globalStatus;
                    }
                    return room.initialData();
                });
                
                let dyn = this.#dynamicBuffers.get(roomName);
                if (!dyn) {
                    dyn = {
                        baseRoomName,
                        cumulativeBuffer: false,
                        outBuffer: initialData,
                    };
                    this.#dynamicBuffers.set(roomName, dyn);
                } else {
                    dyn.outBuffer = initialData;
                }
            }
        } else {
            setImmediate(() => {
                room.outBuffer = room.initialData();
            });
        }
    }


    /**
     * Broadcasts an event to all connected clients
     * This is used for data syncs that are not related to a specific room
     * eg: update available
     */
    pushEvent<T>(name: string, data: T) {
        this.#eventBuffer.push({ name, data });
    }
};
