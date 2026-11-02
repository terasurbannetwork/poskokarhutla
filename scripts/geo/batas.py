"""Batas provinsi / kab-kota / kecamatan (public/geo/) dari geodatabase batas wilayah BIG, disederhanakan dengan
topologi bersama: batas dua wilayah bertetangga adalah SATU garis yang disederhanakan sekali, jadi tidak ada lagi
tumpang tindih atau celah di antara poligon (dulu tiap poligon di-Douglas-Peucker 330 m sendiri-sendiri).

Sumber: Badan Informasi Geospasial, "Batas Wilayah Administrasi Kecamatan" (geodatabase batas wilayah administrasi
nasional edisi Juni 2026), layanan publik geoservices.big.go.id/rbi BATASWILAYAH/BATAS_KECAMATAN_AR. Informasi
Geospasial Dasar, terbuka untuk umum menurut UU 4/2011 tentang Informasi Geospasial; cantumkan "Sumber: BIG".
Kabupaten dan provinsi dibuat dengan melebur kecamatan, jadi ketiga tingkat bersarang persis.

Kunci (nama kab, nama kec, kode provinsi) TIDAK diambil dari BIG: tiap poligon BIG dipetakan ke kunci berkas lama
(nama dinormalisasi; bila tak cocok, kecamatan lama yang memuat titik dalamnya; bila tidak ada juga, yang terdekat
di kab yang sama), supaya semua pembaca (wilayah.py, peta, banjir, sejarah.json) tetap menemukan kunci yang sama.
Kecamatan lama yang tidak punya padanan di BIG dilaporkan dan tidak digambar (wilayahnya ikut kecamatan BIG induknya).

Alat: mapshaper (npx mapshaper@0.6.121, alat pengembangan saja, tidak dipasang di package.json dan tidak jalan di CI).

Pakai:
  python3 scripts/geo/batas.py ambil      # unduh BIG -> data/raw/big/NN.json (± 1,8 GB, tidak di-commit)
  python3 scripts/geo/batas.py cocok      # petakan ke kunci lama -> data/raw/big/kunci/NN.json
  python3 scripts/geo/batas.py bangun [provinsi]  # mapshaper -> public/geo/{provinsi.json,kabupaten/NN.json,kecamatan/NN.json}
  python3 scripts/geo/batas.py uji        # invarian berkas yang terbit (tanpa jaringan, tanpa mapshaper)
"""
import collections, difflib, json, math, os, re, subprocess, sys, tempfile, time, urllib.parse, urllib.request
from concurrent.futures import ThreadPoolExecutor

AKAR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
GEO = os.path.join(AKAR, "public/geo")
RAW = os.path.join(AKAR, "data/raw/big")
KUNCI = os.path.join(RAW, "kunci")
LAYANAN = "https://geoservices.big.go.id/rbi/rest/services/BATASWILAYAH/BATAS_KECAMATAN_AR/MapServer/0/query"
MAPSHAPER = ["npx", "-y", "mapshaper@0.6.121"]
KODE = "11 12 13 14 15 16 17 18 19 21 31 32 33 34 35 36 51 52 53 61 62 63 64 65 71 72 73 74 75 76 81 82 91 92 93 94 95 96".split()
# provinsi yang berbagi batas darat diproses bersama, supaya batas antarprovinsi juga satu garis
GUGUS = [["11", "12", "13", "14", "15", "16", "17", "18"], ["19"], ["21"], ["31", "32", "33", "34", "35", "36"], ["51"], ["52"],
         ["53"], ["61", "62", "63", "64", "65"], ["71", "72", "73", "74", "75", "76"], ["81"], ["82"], ["91", "92", "93", "94", "95", "96"]]
# Visvalingam berbobot (mapshaper), interval = toleransi setara jarak. Kecamatan & kab/kota dilihat di zoom 8-13,
# provinsi di zoom 4-9. Pulau < ambang dibuang kecuali bagian terbesar wilayahnya (tidak ada wilayah yang hilang).
INTERVAL_KEC, INTERVAL_PROV = 170, 1300  # meter
PULAU_KEC_HA, PULAU_PROV_HA = 5, 300
# 6 desimal, bukan 4: mapshaper memperbaiki silang segmen pada koordinat penuh, dan pembulatan 0,0001 sesudahnya
# melahirkan lagi puluhan silang kecil di pulau-pulau delta (diukur: 26 pasang di Kaltim+Kaltara, 0 pada 6 desimal)
PRESISI = 0.000001
PAGU = {"provinsi": 500_000, "kabupaten": 600_000, "kecamatan": 1_250_000}  # byte per berkas


# ---------------------------------------------------------------- ambil
def ambil():
    os.makedirs(RAW, exist_ok=True)

    def get(q):
        for i in range(6):
            try:
                with urllib.request.urlopen(LAYANAN + "?" + urllib.parse.urlencode(q), timeout=600) as r:
                    return json.load(r)
            except Exception as e:
                print("ulang", q["where"], q["resultOffset"], e, file=sys.stderr)
                time.sleep(5 * (i + 1))
        raise RuntimeError(f"BIG gagal: {q['where']} offset {q['resultOffset']}")

    def prov(k):
        p = os.path.join(RAW, k + ".json")
        if os.path.exists(p):
            return
        fitur, off, n = [], 0, 10  # halaman kecil: poligon pesisir BIG bisa puluhan MB per 40 fitur (HTTP 500)
        while True:
            d = get({"where": f"KDPPUM='{k}'", "outFields": "WADMKC,WADMKK,WADMPR,KDCPUM,KDPKAB,KDPPUM,TIPADM,OBJECTID",
                     "geometryPrecision": 6, "outSR": 4326, "f": "geojson", "orderByFields": "OBJECTID",
                     "resultRecordCount": n, "resultOffset": off})
            fitur += d["features"]
            off += n
            if len(d["features"]) < n:
                break
        json.dump({"type": "FeatureCollection", "features": fitur}, open(p + ".tmp", "w"))
        os.rename(p + ".tmp", p)
        print(k, len(fitur), file=sys.stderr)

    with ThreadPoolExecutor(4) as ex:
        list(ex.map(prov, KODE))


# ---------------------------------------------------------------- cocok
def norm(s):
    s = (s or "").lower().replace("kabupaten ", "").replace("kota administrasi ", "kota ").replace("administrasi ", "")
    return re.sub(r"[^a-z0-9]", "", re.sub(r"\(.*?\)", "", s))


def bagian(g):
    return g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]]


def di_dalam(x, y, r):
    c, j = False, len(r) - 1
    for i in range(len(r)):
        if (r[i][1] > y) != (r[j][1] > y) and x < (r[j][0] - r[i][0]) * (y - r[i][1]) / (r[j][1] - r[i][1]) + r[i][0]:
            c = not c
        j = i
    return c


def luas_derajat(r):
    return abs(sum(r[k - 1][0] * r[k][1] - r[k][0] * r[k - 1][1] for k in range(len(r)))) / 2


def titik_dalam(g):
    """Titik di dalam bagian terbesar: tengah selang terlebar pada garis mendatar lewat tengah kotaknya."""
    r = max((p[0] for p in bagian(g)), key=luas_derajat)
    ys = [c[1] for c in r]
    y = (min(ys) + max(ys)) / 2
    xs = sorted(r[k - 1][0] + (y - r[k - 1][1]) * (r[k][0] - r[k - 1][0]) / (r[k][1] - r[k - 1][1])
                for k in range(len(r)) if (r[k - 1][1] > y) != (r[k][1] > y))
    if len(xs) < 2:
        return r[0][0], r[0][1]
    a, b = max(((xs[i], xs[i + 1]) for i in range(0, len(xs) - 1, 2)), key=lambda t: t[1] - t[0])
    return (a + b) / 2, y


class Indeks:
    def __init__(self, fitur):
        self.k = [[(min(c[0] for c in p[0]), min(c[1] for c in p[0]), max(c[0] for c in p[0]), max(c[1] for c in p[0]), p)
                   for p in bagian(f["geometry"])] for f in fitur]

    def semua(self, x, y):
        """Indeks fitur yang memuat titik; lubang (enklave: Kota Jambi di dalam Muaro Jambi) dihormati."""
        return [i for i, ps in enumerate(self.k) if any(x0 <= x <= x1 and y0 <= y <= y1 and di_dalam(x, y, p[0])
                                                         and not any(di_dalam(x, y, h) for h in p[1:]) for x0, y0, x1, y1, p in ps)]

    def cari(self, x, y):
        s = self.semua(x, y)
        return s[0] if s else None


def cocok():
    os.makedirs(KUNCI, exist_ok=True)
    hitung, tanpa = collections.Counter(), {}
    for k in KODE:
        lama = json.load(open(os.path.join(GEO, "kecamatan", k + ".json")))["features"]
        kunci = [(f["properties"]["kab"], f["properties"]["kec"]) for f in lama]
        kab_lama = {norm(a): a for a, _ in kunci}
        idx = {}
        for i, (a, b) in enumerate(kunci):
            idx.setdefault((a, norm(b)), i)
        big = json.load(open(os.path.join(RAW, k + ".json")))["features"]
        L = Indeks(lama)
        pt = [titik_dalam(f["geometry"]) for f in big]
        sp = [L.cari(*q) for q in pt]
        suara = collections.defaultdict(collections.Counter)
        for f, s in zip(big, sp):
            if s is not None:
                suara[f["properties"]["WADMKK"]][kunci[s][0]] += 1
        kabmap = {kb: kab_lama.get(norm(kb)) or (suara[kb].most_common(1)[0][0] if suara[kb] else None)
                  for kb in {f["properties"]["WADMKK"] for f in big}}
        pusat = [titik_dalam(f["geometry"]) for f in lama]
        # ejaan beda (Cigemblong/Cigemlong, Pasie Raja/Pasi Raja): mirip >= 0,8 dengan kecamatan lama di kab yang sama
        # yang belum kebagian nama persis
        persis = {idx.get((kabmap[f["properties"]["WADMKK"]], norm(f["properties"]["WADMKC"]))) for f in big}
        sisa = collections.defaultdict(dict)
        for i, (a, b) in enumerate(kunci):
            if i not in persis:
                sisa[a][norm(b)] = i
        dapat, keluar = collections.Counter(), []
        for f, s, q in zip(big, sp, pt):
            P = f["properties"]
            kb = kabmap[P["WADMKK"]]
            i = idx.get((kb, norm(P["WADMKC"])))
            mirip = difflib.get_close_matches(norm(P["WADMKC"]), list(sisa[kb]), 1, .8) if i is None and norm(P["WADMKC"]) else []
            if i is not None:
                hitung["nama"] += 1
            elif mirip:
                i = sisa[kb][mirip[0]]
                hitung["nama mirip"] += 1
                print(f"  {k} mirip: {P['WADMKK']} / {P['WADMKC']} -> {kunci[i][1]}", file=sys.stderr)
            elif s is not None:  # nama beda / "Area Tidak Terdefinisi" (TIPADM 999): ikut kecamatan lama yang memuatnya
                i = s
                hitung["titik dalam"] += 1
            else:  # pulau kecil di luar poligon lama: kecamatan terdekat di kab yang sama
                calon = [j for j, (a, _) in enumerate(kunci) if a == kb] or range(len(kunci))
                i = min(calon, key=lambda j: (pusat[j][0] - q[0]) ** 2 + (pusat[j][1] - q[1]) ** 2)
                hitung["terdekat"] += 1
            dapat[i] += 1
            keluar.append({"type": "Feature", "geometry": f["geometry"],
                           "properties": {"prov": k, "kab": kunci[i][0], "kec": kunci[i][1], "kunci": f"{k}|{kunci[i][0]}|{kunci[i][1]}"}})
        h = [f"{kunci[i][0]} / {kunci[i][1]}" for i in range(len(kunci)) if not dapat[i]]
        if h:
            tanpa[k] = h
        json.dump({"type": "FeatureCollection", "features": keluar}, open(os.path.join(KUNCI, k + ".json"), "w"), separators=(",", ":"))
        print(k, len(big), "poligon BIG ->", len(kunci) - len(h), "kecamatan", file=sys.stderr)
    json.dump(tanpa, open(os.path.join(KUNCI, "tanpa_padanan.json"), "w"), ensure_ascii=False, indent=1)
    print(dict(hitung), "| kecamatan lama tanpa padanan BIG:", tanpa, file=sys.stderr)


# ---------------------------------------------------------------- bangun
def ms(*argumen):
    r = subprocess.run(MAPSHAPER + list(argumen), capture_output=True, text=True)
    if r.returncode:
        sys.exit(r.stderr[-2000:])
    return r.stderr


def luas_ha(r):
    la = sum(c[1] for c in r) / len(r)
    return luas_derajat(r) * 111.32 * math.cos(math.radians(la)) * 110.57 * 100


def buang_pulau(fitur, ambang_ha):
    """Buang bagian (pulau) < ambang yang tidak berbagi satu sisi pun dengan bagian lain; bagian terbesar tiap fitur tetap."""
    sisi = collections.Counter()
    seg = lambda r: {tuple(sorted((tuple(r[i]), tuple(r[i + 1])))) for i in range(len(r) - 1)}
    for f in fitur:
        for p in bagian(f["geometry"]):
            sisi.update(seg(p[0]))
    for f in fitur:
        P = bagian(f["geometry"])
        besar = max(range(len(P)), key=lambda i: luas_derajat(P[i][0]))
        tetap = [p for i, p in enumerate(P) if i == besar or luas_ha(p[0]) >= ambang_ha or any(sisi[s] > 1 for s in seg(p[0]))]
        f["geometry"] = {"type": "Polygon", "coordinates": tetap[0]} if len(tetap) == 1 else {"type": "MultiPolygon", "coordinates": tetap}


def tulis(jalur, fitur):
    s = json.dumps({"type": "FeatureCollection", "features": fitur}, ensure_ascii=False, separators=(",", ":"))
    open(jalur, "w").write(s)
    return len(s.encode())


def bangun(hanya_provinsi=False):
    lama = {k: json.load(open(os.path.join(GEO, "kecamatan", k + ".json")))["features"] for k in KODE}
    urut_kab = {k: [f["properties"]["kab"] for f in json.load(open(os.path.join(GEO, "kabupaten", k + ".json")))["features"]] for k in KODE}
    urut_prov = [f["properties"]["kode"] for f in json.load(open(os.path.join(GEO, "provinsi.json")))["features"]]
    kec, kab, prov = {}, {}, {}
    with tempfile.TemporaryDirectory() as tmp:
        for g in GUGUS:
            masuk = [os.path.join(KUNCI, k + ".json") for k in g]
            o1, o2, o3 = (os.path.join(tmp, f"{n}_{g[0]}.json") for n in ("kec", "kab", "prov"))
            if not hanya_provinsi:
                print(g, ms("-i", *masuk, "combine-files", "-merge-layers", "force", "name=kec",
                            "-dissolve", "kunci", "copy-fields=prov,kab,kec",
                            "-simplify", "weighted", f"interval={INTERVAL_KEC}", "keep-shapes",
                            "-dissolve", "prov,kab", "+", "name=kab",
                            "-o", o1, "target=kec", "format=geojson", f"precision={PRESISI}",
                            "-o", o2, "target=kab", "format=geojson", f"precision={PRESISI}").strip().replace("\n", " | "), file=sys.stderr)
            ms("-i", *masuk, "combine-files", "-merge-layers", "force", "-dissolve", "prov",
               "-simplify", "weighted", f"interval={INTERVAL_PROV}", "keep-shapes", "-o", o3, "format=geojson", f"precision={PRESISI}")
            if not hanya_provinsi:
                for f in json.load(open(o1))["features"]:
                    kec[(f["properties"]["prov"], f["properties"]["kab"], f["properties"]["kec"])] = f
                for f in json.load(open(o2))["features"]:
                    kab[(f["properties"]["prov"], f["properties"]["kab"])] = f
            for f in json.load(open(o3))["features"]:
                prov[f["properties"]["prov"]] = f
    for d in (kec, kab, prov):  # pulau kecil dibuang per tingkat, satu topologi
        buang_pulau(list(d.values()), PULAU_PROV_HA if d is prov else PULAU_KEC_HA)
    ukuran = collections.defaultdict(dict)
    hilang = []
    for k in ([] if hanya_provinsi else KODE):
        F = []
        sudah = set()  # data lama punya kunci ganda (Batu Bara / Lima Puluh dua kali): satu fitur saja
        for f in lama[k]:
            p = f["properties"]
            g = kec.get((k, p["kab"], p["kec"]))
            if (p["kab"], p["kec"]) in sudah:
                continue
            sudah.add((p["kab"], p["kec"]))
            if g:
                F.append({"type": "Feature", "properties": {"kec": p["kec"], "kab": p["kab"]}, "geometry": g["geometry"]})
            else:
                hilang.append(f"{k} {p['kab']} / {p['kec']}")
        ukuran["kecamatan"][k] = tulis(os.path.join(GEO, "kecamatan", k + ".json"), F)
        ukuran["kabupaten"][k] = tulis(os.path.join(GEO, "kabupaten", k + ".json"),
                                       [{"type": "Feature", "properties": {"kab": n}, "geometry": kab[(k, n)]["geometry"]} for n in urut_kab[k]])
    ukuran["provinsi"]["*"] = tulis(os.path.join(GEO, "provinsi.json"),
                                    [{"type": "Feature", "properties": {"kode": k}, "geometry": prov[k]["geometry"]} for k in urut_prov])
    for t, u in ukuran.items():
        print(f"{t}: total {sum(u.values()) // 1024} KB, terbesar {max(u.values()) // 1024} KB ({max(u, key=u.get)})", file=sys.stderr)
    print("kecamatan lama tanpa geometri BIG (tidak digambar):", hilang, file=sys.stderr)


# ---------------------------------------------------------------- uji
def _potong(a, b, c, d):
    s = lambda o, p, q: (p[0] - o[0]) * (q[1] - o[1]) - (p[1] - o[1]) * (q[0] - o[0])
    return s(a, b, c) * s(a, b, d) < 0 and s(c, d, a) * s(c, d, b) < 0


def silang(cincin):
    """Jumlah pasangan segmen yang berpotongan sejati (sapuan x) di dalam sekumpulan cincin."""
    seg = sorted(((r[i], r[i + 1]) if r[i][0] <= r[i + 1][0] else (r[i + 1], r[i]) for r in cincin for i in range(len(r) - 1)),
                 key=lambda e: e[0][0])
    n = 0
    for a in range(len(seg)):
        xa = seg[a][1][0]
        for b in range(a + 1, len(seg)):
            if seg[b][0][0] > xa:
                break
            if _potong(*seg[a], *seg[b]):
                n += 1
    return n


def uji():
    """Invarian berkas terbit: skema & kunci sama dengan sebelum dibangun ulang (dicek terhadap pembaca),
    cincin sah dan tidak saling silang di dalam satu berkas (tumpang tindih tetangga = silang antar-cincin),
    tiap titik sampel di dalam paling banyak SATU kecamatan, titik di dalam kab/kota ada di kecamatannya, ukuran di bawah pagu."""
    salah = []
    prov = json.load(open(os.path.join(GEO, "provinsi.json")))["features"]
    if sorted(f["properties"]["kode"] for f in prov) != sorted(KODE) or any(set(f["properties"]) != {"kode"} for f in prov):
        salah.append("provinsi.json: harus 38 fitur {kode}")
    for nama, F in [("provinsi.json", prov)] + [(f"{t}/{k}.json", json.load(open(os.path.join(GEO, t, k + ".json")))["features"])
                                                  for t in ("kabupaten", "kecamatan") for k in KODE]:
        ukuran = os.path.getsize(os.path.join(GEO, nama))
        if ukuran > PAGU[nama.split("/")[0].split(".")[0]]:
            salah.append(f"{nama}: {ukuran // 1024} KB > pagu")
        cincin = []
        for f in F:
            if not f.get("geometry") or f["geometry"]["type"] not in ("Polygon", "MultiPolygon"):
                salah.append(f"{nama}: {f['properties']} tanpa poligon")
                continue
            for p in bagian(f["geometry"]):
                for r in p:
                    if len(r) < 4 or r[0] != r[-1]:
                        salah.append(f"{nama}: {f['properties']} cincin tidak tertutup / < 4 simpul")
                    cincin.append(r)
        n = silang(cincin)
        if n:
            salah.append(f"{nama}: {n} pasang segmen berpotongan (cincin rusak atau poligon bertumpuk)")
    for k in KODE:
        kec = json.load(open(os.path.join(GEO, "kecamatan", k + ".json")))["features"]
        kab = json.load(open(os.path.join(GEO, "kabupaten", k + ".json")))["features"]
        if any(set(f["properties"]) != {"kec", "kab"} for f in kec) or any(set(f["properties"]) != {"kab"} for f in kab):
            salah.append(f"{k}: skema properti berubah")
        if {f["properties"]["kab"] for f in kec} - {None} != {f["properties"]["kab"] for f in kab}:  # data lama: 1 fitur tanpa nama di 12 & 13
            salah.append(f"{k}: nama kab/kota di kecamatan dan kabupaten tidak sama")
        IK, IB = Indeks(kec), Indeks(kab)
        xs = [c[0] for f in kab for p in bagian(f["geometry"]) for c in p[0]]
        ys = [c[1] for f in kab for p in bagian(f["geometry"]) for c in p[0]]
        langkah = max(max(xs) - min(xs), max(ys) - min(ys)) / 120
        ganda = celah = beda = 0
        y = min(ys) + langkah / 2.718
        while y < max(ys):
            x = min(xs) + langkah / 3.14
            while x < max(xs):
                di_kab = IB.cari(x, y)
                isi = IK.semua(x, y)
                ganda += len(isi) > 1
                if di_kab is not None and not isi:
                    celah += 1
                elif di_kab is not None and kec[isi[0]]["properties"]["kab"] not in (None, kab[di_kab]["properties"]["kab"]):
                    beda += 1
                x += langkah
            y += langkah
        if ganda or celah or beda:
            salah.append(f"{k}: sampel titik di >1 kecamatan {ganda}, di kab tapi tanpa kecamatan {celah}, kab tak cocok {beda}")
    salah += tally_kemendagri()
    if salah:
        sys.exit("batas uji GAGAL:\n  " + "\n  ".join(salah[:40]))
    print("batas uji: 38 provinsi, skema, cincin, tanpa silang, sampel tanpa tumpang tindih/celah, ukuran OK")


SELISIH = os.path.join(os.path.dirname(__file__), "selisih_kemendagri.json")


def hitung_selisih():
    """{kunci "NN|Kab": [jumlah kecamatan BIG, jumlah kecamatan Kemendagri]} untuk kab/kota yang tidak sama. Kemendagri =
    kode kecamatan unik (NN.NN.NN) di public/geo/desa/<kode kab>.json; peta kode di public/data/kemitraan/kode.json."""
    big = collections.Counter()
    for k in KODE:
        for f in json.load(open(os.path.join(GEO, "kecamatan", k + ".json")))["features"]:
            big[f"{k}|{f['properties']['kab']}"] += 1
    out = {}
    for v in json.load(open(os.path.join(AKAR, "public/data/kemitraan/kode.json"))).values():
        p = os.path.join(GEO, "desa", f"{v.get('kemendagri')}.json")
        if not v.get("kemendagri") or not os.path.exists(p):
            continue
        n = len({f["properties"]["kd"][:8] for f in json.load(open(p))["features"]})
        if big.get(v["kunci_nama"], 0) != n:
            out[v["kunci_nama"]] = [big.get(v["kunci_nama"], 0), n]
    return out


def tally_kemendagri():
    """Batas BIG wajib tally dengan Kemendagri (pemilik 31 Okt 2026, setelah Papua Selatan tertulis 80 kecamatan padahal
    Kemendagri 82: Tomor Birip dan Sor Ep di Asmat belum berbatas di BIG). Selisih lama tercatat di selisih_kemendagri.json
    sebagai utang yang hanya boleh menyusut: kab/kota baru yang tidak tally, atau selisih yang membesar, GAGAL.
    Perbarui data BIG (ambil, cocok, bangun) lalu tulis ulang berkasnya: python3 scripts/geo/batas.py selisih"""
    lama = json.load(open(SELISIH))["kab"]
    salah = []
    for k, (b, n) in hitung_selisih().items():
        if k not in lama:
            salah.append(f"{k}: kecamatan BIG {b} != Kemendagri {n} (selisih baru; BIG harus tally dengan Kemendagri)")
        elif abs(b - n) > abs(lama[k][0] - lama[k][1]):
            salah.append(f"{k}: selisih BIG {b} vs Kemendagri {n} membesar dari {lama[k]}")
    return salah


def tulis_selisih():
    d = {"_catatan": "Utang tally batas BIG vs Kemendagri (pemilik 31 Okt 2026). Hanya boleh menyusut; dicek batas.py uji. "
                     "BIG 0 = biasanya nama kab beda kunci (perlu pemetaan nama), bukan poligon hilang.",
         "kab": dict(sorted(hitung_selisih().items()))}
    json.dump(d, open(SELISIH, "w"), ensure_ascii=False, indent=1)
    print(f"{len(d['kab'])} kab/kota tidak tally -> {SELISIH}")


if __name__ == "__main__":
    if sys.argv[1:] == ["bangun", "provinsi"]:  # hanya provinsi.json (menyetel INTERVAL_PROV tanpa 15 menit kecamatan)
        bangun(True)
    else:
        {"ambil": ambil, "cocok": cocok, "bangun": bangun, "uji": uji, "selisih": tulis_selisih}[sys.argv[1]]()
