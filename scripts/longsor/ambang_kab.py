"""Ambang hujan longsor per kabupaten (shrinkage ke ambang regional) + saring kecamatan, diuji pada logbook BNPB 2026.
Protokol & hasil: scripts/longsor/RISET-AMBANG-KAB.md. TIDAK mengubah aturan produksi (status.py:level_longsor) maupun public/.

Pisah waktu (ditetapkan sebelum menghitung hasil):
  LATIH  : kejadian DIBI "Tanah Longsor" 2015-2025 (2024 dibuang: DIBI hanya 222 baris, lubang pelaporan) + hujan NASA POWER harian.
           Pemilihan hiperparameter q: fit <= 2020, validasi 2021-2025, lalu fit ulang semua tahun.
  UJI    : label logbook BNPB 2026 (longsor + banjir_longsor, +-1 hari), tidak pernah dipakai untuk fit apa pun.
Fitur  : r(d) = max(persentil A3, persentil A7) hujan POWER kab itu terhadap klimatologi latih kab itu sendiri (skala-bebas, gaya LHASA P95);
         dibaca di hari d+1 (jendela hujan d-1..d+1, sama dengan geser -1 aturan berlaku -> prakiraan "sempurna").
Ambang : tau_k = (n*kuantil_q(r hari kejadian kab k) + M*tau_regional) / (n+M)   (empirical Bayes; n = kejadian latih kab k).

Pakai: python3 scripts/longsor/ambang_kab.py latih     unduh POWER+DIBI, fit -> scripts/longsor/ambang_kab_param.json
       python3 scripts/longsor/ambang_kab.py uji2026   evaluasi 2026 -> scripts/longsor/ambang_kab_hasil.json
       python3 scripts/longsor/ambang_kab.py uji       swauji luring
"""
import bisect, datetime as dt, gzip, json, math, os, random, sys, urllib.request
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor

AKAR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
sys.path.insert(0, os.path.join(AKAR, "scripts/banjir"))
import uji_logbook_longsor as U  # noqa: E402

MENTAH = os.path.join(AKAR, "data/raw/longsor_ambang")
RAW_LB = os.path.join(AKAR, "data/raw_logbook")
PARAM = os.path.join(AKAR, "scripts/longsor/ambang_kab_param.json")
HASIL = os.path.join(AKAR, "scripts/longsor/ambang_kab_hasil.json")
D0, D1 = dt.date(2014, 12, 1), dt.date(2026, 10, 22)
LATIH = (2015, 2025); BUANG = {2024}; SPLIT_VAL = 2020
QGRID = (0.1, 0.2, 0.3, 0.4, 0.5); M = 5
ULANG = 500


# ------------------------------------------------------------------ data
def power(kab, lat, lon):
    f = os.path.join(MENTAH, f"power_{kab}.json.gz")
    if not os.path.exists(f):
        u = ("https://power.larc.nasa.gov/api/temporal/daily/point?parameters=PRECTOTCORR&community=AG"
             f"&longitude={lon:.3f}&latitude={lat:.3f}&start={D0:%Y%m%d}&end={D1:%Y%m%d}&format=JSON")
        with urllib.request.urlopen(urllib.request.Request(u, headers={"User-Agent": "poskolongsor/1.0"}), timeout=180) as r:
            d = json.load(r)["properties"]["parameter"]["PRECTOTCORR"]
        os.makedirs(MENTAH, exist_ok=True)
        with gzip.open(f, "wt") as g:
            json.dump(d, g, separators=(",", ":"))
    return json.load(gzip.open(f, "rt"))


def deret_power(d):
    """{YYYYMMDD: mm} -> list harian D0..D1; -999 (kosong) -> 0 dan dihitung."""
    n = (D1 - D0).days + 1
    out, kosong = [], 0
    for i in range(n):
        v = d.get((D0 + dt.timedelta(i)).strftime("%Y%m%d"))
        if v is None or v < 0:
            kosong += 1; v = 0.0
        out.append(v)
    return out, kosong


def akum(p, w):
    c = [0.0]
    for x in p:
        c.append(c[-1] + x)
    return [c[i + 1] - c[max(0, i + 1 - w)] if i + 1 >= w else 0.0 for i in range(len(p))]


def dibi_latih():
    f = os.path.join(MENTAH, "dibi_longsor.json")
    if not os.path.exists(f):
        from kejadian import superset
        r = superset(["dt", "tahun", "provinsi", "kabupaten", "id_kab_bps", "jenis_bencana"], [("jumlah_kejadian", "SUM(jumlah_kejadian)")],
                     [{"col": "jenis_bencana", "op": "in", "val": ["Tanah Longsor", "Gerakan Tanah", "Banjir dan Tanah Longsor"]}])
        os.makedirs(MENTAH, exist_ok=True)
        json.dump(r, open(f, "w"))
    out = defaultdict(set)
    for x in json.load(open(f)):
        if x.get("id_kab_bps") and x.get("dt") and (x.get("jumlah_kejadian") or 0) >= 1:
            k = str(int(x["id_kab_bps"])); k = f"{k[:2]}.{k[2:]}"
            out[k].add(dt.datetime.fromtimestamp(x["dt"] / 1000, U.dt.timezone(dt.timedelta(hours=7))).date())
    return out


class Klim:
    """Persentil A3/A7 satu kab terhadap klimatologi latih kab itu; r(i) = max(pct3, pct7) pada indeks hari i."""

    def __init__(self, p):
        self.a3, self.a7 = akum(p, 3), akum(p, 7)
        ok = [i for i in range(len(p)) if LATIH[0] <= self.hari(i).year <= LATIH[1] and i >= 7]
        self.s3, self.s7 = sorted(self.a3[i] for i in ok), sorted(self.a7[i] for i in ok)

    @staticmethod
    def hari(i):
        return D0 + dt.timedelta(i)

    @staticmethod
    def pct(s, x):
        return (bisect.bisect_left(s, x) + bisect.bisect_right(s, x)) / (2 * len(s))

    def r(self, i):
        return max(self.pct(self.s3, self.a3[i]), self.pct(self.s7, self.a7[i]))


def idx(d):
    return (d - D0).days


# ------------------------------------------------------------------ fit
def kuantil(xs, q):
    xs = sorted(xs)
    return xs[min(len(xs) - 1, int(q * len(xs)))]


def fit(fitur, q, m=M):
    """fitur {kab: [r di hari kejadian]} -> (tau_reg, {kab: tau_k}, {kab: n}). Shrinkage menuju tau_reg."""
    semua = [x for v in fitur.values() for x in v]
    reg = kuantil(semua, q)
    return reg, {k: (len(v) * kuantil(v, q) + m * reg) / (len(v) + m) for k, v in fitur.items() if v}, {k: len(v) for k, v in fitur.items()}


def fitur_kejadian(klim, ev, tahun_ok):
    return {k: [klim[k].r(idx(d) + 1) for d in sorted(ev.get(k, ())) if tahun_ok(d.year)] for k in klim}


def csi_latih(klim, ev, tau_reg, tau, tahun_ok, pooled):
    a = b = c = 0
    for k, kl in klim.items():
        t = tau_reg if pooled else tau.get(k, tau_reg)
        lab = {idx(d) + s for d in ev.get(k, ()) if tahun_ok(d.year) for s in (-1, 0, 1)}
        for d in range(max(idx(dt.date(LATIH[0], 1, 1)), 8), idx(dt.date(LATIH[1], 12, 31)) + 1):
            if not tahun_ok(kl.hari(d).year):
                continue
            al, o = kl.r(d + 1) >= t, d in lab
            a += al and o; b += al and not o; c += (not al) and o
    return a / (a + b + c) if a + b + c else 0, a / (a + c) if a + c else 0, b / (a + b) if a + b else 1


def latih():
    units, _, _ = U.muat_unit()
    kabs = kab_sampel(units)
    titik = {k: (sum(u["lat"] for u in us) / len(us), sum(u["lon"] for u in us) / len(us)) for k, us in kab_unit(units, kabs).items()}
    with ThreadPoolExecutor(6) as ex:
        ps = dict(zip(titik, ex.map(lambda kv: power(kv[0], *kv[1]), titik.items())))
    klim, kosong = {}, {}
    for k, d in ps.items():
        p, kosong[k] = deret_power(d)
        klim[k] = Klim(p)
    ev = dibi_latih()
    # pemilihan q: fit <= 2020, validasi 2021-2025 (tanpa 2024). CSI validasi dibandingkan juga dengan ambang regional tunggal (pooled).
    ftr = fitur_kejadian(klim, ev, lambda y: LATIH[0] <= y <= SPLIT_VAL)
    val = {}
    for q in QGRID:
        reg, tau, _ = fit(ftr, q)
        ok = lambda y: SPLIT_VAL < y <= LATIH[1] and y not in BUANG
        val[q] = {"eb": csi_latih(klim, ev, reg, tau, ok, False), "pooled": csi_latih(klim, ev, reg, tau, ok, True)}
    qb = max(QGRID, key=lambda q: val[q]["eb"][0])
    ok_all = lambda y: LATIH[0] <= y <= LATIH[1] and y not in BUANG
    reg, tau, n = fit(fitur_kejadian(klim, ev, ok_all), qb)
    out = {"dibuat": dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%MZ"), "latih": f"DIBI longsor {LATIH[0]}-{LATIH[1]} tanpa {sorted(BUANG)}",
           "q": qb, "M": M, "tau_regional": reg, "tau": tau, "n_kejadian_latih": n, "validasi_2021_2025": {str(q): v for q, v in val.items()},
           "hari_kosong_power": kosong, "titik": titik}
    json.dump(out, open(PARAM, "w"), indent=1)
    print(f"q={qb} tau_reg={reg:.3f} kab={len(tau)}/{len(klim)}; validasi (csi,pod,far):")
    for q in QGRID:
        print(" ", q, {k: [round(x, 3) for x in v] for k, v in val[q].items()})


# ------------------------------------------------------------------ uji 2026
def kab_unit(units, kabs):
    out = defaultdict(list)
    for k, u in units.items():
        if u["kab"] in kabs:
            out[u["kab"]].append({**u, "key": k, "lat": u["sel"][0], "lon": u["sel"][1]})
    return out


def kab_sampel(units):
    """Kab dengan hujan ERA5 2026 lengkap di cache (sama dengan sampel uji_logbook_longsor)."""
    U.CACHE = os.path.join(RAW_LB, "longsor/era5_2026"); U.CACHE_BANJIR = os.path.join(RAW_LB, "banjir/uji_logbook")
    log = json.load(open(os.path.join(AKAR, "public/data/logbook_kejadian.json")))
    dibi = json.load(open(os.path.join(AKAR, "public/data/dibi_kejadian.json")))
    positif = {e["kab"] for e in U.label_logbook(log["kejadian"])} | set(U.label_dibi(dibi["kejadian"]))
    kabs, _, _ = U.pilih_sel(units, positif)
    return {k for k in kabs if all(os.path.exists(U.jalur(*u["sel"])) for u in units.values() if u["kab"] == k)}


def metr(blok):
    t = [sum(b[i] for b in blok.values()) for i in range(4)]
    return U.skor(*t), t


def boot(blokA, blokB=None, ulang=ULANG, seed=1):
    ks, r, s = sorted(blokA), random.Random(seed), defaultdict(list)
    for _ in range(ulang):
        ps = [r.choice(ks) for _ in ks]
        sa = U.skor(*[sum(blokA[k][i] for k in ps) for i in range(4)])
        for m, v in sa.items():
            s[m].append(v)
        if blokB:
            sb = U.skor(*[sum(blokB[k][i] for k in ps) for i in range(4)])
            s["d_ets"].append(None if sa["ets"] is None or sb["ets"] is None else sa["ets"] - sb["ets"])
    return {m: U.ci(v) for m, v in s.items()}


def ringkas(nama, blok, ref=None):
    sk, t = metr(blok)
    o = {"metode": nama, "n": dict(zip("abcd", t)), "alarm": t[0] + t[1], **{m: None if v is None else round(v, 4) for m, v in sk.items()},
         "ci95": boot(blok, ref)}
    if ref:
        o["d_ets_vs_ref"] = round((sk["ets"] or 0) - (metr(ref)[0]["ets"] or 0), 4)
    return o


def bangun(skor_baris, labels, n_alarm=None, ambang=None):
    """skor_baris {kab: [skor]}; alarm = skor >= ambang, atau N tertinggi global bila n_alarm. -> blok {kab: [a,b,c,d]}, set alarm."""
    if n_alarm is not None:
        sem = sorted(((s, k, i) for k, v in skor_baris.items() for i, s in enumerate(v)), key=lambda x: -x[0])
        al = {(k, i) for _, k, i in sem[:n_alarm]}
    else:
        al = {(k, i) for k, v in skor_baris.items() for i, s in enumerate(v) if s >= ambang}
    blok = {}
    for k, v in skor_baris.items():
        b = [0, 0, 0, 0]
        for i in range(len(v)):
            o = i in labels[k]
            b[(0 if o else 1) if (k, i) in al else (2 if o else 3)] += 1
        blok[k] = b
    return blok, al


def uji2026():
    P = json.load(open(PARAM))
    log = json.load(open(os.path.join(AKAR, "public/data/logbook_kejadian.json")))
    units, _, _ = U.muat_unit()
    kabs = sorted(kab_sampel(units))
    ku = kab_unit(units, set(kabs))
    per_kab = defaultdict(dict)
    for k, u in units.items():
        per_kab[u["kab"]].setdefault(u["kec"], k)
    lab = [e for e in U.label_logbook(log["kejadian"]) if U.UJI_DARI <= e["mulai"] <= U.UJI_SAMPAI + dt.timedelta(1)]
    for e in lab:
        e["unit"] = sorted({u for n in e["kec"] if (u := U.cocok_kec(n, per_kab.get(e["kab"], {})))})
    hari = list(range(U.hari_ke(U.UJI_DARI), U.hari_ke(U.UJI_SAMPAI) + 1))
    n = len(hari); H = lambda i: U.UJI_DARI + dt.timedelta(i)
    lab_kab, lab_kec, kosong = defaultdict(set), defaultdict(set), defaultdict(set)
    for e in lab:
        if e["kab"] not in kabs:
            continue
        w = {U.hari_ke(e["mulai"]) - U.hari_ke(U.UJI_DARI) + d for d in (-1, 0, 1)}
        lab_kab[e["kab"]] |= w
        for u in e["unit"]:
            lab_kec[u] |= w
        if not e["unit"]:
            kosong[e["kab"]] |= w
    # ---- skor tiap metode per kab-hari
    S = {"berlaku": {}, "pooled": {}, "eb": {}}; base_lvl = {}; kec_lvl = {}
    for kab in kabs:
        p, _ = deret_power(power(kab, *P["titik"][kab]))
        kl = Klim(p)
        r = [kl.r(idx(H(i)) + 1) for i in range(n)]
        S["pooled"][kab] = [x - P["tau_regional"] for x in r]
        S["eb"][kab] = [x - P["tau"].get(kab, P["tau_regional"]) for x in r]
        mx, sk = [0] * n, [0.0] * n
        for u in ku[kab]:
            c = U.deret(json.load(gzip.open(U.jalur(*u["sel"]), "rt")))
            lv = []
            for i, e in enumerate(hari):
                w = slice(e + U.GESER, e + U.GESER + 3)
                h3 = sum(c["p"][w]); ims = [x for x in c["im"][w] if x is not None]
                lv.append(U.level_longsor(h3, sum(c["p"][e - 7:e]), u["bahaya"], c["sm"][e], max(ims) if ims else None, k=U.K_LONGSOR))
                sk[i] = max(sk[i], h3 * u["bahaya"])
            kec_lvl[u["key"]] = lv
            mx = [max(a, b) for a, b in zip(mx, lv)]
        base_lvl[kab] = mx
        S["berlaku"][kab] = [m * 1e6 + s for m, s in zip(mx, sk)]   # level dulu, lalu H3 x bahaya untuk urutan
    B0, al0 = bangun(S["berlaku"], lab_kab, ambang=1e6)
    N0 = len(al0)
    hasil = {"split": {"latih": P["latih"], "uji": "logbook 2026 (belum dipakai fit)", "periode_uji": [str(U.UJI_DARI), str(U.UJI_SAMPAI)]},
             "param": {"q": P["q"], "M": P["M"], "tau_regional": round(P["tau_regional"], 4)}, "n_kab": len(kabs),
             "n_kab_hari": len(kabs) * n, "n_kab_hari_positif": sum(len(v) for v in lab_kab.values()) , "kab": {}}
    kab_rows = [ringkas("berlaku (>=Waspada)", B0)]
    for nama in ("pooled", "eb"):
        Bs, _ = bangun(S[nama], lab_kab, ambang=0.0)           # titik operasi sendiri (r >= tau)
        kab_rows.append(ringkas(f"{nama} @ambang sendiri", Bs, B0))
        Bn, _ = bangun(S[nama], lab_kab, n_alarm=N0)           # jumlah alarm sama dengan aturan berlaku
        kab_rows.append(ringkas(f"{nama} @N={N0} (sama dgn berlaku)", Bn, B0))
    # hibrida: aturan berlaku DAN r >= tau_kab (irisan); lalu N sama dengan hibrida untuk berlaku
    hib = {k: [b if e >= 0 else 0 for b, e in zip(S["berlaku"][k], S["eb"][k])] for k in kabs}
    Bh, alh = bangun(hib, lab_kab, ambang=1e6)
    kab_rows.append(ringkas("hibrida: berlaku DAN eb>=tau", Bh, B0))
    Bhn, _ = bangun(S["berlaku"], lab_kab, n_alarm=len(alh))
    kab_rows.append(ringkas(f"berlaku @N={len(alh)} (sama dgn hibrida)", Bhn, B0))
    Br, _ = bangun({k: [random.Random(i).random() for i in range(n)] for i, k in enumerate(kabs)}, lab_kab, n_alarm=N0)
    kab_rows.append(ringkas(f"acak @N={N0} (dasar)", Br, B0))
    hasil["kab_hari"] = kab_rows
    # AUC
    from collections import Counter
    for nama in ("berlaku", "pooled", "eb"):
        hist = {k: (Counter(), Counter()) for k in kabs}
        for k in kabs:
            for i, s in enumerate(S[nama][k]):
                hist[k][0 if i in lab_kab[k] else 1][round(s * (1 if nama == "berlaku" else 100))] += 1
        a, c = U.auc_ci(hist); hasil.setdefault("auc_kab", {})[nama] = {"auc": round(a, 3), "ci95": c}
    # ---- kecamatan-hari
    first = {}                                   # tanggal kejadian logbook pertama per kec (utk riwayat ke depan)
    for e in lab:
        for u in e["unit"]:
            first[u] = min(first.get(u, e["mulai"]), e["mulai"])
    bahaya = {u["key"]: u["bahaya"] for us in ku.values() for u in us}
    def kec_blok(boleh, alarm_kab):
        blok = {k: [0, 0, 0, 0] for k in kabs}
        for kab in kabs:
            for u in ku[kab]:
                for i in range(n):
                    if i in kosong.get(kab, ()) and i not in lab_kec.get(u["key"], ()):
                        continue
                    al = alarm_kab(kab, i) and boleh(u["key"], i)
                    o = i in lab_kec.get(u["key"], ())
                    blok[kab][(0 if o else 1) if al else (2 if o else 3)] += 1
        return blok
    kb = lambda kab, i: S["eb"][kab][i] >= 0
    riwayat = lambda key, i: key in first and first[key] < H(i) - dt.timedelta(2)
    Kb = kec_blok(lambda k, i: kec_lvl[k][i] >= 1, lambda kab, i: True)
    Ke = kec_blok(lambda k, i: True, kb)
    cut = sorted(bahaya.values())[len(bahaya) // 2]
    kec_rows = [ringkas("berlaku kec (>=Waspada)", Kb), ringkas("eb kab, semua kec", Ke, Kb)]
    kec_rows.append(ringkas(f"eb kab + bahaya>={cut:.2f} (median)", kec_blok(lambda k, i: bahaya[k] >= cut, kb), Kb))
    kec_rows.append(ringkas("eb kab + riwayat logbook sebelumnya", kec_blok(riwayat, kb), Kb))
    kec_rows.append(ringkas("hibrida kab (berlaku DAN eb) + semua kec berlaku", kec_blok(lambda k, i: kec_lvl[k][i] >= 1, lambda kab, i: S["eb"][kab][i] >= 0), Kb))
    kec_rows.append(ringkas("berlaku kec + riwayat logbook sebelumnya", kec_blok(lambda k, i: kec_lvl[k][i] >= 1 and riwayat(k, i), lambda a, i: True), Kb))
    hasil["kec_hari"] = kec_rows
    hasil["catatan"] = {"bahaya_kec_sebaran": {"median": cut, "porsi_1.0": round(sum(v >= 0.999 for v in bahaya.values()) / len(bahaya), 3)},
                        "riwayat": "kec dianggap punya riwayat bila ada kejadian logbook >= 3 hari sebelum hari itu (hanya masa lalu; tidak bocor)"}
    json.dump(hasil, open(HASIL, "w"), indent=1, ensure_ascii=False)
    for t in ("kab_hari", "kec_hari"):
        print(t)
        for r in hasil[t]:
            print(f"  {r['metode']:44s} alarm={r['alarm']:6d} POD={r['pod']} FAR={r['far']} CSI={r['csi']} ETS={r['ets']} dETS={r.get('d_ets_vs_ref')} ci_ets={r['ci95'].get('ets')} ci_dETS={r['ci95'].get('d_ets')}")
    print("AUC kab", hasil["auc_kab"])


# ------------------------------------------------------------------ swauji
def uji():
    # akumulasi
    assert akum([1, 1, 1, 1], 3) == [0.0, 0.0, 3.0, 3.0]
    # kuantil + shrinkage: kab tanpa/sedikit kejadian condong ke regional, banyak kejadian condong ke sendiri
    reg, tau, _ = fit({"a": [0.9] * 2, "b": [0.5] * 200, "c": []}, 0.5, m=5)
    assert "c" not in tau and abs(tau["b"] - 0.5) < 0.02 and tau["a"] < 0.9 and tau["a"] > reg, (reg, tau)
    assert abs(tau["a"] - (2 * 0.9 + 5 * reg) / 7) < 1e-9
    # persentil: nilai terbesar -> ~1, terkecil -> ~0
    s = list(range(100)); assert Klim.pct(s, 99) > .99 and Klim.pct(s, 0) < .01
    # top-N + ambang
    sk = {"a": [3, 1, 2], "b": [0, 5, 0]}; lab = {"a": {0}, "b": {1}}
    b, al = bangun(sk, lab, n_alarm=2); assert al == {("b", 1), ("a", 0)} and b["a"] == [1, 0, 0, 2] and b["b"] == [1, 0, 0, 2]
    b, al = bangun(sk, lab, ambang=2); assert len(al) == 3
    # seri berlaku sempurna -> POD 1, FAR 0, ETS 1 dan CI bootstrap terdefinisi
    b, _ = bangun({f"k{i}": [9, 0, 0, 0, 0, 0, 0, 0, 0, 0] * 3 for i in range(30)}, {f"k{i}": {0, 10, 20} for i in range(30)}, ambang=5)
    r = ringkas("x", b); assert r["pod"] == 1 and r["far"] == 0 and r["ets"] == 1, r
    print("ambang_kab: swauji lolos")


if __name__ == "__main__":
    {"latih": latih, "uji2026": uji2026, "uji": uji}[sys.argv[1] if len(sys.argv) > 1 else "uji"]()
