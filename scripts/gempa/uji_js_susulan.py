"""Uji kesetaraan Python <-> public/gempa/susulan.js: peluang (p, n, lo, hi) dan sesuaikan (a, sa, n_amat).

Kasus: 80 gabungan (M utama, t mulai, durasi, M min) dari LCG tetap, param dari model_susulan.json dan dua param buatan,
penyesuaian dengan daftar susulan sintetis, dan penolakan masukan salah di kedua sisi. Butuh node.
Pakai:  python3 scripts/gempa/uji_js_susulan.py
"""
import json, os, subprocess, sys, tempfile

DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, DIR)
import susulan as SU  # noqa: E402

JS = r"""
const fs = require("fs"), vm = require("vm"), ctx = {console, Math, JSON, Object, Array, isFinite};
vm.createContext(ctx); vm.runInContext(fs.readFileSync(process.argv[1], "utf8"), ctx);
const fx = JSON.parse(fs.readFileSync(process.argv[2])), S = ctx.Susulan;
const tolak = (f) => { try { f(); return false; } catch (e) { return true; } };
console.log(JSON.stringify({
  peluang: fx.kasus.map(c => S.peluang(c[0], c[1], c[2], c[3], fx.param[c[4]])),
  sesuai: fx.sesuai.map(c => S.sesuaikan(c[0], c[1], c[2], fx.param[c[3]], c[4])),
  bawaan_mati: (S.model = {terbit_sesuaikan: false}, S.sesuaikan(6, [{t_hari: 1, m: 5}], 2, fx.param[0])),
  tolak: [tolak(() => S.peluang(6, 0.04, 7, 5)),  /* belum dimuat */
          tolak(() => S.peluang(6, -1, 7, 5, fx.param[0])), tolak(() => S.peluang("6", 0.04, 7, 5, fx.param[0])),
          tolak(() => S.peluang(6, 0.04, 7, 5, Object.assign({}, fx.param[0], {b: -1}))),
          tolak(() => S.sesuaikan(6, [{t_hari: "x", m: 5}], 2, fx.param[0])), tolak(() => S.sesuaikan(6, "x", 2, fx.param[0]))]
}));
"""


def main():
    model = json.load(open(SU.MODEL))
    params = [model["param"], dict(model["param"], sa=0.0), {"a": -1.67, "b": 0.91, "p": 1.08, "c": 0.05, "mc": 4.5, "sa": 0.6, "alfa": 0.8, "m_ref": 6.0}]
    kasus, s = [], 2468
    for i in range(80):
        v = []
        for _ in range(4):
            s = (s * 1103515245 + 12345) % 2 ** 31
            v.append(s / 2 ** 31)
        kasus.append([round(5 + 4 * v[0], 2), round(10 * v[1] ** 2, 4), round(0.1 + 7 * v[2], 3), round(4.5 + 2.5 * v[3], 1), i % 3])
    kasus.append([6.0, 1.0, 0.0, 5.0, 0])  # durasi 0
    sesuai = []
    for i in range(12):
        sus = [{"t_hari": round(0.03 + 0.37 * k * (i + 1) / 4, 4), "m": round(4.5 + (k * 7 % 10) / 10, 1)} for k in range(i * 3)]
        sesuai.append([5.5 + i * 0.25, sus, [0.02, 0.5, 2, 7][i % 4], i % 3, i % 5 != 4])  # tiap kelima: aktif=False
    py = {"peluang": [SU.peluang(c[0], c[1], c[2], c[3], params[c[4]]) for c in kasus],
          "sesuai": [SU.sesuaikan(c[0], c[1], c[2], params[c[3]], c[4]) for c in sesuai]}
    with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as f:
        json.dump({"param": params, "kasus": kasus, "sesuai": sesuai}, f)
    try:
        out = subprocess.run(["node", "-e", JS, os.path.join(DIR, "../../public/gempa/susulan.js"), f.name],
                             capture_output=True, text=True, check=True).stdout
    finally:
        os.unlink(f.name)
    js = json.loads(out)
    assert all(js["tolak"]), ("JS menerima masukan salah", js["tolak"])
    assert js["bawaan_mati"] == dict(params[0], n_amat=1), ("model terbit_sesuaikan false tapi JS tetap menyesuaikan", js["bawaan_mati"])
    d = 0.0
    for a, b in zip(py["peluang"] + py["sesuai"], js["peluang"] + js["sesuai"]):
        assert set(a) == set(b), (a, b)
        for k in a:
            d = max(d, abs(a[k] - b[k]) / max(1.0, abs(a[k])))
    assert d < 1e-9, d
    print(json.dumps({"kasus_peluang": len(kasus), "kasus_sesuaikan": len(sesuai), "selisih_relatif_maks": d}))
    print("uji_js_susulan OK")


if __name__ == "__main__":
    main()
