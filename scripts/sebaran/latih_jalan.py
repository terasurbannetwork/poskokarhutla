"""Tahap 'latih' dari latih.py: penyetelan di validasi 2023, ablasi, Sim hibrida, satu kali uji 2024-2026, ekspor.

Keluaran: data/raw/sebaran/hasil.json (semua angka), public/data/model_sebaran.json (model peramban),
          data/raw/sebaran/uji_awal.pkl (hasil per titik awal uji, dipakai kasus.py & RISET-SEBARAN.md).
"""
import json, math, multiprocessing as mp, os, pickle, random, sys, time

import gbdt as G
import latih as L
from fitur import FITUR_SEL
from umum import MENTAH, PUBLIK, bootstrap

CTX = mp.get_context("fork")  # data latih dibagi ke proses anak tanpa salin (copy-on-write)
D = {}
GRUP = {
    "angin": ["searah", "angin_searah", "ws", "ws_maks"],
    "kekeringan & FWI": ["rh_min", "t_maks", "hujan24", "hujan72", "hari_kering", "ffmc", "dmc", "dc", "bui", "isi_maks", "fwi"],
    "keadaan api": ["log_luas", "log_baru24", "umur_jam", "aktif24", "tetangga8"],
    "lahan & gambut": ["gambut", "hutan", "semak", "kebun"],
    "akses manusia": ["kanal_km", "jalan_km", "desa_km"],
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
    m = latih_model("gbdt", fitur, D["tr_kecil"], pohon=60, dalam=3, lr=.15)
    return nama, nilai(m, D["va"])[0]


def _sim_par(arg):
    e, ji, pars = arg
    k = L.ktx()
    S = L.seri_untuk(e)
    p, tb, ak, b24, _, _ = L.jangkar(e)[ji]
    if not S or not S.cukup(p, 96):
        return None
    out = []
    for par in pars:
        P, _ = L.ramal_sim(e, p, tb, ak, S, k, par=par)
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


def arah_ringkas(hasil):
    out = {"angin_bawah": bootstrap([r.get("arah_angin_err") for r in hasil if "arah_angin_err" in r]),
           "arah_kemarin": bootstrap([r.get("arah_kemarin_err") for r in hasil if "arah_kemarin_err" in r])}
    for nm in ("lr", "gbdt", "sim", "sim_kal", "hibrida"):
        out[nm] = bootstrap([r["skor"][nm][0]["arah"] for r in hasil if nm in r["skor"] and r["skor"][nm][0]["arah"] is not None])
    # perbandingan berpasangan pada kasus yang sama
    sama = [r for r in hasil if "arah_angin_err" in r and r["skor"].get("gbdt", [{}])[0].get("arah") is not None]
    out["pasangan_gbdt_vs_angin"] = bootstrap([r["skor"]["gbdt"][0]["arah"] - r["arah_angin_err"] for r in sama])
    return out


def lepas_ringkas(hasil):
    rs = [r for r in hasil if r["ji"] == 0 and "p_lepas" in r]
    y = [1 if r["akhir72"] >= L.LEPAS else 0 for r in rs]
    p = [r["p_lepas"] for r in rs]
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
    for tau in [x / 100 for x in range(10, 80, 5)]:
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
    D["tr_kecil"] = sub(idx["latih"], 4000 if CEPAT else 70000, seed=5)
    D["va"] = sub(idx["val"], 5000) if CEPAT else idx["val"]
    H = {"dibuat": time.strftime("%Y-%m-%d"), "baris": {k: len(v) for k, v in idx.items()},
         "positif": {k: sum(s["y"][i] for i in v) for k, v in idx.items()}}
    peramban = [f for f in FITUR_SEL]

    # 1. regresi logistik & GBDT: penyetelan di validasi
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

    # 2. ablasi: buang satu fitur / satu kelompok; tambah 'bekas' (riset saja)
    tugas = [("(semua)", peramban)] + [(f, [x for x in peramban if x != f]) for f in peramban] + \
            [(f"kelompok: {g}", [x for x in peramban if x not in fs]) for g, fs in GRUP.items()] + [("+ bekas terbakar 1-3 th (375 m)", peramban + ["bekas"])]
    with CTX.Pool(5) as pool:
        ab = dict(pool.map(_ablasi, tugas))
    dasar = ab["(semua)"]
    H["ablasi"] = [{"tanpa": k, **v, "d_logloss": round(v["logloss"] - dasar["logloss"], 5), "d_auc": round(v["auc"] - dasar["auc"], 4)} for k, v in ab.items()]
    H["ablasi"].sort(key=lambda r: -r["d_logloss"])
    tak_bantu = [r["tanpa"] for r in H["ablasi"] if r["tanpa"] in peramban and r["d_logloss"] <= 0.0001]
    log("tak membantu di validasi:", tak_bantu)
    fitur_akhir = [f for f in peramban if f not in tak_bantu]
    m_pangkas = latih_model("gbdt", fitur_akhir, D["tr_kecil"], pohon=60, dalam=3, lr=.15)
    v_pangkas = nilai(m_pangkas, D["va"])[0]
    H["pangkas"] = {"dibuang": tak_bantu, "val": v_pangkas, "val_semua": dasar}
    if v_pangkas["logloss"] > dasar["logloss"] + 0.0002:
        fitur_akhir = peramban
        H["pangkas"]["keputusan"] = "dibatalkan: gabungan pembuangan memperburuk validasi"
    else:
        H["pangkas"]["keputusan"] = "diterapkan"
    H["fitur_akhir"] = fitur_akhir
    gb = latih_model("gbdt", fitur_akhir, tr, pohon=best[2], dalam=best[1], lr=.1, log=log)
    H["gbdt_val"] = nilai(gb, D["va"])[0]
    lr = latih_model("lr", fitur_akhir, sub(tr, 80000))
    H["lr_val_akhir"] = nilai(lr, D["va"])[0]
    H["lr_koef"] = {f: round(b, 4) for f, b in zip(fitur_akhir, lr["b"][1:])}
    log("GBDT akhir val", H["gbdt_val"])

    # 3. evaluasi simulasi di validasi: ambang tau
    evs = {"latih": [], "val": [], "uji": []}
    for e in L.peristiwa(semua_kecil=True):
        evs[L.bagian(int(e["t0"][:4]))].append(e)
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
    pars = [(ka, mg, m) for ka in (.5, 1.0) for mg in (.5, 1.0, 2.0) for m in (.01, .02, .05, .1, .2, .5, 1.0)]
    with CTX.Pool(5) as pool:
        rs = [r for r in pool.imap(_sim_par, [(e, ji, pars) for e, ji in awal_tr], chunksize=2) if r]
    grid = []
    for i, par in enumerate(pars):
        tp = sum(r[i][0] for r in rs)
        np_ = sum(r[i][1] for r in rs)
        no = sum(r[i][2] for r in rs)
        grid.append({"k_angin": par[0], "m_gambut": par[1], "m": par[2], "f1_mikro": round(2 * tp / max(1, np_ + no), 4), "rasio_luas": round(np_ / max(1, no), 2)})
    grid.sort(key=lambda g: -g["f1_mikro"])
    H["hibrida_grid"] = grid
    par_h = (grid[0]["k_angin"], grid[0]["m_gambut"], grid[0]["m"])
    log("hibrida", grid[0])

    # 5. validasi lengkap (dengan tau terpilih, Sim, hibrida)
    tau_v = {nm: t for nm, (t, _) in tau.items()}
    with CTX.Pool(5) as pool:
        hv = L.jalankan_eval(awal_val, {**modes, "sim": None}, tau_v, par_h, 20, pool)
    H["val"] = {"model": ringkas_semua(hv, ["persistensi", "lr", "gbdt", "sim", "sim_kal", "hibrida"]), "arah": arah_ringkas(hv), "lepas": lepas_ringkas(hv),
                "n_awal": len(hv)}
    json.dump(H, open(L.HASIL, "w"), ensure_ascii=False, indent=1)
    log("validasi selesai")

    # 6. UJI: dibuka sekali
    awal_uji = L.awal_eval(evs["uji"], 10 if CEPAT else 400, 5 if CEPAT else 200, seed=41)
    with CTX.Pool(5) as pool:
        hu = L.jalankan_eval(awal_uji, {**modes, "sim": None}, tau_v, par_h, 20, pool)
    H["uji"] = {"model": ringkas_semua(hu, ["persistensi", "lr", "gbdt", "sim", "sim_kal", "hibrida"]), "arah": arah_ringkas(hu), "lepas": lepas_ringkas(hu),
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
               "profil_lintasan": profil,
               "kinerja_uji": {"f1_24": H["uji"]["model"]["gbdt"]["24"]["semua"]["f1"], "iou_24": H["uji"]["model"]["gbdt"]["24"]["semua"]["iou"],
                               "arah_24": H["uji"]["arah"]["gbdt"], "lepas_auc": H["uji"]["lepas"]["auc"]},
               "catatan": "Dilatih pada sampel sel calon VIIRS S-NPP 2015-2026 (9 provinsi, Jul-Nov) dengan konfigurasi yang dipilih di validasi 2023; "
                          "angka kinerja dari model 2015-2022 pada uji 2024-2026. Lihat scripts/sebaran/RISET-SEBARAN.md."},
              open(os.path.join(PUBLIK, "model_sebaran.json"), "w"), separators=(",", ":"))
    H["waktu_menit"] = round((time.time() - t0) / 60, 1)
    json.dump(H, open(L.HASIL, "w"), ensure_ascii=False, indent=1)
    log("selesai", H["waktu_menit"], "menit")


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
