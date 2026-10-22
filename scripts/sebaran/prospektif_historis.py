"""UJI BALIK HISTORIS model "akan membesar" (BUKAN uji prospektif): ulangi protokol prospektif.py pada musim-musim lalu.

Memakai baris latih lolos_baris.pkl (fitur & label 72 jam dari lolos.baris: n72 >= LEPAS sel, sambungan <=750 m/<=24 jam, definisi yang sama
dengan prospektif.label72), konfigurasi (fitur, hiperparameter) yang sama dengan model terpasang (lolos.pilihan), ambang yang sama (recall >= 70%).

Disiplin waktu, per tahun uji Y (tidak ada tahun Y atau sesudahnya di bobot model, kalibrasi, maupun ambang):
  - model dilatih pada tahun <= Y-2
  - kalibrasi Platt + ambang WASPADA dari tahun Y-1 (satu-satunya data yang sudah "lalu" dan belum dipakai melatih)
  - dinilai pada tahun Y
Cuaca = reanalisis ERA5 (prakiraan sempurna) sedangkan prospektif memakai prakiraan Open-Meteo: angka di sini OPTIMISTIS bagi cuaca.
Catatan jujur lain (ditulis ke JSON): pemilihan fitur & hiperparameter dulu dilakukan dengan validasi silang 2015-2023, jadi 2019 dan 2023
sedikit terlihat lewat penyetelan itu; 2024-2026 sudah pernah dilihat sekali (model sel). Bobot model sendiri ketat luar-waktu.

Keluaran: public/data/prospektif_historis.json (bentuk metrik = mode.awal/ulang di prospektif.json, ditambah kunci per_tahun).
Berat (~12 pelatihan @ ~1 menit, memori ~3 GB). Pakai:  python3 scripts/sebaran/prospektif_historis.py  |  ... uji
"""
import datetime as dt, json, os, re, sys, time

DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, DIR)
import gbdt as G  # noqa: E402
import lolos as LL  # noqa: E402
import prospektif as P  # noqa: E402
from umum import PUBLIK  # noqa: E402

TAHUN_UJI = (2019, 2023, 2024, 2025, 2026)
# Baris latih sudah HANYA 9 provinsi prioritas (sama dengan prospektif.py). 2024-2026 = tahun yang tidak dipakai menyetel pilihan fitur/hiperparameter.
KELOMPOK = {"semua": TAHUN_UJI, "2024-2026": (2024, 2025, 2026)}
KELUAR = os.path.join(PUBLIK, "prospektif_historis.json")
MIN_LOLOS_KAL = 200  # tahun Y-1 dengan < 200 api besar terlalu sedikit untuk Platt + ambang: tahun Y tidak ikut kolam, hanya dilaporkan per tahun
KELOMPOK_TAMPIL = "2024-2026"  # kelompok yang dibaca layar (sim_data.js membaca kuncinya dari JSON ini, bukan diketik)
LAJU_PROSPEKTIF_RUJUKAN = "149 dari 882 ramalan awal yang dinilai pada 20 Okt 2026 (17%), dari log CI; catatan prospektif bergulir tidak ada di salinan lokal"


def lipat(R, th, fitur, cfg):
    """(p, y, w, meta) untuk tahun uji th: luar-waktu ketat. Mengembalikan juga ambang & n latih/kalibrasi."""
    tr = [i for i, r in enumerate(R) if r[1] <= th - 2]
    ka = [i for i, r in enumerate(R) if r[1] == th - 1]
    te = [i for i, r in enumerate(R) if r[1] == th]
    m = LL.latih(tr, fitur, cfg)
    yk = [R[i][4] for i in ka]
    ab = LL.platt(LL.skor_mentah(m, ka), yk)
    sig = lambda idx: [G.sigmoid(ab[0] + ab[1] * z) for z in LL.skor_mentah(m, idx)]
    amb = LL.ambang_recall(sig(ka), yk)
    p = sig(te)
    return p, [R[i][4] for i in te], [1 if q >= amb else 0 for q in p], {"n_latih": len(tr), "n_kalibrasi": len(ka), "n_lolos_kalibrasi": sum(yk),
                                                                                    "kalibrasi_layak": sum(yk) >= MIN_LOLOS_KAL, "ambang": round(amb, 4)}


def paritas():
    """Apakah selisih laju dasar historis (~3-4%) vs prospektif (~17%) berasal dari definisi label / filter deteksi? Dua perbandingan pada deteksi 2026 yang SAMA:
    (A) label72 prospektif vs label pelatihan (n72 di lolos_baris.pkl) untuk tiap peristiwa Sep - 9 Okt 2026; (B) deteksi hotspot.json (filter prospektif) vs
    deteksi arsip pelatihan (viirs_veg.pkl) pada jendela hotspot.json. None bila arsip mentah tak ada (mesin CI)."""
    import pickle
    from umum import MENTAH, PRIORITAS, T0, Prov
    pk, ps = os.path.join(MENTAH, "viirs_veg.pkl"), os.path.join(MENTAH, "peristiwa.jsonl")
    hj = os.path.join(PUBLIK, "hotspot.json")
    if not (os.path.exists(pk) and os.path.exists(ps) and os.path.exists(hj)):
        return None
    v = pickle.load(open(pk, "rb"))
    pr, R = Prov(), LL.muat()
    ke_menit = lambda th, b, h: (dt.datetime(th, b, h, tzinfo=dt.timezone.utc) - T0).total_seconds() / 60

    def peristiwa(rows, lo_, hi_):
        """{(menit t0, lat, lon): label72 prospektif} untuk komponen yang mulai di [lo_, hi_], 9 provinsi prioritas. label72 dijalankan pada anggota komponen
        saja (hasilnya identik karena yang terjangkau selalu anggota komponen; jauh lebih cepat daripada seluruh gudang)."""
        out = {}
        for idx in P.komponen(rows).values():
            idx.sort(key=lambda i: rows[i][0])
            t0 = rows[idx[0]][0]
            if t0 < lo_ or t0 > hi_:
                continue
            per = [j for j, i in enumerate(idx) if rows[i][0] - t0 <= 30]
            lo = sum(rows[idx[j]][2] for j in per) / len(per)
            la = sum(rows[idx[j]][1] for j in per) / len(per)
            if (rows[idx[0]][5] or pr(lo, la)) not in PRIORITAS:
                continue
            out[(round(t0), round(la, 3), round(lo, 3))] = P.label72([rows[i] for i in idx], per, t0)
        return out

    laju = lambda d: round(sum(x >= LL.LEPAS for x in d) / len(d), 4) if d else None
    m_awal = ke_menit(2026, 8, 20)  # konteks sebelum 1 Sep supaya komponen yang menyambung ke Agustus tidak tampak "baru"
    S = []
    for i in range(len(v["t"]) - 1, -1, -1):  # array terurut waktu: berhenti di sebelum m_awal
        if v["t"][i] < m_awal:
            break
        S.append([v["t"][i], v["lat"][i], v["lon"][i], "N", v["frp"][i], ""])
    S.sort(key=lambda r: r[0])
    akhir = S[-1][0]
    lo_, hi_ = ke_menit(2026, 9, 1), akhir - 78 * 60
    A = peristiwa(S, lo_, hi_)
    # (A) label pelatihan: n72 baris latih (hanya peristiwa yang punya cuaca ERA5) untuk peristiwa 2026 yang sama
    n72 = {r[0]: r[5] for r in R if r[1] == 2026}
    latih = {}
    for l in open(ps):
        if '"t0":"2026-' not in l:
            continue
        e = json.loads(l)
        if e["id"] in n72:
            latih[(e["t0"][:16], round(e["lat0"], 3), round(e["lon0"], 3))] = n72[e["id"]]
    waktu = lambda m: (T0 + dt.timedelta(minutes=m)).isoformat()[:16]
    cocok = [(A[k], latih[(waktu(k[0]), k[1], k[2])]) for k in A if (waktu(k[0]), k[1], k[2]) in latih]
    a = {"periode_t0": f"{waktu(lo_)} sampai {waktu(hi_)}", "n_peristiwa": len(A), "laju_label_prospektif": laju(list(A.values())),
         "n_ada_di_baris_latih": len(cocok), "laju_baris_latih_pada_irisan": laju([b for _, b in cocok]), "laju_label_prospektif_pada_irisan": laju([x for x, _ in cocok]),
         "label_berbeda": sum(1 for x, b in cocok if (x >= LL.LEPAS) != (b >= LL.LEPAS))}
    # (B) filter deteksi: hotspot.json (S-NPP keyakinan >= nominal, tanpa saringan vegetasi arsip) vs arsip pelatihan, jendela & peristiwa yang sama
    hs = json.load(open(hj))
    H, a0 = P.gabung([], hs)
    H = [r for r in H if r[3] == "N"]
    Sj = [r for r in S if r[0] >= H[0][0]]
    lo2, hi2 = H[0][0] + 24 * 60, a0 - 78 * 60  # 24 jam pertama dibuang: komponen yang sudah menyala sebelum jendela tampak baru
    BH, BS = peristiwa(H, lo2, hi2), peristiwa(Sj, lo2, hi2)
    ir = set(BH) & set(BS)
    b = {"periode_t0": f"{waktu(lo2)} sampai {waktu(hi2)}", "n_hotspot_json": len(BH), "n_arsip": len(BS), "irisan": len(ir),
         "laju_hotspot_json": laju(list(BH.values())), "laju_arsip": laju(list(BS.values())),
         "laju_irisan_hotspot": laju([BH[k] for k in ir]), "laju_irisan_arsip": laju([BS[k] for k in ir])}
    sama = lambda x, y: x is not None and y is not None and abs(x - y) <= .01
    definisi_sama = a["label_berbeda"] <= max(1, len(cocok) // 200) and sama(a["laju_baris_latih_pada_irisan"], a["laju_label_prospektif_pada_irisan"])
    filter_sama = sama(b["laju_hotspot_json"], b["laju_arsip"])
    k = (f"paritas label (diperiksa {dt.date.today().isoformat()}): pada deteksi 2026 yang sama label72 prospektif memberi laju api besar {a['laju_label_prospektif']:.1%} untuk {a['n_peristiwa']} peristiwa "
         f"({a['periode_t0']}); pada {a['n_ada_di_baris_latih']} peristiwa yang ada di baris latih labelnya {a['label_berbeda']} berbeda "
         f"(baris latih {a['laju_baris_latih_pada_irisan']:.1%} vs label72 {a['laju_label_prospektif_pada_irisan']:.1%}); filter deteksi: hotspot.json {b['laju_hotspot_json']:.1%} vs arsip {b['laju_arsip']:.1%} "
         f"({b['irisan']} peristiwa sama dari {b['n_hotspot_json']} dan {b['n_arsip']}). ")
    k += ("Definisi label dan filter deteksi identik pada uji ini, jadi label prospektif TIDAK diubah. " if definisi_sama and filter_sama else
          "Ada selisih definisi/filter yang tercatat di atas. ")
    k += (f"Laju prospektif teramati: {LAJU_PROSPEKTIF_RUJUKAN}. Itu jauh di atas ini, selisihnya BELUM TERJELASKAN oleh label atau filter. "
          "Dugaan yang belum diuji: pemilihan populasi ramalan (hanya titik yang cuacanya terambil dalam kuota Open-Meteo, urutan sel menurut lintang), titik yang tak cocok saat dinilai, dan periode 13-20 Okt yang lebih padat dari 6-9 Okt. "
          "Selama belum terjelaskan, gerbang menolak teruji bila laju prospektif beda lebih dari 2x laju kalibrasi model, kecuali Platt direkalibrasi pada data prospektif.")
    return {"A_label": a, "B_filter_deteksi": b, "definisi_label_sama": definisi_sama, "filter_deteksi_sama": filter_sama, "laju_prospektif_rujukan": LAJU_PROSPEKTIF_RUJUKAN,
            "status_selisih": "belum terjelaskan", "kesimpulan": k}


def main():
    t0 = time.time()
    R = LL.muat()
    fitur, cfg, fitur_u, cfg_u = LL.pilihan(json.load(open(LL.CV)))
    out = {"dibuat": dt.datetime.now(dt.timezone.utc).isoformat()[:16], "jenis": "uji balik historis, bukan uji prospektif",
           "definisi": "lolos = >= 10 sel VIIRS 375 m (~140 ha) dalam 72 jam sejak deteksi pertama (sama dengan prospektif.json)",
           "protokol": "per tahun uji Y: model dilatih tahun <= Y-2, Platt dan ambang recall 70% dari tahun Y-1, dinilai tahun Y; tak ada tahun Y atau sesudahnya di bobot model",
           "catatan": ["cuaca reanalisis ERA5 (prakiraan sempurna), lebih baik dari prakiraan Open-Meteo yang dipakai prospektif: angka optimistis",
                       "fitur & hiperparameter dipilih dengan validasi silang 2015-2023, jadi 2019 dan 2023 sedikit terlihat lewat penyetelan; 2024-2026 sudah pernah dibuka sekali",
                       "model historis dilatih pada data lebih sedikit (2015-Y-2) daripada model terpasang, jadi tidak identik dengan model di layar",
                       "Brier skill memakai laju dasar himpunan yang dinilai sebagai klimatologi (generous ke klimatologi)"],
           "mode": {}}
    for mode, f_, c_ in (("awal", fitur, cfg), ("ulang", fitur_u, cfg_u)):
        hasil = {}
        for th in TAHUN_UJI:
            hasil[th] = lipat(R, th, f_, c_)
            print(mode, th, len(hasil[th][1]), "titik", hasil[th][3], round(time.time() - t0), "dtk", file=sys.stderr, flush=True)
        o = {}
        for nama, ths in KELOMPOK.items():
            pakai = tuple(th for th in ths if hasil[th][3]["kalibrasi_layak"])  # kolam hanya tahun yang Y-1-nya punya >= MIN_LOLOS_KAL api besar
            if not pakai:
                o[nama] = None
                continue
            p, y, w = ([v for th in pakai for v in hasil[th][i]] for i in range(3))
            o[nama] = {**P.metrik_set(p, y, w), "tahun": list(pakai), "tahun_dikecualikan": [th for th in ths if th not in pakai]}
            o[nama]["kalibrasi_ok"] = P.kalibrasi_lolos(o[nama]["kalibrasi"])
        o["per_tahun"] = {}
        for th in TAHUN_UJI:
            o["per_tahun"][str(th)] = {**P.metrik_set(*hasil[th][:3]), **hasil[th][3]}
        out["mode"][mode] = o
    out["ece_maks"], out["skill_min"] = P.ECE_MAKS, P.SKILL_MIN
    out["kelompok_tampil"], out["min_lolos_kalibrasi"] = KELOMPOK_TAMPIL, MIN_LOLOS_KAL
    out["catatan"].append(f"tahun uji yang tahun kalibrasinya (Y-1) punya < {MIN_LOLOS_KAL} api besar ditandai kalibrasi_layak=false (n_lolos_kalibrasi per tahun) dan tidak masuk kelompok gabungan; angka per tahunnya tetap dilaporkan tetapi tidak boleh dibaca sebagai bukti kalibrasi")
    ths_tdk = [str(th) for th in TAHUN_UJI if not out["mode"]["awal"]["per_tahun"][str(th)]["kalibrasi_layak"]]
    out["catatan"].append("tahun tidak layak kalibrasi: " + (", ".join(ths_tdk) or "tidak ada"))
    par = paritas()
    if par:
        out["paritas_label"] = par
        out["catatan"].append(par["kesimpulan"])
    json.dump(out, open(KELUAR, "w"), ensure_ascii=False, separators=(",", ":"))
    print("ditulis", KELUAR, round(time.time() - t0), "dtk", file=sys.stderr)


if __name__ == "__main__":
    if sys.argv[1:] == ["uji"]:
        # lipat() tidak boleh melihat tahun uji atau sesudahnya: bobot (<= Y-2) dan kalibrasi (Y-1) terpisah dari uji (Y)
        R = [(str(i), 2015 + i % 8, "x", "mineral", i % 2, 0, 0, [float(i % 5)]) for i in range(400)]
        LL.D["R"], LL.D["kol"] = R, ["f"]
        ditemui = {}
        asli = LL.latih
        LL.latih = lambda idx, f, c: ditemui.setdefault("tr", {R[i][1] for i in idx}) and asli(idx, f, c)
        p, y, w, meta = lipat(R, 2019, ["f"], {"pohon": 3, "dalam": 2})
        assert ditemui["tr"] == {2015, 2016, 2017} and len(p) == len(y) == len(w) == 50 and meta["n_kalibrasi"] == 50, (ditemui, meta)
        # 1a: tahun kalibrasi dengan < MIN_LOLOS_KAL api besar ditandai tidak layak (2017 hanya 5 positif dari 500; 2016 punya 250)
        R2 = [(f"{th}_{i}", th, "x", "mineral", 1 if i % (100 if th == 2017 else 2) == 0 else 0, 0, 0, [float(i % 5)]) for th in range(2015, 2020) for i in range(500)]
        LL.D["R"] = R2
        LL.latih = asli
        ok, tdk = lipat(R2, 2017, ["f"], {"pohon": 3, "dalam": 2})[3], lipat(R2, 2018, ["f"], {"pohon": 3, "dalam": 2})[3]
        assert ok["kalibrasi_layak"] and ok["n_lolos_kalibrasi"] == 250, ok
        assert not tdk["kalibrasi_layak"] and tdk["n_lolos_kalibrasi"] == 5 and MIN_LOLOS_KAL == 200, tdk
        print("ok")
    elif sys.argv[1:] == ["paritas"]:  # perbarui hanya paritas_label di JSON yang ada (tanpa melatih ulang ~6 menit)
        j = json.load(open(KELUAR))
        par = paritas()
        j["catatan"] = [c for c in j["catatan"] if not c.startswith("paritas label")] + [par["kesimpulan"]]
        j["paritas_label"] = par
        json.dump(j, open(KELUAR, "w"), ensure_ascii=False, separators=(",", ":"))
        print(par["kesimpulan"])
    else:
        main()
