"""Pustaka uji-balik (hindcast) >= 100 kejadian lalu -> public/data/sebaran_kasus.json (+ ringkasan di hasil.json)

Aturan tanpa bocoran: tiap kasus dimulai dari DETEKSI PERTAMA saja (sel lintasan pertama), dengan cuaca reanalisis untuk
tanggal itu (= anggapan prakiraan sempurna; prakiraan sungguhan lebih buruk) dan model yang TIDAK pernah melihat tahun kasus:
  kasus 2015-2022 -> model lipat (dilatih pada tahun latih lain: {2015}, {2016-2018}, {2019}, {2020-2022} ditahan)
  kasus 2023      -> model 2015-2022 (2023 = tahun validasi: hiperparameter disetel di sini, dicatat)
  kasus 2024-2026 -> model 2015-2022 (uji murni)
Ramalan 24/48/72 jam dibandingkan dengan sel yang benar-benar terdeteksi VIIRS. 'Lolos' = >= 10 sel dalam 72 jam.

Pilihan kasus berlapis: tiap tahun yang punya cuaca, 9 provinsi bergiliran, gambut & mineral, tiga kelas ukuran
(besar >= 1.000 ha akhir, sedang 100-1.000 ha, kecil = tetap < 10 sel dalam 72 jam). Kasus besar = peristiwa terbesar
tahun-provinsi itu (yang paling banyak diberitakan).

Pakai:  python3 scripts/sebaran/kasus.py   |  ... uji
"""
import json, math, multiprocessing as mp, os, pickle, random, sys, time

DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, DIR)
import latih as L  # noqa: E402
import latih_jalan as LJ  # noqa: E402
from umum import MENTAH, PUBLIK, PROVINSI, PRIORITAS, HA_SEL, bootstrap, pusat  # noqa: E402

LIPAT = {2015: (2015,), 2016: (2016, 2017, 2018), 2017: (2016, 2017, 2018), 2018: (2016, 2017, 2018), 2019: (2019,),
         2020: (2020, 2021, 2022), 2021: (2020, 2021, 2022), 2022: (2020, 2021, 2022)}
MODEL_LIPAT = os.path.join(MENTAH, "model_lipat.pkl")
N_TARGET = 120


def pilih_kasus(evs):
    rnd = random.Random(2026)
    per = {}
    for e in evs:
        n72 = len({d[1] for d in e["det"] if d[0] <= e["det"][0][0] + 72 * 60})
        if e["ha"] >= 1000:
            kel = "besar"
        elif e["ha"] >= 100 and e["sel"] >= 8:
            kel = "sedang"
        elif n72 < L.LEPAS and e["sel"] <= 3:
            kel = "kecil"
        else:
            continue
        per.setdefault((int(e["t0"][:4]), kel), []).append(e)
    tahun = sorted({k[0] for k in per})
    kuota = {"besar": 4, "sedang": 3, "kecil": 3}
    pilih, dipakai = [], set()
    for putaran in range(30):  # putaran berikut menambah satu per kelas sampai >= N_TARGET atau habis
        for th in tahun:
            for kel, q in kuota.items():
                daf = per.get((th, kel), [])
                if kel == "besar":
                    daf = sorted(daf, key=lambda e: -e["ha"])
                else:
                    daf = daf[:]
                    rnd.shuffle(daf)
                prov_ada = {e["prov"] for e in pilih if int(e["t0"][:4]) == th}
                daf.sort(key=lambda e: e["prov"] in prov_ada)  # provinsi yang belum terwakili dulu (stabil)
                n = 0
                for e in daf:
                    if e["id"] in dipakai:
                        continue
                    if n >= (q if putaran == 0 else 1):
                        break
                    pilih.append(e)
                    dipakai.add(e["id"])
                    n += 1
        if len(pilih) >= N_TARGET:
            break
    return pilih


def latih_lipat(H):
    if os.path.exists(MODEL_LIPAT):
        return pickle.load(open(MODEL_LIPAT, "rb"))
    LJ.D["s"] = s = LJ.muat()
    fitur = H["fitur_akhir"]
    cfg = H["gbdt_terpilih"]
    M = {}
    for grup in sorted(set(LIPAT.values())):
        idx = [i for i in s["idx"]["latih"] if s["th"][i] not in grup]
        L.log(f"model lipat tanpa {grup}: {len(idx)} baris")
        M[grup] = LJ.latih_model("gbdt", fitur, LJ.sub(idx, 120000), pohon=cfg["pohon"], dalam=cfg["dalam"], lr=.1)
    M["utama"] = LJ.latih_model("gbdt", fitur, LJ.sub(s["idx"]["latih"], 160000), pohon=cfg["pohon"], dalam=cfg["dalam"], lr=.1)
    pickle.dump(M, open(MODEL_LIPAT, "wb"))
    return M


def _satu(arg):
    e, mdl, tau, fisika = arg
    r = L.evaluasi_awal((e, 0, {"gbdt": mdl}, {"gbdt": tau}, fisika, 40))
    if not r:
        return None
    p, tb, ak, b24, b48, b72 = L.jangkar(e)[0]
    S = L.seri_untuk(e)
    w = S.jendela(p)
    k = L.ktx()
    P = [set(x) for x in r.pop("pred_hibrida")]
    r["kasus"] = {"t0": e["t0"], "lon0": e["lon0"], "lat0": e["lat0"], "ha_akhir": e["ha"], "hari_aktif": len(e["hari"]),
                  "awal": sorted(tb), "obs": [sorted(b24), sorted(b48 - b24), sorted(b72 - b48)],
                  "frek": {kk: v for kk, v in r.pop("frek", {}).items() if max(v) >= 4},  # >= 10% dari 40 run
                  "hibrida": [sorted(P[0]), sorted(P[1] - P[0]), sorted(P[2] - P[1])],
                  "cuaca": {"ws": round(w["ws"], 1), "ke": round(w["ke"]), "rh_min": round(w["rh_min"]), "hujan24": round(w["hujan24"], 1),
                            "ffmc": round(w["ffmc"], 1), "dc": round(w["dc"]), "fwi": round(w["fwi"], 1), "hari_kering": w["hari_kering"]}}
    r.pop("p1", None)
    r.pop("det_pred", None)
    return r


def main():
    H = json.load(open(L.HASIL))
    M = latih_lipat(H)
    geser = (H.get("geser_logit") or {}).get("pilihan")
    for m_ in M.values():
        m_["geser"] = geser  # kalibrasi ulang per strata yang sama dengan model utama (disetel di validasi)
    tau = H["tau"]["gbdt"]["tau"]
    fisika = {**{k: tuple(v) if isinstance(v, list) else v for k, v in H["fisika"].items()}, **{f"{m}_mentah": 1.0 for m in L.PEMBANDING}}
    evs = [e for e in L.peristiwa(semua_kecil=True)]
    kasus = pilih_kasus(evs)
    L.log(f"{len(kasus)} kasus dipilih")
    args = [(e, M[LIPAT[int(e["t0"][:4])]] if int(e["t0"][:4]) in LIPAT else M["utama"], tau, fisika) for e in kasus]
    with mp.get_context("fork").Pool(5) as pool:
        hasil = [r for r in pool.imap(_satu, args, chunksize=1) if r]
    L.log(f"{len(hasil)} kasus berhasil dihitung")
    K = H.get("kal_lepas")
    for r in hasil:
        r["p_lepas_mentah"] = r["p_lepas"]
        r["p_lepas"] = LJ.p_kal(K, r["p_lepas"])
    baris = []
    for r in hasil:
        g, ka = r["skor"]["gbdt"], r["kasus"]
        obs_ha = [round((r["awal"] + s["no"]) * HA_SEL) for s in r["skor"]["persistensi"]]
        y = 1 if r["akhir72"] >= L.LEPAS else 0
        baris.append({"id": r["id"], "th": r["th"], "prov": r["prov"], "nama_prov": PROVINSI.get(r["prov"]), "gambut": r["gambut"],
                      "kelas": "besar" if ka["ha_akhir"] >= 1000 else "sedang" if ka["ha_akhir"] >= 100 else "kecil",
                      "model": "lipat" if r["th"] <= 2022 else "2015-2022", "t0": ka["t0"], "lon0": ka["lon0"], "lat0": ka["lat0"],
                      "ha_awal": round(r["awal"] * HA_SEL), "ha_akhir": ka["ha_akhir"], "obs_ha": obs_ha,
                      "pred_ha": [[round(x * HA_SEL + r["awal"] * HA_SEL) for x in m] for m in r["mc"]],
                      "iou": [round(s["iou"], 3) for s in g], "f1": [round(s["f1"], 3) for s in g],
                      "f1_hibrida": [round(s["f1"], 3) for s in r["skor"]["hibrida"]], "iou_hibrida": [round(s["iou"], 3) for s in r["skor"]["hibrida"]],
                      "strata": r["strata"],
                      "model_lain": {nm: {"f1": [round(x["f1"], 3) for x in v], "iou": [round(x["iou"], 3) for x in v], "ha72": round((r["awal"] + v[2]["np"]) * HA_SEL),
                                          "arah": v[0]["arah"]} for nm, v in r["skor"].items() if nm not in ("gbdt", "persistensi")},
                      "arah_err": g[0]["arah"], "arah_angin_err": r.get("arah_angin_err"), "p_lepas": r["p_lepas"], "lepas": y,
                      "lepas_benar": (r["p_lepas"] >= .5) == bool(y), "dalam_p10_p90": [m[0] <= s["no"] <= m[2] for m, s in zip(r["mc"], r["skor"]["persistensi"])],
                      "cuaca": ka["cuaca"], "sel": {"awal": ka["awal"], "obs": ka["obs"], "frek": ka["frek"], "hibrida": ka["hibrida"]}})
    R = {"n": len(baris), "per_kelas": {k: sum(1 for b in baris if b["kelas"] == k) for k in ("besar", "sedang", "kecil")},
         "per_tahun": {th: sum(1 for b in baris if b["th"] == th) for th in sorted({b["th"] for b in baris})},
         "per_prov": {p: sum(1 for b in baris if b["prov"] == p) for p in PRIORITAS}, "gambut": sum(b["gambut"] for b in baris)}
    for h, lbl in enumerate(("24", "48", "72")):
        R[f"iou_{lbl}"] = bootstrap([b["iou"][h] for b in baris])
        R[f"f1_{lbl}"] = bootstrap([b["f1"][h] for b in baris])
        R[f"f1_hibrida_{lbl}"] = bootstrap([b["f1_hibrida"][h] for b in baris])
        R[f"iou_persistensi_{lbl}"] = bootstrap([r["skor"]["persistensi"][h]["iou"] for r in hasil])
        R[f"cakupan_{lbl}"] = round(sum(b["dalam_p10_p90"][h] for b in baris) / len(baris), 3)
        R[f"abs_log_luas_{lbl}"] = bootstrap([abs(math.log((1 + b["pred_ha"][h][1]) / (1 + b["obs_ha"][h]))) for b in baris])
    nms = sorted({nm for b in baris for nm in b["model_lain"]})
    R["model_lain"] = {}
    for nm in nms:
        bb = [b for b in baris if nm in b["model_lain"]]
        R["model_lain"][nm] = {"n": len(bb), **{f"f1_{l}": bootstrap([b["model_lain"][nm]["f1"][h] for b in bb]) for h, l in enumerate(("24", "48", "72"))},
                               **{f"iou_{l}": bootstrap([b["model_lain"][nm]["iou"][h] for b in bb]) for h, l in enumerate(("24", "48", "72"))},
                               "arah": bootstrap([b["model_lain"][nm]["arah"] for b in bb]),
                               "abs_log_luas_72": bootstrap([abs(math.log((1 + b["model_lain"][nm]["ha72"]) / (1 + b["obs_ha"][2]))) for b in bb]),
                               "per_strata": {st: {"f1_24": bootstrap([b["model_lain"][nm]["f1"][0] for b in bb if b["strata"] == st])} for st in ("gambut", "mineral", "sabana")}}
    R["gbdt_per_strata"] = {st: {"f1_24": bootstrap([b["f1"][0] for b in baris if b["strata"] == st]), "n": sum(1 for b in baris if b["strata"] == st)}
                            for st in ("gambut", "mineral", "sabana")}
    R["arah_err"] = bootstrap([b["arah_err"] for b in baris])
    R["arah_angin_err"] = bootstrap([b["arah_angin_err"] for b in baris])
    R["lepas_akurasi"] = bootstrap([1.0 if b["lepas_benar"] else 0.0 for b in baris])
    R["lepas_n"] = sum(b["lepas"] for b in baris)
    R["lepas_tp"] = sum(1 for b in baris if b["lepas"] and b["p_lepas"] >= .5)
    R["lepas_fp"] = sum(1 for b in baris if not b["lepas"] and b["p_lepas"] >= .5)
    for kel in ("besar", "sedang", "kecil"):
        bb = [b for b in baris if b["kelas"] == kel]
        R[f"kelas_{kel}"] = {"f1_24": bootstrap([b["f1"][0] for b in bb]), "iou_72": bootstrap([b["iou"][2] for b in bb]),
                             "lepas_akurasi": bootstrap([1.0 if b["lepas_benar"] else 0.0 for b in bb])}
    json.dump({"dibuat": time.strftime("%Y-%m-%d"), "aturan": __doc__.split("\n\n")[1], "ringkasan": R, "kasus": baris},
              open(os.path.join(PUBLIK, "sebaran_kasus.json"), "w"), ensure_ascii=False, separators=(",", ":"))
    H["kasus"] = R
    json.dump(H, open(L.HASIL, "w"), ensure_ascii=False, indent=1)
    L.log("selesai", json.dumps({k: R[k] for k in ("n", "iou_24", "f1_24", "lepas_akurasi")}))


if __name__ == "__main__":
    if sys.argv[1:] == ["uji"]:
        def ev(i, th, ha, sel, n72, prov="62"):
            det = [(0, j, 1.0) for j in range(n72)]
            return {"id": f"E{i}", "t0": f"{th}-08-01T05:00", "ha": ha, "sel": sel, "det": det, "prov": prov}
        evs = [ev(i, 2015 + i % 12, [5000, 300, 14][(i // 12) % 3], [400, 20, 1][(i // 12) % 3], [50, 12, 1][(i // 12) % 3], PRIORITAS[(i // 36) % 9]) for i in range(1200)]
        k = pilih_kasus(evs)
        assert len(k) >= 100 and len({e["id"] for e in k}) == len(k)
        assert len({e["t0"][:4] for e in k}) == 12 and {e["prov"] for e in k} == set(PRIORITAS)
        # tidak ada kasus yang dinilai dengan model yang dilatih pada tahunnya sendiri
        for th, grup in LIPAT.items():
            assert th in grup
        print("ok")
    else:
        main()
