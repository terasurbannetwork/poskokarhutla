"""Label kejadian longsor (#19) -> public/longsor/data/kejadian.json

Dua sumber, TIDAK dijumlahkan (beda tingkat dan beda liputan):
  glc   NASA Global Landslide Catalog / COOLR, titik berkoordinat, filter Indonesia. Layanan resmi
        data.nasa.gov (Socrata dd9e-wu2v) sudah mati (404/500, dicoba Okt 2026) dan host peta NASA (maps.nccs.nasa.gov)
        tidak terpecahkan DNS-nya dari mesin ini; yang dipakai salinan ArcGIS Online publik dari katalog yang sama
        (14.750 rekaman, tanpa kunci). Urutan SUMBER_GLC dicoba satu per satu. Katalog berhenti diperbarui, jadi
        liputannya tidak sampai tahun uji: GLC dipakai untuk presisi lokasi dan sebaran, DIBI untuk uji balik.
  dibi  DIBI BNPB per kabupaten per hari (Superset publik, pola dari scripts/banjir/kejadian.py: superset(), Pencocok).
        Jenis: "Tanah Longsor", "Gerakan Tanah" (gab=0) dan "Banjir dan Tanah Longsor" (gab=1, ikut banjir juga).

Keluaran: {"dibuat","atribusi","kab":["pp|nama kab"],"dibi":[[tgl,kab_idx,n,gab]],"glc":[[tgl,lon,lat,mati,akurasi,pemicu,kab_idx,kec_id|null]]}
Pakai:  python3 scripts/longsor/kejadian.py   |   python3 scripts/longsor/kejadian.py uji
"""
import datetime as dt, importlib.util, json, os, sys, urllib.parse

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dasar import AKAR, KELUAR, UA, WIB, Cari, ambil, daftar_kec, simpan

SUMBER_GLC = [
    "https://maps.nccs.nasa.gov/server/rest/services/global_landslide_catalog/landslide_points/FeatureServer/0",
    "https://services1.arcgis.com/yFGHRCyBneULM8ci/arcgis/rest/services/nasa_global_landslide_catalog_point/FeatureServer/0",
    "https://services9.arcgis.com/RrvMEynxDB8hycVO/arcgis/rest/services/nasa_global_landslide_catalog_point/FeatureServer/0",
]
JENIS_LONGSOR = {"Tanah Longsor": 0, "Gerakan Tanah": 0, "Banjir dan Tanah Longsor": 1}
ATRIBUSI = ("NASA Global Landslide Catalog / COOLR (Kirschbaum dkk. 2015, 2010), domain publik NASA; DIBI BNPB (dibi.bnpb.go.id), "
            "dasbor publik, tidak resmi lewat API.")


def _banjir_kejadian():
    s = importlib.util.spec_from_file_location("banjir_kejadian", os.path.join(AKAR, "scripts/banjir/kejadian.py"))
    m = importlib.util.module_from_spec(s)
    s.loader.exec_module(m)
    return m


def glc_indonesia():
    """Semua rekaman Indonesia dari sumber pertama yang menjawab -> (nama_sumber, [atribut])."""
    gagal = []
    for base in SUMBER_GLC:
        try:
            out, mulai = [], 0
            while True:
                col = "ctry_name" if "RrvMEyn" in base else "country_na"  # dua skema nama kolom salinan katalog
                q = urllib.parse.urlencode({"where": f"{col}='Indonesia'", "outFields": "*", "f": "json", "orderByFields": "FID",
                                            "resultOffset": mulai, "resultRecordCount": 1000})
                d = ambil(f"{base}/query?{q}", kepala=UA, batas_waktu=90)
                if "error" in d:
                    raise RuntimeError(str(d["error"])[:150])
                f = [x["attributes"] for x in d.get("features", [])]
                out += f
                if not d.get("exceededTransferLimit") or not f:
                    break
                mulai += len(f)
            return base, out
        except Exception as e:  # sumber berikutnya
            gagal.append(f"{base[:48]}: {str(e)[:100]}")
    raise RuntimeError("GLC: semua sumber gagal: " + " | ".join(gagal))


def glc_baris(a):
    """Atribut ArcGIS (dua skema nama kolom) -> (tgl, lon, lat, mati, akurasi, pemicu) atau None bila tanpa tanggal/koordinat."""
    g = lambda *ks: next((a[k] for k in ks if a.get(k) not in (None, "")), None)
    ms, lat, lon = g("event_date", "ev_date"), g("latitude"), g("longitude")
    if ms is None or lat is None or lon is None:
        return None
    tgl = (dt.datetime(1970, 1, 1) + dt.timedelta(milliseconds=ms)).date().isoformat() if isinstance(ms, (int, float)) else str(ms)[:10]
    return (tgl, round(float(lon), 4), round(float(lat), 4), int(g("fatality_c", "fatalities") or 0),
            str(g("location_a", "loc_accu") or "").strip(), str(g("landslid_1", "ls_trig") or "").strip())


def dibi_longsor(K, dari=2015):
    """-> [(tgl, 'pp|kab', n, gab)] per kabupaten per hari, jenis longsor DIBI."""
    cocok = K.Pencocok()
    hasil = {}
    for jenis, gab in JENIS_LONGSOR.items():
        for r in K.superset(["dt", "tahun", "provinsi", "kabupaten", "id_kab_bps", "jenis_bencana"],
                            [("jumlah_kejadian", "SUM(jumlah_kejadian)")],
                            [{"col": "jenis_bencana", "op": "==", "val": jenis}, {"col": "tahun", "op": ">=", "val": dari}]):
            if not r.get("dt") or not r.get("kabupaten"):
                continue
            kode = str(K.angka(r.get("id_kab_bps")))[:2] if r.get("id_kab_bps") else ""
            p, n = cocok.cari(str(r["kabupaten"]), kode)
            if not n:
                continue
            tgl = dt.datetime.fromtimestamp(r["dt"] / 1000, WIB).date().isoformat()
            k = (tgl, f"{p}|{n}", gab)
            hasil[k] = hasil.get(k, 0) + (K.angka(r.get("jumlah_kejadian")) or 1)
    return sorted((t, kab, n, g) for (t, kab, g), n in hasil.items())


def susun(dibi, glc, cari, kecs):
    kab, idx = [], {}
    def ik(nama):
        if nama not in idx:
            idx[nama] = len(kab)
            kab.append(nama)
        return idx[nama]
    d = [[t, ik(k), n, g] for t, k, n, g in dibi]
    g = []
    for t, lon, lat, mati, akur, pem in sorted(glc):
        n = cari.cari(lon, lat)
        k = kecs[n] if n is not None else None
        g.append([t, lon, lat, mati, akur, pem, ik(f"{k['prov']}|{k['kab']}") if k else None, k["id"] if k else None])
    return {"kab": kab, "dibi": d, "glc": g}


def jalan():
    K = _banjir_kejadian()
    sumber, mentah = glc_indonesia()
    glc = [b for b in (glc_baris(a) for a in mentah) if b]
    dibi = dibi_longsor(K)
    assert dibi, "DIBI longsor kosong"
    kecs = daftar_kec()
    isi = susun(dibi, glc, Cari(kecs), kecs)
    th = lambda xs: sorted({x[0][:4] for x in xs})
    simpan(os.path.join(KELUAR, "kejadian.json"), {
        "dibuat": dt.datetime.now(WIB).strftime("%Y-%m-%dT%H:%M+07:00"), "atribusi": ATRIBUSI, "sumber_glc": sumber,
        "kolom_dibi": ["tanggal", "kab", "n", "gab"], "kolom_glc": ["tanggal", "lon", "lat", "mati", "akurasi", "pemicu", "kab", "kec"],
        "catatan": "gab=1: 'Banjir dan Tanah Longsor' (ikut terhitung di banjir). kab = indeks ke daftar 'kab' ('kodeprov|nama di peta'). "
                   "GLC berhenti diperbarui sehingga tahun terakhirnya lebih awal dari DIBI.",
        "tahun_dibi": [th(dibi)[0], th(dibi)[-1]], "tahun_glc": [th(glc)[0], th(glc)[-1]] if glc else None, **isi})
    print(f"kejadian: DIBI {len(dibi)} baris kab-hari, GLC {len(glc)} titik ({sumber[:50]})", file=sys.stderr)


def uji():
    a = {"event_date": 1262304000000, "latitude": -6.9, "longitude": 107.6, "fatality_c": 2, "location_a": "1km", "landslid_1": "Downpour"}
    assert glc_baris(a) == ("2010-01-01", 107.6, -6.9, 2, "1km", "Downpour"), glc_baris(a)
    assert glc_baris({"latitude": 1, "longitude": 2}) is None
    assert glc_baris({"ev_date": 1262304000000, "latitude": 1, "longitude": 2, "fatalities": None})[3] == 0
    kecs = [{"id": "x|A|B", "prov": "x", "kab": "A", "kec": "B", "cincin": [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]]}]
    r = susun([("2024-01-01", "x|A", 2, 0)], [("2020-01-01", .5, .5, 0, "", ""), ("2020-01-02", 5, 5, 0, "", "")], Cari(kecs), kecs)
    assert r["dibi"] == [["2024-01-01", 0, 2, 0]] and r["glc"][0][6] == 0 and r["glc"][0][7] == "x|A|B" and r["glc"][1][6] is None
    print("kejadian: uji lolos")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else jalan()
