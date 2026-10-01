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
 * Calculates the exact lowercase hex SHA-256 hash of a file's raw bytes.
 */
function calculateFileSha256(filePath) {
    if (!fs.existsSync(filePath)) {
        return '';
    }
    const fileBuffer = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(fileBuffer).digest('hex');
}

if (fs.existsSync(categoriesDir)) {
    const categories = fs.readdirSync(categoriesDir).filter(f =>
        fs.statSync(path.join(categoriesDir, f)).isDirectory()
    );

    for (const category of categories) {
        const categoryPath = path.join(categoriesDir, category);
        const categoryIndexPath = path.join(categoryPath, 'index.json');

        // Load existing category index.json if present to preserve any extra keys (e.g., "api": 1)
        let existingCategoryData = { apps: {} };
        if (fs.existsSync(categoryIndexPath)) {
            try {
                existingCategoryData = JSON.parse(fs.readFileSync(categoryIndexPath, 'utf8'));
                if (!existingCategoryData.apps || typeof existingCategoryData.apps !== 'object') {
                    existingCategoryData.apps = {};
                }
            } catch (err) {
                console.warn(`Could not parse existing ${categoryIndexPath}, rebuilding fresh.`);
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

                    // Build the raw GitHub URLs
                    const metaRawUrl = `${BASE_RAW_URL}/categories/${category}/${appDir}/app.json`;
                    const appRawUrl = `${BASE_RAW_URL}/categories/${category}/${appDir}/main.js`;

                    // 1. Update app.json first if metaUrl changed (so the hash reflects the final file)
                    if (appJson.metaUrl !== metaRawUrl) {
                        appJson.metaUrl = metaRawUrl;
                        fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2));
                        console.log(`Updated metaUrl inside ${category}/${appDir}/app.json`);
                    }

                    // 2. Calculate SHA-256 hashes for both app.json and main.js
                    const metaSha256 = calculateFileSha256(appJsonPath);
                    const appSha256 = calculateFileSha256(mainJsPath);

                    if (!appSha256) {
                        console.warn(`Warning: main.js missing in ${category}/${appDir}`);
                    }

                    // 3. Preserve any existing fields (such as "api") on this app entry
                    const previousEntry = existingCategoryData.apps[appName] || {};

                    const updatedEntry = {
                        ...previousEntry,
                        meta: metaRawUrl,
                        meta_sha256: metaSha256,
                        app: appRawUrl,
                        app_sha256: appSha256
                    };

                    // If app.json defines an "api" field and it wasn't set yet, preserve it
                    if (appJson.api !== undefined && updatedEntry.api === undefined) {
                        updatedEntry.api = appJson.api;
                    }

                    categoryApps.apps[appName] = updatedEntry;
                } catch (error) {
                    console.error(`Error parsing ${appJsonPath}:`, error);
                }
            }
        }

        fs.writeFileSync(categoryIndexPath, JSON.stringify(categoryApps, null, 2));
        const categoryTitle = formatCategoryName(category);
        rootRegistry.categories[categoryTitle] = `${BASE_RAW_URL}/categories/${category}/index.json`;
    }
}

fs.writeFileSync(rootIndexPath, JSON.stringify(rootRegistry, null, 2));
console.log('KryonOS App Store registry, app.json files, and SHA-256 hashes successfully updated.');
