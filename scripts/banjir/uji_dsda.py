"""Uji replay banjir Maret 2025 (public/banjir/data/replay/maret2025*) lawan poligon genangan resmi DSDA dan BPBD DKI 3-4 Maret 2025.

Pakai:  python3 scripts/banjir/uji_dsda.py        tarik poligon (sekali, cache data/raw/banjir/dsda/), nilai, tulis
                                                   public/banjir/data/lab/uji_dsda.json + uji_dsda_ringkas.md
        python3 scripts/banjir/uji_dsda.py uji    self-check fungsi murni (luring)

Kebenaran: 19 poligon "Banjir*" (kedalaman 30-150 cm) di folder HEC-RAS/Features pada dataset Kusuma dkk. 2026,
"Integrated hydrological-hydraulic modeling for the 2025 Jakarta flood", Results in Engineering 32, 113930
(doi 10.1016/j.rineng.2026.113930). Dataset: Zenodo 10.5281/zenodo.17309354, lisensi CC BY 4.0. Poligon diambil dengan
HTTP Range dari zip 3,25 GB (hanya ~10 KB yang diunduh). Peta asal: DSDA dan BPBD DKI Jakarta, hanya koridor Ciliwung
Tanjung Barat sampai Kampung Melayu; genangan di luar koridor tidak dipetakan.

Prakiraan: hmaks_cm replay (maksimum 96 jam, kisi 60 m). Replay disetel ke laporan berita dan pos pantau
(lihat `penyetelan` di maret2025.json), TIDAK ke poligon ini, jadi poligon ini data uji yang belum pernah dipakai.

Ukuran di dalam DOMAIN (kotak pembatas poligon + 1 km, karena di luar koridor tidak ada kebenaran):
- kena = bagian sel DSDA yang basah di model (>= 10 cm);
- CSI = TP / (TP + FP + FN), sel model basah di domain di luar poligon dihitung FP (bias ke bawah: DSDA bisa tidak lengkap);
- pembanding 1: sel TERENDAH (dem_dm replay) di domain sebanyak sel basah model, cara yang sama dengan uji HAND;
- pembanding 2 (lebih keras): sel TERDEKAT ke garis tebing Ciliwung (Breakline_left/right dari dataset yang sama) sebanyak sel basah model.
"""
import gzip
import json
import math
import os
import struct
import sys
import urllib.request
import zlib

AKAR = os.path.normpath(os.path.join(os.path.dirname(__file__), "..", ".."))
CACHE = os.path.join(AKAR, "data/raw/banjir/dsda")
REPLAY = os.path.join(AKAR, "public/banjir/data/replay/maret2025.json")
KELUAR = os.path.join(AKAR, "public/banjir/data/lab/uji_dsda.json")
ZIP = "https://zenodo.org/api/records/17309354/files/Datasets%20Urban%20Flood%20Ciliwung.zip/content"
ZIP_UKURAN = 3253668066
AMBANG_CM = 10
SANGGA_DERAJAT = 0.009  # ~1 km
ATRIBUSI = ("Poligon genangan DSDA dan BPBD DKI 3-4 Mar 2025 dari dataset Kusuma dkk. 2026 (Zenodo 10.5281/zenodo.17309354), "
            "CC BY 4.0.")


# ---------- unduh terbatas dari zip lewat HTTP Range ----------
def _rentang(a, b):
    r = urllib.request.Request(ZIP, headers={"Range": f"bytes={a}-{b}", "User-Agent": "uji-dsda"})
    with urllib.request.urlopen(r, timeout=120) as f:
        return f.read()


def daftar_zip(ekor):
    i = ekor.rfind(b"PK\x05\x06")
    if i < 0:
        raise ValueError("EOCD tidak ada")
    n, ukuran, off = struct.unpack("<HII", ekor[i + 10:i + 20])
    return n, ukuran, off


def baca_direktori(cd):
    p, keluar = 0, []
    while cd[p:p + 4] == b"PK\x01\x02":
        metode = struct.unpack("<H", cd[p + 10:p + 12])[0]
        cs, us = struct.unpack("<II", cd[p + 20:p + 28])
        fl, el, cl = struct.unpack("<HHH", cd[p + 28:p + 34])
        lo = struct.unpack("<I", cd[p + 42:p + 46])[0]
        keluar.append((cd[p + 46:p + 46 + fl].decode("utf8", "replace"), metode, cs, us, lo))
        p += 46 + fl + el + cl
    return keluar


def tarik():
    os.makedirs(CACHE, exist_ok=True)
    ekor = _rentang(ZIP_UKURAN - 100_000, ZIP_UKURAN - 1)
    _, ukuran, off = daftar_zip(ekor)
    for nama, metode, cs, us, lo in baca_direktori(_rentang(off, off + ukuran - 1)):
        if not (nama.startswith("HEC-RAS/Features/Banjir") or nama.startswith("HEC-RAS/Features/Breakline")) or not nama.endswith(".shp"):
            continue
        tujuan = os.path.join(CACHE, os.path.basename(nama))
        if os.path.exists(tujuan):
            continue
        h = _rentang(lo, lo + 29)
        fl, el = struct.unpack("<HH", h[26:30])
        d = _rentang(lo + 30 + fl + el, lo + 30 + fl + el + cs - 1)
        d = zlib.decompress(d, -15) if metode == 8 else d
        if len(d) != us:
            raise ValueError(f"ukuran {nama} {len(d)} != {us}")
        with open(tujuan, "wb") as f:
            f.write(d)


# ---------- geometri ----------
def utm48s_ke_lonlat(e, n):
    a, f, k0 = 6378137.0, 1 / 298.257223563, 0.9996
    e2 = f * (2 - f); ep2 = e2 / (1 - e2); x, y = e - 500000.0, n - 10000000.0
    mu = (y / k0) / (a * (1 - e2 / 4 - 3 * e2 ** 2 / 64 - 5 * e2 ** 3 / 256))
    e1 = (1 - math.sqrt(1 - e2)) / (1 + math.sqrt(1 - e2))
    p = (mu + (3 * e1 / 2 - 27 * e1 ** 3 / 32) * math.sin(2 * mu) + (21 * e1 ** 2 / 16 - 55 * e1 ** 4 / 32) * math.sin(4 * mu)
         + (151 * e1 ** 3 / 96) * math.sin(6 * mu))
    c, t = ep2 * math.cos(p) ** 2, math.tan(p) ** 2
    nn = a / math.sqrt(1 - e2 * math.sin(p) ** 2); r = a * (1 - e2) / (1 - e2 * math.sin(p) ** 2) ** 1.5; d = x / (nn * k0)
    lat = p - (nn * math.tan(p) / r) * (d * d / 2 - (5 + 3 * t + 10 * c - 4 * c * c - 9 * ep2) * d ** 4 / 24)
    lon = (d - (1 + 2 * t + c) * d ** 3 / 6) / math.cos(p)
    return math.degrees(lon) + 105.0, math.degrees(lat)


def baca_shp(buf):
    """Poligon (tipe 5) atau garis (tipe 3) shapefile -> daftar cincin atau ruas [(x, y)]."""
    p, cincin = 100, []
    while p < len(buf):
        ln = struct.unpack(">I", buf[p + 4:p + 8])[0] * 2
        r = buf[p + 8:p + 8 + ln]; p += 8 + ln
        if struct.unpack("<i", r[:4])[0] not in (3, 5):
            continue
        nb, nt = struct.unpack("<ii", r[36:44])
        bagian = struct.unpack(f"<{nb}i", r[44:44 + 4 * nb]); o = 44 + 4 * nb
        titik = [struct.unpack("<2d", r[o + 16 * i:o + 16 * i + 16]) for i in range(nt)]
        for k, s in enumerate(bagian):
            cincin.append(titik[s:bagian[k + 1] if k + 1 < nb else nt])
    return cincin


def di_dalam(x, y, cincin):
    dalam = False
    for k in range(len(cincin) - 1):
        (x1, y1), (x2, y2) = cincin[k], cincin[k + 1]
        if (y1 > y) != (y2 > y) and x < x1 + (y - y1) * (x2 - x1) / (y2 - y1):
            dalam = not dalam
    return dalam


def sel_ke_lonlat(i, j, kisi):
    z = 256 * 2 ** kisi["zoom"]
    px, py = kisi["x0"] + (i + 0.5) * kisi["s"], kisi["y0"] + (j + 0.5) * kisi["s"]
    lon = px / z * 360 - 180
    lat = math.degrees(math.atan(math.sinh(math.pi * (1 - 2 * py / z))))
    return lon, lat


def nilai(basah, benar, dem, domain, jarak=None):
    """basah, benar: set sel; dem: dict sel->tinggi; jarak: dict sel->jarak ke tebing Ciliwung; domain: daftar sel.
    Hasil model, pembanding sel terendah, dan pembanding sel terdekat ke sungai (jumlah sel sama dengan model)."""
    def skor(prak):
        tp = len(prak & benar); fp = len(prak - benar); fn = len(benar - prak)
        return {"tp": tp, "fp": fp, "fn": fn, "kena": round(tp / len(benar), 3) if benar else None,
                "csi": round(tp / (tp + fp + fn), 3) if tp + fp + fn else None}
    n = len(basah)
    terendah = set(sorted(domain, key=lambda c: (dem[c], c))[:n])
    hasil = {"model": skor(basah), "terendah": skor(terendah), "n_basah": n, "n_benar": len(benar), "n_domain": len(domain)}
    if jarak is not None:
        hasil["dekat_sungai"] = skor(set(sorted(domain, key=lambda c: (jarak[c], c))[:n]))
    return hasil


def jalankan():
    tarik()
    cincin, tebing = [], []
    for f in sorted(os.listdir(CACHE)):
        if f.endswith(".shp"):
            with open(os.path.join(CACHE, f), "rb") as h:
                for c in baca_shp(h.read()):
                    (tebing if f.startswith("Breakline") else cincin).append([utm48s_ke_lonlat(*q) for q in c])
    titik_tebing = [p for c in tebing for p in c]
    cosl = math.cos(math.radians(-6.3))
    with open(REPLAY) as f:
        r = json.load(f)
    kisi = r["kisi"]; nx, ny = kisi["nx"], kisi["ny"]
    with gzip.open(os.path.join(os.path.dirname(REPLAY), r["biner"]["berkas"])) as f:
        b = f.read()
    bag = {x["nama"]: x for x in r["biner"]["bagian"]}
    hm = struct.unpack(f"<{nx * ny}H", b[bag["hmaks_cm"]["offset"]:bag["hmaks_cm"]["offset"] + 2 * nx * ny])
    dem = struct.unpack(f"<{nx * ny}h", b[bag["dem_dm"]["offset"]:bag["dem_dm"]["offset"] + 2 * nx * ny])
    xs = [p[0] for c in cincin for p in c]; ys = [p[1] for c in cincin for p in c]
    kotak = (min(xs) - SANGGA_DERAJAT, min(ys) - SANGGA_DERAJAT, max(xs) + SANGGA_DERAJAT, max(ys) + SANGGA_DERAJAT)
    domain, benar, basah, demd, jarakd = [], set(), set(), {}, {}
    for j in range(ny):
        for i in range(nx):
            lon, lat = sel_ke_lonlat(i, j, kisi)
            if not (kotak[0] <= lon <= kotak[2] and kotak[1] <= lat <= kotak[3]):
                continue
            k = j * nx + i; domain.append(k); demd[k] = dem[k]
            jarakd[k] = min(((lon - x) * cosl) ** 2 + (lat - y) ** 2 for x, y in titik_tebing)
            if hm[k] >= AMBANG_CM:
                basah.add(k)
            if any(di_dalam(lon, lat, c) for c in cincin):
                benar.add(k)
    h = nilai(basah, benar, demd, domain, jarakd)
    luas_sel_ha = kisi["dx_m"] ** 2 / 1e4
    hasil = {"dibuat_oleh": "scripts/banjir/uji_dsda.py", "atribusi": ATRIBUSI, "replay": "maret2025", "ambang_cm": AMBANG_CM,
             "domain_lonlat": [round(v, 4) for v in kotak], "poligon": len(cincin),
             "luas_benar_ha": round(h["n_benar"] * luas_sel_ha), "luas_basah_model_ha": round(h["n_basah"] * luas_sel_ha), **h,
             "catatan": "FP terhitung di koridor yang dipetakan DSDA saja; DSDA bisa tidak lengkap, jadi CSI bias ke bawah. "
                        "Poligon DSDA kasar (kotak tangan), kisi model 60 m."}
    os.makedirs(os.path.dirname(KELUAR), exist_ok=True)
    with open(KELUAR, "w") as f:
        json.dump(hasil, f, ensure_ascii=False, indent=1)
    m, t = h["model"], h["terendah"]
    md = (f"# Uji replay Maret 2025 lawan poligon DSDA dan BPBD DKI\n\n{ATRIBUSI}\n\n"
          f"Domain: koridor Ciliwung yang dipetakan DSDA plus 1 km ({h['n_domain']} sel 60 m). "
          f"Genangan resmi {hasil['luas_benar_ha']} ha, model basah >= {AMBANG_CM} cm {hasil['luas_basah_model_ha']} ha.\n\n"
          "| Skor | Bagian genangan resmi yang kena | CSI |\n| --- | --- | --- |\n"
          f"| Replay (hmaks 96 jam) | {m['kena']} | {m['csi']} |\n"
          f"| Pembanding sel terendah, jumlah sel sama | {t['kena']} | {t['csi']} |\n"
          f"| Pembanding sel terdekat ke tebing Ciliwung, jumlah sel sama | {h['dekat_sungai']['kena']} | {h['dekat_sungai']['csi']} |\n\n"
          f"{hasil['catatan']}\n")
    with open(KELUAR.replace(".json", "_ringkas.md"), "w") as f:
        f.write(md)
    print(md)


def uji():
    kotak = [(0, 0), (2, 0), (2, 2), (0, 2), (0, 0)]
    assert di_dalam(1, 1, kotak) and not di_dalam(3, 1, kotak)
    lon, lat = utm48s_ke_lonlat(500000, 10000000 - 693600)  # ~6,27 LS di meridian tengah 105
    assert abs(lon - 105) < 1e-6 and abs(lat + 6.27) < 0.01, (lon, lat)
    h = nilai({1, 2, 3}, {2, 3, 4}, {1: 5, 2: 1, 3: 2, 4: 3, 5: 9}, [1, 2, 3, 4, 5])
    assert h["model"]["tp"] == 2 and h["model"]["csi"] == 0.5 and h["terendah"]["tp"] == 3 and h["terendah"]["csi"] == 1.0
    h = nilai({1}, {5}, {1: 0, 5: 9}, [1, 5], {1: 4.0, 5: 0.0})
    assert h["dekat_sungai"]["tp"] == 1 and h["terendah"]["tp"] == 0
    print("uji_dsda: lolos")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else jalankan()
