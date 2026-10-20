"""Citra Sentinel-2 SEBELUM dan SESUDAH gempa M >= 6,5 dangkal di DARATAN (A32) -> public/gempa/data/citra/<id>_<YYYYMMDD>.png
dan public/gempa/data/citra.json (daftar {id, waktu_utc, lat, lon, m, nama, citra: [{tgl, berkas, bbox, fase, keterangan}]}).

Mesin STAC/COG/penilaian awan dipakai ulang dari scripts/gunungapi/citra.py (yang memakai scripts/data), tidak disalin. Warna semu SWIR-NIR-merah:
longsoran dan likuefaksi segar tampak sebagai tanah terbuka terang di hutan hijau tua. Adegan paling jelas dipilih (awan, tanpa-data rendah).
Kejadian dipilih dari riwayat_m5.json (USGS): M >= 6,5, kedalaman <= 70 km, titik jatuh di poligon kecamatan (darat), sejak Sentinel-2B (Apr 2017).
Gagal (STAC/COG tak terjangkau) = pesan dan keluar 0; berkas lama dibiarkan. Jalankan bulanan bersama statis.yml (langkah workflow milik sesi induk).
Pakai:  python3 scripts/gempa/citra.py          unduh dan tulis
        python3 scripts/gempa/citra.py uji      self-check (tanpa jaringan)
"""
import importlib.util, json, os, sys
from concurrent.futures import ThreadPoolExecutor

AKAR = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "../.."))
DATA = os.path.join(AKAR, "public/gempa/data")
KELUAR = os.path.join(DATA, "citra")
MIN_M, MAKS_DALAM, DARI = 6.5, 70, "2017-04-01"


def mesin_gunungapi():
    sp = importlib.util.spec_from_file_location("citra_gunungapi", os.path.join(AKAR, "scripts/gunungapi/citra.py"))
    m = importlib.util.module_from_spec(sp)
    sys.modules["citra_gunungapi"] = m
    sp.loader.exec_module(m)
    m.KELUAR = KELUAR
    return m


def kandidat(baris, di_darat):
    """baris riwayat_m5 [waktu_utc, lat, lon, dalam_km, m, prov] -> kejadian M besar, dangkal, di darat; di_darat(lon, lat) -> nama kecamatan atau None"""
    out = []
    for w, lat, lon, dalam, m, _ in baris:
        if m >= MIN_M and dalam <= MAKS_DALAM and w[:10] >= DARI and di_darat(lon, lat):
            out.append({"id": "G" + w[:10].replace("-", "") + f"_{round(m * 10)}", "waktu_utc": w, "lat": lat, "lon": lon, "m": m})
    return out


def sisi_km(m):
    return 30 if m >= 7 else 20   # retakan permukaan M 7 sekitar puluhan km; M 6,5 belasan km


def main():
    G = mesin_gunungapi()
    sys.path.insert(0, os.path.join(AKAR, "scripts/data"))
    from wilayah import Wilayah
    w = Wilayah()
    K = kandidat(json.load(open(os.path.join(DATA, "riwayat_m5.json")))["baris"], lambda lo, la: w.cari(lo, la))
    os.makedirs(KELUAR, exist_ok=True)
    try:
        G.mesin()
        with ThreadPoolExecutor(3) as ex:
            res = list(ex.map(lambda k: G.kerja((k["id"], k["waktu_utc"][:10], k["lat"], k["lon"], sisi_km(k["m"]),
                                                f"Gempa M {str(k['m']).replace('.', ',')} {k['waktu_utc'][:10]}")), K))
    except Exception as e:
        print(f"citra gempa gagal: {e}; berkas lama dibiarkan", file=sys.stderr)
        return
    daftar = []
    for k, (_, out) in zip(K, res):
        for e in out:
            e["berkas"] = e["berkas"].replace("/gunungapi/data/citra/", "/gempa/data/citra/")
        if out:
            daftar.append({**k, "citra": out})
    pakai = {os.path.basename(e["berkas"]) for d in daftar for e in d["citra"]}
    for f in os.listdir(KELUAR):
        if f.endswith(".png") and f not in pakai:
            os.remove(os.path.join(KELUAR, f))
    open(os.path.join(DATA, "citra.json.tmp"), "w").write(json.dumps({"sumber": "Sentinel-2 L2A (Copernicus/ESA via Earth Search STAC), warna semu SWIR-NIR-merah", "kejadian": daftar}, ensure_ascii=False, separators=(",", ":")))
    os.replace(os.path.join(DATA, "citra.json.tmp"), os.path.join(DATA, "citra.json"))
    print(f"citra gempa: {len(daftar)} dari {len(K)} kejadian punya citra", file=sys.stderr)


def uji():
    baris = [["2018-09-28T10:02", -0.256, 119.846, 20.0, 7.5, "72"], ["2018-08-17T15:35", -7.372, 119.802, 529.0, 6.5, "73"],   # dalam: ditolak
             ["2016-06-01T22:56", -2.097, 100.665, 50.0, 6.6, "13"], ["2021-12-14T03:20", -7.603, 122.227, 14.3, 7.3, "73"],      # sebelum 2017 / laut: ditolak
             ["2022-03-13T21:09", -0.629, 98.626, 28.0, 6.4, "12"]]                                                                  # M < 6,5: ditolak
    darat = lambda lo, la: not (lo == 122.227)
    k = kandidat(baris, darat)
    assert [x["id"] for x in k] == ["G20180928_75"], k
    assert sisi_km(7.5) == 30 and sisi_km(6.6) == 20
    G = mesin_gunungapi()
    assert G.KELUAR == KELUAR and callable(G.kerja) and callable(G.pilih)
    for f in os.listdir(KELUAR) if os.path.isdir(KELUAR) else []:
        if f.endswith(".png"):
            assert os.path.getsize(os.path.join(KELUAR, f)) <= 300_000, f"{f} > 300 KB"
    print("citra gempa uji: ok")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main()
