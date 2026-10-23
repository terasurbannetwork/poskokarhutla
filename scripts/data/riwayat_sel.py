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
  en watak musim El Nino saja (2015, 2019, 2023): r, x, v, s, k seperti di atas; dipakai laci saat tahun berjalan El Nino
  ym titik MODIS per tahun 2003..tahun arsip (seri panjang untuk kekerapan, tren, El Nino; tahun terakhir belum lengkap)

Pakai:  python3 scripts/data/riwayat_sel.py        # baca data/raw/firms/viirs_2012_2014.csv + viirs.csv (lokal, tidak di CI)
        python3 scripts/data/riwayat_sel.py uji    # self-check
        python3 scripts/data/riwayat_sel.py langganan   # -> public/data/riwayat_langganan.json dari ubin (main juga memanggilnya)
        python3 scripts/data/riwayat_sel.py ujibalik   # -> public/data/riwayat_sel_uji.json (musim 2019 & 2023, data latih sebelum musim uji)
"""
import csv, datetime as dt, glob, json, math, os, statistics as st, sys

sys.path.insert(0, os.path.dirname(__file__))
from wilayah import AKAR  # noqa: E402
from riwayat_grid import bukan_vegetasi, vegetasi  # noqa: E402

X0, X1, Y0, Y1, SEL = 94.5, 141.5, -11.5, 6.5, 0.05
TH0, JEDA, MIN_TITIK, MIN_JENDELA, TAHUN_AKTIF = 2012, 2, 5, 20, 10
THM0, AKTIF_MODIS = 2003, 3
EL_NINO_V = (2015, 2019, 2023)   # tahun El Nino dalam rentang VIIRS: analog untuk prakiraan lama/musim saat tahun berjalan El Nino   # MODIS Terra+Aqua lengkap sejak 2003; piksel 1 km mendeteksi jauh lebih sedikit, jadi ambang tahun terbakar 3 (= riwayat_grid)
KELUAR = os.path.join(AKAR, "public/data/riwayat_sel")


def sel(lon, lat):
    return int((lon - X0) / SEL), int((Y1 - lat) / SEL)


def km(a1, o1, a2, o2):
    r = math.pi / 180
    h = math.sin((a2 - a1) * r / 2) ** 2 + math.cos(a1 * r) * math.cos(a2 * r) * math.sin((o2 - o1) * r / 2) ** 2
    return 12742 * math.asin(math.sqrt(h))


CELAH = set()   # hari arsip S-NPP tanpa satu pun deteksi nasional (lubang data, mis. 2022-07-27 15 hari): tidak memutus episode. Diisi baca().


def episode(hari):
    """hari = {ordinal: [n, slat, slon]} -> daftar episode, tiap episode = daftar ordinal urut (jeda <= JEDA hari; hari CELAH tidak dihitung jeda)."""
    ep, cur = [], []
    for d in sorted(hari):
        if cur and d - cur[-1] - 1 - sum(1 for x in range(cur[-1] + 1, d) if x in CELAH) > JEDA:
            ep.append(cur)
            cur = []
        cur.append(d)
    return ep + ([cur] if cur else [])


def watak(hari, frp, malam, akhir):
    """Rangkuman satu jendela. hari = {ordinal: [n, slat, slon]}; akhir = tanggal arsip terakhir."""
    th1, doy_akhir = akhir.year, akhir.timetuple().tm_yday
    berjalan = akhir.toordinal() - (JEDA + 1)   # episode yang berakhir sesudah ini mungkin masih menyala: bukan "riwayat" (api hari ini sendiri)
    y, yd, m = [0] * (th1 - TH0 + 1), [0] * (th1 - TH0 + 1), [0] * 12
    per_th = {}
    for d, (n, _, _) in hari.items():
        t = dt.date.fromordinal(d)
        y[t.year - TH0] += n
        if t.year < th1:   # bulan dari tahun penuh saja; tahun berjalan berisi api hari ini sendiri
            m[t.month - 1] += n
        if t.timetuple().tm_yday <= doy_akhir:
            yd[t.year - TH0] += n
        per_th.setdefault(t.year, []).append(d)
    pusat = lambda d: (hari[d][1] / hari[d][0], hari[d][2] / hari[d][0])
    lama, jauh, langkah, ep_th = [], [], [], {}
    for e in episode(hari):
        if sum(hari[d][0] for d in e) < MIN_TITIK or e[-1] >= berjalan:
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
    hari, frp, malam, akhir, ada = {}, {}, {}, dt.date(TH0, 1, 1), set()
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
            ada.add(d)
            akhir = max(akhir, w.date())
            h = hari.setdefault(c, {}).setdefault(d, [0, 0.0, 0.0])
            h[0] += 1; h[1] += lat; h[2] += lon
            frp.setdefault(c, []).append(float(r["frp"] or 0))
            if r["daynight"] == "N":
                malam[c] = malam.get(c, 0) + 1
    CELAH.clear()
    CELAH.update(d for d in range(min(ada), max(ada)) if d not in ada)
    return hari, frp, malam, akhir


def baca_modis(berkas, th1):
    """MODIS keyakinan >= 30, api vegetasi -> {(ix,iy): [titik per tahun THM0..th1]} (hari UTC; beda jam WIB tidak berarti untuk hitungan tahunan)."""
    nonveg, out = bukan_vegetasi(berkas), {}
    for r in csv.DictReader(open(berkas)):
        c = r.get("confidence", "")
        th = int(r["acq_date"][:4])
        if not c.isdigit() or int(c) < 30 or not THM0 <= th <= th1 or not vegetasi(r, nonveg):
            continue
        lon, lat = float(r["longitude"]), float(r["latitude"])
        if X0 <= lon < X1 and Y0 < lat <= Y1:
            out.setdefault(sel(lon, lat), [0] * (th1 - THM0 + 1))[th - THM0] += 1
    return out


def main():
    raw = os.path.join(AKAR, "data/raw/firms")
    hari, frp, malam, akhir = baca([os.path.join(raw, "viirs_2012_2014.csv"), os.path.join(raw, "viirs.csv")])
    modis = baca_modis(os.path.join(raw, "modis.csv"), akhir.year)
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
        ym = [sum(v) for v in zip(*[modis[(ix + a, iy + b)] for a in (-1, 0, 1) for b in (-1, 0, 1) if (ix + a, iy + b) in modis])]
        if ym:
            rec["ym"] = ym
        # watak khusus musim El Nino (analog): lama, jangkauan, geser, musim, kekambuhan dari 2015/2019/2023 saja
        sub = {d: v for d, v in gab.items() if dt.date.fromordinal(d).year in EL_NINO_V}
        if sub:
            w = watak(sub, [], 0, akhir)
            en = {k: w[k] for k in ("r", "x", "v", "s", "k") if w.get(k)}
            if en.get("r"):
                rec["en"] = en   # seri panjang MODIS THM0..tahun arsip (tahun terakhir belum lengkap)
        ubin.setdefault((int(ix * SEL), int(iy * SEL)), {})[f"{ix}_{iy}"] = rec
    os.makedirs(KELUAR, exist_ok=True)
    for f in glob.glob(os.path.join(KELUAR, "*.json")):
        os.remove(f)
    meta = {"sumber": f"NASA FIRMS VIIRS S-NPP arsip standar + NRT, keyakinan sedang/tinggi, api vegetasi, {TH0}-{akhir.year}",
            "x0": X0, "y1": Y1, "sel": SEL, "th0": TH0, "thm0": THM0, "aktif_modis": AKTIF_MODIS,
            "sumber_modis": f"NASA FIRMS MODIS Terra/Aqua arsip standar + NRT, keyakinan >= 30, api vegetasi, {THM0}-{akhir.year}", "sd": akhir.isoformat(), "jeda": JEDA, "min_titik": MIN_TITIK}
    for (tx, ty), c in ubin.items():
        json.dump({**meta, "c": c}, open(os.path.join(KELUAR, f"{tx}_{ty}.json"), "w"), separators=(",", ":"))
    print(f"{sum(len(c) for c in ubin.values())} rekaman, {len(ubin)} ubin", file=sys.stderr)
    langganan()


def langganan():
    """Lokasi langganan untuk lapisan peta pencegahan -> public/data/riwayat_langganan.json, dibaca dari ubin (tanpa arsip).
    Jendela tidak tumpang tindih (pusat ix, iy = 1 mod 3, ~16 km); langganan = terbakar (>= 10 titik) di >= sepertiga tahun penuh.
    f: [bujur, lintang, tahun terbakar, tahun penuh, bulan musim mulai 1-12 atau 0]"""
    out, meta = [], None
    for b in sorted(glob.glob(os.path.join(KELUAR, "*.json"))):
        d = json.load(open(b))
        meta = meta or d
        th1 = int(d["sd"][:4])
        for k, r in d["c"].items():
            ix, iy = map(int, k.split("_"))
            if ix % 3 != 1 or iy % 3 != 1:
                continue
            # seri panjang MODIS 2003-... bila ada (23 tahun penuh), selain itu VIIRS 2012-...
            penuh, amb = (r["ym"][: th1 - d["thm0"]], AKTIF_MODIS) if r.get("ym") else (r["y"][: th1 - d["th0"]], TAHUN_AKTIF)
            a = sum(1 for v in penuh if v >= amb)
            if a >= math.ceil(len(penuh) / 3):
                bl = (dt.date(2025, 1, 1) + dt.timedelta(days=r["s"][0] - 1)).month if r.get("s") else 0
                out.append([round(X0 + (ix + .5) * SEL, 3), round(Y1 - (iy + .5) * SEL, 3), a, len(penuh), bl])
    th1 = int(meta["sd"][:4])
    json.dump({"sumber": meta["sumber_modis"], "tahun": [meta["thm0"], th1 - 1], "definisi": "terbakar (>= 3 titik MODIS; tanpa MODIS: >= 10 titik VIIRS) dalam jendela ~16 km di >= sepertiga tahun penuh",
               "f": out}, open(os.path.join(AKAR, "public/data/riwayat_langganan.json"), "w"), separators=(",", ":"))
    print(f"{len(out)} lokasi langganan", file=sys.stderr)


UJI_TAHUN, UJI_UMUR = (2019, 2023), (3, 7)


def nilai_balik(gab, T, pilih=None):
    """Uji balik satu jendela untuk musim T, HANYA dengan data sebelum 1 Januari T; pilih = himpunan tahun latih (analog), None = semua.
    -> ([(umur, ramalan_total, sebenarnya, dasar_2x_umur, hari_mulai_episode)], (ramalan_akhir_doy, akhir_sebenarnya_doy) atau None)"""
    awal = dt.date(T, 1, 1).toordinal()
    latih = {d: v for d, v in gab.items() if d < awal and (pilih is None or dt.date.fromordinal(d).year in pilih)}
    uji_ = {d: v for d, v in gab.items() if awal <= d < dt.date(T + 1, 1, 1).toordinal()}
    besar = lambda h, e: sum(h[d][0] for d in e) >= MIN_TITIK
    r = [e[-1] - e[0] + 1 for e in episode(latih) if besar(latih, e)]
    lama = []
    for e in episode(uji_):
        L = e[-1] - e[0] + 1
        if not besar(uji_, e):
            continue
        for h in UJI_UMUR:
            lanjut = [v for v in r if v >= h]
            if L >= h and len(lanjut) >= 3:
                lama.append((h, st.median(lanjut), L, 2 * h, e[0]))
    doy = lambda d: dt.date.fromordinal(d).timetuple().tm_yday
    per_th = {}
    for d, (n, _, _) in latih.items():
        per_th.setdefault(dt.date.fromordinal(d).year, []).append((d, n))
    akhir = [doy(max(d for d, _ in v)) for v in per_th.values() if sum(n for _, n in v) >= TAHUN_AKTIF]
    musim = None
    if len(akhir) >= (1 if pilih else 2) and sum(v[0] for v in uji_.values()) >= TAHUN_AKTIF:
        musim = (st.median(akhir), doy(max(uji_)))
    return lama, musim


def ujibalik():
    """-> public/data/riwayat_sel_uji.json. Jendela 3x3 TIDAK tumpang tindih (pusat ix, iy = 1 mod 3) supaya satu kebakaran tidak dihitung berkali-kali.
    Pembanding lama: (a) 2 x umur, (b) median NASIONAL episode tahun sebelumnya yang >= umur (data latih sama). Selang 95% = bootstrap blok per jendela
    (1.000 ulangan) atas selisih galat berpasangan; `lama_unggul` = ramalan lokasi lebih tepat dari median nasional di SEMUA umur (batas atas selang < 0)."""
    import random
    raw = os.path.join(AKAR, "data/raw/firms")
    hari, _, _, _ = baca([os.path.join(raw, "viirs_2012_2014.csv"), os.path.join(raw, "viirs.csv")])
    kasus, musim, latih_nas = [], [], {}   # kasus: (jendela, T, h, ramalan_lokasi, sebenarnya, 2h)
    an_lama, an_musim = {h: [] for h in UJI_UMUR}, []   # (ramalan_umum, ramalan_analog, sebenarnya) pada kasus yang SAMA
    for (ix, iy) in hari:
        if ix % 3 != 1 or iy % 3 != 1:
            continue
        gab = {}
        for c in [(ix + a, iy + b) for a in (-1, 0, 1) for b in (-1, 0, 1)]:
            for d, (n, sa, so) in hari.get(c, {}).items():
                g = gab.setdefault(d, [0, 0.0, 0.0]); g[0] += n; g[1] += sa; g[2] += so
        for T in UJI_TAHUN:
            awal = dt.date(T, 1, 1).toordinal()
            latih = {d: v for d, v in gab.items() if d < awal}
            latih_nas.setdefault(T, []).extend(e[-1] - e[0] + 1 for e in episode(latih) if sum(latih[d][0] for d in e) >= MIN_TITIK)
            l, m = nilai_balik(gab, T)
            kasus += [((ix, iy), T, h, p, L, b) for h, p, L, b, _ in l]
            if m:
                musim.append(((ix, iy), m))
            pilih = {t for t in EL_NINO_V if t < T}
            if T in EL_NINO_V and pilih:
                la, ma = nilai_balik(gab, T, pilih)
                umum = {(h, e0): p for h, p, _, _, e0 in l}
                for h, p, L, _, e0 in la:
                    if (h, e0) in umum:
                        an_lama[h].append((umum[(h, e0)], p, L))
                if m and ma:
                    an_musim.append((m[0], ma[0], m[1]))
    nas = {(T, h): st.median([v for v in latih_nas[T] if v >= h]) for T in UJI_TAHUN for h in UJI_UMUR}
    rng = random.Random(7)

    def selang(baris, galat):
        """bootstrap blok per jendela: baris = [(jendela, ...)], galat(baris) -> selisih galat rata-rata."""
        per = {}
        for b in baris:
            per.setdefault(b[0], []).append(b)
        kunci_ = list(per)
        hasil = sorted(galat([b for _ in kunci_ for b in per[rng.choice(kunci_)]]) for _ in range(1000))
        return [round(hasil[25], 2), round(hasil[974], 2)]

    out = {"dibuat": dt.date.today().isoformat(), "tahun_uji": list(UJI_TAHUN),
           "definisi": "Ramalan dibuat dari tahun SEBELUM musim uji saja. Lama: total hari episode yang sudah bertahan h hari = median lama episode lalu di "
                       "jendela itu yang >= h hari; pembanding = 2 x umur dan median NASIONAL episode lalu yang >= h hari. Akhir musim: median hari deteksi "
                       "terakhir di tahun lalu yang >= 10 titik; pembanding = median semua lokasi. Selang 95% = bootstrap blok per jendela ~16 km.",
           "lama": {}, "musim": None}
    unggul = []
    for h in UJI_UMUR:
        xs = [k for k in kasus if k[2] == h]
        if not xs:
            continue
        mae = lambda bs, f: st.mean(abs(f(b) - b[4]) for b in bs)
        lok, n2, nn = (lambda b: b[3]), (lambda b: b[5]), (lambda b: nas[(b[1], h)])
        ci = selang(xs, lambda bs: mae(bs, lok) - mae(bs, nn))
        out["lama"][str(h)] = {"n": len(xs), "n_jendela": len({k[0] for k in xs}), "mae": round(mae(xs, lok), 1),
                               "tepat": round(100 * sum(abs(k[3] - k[4]) <= 3 for k in xs) / len(xs)), "toleransi": 3,
                               "mae_pembanding": round(mae(xs, n2), 1), "mae_nasional": round(mae(xs, nn), 1), "selisih_nasional_ci95": ci}
        unggul.append(ci[1] < 0)
    out["lama_unggul"] = bool(unggul) and all(unggul)
    if musim:
        dasar = st.median(m[0] for _, m in musim)
        mae_m = lambda bs: st.mean(abs(m[0] - m[1]) for _, m in bs)
        out["musim"] = {"n": len(musim), "n_jendela": len({w for w, _ in musim}), "mae": round(mae_m(musim), 1),
                        "tepat": round(100 * sum(abs(m[0] - m[1]) <= 14 for _, m in musim) / len(musim)), "toleransi": 14,
                        "mae_pembanding": round(st.mean(abs(dasar - m[1]) for _, m in musim), 1),
                        "selisih_pembanding_ci95": selang(musim, lambda bs: mae_m(bs) - st.mean(abs(dasar - m[1]) for _, m in bs))}
    banding = lambda xs, tol: {"n": len(xs), "mae_umum": round(st.mean(abs(u - a) for u, _, a in xs), 1), "mae_analog": round(st.mean(abs(g - a) for _, g, a in xs), 1),
                               "tepat_umum": round(100 * sum(abs(u - a) <= tol for u, _, a in xs) / len(xs)),
                               "tepat_analog": round(100 * sum(abs(g - a) <= tol for _, g, a in xs) / len(xs)), "toleransi": tol}
    out["el_nino"] = {"definisi": f"Musim El Nino {', '.join(map(str, [t for t in UJI_TAHUN if t in EL_NINO_V]))} diramal dua cara pada kasus yang SAMA: "
                                  "umum (semua tahun sebelumnya) vs analog (hanya tahun El Nino sebelumnya). Uji ini memakai 1-2 tahun analog; produksi memakai 3.",
                      "lama": {str(h): banding(xs, 3) for h, xs in an_lama.items() if xs}, "musim": banding(an_musim, 14) if an_musim else None}
    json.dump(out, open(os.path.join(AKAR, "public/data/riwayat_sel_uji.json"), "w"), ensure_ascii=False, indent=1)
    print(json.dumps(out, ensure_ascii=False), file=sys.stderr)


def uji():
    o19 = dt.date(2019, 8, 1).toordinal()
    # latih: tiga episode 2015-2017 masing-masing 10 hari; uji 2019: satu episode 12 hari -> umur 3 & 7 meramal 10, sebenarnya 12
    g = {dt.date(t, 9, 1).toordinal() + i: [2, -4.0, 226.0] for t in (2015, 2016, 2017) for i in range(10)}
    g.update({o19 + i: [2, -4.0, 226.0] for i in range(12)})
    g[dt.date(2020, 1, 5).toordinal()] = [50, -100.0, 5650.0]  # sesudah tahun uji: tidak boleh bocor ke latih maupun uji 2019
    l, m = nilai_balik(g, 2019)
    assert [x[:4] for x in l] == [(3, 10, 12, 6), (7, 10, 12, 14)], l
    # analog: hanya tahun 2015 sebagai latih -> satu episode (< 3) -> tidak meramal lama; musim boleh dari satu tahun
    la, ma = nilai_balik(g, 2019, {2015})
    assert la == [] and ma == (dt.date(2015, 9, 10).timetuple().tm_yday, dt.date(2019, 8, 12).timetuple().tm_yday), (la, ma)
    assert m == (dt.date(2015, 9, 10).timetuple().tm_yday, dt.date(2019, 8, 12).timetuple().tm_yday), m
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
    # episode yang masih menyala di tanggal arsip bukan riwayat; hari celah data tidak memutus episode
    akhir = dt.date(2026, 10, 12)
    h = {dt.date(2025, 8, 1).toordinal() + i: [3, -6.0, 339.0] for i in range(4)}
    h.update({akhir.toordinal() - i: [3, -6.0, 339.0] for i in range(10)})
    r = watak(h, [1.0], 0, akhir)
    assert r["r"] == [4], r["r"]
    assert sum(r["m"]) == 12, "bulan dari tahun berjalan tidak boleh ikut"
    o = dt.date(2022, 7, 20).toordinal()
    g2 = {o: [5, -2.0, 113.0], o + 9: [5, -2.0, 113.0]}
    CELAH.update(range(o + 1, o + 8))
    assert episode(g2) == [[o, o + 9]], episode(g2)
    CELAH.clear()
    assert episode(g2) == [[o], [o + 9]]
    print("ok")


if __name__ == "__main__":
    {"uji": uji, "ujibalik": ujibalik, "langganan": langganan}.get((sys.argv[1:] or [""])[0], main)()
