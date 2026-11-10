"""Citra udara/satelit terbuka OpenAerialMap (CC BY 4.0) -> indeks citra per kabupaten (tanggal, resolusi, penyedia, jejak), terbaru dulu.
-> public/data/citra_terbuka.json   (kotak Indonesia 95,-11,141,6; ~1.100 citra; tanpa kontak pengunggah)
Kab dicari dari titik sampel di dalam jejak citra lewat scripts/data/wilayah.py (satu-satunya salinan); citra besar bisa menyentuh beberapa kab.
Pemakai: penilaian kerusakan (citra pasca kejadian di kab X: tanggal, GSD, tautan ubin TMS). INDEKS katalog, bukan olahan citra.
Pakai: python3 scripts/umum/citra_terbuka.py   |   python3 scripts/umum/citra_terbuka.py uji
"""
import importlib.util, math, os, re, sys

AKAR = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "../.."))
DIR = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(AKAR, "public/data/citra_terbuka.json")
API = "https://api.openaerialmap.org/meta?bbox=95,-11,141,6&limit=100&order_by=acquisition_end&sort=desc&page="
PER_KAB = 15


def _mod(nama, jalur=None):
    s = importlib.util.spec_from_file_location("umum_" + nama, jalur or os.path.join(DIR, nama + ".py"))
    m = importlib.util.module_from_spec(s)
    s.loader.exec_module(m)
    return m


_WM = []


def wilayah():
    """Instance Wilayah() dari scripts/data/wilayah.py; modulnya disimpan untuk _di_dalam."""
    if not _WM:
        _WM.append(_mod("wilayah_data", os.path.join(AKAR, "scripts/data/wilayah.py")))
    return _WM[0].Wilayah()


def kab_di_cincin(W, cincin, langkah=0.02, maks_titik=2500):
    """Himpunan 'kodeprov|nama kab' yang disentuh titik sampel di dalam cincin [[lon,lat],...] (langkah derajat, dilebarkan bila titik > maks_titik).
    # ponytail: sampel grid, kab kecil di bawah `langkah` bisa terlewat; untuk jejak kecil titik tengah selalu dicoba."""
    xs, ys = [c[0] for c in cincin], [c[1] for c in cincin]
    x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
    langkah = max(langkah, math.sqrt(max(x1 - x0, 1e-9) * max(y1 - y0, 1e-9) / maks_titik))
    titik = [((x0 + x1) / 2, (y0 + y1) / 2)]
    for i in range(int((x1 - x0) / langkah) + 1):
        for j in range(int((y1 - y0) / langkah) + 1):
            x, y = x0 + i * langkah, y0 + j * langkah
            if _WM[0]._di_dalam(x, y, cincin):
                titik.append((x, y))
    out = set()
    for x, y in titik:
        h = W.cari(x, y)
        if h:
            out.add(f"{h[0]}|{h[1]}")
    return out


def bersih(t, maks=120):
    """Teks bebas OAM (provider, title, platform) -> tanpa email dan deretan digit >= 8 (nomor HP); sisa '@' -> None."""
    if not isinstance(t, str):
        return None
    t = re.sub(r"[\w.+-]+@[\w-]+(\.[\w-]+)+", " ", t)
    t = re.sub(r"\+?\d[\d\s().-]{6,}\d", lambda m: " " if len(re.sub(r"\D", "", m.group())) >= 8 else m.group(), t)
    t = re.sub(r"\s+", " ", t).strip(" ,;:-")
    return None if "@" in t or not t else t[:maks]


def ringkas(x):
    j = x["geojson"]
    g = j["coordinates"][0] if j.get("type") == "Polygon" else j["coordinates"][0][0]  # MultiPolygon atau Polygon
    return {"id": x["_id"], "tanggal": x["acquisition_end"][:10], "gsd_m": round(x["gsd"], 3), "penyedia": bersih(x.get("provider")), "platform": bersih(x.get("platform"), 30),
            "judul": bersih(x.get("title")), "bbox": [round(v, 5) for v in x["bbox"]], "lisensi": bersih((x.get("properties") or {}).get("license"), 30),
            "tms": (x.get("properties") or {}).get("tms"), "gambar_kecil": (x.get("properties") or {}).get("thumbnail")}, g


def per_kab(W, daftar):
    """daftar OAM mentah -> {kab: [ringkas, terbaru dulu, maks PER_KAB]}, jumlah tanpa kab."""
    kab, tanpa = {}, 0
    for x in sorted(daftar, key=lambda x: x["acquisition_end"], reverse=True):
        r, cincin = ringkas(x)
        ks = kab_di_cincin(W, cincin)
        tanpa += not ks
        for k in ks:
            kab.setdefault(k, []).append(r)
    return {k: {"jumlah": len(v), "citra": v[:PER_KAB]} for k, v in sorted(kab.items())}, tanpa


def jalan():
    J, simp = _mod("jaring"), _mod("kejadian").simpan
    daftar, hal, status = [], 1, "ok"
    while True:
        try:
            d = J.ambil(API + str(hal), jeda_host=1)
        except Exception as e:
            status = f"gagal di halaman {hal}: {e}"
            break
        daftar += d["results"]
        if len(daftar) >= d["meta"]["found"] or not d["results"]:
            break
        hal += 1
    kab, tanpa = per_kab(wilayah(), daftar)
    simp(OUT, {"sumber": "OpenAerialMap (HOT, OSM Indonesia dan kontributor)", "atribusi": "OpenAerialMap, https://openaerialmap.org; hak citra pada penyedia tiap citra (kolom penyedia)",
               "lisensi": "CC BY 4.0 (sesuai meta API)", "jenis_keluaran": "INDEKS katalog citra (tanpa olah piksel)", "akses": status,
               "ringkasan": {"citra": len(daftar), "kab_tercakup": len(kab), "citra_tanpa_kab": tanpa, "terbaru": max((x["acquisition_end"][:10] for x in daftar), default=None)},
               "catatan": f"Per kab maksimal {PER_KAB} citra terbaru; jumlah memuat semua. Kab dari titik sampel jejak (kab kecil bisa terlewat). gsd_m = ukuran piksel meter. Kontak pengunggah tidak disimpan.",
               "kab": kab})
    print(f"citra_terbuka: {len(daftar)} citra, {len(kab)} kab, {tanpa} tanpa kab; {status}")


def uji():
    W = wilayah()
    kotak = lambda x0, y0, x1, y1: [[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]]
    assert kab_di_cincin(W, kotak(113.91, -2.22, 113.93, -2.20)) == {"62|Kota Palangkaraya"}
    assert kab_di_cincin(W, kotak(108.0, -5.1, 108.1, -5.0)) == set()  # laut
    assert len(kab_di_cincin(W, kotak(112, -4, 116, 0))) > 5            # jejak besar, titik dibatasi
    x = {"_id": "a", "acquisition_end": "2026-05-01T00:00:00Z", "gsd": 0.1234, "provider": "P", "platform": "uav", "title": "T", "bbox": [113.91, -2.22, 113.93, -2.2],
         "geojson": {"coordinates": [[kotak(113.91, -2.22, 113.93, -2.2)]]}, "properties": {"license": "CC-BY 4.0"}, "contact": "x@y"}
    poli = {**x, "_id": "p", "geojson": {"type": "Polygon", "coordinates": [kotak(113.91, -2.22, 113.93, -2.2)]}}
    assert per_kab(W, [poli])[0]["62|Kota Palangkaraya"]["jumlah"] == 1
    k, tanpa = per_kab(W, [x, {**x, "_id": "b", "acquisition_end": "2026-06-01T00:00:00Z"}])
    assert [c["id"] for c in k["62|Kota Palangkaraya"]["citra"]] == ["b", "a"] and tanpa == 0 and "contact" not in k["62|Kota Palangkaraya"]["citra"][0]
    assert bersih("Budi budi@mail.com 0812-3456-7890") == "Budi" and bersih("a@b") is None and bersih("PMI 2026") == "PMI 2026" and bersih("+62 812 3456 7890 Ani") == "Ani"
    assert bersih("Kontak: x@") is None and bersih("TOT") == "TOT"
    print("uji citra_terbuka: ok")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else jalan()
