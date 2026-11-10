#!/usr/bin/env python3
"""Deteksi gempa beruntun (Silang Sumber F5, SS-40 sampai SS-44): jumlah gempa M >= 4,5 dalam 7 hari di lingkaran sekitar gunung api,
dibanding LAJU HISTORIS USGS M >= 4,5 (2000 sampai kini) di lingkaran yang sama. Keputusan pemilik atas Q1 (10 Nov 2026): "Pakai USGS M 4,5+".

BUKAN prediksi gempa dan bukan peringatan. Berlabel "Deteksi Centurisk97"; ambang adalah HIPOTESIS awal, belum diuji balik ("belum teruji").
KETERBATASAN WAJIB: hanya M >= 4,5, jadi kawanan gempa kecil vulkanik tidak terlihat. Itu wilayah kegempaan MAGMA, yang ditampilkan di kolom
TERPISAH (SS-44), tidak dilebur menjadi angka.

Masukan:
  baseline (subperintah `baseline`): data/raw/gempa/susulan_katalog.json (katalog USGS M >= 4,5 sejak 2000, tak dilacak git; dibuat susulan.py/riwayat.py).
    Hasilnya DIKOMIT di public/gempa/data/beruntun_baseline.json supaya `jalan` dan CI tidak butuh katalog mentah.
  7 hari terakhir: USGS FDSN query 7 hari M >= 4,5 (diambil sekali, disimpan di data/raw/gempa/beruntun_usgs.json). N dihitung dari USGS SAJA, seskala dengan
    baseline (pilihan pemilik USGS M 4,5+; magnitudo BMKG dan USGS beda, jadi BMKG tidak ikut ambang). Cacah BMKG M >= 4,5 (`n_bmkg`) hanya info terpisah.
    USGS 7 hari tak terambil dan simpanan tak menutup jendela -> semua sasaran "tidak_dinilai" dengan alasan.
  scripts/gempa/beruntun_sasaran.json (sasaran; dari public/gunungapi/data/gunung.json oleh `sasaran`).
  SS-44: public/gunungapi/data/kegempaan.json (hitungan harian MAGMA) dan public/banjir/data/gunungapi_status.json (level), dibaca saja.
Keluaran: public/gempa/data/beruntun.json dan beruntun_arsip/YYYY-MM.jsonl (append-only, dibeku pada tanggal data, tidak diisi mundur).

Ambang kelengkapan: M 4,5 dari USGS (Mc 5,1 dari katalog BMKG campuran dibuang: itu artefak lonjakan teleseismik, bukan kelengkapan). Cek nilai-b sederhana
(Aki-Utsu) ada di beruntun_baseline.json. Ambang M tidak disetel demi hasil; sasaran dengan laju historis nol dilaporkan apa adanya (status laju_nol, tanpa peluang).
Radius lebih lebar hanya USULAN berlabel (`usulan_radius`, cacah historis di 50 dan 100 km), tidak dipakai menghitung.
Python 3.9+ stdlib. Pakai: python3 scripts/gempa/beruntun.py [jalan] | sasaran | baseline | uji"""
import csv
import io
import json
import math
import os
import sys
from datetime import datetime, timedelta, timezone

AKAR = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "../.."))
DATA = os.path.join(AKAR, "public/gempa/data")
SASARAN = os.path.join(AKAR, "scripts/gempa/beruntun_sasaran.json")
MENTAH = os.path.join(AKAR, "data/raw/gempa")
M_MIN, DETEKSI_HARI, R_KM = 4.5, 7, 30           # awal (hipotesis); M_MIN = kelengkapan USGS
AMBANG_P = 0.01                                  # awal (hipotesis)
N_MIN_NYALA = 3                                  # syarat tambahan: satu pasangan susulan (N < 3) tidak menyalakan tanda (hipotesis)
JEFFREYS = 0.5                                   # laju = (n + 0,5) / hari
MODE = "historis_usgs_m45_nb"
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))


def baca(rel):
    with open(os.path.join(AKAR, rel), encoding="utf-8") as f:
        return json.load(f)


def simpan(jalur, isi):
    os.makedirs(os.path.dirname(jalur), exist_ok=True)
    with open(jalur + ".tmp", "w", encoding="utf-8") as f:
        json.dump(isi, f, ensure_ascii=False, separators=(",", ":"))
    os.replace(jalur + ".tmp", jalur)


def jarak(a, b, c, d):
    p = math.pi / 180
    h = math.sin((c - a) * p / 2) ** 2 + math.cos(a * p) * math.cos(c * p) * math.sin((d - b) * p / 2) ** 2
    return 12742 * math.asin(math.sqrt(h))


def di_lingkaran(la, lo, pusat, r):
    return abs(la - pusat[0]) <= r / 100 and jarak(pusat[0], pusat[1], la, lo) <= r


def poisson_ekor(n, lam):
    """P(X >= n) untuk Poisson(lam). lam <= 0 -> None (tak bermakna). n <= 0 -> 1."""
    if lam <= 0:
        return None
    if n <= 0:
        return 1.0
    suku = math.exp(-lam)
    kum = suku
    for k in range(1, n):
        suku *= lam / k
        kum += suku
    return max(0.0, min(1.0, 1.0 - kum))


def b_aki(mags, mc=M_MIN):
    """Nilai-b Aki-Utsu dengan koreksi bin 0,1: b = log10(e) / (rerata - (mc - 0,05)). -> (b, n)."""
    m = [x for x in mags if x >= mc - 1e-9]
    return (math.log10(math.e) / (sum(m) / len(m) - (mc - 0.05)), len(m)) if len(m) >= 2 else (None, len(m))


def nb_ekor(n, lam, alpha):
    """P(X >= n) binomial negatif rerata lam, varians lam + alpha*lam^2 (alpha = 1/ukuran, dari data). alpha ~ 0 -> Poisson. lam <= 0 -> None."""
    if lam <= 0:
        return None
    if alpha < 1e-9:
        return poisson_ekor(n, lam)
    if n <= 0:
        return 1.0
    r = 1.0 / alpha
    q = lam / (r + lam)                       # peluang "gagal" per percobaan; pmf(0) = (1-q)^r
    pmf = (1 - q) ** r
    kum = pmf
    for k in range(1, n):
        pmf *= (k - 1 + r) / k * q
        kum += pmf
    return max(0.0, min(1.0, 1.0 - kum))


# ------------------------------------------------------------------ baseline historis (SS-40) dan uji mundur
def hitung_baseline(katalog, sasaran, hari, usulan=(50, 100)):
    """katalog: [{lat, lon, m}] USGS M >= 4,5; -> {id: {n, n_usulan: {50: n, 100: n}}} (cacah historis; laju = (n + 0,5) / hari)."""
    ev = [k for k in katalog if k["m"] >= M_MIN - 1e-9]
    out = {}
    for s in sasaran:
        out[s["id"]] = {"n": sum(1 for k in ev if di_lingkaran(k["lat"], k["lon"], s["pusat"], s["R_km"])),
                        "n_usulan": {str(r): sum(1 for k in ev if di_lingkaran(k["lat"], k["lon"], s["pusat"], r)) for r in usulan}}
    return out


def histogram(mags):
    h = {}
    for m in mags:
        h[round(m, 1)] = h.get(round(m, 1), 0) + 1
    return h


def hitung_mingguan(ev, sasaran, t0, n_minggu):
    """ev: [{hari (sejak t0), lat, lon}] -> {id: [cacah per minggu]} untuk n_minggu minggu penuh."""
    out = {}
    for s in sasaran:
        c = [0] * n_minggu
        for e in ev:
            w = int(e["hari"] // 7)
            if w < n_minggu and di_lingkaran(e["lat"], e["lon"], s["pusat"], s["R_km"]):
                c[w] += 1
        out[s["id"]] = c
    return out


def uji_mundur(cacah, t0, ambang=AMBANG_P):
    """Uji mundur mingguan, baseline LEAVE-ONE-YEAR-OUT (laju tahun Y dari semua tahun LAIN, prior Jeffreys), bukan in-sample.
    cacah: {id: [N per minggu]}. -> alpha (kelebihan varians, momen), n_menyala per sasaran (NB dan Poisson), tingkat menyala. Parameter alpha satu angka dari
    seluruh minggu (satu-satunya yang in-sample; dicatat)."""
    S = list(cacah)
    W = len(cacah[S[0]])
    tahun = [(t0 + timedelta(days=7 * w)).year for w in range(W)]
    ny = {}
    for y in tahun:
        ny[y] = ny.get(y, 0) + 1
    tot = {i: sum(cacah[i]) for i in S}
    per_y = {i: {} for i in S}
    for i in S:
        for w, n in enumerate(cacah[i]):
            per_y[i][tahun[w]] = per_y[i].get(tahun[w], 0) + n

    def lam(i, w):
        y = tahun[w]
        return (tot[i] - per_y[i][y] + JEFFREYS) / ((W - ny[y]) * 7.0) * 7.0
    sel, sl2 = 0.0, 0.0
    for i in S:
        for w in range(W):
            l = lam(i, w)
            sel += (cacah[i][w] - l) ** 2 - l
            sl2 += l * l
    alpha = max(0.0, sel / sl2)
    nyala, nyala_p = {i: 0 for i in S}, {i: 0 for i in S}
    for i in S:
        for w in range(W):
            n = cacah[i][w]
            if n < N_MIN_NYALA:
                continue
            l = lam(i, w)
            if min(1.0, nb_ekor(n, l, alpha) * len(S)) < ambang:
                nyala[i] += 1
            if min(1.0, poisson_ekor(n, l) * len(S)) < ambang:
                nyala_p[i] += 1
    pasang = len(S) * W
    return {"alpha": alpha, "n_minggu": W, "n_pasang": pasang, "n_menyala": nyala, "tingkat_menyala": sum(nyala.values()) / pasang,
            "tingkat_menyala_poisson": sum(nyala_p.values()) / pasang, "n_menyala_total": sum(nyala.values()), "n_menyala_poisson_total": sum(nyala_p.values()),
            "minggu_dengan_N_ge_3": sum(1 for i in S for n in cacah[i] if n >= N_MIN_NYALA)}


def bangun_baseline():
    import time
    jalur = os.path.join(MENTAH, "susulan_katalog.json")
    ev = [e for e in json.load(open(jalur)) if e["m"] >= M_MIN - 1e-9]
    sas = baca("scripts/gempa/beruntun_sasaran.json")["sasaran"]
    t0 = datetime(2000, 1, 1)
    mulai = t0.replace(tzinfo=timezone.utc)
    akhir = datetime.strptime(ev[-1]["w"], "%Y-%m-%dT%H:%M").replace(tzinfo=timezone.utc)
    hari = (akhir - mulai).total_seconds() / 86400
    per = hitung_baseline(ev, sas, hari)
    mags = [e["m"] for e in ev]
    h = histogram(mags)
    b_all, n_all = b_aki(mags)
    dekat = [e["m"] for e in ev if any(di_lingkaran(e["lat"], e["lon"], s["pusat"], 100) for s in sas)]
    b_dekat, n_dekat = b_aki(dekat)
    # komposisi magnitudo per era: bagian gempa M 4,5 sampai 4,7 (bila bergeser, katalog tidak homogen)
    era = {}
    for e in ev:
        y = int(e["w"][:4]) // 5 * 5
        q = era.setdefault(y, [0, 0])
        q[1] += 1
        q[0] += e["m"] < 4.75
    # uji mundur mingguan
    for e in ev:
        e["hari"] = (datetime.strptime(e["w"], "%Y-%m-%dT%H:%M") - t0).total_seconds() / 86400
    W = int(hari // 7)
    um = uji_mundur(hitung_mingguan(ev, sas, t0, W), t0)
    for i, v in per.items():
        v["n_menyala"] = um["n_menyala"][i]
    ov = {k: (round(v, 5) if isinstance(v, float) else v) for k, v in um.items() if k != "n_menyala"}
    ov.update({"k_ukuran": None if um["alpha"] < 1e-9 else round(1 / um["alpha"], 4), "syarat_menyala": "peluang ekor binomial negatif x jumlah sasaran < %s dan N >= %d" % (AMBANG_P, N_MIN_NYALA),
               "metode": "momen: alpha = sum[(N - lam)^2 - lam] / sum lam^2 atas semua sasaran x minggu; lam = laju leave-one-year-out (n + 0,5) per hari x 7",
               "catatan": "Baseline tiap tahun dihitung tanpa tahun itu (bukan in-sample); hanya alpha satu angka dari seluruh minggu yang in-sample. Ambang peluang dan N >= 3 hipotesis, tidak disetel dari hasil ini."})
    return {"versi": 2, "sumber": "USGS FDSN event catalog M >= 4,5, 2000 sampai kini, kotak lat -12..7 lon 94..142 (domain publik); arsip scripts/gempa/susulan.py",
            "diunduh": time.strftime("%Y-%m-%d", time.localtime(os.path.getmtime(jalur))),
            "mulai": mulai.strftime("%Y-%m-%d"), "akhir": akhir.strftime("%Y-%m-%dT%H:%MZ"), "hari": round(hari, 2), "n_katalog": len(ev), "m_min": M_MIN,
            "overdispersi": ov,
            "kelengkapan": {"ambang": M_MIN, "dasar": "USGS M >= 4,5 dianggap lengkap sejak 2000 (scripts/gempa/riwayat.py); Mc 5,1 katalog BMKG campuran dibuang",
                            "b_aki_semua": None if b_all is None else round(b_all, 3), "n_semua": n_all,
                            "b_aki_dekat_gunung_100km": None if b_dekat is None else round(b_dekat, 3), "n_dekat_gunung_100km": n_dekat,
                            "puncak_histogram": max(h, key=lambda k: (h[k], -k)), "histogram_4_5_sampai_5_4": {"%.1f" % k: h.get(round(k, 1), 0) for k in [4.5 + i / 10 for i in range(10)]},
                            "bagian_m45_sampai_47_per_era": {str(y): round(v[0] / v[1], 3) for y, v in sorted(era.items())},
                            "catatan": "Nilai-b sekitar 1,2 BUKAN bukti kelengkapan: b dari rerata magnitudo bisa naik oleh pergeseran komposisi jenis magnitudo USGS (mb, mww, ml) dan pembulatan di dekat M 4,5 antar-era (lihat bagian_m45_sampai_47_per_era). Kelengkapan M 4,5 diasumsikan, belum dibuktikan."}, "sasaran": per}


# ------------------------------------------------------------------ 7 hari terakhir
def epoch(s):
    return int(datetime.strptime(s, "%Y-%m-%dT%H:%MZ").replace(tzinfo=timezone.utc).timestamp())


def muat_bmkg(ref, hari=DETEKSI_HARI):
    """Katalog BMKG 7 hari (info terpisah, bukan dasar deteksi)."""
    k = baca("public/gempa/data/inatews_katalog.json")
    ix = {c: i for i, c in enumerate(k["kolom"])}
    return [{"t": r[ix["t"]], "lat": r[ix["lat"]], "lon": r[ix["lon"]], "m": r[ix["m"]]} for r in k["baris"]
            if r[ix["m"]] is not None and ref - hari * 86400 <= r[ix["t"]] <= ref]


def muat_usgs(ref, hari=DETEKSI_HARI):
    """USGS FDSN 7 hari sampai ref, M >= 4,5 -> daftar gempa, atau None bila jendela TIDAK tertutup. Jaringan gagal -> pakai simpanan hanya bila simpanan
    mencakup seluruh jendela (akhir simpanan >= ref), disaring ke jendela; simpanan yang berakhir lebih awal = None (bukan data basi berlabel baru)."""
    jalur = os.path.join(MENTAH, "beruntun_usgs.json")
    awal = ref - hari * 86400

    def simpanan():
        if not os.path.exists(jalur):
            return None
        d = json.load(open(jalur))
        if epoch(d["akhir"]) < ref:
            return None
        return [e for e in d["gempa"] if awal <= e["t"] <= ref]
    ada = simpanan()
    kunci = datetime.fromtimestamp(ref, timezone.utc).strftime("%Y-%m-%dT%H:%MZ")
    if ada is not None and json.load(open(jalur))["akhir"] == kunci:
        return ada
    try:
        from umum import ambil, usgs_url
        f = "%Y-%m-%dT%H:%M:%S"
        teks = ambil(usgs_url("query", datetime.fromtimestamp(awal, timezone.utc).strftime(f), datetime.fromtimestamp(ref, timezone.utc).strftime(f), M_MIN, format="csv"), mentah=True).decode()
        ev = [{"t": int(datetime.strptime(r["time"][:19], f).replace(tzinfo=timezone.utc).timestamp()), "lat": float(r["latitude"]), "lon": float(r["longitude"]), "m": round(float(r["mag"]), 1)}
              for r in csv.DictReader(io.StringIO(teks)) if r["mag"] != "" and r["type"] == "earthquake"]
        simpan(jalur, {"akhir": kunci, "sumber": "USGS FDSN query", "gempa": ev})
        return ev
    except Exception as e:  # noqa: BLE001 gagal-lunak
        print("USGS 7 hari tidak terambil:", e, file=sys.stderr)
        return ada


# ------------------------------------------------------------------ hitung (SS-41, SS-42)
def hitung(events, sasaran, baseline, hari_baseline, alpha, deteksi_hari=DETEKSI_HARI, ambang=AMBANG_P, n_bmkg=None):
    """events: gempa USGS 7 hari {lat, lon, m} atau None (jendela tak tertutup -> semua tidak_dinilai); baseline: {id: {n, n_menyala, n_usulan}}.
    laju = (n_hist + 0,5) / hari (prior Jeffreys), harapan = laju x lama jendela; peluang ekor binomial negatif dengan alpha dari uji mundur, dikali
    jumlah sasaran. Menyala hanya bila peluang terkoreksi < ambang DAN N >= 3. Murni, deterministik."""
    ev = None if events is None else [e for e in events if e["m"] >= M_MIN - 1e-9]
    hasil = []
    for s in sasaran:
        b = baseline[s["id"]]
        harapan = (b["n"] + JEFFREYS) / hari_baseline * deteksi_hari
        r = {"id": s["id"], "nama": s["nama"], "jenis": s["jenis"], "pusat": s["pusat"], "R_km": s["R_km"], "n_hist": b["n"], "laju_prior_saja": b["n"] == 0,
             "laju_hist_per_tahun": round((b["n"] + JEFFREYS) / hari_baseline * 365.25, 3), "harapan": round(harapan, 4), "n_menyala": b.get("n_menyala"),
             "n_bmkg": None if n_bmkg is None else sum(1 for e in n_bmkg if e["m"] >= M_MIN - 1e-9 and di_lingkaran(e["lat"], e["lon"], s["pusat"], s["R_km"])),
             "usulan_radius": {"label": "usulan, tidak dipakai menghitung", "n_hist_50km": b["n_usulan"].get("50"), "n_hist_100km": b["n_usulan"].get("100")} if b["n"] == 0 else None, "magma": None}
        if ev is None:
            r.update({"N": None, "p": None, "p_koreksi": None, "status": "tidak_dinilai", "alasan": "USGS 7 hari terakhir tidak terambil atau tidak menutup jendela"})
        else:
            N = sum(1 for e in ev if di_lingkaran(e["lat"], e["lon"], s["pusat"], s["R_km"]))
            p = nb_ekor(N, harapan, alpha)
            pk = min(1.0, p * len(sasaran))
            r.update({"N": N, "p": float("%.3g" % p), "p_koreksi": float("%.3g" % pk), "status": "perlu_dicek" if (pk < ambang and N >= N_MIN_NYALA) else "biasa", "alasan": None})
        hasil.append(r)
    return hasil


# ------------------------------------------------------------------ SS-44 silang MAGMA (kolom terpisah)
LEVEL = {1: "Normal", 2: "Waspada", 3: "Siaga", 4: "Awas"}


def silang_magma(hasil, kegempaan, status, ref, hari=DETEKSI_HARI):
    """Tambah kolom `magma` ke tiap hasil: level PVMBG dan hitungan kegempaan MAGMA 7 hari terakhir per jenis. Tidak ada angka gabungan."""
    jenis = [j["k"] for j in kegempaan["jenis"]]
    lv = {g["nama"]: g.get("level") for g in status.get("gunung", [])}
    akhir = datetime.fromtimestamp(ref, timezone.utc).date()
    tgl = {(akhir - timedelta(days=i)).isoformat() for i in range(hari)}
    for h in hasil:
        nama = h["nama"]
        kg = kegempaan["gunung"].get(nama)
        level = lv.get(nama)
        if kg is None:
            h["magma"] = {"level": level, "level_nama": LEVEL.get(level), "kegempaan": None, "catatan": "tidak ada di kegempaan.json"}
            continue
        ada = [t for t in kg["hari"] if t in tgl]
        per = {j: sum(kg["hari"][t][i] for t in ada) for i, j in enumerate(jenis)}
        h["magma"] = {"level": level, "level_nama": LEVEL.get(level), "hari_tercatat": len(ada), "total_7hari": sum(per.values()),
                      "per_jenis": {j: v for j, v in per.items() if v}, "tanggal_akhir": max(kg["hari"]) if kg["hari"] else None, "kode": kg.get("kode")}
    return hasil


def arsipkan(baris, tanggal, mode=MODE):
    """Tambah baris (tanggal, mode) ke beruntun_arsip/YYYY-MM.jsonl. Append-only: pasangan (tanggal, mode) yang sudah ada tidak ditulis ulang, baris lama tidak
    disentuh, tidak ada isi mundur. Baris mode lama (relatif) tetap utuh. -> jumlah baris ditulis."""
    jalur = os.path.join(DATA, "beruntun_arsip", tanggal[:7] + ".jsonl")
    ada = set()
    if os.path.exists(jalur):
        with open(jalur, encoding="utf-8") as f:
            ada = {(x["tanggal"], x.get("mode")) for x in (json.loads(l) for l in f if l.strip())}
    if (tanggal, mode) in ada:
        return 0
    os.makedirs(os.path.dirname(jalur), exist_ok=True)
    with open(jalur, "a", encoding="utf-8") as f:
        for b in baris:
            f.write(json.dumps({"tanggal": tanggal, "id": b["id"], "n_hist": b["n_hist"], "N": b["N"], "harapan": b["harapan"], "p_koreksi": b["p_koreksi"], "status": b["status"], "mode": mode},
                               ensure_ascii=False, separators=(",", ":")) + "\n")
    return len(baris)


def rakit(events, sasaran, baseline_doc, ref, dibuat, kegempaan=None, status=None, n_bmkg=None):
    ov = baseline_doc["overdispersi"]
    hasil = hitung(events, sasaran, baseline_doc["sasaran"], baseline_doc["hari"], ov["alpha"], n_bmkg=n_bmkg)
    if kegempaan is not None:
        silang_magma(hasil, kegempaan, status or {}, ref)
    ok = events is not None
    return {"versi": 3, "dibuat": dibuat, "label": "Deteksi Centurisk97", "bukan_prediksi": True, "teruji": False,
            "baseline": "historis:USGS_M4.5", "mode": MODE, "hanya_m45_ke_atas": True,
            "keterbatasan": "Hanya gempa M 4,5 ke atas, jadi kawanan gempa kecil vulkanik tidak terlihat; itu tampil terpisah dari MAGMA.",
            "jendela": {"deteksi_hari": DETEKSI_HARI, "akhir": datetime.fromtimestamp(ref, timezone.utc).strftime("%Y-%m-%dT%H:%MZ"), "baseline_mulai": baseline_doc["mulai"], "baseline_akhir": baseline_doc["akhir"]},
            "ambang": {"p_koreksi": AMBANG_P, "n_min_menyala": N_MIN_NYALA, "m_min": M_MIN, "R_km": R_KM, "laju": "(n + 0,5) per hari, prior Jeffreys", "status": "hipotesis"},
            "overdispersi": ov, "kelengkapan": baseline_doc["kelengkapan"], "baseline_diunduh": baseline_doc.get("diunduh"),
            "sumber_hitungan": "USGS FDSN M >= 4,5, 7 hari (USGS saja, seskala dengan baseline); n_bmkg hanya info" if ok else "USGS 7 hari tidak terambil: semua sasaran tidak dinilai",
            "n_gempa_7hari": None if not ok else len([e for e in events if e["m"] >= M_MIN - 1e-9]),
            "ringkas": {"sasaran": len(hasil), "dinilai": len([h for h in hasil if h["status"] != "tidak_dinilai"]), "tidak_dinilai": len([h for h in hasil if h["status"] == "tidak_dinilai"]),
                        "laju_prior_saja": len([h for h in hasil if h["laju_prior_saja"]]), "perlu_dicek": len([h for h in hasil if h["status"] == "perlu_dicek"]),
                        "n_gempa_di_lingkaran": sum(h["N"] or 0 for h in hasil), "tingkat_menyala_backtest": ov["tingkat_menyala"]},
            "sasaran": hasil,
            "catatan": ["Deteksi Centurisk97, bukan prediksi gempa dan bukan peringatan. Ambang adalah hipotesis awal dan belum teruji ke depan.",
                        "Baseline historis: laju gempa USGS M >= 4,5 sejak 2000 di lingkaran %d km tiap gunung api (keputusan pemilik Q1, 10 Nov 2026), laju (n + 0,5) per hari. Mc 5,1 lama dibuang; ambang kelengkapan M 4,5 dari USGS dan hanya diasumsikan: nilai-b bukan bukti kelengkapan (lihat `kelengkapan`)." % R_KM,
                        "Peluang memakai binomial negatif dengan dispersi dari uji mundur mingguan leave-one-year-out (`overdispersi`), dikali jumlah sasaran; tanda hanya bila peluang terkoreksi di bawah ambang dan N >= %d (satu pasangan susulan tidak menyalakan)." % N_MIN_NYALA,
                        "Sasaran tanpa gempa historis di lingkaran (`laju_prior_saja`) hanya punya laju dari prior; radius lebih lebar hanya usulan (`usulan_radius`), tidak dipakai menghitung.",
                        "N 7 hari dari USGS saja; magnitudo BMKG dan USGS beda untuk gempa yang sama, jadi cacah BMKG (`n_bmkg`) hanya info dan tidak ikut ambang.",
                        "Lingkaran berdekatan berbagi gempa, sehingga sasaran tidak sepenuhnya bebas. Kolom MAGMA ditampilkan terpisah, tidak digabung ke angka deteksi."]}


def jalan():
    bl = baca("public/gempa/data/beruntun_baseline.json")
    sas = baca("scripts/gempa/beruntun_sasaran.json")["sasaran"]
    dibuat = baca("public/gempa/data/inatews_katalog.json")["dibuat"]
    ref = epoch(dibuat)
    out = rakit(muat_usgs(ref), sas, bl, ref, dibuat, baca("public/gunungapi/data/kegempaan.json"), baca("public/banjir/data/gunungapi_status.json"), muat_bmkg(ref))
    simpan(os.path.join(DATA, "beruntun.json"), out)
    n = arsipkan(out["sasaran"], dibuat[:10])
    ov = out["overdispersi"]
    print(out["ringkas"], "gempa 7 hari M4.5+ (USGS):", out["n_gempa_7hari"], "arsip +%d baris (%s)" % (n, dibuat[:10]))
    print("alpha", ov["alpha"], "k", ov["k_ukuran"], "| uji mundur menyala NB", ov["n_menyala_total"], "dari", ov["n_pasang"], "(%.4f%%)" % (100 * ov["tingkat_menyala"]), "Poisson", ov["n_menyala_poisson_total"])


def uji():
    import random
    import tempfile
    assert abs(poisson_ekor(3, 1.0) - (1 - math.exp(-1) * 2.5)) < 1e-12 and poisson_ekor(0, 2) == 1.0 and poisson_ekor(1, 0) is None
    # binomial negatif: alpha -> 0 = Poisson; rerata benar; ekor lebih berat dari Poisson
    assert abs(nb_ekor(3, 1.0, 0) - poisson_ekor(3, 1.0)) < 1e-12 and abs(nb_ekor(3, 1.0, 1e-6) - poisson_ekor(3, 1.0)) < 1e-4
    assert nb_ekor(5, 1.0, 0.8) > poisson_ekor(5, 1.0) and nb_ekor(0, 2, 0.5) == 1.0 and nb_ekor(1, 0, 0.5) is None
    r, lam = 2.0, 1.5  # alpha 0,5: jumlah pmf harus 1 dan rerata lam
    tot = sum(nb_ekor(k, lam, 0.5) for k in range(1, 400))  # E[X] = sum P(X >= k)
    assert abs(tot - lam) < 1e-6, tot
    # nilai-b: Gutenberg-Richter b = 1 dengan bin 0,1 -> hampir 1
    rnd = random.Random(3)
    mags = [round(4.5 + math.floor(-math.log10(1 - rnd.random()) * 10) / 10, 1) for _ in range(20000)]
    assert abs(b_aki(mags)[0] - 1.0) < 0.06, b_aki(mags)
    # uji mundur: data Poisson murni -> alpha ~ 0 ; data berkelompok (kawanan) -> alpha > 0 dan NB menyala lebih jarang dari Poisson
    t0 = datetime(2000, 1, 1)
    W = 520
    rnd = random.Random(11)
    pois = {"A": [sum(1 for _ in range(1) if rnd.random() < 0.3) for _ in range(W)], "B": [int(rnd.random() < 0.3) for _ in range(W)]}
    ub = uji_mundur(pois, t0)
    assert ub["alpha"] < 0.1, ub["alpha"]
    klaster = {"A": [0] * W, "B": [0] * W}
    for i in klaster:
        for w in range(0, W, 13):
            klaster[i][w] = 6 if (w // 13) % 2 else 1
    uk = uji_mundur(klaster, t0)
    assert uk["alpha"] > 1.0 and uk["n_menyala_total"] <= uk["n_menyala_poisson_total"], uk
    assert uk["minggu_dengan_N_ge_3"] > 0 and uk["n_pasang"] == 2 * W
    # backtest leave-one-year-out: laju tahun Y tidak memuat tahun Y (kawanan satu tahun tidak menurunkan peluangnya sendiri)
    # hitung: satu sasaran, satu kawanan 8 gempa di satu minggu tahun 2005, sisa nol -> lam LOYO tahun itu = 0,5/(sisa hari) kecil -> kawanan menyala
    c1 = {"A": [0] * W, "B": [0] * W}
    c1["A"][5 * 52] = 8
    u1 = uji_mundur(c1, t0)
    assert u1["n_menyala"]["A"] >= 1 and u1["n_menyala"]["B"] == 0, u1
    # gabung BMKG sudah dibuang: N hanya dari USGS
    sas = [{"id": i, "nama": i, "jenis": "gunung_api", "pusat": [la, 100.0], "R_km": 30} for i, la in zip("ABCD", (0.0, 5.0, 10.0, 15.0))]
    hari = 26 * 365.25
    kat = [{"lat": 0.01, "lon": 100.0, "m": 4.8}] * 26 + [{"lat": 5.0, "lon": 101.0, "m": 5.0}] * 5
    bl = hitung_baseline(kat, sas, hari)
    assert bl["A"]["n"] == 26 and bl["B"]["n"] == 0 and bl["B"]["n_usulan"]["50"] == 0 and bl["B"]["n_usulan"]["100"] == 0
    assert hitung_baseline(kat + [{"lat": 5.0, "lon": 100.4, "m": 4.6}], sas, hari)["B"]["n_usulan"]["50"] == 1
    assert hitung_baseline([{"lat": 0.0, "lon": 100.0, "m": 4.4}], sas, hari)["A"]["n"] == 0
    # 7 hari: Jeffreys (n + 0,5); N=3 menyala (NB); N=2 tidak menyala walau peluang kecil; USGS saja
    ev = [{"lat": 0.0, "lon": 100.0, "m": 4.6}, {"lat": 0.02, "lon": 100.0, "m": 4.9}, {"lat": 0.01, "lon": 100.0, "m": 5.2}, {"lat": 10.0, "lon": 100.0, "m": 5.0}, {"lat": 0.0, "lon": 100.0, "m": 4.3}]
    h = {x["id"]: x for x in hitung(ev, sas, bl, hari, 0.2)}
    assert h["A"]["N"] == 3 and abs(h["A"]["harapan"] - 26.5 / hari * 7) < 1e-4 and h["A"]["status"] == "perlu_dicek", h["A"]
    assert h["C"]["N"] == 1 and h["C"]["laju_prior_saja"] is True and h["C"]["usulan_radius"]["label"].startswith("usulan") and h["C"]["status"] == "biasa"
    h2 = {x["id"]: x for x in hitung(ev[:2] + ev[3:], sas, bl, hari, 0.2)}
    assert h2["A"]["N"] == 2 and h2["A"]["p_koreksi"] < AMBANG_P and h2["A"]["status"] == "biasa", "N < 3: satu pasangan susulan tidak menyalakan"
    # jendela USGS tak tertutup -> tidak_dinilai dengan alasan, tanpa angka
    hn = hitung(None, sas, bl, hari, 0.2)
    assert all(x["status"] == "tidak_dinilai" and x["N"] is None and x["p_koreksi"] is None and "USGS" in x["alasan"] for x in hn)
    # n_bmkg hanya info: tidak mengubah status
    hb = {x["id"]: x for x in hitung(ev, sas, bl, hari, 0.2, n_bmkg=[{"lat": 10.0, "lon": 100.0, "m": 4.6}] * 9)}
    assert hb["C"]["n_bmkg"] == 9 and hb["C"]["status"] == h["C"]["status"] and hb["C"]["N"] == 1
    # SS-44: kolom MAGMA terpisah
    ref = int(datetime(2026, 11, 10, 9, 47, tzinfo=timezone.utc).timestamp())
    kg = {"jenis": [{"k": "letusan"}, {"k": "vulkanik_dalam"}], "gunung": {"A": {"kode": "AAA", "hari": {"2026-11-10": [1, 2], "2026-11-04": [0, 4], "2026-11-03": [9, 9]}}}}
    st = {"gunung": [{"nama": "A", "level": 3}, {"nama": "B", "level": 2}]}
    ma = {x["id"]: x for x in silang_magma(hitung(ev, sas, bl, hari, 0.2), kg, st, ref)}
    assert ma["A"]["magma"]["total_7hari"] == 7 and ma["A"]["magma"]["level_nama"] == "Siaga" and ma["B"]["magma"]["kegempaan"] is None
    assert ma["A"]["status"] == h["A"]["status"] and ma["A"]["p_koreksi"] == h["A"]["p_koreksi"], "kolom MAGMA tidak mengubah deteksi"
    doc = {"mulai": "2000-01-01", "akhir": "2026-10-19T06:15Z", "hari": hari, "sasaran": {k: dict(v, n_menyala=0) for k, v in bl.items()}, "kelengkapan": {"ambang": 4.5},
           "overdispersi": {"alpha": 0.2, "tingkat_menyala": 0.0}, "diunduh": "2026-10-19"}
    out = rakit(ev, sas, doc, ref, "2026-11-10T09:47Z", kg, st)
    s = json.dumps(out, ensure_ascii=False)
    assert out["label"] == "Deteksi Centurisk97" and out["bukan_prediksi"] is True and out["teruji"] is False and out["ambang"]["status"] == "hipotesis" and out["hanya_m45_ke_atas"] is True
    assert "aman" not in s.lower().replace("amanah", "") and "akan terjadi" not in s and "kawanan gempa kecil vulkanik" in out["keterbatasan"]
    assert out == rakit(ev, sas, doc, ref, "2026-11-10T09:47Z", kg, st), "deterministik"
    assert rakit(None, sas, doc, ref, "x")["ringkas"]["tidak_dinilai"] == 4 and "tidak terambil" in rakit(None, sas, doc, ref, "x")["sumber_hitungan"]
    # arsip append-only per (tanggal, mode): baris mode lama utuh
    global DATA
    lama, DATA = DATA, tempfile.mkdtemp()
    try:
        jalur = os.path.join(DATA, "beruntun_arsip", "2026-11.jsonl")
        os.makedirs(os.path.dirname(jalur))
        with open(jalur, "w") as f:
            f.write(json.dumps({"tanggal": "2026-11-10", "id": "x", "mode": "relatif"}) + "\n")
        assert arsipkan(out["sasaran"], "2026-11-10") == 4 and arsipkan(out["sasaran"], "2026-11-10") == 0 and arsipkan(out["sasaran"], "2026-11-11") == 4
        with open(jalur) as f:
            baris = [json.loads(x) for x in f]
        assert len(baris) == 9 and baris[0]["mode"] == "relatif"
    finally:
        DATA = lama
    # data nyata
    bl = baca("public/gempa/data/beruntun_baseline.json")
    sas = baca("scripts/gempa/beruntun_sasaran.json")["sasaran"]
    assert set(bl["sasaran"]) == {x["id"] for x in sas} and bl["m_min"] == 4.5 and bl["overdispersi"]["alpha"] > 0 and bl["diunduh"]
    assert all("n_menyala" in v for v in bl["sasaran"].values())
    d = baca("public/gempa/data/beruntun.json")
    assert d["ringkas"]["dinilai"] + d["ringkas"]["tidak_dinilai"] == len(sas) and d["mode"] == MODE
    print("beruntun uji OK:", d["ringkas"], "alpha", bl["overdispersi"]["alpha"])


if __name__ == "__main__":
    a = sys.argv[1] if len(sys.argv) > 1 else "jalan"
    if a == "sasaran":
        g = baca("public/gunungapi/data/gunung.json")
        simpan(SASARAN, {"versi": 1, "catatan": ["Sasaran = seluruh gunung api di public/gunungapi/data/gunung.json (level MAGMA dibaca terpisah di kolom magma).", "Daftar sesar utama belum ada di repo (Q2), jadi tidak ada sasaran sesar.", "R_km awal 30 (hipotesis)."],
                         "sasaran": [{"id": "gn:" + n, "nama": n, "jenis": "gunung_api", "pusat": [v["lat"], v["lon"]], "R_km": R_KM} for n, v in sorted(g.items())]})
    elif a == "baseline":
        d = bangun_baseline()
        simpan(os.path.join(DATA, "beruntun_baseline.json"), d)
        ov = d["overdispersi"]
        nol = [k for k, v in d["sasaran"].items() if v["n"] == 0]
        print("baseline:", d["n_katalog"], "gempa", d["mulai"], "sampai", d["akhir"], "diunduh", d["diunduh"], "| laju nol:", len(nol), "| b", d["kelengkapan"]["b_aki_semua"])
        print("alpha", ov["alpha"], "k", ov["k_ukuran"], "| minggu", ov["n_minggu"], "pasang", ov["n_pasang"], "N>=3:", ov["minggu_dengan_N_ge_3"], "| menyala NB", ov["n_menyala_total"], "(%.4f%%)" % (100 * ov["tingkat_menyala"]), "Poisson", ov["n_menyala_poisson_total"])
        print("komposisi M4.5-4.7 per era:", d["kelengkapan"]["bagian_m45_sampai_47_per_era"])
    elif a == "uji":
        uji()
    else:
        jalan()
