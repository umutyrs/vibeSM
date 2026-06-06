import { TxConfigState } from "@shared/enums";
import { GlobalStatusType } from "@shared/socketioTypes";
import { atom, useAtomValue, useSetAtom } from "jotai";


/**
 * Atoms
 */
export const globalStatusAtom = atom<GlobalStatusType | null>(null);
export const serverNameAtom = atom((get) => get(globalStatusAtom)?.server.name ?? 'unconfigured');
export const vibeConfigStateAtom = atom((get) => get(globalStatusAtom)?.configState ?? TxConfigState.Unkown);
export const fxRunnerStateAtom = atom((get) => get(globalStatusAtom)?.runner ?? {
    isIdle: true,
    isChildAlive: false,
});
export const maxClientsAtom = atom((get) => get(globalStatusAtom)?.server.maxClients ?? 128);


/**
 * Hooks
 */
export const useSetGlobalStatus = () => {
    return useSetAtom(globalStatusAtom);
};

export const useGlobalStatus = () => {
    return useAtomValue(globalStatusAtom);
}

const baseMultiHostingAtom = atom(localStorage.getItem("vibeSM:enableMultiHosting") !== "false");
export const multiHostingEnabledAtom = atom(
    (get) => get(baseMultiHostingAtom),
    (get, set, newValue) => {
        set(baseMultiHostingAtom, newValue);
        localStorage.setItem("vibeSM:enableMultiHosting", String(newValue));
    }
);

const baseSelectedServerAtom = atom(localStorage.getItem("vibeSM:selectedServerId") || "primary");
export const selectedServerIdAtom = atom(
    (get) => get(baseSelectedServerAtom),
    (get, set, newValue) => {
        set(baseSelectedServerAtom, newValue);
        localStorage.setItem("vibeSM:selectedServerId", String(newValue));
    }
);


