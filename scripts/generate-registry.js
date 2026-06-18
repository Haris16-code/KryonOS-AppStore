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

// Helper to format folder names into readable category names (e.g., "advanced_file_manager" -> "Advanced File Manager")
function formatCategoryName(folderName) {
    return folderName
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

if (fs.existsSync(categoriesDir)) {
    // Get all folders inside /categories
    const categories = fs.readdirSync(categoriesDir).filter(f => fs.statSync(path.join(categoriesDir, f)).isDirectory());

    for (const category of categories) {
        const categoryPath = path.join(categoriesDir, category);
        const categoryApps = { apps: {} };
        
        // Get all app folders inside the current category
        const apps = fs.readdirSync(categoryPath).filter(f => fs.statSync(path.join(categoryPath, f)).isDirectory());

        for (const appDir of apps) {
            const appPath = path.join(categoryPath, appDir);
            const appJsonPath = path.join(appPath, 'app.json');

            // Only register if app.json exists
            if (fs.existsSync(appJsonPath)) {
                try {
                    const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
                    const appName = appJson.name; // Extract name from app.json

                    // Build the raw GitHub URLs
                    categoryApps.apps[appName] = {
                        meta: `${BASE_RAW_URL}/categories/${category}/${appDir}/app.json`,
                        app: `${BASE_RAW_URL}/categories/${category}/${appDir}/main.js`
                    };
                } catch (error) {
                    console.error(`Error parsing ${appJsonPath}:`, error);
                }
            }
        }

        // Write the category's specific index.json
        fs.writeFileSync(path.join(categoryPath, 'index.json'), JSON.stringify(categoryApps, null, 2));

        // Register the category in the root index.json
        const categoryTitle = formatCategoryName(category);
        rootRegistry.categories[categoryTitle] = `${BASE_RAW_URL}/categories/${category}/index.json`;
    }
}

// Write the root index.json
fs.writeFileSync(rootIndexPath, JSON.stringify(rootRegistry, null, 2));
console.log('KryonOS App Store registry successfully updated.');
