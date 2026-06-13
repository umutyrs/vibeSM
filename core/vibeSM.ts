import consoleFactory from '@lib/console';
import { getCoreProxy } from './boot/globalPlaceholder';

import TxManager from './vibeManager';
import ConfigStore from '@modules/ConfigStore';
import AdminStore from '@modules/AdminStore';
import DiscordBot from '@modules/DiscordBot';
import FxRunner from '@modules/FxRunner';
import Logger from '@modules/Logger';
import FxMonitor from '@modules/FxMonitor';
import FxScheduler from '@modules/FxScheduler';
import Metrics from '@modules/Metrics';
import Translator from '@modules/Translator';
import WebServer from '@modules/WebServer';
import FxResources from '@modules/FxResources';
import FxPlayerlist from '@modules/FxPlayerlist';
import Database from '@modules/Database';
import CacheStore from '@modules/CacheStore';
import UpdateChecker from '@modules/UpdateChecker';
const console = consoleFactory();


export type VibeCoreType = {
    //Storage
    adminStore: AdminStore;
    cacheStore: CacheStore;
    configStore: ConfigStore;
    database: Database;
    logger: Logger;
    metrics: Metrics;

    //FXServer
    fxMonitor: FxMonitor;
    fxPlayerlist: FxPlayerlist;
    fxResources: FxResources;
    fxRunner: FxRunner;
    fxScheduler: FxScheduler;

    //Other
    discordBot: DiscordBot;
    translator: Translator;
    updateChecker: UpdateChecker;
    webServer: WebServer;
}

export default function bootVibeSM() {
    /**
     * MARK: Setting up Globals
     */
    //Initialize the global vibeCore object
    const _vibeCore = {} as VibeCoreType;
    let primaryConfigStore = new ConfigStore();
    Object.defineProperty(_vibeCore, 'configStore', {
        get() {
            const store = vibeConfigStoreContext.getStore();
            if (store && store.configStore) {
                return store.configStore;
            }
            return primaryConfigStore;
        },
        set(val) {
            primaryConfigStore = val;
        },
        configurable: true
    });


    //Setting up the global vibeCore object as a Proxy
    (globalThis as any).vibeCore = getCoreProxy(_vibeCore);

    //Setting up & Validating vibeConfig
    if (!vibeConfig || typeof vibeConfig !== 'object' || vibeConfig === null) {
        throw new Error('vibeConfig is not defined');
    }


    //Initialize the vibeManager
    (globalThis as any).vibeManager = new TxManager();


    /**
     * MARK: Booting Modules
     */
    //Helper function to start the modules & register callbacks
    const startModule = <T>(Class: GenericTxModule<T>): T => {
        const instance = new Class();
        if(Array.isArray(Class.configKeysWatched) && Class.configKeysWatched.length > 0){
            if(!('handleConfigUpdate' in instance) || typeof instance?.handleConfigUpdate !== 'function'){
                throw new Error(`Module '${Class.name}' has configKeysWatched[] but no handleConfigUpdate()`);
            }
            _vibeCore.configStore.registerUpdateCallback(
                Class.name,
                Class.configKeysWatched,
                instance.handleConfigUpdate.bind(instance),
            );
        }
        if(instance?.handleShutdown) {
            vibeManager.addShutdownHandler(instance.handleShutdown.bind(instance));
        }
        
        return instance as T;
    };

    //High Priority (required for banner) 
    _vibeCore.adminStore = startModule(AdminStore);
    _vibeCore.webServer = startModule(WebServer);
    _vibeCore.database = startModule(Database);

    //Required for signalStartReady()
    _vibeCore.fxMonitor = startModule(FxMonitor);
    _vibeCore.discordBot = startModule(DiscordBot);
    _vibeCore.logger = startModule(Logger);
    _vibeCore.fxRunner = startModule(FxRunner);

    //Low Priority
    _vibeCore.translator = startModule(Translator);
    _vibeCore.fxScheduler = startModule(FxScheduler);
    _vibeCore.metrics = startModule(Metrics);
    _vibeCore.fxResources = startModule(FxResources);
    _vibeCore.fxPlayerlist = startModule(FxPlayerlist);
    _vibeCore.cacheStore = startModule(CacheStore);

    //Very Low Priority
    _vibeCore.updateChecker = startModule(UpdateChecker);


    /**
     * MARK: Finalizing Boot
     */
    delete (globalThis as any).vibeCore;
    (globalThis as any).vibeCore = _vibeCore;
}

import { AsyncLocalStorage } from 'node:async_hooks';
export const vibeConfigStoreContext = new AsyncLocalStorage<any>();

let originalVibeConfig = (globalThis as any).vibeConfig;
Object.defineProperty(globalThis, 'vibeConfig', {
    get() {
        const store = vibeConfigStoreContext.getStore();
        if (store && store.vibeConfig) {
            return store.vibeConfig;
        }
        return originalVibeConfig;
    },
    set(val) {
        const store = vibeConfigStoreContext.getStore();
        if (store) {
            store.vibeConfig = val;
        } else {
            originalVibeConfig = val;
        }
    },
    configurable: true
});

let originalIsIdle = Object.getOwnPropertyDescriptor(FxRunner.prototype, 'isIdle')?.get;
Object.defineProperty(FxRunner.prototype, 'isIdle', {
    get() {
        const store = vibeConfigStoreContext.getStore();
        if (store && typeof store.isIdle === 'boolean') {
            return store.isIdle;
        }
        return originalIsIdle ? originalIsIdle.call(this) : true;
    },
    configurable: true
});

let originalChild = Object.getOwnPropertyDescriptor(FxRunner.prototype, 'child')?.get;
Object.defineProperty(FxRunner.prototype, 'child', {
    get() {
        const store = vibeConfigStoreContext.getStore();
        if (store && store.hasOwnProperty('child')) {
            return store.child;
        }
        return originalChild ? originalChild.call(this) : null;
    },
    configurable: true
});

let originalSendRawCommand = FxRunner.prototype.sendRawCommand;
FxRunner.prototype.sendRawCommand = function(command: string, author: any) {
    const store = vibeConfigStoreContext.getStore();
    if (store && store.serverId && store.serverId !== 'primary') {
        const { runningProcesses, loggerInstances } = require('./routes/multiHosting');
        const proc = runningProcesses.get(store.serverId);
        if (proc && proc.stdin && proc.stdin.writable) {
            const success = proc.stdin.write(command + '\n');
            const logger = loggerInstances.get(store.serverId);
            if (logger) {
                const { SYM_SYSTEM_AUTHOR } = require('@lib/symbols');
                if (author === SYM_SYSTEM_AUTHOR) {
                    logger.logSystemCommand(command);
                } else if (typeof author === 'string') {
                    logger.logAdminCommand(author, command);
                }
            }
            return success;
        }
        return false;
    }
    return originalSendRawCommand.call(this, command, author);
};
