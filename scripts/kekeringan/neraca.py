"""Data simulasi neraca air tanah (bak FAO-56) per sel 0,5 derajat -> public/data/kekeringan_neraca.json.

Python menyiapkan data; peramban (public/kekeringan/simulasi.js) menjalankan bak hari demi hari. Fungsi `langkah` di sini
HARUS memberi angka sama dengan `langkah` di simulasi.js (diuji di `uji`: kasus angka tangan + menjalankan JS lewat node).

Bak satu lapis, FAO Irrigation and Drainage Paper 56 (Allen dkk. 1998), Bab 8:
  TAW = 1000 (qFC - qWP) Zr (pers. 82);  RAW = p x TAW (pers. 83);
  Ks = (TAW - Dr) / ((1 - p) TAW) bila Dr > RAW, selain itu 1 (pers. 84);  ETa = Ks x Kc x ET0 (pers. 80/81)
  Dr' = Dr - (P - RO) - I - CR + ETa + DP (pers. 85), dipotong ke [0, TAW]: kelebihan hilang hari itu juga (Bab 8, "Limits on Dr")
  Di sini RO = CR = 0 dan DP hanya berupa pemotongan itu.

Dua titik mulai simulasi 180 hari:
  hariini : kondisi awal dari bak 92 hari (data/raw/kekeringan/harian.json) bila ada, selain itu dari kelembapan tanah
            7-28 cm (tanah.json); skenario ECMWF (musiman.json), El Nino kuat, Normal.
  kemarau : 1 Juni tahun ini, simpanan penuh (Dr = 0, kapasitas lapang di akhir musim hujan); El Nino kuat dan Normal.
Skenario iklim: NASA POWER bulanan (hujan PRECTOTCORR; ET0 Penman-Monteith FAO-56 dari T2M_MAX/MIN, RH2M, WS2M,
ALLSKY_SFC_SW_DWN; bila variabel itu tak ada untuk sel, jatuh ke Hargreaves-Samani dan dihitung di keluaran "et0_dari").

Pakai:  python3 scripts/kekeringan/neraca.py          (bangun keluaran; unduh NASA POWER bila cache belum ada)
        python3 scripts/kekeringan/neraca.py uji       (self-check tanpa jaringan)
"""
import datetime as dt, json, math, os, statistics, subprocess, sys, time
from concurrent.futures import ThreadPoolExecutor

AKAR = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "../.."))
sys.path.insert(0, os.path.join(AKAR, "scripts/banjir"))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from umum import ambil, baca, simpan

MENTAH = os.path.join(AKAR, "data/raw/kekeringan")
KELUAR = os.path.join(AKAR, "public/data/kekeringan_neraca.json")
IKLIM = os.path.join(AKAR, "scripts/kekeringan/iklim_neraca.json")   # dikomit: klimatologi dan tahun El Nino lampau tak berubah, jadi CI tak perlu ratusan panggilan POWER
UA = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"}
URL = ("https://power.larc.nasa.gov/api/temporal/monthly/point?parameters={par}&community=AG"
       "&longitude={lon}&latitude={lat}&start=1991&end=2025&format=JSON")
PAR_HUJAN_SUHU = "PRECTOTCORR,T2M_MAX,T2M_MIN"
PAR_PM = "RH2M,WS2M,ALLSKY_SFC_SW_DWN"

HARI = 180                 # panjang skenario
MINGGU = -(-HARI // 7)     # 26
BLOK = HARI // 30          # 6 blok ET0
# Konstanta bak: satu sumber di fao.py (dicocokkan ke teks FAO-56; yang bernama ASUMSI_* bukan dari FAO).
import fao
PAR = {"p": fao.P_PADI, "zr": fao.ZR_PADI, "fc": fao.FC_LEMPUNG, "wp": fao.WP_LEMPUNG, "aw_gambut": fao.ASUMSI_AW_GAMBUT,
       "kc": list(fao.KC_PADI), "fase": list(fao.FASE_PADI), "kc_bera": fao.ASUMSI_KC_BERA,
       "ambang_berat": fao.ASUMSI_AMBANG_BERAT, "intensitas": fao.ASUMSI_INTENSITAS,
       "taw": [fao.TAW_MINERAL, fao.TAW_GAMBUT]}
SUMBER_FAO = fao.SUMBER
TANAM_BAWAAN = {"hariini": 10, "kemarau": 30}   # hari sesudah mulai. ASUMSI: 28 Okt (awal tanam musim hujan) dan 1 Juli (tanam gadu); semua sel serentak, hanya bawaan, pengguna bisa menggesernya
NINO = (1997, 2015, 2023)          # tahun awal El Nino kuat: bulan di tahun mulai memakai tahun ini, bulan di tahun berikutnya memakai tahun +1


def langkah(dr, taw, p, kc, et0, hujan, irigasi=0.0):
    """Satu hari bak FAO-56. Mengembalikan (Dr baru, ETa, Ks). Ks dihitung dari Dr awal hari."""
    raw = p * taw
    ks = 1.0 if dr <= raw else max(0.0, (taw - dr) / (taw - raw))
    eta = ks * kc * et0
    baru = dr - hujan - irigasi + eta
    return min(max(baru, 0.0), taw), eta, ks


def kc_padi(umur, par=PAR):
    """Kc padi pada hari ke-`umur` sesudah tanam (kurva FAO-56 Bab 6: datar, naik linear, datar, turun linear); di luar musim = kc_bera."""
    a, b, c, d = par["fase"]
    k0, k1, k2 = par["kc"]
    if umur < 0 or umur >= a + b + c + d:
        return par["kc_bera"]
    if umur < a:
        return k0
    if umur < a + b:
        return k0 + (k1 - k0) * (umur - a) / b
    if umur < a + b + c:
        return k1
    return k1 + (k2 - k1) * (umur - a - b - c) / d


# ---------------------------------------------------------------- ET0
def ra_mj(lat, doy):
    """Radiasi ekstraterestrial harian (MJ m-2 hari-1), FAO-56 pers. 21."""
    f = math.radians(lat)
    dr = 1 + 0.033 * math.cos(2 * math.pi * doy / 365)
    de = 0.409 * math.sin(2 * math.pi * doy / 365 - 1.39)
    ws = math.acos(max(-1, min(1, -math.tan(f) * math.tan(de))))
    return 24 * 60 / math.pi * 0.0820 * dr * (ws * math.sin(f) * math.sin(de) + math.cos(f) * math.cos(de) * math.sin(ws))


def ra_mm(lat, doy):
    return 0.408 * ra_mj(lat, doy)


def es(t):
    """Tekanan uap jenuh (kPa), FAO-56 pers. 11."""
    return 0.6108 * math.exp(17.27 * t / (t + 237.3))


def ea_dari_rh(rh, tx, tn):
    """Tekanan uap aktual (kPa) dari RH rata-rata, FAO-56 pers. 19."""
    return rh / 100 * (es(tx) + es(tn)) / 2


def et0_pm(lat, z, doy, tx, tn, ea, u2, rs):
    """ET0 Penman-Monteith FAO-56 (pers. 6) mm/hari. rs = radiasi matahari MJ m-2 hari-1, u2 m/s, G = 0 (langkah harian/bulanan)."""
    tm = (tx + tn) / 2
    delta = 4098 * es(tm) / (tm + 237.3) ** 2
    p = 101.3 * ((293 - 0.0065 * z) / 293) ** 5.26
    gam = 0.000665 * p
    ra = ra_mj(lat, doy)
    rso = (0.75 + 2e-5 * z) * ra
    rnl = 4.903e-9 * ((tx + 273.16) ** 4 + (tn + 273.16) ** 4) / 2 * (0.34 - 0.14 * math.sqrt(max(ea, 0.0))) * (1.35 * min(rs / rso, 1.0) - 0.35)
    rn = 0.77 * rs - rnl
    esm = (es(tx) + es(tn)) / 2
    return max(0.0, (0.408 * delta * rn + gam * 900 / (tm + 273) * u2 * (esm - ea)) / (delta + gam * (1 + 0.34 * u2)))


def et0_hs(lat, bulan, tx, tn):
    """ET0 Hargreaves-Samani (mm/hari), cadangan bila RH/angin/radiasi POWER tak ada."""
    doy = dt.date(2001, bulan, 15).timetuple().tm_yday
    return max(0.0, 0.0023 * ra_mm(lat, doy) * ((tx + tn) / 2 + 17.8) * math.sqrt(max(tx - tn, 0.0)))


def et0_bulan(c, m, tx, tn, pm):
    """ET0 bulan m: PM bila pm = {'rh','ws','rs'} (nilai bulan itu) ada, selain itu Hargreaves-Samani. -> (nilai, 'pm'|'hs')"""
    if pm:
        doy = dt.date(2001, m, 15).timetuple().tm_yday
        return et0_pm(c["lat"], c.get("z", 0.0), doy, tx, tn, ea_dari_rh(pm["rh"], tx, tn), pm["ws"], pm["rs"]), "pm"   # community=AG memberi ALLSKY_SFC_SW_DWN dalam MJ m-2 hari-1 (dicek: ~17-18 di ekuator)
    return et0_hs(c["lat"], m, tx, tn), "hs"


# ---------------------------------------------------------------- iklim bulanan -> harian
def bulan_urut(mulai, n=HARI):
    """[(tahun, bulan)] yang menyentuh jendela mulai..mulai+n hari, ditambah satu bulan di tiap ujung untuk interpolasi."""
    ym = {((mulai + dt.timedelta(days=i)).year, (mulai + dt.timedelta(days=i)).month) for i in range(n)}
    a, b = min(ym), max(ym)
    a = (a[0], a[1] - 1) if a[1] > 1 else (a[0] - 1, 12)
    b = (b[0], b[1] + 1) if b[1] < 12 else (b[0] + 1, 1)
    out, y, m = [], a[0], a[1]
    while (y, m) <= b:
        out.append((y, m))
        y, m = (y, m + 1) if m < 12 else (y + 1, 1)
    return out


def tahun_komposit(mulai, y):
    """Tahun acuan El Nino untuk kalender tahun y: tahun awal (mulai.bulan >= 4) memakai NINO, tahun sesudahnya NINO+1; di luar itu None."""
    awal = mulai.year if mulai.month >= 4 else mulai.year - 1
    off = y - awal
    return [t + off for t in NINO] if 0 <= off <= 1 else None


def _pm_bulan(c, kunci, m):
    """{'rh','ws','rs'} untuk bulan m dari c['pm'][kunci] ('norm' atau tahun) bila lengkap, selain itu None."""
    d = (c.get("pm") or {}).get(kunci[0], {})
    d = d.get(kunci[1]) if kunci[0] == "tahun" else d
    if not d:
        return None
    v = {k: d[k][m - 1] for k in ("rh", "ws", "rs")}
    return v if all(x is not None for x in v.values()) else None


def nilai_bulan(c, skenario, mulai, y, m):
    """(hujan mm/hari, ET0 mm/hari, metode) bulan (y, m) untuk satu sel."""
    if skenario == "nino":
        ths = tahun_komposit(mulai, y)
        if ths and all(str(t) in c["tahun"] for t in ths):
            r = [c["tahun"][str(t)] for t in ths]
            es_ = [et0_bulan(c, m, x["tx"][m - 1], x["tn"][m - 1], _pm_bulan(c, ("tahun", str(t)), m)) for x, t in zip(r, ths)]
            return statistics.mean(x["p"][m - 1] for x in r), statistics.mean(e[0] for e in es_), es_[0][1] if all(e[1] == es_[0][1] for e in es_) else "hs"
    e, met = et0_bulan(c, m, c["norm"]["tx"][m - 1], c["norm"]["tn"][m - 1], _pm_bulan(c, ("norm",), m))
    return c["norm"]["p"][m - 1], e, met


def harian_dari_bulanan(c, skenario, mulai):
    """Deret harian (hujan, ET0) 180 hari, interpolasi linear antar pusat bulan; + metode ET0 yang dipakai ('pm' bila semua bulan PM)."""
    bl = bulan_urut(mulai)
    pusat = [dt.date(y, m, 15) for y, m in bl]
    nil = [nilai_bulan(c, skenario, mulai, y, m) for y, m in bl]
    h, e = [], []
    for i in range(HARI):
        d = mulai + dt.timedelta(days=i)
        j = max(k for k in range(len(pusat) - 1) if pusat[k] <= d) if d >= pusat[0] else 0
        j = min(j, len(pusat) - 2)
        w = (d - pusat[j]).days / (pusat[j + 1] - pusat[j]).days
        h.append(nil[j][0] * (1 - w) + nil[j + 1][0] * w)
        e.append(nil[j][1] * (1 - w) + nil[j + 1][1] * w)
    return h, e, ("pm" if all(n[2] == "pm" for n in nil) else "hs")


def ringkas(h, e):
    """180 hari -> (26 total mingguan hujan mm, 6 rata-rata blok 30 hari ET0 mm/hari), dibulatkan."""
    mg = [round(sum(h[w * 7:(w + 1) * 7])) for w in range(MINGGU)]
    bk = [round(sum(e[b * 30:(b + 1) * 30]) / 30, 1) for b in range(BLOK)]
    return mg, bk


# ---------------------------------------------------------------- bahan
def _bulanan(p, par, m, a, b):
    v = [p[par][f"{y}{m:02d}"] for y in range(a, b + 1) if p[par].get(f"{y}{m:02d}", -999) > -900]
    return statistics.mean(v) if v else None


def ringkas_iklim(lat, p):
    """Dari deret bulanan NASA POWER {'PRECTOTCORR':{YYYYMM:v},...} -> {'lat','norm':{p,tx,tn}[12], 'tahun':{th:{p,tx,tn}}} (hanya tahun acuan)."""
    P = (("p", "PRECTOTCORR"), ("tx", "T2M_MAX"), ("tn", "T2M_MIN"))
    norm = {k: [_bulanan(p, par, m, 1991, 2020) for m in range(1, 13)] for k, par in P}
    if any(v is None for x in norm.values() for v in x):
        return None
    tahun = {}
    for t in sorted({y + o for y in NINO for o in (0, 1)}):
        r = {k: [p[par].get(f"{t}{m:02d}", -999) for m in range(1, 13)] for k, par in P}
        if all(v > -900 for x in r.values() for v in x):
            tahun[str(t)] = r
    return {"lat": lat, "norm": {k: [round(v, 2) for v in x] for k, x in norm.items()}, "tahun": {t: {k: [round(v, 2) for v in x] for k, x in r.items()} for t, r in tahun.items()}}


def ringkas_pm(p):
    """Deret bulanan POWER {'RH2M','WS2M','ALLSKY_SFC_SW_DWN'} -> {'norm':{rh,ws,rs}[12], 'tahun':{th:{...}}} untuk tahun acuan; None bila kosong."""
    P = (("rh", "RH2M"), ("ws", "WS2M"), ("rs", "ALLSKY_SFC_SW_DWN"))
    norm = {k: [_bulanan(p, par, m, 1991, 2020) for m in range(1, 13)] for k, par in P}
    if any(v is None for x in norm.values() for v in x):
        return None
    tahun = {}
    for t in sorted({y + o for y in NINO for o in (0, 1)}):
        r = {k: [p[par].get(f"{t}{m:02d}", -999) for m in range(1, 13)] for k, par in P}
        if all(v > -900 for x in r.values() for v in x):
            tahun[str(t)] = r
    return {"norm": {k: [round(v, 2) for v in x] for k, x in norm.items()}, "tahun": {t: {k: [round(v, 2) for v in x] for k, x in r.items()} for t, r in tahun.items()}}


def _unduh(par, k):
    lat, lon = k.split(",")
    d = ambil(URL.format(par=par, lat=lat, lon=lon), coba=6, batas_waktu=90, kepala=UA)
    time.sleep(0.6)   # POWER menolak (429) bila terlalu rapat
    return d


def unduh_iklim(kunci, pm=True):
    """{kunci: ringkasan} dari NASA POWER; cache IKLIM (dikomit). Sel yang belum punya blok 'pm' diisi RH/angin/radiasi (satu panggilan tambahan)."""
    cache = baca(IKLIM, {})

    def satu(k):
        try:
            c = cache.get(k)
            if c is None:
                d = _unduh(PAR_HUJAN_SUHU, k)
                c = ringkas_iklim(float(k.split(",")[0]), d["properties"]["parameter"])
                if c is None:
                    return k, None
                c["z"] = round(d["geometry"]["coordinates"][2], 0) if len(d["geometry"]["coordinates"]) > 2 else 0.0
            if pm and "pm" not in c:
                d = _unduh(PAR_PM, k)
                c["pm"] = ringkas_pm(d["properties"]["parameter"])
                c["z"] = round(d["geometry"]["coordinates"][2], 0) if len(d["geometry"]["coordinates"]) > 2 else c.get("z", 0.0)
            return k, c
        except Exception as e:
            print(f"  POWER {k}: {e}", file=sys.stderr)
            return k, cache.get(k)
    perlu = [k for k in kunci if k not in cache or (pm and "pm" not in cache[k])]
    with ThreadPoolExecutor(2) as ex:
        for i, (k, c) in enumerate(ex.map(satu, perlu)):
            if c:
                cache[k] = c
            if i % 50 == 49:
                simpan(IKLIM, cache)
    if perlu:
        simpan(IKLIM, cache)
    return cache


def gambut_porsi(jalur, sel, ukuran=0.5):
    """{kunci sel: fraksi 0..1 luas gambut}. Poligon gambut.geojson berupa kotak kisi (bbox dipakai); luas tumpang tindih / luas sel."""
    g = baca(jalur, {"features": []})
    lat_c = {}
    for f in g["features"]:
        ring = f["geometry"]["coordinates"][0]
        xs = [q[0] for q in ring]; ys = [q[1] for q in ring]
        x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
        for la in {math.floor(y0 / ukuran), math.floor(y1 / ukuran)}:
            for lo in {math.floor(x0 / ukuran), math.floor(x1 / ukuran)}:
                a = max(0.0, min(x1, (lo + 1) * ukuran) - max(x0, lo * ukuran)) * max(0.0, min(y1, (la + 1) * ukuran) - max(y0, la * ukuran))
                k = f"{la * ukuran + ukuran / 2:g},{lo * ukuran + ukuran / 2:g}"
                lat_c[k] = lat_c.get(k, 0.0) + a
    return {k: min(1.0, lat_c.get(k, 0.0) / ukuran ** 2) for k in sel}


def penduduk_sel(grid, ukuran=0.5):
    """Jumlah penduduk (sel 0,25 derajat WorldPop) dijumlahkan ke sel 0,5 derajat."""
    out = {}
    for lat, lon, n, _ in grid:
        k = f"{math.floor(lat / ukuran) * ukuran + ukuran / 2:g},{math.floor(lon / ukuran) * ukuran + ukuran / 2:g}"
        out[k] = out.get(k, 0) + n
    return out


def taw_sel(g):
    """TAW (mm) campuran mineral dan gambut menurut fraksi gambut g."""
    return round((1 - g) * PAR["taw"][0] + g * PAR["taw"][1], 1)


def dr_dari_lembap(sm, g):
    """Dr awal (mm) dari kelembapan tanah volumetrik 7-28 cm: skala titik layu..kapasitas lapang lempung."""
    s = min(1.0, max(0.0, (sm - PAR["wp"]) / (PAR["fc"] - PAR["wp"])))
    return round((1 - s) * taw_sel(g), 1)


def dr_dari_harian(h, taw, hari_ini_idx):
    """Bak dijalankan dari Dr = TAW/2 pada hari pertama yang hujannya ada sampai hari_ini_idx (Kc = kc_bera, sama dengan awal simulasi);
    hari tanpa hujan (None) di awal deret dilewati, di tengah dianggap 0 mm; ET0 kosong memakai ET0 hari sebelumnya."""
    dr, e_akhir, mulai = taw / 2, 3.0, None
    for i in range(min(hari_ini_idx + 1, len(h["p"]))):
        if mulai is None:
            if h["p"][i] is None:
                continue
            mulai = i
        p = h["p"][i] if h["p"][i] is not None else 0.0
        e = h["et0"][i] if h["et0"][i] is not None else e_akhir
        e_akhir = e
        dr = langkah(dr, taw, PAR["p"], PAR["kc_bera"], e, p)[0]
    return round(dr, 1), (None if mulai is None else hari_ini_idx - mulai + 1)


def skenario_ecmwf(mus, kunci, mulai, normal):
    """Dari musiman.json (p[hari][anggota], et0 rata-rata anggota atau kosong) -> {'hujan':{k:[26]}, 'et0':{k:[6]}, 'int', 'hari_ecmwf'} atau None.
    Median anggota dari total mingguan. Hari yang tak tercakup ECMWF (kontrak ~152 hari dari 180) dan ET0 yang kosong dilengkapi
    klimatologi Normal sel itu (normal = {kunci: (h[180], e[180])}); jumlah hari ECMWF dicatat."""
    tgl = [dt.date.fromisoformat(t) for t in mus["tgl"]]
    if mulai not in tgl:
        return None
    i0 = tgl.index(mulai)
    n = min(HARI, len(tgl) - i0)
    if n < 30:
        return None
    out_h, out_e, basah, n_basah = {}, {}, 0.0, 0
    for k in kunci:
        t = mus["anak"].get(k)
        d = mus["titik"].get(t) if t else None
        if not d or not d.get("p") or k not in normal:
            continue
        nh, ne = normal[k]
        hari = d["p"][i0:i0 + n]
        n_ang = len(hari[0])
        ang = [[(hari[j][m] or 0.0) if j < n else nh[j] for j in range(HARI)] for m in range(n_ang)]
        out_h[k] = [round(statistics.median(sum(a[w * 7:(w + 1) * 7]) for a in ang)) for w in range(MINGGU)]
        e = [(d["et0"][i0 + j] if d.get("et0") and j < n and d["et0"][i0 + j] is not None else ne[j]) for j in range(HARI)]
        out_e[k] = [round(sum(e[b * 30:(b + 1) * 30]) / 30, 1) for b in range(BLOK)]
        for j in range(n):
            for v in hari[j]:
                if v and v >= 1:
                    basah += v
                    n_basah += 1
    if not out_h:
        return None
    return {"hujan": out_h, "et0": out_e, "int": round(basah / n_basah, 1) if n_basah else PAR["intensitas"], "hari_ecmwf": n, "sel_ecmwf": len(out_h),
            "et0_ecmwf": bool(next(iter(mus["titik"].values())).get("et0"))}


def bangun(tanah, pend, gb, iklim, hari_ini, harian=None, musiman=None, kemarau=True):
    """Susun keluaran. tanah = isi tanah.json; pend/gb = {kunci: nilai}; iklim = {kunci: ringkasan}. Sel tanpa iklim dibuang."""
    sel = []
    for g in tanah["grid"]:
        k = f"{g['lat']:g},{g['lon']:g}"
        if k in iklim and g.get("sm1") is not None:
            sel.append((k, g))
    kunci = [k for k, _ in sel]
    cols = {"lat": [], "lon": [], "taw": [], "gb": [], "jiwa": [], "dr0": []}
    dari = {"bak": 0, "lembap": 0}
    hari_bak = []
    for k, g in sel:
        gp = gb.get(k, 0.0)
        taw = taw_sel(gp)
        dr0 = dr_dari_lembap(g["sm1"], gp)
        if harian and k in harian["sel"]:
            tg = harian["tgl"]
            idx = tg.index(harian["hari_ini"]) if harian["hari_ini"] in tg else len(tg) - 1
            r, nh = dr_dari_harian(harian["sel"][k], taw, idx)
            if nh and nh >= 30:
                dr0 = r
                dari["bak"] += 1
                hari_bak.append(nh)
            else:
                dari["lembap"] += 1
        else:
            dari["lembap"] += 1
        cols["lat"].append(g["lat"]); cols["lon"].append(g["lon"]); cols["taw"].append(taw)
        cols["gb"].append(round(gp * 100)); cols["jiwa"].append(round(pend.get(k, 0))); cols["dr0"].append(dr0)
    sk, metode = {}, {"pm": 0, "hs": 0}
    mulai_ls = {"hariini": hari_ini}
    if kemarau and hari_ini >= dt.date(hari_ini.year, 6, 1):
        mulai_ls["kemarau"] = dt.date(hari_ini.year, 6, 1)
    normal_h = {}
    for sid, nama in (("nino", "El Niño kuat"), ("normal", "Normal")):
        for mk, tgl in mulai_ls.items():
            hs, es_ = [], []
            for k in kunci:
                h, e, met = harian_dari_bulanan(iklim[k], sid, tgl)
                if mk == "hariini" and sid == "normal":
                    normal_h[k] = (h, e)
                a, b = ringkas(h, e)
                hs.append(a); es_.append(b); metode[met] += 1
            sk[sid + ("_k" if mk == "kemarau" else "")] = {"nama": nama, "mulai": mk, "int": PAR["intensitas"], "hujan": hs, "et0": es_}
    ec = skenario_ecmwf(musiman, kunci, hari_ini, normal_h) if musiman else None
    ecmwf = None
    if ec:
        sk = {"ecmwf": {"nama": "Prakiraan ECMWF", "mulai": "hariini", "tgl": hari_ini.isoformat(), "int": ec["int"], "hujan": [ec["hujan"][k] if k in ec["hujan"] else ringkas(*normal_h[k])[0] for k in kunci],
                        "et0": [ec["et0"][k] if k in ec["et0"] else ringkas(*normal_h[k])[1] for k in kunci]}, **sk}   # sel tanpa titik ECMWF: klimatologi Normal, bukan nol
        ecmwf = {"hari": ec["hari_ecmwf"], "sel": ec["sel_ecmwf"], "terbit": musiman.get("terbit"), "et0_ecmwf": ec["et0_ecmwf"]}
    mulai = {mk: {"tgl": t.isoformat(), "nama": {"hariini": "Hari ini", "kemarau": "Awal kemarau"}[mk], "tanam": TANAM_BAWAAN[mk]} for mk, t in mulai_ls.items()}
    return {"dibuat": dt.datetime.now(dt.timezone(dt.timedelta(hours=7))).strftime("%Y-%m-%dT%H:%M+07:00"), "mulai": mulai, "hari": HARI,
            "sel": 0.5, "param": {k: v for k, v in PAR.items()}, "fao": SUMBER_FAO,
            "awal_dari": {"hariini": f"bak {int(statistics.mean(hari_bak)) if hari_bak else 0} hari dari hujan dan ET0 harian ({dari['bak']} sel); kelembapan tanah IFS ({dari['lembap']} sel)",
                          "kemarau": "simpanan penuh (kapasitas lapang) di semua sel"},
            "et0_dari": metode, "ecmwf": ecmwf, "sel_data": cols, "skenario": sk,
            "sumber": {"tanah": "ECMWF IFS 0,25 via Open-Meteo (tanah.json)", "iklim": "NASA POWER bulanan 1991-2025 (hujan PRECTOTCORR; suhu T2M_MAX/T2M_MIN; RH2M, WS2M, ALLSKY_SFC_SW_DWN)",
                       "gambut": "public/data/lahan/gambut.geojson", "penduduk": "WorldPop 2026 (penduduk.json)", "bak": "Allen dkk. 1998, FAO-56 Bab 8"}}


def pertahankan_ecmwf(lama, baru, hari_ini, maks_umur=35):
    """CI tak membawa data/raw antar-jalan: bila musiman.json tak ada, skenario ECMWF keluaran lama dibawa ke keluaran baru
    selama terbitnya < maks_umur hari dan kisi selnya sama. Bertanggal sendiri (kunci 'tgl'); True bila dibawa."""
    try:
        e = lama["skenario"]["ecmwf"]
        umur = (hari_ini - dt.date.fromisoformat(e["tgl"])).days
    except (KeyError, TypeError, ValueError):
        return False
    if umur >= maks_umur or umur < 0 or "ecmwf" in baru["skenario"] or lama["sel_data"]["lat"] != baru["sel_data"]["lat"] or lama["sel_data"]["lon"] != baru["sel_data"]["lon"]:
        return False
    baru["skenario"] = {"ecmwf": e, **baru["skenario"]}
    baru["ecmwf"] = {**(lama.get("ecmwf") or {}), "dari_lama": umur}
    return True


def main():
    hari_ini = dt.datetime.now(dt.timezone(dt.timedelta(hours=7))).date()
    harian = baca(os.path.join(MENTAH, "harian.json"))
    mus = baca(os.path.join(MENTAH, "musiman.json"))
    mulai = dt.date.fromisoformat(harian["hari_ini"]) if harian else hari_ini
    tanah = baca(os.path.join(AKAR, "public/data/tanah.json"))
    kunci = [f"{g['lat']:g},{g['lon']:g}" for g in tanah["grid"]]
    iklim = unduh_iklim(kunci)
    gb = gambut_porsi(os.path.join(AKAR, "public/data/lahan/gambut.geojson"), kunci)
    pend = penduduk_sel(baca(os.path.join(AKAR, "public/data/penduduk.json"))["grid"])
    if len([k for k in kunci if k in iklim]) < .9 * len(kunci):
        sys.exit("neraca: iklim NASA POWER kurang dari 90% sel, berkas lama dibiarkan")
    o = bangun(tanah, pend, gb, iklim, mulai, harian, mus)
    if not mus and pertahankan_ecmwf(baca(KELUAR), o, mulai):
        print(f"neraca: musiman.json tak ada; ECMWF lama ({o['ecmwf']['dari_lama']} hari) dipertahankan", file=sys.stderr)
    simpan(KELUAR, o)
    print(f"neraca: {os.path.getsize(KELUAR) / 1000:.0f} KB; skenario {list(o['skenario'])}; ET0 {o['et0_dari']}; awal {o['awal_dari']['hariini']}")


# ---------------------------------------------------------------- self-check
# Kasus angka tangan (TAW 100, p 0,2 -> RAW 20): Dr 90, Kc 1,2, ET0 5, hujan 4:
#   Ks = (100-90)/(100-20) = 0,125; ETa = 0,125 x 1,2 x 5 = 0,75; Dr' = 90 - 4 + 0,75 = 86,75
KASUS = [  # dr, taw, p, kc, et0, hujan, irigasi -> (dr', eta, ks)
    (90, 100, .2, 1.2, 5, 4, 0, (86.75, 0.75, 0.125)),
    (10, 100, .2, 1.0, 4, 0, 0, (14.0, 4.0, 1.0)),       # Dr di bawah RAW: tanpa stres
    (10, 100, .2, 1.0, 4, 30, 0, (0.0, 4.0, 1.0)),       # hujan melebihi: dipotong 0
    (99, 100, .2, 1.2, 5, 0, 10, (89.075, 0.075, 0.0125)),  # irigasi 10; Ks = 1/80; ETa = 6/80
    (100, 100, .2, 1.0, 4, 0, 0, (100.0, 0.0, 0.0)),     # Dr = TAW: Ks 0
]


def uji():
    for dr, taw, p, kc, e, h, ir, (d2, eta, ks) in KASUS:
        r = langkah(dr, taw, p, kc, e, h, ir)
        assert all(abs(a - b) < 1e-9 for a, b in zip(r, (d2, eta, ks))), (dr, r, (d2, eta, ks))
    # kesetaraan dengan simulasi.js (node): kasus sama harus memberi angka sama. package.json repo bertipe module, jadi .js klasik dimuat lewat new Function
    js = os.path.join(AKAR, "public/kekeringan/simulasi.js")
    try:
        kode = f"const m={{exports:{{}}}};new Function('module',require('fs').readFileSync({json.dumps(js)},'utf8'))(m);const S=m.exports;console.log(JSON.stringify({json.dumps([k[:7] for k in KASUS])}.map(a=>S.langkah(...a))))"
        out = subprocess.run(["node", "-e", kode], capture_output=True, text=True, timeout=30)
        if out.returncode != 0:
            raise AssertionError("simulasi.js gagal dijalankan lewat node: " + out.stderr.strip()[:200])
        for r, k in zip(json.loads(out.stdout), KASUS):
            assert all(abs(a - b) < 1e-9 for a, b in zip(r, k[7])), ("simulasi.js beda", r, k)
    except FileNotFoundError:
        print("  (node tidak ada: uji kesetaraan JS dilewati)")
    # konstanta cocok teks FAO-56 (Tabel 11, 12, 19, 22)
    assert PAR["p"] == 0.20 and PAR["zr"] == 0.5 and PAR["kc"] == [1.05, 1.20, 0.90] and PAR["fase"] == [30, 30, 60, 30]
    assert 0.20 <= PAR["fc"] <= 0.30 and 0.07 <= PAR["wp"] <= 0.17 and 0.13 <= PAR["fc"] - PAR["wp"] <= 0.18   # Tabel 19, lempung
    # Kc padi: awal, puncak, akhir, di luar musim
    assert kc_padi(0) == 1.05 and kc_padi(30) == 1.05 and abs(kc_padi(45) - 1.125) < 1e-9 and kc_padi(60) == 1.2 and kc_padi(119) == 1.2
    assert abs(kc_padi(135) - 1.05) < 1e-9 and kc_padi(150) == PAR["kc_bera"] and kc_padi(-3) == PAR["kc_bera"]
    assert PAR["taw"] == [65.0, 125.0] and taw_sel(0) == 65.0 and taw_sel(1) == 125.0 and taw_sel(.5) == 95.0
    assert dr_dari_lembap(.25, 0) == 0 and dr_dari_lembap(.12, 0) == 65.0 and dr_dari_lembap(.05, 0) == 65.0 and dr_dari_lembap(.4, 0) == 0
    # ET0 Penman-Monteith: contoh hitung FAO-56 (Brussel, 6 Juli, 50,8 LU, z 100 m): Tmax 21,5 Tmin 12,3 RHmax 84 RHmin 63 u2 2,78 Rs 22,07 -> ET0 = 3,9 mm/hari
    ea = (es(12.3) * 84 / 100 + es(21.5) * 63 / 100) / 2
    assert abs(ea - 1.409) < .005, ea                                   # FAO-56 Contoh 17: ea = 1,409 kPa
    e = et0_pm(50.8, 100, 187, 21.5, 12.3, ea, 2.78, 22.07)
    assert 3.8 < e < 4.0, e
    assert 14.5 < ra_mm(0, 15) < 16.5 and 3 < et0_hs(-2, 10, 32.5, 23.5) < 6.5          # Ra ekuator FAO-56 Tabel 2.6; HS wajar
    e_tropis = et0_pm(-2, 20, 288, 32.5, 23.5, ea_dari_rh(82, 32.5, 23.5), 1.5, 17.0)
    assert 3.3 < e_tropis < 5.2, e_tropis
    # skenario bertanggal benar
    m = dt.date(2026, 10, 18)
    assert tahun_komposit(m, 2026) == [1997, 2015, 2023] and tahun_komposit(m, 2027) == [1998, 2016, 2024] and tahun_komposit(m, 2028) is None
    assert tahun_komposit(dt.date(2027, 2, 1), 2027) == [1998, 2016, 2024]    # Feb: awal = 2026
    k1 = dt.date(2026, 6, 1)
    assert tahun_komposit(k1, 2026) == [1997, 2015, 2023]                   # awal kemarau: Jun-Des 2026 memakai tahun awal El Nino
    assert bulan_urut(m)[0] == (2026, 9) and bulan_urut(m)[-1] == (2027, 5)
    # iklim sintetis: Normal 10 mm/hari tiap bulan kecuali 4 dari 30 tahun dasar; El Nino 2 mm/hari
    p = {"PRECTOTCORR": {}, "T2M_MAX": {}, "T2M_MIN": {}, "RH2M": {}, "WS2M": {}, "ALLSKY_SFC_SW_DWN": {}}
    for y in range(1991, 2026):
        for mm in range(1, 13):
            p["PRECTOTCORR"][f"{y}{mm:02d}"] = 2.0 if y in (1997, 1998, 2015, 2016, 2023, 2024) else 10.0
            p["T2M_MAX"][f"{y}{mm:02d}"] = 32.0
            p["T2M_MIN"][f"{y}{mm:02d}"] = 23.0
            p["RH2M"][f"{y}{mm:02d}"] = 80.0
            p["WS2M"][f"{y}{mm:02d}"] = 1.5
            p["ALLSKY_SFC_SW_DWN"][f"{y}{mm:02d}"] = 17.5
    c = ringkas_iklim(-2.25, p)
    hn, en, met0 = harian_dari_bulanan(c, "normal", m)
    assert met0 == "hs"                                                  # tanpa blok 'pm': Hargreaves-Samani dan tertulis
    c["pm"] = ringkas_pm(p)
    c["z"] = 20.0
    hn, en, met = harian_dari_bulanan(c, "normal", m)
    hl, el, _ = harian_dari_bulanan(c, "nino", m)
    assert met == "pm" and len(hn) == HARI
    assert all(abs(x - 8.933) < .01 for x in hn) and all(abs(x - 2.0) < .01 for x in hl), (hn[:3], hl[:3])   # normal = (26x10 + 4x2)/30 (1997, 1998, 2015, 2016 di dasar 1991-2020)
    mg, bk = ringkas(hn, en)
    assert len(mg) == 26 and len(bk) == 6 and all(3 < x < 6 for x in bk), bk
    assert ringkas_iklim(0, {k: {} for k in p}) is None and ringkas_pm({k: {} for k in p}) is None   # data kosong ditolak
    # sel tanpa iklim dibuang; dua titik mulai; awal kemarau butuh hari ini >= 1 Juni
    tanah = {"grid": [{"lat": -2.25, "lon": 113.75, "sm1": .2}, {"lat": -2.75, "lon": 113.75, "sm1": .2}, {"lat": 0.25, "lon": 100.25, "sm1": None}]}
    o = bangun(tanah, {"-2.25,113.75": 1234.4}, {"-2.25,113.75": .5}, {"-2.25,113.75": c}, m)
    assert len(o["sel_data"]["lat"]) == 1 and o["sel_data"]["taw"] == [95.0] and o["sel_data"]["gb"] == [50] and o["sel_data"]["jiwa"] == [1234]
    assert o["mulai"]["kemarau"]["tanam"] == 30 and o["mulai"]["hariini"]["tanam"] == 10
    assert set(o["skenario"]) == {"nino", "normal", "nino_k", "normal_k"} and o["skenario"]["nino_k"]["mulai"] == "kemarau" and o["mulai"]["kemarau"]["tgl"] == "2026-06-01"
    assert len(o["skenario"]["normal"]["hujan"][0]) == 26 and o["et0_dari"]["pm"] == 4 and o["et0_dari"]["hs"] == 0
    assert set(bangun(tanah, {}, {}, {"-2.25,113.75": c}, dt.date(2026, 3, 1))["skenario"]) == {"nino", "normal"}   # Maret: kemarau tahun ini belum terjadi
    # ECMWF: p[hari][anggota]; kurang dari 180 hari dilengkapi Normal; tanggal mulai di luar jangkauan ditolak; et0 kosong dilengkapi klimatologi
    nh = ([10.0] * HARI, [4.0] * HARI)
    tg = [(m + dt.timedelta(days=i)).isoformat() for i in range(150)]
    mus = {"tgl": tg, "titik": {"t": {"p": [[1.0, 2.0, 9.0] for _ in range(150)], "et0": None}}, "anak": {"-2.25,113.75": "t"}}
    ec = skenario_ecmwf(mus, ["-2.25,113.75"], m, {"-2.25,113.75": nh})
    assert ec["hujan"]["-2.25,113.75"][0] == 14 and ec["hujan"]["-2.25,113.75"][25] == 50 and ec["et0"]["-2.25,113.75"] == [4.0] * 6 and ec["int"] == 4.0 and ec["hari_ecmwf"] == 150
    assert skenario_ecmwf({"tgl": ["2026-10-01", "2026-10-02"], "titik": {}, "anak": {}}, ["x"], m, {}) is None
    o = bangun(tanah, {}, {}, {"-2.25,113.75": c}, m, None, mus)
    assert "ecmwf" in o["skenario"] and o["skenario"]["ecmwf"]["hujan"][0][0] == 14 and o["ecmwf"]["hari"] == 150
    assert o["skenario"]["ecmwf"]["hujan"][0][25] == o["skenario"]["normal"]["hujan"][0][25] and o["ecmwf"]["sel"] == 1
    tanah2 = {"grid": tanah["grid"][:2]}
    o2 = bangun(tanah2, {}, {}, {"-2.25,113.75": c, "-2.75,113.75": c}, m, None, mus)   # sel kedua tanpa titik ECMWF: jatuh ke Normal, bukan 0 mm
    assert o2["skenario"]["ecmwf"]["hujan"][1] == o2["skenario"]["normal"]["hujan"][1] and o2["ecmwf"]["sel"] == 1
    assert penduduk_sel([[-10.875, 122.625, 5, ""], [-10.625, 122.875, 7, ""]]) == {"-10.75,122.75": 12}
    # spin-up harian: hari awal tanpa hujan (None) dilewati; tanpa hujan, ET0 5 -> Dr naik dari TAW/2
    h = {"p": [None] * 3 + [0.0] * 10, "et0": [5.0] * 13}
    dr, n = dr_dari_harian(h, 100, 12)
    assert n == 10 and 50 < dr <= 100, (dr, n)
    # CI tanpa musiman.json: ECMWF lama dipertahankan bila < 35 hari dan kisi sama; kedaluwarsa, kisi beda, atau sudah ada: tidak
    lama = {"sel_data": o["sel_data"], "skenario": {"ecmwf": {"tgl": "2026-10-01", "x": 1}}, "ecmwf": {"hari": 152}}
    b = {"sel_data": o["sel_data"], "skenario": {"normal": {}}}
    assert pertahankan_ecmwf(lama, b, dt.date(2026, 10, 18)) and list(b["skenario"]) == ["ecmwf", "normal"] and b["ecmwf"]["dari_lama"] == 17
    assert not pertahankan_ecmwf(lama, {"sel_data": o["sel_data"], "skenario": {}}, dt.date(2026, 11, 20))          # 50 hari: terlalu tua
    assert not pertahankan_ecmwf(lama, {"sel_data": {"lat": [1], "lon": [1]}, "skenario": {}}, dt.date(2026, 10, 18))  # kisi beda
    assert not pertahankan_ecmwf(None, b, dt.date(2026, 10, 18)) and not pertahankan_ecmwf({"skenario": {}}, b, dt.date(2026, 10, 18))
    print("ok neraca")


if __name__ == "__main__":
    if sys.argv[1:] == ["uji"]:
        uji()
    else:
        main()
