/* Status Lifeline LF-05 (RENCANA-UJI T2, T4): rute baca kisi, sel, tetapkan; hak per peran; 503 tanpa migrasi; laju. worker.js utuh di Miniflare + D1.
   Jalankan: node --test tests/warga/lifeline_rute.test.mjs */
import {test as uji} from "node:test";
import assert from "node:assert/strict";
import {mulai} from "./_siklus.mjs";

const U = await mulai("uji-lf-rute");
const {DB, GET, POST, n} = U;
const [PD, KO, PM] = [await U.staf("Pd Lf", ["pusdalops"]), await U.staf("Ko Lf", ["koordalops"]), await U.staf("Pm Lf", ["pimpinan"])];
const BP = await U.bp(), BP2 = await U.bp({kab: "Garut"}), {SA, TAMU} = U;
const KJ = await U.kej(KO);   // kab 3201
await DB.prepare("INSERT INTO sk_kejadian_kab (kejadian_id, kab4, mulai, dibuat) VALUES (?, '3205', '2026-03-02', ?)").bind(KJ, Date.now()).run();
const L = `/kejadian/${KJ}/lifeline`, CAT = "PLN melaporkan jaringan sudah menyala kembali";

uji("T2 kisi: tiap kab x 8 layanan abu, usulan dihitung dan di-cache; sel tanpa pindai ulang dalam 15 menit", async () => {
  const r = await GET(KO, L); assert.equal(r.s, 200, r.t);
  assert.deepEqual(r.j.kab.map(k => k.kab4), ["3201", "3205"]);
  for (const k of r.j.kab) { assert.equal(Object.keys(k.layanan).length, 8); for (const s of Object.values(k.layanan)) { assert.equal(s.warna, "abu"); assert.equal(s.basi, false); assert.ok(s.usulan, "usulan terhitung"); } }
  assert.equal(await n("lf_usulan"), 16);
  const t0 = (await DB.prepare("SELECT min(dihitung) t FROM lf_usulan").first()).t;
  assert.equal((await GET(PD, L)).s, 200);
  assert.equal((await DB.prepare("SELECT min(dihitung) t FROM lf_usulan").first()).t, t0, "tidak dihitung ulang");
  const simpan = (await DB.prepare("SELECT * FROM lf_usulan").all()).results;
  await DB.prepare("DELETE FROM lf_usulan").run();
  assert.equal((await GET(KO, L)).s, 200); assert.equal(await n("lf_usulan"), 0, "penanda 15 menit: GET berikutnya tidak menghitung ulang");
  for (const r of simpan) await DB.prepare("INSERT INTO lf_usulan (kejadian_id, kab4, layanan, warna, alasan, isyarat, dihitung) VALUES (?, ?, ?, ?, ?, ?, ?)").bind(r.kejadian_id, r.kab4, r.layanan, r.warna, r.alasan, r.isyarat, r.dihitung).run();
  assert.equal((await GET(TAMU, L)).s, 401);
  assert.equal((await GET(KO, `/kejadian/KJ-2026-ZZZZZZZZ/lifeline`)).s, 404);
});

uji("T2 tetapkan: bukti atau catatan wajib, nomor telepon ditolak, status tampil di kisi dan sel, basi >24 jam", async () => {
  const dasar = {kab4: "3201", layanan: "listrik"};
  for (const b of [{...dasar, warna: "kuning"}, {...dasar, warna: "kuning", catatan: "pendek"}, {...dasar, warna: "kuning", catatan: "Hubungi petugas di 0812-3456-7890 untuk info"},
    {...dasar, warna: "kuning", catatan: "Hubungi petugas di +62 812 3456 7890 untuk info"}, {...dasar, warna: "ungu", catatan: CAT}, {kab4: "99", warna: "abu", layanan: "air"}, {...dasar, layanan: "x", warna: "abu"}]) {
    const r = await POST(KO, L, b); assert.equal(r.s, 400, JSON.stringify(b) + r.t);
  }
  assert.equal(await n("lf_riwayat"), 0);
  for (const c of ["Gangguan 3 gardu, 12 tiang roboh, 5 trafo rusak di wilayah", "Info\u202e kontak 0812\u200b3456\u00007890 segera ya"]) {
    const r = await POST(KO, L, {...dasar, layanan: "pangan", warna: "kuning", catatan: c}); assert.equal(r.s, c.startsWith("Info") ? 400 : 201, c + r.t);
  }
  const ok = await POST(KO, L, {...dasar, warna: "hijau", catatan: CAT}); assert.equal(ok.s, 201, ok.t);
  assert.equal((await POST(KO, L, {...dasar, warna: "merah", bukti: [{sumber: "klien", kode: "x"}]})).s, 400);
  assert.equal((await POST(KO, L, {kab4: "3202", layanan: "air", warna: "abu"})).s, 404, "kab bukan bagian kejadian");
  const k = await GET(PD, L); assert.equal(k.j.kab[0].layanan.listrik.warna, "hijau"); assert.equal(k.j.kab[0].layanan.listrik.basi, false);
  await DB.prepare("UPDATE lf_status SET diubah = diubah - 25 * 3600000").run();
  assert.equal((await GET(PD, L)).j.kab[0].layanan.listrik.basi, true, "lewat 24 jam");
  const s = await GET(KO, `${L}/sel?kab4=3201&layanan=listrik`); assert.equal(s.s, 200, s.t);
  assert.equal(s.j.status.warna, "hijau"); assert.equal(s.j.status.basi, true); assert.ok(s.j.status.oleh); assert.equal(s.j.riwayat.length, 1); assert.ok(s.j.usulan.isyarat);
  assert.equal((await GET(KO, `${L}/sel?kab4=3201&layanan=x`)).s, 400);
  assert.equal((await GET(KO, `${L}/sel?kab4=3202&layanan=air`)).s, 404);
});

uji("T4 hak: pimpinan baca saja dan tanpa oleh; BPBD hanya kab wilayahnya (luar = 404 sama dengan tidak ada)", async () => {
  assert.equal((await POST(PM, L, {kab4: "3201", layanan: "air", warna: "abu"})).s, 403);
  const s = await GET(PM, `${L}/sel?kab4=3201&layanan=listrik`); assert.equal(s.s, 200);
  assert.ok(!("oleh" in s.j.status) && s.j.riwayat.every(r => !("oleh" in r)), "pimpinan tanpa oleh");
  assert.doesNotMatch(s.t, /"oleh"/);
  const sa = await GET(SA, `${L}/sel?kab4=3201&layanan=listrik`); assert.ok(sa.j.status.oleh);
  const k = await GET(BP, L); assert.equal(k.s, 200); assert.deepEqual(k.j.kab.map(x => x.kab4), ["3201"]);
  assert.doesNotMatch((await GET(BP, `${L}/sel?kab4=3201&layanan=listrik`)).t, /"oleh"/);
  const luar = await GET(BP, `${L}/sel?kab4=3205&layanan=listrik`), ngawur = await GET(BP, `/kejadian/KJ-2026-ZZZZZZZZ/lifeline`);
  assert.equal(luar.s, 404); assert.equal(luar.t, ngawur.t, "byte sama dengan tidak ada");
  assert.equal((await POST(BP, L, {kab4: "3205", layanan: "air", warna: "abu"})).s, 404);
  assert.equal(await n("lf_riwayat", "kab4 = '3205'"), 0);
  assert.equal((await POST(BP, L, {kab4: "3201", layanan: "air", warna: "kuning", catatan: "Genangan menutup pompa PDAM Cibinong"})).s, 201);
  assert.equal((await GET(BP2, L)).j.kab.map(x => x.kab4).join(), "3205", "BPBD kab lain melihat kabnya sendiri");
  assert.match((await DB.prepare("SELECT oleh FROM lf_riwayat WHERE layanan = 'air'").first()).oleh, /^instansi:/);
});

uji("laju: tulisan per akun dibatasi (429)", async () => {
  const R = await U.staf("Laju Lf", ["pusdalops"]); let akhir;
  for (let i = 0; i < 61; i++) akhir = await POST(R, L, {kab4: "3205", layanan: "bbm", warna: "abu"});
  assert.equal(akhir.s, 429, akhir.t);
});

uji("503 jelas bila migrasi Lifeline belum terapan (tabel hilang), bukan 500", async () => {
  const S = await mulai("uji-lf-503"), ko = await S.staf("Ko 503", ["koordalops"]), id = await S.kej(ko);
  await S.DB.prepare("DROP TABLE lf_usulan").run(); await S.DB.prepare("DROP TABLE lf_riwayat").run();
  const g = await S.GET(ko, `/kejadian/${id}/lifeline`); assert.equal(g.s, 503, g.t); assert.match(g.t, /Lifeline belum diaktifkan/);
  const p = await S.POST(ko, `/kejadian/${id}/lifeline`, {kab4: "3201", layanan: "air", warna: "abu"}); assert.equal(p.s, 503, p.t);
  assert.equal((await S.GET(ko, `/kejadian/${id}/lifeline/sel?kab4=3201&layanan=air`)).s, 503);
});
