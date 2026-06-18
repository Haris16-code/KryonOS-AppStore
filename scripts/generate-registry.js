const fs = require('fs');
const path = require('path');

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

if (fs.existsSync(categoriesDir)) {
    const categories = fs.readdirSync(categoriesDir).filter(f => fs.statSync(path.join(categoriesDir, f)).isDirectory());

    for (const category of categories) {
        const categoryPath = path.join(categoriesDir, category);
        const categoryApps = { apps: {} };
        
        const apps = fs.readdirSync(categoryPath).filter(f => fs.statSync(path.join(categoryPath, f)).isDirectory());

        for (const appDir of apps) {
            const appPath = path.join(categoryPath, appDir);
            const appJsonPath = path.join(appPath, 'app.json');

            if (fs.existsSync(appJsonPath)) {
                try {
                    const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
                    const appName = appJson.name; 

                    // Build the raw GitHub URLs
                    const metaRawUrl = `${BASE_RAW_URL}/categories/${category}/${appDir}/app.json`;
                    const appRawUrl = `${BASE_RAW_URL}/categories/${category}/${appDir}/main.js`;

                    // --- NEW FEATURE: Update the app.json file itself ---
                    if (appJson.metaUrl !== metaRawUrl) {
                        appJson.metaUrl = metaRawUrl;
                        // Write the updated JSON back to the app's folder
                        fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2));
                        console.log(`Updated metaUrl inside ${category}/${appDir}/app.json`);
                    }
                    // ----------------------------------------------------

                    categoryApps.apps[appName] = {
                        meta: metaRawUrl,
                        app: appRawUrl
                    };
                } catch (error) {
                    console.error(`Error parsing ${appJsonPath}:`, error);
                }
            }
        }

        fs.writeFileSync(path.join(categoryPath, 'index.json'), JSON.stringify(categoryApps, null, 2));
        const categoryTitle = formatCategoryName(category);
        rootRegistry.categories[categoryTitle] = `${BASE_RAW_URL}/categories/${category}/index.json`;
    }
}

fs.writeFileSync(rootIndexPath, JSON.stringify(rootRegistry, null, 2));
console.log('KryonOS App Store registry and app.json files successfully updated.');
