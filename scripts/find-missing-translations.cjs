#!/usr/bin/env node
const fs = require('fs');
const glob = require('glob');
const path = require('node:path');

// Configuration
const localeFiles = {
  en: path.resolve(__dirname, '../locales/en.ts'),
  ar: path.resolve(__dirname, '../locales/ar.ts')
};
const sourceFilesPattern = [
  'app/**/*.{ts,tsx}',
  'components/**/*.{ts,tsx}',
  'context/**/*.{ts,tsx}',
  'hooks/**/*.{ts,tsx}',
  'utils/**/*.{ts,tsx}',
  'lib/**/*.{ts,tsx}',
];
const translationFunctionNames = ['t', 'i18n.t'];

function extractKeys(obj, prefix = '') {
  const keys = new Set();
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const newPrefix = prefix ? `${prefix}.${key}` : key;
      const value = obj[key];
      if (value && typeof value === 'object') {
        extractKeys(value, newPrefix).forEach(k => keys.add(k));
      } else {
        keys.add(newPrefix);
      }
    }
  }
  return keys;
}

function parseTranslationObject(content) {
  const match = content.match(/(?:export\s+default\s*)(\{[\s\S]*\});?/) ||
                content.match(/(?:export\s+(?:const|let|var)\s+\w+\s*=\s*)(\{[\s\S]*\});?/);
  if (!match) return null;
  let objectString = match[1].replace(/;$/, '');
  objectString = objectString.replace(/,\s*\}/g, '}');
  try {
    return new Function(`return ${objectString}`)();
  } catch (e) {
    console.error('Failed to parse translation object:', e);
    process.exit(1);
  }
}

async function findDefinedKeysForLocale(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`Translation file not found: ${filePath}`);
    process.exit(1);
  }
  const content = fs.readFileSync(filePath, 'utf8');
  const translationData = parseTranslationObject(content);
  if (!translationData) {
    console.error(`Could not parse translation file: ${filePath}`);
    process.exit(1);
  }
  return extractKeys(translationData);
}

async function findUsedKeys() {
  const usedKeys = new Set();
  const funcPattern = translationFunctionNames.map(name => name.replace(/\./g, '\\.')).join('|');
  const keyRegex = new RegExp(`(?:${funcPattern})\\s*\\(\\s*(['"\`])([^'"\`]+?)\\1[^)]*\\)`, 'g');

  const files = glob.sync(sourceFilesPattern, {
    cwd: path.resolve(__dirname, '..'),
    absolute: true,
    nodir: true,
    ignore: ['**/node_modules/**', '**/.next/**', '**/locales/**', '**/scripts/**', '**/tests/**'],
  });
  files.forEach(file => {
    try {
      const content = fs.readFileSync(file, 'utf8');
      let match;
      while ((match = keyRegex.exec(content)) !== null) {
        if (match[2]) usedKeys.add(match[2]);
      }
    } catch (err) {
      console.error(`Error reading file ${file}:`, err);
    }
  });
  return usedKeys;
}

function compareLocales(enKeys, arKeys) {
  const missingInAr = [...enKeys].filter(key => !arKeys.has(key));
  const missingInEn = [...arKeys].filter(key => !enKeys.has(key));
  return { missingInAr, missingInEn };
}

(async () => {
  // Find used keys in source code
  console.log('Scanning source for used translation keys...');
  const usedKeys = await findUsedKeys();
  console.log(`Found ${usedKeys.size} used translation keys.`);

  // Check English translations
  console.log(`\nReading English translation keys from: ${localeFiles.en}`);
  const enKeys = await findDefinedKeysForLocale(localeFiles.en);
  console.log(`Found ${enKeys.size} defined English translation keys.`);

  // Check Arabic translations
  console.log(`\nReading Arabic translation keys from: ${localeFiles.ar}`);
  const arKeys = await findDefinedKeysForLocale(localeFiles.ar);
  console.log(`Found ${arKeys.size} defined Arabic translation keys.`);

  // Check for missing translations in source code
  const missingInSource = [...usedKeys].filter(key => !enKeys.has(key) && !arKeys.has(key));
  if (missingInSource.length) {
    console.log('\n--- Keys Used in Source But Missing in Both Locales ---');
    missingInSource.forEach(k => console.log(k));
  }

  // Compare locales
  const { missingInAr, missingInEn } = compareLocales(enKeys, arKeys);
  
  if (missingInAr.length) {
    console.log('\n--- Keys Missing in Arabic Translations ---');
    missingInAr.forEach(k => console.log(k));
  }

  if (missingInEn.length) {
    console.log('\n--- Keys Missing in English Translations ---');
    missingInEn.forEach(k => console.log(k));
  }

  if (missingInSource.length || missingInAr.length || missingInEn.length) {
    console.log('\nPlease add the missing translation keys to the appropriate locale files.');
    process.exit(1);
  } else {
    console.log('\nAll translations are in sync! 🎉');
    process.exit(0);
  }
})();
