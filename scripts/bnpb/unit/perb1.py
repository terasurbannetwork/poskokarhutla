"""PERB-1 Pemilih daerah pendampingan IKD (DESAIN-TEKNIS sec 5.1, sec 10 butir 7; ALGORITMA sec 10.1; tiket RU-043).

Langkah jalan.py (bulanan). Bukan IRB resmi: C adalah raster kapasitas InaRISK (proksi, ikd.json), nilai IKD resmi per kab
tidak tersedia (U10 bawaan). Urutan = manfaat / biaya proksi (bukan skor MB-4, ALGORITMA sec 5.5), urutan stabil menurut kode.

  H_k = maks_j H_kj (asumsi dokumen DT sec 5.1), C_k = c
  V_k = Phi(v): risiko_hvc.json `v` adalah skor z (negatif ada), bukan indeks 0-1 seperti tulisan DT "V_k = v";
        dipetakan ke [0, 1] dengan Phi persis rumus risiko_hvc.json ("H01_j x Phi(V_z)"), dicatat untuk validasi-model
  R_k(C) = (H_k x V_k x (1 - C))^(1/3)                    Buku RBI hal. 53
  d_k = ambang kelas berikut - C_k; kelas Jam Aturan ikd_ambang_kelas (asumsi): rendah C < 0,40; sedang 0,40 <= C < 0,80; tinggi C >= 0,80
  manfaat_k = (1/514) x [R_k(C_k) - R_k(C_k + d_k)]       n_k = 1/514, rata-rata sederhana (asumsi riset/1 pertanyaan 3)
  biaya_k = maks(haversine pusat kab ke Jakarta (km), BIAYA_MIN_KM), proksi biaya (lantai 100 km asumsi, U13)
  naik_iku2 = C_k < 0,40 <= C_k + d_k dan IKD provinsi LAKIP 2025 Lampiran 2 < 0,40 (kolom, bukan bonus angka)

Tanpa uji balik: retrospektif tidak mungkin (IKD per kab tidak ada); kartu hanya "manfaat hitungan, bukan IRB resmi" (ALGORITMA sec 12).

  python3 -I scripts/bnpb/unit/perb1.py --cek
"""
import json
import math
import os
import re
import statistics
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))  # -I tidak menaruh folder skrip
import aturan  # noqa: E402
import rapor  # noqa: E402

AKAR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
DATA = os.path.join(AKAR, "public", "data", "bnpb")
N_KAB = 514
JAKARTA = (-6.1754, 106.8272)  # ALGORITMA sec 10.1
# Asumsi (KEPUTUSAN-AWAL U13, bawaan sementara): biaya proksi dijepit bawah supaya kab di dekat Jakarta (Jakarta Pusat 1,1 km)
# tidak meledakkan manfaat / jarak. Tampil sebagai pil Asumsi di kartu.
BIAYA_MIN_KM = 100
ASUMSI_BIAYA = f"Asumsi: biaya proksi paling sedikit {BIAYA_MIN_KM} km"
LABEL_WAJIB = "bukan IRB resmi"
C_LABEL = "proksi_raster"
# IKD rata-rata per provinsi, LAKIP BNPB 2025 Lampiran 2 hal. 112-113, diketik dari data/kajian-bnpb/pustaka/5-lakip.md sec 6.
# Kode Kemendagri 2022: 91 Papua, 92 Papua Barat, 93 Papua Selatan, 94 Papua Tengah, 95 Papua Pegunungan, 96 Papua Barat Daya.
IKD_PROV_2025 = {"11": 0.38, "12": 0.37, "13": 0.38, "14": 0.34, "15": 0.34, "16": 0.39, "17": 0.42, "18": 0.54, "19": 0.47,
                 "21": 0.34, "31": 0.64, "32": 0.65, "33": 0.74, "34": 0.76, "35": 0.61, "36": 0.67, "51": 0.63, "52": 0.55,
                 "53": 0.42, "61": 0.44, "62": 0.46, "63": 0.54, "64": 0.57, "65": 0.57, "71": 0.48, "72": 0.39, "73": 0.39,
                 "74": 0.34, "75": 0.53, "76": 0.28, "81": 0.37, "82": 0.33, "91": 0.24, "92": 0.27, "93": 0.22, "94": 0.23,
                 "95": 0.21, "96": 0.24}
PHI = statistics.NormalDist().cdf  # sama dengan risiko_hvc.json rumus


def _muat(p):
    with open(p, encoding="utf-8") as f:
        return json.load(f)


def kelas(c):
    lo, hi = aturan.nilai("ikd_ambang_kelas")
    return "rendah" if c < lo else "sedang" if c < hi else "tinggi"


def jarak_naik(c):
    """d ke ambang kelas berikut; None bila sudah kelas tinggi. Tidak pernah 0 (E4: C = 0,40 tepat -> 0,40)."""
    lo, hi = aturan.nilai("ikd_ambang_kelas")
    return lo - c if c < lo else hi - c if c < hi else None


def r(h, v, c):
    return (h * v * (1 - c)) ** (1 / 3)


def _indeks(x, nama):
    if isinstance(x, bool) or not isinstance(x, (int, float)) or not math.isfinite(x) or not 0 <= x <= 1:
        raise ValueError(f"{nama}={x!r} harus angka di [0, 1]")
    return x


def satu(h, v, c):
    """Satu kab -> {d, r_kini, r_naik, manfaat} atau {alasan} bila tidak masuk daftar."""
    h, v, c = _indeks(h, "H"), _indeks(v, "V"), _indeks(c, "C")
    d = jarak_naik(c)
    if d is None:
        return {"d": None, "alasan": "sudah kelas tinggi"}
    rk, rn = r(h, v, c), r(h, v, c + d)
    return {"d": d, "r_kini": rk, "r_naik": rn, "manfaat": (rk - rn) / N_KAB, "alasan": None}


def haversine(a, b):
    p1, p2 = math.radians(a[0]), math.radians(b[0])
    dl, dp = math.radians(b[1] - a[1]), p2 - p1
    x = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * 6371.0088 * math.asin(math.sqrt(x))


def hitung(hvc, ikd, kode):
    lo = aturan.nilai("ikd_ambang_kelas")[0]
    daftar, tinggi, kosong = [], [], []
    for k in sorted(ikd):
        c = ikd[k].get("c")
        hk = hvc.get(k) or {}
        hs = [x for x in (hk.get("H") or {}).values() if x is not None]
        if c is None or not hs or hk.get("v") is None:
            kosong.append(k)  # "kapasitas belum ada": tidak diurutkan, bukan 0
            continue
        h = max(hs)
        v = PHI(hk["v"])
        s = satu(h, v, c)
        if s["d"] is None:
            tinggi.append(k)
            continue
        kd = kode.get(k) or {}
        jarak = haversine(kd["pusat"], JAKARTA) if kd.get("pusat") else None
        prov = kd.get("prov") or k[:2]
        ikd_prov = IKD_PROV_2025.get(prov)
        daftar.append({"kab": k, "nama_kab": kd.get("nama"), "prov": prov, "h": h, "v_z": hk["v"], "v": v, "c": c,
                       "kelas_kini": kelas(c), "kelas_naik": kelas(c + s["d"]), "d": s["d"], "r_kini": s["r_kini"],
                       "r_naik": s["r_naik"], "manfaat": s["manfaat"], "jarak_km": jarak,
                       "biaya_km": None if jarak is None else max(jarak, BIAYA_MIN_KM),
                       "rasio": None if jarak is None else s["manfaat"] / max(jarak, BIAYA_MIN_KM),
                       "naik_iku2": None if ikd_prov is None else (c < lo <= c + s["d"] and ikd_prov < lo),
                       "ikd_prov": ikd_prov, "c_label": C_LABEL})
    daftar.sort(key=lambda b: (b["rasio"] is None, -(b["rasio"] or 0), b["kab"]))
    return daftar, tinggi, kosong


def _kartu(daftar, tinggi, kosong):
    naik2 = sum(1 for b in daftar if b["naik_iku2"])
    KL = {"rendah": "Rendah", "sedang": "Sedang", "tinggi": "Tinggi"}
    baris = [{"no": i + 1, "kab": b["nama_kab"] or b["kab"], "kelas_kini": KL[b["kelas_kini"]], "kelas_naik": KL[b["kelas_naik"]],
              "c": b["c"], "manfaat": b["manfaat"] * 1e6, "jarak_km": b["jarak_km"], "biaya_km": b["biaya_km"],
              "rasio": None if b["rasio"] is None else b["rasio"] * 1e6,
              "naik_iku2": "ya" if b["naik_iku2"] else "belum ada data" if b["naik_iku2"] is None else "tidak"}
             for i, b in enumerate(daftar)]
    return rapor.kartu(
        id="perb1-pendampingan", sistem="PERB-1", pil="Pendampingan IKD", ikon="timbang",
        judul="Pendampingan IKD, bukan IRB resmi",
        angka=[{"k": "kab", "label": "Kab/kota naik satu kelas bila didampingi", "nilai": len(daftar)},
               {"k": "naik_iku2", "label": "Di antaranya mengangkat provinsi di bawah 0,40", "nilai": naik2,
                "title": "IKD provinsi LAKIP 2025 Lampiran 2 di bawah 0,40 dan kab naik melewati 0,40"},
               {"k": "tinggi", "label": "Sudah kelas tinggi, tidak masuk daftar", "nilai": len(tinggi)},
               {"k": "kosong", "label": "Kapasitas belum ada", "nilai": len(kosong)}],
        kolom=[{"k": "no", "label": "No", "angka": True},
               {"k": "kab", "label": "Kab/kota"},
               {"k": "kelas_kini", "label": "Kelas kini", "title": "Kelas C proksi raster dengan ambang 0,40 dan 0,80 (asumsi; ikd.json raster memakai 0,33 dan 0,66)"},
               {"k": "kelas_naik", "label": "Kelas sesudah", "title": "Kelas sesudah C naik d ke ambang berikut"},
               {"k": "c", "label": "C proksi", "title": "Raster kapasitas InaRISK, median per kab (ikd.json), bukan IKD resmi", "angka": True, "desimal": 3},
               {"k": "manfaat", "label": "Manfaat IRB hitungan (per sejuta)", "desimal": 1, "title": "1.000.000 x (1/514) x [R(C) - R(C + d)], R = (H x V x (1 - C))^(1/3); H = maks lintas jenis (asumsi), V = Phi(skor z kerentanan)", "angka": True},
               {"k": "jarak_km", "label": "Jarak ke Jakarta (km)", "title": "Jarak garis lurus pusat kab ke Jakarta", "angka": True, "desimal": 0},
               {"k": "biaya_km", "label": "Biaya proksi (km)", "title": "maks(jarak ke Jakarta, 100 km); lantai 100 km asumsi", "angka": True, "desimal": 0},
               {"k": "rasio", "label": "Manfaat per km (per sejuta)", "title": "1.000.000 x manfaat / biaya proksi; urutan menurun", "angka": True, "desimal": 3},
               {"k": "naik_iku2", "label": "Mengangkat IKU 2", "title": "C naik melewati 0,40 dan IKD provinsi LAKIP 2025 Lampiran 2 di bawah 0,40"}],
        baris=baris, rumus="manfaat = (1/514) x [R(C) - R(C + d)]; R = (H x V x (1 - C))^(1/3); urut manfaat / maks(jarak, 100 km)",
        sumber=["risiko_hvc", "ikd", "iku", "kode"], label=["proksi", "hitungan_kita"], aturan=["ikd_ambang_kelas"],
        asumsi=[ASUMSI_BIAYA])


def bangun(hvc_doc, ikd_doc, kode):
    daftar, tinggi, kosong = hitung(hvc_doc["kab"], ikd_doc["kab"], kode)
    sumber = [{"nama": "Risiko HVC kab (risiko_hvc.json)", "url": "repo:public/data/bnpb/risiko_hvc.json", "diambil": hvc_doc["dibuat"][:10], "lisensi": "lisensi InaRISK tidak tertulis"},
              {"nama": "Raster kapasitas InaRISK (ikd.json)", "url": "repo:public/data/bnpb/ikd.json", "diambil": ikd_doc["dibuat"][:10], "lisensi": ikd_doc.get("lisensi", "tidak tertulis")[:200]},
              {"nama": "LAKIP BNPB 2025 Lampiran 2", "url": "repo:data/kajian-bnpb/pustaka/5-lakip.md", "diambil": "2026-10-31", "lisensi": "dokumen publik BNPB"}]
    b = rapor.berkas([_kartu(daftar, tinggi, kosong)], sumber)
    b["data"] = {"n_kab": N_KAB, "ambang_kelas": aturan.nilai("ikd_ambang_kelas"), "bobot_irb": "1/514",
                 "label_wajib": LABEL_WAJIB, "agregasi_h": "maks lintas jenis (asumsi)", "v_dari": "Phi(skor z v risiko_hvc.json)", "uji_balik": None,
                 "baris": daftar, "sudah_tinggi": tinggi, "kapasitas_belum_ada": kosong}
    return b


def jalan():
    return {"pendampingan_ikd": bangun(_muat(os.path.join(DATA, "risiko_hvc.json")), _muat(os.path.join(DATA, "ikd.json")),
                                       _muat(os.path.join(AKAR, "public", "data", "kemitraan", "kode.json")))}


def cek():
    # RU sec 2.4 dan ALGORITMA sec 10.1, H 0,8 V 0,6, cocok 1e-5
    acuan = {"E1": (0.35, 0.05, 0.67824, 0.66039, 0.00003474), "E2": (0.78, 0.02, 0.47267, 0.45789, 0.00002876),
             "E3": (0.10, 0.30, 0.75595, 0.66039, 0.00018593), "E4": (0.40, 0.40, 0.66039, 0.45789, 0.00039397)}
    for id_, (c, d, rk, rn, m) in acuan.items():
        s = satu(0.8, 0.6, c)
        for nama, a, b in (("d", s["d"], d), ("r_kini", s["r_kini"], rk), ("r_naik", s["r_naik"], rn), ("manfaat", s["manfaat"], m)):
            assert abs(a - b) <= 1e-5, f"{id_} {nama}: {a} harap {b}"
    assert satu(0.8, 0.6, 0.85) == {"d": None, "alasan": "sudah kelas tinggi"}  # E5
    assert satu(0.8, 0.6, 0.80)["d"] is None and kelas(0.80) == "tinggi" and kelas(0.40) == "sedang" and kelas(0.3999) == "rendah"
    # C lebih rendah memberi d lebih besar (H, V sama, kelas sama); manfaat tidak negatif; H atau V 0 -> manfaat 0
    for a, b in ((0.1, 0.3), (0.41, 0.7)):
        assert satu(0.5, 0.5, a)["d"] > satu(0.5, 0.5, b)["d"]
    for i in range(101):
        s = satu(0.7, 0.4, i / 100)
        assert s["d"] is None or (s["d"] > 0 and s["manfaat"] >= 0), (i, s)
    assert satu(0, 0.6, 0.2)["manfaat"] == 0 and satu(0.8, 0, 0.2)["manfaat"] == 0
    for salah in (-0.1, 1.2, None, "0,5", float("nan"), True):
        try:
            satu(0.5, 0.5, salah)
        except ValueError:
            continue
        raise AssertionError(f"C {salah!r} tidak ditolak")
    assert abs(haversine(JAKARTA, (-7.3233, 109.4071)) - 309) < 5  # Purbalingga kira-kira 309 km
    # tiruan: kab tinggi tidak masuk, C kosong tidak diurutkan, naik_iku2 hanya bila provinsi di bawah 0,40
    hvc = {"1101": {"H": {"banjir": 0.8, "longsor": 0.2}, "v": -0.4}, "3301": {"H": {"banjir": 0.8}, "v": 0.6},
           "3302": {"H": {"banjir": 0.8}, "v": 0.6}, "1102": {"H": {"banjir": 0.5}, "v": 0.5}}
    ikd = {"1101": {"c": 0.35}, "3301": {"c": 0.35}, "3302": {"c": 0.9}, "1102": {"c": None}}
    kd = {k: {"nama": f"Kab {k}", "prov": k[:2], "pusat": [-6.0 - int(k[2:]) / 10, 107.0]} for k in hvc}
    dt, ti, ko = hitung(hvc, ikd, kd)
    assert [b["kab"] for b in dt] == ["1101", "3301"] or [b["kab"] for b in dt] == ["3301", "1101"], dt
    assert ti == ["3302"] and ko == ["1102"]
    n2 = {b["kab"]: b["naik_iku2"] for b in dt}
    assert n2 == {"1101": True, "3301": False}, n2  # Aceh 0,38 di bawah 0,40; Jateng 0,74 tidak
    # data nyata
    b = jalan()["pendampingan_ikd"]
    rapor.periksa_berkas({"dibuat": "2026-11-26T00:00:00Z", "basi_jam": 1080, **b})
    d = b["data"]
    assert len(d["baris"]) + len(d["sudah_tinggi"]) + len(d["kapasitas_belum_ada"]) == N_KAB
    assert all(x["c"] < 0.8 and x["d"] > 0 and x["manfaat"] >= 0 and x["c_label"] == C_LABEL for x in d["baris"])
    assert all(x["biaya_km"] >= BIAYA_MIN_KM for x in d["baris"] if x["biaya_km"] is not None)
    assert ASUMSI_BIAYA in b["kartu"][0]["asumsi"]
    rs = [x["rasio"] for x in d["baris"] if x["rasio"] is not None]
    assert rs == sorted(rs, reverse=True)
    k = b["kartu"][0]
    assert LABEL_WAJIB in k["judul"] and "proksi" in k["label"] and k["aturan"][0]["asumsi"] is True
    assert "C proksi" in json.dumps(k["kolom"], ensure_ascii=False)
    teks = json.dumps(b, ensure_ascii=False)
    assert not re.search(r"\baman\b", teks, re.I) and "·" not in teks
    assert not re.search(r"(?<!bukan )IRB resmi", teks), "IRB resmi tanpa bukan"
    print(f"perb1.py --cek: lulus ({len(d['baris'])} kab berurut, {len(d['sudah_tinggi'])} sudah tinggi, {len(d['kapasitas_belum_ada'])} kapasitas belum ada)")


if __name__ == "__main__":
    if "--cek" in sys.argv:
        cek()
    else:
        print(__doc__)
