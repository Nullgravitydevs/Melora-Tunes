const fs = require('fs');
const path = require('path');

const DIRECTORIES = [
    path.join(__dirname, 'components'),
    path.join(__dirname, 'app')
];

function findFiles(dir, files = []) {
    if (!fs.existsSync(dir)) return files;
    const list = fs.readdirSync(dir);
    for (const file of list) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            findFiles(fullPath, files);
        } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
            files.push(fullPath);
        }
    }
    return files;
}

const allFiles = findFiles(DIRECTORIES[0]).concat(findFiles(DIRECTORIES[1]));

allFiles.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');

    // Quick heuristic: if Mix or PlaybackState is in the file but not imported, 
    // AND the file imports from playback-context, we should probably add it.

    // We only touch files that import usePlayback, useLibrary, or useUI from playback-context
    const contextImportRegex = /import\s+\{([^}]*(?:usePlayback|useLibrary|useUI)[^}]*)\}\s+from\s+["']@\/components\/providers\/playback-context["'];?/;

    if (contextImportRegex.test(content)) {
        const usesMix = /\bMix\b/.test(content);
        const usesPlaybackState = /\bPlaybackState\b/.test(content);

        const hasMixImport = /import\s+\{[^}]*\bMix\b[^}]*\}\s+from/.test(content);
        const hasStateImport = /import\s+\{[^}]*\bPlaybackState\b[^}]*\}\s+from/.test(content);

        let missing = [];
        if (usesMix && !hasMixImport) missing.push('Mix');
        if (usesPlaybackState && !hasStateImport) missing.push('PlaybackState');

        if (missing.length > 0) {
            content = content.replace(contextImportRegex, (match, existingHooks) => {
                const hooks = existingHooks.split(',').map(s => s.trim()).filter(Boolean);
                missing.forEach(m => {
                    if (!hooks.includes(m)) hooks.push(m);
                });
                return `import { ${hooks.join(', ')} } from "@/components/providers/playback-context";`;
            });
            fs.writeFileSync(file, content, 'utf8');
            console.log(`Fixed imports in: ${file}`);
        }
    }
});
