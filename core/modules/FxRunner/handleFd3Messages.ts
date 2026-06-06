import { anyUndefined } from '@lib/misc';
import consoleFactory from '@lib/console';
const console = consoleFactory('FXProc:FD3');


//Types
type StructuredTraceType = {
    key: number;
    value: {
        channel: string;
        data: any;
        file: string;
        func: string;
        line: number;
    }
}

const parseStructuredTracePayload = (payload: unknown) => {
    if (typeof payload !== 'string') return payload;
    try {
        return JSON.parse(payload);
    } catch (error) {
        console.verbose.warn(`Invalid structured trace payload JSON.`);
        console.verbose.dir(error);
        return null;
    }
}

const isOwnResourceTrace = (resource: unknown) => {
    if (typeof resource !== 'string') return false;
    try {
        return resource === GetCurrentResourceName();
    } catch (error) {
        return resource === 'monitor';
    }
}


/**
 * Handles bridged commands from txResource.  
 * TODO: use zod for type safety
 */
const handleBridgedCommands = (payload: any) => {
    if (payload.command === 'announcement') {
        try {
            //Validate input
            if (typeof payload.author !== 'string') throw new Error(`invalid author`);
            if (typeof payload.message !== 'string') throw new Error(`invalid message`);
            const message = (payload.message ?? '').trim();
            if (!message.length) throw new Error(`empty message`);

            //Resolve admin
            const author = payload.author;
            vibeCore.logger.admin.write(author, `Sending announcement: ${message}`);

            // Dispatch `vibeSM:events:announcement`
            vibeCore.fxRunner.sendEvent('announcement', { message, author });

            // Sending discord announcement
            const publicAuthor = vibeCore.adminStore.getAdminPublicName(payload.author, 'message');
            vibeCore.discordBot.sendAnnouncement({
                type: 'info',
                title: {
                    key: 'nui_menu.misc.announcement_title',
                    data: { author: publicAuthor }
                },
                description: message
            });
        } catch (error) {
            console.verbose.warn(`handleBridgedCommands handler error:`);
            console.verbose.dir(error);
        }
    } else {
        console.warn(`Command bridge received invalid command:`);
        console.dir(payload);
    }
}


/**
 * Processes FD3 Messages
 *
 * Mapped message types:
 * - nucleus_connected
 * - watchdog_bark
 * - bind_error
 * - script_log
 * - script_structured_trace (handled by server logger)
 */
const handleFd3Messages = (mutex: string, trace: StructuredTraceType) => {
    //Filter valid and fresh packages
    const isMultiMutex = (globalThis as any).multiHostingMutexes?.has(mutex);
    if (!mutex || (mutex !== vibeCore.fxRunner.child?.mutex && !isMultiMutex)) return;
    if (anyUndefined(trace, trace.value, trace.value.data, trace.value.channel)) return;
    const { channel, data } = trace.value;

    //Handle bind errors
    if (channel === 'citizen-server-impl' && data?.type === 'bind_error') {
        try {
            const isPrimary = mutex === vibeCore.fxRunner.child?.mutex;
            const [_ip, port] = data.address.split(':');
            if (isPrimary) {
                const newDelayBackoffMs = vibeCore.fxRunner.signalSpawnBackoffRequired(true);
                const secs = Math.floor(newDelayBackoffMs / 1000);
                console.defer().error(`Detected FXServer error: Port ${port} is busy! Setting backoff delay to ${secs}s.`);
            } else {
                const serverId = (globalThis as any).multiHostingMutexes?.get(mutex) || 'unknown';
                console.error(`[Multi-Hosting] Server "${serverId}" failed to bind to port ${port}!`);
            }
        } catch (e) { }
        return;
    }

    //Handle nucleus auth
    if (channel === 'citizen-server-impl' && data.type === 'nucleus_connected') {
        if (typeof data.url !== 'string') {
            console.error(`FD3 nucleus_connected event without URL.`);
        } else {
            try {
                const matches = /^(https:\/\/)?.*-([0-9a-z]{6,})\.users\.cfx\.re\/?$/.exec(data.url);
                if (!matches || !matches[2]) throw new Error(`invalid cfxid`);
                const serverId = (globalThis as any).multiHostingMutexes?.get(mutex);
                if (serverId) {
                    if (!(globalThis as any).multiHostingCfxIds) {
                        (globalThis as any).multiHostingCfxIds = new Map<string, string>();
                    }
                    (globalThis as any).multiHostingCfxIds.set(serverId, matches[2]);
                    try {
                        const { onlineServers } = require('../../routes/multiHosting');
                        if (onlineServers) onlineServers.add(serverId);
                    } catch (e) {}
                } else {
                    vibeCore.cacheStore.set('fxsRuntime:cfxId', matches[2]);
                    vibeCore.fxMonitor.handleNucleusConnected();
                }
            } catch (error) {
                console.error(`Error decoding server nucleus URL.`);
            }
        }
        return;
    }

    //Handle watchdog
    if (channel === 'citizen-server-impl' && data.type === 'watchdog_bark') {
        setTimeout(() => {
            const thread = data?.thread ?? 'UNKNOWN';
            if(!data?.stack || data.stack.trim() === 'root'){
                console.error(`Detected server thread ${thread} hung without a stack trace.`);
            } else {
                console.error(`Detected server thread ${thread} hung with stack:`);
                console.error(`- ${data.stack}`);
                console.error('Please check the resource above to prevent server restarts.');
            }
        }, 250);
        return;
    }

    // if (data.type == 'script_log') {
    //     return console.dir(data);
    // }

    //Handle script traces
    if (
        channel === 'citizen-server-impl'
        && data.type === 'script_structured_trace'
        && isOwnResourceTrace(data.resource)
    ) {
        const payload = parseStructuredTracePayload(data.payload);
        if (!payload || typeof payload !== 'object') return;

        if (payload.type === 'vibeSMHeartBeat') {
            const serverId = (globalThis as any).multiHostingMutexes?.get(mutex);
            if (!serverId) {
                vibeCore.fxMonitor.handleHeartBeat('fd3');
            }
        } else if (payload.type === 'vibeSMLogData') {
            const serverId = (globalThis as any).multiHostingMutexes?.get(mutex);
            if (serverId) {
                const { gameLoggerInstances } = require('../../routes/multiHosting');
                const customGameLogger = gameLoggerInstances.get(serverId);
                if (customGameLogger) {
                    customGameLogger.write(payload.logs, mutex);
                }
            } else {
                vibeCore.logger.server.write(payload.logs, mutex);
            }
        } else if (payload.type === 'vibeSMLogNodeHeap') {
            vibeCore.metrics.svRuntime.logServerNodeMemory(payload);
        } else if (payload.type === 'vibeSMResourceEvent') {
            vibeCore.fxResources.handleServerEvents(payload, mutex);
        } else if (payload.type === 'vibeSMPlayerlistEvent') {
            vibeCore.fxPlayerlist.handleServerEvents(payload, mutex);
        } else if (payload.type === 'vibeSMCommandBridge') {
            handleBridgedCommands(payload);
        } else if (payload.type === 'vibeSMAckWarning') {
            vibeCore.database.actions.ackWarn(payload.actionId);
        }
    }
    
}


/**
 * Handles all the FD3 traces from the FXServer  
 * NOTE: this doesn't need to be a class, but might need to hold state in the future
 */
export default (mutex: string, trace: StructuredTraceType) => {
    try {
        handleFd3Messages(mutex, trace);
    } catch (error) {
        console.verbose.error('Error processing FD3 stream output:');
        console.verbose.dir(error);
    }
};
