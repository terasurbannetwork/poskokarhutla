#!/usr/bin/env python3
"""Deteksi gempa beruntun (Silang Sumber F5, SS-41 dan SS-42): laju gempa kecil di sekitar gunung api dibanding sekitar lainnya.

BUKAN prediksi gempa dan bukan peringatan. Berlabel "Deteksi Centurisk97"; ambang adalah HIPOTESIS awal (ALGORITMA bagian 4, KEPUTUSAN Q3),
belum diuji balik, jadi layar menulis "belum teruji" (RENCANA-UJI bagian 5). Tanpa kalimat "akan terjadi".

Mode saat ini HANYA "relatif" (perbandingan relatif: sasaran lawan median sasaran lain pada Mc yang sama). Sumber baseline historis (Q1) menunggu pemilik
(SS-40) dan TIDAK dipakai di sini. Masukan: public/gempa/data/inatews_katalog.json (katalog BMKG semua magnitudo, append-only sejak 12 Agu 2026)
dan scripts/gempa/beruntun_sasaran.json (daftar sasaran, dibuat dari public/gunungapi/data/gunung.json oleh `sasaran`).
Keluaran: public/gempa/data/beruntun.json dan beruntun_arsip/YYYY-MM.jsonl (append-only, dibeku pada tanggal data, tidak diisi mundur).

Penyimpangan dari ALGORITMA yang disengaja (tercatat di keluaran): Mc diambil dari katalog GABUNGAN seluruh Indonesia dalam jendela (satu Mc untuk semua
sasaran, supaya "Mc yang sama" benar), karena katalog di lingkaran 30 km hampir tak pernah mencapai 50 kejadian. Status data_kurang: Mc gabungan dari kurang
dari 50 kejadian, atau baseline relatif nol (harapan nol membuat peluang ekor tak bermakna).
Python 3.9+ stdlib. Pakai: python3 scripts/gempa/beruntun.py [jalan]  |  sasaran  |  uji"""
import json
import math
import os
import sys
from datetime import datetime, timezone

AKAR = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "../.."))
DATA = os.path.join(AKAR, "public/gempa/data")
SASARAN = os.path.join(AKAR, "scripts/gempa/beruntun_sasaran.json")
MC_HARI, DETEKSI_HARI, R_KM = 90, 7, 30          # awal (hipotesis)
MC_KOREKSI, N_MIN, AMBANG_P = 0.2, 50, 0.01      # awal (hipotesis)


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


def mc_maxc(mags, koreksi=MC_KOREKSI):
    """Maximum curvature: magnitudo bin 0,1 dengan cacah terbesar + koreksi. None bila kosong. Bin = pembulatan ke 0,1."""
    h = {}
    for m in mags:
        b = round(m * 10)
        h[b] = h.get(b, 0) + 1
    if not h:
        return None
    puncak = max(h.items(), key=lambda kv: (kv[1], -kv[0]))[0]  # seri: magnitudo lebih kecil
    return round(puncak / 10 + koreksi, 1)


def poisson_ekor(n, lam):
    """P(X >= n) untuk Poisson(lam). lam <= 0 -> None (tak bermakna). n <= 0 -> 1."""
    if lam <= 0:
        return None
    if n <= 0:
        return 1.0
    suku, kum = math.exp(-lam), 0.0
    kum = suku
    for k in range(1, n):
        suku *= lam / k
        kum += suku
    return max(0.0, min(1.0, 1.0 - kum))


def median(x):
    s = sorted(x)
    n = len(s)
    return None if not n else (s[n // 2] if n % 2 else (s[n // 2 - 1] + s[n // 2]) / 2)


def hitung(katalog, sasaran, ref, mc_hari=MC_HARI, deteksi_hari=DETEKSI_HARI, ambang=AMBANG_P):
    """katalog: [{t (epoch dtk), lat, lon, m}], sasaran: [{id, nama, jenis, pusat:[lat,lon], R_km}], ref = epoch akhir jendela.
    -> daftar hasil per sasaran + info Mc. Murni, deterministik."""
    awal_mc, awal_det = ref - mc_hari * 86400, ref - deteksi_hari * 86400
    jendela = [k for k in katalog if awal_mc <= k["t"] <= ref]
    mc = mc_maxc([k["m"] for k in jendela])
    di_atas = [k for k in jendela if mc is not None and k["m"] >= mc]
    mc_ok = mc is not None and len(di_atas) >= N_MIN
    sub = {}
    for s in sasaran:
        la, lo = s["pusat"]
        sub[s["id"]] = [k for k in di_atas if abs(k["lat"] - la) <= s["R_km"] / 100 and jarak(la, lo, k["lat"], k["lon"]) <= s["R_km"]]
    N = {i: len([k for k in v if k["t"] >= awal_det]) for i, v in sub.items()}
    hasil = []
    for s in sasaran:
        i = s["id"]
        lain = [N[j] for j in N if j != i]
        harapan = median(lain) if lain else None  # median cacah sasaran lain pada jendela dan Mc yang sama (sama dengan laju x lama jendela)
        status, alasan, p, pk = "biasa", None, None, None
        if not mc_ok:
            status, alasan = "data_kurang", "Mc gabungan dari kurang dari %d kejadian" % N_MIN
        elif not harapan or harapan <= 0:
            status, alasan = "data_kurang", "baseline relatif nol (median sasaran lain tanpa kejadian)"
        else:
            p = poisson_ekor(N[i], harapan)
            pk = min(1.0, p * len(sasaran))
            status = "perlu_dicek" if pk < ambang else "biasa"
        hasil.append({"id": i, "nama": s["nama"], "jenis": s["jenis"], "pusat": s["pusat"], "R_km": s["R_km"], "mc": mc,
                      "n_di_atas_mc": len(sub[i]), "N": N[i], "laju_per_hari": round(N[i] / deteksi_hari, 3), "harapan": None if harapan is None else round(harapan, 3),
                      "p": None if p is None else float("%.3g" % p), "p_koreksi": None if pk is None else float("%.3g" % pk), "status": status, "alasan": alasan, "magma": None})
    return {"mc": mc, "n_katalog_jendela": len(jendela), "n_di_atas_mc": len(di_atas), "mc_ok": mc_ok}, hasil


def epoch(s):
    return int(datetime.strptime(s, "%Y-%m-%dT%H:%MZ").replace(tzinfo=timezone.utc).timestamp())


def muat_katalog():
    k = baca("public/gempa/data/inatews_katalog.json")
    ix = {c: i for i, c in enumerate(k["kolom"])}
    return [{"t": r[ix["t"]], "lat": r[ix["lat"]], "lon": r[ix["lon"]], "m": r[ix["m"]]} for r in k["baris"] if r[ix["m"]] is not None], k


def bangun_sasaran():
    g = baca("public/gunungapi/data/gunung.json")
    return {"versi": 1, "catatan": ["Sasaran = seluruh gunung api di public/gunungapi/data/gunung.json; filter Level II ke atas (KEPUTUSAN Q2) belum diterapkan karena level MAGMA tidak ada di berkas statis.",
                                    "Daftar sesar utama belum ada di repo (Q2), jadi tidak ada sasaran sesar.", "R_km awal 30 (hipotesis)."],
            "sasaran": [{"id": "gn:" + n, "nama": n, "jenis": "gunung_api", "pusat": [v["lat"], v["lon"]], "R_km": R_KM} for n, v in sorted(g.items())]}


def arsipkan(baris, tanggal):
    """Tambah baris hari ini ke beruntun_arsip/YYYY-MM.jsonl. Append-only: hari yang sudah ada tidak ditulis ulang, baris lama tidak disentuh,
    dan hanya tanggal data hari ini yang boleh masuk (tidak ada isi mundur). -> jumlah baris ditulis."""
    jalur = os.path.join(DATA, "beruntun_arsip", tanggal[:7] + ".jsonl")
    ada = set()
    if os.path.exists(jalur):
        with open(jalur, encoding="utf-8") as f:
            ada = {json.loads(x)["tanggal"] for x in f if x.strip()}
    if tanggal in ada:
        return 0
    os.makedirs(os.path.dirname(jalur), exist_ok=True)
    with open(jalur, "a", encoding="utf-8") as f:
        for b in baris:
            f.write(json.dumps({"tanggal": tanggal, "id": b["id"], "mc": b["mc"], "N": b["N"], "harapan": b["harapan"], "p_koreksi": b["p_koreksi"], "status": b["status"], "mode": "relatif"}, ensure_ascii=False, separators=(",", ":")) + "\n")
    return len(baris)


def rakit(katalog, sasaran, ref, dibuat):
    info, hasil = hitung(katalog, sasaran, ref)
    nilai = [h for h in hasil if h["status"] != "data_kurang"]
    return {"versi": 1, "dibuat": dibuat, "label": "Deteksi Centurisk97", "bukan_prediksi": True, "teruji": False,
            "baseline": "relatif", "jendela": {"mc_hari": MC_HARI, "deteksi_hari": DETEKSI_HARI, "akhir": datetime.fromtimestamp(ref, timezone.utc).strftime("%Y-%m-%dT%H:%MZ")},
            "ambang": {"p_koreksi": AMBANG_P, "mc_koreksi": MC_KOREKSI, "n_min": N_MIN, "R_km": R_KM, "status": "hipotesis"},
            "mc": info["mc"], "n_katalog_jendela": info["n_katalog_jendela"], "n_di_atas_mc": info["n_di_atas_mc"],
            "ringkas": {"sasaran": len(hasil), "dinilai": len(nilai), "data_kurang": len(hasil) - len(nilai), "perlu_dicek": len([h for h in hasil if h["status"] == "perlu_dicek"])},
            "sasaran": hasil,
            "catatan": ["Deteksi Centurisk97, bukan prediksi gempa dan bukan peringatan. Ambang adalah hipotesis awal dan belum teruji balik.",
                        "Mode perbandingan relatif: sasaran lawan median sasaran lain pada Mc dan jendela yang sama; bukan baseline historis (pilihan sumber menunggu pemilik, Q1).",
                        "Mc " + str(info["mc"]).replace(".", ",") + " adalah artefak katalog campuran (lonjakan jumlah di M 4,5 karena katalog memuat gempa teleseismik M 4,5 ke atas), bukan ukuran kelengkapan katalog; nilai-b belum diperiksa.",
                        "Mc diambil dari katalog gabungan seluruh Indonesia (satu Mc untuk semua sasaran), bukan per lingkaran; ini penyimpangan dari ALGORITMA bagian 4 yang disengaja.",
                        "Lingkaran sasaran berdekatan (Jawa) berbagi kejadian, sehingga sasaran tidak sepenuhnya bebas. Tektonik regional tidak dibedakan dari vulkanik.",
                        "Katalog BMKG tersedia sejak 12 Agu 2026 (sekitar 90 hari); belum ada jendela lebih panjang."]}


def jalan():
    kat, meta = muat_katalog()
    sas = baca("scripts/gempa/beruntun_sasaran.json")["sasaran"]
    ref = epoch(meta["dibuat"])
    out = rakit(kat, sas, ref, meta["dibuat"])
    simpan(os.path.join(DATA, "beruntun.json"), out)
    tanggal = meta["dibuat"][:10]
    n = arsipkan(out["sasaran"], tanggal)
    print("mc", out["mc"], out["ringkas"], "arsip +%d baris (%s)" % (n, tanggal))
    for h in sorted(out["sasaran"], key=lambda h: -h["N"])[:8]:
        print(" ", h["nama"], "N", h["N"], "n90", h["n_di_atas_mc"], "harapan", h["harapan"], "p_koreksi", h["p_koreksi"], h["status"])


def uji():
    import random
    import tempfile
    # Mc: katalog sintetis hukum Gutenberg-Richter dengan kelengkapan 2,5 -> puncak 2,5 + 0,2
    rnd = random.Random(7)
    mags = [round(2.5 + math.floor(-math.log10(1 - rnd.random()) * 10) / 10, 1) for _ in range(6000)]
    mags += [round(rnd.uniform(0.5, 2.4), 1) for _ in range(300)]  # sedikit tak lengkap di bawah Mc
    assert mc_maxc(mags) == 2.7, mc_maxc(mags)
    assert mc_maxc([]) is None
    # Poisson ekor: P(X>=3 | 1) = 1 - e^-1 (1 + 1 + 0.5)
    assert abs(poisson_ekor(3, 1.0) - (1 - math.exp(-1) * 2.5)) < 1e-12 and poisson_ekor(0, 2) == 1.0 and poisson_ekor(1, 0) is None
    assert abs(poisson_ekor(1, 0.5) - (1 - math.exp(-0.5))) < 1e-12
    # sasaran sintetis: 4 sasaran, satu kawanan di sasaran A; koreksi jumlah sasaran dan ambang
    ref = 10_000_000
    sas = [{"id": "A", "nama": "A", "jenis": "gunung_api", "pusat": [0.0, 100.0], "R_km": 30}, {"id": "B", "nama": "B", "jenis": "gunung_api", "pusat": [5.0, 100.0], "R_km": 30},
           {"id": "C", "nama": "C", "jenis": "gunung_api", "pusat": [10.0, 100.0], "R_km": 30}, {"id": "D", "nama": "D", "jenis": "gunung_api", "pusat": [15.0, 100.0], "R_km": 30}]
    def ev(la, n, m, jam0=1):
        return [{"t": ref - 3600 * (jam0 + j), "lat": la + 0.01, "lon": 100.0, "m": m} for j in range(n)]
    latar = [{"t": ref - 86400 * (10 + j % 70), "lat": 40.0, "lon": 100.0, "m": 3.0} for j in range(100)] + \
            [{"t": ref - 86400 * (10 + j % 70), "lat": 40.0, "lon": 100.0, "m": 3.3} for j in range(60)]
    info, h = hitung(latar, sas, ref)
    assert info["mc"] == 3.2 and info["mc_ok"] and info["n_di_atas_mc"] == 60, info
    assert all(x["status"] == "data_kurang" and "baseline relatif nol" in x["alasan"] for x in h), "median nol -> tak ada p"
    sedikit = [k for k in latar if k["m"] == 3.0] + [k for k in latar if k["m"] == 3.3][:30]
    info, h = hitung(sedikit, sas, ref)
    assert not info["mc_ok"] and all(x["status"] == "data_kurang" and "Mc gabungan" in x["alasan"] for x in h), "n di atas Mc < 50 -> data_kurang"
    kat4 = latar + ev(0.0, 20, 3.5) + ev(5.0, 3, 3.5) + ev(10.0, 3, 3.5) + ev(15.0, 3, 3.5) + ev(0.0, 5, 3.0)  # M3,0 di bawah Mc tidak dihitung
    info, h = hitung(kat4, sas, ref)
    by = {x["id"]: x for x in h}
    assert by["A"]["N"] == 20 and by["A"]["harapan"] == 3 and by["A"]["status"] == "perlu_dicek", by["A"]
    assert abs(by["A"]["p_koreksi"] / (poisson_ekor(20, 3) * 4) - 1) < 5e-3, by["A"]
    assert by["B"]["status"] == "biasa" and by["B"]["p_koreksi"] == 1.0, by["B"]
    out = rakit(kat4, sas, ref, "2026-11-10T09:47Z")
    assert out["label"] == "Deteksi Centurisk97" and out["bukan_prediksi"] is True and out["teruji"] is False and out["ambang"]["status"] == "hipotesis"
    assert "aman" not in json.dumps(out, ensure_ascii=False).lower().replace("amanah", "") and "akan terjadi" not in json.dumps(out, ensure_ascii=False)
    assert out == rakit(kat4, sas, ref, "2026-11-10T09:47Z"), "deterministik"
    # arsip append-only: hari yang sama tidak ditulis dua kali, baris lama utuh
    global DATA
    lama, DATA = DATA, tempfile.mkdtemp()
    try:
        assert arsipkan(out["sasaran"], "2026-11-10") == 4 and arsipkan(out["sasaran"], "2026-11-10") == 0 and arsipkan(out["sasaran"], "2026-11-11") == 4
        jalur = os.path.join(DATA, "beruntun_arsip", "2026-11.jsonl")
        with open(jalur) as f:
            baris = [json.loads(x) for x in f]
        assert len(baris) == 8 and [b["tanggal"] for b in baris].count("2026-11-10") == 4
    finally:
        DATA = lama
    # data nyata: berkas masukan terbaca dan hasil konsisten
    kat, meta = muat_katalog()
    sas = baca("scripts/gempa/beruntun_sasaran.json")["sasaran"]
    out = rakit(kat, sas, epoch(meta["dibuat"]), meta["dibuat"])
    assert out["ringkas"]["sasaran"] == len(sas) and out["ringkas"]["dinilai"] + out["ringkas"]["data_kurang"] == len(sas)
    print("beruntun uji OK:", out["ringkas"], "mc", out["mc"])


if __name__ == "__main__":
    a = sys.argv[1] if len(sys.argv) > 1 else "jalan"
    if a == "sasaran":
        simpan(SASARAN, bangun_sasaran())
        print("sasaran:", len(bangun_sasaran()["sasaran"]))
    else:
        {"uji": uji}.get(a, jalan)()
