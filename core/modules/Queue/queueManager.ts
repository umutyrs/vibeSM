import { now } from '@lib/misc';
import { PlayerIdsObjectType } from '@shared/otherTypes';

interface QueuedPlayer {
    license: string;
    playerName: string;
    playerIds: string[];
    discordId: string | null;
    priority: number; // 0 = standard, 1 = priority
    ts: number; // last heartbeat
    firstTs: number; // when they first joined
}

export class QueueManager {
    private queue: QueuedPlayer[] = [];
    private recentlyAllowed = new Map<string, number>(); // license -> timestamp allowed
    private cleanupInterval: NodeJS.Timeout;

    constructor() {
        this.cleanupInterval = setInterval(() => {
            this.cleanup();
        }, 10_000);
    }

    private cleanup() {
        const currentTs = now();
        // Remove players who haven't updated/polled in 45 seconds
        this.queue = this.queue.filter(p => currentTs - p.ts < 45);

        // Remove from recentlyAllowed after 60 seconds
        for (const [license, ts] of this.recentlyAllowed.entries()) {
            if (currentTs - ts > 60) {
                this.recentlyAllowed.delete(license);
            }
        }
    }

    public async checkPlayerQueue(
        license: string,
        playerName: string,
        playerIds: string[],
        validIdsObject: PlayerIdsObjectType
    ): Promise<{ allow: boolean; retry?: boolean; reason?: string; adaptiveCard?: any }> {
        const currentTs = now();

        // 1. Check if Team/Staff member or Admin
        const isAdmin = vibeCore.adminStore.getAdminByIdentifiers(playerIds) !== null;
        let isTeam = isAdmin;

        if (!isTeam && validIdsObject.discord && vibeConfig.queue.teamRoles.length > 0) {
            try {
                const { isMember, memberRoles } = await vibeCore.discordBot.resolveMemberRoles(validIdsObject.discord);
                if (isMember && memberRoles) {
                    isTeam = vibeConfig.queue.teamRoles.some((r: string) => memberRoles.includes(r));
                }
            } catch (e) { }
        }

        if (isTeam) {
            // Team members bypass the queue entirely
            this.removeFromQueue(license);
            this.recentlyAllowed.set(license, currentTs);
            return { allow: true };
        }

        // 2. Check if player is already allowed (in transition)
        if (this.recentlyAllowed.has(license)) {
            return { allow: true };
        }

        // 3. Determine Priority Level
        let priority = 0;
        if (validIdsObject.discord && vibeConfig.queue.priorityRoles.length > 0) {
            try {
                const { isMember, memberRoles } = await vibeCore.discordBot.resolveMemberRoles(validIdsObject.discord);
                if (isMember && memberRoles) {
                    const hasPriority = vibeConfig.queue.priorityRoles.some((r: string) => memberRoles.includes(r));
                    if (hasPriority) {
                        priority = 1;
                    }
                }
            } catch (e) { }
        }

        // 4. Update or Add to queue
        let player = this.queue.find(p => p.license === license);
        if (player) {
            player.ts = currentTs;
            player.priority = priority; // update in case role was updated
        } else {
            player = {
                license,
                playerName,
                playerIds,
                discordId: validIdsObject.discord || null,
                priority,
                ts: currentTs,
                firstTs: currentTs,
            };
            this.queue.push(player);
        }

        // 5. Sort the queue: Priority 1 first, then by timestamp (FIFO)
        this.sortQueue();

        // 6. Check slot availability
        const maxSlots = vibeConfig.queue.customMaxSlots > 0
            ? vibeConfig.queue.customMaxSlots
            : (vibeCore.cacheStore.getTyped('fxsRuntime:maxClients', (val: any): val is number => typeof val === 'number') || 32);

        // Active players = online count + joining players (recently allowed)
        const onlineCount = vibeCore.fxPlayerlist.onlineCount;
        const activeJoins = onlineCount + this.recentlyAllowed.size;

        const isFirstInQueue = this.queue[0]?.license === license;

        if (activeJoins < maxSlots && isFirstInQueue) {
            // Player is allowed to join!
            this.removeFromQueue(license);
            this.recentlyAllowed.set(license, currentTs);
            return { allow: true };
        }

        // 7. Otherwise, they must wait in queue
        const position = this.queue.findIndex(p => p.license === license) + 1;
        const queueLength = this.queue.length;
        const priorityLabel = vibeConfig.queue.priorityLabel || 'Priority';
        const standardLabel = vibeConfig.queue.standardLabel || 'Standard';
        const queueType = priority === 1 ? priorityLabel : standardLabel;

        // Calculate waiting time
        const elapsedSeconds = currentTs - player.firstTs;
        const formatTime = (sec: number) => {
            const min = Math.floor(sec / 60);
            const s = sec % 60;
            return `${min.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        };
        const elapsedTimeStr = formatTime(elapsedSeconds);

        const template = vibeConfig.queue.queueMessageTemplate || '\n[vibeSM Queue]\nPosition: {{position}}/{{queueLength}} ({{queueType}})\nActive players: {{activePlayers}}/{{maxSlots}}\n\nPlease wait...';
        let reason = template;
        reason = reason.replaceAll('{{position}}', String(position));
        reason = reason.replaceAll('{{queueLength}}', String(queueLength));
        reason = reason.replaceAll('{{queueType}}', queueType);
        reason = reason.replaceAll('{{activePlayers}}', String(activeJoins));
        reason = reason.replaceAll('{{maxSlots}}', String(maxSlots));
        reason = reason.replaceAll('{{elapsedTime}}', elapsedTimeStr);

        // Resolve member profile for nickname/avatar
        let displayName = playerName;
        let avatarURL = "https://i.postimg.cc/L5qhs10w/vibe-SM-2.png";
        if (validIdsObject.discord && vibeCore.discordBot.isClientReady) {
            try {
                const profile = await vibeCore.discordBot.resolveMemberProfile(validIdsObject.discord);
                if (profile) {
                    if (profile.tag) displayName = profile.tag;
                    if (profile.avatar) {
                        avatarURL = `https://cdn.discordapp.com/avatars/${validIdsObject.discord}/${profile.avatar}.webp?size=128`;
                    }
                }
            } catch (e) { }
        }

        // Hydrate adaptive card if configured
        let adaptiveCard: any = null;
        if (vibeConfig.queue.adaptiveCardJson) {
            try {
                let cardStr = vibeConfig.queue.adaptiveCardJson;
                cardStr = cardStr.replaceAll('{{playerName}}', displayName);
                cardStr = cardStr.replaceAll('{{avatarURL}}', avatarURL);
                cardStr = cardStr.replaceAll('{{position}}', String(position));
                cardStr = cardStr.replaceAll('{{queueLength}}', String(queueLength));
                cardStr = cardStr.replaceAll('{{elapsedTime}}', elapsedTimeStr);
                cardStr = cardStr.replaceAll('{{queueType}}', queueType);
                adaptiveCard = JSON.parse(cardStr);
            } catch (e) {
                console.error(`Failed to parse/hydrate adaptive card JSON: ${(e as any).message}`);
            }
        }

        return {
            allow: false,
            retry: true,
            reason,
            adaptiveCard,
        };
    }

    private removeFromQueue(license: string) {
        this.queue = this.queue.filter(p => p.license !== license);
    }

    private sortQueue() {
        this.queue.sort((a, b) => {
            if (a.priority !== b.priority) {
                return b.priority - a.priority; // Priority 1 first
            }
            return a.ts - b.ts; // First in first out
        });
    }

    public handleShutdown() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
    }
}

export const queueManager = new QueueManager();
export default queueManager;
