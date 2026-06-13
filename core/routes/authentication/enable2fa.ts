const modulename = 'WebServer:AuthEnable2fa';
import { InitializedCtx } from '@modules/WebServer/ctxTypes';
import consoleFactory from '@lib/console';
import { verifyTOTP } from '@core/lib/totp';
import { z } from 'zod';
const console = consoleFactory(modulename);

const bodySchema = z.object({
    code: z.string().trim(),
});

/**
 * Enable 2FA
 */
export default async function AuthEnable2fa(ctx: InitializedCtx) {
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

        if (vaultAdmin.twoFactorEnabled) {
            return ctx.send({ error: 'Two-factor authentication is already enabled.' });
        }

        const pendingSecret = vaultAdmin.twoFactorPendingSecret;
        if (!pendingSecret) {
            return ctx.send({ error: 'No 2FA setup in progress. Please generate a QR code first.' });
        }

        const isVerified = verifyTOTP(pendingSecret, code);
        if (!isVerified) {
            return ctx.send({ error: 'Invalid verification code. Please try again.' });
        }

        await vibeCore.adminStore.enableAdmin2FA(vaultAdmin.name);

        ctx.admin.logAction('enabled 2FA');

        return ctx.send({
            success: true,
        });

    } catch (error) {
        console.warn(`Failed to enable 2FA for ${ctx.admin.name} with error: ${(error as Error).message}`);
        console.verbose.dir(error);
        return ctx.send({
            error: 'Error enabling two-factor authentication.',
        });
    }
}
