import type { InitializedCtx } from '@modules/WebServer/ctxTypes';
import { readServers, runningServers } from './multiHosting';

/**
 * Returns public status check info for discord bot telemetry
 */
export default async function PublicStatus(ctx: InitializedCtx) {
    let totalServers = 1; // Primary server
    let activeServers = 0;

    // Check if primary server is running/alive
    const isPrimaryActive = vibeCore?.fxRunner?.child?.isAlive ?? false;
    if (isPrimaryActive) {
        activeServers += 1;
    }

    try {
        const mhServers = await readServers();
        totalServers += mhServers.length;
        activeServers += runningServers.size;
    } catch (error) {
        // Fallback
    }

    return ctx.send({
        success: true,
        totalServers,
        activeServers,
    });
}
