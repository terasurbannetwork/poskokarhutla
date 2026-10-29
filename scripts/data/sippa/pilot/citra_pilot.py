"""Sentinel-2 L2A (SWIR B12/B8A/B04) terbaru yang masih terbaca per lokasi pilot, memakai fungsi scripts/data/citra.py.
SCL menandai kabut asap sebagai awan, jadi adegan dinilai dari gambarnya sendiri: kontras cukup dan tidak putih rata.
Pakai: python3 citra_pilot.py <id> <lat> <lon> <km>   -> img/<id>_s2.jpg (kontras ditarik) + img/<id>_s2.json"""
import datetime as dt, json, os, sys
from PIL import Image, ImageOps, ImageStat
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "../.."))
import citra as C  # noqa: E402

OUT = os.environ.get("RENLAP_OUT") or os.path.dirname(os.path.abspath(__file__))


def mutu(p):
    """(kontras kanal B12, fraksi putih) gambar mentah: awan tebal = putih-sian rata, kontras rendah."""
    im = Image.open(p).convert("RGB")
    sd = ImageStat.Stat(im.split()[0]).stddev[0]
    putih = sum(im.convert("L").histogram()[200:]) / (im.width * im.height)
    return round(sd, 1), round(putih, 2)


def main(kid, lat, lon, km):
    C.KM, C.HARI, C.MAKS_BYTE = km, int(os.environ.get("HARI", 45)), 8_000_000
    C.PX = int(km * 1000 / 10)
    hari = dt.date.fromisoformat(os.environ.get("HARI_ACUAN", "2026-10-26"))
    kand = []
    for it in C.cari(C.kotak(lat, lon, 1), hari):
        if not C.menutup(it["geometry"], C.kotak(lat, lon, km * 1.03)):
            continue
        tgl = it["properties"]["datetime"][:10]
        if all(k[1] != tgl for k in kand):
            kand.append((it, tgl))
    os.makedirs(f"{OUT}/img/s2", exist_ok=True)
    dinilai, pilih = [], None
    for it, tgl in kand:                      # terbaru dulu
        b = f"{OUT}/img/s2/{kid}_{km}_{tgl}"
        if not os.path.exists(b + "_swir.png"):
            try:
                C.gambar_s2(it, lat, lon, b)
            except Exception as e:
                print(" gagal", tgl, e, file=sys.stderr); continue
        sd, pt = mutu(b + "_swir.png")
        dinilai.append((tgl, sd, pt))
        print(kid, tgl, "kontras", sd, "putih", pt, file=sys.stderr)
        if (tgl == os.environ.get("TGL")) or (not os.environ.get("TGL") and sd >= float(os.environ.get("SD", 12)) and pt <= float(os.environ.get("PUTIH", 0.35))):
            pilih = (it, tgl, b); break
    if not pilih:
        print(kid, "tidak ada adegan terbaca", file=sys.stderr); return
    it, tgl, b = pilih
    im = Image.open(b + "_swir.png").convert("RGB")
    im = Image.merge("RGB", [ImageOps.autocontrast(c, cutoff=(1, 0.5)) for c in im.split()])
    im = im.resize((im.width * 3, im.height * 3), Image.LANCZOS)   # haluskan piksel 10 m untuk cetak
    im.save(f"{OUT}/img/{kid}_s2.jpg", quality=90)
    p = it["properties"]
    epsg = p.get("proj:epsg") or int(str(p.get("proj:code", "0")).split(":")[-1])
    json.dump({"tgl": tgl, "jam_utc": p["datetime"][11:16], "adegan": it["id"], "epsg": epsg,
               "satelit": "Sentinel-" + p.get("platform", "x-2x").split("-")[-1].upper(),
               "lat": lat, "lon": lon, "km": km, "px": C.PX, "dinilai": dinilai}, open(f"{OUT}/img/{kid}_s2.json", "w"))
    print(kid, "pakai", tgl, file=sys.stderr)


if __name__ == "__main__":
    main(sys.argv[1], float(sys.argv[2]), float(sys.argv[3]), float(sys.argv[4]))
