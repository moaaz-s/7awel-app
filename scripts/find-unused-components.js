const fs = require('fs').promises;
const path = require('path');

const COMPONENTS_DIR = path.resolve(__dirname, '../components');
const PROJECT_ROOT = path.resolve(__dirname, '..'); // Assumes script is in e:\crypto wallet\scripts

const IGNORE_DIRS_FOR_USAGE_SEARCH = [
    path.join(PROJECT_ROOT, 'node_modules'),
    path.join(PROJECT_ROOT, '.git'),
    path.join(PROJECT_ROOT, 'dist'),
    path.join(PROJECT_ROOT, 'build'),
    path.join(PROJECT_ROOT, 'coverage'),
    path.join(PROJECT_ROOT, 'scripts'), // Don't search in the scripts folder itself
];

const IGNORE_FILE_PATTERNS_FOR_USAGE_SEARCH = [
    /\.test\.(ts|js)x?$/,
    /\.spec\.(ts|js)x?$/,
    /__tests__\//,
    /__mocks__\//,
];

const SOURCE_FILE_EXTENSIONS = ['.tsx', '.jsx', '.ts', '.js'];
const COMPONENT_FILE_EXTENSIONS = ['.tsx', '.jsx'];

async function getAllFiles(dir, extFilter = null, ignoreDirs = []) {
    let results = [];
    try {
        const list = await fs.readdir(dir, { withFileTypes: true });
        for (const dirent of list) {
            const fullPath = path.join(dir, dirent.name);
            if (ignoreDirs.some(ignoredDir => fullPath.startsWith(ignoredDir))) {
                continue;
            }
            if (dirent.isDirectory()) {
                results = results.concat(await getAllFiles(fullPath, extFilter, ignoreDirs));
            } else {
                if (!extFilter || (extFilter && extFilter.includes(path.extname(fullPath).toLowerCase()))) {
                    results.push(fullPath);
                }
            }
        }
    } catch (error) {
        if (error.code !== 'EPERM' && error.code !== 'EACCES' && error.code !== 'ENOENT') {
            console.warn(`Warning: Could not read directory ${dir}: ${error.message}`);
        }
    }
    return results;
}

function extractExportedComponentNames(fileContent, filePath) {
    const components = new Set();

    // 1. export function ComponentName(...) / export default function ComponentName(...)
    const funcRegex = /export\s+(?:default\s+)?(?:async\s+)?function\s+([A-Z][A-Za-z0-9_]*)/g;
    let match;
    while ((match = funcRegex.exec(fileContent)) !== null) {
        components.add(match[1]);
    }

    // 2. export const ComponentName = ...
    const constRegex = /export\s+const\s+([A-Z][A-Za-z0-9_]*)\s*[:=]/g;
    while ((match = constRegex.exec(fileContent)) !== null) {
        components.add(match[1]);
    }
    
    // 3. export default ComponentName; (where ComponentName is an identifier)
    const defaultIdentRegex = /export\s+default\s+([A-Z][A-Za-z0-9_]*);/g;
    while ((match = defaultIdentRegex.exec(fileContent)) !== null) {
        const defRegex = new RegExp(`(?:const|function)\s+${match[1]}\s*[:=(]`);
        if (defRegex.test(fileContent)) {
            components.add(match[1]);
        }
    }

    // 4. export { ComponentName, Other as AliasComponent };
    const exportBlockRegex = /export\s*\{([^}]+)\}/g;
    while ((match = exportBlockRegex.exec(fileContent)) !== null) {
        const exports = match[1].split(',');
        exports.forEach(exp => {
            const trimmedExp = exp.trim();
            let nameToTest = trimmedExp;
            let originalNameInBlock = trimmedExp;

            if (trimmedExp.includes(" as ")) {
                const parts = trimmedExp.split(/\s+as\s+/);
                originalNameInBlock = parts[0].trim();
                nameToTest = parts[1].trim(); // The alias
            }

            if (/^[A-Z][A-Za-z0-9_]*$/.test(nameToTest)) {
                components.add(nameToTest); // Add the alias or the direct export name if PascalCase
            }
            // If original name was different and PascalCase, ensure it's considered if defined
            if (originalNameInBlock !== nameToTest && /^[A-Z][A-Za-z0-9_]*$/.test(originalNameInBlock)) {
                 const defRegex = new RegExp(`(?:const|function)\s+${originalNameInBlock}\s*[:=(]`);
                 if (defRegex.test(fileContent)) {
                    components.add(originalNameInBlock);
                 }
            }
        });
    }
    
    // 5. Default export of an anonymous function/arrow function/class in a PascalCase file
    const fileName = path.basename(filePath, path.extname(filePath));
    if (/^[A-Z][A-Za-z0-9_]*$/.test(fileName)) {
        if (/export\s+default\s+(?:function\s*\(|\(\s*\)\s*=>|class\b)/.test(fileContent)) {
            let isNamedDefaultExported = false;
            for (const comp of components) {
                if (new RegExp(`export\\s+default\\s+(?:function\\s+)?${comp}`).test(fileContent)) {
                    isNamedDefaultExported = true;
                    break;
                }
            }
            if (!isNamedDefaultExported) {
                 components.add(fileName); 
            }
        }
    }
    return Array.from(components);
}

async function isComponentUsed(componentName, definingFilePath, projectSourceFiles) {
    const usageRegex = new RegExp(`\\b${componentName}\\b`);
    const jsxUsageRegex = new RegExp(`<${componentName}(?:\\s|\\/|>)`);

    for (const filePath of projectSourceFiles) {
        if (path.resolve(filePath) === path.resolve(definingFilePath)) {
            continue; 
        }

        try {
            const content = await fs.readFile(filePath, 'utf-8');
            if (jsxUsageRegex.test(content) || usageRegex.test(content)) {
                return true;
            }
        } catch (err) {
            // Ignore read errors for individual files during search
        }
    }
    return false;
}


async function main() {
    console.log('Starting unused component check...');
    console.log(`Components Directory: ${COMPONENTS_DIR}`);
    console.log(`Project Root: ${PROJECT_ROOT}`);

    const componentFiles = await getAllFiles(COMPONENTS_DIR, COMPONENT_FILE_EXTENSIONS);
    console.log(`Found ${componentFiles.length} potential component files to analyze.`);

    const projectSourceFiles = (await getAllFiles(PROJECT_ROOT, SOURCE_FILE_EXTENSIONS, IGNORE_DIRS_FOR_USAGE_SEARCH))
        .filter(file => !IGNORE_FILE_PATTERNS_FOR_USAGE_SEARCH.some(pattern => pattern.test(file)));
    
    console.log(`Found ${projectSourceFiles.length} project source files to search for usage.`);

    const unusedComponents = [];
    let analyzedComponentCount = 0;
    const processedComponentsInFile = new Set(); // Track componentName@filePath to avoid double processing if extracted multiple ways

    for (const filePath of componentFiles) {
        try {
            const fileContent = await fs.readFile(filePath, 'utf-8');
            const componentNames = extractExportedComponentNames(fileContent, filePath);

            if (componentNames.length > 0) {
                analyzedComponentCount++;
            }

            for (const componentName of componentNames) {
                const uniqueCompId = `${componentName}@${filePath}`;
                if (processedComponentsInFile.has(uniqueCompId)) continue;
                processedComponentsInFile.add(uniqueCompId);
                
                const used = await isComponentUsed(componentName, filePath, projectSourceFiles);
                if (!used) {
                    unusedComponents.push({ name: componentName, path: filePath });
                }
            }
        } catch (err) {
            console.warn(`Warning: Could not process file ${filePath}: ${err.message}`);
        }
    }
    
    console.log(`\nAnalyzed ${analyzedComponentCount} files containing potential component exports.`);

    if (unusedComponents.length > 0) {
        console.log('\nFound potential unused components:');
        unusedComponents.forEach(comp => {
            console.log(`- Component Name: ${comp.name}, Path: ${path.relative(PROJECT_ROOT, comp.path)}`);
        });
    } else {
        console.log('\nNo potentially unused components found (based on current heuristics).');
    }

    console.log(`\nNote: This script uses heuristics (regular expressions) to detect components and their usage.
It might produce false positives or false negatives. For 100% accuracy, an AST-based analysis tool is recommended.
Review the list carefully before deleting any code.`);
}

main().catch(err => {
    console.error('Error running script:', err);
});
