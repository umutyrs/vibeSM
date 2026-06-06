const modulename = 'WebServer:GetSettingsConfigs';
import localeMap from '@shared/localeMap';
import consoleFactory from '@lib/console';
import { AuthedCtx } from '@modules/WebServer/ctxTypes';
import { GenericApiErrorResp } from '@shared/genericApiTypes';
import ConfigStore from '@modules/ConfigStore';
import { PartialTxConfigs, TxConfigs } from '@modules/ConfigStore/schema';
import { ConfigChangelogEntry } from '@modules/ConfigStore/changelog';
import { redactApiKeys, redactStartupSecrets } from '@lib/misc';
import { vibeHostConfig } from '@core/globalData';
const console = consoleFactory(modulename);


export type GetConfigsResp = {
    locales: { code: string, label: string }[],
    dataPath: string,
    hasCustomDataPath: boolean,
    changelog: ConfigChangelogEntry[],
    storedConfigs: PartialTxConfigs,
    defaultConfigs: TxConfigs,
    forceQuietMode: boolean,
}


/**
 * Returns the output page containing the live console
 */
export default async function GetSettingsConfigs(ctx: AuthedCtx) {
    const sendTypedResp = (data: GetConfigsResp | GenericApiErrorResp) => ctx.send(data);

    //Check permissions
    if (!ctx.admin.testPermission('settings.view', modulename)) {
        return sendTypedResp({
            error: 'You do not have permission to view the settings.'
        });
    }

    //Prepare data
    const locales = Object.keys(localeMap).map(code => ({
        code,
        label: localeMap[code].$meta.label,
    }));
    locales.sort((a, b) => a.label.localeCompare(b.label));

    const outData: GetConfigsResp = {
        locales,
        dataPath: vibeHostConfig.dataPath,
        hasCustomDataPath: vibeHostConfig.hasCustomDataPath,
        changelog: vibeCore.configStore.getChangelog(),
        storedConfigs: vibeCore.configStore.getStoredConfig(),
        defaultConfigs: ConfigStore.SchemaDefaults,
        forceQuietMode: vibeHostConfig.forceQuietMode,
    };

    //Redact sensitive data if the user doesn't have the write permission
    if (!ctx.admin.hasPermission('settings.write')) {
        const toRedact = outData.storedConfigs as any; //dont want to type this
        if(outData.storedConfigs.server?.startupArgs) {
            toRedact.server.startupArgs = redactStartupSecrets(outData.storedConfigs.server.startupArgs);
        }
        if(outData.storedConfigs.discordBot?.token) {
            toRedact.discordBot.token = '[redacted by vibeSM]';
        }
    }

    return sendTypedResp(outData);
};
