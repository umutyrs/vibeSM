import { createHmac, randomBytes } from 'node:crypto';

/**
 * Decodes a base32 string into a Buffer.
 */
export function base32Decode(base32Str: string): Buffer {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    const cleaned = base32Str.toUpperCase().replace(/[\s=]+/g, '');
    let bits = '';
    for (let i = 0; i < cleaned.length; i++) {
        const val = alphabet.indexOf(cleaned[i]);
        if (val === -1) throw new Error('Invalid base32 character');
        bits += val.toString(2).padStart(5, '0');
    }
    const bytes: number[] = [];
    for (let i = 0; i + 8 <= bits.length; i += 8) {
        bytes.push(parseInt(bits.slice(i, i + 8), 2));
    }
    return Buffer.from(bytes);
}

/**
 * Generates a random base32 secret (16 chars).
 */
export function generateBase32Secret(length = 16): string {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    const bytes = randomBytes(length);
    let secret = '';
    for (let i = 0; i < bytes.length; i++) {
        secret += alphabet[bytes[i] % 32];
    }
    return secret;
}

/**
 * Generates a HOTP pin for a given secret and counter value.
 */
export function generateHOTP(secret: string, counter: number): string {
    const key = base32Decode(secret);
    const buffer = Buffer.alloc(8);
    // Write 64-bit integer as big-endian
    buffer.writeBigInt64BE(BigInt(counter), 0);

    const hmac = createHmac('sha1', key).update(buffer).digest();
    const offset = hmac[hmac.length - 1] & 0xf;
    const code =
        ((hmac[offset] & 0x7f) << 24) |
        ((hmac[offset + 1] & 0xff) << 16) |
        ((hmac[offset + 2] & 0xff) << 8) |
        (hmac[offset + 3] & 0xff);

    const pin = (code % 1000000).toString().padStart(6, '0');
    return pin;
}

/**
 * Verifies a TOTP pin against a base32 secret.
 * Allows a configurable time step window (default: -1, 0, +1).
 */
export function verifyTOTP(secret: string, token: string, window = 1): boolean {
    const cleanToken = token.replace(/[\s-]+/g, '');
    if (!/^\d{6}$/.test(cleanToken)) return false;

    const currentCounter = Math.floor(Date.now() / 1000 / 30);
    for (let i = -window; i <= window; i++) {
        if (generateHOTP(secret, currentCounter + i) === cleanToken) {
            return true;
        }
    }
    return false;
}
