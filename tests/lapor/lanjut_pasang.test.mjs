/* LJ-14 sisi Worker: sumber `lapor_ai` di ingest modul (hanya tiket induk bpbd yang punya berkas, tanpa WA/nama/isi), kejadian_id dan kab4 berkas
   diisi dari tautan sk_kejadian_sumber hanya bila NULL (saat dibaca dan saat terima tutup), usulan fase di detail kejadian hanya untuk staf, fase tidak berubah.
   Paket data/kajian-bnpb/lapor-lanjutan. worker.js utuh di Miniflare + D1 sungguhan; nomor WA rekaan. Jalan: node --test tests/lapor/lanjut_pasang.test.mjs */
import {test as uji} from "node:test";
import assert from "node:assert/strict";
import {mulai} from "../warga/_siklus.mjs";
import {usulanFaseTutup} from "../../src/lapor_lanjut_spek.js";

const U = await mulai("uji-lj-pasang"), {DB, api, SA, GET, POST, n} = U;
const PD = await U.staf("Pd Pasang", ["pusdalops"]), BP = await U.bp();
const TOK = {authorization: "Bearer token-pipa-uji"}, T = Date.parse("2026-06-10T10:00:00+07:00"), WA = "6281299990001";
const NOMOR = "LA-260610-01", TANPA_BERKAS = "LA-260610-02", WARGA = "LA-260610-03", LUAR = "LA-260610-04";
const jalan = (sql, ...b) => DB.prepare(sql).bind(...b).run();
const sesi = (nomor, tingkat, kab = "32.01", jenis = "banjir") => jalan(`INSERT INTO lapor_sesi (id, wa, status, tingkat, jenis, kab, nomor, terkirim, kerja, rev, dibuat, diubah)
  VALUES (?, ?, 'terkirim', ?, ?, ?, ?, ?, '{"rahasia":"ISI LAPORAN"}', 0, ?, ?)`, "s" + nomor, WA, tingkat, jenis, kab, nomor, T, T, T);
const berkas = async (id, induk, kab, status = "terbuka", ditutup = null, kejadian = null) =>
  jalan("INSERT INTO lj_berkas (id, induk, kab, kejadian_id, status, isian, ditutup, dibuat, diubah) VALUES (?, ?, ?, ?, ?, '{}', ?, ?, ?)", id, induk, kab, kejadian, status, ditutup, T, T);
const modul = () => api("GET", "/api/siklus/ingest/modul?sumber=lapor_ai&dari=2026-06-01&sampai=2026-06-30", undefined, TOK);
const B1 = "a".repeat(16), B2 = "b".repeat(16);
let kid;

uji("ingest modul lapor_ai: hanya tiket induk bpbd yang punya berkas; kab dan prov terpetakan; tanpa WA, nama, atau isi laporan", async () => {
  kid = await U.kej(SA, {kab4: "3201", jenis: "banjir"});
  await sesi(NOMOR, "bpbd"); await berkas(B1, NOMOR, "32.01");
  await sesi(TANPA_BERKAS, "bpbd"); await sesi(WARGA, "warga"); await berkas(B2, WARGA, "32.01");   // bukan bpbd: tidak keluar walau ada berkas (tak mungkin di produksi, uji penjaga SQL)
  await sesi(LUAR, "bpbd", "99.99", "lainnya"); await berkas("c".repeat(16), LUAR, "99.99");   // wilayah dan jenis tak dikenal: dibuang item()
  const r = await modul(); assert.equal(r.s, 200, r.t);
  assert.deepEqual(r.j.baris, [{sumber: "lapor_ai", kode: NOMOR, jenis: "banjir", prov: "32", kab: "Bogor", mulai: "2026-06-10"}]);
  assert.doesNotMatch(r.t, /6281299990001|ISI LAPORAN|rahasia/);
  assert.equal((await api("GET", "/api/siklus/ingest/modul?sumber=lapor_ai&dari=2026-06-01&sampai=2026-06-30", undefined, {})).s, 401);
});

uji("berkas dibaca sebelum tertaut: kejadian_id NULL; sesudah pasang.py menempel (aksi tambah), pembacaan tim mengisi kejadian_id dan kab4 sekali, tidak menimpa", async () => {
  assert.equal((await DB.prepare("SELECT kejadian_id FROM lj_berkas WHERE id = ?").bind(B1).first()).kejadian_id, null);
  const t = await api("POST", "/api/siklus/ingest/kejadian", {keputusan: [{sumber: "lapor_ai", kode: NOMOR, aksi: "tambah", kejadian_id: kid, jenis: "banjir", kab4: "3201", mulai: "2026-06-10", diambil: T, dampak: null}]}, TOK);
  assert.equal(t.s, 200, t.t); assert.deepEqual([t.j.terpasang, t.j.baru], [1, 0]);
  const baris = await api("GET", "/api/siklus/ingest/modul?sumber=lapor_ai&dari=2026-06-01&sampai=2026-06-30", undefined, TOK); assert.equal(baris.s, 200);
  // pembacaan lewat jalur yang sama dengan tim: isiTautan dipicu berkasGet; di sini lewat bukaBerkas tidak perlu, cukup panggil fungsi hak yang dipakai pembaca
  const H = await import("../../src/hak.js");
  assert.equal((await H.ljIsiTautan({DB}, H.pelakuLjTim, B1)).meta.changes, 1);
  const b = await DB.prepare("SELECT kejadian_id, kab4, diubah FROM lj_berkas WHERE id = ?").bind(B1).first();
  assert.deepEqual([b.kejadian_id, b.kab4, b.diubah], [kid, "3201", T], "diubah tidak bergeser (penjaga usul tutup)");
  assert.equal((await H.ljIsiTautan({DB}, H.pelakuLjTim, B1)).meta.changes, 0, "sudah terisi: tidak ditimpa");
  await jalan("UPDATE lj_berkas SET kejadian_id = NULL WHERE id = ?", B2);   // tanpa tautan sk_kejadian_sumber untuk WARGA: tetap NULL
  assert.equal((await H.ljIsiTautan({DB}, H.pelakuLjTim, B2)).meta.changes, 0);
});

uji("usulan fase di detail kejadian: hanya staf, hanya berkas yang penutupannya sudah diterima; fase tidak berubah; BP tidak melihatnya", async () => {
  const beku = tgl => JSON.stringify({berkas: {id: B1}, penutupan: {tgl_selesai: tgl, status: "selesai"}, kondisi_akhir: {status: "selesai", alasan: [], belum_didata: []}});
  const d0 = await GET(PD, `/kejadian/${kid}`); assert.equal(d0.s, 200, d0.t); assert.equal(d0.j.usulan_fase, undefined, "berkas masih terbuka: tidak ada usulan");
  await jalan("UPDATE lj_berkas SET status = 'selesai', ditutup = ? WHERE id = ?", T + 5e3, B1);
  await jalan("INSERT INTO lj_beku (berkas, versi, isi, sidik, oleh, waktu) VALUES (?, 1, ?, ?, 'ketua', ?)", B1, beku("2026-06-12"), "d".repeat(64), T);
  const fase = (await GET(PD, `/kejadian/${kid}`)).j.kejadian.fase;
  const d = await GET(PD, `/kejadian/${kid}`);
  assert.deepEqual(d.j.usulan_fase, [{tiket: NOMOR, kab: "32.01", ke: "transisi", tanggap_akhir: "2026-06-12", dengan_catatan: false, yakin: "terverifikasi", status: "usulan"}]);
  assert.doesNotMatch(d.t, /6281299990001|ISI LAPORAN/);
  assert.equal(d.j.kejadian.fase, fase, "membaca usulan tidak mengubah fase"); assert.equal(await n("sk_jejak", "aksi LIKE 'fase%'"), 0);
  const bp = await GET(BP, `/kejadian/${kid}`); assert.ok(bp.s === 200 || bp.s === 404); if (bp.s === 200) assert.equal(bp.j.usulan_fase, undefined);
});

uji("usulanFaseTutup murni: catatan tanpa kondisi bernilai menunggu, kosong bukan nol; selesai_catatan dengan kondisi diusulkan; belum diterima null", () => {
  const beku = (alasan, tgl = "2026-06-12") => JSON.stringify({penutupan: {tgl_selesai: tgl}, kondisi_akhir: {alasan}});
  assert.equal(usulanFaseTutup({status: "usul_tutup", ditutup: null, beku: beku([])}), null);
  assert.equal(usulanFaseTutup({status: "selesai", ditutup: 1, beku: null}), null, "tanpa versi beku tidak ada tanggal selesai");
  const m = usulanFaseTutup({status: "selesai_catatan", ditutup: 1, beku: beku([{metrik: "hilang", nilai: null}])}); assert.deepEqual([m.status, m.kondisi], ["menunggu", null]);
  const u = usulanFaseTutup({status: "selesai_catatan", ditutup: 1, beku: beku([{metrik: "hilang", nilai: 2}, {metrik: "mengungsi", nilai: null}])});
  assert.deepEqual([u.status, u.dengan_catatan, u.kondisi], ["usulan", true, {hilang: 2, prasarana_putus: 0}], "mengungsi null dibuang, prasarana tak ada di alasan = 0");
});
