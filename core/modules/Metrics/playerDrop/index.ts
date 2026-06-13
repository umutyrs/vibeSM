const modulename = 'PlayerDropMetrics';
import fsp from 'node:fs/promises';
import path from 'node:path';
import consoleFactory from '@lib/console';
import { PDLChangeEventType, PDLFileSchema, PDLFileType, PDLHourlyRawType, PDLHourlyType, PDLServerBootDataSchema } from './playerDropSchemas';
import { classifyDrop } from './classifyDropReason';
import { PDL_RETENTION, PDL_UNKNOWN_LIST_SIZE_LIMIT } from './config';
import { ZodError } from 'zod';
import { getDateHourEnc, parseDateHourEnc } from './playerDropUtils';
import { MultipleCounter } from '../statsUtils';
import { throttle } from 'throttle-debounce';
import { PlayerDropsDetailedWindow, PlayerDropsSummaryHour } from '@routes/playerDrops';
import { migratePlayerDropsFile } from './playerDropMigrations';
import { parseFxserverVersion } from '@lib/fxserver/fxsVersionParser';
import { PlayerDropEvent } from '@modules/FxPlayerlist';
import { vibeEnv } from '@core/globalData';
const console = consoleFactory(modulename);


//Consts
export const LOG_DATA_FILE_VERSION = 2;
const LOG_DATA_FILE_NAME = 'stats_playerDrop.json';

export interface ServerDropMetrics {
    logFilePath: string;
    eventLog: PDLHourlyType[];
    lastGameVersion: string | undefined;
    lastServerVersion: string | undefined;
    lastResourceList: string[] | undefined;
    lastUnknownReasons: string[];
    queueSaveEventLog: any;
}


/**
 * Stores player drop logs, and also logs other information that might be relevant to player crashes,
 * such as changes to the detected game/server version, resources, etc.
 * 
 * NOTE: PDL = PlayerDropLog
 */
export default class PlayerDropMetrics {
    private loadingPromises = new Map<string, Promise<ServerDropMetrics>>();

    constructor() {
        setImmediate(() => {
            this.getServerMetrics('primary').catch(() => {});
        });
    }

    private async getLogFilePath(serverId: string): Promise<string> {
        if (serverId === 'primary') {
            return `${vibeEnv.profilePath}/data/${LOG_DATA_FILE_NAME}`;
        }
        try {
            const { readServers } = require('../../../routes/multiHosting');
            const servers = await readServers();
            const server = servers.find((s: any) => s.id === serverId);
            if (server && server.dataPath) {
                return path.join(server.dataPath, 'data', LOG_DATA_FILE_NAME);
            }
        } catch (e) {
            console.error(`Failed to get data path for server ${serverId}: ${(e as any).message}`);
        }
        return `${vibeEnv.profilePath}/data/stats_playerDrop_${serverId}.json`;
    }

    private getServerMetrics(serverId: string = 'primary'): Promise<ServerDropMetrics> {
        let promise = this.loadingPromises.get(serverId);
        if (!promise) {
            promise = (async () => {
                const logFilePath = await this.getLogFilePath(serverId);
                const metrics: ServerDropMetrics = {
                    logFilePath,
                    eventLog: [],
                    lastGameVersion: undefined,
                    lastServerVersion: undefined,
                    lastResourceList: undefined,
                    lastUnknownReasons: [],
                    queueSaveEventLog: throttle(
                        15_000,
                        (reason?: string) => {
                            this.saveEventLog(serverId, reason).catch((err) => {
                                console.error(`Error saving event log for ${serverId}: ${err.message}`);
                            });
                        },
                        { noLeading: true }
                    )
                };
                await this.loadEventLogForServer(serverId, metrics);
                return metrics;
            })();
            this.loadingPromises.set(serverId, promise);
        }
        return promise;
    }


    /**
     * Get the recent category count for player drops in the last X hours
     */
    public async getRecentDropTally(windowHours: number, serverId: string = 'primary') {
        const metrics = await this.getServerMetrics(serverId);
        const logCutoff = (new Date).setUTCMinutes(0, 0, 0) - (windowHours * 60 * 60 * 1000) - 1;
        const flatCounts = metrics.eventLog
            .filter((entry) => entry.hour.dateHourTs >= logCutoff)
            .map((entry) => entry.dropTypes.toSortedValuesArray())
            .flat();
        const cumulativeCounter = new MultipleCounter();
        cumulativeCounter.merge(flatCounts);
        return cumulativeCounter.toSortedValuesArray();
    }


    /**
     * Get the recent log with drop/crash/changes for the last X hours
     */
    public async getRecentSummary(windowHours: number, serverId: string = 'primary'): Promise<PlayerDropsSummaryHour[]> {
        const metrics = await this.getServerMetrics(serverId);
        const logCutoff = (new Date).setUTCMinutes(0, 0, 0) - (windowHours * 60 * 60 * 1000);
        const windowSummary = metrics.eventLog
            .filter((entry) => entry.hour.dateHourTs >= logCutoff)
            .map((entry) => ({
                hour: entry.hour.dateHourStr,
                changes: entry.changes.length,
                dropTypes: entry.dropTypes.toSortedValuesArray(),
            }));
        return windowSummary;
    }


    /**
     * Get the data for the player drops drilldown card within a inclusive time window
     */
    public async getWindowData(windowStart: number, windowEnd: number, serverId: string = 'primary'): Promise<PlayerDropsDetailedWindow> {
        const metrics = await this.getServerMetrics(serverId);
        const allChanges: PDLChangeEventType[] = [];
        const crashTypes = new MultipleCounter();
        const dropTypes = new MultipleCounter();
        const resKicks = new MultipleCounter();
        const filteredLogs = metrics.eventLog.filter((entry) => {
            return entry.hour.dateHourTs >= windowStart && entry.hour.dateHourTs <= windowEnd;
        });
        for (const log of filteredLogs) {
            allChanges.push(...log.changes);
            crashTypes.merge(log.crashTypes);
            dropTypes.merge(log.dropTypes);
            resKicks.merge(log.resKicks);
        }
        return {
            changes: allChanges,
            crashTypes: crashTypes.toSortedValuesArray(true),
            dropTypes: dropTypes.toSortedValuesArray(true),
            resKicks: resKicks.toSortedValuesArray(true),
        };
    }


    /**
     * Returns the object of the current hour object in log.
     * Creates one if doesn't exist one for the current hour.
     */
    private getCurrentLogHourRef(metrics: ServerDropMetrics) {
        const { dateHourTs, dateHourStr } = getDateHourEnc();
        const currentHourLog = metrics.eventLog.find((entry) => entry.hour.dateHourStr === dateHourStr);
        if (currentHourLog) return currentHourLog;
        const newHourLog: PDLHourlyType = {
            hour: {
                dateHourTs: dateHourTs,
                dateHourStr: dateHourStr,
            },
            changes: [],
            crashTypes: new MultipleCounter(),
            dropTypes: new MultipleCounter(),
            resKicks: new MultipleCounter(),
        };
        metrics.eventLog.push(newHourLog);
        return newHourLog;
    }


    /**
     * Handles receiving the data sent to the logger as soon as the server boots
     */
    public async handleServerBootData(rawPayload: any, serverId: string = 'primary') {
        const metrics = await this.getServerMetrics(serverId);
        const logRef = this.getCurrentLogHourRef(metrics);

        //Parsing data
        const validation = PDLServerBootDataSchema.safeParse(rawPayload);
        if (!validation.success) {
            console.warn(`Invalid server boot data: ${validation.error.errors}`);
            return;
        }
        const { gameName, gameBuild, fxsVersion, resources } = validation.data;
        let shouldSave = false;

        //Game version change
        const gameString = `${gameName}:${gameBuild}`;
        if (gameString) {
            if (!metrics.lastGameVersion) {
                shouldSave = true;
            } else if (gameString !== metrics.lastGameVersion) {
                shouldSave = true;
                logRef.changes.push({
                    ts: Date.now(),
                    type: 'gameChanged',
                    oldVersion: metrics.lastGameVersion,
                    newVersion: gameString,
                });
            }
            metrics.lastGameVersion = gameString;
        }

        //Server version change
        let { build: serverBuild, platform: serverPlatform } = parseFxserverVersion(fxsVersion);
        const fxsVersionString = `${serverPlatform}:${serverBuild}`;
        if (fxsVersionString) {
            if (!metrics.lastServerVersion) {
                shouldSave = true;
            } else if (fxsVersionString !== metrics.lastServerVersion) {
                shouldSave = true;
                logRef.changes.push({
                    ts: Date.now(),
                    type: 'fxsChanged',
                    oldVersion: metrics.lastServerVersion,
                    newVersion: fxsVersionString,
                });
            }
            metrics.lastServerVersion = fxsVersionString;
        }

        //Resource list change - if no resources, ignore as that's impossible
        if (resources.length) {
            if (!metrics.lastResourceList || !metrics.lastResourceList.length) {
                shouldSave = true;
            } else {
                const resAdded = resources.filter(r => !metrics.lastResourceList!.includes(r));
                const resRemoved = metrics.lastResourceList.filter(r => !resources.includes(r));
                if (resAdded.length || resRemoved.length) {
                    shouldSave = true;
                    logRef.changes.push({
                        ts: Date.now(),
                        type: 'resourcesChanged',
                        resAdded,
                        resRemoved,
                    });
                }
            }
            metrics.lastResourceList = resources;
        }

        //Saving if needed
        if (shouldSave) {
            metrics.queueSaveEventLog();
        }
    }


    /**
     * Handles receiving the player drop event, and returns the category of the drop
     */
    public async handlePlayerDrop(event: PlayerDropEvent, serverId: string = 'primary') {
        const drop = classifyDrop(event);

        //Ignore server shutdown drops
        if (drop.category === false) return false;

        //Log the drop
        const metrics = await this.getServerMetrics(serverId);
        const logRef = this.getCurrentLogHourRef(metrics);
        logRef.dropTypes.count(drop.category);
        if (drop.category === 'resource' && drop.resource) {
            logRef.resKicks.count(drop.resource);
        } else if (drop.category === 'crash' && drop.cleanReason) {
            logRef.crashTypes.count(drop.cleanReason);
        } else if (drop.category === 'unknown' && drop.cleanReason) {
            if (!metrics.lastUnknownReasons.includes(drop.cleanReason)) {
                metrics.lastUnknownReasons.push(drop.cleanReason);
            }
        }
        metrics.queueSaveEventLog();
        return drop.category;
    }


    /**
     * Resets the player drop stats log
     */
    public async resetLog(reason: string, serverId: string = 'primary') {
        if (typeof reason !== 'string' || !reason) throw new Error(`reason required`);
        const metrics = await this.getServerMetrics(serverId);
        metrics.eventLog = [];
        metrics.lastGameVersion = undefined;
        metrics.lastServerVersion = undefined;
        metrics.lastResourceList = undefined;
        metrics.lastUnknownReasons = [];
        metrics.queueSaveEventLog.cancel({ upcomingOnly: true });
        await this.saveEventLog(serverId, reason);
    }


    /**
     * Loads the stats database/cache/history
     */
    private async loadEventLogForServer(serverId: string, metrics: ServerDropMetrics) {
        try {
            const rawFileData = await fsp.readFile(metrics.logFilePath, 'utf8');
            const fileData = JSON.parse(rawFileData);
            let statsData: PDLFileType;
            if (fileData.version === LOG_DATA_FILE_VERSION) {
                statsData = PDLFileSchema.parse(fileData);
            } else {
                try {
                    statsData = await migratePlayerDropsFile(fileData);
                } catch (error) {
                    throw new Error(`Failed to migrate ${LOG_DATA_FILE_NAME} from ${fileData?.version} to ${LOG_DATA_FILE_VERSION}: ${(error as Error).message}`);
                }
            }
            metrics.lastGameVersion = statsData.lastGameVersion;
            metrics.lastServerVersion = statsData.lastServerVersion;
            metrics.lastResourceList = statsData.lastResourceList;
            metrics.lastUnknownReasons = statsData.lastUnknownReasons;
            metrics.eventLog = statsData.log.map((entry): PDLHourlyType => {
                return {
                    hour: parseDateHourEnc(entry.hour),
                    changes: entry.changes,
                    crashTypes: new MultipleCounter(entry.crashTypes),
                    dropTypes: new MultipleCounter(entry.dropTypes),
                    resKicks: new MultipleCounter(entry.resKicks),
                }
            });
            console.verbose.ok(`Loaded ${metrics.eventLog.length} log entries from cache for server ${serverId}`);
            this.optimizeStatsLog(metrics);
        } catch (error) {
            if ((error as any)?.code === 'ENOENT') {
                console.verbose.debug(`${LOG_DATA_FILE_NAME} not found for server ${serverId}, starting with empty stats.`);
                metrics.eventLog = [];
                metrics.lastGameVersion = undefined;
                metrics.lastServerVersion = undefined;
                metrics.lastResourceList = undefined;
                metrics.lastUnknownReasons = [];
                metrics.queueSaveEventLog.cancel({ upcomingOnly: true });
                await this.saveEventLog(serverId, 'File was just created, no data yet');
                return;
            }
            if (error instanceof ZodError) {
                console.warn(`Failed to load ${LOG_DATA_FILE_NAME} for server ${serverId} due to invalid data.`);
                metrics.eventLog = [];
                metrics.lastGameVersion = undefined;
                metrics.lastServerVersion = undefined;
                metrics.lastResourceList = undefined;
                metrics.lastUnknownReasons = [];
                metrics.queueSaveEventLog.cancel({ upcomingOnly: true });
                await this.saveEventLog(serverId, 'Failed to load log file due to invalid data');
            } else {
                console.warn(`Failed to load ${LOG_DATA_FILE_NAME} for server ${serverId} with message: ${(error as Error).message}`);
                metrics.eventLog = [];
                metrics.lastGameVersion = undefined;
                metrics.lastServerVersion = undefined;
                metrics.lastResourceList = undefined;
                metrics.lastUnknownReasons = [];
                metrics.queueSaveEventLog.cancel({ upcomingOnly: true });
                await this.saveEventLog(serverId, 'Failed to load log file due to unknown error');
            }
            console.warn('Since this is not a critical file, it will be reset.');
        }
    }


    /**
     * Optimizes the event log by removing old entries
     */
    private optimizeStatsLog(metrics: ServerDropMetrics) {
        if (metrics.lastUnknownReasons.length > PDL_UNKNOWN_LIST_SIZE_LIMIT) {
            metrics.lastUnknownReasons = metrics.lastUnknownReasons.slice(-PDL_UNKNOWN_LIST_SIZE_LIMIT);
        }

        const maxAge = Date.now() - PDL_RETENTION;
        const cutoffIdx = metrics.eventLog.findIndex((entry) => entry.hour.dateHourTs > maxAge);
        if (cutoffIdx > 0) {
            metrics.eventLog = metrics.eventLog.slice(cutoffIdx);
        }
    }


    /**
     * Saves the stats database/cache/history
     */
    private async saveEventLog(serverId: string, emptyReason?: string) {
        try {
            const metrics = await this.getServerMetrics(serverId);
            const sizeBefore = metrics.eventLog.length;
            this.optimizeStatsLog(metrics);
            if (!metrics.eventLog.length) {
                if (sizeBefore) {
                    emptyReason ??= 'Cleared due to retention policy';
                }
            } else {
                emptyReason = undefined;
            }

            const savePerfData: PDLFileType = {
                version: LOG_DATA_FILE_VERSION,
                emptyReason,
                lastGameVersion: metrics.lastGameVersion ?? 'unknown',
                lastServerVersion: metrics.lastServerVersion ?? 'unknown',
                lastResourceList: metrics.lastResourceList ?? [],
                lastUnknownReasons: metrics.lastUnknownReasons,
                log: metrics.eventLog.map((entry): PDLHourlyRawType => {
                    return {
                        hour: entry.hour.dateHourStr,
                        changes: entry.changes,
                        crashTypes: entry.crashTypes.toArray(),
                        dropTypes: entry.dropTypes.toArray(),
                        resKicks: entry.resKicks.toArray(),
                    }
                }),
            };
            await fsp.writeFile(metrics.logFilePath, JSON.stringify(savePerfData));
        } catch (error) {
            console.warn(`Failed to save ${LOG_DATA_FILE_NAME} for server ${serverId} with message: ${(error as Error).message}`);
        }
    }
}
