"""Impor data konsesi resmi (Kemenhut) -> GeoJSON konsesi baku (RANCANGAN §3.1).

Pakai:  python3 scripts/karbon/impor.py <berkas.zip|folder|.shp|.geojson|.kml|.kmz> \
            --sumber kemenhut-2026 --jenis hph [--keluar data/raw/karbon/konsesi_<sumber>.geojson]
        python3 scripts/karbon/impor.py --uji

Shapefile dibaca lewat scripts/scrape/lahan.baca_shp. Hanya koordinat geografis (lon/lat) yang
diterima: .prj berproyeksi (UTM, Mercator, ...) atau koordinat di luar ±180/±90 ditolak keras,
supaya konsesi tidak diam-diam mendarat di laut. Ubah dulu ke EPSG:4326 (QGIS: Export > Save As).
"""
import argparse, hashlib, io, json, math, os, re, sys, zipfile
import xml.etree.ElementTree as ET

AKAR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "../..")
sys.path.insert(0, os.path.join(AKAR, "scripts/scrape"))
sys.path.insert(0, os.path.join(AKAR, "scripts/data"))
from lahan import baca_shp, sederhana  # noqa: E402
from wilayah import PROVINSI  # noqa: E402

JENIS = {"hph", "hti", "re", "sawit", "tambang", "ps", "lain"}
# kolom baku -> nama atribut yang lazim di data KLHK/Kemenhut (huruf besar/kecil diabaikan)
PETA = {
    "nama": ["nama", "nama_unit", "namobj", "name", "unit", "nama_izin"],
    "pemegang": ["nama_perus", "pemegang", "perusahaan", "nama_pt", "company", "pt", "nama_pemeg"],
    "izin": ["no_sk", "sk", "nomor_sk", "no_izin", "nosk", "sk_izin", "no_sk_iuph", "sk_pbph"],
    "luas_peta_ha": ["luas", "luas_ha", "luas_sk", "luasha", "luas_izin"],
    "prov": ["provinsi", "prov", "kode_prov", "kodeprov", "propinsi", "nama_prov"],
    "kab": ["kab", "kabupaten", "kab_kota", "kabkota", "nama_kab"],
    "jenis": ["jenis", "jenis_izin", "tipe"],
}
R = 6378137.0


class GalatImpor(Exception):
    pass


def luas_geodesik_ha(geom):
    """Luas bola (rumus Chamberlain–Duquette, sama dengan turf.area)."""
    def cincin(c):
        s = 0.0
        for i in range(len(c) - 1):
            (x1, y1), (x2, y2) = c[i][:2], c[i + 1][:2]
            s += math.radians(x2 - x1) * (2 + math.sin(math.radians(y1)) + math.sin(math.radians(y2)))
        return abs(s * R * R / 2)
    polis = geom["coordinates"] if geom["type"] == "MultiPolygon" else [geom["coordinates"]]
    return sum(cincin(p[0]) - sum(cincin(h) for h in p[1:]) for p in polis) / 1e4


def _cek_lonlat(cincin, asal):
    for r in cincin:
        for x, y in r:
            if not (-180 <= x <= 180 and -90 <= y <= 90):
                raise GalatImpor(f"{asal}: koordinat ({x:.1f}, {y:.1f}) bukan lon/lat; ubah ke EPSG:4326 dulu")


# ---------- shapefile ----------
def _zip_shp(jalur):
    """zip/folder/.shp -> objek ZipFile berisi tepat satu set shapefile, plus cek .prj."""
    if jalur.lower().endswith(".zip"):
        zb = open(jalur, "rb").read()
    else:
        folder = jalur if os.path.isdir(jalur) else os.path.dirname(jalur)
        dasar = None if os.path.isdir(jalur) else os.path.splitext(os.path.basename(jalur))[0].lower()
        buf = io.BytesIO()
        with zipfile.ZipFile(buf, "w") as z:
            for n in os.listdir(folder):
                b, ext = os.path.splitext(n)
                if ext.lower() in (".shp", ".dbf", ".prj", ".cpg") and (dasar is None or b.lower() == dasar):
                    z.write(os.path.join(folder, n), n)
        zb = buf.getvalue()
    z = zipfile.ZipFile(io.BytesIO(zb))
    nama = [n for n in z.namelist() if n.lower().endswith(".shp") and not n.startswith("__MACOSX")]
    if len(nama) != 1:
        raise GalatImpor(f"harus tepat satu .shp, ketemu {nama}; pisahkan per lapisan")
    prj = [n for n in z.namelist() if n.lower() == nama[0].lower()[:-4] + ".prj"]
    if not prj:
        raise GalatImpor(f"{nama[0]}: tidak ada .prj, sistem koordinat tak diketahui; minta ulang dengan .prj")
    teks = z.read(prj[0]).decode(errors="ignore")
    if "PROJCS" in teks:
        m = re.search(r'PROJCS\["([^"]+)"', teks)
        raise GalatImpor(f"{nama[0]}: berproyeksi ({m.group(1) if m else teks[:60]}), bukan lon/lat. "
                         "Reproyeksi ke EPSG:4326 (QGIS: Export > Save Features As, CRS WGS 84) lalu impor ulang.")
    if not re.search(r"WGS.?(19)?84|DGN.?95|SRGI", teks, re.I):
        print(f"PERINGATAN: datum bukan WGS84/DGN95/SRGI ({teks[:80]}), geser bisa ratusan meter", file=sys.stderr)
    return io.BytesIO(zb)


def baca_shapefile(jalur):
    for props, cincin in baca_shp(_zip_shp(jalur)):
        _cek_lonlat(cincin, jalur)
        yield props, (sederhana(cincin, 0, 1e-12) if cincin else None)


# ---------- GeoJSON ----------
def baca_geojson(jalur):
    d = json.load(open(jalur))
    for f in d["features"] if d.get("type") == "FeatureCollection" else [d]:
        g = f.get("geometry")
        if not g or g["type"] not in ("Polygon", "MultiPolygon"):
            yield f.get("properties") or {}, None
            continue
        polis = g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]]
        _cek_lonlat([[(c[0], c[1]) for c in r] for p in polis for r in p], jalur)
        bersih = []
        for p in polis:
            rs = [[[c[0], c[1]] for c in r] for r in p]
            rs = [r + [r[0]] if r and r[0] != r[-1] else r for r in rs]
            rs = [r for i, r in enumerate(rs) if len(r) >= 4]
            if rs and len(p[0]) >= 3:
                bersih.append(rs)
        yield f.get("properties") or {}, ({"type": "MultiPolygon", "coordinates": bersih} if bersih else None)


# ---------- KML / KMZ ----------
def _lokal(tag):
    return tag.rsplit("}", 1)[-1]


def _koord(teks):
    pts = [tuple(map(float, t.split(",")[:2])) for t in (teks or "").split()]
    if pts and pts[0] != pts[-1]:
        pts.append(pts[0])
    return [list(p) for p in pts]


def baca_kml(jalur):
    if jalur.lower().endswith(".kmz"):
        z = zipfile.ZipFile(jalur)
        akar = ET.fromstring(z.read(next(n for n in z.namelist() if n.lower().endswith(".kml"))))
    else:
        akar = ET.parse(jalur).getroot()
    for pm in (e for e in akar.iter() if _lokal(e.tag) == "Placemark"):
        props = {}
        for e in pm.iter():
            t = _lokal(e.tag)
            if t == "name" and "name" not in props:
                props["name"] = (e.text or "").strip()
            elif t == "description" and e.text:
                props["description"] = e.text.strip()
            elif t == "Data":
                v = next((c.text for c in e if _lokal(c.tag) == "value"), None)
                props[e.get("name")] = (v or "").strip()
            elif t == "SimpleData":
                props[e.get("name")] = (e.text or "").strip()
        polis = []
        for poly in (e for e in pm.iter() if _lokal(e.tag) == "Polygon"):
            luar, dalam = None, []
            for b in poly:
                k = next((c.text for c in b.iter() if _lokal(c.tag) == "coordinates"), None)
                if _lokal(b.tag) == "outerBoundaryIs":
                    luar = _koord(k)
                elif _lokal(b.tag) == "innerBoundaryIs":
                    dalam.append(_koord(k))
            if luar and len(luar) >= 4:
                polis.append([luar] + [d for d in dalam if len(d) >= 4])
        _cek_lonlat([r for p in polis for r in p], jalur)
        yield props, ({"type": "MultiPolygon", "coordinates": polis} if polis else None)


# ---------- normalisasi ----------
_PROV_NAMA = {re.sub(r"[^a-z]", "", v.lower()): k for k, v in PROVINSI.items()}
_PROV_NAMA.update({"kalimantanutara": "65", "kaltara": "65", "kaltim": "64", "kalteng": "62", "kalbar": "61",
                   "kalsel": "63", "sumsel": "16", "sumut": "12", "sumbar": "13", "papuabarat": "92"})


def kode_prov(v):
    v = str(v or "").strip()
    if re.fullmatch(r"\d{2}", v) and v in PROVINSI:
        return v
    return _PROV_NAMA.get(re.sub(r"[^a-z]", "", v.lower().replace("prov", "").replace("provinsi", "")), "")


def _angka(v):
    try:
        return float(str(v).replace(",", ".")) if str(v).strip() else None
    except ValueError:
        return None


def normalkan(baris, sumber, jenis, tahun):
    """baris = [(props, geom|None)] -> (fitur, n_tak_sah)."""
    fitur, tak_sah, izin_hitung = [], 0, {}
    awal = []
    for props, g in baris:
        if not g or not g["coordinates"] or luas_geodesik_ha(g) <= 0:
            tak_sah += 1
            continue
        kecil = {k.lower(): (k, v) for k, v in props.items()}
        baku, terpakai = {}, set()
        for kol, nama in PETA.items():
            for n in nama:
                if n in kecil and str(kecil[n][1]).strip():
                    baku[kol] = str(kecil[n][1]).strip()
                    terpakai.add(n)
                    break
        atribut = {kecil[k][0]: v for k, (_, v) in kecil.items() if k not in terpakai and str(v).strip()}
        awal.append((baku, atribut, g))
        if baku.get("izin"):
            izin_hitung[baku["izin"]] = izin_hitung.get(baku["izin"], 0) + 1
    for baku, atribut, g in awal:
        izin = baku.get("izin", "")
        if izin and izin_hitung[izin] == 1:
            kunci = re.sub(r"[^a-z0-9]+", "-", izin.lower()).strip("-")
        else:  # SK kosong atau dipakai beberapa poligon: hash geometri (stabil selama batasnya sama)
            kunci = hashlib.sha1(json.dumps(g["coordinates"], separators=(",", ":")).encode()).hexdigest()[:12]
        j = (baku.get("jenis") or jenis or "lain").lower()
        ha = luas_geodesik_ha(g)
        fitur.append({"type": "Feature", "properties": {
            "id": f"{sumber}-{kunci}", "nama": baku.get("nama") or baku.get("pemegang") or "",
            "pemegang": baku.get("pemegang") or baku.get("nama") or "", "jenis": j if j in JENIS else "lain",
            "izin": izin, "prov": kode_prov(baku.get("prov")), "kab": baku.get("kab", ""), "sumber": sumber,
            "tahun_data": tahun, "luas_peta_ha": round(_angka(baku.get("luas_peta_ha")) or ha),
            "luas_hitung_ha": round(ha, 1), "atribut": atribut}, "geometry": g})
    ids = [f["properties"]["id"] for f in fitur]
    if len(ids) != len(set(ids)):
        raise GalatImpor("id ganda: poligon identik muncul dua kali; bersihkan sumbernya")
    return fitur, tak_sah


def baca(jalur):
    l = jalur.lower()
    if l.endswith((".geojson", ".json")):
        return baca_geojson(jalur)
    if l.endswith((".kml", ".kmz")):
        return baca_kml(jalur)
    if l.endswith((".zip", ".shp")) or os.path.isdir(jalur):
        return baca_shapefile(jalur)
    raise GalatImpor(f"format tak dikenal: {jalur}")


def impor(jalur, sumber, jenis=None, tahun=None):
    tahun = tahun or int((re.search(r"(19|20)\d{2}", sumber) or [2026])[0])
    return normalkan(baca(jalur), sumber, jenis, tahun)


# ---------- uji ----------
def _tulis_shp(folder, nama, poligon, atribut, prj):
    """Shapefile Polygon minimal (shp + dbf + prj). poligon = [[cincin...]], atribut = [{k: str}]."""
    import struct
    rec = b""
    for i, cincin in enumerate(poligon, 1):
        pts = [p for r in cincin for p in r]
        xs, ys = [p[0] for p in pts], [p[1] for p in pts]
        isi = struct.pack("<i4d2i", 5, min(xs), min(ys), max(xs), max(ys), len(cincin), len(pts))
        awal = 0
        for r in cincin:
            isi += struct.pack("<i", awal)
            awal += len(r)
        isi += b"".join(struct.pack("<2d", *p) for p in pts)
        rec += struct.pack(">2i", i, len(isi) // 2) + isi
    kepala = struct.pack(">7i", 9994, 0, 0, 0, 0, 0, (100 + len(rec)) // 2) + struct.pack("<2i4d4d", 1000, 5, 0, 0, 0, 0, 0, 0, 0, 0)
    open(os.path.join(folder, nama + ".shp"), "wb").write(kepala + rec)
    kolom = list(atribut[0])
    hdr = struct.pack("<B3BIHH20x", 3, 126, 10, 22, len(atribut), 32 + 32 * len(kolom) + 1, 1 + 40 * len(kolom))
    for k in kolom:
        hdr += k.encode().ljust(11, b"\0") + b"C" + b"\0" * 4 + bytes([40, 0]) + b"\0" * 14
    hdr += b"\x0d"
    body = b"".join(b" " + b"".join(str(a[k]).encode().ljust(40) for k in kolom) for a in atribut)
    open(os.path.join(folder, nama + ".dbf"), "wb").write(hdr + body + b"\x1a")
    open(os.path.join(folder, nama + ".prj"), "w").write(prj)


def uji():
    import tempfile
    WGS = 'GEOGCS["GCS_WGS_1984",DATUM["D_WGS_1984",SPHEROID["WGS_1984",6378137.0,298.257223563]],PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]]'
    UTM = 'PROJCS["WGS_1984_UTM_Zone_50N",GEOGCS["GCS_WGS_1984"],PROJECTION["Transverse_Mercator"]]'
    # luas geodesik (bola R=6378137, sama dengan turf.area): 0,1° x 0,1° di khatulistiwa = 12.392 ha
    sq = lambda x, y, d: [[x, y], [x, y + d], [x + d, y + d], [x + d, y], [x, y]]  # searah jarum jam (luar shapefile)
    assert abs(luas_geodesik_ha({"type": "Polygon", "coordinates": [sq(117, 0, 0.1)]}) - 12392) < 2
    with tempfile.TemporaryDirectory() as d:
        lubang = [[117.02, 0.02], [117.04, 0.02], [117.04, 0.04], [117.02, 0.04], [117.02, 0.02]]  # berlawanan jarum jam
        _tulis_shp(d, "pbph", [[sq(117, 0, 0.1), lubang], [sq(118, 1, 0.05)]],
                   [{"NAMA_PERUS": "PT Uji Rimba", "NO_SK": "SK.123/2020", "PROVINSI": "Kalimantan Utara", "LUAS": "12000", "WARNA": "hijau"},
                    {"NAMA_PERUS": "PT Dua", "NO_SK": "", "PROVINSI": "64", "LUAS": "", "WARNA": ""}], WGS)
        for masuk in (d, os.path.join(d, "pbph.shp")):
            f, tak = impor(masuk, "kemenhut-2026", "hph")
            assert len(f) == 2 and tak == 0, (len(f), tak)
        p = f[0]["properties"]
        assert p["id"] == "kemenhut-2026-sk-123-2020" and p["pemegang"] == "PT Uji Rimba" and p["prov"] == "65", p
        assert p["luas_peta_ha"] == 12000 and abs(p["luas_hitung_ha"] - (12392 - 495.6)) < 2, p["luas_hitung_ha"]
        assert p["atribut"] == {"warna": "hijau"}  # baca_shp menurunkan huruf nama kolom and p["tahun_data"] == 2026 and p["jenis"] == "hph"
        assert len(f[0]["geometry"]["coordinates"][0]) == 2, "lubang mesti menempel ke poligon luarnya"
        q = f[1]["properties"]
        assert re.fullmatch(r"kemenhut-2026-[0-9a-f]{12}", q["id"]) and q["prov"] == "64" and q["luas_peta_ha"] == round(q["luas_hitung_ha"])
        assert impor(d, "kemenhut-2026", "hph")[0][1]["properties"]["id"] == q["id"], "id hash harus stabil"
        # zip juga bisa
        zp = os.path.join(d, "pbph.zip")
        with zipfile.ZipFile(zp, "w") as z:
            for ext in ("shp", "dbf", "prj"):
                z.write(os.path.join(d, "pbph." + ext), "dalam/pbph." + ext)
        assert len(impor(zp, "kemenhut-2026", "hph")[0]) == 2
        # UTM ditolak keras dengan pesan yang menyebut proyeksinya
        open(os.path.join(d, "pbph.prj"), "w").write(UTM)
        try:
            impor(d, "kemenhut-2026", "hph")
            raise AssertionError("UTM mestinya ditolak")
        except GalatImpor as e:
            assert "UTM_Zone_50N" in str(e) and "4326" in str(e), e
        os.remove(os.path.join(d, "pbph.prj"))
        try:
            impor(d, "x", "hph")
            raise AssertionError("tanpa .prj mestinya ditolak")
        except GalatImpor as e:
            assert ".prj" in str(e)
        # KML: nama, ExtendedData, MultiGeometry + lubang, satu placemark tanpa poligon (tak sah)
        kml = os.path.join(d, "uji.kml")
        open(kml, "w").write('''<?xml version="1.0"?><kml xmlns="http://www.opengis.net/kml/2.2"><Document>
<Placemark><name>PT Kml Lestari</name><ExtendedData><Data name="NO_SK"><value>SK.9/2019</value></Data>
<SchemaData><SimpleData name="Kab">Malinau</SimpleData></SchemaData></ExtendedData><MultiGeometry>
<Polygon><outerBoundaryIs><LinearRing><coordinates>116,3,0 116.1,3,0 116.1,3.1,0 116,3.1,0</coordinates></LinearRing></outerBoundaryIs>
<innerBoundaryIs><LinearRing><coordinates>116.02,3.02 116.04,3.02 116.04,3.04 116.02,3.02</coordinates></LinearRing></innerBoundaryIs></Polygon>
<Polygon><outerBoundaryIs><LinearRing><coordinates>116.5,3 116.6,3 116.6,3.1 116.5,3</coordinates></LinearRing></outerBoundaryIs></Polygon>
</MultiGeometry></Placemark><Placemark><name>titik</name><Point><coordinates>116,3</coordinates></Point></Placemark>
</Document></kml>''')
        f, tak = impor(kml, "kemenhut-2026", "hti")
        assert len(f) == 1 and tak == 1
        p = f[0]["properties"]
        assert p["nama"] == "PT Kml Lestari" and p["izin"] == "SK.9/2019" and p["kab"] == "Malinau" and p["jenis"] == "hti", p
        g = f[0]["geometry"]["coordinates"]
        assert len(g) == 2 and len(g[0]) == 2 and g[0][0][0] == g[0][0][-1], "cincin ditutup, lubang ikut"
        kmz = os.path.join(d, "uji.kmz")
        with zipfile.ZipFile(kmz, "w") as z:
            z.write(kml, "doc.kml")
        assert impor(kmz, "kemenhut-2026", "hti")[0][0]["properties"]["id"] == p["id"]
        # GeoJSON berkoordinat meter ditolak
        gj = os.path.join(d, "m.geojson")
        json.dump({"type": "FeatureCollection", "features": [{"type": "Feature", "properties": {}, "geometry":
                   {"type": "Polygon", "coordinates": [[[500000, 100000], [500100, 100000], [500100, 100100], [500000, 100000]]]}}]}, open(gj, "w"))
        try:
            impor(gj, "x", "hph")
            raise AssertionError("koordinat meter mestinya ditolak")
        except GalatImpor as e:
            assert "lon/lat" in str(e)
    print("impor ok")


if __name__ == "__main__":
    if "--uji" in sys.argv:
        uji()
        sys.exit()
    a = argparse.ArgumentParser()
    a.add_argument("masuk")
    a.add_argument("--sumber", required=True)
    a.add_argument("--jenis", choices=sorted(JENIS))
    a.add_argument("--tahun", type=int)
    a.add_argument("--keluar")
    o = a.parse_args()
    try:
        fitur, tak = impor(o.masuk, o.sumber, o.jenis, o.tahun)
    except GalatImpor as e:
        sys.exit(f"GAGAL: {e}")
    keluar = o.keluar or os.path.join(AKAR, f"data/raw/karbon/konsesi_{o.sumber}.geojson")
    os.makedirs(os.path.dirname(keluar), exist_ok=True)
    json.dump({"type": "FeatureCollection", "features": fitur}, open(keluar, "w"), separators=(",", ":"), ensure_ascii=False)
    tanpa_prov = sum(1 for f in fitur if not f["properties"]["prov"])
    print(f"{len(fitur)} fitur, {sum(f['properties']['luas_hitung_ha'] for f in fitur):,.0f} ha (geodesik), "
          f"{tak} geometri tak sah dibuang, {tanpa_prov} tanpa kode provinsi -> {keluar}")
