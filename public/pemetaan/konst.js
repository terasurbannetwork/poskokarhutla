// Konstanta Pemetaan bangunan oleh relawan. ISI IDENTIK dengan scripts/pemetaan/konst.py (dijaga tests/kemitraan/pemetaan_konst.test.mjs).
// Semua ambang = HIPOTESIS (Q6, Q7). Sunting konst.py dulu, lalu salin hasil `python3 -I scripts/pemetaan/konst.py --json` ke sini.
const PM_KONST = {
  "AMBANG_KEYAKINAN": 0.7,
  "N_PEMBANDING_MIN": 100,
  "KELAS": {
    "TIPIS_MAKS": 0.6,
    "MEMADAI_MIN": 0.85
  },
  "SEGAR_HARI": 180,
  "MINIMUM": {
    "KAMPUS": 1,
    "PEMETA": 10,
    "HARI": 30
  },
  "UJI": {
    "KAB": 10,
    "PERKOTAAN_MIN": 3,
    "PERDESAAN_MIN": 3,
    "COCOK_MIN": 7
  },
  "ASUMSI_KEBIJAKAN": [
    "KELAS",
    "SEGAR_HARI",
    "MINIMUM",
    "UJI",
    "N_PEMBANDING_MIN"
  ]
};
