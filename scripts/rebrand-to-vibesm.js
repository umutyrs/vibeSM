import fs from 'node:fs';
import path from 'node:path';

const ROOT_DIR = process.cwd();

const EXCLUDE_DIRS = new Set([
  '.git',
  '.tsc',
  'node_modules',
  'dist',
  'tmp_core_tsc',
  '.reports',
  '.husky',
  '.github'
]);

const EXCLUDE_FILES = new Set([
  'rebrand-to-vibesm.js',
  'package-lock.json',
  'LICENSE'
]);

const REPLACEMENTS = [
  // Specific cases first, then general cases
  { from: /txAdmin/g, to: 'vibeSM' },
  { from: /txadmin/g, to: 'vibesm' },
  { from: /TXADMIN/g, to: 'VIBESM' },
  { from: /txCore/g, to: 'vibeCore' },
  { from: /txcore/g, to: 'vibecore' },
  { from: /txEnv/g, to: 'vibeEnv' },
  { from: /txHostConfig/g, to: 'vibeHostConfig' },
  { from: /txConfig/g, to: 'vibeConfig' },
  { from: /txManager/g, to: 'vibeManager' },
  { from: /txaVersion/g, to: 'vibeVersion' },
  { from: /TxCoreType/g, to: 'VibeCoreType' },
  { from: /bootTxAdmin/g, to: 'bootVibeSM' },
  
  // Env vars
  { from: /TXDEV_/g, to: 'VIBEDEV_' },
  { from: /TXA_/g, to: 'VIBE_' },
  { from: /TXHOST_/g, to: 'VIBEHOST_' },
];

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      if (EXCLUDE_DIRS.has(file)) continue;
      walkDir(fullPath);
    } else {
      if (EXCLUDE_FILES.has(file)) continue;
      processFile(fullPath);
    }
  }
}

function processFile(filePath) {
  // Only process text files
  const ext = path.extname(filePath);
  const textExtensions = ['.ts', '.tsx', '.js', '.jsx', '.json', '.html', '.css', '.lua', '.md', '.cjs', '.mjs'];
  if (!textExtensions.includes(ext) && path.basename(filePath) !== 'fxmanifest.lua') {
    return;
  }

  let content;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch (err) {
    console.error(`Failed to read ${filePath}:`, err);
    return;
  }

  let newContent = content;
  let changed = false;

  for (const rep of REPLACEMENTS) {
    if (rep.from.test(newContent)) {
      newContent = newContent.replace(rep.from, rep.to);
      changed = true;
    }
  }

  if (changed) {
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log(`Rebranded references in: ${path.relative(ROOT_DIR, filePath)}`);
  }
}

console.log('Starting global rebranding to vibeSM...');
walkDir(ROOT_DIR);
console.log('Global rebranding completed!');
