const modulename = 'WebServer:SetupGet';
import path from 'node:path';
import { vibeEnv, vibeHostConfig } from '@core/globalData';
import { RECIPE_DEPLOYER_VERSION } from '@core/deployer/index';
import consoleFactory from '@lib/console';
import { TxConfigState } from '@shared/enums';
import { AuthedCtx } from '@modules/WebServer/ctxTypes';
import { vibeConfigStoreContext } from '@core/vibeSM';
const console = consoleFactory(modulename);


/**
 * Returns the output page containing the live console
 */
export default async function SetupGet(ctx: AuthedCtx) {
    //Check permissions
    if (!ctx.admin.hasPermission('master')) {
        return ctx.utils.render('main/message', {message: 'You need to be the admin master to use the setup page.'});
    }

    const store = vibeConfigStoreContext.getStore();
    const isMultiHostSetup = (store && store.serverId && store.serverId !== 'primary') || (ctx.query.serverId && ctx.query.serverId !== 'primary');

    // Ensure correct state for the setup page
    if (!isMultiHostSetup) {
        if(vibeManager.configState === TxConfigState.Deployer) {
            return ctx.utils.legacyNavigateToPage('/server/deployer');
        } else if(vibeManager.configState !== TxConfigState.Setup) {
            return ctx.utils.legacyNavigateToPage('/');
        }
    }

    //Output
    const activeConfigStore = (store && store.configStore) ? store.configStore : vibeCore.configStore;
    const storedConfig = activeConfigStore.getStoredConfig();
    let dataPath = vibeHostConfig.dataPath.replace(/\\/g, '/');
    if (store && store.serverId && store.serverId !== 'primary') {
        try {
            const { readServers } = require('../multiHosting');
            const servers = await readServers();
            const srv = servers.find((s: any) => s.id === store.serverId);
            if (srv && srv.dataPath) {
                dataPath = srv.dataPath.replace(/\\/g, '/');
            }
        } catch (e) {
            console.error(`Failed to get dataPath for multi-hosted server setup: ${(e as any).message}`);
        }
    }

    const renderData = {
        headerTitle: 'Setup',
        skipServerName: !!(storedConfig.general?.serverName),
        deployerEngineVersion: RECIPE_DEPLOYER_VERSION,
        forceGameName: vibeHostConfig.forceGameName ?? '', //ejs injection works better with strings
        dataPath,
        hasCustomDataPath: vibeHostConfig.hasCustomDataPath,
        isMultiHostSetup,
    };
    return ctx.utils.render('standalone/setup', renderData);
};
