"""NA-02 Topologi neraca air Jawa: sub-DAS HydroBASINS x kab/kota x sel iklim 0,1 derajat -> topologi.json (di-commit).

Sekali, lokal (zip HydroBASINS 52 MB tidak ada di CI). Cara: kisi sampel 0,01 derajat (~1,2 km2 per titik) di atas
poligon kab; tiap titik dicari sub-DAS-nya (scanline even-odd, sama dengan `Garis` di scripts/banjir/bukti_das.py) dan
sel iklim 0,1 derajat-nya (kisi ERA5-Land). Luas tiap irisan (sub-DAS, kab, sel) = jumlah luas titik.

- Sub-DAS: HydroBASINS v1c level 09 (Lehner & Grill 2013), `data/raw/banjir/das/hybas_{au,as}_lev09_v1c.zip` (Jawa di "au"), rantai
  NEXT_DOWN. RANCANGAN menyebut level 12; yang ada di repo level 09 (unduh level 12 = tiket terpisah).
  ponytail: level 09 lebih kasar, kota kecil mendapat aliran menurut pecahan luas saja.
- Kab: `data/kajian-bnpb/data/air-jawa/peta_kab.geojson` (119 kab/kota, kode Kemendagri; geometri disederhanakan).
- Titik di kab yang tidak jatuh di sub-DAS mana pun (celah pantai) = sub-DAS semu `-kode` yang langsung ke laut.
- Sub-DAS yang next_down-nya di luar himpunan = keluar ke laut (nd 0).
- `titik`: sub-DAS tempat waduk dan ujung transfer (dari waduk.csv) agar neraca.py tak perlu zip.

Pakai:  python3 scripts/air/neraca/topologi.py        bangun topologi.json
        python3 scripts/air/neraca/topologi.py uji    swa-uji tanpa zip
"""
import collections, csv, json, math, os, sys

DIR = os.path.dirname(os.path.abspath(__file__))
AKAR = os.path.abspath(os.path.join(DIR, "../../.."))
sys.path.insert(0, os.path.join(AKAR, "scripts/scrape"))

ZIP = [os.path.join(AKAR, f"data/raw/banjir/das/hybas_{w}_lev09_v1c.zip") for w in ("au", "as")]   # Jawa ada di "au" (Australasia)
KAB = os.path.join(AKAR, "data/kajian-bnpb/data/air-jawa/peta_kab.geojson")
WADUK = os.path.join(DIR, "waduk.csv")
KELUAR = os.path.join(DIR, "topologi.json")
DX = 0.01                       # derajat, kisi sampel
X0, Y0, NX, NY = 105.0, -9.0, 1130, 410   # 105,0-116,3 BT, 9,0-4,9 LS: semua kab Jawa (Kangean 116,27)
SEL = 0.1                       # kisi iklim ERA5-Land


def km2_titik(lat, dx=DX):
    return (dx * 111.32 * math.cos(math.radians(lat))) * (dx * 110.574)


def kunci_sel(lat, lon):
    """pusat sel 0,1 derajat yang memuat (lat, lon) -> 'lat,lon' 2 desimal"""
    return f"{(math.floor(lat / SEL + 1e-9) + 0.5) * SEL:.2f},{(math.floor(lon / SEL + 1e-9) + 0.5) * SEL:.2f}"


def rasterkan(poligon, x0=X0, y0=Y0, dx=DX, nx=NX, ny=NY):
    """poligon {id: [cincin [(x, y)...]]} -> {baris: [(c0, c1, id)]} kolom inklusif, titik pusat even-odd.
    Sisi dikelompokkan per baris yang dilintasinya: kerja ~ jumlah sisi + jumlah silang, bukan sisi x baris."""
    baris = collections.defaultdict(lambda: collections.defaultdict(list))
    for i, rings in poligon.items():
        for r in rings:
            for (x1, y1), (x2, y2) in zip(r, r[1:] + r[:1]):
                if y1 == y2:
                    continue
                lo, hi = min(y1, y2), max(y1, y2)
                r0 = max(0, math.ceil((lo - y0) / dx - 0.5))
                r1 = min(ny - 1, math.floor((hi - y0) / dx - 0.5))
                for rr in range(r0, r1 + 1):
                    yc = y0 + (rr + 0.5) * dx
                    if (y1 > yc) != (y2 > yc):
                        baris[rr][i].append(x1 + (yc - y1) * (x2 - x1) / (y2 - y1))
    hasil = {}
    for rr, per_id in baris.items():
        iv = []
        for i, xs in per_id.items():
            xs.sort()
            for a, b in zip(xs[0::2], xs[1::2]):
                c0 = max(0, math.ceil((a - x0) / dx - 0.5))
                c1 = min(nx - 1, math.floor((b - x0) / dx - 0.5))
                if c0 <= c1:
                    iv.append((c0, c1, i))
        hasil[rr] = sorted(iv)
    return hasil


def cari(raster, rr, cc):
    for c0, c1, i in raster.get(rr, ()):
        if c0 <= cc <= c1:
            return i
    return None


def irisan(kab_r, das_r, nd, y0=Y0, x0=X0, dx=DX):
    """-> subdas {id: {"nd", "km2", "kab": {kode: {sel: km2}}}}; titik kab tanpa sub-DAS -> id semu -kode"""
    sub = {}
    for rr, kiv in kab_r.items():
        lat = y0 + (rr + 0.5) * dx
        a = km2_titik(lat, dx)
        div = das_r.get(rr, [])
        for c0, c1, kode in kiv:
            for cc in range(c0, c1 + 1):
                d = next((i for d0, d1, i in div if d0 <= cc <= d1), None)
                if d is None:
                    d = -int(kode)
                s = sub.setdefault(d, {"nd": nd.get(d, 0), "km2": 0.0, "kab": {}})
                s["km2"] += a
                sel = kunci_sel(lat, x0 + (cc + 0.5) * dx)
                kb = s["kab"].setdefault(kode, {})
                kb[sel] = kb.get(sel, 0.0) + a
    for s in sub.values():   # aliran ke sub-DAS di luar himpunan = ke laut
        if s["nd"] not in sub:
            s["nd"] = 0
    return sub


def periksa(t):
    """kontrak topologi: rantai tanpa siklus, luas positif, nd ada atau 0. Melempar AssertionError."""
    sub = t["subdas"]
    assert sub, "topologi kosong"
    for i, s in sub.items():
        assert s["nd"] == 0 or str(s["nd"]) in sub, f"sub-DAS {i}: next_down {s['nd']} tidak ada"
        assert s["km2"] > 0 and s["kab"], f"sub-DAS {i}: luas {s['km2']} / tanpa kab"
        tot = sum(v for kb in s["kab"].values() for v in kb.values())
        assert abs(tot - s["km2"]) < 1e-6 * max(1, tot), f"sub-DAS {i}: jumlah irisan {tot} != luas {s['km2']}"
    for i in sub:   # siklus: tiap rantai harus sampai 0 dalam len(sub) langkah
        j, n = i, 0
        while j != "0" and n <= len(sub):
            j, n = str(sub[j]["nd"]), n + 1
        assert j == "0", f"siklus NEXT_DOWN mulai sub-DAS {i}"


def bangun():
    import lahan as L
    fit = json.load(open(KAB))["features"]
    kab = {}
    for f in fit:
        g = f["geometry"]
        poli = [g["coordinates"]] if g["type"] == "Polygon" else g["coordinates"]
        kab[f["properties"]["kode"]] = [[tuple(p) for p in ring] for pl in poli for ring in pl]
    print(f"kab {len(kab)}", file=sys.stderr)
    das, nd, luas_hb = {}, {}, {}
    for p, rings in (x for z in ZIP if os.path.exists(z) for x in L.baca_shp(z)):
        if not rings:
            continue
        xs = [q[0] for r in rings for q in r]
        ys = [q[1] for r in rings for q in r]
        if max(xs) < X0 or min(xs) > X0 + NX * DX or max(ys) < Y0 or min(ys) > Y0 + NY * DX:
            continue
        i = int(p["hybas_id"])
        das[i], nd[i], luas_hb[i] = rings, int(p["next_down"]), float(p["sub_area"])
    print(f"sub-DAS di kotak Jawa {len(das)}", file=sys.stderr)
    assert das, f"tidak ada sub-DAS HydroBASINS di kotak Jawa dari {ZIP}"
    kab_r, das_r = rasterkan(kab), rasterkan(das)
    sub = irisan(kab_r, das_r, nd)
    titik = {}
    if os.path.exists(WADUK):
        for w in csv.DictReader(open(WADUK)):
            for k in ("", "_tujuan"):
                if w.get("lon" + k):
                    lon, lat = float(w["lon" + k]), float(w["lat" + k])
                    d = cari(das_r, round((lat - Y0) / DX - 0.5), round((lon - X0) / DX - 0.5))
                    titik[w["id"] + k] = d if d in sub else None
    t = {"meta": {"sumber": {"das": "HydroBASINS v1c level 09 (Lehner & Grill 2013), hybas_au_lev09_v1c.zip (+ as)",
                             "kab": "data/kajian-bnpb/data/air-jawa/peta_kab.geojson (BIG via public/geo/kabupaten)"},
                  "kisi_sampel_derajat": DX, "sel_iklim_derajat": SEL, "label": "olah(resmi)",
                  "catatan": "luas dari sampel titik 0,01 derajat; id negatif = celah pantai tanpa sub-DAS, langsung ke laut"},
         "titik": titik,
         "subdas": {str(i): {"nd": s["nd"], "km2": round(s["km2"], 3),
                             "kab": {k: {c: round(v, 3) for c, v in kb.items()} for k, kb in s["kab"].items()}}
                    for i, s in sorted(sub.items())}}
    for s in t["subdas"].values():   # luas dibulatkan dari irisan supaya kontrak jumlah tetap tepat
        s["km2"] = round(sum(v for kb in s["kab"].values() for v in kb.values()), 3)
    periksa(t)
    kabl = collections.Counter()
    for s in t["subdas"].values():
        for k, kb in s["kab"].items():
            kabl[k] += sum(kb.values())
    hilang = sorted(set(kab) - set(kabl))
    assert not hilang, f"kab tanpa topologi: {hilang}"
    sel = {c for s in t["subdas"].values() for kb in s["kab"].values() for c in kb}
    luas = sum(kabl.values())
    nyata = [s["km2"] for i, s in t["subdas"].items() if int(i) > 0]
    t["meta"].update({"n_subdas": len(nyata), "n_semu": len(t["subdas"]) - len(nyata), "n_sel": len(sel),
                      "luas_km2": round(luas), "luas_rerata_subdas_km2": round(sum(nyata) / len(nyata), 1)})
    os.makedirs(os.path.dirname(KELUAR), exist_ok=True)
    json.dump(t, open(KELUAR, "w"), separators=(",", ":"))
    print(json.dumps(t["meta"], ensure_ascii=False), file=sys.stderr)


def uji():
    # dua kotak kab berdampingan, tiga sub-DAS berantai 1 -> 2 -> 3 -> laut melintasi batas kab
    kab = {"3401": [[(0, 0), (0.05, 0), (0.05, 0.04), (0, 0.04)]], "3402": [[(0.05, 0), (0.1, 0), (0.1, 0.04), (0.05, 0.04)]]}
    das = {1: [[(0, 0), (0.03, 0), (0.03, 0.04), (0, 0.04)]], 2: [[(0.03, 0), (0.07, 0), (0.07, 0.04), (0.03, 0.04)]],
           3: [[(0.07, 0), (0.09, 0), (0.09, 0.04), (0.07, 0.04)]]}
    kw = dict(x0=0, y0=0, dx=0.01, nx=10, ny=4)
    sub = irisan(rasterkan(kab, **kw), rasterkan(das, **kw), {1: 2, 2: 3, 3: 99}, y0=0, x0=0, dx=0.01)
    assert sub[1]["nd"] == 2 and sub[3]["nd"] == 0, "next_down di luar himpunan harus jadi laut (0)"
    assert set(sub[2]["kab"]) == {"3401", "3402"}, "sub-DAS 2 melintasi dua kab"
    assert -3402 in sub, "kolom 0,09-0,10 tanpa sub-DAS harus jadi sub-DAS semu -kode"
    n = {i: round(s["km2"] / km2_titik(0.02, 0.01)) for i, s in sub.items()}   # cos(lat) ~ 1 di sini
    assert sum(n.values()) == 40 and n[1] == 12 and n[2] == 16 and n[3] == 8, n   # 10 x 4 titik, tiap titik tepat satu
    assert kunci_sel(-7.95, 110.36) == "-7.95,110.35" and kunci_sel(-8.0, 110.0) == "-7.95,110.05"
    t = {"subdas": {str(i): {**s, "nd": s["nd"]} for i, s in sub.items()}}
    periksa(t)
    for rusak, pesan in (({"1": {"nd": 2, "km2": 1, "kab": {"x": {"c": 1}}}, "2": {"nd": 1, "km2": 1, "kab": {"x": {"c": 1}}}}, "siklus"),
                         ({"1": {"nd": 7, "km2": 1, "kab": {"x": {"c": 1}}}}, "tidak ada"),
                         ({"1": {"nd": 0, "km2": 2, "kab": {"x": {"c": 1}}}}, "jumlah irisan")):
        try:
            periksa({"subdas": rusak})
        except AssertionError as e:
            assert pesan in str(e), e
        else:
            raise AssertionError(f"topologi rusak ({pesan}) lolos")
    print("ok topologi")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else bangun()
