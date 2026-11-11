"""Uji balik ECMWF AIFS vs IFS vs GFS, hujan harian >= 20 mm, waktu-tunda 1-3 hari -> public/banjir/data/uji_aifs.json (vonis untuk ansambel_hujan.py)

Kriteria beku di PRAREG-AIFS.md (ditulis SEBELUM skrip ini dijalankan pada data nyata). Prakiraan: Open-Meteo previous-runs (deterministik, jam-an
dijumlah per hari WIB); kebenaran: ERA5 archive-api. Stdlib saja.

Pakai:  python3 scripts/banjir/uji_aifs.py [--mulai 2025-03-01] [--titik 30]     (kuota ~5.000 satuan Open-Meteo; hasil mentah di-cache)
        python3 scripts/banjir/uji_aifs.py uji                                   (tanpa jaringan)
"""
from concurrent.futures import ThreadPoolExecutor
import datetime as dt, hashlib, json, os, random, sys, urllib.parse

sys.path.insert(0, os.path.dirname(__file__))
from umum import KELUAR, MENTAH, WIB, ambil, baca, per_lokasi, simpan

PREV = "https://previous-runs-api.open-meteo.com/v1/forecast"
ERA = "https://archive-api.open-meteo.com/v1/archive"
MODEL = {"aifs": "ecmwf_aifs025_single", "ifs": "ecmwf_ifs025", "gfs": "gfs_global"}   # previous-runs: gfs025 kosong (semua null), gfs_global ada; ketahuan 11 Nov sebelum ada skor
LEAD, AMBANG, N_HARI_MIN, N_KEJ_MIN, MARGIN = (1, 2, 3), 20.0, 365, 300, -0.03
BERKAS, CACHE = os.path.join(KELUAR, "uji_aifs.json"), os.path.join(MENTAH, "aifs_uji")


def harian(jam, n_jam=24):
    """{'tgl': mm} dari deret jam-an [(waktu ISO, mm)]; hari dengan < n_jam nilai ada dibuang (tidak diisi nol)."""
    s, c = {}, {}
    for w, v in jam:
        if v is not None:
            s[w[:10]] = s.get(w[:10], 0.0) + v
            c[w[:10]] = c.get(w[:10], 0) + 1
    return {t: round(x, 2) for t, x in s.items() if c[t] == n_jam}


def ets(a, b, c, d):
    n = a + b + c + d
    if not n:
        return None
    ar = (a + b) * (a + c) / n
    pen = a + b + c - ar
    return None if pen == 0 else (a - ar) / pen


def kontingensi(pasang, idx):
    """pasang [(prakiraan, benar)] pada indeks idx -> (a, b, c, d) dengan AMBANG."""
    a = b = c = d = 0
    for i in idx:
        f, o = pasang[i]
        f, o = f >= AMBANG, o >= AMBANG
        a, b, c, d = a + (f and o), b + (f and not o), c + (o and not f), d + (not f and not o)
    return a, b, c, d


def bootstrap(per_hari, fungsi, ulang=1000, blok=7, benih=7):
    """per_hari {tgl: [sel-hari idx]} -> selang 95% fungsi(daftar idx) dengan blok-bergerak atas hari (urut). fungsi mengembalikan angka atau None."""
    hari = sorted(per_hari)
    r, hasil = random.Random(benih), []
    for _ in range(ulang):
        pilih = []
        while len(pilih) < len(hari):
            a = r.randrange(max(1, len(hari) - blok + 1))
            pilih += hari[a:a + blok]
        v = fungsi([i for t in pilih[:len(hari)] for i in per_hari[t]])
        if v is not None:
            hasil.append(v)
    hasil.sort()
    return (hasil[int(.025 * len(hasil))], hasil[int(.975 * len(hasil)) - 1]) if len(hasil) > 100 else (None, None)


def nilai(data, lead):
    """data {model: {(titik, tgl): mm}}, benar {(titik, tgl): mm} -> pasangan per model pada sel-hari yang ADA di ketiganya + ERA5."""
    ks = set(data["era"])
    for m in MODEL:
        ks &= set(data[m][lead])
    ks = sorted(ks)
    return ks, {m: [(data[m][lead][k], data["era"][k]) for k in ks] for m in MODEL}


def vonis(data):
    """Aturan PRAREG-AIFS.md butir 1-3 -> dict hasil per waktu-tunda dan vonis."""
    out, ok, cukup = {}, True, True
    for lead in LEAD:
        ks, ps = nilai(data, lead)
        hari = {}
        for i, (_, t) in enumerate(ks):
            hari.setdefault(t, []).append(i)
        idx = list(range(len(ks)))
        e = {m: ets(*kontingensi(ps[m], idx)) for m in MODEL}
        n_kej = sum(o >= AMBANG for _, o in ps["aifs"])
        ci_a = bootstrap(hari, lambda ix: ets(*kontingensi(ps["aifs"], ix)))
        ci_i = bootstrap(hari, lambda ix: _selisih(ps, ix, "ifs"))
        r = {"n_sel_hari": len(ks), "n_hari": len(hari), "n_kejadian": n_kej, "ets": {m: _b(e[m]) for m in MODEL},
             "ci95_ets_aifs": [_b(x) for x in ci_a], "ci95_selisih_aifs_ifs": [_b(x) for x in ci_i],
             "ets_sekunder_50mm": {m: _b(_ets50(ps[m])) for m in MODEL},
             "bias_mm": {m: _b(sum(f - o for f, o in ps[m]) / len(ks)) if ks else None for m in MODEL},
             "mae_mm": {m: _b(sum(abs(f - o) for f, o in ps[m]) / len(ks)) if ks else None for m in MODEL}}
        if lead == LEAD[0] and (len(hari) < N_HARI_MIN or n_kej < N_KEJ_MIN):
            cukup = False
        a = ci_a[0] is not None and ci_a[0] > 0
        b = ci_i[0] is not None and ci_i[0] > MARGIN
        c = e["aifs"] is not None and e["gfs"] is not None and e["aifs"] >= e["gfs"]
        r["syarat"] = {"a_ets_aifs_positif": a, "b_tak_inferior_ifs": b, "c_tak_di_bawah_gfs": c}
        ok = ok and a and b and c
        out[str(lead)] = r
    return out, ("BELUM CUKUP DATA" if not cukup else "LOLOS" if ok else "TIDAK LOLOS")


def _b(x):
    return None if x is None else round(x, 4)


def _selisih(ps, ix, lawan):
    x, y = ets(*kontingensi(ps["aifs"], ix)), ets(*kontingensi(ps[lawan], ix))
    return None if x is None or y is None else x - y


def _ets50(p):
    global AMBANG
    s, AMBANG = AMBANG, 50.0
    try:
        return ets(*kontingensi(p, range(len(p))))
    finally:
        AMBANG = s


# ------------------------------------------------------------------ pengambilan data (jaringan)
def pilih_titik(n):
    g = (baca(os.path.join(KELUAR, "hujan.json")) or sys.exit("hujan.json belum ada"))["grid"]
    g = sorted(g, key=lambda x: (x["lat"], x["lon"]))
    return [(x["lat"], x["lon"]) for x in g[::max(1, len(g) // n)]][:n]


def tarik(titik, mulai, akhir):
    """-> data {model: {lead: {(i, tgl): mm}}, 'era': {(i, tgl): mm}} (cache per model di data/raw/banjir/aifs_uji/)."""
    os.makedirs(CACHE, exist_ok=True)
    data = {"era": {}, **{m: {l: {} for l in LEAD} for m in MODEL}}
    PB = 3

    def satu(a):
        b = titik[a:a + PB]
        lok = {"latitude": ",".join(str(x[0]) for x in b), "longitude": ",".join(str(x[1]) for x in b), "start_date": mulai, "end_date": akhir, "timezone": "Asia/Jakarta"}
        era = per_lokasi(_cache(f"era_{a}", ERA + "?" + urllib.parse.urlencode({**lok, "daily": "precipitation_sum"})))
        hv = ",".join(f"precipitation_previous_day{l}" for l in LEAD)
        res = {m: per_lokasi(_cache(f"{m}_{a}", PREV + "?" + urllib.parse.urlencode({**lok, "models": nama, "hourly": hv}))) for m, nama in MODEL.items()}
        return a, era, res

    with ThreadPoolExecutor(4) as ex:   # panggilan panjang lambat di sisi server (~3 menit); paralel antar kelompok titik
        for a, era, res in ex.map(satu, range(0, len(titik), PB)):
            for j, d in enumerate(era):
                for t, v in zip(d["daily"]["time"], d["daily"]["precipitation_sum"]):
                    if v is not None:
                        data["era"][(a + j, t)] = v
            for m in MODEL:
                for j, d in enumerate(res[m]):
                    for l in LEAD:
                        h = d["hourly"][f"precipitation_previous_day{l}"]
                        for t, v in harian(zip(d["hourly"]["time"], h)).items():
                            data[m][l][(a + j, t)] = v
            print(f"  titik {min(a + PB, len(titik))}/{len(titik)}", file=sys.stderr)
    return data


def _cache(nama, url):
    f = os.path.join(CACHE, f"{nama}_{hashlib.md5(url.encode()).hexdigest()[:10]}.json")
    if os.path.exists(f):
        return json.load(open(f))
    r = ambil(url, batas_waktu=240)
    json.dump(r, open(f, "w"))
    return r


def main(mulai, n):
    akhir = (dt.datetime.now(WIB).date() - dt.timedelta(days=4)).isoformat()
    lama = baca(BERKAS, {}) or {}
    data = tarik(pilih_titik(n), mulai, akhir)
    # hari awal = hari paling awal yang AIFS punya nilai (PRAREG: "mulai dari hari paling awal yang ada pada AIFS")
    for m in MODEL:
        if not data[m][LEAD[0]]:
            sys.exit(f"model {MODEL[m]} tanpa data di previous-runs: tidak ada vonis")
    hasil, v = vonis(data)
    kunci = lama.get("vonis_kunci") or (v if v in ("LOLOS", "TIDAK LOLOS") else None)
    awal = min((t for l in data["aifs"].values() for _, t in l), default=None)
    simpan(BERKAS, {"dibuat": dt.datetime.now(WIB).isoformat(timespec="minutes"), "prareg": "scripts/banjir/PRAREG-AIFS.md", "vonis_hitung": v,
                    "vonis": kunci or v, "vonis_kunci": kunci, "periode": [awal, akhir], "titik": n, "ambang_mm": AMBANG,
                    "kebenaran": "ERA5 (reanalisis; berbagi fisika dengan IFS, mungkin menguntungkan IFS)",
                    "catatan": "prakiraan deterministik (previous-runs tidak menyimpan anggota ansambel)", "waktu_tunda": hasil})
    print(v, "kunci:", kunci, hasil["1"]["ets"], f"hari={hasil['1']['n_hari']} kejadian={hasil['1']['n_kejadian']}")


def uji():
    j = [(f"2026-01-01T{h:02d}:00", 1.0) for h in range(24)] + [(f"2026-01-02T{h:02d}:00", 1.0) for h in range(23)] + [("2026-01-03T00:00", None)]
    assert harian(j) == {"2026-01-01": 24.0}, harian(j)
    assert ets(1, 0, 0, 3) is not None and round(ets(2, 0, 0, 2), 2) == 1.0 and ets(0, 0, 0, 4) is None
    assert kontingensi([(30, 25), (30, 5), (5, 25), (5, 5)], range(4)) == (1, 1, 1, 1)
    # data buatan: AIFS sempurna, IFS sempurna, GFS acak -> LOLOS bila cukup data; sedikit data -> BELUM CUKUP
    r = random.Random(1)
    def buat(nh):
        d = {"era": {}, **{m: {l: {} for l in LEAD} for m in MODEL}}
        for t in range(nh):
            for i in range(4):
                o = 30.0 if r.random() < .3 else 1.0
                d["era"][(i, t)] = o
                for m in MODEL:
                    for l in LEAD:
                        d[m][l][(i, t)] = o if m != "gfs" else (30.0 if r.random() < .3 else 1.0)
        return d
    hasil, v = vonis(buat(400))
    assert v == "LOLOS" and hasil["1"]["ets"]["aifs"] == 1.0, (v, hasil["1"]["ets"])
    assert vonis(buat(50))[1] == "BELUM CUKUP DATA"
    d = buat(400)
    for k in d["aifs"][2]:
        d["aifs"][2][k] = 1.0                      # AIFS buta di waktu-tunda 2 -> TIDAK LOLOS
    assert vonis(d)[1] == "TIDAK LOLOS"
    print("ok uji_aifs")


if __name__ == "__main__":
    a = sys.argv[1:]
    if a == ["uji"]:
        uji()
    else:
        main(a[a.index("--mulai") + 1] if "--mulai" in a else "2025-03-01", int(a[a.index("--titik") + 1]) if "--titik" in a else 30)
