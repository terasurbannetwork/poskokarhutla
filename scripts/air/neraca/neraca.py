"""NA-05 Neraca air Jawa per kab/kota per bulan: bak lengas + routing antar-kab + waduk + transfer -> public/data/neraca_air.

Per sel iklim 0,1 derajat (iklim.json), bulanan 1991-2025:
  bak Thornthwaite-Mather (SNI 19-6728.1-2002 bag. 5): PET = Kc x ET0; P >= PET -> ETa = PET, sisa mengisi bak, lebih dari
  TAW = surplus; P < PET -> SM = SM x exp(-(PET-P)/TAW), ETa = P + penurunan SM. Surplus dipecah ALPHA langsung dan
  sisanya ke tampungan linear G (keluar G x (1 - exp(-1/K)) per bulan) supaya debit kemarau tidak nol.
Per sub-DAS (topologi.json), urut hulu ke hilir:
  tersedia irisan kab = pecahan luas x aliran masuk hulu + limpasan lokal irisan (+ terima transfer);
  pasok = min(tersedia, kebutuhan konsumtif irisan); sisa ke outlet sub-DAS (kab outlet = kab terluas di sub-DAS).
  Waduk di sub-DAS: tampung lalu lepas target tetap = rerata aliran 1991-2025 (jalan pertama tanpa waduk), dijepit
  [0, tampungan]. Transfer (Tarum Barat) diambil sesudah waduk, dikirim ke kab tujuan menurut penduduk.
Kab: A = R lokal + Qin; C = kebutuhan konsumtif (irigasi dikurangi aliran balik 30%); N = A - C.
  N80 (per bulan, tidak aditif) = persentil 20 N bulan itu atas 35 tahun; N80_kemarau = persentil 20 dari TOTAL N Jun-Okt tiap tahun (terlampaui 80% tahun). Status DDL gaya Permen LH 17/2009:
  SA = limpasan lokal tahunan (pengganti 10 x C x R x A), DA = penduduk x 1.600 m3/kapita/tahun.
Konservasi massa diperiksa tiap jalan: P = ETa + dS tanah + laut + keluar himpunan + pasok + dS waduk (galat < 0,1%).

Subset: hanya sub-DAS yang semua selnya dan semua hulunya sudah di iklim.json; kab masuk keluaran hanya bila semua
irisannya di himpunan itu. Semua angka berlabel estimasi-model (belum lolos validasi NA-06).

Pakai:  python3 scripts/air/neraca/neraca.py      |  python3 scripts/air/neraca/neraca.py uji
"""
import calendar, collections, csv, json, math, os, sys

DIR = os.path.dirname(os.path.abspath(__file__))
AKAR = os.path.abspath(os.path.join(DIR, "../../.."))
sys.path.insert(0, DIR)
sys.path.insert(0, os.path.join(AKAR, "scripts/kekeringan"))
import fao  # noqa: E402
import kebutuhan as KB  # noqa: E402

TOPO, IKLIM, KEB, WADUK = (os.path.join(DIR, f) for f in ("topologi.json", "iklim.json", "kebutuhan.json", "waduk.csv"))
KELUAR = os.path.join(AKAR, "public/data/neraca_air")
AWAL = 1991
SKENARIO = ("klim", "1997", "2015", "2019", "2023")
KEMARAU = (6, 7, 8, 9, 10)            # keputusan pemilik 1: Juni-Oktober
KHLA = 1600                           # m3/kapita/tahun, Permen LH 17/2009 lampiran pers. (6)
TOL = 1e-3                            # galat massa relatif
# ---- ASUMSI (dikalibrasi ke GloFAS di NA-06) ---------------------------------------------------------------------
ASUMSI_TAW = fao.taw_mm(zr=1.0)       # 130 mm: lempung FAO-56 Tabel 19, zona akar 1 m (asumsi lanskap campuran)
ASUMSI_KC = 1.0
ASUMSI_ALPHA = 0.6                    # pecahan surplus yang langsung jadi aliran (kalibrasi NA-06 dari 0,5; kompromi di VALIDASI.md)
ASUMSI_K = 2.0                        # bulan, konstanta tampungan linear (tetap 2,0 sesudah NA-06)


def bak(p, et0, taw=ASUMSI_TAW, kc=ASUMSI_KC, alpha=ASUMSI_ALPHA, k=ASUMSI_K, sm0=None, g0=0.0):
    """seri bulanan mm -> (eta, r, sm_akhir, g_akhir, sm_awal, g_awal). Menolak masukan negatif."""
    if any(x < 0 for x in p) or any(x < 0 for x in et0) or taw <= 0:
        raise ValueError("hujan/ET0 negatif atau TAW <= 0")
    sm = taw if sm0 is None else sm0
    g, keluar_g = g0, 1 - math.exp(-1 / k)
    sm_awal, g_awal = sm, g
    eta, r = [], []
    for pi, ei in zip(p, et0):
        pet = kc * ei
        if pi >= pet:
            e = pet
            sm += pi - pet
            s = max(0.0, sm - taw)
            sm -= s
        else:
            baru = sm * math.exp(-(pet - pi) / taw)
            e = pi + sm - baru
            sm, s = baru, 0.0
        g += (1 - alpha) * s
        q = g * keluar_g
        g -= q
        eta.append(e)
        r.append(alpha * s + q)
    return eta, r, sm, g, sm_awal, g_awal


def bak_dipanaskan(p, et0, **kw):
    """putaran awal 12 bulan pertama dua kali supaya keadaan awal tidak semena-mena"""
    _, _, sm, g, _, _ = bak(p[:12], et0[:12], **kw)
    _, _, sm, g, _, _ = bak(p[:12], et0[:12], sm0=sm, g0=g, **kw)
    return bak(p, et0, sm0=sm, g0=g, **kw)


def urutan(sub, tambah=()):
    """Kahn: hulu sebelum hilir; `tambah` = pasangan (a, b) syarat urut tambahan (transfer a -> b)."""
    masuk, ke = collections.Counter(), collections.defaultdict(list)
    for i, s in sub.items():
        if s["nd"] in sub:
            ke[i].append(s["nd"])
            masuk[s["nd"]] += 1
    for a, b in tambah:
        ke[a].append(b)
        masuk[b] += 1
    antre = sorted(i for i in sub if masuk[i] == 0)
    out = []
    while antre:
        i = antre.pop()
        out.append(i)
        for j in ke[i]:
            masuk[j] -= 1
            if masuk[j] == 0:
                antre.append(j)
    if len(out) != len(sub):
        raise ValueError("siklus di topologi/transfer")
    return out


def rute_bulan(order, sub, R, C, waduk, transfer, simpan_waduk, detik, muara=None):
    """Satu bulan. sub[s] = {"nd", "irisan": {kab: pecahan luas}, "outlet": kab}; R, C = {(s, kab): juta m3}.
    waduk {s: {"v": tampungan, "target": juta m3/bulan atau None}}; transfer [{"s", "m3s", "tujuan": {(s, kab): bagian}}].
    -> (per_kab {kab: {"qin","qout","pasok","kurang","dres"}}, tepi {(dari, ke, jenis): vol}, laut, batas)"""
    kab = collections.defaultdict(lambda: collections.defaultdict(float))
    tepi = collections.defaultdict(float)
    keluar, terima = {}, collections.defaultdict(float)
    laut = batas = 0.0
    anak = collections.defaultdict(list)
    for s in order:
        if sub[s]["nd"] in sub:
            anak[sub[s]["nd"]].append(s)
    for s in order:
        o = sub[s]["outlet"]
        q = 0.0
        for k, f in sub[s]["irisan"].items():
            masuk = 0.0
            for u in anak[s]:
                v = f * keluar[u]
                masuk += v
                ou = sub[u]["outlet"]
                if ou != k:
                    tepi[(ou, k, "sungai")] += v
                    kab[ou]["qout"] += v
                    kab[k]["qin"] += v
            ada = masuk + R.get((s, k), 0.0) + terima.get((s, k), 0.0)
            perlu = C.get((s, k), 0.0)
            pasok = min(ada, perlu)
            kab[k]["pasok"] += pasok
            kab[k]["kurang"] += perlu - pasok
            sisa = ada - pasok
            if k != o:
                tepi[(k, o, "sungai")] += sisa
                kab[k]["qout"] += sisa
                kab[o]["qin"] += sisa
            q += sisa
        if s in waduk:
            w = waduk[s]
            st = simpan_waduk.get(s, 0.5 * w["v"]) + q
            lepas = q if w["target"] is None else min(st, w["target"])
            lepas = max(lepas, st - w["v"])
            kab[o]["dres"] += (st - lepas) - simpan_waduk.get(s, 0.5 * w["v"])
            simpan_waduk[s] = st - lepas
            q = lepas
        for t in transfer:
            if t["s"] == s:
                ambil = min(q, t["m3s"] * detik / 1e6)
                q -= ambil
                for (s2, k2), bag in t["tujuan"].items():
                    terima[(s2, k2)] += ambil * bag
                    tepi[(o, k2, "transfer")] += ambil * bag
                    kab[o]["qout"] += ambil * bag
                    kab[k2]["qin"] += ambil * bag
        keluar[s] = q
        if sub[s]["nd"] == 0:
            laut += q
            if muara is not None:
                muara[s] = muara.get(s, 0.0) + q
            kab[o]["qout"] += q
        elif sub[s]["nd"] not in sub:
            batas += q
            kab[o]["qout"] += q
    return kab, tepi, laut, batas


def cek_massa(masuk, keluar, nama):
    galat = abs(masuk - keluar) / max(abs(masuk), 1e-9)
    if galat > TOL:
        raise AssertionError(f"{nama}: massa tidak kekal, masuk {masuk:.3f} keluar {keluar:.3f} juta m3 (galat {galat:.2%})")


def persentil(xs, q):
    xs = sorted(xs)
    i = (len(xs) - 1) * q
    a, b = math.floor(i), math.ceil(i)
    return xs[a] + (xs[b] - xs[a]) * (i - a)


def himpunan_tertutup(topo_sub, iklim_sel):
    """sub-DAS yang semua sel dan semua hulunya ada di iklim"""
    anak = collections.defaultdict(list)
    for i, s in topo_sub.items():
        anak[str(s["nd"])].append(i)
    memo = {}

    def ok(i):
        if i not in memo:
            memo[i] = False   # penjaga siklus
            memo[i] = all(c in iklim_sel for kb in topo_sub[i]["kab"].values() for c in kb) and all(ok(c) for c in anak[i])
        return memo[i]
    sys.setrecursionlimit(10000)
    return {i for i in topo_sub if ok(i)}


def jalankan(topo, iklim, keb, waduk_csv):
    tsub = topo["subdas"]
    pilih = himpunan_tertutup(tsub, iklim["sel"])
    if not pilih:
        raise SystemExit("iklim.json belum memuat satu pun sub-DAS lengkap beserta hulunya")
    n_bln = len(next(iter(iklim["sel"].values()))["p"])
    sel_dipakai = {c for i in pilih for kb in tsub[i]["kab"].values() for c in kb}
    # bak per sel
    hb = {}
    for c in sel_dipakai:
        d = iklim["sel"][c]
        eta, r, sm, g, sm0, g0 = bak_dipanaskan(d["p"], d["et0"], taw=ASUMSI_TAW, kc=ASUMSI_KC, alpha=ASUMSI_ALPHA, k=ASUMSI_K)   # dibaca saat panggil: validasi.py mengkalibrasi
        hb[c] = {"eta": eta, "r": r, "ds": (sm + g) - (sm0 + g0)}
    # struktur sub-DAS
    sub = {}
    for i in pilih:
        s = tsub[i]
        luas = {k: sum(kb.values()) for k, kb in s["kab"].items()}
        nd = str(s["nd"])
        sub[i] = {"nd": nd if nd in pilih else (0 if s["nd"] == 0 else nd), "irisan": {k: v / s["km2"] for k, v in luas.items()},
                  "outlet": max(luas, key=luas.get)}
    luas_kab_total = collections.defaultdict(float)
    for i, s in tsub.items():
        for k, kb in s["kab"].items():
            luas_kab_total[k] += sum(kb.values())
    luas_kab = collections.defaultdict(float)
    for i in pilih:
        for k, kb in tsub[i]["kab"].items():
            luas_kab[k] += sum(kb.values())
    lengkap = sorted(k for k in luas_kab if abs(luas_kab[k] - luas_kab_total[k]) < 1e-6 and k in keb["kab"])
    # waduk & transfer
    waduk, transfer, tambah = {}, [], []
    for w in waduk_csv:
        s = topo["titik"].get(w["id"])
        if s is None or str(s) not in pilih:
            continue
        s = str(s)
        if w["jenis"] == "waduk":   # dua waduk di satu sub-DAS level 09 (Cirata + Jatiluhur) = satu tampungan gabungan
            lama = waduk.get(s, {"v": 0.0, "id": ""})
            waduk[s] = {"v": lama["v"] + float(w["tampungan_juta_m3"]), "target": None, "id": "+".join(x for x in (lama["id"], w["id"]) if x)}
        else:
            tuj = w["kab_tujuan"].split(",")
            if not all(k in lengkap for k in tuj):
                continue
            pend = {k: keb["kab"][k]["pend_2025"] for k in tuj}
            tujuan = {}
            for k in tuj:   # irisan terluas kab tujuan menerima
                s2 = max((i for i in pilih if k in tsub[i]["kab"]), key=lambda i: sum(tsub[i]["kab"][k].values()))
                tujuan[(s2, k)] = pend[k] / sum(pend.values())
                tambah.append((s, s2))
            transfer.append({"s": s, "m3s": float(w["debit_m3s"]), "tujuan": tujuan, "id": w["id"]})
    order = urutan(sub, tambah)
    # iklim per irisan dan per kab (juta m3 dan mm rerata)
    bulan = [(AWAL + t // 12, t % 12 + 1) for t in range(n_bln)]
    R = [dict() for _ in range(n_bln)]
    kabv = collections.defaultdict(lambda: {x: [0.0] * n_bln for x in ("P", "ETa", "R", "dS", "ET0")})
    for i in pilih:
        for k, kb in tsub[i]["kab"].items():
            for c, a in kb.items():
                d, h = iklim["sel"][c], hb[c]
                kv = kabv[k]
                for t in range(n_bln):
                    rv = a * h["r"][t] / 1000
                    R[t][(i, k)] = R[t].get((i, k), 0.0) + rv
                    kv["R"][t] += rv
                    kv["P"][t] += a * d["p"][t] / 1000
                    kv["ETa"][t] += a * h["eta"][t] / 1000
                    kv["ET0"][t] += a * d["et0"][t] / 1000
                kv["dS"][0] += a * h["ds"] / 1000   # dS tanah total periode, dicatat di bulan pertama
    hasil = {}
    for th in KB.TAHUN:
        U = collections.defaultdict(lambda: collections.defaultdict(lambda: [0.0] * n_bln))
        C = [dict() for _ in range(n_bln)]
        for k in luas_kab:
            if k not in keb["kab"]:
                continue
            for t, (y, m) in enumerate(bulan):
                p_mm = kabv[k]["P"][t] * 1000 / luas_kab[k]
                e_mm = kabv[k]["ET0"][t] * 1000 / luas_kab[k]
                u = KB.bulanan(keb["kab"][k], th, m, e_mm, p_mm, tahun=y)
                for j, v in u.items():
                    U[k][j][t] = v
                for i in pilih:   # kebutuhan dibagi ke irisan menurut luas (kab sebagian: hanya bagian di himpunan)
                    if k in tsub[i]["kab"]:
                        C[t][(i, k)] = u["konsumtif"] * sum(tsub[i]["kab"][k].values()) / luas_kab_total[k]
        target = rerata_masuk_waduk(order, sub, R, C, waduk, bulan)   # rerata aliran tanpa operasi waduk
        for s in waduk:
            waduk[s]["target"] = target[s]
        st = {}
        jalan = {"kab": collections.defaultdict(lambda: collections.defaultdict(lambda: [0.0] * n_bln)),
                 "tepi": collections.defaultdict(lambda: [0.0] * n_bln), "muara": {}, "muara_t": {}, "laut": 0.0, "batas": 0.0, "pasok": 0.0, "dres": 0.0}
        for t, (y, m) in enumerate(bulan):
            mt = {}
            kb_t, tp, laut, bts = rute_bulan(order, sub, R[t], C[t], waduk, transfer, st, 86400 * calendar.monthrange(y, m)[1], mt)
            for s_, v_ in mt.items():   # aliran ke laut per sub-DAS muara (validasi GloFAS)
                jalan["muara"][s_] = jalan["muara"].get(s_, 0.0) + v_
                jalan["muara_t"].setdefault(s_, [0.0] * n_bln)[t] = v_
            for k, v in kb_t.items():
                for x, val in v.items():
                    jalan["kab"][k][x][t] = val
            for e, v in tp.items():
                jalan["tepi"][e][t] = v
            jalan["laut"] += laut
            jalan["batas"] += bts
            jalan["pasok"] += sum(v["pasok"] for v in kb_t.values())
            jalan["dres"] += sum(v["dres"] for v in kb_t.values())
        P = sum(sum(kabv[k]["P"]) for k in luas_kab)
        eta = sum(sum(kabv[k]["ETa"]) for k in luas_kab)
        ds = sum(kabv[k]["dS"][0] for k in luas_kab)
        cek_massa(P, eta + ds + jalan["laut"] + jalan["batas"] + jalan["pasok"] + jalan["dres"], f"neraca {th}")
        hasil[th] = (U, jalan)
    return {"pilih": pilih, "lengkap": lengkap, "kabv": kabv, "hasil": hasil, "bulan": bulan, "waduk": waduk,
            "transfer": transfer, "sub": sub, "luas_kab": luas_kab}


def rerata_masuk_waduk(order, sub, R, C, waduk, bulan):
    """rerata bulanan aliran keluar sub-DAS waduk bila waduk tidak dioperasikan (tanpa transfer)"""
    jml = collections.defaultdict(float)
    for t in range(len(bulan)):
        keluar = {}
        anak = collections.defaultdict(list)
        for s in order:
            if sub[s]["nd"] in sub:
                anak[sub[s]["nd"]].append(s)
        for s in order:
            q = 0.0
            for k, f in sub[s]["irisan"].items():
                ada = sum(f * keluar[u] for u in anak[s]) + R[t].get((s, k), 0.0)
                q += ada - min(ada, C[t].get((s, k), 0.0))
            keluar[s] = q
            if s in waduk:
                jml[s] += q
    return {s: v / len(bulan) for s, v in jml.items()}


def ringkas_kab(k, keb_k, kabv, U, jalan, bulan, U30, jalan30):
    """indikator per skenario -> dict siap tulis (juta m3, 2 desimal)"""
    idx = {sk: [t for t, (y, m) in enumerate(bulan) if sk == "klim" or y == int(sk)] for sk in SKENARIO}
    j = jalan["kab"][k]

    def seri(nama, t):
        if nama in ("P", "ETa", "R"):
            return kabv[k][nama][t]
        if nama in ("qin", "qout", "kurang"):
            return j[nama][t]
        if nama == "A":
            return kabv[k]["R"][t] + j["qin"][t]
        if nama == "N":
            return kabv[k]["R"][t] + j["qin"][t] - U[k]["konsumtif"][t]
        if nama == "N2030":
            return kabv[k]["R"][t] + jalan30["kab"][k]["qin"][t] - U30[k]["konsumtif"][t]
        return (U30 if nama.endswith("2030") else U)[k][nama.replace("_2030", "")][t]

    nama = ("P", "ETa", "R", "qin", "qout", "A", "domestik", "irigasi", "ternak", "industri", "total", "konsumtif",
            "irigasi_sni", "kurang", "N", "N2030", "konsumtif_2030")
    out = {}
    for sk in SKENARIO:
        per_bulan = {x: [0.0] * 12 for x in nama}
        n = collections.Counter()
        for t in idx[sk]:
            m = bulan[t][1] - 1
            n[m] += 1
            for x in nama:
                per_bulan[x][m] += seri(x, t)
        d = {x: [round(v / n[m], 2) for m, v in enumerate(per_bulan[x])] for x in nama}
        if sk == "klim":
            d["N80"] = [round(persentil([seri("N", t) for t in idx[sk] if bulan[t][1] == m + 1], 0.2), 2) for m in range(12)]   # per bulan, TIDAK aditif
            # N80 kemarau sebenarnya: persentil 20 dari TOTAL Jun-Okt tiap tahun (35 nilai) = terlampaui 80% tahun
            tot = [sum(seri("N", t) for t in idx[sk] if bulan[t][0] == y and bulan[t][1] in KEMARAU) for y in sorted({b[0] for b in bulan})]
            d["N80_kemarau_total"] = round(persentil(tot, 0.2), 2)
        for x in ("ternak", "industri"):
            if keb_k[x] is None:
                d[x] = None
        out[sk] = d
    return out


def tulis(h, keb, topo, iklim_meta):
    os.makedirs(KELUAR, exist_ok=True)
    meta = {"label": "estimasi-model", "satuan": "juta m3 per bulan (rerata bulan kalender untuk klim)",
            "versi": "v1 (NA-05)", "periode_iklim": "1991-01..2025-12; sumber per variabel di sumber_iklim",
            "sumber_iklim": iklim_meta["sumber"],
            "kebutuhan": "2025 (N, konsumtif) dan proyeksi 2030 (N2030, konsumtif_2030)",
            "kemarau": "Juni-Oktober", "skenario": list(SKENARIO),
            "parameter": {"taw_mm": ASUMSI_TAW, "kc": ASUMSI_KC, "alpha": ASUMSI_ALPHA, "k_bulan": ASUMSI_K,
                          "label": "asumsi-kebijakan, kalibrasi GloFAS di NA-06"},
            "cakupan": {"kab_lengkap": len(h["lengkap"]), "kab_total": 119, "subdas": len(h["pilih"]),
                        "catatan": "subset: hanya sub-DAS yang iklimnya lengkap beserta hulunya"},
            "waduk_aktif": [w["id"] for w in h["waduk"].values()], "transfer_aktif": [t["id"] for t in h["transfer"]],
            "sumber": {"iklim": "scripts/air/neraca/iklim.json", "topologi": "scripts/air/neraca/topologi.json",
                       "kebutuhan": "scripts/air/neraca/kebutuhan.json", "waduk": "scripts/air/neraca/waduk.csv"}}
    U, jl = h["hasil"][2025]
    U30, jl30 = h["hasil"][2030]
    kab = {k: {"nama": keb["kab"][k]["nama"], "prov": keb["kab"][k]["prov"],
               "skenario": ringkas_kab(k, keb["kab"][k], h["kabv"], U, jl, h["bulan"], U30, jl30)} for k in h["lengkap"]}
    json.dump({"meta": meta, "kab": kab}, open(os.path.join(KELUAR, "kab.json"), "w"), ensure_ascii=False, separators=(",", ":"))
    # ringkas
    hulu_waduk = set()
    for s in h["waduk"]:   # kab di hilir waduk
        j = s
        while j in h["sub"]:
            hulu_waduk |= set(h["sub"][j]["irisan"])
            j = h["sub"][j]["nd"]
    luas_sub = sum(v["km2"] for v in topo["subdas"].values()) / len(topo["subdas"])
    rk = {}
    for k, v in kab.items():
        kl = v["skenario"]["klim"]
        A, C = sum(kl["A"]), sum(kl["konsumtif"])
        sa = sum(kl["R"])
        da = keb["kab"][k]["pend_2025"] * KHLA / 1e6
        rk[k] = {"nama": v["nama"], "prov": v["prov"], "N_tahunan": round(sum(kl["N"]), 1),
                 "N_kemarau": round(sum(kl["N"][m - 1] for m in KEMARAU), 2),
                 "N80_kemarau": round(kl["N80_kemarau_total"], 2),
                 "R_tahunan": round(sum(kl["R"]), 1), "C_tahunan": round(C, 1), "qin_tahunan": round(sum(kl["qin"]), 1),
                 "N2030_tahunan": round(sum(kl["N2030"]), 1),
                 "bulan_defisit": sum(1 for x in kl["N"] if x < 0), "bulan_defisit_N80": sum(1 for x in kl["N80"] if x < 0),
                 "rasio_C_A_persen": round(100 * C / A, 1) if A > 0 else None,
                 "N_kemarau_skenario": {sk: round(sum(v["skenario"][sk]["N"][m - 1] for m in KEMARAU), 2) for sk in SKENARIO[1:]},
                 "ddl": {"SA": round(sa, 1), "DA": round(da, 1), "status": "surplus" if sa > da else "defisit",
                         "catatan": "gaya Permen LH 17/2009; SA = limpasan lokal model, bukan 10 x C x R x A"},
                 "bendera": {"hilir_waduk": k in hulu_waduk, "kota_kecil": h["luas_kab"][k] < luas_sub,
                             "ternak_kosong": keb["kab"][k]["ternak"] is None, "industri_kosong": keb["kab"][k]["industri"] is None}}
    json.dump({"meta": meta, "kab": rk}, open(os.path.join(KELUAR, "ringkas.json"), "w"), ensure_ascii=False, separators=(",", ":"))
    # aliran antar-kab: rerata bulan kalender
    tepi = []
    for (a, b, jenis), s in jl["tepi"].items():
        if a in kab or b in kab:
            per = [0.0] * 12
            for t, x in enumerate(s):
                per[h["bulan"][t][1] - 1] += x
            ny = len(s) / 12
            tepi.append({"dari": a, "ke": b, "jenis": jenis, "bulanan": [round(x / ny, 2) for x in per]})
    json.dump({"meta": meta, "tepi": sorted(tepi, key=lambda e: -sum(e["bulanan"]))},
              open(os.path.join(KELUAR, "aliran.json"), "w"), ensure_ascii=False, separators=(",", ":"))
    return rk


def main():
    topo, iklim, keb = (json.load(open(p)) for p in (TOPO, IKLIM, KEB))
    for c, d in iklim["sel"].items():   # masukan salah ditolak sebelum hitung
        if any(x < 0 for x in d["p"] + d["et0"]):
            raise ValueError(f"iklim sel {c}: nilai negatif")
    h = jalankan(topo, iklim, keb, list(csv.DictReader(open(WADUK))))
    rk = tulis(h, keb, topo, iklim['meta'])
    semua = list(h["luas_kab"])   # seluruh himpunan sub-DAS tertutup, termasuk bagian kab yang belum lengkap
    ny = len(h["bulan"]) / 12
    luas = sum(h["luas_kab"][k] for k in semua)
    R = sum(sum(h["kabv"][k]["R"]) for k in semua) / ny
    P = sum(sum(h["kabv"][k]["P"]) for k in semua) / ny
    E = sum(sum(h["kabv"][k]["ETa"]) for k in semua) / ny
    print(f"himpunan tertutup: {len(h['pilih'])} sub-DAS", file=sys.stderr)
    print(f"kab lengkap {len(h['lengkap'])}: {', '.join(rk[k]['nama'] for k in h['lengkap'])}", file=sys.stderr)
    print(f"luas {luas:.0f} km2; P {P:.0f}, ETa {E:.0f}, R {R:.0f} juta m3/th = P {P / luas * 1000:.0f}, "
          f"ETa {E / luas * 1000:.0f}, R {R / luas * 1000:.0f} mm/th", file=sys.stderr)
    print(f"R x luas Jawa BPS (132.698 km2) = {R / luas * 132698:.0f} juta m3/th vs BPS 2020 175.558", file=sys.stderr)


def uji():
    # 1. bak 3 bulan angka tangan
    eta, r, sm, g, sm0, g0 = bak([200, 0, 0], [100, 100, 100], taw=100, alpha=1.0)
    assert [round(x, 2) for x in eta] == [100, 63.21, 23.25] and [round(x, 2) for x in r] == [100, 0, 0], (eta, r)
    assert abs(200 - (sum(eta) + sum(r) + (sm + g) - (sm0 + g0))) < 1e-9, "bak tidak kekal massa"
    eta, r, sm, g, sm0, g0 = bak([300, 50, 0, 10], [100, 120, 130, 90], taw=80, alpha=0.4, k=1.5)
    assert abs(360 - (sum(eta) + sum(r) + sm + g - sm0 - g0)) < 1e-9 and min(r[1:]) > 0, "aliran dasar harus > 0 saat kering"
    try:
        bak([-1], [1])
    except ValueError:
        pass
    else:
        raise AssertionError("hujan negatif lolos")
    # 2. rantai 3 sub-DAS, 2 kab: 1 (A) -> 2 (A/B separuh, outlet B) -> 3 (B) -> laut
    sub = {"1": {"nd": "2", "irisan": {"A": 1.0}, "outlet": "A"}, "2": {"nd": "3", "irisan": {"A": 0.5, "B": 0.5}, "outlet": "B"},
           "3": {"nd": 0, "irisan": {"B": 1.0}, "outlet": "B"}}
    order = urutan(sub)
    R = {("1", "A"): 10.0, ("2", "A"): 2.0, ("2", "B"): 2.0, ("3", "B"): 1.0}
    kab, tepi, laut, bts = rute_bulan(order, sub, R, {}, {}, [], {}, 0)
    assert abs(laut - 15) < 1e-12 and bts == 0
    # aliran 1 (10) dibagi di sub-DAS 2: 5 ke irisan B (A->B), 5 + 2 lokal di irisan A lalu ke outlet B (A->B) = 12
    assert abs(kab["A"]["qout"] - 12) < 1e-12 and abs(kab["B"]["qin"] - 12) < 1e-12, dict(kab["A"])
    assert abs(tepi[("A", "B", "sungai")] - 12) < 1e-12
    # 3. kebutuhan melebihi pasokan: kurang tercatat, aliran tak negatif, kekal massa
    C = {("2", "B"): 100.0}
    kab, tepi, laut, bts = rute_bulan(order, sub, R, C, {}, [], {}, 0)
    assert abs(kab["B"]["pasok"] - 7.0) < 1e-12 and abs(kab["B"]["kurang"] - 93.0) < 1e-12 and laut >= 0
    cek_massa(15, laut + kab["B"]["pasok"], "rantai")
    # 4. waduk: target tetap, tampungan dalam [0, V], massa termasuk dS waduk
    st, lepas, masuk = {}, [], [50, 50, 0, 0, 0, 0]
    sub1 = {"1": {"nd": 0, "irisan": {"A": 1.0}, "outlet": "A"}}
    dres = 0.0
    for x in masuk:
        kab, _, laut, _ = rute_bulan(["1"], sub1, {("1", "A"): x}, {}, {"1": {"v": 200, "target": 15}}, [], st, 0)
        lepas.append(laut)
        dres += kab["A"]["dres"]
        assert 0 <= st["1"] <= 200
    assert lepas == [15] * 6 and abs(sum(masuk) - sum(lepas) - dres) < 1e-9, lepas
    st, lepas = {}, []   # waduk kecil: limpah = tampungan - kapasitas
    for x in masuk:
        lepas.append(rute_bulan(["1"], sub1, {("1", "A"): x}, {}, {"1": {"v": 60, "target": 15}}, [], st, 0)[2])
    assert lepas == [20, 50, 15, 15, 15, 15] and st["1"] == 0, lepas
    # 5. transfer memindah air antar-DAS, total kekal
    sub2 = {"1": {"nd": 0, "irisan": {"A": 1.0}, "outlet": "A"}, "9": {"nd": 0, "irisan": {"D": 1.0}, "outlet": "D"}}
    tr = [{"s": "1", "m3s": 1.0, "tujuan": {("9", "D"): 1.0}}]
    order2 = urutan(sub2, [("1", "9")])
    kab, tepi, laut, _ = rute_bulan(order2, sub2, {("1", "A"): 10.0}, {("9", "D"): 1.0}, {}, tr, {}, 2e6)
    assert abs(tepi[("A", "D", "transfer")] - 2.0) < 1e-12 and abs(laut + kab["D"]["pasok"] - 10) < 1e-12
    assert order2.index("1") < order2.index("9")
    # 6. yang salah ditolak: siklus, massa bocor
    for salah, pesan in ((lambda: urutan({"1": {"nd": "2"}, "2": {"nd": "1"}}), "siklus"),
                         (lambda: cek_massa(100, 99, "bocor"), "tidak kekal")):
        try:
            salah()
        except (ValueError, AssertionError) as e:
            assert pesan in str(e), e
        else:
            raise AssertionError(f"{pesan} lolos")
    # 7. himpunan tertutup: sub-DAS yang hulunya tanpa iklim tidak dipakai
    ts = {"1": {"nd": 2, "kab": {"A": {"a": 1}}}, "2": {"nd": 0, "kab": {"B": {"b": 1}}}, "3": {"nd": 0, "kab": {"C": {"c": 1}}}}
    assert himpunan_tertutup(ts, {"b": 0, "c": 0}) == {"3"} and himpunan_tertutup(ts, {"a": 0, "b": 0}) == {"1", "2"}
    assert abs(persentil([1, 2, 3, 4, 5], 0.2) - 1.8) < 1e-12
    print("ok neraca")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main()
