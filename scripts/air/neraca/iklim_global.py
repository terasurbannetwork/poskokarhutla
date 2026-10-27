"""NA-03b Iklim bulanan seluruh Jawa tanpa kuota Open-Meteo: hujan CHIRPS v2.0 (0,05 derajat, IRI Data Library) +
ET0 FAO-56 Penman-Monteith bulanan dari NASA POWER (MERRA-2, kisi 0,5 derajat) -> iklim.json (format sama dengan iklim.py).

Alasan (penyimpangan dari RANCANGAN, dicatat di sana): Open-Meteo gratis ~54 sel/hari, 1.308 sel = ~24 hari, dan tidak
punya hujan ERA5-Land untuk Jawa. CHIRPS = hujan stasiun+satelit 0,05 derajat; POWER = 83 titik, satu panggilan per titik.

Tahap (tiap tahap menulis berkas mentah di data/kajian-bnpb/neraca-air/mentah/, lalu `gabung` menyusun iklim.json):
  python3 iklim_global.py power            83 titik POWER bulanan 1991-2025 -> mentah/power_jawa.json (pelan, 1 panggilan/detik)
  python3 iklim_global.py chirps <a.nc> [b.nc ..]  baca netCDF-3 klasik hasil IRI (lihat CHIRPS_URL) -> mentah/chirps_jawa.json
  python3 iklim_global.py gabung           iklim.json: p = CHIRPS sel 0,1 derajat (rerata sel 0,05 di dalamnya), et0 = POWER titik
                                           0,5 derajat terdekat; nilai ERA5 lama (bila ada) disimpan sebagai p_era5/et0_era5
  python3 iklim_global.py uji
"""
import calendar, json, math, os, struct, subprocess, sys, time, urllib.parse

DIR = os.path.dirname(os.path.abspath(__file__))
AKAR = os.path.abspath(os.path.join(DIR, "../../.."))
sys.path.insert(0, os.path.join(AKAR, "scripts/banjir"))
MENTAH = os.path.join(AKAR, "data/kajian-bnpb/neraca-air/mentah")
TOPO, KELUAR = os.path.join(DIR, "topologi.json"), os.path.join(DIR, "iklim.json")
P_POWER, P_CHIRPS = os.path.join(MENTAH, "power_jawa.json"), os.path.join(MENTAH, "chirps_jawa.json")
AWAL, AKHIR = 1991, 2025
SERI = [f"{y}{m:02d}" for y in range(AWAL, AKHIR + 1) for m in range(1, 13)]
POWER_URL = "https://power.larc.nasa.gov/api/temporal/monthly/point?"
POWER_VAR = "T2M,T2M_MAX,T2M_MIN,ALLSKY_SFC_SW_DWN,RH2M,WS2M"
CHIRPS_URL = ("https://iridl.ldeo.columbia.edu/SOURCES/.UCSB/.CHIRPS/.v2p0/.monthly/.global/.precipitation/"
              "X/105/117/RANGE/Y/-9/-5/RANGE/T/(Jan%201991)/(Dec%202025)/RANGEEDGES/data.nc")


# ---------- ET0 FAO-56 bulanan ----------
def e0(t):
    return 0.6108 * math.exp(17.27 * t / (t + 237.3))


def ra_harian(lat, hari_tahun):
    """radiasi ekstraterestrial MJ/m2/hari (FAO-56 pers. 21)"""
    phi = math.radians(lat)
    dr = 1 + 0.033 * math.cos(2 * math.pi * hari_tahun / 365)
    dek = 0.409 * math.sin(2 * math.pi * hari_tahun / 365 - 1.39)
    ws = math.acos(max(-1, min(1, -math.tan(phi) * math.tan(dek))))
    return 24 * 60 / math.pi * 0.0820 * dr * (ws * math.sin(phi) * math.sin(dek) + math.cos(phi) * math.cos(dek) * math.sin(ws))


def et0_bulan(lat, z, bln, hari, t, tmax, tmin, rs, rh, u2):
    """mm/bulan dari rerata bulanan (G=0). Masukan tak masuk akal ditolak."""
    if not (0 < rs < 40 and 0 <= rh <= 100 and 0 <= u2 < 30 and -5 < tmin <= tmax < 50):
        raise ValueError(f"masukan ET0 tak masuk akal: rs={rs} rh={rh} u2={u2} tmin={tmin} tmax={tmax}")
    es = (e0(tmax) + e0(tmin)) / 2
    ea = es * rh / 100
    delta = 4098 * e0(t) / (t + 237.3) ** 2
    P = 101.3 * ((293 - 0.0065 * z) / 293) ** 5.26
    gam = 0.000665 * P
    ra = ra_harian(lat, int(30.4 * bln - 15))
    rso = (0.75 + 2e-5 * z) * ra
    rns = 0.77 * rs
    rnl = 4.903e-9 * ((tmax + 273.16) ** 4 + (tmin + 273.16) ** 4) / 2 * (0.34 - 0.14 * math.sqrt(ea)) * (1.35 * min(rs / rso, 1) - 0.35)
    rn = rns - rnl
    et = (0.408 * delta * rn + gam * 900 / (t + 273) * u2 * (es - ea)) / (delta + gam * (1 + 0.34 * u2))
    return max(et, 0.0) * hari


def et0_seri(lat, z, par):
    """par = {VAR: {YYYYMM: v}} -> 420 nilai mm/bulan; bulan hilang/-999 ditolak"""
    out = []
    for k in SERI:
        v = {n: par[n].get(k) for n in ("T2M", "T2M_MAX", "T2M_MIN", "ALLSKY_SFC_SW_DWN", "RH2M", "WS2M")}
        if any(x is None or x <= -900 for x in v.values()):
            raise ValueError(f"POWER {k}: nilai hilang {v}")
        out.append(round(et0_bulan(lat, z, int(k[4:]), calendar.monthrange(int(k[:4]), int(k[4:]))[1],
                                   v["T2M"], v["T2M_MAX"], v["T2M_MIN"], v["ALLSKY_SFC_SW_DWN"], v["RH2M"], v["WS2M"]), 1))
    return out


# ---------- titik ----------
def sel_semua(topo):
    return sorted({c for s in topo["subdas"].values() for kb in s["kab"].values() for c in kb})


def titik_power(c):
    la, lo = (float(x) for x in c.split(","))
    return math.floor(la * 2 + 0.5) / 2, math.floor(lo * 2 + 0.5) / 2


def power(pekerja=3):
    """ponytail: 3 utas sejajar (POWER mengizinkan beberapa permintaan serentak); satu panggilan lambat ~1 mnt."""
    from concurrent.futures import ThreadPoolExecutor
    from umum import simpan
    topo = json.load(open(TOPO))
    titik = sorted({titik_power(c) for c in sel_semua(topo)})
    cache = json.load(open(P_POWER)) if os.path.exists(P_POWER) else {}

    def satu(t):
        q = {"parameters": POWER_VAR, "community": "AG", "longitude": t[1], "latitude": t[0], "start": AWAL, "end": AKHIR, "format": "JSON"}
        for coba in range(1, 4):   # curl: urllib ke POWER sering menggantung (dicek 27 Okt 2026), curl 1-2 dtk
            try:
                r = subprocess.run(["curl", "-s", "--max-time", "120", "-f", POWER_URL + urllib.parse.urlencode(q, safe=",")],
                                   capture_output=True, timeout=140)
                d = json.loads(r.stdout)
                return t, {"z": d["geometry"]["coordinates"][2], "par": d["properties"]["parameter"]}
            except Exception as e:
                print(f"  gagal {t} percobaan {coba}: {str(e)[:100]}", file=sys.stderr, flush=True)
                time.sleep(10 * coba)
        return t, None

    perlu = [t for t in titik if f"{t[0]},{t[1]}" not in cache]
    with ThreadPoolExecutor(pekerja) as ex:
        for t, v in ex.map(satu, perlu):
            if v is None:
                continue
            cache[f"{t[0]},{t[1]}"] = v
            simpan(P_POWER, cache)
            print(f"  POWER {len(cache)}/{len(titik)} {t}", file=sys.stderr, flush=True)
    print(f"POWER {len(cache)}/{len(titik)} titik", file=sys.stderr)


# ---------- netCDF-3 klasik (hanya yang dibutuhkan) ----------
def baca_nc3(b):
    """-> (dims{nama:n}, vars{nama:(dimnames, atribut, offset, tipe)}) ; tipe NC: 1 byte 2 char 3 short 4 int 5 float 6 double"""
    if b[:3] != b"CDF" or b[3] not in (1, 2):
        raise ValueError(f"bukan netCDF-3 klasik: {b[:4]!r}")
    off64 = b[3] == 2
    pos = [4]

    def ang(f="i"):
        n = struct.calcsize(">" + f)
        v = struct.unpack_from(">" + f, b, pos[0])[0]
        pos[0] += n
        return v

    def nama():
        n = ang()
        s = b[pos[0]:pos[0] + n].decode()
        pos[0] += (n + 3) // 4 * 4
        return s

    TS = {1: 1, 2: 1, 3: 2, 4: 4, 5: 4, 6: 8}

    def atribut():
        tag, n = ang(), ang()
        out = {}
        for _ in range(n):
            nm, tp, cnt = nama(), ang(), ang()
            sz = TS[tp] * cnt
            raw = b[pos[0]:pos[0] + sz]
            pos[0] += (sz + 3) // 4 * 4
            out[nm] = raw.decode(errors="replace") if tp == 2 else struct.unpack(">" + "bchifd"[tp - 1] * cnt, raw)
        return out

    numrecs = ang()
    tag, n = ang(), ang()
    dims = []
    for _ in range(n):
        dims.append((nama(), ang()))
    atribut()
    tag, n = ang(), ang()
    vs = {}
    for _ in range(n):
        nm, nd = nama(), ang()
        ids = [ang() for _ in range(nd)]
        at = atribut()
        tp = ang()
        ang()  # vsize
        begin = ang("q" if off64 else "i")
        vs[nm] = ([dims[i][0] for i in ids], at, begin, tp)
    if any(n == 0 for _, n in dims):
        raise ValueError("dimensi rekaman (unlimited) tidak didukung")
    return dict(dims), vs


def baca_var(b, dims, vs, nm):
    dn, at, begin, tp = vs[nm]
    n = 1
    for d in dn:
        n *= dims[d]
    f = ">" + {1: "b", 3: "h", 4: "i", 5: "f", 6: "d"}[tp] * n
    return struct.unpack_from(f, b, begin), dn, at


def baca_chirps_nc(jalur):
    """-> X, Y, nt, miss, val (T,Y,X datar). Satu berkas = satu potongan waktu."""
    b = open(jalur, "rb").read()
    dims, vs = baca_nc3(b)
    x, _, _ = baca_var(b, dims, vs, "X")
    y, _, _ = baca_var(b, dims, vs, "Y")
    val, dn, at = baca_var(b, dims, vs, "precipitation")
    if dn != ["T", "Y", "X"]:
        raise ValueError(f"{jalur}: urutan dimensi {dn} tak dikenal")
    miss = at.get("missing_value", at.get("_FillValue", (-9999.0,)))[0]
    return list(x), list(y), dims["T"], miss, val


def chirps(*jalur):
    """satu atau lebih potongan waktu berurutan (berkas IRI .nc) -> mentah/chirps_jawa.json"""
    X = Y = None
    seri_sel, nt_total = {}, 0
    for j in jalur:
        x, y, nt, miss, val = baca_chirps_nc(j)
        if X is None:
            X, Y = x, y
        elif (x, y) != (X, Y):
            raise ValueError(f"{j}: kisi beda dengan potongan pertama")
        ny, nx = len(Y), len(X)
        for jj in range(ny):
            for i in range(nx):
                seri = [None if (v == miss or v != v) else round(v, 1) for v in (val[k * ny * nx + jj * nx + i] for k in range(nt))]
                seri_sel.setdefault(f"{jj},{i}", []).extend(seri)
        nt_total += nt
    if nt_total != len(SERI):
        raise ValueError(f"{nt_total} bulan, perlu {len(SERI)} (1991-01..2025-12)")
    out = {"X": X, "Y": Y, "mulai": SERI[0], "val": {k: v for k, v in seri_sel.items() if any(q is not None for q in v)}}
    json.dump(out, open(P_CHIRPS, "w"), separators=(",", ":"))
    print(f"CHIRPS: {len(out['val'])} sel 0,05 derajat berisi dari {len(Y)}x{len(X)}, {nt_total} bulan", file=sys.stderr)


def gabung():
    topo = json.load(open(TOPO))
    pw, ch = json.load(open(P_POWER)), json.load(open(P_CHIRPS))
    X, Y = ch["X"], ch["Y"]
    dx = (X[-1] - X[0]) / (len(X) - 1)
    dy = (Y[-1] - Y[0]) / (len(Y) - 1)
    lama = json.load(open(KELUAR))["sel"] if os.path.exists(KELUAR) else {}
    sel, et_cache, tanpa, tetangga = {}, {}, [], []
    for c in sel_semua(topo):
        la, lo = (float(v) for v in c.split(","))
        # sel 0,05 derajat yang pusatnya jatuh di sel 0,1 derajat (lat/lon -0,05..+0,05)
        isi = []
        for j, yy in enumerate(Y):
            if abs(yy - la) <= 0.05 + 1e-6:
                for i, xx in enumerate(X):
                    if abs(xx - lo) <= 0.05 + 1e-6 and f"{j},{i}" in ch["val"]:
                        isi.append(ch["val"][f"{j},{i}"])
        if not isi:   # pulau kecil: CHIRPS bertopeng laut di sini; pakai sel berdata terdekat dalam 0,3 derajat, dicatat di meta
            kand = [(math.hypot(yy - la, xx - lo), f"{j},{i}") for j, yy in enumerate(Y) if abs(yy - la) <= 0.3
                    for i, xx in enumerate(X) if abs(xx - lo) <= 0.3 and f"{j},{i}" in ch["val"]]
            if not kand or min(kand)[0] > 0.3:
                tanpa.append(c)
                continue
            isi = [ch["val"][min(kand)[1]]]
            tetangga.append({"sel": c, "jarak_derajat": round(min(kand)[0], 3)})
        p = []
        for k in range(len(SERI)):
            v = [s[k] for s in isi if s[k] is not None]
            if not v:
                raise ValueError(f"{c}: CHIRPS bulan {SERI[k]} kosong di semua sub-sel")
            p.append(round(sum(v) / len(v), 1))
        tp = titik_power(c)
        key = f"{tp[0]},{tp[1]}"
        if key not in et_cache:
            et_cache[key] = et0_seri(tp[0], pw[key]["z"], pw[key]["par"])
        d = {"p": p, "et0": et_cache[key], "elev": pw[key]["z"]}
        if c in lama:
            d["p_era5"], d["et0_era5"] = lama[c].get("p_era5", lama[c]["p"]), lama[c].get("et0_era5", lama[c]["et0"])
            d["elev_era5"] = lama[c].get("elev_era5", lama[c].get("elev"))
        sel[c] = d
    if tanpa:
        raise ValueError(f"{len(tanpa)} sel tanpa data CHIRPS (garis pantai?): {tanpa[:5]}; tangani eksplisit, bukan diisi")
    meta = {"sumber": {"p": "CHIRPS v2.0 monthly 0,05 derajat (UCSB CHC) via IRI Data Library; rerata sel 0,05 di dalam sel 0,1",
                       "et0": "FAO-56 Penman-Monteith dari rerata bulanan NASA POWER (MERRA-2, kisi 0,5 derajat x 0,625; T2M, T2M_MAX, T2M_MIN, ALLSKY_SFC_SW_DWN, RH2M, WS2M), titik 0,5 derajat terdekat, G=0; elev = elevasi sel MERRA-2"},
            "sel_hujan_tetangga": tetangga,
            "pembanding": "p_era5/et0_era5 (Open-Meteo era5_seamless) hanya di sel yang sempat ditarik (DIY)",
            "satuan": "mm/bulan", "bulan_awal": "1991-01", "bulan_akhir": "2025-12", "label": "estimasi-model",
            "ditarik": time.strftime("%Y-%m-%d")}
    json.dump({"meta": meta, "sel": sel}, open(KELUAR + ".tmp", "w"), separators=(",", ":"))
    os.replace(KELUAR + ".tmp", KELUAR)
    print(f"iklim.json: {len(sel)} sel", file=sys.stderr)


def uji():
    # ET0 tropis lembap: FAO-56 harian khas 3-5 mm/hari
    et = et0_bulan(-7.8, 100, 6, 30, 26, 30, 22.5, 18, 80, 2)
    assert 90 < et < 160, f"ET0 Juni tropis {et} mm/bln di luar 3-5 mm/hari"
    assert et0_bulan(-7.8, 100, 6, 30, 26, 30, 22.5, 18, 80, 4) > et, "angin lebih kencang harus menaikkan ET0"
    assert et0_bulan(-7.8, 100, 6, 30, 26, 30, 22.5, 12, 80, 2) < et, "radiasi lebih kecil harus menurunkan ET0"
    for kw in ({"rs": 0}, {"rh": 120}, {"tmin": 31}):
        a = dict(rs=18, rh=80, u2=2, tmin=22.5, tmax=30); a.update(kw)
        try:
            et0_bulan(-7.8, 100, 6, 30, 26, a["tmax"], a["tmin"], a["rs"], a["rh"], a["u2"])
        except ValueError:
            continue
        raise AssertionError(f"masukan salah {kw} lolos")
    assert 36.5 < ra_harian(0, 80) < 38.5, "Ra ekuator ekuinoks ~37,5 MJ/m2/hari (FAO-56)"
    # netCDF-3 sintetik: dims T=1,Y=1,X=2; var X (double), precipitation float [T,Y,X]
    def nm(s):
        r = s.encode()
        return struct.pack(">i", len(r)) + r + b"\0" * (-len(r) % 4)
    hdr = b"CDF\x01" + struct.pack(">i", 0) + struct.pack(">ii", 10, 3)
    for n_, l_ in (("T", 1), ("Y", 1), ("X", 2)):
        hdr += nm(n_) + struct.pack(">i", l_)
    hdr += struct.pack(">ii", 0, 0)
    vh = struct.pack(">ii", 11, 2)
    base = len(hdr) + len(vh) + (len(nm("X")) + 4 + 4 + 8 + 4 + 4 + 4) + (len(nm("precipitation")) + 4 + 12 + 8 + 4 + 4 + 4)
    vh += nm("X") + struct.pack(">ii", 1, 2) + struct.pack(">ii", 0, 0) + struct.pack(">iii", 6, 16, base)
    vh += nm("precipitation") + struct.pack(">i", 3) + struct.pack(">iii", 0, 1, 2) + struct.pack(">ii", 0, 0) + struct.pack(">iii", 5, 8, base + 16)
    b = hdr + vh + struct.pack(">dd", 105.0, 105.05) + struct.pack(">ff", 3.5, -9999.0)
    dims, vs = baca_nc3(b)
    assert dims == {"T": 1, "Y": 1, "X": 2}
    assert baca_var(b, dims, vs, "X")[0] == (105.0, 105.05)
    assert baca_var(b, dims, vs, "precipitation")[0] == (3.5, -9999.0)
    try:
        baca_nc3(b"HDF\x89....")
    except ValueError:
        pass
    else:
        raise AssertionError("bukan-netCDF lolos")
    assert titik_power("-7.95,110.25") == (-8.0, 110.5)
    print("ok iklim_global")


if __name__ == "__main__":
    a = sys.argv[1:]
    if a == ["uji"]:
        uji()
    elif a == ["power"]:
        power()
    elif a[:1] == ["chirps"] and len(a) >= 2:
        chirps(*a[1:])
    elif a == ["gabung"]:
        gabung()
    else:
        sys.exit(__doc__)
