"""Uji ulang #9 (MOS) dan #10 (ensambel CAMS+GEOS-CF) dengan arsip OpenAQ multi-tahun (#44) -> public/udara/data/uji_panen_pm25.json

Aturan SAMA seperti pm25_mos.py (dinyatakan di muka, tidak diubah): pembagian WAKTU 60/40, LOLOS hanya bila MAE uji lebih kecil DAN batas atas selang 95% bootstrap-per-tanggal < 0
  - MOS      : lawan CAMS mentah DAN klimatologi stasiun (rata-rata latih per stasiun)
  - Ensambel : ensambel koreksi-bias lawan anggota terbaik
Tambahan pembanding yang diminta: persistensi 24 jam (obs kemarin) dan klimatologi stasiun-jam-hari (rata-rata latih per stasiun x jam lokal) dilaporkan sebagai angka, tanpa mengubah vonis.
Masukan : data/raw/udara/openaq_arsip/*.json (openaq_arsip.py); CAMS = Open-Meteo Air Quality historis (ANALISIS jam, bukan prakiraan); angin/hujan = Open-Meteo Archive (ERA5/ECMWF IFS);
          GEOS-CF ana/ hanya sejak 4 Agu 2025 -> ensambel diuji pada jendela itu saja.
Pakai   : python3 scripts/udara/uji_panen.py | uji
"""
import concurrent.futures as cf, datetime as dt, glob, json, math, os, sys, threading, time, urllib.parse, urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import alat, pm25_mos as m

MULAI_CAMS = "2022-08-01"
GCF_AWAL = dt.datetime(2025, 8, 5)
MIN_JAM = 1500    # stasiun dengan jam lebih sedikit dari ini dibuang
CACHE = os.path.join(alat.RAW, "uji_panen_cache.json")
GCF_CACHE = os.path.join(alat.RAW, "uji_panen_gcf.json")


def muat_stasiun(awal="2022-08-01"):
    out = {}
    for p in glob.glob(os.path.join(alat.RAW, "openaq_arsip", "*.json")):
        d = json.load(open(p))
        if not (-11.5 <= d["lat"] <= 6.5 and 94 <= d["lon"] <= 142):   # iso=ID memuat sensor salah-tag (mis. Svishtov, Bulgaria)
            continue
        # arsip menstempel PENUTUP periode; geser -1 jam = awal periode (sama dengan datetimeFrom API v3 dan konvensi CAMS jam-mulai)
        h = {m.jam_iso(dt.datetime.strptime(j, "%Y-%m-%dT%H") - dt.timedelta(hours=1)): v for j, v in d["h"].items() if j >= awal}
        if len(h) >= MIN_JAM:
            out[f"OAQ{d['id']}"] = {"lat": d["lat"], "lon": d["lon"], "h": h, "nama": d["nama"], "penyedia": d["penyedia"]}
    return out


def _cache_get(kunci, fn):
    c = json.load(open(CACHE)) if os.path.exists(CACHE) else {}
    if kunci not in c:
        c[kunci] = fn()
        os.makedirs(alat.RAW, exist_ok=True)
        json.dump(c, open(CACHE + ".tmp", "w"), separators=(",", ":"))
        os.replace(CACHE + ".tmp", CACHE)
    return c[kunci]


def _potong(a, b, hari=150):
    t = dt.date.fromisoformat(a)
    z = dt.date.fromisoformat(b)
    while t <= z:
        u = min(t + dt.timedelta(days=hari - 1), z)
        yield t.isoformat(), u.isoformat()
        t = u + dt.timedelta(days=1)


def cams_historis(sid, la, lo, a, b):
    """CAMS pm2_5 + angin + hujan per jam GMT untuk satu titik. -> {jam: {cams, co, angin, hujan}}."""
    out = {}
    for s, e in _potong(a, b):
        q = {"latitude": f"{la:.3f}", "longitude": f"{lo:.3f}", "start_date": s, "end_date": e, "timezone": "GMT"}
        aq = _cache_get(f"aq|{sid}|{s}|{e}", lambda: m.coba(lambda: alat.ambil(m.URL_AQ + "?" + urllib.parse.urlencode({**q, "hourly": "pm2_5,carbon_monoxide"}))))
        mt = _cache_get(f"mt|{sid}|{s}|{e}", lambda: m.coba(lambda: alat.ambil("https://archive-api.open-meteo.com/v1/archive?" + urllib.parse.urlencode({**q, "hourly": "wind_speed_10m,precipitation"}))))
        time.sleep(1.5)
        g = {w[:13]: k for k, w in enumerate(mt["hourly"]["time"])}
        for k, w in enumerate(aq["hourly"]["time"]):
            j = g.get(w[:13])
            out[w[:13]] = {"cams": aq["hourly"]["pm2_5"][k], "co": aq["hourly"]["carbon_monoxide"][k],
                           "angin": mt["hourly"]["wind_speed_10m"][j] if j is not None else None, "hujan": mt["hourly"]["precipitation"][j] if j is not None else None}
    return out


LANGKAH = 6        # GEOS-CF diambil tiap 6 jam (00/06/12/18 UTC): server OPeNDAP ~0,11 dtk per jam-data, 720 jam sekali minta = HTTP 500/timeout (diukur 30 Okt 2026)
POTONG = 480       # jam kalender per permintaan (~80 titik); 1000 jam + 4 utas -> HTTP 502 dari proxy NCCS
_kunci = threading.Lock()


def gcf_sel(iy, ix, a, b):
    """GEOS-CF ana/ pm25_rh35 satu sel kisi, jam kalender [a,b] (datetime GMT), langkah LANGKAH jam. Potongan di-cache (aman utas); galat dilempar -> sel diulang di putaran berikut."""
    out = {}
    t0 = dt.datetime(2025, 8, 4, 9)
    i, z = int((a - t0).total_seconds() // 3600), int((b - t0).total_seconds() // 3600)
    i += (-i) % LANGKAH     # selaraskan ke kelipatan langkah dari t0 supaya semua stasiun memakai jam yang sama
    while i <= z:
        j = min(i + POTONG, z)
        j -= (j - i) % LANGKAH
        k = f"anaS|{iy}|{ix}|{i}|{LANGKAH}|{j}"
        with _kunci:
            c = json.load(open(GCF_CACHE)) if os.path.exists(GCF_CACHE) else {}
        if k not in c:
            q = f"pm25_rh35[{i}:{LANGKAH}:{j}][0][{iy}][{ix}]"
            try:
                teks = m.coba(lambda: urllib.request.urlopen(urllib.request.Request(m.ANA + ".ascii?" + urllib.parse.quote(q, safe=""), headers={"User-Agent": alat.UA}), timeout=120).read().decode(), n=3, dasar=5)
            except Exception as e:   # potongan gagal dilewati (tidak di-cache, diulang di jalan berikut); cakupan dilaporkan jujur
                print(f"  GEOS-CF potongan {iy},{ix},{i} dilewati: {type(e).__name__}", file=sys.stderr)
                i = j + LANGKAH
                continue
            with _kunci:
                c = json.load(open(GCF_CACHE)) if os.path.exists(GCF_CACHE) else {}
                c[k] = m.urai_dap(teks, "pm25_rh35")
                json.dump(c, open(GCF_CACHE + ".tmp", "w"), separators=(",", ":"))
                os.replace(GCF_CACHE + ".tmp", GCF_CACHE)
        out.update(c[k])
        i = j + LANGKAH
    return out


def gcf_semua(st, a, b, maks_sel=8):   # 8 sel ~ 35 menit; 16 sel ~ 80 menit (server NCCS lambat)
    """Pilih sel kisi unik dengan jam obs terbanyak di jendela [a,b] (maks_sel), tarik paralel 2 utas -> {id stasiun: {jam: gcf}} untuk stasiun di sel terpilih."""
    sel = {}
    for i, s in st.items():
        n = sum(1 for j in s["h"] if j >= a.strftime("%Y-%m-%dT%H"))
        sel.setdefault(m.idx_kisi(s["lat"], s["lon"]), []).append((i, n))
    pilih = sorted(sel, key=lambda c: -sum(n for _, n in sel[c]))[:maks_sel]
    pilih = [c for c in pilih if sum(n for _, n in sel[c]) >= 500]
    with cf.ThreadPoolExecutor(2) as kolam:
        hasil = dict(zip(pilih, kolam.map(lambda c: gcf_sel(c[0], c[1], a, b), pilih)))
    return {i: hasil[c] for c in pilih for i, _ in sel[c]}, len(pilih)


def persistensi(baris, U):
    idx = {(r[1], r[0]): r[2] for r in baris}
    gal = []
    for r in U:
        v = idx.get((r[1], m.jam_iso(dt.datetime.strptime(r[0], "%Y-%m-%dT%H") - dt.timedelta(hours=24))))
        if v is not None:
            gal.append(abs(v - r[2]))
    return (round(sum(gal) / len(gal), 2), len(gal)) if len(gal) > 30 else (None, len(gal))


def klim_jam(baris, U, sp):
    """Rata-rata latih per (stasiun, jam lokal WIB) -> MAE uji."""
    s = {}
    for r in baris:
        if r[0] <= sp:
            s.setdefault((r[1], (int(r[0][11:13]) + 7) % 24), []).append(r[2])
    s = {k: sum(v) / len(v) for k, v in s.items()}
    gal = [abs(s[(r[1], (int(r[0][11:13]) + 7) % 24)] - r[2]) for r in U if (r[1], (int(r[0][11:13]) + 7) % 24) in s]
    return round(sum(gal) / len(gal), 2) if gal else None


def musim(baris, f_nama):
    """MAE per bulan uji untuk dua prediktor sederhana (cams mentah, obs) -> sekadar konteks musim: rata-rata obs per bulan."""
    per = {}
    for r in baris:
        per.setdefault(r[0][:7], []).append(r[2])
    return {k: round(sum(v) / len(v), 1) for k, v in sorted(per.items())}


def jalankan():
    st = muat_stasiun()
    print(len(st), "stasiun dengan >=", MIN_JAM, "jam;", sum(len(s["h"]) for s in st.values()), "jam total")
    cams = {}
    for i, s in st.items():
        a, b = min(s["h"])[:10], max(s["h"])[:10]
        cams[i] = cams_historis(i, s["lat"], s["lon"], max(a, MULAI_CAMS), b)
    # --- MOS: semua jam dengan obs+CAMS+angin (gcf diisi 0, tak dipakai) ---
    nol = {i: {j: 0.0 for j in s["h"]} for i, s in st.items()}
    bm = m.gabung_titik(st, cams, nol)
    mos = m.uji_mos(bm)
    if mos:
        sp = mos["split_jam_latih_terakhir"]
        U = [r for r in bm if r[0] > sp]
        mos["mae_uji"]["persistensi_24j"], mos["n_persistensi"] = persistensi(bm, U)
        mos["mae_uji"]["klimatologi_stasiun_jam"] = klim_jam(bm, U, sp)
        mos["rentang"] = [min(r[0] for r in bm), max(r[0] for r in bm)]
        mos["rata_obs_per_bulan"] = musim(bm, None)
    # --- ensambel: hanya jendela GEOS-CF (>= 5 Agu 2025) ---
    gcf, n_sel = gcf_semua(st, GCF_AWAL, dt.datetime.fromisoformat(max(max(s["h"]) for s in st.values()) + ":00:00"))
    print("GEOS-CF:", n_sel, "sel kisi,", len(gcf), "stasiun")
    be = m.gabung_titik({i: {**s, "h": {j: v for j, v in s["h"].items() if j >= GCF_AWAL.strftime("%Y-%m-%dT%H")}} for i, s in st.items()}, cams, gcf)
    ens = m.uji_ensambel(be)
    if ens:
        sp = ens["split_jam_latih_terakhir"]
        U = [r for r in be if r[0] > sp]
        ens["mae_uji"]["klimatologi_stasiun_jam"] = klim_jam(be, U, sp)
        ens["rentang"] = [min(r[0] for r in be), max(r[0] for r in be)]
        ens["rata_obs_per_bulan"] = musim(be, None)
    hasil = {"v": 1, "dibuat": dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%MZ"),
             "atribusi": "OpenAQ (openaq.org) dan penyedia asalnya (arsip AWS Open Data); CAMS via Open-Meteo; NASA GMAO GEOS-CF. Uji: Centurisk97.",
             "stasiun": [{"id": i, "nama": s["nama"], "penyedia": s["penyedia"], "lat": round(s["lat"], 3), "lon": round(s["lon"], 3), "jam": len(s["h"])} for i, s in sorted(st.items())],
             "catatan": "CAMS = analisis jam historis (bukan prakiraan); GEOS-CF = analisis (ana/); stasiun murah (AirGradient/Clarity) dominan; kisi 0,25 deg dan 0,4 deg jauh lebih kasar dari titik sensor.",
             "mos": mos, "ensambel": ens}
    alat.simpan("uji_panen_pm25.json", hasil)
    for k in ("mos", "ensambel"):
        if hasil[k]:
            print(k, hasil[k]["vonis"], hasil[k]["alasan"], hasil[k]["mae_uji"], "n_uji", hasil[k]["n_uji"], "n_stasiun", hasil[k]["n_stasiun"], hasil[k]["rentang"])
        else:
            print(k, "data tak cukup")


def uji():
    m.uji()
    b = [("2026-01-01T00", "a", 10, 1, 1, 1, 0), ("2026-01-02T00", "a", 20, 1, 1, 1, 0), ("2026-01-03T00", "a", 30, 1, 1, 1, 0)] * 20
    p, n = persistensi([("2026-01-%02dT%02d" % (d, h), "a", d * 10 + h, 0, 0, 0, 0) for d in range(1, 6) for h in range(24)], [("2026-01-05T%02d" % h, "a", 50 + h, 0, 0, 0, 0) for h in range(24)] * 2)
    assert p == 10 and n > 30, (p, n)
    assert list(_potong("2025-01-01", "2025-01-10", 4)) == [("2025-01-01", "2025-01-04"), ("2025-01-05", "2025-01-08"), ("2025-01-09", "2025-01-10")]
    print("uji_panen uji ok")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else jalankan()
