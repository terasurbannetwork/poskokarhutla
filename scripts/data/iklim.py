"""Indeks iklim ENSO & IOD -> public/data/iklim.json

Pakai:  python3 scripts/data/iklim.py
Sumber (semua domain publik pemerintah AS, tanpa kunci):
  ONI & RONI   NOAA CPC  https://www.cpc.ncep.noaa.gov/data/indices/{oni,RONI}.ascii.txt (bulanan, rata 3 bulan)
  Status ENSO  NOAA CPC ENSO Diagnostic Discussion (teks "ENSO Alert System Status" + sinopsis peluang)
  DMI/IOD      NOAA OSMC State of the Ocean, DMI mingguan dari OISST (netCDF3 klasik, dibaca tanpa pustaka)
BoM www.bom.gov.au (iod_1.txt) sengaja tidak dipakai di iklim.json: situsnya memblokir akses otomatis (403). Host reg.bom.gov.au menjawab 200 dan dipakai
HANYA oleh prospek_musim.json (PKH-30, di bawah).

Aturan bobot musim (dipakai UI untuk kalender musim di musim.json):
  w = 1,0 bila CPC berstatus El Niño Advisory; 0,5 bila El Niño Watch; 0 untuk lainnya (netral / La Niña).
  IOD positif (rata-rata DMI 8 minggu terakhir >= +0,4 °C) menambah 0,25 (maks 1) khusus dasarian Juli-Desember
  (indeks 18-35): IOD positif mengeringkan Sumatra & Kalimantan Agustus-November (2019: El Niño lemah + IOD kuat).
  peluang[d] = w_d * p_el_nino[d] + (1 - w_d) * p_biasa[d].
"""
import csv, datetime as dt, html, json, os, re, statistics, struct, sys, urllib.request

AKAR = os.path.join(os.path.dirname(__file__), "../..")
KELUAR = os.path.join(AKAR, "public/data/iklim.json")
ONI = "https://www.cpc.ncep.noaa.gov/data/indices/oni.ascii.txt"
RONI = "https://www.cpc.ncep.noaa.gov/data/indices/RONI.ascii.txt"
DISKUSI = "https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/enso_advisory/ensodisc.shtml"
DMI = "https://stateoftheocean.osmc.noaa.gov/sur/data/dmi.nc"
AMBANG_IOD, MINGGU_IOD = 0.4, 8
DARI_TAHUN = 1997


def ambil(url):
    req = urllib.request.Request(url, headers={"User-Agent": "poskokarhutla/1.0 (karhutla public dashboard)"})
    return urllib.request.urlopen(req, timeout=60).read()


def oni(teks):
    """[{tahun, musim, nilai}] dari baris 'SEAS YR TOTAL ANOM' (ONI) atau 'SEAS YR ANOM' (RONI)."""
    out = []
    for b in teks.splitlines()[1:]:
        p = b.split()
        if len(p) >= 3 and p[1].isdigit():
            out.append({"tahun": int(p[1]), "musim": p[0], "nilai": float(p[-1])})
    return out


def netcdf3(b):
    """Pembaca minimal netCDF3 klasik (CDF\\x01/\\x02): {nama_variabel: [nilai]} untuk variabel numerik."""
    assert b[:3] == b"CDF" and b[3] in (1, 2), "bukan netCDF3 klasik"
    lebar_off = 4 if b[3] == 1 else 8
    pos = 4
    def u32():
        nonlocal pos
        v = struct.unpack(">I", b[pos:pos + 4])[0]; pos += 4; return v
    def nama():
        nonlocal pos
        n = u32(); s = b[pos:pos + n].decode(); pos += n + (-n % 4); return s
    UK = {1: 1, 2: 1, 3: 2, 4: 4, 5: 4, 6: 8}
    FMT = {3: "h", 4: "i", 5: "f", 6: "d"}
    def atribut():
        nonlocal pos
        tag, n = u32(), u32()
        assert tag in (0, 12)
        for _ in range(n):
            nama(); t = u32(); m = u32(); pos += UK[t] * m + (-(UK[t] * m) % 4)
    nrec = u32()
    tag, n = u32(), u32()
    dims = []
    for _ in range(n):
        dims.append((nama(), u32()))
    atribut()
    tag, n = u32(), u32()
    var = {}
    for _ in range(n):
        nm = nama(); nd = u32(); ids = [u32() for _ in range(nd)]
        atribut()
        t, vsize = u32(), u32()
        off = struct.unpack(">I" if lebar_off == 4 else ">Q", b[pos:pos + lebar_off])[0]; pos += lebar_off
        var[nm] = (ids, t, vsize, off)
    rec = [v for v in var.values() if v[0] and dims[v[0][0]][1] == 0]
    reclen = sum(v[2] for v in rec) if len(rec) > 1 else (rec[0][2] if rec else 0)
    out = {}
    for nm, (ids, t, vsize, off) in var.items():
        if t not in FMT:
            continue
        if ids and dims[ids[0]][1] == 0:  # variabel rekaman: satu nilai skalar per rekaman (cukup untuk deret waktu 1-D)
            out[nm] = [struct.unpack(">" + FMT[t], b[off + i * reclen:off + i * reclen + UK[t]])[0] for i in range(nrec)]
        else:
            n = vsize // UK[t]
            out[nm] = list(struct.unpack(">" + FMT[t] * n, b[off:off + n * UK[t]]))
    return out


def status_cpc(teks):
    t = html.unescape(re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", teks)))
    m = re.search(r"ENSO Alert System Status:\s*([A-Za-zñÑ\s]+?)(?:\s{2,}|Synopsis)", t)
    s = re.search(r"Synopsis:\s*(.+?\.)\s", t)
    return (m.group(1).strip() if m else None), (s.group(1).strip() if s else None)


def status_enso(alert, oni_akhir):
    a = (alert or "").lower()
    if "el ni" in a and "advisory" in a:
        return "El Niño", 1.0
    if "la ni" in a and "advisory" in a:
        return "La Niña", 0.0
    if "el ni" in a and "watch" in a:
        return "Netral", 0.5
    if not alert:  # CPC tak terbaca: ambang ONI klasik
        return ("El Niño", 1.0) if oni_akhir >= 0.5 else ("La Niña", 0.0) if oni_akhir <= -0.5 else ("Netral", 0.0)
    return "Netral", 0.0


def status_iod(dmi):
    akhir = [d["nilai"] for d in dmi[-MINGGU_IOD:]]
    r = sum(akhir) / len(akhir)
    return ("IOD positif" if r >= AMBANG_IOD else "IOD negatif" if r <= -AMBANG_IOD else "Netral"), round(r, 2)


def bobot(w_enso, iod):
    """36 bobot El Niño per dasarian (lihat aturan di docstring modul)."""
    return [min(1.0, w_enso + (0.25 if iod == "IOD positif" and d >= 18 else 0)) for d in range(36)]


def bangun():
    o = [x for x in oni(ambil(ONI).decode()) if x["tahun"] >= DARI_TAHUN]
    r = [x for x in oni(ambil(RONI).decode()) if x["tahun"] >= DARI_TAHUN]
    alert, sinopsis = status_cpc(ambil(DISKUSI).decode("utf-8", "replace"))
    nc = netcdf3(ambil(DMI))
    waktu = next(v for k, v in nc.items() if k.upper() == "TIME")
    nilai = next(v for k, v in nc.items() if k.upper() != "TIME")
    t0 = dt.date(1800, 1, 1)
    dmi = [{"tgl": (t0 + dt.timedelta(days=w)).isoformat(), "nilai": round(v, 2)} for w, v in zip(waktu, nilai)
           if abs(v) < 50][-104:]
    status, w = status_enso(alert, o[-1]["nilai"])
    iod, dmi8 = status_iod(dmi)
    umur = (dt.date.today() - dt.date.fromisoformat(dmi[-1]["tgl"])).days
    basi = umur >= 45
    if basi:   # sumber OSMC berhenti: nilai null berlabel umur, bukan data basi dan bukan henti total
        print(f"PERINGATAN: DMI terakhir {dmi[-1]['tgl']} sudah {umur} hari; iod_status/dmi_8_minggu = null, bobot tanpa tambahan IOD", file=sys.stderr)
        iod, dmi8 = None, None
    out = {"dibuat": dt.datetime.now(dt.timezone(dt.timedelta(hours=7))).isoformat(timespec="minutes"),
           "status": status, "cpc_status": alert, "cpc_sinopsis": sinopsis,
           "oni_terakhir": o[-1], "roni_terakhir": r[-1] if r else None,
           "iod_status": iod, "dmi_8_minggu": dmi8, "dmi_umur_hari": umur, "dmi_basi": basi,
           "bobot_el_nino": bobot(w, iod),
           "aturan": "peluang[d] = w[d]*p_el_nino[d] + (1-w[d])*p_biasa[d]; w = 1 El Niño Advisory, 0,5 El Niño Watch, 0 lainnya; +0,25 Jul-Des bila DMI 8 minggu >= +0,4",
           "oni": o, "roni": r, "dmi": dmi,
           "sumber": {"oni": ONI, "roni": RONI, "status": DISKUSI, "dmi": DMI + " (NOAA OSMC, OISST, mingguan)"}}
    json.dump(out, open(KELUAR, "w"), ensure_ascii=False, separators=(",", ":"))
    print(f"iklim.json {status} ({alert}) ONI {o[-1]['musim']} {o[-1]['tahun']} {o[-1]['nilai']:+.2f} | {iod} DMI8 {dmi8 if dmi8 is None else format(dmi8, '+.2f')} "
          f"(minggu {dmi[-1]['tgl']}) | {os.path.getsize(KELUAR) / 1e3:.0f} KB")
    assert o[-1]["tahun"] >= dt.date.today().year - 1, f"ONI terakhir {o[-1]}: sumber CPC berhenti"


def uji():
    assert oni(" SEAS  YR   TOTAL   ANOM\n  JAS 2026  29.12   2.16\n") == [{"tahun": 2026, "musim": "JAS", "nilai": 2.16}]
    assert status_enso("El Niño Advisory", 0.1) == ("El Niño", 1.0)
    assert status_enso("La Niña Watch", -0.3) == ("Netral", 0.0)
    assert status_enso(None, 0.7) == ("El Niño", 1.0)
    assert status_cpc("<p>ENSO Alert System Status: El Ni&ntilde;o Advisory</p> <p>Synopsis: Kuat. Lagi.</p>")[0] == "El Niño Advisory"
    assert status_iod([{"nilai": 0.5}] * 8)[0] == "IOD positif" and status_iod([{"nilai": 0.1}] * 8)[0] == "Netral"
    b = bobot(0.5, "IOD positif")
    assert b[0] == 0.5 and b[18] == 0.75 and bobot(1.0, "IOD positif")[30] == 1.0
    # netCDF3: 1 dimensi rekaman TIME, 2 variabel rekaman (double, float), 2 rekaman
    def s(x):
        e = x.encode(); return struct.pack(">I", len(e)) + e + b"\0" * (-len(e) % 4)
    hdr = b"CDF\x01" + struct.pack(">I", 2) + struct.pack(">II", 10, 1) + s("TIME") + struct.pack(">I", 0) + struct.pack(">II", 0, 0)
    vars_ = []
    for nm, t, sz in (("TIME", 6, 8), ("DMI", 5, 4)):
        vars_.append(s(nm) + struct.pack(">II", 1, 0) + struct.pack(">II", 0, 0) + struct.pack(">II", t, sz))
    base = len(hdr) + 8 + sum(len(v) + 4 for v in vars_)
    blok = hdr + struct.pack(">II", 11, 2) + vars_[0] + struct.pack(">I", base) + vars_[1] + struct.pack(">I", base + 8)
    data = struct.pack(">df", 100.0, 0.5) + struct.pack(">df", 107.0, -0.25)
    assert netcdf3(blok + data) == {"TIME": [100.0, 107.0], "DMI": [0.5, -0.25]}


# ---------------------------------------------------------------- PKH-30: prospek musim -> public/data/prospek_musim.json
# Peluang rata-rata hujan 30/60 hari ke depan < 4 mm/hari (Field dkk. 2016, PNAS, doi:10.1073/pnas.1524888113) dari ansambel musiman ECMWF
# (Open-Meteo seasonal, ~50 anggota) di satu titik sabuk kebakaran per provinsi. Aturan diuji 2012-2025 per titik sebelum tampil.
# Rujukan pembanding (MIT, Pantau Karhutla 2026): pipeline/src/haze/outlook.py, pipeline/scripts/backtest_outlook_rule.py.
# Pakai:  python3 scripts/data/iklim.py prospek        (tarik ONI/Nino3.4/IOD + ansambel; kunci "uji" dibawa dari berkas lama)
#         python3 scripts/data/iklim.py prospek uji    (hitung ulang uji 2012-2025; lokal: butuh data/raw/asean/viirs-snpp_<tahun>_Indonesia.csv dari asean_titik.py bangun)
PROSPEK = os.path.join(AKAR, "public/data/prospek_musim.json")
NINO_MINGGUAN = "https://www.cpc.ncep.noaa.gov/data/indices/wksst9120.for"
IOD_BOM = "https://reg.bom.gov.au/clim_data/IDCK000072/iod_1.txt"
MUSIMAN = "https://seasonal-api.open-meteo.com/v1/seasonal"
POWER = "https://power.larc.nasa.gov/api/temporal/daily/point?parameters=PRECTOTCORR&community=AG&latitude={la}&longitude={lo}&start=20120101&end=20251231&format=JSON"
KERING_MM = 4.0
TITIK = [("Kalimantan Tengah", -2.21, 113.92), ("Kalimantan Barat", -0.03, 109.34), ("Kalimantan Selatan", -3.32, 114.59),
         ("Kalimantan Timur", -0.50, 117.15), ("Riau", 0.51, 101.45), ("Jambi", -1.61, 103.61),
         ("Sumatera Selatan", -2.98, 104.78), ("Papua Selatan (Merauke)", -8.49, 140.40)]   # satu titik per provinsi (sabuk kebakaran, bukan ibu kota)
TAHUN_UJI, KOTAK, JENDELA = range(2012, 2026), 1.0, 30
MULAI_UJI = [(m, d) for m in (7, 8, 9, 10) for d in (1, 16)]
UJI_LIFT_MIN, UJI_KERING_MIN = 1.5, 8   # tanda "aturan lemah": jendela kering terlalu sedikit, atau jendela besar hanya <= 1,5x lebih sering di jendela kering


def nino34_mingguan(teks, n=12):
    """CPC wksst9120.for: tanggal lalu SST+anomali Nino 1+2, 3, 3.4, 4. Anomali negatif menempel pada SST ("23.4-0.4"), jadi dibaca dengan pola."""
    out = []
    for b in teks.splitlines():
        p = b.split(maxsplit=1)
        if len(p) == 2 and p[0][:2].isdigit():
            v = re.findall(r"-?\d+\.\d+", p[1])
            if len(v) == 8:
                out.append({"minggu": dt.datetime.strptime(p[0], "%d%b%Y").date().isoformat(), "nino34": float(v[5])})
    return out[-n:]


def iod_mingguan(teks, n=12):
    out = []
    for b in teks.splitlines():
        p = b.strip().split(",")
        if len(p) == 3 and p[0].isdigit() and p[1].isdigit():
            out.append({"akhir_minggu": f"{p[1][:4]}-{p[1][4:6]}-{p[1][6:]}", "iod": float(p[2])})
    return out[-n:]


def fase_oni(v):
    return ("El Niño sangat kuat" if v >= 2.0 else "El Niño kuat" if v >= 1.5 else "El Niño" if v >= 0.5 else "La Niña" if v <= -0.5 else "Netral")


def peluang_kering(anggota, hari):
    """Bagian anggota ansambel yang rata-rata hujan `hari` hari pertamanya < KERING_MM; anggota tanpa data dibuang; None bila tak ada anggota."""
    rata = []
    for a in anggota:
        v = [x for x in a[:hari] if x is not None]
        if len(v) >= hari * 0.9:
            rata.append(sum(v) / len(v))
    return (round(sum(r < KERING_MM for r in rata) / len(rata), 2), len(rata)) if rata else (None, 0)


def ansambel(la, lo):
    """-> daftar deret harian per anggota (precipitation_sum_memberNN; deret tanpa akhiran = rata-rata ansambel, tidak dipakai)."""
    d = json.loads(ambil(f"{MUSIMAN}?latitude={la}&longitude={lo}&daily=precipitation_sum&forecast_days=60"))["daily"]
    return [v for k, v in d.items() if re.fullmatch(r"precipitation_sum_member\d+", k)]


def hujan_power(la, lo):
    """{tanggal date: mm/hari} NASA POWER PRECTOTCORR 2012-2025 (fill -999 dibuang)."""
    p = json.loads(ambil(POWER.format(la=la, lo=lo)))["properties"]["parameter"]["PRECTOTCORR"]
    return {dt.date(int(k[:4]), int(k[4:6]), int(k[6:])): v for k, v in p.items() if v >= 0}


def deteksi_harian(berkas, la, lo):
    """{date: jumlah} deteksi S-NPP type 0 keyakinan n/h dalam +-KOTAK derajat titik, dari arsip negara FIRMS."""
    out = {}
    with open(berkas, newline="") as f:
        for r in csv.DictReader(f):
            if r["type"] == "0" and r["confidence"].strip().lower() in ("n", "h") and abs(float(r["latitude"]) - la) <= KOTAK and abs(float(r["longitude"]) - lo) <= KOTAK:
                d = dt.date.fromisoformat(r["acq_date"])
                out[d] = out.get(d, 0) + 1
    return out


def ringkas_uji(baris):
    """baris [(hujan_rata, deteksi)] -> ringkasan uji aturan; aturan_lemah None bila jendela kering < UJI_KERING_MIN (tak cukup bukti)."""
    n = len(baris)
    kering = [d for h, d in baris if h < KERING_MM]
    basah = [d for h, d in baris if h >= KERING_MM]
    ambang = sorted(d for _, d in baris)[int(n * 0.9)] if n else None     # jendela "besar" = 10% teratas deteksi di titik itu
    besar = [d >= ambang and d > 0 for _, d in baris]
    dasar = sum(besar) / n if n else None
    pb = sum(b for (h, _), b in zip(baris, besar) if h < KERING_MM) / len(kering) if kering else None
    lift = round(pb / dasar, 2) if pb is not None and dasar else None
    lemah = None if len(kering) < UJI_KERING_MIN or lift is None else lift < UJI_LIFT_MIN
    return {"jendela": n, "jendela_kering": len(kering), "median_deteksi_kering": statistics.median(kering) if kering else None,
            "median_deteksi_basah": statistics.median(basah) if basah else None,
            "peluang_besar_saat_kering": round(pb, 2) if pb is not None else None, "peluang_besar_dasar": round(dasar, 2) if dasar is not None else None,
            "lift": lift, "aturan_lemah": lemah}


def uji_aturan(folder):
    """Uji 30 hari rata-rata hujan < 4 mm/hari lawan deteksi S-NPP +-1 derajat, 2012-2025, jendela mulai tgl 1 dan 16 Jul-Okt. -> {titik: ringkasan | None}"""
    arsip = {y: os.path.join(folder, f"viirs-snpp_{y}_Indonesia.csv") for y in TAHUN_UJI}
    hilang = [y for y, f in arsip.items() if not os.path.exists(f)]
    if hilang:
        raise SystemExit(f"arsip Indonesia {hilang} belum ada di {folder} (python3 scripts/data/asean_titik.py bangun)")
    out = {}
    for nama, la, lo in TITIK:
        try:
            hujan = hujan_power(la, lo)
        except Exception as e:
            print("uji", nama, "hujan gagal", e, file=sys.stderr); out[nama] = None; continue
        det = {}
        for y, f in arsip.items():
            det.update(deteksi_harian(f, la, lo))
        baris = []
        for y in TAHUN_UJI:
            for m, d in MULAI_UJI:
                hari = [dt.date(y, m, d) + dt.timedelta(days=i) for i in range(JENDELA)]
                v = [hujan[x] for x in hari if x in hujan]
                if len(v) >= JENDELA * 0.9:
                    baris.append((sum(v) / len(v), sum(det.get(x, 0) for x in hari)))
        out[nama] = ringkas_uji(baris)
        print("uji", nama, out[nama], file=sys.stderr, flush=True)
    return out


def prospek(hitung_uji=False, folder=os.path.join(AKAR, "data/raw/asean")):
    lama = json.load(open(PROSPEK)) if os.path.exists(PROSPEK) else {}
    uji_lama = lama.get("uji")
    def coba(f, *a):
        try:
            return f(*a)
        except Exception as e:   # satu sumber mati: bagian itu null, kartu tetap terbit
            print("prospek:", f.__name__, "gagal:", e, file=sys.stderr); return None
    o = coba(lambda: [x for x in oni(ambil(ONI).decode()) if x["tahun"] >= dt.date.today().year - 1][-6:])
    uji_titik = uji_aturan(folder) if hitung_uji else (uji_lama or {}).get("titik")
    titik = []
    for nama, la, lo in TITIK:
        a = coba(ansambel, la, lo)
        k30, n = peluang_kering(a, 30) if a else (None, 0)
        k60 = peluang_kering(a, 60)[0] if a else None
        med = round(statistics.median(sum(x for x in m[:30] if x is not None) for m in a)) if a else None
        u = (uji_titik or {}).get(nama)
        titik.append({"provinsi": nama, "lat": la, "lon": lo, "anggota": n or None, "kering30": k30, "kering60": k60, "hujan30_median_mm": med,
                      "aturan_lemah": u["aturan_lemah"] if u else None, "uji": u})
    out = {"dibuat": dt.datetime.now(dt.timezone(dt.timedelta(hours=7))).isoformat(timespec="minutes"),
           "ambang_mm_hari": KERING_MM,
           "enso": {"oni": o, "fase_oni": fase_oni(o[-1]["nilai"]) if o else None, "nino34_mingguan": coba(lambda: nino34_mingguan(ambil(NINO_MINGGUAN).decode())),
                    "iod_mingguan": coba(lambda: iod_mingguan(ambil(IOD_BOM).decode()))},
           "titik": titik,
           "uji": {"periode": [TAHUN_UJI[0], TAHUN_UJI[-1]], "diuji": dt.date.today().isoformat() if hitung_uji else (uji_lama or {}).get("diuji"), "titik": uji_titik,
                   "metode": f"rata-rata hujan {JENDELA} hari < {KERING_MM:g} mm/hari (NASA POWER PRECTOTCORR) di titik, jendela mulai tgl 1 dan 16 Juli-Oktober tiap tahun; lawan jumlah deteksi VIIRS S-NPP (type 0, keyakinan n/h) dalam +-{KOTAK:g} derajat. Jendela besar = 10% teratas deteksi di titik itu; lift = peluang jendela besar saat kering dibagi peluang dasarnya.",
                   "aturan_lemah": f"lift < {UJI_LIFT_MIN} (jendela besar tak jauh lebih sering saat kering); null bila jendela kering < {UJI_KERING_MIN}. Jendela berimpit 15 hari, jadi bukan sampel bebas.",
                   "batas": "hujan titik NASA POWER (reanalisis MERRA-2), bukan hujan ansambel ECMWF; uji menilai aturan 4 mm, bukan keterampilan ramalan musiman."},
           "sumber": {"oni": ONI, "nino34": NINO_MINGGUAN, "iod": IOD_BOM, "ansambel": MUSIMAN + " (ECMWF SEAS5 via Open-Meteo, CC BY 4.0)", "hujan_uji": "NASA POWER", "deteksi_uji": "NASA FIRMS arsip VIIRS S-NPP Indonesia"},
           "catatan": "Informasi pendukung, bukan peringatan resmi; ikuti arahan BMKG dan BPBD setempat."}
    json.dump(out, open(PROSPEK, "w"), ensure_ascii=False, separators=(",", ":"))
    print("prospek_musim.json", [(t["provinsi"], t["kering30"], t["kering60"], t["aturan_lemah"]) for t in titik])


def uji_prospek():
    assert nino34_mingguan("04NOV2026     27.0 5.6     29.5 4.3     30.1-0.4     30.1 1.5\n")[0] == {"minggu": "2026-11-04", "nino34": -0.4}
    assert iod_mingguan("20261102,20261108,0.75\nx,y,z\n") == [{"akhir_minggu": "2026-11-08", "iod": 0.75}]
    assert fase_oni(2.2) == "El Niño sangat kuat" and fase_oni(-0.6) == "La Niña" and fase_oni(0.1) == "Netral"
    a = [[1.0] * 60, [5.0] * 60, [3.0] * 30 + [9.0] * 30, [None] * 60]   # anggota 4 tanpa data: dibuang
    assert peluang_kering(a, 30) == (0.67, 3) and peluang_kering(a, 60) == (0.33, 3) and peluang_kering([[None] * 60], 30) == (None, 0)
    # titik: jendela kering (hujan < 4) selalu besar -> lift tinggi, kuat; semua jendela sama -> lift 1, lemah
    kuat = [(1.0, 100)] * 9 + [(8.0, 1)] * 90 + [(1.0, 100)]
    assert ringkas_uji(kuat)["aturan_lemah"] is False
    assert ringkas_uji([(1.0, 5)] * 5 + [(8.0, 5)] * 50)["aturan_lemah"] is None   # kering < 8 jendela: tak cukup bukti
    datar = [(1.0, 5)] * 10 + [(8.0, 5)] * 90
    assert ringkas_uji(datar)["lift"] in (None, 1.0) and ringkas_uji(datar)["aturan_lemah"] in (None, True)


if __name__ == "__main__":
    uji()
    if sys.argv[1:2] == ["uji"]:
        uji_prospek()   # self-check murni: tanpa jaringan, tanpa menulis keluaran
        print("iklim uji: OK")
    elif sys.argv[1:2] == ["prospek"]:
        uji_prospek()
        prospek(sys.argv[2:3] == ["uji"])
    else:
        bangun()
