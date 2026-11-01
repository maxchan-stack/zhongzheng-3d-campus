# -*- coding: utf-8 -*-
import subprocess
import os

chrome_path = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
shots = [
    ('shot_track.png', 'file:///Users/maxchan/Desktop/3D/index.html#test=track'),
    ('shot_courts.png', 'file:///Users/maxchan/Desktop/3D/index.html#test=courts')
]

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
        '--user-data-dir=/tmp/chrome_ud_verify',
        '--window-size=1280,800',
        '--virtual-time-budget=4000',
        '--run-all-compositor-stages-before-draw',
        f'--screenshot={out_path}',
        url
    ]
    res = subprocess.run(cmd, capture_output=True, timeout=20)
    sz = os.path.getsize(out_path) if os.path.exists(out_path) else 0
    print(f"Captured {filename}: exists={os.path.exists(out_path)}, size={sz}")
