"""DIK-1 Peta sasaran diklat berbasis risiko (DESAIN-TEKNIS sec 6.29; ALGORITMA sec 5.5 baris DIK-1, sec 10.42; tiket RU-069).

Langkah jalan.py (bulanan; keluaran unit/diklat_sasaran.json). Satu rumus MB-4 (skor.py), komponen bawaan sama dengan MT-2 (mt2.komponen):
  risiko, celah_kapasitas, kejadian  persentil; bobot sama rata (asumsi)
  celah_layanan                      mutlak = 1 - min(lulus_5thn / sdm_pb_kab, 1); sdm_pb_kab bawaan 30 orang per BPBD (asumsi, riset/6 pertanyaan 6)
Tanpa unggahan angkatan komponen celah_layanan tidak ada: kartu menulis "cakupan belum ada data" (bukan 0) dan hanya menampilkan urutan kebutuhan.
Rumus lama (1 + kejadian) tidak dipakai (ALGORITMA 5.3 butir 5).

Pemilihan (ALGORITMA 10.42): sasaran = kab dengan kebutuhan (S tanpa celah layanan) di 50% teratas; kab terlayani = punya >= 1 angkatan dalam 5 tahun
(asumsi); urut S (dengan celah layanan) menurun, tambahkan kab sasaran yang belum terlayani sampai terlayani / sasaran >= target Renstra 78% (2026).
Perkiraan angkatan = jumlah kab yang ditambahkan. Hanya berjalan bila cakupan ada.

Masukan angkatan: data/raw/unit/diklat_ringkas.json = {"kab": {kode_kemendagri: {"angkatan": n, "lulus": m}}} (agregat 5 tahun terakhir dari
GET /api/unit/diklat/ringkas, RU-068); berkas ada = unggahan ada, kab tanpa baris dianggap 0 angkatan (asumsi). Tanpa nama peserta.
HIPOTESIS: uji balik MB-4 (lab_kriteria/mb4.json) belum dijalankan; judul netral, kata "prioritas" tidak dipakai.

  python3 -I scripts/bnpb/unit/dik1.py --cek
"""
import hashlib
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))  # -I tidak menaruh folder skrip
import mt2  # noqa: E402
import rapor  # noqa: E402
import skor  # noqa: E402

AKAR = mt2.AKAR
RINGKAS = os.path.join(AKAR, "data", "raw", "unit", "diklat_ringkas.json")
SDM_PB_KAB = 30        # asumsi, riset/6 pertanyaan 6
TARGET = 0.78          # target Renstra 2026
BOBOT3 = {"risiko": 1, "celah_kapasitas": 1, "kejadian": 1}
BOBOT4 = {**BOBOT3, "celah_layanan": 1}
BELUM = "cakupan belum ada data"
ASUMSI = ["Asumsi: belum lulus uji balik", "Asumsi: bobot sementara", "Asumsi: 30 orang SDM tiap BPBD",
          "Asumsi: kab tanpa baris unggahan dianggap 0", "Asumsi: sasaran 50% teratas kebutuhan", "Asumsi: terlayani = 1 angkatan dalam 5 tahun"]
MAKS_BARIS = 50


def celah_layanan(lulus, sdm=SDM_PB_KAB):
    """1 - min(lulus / sdm, 1); v di [0, 1], 0 berarti sudah tercakup penuh."""
    return 1 - min(lulus / sdm, 1)


def hitung(nilai, ringkas):
    """nilai = mt2.komponen(...)[0]. ringkas None = unggahan tidak ada. Mengembalikan (s_kebutuhan, s_penuh, cakupan)."""
    kom = {j: {"tipe": "persentil", "nilai": v, "arah": 1} for j, v in nilai.items()}
    s3 = skor.skor(kom, BOBOT3)
    if ringkas is None:
        return s3, s3, False
    kab_ada = set(nilai["risiko"]) | set(nilai["celah_kapasitas"]) | set(nilai["kejadian"])
    lulus = {k: ringkas.get(k, {}).get("lulus", 0) for k in kab_ada}
    kom4 = {**kom, "celah_layanan": {"tipe": "mutlak", "v": {k: celah_layanan(v) for k, v in lulus.items()}}}
    return s3, skor.skor(kom4, BOBOT4), True


def pilih(s3, s4, ringkas, target=TARGET):
    """Sasaran 50% teratas kebutuhan; tambah kab belum terlayani menurut S4 sampai terlayani/sasaran >= target.
    Mengembalikan {sasaran, terlayani_awal, dipilih: [kab], terlayani_akhir, tercapai}. ringkas None -> None."""
    if ringkas is None:
        return None
    ada = [k for k in skor.urut(s3) if s3[k]["skor"] is not None]
    sasaran = ada[:(len(ada) + 1) // 2]
    layani = {k for k in sasaran if ringkas.get(k, {}).get("angkatan", 0) >= 1}
    n, dipilih = len(sasaran), []
    for k in skor.urut(s4):
        if n == 0 or (len(layani) + len(dipilih)) / n >= target:
            break
        if k in sasaran and k not in layani and s4[k]["skor"] is not None:
            dipilih.append(k)
    akhir = len(layani) + len(dipilih)
    return {"sasaran": n, "terlayani_awal": len(layani), "dipilih": dipilih, "terlayani_akhir": akhir, "tercapai": bool(n) and akhir / n >= target}


def bangun(docs, ringkas, nama, tahun_akhir, hari_ini):
    nilai, _ = mt2.komponen(docs["terpapar"]["kab"], docs["ikd"]["kab"], docs["dibi_kab_tahun"]["baris"], tahun_akhir)
    s3, s4, cakupan = hitung(nilai, ringkas)
    pl = pilih(s3, s4, ringkas)
    s = s4
    urutan = [k for k in skor.urut(s) if s[k]["skor"] is not None]
    tampil = pl["dipilih"] if pl else urutan[:MAKS_BARIS]
    baris = [{"no": i + 1, "kab": nama.get(k, k), "skor": s[k]["skor"],
              **({"layanan": s[k]["rinci"]["celah_layanan"]["v"]} if cakupan else {})}
             for i, k in enumerate(tampil[:MAKS_BARIS])]
    kolom = [{"k": "no", "label": "No", "angka": True}, {"k": "kab", "label": "Kab/kota"},
             {"k": "skor", "label": "Skor MB-4", "angka": True, "desimal": 2, "title": "Rata-rata geometrik persentil risiko, celah kapasitas, kejadian" + (" dan celah layanan mutlak" if cakupan else "")
              + "; bobot sama rata (asumsi); hipotesis, uji balik belum jalan"}]
    if cakupan:
        kolom.append({"k": "layanan", "label": "Celah layanan", "angka": True, "desimal": 2, "title": "1 dikurangi lulusan 5 tahun dibagi 30 orang SDM tiap BPBD (asumsi), maksimal 1"})
    angka = [{"k": "berskor", "label": "Kab/kota berskor", "nilai": len(urutan)}]
    if pl:
        angka += [{"k": "sasaran", "label": "Kab/kota sasaran (kebutuhan 50% teratas)", "nilai": pl["sasaran"]},
                  {"k": "terlayani", "label": "Sasaran yang sudah punya angkatan", "nilai": pl["terlayani_awal"], "title": "terlayani = punya sedikitnya 1 angkatan dalam 5 tahun (asumsi)"},
                  {"k": "angkatan", "label": "Perkiraan angkatan tambahan", "nilai": len(pl["dipilih"]), "title": f"kab sasaran yang ditambah sampai {round(TARGET * 100)} persen sasaran terlayani (target Renstra 2026)"}]
    kartu = rapor.kartu(
        id="dik1-sasaran", sistem="DIK-1", pil="Sasaran diklat", ikon="toga", judul="Urutan skor sasaran diklat, usulan analis",
        angka=angka, kolom=kolom, baris=baris,
        rumus="S = prod q_j^(w_j / W) atas risiko, celah kapasitas, kejadian" + (", celah layanan = 1 - min(lulusan 5 tahun / 30, 1)" if cakupan else "") + "; q persentil = maks(persentil, 0,01)",
        sumber=["terpapar", "ikd", "dibi_kab_tahun"] + (["diklat_angkatan"] if cakupan else []), label=["proksi", "hitungan_kita"], asumsi=ASUMSI)
    sumber = [{"nama": f"{n}.json", "url": f"repo:public/data/bnpb/{n}.json", "diambil": docs[n]["dibuat"][:10], "lisensi": docs[n].get("lisensi", "tidak tertulis")[:200]}
              for n in ("terpapar", "ikd", "dibi_kab_tahun")]
    if cakupan:
        sumber.append({"nama": "Angkatan diklat Pusdiklat PB (unggahan CSV, agregat)", "url": "repo:scripts/bnpb/unit/dik1.py", "diambil": hari_ini, "lisensi": "data internal BNPB, agregat per kab"})
    b = rapor.berkas([kartu], sumber)
    with open(mt2.KRITERIA, "rb") as f:
        sha = hashlib.sha256(f.read()).hexdigest()
    b["data"] = {"hipotesis": True, "uji_balik": {"kriteria_sha": sha, "lulus": None}, "cakupan": BELUM if not cakupan else None, "bobot": BOBOT4 if cakupan else BOBOT3,
                 "sdm_pb_kab": SDM_PB_KAB, "target": TARGET, "pemilihan": pl, "jendela_kejadian": [tahun_akhir - 4, tahun_akhir],
                 "kab": [{"kab": k, "skor": s[k]["skor"], "rinci": {j: r.get("p", r.get("v")) for j, r in s[k]["rinci"].items()}, "hilang": s[k]["hilang"]} for k in skor.urut(s)]}
    return b


def _ringkas():
    if not os.path.exists(RINGKAS):
        return None
    with open(RINGKAS, encoding="utf-8") as f:
        d = json.load(f)
    return d.get("kab") if isinstance(d.get("kab"), dict) else None


def jalan():
    from datetime import datetime, timedelta, timezone
    docs = mt2._docs()
    hari = (datetime.now(timezone.utc) + timedelta(hours=7)).date().isoformat()
    return {"diklat_sasaran": bangun(docs, _ringkas(), mt2._nama(), mt2.tahun_akhir_data(docs["dibi_kab_tahun"]["baris"]), hari)}


def _dekat(a, b, tol=5e-6):
    assert a is not None and abs(a - b) <= tol, f"dapat {a}, harap {b}"


def cek():
    # A5 dan A6 (ALGORITMA 5.6): celah layanan 12 lulusan dari 30 -> v 0,6
    assert abs(celah_layanan(12) - 0.6) < 1e-12 and celah_layanan(0) == 1 and celah_layanan(45) == 0
    p = {"risiko": 0.8, "celah_kapasitas": 0.7, "kejadian": 0.5}
    k = {j: {"tipe": "persentil", "p": {"a": v}} for j, v in p.items()}
    _dekat(skor.skor({**k, "celah_layanan": {"tipe": "mutlak", "v": {"a": celah_layanan(12)}}}, BOBOT4)["a"]["skor"], 0.64022)
    a6 = skor.skor(k, BOBOT3)["a"]
    _dekat(a6["skor"], 0.65421)
    # A6 lewat hitung(): tanpa unggahan = 3 komponen, celah layanan tidak ada, bukan 0
    nilai = {"risiko": {f"k{i}": i * 10 for i in range(10)}, "celah_kapasitas": {f"k{i}": 0.1 * i for i in range(10)}, "kejadian": {f"k{i}": i for i in range(10)}}
    s3, s4, cakupan = hitung(nilai, None)
    assert cakupan is False and s3 is s4 and all("celah_layanan" not in x["rinci"] for x in s4.values())
    assert pilih(s3, s4, None) is None
    # dengan unggahan: kab tanpa baris = 0 lulusan -> celah layanan 1 (bukan hilang)
    s3, s4, cakupan = hitung(nilai, {"k9": {"angkatan": 2, "lulus": 30}, "k8": {"angkatan": 1, "lulus": 12}})
    assert cakupan and s4["k9"]["rinci"]["celah_layanan"]["v"] == 0 and s4["k9"]["skor"] == 0.0
    assert abs(s4["k8"]["rinci"]["celah_layanan"]["v"] - 0.6) < 1e-12 and s4["k0"]["rinci"]["celah_layanan"]["v"] == 1
    # pemilihan: sasaran = 5 teratas kebutuhan (k5..k9); terlayani k9, k8 -> 2/5; tambah menurut S penuh sampai >= 0,78 (4 dari 5)
    r = pilih(s3, s4, {"k9": {"angkatan": 2, "lulus": 30}, "k8": {"angkatan": 1, "lulus": 12}})
    assert r["sasaran"] == 5 and r["terlayani_awal"] == 2 and r["tercapai"] and r["terlayani_akhir"] == 4 and len(r["dipilih"]) == 2, r
    assert set(r["dipilih"]) <= {"k5", "k6", "k7"} and all(k not in ("k9", "k8") for k in r["dipilih"])
    skor_dipilih = [s4[k]["skor"] for k in r["dipilih"]]
    assert skor_dipilih == sorted(skor_dipilih, reverse=True), "dipilih menurut S menurun"
    r0 = pilih(s3, s4, {})   # unggahan ada tapi kosong: tidak ada yang terlayani, 4 dari 5 tambahan
    assert r0["terlayani_awal"] == 0 and len(r0["dipilih"]) == 4 and r0["tercapai"], r0
    full = pilih(s3, s4, {f"k{i}": {"angkatan": 1, "lulus": 1} for i in range(10)})
    assert full["dipilih"] == [] and full["tercapai"], "sudah tercapai: tidak menambah"
    # data nyata
    docs, nama = mt2._docs(), mt2._nama()
    th = mt2.tahun_akhir_data(docs["dibi_kab_tahun"]["baris"])
    b = bangun(docs, None, nama, th, "2026-11-26")
    rapor.periksa_berkas({"dibuat": "2026-11-26T00:00:00Z", "basi_jam": 1080, **b})
    d = b["data"]
    assert d["cakupan"] == BELUM and d["pemilihan"] is None and len(d["kab"]) == 514 and d["hipotesis"] is True
    kt = b["kartu"][0]
    assert len(kt["baris"]) == MAKS_BARIS and all(c["k"] != "layanan" for c in kt["kolom"]) and "prioritas" not in json.dumps(kt, ensure_ascii=False).lower()
    ring = {k: {"angkatan": (1 if i % 3 == 0 else 0), "lulus": i % 7} for i, k in enumerate(sorted(docs["terpapar"]["kab"]))}
    b2 = bangun(docs, ring, nama, th, "2026-11-26")
    rapor.periksa_berkas({"dibuat": "2026-11-26T00:00:00Z", "basi_jam": 1080, **b2})
    p2 = b2["data"]["pemilihan"]
    assert b2["data"]["cakupan"] is None and p2["sasaran"] > 0 and p2["tercapai"] and all(x["layanan"] is not None for x in b2["kartu"][0]["baris"]) and b2["kartu"][0]["baris"]
    assert len(b2["kartu"][0]["baris"]) == min(len(p2["dipilih"]), MAKS_BARIS)
    for x in (b, b2):
        s = json.dumps(x, ensure_ascii=False)
        assert "·" not in s and not re.search(r"\baman\b", s, re.I)
    assert mt2._muat(mt2.KRITERIA)["bobot"] == BOBOT3
    print(f"dik1.py --cek: lulus (A5 0,64022, A6 0,65421; tanpa unggahan '{BELUM}'; contoh unggahan: {p2['sasaran']} sasaran, {len(p2['dipilih'])} angkatan tambahan)")


if __name__ == "__main__":
    if "--cek" in sys.argv:
        cek()
    else:
        print(__doc__)
