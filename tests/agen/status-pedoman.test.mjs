// Fungsi murni status darurat (public/inti/status_pedoman.js): SK berlaku per kab dan tindakan per status.
import test from "node:test";
import assert from "node:assert/strict";
import {skBerlaku, tindakan, kode4, sisaHari, kalimatRingkas, rentang, labelSaran, hitungSaran, judulSaran, kalimatTanpaSK, rapiTanggal} from "../../public/inti/status_pedoman.js";

const SK = [
  {nomor: "a", skala: "kabupaten", kab_kode: "11.12", prov_kode: "11", status: "Tanggap Darurat", mulai: "2026-10-01", berakhir: "2026-10-20"},
  {nomor: "b", skala: "kabupaten", kab_kode: "11.12", prov_kode: "11", status: "Siaga Darurat", mulai: "2026-01-01", berakhir: "2026-01-10"},
  {nomor: "c", skala: "provinsi", kab_kode: null, prov_kode: "11", status: "Siaga Darurat", mulai: "2026-10-05", berakhir: null},
  {nomor: "d", skala: "kabupaten", kab_kode: "11.71", prov_kode: "11", status: "Siaga Darurat", mulai: "2026-10-01", berakhir: "2026-10-30"}
];
test("kode4 membuang titik", () => assert.equal(kode4("11.12"), "1112"));
test("skBerlaku: kab, lalu provinsi induk; yang berakhir dan kab lain tersaring", () => {
  assert.deepEqual(skBerlaku(SK, "1112", "2026-10-10").map(k => k.nomor), ["a", "c"]);
  assert.deepEqual(skBerlaku(SK, "1112", "2026-10-25").map(k => k.nomor), ["c"]);
  assert.deepEqual(skBerlaku(SK, "1201", "2026-10-10"), []);
  assert.deepEqual(skBerlaku(null, "1112", "2026-10-10"), []);
});
test("sisaHari", () => { assert.equal(sisaHari(SK[0], "2026-10-10"), 10); assert.equal(sisaHari(SK[2], "2026-10-10"), null); });
test("tindakan per status: tanggap memuat siaga, transisi punya perbaikan awal sosial ekonomi", () => {
  assert.equal(tindakan("Siaga Darurat").length, 6);
  assert.ok(tindakan("Siaga Darurat").every(t => tindakan("Tanggap Darurat").includes(t)));
  assert.ok(tindakan("Tanggap Darurat").includes("Perbaikan prasarana vital"));
  assert.ok(tindakan("Transisi Darurat ke Pemulihan").includes("Perbaikan awal sosial ekonomi"));
  assert.deepEqual(tindakan("Ngawur"), []);
});
test("kalimatRingkas jujur bila akar tak ada", () => {
  assert.equal(kalimatRingkas(undefined, String), null);
  assert.match(kalimatRingkas({kab_lewat_batas: 232, kab_total: 453, prov_lewat_batas: 1, prov_total: 4}, String), /232 dari 453/);
});
test("kalimatRingkas memakai jeda_n bila ada", () => {
  assert.match(kalimatRingkas({kab_lewat_batas: 1, kab_total: 2, prov_lewat_batas: 0, prov_total: 1, jeda_median_hari: 13, jeda_n: 140}, String), /jeda median 13 hari dari 140 SK yang punya pasangan kejadian DIBI/);
});
test("rentang sinyal dan label saran: 'hari ini' hanya bila sinyal = hari WIB", () => {
  assert.equal(rentang("2026-10-12", "2026-10-19"), "12 sampai 19 Okt 2026");
  assert.equal(labelSaran({sinyal_dari: "2026-10-12", sinyal_sampai: "2026-10-19"}, "2026-10-31"), "Saran status (sinyal 12 sampai 19 Okt 2026)");
  assert.equal(labelSaran({sinyal_dari: "2026-10-31", sinyal_sampai: "2026-10-31"}, "2026-10-31"), "Saran status hari ini");
  assert.equal(labelSaran({}, "2026-10-31"), "Saran status");
});
test("judul saran: hipotesis dipisah, basi tidak dihitung", () => {
  const c = hitungSaran([{kd: "1", basi: false}, {kd: "1", basi: false}, {kd: "2", hipotesis: true}, {kd: "3", basi: true}]);
  assert.deepEqual([c.tanpa, c.hip, c.kabTanpa, c.kabHip, c.basi], [2, 1, 1, 1, 1]);
  assert.equal(judulSaran(c, String), "2 saran tanpa hipotesis di 1 kab/kota dan 1 hipotesis kekeringan di 1 kab/kota");
});
test("tanpa SK menyebut tahun data; tanggal ISO dirapikan", () => {
  assert.equal(kalimatTanpaSK("X", [2025], "2026-10-31", t => "31 Okt 2026"), "Tidak ada SK di data BNPB 2025 yang berlaku untuk X pada 31 Okt 2026. Data 2026 belum masuk.");
  assert.equal(rapiTanggal("sampai 2026-10-12."), "sampai 12 Okt 2026.");
});
