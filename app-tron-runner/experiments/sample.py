#!/usr/bin/env python3
"""Every N seconds append (elapsed_min, ts_errors, failing_tests, tests_total) to <csv>. Usage: sample.py CSV [interval_s] [duration_s]"""
import re, subprocess, sys, time, os
csv, iv, dur = sys.argv[1], int(sys.argv[2]) if len(sys.argv) > 2 else 300, int(sys.argv[3]) if len(sys.argv) > 3 else 1800
cwd = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "client")
t0 = time.time(); open(csv, "w").write("elapsed_min,ts_errors,tests_failed,tests_passed\n")
while True:
    b = subprocess.run("npx tsc -b 2>&1 | grep -c 'error TS'", shell=True, cwd=cwd, capture_output=True, text=True).stdout.strip() or "0"
    t = subprocess.run("npx vitest run 2>&1", shell=True, cwd=cwd, capture_output=True, text=True).stdout
    f = re.search(r"(\d+) failed", t); p = re.search(r"(\d+) passed", t)
    open(csv, "a").write(f"{(time.time()-t0)/60:.1f},{b},{f.group(1) if f else 0},{p.group(1) if p else 0}\n")
    if time.time() - t0 >= dur: break
    time.sleep(max(1, iv - (time.time() - t0) % iv))
