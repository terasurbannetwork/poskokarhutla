"""Lintasan asap 72 jam ke depan dari kompleks api aktif -> public/udara/data/lintasan.json

Masukan : public/data/kluster.json (kompleks api; aktif = titik terakhir <= 72 jam), public/udara/data/angin.json,
          scripts/udara/kota.json, public/data/konsesi2026/<prov>.json (nama badan usaha pemegang konsesi saja).
Metode  : partikel maju langkah 1 jam (Heun), angin diinterpolasi bilinear ruang + linier waktu dari kisi angin.json,
          satu jalur per lapis (10 m, 925 hPa, 850 hPa). Kota dilewati = pusat kota <= 25 km dari titik jalur.
          Lintas batas: titik jalur masuk poligon kasar daratan Malaysia (Semenanjung, Sarawak/Sabah), Singapura, Brunei,
          Timor Leste, atau keluar kisi di tepi timur (141 BT, 2,5-9,2 LS) = Papua Nugini. Kotak kasar, bukan batas resmi.
Konsesi : kompleks dihubungkan ke perusahaan bila titik kompleks konsesi2026 jatuh di kotak batas poligon kompleks (+0,02 derajat).
          Ini lokasi titik panas di dalam areal izin, bukan penetapan siapa yang membakar.
"""
import datetime as dt
import glob
import json
import math
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import alat

MAKS_KOMPLEKS = 60
JAM = 72
R_KOTA = 25
NEGARA = {
    "Singapura": [(103.6, 1.15), (104.1, 1.15), (104.1, 1.48), (103.6, 1.48)],
    "Brunei": [(114.05, 4.0), (115.4, 4.0), (115.4, 5.05), (114.05, 5.05)],
    "Malaysia": [(100.1, 6.5), (102.2, 6.2), (103.5, 4.4), (104.3, 1.5), (103.4, 1.3), (101.3, 2.8), (100.3, 4.4)],
    "Malaysia ": [(109.6, 1.9), (111.0, 1.1), (112.5, 1.5), (114.6, 1.5), (115.6, 3.0), (115.6, 4.2), (117.6, 4.2),
                  (119.3, 5.3), (117.1, 7.0), (116.0, 6.3), (115.2, 4.9), (114.1, 4.6), (111.5, 2.6), (109.6, 2.1)],
    "Timor Leste": [(124.95, -9.35), (125.1, -8.6), (125.6, -8.45), (126.5, -8.35), (127.35, -8.3), (127.1, -8.8), (126.2, -9.2), (125.2, -9.6)],
    # Papua Nugini: daratan utama + Pulau New Britain barat; Natural Earth 50m admin-0 (domain publik), disederhanakan Douglas-Peucker (48 + 9 titik)
    "Papua Nugini": [(140.98, -9.12), (140.98, -6.91), (140.86, -6.74), (140.97, -6.35), (140.97, -2.61), (141.1, -2.61), (142.55, -3.2), (143.51, -3.43), (144.07, -3.81), (144.48, -3.83), (145.77, -4.82), (145.75, -5.4), (147.57, -6.06), (147.8, -6.32), (147.85, -6.66), (146.95, -6.83), (147.19, -7.38), (148.13, -8.1), (148.58, -9.05), (149.2, -9.03), (149.26, -9.5), (150.01, -9.69), (149.76, -9.81), (149.87, -10.01), (150.85, -10.24), (150.45, -10.31), (150.65, -10.52), (150.32, -10.65), (149.75, -10.35), (147.77, -10.07), (147.02, -9.39), (146.96, -9.06), (146.63, -8.95), (146.03, -8.08), (144.51, -7.57), (144.14, -7.76), (143.65, -7.46), (143.94, -7.94), (143.52, -8.0), (143.61, -8.2), (142.52, -8.32), (142.21, -8.2), (143.11, -8.47), (143.38, -8.76), (143.37, -8.96), (142.65, -9.33), (142.23, -9.17), (141.13, -9.22)],
    "Papua Nugini ": [(151.92, -4.3), (152.41, -4.34), (152.08, -5.46), (150.47, -6.26), (148.34, -5.67), (149.83, -5.52), (150.09, -5.01), (150.18, -5.52), (150.9, -5.45)],
}


def di_dalam(x, y, r):
    c, j = False, len(r) - 1
    for i in range(len(r)):
        (xi, yi), (xj, yj) = r[i], r[j]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi:
            c = not c
        j = i
    return c


def negara(lon, lat):
    for n, r in NEGARA.items():
        if di_dalam(lon, lat, r):
            return n.strip()
    return None


def angin_di(A, l, lon, lat, jam):
    """(u, v) m/s di titik + jam sejak A['jam'][0]; None di luar kisi/waktu atau sel kosong."""
    la0, lo0 = A["lat"][0], A["lon"][0]
    dla, dlo = A["lat"][1] - la0, A["lon"][1] - lo0
    y, x, t = (lat - la0) / dla, (lon - lo0) / dlo, jam / 3
    nj, ni, nt = len(A["lat"]), len(A["lon"]), len(A["jam"])
    if not (0 <= y <= nj - 1 and 0 <= x <= ni - 1 and 0 <= t <= nt - 1):
        return None
    j, i, k = min(int(y), nj - 2), min(int(x), ni - 2), min(int(t), nt - 2)
    fy, fx, ft = y - j, x - i, t - k
    out = []
    for g in (A["u"][l], A["v"][l]):
        s = 0.0
        for kk, wt in ((k, 1 - ft), (k + 1, ft)):
            for jj, wy in ((j, 1 - fy), (j + 1, fy)):
                for ii, wx in ((i, 1 - fx), (i + 1, fx)):
                    w = wt * wy * wx
                    if w:
                        c = g[kk][jj][ii]
                        if c is None:
                            return None
                        s += w * c
        out.append(s / 10)
    return tuple(out)


def geser(lon, lat, u, v, detik):
    return lon + u * detik / (111320 * math.cos(math.radians(lat))), lat + v * detik / 110540


def jalur(A, l, lon, lat, jam0):
    """Heun 1 jam. -> ([[lon, lat, jam_ke]], negara_tepi) ; negara_tepi = 'Papua Nugini' bila keluar kisi di tepi timur."""
    t = [[round(lon, 3), round(lat, 3), 0]]
    for k in range(JAM):
        a = angin_di(A, l, lon, lat, jam0 + k)
        if a is None:
            break
        lo1, la1 = geser(lon, lat, *a, 3600)
        b = angin_di(A, l, lo1, la1, jam0 + k + 1)
        if b is None:
            if lo1 > A["lon"][-1] and -9.2 <= la1 <= -2.5:
                t.append([round(lo1, 3), round(la1, 3), k + 1])
                return t, "Papua Nugini"
            break
        lon, lat = geser(lon, lat, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, 3600)
        t.append([round(lon, 3), round(lat, 3), k + 1])
    return t, None


def indeks_kota(kota):
    idx = {}
    for k in kota:
        idx.setdefault((math.floor(k["lat"] * 2), math.floor(k["lon"] * 2)), []).append(k)
    return idx


def kota_dilewati(titik, idx):
    out = {}
    for lon, lat, jam in titik:
        gy, gx = math.floor(lat * 2), math.floor(lon * 2)
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                for k in idx.get((gy + dy, gx + dx), ()):
                    if k["kode"] not in out and alat.jarak_km(lat, lon, k["lat"], k["lon"]) <= R_KOTA:
                        out[k["kode"]] = jam
    return out


def aktif(kluster, t, maks=MAKS_KOMPLEKS):
    """Fitur kluster aktif (akhir <= 72 jam sebelum t), urut FRP 24 jam lalu FRP total, maks `maks`."""
    batas = t - dt.timedelta(hours=72)
    out = []
    for f in kluster["features"]:
        p = f["properties"]
        if not p.get("akhir"):
            continue
        if alat.dari_iso(p["akhir"]) < batas:
            continue
        if not (-12 <= p["lat"] <= 7 and 94 <= p["lon"] <= 142):
            raise ValueError(f"kompleks {p.get('id')} di luar Indonesia: {p['lat']},{p['lon']}")
        out.append(f)
    out.sort(key=lambda f: (-(f["properties"].get("frp24") or 0), -(f["properties"].get("frp") or 0)))
    return out[:maks]


def kotak(geom):
    # kluster.json memuat Point (kompleks satu titik) di samping Polygon
    c = geom["coordinates"]
    t = geom["type"]
    pts = [c] if t == "Point" else [p for b in (c if t == "MultiPolygon" else [c]) for p in b[0]]
    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]
    return min(xs) - .02, min(ys) - .02, max(xs) + .02, max(ys) + .02


def titik_konsesi():
    """[(lat, lon, nama badan usaha)] dari konsesi2026; hanya nama perusahaan (bukan pemegang/tokoh)."""
    out = []
    pola = os.path.join(alat.AKAR, "public/data/konsesi2026/[0-9][0-9].json")
    for p in sorted(glob.glob(pola)):
        for c in alat.muat(p).get("perusahaan", []):
            nama = c.get("nama", "")
            if not badan_usaha(nama):
                continue
            for k in c.get("kompleks", []):
                out.append((k[0], k[1], nama))
    return out


def badan_usaha(nama):
    """Hanya badan hukum yang bukan nama orang: PT, Koperasi, Perum, KUD. CV ditolak (sering memakai nama pemilik)."""
    return bool(re.match(r"(PT|KOPERASI|PERUM|KUD)\b", (nama or "").strip().upper()))


def konsesi_untuk(f, tk):
    x0, y0, x1, y1 = kotak(f["geometry"])
    return sorted({n for la, lo, n in tk if x0 <= lo <= x1 and y0 <= la <= y1 and badan_usaha(n)})


def bangun(kluster, A, kota, tk, t):
    jam0 = (t - alat.dari_iso(A["jam"][0])).total_seconds() / 3600
    idx = indeks_kota(kota)
    out, lintas = [], {}
    for f in aktif(kluster, t):
        p = f["properties"]
        jl, lewat = [], {}
        for l, nm in enumerate(A["lapis"]):
            tt, tepi = jalur(A, l, p["lon"], p["lat"], jam0)
            jl.append({"lapis": nm, "t": tt})
            for kode, j in kota_dilewati(tt, idx).items():
                lewat[kode] = min(j, lewat.get(kode, 999))
            for lon, lat, j in tt:
                n = negara(lon, lat)
                if n and j < lintas.get((n, p["id"]), 999):
                    lintas[(n, p["id"])] = j
            if tepi and tt[-1][2] < lintas.get((tepi, p["id"]), 999):
                lintas[(tepi, p["id"])] = tt[-1][2]
        out.append({"id": p["id"], "lat": p["lat"], "lon": p["lon"], "frp": round(p.get("frp24") or 0), "titik": p.get("n24") or 0,
                    "prov": p.get("prov"), "kab": p.get("kab"), "gambut": bool(p.get("gambut")), "konsesi": konsesi_untuk(f, tk),
                    "jalur": jl, "kota": [{"kode": k, "jam": j} for k, j in sorted(lewat.items(), key=lambda x: x[1])]})
    lb = [{"negara": n, "kompleks": k, "jam": j} for (n, k), j in sorted(lintas.items(), key=lambda x: x[1])]
    return {"v": 1, "dibuat": alat.iso(dt.datetime.now(dt.timezone.utc)), "mulai": alat.iso(t), "kompleks": out, "lintas_batas": lb}


def main():
    t = alat.sekarang()
    d = bangun(alat.data("kluster.json"), alat.keluaran("angin.json"), alat.kota(), titik_konsesi(), t)
    nb = alat.simpan("lintasan.json", d)
    alat.log(f"lintasan.json: {nb // 1024} KB, {len(d['kompleks'])} kompleks, lintas batas {len(d['lintas_batas'])}")


def angin_uji(u, v, jam0="2026-10-18T03:00Z"):
    lat, lon = list(range(-11, 7)), list(range(95, 142))
    g = lambda c: [[[[c] * len(lon) for _ in lat] for _ in range(25)] for _ in range(3)]
    return {"jam": [alat.iso(alat.dari_iso(jam0) + dt.timedelta(hours=3 * k)) for k in range(25)], "lapis": ["10m", "925hPa", "850hPa"],
            "lat": lat, "lon": lon, "u": g(u), "v": g(v)}


def uji():
    assert negara(103.85, 1.3) == "Singapura" and negara(101.7, 3.1) == "Malaysia" and negara(114.9, 4.9) == "Brunei"
    assert kotak({"type": "Point", "coordinates": [101.0, 1.0]}) == (100.98, .98, 101.02, 1.02)
    assert kotak({"type": "MultiPolygon", "coordinates": [[[[100, 0], [101, 1], [100, 1]]], [[[102, 2], [103, 3], [102, 3]]]]}) == (99.98, -.02, 103.02, 3.02)
    assert negara(113.0, 3.0) == "Malaysia" and negara(125.6, -8.6) == "Timor Leste"
    assert negara(104.75, -2.98) is None and negara(109.3, -0.03) is None and negara(116.9, -1.27) is None and negara(124.9, -9.1) is None  # Palembang, Pontianak, Balikpapan, Atambua
    A = angin_uji(100, 0)                                   # 10 m/s ke timur
    assert angin_di(A, 0, 100.5, -2.5, 4.5) == (10.0, 0.0) and angin_di(A, 0, 150, 0, 0) is None and angin_di(A, 0, 100, 0, 80) is None
    tt, tepi = jalur(A, 0, 104.0, 0.0, 0)
    assert len(tt) == 73 and abs(tt[-1][0] - (104 + 72 * 36000 / 111320)) < .01 and tt[-1][1] == 0 and tepi is None
    tt, tepi = jalur(A, 1, 139.0, -5.0, 0)
    assert tepi == "Papua Nugini" and tt[-1][0] > 141
    A["u"][0][3][5][5] = None
    assert angin_di(A, 0, 100.5, -5.5, 9.5) is None          # sel kosong tidak ditebak
    kota = [{"kode": "1", "lat": 0.0, "lon": 104.3}, {"kode": "2", "lat": 1.0, "lon": 104.3}]
    lw = kota_dilewati([[104.0, 0.0, 0], [104.32, 0.0, 1], [104.6, 0.0, 2]], indeks_kota(kota))
    assert lw == {"1": 1}, lw
    t = alat.dari_iso("2026-10-18T04:00Z")
    geom = {"type": "Polygon", "coordinates": [[[104.9, -1.1], [105.1, -1.1], [105.1, -0.9], [104.9, -0.9], [104.9, -1.1]]]}
    fitur = lambda i, akhir, frp, la=-1.0, lo=105.0: {"geometry": geom, "properties": {"id": i, "lat": la, "lon": lo, "akhir": akhir, "frp24": frp, "n24": 3, "prov": "16"}}
    kl = {"features": [fitur("K1", "2026-10-18T01:00:00+00:00", 50), fitur("K2", "2026-10-14T01:00:00+00:00", 999),
                       fitur("K3", "2026-10-17T01:00:00+00:00", 80), fitur("K4", "", 5)]}
    assert [f["properties"]["id"] for f in aktif(kl, t)] == ["K3", "K1"]
    try:
        aktif({"features": [fitur("KX", "2026-10-18T01:00:00+00:00", 1, la=40.0)]}, t)
        raise AssertionError("kompleks di luar Indonesia harus ditolak")
    except ValueError:
        pass
    assert [badan_usaha(n) for n in ("PT Contoh", "pt. kecil", "Koperasi Tani", "Perum Perhutani", "KUD Maju", "CV Budi Santoso", "Budi Santoso", "PTOLEMY", "")] == \
        [True, True, True, True, True, False, False, False, False]
    d = bangun(kl, angin_uji(0, 100), [{"kode": "1601", "lat": 0.0, "lon": 105.0}],
               [(-1.0, 105.05, "PT Contoh"), (5.0, 100.0, "PT Jauh"), (-1.0, 105.0, "CV Budi Santoso"), (-1.0, 105.0, "Budi Santoso")], t)
    k = d["kompleks"][0]
    assert k["konsesi"] == ["PT Contoh"] and all(badan_usaha(n) for c in d["kompleks"] for n in c["konsesi"]) and k["kota"][0]["kode"] == "1601" and k["kota"][0]["jam"] == 3, k["kota"]   # 36 km/jam ke utara: jam ke-3 (108 km) masuk 25 km kota
    assert len(k["jalur"]) == 3 and k["jalur"][0]["t"][0] == [105.0, -1.0, 0]
    # mode semai: poligon PNG, status kota, arah, lintas batas 5%
    assert negara(147.18, -9.44) == "Papua Nugini" and negara(140.70, -2.53) is None and negara(140.40, -8.50) is None   # Port Moresby; Jayapura, Merauke
    sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "../operasi"))
    import semai_murni as M
    assert status_kota([0.3, 0.4, 0.1])["status"] == "sudah berasap" and status_kota([0.3, 0.4, 0.1])["tingkat"] == "sedang"   # dekat api: jam pertama sudah berasap
    st = status_kota([0.0, 0.01, 0.06, 0.6, 0.06])
    assert st == {"status": "tiba +2 jam", "tiba_jam": 2, "tingkat": "tinggi", "lama_jam": 3} and status_kota([0.0, 0.049]) is None
    assert M.arah_8(-1.40, 115.30, -1.60, 115.50) == "dari tenggara"
    kk = [{"tiba_jam": 0, "tingkat": "sedang"}, {"tiba_jam": 5, "tingkat": "rendah"}, {"tiba_jam": 2, "tingkat": "rendah"}, {"tiba_jam": 0, "tingkat": "tinggi"}]
    assert [(k["tiba_jam"], k["tingkat"]) for k in urut_kota(kk)] == [(2, "rendah"), (5, "rendah"), (0, "tinggi"), (0, "sedang")]
    assert lintas_pertama([{("Timor Leste", 1): 0.049}, {("Timor Leste", 1): 0.05, ("Malaysia", 2): 0.2}, {("Brunei", 3): 0.9}])[:3] == (1, "Malaysia", 2)
    assert lintas_pertama([{("Timor Leste", 1): 0.049}]) is None
    print("lintasan uji: lulus")


# ---------------------------------------------------------------------------------------------------------------------
# Mode semai (ALGORITMA semai-awan §9): `python3 lintasan.py semai --putaran YYYYMMDDHH --sekarang ISO --keluar DIR`
# numpy hanya dimuat di sini; mode bawaan di atas tetap stdlib murni. Fungsi tanpa numpy (status kota, lintas batas, urutan)
# diuji lewat `uji`.
# ---------------------------------------------------------------------------------------------------------------------
KODE_NEGARA = {"Singapura": "SG", "Brunei": "BN", "Malaysia": "MY", "Timor Leste": "TL", "Papua Nugini": "PG"}
BBOX = (94.0, -12.0, 142.0, 7.0)        # lon0, lat0, lon1, lat1
AMBANG_BEBAN = (0.5, 0.2, 0.05)         # tinggi, sedang, rendah (HIPOTESIS, sama dengan semai_bobot.json asap.tingkat_*)
RANK_TINGKAT = {"tinggi": 3, "sedang": 2, "rendah": 1}
KOTA_KM = 20.0
LINTAS_FRAKSI = 0.05
LANGKAH_JAM = 3                         # selang langkah IFS
NP_RILIS = 10                           # partikel per cluster per pelepasan
SIGMA_RILIS = 0.03                      # derajat, sebaran awal partikel (~3 km)
SIGMA_HALUS_KM = 10.0                   # kernel Gauss, jari-jari terpotong 20 km


def tingkat_beban(b):
    return "tinggi" if b >= AMBANG_BEBAN[0] else "sedang" if b >= AMBANG_BEBAN[1] else "rendah" if b >= AMBANG_BEBAN[2] else None


def status_kota(beban):
    """beban = beban relatif kota per jam sejak jam pertama layar. -> None bila tak pernah >= 0,05, selain itu
    {status, tiba_jam, tingkat (maks), lama_jam (<= 24)}. 'sudah berasap' bila sudah ada di jam pertama (bukan 'tiba +0')."""
    ada = [i for i, b in enumerate(beban) if b >= AMBANG_BEBAN[2]]
    if not ada:
        return None
    t = ada[0]
    return {"status": "sudah berasap" if t == 0 else f"tiba +{t} jam", "tiba_jam": t, "tingkat": tingkat_beban(max(beban)),
            "lama_jam": min(len(ada), 24)}


def urut_kota(daftar):
    """Tiba +N jam lebih dulu (menurut jam tiba), lalu sudah berasap (menurut tingkat, lalu beban maksimum)."""
    return sorted(daftar, key=lambda k: (k["tiba_jam"] == 0, k["tiba_jam"] if k["tiba_jam"] else 0,
                                         -RANK_TINGKAT[k["tingkat"]] if k["tiba_jam"] == 0 else 0, -k.get("beban_maks", 0)))


def lintas_pertama(per_jam):
    """per_jam = daftar (satu per jam layar) dari {(negara, cluster): fraksi bobot}. -> (jam_ke, negara, cluster, fraksi) untuk
    jam pertama yang punya fraksi >= 5% (pecah seri: fraksi terbesar), atau None."""
    for j, d in enumerate(per_jam):
        ok = [(f, n, c) for (n, c), f in d.items() if f >= LINTAS_FRAKSI]
        if ok:
            f, n, c = max(ok)
            return j, n, c, f
    return None


def _didalam(lon, lat, ring, np):
    """Ray casting vektor; sama dengan di_dalam()."""
    c = np.zeros(lon.shape, bool)
    xs = [p[0] for p in ring]
    ys = [p[1] for p in ring]
    j = len(ring) - 1
    for i in range(len(ring)):
        xi, yi, xj, yj = xs[i], ys[i], xs[j], ys[j]
        if yi != yj:
            c ^= ((yi > lat) != (yj > lat)) & (lon < (xj - xi) * (lat - yi) / (yj - yi) + xi)
        j = i
    return c


def tulis_png(path, idx, palet):
    """PNG berindeks (stdlib): idx = list baris bytes 0..3; palet = [(r,g,b,a)] empat warna, a=0 transparan."""
    import struct
    import zlib
    h, w = len(idx), len(idx[0])

    def potong(t, d):
        return struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d) & 0xFFFFFFFF)
    raw = b"".join(b"\x00" + r for r in idx)
    png = (b"\x89PNG\r\n\x1a\n" + potong(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 3, 0, 0, 0))
           + potong(b"PLTE", b"".join(bytes(p[:3]) for p in palet)) + potong(b"tRNS", bytes(p[3] for p in palet))
           + potong(b"IDAT", zlib.compress(raw, 9)) + potong(b"IEND", b""))
    with open(path, "wb") as f:
        f.write(png)
    return len(png)


PALET_ASAP = [(0, 0, 0, 0), (196, 160, 112, 120), (150, 98, 48, 170), (92, 48, 16, 210)]


def semai(putaran, sekarang, keluar, kluster_p=None, ifs_dir=None):
    import numpy as np
    import time
    sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "../operasi"))
    import semai_murni as M
    t_mulai = time.time()
    akar = alat.AKAR
    ifs_dir = ifs_dir or os.path.join(akar, "data/raw/semai", putaran)
    init = dt.datetime.strptime(putaran, "%Y%m%d%H").replace(tzinfo=dt.timezone.utc)
    bobot = alat.muat(os.path.join(akar, "scripts/operasi/semai_bobot.json"))
    # --- angin IFS: campuran 60% 10 m dan 40% 850 hPa, pada kisi 0,1 derajat, langkah 3 jam
    langkah_ifs = list(range(0, 37, LANGKAH_JAM))
    u10, v10, ub, vb = [], [], [], []
    for s in langkah_ifs:
        z = np.load(os.path.join(ifs_dir, f"{s}.npz"))
        # npz IFS tersimpan utara dulu (baris 0 = 7 LU; dicek: suhu 2 m terendah di Puncak Jaya); dibalik jadi selatan dulu
        a, b, c, d = (z[k].astype(np.float32)[::-1] for k in ("sfc_10u", "sfc_10v", "pl_u_850", "pl_v_850"))
        u10.append(a); v10.append(b); ub.append(0.6 * a + 0.4 * c); vb.append(0.6 * b + 0.4 * d)
    u10, v10, UB, VB = (np.stack(x) for x in (u10, v10, ub, vb))
    ny, nx = UB.shape[1:]
    lon0, lat0, ds = BBOX[0], BBOX[1], 0.1
    assert (ny, nx) == (191, 481), (ny, nx)

    def angin(U, V, tmenit, x, y):
        tk = min(max(tmenit / (60.0 * LANGKAH_JAM), 0), len(langkah_ifs) - 1 - 1e-9)
        k = int(tk)
        f = tk - k
        gi = np.clip((y - lat0) / ds, 0, ny - 1 - 1e-9)
        gj = np.clip((x - lon0) / ds, 0, nx - 1 - 1e-9)
        i, j = gi.astype(int), gj.astype(int)
        fy, fx = gi - i, gj - j
        out = []
        for A in (U, V):
            r = 0.0
            for kk, wt in ((k, 1 - f), (k + 1, f)):
                g = A[kk]
                r = r + wt * ((1 - fy) * ((1 - fx) * g[i, j] + fx * g[i, j + 1]) + fy * ((1 - fx) * g[i + 1, j] + fx * g[i + 1, j + 1]))
            out.append(r)
        return out

    # --- cluster besar (frp24 >= ambang), hanya daratan Indonesia (di luar poligon negara lain)
    kl = json.load(open(kluster_p)) if kluster_p else alat.data("kluster.json")
    semua = []
    for f in kl["features"]:
        p = f["properties"]
        if p.get("frp24") and BBOX[0] <= p["lon"] <= BBOX[2] and BBOX[1] <= p["lat"] <= BBOX[3] and negara(p["lon"], p["lat"]) is None:
            semua.append(p)
    ambang = M.ambang_cluster([p["frp24"] for p in semua], bobot)
    cl = sorted([p for p in semua if p["frp24"] >= ambang], key=lambda p: -p["frp24"])
    nc = len(cl)
    # --- sumbu waktu: jam pertama layar = langkah IFS 3 jam pertama >= sekarang; pemanasan 12 jam sebelumnya
    F = int(math.ceil(((sekarang - init).total_seconds() / 3600) / LANGKAH_JAM - 1e-9)) * LANGKAH_JAM
    F = max(F, 0)
    assert F <= 36, "putaran terlalu tua untuk jam layar"
    Fakhir = min(36, F + 24)
    mulai_jam = max(0, F - 12)
    jam_layar = list(range(F, Fakhir + 1))
    langkah_layar = [s for s in jam_layar if s % LANGKAH_JAM == 0]
    n_langkah = (Fakhir - mulai_jam) * 4
    rilis = [n for n in range(n_langkah + 1) if n % 4 < 3]
    total = nc * NP_RILIS * len(rilis)
    rng = np.random.default_rng(14112026)
    X = np.zeros(total); Y = np.zeros(total); W = np.zeros(total, np.float32); C = np.zeros(total, np.int32); hidup = np.zeros(total, bool)
    wp = np.array([p["frp24"] for p in cl], np.float32) / (NP_RILIS * len(rilis))   # bobot partikel per cluster
    cx = np.array([p["lon"] for p in cl]); cy = np.array([p["lat"] for p in cl])
    m = 0
    n_rilis = 0
    snap = []                                    # per jam layar: (x, y, w, cid, den) partikel hidup
    for n in range(n_langkah + 1):
        tmen = mulai_jam * 60 + n * 15
        if n % 4 < 3:
            sl = slice(m, m + nc * NP_RILIS)
            X[sl] = np.repeat(cx, NP_RILIS) + rng.normal(0, SIGMA_RILIS, nc * NP_RILIS)
            Y[sl] = np.repeat(cy, NP_RILIS) + rng.normal(0, SIGMA_RILIS, nc * NP_RILIS)
            C[sl] = np.repeat(np.arange(nc), NP_RILIS)
            W[sl] = wp[C[sl]]
            hidup[sl] = True
            m += nc * NP_RILIS
            n_rilis += 1
        if tmen % 60 == 0 and tmen // 60 >= F:
            h = hidup[:m]
            snap.append((X[:m][h].copy(), Y[:m][h].copy(), W[:m][h].copy(), C[:m][h].copy(), wp * NP_RILIS * n_rilis))
        if n == n_langkah:
            break
        h = np.nonzero(hidup[:m])[0]
        x, y = X[h], Y[h]
        u1, v1 = angin(UB, VB, tmen, x, y)
        x1, y1 = x + u1 * 900 / (111320 * np.cos(np.radians(y))), y + v1 * 900 / 110540
        u2, v2 = angin(UB, VB, tmen + 15, np.clip(x1, BBOX[0], BBOX[2]), np.clip(y1, BBOX[1], BBOX[3]))
        x2 = x + (u1 + u2) / 2 * 900 / (111320 * np.cos(np.radians(y)))
        y2 = y + (v1 + v2) / 2 * 900 / 110540
        X[h], Y[h] = x2, y2
        hidup[h] = (x2 >= BBOX[0]) & (x2 < BBOX[2]) & (y2 >= BBOX[1]) & (y2 < BBOX[3])
    assert len(snap) == len(jam_layar)
    # --- beban per jam: histogram bobot, dihaluskan 20 km, dinormalkan ke persentil 99 (nilai > 0, seluruh jam layar)
    G = np.zeros((len(jam_layar), ny, nx), np.float32)
    for q, (x, y, w, c, _) in enumerate(snap):
        i = np.clip(np.rint((y - lat0) / ds).astype(int), 0, ny - 1)
        j = np.clip(np.rint((x - lon0) / ds).astype(int), 0, nx - 1)
        G[q] = np.bincount(i * nx + j, weights=w, minlength=ny * nx).reshape(ny, nx)
    r = 2
    ker = np.exp(-0.5 * (np.arange(-r, r + 1) * 11.12 / SIGMA_HALUS_KM) ** 2)
    ker /= ker.sum()
    P = np.pad(G, ((0, 0), (r, r), (0, 0)))
    G = sum(k * P[:, a:a + ny, :] for a, k in enumerate(ker))
    P = np.pad(G, ((0, 0), (0, 0), (r, r)))
    G = sum(k * P[:, :, a:a + nx] for a, k in enumerate(ker))
    pos = G[G > 0]
    p99 = float(np.percentile(pos, 99)) if pos.size else 1.0
    B = (G / p99).astype(np.float32)
    # --- PNG per langkah layar, beban untuk semai.py, angin 1 derajat
    os.makedirs(keluar, exist_ok=True)
    ukuran_png = {}
    for s in langkah_layar:
        b = B[jam_layar.index(s)]
        a = np.maximum(np.maximum(b[:-1, :-1], b[1:, :-1]), np.maximum(b[:-1, 1:], b[1:, 1:]))[::-1]
        lv = (a >= AMBANG_BEBAN[2]).astype(np.uint8) + (a >= AMBANG_BEBAN[1]) + (a >= AMBANG_BEBAN[0])
        ukuran_png[s] = tulis_png(os.path.join(keluar, f"asap_{s}.png"), [row.tobytes() for row in lv], PALET_ASAP)
    np.savez_compressed(os.path.join(keluar, "asap_beban.npz"), beban=B.astype(np.float16), jam=np.array(jam_layar),
                        lat0=lat0, lon0=lon0, step=ds, p99=p99)
    ki = [langkah_ifs.index(s) for s in langkah_layar]
    angin_asap = {"step": 1.0, "lat0": BBOX[1], "lon0": BBOX[0], "langkah": langkah_layar,
                  "u": [np.round(UB[k, ::10, ::10].astype(np.float64), 1).tolist() for k in ki],
                  "v": [np.round(VB[k, ::10, ::10].astype(np.float64), 1).tolist() for k in ki]}
    # --- kota
    kota = [{"nama": k["nama"], "negara": "ID", "lat": k["lat"], "lon": k["lon"], "kab": k.get("kab")} for k in alat.kota()]
    kt = alat.muat(os.path.join(os.path.dirname(os.path.abspath(__file__)), "data/kota_tetangga.json"))
    tetangga = [dict(zip(kt["kolom"], r_)) for r_ in kt["baris"]]
    kota += [{"nama": k["nama"], "negara": k["negara"], "lat": k["lat"], "lon": k["lon"], "kab": None} for k in tetangga]
    ada = []
    for k in kota:
        gi, gj = round((k["lat"] - lat0) / ds), round((k["lon"] - lon0) / ds)
        if not (0 <= gi < ny and 0 <= gj < nx):
            continue
        ii, jj = [], []
        for di in range(-2, 3):
            for dj in range(-2, 3):
                a_, b_ = gi + di, gj + dj
                if 0 <= a_ < ny and 0 <= b_ < nx and M.haversine(k["lat"], k["lon"], lat0 + a_ * ds, lon0 + b_ * ds) <= KOTA_KM:
                    ii.append(a_); jj.append(b_)
        if ii:
            k["_ij"] = (np.array(ii), np.array(jj))
            ada.append(k)
    sudah = tiba = 0
    hasil = []
    for k in ada:
        beban = B[:, k["_ij"][0], k["_ij"][1]].max(axis=1).tolist()
        st = status_kota(beban)
        if not st:
            continue
        qmaks = int(np.argmax(beban))
        x, y, w, c, _ = snap[qmaks]
        for rad in (KOTA_KM, 2 * KOTA_KM):
            dx = (x - k["lon"]) * 111.32 * math.cos(math.radians(k["lat"]))
            dy = (y - k["lat"]) * 110.54
            dekat = np.hypot(dx, dy) <= rad
            if dekat.any():
                sw = np.bincount(c[dekat], weights=w[dekat], minlength=nc)
                break
        asal = int(np.argmax(sw)) if dekat.any() else int(np.argmin([M.haversine(k["lat"], k["lon"], p["lat"], p["lon"]) for p in cl]))
        pa = cl[asal]
        qt = st["tiba_jam"]
        uu, vv = (float(a_[min(int((F + qt) // LANGKAH_JAM), len(langkah_ifs) - 1)][round((k["lat"] - lat0) / ds), round((k["lon"] - lon0) / ds)]) for a_ in (u10, v10))
        km = M.haversine(k["lat"], k["lon"], pa["lat"], pa["lon"])
        c0 = math.cos(math.radians(k["lat"]))
        hasil.append({"nama": k["nama"], "negara": k["negara"], **st, "beban_maks": round(max(beban), 2),
                      "asal": {"cluster": pa["id"], "kab": pa.get("kab"), "km": round(km)},
                      "arah": M.arah_8(k["lat"], k["lon"], pa["lat"], pa["lon"]),
                      "angin": {"dari": M.arah_8(k["lat"], k["lon"], k["lat"] - vv, k["lon"] - uu / c0).replace("dari ", ""), "kmj": round(math.hypot(uu, vv) * 3.6)}})
    hasil = urut_kota(hasil)
    # --- lintas batas: fraksi bobot satu cluster (dari bobot yang sudah dilepas) di poligon negara lain
    poli = {}
    for nm, rg in NEGARA.items():
        poli.setdefault(nm.strip(), []).append(rg)
    per_jam, rinci = [], []
    for q, (x, y, w, c, den) in enumerate(snap):
        d, r_ = {}, {}
        for nm, rings in poli.items():
            din = np.zeros(x.shape, bool)
            for rg in rings:
                din |= _didalam(x, y, rg, np)
            if din.any():
                fr = np.bincount(c[din], weights=w[din], minlength=nc) / den
                for cid in np.nonzero(fr > 0)[0]:
                    d[(nm, int(cid))] = float(fr[cid])
                    r_[(nm, int(cid))] = (float(np.average(x[din & (c == cid)], weights=w[din & (c == cid)])), float(np.average(y[din & (c == cid)], weights=w[din & (c == cid)])))
        per_jam.append(d); rinci.append(r_)
    def rincian(j, nm, cid, fr):
        lo, la = rinci[j][(nm, cid)]
        cand = [(M.haversine(la, lo, t_["lat"], t_["lon"]), t_["nama"]) for t_ in tetangga if t_["negara"] == KODE_NEGARA[nm]]
        km, kn = min(cand) if cand else (None, None)
        return {"negara": KODE_NEGARA[nm], "jam": alat.iso(init + dt.timedelta(hours=jam_layar[j])), "jam_ke": j, "kota": kn,
                "kota_km": None if km is None else round(km), "cluster": cl[cid]["id"], "kab": cl[cid].get("kab"), "persen": round(fr * 100, 1)}
    lintas = lintas_pertama(per_jam)
    lintas_out = rincian(lintas[0], lintas[1], lintas[2], lintas[3]) if lintas else None
    semua_lintas, terlihat = [], set()
    for j, d in enumerate(per_jam):
        for (nm, cid), fr in sorted(d.items(), key=lambda e: -e[1]):
            if fr >= LINTAS_FRAKSI and nm not in terlihat:
                terlihat.add(nm)
                semua_lintas.append(rincian(j, nm, cid, fr))
    out = {"v": 1, "dibuat": alat.iso(sekarang), "putaran": {"model": "ECMWF IFS", "res": 0.1, "init": alat.iso(init), "lisensi": "CC BY 4.0"},
           "sumber_angin": "ECMWF IFS 0,1 derajat, 10 m dan 850 hPa (60/40)", "langkah": langkah_layar, "jam_layar": [jam_layar[0], jam_layar[-1]],
           "raster": {"asap": "asap_{l}.png", "bbox": list(BBOX)}, "p99": round(p99, 4), "ambang_cluster": round(float(ambang), 1),
           "cluster": [{"id": p["id"], "lat": p["lat"], "lon": p["lon"], "frp24": round(p["frp24"]), "kab": p.get("kab")} for p in cl],
           "lintas": lintas_out, "lintas_semua": semua_lintas,
           "lintas_maks": {KODE_NEGARA[nm]: round(100 * max([f for d in per_jam for (n_, _), f in d.items() if n_ == nm] or [0]), 1) for nm in poli}, "kota_total": len(hasil), "kota_lain": max(0, len(hasil) - 8),
           "kota": [{k_: v_ for k_, v_ in h.items() if k_ != "beban_maks"} for h in hasil[:8]], "angin_asap": angin_asap}
    nb = alat.simpan("asap.json", out, folder=keluar)
    alat.log(f"asap.json {nb // 1024} KB, {nc} cluster, {len(snap)} jam, {total} partikel, {len(hasil)} kota, {time.time() - t_mulai:.0f} dtk")
    return out, hasil, ukuran_png


def semai_cli(argv):
    import argparse
    a = argparse.ArgumentParser(prog="lintasan.py semai")
    a.add_argument("--putaran", required=True)
    a.add_argument("--sekarang", required=True)
    a.add_argument("--keluar", required=True)
    a.add_argument("--kluster")
    a.add_argument("--ifs")
    o = a.parse_args(argv)
    semai(o.putaran, alat.dari_iso(o.sekarang), o.keluar, o.kluster, o.ifs)

if __name__ == "__main__":
    if sys.argv[1:] == ["uji"]:
        uji()
    elif sys.argv[1:2] == ["semai"]:
        semai_cli(sys.argv[2:])
    else:
        main()
