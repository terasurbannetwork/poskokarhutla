"""Titik panas Himawari-9 (JAXA P-Tree L2 WLF v010, per 10 menit, latensi ~1 jam) -> public/data/himawari.json

Pakai:  python3 scripts/data/himawari.py          # butuh env PTREE_USER, PTREE_PASS
        python3 scripts/data/himawari.py --uji    # self-check parser
Env: HIMAWARI_JAM (jendela jam terhadap pindaian terbaru, bawaan 3).
Level 1 dingin/2 membara/3 menyala; Reliability 1 rendah (sering = industri) 3 normal 5 tinggi; `baris` menyimpan >= 3 (keputusan pemilik 25 Okt 2026); reliability 5 saja hanya untuk `penanda` (PKH-04: uji balik Pantau Karhutla 2 Sep-18 Okt 2026,
VIIRS membenarkan 91% reliability 5 pada 3 km tetapi 74% reliability 3 dan 55% reliability 1);
`presisi` mengukur ulang angka itu dari data kita sendiri (`--presisi himawari.json titik_hari.json`);
QF 0 normal/1 jenuh/2 FRP kurang yakin. FRP MW = FRP(W/m2) x Area(km2). Grid 0.02 derajat.

Kunci `penanda` (PKH-04, tanda "sinyal dini belum terkonfirmasi", BUKAN api): reliability 5, terlihat >= 2 kali (deteksi lain mana pun 5-60 menit sebelumnya dalam 3 km),
tak ada VIIRS (semua kepercayaan) dalam 5 km selama 72 jam sebelumnya dan sampai sekarang, tak <= 2 km dari sumber statis (titik_palsu.json) dan tak <= 1,5 km dari daftar
alarm palsu (himawari_alarm_palsu.csv). Penanda dibuang bila VIIRS muncul dalam 5 km atau 12 jam sesudah deteksi terakhir. Aturan dan daftar alarm palsu dari
Pantau Karhutla (MIT, Copyright (c) 2026 Pantau Karhutla; pipeline/src/haze/himawari.py, docs/research/audit-himawari.md). Jendela FTP diperpanjang
(HIMAWARI_JAM_PENANDA, bawaan 13 jam) HANYA untuk penanda; `baris` tetap jendela HIMAWARI_JAM. Sumber VIIRS: FIRMS NRT (env FIRMS_MAP_KEY) atau hotspot72.json
yang segar (<= 6 jam dari acuan; lokal atau situs). Tanpa keduanya `penanda.status` = "viirs_tak_ada" dan daftarnya kosong (tidak mengira "tak ada VIIRS" = baru).
Kredit wajib JAXA ada di `penanda.kredit`.
"""
import csv, datetime as dt, ftplib, io, json, math, os, re, sys, time, urllib.request

HOST = "ftp.ptree.jaxa.jp"
KELUAR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "../../public/data/himawari.json")
SUMBER = "Himawari-9 L2 WLF v010 · P-Tree System, JAXA"
BATAS_DETIK = 240  # total waktu run; FTP JAXA kadang macet dan job dipotong di 8 menit. Lewat -> berhenti tanpa menulis, putaran berikutnya mengulang
AKAR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "../..")
ALARM_PALSU = os.path.join(os.path.dirname(os.path.abspath(__file__)), "himawari_alarm_palsu.csv")
STATIS = os.path.join(AKAR, "public/data/titik_palsu.json")
REL_MIN = 5                # hanya untuk `penanda`
BARIS_REL_MIN = 3          # `baris`: keputusan pemilik 25 Okt 2026 (sedang/tinggi)
ULANG_KM, ULANG_MNT = 3.0, (5, 60)        # "terlihat dua kali": deteksi lain 5-60 menit sebelumnya dalam 3 km
BARU_KM, LOOKBACK_JAM = 5.0, 72           # tak ada VIIRS dalam 5 km selama 72 jam
STATIS_KM, PALSU_KM, HIDUP_JAM = 2.0, 1.5, 12
KREDIT = ("Research product of Himawari Wild Fire (produced from Himawari-9) was supplied by the P-Tree System, "
          "Japan Aerospace Exploration Agency (JAXA).")
NAMA = re.compile(r"H09_(\d{8})_(\d{4})_L2WLF010_FLDK")


def deteksi(teks, rel_min=1):
    """-> [(waktu UTC, lat, lon, frp_mw, level, rel, qf)] semua deteksi dalam bbox Indonesia, bukan gunung api, reliability >= rel_min."""
    out = []
    for b in teks.splitlines():
        if not b.strip() or b.startswith("#"):
            continue
        k = b.split(",")
        try:
            th, bl, tg, hm = int(k[1]), int(k[2]), int(k[3]), int(k[4])
            lat, lon, luas, gunung = float(k[5]), float(k[6]), float(k[7]), int(float(k[8]))
            lv, rel, frp, qf = int(k[9]), int(k[10]), float(k[11]), int(k[12])
        except (ValueError, IndexError):
            continue
        if not (-11.5 <= lat <= 6.5 and 94.5 <= lon <= 141.5) or rel < rel_min or gunung > 0:
            continue
        out.append((dt.datetime(th, bl, tg, hm // 100, hm % 100), lat, lon, round(frp * luas, 1), lv, rel, qf))
    return out


def parse(teks, rel_min=BARIS_REL_MIN):
    """-> {(lat,lon): (waktu, frp_mw, level, rel, qf)} grid dalam bbox Indonesia, terbaru per grid, hanya reliability >= rel_min."""
    out = {}
    for w, lat, lon, frp, lv, rel, qf in deteksi(teks, rel_min):
        if (lat, lon) not in out or w > out[(lat, lon)][0]:
            out[(lat, lon)] = (w, frp, lv, rel, qf)
    return out


def gabung(per_berkas):
    """per_berkas: daftar hasil parse(); -> (acuan, baris) dengan dedupe terbaru per grid."""
    semua = {}  # grid -> (waktu_terbaru, frp, lv, rel, qf, n_pindai, waktu_pertama)
    for d in per_berkas:
        for g, v in d.items():
            if g not in semua:
                semua[g] = v + (1, v[0])
                continue
            o = semua[g]
            semua[g] = (v if v[0] > o[0] else o[:5]) + (o[5] + 1, min(o[6], v[0]))
    return semua


def km(la1, lo1, la2, lo2):
    return math.hypot((la1 - la2) * 110.57, (lo1 - lo2) * 111.32 * math.cos(math.radians((la1 + la2) / 2)))


class Indeks:
    """Kisi 0,05 derajat untuk pencarian tetangga (jarak berapa pun, sel yang dipindai menyesuaikan); item = tuple yang lat, lon-nya di posisi 1, 2 (atau kunci=(lat,lon))."""
    def __init__(self, items, kunci=lambda x: (x[1], x[2])):
        self.k, self.sel = kunci, {}
        for x in items:
            la, lo = kunci(x)
            self.sel.setdefault((int(la // 0.05), int(lo // 0.05)), []).append(x)

    def dekat(self, lat, lon, jarak):
        a, b, r = int(lat // 0.05), int(lon // 0.05), int(jarak / 5.25) + 1   # sel 0,05 derajat >= 5,25 km (bujur di khatulistiwa 5,57 km)
        for i in range(-r, r + 1):
            for j in range(-r, r + 1):
                for x in self.sel.get((a + i, b + j), ()):
                    la, lo = self.k(x)
                    if km(lat, lon, la, lo) <= jarak:
                        yield x


def muat_statis():
    """-> [(lat, lon)] sumber panas tetap (titik_palsu.json, termasuk kawah dan suar gas) dan [(lat, lon)] alarm palsu Himawari."""
    st = [(x["lat"], x["lon"]) for x in json.load(open(STATIS))["sumber_statis"]] if os.path.exists(STATIS) else []
    pa = [(float(r["lat"]), float(r["lon"])) for r in csv.DictReader(l for l in open(ALARM_PALSU) if not l.startswith("#"))]
    return st, pa


def penanda(det, viirs, statis, palsu, acuan):
    """det [(w, lat, lon, frp, lv, rel, qf)] SEMUA reliability; viirs [(w, lat, lon)] semua kepercayaan (UTC naive); -> [[lat, lon, frp, pertama, terakhir]] (aturan di docstring modul)."""
    det = sorted(det)
    ist, ipa = Indeks([(0, la, lo) for la, lo in statis]), Indeks([(0, la, lo) for la, lo in palsu])
    det = [d for d in det if next(ist.dekat(d[1], d[2], STATIS_KM), None) is None and next(ipa.dekat(d[1], d[2], PALSU_KM), None) is None]
    idet, iv = Indeks(det), Indeks(viirs)
    lo_m, hi_m = (dt.timedelta(minutes=m) for m in ULANG_MNT)
    cand = []
    for d in det:
        if d[5] < REL_MIN or not any(d[0] - hi_m <= e[0] <= d[0] - lo_m for e in idet.dekat(d[1], d[2], ULANG_KM)):
            continue
        if any(d[0] - dt.timedelta(hours=LOOKBACK_JAM) <= v[0] for v in iv.dekat(d[1], d[2], BARU_KM)):   # VIIRS 72 jam sebelumnya ATAU sesudahnya
            continue
        cand.append(d)
    grup = list(range(len(cand)))
    ic = Indeks([(i, c[1], c[2]) for i, c in enumerate(cand)])
    for i, c in enumerate(cand):
        for j, _, _ in ic.dekat(c[1], c[2], ULANG_KM):
            a, b = grup[i], grup[j]
            if a != b:
                grup = [a if g == b else g for g in grup]
    out = {}
    for i, c in enumerate(cand):
        out.setdefault(grup[i], []).append(c)
    hasil = []
    for g in out.values():
        akhir = max(c[0] for c in g)
        if akhir < acuan - dt.timedelta(hours=HIDUP_JAM):
            continue
        t = max(g)   # terbaru (urut per waktu): posisi terakhir
        hasil.append([round(t[1], 3), round(t[2], 3), max(c[3] for c in g), min(c[0] for c in g).strftime("%Y-%m-%dT%H:%MZ"), akhir.strftime("%Y-%m-%dT%H:%MZ")])
    return sorted(hasil)


def konfirmasi(pen, viirs, jam=(12, 24), jarak=BARU_KM):
    """Berapa persen penanda [[lat, lon, frp, pertama, terakhir]] yang dikonfirmasi VIIRS (5 km) dalam `jam` jam sesudah deteksi PERTAMA.
    Hanya penanda yang jendela amatnya sudah penuh (pertama + jam <= akhir data VIIRS) ikut dihitung. Tanpa penanda matang: "belum terukur", bukan 0."""
    if not viirs:
        return "belum terukur"
    akhir, iv, out = max(v[0] for v in viirs), Indeks(viirs), {}
    for h in jam:
        n = c = 0
        for r in pen:
            t = dt.datetime.strptime(r[3], "%Y-%m-%dT%H:%MZ")
            if t + dt.timedelta(hours=h) > akhir:
                continue
            n += 1
            c += any(t <= v[0] <= t + dt.timedelta(hours=h) for v in iv.dekat(r[0], r[1], jarak))
        out[f"{h}j"] = {"n": n, "terkonfirmasi": c, "persen": round(100 * c / n, 1)} if n else "belum terukur"
    return out


def viirs_firms(kunci, kini, ambil=None):
    """VIIRS NRT (N20, N21 wajib; S-NPP boleh gagal: berhenti 1 Nov 2026) 5 hari terakhir -> [(w, lat, lon)]. Satu sumber wajib gagal = RuntimeError."""
    out = []
    for src, wajib in (("VIIRS_NOAA20_NRT", True), ("VIIRS_NOAA21_NRT", True), ("VIIRS_SNPP_NRT", False)):
        u = f"https://firms.modaps.eosdis.nasa.gov/api/area/csv/{kunci}/{src}/94.5,-11.5,141.5,6.5/5"
        try:
            teks = ambil(u) if ambil else urllib.request.urlopen(urllib.request.Request(u, headers={"User-Agent": "pantau-karhutla"}), timeout=60).read().decode()
            if not teks.startswith("latitude"):
                raise ValueError("bukan CSV FIRMS")
            for r in csv.DictReader(io.StringIO(teks)):
                hm = r["acq_time"].zfill(4)
                out.append((dt.datetime.strptime(r["acq_date"] + hm, "%Y-%m-%d%H%M"), float(r["latitude"]), float(r["longitude"])))
        except Exception as e:
            if wajib:
                raise RuntimeError(f"FIRMS {src}: {type(e).__name__}") from None   # tanpa rantai: traceback tak boleh membawa URL berkunci FIRMS
    return out


def viirs_hotspot72(h, acuan):
    """isi hotspot72.json {acuan, baris[[lat, lon, jam relatif acuan, sensor, ...]]} -> [(w, lat, lon)] VIIRS, atau None bila acuannya lebih dari 6 jam dari acuan Himawari."""
    a = dt.datetime.fromisoformat(h["acuan"]).astimezone(dt.timezone.utc).replace(tzinfo=None)
    if abs(a - acuan) > dt.timedelta(hours=6):
        return None
    return [(a + dt.timedelta(hours=r[2]), r[0], r[1]) for r in h["baris"] if r[3] in ("N", "N20", "N21")]


def muat_viirs(acuan):
    """-> (daftar, sumber) atau (None, alasan). Daftar kosong yang sah (tak ada satu pun VIIRS) tetap daftar."""
    kunci = os.environ.get("FIRMS_MAP_KEY")
    if kunci:
        try:
            return viirs_firms(kunci, acuan), "FIRMS NRT"
        except RuntimeError as e:
            print("himawari: " + str(e) + "; coba hotspot72.json", file=sys.stderr)
    for asal in (os.path.join(AKAR, "public/data/hotspot72.json"), os.environ.get("HIMAWARI_HOTSPOT72_URL", "https://centurisk97.id/data/hotspot72.json")):
        try:
            h = json.load(open(asal)) if not asal.startswith("http") else json.load(io.TextIOWrapper(urllib.request.urlopen(asal, timeout=60), "utf-8"))
            v = viirs_hotspot72(h, acuan)
            if v is not None:
                return v, "hotspot72.json (" + ("lokal" if not asal.startswith("http") else "situs") + ")"
        except Exception:
            pass
    return None, "viirs_tak_ada"


def presisi(himawari, viirs, jarak=3.0, menit=30, sapuan=50.0):
    """Uji presisi (PKH-04): untuk tiap deteksi Himawari [(w, lat, lon, rel)], apakah VIIRS [(w, lat, lon)] dalam +-menit melihat api dalam `jarak` km.
    Hanya deteksi yang 'tercakup' dihitung: ada VIIRS (mana saja) dalam +-menit dan `sapuan` km (perkiraan kasar jalur lintasan; awan tetap dihitung luput).
    -> {rel: {"n", "cocok", "persen"}}."""
    iv, d = Indeks(viirs), {}
    for w, la, lo, rel in himawari:
        dekat = [v for v in iv.dekat(la, lo, sapuan) if abs((v[0] - w).total_seconds()) <= menit * 60]
        if not dekat:
            continue
        e = d.setdefault(rel, [0, 0])
        e[0] += 1
        e[1] += any(km(la, lo, v[1], v[2]) <= jarak for v in dekat)
    return {r: {"n": n, "cocok": c, "persen": round(100 * c / n, 1)} for r, (n, c) in sorted(d.items())}


def habis(t0, sekarang=None):
    return (time.monotonic() if sekarang is None else sekarang) - t0 > BATAS_DETIK


def uji_penanda():
    W = lambda h, m=0: dt.datetime(2026, 10, 19, h, m)
    D = lambda w, la, lo, rel=5: (w, la, lo, 10.0, 2, rel, 0)
    ac = W(7, 0)
    ada = [D(W(6, 0), -2.0, 110.0, 3), D(W(6, 30), -2.0, 110.0)]                      # terlihat dua kali (rel 3 lalu 5, 30 menit): lolos
    assert [r[:2] for r in penanda(ada, [], [], [], ac)] == [[-2.0, 110.0]], "rel 5 + terlihat 2x + tanpa VIIRS = penanda"
    assert penanda([D(W(6, 30), -2.0, 110.0)], [], [], [], ac) == [], "sekali lihat saja: tidak"
    assert penanda([D(W(6, 0), -2.0, 110.0, 3), D(W(6, 30), -2.0, 110.0, 3)], [], [], [], ac) == [], "rel 3: tidak"
    assert penanda([D(W(6, 29), -2.0, 110.0), D(W(6, 30), -2.0, 110.0)], [], [], [], ac) == [], "selang < 5 menit bukan pindaian terpisah"
    assert penanda(ada, [(W(6, 40), -2.03, 110.0)], [], [], ac) == [], "VIIRS 3,3 km sesudahnya: dibuang"
    assert penanda(ada, [(W(3, 0) - dt.timedelta(hours=68), -2.0, 110.04)], [], [], ac) == [], "VIIRS 4,4 km, 71 jam sebelumnya: bukan baru"
    assert penanda(ada, [(W(3, 0) - dt.timedelta(hours=75), -2.0, 110.0)], [], [], ac) != [], "VIIRS 78 jam sebelumnya: baru"
    assert penanda(ada, [(W(6, 40), -2.0, 110.06)], [], [], ac) != [], "VIIRS 6,7 km: di luar 5 km"
    assert penanda(ada, [], [(-2.0, 110.015)], [], ac) == [] and penanda(ada, [], [(-2.0, 110.03)], [], ac) != [], "statis 2 km"
    assert penanda(ada, [], [], [(-2.0, 110.012)], ac) == [] and penanda(ada, [], [], [(-2.0, 110.02)], ac) != [], "alarm palsu 1,5 km"
    assert penanda(ada, [], [], [], W(19, 0)) == [] and penanda(ada, [], [], [], W(18, 0)) != [], "12 jam sesudah deteksi terakhir"
    dua = ada + [D(W(6, 0), -2.01, 110.0, 3), D(W(6, 40), -2.01, 110.0)]
    assert len(penanda(dua, [], [], [], ac)) == 1, "dua penanda < 3 km digabung"
    hw = [(W(6, 30), -2.0, 110.0, 5), (W(6, 30), -2.0, 110.01, 3), (W(6, 30), -2.0, 110.1, 3), (W(6, 30), -5.0, 100.0, 5)]
    v = [(W(6, 40), -2.0, 110.0)]
    assert presisi(hw, v) == {3: {"n": 2, "cocok": 1, "persen": 50.0}, 5: {"n": 1, "cocok": 1, "persen": 100.0}}, presisi(hw, v)   # (-5,100) di luar sapuan: tak dihitung
    assert viirs_hotspot72({"acuan": "2026-10-19T07:00:00+00:00", "baris": [[-2.0, 110.0, -1.5, "N20"], [-2.0, 110.0, -1.5, "M"]]}, W(7, 10)) == [(W(5, 30), -2.0, 110.0)]
    assert viirs_hotspot72({"acuan": "2026-10-12T07:00:00+00:00", "baris": []}, W(7, 10)) is None, "hotspot72 basi tak boleh dipakai"
    assert susun_penanda([], W(7, 0), 13, 0, 0, False)["status"] in ("ok", "viirs_tak_ada"), "tanpa VIIRS: daftar kosong, tidak mengarang"
    assert viirs_firms("K", W(7, 0), lambda u: "latitude,longitude,acq_date,acq_time\n-2.0,110.0,2026-10-19,545\n") == [(W(5, 45), -2.0, 110.0)] * 3
    try:
        viirs_firms("K", W(7, 0), lambda u: "<html>")
        raise AssertionError("gagal tarik N20/N21 harus RuntimeError")
    except RuntimeError:
        pass


def uji():
    s = ("# a\n# b\n"
         "1,2026,10,19,600,-2.0,110.0,4.0,0,3,3,10.0,0\n"      # frp 40.0
         "2,2026,10,19,610,-2.0,110.0,4.0,0,2,5,12.5,1\n"      # grid sama, lebih baru -> menang, 50.0
         "3,2026,10,19,610,-2.02,110.0,4.0,0,3,1,10.0,0\n"     # rel 1 -> buang
         "6,2026,10,19,610,-2.04,110.0,4.0,0,3,2,10.0,0\n"     # rel 2 (di bawah normal) -> buang
         "4,2026,10,19,610,20.0,110.0,4.0,0,3,3,10.0,0\n"      # luar bbox
         "5,2026,10,19,610,-3.0,110.0,4.0,1,3,3,10.0,0\n")     # gunung api
    d = parse(s)
    assert list(d) == [(-2.0, 110.0)], d
    w, frp, lv, rel, qf = d[(-2.0, 110.0)]
    assert (w.minute, frp, lv, rel, qf) == (10, 50.0, 2, 5, 1), d
    awal = {(-2.0, 110.0): (dt.datetime(2026, 10, 19, 6, 0), 40.0, 3, 3, 0)}
    g = gabung([awal, d, {}])[(-2.0, 110.0)]
    assert (g[0].minute, g[1], g[5], g[6].minute) == (10, 50.0, 2, 0), g
    assert len(parse("1,2026,10,19,600,-2.0,110.0,4.0,0,3,3,10.0,0\n")) == 1 and parse("1,2026,10,19,600,-2.0,110.0,4.0,0,3,3,10.0,0\n", 5) == {}, "baris: rel >= 3"
    uji_penanda()
    assert konfirmasi([], []) == "belum terukur"
    pn = [[-2.0, 110.0, 10.0, "2026-10-19T00:00Z", "2026-10-19T01:00Z"], [-5.0, 100.0, 10.0, "2026-10-19T00:00Z", "2026-10-19T01:00Z"], [-2.0, 110.0, 1.0, "2026-10-19T23:00Z", "2026-10-19T23:30Z"]]
    kf = konfirmasi(pn, [(dt.datetime(2026, 10, 19, 6), -2.0, 110.01), (dt.datetime(2026, 10, 20, 0), 0.0, 100.0)])
    assert kf["12j"] == {"n": 2, "terkonfirmasi": 1, "persen": 50.0} and kf["24j"]["n"] == 2 and konfirmasi(pn[2:], [(dt.datetime(2026, 10, 20), 0.0, 0.0)])["12j"] == "belum terukur", kf
    assert not habis(100.0, 100.0 + BATAS_DETIK) and habis(100.0, 100.0 + BATAS_DETIK + 1), "batas waktu total"
    print("uji OK")


def main():
    t0 = time.monotonic()
    jam = int(os.environ.get("HIMAWARI_JAM", "3"))
    jam_p = max(jam, int(os.environ.get("HIMAWARI_JAM_PENANDA", "13")))
    f = ftplib.FTP(HOST, timeout=30)
    f.login(os.environ["PTREE_USER"], os.environ["PTREE_PASS"])  # gagal -> exception -> exit != 0
    f.set_pasv(True)
    now = dt.datetime.now(dt.timezone.utc).replace(tzinfo=None, minute=0, second=0, microsecond=0)
    berkas = []  # (waktu_pindai, path)
    for i in range(jam_p + 4):  # mundur dari sekarang; latensi ~1 jam jadi beri kelonggaran
        if habis(t0):
            return print(f"himawari: lewat batas {BATAS_DETIK} dtk saat mendaftar folder (FTP JAXA lambat); keluaran lama dibiarkan, putaran berikutnya mengulang")
        h = now - dt.timedelta(hours=i)
        d = f"/pub/himawari/L2/WLF/010/{h:%Y%m}/{h:%d}/{h:%H}"
        try:
            for n in f.nlst(d):
                m = NAMA.search(n)
                if m and n.endswith(".csv"):
                    berkas.append((dt.datetime.strptime(m[1] + m[2], "%Y%m%d%H%M"), n if n.startswith("/") else d + "/" + n))
        except (ftplib.error_perm, ftplib.error_temp):
            pass  # folder belum ada
    if not berkas:
        sys.exit("tidak ada CSV Himawari ditemukan")
    acuan = max(w for w, _ in berkas)
    pilih = sorted(b for b in berkas if b[0] > acuan - dt.timedelta(hours=jam))
    lama = sorted((b for b in berkas if acuan - dt.timedelta(hours=jam_p) < b[0] <= acuan - dt.timedelta(hours=jam)), reverse=True)   # hanya untuk penanda, terbaru dulu
    hasil, semua = [], []
    for _, p in pilih:
        if habis(t0):
            return print(f"himawari: lewat batas {BATAS_DETIK} dtk saat mengunduh {len(hasil)}/{len(pilih)} CSV (FTP JAXA lambat); data parsial tidak ditulis, keluaran lama dibiarkan, putaran berikutnya mengulang")
        buf = io.BytesIO()
        f.retrbinary("RETR " + p, buf.write)
        teks = buf.getvalue().decode("utf-8", "replace")
        hasil.append(parse(teks))
        semua += deteksi(teks)
    n_lama, terpotong = 0, False
    for _, p in lama:
        if time.monotonic() - t0 > BATAS_DETIK * 0.8:   # sisakan waktu: penanda boleh parsial, `baris` wajib selesai
            terpotong = True
            break
        buf = io.BytesIO()
        f.retrbinary("RETR " + p, buf.write)
        semua += deteksi(buf.getvalue().decode("utf-8", "replace"))
        n_lama += 1
    f.quit()
    mnt = lambda w: max(0, int((acuan - w).total_seconds() // 60))
    baris = [[lat, lon, mnt(w), frp, lv, rel, qf, n, mnt(w0)]
             for (lat, lon), (w, frp, lv, rel, qf, n, w0) in sorted(gabung(hasil).items())]
    out = {"acuan": acuan.strftime("%Y-%m-%dT%H:%M:00Z"), "jam": jam, "sumber": SUMBER,
           "kolom": ["lat", "lon", "u", "frp", "level", "rel", "qf", "n", "u0"], "baris": baris}
    out["penanda"] = susun_penanda(semua, acuan, jam_p, len(lama), n_lama, terpotong)
    with open(KELUAR, "w") as fh:
        json.dump(out, fh, separators=(",", ":"), ensure_ascii=False)
    print(f"himawari: {len(pilih)} CSV, {len(baris)} baris, acuan {out['acuan']}; penanda {out['penanda']['status']}: {len(out['penanda']['baris'])}")


def susun_penanda(semua, acuan, jam_p, n_rencana, n_ambil, terpotong):
    """Blok `penanda` untuk himawari.json. VIIRS tak terjangkau = daftar kosong berstatus viirs_tak_ada (bukan 'semua baru')."""
    isi = {"kolom": ["lat", "lon", "frp", "pertama", "terakhir"], "baris": [], "kredit": KREDIT, "jendela_jam": jam_p,
           "aturan": "reliability 5; terlihat 2x (5-60 mnt, 3 km); tanpa VIIRS 5 km selama 72 jam; di luar 2 km sumber statis dan 1,5 km alarm palsu; hidup 12 jam sesudah deteksi terakhir"}
    try:
        v, sumber = muat_viirs(acuan)
        if v is None:
            return {**isi, "status": "viirs_tak_ada"}
        st, pa = muat_statis()
        isi.update(baris=penanda(semua, v, st, pa, acuan), viirs=sumber, n_viirs=len(v))
        return {**isi, "status": "jendela_terpotong" if terpotong else "ok", "berkas_lama": [n_ambil, n_rencana],
                "konfirmasi": "belum terukur", "konfirmasi_catatan": "Penanda baru berjalan; konfirmasi() dihitung dari arsip R2 arsip/himawari/ + VIIRS sesudahnya setelah ada deretnya."}
    except Exception as e:   # penanda hanya tambahan: jangan menjatuhkan `baris`
        print("himawari: penanda gagal:", type(e).__name__, e, file=sys.stderr)
        return {**isi, "status": "galat"}


def uji_presisi(berkas_hw, berkas_titik_hari, tulis=None):
    """himawari.json (kolom lat, lon, u, ..., rel, ..., u0) + titik_hari/<hari>.json -> presisi per reliability pada 3 km. Dua pengamatan per baris (u terbaru, u0 pertama)."""
    hw, th = json.load(open(berkas_hw)), json.load(open(berkas_titik_hari))
    ac = dt.datetime.strptime(hw["acuan"], "%Y-%m-%dT%H:%M:00Z")
    nol = dt.datetime.strptime(th["hari"], "%Y-%m-%d") - dt.timedelta(hours=7)   # 00.00 WIB hari itu dalam UTC
    k = th["kolom"]
    v = [(nol + dt.timedelta(hours=r[k.index("jam")]), r[k.index("lat")], r[k.index("lon")]) for r in th["baris"]]
    h = []
    for r in hw["baris"]:
        for u in {r[2], r[8] if len(r) > 8 else r[2]}:
            h.append((ac - dt.timedelta(minutes=u), r[0], r[1], r[5]))
    hasil = {"himawari": berkas_hw and os.path.basename(berkas_hw), "acuan": hw["acuan"], "viirs": f"titik_hari {th['hari']} ({len(v)} lokasi unik, semua satelit)",
             "n_pengamatan_himawari": len(h), "jarak_km": 3, "selisih_menit": 30, "per_reliability": presisi(h, v),
             "catatan": "Satu jendela 3 jam (satu acuan), bukan musim: angka kasar. Reliability 1 tak ada (keluaran lama membuang < 3). titik_hari menyimpan lokasi unik per hari dengan waktu deteksi PERTAMA saja dan sudah membuang sumber panas tetap, jadi cocok-waktu +-30 mnt meremehkan presisi. Sapuan VIIRS didekati 50 km dari deteksi VIIRS mana pun pada +-30 mnt. Pembanding Pantau Karhutla (47 hari): rel 1 55%, rel 3 74%, rel 5 91%."}
    if tulis:
        json.dump(hasil, open(tulis, "w"), ensure_ascii=False, indent=1)
    return hasil


if __name__ == "__main__":
    if "--presisi" in sys.argv:
        a = sys.argv[sys.argv.index("--presisi") + 1:]
        print(json.dumps(uji_presisi(a[0], a[1], os.path.join(os.path.dirname(os.path.abspath(__file__)), "himawari_presisi.json")), ensure_ascii=False, indent=1))
    else:
        uji() if "--uji" in sys.argv else main()
