const modulename = 'WebServer:ServerLogPartial';
import consoleFactory from '@lib/console';
const console = consoleFactory(modulename);


/**
 * Returns the output page containing the admin log.
 * @param {object} ctx
 */
export default async function ServerLogPartial(ctx) {
    //Check permissions
    if (!ctx.admin.hasPermission('server.log.view')) {
        return sendTypedResp({ error: 'You don\'t have permission to call this endpoint.' });
    }

    const serverId = ctx.request.query.serverId;
    let logger = vibeCore.logger.server;
    if (serverId && serverId !== 'primary') {
        const { gameLoggerInstances } = require('./multiHosting');
        const customLogger = gameLoggerInstances.get(serverId);
        if (customLogger) {
            logger = customLogger;
        }
    }

    const isDigit = /^\d{13}$/;
    const sliceSize = 500;

    if (ctx.request.query.dir === 'older' && isDigit.test(ctx.request.query.ref)) {
        const log = logger.readPartialOlder(ctx.request.query.ref, sliceSize);
        return ctx.send({
            boundry: log.length < sliceSize,
            log,
        });
    } else if (ctx.request.query.dir === 'newer' && isDigit.test(ctx.request.query.ref)) {
        const log = logger.readPartialNewer(ctx.request.query.ref, sliceSize);
        return ctx.send({
            boundry: log.length < sliceSize,
            log,
        });
    } else {
        return ctx.send({
            boundry: true,
            log: logger.getRecentBuffer(),
        });
    }
};
