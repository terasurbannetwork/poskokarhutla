"""Prioritas pembasahan per Kesatuan Hidrologis Gambut (KHG) -> public/data/khg_prioritas.json

Terinspirasi paparan Rakor BNPB Kalteng 19 Okt 2026. Per KHG dihitung berapa titik panas yang jatuh DI DALAM poligonnya
(titik 7 hari, 30 hari, musim berjalan), berapa kompleks api aktif, panjang kanal OSM, dan kab/kota yang dilintasi.
Hanya KHG dengan titik musim > 0 yang terbit, urut titik 7 hari lalu titik musim.

Poligon: public/data/lahan/khg.geojson (BRGM PRIMS, scripts/scrape/khg.py). Lisensi PRIMS melarang mengubah isi poligon;
di sini poligon hanya dibaca untuk menghitung titik di dalamnya (point-in-polygon), tidak ditulis ulang.

Titik panas (sama dengan angka utama: sensor M, N, N20, semua keyakinan, hari kalender WIB, titik palsu industri sudah dibuang):
  7 hari    = semua baris public/data/hotspot.json (jendela 7 x 24 jam dari `acuan`)
  30 hari / musim = penghitung harian per KHG di public/data/khg_hari.json ({tanggal WIB: {kode KHG: n}}), dibawa antar-jalan
  lewat cache public/data (seperti harian30.json). Hari yang tertutup jendela 7 hari ditimpa dari hotspot.json; hari yang lebih tua
  diisi mundur dari FIRMS area API (maks MAKS_REQ permintaan per jalan, mulai 1 Januari) sehingga musim terkejar dalam beberapa jalan.
  `musim_lengkap` false = masih ada hari sejak 1 Januari yang belum terisi (angka musim batas bawah).

Pakai:  python3 scripts/data/khg_prioritas.py        # tulis khg_prioritas.json (butuh hotspot.json, operasi.json; FIRMS_MAP_KEY untuk isi mundur)
        python3 scripts/data/khg_prioritas.py --uji  # self-check tanpa jaringan
"""
import csv, datetime as dt, io, json, math, os, sys, time

sys.path.insert(0, os.path.dirname(__file__))
from wilayah import AKAR, PROVINSI, Poligon, Wilayah, _cincin, _di_dalam  # noqa: E402

DATA = os.path.join(AKAR, "public/data")
WIB = dt.timezone(dt.timedelta(hours=7))
UTAMA = {"VIIRS_SNPP_NRT": "N", "VIIRS_NOAA20_NRT": "N20", "MODIS_NRT": "M"}
SP = {"VIIRS_SNPP_SP": "N", "VIIRS_NOAA20_SP": "N20", "MODIS_SP": "M"}
BATAS_NRT = 55      # hari; sama dengan harian30.py (FIRMS menyimpan NRT sekitar 2 bulan)
MAKS_REQ = int(os.environ.get("KHG_MAKS_REQ", 45))       # permintaan FIRMS per jalan untuk isi mundur (3 sensor x 5 hari = 3 permintaan -> ~75 hari per jalan)
LANGKAH_KAB = 0.04  # derajat (~4,4 km): jarak contoh untuk mencari kab/kota yang dilintasi KHG
KAB_MAKS = 6


def tgl_dari_hotspot(h, tgl):
    """'MM-DD' + acuan -> 'YYYY-MM-DD' (tahun acuan WIB; mundur setahun bila melampaui tanggal acuan)."""
    a = dt.datetime.fromisoformat(h["acuan"]).astimezone(WIB).date()
    m, d = int(tgl[:2]), int(tgl[3:])
    y = a.year - 1 if (m, d) > (a.month, a.day) else a.year
    return f"{y}-{m:02d}-{d:02d}"


def hitung_titik(baris, cari, kolom):
    """-> (n_total_per_kode, {tanggal_kolom: {kode: n}}) untuk baris yang jatuh di dalam KHG. cari(lon, lat) -> kode|None."""
    total, per_hari = {}, {}
    for b in baris:
        k = cari(b[1], b[0])
        if not k:
            continue
        total[k] = total.get(k, 0) + 1
        t = kolom(b)
        per_hari.setdefault(t, {})[k] = per_hari.setdefault(t, {}).get(k, 0) + 1
    return total, per_hari


def perbarui_hari(hari, baru, batas_lengkap):
    """Hari >= batas_lengkap dari hitungan baru (jendela 7 hari menutupnya penuh, nol ikut tercatat); sisanya dari hari lama."""
    out = {t: v for t, v in hari.items() if t < batas_lengkap}
    for t in {*baru, *(t for t in hari if t >= batas_lengkap)}:
        if t >= batas_lengkap:
            out[t] = baru.get(t, {})
    return out


def isi_mundur(hari, awal, hari_ini, kunci, ambil, bbox, cari, saring=None, maks_req=MAKS_REQ):
    """Isi tanggal WIB yang belum ada dari `awal` s.d. hari_ini-1 dari FIRMS (tanggal WIB D = UTC D-1 17:00 .. D 17:00)."""
    h0 = dt.date.fromisoformat(hari_ini)
    kosong = []
    d = dt.date.fromisoformat(awal)
    while d < h0:
        if d.isoformat() not in hari:
            kosong.append(d)
        d += dt.timedelta(days=1)
    if not kosong:
        return 0
    maks_hari = (maks_req // 3) * 5 - 1
    sasaran = kosong[:maks_hari]
    u0, u1 = sasaran[0] - dt.timedelta(days=1), sasaran[-1]   # hari UTC yang harus diunduh
    blok, d = [], u0
    while d <= u1:
        n = min(5, (u1 - d).days + 1)
        sumber = UTAMA if (dt.datetime.now(dt.timezone.utc).date() - d).days <= BATAS_NRT else SP
        blok.append((d, n, [(s, f"https://firms.modaps.eosdis.nasa.gov/api/area/csv/{kunci}/{s}/{bbox}/{n}/{d}") for s in sumber]))
        d += dt.timedelta(days=n)
    lihat, hitung, utc_ok = set(), {}, set()
    for d, n, tugas in blok:
        baris = []
        try:
            for s, url in tugas:
                baris += [(s, r) for r in csv.DictReader(io.StringIO(ambil(url)))]
        except Exception as e:   # satu blok gagal: hari UTC-nya tidak ditandai, blok lain tetap dipakai
            print("khg_prioritas: gagal", d, e, file=sys.stderr)
            continue
        utc_ok |= {d + dt.timedelta(days=i) for i in range(n)}
        for s, r in baris:
            jam = r["acq_time"].zfill(4)
            t = dt.datetime.fromisoformat(f"{r['acq_date']}T{jam[:2]}:{jam[2:]}:00+00:00")
            lat, lon = round(float(r["latitude"]), 4), round(float(r["longitude"]), 4)
            if (lat, lon, t, s) in lihat:
                continue
            lihat.add((lat, lon, t, s))
            if saring and saring(lat, lon):
                continue
            k = cari(lon, lat)
            if k:
                tg = t.astimezone(WIB).date().isoformat()
                hitung.setdefault(tg, {})[k] = hitung.setdefault(tg, {}).get(k, 0) + 1
    selesai = [d for d in sasaran if d in utc_ok and d - dt.timedelta(days=1) in utc_ok]   # tanggal WIB D = UTC D-1 dan D
    for d in selesai:
        hari[d.isoformat()] = hitung.get(d.isoformat(), {})
    return len(selesai)


def jumlah(hari, dari, sampai):
    out = {}
    for t, v in hari.items():
        if dari <= t <= sampai:
            for k, n in v.items():
                out[k] = out.get(k, 0) + n
    return out


def kab_dilintasi(geom, wilayah):
    """Kab/kota (nama, kode prov) dari titik contoh tiap LANGKAH_KAB derajat di dalam poligon (+ satu titik tiap cincin)."""
    c = {}
    for r in _cincin(geom):
        xs, ys = [p[0] for p in r], [p[1] for p in r]
        pts = [(r[0][0], r[0][1]), ((min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2)]
        x = math.ceil(min(xs) / LANGKAH_KAB) * LANGKAH_KAB
        while x <= max(xs):
            y = math.ceil(min(ys) / LANGKAH_KAB) * LANGKAH_KAB
            while y <= max(ys):
                pts.append((x, y))
                y += LANGKAH_KAB
            x += LANGKAH_KAB
        for x, y in pts:
            if _di_dalam(x, y, r) or (x, y) == pts[0]:
                a = wilayah.cari(x, y)
                if a:
                    c[(a[0], a[1])] = c.get((a[0], a[1]), 0) + 1
    return c


def rakit(khg, titik7, titik30, musim, kompleks, kanal, geom_oleh_kode, wilayah, musim_lengkap):
    """khg: daftar properti {kode,nama,ha}; semua hitungan = {kode: n}. -> daftar baris terurut."""
    out = []
    for p in khg:
        k = p["kode"]
        if not musim.get(k):
            continue
        c = kab_dilintasi(geom_oleh_kode[k], wilayah)
        prov = {}
        for (pv, _), n in c.items():
            prov[pv] = prov.get(pv, 0) + n
        pv = max(prov, key=prov.get) if prov else None
        out.append({"kode": k, "nama": p["nama"], "prov": pv, "prov_nama": PROVINSI.get(pv),
                    "kab": [kb for (_, kb), _ in sorted(c.items(), key=lambda x: -x[1])[:KAB_MAKS]],
                    "luas_ha": p["ha"], "titik_7h": titik7.get(k, 0), "titik_30h": titik30.get(k, 0), "titik_musim": musim[k],
                    "kompleks_aktif": kompleks.get(k, 0), "kanal_km": round(kanal.get(k, 0.0), 1)})
    out.sort(key=lambda r: (-r["titik_7h"], -r["titik_musim"], r["kode"]))
    return out


def main():
    t0 = time.time()
    geo = json.load(open(os.path.join(DATA, "lahan/khg.geojson")))
    props = [f["properties"] for f in geo["features"]]
    geom = {f["properties"]["kode"]: f["geometry"] for f in geo["features"]}
    pol = Poligon(os.path.join(DATA, "lahan/khg.geojson"))
    def cari(lon, lat):
        p = pol.cari(lon, lat)
        return p["kode"] if p else None

    h = json.load(open(os.path.join(DATA, "hotspot.json")))
    ks = h["kolom"].index("sensor")
    baris = [b for b in h["baris"] if b[ks] in h["sensor_utama"]]
    acuan = dt.datetime.fromisoformat(h["acuan"])
    hari_ini = dt.datetime.now(WIB).date().isoformat()
    ki = h["kolom"].index("tgl_wib")
    titik7, baru = hitung_titik(baris, cari, lambda b: tgl_dari_hotspot(h, b[ki]))
    batas_lengkap = ((acuan - dt.timedelta(days=7)).astimezone(WIB).date() + dt.timedelta(days=1)).isoformat()

    jalur = os.path.join(DATA, "khg_hari.json")
    lama = json.load(open(jalur))["hari"] if os.path.exists(jalur) else {}
    hari = perbarui_hari(lama, baru, batas_lengkap)
    awal = f"{hari_ini[:4]}-01-01"
    if os.environ.get("FIRMS_MAP_KEY") or os.path.exists(os.path.join(AKAR, ".env")):
        try:
            import harian, titik_palsu as TP
            sel, _ = TP.sel_industri()
            kunci = harian.kunci()
            if not kunci:
                raise RuntimeError("FIRMS_MAP_KEY kosong")
            n = isi_mundur(hari, awal, hari_ini, kunci, harian.ambil, harian.BBOX, cari,
                           (lambda la, lo: TP.palsu(la, lo, sel)) if sel else None)
            print(f"khg_prioritas: isi mundur {n} hari", file=sys.stderr)
        except (Exception, SystemExit) as e:   # kunci hilang / FIRMS mati: jalan terus dengan hari yang ada
            print("khg_prioritas: isi mundur dilewati:", e, file=sys.stderr)
    hari = {t: v for t, v in hari.items() if t >= f"{int(hari_ini[:4]) - 1}-12-01"}   # simpan 1 Des tahun lalu s.d. kini (30 hari awal Januari)
    json.dump({"dibuat": dt.datetime.now(WIB).isoformat(timespec="minutes"), "hari": dict(sorted(hari.items()))},
              open(jalur, "w"), separators=(",", ":"))
    d0 = dt.date.fromisoformat(awal)
    n_hari = (dt.date.fromisoformat(hari_ini) - d0).days   # Jan 1 .. kemarin
    lengkap = all((d0 + dt.timedelta(days=i)).isoformat() in hari for i in range(n_hari))
    tgl_awal_ada = min((t for t in hari if t >= awal), default=None)
    t30 = jumlah(hari, (dt.date.fromisoformat(hari_ini) - dt.timedelta(days=29)).isoformat(), hari_ini)
    musim = jumlah(hari, awal, hari_ini)

    op = json.load(open(os.path.join(DATA, "operasi.json")))
    kompleks = {}
    for k in op["kompleks"]:
        if k.get("ini", 0) > 0:
            kode = cari(k["lon"], k["lat"])
            if kode:
                kompleks[kode] = kompleks.get(kode, 0) + 1
    kanal = {}
    kn = json.load(open(os.path.join(DATA, "kanal.json")))
    for la, lo, km in kn["grid"]:
        kode = cari(lo, la)
        if kode:
            kanal[kode] = kanal.get(kode, 0.0) + km

    baris_khg = rakit(props, titik7, t30, musim, kompleks, kanal, geom, Wilayah(), lengkap)
    out = {"dibuat": dt.datetime.now(WIB).isoformat(timespec="minutes"), "per": hari_ini, "acuan_titik": h["acuan"],
           "musim_tahun": int(hari_ini[:4]), "musim_lengkap": lengkap, "musim_data_dari": tgl_awal_ada,
           "sumber": "Poligon KHG: BRGM PRIMS (prims.brgm.go.id, tidak dimodifikasi); titik panas: NASA FIRMS (MODIS, VIIRS S-NPP, NOAA-20) via hotspot.json dan khg_hari.json; kanal: OpenStreetMap (ODbL) via kanal.json; kompleks: operasi.json",
           "catatan": ("Titik dihitung di dalam poligon KHG (point-in-polygon, cincin luar), sensor M/N/N20 semua keyakinan, titik industri/PLTU sudah dibuang. "
                       "titik_7h = jendela 7x24 jam dari acuan_titik; titik_30h dan titik_musim = jumlah harian WIB (khg_hari.json). "
                       + ("" if lengkap else f"Musim BELUM lengkap sejak 1 Januari (data dari {tgl_awal_ada}): titik_musim batas bawah, terisi penuh bertahap tiap jalan harian. ")
                       + "kompleks_aktif = kompleks operasi.json (titik tengah) dengan deteksi hari ini > 0 yang jatuh di KHG. "
                       "kanal_km = jumlah panjang kanal/parit OSM pada sel 0,02 derajat yang titik tengahnya di KHG (perkiraan kasar, +-2 km per sel). "
                       "kab = kab/kota yang dilintasi menurut titik contoh tiap 4,4 km (maks 6, urut luas contoh), prov = yang terbanyak. "
                       "Hanya KHG dengan titik_musim > 0; urut titik_7h lalu titik_musim. Prioritas pembasahan = di mana titik, kompleks, dan kanal bertemu."),
           "khg": baris_khg}
    p = os.path.join(DATA, "khg_prioritas.json")
    json.dump(out, open(p, "w"), ensure_ascii=False, separators=(",", ":"))
    print(f"khg_prioritas.json {len(baris_khg)} KHG, {os.path.getsize(p) / 1e3:.0f} KB, khg_hari {os.path.getsize(jalur) / 1e3:.0f} KB, {time.time() - t0:.1f} dtk")


def uji():
    # tanggal hotspot: tahun dari acuan, mundur setahun bila melampaui
    h = {"acuan": "2026-01-03T05:00:00+00:00"}
    assert tgl_dari_hotspot(h, "01-02") == "2026-01-02" and tgl_dari_hotspot(h, "12-30") == "2025-12-30"
    # point-in-polygon + hitung per hari lewat Poligon sungguhan (berkas sementara)
    import tempfile
    sq = lambda x, y, s: [[[x, y], [x + s, y], [x + s, y + s], [x, y + s], [x, y]]]
    fc = {"type": "FeatureCollection", "features": [
        {"type": "Feature", "properties": {"kode": "A", "nama": "KHG A", "ha": 100}, "geometry": {"type": "MultiPolygon", "coordinates": [sq(100, -3, 1)]}},
        {"type": "Feature", "properties": {"kode": "B", "nama": "KHG B", "ha": 50}, "geometry": {"type": "MultiPolygon", "coordinates": [sq(110, -2, 1)]}}]}
    with tempfile.TemporaryDirectory() as d:
        p = os.path.join(d, "k.geojson")
        json.dump(fc, open(p, "w"))
        pol = Poligon(p)
        cari = lambda lon, lat: (pol.cari(lon, lat) or {}).get("kode")
        assert cari(100.5, -2.5) == "A" and cari(110.5, -1.5) == "B" and cari(105, 0) is None
        # batas bbox: titik di bbox tapi di luar cincin tidak dihitung
        tri = {"type": "Polygon", "coordinates": [[[0, 0], [1, 0], [0, 1], [0, 0]]]}
        assert _di_dalam(0.2, 0.2, tri["coordinates"][0]) and not _di_dalam(0.9, 0.9, tri["coordinates"][0])
    baris = [[-2.5, 100.5, -1, "N", 1, 1, 0, "01-02"], [-2.4, 100.4, -1, "N", 1, 1, 0, "01-02"], [-1.5, 110.5, -1, "M", 1, 1, 0, "01-03"], [0, 105, 0, "N", 1, 1, 0, "01-03"]]
    tot, ph = hitung_titik(baris, cari, lambda b: "2026-" + b[7])
    assert tot == {"A": 2, "B": 1} and ph == {"2026-01-02": {"A": 2}, "2026-01-03": {"B": 1}}, (tot, ph)
    # gabung hari: >= batas ditimpa (termasuk jadi kosong), < batas dipertahankan
    lama = {"2026-01-01": {"A": 9}, "2026-01-02": {"A": 99}, "2026-01-03": {"A": 7}}
    g = perbarui_hari(lama, ph, "2026-01-02")
    assert g == {"2026-01-01": {"A": 9}, "2026-01-02": {"A": 2}, "2026-01-03": {"B": 1}}, g
    g2 = perbarui_hari({"2026-01-04": {"A": 5}}, {}, "2026-01-04")
    assert g2 == {"2026-01-04": {}}, g2
    # isi mundur dengan FIRMS palsu: 3 hari UTC dengan 1 titik di A, hari kosong tetap tercatat, titik palsu disaring, 2 sensor tak dobel
    csv_ = "latitude,longitude,acq_date,acq_time\n-2.5,100.5,2026-01-02,0100\n-2.5,100.5,2026-01-02,0100\n-2.5,100.6,2026-01-02,2000\n-2.4,100.4,2026-01-03,0300\n"
    dipanggil = []
    def ambil(url):
        dipanggil.append(url)
        return csv_
    hari = {}
    n = isi_mundur(hari, "2026-01-02", "2026-01-04", "KEY", ambil, "94,-11.5,141.5,6.5", cari, lambda la, lo: abs(lo - 100.4) < 1e-6)
    assert n == 2 and len(dipanggil) == 3, (n, len(dipanggil))
    # 01-02 WIB = UTC 01-01 17:00 .. 01-02 17:00: titik 0100 dan (-2.5,100.5) hitung 1 (dedup per sensor); 2000 UTC => 01-03 WIB
    assert hari["2026-01-02"] == {"A": 3} and hari["2026-01-03"] == {"A": 3}, hari  # 3 sensor palsu menjawab sama; duplikat dalam satu sensor dibuang
    # gagal unduh = tidak ada hari yang ditandai selesai
    hari2 = {}
    def rusak(url):
        raise RuntimeError("mati")
    assert isi_mundur(hari2, "2026-01-02", "2026-01-04", "KEY", rusak, "b", cari) == 0 and not hari2
    s = jumlah({"2026-01-01": {"A": 1}, "2026-01-05": {"A": 2, "B": 1}, "2026-02-01": {"A": 4}}, "2026-01-01", "2026-01-31")
    assert s == {"A": 3, "B": 1}, s
    # rakit: hanya musim > 0, urut 7h lalu musim
    class W:
        def cari(self, lon, lat):
            return ("62", "Kapuas", "X")
    gm = {"A": fc["features"][0]["geometry"], "B": fc["features"][1]["geometry"], "C": fc["features"][0]["geometry"]}
    khg = [{"kode": k, "nama": "KHG " + k, "ha": 1} for k in "ABC"]
    r = rakit(khg, {"A": 1, "B": 5}, {}, {"A": 10, "B": 2}, {"B": 1}, {"B": 3.14}, gm, W(), True)
    assert [x["kode"] for x in r] == ["B", "A"] and r[0]["kab"] == ["Kapuas"] and r[0]["prov"] == "62" and r[0]["kanal_km"] == 3.1 and r[0]["kompleks_aktif"] == 1, r
    print("khg_prioritas: uji lolos")


if __name__ == "__main__":
    if "--uji" in sys.argv[1:] or "uji" in sys.argv[1:]:
        uji()
    else:
        main()
