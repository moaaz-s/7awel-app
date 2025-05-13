const fs = require('fs');
const glob = require('glob');
const path = require('node:path');

// --- Configuration ---
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
// --- End Configuration ---

function extractKeys(obj, prefix = '') {
  const keys = new Set();
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const newPrefix = prefix ? `${prefix}.${key}` : key;
      const value = obj[key];
      if (typeof value === 'object' && value !== null) {
        const nestedKeys = extractKeys(value, newPrefix);
        nestedKeys.forEach(k => keys.add(k));
      } else if (typeof value === 'string') {
        keys.add(newPrefix);
      }
    }
  }
  return keys;
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

  for (const file of files) {
    try {
      const content = fs.readFileSync(file, 'utf8');
      let match;
      while ((match = keyRegex.exec(content)) !== null) {
        if (match[2]) usedKeys.add(match[2]);
      }
    } catch (readErr) {
      console.error(`Error reading file ${file}:`, readErr);
    }
  }

  return usedKeys;
}

function parseTranslationObject(content) {
  const match = content.match(/(?:export\s+(?:const|let|var)\s+\w+\s*=\s*)(\{[\s\S]*\};?)/m) ||
                content.match(/(?:export\s+default\s*)(\{[\s\S]*\};?)/m);
  const objectString = match?.[1];

  if (objectString) {
    try {
      let cleanedString = objectString.replace(/,\s*\};?$/, '}').replace(/;$/, '');
      return new Function(`return ${cleanedString}`)();
    } catch (e) {
      console.error('Failed to parse translation object:', e);
      return null;
    }
  }
  return null;
}

async function run() {
  console.log(`Reading translation keys from: ${translationFilePath}`);
  let definedKeys;

  try {
    const fileContent = fs.readFileSync(translationFilePath, 'utf8');
    const translationData = parseTranslationObject(fileContent);
    if (!translationData) throw new Error('Could not parse translation object.');
    definedKeys = extractKeys(translationData);
    console.log(`Found ${definedKeys.size} defined translation keys.`);
  } catch (error) {
    console.error(`Error processing translation file ${translationFilePath}:`, error);
    return;
  }

  const usedKeys = await findUsedKeys();
  console.log(`Found ${usedKeys.size} used translation keys in source code.`);

  const unusedKeys = new Set([...definedKeys].filter(x => !usedKeys.has(x)));

  if (unusedKeys.size > 0) {
    console.log('\n--- Unused Translation Keys ---');
    const parents = new Map();
    definedKeys.forEach(key => {
      const prefix = key.split('.')[0];
      if (!parents.has(prefix)) parents.set(prefix, []);
      parents.get(prefix).push(key);
    });
    for (const [prefix, keys] of parents.entries()) {
      const unusedInGroup = keys.filter(k => unusedKeys.has(k));
      if (unusedInGroup.length === 0) continue;
      if (unusedInGroup.length === keys.length) {
        console.log(`${prefix} - all keys under this prefix are unused`);
      } else {
        unusedInGroup.forEach(k => console.log(k));
      }
    }
    console.log('\nNote: Review carefully before removing keys.');
  } else {
    console.log('\nAll defined translation keys are used in the codebase.');
  }
}

run().catch(error => console.error('An unexpected error occurred:', error));