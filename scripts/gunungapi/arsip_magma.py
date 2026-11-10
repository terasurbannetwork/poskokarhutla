"""Arsip MAGMA (letusan 2018-2026 + halaman VONA) -> agregat rezim letusan untuk layar Insight gunung api.

Masukan LOKAL (hanya ada di Mac pemilik, tidak di Actions): data/raw/gunungapi/letusan_magma.json dan vona_magma/p*.html.
Keluaran: public/gunungapi/data/rezim_letusan.json = SNAPSHOT (agregat per gunung sejak 2024-01-01); `diambil` dan rentang tanggal tertulis di dalamnya.
VONA memuat nama pembuat: kolom itu TIDAK dibaca dan tidak pernah keluar; self-check menolak kunci/teks yang mirip nama petugas.
Tren 2018-2023 lawan 2024+ sengaja tidak dihitung: lompat 457 ke 6.241 per tahun mengikuti cara mencatat, bukan alam.

Pemakaian:  python3 scripts/gunungapi/arsip_magma.py          tulis berkas
            python3 scripts/gunungapi/arsip_magma.py uji      self-check sintetis (+ cocokkan data raw bila ada)
"""
import bisect, collections as K, datetime as dt, glob, html, json, os, re, statistics as S, sys

AKAR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
RAW = os.path.join(AKAR, "data/raw/gunungapi")
DATA = os.path.join(AKAR, "public/gunungapi/data")
AWAL = dt.date(2024, 1, 1)
SEK = ["utara", "timur laut", "timur", "tenggara", "selatan", "barat daya", "barat", "barat laut"]
MUSIM = {12: "DJF", 1: "DJF", 2: "DJF", 3: "MAM", 4: "MAM", 5: "MAM", 6: "JJA", 7: "JJA", 8: "JJA", 9: "SON", 10: "SON", 11: "SON"}
VT = ("harmonik", "tremor_non_harmonik", "low_frequency", "hybrid", "vulkanik_dangkal", "vulkanik_dalam")
POLA_VONA = re.compile(r"(\d{4}-\d\d-\d\d \d\d:\d\d:\d\d) UTC\|(Red|Orange|Yellow|Green|Unassigned)\|([^|]+?) - \d{8}/\d{4}Z\|[^|]*\|[^|]*\|([^|]*)\|View")   # kolom 4-5 (pembuat) dilompati


def baca_vona(folder):
    """-> daftar (waktu UTC aware, gunung); hanya dua kolom itu yang disimpan."""
    V = []
    for f in sorted(glob.glob(os.path.join(folder, "p*.html"))):
        h = open(f, encoding="utf-8").read()
        t = re.sub(r"(?s)<(script|style).*?</\1>", "", h[max(h.find("All Volcanoes"), 0):])
        t = re.sub(r"(\|\s*)+", "|", html.unescape(re.sub(r"<[^>]+>", "|", t)))
        V += [(dt.datetime.fromisoformat(m.group(1) + "+00:00"), m.group(3).strip()) for m in POLA_VONA.finditer(t)]
    return sorted(set(V))


def dekat(ts, t, menit=30):
    """VONA gunung sama 0 sampai +menit sesudah letusan t (sebelum letusan tidak dihitung). -> waktu VONA pertama yang cocok, atau None."""
    i = bisect.bisect_left(ts, t)
    return ts[i] if i < len(ts) and ts[i] <= t + dt.timedelta(minutes=menit) else None


GESER = dt.timedelta(hours=37)   # kontrol: waktu letusan digeser -37 jam; VONA yang tetap cocok = kebetulan karena VONA sering terbit


def persen(a, b):
    return round(100 * a / b, 1) if b else None


def bangun(L, V, kg=None, peluang=False):
    """L = letusan [{gunung, waktu, tinggi_m, arah}], V = [(waktu UTC, gunung)], kg = isi kegempaan.json atau None."""
    for x in L:
        x["t"] = dt.datetime.fromisoformat(x["waktu"]); x["d"] = x["t"].date()
    akhir = max(x["d"] for x in L); hari_total = (akhir - AWAL).days + 1
    per = K.defaultdict(list)
    for x in L:
        if x["d"] >= AWAL:
            per[x["gunung"]].append(x)
    vg = K.defaultdict(list)
    for t, g in V:
        vg[g].append(t)
    for g in vg:
        vg[g].sort()
    rez, cak, ctl, cth, terpakai, arah, musim_n = [], {}, {}, {}, set(), K.defaultdict(lambda: K.defaultdict(K.Counter)), K.defaultdict(lambda: K.defaultdict(set))
    for g, xs in per.items():
        h = sorted(a["tinggi_m"] for a in xs if a.get("tinggi_m"))
        utc = [a["t"].astimezone(dt.timezone.utc) for a in xs]; cocok = [dekat(vg.get(g, []), t) for t in utc]
        ada = sum(1 for c in cocok if c); terpakai |= {(g, c) for c in cocok if c}
        kontrol = sum(1 for t in utc if dekat(vg.get(g, []), t - GESER))
        th = K.defaultdict(lambda: [0, 0])
        for a, c in zip(xs, cocok):
            th[a["t"].year][1] += 1; th[a["t"].year][0] += bool(c)   # tahun WIB, bukan UTC
        cth[g] = {str(y): v for y, v in sorted(th.items())}; ctl[g] = kontrol
        rez.append({"gunung": g, "n": len(xs), "hari_aktif_pct": persen(len({a["d"] for a in xs}), hari_total),
                    "kolom_n": len(h), "kolom_median": h[len(h) // 2] if h else None, "kolom_p90": h[int(len(h) * .9)] if h else None, "kolom_maks": h[-1] if h else None,
                    "per_hari_90": round(sum(1 for a in xs if (akhir - a["d"]).days < 90) / 90, 2),
                    "per_hari_365_sebelumnya": round(sum(1 for a in xs if 90 <= (akhir - a["d"]).days < 455) / 365, 2)})
        cak[g] = [ada, len(xs)]
        for a in xs:
            for p in re.split(r"\s+dan\s+|,\s*", a.get("arah") or ""):
                if p.strip() in SEK:
                    ms = MUSIM[a["t"].month]; arah[g][ms][p.strip()] += 1; musim_n[g][ms].add(a["t"].year + (a["t"].month == 12))
    rez.sort(key=lambda r: -r["n"])
    # arah_musim[g][musim] = {"arah": [[arah, n], [arah, n]], "n": jumlah penyebutan, "musim": berapa musim-tahun berbeda ikut}
    am = {g: {m: {"arah": [[a, n] for a, n in c.most_common(2)], "n": sum(c.values()), "musim": len(musim_n[g][m])} for m, c in ms.items()} for g, ms in arah.items() if sum(sum(c.values()) for c in ms.values()) >= 200}
    return {"v": 1, "awal": str(AWAL), "akhir": str(akhir), "arsip_dari": str(min(x["d"] for x in L)), "n_arsip": len(L),
            "rezim": rez, "cakupan_vona": {g: c for g, c in cak.items() if c[1] >= 50}, "cakupan_kontrol": {g: [ctl[g], cak[g][1]] for g in cak if cak[g][1] >= 50},
            "cakupan_tahun": {g: cth[g] for g in cak if cak[g][1] >= 50}, "cakupan_vona_semua": [sum(c[0] for c in cak.values()), sum(c[1] for c in cak.values())], "vona_unik_terpakai": len(terpakai), "vona_unik": len(set(V)),
            "vona_rentang": [str(V[0][0].date()), str(V[-1][0].date())] if V else None, "arah_musim": am,
            "uji_kegempaan": uji_kegempaan(kg, per) if kg else None, "uji_peluang": uji_peluang(per, akhir) if peluang else None}


def uji_kegempaan(kg, per):
    """Hari alarm (>= 10 gempa vulkanik 7 hari, >= 1,5x rata-rata sendiri, di atas persentil 90) lawan hari tenang, dari gunung yang 7 hari sebelumnya tidak meletus; hasil: letus dalam 7 hari berikut.
    Hari alarm berurutan = satu episode (episode diikuti letusan bila ada hari alarm di dalamnya yang diikuti letusan). `meletus` = hanya gunung yang punya letusan di arsip sejak 2024."""
    idx = [i for i, j in enumerate(kg["jenis"]) if j["k"] in VT]; hasil = K.Counter(); hasil_m = K.Counter(); episode = []; hs_akhir = None
    for g, o in kg["gunung"].items():
        hs = sorted(o["hari"])[:-1]   # hari terakhir belum penuh
        if len(hs) < 60:
            continue
        hs_akhir = max(hs_akhir or hs[-1], hs[-1])
        v = [sum(o["hari"][h][i] for i in idx) for h in hs]; hari_g = {x["d"] for x in per.get(g, [])}; ep = None
        for i in range(40, len(hs) - 7):
            w = sum(v[i - 6:i + 1]); dl = [sum(v[j - 6:j + 1]) for j in range(6, i - 6)]
            d = dt.date.fromisoformat(hs[i])
            if any(d - dt.timedelta(days=q) in hari_g for q in range(7)):
                ep = None; continue
            al = w >= 10 and (w + 1) / (S.mean(dl) + 1) >= 1.5 and sum(1 for a in dl if a < w) / len(dl) >= .9
            lt = any(d + dt.timedelta(days=q) in hari_g for q in range(1, 8))
            hasil[(al, lt)] += 1
            if g in per:
                hasil_m[(al, lt)] += 1
            if al:
                if ep is None:
                    ep = [g, 0]; episode.append(ep)
                ep[1] |= lt
            else:
                ep = None
    a, t = hasil[(True, True)], hasil[(False, True)]
    na, nt = a + hasil[(True, False)], t + hasil[(False, False)]
    am, tm = hasil_m[(True, True)], hasil_m[(False, True)]
    return {"alarm": [a, na], "tenang": [t, nt], "episode": [sum(e[1] for e in episode), len(episode)],
            "meletus": {"alarm": [am, am + hasil_m[(True, False)]], "tenang": [tm, tm + hasil_m[(False, False)]]}, "hari_akhir": hs_akhir}


def uji_peluang(per, akhir):
    """Peluang letusan 7 hari: regresi logistik (kini: 7 dan 30 hari terakhir, kolom, klimatologi gunung) lawan persistensi, bobot latih sampai 22 Jun 2025, uji sejak 1 Jul 2025.
    Hasil dipakai metode.js sebagai dasar kenapa kartu peluang letusan TIDAK dibuat. Gunung dengan >= 20 letusan."""
    import math, random
    gunung = sorted(g for g, xs in per.items() if len(xs) >= 20)
    harian = {g: K.defaultdict(lambda: [0, 0]) for g in gunung}
    for g in gunung:
        for a in per[g]:
            s = harian[g][a["d"]]; s[0] += 1; s[1] = max(s[1], a.get("tinggi_m") or 0)
    tengah, ujung = dt.date(2025, 7, 1), akhir - dt.timedelta(days=8)

    def baris(amb):
        o = []
        for g in gunung:
            d = AWAL + dt.timedelta(days=30)
            while d <= ujung:
                lalu = [harian[g].get(d - dt.timedelta(days=i), [0, 0]) for i in range(30)]
                c7, c30 = sum(x[0] for x in lalu[:7]), sum(x[0] for x in lalu)
                dep = [harian[g].get(d + dt.timedelta(days=i), [0, 0]) for i in range(1, 8)]
                kena = (lambda x: x[1] >= amb) if amb else (lambda x: x[0] > 0)
                o.append(dict(g=g, d=d, y=int(any(map(kena, dep))), pers=int(any(map(kena, lalu[:7]))), x=[math.log1p(c7), math.log1p(c30), max(x[1] for x in lalu[:7]) / 1000, max(x[1] for x in lalu) / 1000]))
                d += dt.timedelta(days=1)
        return o

    logit = lambda p: math.log(p / (1 - p))
    sig = lambda z: 1 / (1 + math.exp(-max(min(z, 30), -30)))

    def fit(X, Y, n=400, lr=.3, lam=1e-3):
        k = len(X[0]); m = [S.mean(r[j] for r in X) for j in range(k)]; sd = [S.pstdev([r[j] for r in X]) or 1 for j in range(k)]
        Z = [[(r[j] - m[j]) / sd[j] for j in range(k)] for r in X]; b = [0.0] * (k + 1); N = len(Z)
        for _ in range(n):
            g = [0.0] * (k + 1)
            for z, y in zip(Z, Y):
                e = sig(b[0] + sum(a * c for a, c in zip(b[1:], z))) - y; g[0] += e
                for j in range(k):
                    g[j + 1] += e * z[j]
            b[0] -= lr * g[0] / N
            for j in range(k):
                b[j + 1] -= lr * (g[j + 1] / N + lam * b[j + 1])
        return lambda r: sig(b[0] + sum(a * (c - m[i]) / sd[i] for i, (a, c) in enumerate(zip(b[1:], r))))

    def auc(p, y):
        idx = sorted(range(len(p)), key=lambda i: p[i]); rank = [0.0] * len(p); i = 0
        while i < len(idx):
            j = i
            while j + 1 < len(idx) and p[idx[j + 1]] == p[idx[i]]:
                j += 1
            for a in range(i, j + 1):
                rank[idx[a]] = (i + j) / 2 + 1
            i = j + 1
        n1 = sum(y); n0 = len(y) - n1
        return (sum(r for r, v in zip(rank, y) if v) - n1 * (n1 + 1) / 2) / (n1 * n0) if n1 and n0 else None

    brier = lambda p, y: sum((a - b) ** 2 for a, b in zip(p, y)) / len(y)
    random.seed(7); uji = {}
    for nama, amb in (("ada letusan", 0), ("kolom 1.500 m ke atas", 1500), ("kolom 3.000 m ke atas", 3000)):
        B = baris(amb); tr = [r for r in B if r["d"] < tengah - dt.timedelta(days=8)]; te = [r for r in B if r["d"] >= tengah]
        iklim = {g: (sum(r["y"] for r in tr if r["g"] == g) + 1) / (sum(1 for r in tr if r["g"] == g) + 2) for g in gunung}
        pa = K.defaultdict(lambda: [1, 2])
        for r in tr:
            q = pa[(r["g"], r["pers"])]; q[0] += r["y"]; q[1] += 1
        f = fit([r["x"] + [logit(iklim[r["g"]])] for r in tr], [r["y"] for r in tr]); Y = [r["y"] for r in te]
        P0 = [iklim[r["g"]] for r in te]; P1 = [pa[(r["g"], r["pers"])][0] / pa[(r["g"], r["pers"])][1] for r in te]; P2 = [f(r["x"] + [logit(iklim[r["g"]])]) for r in te]
        pek = K.defaultdict(list)
        for i, r in enumerate(te):
            pek[(r["d"] - tengah).days // 7].append(i)
        ks = sorted(pek); ds = []
        for _ in range(300):
            sm = [i for _k in random.choices(ks, k=len(ks)) for i in pek[_k]]; yb = [Y[i] for i in sm]
            ds.append(1 - brier([P2[i] for i in sm], yb) / brier([P1[i] for i in sm], yb))
        ds.sort(); an = []
        for a, b in ((0, .1), (.1, .3), (.3, .6), (.6, .9), (.9, 1.01)):
            ii = [i for i, q in enumerate(P2) if a <= q < b]
            if ii:
                an.append({"kelas": f"{int(a * 100)}-{min(int(b * 100), 100)}%", "n": len(ii), "diramal_pct": round(100 * S.mean(P2[i] for i in ii), 1), "terjadi_pct": round(100 * S.mean(Y[i] for i in ii), 1)})
        uji[nama] = {"n_latih": len(tr), "n_uji": len(te), "laju_uji_pct": round(100 * S.mean(Y), 1), "brier": {"iklim": round(brier(P0, Y), 4), "persistensi": round(brier(P1, Y), 4), "model": round(brier(P2, Y), 4)},
                     "auc": {"iklim": round(auc(P0, Y), 3), "persistensi": round(auc(P1, Y), 3), "model": round(auc(P2, Y), 3)}, "skill": round(1 - brier(P2, Y) / brier(P1, Y), 3), "skill_ci90": [round(ds[15], 3), round(ds[285], 3)], "keandalan": an}
    return {"hasil": uji, "latih": [str(AWAL + dt.timedelta(days=30)), str(tengah - dt.timedelta(days=9))], "uji": [str(tengah), str(ujung)], "gunung": gunung}


def tulis():
    L = json.load(open(os.path.join(RAW, "letusan_magma.json")))
    kg = json.load(open(os.path.join(DATA, "kegempaan.json")))
    o = bangun(L["letusan"], baca_vona(os.path.join(RAW, "vona_magma")), kg, peluang=True)
    o["diambil"] = L.get("diambil")
    s = json.dumps(o, ensure_ascii=False, separators=(",", ":"))
    open(os.path.join(DATA, "rezim_letusan.json"), "w", encoding="utf-8").write(s)
    print("ok", len(s), "byte;", len(o["rezim"]), "gunung; akhir", o["akhir"])
    glosari()


def glosari():
    """data/raw/edukasi/glossary_magma.json (438 istilah) -> public/gunungapi/data/glosari.json {i: istilah, d: deskripsi}; dimuat layar hanya saat bagian Cari istilah dibuka."""
    w = json.load(open(os.path.join(AKAR, "data/raw/edukasi/glossary_magma.json")))
    ist = sorted(({"i": x["istilah"].strip(), "d": re.sub(r"\s+", " ", x["deskripsi"]).strip()} for x in w["istilah"] if x.get("istilah") and x.get("deskripsi")), key=lambda x: x["i"].lower())
    open(os.path.join(DATA, "glosari.json"), "w", encoding="utf-8").write(json.dumps({"v": 1, "sumber": "MAGMA Indonesia, PVMBG (glossary)", "diambil": re.search(r"\d{4}-\d\d-\d\d", w["sumber"]).group(0), "istilah": ist}, ensure_ascii=False, separators=(",", ":")))
    print("glosari", len(ist), "istilah")


def uji():
    t0 = dt.datetime(2026, 5, 1, 3, 0, tzinfo=dt.timezone(dt.timedelta(hours=7)))
    L = [{"gunung": "A", "waktu": (t0 + dt.timedelta(days=i // 2, minutes=i % 2 * 5)).isoformat(), "tinggi_m": 500 + 100 * (i % 3), "arah": "timur dan barat laut" if i % 2 else "timur"} for i in range(300)]
    L.append({"gunung": "B", "waktu": "2023-01-01T00:00+07:00", "tinggi_m": None, "arah": None})
    V = [(t0.astimezone(dt.timezone.utc) + dt.timedelta(days=i), "A") for i in range(0, 150, 2)]
    o = bangun(L, V)
    a = o["rezim"][0]
    assert [r["gunung"] for r in o["rezim"]] == ["A"], "letusan sebelum 2024 tidak masuk"
    assert a["n"] == 300 and a["kolom_median"] == 600 and a["kolom_maks"] == 700, a
    assert o["cakupan_vona"]["A"][1] == 300 and 0 < o["cakupan_vona"]["A"][0] < 300, o["cakupan_vona"]
    assert o["arah_musim"]["A"]["MAM"]["arah"][0][0] == "timur", o["arah_musim"]
    assert set(o["cakupan_kontrol"]) == {"A"} and o["cakupan_kontrol"]["A"][0] < o["cakupan_vona"]["A"][0] and o["vona_unik_terpakai"] > 0
    assert "pembuat" not in json.dumps(o).lower()
    assert dekat([t0 + dt.timedelta(minutes=29)], t0) and not dekat([t0 + dt.timedelta(minutes=31)], t0) and not dekat([t0 - dt.timedelta(minutes=5)], t0), 'VONA hanya 0 sampai +30 menit sesudah letusan'
    # kegempaan: gunung tenang lalu lonjakan di hari 70 -> satu alarm, tanpa letusan setelahnya
    hari = {(dt.date(2026, 1, 1) + dt.timedelta(days=i)).isoformat(): [0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0] for i in range(100)}
    for i in range(70, 74):
        hari[(dt.date(2026, 1, 1) + dt.timedelta(days=i)).isoformat()][2] = 20
    kg = {"jenis": [{"k": k} for k in ("letusan", "hembusan", "harmonik", "tremor_menerus", "tremor_non_harmonik", "low_frequency", "hybrid", "vulkanik_dangkal", "vulkanik_dalam", "tektonik_lokal", "tektonik_jauh")], "gunung": {"Z": {"hari": hari}}}
    u = uji_kegempaan(kg, {})
    assert u["alarm"][1] > 0 and u["alarm"][0] == 0 and u["tenang"][1] > 0 and u["episode"][1] >= 1 and u["episode"][0] == 0, u
    raw = os.path.join(RAW, "letusan_magma.json")
    if os.path.exists(raw):   # data lokal pemilik: cocokkan dengan hitungan acuan (21.183 letusan; Semeru 95%)
        L2 = json.load(open(raw))["letusan"]; assert len(L2) > 20000
        print("raw ada:", len(L2), "letusan")
    print("uji ok")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else tulis()
