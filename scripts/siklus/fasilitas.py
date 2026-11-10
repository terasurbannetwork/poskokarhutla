"""Fasilitas vital per kabupaten dalam zona bahaya (ALGORITMA F2.4) -> siklus/saji/fasilitas/<kab4>.json.

Sumber berdampingan, tanpa de-duplikasi atau penjumlahan: Dapodik/EMIS (public/data/sekolah.json), fasilitas.json repo (rumah sakit, puskesmas),
dan sumber lain lewat adapter panen (OSM Geofabrik/Overpass, Overture places, Wikidata) berupa daftar titik {kat, lon, lat, nama}.
Kategori BERKOORDINAT hanya sekolah, madrasah, kesehatan, ibadah, kantor_pemerintah. Objek vital, bandara, pelabuhan, pembangkit, lapas,
bendungan hanya HITUNGAN (KP 12.1): berkas gagal ditulis bila ada koordinat pada kategori itu. Jalan: batas atas panjang ruas bertitik tengah di zona.
Tidak ada sumber untuk suatu kategori = kategori tidak ditulis (null), bukan 0. Label estimasi-model (cakupan); TAG_OSM asumsi-kebijakan.
Pakai: python3 -I scripts/siklus/fasilitas.py uji | kab PROV KAB4 KELUAR_DIR
"""
import importlib.util, json, os, sys

AB = os.path.dirname(os.path.abspath(__file__))
AKAR = os.path.normpath(os.path.join(AB, "../.."))
BERKOORDINAT = ("sekolah", "madrasah", "kesehatan", "ibadah", "kantor_pemerintah")
HITUNGAN_SAJA = ("obvitnas", "bandara", "pelabuhan", "pembangkit", "lapas", "bendungan")
MADRASAH = {"MI", "MTs", "MA", "RA"}
# asumsi-kebijakan: dipakai bila konst.TAG_OSM belum diisi pemilik (daftar baku Perka tidak ditemukan)
TAG_OSM_BAWAAN = {("amenity", "school"): "sekolah", ("amenity", "hospital"): "kesehatan", ("amenity", "clinic"): "kesehatan",
                  ("amenity", "doctors"): "kesehatan", ("healthcare", "centre"): "kesehatan", ("amenity", "place_of_worship"): "ibadah",
                  ("amenity", "townhall"): "kantor_pemerintah", ("office", "government"): "kantor_pemerintah",
                  ("aeroway", "aerodrome"): "bandara", ("amenity", "ferry_terminal"): "pelabuhan", ("power", "plant"): "pembangkit",
                  ("amenity", "prison"): "lapas", ("waterway", "dam"): "bendungan", ("military", "*"): "obvitnas"}


def _muat(nama, rel):
    s = importlib.util.spec_from_file_location(nama, os.path.join(AKAR, rel))
    m = importlib.util.module_from_spec(s)
    s.loader.exec_module(m)
    return m


K = _muat("sk_konst", "scripts/siklus/konst.py")


def kategori_osm(tags):
    """tag OSM {k: v} -> kategori atau None. Madrasah OSM (religion=muslim + school) tetap sekolah: tidak ditebak."""
    peta = K.TAG_OSM or TAG_OSM_BAWAAN
    for k, v in tags.items():
        c = peta.get((k, v)) or peta.get((k, "*"))
        if c:
            return c
    return None


def dari_dapodik(baris, kolom, prov, kab):
    """sekolah.json baris -> titik sekolah/madrasah satu kabupaten (nama kabupaten dan kode provinsi persis)."""
    i = {k: n for n, k in enumerate(kolom)}
    out = []
    for r in baris:
        if r[i["prov"]] == prov and r[i["kab"]] == kab and r[i["lat"]] is not None and r[i["lon"]] is not None:
            out.append({"kat": "madrasah" if r[i["jenjang"]] in MADRASAH else "sekolah", "lon": r[i["lon"]], "lat": r[i["lat"]], "nama": r[i["nama"]]})
    return out


def dari_fasilitas_repo(daftar, kotak):
    """public/data/fasilitas.json: t rs/faskes -> kesehatan, hanya di dalam kotak (lon0, lat0, lon1, lat1) kabupaten."""
    x0, y0, x1, y1 = kotak
    return [{"kat": "kesehatan", "lon": f["lon"], "lat": f["lat"], "nama": f.get("nama")} for f in daftar
            if f.get("t") in ("rs", "faskes") and x0 <= f["lon"] <= x1 and y0 <= f["lat"] <= y1]


def jalan_km(ruas, fn):
    """ruas [(panjang_km, lon_tengah, lat_tengah)] -> jumlah panjang ruas bertitik tengah di zona. Batas atas."""
    return round(sum(p for p, lo, la in ruas if fn(lo, la)), 3)


def selisih_nilai(n_sumber):
    v = list(n_sumber.values())
    return max(v) - min(v) if len(v) >= 2 else None


def hitung(titik, zonas, ruas=None):
    """titik {sumber: [titik]} -> {kategori: {sumber: {n, zona:{bahaya:{kunci:n}}}}, selisih per zona}; kategori hitungan-saja tanpa koordinat."""
    out, hit = {}, {}
    for sm, daftar in titik.items():
        for t in daftar:
            if t["kat"] in HITUNGAN_SAJA:
                hit.setdefault(t["kat"], {}).setdefault(sm, 0)
                hit[t["kat"]][sm] += 1
                continue
            if t["kat"] not in BERKOORDINAT:
                continue
            e = out.setdefault(t["kat"], {"sumber": {}, "titik": []})
            s = e["sumber"].setdefault(sm, {"n": 0, "zona": {}})
            s["n"] += 1
            e["titik"].append({"sumber": sm, "lon": round(t["lon"], 5), "lat": round(t["lat"], 5), "nama": t.get("nama")})
            for z in zonas:
                if z["tersedia"]:
                    s["zona"].setdefault(z["bahaya"], {}).setdefault(z["kunci"], 0)
                    if z["fn"](t["lon"], t["lat"]):
                        s["zona"][z["bahaya"]][z["kunci"]] += 1
    for e in out.values():
        e["selisih_zona"] = {b: {k: selisih_nilai({sm: s["zona"][b][k] for sm, s in e["sumber"].items()}) for k in ks}
                             for b, ks in next(iter(e["sumber"].values()))["zona"].items()}
        e["selisih_n"] = selisih_nilai({sm: s["n"] for sm, s in e["sumber"].items()})
    res = {"berkoordinat": out, "hanya_hitungan": hit}
    if ruas is not None:
        res["jalan_km"] = {"batas_atas": True, **{f"{z['bahaya']}:{z['kunci']}": jalan_km(ruas, z["fn"]) for z in zonas if z["tersedia"]}}
    return res


def periksa(isi, jalur=""):
    """Masalah bila ada koordinat pada kategori terlarang (UJ-KP-09) atau kategori tak dikenal berkoordinat."""
    m = []
    if isinstance(isi, dict):
        if "lon" in isi and "lat" in isi:
            m.append(f"{jalur}: koordinat pada objek tanpa kategori")
        k = isi.get("kat")
        if k is not None and k in HITUNGAN_SAJA and ("lon" in isi or "lat" in isi):
            m.append(f"{jalur}: koordinat terlarang untuk kategori {k}")
        for a, v in isi.items():
            if a in HITUNGAN_SAJA and isinstance(v, dict):
                if any(("lon" in str(kk) or "lat" in str(kk)) for kk in v):
                    m.append(f"{jalur}/{a}: koordinat terlarang")
            m += periksa(v, f"{jalur}/{a}")
    elif isinstance(isi, list):
        for n, v in enumerate(isi):
            if isinstance(v, dict) and "lon" in v and "lat" in v and v.get("sumber") is None and v.get("kat") not in BERKOORDINAT:
                m.append(f"{jalur}[{n}]: koordinat pada objek tanpa kategori sah")
            m += periksa(v, f"{jalur}[{n}]") if not (isinstance(v, dict) and "lon" in v and "lat" in v and v.get("sumber")) else []
    return m


def tulis(root, kab4, isi):
    """-> daftar masalah; berkas tidak ditulis bila ada koordinat terlarang, kunci terlarang, atau melewati 500 KB."""
    m = periksa(isi)
    G = _muat("sk_gudang", "scripts/siklus/gudang.py")
    S = _muat("sk_saji", "scripts/siklus/saji.py")
    body = {"yakin": "estimasi-model", "kab4": kab4, "kategori_berkoordinat": list(BERKOORDINAT), "kategori_hitungan_saja": list(HITUNGAN_SAJA),
            "catatan": "Cakupan sumber berbeda; tidak digabung. TAG_OSM asumsi-kebijakan. Jalan batas atas. Sekolah Kita dan SIRS tidak dipakai.", **isi}
    kunci = f"siklus/saji/fasilitas/{kab4}.json"
    data = json.dumps(G.selubung("fasilitas", body), ensure_ascii=False, sort_keys=True).encode()
    m += S.periksa_berkas(kunci, data)
    if not m:
        j = os.path.join(root, *kunci.split("/"))
        os.makedirs(os.path.dirname(j), exist_ok=True)
        open(j, "wb").write(data)
    return m


def jalankan_kab(prov, kab4, keluar):
    P = _muat("sk_paparan", "scripts/siklus/paparan.py")
    sel, lat0, lon0, st, nama, _ = P.sel_kab(prov, kab4)
    kotak = (min(c[5] for c in sel), min(c[6] for c in sel), max(c[5] for c in sel), max(c[6] for c in sel))
    s = json.load(open(os.path.join(AKAR, "public/data/sekolah.json")))
    f = json.load(open(os.path.join(AKAR, "public/data/fasilitas.json")))
    titik = {"dapodik": dari_dapodik(s["baris"], s["kolom"], prov, nama), "fasilitas-repo": dari_fasilitas_repo(f, kotak)}
    # kotak kabupaten kasar: fasilitas.json di tepi kotak bisa milik kabupaten tetangga; dicatat, bukan dikoreksi
    h = hitung(titik, P.zona_dari_berkas())
    h["catatan_kotak"] = "fasilitas-repo dipilih dengan kotak kabupaten, titik di tepi bisa milik kabupaten tetangga"
    return h, tulis(keluar, kab4, h)


def _uji():
    pol = {"type": "Polygon", "coordinates": [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]]}
    P = _muat("sk_paparan", "scripts/siklus/paparan.py")
    z = [P.zona_dari_bagian([pol], "banjir", "poligon"), P.tak_tersedia("rob", "x")]
    # 5 Dapodik dan 3 OSM di zona: selisih 2, bukan 8
    dp = [{"kat": "sekolah", "lon": .5, "lat": .5, "nama": f"S{i}"} for i in range(5)] + [{"kat": "sekolah", "lon": 5, "lat": 5, "nama": "luar"}]
    osm = [{"kat": "sekolah", "lon": .2, "lat": .2} for _ in range(3)]
    h = hitung({"dapodik": dp, "osm": osm}, z, ruas=[(4, .5, .5), (2.5, .1, .9), (9, 7, 7)])
    e = h["berkoordinat"]["sekolah"]
    assert e["sumber"]["dapodik"]["zona"]["banjir"]["poligon"] == 5 and e["sumber"]["osm"]["zona"]["banjir"]["poligon"] == 3
    assert e["selisih_zona"]["banjir"]["poligon"] == 2 and e["selisih_n"] == 3 and "total" not in json.dumps(h)
    assert h["jalan_km"] == {"batas_atas": True, "banjir:poligon": 6.5}
    # satu sumber saja: selisih null, bukan 0; kategori tanpa sumber tidak ditulis
    h1 = hitung({"dapodik": dp}, z)
    assert h1["berkoordinat"]["sekolah"]["selisih_n"] is None and "ibadah" not in h1["berkoordinat"]
    # objek vital hanya hitungan, tanpa koordinat
    h2 = hitung({"osm": [{"kat": "bandara", "lon": .5, "lat": .5}, {"kat": "obvitnas", "lon": .5, "lat": .5}, {"kat": "pelabuhan", "lon": 1, "lat": 1}]}, z)
    assert h2["hanya_hitungan"] == {"bandara": {"osm": 1}, "obvitnas": {"osm": 1}, "pelabuhan": {"osm": 1}} and h2["berkoordinat"] == {}
    assert periksa(h) == [] and periksa(h2) == []
    # berkas dengan koordinat obvitnas, bandara, pelabuhan GAGAL (UJ-KP-09)
    import tempfile
    with tempfile.TemporaryDirectory() as t:
        for k in ("obvitnas", "bandara", "pelabuhan", "pembangkit", "lapas", "bendungan"):
            m = tulis(t, "9999", {"hanya_hitungan": {k: [{"kat": k, "lon": 1.0, "lat": 2.0}]}})
            assert m and "terlarang" in " ".join(m), (k, m)
        assert tulis(t, "9999", {"titik": [{"lon": 1.0, "lat": 2.0}]})
        assert not os.path.exists(os.path.join(t, "siklus/saji/fasilitas/9999.json"))
        assert tulis(t, "9999", {"total": 5})                       # kunci terlarang (antarsumber tidak dijumlah)
        assert tulis(t, "9999", {"x": "y" * 500_001})                # melewati 500 KB
        assert tulis(t, "9999", h) == [] and os.path.exists(os.path.join(t, "siklus/saji/fasilitas/9999.json"))
    # pemetaan tag OSM dan Dapodik
    assert kategori_osm({"amenity": "school"}) == "sekolah" and kategori_osm({"amenity": "bench"}) is None and kategori_osm({"military": "barracks"}) == "obvitnas"
    kol = ["nama", "jenjang", "status", "npsn", "siswa", "prov", "kab", "kec", "desa", "lat", "lon"]
    br = [["A", "MI", "S", "1", 1, "63", "Tapin", "", "", -2.9, 115.1], ["B", "SD", "S", "2", 1, "63", "Tapin", "", "", None, 115], ["C", "SD", "S", "3", 1, "63", "Banjar", "", "", -2.9, 115]]
    assert [x["kat"] for x in dari_dapodik(br, kol, "63", "Tapin")] == ["madrasah"]
    assert dari_fasilitas_repo([{"t": "rs", "lon": .5, "lat": .5}, {"t": "sekolah", "lon": .5, "lat": .5}, {"t": "rs", "lon": 9, "lat": 9}], (0, 0, 1, 1)) == [{"kat": "kesehatan", "lon": .5, "lat": .5, "nama": None}]
    print("fasilitas: uji hijau")


if __name__ == "__main__":
    a = sys.argv[1:]
    if a == ["uji"]:
        _uji()
    elif a[:1] == ["kab"] and len(a) == 4:
        h, m = jalankan_kab(a[1], a[2], a[3])
        ring = {k: {"n": v["selisih_n"], "sumber": {s: x["n"] for s, x in v["sumber"].items()}, "selisih_zona": v["selisih_zona"]} for k, v in h["berkoordinat"].items()}
        print(json.dumps({"berkoordinat": ring, "hitungan": h["hanya_hitungan"], "masalah": m}, ensure_ascii=False))
        sys.exit(1 if m else 0)
    else:
        sys.exit("pakai: fasilitas.py uji | kab PROV KAB4 KELUAR_DIR")
