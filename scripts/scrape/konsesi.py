"""Konsesi (sawit, HTI, HPH, tambang) -> data/raw/konsesi/konsesi_lengkap.geojson (nama, grup, izin; TIDAK diterbitkan)
dan public/data/lahan/konsesi.geojson (nama pemegang, grup, jenis, tahun peta, wilayah, luas peta, sanksi_th; tanpa nomor izin).

Keputusan pemilik 14 Okt 2026 menyembunyikan nama perusahaan; 17 Okt 2026 nama pemegang dan grup tampil lagi
(dicek silang ke kajian WALHI, scripts/data/aktor_walhi.py). Nomor izin dan kasus per perusahaan tetap tidak diterbitkan. Fitur model sebaran "pemegang pernah disanksi" ikut
diterbitkan sebagai satu angka per poligon (sanksi_th: tahun sanksi karhutla pertama pemegangnya), tanpa nama.

Pakai:  python3 scripts/scrape/konsesi.py           # unduh (kalau belum ada di cache) + bangun + uji
        python3 scripts/scrape/konsesi.py uji       # invarian berkas hasil (tanpa jaringan)
        python3 scripts/scrape/konsesi.py publik    # tulis ulang berkas publik dari salinan lengkap (tanpa jaringan)
        python3 scripts/scrape/konsesi.py periksa   # cek silang ke layanan resmi Kemenhut (jaringan): 20 poligon acak + total

Mentah -> data/raw/konsesi/ (tidak di-commit). Sumber batas dan lisensinya lihat KONSESI.md; ringkas:
- sawit   : GFW gfw_oil_palm v20191031 (data Kementerian Kehutanan, source_yr 2012, last_updat 2014), grup dari GFW.
            Berkasnya sama dengan yang dipakai lahan.py (data/raw/lahan/gfw_oil_palm.zip).
- hti/hph : PBPH_AR_50K Mei 2026, GDB resmi Kemenhut (diterima pemilik 20 Nov 2026, boleh terbit ulang), 541 PBPH aktif.
            FCODE ZM03040240 = hutan tanaman (hti), ZM03040160 = hutan alam (hph), ZM03040280 = restorasi ekosistem /
            multiusaha (dimasukkan hph: areal hutan alam). Diubah ke GeoJSON oleh scripts/scrape/kemenhut_gdb.py.
            Batas izin lama tetap dimuat sebagai riwayat (aktif=False) HANYA bila tidak ada nama pemegang yang cocok
            dan titik wakilnya di luar semua PBPH 2026: HTI Trase v3 (2020-2022, juga sumber grup HTI) dan HPH GFW
            gfw_logging v2020 (Kemenhut 2014).
- tambang : Kemenhut PPKH_AR_50K Jan 2026 (persetujuan penggunaan kawasan hutan, jenis Tambang), layanan ArcGIS publik
            yang mengizinkan query geometri. Hanya bagian tambang DI DALAM kawasan hutan; WIUP di APL (ESDM MODI) butuh token.
Layanan ArcGIS PBPH tetap menutup geometri; GDB di atas diterima langsung dari kementerian.
"""
import json, math, os, random, re, sys, time, urllib.parse, urllib.request

AKAR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "../..")
MENTAH = os.path.join(AKAR, "data/raw/konsesi")
KELUAR = os.path.join(AKAR, "public/data/lahan")
LENGKAP = os.path.join(MENTAH, "konsesi_lengkap.geojson")  # bernama, tidak diterbitkan
SANKSI = os.path.join(MENTAH, "sanksi_karhutla.json")  # kurasi tangan, bersumber; di-commit (lihat .gitignore), tidak diterbitkan
PUBLIK_KOLOM = ("id", "nama", "grup", "jenis", "tahun_data", "aktif", "prov", "kab", "luas_peta_ha")  # nama & grup tampil lagi (pemilik, 17 Okt 2026)
sys.path.insert(0, os.path.join(AKAR, "scripts/scrape"))
sys.path.insert(0, os.path.join(AKAR, "scripts/data"))
from lahan import UNDUH, ambil, baca_shp, dp, di_dalam  # noqa: E402

KEMENHUT = "https://geoportal.planologi.kehutanan.go.id/server/rest/services/Peta_Interaktif_2026"
PBPH = KEMENHUT + "/PBPH_AR_50K/MapServer/0"
PPKH = KEMENHUT + "/PPKH_AR_50K_012026/MapServer/1"
TRASE = "https://resources.trase.earth/data/facilities-data/indonesia_wood_pulp_concessions_2020_2022_v2026_02_20.geo.json"
SAWIT_ZIP = os.path.join(AKAR, "data/raw/lahan/gfw_oil_palm.zip")
HPH_ZIP = os.path.join(AKAR, "data/raw/lahan/gfw_logging_download.zip")
PBPH_GDB = os.path.join(MENTAH, "pbph_ar_50k_052026.geojson")  # scripts/scrape/kemenhut_gdb.py
PBPH_JENIS = {"ZM03040240": ("hti", "kayu hutan tanaman (PBPH HT)"), "ZM03040160": ("hph", "kayu hutan alam (PBPH HA)"),
              "ZM03040280": ("hph", "restorasi ekosistem / multiusaha hutan (PBPH)")}
JENIS = {"sawit", "hti", "hph", "tambang"}
UA = {"User-Agent": "poskokarhutla/1.0 (+https://github.com/pangantara/poskokarhutla)"}


def arcgis(layanan, tujuan, where="1=1", geometri=True):
    """Semua fitur satu layer ArcGIS (berhalaman 1.000) -> satu GeoJSON di cache. Jeda 1 dtk antarhalaman."""
    if os.path.exists(tujuan) and os.path.getsize(tujuan) > 0:
        return json.load(open(tujuan))
    fitur, mulai = [], 0
    while True:
        q = {"where": where, "outFields": "*", "returnGeometry": str(geometri).lower(), "outSR": 4326,
             "resultOffset": mulai, "resultRecordCount": 1000, "orderByFields": "OBJECTID", "f": "geojson"}
        if geometri:
            q.update(maxAllowableOffset=0.0005, geometryPrecision=5)  # ± 55 m; tetap disederhanakan lagi di bawah
        for i in range(4):
            try:
                with urllib.request.urlopen(urllib.request.Request(f"{layanan}/query?{urllib.parse.urlencode(q)}", headers=UA), timeout=300) as r:
                    d = json.load(r)
                break
            except Exception:
                if i == 3:
                    raise
                time.sleep(10 * (i + 1))
        assert "features" in d, str(d)[:300]
        fitur += d["features"]
        if len(d["features"]) < 1000:
            break
        mulai += 1000
        time.sleep(1)
    os.makedirs(MENTAH, exist_ok=True)
    json.dump({"type": "FeatureCollection", "features": fitur}, open(tujuan, "w"))
    return {"features": fitur}


CADANGAN = os.path.join(KELUAR, "konsesi.geojson")
PPKH_JSON = os.path.join(MENTAH, "ppkh_tambang_012026.geojson")


def gfw_cadangan(awalan):
    """Fitur sawit / HPH 2014 (GFW) / tambang PPKH Jan 2026 dari berkas publik yang sudah terbit, bila mentahnya tidak
    bisa ditarik (zip GFW butuh GFW_API_KEY; layanan PPKH menutup query sejak Nov 2026).
    ponytail: luas_ha = luas peta, nomor/tanggal SK dan status hilang (berkas publik tidak memuatnya); tarik mentahnya
    untuk salinan lengkap. Datanya statis (versi bertanggal), jadi batas dan nama tidak berubah."""
    for f in json.load(open(CADANGAN))["features"]:
        if f["properties"]["id"].startswith(awalan):
            yield f


def unduh():
    os.makedirs(MENTAH, exist_ok=True)
    os.makedirs(os.path.dirname(SAWIT_ZIP), exist_ok=True)
    for url, z in ((UNDUH["gfw_oil_palm.zip"], SAWIT_ZIP), (UNDUH["gfw_logging_download.zip"], HPH_ZIP)):  # 6 MB, 252 MB
        try:
            ambil(url, z)
        except SystemExit as e:  # tanpa GFW_API_KEY: bangun() memakai sawit & HPH lama dari konsesi.geojson terbit
            print(f"{os.path.basename(z)} tidak diunduh ({e}); pakai cadangan dari {CADANGAN}", file=sys.stderr)
    ambil(TRASE, os.path.join(MENTAH, "trase_wood_pulp.geo.json"))
    try:
        arcgis(PPKH, PPKH_JSON, "JENIS_PPKH='Tambang'")
    except AssertionError as e:  # 20 Nov 2026: layanan PPKH tinggal kapabilitas Map (query ditutup)
        print(f"PPKH tidak bisa ditarik ({str(e)[:120]}); pakai cadangan dari {CADANGAN}", file=sys.stderr)


def tanya(layanan, x, y, kolom):
    """Atribut fitur layanan ArcGIS di satu titik (tanpa geometri)."""
    q = {"geometry": f"{x},{y}", "geometryType": "esriGeometryPoint", "inSR": 4326, "spatialRel": "esriSpatialRelIntersects",
         "outFields": kolom, "returnGeometry": "false", "f": "json"}
    for i in range(3):
        try:
            with urllib.request.urlopen(urllib.request.Request(f"{layanan}/query?{urllib.parse.urlencode(q)}", headers=UA), timeout=60) as r:
                return [a["attributes"] for a in json.load(r).get("features", [])]
        except Exception:
            if i == 2:
                raise
            time.sleep(5 * (i + 1))


# ---------- bantu ----------
def kunci(nama):
    """Nama perusahaan -> kunci pencocokan: 'PT. MERTJU BUANA 1' / 'Mertju Buana, PT' -> 'MERTJU BUANA'."""
    n = re.sub(r"\(.*?\)|\bD\.?\s?H\.?\b.*", " ", (nama or "").upper())  # "(PAPUA BARAT)", "D.H. nama lama"
    n = re.sub(r"[^A-Z0-9& ]", " ", n)
    n = re.sub(r"\b(PT|TBK|CV|PERSERO|KOPERASI|KOP|COY|CO|LTD|INC)\b", " ", n)
    n = re.sub(r"\bTBR\b", "TIMBER", n).replace("DJ", "J").replace("TJ", "C").replace("OE", "U")  # ejaan lama
    n = re.sub(r"(\s+(UNIT|BLOK)\b.*|\s+(\d+|I{1,3}|IV|V|VI{1,3}))+$", "", " ".join(n.split()))
    return n.replace(" ", "")  # "WANA LESTARI" = "WANALESTARI"


def rapi(nama):
    """'PT. UNI SERAYA' / 'Borneo Indobara, PT' -> 'PT Uni Seraya' / 'PT Borneo Indobara'."""
    n = " ".join((nama or "").replace("PT.", "PT ").split()).strip(" ,.")
    if re.search(r",\s*PT$", n, re.I):
        n = "PT " + re.sub(r",\s*PT$", "", n, flags=re.I)
    if n.isupper():
        n = " ".join(w if w in ("PT", "CV", "TBK", "KSO") or len(w) <= 2 and w.isalpha() and w not in ("DI", "KE") else w.capitalize() for w in n.split())
    return n


def tanggal(ms):
    if ms in (None, "", 0):
        return ""
    if isinstance(ms, (int, float)):
        import datetime as dt
        return (dt.datetime(1970, 1, 1) + dt.timedelta(milliseconds=ms + 7 * 3600e3)).date().isoformat()  # ArcGIS: UTC dari 00.00 WIB
    return str(ms)[:10]


def bulat(ha):
    return round(ha) if ha >= 10 else round(ha, 2)


def luas_ha(geom):
    """Luas bola (ha) per cincin dengan koreksi cos(lintang); lubang dikurangkan. Galat < 1% di khatulistiwa."""
    tot = 0.0
    for poli in (geom["coordinates"] if geom["type"] == "MultiPolygon" else [geom["coordinates"]]):
        for i, r in enumerate(poli):
            la = sum(p[1] for p in r) / len(r)
            a = abs(sum(r[j][0] * r[j - 1][1] - r[j - 1][0] * r[j][1] for j in range(len(r)))) / 2
            tot += (-1 if i else 1) * a * (111.32 ** 2) * math.cos(math.radians(la)) * 100
    return tot


def ringkas(geom, tol, min_luas):
    """(Multi)Polygon -> MultiPolygon disederhanakan (Douglas-Peucker), koordinat 4 desimal, luar CCW / lubang CW.
    Lubang ditentukan dari letak (cincin di dalam sejumlah ganjil cincin yang lebih besar), BUKAN dari arah putar:
    data PPKH dan sebagian shapefile GFW arah putarnya tidak konsisten. ponytail: O(n^2) per fitur, cukup untuk < 500 cincin."""
    if not geom or geom["type"] not in ("Polygon", "MultiPolygon"):
        return None
    cincin = []
    for poli in (geom["coordinates"] if geom["type"] == "MultiPolygon" else [geom["coordinates"]]):
        for r in poli:
            s = [[round(x, 4), round(y, 4)] for x, y in dp([tuple(p[:2]) for p in r], tol)]
            if s[0] != s[-1]:
                s.append(s[0])
            a = abs(sum(s[j][0] * s[j - 1][1] - s[j - 1][0] * s[j][1] for j in range(len(s)))) / 2
            if len(s) >= 4 and a >= min_luas:
                cincin.append((a, s))
    cincin.sort(key=lambda t: -t[0])
    luar, induk = [], {}
    for i, (a, s) in enumerate(cincin):
        x, y = s[0]
        isi = [j for j in range(i) if di_dalam(x, y, {"type": "Polygon", "coordinates": [cincin[j][1]]})]
        if len(isi) % 2:  # lubang dari cincin terkecil yang memuatnya
            induk.setdefault(isi[-1], []).append(s)
        else:
            luar.append(i)
    arah = lambda s, ccw: s if (sum(s[j][0] * s[j - 1][1] - s[j - 1][0] * s[j][1] for j in range(len(s))) < 0) == ccw else s[::-1]
    hasil = [[arah(cincin[i][1], True)] + [arah(h, False) for h in induk.get(i, [])] for i in luar]
    return {"type": "MultiPolygon", "coordinates": hasil} if hasil else None


def titik_wakil(geom):
    """Titik di dalam poligon terbesar: pusat kotak kalau di dalam, kalau tidak titik tengah garis-scan horizontal."""
    poli = max(geom["coordinates"], key=lambda p: len(p[0]))
    r = poli[0]
    xs, ys = [p[0] for p in r], [p[1] for p in r]
    cx, cy = (min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2
    g = {"type": "Polygon", "coordinates": poli}
    if di_dalam(cx, cy, g):
        return cx, cy
    for f in (.5, .3, .7, .2, .8):
        y = min(ys) + (max(ys) - min(ys)) * f
        xx = sorted(r[i][0] + (y - r[i][1]) * (r[i - 1][0] - r[i][0]) / (r[i - 1][1] - r[i][1])
                    for i in range(len(r)) if (r[i][1] > y) != (r[i - 1][1] > y))
        for a, b in zip(xx[::2], xx[1::2]):
            if di_dalam((a + b) / 2, y, g):
                return (a + b) / 2, y
    return r[0][0], r[0][1]


# ---------- bangun ----------
def bangun(tol=0.0015):
    from wilayah import Wilayah
    w = Wilayah()
    pbph, pbph_fitur = {}, json.load(open(PBPH_GDB))["features"]
    for f in pbph_fitur:
        p = f["properties"]
        pbph.setdefault(kunci(p["NAMOBJ"]), []).append(p)
        lama = re.search(r"\bD\.?\s?H\.?\s*([^)]+)", p["NAMOBJ"] or "")  # "PT X (D.H. NAMA LAMA)"
        if lama:
            pbph.setdefault(kunci(lama.group(1)), []).append(p)

    def resmi(nama, prov):
        """Baris PBPH Mei 2026 dengan nama sama; kalau perusahaan punya > 1 PBPH, ambil yang provinsinya sama."""
        c = pbph.get(kunci(nama), [])
        c = [p for p in c if str(p["KODE_PROV"]) == prov] or c
        return c[0] if len(c) == 1 or c and all(p["NO_SK"] == c[0]["NO_SK"] for p in c) else (c[0] if c else None)

    fitur, dibuang, diganti = [], [], 0
    kotak = []  # (xmin, ymin, xmax, ymax, fitur) PBPH 2026, untuk uji titik lokal
    for f in pbph_fitur:
        xy = [q for poli in (f["geometry"]["coordinates"] if f["geometry"]["type"] == "MultiPolygon" else [f["geometry"]["coordinates"]]) for q in poli[0]]
        kotak.append((min(q[0] for q in xy), min(q[1] for q in xy), max(q[0] for q in xy), max(q[1] for q in xy), f))

    def di_titik(x, y):
        """PBPH 2026 yang memuat titik (x, y)."""
        return [f["properties"] for a, b, c, d, f in kotak if a <= x <= c and b <= y <= d and di_dalam(x, y, f["geometry"])]

    def tambah(id_, jenis, nama, geom, min_luas, **p):
        g = ringkas(geom, tol / 3 if jenis == "tambang" else tol, min_luas)  # bukaan tambang kecil: ± 55 m
        if not g:
            return
        x, y = titik_wakil(g)
        adm = w.cari(x, y) or next((a for r in g["coordinates"][0][:1] for a in map(lambda q: w.cari(*q), r[::max(1, len(r) // 20)]) if a), None)
        if not adm:  # di luar semua kecamatan Indonesia (mis. poligon GFW berlabel IDN di Papua Nugini)
            dibuang.append(id_)
            return
        prov = adm[0]
        if nama.lower() in ("unknown", "", "-"):
            nama = "(nama pemegang tidak tercatat)"
        if jenis in ("hti", "hph") and not id_.startswith("pbph-"):  # batas izin lama (Trase / GFW 2014)
            if resmi(nama, prov) or di_titik(x, y):  # pemegangnya masih ber-PBPH atau lokasinya kini areal PBPH 2026:
                nonlocal diganti                     # batas resmi 2026 yang dipakai
                diganti += 1
                return
            p["aktif"] = False
            p["status"] = (p.get("status") + " · " if p.get("status") else "") + \
                "izin lama: tidak ada PBPH aktif di lokasi ini menurut PBPH_AR_50K Kemenhut Mei 2026 (izin kemungkinan berakhir)"
        fitur.append({"type": "Feature", "properties": {
            "id": id_, "jenis": jenis, "nama": nama, "pemegang": nama, "grup": p.get("grup", ""),
            "izin": p.get("izin", ""), "tgl_izin": p.get("tgl_izin", ""),
            "luas_ha": bulat(p.get("luas_sk") or p.get("luas") or luas_ha(g)), "luas_peta_ha": bulat(luas_ha(g)),
            "komoditas": p["komoditas"], "status": p.get("status", ""), "sumber": p["sumber"], "tahun_data": p["tahun_data"],
            "aktif": p.get("aktif"), "prov": prov, "kab": adm[1], **({"pbph_kini": p["pbph_kini"]} if p.get("pbph_kini") else {})}, "geometry": g})

    # sawit: GFW (Kemenhut 2012/2014). Nama blok "PT X 1/2" dipertahankan di id, perusahaan di nama.
    for f in ([] if os.path.exists(SAWIT_ZIP) else list(gfw_cadangan("sawit-gfw-"))):
        q = f["properties"]
        tambah(q["id"], "sawit", q["nama"], f["geometry"], 1e-5, grup=q.get("grup") or "", luas=q["luas_peta_ha"],
               komoditas="kelapa sawit", status="", sumber="Kementerian Kehutanan via Global Forest Watch (gfw_oil_palm v20191031)",
               tahun_data=q["tahun_data"])
    for p, cincin in (baca_shp(SAWIT_ZIP) if os.path.exists(SAWIT_ZIP) else []):
        if p["country"] != "IDN" or not cincin:
            continue
        g = {"type": "MultiPolygon", "coordinates": [[c] for c in cincin]}
        grup = "" if p["group_comp"] in ("", "No group", "Unknown") else p["group_comp"]
        tambah(f"sawit-gfw-{p['gfw_fid']}", "sawit", rapi(p["company"] or p["name"]), g, 1e-5,
               grup=grup, luas=float(p["area_ha"] or 0), komoditas="kelapa sawit", status="",
               sumber="Kementerian Kehutanan via Global Forest Watch (gfw_oil_palm v20191031)", tahun_data=int(p["last_updat"] or 2014))

    # HTI: Trase (2020-2022): riwayat + sumber grup perusahaan untuk PBPH HT 2026
    grup_hti = {}
    for f in json.load(open(os.path.join(MENTAH, "trase_wood_pulp.geo.json")))["features"]:
        p = f["properties"]
        aktif = [t for t in ("2020", "2021", "2022") if p.get(f"active_in_{t}") == "YES"]
        grup = "" if p["wood_supplier_corporate_group"] in ("UNKNOWN", "", None) else rapi(p["wood_supplier_corporate_group"]).title()
        if grup:
            grup_hti.setdefault(kunci(p["wood_supplier"]), grup)
        tambah(f"hti-trase-{p['wood_supplier_trase_id']}", "hti", rapi(p["wood_supplier"]), f["geometry"], 1e-5,
               grup=grup, luas=p.get("concession_area_ha"), komoditas="kayu pulp (hutan tanaman)",
               status=f"beroperasi {aktif[-1]} (Trase)" if aktif else "tidak beroperasi 2020-2022 (Trase)",
               sumber="Trase, Indonesia wood pulp concessions v3 (2026)", tahun_data=2022)

    # HPH: GFW logging (Kemenhut 2014)
    for f in ([] if os.path.exists(HPH_ZIP) else list(gfw_cadangan("hph-gfw-"))):
        q = f["properties"]
        tambah(q["id"], "hph", q["nama"], f["geometry"], 1e-5, luas=q["luas_peta_ha"], komoditas="kayu hutan alam",
               sumber="Kementerian Kehutanan via Global Forest Watch (gfw_logging v2020)", tahun_data=q["tahun_data"])
    for p, cincin in (baca_shp(HPH_ZIP) if os.path.exists(HPH_ZIP) else []):
        if p.get("country") != "IDN" or not cincin:
            continue
        g = {"type": "MultiPolygon", "coordinates": [[c] for c in cincin]}
        sk = p.get("legal_term", "").strip()
        tambah(f"hph-gfw-{p['gfw_fid']}", "hph", rapi(p.get("company") or p["name"]), g, 1e-5,
               izin=sk if re.search(r"\d", sk) else "", luas=float(p.get("area_ha") or 0), komoditas="kayu hutan alam",
               sumber="Kementerian Kehutanan via Global Forest Watch (gfw_logging v2020)", tahun_data=int(p.get("last_updat") or 2014))

    # PBPH aktif Mei 2026 (GDB resmi Kemenhut): batas HTI & HPH yang berlaku
    for i, f in enumerate(pbph_fitur):
        p = f["properties"]
        jenis, komoditas = PBPH_JENIS[p["FCODE"]]
        nama = rapi(p["NAMOBJ"])
        catatan = (p.get("REMARK") or "").strip().lower()
        tambah(f"pbph-{p['KODE_PBPH'] or i}-{i}", jenis, nama, f["geometry"], 1e-5,
               grup=grup_hti.get(kunci(nama), ""), izin=(p["NO_SK"] or "").strip(), tgl_izin=tanggal(p["TGL_SK"]),
               luas=p["LSSK"], komoditas=komoditas, aktif=p["STAT_IZIN"] == "AKTIF",
               status=f"{p['STAT_IZIN'].lower()} · {p['JENIS']} · {p['KEGIATAN']}" + (f" · {catatan}" if catatan else ""),
               sumber="Kemenhut PBPH_AR_50K Mei 2026", tahun_data=2026)
    print(f"batas izin lama diganti PBPH 2026: {diganti}", file=sys.stderr)

    # tambang: PPKH Kemenhut Jan 2026 (bagian tambang di kawasan hutan)
    for f in ([] if os.path.exists(PPKH_JSON) else list(gfw_cadangan("tambang-ppkh-"))):
        q = f["properties"]
        tambah(q["id"], "tambang", q["nama"], f["geometry"], 1e-6, luas=q["luas_peta_ha"],
               komoditas="tambang (persetujuan penggunaan kawasan hutan)", sumber="Kemenhut PPKH_AR_50K Jan 2026", tahun_data=2026)
    for f in (json.load(open(PPKH_JSON))["features"] if os.path.exists(PPKH_JSON) else []):
        p = f["properties"]
        tambah(f"tambang-ppkh-{p['ID_PPKH']}-{p['OBJECTID']}", "tambang", rapi(p["NAMA_PPKH"]), f["geometry"], 1e-6,
               izin=(p["NO_PPKH"] or "").strip(), tgl_izin=tanggal(p["TGL_PPKH"]), luas=p["LUAS_PPKH"],
               komoditas="tambang (persetujuan penggunaan kawasan hutan)",
               status=f"{(p['STATUS'] or '').lower()}{' s.d. ' + tanggal(p['TGL_BERAKHIR']) if p.get('TGL_BERAKHIR') else ''}",
               sumber="Kemenhut PPKH_AR_50K Jan 2026", tahun_data=2026)
    print(f"dibuang (di luar wilayah Indonesia): {dibuang}", file=sys.stderr)
    return fitur


def tulis(fitur):
    os.makedirs(MENTAH, exist_ok=True)
    with open(LENGKAP, "w") as f:
        json.dump({"type": "FeatureCollection", "sumber": SUMBER, "features": fitur}, f, separators=(",", ":"), ensure_ascii=False)
    publik()


def nama_baku(n):
    """Sama dengan nama_baku di scripts/sebaran/umum.py (pencocokan nama ke daftar sanksi)."""
    n = re.sub(r"\b(pt|tbk|cv|persero)\b", " ", (n or "").lower())
    n = re.sub(r"[^a-z0-9]", "", n)
    return re.sub(r"(.)\1+", r"\1", n)


def tahun_sanksi(kasus):
    """nama_baku pemegang -> tahun sanksi karhutla pertama (putusan, atau tanggal sumber tertua)."""
    th = {}
    for c in kasus:
        t = c.get("tahun_putusan") or min([int(x["tanggal"][:4]) for x in c.get("sumber", []) if x.get("tanggal")] or [9999])
        k = nama_baku(c["nama"])
        th[k] = min(th.get(k, 9999), int(t))
    return th


def tanpa_nama(fitur, sanksi):
    """Fitur bernama -> fitur publik: hanya PUBLIK_KOLOM + sanksi_th (ada hanya bila pemegangnya pernah disanksi)."""
    out = []
    for f in fitur:
        p = f["properties"]
        q = {k: p.get(k) for k in PUBLIK_KOLOM}
        t = min(sanksi.get(nama_baku(p.get("pemegang") or p.get("nama")), 9999), sanksi.get(nama_baku(p.get("nama")), 9999))
        if t < 9999:
            q["sanksi_th"] = t
        out.append({"type": "Feature", "properties": q, "geometry": f["geometry"]})
    return out


def publik():
    os.makedirs(KELUAR, exist_ok=True)
    d = json.load(open(LENGKAP))
    fitur = tanpa_nama(d["features"], tahun_sanksi(json.load(open(SANKSI))["kasus"]))
    p = os.path.join(KELUAR, "konsesi.geojson")
    with open(p, "w") as f:
        json.dump({"type": "FeatureCollection", "sumber": {k: v for k, v in SUMBER.items() if k != "izin"}, "features": fitur},
                  f, separators=(",", ":"), ensure_ascii=False)
    print(f"konsesi.geojson (publik, tanpa nama): {len(fitur)} fitur, {sum('sanksi_th' in x['properties'] for x in fitur)} "
          f"poligon pemegang pernah disanksi, {os.path.getsize(p) / 1e6:.1f} MB", file=sys.stderr)


SUMBER = {
    "sawit": "Kementerian Kehutanan (data 2012, diperbarui 2014) via Global Forest Watch, gfw_oil_palm v20191031",
    "hti": "Direktorat Bina Usaha Pemanfaatan Hutan, Ditjen PHL, Kemenhut: PBPH_AR_50K Mei 2026 (PBPH HT aktif); "
           "izin lama: Trase (2026), Indonesia wood pulp concessions v3, doi:10.48650/EJDV-8850 (CC BY 4.0)",
    "hph": "Direktorat Bina Usaha Pemanfaatan Hutan, Ditjen PHL, Kemenhut: PBPH_AR_50K Mei 2026 (PBPH HA/RE aktif); "
           "izin lama: Kementerian Kehutanan (2014) via Global Forest Watch, gfw_logging v2020",
    "tambang": "Direktorat Penggunaan Kawasan Hutan, Ditjen Planologi Kehutanan, Kemenhut: PPKH_AR_50K Jan 2026",
    "izin": "Direktorat Bina Usaha Pemanfaatan Hutan, Ditjen PHL, Kemenhut: PBPH_AR_50K Mei 2026",
}


# ---------- uji (tanpa jaringan) ----------
def uji(jalur=None):
    d = json.load(open(jalur or LENGKAP))
    fs = d["features"]
    assert len(fs) > 1000, f"hanya {len(fs)} fitur"
    ids = [f["properties"]["id"] for f in fs]
    assert len(ids) == len(set(ids)), f"{len(ids) - len(set(ids))} id ganda"
    izin_nama = {}
    for f in fs:
        p, g = f["properties"], f["geometry"]
        assert p["jenis"] in JENIS, p
        for k in ("nama", "pemegang", "komoditas", "sumber"):
            assert p[k] and p[k].strip(), (k, p["id"])
        assert 2000 <= p["tahun_data"] <= 2030, p
        assert p["luas_ha"] > 0 and p["luas_peta_ha"] > 0, ("luas tidak positif", p["id"], p["luas_ha"], p["luas_peta_ha"])
        assert g["type"] == "MultiPolygon" and g["coordinates"], p["id"]
        for poli in g["coordinates"]:
            for r in poli:
                assert len(r) >= 4 and r[0] == r[-1], ("cincin tidak tertutup", p["id"])
                for x, y in r:  # WGS84, wilayah Indonesia
                    assert 94 <= x <= 141.5 and -11.5 <= y <= 6.5, ("di luar Indonesia / bukan WGS84", p["id"], x, y)
        if p["izin"]:  # satu nomor izin boleh banyak poligon, tapi tidak boleh dipegang dua perusahaan berbeda
            izin_nama.setdefault((p["jenis"], p["izin"]), set()).add(kunci(p["nama"]))
    ganda = {k: v for k, v in izin_nama.items() if len(v) > 1}
    # PPKH: satu SK kadang mencakup beberapa pemegang (KSO); batasi supaya salah gabung massal tetap tertangkap
    assert len(ganda) <= max(5, len(izin_nama) // 50), f"{len(ganda)} nomor izin dipegang > 1 perusahaan: {list(ganda.items())[:5]}"
    jenis = {f["properties"]["jenis"] for f in fs}
    assert jenis == JENIS, jenis
    # titik yang dikenal (lokasi dari peta resmi): areal RAPP/APRIL di Pelalawan dan konsesi Arara Abadi (APP)
    hit = lambda lo, la: [f["properties"] for f in fs if di_dalam(lo, la, f["geometry"])]
    assert any(p["jenis"] == "hti" for p in hit(101.5, 1.0)), hit(101.5, 1.0)  # PT Arara Abadi (Siak/Bengkalis, Riau)
    assert not hit(106.83, -6.18), "Monas tidak mungkin konsesi"
    s = json.load(open(SANKSI))
    assert s["kasus"], "sanksi kosong"
    for k in s["kasus"]:
        assert k["nama"] and k["jenis"] in ("perdata", "pidana", "administratif", "penyegelan"), k
        assert k["sumber"] and all(u["url"].startswith("http") for u in k["sumber"]), k["nama"]
        assert k["status"], k["nama"]
    uji_publik(fs, s["kasus"])


def uji_publik(fs_lengkap, kasus):
    """Berkas publik: tidak ada nama/grup/izin, fitur & geometri sama dengan salinan lengkap, sanksi_th = hitungan dari nama."""
    # tanpa_nama sendiri: nama yang disanksi -> tahun; nama lain -> tidak ada kunci
    contoh = [{"properties": {"nama": "PT. Api Jaya", "pemegang": "PT. Api Jaya", "grup": "G", "izin": "SK.1", "jenis": "sawit"}, "geometry": None},
              {"properties": {"nama": "PT Lain", "jenis": "hti"}, "geometry": None}]
    t = tanpa_nama(contoh, tahun_sanksi([{"nama": "PT Api Jaya", "tahun_putusan": 2016, "sumber": []}]))
    assert t[0]["properties"]["sanksi_th"] == 2016 and "sanksi_th" not in t[1]["properties"], t
    assert not {"pemegang", "izin"} & set(t[0]["properties"]) and t[0]["properties"]["nama"] == "PT. Api Jaya", t
    jalur = os.path.join(KELUAR, "konsesi.geojson")
    teks = open(jalur, encoding="utf-8").read()
    d = json.loads(teks)
    for f in d["features"]:
        lebih = set(f["properties"]) - set(PUBLIK_KOLOM) - {"sanksi_th"}
        assert not lebih, f"kolom bernama/berizin bocor ke berkas publik: {lebih}"
    assert len(d["features"]) == len(fs_lengkap), f"publik {len(d['features'])} fitur != lengkap {len(fs_lengkap)}: jalankan konsesi.py publik"
    th = tahun_sanksi(kasus)
    n_s = sum(1 for f in fs_lengkap if min(th.get(nama_baku(f["properties"].get("pemegang") or f["properties"]["nama"]), 9999),
                                            th.get(nama_baku(f["properties"]["nama"]), 9999)) < 9999)
    assert n_s == sum("sanksi_th" in f["properties"] for f in d["features"]), "sanksi_th publik tidak sama dengan hitungan dari nama"
    print("ok", len(fs_lengkap), "fitur;", {j: sum(f["properties"]["jenis"] == j for f in fs_lengkap) for j in sorted(JENIS)})


# ---------- periksa (jaringan): silang ke Kemenhut ----------
def periksa(n=20, benih=7):
    """20 poligon HTI/HPH + 20 tambang acak: titik wakilnya ditanya ke layanan resmi (atribut saja, tanpa geometri)."""
    fs = json.load(open(LENGKAP))["features"]
    rnd = random.Random(benih)

    for jenis, layanan, kolom in ((("hti", "hph"), PBPH, "NAMOBJ"), (("tambang",), PPKH, "NAMA_PPKH")):
        sampel = rnd.sample([f for f in fs if f["properties"]["jenis"] in jenis], n)
        cocok = 0
        for f in sampel:
            p = f["properties"]
            x, y = titik_wakil(f["geometry"])
            r = [a[kolom] for a in tanya(layanan, x, y, kolom)]
            ok = any(kunci(p["nama"]) == kunci(a) for a in r)
            cocok += ok
            print(f"{'OK ' if ok else 'BEDA'} {p['jenis']:7} {p['nama'][:38]:38} {p['tahun_data']} -> resmi: {', '.join(r)[:60] or '(tidak ada izin di titik ini)'}")
            time.sleep(.5)
        print(f"== {'/'.join(jenis)}: {cocok}/{n} cocok dengan layanan resmi Kemenhut\n")


def rekap():
    """Jumlah dan luas per jenis x provinsi (dicetak; dipakai di KONSESI.md)."""
    fs = json.load(open(LENGKAP))["features"]
    from collections import defaultdict
    t = defaultdict(lambda: [0, 0, 0])
    for f in fs:
        p = f["properties"]
        for k in ((p["jenis"], p["prov"]), (p["jenis"], "semua")):
            t[k][0] += 1
            t[k][1] += p["luas_peta_ha"]
            t[k][2] += bool(p["izin"])
    for (j, pr), (n, ha, iz) in sorted(t.items()):
        print(f"{j:8} {pr:6} {n:5} poligon {ha / 1e3:9.0f} rb ha  izin terisi {iz / n:4.0%}")


if __name__ == "__main__":
    perintah = sys.argv[1] if len(sys.argv) > 1 else ""
    if perintah == "uji":
        uji()
    elif perintah == "publik":
        publik()
        uji()
    elif perintah == "periksa":
        periksa()
    elif perintah == "rekap":
        rekap()
    elif not os.path.exists(PBPH_GDB):  # CI (statis.yml): GDB PBPH resmi hanya ada di mesin pemilik, tidak di-commit
        print(f"::warning::{os.path.relpath(PBPH_GDB, AKAR)} tidak ada; konsesi.geojson terbit dibiarkan (jalankan "
              "scripts/scrape/kemenhut_gdb.py lalu konsesi.py di mesin yang memegang GDB Kemenhut)")
    else:
        unduh()
        tulis(bangun())
        uji()
