"""Relief ratio per DAS Sumatra lawan banjir bandang DIBI. Protokol beku: scripts/banjir/PRAREG-RELIEF.md.

Pakai:  python3 scripts/banjir/relief_das.py uji      # uji fungsi murni (luring)
        python3 scripts/banjir/relief_das.py jalan    # satu kali jalan sesuai pra-registrasi -> public/banjir/data/lab/relief_das.json + _ringkas.md
Mentah: data/raw/banjir/relief/ (zip HydroBASINS level 7 'au', cache elevasi elev.json; gitignored). Python stdlib saja.
"""
import collections, json, math, os, random, sys, time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from umum import KELUAR, MENTAH, simpan, ambil
from wilayah import AKAR

sys.path.insert(0, os.path.join(AKAR, "scripts/scrape"))
import lahan as L  # noqa: E402  (baca_shp)
import label_bersatu as LB  # noqa: E402  (Kunci)

DIR = os.path.join(MENTAH, "relief")
ZIP = os.path.join(DIR, "hybas_au_lev07_v1c.zip")
CACHE = os.path.join(DIR, "elev.json")
OUT = os.path.join(KELUAR, "lab")
MIN_KM2, N_MIN, N_MAKS = 200, 24, 30
RIWAYAT, UJI = ("2018-01-01", "2021-12-31"), ("2022-01-01", "2026-10-31")
PROV_SUMATRA = {"11", "12", "13", "14", "15", "16", "17", "18"}
N_BOOT, BIJI = 5000, 11
URL = "https://api.open-meteo.com/v1/elevation?latitude={}&longitude={}"


# ---------------------------------------------------------------- murni
def di_dalam(x, y, rings):
    c = False
    for r in rings:
        for (x1, y1), (x2, y2) in zip(r, r[1:] + r[:1]):
            if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1) + x1:
                c = not c
    return c


def haversine(a, b):
    p1, p2 = math.radians(a[1]), math.radians(b[1])
    h = math.sin((p2 - p1) / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(math.radians(b[0] - a[0]) / 2) ** 2
    return 12742 * math.asin(math.sqrt(h))


def hull(pts):
    pts = sorted(set(pts))
    if len(pts) < 3:
        return pts
    def half(p):
        h = []
        for q in p:
            while len(h) >= 2 and (h[-1][0] - h[-2][0]) * (q[1] - h[-2][1]) - (h[-1][1] - h[-2][1]) * (q[0] - h[-2][0]) <= 0:
                h.pop()
            h.append(q)
        return h[:-1]
    return half(pts) + half(pts[::-1])


def feret_km(rings):
    h = hull([p for r in rings for p in r])
    return max(haversine(a, b) for i, a in enumerate(h) for b in h[i + 1:])


def titik_cuplik(rings):
    """kisi segi-empat berisi 24-30 titik di dalam poligon (deterministik); bila langkah terbaik tetap > 30, menipis merata"""
    xs = [p[0] for r in rings for p in r]; ys = [p[1] for r in rings for p in r]
    x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
    luas = (x1 - x0) * (y1 - y0)
    s = math.sqrt(luas / 60)
    terbaik = []
    for _ in range(40):
        pts = [(round(x0 + (i + .5) * s, 4), round(y0 + (j + .5) * s, 4))
               for i in range(int((x1 - x0) / s) + 1) for j in range(int((y1 - y0) / s) + 1)]
        pts = [p for p in pts if di_dalam(p[0], p[1], rings)]
        if len(pts) >= N_MIN and len(pts) <= N_MAKS:
            return pts
        if len(pts) > N_MAKS:
            terbaik = pts
            s *= 1.08
        else:
            if terbaik:
                break
            s *= .93
    if len(terbaik) > N_MAKS:
        langkah = len(terbaik) / N_MAKS
        terbaik = [terbaik[int(k * langkah)] for k in range(N_MAKS)]
    return terbaik or pts


def relief(elev, lb_km):
    return (max(elev) - min(elev)) / (lb_km * 1000) if elev and lb_km > 0 else None


def auc(skor, y):
    """Mann-Whitney, seri setengah; None bila satu kelas kosong"""
    n1 = sum(y); n0 = len(y) - n1
    if n1 == 0 or n0 == 0:
        return None
    urut = sorted(range(len(y)), key=lambda i: skor[i])
    rank = [0.0] * len(y); i = 0
    while i < len(urut):
        j = i
        while j + 1 < len(urut) and skor[urut[j + 1]] == skor[urut[i]]:
            j += 1
        for k in range(i, j + 1):
            rank[urut[k]] = (i + j) / 2 + 1
        i = j + 1
    return (sum(r for r, t in zip(rank, y) if t) - n1 * (n1 + 1) / 2) / (n1 * n0)


def persen(v, q):
    v = sorted(v)
    return v[min(len(v) - 1, max(0, int(round(q * (len(v) - 1)))))]


def bootstrap(skor, y, blok, kunci_baik, n=N_BOOT, biji=BIJI):
    """skor: {nama: [..]}; resampel blok; kembalikan {nama: (lo,hi)} dan dAUC relief - kunci_baik"""
    rng = random.Random(biji)
    grup = collections.defaultdict(list)
    for i, b in enumerate(blok):
        grup[b].append(i)
    bl = list(grup.values())
    hasil = collections.defaultdict(list); d = []; lewat = 0
    for _ in range(n):
        idx = [i for b in (rng.choice(bl) for _ in bl) for i in b]
        yy = [y[i] for i in idx]
        a = {k: auc([v[i] for i in idx], yy) for k, v in skor.items()}
        if any(x is None for x in a.values()):
            lewat += 1; continue
        for k, x in a.items():
            hasil[k].append(x)
        d.append(a["relief"] - a[kunci_baik])
    return {k: (persen(v, .025), persen(v, .975)) for k, v in hasil.items()}, (persen(d, .025), persen(d, .975)), lewat


def vonis(pos, neg, blok_pos, a_rel, d_pt, d_lo, d_hi):
    if pos < 15 or neg < 15 or blok_pos < 8:
        return "belum cukup data"
    if d_lo > 0 and a_rel >= 0.60:
        return "LULUS"
    if d_pt <= 0 or d_hi < 0:
        return "TIDAK LULUS"
    return "TIDAK MEYAKINKAN"


def sisi_sumatra(cx, cy):
    if not (95.0 <= cx <= 106.2 and -6.0 <= cy <= 5.9):
        return False
    if cx >= 99.3 and cy >= 4.5 - 0.9 * (cx - 99.0):
        return False
    if cx > 105.0 and cy > -3.5:
        return False
    if cx > 103.7 and cy > -1.2:
        return False
    return True


# ---------------------------------------------------------------- data
def elevasi(titik):
    cache = json.load(open(CACHE)) if os.path.exists(CACHE) else {}
    kunci = lambda p: f"{p[1]},{p[0]}"
    perlu = [p for p in titik if kunci(p) not in cache]
    for i in range(0, len(perlu), 100):
        b = perlu[i:i + 100]
        r = ambil(URL.format(",".join(str(p[1]) for p in b), ",".join(str(p[0]) for p in b)))
        for p, e in zip(b, r["elevation"]):
            cache[kunci(p)] = e
        simpan(CACHE, cache)
        time.sleep(1.5)
    return cache, kunci


def muat_das():
    das = []
    for p, r in L.baca_shp(ZIP):
        if not r:
            continue
        xs = [q[0] for q in r[0]]; ys = [q[1] for q in r[0]]
        if sisi_sumatra(sum(xs) / len(xs), sum(ys) / len(ys)) and float(p["sub_area"]) >= MIN_KM2:
            das.append({"id": p["hybas_id"], "main": p["main_bas"], "km2": float(p["sub_area"]), "rings": r})
    return das


def muat_label(kec_kab):
    semesta = {k for k in kec_kab.values()}
    Kn = LB.Kunci(semesta)
    uji, riw = set(), collections.Counter()
    for jenis, prov, kab, tgl, kj in json.load(open(os.path.join(MENTAH, "dibi_tanggal.json"))):
        if prov not in PROV_SUMATRA or kj < 1 or not any("bandang" in j for j in jenis):
            continue
        k = Kn.cocok(f"{prov}|{kab}")
        if k is None:
            continue
        if UJI[0] <= tgl <= UJI[1]:
            uji.add(k)
        elif RIWAYAT[0] <= tgl <= RIWAYAT[1]:
            riw[(k, tgl)] = 1
    hist = collections.Counter(k for k, _ in riw)
    return uji, hist


def jalan():
    das = muat_das()
    pusat = json.load(open(os.path.join(AKAR, "public/banjir/data/pusat_kec.json")))
    kec_kab = {k: "|".join(k.split("|")[:2]) for k in pusat}
    uji_kab, hist_kab = muat_label(kec_kab)
    grid = json.load(open(os.path.join(AKAR, "public/data/penduduk.json")))["grid"]
    semua = {}
    for d in das:
        d["cuplik"] = titik_cuplik(d["rings"])
        for p in d["cuplik"]:
            semua[p] = 1
    print(f"DAS Sumatra {len(das)}; titik elevasi {len(semua)}", flush=True)
    cache, kunci = elevasi(list(semua))
    baris, tanpa_kec = [], 0
    for d in das:
        el = [cache[kunci(p)] for p in d["cuplik"] if cache.get(kunci(p)) is not None]
        kk = [kec_kab[k] for k, (la, lo) in pusat.items() if di_dalam(lo, la, d["rings"])]
        if not kk or len(el) < 10:
            tanpa_kec += 1; continue
        n = len(kk); c = collections.Counter(kk)
        lb = feret_km(d["rings"])
        baris.append({
            "id": d["id"], "main": d["main"], "km2": d["km2"], "n_titik": len(el), "hmax": max(el), "hmin": min(el), "lb_km": round(lb, 1),
            "relief": relief(el, lb), "pos": int(any(k in uji_kab for k in c)),
            "riwayat": sum(hist_kab.get(k, 0) * v / n for k, v in c.items()),
            "penduduk": sum(g[2] for g in grid if di_dalam(g[1], g[0], d["rings"])), "n_kec": n})
    y = [b["pos"] for b in baris]
    skor = {"relief": [b["relief"] for b in baris], "luas": [b["km2"] for b in baris],
            "riwayat": [b["riwayat"] for b in baris], "penduduk": [b["penduduk"] for b in baris]}
    a = {k: auc(v, y) for k, v in skor.items()}
    baik = max(("luas", "riwayat", "penduduk"), key=lambda k: a[k])
    sel, dsel, lewat = bootstrap(skor, y, [b["main"] for b in baris], baik)
    d_pt = a["relief"] - a[baik]
    blok_pos = len({b["main"] for b in baris if b["pos"]})
    v = vonis(sum(y), len(y) - sum(y), blok_pos, a["relief"], d_pt, dsel[0], dsel[1])
    hasil = {"protokol": "scripts/banjir/PRAREG-RELIEF.md", "tingkat": "HydroBASINS v1c level 7 (au)", "elevasi": "Copernicus GLO-90 via Open-Meteo, 24-30 titik per DAS",
             "n_das": len(baris), "tanpa_kecamatan_atau_elevasi": tanpa_kec, "positif": sum(y), "negatif": len(y) - sum(y), "blok_positif": blok_pos,
             "auc": a, "selang95": sel, "pembanding_terbaik": baik, "dAUC": d_pt, "dAUC_selang95": dsel, "bootstrap_dilewati": lewat, "vonis": v, "das": baris}
    simpan(os.path.join(OUT, "relief_das.json"), hasil)
    tulis_ringkas(hasil)
    print(json.dumps({k: hasil[k] for k in hasil if k != "das"}, ensure_ascii=False, indent=1))


def koma(x, d=2):
    return f"{x:.{d}f}".replace(".", ",")


def tulis_ringkas(h):
    s = h["selang95"]
    f = lambda k: f"{koma(h['auc'][k])} (selang 95% {koma(s[k][0])} sampai {koma(s[k][1])})"
    top = sorted(h["das"], key=lambda b: -b["relief"])[:5]
    t = f"""# Relief ratio DAS Sumatra lawan banjir bandang (uji 25 November 2026)

Vonis: **{h['vonis']}**.

Dihitung dari {h['n_das']} sub-DAS (HydroBASINS level 7); {h['positif']} di kabupaten yang tercatat bandang di DIBI 2022 sampai Oktober 2026, {h['negatif']} tidak. {h['tanpa_kecamatan_atau_elevasi']} sub-DAS tidak ikut karena tak punya titik pusat kecamatan atau elevasi cukup.

Kekuatan pembeda (AUC, 0,5 berarti sama dengan menebak):

- relief ratio: {f('relief')}
- luas DAS: {f('luas')}
- riwayat bandang kabupaten 2018 sampai 2021: {f('riwayat')}
- jumlah penduduk: {f('penduduk')}

Selisih relief ratio terhadap pembanding terbaik ({h['pembanding_terbaik']}): {koma(h['dAUC'])}, selang 95% {koma(h['dAUC_selang95'][0])} sampai {koma(h['dAUC_selang95'][1])}. Syarat lulus: batas bawah di atas 0 dan AUC relief minimal 0,60.

Relief ratio tertinggi (bukan vonis rawan): {", ".join(f"{b['id']} ({koma(b['relief'] * 100, 1)} persen)" for b in top)}.

Batas: elevasi hanya dari 24 sampai 30 titik per DAS sehingga puncak terukur terlalu rendah; panjang DAS = jarak terjauh dua simpul batas; label hanya sampai kabupaten, jadi semua DAS satu kabupaten ikut bertanda. Hasil tidak menyatakan DAS mana pun aman atau rawan, dan tidak ditampilkan di layar.
"""
    open(os.path.join(OUT, "relief_das_ringkas.md"), "w").write(t)


def uji():
    kotak = [[(0, 0), (0, 1), (1, 1), (1, 0)]]
    assert di_dalam(.5, .5, kotak) and not di_dalam(2, 2, kotak)
    assert abs(feret_km(kotak) - haversine((0, 0), (1, 1))) < 1e-6
    for ring in (kotak, [[(100, 0), (100, 3), (103, 3), (103, 0)]], [[(0, 0), (0, .08), (.9, .08), (.9, 0)]]):
        n = len(titik_cuplik(ring)); assert N_MIN <= n <= N_MAKS, n
    assert abs(relief([100, 1100, 500], 10) - 0.1) < 1e-9
    assert auc([1, 2, 3, 4], [0, 0, 1, 1]) == 1 and auc([1, 2, 3, 4], [1, 1, 0, 0]) == 0 and auc([1, 1, 1, 1], [0, 1, 0, 1]) == .5
    assert auc([1, 2], [1, 1]) is None
    assert vonis(5, 40, 9, .9, .1, .05, .2) == "belum cukup data"
    assert vonis(20, 40, 9, .7, .1, .02, .2) == "LULUS" and vonis(20, 40, 9, .7, -.1, -.2, .05) == "TIDAK LULUS"
    assert vonis(20, 40, 9, .7, .05, -.05, .2) == "TIDAK MEYAKINKAN"
    assert sisi_sumatra(98.7, 3.6) and not sisi_sumatra(100.8, 4.5) and not sisi_sumatra(106.1, -2.1) and sisi_sumatra(105.8, -5.5)
    rng = random.Random(1); y = [rng.random() < .3 for _ in range(60)]
    s = {"relief": [v + rng.random() for v in y], "luas": [rng.random() for _ in y]}
    sel, d, _ = bootstrap(s, y, [i // 4 for i in range(60)], "luas", n=200)
    assert sel["relief"][0] > .5 and d[0] < d[1]
    print("uji relief_das: ok")


if __name__ == "__main__":
    {"uji": uji, "jalan": jalan}[sys.argv[1] if len(sys.argv) > 1 else "uji"]()
