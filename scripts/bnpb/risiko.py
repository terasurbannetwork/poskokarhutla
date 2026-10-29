"""Indeks risiko operasional per kecamatan (ala InaRISK, tapi harian) -> public/banjir/data/risiko_kecamatan.json

  RISIKO (0-100) = 100 x BAHAYA x KETERPAPARAN x (1 - w x KAPASITAS)

  BAHAYA        maks dari bahaya per bencana yang tersedia (0-1). Dipilih maks, bukan 1-prod(1-h): enam bahaya yang semuanya
                sedang tidak boleh berjumlah jadi "hampir pasti", dan maks menunjuk SATU bahaya utama yang bisa ditindaklanjuti.
                Karhutla  : maks(FWI/14 sel 0,5 derajat terdekat, titik panas 3 hari di kecamatan / 5), tutup 1.   [harian]
                Banjir    : InaRISK maks(banjir, bandang, longsor) x (0,2 + 0,8 x peluang hujan >= 50 mm hari ini/besok). [statis x harian]
                Gempa     : InaRISK indeks bahaya gempa (0-1) di pusat kecamatan.                                     [statis]
                Gunung api: tingkat PVMBG hari ini (II 0,4; III 0,75; IV 1) x zona KRB yang menyentuh kecamatan (I 0,33; II 0,66; III 1). [harian]
                Kekeringan: tingkat 0-3 (/3) sel 0,5 derajat terdekat. AMBANG BELUM LAYAK uji balik (POD 0,23, FAR 0,93).  [harian, hipotesis]
                Cuaca     : tingkat peringatan 0-3 (/3) hari ini atau besok dari cuaca_kec.json (hujan, angin, gelombang).   [harian]
                Udara     : tingkat 0-3 (/3) dari PM2,5 rata-rata 24 jam: Baik dan Sedang = 0 (bukan bahaya), Tidak sehat 1,
                            Sangat tidak sehat 2, Berbahaya 3 (titik potong Permen LHK P.14/2020 = scripts/udara/kualitas.py BATAS;
                            ambang Tidak sehat = 55,4 sama dengan scripts/udara/dampak_udara.py). Maks hari ini dan besok, dari titik
                            kab/kota terdekat (paling jauh 80 km) di public/udara/data/prakiraan.json. Skala tingkat/3 sama dengan
                            kekeringan dan cuaca, BUKAN bobot baru. Perkiraan model CAMS ~40 km, belum dikoreksi alat ukur; belum diuji balik.                                                       [harian]
  KETERPAPARAN  peringkat persentil penduduk kecamatan (WorldPop 2026, penduduk.json) di antara semua kecamatan, 0-1.
  KAPASITAS     statis: 1 - jarak ke kantor BPBD terdekat / 100 km (proksi; hanya 324 kantor terpetakan). Bobot w = 0,3.
                Dinamis (opsional, C3): relawan siap per kabupaten dari /api/relawan/kapasitas. Hanya MENAIKKAN kapasitas:
                  kap = statis + (1 - statis) x WD x dinamis,  dinamis = min(1, siap / (penduduk kab / 10.000)),  WD = 0,5.
                Syarat anti-pendaftaran-palsu: dinamis hanya dihitung bila siap >= 10 DAN jam30 (jam kerja sah 30 hari) > 0 untuk kabupaten itu;
                kunci agregat yang dinormalkan ke kabupaten sama DIJUMLAHKAN (siap, jam30), bukan ditimpa. Kapasitas dinamis hanya untuk
                tampilan skor kecamatan; daftar prioritas (prioritas.py) memakai kap_statis supaya tak bisa ditekan lewat pendaftaran.
                Kabupaten yang tak ada di agregat (relawan belum mendaftar) TIDAK dihukum: kap = statis. Agregat gagal, 404, atau
                lebih tua dari 3 hari = tanpa komponen dinamis. Satu angka kabupaten berlaku untuk semua kecamatannya (tak bisa dipecah).
                Nama kabupaten dicocokkan: kunci "prov|kab" persis, lalu normal (huruf kecil, tanpa tanda baca, tanpa awalan "Kab."/"Kabupaten"; "Kota" dipertahankan).

Komponen yang hilang = null (bukan 0). Sekolah dan faskes hanya ada di sembilan provinsi prioritas: ditampilkan, TIDAK masuk skor.
Label wajib: "indeks komposit, belum diuji balik".

Pakai:  python3 scripts/bnpb/risiko.py [--hari YYYY-MM-DD]      |  python3 scripts/bnpb/risiko.py --cek
"""
import argparse, bisect, datetime as dt, json, math, os, re, sys, tempfile, urllib.request

AB = os.path.dirname(os.path.abspath(__file__))
AKAR = os.path.normpath(os.path.join(AB, "../.."))
sys.path.insert(0, os.path.join(AKAR, "scripts/umum"))
import kejadian as _kej   # simpan (kunci "dibuat" pertama, atomik), baca, km, dan pencari wilayah scripts/data/wilayah.py

WIB = dt.timezone(dt.timedelta(hours=7))
LABEL = "indeks komposit, belum diuji balik"
BOBOT_KAPASITAS = 0.3
WD_DINAMIS = 0.5                 # porsi sisa kapasitas (1 - statis) yang bisa diisi relawan
PENDUDUK_PER_RELAWAN = 10_000    # satu relawan siap per 10.000 penduduk kabupaten = dinamis 1,0
SIAP_MIN = 10                    # relawan siap minimum per kabupaten supaya komponen dinamis dihitung (pendaftaran sedikit/palsu tak menggeser skor)
JAM30_MIN = 0                    # jam kerja sah 30 hari harus LEBIH dari ini: relawan terdaftar tanpa pernah bertugas tidak dihitung
UMUR_KAPASITAS_MAKS = 3          # hari; agregat relawan lebih tua dari ini dibuang
URL_KAPASITAS = "https://centurisk97.id/api/relawan/kapasitas"
URL_MEJA = "https://centurisk97.id/api/meja/ringkas"
JARAK_KAPASITAS_KM = 100
KELAS = ["Rendah", "Sedang", "Tinggi", "Sangat tinggi"]
AMBANG = [15, 35, 60]            # skor < 15 rendah; < 35 sedang; < 60 tinggi; selebihnya sangat tinggi (ambang kerja tetap, bukan persentil)
PM_BATAS = [15.5, 55.4, 150.4, 250.4]   # sama dengan scripts/udara/kualitas.py BATAS (Permen LHK P.14/2020)
UMUR_MAKS = 7                    # hari; sumber harian yang lebih tua dari ini dibuang (null), yang lebih tua dari 2 hari ditandai usang
FWI_JENUH = 14                   # FWI >= 14 = kelas Sangat tinggi (scripts/data/aturan.py kelas_fwi)
TITIK_JENUH = 5                  # titik panas 3 hari di satu kecamatan yang dihitung penuh
BOBOT_LEVEL = {1: 0.0, 2: 0.4, 3: 0.75, 4: 1.0}
BOBOT_KRB = {"I": 0.33, "II": 0.66, "III": 1.0}
BENCANA = ["karhutla", "banjir", "gempa", "gunungapi", "kekeringan", "cuaca", "udara"]
NAMA = {"karhutla": "Karhutla", "banjir": "Banjir dan longsor", "gempa": "Gempa", "gunungapi": "Gunung api", "kekeringan": "Kekeringan", "cuaca": "Cuaca ekstrem", "udara": "Kualitas udara"}
KOLOM = ["prov", "kab", "kec", "risiko", "kelas", "bahaya", "utama"] + ["h_" + b for b in BENCANA] + ["pend", "pangkat", "bpbd_km", "kapasitas", "sekolah", "siswa", "faskes", "kap_statis", "kap_dinamis"]
Z = {"w": _kej._W}


def baca(jalur):
    return _kej.baca(os.path.join(AKAR, jalur))


def terdekat(titik, lat, lon, maks_km):
    """titik = [(lat, lon, ...)] -> baris terdekat dalam maks_km atau None."""
    b = None
    for t in titik:
        if abs(t[0] - lat) > maks_km / 100 or abs(t[1] - lon) > maks_km / 100:
            continue
        d = _kej.km((lat, lon), (t[0], t[1]))
        if d <= maks_km and (b is None or d < b[0]):
            b = (d, t)
    return b and b[1]


def pangkat(nilai):
    """{kunci: angka} -> {kunci: persentil 0-1} (seri dirata-ratakan)."""
    urut = sorted(nilai.values())
    n = len(urut)
    return {k: ((bisect.bisect_left(urut, v) + bisect.bisect_right(urut, v) - 1) / 2 / (n - 1) if n > 1 else 0.0) for k, v in nilai.items()}


def kelas_dari(skor):
    return None if skor is None else sum(skor >= a for a in AMBANG)


HIPOTESIS = ("kekeringan",)   # bahaya yang ambangnya gagal uji balik: kalah dari bahaya teruji bila nilainya sama


def utama_dari(ada):
    """{bencana: nilai} -> bencana utama, DETERMINISTIK: nilai tertinggi; seri dimenangkan bahaya yang bukan hipotesis, lalu urutan BENCANA (bukan urutan set/dict)."""
    urut = lambda b: BENCANA.index(b) if b in BENCANA else len(BENCANA)
    return max(ada, key=lambda b: (ada[b], b not in HIPOTESIS, -urut(b), b))


def risiko(h, pend_pangkat, kap):
    """h = {bencana: 0-1 atau None} yang dipilih -> (skor 0-100 atau None, bahaya, utama). Satu rumus untuk pipeline dan layar."""
    ada = {k: v for k, v in h.items() if v is not None}
    if not ada or pend_pangkat is None or kap is None:
        return None, (max(ada.values()) if ada else None), (utama_dari(ada) if ada else None)
    b = max(ada.values())
    return round(100 * b * pend_pangkat * (1 - BOBOT_KAPASITAS * kap), 1), b, utama_dari(ada)


def umur(hari, tgl):
    return None if not tgl else (dt.date.fromisoformat(hari) - dt.date.fromisoformat(tgl)).days


def pakai(hari, tgl):
    u = umur(hari, tgl)
    return u is not None and u <= UMUR_MAKS


def satuan(k):
    p, kab, kec = k
    return f"{p}|{kab}|{kec}"


# ---------------------------------------------------------------- bahaya per bencana: tiap fungsi -> ({kunci: 0-1 atau None}, meta)
def h_karhutla(pusat, fwi, hot, hari):
    h, tf, th = {}, None, None
    if fwi:
        tf = max((d["tgl"] for g in fwi["grid"] for d in g["hari"] if d["tgl"] <= hari), default=None)
        sel = [(g["lat"], g["lon"], d["fwi"]) for g in fwi["grid"] for d in g["hari"] if d["tgl"] == tf and d.get("fwi") is not None] if pakai(hari, tf) else []
    else:
        sel = []
    titik = {}
    if hot and "acuan" in hot:
        a = dt.datetime.fromisoformat(hot["acuan"]).astimezone(WIB).date()
        th = a.isoformat()
        tiga = {(a - dt.timedelta(days=i)).strftime("%m-%d") for i in range(3)}
        for r in hot["baris"]:
            if r[7] in tiga:
                titik[hot["wilayah"][r[6]]] = titik.get(hot["wilayah"][r[6]], 0) + 1
    for k, (la, lo) in pusat.items():
        s = terdekat(sel, la, lo, 80) if sel else None
        a = None if s is None else min(1.0, s[2] / FWI_JENUH)
        b = min(1.0, titik.get(k, 0) / TITIK_JENUH) if pakai(hari, th) else None
        v = [x for x in (a, b) if x is not None]
        h[k] = max(v) if v else None
    return h, {"tanggal": {"fwi": tf, "titik_panas": th}, "umur_hari": {"fwi": umur(hari, tf), "titik_panas": umur(hari, th)},
               "sumber": "FWI Kanada dari Open-Meteo (sel 0,5 derajat terdekat, paling jauh 80 km) dan titik panas NASA FIRMS 3 hari",
               "validasi": "FWI kelas BMKG/Kanada; belum diuji balik sebagai peluang kebakaran per kecamatan"}


def p_hujan(ans, hari):
    """Titik ansambel (lat, lon, peluang >= 50 mm hari ini/besok 0-1)."""
    if not ans or hari not in ans["hari"]:
        return [], None
    i = ans["hari"].index(hari)
    skala = 100.0 if any(max(g["p50"]) > 1 for g in ans["grid"]) else 1.0   # berkas pernah memakai persen
    return [(g["lat"], g["lon"], max(g["p50"][i:i + 2]) / skala) for g in ans["grid"]], ans["hari"][0]


def h_banjir(pusat, bahaya, ans, hari):
    titik, tgl = p_hujan(ans, hari)
    h = {}
    for k, (la, lo) in pusat.items():
        b = bahaya["kec"].get(k) if bahaya else None
        stat = None if not b else max(b.get("banjir") or 0, b.get("bandang") or 0, b.get("longsor") or 0)
        t = terdekat(titik, la, lo, 110) if titik else None
        h[k] = None if stat is None or t is None else stat * (0.2 + 0.8 * min(1.0, t[2]))
    return h, {"tanggal": {"hujan": tgl}, "umur_hari": {"hujan": umur(hari, tgl)},
               "sumber": "InaRISK BNPB banjir, banjir bandang, longsor (statis) × peluang hujan ≥ 50 mm/hari dari ansambel ECMWF (titik terdekat, paling jauh 110 km)",
               "validasi": "pengali 0,2 + 0,8 × peluang adalah pilihan kerja; peluang hujan sendiri diuji balik di modul banjir, gabungannya belum"}


def h_gempa(pusat, ig):
    h = {k: (ig["nilai"].get(k) if ig else None) for k in pusat}
    return h, {"sumber": "InaRISK BNPB indeks bahaya gempa bumi 0-1 di pusat kecamatan",
               "validasi": "potensi statis, bukan prakiraan hari ini; tidak berubah dari hari ke hari"}


def slug(n):
    return n.lower().replace(" ", "-")


def h_gunungapi(pusat, status, geo):
    """Kecamatan tersentuh KRB: pusatnya di dalam poligon zona, atau sebuah titik batas zona jatuh di dalam kecamatan."""
    h = {k: (0.0 if status and geo else None) for k in pusat}
    meta = {"sumber": "Tingkat aktivitas PVMBG/MAGMA × zona KRB PVMBG 2018",
            "validasi": "bobot tingkat dan zona adalah pilihan kerja; KRB hanya ada untuk sebagian gunung", "tanpa_krb": []}
    if not (status and geo):
        return h, meta
    W = Z["w"]
    level = {slug(g["nama"]): g["level"] for g in status["gunung"]}
    meta["tanggal"] = {"status": status.get("dibuat", "")[:10]}
    meta["tanpa_krb"] = sorted(g["nama"] for g in status["gunung"] if g["level"] >= 2 and slug(g["nama"]) not in geo)
    for gid, d in geo.items():
        w = BOBOT_LEVEL.get(level.get(gid, 1), 0.0)
        if w == 0:
            continue
        for zona, geom in d["zona"].items():
            bobot = w * BOBOT_KRB[zona]
            cincin = W._cincin(geom)
            kena = set()
            for r in cincin:
                for lon, lat in r:
                    a = Z["wilayah"].cari(lon, lat)
                    if a:
                        kena.add(satuan(a))
                xs, ys = [c[0] for c in r], [c[1] for c in r]
                for k, (la, lo) in pusat.items():
                    if min(xs) <= lo <= max(xs) and min(ys) <= la <= max(ys) and W._di_dalam(lo, la, r):
                        kena.add(k)
            for k in kena:
                if k in h:
                    h[k] = max(h[k], bobot)
    return h, meta


def h_kekeringan(pusat, grid, kmeta, hari):
    tgl = kmeta.get("hari_ini") if kmeta else None
    baris = [(r[0], r[1], r[7]) for r in grid["grid"] if r[7] is not None] if grid and pakai(hari, tgl) else []
    h = {}
    for k, (la, lo) in pusat.items():
        t = terdekat(baris, la, lo, 80) if baris else None
        h[k] = None if t is None else t[2] / 3
    return h, {"tanggal": {"status": tgl}, "umur_hari": {"status": umur(hari, tgl)},
               "sumber": "Tingkat kekeringan 0-3 sel 0,5 derajat (SPI-3 dan Kode Kekeringan)",
               "validasi": "MERAGUKAN: aturan ambang kekeringan TIDAK LAYAK uji balik terhadap DIBI (POD 0,23 < 0,5; FAR 0,93 > 0,8). Angka ditampilkan sebagai hipotesis."}


def h_cuaca(pusat, cuaca, hari, urut):
    """`i` di cuaca_kec.json = indeks ke urutan kunci pusat_kec.json (urut)."""
    h, tgl = {}, None
    if cuaca and hari in cuaca["hari"]:
        i = cuaca["hari"].index(hari)
        tgl = cuaca["hari"][0]
        ada = {urut[r[0]]: max(r[1][i:i + 2]) for r in cuaca["kec"]}
        h = {k: ada.get(k, 0) / 3 for k in pusat}      # berkas hanya menulis kecamatan bertingkat >= 1: yang tak tertulis = tingkat 0
    else:
        h = {k: None for k in pusat}
    return h, {"tanggal": {"cuaca": tgl}, "umur_hari": {"cuaca": umur(hari, tgl)},
               "sumber": "Tingkat peringatan 0-3 hujan, angin, gelombang hari ini atau besok dari BMKG; kecamatan tak tertulis = tingkat 0",
               "validasi": "ambang hujan, angin, gelombang kelas BMKG; ambang ansambel masih hipotesis"}


def h_udara(pusat, prak, hari):
    """prak = prakiraan.json udara: kota[{lat, lon, r24 = PM2,5 rata-rata 24 jam per hari}], hari[]. Tingkat 0-3 / 3 (Baik dan Sedang = 0), maks hari ini dan besok."""
    h, tgl = {k: None for k in pusat}, None
    if prak and hari in prak.get("hari", []):
        i, tgl = prak["hari"].index(hari), prak["hari"][0]
        kota = []
        for c in prak["kota"]:
            v = [x for x in c["r24"][i:i + 2] if x is not None]
            if v:
                kota.append((c["lat"], c["lon"], sum(max(v) > b for b in PM_BATAS[1:]) / 3))
        for k, (la, lo) in pusat.items():
            t = terdekat(kota, la, lo, 80) if kota else None
            h[k] = None if t is None else t[2]
    return h, {"tanggal": {"prakiraan": tgl}, "umur_hari": {"prakiraan": umur(hari, tgl)},
               "sumber": "Tingkat 0-3 dari PM2,5 rata-rata 24 jam (Baik dan Sedang = 0, Tidak sehat 1 sampai Berbahaya 3; Permen LHK P.14/2020) hari ini atau besok, kab/kota terdekat paling jauh 80 km, prakiraan CAMS via Open-Meteo",
               "validasi": "perkiraan model ~40 km, belum dikoreksi alat ukur dan belum diuji balik; skala tingkat/3 mengikuti kekeringan dan cuaca, bukan bobot baru"}


# ---------------------------------------------------------------- kapasitas dinamis (C3)
def ambil_json(sumber):
    """Berkas lokal atau URL -> isi JSON, atau None (gagal, 404, bukan JSON). Tidak pernah melempar."""
    try:
        if re.match(r"https?://", sumber):
            with urllib.request.urlopen(urllib.request.Request(sumber, headers={"User-Agent": "pantau-bencana-risiko"}), timeout=15) as r:
                return json.load(r)
        with open(sumber, encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return None


def norm_kab(n):
    s = re.sub(r"[^a-z0-9 ]", "", n.lower().replace(".", ". ")).split()
    if s and s[0] in ("kab", "kabupaten"):
        s = s[1:]
    return "".join(s)


def cocok_kab(kunci, ada):
    """kunci "prov|kab" dari agregat -> kunci "prov|kab" di indeks (persis, lalu normal) atau None."""
    if kunci in ada:
        return kunci
    p, _, n = kunci.partition("|")
    return next((k for k in ada if k.startswith(p + "|") and norm_kab(k[3:]) == norm_kab(n)), None)


def kap_dinamis(agregat, pend_kab, hari):
    """-> ({kab: 0-1}, meta). Agregat None, tanpa kunci kab, atau basi -> ({}, meta dipakai False)."""
    meta = {"dipakai": False, "sumber": URL_KAPASITAS, "bobot": {"WD": WD_DINAMIS, "penduduk_per_relawan": PENDUDUK_PER_RELAWAN, "umur_maks_hari": UMUR_KAPASITAS_MAKS},
            "alasan": None, "dibuat": None, "kabupaten_cocok": 0, "kabupaten_tak_cocok": []}
    if not isinstance(agregat, dict) or not isinstance(agregat.get("kab"), dict):
        meta["alasan"] = "tidak tersedia (gagal, 404, atau bentuk lain)"
        return {}, meta
    meta["dibuat"] = agregat.get("dibuat")
    d = agregat.get("dibuat")   # teks ISO, atau epoch milidetik (API kapasitas sejak 27 Okt 2026)
    if isinstance(d, (int, float)) and not isinstance(d, bool):
        d = dt.datetime.fromtimestamp(d / 1000, WIB).date().isoformat()
    u = umur(hari, (d if isinstance(d, str) else "")[:10])
    if u is None or u > UMUR_KAPASITAS_MAKS or u < 0:
        meta["alasan"] = f"basi atau tanpa tanggal (umur {u} hari, maks {UMUR_KAPASITAS_MAKS})"
        return {}, meta
    jml, out = {}, {}
    for kunci, v in agregat["kab"].items():
        k = cocok_kab(kunci, pend_kab)
        siap = v.get("siap") if isinstance(v, dict) else None
        if k is None:
            meta["kabupaten_tak_cocok"].append(kunci)
        elif isinstance(siap, (int, float)) and siap >= 0 and pend_kab[k]:
            j = v.get("jam30")
            a = jml.setdefault(k, [0, 0.0])
            a[0] += siap
            a[1] += j if isinstance(j, (int, float)) and j > 0 else 0   # dua kunci agregat yang jatuh ke kabupaten sama dijumlahkan
    tolak = 0
    for k, (siap, jam30) in jml.items():
        if siap >= SIAP_MIN and jam30 > JAM30_MIN:
            out[k] = round(min(1.0, siap / (pend_kab[k] / PENDUDUK_PER_RELAWAN)), 3)
        else:
            tolak += 1
    meta.update(dipakai=bool(out), kabupaten_cocok=len(out), kabupaten_ditolak_syarat=tolak, kabupaten_tak_cocok=sorted(meta["kabupaten_tak_cocok"])[:20])
    meta["syarat"] = f"relawan siap >= {SIAP_MIN} dan jam kerja sah 30 hari > {JAM30_MIN} per kabupaten"
    meta["alasan"] = None if out else ("agregat kosong" if not jml else "tidak ada kabupaten yang memenuhi syarat")
    return out, meta


def gabung_kapasitas(statis, dinamis):
    """Hanya menaikkan; statis None tetap None (tak ada jarak = tak ada dasar)."""
    if statis is None or dinamis is None:
        return statis
    return round(statis + (1 - statis) * WD_DINAMIS * dinamis, 3)


# ---------------------------------------------------------------- keterpaparan, kapasitas, fasilitas
def fasilitas(unit, sekolah, fas):
    """Sekolah dan siswa dari sekolah.json (cocok lewat nama), faskes dari fasilitas.json (titik dalam kecamatan). Hanya provinsi yang tercakup."""
    sk, sw, fk, prov = {}, {}, {}, set()
    if sekolah:
        for r in sekolah["baris"]:
            k = f"{r[5]}|{r[6]}|{r[7]}"
            sk[k] = sk.get(k, 0) + 1
            sw[k] = sw.get(k, 0) + (r[4] or 0)
            prov.add(r[5])
    if fas:
        for x in fas:
            if x["t"] in ("faskes", "rs"):
                a = Z["wilayah"].cari(x["lon"], x["lat"])
                if a:
                    fk[satuan(a)] = fk.get(satuan(a), 0) + 1
    return ({k: (sk.get(k) if k[:2] in prov else None) for k in unit}, {k: (sw.get(k) if k[:2] in prov else None) for k in unit},
            {k: (fk.get(k, 0) or None) if k[:2] in prov else None for k in unit})


def bangun(src, hari, kapasitas=None):
    """src = {nama: isi JSON atau None}; unit = semua kecamatan bernama di geo. -> dict keluaran (tanpa `dibuat`)."""
    ident = sorted({a for v in Z["wilayah"].indeks.values() for _, _, a in v if a[1] and a[2]})
    unit = [satuan(a) for a in ident]
    kpusat = src["pusat_kec"]
    pusat = {k: tuple(kpusat[k]) for k in unit if k in kpusat}
    H, M = {}, {}
    H["karhutla"], M["karhutla"] = h_karhutla(pusat, src["fwi"], src["hotspot"], hari)
    H["banjir"], M["banjir"] = h_banjir(pusat, src["bahaya"], src["hujan_ansambel"], hari)
    H["gempa"], M["gempa"] = h_gempa(pusat, src["inarisk_gempa"])
    H["gunungapi"], M["gunungapi"] = h_gunungapi(pusat, src["gunungapi_status"], src["paparan_geo"])
    H["kekeringan"], M["kekeringan"] = h_kekeringan(pusat, src["kekeringan_grid"], src["kekeringan_meta"], hari)
    H["cuaca"], M["cuaca"] = h_cuaca(pusat, src["cuaca_kec"], hari, list(kpusat))
    H["udara"], M["udara"] = h_udara(pusat, src["udara_prakiraan"], hari)
    pend = {k: v for k, v in ((src["penduduk"] or {}).get("kec") or {}).items() if k in set(unit) and v}
    rank = pangkat(pend)
    kantor = [(x["lat"], x["lon"]) for x in (src["bpbd"] or {}).get("kantor", []) if x.get("lat") is not None]
    sek, siswa, faskes = fasilitas(unit, src["sekolah"], src["fasilitas"])
    pend_kab = {}
    for k, v in pend.items():
        kk = k.rsplit("|", 1)[0]
        pend_kab[kk] = pend_kab.get(kk, 0) + v
    dinkab, dmeta = kap_dinamis(kapasitas, pend_kab, hari)
    baris, kosong = [], {b: 0 for b in BENCANA}
    for a, k in zip(ident, unit):
        h = {b: (None if k not in pusat or H[b].get(k) is None else round(H[b][k], 3)) for b in BENCANA}
        for b in BENCANA:
            kosong[b] += h[b] is None
        d = None
        if k in pusat and kantor:
            d = min(_kej.km(pusat[k], c) for c in kantor)
        kap_s = None if d is None else round(max(0.0, 1 - d / JARAK_KAPASITAS_KM), 3)
        kap_d = dinkab.get(k.rsplit("|", 1)[0])
        kap = gabung_kapasitas(kap_s, kap_d)
        r = rank.get(k)
        r = None if r is None else round(r, 3)   # skor dihitung dari angka yang terbit, supaya layar bisa mengulang persis
        skor, b, utama = risiko(h, r, kap)
        baris.append([a[0], a[1], a[2], skor, kelas_dari(skor), None if b is None else round(b, 3), utama] + [h[x] for x in BENCANA] +
                     [pend.get(k), None if r is None else round(r, 3), None if d is None else round(d, 1), kap, sek[k], siswa[k], faskes[k], kap_s, kap_d])
    dist = [0] * 4
    for r in baris:
        if r[4] is not None:
            dist[r[4]] += 1
    return {
        "versi": 1, "hari": hari, "label": LABEL,
        "rumus": "risiko = 100 × bahaya × keterpaparan × (1 − w × kapasitas); bahaya = maks bahaya per bencana yang tersedia; keterpaparan = peringkat persentil penduduk; kapasitas = 1 - jarak BPBD / 100 km",
        "bobot": {"w_kapasitas": BOBOT_KAPASITAS, "jarak_kapasitas_km": JARAK_KAPASITAS_KM, "level_gunungapi": BOBOT_LEVEL, "krb": BOBOT_KRB,
                  "fwi_jenuh": FWI_JENUH, "titik_panas_jenuh": TITIK_JENUH, "pemicu_banjir": "0,2 + 0,8 × peluang hujan ≥ 50 mm"},
        "kelas": KELAS, "ambang": AMBANG, "ambang_catatan": "skor < 15 Rendah; < 35 Sedang; < 60 Tinggi; selebihnya Sangat tinggi. Ambang kerja tetap, belum dikalibrasi ke DIBI.",
        "bencana": [{"id": b, "nama": NAMA[b], **M[b], "kosong": kosong[b]} for b in BENCANA],
        "keterpaparan": {"sumber": "WorldPop Global2 R2025A 2026 per kecamatan, peringkat persentil nasional",
                         "catatan": "sekolah, siswa (Dapodik/EMIS) dan faskes (OSM) hanya tersedia untuk sebagian provinsi; ditampilkan, tidak masuk skor"},
        "kapasitas": {"statis": "jarak pusat kecamatan ke kantor BPBD terdekat (324 kantor BPBD terpetakan): proksi, bukan kemampuan nyata",
                      "kapasitas_dinamis": dmeta,
                      "kapasitas_dinamis_catatan": "relawan siap per kabupaten (satu angka untuk semua kecamatannya) hanya menaikkan kapasitas; posko, regu, dan Destana per kabupaten belum tersedia publik",
                      "rumus_dinamis": f"kap = statis + (1 - statis) × {WD_DINAMIS} × min(1, relawan siap / (penduduk kab / {PENDUDUK_PER_RELAWAN})); hanya bila siap >= {SIAP_MIN} dan jam kerja sah 30 hari > {JAM30_MIN}"},
        "provinsi": {p: n for p, n in Z["w"].PROVINSI.items()},
        "ringkas": {"kecamatan": len(baris), "tanpa_skor": sum(r[3] is None for r in baris), "per_kelas": dict(zip(KELAS, dist))},
        "kolom": KOLOM, "kec": baris,
    }


def muat():
    d = lambda p: baca(p)
    return {"pusat_kec": d("public/banjir/data/pusat_kec.json"), "fwi": d("public/data/fwi.json"), "hotspot": d("public/data/hotspot.json"),
            "bahaya": d("public/banjir/data/bahaya.json"), "hujan_ansambel": d("public/banjir/data/hujan_ansambel.json"),
            "inarisk_gempa": d("public/gempa/data/inarisk_gempa.json"), "gunungapi_status": d("public/banjir/data/gunungapi_status.json"),
            "paparan_geo": d("public/gunungapi/data/paparan_geo.json"), "kekeringan_grid": d("public/data/kekeringan_grid.json"),
            "kekeringan_meta": d("public/data/kekeringan_meta.json"), "cuaca_kec": d("public/banjir/data/cuaca_kec.json"),
            "penduduk": d("public/data/penduduk.json"), "bpbd": d("public/data/bpbd.json"), "sekolah": d("public/data/sekolah.json"),
            "fasilitas": d("public/data/fasilitas.json"), "udara_prakiraan": d("public/udara/data/prakiraan.json")}


def siapkan():
    Z["wilayah"] = Z["w"].Wilayah()
    return muat()


def cek_dinamis(src, hari, dasar, ix):
    # pencocokan nama
    ada = {"31|Jakarta Selatan": 1, "32|Bogor": 1, "32|Kota Bogor": 1, "73|Luwu Utara": 1}
    assert cocok_kab("32|Kab. Bogor", ada) == "32|Bogor" and cocok_kab("32|KOTA BOGOR", ada) == "32|Kota Bogor"
    assert cocok_kab("32|Kabupaten Bogor", ada) == "32|Bogor" and cocok_kab("31|Jakarta  Selatan", ada) == "31|Jakarta Selatan"
    assert cocok_kab("99|Bogor", ada) is None and cocok_kab("73|Luwu", ada) is None
    # formula pada angka tangan
    assert gabung_kapasitas(0.2, 1.0) == 0.6 and gabung_kapasitas(0.2, 0.0) == 0.2 and gabung_kapasitas(1.0, 1.0) == 1.0
    assert gabung_kapasitas(None, 1.0) is None and gabung_kapasitas(0.4, None) == 0.4
    pk = {"32|Bogor": 100_000}
    T = "2026-10-19T08:00+07:00"
    d, m = kap_dinamis({"dibuat": T, "kab": {"32|Kab. Bogor": {"siap": 5, "jam30": 8}, "99|Hantu": {"siap": 3}}}, {"32|Bogor": 100_000}, hari)
    assert d == {} and m["kabupaten_tak_cocok"] == ["99|Hantu"] and m["kabupaten_ditolak_syarat"] == 1, "siap < 10 tidak boleh menghitung dinamis"
    pk = {"32|Bogor": 200_000}
    d, m = kap_dinamis({"dibuat": T, "kab": {"32|Kab. Bogor": {"siap": 10, "jam30": 0.5}}}, pk, hari)
    assert d == {"32|Bogor": 0.5} and m["dipakai"], (d, m)
    assert kap_dinamis({"dibuat": T, "kab": {"32|Bogor": {"siap": 99, "jam30": 0}}}, pk, hari)[0] == {}, "jam30 = 0 (tak pernah bertugas) tidak dihitung"
    assert kap_dinamis({"dibuat": T, "kab": {"32|Bogor": {"siap": 99}}}, pk, hari)[0] == {}, "tanpa jam30 tidak dihitung"
    assert kap_dinamis({"dibuat": T, "kab": {"32|Bogor": {"siap": 99, "jam30": 1}}}, pk, hari)[0] == {"32|Bogor": 1.0}
    ms = int(dt.datetime.fromisoformat(hari + "T08:00+07:00").timestamp() * 1000)   # API kapasitas mengirim epoch ms sejak 27 Okt 2026
    assert kap_dinamis({"dibuat": ms, "kab": {"32|Bogor": {"siap": 99, "jam30": 1}}}, pk, hari)[0] == {"32|Bogor": 1.0}, "dibuat epoch ms harus dibaca sebagai tanggal"
    # dua kunci yang dinormalkan ke kabupaten sama dijumlahkan, bukan ditimpa (6 + 6 = 12 >= 10; jam 0 + 3 > 0)
    d, _ = kap_dinamis({"dibuat": T, "kab": {"32|Kab. Bogor": {"siap": 6, "jam30": 0}, "32|Bogor": {"siap": 6, "jam30": 3}}}, pk, hari)
    assert d == {"32|Bogor": round(12 / 20, 3)}, d
    # basi, 404, bentuk lain, tanpa tanggal = tanpa komponen dinamis
    for agg in (None, {"error": "x"}, {"dibuat": "2026-10-10T00:00+07:00", "kab": {"32|Bogor": {"siap": 50, "jam30": 5}}}, {"kab": {"32|Bogor": {"siap": 50, "jam30": 5}}}, {"dibuat": "2026-10-19", "kab": {}}):
        assert kap_dinamis(agg, pk, hari)[0] == {} and not kap_dinamis(agg, pk, hari)[1]["dipakai"] and kap_dinamis(agg, pk, hari)[1]["alasan"]
    assert ambil_json("/tidak/ada.json") is None
    # fixture penuh: kabupaten pertama ber-skor mendapat dinamis penuh; kapasitas naik, skor tidak naik; kab lain tak berubah
    kabs = {}
    for r in dasar["kec"]:
        if r[ix["pend"]]:
            kabs[f"{r[0]}|{r[1]}"] = kabs.get(f"{r[0]}|{r[1]}", 0) + r[ix["pend"]]
    kunci = next(k for k in kabs if any(f"{r[0]}|{r[1]}" == k and r[ix["risiko"]] for r in dasar["kec"]))
    agg = {"dibuat": hari + "T06:00+07:00", "kab": {kunci: {"siap": 10 ** 6, "jam30": 100}}}
    b = bangun(src, hari, agg)
    assert b["kapasitas"]["kapasitas_dinamis"]["dipakai"] and b["kapasitas"]["kapasitas_dinamis"]["kabupaten_cocok"] == 1
    naik = 0
    for r0, r1 in zip(dasar["kec"], b["kec"]):
        if f"{r1[0]}|{r1[1]}" == kunci:
            assert r1[ix["kap_dinamis"]] == 1.0 and (r1[ix["kapasitas"]] is None or r1[ix["kapasitas"]] >= r0[ix["kapasitas"]])
            assert r1[ix["risiko"]] is None or r1[ix["risiko"]] <= r0[ix["risiko"]], "relawan tidak boleh menaikkan risiko"
            naik += r1[ix["kapasitas"]] is not None and r1[ix["kapasitas"]] > r0[ix["kapasitas"]]
        else:
            assert r1[ix["risiko"]] == r0[ix["risiko"]] and r1[ix["kapasitas"]] == r0[ix["kapasitas"]], "kabupaten tanpa agregat berubah"
    assert naik > 0
    # skor layar (rumus risiko() pada kolom terbit) tetap sama dengan pipeline
    for r in b["kec"][:3000]:
        if r[ix["risiko"]] is not None:
            assert risiko({x: r[ix["h_" + x]] for x in BENCANA}, r[ix["pangkat"]], r[ix["kapasitas"]])[0] == r[ix["risiko"]]


def cek():
    src = siapkan()
    hari = "2026-10-19"   # hari tetap: determinisme tidak bergantung jam
    a = bangun(src, hari)
    b = bangun(src, hari)
    assert a == b, "tidak deterministik"
    n_geo = len({a_ for v in Z["wilayah"].indeks.values() for _, _, a_ in v if a_[1] and a_[2]})
    assert len(a["kec"]) == n_geo == a["ringkas"]["kecamatan"] > 7000, (len(a["kec"]), n_geo)
    assert len({(r[0], r[1], r[2]) for r in a["kec"]}) == n_geo, "kunci kecamatan ganda"
    ix = {k: i for i, k in enumerate(a["kolom"])}
    ada = 0
    for r in a["kec"]:
        assert len(r) == len(a["kolom"])
        for k in ["risiko", "bahaya", "pangkat", "kapasitas"] + ["h_" + x for x in BENCANA]:
            v = r[ix[k]]
            assert v is None or (isinstance(v, (int, float)) and not math.isnan(v) and 0 <= v <= (100 if k == "risiko" else 1)), (r[:3], k, v)
        if r[ix["risiko"]] is None:
            assert r[ix["pend"]] is None or r[ix["kapasitas"]] is None or all(r[ix["h_" + x]] is None for x in BENCANA), (r[:3], "skor hilang padahal komponen lengkap")
        else:
            ada += 1
            assert r[ix["kelas"]] == kelas_dari(r[ix["risiko"]]) and r[ix["utama"]] in BENCANA
            h = {x: r[ix["h_" + x]] for x in BENCANA}
            assert risiko(h, r[ix["pangkat"]], r[ix["kapasitas"]])[0] == r[ix["risiko"]], "rumus layar berbeda dari pipeline"
        assert r[ix["pend"]] is not None or r[ix["risiko"]] is None, "penduduk hilang tidak boleh punya skor"
    assert ada > 0.9 * n_geo, f"terlalu banyak kecamatan tanpa skor: {ada}/{n_geo}"
    assert a["kapasitas"]["kapasitas_dinamis"]["dipakai"] is False and a["label"] == LABEL
    assert all(r[ix["kap_dinamis"]] is None and r[ix["kap_statis"]] == r[ix["kapasitas"]] for r in a["kec"]), "tanpa agregat kapasitas = statis"
    # komponen hilang = null, bukan 0: buang gempa dan hasilnya tidak berubah ke 0
    src2 = dict(src, inarisk_gempa=None)
    c = bangun(src2, hari)
    assert all(r[ix["h_gempa"]] is None for r in c["kec"]), "gempa hilang harus null"
    # udara pada angka tangan: tingkat 0-3 / 3 (Baik dan Sedang = 0), maks hari ini dan besok, titik jauh (> 80 km) = null
    pk = {"a": (0.0, 100.0), "b": (0.0, 100.8), "c": (5.0, 100.0)}
    pr = {"hari": [hari, "x", "y"], "kota": [{"lat": 0.0, "lon": 100.0, "r24": [10, 60, 400]}, {"lat": 0.0, "lon": 100.8, "r24": [None, None, 400]}]}
    hu, mu = h_udara(pk, pr, hari)
    assert hu == {"a": 1 / 3, "b": None, "c": None}, hu   # a: maks(10, 60) = 60 -> Tidak sehat = 1/3; Sedang (30) = 0; b: tanpa nilai; c: jauh
    assert h_udara({"a": (0.0, 100.0)}, {"hari": [hari], "kota": [{"lat": 0.0, "lon": 100.0, "r24": [30]}]}, hari)[0] == {"a": 0.0}, "Sedang bukan bahaya"
    assert all(v is None for v in h_udara(pk, pr, "2030-01-01")[0].values()) and all(v is None for v in h_udara(pk, None, hari)[0].values())
    assert "udara" in BENCANA and "belum diuji balik" in mu["validasi"]
    # rumus pada angka tangan
    assert risiko({"a": 0.5, "b": None}, 1.0, 0.0) == (50.0, 0.5, "a")
    assert risiko({"a": 0.5}, 1.0, 1.0)[0] == 35.0 and risiko({"a": None}, 1.0, 0.0)[0] is None and risiko({"a": 1.0}, None, 0.0)[0] is None
    assert pangkat({"x": 1, "y": 2, "z": 3}) == {"x": 0.0, "y": 0.5, "z": 1.0} and pangkat({"x": 5, "y": 5, "z": 9})["x"] == 0.25
    assert [kelas_dari(s) for s in (0, 14.9, 15, 34.9, 35, 59.9, 60, 100, None)] == [0, 0, 1, 1, 2, 2, 3, 3, None]
    cek_dinamis(src, hari, a, ix)
    # keluaran ke berkas: kunci "dibuat" pertama, ukuran wajar
    with tempfile.TemporaryDirectory() as t:
        p = os.path.join(t, "r.json")
        _kej.simpan(p, a)
        assert next(iter(json.load(open(p)))) == "dibuat" and os.path.getsize(p) < 2_000_000, os.path.getsize(p)
    print(f"cek ok: {n_geo} kecamatan, {ada} bersekor, kelas {a['ringkas']['per_kelas']}, kosong {[(x['id'], x['kosong']) for x in a['bencana']]}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--hari", default=dt.datetime.now(WIB).date().isoformat())
    ap.add_argument("--cek", action="store_true")
    ap.add_argument("--kapasitas", default=URL_KAPASITAS, help="berkas JSON atau URL agregat relawan (fixture lokal untuk uji); gagal = tanpa komponen dinamis")
    ap.add_argument("--tanpa-kapasitas", action="store_true")
    ap.add_argument("--keluar", default=os.path.join(AKAR, "public/banjir/data/risiko_kecamatan.json"))
    a = ap.parse_args()
    if a.cek:
        return cek()
    isi = bangun(siapkan(), a.hari, None if a.tanpa_kapasitas else ambil_json(a.kapasitas))
    _kej.simpan(a.keluar, isi)
    print(f"risiko: {isi['ringkas']['kecamatan']} kecamatan, {isi['ringkas']['tanpa_skor']} tanpa skor, kelas {isi['ringkas']['per_kelas']}, {os.path.getsize(a.keluar) // 1024} KB", file=sys.stderr)


if __name__ == "__main__":
    main()
