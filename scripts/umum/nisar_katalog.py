"""Katalog NISAR (radar L-band NASA-ISRO) di ASF DAAC: kapan terakhir melintas per kabupaten, berapa lintas 30 hari, tersedia GCOV/GUNW. KATALOG saja, tanpa olah raster.
-> public/data/nisar_katalog.json   Menjawab "kapan citra radar berikutnya ada di daerah X" saat kejadian (pemakai: penilaian kerusakan).
Akses (diperiksa 10 Nov 2026, tanpa login): GET https://api.daac.asf.alaska.edu/services/search/param?dataset=NISAR&processingLevel=GCOV|GUNW&bbox=95,-11,141,6&start=&end=&output=geojson
  (pemisah level di URL = koma; satu permintaan besar -> 500/502, jadi dipecah per 7 hari dan per level). Mengunduh data butuh akun Earthdata; katalog tidak.
Satu lintas = (pathNumber, arah terbang, tanggal). Kab dicari dari titik sampel di dalam jejak adegan (~2 derajat) lewat citra_terbuka.kab_di_cincin.
perkiraan_lintas_berikutnya = lintas terakhir tiap jalur + kelipatan 12 hari (siklus ulang orbit NISAR) yang > hari ini: PERKIRAAN pola ulang, bukan jadwal akuisisi.
Pakai: python3 scripts/umum/nisar_katalog.py   |   python3 scripts/umum/nisar_katalog.py uji
"""
import datetime as dt, importlib.util, math, os, sys

AKAR = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "../.."))
DIR = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(AKAR, "public/data/nisar_katalog.json")
API = "https://api.daac.asf.alaska.edu/services/search/param?dataset=NISAR&processingLevel={lv}&bbox=95,-11,141,6&start={s}T00:00:00Z&end={e}T00:00:00Z&output=geojson&maxResults=3000"
JENDELA, LEVEL, SIKLUS = 45, ("GCOV", "GUNW"), 12


def _mod(nama):
    s = importlib.util.spec_from_file_location("umum_" + nama, os.path.join(DIR, nama + ".py"))
    m = importlib.util.module_from_spec(s)
    s.loader.exec_module(m)
    return m


def berikutnya(terakhir, hari_ini):
    """tanggal ISO lintas terakhir -> kelipatan SIKLUS hari sesudahnya yang > hari_ini."""
    t = dt.date.fromisoformat(terakhir)
    return (t + dt.timedelta(days=SIKLUS * max(1, math.ceil((hari_ini - t).days / SIKLUS)))).isoformat() if hari_ini >= t else t.isoformat()


def per_kab(fitur, hari_ini, kab_fn):
    """fitur geojson ASF -> {kab: {...}}; kab_fn(cincin) -> himpunan kab (di-cache per jejak)."""
    cache, kab = {}, {}
    batas = (hari_ini - dt.timedelta(days=30)).isoformat()
    for f in fitur:
        p, cincin = f["properties"], f["geometry"]["coordinates"][0]
        kunci = tuple((round(x, 2), round(y, 2)) for x, y in cincin)
        if kunci not in cache:
            cache[kunci] = kab_fn(cincin)
        tgl, lintas = p["startTime"][:10], (p["pathNumber"], p["flightDirection"], p["startTime"][:10])
        for k in cache[kunci]:
            d = kab.setdefault(k, {"lintas": set(), "level": {}, "jalur": {}, "adegan": {}})
            d["lintas"].add(lintas)
            d["level"][p["processingLevel"]] = max(d["level"].get(p["processingLevel"], ""), tgl)
            j = (p["pathNumber"], p["flightDirection"])
            d["jalur"][j] = max(d["jalur"].get(j, ""), tgl)
            if tgl >= d["adegan"].get("tanggal", ""):
                d["adegan"] = {"tanggal": tgl, "id": p["fileID"]}
    out = {}
    for k, d in sorted(kab.items()):
        terakhir = max(d["jalur"].values())
        out[k] = {"terakhir_lintas": terakhir, "lintas_30_hari": sum(t[2] >= batas for t in d["lintas"]), "lintas_jendela": len(d["lintas"]),
                  "tersedia": {lv: lv in d["level"] for lv in LEVEL}, "terakhir_per_level": d["level"], "jalur_arah": sorted(f"{j[0]}{j[1][0]}" for j in d["jalur"]),
                  "perkiraan_lintas_berikutnya": min(berikutnya(t, hari_ini) for t in d["jalur"].values()), "adegan_terbaru": d["adegan"]["id"]}
    return out


def jendela(J, lv, s, e, gagal):
    """Fitur satu level di [s,e). Server ASF kadang 502 deterministik untuk rentang tertentu: belah dua sampai 1 hari, sisanya dicatat di `gagal`."""
    try:
        d = J.ambil(API.format(lv=lv, s=s, e=e), jeda_host=2, batas=120, coba=2 if (e - s).days <= 1 else 1)
        if d is None:
            raise RuntimeError("HTTP 5xx berulang")
        return d["features"]
    except Exception as ex:
        if (e - s).days <= 1:
            gagal.append(f"{lv} {s}: {ex}")
            return []
        t = s + (e - s) / 2
        return jendela(J, lv, s, t, gagal) + jendela(J, lv, t, e, gagal)


def jalan():
    J, simp = _mod("jaring"), _mod("kejadian").simpan
    C = _mod("citra_terbuka")
    W = C.wilayah()
    hari_ini = dt.datetime.now(dt.timezone.utc).date()
    fitur, gagal = [], []
    for lv in LEVEL:
        for i in range(0, JENDELA, 7):
            e, s = hari_ini + dt.timedelta(days=1) - dt.timedelta(days=i), hari_ini + dt.timedelta(days=1) - dt.timedelta(days=i + 7)
            fitur += jendela(J, lv, s, e, gagal)
    uniq = {f["properties"]["fileID"]: f for f in fitur}.values()
    kab = per_kab(uniq, hari_ini, lambda c: C.kab_di_cincin(W, c))
    simp(OUT, {"sumber": "NISAR di ASF DAAC (NASA/ISRO), katalog GCOV dan GUNW", "atribusi": "NASA/JPL-Caltech dan ISRO, NISAR; katalog ASF DAAC, https://asf.alaska.edu; data dilayani NASA Earthdata",
               "lisensi": "Data NISAR terbuka tanpa biaya (kebijakan data terbuka NASA); unduh butuh akun Earthdata, katalog tidak", "jenis_keluaran": "KATALOG (belum ada olah raster)",
               "tanggal": hari_ini.isoformat(), "jendela_hari": JENDELA, "gagal": gagal,
               "ringkasan": {"adegan": len(uniq), "kab_tercakup": len(kab), "data_terbaru": max((f["properties"]["startTime"][:10] for f in uniq), default=None)},
               "catatan": "Adegan GCOV/GUNW baru muncul beberapa hari setelah lintas, jadi tanggal terakhir tertinggal dari lintas sebenarnya. Kab dari titik sampel jejak (kab sangat kecil bisa terlewat). "
                          "perkiraan_lintas_berikutnya = pola ulang 12 hari, bukan jadwal akuisisi.", "kab": kab})
    print(f"nisar_katalog: {len(uniq)} adegan, {len(kab)} kab, gagal {len(gagal)}")


def uji():
    h = dt.date(2026, 11, 10)
    assert berikutnya("2026-10-29", h) == "2026-11-10" and berikutnya("2026-10-20", h) == "2026-11-13" and berikutnya("2026-11-12", h) == "2026-11-12"
    kotak = lambda x0, y0, x1, y1: [[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]]
    mk = lambda lv, t, path, fid: {"properties": {"processingLevel": lv, "startTime": t, "pathNumber": path, "flightDirection": "DESCENDING", "fileID": fid},
                                  "geometry": {"coordinates": [kotak(0, 0, 1, 1)]}}
    f = [mk("GCOV", "2026-11-05T01:00:00Z", 75, "a"), mk("GUNW", "2026-11-05T01:00:00Z", 75, "b"), mk("GCOV", "2026-10-20T01:00:00Z", 75, "c"), mk("GCOV", "2026-09-01T01:00:00Z", 75, "d")]
    o = per_kab(f, h, lambda c: {"62|X"})["62|X"]
    assert o["terakhir_lintas"] == "2026-11-05" and o["lintas_30_hari"] == 2 and o["lintas_jendela"] == 3, o  # GCOV+GUNW 5 Nov = satu lintas
    assert o["tersedia"] == {"GCOV": True, "GUNW": True} and o["perkiraan_lintas_berikutnya"] == "2026-11-17" and o["adegan_terbaru"] in ("a", "b"), o
    print("uji nisar_katalog: ok")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else jalan()
