const modulename = 'WebServer:MasterActions:Page';
import { AuthedCtx } from '@modules/WebServer/ctxTypes';
import consoleFactory from '@lib/console';
import got from '@lib/got';
import { vibeEnv } from '@core/globalData';
const console = consoleFactory(modulename);

/**
 * Handles the rendering or delivery of master action resources
 */
export default async function MasterActionsPage(ctx: AuthedCtx) {
    const isMasterAdmin = (ctx.admin.hasPermission('master'));
    
    let versions = {
        recommended: 'N/A',
        optional: 'N/A',
        latest: 'N/A',
    };
    
    try {
        const platform = vibeEnv.isWindows ? 'win32' : 'linux';
        const cacheBuster = Math.floor(Date.now() / 5_000_000);
        const reqUrl = `https://changelogs-live.fivem.net/api/changelog/versions/${platform}/server?${cacheBuster}`;
        const resp: any = await got(reqUrl).json();
        if (resp) {
            versions.recommended = resp.recommended?.toString() || 'N/A';
            versions.optional = resp.optional?.toString() || 'N/A';
            versions.latest = resp.latest?.toString() || 'N/A';
        }
    } catch (e) {
        // Fallback
    }

    return ctx.utils.render('main/masterActions', {
        headerTitle: 'Master Actions',
        isMasterAdmin,
        disableActions: (isMasterAdmin && ctx.txVars.isWebInterface) ? '' : 'disabled',
        versions,
    });
};
