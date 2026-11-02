/* Fungsi murni layar /bnpb/operasi-lapangan (public/bnpb/operasi_lapangan_hitung.js). Jalan: node --test tests/bnpb/operasi_lapangan.test.mjs */
import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import "../../public/bnpb/operasi_lapangan_hitung.js";
const O = globalThis.OperasiLapangan;
const T = (registrasi, status, lat, lon, jam_utc = null, extra = {}) => ({registrasi, status, lat, lon, jam_utc, ...extra});
const DATA = {tanggal: "2026-11-02",
  base: [{id: "PNK"}, {id: "KTG"}],
  armada: [{registrasi: "PK-FPA", base_id: "PNK", status: "siap", sumber: "wa"}, {registrasi: "VH-L6T", base_id: "PNK", status: "tidak_siap"}, {registrasi: "VN-8416", base_id: "KTG", status: null}, {registrasi: "H-3217", base_id: "PNK", status: "operasi"}],
  temuan: [T("PK-FPA", "fs", -3, 114), T("PK-FPA", "clear", -3.5, 114.5), T("H-3217", "berasap_tipis", -0.1, 109.5), T("VN-8416", "fs", -2.8, 110.6, Date.parse("2026-11-02T06:00:00Z"), {luas_klaim_ha: 8})],
  gerak: [{registrasi: "VH-L6T", jenis: "berangkat", jam_utc: Date.parse("2026-11-02T02:05:00Z"), lat: -3.01, lon: 114.01, rujukan: "PK-FPA"}, {registrasi: "PK-FPA", jenis: "rencana", jam_utc: null}, {registrasi: "H-3217", jenis: "berangkat", jam_utc: Date.parse("2026-11-02T08:00:00Z")}]};

test("kelompok temuan per status dan warna status", () => {
  const k = O.kelompokTemuan(DATA.temuan); assert.deepEqual([k.fs.length, k.berasap.length, k.berasap_tipis.length, k.clear.length], [2, 0, 1, 1]);
  assert.equal(O.kelasTemuan("fs"), "ol-t-api"); assert.equal(O.kelasTemuan("berasap_tipis"), "ol-t-tipis"); assert.equal(O.kelasTemuan("clear"), "ol-t-clear");
  assert.equal(O.STATUS_TEMUAN.fs.bentuk, "segitiga"); assert.equal(O.STATUS_TEMUAN.clear.bentuk, "lingkaran");
  assert.equal(O.kelasArmada("tidak_siap"), "ol-s-tidak"); assert.equal(O.kelasArmada(null), "ol-s-belum"); assert.equal(O.namaArmada(undefined), "Belum ada laporan");
});
test("ringkasan: siap vs tidak siap vs belum lapor, sortie berangkat", () => {
  const r = O.ringkas(DATA); assert.deepEqual([r.siap, r.tidak, r.belum, r.armada, r.sortie, r.temuanTotal], [2, 1, 1, 4, 2, 4]);
});
test("segmen: tanpa jam masuk pagi, 12.00 WIB memisahkan pagi dan siang", () => {
  assert.equal(O.segmenJam(null), "pagi"); assert.equal(O.segmenJam(Date.parse("2026-11-02T04:59:00Z")), "pagi"); assert.equal(O.segmenJam(Date.parse("2026-11-02T05:00:00Z")), "siang");
  const p = O.saringSegmen(DATA, "pagi"), s = O.saringSegmen(DATA, "siang");
  assert.equal(p.gerak.length + s.gerak.length, DATA.gerak.length); assert.equal(p.temuan.length + s.temuan.length, DATA.temuan.length); assert.equal(O.saringSegmen(DATA, "nilai"), DATA);
});
test("data per base: armada, gerak, dan temuan oleh armada base itu", () => {
  const b = O.dataBase(DATA, "PNK"); assert.equal(b.armada.length, 3); assert.equal(b.temuan.length, 3); assert.equal(b.gerak.length, 3);
  assert.equal(O.dataBase(DATA, "KTG").temuan.length, 1);
});
test("garis rujukan: WB berkoordinat ke temuan patroli terdekat bukan clear; tanpa kecocokan tidak ada garis", () => {
  const g = O.garisRujukan(DATA); assert.equal(g.length, 1); assert.deepEqual(g[0].dari, [114, -3]); assert.deepEqual(g[0].ke, [114.01, -3.01]);
  assert.equal(O.garisRujukan({...DATA, gerak: [{...DATA.gerak[0], rujukan: "XX-000"}]}).length, 0);
});
test("angka dan tanggal gaya Indonesia, klaim pilot berlabel", () => {
  assert.equal(O.fmt(1234.5), "1.234,5"); assert.equal(O.fmt(null), "–"); assert.equal(O.tanggalIndo("2026-11-02"), "2 November 2026");
  assert.equal(O.klaimTeks({luas_klaim_ha: 0.2}), "klaim pilot ±0,2 ha"); assert.equal(O.klaimTeks({}), "");
  assert.equal(O.jamWIB(Date.parse("2026-11-02T01:28:00Z")), "08:28 WIB"); assert.equal(O.hariIniWIB(Date.parse("2026-11-01T18:00:00Z")), "2026-11-02");
});
test("cincin jelajah: jarak titik ke pusat sama dengan jari-jari", () => {
  const c = O.cincin(0, 110, 60, 8); assert.equal(c.length, 9); const [lo, la] = c[2]; assert.ok(Math.abs(Math.hypot(lo - 110, la) * 60 - 60) < 1, "kira-kira 60 mil laut");
});
test("halaman tanpa skrip/gaya inline dan tanpa tanda pemisah titik tengah", () => {
  const html = readFileSync(new URL("../../public/bnpb/operasi_lapangan.html", import.meta.url), "utf8");
  assert.doesNotMatch(html, /<script(?![^>]*\ssrc=)/); assert.doesNotMatch(html, /\sstyle=|\son\w+=/);
  for (const f of ["operasi_lapangan.js", "operasi_lapangan_hitung.js", "operasi_lapangan.css"]) assert.doesNotMatch(readFileSync(new URL("../../public/bnpb/" + f, import.meta.url), "utf8"), /·/, f);
  assert.doesNotMatch(readFileSync(new URL("../../public/bnpb/operasi_lapangan.js", import.meta.url), "utf8"), /innerHTML/);
});
