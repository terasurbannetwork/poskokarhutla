"""Uji silang titik panas satelit kita vs LOGBOOK BNPB (Pusdalops) karhutla 2026 -> public/data/validasi_logbook_karhutla.json

Logbook (public/data/logbook_kejadian.json, scripts/umum/logbook_bnpb.py) = label yang dilaporkan BPBD: kab, mulai, surut, ha.
Dihitung dari arsip FIRMS lokal (data/raw/firms/{modis,viirs,viirs_noaa20,viirs_noaa21}.csv; env FIRMS_DIR menimpa), definisi titik
= titik_unik.py (lokasi unik ~375 m per hari WIB, M+N+N20+N21, semua keyakinan, tanpa sumber panas tetap). LAPORAN SAJA: tidak mengubah faktor/aturan.

  a. Deteksi : ada titik di kab pada [mulai-3, terlihat_akhir]? Per kelas ha dan provinsi. Kebalikannya: kab-minggu banyak titik tanpa kejadian logbook.
  b. Luas    : titik unik-harian kab pada jendela kejadian x HA_TITIK (rerata N20 4,12 / N21 4,16) vs ha BPBD; rasio median, IQR, galat log.
  c. Durasi  : tanggal padam aturan kita (48 jam tanpa titik di kab) vs surut logbook.
Kejadian yang jendelanya melewati data FIRMS (CUTOFF) dibuang, bukan dipotong.

Pakai:  python3 scripts/data/uji_logbook_karhutla.py        (jalan sungguhan; cache titik per kab di data/raw/logbook/)
        python3 scripts/data/uji_logbook_karhutla.py uji    (swauji mainan, tanpa berkas)
"""
import bisect, collections, csv, datetime as dt, json, math, os, random, statistics, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import titik_unik as TU  # noqa: E402
from wilayah import AKAR  # noqa: E402

D = dt.date.fromisoformat
FIRMS = os.environ.get("FIRMS_DIR", os.path.join(AKAR, "data/raw/firms"))
BERKAS = {"M": "modis.csv", "N": "viirs.csv", "N20": "viirs_noaa20.csv", "N21": "viirs_noaa21.csv"}
LOGBOOK = os.path.join(AKAR, "public/data/logbook_kejadian.json")
ARSIP = os.path.join(AKAR, "public/data/titik_hari")
KELUAR = os.path.join(AKAR, "public/data/validasi_logbook_karhutla.json")
CACHE = os.path.join(AKAR, "data/raw/logbook/titik_kab_2026.json")
HA_TITIK = (4.12 + 4.16) / 2   # ha per titik unik-harian VIIRS 375 m (keputusan pemilik, N20 4,12 / N21 4,16)
PX_HA = 14.0625                # 375 m x 375 m: batas atas luas satu piksel
MUNDUR = 3                     # hari sebelum mulai yang ikut dicari
KELAS_HA = [("<5", 0, 5), ("5-50", 5, 50), ("50-500", 50, 500), (">500", 500, 1e12)]
AMBANG_MINGGU = (10, 30, 100)


def norm(nama):
    """'Kab. Morowali Utara' -> 'morowaliutara'; 'Kota Palangka Raya' -> 'kotapalangkaraya' (nama kab polygon tak berawalan Kab.)."""
    n = nama.lower().replace("kabupaten", "").replace("kab.", "").replace("administrasi", "")
    return "".join(c for c in n if c.isalnum())


def kelas_ha(ha):
    if ha is None:
        return "tanpa_ha"
    for nm, lo, hi in KELAS_HA:
        if lo <= ha < hi:
            return nm
    return "tanpa_ha"


def padam(hari, awal, cutoff):
    """Tanggal padam = hari titik terakhir dari rangkaian pertama (hari >= awal, celah <= 2 hari) + 2 (48 jam tanpa titik).
    None bila rangkaian belum 'sepi' 2 hari penuh sebelum cutoff (tersensor) atau tak ada titik."""
    h = sorted(x for x in hari if x >= awal)
    if not h:
        return None
    cur = h[0]
    for x in h[1:]:
        if (x - cur).days > 2:
            break
        cur = x
    p = cur + dt.timedelta(days=2)
    return p if p <= cutoff else None


def kuantil(v, q):
    v = sorted(v)
    i = (len(v) - 1) * q
    lo, hi = math.floor(i), math.ceil(i)
    return v[lo] + (v[hi] - v[lo]) * (i - lo)


def ringkas(v):
    """Ringkasan sebaran: n, median, Q1, Q3 (None bila kosong)."""
    if not v:
        return {"n": 0}
    return {"n": len(v), "median": round(kuantil(v, .5), 3), "q1": round(kuantil(v, .25), 3), "q3": round(kuantil(v, .75), 3)}


def ci_median(v, n=2000, seed=1):
    """Selang 95% median lewat bootstrap (seed tetap)."""
    if len(v) < 5:
        return None
    r = random.Random(seed)
    m = sorted(statistics.median(r.choices(v, k=len(v))) for _ in range(n))
    return [round(m[int(.025 * n)], 3), round(m[int(.975 * n) - 1], 3)]


def tgl_sensor_maks(berkas):
    """Tanggal acq_date terbesar di CSV (baca penuh sekali; dipakai juga oleh muat_titik)."""
    return max(r["acq_date"] for r in csv.DictReader(open(berkas)))


def muat_titik(cutoff):
    """-> {(kode_prov, norm kab): {hari ISO: jumlah lokasi unik}} dan {kab: jumlah sel unik}."""
    import titik_palsu as TP
    from wilayah import Wilayah
    industri, _ = TP.sel_industri()
    lihat = set()
    awal = D("2026-01-01") - dt.timedelta(days=1)
    for s, nama in BERKAS.items():
        for r in csv.DictReader(open(os.path.join(FIRMS, nama))):
            if r["acq_date"] < awal.isoformat() or r["acq_date"] > (cutoff + dt.timedelta(days=1)).isoformat():
                continue
            jam = r["acq_time"].zfill(4)
            t = dt.datetime.fromisoformat(f"{r['acq_date']}T{jam[:2]}:{jam[2:]}") + dt.timedelta(hours=7)
            d = t.date()
            if d.year != 2026 or d > cutoff:
                continue
            la, lo = float(r["latitude"]), float(r["longitude"])
            if industri and TP.palsu(r["latitude"], r["longitude"], industri):
                continue
            lihat.add((d, TU.sel(la, lo), la, lo))
    # sel->koordinat pertama; satu (hari, sel) sekali
    uniq = {}
    for d, c, la, lo in lihat:
        uniq.setdefault((d, c), (la, lo))
    w, adm, out, sel_kab = Wilayah(), {}, collections.defaultdict(lambda: collections.Counter()), collections.defaultdict(set)
    for (d, c), (la, lo) in uniq.items():
        if c not in adm:
            a = w.cari(lo, la)
            adm[c] = (a[0], norm(a[1])) if a else None
        k = adm[c]
        if k:
            out[k][d.isoformat()] += 1
            sel_kab[k].add(c)
    return {k: dict(v) for k, v in out.items()}, {k: len(v) for k, v in sel_kab.items()}


def titik_cache(cutoff):
    if os.path.exists(CACHE):
        j = json.load(open(CACHE))
        if j["cutoff"] == cutoff.isoformat():
            return {tuple(k.split("|")): v for k, v in j["hari"].items()}, {tuple(k.split("|")): v for k, v in j["sel"].items()}
    hari, sel = muat_titik(cutoff)
    os.makedirs(os.path.dirname(CACHE), exist_ok=True)
    json.dump({"cutoff": cutoff.isoformat(), "hari": {"|".join(k): v for k, v in hari.items()}, "sel": {"|".join(k): v for k, v in sel.items()}}, open(CACHE, "w"), separators=(",", ":"))
    return hari, sel


def jendela(e):
    """(awal, akhir) tanggal pencarian satu kejadian."""
    mulai = D(e["mulai"]) if e.get("mulai") else D(e["terlihat"][0])
    akhir = D(e["terlihat"][1])
    if e.get("surut"):
        akhir = max(akhir, D(e["surut"]))
    return mulai - dt.timedelta(days=MUNDUR), akhir, mulai


def hitung_jendela(hari_kab, a, b):
    """-> jumlah titik unik-harian pada [a, b] di satu kab."""
    return sum(n for h, n in hari_kab.items() if a <= D(h) <= b)


def muat_arsip():
    """Sumber utama (jalan di CI): public/data/titik_hari/*.json (titik_hari.py). Arsip hanya menyimpan hari >= AMBANG lokasi unik
    nasional, jadi data per kab LENGKAP hanya sejak hari sesudah hari tak berarsip terakhir. -> (hari, cutoff, awal) atau None bila tak terpakai."""
    fi = os.path.join(ARSIP, "indeks.json")
    if not os.path.exists(fi):
        return None
    ix = json.load(open(fi))
    ada = set(ix.get("arsip", []))
    jml = ix.get("jumlah", {})
    if not ada or not jml:
        return None
    cutoff = D(max(ada))
    kosong = [d for d in jml if d not in ada and d <= cutoff.isoformat()]
    awal = D(max(kosong)) + dt.timedelta(days=1) if kosong else D("2026-01-01")
    hari, sel = {}, collections.defaultdict(set)
    for d in sorted(ada):
        if D(d) < awal:
            continue
        j = json.load(open(os.path.join(ARSIP, d + ".json")))
        for b in j["baris"]:
            pr, kab, _ = j["wilayah"][b[6]].split("|")
            k = (pr, norm(kab))
            hari.setdefault(k, collections.Counter())[d] += 1
    return {k: dict(v) for k, v in hari.items()}, cutoff, awal


def analisis(kejadian, hari, sel, cutoff, awal=None):
    """kejadian: daftar logbook karhutla (kab_kode, kab, prov, ...). hari: {(prov, kab_norm): {hari: n}}. -> dict hasil."""
    pakai, buang = [], collections.Counter()
    for e in kejadian:
        if not e.get("kab_kode"):
            buang["tanpa_kab_kode"] += 1
            continue
        k = (e["kab_kode"][:2], norm(e["kab"]))
        a, b, mulai = jendela(e)
        if awal and a < awal:
            buang["sebelum_awal_data_lengkap"] += 1
            continue
        if b > cutoff:
            buang["lewat_cutoff"] += 1
            continue
        if k not in hari:
            buang["kab_tak_cocok_atau_nol_titik_sepanjang_tahun"] += 1
            e = dict(e, _tdk_cocok=True)
        pakai.append((e, k, a, b, mulai))
    # deteksi
    baris = []
    for e, k, a, b, mulai in pakai:
        hk = hari.get(k, {})
        n = hitung_jendela(hk, a, b)
        # kejadian lain di kab sama yang jendelanya beririsan -> luas/durasi ambigu
        tunggal = not any(k2 == k and e2 is not e and a2 <= b and a <= b2 for e2, k2, a2, b2, _ in pakai)
        baris.append({"e": e, "k": k, "a": a, "b": b, "mulai": mulai, "n": n, "tunggal": tunggal, "hk": hk})
    def tingkat(rs):
        t = len(rs)
        return {"n": t, "terdeteksi": sum(r["n"] >= 1 for r in rs), "laju": round(sum(r["n"] >= 1 for r in rs) / t, 3) if t else None,
                "laju_ge3": round(sum(r["n"] >= 3 for r in rs) / t, 3) if t else None}
    det = {"semua": tingkat(baris), "kelas_ha": {}, "provinsi": {}}
    for nm, _, _ in KELAS_HA + [("tanpa_ha", 0, 0)]:
        rs = [r for r in baris if kelas_ha(r["e"].get("ha")) == nm]
        if rs:
            det["kelas_ha"][nm] = tingkat(rs)
    for p in sorted({r["e"]["prov"] for r in baris}):
        rs = [r for r in baris if r["e"]["prov"] == p]
        if len(rs) >= 5:
            det["provinsi"][p] = tingkat(rs)
    # luas: hanya kejadian tunggal di kab, ada ha, ada titik
    lr, per_prov, per_kelas, sedikit = [], collections.defaultdict(list), collections.defaultdict(list), []
    lr_px = []
    for r in baris:
        ha = r["e"].get("ha")
        if not (r["tunggal"] and ha and ha > 0 and r["n"] > 0):
            continue
        ours = r["n"] * HA_TITIK
        lr.append(math.log(ours / ha))
        per_prov[r["e"]["prov"]].append(math.log(ours / ha))
        per_kelas[kelas_ha(ha)].append(math.exp(lr[-1]))
        if r["n"] <= 5:
            sedikit.append(lr[-1])   # titik kab sedikit = paling kecil kemungkinan campur api lain
    luas = {"n": len(lr), "definisi": "rasio = luas satelit (titik unik-harian kab pada jendela x 4,14 ha) / ha BPBD, kejadian tunggal di kab, ha>0, titik>=1"}
    if lr:
        rs = [math.exp(x) for x in lr]
        luas.update({"rasio": ringkas(rs), "rasio_median_ci95": [round(math.exp(x), 3) for x in (ci_median(lr) or [float("nan")] * 2)] if ci_median(lr) else None,
                     "galat_log_mean_abs": round(statistics.mean(abs(x) for x in lr), 3), "galat_log_sd": round(statistics.pstdev(lr), 3) if len(lr) > 1 else None,
                     "faktor_saran_ha_per_titik": round(HA_TITIK / math.exp(statistics.median(lr)), 3),
                     "faktor_saran_ci95": [round(HA_TITIK / math.exp(x), 3) for x in reversed(ci_median(lr))] if ci_median(lr) else None,
                     "per_kelas_ha": {k: ringkas(v) for k, v in sorted(per_kelas.items())},
                     "titik_le5": {"rasio": ringkas([math.exp(x) for x in sedikit]), "median_ci95": [round(math.exp(x), 3) for x in (ci_median(sedikit) or [])]},
                     "per_provinsi": {p: dict(ringkas([math.exp(x) for x in v])) for p, v in sorted(per_prov.items()) if len(v) >= 5}})
    # durasi
    dsel = []
    for r in baris:
        e = r["e"]
        if not (r["tunggal"] and e.get("surut") and r["n"] > 0):
            continue
        p = padam({D(h) for h in r["hk"]}, r["a"], cutoff)
        if p is None:
            continue
        dsel.append({"selisih": (p - D(e["surut"])).days, "logbook_hari": (D(e["surut"]) - r["mulai"]).days, "kita_hari": (p - r["mulai"]).days})
    sel_ = [x["selisih"] for x in dsel]
    durasi = {"n": len(dsel), "definisi": "selisih = tanggal padam kita (titik terakhir rangkaian + 2 hari) - surut logbook; positif = kita padam lebih lambat",
              "selisih_hari": ringkas(sel_), "selisih_median_ci95": ci_median(sel_),
              "logbook_durasi_median": ringkas([x["logbook_hari"] for x in dsel]).get("median"), "kita_durasi_median": ringkas([x["kita_hari"] for x in dsel]).get("median"),
              "kita_lebih_lambat_pct": round(100 * sum(x > 0 for x in sel_) / len(sel_), 1) if sel_ else None}
    # kesenjangan pelaporan: kab-minggu titik banyak tanpa kejadian logbook
    pet = collections.defaultdict(list)
    for r in baris:
        pet[r["k"]].append((r["a"], r["b"]))
    minggu = collections.defaultdict(lambda: collections.Counter())
    for k, hk in hari.items():
        for h, n in hk.items():
            iso = D(h).isocalendar()
            minggu[k][(iso[0], iso[1])] += n
    gap = {}
    for amb in AMBANG_MINGGU:
        tot = ada = 0
        per = collections.Counter()
        for k, mg in minggu.items():
            for (y, wk), n in mg.items():
                if n < amb:
                    continue
                s0 = dt.date.fromisocalendar(y, wk, 1)
                if s0 + dt.timedelta(days=6) > cutoff or (awal and s0 < awal):
                    continue
                tot += 1
                if any(a <= s0 + dt.timedelta(days=6) and s0 <= b for a, b in pet.get(k, [])):
                    ada += 1
                else:
                    per[k[0]] += 1
        gap[f">={amb}_titik_per_minggu"] = {"kab_minggu": tot, "ada_kejadian_logbook": ada, "tanpa_kejadian": tot - ada,
                                           "pct_tanpa_kejadian": round(100 * (tot - ada) / tot, 1) if tot else None,
                                           "kode_prov_terbanyak_tanpa_kejadian": per.most_common(5)}
    nul = uji_null(baris, hari, kejadian, awal, cutoff) if (awal or hari) and baris else None
    det["model_null"] = nul
    det["vonis_null"] = vonis_null(nul)
    return {"jumlah_kejadian_dipakai": len(baris), "dibuang": dict(buang), "deteksi": det, "luas": luas, "durasi": durasi, "kesenjangan_pelaporan": gap}


DRAW = 200            # undian per kejadian untuk model-null deteksi
PAGAR = 14            # hari: jendela null tak boleh dekat kejadian logbook karhutla di kab itu
SEED_NULL = 20261029


def sahkan_null(n_kejadian, n_terdeteksi_null, draw=DRAW):
    """Penjaga: jumlah deteksi null tak mungkin melebihi kejadian x undian (ini menolak null yang membesar sendiri)."""
    if not 0 <= n_terdeteksi_null <= n_kejadian * draw:
        raise ValueError(f"null tak sah: {n_terdeteksi_null} deteksi > {n_kejadian}x{draw}={n_kejadian * draw} kemungkinan")


def uji_null(baris, hari, semua_kejadian, awal, cutoff, draw=DRAW, seed=SEED_NULL, boot=1000):
    """Pembanding peluang untuk laju deteksi. baris = baris analisis (k, a, b, mulai, e). Dua null, dua jendela:
    A = kab sama, jendela digeser ke tanggal acak [awal, cutoff] yang jauh >= PAGAR hari dari kejadian logbook karhutla kab itu;
    B = waktu sama, kab acak sewilayah provinsi (hanya kab yang punya titik di arsip) tanpa kejadian logbook karhutla dalam PAGAR hari.
    Jendela 'penuh' = [mulai-3, akhir]; 'ketat' = [mulai-1, mulai+1]. Selisih/lift: bootstrap antar-kab (kluster)."""
    rng = random.Random(seed)
    if not baris:
        return None
    hmin = awal or min(D(h) for hk in hari.values() for h in hk)
    n_hari = (cutoff - hmin).days + 1
    pre = {}
    def awalan(k):
        if k not in pre:
            a = [0] * (n_hari + 1)
            hk = hari.get(k, {})
            for i in range(n_hari):
                a[i + 1] = a[i] + (1 if (hmin + dt.timedelta(days=i)).isoformat() in hk else 0)
            pre[k] = a
        return pre[k]
    def ada(k, a, b):   # ada >=1 hari bertitik di [a,b]; di luar [hmin,cutoff] dihitung kosong
        i, j = max((a - hmin).days, 0), min((b - hmin).days, n_hari - 1)
        return j >= i and (awalan(k)[j + 1] - awalan(k)[i]) > 0
    span = collections.defaultdict(list)
    for e in semua_kejadian:
        if e.get("kab_kode"):
            a, b, m = jendela(e)
            span[(e["kab_kode"][:2], norm(e["kab"]))].append((m - dt.timedelta(days=PAGAR), b + dt.timedelta(days=PAGAR)))
    def bentrok(k, a, b):
        return any(a <= y and x <= b for x, y in span.get(k, []))
    kab_prov = collections.defaultdict(list)
    for k in set(hari) | set(span):
        kab_prov[k[0]].append(k)
    cache_awal = {}
    def boleh(k, L):
        if (k, L) not in cache_awal:
            cache_awal[(k, L)] = [hmin + dt.timedelta(days=i) for i in range(n_hari - L + 1)
                                  if not bentrok(k, hmin + dt.timedelta(days=i), hmin + dt.timedelta(days=i + L - 1))]
        return cache_awal[(k, L)]
    hasil = {}
    for nm_j in ("penuh", "ketat"):
        per = []   # (kab, kelas ha, obs, null_A, null_B)
        lewat_a = lewat_b = 0
        for r in baris:
            k, a, b, m = r["k"], r["a"], r["b"], r["mulai"]
            if nm_j == "ketat":
                a, b = m - dt.timedelta(days=1), m + dt.timedelta(days=1)
            L = (b - a).days + 1
            obs = int(ada(k, a, b))
            ok = boleh(k, L)
            na = sum(ada(k, s, s + dt.timedelta(days=L - 1)) for s in rng.choices(ok, k=draw)) / draw if ok else None
            kand = [q for q in kab_prov[k[0]] if q != k and not bentrok(q, r["a"], r["b"])]
            nb = sum(ada(q, a, b) for q in rng.choices(kand, k=draw)) / draw if kand else None
            if na is None: lewat_a += 1
            if nb is None: lewat_b += 1
            per.append((k, kelas_ha(r["e"].get("ha")), obs, na, nb))
        hasil[nm_j] = {"lewat_null_A": lewat_a, "lewat_null_B": lewat_b}
        def ringkas_null(rs, idx):
            rs = [x for x in rs if x[idx] is not None]
            if not rs:
                return None
            sahkan_null(len(rs), round(sum(x[idx] for x in rs) * draw))
            kl = collections.defaultdict(list)
            for x in rs:
                kl[x[0]].append(x)
            ks = list(kl)
            def stat(sampel):
                o = sum(x[2] for x in sampel) / len(sampel)
                nl = sum(x[idx] for x in sampel) / len(sampel)
                return o, nl
            o, nl = stat(rs)
            bs = random.Random(seed + 1)
            sel, lif = [], []
            for _ in range(boot):
                samp = [x for k in bs.choices(ks, k=len(ks)) for x in kl[k]]
                bo, bn = stat(samp)
                sel.append(bo - bn)
                if bn > 0:
                    lif.append(bo / bn)
            sel.sort(); lif.sort()
            ci = lambda v: [round(v[int(.025 * len(v))], 3), round(v[int(.975 * len(v)) - 1], 3)] if len(v) > 20 else None
            return {"n": len(rs), "diamati": round(o, 3), "null": round(nl, 3), "lift": round(o / nl, 3) if nl else None, "lift_ci95": ci(lif),
                    "selisih": round(o - nl, 3), "selisih_ci95": ci(sel)}
        for nm_n, idx in (("null_A_kab_sama_waktu_acak", 3), ("null_B_waktu_sama_kab_acak", 4)):
            hasil[nm_j][nm_n] = {"semua": ringkas_null(per, idx),
                                 "kelas_ha": {c: ringkas_null([x for x in per if x[1] == c], idx) for c in [n for n, _, _ in KELAS_HA]}}
    hasil["definisi"] = (f"{draw} undian per kejadian, seed {seed}, pagar +-{PAGAR} hari dari kejadian logbook karhutla; penuh=[mulai-3,akhir], ketat=[mulai-1,mulai+1]; "
                         "selisih/lift dengan selang 95% bootstrap antar-kab")
    return hasil


def vonis_null(h):
    """Kalimat Indonesia sederhana dari hasil uji_null (dipakai md dan JSON)."""
    if not h:
        return None
    p, k = h["penuh"], h["ketat"]
    g = lambda x, n: x[n]["semua"]
    a, b, ka, kb = g(p, "null_A_kab_sama_waktu_acak"), g(p, "null_B_waktu_sama_kab_acak"), g(k, "null_A_kab_sama_waktu_acak"), g(k, "null_B_waktu_sama_kab_acak")
    if not all((a, b, ka, kb)):
        return None
    return (f"Deteksi {a['diamati']*100:.1f}% terhadap kebetulan: kab yang sama di waktu acak terdeteksi {a['null']*100:.1f}% (lift {a['lift']}), "
            f"kab acak sewaktu {b['null']*100:.1f}% (lift {b['lift']}); pada jendela ketat +-1 hari: diamati {ka['diamati']*100:.1f}% vs {ka['null']*100:.1f}% / {kb['null']*100:.1f}%.")


def lift_riwayat(h):
    if not h:
        return {}
    g = lambda j, n: h[j][n]["semua"]
    A, B = "null_A_kab_sama_waktu_acak", "null_B_waktu_sama_kab_acak"
    return {"null_A": g("penuh", A)["null"], "lift_A": g("penuh", A)["lift"], "null_B": g("penuh", B)["null"], "lift_B": g("penuh", B)["lift"],
            "ketat_diamati": g("ketat", A)["diamati"], "ketat_lift_A": g("ketat", A)["lift"], "ketat_lift_B": g("ketat", B)["lift"]}


def uji():
    assert norm("Kab. Morowali Utara") == "morowaliutara" and norm("Kota Palangka Raya") == norm("Kota Palangkaraya")
    assert kelas_ha(None) == "tanpa_ha" and kelas_ha(4.9) == "<5" and kelas_ha(5) == "5-50" and kelas_ha(500) == ">500"
    h = {D("2026-03-01"), D("2026-03-02"), D("2026-03-04"), D("2026-03-20")}
    assert padam(h, D("2026-03-01"), D("2026-04-30")) == D("2026-03-06")   # celah 2 hari (3-4) masih satu rangkaian
    assert padam(h, D("2026-03-10"), D("2026-04-30")) == D("2026-03-22")
    assert padam(h, D("2026-03-10"), D("2026-03-21")) is None               # belum 48 jam sepi sebelum cutoff: tersensor
    assert padam([], D("2026-03-01"), D("2026-04-30")) is None
    assert kuantil([1, 2, 3, 4], .5) == 2.5 and ringkas([]) == {"n": 0}
    cut = D("2026-06-30")
    k1 = ("62", "kapuas")
    # kejadian A: 10 ha, titik tepat 2 hari x 3 titik = 6 -> 6*4.14=24.84 ha -> rasio 2.484; surut 2026-03-05 vs padam kita 03-06 -> +1
    A = {"jenis": "karhutla", "kab": "Kab. Kapuas", "prov": "Kalimantan Tengah", "kab_kode": "62.03", "mulai": "2026-03-01", "terlihat": ["2026-03-01", "2026-03-05"], "ha": 10.0, "surut": "2026-03-05"}
    B = {"jenis": "karhutla", "kab": "Kab. Tak Ada", "prov": "Kalimantan Tengah", "kab_kode": "62.99", "mulai": "2026-03-01", "terlihat": ["2026-03-01", "2026-03-01"]}
    C = {"jenis": "karhutla", "kab": "Kab. Kapuas", "prov": "Kalimantan Tengah", "kab_kode": "62.03", "mulai": "2026-07-01", "terlihat": ["2026-07-01", "2026-07-01"]}  # lewat cutoff
    X = {"jenis": "karhutla", "kab": "Kab. Kapuas", "prov": "Kalimantan Tengah", "mulai": "2026-03-01", "terlihat": ["2026-03-01", "2026-03-01"]}  # tanpa kab_kode
    hari = {k1: {"2026-03-01": 3, "2026-03-02": 3}}
    r = analisis([A, B, C, X], hari, {k1: 6}, cut)
    assert r["dibuang"] == {"lewat_cutoff": 1, "tanpa_kab_kode": 1, "kab_tak_cocok_atau_nol_titik_sepanjang_tahun": 1}, r["dibuang"]
    assert r["deteksi"]["semua"] == {"n": 2, "terdeteksi": 1, "laju": 0.5, "laju_ge3": 0.5}, r["deteksi"]
    assert r["deteksi"]["kelas_ha"]["5-50"]["terdeteksi"] == 1 and r["deteksi"]["kelas_ha"]["tanpa_ha"]["terdeteksi"] == 0
    assert r["luas"]["n"] == 1 and abs(r["luas"]["rasio"]["median"] - 2.484) < 1e-3, r["luas"]
    assert r["durasi"]["n"] == 1 and r["durasi"]["selisih_hari"]["median"] == -1, r["durasi"]   # padam kita 03-04, surut 03-05
    r2 = analisis([A], hari, {k1: 6}, cut, awal=D("2026-03-01"))   # jendela mulai 02-26 < awal: dibuang
    assert r2["dibuang"] == {"sebelum_awal_data_lengkap": 1} and r2["jumlah_kejadian_dipakai"] == 0, r2["dibuang"]
    # null: titik acak, bebas dari kejadian -> lift ~1; titik hanya di jendela kejadian -> lift >> 1; null yang membengkak ditolak
    rg = random.Random(7)
    awal0, cut0 = D("2026-07-03"), D("2026-10-27")
    kabs = [("62", f"k{i}") for i in range(12)] + [("63", f"m{i}") for i in range(12)]
    hr = {k: {(awal0 + dt.timedelta(days=i)).isoformat(): 1 for i in range(117) if rg.random() < .15} for k in kabs}
    kej = []
    for _ in range(150):
        k = rg.choice(kabs)
        m = awal0 + dt.timedelta(days=rg.randrange(10, 100))
        kej.append({"jenis": "karhutla", "kab": "Kab. " + k[1], "prov": "P" + k[0], "kab_kode": k[0] + ".01", "mulai": m.isoformat(), "terlihat": [m.isoformat(), (m + dt.timedelta(days=4)).isoformat()], "ha": 20.0})
    rn = analisis(kej, hr, {}, cut0, awal0)["deteksi"]["model_null"]
    for j in ("penuh", "ketat"):
        for nn in ("null_A_kab_sama_waktu_acak", "null_B_waktu_sama_kab_acak"):
            x = rn[j][nn]["semua"]
            assert 0.7 < x["lift"] < 1.3 and x["selisih_ci95"][0] < 0 < x["selisih_ci95"][1], (j, nn, x)   # tak ada sinyal: lift ~1, selisih mencakup 0
    hr2 = {k: {} for k in kabs}
    for e in kej:   # titik hanya di dalam jendela kejadian
        k = (e["kab_kode"][:2], norm(e["kab"]))
        for i in range(-3, 5):
            hr2[k][(D(e["mulai"]) + dt.timedelta(days=i)).isoformat()] = 1
    rs = analisis(kej, hr2, {}, cut0, awal0)["deteksi"]["model_null"]["penuh"]["null_A_kab_sama_waktu_acak"]["semua"]
    assert rs["diamati"] == 1.0 and rs["null"] < 0.2, rs   # lift None = null nol
    try:
        sahkan_null(10, 10 * DRAW + 1)
        raise SystemExit("null melebihi jumlah kejadian x undian harus ditolak")
    except ValueError:
        pass
    assert analisis(kej, hr, {}, cut0, awal0) == analisis(kej, hr, {}, cut0, awal0)   # seed tetap -> deterministik
    print("uji_logbook_karhutla: uji lolos")


def jalan():
    if not os.path.exists(LOGBOOK):
        return print("lewat: logbook_kejadian.json tidak ada; JSON lama dibiarkan")
    kej = [e for e in json.load(open(LOGBOOK))["kejadian"] if e["jenis"] == "karhutla"]
    arsip = muat_arsip()
    mx = None
    if arsip:
        hari, cutoff, awal = arsip
        sel, mode = {}, f"arsip titik_hari (lengkap sejak {awal})"
    elif os.path.isdir(FIRMS):
        mx = {s: tgl_sensor_maks(os.path.join(FIRMS, n)) for s, n in BERKAS.items()}
        # cutoff = hari lengkap terakhir sensor inti (M, N20) dikurangi 1 hari (konversi UTC->WIB)
        cutoff, awal, mode = D(min(mx["M"], mx["N20"])) - dt.timedelta(days=1), None, "CSV FIRMS"
        hari, sel = titik_cache(cutoff)
    else:
        return print("lewat: tak ada arsip titik_hari maupun CSV FIRMS; JSON lama dibiarkan")
    hasil = analisis(kej, hari, sel, cutoff, awal)
    if hasil["jumlah_kejadian_dipakai"] < 20 or not hasil["deteksi"]["semua"]["n"]:
        return print("lewat: kejadian terpakai", hasil["jumlah_kejadian_dipakai"], "< 20; JSON lama dibiarkan")
    tak = collections.Counter(f"{e['kab_kode']} {e['kab']}" for e in kej if e.get("kab_kode") and (e["kab_kode"][:2], norm(e["kab"])) not in hari)
    riwayat = []
    if os.path.exists(KELUAR):
        try:
            riwayat = json.load(open(KELUAR)).get("riwayat", [])
        except ValueError:
            pass
    hi = dt.date.today().isoformat()
    riwayat = [r for r in riwayat if r.get("tanggal") != hi] + [{"tanggal": hi, "n": hasil["jumlah_kejadian_dipakai"], "laju_deteksi": hasil["deteksi"]["semua"]["laju"],
                                                                   "durasi_selisih_median": hasil["durasi"]["selisih_hari"].get("median"),
                                                                   **lift_riwayat(hasil["deteksi"].get("model_null"))}]
    out = {"dibuat": hi, "sumber": f"logbook BNPB Pusdalops (public/data/logbook_kejadian.json) vs titik panas, sumber: {mode}",
           "catatan": "LAPORAN SAJA, faktor/aturan hidup tidak diubah. Kab dicocokkan lewat nama (poligon kecamatan).",
           "firms_tanggal_maks": mx, "cutoff_wib": cutoff.isoformat(), "awal_data_lengkap": awal.isoformat() if awal else None,
           "jumlah_kejadian_karhutla_logbook": len(kej), "kab_tak_cocok_atau_tanpa_titik": dict(tak.most_common(30)), **hasil, "riwayat": riwayat[-400:]}
    json.dump(out, open(KELUAR, "w"), ensure_ascii=False, indent=1)
    d = hasil
    print("sumber", mode, "cutoff", cutoff, "kejadian dipakai", d["jumlah_kejadian_dipakai"], "dibuang", d["dibuang"])
    print("deteksi", d["deteksi"]["semua"])
    print("luas", {k: d["luas"].get(k) for k in ("n", "rasio", "rasio_median_ci95", "faktor_saran_ha_per_titik", "faktor_saran_ci95", "galat_log_mean_abs")})
    print("durasi", {k: d["durasi"].get(k) for k in ("n", "selisih_hari", "selisih_median_ci95", "kita_lebih_lambat_pct")})
    print("gap", {k: (v["kab_minggu"], v["pct_tanpa_kejadian"]) for k, v in d["kesenjangan_pelaporan"].items()})


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else jalan()
