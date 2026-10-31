"""Label kejadian banjir per KECAMATAN dari Google Groundsource (Zenodo 10.5281/zenodo.18647053, CC BY 4.0).

Bahan uji dan kalibrasi model bahaya banjir tingkat kecamatan (RISET-INARISK.md bagian 4 langkah 2).
Pakai:
  python3 scripts/banjir/label_kec.py ambil            # unduh parquet ~667 MB -> data/raw/banjir/label_kec/ (bisa dilanjut)
  <python-dgn-pyarrow> scripts/banjir/label_kec.py ambil   # lalu ekstrak kotak Indonesia -> gs_poli.json.gz (butuh pyarrow)
  python3 scripts/banjir/label_kec.py susun            # -> label_kec.json + public/banjir/data/label_kec_ringkas.json (stdlib)
  python3 scripts/banjir/label_kec.py uji              # swauji luring, data mainan
Aturan: titik wakil = titik berat cincin luar; poligon yang cincinnya menyentuh >1 kecamatan DITANDAI 'lintas'
(dihitung di kecamatan titik beratnya, jumlah kecamatan tersentuh dicatat), tidak dibagi.
"""
import datetime as dt, gzip, json, math, os, struct, sys, urllib.request
from collections import Counter, defaultdict

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import label_banjir as LB  # muat, tulis, baca, tgl  (dipakai ulang)

AKAR, DIR = LB.AKAR, os.path.join(LB.AKAR, "data/raw/banjir/label_kec")
PARQUET = os.path.join(DIR, "groundsource_2026.parquet")
URL = "https://zenodo.org/api/records/18647054/files/groundsource_2026.parquet/content"
POLI = os.path.join(DIR, "gs_poli.json.gz")
KELUAR = os.path.join(DIR, "label_kec.json")
RINGKAS = os.path.join(AKAR, "public/banjir/data/label_kec_ringkas.json")
TAHUN = range(2016, 2026)
MAKS_SIMPUL = 64
LUAS_DERAJAT = 0.2   # bentang kotak-batas > ini (~22 km) = jelas lebih luas dari satu kecamatan
SEL = 0.5


# ---------------------------------------------------------------- ambil (unduh + ekstrak)
def unduh():
    os.makedirs(DIR, exist_ok=True)
    ada = os.path.getsize(PARQUET) if os.path.exists(PARQUET) else 0
    req = urllib.request.Request(URL, headers={"Range": f"bytes={ada}-", "User-Agent": "poskobanjir-label/1.0"})
    try:
        r = urllib.request.urlopen(req, timeout=120)
    except urllib.error.HTTPError as e:
        if e.code == 416:
            return
        raise
    with r, open(PARQUET, "ab" if ada and r.status == 206 else "wb") as f:
        while b := r.read(1 << 20):
            f.write(b)
    print("unduh selesai", os.path.getsize(PARQUET))


def cincin_luar(b):
    """WKB little-endian Polygon/MultiPolygon -> cincin luar terbanyak simpul [(lon,lat),...] atau None."""
    if not b or b[0] != 1:
        return None
    t = struct.unpack_from("<I", b, 1)[0]
    cinc = []

    def poli(o):
        nr = struct.unpack_from("<I", b, o + 5)[0]
        o += 9
        for i in range(nr):
            n = struct.unpack_from("<I", b, o)[0]
            if i == 0:
                v = struct.unpack_from(f"<{2 * n}d", b, o + 4)
                cinc.append(list(zip(v[0::2], v[1::2])))
            o += 4 + 16 * n
        return o
    if t == 3:
        poli(0)
    elif t == 6:
        o = 9
        for _ in range(struct.unpack_from("<I", b, 5)[0]):
            o = poli(o)
    else:
        return None
    return max(cinc, key=len) if cinc else None


def simpul_pertama(b):
    """Simpul pertama cincin luar pertama (prasaring kotak murah): Polygon byte 13, MultiPolygon byte 22."""
    return struct.unpack_from("<2d", b, 22 if struct.unpack_from("<I", b, 1)[0] == 6 else 13)


def titik_berat(r):
    """Titik berat berbobot luas cincin; cincin degenerat -> rata-rata simpul."""
    a = cx = cy = 0.0
    for i in range(len(r) - 1):
        x0, y0, x1, y1 = r[i][0], r[i][1], r[i + 1][0], r[i + 1][1]
        w = x0 * y1 - x1 * y0
        a += w
        cx += (x0 + x1) * w
        cy += (y0 + y1) * w
    if abs(a) < 1e-12:
        return sum(p[0] for p in r) / len(r), sum(p[1] for p in r) / len(r)
    return cx / (3 * a), cy / (3 * a)


def ekstrak():
    """Butuh pyarrow. -> gs_poli.json.gz [[clon,clat,mulai,selesai,[simpul datar <=64]]] untuk titik berat di kotak Indonesia."""
    import pyarrow.parquet as pq
    f = pq.ParquetFile(PARQUET)
    out, total = [], 0
    for g in range(f.metadata.num_row_groups):
        t = f.read_row_group(g, columns=["geometry", "start_date", "end_date"])
        for b, a, e in zip(t["geometry"].to_pylist(), t["start_date"].to_pylist(), t["end_date"].to_pylist()):
            total += 1
            if not b or b[0] != 1:
                continue
            x, y = simpul_pertama(b)
            if not (93 <= x <= 142 and -12.5 <= y <= 8):
                continue
            r = cincin_luar(b)
            if not r:
                continue
            cx, cy = titik_berat(r)
            if 94.5 <= cx <= 141.5 and -11.5 <= cy <= 6.5:
                s = r[:-1][::-(-len(r) // MAKS_SIMPUL)]
                out.append([round(cx, 5), round(cy, 5), str(a)[:10], str(e)[:10], [round(v, 4) for p in s for v in p]])
        print("row group", g, "baris", total, "indonesia", len(out), flush=True)
    os.makedirs(DIR, exist_ok=True)
    with gzip.open(POLI + ".tmp", "wt") as fh:
        json.dump(out, fh, separators=(",", ":"))
    os.replace(POLI + ".tmp", POLI)
    print("gs_poli.json.gz", len(out), "dari", total)


def ambil():
    if not os.path.exists(PARQUET) or not os.path.exists(POLI):
        unduh()
    try:
        import pyarrow  # noqa: F401
    except ImportError:
        sys.exit("pyarrow tak ada: jalankan ulang 'ambil' dengan python ber-pyarrow untuk ekstraksi")
    if not os.path.exists(POLI):
        ekstrak()


# ---------------------------------------------------------------- indeks kecamatan
def muat_kec():
    """-> daftar bagian [(minx,miny,maxx,maxy,cincin,kunci)], kunci 'prov|kab|kec'."""
    W = LB.muat("scripts/banjir/wilayah.py", "banjir_wilayah")
    bag = []
    for p in W.PROVINSI:
        fn = os.path.join(AKAR, "public/geo/kecamatan", f"{p}.json")
        if not os.path.exists(fn):
            continue
        for f in json.load(open(fn))["features"]:
            k = f"{p}|{f['properties']['kab']}|{f['properties']['kec']}"
            g = f["geometry"]
            for poli in (g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]]):
                r = poli[0]
                xs, ys = [q[0] for q in r], [q[1] for q in r]
                bag.append((min(xs), min(ys), max(xs), max(ys), r, k))
    return W._di_dalam, bag


def indeks(bag):
    idx = defaultdict(list)
    for i, b in enumerate(bag):
        for gx in range(int(math.floor(b[0] / SEL)), int(math.floor(b[2] / SEL)) + 1):
            for gy in range(int(math.floor(b[1] / SEL)), int(math.floor(b[3] / SEL)) + 1):
                idx[(gx, gy)].append(i)
    return idx


def cari(di_dalam, bag, idx, x, y):
    for i in idx.get((int(math.floor(x / SEL)), int(math.floor(y / SEL))), ()):
        b = bag[i]
        if b[0] <= x <= b[2] and b[1] <= y <= b[3] and di_dalam(x, y, b[4]):
            return b[5]
    return None


# ---------------------------------------------------------------- susun
def petakan(rows, di_dalam, bag, idx):
    """rows: [[clon,clat,d0,d1,simpul_datar]] -> (events, statistik).
    event: {kec, d0, d1, n_kec, tanda[]}; kec None = titik berat di luar semua kecamatan (laut/negara lain)."""
    ev, st = [], Counter()
    for cx, cy, d0, d1, s in rows:
        kc = cari(di_dalam, bag, idx, cx, cy)
        ks = {kc} - {None}
        jarak = {}  # kecamatan tersentuh -> jarak kuadrat simpul terdekat ke titik berat
        for i in range(0, len(s) - 1, 2):
            k = cari(di_dalam, bag, idx, s[i], s[i + 1])
            if k:
                ks.add(k)
                jarak[k] = min(jarak.get(k, 1e9), (s[i] - cx) ** 2 + (s[i + 1] - cy) ** 2)
        tanda = []
        dalam = d0[:4].isdigit() and int(d0[:4]) in TAHUN
        if kc is None:
            st["titik_berat_di_luar"] += dalam
            if not ks:
                st["tanpa_kecamatan"] += dalam
                continue
            kc = min(jarak, key=jarak.get)  # kecamatan tersentuh terdekat ke titik berat
            tanda.append("titik_berat_di_luar")
        xs, ys = s[0::2], s[1::2]
        if len(ks) > 1:
            tanda.append("lintas")
        if xs and (max(xs) - min(xs) > LUAS_DERAJAT or max(ys) - min(ys) > LUAS_DERAJAT):
            tanda.append("luas")
        ev.append({"kec": kc, "d0": d0, "d1": d1, "n_kec": max(1, len(ks)), "tanda": tanda})
    return ev, st


def agregat(ev):
    """Per kecamatan: n per tahun (kec-hari unik mulai), poligon mentah, tanggal, tanda mutu."""
    per = defaultdict(lambda: {"hari": set(), "poli": Counter(), "lintas": 0, "luas": 0, "tepi": 0, "maks_kec": 1, "tunggal": set()})
    for e in ev:
        y = int(e["d0"][:4])
        if y not in TAHUN:
            continue
        p = per[e["kec"]]
        p["hari"].add(e["d0"])
        p["poli"][y] += 1
        if not e["tanda"]:
            p["tunggal"].add(e["d0"])  # satu kecamatan, kecil, titik berat di dalam: label paling bersih
        p["lintas"] += "lintas" in e["tanda"]
        p["luas"] += "luas" in e["tanda"]
        p["tepi"] += "titik_berat_di_luar" in e["tanda"]
        p["maks_kec"] = max(p["maks_kec"], e["n_kec"])
    out = {}
    for k, p in per.items():
        tg = sorted(p["hari"])
        n_poli = sum(p["poli"].values())
        out[k] = {"n_th": dict(sorted(Counter(int(d[:4]) for d in tg).items())), "n_hari": len(tg), "n_hari_tunggal": len(p["tunggal"]),
                  "n_th_tunggal": dict(sorted(Counter(int(d[:4]) for d in p["tunggal"]).items())), "poligon": n_poli,
                  "tanggal": tg, "lintas": p["lintas"], "luas": p["luas"], "titik_berat_di_luar": p["tepi"],
                  "maks_kec_tersentuh": p["maks_kec"],
                  "mutu": "bersih" if not (p["lintas"] or p["luas"] or p["tepi"]) else ("ragu" if p["lintas"] + p["luas"] + p["tepi"] >= n_poli / 2 else "campur")}
    return out


def ranking(a):
    """Peringkat rata-rata (ties dirata-ratakan)."""
    o = sorted(range(len(a)), key=lambda i: a[i])
    r, i = [0.0] * len(a), 0
    while i < len(o):
        j = i
        while j + 1 < len(o) and a[o[j + 1]] == a[o[i]]:
            j += 1
        for t in range(i, j + 1):
            r[o[t]] = (i + j) / 2 + 1
        i = j + 1
    return r


def spearman(a, b):
    if len(a) < 3:
        return None
    ra, rb = ranking(a), ranking(b)
    ma, mb = sum(ra) / len(ra), sum(rb) / len(rb)
    sab = sum((x - ma) * (y - mb) for x, y in zip(ra, rb))
    saa, sbb = sum((x - ma) ** 2 for x in ra), sum((y - mb) ** 2 for y in rb)
    return sab / math.sqrt(saa * sbb) if saa and sbb else None


def silang_dibi(ag, dibi_kab):
    """Jumlah kec-hari GS dijumlah ke kabupaten lawan DIBI banjir+bandang 2016-2025. -> dict."""
    gs = Counter()
    for k, v in ag.items():
        gs["|".join(k.split("|")[:2])] += v["n_hari"]
    dibi = {}
    for k, v in dibi_kab.items():
        dibi[k] = sum(v.get(j, {}).get(str(y), 0) or 0 for j in ("banjir", "bandang") for y in TAHUN)
    kunci = sorted(set(gs) | set(dibi))
    gabung = [k for k in kunci if k in gs and k in dibi]
    dua = lambda ks: ([gs.get(k, 0) for k in ks], [dibi.get(k, 0) for k in ks])
    a, b = dua(kunci)
    c, d = dua(gabung)
    return {"kab_gs": len(gs), "kab_dibi": len(dibi), "kab_di_keduanya": len(gabung),
            "kab_gs_tak_ada_di_dibi": sorted(set(gs) - set(dibi))[:15], "n_gs_tak_cocok": len(set(gs) - set(dibi)),
            "spearman_gabungan_nol_diisi": round(spearman(a, b), 3) if spearman(a, b) is not None else None, "n_gabungan_nol_diisi": len(kunci),
            "spearman_keduanya_ada": round(spearman(c, d), 3) if spearman(c, d) is not None else None, "n_keduanya_ada": len(gabung),
            "total_gs_kec_hari": sum(gs.values()), "total_dibi_banjir_bandang": sum(dibi.values())}


def susun():
    rows = json.load(gzip.open(POLI, "rt"))
    di_dalam, bag = muat_kec()
    idx = indeks(bag)
    ev, st = petakan(rows, di_dalam, bag, idx)
    ag = agregat(ev)
    dibi = json.load(open(os.path.join(AKAR, "public/banjir/data/kejadian.json")))["kab"]
    sil = silang_dibi(ag, dibi)
    th_all = Counter(int(r[2][:4]) for r in rows)
    th_ev = Counter(int(e["d0"][:4]) for e in ev)
    th_kec = {y: len({k for k, v in ag.items() if y in v["n_th"]}) for y in TAHUN}
    prov = Counter(k.split("|")[0] for k in ag)
    n_poli = sum(v["poligon"] for v in ag.values())
    n_lintas = sum(1 for e in ev if "lintas" in e["tanda"] and int(e["d0"][:4]) in TAHUN)
    n_luas = sum(1 for e in ev if "luas" in e["tanda"] and int(e["d0"][:4]) in TAHUN)
    n_kec_total = len({b[5] for b in bag})
    LB.tulis(KELUAR, {
        "dibuat": dt.date.today().isoformat(), "sumber": "Google Groundsource, Zenodo 10.5281/zenodo.18647053, CC BY 4.0",
        "periode": [min(TAHUN), max(TAHUN)], "kunci": "prov|kab|kec", "isi": "n_th = kejadian unik (kecamatan, tanggal mulai) per tahun; n_th_tunggal = hanya poligon kecil di satu kecamatan (paling bersih)",
        "kec": ag})
    ring = {
        "dibuat": dt.date.today().isoformat(),
        "sumber": "Google Groundsource (Zenodo 10.5281/zenodo.18647053, CC BY 4.0), titik berat poligon dipetakan ke kecamatan",
        "periode": [min(TAHUN), max(TAHUN)],
        "angka": {"poligon_di_kotak_indonesia_semua_tahun": len(rows), "poligon_dipetakan_ke_kec_2016_2025": n_poli,
                  "kec_berlabel": len(ag), "kec_berlabel_tunggal": sum(1 for v in ag.values() if v["n_hari_tunggal"]),
                  "kec_total_peta": n_kec_total, "poligon_lintas_kec": n_lintas, "poligon_luas": n_luas,
                  "tanpa_kecamatan": st["tanpa_kecamatan"], "titik_berat_di_luar": st["titik_berat_di_luar"]},
        "cakupan_per_tahun": {"poligon_semua": {str(y): th_all[y] for y in sorted(th_all) if y >= 2010},
                              "poligon_dipetakan": {str(y): th_ev[y] for y in TAHUN}, "kec_berlabel": {str(y): th_kec[y] for y in TAHUN}},
        "kec_berlabel_per_prov": dict(sorted(prov.items())),
        "silang_dibi": sil,
        "klaim_penulis": "Presisi ~82% (klaim penulis Groundsource, bukan hasil kita); kami belum mengukurnya.",
        "catatan_bias": ["Berasal dari berita: bias ke kota, wilayah ber-media, dan pelapor; kecamatan tanpa label BUKAN berarti tanpa banjir.",
                         "Tanggal = tanggal berita, bukan puncak genangan. Tipis sebelum 2016, berhenti 29 Jan 2026.",
                         "Poligon lintas kecamatan dihitung di kecamatan titik beratnya dan ditandai; tidak dibagi.",
                         "Label positif saja: ketiadaan label tak boleh dipakai sebagai negatif tanpa kontrol kepadatan media."]}
    LB.tulis(RINGKAS, ring)
    print(json.dumps({k: ring[k] for k in ("angka", "kec_berlabel_per_prov", "silang_dibi")}, ensure_ascii=False, indent=1))
    print(f"kecamatan berlabel: {len(ag)}; kejadian (poligon) 2016-2025: {n_poli}; berkas {os.path.getsize(RINGKAS)} B ringkasan")


# ---------------------------------------------------------------- uji
def uji():
    kotak = lambda x0, y0, x1, y1: [[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]]
    bag = [(0, 0, 1, 1, kotak(0, 0, 1, 1), "11|A|X"), (1, 0, 2, 1, kotak(1, 0, 2, 1), "11|A|Y"), (5, 5, 6, 6, kotak(5, 5, 6, 6), "12|B|Z")]
    sys.path.insert(0, AKAR)
    W = LB.muat("scripts/banjir/wilayah.py", "banjir_wilayah")
    dd, idx = W._di_dalam, indeks(bag)
    assert cari(dd, bag, idx, 0.5, 0.5) == "11|A|X" and cari(dd, bag, idx, 1.5, 0.5) == "11|A|Y" and cari(dd, bag, idx, 3, 3) is None
    # titik berat: kotak 0..2 x 0..4 -> (1,2); segitiga
    cx, cy = titik_berat(kotak(0, 0, 2, 4))
    assert abs(cx - 1) < 1e-9 and abs(cy - 2) < 1e-9
    assert titik_berat([(0, 0), (2, 2), (0, 0), (2, 2)]) == (1.0, 1.0)  # degenerat
    # WKB: Polygon 1 cincin kotak
    ring = kotak(0, 0, 2, 4)
    wkb = struct.pack("<BIII", 1, 3, 1, len(ring)) + b"".join(struct.pack("<2d", *p) for p in ring)
    assert cincin_luar(wkb) == [tuple(map(float, p)) for p in ring] and cincin_luar(b"") is None
    # prasaring: simpul pertama harus terbaca benar untuk Polygon (byte 13) DAN MultiPolygon (byte 22)
    pol = lambda r: struct.pack("<BII", 1, 3, 1) + struct.pack("<I", len(r)) + b"".join(struct.pack("<2d", *p) for p in r)
    mp = struct.pack("<BII", 1, 6, 2) + pol(kotak(110, -7, 111, -6)) + pol(kotak(1, 1, 2, 2))
    assert simpul_pertama(pol(kotak(110, -7, 111, -6))) == (110.0, -7.0) and simpul_pertama(mp) == (110.0, -7.0)
    flat = lambda r: [v for p in r[:-1] for v in p]
    rows = [[0.5, 0.5, "2020-01-01", "2020-01-01", flat(kotak(0.4, 0.4, 0.6, 0.6))],       # satu kec
            [0.5, 0.5, "2020-01-01", "2020-01-02", flat(kotak(0.4, 0.4, 0.6, 0.6))],       # hari sama, poligon lain
            [1.0001, 0.5, "2021-03-01", "2021-03-01", flat(kotak(0.95, 0.4, 1.05, 0.6))],    # melintas X dan Y
            [3, 3, "2022-01-01", "2022-01-01", flat(kotak(2.9, 2.9, 3.1, 3.1))],           # di luar
            [5.5, 5.5, "2015-01-01", "2015-01-01", flat(kotak(5.4, 5.4, 5.6, 5.6))],       # luar periode
            [5.5, 5.5, "2023-01-01", "2023-01-01", flat(kotak(5.0, 5.0, 5.9, 5.9))]]
    ev, st = petakan(rows, dd, bag, idx)
    assert len(ev) == 5 and st["tanpa_kecamatan"] == 1
    # titik berat di laut (0.5,-1) dengan cincin menyentuh X dan Y: pilih yang simpulnya terdekat (X)
    e2, s2 = petakan([[0.4, -1, "2020-05-05", "2020-05-05", [0.3, 0.1, 0.9, 0.1, 1.9, 0.1]]], dd, bag, idx)
    assert e2[0]["kec"] == "11|A|X" and "titik_berat_di_luar" in e2[0]["tanda"] and s2["titik_berat_di_luar"] == 1
    assert ev[2]["tanda"] == ["lintas"] and ev[2]["n_kec"] == 2 and ev[0]["tanda"] == []
    ag = agregat(ev)
    assert set(ag) == {"11|A|X", "11|A|Y", "12|B|Z"} or set(ag) == {"11|A|Y", "11|A|X", "12|B|Z"}
    x = ag["11|A|X"]
    assert x["n_hari"] == 1 and x["n_hari_tunggal"] == 1 and ag["11|A|Y"]["n_hari_tunggal"] == 0 and x["poligon"] == 2 and x["n_th"] == {2020: 1} and x["mutu"] == "bersih"
    assert ag["11|A|Y"]["mutu"] == "ragu" and ag["11|A|Y"]["lintas"] == 1
    assert "2015-01-01" not in ag["12|B|Z"]["tanggal"] and ag["12|B|Z"]["n_hari"] == 1
    # peringkat + Spearman
    assert ranking([10, 20, 20, 5]) == [2.0, 3.5, 3.5, 1.0]
    assert abs(spearman([1, 2, 3, 4], [10, 20, 30, 40]) - 1) < 1e-9 and abs(spearman([1, 2, 3, 4], [4, 3, 2, 1]) + 1) < 1e-9
    assert spearman([1, 1, 1], [1, 2, 3]) is None and spearman([1, 2], [1, 2]) is None
    s = silang_dibi({"11|A|X": {"n_hari": 3}, "11|A|Y": {"n_hari": 1}, "12|B|Z": {"n_hari": 2}, "99|Q|W": {"n_hari": 1}},
                    {"11|A": {"banjir": {"2020": 6}, "bandang": {"2021": 2}}, "12|B": {"banjir": {"2016": 4}}, "13|C": {"banjir": {"2017": 1}}, "14|D": {"banjir": {"2008": 99}}})
    assert s["kab_di_keduanya"] == 2 and s["n_gs_tak_cocok"] == 1 and s["total_dibi_banjir_bandang"] == 13 and s["spearman_keduanya_ada"] is None
    print("uji label_kec: ok")


if __name__ == "__main__":
    m = sys.argv[1] if len(sys.argv) > 1 else ""
    {"ambil": ambil, "susun": susun, "uji": uji}.get(m, lambda: sys.exit(__doc__))()
