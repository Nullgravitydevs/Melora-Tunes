
const fs = require('fs');
const path = 'components/windows/scenes/glass-stage.tsx';

try {
    let content = fs.readFileSync(path, 'utf8');

    // Fix "text - sm" -> "text-sm", "border - b - 2" -> "border-b-2"
    // Regex: letter/digit, space, hyphen, space, letter/digit
    // Run multiple times to handle chained hyphens
    content = content.replace(/(\w)\s-\s(\w)/g, '$1-$2');
    content = content.replace(/(\w)\s-\s(\w)/g, '$1-$2');
    content = content.replace(/(\w)\s-\s(\w)/g, '$1-$2');

    // Fix "scale - [1.02]" -> "scale-[1.02]"
    content = content.replace(/scale\s-\s\[/g, 'scale-[');
    content = content.replace(/aspect\s-\s\[/g, 'aspect-[');

    // Fix "pb - 3" -> "pb-3" (letter - digit)
    content = content.replace(/(\w)\s-\s(\d)/g, '$1-$2');

    // Fix ":: -webkit - scrollbar"
    content = content.replace(/::\s-webkit\s-\s/g, '::-webkit-');

    // Fix "bg - black / 40" -> "bg-black/40"
    content = content.replace(/bg\s-\sblack\s\/\s40/g, 'bg-black/40');
    // Generic fix for " / " in classes?

    // Fix "currentSong . album"
    content = content.replace(/currentSong\s\.\salbum/g, 'currentSong.album');

    fs.writeFileSync(path, content, 'utf8');
    console.log("Cleanup complete.");
} catch (err) {
    console.error("Error:", err);
}
