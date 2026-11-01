"""Uji LUAR-SAMPEL aturan status.py (BERLAKU) di 2026 dengan label logbook Pusdalops BNPB dan DIBI -> public/data/validasi_logbook_banjir.json

Aturan BERLAKU dipilih di 2016-2021 dan diuji di 2022-2025 (uji_balik.py). 2026 tidak pernah dipakai memilih apa pun, jadi ini
uji luar-sampel sebenarnya. Metrik, CI (bootstrap blok) dan aturan level sama dengan uji_balik.py (fungsinya diimpor).
Satuan kabupaten-hari 2026-01-01 .. AKHIR-1; level kabupaten = kecamatan tertinggi; hujan ERA5 (prakiraan sempurna).
Kabupaten di sini kode BPS 'pp.kk' (logbook & DIBI 2026 punya kab_kode); poligon geo dicocokkan lewat nama.

Label (kabupaten-hari kejadian):
  lb_mulai   logbook banjir/bandang/banjir_longsor, HANYA hari mulai (hari pemicu hujan; paling adil untuk aturan hujan)
  lb_aktif   logbook, mulai..surut (atau terlihat terakhir bila belum surut), maks 30 hari (hari surut ikut: POD tertekan)
  dibi       DIBI banjir/bandang/genangan/lahar/banjir+longsor (bukan rob), kejadian >= 1, tanggal laporan
  gab_mulai  lb_mulai U dibi          gab_aktif  lb_aktif U dibi
Selain per hari: POD per KEJADIAN logbook = porsi kejadian yang level kab-nya >= L pada mulai-1..mulai+1.
Sampel kabupaten: yang punya label 2026 (seperti uji_balik.pilih, urut prioritas) dalam anggaran sel; ditambah kontrol acak
tanpa label (kabupaten tak melapor BUKAN pasti tak banjir -> FAR "dengan kontrol" batas atas). Dilaporkan keduanya.
Vonis ditulis SEBELUM melihat hasil: LULUS bila batas bawah CI95 ETS(>= Waspada) > ETS_LULUS di label tersebut.

Intensitas: fitur hujan di hari mulai (maks atas sel kabupaten): H3 (mulai-1..mulai+1), A7, imax, sm; target tma_cm maks,
durasi_hari, rumah. Spearman + CI bootstrap (ulang per kabupaten), OLS log-linear log1p(y) ~ log1p(H3) + log1p(A7),
galat leave-one-kab-out vs penaksir konstan. SIGNAL bila batas bawah CI rho > 0,3 DAN skill LOKO > 0,1.

Pakai:  python3 scripts/banjir/uji_logbook.py ambil   unduh ERA5 2026 yang belum di cache (data/raw/banjir/uji_logbook)
        python3 scripts/banjir/uji_logbook.py         (tanpa jaringan) hitung dengan sel yang sudah ada (kab yang selnya lengkap)
        python3 scripts/banjir/uji_logbook.py uji     swauji luring
        python3 scripts/banjir/uji_logbook.py --arsip   uji arsip Pusdalops 2016-2022 (tanpa jaringan; hujan dari cache uji_balik)
                                                        -> public/data/validasi_logbook_banjir_arsip.json
"""
import csv, datetime as dt, gzip, json, math, os, random, re, sys
from collections import defaultdict

sys.path.insert(0, os.path.dirname(__file__))
import uji_balik as ub
from umum import KELUAR, MENTAH, baca, simpan
from uji_balik import BERLAKU, LEVEL, bootstrap, jumlah, skor
from status import level_banjir  # noqa: F401  (aturan dipakai lewat ub.level_harian)

AKAR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "../..")
LB, DIBI = (os.path.join(AKAR, f"public/data/{n}.json") for n in ("logbook_kejadian", "dibi_kejadian"))
AWAL, AKHIR = dt.date(2025, 12, 25), dt.date(2026, 10, 22)   # 7 hari A7 di depan; ERA5 telat ~5 hari
TAHUN0 = dt.date(2026, 1, 1)
CACHE = os.path.join(MENTAH, "uji_logbook")
JENIS_LB = {"banjir", "banjir_bandang", "banjir_longsor"}
JENIS_DIBI = {"Banjir", "Banjir Bandang", "Banjir Genangan", "Banjir Lahar (Lahar)", "Banjir dan Tanah Longsor"}
MAKS_AKTIF = 30
ETS_LULUS, RHO_MIN, SKILL_MIN = 0.1, 0.3, 0.1
ANGGARAN_SEL, N_KONTROL, ULANG = 400, 30, 1000
NAMA = ["lb_mulai", "lb_aktif", "dibi", "gab_mulai", "gab_aktif"]


def pasang():
    """ub membaca AWAL/AKHIR/CACHE dari modulnya sendiri: arahkan ke 2026 (cache terpisah, nama berkas sama dengan 2016-2025)."""
    ub.AWAL, ub.AKHIR, ub.CACHE, ub.PER_PANGGIL, ub.JEDA = AWAL, AKHIR, CACHE, 10, 45


def hari_ke(tgl):
    return (dt.date.fromisoformat(tgl) - AWAL).days


# ------------------------------------------------------------------ label
def label_dari(lb, dibi, akhir=None):
    """-> ({nama: {kode: {hari}}}, [kejadian logbook banjir yang dipakai]). Hari di luar 1 Jan .. akhir dibuang."""
    akhir = akhir or AKHIR - dt.timedelta(days=1)
    lo, hi = (TAHUN0 - AWAL).days, (akhir - AWAL).days
    ok = lambda i: lo <= i <= hi
    out = {n: defaultdict(set) for n in NAMA}
    kej = []
    for e in lb:
        if e["jenis"] not in JENIS_LB or not e.get("kab_kode"):
            continue
        m = e["mulai"] or e["terlihat"][0]
        if e["mulai"] is None and e["terlihat"][0] < TAHUN0.isoformat():
            continue
        a = hari_ke(m)
        z = hari_ke(e.get("surut") or e["terlihat"][1])
        z = min(max(z, a), a + MAKS_AKTIF)
        kej.append({**e, "_a": a})
        if ok(a):
            out["lb_mulai"][e["kab_kode"]].add(a)
        out["lb_aktif"][e["kab_kode"]] |= {i for i in range(a, z + 1) if ok(i)}
    for e in dibi:
        if e["jenis"] in JENIS_DIBI and e.get("kejadian", 0) >= 1 and e.get("kab_kode") and ok(hari_ke(e["tanggal"])):
            out["dibi"][e["kab_kode"]].add(hari_ke(e["tanggal"]))
    for k in {*out["lb_mulai"], *out["dibi"]}:
        out["gab_mulai"][k] = out["lb_mulai"].get(k, set()) | out["dibi"].get(k, set())
    for k in {*out["lb_aktif"], *out["dibi"]}:
        out["gab_aktif"][k] = out["lb_aktif"].get(k, set()) | out["dibi"].get(k, set())
    return out, kej


def bersih(s):
    return re.sub(r"[^a-z0-9]", "", s.lower())


def kode_geo(kab_desa, kunci_geo):
    """kab_desa {'32.01': 'Bogor', '32.71': 'Kota Bogor'}; kunci_geo [(prov, nama geo)] -> {(prov, nama): 'pp.kk'}. Nama 'Kota X' membedakan kota."""
    idx = {}
    for kode, nama in kab_desa.items():
        kota = kode[3:5] >= "71"
        idx[(kode[:2], kota, bersih(re.sub(r"^(?:kab\.|kota)\s*", "", nama, flags=re.I)))] = kode
    out = {}
    for p, n in kunci_geo:
        kota = n.lower().startswith("kota ")
        k = idx.get((p, kota, bersih(re.sub(r"^(?:kab\.|kota)\s*", "", n, flags=re.I))))
        if k:
            out[(p, n)] = k
    return out


def sel_per_kode():
    """-> {kode: {(lat, lon): [bahaya banjir, bahaya longsor]}} (memakai ub.sel_per_kab)."""
    kab_desa = json.load(open(os.path.join(AKAR, "public/data/desa_cari.json")))["kab"]
    sk = ub.sel_per_kab()
    peta = kode_geo(kab_desa, [tuple(k.split("|", 1)) for k in sk])
    out = defaultdict(dict)
    for k, v in sk.items():
        kode = peta.get(tuple(k.split("|", 1)))
        if kode:
            for s, b in v.items():
                o = out[kode].setdefault(s, [0, 0])
                o[0], o[1] = max(o[0], b[0]), max(o[1], b[1])
    return out, len(sk) - len({k for k in sk if tuple(k.split("|", 1)) in peta})


def pilih_sampel(lab, kej, sk, anggaran=ANGGARAN_SEL, n_kontrol=N_KONTROL, seed=7):
    """Kab berlabel dulu (yang punya kejadian logbook ber-tma/durasi di depan, lalu hari label terbanyak) sampai anggaran sel,
    kab > MAKS_SEL_KAB sel dilewati. Lalu n_kontrol kab tanpa label (acak, seed tetap) -> (berlabel, kontrol)."""
    gab = lab["gab_aktif"]
    intens = {e["kab_kode"] for e in kej if "tma_cm" in e or e.get("durasi_hari") is not None}
    berlabel = sorted((k for k in gab if k in sk), key=lambda k: (k not in intens, -len(gab[k]), k))
    sel, out = set(), []
    for k in berlabel:
        if len(sk[k]) <= ub.MAKS_SEL_KAB and len(sel | set(sk[k])) <= anggaran:
            out.append(k)
            sel |= set(sk[k])
    sisa = sorted(k for k in sk if k not in gab and len(sk[k]) <= 3)
    random.Random(seed).shuffle(sisa)
    kontrol = sisa[:n_kontrol]
    return out, kontrol


# ------------------------------------------------------------------ penilaian
def blok_label(cuaca, sk, kabs, kej_hari):
    """-> ({(kab, 2026): [[a,b,c,d]x3]}, {kab: [level per hari]}) untuk kab yang SEMUA selnya ada di cuaca."""
    lo, hi = (TAHUN0 - AWAL).days, (AKHIR - AWAL).days - 3   # e+1 untuk geser -1 harus ada; sisakan ujung
    hari = list(range(lo, hi + 1))
    blok, lv_kab = {}, {}
    for kab in kabs:
        if not all(s in cuaca for s in sk[kab]):
            continue
        lv = [max(t) for t in zip(*(ub.level_harian(cuaca[s], b, "banjir", BERLAKU["banjir"], hari) for s, b in sk[kab].items()))]
        lv_kab[kab] = dict(zip(hari, lv))
        kej = kej_hari.get(kab, set())
        t = [[0, 0, 0, 0] for _ in LEVEL]
        for e, l in zip(hari, lv):
            o = e in kej
            for i, L in enumerate(LEVEL):
                t[i][(0 if o else 1) if l >= L else (2 if o else 3)] += 1
        blok[(kab, 2026)] = t
    return blok, lv_kab


def ringkas_blok(blok, ulang=ULANG):
    """Skor + CI per level; kosong -> None."""
    if not blok:
        return None
    out = {}
    for i, L in enumerate(LEVEL):
        n = jumlah(blok, sorted(blok), i)
        s = skor(*n)
        out[LEVEL[L]] = {**{m: None if v is None else round(v, 3) for m, v in s.items()}, "ci": bootstrap(blok, i, ulang),
                         "n": dict(zip("abcd", n)), "laju": round((n[0] + n[2]) / sum(n), 4) if sum(n) else None}
    return out


def vonis(r):
    ci = (r or {}).get("waspada", {}).get("ci", {}).get("ets")
    if not ci:
        return "TAK DAPAT DINILAI (tanpa kejadian/ETS)"
    return "LULUS" if ci[0] > ETS_LULUS else "TIDAK LULUS"


def pod_kejadian(kej, lv_kab):
    """Porsi kejadian logbook (hari mulai dalam rentang nilai) yang level kab-nya >= L pada mulai-1..mulai+1."""
    n, ya = 0, [0] * len(LEVEL)
    for e in kej:
        lv = lv_kab.get(e["kab_kode"])
        if not lv or e["_a"] not in lv:
            continue
        n += 1
        mx = max(lv.get(i, 0) for i in (e["_a"] - 1, e["_a"], e["_a"] + 1))
        for i, L in enumerate(LEVEL):
            ya[i] += mx >= L
    return {"n_kejadian": n, **{LEVEL[L]: round(ya[i] / n, 3) if n else None for i, L in enumerate(LEVEL)}}


# ------------------------------------------------------------------ intensitas
def rank(x):
    o = sorted(range(len(x)), key=lambda i: x[i])
    r, i = [0.0] * len(x), 0
    while i < len(o):
        j = i
        while j + 1 < len(o) and x[o[j + 1]] == x[o[i]]:
            j += 1
        for t in range(i, j + 1):
            r[o[t]] = (i + j) / 2 + 1
        i = j + 1
    return r


def spearman(x, y):
    if len(x) < 3:
        return None
    a, b = rank(x), rank(y)
    ma, mb = sum(a) / len(a), sum(b) / len(b)
    sa = math.sqrt(sum((v - ma) ** 2 for v in a))
    sb = math.sqrt(sum((v - mb) ** 2 for v in b))
    return sum((u - ma) * (v - mb) for u, v in zip(a, b)) / (sa * sb) if sa and sb else None


def rho_ci(x, y, grup, ulang=ULANG, seed=3):
    """rho + CI95, ulang per kelompok (kabupaten): kejadian satu kab tidak saling bebas."""
    r0 = spearman(x, y)
    ids = defaultdict(list)
    for i, g in enumerate(grup):
        ids[g].append(i)
    ks, r, xs = sorted(ids), random.Random(seed), []
    for _ in range(ulang):
        idx = [i for g in (r.choice(ks) for _ in ks) for i in ids[g]]
        v = spearman([x[i] for i in idx], [y[i] for i in idx])
        if v is not None:
            xs.append(v)
    xs.sort()
    ci = [round(xs[int(.025 * (len(xs) - 1))], 3), round(xs[int(.975 * (len(xs) - 1))], 3)] if xs else None
    return (None if r0 is None else round(r0, 3)), ci


def ols(X, y):
    """Kuadrat terkecil lewat persamaan normal + eliminasi Gauss; X baris berisi fitur (tanpa 1). -> [b0, b1, ...] atau None."""
    k = len(X[0]) + 1
    A = [[0.0] * (k + 1) for _ in range(k)]
    for x, t in zip(X, y):
        v = [1.0, *x]
        for i in range(k):
            for j in range(k):
                A[i][j] += v[i] * v[j]
            A[i][k] += v[i] * t
    for i in range(k):
        A[i][i] += 1e-9   # ridge kecil: fitur kolinear tidak meledak
        p = max(range(i, k), key=lambda r: abs(A[r][i]))
        if abs(A[p][i]) < 1e-12:
            return None
        A[i], A[p] = A[p], A[i]
        for r in range(k):
            if r != i:
                f = A[r][i] / A[i][i]
                A[r] = [a - f * b for a, b in zip(A[r], A[i])]
    return [A[i][k] / A[i][i] for i in range(k)]


def loko(X, y, grup):
    """Leave-one-kab-out: RMSE (ruang log1p) model vs penaksir rata-rata latih; skill = 1 - mse_model/mse_dasar."""
    se_m = se_b = 0.0
    for g in sorted(set(grup)):
        lat = [i for i, v in enumerate(grup) if v != g]
        uji_ = [i for i, v in enumerate(grup) if v == g]
        b = ols([X[i] for i in lat], [y[i] for i in lat]) if len(lat) > len(X[0]) + 1 else None
        if b is None:
            return None
        m = sum(y[i] for i in lat) / len(lat)
        for i in uji_:
            se_m += (b[0] + sum(c * f for c, f in zip(b[1:], X[i])) - y[i]) ** 2
            se_b += (m - y[i]) ** 2
    n = len(y)
    return {"rmse_log": round(math.sqrt(se_m / n), 3), "rmse_dasar": round(math.sqrt(se_b / n), 3),
            "skill": round(1 - se_m / se_b, 3) if se_b else None}


def fitur_kejadian(e, cuaca, sk):
    """Fitur hujan di hari mulai, maks atas sel kab: H3 (mulai-1..mulai+1), A7, imax, sm. None bila sel belum lengkap/hari di luar rentang."""
    a = e["_a"]
    if not all(s in cuaca for s in sk) or a < 7 or a + 2 > (AKHIR - AWAL).days:
        return None
    h3, a7, im, sm = [], [], [], []
    for s in sk:
        c = cuaca[s]
        h3.append(sum(c["p"][a - 1:a + 2]))
        a7.append(sum(c["p"][a - 7:a]))
        im.append(max([x for x in c["im"][a - 1:a + 2] if x is not None] or [0]))
        sm.append(c["sm"][a] if c["sm"][a] is not None else 0)
    return {"h3": max(h3), "a7": max(a7), "imax": max(im), "sm": max(sm)}


TARGET = {"tma_cm": lambda e: e["tma_cm"][1] if e.get("tma_cm") else None, "durasi_hari": lambda e: e.get("durasi_hari"),
          "rumah": lambda e: e.get("rumah")}


def intensitas(kej, cuaca, sk_kode, ulang=ULANG):
    baris = []
    for e in kej:
        if e["kab_kode"] in sk_kode:
            f = fitur_kejadian(e, cuaca, sk_kode[e["kab_kode"]])
            if f:
                baris.append((e, f))
    out = {"n_kejadian_berhujan": len(baris), "target": {}}
    for nama, ambil in TARGET.items():
        b = [(e, f, ambil(e)) for e, f in baris if ambil(e) is not None and ambil(e) >= 0 and (nama != "tma_cm" or ambil(e) > 0)]
        g = [e["kab_kode"] for e, _, _ in b]
        y = [math.log1p(t) for _, _, t in b]
        r = {"n": len(b), "n_kab": len(set(g)), "spearman": {}}
        if len(b) < 15 or len(set(g)) < 5:
            r["catatan"] = "n terlalu kecil untuk dinilai"
            out["target"][nama] = r
            continue
        for k in ("h3", "a7", "imax", "sm"):
            rho, ci = rho_ci([f[k] for _, f, _ in b], [t for _, _, t in b], g, ulang)
            r["spearman"][k] = {"rho": rho, "ci": ci}
        X = [[math.log1p(f["h3"]), math.log1p(f["a7"])] for _, f, _ in b]
        co = ols(X, y)
        r["rumus"] = None if co is None else {"log1p_y": f"{co[0]:.3f} + {co[1]:.3f}*log1p(H3) + {co[2]:.3f}*log1p(A7)", "koef": [round(c, 4) for c in co]}
        r["loko"] = loko(X, y, g)
        kuat = [k for k, v in r["spearman"].items() if v["ci"] and v["ci"][0] > RHO_MIN]
        r["sinyal"] = bool(kuat and r["loko"] and r["loko"]["skill"] is not None and r["loko"]["skill"] > SKILL_MIN)
        out["target"][nama] = r
    return out


# ------------------------------------------------------------------ jalan
def muat_cuaca(sel):
    cuaca = {}
    for s in sel:
        if os.path.exists(ub.jalur(*s)):
            with gzip.open(ub.jalur(*s), "rt") as f:
                cuaca[s] = ub.deret(json.load(f))
    return cuaca


def siapkan():
    pasang()
    lab, kej = label_dari(json.load(open(LB))["kejadian"], json.load(open(DIBI))["kejadian"])
    sk, tanpa_kode = sel_per_kode()
    lbl, kontrol = pilih_sampel(lab, kej, sk)
    sel = {s for k in lbl + kontrol for s in sk[k]}
    return lab, kej, sk, lbl, kontrol, sel, tanpa_kode


def main(ambil_saja=False):
    lab, kej, sk, lbl, kontrol, sel, tanpa_kode = siapkan()
    print(f"sampel: {len(lbl)} kab berlabel + {len(kontrol)} kontrol, {len(sel)} sel ({tanpa_kode} kab geo tanpa kode BPS)", file=sys.stderr)
    if ambil_saja:
        sys.exit(0 if ub.ambil_cuaca(sel) else 1)
    cuaca = muat_cuaca(sel)
    ada = lambda ks: [k for k in ks if all(s in cuaca for s in sk[k])]
    lbl_ok, kon_ok = ada(lbl), ada(kontrol)
    print(f"dinilai: {len(lbl_ok)}/{len(lbl)} kab berlabel, {len(kon_ok)}/{len(kontrol)} kontrol (sel di cache {len(cuaca)}/{len(sel)})", file=sys.stderr)
    hasil = {}
    for n in NAMA:
        blok, lv = blok_label(cuaca, sk, lbl_ok + kon_ok, lab[n])
        b_lbl = {k: v for k, v in blok.items() if k[0] in set(lbl_ok)}
        r = {"hanya_kab_berlabel": ringkas_blok(b_lbl), "dengan_kontrol": ringkas_blok(blok), "kab_berlabel": len(b_lbl), "kab_kontrol": len(blok) - len(b_lbl)}
        r["vonis"] = vonis(r["hanya_kab_berlabel"])
        if n == "lb_mulai":
            r["pod_kejadian"] = pod_kejadian([e for e in kej if e["kab_kode"] in set(lbl_ok)], lv)
        hasil[n] = r
        for nm, rr in (("kab berlabel", r["hanya_kab_berlabel"]), ("+kontrol", r["dengan_kontrol"])):
            if rr:
                for L in ("waspada", "siaga", "awas"):
                    x = rr[L]
                    print(f"{n:10s} {nm:12s} >={L:8s} n={x['n']}  POD {x['pod']} FAR {x['far']} CSI {x['csi']} ETS {x['ets']} {x['ci']['ets'] if 'ets' in x['ci'] else ''}")
        print(f"{n:10s} VONIS {r['vonis']}" + (f"  POD/kejadian {r['pod_kejadian']}" if "pod_kejadian" in r else ""))
    kd = {k: sk[k] for k in lbl_ok}
    inten = intensitas([e for e in kej], cuaca, kd)
    for nm, r in inten["target"].items():
        print(f"intensitas {nm}: n={r['n']} kab={r.get('n_kab')} rho={ {k: (v['rho'], v['ci']) for k, v in r['spearman'].items()} } loko={r.get('loko')} sinyal={r.get('sinyal')}")
    # public/data, bukan public/banjir/data: data.yml memulihkan cache banjir- sebelum deploy dan akan menimpanya
    jalur = os.path.normpath(os.path.join(KELUAR, "..", "..", "data", "validasi_logbook_banjir.json"))
    sekarang = dt.datetime.now(dt.timezone(dt.timedelta(hours=7)))
    try:
        lama = json.load(open(jalur))
    except (OSError, ValueError):
        lama = {}
    # cache hujan hilang/kuota habis -> sampel menyempit: jangan timpa hasil yang lebih luas (CI berjalan diam-diam)
    n_lama = (lama.get("sampel") or {}).get("kab_berlabel_dinilai") or 0
    if len(lbl_ok) < n_lama:
        print(f"LEWAT: {len(lbl_ok)} kab dinilai < {n_lama} di hasil lama; {os.path.relpath(jalur)} dibiarkan", file=sys.stderr)
        return
    riwayat = lama.get("riwayat") or []
    w = ((hasil.get("lb_aktif") or {}).get("hanya_kab_berlabel") or {}).get("waspada") or {}
    riwayat = [x for x in riwayat if x.get("tanggal") != sekarang.date().isoformat()][-399:] + [{
        "tanggal": sekarang.date().isoformat(), "kab_dinilai": len(lbl_ok), "ets_waspada": w.get("ets"), "pod_waspada": w.get("pod"),
        "far_waspada": w.get("far"), "vonis": (hasil.get("lb_aktif") or {}).get("vonis")}]
    simpan(jalur, {
        "dibuat": sekarang.isoformat(timespec="minutes"),
        "periode": f"{TAHUN0} .. {AKHIR - dt.timedelta(days=4)}", "aturan": BERLAKU["banjir"],
        "sampel": {"kab_berlabel_diminta": len(lbl), "kab_berlabel_dinilai": len(lbl_ok), "kontrol_diminta": len(kontrol),
                   "kontrol_dinilai": len(kon_ok), "sel_diminta": len(sel), "sel_ada": len(cuaca), "anggaran_sel": ANGGARAN_SEL},
        "kriteria": {"ets_lulus_batas_bawah_ci": ETS_LULUS, "rho_min": RHO_MIN, "skill_loko_min": SKILL_MIN},
        "label": hasil, "intensitas": inten,
        "pembanding_penaksir_lain": "kedalaman_genangan.py (FwDET) dan dampak.py tidak menghasilkan angka per kejadian 2026 yang sebanding "
                                    "(FwDET: cache GFM+DEM hanya untuk Kalsel/Jateng/Sumbar tahun uji; dampak.py: penduduk kecamatan berstatus hari ini, bukan rumah terendam).",
        "catatan": "Uji luar-sampel (2026 tak dipakai memilih BERLAKU). Hujan ERA5 sebagai prakiraan sempurna. Label logbook = yang dilaporkan "
                   "BPBD ke Pusdalops, bukan sensus; kab tanpa laporan bukan pasti tanpa banjir, jadi FAR batas atas. Sampel kab "
                   "berlabel = seperti uji_balik.pilih (bias ke kab yang punya kejadian).", "riwayat": riwayat}, )
    print(f"{os.path.relpath(jalur)} ditulis", file=sys.stderr)


# ------------------------------------------------------------------ ARSIP Pusdalops 2011-2022 (--arsip)
# Label: data/pusdalops/logbook_kejadian.csv (kab_kode 'pp|Nama' = kunci ub.sel_per_kab). Hujan: ERA5 cache uji_balik (2015-12-22..2026-01-03),
# jadi hanya kabupaten yang SEMUA selnya sudah di cache dan hanya 2016-2025 yang bisa dinilai; tidak ada unduhan di mode ini.
# Hari dinilai = hari yang tercakup logbook (tahun penuh: semua hari; tahun parsial: hari yang punya kejadian dicatat/terakhir dicatat):
# tak ada laporan di hari yang tak tercakup BUKAN negatif.
CSV_ARSIP = os.path.join(AKAR, "data/pusdalops/logbook_kejadian.csv")
RIWAYAT_LB = os.path.join(AKAR, "public/data/logbook_riwayat.json")
KELUAR_ARSIP = os.path.join(AKAR, "public/data/validasi_logbook_banjir_arsip.json")
NAMA_LV = ("waspada", "siaga", "awas")


def tgl_aman(s):
    try:
        return dt.date.fromisoformat(s)
    except (ValueError, TypeError):
        return None


def arsip_baca():
    """-> (baris csv, {tahun: set(date) hari tercakup}) hanya tahun 2016..2025 yang ada di logbook_riwayat.hari_tercatat."""
    baris = list(csv.DictReader(open(CSV_ARSIP, encoding="utf-8")))
    ht = json.load(open(RIWAYAT_LB))["hari_tercatat"]
    cakup = {}
    for y in sorted(int(k) for k in ht):
        if not 2016 <= y <= 2025:
            continue
        if ht[str(y)] >= 365:
            cakup[y] = {dt.date(y, 1, 1) + dt.timedelta(i) for i in range((dt.date(y + 1, 1, 1) - dt.date(y, 1, 1)).days)}
        else:   # parsial: hari yang punya berkas = hari tampil sebagai pertama/terakhir dicatat
            cakup[y] = {d for r in baris for d in map(tgl_aman, (r["pertama_dicatat"], r["terakhir_dicatat"])) if d and d.year == y}
    return baris, cakup


def arsip_label(baris, jenis, lebar_jendela=0, aktif=False):
    """-> {kab: set(date)} untuk kejadian `jenis`. Hari = tgl_kejadian (atau pertama_dicatat bila kosong), +-lebar_jendela;
    aktif=True: sampai terakhir_dicatat maks MAKS_AKTIF hari. Kejadian lintas kab dihitung di tiap kab."""
    out = defaultdict(set)
    for r in baris:
        if r["jenis"] != jenis:
            continue
        a = tgl_aman(r["tgl_kejadian"]) or tgl_aman(r["pertama_dicatat"])
        if not a or not 2009 <= a.year <= 2025:
            continue
        z = a
        if aktif:
            t = tgl_aman(r["terakhir_dicatat"])
            z = min(max(t, a), a + dt.timedelta(MAKS_AKTIF)) if t else a
        hari = {a + dt.timedelta(i) for i in range(-lebar_jendela, (z - a).days + lebar_jendela + 1)}
        for k in filter(None, r["kab_kode"].split("; ")):
            out[k] |= hari
    return out


def arsip_siapkan():
    """-> (sk, kabs_lengkap, cuaca, baris, cakup). Kab lengkap = semua selnya di cache uji_balik."""
    baris, cakup = arsip_baca()
    sk = ub.sel_per_kab()
    kabs = sorted(k for k in sk if all(os.path.exists(ub.jalur(*s)) for s in sk[k]))
    cuaca = {}
    for s in {s for k in kabs for s in sk[k]}:
        with gzip.open(ub.jalur(*s), "rt") as f:
            cuaca[s] = ub.deret(json.load(f))
    return sk, kabs, cuaca, baris, cakup


def arsip_level(jenis, sk, kabs, cuaca, tahun):
    """-> {kab: {date: level kab}} untuk hari-hari tahun `tahun` yang ada di jendela ERA5 (aturan BERLAKU, level kab = maks sel)."""
    hari = {}
    for y in tahun:
        for e in range(max(ub.hari_ke(dt.date(y, 1, 1)), 7), min(ub.hari_ke(dt.date(y, 12, 31)), ub.hari_ke(ub.AKHIR) - 2) + 1):
            hari[e] = ub.AWAL + dt.timedelta(e)
    idx = sorted(hari)
    out = {}
    for kab in kabs:
        lv = [max(t) for t in zip(*(ub.level_harian(cuaca[s], b, jenis, BERLAKU[jenis], idx) for s, b in sk[kab].items()))]
        out[kab] = {hari[e]: l for e, l in zip(idx, lv)}
    return out


LATIH = range(2016, 2022)   # tahun penyetel (BERLAKU dipilih di sini); klimatologi juga hanya belajar dari sini
LUAR = (2022, 2023, 2024, 2025)
LEVEL_MIN = min(LEVEL)   # Waspada


def arsip_laju(label, cakup, kabs):
    """-> ({kab: {bulan: laju label}}, {kab: [hari tercakup per bulan]}) dari tahun LATIH saja."""
    laju, hari = {}, {}
    for kab in kabs:
        kej, n, k = label.get(kab, set()), [0] * 13, [0] * 13
        for y in LATIH:
            for d in cakup.get(y, ()):
                n[d.month] += 1
                k[d.month] += d in kej
        laju[kab] = {m: k[m] / n[m] for m in range(1, 13) if n[m]}
        hari[kab] = n
    return laju, hari


def arsip_klim(laju, label, cakup, kabs):
    """Klimatologi per kab: bulan 'rawan' = laju label bulan itu (LATIH) > laju kab keseluruhan. -> {kab: set(bulan)}"""
    out = {}
    for kab in kabs:
        kej = label.get(kab, set())
        tot = sum(d in kej for y in LATIH for d in cakup.get(y, ())) / max(sum(len(cakup.get(y, ())) for y in LATIH), 1)
        out[kab] = {m for m, r in laju[kab].items() if r > tot}
    return out


def arsip_klim_sama(laju, hari, kabs, q):
    """Klimatologi dengan LAJU ALARM sama dengan model (q = porsi hari-kab Waspada model di LATIH): per kab ambil bulan berlaju
    tertinggi sampai porsi hari >= q. Hanya memakai laju alarm model, bukan hasilnya di tahun uji. -> {kab: set(bulan)}"""
    out = {}
    for kab in kabs:
        tot, isi, ms = sum(hari[kab]), 0, set()
        for m in sorted(laju[kab], key=lambda m: -laju[kab][m]):
            if isi >= q * tot:
                break
            ms.add(m)
            isi += hari[kab][m]
        out[kab] = ms
    return out


def laju_alarm_model(lv, cakup):
    """Porsi hari-kab tercakup di LATIH dengan level model >= Waspada (tanpa melihat label)."""
    n = a = 0
    for per_hari in lv.values():
        for d, l in per_hari.items():
            if d.year in LATIH and d in cakup[d.year]:
                n += 1
                a += l >= LEVEL_MIN
    return a / n


def arsip_blok(lv, label, cakup, klim=None, klim2=None):
    """-> {(kab, tahun): [[a,b,c,d] untuk waspada, siaga, awas, PERSISTEN, KLIMATOLOGI]}; hanya hari tercakup logbook.
    Persisten = alarm di hari d bila hari d-1 berlabel; klimatologi = alarm bila bulan d rawan menurut arsip_klim (keduanya tanpa hujan)."""
    blok = {}
    for kab, per_hari in lv.items():
        kej = label.get(kab, set())
        for y, ada in cakup.items():
            t = [[0, 0, 0, 0] for _ in range(len(LEVEL) + 3)]
            n = 0
            for d, l in per_hari.items():
                if d.year != y or d not in ada:
                    continue
                n += 1
                o = d in kej
                for i, L in enumerate(LEVEL):
                    t[i][(0 if o else 1) if l >= L else (2 if o else 3)] += 1
                p = (d - dt.timedelta(1)) in kej
                t[3][(0 if o else 1) if p else (2 if o else 3)] += 1
                if klim is not None:
                    t[4][(0 if o else 1) if d.month in klim[kab] else (2 if o else 3)] += 1
                    t[5][(0 if o else 1) if d.month in klim2[kab] else (2 if o else 3)] += 1
            if n:
                blok[(kab, y)] = t
    return blok


def ets_pasang(blok, ia, ib, ulang=ULANG, seed=11):
    """Selisih ETS (indeks tabel ia - ib) + CI95 bootstrap BERPASANGAN (blok kab-tahun sama untuk keduanya)."""
    e = lambda ks, i: skor(*jumlah(blok, ks, i))["ets"] or 0
    kunci, r, xs = sorted(blok), random.Random(seed), []
    for _ in range(ulang):
        ks = [r.choice(kunci) for _ in kunci]
        xs.append(e(ks, ia) - e(ks, ib))
    xs.sort()
    return {"selisih": round(e(kunci, ia) - e(kunci, ib), 4), "ci95": [round(xs[int(.025 * (ulang - 1))], 4), round(xs[int(.975 * (ulang - 1))], 4)]}


def arsip_ringkas(blok, ulang=ULANG):
    """-> {'2018': {...}, ..., 'gabungan': {...}}: tiap level skor + CI95 (bootstrap blok kab-tahun), persisten, dan pembanding acak
    (alarm acak berlaju sama: POD = laju alarm, FAR = laju dasar)."""
    def satu(b):
        n_tot = [sum(v[0][i] for v in b.values()) for i in range(4)]
        out = {"kab": len({k[0] for k in b}), "hari_kab": sum(n_tot), "kejadian_hari": n_tot[0] + n_tot[2]}
        for i, L in enumerate(LEVEL):
            n = jumlah(b, sorted(b), i)
            s = skor(*n)
            out[LEVEL[L]] = {**{m: None if v is None else round(v, 3) for m, v in s.items()}, "ci": bootstrap(b, i, ulang),
                             "n": dict(zip("abcd", n)), "acak": {"pod": round((n[0] + n[1]) / sum(n), 3), "far": round((n[0] + n[2]) / sum(n), 4)}}
        s = skor(*jumlah(b, sorted(b), 3))
        out["persisten"] = {m: None if v is None else round(v, 3) for m, v in s.items()}
        s = skor(*jumlah(b, sorted(b), 4))
        out["klimatologi"] = {m: None if v is None else round(v, 3) for m, v in s.items()}
        s = skor(*jumlah(b, sorted(b), 5))
        out["klimatologi_laju_sama"] = {m: None if v is None else round(v, 3) for m, v in s.items()}
        out["selisih_ets_waspada"] = {n: ets_pasang(b, 0, i, ulang) for n, i in
                                      (("vs_persisten", 3), ("vs_klimatologi", 4), ("vs_klimatologi_laju_sama", 5))}
        return out
    out = {}
    for y in sorted({k[1] for k in blok}):
        out[str(y)] = satu({k: v for k, v in blok.items() if k[1] == y})
    out["gabungan"] = satu(blok)
    luar = {k: v for k, v in blok.items() if k[1] in LUAR}
    if luar:
        out["luar_sampel_2022_2025"] = satu(luar)
    return out


def arsip_main():
    sk, kabs, cuaca, baris, cakup = arsip_siapkan()
    tahun = sorted(cakup)
    print(f"arsip: {len(kabs)}/{len(sk)} kab dengan hujan lengkap, {len(cuaca)} sel, tahun tercakup {tahun}", file=sys.stderr)
    lv = arsip_level("banjir", sk, kabs, cuaca, tahun)
    q = laju_alarm_model(lv, cakup)
    hasil = {}
    for nama, kw in (("lb_mulai", {}), ("lb_aktif", {"aktif": True})):
        lab = arsip_label(baris, "banjir", **kw)
        laju, hari = arsip_laju(lab, cakup, kabs)
        blok = arsip_blok(lv, lab, cakup, arsip_klim(laju, lab, cakup, kabs), arsip_klim_sama(laju, hari, kabs, q))
        berlabel = {k[0] for k, v in blok.items() if v[0][0] + v[0][2] > 0}
        r = {"semua_kab_cache": arsip_ringkas(blok), "hanya_kab_berlabel": arsip_ringkas({k: v for k, v in blok.items() if k[0] in berlabel}),
             "kab_berlabel": len(berlabel)}
        lat = {k[0] for k, v in blok.items() if k[1] in LATIH and v[0][0] + v[0][2] > 0}   # kab berlabel menurut 2016-2021 saja
        r["luar_sampel_kab_berlabel_2016_2021"] = {"kab": len(lat), **arsip_ringkas({k: v for k, v in blok.items() if k[0] in lat and k[1] in LUAR}, ulang=300)["luar_sampel_2022_2025"]}
        r["vonis_gabungan"] = vonis({"waspada": r["hanya_kab_berlabel"]["gabungan"]["waspada"]})
        r["vonis_luar_sampel"] = vonis({"waspada": r["hanya_kab_berlabel"]["luar_sampel_2022_2025"]["waspada"]})
        hasil[nama] = r
        for sub in ("semua_kab_cache", "hanya_kab_berlabel"):
            for y, x in r[sub].items():
                w = x["waspada"]
                print(f"{nama:8s} {sub:18s} {y:9s} kab={x['kab']:3d} kejadian-hari={x['kejadian_hari']:5d} waspada POD {w['pod']} FAR {w['far']} ETS {w['ets']} {w['ci'].get('ets')}"
                      f" | persisten ETS {x['persisten']['ets']} POD {x['persisten']['pod']} FAR {x['persisten']['far']} | klim ETS {x['klimatologi']['ets']}/{x['klimatologi_laju_sama']['ets']}(laju sama) dETS vs persisten {x['selisih_ets_waspada']['vs_persisten']} vs klim {x['selisih_ets_waspada']['vs_klimatologi']} POD {x['klimatologi']['pod']} FAR {x['klimatologi']['far']} | acak POD {w['acak']['pod']}")
        print(f"{nama} VONIS luar-sampel 2022-2025 (kab berlabel, waspada): {r['vonis_luar_sampel']}")
    n_kab = len(kabs)
    try:
        n_lama = json.load(open(KELUAR_ARSIP)).get("sampel", {}).get("kab_dinilai") or 0
    except (OSError, ValueError):
        n_lama = 0
    if n_kab < n_lama:   # cache hilang -> sampel menyempit: jangan timpa hasil lebih luas
        print(f"LEWAT: {n_kab} kab < {n_lama} di hasil lama; {os.path.relpath(KELUAR_ARSIP)} dibiarkan", file=sys.stderr)
        return
    simpan(KELUAR_ARSIP, {
        "dibuat": dt.datetime.now(dt.timezone(dt.timedelta(hours=7))).isoformat(timespec="minutes"),
        "tahun_dinilai": tahun, "aturan": BERLAKU["banjir"], "kriteria": {"ets_lulus_batas_bawah_ci": ETS_LULUS},
        "sampel": {"kab_dinilai": n_kab, "kab_geo_total": len(sk), "sel": len(cuaca),
                   "pemilihan": "kab yang semua selnya ada di cache uji_balik (dipilih menurut jumlah hari kejadian DIBI/logbook 2016-2025, TERMASUK tahun uji 2022-2025: seleksi memakai hasil sehingga skor optimistis)"},
        "utama": {"keterangan": "HEADLINE = gabungan luar-sampel 2022-2025 (BERLAKU dipilih di 2016-2021 tetapi diterima lewat uji 2022-2025 pada label DIBI di uji_balik; label logbook belum pernah dipakai menyetel; klimatologi hanya belajar dari 2016-2021). Per tahun 2022-2025 ada di 'per_tahun'. Vonis mengikuti gabungan luar-sampel.",
                  **{n: {"tahun": list(LUAR), "hanya_kab_berlabel": hasil[n]["hanya_kab_berlabel"].get("luar_sampel_2022_2025"),
                         "per_tahun": {str(y): hasil[n]["hanya_kab_berlabel"].get(str(y)) for y in LUAR},
                         "vonis": hasil[n]["vonis_luar_sampel"]}
                     for n in hasil}},
        "label": hasil,
        "label_gabungan_keterangan": "blok 'gabungan' dan tahun 2016-2021 = dalam-sampel (ikut menyetel ambang), BUKAN bukti luar-sampel; luar-sampel = 'luar_sampel_2022_2025'",
        "catatan": "Uji arsip Pusdalops (tgl_kejadian), 31 Okt 2026 diperluas: luar-sampel = 2022, 2023, 2024, 2025 (tak dipakai menyetel ambang/model dengan label logbook; lihat butir 5); 2021 kini punya arsip tetapi dalam-sampel. "
                   "Pembanding tanpa hujan: persisten (alarm bila kemarin berlabel), klimatologi (alarm di bulan yang laju labelnya 2016-2021 di atas rata-rata kab itu) dan acak (laju alarm sama). "
                   "BIAS: (1) tahun parsial (2021: 343, 2022: 272, 2023: 327 hari tercatat; piket bolong) hanya menilai hari tercakup logbook, hari tanpa laporan di luar itu bukan negatif; "
                   "(2) 41 kab sampel dari cache uji_balik dipilih dari jumlah hari kejadian 2016-2025 TERMASUK tahun uji (seleksi memakai hasil 2022-2025): skor OPTIMISTIS, POD dan laju dasar TIDAK nasional, FAR bukan batas atas yang pasti; 'luar_sampel_kab_berlabel_2016_2021' memakai kab berlabel menurut 2016-2021 saja sebagai uji kepekaan, tetapi 41 kab awal tetap terseleksi; "
                   "(3) persisten tak adil untuk label berdurasi (lb_aktif) karena 'kemarin berlabel' hampir sama dengan label hari ini; (4) hujan ERA5 = prakiraan sempurna, prakiraan sungguhan lebih buruk; "
                   "(5) BERLAKU dipilih di 2016-2021 tetapi DITERIMA lewat uji 2022-2025 pada label DIBI (uji_balik), jadi 2022-2025 bukan sepenuhnya murni; label logbook belum dipakai; selisih_ets_waspada = CI berpasangan model vs persisten/klimatologi (klimatologi_laju_sama: laju alarm = laju model di 2016-2021).",
    })
    print(f"{os.path.relpath(KELUAR_ARSIP)} ditulis", file=sys.stderr)


# ------------------------------------------------------------------ swauji
def uji():
    assert rank([3, 1, 1, 2]) == [4.0, 1.5, 1.5, 3.0], rank([3, 1, 1, 2])
    assert abs(spearman([1, 2, 3, 4], [10, 20, 30, 40]) - 1) < 1e-9 and abs(spearman([1, 2, 3, 4], [4, 3, 2, 1]) + 1) < 1e-9
    assert spearman([1, 1, 1], [1, 2, 3]) is None and spearman([1, 2], [1, 2]) is None   # konstan / terlalu sedikit: tidak dikarang
    assert abs(spearman([1, 2, 3, 4, 5], [2, 1, 4, 3, 5]) - 0.8) < 1e-9
    # OLS pulih koefisien dari data eksak dan menolak fitur kolinear sempurna dengan galat kecil
    X = [[a, b] for a in range(5) for b in range(5)]
    y = [1 + 2 * a - 3 * b for a, b in X]
    co = ols(X, y)
    assert all(abs(c - t) < 1e-4 for c, t in zip(co, [1, 2, -3])), co
    # LOKO: sinyal nyata -> skill tinggi; derau murni -> skill <= ~0
    r = random.Random(5)
    g = [i // 4 for i in range(80)]
    Xs = [[r.random(), r.random()] for _ in g]
    ys = [3 * x[0] + 0.05 * r.random() for x in Xs]
    assert loko(Xs, ys, g)["skill"] > 0.9
    assert loko(Xs, [r.random() for _ in g], g)["skill"] < 0.1
    # label: mulai, aktif (dipotong 30 hari), DIBI bukan rob, di luar rentang dibuang, kab_kode kosong dibuang
    ev = [{"jenis": "banjir", "kab_kode": "32.01", "mulai": "2026-02-10", "terlihat": ["2026-02-11", "2026-02-12"], "surut": "2026-02-14"},
          {"jenis": "rob", "kab_kode": "32.01", "mulai": "2026-03-01", "terlihat": ["2026-03-01", "2026-03-01"]},
          {"jenis": "banjir", "kab_kode": None, "mulai": "2026-03-01", "terlihat": ["2026-03-01", "2026-03-01"]},
          {"jenis": "banjir", "kab_kode": "33.01", "mulai": None, "terlihat": ["2026-04-01", "2026-04-02"]},
          {"jenis": "banjir_bandang", "kab_kode": "11.01", "mulai": "2026-01-02", "terlihat": ["2026-01-02", "2026-06-30"]}]
    db = [{"jenis": "Banjir", "kab_kode": "32.01", "tanggal": "2026-02-20", "kejadian": 1},
          {"jenis": "Banjir Rob", "kab_kode": "32.01", "tanggal": "2026-02-21", "kejadian": 1},
          {"jenis": "Banjir", "kab_kode": "32.01", "tanggal": "2026-02-22", "kejadian": 0},
          {"jenis": "Banjir", "kab_kode": "32.01", "tanggal": "2025-11-22", "kejadian": 1}]
    lab, kej = label_dari(ev, db)
    h = hari_ke
    assert lab["lb_mulai"]["32.01"] == {h("2026-02-10")} and "33.01" in lab["lb_mulai"] and len(kej) == 3, (lab["lb_mulai"], len(kej))
    assert lab["lb_aktif"]["32.01"] == {h(f"2026-02-{d}") for d in range(10, 15)}
    assert len(lab["lb_aktif"]["11.01"]) == MAKS_AKTIF + 1                      # dipotong 30 hari
    assert lab["dibi"]["32.01"] == {h("2026-02-20")}                             # rob, n=0, 2025 dibuang
    assert lab["gab_mulai"]["32.01"] == {h("2026-02-10"), h("2026-02-20")}
    # kode_geo: kota vs kabupaten sama nama tidak tertukar; nama tak dikenal ditolak
    kd = kode_geo({"32.01": "Bogor", "32.71": "Kota Bogor"}, [("32", "Bogor"), ("32", "Kota Bogor"), ("32", "Antah")])
    assert kd == {("32", "Bogor"): "32.01", ("32", "Kota Bogor"): "32.71"}, kd
    # tabel kontingensi + POD per kejadian dengan hujan mainan: hari 40 hujan 90 mm (waspada 80*? k=0,8 -> 40 mm), selebihnya 0
    n = (AKHIR - AWAL).days + 1
    c = {"p": [0.0] * n, "im": [0.0] * n, "sm": [0.3] * n}
    c["p"][50] = 90.0
    cuaca = {(0, 0): c}
    skm = {"K": {(0, 0): [0.0, 0.0]}}
    pasang()
    blok, lv = blok_label(cuaca, skm, ["K"], {"K": {50}})
    assert blok[("K", 2026)][0][0] == 1 and blok[("K", 2026)][0][2] == 0, blok       # hari 50 kena
    assert blok[("K", 2026)][0][1] == 2, blok                                          # alarm palsu di 49 dan 51 (jendela -1..+1)
    assert pod_kejadian([{"kab_kode": "K", "_a": 50}, {"kab_kode": "K", "_a": 100}, {"kab_kode": "ZZ", "_a": 50}], lv)["waspada"] == 0.5
    assert vonis(None).startswith("TAK DAPAT")
    # intensitas menolak n kecil
    assert "catatan" in intensitas([{"kab_kode": "K", "_a": 50, "tma_cm": [10, 20]}], cuaca, skm)["target"]["tma_cm"]
    assert intensitas([{"kab_kode": "K", "_a": 3, "tma_cm": [10, 20]}], cuaca, skm)["n_kejadian_berhujan"] == 0   # a7 belum lengkap
    # pilih_sampel: anggaran sel dihormati, kontrol tak berlabel
    skp = {"A": {(0, 0): 0, (0, 1): 0}, "B": {(1, 0): 0, (1, 1): 0}, "C": {(2, 0): 0}, "D": {(3, 0): 0}}
    lb_, ko_ = pilih_sampel({"gab_aktif": {"A": {1, 2, 3}, "B": {1}}}, [], skp, anggaran=3, n_kontrol=1)
    assert lb_ == ["A"] and ko_[0] in ("C", "D"), (lb_, ko_)
    print("ok uji_logbook")


if __name__ == "__main__":
    a = sys.argv[1:]
    if a == ["--arsip"]:
        arsip_main()
    else:
        uji() if a == ["uji"] else main(ambil_saja=a == ["ambil"])
