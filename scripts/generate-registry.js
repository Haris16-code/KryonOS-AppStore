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
 * Strips any trailing line breaks (\r or \n) at the end of the file,
 * normalizes CRLF to LF, writes the clean file back if needed,
 * and returns the exact SHA-256 hex digest.
 */
function cleanAndHashFile(filePath) {
    if (!fs.existsSync(filePath)) {
        return '';
    }

    const rawContent = fs.readFileSync(filePath, 'utf8');
    // Normalize CRLF -> LF and remove trailing line breaks at EOF
    const cleanedContent = rawContent.replace(/\r\n/g, '\n').replace(/[\r\n]+$/, '');

    // If the file had a trailing newline or CRLF, overwrite it so the repo file matches the hash
    if (rawContent !== cleanedContent) {
        fs.writeFileSync(filePath, cleanedContent, 'utf8');
    }

    return crypto.createHash('sha256').update(Buffer.from(cleanedContent, 'utf8')).digest('hex');
}

if (fs.existsSync(categoriesDir)) {
    const categories = fs.readdirSync(categoriesDir).filter(f =>
        fs.statSync(path.join(categoriesDir, f)).isDirectory()
    );

    for (const category of categories) {
        const categoryPath = path.join(categoriesDir, category);
        const categoryIndexPath = path.join(categoryPath, 'index.json');

        // Load existing category index.json to preserve custom fields (e.g., "api": 1)
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

                    // Build the raw GitHub URLs
                    const metaRawUrl = `${BASE_RAW_URL}/categories/${category}/${appDir}/app.json`;
                    const appRawUrl = `${BASE_RAW_URL}/categories/${category}/${appDir}/main.js`;

                    // Update metaUrl in app.json and write without trailing newline
                    appJson.metaUrl = metaRawUrl;
                    fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2), 'utf8');

                    // Clean trailing newlines and compute SHA-256 for both app.json and main.js
                    const metaSha256 = cleanAndHashFile(appJsonPath);
                    const appSha256 = cleanAndHashFile(mainJsPath);

                    // Preserve any existing extra properties (like "api": 1)
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
                    console.error(`Error parsing ${appJsonPath}:`, error);
                }
            }
        }

        fs.writeFileSync(categoryIndexPath, JSON.stringify(categoryApps, null, 2), 'utf8');
        const categoryTitle = formatCategoryName(category);
        rootRegistry.categories[categoryTitle] = `${BASE_RAW_URL}/categories/${category}/index.json`;
    }
}

fs.writeFileSync(rootIndexPath, JSON.stringify(rootRegistry, null, 2), 'utf8');
console.log('KryonOS App Store registry, app.json, main.js, and SHA-256 hashes successfully updated.');
