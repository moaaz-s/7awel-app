#!/usr/bin/env node
const fs = require('fs');
const glob = require('glob');
const path = require('node:path');

// Configuration
const translationFilePath = path.resolve(__dirname, '../locales/en.ts');
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

async function findDefinedKeys() {
  const content = fs.readFileSync(translationFilePath, 'utf8');
  const translationData = parseTranslationObject(content);
  if (!translationData) {
    console.error(`Could not parse translation file: ${translationFilePath}`);
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

(async () => {
  console.log(`Reading defined translation keys from: ${translationFilePath}`);
  const definedKeys = await findDefinedKeys();
  console.log(`Found ${definedKeys.size} defined translation keys.`);

  console.log('Scanning source for used translation keys...');
  const usedKeys = await findUsedKeys();
  console.log(`Found ${usedKeys.size} used translation keys.`);

  const missing = [...usedKeys].filter(key => !definedKeys.has(key));
  if (missing.length) {
    console.log('\n--- Missing Translation Keys ---');
    missing.forEach(k => console.log(k));
    console.log('\nPlease add these keys to your locale files.');
    process.exit(1);
  } else {
    console.log('\nAll used translation keys are defined in locales.');
    process.exit(0);
  }
})();
