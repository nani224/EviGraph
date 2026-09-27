import os
import sys

root_dir = os.path.dirname(os.path.abspath(__file__))
app_dir = os.path.join(root_dir, "SIH 2026", "SIH26")
backend_dir = os.path.join(app_dir, "backend")

for p in [root_dir, app_dir, backend_dir]:
    if p not in sys.path:
        sys.path.insert(0, p)

os.chdir(app_dir)

from backend.main import app
