"""Desa waspada (PKH-18) -> public/data/desa_waspada.json. Paket: data/kajian-bnpb/desa-waspada/ (KEPUTUSAN-DESA.md menang).

Dua daftar desa: A = desa dengan titik panas VIIRS (n/h) 7 hari terakhir; B = desa tanpa titik 7 hari yang punya >= 3 tahun terbakar
(2012-2025, petak 375 m terbanyak, `riwayat_petak.bin`). Peluang yang menyertai = peluang KAB/KOTA dari prediksi.json, BUKAN peluang desa.
Titik daftar (VIIRS n/h, unik per petak per hari WIB) tidak dijumlah dengan angka utama atau MODIS. Tak terukur = null, bukan 0.

Metode daftar desa dan hindcast diadaptasi dari Pantau Karhutla (MIT, Copyright (c) 2026 Pantau Karhutla), ditulis ulang di stdlib
dan diukur ulang di data kita. Tidak ada kode yang disalin.

Pencari desa: insiden.Desa (diimpor, tanpa salinan; insiden.py aman diimpor: hanya definisi, `main` di bawah `__main__`).

Pakai:  python3 scripts/data/desa_waspada.py          # putaran 3 jam: baca hotspot.json + desa_statik.json -> public/data/desa_waspada.json
        python3 scripts/data/desa_waspada.py statik   # bulanan: riwayat_petak.bin + gambut.geojson -> data/desa_statik.json
        python3 scripts/data/desa_waspada.py laju     # hindcast lokal (butuh data/raw/firms/viirs_2023.csv) -> scripts/data/desa_waspada_laju.json
        python3 scripts/data/desa_waspada.py --uji    # self-check
"""
import bisect, collections, csv, datetime as dt, json, math, os, re, sys, tempfile, time

sys.path.insert(0, os.path.dirname(__file__))
from wilayah import AKAR, PROVINSI  # noqa: E402
from insiden import Desa, cincin, pip  # noqa: E402
import riwayat_petak  # noqa: E402
import titik_palsu  # noqa: E402

DATA = os.path.join(AKAR, "public/data")
STATIK = os.path.join(AKAR, "data/desa_statik.json")
LAJU = os.path.join(AKAR, "scripts/data/desa_waspada_laju.json")
KELUAR = os.path.join(DATA, "desa_waspada.json")
WIB = dt.timezone(dt.timedelta(hours=7))

JENDELA_JAM = 168
JAM24 = 24
MIN_TAHUN = 3
TH0, TH1 = riwayat_petak.TH0, riwayat_petak.TH1
SENSOR_DAFTAR = {"N", "N20", "N21"}
YAKIN_MIN = 1               # kolom keyakinan hotspot.json: 0 rendah, 1 nominal, 2 tinggi
MAKS_A = 2000
MAKS_B_PER_PROV = 300       # [SEMENTARA, Q5]
UKURAN_MAKS_KB = 450
Z_WILSON = 1.96
JARAK_BATAS_M = 200
UMUR_PREDIKSI_MAKS_JAM = 36
KISI_GAMBUT = 0.002         # derajat
MAKS_TITIK_GAMBUT = 200
SEL = 0.05                  # sel indeks Desa.muat
MUSIM = 2023
MINGGU = 17                 # 1 Jul - 27 Okt 2023 (minggu penuh)
AMBANG = {"a_kali": 3, "b_kali": 2, "n_min": 200}   # [SEMENTARA, Q2]; terkunci di RENCANA-UJI §2


# ---- bagian murni ----
def wilson(k, n, z=Z_WILSON):
    if n <= 0:
        return None
    p = k / n
    d = 1 + z * z / n
    c = (p + z * z / (2 * n)) / d
    h = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / d
    return [round(max(0.0, c - h), 4), round(min(1.0, c + h), 4)]


def kab4(kd):
    return kd[:2] + kd[3:5]


def pop(m):
    return bin(m).count("1")


def titik_dalam(rings):
    """Satu titik (lon, lat) di dalam salah satu cincin: titik tengah kotak bila di dalam, bila tidak kisi 15x15 terdekat (deterministik)."""
    xs = [p[0] for r in rings for p in r]
    ys = [p[1] for r in rings for p in r]
    x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    if any(pip(cx, cy, r) for r in rings):
        return cx, cy
    c = [(x0 + (x1 - x0) * (i + .5) / 15, y0 + (y1 - y0) * (j + .5) / 15) for i in range(15) for j in range(15)]
    c.sort(key=lambda p: (p[0] - cx) ** 2 + (p[1] - cy) ** 2)
    for x, y in c:
        if any(pip(x, y, r) for r in rings):
            return x, y
    return rings[0][0]


def sampel(rings, langkah=KISI_GAMBUT, maks=MAKS_TITIK_GAMBUT):
    """Titik uji di dalam desa: kisi seragam 0,002 derajat (langkah dilebarkan untuk desa luas supaya kandidat <= ~400), maks 200 (jarang merata)."""
    xs = [p[0] for r in rings for p in r]
    ys = [p[1] for r in rings for p in r]
    x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
    st = max(langkah, math.sqrt(max((x1 - x0) * (y1 - y0), 0) / 400))
    out, i = [], 0
    while x0 + st * (i + .5) <= x1:
        x, j = x0 + st * (i + .5), 0
        while y0 + st * (j + .5) <= y1:
            y = y0 + st * (j + .5)
            if any(pip(x, y, r) for r in rings):
                out.append((x, y))
            j += 1
        i += 1
    if not out:
        return [titik_dalam(rings)]
    if len(out) > maks:
        s = math.ceil(len(out) / maks)
        out = out[::s]
    return out


class Gambut:
    def __init__(self, geo):
        self.ix, self.kotak = collections.defaultdict(list), []
        for f in geo["features"]:
            for r in cincin(f["geometry"]):
                xs, ys = [p[0] for p in r], [p[1] for p in r]
                b = (min(xs), min(ys), max(xs), max(ys), r)
                self.kotak.append(b)
                for gx in range(math.floor(b[0] / SEL), math.floor(b[2] / SEL) + 1):
                    for gy in range(math.floor(b[1] / SEL), math.floor(b[3] / SEL) + 1):
                        self.ix[(gx, gy)].append(b)

    def sentuh(self, x0, y0, x1, y1):
        return any(b[0] <= x1 and b[2] >= x0 and b[1] <= y1 and b[3] >= y0 for b in self.kotak)

    def di(self, x, y):
        return any(b[0] <= x <= b[2] and b[1] <= y <= b[3] and pip(x, y, b[4])
                   for b in self.ix.get((math.floor(x / SEL), math.floor(y / SEL)), ()))


def petakan(pts, desa, per_kab=None, bila=None):
    """pts [(lat, lon)] -> [kd | None]. Per kab (dimuat satu-satu, dilepas lagi): titik di sel yang sama diuji ke poligon; poligon pertama menang
    (sama dengan Desa.cari). per_kab(kk, ix) dipanggil selagi indeks kab termuat; bila(i, kd, ring) untuk tiap titik yang cocok."""
    sel = collections.defaultdict(list)
    for i, (la, lo) in enumerate(pts):
        sel[(math.floor(lo / SEL), math.floor(la / SEL))].append(i)
    hasil = [None] * len(pts)
    for kk in sorted(set(desa.kab.values())):
        ix = desa.muat(kk)
        for c, ents in ix.items():
            for i in sel.get(c, ()):
                if hasil[i] is not None:
                    continue
                la, lo = pts[i]
                for x0, y0, x1, y1, r, kd in ents:
                    if x0 <= lo <= x1 and y0 <= la <= y1 and pip(lo, la, r):
                        hasil[i] = kd
                        if bila:
                            bila(i, kd, r)
                        break
        if per_kab:
            per_kab(kk, ix)
        desa.berkas.pop(kk, None)
    return hasil


def cincin_desa(ix):
    """{kd: [cincin]} dari indeks kab (entri sel berganda dibuang lewat id cincin)."""
    out, lihat = collections.defaultdict(list), set()
    for ents in ix.values():
        for e in ents:
            if id(e[4]) not in lihat:
                lihat.add(id(e[4]))
                out[e[5]].append(e[4])
    return out


def titik_unik(hs, acuan_t=None):
    """Baris hotspot.json -> {(kunci petak, tgl_wib): (jam, lat, lon, wilayah)} yang lolos definisi D5 dan jendela 168 jam. Satu petak satu hari = satu titik."""
    out = {}
    for lat, lon, jam, sen, _frp, yak, wil, tgl in hs["baris"]:
        if sen not in SENSOR_DAFTAR or yak < YAKIN_MIN or jam < -JENDELA_JAM:
            continue
        k = (riwayat_petak.kunci(lat, lon), tgl)
        if k not in out or jam > out[k][0]:
            out[k] = (jam, lat, lon, wil)
    return out


def daftar_a(hs, desa):
    """-> (per desa {kd: [titik7, titik24, jam_terakhir]}, tanpa_desa)."""
    agg, tanpa = {}, 0
    for jam, lat, lon, w in titik_unik(hs).values():
        p = hs["wilayah"][w].split("|") if w is not None and 0 <= w < len(hs["wilayah"]) else []
        kk = desa.kode_kab(p[0], p[1]) if len(p) >= 2 else None
        kd = desa.cari(lat, lon, kk) if kk else None
        if not kd and not kk and len(p) >= 2:      # nama kab tak cocok (mis. "Fak Fak" lawan "Fakfak"): coba kab sebuah provinsi
            kd = next((x for x in (desa.cari(lat, lon, k2) for (pp, _), k2 in sorted(desa.kab.items()) if pp == p[0]) if x), None)
        if not kd:
            tanpa += 1
            continue
        a = agg.setdefault(kd, [0, 0, -1e9])
        a[0] += 1
        a[1] += jam >= -JAM24
        a[2] = max(a[2], jam)
    return agg, tanpa


def peluang_kab(pred, sekarang):
    """-> ({kab4: [p1, p2, p3] persen bulat}, 'ok' | 'basi' | 'tak ada'). Peluang kab/kota, bukan desa; tua > 36 jam = tak dipakai."""
    if not pred:
        return {}, "tak ada"
    try:
        umur = (sekarang - dt.datetime.fromisoformat(pred["dibuat"])).total_seconds() / 3600
    except Exception:
        return {}, "tak ada"
    if umur > UMUR_PREDIKSI_MAKS_JAM:
        return {}, "basi"
    out = {}
    for k in pred.get("kab", []):
        api = k.get("API") or []
        out[k["id"]] = [round(a[0] * 100) if a and a[0] is not None else None for a in (list(api) + [None] * 3)[:3]]
    return out, "ok"


def susun(hs, desa, cari, statik, pred, skor, laju, sekarang, maks_b=MAKS_B_PER_PROV, maks_kb=UKURAN_MAKS_KB):
    acuan = dt.datetime.fromisoformat(hs["acuan"])
    agg, tanpa = daftar_a(hs, desa)
    nama = {kd: (d, kec) for kd, d, kec in cari["baris"]}
    pel, st_pel = peluang_kab(pred, sekarang)
    thn, gam = (statik or {}).get("tahun", {}), (statik or {}).get("gambut", {})

    def baris(kd, t7, t24, akhir, lon, lat):
        d, kec = nama.get(kd, (None, None))
        p = pel.get(kab4(kd)) or [None] * 3
        th = thn.get(kd)
        return [kd, d, kec, cari["kab"].get(kd[:5]), PROVINSI.get(kd[:2]), t7, t24, akhir,
                th[0] if th else None, th[1] if th else None, gam.get(kd), p[0], p[1], p[2],
                None if lon is None else round(lon, 3), None if lat is None else round(lat, 3)]

    urut = sorted(agg, key=lambda k: (-agg[k][0], -(thn.get(k) or [0])[0], k))
    pin = {}
    for kd in urut[:MAKS_A]:                       # pin dari poligon kab yang memuat desanya
        kk = kd[:5]
        pin.setdefault(kk, set()).add(kd)
    pos = {}
    for kk, kds in pin.items():
        cd = cincin_desa(desa.muat(kk))
        for kd in kds:
            if kd in cd:
                pos[kd] = titik_dalam(cd[kd])
    a_baris = []
    for kd in urut[:MAKS_A]:
        t7, t24, j = agg[kd]
        akhir = (acuan + dt.timedelta(hours=j)).astimezone(WIB).strftime("%Y-%m-%d %H:%M")
        x, y = pos.get(kd, (None, None))
        a_baris.append(baris(kd, t7, t24, akhir, x, y))
    a_tot, a_pot = collections.Counter(kd[:2] for kd in agg), collections.Counter(kd[:2] for kd in urut[MAKS_A:])
    a_tot, a_pot = dict(sorted(a_tot.items())), dict(sorted(a_pot.items()))
    # B: desa_statik dengan tahun >= 3 dan 0 titik 7 hari
    cb = collections.defaultdict(list)
    for kd, th in thn.items():
        if th[0] >= MIN_TAHUN and kd not in agg:
            cb[kd[:2]].append(kd)
    total_b = sum(len(v) for v in cb.values())
    for v in cb.values():
        v.sort(key=lambda k: (-thn[k][0], -(gam.get(k) if gam.get(k) is not None else -1), k))
    while True:
        b_baris, terpotong = [], {}
        for pv in sorted(cb):
            for kd in cb[pv][:maks_b]:
                th = thn[kd]
                b_baris.append(baris(kd, 0, 0, None, th[2] if len(th) > 2 else None, th[3] if len(th) > 3 else None))
            if len(cb[pv]) > maks_b:
                terpotong[pv] = len(cb[pv]) - maks_b
        out = {
            "versi": 1, "dibuat": sekarang.astimezone(WIB).isoformat(timespec="seconds"), "acuan": hs["acuan"],
            "definisi": {"sensor": sorted(SENSOR_DAFTAR), "keyakinan_min": "nominal", "jendela_jam": JENDELA_JAM,
                         "tahun_riwayat": [TH0, TH1], "min_tahun": MIN_TAHUN, "tahun_metode": "petak_terbanyak"},
            "kolom": ["kd", "desa", "kec", "kab", "prov", "titik7", "titik24", "terakhir", "tahun", "tahun_akhir", "gambut", "p1", "p2", "p3", "lon", "lat"],
            "a": {"baris": a_baris, "total": len(agg), "terpotong": max(0, len(agg) - MAKS_A), "tanpa_desa": tanpa,
                  "total_per_prov": a_tot, "terpotong_per_prov": a_pot},
            "b": {"baris": b_baris, "total": total_b, "terpotong_per_prov": terpotong,
                  "total_per_prov": {pv: len(v) for pv, v in sorted(cb.items())}},
            "peluang": {"status": (skor or {}).get("kode", {}).get("API", {}).get("status", "tak ada") if st_pel == "ok" else "tak ada",
                        "dibuat": (pred or {}).get("dibuat") if st_pel == "ok" else None, "ket": "peluang kab/kota, bukan desa"},
            "laju": laju_ringkas(laju),
            "batasan": batasan(statik, st_pel),
        }
        if len(json.dumps(out, ensure_ascii=False, separators=(",", ":"))) <= maks_kb * 1024 or maks_b <= 0:
            return out
        maks_b = max(0, int(maks_b * 0.8) - 1)


def laju_ringkas(l):
    if not l:
        return {"status": "belum", "musim": MUSIM, "sensor": "S-NPP", "kelompok": None, "kepekaan": None}
    h = l["hasil"]
    return {"status": l["status"], "musim": l["musim"], "sensor": "S-NPP", "kelompok": h["snpp"]["kelompok"],
            "per_kuartil_luas": h["snpp"]["per_kuartil_luas"], "vonis_kuartil": h["snpp"]["vonis_kuartil"],
            "kepekaan": {"noaa20": h["noaa20"]["kelompok"], "metode_alt": h["metode_alt"]["kelompok"]}}


def batasan(statik, st_pel):
    b = ["Titik panas di daftar ini dihitung dari satelit VIIRS dengan keyakinan sedang dan tinggi, satu titik per petak 375 m per hari. Angkanya tidak sama dengan angka utama dan tidak dijumlahkan dengannya.",
         "Desa yang tidak punya titik panas minggu ini belum tentu tidak ada api: satelit punya jeda lintasan dan awan bisa menutup.",
         "Tahun terbakar adalah jumlah tahun terbanyak pada satu petak 375 m milik desa, dari 2012 sampai 2025, dan merupakan batas bawah. Kosong berarti kurang dari 3 tahun, bukan nol.",
         "Peluang adalah peluang kabupaten/kota dari model prakiraan kami, sama untuk semua desa di kabupaten/kota itu. Ini bukan peluang desa.",
         "Batas desa disederhanakan, bukan batas resmi dari SK. Porsi gambut perkiraan dari peta skala 1:250.000; kosong berarti tidak ada data.",
         "Laju di kartu Laju dihitung dari musim kering 2023 dengan satu satelit saja; daftar desa minggu ini memakai tiga satelit sekaligus, jadi angkanya tidak bisa disamakan. Selang kepastiannya lebih sempit dari yang sebenarnya karena desa yang sama diamati minggu demi minggu.",
         "Sebagian kabupaten/kota belum punya peta batas desa (misalnya Fakfak): titik di sana dihitung terpisah sebagai tanpa desa dan tidak masuk daftar.",
         "Desa di lereng gunung api aktif bisa masuk daftar karena titik panas gunung, bukan kebakaran lahan."]
    if not statik:
        b.append("Berkas riwayat desa (statik) belum ada: daftar B kosong.")
    if st_pel != "ok":
        b.append("Peluang kab/kota tidak tersedia (%s)." % st_pel)
    return b


# ---- statik bulanan ----
def statik(desa, g, petak):
    """-> {"tahun": {kd: [tahun, tahun_akhir, lon, lat]}, "gambut": {kd: pecahan}, "meta": {...}}."""
    t0 = time.time()
    ks, vs = petak.k, petak.v
    pts, ms = [], []
    for k, v in zip(ks, vs):
        if pop(v) >= MIN_TAHUN:
            ix_, iy_ = k // 10000 - 1000, k % 10000 - 4000
            pts.append(((iy_ + .5) * riwayat_petak.DERAJAT, (ix_ + .5) * riwayat_petak.DERAJAT))
            ms.append(v)
    gambut = {}

    def per_kab(kk, ix):
        cd = cincin_desa(ix)
        if not cd:
            return
        allr = [r for rs in cd.values() for r in rs]
        x0, x1 = min(p[0] for r in allr for p in r), max(p[0] for r in allr for p in r)
        y0, y1 = min(p[1] for r in allr for p in r), max(p[1] for r in allr for p in r)
        if not g.sentuh(x0, y0, x1, y1):
            return
        for kd, rs in cd.items():
            xs = [p[0] for r in rs for p in r]
            ys = [p[1] for r in rs for p in r]
            if not g.sentuh(min(xs), min(ys), max(xs), max(ys)):
                gambut[kd] = 0.0                       # dihitung: tak ada poligon gambut yang menyentuh kotak desa
                continue
            sm = sampel(rs)
            gambut[kd] = round(sum(1 for x, y in sm if g.di(x, y)) / len(sm), 2)

    hasil = petakan(pts, desa, per_kab=per_kab)
    tahun, tanpa = {}, 0
    for kd, m in zip(hasil, ms):
        if kd is None:
            tanpa += 1
            continue
        t = tahun.setdefault(kd, [0, 0])
        t[0] = max(t[0], pop(m))
        t[1] = max(t[1], m.bit_length() - 1 + TH0)
    # pin desa berulang dihitung dari cincin kab (butuh muat ulang bila per_kab melewati kab tanpa gambut)
    return tahun, gambut, tanpa, len(pts), time.time() - t0


def pin_statik(desa, tahun):
    kk_kds = collections.defaultdict(list)
    for kd in tahun:
        kk_kds[kd[:5]].append(kd)
    for kk, kds in kk_kds.items():
        cd = cincin_desa(desa.muat(kk))
        for kd in kds:
            if kd in cd:
                x, y = titik_dalam(cd[kd])
                tahun[kd] += [round(x, 3), round(y, 3)]
        desa.berkas.pop(kk, None)


def jalan_statik():
    cari = json.load(open(os.path.join(DATA, "desa_cari.json")))
    desa = Desa(cari)
    g = Gambut(json.load(open(os.path.join(DATA, "lahan/gambut.geojson"))))
    petak = riwayat_petak.Petak()
    tahun, gambut, tanpa, n_petak, dtk = statik(desa, g, petak)
    t1 = time.time()
    pin_statik(desa, tahun)
    out = {"dibuat": dt.datetime.now(WIB).strftime("%Y-%m-%d"), "metode": "petak_terbanyak",
           "tahun": dict(sorted(tahun.items())), "gambut": dict(sorted(gambut.items())),
           "meta": {"petak_ge3": n_petak, "petak_tanpa_desa": tanpa, "desa_ge3": len(tahun), "desa_gambut": len(gambut)}}
    tulis(STATIK, out)
    print("statik: %d petak >=3 tahun (%d tanpa desa), %d desa, gambut %d desa, %.0f s + pin %.0f s, %.0f KB"
          % (n_petak, tanpa, len(tahun), len(gambut), dtk, time.time() - t1, os.path.getsize(STATIK) / 1024))


def tulis(path, obj):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with tempfile.NamedTemporaryFile("w", dir=os.path.dirname(path), delete=False, suffix=".tmp", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, separators=(",", ":"))
    os.replace(f.name, path)


def baca(path):
    try:
        return json.load(open(path, encoding="utf-8"))
    except Exception:
        return None


def jalan():
    hs = baca(os.path.join(DATA, "hotspot.json"))
    if not hs:
        print("::warning title=desa_waspada::hotspot.json tak terbaca; berkas lama dibiarkan")
        return
    cari = json.load(open(os.path.join(DATA, "desa_cari.json")))
    t0 = time.time()
    out = susun(hs, Desa(cari), cari, baca(STATIK), baca(os.path.join(AKAR, "public/prediksi/data/prediksi.json")),
                baca(os.path.join(AKAR, "public/prediksi/data/skor.json")), baca(LAJU), dt.datetime.now(WIB))
    tulis(KELUAR, out)
    print("desa_waspada: A %d desa (%d baris), B %d desa (%d baris), %d titik tanpa desa, laju %s, %.0f KB, %.1f s"
          % (out["a"]["total"], len(out["a"]["baris"]), out["b"]["total"], len(out["b"]["baris"]), out["a"]["tanpa_desa"],
             out["laju"]["status"], os.path.getsize(KELUAR) / 1024, time.time() - t0))


# ---- hindcast lokal ----
def jarak_batas_m(lon, lat, r):
    """Jarak terdekat (m) titik ke sisi cincin; hampiran bidang datar lokal."""
    ky, kx = 111320.0, 111320.0 * math.cos(math.radians(lat))
    m = 1e18
    for (ax, ay), (bx, by) in zip(r, r[1:] + r[:1]):
        dx, dy = (bx - ax) * kx, (by - ay) * ky
        px, py = (lon - ax) * kx, (lat - ay) * ky
        L = dx * dx + dy * dy
        t = 0 if L == 0 else max(0, min(1, (px * dx + py * dy) / L))
        m = min(m, math.hypot(px - t * dx, py - t * dy))
    return m


def kelompok(minggu, tahun, universe):
    """minggu {kd: set(minggu)}, tahun {kd: n tahun 2012-2022} -> {a, b, lain, tak_pernah: {n, ya, laju, wilson}} (laju minggu berikutnya)."""
    c = {k: [0, 0] for k in ("a", "b", "lain", "tak_pernah")}
    for kd in universe:
        ws, th = minggu.get(kd, ()), tahun.get(kd, 0)
        for w in range(MINGGU - 1):
            ya = (w + 1) in ws
            if w in ws:
                g = ("a",)
            else:
                g = ("b",) if th >= MIN_TAHUN else ("lain",)
                if th == 0:
                    g += ("tak_pernah",)
            for k in g:
                c[k][0] += 1
                c[k][1] += ya
    return {k: ({"n": n, "ya": y, "laju": round(y / n, 4), "wilson": wilson(y, n)} if n else None) for k, (n, y) in c.items()}


def vonis(k):
    a, b, l = k["a"], k["b"], k["lain"]
    if not (a and b and l):
        return {"lulus": False, "alasan": "penyebut kosong"}
    s = []
    if a["laju"] < AMBANG["a_kali"] * l["laju"]:
        s.append("laju A < %d x lain" % AMBANG["a_kali"])
    if b["laju"] < AMBANG["b_kali"] * l["laju"]:
        s.append("laju B < %d x lain" % AMBANG["b_kali"])
    if a["n"] < AMBANG["n_min"] or b["n"] < AMBANG["n_min"]:
        s.append("n < %d" % AMBANG["n_min"])
    if a["wilson"][0] <= l["laju"] or b["wilson"][0] <= l["laju"]:
        s.append("batas bawah Wilson <= laju lain")
    return {"lulus": not s, "alasan": "; ".join(s) or "semua ukuran terpenuhi"}


def vonis_strata(kq):
    """kq {K1..K4: {a, b, lain}} -> (lulus, {K: alasan}). Tiap kuartil: n >= 200 (A, B, lain), A > lain, B > lain, Wilson tak bersinggungan."""
    ok, ket = True, {}
    for q, k in sorted(kq.items()):
        a, b, l = k["a"], k["b"], k["lain"]
        s = []
        if not (a and b and l):
            s.append("penyebut kosong")
        else:
            if min(a["n"], b["n"], l["n"]) < AMBANG["n_min"]:
                s.append("n < %d" % AMBANG["n_min"])
            if a["laju"] <= l["laju"] or b["laju"] <= l["laju"]:
                s.append("laju A atau B tidak di atas lain")
            if a["wilson"][0] <= l["wilson"][1] or b["wilson"][0] <= l["wilson"][1]:
                s.append("selang Wilson A atau B menyentuh lain")
        ket[q] = "; ".join(s) or "terpenuhi"
        ok = ok and not s
    return ok, ket


def baca_csv(path, satelit):
    """Titik unik per petak dan minggu: {(kunci, minggu)} dan {kunci: (lat, lon)}."""
    ind, _ = titik_palsu.sel_industri()
    d0 = dt.date(MUSIM, 7, 1)
    ada, pos, buang = set(), {}, 0
    with open(path) as f:
        for r in csv.DictReader(f):
            if r["type"] != "0" or r["confidence"] not in ("n", "h") or r["satellite"] != satelit:
                continue
            tgl = dt.date.fromisoformat(r["acq_date"])
            w = (tgl - d0).days // 7
            if not (0 <= w < MINGGU) or tgl.month > 10:
                continue
            la, lo = float(r["latitude"]), float(r["longitude"])
            if titik_palsu.sel(la, lo) in ind:
                buang += 1
                continue
            k = riwayat_petak.kunci(la, lo)
            ada.add((k, w))
            pos[k] = (la, lo)
    return ada, pos, buang


def jalan_laju():
    t0 = time.time()
    cari = json.load(open(os.path.join(DATA, "desa_cari.json")))
    desa = Desa(cari)
    pk = riwayat_petak.Petak()
    mask22 = (1 << (2022 - TH0 + 1)) - 1
    pts, ms = [], []
    for k, v in zip(pk.k, pk.v):
        if v & mask22:
            pts.append(((k % 10000 - 4000 + .5) * riwayat_petak.DERAJAT, (k // 10000 - 1000 + .5) * riwayat_petak.DERAJAT))
            ms.append(v & mask22)
    n_riw = len(pts)
    ada_s, pos_s, buang_s = baca_csv(os.path.join(AKAR, "data/raw/firms/viirs_2023.csv"), "N")
    ada_n, pos_n, buang_n = baca_csv(os.path.join(AKAR, "data/raw/firms/viirs_n20_2023.csv"), "N20")
    ks, kn = sorted(pos_s), sorted(pos_n)
    pts += [pos_s[k] for k in ks] + [pos_n[k] for k in kn]
    perlu = set(range(n_riw, n_riw + len(ks)))
    batas = [0, 0]
    luas, universe = {}, set()

    def bila(i, kd, r):
        if i in perlu:
            batas[0] += 1
            la, lo = pts[i]
            batas[1] += jarak_batas_m(lo, la, r) <= JARAK_BATAS_M

    def per_kab(kk, ix):
        for kd, rs in cincin_desa(ix).items():
            universe.add(kd)
            luas[kd] = sum(abs(sum(a[0] * b[1] - b[0] * a[1] for a, b in zip(r, r[1:] + r[:1]))) / 2 for r in rs)

    hasil = petakan(pts, desa, per_kab=per_kab, bila=bila)
    print("hindcast: %d petak riwayat, %d titik S-NPP, %d N20 dipetakan, %d desa, %.0f s" % (n_riw, len(ks), len(kn), len(universe), time.time() - t0))
    tmax, tor = collections.defaultdict(int), collections.defaultdict(int)
    for kd, m in zip(hasil[:n_riw], ms):
        if kd:
            tmax[kd] = max(tmax[kd], pop(m))
            tor[kd] |= m

    def minggu(ada, ofs, kunci):
        idx = {k: hasil[ofs + i] for i, k in enumerate(kunci)}
        out = collections.defaultdict(set)
        for k, w in ada:
            if idx.get(k):
                out[idx[k]].add(w)
        return out

    ws, wn = minggu(ada_s, n_riw, ks), minggu(ada_n, n_riw + len(ks), kn)
    t_or = {kd: pop(m) for kd, m in tor.items()}
    res = {"snpp": kelompok(ws, tmax, universe), "noaa20": kelompok(wn, tmax, universe), "metode_alt": kelompok(ws, t_or, universe)}
    out = {"dasar": "persen desa-minggu yang punya titik VIIRS (n/h, type 0, bukan sumber tetap) minggu berikutnya, musim kering 2023 (1 Jul sampai 27 Okt), riwayat desa 2012-2022 saja",
           "musim": MUSIM, "dibuat": dt.datetime.now(WIB).strftime("%Y-%m-%d"),
           "kriteria": dict(AMBANG, ket="[SEMENTARA, Q2] dikunci di RENCANA-UJI §2 sebelum run pertama; lulus atas ambang ini = lulus_sementara"),
           "hasil": {}, "desa": {"universe": len(universe), "tanpa_riwayat": sum(1 for d in universe if tmax.get(d, 0) == 0),
                                 "ge3_petak_terbanyak": sum(1 for d in universe if tmax.get(d, 0) >= MIN_TAHUN),
                                 "ge3_tahun_berbeda": sum(1 for d in universe if t_or.get(d, 0) >= MIN_TAHUN)}}
    ls = sorted(luas[d] for d in universe)
    qs = [ls[len(ls) * i // 4] for i in (1, 2, 3)]
    kuar = {kd: "K%d" % (bisect.bisect_right(qs, luas[kd]) + 1) for kd in universe}
    mw = {"snpp": (ws, tmax), "noaa20": (wn, tmax), "metode_alt": (ws, t_or)}
    for nm, k in res.items():
        v = vonis(k)
        kq = {q: kelompok(mw[nm][0], mw[nm][1], [kd for kd in universe if kuar[kd] == q]) for q in ("K1", "K2", "K3", "K4")}
        okq, ket = vonis_strata(kq)
        v["lulus_total"] = v["lulus"] and okq
        out["hasil"][nm] = {"kelompok": k, "vonis": v, "per_kuartil_luas": kq, "vonis_kuartil": {"lulus": okq, "per_kuartil": ket}}
    out["status"] = "lulus_sementara" if all(v["vonis"]["lulus_total"] for v in out["hasil"].values()) else "gagal"
    out["batas_kuartil_luas_deg2"] = [round(x, 8) for x in qs]
    out["batas_penempatan"] = {"titik": batas[0], "dalam_200m_dari_batas": batas[1],
                               "persen": round(100 * batas[1] / batas[0], 1) if batas[0] else None}
    out["titik_industri_dibuang"] = {"snpp": buang_s, "noaa20": buang_n}
    out["catatan"] = ["Desa-minggu beruntun berkorelasi: selang Wilson terlalu sempit (seperti peluang_karhutla.py).",
                      "Kelompok A condong ke desa luas yang hampir selalu punya titik; lihat per_kuartil_luas.",
                      "Kelompok lain dan tak_pernah bertumpuk (tak_pernah bagian dari lain) dan tidak dijumlah.",
                      "Riwayat desa dari S-NPP 2012-2022 untuk ketiga hasil; hanya kelompok titik minggu yang beda (S-NPP, NOAA-20).",
                      "Hindcast memakai SATU sensor per run (S-NPP atau NOAA-20) dengan riwayat S-NPP, sedangkan daftar produksi menjumlah N, N20, N21 dalam 168 jam: laju hindcast bukan laju daftar produksi.",
                      "Selang Wilson terlalu sempit karena desa-minggu beruntun berkorelasi (n efektif jauh lebih kecil dari n).",
                      "Stratifikasi per kuartil luas desa ditambah SETELAH run pertama dilihat, atas saran pemeriksa (RENCANA-UJI §2, tambahan bertanggal).",
                      "Angka ambang 3x, 2x, 200 tebakan perancang (Q2 belum dijawab): lulus_sementara tetap berpil hipotesis."]
    tulis(LAJU, out)
    print(json.dumps({"status": out["status"], **{k: [v["vonis"], v["vonis_kuartil"]] for k, v in out["hasil"].items()}}, ensure_ascii=False, indent=1))
    print("selesai %.0f s" % (time.time() - t0))


# ---- uji ----
def uji():
    # wilson
    assert wilson(0, 0) is None and wilson(0, 50)[0] == 0.0 and wilson(50, 50)[1] == 1.0
    assert kab4("11.01.01.2001") == "1101"
    with tempfile.TemporaryDirectory() as d:
        geo = os.path.join(d, "geo")
        os.makedirs(geo)
        sq = lambda x0, y0, x1, y1: [[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]]   # noqa: E731
        fs = [{"type": "Feature", "properties": {"kd": "11.01.01.2001"}, "geometry": {"type": "Polygon", "coordinates": [sq(95.0, 4.0, 95.1, 4.1)]}},
              {"type": "Feature", "properties": {"kd": "11.01.01.2002"}, "geometry": {"type": "Polygon", "coordinates": [sq(95.1, 4.0, 95.2, 4.1)]}},
              {"type": "Feature", "properties": {"kd": "11.01.01.2003"}, "geometry": {"type": "Polygon", "coordinates": [sq(95.0, 4.1, 95.0005, 4.1005)]}}]  # lebih kecil dari kisi
        json.dump({"type": "FeatureCollection", "features": fs}, open(os.path.join(geo, "11.01.json"), "w"))
        cari = {"kab": {"11.01": "Aceh Barat"}, "baris": [["11.01.01.2001", "Desa A", "Kec X"], ["11.01.01.2002", "Desa B", "Kec X"], ["11.01.01.2003", "Desa C", "Kec X"]]}
        desa = Desa(cari, geo=geo)
        W = ["11|Aceh Barat|Kec X", "11|Laut|Kec Z"]
        # baris: lat, lon, jam, sensor, frp, keyakinan(0/1/2), wilayah, tgl_wib
        hs = {"acuan": "2026-11-24T05:00:00+00:00", "wilayah": W, "baris": [
            [4.05, 95.05, -1.0, "N", 3.0, 1, 0, "11-24"],        # desa A, masuk
            [4.05, 95.05, -2.0, "N20", 3.0, 2, 0, "11-24"],      # petak dan hari WIB sama: dihitung 1
            [4.0500, 95.0501, -2.0, "N", 3.0, 1, 0, "11-23"],    # petak sama, hari beda: 2
            [4.05, 95.05, -5.0, "M", 3.0, 1, 0, "11-24"],        # MODIS: tidak
            [4.06, 95.06, -5.0, "N21", 3.0, 0, 0, "11-24"],      # keyakinan rendah: tidak
            [4.05, 95.15, -168.0, "N21", 3.0, 1, 0, "11-17"],    # desa B, tepat -168: masuk
            [4.06, 95.16, -168.1, "N21", 3.0, 1, 0, "11-17"],    # -168,1: tidak
            [4.07, 95.17, -24.0, "N", 3.0, 1, 0, "11-23"],       # desa B, titik24
            [4.08, 95.18, -24.1, "N", 3.0, 1, 0, "11-23"],       # desa B, bukan titik24
            [9.0, 96.0, -3.0, "N", 3.0, 1, 1, "11-24"],          # kab tak dikenal: tanpa desa
            [4.095, 95.095, -3.0, "N", 3.0, 2, 0, "11-24"],      # sel luar poligon A... tetap A (di dalam 95.0-95.1)
        ]}
        agg, tanpa = daftar_a(hs, desa)
        # 2001: petak-hari (11-24 gabungan dua baris), (11-23), (4.095): 3 titik, semua dalam 24 jam; MODIS dan keyakinan rendah tidak dihitung
        assert agg["11.01.01.2001"][:2] == [3, 3], agg
        # 2002: -168,0 masuk, -168,1 tidak, -24,0 masuk titik24, -24,1 tidak
        assert agg["11.01.01.2002"][:2] == [3, 1], agg
        assert tanpa == 1, tanpa
        # statik fixture lewat riwayat_petak.simpan (format nyata)
        m = {}
        for y in (2012, 2015, 2019):      # petak desa B: 3 tahun
            m[riwayat_petak.kunci(4.05, 95.15)] = m.get(riwayat_petak.kunci(4.05, 95.15), 0) | 1 << (y - TH0)
        m[riwayat_petak.kunci(4.07, 95.07)] = 0b11    # desa A: 2 tahun
        pf = os.path.join(d, "p.bin")
        riwayat_petak.simpan(m, pf)
        pk = riwayat_petak.Petak(pf)
        gj = {"features": [{"type": "Feature", "properties": {}, "geometry": {"type": "Polygon", "coordinates": [sq(95.1, 4.0, 95.2, 4.05)]}}]}
        tahun, gambut, tanpa_p, n_p, _ = statik(desa, Gambut(gj), pk)
        assert tahun == {"11.01.01.2002": [3, 2019]}, tahun
        assert gambut["11.01.01.2001"] == 0.0 and 0.4 <= gambut["11.01.01.2002"] <= 0.6, gambut   # separuh bawah desa B
        assert "11.01.01.2003" in gambut and gambut["11.01.01.2003"] == 0.0
        pin_statik(desa, tahun)
        assert len(tahun["11.01.01.2002"]) == 4
        # kecil dari kisi: n = 1
        assert len(sampel([sq(95.0, 4.1, 95.0005, 4.1005)])) == 1
        # prediksi: kab tak ada -> null; basi -> semua null
        now = dt.datetime(2026, 11, 24, 12, 0, tzinfo=WIB)
        pred = {"dibuat": "2026-11-24T10:00:00+07:00", "kab": [{"id": "1101", "API": [[0.03, 0], [0.5, 0], [0.126, 0]]}]}
        pel, st = peluang_kab(pred, now)
        assert st == "ok" and pel["1101"] == [3, 50, 13], pel
        assert peluang_kab(dict(pred, dibuat="2026-11-22T10:00:00+07:00"), now) == ({}, "basi")
        st_ = {"tahun": tahun, "gambut": gambut}
        # B: tahun 3, 0 titik: harus ada bila tak ada di A. Desa B muncul di A di fixture, jadi hapus titiknya
        hs2 = dict(hs, baris=[b for b in hs["baris"] if b[1] < 95.1])
        skor = {"kode": {"API": {"status": "dinilai"}}}
        o = susun(hs2, Desa(cari, geo=geo), cari, st_, pred, skor, None, now)
        kd_b = [r[0] for r in o["b"]["baris"]]
        assert kd_b == ["11.01.01.2002"] and o["b"]["baris"][0][5:8] == [0, 0, None], o["b"]
        ra = {r[0]: r for r in o["a"]["baris"]}["11.01.01.2001"]
        assert ra[8] is None and ra[11:14] == [3, 50, 13] and ra[10] == 0.0       # tahun null (kurang dari 3), bukan 0
        assert o["laju"]["status"] == "belum" and o["peluang"]["status"] == "dinilai" and o["peluang"]["ket"].endswith("bukan desa")
        o2 = susun(hs2, Desa(cari, geo=geo), cari, st_, None, None, None, now)
        assert o2["peluang"]["status"] == "tak ada" and all(r[11:14] == [None] * 3 for r in o2["a"]["baris"])
        o3 = susun(hs2, Desa(cari, geo=geo), cari, None, pred, skor, None, now)
        assert o3["b"]["baris"] == [] and any("statik" in x for x in o3["batasan"])
        # potong B: 301 desa satu provinsi -> 300
        st301 = {"tahun": {"11.01.01.%04d" % i: [3, 2019, 95.0, 4.0] for i in range(5000, 5301)}, "gambut": {}}
        o4 = susun(hs2, Desa(cari, geo=geo), cari, st301, None, None, None, now)
        assert o4["a"]["total_per_prov"] == {"11": 1} and o4["a"]["terpotong_per_prov"] == {} and o4["b"]["total_per_prov"] == {"11": 301}
        assert len(o4["b"]["baris"]) == 300 and o4["b"]["terpotong_per_prov"] == {"11": 1} and o4["b"]["total"] == 301
        # idempoten
        o5 = susun(hs2, Desa(cari, geo=geo), cari, st_, pred, skor, None, now)
        assert json.dumps(o, sort_keys=True) == json.dumps(o5, sort_keys=True)
        # kata terlarang dan titik individual
        teks = json.dumps(o, ensure_ascii=False).lower()
        assert not re.search(r"pelaku|penyebab|bebas api|\baman\b|·", teks)
        # hindcast: kelompok dan vonis
        un = ["x%d" % i for i in range(400)]
        mg = {u: set(range(MINGGU)) if i < 200 else ({0, 2} if i < 300 else set()) for i, u in enumerate(un)}
        th = {u: 0 if i >= 300 else 4 for i, u in enumerate(un)}
        k = kelompok(mg, th, un)
        assert (k["b"]["n"], k["b"]["ya"]) == (1400, 100) and (k["tak_pernah"]["n"], k["tak_pernah"]["ya"]) == (1600, 0), k
        assert k["tak_pernah"]["wilson"][0] == 0.0 and k["lain"]["n"] == 1600 and vonis(k)["lulus"] is True
        k["lain"] = dict(k["lain"], laju=0.5)
        assert vonis(k)["lulus"] is False
        sk = {"K1": k}
        assert vonis_strata(dict(sk, K1=dict(k, lain=dict(k["lain"], laju=0.5))))[0] is False
        assert vonis_strata({"K1": dict(k, a=dict(k["a"], n=10))})[0] is False
        assert vonis_strata({"K1": dict(k, lain=None)})[0] is False
        assert jarak_batas_m(95.05, 4.05, sq(95.0, 4.0, 95.1, 4.1)[:-1]) > 5000
    print("desa_waspada uji: OK")


if __name__ == "__main__":
    a = sys.argv[1:]
    if a == ["--uji"]:
        uji()
    elif a == ["statik"]:
        jalan_statik()
    elif a == ["laju"]:
        jalan_laju()
    else:
        jalan()
