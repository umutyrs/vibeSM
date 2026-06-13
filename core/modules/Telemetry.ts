import got from 'got';
import fsp from 'node:fs/promises';
import fs from 'node:fs';
import { nanoid } from 'nanoid';
import { readServers, runningServers } from '../routes/multiHosting';
import consoleFactory from '@lib/console';
import { vibeHostConfig } from '@core/globalData';

const console = consoleFactory('Telemetry');

export async function setupTelemetry() {
    const telemetryUrl = process.env.VIBESM_TELEMETRY_URL || 'https://vibesm.cc/api/telemetry';

    const idPath = vibeHostConfig.dataSubPath('telemetry_id.json');
    let telemetryId: string;
    try {
        if (fs.existsSync(idPath)) {
            const data = await fsp.readFile(idPath, 'utf-8');
            const parsed = JSON.parse(data);
            telemetryId = parsed.id;
        } else {
            telemetryId = 'vps-' + nanoid(16);
            await fsp.writeFile(idPath, JSON.stringify({ id: telemetryId }, null, 2), 'utf-8');
        }
    } catch (err) {
        telemetryId = 'vps-temp-' + nanoid(16);
    }

    const sendHeartbeat = async () => {
        let totalServers = 1;
        let activeServers = 0;

        const isPrimaryActive = vibeCore?.fxRunner?.child?.isAlive ?? false;
        if (isPrimaryActive) {
            activeServers += 1;
        }

        try {
            const mhServers = await readServers();
            totalServers += mhServers.length;
            activeServers += runningServers.size;
        } catch (error) {
            // ignore
        }

        try {
            await got.post(telemetryUrl, {
                json: {
                    telemetryId,
                    totalServers,
                    activeServers,
                    timestamp: Date.now()
                },
                timeout: {
                    request: 5000
                }
            });
            console.verbose.debug('Telemetry heartbeat sent successfully.');
        } catch (err: any) {
            console.verbose.debug(`Failed to send telemetry heartbeat: ${err.message}`);
        }
    };

    // Send initial heartbeat and setup interval (every 1 minute)
    sendHeartbeat();
    setInterval(sendHeartbeat, 60_000);
    console.log(`Telemetry reporting configured for URL: ${telemetryUrl}`);
}
