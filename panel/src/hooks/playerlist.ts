import { usePushPlayerDropEvent } from "@/pages/Dashboard/dashboardHooks";
import { PlayerlistEventType, PlayerlistPlayerType } from "@shared/socketioTypes";
import { atom, useSetAtom } from "jotai";
import { selectedServerIdAtom } from "@/hooks/status";


/**
 * Atoms
 */
export const playerlistsMapAtom = atom<Record<string, PlayerlistPlayerType[]>>({});
export const serverMutexesMapAtom = atom<Record<string, string | null>>({});

export const playerlistAtom = atom((get) => {
    const selectedServerId = get(selectedServerIdAtom);
    return get(playerlistsMapAtom)[selectedServerId] || [];
});

export const playerCountAtom = atom((get) => get(playerlistAtom).length);

export const serverMutexAtom = atom((get) => {
    const selectedServerId = get(selectedServerIdAtom);
    return get(serverMutexesMapAtom)[selectedServerId] || null;
});


/**
 * Hooks
 */
export const useProcessPlayerlistEvents = () => {
    const pushPlayerDropEvent = usePushPlayerDropEvent();
    const setPlayerlistsMap = useSetAtom(playerlistsMapAtom);
    const setServerMutexesMap = useSetAtom(serverMutexesMapAtom);

    return (events: PlayerlistEventType[]) => {
        //If there is a fullPlayerlist, skip everything before it
        const fullListIndex = events.findIndex(e => e.type === 'fullPlayerlist');
        if (fullListIndex > 0) events = events.slice(fullListIndex);

        //Process events
        for (const event of events) {
            const serverId = (event as any).serverId || 'primary';

            if (event.type === 'fullPlayerlist') {
                setPlayerlistsMap((oldMap) => ({
                    ...oldMap,
                    [serverId]: event.playerlist,
                }));
                setServerMutexesMap((oldMap) => ({
                    ...oldMap,
                    [serverId]: event.mutex,
                }));
            } else if (event.type === 'playerJoining') {
                setPlayerlistsMap((oldMap) => {
                    const list = oldMap[serverId] || [];
                    return {
                        ...oldMap,
                        [serverId]: [...list, event],
                    };
                });
            } else if (event.type === 'playerDropped') {
                setPlayerlistsMap((oldMap) => {
                    const list = oldMap[serverId] || [];
                    return {
                        ...oldMap,
                        [serverId]: list.filter(p => p.netid !== event.netid),
                    };
                });
                if (event.reasonCategory) pushPlayerDropEvent(event.reasonCategory);
            } else {
                console.error('Unknown playerlist event type', event);
            }
        }
    }
};

//Getter for the server mutex
// const getCurrentMutex = useAtomCallback(
//     useCallback((get) => {
//         return get(serverMutexAtom)
//     }, []),
// );
