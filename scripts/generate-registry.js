const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Repository Configuration
const REPO_OWNER = 'Haris16-code';
const REPO_NAME = 'KryonOS-AppStore';
const BRANCH = 'main';
const BASE_RAW_URL = `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/refs/heads/${BRANCH}`;

const categoriesDir = path.join(__dirname, '..', 'categories');
const rootIndexPath = path.join(__dirname, '..', 'index.json');

const rootRegistry = { categories: {} };

function formatCategoryName(folderName) {
    return folderName
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

/**
 * Computes SHA-256 directly from the exact raw byte buffer on disk.
 * Never modifies line endings or trailing characters.
 */
function sha256RawFile(filePath) {
    if (!fs.existsSync(filePath)) return '';
    const rawBuffer = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(rawBuffer).digest('hex');
}

/**
 * Writes JSON only if content actually changed, preserving original line endings
 * and whether the file originally ended with a newline.
 */
function writeJsonIfChanged(filePath, dataObj) {
    let hadTrailingNewline = false;
    let useCrLf = false;
    let existingRaw = null;

    if (fs.existsSync(filePath)) {
        existingRaw = fs.readFileSync(filePath, 'utf8');
        hadTrailingNewline = existingRaw.endsWith('\n');
        useCrLf = existingRaw.includes('\r\n');
    }

    let serialized = JSON.stringify(dataObj, null, 2);
    if (useCrLf) {
        serialized = serialized.replace(/\n/g, '\r\n');
    }
    if (hadTrailingNewline) {
        serialized += useCrLf ? '\r\n' : '\n';
    }

    if (existingRaw !== serialized) {
        fs.writeFileSync(filePath, Buffer.from(serialized, 'utf8'));
        return true;
    }
    return false;
}

if (fs.existsSync(categoriesDir)) {
    const categories = fs.readdirSync(categoriesDir).filter(f =>
        fs.statSync(path.join(categoriesDir, f)).isDirectory()
    );

    for (const category of categories) {
        const categoryPath = path.join(categoriesDir, category);
        const categoryIndexPath = path.join(categoryPath, 'index.json');

        let existingCategoryData = { apps: {} };
        if (fs.existsSync(categoryIndexPath)) {
            try {
                existingCategoryData = JSON.parse(fs.readFileSync(categoryIndexPath, 'utf8'));
                if (!existingCategoryData.apps || typeof existingCategoryData.apps !== 'object') {
                    existingCategoryData.apps = {};
                }
            } catch {
                existingCategoryData = { apps: {} };
            }
        }

        const categoryApps = { apps: {} };
        const apps = fs.readdirSync(categoryPath).filter(f =>
            fs.statSync(path.join(categoryPath, f)).isDirectory()
        );

        for (const appDir of apps) {
            const appPath = path.join(categoryPath, appDir);
            const appJsonPath = path.join(appPath, 'app.json');
            const mainJsPath = path.join(appPath, 'main.js');

            if (fs.existsSync(appJsonPath)) {
                try {
                    const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
                    const appName = appJson.name;

                    const metaRawUrl = `${BASE_RAW_URL}/categories/${category}/${appDir}/app.json`;
                    const appRawUrl = `${BASE_RAW_URL}/categories/${category}/${appDir}/main.js`;

                    // Only rewrite app.json if metaUrl is missing or different
                    if (appJson.metaUrl !== metaRawUrl) {
                        appJson.metaUrl = metaRawUrl;
                        writeJsonIfChanged(appJsonPath, appJson);
                        console.log(`Updated metaUrl inside ${category}/${appDir}/app.json`);
                    }

                    // Hash exact raw bytes on disk AFTER any update
                    const metaSha256 = sha256RawFile(appJsonPath);
                    const appSha256 = sha256RawFile(mainJsPath);

                    const previousEntry = existingCategoryData.apps[appName] || {};
                    const updatedEntry = {
                        ...previousEntry,
                        meta: metaRawUrl,
                        meta_sha256: metaSha256,
                        app: appRawUrl,
                        app_sha256: appSha256
                    };

                    if (appJson.api !== undefined && updatedEntry.api === undefined) {
                        updatedEntry.api = appJson.api;
                    }

                    categoryApps.apps[appName] = updatedEntry;
                } catch (error) {
                    console.error(`Error processing ${appJsonPath}:`, error);
                }
            }
        }

        writeJsonIfChanged(categoryIndexPath, categoryApps);
        const categoryTitle = formatCategoryName(category);
        rootRegistry.categories[categoryTitle] = `${BASE_RAW_URL}/categories/${category}/index.json`;
    }
}

writeJsonIfChanged(rootIndexPath, rootRegistry);
console.log('KryonOS App Store registry and SHA-256 hashes updated');
