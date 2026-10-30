#!/usr/bin/env python3
"""Konstanta modul Kemitraan Kampus: SATU sumber bobot, ambang, taksonomi (ALGORITMA.md §2-§9).
Isi identik dengan public/kemitraan/konst.js (dijaga tests/kemitraan/konst.test.mjs).
Semua bobot dan ambang = ASUMSI-KEBIJAKAN (ALG baris 9), bukan hasil kalibrasi data.
Pakai: python3 -I scripts/kemitraan/konst.py --cek | --json"""
import json, os, sys

KONST = {
    # ---- taksonomi (ALG §2) ----
    "BAHAYA": ["banjir", "longsor", "gempa", "tsunami", "gunungapi", "kekeringan", "karhutla",
               "cuaca_ekstrem", "abrasi_rob", "udara", "multi"],
    "BAHAYA_IRBI": {"banjir": "banjir", "gempabumi": "gempa", "tsunami": "tsunami", "longsor": "longsor",
                    "gunungapi": "gunungapi", "kekeringan": "kekeringan", "karlahut": "karhutla",
                    "cuaca_ekstrem": "cuaca_ekstrem", "abrasi": "abrasi_rob"},
    "RUMPUN_BAHAYA": {"banjir": ["banjir"], "longsor": ["longsor"], "gempa": ["gempa", "geologi"],
                      "tsunami": ["tsunami", "pesisir"], "gunungapi": ["gunung api"],
                      "kekeringan": ["kekeringan", "iklim"], "karhutla": ["karhutla"],
                      "cuaca_ekstrem": ["hidrometeorologi", "iklim"], "abrasi_rob": ["pesisir"],
                      "udara": ["kesehatan bencana", "karhutla"], "multi": ["manajemen bencana"]},
    # id registri public/bencana.json (DT §10); multi -> lintas. Uji membandingkan dengan bencana.json.
    "KE_REGISTRI": {"banjir": "banjir", "longsor": "banjir", "abrasi_rob": "banjir", "gempa": "gempa",
                    "tsunami": "gempa", "gunungapi": "gunungapi", "kekeringan": "kekeringan",
                    "karhutla": "karhutla", "cuaca_ekstrem": "cuaca", "udara": "udara", "multi": "lintas"},
    "ASPEK": {"A1": "Pengetahuan bahaya", "A2": "Peringatan dini", "A3": "Mitigasi struktural",
              "A4": "Tata ruang dan lingkungan", "A5": "Kelembagaan dan dokumen",
              "A6": "Kesiapsiagaan masyarakat", "A7": "Kelompok rentan dan kesehatan",
              "A8": "Logistik dan sarana", "A9": "Pemulihan", "A10": "Pendanaan dan ekonomi"},
    "NARASUMBER": {"bpbd": "BPBD", "bappeda": "Bappeda", "pu": "Dinas PU / SDA", "dinkes": "Dinas Kesehatan",
                   "dinsos": "Dinas Sosial", "kades": "Kepala desa / lurah", "warga": "Warga terdampak",
                   "usaha": "Pelaku usaha"},
    "ARAH": ["konfirmasi", "akar", "kapasitas", "upaya", "kebutuhan", "harapan"],

    # ---- bobot: tiap kelompok berjumlah 1,00 ----
    "BOBOT": {
        "auto": {"H": 0.25, "F": 0.20, "T": 0.10, "D": 0.15, "P": 0.15, "K": 0.15},           # ALG §3.2
        "bpbd": {"penilaian": 0.5, "auto": 0.5},                                               # ALG §3.4 ((U+C+R+J)/12 dan S_auto)
        "pakar": {"teks": 0.45, "R": 0.15, "L": 0.10, "Q": 0.12, "J": 0.10, "E": 0.08},       # ALG §4.5
        "mutu": {"h": 0.6, "baru": 0.4},                                                       # ALG §4.4 Q
        "aktif": {"masalah": 0.20, "proposal": 0.20, "satgas": 0.15, "jam": 0.15,
                  "magang": 0.10, "desa": 0.10, "luaran": 0.10},                               # ALG §7
        "donor": {"bahaya": 0.35, "aspek": 0.25, "syarat": 0.15, "panggilan": 0.15, "status": 0.10},  # ALG §8
        "panggil": {"jarak": 0.40, "keahlian": 0.30, "latih": 0.15, "jam": 0.15},              # ALG §9
    },

    # ---- ambang ----
    "KELAS": {"P1_S": 0.70, "P1_H": 0.80, "P1_K": 0.60, "P2_S": 0.50},                         # ALG §3.2
    "MASALAH": {"S_MIN": 0.40, "KOMP_MIN": 4, "KOMP_TOTAL": 6, "TREN_MIN_TAHUN": 5,
                "S_AUTO_NETRAL": 0.5, "UJ_PAKAR_MIN": 3, "UJ_PAKAR_SKOR": 0.5, "JACCARD": 0.5},  # ALG §3.1, §3.4, §3.5
    "ATURAN": {"H_DOK": 0.6, "F": 0.6, "T": 0.6, "D": 0.7, "P": 0.7, "H_P": 0.5,
               "GAMBUT_PCT": 10, "H_GEMPA": 0.7},                                              # ALG §3.3
    "BM25": {"k1": 1.2, "b": 0.75, "BOBOT_JUDUL": 2, "TOP_KARYA": 3},                          # ALG §4.3
    "PAKAR": {"TEKS_MIN": 0.2, "TOP_N": 10, "MAKS_PER_KAMPUS": 2, "KANDIDAT_MAKS": 400,
              "RUMPUN_TOPIK": 0.5, "LOKAL_KAB": 1.0, "LOKAL_PROV": 0.6, "JARAK_KM": 300,
              "KAMPUS_TANPA_TITIK": 0.3, "REKAM_CATAT": 1.0, "REKAM_LENCANA": 0.5,
              "KORPUS_KARYA": 25, "KORPUS_SITASI": 15, "KORPUS_BARU": 10, "KORPUS_TAHUN": 2018,
              "MUTU_TAHUN": 2021},                                                              # ALG §4.1, §4.4, §4.5
    "SOLUSI": {"BOBOT_PENANDA": 2, "PENALTI_LATAR": 0.5, "SKOR_MIN": 3, "MAKS_KALIMAT": 2, "KARYA": 3},  # ALG §5
    "PANDUAN": {"MAKS_PER_NARASUMBER": 40, "MAKS_MENGAPA": 3, "SARAN_SKOR_MIN": 2},            # ALG §2.3, §6.2
    "AKTIF": {"masalah": 5, "proposal": 3, "magang": 20, "desa": 10, "luaran": 5, "jam": 2000,
              "HARI": 365},                                                                    # ALG §7 (batas atas)
    "DONOR": {"COCOK_MIN": 0.5, "TENGGAT_HARI": 21},                                           # ALG §8
    "PANGGIL": {"KM_SKALA": 100, "JAM_MAKS": 200},                                             # ALG §9
    "PERJANJIAN": {"SEGERA_HABIS_HARI": 60},                                                   # RU A13
    "KM_MAKS_POSTING": 20000,                                                                  # DT §5.2
    "JAM_PER_SKS": 170,                                                                        # ALUR: jam/170 per SKS, asumsi-kebijakan
    "ASUMSI_KEBIJAKAN": ["BOBOT", "KELAS", "MASALAH", "ATURAN", "BM25", "PAKAR", "SOLUSI", "PANDUAN",
                         "AKTIF", "DONOR", "PANGGIL", "PERJANJIAN", "KM_MAKS_POSTING", "JAM_PER_SKS"],
}

# nama pintas yang dipakai skrip pipeline
BAHAYA, ASPEK, ARAH, BOBOT = KONST["BAHAYA"], KONST["ASPEK"], KONST["ARAH"], KONST["BOBOT"]
KM_MAKS_POSTING, JAM_PER_SKS = KONST["KM_MAKS_POSTING"], KONST["JAM_PER_SKS"]


def cek():
    assert len(KONST["BAHAYA"]) == 11, len(KONST["BAHAYA"])
    assert list(KONST["ASPEK"]) == [f"A{i}" for i in range(1, 11)], list(KONST["ASPEK"])
    assert len(KONST["NARASUMBER"]) == 8 and len(KONST["ARAH"]) == 6
    for k, g in KONST["BOBOT"].items():
        s = sum(g.values())
        assert abs(s - 1.0) < 1e-9, f"bobot '{k}' berjumlah {s}, harus 1,00"
    assert set(KONST["RUMPUN_BAHAYA"]) == set(KONST["KE_REGISTRI"]) == set(KONST["BAHAYA"])
    assert set(KONST["BAHAYA_IRBI"].values()) <= set(KONST["BAHAYA"])
    assert KONST["KM_MAKS_POSTING"] == 20000
    # kamus: batas minimum ALG §2.2
    d = os.path.dirname(os.path.abspath(__file__))
    km = json.load(open(os.path.join(d, "kamus.json"), encoding="utf-8"))
    assert set(km["bahaya"]) == set(KONST["BAHAYA"]), set(km["bahaya"]) ^ set(KONST["BAHAYA"])
    assert set(km["aspek"]) == set(KONST["ASPEK"])
    for b, t in km["bahaya"].items():
        assert len(set(t)) >= 8, f"kamus bahaya {b}: {len(set(t))} istilah < 8"
    for a, t in km["aspek"].items():
        assert len(set(t)) >= 6, f"kamus aspek {a}: {len(set(t))} istilah < 6"
    assert len(set(km["henti"])) >= 150, f"henti {len(set(km['henti']))} < 150"
    assert km["stem"] and len(km["solusi"]) >= 18
    import re
    js = open(os.path.join(d, "..", "..", "public", "kemitraan", "konst.js"), encoding="utf-8").read()
    m = re.search(r"const KM_KONST = (\{.*?\n\});\n", js, re.S)
    assert m and json.loads(m.group(1)) == KONST, "konst.js tidak identik dengan konst.py"
    print(f"OK konst.py: {len(KONST)} kelompok, {len(KONST['BOBOT'])} rumus bobot (jumlah 1,00), kamus sesuai batas")


if __name__ == "__main__":
    if "--json" in sys.argv:
        print(json.dumps(KONST, ensure_ascii=False, indent=2))
    elif "--cek" in sys.argv:
        cek()
    else:
        sys.exit(__doc__)
