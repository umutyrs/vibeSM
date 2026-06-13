const modulename = 'WebServer:AuthConfirm2faLogin';
import { AuthedAdmin, PassSessAuthType } from '@modules/WebServer/authLogic';
import { InitializedCtx } from '@modules/WebServer/ctxTypes';
import consoleFactory from '@lib/console';
import { ReactAuthDataType } from '@shared/authApiTypes';
import { z } from 'zod';
import { verifyTOTP } from '@core/lib/totp';
const console = consoleFactory(modulename);

const bodySchema = z.object({
    code: z.string().trim(),
});

/**
 * Confirm 2FA login
 */
export default async function AuthConfirm2faLogin(ctx: InitializedCtx) {
    // Check request body
    const schemaRes = bodySchema.safeParse(ctx.request.body);
    if (!schemaRes.success) {
        return ctx.send({
            error: `Invalid request body: ${schemaRes.error.message}`,
        });
    }
    const { code } = schemaRes.data;

    // Get current session
    const sess = ctx.sessTools.get();
    if (!sess || !sess.auth || sess.auth.type !== '2fa_pending') {
        return ctx.send({
            error: 'No login attempt in progress. Please start over.',
        });
    }

    const { username, password_hash, csrfToken } = sess.auth;

    try {
        const vaultAdmin = vibeCore.adminStore.getAdminByName(username);
        if (!vaultAdmin) {
            return ctx.send({
                error: 'Admin not found.',
            });
        }

        // Verify code
        let isVerified = false;
        if (vaultAdmin.twoFactorEnabled) {
            isVerified = verifyTOTP(vaultAdmin.twoFactorSecret, code);
        } else if (vaultAdmin.twoFactorPendingSecret) {
            // Forced setup flow: verify code against pending secret
            isVerified = verifyTOTP(vaultAdmin.twoFactorPendingSecret, code);
            if (isVerified) {
                // Activate 2FA on the account
                await vibeCore.adminStore.enableAdmin2FA(vaultAdmin.name);
            }
        } else {
            return ctx.send({
                error: 'Two-factor authentication is not configured for this account.',
            });
        }

        if (!isVerified) {
            return ctx.send({
                error: 'Invalid 2FA code. Please try again.',
            });
        }

        // Upgrade session to full 'password' session
        const sessData = {
            type: 'password',
            username: vaultAdmin.name,
            password_hash: password_hash,
            expiresAt: false,
            csrfToken: csrfToken,
        } satisfies PassSessAuthType;
        ctx.sessTools.set({ auth: sessData });

        vibeCore.logger.admin.write(vaultAdmin.name, `logged in from ${ctx.ip} via password (2FA verified)`);
        vibeCore.metrics.txRuntime.loginOrigins.count(ctx.txVars.hostType);
        vibeCore.metrics.txRuntime.loginMethods.count('password');

        // Refresh admin details
        const updatedAdmin = vibeCore.adminStore.getAdminByName(username);
        const authedAdmin = new AuthedAdmin(updatedAdmin, sessData.csrfToken);
        return ctx.send<ReactAuthDataType>(authedAdmin.getAuthData());

    } catch (error) {
        console.warn(`Failed to verify 2FA code for ${username} with error: ${(error as Error).message}`);
        console.verbose.dir(error);
        return ctx.send({
            error: 'Error authenticating 2FA code.',
        });
    }
}
