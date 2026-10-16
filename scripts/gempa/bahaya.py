"""Lapisan bahaya statis gempa dan tsunami (G5) -> public/gempa/data/
  inarisk_gempa.json    indeks bahaya gempa bumi InaRISK BNPB (raster 100 m, 0-1) di pusat tiap kecamatan
  inarisk_tsunami.json  indeks bahaya tsunami InaRISK BNPB (raster 100 m, 0-1) di pusat tiap kecamatan
  batas_lempeng.geojson batas lempeng dan zona subduksi sekitar Indonesia, PB2002 (Bird 2003), lisensi ODC-By 1.0
  bahaya_meta.json      sumber, lisensi, atribusi, waktu ambil, lapisan yang dibuang

Aturan A18: lapisan yang tidak bisa diakses DIBUANG (berkas tidak ditulis, yang lama dihapus), bukan ditulis kosong.
Sesar Pusgen 2017 TIDAK diambil: lisensinya belum jelas (butuh kata pemilik), jadi tidak ada sesar.geojson.

Sumber InaRISK: gis.bnpb.go.id/server/rest/services/inarisk/<layer>/ImageServer/getSamples (data terbuka BNPB, tanpa login).
Pusat kecamatan dari public/banjir/data/pusat_kec.json (7.274 titik, 150 titik per permintaan).

Pakai:  python3 scripts/gempa/bahaya.py  |  python3 scripts/gempa/bahaya.py uji
"""
import datetime as dt, json, os, sys, urllib.parse

sys.path.insert(0, os.path.dirname(__file__))
from umum import AKAR, KELUAR, ambil, simpan

BASIS = "https://gis.bnpb.go.id/server/rest/services/inarisk"
LAPISAN = {"inarisk_gempa.json": ("INDEKS_BAHAYA_GEMPABUMI", "InaRISK BNPB, indeks bahaya gempa bumi (raster 100 m, 0-1)"),
           "inarisk_tsunami.json": ("INDEKS_BAHAYA_TSUNAMI", "InaRISK BNPB, indeks bahaya tsunami (raster 100 m, 0-1)")}
LEMPENG_URL = "https://raw.githubusercontent.com/fraxen/tectonicplates/master/GeoJSON/PB2002_boundaries.json"
KOTAK = (88.0, -17.0, 147.0, 14.0)  # lon min, lat min, lon maks, lat maks untuk memotong batas lempeng
PLAFON = {"inarisk_gempa.json": 400_000, "inarisk_tsunami.json": 400_000, "batas_lempeng.geojson": 700_000}
ATRIBUSI = {
    "batas_lempeng.geojson": "Batas lempeng: PB2002, Bird, P. (2003) An updated digital model of plate boundaries, Geochem. Geophys. Geosyst. 4(3), 1027, doi:10.1029/2001GC000252; konversi GeoJSON Hugo Ahlenius, Nordpil; lisensi Open Data Commons Attribution License (ODC-By) 1.0.",
    "inarisk_gempa.json": "Indeks bahaya: InaRISK, Badan Nasional Penanggulangan Bencana (BNPB), gis.bnpb.go.id, data terbuka.",
    "usgs": "Katalog gempa: U.S. Geological Survey (USGS), earthquake.usgs.gov, domain publik."}
PER_PERMINTAAN, GAGAL_BERUNTUN_MAKS = 150, 4


def sampel(layer, titik):
    """titik: [(kunci, lon, lat)] -> {kunci: nilai 0-1}; titik tanpa data dilewati. Blok yang gagal (server BNPB sering 522)
    diulang sampai 3 putaran; gagal beruntun terlalu sering dalam satu putaran = RuntimeError."""
    hasil = {}
    sisa = list(range(0, len(titik), PER_PERMINTAAN))
    for putaran in range(3):
        gagal_blok, beruntun = [], 0
        for a in sisa:
            b = titik[a:a + PER_PERMINTAAN]
            q = urllib.parse.urlencode({"geometry": json.dumps({"points": [[x[1], x[2]] for x in b], "spatialReference": {"wkid": 4326}}),
                                        "geometryType": "esriGeometryMultipoint", "returnFirstValueOnly": "true", "f": "json"})
            try:
                r = ambil(f"{BASIS}/{layer}/ImageServer/getSamples?{q}", coba=3, batas_waktu=90)
                if "error" in r:
                    raise RuntimeError(str(r["error"])[:200])
            except RuntimeError as e:
                print(f"  {layer} blok {a} (putaran {putaran + 1}): {str(e)[:120]}", file=sys.stderr)
                gagal_blok.append(a)
                beruntun += 1
                if beruntun >= GAGAL_BERUNTUN_MAKS:
                    raise
                continue
            beruntun = 0
            for s in r.get("samples", []):
                v = s.get("value")
                if v not in ("", None, "NoData"):
                    hasil[b[s["locationId"]][0]] = round(float(v), 3)
        sisa = gagal_blok
        if not sisa:
            return hasil
    raise RuntimeError(f"{len(sisa)} blok tetap gagal setelah 3 putaran")


def klip(geom, kotak=KOTAK, desimal=3):
    """LineString/MultiLineString -> MultiLineString berisi hanya potongan di dalam kotak (atau None bila kosong)."""
    x0, y0, x1, y1 = kotak
    garis = geom["coordinates"] if geom["type"] == "MultiLineString" else [geom["coordinates"]]
    out = []
    for g in garis:
        sek = []
        for c in g:
            if x0 <= c[0] <= x1 and y0 <= c[1] <= y1:
                sek.append([round(c[0], desimal), round(c[1], desimal)])
            else:
                if len(sek) > 1:
                    out.append(sek)
                sek = []
        if len(sek) > 1:
            out.append(sek)
    return {"type": "MultiLineString", "coordinates": out} if out else None


def lempeng(fc):
    fitur = []
    for f in fc["features"]:
        g = klip(f["geometry"])
        if g:
            p = f["properties"]
            fitur.append({"type": "Feature", "geometry": g, "properties": {
                "nama": p["Name"], "jenis": "subduksi" if p.get("Type") == "subduction" else "batas", "plat_a": p["PlateA"], "plat_b": p["PlateB"]}})
    return {"type": "FeatureCollection", "features": fitur,
            "atribusi": "Bird, P. (2003) An updated digital model of plate boundaries, Geochem. Geophys. Geosyst. 4(3), 1027, "
                        "doi:10.1029/2001GC000252. Konversi GeoJSON: Hugo Ahlenius, Nordpil. Lisensi ODC-By 1.0."}


def main():
    pusat = json.load(open(os.path.join(AKAR, "public/banjir/data/pusat_kec.json")))
    titik = [(k, v[1], v[0]) for k, v in pusat.items()]  # pusat_kec: [lat, lon]
    meta = {"dibuat": dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%MZ"), "lapisan": {}, "dibuang": {}, "atribusi": ATRIBUSI}
    for nama, (layer, sumber) in LAPISAN.items():
        jalur = os.path.join(KELUAR, nama)
        try:
            nilai = sampel(layer, titik)
            if len(nilai) < 0.5 * len(titik):
                raise RuntimeError(f"hanya {len(nilai)} dari {len(titik)} titik bernilai")
            simpan(jalur, {"sumber": sumber, "layanan": f"{BASIS}/{layer}/ImageServer", "skala": "0-1", "titik": "pusat kecamatan", "nilai": nilai})
            meta["lapisan"][nama] = {"sumber": sumber, "titik": len(nilai), "dari": len(titik)}
        except RuntimeError as e:
            if os.path.exists(jalur):
                os.remove(jalur)
            meta["dibuang"][nama] = f"tidak bisa diakses: {str(e)[:160]}"
            print(f"DIBUANG {nama}: {e}", file=sys.stderr)
    fc = lempeng(ambil(LEMPENG_URL))
    simpan(os.path.join(KELUAR, "batas_lempeng.geojson"), fc)
    meta["lapisan"]["batas_lempeng.geojson"] = {"sumber": "PB2002 Bird 2003", "lisensi": "ODC-By 1.0", "fitur": len(fc["features"])}
    meta["dibuang"]["sesar.geojson"] = "Sesar Pusgen 2017: lisensi belum jelas, tidak diambil (tunggu kata pemilik)"
    simpan(os.path.join(KELUAR, "bahaya_meta.json"), meta)
    print(json.dumps(meta, ensure_ascii=False))


def uji():
    g = klip({"type": "LineString", "coordinates": [[0, 0], [100.12345, 1.5], [101.1, 2.5], [200, 3], [102, 3]]})
    assert g["coordinates"] == [[[100.123, 1.5], [101.1, 2.5]]], g  # titik di luar kotak memutus garis, garis 1 titik dibuang
    assert klip({"type": "LineString", "coordinates": [[0, 0], [1, 1]]}) is None
    fc = lempeng({"features": [
        {"geometry": {"type": "LineString", "coordinates": [[100, 0], [101, 1]]}, "properties": {"Name": "SU/AU", "Type": "subduction", "PlateA": "SU", "PlateB": "AU"}},
        {"geometry": {"type": "LineString", "coordinates": [[-100, 0], [-99, 1]]}, "properties": {"Name": "X", "Type": "", "PlateA": "A", "PlateB": "B"}}]})
    assert len(fc["features"]) == 1 and fc["features"][0]["properties"]["jenis"] == "subduksi"
    for nama, batas in PLAFON.items():
        j = os.path.join(KELUAR, nama)
        if os.path.exists(j):
            assert os.path.getsize(j) <= batas, (nama, os.path.getsize(j), batas)
            d = json.load(open(j))
            if nama.endswith(".geojson"):  # GeoJSON valid: FeatureCollection, tiap fitur bergeometri koordinat dalam kotak, garis >= 2 titik
                assert d["type"] == "FeatureCollection" and d["features"]
                for f in d["features"]:
                    assert f["type"] == "Feature" and f["geometry"]["type"] == "MultiLineString"
                    for gs in f["geometry"]["coordinates"]:
                        assert len(gs) >= 2 and all(len(c) == 2 and KOTAK[0] <= c[0] <= KOTAK[2] and KOTAK[1] <= c[1] <= KOTAK[3] for c in gs)
            else:
                assert d["nilai"] and all(0 <= v <= 1 for v in d["nilai"].values()), nama
    m = os.path.join(KELUAR, "bahaya_meta.json")
    if os.path.exists(m):  # lapisan yang dibuang tidak boleh ada berkasnya (A18: dibuang, bukan kosong)
        for nama in json.load(open(m))["dibuang"]:
            assert not os.path.exists(os.path.join(KELUAR, nama)), nama
    assert not os.path.exists(os.path.join(KELUAR, "sesar.geojson")), "sesar Pusgen tidak boleh di-commit (lisensi belum jelas)"
    print("ok")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main()
