"""Watak kebakaran per lokasi dari arsip VIIRS S-NPP 2012-2026 -> public/data/riwayat_sel/<tx>_<ty>.json

Dipakai laci cluster ("Tren lokasi & prakiraan"): laci membaca rekaman sel 0,05 derajat tempat pusat cluster jatuh.
Tiap rekaman merangkum JENDELA 3x3 sel di sekitarnya (~16 km), supaya cluster selebar beberapa km tidak terpotong tepi sel.
Hanya VIIRS S-NPP (satu sensor sepanjang 2012-2026, jadi angka antartahun sebanding), keyakinan n/h, api vegetasi
(sel industri/gunung api dibuang dengan pola riwayat_grid.bukan_vegetasi). Hari = hari WIB.

Per rekaman (kunci "ix_iy", kisi x0 = 94,5, y1 = 6,5, sel 0,05):
  y  titik per tahun 2012..tahun terakhir (tahun terakhir belum lengkap)
  yd titik per tahun s.d. hari-dalam-tahun yang sama dengan tanggal arsip terakhir (banding "tahun ini vs tahun lalu")
  m  titik per bulan, semua tahun
  r  lama tiap EPISODE (hari, dari deteksi pertama s.d. terakhir; jeda <= JEDA hari masih episode sama), episode >= MIN_TITIK titik,
     urut naik, paling banyak 120 episode terbaru
  k  median jumlah episode per tahun aktif (kekambuhan)
  x  jangkauan episode: [median, p75] km, jarak terjauh pusat harian dari pusat hari pertama
  v  geser pusat harian dalam episode >= 3 hari: [arah tuju derajat (0 = utara), konsistensi 0-1, median laju km/hari, jumlah langkah]
     Kasar: dua api terpisah dalam jendela yang sama ikut menggeser pusat.
  s  [median hari-dalam-tahun deteksi pertama, median deteksi terakhir] di tahun yang >= 10 titik (tahun berjalan tidak dipakai)
  nm porsi deteksi malam (%), petunjuk bara yang bertahan
  f  median FRP (MW)

Pakai:  python3 scripts/data/riwayat_sel.py        # baca data/raw/firms/viirs_2012_2014.csv + viirs.csv (lokal, tidak di CI)
        python3 scripts/data/riwayat_sel.py uji    # self-check
"""
import csv, datetime as dt, glob, json, math, os, statistics as st, sys

sys.path.insert(0, os.path.dirname(__file__))
from wilayah import AKAR  # noqa: E402
from riwayat_grid import bukan_vegetasi, vegetasi  # noqa: E402

X0, X1, Y0, Y1, SEL = 94.5, 141.5, -11.5, 6.5, 0.05
TH0, JEDA, MIN_TITIK, MIN_JENDELA, TAHUN_AKTIF = 2012, 2, 5, 20, 10
KELUAR = os.path.join(AKAR, "public/data/riwayat_sel")


def sel(lon, lat):
    return int((lon - X0) / SEL), int((Y1 - lat) / SEL)


def km(a1, o1, a2, o2):
    r = math.pi / 180
    h = math.sin((a2 - a1) * r / 2) ** 2 + math.cos(a1 * r) * math.cos(a2 * r) * math.sin((o2 - o1) * r / 2) ** 2
    return 12742 * math.asin(math.sqrt(h))


def episode(hari):
    """hari = {ordinal: [n, slat, slon]} -> daftar episode, tiap episode = daftar ordinal urut (jeda <= JEDA hari)."""
    ep, cur = [], []
    for d in sorted(hari):
        if cur and d - cur[-1] > JEDA + 1:
            ep.append(cur)
            cur = []
        cur.append(d)
    return ep + ([cur] if cur else [])


def watak(hari, frp, malam, akhir):
    """Rangkuman satu jendela. hari = {ordinal: [n, slat, slon]}; akhir = tanggal arsip terakhir."""
    th1, doy_akhir = akhir.year, akhir.timetuple().tm_yday
    y, yd, m = [0] * (th1 - TH0 + 1), [0] * (th1 - TH0 + 1), [0] * 12
    per_th = {}
    for d, (n, _, _) in hari.items():
        t = dt.date.fromordinal(d)
        y[t.year - TH0] += n
        m[t.month - 1] += n
        if t.timetuple().tm_yday <= doy_akhir:
            yd[t.year - TH0] += n
        per_th.setdefault(t.year, []).append(d)
    pusat = lambda d: (hari[d][1] / hari[d][0], hari[d][2] / hari[d][0])
    lama, jauh, langkah, ep_th = [], [], [], {}
    for e in episode(hari):
        if sum(hari[d][0] for d in e) < MIN_TITIK:
            continue
        lama.append(e[-1] - e[0] + 1)
        ep_th[dt.date.fromordinal(e[0]).year] = ep_th.get(dt.date.fromordinal(e[0]).year, 0) + 1
        a0, o0 = pusat(e[0])
        jauh.append(max(km(a0, o0, *pusat(d)) for d in e))
        if len(e) >= 3:
            for d1, d2 in zip(e, e[1:]):
                (a1, o1), (a2, o2) = pusat(d1), pusat(d2)
                j = km(a1, o1, a2, o2)
                if j > 0.2:  # geser di bawah ~setengah piksel = diam
                    langkah.append((math.atan2((o2 - o1) * math.cos(math.radians(a1)), a2 - a1), j / (d2 - d1)))
    rec = {"y": y, "yd": yd, "m": m, "r": sorted(lama[-120:])}
    if ep_th:
        rec["k"] = round(st.median(ep_th.values()), 1)
    if jauh:
        q = sorted(jauh)
        rec["x"] = [round(st.median(q), 1), round(q[int(len(q) * .75)], 1)]
    if len(langkah) >= 5:
        sx, cy = sum(math.sin(a) for a, _ in langkah), sum(math.cos(a) for a, _ in langkah)
        rec["v"] = [round(math.degrees(math.atan2(sx, cy)) % 360), round(math.hypot(sx, cy) / len(langkah), 2),
                    round(st.median(v for _, v in langkah), 1), len(langkah)]
    aw = [(min(ds), max(ds)) for t, ds in per_th.items() if t < th1 and y[t - TH0] >= TAHUN_AKTIF]
    if aw:
        doy = lambda d: dt.date.fromordinal(d).timetuple().tm_yday
        rec["s"] = [round(st.median(doy(a) for a, _ in aw)), round(st.median(doy(b) for _, b in aw))]
    tot = sum(y)
    rec["nm"] = round(100 * malam / tot) if tot else 0
    rec["f"] = round(st.median(frp), 1) if frp else 0
    return rec


def baca(berkas):
    """-> ({(ix,iy): {ordinal: [n, slat, slon]}}, {(ix,iy): [frp]}, {(ix,iy): n_malam}, tanggal terakhir)"""
    hari, frp, malam, akhir = {}, {}, {}, dt.date(TH0, 1, 1)
    for b in berkas:
        nonveg = bukan_vegetasi(b)
        for r in csv.DictReader(open(b)):
            if r["confidence"] not in ("n", "h") or not vegetasi(r, nonveg):
                continue
            lon, lat = float(r["longitude"]), float(r["latitude"])
            if not (X0 <= lon < X1 and Y0 < lat <= Y1):
                continue
            t = r["acq_time"].zfill(4)
            w = dt.datetime.fromisoformat(r["acq_date"]) + dt.timedelta(hours=int(t[:2]) + 7, minutes=int(t[2:]))
            if w.year < TH0:
                continue
            c, d = sel(lon, lat), w.date().toordinal()
            akhir = max(akhir, w.date())
            h = hari.setdefault(c, {}).setdefault(d, [0, 0.0, 0.0])
            h[0] += 1; h[1] += lat; h[2] += lon
            frp.setdefault(c, []).append(float(r["frp"] or 0))
            if r["daynight"] == "N":
                malam[c] = malam.get(c, 0) + 1
    return hari, frp, malam, akhir


def main():
    raw = os.path.join(AKAR, "data/raw/firms")
    hari, frp, malam, akhir = baca([os.path.join(raw, "viirs_2012_2014.csv"), os.path.join(raw, "viirs.csv")])
    print(f"{len(hari)} sel bertitik, arsip s.d. {akhir}", file=sys.stderr)
    ubin = {}
    for (ix, iy) in hari:
        tet = [(ix + a, iy + b) for a in (-1, 0, 1) for b in (-1, 0, 1) if (ix + a, iy + b) in hari]
        gab = {}
        for c in tet:
            for d, (n, sa, so) in hari[c].items():
                g = gab.setdefault(d, [0, 0.0, 0.0])
                g[0] += n; g[1] += sa; g[2] += so
        if sum(g[0] for g in gab.values()) < MIN_JENDELA:
            continue
        rec = watak(gab, [f for c in tet for f in frp[c]], sum(malam.get(c, 0) for c in tet), akhir)
        ubin.setdefault((int(ix * SEL), int(iy * SEL)), {})[f"{ix}_{iy}"] = rec
    os.makedirs(KELUAR, exist_ok=True)
    for f in glob.glob(os.path.join(KELUAR, "*.json")):
        os.remove(f)
    meta = {"sumber": f"NASA FIRMS VIIRS S-NPP arsip standar + NRT, keyakinan sedang/tinggi, api vegetasi, {TH0}-{akhir.year}",
            "x0": X0, "y1": Y1, "sel": SEL, "th0": TH0, "sd": akhir.isoformat(), "jeda": JEDA, "min_titik": MIN_TITIK}
    for (tx, ty), c in ubin.items():
        json.dump({**meta, "c": c}, open(os.path.join(KELUAR, f"{tx}_{ty}.json"), "w"), separators=(",", ":"))
    print(f"{sum(len(c) for c in ubin.values())} rekaman, {len(ubin)} ubin", file=sys.stderr)


def uji():
    assert sel(94.5, 6.5) == (0, 0) and sel(94.56, 6.44) == (1, 1)
    o = dt.date(2019, 8, 1).toordinal()
    # episode 1: 6 hari, pusat bergeser ~1,1 km/hari ke utara; jeda 2 hari masih episode sama; episode 2 terpisah 10 hari
    h = {o + i: [3, 3 * (-2.0 + .01 * i), 3 * 113.0] for i in (0, 1, 2, 4, 5)}
    h[o + 20] = [6, 6 * -2.0, 6 * 113.0]
    assert episode(h) == [[o, o + 1, o + 2, o + 4, o + 5], [o + 20]]
    r = watak(h, [10.0] * 21, 7, dt.date(2026, 10, 1))
    assert r["r"] == [1, 6], r["r"]
    assert r["y"][2019 - TH0] == 21 and r["m"][7] == 21 and r["yd"][2019 - TH0] == 21 and r["k"] == 2
    assert "v" not in r  # 4 langkah < 5: arah tidak ditulis
    h[o + 6] = [3, 3 * -1.94, 3 * 113.0]
    r = watak(h, [10.0], 0, dt.date(2026, 10, 1))
    assert r["v"][0] in (0, 360) and r["v"][1] == 1.0 and 1.0 < r["v"][2] < 1.2, r["v"]
    assert r["s"] == [dt.date(2019, 8, 1).timetuple().tm_yday, dt.date(2019, 8, 21).timetuple().tm_yday]
    # tahun berjalan tidak ikut median musim; yd memotong di hari-dalam-tahun tanggal arsip
    r = watak({dt.date(2026, 9, 1).toordinal(): [12, -24.0, 1356.0], dt.date(2025, 11, 1).toordinal(): [12, -24.0, 1356.0]}, [1.0], 0, dt.date(2026, 10, 1))
    assert r["s"] == [305, 305] and r["yd"][-1] == 12 and r["yd"][-2] == 0
    print("ok")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main()
