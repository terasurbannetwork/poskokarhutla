"""Uji balik skor prioritas sumber daya (rancangan & syarat lolos: docs/riset/SKOR-PRIORITAS.md, dibekukan 23 Okt 2026).

Satuan = titik api BARU pada lintasan pertama (baris lolos_baris.pkl, peristiwa.jsonl) 2015-2023 dengan peluang membesar
LUAR-LIPATAN (lolos_peluang.pkl: konfigurasi produksi "B: A + konteks titik sekitar", dalam 5, 150 pohon, lr 0,06, Platt dari
luar-lipatan; model tidak pernah melihat tahun yang dinilai). Kelompok keputusan = (provinsi, hari WIB deteksi pertama).

Hasil D = jumlah FRP seluruh deteksi peristiwa x K_GAMBUT bila gambut (K_GAMBUT 1, 3, 5; utama 3).
Skor: S0 = tiruan aturan.py (level status lalu aturan.skor), S1 = p, S2 = p x paparan, Orakel = D.
Ukuran: tangkap@K (rata-rata per kelompok dari D tertangkap / D orakel K teratas) dan recall@K (porsi peristiwa 10% D
teratas tahun itu yang masuk K teratas hari itu, dijumlah lintas kelompok); K = 5, 10; hanya kelompok >= K+1 peristiwa.
Seri pada skor dibagi rata (harapan di bawah urutan acak), jadi skor kasar S0 tidak diuntungkan oleh urutan berkas.

Pakai:  python3 scripts/sebaran/prioritas.py [jalan] | v2 (sekali; pendaftaran v2) | uji
"""
import json, math, os, pickle, random, sys, time

DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, DIR)
from umum import MENTAH, PUBLIK  # noqa: E402  (umum juga menaruh scripts/data di sys.path)
import aturan as A  # noqa: E402

CACHE = os.path.join(MENTAH, "prioritas_cache.pkl")
KELUAR = os.path.join(PUBLIK, "prioritas_uji.json")
TAHUN = range(2015, 2024)
K_GAMBUT = (1, 3, 5)
K_UTAMA = 3
W_JIWA = (0.0, 0.5, 1.0)
W_UTAMA = 0.5
KS = (5, 10)
BOOT, SEED = 1000, 23
HARI_MIN_PROV = 30  # syarat: tidak kalah dari S0 di provinsi dengan >= 30 hari-keputusan
SELISIH_MIN = 0.10


def log(*a):
    print(time.strftime("%H:%M:%S"), *a, file=sys.stderr, flush=True)


# ---------------- data ----------------
LINTAS1 = 30  # menit: deteksi dalam 30 menit dari deteksi pertama = lintasan pertama (sama dengan lolos.baris 'pertama')


def d72(det):
    """FRP deteksi SESUDAH lintasan pertama sampai 72 jam: p + 30 < t <= p + 72 jam (v2). det urut naik waktu."""
    p = det[0][0]
    return sum(x[2] for x in det if p + LINTAS1 < x[0] <= p + 72 * 60)


def bangun_cache(tahun=TAHUN, path=CACHE):
    d = pickle.load(open(os.path.join(MENTAH, "lolos_baris.pkl"), "rb"))
    kol = d["kolom"]
    c = {f: kol.index(f) for f in ("n0", "frp_jml0", "fwi", "isi_maks", "dc", "gambut", "penduduk_km2")}
    P = pickle.load(open(os.path.join(MENTAH, "lolos_peluang.pkl"), "rb"))
    E = {}
    for r in d["baris"]:
        if r[1] in tahun:
            E[r[0]] = {"th": r[1], "prov": r[2], "st": r[3], "lolos": r[4], "p": P[r[0]], **{f: r[7][j] for f, j in c.items()}}
    del d
    log(f"{len(E)} baris {min(tahun)}-{max(tahun)}; membaca peristiwa.jsonl")
    sisa, t_akhir = len(E), -math.inf
    for l in open(os.path.join(MENTAH, "peristiwa.jsonl")):
        i = l[7:15]  # {"id":"E0000001",...
        e = E.get(i)
        if e is None:
            continue
        det = json.loads(l)["det"]
        p = det[0][0]
        e["frp_hidup"] = sum(x[2] for x in det)
        e["frp_sesudah"] = sum(x[2] for x in det if x[0] - p > LINTAS1)
        e["d72"] = d72(det)
        e["t0m"] = p
        t_akhir = max(t_akhir, det[-1][0])
        e["ndet0"] = sum(1 for x in det if x[0] - p <= LINTAS1)  # deteksi lintasan pertama (sama dengan 'pertama' di lolos.baris)
        e["hari"] = (p + 7 * 60) // 1440  # hari WIB (UTC+7) sejak 2015-01-01
        sisa -= 1
    assert sisa == 0, f"{sisa} peristiwa tidak ditemukan di peristiwa.jsonl"
    E = {"_akhir": t_akhir, **E}
    pickle.dump(E, open(path, "wb"), protocol=pickle.HIGHEST_PROTOCOL)
    return E


def muat(tahun=TAHUN, path=CACHE):
    """-> (peristiwa {id: ...}, menit deteksi terakhir di himpunan itu)."""
    E = pickle.load(open(path, "rb")) if os.path.exists(path) else bangun_cache(tahun, path)
    return E, E.pop("_akhir", None)


# ---------------- skor ----------------
def skor_s0(e):
    """Tiruan harian.py + aturan.py pada lintasan pertama: level status (keparahan x kelas FWI, naik ke 3 bila prioritas)
    lalu aturan.skor di dalam level. px24 = sel lintasan pertama, frp24 = jumlah FRP lintasan pertama, hari_aktif = 1,
    ISI = isi_maks jendela cuaca, DC hanya di gambut (seperti harian.py), jarak Daops & risiko riwayat tidak ada -> 0."""
    px, fwi = e["n0"], e["fwi"]
    sev = A.keparahan(e["ndet0"], 1, e["ndet0"], 0, px)
    lv = A.status(A.kelas_fwi(fwi), sev)
    if lv == 2 and A.prioritas(px, fwi):
        lv = 3
    return lv * 1e6 + skor_aturan(e)


def skor_aturan(e):
    """aturan.skor saja (tanpa level), masukan sama dengan S0; dipakai S3/S4 v2."""
    return A.skor(e["n0"], e["frp_jml0"], 1, e["isi_maks"], e["dc"] if e["gambut"] else 0, 0)


def paparan(e, kg, w, jiwa_maks):
    jiwa = math.log1p(max(0.0, e["penduduk_km2"])) / jiwa_maks
    return (kg if e["gambut"] else 1) * (1 + w * jiwa)


# ---------------- metrik ----------------
def ambil_k(skor, nilai, k):
    """Jumlah nilai pada K teratas menurut skor; seri di batas dibagi rata (harapan urutan acak)."""
    if k >= len(skor):
        return float(sum(nilai))
    s_k = sorted(skor, reverse=True)[k - 1]
    atas = sum(v for s, v in zip(skor, nilai) if s > s_k)
    n_atas = sum(1 for s in skor if s > s_k)
    seri = [v for s, v in zip(skor, nilai) if s == s_k]
    return atas + (k - n_atas) / len(seri) * sum(seri)


def tangkap(skor, d, k):
    o = sum(sorted(d, reverse=True)[:k])
    return ambil_k(skor, d, k) / o if o > 0 else None


def boot_blok(blok, fungsi, n=BOOT, seed=SEED):
    """blok: daftar agregat per (tahun, provinsi); fungsi(daftar blok) -> angka. -> [nilai, bawah 2,5%, atas 97,5%]."""
    rnd = random.Random(seed)
    m = len(blok)
    v = sorted(x for x in (fungsi([blok[rnd.randrange(m)] for _ in range(m)]) for _ in range(n)) if x is not None)
    return [round(fungsi(blok), 4), round(v[int(.025 * len(v))], 4), round(v[min(len(v) - 1, int(.975 * len(v)))], 4)]


# ---------------- uji balik ----------------
def nilai_kelompok(G, skor, hasil, atas, k):
    """Per kelompok: (blok, tangkap, recall pembilang, penyebut) untuk tiap skor. G: {kunci: [peristiwa]}."""
    out = []
    for kunci, es in G.items():
        if len(es) < k + 1:
            continue
        d = [hasil(e) for e in es]
        t = [e["_id"] in atas for e in es]
        row = {"blok": (es[0]["th"], es[0]["prov"]), "prov": es[0]["prov"], "th": es[0]["th"], "den": sum(t)}
        for nama, f in skor.items():
            s = [f(e) for e in es]
            row[nama] = (tangkap(s, d, k), ambil_k(s, t, k))
        out.append(row)
    return out


def ringkas(rows, nama_skor, beda=None):
    """Bootstrap blok tahun x provinsi untuk tangkap (rata-rata per kelompok) & recall (jumlah); beda = (a, b) selisih a-b."""
    blok = {}
    for r in rows:
        b = blok.setdefault(r["blok"], {"n": 0, "den": 0, **{s: [0.0, 0.0, 0] for s in nama_skor}})
        b["n"] += 1
        b["den"] += r["den"]
        for s in nama_skor:
            if r[s][0] is not None:
                b[s][0] += r[s][0]
                b[s][2] += 1
            b[s][1] += r[s][1]
    B = list(blok.values())
    t = lambda s: (lambda bs: sum(b[s][0] for b in bs) / max(1, sum(b[s][2] for b in bs)))
    rc = lambda s: (lambda bs: sum(b[s][1] for b in bs) / sum(b["den"] for b in bs) if sum(b["den"] for b in bs) else None)
    out = {"hari_keputusan": len(rows), "blok": len(B), "api_10persen": sum(r["den"] for r in rows)}
    if not B:
        return out
    for s in nama_skor:
        out[s] = {"tangkap": boot_blok(B, t(s)), "recall": boot_blok(B, rc(s)) if out["api_10persen"] else None}
    if beda:
        a, b = beda
        out[f"{a}-{b}"] = {"tangkap": boot_blok(B, lambda bs: t(a)(bs) - t(b)(bs)),
                           "recall": boot_blok(B, lambda bs: (rc(a)(bs) or 0) - (rc(b)(bs) or 0)) if out["api_10persen"] else None}
    return out


def jalan():
    t0 = time.time()
    E, _ = muat()
    for i, e in E.items():
        e["_id"] = i
    jm = math.log1p(max(e["penduduk_km2"] for e in E.values()))
    for e in E.values():
        e["s0"] = skor_s0(e)
    log(f"{len(E)} peristiwa siap, {round(time.time() - t0)} dtk")
    G = {}
    for e in E.values():
        G.setdefault((e["prov"], e["hari"]), []).append(e)

    def hasil_d(kg):
        return lambda e: e["frp_hidup"] * (kg if e["gambut"] else 1)

    def atas10(hasil):
        """Id peristiwa dengan D >= persentil 90 tahunnya (semua peristiwa tahun itu)."""
        out = set()
        for th in TAHUN:
            es = [e for e in E.values() if e["th"] == th]
            v = sorted(hasil(e) for e in es)
            q = v[int(.9 * len(v))]
            out |= {e["_id"] for e in es if hasil(e) >= q}
        return out

    def skor_set(kg):
        s = {"S0": lambda e: e["s0"], "S1": lambda e: e["p"]}
        for w in W_JIWA:
            s[f"S2_w{w}"] = (lambda w_: lambda e: e["p"] * paparan(e, kg, w_, jm))(w)
        return s

    H = {"dibuat": time.strftime("%Y-%m-%d"), "rancangan": "docs/riset/SKOR-PRIORITAS.md (v1, dibekukan 23 Okt 2026)",
         "model": "lolos_peluang.pkl: luar-lipatan 2015-2023, konfigurasi produksi B (dalam 5, 150 pohon, lr 0,06), Platt luar-lipatan",
         "n_peristiwa": len(E), "n_lolos": sum(e["lolos"] for e in E.values()), "n_kelompok": len(G),
         "tangkap_definisi": "rata-rata per hari-keputusan dari D(K teratas skor) / D(K teratas orakel); seri dibagi rata",
         "recall_definisi": "jumlah peristiwa 10% D teratas tahunnya yang masuk K teratas hari itu / jumlah peristiwa itu (kelompok >= K+1)",
         "s0_definisi": skor_s0.__doc__.strip(), "jiwa": "log1p(penduduk/km2) / log1p(maks 2015-2023)",
         "hasil": {}}
    for kg in K_GAMBUT:
        hasil = hasil_d(kg)
        atas = atas10(hasil)
        sk = {**skor_set(kg), "Orakel": hasil}
        for k in KS:
            rows = nilai_kelompok(G, sk, hasil, atas, k)
            H["hasil"][f"kg{kg}_K{k}"] = ringkas(rows, list(sk), beda=(f"S2_w{W_UTAMA}", "S0"))
            log(f"K_GAMBUT {kg} K {k}: {len(rows)} hari-keputusan, {round(time.time() - t0)} dtk")
            if kg == K_UTAMA and k == 10:
                utama_rows = rows
    # hasil sekunder pada K_GAMBUT utama: label lolos dan D ditimbang penduduk
    sk = skor_set(K_UTAMA)
    nm = ["S0", "S1", f"S2_w{W_UTAMA}"]
    hl = lambda e: float(e["lolos"])
    H["sekunder"] = {}
    for nama, hasil in (("lolos", hl), ("D_jiwa", lambda e: hasil_d(K_UTAMA)(e) * (1 + math.log1p(max(0.0, e["penduduk_km2"])) / jm))):
        atas = {e["_id"] for e in E.values() if e["lolos"]} if nama == "lolos" else atas10(hasil)
        rows = nilai_kelompok(G, {**{n: sk[n] for n in nm}, "Orakel": hasil}, hasil, atas, 10)
        H["sekunder"][nama] = ringkas(rows, nm + ["Orakel"], beda=(f"S2_w{W_UTAMA}", "S0"))
    H["sekunder"]["lolos"]["catatan"] = "D = label lolos (0/1); recall = porsi api lolos yang masuk 10 teratas hari itu"
    # DIAGNOSTIK (di luar rancangan beku, tidak ikut vonis): D tanpa FRP lintasan pertama, yang juga masuk ke S0
    hs = lambda e: max(0.0, e["frp_hidup"] - e["frp_jml0"]) * (K_UTAMA if e["gambut"] else 1)
    rows = nilai_kelompok(G, {**{n: sk[n] for n in nm}, "Orakel": hs}, hs, atas10(hs), 10)
    H["diagnostik_D_sesudah_lintasan1"] = {**ringkas(rows, nm + ["Orakel"], beda=(f"S2_w{W_UTAMA}", "S0")),
                                           "catatan": "eksplorasi sesudah melihat hasil, BUKAN syarat lolos: D dikurangi FRP lintasan pertama"}
    # rincian utama (K_GAMBUT 3, K 10)
    nm = ["S0", "S1", f"S2_w{W_UTAMA}", "Orakel"]
    pilih = lambda f: [r for r in utama_rows if f(r)]
    H["per_provinsi"] = {p: ringkas(pilih(lambda r: r["prov"] == p), nm) for p in sorted({r["prov"] for r in utama_rows})}
    H["per_tahun"] = {th: ringkas(pilih(lambda r: r["th"] == th), nm) for th in TAHUN}
    hasil, atas = hasil_d(K_UTAMA), atas10(hasil_d(K_UTAMA))
    sk = {**{n: skor_set(K_UTAMA)[n] for n in nm[:3]}, "Orakel": hasil}
    H["per_lahan"] = {}
    for st in ("gambut", "mineral", "sabana"):
        Gs = {}
        for e in E.values():
            if e["st"] == st:
                Gs.setdefault((e["prov"], e["hari"]), []).append(e)
        H["per_lahan"][st] = ringkas(nilai_kelompok(Gs, sk, hasil, atas, 10), nm)
    H["per_lahan_catatan"] = "hari-keputusan dibentuk hanya dari peristiwa lahan itu; 10% teratas tetap dari semua lahan"
    # vonis (syarat dibekukan): S2 - S0 tangkap@10 >= 10 poin, batas bawah > 0, tidak kalah di provinsi >= 30 hari-keputusan
    u = H["hasil"][f"kg{K_UTAMA}_K10"]
    d = u[f"S2_w{W_UTAMA}-S0"]["tangkap"]
    kalah = [{"prov": p, "hari_keputusan": v["hari_keputusan"], "S0": v["S0"]["tangkap"][0], "S2": v[f"S2_w{W_UTAMA}"]["tangkap"][0]}
             for p, v in H["per_provinsi"].items() if v["hari_keputusan"] >= HARI_MIN_PROV and v[f"S2_w{W_UTAMA}"]["tangkap"][0] < v["S0"]["tangkap"][0]]
    syarat = {"selisih_10_poin": d[0] >= SELISIH_MIN, "batas_bawah_positif": d[1] > 0, "tidak_kalah_per_provinsi": not kalah}
    H["vonis"] = {"lolos": all(syarat.values()), "teks": "LOLOS" if all(syarat.values()) else "GAGAL", "syarat": syarat,
                  "selisih_tangkap10": d, "provinsi_kalah": kalah, "konfigurasi": f"K_GAMBUT {K_UTAMA}, w_jiwa {W_UTAMA}, K 10"}
    H["detik"] = round(time.time() - t0)
    json.dump(H, open(KELUAR, "w"), ensure_ascii=False, indent=1)
    log("vonis", json.dumps(H["vonis"], ensure_ascii=False), H["detik"], "dtk")


TAHUN_V2 = range(2024, 2027)
CACHE_V2 = os.path.join(MENTAH, "prioritas_cache_v2.pkl")


def jalan_v2():
    """Pendaftaran v2 (docs/riset/SKOR-PRIORITAS.md, commit 2bda0206): hasil D72, kandidat S4, uji 2024-2026 SEKALI.
    Peluang 2024+ = p_uji di lolos_peluang.pkl: model konfigurasi produksi dilatih pada cvi (tahun 2015-2023, lolos.py
    akhir()), Platt + ambang dari luar-lipatan 2015-2023; bukan model ekspor (yang dilatih ulang pada semua tahun)."""
    H = json.load(open(KELUAR))
    assert "v2" not in H, "v2 sudah pernah dijalankan: pendaftaran mengizinkan SATU kali"
    t0 = time.time()
    E, akhir = muat(TAHUN_V2, CACHE_V2)
    batas = akhir - 72 * 60
    n_awal = len(E)
    E = {i: e for i, e in E.items() if e["t0m"] <= batas}  # jendela 72 jam harus teramati penuh di arsip
    for i, e in E.items():
        e["_id"] = i
    jm = math.log1p(max(e["penduduk_km2"] for e in E.values()))
    G = {}
    for e in E.values():
        G.setdefault((e["prov"], e["hari"]), []).append(e)
    kg = K_UTAMA
    gam = lambda e: kg if e["gambut"] else 1
    pap = lambda e: paparan(e, kg, W_UTAMA, jm)
    sk = {"S0": skor_s0, "S1": lambda e: e["p"], "S2": lambda e: e["p"] * pap(e), "S3": lambda e: skor_aturan(e) * e["p"],
          "S4": lambda e: skor_aturan(e) * e["p"] * pap(e)}

    def atas10(hasil):
        out = set()
        for th in TAHUN_V2:
            es = [e for e in E.values() if e["th"] == th]
            v = sorted(hasil(e) for e in es)
            out |= {e["_id"] for e in es if hasil(e) >= v[int(.9 * len(v))]} if v else set()
        return out

    nm = list(sk) + ["Orakel"]
    out = {"pendaftaran": "docs/riset/SKOR-PRIORITAS.md 'Pendaftaran v2' (commit 2bda0206, sebelum dijalankan)", "dibuat": time.strftime("%Y-%m-%d"),
           "model": jalan_v2.__doc__.split("\n", 1)[1].strip(), "n_peristiwa": len(E), "dibuang_jendela_72j_terpotong": n_awal - len(E),
           "arsip_akhir_menit": akhir, "n_lolos": sum(e["lolos"] for e in E.values()), "n_kelompok": len(G),
           "per_tahun_n": {th: sum(1 for e in E.values() if e["th"] == th) for th in TAHUN_V2},
           "d72_definisi": d72.__doc__.strip(), "s3_s4": "aturan.skor (masukan S0, tanpa level) x p [x paparan K_GAMBUT 3, w_jiwa 0,5]",
           "hasil": {}}
    hasil_d72 = lambda e: e["d72"] * gam(e)
    for nama, hasil, atas in (("D72", hasil_d72, None), ("sesudah_hidup", lambda e: e["frp_sesudah"] * gam(e), None),
                              ("lolos", lambda e: float(e["lolos"]), {e["_id"] for e in E.values() if e["lolos"]})):
        atas = atas if atas is not None else atas10(hasil)
        for k in KS:
            rows = nilai_kelompok(G, {**sk, "Orakel": hasil}, hasil, atas, k)
            out["hasil"][f"{nama}_K{k}"] = ringkas(rows, nm, beda=("S4", "S0"))
            if nama == "D72" and k == 10:
                utama = rows
        log(nama, round(time.time() - t0), "dtk")
    out["per_provinsi"] = {p: ringkas([r for r in utama if r["prov"] == p], nm, beda=("S4", "S0")) for p in sorted({r["prov"] for r in utama})}
    out["per_tahun"] = {th: ringkas([r for r in utama if r["th"] == th], nm) for th in TAHUN_V2}
    atas = atas10(hasil_d72)
    out["per_lahan"] = {}
    for st in ("gambut", "mineral", "sabana"):
        Gs = {}
        for e in E.values():
            if e["st"] == st:
                Gs.setdefault((e["prov"], e["hari"]), []).append(e)
        out["per_lahan"][st] = ringkas(nilai_kelompok(Gs, {**sk, "Orakel": hasil_d72}, hasil_d72, atas, 10), nm)
    u = out["hasil"]["D72_K10"]
    d = u["S4-S0"]["tangkap"]
    kalah = [{"prov": p, "hari_keputusan": v["hari_keputusan"], "S0": v["S0"]["tangkap"][0], "S4": v["S4"]["tangkap"][0]}
             for p, v in out["per_provinsi"].items() if v["hari_keputusan"] >= HARI_MIN_PROV and v["S4"]["tangkap"][0] < v["S0"]["tangkap"][0]]
    syarat = {"selisih_10_poin": d[0] >= SELISIH_MIN, "batas_bawah_positif": d[1] > 0, "tidak_kalah_per_provinsi": not kalah}
    out["vonis"] = {"lolos": all(syarat.values()), "teks": "LOLOS" if all(syarat.values()) else "GAGAL", "syarat": syarat,
                    "selisih_tangkap10": d, "provinsi_kalah": kalah, "konfigurasi": "S4, hasil D72, K_GAMBUT 3, w_jiwa 0,5, K 10"}
    out["detik"] = round(time.time() - t0)
    H["v2"] = out
    json.dump(H, open(KELUAR, "w"), ensure_ascii=False, indent=1)
    log("vonis v2", json.dumps(out["vonis"], ensure_ascii=False), out["detik"], "dtk")


def uji():
    # D72: hanya sesudah lintasan pertama (> 30 menit) dan <= 72 jam
    det = [[100, 1, 500.0], [110, 2, 300.0], [130, 3, 40.0], [131, 4, 5.0], [100 + 4320, 5, 2.0], [100 + 4321, 6, 99.0]]
    assert d72(det) == 7.0, d72(det)
    bocor = sum(x[2] for x in det if x[0] <= det[0][0] + 4320)  # FRP lintasan pertama ikut = bocoran yang harus DITOLAK
    assert d72(det) != bocor and d72(det) < 500
    assert d72([[0, 1, 9.0]]) == 0
    # ambil_k: seri dibagi rata; urutan benar = orakel
    assert ambil_k([3, 2, 1], [10, 5, 1], 2) == 15
    assert ambil_k([1, 1, 1, 1], [4, 0, 0, 0], 2) == 2  # seri penuh: harapan = K/n x jumlah
    assert ambil_k([5, 1, 1], [0, 6, 2], 2) == 4 and ambil_k([1], [7], 3) == 7
    d = [100, 50, 10, 5, 1, 1]
    assert tangkap([6, 5, 4, 3, 2, 1], d, 2) == 1.0
    salah = tangkap([1, 2, 3, 4, 5, 6], d, 2)  # urutan terbalik DITOLAK: hanya 2/150 tertangkap
    assert abs(salah - 2 / 150) < 1e-12 and salah < .05
    assert tangkap([0, 0, 0], [0, 0, 0], 1) is None
    # skor S0: api besar ber-FWI tinggi di atas titik tunggal; level mengalahkan skor mentah
    besar = {"n0": 20, "ndet0": 25, "fwi": 10, "frp_jml0": 300, "isi_maks": 5, "dc": 400, "gambut": 1}
    kecil = {**besar, "n0": 1, "ndet0": 1, "frp_jml0": 3}
    basah = {**besar, "fwi": 1}
    assert skor_s0(besar) > skor_s0(basah) > skor_s0(kecil), (skor_s0(besar), skor_s0(basah), skor_s0(kecil))
    assert skor_s0(besar) // 1e6 == 3 and skor_s0(basah) // 1e6 == 2
    # paparan: gambut x K, jiwa 0-1
    e = {"gambut": 1, "penduduk_km2": math.e - 1}
    assert abs(paparan(e, 3, .5, 1.0) - 4.5) < 1e-12 and paparan({**e, "gambut": 0}, 3, 0, 1.0) == 1
    # bootstrap blok: data konstan -> selang sempit; selisih skor sempurna vs terbalik positif & CI > 0
    G = {}
    rnd = random.Random(1)
    for b in range(12):
        for h in range(5):
            es = [{"_id": f"{b}-{h}-{i}", "th": 2015 + b % 3, "prov": str(b), "v": rnd.random() * 100} for i in range(12)]
            G[(b, h)] = es
    atas = {e["_id"] for es in G.values() for e in es if e["v"] > 90}
    rows = nilai_kelompok(G, {"benar": lambda e: e["v"], "terbalik": lambda e: -e["v"]}, lambda e: e["v"], atas, 10)
    r = ringkas(rows, ["benar", "terbalik"], beda=("benar", "terbalik"))
    assert r["benar"]["tangkap"] == [1.0, 1.0, 1.0] and r["benar"]["recall"][0] == 1.0
    assert r["benar-terbalik"]["tangkap"][1] > 0 and r["terbalik"]["tangkap"][0] < 1
    rows5 = nilai_kelompok(G, {"x": lambda e: e["v"]}, lambda e: e["v"], atas, 12)
    assert rows5 == []  # kelompok 12 peristiwa tidak memenuhi >= K+1 untuk K 12
    print("ok")


if __name__ == "__main__":
    a = sys.argv[1:]
    if a == ["uji"]:
        uji()
    elif a in ([], ["jalan"]):
        jalan()
    elif a == ["v2"]:
        jalan_v2()
    else:
        sys.exit(__doc__)
