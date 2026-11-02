"""Nowcast banjir Jakarta per kecamatan, tenggang 1-6 jam. FASE 1: inventaris + fitur BEBAS LABEL. Protokol: scripts/banjir/PRAREG-NOWCAST-JKT.md.

  inventaris [--arsip DIR]... [--cap FILE] [--jaringan]   sumber, rentang, frekuensi; PetaBencana HANYA jumlah laporan per bulan
  tempuh [--arsip DIR]...                                  korelasi silang kenaikan pos hulu vs hilir per jeda 0-12 jam (tanpa label)
  fitur --t ISO [--arsip DIR]... [--cap FILE]              fitur 42 kecamatan daratan DKI pada waktu terbit t (JSON ke stdout)
  imerg_latensi [--hari YYYY-MM-DD]                        latensi nyata IMERG Early dari daftar folder publik GES DISC (tanpa token)
  imerg_unduh --bulan YYYY-MM [--maks N]                   JALUR A: IMERG Early 30 menit, kotak Jakarta 7x7 sel lewat OPeNDAP (EARTHDATA_TOKEN; tanpa token keluar 0)
  fitur_hujan --t ISO                                      JALUR A: fitur hujan IMERG 42 kecamatan pada t (latensi LAT_IMERG)
  uji                                                      swa-uji luring (pembeda latensi + kausal, korelasi silang, hitung bulanan, musim)

  sidik | jangkar [--amandemen "A<n>: alasan"]            cetak sidik | sesi induk sesudah push: tulis nowcast_jkt_sidik.json; ulang hanya beramandemen
  latih --jalur A | nilai --jalur A                        DITOLAK sebelum kunci sah (muat_label); nilai hanya sekali (penanda nowcast_jkt.buka)
  daya [--ulang N] [--B N]                                 sintetik daya syarat 3 (kemiringan kalibrasi), tanpa label

Fase 1: tidak ada parameter yang disetel pada label. Lokasi/waktu laporan hanya dibaca muat_label(perans), yang menolak sebelum kunci (PRAREG A.5); latih tak pernah memuat musim uji.
Data yang boleh dipakai pada t: hanya yang tersedia sebelum t menurut latensi nyata (konstanta LAT_* di bawah, dibekukan oleh PRAREG).
Arsip TMA: data/raw/banjir/arsip_pos/YYYY/MM/*.jsonl.gz (arsip_pos.py; R2 arsip/pos_sungai/). CAP: GET /api/cuaca/arsip (D1 cuaca_arsip, 0021).
GSMaP NRT jam: data/banjir/genangan/j4_hujan_jam.jsonl (ditulis j4_operasi.py, beku J4: hanya DIBACA).
"""
import argparse, datetime as dt, glob, gzip, json, math, os, sys, urllib.parse, urllib.request

AYAH = os.path.dirname(os.path.abspath(__file__))
AKAR = os.path.abspath(os.path.join(AYAH, "../.."))
ARSIP_POS = os.path.join(AKAR, "data/raw/banjir/arsip_pos")
META_POS = os.path.join(ARSIP_POS, "pos_meta.json")
CACHE = os.path.join(AKAR, "data/raw/banjir/nowcast_jkt")            # git-ignore (data/raw/banjir/*)
CAP_BERKAS = os.path.join(CACHE, "cap_arsip.json")
GSMAP_JAM = os.path.join(AKAR, "data/banjir/genangan/j4_hujan_jam.jsonl")
PB_BANJIR = os.path.join(AKAR, "data/raw/banjir/genangan/petabencana_banjir.json")   # tersaring latihan (petabencana.saring), belum tanpa J3
PUSAT_KEC = os.path.join(AKAR, "public/banjir/data/pusat_kec.json")
API_CAP = "https://centurisk97.id/api/cuaca/arsip?dari={a}&sampai={b}"
WIB = dt.timezone(dt.timedelta(hours=7))

# ---- dibekukan oleh PRAREG-NOWCAST-JKT.md bagian 3 (latensi) dan 4 (fitur); ubah = amandemen tertulis sebelum sidik
TENGGANG = (1, 2, 3, 4, 6)          # jam; label (t, t+L]
UTAMA = 3
LAT_TMA = 3600                      # bacaan berstempel s dipakai bila s <= t - LAT_TMA (Worker memanen DSDA menit 38, SIHKA menit 23, tiap jam)
LAT_GSMAP = 4 * 3600                # jam GSMaP [h, h+1) dipakai bila h + 1 jam + LAT_GSMAP <= t (klaim JAXA; belum terukur)
JANGKAU_LOKAL_KM = 4.0              # pos DSDA berambang terdekat dari pusat kecamatan
HULU = {"katulampa": ["d:116", "0edd55d4-53f7-4ece-b036-21f5d42ece64"],      # DSDA dulu, SIHKA cadangan
        "depok": ["d:118", "7d449a1b-77d7-436e-80e2-ee9824a98228"]}
RANTAI = [("katulampa", "depok"), ("depok", "manggarai"), ("katulampa", "manggarai")]
POS_RANTAI = dict(HULU, manggarai=["d:122", "ba102072-b9f8-4726-a5ab-652cc3c99c7e"])
BULAN_TERLARANG = {"2024-08", "2025-04"}      # bulan berjendela uji J3 (PRAREG-J3): dibuang SELURUHNYA dari hitungan dan arsip
AWAL_J4 = dt.datetime(2026, 10, 28, tzinfo=WIB)
# ---- JALUR A (hujan saja, arsip memutuskan): PRAREG bagian A
LAT_IMERG = 6 * 3600                # slot 30 menit berakhir e dipakai bila e + LAT_IMERG <= t. Terukur 11-31 Okt 2026 (21 hari, 1.008 slot, 3 akhir pekan): p50 4,45 p99 4,93 maks 6,23 jam -> p99 + 1 jam, dibulatkan ke atas
IMERG_V07C_MULAI = dt.datetime(2026, 3, 4, tzinfo=dt.timezone.utc)   # daftar folder: 2026/062 V07B, 2026/063 V07C; tak ada hari tumpang
IMERG_BASE = "https://gpm1.gesdisc.eosdis.nasa.gov"
IMERG_KOL = "GPM_3IMERGHHE.07"      # Early Run 30 menit: algoritme yang sama dengan operasional (arsip V07B, operasional V07C)
I_LON, I_LAT = (2865, 2871), (834, 840)   # lon -179,95 + 0,1 i = 106,55..107,15; lat -89,95 + 0,1 j = -6,55..-5,95 (49 sel, memuat 42 pusat kecamatan)
IMERG_DIR = os.path.join(CACHE, "imerg")
BULAN_TERLIHAT_A = {"2025-03"}      # kejadian J1/J2 (bersama.KEJADIAN) di musim uji: labelnya pernah dibaca, keluar dari uji jalur A
SIDIK_DAFTAR = ["scripts/banjir/PRAREG-NOWCAST-JKT.md", "scripts/banjir/nowcast_jkt.py", "scripts/banjir/genangan/petabencana.py",
                "scripts/banjir/lab_genangan_radar.py", "scripts/banjir/genangan/bersama.py", "scripts/banjir/genangan/mesin.mjs",
                "scripts/banjir/genangan/kunci_j4.py", "scripts/banjir/wilayah.py", "scripts/banjir/umum.py",
                "public/geo/kecamatan/31.json", "public/banjir/data/pusat_kec.json"]   # semua yang membentuk label, jendela J3, kec, git-cek
SLOPE_GAGAL_MAKS = 0.05             # > 5% resampel kemiringan terpisah sempurna = syarat 3 gagal
SIDIK_KUNCI = os.path.join(AYAH, "nowcast_jkt_sidik.json")
MODEL_BERKAS = os.path.join(AYAH, "nowcast_jkt_model.json")
BUKA = os.path.join(AYAH, "nowcast_jkt.buka")
MODEL = ("klim", "persistensi", "hujan")      # hujan = persistensi + hujan IMERG (pembanding a3 = persistensi + klim)
PERSIST_JAM = 3                     # persistensi: laporan dalam (t-3j, t], sama untuk semua L
BURST_KAUSAL = 20                   # = petabencana.BURST_MAKS, tetapi dihitung kumulatif sampai t
PSEUDO, LAMBDA = 20, 1.0
BOOT_B, B_SLOPE, BENIH, ALFA = 10000, 1000, 20261101, 0.05
BLOK_HARI, EPISODE_JEDA_HARI, MIN_EPISODE = 5, 2, 20
SLOPE_RENTANG, HILANG_MAKS = (0.7, 1.4), 0.10
MUSIM = {"latih": ("2016/17", "2017/18", "2018/19", "2019/20"), "validasi": ("2020/21", "2021/22"),
         "uji": ("2022/23", "2023/24", "2024/25", "2025/26")}       # Nov-Apr; bulan J3 (2025-04) dan >= jangkar J4 (j4_sidik.json, 28 Okt 2026) tetap dibuang


def epoch(x):
    return int(x.timestamp()) if isinstance(x, dt.datetime) else int(x)


def iso_t(s):
    s = s.replace("Z", "+00:00")
    if "." in s:                                   # python 3.9: pecahan harus 3/6 digit
        a, b = s.split(".", 1); tz = b[b.find("+"):] if "+" in b else ""
        s = a + tz
    t = dt.datetime.fromisoformat(s)
    return t if t.tzinfo else t.replace(tzinfo=WIB)


# ------------------------------------------------------------------ baca arsip (tanpa label)
def baca_tma(dirs, pos=None):
    """{pos: [(t, v)] terurut} dari semua *.jsonl.gz di dirs (berkas 0 byte dilewati; dedup (pos, t))."""
    out = {}
    for d in dirs:
        for f in sorted(glob.glob(os.path.join(d, "**", "*.jsonl.gz"), recursive=True)):
            if os.path.getsize(f) == 0:
                continue
            for l in gzip.open(f, "rt"):
                r = json.loads(l)
                if pos is None or r["pos"] in pos:
                    out.setdefault(r["pos"], {})[r["t"]] = r["v"]
    return {p: sorted(s.items()) for p, s in out.items()}


def meta_pos(jalur=META_POS):
    try:
        return {r["pos"]: r for r in json.load(open(jalur))["pos"]}
    except (OSError, ValueError, KeyError):
        return {}


def baca_cap(jalur=CAP_BERKAS):
    try:
        return json.load(open(jalur))
    except (OSError, ValueError):
        return []


def unduh_cap(dari, sampai, jalur=CAP_BERKAS):
    """Arsip CAP publik per hari (1 permintaan/hari, maks 1000 baris; terpotong = galat keras). Tulis cache, -> baris."""
    semua, d = {}, dari
    while d <= sampai:
        q = urllib.request.Request(API_CAP.format(a=d, b=d), headers={"User-Agent": "centurisk97-nowcast-jkt/1"})
        j = json.load(urllib.request.urlopen(q, timeout=60))
        if j.get("terpotong"):
            raise RuntimeError(f"arsip CAP {d} terpotong")
        for r in j["arsip"]:
            semua[r["id"]] = r
        d += dt.timedelta(days=1)
    os.makedirs(os.path.dirname(jalur), exist_ok=True)
    rows = sorted(semua.values(), key=lambda r: r["mulai"])
    json.dump(rows, open(jalur, "w"), ensure_ascii=False)
    return rows


def baca_gsmap(jalur=GSMAP_JAM):
    """-> {(lat, lon): {jam_mulai_epoch: mm}} dari j4_hujan_jam (jam i = [00.00+i, +1) WIB hari itu; sel lintang utara->selatan lalu bujur)."""
    out = {}
    try:
        L = [json.loads(l) for l in open(jalur)]
    except OSError:
        return out
    for g in L:
        a = dt.datetime.fromisoformat(g["tanggal"] + "T00:00:00+07:00")
        for i, jam in enumerate(g["mm"]):
            if jam is None:
                continue
            h = epoch(a + dt.timedelta(hours=i))
            for k, v in enumerate(jam):
                if v is not None:
                    la, lo = g["lat"][k // len(g["lon"])], g["lon"][k % len(g["lon"])]
                    out.setdefault((la, lo), {})[h] = v
    return out


def kecamatan(jalur=PUSAT_KEC):
    """42 kecamatan daratan DKI -> (lat, lon) pusat."""
    d = json.load(open(jalur))
    return {k: tuple(v) for k, v in d.items() if k.startswith("31|") and "Seribu" not in k}


# ------------------------------------------------------------------ fitur kausal
def tersedia(seri, t, lat=LAT_TMA):
    """bacaan yang boleh dipakai pada t: stempel <= t - lat."""
    b = epoch(t) - lat
    return [(s, v) for s, v in seri if s <= b]


def naik(seri, t, jam, lat=LAT_TMA):
    """kenaikan v(terakhir) - v(terakhir - jam) memakai bacaan tersedia; titik pembanding = bacaan terdekat dalam +-20 menit. None bila tak ada."""
    s = tersedia(seri, t, lat)
    if not s:
        return None
    t1, v1 = s[-1]
    if t1 < epoch(t) - lat - 2 * 3600:            # bacaan terakhir terlalu tua (> 2 jam di luar latensi): tidak dipakai
        return None
    sasaran = t1 - jam * 3600
    cocok = [(abs(x - sasaran), v) for x, v in s if abs(x - sasaran) <= 1200]
    return round(v1 - min(cocok)[1], 1) if cocok else None


def km(a, b):
    (la1, lo1), (la2, lo2) = a, b
    x = math.radians(lo2 - lo1) * math.cos(math.radians((la1 + la2) / 2)); y = math.radians(la2 - la1)
    return 6371 * math.hypot(x, y)


def dalam_poligon(lon, lat, cincin):
    ada = False
    for (x1, y1), (x2, y2) in zip(cincin, cincin[1:] + cincin[:1]):
        if (y1 > lat) != (y2 > lat) and lon < x1 + (lat - y1) * (x2 - x1) / (y2 - y1):
            ada = not ada
    return ada


def cap_aktif(cap, lat, lon, t):
    """1 bila ada CAP yang SUDAH TERLIHAT (pertama_dilihat <= t) dan berlaku (mulai <= t < selesai) menutupi titik; poligon, bbox bila tanpa poligon."""
    for r in cap:
        if not (iso_t(r["pertama_dilihat"]) <= t and iso_t(r["mulai"]) <= t < iso_t(r["selesai"])):
            continue
        if r.get("poligon"):
            if any(dalam_poligon(lon, lat, c) for c in r["poligon"]):
                return 1
        elif r.get("bbox") and r["bbox"][0] <= lon <= r["bbox"][2] and r["bbox"][1] <= lat <= r["bbox"][3]:
            return 1
    return 0


def gsmap_terakhir(gs, lat, lon, t, jam=3, latg=LAT_GSMAP):
    """jumlah `jam` jam GSMaP terakhir yang tersedia pada t di sel terdekat (None bila salah satu hilang); + umur jam terakhir (jam)."""
    if not gs:
        return None, None
    sel = min(gs, key=lambda c: km(c, (lat, lon)))
    b = epoch(t) - latg - 3600                    # jam mulai terbaru yang boleh
    akhir = b - b % 3600
    v = [gs[sel].get(akhir - i * 3600) for i in range(jam)]
    return (None if None in v else round(sum(v), 2)), round((epoch(t) - akhir) / 3600, 1)


def pilih_seri(tma, ids):
    for p in ids:
        if tma.get(p):
            return p, tma[p]
    return None, []


def fitur(t, tma, meta, cap, gs, kec):
    """-> [{kec, ...}] pada waktu terbit t. Hanya memakai masukan yang tersedia sebelum t (LAT_*). Tidak membaca label."""
    hulu = {}
    for nama, ids in HULU.items():
        p, s = pilih_seri(tma, ids)
        hulu[nama] = {"pos": p, **{f"naik{j}": naik(s, t, j) for j in (1, 2, 3)}}
    lokal = [(p, (m["lat"], m["lon"]), m["a3"]) for p, m in meta.items() if p.startswith("d:") and m.get("lat") and m.get("a3")]
    out = []
    for k, (la, lo) in sorted(kec.items()):
        f = {"kec": k, "t": t.isoformat()}
        dekat = sorted((km((la, lo), c), p, a3) for p, c, a3 in lokal)
        if dekat and dekat[0][0] <= JANGKAU_LOKAL_KM:
            jr, p, a3 = dekat[0]; s = tersedia(tma.get(p, []), t)
            f.update(pos_lokal=p, jarak_km=round(jr, 1), naik3_lokal=naik(tma.get(p, []), t, 3),
                     rasio_siaga3=round(s[-1][1] / a3, 3) if s and s[-1][0] >= epoch(t) - LAT_TMA - 7200 else None)
        else:
            f.update(pos_lokal=None, jarak_km=None, naik3_lokal=None, rasio_siaga3=None)
        for nama, h in hulu.items():
            for j in (1, 2, 3):
                f[f"{nama}_naik{j}"] = h[f"naik{j}"]
        f["cap_aktif"] = cap_aktif(cap, la, lo, t)
        f["gsmap3"], f["gsmap_umur_jam"] = gsmap_terakhir(gs, la, lo, t)
        out.append(f)
    return out


# ------------------------------------------------------------------ waktu tempuh hulu-hilir (tanpa label)
def per_jam(seri):
    """{jam_epoch: v} bacaan terakhir di tiap jam."""
    o = {}
    for s, v in seri:
        o[s - s % 3600] = v
    return o


def korelasi_silang(hulu, hilir, maks=12):
    """korelasi Pearson kenaikan 1 jam hulu(h) vs hilir(h + jeda), jeda 0..maks; hanya jam berpasangan lengkap. -> [(jeda, r, n)]"""
    a, b = per_jam(hulu), per_jam(hilir)
    da = {h: a[h] - a[h - 3600] for h in a if h - 3600 in a}
    db = {h: b[h] - b[h - 3600] for h in b if h - 3600 in b}
    out = []
    for j in range(maks + 1):
        p = [(da[h], db[h + j * 3600]) for h in da if h + j * 3600 in db]
        n = len(p)
        if n < 24:
            out.append((j, None, n)); continue
        mx, my = sum(x for x, _ in p) / n, sum(y for _, y in p) / n
        sx = math.sqrt(sum((x - mx) ** 2 for x, _ in p)); sy = math.sqrt(sum((y - my) ** 2 for _, y in p))
        out.append((j, None if not sx or not sy else round(sum((x - mx) * (y - my) for x, y in p) / (sx * sy), 3), n))
    return out


# ------------------------------------------------------------------ hitung bulanan PetaBencana (daya uji; TANPA lokasi/waktu per kejadian)
def hitung_bulanan(laporan, jendela):
    """laporan tersaring -> {YYYY-MM: n}. Jendela uji J3 dibuang SEGERA (tanpa_j3), bulan J3 dibuang utuh, >= jangkar J4 dibuang."""
    from lab_genangan_radar import tanpa_j3
    laporan = tanpa_j3(laporan, jendela)
    n = {}
    for r in laporan:
        b = r["t"][:7]
        if b in BULAN_TERLARANG or iso_t(r["t"]) >= AWAL_J4:
            continue
        n[b] = n.get(b, 0) + 1
    return dict(sorted(n.items()))



# ------------------------------------------------------------------ JALUR A: musim, IMERG, fitur hujan (tanpa label)
def musim(t):
    """datetime WIB -> '2016/17' untuk Nov-Apr, None di luar musim."""
    y, m = t.year, t.month
    if m >= 11:
        return f"{y}/{str(y + 1)[2:]}"
    return f"{y - 1}/{str(y)[2:]}" if m <= 4 else None


def peran(t, L=0):
    """'latih'|'validasi'|'uji'|None untuk unit terbit t dengan jendela label (t, t+L]. None bila t ATAU t+L jatuh di bulan J3/terlihat,
    di masa J4, di luar Nov-Apr, atau beda musim."""
    u = t + dt.timedelta(hours=L)
    for x in (t, u):
        if f"{x:%Y-%m}" in BULAN_TERLARANG | BULAN_TERLIHAT_A or x >= AWAL_J4 or musim(x) != musim(t):
            return None
    m = musim(t)
    return next((k for k, v in MUSIM.items() if m in v), None)


def berkas_imerg(html, tgl):
    """daftar folder hari -> [(akhir_slot_utc datetime, nama, mtime_utc atau None)]"""
    import re
    out = []
    for m in re.finditer(r'(3B-HHR-E\.MS\.MRG\.3IMERG\.(\d{8})-S\d{6}-E(\d{6})\.\d{4}\.V07[A-Z]\.HDF5)</a></td><td align="right">(\d{4}-\d\d-\d\d \d\d:\d\d)?', html):
        e = dt.datetime.strptime(m.group(2) + m.group(3), "%Y%m%d%H%M%S").replace(tzinfo=dt.timezone.utc) + dt.timedelta(seconds=1)
        mt = dt.datetime.strptime(m.group(4), "%Y-%m-%d %H:%M").replace(tzinfo=dt.timezone.utc) if m.group(4) else None
        out.append((e, m.group(1), mt))
    return out


def folder_imerg(tgl):
    return f"{IMERG_BASE}/data/GPM_L3/{IMERG_KOL}/{tgl:%Y}/{tgl.timetuple().tm_yday:03d}/"


def ambil_publik(url):
    return urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "centurisk97-nowcast-jkt/1"}), timeout=90).read().decode("utf-8", "replace")


def latensi_imerg(berkas):
    """[(e, nama, mtime)] -> jam (mtime - e), terurut. Asumsi: mtime daftar folder dalam UTC (nilai negatif = asumsi salah)."""
    return sorted((mt - e).total_seconds() / 3600 for e, _, mt in berkas if mt)


def baris_gz(f):
    """-> (baris json utuh, rusak?). Ekor gzip terpotong (job terbunuh) dibuang, bukan galat."""
    out = []
    try:
        for l in gzip.open(f, "rt"):
            out.append(json.loads(l))
    except (EOFError, OSError, ValueError):
        return out, True
    return out, False


def baca_imerg(dirs=None):
    """{(lat, lon): {akhir_slot_epoch: mm/jam}} dari imerg/YYYY-MM.jsonl.gz (baris {e, v[49]}; v urut i bujur lalu j lintang; null = hilang)."""
    out = {}
    nj = I_LAT[1] - I_LAT[0] + 1
    for f in sorted(glob.glob(os.path.join(dirs or IMERG_DIR, "*.jsonl.gz"))):
        for r in baris_gz(f)[0]:
            for k, v in enumerate(r["v"]):
                if v is not None:
                    i, j = I_LON[0] + k // nj, I_LAT[0] + k % nj
                    out.setdefault((round(-89.95 + 0.1 * j, 2), round(-179.95 + 0.1 * i, 2)), {})[r["e"]] = v
    return out


def hujan_imerg(seri, lat, lon, t, lat_s=LAT_IMERG):
    """fitur hujan dari slot 30 menit (mm/jam) di sel terdekat, hanya slot berakhir <= t - lat_s:
    h1 = mm 1 jam terakhir tersedia, h3/h6 = mm 3/6 jam, a24 = mm 24 jam SEBELUM jendela 6 jam, umur = jam dari akhir slot terbaru ke t.
    Slot hilang di jendela = None (tidak dihitung 0)."""
    if not seri:
        return {"h1": None, "h3": None, "h6": None, "a24": None, "umur": None}
    s = seri[min(seri, key=lambda c: km(c, (lat, lon)))]
    b = epoch(t) - lat_s
    akhir = b - b % 1800
    def mm(jam, geser=0):
        v = [s.get(akhir - (geser + i) * 1800) for i in range(int(jam * 2))]
        return None if None in v else round(sum(v) / 2, 2)      # laju mm/jam x 0,5 jam
    return {"h1": mm(1), "h3": mm(3), "h6": mm(6), "a24": mm(24, 12), "umur": round((epoch(t) - akhir) / 3600, 2)}


def unduh_imerg_bulan(bulan, ambil, maks=None, dirk=IMERG_DIR, ambil_daftar=ambil_publik):
    """semua slot 30 menit bulan YYYY-MM (hari UTC) -> imerg/YYYY-MM.jsonl.gz (gzip beranggota banyak, ditambah per baris); melanjutkan. -> (baru, gagal)"""
    sys.path.insert(0, os.path.join(AKAR, "scripts/cuaca"))
    from imerg import parse                                 # pengurai ASCII DAP2 milik cuaca-udara (dipakai, tidak disalin)
    os.makedirs(dirk, exist_ok=True)
    f = os.path.join(dirk, f"{bulan}.jsonl.gz")
    lama, rusak = baris_gz(f) if os.path.exists(f) else ([], False)
    if rusak:                                                # tulis ulang bagian yang utuh lalu lanjut
        with gzip.open(f, "wt") as g:
            g.writelines(json.dumps(r, separators=(",", ":")) + "\n" for r in lama)
    ada = {r["e"] for r in lama}
    ni, nj = I_LON[1] - I_LON[0] + 1, I_LAT[1] - I_LAT[0] + 1
    a = dt.date.fromisoformat(bulan + "-01"); d, baru, gagal = a, 0, 0
    q = f"precipitation[0:0][{I_LON[0]}:{I_LON[1]}][{I_LAT[0]}:{I_LAT[1]}]"
    with gzip.open(f, "at") as out:
        while d.month == a.month and (maks is None or baru < maks):
            for e, nama, _ in berkas_imerg(ambil_daftar(folder_imerg(d)), d):
                if epoch(e) in ada or (maks is not None and baru >= maks):
                    continue
                u = folder_imerg(d).replace("/data/", "/opendap/") + nama + ".ascii?" + urllib.parse.quote(q, safe=":")
                try:
                    teks = ambil(u); n = parse(teks)
                except Exception as x:
                    gagal += 1; print(f"  {nama}: {x}", file=sys.stderr); continue
                if not n:
                    gagal += 1
                    if gagal <= 2:                                   # diagnosa: balasan apa yang tak terurai
                        print(f"  {nama}: balasan tak terurai ({len(teks)} karakter) {u}\n  {teks[:400]!r}", file=sys.stderr)
                    continue
                v = [n.get((k // nj, k % nj)) for k in range(ni * nj)]
                out.write(json.dumps({"e": epoch(e), "v": [None if x is None else round(x, 2) for x in v]}, separators=(",", ":")) + "\n"); out.flush()
                baru += 1
            d += dt.timedelta(days=1)
    return baru, gagal

# ------------------------------------------------------------------ KUNCI (PRAREG bagian 9 dan A.5): satu-satunya penjaga urutan
def manifes():
    """sha256 berkas beku + isi fungsi imerg.parse (berkas imerg.py milik cuaca-udara TIDAK di-hash utuh)."""
    import hashlib, inspect
    sys.path.insert(0, AYAH)
    m = {j: (hashlib.sha256(open(os.path.join(AKAR, j), "rb").read()).hexdigest() if os.path.exists(os.path.join(AKAR, j)) else "HILANG") for j in SIDIK_DAFTAR}
    sys.path.insert(0, os.path.join(AKAR, "scripts/cuaca"))
    from imerg import parse
    import imerg
    m["fungsi:scripts/cuaca/imerg.py:parse"] = hashlib.sha256(inspect.getsource(parse).encode()).hexdigest()
    m["konstanta:scripts/cuaca/imerg.py:HILANG"] = repr(imerg.HILANG)
    from lab_genangan_radar import jendela_j3
    m["hasil:jendela_j3()"] = hashlib.sha256(repr(jendela_j3()).encode()).hexdigest()
    return m


def sidik_sekarang():
    import hashlib
    return hashlib.sha256(json.dumps(manifes(), sort_keys=True).encode()).hexdigest()


def periksa_kunci(berkas=None, git=None):
    """-> None bila kunci sah, selain itu pesan. Sah = berkas sidik ada, sidik sama, jangkar_commit leluhur HEAD dan ada di origin/main,
    dan isi tiap berkas beku sama dengan di commit jangkar (pola kunci_j4.periksa)."""
    try:
        S = json.load(open(berkas or SIDIK_KUNCI))
    except (OSError, ValueError):
        return "belum dikunci: nowcast_jkt_sidik.json tidak ada (PRAREG A.5 langkah 3)"
    if S.get("sidik") != sidik_sekarang():
        return "sidik beda dari kunci: kode/protokol berubah sesudah kunci, hasil tidak sah"
    if git is None:
        sys.path.insert(0, os.path.join(AYAH, "genangan"))
        import kunci_j4 as K
        git = (K.leluhur, K.di_remote, K.git_show)
    lel, rem, show = git
    c = S.get("jangkar_commit", "")
    if not (c and lel(c) and rem(c)):
        return "jangkar_commit bukan leluhur HEAD atau tidak ada di origin/main: tolak"
    for j in SIDIK_DAFTAR:
        if show(c, j) != open(os.path.join(AKAR, j), "rb").read():
            return f"{j} beda dari commit jangkar"
    return None


def muat_label(perans):
    """Pembaca label publik: hanya parameter peran musim, selalu memeriksa kunci asli (PRAREG A.5). -> lihat _muat_label."""
    return _muat_label(None, None, perans)


def peran_musim(t):
    """peran musim laporan pada waktu t (tanpa L): 'latih'|'validasi'|'uji'|None."""
    m = musim(t)
    return next((k for k, v in MUSIM.items() if m in v), None)


def _muat_label(berkas_kunci, git, perans, dari_cache=None, label_berkas=None):
    """SATU-SATUNYA pembaca lokasi/waktu laporan PetaBencana di berkas ini; menolak sebelum kunci sah. Ini KUNCI URUTAN, bukan pagar teknis:
    berkasnya tetap bisa dibuka di luar kode ini (PRAREG A.5).
    Hanya laporan yang musimnya berperan dalam `perans` yang disimpan (dibuang SEGERA sesudah baca, sebelum ditempel kecamatan atau di-hash):
    `latih` memanggil {latih, validasi}; hanya `nilai` yang memuat 'uji'.
    -> {label: tersaring penuh (petabencana_banjir.json), mentah: cache mentah ringkas (petabencana.dari_cache, punya tipe/teks) untuk persistensi kausal,
        tanpa_saring: mentah tipe flood + dedup (sensitivitas), sha: sha256 ketiganya}. Semua: tanpa_j3 segera sesudah baca, tanpa bulan terlarang/terlihat,
    sebelum jangkar J4, ditempel kec DKI. petabencana_laporan.json TIDAK dipakai: skemanya tanpa tipe/teks (skor_j4.py)."""
    import hashlib
    salah = periksa_kunci(berkas_kunci, git)
    if salah:
        raise RuntimeError("muat_label ditolak: " + salah)
    sys.path.insert(0, os.path.join(AYAH, "genangan"))
    from lab_genangan_radar import jendela_j3, tanpa_j3
    from bersama import KecDKI
    if dari_cache is None:
        from petabencana import dari_cache
    jw, kec = jendela_j3(), KecDKI()
    perans = set(perans)
    if not perans or not perans <= set(MUSIM):
        raise ValueError(f"perans tidak sah: {perans}")
    def bersih(lap):
        out = []
        for r in tanpa_j3(lap, jw):
            t = iso_t(r["t"])
            if f"{t:%Y-%m}" in BULAN_TERLARANG | BULAN_TERLIHAT_A or t >= AWAL_J4 or peran_musim(t) not in perans:
                continue
            k = kec.cari(r["lon"], r["lat"])
            if k:
                out.append(dict(r, kec=f"31|{k[0]}|{k[1]}", sel=(round(r["lon"], 3), round(r["lat"], 3))))
        return out
    mentah = dari_cache()
    if not sum(r.get("tipe") == "flood" for r in mentah):
        raise RuntimeError("cache mentah tanpa satu pun tipe flood: skema salah, persistensi akan selalu 0")
    label, mentah = bersih(json.load(open(label_berkas or PB_BANJIR))), bersih(mentah)
    lihat, tanpa = set(), []
    for r in mentah:
        k = (r["t"], r["lon"], r["lat"], r.get("kedalaman_cm"))
        if r.get("tipe") == "flood" and k not in lihat:
            lihat.add(k); tanpa.append(r)
    sha = {k: hashlib.sha256(json.dumps([[(r["id"], r["t"], r["kec"]) for r in x if peran_musim(iso_t(r["t"])) == k] for x in (label, mentah, tanpa)],
                                         default=str).encode()).hexdigest() for k in sorted(perans)}
    return {"label": label, "mentah": mentah, "tanpa_saring": tanpa, "sha": sha}       # sha per peran: latih mencatat latih+validasi, nilai mencatat uji


# ------------------------------------------------------------------ persistensi kausal (pembeda dengan label: burst kumulatif sampai t)
def indeks_persistensi(mentah):
    """{kec: [(epoch, hari, sel)] terurut} hanya tipe flood yang lolos aturan TEKS latihan (kausal per laporan); burst dinilai di persisten()."""
    sys.path.insert(0, os.path.join(AYAH, "genangan"))
    from petabencana import latihan
    ix = {}
    for r in mentah:
        if r.get("tipe") == "flood" and not latihan(r):
            t = iso_t(r["t"])
            ix.setdefault(r["kec"], []).append((epoch(t), f"{t:%Y-%m-%d}", r["sel"]))
    for k in ix:
        ix[k].sort()
    semua = sorted(x for v in ix.values() for x in v)
    return ix, semua


def persisten(ix, semua, kec, t, jam=PERSIST_JAM, burst=BURST_KAUSAL):
    """1 bila ada laporan di kec dalam (t-jam, t] yang, pada saat t, belum melewati burst (hitungan (hari, sel) dengan stempel <= t)."""
    import bisect
    T = epoch(t); v = ix.get(kec, [])
    i = bisect.bisect_right(v, (T - jam * 3600, "￿"))
    for e, hari, sel in v[i:bisect.bisect_right(v, (T, "￿"))]:
        n = sum(1 for x in semua[:bisect.bisect_right(semua, (T, "￿"))] if x[1] == hari and x[2] == sel)   # ponytail: O(n) per kandidat; indeks (hari, sel) bila lambat
        if n <= burst:
            return 1
    return 0


def label_y(lab_ix, kec, t, L):
    """1 bila ada laporan tersaring penuh di kec dalam (t, t+L]."""
    import bisect
    v = lab_ix.get(kec, []); T = epoch(t)
    return int(bisect.bisect_right(v, T + L * 3600) > bisect.bisect_right(v, T))


# ------------------------------------------------------------------ klim, logistik, Platt
def blok_jam(t):
    return t.hour // 6


def klim(baris, kecuali=None):
    """{(kec, bulan, blok): p} dari baris {kec, t, y, musim}, susut ke laju DKI per (bulan, blok) dengan PSEUDO; kecuali = musim yang dibuang (luar-lipatan)."""
    n, s, nd, sd = {}, {}, {}, {}
    for b in baris:
        if b["musim"] == kecuali:
            continue
        k = (b["kec"], b["t"].month, blok_jam(b["t"])); d = k[1:]
        n[k] = n.get(k, 0) + 1; s[k] = s.get(k, 0) + b["y"]; nd[d] = nd.get(d, 0) + 1; sd[d] = sd.get(d, 0) + b["y"]
    dki = {d: (sd[d] + 0.5) / (nd[d] + 1) for d in nd}
    dki["semua"] = (sum(sd.values()) + 0.5) / (sum(nd.values()) + 1)
    return {k: (s[k] + PSEUDO * dki[k[1:]]) / (n[k] + PSEUDO) for k in n}, dki


def pasang_klim(baris, latih):
    """latih: klim luar-lipatan (tinggal-satu-musim latih). validasi/uji: klim seluruh musim latih."""
    penuh = klim(latih)
    musim_latih = {b["musim"] for b in latih}
    lipat = {m: klim(latih, kecuali=m) if len(musim_latih) > 1 else penuh for m in musim_latih}   # satu musim saja: tak ada lipatan
    for b in baris:
        tab, dki = lipat[b["musim"]] if b.get("peran") == "latih" else penuh
        k = (b["kec"], b["t"].month, blok_jam(b["t"]))
        b["klim"] = tab.get(k, dki.get(k[1:], dki.get("semua", penuh[1]["semua"])))   # sel kosong -> laju DKI (bulan, blok) -> laju lipatan -> laju latih


def sig(z):
    return 1 / (1 + math.exp(-max(-35, min(35, z))))


def logit(p):
    p = min(max(p, 1e-6), 1 - 1e-6)
    return math.log(p / (1 - p))


def selesaikan(A, b):
    n = len(b); M = [r[:] + [b[i]] for i, r in enumerate(A)]
    for c in range(n):
        p = max(range(c, n), key=lambda r: abs(M[r][c])); M[c], M[p] = M[p], M[c]
        if abs(M[c][c]) < 1e-12:
            raise ValueError("matriks singular")
        for r in range(n):
            if r != c:
                f = M[r][c] / M[c][c]; M[r] = [x - f * y for x, y in zip(M[r], M[c])]
    return [M[i][n] / M[i][i] for i in range(n)]


def logistik(X, y, offset=None, lam=LAMBDA, iter=50, bobot=None):
    """Newton-Raphson; X tanpa kolom intersep (ditambahkan, tak dipenalti); -> [b0, b1, ...]"""
    k = len(X[0]) + 1 if X else 1; w = [0.0] * k
    off = offset or [0.0] * len(y); bb = bobot or [1.0] * len(y)
    for _ in range(iter):
        g = [0.0] * k; H = [[0.0] * k for _ in range(k)]
        for x, yi, o, wi in zip(X, y, off, bb):
            v = [1.0] + list(x); p = sig(o + sum(a * c for a, c in zip(w, v))); r = wi * (yi - p); q = wi * p * (1 - p)
            for i in range(k):
                g[i] += r * v[i]
                for j in range(k):
                    H[i][j] += q * v[i] * v[j]
        for i in range(1, k):
            g[i] -= lam * w[i]; H[i][i] += lam
        d = selesaikan(H, g); f = min(1.0, 5.0 / max(abs(c) for c in d))      # langkah dibatasi: terpisah-sempurna tak meledak
        d = [c * f for c in d]; w = [a + c for a, c in zip(w, d)]
        if max(abs(c) for c in d) < 1e-8:
            break
    return w


def fitur_x(b, model):
    """vektor fitur per model; hujan log1p. Nilai None -> baris hilang (dikeluarkan untuk SEMUA model)."""
    h = [b.get(c) for c in ("h1", "h3", "h6", "a24")]
    if model == "klim":
        return []
    if model == "persistensi":
        return [b["persist"]]
    return [b["persist"]] + [math.log1p(x) for x in h]


def latih(baris_latih, baris_val):
    """-> {model: {w, platt, mu, sd}} untuk klim, persistensi, hujan (= persistensi + hujan). Platt pada validasi."""
    out = {}
    for m in MODEL:
        X = [fitur_x(b, m) for b in baris_latih]
        mu = [sum(c) / len(X) for c in zip(*X)] if X and X[0] else []
        sd = [max(1e-9, math.sqrt(sum((v - u) ** 2 for v in c) / len(X))) for c, u in zip(zip(*X), mu)] if mu else []
        z = lambda x: [(v - u) / s for v, u, s in zip(x, mu, sd)]
        w = logistik([z(x) for x in X], [b["y"] for b in baris_latih], [logit(b["klim"]) for b in baris_latih]) if m != "klim" else [0.0]
        mentah = [sig(logit(b["klim"]) + w[0] + sum(a * c for a, c in zip(w[1:], z(fitur_x(b, m))))) for b in baris_val]
        pl = logistik([[logit(p)] for p in mentah], [b["y"] for b in baris_val], lam=0.0)
        out[m] = {"w": w, "platt": pl, "mu": mu, "sd": sd}
    return out


def prakira(par, b, m):
    q = par[m]; x = [(v - u) / s for v, u, s in zip(fitur_x(b, m), q["mu"], q["sd"])]
    p = sig(logit(b["klim"]) + q["w"][0] + sum(a * c for a, c in zip(q["w"][1:], x)))
    return sig(q["platt"][0] + q["platt"][1] * logit(p))


# ------------------------------------------------------------------ nilai (PRAREG bagian 7 + A.4)
def episode(hari_pos):
    """tanggal positif terurut -> jumlah episode (jeda < EPISODE_JEDA_HARI hari digabung)."""
    h = sorted(set(hari_pos)); n = 0; akhir = None
    for d in h:
        if akhir is None or (d - akhir).days >= EPISODE_JEDA_HARI:
            n += 1
        akhir = d
    return n


def holm(ps):
    """p terkoreksi Holm (urutan masukan dipertahankan)."""
    urut = sorted(range(len(ps)), key=lambda i: ps[i]); out = [0.0] * len(ps); m = len(ps); maks = 0.0
    for r, i in enumerate(urut):
        maks = max(maks, min(1.0, (m - r) * ps[i])); out[i] = maks
    return out


def nilai_L(baris, B=BOOT_B, benih=BENIH, pembanding=("klim", "persistensi")):
    """baris {t, y, p: {model: p|None}, musim}. -> ringkasan satu tenggang. Baris dengan p hilang pada model MANA PUN dikeluarkan dari semua."""
    import random
    hilang_pos = sum(1 for b in baris if b["y"] and None in b["p"].values()); n_pos = sum(b["y"] for b in baris)
    hilang_neg = sum(1 for b in baris if not b["y"] and None in b["p"].values()); n_neg = len(baris) - n_pos
    sah = [b for b in baris if None not in b["p"].values()]
    fp, fn = (hilang_pos / n_pos if n_pos else 0), (hilang_neg / n_neg if n_neg else 0)
    pb = (hilang_pos + hilang_neg) / max(1, n_pos + n_neg)                                     # z dua-proporsi terpoolkan (beku)
    se = math.sqrt(pb * (1 - pb) * (1 / max(n_pos, 1) + 1 / max(n_neg, 1)))
    syarat4 = fp <= HILANG_MAKS and (abs(fp - fn) <= 1.96 * se if se > 0 else fp == fn)
    pos_hari = [b["t"].date() for b in sah if b["y"]]
    n_ep = episode(pos_hari)
    # agregat per blok 5 hari: jumlah galat kuadrat per model, + bin logit untuk kemiringan kalibrasi
    nol = min(b["t"].date() for b in sah) if sah else None
    blok = {}
    for b in sah:
        k = (b["t"].date() - nol).days // BLOK_HARI
        g = blok.setdefault(k, {"n": 0, "se": {}, "bin": {}})
        g["n"] += 1
        for m, p in b["p"].items():
            g["se"][m] = g["se"].get(m, 0.0) + (p - b["y"]) ** 2
        z = logit(b["p"]["hujan"]); j = max(-40, min(40, round(z * 4)))          # ponytail: bin 0,25 logit; kemiringan dari data bin, bukan baris
        c = g["bin"].setdefault(j, [0, 0, 0.0]); c[0] += 1; c[1] += b["y"]; c[2] += z
    K = list(blok)
    def ringkas(ks):
        n = sum(blok[k]["n"] for k in ks)
        bs = {m: sum(blok[k]["se"][m] for k in ks) / n for m in blok[ks[0]]["se"]}
        return n, bs
    def kemiringan(ks):
        agg = {}
        for k in ks:
            for j, (n, y, zs) in blok[k]["bin"].items():
                a = agg.setdefault(j, [0, 0, 0.0]); a[0] += n; a[1] += y; a[2] += zs
        X, Y, W = [], [], []
        for n, y, zs in agg.values():
            X += [[zs / n], [zs / n]]; Y += [1, 0]; W += [y, n - y]
        try:
            return logistik(X, Y, lam=1e-6, bobot=W)[1]
        except (ValueError, OverflowError):
            return None                                                    # resampel terpisah sempurna: dibuang dan dihitung

    n, bs = ringkas(K)
    rnd = random.Random(benih); dlt = {m: [] for m in pembanding}; slope = []
    for i in range(B):
        ks = [K[rnd.randrange(len(K))] for _ in K]
        _, b2 = ringkas(ks)
        for m in pembanding:
            dlt[m].append(b2[m] - b2["hujan"])
        if i < B_SLOPE:
            slope.append(kemiringan(ks))
    p = {m: (sum(1 for d in dlt[m] if d <= 0) + 1) / (B + 1) for m in pembanding}
    gagal_slope = sum(x is None for x in slope); slope = sorted(x for x in slope if x is not None)
    ci = (slope[int(0.025 * len(slope))], slope[int(0.975 * len(slope)) - 1]) if slope else (None, None)
    rasio = sum(b["p"]["hujan"] for b in sah) / max(1, sum(b["y"] for b in sah))       # dilaporkan saja (PRAREG 7, butir Σp/Σy)
    per_musim = {}
    for b in sah:
        q = per_musim.setdefault(b.get("musim"), [0, 0.0, 0.0]); q[0] += b["y"]; q[1] += (b["p"]["hujan"] - b["y"]) ** 2; q[2] += (b["p"]["klim"] - b["y"]) ** 2
    cukup = {m: 1 - q[1] / q[2] for m, q in per_musim.items() if q[0] >= 40 and q[2] > 0}
    stabil = None if len(cukup) < 2 else sum(v > 0 for v in cukup.values()) * 2 >= len(cukup)    # None = tak teruji (bukan gagal)
    return {"n": n, "n_pos": sum(b["y"] for b in sah), "episode": n_ep, "bs": bs, "bss_klim": 1 - bs["hujan"] / bs["klim"] if bs["klim"] else None,
            "p": p, "p_gabung": max(p.values()), "kemiringan_ci": ci, "rasio_sum_p_y": rasio, "hilang_pos": fp, "hilang_neg": fn,
            "slope_gagal": gagal_slope, "bss_per_musim": cukup, "stabil": stabil,
            "syarat0": n_ep >= MIN_EPISODE, "syarat3": bool(slope) and gagal_slope <= SLOPE_GAGAL_MAKS * (len(slope) + gagal_slope) and SLOPE_RENTANG[0] <= ci[0] and ci[1] <= SLOPE_RENTANG[1], "syarat4": syarat4}


def vonis(per_L):
    """per_L {L: ringkasan}. Utama L=UTAMA (alfa tanpa koreksi); kurva: Holm atas semua L pada p_gabung; tenggang andal terpanjang = L terbesar dengan semua L' <= L lulus."""
    Ls = sorted(per_L); ph = dict(zip(Ls, holm([per_L[L]["p_gabung"] for L in Ls])))
    lulus = lambda r, p: r["syarat0"] and r["syarat3"] and r["syarat4"] and r.get("stabil") is not False and p <= ALFA
    utama = per_L.get(UTAMA)
    out = {"utama": None if utama is None else ("belum cukup data" if not utama["syarat0"] else "LULUS" if lulus(utama, utama["p_gabung"]) else "TIDAK LULUS"),
           "holm": ph, "andal_sampai": 0}
    for L in Ls:
        if not lulus(per_L[L], ph[L]):
            break
        out["andal_sampai"] = L
    return out


def susun(perans, L, label, mentah, seri, kec=None):
    """unit kecamatan x jam terbit untuk peran dalam `perans`: fitur hujan, persistensi kausal, label (t, t+L]."""
    lab = {}
    for r in label:
        lab.setdefault(r["kec"], []).append(epoch(iso_t(r["t"])))
    for v in lab.values():
        v.sort()
    ix, semua = indeks_persistensi(mentah)
    kec = kec or kecamatan(); out = []
    t = dt.datetime(2016, 11, 1, tzinfo=WIB)
    while t < AWAL_J4:
        pr = peran(t, L)
        if pr in perans:
            for k, (la, lo) in sorted(kec.items()):
                out.append({"kec": k, "t": t, "musim": musim(t), "peran": pr, "y": label_y(lab, k, t, L),
                            "persist": persisten(ix, semua, k, t), **hujan_imerg(seri, la, lo, t)})
        t += dt.timedelta(hours=1)
    return out

# ------------------------------------------------------------------ perintah
def dirs_arsip(a):
    return a or [ARSIP_POS]


def cmd_inventaris(a):
    tma = baca_tma(dirs_arsip(a.arsip))
    hari = sorted({dt.datetime.fromtimestamp(s, WIB).date().isoformat() for p in tma.values() for s, _ in p})
    dsda = {p: s for p, s in tma.items() if p.startswith("d:")}
    print("TMA arsip:", f"{len(hari)} hari WIB ({hari[0] if hari else '-'}..{hari[-1] if hari else '-'}), {len(tma)} pos, DSDA {len(dsda)} pos")
    for nama, ids in POS_RANTAI.items():
        for p in ids:
            s = tma.get(p, [])
            jeda = sorted(b - a_ for (a_, _), (b, _) in zip(s, s[1:]))
            print(f"  {nama:10s} {p[:10]:10s} n={len(s):5d}  jeda median {jeda[len(jeda) // 2] / 60 if jeda else '-'} menit")
    if a.jaringan:
        cap = unduh_cap(dt.date(2026, 10, 19), dt.datetime.now(WIB).date())
    else:
        cap = baca_cap(a.cap or CAP_BERKAS)
    if cap:
        lat = sorted((iso_t(r["pertama_dilihat"]) - iso_t(r["mulai"])).total_seconds() / 60 for r in cap)
        dki = [r for r in cap if "31" in r["prov"]]
        print(f"CAP: {len(cap)} peringatan {cap[0]['mulai'][:10]}..{cap[-1]['mulai'][:10]}, DKI {len(dki)}; terlihat-mulai menit p10/p50/p90 "
              f"{lat[len(lat) // 10]:.0f}/{lat[len(lat) // 2]:.0f}/{lat[9 * len(lat) // 10]:.0f}")
    else:
        print("CAP: cache kosong (jalankan inventaris --jaringan)")
    gs = baca_gsmap()
    jam = sorted({h for c in gs.values() for h in c})
    print("GSMaP NRT jam:", f"{len(gs)} sel, {len(jam)} jam" + (f" ({dt.datetime.fromtimestamp(jam[0], WIB):%Y-%m-%d}..{dt.datetime.fromtimestamp(jam[-1], WIB):%Y-%m-%d})" if jam else ""))
    if os.path.exists(PB_BANJIR):
        sys.path.insert(0, AYAH)
        from lab_genangan_radar import jendela_j3
        n = hitung_bulanan(json.load(open(PB_BANJIR)), jendela_j3())
        print("PetaBencana tersaring per bulan (J3 dan >= jangkar J4 dikecualikan):")
        print(" ", json.dumps(n))
    return 0


def cmd_tempuh(a):
    ids = {p for v in POS_RANTAI.values() for p in v}
    tma = baca_tma(dirs_arsip(a.arsip), ids)
    for hu, hi in RANTAI:
        for p in POS_RANTAI[hu]:
            for q in POS_RANTAI[hi]:
                if p.startswith("d:") != q.startswith("d:") or not tma.get(p) or not tma.get(q):     # sepasang sumber sama (DSDA-DSDA, SIHKA-SIHKA)
                    continue
                k = korelasi_silang(tma[p], tma[q])
                sah = [x for x in k if x[1] is not None]
                best = max(sah, key=lambda x: x[1]) if sah else None
                print(f"{hu}->{hi} {p[:8]}->{q[:8]}: puncak jeda {best[0] if best else '-'} jam r={best[1] if best else '-'} n={best[2] if best else 0}; semua {k}")
    return 0


def cmd_fitur(a):
    t = iso_t(a.t)
    if t >= dt.datetime.now(WIB):
        print("t di masa depan", file=sys.stderr); return 2
    rows = fitur(t, baca_tma(dirs_arsip(a.arsip)), meta_pos(), baca_cap(a.cap or CAP_BERKAS), baca_gsmap(), kecamatan())
    json.dump(rows, sys.stdout, ensure_ascii=False, indent=1); print()
    return 0


def cmd_imerg_latensi(a):
    """satu hari (--hari) atau rentang (--dari/--sampai, dianjurkan >= 14 hari); keluar 3 bila p99 > LAT_IMERG."""
    kemarin = dt.datetime.now(dt.timezone.utc).date() - dt.timedelta(days=1)
    d = dt.date.fromisoformat(a.dari or a.hari or kemarin.isoformat()); akhir = dt.date.fromisoformat(a.sampai or a.hari or d.isoformat())
    L = []
    while d <= akhir:
        L += latensi_imerg(berkas_imerg(ambil_publik(folder_imerg(d)), d)); d += dt.timedelta(days=1)
    if not L:
        print("tak ada berkas/stempel"); return 1
    L.sort(); n = len(L); q = lambda f: L[min(n - 1, int(f * n))]
    print(f"IMERG Early: {n} slot, latensi jam p10 {q(.1):.2f} p50 {q(.5):.2f} p90 {q(.9):.2f} p99 {q(.99):.2f} maks {L[-1]:.2f}; LAT_IMERG = {LAT_IMERG / 3600:g} jam")
    return 0 if q(.99) <= LAT_IMERG / 3600 else 3


def cmd_imerg_unduh(a):
    tok = os.environ.get("EARTHDATA_TOKEN")
    if not tok:
        print("imerg_unduh: EARTHDATA_TOKEN tidak ada, dilewati (jalankan di Actions)", file=sys.stderr); return 0
    sys.path.insert(0, os.path.join(AKAR, "scripts/cuaca"))
    from imerg import buka                                  # header token hanya ke *.earthdata/eosdis (milik cuaca-udara)
    baru, gagal = unduh_imerg_bulan(a.bulan, buka(tok), a.maks)
    print(f"imerg {a.bulan}: {baru} slot baru, {gagal} gagal")
    return 0 if baru or not gagal else 1


def cmd_fitur_hujan(a):
    t = iso_t(a.t); seri = baca_imerg()
    rows = [{"kec": k, "t": t.isoformat(), "peran": peran(t), **hujan_imerg(seri, la, lo, t)} for k, (la, lo) in sorted(kecamatan().items())]
    json.dump(rows, sys.stdout, ensure_ascii=False, indent=1); print()
    return 0


def cmd_sidik(_):
    print(sidik_sekarang()); return 0


def tulis_jangkar(amandemen=None, git=None, berkas=None, model=None, buka=None):
    """Jangkar pertama (amandemen None) atau jangkar ulang beramandemen. -> pesan galat atau None.
    Amandemen hanya sah bila sudah pernah dijangkar, alasan diisi, dan BELUM ada model maupun penanda buka;
    rekaman jangkar lama disimpan utuh di `riwayat` (urut waktu)."""
    import subprocess
    berkas, model, buka = berkas or SIDIK_KUNCI, model or MODEL_BERKAS, buka or BUKA
    g = git or (lambda *x: subprocess.run(["git", *x], cwd=AKAR, capture_output=True, text=True))
    ada = os.path.exists(berkas)
    if amandemen is None and ada:
        return "sudah dijangkar: pakai --amandemen \"A<n>: alasan\""
    if amandemen is not None:
        if not amandemen.strip():
            return "alasan amandemen wajib diisi"
        if not ada:
            return "belum pernah dijangkar: amandemen tidak berlaku"
        if os.path.exists(model) or os.path.exists(buka):
            return "model atau penanda buka sudah ada: amandemen ditolak (label latih/uji sudah dipakai)"
    if g("status", "--porcelain", "--", *SIDIK_DAFTAR).stdout.strip():
        return "berkas beku kotor: commit dulu"
    head = g("rev-parse", "HEAD").stdout.strip()
    if g("merge-base", "--is-ancestor", head, "origin/main").returncode:
        return "HEAD belum di origin/main: push dulu"
    rek = {"sidik": sidik_sekarang(), "jangkar_commit": head, "jangkar_tanggal": dt.date.today().isoformat(), "manifes": manifes()}
    if amandemen is not None:
        lama = json.load(open(berkas))
        rek["amandemen"] = amandemen.strip()
        rek["riwayat"] = lama.pop("riwayat", []) + [lama]
    json.dump(rek, open(berkas, "w"), indent=1, sort_keys=True)
    return None


def cmd_jangkar(a):
    """oleh sesi induk sesudah berkas beku di-commit dan di-push; ulang hanya lewat --amandemen (PRAREG bagian Amandemen)."""
    salah = tulis_jangkar(getattr(a, "amandemen", None))
    if salah:
        print(salah, file=sys.stderr); return 2
    print("tertulis", SIDIK_KUNCI, "(commit dan push berkas ini)"); return 0


def sel_imerg():
    """49 sel kotak Jakarta dengan kunci yang sama dengan baca_imerg."""
    return [(round(-89.95 + 0.1 * j, 2), round(-179.95 + 0.1 * i, 2)) for i in range(I_LON[0], I_LON[1] + 1) for j in range(I_LAT[0], I_LAT[1] + 1)]


def imerg_lengkap(seri, perans=("latih", "validasi"), min_porsi=0.95):
    """-> [bulan kurang]: tiap bulan Nov-Apr musim `perans`, SETIAP sel dari 49 harus punya >= min_porsi slot 30 menit bernilai
    (sel tanpa data = 0). Diperiksa SEBELUM label dibaca."""
    ada = {}
    for c in sel_imerg():
        for e in seri.get(c, {}):
            b = dt.datetime.fromtimestamp(e - 1, dt.timezone.utc).strftime("%Y-%m"); ada[(c, b)] = ada.get((c, b), 0) + 1
    kurang = []
    for m in (x for k in perans for x in MUSIM[k]):
        y = int(m[:4])
        for yy, mm in [(y, 11), (y, 12)] + [(y + 1, k) for k in range(1, 5)]:
            b = f"{yy}-{mm:02d}"
            if b in BULAN_TERLARANG | BULAN_TERLIHAT_A:
                continue
            hari = (dt.date(yy + mm // 12, mm % 12 + 1, 1) - dt.date(yy, mm, 1)).days
            if any(ada.get((c, b), 0) < min_porsi * 48 * hari for c in sel_imerg()):
                kurang.append(b)
    return kurang


def baris_jalur_a(perans, L, label, mentah, seri):
    lat = susun({"latih"}, L, label, mentah, seri)
    rows = lat if perans == {"latih"} else susun(perans, L, label, mentah, seri)
    pasang_klim(rows, lat)
    if rows is not lat:
        pasang_klim(lat, lat)
    return lat, rows


def cmd_latih(a):
    if os.path.exists(MODEL_BERKAS):                 # model/penanda dulu, baru label
        print("model sudah ada (dibekukan); latih ulang = kriteria baru", file=sys.stderr); return 2
    seri, par = baca_imerg(), {}
    kurang = imerg_lengkap(seri)                     # hujan lengkap dulu; label tak dibaca bila hujan belum ada (A1)
    if kurang:
        print(f"IMERG belum lengkap untuk {len(kurang)} bulan latih/validasi (mis. {kurang[:3]}): label tidak dibaca", file=sys.stderr); return 2
    D = muat_label(("latih", "validasi"))            # menolak sebelum kunci; label musim uji tidak dimuat
    for L in TENGGANG:
        lat, val = baris_jalur_a({"validasi"}, L, D["label"], D["mentah"], seri)
        ok = lambda r: [b for b in r if None not in (b["h1"], b["h3"], b["h6"], b["a24"])]
        par[str(L)] = latih(ok(lat), ok(val))
    json.dump({"sidik": sidik_sekarang(), "sha_label": D["sha"], "dibuat": dt.datetime.now(WIB).isoformat(timespec="minutes"), "model": par},
              open(MODEL_BERKAS, "w"), indent=1)
    print("tertulis", MODEL_BERKAS, "(commit + push SEBELUM nilai)"); return 0


def prakira_baris(rows, M, L):
    for b in rows:
        hil = None in (b["h1"], b["h3"], b["h6"], b["a24"])
        b["p"] = {m: None if hil else prakira(M["model"][str(L)], b, m) for m in MODEL}
    return rows


def cmd_nilai(a):
    import subprocess
    if os.path.exists(BUKA):                         # penanda + model dulu, baru label
        print("uji sudah dibuka sekali", file=sys.stderr); return 2
    M = json.load(open(MODEL_BERKAS))
    if M["sidik"] != sidik_sekarang():
        print("model dilatih dengan sidik lain", file=sys.stderr); return 2
    r = subprocess.run(["git", "show", "origin/main:scripts/banjir/nowcast_jkt_model.json"], cwd=AKAR, capture_output=True)
    if r.returncode or r.stdout != open(MODEL_BERKAS, "rb").read():
        print("model belum di origin/main persis: push dulu", file=sys.stderr); return 2
    D = muat_label(("latih", "validasi", "uji"))     # satu-satunya pemanggil yang memuat peran uji
    if {k: D["sha"][k] for k in ("latih", "validasi")} != M.get("sha_label"):
        print("label latih/validasi berubah sejak latih (sha beda): tolak", file=sys.stderr); return 2
    open(BUKA, "w").write(dt.datetime.now(WIB).isoformat())
    seri, hasil, v07c, sens = baca_imerg(), {}, {}, {}
    for L in TENGGANG:
        uji_ = prakira_baris(baris_jalur_a({"uji"}, L, D["label"], D["mentah"], seri)[1], M, L)
        hasil[L] = nilai_L(uji_)
        bag = [b for b in uji_ if b["t"] >= IMERG_V07C_MULAI]                                   # deskriptif: versi operasional
        v07c[L] = nilai_L(bag) if any(b["y"] for b in bag) else None
        sens[L] = nilai_L(prakira_baris(baris_jalur_a({"uji"}, L, D["tanpa_saring"], D["mentah"], seri)[1], M, L))   # sensitivitas tanpa saringan
        for nama, x in (("utama", hasil[L]), ("V07C", v07c[L]), ("tanpa_saring", sens[L])):
            if x:
                print(f"L={L} {nama}: episode {x['episode']}, positif {x['n_pos']}, BSS {x['bss_klim']}, p {x['p_gabung']:.4f}, kemiringan CI95 {x['kemiringan_ci']}")
    v, vs = vonis(hasil), vonis(sens)
    json.dump({"vonis": v, "vonis_tanpa_saring": vs, "sha_label_uji": D["sha"]["uji"], "arah_beda": v["utama"] != vs["utama"], "per_L": hasil, "v07c": v07c, "tanpa_saring": sens,
               "catatan": "batas atas, sebelum prospektif 2026/27 (V07B arsip vs V07C operasional, PRAREG A.1)"},
              open(os.path.join(AYAH, "nowcast_jkt_vonis.json"), "w"), indent=1, default=str)
    print(json.dumps(v)); return 0


def simulasi_daya(npos, gam, benih, hari=700, per_hari=40, sd_hari=0.8, sd_unit=0.8, B=400):
    """Sintetik daya syarat 3 (dari pemeriksa validasi-model): z = logit p model; peluang benar = sig(a + gam z), a dicari agar E[positif] = npos.
    gam = kemiringan kalibrasi benar. Tanpa label nyata."""
    import random
    r = random.Random(benih)
    S = [r.gauss(0, 1) for _ in range(hari)]
    Z = [[-6 + sd_hari * S[d] + r.gauss(0, sd_unit) for _ in range(per_hari)] for d in range(hari)]
    lo, hi = -40.0, 20.0
    for _ in range(60):
        a = (lo + hi) / 2
        if sum(sig(a + gam * z) for row in Z for z in row) > npos:
            hi = a
        else:
            lo = a
    t0 = dt.datetime(2022, 11, 1, tzinfo=WIB)
    rows = [{"t": t0 + dt.timedelta(days=d), "y": int(r.random() < sig(a + gam * z)), "musim": "x",
             "p": {"hujan": sig(z), "klim": 0.01, "persistensi": 0.012}} for d in range(hari) for z in Z[d]]
    return nilai_L(rows, B=B)


def cmd_daya(a):
    print("npos  gam  sd_unit  lulus_s3  lebar_CI  episode  positif")
    for npos in (170, 350, 800):
        for gam in (0.85, 1.0, 1.2):
            for sdu in (0.8, 0.3):
                R = [simulasi_daya(npos, gam, b, sd_unit=sdu, B=a.B) for b in range(a.ulang)]
                lebar = sum(x["kemiringan_ci"][1] - x["kemiringan_ci"][0] for x in R if x["kemiringan_ci"][0] is not None) / len(R)
                print(f"{npos:4d} {gam:5.2f} {sdu:7.1f}  {sum(x['syarat3'] for x in R):3d}/{len(R):<3d}   {lebar:7.2f}  {R[-1]['episode']:7d}  {R[-1]['n_pos']:7d}", flush=True)
    return 0


def uji():
    import random
    t = dt.datetime(2026, 11, 20, 15, 0, tzinfo=WIB); T = epoch(t)
    # 1. latensi TMA: bacaan tepat di t-LAT dipakai, 1 detik sesudahnya tidak
    s = [(T - LAT_TMA - 3 * 3600, 100.0), (T - LAT_TMA, 160.0), (T - LAT_TMA + 1, 999.0), (T + 600, 5000.0)]
    assert naik(s, t, 3) == 60.0, naik(s, t, 3)
    # 2. pembeda kausal: mengubah/menambah bacaan sesudah t - LAT tidak mengubah fitur
    meta = {"d:1": {"lat": -6.2, "lon": 106.85, "a3": 200}, "d:116": {"lat": -6.63, "lon": 106.83, "a3": 80}}
    kec = {"31|Kota X|A": (-6.21, 106.85), "31|Kota X|B": (-6.30, 106.70)}
    tma = {"d:1": [(T - LAT_TMA - 3 * 3600, 100.0), (T - LAT_TMA, 150.0)], "d:116": [(T - LAT_TMA - 3600 * k, 50.0 + 10 * (3 - k)) for k in (3, 2, 1, 0)]}
    cap = [{"pertama_dilihat": "2026-11-20T07:50:00.000Z", "mulai": "2026-11-20T07:30:00.000Z", "selesai": "2026-11-20T10:00:00.000Z",
            "poligon": [[[106.80, -6.25], [106.90, -6.25], [106.90, -6.15], [106.80, -6.15]]], "prov": ["31"]}]
    gs = {(-6.25, 106.85): {T - LAT_GSMAP - 3600 * (k + 1) - (T % 3600): 1.0 for k in range(3)}}
    f0 = fitur(t, tma, meta, cap, gs, kec)
    tma2 = {p: s + [(T - LAT_TMA + 60, 9999.0), (T + 3600, -50.0)] for p, s in tma.items()}
    cap2 = cap + [{"pertama_dilihat": "2026-11-20T08:00:01.000Z", "mulai": "2026-11-20T07:00:00.000Z", "selesai": "2026-11-20T12:00:00.000Z",
                   "poligon": [[[106.6, -6.4], [106.8, -6.4], [106.8, -6.2], [106.6, -6.2]]], "prov": ["31"]}]
    gs2 = {c: {**v, T - LAT_GSMAP: 50.0, T - 3600: 80.0} for c, v in gs.items()}
    assert fitur(t, tma2, meta, cap2, gs2, kec) == f0, "data sesudah t (atau di dalam latensi) mengubah fitur"
    A, B = f0
    assert A["naik3_lokal"] == 50.0 and A["rasio_siaga3"] == 0.75 and A["katulampa_naik3"] == 30.0 and A["katulampa_naik1"] == 10.0, A
    assert A["cap_aktif"] == 1 and B["cap_aktif"] == 0 and B["pos_lokal"] is None, (A, B)
    assert A["gsmap3"] == 3.0 and A["gsmap_umur_jam"] >= LAT_GSMAP / 3600 + 1, A
    # 3. uji mutasi: tanpa latensi, data dalam (t-LAT, t] HARUS mengubah fitur (bukti asersi 2 bergigi)
    assert naik(tma2["d:1"], t, 3, lat=0) != naik(tma["d:1"], t, 3, lat=0)
    assert gsmap_terakhir(gs2, -6.21, 106.85, t, jam=1, latg=0)[0] == 80.0 and gsmap_terakhir(gs, -6.21, 106.85, t, jam=1, latg=0)[0] is None
    cap3 = [dict(cap2[1], pertama_dilihat="2026-11-20T07:59:00.000Z")]
    assert cap_aktif(cap3, -6.30, 106.70, t) == 1 and cap_aktif(cap2[1:], -6.30, 106.70, t) == 0   # terlihat sesudah t = belum ada
    # 4. bacaan terakhir terlalu tua = None, bukan nilai basi
    assert naik([(T - LAT_TMA - 5 * 3600, 1.0), (T - LAT_TMA - 4 * 3600, 2.0)], t, 1) is None
    # 5. korelasi silang menemukan jeda sintetis 3 jam
    rnd = random.Random(7); h0 = 1_800_000_000 - 1_800_000_000 % 3600
    x = [rnd.gauss(0, 1) for _ in range(300)]
    hu = [(h0 + i * 3600, sum(x[:i + 1])) for i in range(300)]
    hi = [(h0 + i * 3600, sum(x[:i - 2]) + 0.1 * rnd.gauss(0, 1)) for i in range(3, 300)]
    k = [z for z in korelasi_silang(hu, hi) if z[1] is not None]
    assert max(k, key=lambda z: z[1])[0] == 3, k
    # 6. hitung bulanan: jendela J3 dan bulan J3 dibuang, >= jangkar J4 dibuang; keluaran hanya hitungan per bulan
    sys.path.insert(0, AYAH)
    jw = [(dt.datetime(2024, 8, 16, tzinfo=WIB), dt.datetime(2024, 8, 20, tzinfo=WIB))]
    lap = [{"t": "2024-08-17T10:00:00+07:00"}, {"t": "2024-08-28T10:00:00+07:00"}, {"t": "2024-09-01T10:00:00+07:00"},
           {"t": "2024-09-02T10:00:00+07:00"}, {"t": "2026-10-29T10:00:00+07:00"}]
    assert hitung_bulanan(lap, jw) == {"2024-09": 2}, hitung_bulanan(lap, jw)
    # 7. konstanta beku (literal), dispatch, dan penjaga label: koordinat laporan hanya dibaca muat_label, yang menolak tanpa kunci
    import inspect
    assert LAT_IMERG == 21600 and LAT_TMA == 3600 and TENGGANG == (1, 2, 3, 4, 6) and UTAMA == 3 and PERSIST_JAM == 3
    assert (BOOT_B, BLOK_HARI, EPISODE_JEDA_HARI, MIN_EPISODE, SLOPE_RENTANG, HILANG_MAKS) == (10000, 5, 2, 20, (0.7, 1.4), 0.10)
    _, sp = pengurai()
    assert set(sp.choices) == set(PERINTAH) == {"inventaris", "tempuh", "fitur", "imerg_latensi", "imerg_unduh", "fitur_hujan", "sidik", "jangkar", "latih", "nilai", "daya", "uji"}
    import ast, re
    src = open(os.path.abspath(__file__)).read(); pohon = ast.parse(src)
    fungsi = {n.name: ast.get_source_segment(src, n) for n in pohon.body if isinstance(n, ast.FunctionDef) and n.name != "uji"}   # tingkat atas: fungsi bersarang ikut induknya
    koord = re.compile(r"""\[\s*['"]l(?:on|at)['"]\s*\]|\.get\(\s*['"]l(?:on|at)['"]""")
    pakai_koord = {n for n, f in fungsi.items() if koord.search(f)}
    # selain _muat_label, hanya fungsi berdata non-laporan: pos TMA (fitur, cmd_inventaris tak membaca koord laporan), baris GSMaP (baca_gsmap)
    assert "_muat_label" in pakai_koord and pakai_koord <= {"_muat_label", "fitur", "baca_gsmap"}, pakai_koord
    nama = lambda x: {n for n, f in fungsi.items() if re.search(r"\b" + x + r"\b", f)}
    assert nama("PB_BANJIR") == {"_muat_label", "cmd_inventaris"}, nama("PB_BANJIR")        # inventaris: hitungan per bulan saja
    assert nama("dari_cache") == {"_muat_label"} and nama("PB_MENTAH") == set()
    assert re.search(r"def muat_label\(perans\):", src)                                      # API publik: hanya peran, tanpa kunci/git
    assert 'muat_label(("latih", "validasi"))' in fungsi["cmd_latih"] and '"uji"' not in fungsi["cmd_latih"]
    assert [n for n, f in fungsi.items() if re.search(r"muat_label\([^)]*uji", f)] == ["cmd_nilai"]
    tmpk = os.path.join(os.environ.get("TMPDIR", "/tmp"), f"nowcast_jkt_sidik_uji_{os.getpid()}.json")
    try:
        _muat_label(tmpk, None, ("latih",)); raise AssertionError("muat_label tanpa kunci harus menolak")
    except RuntimeError as e:
        assert "belum dikunci" in str(e)
    json.dump({"sidik": sidik_sekarang(), "jangkar_commit": "abc"}, open(tmpk, "w"))
    benar = lambda c, j: open(os.path.join(AKAR, j), "rb").read()
    assert periksa_kunci(tmpk, (lambda c: True, lambda c: True, benar)) is None
    assert "origin/main" in periksa_kunci(tmpk, (lambda c: True, lambda c: False, benar))
    assert "beda dari commit" in periksa_kunci(tmpk, (lambda c: True, lambda c: True, lambda c, j: b"lain"))
    json.dump({"sidik": "0" * 64, "jangkar_commit": "abc"}, open(tmpk, "w"))
    assert "sidik beda" in periksa_kunci(tmpk, (lambda c: True, lambda c: True, benar)); os.remove(tmpk)
    M_ = manifes()
    assert "fungsi:scripts/cuaca/imerg.py:parse" in M_ and "scripts/cuaca/imerg.py" not in M_ and "hasil:jendela_j3()" in M_ and "konstanta:scripts/cuaca/imerg.py:HILANG" in M_
    assert all(M_[j] != "HILANG" for j in SIDIK_DAFTAR), [j for j in SIDIK_DAFTAR if M_[j] == "HILANG"]
    sys.path.insert(0, os.path.join(AYAH, "genangan"))
    from petabencana import ringkas
    fit = lambda i, w, teks, tipe="flood", lon=106.8456, lat=-6.2088: {"properties": {"pkey": str(i), "created_at": w, "report_data": {"flood_depth": 30},
          "tags": {"district_id": "x", "local_area_id": "y"}, "source": "grasp", "status": "confirmed", "disaster_type": tipe, "text": teks},
          "geometry": {"coordinates": [lon, lat]}}
    palsu = [ringkas(fit(1, "2023-01-05T03:00:00Z", "banjir di gang")), ringkas(fit(2, "2023-01-05T03:10:00Z", "Duta latihan")),
             ringkas(fit(3, "2024-08-17T03:00:00Z", "banjir")), ringkas(fit(4, "2023-01-05T04:00:00Z", "angin", tipe="wind")),
             ringkas(fit(5, "2017-01-05T03:00:00Z", "banjir latih")), ringkas(fit(6, "2021-01-05T03:00:00Z", "banjir validasi"))]
    tmpl = tmpk + ".label.json"; json.dump([palsu[0], palsu[4], palsu[5]], open(tmpl, "w"))
    json.dump({"sidik": sidik_sekarang(), "jangkar_commit": "abc"}, open(tmpk, "w"))
    gitok = (lambda c: True, lambda c: True, benar)
    D = _muat_label(tmpk, gitok, ("uji",), dari_cache=lambda: palsu, label_berkas=tmpl)
    assert [r["id"] for r in D["mentah"]] == ["1", "2", "4"] and [r["id"] for r in D["tanpa_saring"]] == ["1", "2"] and D["label"][0]["kec"].startswith("31|")
    DL = _muat_label(tmpk, gitok, ("latih", "validasi"), dari_cache=lambda: palsu, label_berkas=tmpl)   # musim uji tak pernah dimuat untuk latih
    assert {r["id"] for r in DL["label"]} == {"5", "6"} and {r["id"] for r in DL["mentah"]} == {"5", "6"} and set(DL["sha"]) == {"latih", "validasi"}
    DS = _muat_label(tmpk, gitok, ("latih", "validasi", "uji"), dari_cache=lambda: palsu, label_berkas=tmpl)
    assert {k: DS["sha"][k] for k in ("latih", "validasi")} == DL["sha"] and "uji" in DS["sha"]                # sha latih+validasi sama saat nilai
    try:
        _muat_label(tmpk, gitok, ("semua",)); raise AssertionError("peran tak sah harus ditolak")
    except ValueError:
        pass
    ixp = indeks_persistensi(D["mentah"]); kk = D["mentah"][0]["kec"]
    assert persisten(*ixp, kk, dt.datetime(2023, 1, 5, 10, 30, tzinfo=WIB)) == 1      # skema ringkas asli: tipe/teks terbaca, persist bisa 1
    try:
        _muat_label(tmpk, gitok, ("uji",), dari_cache=lambda: [dict(r, tipe=None) for r in palsu], label_berkas=tmpl)
        raise AssertionError("tanpa tipe flood harus galat keras")
    except RuntimeError as e:
        assert "tipe flood" in str(e)
    os.remove(tmpl)
    # 7c. jangkar beramandemen: alasan wajib, riwayat disimpan, ditolak bila model/penanda buka sudah ada
    d0 = os.path.join(os.environ.get("TMPDIR", "/tmp"), f"nowcast_jkt_jangkar_{os.getpid()}")
    os.makedirs(d0, exist_ok=True); sk, mdl, bk = (os.path.join(d0, x) for x in ("sidik.json", "model.json", "buka"))
    class G:
        def __init__(self, out="", rc=0): self.stdout, self.returncode = out, rc
    gitb = lambda *x: G("deadbeef\n") if x[0] == "rev-parse" else G()
    kw = dict(git=gitb, berkas=sk, model=mdl, buka=bk)
    assert "belum pernah" in tulis_jangkar("A1: x", **kw)
    assert tulis_jangkar(None, **kw) is None and "sudah dijangkar" in tulis_jangkar(None, **kw)
    assert "wajib" in tulis_jangkar("  ", **kw)
    open(mdl, "w").write("{}")
    assert "ditolak" in tulis_jangkar("A1: x", **kw); os.remove(mdl)
    open(bk, "w").write("x")
    assert "ditolak" in tulis_jangkar("A1: x", **kw); os.remove(bk)
    assert "kotor" in tulis_jangkar("A1: x", git=lambda *x: G("M x") if x[0] == "status" else G("deadbeef"), berkas=sk, model=mdl, buka=bk)
    assert tulis_jangkar("A1: parse", **kw) is None and tulis_jangkar("A2: lagi", **kw) is None
    J = json.load(open(sk))
    assert J["amandemen"] == "A2: lagi" and [r.get("amandemen") for r in J["riwayat"]] == [None, "A1: parse"] and all("riwayat" not in r for r in J["riwayat"])
    os.remove(sk); os.rmdir(d0)
    # 7d. latih menolak sebelum membaca label bila hujan IMERG belum lengkap
    assert len(imerg_lengkap({})) == 6 * 6
    j0 = epoch(dt.datetime(2017, 1, 1, tzinfo=dt.timezone.utc)) + 1800                                        # slot pertama Jan berakhir 00.30
    perlu = math.ceil(0.95 * 48 * 31)                                                                         # 1414 slot
    penuh = {c: {j0 + 1800 * k: 0.0 for k in range(48 * 31)} for c in sel_imerg()}
    assert "2017-01" not in imerg_lengkap(penuh)
    pas = dict(penuh); pas[sel_imerg()[7]] = {j0 + 1800 * k: 0.0 for k in range(perlu)}
    assert "2017-01" not in imerg_lengkap(pas)                                                                 # tepat di ambang: lengkap
    kurang1 = dict(penuh); kurang1[sel_imerg()[7]] = {j0 + 1800 * k: 0.0 for k in range(perlu - 1)}
    assert "2017-01" in imerg_lengkap(kurang1)                                                                 # satu sel satu slot di bawah: kurang
    tanpa = {c: v for c, v in penuh.items() if c != sel_imerg()[0]}
    assert "2017-01" in imerg_lengkap(tanpa)                                                                   # sel hilang total: kurang
    # 7b. syarat 4: positif hilang > 10% gagal; z dua-proporsi terpoolkan
    rh = [{"t": dt.datetime(2023, 1, 1, tzinfo=WIB) + dt.timedelta(hours=i), "y": int(i % 10 == 0), "musim": "x",
           "p": {"hujan": None if i % 10 == 0 and i < 300 else 0.1, "klim": 0.1, "persistensi": 0.1}} for i in range(2000)]
    assert nilai_L(rh, B=20)["syarat4"] is False
    rh2 = [dict(b, p={"hujan": None if i % 97 == 0 else 0.1, "klim": 0.1, "persistensi": 0.1}) for i, b in enumerate(rh)]
    assert nilai_L(rh2, B=20)["syarat4"] is True
    # 8. JALUR A: pembagian musim beku, saling lepas, bulan J3 dan masa J4 tanpa peran
    semua = [m for v in MUSIM.values() for m in v]
    assert len(semua) == len(set(semua)) == 10 and musim(dt.datetime(2017, 2, 1, tzinfo=WIB)) == "2016/17" and musim(dt.datetime(2017, 7, 1, tzinfo=WIB)) is None
    assert peran(dt.datetime(2017, 1, 5, tzinfo=WIB)) == "latih" and peran(dt.datetime(2021, 12, 5, tzinfo=WIB)) == "validasi"
    assert peran(dt.datetime(2025, 2, 28, 23, tzinfo=WIB), 3) is None and peran(dt.datetime(2025, 2, 28, 20, tzinfo=WIB), 3) == "uji"   # (t, t+L] menyentuh 2025-03
    assert peran(dt.datetime(2026, 4, 30, 22, tzinfo=WIB), 3) is None                                                            # jendela keluar musim
    assert peran(dt.datetime(2024, 12, 5, tzinfo=WIB)) == "uji" and peran(dt.datetime(2025, 4, 23, tzinfo=WIB)) is None and peran(dt.datetime(2025, 3, 9, tzinfo=WIB)) is None and peran(dt.datetime(2026, 11, 5, tzinfo=WIB)) is None
    # 9. fitur hujan IMERG: slot berakhir tepat t - LAT dipakai, sesudahnya tidak; data masa depan tak mengubah fitur; mutasi lat_s=0 mengubahnya
    akhir = T - LAT_IMERG
    seri = {(-6.25, 106.85): {akhir - 1800 * k: 2.0 for k in range(60)}}
    h0 = hujan_imerg(seri, -6.21, 106.85, t)
    assert h0 == {"h1": 2.0, "h3": 6.0, "h6": 12.0, "a24": 48.0, "umur": LAT_IMERG / 3600}, h0
    seri2 = {c: {**v, akhir + 1800: 99.0, T: 99.0, T + 7200: 99.0} for c, v in seri.items()}
    assert hujan_imerg(seri2, -6.21, 106.85, t) == h0, "slot sesudah t - LAT mengubah fitur"
    assert hujan_imerg(seri2, -6.21, 106.85, t, lat_s=0)["h1"] != h0["h1"]
    seri3 = {c: {k: v for k, v in s.items() if k != akhir - 1800 * 3} for c, s in seri.items()}
    assert hujan_imerg(seri3, -6.21, 106.85, t)["h3"] is None and hujan_imerg(seri3, -6.21, 106.85, t)["h1"] == 2.0   # slot hilang = None, bukan 0
    # 10. daftar folder IMERG -> akhir slot + latensi; pengurai ASCII cuaca/imerg.parse dipakai pada kotak Jakarta
    html = ('<td><a href="3B-HHR-E.MS.MRG.3IMERG.20261031-S233000-E235959.1410.V07C.HDF5">3B-HHR-E.MS.MRG.3IMERG.20261031-S233000-E235959.1410.V07C.HDF5</a>'
            '</td><td align="right">2026-11-01 04:54  </td>')
    b = berkas_imerg(html, dt.date(2026, 10, 31))
    assert b[0][0] == dt.datetime(2026, 11, 1, tzinfo=dt.timezone.utc) and abs(latensi_imerg(b)[0] - 4.9) < 1e-9, b
    asc = "Dataset {\n} x;\n---------\nprecipitation.precipitation[1][7][7]\n" + "\n".join(f"[0][{i}], " + ", ".join(str(0.1 * i + j) for j in range(7)) for i in range(7))
    tmp = os.path.join(os.environ.get("TMPDIR", "/tmp"), f"nowcast_jkt_uji_{os.getpid()}")
    hari = lambda u: html if "/data/" in u and u.endswith("/") and "/304/" in u else ""
    import io, contextlib
    with contextlib.redirect_stderr(io.StringIO()):
        nb, ng = unduh_imerg_bulan("2026-10", lambda u: asc, dirk=tmp, ambil_daftar=hari)
        nb2, _ = unduh_imerg_bulan("2026-10", lambda u: asc, dirk=tmp, ambil_daftar=hari)
    assert (nb, ng, nb2) == (1, 0, 0), (nb, ng, nb2)              # melanjutkan: slot yang ada tak diunduh ulang
    gz = os.path.join(tmp, "2026-10.jsonl.gz")
    ekor = gzip.compress(b'{"e":1,"v":[1]}\n' * 50)
    open(gz, "ab").write(ekor[:len(ekor) // 2])                     # anggota terakhir terpotong (job terbunuh)
    r, rusak = baris_gz(gz)
    assert rusak and len(r) >= 1 and r[0]["e"] == epoch(b[0][0]), (len(r), rusak)
    with contextlib.redirect_stderr(io.StringIO()):
        assert unduh_imerg_bulan("2026-10", lambda u: asc, dirk=tmp, ambil_daftar=hari)[0] == 0
    assert baris_gz(gz)[1] is False                                 # ditulis ulang utuh
    sr = baca_imerg(tmp)
    assert len(sr) == 49 and sr[(-6.55, 106.55)] == {epoch(b[0][0]): 0.0} and sr[(-5.95, 107.15)][epoch(b[0][0])] == 6.6, sorted(sr)[:3]
    os.remove(os.path.join(tmp, "2026-10.jsonl.gz")); os.rmdir(tmp)
    # 11. t tidak berjajar (15.20 WIB): slot/bacaan tetap memakai batas t - latensi
    t2 = dt.datetime(2026, 11, 20, 15, 20, tzinfo=WIB); T2 = epoch(t2); b2 = T2 - LAT_IMERG; a2 = b2 - b2 % 1800
    sr2 = {(-6.25, 106.85): {a2 - 1800 * k: 1.0 for k in range(60)}}
    sr2[(-6.25, 106.85)][a2 + 1800] = 50.0
    h2 = hujan_imerg(sr2, -6.21, 106.85, t2)
    assert h2["h1"] == 1.0 and h2["umur"] == round((T2 - a2) / 3600, 2) and a2 <= T2 - LAT_IMERG < a2 + 1800, h2
    s2 = [(T2 - LAT_TMA - 3 * 3600, 10.0), (T2 - LAT_TMA - 60, 40.0), (T2 - LAT_TMA + 30, 99.0)]
    assert naik(s2, t2, 3) == 30.0
    # 12. persistensi kausal vs label penuh: burst yang baru > 20 SESUDAH t terlihat oleh persistensi pada t, dibuang label; laporan sesudah t tak mengubah persistensi
    k0 = "31|Kota X|A"; sel0 = (106.85, -6.21)
    lap = [{"t": (t + dt.timedelta(minutes=-30)).isoformat(), "tipe": "flood", "teks": "banjir 30 cm", "kec": k0, "sel": sel0}]
    lap += [{"t": (t + dt.timedelta(minutes=10 + i)).isoformat(), "tipe": "flood", "teks": "banjir", "kec": k0, "sel": sel0} for i in range(25)]
    ix, sem = indeks_persistensi(lap)
    assert persisten(ix, sem, k0, t) == 1                                 # pada t baru 1 laporan di sel itu
    assert persisten(ix, sem, k0, t + dt.timedelta(hours=1)) == 0       # pada t+1j sel itu sudah 26 > 20: burst
    ix2, sem2 = indeks_persistensi(lap[:1])
    assert persisten(ix2, sem2, k0, t) == persisten(ix, sem, k0, t)
    lat_ = [{"t": lap[0]["t"], "tipe": "flood", "teks": "Duta latihan banjir", "kec": k0, "sel": sel0}]
    assert persisten(*indeks_persistensi(lat_), k0, t) == 0              # aturan teks latihan berlaku kausal
    assert label_y({k0: [T + 1800]}, k0, t, 1) == 1 and label_y({k0: [T]}, k0, t, 1) == 0 and label_y({k0: [T + 3601]}, k0, t, 1) == 0
    # 13. klim luar-lipatan: baris latih musim m tidak memakai label musim m
    bl = [{"kec": k0, "t": dt.datetime(2017, 1, 5, 3, tzinfo=WIB), "musim": "2016/17", "peran": "latih", "y": 1},
          {"kec": k0, "t": dt.datetime(2018, 1, 5, 3, tzinfo=WIB), "musim": "2017/18", "peran": "latih", "y": 0}]
    pasang_klim(bl, bl)
    bl2 = [dict(bl[0], y=0), dict(bl[1])]; pasang_klim(bl2, bl2)
    assert bl[0]["klim"] == bl2[0]["klim"] and bl[1]["klim"] != bl2[1]["klim"]
    # 14. latih/nilai sintetik: positif disuntik dari peluang yang diketahui; Brier dihitung persis; model menang dari klim dan persistensi
    assert abs(sum((p_ - y_) ** 2 for p_, y_ in [(0.2, 0), (0.7, 1), (0.5, 1)]) / 3 - (0.04 + 0.09 + 0.25) / 3) < 1e-12
    assert episode([dt.date(2023, 1, 1), dt.date(2023, 1, 2), dt.date(2023, 1, 4), dt.date(2023, 1, 9)]) == 3
    assert [round(x, 3) for x in holm([0.01, 0.04, 0.03])] == [0.03, 0.06, 0.06]
    rnd = random.Random(3)
    def sint(n, musim_, peran_, skill=True):
        out = []
        for i in range(n):
            tt = dt.datetime(int(musim_[:4]) + 1, 1, 1, tzinfo=WIB) + dt.timedelta(hours=i)
            h = rnd.expovariate(0.5) if rnd.random() < 0.3 else 0.0; ps = int(rnd.random() < 0.05)
            pt = sig(-4 + (1.5 * math.log1p(h) + 1.5 * ps if skill else 0))
            out.append({"kec": k0, "t": tt, "musim": musim_, "peran": peran_, "y": int(rnd.random() < pt), "persist": ps,
                        "h1": h / 3, "h3": h, "h6": h * 1.5, "a24": h * 2, "p_benar": pt})
        return out
    la_, va_ = sint(1500, "2016/17", "latih") + sint(1500, "2017/18", "latih"), sint(2000, "2020/21", "validasi")
    pasang_klim(la_, la_); pasang_klim(va_, la_)
    par = latih(la_, va_)
    assert sum(par["hujan"]["w"][2:]) > 0 and par["hujan"]["w"][1] > 0, par["hujan"]["w"]   # efek hujan (jumlah, fitur kolinear) dan persistensi positif
    te = sint(12000, "2022/23", "uji")
    pasang_klim(te, la_)
    for b_ in te:
        b_["p"] = {m: prakira(par, b_, m) for m in MODEL}
    r = nilai_L(te, B=300)
    assert r["bs"]["hujan"] < min(r["bs"]["klim"], r["bs"]["persistensi"]) and r["p_gabung"] < 0.05 and r["syarat3"], r
    bsb = sum((b_["p_benar"] - b_["y"]) ** 2 for b_ in te) / len(te)
    assert abs(r["bs"]["hujan"] - bsb) < 0.01, (r["bs"], bsb)              # Brier model dekat Brier peluang benar
    te0 = sint(4000, "2022/23", "uji", skill=False)
    pasang_klim(te0, la_)
    for b_ in te0:
        b_["p"] = {m: prakira(par, b_, m) for m in MODEL}
    assert nilai_L(te0, B=300)["p_gabung"] > 0.05                          # tanpa skill: tidak lulus
    te[0]["p"]["hujan"] = None
    r2 = nilai_L(te, B=50)
    assert r2["n"] == len(te) - 1 and (r2["hilang_pos"] > 0 or r2["hilang_neg"] > 0)   # baris hilang keluar untuk SEMUA model
    v = vonis({1: dict(r, syarat0=True, syarat3=True, syarat4=True, p_gabung=0.001), 3: dict(r, syarat0=True, syarat3=True, syarat4=True, p_gabung=0.01),
               2: dict(r, syarat0=True, syarat3=True, syarat4=True, p_gabung=0.2)})
    assert v["utama"] == "LULUS" and v["andal_sampai"] == 1, v
    print("ok")
    return 0


def pengurai():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sp = ap.add_subparsers(dest="cmd", required=True)
    for n in ("inventaris", "tempuh", "fitur"):
        p = sp.add_parser(n)
        p.add_argument("--arsip", action="append", help="folder arsip TMA tambahan (bawaan data/raw/banjir/arsip_pos)")
        if n != "tempuh":
            p.add_argument("--cap", help="berkas JSON arsip CAP (bawaan cache)")
        if n == "inventaris":
            p.add_argument("--jaringan", action="store_true", help="unduh arsip CAP publik 2026-10-19..hari ini")
        if n == "fitur":
            p.add_argument("--t", required=True, help="waktu terbit ISO, mis. 2026-10-31T15:00+07:00")
    p = sp.add_parser("imerg_latensi"); p.add_argument("--hari"); p.add_argument("--dari"); p.add_argument("--sampai")
    p = sp.add_parser("imerg_unduh"); p.add_argument("--bulan", required=True); p.add_argument("--maks", type=int)
    p = sp.add_parser("fitur_hujan"); p.add_argument("--t", required=True)
    for n in ("latih", "nilai"):
        sp.add_parser(n).add_argument("--jalur", choices=["A"], required=True)
    p = sp.add_parser("daya"); p.add_argument("--ulang", type=int, default=8); p.add_argument("--B", type=int, default=400)
    sp.add_parser("jangkar").add_argument("--amandemen", help='jangkar ulang beramandemen, mis. "A1: alasan"; ditolak bila model/penanda buka ada')
    for n in ("sidik", "uji"):
        sp.add_parser(n)
    return ap, sp


PERINTAH = {"inventaris": cmd_inventaris, "tempuh": cmd_tempuh, "fitur": cmd_fitur, "imerg_latensi": cmd_imerg_latensi,
            "imerg_unduh": cmd_imerg_unduh, "fitur_hujan": cmd_fitur_hujan, "sidik": cmd_sidik, "jangkar": cmd_jangkar,
            "latih": cmd_latih, "nilai": cmd_nilai, "daya": cmd_daya, "uji": lambda _: uji()}


def main():
    a = pengurai()[0].parse_args()
    return PERINTAH[a.cmd](a)


if __name__ == "__main__":
    sys.exit(main())
