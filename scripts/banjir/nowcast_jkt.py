"""Nowcast banjir Jakarta per kecamatan, tenggang 1-6 jam. FASE 1: inventaris + fitur BEBAS LABEL. Protokol: scripts/banjir/PRAREG-NOWCAST-JKT.md.

  inventaris [--arsip DIR]... [--cap FILE] [--jaringan]   sumber, rentang, frekuensi; PetaBencana HANYA jumlah laporan per bulan
  tempuh [--arsip DIR]...                                  korelasi silang kenaikan pos hulu vs hilir per jeda 0-12 jam (tanpa label)
  fitur --t ISO [--arsip DIR]... [--cap FILE]              fitur 42 kecamatan daratan DKI pada waktu terbit t (JSON ke stdout)
  imerg_latensi [--hari YYYY-MM-DD]                        latensi nyata IMERG Early dari daftar folder publik GES DISC (tanpa token)
  imerg_unduh --bulan YYYY-MM [--maks N]                   JALUR A: IMERG Early 30 menit, kotak Jakarta 7x7 sel lewat OPeNDAP (EARTHDATA_TOKEN; tanpa token keluar 0)
  fitur_hujan --t ISO                                      JALUR A: fitur hujan IMERG 42 kecamatan pada t (latensi LAT_IMERG)
  uji                                                      swa-uji luring (pembeda latensi + kausal, korelasi silang, hitung bulanan, musim)

Tidak ada `latih`, `buka`, atau `nilai` di fase 1: tidak ada parameter yang disetel pada label, dan berkas ini tidak membaca lokasi/waktu laporan.
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
LAT_IMERG = 5 * 3600                # slot 30 menit berakhir e dipakai bila e + LAT_IMERG <= t (terukur 31 Okt 2026: p50 4,9 jam, maks 4,9 jam dari daftar folder)
IMERG_BASE = "https://gpm1.gesdisc.eosdis.nasa.gov"
IMERG_KOL = "GPM_3IMERGHHE.07"      # Early Run 30 menit: algoritme yang sama dengan operasional (arsip V07B, operasional V07C)
I_LON, I_LAT = (2865, 2871), (834, 840)   # lon -179,95 + 0,1 i = 106,55..107,15; lat -89,95 + 0,1 j = -6,55..-5,95 (49 sel, memuat 42 pusat kecamatan)
IMERG_DIR = os.path.join(CACHE, "imerg")
BULAN_TERLIHAT_A = {"2025-03"}      # kejadian J1/J2 (bersama.KEJADIAN) di musim uji: labelnya pernah dibaca, keluar dari uji jalur A
MUSIM = {"latih": ("2016/17", "2017/18", "2018/19", "2019/20"), "validasi": ("2020/21", "2021/22"),
         "uji": ("2022/23", "2023/24", "2024/25", "2025/26")}       # Nov-Apr; bulan J3 (2025-04) dan >= jangkar J4 tetap dibuang   # jangkar J4 (j4_sidik.json): arsip berhenti di sini; sesudahnya hanya prospektif


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


def peran(t):
    """'latih'|'validasi'|'uji'|None; None juga untuk bulan J3 dan masa J4."""
    if f"{t:%Y-%m}" in BULAN_TERLARANG | BULAN_TERLIHAT_A or t >= AWAL_J4:
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
                try:
                    n = parse(ambil(folder_imerg(d).replace("/data/", "/opendap/") + nama + ".ascii?" + urllib.parse.quote(q, safe=":")))
                except Exception as x:
                    gagal += 1; print(f"  {nama}: {x}", file=sys.stderr); continue
                if not n:
                    gagal += 1; continue
                v = [n.get((k // nj, k % nj)) for k in range(ni * nj)]
                out.write(json.dumps({"e": epoch(e), "v": [None if x is None else round(x, 2) for x in v]}, separators=(",", ":")) + "\n"); out.flush()
                baru += 1
            d += dt.timedelta(days=1)
    return baru, gagal

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
    tgl = dt.date.fromisoformat(a.hari) if a.hari else dt.datetime.now(dt.timezone.utc).date() - dt.timedelta(days=1)
    b = berkas_imerg(ambil_publik(folder_imerg(tgl)), tgl)
    L = latensi_imerg(b)
    if not L:
        print(f"{tgl}: tak ada berkas/stempel"); return 1
    n = len(L)
    print(f"IMERG Early {tgl}: {n} slot, latensi jam p10 {L[n // 10]:.2f} p50 {L[n // 2]:.2f} p90 {L[9 * n // 10]:.2f} maks {L[-1]:.2f}; LAT_IMERG = {LAT_IMERG / 3600:g} jam")
    return 0 if L[9 * n // 10] <= LAT_IMERG / 3600 else 3


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


def uji():
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
    import random
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
    # 7. berkas fase 1 tidak punya jalur latih/buka/nilai dan tidak membaca kolom lokasi laporan
    src = open(os.path.abspath(__file__)).read()
    assert "add_parser(\"latih" not in src and "add_parser(\"buka" not in src and "add_parser(\"nilai" not in src
    assert src.count("r[" + '"lon"]') == 0 and src.count("r[" + '"lat"]') == 0   # tak pernah membaca koordinat laporan
    # 8. JALUR A: pembagian musim beku, saling lepas, bulan J3 dan masa J4 tanpa peran
    semua = [m for v in MUSIM.values() for m in v]
    assert len(semua) == len(set(semua)) == 10 and musim(dt.datetime(2017, 2, 1, tzinfo=WIB)) == "2016/17" and musim(dt.datetime(2017, 7, 1, tzinfo=WIB)) is None
    assert peran(dt.datetime(2017, 1, 5, tzinfo=WIB)) == "latih" and peran(dt.datetime(2021, 12, 5, tzinfo=WIB)) == "validasi"
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
    print("ok")
    return 0


def main():
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
    p = sp.add_parser("imerg_latensi"); p.add_argument("--hari")
    p = sp.add_parser("imerg_unduh"); p.add_argument("--bulan", required=True); p.add_argument("--maks", type=int)
    p = sp.add_parser("fitur_hujan"); p.add_argument("--t", required=True)
    sp.add_parser("uji")
    a = ap.parse_args()
    return {"inventaris": cmd_inventaris, "tempuh": cmd_tempuh, "fitur": cmd_fitur, "imerg_latensi": cmd_imerg_latensi,
            "imerg_unduh": cmd_imerg_unduh, "fitur_hujan": cmd_fitur_hujan, "uji": lambda _: uji()}[a.cmd](a)


if __name__ == "__main__":
    sys.exit(main())
