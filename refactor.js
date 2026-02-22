const fs = require('fs');
const path = require('path');

const directory = 'c:/Users/justi/OneDrive/Documents/melora-tunes/components';
const appDirectory = 'c:/Users/justi/OneDrive/Documents/melora-tunes/app';
const hookImport = 'import { useAudioProgress } from "@/hooks/use-audio-progress";\n';

function processDir(dirPath) {
    if (!fs.existsSync(dirPath)) return;
    const files = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const file of files) {
        const fullPath = path.join(dirPath, file.name);
        if (file.isDirectory()) {
            processDir(fullPath);
        } else if (file.name.endsWith('.tsx')) {
            let content = fs.readFileSync(fullPath, 'utf8');

            if (content.includes('usePlayback') && /\{[^\}]*\bprogress\b[^\}]*\}\s*=\s*usePlayback\(/.test(content)) {
                if (!content.includes('useAudioProgress')) {
                    const importPattern = /^import .*$/gm;
                    let lastMatch = null;
                    let match;
                    while ((match = importPattern.exec(content)) !== null) {
                        lastMatch = match;
                    }
                    if (lastMatch) {
                        const insertPos = lastMatch.index + lastMatch[0].length + 1;
                        content = content.slice(0, insertPos) + hookImport + content.slice(insertPos);
                    } else {
                        content = hookImport + content;
                    }
                }

                content = content.replace(/\{([^\}]*\bprogress\b[^\}]*)\}\s*=\s*usePlayback\(\)/g, (match, inner) => {
                    let innerNew = inner.replace(/,\s*progress\b|\bprogress\s*,?/g, '').trim();
                    if (!innerNew) {
                        return `usePlayback();\n    const { progress } = useAudioProgress()`;
                    }
                    return `{ ${innerNew} } = usePlayback();\n    const { progress } = useAudioProgress()`;
                });

                fs.writeFileSync(fullPath, content, 'utf8');
                console.log('Updated ' + file.name);
            }
        }
    }
}
processDir(directory);
processDir(appDirectory);
