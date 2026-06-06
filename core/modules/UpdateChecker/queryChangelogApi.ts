const modulename = 'UpdateChecker';
import semver, { ReleaseType } from 'semver';
import { z } from "zod";
import got from '@lib/got';
import { vibeEnv } from '@core/globalData';
import consoleFactory from '@lib/console';
import { UpdateDataType } from '@shared/otherTypes';
import { fromError } from 'zod-validation-error';
const console = consoleFactory(modulename);


//Schemas
const txVersion = z.string().refine(
    (x) => x !== '0.0.0',
    { message: 'must not be 0.0.0' }
);
const changelogRespSchema = z.object({
    recommended: z.coerce.number().positive(),
    recommended_download: z.string().url(),
    recommended_vibesm: txVersion,
    optional: z.coerce.number().positive(),
    optional_download: z.string().url(),
    optional_vibesm: txVersion,
    latest: z.coerce.number().positive(),
    latest_download: z.string().url(),
    latest_vibesm: txVersion,
    critical: z.coerce.number().positive(),
    critical_download: z.string().url(),
    critical_vibesm: txVersion,
});

//Types
type DetailedUpdateDataType = {
    semverDiff: ReleaseType;
    version: string;
    isImportant: boolean;
};

export const queryChangelogApi = async () => {
    //GET changelog data
    let apiResponse: z.infer<typeof changelogRespSchema>;
    try {
        //perform request - cache busting every ~1.4h
        const osTypeApiUrl = (vibeEnv.isWindows) ? 'win32' : 'linux';
        const cacheBuster = Math.floor(Date.now() / 5_000_000);
        const reqUrl = `https://changelogs-live.fivem.net/api/changelog/versions/${osTypeApiUrl}/server?${cacheBuster}`;
        const resp = await got(reqUrl).json()
        apiResponse = changelogRespSchema.parse(resp);
    } catch (error) {
        let msg = (error as Error).message;
        if(error instanceof z.ZodError){
            msg = fromError(error, { prefix: null }).message
        }
        console.verbose.warn(`Failed to retrieve FXServer/vibeSM update data with error: ${msg}`);
        return;
    }

    //Checking vibeSM version
    let txaUpdateData: DetailedUpdateDataType | undefined;
    try {
        const isOutdated = semver.lt(vibeEnv.vibeVersion, apiResponse.latest_vibesm);
        if (isOutdated) {
            const semverDiff = semver.diff(vibeEnv.vibeVersion, apiResponse.latest_vibesm) ?? 'patch';
            const isImportant = (semverDiff === 'major' || semverDiff === 'minor');
            txaUpdateData = {
                semverDiff,
                isImportant,
                version: apiResponse.latest_vibesm,
            };
        }
    } catch (error) {
        console.verbose.warn('Error checking for vibeSM updates.');
        console.verbose.dir(error);
    }

    //Checking FXServer version
    let fxsUpdateData: UpdateDataType | undefined;
    try {
        if (vibeEnv.fxsVersion < apiResponse.critical) {
            if (apiResponse.critical > apiResponse.recommended) {
                fxsUpdateData = {
                    version: apiResponse.critical.toString(),
                    isImportant: true,
                }
            } else {
                fxsUpdateData = {
                    version: apiResponse.recommended.toString(),
                    isImportant: true,
                }
            }
        } else if (vibeEnv.fxsVersion < apiResponse.recommended) {
            fxsUpdateData = {
                version: apiResponse.recommended.toString(),
                isImportant: true,
            };
        } else if (vibeEnv.fxsVersion < apiResponse.optional) {
            fxsUpdateData = {
                version: apiResponse.optional.toString(),
                isImportant: false,
            };
        }
    } catch (error) {
        console.warn('Error checking for FXServer updates.');
        console.verbose.dir(error);
    }

    return {
        txa: txaUpdateData,
        fxs: fxsUpdateData,
    };
};
