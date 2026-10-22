"""Peta karhutla: hotspot, luas terbakar, belum padam, padam per provinsi per hari WIB (tahun berjalan) -> public/data/peta_karhutla.json

Metode "deck" (sama dengan deck BNPB 21 Okt 2026; rujukan data/laporan-bnpb/satelit-2026-10-21/hitung3.py, hitung_nasional.py, README.md):
- provinsi = wilayah.Wilayah().cari(lon, lat)[0]; hari = hari kalender WIB (UTC+7) dari acq_date + acq_time.
- hot   = titik MODIS (Terra+Aqua) + VIIRS S-NPP + NOAA-20, semua tingkat keyakinan (definisi SiPongi; jumlah per provinsi baru terbukti
  sama untuk Papua Selatan, di provinsi lain deck mencatat selisih besar dengan GIS BNPB). Sesudah S-NPP berhenti (SNPP_AKHIR) NOAA-21 menggantikannya.
- luas  = titik NOAA-20 + NOAA-21 berkeyakinan n/h x porsi x 4,3 ha.
  porsi = PORSI, konstanta modul = median nasional (titik S-NPP n/h : titik NOAA-20+21 n/h) pada hari acuan ACUAN (16-19 Okt 2026, S-NPP lengkap) = 0,534.
  Distribusi S-NPP berhenti 1 Nov 2026, jadi porsi TIDAK PERNAH dihitung dari data di jalur bangun(); ACUAN hanya dipakai --uji untuk membuktikan
  PORSI = angka deck. Mengubah PORSI membuat baca_lama menolak JSON lama (bangun ulang penuh).
- belum = luas x bagian titik NOAA-20/21 n/h hari d yang sel 3x3-nya (sel = round(lon/0,003375), round(lat/0,003375)) pernah terdeteksi
  NOAA-20/21 n/h 12-36 jam sebelumnya. Cadangan (stok): nilai hari terakhir periode, tidak dijumlahkan.
- padam(d) = luas(d-2) x bagian titik NOAA-20/21 n/h hari d-2 yang sel 3x3-nya tanpa deteksi NOAA-20/21 n/h pada hari d-1 dan d
  (aturan pemilik: 48 jam tanpa titik = padam). Beda dengan harian.py (72 jam, 168 jam gambut).
- angka dibulatkan SEKALI per provinsi (setengah ke atas); nasional = jumlah angka provinsi.
- celah = hari yang lintasan satelitnya hilang di FIRMS (lihat celah_hari): hotspot hari itu terlalu rendah, TIDAK dikoreksi.
  celah_turunan = hari yang luas/belum/padam-nya mewarisi celah NOAA-20/21 (hari celah + 2 hari sesudahnya; celah hanya S-NPP tidak menurun karena
  luas/belum/padam tak memakai S-NPP). patah = hari WIB pertama yang hot-nya memuat N21 pengganti S-NPP (seri hot berbeda mulai hari itu).

Sumber: FIRMS area API lewat firms_sumber.py (SP bila ada, selain itu NRT; maks 5 hari/panggilan; ~240 panggilan untuk setahun, batas 5000/10 menit
aman). Antara-kompak per hari UTC di data/raw/peta_karhutla/utc/*.json.gz (di-ignore git): hot per provinsi, hitungan S-NPP/N20/N21 per pita bujur
5 derajat, dan (sel, menit, provinsi) tiap deteksi N20/N21 n/h. Tarikan harian hanya mengunduh hari yang belum ada + menghitung ulang JENDELA hari
terakhir; hari lebih tua dibawa dari JSON lama (bilangan bulat), jadi cache kosong di CI tidak apa-apa.

Pakai:
  python3 scripts/data/peta_karhutla.py            # harian: hari baru + hitung ulang 4 hari terakhir
  python3 scripts/data/peta_karhutla.py --penuh    # bangun ulang 1 Jan..kemarin (cache UTC-hari dipakai ulang bila sudah lewat 12 jam dari akhir harinya)
  python3 scripts/data/peta_karhutla.py --uji      # self-check tanpa jaringan (butuh firms-raw-15-21okt.tar.gz + angka_nasional.json di data/laporan-bnpb)
  python3 scripts/data/peta_karhutla.py --ukur     # ukur porsi/faktor N21 setahun dari cache UTC-hari + JSON terbit (isi konstanta UKUR dari keluarannya)
Opsi: --mulai YYYY-MM-DD  --akhir YYYY-MM-DD  --jendela N  --keluar berkas.json  --cache folder
Butuh FIRMS_MAP_KEY (env atau .env).
"""
import csv, datetime as dt, gzip, io, json, math, os, statistics, sys, tarfile, time
from collections import defaultdict

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import firms
from firms_sumber import muat_ketersediaan, sumber_hari, unduh
from wilayah import AKAR, PROVINSI, Wilayah

WIB = dt.timezone(dt.timedelta(hours=7))
UTC = dt.timezone.utc
HARI = dt.timedelta(days=1)
BBOX = firms.BBOX[0]
FAMILI = ("VIIRS_SNPP", "VIIRS_NOAA20", "VIIRS_NOAA21", "MODIS")   # N21 ikut: dipakai luas/belum/padam (hot tidak)
VIIRS = {"N": 0, "N20": 1, "N21": 2}       # satelit VIIRS -> indeks di hitungan pita
HOT = {"N", "N20", "Terra", "Aqua"}        # sensor hitungan utama (tanpa N21)
G = 0.003375                               # sisi sel ~375 m
LEBAR = 8192                               # kemasan sel: round(lon/G) * LEBAR + round(lat/G) + LEBAR/2 (lat/G ada di -3400..1930)
NB = [i * LEBAR + j for i in (-1, 0, 1) for j in (-1, 0, 1)]
HA = 4.3                                   # ha per titik VIIRS 375 m
PORSI = 0.5337924177818518                 # S-NPP : N20+N21 (n/h) = median 16-19 Okt 2026 (deck BNPB 21 Okt, angka_nasional.json); KONSTAN, lihat docstring
ACUAN = ("2026-10-16", "2026-10-17", "2026-10-18", "2026-10-19")   # hari S-NPP lengkap tempat PORSI diukur (hanya --uji yang memakainya)
SNPP_AKHIR = ("2026-11-01", 780)           # akuisisi S-NPP terakhir yang didistribusikan FIRMS: 1 Nov 2026 13:00 UTC (tanggal UTC, menit); sesudahnya N21 menggantikan
PATAH = (dt.datetime.fromisoformat(SNPP_AKHIR[0]).replace(tzinfo=UTC) + dt.timedelta(minutes=SNPP_AKHIR[1])).astimezone(WIB).date()   # hari WIB pertama berseri hot baru
# Hasil --ukur (21 Okt 2026, 2026-01-01..2026-10-20, hari tanpa celah): dipakai teks metode supaya angka kalimat tidak diketik tangan.
#   porsi_median/porsi_agregat = rasio S-NPP:N20+N21 (n/h) median harian / jumlah setahun; snpp_n21_* = S-NPP : N21 semua keyakinan (UTC-hari; p10/p90 harian).
UKUR = {"hari": 264, "porsi_median": 0.5, "porsi_agregat": 0.5085, "snpp_n21_hari": 248, "snpp_n21_median": 1.006, "snpp_n21_agregat": 1.0222,
        "snpp_n21_p10": 0.7771, "snpp_n21_p90": 1.25}
JENDELA = 4                                # hari terakhir yang dihitung ulang tiap jalan harian
WARM = 2                                   # hari sebelum hari hitung yang dibutuhkan (belum 36 jam, padam d-2)
LATENSI = dt.timedelta(hours=4)            # NRT terlambat; hari WIB d dianggap lengkap bila sudah (now - 4 jam) > d
TRUST = dt.timedelta(hours=12)             # rekaman cache sah bila ditarik >= 12 jam sesudah hari UTC-nya berakhir
VERSI = 1
VREK = 3                                   # 3: + hk/h21k/h21tk (hot per kecamatan), kw/q (kecamatan tiap deteksi N20/N21 n/h); rekaman v2 diunduh ulang
VERSI_WIL = 1                              # peta_karhutla_wil.json (kabupaten/kota + kecamatan, jarang)
PITA = 5                                   # derajat bujur per pita deteksi celah
# celah (dikalibrasi pada 293 hari 2026): rasio S-NPP : N20+N21 nasional per hari bergeser +-20% secara alami (p10 0,34, p90 0,61) dan per pita
# bujur lebih liar (0,2-4,6; sapuan tiga satelit tak berhimpit), jadi pita hanya bertanda bila satelitnya NYARIS HILANG, nasional bila < 60% normal.
CELAH_NAS = 0.6                            # S-NPP nasional < 0,6 x (porsi x titik N20+N21)
CELAH_HILANG = 0.1                         # satu satelit di satu pita bujur <= 0,1 x yang diharapkan (S-NPP: porsi x N20+N21; N20/N21: satelit lainnya)
CELAH_MIN = 100                            # titik harapan minimal supaya dinilai (hari api sedikit tak berisik)
JEDA = 0.4                                 # detik antar panggilan FIRMS


def bul(v):
    """Setengah ke atas, sekali (sama dengan ganti.py deck)."""
    return int(math.floor(v + 0.5))


def sel(lon, lat):
    return round(lon / G) * LEBAR + round(lat / G) + LEBAR // 2


def tgl(s):
    return dt.date.fromisoformat(s)


# ---------------------------------------------------------------- rekaman per hari UTC
def baru_rekaman(tarik):
    return {"v": VREK, "tarik": tarik, "hot": {}, "h21": {}, "h21t": {}, "tn": 0, "bd": {}, "c": [], "m": [], "p": [], "k": [], "kn": [], "hk": {}, "h21k": {}, "h21tk": {}, "kw": [], "q": []}


def wajib(u, ket):
    """Famili yang harus utuh untuk hari UTC u. S-NPP opsional bila FIRMS sudah berhenti mendistribusikannya (u melewati max_date NRT-nya sementara
    NOAA-20 masih ada; dijadwalkan 1 Nov 2026), supaya jalan harian tidak mati; famili lain tak pernah opsional (hari bolong = gagal keras)."""
    w = set(FAMILI)
    nrt = ket.get("VIIRS_SNPP_NRT")
    if sumber_hari("VIIRS_SNPP", u, ket) is None and (nrt is None or u > nrt[1]) and sumber_hari("VIIRS_NOAA20", u, ket):
        w.discard("VIIRS_SNPP")
    return w


def rekam(baris, wil, tarik):
    """[(sumber, baris_csv)] -> {tgl_utc: rekaman}. Rekaman: hot {prov: [UTC<17:00, >=17:00]} (M+N+N20 semua keyakinan), h21 sama untuk N21,
    h21t = h21 hanya akuisisi >= SNPP_AKHIR (pengganti S-NPP di hari S-NPP berhenti), tn = jumlah S-NPP semua keyakinan di provinsi (untuk --ukur),
    bd {pita bujur: [N, N20, N21 masing-masing (a, b)]} (n/h, di provinsi), c/m/p = sel, menit UTC, provinsi (0 = laut/luar) tiap N20/N21 n/h.
    a/b = bagian hari UTC yang jatuh di hari WIB yang sama / berikutnya (batas 17:00 UTC = 00:00 WIB).
    S-NPP sesudah SNPP_AKHIR dibuang: N21 yang menggantikannya, tak pernah keduanya."""
    out, memo, tab = {}, {}, {}
    for _, r in baris:
        s = r["satellite"]
        if s not in HOT and s not in VIIRS:
            continue
        jam = r["acq_time"].zfill(4)
        m = int(jam[:2]) * 60 + int(jam[2:])
        sesudah = (r["acq_date"], m) >= SNPP_AKHIR
        if s == "N" and sesudah:
            continue
        rec = out.setdefault(r["acq_date"], baru_rekaman(tarik))
        b = int(m >= 1020)
        lon, lat = float(r["longitude"]), float(r["latitude"])
        idn = memo.get((lon, lat))
        if idn is None:
            idn = memo[(lon, lat)] = wil.cari(lon, lat) or ("",)
        prov = idn[0]
        kk = f"{prov}|{idn[1]}|{idn[2]}" if prov else ""   # kunci kecamatan persis seperti layar: kode|kab|kec
        if s in HOT and prov:
            rec["hot"].setdefault(prov, [0, 0])[b] += 1
            rec["hk"].setdefault(kk, [0, 0])[b] += 1
        if s == "N" and prov:
            rec["tn"] += 1
        if s == "N21" and prov:   # pengganti S-NPP di hot bila S-NPP berhenti (lihat hari_data)
            rec["h21"].setdefault(prov, [0, 0])[b] += 1
            rec["h21k"].setdefault(kk, [0, 0])[b] += 1
            if sesudah:
                rec["h21t"].setdefault(prov, [0, 0])[b] += 1
                rec["h21tk"].setdefault(kk, [0, 0])[b] += 1
        if s in VIIRS and r["confidence"].lower() in ("n", "h"):
            if s != "N":
                rec["c"].append(sel(lon, lat)); rec["m"].append(m); rec["p"].append(int(prov) if prov else 0)
                t = tab.setdefault(r["acq_date"], {})
                rec["q"].append(t.setdefault(kk, len(t)) if kk else -1)
                if kk and len(rec["kw"]) < len(t):
                    rec["kw"].append(kk)
            if prov:
                rec["bd"].setdefault(str(math.floor(lon / PITA) * PITA), [0] * 6)[VIIRS[s] * 2 + b] += 1
        if len(memo) > 200000:
            memo.clear()
    return out


def hari_data(rek, d):
    """Hari WIB d dari rekaman UTC d-1 (>=17:00Z) dan d (<17:00Z): hot {prov: n}, bd {pita: [N, N20, N21]}, det [(sel, menit_mutlak, prov)],
    snpp (False bila S-NPP tak utuh hari itu: tak didistribusikan, atau hari UTC >= SNPP_AKHIR; hot memakai N21 sebagai pengganti S-NPP dan celah S-NPP tak dinilai)."""
    hot, bd, det, snpp = defaultdict(int), defaultdict(lambda: [0, 0, 0]), [], True
    hotw, detw = defaultdict(int), []   # per kecamatan: hot {kode|kab|kec: n}; detw sejajar dengan det (kunci kecamatan, "" = laut)
    for u, bagian in ((d - HARI, 1), (d, 0)):
        r = rek[u.isoformat()]
        ada = (r.get("src") or {}).get("VIIRS_SNPP", True) is not None
        snpp = snpp and ada and u.isoformat() < SNPP_AKHIR[0]
        for p, ab in r["hot"].items():
            hot[p] += ab[bagian]
        for p, ab in r.get("hk", {}).items():
            hotw[p] += ab[bagian]
        for p, ab in r.get("h21" if not ada else "h21t", {}).items():   # S-NPP tak ada: seluruh N21 menggantikannya; hari SNPP_AKHIR: N21 sesudah batas
            hot[p] += ab[bagian]
        for p, ab in r.get("h21k" if not ada else "h21tk", {}).items():
            hotw[p] += ab[bagian]
        for pita, v in r["bd"].items():
            for i in range(3):
                bd[pita][i] += v[2 * i + bagian]
        dasar = u.toordinal() * 1440
        kw, q = r.get("kw", []), r.get("q") or [-1] * len(r["c"])
        for c, m, p, i in zip(r["c"], r["m"], r["p"], q):
            if (m >= 1020) == bool(bagian):
                det.append((c, dasar + m, str(p) if p else ""))
                detw.append(kw[i] if i >= 0 else "")
    return {"hot": hot, "bd": bd, "det": det, "snpp": snpp, "hotw": hotw, "detw": detw}


def bertahan(det, c, t):
    """Ada deteksi di 3x3 sel itu 12-36 jam sebelum t (menit)."""
    return any(t - 2160 <= x <= t - 720 for o in NB for x in det.get(c + o, ()))


def hitung(hd, d, porsi):
    """hd {tanggal: hari_data} berisi d-2..d. -> {prov: [hot, luas, belum, padam]} (float, belum dibulatkan). Urutan operasi sama dengan hitung3.py."""
    h0, h1, h2 = hd[d - 2 * HARI], hd[d - HARI], hd[d]
    det = defaultdict(list)
    for h in (h0, h1, h2):
        for c, t, _ in h["det"]:
            det[c].append(t)
    sepi = {c for h in (h1, h2) for c, _, _ in h["det"]}
    per = lambda h: {k: [(c, t) for c, t, p in h["det"] if p == k] for k in PROVINSI}
    L_, Lp_ = per(h2), per(h0)
    out = {}
    for k in PROVINSI:
        L, Lp = L_[k], Lp_[k]
        luas = len(L) * porsi * HA
        luas_p = len(Lp) * porsi * HA
        belum = luas * (sum(1 for c, t in L if bertahan(det, c, t)) / len(L) if L else 0)
        padam = luas_p * (sum(1 for c, t in Lp if not any(c + o in sepi for o in NB)) / len(Lp) if Lp else 0)
        out[k] = [h2["hot"].get(k, 0), luas, belum, padam]
    return out


def hitung_wil(hd, d, porsi):
    """Seperti hitung() tetapi per kecamatan dan per kabupaten/kota. -> {kunci: [hot, luas, belum, padam]} (float), kunci "kode|kab|kec" dan "kode|kab"
    (persis properties.kunci di layar); hanya wilayah yang punya hot atau deteksi N20/N21 di d atau d-2. Rumus identik dengan hitung(): luas/belum/padam
    per wilayah memakai titik wilayah itu saja, jadi jumlah kecamatan = kabupaten = provinsi sebelum pembulatan."""
    h0, h1, h2 = hd[d - 2 * HARI], hd[d - HARI], hd[d]
    det = defaultdict(list)
    for h in (h0, h1, h2):
        for c, t, _ in h["det"]:
            det[c].append(t)
    sepi = {c for h in (h1, h2) for c, _, _ in h["det"]}
    kab = lambda k: k.rsplit("|", 1)[0]
    def per(h, f):
        g = defaultdict(list)
        for (c, t, _), w in zip(h["det"], h["detw"]):
            if w:
                g[f(w)].append((c, t))
        return g
    hot = {1: defaultdict(int), 0: defaultdict(int)}
    for w, n in h2["hotw"].items():
        hot[0][w] += n; hot[1][kab(w)] += n
    out = {}
    for tingkat, f in ((0, lambda w: w), (1, kab)):
        L_, Lp_ = per(h2, f), per(h0, f)
        for k in set(hot[tingkat]) | set(L_) | set(Lp_):
            L, Lp = L_.get(k, []), Lp_.get(k, [])
            luas, luas_p = len(L) * porsi * HA, len(Lp) * porsi * HA
            belum = luas * (sum(1 for c, t in L if bertahan(det, c, t)) / len(L) if L else 0)
            padam = luas_p * (sum(1 for c, t in Lp if not any(c + o in sepi for o in NB)) / len(Lp) if Lp else 0)
            out[k] = [hot[tingkat].get(k, 0), luas, belum, padam]
    return out


def rasio_snpp(h):
    """Titik S-NPP n/h : titik N20+N21 n/h nasional (di provinsi) hari WIB itu; None bila tak ada N20/N21."""
    n = sum(v[0] for v in h["bd"].values())
    r = sum(v[1] + v[2] for v in h["bd"].values())
    return n / r if r else None


def porsi_acuan(hd_acuan):
    """Median rasio S-NPP/(N20+N21) pada hari acuan {tanggal: hari_data}."""
    rs = [rasio_snpp(h) for h in hd_acuan.values()]
    assert rs and None not in rs, "hari acuan porsi tidak lengkap"
    return statistics.median(rs)


def celah_hari(h, porsi):
    """Alasan celah (list teks, kosong = tak ada) untuk hari WIB. Dua jenis, keduanya hanya dinilai bila titik harapannya >= CELAH_MIN:
    (1) S-NPP nasional < CELAH_NAS x porsi x (N20+N21): bagian besar lintasan S-NPP hilang di FIRMS (mis. 20 Okt 2026, 13 Okt 2026);
    (2) satu satelit nyaris hilang di satu pita bujur 5 derajat (<= CELAH_HILANG x harapan): lintasan regional hilang (sapuan satu lintasan ~25 derajat)."""
    pita = sorted(h["bd"].items())
    n, a, b = (sum(v[i] for _, v in pita) for i in range(3))
    alasan = []
    snpp = h.get("snpp", True)
    if snpp and porsi * (a + b) >= CELAH_MIN and n < CELAH_NAS * porsi * (a + b):
        alasan.append(f"S-NPP nasional: {n} dari ~{round(porsi * (a + b))}")
    for nama, (n, a, b) in pita:
        if snpp and porsi * (a + b) >= CELAH_MIN and n <= CELAH_HILANG * porsi * (a + b):
            alasan.append(f"S-NPP {nama}E: {n} dari ~{round(porsi * (a + b))}")
        for sat, x, y in (("N20", a, b), ("N21", b, a)):
            if y >= CELAH_MIN and x <= CELAH_HILANG * y:
                alasan.append(f"{sat} {nama}E: {x} vs {y}")
    return alasan


def celah_menurun(alasan):
    """True bila celah menyangkut NOAA-20/21: luas/belum/padam ikut rendah (celah S-NPP saja hanya menurunkan hot)."""
    return any(not a.startswith("S-NPP") for a in alasan)


# ---------------------------------------------------------------- cache UTC-hari + unduhan
def jalur_rek(cache, u):
    return os.path.join(cache, f"{u.isoformat()}.json.gz")


def muat_rek(cache, u):
    """Rekaman sah atau None (tak ada, rusak, versi lain, atau ditarik < 12 jam sesudah hari UTC-nya berakhir)."""
    try:
        with gzip.open(jalur_rek(cache, u), "rt") as f:
            rec = json.load(f)
        tarik = dt.datetime.fromisoformat(rec["tarik"])
    except (OSError, ValueError, KeyError):
        return None
    akhir_hari = dt.datetime.combine(u + HARI, dt.time(), UTC)
    return rec if rec.get("v") == VREK and tarik >= akhir_hari + TRUST else None


def simpan_rek(cache, u, rec):
    os.makedirs(cache, exist_ok=True)
    tmp = jalur_rek(cache, u) + ".tmp"
    with gzip.open(tmp, "wt") as f:
        json.dump(rec, f, separators=(",", ":"))
    os.replace(tmp, jalur_rek(cache, u))


def ambil_pelan(url):
    time.sleep(JEDA)
    return firms.ambil(url)


def unduh_hari(hari_utc, kunci, ket, wil, cache, log=print):
    """Unduh hari UTC (list date terurut) per potongan <= 5 hari, simpan tiap hari yang sukses utuh (semua famili). -> set hari yang sukses."""
    sah = set()
    i = 0
    while i < len(hari_utc):
        j = i
        while j + 1 < len(hari_utc) and j - i < 4 and hari_utc[j + 1] - hari_utc[j] == HARI:
            j += 1
        u0, u1 = hari_utc[i], hari_utc[j]
        for coba in range(3):
            tarik = dt.datetime.now(UTC).isoformat(timespec="seconds")
            baris, ok = unduh(u0, u1, kunci, ambil_pelan, BBOX, ket, famili=FAMILI)
            rekaman = rekam(baris, wil, tarik)
            ada = []
            for n in range((u1 - u0).days + 1):
                u = u0 + n * HARI
                if not wajib(u, ket) <= ok.get(u, set()) or u in sah:
                    continue
                rec = rekaman.get(u.isoformat()) or baru_rekaman(tarik)
                rec["src"] = {f: sumber_hari(f, u, ket).rsplit("_", 1)[1] if f in wajib(u, ket) else None for f in FAMILI}   # None = tak didistribusikan lagi
                simpan_rek(cache, u, rec)
                sah.add(u)
                ada.append(u)
            log(f"unduh {u0}..{u1} percobaan {coba + 1}: {len(ada)}/{(u1 - u0).days + 1} hari utuh, {len(baris)} baris")
            if all(u0 + n * HARI in sah for n in range((u1 - u0).days + 1)):
                break
            time.sleep(20 * (coba + 1))
        i = j + 1
    return sah


# ---------------------------------------------------------------- berkas keluaran
def koma(x, n=3):
    return f"{x:.{n}f}".replace(".", ",")


def metode():
    """Teks metode untuk kaki kartu. Angka kalimat berasal dari konstanta (PORSI, UKUR, CELAH_*), tidak diketik di sini."""
    bias = (PORSI / UKUR["porsi_agregat"] - 1) * 100
    return {
        "hot": "Titik panas MODIS (Terra+Aqua) + VIIRS S-NPP + NOAA-20, semua tingkat keyakinan, per hari kalender WIB. "
               "Definisi sama dengan SiPongi; kesesuaian jumlah per provinsi baru diuji untuk Papua Selatan.",
        "luas": f"Titik VIIRS NOAA-20 dan NOAA-21 berkeyakinan nominal/tinggi x porsi {koma(PORSI)} x 4,3 ha. Porsi = median rasio titik S-NPP terhadap NOAA-20+21 "
                f"pada 16–19 Okt 2026 (S-NPP lengkap); tetap dipakai karena distribusi S-NPP berhenti 1 Nov 2026. "
                f"Porsi sedikit di atas median 2026 ({koma(UKUR['porsi_median'])}, {UKUR['hari']} hari tanpa celah); luas cenderung sekitar {bias:.0f}% lebih tinggi dibanding basis S-NPP.",
        "belum": "Luas x bagian titik NOAA-20/21 hari itu yang lokasinya (sel 3x3, ±375 m) sudah terdeteksi 12–36 jam sebelumnya. "
                 "Cadangan pada hari itu, bukan dijumlahkan antarhari.",
        "padam": "Luas dua hari sebelumnya x bagian titiknya yang lokasinya tidak terdeteksi lagi sepanjang dua hari berikutnya (48 jam tanpa titik = padam).",
        "catatan": [
            "Perkiraan dari satelit, bukan luas resmi. Rentang ±15–40% hanya galat porsi dan sampling; faktor 4,3 ha per titik tidak diuji per provinsi, "
            "dan angka dapat jauh berbeda dari laporan lapangan BNPB.",
            "Hari bertanda celah: lintasan satelit hilang di FIRMS sehingga hotspot hari itu terlalu rendah; angka tidak dikoreksi. "
            "Celah NOAA-20/21 juga menurunkan luas, belum padam, dan padam pada hari itu dan dua hari sesudahnya (celah_turunan).",
            f"Deteksi celah disetel pada data 2026 sendiri dan belum diuji independen; kehilangan satelit di bawah {100 - CELAH_HILANG * 100:.0f}% per pita bujur "
            f"{PITA}° dan hari berisik (harapan kurang dari {CELAH_MIN} titik) tidak terdeteksi.",
            "Sumber NASA FIRMS: arsip standar (SP) bila tersedia, selain itu NRT; hari-hari NRT dapat bergeser sedikit saat diganti SP.",
            "Aturan padam 48 jam berbeda dengan peta kompleks platform (72 jam, 168 jam di gambut kering).",
            f"S-NPP dijadwalkan berhenti didistribusikan FIRMS pada 1 Nov 2026 13.00 UTC; sesudahnya hotspot memakai NOAA-21 sebagai pengganti S-NPP tanpa koreksi "
            f"dan porsi tidak dihitung ulang. Pada 2026 titik S-NPP semua keyakinan sekitar {koma(UKUR['snpp_n21_median'], 2)} x titik NOAA-21 "
            f"(median harian {UKUR['snpp_n21_hari']} hari; sebaran harian {koma(UKUR['snpp_n21_p10'], 2)}–{koma(UKUR['snpp_n21_p90'], 2)}), jadi rata-rata sebanding "
            f"tetapi hari ke hari bisa berbeda seperempat; perubahan hotspot yang melintasi hari patah dibaca hati-hati.",
        ],
    }


def baca_lama(jalur, mulai):
    """JSON lama bila utuh (versi, awal hari, porsi = PORSI, 38 provinsi, panjang larik cocok), selain itu None (bangun ulang penuh)."""
    try:
        lama = json.load(open(jalur))
        n = len(lama["hari"])
        assert lama["versi"] == VERSI and lama["hari"][0] == mulai.isoformat() and set(lama["prov"]) == set(PROVINSI)
        assert abs(lama["porsi"] - PORSI) < 1e-12
        assert (tgl(lama["hari"][-1]) - mulai).days == n - 1
        assert all(len(v[m]) == n for v in lama["prov"].values() for m in ("hot", "luas", "belum", "padam"))
        return lama
    except (OSError, ValueError, KeyError, AssertionError):
        return None


def susun(lama, mulai, awal_hitung, akhir, baru, celah_baru, turunan_baru, cutoff, dibuat):
    """Gabung hari lama (< awal_hitung, dibawa apa adanya) dengan hari baru {tanggal_iso: {prov: [hot, luas, belum, padam]}} (float).
    Angka dibulatkan sekali di sini; nasional = jumlah angka provinsi. turunan_baru = hari yang mewarisi celah NOAA-20/21 (hitungan jendela, termasuk 2 hari
    sebelum awal_hitung); patah = PATAH bila sudah dalam rentang hari."""
    hari = [(mulai + n * HARI).isoformat() for n in range((akhir - mulai).days + 1)]
    n_lama = (awal_hitung - mulai).days
    prov = {}
    for k, nama in PROVINSI.items():
        seri = {m: [] for m in ("hot", "luas", "belum", "padam")}
        for i, t in enumerate(hari):
            if i < n_lama:
                for m in seri:
                    seri[m].append(lama["prov"][k][m][i])
            else:
                for j, m in enumerate(seri):
                    seri[m].append(bul(baru[t][k][j]))
        prov[k] = {"nama": nama, **seri}
    nas = {m: [sum(prov[k][m][i] for k in prov) for i in range(len(hari))] for m in ("hot", "luas", "belum", "padam")}
    celah = sorted({c for c in (lama or {}).get("celah", []) if c < awal_hitung.isoformat()} | set(celah_baru))
    turunan = sorted(({c for c in (lama or {}).get("celah_turunan", []) if c < awal_hitung.isoformat()} | set(turunan_baru)) & set(hari))
    return {"versi": VERSI, "dibuat": dibuat, "cutoff": cutoff, "hari": hari, "porsi": PORSI, "porsi_median_2026": UKUR["porsi_median"], "metode": metode(),
            "celah": celah, "celah_turunan": turunan, "patah": [PATAH.isoformat()] if PATAH.isoformat() in set(hari) else [],
            "nasional": nas, "prov": prov}


def periksa(isi):
    """Invarian berkas: larik selaras dengan hari, tak negatif, belum <= luas, nasional = jumlah provinsi, 38 provinsi, hari berurutan."""
    n = len(isi["hari"])
    assert n and [(tgl(isi["hari"][0]) + i * HARI).isoformat() for i in range(n)] == isi["hari"], "hari tidak berurutan"
    assert set(isi["prov"]) == set(PROVINSI) and len(isi["prov"]) == 38, len(isi["prov"])
    for m in ("hot", "luas", "belum", "padam"):
        assert len(isi["nasional"][m]) == n and all(isinstance(x, int) and x >= 0 for x in isi["nasional"][m]), f"nasional {m}"
        for k, v in isi["prov"].items():
            assert len(v[m]) == n and all(isinstance(x, int) and x >= 0 for x in v[m]), f"{k} {m}"
        assert isi["nasional"][m] == [sum(v[m][i] for v in isi["prov"].values()) for i in range(n)], f"nasional != jumlah provinsi ({m})"
    for k, v in isi["prov"].items():
        assert all(b <= a for a, b in zip(v["luas"], v["belum"])), f"belum > luas di {k}"
    assert all(b <= a for a, b in zip(isi["nasional"]["luas"], isi["nasional"]["belum"]))
    assert set(isi["celah"]) <= set(isi["hari"]) and isi["celah"] == sorted(isi["celah"])
    assert set(isi["celah_turunan"]) <= set(isi["hari"]) and isi["celah_turunan"] == sorted(isi["celah_turunan"])
    assert set(isi["patah"]) <= set(isi["hari"]), "patah di luar hari"
    assert isinstance(isi["porsi"], float) and 0 < isi["porsi"] < 2, f"porsi tak sah: {isi['porsi']}"


# ---------------------------------------------------------------- kabupaten/kota + kecamatan (berkas terpisah, jarang)
def jalur_wil(jalur):
    return jalur[:-5] + "_wil.json" if jalur.endswith(".json") else jalur + "_wil.json"


def metode_wil():
    return {"format": "d[kunci] = larik datar, tiap 5 angka = [indeks_hari, hot, luas, belum, padam]; indeks_hari = posisi di hari[] peta_karhutla.json "
                      "(hari0 + indeks). Hanya hari dengan minimal satu angka bukan nol yang ditulis. Kunci kabupaten/kota \"kode|kab\", kecamatan \"kode|kab|kec\" "
                      "(sama dengan properties.kunci di layar).",
            "pembulatan": "Tiap wilayah dibulatkan sekali (setengah ke atas) dari angka desimalnya sendiri, jadi jumlah angka kecamatan dapat berbeda dari angka kabupaten/kota "
                          "dan jumlah kabupaten/kota dari angka provinsi (peta_karhutla.json): hot selalu sama persis; luas, belum, padam beda sekitar ±1 per wilayah "
                          "yang dijumlahkan, dan wilayah yang seluruh angkanya membulat ke 0 tidak tertulis. Metode lain sama dengan peta_karhutla.json."}


def baca_lama_wil(jalur, mulai, lama):
    """JSON kab/kec lama bila selaras dengan JSON provinsi lama (versi, hari0, jumlah hari, porsi), selain itu None."""
    try:
        w = json.load(open(jalur))
        assert w["versi"] == VERSI_WIL and w["hari0"] == mulai.isoformat() and w["n"] == len(lama["hari"]) and abs(w["porsi"] - PORSI) < 1e-12
        return w
    except (OSError, ValueError, KeyError, AssertionError, TypeError):
        return None


def susun_wil(lama_w, mulai, awal_hitung, akhir, baru_w, dibuat):
    """Gabung hari lama (indeks < awal_hitung, dibawa apa adanya) dengan hari baru {tanggal_iso: {kunci: [hot, luas, belum, padam]}} (float) yang dibulatkan sekali."""
    n, n_lama = (akhir - mulai).days + 1, (awal_hitung - mulai).days
    d = {}
    for k, arr in ((lama_w or {}).get("d") or {}).items():
        keep = [x for q in range(0, len(arr), 5) if arr[q] < n_lama for x in arr[q:q + 5]]
        if keep:
            d[k] = keep
    for i in range(n_lama, n):
        for k, v in baru_w[(mulai + i * HARI).isoformat()].items():
            r = [bul(x) for x in v]
            if any(r):
                d.setdefault(k, []).extend([i, *r])
    return {"versi": VERSI_WIL, "dibuat": dibuat, "hari0": mulai.isoformat(), "n": n, "porsi": PORSI, "metode": metode_wil(), "d": d}


def periksa_wil(w, isi):
    """Invarian: larik kelipatan 5, indeks naik dalam [0, n), bilangan bulat >= 0, belum <= luas; per hari hot kab = hot prov dan kec = kab persis; luas/belum/padam
    jumlah anak tidak melebihi induk + 0,5 x (jumlah anak + 1) (tiap anak dibulatkan sendiri; anak yang membulat ke 0 tak tertulis jadi batas bawah tak ada)."""
    n = w["n"]
    assert n == len(isi["hari"]) and w["hari0"] == isi["hari"][0] and w["porsi"] == isi["porsi"], "berkas wil tak selaras dengan provinsi"
    anak = defaultdict(lambda: [0, 0, 0, 0, 0])   # (kunci induk, hari) -> [jumlah anak, hot, luas, belum, padam]
    nilai = {}
    for k, arr in w["d"].items():
        parts = k.split("|")
        assert len(parts) in (2, 3) and parts[0] in PROVINSI and len(arr) % 5 == 0 and arr, k
        idx = arr[0::5]
        assert idx == sorted(set(idx)) and 0 <= idx[0] and idx[-1] < n, f"{k}: indeks hari"
        for q in range(0, len(arr), 5):
            v = arr[q + 1:q + 5]
            assert all(isinstance(x, int) and x >= 0 for x in v) and any(v) and v[2] <= v[1], f"{k} hari {arr[q]}: {v}"
            nilai[(k, arr[q])] = v
            a = anak[("|".join(parts[:-1]), arr[q])]
            a[0] += 1
            for j in range(4):
                a[1 + j] += v[j]
    for (induk, i), a in anak.items():
        ref = [isi["prov"][induk][m][i] for m in ("hot", "luas", "belum", "padam")] if "|" not in induk else nilai.get((induk, i), [0, 0, 0, 0])
        assert a[1] == ref[0], f"hot anak != induk di {induk} hari {i}: {a[1]} vs {ref[0]}"
        for j in (1, 2, 3):
            assert a[1 + j] <= ref[j] + 0.5 * (a[0] + 1), f"jumlah anak melebihi induk di {induk} hari {i} metrik {j}: {a[1 + j]} vs {ref[j]}"


# ---------------------------------------------------------------- jalan
def hari_lengkap_terakhir(sekarang):
    """Hari WIB lengkap terakhir: hari sebelum tanggal WIB dari (sekarang - 4 jam)."""
    return (sekarang - LATENSI).astimezone(WIB).date() - HARI


def bangun(argv, sekarang=None, log=print):
    opsi = {a: argv[i + 1] for i, a in enumerate(argv) if a.startswith("--") and i + 1 < len(argv) and not argv[i + 1].startswith("--")}
    sekarang = sekarang or dt.datetime.now(UTC)
    akhir = tgl(opsi["--akhir"]) if "--akhir" in opsi else hari_lengkap_terakhir(sekarang)
    mulai = tgl(opsi["--mulai"]) if "--mulai" in opsi else dt.date(akhir.year, 1, 1)
    jendela = int(opsi.get("--jendela", JENDELA))
    jalur = opsi.get("--keluar", os.path.join(AKAR, "public/data/peta_karhutla.json"))
    cache = opsi.get("--cache", os.path.join(AKAR, "data/raw/peta_karhutla/utc"))
    lama = None if "--penuh" in argv else baca_lama(jalur, mulai)
    jw = jalur_wil(jalur)
    lama_w = baca_lama_wil(jw, mulai, lama) if lama else None
    if lama and not lama_w:
        log("peta_karhutla: berkas kab/kec tak ada atau tak selaras: bangun ulang penuh")
        lama = None
    awal_hitung = mulai if not lama else max(mulai, min(tgl(lama["hari"][-1]), akhir) - (jendela - 1) * HARI)
    log(f"peta_karhutla: {awal_hitung}..{akhir} dihitung ({'penuh' if not lama else 'harian, lama s.d. ' + lama['hari'][-1]})")

    kunci = firms.kunci()
    ket = muat_ketersediaan(kunci, ambil_pelan, famili=("VIIRS_NOAA20", "VIIRS_NOAA21", "MODIS"))   # S-NPP boleh hilang dari daftar sesudah berhenti
    wil = Wilayah()
    perlu = [awal_hitung - (WARM + 1) * HARI + n * HARI for n in range((akhir - awal_hitung).days + WARM + 2)]   # UTC d-3 .. akhir
    rek, kosong = {}, []
    for u in perlu:
        r = muat_rek(cache, u)
        if r is None:
            kosong.append(u)
        else:
            rek[u.isoformat()] = r
    sah = unduh_hari(kosong, kunci, ket, wil, cache, log) if kosong else set()
    for u in sah:
        rek[u.isoformat()] = muat_rek(cache, u) or json.load(gzip.open(jalur_rek(cache, u), "rt"))
    hilang = [u.isoformat() for u in perlu if u.isoformat() not in rek]
    if hilang:
        sys.exit(f"peta_karhutla: hari UTC tidak utuh setelah 3 percobaan: {hilang}; berkas lama dibiarkan")

    hd, baru, baru_w, celah_baru, turunan_baru = {}, {}, {}, [], set()
    ambil_hd = lambda d: hd.setdefault(d, hari_data(rek, d))
    porsi = PORSI   # konstanta: tidak dihitung dari data (S-NPP berhenti 1 Nov 2026 dan hari acuan tak ada di cache/CI)
    for g in (awal_hitung - 2 * HARI, awal_hitung - HARI):   # hari sebelum jendela yang bercelah NOAA-20/21 menurunkan hari jendela (belum d+1, padam d..d+2)
        if celah_menurun(celah_hari(ambil_hd(g), porsi)):
            turunan_baru |= {(g + n * HARI).isoformat() for n in range(3) if g + n * HARI <= akhir}
    d = awal_hitung
    while d <= akhir:
        for x in (d - 2 * HARI, d - HARI, d):
            ambil_hd(x)
        baru[d.isoformat()] = hitung(hd, d, porsi)
        baru_w[d.isoformat()] = hitung_wil(hd, d, porsi)
        alasan = celah_hari(hd[d], porsi)
        if alasan:
            celah_baru.append(d.isoformat())
        if celah_menurun(alasan):
            turunan_baru |= {(d + n * HARI).isoformat() for n in range(3) if d + n * HARI <= akhir}   # luas(d), belum(d..d+2), padam(d..d+2)
        for x in [x for x in hd if x < d - HARI]:
            del hd[x]
        d += HARI
    tarikan = [rek[u.isoformat()]["tarik"] for u in sah]
    cutoff = (dt.datetime.fromisoformat(max(tarikan)).astimezone(WIB).isoformat(timespec="minutes") if tarikan
              else (lama or {}).get("cutoff") or dt.datetime.fromisoformat(max(r["tarik"] for r in rek.values())).astimezone(WIB).isoformat(timespec="minutes"))
    isi = susun(lama, mulai, awal_hitung, akhir, baru, celah_baru, turunan_baru, cutoff, sekarang.astimezone(WIB).isoformat(timespec="minutes"))
    periksa(isi)
    isi_w = susun_wil(lama_w, mulai, awal_hitung, akhir, baru_w, isi["dibuat"])
    periksa_wil(isi_w, isi)
    os.makedirs(os.path.dirname(jalur), exist_ok=True)
    for berkas, muatan in ((jw, isi_w), (jalur, isi)):   # wil dulu: bila gagal di tengah, JSON provinsi lama memaksa bangun ulang
        with open(berkas + ".tmp", "w") as f:
            json.dump(muatan, f, ensure_ascii=False, separators=(",", ":"))
        os.replace(berkas + ".tmp", berkas)
    nas = isi["nasional"]
    log(f"peta_karhutla: {len(isi['hari'])} hari ({isi['hari'][0]}..{isi['hari'][-1]}), porsi {porsi:.4f}, celah {len(isi['celah'])} hari ({len(isi['celah_turunan'])} turunan), "
        f"hot {nas['hot'][-1]} luas {nas['luas'][-1]} belum {nas['belum'][-1]} padam {nas['padam'][-1]} pada {isi['hari'][-1]}, cutoff {cutoff}")
    return isi


def ukur(cache, jalur):
    """Ukur dari cache UTC-hari + JSON terbit (daftar hari dan celah) pada hari WIB tanpa celah -> dict untuk konstanta UKUR:
    porsi_median/porsi_agregat = S-NPP : N20+N21 (n/h) median harian / jumlah; snpp_n21_* = S-NPP : N21 semua keyakinan per hari UTC (hari UTC yang menyentuh
    hari celah dibuang). Hari tanpa rekaman cache dilewati (hari = jumlah yang terpakai)."""
    isi = json.load(open(jalur))
    hari, celah = [tgl(h) for h in isi["hari"]], set(isi["celah"])
    rek = {}
    for u in [hari[0] - HARI] + hari:
        r = muat_rek(cache, u)
        if r:
            rek[u.isoformat()] = r
    rs, ns, rr, n21s, tns = [], 0, 0, [], [0, 0]
    for d in hari:
        if d.isoformat() in celah or (d - HARI).isoformat() not in rek or d.isoformat() not in rek:
            continue
        h = hari_data(rek, d)
        r = rasio_snpp(h)
        if r is not None:
            rs.append(r)
            ns += sum(v[0] for v in h["bd"].values()); rr += sum(v[1] + v[2] for v in h["bd"].values())
    for u in hari:
        if {u.isoformat(), (u + HARI).isoformat()} & celah or u.isoformat() not in rek:
            continue
        n21 = sum(sum(ab) for ab in rek[u.isoformat()]["h21"].values())
        if n21:
            n21s.append(rek[u.isoformat()]["tn"] / n21)
            tns[0] += rek[u.isoformat()]["tn"]; tns[1] += n21
    n21s.sort()
    return {"hari": len(rs), "porsi_median": round(statistics.median(rs), 4), "porsi_agregat": round(ns / rr, 4),
            "snpp_n21_hari": len(n21s), "snpp_n21_median": round(statistics.median(n21s), 4), "snpp_n21_agregat": round(tns[0] / tns[1], 4),
            "snpp_n21_p10": round(n21s[int(0.1 * (len(n21s) - 1))], 4), "snpp_n21_p90": round(n21s[int(0.9 * (len(n21s) - 1))], 4)}


# ---------------------------------------------------------------- uji (tanpa jaringan)
FIKSTUR = os.path.join(AKAR, "data/laporan-bnpb/satelit-2026-10-21")


def baris_deck(jalur_tar):
    """Baca CSV FIRMS per hari UTC dari tarball deck BNPB tanpa mengekstrak -> [(sumber, baris)]."""
    baris = []
    with tarfile.open(jalur_tar) as t:
        for m in t.getmembers():
            if m.isfile() and m.name.endswith(".csv") and not os.path.basename(m.name).startswith("._"):   # "._*" = metadata AppleDouble macOS
                sumber = os.path.basename(m.name).rsplit("-", 1)[0]
                teks = t.extractfile(m).read().decode()
                baris += [(sumber, r) for r in csv.DictReader(io.StringIO(teks))]
    return baris


def uji_sintetis():
    assert [bul(x) for x in (0.4999, 0.5, 1.5, 2.5, 2.4999)] == [0, 1, 2, 3, 2], "pembulatan setengah ke atas"
    assert sel(100 + G, -2) - sel(100, -2) == LEBAR and sel(100, -2 + G) - sel(100, -2) == 1, "sel bertetangga"
    # satu hari UTC sintetis: provinsi 62, titik N20 pada 17:00Z (= 00:00 WIB hari berikutnya) masuk hari berikutnya
    class W:
        def cari(self, lon, lat):
            return ("62", "X", "Y") if lat < 0 else None
    row = lambda sat, jam, lat, conf="n", tgl_="2026-03-10": {"satellite": sat, "acq_date": tgl_, "acq_time": jam, "latitude": str(lat), "longitude": "113.0", "confidence": conf}
    rec = rekam([("s", row("N20", "1659", -2.0)), ("s", row("N20", "1700", -2.0)), ("s", row("N", "0100", -2.0, "l")), ("s", row("N21", "0100", -2.0)),
                 ("s", row("Terra", "0200", -2.0, "37")), ("s", row("N20", "0300", 3.0)), ("s", row("N", "0100", -2.0))], W(), "2026-03-11T05:00:00+00:00")["2026-03-10"]
    assert rec["hot"] == {"62": [4, 1]}, rec["hot"]                      # N20 1659, N 'l', Terra, N (n); N20 1700 di bagian b; N21 tak dihitung hot
    assert rec["m"] == [1019, 1020, 60, 180] and rec["p"] == [62, 62, 62, 0], rec   # N20 x3 + N21; titik laut p=0 tetap tercatat untuk sel
    assert rec["bd"]["110"] == [1, 0, 1, 1, 1, 0], rec["bd"]             # N n/h a=1; N20 a=1 b=1; N21 a=1  (N 'l' tidak masuk)
    assert rec["h21"] == {"62": [1, 0]} and rec["h21t"] == {} and rec["tn"] == 2, (rec["h21"], rec["h21t"], rec["tn"])   # tn: S-NPP semua keyakinan (2 baris N di provinsi)
    # batas S-NPP 1 Nov 2026 13:00Z: N sesudahnya dibuang (N21 yang menggantikan, tak pernah keduanya); N21 sesudahnya masuk h21 dan h21t
    nov = rekam([("s", row("N", "1259", -2.0, "n", "2026-11-01")), ("s", row("N", "1300", -2.0, "n", "2026-11-01")), ("s", row("N21", "1259", -2.0, "n", "2026-11-01")),
                 ("s", row("N21", "1300", -2.0, "n", "2026-11-01")), ("s", row("N21", "1700", -2.0, "n", "2026-11-01")), ("s", row("N", "0100", -2.0, "n", "2026-11-02"))], W(), "t")
    assert nov["2026-11-01"]["hot"] == {"62": [1, 0]} and nov["2026-11-01"]["tn"] == 1, nov["2026-11-01"]
    assert nov["2026-11-01"]["h21"] == {"62": [2, 1]} and nov["2026-11-01"]["h21t"] == {"62": [1, 1]}, nov["2026-11-01"]
    assert "2026-11-02" not in nov, "hari yang hanya berisi S-NPP sesudah batas tidak punya rekaman"
    assert PATAH == dt.date(2026, 11, 1), PATAH   # 13:00Z = 20:00 WIB: hari WIB 1 Nov sudah memuat N21 pengganti
    # S-NPP berhenti didistribusikan (dijadwalkan 1 Nov 2026): opsional hanya selama NOAA-20 masih ada; hot memakai N21; celah S-NPP tak dinilai
    D = dt.date
    ket = {f + "_NRT": (D(2026, 7, 1), D(2026, 11, 20)) for f in FAMILI}
    ket["VIIRS_SNPP_NRT"] = (D(2026, 7, 1), D(2026, 11, 1))
    assert wajib(D(2026, 11, 1), ket) == set(FAMILI) and wajib(D(2026, 11, 2), ket) == set(FAMILI) - {"VIIRS_SNPP"}
    del ket["VIIRS_SNPP_NRT"]                                   # barisnya hilang dari data_availability sesudah berhenti
    assert wajib(D(2026, 11, 2), ket) == set(FAMILI) - {"VIIRS_SNPP"} and wajib(D(2026, 5, 2), {**ket, "VIIRS_SNPP_SP": (D(2012, 1, 1), D(2026, 6, 30))}) == set(FAMILI)
    ket["VIIRS_SNPP_NRT"] = (D(2026, 7, 1), D(2026, 11, 1))
    assert wajib(D(2026, 11, 25), ket) == set(FAMILI), "tak ada famili yang opsional bila semuanya melewati max_date (hari bolong = gagal keras)"
    mk = lambda src, h21t={}: {"hot": {"62": [5, 5]}, "h21": {"62": [2, 3]}, "h21t": h21t, "bd": {}, "c": [], "m": [], "p": [], "src": {"VIIRS_SNPP": src}}
    h = hari_data({"2026-11-02": mk(None), "2026-11-03": mk(None)}, D(2026, 11, 3))
    assert h["hot"]["62"] == 5 + 5 + 3 + 2 and h["snpp"] is False, h["hot"]
    h = hari_data({"2026-10-30": mk("NRT"), "2026-10-31": mk("NRT")}, D(2026, 10, 31))
    assert h["hot"]["62"] == 10 and h["snpp"] is True, h["hot"]                      # S-NPP utuh: N21 tidak ikut
    # hari WIB 1 Nov: S-NPP sampai 13:00Z (20:00 WIB), N21 sesudahnya menggantikan (h21t a = 4); S-NPP tak lagi utuh, celah S-NPP tak dinilai
    h = hari_data({"2026-10-31": mk("NRT"), "2026-11-01": mk("NRT", {"62": [4, 6]})}, D(2026, 11, 1))
    assert h["hot"]["62"] == 5 + 5 + 4 and h["snpp"] is False, h["hot"]
    # hari WIB 2 Nov: UTC 1 Nov >= 17Z (S-NPP hilang, h21t b = 6 menggantikan) + UTC 2 Nov < 17Z (S-NPP tak didistribusikan: seluruh N21 a = 2)
    h = hari_data({"2026-11-01": mk("NRT", {"62": [4, 6]}), "2026-11-02": mk(None)}, D(2026, 11, 2))
    assert h["hot"]["62"] == 5 + 6 + 5 + 2 and h["snpp"] is False, h["hot"]
    h["snpp"], h["bd"] = False, {"100": [0, 300, 300]}
    assert celah_hari(h, 0.534) == [], "tanpa S-NPP, celah S-NPP tak dinilai (bukan celah)"
    # belum dan padam: hari d, d-1, d-2 dibuat tangan
    d = dt.date(2026, 3, 10)
    t0 = d.toordinal() * 1440
    c1, c2, c3, c4 = 100000, 200000, 300000, 400000
    H = lambda hot, det: {"hot": hot, "bd": defaultdict(lambda: [0, 0, 0]), "det": det}
    h2 = H({"62": 7}, [(c3, t0 + 600, "62"), (c4, t0 + 600, "62"), (c4 + 999999, t0 + 600, "")])         # hari d: 2 titik di prov 62, 1 di laut
    h1 = H({}, [(c3 + LEBAR + 1, t0 - 1440 + 600, ""), (c4 + 3 * LEBAR, t0 - 1440 + 600, "")])           # d-1: tetangga c3 (20 jam sebelum d 10:00 = 22 jam: sah), c4+3 sel bukan tetangga
    h0 = H({}, [(c1, t0 - 2880 + 600, "62"), (c2, t0 - 2880 + 600, "62")])                                  # d-2: c1 dan c2; hanya c1 muncul lagi (sebagai tetangga di d-1)
    h1["det"].append((c1 - LEBAR, t0 - 1440 + 700, "62"))
    r = hitung({d - 2 * HARI: h0, d - HARI: h1, d: h2}, d, 0.5)["62"]
    assert r[0] == 7 and r[1] == 2 * 0.5 * 4.3, r                                                          # luas = titik x porsi x 4,3
    assert r[2] == r[1] * 0.5, r                                                                            # belum: c3 bertahan (tetangga 22 jam), c4 tidak
    assert r[3] == (2 * 0.5 * 4.3) * 0.5, r                                                                 # padam: c1 muncul lagi di d-1, c2 tidak
    assert hitung({d - 2 * HARI: h0, d - HARI: h1, d: h2}, d, 0.5)["16"] == [0, 0, 0, 0], "provinsi tanpa titik"
    # jendela belum tepat 12-36 jam
    det = {c1: [1000]}
    assert bertahan(det, c1 + LEBAR, 1000 + 720) and bertahan(det, c1, 1000 + 2160) and not bertahan(det, c1, 1000 + 719) and not bertahan(det, c1, 1000 + 2161)
    # celah: pita 100E kehilangan S-NPP (5 dari ~160 harapan), pita 115E normal
    h = {"hot": {}, "det": [], "bd": {"100": [5, 150, 150], "115": [160, 150, 150]}}
    al = celah_hari(h, 0.534)
    assert any(a.startswith("S-NPP 100E") for a in al) and not any("115E" in a for a in al), al
    h["bd"]["100"] = [150, 150, 150]
    assert celah_hari(h, 0.534) == [], celah_hari(h, 0.534)                                                  # normal
    h["bd"]["100"] = [80, 150, 150]                                                                          # pita kurang (0,5 x harapan) tapi tidak nyaris hilang: tak bertanda
    assert celah_hari(h, 0.534) == [], celah_hari(h, 0.534)
    h["bd"]["100"] = [2, 10, 12]                                                                             # hari api sedikit (harapan < 100): tak berisik
    assert celah_hari(h, 0.534) == [], celah_hari(h, 0.534)
    h["bd"]["115"] = [160, 150, 5]
    assert any(a.startswith("N21 115E") for a in celah_hari(h, 0.534)), celah_hari(h, 0.534)                  # NOAA-21 nyaris hilang di pita 115E
    h["bd"] = {"100": [100, 300, 300], "115": [100, 300, 300]}                                               # nasional: 200 dari harapan ~641 (< 0,6) walau tiap pita ~0,3 (tak nyaris hilang)
    assert celah_hari(h, 0.534) == ["S-NPP nasional: 200 dari ~641"], celah_hari(h, 0.534)
    # susun: hari lama dibawa, hari baru dibulatkan, nasional = jumlah provinsi
    awal = dt.date(2026, 3, 8)
    baru = {t: {k: [1, 1.5, 0.5, 2.5] for k in PROVINSI} for t in ("2026-03-09", "2026-03-10")}
    lama = {"celah": ["2026-03-08", "2026-03-09"], "prov": {k: {"hot": [3, 3], "luas": [9, 9], "belum": [4, 4], "padam": [1, 1]} for k in PROVINSI}}
    isi = susun(lama, awal, dt.date(2026, 3, 9), dt.date(2026, 3, 10), baru, ["2026-03-10"], ["2026-03-07", "2026-03-10"], "c", "d")
    periksa(isi)
    assert isi["porsi"] == PORSI and isi["patah"] == [] and isi["celah_turunan"] == ["2026-03-10"], (isi["porsi"], isi["patah"], isi["celah_turunan"])   # 03-07 di luar hari: dibuang
    assert isi["hari"] == ["2026-03-08", "2026-03-09", "2026-03-10"] and isi["prov"]["62"]["luas"] == [9, 2, 2] and isi["prov"]["62"]["padam"] == [1, 3, 3]
    assert isi["nasional"]["luas"] == [9 * 38, 2 * 38, 2 * 38] and isi["celah"] == ["2026-03-08", "2026-03-10"], isi["celah"]   # celah lama >= awal_hitung dihitung ulang
    bad = json.loads(json.dumps(isi)); bad["prov"]["62"]["belum"][1] = 99
    try:
        periksa(bad); raise SystemExit("periksa() harus menolak belum > luas")
    except AssertionError:
        pass
    for porsi_buruk in (0.0, -0.5, 2.0):                                                                     # porsi nol (S-NPP tak terunduh) meloloskan luas/belum/padam serba nol: harus ditolak
        bad = json.loads(json.dumps(isi)); bad["porsi"] = porsi_buruk
        try:
            periksa(bad); raise SystemExit(f"periksa() harus menolak porsi {porsi_buruk}")
        except AssertionError:
            pass
    # baca_lama menolak JSON dengan porsi lain (PORSI berubah = bangun ulang penuh) dan awal tahun lain, menerima yang sah
    import tempfile
    with tempfile.TemporaryDirectory() as tmp:
        jl = os.path.join(tmp, "lama.json")
        json.dump(isi, open(jl, "w"))
        assert baca_lama(jl, awal) is not None and baca_lama(jl, dt.date(2027, 1, 1)) is None
        json.dump({**isi, "porsi": 0.5}, open(jl, "w"))
        assert baca_lama(jl, awal) is None, "porsi lama beda dari PORSI harus ditolak"
    # patah muncul begitu rentang hari memuatnya; celah_turunan hanya dari celah NOAA-20/21
    z = lambda t: {k: [0, 0, 0, 0] for k in PROVINSI}
    ts = [(dt.date(2026, 10, 30) + n * HARI).isoformat() for n in range(4)]
    assert susun(None, dt.date(2026, 10, 30), dt.date(2026, 10, 30), dt.date(2026, 11, 2), {t: z(t) for t in ts}, [], [], "c", "d")["patah"] == ["2026-11-01"]
    assert susun(None, dt.date(2026, 10, 30), dt.date(2026, 10, 30), dt.date(2026, 10, 31), {t: z(t) for t in ts[:2]}, [], [], "c", "d")["patah"] == []
    assert celah_menurun(["N21 100E: 3 vs 300"]) and celah_menurun(["S-NPP nasional: 1 dari ~300", "N20 105E: 1 vs 200"]) and not celah_menurun(["S-NPP 100E: 1 dari ~300"]) and not celah_menurun([])
    # hitung_wil: dua kecamatan di satu kabupaten + satu kabupaten lain; jumlah kec = kab = provinsi (float), kunci persis kode|kab|kec
    kk = ("62|A|x", "62|A|y", "62|B|z")
    Hw = lambda hot, det: {"hot": {}, "hotw": hot, "bd": defaultdict(lambda: [0, 0, 0]), "det": [(c, t, "62") for c, t, _ in det], "detw": [w for _, _, w in det]}
    g2 = Hw({kk[0]: 3, kk[2]: 1}, [(c3, t0 + 600, kk[0]), (c4, t0 + 600, kk[1]), (c4 + 5 * LEBAR, t0 + 600, kk[2])])
    g1 = Hw({}, [(c3 + LEBAR + 1, t0 - 1440 + 600, kk[0])])
    g0 = Hw({}, [(c1, t0 - 2880 + 600, kk[0]), (c2, t0 - 2880 + 600, kk[2])])
    rw = hitung_wil({d - 2 * HARI: g0, d - HARI: g1, d: g2}, d, 0.5)
    assert set(rw) == {*kk, "62|A", "62|B"} and rw["62|A|x"][1] == 0.5 * 4.3 and rw["62|A|x"][2] == rw["62|A|x"][1] and rw["62|A|y"][2] == 0, rw
    for j in range(4):
        assert abs(rw["62|A"][j] - rw["62|A|x"][j] - rw["62|A|y"][j]) < 1e-9 and abs(rw["62|A"][j] + rw["62|B"][j] - sum(rw[k][j] for k in kk)) < 1e-9, (j, rw)
    assert rw["62|A"][0] == 3 and rw["62|B"][0] == 1 and rw["62|A|x"][3] == 0.5 * 4.3 and rw["62|B|z"][3] == 0.5 * 4.3, rw   # c1 dan c2 tak muncul lagi: keduanya padam
    iw = susun_wil(None, d, d, d + HARI, {d.isoformat(): rw, (d + HARI).isoformat(): {"62|A": [0, 0.4, 0, 0]}}, "x")
    assert iw["d"]["62|A"] == [0, 3, 4, 2, 2] and iw["d"]["62|A|y"] == [0, 0, 2, 0, 0] and iw["n"] == 2, iw["d"]   # hari 2 (semua membulat 0) tak tertulis
    # teks metode: angka dari konstanta, tanda baca bertipografi (en dash, ±), klaim tak melampaui bukti
    mt = metode()
    teks = json.dumps(mt, ensure_ascii=False)
    assert koma(PORSI) in mt["luas"] and koma(UKUR["porsi_median"]) in mt["luas"] and "16–19 Okt 2026" in mt["luas"], mt["luas"]
    assert "±375 m" in mt["belum"] and "12–36 jam" in mt["belum"] and "±15–40%" in mt["catatan"][0], (mt["belum"], mt["catatan"][0])
    assert not any(x in teks for x in ("+-", "16-19", "12-36", "15-40")), "tanda baca ASCII di teks tayang"
    assert "setara SiPongi dan GIS BNPB" not in teks and "Papua Selatan" in mt["hot"], mt["hot"]
    assert "4,3 ha per titik tidak diuji per provinsi" in mt["catatan"][0] and "belum diuji independen" in mt["catatan"][2], mt["catatan"]
    assert hari_lengkap_terakhir(dt.datetime(2026, 10, 21, 14, 20, tzinfo=UTC)) == dt.date(2026, 10, 20)      # jalan 21.20 WIB
    assert hari_lengkap_terakhir(dt.datetime(2026, 10, 20, 19, 0, tzinfo=UTC)) == dt.date(2026, 10, 19)       # 02.00 WIB: NRT 20 Okt belum lengkap
    assert hari_lengkap_terakhir(dt.datetime(2026, 10, 20, 21, 0, tzinfo=UTC)) == dt.date(2026, 10, 20)       # 04.00 WIB


def uji_deck():
    """(a) 18-20 Okt 2026 sama dengan angka_nasional.json deck untuk 38 provinsi x 4 metrik; (b) invarian; (c) 20 Okt bertanda celah."""
    tar, ref = os.path.join(FIKSTUR, "firms-raw-15-21okt.tar.gz"), os.path.join(FIKSTUR, "angka_nasional.json")
    assert os.path.exists(tar) and os.path.exists(ref), f"fikstur deck tidak ada di {FIKSTUR} (harus di-commit bersama skrip ini)"
    A = json.load(open(ref))
    rek = rekam(baris_deck(tar), Wilayah(), "2026-10-21T14:41:00+00:00")
    hd = {}
    for i in range(16, 21):
        hd[dt.date(2026, 10, i)] = hari_data(rek, dt.date(2026, 10, i))
    porsi = porsi_acuan({a: hd[tgl(a)] for a in ACUAN})
    assert abs(porsi - A["porsi"]) < 1e-12 and abs(porsi - PORSI) < 1e-12, (porsi, A["porsi"], PORSI)   # konstanta PORSI = median hari acuan = angka deck
    porsi = PORSI   # jalur bangun() memakai konstanta, bukan hasil porsi_acuan
    baru = {}
    for i in (18, 19, 20):
        d = dt.date(2026, 10, i)
        baru[d.isoformat()] = hitung(hd, d, porsi)
    for i in (18, 19, 20):   # jumlah kecamatan = kabupaten = provinsi sebelum pembulatan, tiap metrik, 38 provinsi
        d = dt.date(2026, 10, i)
        rw, rp = hitung_wil(hd, d, porsi), baru[d.isoformat()]
        for tingkat in (2, 1):
            tot = defaultdict(lambda: [0.0] * 4)
            for k, v in rw.items():
                if len(k.split("|")) == tingkat + 1:
                    for j in range(4):
                        tot[k.split("|")[0]][j] += v[j]
            for k, v in rp.items():
                assert all(abs(tot[k][j] - v[j]) < 1e-6 for j in range(4)), (d, tingkat, k, tot[k], v)
    assert len(A["prov"]) == 38
    salah = []
    for k, v in A["prov"].items():
        for j, m in enumerate(("hot", "luas", "belum", "padam")):
            for t in ("2026-10-18", "2026-10-19", "2026-10-20"):
                ref_v, hasil = bul(v[m][A["hari"].index(t)]), bul(baru[t][k][j])
                if ref_v != hasil:
                    salah.append(f"{t} {k} {m}: deck {ref_v} != {hasil}")
    assert not salah, f"{len(salah)} angka beda dari deck, mis. {salah[:5]}"
    # (b) invarian lewat susun()+periksa() pada tiga hari itu
    awal = dt.date(2026, 10, 18)
    isi = susun(None, awal, awal, dt.date(2026, 10, 20), baru, [], [], "c", "d")
    periksa(isi)
    # (c) celah: 20 Okt (lintasan siang S-NPP hilang) bertanda, hari acuan 16-19 Okt tidak
    c = {i: celah_hari(hd[dt.date(2026, 10, i)], porsi) for i in range(16, 21)}
    assert c[20], f"20 Okt 2026 harus bertanda celah: {c[20]}"
    assert not any(c[i] for i in range(16, 20)), f"hari acuan tak boleh bertanda celah: {c}"
    return isi, porsi, c[20]


def uji_tahun_baru():
    """Jalur bangun() tanpa jaringan: tahun baru (mulai 2027-01-01) dengan JSON 2026 di jalur keluaran, rekaman Okt 2026 tak ada, S-NPP berhenti
    -> porsi tetap PORSI (tidak KeyError, tidak nol), JSON 2026 tidak dipakai, hot memuat N21 pengganti."""
    import tempfile
    class W:
        def cari(self, lon, lat):
            return ("62", "X", "Y")
    row = lambda sat, jam, lon, conf="n": {"satellite": sat, "acq_date": "", "acq_time": jam, "latitude": "-2.0", "longitude": str(lon), "confidence": conf}
    with tempfile.TemporaryDirectory() as tmp:
        cache, jalur = os.path.join(tmp, "utc"), os.path.join(tmp, "x.json")
        for n in range(-3, 4):   # UTC 2026-12-29 .. 2027-01-03
            u = dt.date(2027, 1, 1) + n * HARI
            baris = [("s", {**row(sat, jam, lon), "acq_date": u.isoformat()}) for sat, jam, lon in
                     (("N20", "0600", 113.0), ("N20", "0600", 113.5), ("N20", "1800", 113.0), ("N21", "0610", 113.0), ("N21", "1810", 114.0), ("Terra", "0300", 113.0))]
            rec = rekam(baris, W(), "2027-01-10T00:00:00+00:00")[u.isoformat()]
            rec["src"] = {f: None if f == "VIIRS_SNPP" else "NRT" for f in FAMILI}     # S-NPP tak didistribusikan
            simpan_rek(cache, u, rec)
        json.dump({"versi": VERSI, "hari": ["2026-01-01", "2026-01-02"], "porsi": PORSI, "prov": {}}, open(jalur, "w"))   # JSON 2026 basi di jalur keluaran
        asli = (globals()["muat_ketersediaan"], globals()["Wilayah"], firms.kunci)
        globals()["muat_ketersediaan"], globals()["Wilayah"], firms.kunci = (lambda *a, **k: {}), W, (lambda: "K")
        try:
            isi = bangun(["--mulai", "2027-01-01", "--akhir", "2027-01-03", "--keluar", jalur, "--cache", cache], sekarang=dt.datetime(2027, 1, 4, 12, tzinfo=UTC), log=lambda *_: None)
            iw = json.load(open(jalur_wil(jalur)))
        finally:
            globals()["muat_ketersediaan"], globals()["Wilayah"], firms.kunci = asli
    assert isi["hari"] == ["2027-01-01", "2027-01-02", "2027-01-03"] and isi["porsi"] == PORSI and isi["patah"] == [], isi["hari"]
    # tiap hari UTC: N20 2 (a) + 1 (b), N21 1 (a) + 1 (b), Terra 1 (a); hari WIB = b hari UTC sebelumnya + a hari UTC itu
    assert isi["nasional"]["hot"] == [6, 6, 6], isi["nasional"]["hot"]                   # Terra + N20 3 + N21 pengganti S-NPP 2 (tanpa N21 = 4)
    assert isi["nasional"]["luas"] == [bul(5 * PORSI * HA)] * 3 and bul(5 * PORSI * HA) > 0, isi["nasional"]["luas"]   # 5 titik N20/N21 n/h x porsi x 4,3, bukan nol
    assert set(iw["d"]) == {"62|X", "62|X|Y"} and iw["d"]["62|X|Y"] == iw["d"]["62|X"] and iw["d"]["62|X"][1] == 6 and len(iw["d"]["62|X"]) == 15, iw["d"]


def uji():
    uji_sintetis()
    uji_tahun_baru()
    isi, porsi, alasan = uji_deck()
    nas = isi["nasional"]
    print(f"peta_karhutla: uji lolos | porsi {porsi:.4f} | 18-20 Okt = deck untuk 38 provinsi x 4 metrik | nasional hot {nas['hot']} luas {nas['luas']} "
          f"belum {nas['belum']} padam {nas['padam']} | celah 20 Okt: {alasan[:3]}")


if __name__ == "__main__":
    if "--uji" in sys.argv:
        uji()
    elif "--ukur" in sys.argv:   # --keluar berkas.json: JSON yang dibaca (hari + celah), bawaan yang terbit
        jl = sys.argv[sys.argv.index("--keluar") + 1] if "--keluar" in sys.argv else os.path.join(AKAR, "public/data/peta_karhutla.json")
        print("UKUR =", ukur(os.path.join(AKAR, "data/raw/peta_karhutla/utc"), jl))
    else:
        bangun(sys.argv[1:])
