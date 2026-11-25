/* Label kode kejadian di layar Lapor (lapor-kejadian Q14, LK-08). Tiga keluarga kode tidak pernah tampil telanjang di satu kolom:
   KJ-ddmmyy-NN = kejadian laporan dari konfirmasi pelapor (K66, migrasi 0160), KJ-ddmm-XXXXXXXX = kejadian resmi Buku Besar (scripts/siklus/pasang.py),
   GL-ddmmyy-NN = gugus tebakan jarak dan desa (A9, A1), juga kejadian laporan (lapor-kejadian D1). Gerbang: tests/lapor/kode_label.test.mjs. */
export const labelKode = k => { const s = String(k ?? "");
  return /^KJ-\d{6}-\d{2,3}$/.test(s) ? `Kejadian laporan ${s}` : /^KJ-\d{4}-[0-9A-Za-z]{8}$/.test(s) ? `Kejadian resmi ${s}` : /^GL-\d{6}-\d{2,3}$/.test(s) ? `Kejadian laporan ${s}` : s; };
