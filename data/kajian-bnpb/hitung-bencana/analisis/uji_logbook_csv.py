"""Profil data/pusdalops/logbook_kejadian.csv (2011-2026) + anomali DIBI + banding antarsumber 2026 (Jan-Okt).
Keluaran: hasil/logbook_csv.json, hasil/anomali_dibi.json, hasil/banding_sumber_2026.json"""
import csv, json, os, collections, statistics, datetime as dt, re
AK = os.path.dirname(os.path.abspath(__file__))
AKAR = os.path.normpath(os.path.join(AK, "../../../.."))
def P(*a): return os.path.join(AKAR, *a)
def pct(v, p):
    v = sorted(v); return v[min(len(v) - 1, int(round(p / 100 * (len(v) - 1))))] if v else None
def tg(s):
    try: return dt.date.fromisoformat(s)
    except Exception: return None

def csv_profil():
    rows = list(csv.DictReader(open(P("data/pusdalops/logbook_kejadian.csv"), encoding="utf8")))
    H = {"n": len(rows)}
    sah = [r for r in rows if tg(r["tgl_kejadian"]) and 2011 <= tg(r["tgl_kejadian"]).year <= 2026]
    tak = [r for r in rows if not (tg(r["tgl_kejadian"]) and 2011 <= tg(r["tgl_kejadian"]).year <= 2026)]
    H["tgl_tidak_sah"] = {"n": len(tak), "tahun": dict(collections.Counter((r["tgl_kejadian"] or "kosong")[:4] for r in tak).most_common(12))}
    # tanggal kejadian jauh setelah dicatat
    pm = lambda r: tg(r["pertama_dicatat"])
    H["tgl_setelah_pertama_dicatat"] = sum(1 for r in sah if pm(r) and tg(r["tgl_kejadian"]) > pm(r))
    nl = [int(r["n_laporan"]) for r in rows if r["n_laporan"]]
    hd = [int(r["hari_dilaporkan"]) for r in rows if r["hari_dilaporkan"]]
    H["n_laporan"] = {"median": statistics.median(nl), "p90": pct(nl, 90), "p99": pct(nl, 99), "maks": max(nl), "pct_1x": round(100 * sum(1 for x in nl if x == 1) / len(nl), 1),
                      "pct_ge3": round(100 * sum(1 for x in nl if x >= 3) / len(nl), 1), "distribusi": dict(sorted(collections.Counter(min(x, 10) for x in nl).items()))}
    H["hari_dilaporkan"] = {"median": statistics.median(hd), "p90": pct(hd, 90), "p99": pct(hd, 99), "maks": max(hd), "pct_1hari": round(100 * sum(1 for x in hd if x == 1) / len(hd), 1),
                            "pct_gt7": round(100 * sum(1 for x in hd if x > 7) / len(hd), 1), "pct_gt30": round(100 * sum(1 for x in hd if x > 30) / len(hd), 1),
                            "distribusi": dict(sorted(collections.Counter(min(x, 15) for x in hd).items()))}
    # jeda kejadian -> pertama dicatat
    jeda = [(pm(r) - tg(r["tgl_kejadian"])).days for r in sah if pm(r)]
    H["jeda_kejadian_ke_pertama_dicatat_hari"] = {"median": statistics.median(jeda), "p90": pct(jeda, 90), "pct_gt3": round(100 * sum(1 for x in jeda if x > 3) / len(jeda), 1),
                                                  "pct_negatif": round(100 * sum(1 for x in jeda if x < 0) / len(jeda), 1)}
    H["multi_kab"] = {"n": sum(1 for r in rows if ";" in r["kabkota"]), "pct": round(100 * sum(1 for r in rows if ";" in r["kabkota"]) / len(rows), 2),
                      "maks_kab": max((r["kabkota"].count(";") + 1 for r in rows), default=0),
                      "per_jenis": dict(collections.Counter(r["jenis"] for r in rows if ";" in r["kabkota"]).most_common(10))}
    H["kosong"] = {"prov_kosong": sum(1 for r in rows if not r["prov"]), "kab_kosong": sum(1 for r in rows if not r["kabkota"])}
    th = collections.Counter((tg(r["tgl_kejadian"]).year) for r in sah)
    H["per_tahun"] = dict(sorted(th.items()))
    jt = collections.defaultdict(collections.Counter)
    for r in sah: jt[tg(r["tgl_kejadian"]).year][r["jenis"]] += 1
    H["per_tahun_jenis"] = {y: dict(c.most_common()) for y, c in sorted(jt.items())}
    # jumlah hari pencatatan per tahun (hari dengan >=1 laporan) -> penjelasan lonjakan
    hr = collections.defaultdict(set)
    for r in rows:
        for k in ("pertama_dicatat",):
            d = tg(r[k])
            if d and 2011 <= d.year <= 2026: hr[d.year].add(d)
    H["hari_pencatatan_per_tahun"] = {y: len(s) for y, s in sorted(hr.items())}
    nl_th = collections.defaultdict(list)
    for r in sah:
        if r["n_laporan"]: nl_th[tg(r["tgl_kejadian"]).year].append(int(r["n_laporan"]))
    H["median_n_laporan_per_tahun"] = {y: statistics.median(v) for y, v in sorted(nl_th.items())}
    H["pct_n_laporan_1_per_tahun"] = {y: round(100 * sum(1 for x in v if x == 1) / len(v), 1) for y, v in sorted(nl_th.items())}
    # kabupaten x tgl x jenis duplikat potensial: baris dengan kunci sama (jenis, tgl, kabkota)
    k = collections.Counter((r["jenis"], r["tgl_kejadian"], r["kabkota"], r["prov"]) for r in sah)
    H["kunci_kembar_jenis_tgl_kab"] = {"kunci_unik": len(k), "baris": len(sah), "kunci_dengan_>1_baris": sum(1 for v in k.values() if v > 1)}
    # 2026 Jan-Okt
    H["tahun_2026_jan_okt"] = sum(1 for r in sah if dt.date(2026, 1, 1) <= tg(r["tgl_kejadian"]) <= dt.date(2026, 10, 31))
    H["tahun_2026_jan_okt_per_jenis"] = dict(collections.Counter(r["jenis"] for r in sah if dt.date(2026, 1, 1) <= tg(r["tgl_kejadian"]) <= dt.date(2026, 10, 31)).most_common())
    H["tahun_2026_okt"] = sum(1 for r in sah if dt.date(2026, 10, 1) <= tg(r["tgl_kejadian"]) <= dt.date(2026, 10, 31))
    H["tahun_2026_jan_okt_pertama_dicatat"] = sum(1 for r in rows if tg(r["pertama_dicatat"]) and dt.date(2026, 1, 1) <= tg(r["pertama_dicatat"]) <= dt.date(2026, 10, 31))
    return H, rows

def anomali_dibi():
    import sys; sys.path.insert(0, AK)
    from uji_kriteria import muat, kr
    R = muat(); H = {}
    # contoh baris
    ct = lambda o: {"tgl": str(o["tgl"]), "prov": o["prov"], "kab": o["kab"], "jenis": o["jenis"], "jumlah_kejadian": round(o["jk"], 3),
                    "meninggal": o["meninggal"], "terdampak_luka_ungsi": o["k2n"], "rumah_rusak": o["rr"], "fasilitas": o["fas"], "is_bencana": o["is_b"]}
    pec = [o for o in R if o["jk"] < 1]
    H["jumlah_kejadian_pecahan"] = {"baris": len(pec), "pct": round(100 * len(pec) / len(R), 2), "per_nilai": dict(collections.Counter(round(o["jk"], 3) for o in pec).most_common(8)),
                                    "per_tahun": dict(collections.Counter(o["th"] for o in pec)), "per_jenis": dict(collections.Counter(o["grup"] for o in pec).most_common()),
                                    "jumlah_kejadian_total_vs_baris": {"baris": len(R), "sum_jk": round(sum(o["jk"] for o in R), 1)},
                                    "contoh": [ct(o) for o in sorted([o for o in pec if o["jk"] == 0.5], key=lambda o: -o["k2n"])[:5]]}
    ge2 = [o for o in R if o["jk"] >= 2]
    H["jumlah_kejadian_ge2_per_baris"] = {"baris": len(ge2), "contoh": [ct(o) for o in sorted(ge2, key=lambda o: -o["jk"])[:4]]}
    # kejadian satu hari, satu provinsi, banyak kabupaten (sama jenis)
    g = collections.defaultdict(set)
    for o in R: g[(o["tgl"], o["prov"], o["jenis"])].add(o["kab"])
    big = sorted(((k, len(v)) for k, v in g.items()), key=lambda x: -x[1])
    H["satu_hari_satu_prov_banyak_kab"] = {"kunci_dengan_>=5_kab": sum(1 for k, v in big if v >= 5), "kunci_dengan_>=10_kab": sum(1 for k, v in big if v >= 10),
        "contoh": [{"tgl": str(k[0]), "prov": k[1], "jenis": k[2], "n_kab": v} for k, v in big[:6]]}
    # baris dampak nol
    nol = [o for o in R if o["meninggal"] == 0 and o["hilang"] == 0 and o["k2n"] == 0 and o["rr"] == 0 and o["fas"] == 0 and o["terendam"] == 0 and o["fasum"] == 0]
    H["dampak_nol_semua"] = {"baris": len(nol), "pct": round(100 * len(nol) / len(R), 1), "per_jenis": dict(collections.Counter(o["grup"] for o in nol).most_common()),
        "pct_is_bencana_true": round(100 * sum(1 for o in nol if o["is_b"]) / len(nol), 1)}
    nol_ib = [o for o in nol if o["is_b"] and o["grup"] != "karhutla"]
    H["dampak_nol_is_bencana_true_bukan_karhutla"] = {"baris": len(nol_ib), "contoh": [ct(o) for o in nol_ib[:5]]}
    kh = [o for o in R if o["grup"] == "karhutla"]
    H["karhutla_dibi"] = {"baris": len(kh), "dengan_korban_jiwa_meninggal": sum(1 for o in kh if o["meninggal"]), "dengan_k2": sum(1 for o in kh if o["k2n"] >= 50),
        "dampak_nol_semua": sum(1 for o in kh if o in nol), "pct_dampak_nol": round(100 * sum(1 for o in kh if o in nol) / len(kh), 1),
        "catatan": "DIBI tidak punya kolom luas (ha): K4 tidak bisa diuji; karhutla praktis selalu lolos hanya lewat K4/K5/K6"}
    jb = sorted([o for o in R if o["jembatan"] >= 1], key=lambda o: -o["jembatan"])
    H["jembatan_rusak"] = {"baris": len(jb), "jenis": dict(collections.Counter(o["grup"] for o in jb).most_common(5)),
        "satu_jembatan_tanpa_korban_dan_rumah": sum(1 for o in jb if o["jembatan"] == 1 and o["meninggal"] == 0 and o["k2n"] < 50 and o["rr"] < 5),
        "contoh": [ct(o) | {"jembatan": o["jembatan"]} for o in jb[:3]]}
    # beda tahun: tanggal 1 Januari / hari pertama (dt default)
    c1 = collections.Counter(str(o["tgl"])[5:] for o in R);
    H["tanggal_terpopuler"] = c1.most_common(5)
    pj = [o for o in R if o["prov"] and o["meninggal"] > 0 and o["k2n"] == 0 and o["rr"] == 0]
    H["meninggal_tanpa_terdampak_dan_rumah"] = {"baris": len(pj), "contoh": [ct(o) for o in pj[:4]]}
    # terdampak > mengungsi dst anomali: menderita_mengungsi vs menderita+mengungsi (mentah)
    raw = json.load(open(os.path.join(AK, "hasil/dibi_mentah_2024_2026.json"), encoding="utf8"))["data"]
    sel = [r for r in raw if abs((r["menderita_mengungsi"] or 0) - ((r["menderita"] or 0) + (r["mengungsi"] or 0))) > 1]
    H["menderita_mengungsi_vs_jumlah"] = {"baris_tak_sama": len(sel), "dari": len(raw), "contoh": [{"menderita": r["menderita"], "mengungsi": r["mengungsi"], "menderita_mengungsi": r["menderita_mengungsi"]} for r in sel[:3]]}
    # lintas tahun / tanggal: kekeringan, asap
    kk = [o for o in R if o["grup"] == "kekeringan"]
    H["kekeringan"] = {"baris": len(kk), "per_bulan": dict(sorted(collections.Counter(str(o["tgl"])[:7] for o in kk).items())),
        "tgl_terpopuler": collections.Counter(str(o["tgl"]) for o in kk).most_common(3)}
    # rumah rusak ringan > 0 sebagai penentu tunggal
    rr_only = [o for o in R if kr(o)["K3"] and not kr(o)["K1"] and not kr(o)["K2"] and o["rr"] and o["meninggal"] == 0]
    H["K3_penentu_tunggal_tanpa_korban"] = len(rr_only)
    # dampak gempa sangat besar tetapi dicatat pecahan?
    big_fr = sorted([o for o in R if 0 < o["jk"] < 1 and (o["meninggal"] >= 1 or o["k2n"] >= 1000)], key=lambda o: -o["k2n"])
    H["pecahan_dengan_dampak_besar"] = {"baris": len(big_fr), "contoh": [ct(o) for o in big_fr[:6]]}
    return H

def banding():
    H = {}
    sd = json.load(open(P("data/laporan-bnpb/bulanan/2026-10/masukan/dibi_kejadian.json"), encoding="utf8"))["kejadian"]
    sd2 = [r for r in sd if "2026-01-01" <= r["tanggal"] <= "2026-10-31"]
    H["dibi_gabung_lokal_masukan"] = {"baris_kab_hari_jenis": len(sd2), "sum_kejadian": sum(r["kejadian"] for r in sd2),
        "berkas": "data/laporan-bnpb/bulanan/2026-10/masukan/dibi_kejadian.json, 1 Jan-31 Okt 2026"}
    import sys; sys.path.insert(0, AK)
    from uji_kriteria import muat
    R = [o for o in muat() if dt.date(2026, 1, 1) <= o["tgl"] <= dt.date(2026, 10, 31)]
    H["dibi_mentah_tarikan_baru"] = {"baris": len(R), "sum_jumlah_kejadian": round(sum(o["jk"] for o in R), 1), "is_bencana_true": sum(1 for o in R if o["is_b"]),
        "tanpa_karhutla_baris": sum(1 for o in R if o["grup"] != "karhutla"), "karhutla_baris": sum(1 for o in R if o["grup"] == "karhutla"),
        "tanpa_kebakaran_permukiman_baris": sum(1 for o in R if o["grup"] not in ("kebakaran permukiman",)),
        "berkas": "hasil/dibi_mentah_2024_2026.json (tarikan Superset 12 Nov 2026), 1 Jan-31 Okt 2026"}
    H["dibi_per_jenis"] = dict(collections.Counter(o["grup"] for o in R).most_common())
    l26 = json.load(open(P("data/laporan-bnpb/bulanan/2026-10/masukan/logbook_2026.json"), encoding="utf8"))["kejadian"]
    a = [e for e in l26 if "2026-01-01" <= e["tgl"] <= "2026-10-31"]
    H["logbook_2026_json_docx"] = {"kejadian_tgl_Jan_Okt": len(a), "kejadian_tgl_Okt": sum(1 for e in l26 if e["tgl"].startswith("2026-10")),
        "per_jenis": dict(collections.Counter(e["jenis"] for e in a).most_common()), "berkas": "masukan/logbook_2026.json (kunci jenis,prov,kab,tgl), tgl kejadian 1 Jan-31 Okt 2026",
        "tgl_di_luar_2026": sum(1 for e in l26 if not e["tgl"].startswith("2026")), "total_kejadian_berkas": len(l26)}
    kj = json.load(open(P("data/laporan-bnpb/bulanan/2026-10/masukan/logbook_kejadian.json"), encoding="utf8"))["kejadian"]
    ks = collections.Counter();
    def mulai(e): return e.get("mulai") or (e.get("terlihat") or [None])[0]
    a2 = [e for e in kj if mulai(e) and "2026-01-01" <= mulai(e) <= "2026-10-31"]
    H["logbook_kejadian_json_koordalops"] = {"kejadian_total_berkas": len(kj), "mulai_atau_terlihat_pertama_Jan_Okt": len(a2), "tanpa_mulai": sum(1 for e in kj if not e.get("mulai")),
        "per_jenis": dict(collections.Counter(e["jenis"] for e in a2).most_common()), "berkas": "masukan/logbook_kejadian.json (Laporan Harian Koordalops, 315 laporan 1 Jan-11 Nov 2026)",
        "catatan": "mulai = tanggal pertama di Kronologis; bila kosong dipakai hari pertama terlihat"}
    rows = list(csv.DictReader(open(P("data/pusdalops/logbook_kejadian.csv"), encoding="utf8")))
    c = [r for r in rows if tg(r["tgl_kejadian"]) and dt.date(2026, 1, 1) <= tg(r["tgl_kejadian"]) <= dt.date(2026, 10, 31)]
    H["logbook_csv"] = {"baris_tgl_kejadian_Jan_Okt": len(c), "per_jenis": dict(collections.Counter(r["jenis"] for r in c).most_common()),
        "terakhir_dicatat_maks": max((r["terakhir_dicatat"] for r in rows if r["terakhir_dicatat"]), default=None), "berkas": "data/pusdalops/logbook_kejadian.csv"}
    for f, k in (("public/data/bnpb/rekonsiliasi_dalops_dibi.json", "rekonsiliasi"), ("public/data/silang_dibi_logbook.json", "silang")):
        d = json.load(open(P(f), encoding="utf8"))
        if k == "rekonsiliasi":
            t = d.get("nasional_tahun", {}).get("2026")
            H["rekonsiliasi_dalops_dibi_2026"] = {kk: t[kk] for kk in list(t)[:8]} if t else None
            H["rekonsiliasi_dalops_dibi_nasional_semua_tahun"] = {kk: d["nasional"][kk] for kk in ("n_dalops", "n_dibi", "pasangan", "hanya_dalops", "hanya_dibi")}
            H["rekonsiliasi_catatan_cakupan_2026"] = {"dalops_hari_logbook_2026": d["cakupan"]["dalops_hari_logbook"].get("2026"), "dibi_baris_2026": d["cakupan"]["dibi_baris"].get("2026")}
        else:
            H["silang_dibi_logbook"] = d["semua"]; H["silang_tahun"] = d["tahun"]
    return H

if __name__ == "__main__":
    h, _ = csv_profil()
    json.dump(h, open(os.path.join(AK, "hasil/logbook_csv.json"), "w", encoding="utf8"), ensure_ascii=False, indent=1, default=str)
    json.dump(anomali_dibi(), open(os.path.join(AK, "hasil/anomali_dibi.json"), "w", encoding="utf8"), ensure_ascii=False, indent=1, default=str)
    json.dump(banding(), open(os.path.join(AK, "hasil/banding_sumber_2026.json"), "w", encoding="utf8"), ensure_ascii=False, indent=1, default=str)
    print("ok")
