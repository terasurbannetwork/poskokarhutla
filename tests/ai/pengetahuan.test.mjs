/* Layar Pengetahuan /ai (PETA-FITUR §2.2): fungsi murni unggah/status dan keselarasan index.html dengan ai.js. Tanpa DOM, tanpa jaringan. */
import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {penjaga, tungguStatus, validasiUnggah, fmtUkuran, ekstensi, labelStatus, statusAkhir, teksStatus, alamatUnggah, formatSumber, JENIS_BAWAAN, MAKS_BERKAS_BAWAAN} from "../../public/ai/ai.js";

const AKAR = new URL("../../", import.meta.url);
const baca = f => readFileSync(new URL(f, AKAR), "utf8");

test("validasiUnggah langkah 1 MENOLAK jenis, ukuran, dan berkas kosong dengan pesan yang menyebut angkanya", () => {
  const g = (d, o) => validasiUnggah(d, o).galat.berkas;
  assert.equal(validasiUnggah({berkas: "laporan.pdf", ukuran: 10}).ok, false);
  assert.match(g({berkas: "laporan.pdf", ukuran: 10}), /tidak didukung.*txt, md, csv, json, docx, pptx, xlsx/);
  assert.match(g({berkas: "tanpa-ekstensi", ukuran: 10}), /tidak didukung/);
  assert.equal(g({berkas: "a.txt", ukuran: 0}), "Berkas kosong.");
  assert.equal(g({berkas: "a.txt", ukuran: 3 * 1048576}), "Berkas 3 MB melebihi batas 2 MB.");
  assert.equal(g({berkas: "", ukuran: 0}), "Pilih satu berkas dulu.");
  assert.equal(validasiUnggah({berkas: "A.DOCX", ukuran: MAKS_BERKAS_BAWAAN}).ok, true, "huruf besar sah, tepat di batas sah");
  assert.equal(g({berkas: "a.txt", ukuran: 5000}, {jenis: ["txt"], maks: 4096}), "Berkas 4,9 KB melebihi batas 4 KB.", "batas dari server dipakai");
});

test("validasiUnggah langkah 2: nama 3 sampai 120 karakter, deskripsi 500, visibilitas sah", () => {
  const ok = {berkas: "a.txt", ukuran: 5, nama: "Panduan", deskripsi: "", visibilitas: "unit"};
  assert.deepEqual(validasiUnggah(ok), {ok: true, galat: {}});
  assert.equal(validasiUnggah({...ok, nama: "ab"}).galat.nama, "Nama harus 3 sampai 120 karakter, sekarang 2 karakter.");
  assert.match(validasiUnggah({...ok, nama: "x".repeat(121)}).galat.nama, /sekarang 121 karakter/);
  assert.ok(validasiUnggah({...ok, deskripsi: "x".repeat(501)}).galat.deskripsi);
  for (const v of ["publik", "toString", "__proto__", undefined]) assert.ok(validasiUnggah({...ok, visibilitas: v}).galat.visibilitas, String(v));
  assert.equal(validasiUnggah({berkas: "a.txt", ukuran: 5, nama: undefined}).ok, true, "langkah 1 tidak memeriksa isian langkah 2");
});

test("ekstensi, fmtUkuran, status", () => {
  assert.equal(ekstensi("Rencana.Final.XLSX"), "xlsx"); assert.equal(ekstensi("x"), ""); assert.equal(ekstensi(null), "");
  assert.equal(fmtUkuran(512), "512 B"); assert.equal(fmtUkuran(1536), "1,5 KB"); assert.equal(fmtUkuran(2 * 1048576), "2 MB"); assert.equal(fmtUkuran("abc"), "");
  assert.deepEqual(["antre", "diproses", "selesai", "gagal", "toString", null].map(labelStatus), ["Antre", "Diproses", "Selesai", "Gagal", "Tidak diketahui", "Tidak diketahui"]);
  assert.deepEqual(["antre", "diproses", "selesai", "gagal"].map(statusAkhir), [false, false, true, true]);
  assert.equal(teksStatus({status: "gagal", galat: "berkas tidak ada di penyimpanan"}), "Gagal: berkas tidak ada di penyimpanan");
  assert.equal(teksStatus({status: "gagal"}), "Gagal: alasan tidak disebut");
  assert.equal(teksStatus({status: "selesai", potongan: 12}), "Selesai, 12 potongan");
  assert.equal(teksStatus({status: "antre"}), "Antre");
});

test("alamatUnggah menaruh metadata di query dan meng-encode nama", () => {
  const u = new URL("https://x" + alamatUnggah({berkas: "a b&c.txt", nama: " Panduan & Aturan ", deskripsi: "", visibilitas: "semua"}));
  assert.equal(u.pathname, "/api/ai/pengetahuan");
  assert.equal(u.searchParams.get("berkas"), "a b&c.txt"); assert.equal(u.searchParams.get("nama"), "Panduan & Aturan");
  assert.equal(u.searchParams.get("visibilitas"), "semua");
  assert.deepEqual(JENIS_BAWAAN, ["txt", "md", "csv", "json", "docx", "pptx", "xlsx"]);
});

test("formatSumber: kutipan berkas pengetahuan tampil sebagai Berkas, alat tetap seperti semula", () => {
  assert.equal(formatSumber({berkas: "Panduan", ringkas: "pasal 3", tanggal: "2026-11-04"}), "Berkas Panduan: pasal 3, diunggah 4 Nov 2026");
  assert.equal(formatSumber({berkas: "Panduan"}), "Berkas Panduan");
  assert.equal(formatSumber({alat: "cuaca", berkas: "x"}), "Cuaca, tanggal data tidak disebut");
});

test("index.html memuat setiap id yang dipakai ai.js, tanpa id ganda", () => {
  const html = baca("public/ai/index.html"), js = baca("public/ai/ai.js");
  const ada = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]));
  assert.equal(ada.size, [...html.matchAll(/\bid="([^"]+)"/g)].length, "id ganda di index.html");
  const dipakai = new Set([...js.matchAll(/\$\("#([A-Za-z0-9_]+)"\)/g)].map(m => m[1]));
  for (const id of dipakai) assert.ok(ada.has(id), `ai.js memakai #${id} yang tidak ada di index.html`);
  for (const id of ["aiPengView", "aiPengTabel", "aiUnggah", "aiSumberDaftar", "aiSumberGalat"]) assert.ok(dipakai.has(id), id);
  assert.match(html, /<a href="#pengetahuan">Pengetahuan<\/a>/);
});

test("ai.js: data berkas hanya lewat textContent, alasan 409 pemasangan dan kegagalan indeks tampil", () => {
  const js = baca("public/ai/ai.js");
  const blok = js.slice(js.indexOf("/* ---------- pengetahuan ---------- */"), js.indexOf("/* ---------- formulir agen ---------- */"));
  assert.ok(blok.length > 1000, "blok pengetahuan ditemukan");
  assert.doesNotMatch(blok, /innerHTML|\bhtml:/, "nama berkas dan alasan tidak boleh masuk innerHTML");
  assert.match(js, /\/api\/ai\/agen\/\$\{encodeURIComponent\(id\)\}\/sumber/);
  assert.match(js, /Agen tersimpan, tetapi pengetahuan belum terpasang: \$\{er\.message\}/, "alasan 409 dari server ditampilkan utuh");
  assert.match(js, /Pengindeksan gagal: \$\{x\.galat/, "alasan gagal indeks ditampilkan");
  assert.match(blok, /nanti\(async/, "unggah dikirim sesudah frame tercat");
  assert.doesNotMatch(js, /·|&middot;/);
});

const tanpaTidur = () => Promise.resolve();

test("penjaga: hanya angkatan terakhir yang sah", () => {
  const p = penjaga(), a = p.maju(), b = p.maju();
  assert.equal(p.sah(a), false, "angkatan lama basi"); assert.equal(p.sah(b), true);
});

test("tungguStatus: berhenti di selesai/gagal, berhenti saat dibatalkan, dan batas percobaan", async () => {
  const urut = ["antre", "diproses", "selesai"]; let i = 0; const tampil = [];
  const x = await tungguStatus(async () => ({status: urut[i++]}), {tidur: tanpaTidur, tampilkan: r => tampil.push(r.status)});
  assert.equal(x.status, "selesai"); assert.deepEqual(tampil, urut);
  assert.equal((await tungguStatus(async () => ({status: "gagal", galat: "z"}), {tidur: tanpaTidur})).galat, "z");
  let n = 0, buka = true;
  assert.equal(await tungguStatus(async () => { if (++n === 2) buka = false; return {status: "antre"}; }, {tidur: tanpaTidur, sah: () => buka}), null, "dibatalkan di tengah jalan");
  assert.equal(n, 2, "tidak memanggil lagi sesudah batal");
  let t = 0;
  assert.equal(await tungguStatus(async () => ({status: "antre"}), {tidur: tanpaTidur, maks: 4, tampilkan: () => t++}), null, "lewat batas");
  assert.equal(t, 4);
});

test("tungguStatus: galat sesaat dimaafkan, 3 galat beruntun dilempar", async () => {
  let n = 0;
  const x = await tungguStatus(async () => { n++; if (n <= 2) throw new Error("putus"); return {status: "selesai"}; }, {tidur: tanpaTidur});
  assert.equal(x.status, "selesai", "dua galat lalu pulih");
  n = 0;
  await assert.rejects(tungguStatus(async () => { n++; throw new Error("putus " + n); }, {tidur: tanpaTidur}), /putus 3/);
  n = 0;
  const seling = async () => { n++; if (n % 2) throw new Error("x"); return {status: n > 6 ? "selesai" : "antre"}; };
  assert.equal((await tungguStatus(seling, {tidur: tanpaTidur})).status, "selesai", "galat tidak beruntun tidak menyerah");
});

test("ai.js: unggah dibatalkan saat dialog ditutup, polling indeks ulang tunggal, muat basi diabaikan", () => {
  const js = baca("public/ai/ai.js");
  assert.match(js, /U\.addEventListener\("close", \(\) => \{ genU\.maju\(\); xhrU\?\.abort\(\)/);
  assert.match(js, /if \(diikuti\.has\(id\)\) return;/); assert.match(js, /finally \{ diikuti\.delete\(id\)/);
  assert.match(js, /urutSumber\.sah\(g\)\) return;/);
  assert.match(js, /Promise\.all\(\[S\.alat \? null/);
  assert.match(js, /bacaTanda\(\)\) tulisTanda\(false\); ok\(j\)/, "XHR sukses menghapus tanda alih seperti api()");
});
