"""Kalibrasi kandidat J4 (PRAREG-J4.md, draf) HANYA pada kejadian kalibrasi lama (2017-01, 2018-01, 2020-01 menyetel; 2021-02 dilaporkan, tidak menyetel).
Kejadian uji lama (2024-08, 2025-04) TIDAK dibuka. Label = petabencana_banjir.json (petabencana.py saring: tipe flood, latihan dibuang). Metrik = skor_j4.py.
Tahap berurutan, greedy; aturan pilih ditulis SEBELUM run (di sini):
  Aturan: dari kandidat yang luas basahnya <= 25% pada TIAP kejadian penyetel, pilih rata-rata AUC tertinggi (bobot kejadian sama, 1/3 tiap kejadian); selisih < 0,005 -> kandidat yang
  lebih dulu dalam daftar (lebih sederhana). AUC (bukan luas basah atau POD) yang memutuskan. Nilai di tepi grid dilaporkan sebagai "tepi".
  ARAH TIE-BREAK (eksplisit): `pilih` mengambil kandidat PERTAMA dalam daftar `urut` yang AUC rata-ratanya >= terbaik - 0,005. Urutan: tahap 1 M0..M4 (paling sederhana dulu); tahap 2 G, E2.0, E1.5, E1.0;
  tahap 3 Kd TERBESAR dulu (12, 8, 5, 3, 2, 1, 0,5): bila AUC tak dapat dibedakan, dipilih drainase paling kuat (genangan paling sempit). Ini BUKAN "paling sederhana" tapi arah yang sama dengan
  bias AUC (menyukai genangan sempit); sebab itu Kd dilaporkan sebagai tidak tertentu (AUC datar 0,598 sampai 0,606) dan seluruh tabel tahap 3 dilampirkan di PRAREG-J4.
  Konfigurasi, X, dan aturan saring dibekukan di BEKU (python3 kalibrasi_j4.py beku) dan PRAREG-J4.md bagian 9.
  1 medan   M0 J3 (rata-rata blok, cekungan 0,5 m) | M1 rata-rata, 0,1 | M2 rata-rata, 1,5 | M3 median blok, 0,5 | M4 median blok, 0,1     (ERA5 x2,0, Kd 2 seperti J3)
  2 hujan   medan terpilih: ERA5 x1,0 | x1,5 | x2,0 | GSMaP harian gauge x bentuk jam ERA5 (gsmap_dis, skala 1)                      (Kd 2)
            PENGECUALIAN aturan AUC (ditulis 28 Okt sesudah melihat tahap 2, dicatat jujur): GSMaP dipilih sebagai sumber UTAMA (perintah pemilik: sumber teramati, bukan kenop skala); aturan AUC murni
            memilih ERA5 x1,0 karena AUC menyukai genangan sempit (hujan efektif 15 Mm3 vs 110 Mm3 GSMaP pada 2017-01), bukan karena hujan lebih benar. Varian ERA5 tetap dilaporkan sebagai cadangan.
  3 Kd      medan+hujan terpilih: Kd seragam {0,5; 1; 2; 3; 5; 8; 12} mm/jam
Mesin tak diubah selain dua opsi opt-in (--agregasi, --cekungan-maks); M0 harus identik dengan raster cache J3 (cek regresi).
Pembanding wajib: heuristik elevasi terendah dalam 300 m (skor_j4.nilai, kontrol sama) -> "heuristik" di tiap metrik. Klaim: keterampilan relatif terhadap bias lokasi pelapor, bukan akurasi.
Pakai:  python3 scripts/banjir/genangan/kalibrasi_j4.py tahap 1|2|3 | tabel | laju | sensitivitas | daya | beku | uji      Keluaran: scripts/banjir/genangan/j4_kalibrasi.json, cache data/raw/banjir/genangan/j4_kal/
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
X, X2 = 34, 30            # ambang hari pemicu (mm, rata-rata 42 kecamatan); turunan di laju(); PRAREG-J4.md bagian 2
BEKU = {"medan": "M0", "hujan": "G", "kd": 8, "x_mm": X, "x2_mm": X2, "ambang_basah_m": skor_j3.AMBANG, "radius_m": skor_j3.RADIUS, "n_kontrol": skor_j4.N_KONTROL, "benih": skor_j4.BENIH,
        "n_null": skor_j4.N_NULL, "blok_null": list(skor_j4.BLOK), "min_laporan": skor_j4.MIN_LAPORAN, "luas_maks": LUAS_MAKS, "ikat": IKAT, "urut_kd": "terbesar dulu"}


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
    R = skor_j4.baca_raster(jalur); R["z"] = skor_j4.muat_z(R); o = skor_j4.nilai(R, label(ev)); o["n_laporan_dki"] = len(label(ev))
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
    h["tanpa_label"] = {e: len(label(e)) for e in evs if len(label(e)) < skor_j4.MIN_LAPORAN}   # kejadian < 10 laporan: dibuang dari AUC/HSS, dicatat terbuka (kosong = tak ada)
    if n == 1:
        h["regresi_j3"] = cek_regresi(); h["j3"] = j3_baseline(evs)
    if n == 3 and k:
        kd = float(k.split("kd")[1]); h["tahap3"]["tepi"] = kd in (min(KD), max(KD))
    simpan(h); print(n, k, alasan)


def laju(xs=(30, 32, 34, 35, 36, 38, 40)):
    """Laju kejadian per musim Nov-Apr dari GSMaP harian v8 (gsmap_harian.json) dirata-ratakan di 42 kecamatan daratan DKI (sel 0,1 derajat terdekat titik pusat kecamatan, pemicu.sel_gsmap);
    hanya musim lengkap (>= 180 hari). Aturan kejadian = skor_j4.pilih_kejadian (run berturut-turut = 1, jendela tak tumpang tindih). CATATAN: arsip NRT per kecamatan (m1_hujan.jsonl) baru 2 hari, jadi
    ini produk gauge-adjusted v8, bukan NRT; NRT cenderung meremehkan puncak, jadi laju operasional bisa lebih rendah."""
    import collections, datetime as dt, gsmap, pemicu
    g, _ = gsmap.muat_harian(); kecs = [k for k in pemicu.kecamatan() if "Seribu" not in k[0]]; idx = [pemicu.sel_gsmap(g, la, lo)[0] for _, la, lo in kecs]
    mus = collections.defaultdict(list)
    for t, v in sorted(g["hari"].items()):
        x = [v[i] for i in idx]
        d = dt.date.fromisoformat(t)
        if None not in x and d.month in (11, 12, 1, 2, 3, 4):
            mus[d.year if d.month >= 11 else d.year - 1].append((t, sum(x) / len(x)))
    mus = {y: v for y, v in sorted(mus.items()) if len(v) >= 180}; hari = sorted(m for v in mus.values() for _, m in v)
    o = {"n_kecamatan": len(kecs), "musim": [f"{y}/{y + 1}" for y in mus], "n_hari": len(hari), "sumber": "GSMaP v8 gauge harian, bukan NRT",
         "persentil_mm": {p: round(hari[int(p / 100 * len(hari))], 1) for p in (90, 95, 97, 98, 99)}, "per_x": {}}
    for x in xs:
        per = {}
        for y, v in mus.items():
            k, b = skor_j4.pilih_kejadian(v, x); per[y] = {"kejadian": len(k), "dibuang_tumpang_tindih": len(b)}
        n = [p["kejadian"] for p in per.values()]
        o["per_x"][str(x)] = {"per_musim": [p["kejadian"] for p in per.values()], "rata": round(sum(n) / len(n), 2), "musim_ge6": sum(i >= 6 for i in n), "dibuang": sum(p["dibuang_tumpang_tindih"] for p in per.values())}
    h = muat(); h["laju"] = o; simpan(h); print(json.dumps(o, indent=1))


def sensitivitas():
    """Metrik model terpilih (BEKU) dan J3 dengan label TERSARING lawan label tanpa saring (hanya tipe flood, dedup): vonis harus dilaporkan dua-duanya."""
    h = muat(); evs = SETEL + PAGAR; c = cfg(BEKU["medan"], BEKU["hujan"], BEKU["kd"]); sd = json.load(open(os.path.join(D, "j3_sidik.json")))["sidik"][:10]; out = {}
    B = kunci_j3.beku()
    for nama_m, jalur in (("J4", lambda e: jalankan_mesin(c, e)), ("J3", lambda e: os.path.join(J3KAL, f"{sd}_{e}_s2.0_kd2.raster.gz"))):
        out[nama_m] = {}
        for e in evs:
            R = skor_j4.baca_raster(jalur(e)); R["z"] = skor_j4.muat_z(R); out[nama_m][e] = {}
            for mode, lab in (("tersaring", label(e)), ("tanpa_saring", skor_j4.muat_label(B["mulai"][e], B["jam"], tanpa_saring=True))):
                m = skor_j4.nilai(R, lab); m.pop("null", None)
                out[nama_m][e][mode] = {k: m.get(k) for k in ("n_laporan", "auc", "hss", "pod", "pofd", "heuristik")}
    h["sensitivitas_saring"] = out; simpan(h)
    for nm, d in out.items():
        for e, v in d.items():
            print(nm, e, {md: (x["n_laporan"], round(x["auc"], 3), round(x["hss"], 3), round(x["heuristik"]["auc"], 3)) for md, x in v.items()})


def daya():
    h = muat(); h["daya"] = skor_j4.daya(); simpan(h); print(json.dumps(h["daya"], indent=1))


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


def petabencana_pola():
    import petabencana
    return petabencana.RE_AWAL.pattern, petabencana.RE_KATA.pattern, petabencana.RE_MINTA.pattern, petabencana.BURST_MAKS


def uji():
    t = {"a": {e: {"luas_basah": .1, "auc": .60} for e in SETEL}, "b": {e: {"luas_basah": .1, "auc": .603} for e in SETEL}, "c": {e: {"luas_basah": .3, "auc": .9} for e in SETEL}, "d": {e: {"luas_basah": .1, "auc": .70} for e in SETEL}}
    assert pilih(t, ["a", "b", "c"]) == ("a", "AUC rata-rata 0.600 (terbaik 0.603; ikat 0.005)"), pilih(t, ["a", "b", "c"])     # ikat -> yang lebih sederhana; luas > 25% tersingkir
    assert pilih(t, ["c"])[0] is None and pilih(t, ["a", "b", "d"])[0] == "d"
    assert nama(cfg("M3", "G", 0.5), "2020-01") == "2020-01_M3_G_kd0.5" and kunci(cfg()) == "M0_E2.0_kd2"
    B = kunci_j3.beku(); assert set(SETEL + PAGAR) == set(B["kalibrasi"] + B["pagar"]) and not set(SETEL + PAGAR) & set(B["uji"]), "kejadian uji lama tak boleh dipakai"
    assert 0.5 in KD and 1 in KD and set(HUJAN) >= {"G", "E2.0"}
    assert pilih({"kd8": {e: {"luas_basah": .1, "auc": .600} for e in SETEL}, "kd12": {e: {"luas_basah": .1, "auc": .603} for e in SETEL}}, ["kd12", "kd8"])[0] == "kd12"   # tie-break: yang lebih dulu di urut (Kd terbesar) menang
    assert BEKU["x_mm"] == X and BEKU["min_laporan"] == 10 and petabencana_pola()[2]
    print("ok")


if __name__ == "__main__":
    a = sys.argv[1:]
    if a == ["uji"]:
        uji()
    elif a[:1] == ["tahap"] and a[1:2] in (["1"], ["2"], ["3"]):
        tahap(int(a[1]))
    elif a == ["tabel"]:
        cetak()
    elif a == ["laju"]:
        laju()
    elif a == ["sensitivitas"]:
        sensitivitas()
    elif a == ["daya"]:
        daya()
    elif a == ["beku"]:
        print(json.dumps({**BEKU, "saring": {"awal": petabencana_pola()[0], "kata": petabencana_pola()[1], "minta": petabencana_pola()[2], "burst_maks": petabencana_pola()[3]}}, indent=1, ensure_ascii=False))
    else:
        sys.exit(__doc__)
