/* SQL tugas_api yang dijajak /api/monitor dan /api/pantau/ringkas. Modul daun tanpa impor supaya gerbang
   tests/agen/gerbang-d1-pindai.test.mjs bisa memeriksa rencana kuerinya (src/monitor.js <-> src/instansi.js saling impor). */
/* tugas aktif: buka, atau dibuat/padam dalam jendela (2 bind). Tiga cabang UNION, bukan OR: D1 tanpa statistik memilih memindai seluruh
   indeks dibuat untuk ORDER BY bila memakai OR, dan /api/monitor dijajak tiap 2 menit = kuota baca habis (11 Nov 2026). Gerbang: tests/agen/gerbang-d1-pindai.test.mjs */
export const TUGAS_AKTIF = "t.id IN (SELECT id FROM tugas_api WHERE status = 'buka' UNION ALL SELECT id FROM tugas_api WHERE dibuat > ? UNION ALL SELECT id FROM tugas_api WHERE padam_pada > ?)";
export const sqlDaftar = (lingkup, bagian) => `SELECT t.id, t.prov, t.kab, t.kec, t.lat, t.lon, t.level, t.status, t.dibuat, t.terakhir_terdeteksi, t.padam_verif FROM tugas_api t
    WHERE ${lingkup} ${bagian} AND ${TUGAS_AKTIF} ORDER BY t.dibuat DESC LIMIT 300`;
const ADA = (tbl, kond) => `EXISTS (SELECT 1 FROM ${tbl} x WHERE x.tugas_id = t.id AND ${kond})`;
export const AGREGAT = baca => `SELECT t.prov, count(*) kejadian, sum(${baca ? ADA("monitor_baca", "x.pihak = 'dalops' AND x.dummy = 0") : "0"}) dimonitor, sum(${baca ? ADA("monitor_baca", "x.pihak = 'bpbd' AND x.dummy = 0") : "0"}) diinfokan,
  sum(${ADA("tugas_isian", "x.langkah = 'konfirmasi'")}) groundcheck, sum(${ADA("tugas_isian", "x.langkah = 'tindakan'")}) tindak, sum(t.status != 'buka') selesai
  FROM tugas_api t WHERE t.dummy = 0 AND ${TUGAS_AKTIF} AND ?1 GROUP BY t.prov`;
