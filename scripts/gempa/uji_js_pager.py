"""Uji kesetaraan Python <-> public/gempa/pager.js: jiwa, pita, kelas pada 200 paparan tetap (LCG) + Cianjur. Butuh node.
Pakai:  python3 scripts/gempa/uji_js_pager.py"""
import json, os, subprocess, sys

DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, DIR)
import pager as PG  # noqa: E402

JS = r"""
const fs = require("fs"), vm = require("vm"), ctx = {console, Math, JSON};
vm.createContext(ctx); vm.runInContext(fs.readFileSync(process.argv[1], "utf8"), ctx);
console.log(JSON.stringify(JSON.parse(process.argv[2]).map(p => ctx.GempaPager.hitung(p))));
"""

s, kasus = 777, []
for _ in range(200):
    p = {}
    for k in range(2, 13):
        s = (s * 1103515245 + 12345) % 2 ** 31
        if s % 3:
            p[k] = int(s / 2 ** 31 * 10 ** (1 + (13 - k) * 0.6))
    kasus.append(p)
kasus.append(dict(zip(range(4, 11), [46951347, 5526880, 2235105, 1436440, 342271, 0, 0])))
out = json.loads(subprocess.run(["node", "-e", JS, "--", os.path.join(DIR, "../../public/gempa/pager.js"), json.dumps(kasus)],
                                capture_output=True, text=True, check=True).stdout)
assert len(out) == len(kasus)
selisih = 0
for p, j in zip(kasus, out):
    r = PG.jiwa(p)
    assert j["kelas"] == r["kelas"], (p, j, r)
    selisih = max(selisih, abs(j["jiwa"] - r["jiwa"]) / max(r["jiwa"], 1e-9) if r["jiwa"] > 1e-6 else 0)
assert selisih < 1e-5, selisih
print("pager js=py OK, selisih relatif maks", selisih)
