"use strict";
/* Konstanta Siklus (ALGORITMA), kembaran scripts/siklus/konst.py; paritas dijaga tests/siklus/paritas.test.mjs. null = menunggu. */
const KONST = Object.freeze({
  JENDELA_JENIS: {bawaan: 3, kekeringan: null, karhutla: null, gunungapi: null},
  BASI_HARI: 3,
  PITA: 4,
  AMBANG_BANGUNAN: 0.70,
  BATAS_INARISK: [0.33, 0.66],
  REHAB_MACET_HARI: 60,
  RENKON_SEGERA_HARI: 90,
  JRC_HUNIAN: [[0, 0], [0.5, 0.33], [1, 0.49], [1.5, 0.62], [2, 0.72], [3, 0.87], [4, 0.93], [5, 0.98], [6, 1]],
  JRC_D_MAKS: {hunian: 111, niaga: 138, industri: 114},
  KURS: null,
  FAKTOR_HARGA: null,
  TAG_OSM: null,
});
