//NOTE: must be imported first to setup the environment
import { vibeEnv, vibeHostConfig } from './globalData';
import consoleFactory, { setTTYTitle } from '@lib/console';



//Can be imported after
import fs from 'node:fs';
import checkPreRelease from './boot/checkPreRelease';
import fatalError from '@lib/fatalError';
import { ensureProfileStructure, setupProfile } from './boot/setup';
import setupProcessHandlers from './boot/setupProcessHandlers';
import bootVibeSM from './vibeSM';
const console = consoleFactory();


//Early process stuff
try {
    process.title = 'vibeSM'; //doesn't work for now
    setupProcessHandlers();
    setTTYTitle();
    checkPreRelease();
} catch (error) {
    fatalError.Boot(0, 'Failed early process setup.', error);
}
console.log(`Starting vibeSM v${vibeEnv.vibeVersion}/b${vibeEnv.fxsVersionTag}...`);


//Setting up txData & Profile
try {
    if (!fs.existsSync(vibeHostConfig.dataPath)) {
        fs.mkdirSync(vibeHostConfig.dataPath);
    }
} catch (error) {
    fatalError.Boot(1, [
        `Failed to check or create the data folder.`,
        ['Path', vibeHostConfig.dataPath],
    ], error);
}
let isNewProfile = false;
try {
    if (fs.existsSync(vibeEnv.profilePath)) {
        ensureProfileStructure();
    } else {
        setupProfile();
        isNewProfile = true;
    }
} catch (error) {
    fatalError.Boot(2, [
        `Failed to check or create the vibeSM profile folder.`,
        ['Data Path', vibeHostConfig.dataPath],
        ['Profile Name', vibeEnv.profileName],
        ['Profile Path', vibeEnv.profilePath],
    ], error);
}
if (isNewProfile && vibeEnv.profileName !== 'default') {
    console.log(`Profile path: ${vibeEnv.profilePath}`);
}


//Start vibeSM (have fun 😀)
try {
    bootVibeSM();
} catch (error) {
    fatalError.Boot(3, 'Failed to start vibeSM.', error);
}


//Freeze detector - starts after 10 seconds due to the initial bootup lag
const bootGracePeriod = 15_000;
const loopInterval = 500;
const loopElapsedLimit = 2_000;
setTimeout(() => {
    let hdTimer = Date.now();
    setInterval(() => {
        const now = Date.now();
        if (now - hdTimer > loopElapsedLimit) {
            console.majorMultilineError([
                'Major VPS freeze/lag detected!',
                'THIS IS NOT AN ERROR CAUSED BY VIBESM!',
            ]);
        }
        hdTimer = now;
    }, loopInterval);
}, bootGracePeriod);
