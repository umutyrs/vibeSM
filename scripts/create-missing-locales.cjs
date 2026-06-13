/**
 * Creates missing locale JSON files by copying en.json as a base template.
 * Run: node scripts/create-missing-locales.cjs
 */
const fs = require('fs');
const path = require('path');

const localeDir = path.resolve(__dirname, '..', 'locale');
const enJson = fs.readFileSync(path.join(localeDir, 'en.json'), 'utf-8');
const enData = JSON.parse(enJson);

const requiredLocales = [
    'ar', 'bg', 'bs', 'cs', 'da', 'de', 'el', 'en', 'es', 'et',
    'fa', 'fi', 'fr', 'hr', 'hu', 'id', 'it', 'ja', 'lt', 'lv',
    'mn', 'ne', 'nl', 'no', 'pl', 'pt', 'ro', 'ru', 'sl', 'sv',
    'th', 'tr', 'uk', 'vi', 'zh'
];

const labelMap = {
    'ar': 'Arabic',
    'bg': 'Bulgarian',
    'bs': 'Bosnian',
    'cs': 'Czech',
    'da': 'Danish',
    'el': 'Greek',
    'es': 'Spanish',
    'et': 'Estonian',
    'fa': 'Persian',
    'fi': 'Finnish',
    'fr': 'French',
    'hr': 'Croatian',
    'hu': 'Hungarian',
    'id': 'Indonesian',
    'it': 'Italian',
    'ja': 'Japanese',
    'lt': 'Lithuanian',
    'lv': 'Latvian',
    'mn': 'Mongolian',
    'ne': 'Nepali',
    'nl': 'Dutch',
    'no': 'Norwegian',
    'pl': 'Polish',
    'pt': 'Portuguese',
    'ro': 'Romanian',
    'ru': 'Russian',
    'sl': 'Slovenian',
    'sv': 'Swedish',
    'th': 'Thai',
    'tr': 'Turkish',
    'uk': 'Ukrainian',
    'vi': 'Vietnamese',
    'zh': 'Chinese'
};

let created = 0;
for (const code of requiredLocales) {
    const filePath = path.join(localeDir, `${code}.json`);
    if (fs.existsSync(filePath)) {
        continue; // already exists
    }
    
    // Create from en.json template with updated label
    const data = JSON.parse(JSON.stringify(enData));
    data.$meta.label = labelMap[code] || code;
    data.$meta.humanizer_language = code;
    
    fs.writeFileSync(filePath, JSON.stringify(data, null, 4) + '\n', 'utf-8');
    created++;
    console.log(`Created: ${code}.json`);
}

console.log(`\nCreated ${created} missing locale files.`);
