const modulename = 'WebServer:AuthDisable2fa';
import { InitializedCtx } from '@modules/WebServer/ctxTypes';
import consoleFactory from '@lib/console';
import { verifyTOTP } from '@core/lib/totp';
import { z } from 'zod';
const console = consoleFactory(modulename);

const bodySchema = z.object({
    code: z.string().trim(),
});

/**
 * Disable 2FA
 */
export default async function AuthDisable2fa(ctx: InitializedCtx) {
    if (!ctx.admin) {
        return ctx.send({ error: 'Unauthorized' });
    }

    const schemaRes = bodySchema.safeParse(ctx.request.body);
    if (!schemaRes.success) {
        return ctx.send({
            error: `Invalid request body: ${schemaRes.error.message}`,
        });
    }
    const { code } = schemaRes.data;

    try {
        const vaultAdmin = vibeCore.adminStore.getAdminByName(ctx.admin.name);
        if (!vaultAdmin) {
            return ctx.send({ error: 'Admin not found.' });
        }

        if (!vaultAdmin.twoFactorEnabled) {
            return ctx.send({ error: 'Two-factor authentication is already disabled.' });
        }

        // Prevent disabling if forced globally
        if (vibeConfig.general.twoFactorRequired) {
            return ctx.send({ error: 'Two-factor authentication is required by global settings and cannot be disabled.' });
        }

        const isVerified = verifyTOTP(vaultAdmin.twoFactorSecret, code);
        if (!isVerified) {
            return ctx.send({ error: 'Invalid verification code. Please try again.' });
        }

        await vibeCore.adminStore.disableAdmin2FA(vaultAdmin.name);

        ctx.admin.logAction('disabled 2FA');

        return ctx.send({
            success: true,
        });

    } catch (error) {
        console.warn(`Failed to disable 2FA for ${ctx.admin.name} with error: ${(error as Error).message}`);
        console.verbose.dir(error);
        return ctx.send({
            error: 'Error disabling two-factor authentication.',
        });
    }
}
