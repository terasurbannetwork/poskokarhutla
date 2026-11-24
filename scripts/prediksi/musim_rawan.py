"""Kalender ancaman dari bulan rawan -> public/prediksi/data/musim_rawan.json (pengingat sebulan sebelum bulan puncak).

Bahan: DIBI BNPB (is_bencana, kab/kota x bulan x tahun 2008-2025 final), dicache di scripts/prediksi/bahan/dibi_bulanan.json
(perintah `tarik`, jaringan). Satuan = (kab, jenis). Jenis: banjir, longsor, karhutla, kekeringan, cuaca ekstrem.

ATURAN BULAN PUNCAK (ditetapkan SEBELUM uji balik dijalankan; angka tidak disetel ulang sesudah melihat hasil):
  N = jumlah tahun pola; a[m] = jumlah tahun yang bulan m-nya punya >= 1 kejadian (biner, supaya satu bencana yang dipecah
  ke banyak baris atau pencatatan yang makin lengkap tidak membesarkan bulan itu); A = jumlah a[m].
  Satuan layak bila A >= 10 (di bawah itu pola 12 bulan hanya dari beberapa titik; sama gagasan dengan 'kecil' di
  kalender_ancaman.py). Bulan m = PUNCAK bila a[m] >= 3 (berulang di sedikitnya 3 tahun berbeda) DAN a[m]/A >= 2/12
  (bagian bulan itu dua kali bagian bila 12 bulan rata). Boleh lebih dari satu bulan puncak; boleh nol.

UJI BALIK (tanpa kebocoran): untuk tiap T = 2019..2025, pola hanya dari 2008..T-1, dinilai pada kejadian tahun T.
  Pembanding: klimatologi seragam (tiap bulan p = (A/12 + 0,5)/(N + 1)) dan persistensi (bulan yang sama tahun T-1: 1 atau 0).
  Model = frekuensi bulan p = (a[m] + 0,5)/(N + 1).
ATURAN LULUS per jenis (ditetapkan sebelum melihat hasil), semua harus terpenuhi pada gabungan T 2019-2025:
  L1 Brier model < Brier klimatologi DAN < persistensi mentah (bulan sama tahun T-1) DAN < persistensi terhaluskan
     (p = (kejadian di bulan itu pada T-3..T-1 + 0,5)/4);
  L2 angkat DALAM-SATUAN >= 1,5: per (kab, jenis) laju di bulan puncak / laju di bulan bukan puncak, lalu median antar satuan
     (angkat gabungan dibuang: membengkak oleh perbedaan laju dasar antarsatuan);
  L3 model mengalahkan klimatologi (Brier) di sedikitnya 5 dari 7 tahun T;
  L4 sedikitnya 30 satuan-bulan puncak teruji (n < 30 = 'belum teruji', aturan /prediksi).
  Belum lulus = tampil sebagai HIPOTESIS. Lulus pun hanya berarti pola bulan berulang, bukan peluang kejadian di bulan itu.
Keterbatasan: DIBI diisi susulan dan pencatatannya makin lengkap tiap tahun; pola dihitung dari versi data hari ini, bukan
versi yang dikenal pada tahun T.

Pakai: python3 scripts/prediksi/musim_rawan.py tarik | python3 scripts/prediksi/musim_rawan.py ujibalik | python3 scripts/prediksi/musim_rawan.py [tanggal] | ... uji
"""
import datetime as dt, importlib.util, json, os, random, sys

import dasar  # noqa: E402  (jalur, kab(), pencari lewat dasar)

AKAR, DATA, WIB = dasar.AKAR, dasar.DATA, dasar.WIB
BAHAN = os.path.join(dasar.SINI, "bahan", "dibi_bulanan.json")
KELUAR = os.path.join(DATA, "musim_rawan.json")
JENIS = {"Banjir": "banjir", "Longsor": "longsor", "Kebakaran hutan dan lahan": "karhutla", "Kekeringan": "kekeringan", "Cuaca ekstrem": "cuaca"}
AWAL, AKHIR_FINAL = 2008, 2025
TAHUN_UJI = list(range(2019, 2026))
MIN_A, MIN_TAHUN, MIN_BAGIAN = 10, 3, 2 / 12
L2_ANGKAT, L3_TAHUN, L4_N = 1.5, 5, 30
BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"]
NAMA = {"banjir": "banjir", "longsor": "longsor", "karhutla": "kebakaran hutan dan lahan", "kekeringan": "kekeringan", "cuaca": "cuaca ekstrem"}


def tarik():
    """DIBI Superset (meminjam penarik milik banjir) -> bahan: {"kab": [id], "jenis": [...], "baris": [[i_kab, i_jenis, tahun*100+bulan, n]]}."""
    s = importlib.util.spec_from_file_location("banjir_kejadian", os.path.join(AKAR, "scripts/banjir/kejadian.py"))
    K = importlib.util.module_from_spec(s)
    s.loader.exec_module(K)
    daftar = dasar.kab()
    cari = dasar.pencari(daftar)
    idx = {k["id"]: i for i, k in enumerate(daftar)}
    agg, tak, cocok_kode = {}, {}, [0, 0]
    for nama, j in JENIS.items():
        r = K.superset(["tahun", "bulan", "id_kab_bps", "provinsi", "kabupaten"], [("n", "SUM(jumlah_kejadian)")],
                       [{"col": "is_bencana", "op": "==", "val": True}, {"col": "kategori_bencana", "op": "==", "val": nama},
                        {"col": "tahun", "op": "<=", "val": AKHIR_FINAL}], 50000)
        if len(r) >= 50000:
            raise RuntimeError(f"DIBI {nama}: terpotong 50.000 baris")
        for x in r:
            if not x.get("bulan") or not x.get("tahun") or not x.get("kabupaten"):
                tak[j] = tak.get(j, 0) + 1
                continue
            kb = str(int(x["id_kab_bps"]))[:2] if x.get("id_kab_bps") else x.get("provinsi")
            i = cari(kb, x["kabupaten"])
            if i is None:
                tak[j] = tak.get(j, 0) + 1
                continue
            if x.get("id_kab_bps"):
                cocok_kode[0] += 1
                cocok_kode[1] += str(int(x["id_kab_bps"])) == str(i)
            k = (idx[i], list(JENIS.values()).index(j), int(x["tahun"]) * 100 + int(x["bulan"]))
            agg[k] = agg.get(k, 0) + float(x["n"] or 0)
    os.makedirs(os.path.dirname(BAHAN), exist_ok=True)
    out = {"dibuat": dt.datetime.now(WIB).isoformat(timespec="seconds"), "sumber": "DIBI BNPB is_bencana", "kab": [k["id"] for k in daftar],
           "jenis": list(JENIS.values()), "tak_cocok": tak, "kode_sama": cocok_kode,
           "baris": [[*k, round(v, 3)] for k, v in sorted(agg.items()) if v > 0]}
    json.dump(out, open(BAHAN, "w"), separators=(",", ":"))
    print(f"bahan: {len(out['baris'])} baris, tak cocok {tak}, kode DIBI = id Kepmendagri {cocok_kode[1]}/{cocok_kode[0]}")


def muat():
    d = json.load(open(BAHAN))
    ada = {}  # (kab, jenis) -> {tahun: set(bulan)}
    for ik, ij, ym, n in d["baris"]:
        if n > 0:
            ada.setdefault((ik, ij), {}).setdefault(ym // 100, set()).add(ym % 100)
    return d, ada


def pola(tahun_bulan, hingga):
    """-> (a[12], N, A) dari tahun AWAL..hingga."""
    N = hingga - AWAL + 1
    a = [sum(1 for t, b in tahun_bulan.items() if t <= hingga and m in b) for m in range(1, 13)]
    return a, N, sum(a)


def puncak(a, N, A):
    """Bulan puncak 1..12 menurut aturan di docstring."""
    if A < MIN_A:
        return []
    return [m + 1 for m in range(12) if a[m] >= MIN_TAHUN and a[m] / A >= MIN_BAGIAN]


def brier(p, y):
    return (p - y) ** 2


def ujibalik(ada=None, jenis=None):
    """-> {jenis: {...}}; murni dari `ada` {(kab, jenis): {tahun: set(bulan)}}."""
    if ada is None:
        _, ada = muat()
    jenis = jenis or list(JENIS.values())
    hasil = {}
    for ij, nj in enumerate(jenis):
        per = {T: {"n": 0, "bm": 0.0, "bk": 0.0, "bp": 0.0, "bh": 0.0} for T in TAHUN_UJI}
        pk = {"ya": [0, 0], "tidak": [0, 0], "kejadian": 0, "kejadian_di_puncak": 0, "unit": set()}
        su = {}  # kab -> [kejadian puncak, n puncak, kejadian bukan, n bukan]  # [kejadian, n]
        for (kb, j), tb in ada.items():
            if j != ij:
                continue
            for T in TAHUN_UJI:
                a, N, A = pola(tb, T - 1)
                if A < MIN_A:
                    continue
                pk["unit"].add(kb)
                pu = set(puncak(a, N, A))
                for m in range(1, 13):
                    y = 1 if m in tb.get(T, ()) else 0
                    ya = 1 if m in tb.get(T - 1, ()) else 0
                    p_m, p_k = (a[m - 1] + 0.5) / (N + 1), (A / 12 + 0.5) / (N + 1)
                    d = per[T]
                    d["n"] += 1
                    d["bm"] += brier(p_m, y)
                    d["bk"] += brier(p_k, y)
                    d["bp"] += brier(ya, y)
                    d["bh"] += brier((sum(1 for u in (1, 2, 3) if m in tb.get(T - u, ())) + 0.5) / 4, y)
                    z = su.setdefault(kb, [0, 0, 0, 0])
                    z[(0 if m in pu else 2)] += y
                    z[(1 if m in pu else 3)] += 1
                    pk["ya" if m in pu else "tidak"][0] += y
                    pk["ya" if m in pu else "tidak"][1] += 1
                    pk["kejadian"] += y
                    pk["kejadian_di_puncak"] += y * (m in pu)
        n = sum(d["n"] for d in per.values())
        if not n:
            hasil[nj] = {"vonis": "belum teruji", "n": 0}
            continue
        B = {k: sum(d[k] for d in per.values()) / n for k in ("bm", "bk", "bp", "bh")}
        (ky, ny), (kt, nt) = pk["ya"], pk["tidak"]
        presisi = ky / ny if ny else None
        laju_bukan = kt / nt if nt else None
        angkat_gab = presisi / laju_bukan if presisi is not None and laju_bukan else None  # hanya catatan, bukan ukuran lulus
        al = sorted((z[0] / z[1]) / (z[2] / z[3]) if z[2] else float("inf") for z in su.values() if z[1] and z[3] and (z[0] or z[2]))
        angkat = (al[len(al) // 2] if len(al) % 2 else (al[len(al) // 2 - 1] + al[len(al) // 2]) / 2) if al else None
        if angkat == float("inf"):
            angkat = None
        menang = sum(1 for d in per.values() if d["n"] and d["bm"] < d["bk"])
        L = {"L1": B["bm"] < B["bk"] and B["bm"] < B["bp"] and B["bm"] < B["bh"], "L2": bool(al) and (al[len(al) // 2] if len(al) % 2 else (al[len(al) // 2 - 1] + al[len(al) // 2]) / 2) >= L2_ANGKAT,
             "L3": menang >= L3_TAHUN, "L4": ny >= L4_N}
        vonis = "lulus" if all(L.values()) else ("belum teruji" if not L["L4"] else "tidak lulus")
        hasil[nj] = {"vonis": vonis, "L": L, "satuan": len(pk["unit"]), "n": n, "n_puncak": ny, "kejadian_puncak": ky, "kejadian_bukan": kt, "n_bukan": nt,
                     "presisi": presisi, "laju_bukan_puncak": laju_bukan, "angkat_satuan": angkat, "angkat_gabungan": angkat_gab, "n_satuan_angkat": len(al),
                     "recall": pk["kejadian_di_puncak"] / pk["kejadian"] if pk["kejadian"] else None,
                     "laju_dasar": pk["kejadian"] / n, "brier": B, "bss_klim": 1 - B["bm"] / B["bk"],
                     "tahun_menang": menang, "per_tahun": {T: {"n": d["n"], "bm": d["bm"] / d["n"], "bk": d["bk"] / d["n"], "bp": d["bp"] / d["n"], "bh": d["bh"] / d["n"]} for T, d in per.items() if d["n"]}}
    return hasil


def terbit(hari=None):
    d, ada = muat()
    uji = ujibalik(ada)
    daftar = dasar.kab()
    bulan = {str(m): {} for m in range(1, 13)}
    for (ik, ij), tb in sorted(ada.items()):
        a, N, A = pola(tb, AKHIR_FINAL)
        for m in puncak(a, N, A):
            bulan[str(m)].setdefault(d["jenis"][ij], []).append([daftar[ik]["id"], a[m - 1]])
    for v in bulan.values():
        for l in v.values():
            l.sort(key=lambda x: (-x[1], x[0]))
    hari = hari or dt.datetime.now(WIB).date().isoformat()
    out = {"versi": 1, "dibuat": dt.datetime.now(WIB).isoformat(timespec="seconds"), "hari": hari, "tahun_pola": [AWAL, AKHIR_FINAL], "uji_tahun": [TAHUN_UJI[0], TAHUN_UJI[-1]], "N": AKHIR_FINAL - AWAL + 1,
           "sumber": "DIBI BNPB is_bencana (kejadian per kab/kota per bulan)",
           "aturan": {"satuan_layak_A": MIN_A, "tahun_min_per_bulan": MIN_TAHUN, "bagian_min": round(MIN_BAGIAN, 4),
                      "lulus": {"L1": "Brier model < klimatologi dan persistensi", "L2": f"angkat >= {L2_ANGKAT}", "L3": f"menang di >= {L3_TAHUN} dari {len(TAHUN_UJI)} tahun T", "L4": f"n bulan puncak >= {L4_N}"}},
           "uji": {j: {k: (round(v, 4) if isinstance(v, float) else v) for k, v in u.items() if k != "per_tahun"} for j, u in uji.items()},
           "bulan": bulan,
           "label": "pola bulan berulang dari kejadian DIBI 2008-2025, bukan prakiraan dan bukan peluang; jenis yang belum lulus uji balik = hipotesis; uji balik per jenis di bagian uji"}
    json.dump(out, open(KELUAR, "w"), ensure_ascii=False, separators=(",", ":"))
    for j, u in uji.items():
        print(j, u["vonis"], {k: (round(v, 3) if isinstance(v, float) else v) for k, v in u.items() if k in ("n", "n_puncak", "presisi", "laju_bukan_puncak", "angkat_satuan", "recall", "bss_klim", "tahun_menang")})
    print("bulan:", {m: sum(len(x) for x in v.values()) for m, v in bulan.items()})


def uji():
    # pola: a, puncak
    tb = {t: {1} for t in range(2008, 2020)}      # Januari tiap tahun
    tb[2008] |= {7}
    a, N, A = pola(tb, 2019)
    assert a[0] == 12 and a[6] == 1 and N == 12 and A == 13 and puncak(a, N, A) == [1]
    assert puncak([0] * 12, 12, 0) == [] and puncak([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], 12, 12) == [], "rata = tanpa puncak"
    # tanpa kebocoran: pola T memakai tahun < T saja
    ada = {(0, 0): {t: ({1} if t != 2022 else {1, 2}) for t in range(2008, 2026)}}
    ada[(0, 0)][2025] = {7}                      # tahun uji 2025 menyimpang: Januari kosong
    h = ujibalik(ada, ["banjir"])["banjir"]
    assert h["n"] == 12 * 7 and h["kejadian_puncak"] == 6, h   # Januari terjadi di 6 dari 7 tahun uji (2025 tidak)
    assert h["vonis"] == "tidak lulus" or h["vonis"] == "belum teruji", h
    # klimatologi tak mungkin mengalahkan pola nyata yang kuat
    kuat = {(i, 0): {t: {3, 4} for t in range(2008, 2026)} for i in range(10)}
    h = ujibalik(kuat, ["banjir"])["banjir"]
    assert h["L"]["L2"] and h["L"]["L3"] and h["L"]["L4"] and h["bss_klim"] > 0.9 and h["laju_bukan_puncak"] == 0, h  # angkat tak terhingga = None
    assert not h["L"]["L1"], "deret periodik sempurna: persistensi (Brier 0) tak terkalahkan, vonis jujur tidak lulus"
    random.seed(2)
    bising = {(i, 0): {t: {m for m in (3, 4, 5) if random.random() < 0.8} | ({random.randint(1, 12)} if random.random() < 0.3 else set()) for t in range(2008, 2026)} for i in range(40)}
    h = ujibalik(bising, ["banjir"])["banjir"]
    assert h["vonis"] == "lulus", h
    # pola acak murni tidak lulus
    random.seed(1)
    acak = {(i, 0): {t: {random.randint(1, 12) for _ in range(3)} for t in range(2008, 2026)} for i in range(60)}
    assert ujibalik(acak, ["banjir"])["banjir"]["vonis"] != "lulus"
    print("musim_rawan uji: ok")


if __name__ == "__main__":
    c = sys.argv[1] if len(sys.argv) > 1 else "terbit"
    {"tarik": tarik, "uji": uji, "ujibalik": lambda: print(json.dumps(ujibalik(), default=str, indent=1))}.get(c, lambda: terbit(c if c[:2] == "20" else None))()
