const modulename = 'WebServer:AuthVerifyPassword';
import { AuthedAdmin, PassSessAuthType } from '@modules/WebServer/authLogic';
import { InitializedCtx } from '@modules/WebServer/ctxTypes';
import { vibeEnv } from '@core/globalData';
import consoleFactory from '@lib/console';
import { ApiVerifyPasswordResp, ReactAuthDataType } from '@shared/authApiTypes';
import { z } from 'zod';
const console = consoleFactory(modulename);

//Helper functions
const bodySchema = z.object({
    username: z.string().trim(),
    password: z.string().trim(),
});
export type ApiVerifyPasswordReqSchema = z.infer<typeof bodySchema>;

/**
 * Verify login
 */
export default async function AuthVerifyPassword(ctx: InitializedCtx) {
    //Check UI version
    const { uiVersion } = ctx.request.query;
    if(uiVersion && uiVersion !== vibeEnv.vibeVersion){
        return ctx.send<ApiVerifyPasswordResp>({
            error: `refreshToUpdate`,
        });
    }

    //Checking body
    const schemaRes = bodySchema.safeParse(ctx.request.body);
    if (!schemaRes.success) {
        return ctx.send<ApiVerifyPasswordResp>({
            error: `Invalid request body: ${schemaRes.error.message}`,
        });
    }
    const postBody = schemaRes.data;

    //Check if there are already admins set up
    if (!vibeCore.adminStore.hasAdmins()) {
        return ctx.send<ApiVerifyPasswordResp>({
            error: `no_admins_setup`,
        });
    }

    try {
        //Checking admin
        const vaultAdmin = vibeCore.adminStore.getAdminByName(postBody.username);
        if (!vaultAdmin) {
            console.warn(`Wrong username from: ${ctx.ip}`);
            return ctx.send<ApiVerifyPasswordResp>({
                error: 'Wrong username or password!',
            });
        }
        if (!VerifyPasswordHash(postBody.password, vaultAdmin.password_hash)) {
            console.warn(`Wrong password from: ${ctx.ip}`);
            return ctx.send<ApiVerifyPasswordResp>({
                error: 'Wrong username or password!',
            });
        }

        const is2faEnabled = !!vaultAdmin.twoFactorEnabled;
        const is2faRequiredByConfig = !!vibeConfig.general.twoFactorRequired;
        const isNewLocation = ctx.ip !== vaultAdmin.lastLoginIp;

        if (is2faRequiredByConfig || (is2faEnabled && isNewLocation)) {
            const sessData = {
                type: '2fa_pending' as const,
                username: vaultAdmin.name,
                password_hash: vaultAdmin.password_hash,
                expiresAt: Date.now() + 5 * 60 * 1000,
                csrfToken: vibeCore.adminStore.genCsrfToken(),
            };
            ctx.sessTools.set({ auth: sessData });

            if (is2faEnabled) {
                return ctx.send<any>({
                    error: '2fa_required',
                });
            } else {
                const { generateBase32Secret } = await import('@core/lib/totp');
                const QRCode = await import('qrcode');
                
                let secret = vaultAdmin.twoFactorPendingSecret;
                if (!secret) {
                    secret = generateBase32Secret();
                    await vibeCore.adminStore.setAdmin2FAPendingSecret(vaultAdmin.name, secret);
                }

                const otpauthUrl = `otpauth://totp/vibeSM:${vaultAdmin.name}?secret=${secret}&issuer=vibeSM`;
                const qrCode = await QRCode.toDataURL(otpauthUrl);

                return ctx.send<any>({
                    error: '2fa_setup_required',
                    secret,
                    qrCode,
                });
            }
        }

        // Bypassed 2FA or not required. Save the last login IP.
        await vibeCore.adminStore.saveAdminLastLoginIp(vaultAdmin.name, ctx.ip);

        //Setting up session
        const sessData = {
            type: 'password',
            username: vaultAdmin.name,
            password_hash: vaultAdmin.password_hash,
            expiresAt: false,
            csrfToken: vibeCore.adminStore.genCsrfToken(),
        } satisfies PassSessAuthType;
        ctx.sessTools.set({ auth: sessData });

        vibeCore.logger.admin.write(vaultAdmin.name, `logged in from ${ctx.ip} via password`);
        vibeCore.metrics.txRuntime.loginOrigins.count(ctx.txVars.hostType);
        vibeCore.metrics.txRuntime.loginMethods.count('password');

        const authedAdmin = new AuthedAdmin(vaultAdmin, sessData.csrfToken)
        return ctx.send<ReactAuthDataType>(authedAdmin.getAuthData());

    } catch (error) {
        console.warn(`Failed to authenticate ${postBody.username} with error: ${(error as Error).message}`);
        console.verbose.dir(error);
        return ctx.send<ApiVerifyPasswordResp>({
            error: 'Error autenticating admin.',
        });
    }
};
