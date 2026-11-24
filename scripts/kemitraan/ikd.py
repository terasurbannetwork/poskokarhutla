#!/usr/bin/env python3
"""Masalah dari prioritas IKD terlemah per kab (KEPUTUSAN-INARISK K6 butir 3; ALGORITMA §3.6, KM-I01). Murni: ikd.json -> masalah_ikd.json.
Sumber: public/data/inarisk/ikd.json (analisa 'kab/tahun': nilai[7] P1..P7, rek[[prioritas 1-7, indikator, aksi]]). Hanya dibaca.
Tahun = terbaru yang punya analisa untuk kab itu. 1-2 prioritas bernilai terendah (seri: nomor prioritas menaik; hanya prioritas yang punya
rekomendasi indikator). Judul = nama prioritas; indikator = teks indikator rekomendasi InaRISK apa adanya. Kab tanpa analisa: tak ada butir (bukan 0).
Bahaya B = multi, aspek A = A5 (kapasitas kelembagaan; bawaan, IKD tak membedakan bahaya). Masuk kueri BM25 lewat cocok_pakar.proses_kab.
Pakai: python3 -I scripts/kemitraan/ikd.py [--tulis] | --cek"""
import json, os, sys

AKAR = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
IKD = os.path.join(AKAR, "public", "data", "inarisk", "ikd.json")
KELUAR = os.path.join(AKAR, "public", "data", "kemitraan", "masalah_ikd.json")
MAKS = 2


def butir(kab, tahun, a, d):
    """Butir masalah untuk satu analisa a (dict indeks/nilai/rek) dan kamus ikd d."""
    ada = sorted({r[0] for r in a["rek"]})
    nil = [(a["nilai"][p - 1], p) for p in ada if 1 <= p <= len(a["nilai"]) and a["nilai"][p - 1] is not None]
    nil.sort()
    out = []
    for v, p in nil[:MAKS]:
        ind = list(dict.fromkeys(d["indikator"][r[1]] for r in a["rek"] if r[0] == p))
        out.append({"auto_id": f"ikd-{kab}-{tahun}-P{p}", "B": "multi", "A": "A5", "sumber": "ikd", "label": f"IKD InaRISK {tahun}",
                    "judul": f"Prioritas IKD terlemah: {d['prioritas'][p - 1]}", "prioritas": p, "nilai": v, "indeks_kab": a.get("indeks"), "tahun": tahun,
                    "indikator": ind})
    return out


def bangun(d, kode=None):
    """-> {kab4: [butir]} hanya kab yang punya analisa dan butir; kode (kode.json) bila diberi menyaring kab di luar crosswalk (tak dicocokkan, dilewati)."""
    terbaru = {}
    for k in d["analisa"]:
        kab, th = k.split("/")
        if len(kab) != 4:
            continue  # analisa tingkat provinsi (2 digit) bukan kab
        if kode is not None and kab not in kode:
            continue
        terbaru[kab] = max(terbaru.get(kab, 0), int(th))
    hasil = {}
    for kab in sorted(terbaru):
        b = butir(kab, terbaru[kab], d["analisa"][f"{kab}/{terbaru[kab]}"], d)
        if b:
            hasil[kab] = b
    return hasil


def muat():
    """Berkas terbit -> {kab4: [butir]} atau {} bila belum ada."""
    return json.load(open(KELUAR, encoding="utf-8")).get("kab", {}) if os.path.exists(KELUAR) else {}


def kode_json():
    return json.load(open(os.path.join(AKAR, "public", "data", "kemitraan", "kode.json"), encoding="utf-8"))


def tulis():
    d = json.load(open(IKD, encoding="utf-8"))
    h = bangun(d, kode_json())
    doc = {"v": 1, "sumber": d.get("sumber"), "tanggal": d.get("dibuat"), "arti": "prioritas IKD bernilai terendah per kab pada tahun analisa terbaru; hanya kab beranalisa",
           "n_kab": len(h), "kab": h}
    with open(KELUAR, "w", encoding="utf-8") as f:
        f.write(json.dumps(doc, ensure_ascii=False, sort_keys=True, separators=(",", ":")) + "\n")
    print(f"{len(h)} kab, {sum(len(v) for v in h.values())} butir -> {os.path.relpath(KELUAR, AKAR)}")


def cek():
    d = {"prioritas": ["Satu", "Dua", "Tiga"], "indikator": ["ind a", "ind b", "ind c", "ind a"],
         "analisa": {"1111/2024": {"indeks": .3, "nilai": [.5, .2, .2], "rek": [[1, 0, 0], [2, 1, 1], [3, 2, 2], [3, 3, 3]]},
                     "1111/2025": {"indeks": .4, "nilai": [.9, .6, .2], "rek": [[2, 1, 1], [3, 2, 2], [3, 3, 3]]},
                     "2222/2025": {"indeks": .4, "nilai": [.9, .6, .7], "rek": []}}}
    h = bangun(d)
    assert set(h) == {"1111"}, "kab tanpa rekomendasi tak punya butir (bukan nol)"
    b = h["1111"]
    assert [x["auto_id"] for x in b] == ["ikd-1111-2025-P3", "ikd-1111-2025-P2"] and b[0]["nilai"] == .2 and b[1]["nilai"] == .6, "tahun terbaru, terendah dulu"
    assert b[0]["indikator"] == ["ind c", "ind a"] and b[0]["label"] == "IKD InaRISK 2025", "uraian = teks indikator, dedupe"
    assert all(x["B"] == "multi" and x["sumber"] == "ikd" for x in b)
    ik = json.load(open(IKD, encoding="utf-8"))
    nyata = bangun(ik, kode_json())
    assert nyata and len(nyata) >= 500, f"kab berbutir {len(nyata)}"
    assert all(1 <= len(v) <= MAKS and all(x["indikator"] and x["nilai"] is not None for x in v) for v in nyata.values())
    if os.path.exists(KELUAR):
        assert muat() == nyata, "masalah_ikd.json basi: jalankan ikd.py --tulis"
    print(f"OK ikd.py: {len(nyata)} kab, {sum(len(v) for v in nyata.values())} butir")


if __name__ == "__main__":
    if "--cek" in sys.argv:
        cek()
    elif "--tulis" in sys.argv:
        tulis()
    else:
        sys.exit(__doc__)
