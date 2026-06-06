const modulename = 'WebServer:SettingsLocale';
import consoleFactory from '@lib/console';
import fsp from 'node:fs/promises';
import type { AuthedCtx } from '@modules/WebServer/ctxTypes';
import type { ApiToastResp } from '@shared/genericApiTypes';
import { localeFileSchema } from '@modules/Translator';
import { fromError } from 'zod-validation-error';
const console = consoleFactory(modulename);

export type GetLocaleResp = {
    phrases: any;
};

export type SaveLocaleResp = ApiToastResp;

/**
 * Gets the custom locale JSON content
 */
export async function settings_getLocale(ctx: AuthedCtx) {
    const sendTypedResp = (data: GetLocaleResp | { error: string }) => ctx.send(data);

    try {
        let phrases;
        try {
            const raw = await fsp.readFile(vibeCore.translator.customLocalePath, 'utf8');
            phrases = JSON.parse(raw);
        } catch (err) {
            // If file doesn't exist, read English template
            phrases = vibeCore.translator.getLanguagePhrases('en');
        }

        return sendTypedResp({ phrases });
    } catch (error) {
        console.error('Error fetching custom locale', error);
        return sendTypedResp({ error: (error as Error).message });
    }
}

/**
 * Saves the custom locale JSON content
 */
export async function settings_saveLocale(ctx: AuthedCtx) {
    const sendTypedResp = (data: SaveLocaleResp) => ctx.send(data);

    //Check permissions
    if (!ctx.admin.testPermission('settings.write', modulename)) {
        return sendTypedResp({
            type: 'error',
            msg: "You don't have permission to execute this action.",
        });
    }

    try {
        const body = ctx.request.body;
        if (!body || typeof body !== 'object') {
            return sendTypedResp({
                type: 'error',
                msg: 'Invalid request body.',
            });
        }

        // Validate structure against locale schema
        const schemaRes = localeFileSchema.safeParse(body);
        if (!schemaRes.success) {
            return sendTypedResp({
                type: 'error',
                md: true,
                title: 'Invalid Locale Structure',
                msg: fromError(schemaRes.error, { prefix: null }).message,
            });
        }

        // Format and save JSON
        const formatted = JSON.stringify(schemaRes.data, null, 4);
        await fsp.writeFile(vibeCore.translator.customLocalePath, formatted, 'utf8');

        // Reload translator in server memory
        vibeCore.translator.setupTranslator(false);

        ctx.admin.logAction('Saved custom settings locale.');
        return sendTypedResp({
            type: 'success',
            msg: 'Custom translations saved and applied successfully!',
        });
    } catch (error) {
        console.error('Error saving custom locale', error);
        return sendTypedResp({
            type: 'error',
            md: true,
            title: 'Error Saving Custom Translations',
            msg: (error as Error).message,
        });
    }
}
