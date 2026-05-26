import os
import glob

for filepath in glob.glob("frontend/src/**/*.tsx", recursive=True):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    content = content.replace('<h1 className="text-2xl font-bold text-white', '<h1 className="text-2xl font-bold text-surface-50')
    content = content.replace('<h2 className="text-lg font-semibold text-white', '<h2 className="text-lg font-semibold text-surface-50')
    content = content.replace('<h3 className="text-lg font-semibold text-white', '<h3 className="text-lg font-semibold text-surface-50')
    content = content.replace('<p className="text-xl font-bold text-white', '<p className="text-xl font-bold text-surface-50')
    content = content.replace('<p className="text-2xl font-bold text-white', '<p className="text-2xl font-bold text-surface-50')
    content = content.replace('text-sm font-bold text-white', 'text-sm font-bold text-surface-50')
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
