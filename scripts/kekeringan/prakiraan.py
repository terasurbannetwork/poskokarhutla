"""Prakiraan kekeringan 1-3 bulan "Deteksi Pantau Bencana" -> public/data/kekeringan_prakiraan.json + cache data/raw/kekeringan/musiman.json

Sumber utama: ensemble musiman ECMWF SEAS5 (51 anggota) lewat https://seasonal-api.open-meteo.com/v1/seasonal, terbit bulanan.
Cadangan (sel tanpa data SEAS5, atau SEAS5 mati): prospek bersyarat fase ENSO dari tahun-tahun sefase 1991-2025 (label "enso" di medan `sumber`).

Cara hitung (untuk halaman Metode):
  - Titik SEAS5 2 derajat (hemat kuota; resolusi asli SEAS5 ~36 km dan keterampilan ensemble memang di skala besar). Tiap sel 0,5 derajat
    memakai titik 2 derajat tempat ia berada (peta `anak`). SPI dihitung DI TITIK dengan klimatologi POWER titik itu sendiri (bukan hujan mentah
    dipindah ke sel lain), jadi bias skala titik tidak ikut bocor ke sel tetangga.
  - Hujan harian anggota: SEAS5 dari hari terbit; hari sebelumnya dari harian.json (Open-Meteo); bulan yang sudah terisi POWER memakai POWER.
    SPI-1 dan SPI-3 per anggota untuk bulan +1, +2, +3 (bulan kalender sesudah bulan terbit), gamma baku 1991-2020 sama dengan spi.py.
  - Tidak ada koreksi bias: hindcast SEAS5 tidak tersedia lewat Open-Meteo. Rasio hujan rerata anggota terhadap klimatologi POWER dilaporkan di `bias`.
  - Peluang HTH >= 31 dan >= 61 hari dalam 90 hari ke depan: per anggota dari hujan harian (hari hujan >= 1 mm), mulai dari HTH kemarin, dihitung bila
    deret kering mencapai ambang kapan pun dalam 90 hari. Hujan harian model cenderung gerimis (terlalu banyak hari basah), jadi peluang HTH cenderung rendah.
  - Kelembapan tanah musiman: variabel soil_moisture_0_to_10cm_mean ada di daftar API tetapi seluruh nilainya kosong (dicek 18 Okt 2026): tidak dipakai.

Kuota (bobot = lokasi x max(1, jumlah deret/10 x hari/14); jumlah deret = 51 anggota per variabel, hitungan PESIMIS karena Open-Meteo tidak
membuka bobot sebenarnya): hujan 51 deret x 150 hari = 54,6 per titik; ET0 pada titik 4 derajat dengan bobot sama. Panggilan seasonal berjalan
~1 dtk per titik. Cache dipakai ulang 7 hari; bila terputus kuota, lari berikutnya melanjutkan titik yang kurang.

Bentuk musiman.json: {"dibuat","terbit","tgl":[ISO],"lengkap":bool,"titik":{"lat,lon":{"p":[[51 anggota] per hari],"et0":[rerata anggota per hari]}},"anak":{"sel":"titik"},"bobot"}

Pakai:  python3 scripts/kekeringan/prakiraan.py      |  python3 scripts/kekeringan/prakiraan.py uji
"""
import calendar, datetime as dt, json, math, os, statistics, sys, time

AB = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AB)
sys.path.insert(1, os.path.join(AB, "..", "banjir"))
from umum import KuotaHabis, ambil, baca, simpan
import hth as H
import spi as SPI

UA = H.UA
URL = ("https://seasonal-api.open-meteo.com/v1/seasonal?latitude={lat}&longitude={lon}&daily={var}"
       "&forecast_days={hari}&timezone=Asia%2FJakarta")
HARI_FC = 152            # diminta; 2 hari terakhir kosong dari API dan dibuang -> ~150 hari
BATCH = 10
UMUR_CACHE_HARI = 7
KUOTA_LARI = 4500        # bobot pesimis maksimal per lari (batas Open-Meteo 5.000/jam)
DERAJAT_P, DERAJAT_ET0 = 2.0, 4.0
ANGGOTA = 51
AMBANG_SPI = (-1.0, -1.5, -2.0)
JENDELA_HTH = 90
LEAD = 3
URL_ONI = "https://www.cpc.ncep.noaa.gov/data/indices/oni.ascii.txt"
MUSIM = ["DJF", "JFM", "FMA", "MAM", "AMJ", "MJJ", "JJA", "JAS", "ASO", "SON", "OND", "NDJ"]


# ---------- kisi & unduh ----------

def pilih_titik(sel_kunci, derajat):
    """Blok `derajat` -> sel wakil (sel terdekat ke pusat massa blok). Mengembalikan ({titik: [anak]}, {anak: titik})."""
    blok = {}
    for k in sel_kunci:
        a, o = (float(x) for x in k.split(","))
        blok.setdefault((math.floor(a / derajat), math.floor(o / derajat)), []).append((a, o, k))
    titik, anak = {}, {}
    for v in blok.values():
        ca, co = sum(x[0] for x in v) / len(v), sum(x[1] for x in v) / len(v)
        wakil = min(v, key=lambda x: ((x[0] - ca) ** 2 + (x[1] - co) ** 2, x[2]))[2]
        titik[wakil] = [x[2] for x in v]
        for x in v:
            anak[x[2]] = wakil
    return titik, anak


def _anggota(d, var):
    """Daftar deret `var` (tanpa sufiks = anggota kontrol + `_memberNN`) dari blok daily; tepat ANGGOTA deret."""
    ks = [var] + [f"{var}_member{i:02d}" for i in range(1, ANGGOTA)]
    if any(k not in d for k in ks):
        raise ValueError(f"{var}: bukan {ANGGOTA} anggota")
    if not all(len(d[k]) == len(d["time"]) for k in ks):
        raise ValueError(f"{var}: panjang deret tidak sama dengan tanggal")
    return [d[k] for k in ks]


def parse_musiman(resp, n, var):
    """Respons seasonal -> (tgl, [matriks [hari][anggota] per lokasi]) setelah membuang hari ujung yang kosong."""
    resp = resp if isinstance(resp, list) else [resp]
    if len(resp) != n:
        raise ValueError(f"seasonal mengembalikan {len(resp)} lokasi, diminta {n}")
    tgl = resp[0]["daily"]["time"]
    deret = []
    for r in resp:
        if r["daily"]["time"] != tgl:
            raise ValueError("tanggal antar-lokasi tidak sama")
        deret.append(_anggota(r["daily"], var))
    ujung = len(tgl)
    while ujung > 0 and any(any(a[ujung - 1] is None for a in m) for m in deret):
        ujung -= 1
    if ujung < 100:
        raise ValueError(f"hanya {ujung} hari bebas-kosong, butuh >= 100")
    for m in deret:
        for a in m:
            if any(v is None for v in a[:ujung]):
                raise ValueError("nilai kosong di tengah deret")
    return tgl[:ujung], [[[round(max(0.0, m[j][i]), 1) for j in range(ANGGOTA)] for i in range(ujung)] for m in deret]   # nilai -0,1 mm dibulatkan ke 0


def bobot_panggilan(n, hari):
    return n * max(1.0, ANGGOTA / 10 * hari / 14)


def unduh_musiman(sel_kunci, lama=None, sekarang=None, ambil_fn=ambil, jeda=1.0, simpan_fn=None):
    """Isi/lanjutkan `lama` (cache) sampai lengkap atau KUOTA_LARI. Mengembalikan cache (dict)."""
    titik, anak = pilih_titik(sel_kunci, DERAJAT_P)
    t_et, _ = pilih_titik(list(titik), DERAJAT_ET0)
    et_anak = pilih_titik(list(titik), DERAJAT_ET0)[1]
    c = lama if lama else {"dibuat": None, "terbit": None, "tgl": None, "lengkap": False, "titik": {}, "et0_blok": {}, "anak": anak, "bobot": 0}
    c["anak"] = anak
    c.setdefault("et0_blok", {})
    pakai = 0.0

    def ambil_var(kunci, var):
        nonlocal pakai
        lat = ",".join(k.split(",")[0] for k in kunci)
        lon = ",".join(k.split(",")[1] for k in kunci)
        r = ambil_fn(URL.format(lat=lat, lon=lon, var=var, hari=HARI_FC), coba=3, batas_waktu=180, kepala=UA)
        pakai += bobot_panggilan(len(kunci), HARI_FC)
        c["bobot"] = round(c.get("bobot", 0) + bobot_panggilan(len(kunci), HARI_FC))
        return parse_musiman(r, len(kunci), var)

    def tahap(daftar, var, taruh):
        for i in range(0, len(daftar), BATCH):
            ch = daftar[i:i + BATCH]
            if pakai + bobot_panggilan(len(ch), HARI_FC) > KUOTA_LARI:
                print(f"  musiman: berhenti di bobot {pakai:.0f} (batas lari {KUOTA_LARI}); lanjut lari berikutnya", file=sys.stderr)
                return False
            tgl, mat = ambil_var(ch, var)
            if c["tgl"] is not None and tgl[:len(c["tgl"])] != c["tgl"][:len(tgl)]:
                raise ValueError("tanggal batch baru beda dari cache sebagian")
            if c["tgl"] is None or len(tgl) < len(c["tgl"]):
                c["tgl"] = tgl
                c["terbit"] = tgl[0]
            for k, m in zip(ch, mat):
                taruh(k, m)
            if simpan_fn:
                simpan_fn(c)
            print(f"  musiman {var} {i + len(ch)}/{len(daftar)} bobot {pakai:.0f}", file=sys.stderr)
            if jeda:
                time.sleep(jeda)
        return True

    ok = tahap([k for k in titik if k not in c["titik"]], "precipitation_sum", lambda k, m: c["titik"].__setitem__(k, {"p": m, "et0": None}))
    ok = ok and tahap([k for k in t_et if k not in c["et0_blok"]], "et0_fao_evapotranspiration",
                      lambda k, m: c["et0_blok"].__setitem__(k, [round(sum(h) / len(h), 2) for h in m]))
    if ok:   # ET0 blok 4 derajat dipasang ke titik 2 derajat di dalamnya
        n = len(c["tgl"])
        for k, v in c["titik"].items():
            e = c["et0_blok"][et_anak[k]]
            v["et0"] = (e + [e[-1]] * n)[:n]
            v["p"] = v["p"][:n]
    c["lengkap"] = bool(ok)
    return c


def muat_musiman(sel_kunci, sekarang=None, paksa=False, ambil_fn=ambil):
    """Cache <= UMUR_CACHE_HARI dan lengkap: dipakai. Cache sebagian yang masih segar: dilanjutkan. Selain itu unduh ulang dari nol."""
    sekarang = sekarang or dt.datetime.now(H.WIB)
    stempel = sekarang.isoformat(timespec="minutes")
    jalur = os.path.join(H.DIR_MENTAH, "musiman.json")
    c = baca(jalur)
    if c and not paksa and c.get("dibuat") and (sekarang - dt.datetime.fromisoformat(c["dibuat"])).days <= UMUR_CACHE_HARI:
        if c.get("lengkap") and all(k in c["anak"] for k in sel_kunci):
            return c
    else:
        c = None
    try:
        c = unduh_musiman(sel_kunci, c, sekarang, ambil_fn, simpan_fn=lambda x: simpan(jalur, {**x, "dibuat": x.get("dibuat") or stempel}))
        c["dibuat"] = c.get("dibuat") or stempel
    except KuotaHabis as e:
        print(f"::warning title=prakiraan::kuota Open-Meteo habis ({str(e)[:80]}); memakai cache sebagian bila ada", file=sys.stderr)
        return baca(jalur)
    simpan(jalur, c)
    return c


# ---------- SPI per anggota ----------

def fit_gamma(baku):
    """Persis spi.spi_nilai tetapi mengembalikan parameter (q, alfa, beta) agar tidak dihitung ulang per anggota; None bila SPI tak bermakna."""
    pos = [v for v in baku if v > 0]
    if len(baku) < 20 or len(pos) < 10:
        return None
    q = 1 - len(pos) / len(baku)
    rata = sum(pos) / len(pos)
    if rata * len(pos) / len(baku) < SPI.MIN_RATA:
        return None
    A = math.log(rata) - sum(math.log(v) for v in pos) / len(pos)
    if A <= 0:
        return None
    alfa = (1 + math.sqrt(1 + 4 * A / 3)) / (4 * A)
    return q, alfa, rata / alfa


_N = statistics.NormalDist()


def spi_dari_fit(x, f):
    q, alfa, beta = f
    h = q + (1 - q) * SPI.gamma_p(alfa, x / beta) if x > 0 else q
    return _N.inv_cdf(min(max(h, 1e-6), 1 - 1e-6))


def geser_bulan(y, m, n):
    t = y * 12 + (m - 1) + n
    return t // 12, t % 12 + 1


def total_bulan(pow_, gab, y, m):
    """Hujan total bulan (mm): POWER bila ada, selain itu jumlah harian bila SEMUA hari ada, selain itu None."""
    nh = calendar.monthrange(y, m)[1]
    v = pow_.get(f"{y}{m:02d}")
    if v is not None:
        return v * nh
    s = 0.0
    for d in range(1, nh + 1):
        x = gab.get(dt.date(y, m, d))
        if x is None:
            return None
        s += x
    return s


def hth_ke_depan(p_hari, n0):
    """Deret kering terpanjang dalam p_hari (JENDELA_HTH hari pertama) bila deret kemarin sepanjang n0 hari berlanjut."""
    n = n0
    mx = n0
    for v in p_hari[:JENDELA_HTH]:
        n = n + 1 if v < H.AMBANG_MM else 0
        mx = max(mx, n)
    return mx


def kuantil(a, q):
    a = sorted(a)
    i = q * (len(a) - 1)
    lo = math.floor(i)
    hi = min(lo + 1, len(a) - 1)
    return a[lo] + (a[hi] - a[lo]) * (i - lo)


def base_klim(f):
    """Peluang klimatologi (%) SPI-3 <= tiap AMBANG_SPI, persis dari gamma baku `f`=(q, alfa, beta): SPI <= th setara peluang kumulatif <= Phi(th).
    Massa bulan-nol-hujan q: bila q > Phi(th), SPI terendah (Phi^-1(q)) sudah di atas th sehingga peluangnya 0. Biasanya ~15,9% untuk -1."""
    q = f[0]
    return [round(100 * _N.cdf(th), 1) if q <= _N.cdf(th) else 0.0 for th in AMBANG_SPI]


def ringkas_titik(pow_, obs, tgl_fc, p_fc, terbit, n0, lead=LEAD):
    """Satu titik: pow_ = {'YYYYMM': mm/hari}, obs = {date: mm} sebelum terbit, tgl_fc = [date], p_fc = [hari][anggota].

    Mengembalikan {'bulan': [YYYY-MM...], 'lead': [[spi3 med, p10, p90, %<=-1, %<=-1,5, %<=-2, spi1 med, p10, p90]*lead], 'p31','p61' (%), 'rasio': [..]}
    atau None bila data tak cukup (SPI tak bermakna di iklim kering, bulan tak lengkap).
    """
    ym = SPI.bulan_terakhir({"x": pow_}) if pow_ else None
    if not ym:
        return None
    ya, ma = geser_bulan(terbit.year, terbit.month, 1)
    n = len(p_fc[0])
    out, rasio, bln, base = [], [], [], []
    anggota_gab = []
    for j in range(n):
        g = dict(obs)
        for i, t in enumerate(tgl_fc):
            g[t] = max(0.0, p_fc[i][j])   # SEAS5 kadang -0,1 mm
        anggota_gab.append(g)
    for L in range(lead):
        y, m = geser_bulan(ya, ma, L)
        f1 = fit_gamma([b for b in (SPI.jumlah(pow_, t, m, 1) for t in range(SPI.DASAR[0], SPI.DASAR[1] + 1)) if b is not None])
        f3 = fit_gamma([b for b in (SPI.jumlah(pow_, t, m, 3) for t in range(SPI.DASAR[0], SPI.DASAR[1] + 1)) if b is not None])
        s1, s3, tot = [], [], []
        for g in anggota_gab:
            ts = []
            for k in range(3):
                yy, mm = geser_bulan(y, m, -k)
                ts.append(total_bulan(pow_, g, yy, mm))
            if ts[0] is None:
                continue
            tot.append(ts[0])
            if f1 and ts[0] is not None:
                s1.append(spi_dari_fit(ts[0], f1))
            if f3 and None not in ts:
                s3.append(spi_dari_fit(sum(ts), f3))
        if len(s3) < ANGGOTA * .8 or len(s1) < ANGGOTA * .8:
            return None
        klim = [pow_.get(f"{t}{m:02d}") for t in range(SPI.DASAR[0], SPI.DASAR[1] + 1)]
        klim = [v for v in klim if v is not None]
        rasio.append(round(sum(tot) / len(tot) / (sum(klim) / len(klim) * calendar.monthrange(y, m)[1]), 2) if klim and sum(klim) > 0 else None)
        base.append(base_klim(f3))
        pct = lambda a, th: round(100 * sum(1 for v in a if v <= th) / len(a))
        out.append([round(statistics.median(s3), 2), round(kuantil(s3, .1), 2), round(kuantil(s3, .9), 2)] + [pct(s3, th) for th in AMBANG_SPI]
                   + [round(statistics.median(s1), 2), round(kuantil(s1, .1), 2), round(kuantil(s1, .9), 2)])
        bln.append(f"{y}-{m:02d}")
    mxs = [hth_ke_depan([p_fc[i][j] for i in range(min(JENDELA_HTH, len(p_fc)))], n0) for j in range(ANGGOTA)]
    return {"bulan": bln, "lead": out, "p31": round(100 * sum(1 for v in mxs if v >= 31) / ANGGOTA), "p61": round(100 * sum(1 for v in mxs if v >= 61) / ANGGOTA), "rasio": rasio, "base": base}


# ---------- cadangan bersyarat ENSO ----------

def baca_oni_cpc(teks):
    """oni.ascii.txt ('SEAS YR TOTAL ANOM') -> {(musim, tahun): anom}. Baris cacat dilewati; kosong total -> ValueError."""
    out = {}
    for ln in teks.splitlines():
        p = ln.split()
        if len(p) == 4 and p[0] in MUSIM and p[1].isdigit():
            try:
                out[(p[0], int(p[1]))] = float(p[3])
            except ValueError:
                pass
    if len(out) < 100:
        raise ValueError(f"ONI CPC hanya {len(out)} baris terbaca")
    return out


def muat_oni(iklim):
    """{(musim, tahun): ONI}: CPC bila terjangkau (cache), jatuh ke iklim.json (mulai 1997)."""
    jalur = os.path.join(H.DIR_MENTAH, "oni.json")
    c = baca(jalur)
    if c:
        return {(a, int(b)): v for a, b, v in c}
    try:
        import urllib.request
        teks = urllib.request.urlopen(urllib.request.Request(URL_ONI, headers=UA), timeout=60).read().decode()
        o = baca_oni_cpc(teks)
        simpan(jalur, [[a, b, v] for (a, b), v in o.items()])
        return o
    except Exception as e:
        print(f"::warning title=oni::ONI CPC gagal ({e}); memakai iklim.json (mulai 1997)", file=sys.stderr)
        return {(r["musim"], r["tahun"]): r["nilai"] for r in iklim.get("oni", [])}


def fase(oni):
    return None if oni is None else "el_nino" if oni >= .5 else "la_nina" if oni <= -.5 else "netral"


def prospek_bersyarat(nilai, fase_th, tahun, prior=2.0, minimal=15):
    """Peluang nilai <= tiap AMBANG_SPI untuk `tahun` dari tahun-tahun LAIN (tinggal-satu-tahun) sefase, dihaluskan ke frekuensi klimatologi
    dengan bobot `prior` tahun semu. Mengembalikan (peluang per ambang, peluang klimatologi per ambang, n sefase) atau None."""
    lain = [y for y, v in nilai.items() if y != tahun and v is not None]
    if len(lain) < minimal or fase_th.get(tahun) is None:
        return None
    sf = [y for y in lain if fase_th.get(y) == fase_th[tahun]]
    pk = [sum(1 for y in lain if nilai[y] <= th) / len(lain) for th in AMBANG_SPI]
    p = [(sum(1 for y in sf if nilai[y] <= th) + prior * c) / (len(sf) + prior) for th, c in zip(AMBANG_SPI, pk)]
    return p, pk, len(sf)


def spi3_per_tahun(pow_, bulan_akhir, tahun_awal=1991, tahun_akhir=2025, geser=0):
    """{tahun asal: SPI-3 jendela berakhir bulan_akhir (tahun asal + geser)}; None bila POWER belum ada."""
    return {y: SPI.spi_seri(pow_, y + geser, bulan_akhir, 3) for y in range(tahun_awal, tahun_akhir + 1)}


def cadangan_sel(pow_, oni, musim_prediktor, tahun, bulan_terbit):
    """Prospek bersyarat ENSO untuk satu sel: list per lead [peluang% <=-1, <=-1,5, <=-2, lalu baseline klimatologi % ketiganya] atau None. Prediktor = ONI `musim_prediktor` tiap tahun."""
    fase_th = {y: fase(oni.get((musim_prediktor, y))) for y in range(1991, tahun + 1)}
    ya, ma = geser_bulan(tahun, bulan_terbit, 1)
    hasil = []
    for L in range(LEAD):
        y, m = geser_bulan(ya, ma, L)
        nilai = {t: SPI.spi_seri(pow_, t + (y - tahun), m, 3) for t in range(1991, 2026)}
        r = prospek_bersyarat(nilai, fase_th, tahun)
        if r is None:
            return None
        hasil.append([round(100 * x) for x in r[0]] + [round(100 * x, 1) for x in r[1]])
    return hasil


# ---------- rakit ----------

def bangun(pow_sel, harian, musiman, iklim, oni, penduduk, pusat, sekarang):
    """Murni: semua masukan sudah di memori. Mengembalikan isi kekeringan_prakiraan.json."""
    H.validasi_harian(harian)
    tgl_h = harian["tgl"]
    t_kemarin = tgl_h.index(harian["hari_ini"]) - 1
    hari_ini = dt.date.fromisoformat(harian["hari_ini"])
    obs_tgl = [dt.date.fromisoformat(t) for t in tgl_h[:t_kemarin + 1]]
    sel_kunci = list(harian["sel"])
    peta = H.peta_kec(penduduk, pusat, sel_kunci)
    kode = H.kode_kab(penduduk)
    titik_hasil, anak = {}, {}
    if musiman:
        terbit = dt.date.fromisoformat(musiman["terbit"])
        tgl_fc = [dt.date.fromisoformat(t) for t in musiman["tgl"]]
        for k, v in musiman["titik"].items():
            if v.get("p") is None or k not in pow_sel or k not in harian["sel"]:
                continue
            obs = {d: x for d, x in zip(obs_tgl, harian["sel"][k]["p"][:t_kemarin + 1]) if x is not None and d < terbit}
            r = ringkas_titik(pow_sel[k], obs, tgl_fc, v["p"], terbit, H.hth(harian["sel"][k]["p"], t_kemarin) or 0)
            if r:
                titik_hasil[k] = r
        anak = {c: t for c, t in musiman["anak"].items() if t in titik_hasil}
    bulan = next(iter(titik_hasil.values()))["bulan"] if titik_hasil else None
    ya, ma = geser_bulan(hari_ini.year, hari_ini.month, 1)
    if bulan is None:
        bulan = ["%d-%02d" % geser_bulan(ya, ma, L) for L in range(LEAD)]
    # cadangan ENSO untuk sel tanpa titik SEAS5
    mus_pred = (iklim.get("oni_terakhir") or {}).get("musim")
    cad = {}
    if mus_pred:
        for k in sel_kunci:
            if k in anak or k not in pow_sel:
                continue
            r = cadangan_sel(pow_sel[k], oni, mus_pred, hari_ini.year, hari_ini.month)
            if r:
                cad[k] = r
    # agregat berbobot penduduk: vektor per sel = [pk1,pk15,pk2,spi3med,spi1med,b1,b15,b2]*LEAD + [p31,p61]
    ST = 8

    def vek(k):
        t = anak.get(k)
        if t:
            r = titik_hasil[t]
            return [x for l, b in zip(r["lead"], r["base"]) for x in (l[3], l[4], l[5], l[0], l[6], *b)] + [r["p31"], r["p61"]]
        if k in cad:
            return [x for l in cad[k] for x in (l[0], l[1], l[2], None, None, l[3], l[4], l[5])] + [None, None]
        return None

    def ratakan(daftar):
        """daftar [(jiwa, vek)] -> vektor rerata berbobot per posisi (None bila tak ada)."""
        if not daftar:
            return None
        out = []
        for i in range(len(daftar[0][1])):
            s = [(w, v[i]) for w, v in daftar if v[i] is not None]
            out.append(round(sum(w * x for w, x in s) / sum(w for w, _ in s), 2) if s and sum(w for w, _ in s) else None)
        return out

    def bentuk(v, total, ids=None):
        lead = []
        for i in range(LEAD):
            o = {"pk1": v[i * ST], "pk15": v[i * ST + 1], "pk2": v[i * ST + 2], "spi3": v[i * ST + 3], "spi1": v[i * ST + 4],
                 "b1": v[i * ST + 5], "b15": v[i * ST + 6], "b2": v[i * ST + 7]}
            for d, a, b in (("d1", "pk1", "b1"), ("d15", "pk15", "b15"), ("d2", "pk2", "b2")):
                o[d] = None if o[a] is None or o[b] is None else round(o[a] - o[b], 1)
            lead.append(o)
        r = {"total": total, "lead": lead, "p31": v[LEAD * ST], "p61": v[LEAD * ST + 1]}
        if ids is not None:
            r["satu_titik"] = len(ids) <= 1     # hanya diwakili satu titik 2 derajat: layar sebaiknya menyembunyikannya
        return r
    per_kab, per_prov, semua, id_kab, id_prov = {}, {}, [], {}, {}
    for prov, kab, jiwa, k in peta:
        v = vek(k)
        if v is None:
            continue
        per_kab.setdefault(kab, []).append((jiwa, v))
        per_prov.setdefault(prov, []).append((jiwa, v))
        semua.append((jiwa, v))
        ident = anak.get(k) or "cad:" + k
        id_kab.setdefault(kab, set()).add(ident)
        id_prov.setdefault(prov, set()).add(ident)
    tot = lambda d: sum(w for w, _ in d)
    kab = {k: {"kode": kode.get(k), **bentuk(ratakan(d), tot(d), id_kab[k])} for k, d in per_kab.items()}
    prov = {k: bentuk(ratakan(d), tot(d), id_prov[k]) for k, d in per_prov.items()}
    nas = bentuk(ratakan(semua), tot(semua)) if semua else None
    if nas:   # jiwa dengan peluang SPI-3 <= -1 minimal 50% pada bulan +1..+3
        nas["jiwa_pk1_50"] = [sum(w for w, v in semua if v[i * ST] is not None and v[i * ST] >= 50) for i in range(LEAD)]
    rasio = [statistics.median([r["rasio"][i] for r in titik_hasil.values() if r["rasio"][i] is not None]) if any(r["rasio"][i] is not None for r in titik_hasil.values()) else None for i in range(LEAD)] if titik_hasil else None
    enso = {"status": iklim.get("status"), "cpc": iklim.get("cpc_status"), "oni": (iklim.get("oni_terakhir") or {}).get("nilai"),
            "musim": mus_pred, "iod": iklim.get("iod_status"), "dmi": iklim.get("dmi_8_minggu")}
    return {"dibuat": sekarang.isoformat(timespec="minutes"), "label": "Deteksi Pantau Bencana", "terbit": musiman["terbit"] if musiman else None,
            "sumber": ("ECMWF SEAS5 (51 anggota) lewat Open-Meteo, bulan +1 sampai +3" if titik_hasil else "Prospek bersyarat fase ENSO 1991-2025 (cadangan)"),
            "bulan": bulan, "enso": enso, "tanah_musiman": {"ada": False, "alasan": "variabel soil_moisture_0_to_10cm_mean ada di daftar API seasonal tetapi nilainya kosong semua (dicek 18 Okt 2026)"},
            "bias": {"rasio_hujan_klim": rasio, "label": label_bias(rasio),
                     "catatan": "rasio median hujan rerata anggota terhadap klimatologi POWER 1991-2020 per bulan; tidak dikoreksi karena rasio memuat sinyal ENSO dan hindcast tidak ada"},
            "baseline": "b1/b15/b2 = peluang klimatologi (%) SPI-3 <= -1 / -1,5 / -2 yang dihitung persis dari gamma baku 1991-2020 (sekitar 15,9% / 6,7% / 2,3% bila tanpa bulan nol hujan); "
                        "d1/d15/d2 = peluang prakiraan dikurangi baseline (poin persentase). Bacalah selisihnya, bukan peluang mentah.",
            "catatan": "Belum diuji balik: hindcast SEAS5 tidak tersedia lewat Open-Meteo, dan peluang tidak dikoreksi bias. "
                       "SPI bulan +1 mencampur hujan Open-Meteo (hari sebelum terbit) dengan POWER (bulan lengkap) dan ensemble. "
                       "Hujan harian model cenderung gerimis sehingga peluang HTH condong rendah. Sel memakai titik 2 derajat tempat ia berada; "
                       "wilayah bertanda satu_titik hanya diwakili satu titik dan sebaiknya tidak ditampilkan.",
            "kolom_lead": ["spi3_median", "spi3_p10", "spi3_p90", "pk1_pct", "pk15_pct", "pk2_pct", "spi1_median", "spi1_p10", "spi1_p90"],
            "titik": [[float(k.split(",")[0]), float(k.split(",")[1]), r["lead"], r["p31"], r["p61"], r["base"]] for k, r in sorted(titik_hasil.items())],
            "anak": {c: i for c, i in ((c, sorted(titik_hasil).index(t)) for c, t in sorted(anak.items()))},
            "cadangan": {k: v for k, v in sorted(cad.items())},
            "nasional": nas, "prov": prov, "kab": kab}


def label_bias(rasio):
    """Kalimat label bias dari rasio median hujan anggota/klimatologi per bulan (bulan +2/+3 bila ada)."""
    nilai = [r for r in (rasio or [])[1:3] if r is not None]
    if not nilai:
        return "belum diuji balik; bias hujan anggota tidak dapat diukur"
    a, b = min(nilai), max(nilai)
    f = lambda x: f"{x:.2f}".replace(".", ",")
    if a > 1.05:
        return f"belum diuji balik; median hujan anggota {f(a)} sampai {f(b)} kali klimatologi di bulan +2/+3, kemungkinan meremehkan peluang kering"
    if b < 0.95:
        return f"belum diuji balik; median hujan anggota {f(a)} sampai {f(b)} kali klimatologi di bulan +2/+3, kemungkinan melebihkan peluang kering"
    return f"belum diuji balik; median hujan anggota {f(a)} sampai {f(b)} kali klimatologi di bulan +2/+3"


# ---------- catatan prospektif (append-only) ----------

JALUR_PROSPEKTIF = "kekeringan_prospektif.json"


def entri_prospektif(isi):
    """Satu terbit SEAS5: peluang per provinsi per bulan target [pk1, pk15, pk2, b1, b15, b2] x bulan, plus nasional."""
    f = lambda w: [[l["pk1"], l["pk15"], l["pk2"], l["b1"], l["b15"], l["b2"]] for l in w["lead"]]
    return {"dibuat": isi["dibuat"], "bulan": isi["bulan"], "sumber": isi["sumber"], "satu_titik": sorted(k for k, v in isi["prov"].items() if v.get("satu_titik")),
            "nasional": f(isi["nasional"]) if isi.get("nasional") else None, "prov": {k: f(v) for k, v in sorted(isi["prov"].items())}}


def periksa_prospektif(lama, baru):
    """Galat bila `baru` menghilangkan atau mengubah entri `lama` (berkas hanya boleh bertambah)."""
    g = []
    for bag in ("terbit", "hasil"):
        for k, v in (lama or {}).get(bag, {}).items():
            if k not in baru.get(bag, {}):
                g.append(f"{bag} {k} hilang")
            elif bag == "terbit" and baru[bag][k] != v:
                g.append(f"terbit {k} diubah")
            elif bag == "hasil":
                for b, hv in v.items():
                    if baru[bag][k].get(b) != hv:
                        g.append(f"hasil {k}/{b} hilang atau diubah")
    return g


def catat_prospektif(isi, jalur):
    """Tambah entri terbit `isi['terbit']` bila belum ada (terbit pertama yang dinilai, jalan ulang tidak menimpa). Berkas rusak -> galat keras.
    Hanya untuk keluaran SEAS5 (bukan cadangan ENSO). True bila menulis."""
    if not isi.get("terbit") or not isi.get("nasional"):
        return False
    lama = baca(jalur, {"versi": 1, "terbit": {}, "hasil": {}})
    if lama.get("versi") != 1 or not isinstance(lama.get("terbit"), dict):
        raise ValueError(f"{jalur}: bentuk berkas tidak dikenali; berhenti, tidak memulai log baru diam-diam")
    if isi["terbit"] in lama["terbit"] or not isi.get("lengkap"):
        return False
    baru = {**lama, "terbit": {**lama["terbit"], isi["terbit"]: entri_prospektif(isi)}}
    g = periksa_prospektif(lama, baru)
    if g:
        raise ValueError("; ".join(g))
    simpan(jalur, baru)
    return True


def nilai_prospektif(jalur, pow_sel, penduduk, pusat, sekarang):
    """Isi `hasil` untuk bulan target yang SPI-3 POWER-nya sudah ada: persen penduduk (sel terdekat) dengan SPI-3 <= -1 / -1,5 / -2 per provinsi dan nasional.
    Hanya menambah; hasil yang sudah ada tidak diubah. Mengembalikan jumlah (terbit, bulan) yang baru dinilai."""
    log = baca(jalur)
    if not log or not log.get("terbit"):
        return 0
    ym = SPI.bulan_terakhir(pow_sel)
    if not ym:
        return 0
    peta = H.peta_kec(penduduk, pusat, pow_sel)
    baru = {**log, "hasil": {k: {b: dict(v) for b, v in d.items()} for k, d in log.get("hasil", {}).items()}}
    n = 0
    for terbit, e in log["terbit"].items():
        for b in e["bulan"]:
            y, m = int(b[:4]), int(b[5:])
            if (y, m) > ym or b in baru["hasil"].get(terbit, {}):
                continue
            per, nas = {}, [0.0, 0.0, 0.0, 0]
            spi_sel = {k: SPI.spi_seri(pow_sel[k], y, m, 3) for k in pow_sel}
            for prov, _, jiwa, k in peta:
                s = spi_sel.get(k)
                if s is None:
                    continue
                for w in (nas, per.setdefault(prov, [0.0, 0.0, 0.0, 0])):
                    for i, th in enumerate(AMBANG_SPI):
                        w[i] += jiwa if s <= th else 0
                    w[3] += jiwa
            if not nas[3]:
                continue
            pct = lambda w: [round(100 * w[i] / w[3], 1) for i in range(3)]
            baru["hasil"].setdefault(terbit, {})[b] = {"dinilai": sekarang.isoformat(timespec="minutes"), "spi_bulan_terakhir": f"{ym[0]}-{ym[1]:02d}",
                                                         "nasional": pct(nas), "prov": {k: pct(w) for k, w in sorted(per.items())}}
            n += 1
    if n:
        g = periksa_prospektif(log, baru)
        if g:
            raise ValueError("; ".join(g))
        simpan(jalur, baru)
    return n


def main():
    t0 = time.time()
    sekarang = dt.datetime.now(H.WIB)
    jalur_out = os.path.join(H.DIR_DATA, "kekeringan_prakiraan.json")
    ada = baca(jalur_out)
    lokal = baca(os.path.join(H.DIR_MENTAH, "musiman.json"))
    if H.lewati(ada, sekarang, UMUR_CACHE_HARI, lokal and lokal.get("dibuat")):
        print(f"prakiraan: kekeringan_prakiraan.json berumur {H.umur_hari(ada, sekarang):.1f} hari dan lengkap; dilewati", file=sys.stderr)
        return
    r = lambda f: json.load(open(os.path.join(H.DIR_DATA, f)))
    tanah, penduduk, iklim = r("tanah.json"), r("penduduk.json"), r("iklim.json")
    pusat = json.load(open(os.path.join(H.AKAR, "public/banjir/data/pusat_kec.json")))
    kunci = [f"{g['lat']},{g['lon']}" for g in tanah["grid"]]
    harian = H.muat_harian(kunci)
    musiman = muat_musiman(kunci)
    pow_sel = SPI.hujan_bulanan([tuple(float(x) for x in k.split(",")) for k in kunci], dt.datetime.now(H.WIB).date())
    isi = bangun(pow_sel, harian, musiman, iklim, muat_oni(iklim), penduduk, pusat, dt.datetime.now(H.WIB))
    isi["lengkap"] = bool(musiman and musiman.get("lengkap"))
    if not H.boleh_timpa(ada, isi["lengkap"]):
        print("::warning title=prakiraan::musiman baru sebagian (kuota); keluaran publik yang lengkap dipertahankan", file=sys.stderr)
        return
    simpan(jalur_out, isi)
    jp = os.path.join(H.DIR_DATA, JALUR_PROSPEKTIF)
    if catat_prospektif(isi, jp):
        print(f"prospektif: terbit {isi['terbit']} dicatat", file=sys.stderr)
    nv = nilai_prospektif(jp, pow_sel, penduduk, pusat, dt.datetime.now(H.WIB))
    if nv:
        print(f"prospektif: {nv} bulan target dinilai", file=sys.stderr)
    n = isi["nasional"]
    print(f"prakiraan: {len(isi['titik'])} titik SEAS5, {len(isi['cadangan'])} sel cadangan ENSO; nasional pk1 {n and [l['pk1'] for l in n['lead']]}; "
          f"{time.time() - t0:.0f} dtk", file=sys.stderr)


def fixture_pow(skala=1.0, y_akhir=2026, m_akhir=8):
    return {f"{y}{m:02d}": (6.0 + (y % 7) * .4 + (m % 3)) * skala for y in range(1991, y_akhir + 1) for m in range(1, 13) if (y, m) <= (y_akhir, m_akhir)}


def uji():
    # fit_gamma == spi.spi_nilai
    kuant = lambda p: 25 * 4 * (1 - 1 / 36 + _N.inv_cdf(p) / 6) ** 3
    baku = [kuant((i + .5) / 30) for i in range(30)]
    f = fit_gamma(baku)
    for x in (0, 30, kuant(.5), kuant(.1), 400):
        assert abs(spi_dari_fit(x, f) - SPI.spi_nilai(x, baku)) < .006, x
    assert fit_gamma([0.5] * 30) is None and fit_gamma([1] * 5) is None
    # HTH ke depan
    assert hth_ke_depan([0] * 100, 0) == 90 and hth_ke_depan([5, 0, 0], 10) == 10 and hth_ke_depan([0, 0, 5, 0], 29) == 31
    # kuantil, bulan
    assert kuantil([1, 2, 3, 4, 5], .5) == 3 and kuantil([0, 10], .1) == 1 and geser_bulan(2026, 11, 2) == (2027, 1) and geser_bulan(2026, 1, -1) == (2025, 12)
    # pilih_titik: tiap sel punya tepat satu titik, wakil adalah salah satu sel anaknya
    sel = [f"{a},{o}" for a in (-2.25, -1.75, -0.25, 0.25) for o in (113.25, 113.75, 115.25)]
    tt, an = pilih_titik(sel, 2.0)
    assert set(an) == set(sel) and all(w in ch for w, ch in tt.items()) and sum(len(v) for v in tt.values()) == len(sel)
    # parse_musiman: 51 anggota wajib; hari ujung kosong dibuang
    def resp(n_ang=51, kosong_ujung=2, hari=120):
        d = {"time": [(dt.date(2026, 10, 18) + dt.timedelta(days=i)).isoformat() for i in range(hari)]}
        for k in ["precipitation_sum"] + [f"precipitation_sum_member{i:02d}" for i in range(1, n_ang)]:
            d[k] = [1.0] * (hari - kosong_ujung) + [None] * kosong_ujung
        return {"daily": d}
    tgl, mat = parse_musiman(resp(), 1, "precipitation_sum")
    assert len(tgl) == 118 and len(mat[0]) == 118 and len(mat[0][0]) == 51
    for jelek in (lambda: parse_musiman(resp(n_ang=50), 1, "precipitation_sum"), lambda: parse_musiman(resp(hari=60), 1, "precipitation_sum"),
                  lambda: parse_musiman([resp(), resp()], 1, "precipitation_sum")):
        try:
            jelek()
            raise SystemExit("parse_musiman harus menolak")
        except ValueError:
            pass
    assert abs(bobot_panggilan(10, 152) - 10 * 51 / 10 * 152 / 14) < 1e-9
    # ONI & fase
    o = baca_oni_cpc("\n".join(f" {MUSIM[i % 12]} {1950 + i // 12}  27.0  {(-1) ** i * .2:.2f}" for i in range(120)))
    assert len(o) == 120 and fase(.5) == "el_nino" and fase(-.5) == "la_nina" and fase(.49) == "netral" and fase(None) is None
    try:
        baca_oni_cpc("sampah")
        raise SystemExit("baca_oni_cpc harus menolak")
    except ValueError:
        pass
    # prospek bersyarat: El Nino selalu kering -> peluang tinggi; tahun diuji tidak ikut dihitung
    nilai = {y: (-1.6 if y % 2 == 0 else 0.3) for y in range(1991, 2026)}
    fs = {y: ("el_nino" if y % 2 == 0 else "netral") for y in range(1991, 2027)}
    p, pk, n = prospek_bersyarat(nilai, fs, 2026)
    assert p[0] > .85 and p[2] < .1 and abs(pk[0] - 17 / 35) < .02 and n == 17, (p, pk, n)
    p2, _, _ = prospek_bersyarat({**nilai, 2026: -9}, fs, 2026)
    assert p2 == p                                                            # tahun uji dikeluarkan
    assert prospek_bersyarat({y: -1 for y in range(1991, 2000)}, fs, 2026) is None and prospek_bersyarat(nilai, {}, 2026) is None
    # ringkas_titik end-to-end: hujan musiman mati (0 mm) -> SPI-3 sangat kering, peluang HTH >= 61 = 100%; hujan lebat -> basah
    pow_ = fixture_pow()
    terbit = dt.date(2026, 10, 18)
    obs = {dt.date(2026, 9, 1) + dt.timedelta(days=i): 5.0 for i in range(0, 47)}
    tgl_fc = [terbit + dt.timedelta(days=i) for i in range(150)]
    kering = ringkas_titik(pow_, obs, tgl_fc, [[0.0] * 51 for _ in range(150)], terbit, 3)
    basah = ringkas_titik(pow_, obs, tgl_fc, [[40.0] * 51 for _ in range(150)], terbit, 0)
    assert kering["bulan"] == ["2026-11", "2026-12", "2027-01"] and kering["lead"][2][3] == 100 and kering["lead"][0][0] < -2 and kering["p61"] == 100 and kering["p31"] == 100
    assert basah["lead"][0][0] > 2 and basah["lead"][0][3] == 0 and basah["p31"] == 0
    # bangun end-to-end kecil
    h = H.fixture()
    k1 = "0.25,0.25"
    mus = {"terbit": "2026-10-18", "tgl": [t.isoformat() for t in tgl_fc], "titik": {k1: {"p": [[0.0] * 51 for _ in range(150)], "et0": [4.0] * 150}}, "anak": {k1: k1, "0.25,1.25": k1}}
    pend = {"kec": {"11|Alfa|b": 3000, "11|Zeta|a": 1000}}
    pusat = {"11|Alfa|b": [.3, .3], "11|Zeta|a": [.3, 1.2]}
    pw = {k1: pow_, "0.25,1.25": pow_}
    iklim = {"status": "El Niño", "oni_terakhir": {"musim": "JAS", "nilai": 2.0}}
    isi = bangun(pw, h, mus, iklim, {}, pend, pusat, dt.datetime(2026, 10, 18, 7, tzinfo=H.WIB))
    assert isi["kab"]["11|Alfa"]["lead"][2]["pk1"] == 100 and isi["nasional"]["total"] == 4000 and isi["bulan"][0] == "2026-11" and isi["anak"] == {"0.25,0.25": 0, "0.25,1.25": 0}
    assert isi["tanah_musiman"]["ada"] is False and len(json.dumps(isi)) < 300_000
    now = dt.datetime(2026, 10, 18, 7, tzinfo=H.WIB)
    # baseline klimatologi: iklim basah -> sekitar Phi(-1)=15,87%; iklim dengan bulan nol hujan lebih sering daripada Phi(-1) -> 0
    assert base_klim((0.0, 4.0, 25.0)) == [15.9, 6.7, 2.3] and base_klim((0.2, 4.0, 25.0)) == [0.0, 0.0, 0.0] and base_klim((0.1, 4.0, 25.0)) == [15.9, 0.0, 0.0]
    assert abs(sum(1 for x in baku if spi_dari_fit(x, fit_gamma(baku)) <= -1) / len(baku) - .1587) < .06       # empiris di baku ~ baseline
    assert "meremehkan peluang kering" in label_bias([0.9, 1.11, 1.19]) and "1,11 sampai 1,19" in label_bias([0.9, 1.11, 1.19]) and "tidak dapat diukur" in label_bias(None)
    assert "melebihkan" in label_bias([1, 0.8, 0.9]) and "meremehkan" not in label_bias([1, 1.0, 1.0])
    assert isi["nasional"]["lead"][0]["b1"] == 15.9 and isi["nasional"]["lead"][0]["d1"] == round(100 - 15.9, 1) and isi["kab"]["11|Alfa"]["satu_titik"] is True
    assert "belum diuji balik" in isi["bias"]["label"] and "bulan +1 mencampur" in isi["catatan"]
    # catatan prospektif: append-only, terbit pertama tidak ditimpa, berkas rusak berhenti, penilai mengisi hasil dari POWER setelah bulan target lewat
    import tempfile
    with tempfile.TemporaryDirectory() as tmp:
        jp = os.path.join(tmp, JALUR_PROSPEKTIF)
        isi["lengkap"] = True
        assert catat_prospektif(isi, jp) is True and catat_prospektif(isi, jp) is False
        isi2 = {**isi, "terbit": "2026-11-18", "bulan": ["2026-12", "2027-01", "2027-02"]}
        assert catat_prospektif(isi2, jp) is True
        log = json.load(open(jp))
        assert sorted(log["terbit"]) == ["2026-10-18", "2026-11-18"] and log["terbit"]["2026-10-18"]["prov"]["11"][0][0] == 100 and log["terbit"]["2026-10-18"]["satu_titik"]
        assert catat_prospektif({**isi, "lengkap": False, "terbit": "2026-12-18"}, jp) is False            # separuh tidak dicatat
        assert periksa_prospektif(log, {"terbit": {}, "hasil": {}}) == ["terbit 2026-10-18 hilang", "terbit 2026-11-18 hilang"]
        assert periksa_prospektif(log, {"terbit": {**log["terbit"], "2026-10-18": {}}}) == ["terbit 2026-10-18 diubah"]
        # POWER fixture berakhir Agu 2026: bulan target Nov belum bisa dinilai
        assert nilai_prospektif(jp, pw, pend, pusat, now) == 0
        pw2 = {k: {**v, "202611": 0.1, "202610": 0.1, "202609": 0.1, "202608": 0.1} for k, v in pw.items()}
        assert nilai_prospektif(jp, pw2, pend, pusat, now) == 1                                           # hanya 2026-11 terlewati
        h1 = json.load(open(jp))["hasil"]["2026-10-18"]["2026-11"]
        assert h1["nasional"][0] == 100.0 and h1["prov"]["11"][0] == 100.0 and nilai_prospektif(jp, pw2, pend, pusat, now) == 0
        assert json.load(open(jp))["terbit"] == log["terbit"]
        open(jp, "w").write("{rusak")
        try:
            catat_prospektif({**isi, "terbit": "2027-01-01"}, jp)
            raise SystemExit("berkas prospektif rusak harus menghentikan")
        except ValueError:
            pass
    # penjaga: berkas segar+lengkap dilewati; basi, separuh, atau cache lokal lebih baru -> jalan; separuh tak menimpa lengkap
    now = dt.datetime(2026, 10, 18, 7, tzinfo=H.WIB)
    segar = {"dibuat": "2026-10-15T07:00+07:00", "lengkap": True}
    assert H.lewati(segar, now, 7) and not H.lewati({**segar, "dibuat": "2026-10-10T07:00+07:00"}, now, 7)
    assert not H.lewati({**segar, "lengkap": False}, now, 7) and not H.lewati({"dibuat": segar["dibuat"]}, now, 7) and not H.lewati(None, now, 7)
    assert not H.lewati(segar, now, 7, "2026-10-16T07:00+07:00") and H.lewati(segar, now, 7, "2026-10-14T07:00+07:00")
    assert not H.boleh_timpa(segar, False) and H.boleh_timpa(segar, True) and H.boleh_timpa({"lengkap": False}, False) and H.boleh_timpa(None, False)
    print("ok prakiraan")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main()
