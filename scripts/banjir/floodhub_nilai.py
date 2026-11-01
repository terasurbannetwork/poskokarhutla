"""Penilai PRAREG-FLOODHUB.md: sinyal sungai (S) dan bandang (B) Flood Hub terhadap kejadian banjir kabupaten-hari. Python stdlib saja.

  uji    swauji tanpa jaringan dan tanpa data nyata (data sintetis)
  buka   penilaian final, SEKALI: menolak sebelum 2027-06-15, sebelum floodhub.sidik utuh, sebelum salinan DIBI memuat kejadian
         >= 2027-06-16, dan bila penanda buka.json sudah ada. Penanda + salinan DIBI (sha256) ditulis SEBELUM metrik pertama.
Aturan semuanya dari PRAREG-FLOODHUB.md; berkas ini ikut disidik (floodhub.SIDIK_BERKAS). Label y memakai uji_balik.peristiwa (impor,
bukan salinan; batas AKHIR-nya dilonggarkan sementara), tabel 514 kab dari prediksi/dasar.py, sinyal dari floodhub.sinyal_snapshot.
"""
import datetime as dt, hashlib, json, os, random, shutil, sys

SINI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, SINI)
sys.path.insert(0, os.path.join(SINI, "..", "prediksi"))
import floodhub as F, uji_balik as ub, dasar as D

AKAR = F.AKAR
BUKA_PALING_CEPAT, DIBI_MIN_BUKA, AKHIR_UJI, LAG_DIBI = dt.date(2027, 6, 15), dt.date(2027, 6, 16), dt.date(2027, 4, 30), 45
ULANGAN, BIJI, PERSEN = 5000, 11, (1.25, 98.75)   # selang 97,5% (Bonferroni m = 2 pada alfa dua-sisi 5%)
MIN_Y1, RENDAH_Y1, RENDAH_ALARM_B = 100, 300, 30
BOLONG_MAKS, BERUNTUN_MAKS = 0.15, 7
JAWA = {"31", "32", "33", "34", "35", "36"}
PULAU = {**{k: "Sumatera" for k in ("11", "12", "13", "14", "15", "16", "17", "18", "19", "21")}, **{k: "Jawa" for k in JAWA},
         **{k: "BaliNusra" for k in ("51", "52", "53")}, **{k: "Kalimantan" for k in ("61", "62", "63", "64", "65")},
         **{k: "Sulawesi" for k in ("71", "72", "73", "74", "75", "76")}, "81": "Maluku", "82": "Maluku", **{k: "Papua" for k in ("91", "92", "93", "94", "95", "96")}}
HASIL = os.path.join(AKAR, "data/raw/banjir/floodhub_nilai")
D0 = dt.date(2016, 1, 1)


# ------------------------------------------------------------------ label dan klimatologi
def kejadian(baris):
    """dibi_tanggal.json -> {kab 'pp|Nama': {tanggal}} banjir/bandang n>=1 lewat uji_balik.peristiwa (aturan yang sama dengan model_kab.py);
    batas AKHIR modul itu (2026-01-03) dilonggarkan sementara dan DIKEMBALIKAN."""
    akhir, ub.AKHIR = ub.AKHIR, dt.date(2100, 1, 1)
    try:
        ev = ub.peristiwa(baris)["banjir"]
    finally:
        ub.AKHIR = akhir
    return {k: {ub.AWAL + dt.timedelta(h) for h in v} for k, v in ev.items()}


def jendela_y(ev):
    """y(kab, t) = 1 bila ada kejadian pada t, t+1, atau t+2: -> {kab: {t}}."""
    return {k: {e - dt.timedelta(o) for e in v for o in range(3)} for k, v in ev.items()}


class P0:
    """Klimatologi p0(kab, bulan) untuk hari di tahun `tahun`: semesta = semua kab (universe) x hari 2016-01-01..(tahun-1)-12-31;
    frekuensi y=1 pada bulan kalender itu; nasional bila kab itu < F.MIN_P0 kab-hari. Rumus sama dengan floodhub.p0 (diuji setara)."""

    def __init__(self, Y1, universe, tahun):
        self.n, self.s, self.uni = {m: 0 for m in range(1, 13)}, {}, list(universe)
        t = D0
        while t.year < tahun:
            self.n[t.month] += 1
            t += dt.timedelta(1)
        for g in self.uni:
            for t in Y1.get(g, ()):
                if D0 <= t and t.year < tahun:
                    self.s[(g, t.month)] = self.s.get((g, t.month), 0) + 1
        self.nas_s = {m: sum(self.s.get((g, m), 0) for g in self.uni) for m in self.n}

    def nas(self, m):
        n = self.n[m] * len(self.uni)
        return self.nas_s[m] / n if n else 0.0

    def __call__(self, g, m):
        n = self.n[m]
        return self.s.get((g, m), 0) / n if n >= F.MIN_P0 else self.nas(m)


def muat_bnj(folder, id2geo):
    """Arsip /prediksi kode BNJ, tenggang +1 (indeks 0): -> {tanggal terbit 'YYYY-MM-DD': {kab: (lv, ps)}}. Baris pertama per hari menang."""
    out = {}
    for e in D.semua_arsip(folder):
        if e.get("k") == "BNJ" and e["t"] not in out:
            m = {}
            for i, v in e["kab"].items():
                if i in id2geo and v and v[0]:
                    m[id2geo[i]] = (v[0][0], v[0][1])
            out[e["t"]] = m
    return out


# ------------------------------------------------------------------ pembanding dan alarm
def peringkat(universe, d, p0f, pers, bnj):
    """Urutan kab per pembanding, skor tertinggi dulu. Tie-break TEGAS: skor, lalu p0, lalu p0 nasional bulan itu, lalu kunci kab.
    persistensi: ada kejadian DIBI d-1; BNJ: lv, lalu ps (kosong = -1), bnj None = tak ada baris hari itu (kontras dikeluarkan)."""
    m, nas = d.month, p0f.nas(d.month)
    u = list(universe)
    out = {"klimatologi": sorted(u, key=lambda g: (-p0f(g, m), -nas, g)),
           "persistensi": sorted(u, key=lambda g: (-(g in pers), -p0f(g, m), -nas, g))}
    if bnj is not None:
        f = lambda g: bnj.get(g, (None, None))
        out["BNJ"] = sorted(u, key=lambda g: (-(f(g)[0] if f(g)[0] is not None else -1), -(f(g)[1] if f(g)[1] is not None else -1.0), -p0f(g, m), -nas, g))
    return out


def ets(n, y, al, hit):
    """ETS dari: n sel, y berlabel 1, al alarm, hit alarm yang kena."""
    a, ar = hit, (al * y / n if n else 0.0)
    den = al + y - hit - ar
    return (a - ar) / den if den > 0 else 0.0


def musim(d):
    """Blok musim-tahun: hujan (Okt-Mar) bernama tahun awalnya, kering (Apr-Sep) tahunnya."""
    return (d.year if d.month >= 10 else d.year - 1, "hujan") if d.month >= 10 or d.month <= 3 else (d.year, "kering")


def blok(g, d):
    return {1: (g, musim(d)), 2: (PULAU.get(g[:2], "lain"), d.isocalendar()[:2])}


def akumulasi(hari_alarm, universe, Y_hari, saring=None):
    """hari_alarm: [(d, alarm sinyal set, alarm pembanding set)] -> {skema: {blok: [n, y, sa, sh, ca, ch]}}.
    Top-K sudah tetap SEBELUM ini; bootstrap hanya memilih blok sel kab-hari."""
    acc = {1: {}, 2: {}}
    for d, a_s, a_c in hari_alarm:
        Y = Y_hari.get(d, set())
        for sk in (1, 2):
            for g in universe:
                if saring is None or saring(g):
                    acc[sk].setdefault(blok(g, d)[sk], [0] * 6)[0] += 1
            for ix, himp in ((1, Y), (2, a_s), (4, a_c)):
                for g in himp:
                    if saring is None or saring(g):
                        b = acc[sk][blok(g, d)[sk]]
                        b[ix] += 1
                        if ix != 1 and g in Y:
                            b[ix + 1] += 1
    return acc


def total(bl):
    return [sum(b[i] for b in bl) for i in range(6)]


def d_ets(t):
    n, y, sa, sh, ca, ch = t
    return ets(n, y, sa, sh) - ets(n, y, ca, ch), ets(n, y, sa, sh), ets(n, y, ca, ch)


def bootstrap(acc_sk, reps, rng):
    """dETS tiap ulangan atas blok (dengan pengembalian); kolom dijumlah lewat peta indeks (cepat tanpa numpy)."""
    bl = list(acc_sk.values())
    kol = [[b[i] for b in bl] for i in range(6)]
    G, out = len(bl), []
    for _ in range(reps):
        idx = [rng.randrange(G) for _ in range(G)]
        out.append(d_ets([sum(map(c.__getitem__, idx)) for c in kol])[0])
    out.sort()
    return out[int(reps * PERSEN[0] / 100)], out[min(reps - 1, int(reps * PERSEN[1] / 100))]


def cakupan(matang, sah):
    """Hari matang vs hari sah -> {n_matang, n_bolong, maks_beruntun, tidak_dapat: bool}. Penyebut = jumlah hari matang."""
    s, run, mx, nb = set(sah), 0, 0, 0
    for d in matang:
        if d in s:
            run = 0
        else:
            nb += 1
            run += 1
            mx = max(mx, run)
    n = len(matang)
    return {"n_matang": n, "n_bolong": nb, "maks_beruntun": mx, "tidak_dapat": n == 0 or nb / n > BOLONG_MAKS or mx > BERUNTUN_MAKS}


def vonis(h, per_komp, n_y1, n_alarm, cak, b_tak_terurai=False):
    """PRAREG §5. per_komp: {pembanding: {dets, lo, hi}}."""
    if cak["tidak_dapat"] or n_y1 < MIN_Y1 or (h == "B" and b_tak_terurai) or not per_komp:
        return "tidak dapat dinilai"
    if any(v["dets"] <= 0 or v["hi"] < 0 for v in per_komp.values()):
        return "TIDAK LULUS"
    v = "LULUS" if all(v["lo"] > 0 for v in per_komp.values()) else "TIDAK MEYAKINKAN"
    return v + (" (daya rendah)" if n_y1 < RENDAH_Y1 or (h == "B" and n_alarm < RENDAH_ALARM_B) else "")


def nilai(hari, universe, ev, bnj, matang, reps=ULANGAN, b_tak_terurai=False):
    """hari: [{"d", "S" {kab: 0..3}, "B" set, "S_sah", "B_sah"}] hanya hari prospektif matang; matang = semua hari matang (tanpa bolong).
    -> {"S": {...}, "B": {...}}; tiap pembanding: dets, ets_sinyal, ets_pembanding, ci skema 1 (kab x musim-tahun) dan 2 (pulau x minggu),
    lo = yang lebih kecil dari dua batas bawah, hi = yang lebih besar, lapisan Jawa/luar Jawa (titik, bukan vonis)."""
    universe = sorted(universe)
    ev = {g: v for g, v in ev.items() if g in set(universe)}  # kunci DIBI di luar 514 kab tak ikut
    Y1 = jendela_y(ev)
    Y_hari = {}
    for g, ts in Y1.items():
        for t in ts:
            Y_hari.setdefault(t, set()).add(g)
    p0s, hasil = {}, {}
    for h in ("S", "B"):
        sah = [x for x in hari if x[h + "_sah"]]
        rows = {}
        for x in sah:
            d = x["d"]
            p0f = p0s.setdefault(d.year, P0(Y1, universe, d.year))
            pers = {g for g, ts in ev.items() if (d - dt.timedelta(1)) in ts}
            sin = {g for g, v in x["S"].items() if v >= 1} if h == "S" else set(x["B"]) & set(universe)
            pk = peringkat(universe, d, p0f, pers, None if bnj is None else bnj.get((d - dt.timedelta(1)).isoformat()))
            for c, urut in pk.items():
                rows.setdefault(c, []).append((d, sin, set(urut[:len(sin)])))
        n_y1 = sum(len(Y_hari.get(x["d"], ())) for x in sah)
        n_alarm = sum(len(r[1]) for r in rows.get("klimatologi", []))
        per = {}
        for c, ha in rows.items():
            acc = akumulasi(ha, universe, Y_hari)
            dets, es, ec = d_ets(total(acc[1].values()))
            r = {"dets": dets, "ets_sinyal": es, "ets_pembanding": ec, "hari": len(ha)}
            lo_hi = []
            for sk in (1, 2):
                lo_hi.append(bootstrap(acc[sk], reps, random.Random(BIJI)))
                r[f"ci_skema{sk}"] = list(lo_hi[-1])
            r["lo"], r["hi"] = min(a for a, _ in lo_hi), max(b for _, b in lo_hi)
            for nama, f in (("jawa", lambda g: g[:2] in JAWA), ("luar_jawa", lambda g: g[:2] not in JAWA)):
                r["lapisan_" + nama] = d_ets(total(akumulasi(ha, universe, Y_hari, f)[1].values()))[0]
            per[c] = r
        cak = cakupan(matang[h], [x["d"] for x in sah])
        hasil[h] = {"pembanding": per, "kab_hari_y1": n_y1, "alarm_sinyal": n_alarm, "cakupan": cak, "vonis": vonis(h, per, n_y1, n_alarm, cak, b_tak_terurai)}
    return hasil


# ------------------------------------------------------------------ data nyata
def kumpul(akar, awal, akhir, kab):
    """Hari prospektif awal..akhir -> (hari sah [dict untuk nilai], matang {S: [d], B: [d]}, B_tak_terurai bool).
    Hari sah per hipotesis: snapshot terpilih lengkap (S) dan poligon tidak gagal (B)."""
    hari, matang, cache, np_, nt = [], {"S": [], "B": []}, {}, 0, 0
    d = awal
    while d <= akhir:
        snap = F.pilih_snapshot(akar, d)
        matang["S"].append(d)
        matang["B"].append(d)
        if snap is not None:
            if snap not in cache:
                cache[snap] = F.sinyal_snapshot(akar, snap[0], snap[1], kab)
                np_ += cache[snap]["n_poligon"]
                nt += cache[snap]["n_terurai"]
            s = cache[snap]
            hari.append({"d": d, "S": s["S"], "B": s["B"], "S_sah": True, "B_sah": s["B_sah"]})
        d += dt.timedelta(1)
    return hari, matang, (np_ > 0 and nt == 0)


def buka(akar=AKAR, sekarang=None, reps=ULANGAN):
    sekarang = sekarang or dt.datetime.now(dt.timezone.utc).date()
    if sekarang < BUKA_PALING_CEPAT:
        sys.exit(f"ditolak: buka paling cepat {BUKA_PALING_CEPAT}")
    sidik = os.path.join(akar, "scripts/banjir/floodhub.sidik")
    if not os.path.exists(sidik):
        sys.exit("ditolak: floodhub.sidik belum ada")
    beda = F.periksa_sidik(akar, sidik)
    if beda:
        sys.exit("ditolak: sidik berubah: " + ", ".join(beda))
    awal = F.awal_prospektif(sidik)
    hasil_dir = os.path.join(akar, "data/raw/banjir/floodhub_nilai")
    penanda = os.path.join(hasil_dir, "buka.json")
    if os.path.exists(penanda):
        sys.exit("ditolak: sudah dibuka (buka.json ada); satu kali")
    with open(os.path.join(akar, "data/raw/banjir/dibi_tanggal.json")) as f:
        baris = json.load(f)
    akhir_dibi = max(dt.date.fromisoformat(r[3]) for r in baris)
    if akhir_dibi < DIBI_MIN_BUKA:
        sys.exit(f"ditolak: salinan DIBI belum memuat kejadian >= {DIBI_MIN_BUKA} (terakhir {akhir_dibi})")
    os.makedirs(hasil_dir, exist_ok=True)
    salinan = os.path.join(hasil_dir, "dibi_salinan.json")
    shutil.copy(os.path.join(akar, "data/raw/banjir/dibi_tanggal.json"), salinan)
    with open(salinan, "rb") as f:
        sha = hashlib.sha256(f.read()).hexdigest()
    with open(penanda, "w") as f:  # SEBELUM metrik pertama
        json.dump({"dibuka": sekarang.isoformat(), "dibi_sha256": sha, "dibi_akhir": akhir_dibi.isoformat()}, f)
    akhir = min(AKHIR_UJI, akhir_dibi - dt.timedelta(LAG_DIBI + 2))
    kab = F.Kab.repo(akar)
    hari, matang, tak = kumpul(akar, awal, akhir, kab)
    daftar = D.kab(akar)
    universe, id2geo = [k["geo"] for k in daftar], {k["id"]: k["geo"] for k in daftar}
    bnj = muat_bnj(os.path.join(akar, F.ARSIP_PREDIKSI), id2geo)
    m = {"S": matang["S"], "B": matang["B"]}
    hasil = nilai(hari, universe, kejadian(baris), bnj, m, reps, tak)
    with open(os.path.join(hasil_dir, "hasil.json"), "w") as f:
        json.dump(hasil, f, ensure_ascii=False, indent=1, default=str)
    for h in ("S", "B"):
        print(h, hasil[h]["vonis"])
    return hasil


# ------------------------------------------------------------------ uji
def uji():
    import tempfile
    D_ = dt.date
    # ETS: n=100, y=10, 10 alarm, 5 kena -> ar=1, ets=(5-1)/(15-1); 0 alarm -> 0
    assert abs(ets(100, 10, 10, 5) - 4 / 14) < 1e-12 and ets(100, 10, 0, 0) == 0.0 and ets(100, 0, 0, 0) == 0.0
    # musim dan blok: Jan 2027 satu musim dengan Nov 2026, beda dari Jan 2026
    assert musim(D_(2027, 1, 5)) == musim(D_(2026, 11, 1)) == (2026, "hujan") and musim(D_(2026, 1, 5)) == (2025, "hujan") and musim(D_(2026, 6, 1)) == (2026, "kering")
    assert blok("31|A", D_(2026, 11, 2))[2] == ("Jawa", (2026, 45))
    # label: aturan uji_balik (banjir/bandang, n>=1), tanggal 2027 tidak dipotong, ub.AKHIR dikembalikan
    akhir0 = ub.AKHIR
    ev = kejadian([[["banjir"], "31", "A", "2027-01-02", 1], [["longsor"], "31", "A", "2027-01-03", 1], [["bandang"], "32", "B", "2026-12-01", 0],
                   [["bandang"], "32", "B", "2026-12-02", 2]])
    assert ev == {"31|A": {D_(2027, 1, 2)}, "32|B": {D_(2026, 12, 2)}} and ub.AKHIR == akhir0
    assert jendela_y(ev)["31|A"] == {D_(2026, 12, 31), D_(2027, 1, 1), D_(2027, 1, 2)}
    # p0 cepat == floodhub.p0 (baris), semesta kab x hari 2016-01-01..(tahun-1), bulan sama
    uni = ["11|X", "31|Y", "62|Z"]
    evp = {"11|X": {D_(2016, 3, 3), D_(2017, 3, 10), D_(2018, 3, 5)}, "31|Y": {D_(2017, 7, 1)}}
    Y1 = jendela_y(evp)
    p0f = P0(Y1, uni, 2018)
    baris = [(g, D_(2016, 1, 1) + dt.timedelta(i), int(D_(2016, 1, 1) + dt.timedelta(i) in Y1.get(g, ())) ) for g in uni for i in range(731)]
    for g in uni:
        for m in (3, 7, 12):
            assert abs(F.p0(baris, g, D_(2018, m, 15)) - p0f(g, m)) < 1e-12, (g, m)
    assert p0f("11|X", 3) == 6 / 62 and p0f("62|Z", 3) == 0.0 and abs(p0f.nas(3) - 6 / (62 * 3)) < 1e-12
    # tie-break tegas: semua p0 sama -> urut kunci kab; persistensi menaikkan kab dengan kejadian d-1
    p00 = P0({}, ["b", "c", "a"], 2026)
    pk = peringkat(["b", "c", "a"], D_(2026, 11, 3), p00, {"c"}, {"b": (2, None), "a": (2, 0.4)})
    assert pk["klimatologi"] == ["a", "b", "c"] and pk["persistensi"] == ["c", "a", "b"] and pk["BNJ"] == ["a", "b", "c"], pk
    assert "BNJ" not in peringkat(["a"], D_(2026, 11, 3), p00, set(), None)
    # data sintetis: 40 kab, riwayat 2016-2025 (kab 0-4 "sering"), hari uji 2026-11-01..2026-12-15 dengan kejadian di kab NON-sering
    prov = ["11", "31", "32", "62"]
    uni = [f"{prov[i % 4]}|K{i:02d}" for i in range(40)]
    ev = {g: set() for g in uni}
    for i in range(5):
        t = D_(2016, 1, 1)
        while t < D_(2026, 1, 1):
            ev[uni[i]].add(t)
            t += dt.timedelta(20)
    rng = random.Random(3)
    hari, matang = [], {"S": [], "B": []}
    d = D_(2026, 11, 1)
    while d <= D_(2026, 12, 15):
        for _ in range(3):
            ev[uni[rng.randrange(5, 40)]].add(d + dt.timedelta(rng.randrange(3)))
        d += dt.timedelta(1)
    Y1 = jendela_y(ev)
    d = D_(2026, 11, 1)
    while d <= D_(2026, 12, 15):
        ya = {g for g in uni if d in Y1[g]}
        palsu = set(rng.sample(uni, max(1, len(ya))))
        hari.append({"d": d, "S": {g: 2 for g in ya}, "B": set(), "S_sah": True, "B_sah": False, "_acak": {g: 2 for g in palsu}})
        for h in ("S", "B"):
            matang[h].append(d)
        d += dt.timedelta(1)
    r = nilai(hari, uni, ev, None, matang, reps=300)
    S = r["S"]
    assert S["pembanding"]["klimatologi"]["dets"] > 0.3 and S["pembanding"]["klimatologi"]["lo"] > 0 and S["pembanding"]["persistensi"]["lo"] > 0, S["pembanding"]
    assert S["vonis"].startswith("LULUS") and S["kab_hari_y1"] >= MIN_Y1 and S["pembanding"]["klimatologi"]["lapisan_jawa"] > 0, S["vonis"]
    assert r["B"]["vonis"] == "tidak dapat dinilai" and r["B"]["cakupan"]["n_bolong"] == len(matang["B"]), "B tanpa hari sah"
    for sk in ("ci_skema1", "ci_skema2"):
        assert S["pembanding"]["klimatologi"][sk][0] <= S["pembanding"]["klimatologi"]["dets"] <= S["pembanding"]["klimatologi"][sk][1] + 1e-9
    # pembeda 1: sinyal diacak (ukuran sama) -> bukan LULUS
    ac = [dict(x, S=x["_acak"]) for x in hari]
    assert not nilai(ac, uni, ev, None, matang, reps=300)["S"]["vonis"].startswith("LULUS")
    # pembeda 2: BNJ sempurna (lv tinggi tepat di kab berlabel) mengalahkan sinyal -> TIDAK LULUS lawan BNJ
    bnj = {(x["d"] - dt.timedelta(1)).isoformat(): {g: (3, 0.9) for g in Y1_hari(Y1, x["d"])} for x in hari}
    assert nilai(hari, uni, ev, bnj, matang, reps=300)["S"]["vonis"] == "TIDAK LULUS"
    # pembeda 3: hari bolong > 15% atau > 7 beruntun -> tidak dapat dinilai
    sedikit = [x for i, x in enumerate(hari) if not (10 <= i < 20)]
    assert nilai(sedikit, uni, ev, None, matang, reps=100)["S"]["vonis"] == "tidak dapat dinilai"
    assert cakupan([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], [1, 2, 3, 4, 5, 6, 7, 8])["tidak_dapat"] is True and cakupan(list(range(100)), [d for d in range(100) if d % 10])["tidak_dapat"] is False and cakupan(list(range(100)), list(range(90)))["tidak_dapat"] is True
    # vonis: daya rendah dan aturan batas
    ok = {"klimatologi": {"dets": 0.1, "lo": 0.01, "hi": 0.2}}
    assert vonis("S", ok, 299, 50, {"tidak_dapat": False}) == "LULUS (daya rendah)" and vonis("S", ok, 300, 50, {"tidak_dapat": False}) == "LULUS"
    assert vonis("B", ok, 400, 29, {"tidak_dapat": False}) == "LULUS (daya rendah)" and vonis("S", ok, 99, 50, {"tidak_dapat": False}) == "tidak dapat dinilai"
    assert vonis("S", {"k": {"dets": 0.1, "lo": -0.01, "hi": 0.2}}, 400, 50, {"tidak_dapat": False}) == "TIDAK MEYAKINKAN"
    assert vonis("S", {"k": {"dets": -0.1, "lo": -0.2, "hi": 0.2}}, 400, 50, {"tidak_dapat": False}) == "TIDAK LULUS"
    # buka: ditolak sebelum 2027-06-15, tanpa sidik, dan tanpa salinan DIBI yang cukup baru; satu kali
    for kasus in (dict(sekarang=D_(2027, 6, 14)), dict(sekarang=D_(2027, 6, 15))):
        try:
            buka(tempfile.mkdtemp(), **kasus)
            assert 0
        except SystemExit as e:
            assert "ditolak" in str(e), e
    # kumpul: pilih_snapshot + sinyal_snapshot pada berkas sintetis; hari tanpa snapshot lengkap = bolong
    a = tempfile.mkdtemp()
    sq = lambda x0, y0, x1, y1: {"type": "Polygon", "coordinates": [[[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]]]}
    kab = F.Kab([("31|A", sq(106, -7, 107, -6))])
    for tg, hm, lengkap in (("2026-11-04", "0020", True), ("2026-11-05", "0020", False)):
        b = f"{a}/data/raw/banjir/floodhub/{tg}/{hm}"
        F.simpan_gz(b + "_status.json.gz", [{"gaugeId": "hybas_1", "severity": "SEVERE", "gaugeLocation": {"latitude": -6.2, "longitude": 106.8}}])
        if lengkap:
            F.simpan_gz(b + "_flash.json.gz", [])
            F.simpan_gz(b + "_poligon.json.gz", {})
    hari_, mat, tak = kumpul(a, D_(2026, 11, 5), D_(2026, 11, 7), kab)
    assert [x["d"] for x in hari_] == [D_(2026, 11, 5)] and hari_[0]["S"] == {"31|A": 2} and mat["S"] == [D_(2026, 11, 5), D_(2026, 11, 6), D_(2026, 11, 7)]
    print("uji floodhub_nilai: ok")


def Y1_hari(Y1, d):
    return {g for g, ts in Y1.items() if d in ts}


if __name__ == "__main__":
    c = sys.argv[1] if len(sys.argv) > 1 else ""
    if c == "uji":
        uji()
    elif c == "buka":
        buka()
    else:
        print(__doc__)
        sys.exit(2)
