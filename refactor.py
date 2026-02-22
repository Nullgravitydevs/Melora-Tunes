import os
import re

directory = 'c:/Users/justi/OneDrive/Documents/melora-tunes/components'
app_directory = 'c:/Users/justi/OneDrive/Documents/melora-tunes/app'
hook_import = 'import { useAudioProgress } from "@/hooks/use-audio-progress";\n'

def process_dir(dir_path):
    for root, _, files in os.walk(dir_path):
        for file in files:
            if file.endswith('.tsx'):
                path = os.path.join(root, file)
                with open(path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # If uses usePlayback and extracts progress
                if 'usePlayback' in content and re.search(r'\{[^\}]*\bprogress\b[^\}]*\}\s*=\s*usePlayback\(\)', content):
                    # Add import if missing
                    if 'useAudioProgress' not in content:
                        imports = list(re.finditer(r'^import .*$', content, re.MULTILINE))
                        if imports:
                            last_import = imports[-1]
                            insert_pos = last_import.end() + 1
                            content = content[:insert_pos] + hook_import + content[insert_pos:]
                        else:
                            content = hook_import + content
                    
                    # Replace the destructuring to remove progress
                    def repl(m):
                        inner = m.group(1)
                        # remove 'progress' and possible commas
                        inner_new = re.sub(r',\s*progress\b|\bprogress\s*,?', '', inner).strip()
                        if not inner_new:
                            return f'usePlayback();\n    const {{ progress }} = useAudioProgress();'
                        return f'{{ {inner_new} }} = usePlayback();\n    const {{ progress }} = useAudioProgress();'
                        
                    content = re.sub(r'\{([^\}]*\bprogress\b[^\}]*)\}\s*=\s*usePlayback\(\);?', repl, content)
                    
                    with open(path, 'w', encoding='utf-8') as f:
                        f.write(content)
                    print(f'Updated {file}')

process_dir(directory)
process_dir(app_directory)
