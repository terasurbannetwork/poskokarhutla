"""Tahap 'latih' dari latih.py: penyetelan di validasi 2023, ablasi, Sim hibrida, satu kali uji 2024-2026, ekspor.

Keluaran: data/raw/sebaran/hasil.json (semua angka), public/data/model_sebaran.json (model peramban),
          data/raw/sebaran/uji_awal.pkl (hasil per titik awal uji, dipakai kasus.py & RISET-SEBARAN.md).
"""
import json, math, multiprocessing as mp, os, pickle, random, statistics, sys, time

import gbdt as G
import latih as L
from fitur import FITUR_SEL
from umum import MENTAH, PUBLIK, bootstrap

CTX = mp.get_context("fork")  # data latih dibagi ke proses anak tanpa salin (copy-on-write)
D = {}
GRUP = {
    "angin": ["searah", "angin_searah", "ws", "ws_maks"],
    "kekeringan & FWI": ["rh_min", "t_maks", "vpd_maks", "hujan24", "hujan72", "hari_kering", "ffmc", "dmc", "dc", "bui", "isi_maks", "fwi"],
    "keadaan api": ["log_luas", "log_baru24", "umur_jam", "aktif24", "tetangga8", "log_frp"],
    "gambut": ["gambut"],
    "kawasan hutan": ["hutan", "produksi", "apl"],
    "konsesi (sawit/HTI/HPH/tambang/sanksi)": ["kebun", "hti", "hph", "tambang", "sanksi"],
    "akses manusia": ["kanal_km", "jalan_km", "desa_km", "penduduk_km2"],
    "iklim (ENSO/IOD)": ["oni", "dmi"],
    "riwayat terbakar": ["riwayat_f"],
}
log = L.log
CEPAT = bool(os.environ.get("SEBARAN_CEPAT"))  # uji coba alur: ukuran kecil, angka tidak dilaporkan


def muat():
    with open(L.SAMPEL, "rb") as f:
        s = pickle.load(f)
    idx = {"latih": [], "val": [], "uji": []}
    for i, th in enumerate(s["th"]):
        idx[L.bagian(th)].append(i)
    s["idx"] = idx
    return s


def sub(idx, n, seed=3):
    return idx if len(idx) <= n else random.Random(seed).sample(idx, n)


def kolom(fitur):
    ix = [D["s"]["kolom"].index(f) for f in fitur]
    return lambda r: [r[i] for i in ix]


def latih_model(jenis, fitur, idx, **kw):
    s = D["s"]
    pick = kolom(fitur)
    X = [pick(s["X"][i]) for i in idx]
    y = [s["y"][i] for i in idx]
    w = [s["w"][i] for i in idx]
    mw = sum(w) / len(w)
    w = [x / mw for x in w]  # bobot dinormalkan (rata-rata 1) supaya min_h & L2 bermakna sama di tiap sampel
    if jenis == "lr":
        m = G.latih_lr(X, y, w)
        m.pop("H", None)
    else:
        m = G.latih_gbdt(X, y, w, **kw)
    m["jenis"], m["fitur"] = jenis, list(fitur)
    return m


def nilai(m, idx, n_pohon=None):
    s = D["s"]
    pick = kolom(m["fitur"])
    if m["jenis"] == "gbdt" and n_pohon:
        m = {**m, "pohon": m["pohon"][:n_pohon]}
    f = (lambda x: G.prediksi_gbdt(m, x)) if m["jenis"] == "gbdt" else (lambda x: G.prediksi_lr(m, x))
    p = [f(pick(s["X"][i])) for i in idx]
    y = [s["y"][i] for i in idx]
    w = [s["w"][i] for i in idx]
    return {"logloss": round(G.logloss(p, y, w), 5), "auc": round(G.auc(p, y, w), 4), "brier": round(G.brier(p, y, w), 5)}, p


def _ablasi(arg):
    nama, fitur = arg
    m = latih_model("gbdt", fitur, D["tr_kecil"], pohon=100, dalam=3, lr=.12)
    return nama, nilai(m, D["va"])[0]


def _sim_par(arg):
    e, ji, pars = arg
    k = L.ktx()
    S = L.seri_untuk(e)
    p, tb, ak, b24, _, _ = L.jangkar(e)[ji]
    if not S or not S.cukup(p, 96):
        return None
    out = []
    for mdl, par in pars:
        P, _ = L.ramal_sim(e, p, tb, ak, S, k, par=par, model=mdl)
        out.append((len(P[0] & b24), len(P[0]), len(b24)))
    return out


def ringkas_semua(hasil, modes):
    R = {}
    for nm in modes:
        R[nm] = {}
        for h, lbl in enumerate(("24", "48", "72")):
            R[nm][lbl] = {"semua": L.ringkas(hasil, nm, h), "tumbuh": L.ringkas(hasil, nm, h, lambda r, h=h: r["skor"]["persistensi"][h]["no"] > 0),
                          "deteksi_pertama": L.ringkas(hasil, nm, h, lambda r: r["ji"] == 0)}
    return R


def pilih_per_strata(hasil, model):
    """Model dengan F1 mikro 24 jam tertinggi per strata (gambut / mineral / sabana) di VALIDASI."""
    out = {}
    for st in ("gambut", "mineral", "sabana"):
        best = None
        for nm in model:
            if nm in ("persistensi", "sim_kal"):
                continue
            r = L.ringkas(hasil, nm, 0, lambda r, st=st: r["strata"] == st)
            if r and (best is None or r["f1_mikro"] > best[1]):
                best = (nm, r["f1_mikro"])
        out[st] = best[0] if best else "gbdt"
    return out


def gabung(hasil, pilihan):
    for r in hasil:
        nm = pilihan.get(r["strata"], "gbdt")
        if nm in r["skor"]:
            r["skor"]["gabungan"] = r["skor"][nm]


def ringkas_strata(hasil, model):
    return {st: {nm: {h: L.ringkas(hasil, nm, i, lambda r, st=st: r["strata"] == st) for i, h in ((0, "24"), (2, "72"))} for nm in model}
            for st in ("gambut", "mineral", "sabana")}


def lepas_model(hasil, model):
    """AUC 'akan lolos' (>= 10 sel dalam 72 jam) dari deteksi pertama; skor = luas ramalan 72 jam (GBDT: peluang MC)."""
    rs = [r for r in hasil if r["ji"] == 0]
    y = [1 if r["akhir72"] >= L.LEPAS else 0 for r in rs]
    out = {}
    for nm in model:
        if nm == "persistensi":
            continue
        sk = [(r.get("p_lepas", 0) if nm == "gbdt" else r["skor"][nm][2]["np"]) if nm in r["skor"] else None for r in rs]
        pas = [(a, b) for a, b in zip(sk, y) if a is not None]
        if len(pas) > 20:
            a = G.auc([x for x, _ in pas], [b for _, b in pas])
            out[nm] = round(a, 4) if a is not None else None
    return out


def arah_ringkas(hasil):
    out = {"angin_bawah": bootstrap([r.get("arah_angin_err") for r in hasil if "arah_angin_err" in r]),
           "arah_kemarin": bootstrap([r.get("arah_kemarin_err") for r in hasil if "arah_kemarin_err" in r])}
    for nm in ("lr", "gbdt", "sim", "sim_kal", "hibrida", *L.PEMBANDING):
        out[nm] = bootstrap([r["skor"][nm][0]["arah"] for r in hasil if nm in r["skor"] and r["skor"][nm][0]["arah"] is not None])
    # perbandingan berpasangan pada kasus yang sama
    sama = [r for r in hasil if "arah_angin_err" in r and r["skor"].get("gbdt", [{}])[0].get("arah") is not None]
    out["pasangan_gbdt_vs_angin"] = bootstrap([r["skor"]["gbdt"][0]["arah"] - r["arah_angin_err"] for r in sama])
    return out


def logit(p):
    p = min(max(p, .01), .99)
    return math.log(p / (1 - p))


def kal_lepas(hasil):
    """Kalibrasi Platt peluang lolos Monte Carlo pada titik awal VALIDASI (deteksi pertama)."""
    rs = [r for r in hasil if r["ji"] == 0 and "p_lepas" in r]
    m = G.latih_lr([[logit(r["p_lepas"])] for r in rs], [1 if r["akhir72"] >= L.LEPAS else 0 for r in rs], [1.0] * len(rs), l2=.1)
    return {"mu": m["mu"], "sd": m["sd"], "b": m["b"]}


def p_kal(K, p):
    return G.sigmoid(K["b"][0] + K["b"][1] * (logit(p) - K["mu"][0]) / K["sd"][0]) if K else p


def lepas_ringkas(hasil, K=None):
    rs = [r for r in hasil if r["ji"] == 0 and "p_lepas" in r]
    y = [1 if r["akhir72"] >= L.LEPAS else 0 for r in rs]
    p = [p_kal(K, r["p_lepas"]) for r in rs]
    det = [1 if r["awal"] + r["skor"]["gbdt"][2]["np"] >= L.LEPAS else 0 for r in rs]
    tp = sum(1 for a, b in zip(det, y) if a and b)
    out = {"n": len(rs), "lepas": sum(y), "auc": G.auc(p, y), "brier": round(G.brier(p, y), 4) if rs else None,
           "brier_iklim": round(G.brier([sum(y) / max(1, len(y))] * len(y), y), 4) if rs else None,
           "tepat": tp, "presisi": round(tp / max(1, sum(det)), 3), "recall": round(tp / max(1, sum(y)), 3),
           "reliabilitas": G.reliabilitas(p, y, bins=5)}
    cak = [r for r in hasil if "mc" in r]
    for h, lbl in enumerate(("24", "48", "72")):
        dalam = [1 if r["mc"][h][0] <= r["skor"]["persistensi"][h]["no"] <= r["mc"][h][2] else 0 for r in cak]
        out[f"cakupan_p10_p90_{lbl}"] = round(sum(dalam) / max(1, len(dalam)), 3)
    return out


def reliabilitas_p1(hasil, nm):
    ps, ys = [], []
    for r in hasil:
        for kk, q, yv in r.get("p1", {}).get(nm, []):
            ps.append(q)
            ys.append(yv)
    return {"auc": round(G.auc(ps, ys), 4) if ps else None, "brier": round(G.brier(ps, ys), 5) if ps else None, "bins": G.reliabilitas(ps, ys), "n": len(ps)}


def tau_terbaik(hasil, nm):
    """Ambang deterministik yang memaksimalkan F1 mikro hari-1 pada titik awal validasi."""
    obs_total = sum(r["skor"]["persistensi"][0]["no"] for r in hasil)
    best = None
    for tau in [.01, .02, .03, .04, .05, .06, .08, .1, .12, .15, .2, .25, .3, .4, .5]:
        tp = sum(1 for r in hasil for _, q, yv in r["p1"][nm] if q >= tau and yv)
        np_ = sum(1 for r in hasil for _, q, yv in r["p1"][nm] if q >= tau)
        f = 2 * tp / max(1, np_ + obs_total)
        if best is None or f > best[1]:
            best = (tau, f)
    return best


def main():
    t0 = time.time()
    s = D["s"] = muat()
    idx = s["idx"]
    log(f"baris: latih {len(idx['latih'])}, val {len(idx['val'])}, uji {len(idx['uji'])}")
    tr = sub(idx["latih"], 8000 if CEPAT else 160000)
    D["tr_kecil"] = sub(idx["latih"], 4000 if CEPAT else 150000, seed=5)
    D["va"] = sub(idx["val"], 5000) if CEPAT else idx["val"]
    H = {"dibuat": time.strftime("%Y-%m-%d"), "baris": {k: len(v) for k, v in idx.items()},
         "positif": {k: sum(s["y"][i] for i in v) for k, v in idx.items()}}
    peramban = [f for f in FITUR_SEL]

    # 1. regresi logistik & GBDT: penyetelan di validasi
    G0 = os.path.join(MENTAH, "grid_kurva.json")
    if os.environ.get("SEBARAN_PAKAI_GRID") and os.path.exists(G0):  # hasil kisi & kurva belajar dari putaran sebelumnya (sampel sama)
        g0 = json.load(open(G0))
        H["lr_val"], H["gbdt_grid"], H["kurva_belajar"] = g0["lr_val"], g0["gbdt_grid"], g0["kurva_belajar"]
        b = min(H["gbdt_grid"], key=lambda g: g["logloss"])
        best = ({k: b[k] for k in ("logloss", "auc", "brier")}, b["dalam"], b["pohon"])
        H["gbdt_terpilih"] = {"dalam": best[1], "pohon": best[2], **best[0]}
        log("kisi & kurva belajar dipakai ulang:", H["gbdt_terpilih"])
    else:
        lr = latih_model("lr", peramban, sub(tr, 80000))
        H["lr_val"] = nilai(lr, D["va"])[0]
        log("LR val", H["lr_val"])
        H["gbdt_grid"] = []
        best = None
        for dalam in ((3,) if CEPAT else (3, 4, 5)):
            m = latih_model("gbdt", peramban, tr, pohon=40 if CEPAT else 200, dalam=dalam, lr=.1, log=log)
            for n in ((20, 40) if CEPAT else (50, 100, 150, 200)):
                v = nilai(m, D["va"], n)[0]
                H["gbdt_grid"].append({"dalam": dalam, "pohon": n, **v})
                log("GBDT", dalam, n, v)
                if best is None or v["logloss"] < best[0]["logloss"]:
                    best = (v, dalam, n)
        H["gbdt_terpilih"] = {"dalam": best[1], "pohon": best[2], **best[0]}

        # 1b. kurva belajar: panjang data latih vs skill validasi (2012-2014 belum punya cuaca, MODIS beda piksel)
        H["kurva_belajar"] = []
        for th0, th1 in ((2021, 2022), (2019, 2022), (2017, 2022), (2016, 2022), (2015, 2022)):
            ix = [i for i in idx["latih"] if th0 <= s["th"][i] <= th1]
            if len(ix) < 2000:
                continue
            m = latih_model("gbdt", peramban, sub(ix, 160000), pohon=best[2], dalam=best[1], lr=.1)
            v = nilai(m, D["va"])[0]
            H["kurva_belajar"].append({"tahun": f"{th0}-{th1}", "baris": len(ix), **v})
            log("kurva belajar", th0, th1, len(ix), v)


    # 2. ablasi: buang satu fitur / satu kelompok; tambah 'bekas' (riset saja)
    tugas = [("(semua)", peramban)] + [(f, [x for x in peramban if x != f]) for f in peramban] + \
            [(f"kelompok: {g}", [x for x in peramban if x not in fs]) for g, fs in GRUP.items()] + \
            [("+ bekas terbakar 1-3 th (375 m)", peramban + ["bekas"]), ("+ terbakar tahun lalu (375 m)", peramban + ["bekas1"]),
             ("+ tahun sejak terakhir terbakar", peramban + ["tahun_sejak"]), ("+ jarak sungai OSM", peramban + ["sungai_km"]),
             ("+ semua riset", peramban + L.RISET)]
    AB = os.path.join(MENTAH, "ablasi.json")
    ab0 = json.load(open(AB)) if os.path.exists(AB) else {}
    if os.environ.get("SEBARAN_PAKAI_ABLASI") and ab0.get("tugas") == [t[0] for t in tugas]:
        ab = ab0["hasil"]
        log("ablasi dipakai ulang")
    else:
        with CTX.Pool(3) as pool:  # 3 proses: tiap anak menyalin sampel (~1 GB) karena hitungan referensi Python; mesin 8 GB
            ab = dict(pool.map(_ablasi, tugas))
        json.dump({"tugas": [t[0] for t in tugas], "hasil": ab}, open(AB, "w"))
    dasar = ab["(semua)"]
    H["ablasi"] = [{"tanpa": k, **v, "d_logloss": round(v["logloss"] - dasar["logloss"], 5), "d_auc": round(v["auc"] - dasar["auc"], 4)} for k, v in ab.items()]
    H["ablasi"].sort(key=lambda r: -r["d_logloss"])
    # pangkas: kelompok yang bila dibuang tidak memperburuk validasi, dan fitur tunggal yang bila dibuang jelas memperbaiki.
    # (buang-satu saja menyesatkan: fitur yang saling berkorelasi saling menggantikan.)
    tak_bantu = []
    for r in H["ablasi"]:
        if r["tanpa"].startswith("kelompok: ") and r["d_logloss"] <= 0.00002:
            tak_bantu += GRUP[r["tanpa"][10:]]
        elif r["tanpa"] in peramban and r["d_logloss"] <= -0.00005:
            tak_bantu.append(r["tanpa"])
    tak_bantu = sorted(set(tak_bantu))
    log("kandidat buang:", tak_bantu)
    fitur_akhir = [f for f in peramban if f not in tak_bantu]
    cfg = dict(pohon=best[2], dalam=best[1], lr=.1)
    gb_semua = latih_model("gbdt", peramban, tr, **cfg)
    v_semua = nilai(gb_semua, D["va"])[0]
    if tak_bantu:
        gb_pangkas = latih_model("gbdt", fitur_akhir, tr, **cfg)
        v_pangkas = nilai(gb_pangkas, D["va"])[0]
    else:
        gb_pangkas, v_pangkas = gb_semua, v_semua
    H["pangkas"] = {"dibuang": tak_bantu, "val": v_pangkas, "val_semua": v_semua}
    if v_pangkas["logloss"] > v_semua["logloss"]:
        fitur_akhir, gb = peramban, gb_semua
        H["pangkas"]["keputusan"] = "dibatalkan: model terpangkas lebih buruk di validasi"
    else:
        gb = gb_pangkas
        H["pangkas"]["keputusan"] = "diterapkan"
    log("pangkas", H["pangkas"])
    H["fitur_akhir"] = fitur_akhir
    H["gbdt_val"] = nilai(gb, D["va"])[0]
    lr = latih_model("lr", fitur_akhir, sub(tr, 80000))
    H["lr_val_akhir"] = nilai(lr, D["va"])[0]
    H["lr_koef"] = {f: round(b, 4) for f, b in zip(fitur_akhir, lr["b"][1:])}
    log("GBDT akhir val", H["gbdt_val"])

    # 3. evaluasi simulasi di validasi: ambang tau
    # sampel peristiwa evaluasi dialirkan (reservoir) supaya tidak memuat ~400 rb peristiwa ke memori
    kap = {"latih": (130, 45), "val": (320, 160), "uji": (420, 210)} if not CEPAT else {"latih": (6, 2), "val": (10, 5), "uji": (10, 5)}
    res, n_lihat, rnd_r = {}, {}, random.Random(77)
    for e in L.peristiwa(semua_kecil=True):
        kk = (L.bagian(int(e["t0"][:4])), e["sel"] >= 3)
        cap = kap[kk[0]][0 if kk[1] else 1]
        n_lihat[kk] = n_lihat.get(kk, 0) + 1
        r_ = res.setdefault(kk, [])
        if len(r_) < cap:
            r_.append(e)
        else:
            j = rnd_r.randrange(n_lihat[kk])
            if j < cap:
                r_[j] = e
    evs = {b: res.get((b, True), []) + res.get((b, False), []) for b in ("latih", "val", "uji")}
    log("peristiwa eval:", {k: len(v) for k, v in evs.items()})
    modes = {"lr": lr, "gbdt": gb}
    awal_val = L.awal_eval(evs["val"], 10 if CEPAT else 300, 5 if CEPAT else 150, seed=21)
    with CTX.Pool(5) as pool:
        hv = L.jalankan_eval(awal_val, modes, {"lr": .5, "gbdt": .5}, None, 0, pool)
    tau = {nm: tau_terbaik(hv, nm) for nm in modes}
    H["tau"] = {nm: {"tau": t, "f1_mikro_hari1": round(f, 4)} for nm, (t, f) in tau.items()}
    log("tau", H["tau"])

    # 4. Sim hibrida: kisi parameter pada titik awal LATIH (bukan validasi/uji)
    awal_tr = L.awal_eval(evs["latih"], 6 if CEPAT else 120, 2 if CEPAT else 40, seed=31)
    pars = [("fbp", (ka, mg, m)) for ka in (.25, .5, 1.0) for mg in (1.0, 2.0, 4.0, 8.0) for m in (.01, .02, .03, .05, .1, .2)] + \
           [(mdl, (1, 1, m)) for mdl in L.PEMBANDING for m in (.001, .003, .01, .03, .1, .3, 1.0)]
    with CTX.Pool(5) as pool:
        rs = [r for r in pool.imap(_sim_par, [(e, ji, pars) for e, ji in awal_tr], chunksize=2) if r]
    grid = []
    for i, (mdl, par) in enumerate(pars):
        tp = sum(r[i][0] for r in rs)
        np_ = sum(r[i][1] for r in rs)
        no = sum(r[i][2] for r in rs)
        grid.append({"model": mdl, "k_angin": par[0], "m_gambut": par[1], "m": par[2], "f1_mikro": round(2 * tp / max(1, np_ + no), 4), "rasio_luas": round(np_ / max(1, no), 2)})
    grid.sort(key=lambda g: -g["f1_mikro"])
    H["hibrida_grid"] = [g for g in grid if g["model"] == "fbp"]
    H["pembanding_grid"] = [g for g in grid if g["model"] != "fbp"]
    hg = H["hibrida_grid"][0]
    par_h = (hg["k_angin"], hg["m_gambut"], hg["m"])
    fisika = {"hibrida": par_h, **{mdl: next(g["m"] for g in grid if g["model"] == mdl) for mdl in L.PEMBANDING}}
    H["fisika"] = fisika
    log("fisika terkalibrasi (latih)", fisika)
    MODEL = ["persistensi", "lr", "gbdt", "sim", "sim_kal", "hibrida"] + L.PEMBANDING

    # 5. validasi lengkap (dengan tau terpilih, Sim, hibrida)
    tau_v = {nm: t for nm, (t, _) in tau.items()}
    with CTX.Pool(5) as pool:
        hv = L.jalankan_eval(awal_val, {**modes, "sim": None}, tau_v, fisika, 20, pool)
    K = H["kal_lepas"] = kal_lepas(hv)
    pilihan = pilih_per_strata(hv, MODEL)
    H["pilihan_strata"] = pilihan
    log("model terbaik per strata (validasi):", pilihan)
    gabung(hv, pilihan)
    H["val"] = {"model": ringkas_semua(hv, MODEL + ["gabungan"]), "strata": ringkas_strata(hv, MODEL + ["gabungan"]), "arah": arah_ringkas(hv), "lepas": lepas_ringkas(hv),
                "lepas_model": lepas_model(hv, MODEL),
                "lepas_kalibrasi": lepas_ringkas(hv, K),
                "n_awal": len(hv)}
    json.dump(H, open(L.HASIL, "w"), ensure_ascii=False, indent=1)
    # 5b. kalibrasi ulang luas per strata (temuan analisis kesalahan galat.py: ramalan luas 72 jam terlalu besar, terutama di
    #     gambut): pergeseran logit per strata yang membuat bias log-luas 72 jam rata-rata ~ 0 pada titik awal VALIDASI.
    if not os.environ.get("SEBARAN_TANPA_GESER"):
        kand = [0.0, -.25, -.5, -.75, -1.0]
        bias = {}
        g_env = os.environ.get("SEBARAN_GESER_JSON")  # hasil pencarian putaran sebelumnya (validasi yang sama)
        if g_env and os.path.exists(g_env):
            bias = {st: {float(d): (v, 0) for d, v in b.items()} for st, b in json.load(open(g_env)).items()}
            kand = []
        with CTX.Pool(5) as pool:
            for dg in kand:
                g2 = {**gb, "geser": {"gambut": dg, "mineral": dg, "sabana": dg}}
                hh = L.jalankan_eval(awal_val, {"gbdt": g2}, {"gbdt": tau_v["gbdt"]}, None, 20, pool)
                for st in ("gambut", "mineral", "sabana"):
                    b = [math.log((1 + r["mc"][2][1]) / (1 + r["skor"]["persistensi"][2]["no"])) for r in hh if r["strata"] == st and r.get("mc")]
                    bias.setdefault(st, {})[dg] = (statistics.mean(b) if b else 0.0, len(b))
                log("geser", dg, {st: round(bias[st][dg][0], 3) for st in bias})
        geser = {st: min(bias[st], key=lambda d: abs(bias[st][d][0])) for st in bias}
        H["geser_logit"] = {"pilihan": geser, "bias_log_luas72": {st: {str(d): round(v[0], 3) for d, v in b.items()} for st, b in bias.items()}}
        gb["geser"] = geser
        modes["gbdt"] = gb
        with CTX.Pool(5) as pool:
            hv2 = L.jalankan_eval(awal_val, {**modes, "sim": None}, tau_v, fisika, 20, pool)
        gabung(hv2, pilihan)
        H["val_sesudah_geser"] = {"model": ringkas_semua(hv2, ["persistensi", "gbdt"]), "lepas": lepas_ringkas(hv2), "strata": ringkas_strata(hv2, ["gbdt"])}
        K = H["kal_lepas"] = kal_lepas(hv2)
        H["val_sesudah_geser"]["lepas_kalibrasi"] = lepas_ringkas(hv2, K)
        log("geser terpilih", geser, "F1 mikro 24 sebelum", H["val"]["model"]["gbdt"]["24"]["semua"]["f1_mikro"], "sesudah", H["val_sesudah_geser"]["model"]["gbdt"]["24"]["semua"]["f1_mikro"])
        json.dump(H, open(L.HASIL, "w"), ensure_ascii=False, indent=1)
    with open(os.path.join(MENTAH, "val_model.pkl"), "wb") as f:  # untuk analisis kesalahan (galat.py) tanpa menyentuh uji
        pickle.dump({"lr": lr, "gbdt": gb, "tau": tau_v, "fisika": fisika, "hv": hv, "fitur_akhir": fitur_akhir, "kal_lepas": K}, f)
    log("validasi selesai")

    if os.environ.get("SEBARAN_TANPA_UJI"):  # putaran penyetelan: berhenti sebelum uji dibuka
        log("berhenti sebelum uji (SEBARAN_TANPA_UJI)")
        return
    # 6. UJI: dibuka sekali
    awal_uji = L.awal_eval(evs["uji"], 10 if CEPAT else 400, 5 if CEPAT else 200, seed=41)
    with CTX.Pool(5) as pool:
        hu = L.jalankan_eval(awal_uji, {**modes, "sim": None}, tau_v, fisika, 20, pool)
    gabung(hu, pilihan)
    H["uji"] = {"model": ringkas_semua(hu, MODEL + ["gabungan"]), "strata": ringkas_strata(hu, MODEL + ["gabungan"]), "lepas_model": lepas_model(hu, MODEL),
                "arah": arah_ringkas(hu), "lepas_mentah": lepas_ringkas(hu), "lepas": lepas_ringkas(hu, K),
                "reliabilitas": {nm: reliabilitas_p1(hu, nm) for nm in modes}, "n_awal": len(hu),
                "per_tahun": {th: L.ringkas([r for r in hu if r["th"] == th], "gbdt", 0) for th in (2024, 2025, 2026)}}
    H["uji_auc_baris"] = {nm: nilai(m, idx["uji"])[0] for nm, m in modes.items()}
    with open(os.path.join(MENTAH, "uji_awal.pkl"), "wb") as f:
        pickle.dump({"val": hv, "uji": hu}, f)
    json.dump(H, open(L.HASIL, "w"), ensure_ascii=False, indent=1)
    log("uji selesai")

    # 7. model peramban: konfigurasi terpilih, dilatih ulang pada SEMUA tahun
    semua = sub(idx["latih"] + idx["val"] + idx["uji"], 8000 if CEPAT else 220000, seed=9)
    gb_all = latih_model("gbdt", fitur_akhir, semua, pohon=best[2], dalam=best[1], lr=.1, log=log)
    profil = profil_harian()
    json.dump({"versi": 1, "dibuat": time.strftime("%Y-%m-%d"), "jenis": "gbdt-logistik", "fitur": fitur_akhir, "bias": round(gb_all["bias"], 6),
               "pohon": gb_all["pohon"], "tau": tau_v["gbdt"], "R": L.R, "sel_m": 375, "ha_sel": 14.0625, "lepas_sel": L.LEPAS,
               "profil_lintasan": profil, "iklim": iklim_terakhir(), "frp_bawaan": frp_bawaan(), "kal_lepas": K, "geser_logit": gb.get("geser"), "pilihan_strata": pilihan,
               "kinerja_uji": {"f1_24": H["uji"]["model"]["gbdt"]["24"]["semua"]["f1"], "iou_24": H["uji"]["model"]["gbdt"]["24"]["semua"]["iou"],
                               "arah_24": H["uji"]["arah"]["gbdt"], "lepas_auc": H["uji"]["lepas"]["auc"]},
               "catatan": "Dilatih pada sampel sel calon VIIRS S-NPP 2015-2026 (9 provinsi, Jul-Nov) dengan konfigurasi yang dipilih di validasi 2023; "
                          "angka kinerja dari model 2015-2022 pada uji 2024-2026. Lihat scripts/sebaran/RISET-SEBARAN.md."},
              open(os.path.join(PUBLIK, "model_sebaran.json"), "w"), separators=(",", ":"))
    H["waktu_menit"] = round((time.time() - t0) / 60, 1)
    json.dump(H, open(L.HASIL, "w"), ensure_ascii=False, indent=1)
    log("selesai", H["waktu_menit"], "menit")


def frp_bawaan():
    """Median FRP maks lintasan pertama peristiwa 9 provinsi (dipakai peramban bila FRP titik tidak diketahui)."""
    import statistics
    xs = [max(f for t, _, f in e["det"] if t == e["det"][0][0]) for e in L.peristiwa()]
    return round(statistics.median(xs), 2) if xs else 8.0


def iklim_terakhir(bulan=36):
    """ONI/DMI 36 bulan terakhir untuk peramban (fitur oni/dmi; bulan yang belum terbit memakai bulan terakhir)."""
    e = json.load(open(os.path.join(MENTAH, "enso.json")))
    return {k: dict(sorted(e[k].items())[-bulan:]) for k in ("oni", "dmi")}


def profil_harian():
    """Porsi sel baru per lintasan siang/malam (resolusi waktu tertinggi VIIRS S-NPP)."""
    siang = malam = 0
    from umum import muat_viirs
    v = muat_viirs()
    for dn in v["dn"]:
        if dn:
            siang += 1
        else:
            malam += 1
    return {"siang": round(siang / (siang + malam), 3), "malam": round(malam / (siang + malam), 3)}


if __name__ == "__main__":
    main()
