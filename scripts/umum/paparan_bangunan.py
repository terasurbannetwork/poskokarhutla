"""Paparan bangunan per bahaya: grid Open Buildings (scripts/umum/bangunan.py) x keluaran bahaya yang SUDAH ada -> data/terkunci/bangunan/terpapar.json.

Terkunci (login saja), bukan public/. Bahaya yang geometrinya tak ada dicatat "tersedia": false + "alasan", tidak dikarang.
  karhutla   : bangunan dalam 1/3/5 km dari poligon kompleks aktif (public/data/kluster.json; aktif = kriteria sebaran/jejak.py kompleks_aktif)
               + proyeksi 72 jam (public/data/jejak_api.json, sel 375 m; pecahan sel grid), tersedia:false bila kosong/basi
  banjir     : poligon kejadian aktif (public/banjir/data/kejadian_aktif_geo.json + _awal.json); rob: tersedia:false (hanya titik tinggi laut)
  gempa      : MMI per sel grid untuk gempa M>=5 30 hari terakhir (public/gempa/data/riwayat_m5.json) lewat scripts/gempa/guncangan.py (GMPE+GMICE)
  gunung api : KRB I/II/III per gunung (public/gunungapi/data/paparan_geo.json)
Ketelitian: bangunan dihitung per sel grid 0,01 derajat (~1,1 km) dengan titik tengah sel sebagai wakil. Batas 1 km karhutla dan batas zona
karena itu kasar sekitar +-0,8 km; kabupaten/kecamatan sel diambil dari titik tengah sel.
Cakupan: hanya provinsi yang grid-nya sudah dibuat (cakupan_provinsi); objek bahaya di provinsi lain terhitung 0 dan ditandai terliput:false.

Pakai: python3 scripts/umum/paparan_bangunan.py | --uji
"""
import datetime as dt, glob, importlib.util, json, math, os, sys, tempfile

AKAR = os.path.normpath(os.path.join(os.path.dirname(__file__), "../.."))
GRID = os.path.join(AKAR, "data/terkunci/bangunan")
KELUAR = os.path.join(GRID, "terpapar.json")
PITA_KM = (1, 3, 5)
HARI_GEMPA = 30
MAKS_BASI_JAM = 36  # kluster/jejak lebih tua dari ini -> ditandai basi (angka tetap dihitung agar bisa diperiksa)
BAND_MMI = ("IV", "V", "VI", "VII", "VIII", "IX+")  # MMI dibulatkan; < IV tidak dilaporkan
R_BUMI_KM = 6371.0088


def _muat(nama, *rel):
    for r in rel:
        p = os.path.join(AKAR, r)
        if os.path.exists(p):
            s = importlib.util.spec_from_file_location(nama, p)
            m = importlib.util.module_from_spec(s)
            s.loader.exec_module(m)
            return m
    raise SystemExit(f"{rel} tidak ketemu")


_wil = _muat("paparan_wilayah", "scripts/umum/wilayah.py", "scripts/data/wilayah.py")
_gunc = _muat("paparan_guncangan", "scripts/gempa/guncangan.py")
_dalam = _wil._di_dalam


def baca(rel):
    return json.load(open(os.path.join(AKAR, rel)))


# ---------------- grid ----------------
class Grid:
    def __init__(self, folder=GRID):
        self.sel, self.prov = {}, set()
        self.lat0 = self.lon0 = self.step = None
        for p in sorted(glob.glob(os.path.join(folder, "grid_*.json"))):
            d = json.load(open(p))
            self.lat0, self.lon0, self.step = d["lat0"], d["lon0"], d["step"]
            self.prov.add(d["prov"])
            for i, j, n, a in d["cells"]:
                e = self.sel.get((i, j))  # sel di perbatasan provinsi muncul di dua berkas: jumlahkan
                self.sel[(i, j)] = (n, a) if e is None else (e[0] + n, e[1] + a)
        self.cache = {}

    def pusat(self, i, j):
        return self.lat0 + (i + .5) * self.step, self.lon0 + (j + .5) * self.step

    def indeks(self, lat, lon):
        return math.floor((lat - self.lat0) / self.step), math.floor((lon - self.lon0) / self.step)

    def kotak(self, lon0, lat0, lon1, lat1):
        """sel berisi bangunan yang titik tengahnya di dalam kotak (derajat)"""
        i0, j0 = self.indeks(lat0, lon0)
        i1, j1 = self.indeks(lat1, lon1)
        for i in range(i0, i1 + 1):
            for j in range(j0, j1 + 1):
                if (i, j) in self.sel:
                    yield i, j


def kec_sel(g, w, i, j):
    k = g.cache.get((i, j))
    if k is None:
        la, lo = g.pusat(i, j)
        r = w.cari(lo, la)
        k = g.cache[(i, j)] = ("|".join(r[:2]), "|".join(r)) if r else (None, None)
    return k


def agregasi(g, w, bobot):
    """bobot {(i,j): pecahan 0..1} -> {bangunan, luas_m2, kab:{"prov|kab":n}, kec:{"prov|kab|kec":n}}"""
    kab, kec, n_tot, a_tot = {}, {}, 0.0, 0.0
    for ij, f in bobot.items():
        n, a = g.sel[ij]
        n_tot, a_tot = n_tot + n * f, a_tot + a * f
        kb, kc = kec_sel(g, w, *ij)
        if kb:
            kab[kb] = kab.get(kb, 0) + n * f
            kec[kc] = kec.get(kc, 0) + n * f
    urut = lambda d: {k: round(v) for k, v in sorted(d.items(), key=lambda kv: -kv[1]) if round(v) > 0}
    return {"bangunan": round(n_tot), "luas_m2": round(a_tot), "kab": urut(kab), "kec": urut(kec)}


# ---------------- geometri ----------------
def cincin(geom):
    """[(luar, [lubang...]), ...] untuk Polygon/MultiPolygon"""
    if geom["type"] == "Point":  # kluster 1 titik: cincin nol-luas, jarak dihitung ke titiknya
        return [([geom["coordinates"], geom["coordinates"]], [])]
    bagian = geom["coordinates"] if geom["type"] == "MultiPolygon" else [geom["coordinates"]]
    return [(p[0], p[1:]) for p in bagian]


def di_geom(lon, lat, bagian):
    return any(_dalam(lon, lat, luar) and not any(_dalam(lon, lat, l) for l in lubang) for luar, lubang in bagian)


def kotak_cincin(bagian):
    xs = [c[0] for luar, _ in bagian for c in luar]
    ys = [c[1] for luar, _ in bagian for c in luar]
    return min(xs), min(ys), max(xs), max(ys)


def jarak_km(lon, lat, bagian):
    """jarak titik ke poligon (0 bila di dalam), proyeksi ekuirektangular lokal; hanya cincin luar dan lubang dihitung sebagai batas."""
    if di_geom(lon, lat, bagian):
        return 0.0
    k = math.cos(math.radians(lat))
    terbaik = 1e9
    for luar, lubang in bagian:
        for r in [luar] + lubang:
            for a, b in zip(r, r[1:]):
                px, py = (a[0] - lon) * k, a[1] - lat
                dx, dy = (b[0] - a[0]) * k, b[1] - a[1]
                t = 0.0 if dx == 0 and dy == 0 else max(0.0, min(1.0, -(px * dx + py * dy) / (dx * dx + dy * dy)))
                terbaik = min(terbaik, math.hypot(px + t * dx, py + t * dy))
    return terbaik * math.pi / 180 * R_BUMI_KM


def sel_dalam(g, bagian):
    x0, y0, x1, y1 = kotak_cincin(bagian)
    out = {}
    for i, j in g.kotak(x0, y0, x1, y1):
        la, lo = g.pusat(i, j)
        if di_geom(lo, la, bagian):
            out[(i, j)] = 1.0
    return out


def sel_dekat(g, bagian, maks_km):
    """{(i,j): jarak_km} untuk sel berisi bangunan dengan jarak <= maks_km dari poligon"""
    x0, y0, x1, y1 = kotak_cincin(bagian)
    pad_y = maks_km / 111.0 + g.step
    pad_x = pad_y / max(0.2, math.cos(math.radians((y0 + y1) / 2)))
    out = {}
    for i, j in g.kotak(x0 - pad_x, y0 - pad_y, x1 + pad_x, y1 + pad_y):
        la, lo = g.pusat(i, j)
        d = jarak_km(lo, la, bagian)
        if d <= maks_km:
            out[(i, j)] = d
    return out


def umur_jam(iso, kini):
    t = dt.datetime.fromisoformat(iso.replace("Z", "+00:00"))
    if t.tzinfo is None:
        t = t.replace(tzinfo=dt.timezone(dt.timedelta(hours=7)))
    return (kini - t).total_seconds() / 3600


# ---------------- bahaya ----------------
def karhutla(g, w, kini):
    meta = baca("public/data/meta.json")
    umur = umur_jam(meta["data_terakhir"], kini)
    fitur = [f for f in baca("public/data/kluster.json")["features"] if f["properties"].get("n24", 0) > 0
             and f["properties"].get("jam_sejak", 99) <= 24 and f["properties"].get("level", 0) >= 2]
    jarak_min, kompleks = {}, []
    n_tak = 0
    for f in fitur:
        pr = f["properties"]
        if pr["prov"] not in g.prov:
            n_tak += 1
            continue
        sel = sel_dekat(g, cincin(f["geometry"]), PITA_KM[-1])
        for ij, d in sel.items():
            if d < jarak_min.get(ij, 1e9):
                jarak_min[ij] = d
        kompleks.append({"id": pr["id"], "level": pr["level"], "prov": pr["prov"], "kab": pr["kab"], "kec": pr["kec"],
                         **{f"km{k}": sum(g.sel[ij][0] for ij, d in sel.items() if d <= k) for k in PITA_KM}})
    pita = {f"{k}km": agregasi(g, w, {ij: 1.0 for ij, d in jarak_min.items() if d <= k}) for k in PITA_KM}
    kompleks.sort(key=lambda c: (-c["km5"], c["id"]))
    out = {"tersedia": True, "sumber": "public/data/kluster.json (kompleks aktif: n24>0, jam_sejak<=24, level>=2)",
           "data_terakhir": meta["data_terakhir"], "umur_data_jam": round(umur), "basi": umur > MAKS_BASI_JAM,
           "n_kompleks_aktif": len(fitur), "n_kompleks_terliput": len(kompleks), "n_kompleks_di_luar_cakupan": n_tak,
           "kumulatif_dari_tepi_poligon": pita, "per_kompleks": kompleks, "proyeksi_72j": proyeksi(g, w, kini)}
    if not fitur:
        return {"tersedia": False, "alasan": "tidak ada kompleks aktif (n24>0, jam_sejak<=24, level>=2) di kluster.json"}
    return out


def proyeksi(g, w, kini):
    j = baca("public/data/jejak_api.json")
    if not j.get("kompleks"):
        return {"tersedia": False, "alasan": f"jejak_api.json kosong (status {j.get('status')}, acuan {j.get('acuan')}): ramalan 72 jam tidak dibuat"}
    umur = umur_jam(j["acuan"], kini)
    sel_km = 0.375  # sel jejak 375 m
    pecah = {}
    for k in j["kompleks"]:
        if str(k["prov"]) not in g.prov:
            continue
        gabung = {}  # sel jejak di tiap kompleks dihitung sekali per sel grid; antar kompleks diambil maksimum (bukan jumlah)
        for lon, lat, p in k["hari"][-1]["sel"]:
            ij = g.indeks(lat, lon)
            if ij in g.sel:
                gabung[ij] = gabung.get(ij, 0) + (sel_km / (g.step * 111.0)) ** 2
        for ij, f in gabung.items():
            pecah[ij] = max(pecah.get(ij, 0), min(1.0, f))
    return {"tersedia": True, "metode": "pecahan sel grid yang tertutup sel jejak 375 m (anggap bangunan merata dalam sel)", "acuan": j["acuan"],
            "umur_data_jam": round(umur), "basi": umur > MAKS_BASI_JAM, "ambang_p": j.get("ambang_p"), "hasil": agregasi(g, w, pecah)}


def banjir(g, w, kini):
    geo = baca("public/banjir/data/kejadian_aktif_geo.json")
    awal = {k["kode"]: k for k in baca("public/banjir/data/kejadian_aktif_awal.json")["kejadian"]}
    umur = umur_jam(geo["hari"] + "T23:59", kini)
    union, per = {}, []
    for f in geo["features"]:
        kode = f["properties"]["kode"]
        a = awal.get(kode, {})
        terliput = any(p in g.prov for p in a.get("prov", []))
        sel = sel_dalam(g, cincin(f["geometry"])) if terliput else {}
        union.update(sel)
        per.append({"kode": kode, "level_tertinggi": a.get("level_tertinggi"), "prov": a.get("prov"), "n_kec": a.get("n_kec"),
                    "penduduk": a.get("penduduk"), "terliput": terliput, "bangunan": sum(g.sel[ij][0] for ij in sel)})
    per.sort(key=lambda c: (-c["bangunan"], c["kode"]))
    return {"tersedia": True, "sumber": "public/banjir/data/kejadian_aktif_geo.json (poligon kecamatan kejadian aktif) + _awal.json",
            "hari": geo["hari"], "umur_data_jam": round(umur), "basi": umur > 48,
            "catatan": "Zona = gabungan poligon kecamatan kejadian aktif, bukan genangan terpetakan; ini batas atas bangunan di kecamatan terdampak.",
            "n_kejadian": len(per), "total": agregasi(g, w, {ij: 1.0 for ij in union}), "per_kejadian": per}, {
        "tersedia": False, "alasan": "rob.json hanya deret tinggi muka laut di titik pantai; tidak ada poligon genangan rob, dan bahaya.json (InaRISK) berupa indeks per kecamatan tanpa geometri"}


def gempa(g, w, kini):
    r = baca("public/gempa/data/riwayat_m5.json")
    kol = r["kolom"]
    ev = [dict(zip(kol, b)) for b in r["baris"]]
    if not ev:
        return {"tersedia": False, "alasan": "riwayat_m5.json kosong"}
    akhir = max(e["waktu_utc"] for e in ev)
    batas = (dt.datetime.fromisoformat(akhir) - dt.timedelta(days=HARI_GEMPA)).isoformat(timespec="minutes")
    pilih = [e for e in ev if e["waktu_utc"] >= batas and e["m"] >= 5]
    union_mmi, per = {}, []
    for e in pilih:
        jenis = _gunc.tebak_jenis(e["dalam_km"], e["m"], e["lat"], e["lon"])
        win = _gunc.jendela_km(e["m"], e["dalam_km"], jenis)
        dl = win / 111.0 + g.step
        dx = dl / max(0.2, math.cos(math.radians(e["lat"])))
        band, bobot = {}, {}
        for ij in g.kotak(e["lon"] - dx, e["lat"] - dl, e["lon"] + dx, e["lat"] + dl):
            la, lo = g.pusat(*ij)
            d = _gunc.jarak_km(e["lat"], e["lon"], la, lo)
            if d > win:
                continue
            mmi = _gunc.mmi_perkiraan(e["m"], d, e["dalam_km"], jenis)
            b = int(mmi + .5)
            if b < 4:
                continue
            if mmi > union_mmi.get(ij, 0):
                union_mmi[ij] = mmi
            k = BAND_MMI[min(b, 9) - 4]
            band[k] = band.get(k, 0) + g.sel[ij][0]
        per.append({"waktu_utc": e["waktu_utc"], "m": e["m"], "dalam_km": e["dalam_km"], "lat": e["lat"], "lon": e["lon"], "jenis": jenis,
                    "radius_model_km": win, "bangunan_per_mmi": band})
    hasil = {}
    for k in BAND_MMI:
        b = {ij: 1.0 for ij, m in union_mmi.items() if BAND_MMI[min(int(m + .5), 9) - 4] == k}
        hasil[k] = agregasi(g, w, b)
    ge5 = {ij: 1.0 for ij, m in union_mmi.items() if int(m + .5) >= 5}
    return {"tersedia": True, "sumber": "riwayat_m5.json (USGS) + scripts/gempa/guncangan.py (BSSA14/Zhao06 -> Worden12), rata-rata tanpa sigma, Vs30 400 m/s",
            "akhir_katalog_utc": akhir, "umur_katalog_hari": round(umur_jam(akhir + "+00:00", kini) / 24, 1), "jendela_hari": HARI_GEMPA,
            "catatan": "Perkiraan model, bukan MMI teramati (bandingkan laporan BMKG). Gempa laut dihitung sama; sel tanpa bangunan tidak muncul. Cakupan provinsi grid membatasi hitungan.",
            "n_gempa": len(per), "per_gempa": per, "MMI_V_ke_atas": agregasi(g, w, ge5), "per_band_maks_per_sel": hasil}


def gunungapi(g, w, kini):
    geo = baca("public/gunungapi/data/paparan_geo.json")
    nama = {x["id"]: x["nama"] for x in baca("public/gunungapi/data/paparan.json")["gunung"]}
    gn = baca("public/gunungapi/data/gunung.json")
    pergunung, tertinggi = [], {}
    for gid, v in geo.items():
        zona = {}
        pusat_ll = None
        for z in ("III", "II", "I"):
            if z in v["zona"]:
                bag = cincin(v["zona"][z])
                pusat_ll = pusat_ll or ((kotak_cincin(bag)[0] + kotak_cincin(bag)[2]) / 2, (kotak_cincin(bag)[1] + kotak_cincin(bag)[3]) / 2)
                zona[z] = sel_dalam(g, bag)
        pr = None
        if pusat_ll:
            r = w.cari(*pusat_ll)
            pr = r[0] if r else None
        terliput = pr in g.prov if pr else False
        # satu sel masuk zona tertinggi yang memuatnya (KRB bertingkat bisa saling tumpang)
        sudah = set()
        ringkas = {}
        for z in ("III", "II", "I"):
            ex = {ij: 1.0 for ij in zona.get(z, {}) if ij not in sudah}
            sudah |= set(ex)
            ringkas[z] = sum(g.sel[ij][0] for ij in ex)
            for ij in ex:
                tertinggi[ij] = max(tertinggi.get(ij, 0), {"I": 1, "II": 2, "III": 3}[z])
        pergunung.append({"id": gid, "nama": nama.get(gid, gid), "prov_perkiraan": pr, "terliput": terliput, "bangunan_per_zona": ringkas,
                          "total": sum(ringkas.values())})
    pergunung.sort(key=lambda c: (-c["total"], c["id"]))
    per_zona = {z: agregasi(g, w, {ij: 1.0 for ij, t in tertinggi.items() if t == n}) for z, n in (("III", 3), ("II", 2), ("I", 1))}
    return {"tersedia": True, "sumber": "public/gunungapi/data/paparan_geo.json (KRB PVMBG 2018)", "n_gunung": len(pergunung),
            "catatan": "Sel tumpang antar gunung/zona dihitung sekali di zona tertinggi. 'prov_perkiraan' dari pusat kotak zona.",
            "per_gunung": pergunung, "per_zona_union": per_zona}


def susun(kini=None):
    kini = kini or dt.datetime.now(dt.timezone.utc)
    g = Grid()
    if not g.sel:
        raise SystemExit("data/terkunci/bangunan/grid_*.json belum ada: jalankan scripts/umum/bangunan.py dulu")
    w = _wil.Wilayah()
    bj, rob = banjir(g, w, kini)
    kec = json.load(open(os.path.join(GRID, "kec.json")))
    return {"dibuat": dt.datetime.now(dt.timezone(dt.timedelta(hours=7))).isoformat(timespec="seconds"),
            "sumber": kec["sumber"], "lisensi": kec["lisensi"], "ambang_keyakinan": kec["ambang_keyakinan"],
            "kehalusan": "sel 0,01 derajat (~1,1 km), titik tengah sel sebagai wakil",
            "cakupan_provinsi": sorted(g.prov), "lengkap_nasional": len(g.prov) >= len(_wil.PROVINSI),
            "total_bangunan_dalam_cakupan": sum(n for n, _ in g.sel.values()),
            "karhutla": karhutla(g, w, kini), "banjir": bj, "rob": rob, "gempa": gempa(g, w, kini), "gunungapi": gunungapi(g, w, kini)}


def tulis(doc, jalur=KELUAR):
    os.makedirs(os.path.dirname(jalur), exist_ok=True)
    s = json.dumps(doc, separators=(",", ":"), ensure_ascii=False)
    open(jalur + ".tmp", "w").write(s)
    os.replace(jalur + ".tmp", jalur)
    return len(s)


# ---------------- uji ----------------
def uji():
    g = Grid.__new__(Grid)
    g.lat0, g.lon0, g.step, g.prov, g.cache = -12.0, 94.0, 0.01, {"62"}, {}
    # sel 0,01: pusat sel (1000,1000) = (-1.995, 104.005)
    g.sel = {(1000, 1000): (10, 1000), (1000, 1003): (5, 500), (1000, 1010): (7, 700), (1100, 1000): (100, 9000)}
    kotak = [[(104.0, -2.0), (104.02, -2.0), (104.02, -1.98), (104.0, -1.98), (104.0, -2.0)]]  # sel (1000,1000),(1000,1001)
    bag = cincin({"type": "Polygon", "coordinates": kotak})
    assert sel_dalam(g, bag) == {(1000, 1000): 1.0}, "hanya sel pusat di dalam poligon"
    d = sel_dekat(g, bag, 5)
    # sel (1000,1003): pusat lon 104.035, jarak ke tepi 104.02 = 0.015 derajat ~ 1,67 km -> masuk 3 km tetapi tidak 1 km
    assert (1000, 1003) in d and 1.0 < d[(1000, 1003)] < 3.0, d
    assert (1000, 1010) not in d, "sel 12 km jauhnya harus di luar 5 km"
    assert (1100, 1000) not in d
    assert d[(1000, 1000)] == 0.0
    f = type("W", (), {"cari": staticmethod(lambda lo, la: ("62", "Kab", "Kec") if la > -2.0 else ("62", "Kab", "KecB"))})()
    a = agregasi(g, f, {(1000, 1000): 1.0, (1000, 1003): 0.5})
    assert a["bangunan"] == 12 and a["kab"] == {"62|Kab": 12}, a  # 10 + 0,5*5 = 12,5 -> round half even
    assert a["luas_m2"] == 1250, a
    # lubang: titik di dalam lubang tidak dihitung
    ber_lubang = cincin({"type": "Polygon", "coordinates": [[(0, 0), (10, 0), (10, 10), (0, 10), (0, 0)], [(4, 4), (6, 4), (6, 6), (4, 6), (4, 4)]]})
    assert di_geom(1, 1, ber_lubang) and not di_geom(5, 5, ber_lubang)
    assert 0 < jarak_km(5, 5, ber_lubang) < 120
    # MMI turun menurut jarak, band terurut
    assert _gunc.mmi_perkiraan(6.0, 10, 10, "kerak") > _gunc.mmi_perkiraan(6.0, 100, 10, "kerak")
    # umur
    assert abs(umur_jam("2026-10-12T00:00+00:00", dt.datetime(2026, 10, 13, tzinfo=dt.timezone.utc)) - 24) < 1e-6
    # grid tiruan ke berkas -> susun penuh tidak diuji di sini (butuh data); cukup bukti tulis atomik
    with tempfile.TemporaryDirectory() as t:
        assert tulis({"dibuat": "x", "a": 1}, os.path.join(t, "k.json")) > 0 and list(json.load(open(os.path.join(t, "k.json"))))[0] == "dibuat"
    print("ok")


if __name__ == "__main__":
    if "--uji" in sys.argv:
        uji()
    else:
        n = tulis(susun())
        print(f"{KELUAR}: {n:,} B")
