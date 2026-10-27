"""Copernicus GFM (Global Flood Monitoring) untuk Jakarta: daftar item STAC, unduh GeoTIFF kejadian, ringkasan per kecamatan.

Sumber: STAC https://stac.eodc.eu/api/v1 koleksi GFM, aset di data.eodc.eu (bebas, tanpa kunci; terbukti 27 Okt 2026).
Aset: ensemble_flood_extent (0 kering, 1 tergenang, 255 tak teramati/laut), exclusion_mask (1 = ter-mask: kota padat,
bukaan lahan dsb.; di situ GFM tidak melapor). Ubin Equi7 Oceania 300 km, 20 m; dibaca tanpa GDAL (tiff_mini + equi7).
Berkas ZSTD: butuh `zstd` CLI (ada di ubuntu-latest), paket zstandard, atau Python 3.14.
Penghitungan luas: titik sampel tiap 0,0005 derajat (~55 m) di dalam poligon kecamatan DKI, bobot luas sel.
Lisensi: Copernicus CEMS GFM, syarat https://global-flood.emergency.copernicus.eu/terms-of-service/ (atribusi wajib).
Keluaran: data/raw/banjir/genangan/gfm/ (GeoTIFF, item.json), public/banjir/data/genangan/gfm_kec.json.
"""
import datetime as dt, math, os, sys, time, urllib.parse
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from bersama import KEJADIAN, KOTAK, MENTAH, RINGKAS, WIB, KecDKI, ambil_berkas, ambil_json, baca, hari, simpan
from equi7 import maju
from tiff_mini import Tiff

STAC = "https://stac.eodc.eu/api/v1/search"
ATRIBUSI = "Copernicus Emergency Management Service, Global Flood Monitoring (GFM), EODC; ringkasan oleh Pantau Bencana. Syarat: https://global-flood.emergency.copernicus.eu/terms-of-service/"
LANGKAH = 0.0005   # derajat
DIR = os.path.join(MENTAH, "gfm")


def daftar():
    """Semua item GFM yang memotong kotak, 2015-kini -> data/raw/.../gfm/item.json (ringkas)."""
    q = {"collections": "GFM", "bbox": ",".join(map(str, KOTAK)), "limit": 500,
         "datetime": f"2015-01-01T00:00:00Z/{dt.datetime.utcnow():%Y-%m-%dT%H:%M:%SZ}"}
    url, hasil = STAC + "?" + urllib.parse.urlencode(q), {}
    while url:
        d = ambil_json(url)
        for f in d["features"]:
            p, a = f["properties"], f["assets"]
            if "ensemble_flood_extent" not in a:
                continue
            hasil[f["id"]] = {"id": f["id"], "waktu": p["datetime"], "tile": p.get("Equi7Tile"), "bbox": p["proj:bbox"],
                              "tergenang_px": p.get("flooded_pixels"), "anomali": p.get("anomaly_detected"),
                              "banjir": a["ensemble_flood_extent"]["href"], "mask": a.get("exclusion_mask", {}).get("href")}
        url = next((l["href"] for l in d.get("links", []) if l.get("rel") == "next"), None)
        time.sleep(1)
    item = sorted(hasil.values(), key=lambda i: i["waktu"])
    simpan(os.path.join(DIR, "item.json"), item)
    return item


def dalam_kejadian(waktu):
    d = waktu[:10]
    return next((k for k, (a, b) in KEJADIAN.items() if a <= d <= b), None)


def titik_sampel(kec):
    """[(idx_kec, x, y, luas_km2)] + nama kecamatan; x,y di Equi7. Dihitung sekali per jalan."""
    nama, idx, hasil = [], {}, []
    lon = KOTAK[0]
    while lon <= KOTAK[2]:
        lat = KOTAK[1]
        while lat <= KOTAK[3]:
            k = kec.cari(lon, lat)
            if k:
                i = idx.setdefault(k, len(idx))
                if i == len(nama):
                    nama.append(f"{k[0]}|{k[1]}")
                x, y = maju(lon, lat)
                luas = (LANGKAH * 111.32 * math.cos(math.radians(lat))) * (LANGKAH * 110.57)
                hasil.append((i, x, y, luas))
            lat += LANGKAH
        lon += LANGKAH
    return nama, hasil


class Baca:
    """Akses piksel by (x,y) dengan cache ubin."""
    def __init__(self, jalur, x0, y0):
        self.t, self.x0, self.y0, self.c = Tiff(jalur), x0, y0, {}

    def __call__(self, x, y):
        k, b = int((x - self.x0) // 20), int((self.y0 - y) // 20)
        if not (0 <= k < self.t.lebar and 0 <= b < self.t.tinggi):
            return None
        kunci = (k // 512, b // 512)
        if kunci not in self.c:
            self.c[kunci] = self.t.ubin(*kunci)
        return self.c[kunci][(b % 512) * 512 + k % 512]


def ringkas_item(it, nama, titik):
    nf = os.path.join(DIR, "tif", os.path.basename(it["banjir"]))
    nm = os.path.join(DIR, "tif", os.path.basename(it["mask"]))
    x0, y0 = it["bbox"][0], it["bbox"][3]
    f, m = Baca(nf, x0, y0), Baca(nm, x0, y0)
    acc = [[0.0] * 5 for _ in nama]  # luas, diamati, tergenang, mask, kering tak ter-mask
    dalam = 0
    for i, x, y, l in titik:
        v = f(x, y)
        if v is None:
            continue
        dalam += 1
        a, e = acc[i], m(x, y)
        a[0] += l
        if v != 255:
            a[1] += l
            if v == 1:
                a[2] += l
            elif e != 1:
                a[4] += l
        if e == 1:
            a[3] += l
    kunci = ("luas_km2", "diamati_km2", "tergenang_km2", "mask_km2", "kering_tak_mask_km2")
    kec = {n: {k: round(v, 3) for k, v in zip(kunci, a)} for n, a in zip(nama, acc) if a[0] > 0}
    kota = {k: round(sum(a[j] for a in acc), 3) for j, k in enumerate(kunci)}
    return {"id": it["id"], "utc": it["waktu"], "wib": dt.datetime.fromisoformat(it["waktu"].replace("Z", "+00:00")).astimezone(WIB).isoformat(timespec="minutes"),
            "tile": it["tile"], "titik_dalam_ubin": dalam, "titik_total": len(titik), "tergenang_px_item": it["tergenang_px"],
            "kota": kota, "kec": kec}


def jalankan(unduh_saja=False):
    item = daftar()
    print(f"{len(item)} item GFM (2015-kini) memotong kotak; tahun: " +
          ", ".join(f"{y}={sum(1 for i in item if i['waktu'][:4] == str(y))}" for y in sorted({int(i['waktu'][:4]) for i in item})))
    pilih = [i for i in item if dalam_kejadian(i["waktu"])]
    total = 0
    for it in pilih:
        for k in ("banjir", "mask"):
            if not it[k]:
                it["gagal"] = True
                print(f"  tanpa aset {k}: {it['id']}", file=sys.stderr)
                continue
            try:
                total += ambil_berkas(it[k], os.path.join(DIR, "tif", os.path.basename(it[k])))
            except RuntimeError as e:
                print(f"  GAGAL {it['id']} {k}: {e}", file=sys.stderr)
                it["gagal"] = True
        time.sleep(0.5)
    print(f"{len(pilih)} item kejadian, {total / 1e6:.1f} MB")
    if unduh_saja:
        return
    nama, titik = titik_sampel(KecDKI())
    out = {}
    for it in pilih:
        if it.get("gagal"):
            continue
        out.setdefault(dalam_kejadian(it["waktu"]), []).append(ringkas_item(it, nama, titik))
    simpan(os.path.join(RINGKAS, "gfm_kec.json"), {
        "dibuat": dt.datetime.now(WIB).isoformat(timespec="minutes"), "sumber": ATRIBUSI,
        "item_total_2015_kini": len(item),
        "catatan": "tergenang=ensemble_flood_extent==1; diamati=!=255; mask=exclusion_mask==1 (GFM tidak melapor di sana, kota padat banyak ter-mask); kering_tak_mask=diamati, 0, tak ter-mask. Sampel ~55 m.",
        "kejadian": out})
    for k, v in out.items():
        print(k, [(r["wib"][:16], r["kota"]["tergenang_km2"], r["kota"]["mask_km2"]) for r in v])


def uji():
    assert dalam_kejadian("2020-01-05T22:00:00Z") == "2020-01" and dalam_kejadian("2019-06-01T00:00:00Z") is None
    kec = KecDKI()
    nama, t = titik_sampel(kec)
    assert len(nama) >= 40 and len(t) > 100000, (len(nama), len(t))
    luas = sum(l for _, _, _, l in t)
    assert 600 < luas < 760, luas  # DKI darat ~ 662 km2
    print("ok", len(nama), len(t), round(luas))


if __name__ == "__main__":
    a = sys.argv[1:]
    uji() if a == ["uji"] else jalankan(unduh_saja=a == ["unduh"])
