import path from 'node:path';
import fs from 'node:fs';

import fatalError from '@lib/fatalError';
import { vibeEnv } from '@core/globalData';
import ConfigStore from '@modules/ConfigStore';
import { chalkInversePad } from '@lib/misc';


/**
 * Ensure the profile subfolders exist
 */
export const ensureProfileStructure = () => {
    const dataPath = path.join(vibeEnv.profilePath, 'data');
    if (!fs.existsSync(dataPath)) {
        fs.mkdirSync(dataPath);
    }

    const logsPath = path.join(vibeEnv.profilePath, 'logs');
    if (!fs.existsSync(logsPath)) {
        fs.mkdirSync(logsPath);
    }
}


/**
 * Setup the profile folder structure
 */
export const setupProfile = () => {
    //Create new profile folder
    try {
        fs.mkdirSync(vibeEnv.profilePath);
        const configStructure = ConfigStore.getEmptyConfigFile();
        fs.writeFileSync(
            path.join(vibeEnv.profilePath, 'config.json'),
            JSON.stringify(configStructure, null, 2)
        );
        ensureProfileStructure();
    } catch (error) {
        fatalError.Boot(4, [
            'Failed to set up data folder structure.',
            ['Path', vibeEnv.profilePath],
        ], error);
    }
    console.log(`Server data will be saved in ${chalkInversePad(vibeEnv.profilePath)}`);

    //Saving start.bat (yes, I also wish this didn't exist)
    if (vibeEnv.isWindows && vibeEnv.profileName !== 'default') {
        const batFilename = `start_${vibeEnv.fxsVersion}_${vibeEnv.profileName}.bat`;
        try {
            const fxsPath = path.join(vibeEnv.fxsPath, 'FXServer.exe');
            const batLines = [
                //TODO: add note to not add any server convars in here
                `@echo off`,
                `"${fxsPath}" +set serverProfile "${vibeEnv.profileName}"`,
                `pause`
            ];
            const batFolder = path.resolve(vibeEnv.fxsPath, '..');
            const batPath = path.join(batFolder, batFilename);
            fs.writeFileSync(batPath, batLines.join('\r\n'));
            console.ok(`You can use ${chalkInversePad(batPath)} to start this profile.`);
        } catch (error) {
            console.warn(`Failed to create '${batFilename}' with error:`);
            console.dir(error);
        }
    }
};
