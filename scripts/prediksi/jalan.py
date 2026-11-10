"""Titik rawan putus jalan per kab/kota -> public/prediksi/data/jalan.json. PETA PAPARAN, BUKAN PELUANG JALAN PUTUS.

Jalan utama OSM (highway trunk/primary/secondary/tertiary) per kotak batas kab, diunduh lewat Overpass (cache berkas di
data/raw/prediksi/osm/<id>.json, tidak di-git; hapus berkas untuk menarik ulang). Graf: simpul = simpul OSM (atau koordinat bila
Overpass tak memberi id), sisi = ruas antar dua simpul berurutan. Jembatan graf (bridge edge, Tarjan lowpoint, iteratif) = ruas
tunggal yang kalau hilang memisahkan jaringan; bobot terisolir = panjang jalan (km) di sisi yang lebih kecil. Hanya komponen
terbesar dihitung. Satu way dilaporkan sekali dengan terisolir terbesarnya. `jembatan` = tag bridge OSM bukan "no" (fisik jembatan),
berbeda dari "jembatan graf". Kotak persegi memotong jaringan di tepi, jadi ruas di tepi kab bisa tampak tunggal padahal tersambung
ke luar kotak (batas atas); jaringan jalan OSM tidak lengkap di daerah terpencil.
Pakai: python3 scripts/prediksi/jalan.py <id kab> [<id kab> ...]   (id Kepmendagri 4 digit; hasil digabung ke jalan.json)
       python3 scripts/prediksi/jalan.py giliran [--maks N]   (N kab, bawaan 15, yang belum ada / `dihitung`-nya paling lama; gagal diulang
         di giliran berikut; exit 1 hanya bila ada yang dicoba dan nol berhasil; giliran lebih dulu memanggil tangga.py (Tangga Peringatan, gagal-lunak))
       python3 scripts/prediksi/jalan.py uji     (tanpa jaringan)
Lari penuh 514 kab = giliran berputar oleh workflow terjadwal, jeda 5 detik per kueri.
"""
import json, math, os, sys, time, urllib.parse, urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import dasar as D  # noqa: E402

MENTAH = os.path.join(D.AKAR, "data", "raw", "prediksi", "osm")
KELUAR = os.path.join(D.DATA, "jalan.json")
SERVER = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter"]
KELAS = "trunk|primary|secondary|tertiary"
TOP = 10
LABEL = "Peta paparan: ruas tunggal yang bila hilang memisahkan bagian jaringan jalan utama OSM. Bukan peluang jalan putus."


def km(a, b):
    return 111.19 * math.hypot(a[0] - b[0], (a[1] - b[1]) * math.cos(math.radians((a[0] + b[0]) / 2)))


def graf(ways, b=None):
    """ways = [{id, tags, nodes:[kunci], geom:[(lat,lon)]}] -> (adj {u: [(v, id sisi)]}, sisi [(u, v, km, way)]).
    b = kotak (s, w, n, e): simpul di luar kotak dilebur jadi satu simpul "LUAR" (jalan yang keluar kotak dianggap tersambung ke luar,
    bukan ujung buntu)."""
    adj, sisi = {}, []
    luar = lambda p: b and not (b[0] <= p[0] <= b[2] and b[1] <= p[1] <= b[3])
    for w in ways:
        nodes = ["LUAR" if luar(p) else n for n, p in zip(w["nodes"], w["geom"])]
        for i in range(len(nodes) - 1):
            u, v = nodes[i], nodes[i + 1]
            if u == v:
                continue
            adj.setdefault(u, []).append((v, len(sisi)))
            adj.setdefault(v, []).append((u, len(sisi)))
            sisi.append((u, v, km(w["geom"][i], w["geom"][i + 1]), w["id"]))
    return adj, sisi


def jembatan_graf(adj, sisi):
    """Tarjan iteratif pada komponen terbesar. -> (daftar (id sisi, km terisolir), total km komponen). Sisi paralel dibedakan lewat id sisi."""
    seen, terbesar = set(), []
    for s in adj:
        if s in seen:
            continue
        komp, st = [s], [s]
        seen.add(s)
        while st:
            for v, _ in adj[st.pop()]:
                if v not in seen:
                    seen.add(v); komp.append(v); st.append(v)
        if len(komp) > len(terbesar):
            terbesar = komp
    if not terbesar:
        return [], 0.0
    bobot = {u: sum(sisi[e][2] for _, e in adj[u]) / 2 for u in terbesar}
    total = sum(bobot.values())
    idx, low, sub, hasil, t = {}, {}, dict(bobot), [], 0
    akar = terbesar[0]
    idx[akar] = low[akar] = 0
    st = [(akar, None, iter(adj[akar]))]
    while st:
        u, pe, it = st[-1]
        for v, e in it:
            if e == pe:
                continue
            if v in idx:
                low[u] = min(low[u], idx[v])
            else:
                t += 1
                idx[v] = low[v] = t
                st.append((v, e, iter(adj[v])))
                break
        else:
            st.pop()
            if st:
                p = st[-1][0]
                low[p] = min(low[p], low[u])
                sub[p] += sub[u]
                if low[u] > idx[p]:
                    hasil.append((pe, min(sub[u], total - sub[u])))
    return hasil, total


# ruas_tunggal menghitung tiap SEGMEN antar-titik bentuk (jalan buntu 100 titik = 100), jadi bukan ukuran yang dibaca orang.
# way_rawan = way OSM yang bila putus memisahkan >= KM_RAWAN km jalan utama: ukuran yang tampil di layar.
KM_RAWAN = 1.0


def ringkas(ways, b=None):
    adj, sisi = graf(ways, b)
    jb, total = jembatan_graf(adj, sisi)
    tag = {w["id"]: w["tags"] for w in ways}
    per = {}
    for e, kt in jb:
        w = sisi[e][3]
        o = per.setdefault(w, {"way": w, "nama": tag[w].get("name") or tag[w].get("ref"), "kelas": tag[w].get("highway"),
                                "jembatan": tag[w].get("bridge", "no") != "no", "ruas": 0, "km_terisolir": 0.0})
        o["ruas"] += 1
        o["km_terisolir"] = max(o["km_terisolir"], round(kt, 2))
    top = sorted(per.values(), key=lambda o: (-o["km_terisolir"], o["way"]))
    return {"way": len(ways), "km_jaringan": round(total, 1), "ruas_tunggal": len(jb), "way_tunggal": len(per), "way_rawan": sum(o["km_terisolir"] >= KM_RAWAN for o in per.values()), "km_rawan": KM_RAWAN,
            "jembatan_tunggal": sum(o["jembatan"] for o in per.values()), "top": top[:TOP]}


def baca_ways(j):
    out = []
    for e in j.get("elements", []):
        g = e.get("geometry")
        if e.get("type") != "way" or not g or any(p is None for p in g):
            continue
        geom = [(p["lat"], p["lon"]) for p in g]
        n = e.get("nodes")
        out.append({"id": e["id"], "tags": e.get("tags", {}), "geom": geom, "nodes": n if n and len(n) == len(geom) else geom})
    return out


def kotak(geo):
    """geo = 'prov|nama kab' -> (s, w, n, e) dari poligon public/geo/kabupaten/<prov>.json, atau None."""
    prov, nama = geo.split("|", 1)
    xs, ys = [], []

    def jalan(c):
        if isinstance(c[0], (int, float)):
            xs.append(c[0]); ys.append(c[1])
        else:
            for d in c:
                jalan(d)
    for f in D.baca(os.path.join(D.AKAR, "public", "geo", "kabupaten", f"{prov}.json"), {"features": []})["features"]:
        if f["properties"].get("kab") == nama:
            jalan(f["geometry"]["coordinates"])
    return (min(ys) - .02, min(xs) - .02, max(ys) + .02, max(xs) + .02) if xs else None


def overpass(kid, b):
    berkas = os.path.join(MENTAH, kid + ".json")
    if os.path.exists(berkas):
        return json.load(open(berkas))
    q = f'[out:json][timeout:180];way["highway"~"^({KELAS})$"]({b[0]:.4f},{b[1]:.4f},{b[2]:.4f},{b[3]:.4f});out geom;'
    data = urllib.parse.urlencode({"data": q}).encode()
    for coba in range(int(os.environ.get("JALAN_COBA", 6))):
        try:
            req = urllib.request.Request(SERVER[coba % 2], data, headers={"User-Agent": "poskokarhutla/1.0 (peta paparan jalan; github.com/terasurbannetwork/poskokarhutla)"})
            raw = urllib.request.urlopen(req, timeout=240).read()
            j = json.loads(raw)
            if "remark" in j and "error" in j["remark"]:
                raise RuntimeError(j["remark"][:200])
            os.makedirs(MENTAH, exist_ok=True)
            open(berkas, "wb").write(raw)
            time.sleep(5)  # sopan: satu kueri sekali jalan
            return j
        except Exception as x:
            print(f"  gagal {kid}: {x}; tunggu {30 * (coba + 1)} s", file=sys.stderr)
            time.sleep(30 * (coba + 1))
    return None


def pilih(ids, kab_d, maks):
    """Giliran: kab yang belum ada dulu, lalu `dihitung` paling lama; seri diurut id (deterministik)."""
    return sorted(ids, key=lambda i: ((kab_d.get(i) or {}).get("dihitung", "") if "way_rawan" in (kab_d.get(i) or {}) else "", i))[:maks]


def jalankan(ids):
    """-> (jumlah berhasil, jumlah dicoba). Disimpan setiap kab berhasil, jadi lari yang terpotong tidak kehilangan hasil."""
    ok = 0
    kabs = {k["id"]: k for k in D.kab()}
    d = D.baca(KELUAR, None) or {"label": LABEL, "sumber": "OpenStreetMap via Overpass (ODbL, (c) kontributor OpenStreetMap), highway " + KELAS, "kab": {}}
    d["dibuat"] = D.hari_ini()
    batas = time.time() + float(os.environ["JALAN_DETIK"]) if os.environ.get("JALAN_DETIK") else None   # anggaran waktu lari CI
    dicoba = 0
    for i in ids:
        if batas and time.time() > batas:
            print(f"jalan: anggaran waktu habis, {len(ids) - dicoba} kab menunggu giliran berikut", file=sys.stderr)
            break
        dicoba += 1
        k = kabs.get(i)
        b = k and kotak(k["geo"])
        if not b:
            print(f"jalan: {i} tidak dikenal atau tanpa poligon; dilewati", file=sys.stderr)
            continue
        j = overpass(i, b)
        if j is None:
            print(f"jalan: {i} {k['nama']}: Overpass menyerah; dilewati", file=sys.stderr)
            continue
        d["kab"][i] = {**ringkas(baca_ways(j), b), "dihitung": d["dibuat"]}
        ok += 1
        D.simpan(KELUAR, d)
        print(f"jalan: {i} {k['nama']}: {d['kab'][i]['way']} way, {d['kab'][i]['way_rawan']} way rawan (>= {KM_RAWAN:g} km terpisah)")
    D.simpan(KELUAR, d)
    return ok, dicoba


def giliran(maks=15):
    ids = pilih([k["id"] for k in D.kab()], (D.baca(KELUAR, None) or {}).get("kab", {}), maks)
    ok, n = jalankan(ids)
    print(f"jalan: giliran {ok}/{n} kab berhasil")
    return 1 if n and not ok else 0


def uji():
    kd = {"1101": {"dihitung": "2026-10-01", "way_rawan": 0}, "1102": {"dihitung": "2026-09-01", "way_rawan": 0}, "1104": {}}
    assert pilih(["1101", "1106"], {"1101": {"dihitung": "2026-10-01", "way_rawan": 0}, "1106": {"dihitung": "2026-11-01"}}, 1) == ["1106"], "entri lama tanpa way_rawan dihitung ulang dulu"
    assert pilih(["1101", "1102", "1103", "1104", "1105"], kd, 3) == ["1103", "1104", "1105"], "yang belum ada / tanpa tanggal dulu, urut id"
    assert pilih(["1101", "1102", "1103"], kd, 2) == ["1103", "1102"] and pilih(["1101", "1102"], kd, 15) == ["1102", "1101"], "terlama dulu"
    def W(i, ns, **tag):
        return {"id": i, "tags": tag, "nodes": ns, "geom": [(0.0, n * 0.01) for n in ns]}
    # lingkaran 1-2-3-4-1 (tanpa jembatan) + ekor 4-5-6 (way 20, dua ruas jembatan graf) + jembatan fisik 1-7 (way 30), 7 buntu
    ways = [W(10, [1, 2, 3, 4, 1], highway="primary"), W(20, [4, 5, 6], highway="secondary", name="Jl Ekor"), W(30, [1, 7], highway="trunk", bridge="yes", name="Jembatan X")]
    r = ringkas(ways)
    assert r["ruas_tunggal"] == 3 and r["way_tunggal"] == 2 and r["jembatan_tunggal"] == 1, r
    pendek = {**W(30, [1, 7], highway="trunk"), "geom": [(0.0, 0.01), (0.0, 0.012)]}   # buntu ~0,2 km: bukan rawan
    assert r["way_rawan"] == 2 and ringkas(ways[:2] + [pendek])["way_rawan"] == 1, "rawan hanya bila >= KM_RAWAN km terpisah"
    t = {o["way"]: o for o in r["top"]}
    assert t[20]["ruas"] == 2 and not t[20]["jembatan"] and t[30]["jembatan"], r
    assert t[20]["km_terisolir"] > 0 and t[30]["km_terisolir"] > 0, r
    assert 10 not in t, "lingkaran bukan titik tunggal"
    # sisi paralel (dua way di pasangan simpul sama) bukan jembatan; garis lurus murni: semua ruas tunggal
    assert ringkas([W(1, [1, 2], highway="primary"), W(2, [1, 2], highway="primary")])["ruas_tunggal"] == 0
    assert ringkas([W(1, [1, 2, 3], highway="primary")])["ruas_tunggal"] == 2
    # hanya komponen terbesar yang dihitung
    assert ringkas(ways + [W(40, [8, 9], highway="primary")])["ruas_tunggal"] == 3
    assert ringkas([])["ruas_tunggal"] == 0
    # jalan yang keluar kotak bukan buntu: lintasan 1-2-3 dengan 1 dan 3 di luar kotak membentuk simpul LUAR -> lingkaran, tanpa jembatan
    assert ringkas([W(1, [1, 2, 3], highway="primary")], (-1, 0.015, 1, 0.025))["ruas_tunggal"] == 0
    # rantai panjang tidak memicu batas rekursi
    assert ringkas([W(1, list(range(1, 20001)), highway="primary")])["ruas_tunggal"] == 19999
    assert baca_ways({"elements": [{"type": "way", "id": 1, "geometry": [{"lat": 0, "lon": 0}, None]}]}) == []
    print("jalan: uji lulus")


if __name__ == "__main__":
    a = sys.argv[1:]
    if a == ["uji"]:
        uji()
    elif a[:1] == ["giliran"]:
        try:   # Tangga Peringatan dirantai di sini, lebih dulu: cepat, dan Overpass di bawah sering lambat; kegagalannya tidak menggagalkan jalan.py
            import tangga
            tangga.jalankan()
        except Exception as e:  # noqa: BLE001
            print(f"jalan: tangga dilewati ({type(e).__name__}: {e})", file=sys.stderr)
        sys.exit(giliran(int(a[a.index("--maks") + 1]) if "--maks" in a else 15))
    elif a:
        jalankan(a)
    else:
        sys.exit(__doc__)
