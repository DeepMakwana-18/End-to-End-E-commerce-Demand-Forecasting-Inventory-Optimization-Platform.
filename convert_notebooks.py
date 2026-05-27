import os
import json
import glob

notebooks_dir = "notebook"
notebook_files = glob.glob(os.path.join(notebooks_dir, "*.ipynb"))

for nb_file in notebook_files:
    py_file = nb_file.replace(".ipynb", ".py")
    print(f"Converting {nb_file} to {py_file}...")
    
    with open(nb_file, 'r', encoding='utf-8') as f:
        nb_data = json.load(f)
        
    py_lines = []
    
    for cell in nb_data.get('cells', []):
        if cell.get('cell_type') == 'code':
            source = cell.get('source', [])
            for line in source:
                # Comment out problematic plotting/display commands to prevent crashes
                if 'plt.show(' in line or 'display(' in line or line.strip() == 'df.head()' or 'sns.' in line:
                    py_lines.append("# [CONVERSION AUTO-COMMENTED] " + line)
                elif line.startswith('!'):
                    # Shell commands inside notebook
                    py_lines.append("# [CONVERSION AUTO-COMMENTED SHELL] " + line)
                elif line.startswith('%'):
                    # Magic commands
                    py_lines.append("# [CONVERSION AUTO-COMMENTED MAGIC] " + line)
                else:
                    py_lines.append(line)
            py_lines.append('\n\n')
            
    with open(py_file, 'w', encoding='utf-8') as f:
        f.writelines(py_lines)

print("Conversion complete!")
