import { getHostData } from "@lib/diagnostics";
import { isProxy } from "util/types";
import { startReadyWatcher } from "./boot/startReadyWatcher";
import { Deployer } from "./deployer";
import { TxConfigState, FxMonitorHealth } from "@shared/enums";
import type { GlobalStatusType } from "@shared/socketioTypes";
import quitProcess from "@lib/quitProcess";
import consoleFactory, { processStdioEnsureEol, setTTYTitle } from "@lib/console";
import { isNumber, isString } from "@modules/CacheStore";
const console = consoleFactory('Manager');

//Types
type gameNames = 'fivem' | 'redm';
type HostStatusType = {
    //vibeSM state
    cfgPath: string | null;
    dataPath: string | null;
    isConfigured: boolean;
    playerCount: number;
    status: FxMonitorHealth;

    //Detected at runtime
    cfxId: string | null;
    gameName: gameNames | null;
    joinLink: string | null;
    joinDeepLink: string | null;
    playerSlots: number | null;
    projectName: string | null;
    projectDesc: string | null;
}


/**
 * This class is for "high order" logic and methods that shouldn't live inside any specific component.
 */
export default class TxManager {
    public deployer: Deployer | null = null; //FIXME: implementar o deployer
    private readonly moduleShutdownHandlers: (() => void)[] = [];
    public isShuttingDown = false;

    //TODO: move txRuntime here?!

    constructor() {
        //Listen for shutdown signals
        process.on('SIGHUP', this.gracefulShutdown.bind(this));     //terminal closed
        process.on('SIGINT', this.gracefulShutdown.bind(this));     //ctrl+c (mostly users)
        process.on('SIGTERM', this.gracefulShutdown.bind(this));    //kill (docker, etc)

        //Sync start, boot fxserver when conditions are met
        startReadyWatcher(() => {
            vibeCore.fxRunner.signalStartReady();
        });

        //FIXME: mover o cron do FxMonitor (getHostStats() + websocket push) para cá
        //FIXME: if ever changing this, need to make sure the other data
        //in the status event will be pushed, since right some of now it
        //relies on this event every 5 seconds
        //NOTE: probably vibeManager should be the one to decide if stuff like the host
        //stats changed enough to merit a refresh push
        setInterval(async () => {
            vibeCore.webServer.webSocket.pushRefresh('status');
            try {
                const { runningServers } = require('./routes/multiHosting');
                if (runningServers) {
                    for (const serverId of runningServers) {
                        vibeCore.webServer.webSocket.pushRefresh(`status#${serverId}`).catch(() => {});
                    }
                }
            } catch (e) {}
        }, 5000);

        //Updates the terminal title every 15 seconds
        setInterval(() => {
            setTTYTitle(`(${vibeCore.fxPlayerlist.onlineCount}) ${vibeConfig.general.serverName} - vibeSM`);
        }, 15000);

        //Pre-calculate static data
        setTimeout(() => {
            getHostData().catch((e) => { });
        }, 10_000);
    }


    /**
     * Gracefully shuts down the application by running all exit handlers.  
     * If the process takes more than 5 seconds to exit, it will force exit.
     */
    public async gracefulShutdown(signal: NodeJS.Signals) {
        //Prevent race conditions
        if (this.isShuttingDown) {
            processStdioEnsureEol();
            console.warn(`Got ${signal} while already shutting down.`);
            return;
        }
        console.warn(`Got ${signal}, shutting down...`);
        this.isShuttingDown = true;

        //Stop all module timers
        for (const moduleName of Object.keys(vibeCore)) {
            const module = vibeCore[moduleName as keyof typeof vibeCore] as GenericTxModuleInstance;
            if (Array.isArray(module.timers)) {
                for (const interval of module.timers) {
                    clearInterval(interval);
                }
            }
        }

        //Sets a hard limit to the shutdown process
        setTimeout(() => {
            console.error(`Graceful shutdown timed out after 5s, forcing exit...`);
            quitProcess(1);
        }, 5000);

        //Run all exit handlers
        await Promise.allSettled(this.moduleShutdownHandlers.map((handler) => handler()));
        console.verbose.debug(`All exit handlers finished, shutting down...`);
        quitProcess(0);
    }


    /**
     * Adds a handler to be run when vibeSM gets a SIG* event
     */
    public addShutdownHandler(handler: () => void) {
        this.moduleShutdownHandlers.push(handler);
    }


    /**
     * Starts the deployer (TODO: rewrite deployer)
     */
    startDeployer(
        recipeText: string | false,
        deploymentID: string,
        targetPath: string,
        isTrustedSource: boolean,
        customMetaData: Record<string, string> = {},
    ) {
        if (this.deployer) {
            throw new Error('Deployer is already running');
        }
        this.deployer = new Deployer(recipeText, deploymentID, targetPath, isTrustedSource, customMetaData);
    }


    // isDeployerRunning(): this is { deployer: Deployer } {
    //     return this.deployer !== null;
    // }


    /**
     * Unknown, Deployer, Setup, Ready
     */
    get configState() {
        if (isProxy(vibeCore)) {
            return TxConfigState.Unkown;
        } else if (this.deployer) {
            return TxConfigState.Deployer;
        } else if (!vibeCore.fxRunner.isConfigured) {
            return TxConfigState.Setup;
        } else {
            return TxConfigState.Ready;
        }
    }


    /**
     * Returns the status object that is sent to the host status endpoint
     */
    get hostStatus(): HostStatusType {
        const serverPaths = vibeCore.fxRunner.serverPaths;
        const cfxId = vibeCore.cacheStore.getTyped('fxsRuntime:cfxId', isString) ?? null;
        const isGameName = (val: any): val is gameNames => val === 'fivem' || val === 'redm';
        return {
            //vibeSM state
            isConfigured: this.configState === TxConfigState.Ready,
            dataPath: serverPaths?.dataPath ?? null,
            cfgPath: serverPaths?.cfgPath ?? null,
            playerCount: vibeCore.fxPlayerlist.onlineCount,
            status: vibeCore.fxMonitor.status.health,

            //Detected at runtime
            cfxId,
            gameName: vibeCore.cacheStore.getTyped('fxsRuntime:gameName', isGameName) ?? null,
            joinDeepLink: cfxId ? `fivem://connect/cfx.re/join/${cfxId}` : null,
            joinLink: cfxId ? `https://cfx.re/join/${cfxId}` : null,
            playerSlots: vibeCore.cacheStore.getTyped('fxsRuntime:maxClients', isNumber) ?? null,
            projectName: vibeCore.cacheStore.getTyped('fxsRuntime:projectName', isString) ?? null,
            projectDesc: vibeCore.cacheStore.getTyped('fxsRuntime:projectDesc', isString) ?? null,
        }
    }


    /**
     * Returns the global status object that is sent to the clients
     */
    get globalStatus(): GlobalStatusType {
        const store = (require('./vibeSM') as any).vibeConfigStoreContext?.getStore();
        const activeServerId = store?.serverId;

        if (activeServerId && activeServerId !== 'primary') {
            const { runningServers, onlineServers } = require('./routes/multiHosting');
            const isRunning = runningServers.has(activeServerId);
            const isOnline = onlineServers.has(activeServerId);
            
            // Get secondary server name or general config server name
            const serverName = store.vibeConfig?.general?.serverName || activeServerId;

            // Calculate uptime if running
            let uptime = -1;
            if (isRunning) {
                const startTs = (globalThis as any).multiHostingStartTimes?.get(activeServerId);
                if (startTs) {
                    uptime = Date.now() - startTs;
                } else {
                    uptime = 0;
                }
            }

            let health = FxMonitorHealth.OFFLINE;
            let healthReason = 'Offline';
            if (isRunning) {
                health = isOnline ? FxMonitorHealth.ONLINE : FxMonitorHealth.STARTING;
                healthReason = isOnline ? 'Running' : 'Starting';
            }

            return {
                configState: TxConfigState.Ready,
                discord: 'disabled',
                runner: {
                    isIdle: !isRunning,
                    isChildAlive: isRunning,
                },
                server: {
                    name: serverName,
                    uptime: uptime,
                    health: health as any,
                    healthReason: healthReason,
                    whitelist: 'disabled',
                    maxClients: 32,
                },
                scheduler: {
                    scheduledRestartConfigured: false,
                    nextRelative: 'never',
                    nextAbsolute: 'never',
                },
            };
        }

        const fxMonitorStatus = vibeCore.fxMonitor.status;
        return {
            configState: vibeManager.configState,
            discord: vibeCore.discordBot.status,
            runner: {
                isIdle: vibeCore.fxRunner.isIdle,
                isChildAlive: vibeCore.fxRunner.child?.isAlive ?? false,
            },
            server: {
                name: vibeConfig.general.serverName,
                uptime: fxMonitorStatus.uptime,
                health: fxMonitorStatus.health,
                healthReason: fxMonitorStatus.healthReason,
                whitelist: vibeConfig.whitelist.mode,
                maxClients: vibeCore.cacheStore.getTyped('fxsRuntime:maxClients', isNumber) ?? null,
            },
            scheduler: vibeCore.fxScheduler.getStatus(), //no push events, updated every Scheduler.checkSchedule()
        }
    }
}

export type TxManagerType = InstanceType<typeof TxManager>;
