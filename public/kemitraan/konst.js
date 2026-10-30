// Konstanta modul Kemitraan Kampus. ISI IDENTIK dengan scripts/kemitraan/konst.py (dijaga tests/kemitraan/konst.test.mjs).
// Semua bobot dan ambang = asumsi-kebijakan (ALGORITMA.md). Sunting konst.py dulu, lalu salin hasil `python3 -I scripts/kemitraan/konst.py --json` ke sini.
const KM_KONST = {
  "BAHAYA": [
    "banjir",
    "longsor",
    "gempa",
    "tsunami",
    "gunungapi",
    "kekeringan",
    "karhutla",
    "cuaca_ekstrem",
    "abrasi_rob",
    "udara",
    "multi"
  ],
  "BAHAYA_IRBI": {
    "banjir": "banjir",
    "gempabumi": "gempa",
    "tsunami": "tsunami",
    "longsor": "longsor",
    "gunungapi": "gunungapi",
    "kekeringan": "kekeringan",
    "karlahut": "karhutla",
    "cuaca_ekstrem": "cuaca_ekstrem",
    "abrasi": "abrasi_rob"
  },
  "RUMPUN_BAHAYA": {
    "banjir": [
      "banjir"
    ],
    "longsor": [
      "longsor"
    ],
    "gempa": [
      "gempa",
      "geologi"
    ],
    "tsunami": [
      "tsunami",
      "pesisir"
    ],
    "gunungapi": [
      "gunung api"
    ],
    "kekeringan": [
      "kekeringan",
      "iklim"
    ],
    "karhutla": [
      "karhutla"
    ],
    "cuaca_ekstrem": [
      "hidrometeorologi",
      "iklim"
    ],
    "abrasi_rob": [
      "pesisir"
    ],
    "udara": [
      "kesehatan bencana",
      "karhutla"
    ],
    "multi": [
      "manajemen bencana"
    ]
  },
  "KE_REGISTRI": {
    "banjir": "banjir",
    "longsor": "banjir",
    "abrasi_rob": "banjir",
    "gempa": "gempa",
    "tsunami": "gempa",
    "gunungapi": "gunungapi",
    "kekeringan": "kekeringan",
    "karhutla": "karhutla",
    "cuaca_ekstrem": "cuaca",
    "udara": "udara",
    "multi": "lintas"
  },
  "ASPEK": {
    "A1": "Pengetahuan bahaya",
    "A2": "Peringatan dini",
    "A3": "Mitigasi struktural",
    "A4": "Tata ruang dan lingkungan",
    "A5": "Kelembagaan dan dokumen",
    "A6": "Kesiapsiagaan masyarakat",
    "A7": "Kelompok rentan dan kesehatan",
    "A8": "Logistik dan sarana",
    "A9": "Pemulihan",
    "A10": "Pendanaan dan ekonomi"
  },
  "NARASUMBER": {
    "bpbd": "BPBD",
    "bappeda": "Bappeda",
    "pu": "Dinas PU / SDA",
    "dinkes": "Dinas Kesehatan",
    "dinsos": "Dinas Sosial",
    "kades": "Kepala desa / lurah",
    "warga": "Warga terdampak",
    "usaha": "Pelaku usaha"
  },
  "ARAH": [
    "konfirmasi",
    "akar",
    "kapasitas",
    "upaya",
    "kebutuhan",
    "harapan"
  ],
  "BOBOT": {
    "auto": {
      "H": 0.25,
      "F": 0.2,
      "T": 0.1,
      "D": 0.15,
      "P": 0.15,
      "K": 0.15
    },
    "bpbd": {
      "penilaian": 0.5,
      "auto": 0.5
    },
    "pakar": {
      "teks": 0.45,
      "R": 0.15,
      "L": 0.1,
      "Q": 0.12,
      "J": 0.1,
      "E": 0.08
    },
    "mutu": {
      "h": 0.6,
      "baru": 0.4
    },
    "aktif": {
      "masalah": 0.2,
      "proposal": 0.2,
      "satgas": 0.15,
      "jam": 0.15,
      "magang": 0.1,
      "desa": 0.1,
      "luaran": 0.1
    },
    "donor": {
      "bahaya": 0.35,
      "aspek": 0.25,
      "syarat": 0.15,
      "panggilan": 0.15,
      "status": 0.1
    },
    "panggil": {
      "jarak": 0.4,
      "keahlian": 0.3,
      "latih": 0.15,
      "jam": 0.15
    }
  },
  "KELAS": {
    "P1_S": 0.7,
    "P1_H": 0.8,
    "P1_K": 0.6,
    "P2_S": 0.5
  },
  "MASALAH": {
    "S_MIN": 0.4,
    "KOMP_MIN": 4,
    "KOMP_TOTAL": 6,
    "TREN_MIN_TAHUN": 5,
    "S_AUTO_NETRAL": 0.5,
    "UJ_PAKAR_MIN": 3,
    "UJ_PAKAR_SKOR": 0.5,
    "JACCARD": 0.5
  },
  "ATURAN": {
    "H_DOK": 0.6,
    "F": 0.6,
    "T": 0.6,
    "D": 0.7,
    "P": 0.7,
    "H_P": 0.5,
    "GAMBUT_PCT": 10,
    "H_GEMPA": 0.7
  },
  "BM25": {
    "k1": 1.2,
    "b": 0.75,
    "BOBOT_JUDUL": 2,
    "TOP_KARYA": 3
  },
  "PAKAR": {
    "TEKS_MIN": 0.2,
    "TOP_N": 10,
    "MAKS_PER_KAMPUS": 2,
    "KANDIDAT_MAKS": 400,
    "RUMPUN_TOPIK": 0.5,
    "LOKAL_KAB": 1.0,
    "LOKAL_PROV": 0.6,
    "JARAK_KM": 300,
    "KAMPUS_TANPA_TITIK": 0.3,
    "REKAM_CATAT": 1.0,
    "REKAM_LENCANA": 0.5,
    "KORPUS_KARYA": 25,
    "KORPUS_SITASI": 15,
    "KORPUS_BARU": 10,
    "KORPUS_TAHUN": 2018,
    "MUTU_TAHUN": 2021
  },
  "SOLUSI": {
    "BOBOT_PENANDA": 2,
    "PENALTI_LATAR": 0.5,
    "SKOR_MIN": 3,
    "MAKS_KALIMAT": 2,
    "KARYA": 3
  },
  "PANDUAN": {
    "MAKS_PER_NARASUMBER": 40,
    "MAKS_MENGAPA": 3,
    "SARAN_SKOR_MIN": 2
  },
  "AKTIF": {
    "masalah": 5,
    "proposal": 3,
    "magang": 20,
    "desa": 10,
    "luaran": 5,
    "jam": 2000,
    "HARI": 365
  },
  "DONOR": {
    "COCOK_MIN": 0.5,
    "TENGGAT_HARI": 21
  },
  "PANGGIL": {
    "KM_SKALA": 100,
    "JAM_MAKS": 200
  },
  "PERJANJIAN": {
    "SEGERA_HABIS_HARI": 60
  },
  "KM_MAKS_POSTING": 20000,
  "JAM_PER_SKS": 170,
  "ASUMSI_KEBIJAKAN": [
    "BOBOT",
    "KELAS",
    "MASALAH",
    "ATURAN",
    "BM25",
    "PAKAR",
    "SOLUSI",
    "PANDUAN",
    "AKTIF",
    "DONOR",
    "PANGGIL",
    "PERJANJIAN",
    "KM_MAKS_POSTING",
    "JAM_PER_SKS"
  ]
};
if (typeof module !== "undefined" && module.exports) module.exports = KM_KONST;
else if (typeof window !== "undefined") window.KM_KONST = KM_KONST;
