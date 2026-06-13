import type { InitializedCtx } from '@modules/WebServer/ctxTypes';
import { vibeEnv } from '@core/globalData';

/**
 * Returns the community ads data
 */
export default async function CommunityAds(ctx: InitializedCtx) {
    return ctx.send(vibeEnv.adsData);
}
