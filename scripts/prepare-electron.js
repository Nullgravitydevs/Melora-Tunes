/**
 * Prepare the Next.js standalone build for Electron packaging.
 * Copies static assets and public folder into the standalone directory
 * so the embedded server can serve them.
 * 
 * Run after: cross-env IS_ELECTRON_BUILD=true next build
 * Run before: electron-builder
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const STANDALONE = path.join(ROOT, '.next', 'standalone');
const STATIC_SRC = path.join(ROOT, '.next', 'static');
const STATIC_DEST = path.join(STANDALONE, '.next', 'static');
const PUBLIC_SRC = path.join(ROOT, 'public');
const PUBLIC_DEST = path.join(STANDALONE, 'public');

function copyDirSync(src, dest) {
    if (!fs.existsSync(src)) {
        console.warn(`  ⚠ Source not found: ${src}`);
        return 0;
    }
    fs.mkdirSync(dest, { recursive: true });
    let count = 0;
    const entries = fs.readdirSync(src, { withFileTypes: true });
    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        if (entry.isDirectory()) {
            count += copyDirSync(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
            count++;
        }
    }
    return count;
}

console.log('Preparing Electron build...\n');

// 1. Copy .next/static into standalone/.next/static
console.log('Copying .next/static → standalone/.next/static');
const staticCount = copyDirSync(STATIC_SRC, STATIC_DEST);
console.log(`  ✓ ${staticCount} files copied\n`);

// 2. Copy public into standalone/public
console.log('Copying public → standalone/public');
const publicCount = copyDirSync(PUBLIC_SRC, PUBLIC_DEST);
console.log(`  ✓ ${publicCount} files copied\n`);

// 3. Verify server.js exists
const serverJs = path.join(STANDALONE, 'server.js');
if (fs.existsSync(serverJs)) {
    console.log('✅ standalone/server.js found — ready for packaging!');
} else {
    console.error('❌ standalone/server.js NOT FOUND — build may have failed');
    process.exit(1);
}

console.log('\nElectron build preparation complete.');
