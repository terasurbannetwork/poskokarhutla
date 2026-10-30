"""#30 Dukcapil GIS: penduduk rentan terpapar per kabupaten = Sum desa/kelurahan yang titik pusatnya jatuh di zona bahaya InaRISK
-> public/data/bnpb/terpapar.json

SUMBER   Dukcapil Kemendagri, ArcGIS REST publik tanpa kunci:
         gis.dukcapil.kemendagri.go.id/arcgis/rest/services/AGR_VISUAL_KEL_FIX/FeatureServer/0 (83.489 desa/kelurahan; penduduk,
         umur per 5 tahun u0..u75, titik pusat lewat returnCentroid). Data administrasi kependudukan (bukan sensus); semester
         yang tersaji tidak tertulis di layanan, jadi `dukcapil_diakses` dicatat. Syarat pakai tidak dinyatakan di layanan: dipakai
         sebagai data publik, atribusi dicantumkan, unduhan dijeda 1 dtk per panggilan, cache lokal 30 hari.
         Zona bahaya: InaRISK BNPB raster 100 m 0-1 (gis.bnpb.go.id), kelas InaRISK: sedang 0,33-0,66, tinggi > 0,66.
RUMUS    desa d terpapar bahaya h pada kelas k  <=>  indeks_h(titik pusat d) > ambang_k   (ambang sedang+ 0,33; tinggi 0,66)
         rentan_d = balita (u0 = 0-4 th) + lansia (u60+u65+u70+u75 = >= 60 th)
         terpapar[kab][h][k] = Sum_d jiwa_d, Sum_d rentan_d   (per kabupaten, kode = no_prop + no_kab Dukcapil = kode BPS 4 digit)
BATAS    Titik pusat satu desa mewakili seluruh desa: desa besar yang separuhnya di zona bisa terhitung nol atau penuh. Ini
         PENDEKATAN paparan, bukan overlay poligon; galat meningkat di desa luas (Papua, Kalimantan). Raster bahaya kosong di luar
         zona = 0. Penduduk Dukcapil beda dari WorldPop (penduduk.json) beberapa persen.
KELUARAN {"dibuat","sumber","atribusi","lisensi","ambang","bahaya":[...],"kolom_h":[...],"kab":{kode:{"n","b","l","d","h":{bahaya:[jiwa_sedang+,rentan_sedang+,jiwa_tinggi,rentan_tinggi]}}}}
Pakai:  python3 scripts/bnpb/terpapar.py [--ulang]   |   python3 scripts/bnpb/terpapar.py --cek
"""
import json, os, sys, time
from concurrent.futures import ThreadPoolExecutor

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import hvc_dasar as D

DUKCAPIL = "https://gis.dukcapil.kemendagri.go.id/arcgis/rest/services/AGR_VISUAL_KEL_FIX/FeatureServer/0/query"
INARISK = "https://gis.bnpb.go.id/server/rest/services/inarisk"
LAPISAN = {"banjir": "layer_bahaya_banjir", "longsor": "layer_bahaya_tanah_longsor", "karhutla": "layer_bahaya_kebakaran_hutan_dan_lahan",
           "kekeringan": "layer_bahaya_kekeringan", "gempa": "layer_bahaya_gempabumi"}
AMBANG = (0.33, 0.66)
KOLOM_H = ["jiwa_sedang_plus", "rentan_sedang_plus", "jiwa_tinggi", "rentan_tinggi"]
FIELD = "objectid,no_prop,no_kab,no_kec,kode_desa_spatial,jumlah_penduduk,u0,u60,u65,u70,u75"
HALAMAN = 10000
PER_PANGGIL = 200
UMUR_CACHE_HARI = 30


def desa_dari_fitur(fitur):
    """Fitur ArcGIS (attributes + centroid) -> baris desa ringkas atau None bila tanpa penduduk/titik."""
    a, c = fitur.get("attributes") or {}, fitur.get("centroid") or {}
    if c.get("x") is None or c.get("y") is None or not a.get("jumlah_penduduk"):
        return None
    angka = lambda v: int(v) if v is not None else 0
    return {"oid": a["objectid"], "kab": D.kode_dukcapil(a["no_prop"], a["no_kab"]), "n": angka(a["jumlah_penduduk"]), "b": angka(a.get("u0")),
            "l": sum(angka(a.get(k)) for k in ("u60", "u65", "u70", "u75")), "x": round(c["x"], 5), "y": round(c["y"], 5)}


def tarik_desa():
    """Semua desa Dukcapil, urut objectid (urutan menjadi kunci cache hazard)."""
    cache = os.path.join(D.MENTAH, "dukcapil_desa.json")
    if os.path.exists(cache) and time.time() - os.path.getmtime(cache) < UMUR_CACHE_HARI * 86400 and "--ulang" not in sys.argv:
        return json.load(open(cache))
    hasil, offset = [], 0
    while True:
        r = D.ambil(DUKCAPIL, {"where": "1=1", "outFields": FIELD, "returnGeometry": "false", "returnCentroid": "true",
                               "orderByFields": "objectid", "resultOffset": offset, "resultRecordCount": HALAMAN, "f": "json"})
        if "error" in r:
            raise RuntimeError(f"Dukcapil: {r['error']}")
        fs = r.get("features", [])
        hasil += [d for d in (desa_dari_fitur(f) for f in fs) if d]
        print(f"  Dukcapil offset {offset}: {len(fs)} fitur, {len(hasil)} desa berpenduduk", file=sys.stderr)
        offset += len(fs)
        if not r.get("exceededTransferLimit") or not fs:
            break
    os.makedirs(D.MENTAH, exist_ok=True)
    json.dump(hasil, open(cache, "w"), separators=(",", ":"))
    return hasil


def sampel(layanan, titik):
    """titik [(lon, lat)] -> [indeks 0-1] urut sama (kosong = 0). getSamples multipoint 200 titik/panggilan."""
    out = [0.0] * len(titik)
    for a in range(0, len(titik), PER_PANGGIL):
        geom = json.dumps({"points": [list(p) for p in titik[a:a + PER_PANGGIL]], "spatialReference": {"wkid": 4326}})
        r = D.ambil(f"{INARISK}/{layanan}/ImageServer/getSamples", {"geometry": geom, "geometryType": "esriGeometryMultipoint",
                                                                    "returnFirstValueOnly": "true", "f": "json"})
        if "error" in r:
            raise RuntimeError(f"{layanan}: {r['error']}")
        for s in r.get("samples", []):
            v = s.get("value")
            out[a + s["locationId"]] = round(float(v), 3) if v not in ("", None, "NoData") else 0.0
    return out


def hazard_desa(desa, kunci):
    """Indeks bahaya per desa untuk satu lapisan, dengan cache per lapisan (jalan 8 menit lebih bisa disambung)."""
    cache = os.path.join(D.MENTAH, f"terpapar_{kunci}.json")
    if os.path.exists(cache) and "--ulang" not in sys.argv:
        v = json.load(open(cache))
        if len(v) == len(desa):
            return v
    v = sampel(LAPISAN[kunci], [(d["x"], d["y"]) for d in desa])
    os.makedirs(D.MENTAH, exist_ok=True)
    json.dump(v, open(cache, "w"), separators=(",", ":"))
    return v


def agregasi(desa, indeks):
    """desa [dict] + indeks {bahaya: [nilai per desa]} -> {kab: {n, b, l, d, h:{bahaya:[4 angka]}}}."""
    out = {}
    for i, d in enumerate(desa):
        k = out.setdefault(d["kab"], {"n": 0, "b": 0, "l": 0, "d": 0, "h": {h: [0, 0, 0, 0] for h in indeks}})
        k["n"] += d["n"]; k["b"] += d["b"]; k["l"] += d["l"]; k["d"] += 1
        for h, v in indeks.items():
            if v[i] > AMBANG[0]:
                k["h"][h][0] += d["n"]; k["h"][h][1] += d["b"] + d["l"]
            if v[i] > AMBANG[1]:
                k["h"][h][2] += d["n"]; k["h"][h][3] += d["b"] + d["l"]
    return out


def jalan():
    mulai = time.time()
    desa = tarik_desa()
    print(f"{len(desa)} desa berpenduduk", file=sys.stderr)
    with ThreadPoolExecutor(3) as ex:   # 3 lapisan sekaligus, tiap utas tetap berjeda 1 dtk per panggilan
        hasil = list(ex.map(lambda h: hazard_desa(desa, h), LAPISAN))
    indeks = dict(zip(LAPISAN, hasil))
    kab = agregasi(desa, indeks)
    info = D.kab_info()
    tak = sorted(k for k in kab if k not in info)
    D.simpan_plafon("terpapar.json", {
        "sumber": "Dukcapil Kemendagri (gis.dukcapil.kemendagri.go.id, penduduk dan umur per desa/kelurahan) x InaRISK BNPB (indeks bahaya raster 100 m)",
        "atribusi": "Direktorat Jenderal Kependudukan dan Pencatatan Sipil, Kemendagri; Badan Nasional Penanggulangan Bencana (InaRISK)",
        "lisensi": "layanan ArcGIS REST publik tanpa kunci; syarat pakai tidak dinyatakan, lisensi InaRISK tidak tertulis (bukan klaim data terbuka)",
        "dukcapil_diakses": time.strftime("%Y-%m-%d"),
        "metode": "desa terpapar bila indeks bahaya di titik pusatnya melewati ambang; rentan = balita 0-4 + lansia >= 60; pendekatan titik pusat, bukan overlay poligon",
        "ambang": {"sedang_plus": AMBANG[0], "tinggi": AMBANG[1]}, "bahaya": list(LAPISAN), "kolom_h": KOLOM_H,
        "kode_tak_dikenal": tak, "kab": kab})
    print(f"terpapar.json: {len(kab)} kabupaten, kode di luar daftar {len(tak)}, {time.time() - mulai:.0f} dtk", file=sys.stderr)


def _cek():
    f = {"attributes": {"objectid": 5, "no_prop": 33, "no_kab": 1, "jumlah_penduduk": 1000, "u0": 60, "u60": 50, "u65": 40, "u70": 30, "u75": 20},
         "centroid": {"x": 109.12345678, "y": -7.5}}
    d = desa_dari_fitur(f)
    assert d == {"oid": 5, "kab": "3301", "n": 1000, "b": 60, "l": 140, "x": 109.12346, "y": -7.5}, d
    assert desa_dari_fitur({"attributes": {"objectid": 1, "no_prop": 1, "no_kab": 1, "jumlah_penduduk": 0}, "centroid": {"x": 1, "y": 1}}) is None
    assert desa_dari_fitur({"attributes": {"jumlah_penduduk": 5}}) is None
    d2 = dict(d, kab="3301", n=500, b=10, l=40)
    d3 = dict(d, kab="3302", n=200, b=5, l=5)
    ag = agregasi([d, d2, d3], {"banjir": [0.9, 0.5, 0.2], "gempa": [0.0, 0.33, 0.67]})
    assert ag["3301"]["n"] == 1500 and ag["3301"]["b"] == 70 and ag["3301"]["l"] == 180 and ag["3301"]["d"] == 2
    assert ag["3301"]["h"]["banjir"] == [1500, 250, 1000, 200], ag["3301"]["h"]["banjir"]   # 0,5 > 0,33 tapi bukan > 0,66
    assert ag["3301"]["h"]["gempa"] == [0, 0, 0, 0]                                      # persis 0,33 BUKAN terpapar (ambang tegas >)
    assert ag["3302"]["h"]["gempa"] == [200, 10, 200, 10] and ag["3302"]["h"]["banjir"] == [0, 0, 0, 0]
    # terpapar tak pernah melebihi penduduk, tinggi <= sedang_plus
    for k in ag.values():
        for h in k["h"].values():
            assert h[2] <= h[0] <= k["n"] and h[3] <= h[1] <= k["b"] + k["l"]
    assert set(LAPISAN) == {"banjir", "longsor", "karhutla", "kekeringan", "gempa"} and len(KOLOM_H) == 4
    print("terpapar: --cek hijau")


if __name__ == "__main__":
    _cek() if "--cek" in sys.argv else jalan()
