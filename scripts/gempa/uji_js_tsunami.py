"""Invarian fisik public/gempa/tsunami.js, dijalankan lewat node. Butuh batimetri.bin (scripts/gempa/batimetri.py).

Yang diperiksa (bukan potret angka, kecuali konstanta fisika):
  1. c = sqrt(g h): di 4.000 m ~ 198 m/s.
  2. Laut datar 4.000 m: waktu tiba naik bersama jarak, dan jarak/waktu di 3 arah = c dalam 4% (16 tetangga).
  3. Kolam tertutup tanpa spons: volume air (massa) kekal dalam 1e-5 dari volume angkatan awal; muka air tetap terbatas.
  4. Grid nyata: sel darat tidak pernah mendapat waktu tiba; stepper dengan spons stabil 600 langkah.
  5. layak menolak gempa darat, dalam (>= 100 km), dan M < 6,5; waktuTiba mengembalikan null untuknya.
  6. Sesar geser lebih rendah tingginya daripada sesar naik yang sama; tinggi turun dengan jarak dan kedalaman pusat.
  7. Waktu tiba Dijkstra (terkalibrasi x0,85) vs stepper SWE (muka air >= 5 cm) di 3 pantai Jawa: selisih <= 2,5 menit.
     Mentah, Dijkstra 3-5 menit lebih lambat (kecepatan rata-rata sel; SWE ikut pinggiran sumber yang dihaluskan).
     Titik di luar kalibrasi (Padang, Denpasar, Sumba): selisih <= 3,5 menit.
  8. Jalur evakuasi tidak pernah memotong laut.
Juga mencetak waktu tiba contoh megathrust selatan Jawa M 8,5 ke Pacitan & Cilacap dan ms per langkah stepper.
Pakai:  python3 scripts/gempa/uji_js_tsunami.py
"""
import json, math, os, subprocess

DIR = os.path.dirname(os.path.abspath(__file__))
JS_BERKAS = os.path.join(DIR, "../../public/gempa/tsunami.js")
DATA = os.path.join(DIR, "../../public/gempa/data/")

JS = r"""
const fs = require("fs"), vm = require("vm");
vm.runInThisContext(fs.readFileSync(process.argv[1], "utf8"));
const T = globalThis.Tsunami, dasar = process.argv[2], o = {};
const meta = JSON.parse(fs.readFileSync(dasar + "batimetri.json")), b = fs.readFileSync(dasar + "batimetri.bin");
const G = T.dariBuffer(meta, b.buffer.slice(b.byteOffset, b.byteOffset + b.length));
const sintetis = (nx, ny, f) => { const z = new Int16Array(nx * ny); for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) z[j * nx + i] = f(i, j); return {lon0: 100, lat0: -5, d: 0.05, nx, ny, z}; };
o.c4000 = T.cepat(4000);

/* 2. laut datar 4.000 m, 400 x 400 sel, sumber kecil di tengah */
const D = sintetis(400, 400, () => -4000), e0 = {lat: -5 + 200 * 0.05, lon: 100 + 200 * 0.05, m: 7, dalam: 10, jenis: "naik", strike: 0};
const wt = T.waktuTiba(D, e0.lat, e0.lon, 7, {dalam: 10, jenis: "naik", strike: 0, maksMenit: 600, kalibrasi: false});
o.datar = [0, 30, 60].map(a => { const r = wt.rupture, out = [];
  for (let s = 20; s <= 180; s += 20) { const la = e0.lat + s * 0.05 * Math.cos(a * Math.PI / 180), lo = e0.lon + s * 0.05 * Math.sin(a * Math.PI / 180) / Math.cos(e0.lat * Math.PI / 180);
    out.push({km: T.jarakRupture(r, la, lo), menit: wt.menit[T.sel(D, la, lo)]}); } return out; });

/* 3. kolam tertutup: mangkuk 3.000 m dikelilingi darat, tanpa spons */
const K = sintetis(120, 100, (i, j) => (i < 3 || j < 3 || i > 116 || j > 96) ? 50 : -3000 + 20 * ((i - 60) ** 2 + (j - 50) ** 2) / 100);
const s = T.swe(K, {lat: -5 + 50 * 0.05, lon: 100 + 60 * 0.05, m: 8, dalam: 20, jenis: "subduksi", strike: 90}, {spons: 0, kotak: [0, 99, 0, 119]});
let v0 = 0, a0 = 0; for (let j = 0; j < s.ny; j++) for (let i = 0; i < s.nx; i++) { const k = j * s.nx + i; if (s.h[k]) { v0 += Math.abs(s.eta[k]) * s.luas(j); a0 = Math.max(a0, Math.abs(s.eta[k])); } }
const m0 = s.massa(); s.langkah(1500); let amax = 0; for (const x of s.eta) amax = Math.max(amax, Math.abs(x));
o.kolam = {m0, m1: s.massa(), v0, a0, amax, t: s.t, darat_basah: [...s.eta].some((x, k) => !s.h[k] && x !== 0)};

/* 4. grid nyata: megathrust selatan Jawa M 8,5 */
const jawa = {lat: -9.75, lon: 110.6, m: 8.5, dalam: 25, jenis: "subduksi", strike: 276};
let t0 = Date.now(); const wj = T.waktuTiba(G, jawa.lat, jawa.lon, 8.5, {dalam: 25, jenis: "subduksi", strike: 276, maksMenit: 180}); o.ms_waktuTiba = Date.now() - t0;
let basah = 0; for (let k = 0; k < G.z.length; k++) if (G.z[k] >= 0 && Number.isFinite(wj.menit[k])) basah++;
o.darat_basah = basah; o.n_pantai = wj.pantai.length; o.rupture = wj.rupture;
const dekat = (la, lo) => wj.pantai.reduce((m, p) => Math.hypot(p.lat - la, p.lon - lo) < Math.hypot(m.lat - la, m.lon - lo) ? p : m);
o.pacitan = dekat(-8.22, 111.09); o.cilacap = dekat(-7.74, 109.0); o.parangtritis = dekat(-8.03, 110.33);
const sj = T.swe(G, jawa, {radiusKm: 1000}); t0 = performance.now(); sj.langkah(600); o.ms_langkah = (performance.now() - t0) / 600;
t0 = performance.now(); { const a = new Float32Array(1e6); for (let i = 1; i < 1e6; i++) a[i] += a[i - 1] * 0.5 + 1; } o.ms_patokan_1e6 = performance.now() - t0; /* beban mesin: normalnya ~1-2 ms */
let am = 0, nan = false; sj.eta.forEach((x, k) => { if (!Number.isFinite(x)) nan = true; if (sj.h[k] >= 200) am = Math.max(am, Math.abs(x)); }); /* laut >= 200 m: di pantai dangkal amplitudo memang tumbuh (Green) */
o.swe_nyata = {nx: sj.nx, ny: sj.ny, dt: sj.dt, amax: am, nan, angkat: sj.rupture.angkat};

/* 7. SWE vs Dijkstra: sel pantai terdekat Pacitan, Bantul, Cilacap */
{ const s = T.swe(G, jawa, {radiusKm: 700}), titik = [o.pacitan, o.parangtritis, o.cilacap], kk = titik.map(p => { const j = Math.round((p.lat - G.lat0) / G.d), i = Math.round((p.lon - G.lon0) / G.d); return (j - s.J0) * s.nx + (i - s.I0); }), tiba = titik.map(() => null);
  while (s.t < 60 * 60 && tiba.some(x => x == null)) { s.langkah(1); kk.forEach((k, n) => { if (tiba[n] == null && Math.abs(s.eta[k]) >= 0.05) tiba[n] = s.t / 60; }); }
  o.swe_vs_dijkstra = titik.map((p, n) => ({lat: p.lat, lon: p.lon, dijkstra: p.menit, swe: tiba[n] && +tiba[n].toFixed(1)})); }
/* 7b. titik di luar kalibrasi: Mentawai M8,8 (Padang) dan selatan Bali-Sumba M8,3 (Denpasar, Sumba) */
o.luar_kalibrasi = [];
for (const [e, pts] of [[{lat: -2.6, lon: 99.5, m: 8.8, dalam: 25, jenis: "subduksi", strike: 322}, [[-0.95, 100.35]]], [{lat: -9.9, lon: 116.5, m: 8.3, dalam: 25, jenis: "subduksi", strike: 265}, [[-8.75, 115.17], [-9.6, 119.3]]]]) {
  const w = T.waktuTiba(G, e.lat, e.lon, e.m, {...e, maksMenit: 120}), s = T.swe(G, e, {radiusKm: 700});
  const P = pts.map(([la, lo]) => w.pantai.reduce((m, p) => Math.hypot(p.lat - la, p.lon - lo) < Math.hypot(m.lat - la, m.lon - lo) ? p : m));
  const kk = P.map(p => (Math.round((p.lat - G.lat0) / G.d) - s.J0) * s.nx + Math.round((p.lon - G.lon0) / G.d) - s.I0), ti = P.map(() => null);
  while (s.t < 5400 && ti.some(x => x == null)) { s.langkah(1); kk.forEach((k, n) => { if (ti[n] == null && Math.abs(s.eta[k]) >= 0.05) ti[n] = s.t / 60; }); }
  P.forEach((p, n) => o.luar_kalibrasi.push({lat: p.lat, lon: p.lon, dijkstra: p.menit, swe: ti[n] && +ti[n].toFixed(1)})); }
/* 5. layak */
o.layak = {jawa: T.layak(jawa, G), lembang: T.layak({lat: -6.83, lon: 107.62, m: 6.8, dalam: 10, jenis: "geser"}, G),
  kalimantan: T.layak({lat: 0.5, lon: 114.0, m: 7.5, dalam: 15, jenis: "naik"}, G), dalam: T.layak({...jawa, dalam: 150}, G),
  kecil: T.layak({...jawa, m: 6.2}, G), dalam80: T.layak({...jawa, dalam: 80}, G), kerak45: T.layak({lat: -9.5, lon: 110.5, m: 7.5, dalam: 45, jenis: "naik"}, G), tanpa_jenis: T.layak({lat: -9.5, lon: 110.5, m: 7.5, dalam: 30}, G), wt_lembang: T.waktuTiba(G, -6.83, 107.62, 6.8, {dalam: 10, jenis: "geser"})};
/* 6. tinggi */
o.tinggi = {d25: T.waktuTiba(G, jawa.lat, jawa.lon, 8.5, {dalam: 25, jenis: "subduksi", strike: 276, maksMenit: 60}).pantai, d60: T.waktuTiba(G, jawa.lat, jawa.lon, 8.5, {dalam: 60, jenis: "subduksi", strike: 276, maksMenit: 60}).pantai, naik: T.tinggi(7.5, 100, 50, "naik").m, geser: T.tinggi(7.5, 100, 50, "geser").m, jauh: T.tinggi(7.5, 400, 50, "naik").m};
o.evakuasi_jakarta = T.tempatTinggi(G, -6.12, 106.83, 20, 40);
o.evak_laut = 0; o.evak_n = 0; for (const p of wj.pantai.filter((_, i) => i % 7 === 0)) { const e = T.tempatTinggi(G, p.lat, p.lon, 20, 40); if (!e) continue; o.evak_n++; if (!T.lewatDarat(G, p.lat, p.lon, e.lat, e.lon)) o.evak_laut++; }
console.log(JSON.stringify(o));
"""


def main():
    out = subprocess.run(["node", "-e", JS, JS_BERKAS, DATA], capture_output=True, text=True)
    assert out.returncode == 0, out.stderr
    o = json.loads(out.stdout)

    assert abs(o["c4000"] - math.sqrt(9.81 * 4000)) < 1e-9 and 197 < o["c4000"] < 199, o["c4000"]

    c = o["c4000"] * 60 / 1000  # km per menit
    for arah in o["datar"]:
        ms = [p["menit"] for p in arah]
        assert all(b > a for a, b in zip(ms, ms[1:])), ("waktu tiba tidak naik bersama jarak", arah)
        for p in arah:
            rasio = p["km"] / p["menit"] / c
            assert 0.96 < rasio <= 1.01, (f"kecepatan semu {rasio:.3f} x c di {p['km']:.0f} km (16 tetangga <= 4% lambat; benih <= 0,6 sel di luar jejak memberi <= 1% cepat)", arah)

    k = o["kolam"]
    galat = abs(k["m1"] - k["m0"]) / k["v0"]
    assert galat < 1e-5, f"volume berubah {galat:.2e} dari volume angkatan awal (kolam tertutup)"
    assert k["amax"] <= 1.5 * k["a0"], f"muka air tumbuh {k['amax']:.2f} m > 1,5 x {k['a0']:.2f} m (tidak stabil)"
    assert not k["darat_basah"], "sel darat kolam berubah"

    assert o["darat_basah"] == 0, f"{o['darat_basah']} sel darat mendapat waktu tiba"
    sn = o["swe_nyata"]
    assert not sn["nan"] and sn["amax"] < 1.5 * abs(sn["angkat"]), ("stepper tidak stabil di laut dalam", sn)

    L = o["layak"]
    assert L["tanpa_jenis"] and not L["dalam80"] and not L["kerak45"], ("batas kedalaman", L)
    assert L["jawa"] and not L["lembang"] and not L["kalimantan"] and not L["dalam"] and not L["kecil"], L
    assert L["wt_lembang"] is None, "waktuTiba harus null untuk gempa darat"

    t = o["tinggi"]
    assert t["geser"] < 0.5 * t["naik"] and t["jauh"] < t["naik"], t
    h25, h60 = (max(p["tinggi_hi"] for p in t[k]) for k in ("d25", "d60"))
    assert h60 < h25, f"pusat 60 km harus lebih rendah dari 25 km ({h60} vs {h25})"
    for v in o["swe_vs_dijkstra"]:
        assert v["swe"] is not None and abs(v["dijkstra"] - v["swe"]) <= 2.5, ("Dijkstra terkalibrasi vs SWE lebih dari 2,5 menit", o["swe_vs_dijkstra"])
    for v in o["luar_kalibrasi"]:
        assert v["swe"] is not None and abs(v["dijkstra"] - v["swe"]) <= 3.5, ("di luar kalibrasi selisih > 3,5 menit", o["luar_kalibrasi"])
    assert o["evak_n"] > 50 and o["evak_laut"] == 0, f"{o['evak_laut']} dari {o['evak_n']} jalur evakuasi memotong laut"
    assert o["evakuasi_jakarta"] and o["evakuasi_jakarta"]["elev"] >= 20, o["evakuasi_jakarta"]

    print(json.dumps({"c_4000_m_s": round(o["c4000"], 2), "galat_volume_kolam": galat, "langkah_kolam_s": round(k["t"]),
                      "darat_basah": o["darat_basah"], "ms_waktuTiba_grid_penuh": o["ms_waktuTiba"], "ms_per_langkah_swe": round(o["ms_langkah"], 3), "ms_patokan_loop_1e6": round(o["ms_patokan_1e6"], 1),
                      "swe_nyata": sn, "rupture_jawa_M8_5": {x: round(o["rupture"][x], 2) for x in ("L", "W", "Wh", "slip", "angkat")},
                      "pacitan": o["pacitan"], "cilacap": o["cilacap"], "parangtritis": o["parangtritis"], "evakuasi_jakarta": o["evakuasi_jakarta"], "swe_vs_dijkstra": o["swe_vs_dijkstra"], "luar_kalibrasi": o["luar_kalibrasi"], "tinggi_atas_d25_d60": [h25, h60], "jalur_evakuasi_diuji": o["evak_n"]}, ensure_ascii=False))
    print("uji_js_tsunami OK")


if __name__ == "__main__":
    main()
