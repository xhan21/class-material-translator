"""Rebuild the userscripts, standalone guides and GitHub Pages entry point."""
from pathlib import Path
import runpy

root = Path(__file__).resolve().parent
for script in ('build-canva-guide.py', 'build-classroom-pdf-panel.py'):
    runpy.run_path(str(root / script), run_name='__main__')
(root / 'index.html').write_bytes((root / 'class-material-translation-guide.html').read_bytes())
print('Built index.html for GitHub Pages.')
