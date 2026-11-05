# -*- coding: utf-8 -*-
import subprocess
import os
import shutil

chrome_path = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
shots = [
    ('shot_breezeway_walk.png', 'file:///Users/maxchan/Desktop/3D/index.html#test=corridor_1f'),
    ('shot_breezeway_inside.png', 'file:///Users/maxchan/Desktop/3D/index.html#test=breezeway_inside'),
    ('shot_rain_overview.png', 'file:///Users/maxchan/Desktop/3D/index.html#test=rain'),
    ('shot_rain_walk.png', 'file:///Users/maxchan/Desktop/3D/index.html#test=rain_walk')
]

artifact_dir = '/Users/maxchan/.gemini/antigravity/brain/db9c81b8-e1ff-4bc6-b004-1c021af44fab'

for filename, url in shots:
    out_path = f'/tmp/{filename}'
    if os.path.exists(out_path):
        os.remove(out_path)
    cmd = [
        chrome_path,
        '--headless=new',
        '--disable-gpu',
        '--no-sandbox',
        '--allow-file-access-from-files',
        '--user-data-dir=/tmp/chrome_ud_phase1',
        '--window-size=1280,800',
        '--virtual-time-budget=5000',
        '--run-all-compositor-stages-before-draw',
        f'--screenshot={out_path}',
        url
    ]
    res = subprocess.run(cmd, capture_output=True, timeout=25)
    sz = os.path.getsize(out_path) if os.path.exists(out_path) else 0
    print(f"Captured {filename}: exists={os.path.exists(out_path)}, size={sz}")
    if os.path.exists(out_path) and sz > 0:
        target_dest = os.path.join(artifact_dir, filename)
        shutil.copyfile(out_path, target_dest)
        print(f"Copied {filename} to {target_dest}")

