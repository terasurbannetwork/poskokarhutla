/* KP-20: logika murni kartu titik pengungsian (public/bnpb/titik_pengungsian.js): basi K12, jiwa putaran terakhir, penanganan 409, badan POST, HTML tanpa kapital dan titik tengah. */
import test from "node:test";
import assert from "node:assert/strict";
import {basi, jiwaTerakhir, jiwaDari, pilihanTitik, tanggapBuat, badanBuat, kartuHtml, selisihHari} from "../../public/bnpb/titik_pengungsian.js";

test("basi: lebih dari 3 hari atau tanpa putaran; tutup tidak pernah basi", () => {
  const hi = "2026-11-15";
  assert.equal(basi({putaran_terakhir: "2026-11-12"}, hi), false);   // tepat 3 hari
  assert.equal(basi({putaran_terakhir: "2026-11-11"}, hi), true);
  assert.equal(basi({putaran_terakhir: null}, hi), true);
  assert.equal(basi({putaran_terakhir: null, tutup: "2026-11-10"}, hi), false);
  assert.equal(selisihHari("2026-11-12", hi), 3);
});

test("jiwa dari putaran terbaru titik itu saja", () => {
  const c = (id, tgl, o) => ({data: {titik_id: id, tgl_data: tgl, ...o}});
  const daftar = [c("TP-AAAAAAAA", "2026-11-10", {bayi_l: 5}), c("TP-AAAAAAAA", "2026-11-14", {bayi_l: 2, dewasa_p: 8, yatim_bayi_l: 99}), c("TP-BBBBBBBB", "2026-11-15", {anak_l: 100})];
  assert.deepEqual(jiwaTerakhir("TP-AAAAAAAA", daftar), {tgl: "2026-11-14", jiwa: 10});
  assert.equal(jiwaTerakhir("TP-CCCCCCCC", daftar), null);
  assert.equal(jiwaDari({}), 0);
});

test("pilihan titik: terbuka saja, ditambah titik catatan yang sedang diubah", () => {
  const t = [{id: "TP-1", tutup: null}, {id: "TP-2", tutup: "2026-11-01"}, {id: "TP-3", tutup: "2026-11-02"}];
  assert.deepEqual(pilihanTitik(t), ["TP-1"]);
  assert.deepEqual(pilihanTitik(t, "TP-2"), ["TP-1", "TP-2"]);
});

test("tanggapan 409 dengan dekat meminta konfirmasi; galat lain jadi pesan", () => {
  assert.equal(tanggapBuat({ok: true, s: 201, j: {titik: {id: "TP-1"}}}).jenis, "ok");
  const d = tanggapBuat({ok: false, s: 409, j: {galat: "x", dekat: [{id: "TP-1", nama: "A", jarak_m: 50}]}});
  assert.equal(d.jenis, "dekat"); assert.equal(d.dekat.length, 1);
  assert.deepEqual(tanggapBuat({ok: false, s: 409, j: {galat: "titik sudah ditutup"}}), {jenis: "galat", pesan: "titik sudah ditutup"});
  assert.equal(tanggapBuat({ok: false, s: 0, j: {}}).jenis, "galat");
});

test("badan POST: koma desimal, pasangan koordinat, paksa", () => {
  const v = {nama: "  Balai  Desa ", jenis_tempat: "terkonsentrasi", lat: "-6,597998", lon: "106,797429", buka: "2026-11-15", kejadian_id: ""};
  assert.deepEqual(badanBuat(v).badan, {nama: "Balai Desa", jenis_tempat: "terkonsentrasi", lat: -6.597998, lon: 106.797429, buka: "2026-11-15"});
  assert.equal(badanBuat(v, true).badan.paksa, true);
  assert.ok(badanBuat({...v, lon: ""}).galat);
  assert.ok(badanBuat({...v, nama: "a"}).galat);
  assert.ok(badanBuat({...v, jenis_tempat: ""}).galat);
  assert.equal("lat" in badanBuat({nama: "Lapangan", jenis_tempat: "tidak_terkonsentrasi"}).badan, false);
});

test("kartu: nama seksi, tanda basi, tombol tutup, konfirmasi dekat; tanpa titik tengah dan tanpa sumber", () => {
  const ik = new Proxy({}, {get: () => "<svg></svg>"}), esc = s => String(s ?? ""), pil = (s, t) => `<span>${t}</span>`;
  const h = kartuHtml({titik: [{id: "TP-AAAAAAAA", nama: "Balai Desa", jenis_tempat: "terkonsentrasi", putaran_terakhir: "2026-11-01", tutup: null}, {id: "TP-BBBBBBBB", nama: "Masjid", jenis_tempat: "tidak_terkonsentrasi", putaran_terakhir: "2026-11-14", tutup: "2026-11-15"}],
    catatan: [], hi: "2026-11-15", esc, IK: ik, tglF: s => s, ID: new Intl.NumberFormat("id-ID"), pil, bukaForm: true, dekat: [{nama: "A", jarak_m: 50}]});
  assert.match(h, /<h3>[^]*Titik pengungsian<\/h3>/);
  assert.match(h, /Basi/); assert.match(h, /data-tp-tutup="TP-AAAAAAAA"/); assert.doesNotMatch(h, /data-tp-tutup="TP-BBBBBBBB"/);
  assert.match(h, /Tetap buat titik baru\?/); assert.match(h, /data-tp-paksa/);
  assert.doesNotMatch(h, /·|ex-ft|Sumber:/);
});
