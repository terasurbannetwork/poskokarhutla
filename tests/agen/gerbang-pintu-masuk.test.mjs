// Gerbang PM-01 paket Pintu Masuk (data/kajian-bnpb/pintu-masuk/RENCANA-UJI.md §2, G-1..G-7).
// Berkas paket belum ada = tidak ada pelanggaran; gerbang mulai menggigit begitu berkasnya lahir.
// Tiap aturan = fungsi murni (teks -> daftar pelanggaran), diuji mode-gagalnya, lalu dipindaikan ke berkas nyata.
// Semua heuristik regex: menangkap bentuk lazim, bukan pembuktian; batasnya ditulis di tiap aturan.
import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync, readdirSync, existsSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {PUBLIK_TANPA_SESI} from "../../src/worker.js";

const AKAR = fileURLToPath(new URL("../../", import.meta.url));
const FIX = JSON.parse(readFileSync(new URL("./fixtures/pintu_masuk.json", import.meta.url), "utf8"));
const RUJUK = "Lihat data/kajian-bnpb/pintu-masuk/ (PRD Larangan, RENCANA-UJI §2).";
const baca = r => readFileSync(AKAR + r, "utf8");
const ls = (dir, re) => existsSync(AKAR + dir) ? readdirSync(AKAR + dir).filter(f => re.test(f)).map(f => `${dir}/${f}`) : [];
const srcMasuk = () => ls("src", /^masuk.*\.js$/);
const publikMasuk = () => [...ls("public", /^masuk\./), "public/admin/aktivasi.js", "public/inti/undang.js"].filter(r => existsSync(AKAR + r));
const ujiMasuk = () => ls("tests/warga", /^masuk.*\.test\.mjs$/);

// G-1: console.* yang argumennya memuat identifier kode. Batas: literal string dibuang dulu (kata "kode" di dalam
// teks pesan tidak dihitung), isi ${...} dalam template tetap dihitung; alias console atau log lewat fungsi
// pembungkus tidak terlihat. Nama yang dicurigai: kode, otp, pesan, sandi, token (awalan).
export function g1(teks) {
  const salah = [];
  const re = /\bconsole\s*\.\s*(?:log|error|warn|info|debug)\s*\(/g;
  for (const m of teks.matchAll(re)) {
    let i = m.index + m[0].length, d = 1, j = i;
    for (; j < teks.length && d > 0; j++) { const c = teks[j]; if (c === "(") d++; else if (c === ")") d--; }
    const arg = teks.slice(i, j - 1)
      .replace(/`((?:\\.|[^`\\])*)`/gs, (_, t) => [...t.matchAll(/\$\{([^}]*)\}/g)].map(x => x[1]).join(" "))
      .replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g, "");
    if (/\b(kode|otp|pesan|sandi|token)\w*\b/i.test(arg)) salah.push(`console memuat variabel kode: ${m[0]}${arg.trim().slice(0, 40)}...`);
  }
  return salah;
}

// G-2: impor ./wa.js (statis, dinamis, atau require). Batas: jalur lain ke wa.js (mis. ../src/wa.js) tidak ditangkap.
export const g2 = teks => /(?:\bfrom|\bimport|\brequire\s*\()\s*\(?\s*["']\.\/wa(?:\.js)?["']/.test(teks) ? ["mengimpor ./wa.js"] : [];

// G-3: kata dummy / emoji 🧪 🧹 / "isi/hapus" / "data contoh" (pola yang dipakai src/alun.js dan public/admin/alun.js).
export const g3 = teks => [...teks.matchAll(/dummy|🧪|🧹|\bisi\/hapus\b|data contoh|kode contoh/gi)].map(m => `pola data contoh: "${m[0]}"`);

// G-4: kunci PUBLIK_TANPA_SESI = beku + paling banyak yang diizinkan K8; tiap entri beralasan.
export function g4(entri, fix) {
  const salah = [], izin = new Set([...fix.beku, ...fix.boleh_tambah_k8]);
  const kunci = entri.map(([k]) => k);
  for (const k of kunci) if (!izin.has(k)) salah.push(`entri baru ${k} tanpa keputusan pemilik`);
  for (const k of fix.beku) if (!kunci.includes(k)) salah.push(`entri beku ${k} hilang`);
  for (const [k, a] of entri) if (typeof a !== "string" || !a.trim()) salah.push(`entri ${k} tanpa alasan`);
  return salah;
}

// G-5: nomor WA Indonesia (62 8 + 7-12 digit, atau 08 + 7-12 digit) selain awalan 62800. Batas: nomor yang
// ditulis dengan spasi/tanda hubung atau disusun dari potongan string tidak terlihat.
export const g5 = teks => [...teks.matchAll(/(?<!\d)(?:628\d{7,12}|08\d{7,12})(?!\d)/g)]
  .filter(m => !m[0].startsWith("62800")).map(m => `nomor nyata mungkin: ${m[0]}`);

// G-6: konstanta ambang di luar masuk_konst.js. Batas: hanya `const NAMA_KAPITAL = ...angka...` dan
// literal pasangan `[[JAM, 5]]`; ambang tersembunyi di dalam fungsi atau nama huruf kecil lolos.
export function g6(teks) {
  const salah = [];
  for (const l of teks.split("\n")) {
    if (/^\s*(?:export\s+)?const\s+[A-Z][A-Z0-9_]*\s*=[^;]*\d/.test(l)) salah.push(`konstanta angka: ${l.trim().slice(0, 60)}`);
    if (/\[\[\s*[A-Za-z_]\w*\s*,\s*\d+\s*\]/.test(l)) salah.push(`batas laju literal: ${l.trim().slice(0, 60)}`);
  }
  return salah;
}

// G-7: tulis ke tabel akun/sesi modul lain. Batas: nama tabel yang disusun dinamis tidak terlihat.
const TABEL = "staf|instansi_akun|staf_sesi|instansi_sesi|pdt_sesi|km_sesi|pemirsa_sesi|pemirsa";
export const g7 = teks => [...teks.matchAll(new RegExp(String.raw`\b(?:INSERT\s+(?:OR\s+\w+\s+)?INTO|UPDATE(?:\s+OR\s+\w+)?|DELETE\s+FROM|REPLACE\s+INTO)\s+(?:${TABEL})\b`, "gi"))]
  .map(m => `menulis tabel modul lain: ${m[0]}`);

const pindai = (berkas, fn, aturan, akibat, perbaiki) => {
  const salah = berkas.flatMap(r => fn(baca(r)).map(s => `${r}: ${s}`));
  assert.deepEqual(salah, [], `${aturan} dilanggar. Akibat: ${akibat}. Perbaiki: ${perbaiki}. ${RUJUK}`);
};

test("G-1 mode gagal: console memuat kode ditolak, console biasa lolos", () => {
  assert.equal(g1("console.log('kirim', kode)").length, 1);
  assert.equal(g1("console.error(`gagal ${otp}`)").length, 1);
  assert.equal(g1("console.warn(e, pesan.isi)").length, 1);
  assert.deepEqual(g1("console.log('kode salah')"), []);
  assert.deepEqual(g1("console.error('gagal', e.message)"), []);
});
test("G-1 berkas nyata: src/masuk*.js tidak mencatat kode ke log", () =>
  pindai(srcMasuk(), g1, "G-1", "kode sekali pakai bocor ke log Worker dan siapa pun yang membacanya bisa masuk sebagai orang lain", "hapus variabel kode dari console.*; catat hanya hasil (ok/gagal) tanpa nilainya"));

test("G-2 mode gagal: impor ./wa.js ditolak", () => {
  assert.equal(g2('import {x} from "./wa.js";').length, 1);
  assert.equal(g2("const m = await import('./wa');").length, 1);
  assert.deepEqual(g2('import {x} from "./hak.js";'), []);
});
test("G-2 berkas nyata: src/masuk*.js tidak memakai pembaca WA masuk", () =>
  pindai(srcMasuk(), g2, "G-2", "pintu masuk membaca pesan orang, melanggar K7 dan PRD", "kirim kode lewat antrean keluar saja; jangan impor ./wa.js"));

test("G-3 mode gagal: data contoh ditolak", () => {
  assert.equal(g3("if (a==='isi/hapus') {}").length, 1);
  assert.equal(g3('<button>🧪 Isi</button>').length, 1);
  assert.equal(g3("// dummy").length, 1);
  assert.deepEqual(g3("const a = 1;"), []);
});
test("G-3 berkas nyata: paket tanpa isi/hapus data contoh", () =>
  pindai([...srcMasuk(), ...publikMasuk()], g3, "G-3", "melanggar aturan pemilik 11 Nov 2026 (tanpa data dummy dan tombol 🧪/🧹)", "buang rute dan tombol contoh itu"));

test("G-4 mode gagal: entri baru, entri hilang, alasan kosong ditolak", () => {
  const dasar = FIX.beku.map(k => [k, "alasan jelas"]);
  assert.deepEqual(g4(dasar, FIX), []);
  assert.deepEqual(g4([...dasar, ["/masuk", "pintu"], ["/alun-alun", "alun"]], FIX), []);
  assert.equal(g4([...dasar, ["/rahasia", "x"]], FIX).length, 1);
  assert.equal(g4(dasar.slice(1), FIX).length, 1);
  assert.equal(g4([...dasar.slice(1), [FIX.beku[0], " "]], FIX).length, 1);
});
test("G-4 berkas nyata: PUBLIK_TANPA_SESI tidak melebar di luar K8", () =>
  assert.deepEqual(g4([...PUBLIK_TANPA_SESI], FIX), [],
    `G-4 dilanggar. Akibat: halaman terbuka tanpa login bertambah diam-diam. Perbaiki: catat keputusan pemilik di KEPUTUSAN-MASUK.md dulu, baru tambahkan ke tests/agen/fixtures/pintu_masuk.json, dan beri alasan tiap entri. ${RUJUK}`));

test("G-5 mode gagal: nomor nyata ditolak, 62800 lolos", () => {
  assert.equal(g5("'6281234567890'").length, 1);
  assert.equal(g5("'081234567890'").length, 1);
  assert.deepEqual(g5("'628001234567' '62800999'"), []);
});
test("G-5 berkas nyata: uji masuk memakai nomor rekaan", () =>
  pindai(ujiMasuk(), g5, "G-5", "nomor orang sungguhan masuk repo publik (PDP)", "ganti dengan nomor rekaan berawalan 62800"));

test("G-6 mode gagal: konstanta ambang ditolak", () => {
  assert.equal(g6("const BATAS = 5 * MENIT;").length, 1);
  assert.equal(g6("const x = laju(db, [[JAM, 5]]);").length, 1);
  assert.deepEqual(g6("const BATAS = K.BATAS;\nconst a = 5;"), []);
});
test("G-6 berkas nyata: ambang hanya di masuk_konst.js", () =>
  pindai(["src/masuk.js", "src/masuk_undang.js"].filter(r => existsSync(AKAR + r)), g6, "G-6", "ambang tersebar sehingga ALGORITMA dan kode berpisah diam-diam", "pindahkan ke src/masuk_konst.js dan impor"));

test("G-7 mode gagal: tulis ke tabel modul lain ditolak", () => {
  assert.equal(g7("INSERT INTO staf (a) VALUES (1)").length, 1);
  assert.equal(g7("update km_sesi set x=1").length, 1);
  assert.equal(g7("DELETE FROM pemirsa WHERE 1").length, 1);
  assert.deepEqual(g7("INSERT INTO mk_kode (a) VALUES (1); SELECT * FROM staf"), []);
});
test("G-7 berkas nyata: src/masuk*.js tidak menulis tabel akun modul lain", () =>
  pindai(srcMasuk(), g7, "G-7", "akun produksi bergeser tanpa lewat modul pemiliknya (D2)", "panggil sesiUntuk/cabutSesi yang diekspor modul pemilik, jangan tulis tabelnya"));
