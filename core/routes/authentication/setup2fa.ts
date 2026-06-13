const modulename = 'WebServer:AuthSetup2fa';
import { InitializedCtx } from '@modules/WebServer/ctxTypes';
import consoleFactory from '@lib/console';
import { generateBase32Secret } from '@core/lib/totp';
import QRCode from 'qrcode';
const console = consoleFactory(modulename);

/**
 * Setup 2FA
 */
export default async function AuthSetup2fa(ctx: InitializedCtx) {
    if (!ctx.admin) {
        return ctx.send({ error: 'Unauthorized' });
    }

    try {
        const vaultAdmin = vibeCore.adminStore.getAdminByName(ctx.admin.name);
        if (!vaultAdmin) {
            return ctx.send({ error: 'Admin not found.' });
        }

        if (vaultAdmin.twoFactorEnabled) {
            return ctx.send({ error: 'Two-factor authentication is already enabled.' });
        }

        // Generate and set pending secret
        const secret = generateBase32Secret();
        await vibeCore.adminStore.setAdmin2FAPendingSecret(vaultAdmin.name, secret);

        // Generate QR code
        const otpauthUrl = `otpauth://totp/vibeSM:${vaultAdmin.name}?secret=${secret}&issuer=vibeSM`;
        const qrCode = await QRCode.toDataURL(otpauthUrl);

        return ctx.send({
            secret,
            qrCode,
        });

    } catch (error) {
        console.warn(`Failed to setup 2FA for ${ctx.admin.name} with error: ${(error as Error).message}`);
        console.verbose.dir(error);
        return ctx.send({
            error: 'Error generating 2FA QR code.',
        });
    }
}
