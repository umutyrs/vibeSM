import { vibeEnv, vibeHostConfig } from '@core/globalData';
import got from 'got';

export default got.extend({
    timeout: {
        request: 5000
    },
    headers: {
        'User-Agent': `vibeSM ${vibeEnv.vibeVersion}`,
    },
    localAddress: vibeHostConfig.netInterface,
});
