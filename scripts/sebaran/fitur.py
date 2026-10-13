"""Fitur per (peristiwa, jangkar) dan per sel calon -> dipakai latih.py, pendorong.py, kasus.py

Jangkar = waktu sebuah lintasan VIIRS. Keadaan pada jangkar p: sel terbakar = semua sel terdeteksi <= p, sel aktif = terdeteksi
dalam 24 jam terakhir. Target = sel BARU terdeteksi di (p, p + 24 jam]. Calon = sel belum terbakar dalam jari-jari R sel
(Chebyshev) dari sel aktif; R = 5 (1,9 km) menampung ~97% sel baru per lintasan (diukur 2019/2023).

Cuaca jendela [p, p+24 jam] dari seri per jam (cuaca.py). FWI: kode harian siang setempat dengan masa panas 30 hari
sebelum hari jangkar dimulai dari 85/6/15 (sama dengan peramban: forecast past_days=30); FFMC per jam (Van Wagner 1977,
port hffmc dari public/index.html) dibawa sampai jam jangkar.

SEMUA fitur di FITUR_SEL tersedia di peramban (cuaca prakiraan, lahan/*.geojson, kanal.json, jalan.geojson, desa.json,
riwayat_grid.json), kecuali yang ditandai riset_saja (bekas terbakar 375 m tahun lalu; dipakai di analisis pendorong).
"""
import json, math, os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(1, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data"))
import fwi as F  # noqa: E402  scripts/data/fwi.py
from umum import (MENTAH, PUBLIK, NX, T0, Lahan, ij, menit, pusat)  # noqa: E402
import cuaca  # noqa: E402

R = 5
JAM = 60

# fitur model sel (urutan = urutan kolom di model_sebaran.json)
FITUR_SEL = [
    "jarak_m",        # jarak ke sel aktif terdekat
    "tetangga8",      # sel terbakar di 3x3
    "aktif24",        # sel aktif di 5x5
    "searah",         # cos sudut (sel aktif terdekat -> calon) vs arah angin bertiup (ke mana)
    "angin_searah",   # searah x kecepatan angin rata-rata 24 jam (km/jam)
    "ws", "ws_maks", "rh_min", "t_maks", "vpd_maks", "hujan24", "hujan72", "hari_kering",
    "ffmc", "dmc", "dc", "bui", "isi_maks", "fwi",
    "log_luas", "log_baru24", "umur_jam", "log_frp",  # log(1 + FRP maks MW deteksi 24 jam terakhir); peramban: masukan / bawaan
    "gambut", "hutan", "produksi", "apl", "kebun", "hti", "hph", "tambang", "sanksi",  # kawasan & konsesi (lahan/*.geojson)
    "kanal_km", "jalan_km", "desa_km", "penduduk_km2",
    "riwayat_f", "oni", "dmi",
    "malam",          # jangkar = lintasan malam
]


def hffmc(Fo, T, H, W, Rr):
    """Port persis hffmc() di public/index.html."""
    mo = max(0.0, 147.27723 * (101 - Fo) / (59.5 + Fo))
    if Rr > 0:
        m0 = mo
        mo += 42.5 * Rr * math.exp(-100 / (251 - m0)) * (1 - math.exp(-6.93 / Rr))
        if m0 > 150:
            mo += .0015 * (m0 - 150) ** 2 * math.sqrt(Rr)
        mo = min(250, mo)
    e = 1 - math.exp(-.115 * H)
    ed = .942 * H ** .679 + 11 * math.exp((H - 100) / 10) + .18 * (21.1 - T) * e
    ew = .618 * H ** .753 + 10 * math.exp((H - 100) / 10) + .18 * (21.1 - T) * e
    k = lambda a: (.424 * (1 - a ** 1.7) + .0694 * math.sqrt(W) * (1 - a ** 8)) * .0579 * math.exp(.0365 * T)
    m = ed + (mo - ed) * 10 ** -k(H / 100) if mo > ed else ew - (ew - mo) * 10 ** -k((100 - H) / 100) if mo < ew else mo
    return max(0.0, min(101.0, 59.5 * (250 - m) / (147.27723 + m)))


def fFF(Fo):
    m = 147.27723 * (101 - Fo) / (59.5 + Fo)
    return 91.9 * math.exp(-.1386 * m) * (1 + m ** 5.31 / 4.93e7)


def fWI(W):
    return 12 * (1 - math.exp(-.0818 * (W - 28))) if W > 40 else math.exp(.05039 * W)


def isih(Fo, W):
    return .208 * fWI(W) * fFF(Fo)


class Seri:
    """Seri cuaca per jam satu (tahun, sel 0,5) + cache kode FWI per hari."""
    def __init__(self, d):
        self.lon, self.lat = d["lon"], d["lat"]
        self.m0 = menit(d["mulai"][:10], d["mulai"][11:13] + "00")
        self.n = len(d["ws"])
        isi = lambda xs, b: [b if x is None else x for x in xs]
        # nilai kosong -> nilai jam sebelumnya
        for k in cuaca.KOLOM:
            xs, last = d[k], None
            out = []
            for x in xs:
                last = x if x is not None else last
                out.append(last)
            setattr(self, k, isi(out, {"tc": 28, "rh": 80, "hujan": 0, "ws": 5, "wd": 0}[k]))
        self.cache = {}

    def jam(self, m):
        return (m - self.m0) // 60

    def cukup(self, m, maju=72):
        i = self.jam(m)
        return i - 30 * 24 - 24 >= 0 and i + maju <= self.n

    def kode(self, i):
        """Kode FWI pada jam indeks i: masa panas 30 hari sebelum hari (UTC) jam i. -> (ffmc_jam, dmc, dc, bui, fwi_harian, ffmc_harian)"""
        hari = i // 24
        if hari in self.cache:
            dd = self.cache[hari]
        else:
            siang = int(round(12 - self.lon / 15)) % 24  # jam UTC = siang setempat
            rows = []
            for h in range(hari - 30, hari):
                j = h * 24 + siang
                hj = sum(self.hujan[max(0, j - 23):j + 1])
                rows.append((self.tc[j], self.rh[j], self.ws[j], hj))
            r = F.deret(rows)[-1]
            # FFMC per jam dari siang kemarin sampai awal hari ini
            Fh = r["ffmc"]
            for j in range((hari - 1) * 24 + siang + 1, hari * 24):
                Fh = hffmc(Fh, self.tc[j], self.rh[j], self.ws[j], self.hujan[j])
            dd = self.cache[hari] = (Fh, r["dmc"], r["dc"], r["bui"], r["fwi"])
        Fh, dmc, dc, bui, fw = dd
        for j in range(hari * 24, i + 1):
            Fh = hffmc(Fh, self.tc[j], self.rh[j], self.ws[j], self.hujan[j])
        return Fh, dmc, dc, bui, fw

    def jendela(self, m):
        """Fitur cuaca untuk [m, m + 24 jam]."""
        i = self.jam(m)
        Fh, dmc, dc, bui, fw = self.kode(i)
        ws = self.ws[i:i + 24]
        u = sum(w * math.sin(math.radians(d)) for w, d in zip(ws, self.wd[i:i + 24])) / 24
        v = sum(w * math.cos(math.radians(d)) for w, d in zip(ws, self.wd[i:i + 24])) / 24
        dari = (math.degrees(math.atan2(u, v)) + 360) % 360  # arah angin datang (konvensi meteorologi)
        F2, isimax = Fh, 0
        for j in range(i, i + 24):
            F2 = hffmc(F2, self.tc[j], self.rh[j], self.ws[j], self.hujan[j])
            isimax = max(isimax, isih(F2, self.ws[j]))
        kering = 0
        for h in range(1, 31):
            if sum(self.hujan[max(0, i - 24 * h):i - 24 * (h - 1)]) >= 1:
                break
            kering = h
        vpd = max(.6108 * math.exp(17.27 * t / (t + 237.3)) * (1 - min(max(h, 0), 100) / 100) for t, h in zip(self.tc[i:i + 24], self.rh[i:i + 24]))
        return {"ws": sum(ws) / 24, "ws_maks": max(ws), "ke": (dari + 180) % 360, "kuat_vektor": math.hypot(u, v),
                "rh_min": min(self.rh[i:i + 24]), "t_maks": max(self.tc[i:i + 24]), "vpd_maks": vpd, "hujan24": sum(self.hujan[i:i + 24]),
                "hujan72": sum(self.hujan[max(0, i - 72):i]), "hari_kering": kering,
                "ffmc": Fh, "dmc": dmc, "dc": dc, "bui": bui, "isi_maks": isimax, "fwi": fw}


class Konteks:
    """Lapisan statis: lahan, desa, riwayat MODIS, bekas terbakar 375 m per tahun (riset), ENSO/IOD."""
    def __init__(self, bekas=True):
        self.lahan = Lahan()
        rg = json.load(open(os.path.join(PUBLIK, "riwayat_grid.json")))
        self.rg = {(a, b): f for a, b, f, _ in rg["sel_data"]}
        self.rg_x0, self.rg_y1 = rg["x0"], rg["y1"]
        self.desa = {}
        for daf in json.load(open(os.path.join(PUBLIK, "osm/desa.json"))).values():
            for la, lo, _, _ in daf:
                self.desa.setdefault((math.floor(lo / .05), math.floor(la / .05)), []).append((lo, la))
        e = json.load(open(os.path.join(MENTAH, "enso.json")))
        self.oni, self.dmi = e["oni"], e["dmi"]
        self.bekas = {}
        if bekas:
            from umum import muat_viirs
            v = muat_viirs()
            for t, la, lo in zip(v["t"], v["lat"], v["lon"]):
                y = 2015 + int(t // 525960)
                k = int((la + 12) / .003375) * NX + int((lo - 94) / .003375)
                self.bekas.setdefault(k, set()).add(y)
        self.c = {}
        self.sungai = None

    def desa_km(self, lon, lat):
        gx, gy, best = math.floor(lon / .05), math.floor(lat / .05), 15.0
        for dx in (-2, -1, 0, 1, 2):
            for dy in (-2, -1, 0, 1, 2):
                for x, y in self.desa.get((gx + dx, gy + dy), ()):
                    best = min(best, math.hypot((x - lon) * 111.32 * math.cos(math.radians(lat)), (y - lat) * 110.57))
        return best

    def sel(self, k, prov):
        if k in self.c:
            return self.c[k]
        lon, lat = pusat(k)
        r = dict(self.lahan(k, prov))
        r["desa_km"] = self.desa_km(lon, lat)
        r["riwayat_f"] = self.rg.get((int((lon - self.rg_x0) / .1), int((self.rg_y1 - lat) / .1)), 0)
        self.c[k] = r
        return r

    def sungai_km(self, k):
        """Jarak ke sungai OSM (waterway=river, data/raw/osm, 9 provinsi; riset saja: peramban hanya punya Kalsel)."""
        if self.sungai is None:
            import glob
            self.sungai = {}
            for f in glob.glob(os.path.join(MENTAH, "..", "osm", "*-sungai-*.json")):
                for el in json.load(open(f))["elements"]:
                    if el.get("tags", {}).get("waterway") == "river":
                        for g in el.get("geometry", [])[::3]:
                            self.sungai.setdefault((math.floor(g["lon"] / .05), math.floor(g["lat"] / .05)), []).append((g["lon"], g["lat"]))
        lon, lat = pusat(k)
        gx, gy, best = math.floor(lon / .05), math.floor(lat / .05), 10.0
        for dx in range(-2, 3):
            for dy in range(-2, 3):
                for x, y in self.sungai.get((gx + dx, gy + dy), ()):
                    best = min(best, math.hypot((x - lon) * 111.32 * math.cos(math.radians(lat)), (y - lat) * 110.57))
        return best

    def iklim(self, m):
        t = T0.timestamp() + m * 60
        import datetime as dt
        d = dt.datetime.fromtimestamp(t, dt.timezone.utc)
        return terakhir(self.oni, d.year, d.month), terakhir(self.dmi, d.year, d.month)

    def riwayat_sel(self, k, tahun):
        """(bekas1, tahun_sejak): terdeteksi tahun lalu (sel atau 8 tetangga); tahun sejak deteksi terakhir sebelum tahun ini
        (VIIRS mulai 2015, jadi 'belum pernah' = tahun - 2014, tersensor)."""
        i, j = ij(k)
        ys = set()
        for dj in (-1, 0, 1):
            for di in (-1, 0, 1):
                ys |= {y for y in self.bekas.get((j + dj) * NX + i + di, ()) if y < tahun}
        return (1 if tahun - 1 in ys else 0), (tahun - max(ys) if ys else tahun - 2014)

    def bekas_lalu(self, k, tahun):
        """1 bila sel (atau 8 tetangganya) terdeteksi di 1-3 tahun sebelumnya (fitur riset)."""
        i, j = ij(k)
        for dj in (-1, 0, 1):
            for di in (-1, 0, 1):
                ys = self.bekas.get((j + dj) * NX + i + di)
                if ys and any(tahun - 3 <= y < tahun for y in ys):
                    return 1
        return 0


def terakhir(tabel, th, bl, mundur=6):
    """Nilai indeks bulan itu, atau bulan terakhir yang sudah terbit (ONI/DMI terbit terlambat 1-2 bulan)."""
    for _ in range(mundur + 1):
        v = tabel.get(f"{th}-{bl:02d}")
        if v is not None:
            return v
        th, bl = (th, bl - 1) if bl > 1 else (th - 1, 12)
    return 0.0


def jangkar(e):
    """-> [(p, terbakar:set, aktif:dict sel->menit, baru24:set, baru48:set, baru72:set)] untuk tiap lintasan."""
    det = e["det"]
    lintas = sorted({d[0] for d in det})
    pertama = {}
    for m, k, _ in det:
        if k not in pertama:
            pertama[k] = m
    terakhir = {}
    out = []
    idx = 0
    terbakar = set()
    for p in lintas:
        while idx < len(det) and det[idx][0] <= p:
            m, k, _ = det[idx]
            terbakar.add(k)
            terakhir[k] = m
            idx += 1
        aktif = {k: m for k, m in terakhir.items() if p - m <= 24 * 60}
        baru = [set(k for k, m in pertama.items() if p < m <= p + h * 60) for h in (24, 48, 72)]
        out.append((p, set(terbakar), aktif, *baru))
    return out


def calon(terbakar, aktif, r=R):
    """Sel belum terbakar dalam r sel dari sel aktif -> {sel: (jarak_sel_m, sel_aktif_terdekat)}"""
    out = {}
    for a in aktif:
        ai, aj = ij(a)
        for dj in range(-r, r + 1):
            for di in range(-r, r + 1):
                k = (aj + dj) * NX + ai + di
                if k in terbakar:
                    continue
                d = math.hypot(di, dj)
                o = out.get(k)
                if o is None or d < o[0] or (d == o[0] and a < o[1]):  # seri -> sel aktif berkunci terkecil (sama dgn JS)
                    out[k] = (d, a)
    return out


def baris_sel(k, info, terbakar, aktif, w, ev, ktx, prov, tahun=9999):
    """Vektor fitur (dict) satu sel calon."""
    d, a = info
    ki, kj = ij(k)
    ai, aj = ij(a)
    b8 = sum(1 for dj in (-1, 0, 1) for di in (-1, 0, 1) if (kj + dj) * NX + ki + di in terbakar)
    a24 = sum(1 for dj in range(-2, 3) for di in range(-2, 3) if (kj + dj) * NX + ki + di in aktif)
    br = math.atan2(ki - ai, kj - aj)  # arah kompas (rad) dari aktif terdekat ke calon (i = timur, j = utara)
    se = math.cos(br - math.radians(w["ke"])) if d > 0 else 0.0
    s = ktx.sel(k, prov)
    return {"jarak_m": d * 375, "tetangga8": b8, "aktif24": a24, "searah": se, "angin_searah": se * w["ws"],
            **{x: w[x] for x in ("ws", "ws_maks", "rh_min", "t_maks", "vpd_maks", "hujan24", "hujan72", "hari_kering", "ffmc", "dmc", "dc", "bui", "isi_maks", "fwi")},
            **ev, **{x: s[x] for x in ("gambut", "hutan", "produksi", "apl", "kebun", "hti", "hph", "tambang", "kanal_km", "jalan_km", "desa_km",
                                       "penduduk_km2", "riwayat_f")},
            "sanksi": 1 if s["sanksi_th"] <= tahun else 0}  # sanksi yang SUDAH dijatuhkan pada tahun api (tanpa bocoran)


def fitur_peristiwa(terbakar, aktif, umur_jam, baru24n, oni, dmi, malam, frp=0.0):
    return {"log_luas": math.log(len(terbakar)), "log_baru24": math.log1p(baru24n), "umur_jam": umur_jam, "log_frp": math.log1p(frp),
            "oni": oni, "dmi": dmi, "malam": malam}


if __name__ == "__main__" and sys.argv[1:] == ["uji"]:
    # hffmc: kering-panas-berangin menaikkan FFMC, hujan menurunkannya
    assert hffmc(85, 33, 40, 15, 0) > 85 and hffmc(85, 25, 95, 5, 5) < 85
    assert 0 <= hffmc(101, 40, 5, 50, 0) <= 101
    # jangkar: tidak ada sel baru yang juga ada di 'terbakar' pada jangkar yang sama
    from umum import sel as S
    e = {"det": [(0, S(110, 0), 1), (720, S(110.004, 0), 1), (1440, S(110.008, 0), 1), (1440 * 4, S(110.02, 0), 1)]}
    js = jangkar(e)
    for p, tb, ak, b24, b48, b72 in js:
        assert not (b24 & tb) and b24 <= b48 <= b72
        assert all(p - m <= 1440 for m in ak.values())
    assert js[0][3] == {S(110.004, 0), S(110.008, 0)}
    c = calon({S(110, 0)}, {S(110, 0): 0})
    assert S(110, 0) not in c and len(c) == (2 * R + 1) ** 2 - 1 and max(v[0] for v in c.values()) <= R * math.sqrt(2) + 1e-9
    assert terakhir({"2026-08": 1.2}, 2026, 10) == 1.2 and terakhir({}, 2026, 10) == 0.0
    print("ok")
