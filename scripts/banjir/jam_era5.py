"""Hujan ERA5 JAM-AN (104 sel sampel kab2) + angin 10 m (u,v) kisi CENS -> data/raw/banjir/jam_era5/ (PRAREG-CAMPUR rev.5 §3.2d, §3.6 A).
Sumber identik uji_balik.py: Open-Meteo archive, models=era5, hourly=precipitation (mm/jam). Angin: wind_speed_10m (m/s) + wind_direction_10m -> u,v.
Rentang: jam WIB 2015-01-01T00 .. 2026-10-18T23 (= UTC 2014-12-31T17 .. 2026-10-18T16); tidak pernah lewat.
Berkas: hujan/<lat>_<lon>/<tahun WIB>.json.gz, angin/<lat>_<lon>/<tahun>.json.gz  = {sel, tahun, mulai_utc, mulai_wib, n, p | u,v} deret jam beruntun
dari 00:00 WIB 1 Jan tahun itu (UTC = WIB-7). manifest.json = sha256 per berkas. Satuan unduh: 1 sel (hujan) / 5 titik (angin), semua tahun;
selesai = seluruh berkas tahunnya ada. Idempoten; berhenti rapi saat kuota habis.
Kuota: bobot = jumlah_var/10 x hari/14 per lokasi, 4.310 hari: hujan ~30,8/sel (104 sel ~3.200); angin 2 var ~61,6/titik (66 titik ~4.070).
Pakai:  python3 scripts/banjir/jam_era5.py panen [hujan|angin]   |   ... status   |   ... uji   |   ... wib   (cetak contoh)
"""
import datetime as dt, gzip, hashlib, json, math, os, sys, time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from umum import MENTAH, KuotaHabis, ambil, per_lokasi

DIR = os.path.join(MENTAH, "jam_era5")
API = "https://archive-api.open-meteo.com/v1/archive"
AWAL_UTC, AKHIR_UTC = dt.datetime(2014, 12, 31, 17), dt.datetime(2026, 10, 18, 16)   # = 2015-01-01T00 .. 2026-10-18T23 WIB
TAHUN = range(2015, 2027)
HARI = (AKHIR_UTC.date() - AWAL_UTC.date()).days + 1
GRUP = {"hujan": ("precipitation", 1), "angin": ("wind_speed_10m,wind_direction_10m", 5)}   # variabel, lokasi per panggilan
CENS = (105.0, 115.0, -5.0, 0.0)   # lon0, lon1, lat0, lat1 (titik batas ikut)
LANGKAH = 1.0                      # keputusan koordinator 3 Nov 2026: grid 1 derajat (66 titik) demi kuota, bukan 0,25 (861 titik)


def sel_hujan():
    import arsip_debit
    return [s for s, _ in arsip_debit.daftar_sel()]


def titik_angin():
    n = lambda a, b: [a + LANGKAH * i for i in range(int(round((b - a) / LANGKAH)) + 1)]
    return [(la, lo) for la in n(CENS[2], CENS[3]) for lo in n(CENS[0], CENS[1])]


def bobot(jenis, n):
    return len(GRUP[jenis][0].split(",")) / 10 * HARI / 14 * n


def jalur(jenis, s, y):
    return os.path.join(DIR, jenis, f"{s[0]:.3f}_{s[1]:.3f}", f"{y}.json.gz")


def mulai_utc(y):
    return dt.datetime(y - 1, 12, 31, 17)


def jam_tahun(y):
    return (dt.datetime(y + 1, 1, 1) - dt.datetime(y, 1, 1)).days * 24 if y < 2026 else \
        int((dt.datetime(2026, 10, 18, 23) - dt.datetime(2026, 1, 1)).total_seconds() // 3600) + 1


def selesai(jenis, s):
    return all(os.path.exists(jalur(jenis, s, y)) for y in TAHUN)


def tulis(p, isi):
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with gzip.open(p + ".tmp", "wt") as f:
        json.dump(isi, f, separators=(",", ":"))
    os.replace(p + ".tmp", p)


def pecah(jenis, s, d):
    """Respons satu lokasi (timezone UTC) -> {tahun: isi}. Menolak deret tak utuh / waktu tak beruntun."""
    h = d["hourly"]
    t0 = dt.datetime.fromisoformat(h["time"][0])
    n = (AKHIR_UTC - AWAL_UTC).days * 24 + (AKHIR_UTC - AWAL_UTC).seconds // 3600 + 1
    # respons mulai 00 UTC 31 Des 2014 s/d 23 UTC 18 Okt 2026: potong ke jendela WIB
    a = int((AWAL_UTC - t0).total_seconds() // 3600)
    if a < 0 or a + n > len(h["time"]) or any(len(h[k]) != len(h["time"]) for k in h if k != "time"):
        raise ValueError(f"deret jam tidak utuh: {len(h['time'])} jam dari {t0}")
    if h["time"][a] != AWAL_UTC.strftime("%Y-%m-%dT%H:%M") or h["time"][a + n - 1] != AKHIR_UTC.strftime("%Y-%m-%dT%H:%M"):
        raise ValueError("batas waktu respons tidak cocok")
    if jenis == "hujan":
        v = {"p": [round(x or 0, 2) for x in h["precipitation"][a:a + n]]}
    else:
        ws, wd = h["wind_speed_10m"][a:a + n], h["wind_direction_10m"][a:a + n]
        r = [math.radians(x or 0) for x in wd]
        v = {"u": [round(-(w or 0) * math.sin(x), 3) for w, x in zip(ws, r)],
             "v": [round(-(w or 0) * math.cos(x), 3) for w, x in zip(ws, r)]}
    out, i = {}, 0
    for y in TAHUN:
        m = jam_tahun(y)
        w0 = mulai_utc(y)
        out[y] = {"sel": list(s), "tahun": y, "mulai_utc": w0.isoformat(timespec="minutes"),
                  "mulai_wib": (w0 + dt.timedelta(hours=7)).isoformat(timespec="minutes"), "n": m,
                  **{k: x[i:i + m] for k, x in v.items()}}
        i += m
    assert i == n, f"jam terbagi {i} != {n}"
    return out


def panen(jenis, fetch=ambil, tidur=time.sleep):
    var, per = GRUP[jenis]
    semua = sel_hujan() if jenis == "hujan" else titik_angin()
    sisa = [s for s in semua if not selesai(jenis, s)]
    i, k = map(int, os.environ.get("JAM_BAGIAN", "0/1").split("/"))   # proses paralel: pecahan i dari k (server lambat, bukan kuota, yang menahan)
    sisa = sisa[i::k]
    print(f"{jenis}: {len(semua)} lokasi, {len(sisa)} belum (~{bobot(jenis, len(sisa)):.0f} bobot kuota)", file=sys.stderr)
    for a in range(0, len(sisa), per):
        bag = sisa[a:a + per]
        url = (f"{API}?latitude={','.join(str(s[0]) for s in bag)}&longitude={','.join(str(s[1]) for s in bag)}"
               f"&start_date={AWAL_UTC.date()}&end_date={AKHIR_UTC.date()}&hourly={var}&models=era5&timezone=UTC"
               + ("&wind_speed_unit=ms" if jenis == "angin" else ""))
        try:
            data = per_lokasi(fetch(url, batas_waktu=600))
            assert len(data) == len(bag), f"{len(data)} lokasi kembali, diminta {len(bag)}"
            hasil = [pecah(jenis, s, d) for s, d in zip(bag, data)]
        except KuotaHabis as e:
            print(f"berhenti, kuota habis ({str(e)[:120]}); lanjut nanti dari cache", file=sys.stderr)
            break
        for s, per_th in zip(bag, hasil):
            for y, isi in per_th.items():
                tulis(jalur(jenis, s, y), isi)
        manifest()
        print(f"  {jenis} {a + len(bag)}/{len(sisa)}", file=sys.stderr)
        tidur(bobot(jenis, len(bag)) / 10)   # 600 bobot/menit
    manifest()
    return status()


def manifest():
    m = {}
    for r, _, fs in os.walk(DIR):
        for f in fs:
            if f.endswith(".json.gz"):
                p = os.path.join(r, f)
                m[os.path.relpath(p, DIR)] = hashlib.sha256(open(p, "rb").read()).hexdigest()
    tulis_json = os.path.join(DIR, "manifest.json")
    with open(tulis_json + f".{os.getpid()}.tmp", "w") as f:
        json.dump({"grid_angin": {"kotak": {"lon": CENS[:2], "lat": CENS[2:]}, "langkah_derajat": LANGKAH, "titik": len(titik_angin())},
                   "sumber": "Open-Meteo archive models=era5 timezone=UTC; jendela 2015-01-01T00 .. 2026-10-18T23 WIB",
                   "sha256": dict(sorted(m.items()))}, f, indent=0)
    os.replace(tulis_json + f".{os.getpid()}.tmp", tulis_json)


def status():
    out = {}
    for j, daf in (("hujan", sel_hujan()), ("angin", titik_angin())):
        ok = sum(selesai(j, s) for s in daf)
        out[j] = f"{ok}/{len(daf)} lokasi selesai"
    return out


def baca(jenis, s, y):
    with gzip.open(jalur(jenis, s, y), "rt") as f:
        return json.load(f)


def jam_wib(isi):
    t0 = dt.datetime.fromisoformat(isi["mulai_wib"])
    return [t0 + dt.timedelta(hours=i) for i in range(isi["n"])]


def uji():
    import tempfile
    global DIR
    DIR = tempfile.mkdtemp()
    # konstanta waktu
    assert HARI == 4310
    n = (AKHIR_UTC - AWAL_UTC).days * 24 + (AKHIR_UTC - AWAL_UTC).seconds // 3600 + 1
    assert sum(jam_tahun(y) for y in TAHUN) == n, (sum(jam_tahun(y) for y in TAHUN), n)
    assert dt.datetime(2026, 10, 18, 16) + dt.timedelta(hours=7) == dt.datetime(2026, 10, 18, 23)
    # respons palsu: UTC 2014-12-31T00 .. 2026-10-18T23; hujan 1 mm tiap jam WIB 00 (= UTC 17)
    t0 = dt.datetime(2014, 12, 31)
    nr = (dt.datetime(2026, 10, 18, 23) - t0).days * 24 + 24
    waktu = [(t0 + dt.timedelta(hours=i)).strftime("%Y-%m-%dT%H:%M") for i in range(nr)]
    s = (-6.125, 106.625)

    def palsu(url, batas_waktu=0):
        if "precipitation" in url:
            return {"hourly": {"time": waktu, "precipitation": [1.0 if (t0 + dt.timedelta(hours=i)).hour == 17 else 0.0 for i in range(nr)]}}
        return {"hourly": {"time": waktu, "wind_speed_10m": [2.0] * nr, "wind_direction_10m": [90.0] * nr}}   # dari timur -> u<0
    per_th = pecah("hujan", s, palsu("precipitation"))
    assert sorted(per_th) == list(TAHUN) and per_th[2015]["n"] == 8760 and per_th[2026]["n"] == 291 * 24
    jam = jam_wib(per_th[2024])
    assert jam[0] == dt.datetime(2024, 1, 1, 0) and jam[-1] == dt.datetime(2024, 12, 31, 23) and len(jam) == 8784
    assert max(jam_wib(per_th[2026])) == dt.datetime(2026, 10, 18, 23)
    assert per_th[2015]["mulai_utc"] == "2014-12-31T17:00" and per_th[2015]["mulai_wib"] == "2015-01-01T00:00"
    for y, i in per_th.items():     # tiap hari WIB tepat 24 jam, 1 mm jam 00 WIB => jumlah harian 1 mm
        assert i["n"] % 24 == 0 and i["n"] == len(i["p"])
        hari = [sum(i["p"][k:k + 24]) for k in range(0, i["n"], 24)]
        assert all(abs(h - 1) < 1e-9 for h in hari), y
    a = pecah("angin", s, palsu("wind"))[2020]
    assert abs(a["u"][0] + 2.0) < 1e-3 and abs(a["v"][0]) < 1e-3
    # kasus rusak ditolak
    bad = palsu("precipitation"); bad["hourly"]["time"] = bad["hourly"]["time"][:-5]
    try:
        pecah("hujan", s, bad); raise SystemExit("deret terpotong lolos")
    except (ValueError, AssertionError):
        pass
    assert len(titik_angin()) == 11 * 6 and len(sel_hujan()) == 104
    # panen idempoten + berhenti saat kuota habis, lewat DIR sementara
    panggilan = []

    def f(url, batas_waktu=0):
        panggilan.append(url)
        if len(panggilan) == 3:
            raise KuotaHabis("Daily API request limit exceeded")
        return palsu(url)
    g = dict(GRUP)
    panen("hujan", f, lambda x: None)
    assert len(panggilan) == 3 and sum(selesai("hujan", x) for x in sel_hujan()) == 2
    panen("hujan", lambda u, batas_waktu=0: palsu(u), lambda x: None)
    assert selesai("hujan", sel_hujan()[-1]) and all(selesai("hujan", x) for x in sel_hujan())
    mf = json.load(open(os.path.join(DIR, "manifest.json")))
    assert mf["grid_angin"]["titik"] == 66 and len(mf["sha256"]) == 104 * 12 and all(len(v) == 64 for v in mf["sha256"].values())
    print("uji jam_era5 OK")


def banding(n=3):
    """Bandingkan jumlah harian WIB cache jam dengan p harian cache uji_balik (butuh kedua cache). -> selisih terbesar mm."""
    import uji_balik as ub
    sel_ok = [s for s in sel_hujan() if selesai("hujan", s) and os.path.exists(ub.jalur(*s))][:n]
    for s in sel_ok:
        d = json.load(gzip.open(ub.jalur(*s), "rt"))
        p = d["p"] if "p" in d else ub.deret(d)["p"]
        mulai = ub.AWAL
        mx = 0
        for y in range(2016, 2026):
            i = baca("hujan", s, y)
            hari0 = dt.date(y, 1, 1)
            for k in range(0, i["n"], 24):
                idx = (hari0 + dt.timedelta(days=k // 24) - mulai).days
                mx = max(mx, abs(sum(i["p"][k:k + 24]) - p[idx]))
        print(f"{s}: selisih harian maks {mx:.3f} mm")
    print(f"{len(sel_ok)} sel dibandingkan")
    return len(sel_ok)


if __name__ == "__main__":
    c = sys.argv[1] if len(sys.argv) > 1 else "status"
    if c == "uji":
        uji()
    elif c == "banding":
        banding()
    elif c == "panen":
        for j in (sys.argv[2:] or ["hujan", "angin"]):
            print(panen(j))
    else:
        print(status())
