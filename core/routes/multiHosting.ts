import { AuthedCtx } from '@modules/WebServer/ctxTypes';
import { vibeHostConfig, vibeEnv } from '@core/globalData';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { ApiToastResp } from '@shared/genericApiTypes';
import { spawn, ChildProcess } from 'node:child_process';
import FXServerLogger from '../modules/Logger/FXServerLogger';
import ServerLogger from '../modules/Logger/handlers/server';
import { DbInstance } from '../modules/Database/instance';

export const runningProcesses = new Map<string, ChildProcess>();
export const loggerInstances = new Map<string, FXServerLogger>();
export const gameLoggerInstances = new Map<string, ServerLogger>();
const databaseInstances = new Map<string, any>();
const modulename = 'WebServer:MultiHosting';


interface ServerConfig {
    id: string;
    name: string;
    port: number;
    dataPath: string;
    cfgPath: string;
}

const getDatabasePath = () => {
    return path.join(vibeHostConfig.dataPath, 'servers.json');
};

export const readServers = async (): Promise<ServerConfig[]> => {
    const dbPath = getDatabasePath();
    try {
        const data = await fsp.readFile(dbPath, 'utf-8');
        return JSON.parse(data);
    } catch {
        return [];
    }
};

const writeServers = async (servers: ServerConfig[]) => {
    const dbPath = getDatabasePath();
    await fsp.writeFile(dbPath, JSON.stringify(servers, null, 2), 'utf-8');
};

export const normalizePath = (p: string) => {
    try {
        return path.resolve(path.normalize(p)).replace(/\\/g, '/').toLowerCase();
    } catch {
        return p.replace(/\\/g, '/').toLowerCase();
    }
};

export const isDataPathInUse = async (targetDataPath: string, excludeId?: string): Promise<string | null> => {
    const normTarget = normalizePath(targetDataPath);

    // Check primary server
    if (vibeCore.fxRunner.child?.isAlive || !vibeCore.fxRunner.isIdle) {
        const { vibeConfigStoreContext } = require('@core/vibeSM');
        const primaryDataPath = vibeConfigStoreContext.exit(() => vibeConfig.server.dataPath);
        if (primaryDataPath) {
            const normPrimary = normalizePath(primaryDataPath);
            if (normTarget === normPrimary && excludeId !== 'primary') {
                return 'Primary Server';
            }
        }
    }

    // Check multi-hosted servers
    const servers = await readServers();
    for (const srv of servers) {
        if (srv.id === excludeId) continue;
        if (runningServers.has(srv.id)) {
            const normSrv = normalizePath(srv.dataPath);
            if (normTarget === normSrv) {
                return srv.name;
            }
        }
    }

    return null;
};

export const configStoreInstances = new Map<string, any>();
const databaseInitPromises = new Map<string, Promise<any>>();
const configStoreInitPromises = new Map<string, Promise<any>>();

export async function getServerContextStore(serverId: string) {
    if (!serverId || serverId === 'primary') return null;
    const servers = await readServers();
    const server = servers.find((s: any) => s.id === serverId);
    if (!server) return null;

    const isRunning = runningServers.has(serverId);
    let serverDb = databaseInstances.get(serverId);
    if (!serverDb) {
        let initPromise = databaseInitPromises.get(serverId);
        if (!initPromise) {
            initPromise = (async () => {
                const customDbPath = path.join(server.dataPath, 'data', 'playersDB.json');
                await fsp.mkdir(path.join(server.dataPath, 'data'), { recursive: true });
                const db = new DbInstance(customDbPath);
                await db.readyPromise;
                databaseInstances.set(serverId, db);
                return db;
            })();
            databaseInitPromises.set(serverId, initPromise);
        }
        serverDb = await initPromise;
    }

    let activeMutex = `mutex-${serverId}`;
    if ((globalThis as any).multiHostingMutexes instanceof Map) {
        for (const [m, id] of (globalThis as any).multiHostingMutexes.entries()) {
            if (id === serverId) {
                activeMutex = m;
                break;
            }
        }
    }

    let serverConfigStore = configStoreInstances.get(serverId);
    if (!serverConfigStore) {
        let initPromise = configStoreInitPromises.get(serverId);
        if (!initPromise) {
            initPromise = (async () => {
                const customConfigPath = path.join(server.dataPath, 'config.json');
                try {
                    if (!fs.existsSync(customConfigPath)) {
                        // copy from primary config path
                        const primaryConfigPath = path.join(vibeEnv.profilePath, 'config.json');
                        await fsp.mkdir(server.dataPath, { recursive: true });
                        await fsp.copyFile(primaryConfigPath, customConfigPath);
                    }
                } catch (e) {
                    console.error(`Failed to copy config.json template for server ${server.name}: ${(e as any).message}`);
                }
                
                const ConfigStore = (await import('../modules/ConfigStore')).default;
                const configStore = new ConfigStore(customConfigPath);
                configStoreInstances.set(serverId, configStore);
                
                // Ensure the dataPath and cfgPath inside the newly loaded config are overridden to the multi-hosted server's actual values
                const toSave = {
                    server: {
                        dataPath: server.dataPath,
                        cfgPath: server.cfgPath,
                    }
                };
                configStore.saveConfigs(toSave, 'vibeSM');
                return configStore;
            })();
            configStoreInitPromises.set(serverId, initPromise);
        }
        serverConfigStore = await initPromise;
    }

    return {
        serverId: server.id,
        vibeConfig: (serverConfigStore as any).activeConfigs,
        configStore: serverConfigStore,
        isIdle: !isRunning,
        child: isRunning ? { isAlive: true, mutex: activeMutex } : null,
        db: serverDb,
    };
}

// In-memory status registry of currently running servers
export const runningServers = new Set<string>();
export const onlineServers = new Set<string>();

export async function listServers(ctx: AuthedCtx) {
    if (!ctx.admin.testPermission('settings.multihosting', modulename)) {
        return ctx.send({ error: 'You do not have permission to execute this action.' });
    }
    const servers = await readServers();
    const serversWithStatus = servers.map(srv => {
        const cfxId = (globalThis as any).multiHostingCfxIds?.get(srv.id) || null;
        const isRunning = runningServers.has(srv.id);
        const isOnline = onlineServers.has(srv.id);
        
        let status = 'offline';
        if (isRunning) {
            status = isOnline ? 'online' : 'starting';
        }

        return {
            ...srv,
            isRunning,
            isOnline,
            status,
            cfxId,
            joinLink: cfxId ? `https://cfx.re/join/${cfxId}` : null
        };
    });
    return ctx.send(serversWithStatus);
}

export async function saveServer(ctx: AuthedCtx) {
    if (!ctx.admin.testPermission('settings.multihosting', modulename)) {
        return ctx.send<ApiToastResp>({
            type: 'error',
            msg: 'You do not have permission to execute this action.'
        });
    }
    const { id, name, port, dataPath, cfgPath } = ctx.request.body as Partial<ServerConfig>;
    
    if (!name || !port || !dataPath || !cfgPath) {
        return ctx.send<ApiToastResp>({
            type: 'error',
            msg: 'Missing required fields: name, port, dataPath, cfgPath.'
        });
    }

    const parsedPort = Number(port);
    if (isNaN(parsedPort) || parsedPort < 1024 || parsedPort > 65535) {
        return ctx.send<ApiToastResp>({
            type: 'error',
            msg: 'Invalid port. Must be between 1024 and 65535.'
        });
    }

    const servers = await readServers();

    // Check port conflicts
    const portConflict = servers.find(srv => srv.port === parsedPort && srv.id !== id);
    if (portConflict) {
        return ctx.send<ApiToastResp>({
            type: 'error',
            msg: `Port ${parsedPort} is already in use by server "${portConflict.name}".`
        });
    }

    if (id) {
        // Edit mode
        const index = servers.findIndex(srv => srv.id === id);
        if (index === -1) {
            return ctx.send<ApiToastResp>({ type: 'error', msg: 'Server not found.' });
        }
        servers[index] = { id, name, port: parsedPort, dataPath, cfgPath };
        await writeServers(servers);
        return ctx.send<ApiToastResp>({ type: 'success', msg: `Server "${name}" updated successfully.` });
    } else {
        // Create mode
        const newId = `server-${Date.now()}`;
        servers.push({ id: newId, name, port: parsedPort, dataPath, cfgPath });
        await writeServers(servers);
        return ctx.send<ApiToastResp>({ type: 'success', msg: `Server "${name}" created successfully.` });
    }
}

export async function deleteServer(ctx: AuthedCtx) {
    if (!ctx.admin.testPermission('settings.multihosting', modulename)) {
        return ctx.send<ApiToastResp>({
            type: 'error',
            msg: 'You do not have permission to execute this action.'
        });
    }
    const { id } = ctx.params;
    if (!id) {
        return ctx.send<ApiToastResp>({ type: 'error', msg: 'Missing server ID.' });
    }

    if (runningServers.has(id)) {
        return ctx.send<ApiToastResp>({
            type: 'error',
            msg: 'Cannot delete a running server. Please stop it first.'
        });
    }

    const servers = await readServers();
    const filtered = servers.filter(srv => srv.id !== id);
    await writeServers(filtered);
    
    return ctx.send<ApiToastResp>({ type: 'success', msg: 'Server configuration removed.' });
}

export async function controlServer(ctx: AuthedCtx) {
    if (!ctx.admin.testPermission('settings.multihosting', modulename)) {
        return ctx.send<ApiToastResp>({
            type: 'error',
            msg: 'You do not have permission to execute this action.'
        });
    }
    const { id } = ctx.params;
    const { action } = ctx.request.body as { action: string };

    if (!id || !action) {
        return ctx.send<ApiToastResp>({ type: 'error', msg: 'Invalid server ID or action.' });
    }

    const servers = await readServers();
    const server = servers.find(srv => srv.id === id);
    if (!server) {
        return ctx.send<ApiToastResp>({ type: 'error', msg: 'Server not found.' });
    }

    if (action === 'start') {
        if (runningServers.has(id)) {
            return ctx.send<ApiToastResp>({ type: 'error', msg: 'Server is already running.' });
        }

        const activeConflictName = await isDataPathInUse(server.dataPath, id);
        if (activeConflictName) {
            return ctx.send<ApiToastResp>({
                type: 'error',
                msg: `Cannot start server because its data folder is already in use by "${activeConflictName}".`
            });
        }

        try {
            const { vibeConfigStoreContext } = await import('@core/vibeSM');
            const customVibeConfig = {
                ...vibeConfig,
                server: {
                    ...vibeConfig.server,
                    dataPath: server.dataPath,
                    cfgPath: server.cfgPath,
                }
            };

            const store = {
                vibeConfig: customVibeConfig,
            };

            const { getFxSpawnVariables } = await import('@modules/FxRunner/utils');
            const { customAlphabet } = await import('nanoid/non-secure');
            const dict49 = (await import('nanoid-dictionary/nolookalikes')).default;
            const StreamValues = (await import('stream-json/streamers/StreamValues')).default;
            const handleFd3Messages = (await import('@modules/FxRunner/handleFd3Messages')).default;

            if (!(globalThis as any).multiHostingMutexes) {
                (globalThis as any).multiHostingMutexes = new Map<string, string>();
            }

            if ((globalThis as any).multiHostingCfxIds) {
                (globalThis as any).multiHostingCfxIds.delete(id);
            }

            // Resolve all config variables synchronously in context to prevent AsyncLocalStorage loss on awaits
            const { fxSpawnVars, loggerConfig } = vibeConfigStoreContext.run(store, () => {
                return {
                    fxSpawnVars: getFxSpawnVariables(),
                    loggerConfig: vibeConfig.logger?.fxserver || {}
                };
            });

            // Create a temporary server.cfg with the overridden port
            const tempCfgPath = path.join(path.dirname(server.cfgPath), `temp_multi_${server.id}.cfg`);
            let cfgContent = '';
            try {
                cfgContent = await fsp.readFile(server.cfgPath, 'utf-8');
                cfgContent = cfgContent.split('\n').map(line => {
                    const trimmed = line.trim();
                    if (trimmed.startsWith('endpoint_add_tcp') || trimmed.startsWith('endpoint_add_udp')) {
                        return line.replace(/(:\d+)(["']?\s*)$/, `:${server.port}$2`);
                    }
                    return line;
                }).join('\n');
                await fsp.writeFile(tempCfgPath, cfgContent, 'utf-8');
            } catch (err) {
                console.error(`Failed to create temp config: ${(err as any).message}`);
            }

            // Replace the original cfg path with the temporary one in the args
            const modifiedArgs = fxSpawnVars.args.map(arg => arg === fxSpawnVars.cfgPath ? tempCfgPath : arg);

            // Clean out any command-line license key set by the primary server to let Server #2 use its own config-defined key
            const cleanedArgs: string[] = [];
            for (let i = 0; i < modifiedArgs.length; i++) {
                if (modifiedArgs[i] === '+set' && modifiedArgs[i + 1] === 'sv_licenseKey') {
                    i += 2; // skip '+set', 'sv_licenseKey', and the key value
                    continue;
                }
                if (modifiedArgs[i] === 'sv_licenseKey') {
                    i += 1;
                    continue;
                }
                cleanedArgs.push(modifiedArgs[i]);
            }

            // Construct the process execution arguments with serverProfile and txAdminPort
            const customArgs = [
                ...cleanedArgs,
                '+set', 'serverProfile', id,
                '+set', 'txAdminPort', String(server.port)
            ];

            const serverLogger = new FXServerLogger(path.join(server.dataPath, 'logs'), loggerConfig, server.id);
            loggerInstances.set(id, serverLogger);

            const gameLogger = new ServerLogger(path.join(server.dataPath, 'logs'), loggerConfig, server.id);
            gameLoggerInstances.set(id, gameLogger);

            const childProc = spawn(
                fxSpawnVars.bin,
                customArgs,
                {
                    cwd: fxSpawnVars.dataPath,
                    stdio: ['pipe', 'pipe', 'pipe', 'pipe'],
                    creationFlags: 0x00000010 // CREATE_NEW_CONSOLE
                }
            );

            const genMutex = customAlphabet(dict49, 5);
            const newMutex = genMutex();

            (globalThis as any).multiHostingMutexes.set(newMutex, id);
            
            const jsoninPipe = childProc.stdio[3].pipe(StreamValues.withParser() as any);
            jsoninPipe.on('data', handleFd3Messages.bind(null, newMutex));

            // Pipe streams to keep the IO loop alive and avoid memory locks
            childProc.stdout.on('data', (data) => {
                serverLogger.writeFxsOutput(0, data);
            });
            childProc.stderr.on('data', (data) => {
                serverLogger.writeFxsOutput(1, data);
            });

            childProc.on('exit', () => {
                (globalThis as any).multiHostingMutexes?.delete(newMutex);
                runningProcesses.delete(id);
                runningServers.delete(id);
                onlineServers.delete(id);
                loggerInstances.delete(id);
                gameLoggerInstances.delete(id);
                if ((globalThis as any).multiHostingCfxIds) {
                    (globalThis as any).multiHostingCfxIds.delete(id);
                }
                if ((globalThis as any).multiHostingStartTimes) {
                    (globalThis as any).multiHostingStartTimes.delete(id);
                }
                vibeCore.fxPlayerlist.handleServerClose(newMutex);
                fsp.unlink(tempCfgPath).catch(() => {});
            });

            runningProcesses.set(id, childProc);
            runningServers.add(id);
            if (!(globalThis as any).multiHostingStartTimes) {
                (globalThis as any).multiHostingStartTimes = new Map<string, number>();
            }
            (globalThis as any).multiHostingStartTimes.set(id, Date.now());

            return ctx.send<ApiToastResp>({ type: 'success', msg: `Server "${server.name}" started successfully on port ${server.port}.` });
        } catch (e) {
            return ctx.send<ApiToastResp>({ type: 'error', msg: `Failed to spawn server: ${(e as any).message}` });
        }

    } else if (action === 'stop') {
        if (!runningServers.has(id)) {
            return ctx.send<ApiToastResp>({ type: 'success', msg: 'Server is already stopped.' });
        }

        const proc = runningProcesses.get(id);
        if (proc) {
            proc.kill();
            runningProcesses.delete(id);
        }
        runningServers.delete(id);
        onlineServers.delete(id);
        if ((globalThis as any).multiHostingStartTimes) {
            (globalThis as any).multiHostingStartTimes.delete(id);
        }

        return ctx.send<ApiToastResp>({ type: 'success', msg: `Server "${server.name}" stopped.` });
    } else if (action === 'restart') {
        if (runningServers.has(id)) {
            const proc = runningProcesses.get(id);
            if (proc) {
                proc.kill();
                runningProcesses.delete(id);
            }
            runningServers.delete(id);
            onlineServers.delete(id);
            if ((globalThis as any).multiHostingStartTimes) {
                (globalThis as any).multiHostingStartTimes.delete(id);
            }
            for (let i = 0; i < 20; i++) {
                if (!runningServers.has(id)) break;
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }
        ctx.request.body = { action: 'start' };
        return controlServer(ctx);
    }

    return ctx.send<ApiToastResp>({ type: 'error', msg: 'Unknown action.' });
}


