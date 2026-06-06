import type { RoomType } from "../webSocket";
import { FullPlayerlistEventType } from "@shared/socketioTypes";

/**
 * The the playerlist room is joined on all (except solo) pages when in web mode
 */
export default {
    permission: true, //everyone can see it
    eventName: 'playerlist',
    cumulativeBuffer: true,
    outBuffer: [],
    initialData: () => {
        const data: any[] = [];
        
        // Primary server playerlist
        const primaryMutex = vibeCore.fxRunner.child?.mutex ?? 'primary';
        data.push({
            mutex: primaryMutex,
            serverId: 'primary',
            type: 'fullPlayerlist',
            playerlist: vibeCore.fxPlayerlist.getPlayerList(primaryMutex),
        });

        // Multi-hosted servers playerlists
        const runningMutexes = (globalThis as any).multiHostingMutexes;
        if (runningMutexes instanceof Map) {
            for (const [mutex, serverId] of runningMutexes.entries()) {
                data.push({
                    mutex,
                    serverId,
                    type: 'fullPlayerlist',
                    playerlist: vibeCore.fxPlayerlist.getPlayerList(mutex),
                });
            }
        }

        return data;
    },
} satisfies RoomType;
