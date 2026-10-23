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
const lahan = {gambut: P("lahan/gambut.geojson"), kawasan: P("lahan/kawasan.geojson"), konsesi: P("lahan/konsesi.geojson"), kanal: P("kanal.json"),
  jalan: P("jalan.geojson"), desa: P("osm/desa.json"), riwayat: P("riwayat_grid.json"), penduduk: P("penduduk.json")};
let maks = 0, n = 0, maksL = 0;
for (const c of fx.kasus) {
  const r = M.ramal({model: fx.model, lat: c.lat, lon: c.lon, waktu: c.waktu, cuaca: c.cuaca, lahan, sel0: c.sel0, frp: c.frp, strata: c.strata, mc: 0, titik: c.titik, frpJumlah: c.frp_jml});
  const js = new Map(r.p1.map(x => [x.k, x.p]));
  if (!r.lolos) throw new Error("model membesar tidak jalan");
  for (const [f, v] of Object.entries(c.lolos_fitur)) { const q = r.lolos.fitur[f]; if (Math.abs(q - v) > 1e-6) throw new Error("fitur membesar beda " + f + " " + v + " vs " + q); }
  maksL = Math.max(maksL, Math.abs(r.lolos.p - c.p_lolos));
  const ru = M.ramal({model: fx.model, lat: c.lat, lon: c.lon, waktu: c.waktu, cuaca: c.cuaca, lahan, sel0: c.sel0, frp: c.frp, strata: c.strata, mc: 0, titik: c.titik, frpJumlah: c.frp_jml, ulang: c.ulang});
  maksL = Math.max(maksL, Math.abs(ru.lolos.p - c.p_lolos_ulang));
  for (const [k, p] of c.p1) { const q = js.get(k); if (q === undefined) throw new Error("sel hilang " + k); if (Math.abs(p - q) > 1e-4) console.error("beda", k, p, q, JSON.stringify(c.ev), JSON.stringify(r.iklim), c.strata, r.strata, r.geser); maks = Math.max(maks, Math.abs(p - q)); n++; }
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
for (let d = 1; d < r.luas.length; d++) if (r.luas[d].p50 < r.luas[d - 1].p50 || r.luas[d].p90 < r.luas[d - 1].p90) throw new Error("luas kumulatif turun");
for (const x of r.luas) if (!(x.p10 <= x.p50 && x.p50 <= x.p90 && x.p10_mc != null)) throw new Error("selang terkalibrasi tidak memuat median");
if (r.lolos !== null) throw new Error("tanpa titik sekitar, model membesar harus diam (bukan menebak)");
const rb = M.ramal({...dasar, sel0: [...Array(12)].map((_, i) => M.sel(c.lon + i * .004, c.lat)), titik: []});
if (rb.p_lepas !== 1 || !rb.sudah_besar || rb.lolos) throw new Error(">= 10 sel awal harus 'sudah besar'");
console.log(JSON.stringify({sel: n, selisih_maks: maks, selisih_membesar_maks: maksL}));
"""


def main(n_kasus=6):
    import lolos as LL
    from umum import muat_viirs, sel as sel_
    model = json.load(open(os.path.join(PUBLIK, "model_sebaran.json")))
    assert "lolos" in model and "lolos_ulang" in model and "selang" in model, "model_sebaran.json belum memuat model membesar/selang (lolos.py akhir & selang)"
    vs, vn = muat_viirs(), muat_viirs(LL.N20_CSV, "viirs_n20_veg")
    # model peramban hanya membawa ONI/DMI 36 bulan terakhir; kasus uji bisa lebih lama -> tabel lengkap untuk uji ini
    e = json.load(open(os.path.join(MENTAH, "enso.json")))
    model["iklim"] = {k: e[k] for k in ("oni", "dmi")}
    k = L.ktx()
    kasus = []
    for e in L.peristiwa():
        if e["sel"] < 3 or int(e["t0"][:4]) < 2023:
            continue
        S = L.seri_untuk(e)
        p, tb, ak, *_ = L.jangkar(e)[0]
        if not S or not S.cukup(p, 72 + 24):
            continue
        st = L.strata(e, k, tb)
        # titik sekitar (S-NPP & NOAA-20, 8 hari sebelum s.d. 1 hari sesudah, kotak 0,15 derajat) -> fitur membesar Python vs JS
        tit = []
        for v_, s_ in ((vs, "N"), (vn, "N20")):
            import bisect
            a_, b_ = bisect.bisect_left(v_["t"], p - 8 * 1440), bisect.bisect_left(v_["t"], p + 1440)
            tit += [(v_["t"][q], v_["lat"][q], v_["lon"][q], s_) for q in range(a_, b_) if abs(v_["lat"][q] - e["lat0"]) < .15 and abs(v_["lon"][q] - e["lon0"]) < .15]
        iS = LL.Indeks(*zip(*[(t, la, lo) for t, la, lo, s_ in tit if s_ == "N"])) if any(x[3] == "N" for x in tit) else LL.Indeks([], [], [])
        nn = [(t, la, lo) for t, la, lo, s_ in tit if s_ == "N20"]
        iN = LL.Indeks(*zip(*nn)) if nn else LL.Indeks([], [], [])
        iN.t_min = -1e18  # data N20 ada (kasus >= 2023); subset kecil tidak boleh dianggap 'tidak ada data'
        frp0 = L.frp_terakhir(e, p)
        frp_jml = round(frp0 * 1.7, 2)
        w = S.jendela(p)
        s0 = k.sel(sorted(tb)[0], e["prov"])
        oni, dmi = k.iklim(p)
        jl = ((p + e["lon0"] * 4) / 60) % 24
        ulang = {"n14": len(tb) + 2, "frp14": 9.5, "lagi14": 1, "n20_14": 3}
        args = (w, s0, int(e["t0"][:4]), len(tb), frp0, frp_jml, 0 if 6 <= jl < 18 else 1, oni, dmi, LL.konteks(iS, p, e["lon0"], e["lat0"]),
                LL.n20_sekitar(iN, sorted(tb), p - 180, p + 181))
        vl, vu = LL.fitur_lolos(*args), LL.fitur_lolos(*args, ulang)
        f = L.fungsi_model({**model, "jenis": "gbdt"}, L.KOLOM, (model.get("geser_logit") or {}).get(st, 0.0))
        r = L.ramal_sel(f, e, p, tb, ak, S, k, model["tau"], hari=1)
        d = json.load(open(cuaca.nama(int(e["t0"][:4]), *cuaca.sel05(e["lat0"], e["lon0"]))))
        m0 = (T0.timestamp() + S.m0 * 60) * 1000
        kasus.append({"lat": e["lat0"], "lon": e["lon0"], "waktu": (T0.timestamp() + p * 60) * 1000, "sel0": sorted(tb), "frp": L.frp_terakhir(e, p), "strata": st,
                      "ev": L.keadaan(e, p, tb, ak, L.baru_terakhir(e, p), S, k)[1],
                      "cuaca": {"m0": m0, **{x: d[x] for x in cuaca.KOLOM}}, "p1": [[kk, q] for kk, q in r["p1"].items()],
                      "titik": [{"t": (T0.timestamp() + t * 60) * 1000, "lat": la, "lon": lo, "s": s_} for t, la, lo, s_ in tit],
                      "frp_jml": frp_jml, "ulang": ulang, "lolos_fitur": {f: vl[f] for f in model["lolos"]["fitur"]},
                      "p_lolos": LL.prediksi(model["lolos"], vl), "p_lolos_ulang": LL.prediksi(model["lolos_ulang"], vu)})
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
    assert r["selisih_maks"] < 1e-4 and r["selisih_membesar_maks"] < 1e-6, (r, out.stderr[:1500])
    print("ok", r)


JS_SENSOR = r"""
const fs = require("fs"), vm = require("vm"), ctx = {console, Math, Date, Map, Set, JSON};
vm.createContext(ctx); vm.runInContext(fs.readFileSync(process.argv[2], "utf8"), ctx);
const M = ctx.SebaranModel, c = JSON.parse(fs.readFileSync(process.argv[3]));
console.log(JSON.stringify({akhir: M.SNPP_AKHIR_MS, sensor: c.t.map(t => M.sensorUtama(t)), peralihan: c.t.map(t => M.peralihanSensor(t)),
  konteks: c.kasus.map(k => M.konteksTitik(k.titik, k.t0, k.lon, k.lat))}));
"""


def uji_sensor():
    """Tanpa data mentah: VIIRS utama sadar waktu Python (sensor.py + prospektif.gabung/lolos.konteks) == JS (sebaran_model.js). Sebelum SNPP_AKHIR hanya 'N',
    sesudahnya hanya 'N21' yang dihitung; konteks titik membesar harus sama persis di kedua sisi, juga untuk jendela 7 hari yang melintasi batas."""
    import lolos as LL
    import sensor as SN
    a = SN.menit_akhir()
    t_cek = [a - 100000, a - 1, a, a + 1, a + 5000]
    kasus_py, kasus_js = [], []
    # titik di ~1-8 km dari pusat; campuran N/N21/N20 sebelum dan sesudah batas
    baris = []
    for k, dm in enumerate((-9000, -5000, -2000, -400, -1, 0, 1, 300, 1500, 4000, 9000)):
        for q, sen in enumerate(("N", "N21", "N20")):
            baris.append((a + dm - q, -2.0 + .004 * k + .001 * q, 110.0 + .006 * q, sen))
    for t0 in (a - 3000, a + 60, a + 2000, a + 9000):
        utama = [(t, la, lo) for t, la, lo, s_ in baris if SN.baris_utama([t, la, lo, s_])]
        idx = LL.Indeks(*zip(*utama)) if utama else LL.Indeks([], [], [])
        kasus_py.append(LL.konteks(idx, t0, 110.0, -2.0))
        kasus_js.append({"t0": (SN.T0.timestamp() + t0 * 60) * 1000, "lon": 110.0, "lat": -2.0,
                         "titik": [{"t": (SN.T0.timestamp() + t * 60) * 1000, "lat": la, "lon": lo, "s": s_} for t, la, lo, s_ in baris]})
    with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as fx, tempfile.NamedTemporaryFile("w", suffix=".js", delete=False) as js:
        json.dump({"t": [(SN.T0.timestamp() + t * 60) * 1000 for t in t_cek], "kasus": kasus_js}, fx)
        js.write(JS_SENSOR)
    try:
        out = subprocess.run(["node", js.name, os.path.join(PUBLIK, "..", "sebaran_model.js"), fx.name], capture_output=True, text=True, timeout=120)
    finally:
        os.unlink(fx.name)
        os.unlink(js.name)
    if out.returncode:
        sys.exit("GAGAL (sensor): " + out.stderr[-2000:])
    r = json.loads(out.stdout)
    assert r["akhir"] == (SN.T0.timestamp() + a * 60) * 1000, "SNPP_AKHIR JS beda dengan sensor.py"
    assert r["sensor"] == [SN.utama_pada(t) for t in t_cek] == ["N", "N", "N21", "N21", "N21"], r["sensor"]
    assert r["peralihan"] == [SN.peralihan(t) for t in t_cek], r["peralihan"]
    for py, js_ in zip(kasus_py, r["konteks"]):
        assert py["titik5_3h"] == js_["titik5_3h"] and py["titik10_3h"] == js_["titik10_3h"] and py["hari_aktif10"] == js_["hari_aktif10"] and abs(py["jarak_aktif_km"] - js_["jarak_aktif_km"]) < 1e-6, (py, js_)
    assert any(k["titik10_3h"] > 0 for k in kasus_py), "uji tak bermakna: tak ada titik terhitung"
    print("ok sensor", {"py": kasus_py[2], "js": r["konteks"][2]})


if __name__ == "__main__":
    uji_sensor()
    if sys.argv[1:] != ["sensor"]:
        main()
