"""Kalibrasi kandidat J4 (PRAREG-J4.md, draf) HANYA pada kejadian kalibrasi lama (2017-01, 2018-01, 2020-01 menyetel; 2021-02 dilaporkan, tidak menyetel).
Kejadian uji lama (2024-08, 2025-04) TIDAK dibuka. Label = petabencana_banjir.json (petabencana.py saring: tipe flood, latihan dibuang). Metrik = skor_j4.py.
Tahap berurutan, greedy; aturan pilih ditulis SEBELUM run (di sini):
  Aturan: dari kandidat yang luas basahnya <= 25% pada TIAP kejadian penyetel, pilih rata-rata AUC tertinggi (bobot kejadian sama, 1/3 tiap kejadian); selisih < 0,005 -> kandidat yang
  lebih dulu dalam daftar (lebih sederhana). AUC (bukan luas basah atau POD) yang memutuskan. Nilai di tepi grid dilaporkan sebagai "tepi".
  1 medan   M0 J3 (rata-rata blok, cekungan 0,5 m) | M1 rata-rata, 0,1 | M2 rata-rata, 1,5 | M3 median blok, 0,5 | M4 median blok, 0,1     (ERA5 x2,0, Kd 2 seperti J3)
  2 hujan   medan terpilih: ERA5 x1,0 | x1,5 | x2,0 | GSMaP harian gauge x bentuk jam ERA5 (gsmap_dis, skala 1)                      (Kd 2)
            PENGECUALIAN aturan AUC (ditulis 28 Okt sesudah melihat tahap 2, dicatat jujur): GSMaP dipilih sebagai sumber UTAMA (perintah pemilik: sumber teramati, bukan kenop skala); aturan AUC murni
            memilih ERA5 x1,0 karena AUC menyukai genangan sempit (hujan efektif 15 Mm3 vs 110 Mm3 GSMaP pada 2017-01), bukan karena hujan lebih benar. Varian ERA5 tetap dilaporkan sebagai cadangan.
  3 Kd      medan+hujan terpilih: Kd seragam {0,5; 1; 2; 3; 5; 8; 12} mm/jam
Mesin tak diubah selain dua opsi opt-in (--agregasi, --cekungan-maks); M0 harus identik dengan raster cache J3 (cek regresi).
Pakai:  python3 scripts/banjir/genangan/kalibrasi_j4.py tahap 1|2|3 | tabel | uji      Keluaran: scripts/banjir/genangan/j4_kalibrasi.json, cache data/raw/banjir/genangan/j4_kal/
"""
import concurrent.futures as cf, hashlib, json, os, subprocess, sys

D = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, D)
import kunci_j3, skor_j3, skor_j4  # noqa: E402

AKAR = kunci_j3.AKAR
KAL = os.path.join(AKAR, "data/raw/banjir/genangan/j4_kal")
J3KAL = os.path.join(AKAR, "data/raw/banjir/genangan/j3_kal")
HASIL = os.path.join(D, "j4_kalibrasi.json")
SETEL, PAGAR = ["2017-01", "2018-01", "2020-01"], ["2021-02"]
MEDAN = {"M0": ("mean", 0.5), "M1": ("mean", 0.1), "M2": ("mean", 1.5), "M3": ("median", 0.5), "M4": ("median", 0.1)}
HUJAN = {"E1.0": ("era5", 1.0), "E1.5": ("era5", 1.5), "E2.0": ("era5", 2.0), "G": ("gsmap_dis", 1.0)}
KD = [0.5, 1, 2, 3, 5, 8, 12]
LUAS_MAKS, IKAT = 0.25, 0.005
PARALEL = 5


def cfg(medan="M0", hujan="E2.0", kd=2):
    return {"medan": medan, "hujan": hujan, "kd": kd}


def nama(c, ev):
    return f"{ev}_{c['medan']}_{c['hujan']}_kd{c['kd']}"


def jalankan_mesin(c, ev):
    """-> jalur raster (cache). Argumen beku J3 (kunci_j3.beku) + opsi kandidat."""
    jalur = os.path.join(KAL, nama(c, ev) + ".raster.gz")
    if os.path.exists(jalur):
        return jalur
    os.makedirs(KAL, exist_ok=True); B = kunci_j3.beku(); agr, cek = MEDAN[c["medan"]]; hj, skala = HUJAN[c["hujan"]]
    a = ["node", os.path.join(D, "mesin.mjs"), "--faktor", str(B["dx_faktor"]), "--jam", str(B["jam"]), "--hujan", hj, "--bentuk", "era5", "--cn", str(B["cn"]), "--muka", str(B["muka"]), "--rentang", str(B["rentang"]),
         "--skala-subsiden", str(B["skala_subsiden"]), "--skala-hulu", str(B["skala_hulu"]), "--radius-hulu-km", str(B["radius_hulu_km"]), "--tanggul", str(B["tanggul_m"]),
         "--agregasi", agr, "--cekungan-maks", str(cek), "--kejadian", ev, "--mulai", B["mulai"][ev], "--skala-hujan", str(skala), "--kd", str(c["kd"]),
         "--raster", jalur + ".tmp", "--keluar", os.path.join(KAL, nama(c, ev) + ".json")]
    subprocess.run(a, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    os.replace(jalur + ".tmp", jalur)
    return jalur


def label(ev, _c={}):
    if ev not in _c:
        _c[ev] = skor_j4.muat_label(kunci_j3.beku()["mulai"][ev], kunci_j3.beku()["jam"])
    return _c[ev]


def metrik(c, ev, jalur=None, kunci=None):
    """Hitung (cache .metrik.json) metrik J4 untuk kandidat c pada kejadian ev."""
    jalur = jalur or jalankan_mesin(c, ev); m = (kunci and os.path.join(KAL, kunci + ".metrik.json")) or jalur.replace(".raster.gz", ".metrik.json")
    if os.path.exists(m):
        return json.load(open(m))
    R = skor_j4.baca_raster(jalur); o = skor_j4.nilai(R, label(ev)); o["n_laporan_dki"] = len(label(ev))
    os.makedirs(os.path.dirname(m), exist_ok=True); json.dump(o, open(m, "w")); return o


def evaluasi(kandidat, evs):
    """kandidat: [cfg] -> {nama_cfg: {ev: metrik}}; run mesin paralel, metrik berurutan."""
    todo = [(c, e) for c in kandidat for e in evs if not os.path.exists(os.path.join(KAL, nama(c, e) + ".raster.gz"))]
    print(f"{len(todo)} run mesin baru (paralel {PARALEL})", file=sys.stderr)
    with cf.ThreadPoolExecutor(PARALEL) as ex:
        list(ex.map(lambda t: jalankan_mesin(*t), todo))
    return {kunci(c): {e: metrik(c, e) for e in evs} for c in kandidat}


def kunci(c):
    return f"{c['medan']}_{c['hujan']}_kd{c['kd']}"


def pilih(tabel, urut):
    """tabel {kunci: {ev: metrik}} (kejadian penyetel); urut = daftar kunci (kesederhanaan). -> kunci terpilih menurut aturan di docstring, dan alasannya."""
    ok = [k for k in urut if all(tabel[k][e]["luas_basah"] <= LUAS_MAKS for e in SETEL)]
    if not ok:
        return None, "tak ada kandidat dengan luas basah <= 25% di semua kejadian penyetel"
    rata = {k: sum(tabel[k][e]["auc"] for e in SETEL) / len(SETEL) for k in ok}; best = max(rata.values())
    k = next(k for k in ok if rata[k] >= best - IKAT)
    return k, f"AUC rata-rata {rata[k]:.3f} (terbaik {best:.3f}; ikat {IKAT})"


def simpan(h):
    json.dump(h, open(HASIL, "w"), indent=1, sort_keys=True)


def muat():
    return json.load(open(HASIL)) if os.path.exists(HASIL) else {}


def cek_regresi():
    """M0 E2.0 Kd2 harus sama dengan raster cache J3 (sidik f0ca9320ea): kedalaman tiap sel identik -> kode J4 tidak mengubah jalur J3."""
    sd = json.load(open(os.path.join(D, "j3_sidik.json")))["sidik"][:10]; out = {}
    for e in SETEL + PAGAR:
        lama = os.path.join(J3KAL, f"{sd}_{e}_s2.0_kd2.raster.gz")
        if not os.path.exists(lama):
            out[e] = "cache J3 tak ada"; continue
        a, b = skor_j3.baca_raster(lama)["hm"], skor_j3.baca_raster(jalankan_mesin(cfg(), e))["hm"]
        out[e] = {"sama": list(a) == list(b), "maks_selisih": max(abs(x - y) for x, y in zip(a, b)) if len(a) == len(b) else None}
    return out


def j3_baseline(evs):
    """Metrik J4 untuk model J3 final (cache j3_kal: s2.0, Kd2, ERA5) dengan label baru."""
    sd = json.load(open(os.path.join(D, "j3_sidik.json")))["sidik"][:10]; out = {}
    for e in evs:
        p = os.path.join(J3KAL, f"{sd}_{e}_s2.0_kd2.raster.gz")
        out[e] = metrik(None, e, jalur=p, kunci="J3_" + e)
    return out


def tahap(n):
    h = muat(); evs = SETEL + PAGAR
    if n == 1:
        kand = [cfg(m) for m in MEDAN]; urut = [kunci(c) for c in kand]
    elif n == 2:
        m = h["tahap1"]["terpilih"].split("_")[0]; kand = [cfg(m, k) for k in HUJAN]; urut = ["%s_%s_kd2" % (m, k) for k in ("G", "E2.0", "E1.5", "E1.0")]
        urut = [u for u in [kunci(c) for c in sorted(kand, key=lambda c: ("G", "E2.0", "E1.5", "E1.0").index(c["hujan"]))]]
    else:
        m, hj = h["tahap2"]["terpilih"].split("_")[:2]; kand = [cfg(m, hj, kd) for kd in KD]; urut = [kunci(c) for c in sorted(kand, key=lambda c: -c["kd"])]
    tab = evaluasi(kand, evs); k, alasan = pilih(tab, urut)
    if n == 2:
        murni, k = k, kunci(cfg(kand[0]["medan"], "G")); alasan = f"GSMaP (pengecualian terdokumentasi); aturan AUC murni memilih {murni}: {alasan}"
    h[f"tahap{n}"] = {"tabel": tab, "terpilih": k, "alasan": alasan}
    if n == 1:
        h["regresi_j3"] = cek_regresi(); h["j3"] = j3_baseline(evs)
    if n == 3 and k:
        kd = float(k.split("kd")[1]); h["tahap3"]["tepi"] = kd in (min(KD), max(KD))
    simpan(h); print(n, k, alasan)


def cetak():
    h = muat(); evs = SETEL + PAGAR
    f = lambda m, k: f"{m[k]:.3f}" if m.get(k) is not None else "-"
    print("kejadian | model | n_lap | luas | AUC | POD | POFD | HSS | HSS null b5 p95 (p) | b10 p95 (p) | basah_di_diangkat/dasar")
    for t in ("tahap1", "tahap2", "tahap3"):
        for k, v in h.get(t, {}).get("tabel", {}).items():
            for e in evs:
                m = v[e]; n5, n10 = m["null"]["b5"], m["null"]["b10"]
                print(f"{e} | {t}:{k} | {m['n_laporan']} | {f(m,'luas_basah')} | {f(m,'auc')} | {f(m,'pod')} | {f(m,'pofd')} | {f(m,'hss')} | {n5['hss_p95']:.3f} ({n5['p_hss']:.2f}) | {n10['hss_p95']:.3f} ({n10['p_hss']:.2f}) | {f(m,'basah_di_diangkat')}/{f(m,'darat_diangkat')}")
    for e, m in h.get("j3", {}).items():
        n5, n10 = m["null"]["b5"], m["null"]["b10"]
        print(f"{e} | J3 | {m['n_laporan']} | {f(m,'luas_basah')} | {f(m,'auc')} | {f(m,'pod')} | {f(m,'pofd')} | {f(m,'hss')} | {n5['hss_p95']:.3f} ({n5['p_hss']:.2f}) | {n10['hss_p95']:.3f} ({n10['p_hss']:.2f}) | -")


def uji():
    t = {"a": {e: {"luas_basah": .1, "auc": .60} for e in SETEL}, "b": {e: {"luas_basah": .1, "auc": .603} for e in SETEL}, "c": {e: {"luas_basah": .3, "auc": .9} for e in SETEL}, "d": {e: {"luas_basah": .1, "auc": .70} for e in SETEL}}
    assert pilih(t, ["a", "b", "c"]) == ("a", "AUC rata-rata 0.600 (terbaik 0.603; ikat 0.005)"), pilih(t, ["a", "b", "c"])     # ikat -> yang lebih sederhana; luas > 25% tersingkir
    assert pilih(t, ["c"])[0] is None and pilih(t, ["a", "b", "d"])[0] == "d"
    assert nama(cfg("M3", "G", 0.5), "2020-01") == "2020-01_M3_G_kd0.5" and kunci(cfg()) == "M0_E2.0_kd2"
    B = kunci_j3.beku(); assert set(SETEL + PAGAR) == set(B["kalibrasi"] + B["pagar"]) and not set(SETEL + PAGAR) & set(B["uji"]), "kejadian uji lama tak boleh dipakai"
    assert 0.5 in KD and 1 in KD and set(HUJAN) >= {"G", "E2.0"}
    print("ok")


if __name__ == "__main__":
    a = sys.argv[1:]
    if a == ["uji"]:
        uji()
    elif a[:1] == ["tahap"] and a[1:2] in (["1"], ["2"], ["3"]):
        tahap(int(a[1]))
    elif a == ["tabel"]:
        cetak()
    else:
        sys.exit(__doc__)
