const fs = require('fs');
const path = require('node:path');
const glob = require('glob');

const sourcePatterns = [
  'app/**/*.{ts,tsx}',
  'components/**/*.{ts,tsx}',
  'context/**/*.{ts,tsx}',
  'hooks/**/*.{ts,tsx}',
  'utils/**/*.{ts,tsx}',
  'lib/**/*.{ts,tsx}',
];

function collectSourceFiles() {
  const set = new Set();
  for (const pattern of sourcePatterns) {
    glob.sync(pattern, {
      cwd: path.resolve(__dirname, '..'),
      absolute: true,
      nodir: true,
      ignore: ['**/node_modules/**', '**/.next/**', '**/locales/**', '**/scripts/**', '**/tests/**'],
    }).forEach(f => set.add(f));
  }
  return Array.from(set);
}

function findStaticErrorMessages(file) {
  const content = fs.readFileSync(file, 'utf8');
  const throwRegex = /throw\s+new\s+Error\s*\(\s*(['"`])([^'"`]+?)\1/g;
  const errors = [];
  let match;
  while ((match = throwRegex.exec(content)) !== null) {
    const lineNumber = content.slice(0, match.index).split('\n').length;
    errors.push({
      file,
      line: lineNumber,
      message: match[2].trim()
    });
  }
  return errors;
}

async function run() {
  const files = collectSourceFiles();
  const staticErrors = [];

  for (const file of files) {
    staticErrors.push(...findStaticErrorMessages(file));
  }

  console.log('--- Static Error Messages ---');
  if (staticErrors.length) {
    staticErrors.forEach(e => console.log(`${e.file}:${e.line} -> ${e.message}`));
  } else {
    console.log('No static error messages found.');
  }
}

run().catch(error => console.error('An unexpected error occurred:', error));
