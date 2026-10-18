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
import math
import os
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
    xs, ys = [], []
    bagian = geom["coordinates"] if geom["type"] == "MultiPolygon" else [geom["coordinates"]]
    for b in bagian:
        for c in b[0]:
            xs.append(c[0])
            ys.append(c[1])
    return min(xs) - .02, min(ys) - .02, max(xs) + .02, max(ys) + .02


def titik_konsesi():
    """[(lat, lon, nama badan usaha)] dari konsesi2026; hanya nama perusahaan (bukan pemegang/tokoh)."""
    out = []
    pola = os.path.join(alat.AKAR, "public/data/konsesi2026/[0-9][0-9].json")
    for p in sorted(glob.glob(pola)):
        for c in alat.muat(p).get("perusahaan", []):
            nama = c.get("nama", "")
            if not nama.upper().startswith(("PT", "CV", "KOPERASI", "PERUM", "KUD")):
                continue
            for k in c.get("kompleks", []):
                out.append((k[0], k[1], nama))
    return out


def konsesi_untuk(f, tk):
    x0, y0, x1, y1 = kotak(f["geometry"])
    return sorted({n for la, lo, n in tk if x0 <= lo <= x1 and y0 <= la <= y1})


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
    d = bangun(kl, angin_uji(0, 100), [{"kode": "1601", "lat": 0.0, "lon": 105.0}], [(-1.0, 105.05, "PT Contoh"), (5.0, 100.0, "PT Jauh")], t)
    k = d["kompleks"][0]
    assert k["konsesi"] == ["PT Contoh"] and k["kota"][0]["kode"] == "1601" and k["kota"][0]["jam"] == 3, k["kota"]   # 36 km/jam ke utara: jam ke-3 (108 km) masuk 25 km kota
    assert len(k["jalur"]) == 3 and k["jalur"][0]["t"][0] == [105.0, -1.0, 0]
    print("lintasan uji: lulus")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main()
