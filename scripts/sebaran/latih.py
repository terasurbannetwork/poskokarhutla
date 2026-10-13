"""Latih & uji model penjalaran sel 375 m; bandingkan dengan persistensi, Sim fisika (port), Sim hibrida.

Pembagian: latih 2015-2022, validasi 2023 (SEMUA penyetelan di sini), uji 2024-2026 (dibuka sekali, di akhir).
Tahap:
  bangun  -> data/raw/sebaran/sampel.pkl   baris (sel calon x jangkar) dengan bobot sampling
  latih   -> data/raw/sebaran/hasil.json, public/data/model_sebaran.json
Model akhir untuk peramban dilatih ulang dengan konfigurasi terpilih pada 2015-2026 (dinyatakan di berkas model).

Pakai:  python3 scripts/sebaran/latih.py bangun | latih | uji
"""
import json, math, multiprocessing as mp, os, pickle, random, sys, time, zlib
from array import array

DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, DIR)
import cuaca  # noqa: E402
import gbdt as G  # noqa: E402
import simfisika as SF  # noqa: E402
from fitur import (FITUR_SEL, R, Konteks, Seri, baris_sel, calon, fitur_peristiwa, jangkar)  # noqa: E402
from umum import (HA_SEL, MENTAH, PUBLIK, PRIORITAS, arah, bootstrap, ij, pusat, selisih_sudut)  # noqa: E402

RISET = ["bekas", "bekas1", "tahun_sejak", "sungai_km"]  # riset saja: tidak tersedia di peramban
KOLOM = FITUR_SEL + RISET
SAMPEL = os.path.join(MENTAH, "sampel.pkl")
HASIL = os.path.join(MENTAH, "hasil.json")
LEPAS = 10  # sel (~140 ha) dalam 72 jam = "lolos/membesar"
P_BESAR, P_KECIL = .15, .04  # peluang ikut sampel latih: peristiwa >= 3 sel / 1-2 sel
JANGKAR_MAKS = 3
POS_MAKS, NEG_MAKS = 20, 20


def log(*a):
    print(time.strftime("%H:%M:%S"), *a, file=sys.stderr, flush=True)


def bagian(th):
    return "latih" if th <= 2022 else "val" if th == 2023 else "uji"


# ---------------- konteks per proses ----------------
_ktx = None
_seri = {}


def ktx():
    global _ktx
    if _ktx is None:
        _ktx = Konteks()
    return _ktx


def seri_untuk(e):
    th = int(e["t0"][:4])
    k = (th, *cuaca.sel05(e["lat0"], e["lon0"]))
    if k not in _seri:
        d = cuaca.seri(th, e["lat0"], e["lon0"])
        if len(_seri) > 80:
            _seri.pop(next(iter(_seri)))
        _seri[k] = Seri(d) if d else None
    return _seri[k]


def peristiwa(semua_kecil=False):
    """Peristiwa 9 provinsi, Jul-Nov, yang punya berkas cuaca. Kecil (1-2 sel) disaring di sini supaya memori cukup."""
    ada = set(os.listdir(cuaca.CUACA))
    rnd = random.Random(11)
    for l in open(os.path.join(MENTAH, "peristiwa.jsonl")):
        if '"prov":"' not in l:
            continue
        e = json.loads(l)
        if e["prov"] not in PRIORITAS or e["t0"][5:7] not in cuaca.BULAN:
            continue
        th = int(e["t0"][:4])
        if os.path.basename(cuaca.nama(th, *cuaca.sel05(e["lat0"], e["lon0"]))) not in ada:
            continue
        if e["sel"] < 3 and not semua_kecil and rnd.random() > .25:
            continue
        yield e


# ---------------- keadaan & vektor fitur ----------------
def frp_terakhir(e, p):
    """FRP maks (MW) deteksi di (p - 24 jam, p]: hanya yang sudah terlihat pada jangkar."""
    return max([f for t, _, f in e["det"] if p - 1440 < t <= p] or [0.0])


def keadaan(e, p, terbakar, aktif, baru24n, S, k, frp=None):
    lon = e["lon0"]
    w = S.jendela(p)
    oni, dmi = k.iklim(p)
    jam_lokal = ((p + lon * 4) / 60) % 24
    ev = fitur_peristiwa(terbakar, aktif, (p - e["det"][0][0]) / 60, baru24n, oni, dmi, 0 if 6 <= jam_lokal < 18 else 1,
                         frp_terakhir(e, p) if frp is None else frp)
    return w, ev, calon(terbakar, aktif)


def vektor(kk, info, terbakar, aktif, w, ev, k, prov, tahun):
    d = baris_sel(kk, info, terbakar, aktif, w, ev, k, prov, tahun)
    d["bekas"] = k.bekas_lalu(kk, tahun)
    d["bekas1"], d["tahun_sejak"] = k.riwayat_sel(kk, tahun)
    d["sungai_km"] = k.sungai_km(kk)
    return array("d", (d[x] for x in KOLOM))


def baru_terakhir(e, p):
    """Jumlah sel yang PERTAMA kali terdeteksi di (p - 24 jam, p]."""
    pertama = {}
    for t, kk, _ in e["det"]:
        if t > p:
            break
        pertama.setdefault(kk, t)
    return sum(1 for t in pertama.values() if t > p - 1440)


# ---------------- bangun sampel ----------------
def baris_peristiwa(e):
    k = ktx()
    S = seri_untuk(e)
    if S is None:
        return []
    rnd = random.Random(zlib.crc32(e["id"].encode()))
    besar = e["sel"] >= 3
    if rnd.random() > (P_BESAR if besar else P_KECIL / .25):
        return []
    wE = 1 / P_BESAR if besar else 1 / P_KECIL
    js = [j for j in jangkar(e) if S.cukup(j[0], 24)]
    if not js:
        return []
    pilih = [js[0]] + rnd.sample(js[1:], min(JANGKAR_MAKS - 1, len(js) - 1))
    wJ = wE * len(js) / len(pilih)
    th = int(e["t0"][:4])
    out = []
    for p, tb, ak, b24, _, _ in pilih:
        w, ev, c = keadaan(e, p, tb, ak, baru_terakhir(e, p), S, k)
        pos = [kk for kk in c if kk in b24]
        neg = [kk for kk in c if kk not in b24]
        ps = rnd.sample(pos, min(POS_MAKS, len(pos)))
        ns = rnd.sample(neg, min(NEG_MAKS, len(neg)))
        for daf, n_all, yv in ((ps, len(pos), 1), (ns, len(neg), 0)):
            if not daf:
                continue
            wr = wJ * n_all / len(daf)
            for kk in daf:
                out.append((vektor(kk, c[kk], tb, ak, w, ev, k, e["prov"], th), yv, wr, th, e["id"]))
    return out


def bangun():
    t0 = time.time()
    evs = list(peristiwa())
    log(f"{len(evs)} peristiwa berkas-cuaca (kecil sudah disaring 25%)")
    X, y, w, th, eid = [], array("b"), array("d"), array("h"), []
    with mp.Pool(5) as pool:
        for no, rows in enumerate(pool.imap_unordered(baris_peristiwa, evs, chunksize=50)):
            for r in rows:
                X.append(r[0]); y.append(r[1]); w.append(r[2]); th.append(r[3]); eid.append(r[4])
            if no % 20000 == 0:
                log(f"  {no}/{len(evs)} peristiwa, {len(X)} baris")
    with open(SAMPEL, "wb") as f:
        pickle.dump({"kolom": KOLOM, "X": X, "y": y, "w": w, "th": th, "eid": eid}, f, protocol=pickle.HIGHEST_PROTOCOL)
    log(f"{len(X)} baris, positif {sum(y)}; {time.time() - t0:.0f} dtk")


# ---------------- peramalan ----------------
def fungsi_model(mdl, kolom):
    """-> f(vektor KOLOM) -> p. mdl {jenis, fitur, ...}."""
    idx = [kolom.index(f) for f in mdl["fitur"]]
    if mdl["jenis"] == "gbdt":
        return lambda x: G.prediksi_gbdt(mdl, [x[i] for i in idx])
    return lambda x: G.prediksi_lr(mdl, [x[i] for i in idx])


def ramal_sel(f, e, p, terbakar, aktif, S, k, tau, hari=3, mc=0, seed=0):
    """Ramalan model sel. Deterministik (p >= tau) dan/atau Monte Carlo.
    -> {"det": [set baru kumulatif per hari], "harap": [jumlah sel harapan per hari], "p1": {sel: p hari-1},
        "mc": [[luas sel run per hari]...], "frek": {sel: [hari-1, hari-2, hari-3 frekuensi]}}"""
    th = int(e["t0"][:4])
    out = {"det": [], "harap": [], "p1": {}, "mc": [], "frek": {}}

    def jalan(acak):
        tb, ak, baru, hasil, harap = set(terbakar), dict(aktif), set(), [], []
        b24 = baru_terakhir(e, p)
        frp0 = frp_terakhir(e, p)  # dibekukan pada jangkar: deteksi sesudah p tidak boleh dipakai
        for d in range(hari):
            t = p + d * 1440
            w, ev, c = keadaan(e, t, tb | baru, ak, b24, S, k, frp=frp0)
            keys = list(c)
            ps = [f(vektor(kk, c[kk], tb | baru, ak, w, ev, k, e["prov"], th)) for kk in keys]
            if d == 0 and not acak:
                out["p1"] = dict(zip(keys, ps))
            nb = {kk for kk, q in zip(keys, ps) if (acak.random() < q if acak else q >= tau)}
            harap.append(sum(ps))
            baru |= nb
            if nb:
                ak = {kk: t + 1440 for kk in nb}
            b24 = len(nb)
            hasil.append(set(baru))
        return hasil, harap

    hasil, harap = jalan(None)
    out["det"], out["harap"] = hasil, harap
    rnd = random.Random(seed)
    for _ in range(mc):
        h, _ = jalan(rnd)
        out["mc"].append([len(x) for x in h])
        for d, x in enumerate(h):
            for kk in x:
                out["frek"].setdefault(kk, [0] * hari)[d] += 1
    return out


def fuel_fn(k, prov):
    idx = {nm: i + 1 for i, nm in enumerate(SF.FUEL)}
    return (lambda kk: idx[k.sel(kk, prov)["kelas"]]), (lambda kk: k.sel(kk, prov)["gambut"])


def ramal_sim(e, p, terbakar, aktif, S, k, par=None, kal=False, det=None):
    """Sim fisika dari sel aktif. par = (k_angin, m_gambut, m). kal = pakai kalibrasi() Sim asli.
    -> ([set baru kumulatif 24/48/72], info)"""
    i0 = S.jam(p)
    Fh, dmc, dc, bui, fw = S.kode(i0)
    W = SF.cuaca_sim(S, i0, Fh)
    k_angin, m_gambut, m = par or (1.0, 1.0, 1.0)
    tab = SF.tabel_laju(W, bui, k_angin, m_gambut)
    fuel, gb = fuel_fn(k, e["prov"])
    benih = list(aktif)
    info = {"m": m}
    if kal:
        tujuh = {kk for t, kk, _ in det if p - 7 * 1440 < t <= p}
        hari = len({(t + e["lon0"] * 4 - 360) // 1440 for t, kk, _ in det if p - 7 * 1440 < t <= p})
        luas = len(tujuh) * HA_SEL
        if hari >= 2 and luas >= 100:
            m = SF.kalibrasi(benih, fuel, gb, tab, W["hujan"], luas / hari)
            info = {"m": m, "target": luas / hari}
        else:
            info = {"m": 1.0, "tanpa": True}
            m = 1.0
    T = SF.sebar(benih, fuel, gb, tab, W["hujan"], m, tmax=72)
    return [{kk for kk, t in T.items() if t <= h and kk not in terbakar} for h in (24, 48, 72)], info


# ---------------- metrik per awal ----------------
def pusat_set(s):
    xs = [pusat(k) for k in s]
    return sum(x for x, _ in xs) / len(xs), sum(y for _, y in xs) / len(xs)


def skor(S0, P, O):
    """S0 keadaan awal, P ramalan sel baru, O teramati sel baru."""
    tp = len(P & O)
    f1 = 1.0 if not P and not O else 2 * tp / (len(P) + len(O))
    u_p, u_o = S0 | P, S0 | O
    iou = len(u_p & u_o) / len(u_p | u_o)
    arah_err = None
    if len(O) >= 2 and P:
        c0 = pusat_set(S0)
        ao, ap = arah(*c0, *pusat_set(O)), arah(*c0, *pusat_set(P))
        arah_err = selisih_sudut(ao, ap)
    return {"f1": f1, "iou": iou, "tp": tp, "np": len(P), "no": len(O), "arah": arah_err,
            "log_luas": math.log((1 + len(P)) / (1 + len(O)))}


def evaluasi_awal(arg):
    """Satu titik awal (peristiwa, indeks jangkar) -> skor semua model pada 24/48/72 jam."""
    e, ji, modes, tau, par_hibrida, mc = arg
    k = ktx()
    S = seri_untuk(e)
    js = jangkar(e)
    p, tb, ak, b24, b48, b72 = js[ji]
    if not S or not S.cukup(p, 72 + 24):
        return None
    obs = [b24, b48, b72]
    hasil = {"id": e["id"], "th": int(e["t0"][:4]), "prov": e["prov"], "ji": ji, "awal": len(tb), "akhir72": len(tb | b72),
             "gambut": k.sel(next(iter(tb)), e["prov"])["gambut"], "skor": {}}
    w = S.jendela(p)
    hasil["angin_ke"], hasil["ws"] = round(w["ke"]), round(w["ws"], 1)
    hasil["skor"]["persistensi"] = [skor(tb, set(), o) for o in obs]
    # arah angin (bawah angin) & arah kemarin sebagai peramal arah saja
    if len(b24) >= 2:
        c0 = pusat_set(tb)
        ao = arah(*c0, *pusat_set(b24))
        hasil["arah_obs"] = round(ao)
        hasil["arah_angin_err"] = selisih_sudut(ao, w["ke"])
        lalu = {kk for t, kk, _ in e["det"] if p - 1440 < t <= p}
        sblm = {kk for t, kk, _ in e["det"] if t <= p - 1440}
        if sblm and lalu - sblm:
            hasil["arah_kemarin_err"] = selisih_sudut(ao, arah(*pusat_set(sblm), *pusat_set(lalu - sblm)))
    for nm, mdl in modes.items():
        if mdl is None:
            continue
        f = fungsi_model(mdl, KOLOM)
        r = ramal_sel(f, e, p, tb, ak, S, k, tau[nm], mc=mc if nm == "gbdt" else 0, seed=zlib.crc32(e["id"].encode()) & 0xffff)
        hasil["skor"][nm] = [skor(tb, P, o) for P, o in zip(r["det"], obs)]
        hasil.setdefault("harap", {})[nm] = [round(x, 2) for x in r["harap"]]
        if nm == "gbdt" and mc:
            q = lambda xs, a: sorted(xs)[min(len(xs) - 1, int(a * len(xs)))]
            hasil["mc"] = [[q([m[d] for m in r["mc"]], .1), q([m[d] for m in r["mc"]], .5), q([m[d] for m in r["mc"]], .9)] for d in range(3)]
            hasil["p_lepas"] = sum(1 for m in r["mc"] if len(tb) + m[2] >= LEPAS) / len(r["mc"])
        hasil.setdefault("p1", {})[nm] = [(kk, round(q, 4), 1 if kk in b24 else 0) for kk, q in r["p1"].items()]
        if nm == "gbdt":
            hasil["frek"] = {kk: v for kk, v in r["frek"].items()}
            hasil["det_pred"] = [sorted(x) for x in r["det"]]
    if "sim" in modes or par_hibrida is not None:
        P, _ = ramal_sim(e, p, tb, ak, S, k)
        hasil["skor"]["sim"] = [skor(tb, x, o) for x, o in zip(P, obs)]
        P, info = ramal_sim(e, p, tb, ak, S, k, kal=True, det=e["det"])
        if not info.get("tanpa"):
            hasil["skor"]["sim_kal"] = [skor(tb, x, o) for x, o in zip(P, obs)]
        if par_hibrida:
            P, _ = ramal_sim(e, p, tb, ak, S, k, par=par_hibrida)
            hasil["skor"]["hibrida"] = [skor(tb, x, o) for x, o in zip(P, obs)]
    return hasil


def awal_eval(evs, n_besar, n_kecil, seed):
    """Titik awal evaluasi: deteksi pertama (seperti kasus baru) + satu jangkar tengah acak per peristiwa besar."""
    rnd = random.Random(seed)
    besar = [e for e in evs if e["sel"] >= 3]
    kecil = [e for e in evs if e["sel"] < 3]
    pilih = rnd.sample(besar, min(n_besar, len(besar))) + rnd.sample(kecil, min(n_kecil, len(kecil)))
    out = []
    for e in pilih:
        out.append((e, 0))
        n = len({d[0] for d in e["det"]})
        if e["sel"] >= 3 and n > 2:
            out.append((e, rnd.randrange(1, n - 1)))
    return out


# ---------------- ringkasan ----------------
def ringkas(hasil, model, h, saring=None):
    rs = [r for r in hasil if r and model in r["skor"] and (saring is None or saring(r))]
    s = [r["skor"][model][h] for r in rs]
    if not s:
        return None
    tp = sum(x["tp"] for x in s)
    npred = sum(x["np"] for x in s)
    nobs = sum(x["no"] for x in s)
    return {"n": len(s), "f1_mikro": round(2 * tp / max(1, npred + nobs), 4),
            "f1": bootstrap([x["f1"] for x in s]), "iou": bootstrap([x["iou"] for x in s]),
            "arah": bootstrap([x["arah"] for x in s]), "abs_log_luas": bootstrap([abs(x["log_luas"]) for x in s]),
            "bias_log_luas": round(sum(x["log_luas"] for x in s) / len(s), 3)}


def jalankan_eval(awal, modes, tau, par, mc=0, pool=None):
    args = [(e, ji, modes, tau, par, mc) for e, ji in awal]
    return [r for r in pool.imap(evaluasi_awal, args, chunksize=4) if r]


if __name__ == "__main__":
    if sys.argv[1:] == ["bangun"]:
        bangun()
    elif sys.argv[1:] == ["latih"]:
        import latih_jalan
        latih_jalan.main()
    elif sys.argv[1:] == ["uji"]:
        o = skor({1}, set(), set())
        assert o["f1"] == 1 and o["iou"] == 1
        o = skor({1}, {2, 3}, {3, 4})
        assert o["tp"] == 1 and abs(o["f1"] - .5) < 1e-9 and abs(o["iou"] - 2 / 4) < 1e-9
        assert bagian(2022) == "latih" and bagian(2023) == "val" and bagian(2024) == "uji" and bagian(2026) == "uji"
        print("ok")
