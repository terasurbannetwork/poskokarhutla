"""Uji balik GEOGloWS (PRAREG-GEOGLOWS.md): apakah debit simulasi >= T2 pada ruas sungai menandai kab-hari banjir berlabel?

BUKAN uji keterampilan ramalan: yang diuji deret RETROSPEKTIF GEOGloWS (simulasi ERA5, bukan ramalan terarsip). Sinyal hidrologinya diuji,
keterampilan ramalan 15 hari tidak. Stdlib, tanpa kunci. geoglows.py hanya diimpor (get, tidak disunting); T2 dibaca dari geoglows_ruas.json.

Pakai:  python3 scripts/banjir/uji_geoglows.py ambil   unduh deret harian 2015-12-01..2025-12-31 per ruas ke data/raw/banjir/geoglows/retro_<id>.json (aman diulang)
        python3 scripts/banjir/uji_geoglows.py nilai   skor SEKALI (penanda uji_geoglows.buka, O_EXCL) -> public/banjir/data/uji_geoglows.json
        python3 scripts/banjir/uji_geoglows.py uji     swa-uji tanpa jaringan
"""
import csv, datetime as dt, gzip, hashlib, json, math, os, random, sys
from collections import defaultdict

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from umum import KELUAR, MENTAH

AWAL, AKHIR = dt.date(2016, 1, 1), dt.date(2025, 12, 31)
FETCH_AWAL = "20151201"                      # 31 hari sebelum AWAL: tak dipakai skor, hanya jaga tepi
JENDELA, TINGGI_MIN = 2, 1.0                 # |anchor label - hari| <= 2 ; median historis >= 1 m3/s (aturan ruas_kecil geoglows.py)
BOOT, BIJI = 5000, 11
RUAS = os.path.join(os.path.dirname(os.path.abspath(__file__)), "geoglows_ruas.json")
LABEL = os.path.join(MENTAH, "label_bersatu_v2", "kab_hari.csv.gz")
CACHE = os.path.join(MENTAH, "geoglows")
OUT = os.path.join(KELUAR, "uji_geoglows.json")
BUKA = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uji_geoglows.buka")
POSITIF = {"TINGGI", "SEDANG"}


def sha(p):
    return hashlib.sha256(open(p, "rb").read()).hexdigest()


# ------------------------------------------------------------------ skor (murni)
def ets(a, b, c, n):
    ar = (a + b) * (a + c) / n if n else 0
    return (a - ar) / (a + b + c - ar) if a + b + c - ar > 0 else 0.0


def kont(sel):
    """sel [(alarm, y)] -> (a, b, c, n)."""
    a = sum(1 for al, y in sel if al and y)
    b = sum(1 for al, y in sel if al and not y)
    c = sum(1 for al, y in sel if not al and y)
    return a, b, c, len(sel)


def topk(skor, k):
    """skor {reach: tuple}; k alarm teratas (skor besar menang, seri dipecah kunci reach) -> set."""
    return set(sorted(skor, key=lambda r: (tuple(-x for x in skor[r]), r))[:k])


def susun_sel(deret, label, p0):
    """deret {(reach, kab): {date: 0/1}}, label {kab: set(anchor)} -> sel [(reach, kab, date, sig, clim, pers, y)]; alarm pembanding = top-K_d per hari."""
    sel, hari = [], defaultdict(list)
    for (r, k), per in deret.items():
        for d, s in per.items():
            hari[d].append((r, k, s))
    for d, L in sorted(hari.items()):
        kd = sum(s for _, _, s in L)
        pers = {r: ((1 if (d - dt.timedelta(1)) in label.get(k, ()) else 0), p0(r, d)) for r, k, _ in L}
        clim = {r: (p0(r, d),) for r, k, _ in L}
        ac, ap = topk(clim, kd), topk(pers, kd)
        for r, k, s in L:
            y = int(any((d + dt.timedelta(i)) in label.get(k, ()) for i in range(-JENDELA, JENDELA + 1)))
            sel.append((r, k, d, s, int(r in ac), int(r in ap), y))
    return sel


def boot(sel, kunci_blok, n=BOOT, biji=BIJI):
    """sel [(r,k,d,sig,clim,pers,y)]; kunci_blok(sel_i)->blok. -> dETS (sig-clim, sig-pers): titik dan daftar ulangan."""
    B = defaultdict(lambda: [[0] * 4 for _ in range(3)])      # blok -> 3 alarm x (a,b,c,n)
    for r, k, d, s, c, p, y in sel:
        for j, al in enumerate((s, c, p)):
            v = B[kunci_blok(r, k, d)][j]
            v[0] += al and y
            v[1] += al and not y
            v[2] += (not al) and y
            v[3] += 1
    ks = sorted(B, key=str)

    def skor(daftar):
        t = [[0] * 4 for _ in range(3)]
        for kb in daftar:
            for j in range(3):
                for i in range(4):
                    t[j][i] += B[kb][j][i]
        e = [ets(*x) for x in t]
        return e[0] - e[1], e[0] - e[2]
    titik = skor(ks)
    rng, ul = random.Random(biji), []
    for _ in range(n):
        ul.append(skor([ks[rng.randrange(len(ks))] for _ in ks]))
    return titik, ul


def selang(ul, j, lo=2.5, hi=97.5):
    v = sorted(x[j] for x in ul)
    return v[int(len(v) * lo / 100)], v[min(len(v) - 1, int(len(v) * hi / 100))]


def vonis(titik, sl, y1, alarm):
    """sl[j] = (bawah, atas) lintas dua skema; titik tuple dETS lawan (clim, pers)."""
    if y1 < 100 or alarm < 10:
        return "tidak dapat dinilai"
    if any(t <= 0 or s[1] < 0 for t, s in zip(titik, sl)):
        v = "TIDAK LULUS"
    elif all(s[0] > 0 for s in sl):
        v = "LULUS"
    else:
        v = "TIDAK MEYAKINKAN"
    return v + (" (daya rendah)" if v != "TIDAK LULUS" and (y1 < 300 or alarm < 30) else "")


def p0_pabrik(sel_dasar):
    """Klimatologi bulanan leave-one-year-out: frekuensi y per (reach, bulan) di tahun lain. sel_dasar [(r,d,y)]."""
    n, a = defaultdict(int), defaultdict(int)
    for r, d, y in sel_dasar:
        n[(r, d.month, d.year)] += 1
        a[(r, d.month, d.year)] += y
    N, A = defaultdict(int), defaultdict(int)
    for (r, m, t), v in n.items():
        N[(r, m)] += v
        A[(r, m)] += a[(r, m, t)]

    def p0(r, d):
        nn = N[(r, d.month)] - n[(r, d.month, d.year)]
        return (A[(r, d.month)] - a[(r, d.month, d.year)]) / nn if nn else 0.0
    return p0


# ------------------------------------------------------------------ data
def muat_ruas():
    from floodhub import Kab
    K, ruas, keluar = Kab.repo(), json.load(open(RUAS)), []
    ok = {}
    for rid, v in ruas.items():
        k = K.cari(v["lon"], v["lat"])
        if not k:
            keluar.append((rid, "titik di luar poligon kabupaten"))
        elif not v.get("rp"):
            keluar.append((rid, "tanpa periode ulang"))
        else:
            ok[rid] = {"kab": k, "t2": v["rp"]["2"], "t5": v["rp"]["5"], "kecil": v["median_historis"] < TINGGI_MIN,
                       "induk": v["pos"][0].startswith("sungai induk"), "nama": v["pos"][0][:40]}
    return ok, keluar


def ambil():
    import geoglows as G, time
    os.makedirs(CACHE, exist_ok=True)
    for rid in muat_ruas()[0]:      # hanya ruas yang akan dinilai (titik di dalam kabupaten, ada rp)
        f = os.path.join(CACHE, f"retro_{rid}.json")
        if os.path.exists(f):
            continue
        try:
            d = G.get(f"retrospectivedaily/{rid}?format=json&start_date={FETCH_AWAL}&end_date={AKHIR:%Y%m%d}")
        except Exception as e:
            print(rid, "gagal", str(e)[:80])
            continue
        tgl, q = d["datetime"], d[rid]
        json.dump({"awal": tgl[0][:10], "q": q}, open(f, "w"))
        print(rid, len(q))
        time.sleep(0.5)


def baca_label():
    lab = defaultdict(set)
    for r in csv.DictReader(gzip.open(LABEL, "rt")):
        if r["keyakinan"] in POSITIF and r["jendela_j3"] == "0":
            lab[r["kunci"]].add(dt.date.fromisoformat(r["tanggal"]))
    return lab


def j3_hari():
    import label_bersatu_v2 as V2
    return V2.hari_j3()


def deret_sinyal(ruas, ambang, kecil, j3=()):
    """-> {(reach, kab): {date: 0/1}}; hanya ruas yang kelasnya (kecil) cocok; hari dalam +-JENDELA dari jendela J3 dibuang; semua hari AWAL..AKHIR."""
    bad = {d + dt.timedelta(i) for d in j3 for i in range(-JENDELA, JENDELA + 1)}
    out = {}
    for rid, v in ruas.items():
        f = os.path.join(CACHE, f"retro_{rid}.json")
        if v["kecil"] != kecil or not os.path.exists(f):
            continue
        c = json.load(open(f))
        a0, per = dt.date.fromisoformat(c["awal"]), {}
        for i, q in enumerate(c["q"]):
            d = a0 + dt.timedelta(i)
            if AWAL <= d <= AKHIR and d not in bad and q is not None:
                per[d] = int(q >= v[ambang])
        out[(rid, v["kab"])] = per
    return out


def nilai_satu(deret, label, ruas):
    p0 = p0_pabrik([(r, d, int(any((d + dt.timedelta(i)) in label.get(k, ()) for i in range(-JENDELA, JENDELA + 1)))) for (r, k), per in deret.items() for d in per])
    sel = susun_sel(deret, label, p0)
    blokA = lambda r, k, d: (r, d.year)
    blokB = lambda r, k, d: d.isocalendar()[:2]
    tA, uA = boot(sel, blokA)
    tB, uB = boot(sel, blokB)
    sl = [(min(selang(uA, j)[0], selang(uB, j)[0]), max(selang(uA, j)[1], selang(uB, j)[1])) for j in (0, 1)]
    k = [kont([(s[j], s[6]) for s in sel]) for j in (3, 4, 5)]
    ukur = lambda a, b, c, n: {"POD": round(a / (a + c), 4) if a + c else None, "FAR": round(b / (a + b), 4) if a + b else None,
                               "CSI": round(a / (a + b + c), 4) if a + b + c else None, "ETS": round(ets(a, b, c, n), 4), "a": a, "b": b, "c": c, "n": n}
    y1, alarm = sum(s[6] for s in sel), sum(s[3] for s in sel)
    return {"reach": len(deret), "kab_hari_reach": len(sel), "y1": y1, "alarm_sinyal": alarm, "prevalensi_label": round(y1 / len(sel), 4) if sel else None,
            "sinyal": ukur(*k[0]), "klimatologi": ukur(*k[1]), "persistensi": ukur(*k[2]),
            "dETS_lawan_klimatologi": {"titik": round(tA[0], 4), "ci95": [round(sl[0][0], 4), round(sl[0][1], 4)]},
            "dETS_lawan_persistensi": {"titik": round(tA[1], 4), "ci95": [round(sl[1][0], 4), round(sl[1][1], 4)]},
            "vonis": vonis(tA, sl, y1, alarm)}


def nilai():
    ruas, keluar = muat_ruas()
    ada = [r for r in ruas if os.path.exists(os.path.join(CACHE, f"retro_{r}.json"))]
    if len(ada) < len(ruas):
        sys.exit(f"deret belum lengkap ({len(ada)}/{len(ruas)}): jalankan `ambil` dulu")
    if os.path.exists(OUT) and os.path.exists(BUKA):
        sys.exit("uji sudah dibuka (uji_geoglows.buka); aturan tak diubah, perubahan = amandemen tertulis")
    label, j3 = baca_label(), j3_hari()
    fd = os.open(BUKA, os.O_CREAT | os.O_EXCL | os.O_WRONLY)       # SEKALI; penanda ditulis sebelum metrik pertama
    os.write(fd, json.dumps({"dibuka": dt.datetime.now().isoformat(timespec="seconds"), "label_sha256": sha(LABEL), "ruas_sha256": sha(RUAS),
                             "skrip_sha256": sha(os.path.abspath(__file__))}).encode())
    os.close(fd)
    hasil = {}
    for nama, kecil, induk in (("utama_ruas_besar_semua", False, None), ("lapis_sungai_induk", False, True), ("lapis_pos_sihka_besar", False, False), ("lapis_ruas_kecil_deskriptif", True, None)):
        sub = {r: v for r, v in ruas.items() if induk is None or v["induk"] == induk}
        d = deret_sinyal(sub, "t2", kecil, j3)
        if d:
            hasil[nama] = nilai_satu(d, label, sub)
    d5 = deret_sinyal(ruas, "t5", False, j3)
    if d5:
        hasil["lapis_T5_deskriptif"] = nilai_satu(d5, label, ruas)
    isi = {"dibuat": dt.datetime.now().isoformat(timespec="seconds"), "prareg": "scripts/banjir/PRAREG-GEOGLOWS.md",
           "PERINGATAN": "Deret RETROSPEKTIF (simulasi ERA5), BUKAN ramalan terarsip: menguji sinyal hidrologi, bukan keterampilan ramalan 15 hari. Tidak dipasang ke status.json.",
           "periode": [AWAL.isoformat(), AKHIR.isoformat()], "jendela_label_hari": JENDELA, "label": "label_bersatu_v2, keyakinan TINGGI atau SEDANG, bukan jendela J3",
           "sha256": {"label": sha(LABEL), "ruas": sha(RUAS)}, "reach_dinilai": {r: {k: v[k] for k in ("kab", "nama", "induk", "kecil", "t2")} for r, v in ruas.items()},
           "reach_keluar": keluar, "vonis_utama": hasil.get("utama_ruas_besar_semua", {}).get("vonis", "tidak dapat dinilai"), "hasil": hasil}
    json.dump(isi, open(OUT, "w"), ensure_ascii=False, indent=1)
    print(json.dumps({"vonis_utama": isi["vonis_utama"], **{k: {x: v[x] for x in ("reach", "kab_hari_reach", "y1", "alarm_sinyal", "dETS_lawan_klimatologi", "dETS_lawan_persistensi", "vonis")} for k, v in hasil.items()}}, ensure_ascii=False, indent=1))


# ------------------------------------------------------------------ uji
def uji():
    assert ets(10, 0, 0, 100) == 1.0 and abs(ets(5, 5, 5, 100) - (5 - 10 * 10 / 100) / (15 - 1)) < 1e-9
    assert ets(0, 0, 0, 10) == 0.0
    assert topk({"a": (0.1,), "b": (0.3,), "c": (0.3,)}, 2) == {"b", "c"} and topk({"a": (1,)}, 0) == set()
    # sintetik: reach R sinyal tepat di hari kejadian; reach S berlabel lebih sering tetapi tanpa sinyal
    D = lambda i: AWAL + dt.timedelta(i)
    hari = [D(i) for i in range(0, 700, 1)]
    ev = {D(i) for i in range(10, 700, 35)}
    label = {"k|R": ev, "k|S": {D(i) for i in range(15, 700, 7)}}      # S sering berlabel tanpa sinyal: klimatologi salah memilih S
    deret = {("R", "k|R"): {d: int(d in ev) for d in hari}, ("S", "k|S"): {d: 0 for d in hari}}
    p0 = p0_pabrik([(r, d, int(any((d + dt.timedelta(i)) in label[k] for i in range(-JENDELA, JENDELA + 1)))) for (r, k), per in deret.items() for d in per])
    sel = susun_sel(deret, label, p0)
    s_ = kont([(x[3], x[6]) for x in sel if x[0] == "R"])
    assert s_[0] == len(ev) and s_[1] == 0 and s_[2] == 4 * len(ev), s_      # tiap kejadian: 1 hari sinyal, +-2 hari y=1 -> 4 miss
    t, ul = boot(sel, lambda r, k, d: (r, d.year), n=300)
    assert t[0] > 0 and ul == boot(sel, lambda r, k, d: (r, d.year), n=300)[1]             # deterministik, sinyal sempurna menang
    # kebocoran: p0 hari tahun y tak boleh memakai label tahun y (LOYO)
    a1 = p0_pabrik([("R", dt.date(2016, 3, 1), 1), ("R", dt.date(2017, 3, 1), 0)])
    assert a1("R", dt.date(2017, 3, 1)) == 1.0 and a1("R", dt.date(2016, 3, 1)) == 0.0   # LOYO: tahun sendiri keluar
    assert vonis((0.1, 0.1), [(0.01, 0.2)] * 2, 150, 50) == "LULUS (daya rendah)" and vonis((0.1, 0.1), [(0.01, 0.2)] * 2, 400, 50) == "LULUS"
    assert vonis((-0.1, 0.1), [(-0.2, 0.0), (0.01, 0.2)], 400, 50) == "TIDAK LULUS" and vonis((0.1, 0.1), [(-0.01, 0.2)] * 2, 400, 50) == "TIDAK MEYAKINKAN"
    assert vonis((0.1, 0.1), [(0.01, 0.2)] * 2, 90, 50) == "tidak dapat dinilai"
    print("uji_geoglows: hijau")


if __name__ == "__main__":
    {"ambil": ambil, "nilai": nilai, "uji": uji}.get(sys.argv[1] if len(sys.argv) > 1 else "", lambda: sys.exit(__doc__))()
