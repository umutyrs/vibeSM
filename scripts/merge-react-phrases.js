import fs from 'node:fs';
import path from 'node:path';

// Read locale/en.json
const enPath = './locale/en.json';
const enData = JSON.parse(fs.readFileSync(enPath, 'utf8'));

// Read panel/src/hooks/translator.ts
const translatorPath = './panel/src/hooks/translator.ts';
const translatorContent = fs.readFileSync(translatorPath, 'utf8');

// Regex parser to extract keys and values from reactDefaultPhrases
// Format: "key": "value"
const phraseRegex = /"((?:web|nui_menu|nui_warning)\.[^"]+)"\s*:\s*(?:"([^"\\]*(?:\\.[^"\\]*)*)"|'([^'\\]*(?:\\.[^'\\]*)*)'|`([^`\\]*(?:\\.[^`\\]*)*)`)/g;
let match;
const flatPhrases = {};

while ((match = phraseRegex.exec(translatorContent)) !== null) {
    const key = match[1];
    let val = match[2] || match[3] || match[4] || "";
    // Unescape quotes if needed
    val = val.replace(/\\"/g, '"');
    flatPhrases[key] = val;
}

console.log(`Parsed ${Object.keys(flatPhrases).length} flat phrases from translator.ts`);

// Function to set nested property in object
const setNested = (obj, path, value) => {
    const parts = path.split('.');
    let cur = obj;
    for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (i === parts.length - 1) {
            cur[part] = value;
        } else {
            if (!cur[part]) cur[part] = {};
            cur = cur[part];
        }
    }
};

// Merge flatPhrases into enData
for (const [key, val] of Object.entries(flatPhrases)) {
    setNested(enData, key, val);
}

// Write back to locale/en.json
fs.writeFileSync(enPath, JSON.stringify(enData, null, 4) + '\n');
console.log('Successfully merged all reactDefaultPhrases into locale/en.json!');
