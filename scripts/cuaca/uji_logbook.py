"""Uji hujan ERA5 vs logbook Pusdalops kab-hari -> public/banjir/data/cuaca_uji_logbook.json (M1, RENCANA-CUACA-NOV).

Satuan kabupaten-hari. Kejadian = ada baris logbook jenis `cuaca` (pembanding: `banjir`) pada kab dan tanggal itu (kolom tgl_kejadian).
Hujan = ERA5 jam-jaman dari cache uji_balik banjir (data/raw/banjir/uji_balik, tidak di git; hanya mesin lokal). Kab sampel = kab yang SEMUA
selnya ada di cache. Pembagian waktu terkunci: latih 2016-2021 (klimatologi), uji 2022-2025; tidak ada penyetelan di periode uji.
Skor: AUC (peringkat) hujan harian maks sel, hujan jam maks, hujan 3 hari, klimatologi kab x bulan (dilatih), klimatologi bulan nasional;
POD/FAR/CSI/ETS ambang 20/50/100 mm hujan harian maks, dibanding klimatologi kab x bulan pada JUMLAH ALARM yang sama dan persistensi
(ada kejadian kemarin; laju alarm alaminya dicatat). Selang 95% = bootstrap blok kab (kejadian satu kab saling berkait).
Baris logbook tanpa tanggal atau bertanggal di luar 2011..tahun ini dibuang dan dihitung di `dibuang`.
Tanpa cache (CI): keluar 0, berkas lama dibiarkan. Pakai: python3 scripts/cuaca/uji_logbook.py   |   ... uji
"""
import collections, csv, datetime as dt, gzip, json, os, random, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dasar import AKAR, KELUAR, WIB, simpan

LOGBOOK = os.path.join(AKAR, "data/pusdalops/logbook_kejadian.csv")
LATIH, UJI = (2016, 2021), (2022, 2025)
AMBANG = (20, 50, 100)
ULANG = 200
CAVEAT = [
    "Hujan yang dipakai adalah analisis ulang, bukan prakiraan sungguhan, jadi skor ini batas atas ketepatan prakiraan hujan.",
    "Sampel dipilih dari kabupaten/kota yang banyak mencatat banjir dan longsor, bukan acak se-Indonesia.",
    "Catatan logbook tidak memisahkan puting beliung, angin kencang, hujan es, dan hujan lebat, jadi ambang hujan wajar meleset.",
    "Logbook hanya memuat yang dilaporkan, sehingga kebiasaan kabupaten dan bulan ikut mencerminkan kebiasaan lapor.",
    "Prakiraan embusan angin belum bisa diuji karena baru mulai diarsipkan.",
]


def auc(pos, neg):
    """AUC peringkat (Mann-Whitney), seri dihitung setengah; None bila salah satu kosong."""
    if not pos or not neg:
        return None
    a = sorted([(s, 1) for s in pos] + [(s, 0) for s in neg])
    jum, i = 0.0, 0
    while i < len(a):
        j = i
        while j < len(a) and a[j][0] == a[i][0]:
            j += 1
        jum += sum(1 for t in range(i, j) if a[t][1]) * (i + j + 1) / 2
        i = j
    return (jum - len(pos) * (len(pos) + 1) / 2) / (len(pos) * len(neg))


def kontingensi(a, b, c, d):
    n = a + b + c + d
    ar = (a + b) * (a + c) / n if n else 0
    f = lambda x, y: round(x / y, 3) if y else None
    return {"a": a, "b": b, "c": c, "d": d, "pod": f(a, a + c), "far": f(b, a + b), "csi": f(a, a + b + c), "ets": f(a - ar, a + b + c - ar)}


def tabel(rec, skor, ambang_skor, n_alarm=None):
    """rec baris dict; alarm = skor >= ambang (atau n_alarm teratas bila diberi)."""
    ya = sorted(rec, key=lambda r: -r[skor])[:n_alarm] if n_alarm is not None else [r for r in rec if r[skor] >= ambang_skor]
    a = sum(r["e"] for r in ya)
    P = sum(r["e"] for r in rec)
    return kontingensi(a, len(ya) - a, P - a, len(rec) - len(ya) - (P - a))


def bangun(seri, kejadian, bulan, d_latih, d_uji, d_akhir):
    """seri {kab: [{"p","im"} per sel]}, kejadian {kab: {indeks hari}}, bulan[h] -> bulan 1..12.
    -> daftar baris uji {"k","h","p","im","p3","clk","cln","e","kemarin"}. Klimatologi dilatih hanya pada hari d_latih..d_uji-1."""
    nas = collections.defaultdict(lambda: [0, 0])
    kb = collections.defaultdict(lambda: [0, 0])
    for k in seri:
        for h in range(d_latih, d_uji):
            e = h in kejadian.get(k, ())
            nas[bulan[h]][0] += e; nas[bulan[h]][1] += 1
            kb[(k, bulan[h])][0] += e; kb[(k, bulan[h])][1] += 1
    rec = []
    for k, sel in seri.items():
        for h in range(d_uji, d_akhir + 1):
            n0, n1 = nas[bulan[h]]
            ln = n0 / n1 if n1 else 0
            e0, e1 = kb[(k, bulan[h])]
            rec.append({"k": k, "h": h, "p": max(s["p"][h] for s in sel), "im": max((s["im"][h] or 0) for s in sel),
                        "p3": max(sum(s["p"][h - i] for i in (0, 1, 2)) for s in sel),
                        "clk": (e0 + .1 * ln) / (e1 + .1), "cln": ln,
                        "e": int(h in kejadian.get(k, ())), "kemarin": int((h - 1) in kejadian.get(k, ()))})
    return rec


def selang(vals):
    vals = sorted(v for v in vals if v is not None)
    return [round(vals[int(.025 * (len(vals) - 1))], 3), round(vals[int(.975 * (len(vals) - 1))], 3)] if len(vals) >= 20 else None


def ringkas(rec, ulang=ULANG, seed=1):
    """Satu jenis kejadian -> blok hasil."""
    P = sum(r["e"] for r in rec)
    out = {"n_hari": len(rec), "n_kejadian": P, "laju": round(P / len(rec), 4) if rec else None}
    if not rec or not P or P == len(rec):
        return {**out, "catatan": "tanpa kejadian (atau semua hari kejadian): tidak dinilai"}
    A = lambda s, rr=rec: auc([r[s] for r in rr if r["e"]], [r[s] for r in rr if not r["e"]])
    out["auc"] = {nm: round(A(s), 3) for nm, s in (("hujan_harian_maks", "p"), ("hujan_jam_maks", "im"), ("hujan_3hari", "p3"),
                                                      ("klimatologi_kab_bulan", "clk"), ("klimatologi_bulan_nasional", "cln"))}
    kab = collections.defaultdict(list)
    for r in rec:
        kab[r["k"]].append(r)
    ks, rng = list(kab), random.Random(seed)
    dA = {"p": [], "clk": [], "sel": []}
    for _ in range(ulang):
        s = [r for k in rng.choices(ks, k=len(ks)) for r in kab[k]]
        if sum(r["e"] for r in s) < 20:
            continue
        ap, ac = A("p", s), A("clk", s)
        dA["p"].append(ap); dA["clk"].append(ac); dA["sel"].append(ap - ac)
    out["auc_selang95"] = {"hujan_harian_maks": selang(dA["p"]), "klimatologi_kab_bulan": selang(dA["clk"])}
    out["selisih_auc_hujan_klimatologi"] = {"nilai": round(out["auc"]["hujan_harian_maks"] - out["auc"]["klimatologi_kab_bulan"], 3), "selang95": selang(dA["sel"])}
    pers = tabel(rec, "kemarin", 1)
    out["persistensi"] = {**pers, "n_alarm": pers["a"] + pers["b"], "catatan": "laju alarm alaminya sendiri (ada kejadian kemarin)"}
    out["ambang_mm"] = {}
    for th in AMBANG:
        m = tabel(rec, "p", th)
        out["ambang_mm"][str(th)] = {"hujan": m, "klimatologi_alarm_sama": tabel(rec, "clk", None, m["a"] + m["b"]) if m["a"] + m["b"] else None}
    # selang ETS ambang 50 mm model vs klimatologi
    e_m, e_c = [], []
    for _ in range(ulang):
        s = [r for k in rng.choices(ks, k=len(ks)) for r in kab[k]]
        m = tabel(s, "p", 50)
        if sum(r["e"] for r in s) < 20 or m["a"] + m["b"] == 0:
            continue
        e_m.append(m["ets"]); e_c.append(tabel(s, "clk", None, m["a"] + m["b"])["ets"])
    out["ets50_selang95"] = {"hujan": selang(e_m), "klimatologi_alarm_sama": selang(e_c)}
    return out


def muat_logbook(jalur, awal, akhir):
    """-> ({jenis: {kab: {tanggal ISO}}}, dibuang). Tanpa tanggal / di luar 2011..tahun ini dibuang dan dihitung."""
    ev = collections.defaultdict(lambda: collections.defaultdict(set))
    dibuang = {"tanpa_tanggal": 0, "tanggal_tak_wajar": 0, "kab_kosong": 0}
    thn = dt.datetime.now(WIB).year
    for x in csv.DictReader(open(jalur, encoding="utf-8")):
        if x["jenis"] not in ("cuaca", "banjir"):
            continue
        t = x["tgl_kejadian"]
        if not t:
            dibuang["tanpa_tanggal"] += 1
            continue
        try:
            d = dt.date.fromisoformat(t)
        except ValueError:
            dibuang["tanggal_tak_wajar"] += 1
            continue
        if not (2011 <= d.year <= thn) or d > dt.datetime.now(WIB).date():
            dibuang["tanggal_tak_wajar"] += 1
            continue
        if not x["kab_kode"]:
            dibuang["kab_kosong"] += 1
            continue
        if awal <= d <= akhir:
            ev[x["jenis"]][x["kab_kode"]].add(t)
    return ev, dibuang


def main():
    sys.path.insert(0, os.path.join(AKAR, "scripts/banjir"))
    import uji_balik as u
    ada = os.path.isdir(u.CACHE) and any(f.endswith(".json.gz") for f in os.listdir(u.CACHE))
    if not ada:
        print("cuaca uji_logbook: cache ERA5 tidak ada (CI): berkas lama dibiarkan", file=sys.stderr)
        return 0
    sk = u.sel_per_kab()
    kab = {k: list(c) for k, c in sk.items() if c and all(os.path.exists(u.jalur(*s)) for s in c)}
    S = {}
    def ser(c):
        if c not in S:
            S[c] = u.deret(json.load(gzip.open(u.jalur(*c), "rt")))
        return S[c]
    seri = {k: [ser(c) for c in cells] for k, cells in kab.items()}
    d_latih, d_uji, d_akhir = u.hari_ke(dt.date(LATIH[0], 1, 1)), u.hari_ke(dt.date(UJI[0], 1, 1)), u.hari_ke(dt.date(UJI[1], 12, 31))
    bulan = {h: (u.AWAL + dt.timedelta(days=h)).month for h in range(0, d_akhir + 1)}
    ev, dibuang = muat_logbook(LOGBOOK, u.AWAL, u.AKHIR)
    jenis = {}
    for j in ("cuaca", "banjir"):
        kej = {k: {u.hari_ke(t) for t in ts} for k, ts in ev[j].items() if k in seri}
        jenis[j] = ringkas(bangun(seri, kej, bulan, d_latih, d_uji, d_akhir))
    isi = {"dibuat": dt.datetime.now(WIB).isoformat(timespec="minutes"), "versi": 1,
           "periode_latih": [f"{LATIH[0]}-01-01", f"{LATIH[1]}-12-31"], "periode_uji": [f"{UJI[0]}-01-01", f"{UJI[1]}-12-31"],
           "n_kab": len(seri), "kab": sorted(seri), "n_hari_uji": jenis["cuaca"]["n_hari"], "n_kejadian": jenis["cuaca"]["n_kejadian"],
           "dibuang": dibuang, "ambang_mm": list(AMBANG), "selang": f"95%, bootstrap blok kab, {ULANG} ulangan",
           "sumber": "Logbook Pusdalops BNPB (data/pusdalops/logbook_kejadian.csv) vs hujan ERA5 Open-Meteo archive (cache uji_balik banjir)",
           "jenis": jenis, "caveat": CAVEAT,
           "beku": "Berkas dihitung di mesin lokal (cache ERA5 tidak ada di CI) dan dibekukan pada tanggal `dibuat`."}
    simpan(os.path.join(KELUAR, "cuaca_uji_logbook.json"), isi)
    c = jenis["cuaca"]
    print(f"cuaca uji_logbook: {len(seri)} kab, {c['n_hari']} hari uji, {c['n_kejadian']} kejadian; AUC hujan {c['auc']['hujan_harian_maks']} klim {c['auc']['klimatologi_kab_bulan']}; "
          f"ETS50 {c['ambang_mm']['50']['hujan']['ets']} klim {(c['ambang_mm']['50']['klimatologi_alarm_sama'] or {}).get('ets')}; dibuang {dibuang}")
    return 0


def uji():
    assert auc([3, 4], [1, 2]) == 1 and auc([1], [1]) == .5 and auc([], [1]) is None and abs(auc([2, 1], [2, 1]) - .5) < 1e-9
    k = kontingensi(2, 1, 1, 6)
    assert (k["pod"], k["far"], k["csi"]) == (.667, .333, .5) and k["ets"] == round((2 - 3 * 3 / 10) / (4 - .9), 3)
    assert kontingensi(0, 0, 0, 5)["pod"] is None
    # fixture: 2 kab, 'A' kejadian saat hujan >= 50 di bulan 1 (uji), 'B' tanpa kejadian; hari 0..39 latih (h<20), uji 20..39
    n = 40
    hujan = lambda f: {"p": [f(h) for h in range(n)], "im": [1] * n}
    seri = {"A": [hujan(lambda h: 60 if h in (22, 30, 35) else 2)], "B": [hujan(lambda h: 2)]}
    bulan = {h: 1 + (h % 2) for h in range(n)}
    kej = {"A": {1, 3, 5, 22, 30, 35}}
    rec = bangun(seri, kej, bulan, 0, 20, 39)
    assert len(rec) == 40 and sum(r["e"] for r in rec) == 3
    assert max(r["clk"] for r in rec if r["k"] == "A") > max(r["clk"] for r in rec if r["k"] == "B")
    assert all(r["h"] >= 20 for r in rec)   # klimatologi dilatih sebelum uji, baris hanya periode uji
    out = ringkas(rec, ulang=30)
    assert out["auc"]["hujan_harian_maks"] == 1 and out["ambang_mm"]["50"]["hujan"]["pod"] == 1 and out["ambang_mm"]["50"]["hujan"]["far"] == 0
    assert out["persistensi"]["a"] == 0 and out["n_kejadian"] == 3
    assert ringkas([dict(rec[0], e=0)])["n_kejadian"] == 0
    import tempfile
    with tempfile.NamedTemporaryFile("w", suffix=".csv", delete=False) as f:
        f.write("jenis,tgl_kejadian,kab_kode\ncuaca,2022-03-01,11|A\ncuaca,,11|A\ncuaca,2030-06-22,11|A\nbanjir,2022-03-02,11|A\nlongsor,2022-03-02,11|A\ncuaca,2022-03-03,\n")
    e, d = muat_logbook(f.name, dt.date(2016, 1, 1), dt.date(2025, 12, 31))
    os.unlink(f.name)
    assert d == {"tanpa_tanggal": 1, "tanggal_tak_wajar": 1, "kab_kosong": 1} and e["cuaca"]["11|A"] == {"2022-03-01"} and "longsor" not in e
    print("ok uji_logbook")


if __name__ == "__main__":
    if sys.argv[1:] == ["uji"]:
        uji()
    else:
        sys.exit(main())
