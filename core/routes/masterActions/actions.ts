/* eslint-disable no-unused-vars */
const modulename = 'WebServer:MasterActions:Action';
import { DatabaseActionBanType, DatabaseActionType, DatabaseActionWarnType, DatabasePlayerType } from '@modules/Database/databaseTypes';
import { now } from '@lib/misc';
import { GenericApiErrorResp } from '@shared/genericApiTypes';
import consoleFactory from '@lib/console';
import { AuthedCtx } from '@modules/WebServer/ctxTypes';
import { SYM_RESET_CONFIG } from '@lib/symbols';
const console = consoleFactory(modulename);


/**
 * Handle all the master actions... actions
 */
export default async function MasterActionsAction(ctx: AuthedCtx) {
    //Sanity check
    if (typeof ctx.params.action !== 'string') {
        return ctx.send({ error: 'Invalid Request' });
    }
    const action = ctx.params.action;

    //Check permissions
    if (!ctx.admin.testPermission('master', modulename)) {
        return ctx.send({ error: 'Only the master account has permission to view/use this page.' });
    }
    if (!ctx.txVars.isWebInterface) {
        return ctx.send({ error: 'This functionality cannot be used by the in-game menu, please use the web version of vibeSM.' });
    }

    //Delegate to the specific action functions
    if (action == 'cleanDatabase') {
        return handleCleanDatabase(ctx);
    } else if (action == 'revokeWhitelists') {
        return handleRevokeWhitelists(ctx);
    } else if (action == 'triggerArtifactsUpdate') {
        return handleTriggerArtifactsUpdate(ctx);
    } else if (action == 'getArtifactsUpdateStatus') {
        return handleGetArtifactsUpdateStatus(ctx);
    } else {
        return ctx.send({ error: 'Unknown settings action.' });
    }
};

import { vibeEnv, vibeHostConfig } from '@core/globalData';
import path from 'node:path';
import fs from 'node:fs';
import fse from 'fs-extra';
import StreamZip from 'node-stream-zip';
import got from '@lib/got';
import execa from 'execa';

let updateStatus = {
    running: false,
    step: '',
    error: null as string | null,
    success: false,
    targetPath: '',
    progress: 0,
};

async function handleGetArtifactsUpdateStatus(ctx: AuthedCtx) {
    return ctx.send(updateStatus);
}

async function handleTriggerArtifactsUpdate(ctx: AuthedCtx) {
    if (updateStatus.running) {
        return ctx.send({ error: 'An update is already running.' });
    }
    const channel = ctx.request.body.channel;
    if (typeof channel !== 'string') {
        return ctx.send({ error: 'Invalid Request: missing channel selection.' });
    }

    // Reset status
    updateStatus = {
        running: true,
        step: 'Starting...',
        error: null,
        success: false,
        targetPath: '',
        progress: 0,
    };

    // Run in background
    runArtifactsUpdate(channel).catch((err) => {
        updateStatus.running = false;
        updateStatus.error = err.message;
        console.error('Artifacts update failed:', err);
    });

    return ctx.send({ success: true });
}

async function resolveArtifactDownloadUrl(channel: string): Promise<{ url: string; build: string }> {
    const isWin = vibeEnv.isWindows;
    const platform = isWin ? 'win32' : 'linux';
    
    // If it's a channel (recommended, optional, latest)
    if (['recommended', 'optional', 'latest'].includes(channel)) {
        const cacheBuster = Math.floor(Date.now() / 5_000_000);
        const reqUrl = `https://changelogs-live.fivem.net/api/changelog/versions/${platform}/server?${cacheBuster}`;
        const resp: any = await got(reqUrl).json();
        
        let build = '';
        let url = '';
        if (channel === 'recommended') {
            build = resp.recommended.toString();
            url = resp.recommended_download;
        } else if (channel === 'optional') {
            build = resp.optional.toString();
            url = resp.optional_download;
        } else if (channel === 'latest') {
            build = resp.latest.toString();
            url = resp.latest_download;
        }
        return { url, build };
    }
    
    // Otherwise, treat as custom build number
    const buildNumber = parseInt(channel);
    if (isNaN(buildNumber) || buildNumber <= 0) {
        throw new Error('Invalid build selection or build number.');
    }
    
    const repoUrl = isWin 
        ? 'https://runtime.fivem.net/artifacts/fivem/build_server_windows/master/' 
        : 'https://runtime.fivem.net/artifacts/fivem/build_proot_linux/master/';
        
    const html = await got(repoUrl).text();
    const fileExtension = isWin ? 'server\\.zip' : 'fx\\.tar\\.xz';
    const regex = new RegExp(`href="(${buildNumber}-[a-f0-9]+/${fileExtension})"`, 'i');
    const match = html.match(regex);
    if (!match) {
        throw new Error(`Could not find artifact link for build ${buildNumber} on FiveM repository.`);
    }
    
    return {
        url: repoUrl + match[1],
        build: buildNumber.toString()
    };
}

async function runArtifactsUpdate(channel: string) {
    const isWin = vibeEnv.isWindows;
    
    updateStatus.progress = 5;
    updateStatus.step = 'Resolving artifact URL for channel: ' + channel;
    const { url, build } = await resolveArtifactDownloadUrl(channel);
    
    const tmpDir = vibeHostConfig.dataSubPath('tmp_artifacts_update');
    await fse.ensureDir(tmpDir);
    const archiveName = isWin ? 'server.zip' : 'fx.tar.xz';
    const archivePath = path.join(tmpDir, archiveName);
    
    updateStatus.step = `Downloading build ${build}...`;
    const gotOptions = {
        timeout: { request: 300e3 },
        retry: { limit: 3 },
    };
    
    const responseStream = got.stream(url, gotOptions);
    responseStream.on('downloadProgress', (progress) => {
        const pct = Math.round(progress.percent * 100);
        updateStatus.progress = Math.max(5, Math.min(85, Math.round(5 + pct * 0.8))); // map 0-100% download to 5-85% total progress
        updateStatus.step = `Downloading build ${build} (${pct}%)...`;
    });
    
    const writeStream = fs.createWriteStream(archivePath);
    
    await new Promise<void>((resolve, reject) => {
        responseStream.pipe(writeStream);
        responseStream.on('error', (err) => reject(err));
        writeStream.on('error', (err) => reject(err));
        writeStream.on('finish', () => resolve());
    });
    
    const serverDir = vibeEnv.fxsPath.endsWith('citizen') ? path.dirname(vibeEnv.fxsPath) : vibeEnv.fxsPath;
    const targetParent = path.dirname(serverDir);
    const targetDir = path.join(targetParent, `server_updated_${build}`);
    updateStatus.targetPath = targetDir;
    
    updateStatus.progress = 88;
    updateStatus.step = `Extracting archive to: ${targetDir}`;
    await fse.emptyDir(targetDir);
    
    if (isWin) {
        const zip = new StreamZip.async({ file: archivePath });
        await zip.extract(null, targetDir);
        await zip.close();
    } else {
        await execa('tar', ['-xf', archivePath, '-C', targetDir]);
    }
    
    updateStatus.progress = 95;
    updateStatus.step = 'Copying vibeSM resource (monitor)...';
    const targetTxaPath = path.join(targetDir, 'citizen', 'system_resources', 'monitor');
    await fse.remove(targetTxaPath);
    await fse.copy(vibeEnv.txaPath, targetTxaPath);
    
    updateStatus.progress = 98;
    updateStatus.step = 'Cleaning up temporary files...';
    await fse.remove(tmpDir);
    
    updateStatus.progress = 100;
    updateStatus.step = 'Update finished successfully!';
    updateStatus.success = true;
    updateStatus.running = false;
}


/**
 * Handle clean database request
 */
async function handleCleanDatabase(ctx: AuthedCtx) {
    //Typescript stuff
    type successResp = {
        msElapsed: number;
        playersRemoved: number;
        actionsRemoved: number;
        hwidsRemoved: number;
    }
    const sendTypedResp = (data: successResp | GenericApiErrorResp) => ctx.send(data);

    //Sanity check
    if (
        typeof ctx.request.body.players !== 'string'
        || typeof ctx.request.body.bans !== 'string'
        || typeof ctx.request.body.warns !== 'string'
        || typeof ctx.request.body.hwids !== 'string'
    ) {
        return sendTypedResp({ error: 'Invalid Request' });
    }
    const { players, bans, warns, hwids } = ctx.request.body;
    const daySecs = 86400;
    const currTs = now();

    //Prepare filters
    let playersFilter: Function;
    if (players === 'none') {
        playersFilter = (x: DatabasePlayerType) => false;
    } else if (players === '60d') {
        playersFilter = (x: DatabasePlayerType) => x.tsLastConnection < (currTs - 60 * daySecs) && !x.notes;
    } else if (players === '30d') {
        playersFilter = (x: DatabasePlayerType) => x.tsLastConnection < (currTs - 30 * daySecs) && !x.notes;
    } else if (players === '15d') {
        playersFilter = (x: DatabasePlayerType) => x.tsLastConnection < (currTs - 15 * daySecs) && !x.notes;
    } else {
        return sendTypedResp({ error: 'Invalid players filter type.' });
    }

    let bansFilter: Function;
    if (bans === 'none') {
        bansFilter = (x: DatabaseActionBanType) => false;
    } else if (bans === 'revoked') {
        bansFilter = (x: DatabaseActionBanType) => x.type === 'ban' && x.revocation.timestamp;
    } else if (bans === 'revokedExpired') {
        bansFilter = (x: DatabaseActionBanType) => x.type === 'ban' && (x.revocation.timestamp || (x.expiration && x.expiration < currTs));
    } else if (bans === 'all') {
        bansFilter = (x: DatabaseActionBanType) => x.type === 'ban';
    } else {
        return sendTypedResp({ error: 'Invalid bans filter type.' });
    }

    let warnsFilter: Function;
    if (warns === 'none') {
        warnsFilter = (x: DatabaseActionWarnType) => false;
    } else if (warns === 'revoked') {
        warnsFilter = (x: DatabaseActionWarnType) => x.type === 'warn' && x.revocation.timestamp;
    } else if (warns === '30d') {
        warnsFilter = (x: DatabaseActionWarnType) => x.type === 'warn' && x.timestamp < (currTs - 30 * daySecs);
    } else if (warns === '15d') {
        warnsFilter = (x: DatabaseActionWarnType) => x.type === 'warn' && x.timestamp < (currTs - 15 * daySecs);
    } else if (warns === '7d') {
        warnsFilter = (x: DatabaseActionWarnType) => x.type === 'warn' && x.timestamp < (currTs - 7 * daySecs);
    } else if (warns === 'all') {
        warnsFilter = (x: DatabaseActionWarnType) => x.type === 'warn';
    } else {
        return sendTypedResp({ error: 'Invalid warns filter type.' });
    }

    const actionsFilter = (x: DatabaseActionType) => {
        return bansFilter(x) || warnsFilter(x);
    };

    let hwidsWipePlayers: boolean;
    let hwidsWipeBans: boolean;
    if (hwids === 'none') {
        hwidsWipePlayers = false;
        hwidsWipeBans = false;
    } else if (hwids === 'players') {
        hwidsWipePlayers = true;
        hwidsWipeBans = false;
    } else if (hwids === 'bans') {
        hwidsWipePlayers = false;
        hwidsWipeBans = true;
    } else if (hwids === 'all') {
        hwidsWipePlayers = true;
        hwidsWipeBans = true;
    } else {
        return sendTypedResp({ error: 'Invalid HWIDs filter type.' });
    }

    //Run db cleaner
    const tsStart = Date.now();
    let playersRemoved = 0;
    try {
        playersRemoved = vibeCore.database.cleanup.bulkRemove('players', playersFilter);
    } catch (error) {
        return sendTypedResp({ error: `<b>Failed to clean players with error:</b><br>${(error as Error).message}` });
    }

    let actionsRemoved = 0;
    try {
        actionsRemoved = vibeCore.database.cleanup.bulkRemove('actions', actionsFilter);
    } catch (error) {
        return sendTypedResp({ error: `<b>Failed to clean actions with error:</b><br>${(error as Error).message}` });
    }

    let hwidsRemoved = 0;
    try {
        hwidsRemoved = vibeCore.database.cleanup.wipeHwids(hwidsWipePlayers, hwidsWipeBans);
    } catch (error) {
        return sendTypedResp({ error: `<b>Failed to clean HWIDs with error:</b><br>${(error as Error).message}` });
    }

    //Return results
    const msElapsed = Date.now() - tsStart;
    return sendTypedResp({ msElapsed, playersRemoved, actionsRemoved, hwidsRemoved });
}


/**
 * Handle clean database request
 */
async function handleRevokeWhitelists(ctx: AuthedCtx) {
    //Typescript stuff
    type successResp = {
        msElapsed: number;
        cntRemoved: number;
    }
    const sendTypedResp = (data: successResp | GenericApiErrorResp) => ctx.send(data);

    //Sanity check
    if (typeof ctx.request.body.filter !== 'string') {
        return sendTypedResp({ error: 'Invalid Request' });
    }
    const filterInput = ctx.request.body.filter;
    const daySecs = 86400;
    const currTs = now();

    let filterFunc: Function;
    if (filterInput === 'all') {
        filterFunc = (p: DatabasePlayerType) => true;
    } else if (filterInput === '30d') {
        filterFunc = (p: DatabasePlayerType) => p.tsLastConnection < (currTs - 30 * daySecs);
    } else if (filterInput === '15d') {
        filterFunc = (p: DatabasePlayerType) => p.tsLastConnection < (currTs - 15 * daySecs);
    } else if (filterInput === '7d') {
        filterFunc = (p: DatabasePlayerType) => p.tsLastConnection < (currTs - 7 * daySecs);
    } else {
        return sendTypedResp({ error: 'Invalid whitelists filter type.' });
    }

    try {
        const tsStart = Date.now();
        const cntRemoved = vibeCore.database.players.bulkRevokeWhitelist(filterFunc);
        const msElapsed = Date.now() - tsStart;
        return sendTypedResp({ msElapsed, cntRemoved });
    } catch (error) {
        return sendTypedResp({ error: `<b>Failed to clean players with error:</b><br>${(error as Error).message}` });
    }
}
