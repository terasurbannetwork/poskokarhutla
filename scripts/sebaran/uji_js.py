"""Uji kesetaraan Python <-> public/sebaran_model.js: fitur & peluang hari-1 untuk titik awal nyata harus sama.

Mengambil beberapa peristiwa yang punya cuaca, menghitung peluang tiap sel calon dengan latih.py (Python), menulis fikstur,
lalu menjalankan node dengan sebaran_model.js pada masukan yang sama (cuaca per jam mentah, lahan dari public/data).
Juga menguji bahwa evaluator menolak masukan di luar jangkauan. Butuh node.

Pakai:  python3 scripts/sebaran/uji_js.py
"""
import json, os, subprocess, sys, tempfile

DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, DIR)
import cuaca  # noqa: E402
import latih as L  # noqa: E402
from umum import AKAR, MENTAH, PUBLIK, T0  # noqa: E402

JS = r"""
const fs = require("fs"), vm = require("vm"), ctx = {console, Math, Date, Map, Set, JSON};
vm.createContext(ctx); vm.runInContext(fs.readFileSync(process.argv[2], "utf8"), ctx);  /* paket repo bertipe "module": muat sebagai skrip peramban */
const M = ctx.SebaranModel, fx = JSON.parse(fs.readFileSync(process.argv[3]));
const P = f => JSON.parse(fs.readFileSync(process.argv[4] + "/" + f));
const lahan = {gambut: P("lahan/gambut.geojson"), kawasan: P("lahan/kawasan.geojson"), konsesi: P("lahan/konsesi.geojson"), sanksi: P("lahan/sanksi_karhutla.json"), kanal: P("kanal.json"),
  jalan: P("jalan.geojson"), desa: P("osm/desa.json"), riwayat: P("riwayat_grid.json")};
let maks = 0, n = 0;
for (const c of fx.kasus) {
  const r = M.ramal({model: fx.model, lat: c.lat, lon: c.lon, waktu: c.waktu, cuaca: c.cuaca, lahan, sel0: c.sel0, frp: c.frp, mc: 0});
  const js = new Map(r.p1.map(x => [x.k, x.p]));
  for (const [k, p] of c.p1) { const q = js.get(k); if (q === undefined) throw new Error("sel hilang " + k); maks = Math.max(maks, Math.abs(p - q)); n++; }
  if (js.size !== c.p1.length) throw new Error("jumlah calon beda " + js.size + " vs " + c.p1.length);
}
const tolak = o => { try { M.ramal(o); return false; } catch (e) { return true; } };
const c = fx.kasus[0], dasar = {model: fx.model, lat: c.lat, lon: c.lon, waktu: c.waktu, cuaca: c.cuaca, lahan, mc: 5};
if (!tolak({...dasar, lat: 20})) throw new Error("lintang 20 diterima");
if (!tolak({...dasar, lon: 150})) throw new Error("bujur 150 diterima");
if (!tolak({...dasar, waktu: "bukan tanggal"})) throw new Error("waktu rusak diterima");
if (!tolak({...dasar, waktu: c.cuaca.m0 + 5 * 864e5})) throw new Error("cuaca tanpa 30 hari masa panas diterima");
if (!tolak({...dasar, model: {}})) throw new Error("model rusak diterima");
const r = M.ramal(dasar);
for (const s of r.sel) for (const p of s.p) if (!(p >= 0 && p <= 1)) throw new Error("peluang di luar [0,1]");
if (r.p_lepas < 0 || r.p_lepas > 1) throw new Error("p_lepas di luar [0,1]");
for (let d = 1; d < r.luas.length; d++) if (r.luas[d].p50 < r.luas[d - 1].p50) throw new Error("luas kumulatif turun");
console.log(JSON.stringify({sel: n, selisih_maks: maks}));
"""


def main(n_kasus=6):
    model = json.load(open(os.path.join(PUBLIK, "model_sebaran.json")))
    if "iklim" not in model:
        e = json.load(open(os.path.join(MENTAH, "enso.json")))
        model["iklim"] = {k: e[k] for k in ("oni", "dmi")}
    f = L.fungsi_model({**model, "jenis": "gbdt"}, L.KOLOM)
    k = L.ktx()
    kasus = []
    for e in L.peristiwa():
        if e["sel"] < 3 or int(e["t0"][:4]) < 2023:
            continue
        S = L.seri_untuk(e)
        p, tb, ak, *_ = L.jangkar(e)[0]
        if not S or not S.cukup(p, 72 + 24):
            continue
        r = L.ramal_sel(f, e, p, tb, ak, S, k, model["tau"], hari=1)
        d = json.load(open(cuaca.nama(int(e["t0"][:4]), *cuaca.sel05(e["lat0"], e["lon0"]))))
        m0 = (T0.timestamp() + S.m0 * 60) * 1000
        kasus.append({"lat": e["lat0"], "lon": e["lon0"], "waktu": (T0.timestamp() + p * 60) * 1000, "sel0": sorted(tb), "frp": L.frp_terakhir(e, p),
                      "cuaca": {"m0": m0, **{x: d[x] for x in cuaca.KOLOM}}, "p1": [[kk, q] for kk, q in r["p1"].items()]})
        if len(kasus) >= n_kasus:
            break
    with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as fx, tempfile.NamedTemporaryFile("w", suffix=".js", delete=False) as js:
        json.dump({"model": model, "kasus": kasus}, fx)
        js.write(JS)
    try:
        out = subprocess.run(["node", js.name, os.path.join(PUBLIK, "..", "sebaran_model.js"), fx.name, PUBLIK], capture_output=True, text=True, timeout=600)
    finally:
        os.unlink(fx.name)
        os.unlink(js.name)
    if out.returncode:
        sys.exit("GAGAL: " + out.stderr[-2000:])
    r = json.loads(out.stdout)
    assert r["selisih_maks"] < 1e-4, r
    print("ok", r)


if __name__ == "__main__":
    main()
