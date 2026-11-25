"""Uji kesetaraan Python <-> public/gempa/guncangan.js: MMI, PGA, jendelaKm (harus sama persis), dan MMI per kecamatan.

Kasus: 60 gabungan (M, jarak, kedalaman, jenis, Vs30) tetap + dua gempa nyata-bentuk terhadap 7.274 pusat kecamatan. Butuh node.
Pakai:  python3 scripts/gempa/uji_js_guncangan.py
"""
import json, os, subprocess, sys, tempfile

DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, DIR)
import guncangan as GC  # noqa: E402

JS = r"""
const fs = require("fs"), vm = require("vm"), ctx = {console, Math, JSON};
vm.createContext(ctx); vm.runInContext(fs.readFileSync(process.argv[1], "utf8"), ctx);  /* paket repo bertipe "module": muat sebagai skrip peramban */
const fx = JSON.parse(fs.readFileSync(process.argv[2])), M = ctx.GempaGuncangan.pasang(fx.model);
const hasil = {kasus: fx.kasus.map(c => ({mmi: M.mmi(c.m, c.r, c.h, c.j, c.v), pga: M.pga(c.m, c.r, c.h, c.j, c.v), win: M.jendelaKm(c.m, c.h, c.j, c.v)})),
  kec: fx.gempa.map(g => M.kecamatan(g, fx.pusat)), tebak: fx.tebak.map(t => M.tebakJenis(...t))};
const V = ctx.GempaGuncangan.vs30Grid(fx.vs30_meta, Uint8Array.from(fx.vs30_bytes), 400);
hasil.vs30 = fx.titik.map(t => V(t[0], t[1]));  /* tapak per titik: grid, tepi, luar grid */
hasil.kec_vs30 = fx.gempa.map(g => M.kecamatan(g, fx.pusat, V));
let salah = false; try { M.mmi(6, 10, 10, "salah"); } catch (e) { salah = true; }
let tolak = false; try { M.tebakJenis(30, 8); } catch (e) { tolak = true; }
console.log(JSON.stringify({...hasil, tolak_jenis_salah: salah, tolak_tebak: tolak}));
"""


def main():
    pusat = json.load(open(GC.PUSAT))
    kasus, s = [], 12345
    for i in range(60):  # LCG tetap: deterministik tanpa random
        s = (s * 1103515245 + 12345) % 2 ** 31
        u = s / 2 ** 31
        m = 4.5 + 4.0 * u
        s = (s * 1103515245 + 12345) % 2 ** 31
        r = 1 + 600 * (s / 2 ** 31) ** 2
        j = GC.JENIS[i % 3]
        h = [10, 30, 80][i % 3] + (i % 5) * 7
        kasus.append({"m": round(m, 3), "r": round(r, 3), "h": h, "j": j, "v": [180, 250, 400, 760][i % 4]})
    gempa = [{"lat": -8.4, "lon": 116.4, "m": 6.9, "dalam": 15}, {"lat": -4.5, "lon": 129.0, "m": 7.4, "dalam": 120, "jenis": "intraslab"},
             {"lat": 3.3, "lon": 95.9, "m": 9.1, "dalam": 30}]  # tebakan antarmuka dekat palung Sumatra
    tebak = [(30, 9.1, 3.3, 95.9), (30, 7.2, -2.0, 110.0), (30, 7.5, -10.5, 112.0), (40, 6.5, 0, 100), (10, 8.0, 3.3, 95.9), (80, 7.0, 0, 0)]
    py = {"kasus": [{"mmi": GC.mmi_perkiraan(c["m"], c["r"], c["h"], c["j"], c["v"]), "pga": GC.pga_cms2(c["m"], c["r"], c["h"], c["j"], c["v"]),
                     "win": GC.jendela_km(c["m"], c["h"], c["j"], c["v"])} for c in kasus],
          "kec": [GC.mmi_kecamatan(g, pusat) for g in gempa], "tebak": [GC.tebak_jenis(*t) for t in tebak]}
    dv = os.path.join(GC.AKAR, "public/gempa/data")
    vmeta, vbin = json.load(open(os.path.join(dv, "vs30.json"))), open(os.path.join(dv, "vs30.bin"), "rb").read()
    V = GC.vs30_grid(vmeta, vbin)
    titik = [[-6.2, 106.8], [-8.4, 116.4], [3.3, 95.9], [-4.5, 129.0], [0.0, 0.0], [-12.5, 94.0], [7.2, 142.1], [-7.797, 110.37]] + [[-10 + i * 0.317, 95 + i * 0.731] for i in range(60)]  # termasuk luar grid
    py["vs30"] = [V(*t) for t in titik]
    py["kec_vs30"] = [GC.mmi_kecamatan(g, pusat, V) for g in gempa]
    model = json.load(open(GC.KELUAR))
    assert model["param"] == GC.PARAM, "model_guncangan.json basi: jalankan guncangan.py ekspor"
    with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as f:
        json.dump({"model": model, "kasus": kasus, "gempa": gempa, "pusat": pusat, "tebak": tebak, "vs30_meta": vmeta, "vs30_bytes": list(vbin), "titik": titik}, f)
    try:
        out = subprocess.run(["node", "-e", JS, os.path.join(DIR, "../../public/gempa/guncangan.js"), f.name], capture_output=True, text=True, check=True).stdout
    finally:
        os.unlink(f.name)
    js = json.loads(out)
    assert js["tolak_jenis_salah"], "JS menerima jenis salah"
    assert js["tolak_tebak"], "JS menebak megathrust tanpa lokasi"
    assert js["tebak"] == py["tebak"], ("tebakJenis beda", js["tebak"], py["tebak"])
    dm = dp = 0.0
    for a, b in zip(py["kasus"], js["kasus"]):
        assert a["win"] == b["win"], ("jendelaKm beda", a, b)  # persis, bukan toleransi
        dm = max(dm, abs(a["mmi"] - b["mmi"])); dp = max(dp, abs(a["pga"] - b["pga"]) / a["pga"])
    nk = 0
    for a, b in zip(py["kec"], js["kec"]):
        assert a.keys() == b.keys(), "himpunan kecamatan dalam jendela beda"
        for k in a:
            assert a[k]["ekstrapolasi"] == b[k]["ekstrapolasi"], k
            dm = max(dm, abs(a[k]["mmi"] - b[k]["mmi"])); nk += 1
    assert js["vs30"] == py["vs30"], ("vs30Grid beda", js["vs30"], py["vs30"])
    assert len(set(py["vs30"])) > 3 and 400 in py["vs30"], "titik uji Vs30 tak beragam"
    nv = 0
    for a, b in zip(py["kec_vs30"], js["kec_vs30"]):
        assert a.keys() == b.keys(), "himpunan kecamatan (Vs30 per tapak) beda"
        for k in a:
            assert a[k]["ekstrapolasi"] == b[k]["ekstrapolasi"], k
            dm = max(dm, abs(a[k]["mmi"] - b[k]["mmi"])); nv += 1
    assert GC.koreksi_beku(), "koreksi KI-81 tak aktif di jalur Vs30 per tapak"
    assert any(abs(py["kec_vs30"][0][k]["mmi"] - py["kec"][0][k]["mmi"]) > 0.05 for k in py["kec_vs30"][0] if k in py["kec"][0]), "Vs30 per tapak tak mengubah MMI"
    assert dm < 1e-6 and dp < 1e-9, (dm, dp)
    print(json.dumps({"kasus": len(kasus), "kecamatan": nk, "kecamatan_vs30": nv, "selisih_mmi_maks": dm, "selisih_pga_relatif_maks": dp, "jendelaKm_sama": True}))
    print("uji_js_guncangan OK")


if __name__ == "__main__":
    main()
