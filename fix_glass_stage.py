
import re

file_path = r'c:\Users\justi\OneDrive\Documents\melora-tunes\components\windows\scenes\glass-stage.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix "text - sm" -> "text-sm", "border - b - 2" -> "border-b-2"
# We look for (word char) space - space (word char)
new_content = re.sub(r'(\w)\s-\s(\w)', r'\1-\2', content)

# Run it again to handle multiple hyphens like "border - b - 2" which becomes "border-b - 2" after first pass
new_content = re.sub(r'(\w)\s-\s(\w)', r'\1-\2', new_content)
new_content = re.sub(r'(\w)\s-\s(\w)', r'\1-\2', new_content)

# Fix "scale - [1.02]" -> "scale-[1.02]"
new_content = re.sub(r'scale\s-\s\[', 'scale-[', new_content)
new_content = re.sub(r'aspect\s-\s\[', 'aspect-[', new_content)

# Fix "pb - 3" -> "pb-3"
new_content = re.sub(r'(\w)\s-\s(\d)', r'\1-\2', new_content)

# Fix remaining general " - " cases in classNames if safe?
# Maybe just general space-hyphen-space removal inside quotes is safer, but harder to regex purely.

# Also fix "currentSong . album" if present (accidental spaces)
new_content = new_content.replace('currentSong . album', 'currentSong.album')
new_content = new_content.replace(':: -webkit - scrollbar', '::-webkit-scrollbar')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Cleanup complete.")
