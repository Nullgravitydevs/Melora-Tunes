const fs = require('fs');
const path = require('path');

const DIRECTORIES = [
    path.join(__dirname, 'components'),
    path.join(__dirname, 'app')
];

// Define what belongs to what hook
const UI_PROPS = new Set(['showToast', 'toast']);
const LIBRARY_PROPS = new Set([
    'mixes', 'setMixes', 'addMix', 'updateMix', 'deleteMix', 'undoDeleteMix', 'deletedMixBackup', 'addSongToMix',
    'likedSongs', 'toggleLike', 'isLiked', 'recentlyPlayed',
    'savedAlbums', 'savedArtists', 'toggleSaveAlbum', 'toggleFollowArtist', 'isAlbumSaved', 'isArtistFollowed',
    'downloadSong', 'removeDownload', 'isDownloaded'
]);

// Helper to find all TSX files
function findFiles(dir, files = []) {
    if (!fs.existsSync(dir)) return files;
    const list = fs.readdirSync(dir);
    for (const file of list) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            findFiles(fullPath, files);
        } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
            files.push(fullPath);
        }
    }
    return files;
}

const allFiles = DIRECTORIES.flatMap(dir => findFiles(dir));

allFiles.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');

    // Only process files that use usePlayback
    if (!content.includes('usePlayback()')) return;

    // Detect if we actually need to change imports
    let needsUI = false;
    let needsLibrary = false;
    let needsPlayback = false;

    // We'll replace the line:
    // const { currentSong, isPlaying, mixes, showToast ... } = usePlayback();
    // with:
    // const { currentSong, isPlaying ... } = usePlayback();
    // const { mixes ... } = useLibrary();
    // const { showToast ... } = useUI();

    // Regex to match the destructuring block
    // Works with multi-line destructuring
    const destructureRegex = /const\s+\{([^}]+)\}\s*=\s*usePlayback\(\);?/g;

    let modified = false;

    content = content.replace(destructureRegex, (match, innerProps) => {
        const props = innerProps.split(',').map(p => p.trim()).filter(p => p);

        const uiProps = [];
        const libProps = [];
        const pbProps = [];

        props.forEach(p => {
            // Check for aliases like `mixes: myMixes`
            const baseProp = p.split(':')[0].trim();
            if (UI_PROPS.has(baseProp)) {
                uiProps.push(p);
                needsUI = true;
            } else if (LIBRARY_PROPS.has(baseProp)) {
                libProps.push(p);
                needsLibrary = true;
            } else {
                pbProps.push(p);
                needsPlayback = true;
            }
        });

        let replacement = '';
        if (pbProps.length > 0) {
            replacement += `const { ${pbProps.join(', ')} } = usePlayback();\n`;
        }
        if (libProps.length > 0) {
            replacement += `    const { ${libProps.join(', ')} } = useLibrary();\n`;
        }
        if (uiProps.length > 0) {
            replacement += `    const { ${uiProps.join(', ')} } = useUI();\n`;
        }

        modified = true;
        return replacement.trim();
    });

    if (modified) {
        // Fix imports
        if (needsLibrary || needsUI) {
            const importRegex = /import\s+\{[^}]*usePlayback[^}]*\}\s+from\s+["']@\/components\/providers\/playback-context["'];?/;
            const existingImport = content.match(importRegex);

            if (existingImport) {
                const hooksToImport = [];
                if (needsPlayback) hooksToImport.push('usePlayback');
                if (needsLibrary) hooksToImport.push('useLibrary');
                if (needsUI) hooksToImport.push('useUI');

                content = content.replace(importRegex, `import { ${hooksToImport.join(', ')} } from "@/components/providers/playback-context";`);
            }
        }

        fs.writeFileSync(file, content, 'utf8');
        console.log(`Refactored: ${file}`);
    }
});

console.log("Context destructuring refactor complete.");
