"""Vonis J3 (PRAREG-J3.md): menilai kejadian UJI (2024-08, 2025-04) dengan model final dari hasil_j3.json. Hanya jalan sesudah `kunci_j3.py buka` (sidik state = sidik sekarang).
Menghitung (semua satu kali, tanpa penyetelan): POD + selang bootstrap per hari dan selisih berpasangan terhadap InaRISK, Kd seragam, Kd per kab/kota (5 kenop), sel acak,
semuanya pada LUAS BASAH SAMA dengan model (pembanding diberi ambang kedalaman yang menyamakan luas); luas basah per kejadian; kecamatan tanpa laporan (kosong bila < 100 laporan, dinyatakan
eksplisit); presisi (bagian sel basah dekat laporan, pelengkap); galat median; Spearman; rob terpisah (laporan Jakarta Utara); leave-one-event-out dari tabel tahap 2; cek 33 m (`sensitivitas`).
Pakai:  python3 scripts/banjir/genangan/vonis_j3.py vonis | sensitivitas | uji
"""
import json, os, sys

D = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, D)
import kalibrasi_j3 as kal, kunci_j3, skor_j3  # noqa: E402


def frek_hari(lap_semua, tahun, kec_dari):
    """{kec: jumlah hari WIB berlaporan} pada tahun[0]..tahun[1] (laporan di dalam DKI saja)."""
    hari = {}
    for r in lap_semua:
        if tahun[0] <= int(r["t"][:4]) <= tahun[1]:
            c = kec_dari(r["lon"], r["lat"])
            if c:
                hari.setdefault(f"{c[0]}|{c[1]}", set()).add(r["t"][:10])
    return {k: len(v) for k, v in hari.items()}


def evaluasi(B, data, bahaya, frek, laju=None):
    """data {ev: {"R": {"model","seragam","kab"}, "lab": [laporan]}}; frek {"2024-2025": {kec: n}, "2017-2023": {...}} -> dict hasil + vonis."""
    K = B["lulus"]; metode = ("seragam", "kab", "inarisk", "acak"); ph = {m: {} for m in ("model",) + metode}
    per_ev, galat_nl, p90 = {}, [], []
    for ev, d in data.items():
        Rm = d["R"]["model"]; nl = skor_j3.nilai_laporan(Rm, d["lab"]); luas = skor_j3.luas_basah(Rm); galat_nl += nl; p90.append(skor_j3.p90_kec(Rm))
        tag = lambda x: {f"{ev}|{k}": v for k, v in x.items()}
        ph["model"].update(tag(skor_j3.per_hari(nl, lambda m, r: m >= skor_j3.AMBANG)))
        info = {"n_laporan": len(nl), "luas_basah": luas, "tanpa_laporan_basah": skor_j3.tanpa_laporan_basah(Rm, nl), "presisi": skor_j3.presisi(Rm, [r for r, _ in nl]), "pod": skor_j3.pod(nl)}
        for m in ("seragam", "kab"):
            R2 = d["R"][m]; n2 = skor_j3.nilai_laporan(R2, d["lab"]); thr = skor_j3.ambang_untuk_luas(R2, luas); ph[m].update(tag(skor_j3.per_hari(n2, lambda x, r, t=thr: x >= t)))
            info[m] = {"luas_basah_asli": skor_j3.luas_basah(R2), "ambang_luas_sama_m": thr, "pod_luas_sama": skor_j3.pod(n2, thr), "pod_ambang_10cm": skor_j3.pod(n2)}
        ya = skor_j3.inarisk_ya(Rm, bahaya, luas); ph["inarisk"].update(tag(skor_j3.per_hari(nl, lambda m, r, y=ya: f"{r['kab']}|{r['kec']}" in y))); info["inarisk"] = {"pod": skor_j3.pod_kec(nl, ya)}
        Ra = skor_j3.raster_acak(Rm, luas); na = skor_j3.nilai_laporan(Ra, d["lab"]); ph["acak"].update(tag(skor_j3.per_hari(na, lambda x, r: x >= skor_j3.AMBANG))); info["acak"] = {"pod": skor_j3.pod(na)}
        utara = [(r, m) for r, m in nl if "UTARA" in r["kab"].upper()]; info["rob_jakarta_utara"] = {"n": len(utara), "pod": skor_j3.pod(utara), "catatan": "muka laut tetap 0,6 m; bukan model rob"}
        per_ev[ev] = info
    pod, lo, hi = skor_j3.bootstrap_pod(ph["model"], B["bootstrap"]["ulangan"], B["bootstrap"]["benih"])
    sel = {m: dict(zip(("titik", "bawah95", "atas95"), skor_j3.bootstrap_selisih(ph["model"], ph[m], B["bootstrap"]["ulangan"], B["bootstrap"]["benih"]))) for m in metode}
    galat = skor_j3.galat_median(galat_nl); kunci = sorted(p90[0]); rata = [sum(x[k] for x in p90) / len(p90) for k in kunci]
    sp = {n: skor_j3.spearman(rata, [f.get(k, 0) for k in kunci]) for n, f in frek.items()}
    tl = [i["tanpa_laporan_basah"] for i in per_ev.values() if i["tanpa_laporan_basah"] is not None]
    syarat = {"pod_ge_0.6": pod >= K["pod_min"], "mengalahkan_inarisk": sel["inarisk"]["bawah95"] > 0, "mengalahkan_kd_seragam": sel["seragam"]["bawah95"] > 0,
              "luas_basah_le_25": all(i["luas_basah"] <= K["luas_basah_maks"] for i in per_ev.values()),
              "tanpa_laporan_le_40": (all(x <= K["kec_tanpa_laporan_basah_maks"] for x in tl) if tl else None),
              "galat_median_le_40cm": galat is not None and galat <= K["galat_median_maks_cm"], "spearman_ge_0.5": sp["2024-2025"] is not None and sp["2024-2025"] >= K["spearman_min"]}
    nilai = [v for v in syarat.values() if v is not None]
    return {"pod": {"titik": pod, "bawah95": lo, "atas95": hi}, "selisih_pod_luas_sama": sel, "per_kejadian": per_ev, "galat_median_cm": galat, "spearman": sp, "syarat": syarat,
            "pernyataan": ("Kriteria 'kecamatan tanpa laporan basah <= 40%' KOSONG: tidak ada kejadian uji dengan >= 100 laporan; tidak dinilai, vonis memakai syarat lain saja." if not tl else None),
            "vonis": "LULUS" if all(nilai) else "GAGAL"}


def uji():
    import array
    B = kunci_j3.beku(); h = {"tabel_tahap2": {"5": {"a": {"X|1": 3, "X|2": 1}, "b": {"X|1": 3, "X|2": 1}, "c": {"X|1": 1, "X|2": 3}}, "12": {"a": {"X|1": 1, "X|2": 3}, "b": {"X|1": 1, "X|2": 3}, "c": {"X|1": 3, "X|2": 1}}}}
    o = kal.loeo(h); assert set(o) == {"a", "b", "c"} and all("peta_lebih_baik" in v for v in o.values())
    assert frek_hari([{"t": "2024-01-01T01:00", "lon": 0, "lat": 0}, {"t": "2024-01-01T09:00", "lon": 0, "lat": 0}, {"t": "2024-01-02T09:00", "lon": 0, "lat": 0}, {"t": "2020-01-02", "lon": 0, "lat": 0}],
                      (2024, 2025), lambda lo, la: ("K", "a")) == {"K|a": 2}
    def raster(hm):
        return {"nx": 4, "ny": 2, "dx_m": 100.0, "lon0": 0.0, "lat0": 0.0, "dlon": 1e-3, "dlat": 1e-3, "nama": ["A|a", "B|b"], "kec": array.array("h", [0] * 4 + [1] * 4), "hm": array.array("f", hm)}
    lap = lambda t, lo, la, k, kab, kec: {"t": t, "lon": lo, "lat": la, "kedalaman_cm": k, "kab": kab, "kec": kec}
    L = [lap("2024-08-16T10:00:00+07:00", 0, 0, 30, "A", "a"), lap("2024-08-17T10:00:00+07:00", 1e-3, 0, 30, "A", "a"), lap("2024-08-17T11:00:00+07:00", 0, -1e-3, 30, "B", "b")]
    Rm = raster([.5, .5, 0, 0, .5, 0, 0, 0]); Rs = raster([.01, .01, 0, 0, .01, 0, 0, 0])
    d = {e: {"R": {"model": Rm, "seragam": Rs, "kab": Rs}, "lab": L} for e in ("2024-08", "2025-04")}
    r = evaluasi(B, d, {"31|A|a": {"banjir": .9}}, {"2024-2025": {"A|a": 3, "B|b": 1}, "2017-2023": {"A|a": 3, "B|b": 1}})
    assert r["vonis"] in ("LULUS", "GAGAL") and r["pernyataan"] and r["syarat"]["tanpa_laporan_le_40"] is None, r      # <100 laporan: kriteria kosong dinyatakan
    assert r["per_kejadian"]["2024-08"]["seragam"]["pod_luas_sama"] is not None and abs(r["per_kejadian"]["2024-08"]["luas_basah"] - 3 / 8) < 1e-9
    assert r["selisih_pod_luas_sama"]["seragam"]["titik"] >= 0, "model POD >= seragam pada luas sama (model basah di sel laporan)"
    print("ok")


def utama():
    S = json.load(open(kunci_j3.STATE)) if os.path.exists(kunci_j3.STATE) else {}
    mode = sys.argv[1]
    if not S.get("dibuka") or S["dibuka"].get("sidik") != kunci_j3.sidik():
        sys.exit("label uji terkunci: jalankan `kunci_j3.py buka` (sidik harus sama dengan sidik state)")
    if mode in S.get("vonis_selesai", {}):
        sys.exit(f"{mode} sudah dijalankan {S['vonis_selesai'][mode]['tanggal']}; vonis tidak diulang")
    J = json.load(open(kunci_j3.SIDIK_BERKAS))
    if kunci_j3.sha_berkas(kunci_j3.HASIL) != J.get("hasil_sha256"):
        sys.exit("hash hasil_j3.json tak cocok dengan j3_sidik.json")
    from bersama import KecDKI
    B = kunci_j3.beku(); h = json.load(open(kunci_j3.HASIL)); sk = h["skala"]; faktor = None if mode == "vonis" else 4
    model = {"kd": h["kd_seragam"]} if h["final"] == "seragam" else {"kd_map": h["kd_kec"]}   # peta dibaca dari hasil (inline), bukan berkas terpisah
    data = {}
    for ev in B["uji"]:
        data[ev] = {"lab": kal.muat_label(ev), "R": {"model": skor_j3.baca_raster(kal.jalankan_mesin(ev, sk, faktor=faktor, **model)),
                                                      "seragam": skor_j3.baca_raster(kal.jalankan_mesin(ev, sk, kd=h["kd_seragam"], faktor=faktor)),
                                                      "kab": skor_j3.baca_raster(kal.jalankan_mesin(ev, sk, kd_map=h["kd_kab_kec"], faktor=faktor))}}
    semua = json.load(open(os.path.join(kunci_j3.AKAR, kunci_j3.D, "petabencana_laporan.json"))); k = KecDKI()
    frek = {"2024-2025": frek_hari(semua, (2024, 2025), k.cari), "2017-2023": frek_hari(semua, (2017, 2023), k.cari)}
    bahaya = json.load(open(os.path.join(kunci_j3.AKAR, "public/banjir/data/bahaya.json")))["kec"]
    r = evaluasi(B, data, bahaya, frek); r["leave_one_event_out"] = h.get("loeo"); r["dx_faktor"] = faktor or B["dx_faktor"]
    jalur = os.path.join(kal.KAL, "vonis_j3.json" if faktor is None else "sensitivitas_33m.json"); json.dump(r, open(jalur, "w"), indent=1, sort_keys=True)
    S.setdefault("vonis_selesai", {})[mode] = {"tanggal": __import__("datetime").date.today().isoformat(), "sidik": S["dibuka"]["sidik"]}
    json.dump(S, open(kunci_j3.STATE, "w"), indent=1)   # state dilacak git: vonis dan sensitivitas masing-masing SEKALI
    print(json.dumps({k: r[k] for k in ("vonis", "syarat", "pod", "pernyataan")}, indent=1))


if __name__ == "__main__":
    c = sys.argv[1:2]
    uji() if c == ["uji"] else utama() if c in (["vonis"], ["sensitivitas"]) else sys.exit(__doc__)
