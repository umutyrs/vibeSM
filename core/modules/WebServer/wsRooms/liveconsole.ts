import type { RoomType } from "../webSocket";
import { AuthedAdminType } from "../authLogic";


/**
 * The console room is responsible for the server live console page
 */
export default {
    permission: 'console.view',
    eventName: 'consoleData',
    cumulativeBuffer: true,
    outBuffer: '',
    initialData: () => vibeCore.logger.fxserver.getRecentBuffer(),
    commands: {
        consoleCommand: {
            permission: 'console.write',
            handler: (admin: AuthedAdminType, command: string) => {
                if(typeof command !== 'string') return;
                const sanitized = command.replaceAll(/\n/g, ' ');
                if (sanitized.length > 0) {
                    admin.logCommand(sanitized);
                    vibeCore.fxRunner.sendRawCommand(sanitized, admin.name);
                    vibeCore.fxRunner.sendEvent('consoleCommand', {
                        channel: 'vibeSM',
                        command: sanitized,
                        author: admin.name,
                    });
                } else {
                    vibeCore.fxRunner.sendRawCommand('', admin.name);
                }
            }
        },
    },
} satisfies RoomType;
