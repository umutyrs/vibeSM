const modulename = 'WebServer:FileEditorGet';
import fs from 'node:fs';
import path from 'node:path';
import consoleFactory from '@lib/console';
const console = consoleFactory(modulename);

const EDITABLE_EXTENSIONS = ['.lua', '.js', '.ts', '.json', '.cfg', '.txt', '.ini', '.html', '.css', '.yml', '.yaml'];

// Recursively scans a directory for editable files, ignoring node_modules and git
function scanDirectory(dir, fileList = [], rootDir = dir) {
    let files;
    try {
        files = fs.readdirSync(dir, { withFileTypes: true });
    } catch (e) {
        return fileList;
    }

    for (const file of files) {
        const fullPath = path.join(dir, file.name);
        const relPath = path.relative(rootDir, fullPath).replace(/\\/g, '/');

        if (file.isDirectory()) {
            if (file.name === 'node_modules' || file.name === '.git') continue;
            scanDirectory(fullPath, fileList, rootDir);
        } else if (file.isFile()) {
            const ext = path.extname(file.name).toLowerCase();
            if (EDITABLE_EXTENSIONS.includes(ext)) {
                fileList.push(relPath);
            }
        }
    }
    return fileList;
}

/**
 * Renders the File Editor page for a given resource
 */
export default async function FileEditorGet(ctx) {
    // Check permission
    if (!ctx.admin.hasPermission('resources.file_editor')) {
        return ctx.utils.render('main/message', { message: 'You don\'t have permission to view this page.' });
    }

    const resourceName = ctx.query.resource;
    if (!resourceName || typeof resourceName !== 'string') {
        return ctx.utils.render('main/message', { message: 'No resource specified.' });
    }

    // Resolve resource from active fxResources
    if (!vibeCore.fxResources || !vibeCore.fxResources.resourceReport || !Array.isArray(vibeCore.fxResources.resourceReport.resources)) {
        return ctx.utils.render('main/message', { message: 'Resource list is currently unavailable. Ensure FXServer is running.' });
    }

    const resource = vibeCore.fxResources.resourceReport.resources.find(
        (r) => r.name.toLowerCase() === resourceName.toLowerCase()
    );

    if (!resource || !resource.path) {
        return ctx.utils.render('main/message', { message: `Resource '${resourceName}' not found or has no active path.` });
    }

    const resourcePath = path.normalize(resource.path);
    if (!fs.existsSync(resourcePath)) {
        return ctx.utils.render('main/message', { message: `Resource folder path '${resourcePath}' does not exist on disk.` });
    }

    // Scan for editable files
    const fileList = scanDirectory(resourcePath).sort();
    if (!fileList.length) {
        return ctx.utils.render('main/message', { message: `No editable files found inside the '${resourceName}' resource folder.` });
    }

    // Determine active file to edit
    let activeFile = ctx.query.file;
    if (!activeFile || typeof activeFile !== 'string' || !fileList.includes(activeFile)) {
        // Try to default to manifest files, otherwise first file
        activeFile = fileList.find(f => f === 'fxmanifest.lua' || f === '__resource.lua') || fileList[0];
    }

    // Read the active file contents
    const activeFilePath = path.join(resourcePath, activeFile);
    let rawFile = '';
    try {
        rawFile = fs.readFileSync(activeFilePath, 'utf8');
    } catch (error) {
        return ctx.utils.render('main/message', { message: `Failed to read file '${activeFile}': ${error.message}` });
    }

    return ctx.utils.render('main/fileEditor', {
        headerTitle: `File Editor - ${resourceName}`,
        resourceName,
        fileList,
        activeFile,
        rawFile,
        disableRestart: (ctx.admin.hasPermission('control.server')) ? '' : 'disabled',
    });
}
