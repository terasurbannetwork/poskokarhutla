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
    i = bisect.bisect_left(ts, t - dt.timedelta(minutes=menit))
    return i < len(ts) and ts[i] <= t + dt.timedelta(minutes=menit)


def persen(a, b):
    return round(100 * a / b, 1) if b else None


def bangun(L, V, kg=None):
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
    rez, cak, arah = [], {}, K.defaultdict(lambda: K.defaultdict(K.Counter))
    for g, xs in per.items():
        h = sorted(a["tinggi_m"] for a in xs if a.get("tinggi_m"))
        ada = sum(1 for a in xs if dekat(vg.get(g, []), a["t"].astimezone(dt.timezone.utc)))
        rez.append({"gunung": g, "n": len(xs), "hari_aktif_pct": persen(len({a["d"] for a in xs}), hari_total),
                    "kolom_n": len(h), "kolom_median": h[len(h) // 2] if h else None, "kolom_p90": h[int(len(h) * .9)] if h else None, "kolom_maks": h[-1] if h else None,
                    "per_hari_90": round(sum(1 for a in xs if (akhir - a["d"]).days < 90) / 90, 2),
                    "per_hari_365_sebelumnya": round(sum(1 for a in xs if 90 <= (akhir - a["d"]).days < 455) / 365, 2)})
        cak[g] = [ada, len(xs)]
        for a in xs:
            for p in re.split(r"\s+dan\s+|,\s*", a.get("arah") or ""):
                if p.strip() in SEK:
                    arah[g][MUSIM[a["t"].month]][p.strip()] += 1
    rez.sort(key=lambda r: -r["n"])
    am = {g: {m: [[a, n] for a, n in c.most_common(2)] + [sum(c.values())] for m, c in ms.items()} for g, ms in arah.items() if sum(sum(c.values()) for c in ms.values()) >= 200}
    return {"v": 1, "awal": str(AWAL), "akhir": str(akhir), "arsip_dari": str(min(x["d"] for x in L)), "n_arsip": len(L),
            "rezim": rez, "cakupan_vona": {g: c for g, c in cak.items() if c[1] >= 50}, "cakupan_vona_semua": [sum(c[0] for c in cak.values()), sum(c[1] for c in cak.values())],
            "vona_rentang": [str(V[0][0].date()), str(V[-1][0].date())] if V else None, "arah_musim": am,
            "uji_kegempaan": uji_kegempaan(kg, per) if kg else None}


def uji_kegempaan(kg, per):
    """Hari alarm (>= 10 gempa vulkanik 7 hari, >= 1,5x rata-rata sendiri, di atas persentil 90) lawan hari tenang, dari gunung yang 7 hari sebelumnya tidak meletus; hasil: letus dalam 7 hari berikut."""
    idx = [i for i, j in enumerate(kg["jenis"]) if j["k"] in VT]; hasil = K.Counter()
    for g, o in kg["gunung"].items():
        hs = sorted(o["hari"])[:-1]   # hari terakhir belum penuh
        if len(hs) < 60:
            continue
        v = [sum(o["hari"][h][i] for i in idx) for h in hs]; hari_g = {x["d"] for x in per.get(g, [])}
        for i in range(40, len(hs) - 7):
            w = sum(v[i - 6:i + 1]); dl = [sum(v[j - 6:j + 1]) for j in range(6, i - 6)]
            d = dt.date.fromisoformat(hs[i])
            if any(d - dt.timedelta(days=q) in hari_g for q in range(7)):
                continue
            al = w >= 10 and (w + 1) / (S.mean(dl) + 1) >= 1.5 and sum(1 for a in dl if a < w) / len(dl) >= .9
            hasil[(al, any(d + dt.timedelta(days=q) in hari_g for q in range(1, 8)))] += 1
    a, t = hasil[(True, True)], hasil[(False, True)]
    na, nt = a + hasil[(True, False)], t + hasil[(False, False)]
    return {"alarm": [a, na], "tenang": [t, nt]}


def tulis():
    L = json.load(open(os.path.join(RAW, "letusan_magma.json")))
    kg = json.load(open(os.path.join(DATA, "kegempaan.json")))
    o = bangun(L["letusan"], baca_vona(os.path.join(RAW, "vona_magma")), kg)
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
    assert o["arah_musim"]["A"]["MAM"][0][0] == "timur", o["arah_musim"]
    assert "pembuat" not in json.dumps(o).lower()
    assert dekat([t0], t0 + dt.timedelta(minutes=29)) and not dekat([t0], t0 + dt.timedelta(minutes=31))
    # kegempaan: gunung tenang lalu lonjakan di hari 70 -> satu alarm, tanpa letusan setelahnya
    hari = {(dt.date(2026, 1, 1) + dt.timedelta(days=i)).isoformat(): [0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0] for i in range(100)}
    for i in range(70, 74):
        hari[(dt.date(2026, 1, 1) + dt.timedelta(days=i)).isoformat()][2] = 20
    kg = {"jenis": [{"k": k} for k in ("letusan", "hembusan", "harmonik", "tremor_menerus", "tremor_non_harmonik", "low_frequency", "hybrid", "vulkanik_dangkal", "vulkanik_dalam", "tektonik_lokal", "tektonik_jauh")], "gunung": {"Z": {"hari": hari}}}
    u = uji_kegempaan(kg, {})
    assert u["alarm"][1] > 0 and u["alarm"][0] == 0 and u["tenang"][1] > 0, u
    raw = os.path.join(RAW, "letusan_magma.json")
    if os.path.exists(raw):   # data lokal pemilik: cocokkan dengan hitungan acuan (21.183 letusan; Semeru 95%)
        L2 = json.load(open(raw))["letusan"]; assert len(L2) > 20000
        print("raw ada:", len(L2), "letusan")
    print("uji ok")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else tulis()
