export default {
 "dibuat": "2026-11-04",
 "periode": {
  "dari": "2026-01-01",
  "sampai": "2026-11-02"
 },
 "sumber": [
  "NASA FIRMS VIIRS S-NPP 375 m, keyakinan nominal/tinggi, hari kalender WIB (via konsesi_laporan.titik)",
  "Poligon konsesi sawit (Kemenhut via GFW v20191031) dan HTI (Trase v3 2026), public/data/lahan/konsesi.geojson",
  "Grup perusahaan: GFW group_comp 2019, Trase, kurasi tangan (data/raw/konsesi/grup_perusahaan.json)",
  "Pemetaan grup ke emiten: kurasi tangan, dasar per baris"
 ],
 "catatan": "Titik panas di areal konsesi bukan bukti pelanggaran atau penyebab kebakaran. Hanya jenis sawit dan HTI; minggu mulai Senin WIB (minggu pertama dan terakhir bisa parsial).",
 "emiten": [
  {
   "kode": "SMAR",
   "nama": "PT Sinar Mas Agro Resources and Technology Tbk",
   "bursa": "IDX",
   "grup": "Sinar Mas",
   "hubungan": "langsung",
   "dasar": "Deret = SELURUH grup Sinar Mas di data (sawit + HTI), dibagi dengan SMAR, INKP, TKIM, E5H. SMAR = arm sawit/CPO grup di IDX (anak Golden Agri-Resources). Sumber: laporan tahunan SMAR; group_comp GFW 2019 dan Trase v3 menamai grup Sinar Mas.",
   "konsesi": {
    "jumlah": 80,
    "luas_ha": 3690217
   },
   "titik": {
    "total": 18650,
    "d7": 231,
    "d30": 8484
   },
   "mingguan": [
    {
     "minggu": "2025-12-29",
     "titik": 1
    },
    {
     "minggu": "2026-01-05",
     "titik": 3
    },
    {
     "minggu": "2026-01-12",
     "titik": 20
    },
    {
     "minggu": "2026-01-19",
     "titik": 15
    },
    {
     "minggu": "2026-01-26",
     "titik": 15
    },
    {
     "minggu": "2026-02-02",
     "titik": 17
    },
    {
     "minggu": "2026-02-09",
     "titik": 4
    },
    {
     "minggu": "2026-02-16",
     "titik": 1
    },
    {
     "minggu": "2026-02-23",
     "titik": 19
    },
    {
     "minggu": "2026-03-02",
     "titik": 5
    },
    {
     "minggu": "2026-03-09",
     "titik": 10
    },
    {
     "minggu": "2026-03-16",
     "titik": 18
    },
    {
     "minggu": "2026-03-23",
     "titik": 39
    },
    {
     "minggu": "2026-03-30",
     "titik": 9
    },
    {
     "minggu": "2026-04-06",
     "titik": 10
    },
    {
     "minggu": "2026-04-13",
     "titik": 6
    },
    {
     "minggu": "2026-04-20",
     "titik": 14
    },
    {
     "minggu": "2026-04-27",
     "titik": 2
    },
    {
     "minggu": "2026-05-04",
     "titik": 0
    },
    {
     "minggu": "2026-05-11",
     "titik": 0
    },
    {
     "minggu": "2026-05-18",
     "titik": 0
    },
    {
     "minggu": "2026-05-25",
     "titik": 0
    },
    {
     "minggu": "2026-06-01",
     "titik": 18
    },
    {
     "minggu": "2026-06-08",
     "titik": 1
    },
    {
     "minggu": "2026-06-15",
     "titik": 11
    },
    {
     "minggu": "2026-06-22",
     "titik": 13
    },
    {
     "minggu": "2026-06-29",
     "titik": 24
    },
    {
     "minggu": "2026-07-06",
     "titik": 17
    },
    {
     "minggu": "2026-07-13",
     "titik": 50
    },
    {
     "minggu": "2026-07-20",
     "titik": 105
    },
    {
     "minggu": "2026-07-27",
     "titik": 126
    },
    {
     "minggu": "2026-08-03",
     "titik": 311
    },
    {
     "minggu": "2026-08-10",
     "titik": 311
    },
    {
     "minggu": "2026-08-17",
     "titik": 935
    },
    {
     "minggu": "2026-08-24",
     "titik": 1809
    },
    {
     "minggu": "2026-08-31",
     "titik": 1035
    },
    {
     "minggu": "2026-09-07",
     "titik": 836
    },
    {
     "minggu": "2026-09-14",
     "titik": 1452
    },
    {
     "minggu": "2026-09-21",
     "titik": 1349
    },
    {
     "minggu": "2026-09-28",
     "titik": 1881
    },
    {
     "minggu": "2026-10-05",
     "titik": 3287
    },
    {
     "minggu": "2026-10-12",
     "titik": 2743
    },
    {
     "minggu": "2026-10-19",
     "titik": 1893
    },
    {
     "minggu": "2026-10-26",
     "titik": 224
    },
    {
     "minggu": "2026-11-02",
     "titik": 11
    }
   ]
  },
  {
   "kode": "E5H",
   "nama": "Golden Agri-Resources Ltd",
   "bursa": "SGX",
   "grup": "Sinar Mas",
   "hubungan": "induk",
   "dasar": "Deret = SELURUH grup Sinar Mas di data (sawit + HTI), dibagi dengan SMAR, INKP, TKIM, E5H. GAR = induk SMAR dan pemegang perkebunan sawit grup, tercatat SGX (bukan IDX). Sumber: laporan tahunan GAR.",
   "konsesi": {
    "jumlah": 80,
    "luas_ha": 3690217
   },
   "titik": {
    "total": 18650,
    "d7": 231,
    "d30": 8484
   },
   "mingguan": [
    {
     "minggu": "2025-12-29",
     "titik": 1
    },
    {
     "minggu": "2026-01-05",
     "titik": 3
    },
    {
     "minggu": "2026-01-12",
     "titik": 20
    },
    {
     "minggu": "2026-01-19",
     "titik": 15
    },
    {
     "minggu": "2026-01-26",
     "titik": 15
    },
    {
     "minggu": "2026-02-02",
     "titik": 17
    },
    {
     "minggu": "2026-02-09",
     "titik": 4
    },
    {
     "minggu": "2026-02-16",
     "titik": 1
    },
    {
     "minggu": "2026-02-23",
     "titik": 19
    },
    {
     "minggu": "2026-03-02",
     "titik": 5
    },
    {
     "minggu": "2026-03-09",
     "titik": 10
    },
    {
     "minggu": "2026-03-16",
     "titik": 18
    },
    {
     "minggu": "2026-03-23",
     "titik": 39
    },
    {
     "minggu": "2026-03-30",
     "titik": 9
    },
    {
     "minggu": "2026-04-06",
     "titik": 10
    },
    {
     "minggu": "2026-04-13",
     "titik": 6
    },
    {
     "minggu": "2026-04-20",
     "titik": 14
    },
    {
     "minggu": "2026-04-27",
     "titik": 2
    },
    {
     "minggu": "2026-05-04",
     "titik": 0
    },
    {
     "minggu": "2026-05-11",
     "titik": 0
    },
    {
     "minggu": "2026-05-18",
     "titik": 0
    },
    {
     "minggu": "2026-05-25",
     "titik": 0
    },
    {
     "minggu": "2026-06-01",
     "titik": 18
    },
    {
     "minggu": "2026-06-08",
     "titik": 1
    },
    {
     "minggu": "2026-06-15",
     "titik": 11
    },
    {
     "minggu": "2026-06-22",
     "titik": 13
    },
    {
     "minggu": "2026-06-29",
     "titik": 24
    },
    {
     "minggu": "2026-07-06",
     "titik": 17
    },
    {
     "minggu": "2026-07-13",
     "titik": 50
    },
    {
     "minggu": "2026-07-20",
     "titik": 105
    },
    {
     "minggu": "2026-07-27",
     "titik": 126
    },
    {
     "minggu": "2026-08-03",
     "titik": 311
    },
    {
     "minggu": "2026-08-10",
     "titik": 311
    },
    {
     "minggu": "2026-08-17",
     "titik": 935
    },
    {
     "minggu": "2026-08-24",
     "titik": 1809
    },
    {
     "minggu": "2026-08-31",
     "titik": 1035
    },
    {
     "minggu": "2026-09-07",
     "titik": 836
    },
    {
     "minggu": "2026-09-14",
     "titik": 1452
    },
    {
     "minggu": "2026-09-21",
     "titik": 1349
    },
    {
     "minggu": "2026-09-28",
     "titik": 1881
    },
    {
     "minggu": "2026-10-05",
     "titik": 3287
    },
    {
     "minggu": "2026-10-12",
     "titik": 2743
    },
    {
     "minggu": "2026-10-19",
     "titik": 1893
    },
    {
     "minggu": "2026-10-26",
     "titik": 224
    },
    {
     "minggu": "2026-11-02",
     "titik": 11
    }
   ]
  },
  {
   "kode": "INKP",
   "nama": "PT Indah Kiat Pulp & Paper Tbk",
   "bursa": "IDX",
   "grup": "Sinar Mas",
   "hubungan": "rantai_pasok",
   "dasar": "Deret = SELURUH grup Sinar Mas di data (sawit + HTI), dibagi dengan SMAR, INKP, TKIM, E5H. INKP = pabrik pulp APP yang dipasok HTI grup (pemasok bermitra, bukan semuanya milik INKP langsung). Sumber: laporan tahunan INKP; Trase v3 HTI bergrup Sinar Mas.",
   "konsesi": {
    "jumlah": 80,
    "luas_ha": 3690217
   },
   "titik": {
    "total": 18650,
    "d7": 231,
    "d30": 8484
   },
   "mingguan": [
    {
     "minggu": "2025-12-29",
     "titik": 1
    },
    {
     "minggu": "2026-01-05",
     "titik": 3
    },
    {
     "minggu": "2026-01-12",
     "titik": 20
    },
    {
     "minggu": "2026-01-19",
     "titik": 15
    },
    {
     "minggu": "2026-01-26",
     "titik": 15
    },
    {
     "minggu": "2026-02-02",
     "titik": 17
    },
    {
     "minggu": "2026-02-09",
     "titik": 4
    },
    {
     "minggu": "2026-02-16",
     "titik": 1
    },
    {
     "minggu": "2026-02-23",
     "titik": 19
    },
    {
     "minggu": "2026-03-02",
     "titik": 5
    },
    {
     "minggu": "2026-03-09",
     "titik": 10
    },
    {
     "minggu": "2026-03-16",
     "titik": 18
    },
    {
     "minggu": "2026-03-23",
     "titik": 39
    },
    {
     "minggu": "2026-03-30",
     "titik": 9
    },
    {
     "minggu": "2026-04-06",
     "titik": 10
    },
    {
     "minggu": "2026-04-13",
     "titik": 6
    },
    {
     "minggu": "2026-04-20",
     "titik": 14
    },
    {
     "minggu": "2026-04-27",
     "titik": 2
    },
    {
     "minggu": "2026-05-04",
     "titik": 0
    },
    {
     "minggu": "2026-05-11",
     "titik": 0
    },
    {
     "minggu": "2026-05-18",
     "titik": 0
    },
    {
     "minggu": "2026-05-25",
     "titik": 0
    },
    {
     "minggu": "2026-06-01",
     "titik": 18
    },
    {
     "minggu": "2026-06-08",
     "titik": 1
    },
    {
     "minggu": "2026-06-15",
     "titik": 11
    },
    {
     "minggu": "2026-06-22",
     "titik": 13
    },
    {
     "minggu": "2026-06-29",
     "titik": 24
    },
    {
     "minggu": "2026-07-06",
     "titik": 17
    },
    {
     "minggu": "2026-07-13",
     "titik": 50
    },
    {
     "minggu": "2026-07-20",
     "titik": 105
    },
    {
     "minggu": "2026-07-27",
     "titik": 126
    },
    {
     "minggu": "2026-08-03",
     "titik": 311
    },
    {
     "minggu": "2026-08-10",
     "titik": 311
    },
    {
     "minggu": "2026-08-17",
     "titik": 935
    },
    {
     "minggu": "2026-08-24",
     "titik": 1809
    },
    {
     "minggu": "2026-08-31",
     "titik": 1035
    },
    {
     "minggu": "2026-09-07",
     "titik": 836
    },
    {
     "minggu": "2026-09-14",
     "titik": 1452
    },
    {
     "minggu": "2026-09-21",
     "titik": 1349
    },
    {
     "minggu": "2026-09-28",
     "titik": 1881
    },
    {
     "minggu": "2026-10-05",
     "titik": 3287
    },
    {
     "minggu": "2026-10-12",
     "titik": 2743
    },
    {
     "minggu": "2026-10-19",
     "titik": 1893
    },
    {
     "minggu": "2026-10-26",
     "titik": 224
    },
    {
     "minggu": "2026-11-02",
     "titik": 11
    }
   ]
  },
  {
   "kode": "TKIM",
   "nama": "PT Pabrik Kertas Tjiwi Kimia Tbk",
   "bursa": "IDX",
   "grup": "Sinar Mas",
   "hubungan": "rantai_pasok",
   "dasar": "Deret = SELURUH grup Sinar Mas di data (sawit + HTI), dibagi dengan SMAR, INKP, TKIM, E5H. TKIM = pabrik kertas APP, bahan baku pulp APP/INKP; bukan pemegang HTI langsung. Disertakan sebagai rantai pulp APP, bukan pemegang konsesi. Sumber: laporan tahunan TKIM.",
   "konsesi": {
    "jumlah": 80,
    "luas_ha": 3690217
   },
   "titik": {
    "total": 18650,
    "d7": 231,
    "d30": 8484
   },
   "mingguan": [
    {
     "minggu": "2025-12-29",
     "titik": 1
    },
    {
     "minggu": "2026-01-05",
     "titik": 3
    },
    {
     "minggu": "2026-01-12",
     "titik": 20
    },
    {
     "minggu": "2026-01-19",
     "titik": 15
    },
    {
     "minggu": "2026-01-26",
     "titik": 15
    },
    {
     "minggu": "2026-02-02",
     "titik": 17
    },
    {
     "minggu": "2026-02-09",
     "titik": 4
    },
    {
     "minggu": "2026-02-16",
     "titik": 1
    },
    {
     "minggu": "2026-02-23",
     "titik": 19
    },
    {
     "minggu": "2026-03-02",
     "titik": 5
    },
    {
     "minggu": "2026-03-09",
     "titik": 10
    },
    {
     "minggu": "2026-03-16",
     "titik": 18
    },
    {
     "minggu": "2026-03-23",
     "titik": 39
    },
    {
     "minggu": "2026-03-30",
     "titik": 9
    },
    {
     "minggu": "2026-04-06",
     "titik": 10
    },
    {
     "minggu": "2026-04-13",
     "titik": 6
    },
    {
     "minggu": "2026-04-20",
     "titik": 14
    },
    {
     "minggu": "2026-04-27",
     "titik": 2
    },
    {
     "minggu": "2026-05-04",
     "titik": 0
    },
    {
     "minggu": "2026-05-11",
     "titik": 0
    },
    {
     "minggu": "2026-05-18",
     "titik": 0
    },
    {
     "minggu": "2026-05-25",
     "titik": 0
    },
    {
     "minggu": "2026-06-01",
     "titik": 18
    },
    {
     "minggu": "2026-06-08",
     "titik": 1
    },
    {
     "minggu": "2026-06-15",
     "titik": 11
    },
    {
     "minggu": "2026-06-22",
     "titik": 13
    },
    {
     "minggu": "2026-06-29",
     "titik": 24
    },
    {
     "minggu": "2026-07-06",
     "titik": 17
    },
    {
     "minggu": "2026-07-13",
     "titik": 50
    },
    {
     "minggu": "2026-07-20",
     "titik": 105
    },
    {
     "minggu": "2026-07-27",
     "titik": 126
    },
    {
     "minggu": "2026-08-03",
     "titik": 311
    },
    {
     "minggu": "2026-08-10",
     "titik": 311
    },
    {
     "minggu": "2026-08-17",
     "titik": 935
    },
    {
     "minggu": "2026-08-24",
     "titik": 1809
    },
    {
     "minggu": "2026-08-31",
     "titik": 1035
    },
    {
     "minggu": "2026-09-07",
     "titik": 836
    },
    {
     "minggu": "2026-09-14",
     "titik": 1452
    },
    {
     "minggu": "2026-09-21",
     "titik": 1349
    },
    {
     "minggu": "2026-09-28",
     "titik": 1881
    },
    {
     "minggu": "2026-10-05",
     "titik": 3287
    },
    {
     "minggu": "2026-10-12",
     "titik": 2743
    },
    {
     "minggu": "2026-10-19",
     "titik": 1893
    },
    {
     "minggu": "2026-10-26",
     "titik": 224
    },
    {
     "minggu": "2026-11-02",
     "titik": 11
    }
   ]
  },
  {
   "kode": "AALI",
   "nama": "PT Astra Agro Lestari Tbk",
   "bursa": "IDX",
   "grup": "Astra International",
   "hubungan": "langsung",
   "dasar": "Arm perkebunan sawit grup Astra; poligon grup ini bernama anak AALI (mis. Borneo Indah Marjaya, Nirmala Agro Lestari, Persada Bina Nusantara Abadi: catatan 'Astra Agro Lestari' di data GFW). Sumber: laporan tahunan AALI.",
   "konsesi": {
    "jumlah": 17,
    "luas_ha": 191738
   },
   "titik": {
    "total": 267,
    "d7": 5,
    "d30": 57
   },
   "mingguan": [
    {
     "minggu": "2025-12-29",
     "titik": 0
    },
    {
     "minggu": "2026-01-05",
     "titik": 0
    },
    {
     "minggu": "2026-01-12",
     "titik": 1
    },
    {
     "minggu": "2026-01-19",
     "titik": 0
    },
    {
     "minggu": "2026-01-26",
     "titik": 0
    },
    {
     "minggu": "2026-02-02",
     "titik": 0
    },
    {
     "minggu": "2026-02-09",
     "titik": 0
    },
    {
     "minggu": "2026-02-16",
     "titik": 0
    },
    {
     "minggu": "2026-02-23",
     "titik": 0
    },
    {
     "minggu": "2026-03-02",
     "titik": 1
    },
    {
     "minggu": "2026-03-09",
     "titik": 0
    },
    {
     "minggu": "2026-03-16",
     "titik": 0
    },
    {
     "minggu": "2026-03-23",
     "titik": 0
    },
    {
     "minggu": "2026-03-30",
     "titik": 0
    },
    {
     "minggu": "2026-04-06",
     "titik": 1
    },
    {
     "minggu": "2026-04-13",
     "titik": 0
    },
    {
     "minggu": "2026-04-20",
     "titik": 0
    },
    {
     "minggu": "2026-04-27",
     "titik": 0
    },
    {
     "minggu": "2026-05-04",
     "titik": 0
    },
    {
     "minggu": "2026-05-11",
     "titik": 0
    },
    {
     "minggu": "2026-05-18",
     "titik": 0
    },
    {
     "minggu": "2026-05-25",
     "titik": 0
    },
    {
     "minggu": "2026-06-01",
     "titik": 1
    },
    {
     "minggu": "2026-06-08",
     "titik": 1
    },
    {
     "minggu": "2026-06-15",
     "titik": 0
    },
    {
     "minggu": "2026-06-22",
     "titik": 0
    },
    {
     "minggu": "2026-06-29",
     "titik": 2
    },
    {
     "minggu": "2026-07-06",
     "titik": 1
    },
    {
     "minggu": "2026-07-13",
     "titik": 6
    },
    {
     "minggu": "2026-07-20",
     "titik": 4
    },
    {
     "minggu": "2026-07-27",
     "titik": 3
    },
    {
     "minggu": "2026-08-03",
     "titik": 4
    },
    {
     "minggu": "2026-08-10",
     "titik": 17
    },
    {
     "minggu": "2026-08-17",
     "titik": 19
    },
    {
     "minggu": "2026-08-24",
     "titik": 11
    },
    {
     "minggu": "2026-08-31",
     "titik": 25
    },
    {
     "minggu": "2026-09-07",
     "titik": 10
    },
    {
     "minggu": "2026-09-14",
     "titik": 53
    },
    {
     "minggu": "2026-09-21",
     "titik": 19
    },
    {
     "minggu": "2026-09-28",
     "titik": 39
    },
    {
     "minggu": "2026-10-05",
     "titik": 27
    },
    {
     "minggu": "2026-10-12",
     "titik": 7
    },
    {
     "minggu": "2026-10-19",
     "titik": 10
    },
    {
     "minggu": "2026-10-26",
     "titik": 1
    },
    {
     "minggu": "2026-11-02",
     "titik": 4
    }
   ]
  },
  {
   "kode": "SGRO",
   "nama": "PT Prime Agri Resources Tbk (dahulu PT Sampoerna Agro Tbk)",
   "bursa": "IDX",
   "grup": "Sampoerna Agro",
   "hubungan": "langsung",
   "dasar": "Pemegang langsung PT Sampoerna Agro (sawit, Kalbar). HTI PT Hutan Ketapang Industri (Greenpeace 2026) dipisah dari deret karena bukan milik SGRO. Sumber: laporan tahunan SGRO; konsesi sawit GFW.",
   "konsesi": {
    "jumlah": 1,
    "luas_ha": 18954
   },
   "titik": {
    "total": 4,
    "d7": 0,
    "d30": 0
   },
   "mingguan": [
    {
     "minggu": "2025-12-29",
     "titik": 0
    },
    {
     "minggu": "2026-01-05",
     "titik": 0
    },
    {
     "minggu": "2026-01-12",
     "titik": 0
    },
    {
     "minggu": "2026-01-19",
     "titik": 0
    },
    {
     "minggu": "2026-01-26",
     "titik": 0
    },
    {
     "minggu": "2026-02-02",
     "titik": 0
    },
    {
     "minggu": "2026-02-09",
     "titik": 0
    },
    {
     "minggu": "2026-02-16",
     "titik": 1
    },
    {
     "minggu": "2026-02-23",
     "titik": 0
    },
    {
     "minggu": "2026-03-02",
     "titik": 0
    },
    {
     "minggu": "2026-03-09",
     "titik": 0
    },
    {
     "minggu": "2026-03-16",
     "titik": 0
    },
    {
     "minggu": "2026-03-23",
     "titik": 2
    },
    {
     "minggu": "2026-03-30",
     "titik": 0
    },
    {
     "minggu": "2026-04-06",
     "titik": 0
    },
    {
     "minggu": "2026-04-13",
     "titik": 1
    },
    {
     "minggu": "2026-04-20",
     "titik": 0
    },
    {
     "minggu": "2026-04-27",
     "titik": 0
    },
    {
     "minggu": "2026-05-04",
     "titik": 0
    },
    {
     "minggu": "2026-05-11",
     "titik": 0
    },
    {
     "minggu": "2026-05-18",
     "titik": 0
    },
    {
     "minggu": "2026-05-25",
     "titik": 0
    },
    {
     "minggu": "2026-06-01",
     "titik": 0
    },
    {
     "minggu": "2026-06-08",
     "titik": 0
    },
    {
     "minggu": "2026-06-15",
     "titik": 0
    },
    {
     "minggu": "2026-06-22",
     "titik": 0
    },
    {
     "minggu": "2026-06-29",
     "titik": 0
    },
    {
     "minggu": "2026-07-06",
     "titik": 0
    },
    {
     "minggu": "2026-07-13",
     "titik": 0
    },
    {
     "minggu": "2026-07-20",
     "titik": 0
    },
    {
     "minggu": "2026-07-27",
     "titik": 0
    },
    {
     "minggu": "2026-08-03",
     "titik": 0
    },
    {
     "minggu": "2026-08-10",
     "titik": 0
    },
    {
     "minggu": "2026-08-17",
     "titik": 0
    },
    {
     "minggu": "2026-08-24",
     "titik": 0
    },
    {
     "minggu": "2026-08-31",
     "titik": 0
    },
    {
     "minggu": "2026-09-07",
     "titik": 0
    },
    {
     "minggu": "2026-09-14",
     "titik": 0
    },
    {
     "minggu": "2026-09-21",
     "titik": 0
    },
    {
     "minggu": "2026-09-28",
     "titik": 0
    },
    {
     "minggu": "2026-10-05",
     "titik": 0
    },
    {
     "minggu": "2026-10-12",
     "titik": 0
    },
    {
     "minggu": "2026-10-19",
     "titik": 0
    },
    {
     "minggu": "2026-10-26",
     "titik": 0
    },
    {
     "minggu": "2026-11-02",
     "titik": 0
    }
   ]
  },
  {
   "kode": "ANJT",
   "nama": "PT Austindo Nusantara Jaya Tbk",
   "bursa": "IDX",
   "grup": "PT Austindo Nusantara Jaya (ANJA)",
   "hubungan": "langsung",
   "dasar": "Pemegang perkebunan sawit PT Kayung Agro Lestari (Kalbar), anak ANJ Agri; grup di kurasi: 'PT Austindo Nusantara Jaya (ANJA)'. Sumber: laporan tahunan ANJT; group_comp GFW.",
   "konsesi": {
    "jumlah": 1,
    "luas_ha": 28312
   },
   "titik": {
    "total": 2379,
    "d7": 0,
    "d30": 35
   },
   "mingguan": [
    {
     "minggu": "2025-12-29",
     "titik": 0
    },
    {
     "minggu": "2026-01-05",
     "titik": 0
    },
    {
     "minggu": "2026-01-12",
     "titik": 0
    },
    {
     "minggu": "2026-01-19",
     "titik": 3
    },
    {
     "minggu": "2026-01-26",
     "titik": 1
    },
    {
     "minggu": "2026-02-02",
     "titik": 1
    },
    {
     "minggu": "2026-02-09",
     "titik": 1
    },
    {
     "minggu": "2026-02-16",
     "titik": 0
    },
    {
     "minggu": "2026-02-23",
     "titik": 0
    },
    {
     "minggu": "2026-03-02",
     "titik": 28
    },
    {
     "minggu": "2026-03-09",
     "titik": 2
    },
    {
     "minggu": "2026-03-16",
     "titik": 2
    },
    {
     "minggu": "2026-03-23",
     "titik": 14
    },
    {
     "minggu": "2026-03-30",
     "titik": 0
    },
    {
     "minggu": "2026-04-06",
     "titik": 0
    },
    {
     "minggu": "2026-04-13",
     "titik": 0
    },
    {
     "minggu": "2026-04-20",
     "titik": 0
    },
    {
     "minggu": "2026-04-27",
     "titik": 0
    },
    {
     "minggu": "2026-05-04",
     "titik": 0
    },
    {
     "minggu": "2026-05-11",
     "titik": 0
    },
    {
     "minggu": "2026-05-18",
     "titik": 0
    },
    {
     "minggu": "2026-05-25",
     "titik": 0
    },
    {
     "minggu": "2026-06-01",
     "titik": 0
    },
    {
     "minggu": "2026-06-08",
     "titik": 0
    },
    {
     "minggu": "2026-06-15",
     "titik": 0
    },
    {
     "minggu": "2026-06-22",
     "titik": 0
    },
    {
     "minggu": "2026-06-29",
     "titik": 0
    },
    {
     "minggu": "2026-07-06",
     "titik": 8
    },
    {
     "minggu": "2026-07-13",
     "titik": 16
    },
    {
     "minggu": "2026-07-20",
     "titik": 30
    },
    {
     "minggu": "2026-07-27",
     "titik": 28
    },
    {
     "minggu": "2026-08-03",
     "titik": 83
    },
    {
     "minggu": "2026-08-10",
     "titik": 139
    },
    {
     "minggu": "2026-08-17",
     "titik": 188
    },
    {
     "minggu": "2026-08-24",
     "titik": 689
    },
    {
     "minggu": "2026-08-31",
     "titik": 496
    },
    {
     "minggu": "2026-09-07",
     "titik": 226
    },
    {
     "minggu": "2026-09-14",
     "titik": 240
    },
    {
     "minggu": "2026-09-21",
     "titik": 108
    },
    {
     "minggu": "2026-09-28",
     "titik": 48
    },
    {
     "minggu": "2026-10-05",
     "titik": 28
    },
    {
     "minggu": "2026-10-12",
     "titik": 0
    },
    {
     "minggu": "2026-10-19",
     "titik": 0
    },
    {
     "minggu": "2026-10-26",
     "titik": 0
    },
    {
     "minggu": "2026-11-02",
     "titik": 0
    }
   ]
  },
  {
   "kode": "LSIP",
   "nama": "PT PP London Sumatra Indonesia Tbk",
   "bursa": "IDX",
   "grup": "London Sumatra",
   "hubungan": "langsung",
   "dasar": "Pemegang langsung perkebunan (Lonsum, anak IndoAgri/Salim). Sumber: laporan tahunan LSIP; group_comp GFW ('PT PP London Sumatra Indonesia Tbk (Salim Group)').",
   "konsesi": {
    "jumlah": 1,
    "luas_ha": 27643
   },
   "titik": {
    "total": 330,
    "d7": 20,
    "d30": 48
   },
   "mingguan": [
    {
     "minggu": "2025-12-29",
     "titik": 0
    },
    {
     "minggu": "2026-01-05",
     "titik": 0
    },
    {
     "minggu": "2026-01-12",
     "titik": 0
    },
    {
     "minggu": "2026-01-19",
     "titik": 2
    },
    {
     "minggu": "2026-01-26",
     "titik": 0
    },
    {
     "minggu": "2026-02-02",
     "titik": 0
    },
    {
     "minggu": "2026-02-09",
     "titik": 0
    },
    {
     "minggu": "2026-02-16",
     "titik": 0
    },
    {
     "minggu": "2026-02-23",
     "titik": 0
    },
    {
     "minggu": "2026-03-02",
     "titik": 0
    },
    {
     "minggu": "2026-03-09",
     "titik": 0
    },
    {
     "minggu": "2026-03-16",
     "titik": 0
    },
    {
     "minggu": "2026-03-23",
     "titik": 0
    },
    {
     "minggu": "2026-03-30",
     "titik": 0
    },
    {
     "minggu": "2026-04-06",
     "titik": 0
    },
    {
     "minggu": "2026-04-13",
     "titik": 0
    },
    {
     "minggu": "2026-04-20",
     "titik": 0
    },
    {
     "minggu": "2026-04-27",
     "titik": 0
    },
    {
     "minggu": "2026-05-04",
     "titik": 0
    },
    {
     "minggu": "2026-05-11",
     "titik": 0
    },
    {
     "minggu": "2026-05-18",
     "titik": 0
    },
    {
     "minggu": "2026-05-25",
     "titik": 0
    },
    {
     "minggu": "2026-06-01",
     "titik": 0
    },
    {
     "minggu": "2026-06-08",
     "titik": 0
    },
    {
     "minggu": "2026-06-15",
     "titik": 0
    },
    {
     "minggu": "2026-06-22",
     "titik": 0
    },
    {
     "minggu": "2026-06-29",
     "titik": 0
    },
    {
     "minggu": "2026-07-06",
     "titik": 2
    },
    {
     "minggu": "2026-07-13",
     "titik": 0
    },
    {
     "minggu": "2026-07-20",
     "titik": 0
    },
    {
     "minggu": "2026-07-27",
     "titik": 2
    },
    {
     "minggu": "2026-08-03",
     "titik": 0
    },
    {
     "minggu": "2026-08-10",
     "titik": 27
    },
    {
     "minggu": "2026-08-17",
     "titik": 18
    },
    {
     "minggu": "2026-08-24",
     "titik": 43
    },
    {
     "minggu": "2026-08-31",
     "titik": 29
    },
    {
     "minggu": "2026-09-07",
     "titik": 42
    },
    {
     "minggu": "2026-09-14",
     "titik": 29
    },
    {
     "minggu": "2026-09-21",
     "titik": 87
    },
    {
     "minggu": "2026-09-28",
     "titik": 1
    },
    {
     "minggu": "2026-10-05",
     "titik": 8
    },
    {
     "minggu": "2026-10-12",
     "titik": 16
    },
    {
     "minggu": "2026-10-19",
     "titik": 0
    },
    {
     "minggu": "2026-10-26",
     "titik": 15
    },
    {
     "minggu": "2026-11-02",
     "titik": 9
    }
   ]
  },
  {
   "kode": "SIMP",
   "nama": "PT Salim Ivomas Pratama Tbk",
   "bursa": "IDX",
   "grup": "SIMP",
   "hubungan": "langsung",
   "dasar": "Pemegang langsung perkebunan sawit IndoAgri; grup 'SIMP' di data = PT Citra Nusa Inti Sawit. Hanya grup 'SIMP', bukan grup 'Salim Group' (isi campur, tak seluruhnya dipastikan milik SIMP). Sumber: laporan tahunan SIMP.",
   "konsesi": {
    "jumlah": 1,
    "luas_ha": 12206
   },
   "titik": {
    "total": 43,
    "d7": 0,
    "d30": 0
   },
   "mingguan": [
    {
     "minggu": "2025-12-29",
     "titik": 0
    },
    {
     "minggu": "2026-01-05",
     "titik": 0
    },
    {
     "minggu": "2026-01-12",
     "titik": 0
    },
    {
     "minggu": "2026-01-19",
     "titik": 0
    },
    {
     "minggu": "2026-01-26",
     "titik": 0
    },
    {
     "minggu": "2026-02-02",
     "titik": 0
    },
    {
     "minggu": "2026-02-09",
     "titik": 0
    },
    {
     "minggu": "2026-02-16",
     "titik": 0
    },
    {
     "minggu": "2026-02-23",
     "titik": 0
    },
    {
     "minggu": "2026-03-02",
     "titik": 0
    },
    {
     "minggu": "2026-03-09",
     "titik": 0
    },
    {
     "minggu": "2026-03-16",
     "titik": 0
    },
    {
     "minggu": "2026-03-23",
     "titik": 0
    },
    {
     "minggu": "2026-03-30",
     "titik": 0
    },
    {
     "minggu": "2026-04-06",
     "titik": 0
    },
    {
     "minggu": "2026-04-13",
     "titik": 0
    },
    {
     "minggu": "2026-04-20",
     "titik": 0
    },
    {
     "minggu": "2026-04-27",
     "titik": 0
    },
    {
     "minggu": "2026-05-04",
     "titik": 0
    },
    {
     "minggu": "2026-05-11",
     "titik": 0
    },
    {
     "minggu": "2026-05-18",
     "titik": 0
    },
    {
     "minggu": "2026-05-25",
     "titik": 0
    },
    {
     "minggu": "2026-06-01",
     "titik": 0
    },
    {
     "minggu": "2026-06-08",
     "titik": 0
    },
    {
     "minggu": "2026-06-15",
     "titik": 0
    },
    {
     "minggu": "2026-06-22",
     "titik": 0
    },
    {
     "minggu": "2026-06-29",
     "titik": 0
    },
    {
     "minggu": "2026-07-06",
     "titik": 0
    },
    {
     "minggu": "2026-07-13",
     "titik": 0
    },
    {
     "minggu": "2026-07-20",
     "titik": 0
    },
    {
     "minggu": "2026-07-27",
     "titik": 7
    },
    {
     "minggu": "2026-08-03",
     "titik": 16
    },
    {
     "minggu": "2026-08-10",
     "titik": 6
    },
    {
     "minggu": "2026-08-17",
     "titik": 11
    },
    {
     "minggu": "2026-08-24",
     "titik": 3
    },
    {
     "minggu": "2026-08-31",
     "titik": 0
    },
    {
     "minggu": "2026-09-07",
     "titik": 0
    },
    {
     "minggu": "2026-09-14",
     "titik": 0
    },
    {
     "minggu": "2026-09-21",
     "titik": 0
    },
    {
     "minggu": "2026-09-28",
     "titik": 0
    },
    {
     "minggu": "2026-10-05",
     "titik": 0
    },
    {
     "minggu": "2026-10-12",
     "titik": 0
    },
    {
     "minggu": "2026-10-19",
     "titik": 0
    },
    {
     "minggu": "2026-10-26",
     "titik": 0
    },
    {
     "minggu": "2026-11-02",
     "titik": 0
    }
   ]
  },
  {
   "kode": "TAPG",
   "nama": "PT Triputra Agro Persada Tbk",
   "bursa": "IDX",
   "grup": "Triputra (label sumber GFW: Djarum Group)",
   "hubungan": "langsung",
   "dasar": "Pemegang konsesi bernama PT Triputra Agro Persada (induk TAPG). Label grup 'Djarum Group' berasal dari data GFW, tetapi emiten yang dikaitkan HANYA TAPG, bukan emiten Djarum lain (BBCA dilarang). Sumber: prospektus/laporan tahunan TAPG.",
   "konsesi": {
    "jumlah": 1,
    "luas_ha": 24827
   },
   "titik": {
    "total": 51,
    "d7": 0,
    "d30": 0
   },
   "mingguan": [
    {
     "minggu": "2025-12-29",
     "titik": 0
    },
    {
     "minggu": "2026-01-05",
     "titik": 0
    },
    {
     "minggu": "2026-01-12",
     "titik": 0
    },
    {
     "minggu": "2026-01-19",
     "titik": 0
    },
    {
     "minggu": "2026-01-26",
     "titik": 0
    },
    {
     "minggu": "2026-02-02",
     "titik": 0
    },
    {
     "minggu": "2026-02-09",
     "titik": 0
    },
    {
     "minggu": "2026-02-16",
     "titik": 0
    },
    {
     "minggu": "2026-02-23",
     "titik": 0
    },
    {
     "minggu": "2026-03-02",
     "titik": 0
    },
    {
     "minggu": "2026-03-09",
     "titik": 0
    },
    {
     "minggu": "2026-03-16",
     "titik": 0
    },
    {
     "minggu": "2026-03-23",
     "titik": 1
    },
    {
     "minggu": "2026-03-30",
     "titik": 0
    },
    {
     "minggu": "2026-04-06",
     "titik": 0
    },
    {
     "minggu": "2026-04-13",
     "titik": 0
    },
    {
     "minggu": "2026-04-20",
     "titik": 0
    },
    {
     "minggu": "2026-04-27",
     "titik": 0
    },
    {
     "minggu": "2026-05-04",
     "titik": 0
    },
    {
     "minggu": "2026-05-11",
     "titik": 0
    },
    {
     "minggu": "2026-05-18",
     "titik": 0
    },
    {
     "minggu": "2026-05-25",
     "titik": 0
    },
    {
     "minggu": "2026-06-01",
     "titik": 3
    },
    {
     "minggu": "2026-06-08",
     "titik": 0
    },
    {
     "minggu": "2026-06-15",
     "titik": 0
    },
    {
     "minggu": "2026-06-22",
     "titik": 1
    },
    {
     "minggu": "2026-06-29",
     "titik": 0
    },
    {
     "minggu": "2026-07-06",
     "titik": 1
    },
    {
     "minggu": "2026-07-13",
     "titik": 0
    },
    {
     "minggu": "2026-07-20",
     "titik": 3
    },
    {
     "minggu": "2026-07-27",
     "titik": 0
    },
    {
     "minggu": "2026-08-03",
     "titik": 13
    },
    {
     "minggu": "2026-08-10",
     "titik": 15
    },
    {
     "minggu": "2026-08-17",
     "titik": 9
    },
    {
     "minggu": "2026-08-24",
     "titik": 1
    },
    {
     "minggu": "2026-08-31",
     "titik": 4
    },
    {
     "minggu": "2026-09-07",
     "titik": 0
    },
    {
     "minggu": "2026-09-14",
     "titik": 0
    },
    {
     "minggu": "2026-09-21",
     "titik": 0
    },
    {
     "minggu": "2026-09-28",
     "titik": 0
    },
    {
     "minggu": "2026-10-05",
     "titik": 0
    },
    {
     "minggu": "2026-10-12",
     "titik": 0
    },
    {
     "minggu": "2026-10-19",
     "titik": 0
    },
    {
     "minggu": "2026-10-26",
     "titik": 0
    },
    {
     "minggu": "2026-11-02",
     "titik": 0
    }
   ]
  },
  {
   "kode": "F34",
   "nama": "Wilmar International Ltd",
   "bursa": "SGX",
   "grup": "Wilmar",
   "hubungan": "induk",
   "dasar": "Induk grup Wilmar, tercatat di SGX (bukan IDX); memegang perkebunan sawit Indonesia lewat anak. Sumber: SGX, laporan tahunan Wilmar; RSPO 2020.",
   "konsesi": {
    "jumlah": 28,
    "luas_ha": 460635
   },
   "titik": {
    "total": 4742,
    "d7": 14,
    "d30": 2356
   },
   "mingguan": [
    {
     "minggu": "2025-12-29",
     "titik": 0
    },
    {
     "minggu": "2026-01-05",
     "titik": 0
    },
    {
     "minggu": "2026-01-12",
     "titik": 1
    },
    {
     "minggu": "2026-01-19",
     "titik": 1
    },
    {
     "minggu": "2026-01-26",
     "titik": 2
    },
    {
     "minggu": "2026-02-02",
     "titik": 4
    },
    {
     "minggu": "2026-02-09",
     "titik": 1
    },
    {
     "minggu": "2026-02-16",
     "titik": 0
    },
    {
     "minggu": "2026-02-23",
     "titik": 1
    },
    {
     "minggu": "2026-03-02",
     "titik": 3
    },
    {
     "minggu": "2026-03-09",
     "titik": 4
    },
    {
     "minggu": "2026-03-16",
     "titik": 0
    },
    {
     "minggu": "2026-03-23",
     "titik": 0
    },
    {
     "minggu": "2026-03-30",
     "titik": 0
    },
    {
     "minggu": "2026-04-06",
     "titik": 1
    },
    {
     "minggu": "2026-04-13",
     "titik": 2
    },
    {
     "minggu": "2026-04-20",
     "titik": 6
    },
    {
     "minggu": "2026-04-27",
     "titik": 0
    },
    {
     "minggu": "2026-05-04",
     "titik": 0
    },
    {
     "minggu": "2026-05-11",
     "titik": 0
    },
    {
     "minggu": "2026-05-18",
     "titik": 0
    },
    {
     "minggu": "2026-05-25",
     "titik": 0
    },
    {
     "minggu": "2026-06-01",
     "titik": 6
    },
    {
     "minggu": "2026-06-08",
     "titik": 0
    },
    {
     "minggu": "2026-06-15",
     "titik": 0
    },
    {
     "minggu": "2026-06-22",
     "titik": 3
    },
    {
     "minggu": "2026-06-29",
     "titik": 2
    },
    {
     "minggu": "2026-07-06",
     "titik": 2
    },
    {
     "minggu": "2026-07-13",
     "titik": 11
    },
    {
     "minggu": "2026-07-20",
     "titik": 76
    },
    {
     "minggu": "2026-07-27",
     "titik": 25
    },
    {
     "minggu": "2026-08-03",
     "titik": 240
    },
    {
     "minggu": "2026-08-10",
     "titik": 155
    },
    {
     "minggu": "2026-08-17",
     "titik": 247
    },
    {
     "minggu": "2026-08-24",
     "titik": 271
    },
    {
     "minggu": "2026-08-31",
     "titik": 253
    },
    {
     "minggu": "2026-09-07",
     "titik": 63
    },
    {
     "minggu": "2026-09-14",
     "titik": 336
    },
    {
     "minggu": "2026-09-21",
     "titik": 524
    },
    {
     "minggu": "2026-09-28",
     "titik": 157
    },
    {
     "minggu": "2026-10-05",
     "titik": 480
    },
    {
     "minggu": "2026-10-12",
     "titik": 860
    },
    {
     "minggu": "2026-10-19",
     "titik": 986
    },
    {
     "minggu": "2026-10-26",
     "titik": 19
    },
    {
     "minggu": "2026-11-02",
     "titik": 0
    }
   ]
  },
  {
   "kode": "SDG",
   "nama": "SD Guthrie Berhad (dahulu Sime Darby Plantation)",
   "bursa": "Bursa Malaysia",
   "grup": "Sime Darby",
   "hubungan": "induk",
   "dasar": "Induk perkebunan sawit grup Sime Darby, tercatat di Bursa Malaysia (bukan IDX). Sumber: laporan tahunan SD Guthrie; RSPO 2020.",
   "konsesi": {
    "jumlah": 17,
    "luas_ha": 233172
   },
   "titik": {
    "total": 804,
    "d7": 5,
    "d30": 207
   },
   "mingguan": [
    {
     "minggu": "2025-12-29",
     "titik": 0
    },
    {
     "minggu": "2026-01-05",
     "titik": 0
    },
    {
     "minggu": "2026-01-12",
     "titik": 2
    },
    {
     "minggu": "2026-01-19",
     "titik": 2
    },
    {
     "minggu": "2026-01-26",
     "titik": 0
    },
    {
     "minggu": "2026-02-02",
     "titik": 0
    },
    {
     "minggu": "2026-02-09",
     "titik": 1
    },
    {
     "minggu": "2026-02-16",
     "titik": 2
    },
    {
     "minggu": "2026-02-23",
     "titik": 1
    },
    {
     "minggu": "2026-03-02",
     "titik": 0
    },
    {
     "minggu": "2026-03-09",
     "titik": 4
    },
    {
     "minggu": "2026-03-16",
     "titik": 0
    },
    {
     "minggu": "2026-03-23",
     "titik": 0
    },
    {
     "minggu": "2026-03-30",
     "titik": 0
    },
    {
     "minggu": "2026-04-06",
     "titik": 0
    },
    {
     "minggu": "2026-04-13",
     "titik": 0
    },
    {
     "minggu": "2026-04-20",
     "titik": 0
    },
    {
     "minggu": "2026-04-27",
     "titik": 0
    },
    {
     "minggu": "2026-05-04",
     "titik": 0
    },
    {
     "minggu": "2026-05-11",
     "titik": 0
    },
    {
     "minggu": "2026-05-18",
     "titik": 0
    },
    {
     "minggu": "2026-05-25",
     "titik": 0
    },
    {
     "minggu": "2026-06-01",
     "titik": 1
    },
    {
     "minggu": "2026-06-08",
     "titik": 1
    },
    {
     "minggu": "2026-06-15",
     "titik": 0
    },
    {
     "minggu": "2026-06-22",
     "titik": 4
    },
    {
     "minggu": "2026-06-29",
     "titik": 1
    },
    {
     "minggu": "2026-07-06",
     "titik": 6
    },
    {
     "minggu": "2026-07-13",
     "titik": 7
    },
    {
     "minggu": "2026-07-20",
     "titik": 31
    },
    {
     "minggu": "2026-07-27",
     "titik": 33
    },
    {
     "minggu": "2026-08-03",
     "titik": 54
    },
    {
     "minggu": "2026-08-10",
     "titik": 22
    },
    {
     "minggu": "2026-08-17",
     "titik": 45
    },
    {
     "minggu": "2026-08-24",
     "titik": 53
    },
    {
     "minggu": "2026-08-31",
     "titik": 96
    },
    {
     "minggu": "2026-09-07",
     "titik": 60
    },
    {
     "minggu": "2026-09-14",
     "titik": 89
    },
    {
     "minggu": "2026-09-21",
     "titik": 45
    },
    {
     "minggu": "2026-09-28",
     "titik": 42
    },
    {
     "minggu": "2026-10-05",
     "titik": 45
    },
    {
     "minggu": "2026-10-12",
     "titik": 76
    },
    {
     "minggu": "2026-10-19",
     "titik": 74
    },
    {
     "minggu": "2026-10-26",
     "titik": 7
    },
    {
     "minggu": "2026-11-02",
     "titik": 0
    }
   ]
  },
  {
   "kode": "GENP",
   "nama": "Genting Plantations Berhad",
   "bursa": "Bursa Malaysia",
   "grup": "Genting",
   "hubungan": "induk",
   "dasar": "Pemegang langsung konsesi sawit Indonesia lewat anak (PT Sepanjang Inti Surya Utama, PT Sawit Sehat, dll.: catatan 'Genting Plantations' di data GFW); Bursa Malaysia (bukan IDX). Sumber: laporan tahunan Genting Plantations.",
   "konsesi": {
    "jumlah": 6,
    "luas_ha": 125378
   },
   "titik": {
    "total": 631,
    "d7": 1,
    "d30": 41
   },
   "mingguan": [
    {
     "minggu": "2025-12-29",
     "titik": 0
    },
    {
     "minggu": "2026-01-05",
     "titik": 0
    },
    {
     "minggu": "2026-01-12",
     "titik": 0
    },
    {
     "minggu": "2026-01-19",
     "titik": 3
    },
    {
     "minggu": "2026-01-26",
     "titik": 4
    },
    {
     "minggu": "2026-02-02",
     "titik": 0
    },
    {
     "minggu": "2026-02-09",
     "titik": 0
    },
    {
     "minggu": "2026-02-16",
     "titik": 0
    },
    {
     "minggu": "2026-02-23",
     "titik": 0
    },
    {
     "minggu": "2026-03-02",
     "titik": 0
    },
    {
     "minggu": "2026-03-09",
     "titik": 2
    },
    {
     "minggu": "2026-03-16",
     "titik": 1
    },
    {
     "minggu": "2026-03-23",
     "titik": 0
    },
    {
     "minggu": "2026-03-30",
     "titik": 0
    },
    {
     "minggu": "2026-04-06",
     "titik": 0
    },
    {
     "minggu": "2026-04-13",
     "titik": 0
    },
    {
     "minggu": "2026-04-20",
     "titik": 0
    },
    {
     "minggu": "2026-04-27",
     "titik": 0
    },
    {
     "minggu": "2026-05-04",
     "titik": 0
    },
    {
     "minggu": "2026-05-11",
     "titik": 0
    },
    {
     "minggu": "2026-05-18",
     "titik": 0
    },
    {
     "minggu": "2026-05-25",
     "titik": 0
    },
    {
     "minggu": "2026-06-01",
     "titik": 3
    },
    {
     "minggu": "2026-06-08",
     "titik": 0
    },
    {
     "minggu": "2026-06-15",
     "titik": 3
    },
    {
     "minggu": "2026-06-22",
     "titik": 5
    },
    {
     "minggu": "2026-06-29",
     "titik": 1
    },
    {
     "minggu": "2026-07-06",
     "titik": 4
    },
    {
     "minggu": "2026-07-13",
     "titik": 7
    },
    {
     "minggu": "2026-07-20",
     "titik": 12
    },
    {
     "minggu": "2026-07-27",
     "titik": 4
    },
    {
     "minggu": "2026-08-03",
     "titik": 29
    },
    {
     "minggu": "2026-08-10",
     "titik": 39
    },
    {
     "minggu": "2026-08-17",
     "titik": 47
    },
    {
     "minggu": "2026-08-24",
     "titik": 122
    },
    {
     "minggu": "2026-08-31",
     "titik": 86
    },
    {
     "minggu": "2026-09-07",
     "titik": 30
    },
    {
     "minggu": "2026-09-14",
     "titik": 106
    },
    {
     "minggu": "2026-09-21",
     "titik": 39
    },
    {
     "minggu": "2026-09-28",
     "titik": 43
    },
    {
     "minggu": "2026-10-05",
     "titik": 14
    },
    {
     "minggu": "2026-10-12",
     "titik": 9
    },
    {
     "minggu": "2026-10-19",
     "titik": 17
    },
    {
     "minggu": "2026-10-26",
     "titik": 1
    },
    {
     "minggu": "2026-11-02",
     "titik": 0
    }
   ]
  },
  {
   "kode": "KLK",
   "nama": "Kuala Lumpur Kepong Berhad",
   "bursa": "Bursa Malaysia",
   "grup": "KLK",
   "hubungan": "induk",
   "dasar": "Grup 'KLK' di data = PT Sekar Bumi Alam Lestari (sawit Kalbar), anak KLK Indonesia; Bursa Malaysia (bukan IDX). Sumber: laporan tahunan KLK; group_comp GFW.",
   "konsesi": {
    "jumlah": 1,
    "luas_ha": 6141
   },
   "titik": {
    "total": 0,
    "d7": 0,
    "d30": 0
   },
   "mingguan": [
    {
     "minggu": "2025-12-29",
     "titik": 0
    },
    {
     "minggu": "2026-01-05",
     "titik": 0
    },
    {
     "minggu": "2026-01-12",
     "titik": 0
    },
    {
     "minggu": "2026-01-19",
     "titik": 0
    },
    {
     "minggu": "2026-01-26",
     "titik": 0
    },
    {
     "minggu": "2026-02-02",
     "titik": 0
    },
    {
     "minggu": "2026-02-09",
     "titik": 0
    },
    {
     "minggu": "2026-02-16",
     "titik": 0
    },
    {
     "minggu": "2026-02-23",
     "titik": 0
    },
    {
     "minggu": "2026-03-02",
     "titik": 0
    },
    {
     "minggu": "2026-03-09",
     "titik": 0
    },
    {
     "minggu": "2026-03-16",
     "titik": 0
    },
    {
     "minggu": "2026-03-23",
     "titik": 0
    },
    {
     "minggu": "2026-03-30",
     "titik": 0
    },
    {
     "minggu": "2026-04-06",
     "titik": 0
    },
    {
     "minggu": "2026-04-13",
     "titik": 0
    },
    {
     "minggu": "2026-04-20",
     "titik": 0
    },
    {
     "minggu": "2026-04-27",
     "titik": 0
    },
    {
     "minggu": "2026-05-04",
     "titik": 0
    },
    {
     "minggu": "2026-05-11",
     "titik": 0
    },
    {
     "minggu": "2026-05-18",
     "titik": 0
    },
    {
     "minggu": "2026-05-25",
     "titik": 0
    },
    {
     "minggu": "2026-06-01",
     "titik": 0
    },
    {
     "minggu": "2026-06-08",
     "titik": 0
    },
    {
     "minggu": "2026-06-15",
     "titik": 0
    },
    {
     "minggu": "2026-06-22",
     "titik": 0
    },
    {
     "minggu": "2026-06-29",
     "titik": 0
    },
    {
     "minggu": "2026-07-06",
     "titik": 0
    },
    {
     "minggu": "2026-07-13",
     "titik": 0
    },
    {
     "minggu": "2026-07-20",
     "titik": 0
    },
    {
     "minggu": "2026-07-27",
     "titik": 0
    },
    {
     "minggu": "2026-08-03",
     "titik": 0
    },
    {
     "minggu": "2026-08-10",
     "titik": 0
    },
    {
     "minggu": "2026-08-17",
     "titik": 0
    },
    {
     "minggu": "2026-08-24",
     "titik": 0
    },
    {
     "minggu": "2026-08-31",
     "titik": 0
    },
    {
     "minggu": "2026-09-07",
     "titik": 0
    },
    {
     "minggu": "2026-09-14",
     "titik": 0
    },
    {
     "minggu": "2026-09-21",
     "titik": 0
    },
    {
     "minggu": "2026-09-28",
     "titik": 0
    },
    {
     "minggu": "2026-10-05",
     "titik": 0
    },
    {
     "minggu": "2026-10-12",
     "titik": 0
    },
    {
     "minggu": "2026-10-19",
     "titik": 0
    },
    {
     "minggu": "2026-10-26",
     "titik": 0
    },
    {
     "minggu": "2026-11-02",
     "titik": 0
    }
   ]
  },
  {
   "kode": "MPE",
   "nama": "M.P. Evans Group PLC",
   "bursa": "LSE AIM",
   "grup": "MP Evans Group PLC (MPE)",
   "hubungan": "induk",
   "dasar": "Grup 'MP Evans Group PLC (MPE)' di data GFW untuk anak sawit di Kalbar; induk tercatat London AIM (bukan IDX). Sumber: laporan tahunan MP Evans; group_comp GFW.",
   "konsesi": {
    "jumlah": 4,
    "luas_ha": 79987
   },
   "titik": {
    "total": 167,
    "d7": 3,
    "d30": 9
   },
   "mingguan": [
    {
     "minggu": "2025-12-29",
     "titik": 0
    },
    {
     "minggu": "2026-01-05",
     "titik": 0
    },
    {
     "minggu": "2026-01-12",
     "titik": 0
    },
    {
     "minggu": "2026-01-19",
     "titik": 1
    },
    {
     "minggu": "2026-01-26",
     "titik": 0
    },
    {
     "minggu": "2026-02-02",
     "titik": 1
    },
    {
     "minggu": "2026-02-09",
     "titik": 0
    },
    {
     "minggu": "2026-02-16",
     "titik": 0
    },
    {
     "minggu": "2026-02-23",
     "titik": 0
    },
    {
     "minggu": "2026-03-02",
     "titik": 0
    },
    {
     "minggu": "2026-03-09",
     "titik": 5
    },
    {
     "minggu": "2026-03-16",
     "titik": 0
    },
    {
     "minggu": "2026-03-23",
     "titik": 0
    },
    {
     "minggu": "2026-03-30",
     "titik": 0
    },
    {
     "minggu": "2026-04-06",
     "titik": 0
    },
    {
     "minggu": "2026-04-13",
     "titik": 1
    },
    {
     "minggu": "2026-04-20",
     "titik": 0
    },
    {
     "minggu": "2026-04-27",
     "titik": 0
    },
    {
     "minggu": "2026-05-04",
     "titik": 0
    },
    {
     "minggu": "2026-05-11",
     "titik": 0
    },
    {
     "minggu": "2026-05-18",
     "titik": 0
    },
    {
     "minggu": "2026-05-25",
     "titik": 0
    },
    {
     "minggu": "2026-06-01",
     "titik": 0
    },
    {
     "minggu": "2026-06-08",
     "titik": 0
    },
    {
     "minggu": "2026-06-15",
     "titik": 0
    },
    {
     "minggu": "2026-06-22",
     "titik": 0
    },
    {
     "minggu": "2026-06-29",
     "titik": 0
    },
    {
     "minggu": "2026-07-06",
     "titik": 1
    },
    {
     "minggu": "2026-07-13",
     "titik": 1
    },
    {
     "minggu": "2026-07-20",
     "titik": 1
    },
    {
     "minggu": "2026-07-27",
     "titik": 2
    },
    {
     "minggu": "2026-08-03",
     "titik": 17
    },
    {
     "minggu": "2026-08-10",
     "titik": 22
    },
    {
     "minggu": "2026-08-17",
     "titik": 21
    },
    {
     "minggu": "2026-08-24",
     "titik": 41
    },
    {
     "minggu": "2026-08-31",
     "titik": 13
    },
    {
     "minggu": "2026-09-07",
     "titik": 2
    },
    {
     "minggu": "2026-09-14",
     "titik": 20
    },
    {
     "minggu": "2026-09-21",
     "titik": 5
    },
    {
     "minggu": "2026-09-28",
     "titik": 4
    },
    {
     "minggu": "2026-10-05",
     "titik": 6
    },
    {
     "minggu": "2026-10-12",
     "titik": 0
    },
    {
     "minggu": "2026-10-19",
     "titik": 0
    },
    {
     "minggu": "2026-10-26",
     "titik": 3
    },
    {
     "minggu": "2026-11-02",
     "titik": 0
    }
   ]
  },
  {
   "kode": "8002",
   "nama": "Marubeni Corporation",
   "bursa": "TSE",
   "grup": "Marubeni",
   "hubungan": "induk",
   "dasar": "Grup 'Marubeni' di data = PT Musi Hutan Persada (HTI pulp Sumsel, Trase v3), anak Marubeni; induk tercatat Tokyo (bukan IDX). Sumber: Trase v3; laporan tahunan Marubeni.",
   "konsesi": {
    "jumlah": 1,
    "luas_ha": 289602
   },
   "titik": {
    "total": 484,
    "d7": 0,
    "d30": 129
   },
   "mingguan": [
    {
     "minggu": "2025-12-29",
     "titik": 0
    },
    {
     "minggu": "2026-01-05",
     "titik": 2
    },
    {
     "minggu": "2026-01-12",
     "titik": 0
    },
    {
     "minggu": "2026-01-19",
     "titik": 0
    },
    {
     "minggu": "2026-01-26",
     "titik": 0
    },
    {
     "minggu": "2026-02-02",
     "titik": 0
    },
    {
     "minggu": "2026-02-09",
     "titik": 0
    },
    {
     "minggu": "2026-02-16",
     "titik": 0
    },
    {
     "minggu": "2026-02-23",
     "titik": 0
    },
    {
     "minggu": "2026-03-02",
     "titik": 0
    },
    {
     "minggu": "2026-03-09",
     "titik": 0
    },
    {
     "minggu": "2026-03-16",
     "titik": 0
    },
    {
     "minggu": "2026-03-23",
     "titik": 0
    },
    {
     "minggu": "2026-03-30",
     "titik": 0
    },
    {
     "minggu": "2026-04-06",
     "titik": 0
    },
    {
     "minggu": "2026-04-13",
     "titik": 0
    },
    {
     "minggu": "2026-04-20",
     "titik": 0
    },
    {
     "minggu": "2026-04-27",
     "titik": 0
    },
    {
     "minggu": "2026-05-04",
     "titik": 0
    },
    {
     "minggu": "2026-05-11",
     "titik": 0
    },
    {
     "minggu": "2026-05-18",
     "titik": 0
    },
    {
     "minggu": "2026-05-25",
     "titik": 0
    },
    {
     "minggu": "2026-06-01",
     "titik": 0
    },
    {
     "minggu": "2026-06-08",
     "titik": 1
    },
    {
     "minggu": "2026-06-15",
     "titik": 1
    },
    {
     "minggu": "2026-06-22",
     "titik": 1
    },
    {
     "minggu": "2026-06-29",
     "titik": 1
    },
    {
     "minggu": "2026-07-06",
     "titik": 1
    },
    {
     "minggu": "2026-07-13",
     "titik": 1
    },
    {
     "minggu": "2026-07-20",
     "titik": 3
    },
    {
     "minggu": "2026-07-27",
     "titik": 1
    },
    {
     "minggu": "2026-08-03",
     "titik": 20
    },
    {
     "minggu": "2026-08-10",
     "titik": 11
    },
    {
     "minggu": "2026-08-17",
     "titik": 53
    },
    {
     "minggu": "2026-08-24",
     "titik": 75
    },
    {
     "minggu": "2026-08-31",
     "titik": 48
    },
    {
     "minggu": "2026-09-07",
     "titik": 27
    },
    {
     "minggu": "2026-09-14",
     "titik": 108
    },
    {
     "minggu": "2026-09-21",
     "titik": 1
    },
    {
     "minggu": "2026-09-28",
     "titik": 0
    },
    {
     "minggu": "2026-10-05",
     "titik": 34
    },
    {
     "minggu": "2026-10-12",
     "titik": 50
    },
    {
     "minggu": "2026-10-19",
     "titik": 45
    },
    {
     "minggu": "2026-10-26",
     "titik": 0
    },
    {
     "minggu": "2026-11-02",
     "titik": 0
    }
   ]
  }
 ],
 "grup_tanpa_emiten": [
  {
   "grup": "Barito Pacific",
   "alasan": "GFW 2019 menamai grup ini untuk PT Wahana Guna Marga Pratama, Agro Pratama Subur Lestari, Gandaerah Hendana; kepemilikan terkini oleh BRPT belum terverifikasi. Tak yakin: tidak dimasukkan.",
   "titik": {
    "total": 159,
    "d7": 7,
    "d30": 30
   }
  },
  {
   "grup": "Royal Golden Eagle",
   "alasan": "RGE (APRIL, Asian Agri, Apical) tertutup; tidak ada induk tercatat di IDX yang menginduki konsesinya.",
   "titik": {
    "total": 3031,
    "d7": 33,
    "d30": 183
   }
  },
  {
   "grup": "Medco",
   "alasan": "MEDC tidak menginduki konsesi ini: poligon (PT Mata Epsi Agro, PT Selaras Inti Semesta) dipegang lewat Medco Agro di induk non-tercatat. Tak yakin: tidak dimasukkan.",
   "titik": {
    "total": 2606,
    "d7": 37,
    "d30": 966
   }
  },
  {
   "grup": "Musim Mas",
   "alasan": "Perusahaan keluarga tertutup, tidak tercatat di bursa.",
   "titik": {
    "total": 2369,
    "d7": 5,
    "d30": 287
   }
  },
  {
   "grup": "Makin",
   "alasan": "Tidak ada emiten tercatat yang dapat dikaitkan langsung ke pemegang konsesinya (grup tertutup atau kaitan tak terkonfirmasi).",
   "titik": {
    "total": 2168,
    "d7": 0,
    "d30": 42
   }
  },
  {
   "grup": "Government",
   "alasan": "Inhutani (BUMN kehutanan), tidak tercatat di bursa.",
   "titik": {
    "total": 1897,
    "d7": 15,
    "d30": 455
   }
  },
  {
   "grup": "Palma Agro Lestari",
   "alasan": "Tidak ada emiten tercatat yang dapat dikaitkan langsung ke pemegang konsesinya (grup tertutup atau kaitan tak terkonfirmasi).",
   "titik": {
    "total": 1779,
    "d7": 0,
    "d30": 23
   }
  },
  {
   "grup": "Sampoerna (HTI Hutan Ketapang)",
   "alasan": "HTI PT Hutan Ketapang Industri: bukan milik SGRO (Sampoerna Agro); dipisah dari deret SGRO.",
   "titik": {
    "total": 1663,
    "d7": 1,
    "d30": 225
   }
  },
  {
   "grup": "First Borneo Plantations (FBP)",
   "alasan": "Tidak ada emiten tercatat yang dapat dikaitkan langsung ke pemegang konsesinya (grup tertutup atau kaitan tak terkonfirmasi).",
   "titik": {
    "total": 1481,
    "d7": 0,
    "d30": 186
   }
  },
  {
   "grup": "Surya Dumai Group",
   "alasan": "Tidak ada emiten tercatat yang dapat dikaitkan langsung ke pemegang konsesinya (grup tertutup atau kaitan tak terkonfirmasi).",
   "titik": {
    "total": 792,
    "d7": 0,
    "d30": 1
   }
  },
  {
   "grup": "Bakrie Group",
   "alasan": "UNSP: status tercatat dan kepemilikan konsesi (PT Bakri Sumatera Plantation, PT Patriot Andalas) belum terkonfirmasi. Tak yakin: tidak dimasukkan.",
   "titik": {
    "total": 707,
    "d7": 0,
    "d30": 6
   }
  },
  {
   "grup": "Djarum",
   "alasan": "Konglomerat; PT Fajar Surya Swadaya (HTI) tak punya emiten pemegang. BBCA bukan pemegang konsesi dan tidak boleh dikaitkan.",
   "titik": {
    "total": 676,
    "d7": 125,
    "d30": 331
   }
  },
  {
   "grup": "Berca Group",
   "alasan": "Tidak ada emiten tercatat yang dapat dikaitkan langsung ke pemegang konsesinya (grup tertutup atau kaitan tak terkonfirmasi).",
   "titik": {
    "total": 556,
    "d7": 26,
    "d30": 105
   }
  },
  {
   "grup": "Jcorp",
   "alasan": "Johor Corp = BUMD Johor tertutup; induk bukan emiten.",
   "titik": {
    "total": 553,
    "d7": 0,
    "d30": 6
   }
  },
  {
   "grup": "Lyman Group",
   "alasan": "Tidak ada emiten tercatat yang dapat dikaitkan langsung ke pemegang konsesinya (grup tertutup atau kaitan tak terkonfirmasi).",
   "titik": {
    "total": 542,
    "d7": 0,
    "d30": 2
   }
  },
  {
   "grup": "Julong Group",
   "alasan": "Tidak ada emiten tercatat yang dapat dikaitkan langsung ke pemegang konsesinya (grup tertutup atau kaitan tak terkonfirmasi).",
   "titik": {
    "total": 505,
    "d7": 0,
    "d30": 355
   }
  },
  {
   "grup": "Pasifik Agro Sentosa",
   "alasan": "Tidak ada emiten tercatat yang dapat dikaitkan langsung ke pemegang konsesinya (grup tertutup atau kaitan tak terkonfirmasi).",
   "titik": {
    "total": 469,
    "d7": 0,
    "d30": 5
   }
  },
  {
   "grup": "Incasi Raya",
   "alasan": "Tidak ada emiten tercatat yang dapat dikaitkan langsung ke pemegang konsesinya (grup tertutup atau kaitan tak terkonfirmasi).",
   "titik": {
    "total": 448,
    "d7": 0,
    "d30": 4
   }
  },
  {
   "grup": "Kaestindo Group",
   "alasan": "Tidak ada emiten tercatat yang dapat dikaitkan langsung ke pemegang konsesinya (grup tertutup atau kaitan tak terkonfirmasi).",
   "titik": {
    "total": 377,
    "d7": 61,
    "d30": 201
   }
  },
  {
   "grup": "BRU Group",
   "alasan": "Tidak ada emiten tercatat yang dapat dikaitkan langsung ke pemegang konsesinya (grup tertutup atau kaitan tak terkonfirmasi).",
   "titik": {
    "total": 346,
    "d7": 2,
    "d30": 23
   }
  },
  {
   "grup": "Ganda Group",
   "alasan": "Tidak ada emiten tercatat yang dapat dikaitkan langsung ke pemegang konsesinya (grup tertutup atau kaitan tak terkonfirmasi).",
   "titik": {
    "total": 279,
    "d7": 0,
    "d30": 0
   }
  },
  {
   "grup": "Surya Borneo Indah",
   "alasan": "Tidak ada emiten tercatat yang dapat dikaitkan langsung ke pemegang konsesinya (grup tertutup atau kaitan tak terkonfirmasi).",
   "titik": {
    "total": 279,
    "d7": 0,
    "d30": 3
   }
  },
  {
   "grup": "Sumitomo",
   "alasan": "Entitas Sumitomo pemegang HTI tidak dipastikan (Sumitomo Corp atau Sumitomo Forestry). Tak yakin: tidak dimasukkan.",
   "titik": {
    "total": 276,
    "d7": 10,
    "d30": 39
   }
  },
  {
   "grup": "Perkebunan Nusantara",
   "alasan": "PTPN = BUMN; Holding PTPN III (Persero) tidak tercatat di bursa (hanya obligasi).",
   "titik": {
    "total": 270,
    "d7": 7,
    "d30": 55
   }
  },
  {
   "grup": "PT Malindo Jaya Makmur",
   "alasan": "Tidak ada emiten tercatat yang dapat dikaitkan langsung ke pemegang konsesinya (grup tertutup atau kaitan tak terkonfirmasi).",
   "titik": {
    "total": 235,
    "d7": 0,
    "d30": 3
   }
  },
  {
   "grup": "Cargill",
   "alasan": "Perusahaan tertutup AS, tidak tercatat.",
   "titik": {
    "total": 232,
    "d7": 14,
    "d30": 59
   }
  },
  {
   "grup": "Best International/Best Agro Plantation",
   "alasan": "Tidak ada emiten tercatat yang dapat dikaitkan langsung ke pemegang konsesinya (grup tertutup atau kaitan tak terkonfirmasi).",
   "titik": {
    "total": 229,
    "d7": 0,
    "d30": 38
   }
  },
  {
   "grup": "BHD Group",
   "alasan": "Tidak ada emiten tercatat yang dapat dikaitkan langsung ke pemegang konsesinya (grup tertutup atau kaitan tak terkonfirmasi).",
   "titik": {
    "total": 227,
    "d7": 0,
    "d30": 0
   }
  },
  {
   "grup": "MJP Group",
   "alasan": "Tidak ada emiten tercatat yang dapat dikaitkan langsung ke pemegang konsesinya (grup tertutup atau kaitan tak terkonfirmasi).",
   "titik": {
    "total": 226,
    "d7": 0,
    "d30": 2
   }
  },
  {
   "grup": "Charoen Pokphand",
   "alasan": "Tidak ada emiten tercatat yang dapat dikaitkan langsung ke pemegang konsesinya (grup tertutup atau kaitan tak terkonfirmasi).",
   "titik": {
    "total": 199,
    "d7": 0,
    "d30": 1
   }
  },
  {
   "grup": "Lion Group",
   "alasan": "Tidak ada emiten tercatat yang dapat dikaitkan langsung ke pemegang konsesinya (grup tertutup atau kaitan tak terkonfirmasi).",
   "titik": {
    "total": 183,
    "d7": 0,
    "d30": 0
   }
  },
  {
   "grup": "Wings",
   "alasan": "Tidak ada emiten tercatat yang dapat dikaitkan langsung ke pemegang konsesinya (grup tertutup atau kaitan tak terkonfirmasi).",
   "titik": {
    "total": 181,
    "d7": 0,
    "d30": 97
   }
  },
  {
   "grup": "Cempaka Anda Group",
   "alasan": "Tidak ada emiten tercatat yang dapat dikaitkan langsung ke pemegang konsesinya (grup tertutup atau kaitan tak terkonfirmasi).",
   "titik": {
    "total": 160,
    "d7": 0,
    "d30": 0
   }
  },
  {
   "grup": "Indo Karya",
   "alasan": "Tidak ada emiten tercatat yang dapat dikaitkan langsung ke pemegang konsesinya (grup tertutup atau kaitan tak terkonfirmasi).",
   "titik": {
    "total": 137,
    "d7": 0,
    "d30": 33
   }
  },
  {
   "grup": "Hasfarm Group",
   "alasan": "Tidak ada emiten tercatat yang dapat dikaitkan langsung ke pemegang konsesinya (grup tertutup atau kaitan tak terkonfirmasi).",
   "titik": {
    "total": 120,
    "d7": 0,
    "d30": 14
   }
  },
  {
   "grup": "Napan and Risjadson",
   "alasan": "Tidak ada emiten tercatat yang dapat dikaitkan langsung ke pemegang konsesinya (grup tertutup atau kaitan tak terkonfirmasi).",
   "titik": {
    "total": 107,
    "d7": 0,
    "d30": 58
   }
  },
  {
   "grup": "Sungai Budi Group",
   "alasan": "Kaitan PT Bumi Perkasa ke TBLA belum terkonfirmasi. Tak yakin: tidak dimasukkan.",
   "titik": {
    "total": 94,
    "d7": 0,
    "d30": 0
   }
  },
  {
   "grup": "Mukti Group",
   "alasan": "Tidak ada emiten tercatat yang dapat dikaitkan langsung ke pemegang konsesinya (grup tertutup atau kaitan tak terkonfirmasi).",
   "titik": {
    "total": 87,
    "d7": 7,
    "d30": 22
   }
  },
  {
   "grup": "Yamaker",
   "alasan": "Tidak ada emiten tercatat yang dapat dikaitkan langsung ke pemegang konsesinya (grup tertutup atau kaitan tak terkonfirmasi).",
   "titik": {
    "total": 81,
    "d7": 0,
    "d30": 0
   }
  },
  {
   "grup": "Duta Palma Group",
   "alasan": "Tidak ada emiten tercatat yang dapat dikaitkan langsung ke pemegang konsesinya (grup tertutup atau kaitan tak terkonfirmasi).",
   "titik": {
    "total": 79,
    "d7": 0,
    "d30": 1
   }
  },
  {
   "grup": "Indonusa Group",
   "alasan": "Tidak ada emiten tercatat yang dapat dikaitkan langsung ke pemegang konsesinya (grup tertutup atau kaitan tak terkonfirmasi).",
   "titik": {
    "total": 67,
    "d7": 0,
    "d30": 1
   }
  },
  {
   "grup": "Media Group",
   "alasan": "Tidak ada emiten tercatat yang dapat dikaitkan langsung ke pemegang konsesinya (grup tertutup atau kaitan tak terkonfirmasi).",
   "titik": {
    "total": 61,
    "d7": 0,
    "d30": 2
   }
  },
  {
   "grup": "Adr",
   "alasan": "Tidak ada emiten tercatat yang dapat dikaitkan langsung ke pemegang konsesinya (grup tertutup atau kaitan tak terkonfirmasi).",
   "titik": {
    "total": 52,
    "d7": 1,
    "d30": 17
   }
  },
  {
   "grup": "Danitama Makmur",
   "alasan": "Tidak ada emiten tercatat yang dapat dikaitkan langsung ke pemegang konsesinya (grup tertutup atau kaitan tak terkonfirmasi).",
   "titik": {
    "total": 50,
    "d7": 0,
    "d30": 0
   }
  },
  {
   "grup": "Sambu Group",
   "alasan": "Tidak ada emiten tercatat yang dapat dikaitkan langsung ke pemegang konsesinya (grup tertutup atau kaitan tak terkonfirmasi).",
   "titik": {
    "total": 50,
    "d7": 0,
    "d30": 0
   }
  },
  {
   "grup": "Borneo Group",
   "alasan": "Tidak ada emiten tercatat yang dapat dikaitkan langsung ke pemegang konsesinya (grup tertutup atau kaitan tak terkonfirmasi).",
   "titik": {
    "total": 46,
    "d7": 0,
    "d30": 0
   }
  },
  {
   "grup": "Goodhope Asia Holdings",
   "alasan": "Tidak ada emiten tercatat yang dapat dikaitkan langsung ke pemegang konsesinya (grup tertutup atau kaitan tak terkonfirmasi).",
   "titik": {
    "total": 43,
    "d7": 0,
    "d30": 0
   }
  },
  {
   "grup": "Wanamaja Adhitama",
   "alasan": "Tidak ada emiten tercatat yang dapat dikaitkan langsung ke pemegang konsesinya (grup tertutup atau kaitan tak terkonfirmasi).",
   "titik": {
    "total": 43,
    "d7": 2,
    "d30": 7
   }
  },
  {
   "grup": "Salim Group",
   "alasan": "Isi grup campur (sebagian anak IndoAgri/SIMP, sebagian tidak dipastikan); SIMP dan LSIP sudah dipetakan lewat grup terpisah 'SIMP' dan 'London Sumatra'.",
   "titik": {
    "total": 42,
    "d7": 0,
    "d30": 1
   }
  },
  {
   "grup": "Kebun Kutai Permai",
   "alasan": "Tidak ada emiten tercatat yang dapat dikaitkan langsung ke pemegang konsesinya (grup tertutup atau kaitan tak terkonfirmasi).",
   "titik": {
    "total": 42,
    "d7": 7,
    "d30": 10
   }
  },
  {
   "grup": "PT Global Natural Resources",
   "alasan": "Tidak ada emiten tercatat yang dapat dikaitkan langsung ke pemegang konsesinya (grup tertutup atau kaitan tak terkonfirmasi).",
   "titik": {
    "total": 32,
    "d7": 0,
    "d30": 1
   }
  },
  {
   "grup": "PTT Green Energy Pte Ltd (PTTGE)",
   "alasan": "Tidak ada emiten tercatat yang dapat dikaitkan langsung ke pemegang konsesinya (grup tertutup atau kaitan tak terkonfirmasi).",
   "titik": {
    "total": 30,
    "d7": 0,
    "d30": 0
   }
  },
  {
   "grup": "Mitra Jaya Group",
   "alasan": "Tidak ada emiten tercatat yang dapat dikaitkan langsung ke pemegang konsesinya (grup tertutup atau kaitan tak terkonfirmasi).",
   "titik": {
    "total": 30,
    "d7": 1,
    "d30": 5
   }
  },
  {
   "grup": "Agro Group",
   "alasan": "Tidak ada emiten tercatat yang dapat dikaitkan langsung ke pemegang konsesinya (grup tertutup atau kaitan tak terkonfirmasi).",
   "titik": {
    "total": 28,
    "d7": 8,
    "d30": 8
   }
  },
  {
   "grup": "Daya Sakti Group",
   "alasan": "Tidak ada emiten tercatat yang dapat dikaitkan langsung ke pemegang konsesinya (grup tertutup atau kaitan tak terkonfirmasi).",
   "titik": {
    "total": 21,
    "d7": 0,
    "d30": 17
   }
  },
  {
   "grup": "PIC Group",
   "alasan": "Tidak ada emiten tercatat yang dapat dikaitkan langsung ke pemegang konsesinya (grup tertutup atau kaitan tak terkonfirmasi).",
   "titik": {
    "total": 20,
    "d7": 0,
    "d30": 0
   }
  },
  {
   "grup": "Indhasana Group",
   "alasan": "Tidak ada emiten tercatat yang dapat dikaitkan langsung ke pemegang konsesinya (grup tertutup atau kaitan tak terkonfirmasi).",
   "titik": {
    "total": 20,
    "d7": 0,
    "d30": 8
   }
  },
  {
   "grup": "Tiga Pilar Sejahtera Food",
   "alasan": "Kaitan PT Bumi Raya Investindo ke AISA belum terkonfirmasi. Tak yakin: tidak dimasukkan.",
   "titik": {
    "total": 20,
    "d7": 0,
    "d30": 2
   }
  },
  {
   "grup": "PT Mitra Inti Sejati Plantation or MISP",
   "alasan": "Tidak ada emiten tercatat yang dapat dikaitkan langsung ke pemegang konsesinya (grup tertutup atau kaitan tak terkonfirmasi).",
   "titik": {
    "total": 17,
    "d7": 0,
    "d30": 0
   }
  },
  {
   "grup": "Rokan Group",
   "alasan": "Tidak ada emiten tercatat yang dapat dikaitkan langsung ke pemegang konsesinya (grup tertutup atau kaitan tak terkonfirmasi).",
   "titik": {
    "total": 14,
    "d7": 0,
    "d30": 0
   }
  },
  {
   "grup": "Bosawa Corporation",
   "alasan": "Tidak ada emiten tercatat yang dapat dikaitkan langsung ke pemegang konsesinya (grup tertutup atau kaitan tak terkonfirmasi).",
   "titik": {
    "total": 13,
    "d7": 0,
    "d30": 2
   }
  },
  {
   "grup": "Mantimin Coal Mining",
   "alasan": "Tidak ada emiten tercatat yang dapat dikaitkan langsung ke pemegang konsesinya (grup tertutup atau kaitan tak terkonfirmasi).",
   "titik": {
    "total": 10,
    "d7": 0,
    "d30": 0
   }
  },
  {
   "grup": "Harapan Sawit Lestari",
   "alasan": "Tidak ada emiten tercatat yang dapat dikaitkan langsung ke pemegang konsesinya (grup tertutup atau kaitan tak terkonfirmasi).",
   "titik": {
    "total": 5,
    "d7": 0,
    "d30": 0
   }
  },
  {
   "grup": "Rana Wastu Group",
   "alasan": "Tidak ada emiten tercatat yang dapat dikaitkan langsung ke pemegang konsesinya (grup tertutup atau kaitan tak terkonfirmasi).",
   "titik": {
    "total": 4,
    "d7": 0,
    "d30": 0
   }
  },
  {
   "grup": "Korindo",
   "alasan": "Tidak ada emiten tercatat yang dapat dikaitkan langsung ke pemegang konsesinya (grup tertutup atau kaitan tak terkonfirmasi).",
   "titik": {
    "total": 4,
    "d7": 0,
    "d30": 2
   }
  },
  {
   "grup": "Sarimas Group",
   "alasan": "Tidak ada emiten tercatat yang dapat dikaitkan langsung ke pemegang konsesinya (grup tertutup atau kaitan tak terkonfirmasi).",
   "titik": {
    "total": 3,
    "d7": 0,
    "d30": 0
   }
  },
  {
   "grup": "Batasan Group",
   "alasan": "Tidak ada emiten tercatat yang dapat dikaitkan langsung ke pemegang konsesinya (grup tertutup atau kaitan tak terkonfirmasi).",
   "titik": {
    "total": 3,
    "d7": 0,
    "d30": 0
   }
  },
  {
   "grup": "RP KELAPA SAWIT Sdn Bhd",
   "alasan": "Tidak ada emiten tercatat yang dapat dikaitkan langsung ke pemegang konsesinya (grup tertutup atau kaitan tak terkonfirmasi).",
   "titik": {
    "total": 3,
    "d7": 0,
    "d30": 0
   }
  },
  {
   "grup": "Dumai Indah Group",
   "alasan": "Tidak ada emiten tercatat yang dapat dikaitkan langsung ke pemegang konsesinya (grup tertutup atau kaitan tak terkonfirmasi).",
   "titik": {
    "total": 1,
    "d7": 0,
    "d30": 0
   }
  }
 ]
};
