"""Uji balik aturan longsor yang BERLAKU (scripts/banjir/status.py:level_longsor) terhadap label logbook BNPB Pusdalops 2026
-> public/data/validasi_logbook_longsor.json

Catatan jujur: modul "longsor" belum punya aturan sendiri; aturan nowcast longsor yang hidup di repo adalah level_longsor
(bahaya InaRISK x hujan 3 hari x kejenuhan tanah), milik modul banjir. Skrip ini hanya MEMBACA dan memanggilnya. Tidak ada
rumus LHASA (P95) di repo, jadi "hujan di atas P95" hanya muncul sebagai varian skor AUC, bukan aturan berlaku.

Label : public/data/logbook_kejadian.json (jenis longsor + banjir_longsor), hari positif = mulai -1..+1 hari.
        Pembanding: public/data/dibi_kejadian.json 2026 (jenis Tanah Longsor), per kabupaten, hari kejadian persis.
Hujan : ERA5 Open-Meteo archive per sel 0,25 derajat (sumber yang sama dengan banjir/uji_balik.py), 2025-12-22..AKHIR,
        cache gzip data/raw/longsor/. Cuma SUBSET kabupaten: semua kabupaten berlabel + kontrol acak (lihat CAP_SEL).
Satuan: kecamatan-hari (hanya label yang nama kecamatannya cocok) dan kabupaten-hari (level kab = maks level kecamatan).
Skor  : POD/FAR/CSI/ETS per level (>= Waspada/Siaga/Awas), AUC skor kontinu, CI 95% bootstrap blok per kabupaten.
Dampak: meninggal/rumah menurut kelas bahaya longsor kecamatan (Spearman + median, CI bootstrap per kabupaten).

Pakai:  python3 scripts/banjir/uji_logbook_longsor.py ambil   unduh hujan 2026 (lanjut bila putus/kuota)
        python3 scripts/banjir/uji_logbook_longsor.py         hitung -> JSON
        python3 scripts/banjir/uji_logbook_longsor.py uji     swauji luring data mainan
"""
import datetime as dt, difflib, gzip, json, math, os, random, re, sys, time
from collections import Counter, defaultdict

AKAR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
sys.path.insert(0, os.path.join(AKAR, "scripts/banjir"))
from status import A7_BASAH, GESER, K_LONGSOR, SM_JENUH, level_longsor  # noqa: E402

API = "https://archive-api.open-meteo.com/v1/archive"
CACHE = os.path.join(AKAR, "data/raw/longsor/era5_2026")
KELUAR = os.path.join(AKAR, "public/data/validasi_logbook_longsor.json")
AWAL, AKHIR = dt.date(2025, 12, 25), dt.date(2026, 10, 22)   # sama dengan banjir/uji_logbook.py: cache ERA5-nya dipakai bersama
CACHE_BANJIR = os.path.join(AKAR, "data/raw/banjir/uji_logbook")
UJI_DARI, UJI_SAMPAI = dt.date(2026, 1, 1), dt.date(2026, 10, 21)   # H3 geser -1 butuh hari e+1
CAP_SEL, PER_PANGGIL, JEDA, ULANG = 220, 5, 8, 500
BERLAKU = {"k": K_LONGSOR, "geser": GESER, "sm_jenuh": SM_JENUH, "a7_basah": A7_BASAH}
VARIAN = {  # nama -> parameter level_longsor; hanya dilaporkan, tidak mengubah aturan hidup
    "berlaku": BERLAKU,
    "k0.4": {**BERLAKU, "k": 0.4}, "k0.8": {**BERLAKU, "k": 0.8}, "k1.0": {**BERLAKU, "k": 1.0},
    "tanpa_jenuh": {**BERLAKU, "a7_basah": 0, "sm_jenuh": 0.0},
}
LEVEL = (1, 2, 3)


PROV = {"11": "Aceh", "12": "Sumut", "13": "Sumbar", "35": "Jatim", "64": "Kaltim", "71": "Sulut", "73": "Sulsel", "75": "Gorontalo", "82": "Malut", "92": "Papua Barat"}


# ------------------------------------------------------------------ nama & label
def norm(s):
    s = re.sub(r"^(kab\.?|kabupaten|kota|kec\.?|kecamatan)\s+", "", (s or "").lower().strip())
    return re.sub(r"[^a-z0-9]", "", re.sub(r"\(.*?\)", "", s))


def tgl(s):
    return dt.date.fromisoformat(s)   # ValueError bila format salah: label rusak tidak boleh lolos diam-diam


def label_logbook(kejadian):
    """-> [{kab, kec:[nama], mulai(date), meninggal, rumah}] untuk longsor + banjir_longsor; kab_kode wajib 'pp.kk'."""
    out = []
    for e in kejadian:
        if e["jenis"] not in ("longsor", "banjir_longsor"):
            continue
        if not re.fullmatch(r"\d\d\.\d\d", e.get("kab_kode") or ""):
            raise ValueError(f"kab_kode bukan pp.kk: {e.get('kab_kode')!r} ({e.get('kab')})")
        mulai = e.get("mulai") or (e.get("terlihat") or [None])[0]
        if not mulai:
            continue
        out.append({"kab": e["kab_kode"], "kec": e.get("kec") or [], "mulai": tgl(mulai),
                    "meninggal": e.get("meninggal") or 0, "rumah": e.get("rumah") or 0})
    return out


def label_dibi(kejadian):
    """-> {kab: {date}} jenis Tanah Longsor, kejadian >= 1."""
    out = defaultdict(set)
    for r in kejadian:
        if r["jenis"] == "Tanah Longsor" and r.get("kejadian", 0) >= 1:
            out[r["kab_kode"]].add(tgl(r["tanggal"]))
    return out


def cocok_kec(nama, unit):
    """Nama kecamatan logbook -> kunci unit dalam {norm: kunci} satu kabupaten; cocok persis, lalu mirip >= 0,85."""
    n = norm(nama)
    if n in unit:
        return unit[n]
    m = difflib.get_close_matches(n, list(unit), n=1, cutoff=0.85)
    return unit[m[0]] if m else None


# ------------------------------------------------------------------ skor
def skor(a, b, c, d):
    n = a + b + c + d
    bagi = lambda x, y: x / y if y else None
    ar = (a + b) * (a + c) / n if n else 0
    return {"pod": bagi(a, a + c), "far": bagi(b, a + b), "csi": bagi(a, a + b + c), "ets": bagi(a - ar, a + b + c - ar)}


def auc_bin(pos, neg):
    """AUC dari histogram {bin: n}; seri = 0,5. None bila salah satu kelas kosong."""
    P, N = sum(pos.values()), sum(neg.values())
    if not P or not N:
        return None
    kalah, tot = 0, 0.0
    for b in sorted(set(pos) | set(neg)):
        tot += pos.get(b, 0) * (kalah + 0.5 * neg.get(b, 0))
        kalah += neg.get(b, 0)
    return tot / (P * N)


def spearman(x, y):
    def rank(v):
        o = sorted(range(len(v)), key=lambda i: v[i]); r = [0.0] * len(v); i = 0
        while i < len(o):
            j = i
            while j + 1 < len(o) and v[o[j + 1]] == v[o[i]]:
                j += 1
            for t in range(i, j + 1):
                r[o[t]] = (i + j) / 2
            i = j + 1
        return r
    if len(x) < 3:
        return None
    rx, ry = rank(x), rank(y); mx, my = sum(rx) / len(rx), sum(ry) / len(ry)
    sx = math.sqrt(sum((a - mx) ** 2 for a in rx)); sy = math.sqrt(sum((b - my) ** 2 for b in ry))
    return sum((a - mx) * (b - my) for a, b in zip(rx, ry)) / (sx * sy) if sx and sy else None


def ci(xs):
    xs = sorted(x for x in xs if x is not None)
    return [round(xs[int(.025 * (len(xs) - 1))], 3), round(xs[int(.975 * (len(xs) - 1))], 3)] if len(xs) > 20 else None


def jumlah(blok, kunci, i):
    t = [0, 0, 0, 0]
    for k in kunci:
        t = [x + y for x, y in zip(t, blok[k][i])]
    return t


def ringkas(blok, ulang=ULANG, seed=1):
    """blok {kab: [[a,b,c,d] per level]} -> {level: skor + ci + n}. Bootstrap blok per kabupaten."""
    kunci, r, out = sorted(blok), random.Random(seed), {}
    for i, L in enumerate(LEVEL):
        n = jumlah(blok, kunci, i)
        s = {m: None if v is None else round(v, 4) for m, v in skor(*n).items()}
        smp = defaultdict(list)
        for _ in range(ulang):
            for m, v in skor(*jumlah(blok, [r.choice(kunci) for _ in kunci], i)).items():
                smp[m].append(v)
        out[f">={L}"] = {**s, "ci": {m: ci(v) for m, v in smp.items()}, "n": dict(zip("abcd", n))}
    return out


def selisih_ets(b1, b0, ulang=ULANG, seed=2):
    """Selisih ETS rata-rata tiga level (b1 - b0), CI bootstrap berpasangan per kabupaten."""
    kunci, r = sorted(b0), random.Random(seed)
    rata = lambda b, ks: sum((skor(*jumlah(b, ks, i))["ets"] or 0) for i in range(3)) / 3
    xs = []
    for _ in range(ulang):
        ks = [r.choice(kunci) for _ in kunci]
        xs.append(rata(b1, ks) - rata(b0, ks))
    return round(rata(b1, kunci) - rata(b0, kunci), 4), ci(xs)


def auc_ci(hist, ulang=200, seed=3):
    """hist {kab: (Counter pos, Counter neg)} -> (auc, ci)."""
    def gabung(ks):
        p, n = Counter(), Counter()
        for k in ks:
            p.update(hist[k][0]); n.update(hist[k][1])
        return auc_bin(p, n)
    kunci, r = sorted(hist), random.Random(seed)
    return gabung(kunci), ci([gabung([r.choice(kunci) for _ in kunci]) for _ in range(ulang)])


# ------------------------------------------------------------------ hujan
def jalur(la, lo):
    """Cache sendiri; bila sel itu sudah diunduh modul banjir (format sama) pakai itu."""
    nama = f"{la:.3f}_{lo:.3f}.json.gz"
    lain = os.path.join(CACHE_BANJIR, nama)
    return lain if os.path.exists(lain) else os.path.join(CACHE, nama)


def deret(d):
    """Respons Open-Meteo satu lokasi -> {"p","im","sm"} per hari AWAL..AKHIR. Menolak deret yang tidak utuh."""
    off, h, j = d["utc_offset_seconds"], d["daily"], d["hourly"]
    hari = [(t + off) // 86400 for t in h["time"]]
    n = (AKHIR - AWAL).days + 1
    if len(hari) != n or hari[0] != (AWAL - dt.date(1970, 1, 1)).days or any(b - a != 1 for a, b in zip(hari, hari[1:])):
        raise ValueError(f"deret harian tidak utuh: {len(hari)} hari, harus {n} mulai {AWAL}")
    im = [None] * n
    for t, x in zip(j["time"], j["precipitation"]):
        i = (t + off) // 86400 - hari[0]
        if x is not None and 0 <= i < n:
            im[i] = x if im[i] is None else max(im[i], x)
    return {"p": [x or 0 for x in h["precipitation_sum"]], "im": im, "sm": h["soil_moisture_7_to_28cm_mean"]}


def ambil_cuaca(sel):
    sys.path.insert(0, os.path.join(AKAR, "scripts/banjir"))
    from umum import KuotaHabis, ambil, per_lokasi
    sisa = [s for s in sorted(sel, reverse=True) if not os.path.exists(jalur(*s))]   # urutan terbalik: tak bentrok dengan unduhan banjir
    print(f"{len(sel)} sel, {len(sisa)} belum di cache (~{len(sisa) * 7} panggilan berbobot)", file=sys.stderr)
    os.makedirs(CACHE, exist_ok=True)
    for a in range(0, len(sisa), PER_PANGGIL):
        b = [s for s in sisa[a:a + PER_PANGGIL] if not os.path.exists(jalur(*s))]
        if not b:
            continue
        url = (f"{API}?latitude={','.join(str(s[0]) for s in b)}&longitude={','.join(str(s[1]) for s in b)}"
               f"&start_date={AWAL}&end_date={AKHIR}&daily=precipitation_sum,soil_moisture_7_to_28cm_mean&hourly=precipitation"
               "&models=era5&timezone=Asia%2FJakarta&timeformat=unixtime")
        try:
            data = ambil(url, batas_waktu=600)
        except KuotaHabis as e:
            print(f"berhenti, kuota habis ({str(e)[:100]}); jalankan lagi nanti, cache dipakai ulang", file=sys.stderr)
            return False
        for s, d in zip(b, per_lokasi(data)):
            deret(d)   # validasi sebelum disimpan
            tujuan = os.path.join(CACHE, f"{s[0]:.3f}_{s[1]:.3f}.json.gz")
            with gzip.open(tujuan + ".tmp", "wt") as f:
                json.dump(d, f, separators=(",", ":"))
            os.replace(tujuan + ".tmp", tujuan)
        print(f"  {min(a + PER_PANGGIL, len(sisa))}/{len(sisa)}", file=sys.stderr)
        time.sleep(JEDA)
    return True


# ------------------------------------------------------------------ rakit
def muat_unit():
    """-> units {kunci: {kab, kec_norm, bahaya, sel(lat,lon)}}, kab_nama {kab_kode: nama}."""
    from bahaya import kecamatan
    desa = json.load(open(os.path.join(AKAR, "public/data/desa_cari.json")))
    kab_nama = desa["kab"]
    per_prov = defaultdict(dict)
    for c, n in kab_nama.items():
        per_prov[c[:2]][norm(n)] = c
    hujan = json.load(open(os.path.join(AKAR, "public/banjir/data/hujan.json")))
    bh = json.load(open(os.path.join(AKAR, "public/banjir/data/bahaya.json")))["kec"]
    sel = hujan["sel"]
    petak = {(math.floor(g["lat"] / sel), math.floor(g["lon"] / sel)): g for g in hujan["grid"]}

    def terdekat(la, lo):
        gy, gx = math.floor(la / sel), math.floor(lo / sel)
        if (gy, gx) in petak:
            return petak[(gy, gx)]
        dekat = [petak[k] for k in ((gy + a, gx + b) for a in (-1, 0, 1) for b in (-1, 0, 1)) if k in petak]
        return min(dekat or hujan["grid"], key=lambda g: (g["lat"] - la) ** 2 + (g["lon"] - lo) ** 2)

    units, tanpa_kab = {}, set()
    for k, c in kecamatan().items():
        p, kb, kc = k.split("|")
        kode = per_prov[p].get(norm(kb)) or next(
            (per_prov[p][m] for m in difflib.get_close_matches(norm(kb), list(per_prov[p]), 1, 0.85)), None)
        if not kode:
            tanpa_kab.add((p, kb, kc)); continue   # kab di poligon geo kosong ("None") atau namanya tak ada di desa_cari
        g = terdekat(c["lat"], c["lon"])
        units[k] = {"kab": kode, "kec": norm(kc), "bahaya": bh.get(k, {}).get("longsor", 0), "sel": (g["lat"], g["lon"])}
    return units, kab_nama, sorted(tanpa_kab)


def pilih_sel(units, positif, seed=7):
    """Semua kabupaten berlabel (menurut sel terkecil dulu bila melebihi CAP), lalu kontrol acak sampai CAP_SEL."""
    sel_kab = defaultdict(set)
    for u in units.values():
        sel_kab[u["kab"]].add(u["sel"])
    pilih, sel = [], set()
    for kab in sorted(positif & set(sel_kab), key=lambda k: (len(sel_kab[k]), k)):
        if len(sel | sel_kab[kab]) <= CAP_SEL:
            pilih.append(kab); sel |= sel_kab[kab]
    r = random.Random(seed)
    kontrol = sorted(set(sel_kab) - positif)
    r.shuffle(kontrol)
    nkontrol = 0
    for kab in kontrol:
        if len(sel | sel_kab[kab]) <= CAP_SEL and len(sel_kab[kab]) <= 8:
            pilih.append(kab); sel |= sel_kab[kab]; nkontrol += 1
    return sorted(pilih), sel, nkontrol


def hari_ke(d):
    return (d - AWAL).days


def kelas(b):
    return "tinggi" if b >= 0.66 else "sedang" if b >= 0.33 else "rendah"


def hitung():
    log = json.load(open(os.path.join(AKAR, "public/data/logbook_kejadian.json")))
    dibi = json.load(open(os.path.join(AKAR, "public/data/dibi_kejadian.json")))
    lab = [e for e in label_logbook(log["kejadian"]) if UJI_DARI <= e["mulai"] <= UJI_SAMPAI + dt.timedelta(1)]
    ldibi = {k: {d for d in v if UJI_DARI <= d <= UJI_SAMPAI} for k, v in label_dibi(dibi["kejadian"]).items()}
    units, kab_nama, tanpa_kab = muat_unit()
    per_kab = defaultdict(dict)
    for k, u in units.items():
        per_kab[u["kab"]].setdefault(u["kec"], k)

    # pencocokan kecamatan
    cocok, gagal, tanpa_kec = [], 0, 0
    for e in lab:
        ks = []
        for n in e["kec"]:
            k = cocok_kec(n, per_kab.get(e["kab"], {}))
            ks.append(k) if k else None
        e["unit"] = sorted(set(ks))
        if not e["kec"]:
            tanpa_kec += 1
        elif len(e["unit"]) < len(set(map(norm, e["kec"]))):
            gagal += 1
        cocok.append(e)
    n_kec_tercocok = sum(1 for e in cocok if e["unit"])

    positif = {e["kab"] for e in cocok} | {k for k, v in ldibi.items() if v}
    kabs, sel, _ = pilih_sel(units, positif)
    pilih_rencana = list(kabs)
    cuaca = {}
    for s in sel:
        if os.path.exists(jalur(*s)):
            cuaca[s] = deret(json.load(gzip.open(jalur(*s), "rt")))
    kabs = [k for k in kabs if all(u["sel"] in cuaca for u in units.values() if u["kab"] == k)]
    pos_dalam = [k for k in kabs if k in positif]; nkontrol = len(kabs) - len(pos_dalam)
    print(f"{len(kabs)} kab dengan hujan lengkap ({len(pos_dalam)} berlabel, {nkontrol} kontrol), {len(cuaca)}/{len(sel)} sel", file=sys.stderr)
    if not kabs:
        sys.exit("hujan 2026 belum diunduh: jalankan `uji_logbook.py ambil`")

    hari = list(range(hari_ke(UJI_DARI), hari_ke(UJI_SAMPAI) + 1))
    # label: kab-hari dan kec-hari (mulai +-1)
    lab_kab = defaultdict(set); lab_kec = defaultdict(set); kab_ada_kec_kosong = defaultdict(set)
    for e in cocok:
        if e["kab"] not in kabs:
            continue
        win = {hari_ke(e["mulai"]) + d for d in (-1, 0, 1)}
        lab_kab[e["kab"]] |= win
        for u in e["unit"]:
            lab_kec[u] |= win
        if not e["unit"]:
            kab_ada_kec_kosong[e["kab"]] |= win   # kab-hari berlabel tanpa kecamatan: bukan negatif sah untuk kec-hari
    lab_dibi = {k: {hari_ke(d) for d in v} for k, v in ldibi.items()}

    # level per kecamatan per hari per varian
    blok = {v: {"kec": defaultdict(lambda: [[0] * 4 for _ in LEVEL]), "kab": defaultdict(lambda: [[0] * 4 for _ in LEVEL]),
                "dibi": defaultdict(lambda: [[0] * 4 for _ in LEVEL])} for v in VARIAN}
    hist = {"kec": defaultdict(lambda: (Counter(), Counter())), "kab": defaultdict(lambda: (Counter(), Counter()))}
    hist_h3 = {"kec": defaultdict(lambda: (Counter(), Counter())), "kab": defaultdict(lambda: (Counter(), Counter()))}
    hist_b = {"kec": defaultdict(lambda: (Counter(), Counter())), "kab": defaultdict(lambda: (Counter(), Counter()))}
    lvl_kab = {v: {} for v in VARIAN}
    sel_h3 = {s: ([sum(c["p"][e - 1:e + 2]) for e in range(len(c["p"]) - 2)]) for s, c in cuaca.items()}
    for kab in kabs:
        kunit = [(k, u) for k, u in units.items() if u["kab"] == kab]
        maks = {v: [0] * len(hari) for v in VARIAN}
        sk = [0.0] * len(hari); sh = [0.0] * len(hari)
        for k, u in kunit:
            c = cuaca[u["sel"]]; b = u["bahaya"]
            h3s = [sel_h3[u["sel"]][e - 1 + 0] for e in hari]   # geser -1: hujan e-1..e+1
            for v, par in VARIAN.items():
                lv = []
                for i, e in enumerate(hari):
                    w = slice(e + par["geser"], e + par["geser"] + 3)
                    h3 = sum(c["p"][w]); ims = [x for x in c["im"][w] if x is not None]
                    lv.append(level_longsor(h3, sum(c["p"][e - 7:e]), b, c["sm"][e], max(ims) if ims else None,
                                            k=par["k"], sm_jenuh=par["sm_jenuh"], a7_basah=par["a7_basah"]))
                    maks[v][i] = max(maks[v][i], lv[-1])
                kv = lv
                if True:
                    for i, e in enumerate(hari):
                        if e in kab_ada_kec_kosong.get(kab, ()) and e not in lab_kec.get(k, ()):
                            continue
                        o = e in lab_kec.get(k, ())
                        for j, L in enumerate(LEVEL):
                            blok[v]["kec"][kab][j][(0 if o else 1) if kv[i] >= L else (2 if o else 3)] += 1
                    if v == "berlaku":
                        for i, e in enumerate(hari):
                            if e in kab_ada_kec_kosong.get(kab, ()) and e not in lab_kec.get(k, ()):
                                continue
                            o = e in lab_kec.get(k, ())
                            hist["kec"][kab][0 if o else 1][round(h3s[i] * b)] += 1
                            hist_h3["kec"][kab][0 if o else 1][round(h3s[i])] += 1
                            hist_b["kec"][kab][0 if o else 1][round(b * 20)] += 1
            # skor kontinu kab: maks (h3*b) lintas kec, dihitung di bawah
            for i, e in enumerate(hari):
                sk[i] = max(sk[i], h3s[i] * b); sh[i] = max(sh[i], h3s[i])
        bmax = max(u["bahaya"] for _, u in kunit)
        for i, e in enumerate(hari):
            o = e in lab_kab.get(kab, ())
            hist["kab"][kab][0 if o else 1][round(sk[i])] += 1
            hist_h3["kab"][kab][0 if o else 1][round(sh[i])] += 1
            hist_b["kab"][kab][0 if o else 1][round(bmax * 20)] += 1
        for v in VARIAN:
            lvl_kab[v][kab] = maks[v]
            od = lab_dibi.get(kab, set())
            for i, e in enumerate(hari):
                for j, L in enumerate(LEVEL):
                    for sat, o in (("kab", e in lab_kab.get(kab, ())), ("dibi", e in od)):
                        blok[v][sat][kab][j][(0 if o else 1) if maks[v][i] >= L else (2 if o else 3)] += 1

    # ----- keluaran
    ket = {"kec": "kecamatan-hari, label logbook (kecamatan tercocok saja)", "kab": "kabupaten-hari, label logbook (semua longsor+banjir_longsor)",
           "dibi": "kabupaten-hari, label DIBI Tanah Longsor persis hari"}
    hasil = {}
    for sat in ("kec", "kab", "dibi"):
        hasil[sat] = {"satuan": ket[sat], "n_kab": len(blok["berlaku"][sat]),
                      "varian": {v: ringkas(blok[v][sat]) for v in VARIAN},
                      "selisih_ets_vs_berlaku": {v: dict(zip(("selisih", "ci95"), selisih_ets(blok[v][sat], blok["berlaku"][sat])))
                                                 for v in VARIAN if v != "berlaku"}}
    auc = {}
    for sat in ("kec", "kab"):
        auc[sat] = {}
        for nama, hh in (("h3_x_bahaya", hist[sat]), ("h3_saja", hist_h3[sat]), ("bahaya_saja", hist_b[sat])):
            a, c = auc_ci(dict(hh))
            auc[sat][nama] = {"auc": None if a is None else round(a, 3), "ci95": c}
    # dampak
    dampak = hitung_dampak(cocok, units, per_kab)   # tak butuh hujan: semua kejadian berlabel
    n_pos_kab = {k: len(v) for k, v in lab_kab.items()}
    # pembanding label: tumpang tindih logbook vs DIBI (kabupaten-hari kejadian persis)
    lg_hari = {k: {hari_ke(e["mulai"]) for e in cocok if e["kab"] == k} for k in kabs}
    tdb = sum(len(lab_dibi.get(k, ())) for k in kabs); tlg = sum(len(v) for v in lg_hari.values())
    irisan = sum(len(lg_hari[k] & lab_dibi.get(k, set())) for k in kabs)
    return {
        "dibuat": dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%MZ"),
        "aturan": "scripts/banjir/status.py:level_longsor, parameter " + json.dumps(BERLAKU) + " (modul longsor belum punya aturan sendiri; tidak diubah)",
        "periode_uji": [str(UJI_DARI), str(UJI_SAMPAI)],
        "label": {"logbook_longsor_banjir_longsor": len(cocok), "dengan_nama_kec": len(cocok) - tanpa_kec,
                  "tercocok_ke_unit_kec": n_kec_tercocok, "nama_kec_gagal_cocok": gagal,
                  "catatan": "positif = mulai -1..+1 hari; logbook hanya kejadian yang dilapor BPBD, hari tanpa laporan dihitung negatif"},
        "sampel": {"kab_dipakai": len(kabs), "kab_berlabel": len(pos_dalam), "kab_kontrol_acak": nkontrol, "kab_rencana": len(pilih_rencana),
                   "sel_hujan": len(cuaca), "kab_berlabel_tak_masuk_sampel": len(positif - set(kabs)),
                   "unit_geo_tanpa_kode_kab": [f"{PROV.get(x[0], x[0])}: {x[1]} / {x[2]}" for x in tanpa_kab],
                   "catatan": "subset: semua kab berlabel dulu, kontrol acak (seed 7) sampai batas sel; FAR/laju dasar bergantung komposisi kontrol"},
        "label_tumpang_tindih": {"hari_logbook_kab": tlg, "hari_dibi_kab": tdb, "irisan_persis": irisan},
        "hasil": hasil, "auc": auc, "dampak": dampak,
        "vonis": None,
    }


def hitung_dampak(lab, units, per_kab, ulang=500):
    """Dampak (meninggal, rumah) menurut kelas bahaya longsor tertinggi dari kecamatan tercocok (atau kab bila tak ada)."""
    baris = []
    for e in lab:
        bs = [units[u]["bahaya"] for u in e["unit"]] or [max((u["bahaya"] for u in units.values() if u["kab"] == e["kab"]), default=None)]
        if bs[0] is None:
            continue   # kabupaten tanpa poligon kecamatan bertautan
        baris.append((e["kab"], max(bs), e["meninggal"], e["rumah"]))
    return dampak_dari(baris, ulang)


def dampak_dari(baris, ulang=500, seed=5):
    med = lambda v: sorted(v)[len(v) // 2] if v else None
    out = {"n_kejadian": len(baris), "per_kelas": {}}
    for kl in ("rendah", "sedang", "tinggi"):
        s = [b for b in baris if kelas(b[1]) == kl]
        out["per_kelas"][kl] = {"n": len(s), "median_meninggal": med([b[2] for b in s]), "median_rumah": med([b[3] for b in s]),
                                "porsi_ada_korban_jiwa": round(sum(b[2] > 0 for b in s) / len(s), 3) if s else None}
    for nama, idx in (("meninggal", 2), ("rumah", 3)):
        rho = spearman([b[1] for b in baris], [b[idx] for b in baris])
        by = defaultdict(list)
        for b in baris:
            by[b[0]].append(b)
        r, ks, xs = random.Random(seed), sorted(by), []
        for _ in range(ulang):
            s = [b for k in [r.choice(ks) for _ in ks] for b in by[k]]
            xs.append(spearman([b[1] for b in s], [b[idx] for b in s]))
        out[f"spearman_bahaya_{nama}"] = {"rho": None if rho is None else round(rho, 3), "ci95": ci(xs)}
    return out


# ------------------------------------------------------------------ swauji
def uji():
    # skor
    s = skor(8, 2, 2, 88)
    assert abs(s["pod"] - .8) < 1e-9 and abs(s["far"] - .2) < 1e-9 and abs(s["csi"] - 8 / 12) < 1e-9
    assert skor(0, 0, 0, 10)["pod"] is None and skor(0, 5, 0, 5)["ets"] <= 0
    ar = 10 * 10 / 100; assert abs(skor(5, 5, 5, 85)["ets"] - (5 - ar) / (15 - ar)) < 1e-9
    # AUC: pemisah sempurna 1, terbalik 0, seri 0,5, kelas kosong None
    assert auc_bin(Counter({5: 3}), Counter({1: 4})) == 1 and auc_bin(Counter({1: 3}), Counter({5: 4})) == 0
    assert auc_bin(Counter({2: 3}), Counter({2: 4})) == 0.5 and auc_bin(Counter(), Counter({1: 1})) is None
    # spearman
    assert abs(spearman([1, 2, 3, 4], [10, 20, 30, 40]) - 1) < 1e-9 and abs(spearman([1, 2, 3, 4], [4, 3, 2, 1]) + 1) < 1e-9
    assert spearman([1, 1, 1], [1, 2, 3]) is None
    # bootstrap blok: kab yang sempurna -> POD 1, FAR 0 di CI
    blok = {f"k{i}": [[2, 0, 0, 8]] * 3 for i in range(30)}
    r = ringkas(blok, ulang=50)
    assert r[">=1"]["pod"] == 1 and r[">=1"]["far"] == 0 and r[">=1"]["ci"]["pod"] == [1, 1], r
    d, c = selisih_ets(blok, blok, ulang=50); assert d == 0 and c == [0, 0]
    # nama kecamatan
    assert norm("Kec. Cisarua (Lembang)") == "cisarua" and norm("Kab. Bandung Barat") == "bandungbarat"
    unit = {"cisarua": "A", "ciwidey": "B"}
    assert cocok_kec("Kecamatan Cisarua", unit) == "A" and cocok_kec("Cisaruaa", unit) == "A" and cocok_kec("Lembang", unit) is None
    # label: tolak kab_kode rusak dan tanggal rusak, abaikan jenis lain
    ok = label_logbook([{"jenis": "longsor", "kab_kode": "32.17", "mulai": "2026-03-01", "kec": ["X"]},
                        {"jenis": "banjir", "kab_kode": "bukan", "mulai": "2026-03-01"}])
    assert len(ok) == 1 and ok[0]["mulai"] == dt.date(2026, 3, 1)
    for salah in ({"jenis": "longsor", "kab_kode": "3217", "mulai": "2026-03-01"},
                  {"jenis": "longsor", "kab_kode": "32.17", "mulai": "1 Maret 2026"}):
        try:
            label_logbook([salah]); raise SystemExit(f"label rusak lolos: {salah}")
        except ValueError:
            pass
    assert dict(label_dibi([{"jenis": "Tanah Longsor", "tanggal": "2026-02-02", "kab_kode": "32.17", "kejadian": 2},
                            {"jenis": "Banjir", "tanggal": "2026-02-02", "kab_kode": "32.17", "kejadian": 1}])) == {"32.17": {dt.date(2026, 2, 2)}}
    # deret menolak deret bolong
    try:
        deret({"utc_offset_seconds": 0, "daily": {"time": [0, 86400]}, "hourly": {"time": []}}); raise SystemExit("deret bolong lolos")
    except ValueError:
        pass
    # dampak: bahaya tinggi = korban besar -> rho positif; kelas terhitung benar
    bar = [("a", .1, 0, 1), ("b", .5, 1, 5), ("c", .9, 3, 20), ("d", .95, 5, 40), ("e", .2, 0, 2), ("f", .7, 2, 10)]
    dm = dampak_dari(bar, ulang=30)
    assert dm["spearman_bahaya_meninggal"]["rho"] > .8 and dm["per_kelas"]["tinggi"]["n"] == 3 and dm["per_kelas"]["rendah"]["n"] == 2
    # aturan hidup masih terpasang: Awas butuh H3 >= 90 + jenuh + bahaya tinggi
    assert level_longsor(90, 150, .7, 0.5) == 3 and level_longsor(10, 0, .1) == 0
    import tempfile
    h = {"dibuat": "2026-10-29T00:00Z", "label": {"logbook_longsor_banjir_longsor": 3}, "sampel": {"kab_dipakai": 1},
         "auc": {"kab": {"h3_x_bahaya": {"auc": .9}}, "kec": {"h3_x_bahaya": {"auc": .8}}},
         "hasil": {x: {"varian": {"berlaku": {">=1": {"pod": 1, "far": 0, "csi": 1, "ets": 1}}}} for x in ("kec", "kab", "dibi")}}
    with tempfile.TemporaryDirectory() as td:
        f = os.path.join(td, "v.json")
        json.dump({"riwayat": [{"tanggal": f"2025-{i // 28 + 1:02d}-{i % 28 + 1:02d}"} for i in range(450)] + [{"tanggal": "2026-10-29", "x": 1}]}, open(f, "w"))
        r = riwayat_baru(f, h)
        assert len(r) == 400 and r[-1]["n_kab"] == 1 and sum(x["tanggal"] == "2026-10-29" for x in r) == 1
    print("uji_logbook: swauji lolos")


def riwayat_baru(jalur_json, h, maks=400):
    """Riwayat = satu cuplikan per tanggal jalan (jalan ulang di hari sama menimpa), yang lama dipertahankan, maks `maks`."""
    lama = []
    if os.path.exists(jalur_json):
        try:
            lama = json.load(open(jalur_json)).get("riwayat") or []
        except ValueError:
            lama = []
    snap = {"tanggal": h["dibuat"][:10], "n_label": h["label"]["logbook_longsor_banjir_longsor"], "n_kab": h["sampel"]["kab_dipakai"],
            "auc_kab": h["auc"]["kab"]["h3_x_bahaya"]["auc"], "auc_kec": h["auc"]["kec"]["h3_x_bahaya"]["auc"]}
    for sat in ("kec", "kab", "dibi"):
        m = h["hasil"][sat]["varian"]["berlaku"][">=1"]
        snap[sat] = {k: m[k] for k in ("pod", "far", "csi", "ets")}
    return ([r for r in lama if r.get("tanggal") != snap["tanggal"]] + [snap])[-maks:]


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else "hitung"
    if mode == "uji":
        return uji()
    if mode == "ambil":
        log = json.load(open(os.path.join(AKAR, "public/data/logbook_kejadian.json")))
        dibi = json.load(open(os.path.join(AKAR, "public/data/dibi_kejadian.json")))
        positif = {e["kab"] for e in label_logbook(log["kejadian"])} | set(label_dibi(dibi["kejadian"]))
        units, _, _ = muat_unit()
        kabs, sel, nk = pilih_sel(units, positif)
        print(f"{len(kabs)} kab ({nk} kontrol), {len(sel)} sel", file=sys.stderr)
        sys.exit(0 if ambil_cuaca(sel) else 1)
    h = hitung()
    try:
        n_lama = (json.load(open(KELUAR)).get("sampel") or {}).get("kab_dipakai") or 0
    except (OSError, ValueError):
        n_lama = 0
    # cache hujan hilang/kuota habis -> sampel menyempit: jangan timpa hasil yang lebih luas
    if h["sampel"]["kab_dipakai"] < n_lama:
        print(f"LEWAT: {h['sampel']['kab_dipakai']} kab < {n_lama} di hasil lama; {os.path.relpath(KELUAR)} dibiarkan", file=sys.stderr)
        sys.exit(0)
    os.makedirs(os.path.dirname(KELUAR), exist_ok=True)
    h["riwayat"] = riwayat_baru(KELUAR, h)
    keys = ["dibuat"] + [k for k in h if k != "dibuat"]
    json.dump({k: h[k] for k in keys}, open(KELUAR, "w"), ensure_ascii=False, indent=1)
    for sat, r in h["hasil"].items():
        for v in ("berlaku",):
            for L, m in r["varian"][v].items():
                print(sat, v, L, {k: m[k] for k in ("pod", "far", "csi", "ets")}, m["n"])
    print(json.dumps(h["auc"]), json.dumps(h["dampak"]["spearman_bahaya_meninggal"]))


if __name__ == "__main__":
    main()
