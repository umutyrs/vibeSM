const modulename = 'WebServer:FileEditorSave';
import fs from 'node:fs';
import path from 'node:path';
import consoleFactory from '@lib/console';
const console = consoleFactory(modulename);

const EDITABLE_EXTENSIONS = ['.lua', '.js', '.ts', '.json', '.cfg', '.txt', '.ini', '.html', '.css', '.yml', '.yaml'];

const isUndefined = (x) => (x === undefined);

/**
 * Saves a resource file
 */
export default async function FileEditorSave(ctx) {
    // Sanity checks
    if (
        isUndefined(ctx.request.body.resource) ||
        typeof ctx.request.body.resource !== 'string' ||
        isUndefined(ctx.request.body.file) ||
        typeof ctx.request.body.file !== 'string' ||
        isUndefined(ctx.request.body.fileData) ||
        typeof ctx.request.body.fileData !== 'string'
    ) {
        return ctx.utils.error(400, 'Invalid Request');
    }

    const { resource: resourceName, file, fileData } = ctx.request.body;

    // Check permission
    if (!ctx.admin.testPermission('resources.file_editor', modulename)) {
        return ctx.send({
            type: 'danger',
            message: 'You don\'t have permission to save files.',
        });
    }

    // Resolve resource from active fxResources
    if (!vibeCore.fxResources || !vibeCore.fxResources.resourceReport || !Array.isArray(vibeCore.fxResources.resourceReport.resources)) {
        return ctx.send({
            type: 'danger',
            message: 'Resource list is currently unavailable. Ensure FXServer is running.',
        });
    }

    const resource = vibeCore.fxResources.resourceReport.resources.find(
        (r) => r.name.toLowerCase() === resourceName.toLowerCase()
    );

    if (!resource || !resource.path) {
        return ctx.send({
            type: 'danger',
            message: `Resource '${resourceName}' not found or has no active path.`,
        });
    }

    const resourcePath = path.normalize(resource.path);
    if (!fs.existsSync(resourcePath)) {
        return ctx.send({
            type: 'danger',
            message: `Resource folder path '${resourcePath}' does not exist on disk.`,
        });
    }

    // Security check: path traversal
    const activeFilePath = path.normalize(path.join(resourcePath, file));
    const relative = path.relative(resourcePath, activeFilePath);
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
        return ctx.send({
            type: 'danger',
            message: 'Security validation failed: File must be inside the resource folder.',
        });
    }

    // Security check: editable extensions
    const ext = path.extname(activeFilePath).toLowerCase();
    if (!EDITABLE_EXTENSIONS.includes(ext)) {
        return ctx.send({
            type: 'danger',
            message: `Invalid file extension. Allowed extensions are: ${EDITABLE_EXTENSIONS.join(', ')}`,
        });
    }

    // Check if file exists
    if (!fs.existsSync(activeFilePath)) {
        return ctx.send({
            type: 'danger',
            message: `File '${file}' does not exist inside '${resourceName}'.`,
        });
    }

    // Write contents to file
    try {
        fs.writeFileSync(activeFilePath, fileData, 'utf8');
    } catch (error) {
        return ctx.send({
            type: 'danger',
            message: `Failed to write file '${file}': ${error.message}`,
        });
    }

    return ctx.send({
        type: 'success',
        message: 'File saved successfully.',
    });
}
