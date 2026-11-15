// Gerbang PM-01 paket Pintu Masuk (data/kajian-bnpb/pintu-masuk/RENCANA-UJI.md §2, G-1..G-8).
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
const TABEL = "staf|instansi_akun|staf_sesi|instansi_sesi|pdt_sesi|km_sesi|pemirsa_sesi|pemirsa|pdt_akun|km_akun|orang|relawan";
export const g7 = teks => [...teks.matchAll(new RegExp(String.raw`\b(?:INSERT\s+(?:OR\s+\w+\s+)?INTO|UPDATE(?:\s+OR\s+\w+)?|DELETE\s+FROM|REPLACE\s+INTO)\s+(?:${TABEL})\b`, "gi"))]
  .map(m => `menulis tabel modul lain: ${m[0]}`);

// G-8 (D19: pintu masuk tidak mengaktifkan, menonaktifkan, atau mengubah akun modul lain): fungsi di src/hak.js
// tidak menulis tabel AKUN modul lain. Tabel sesi (instansi_sesi, pdt_sesi, km_sesi, pemirsa_sesi) dan mk_*/alun_penulis sah.
// Cakupan fungsi, dua lapis yang tidak bergantung satu sama lain:
//   (1) nama: tiap deklarasi kolom-0 `export const|function|async function` berawalan mk, sandiPeran, atau alunPenulis;
//   (2) pemakaian: nama apa pun yang diimpor src/masuk*.js dari "./hak.js", plus nama hak.js yang DIPANGGIL aturSandi di
//       instansi.js, pendataan.js, kemitraan_akun.js (jalur tulis sandi akun peran dari pintu masuk).
// Badan fungsi = dari deklarasinya sampai baris kolom-0 berikutnya yang bukan lanjutan (export/const/let/function/komentar).
// Fungsi berizin (IZIN_TULIS_AKUN) boleh UPDATE tabel akun, tetapi: tanpa `status` di klausa SET, tanpa INSERT/DELETE/REPLACE,
// dan tiap UPDATE wajib memuat `status = 'aktif'` di WHERE (akun nonaktif/diblokir tidak pernah tersentuh).
// Batas heuristik: tabel dari string yang disusun dinamis, SQL di konstanta di luar badan fungsi, dan pemanggilan
// lewat re-export/alias berantai tidak terlihat; akhir pernyataan SQL dianggap kutip " atau ` berikutnya.
const TABEL_AKUN = "staf|instansi_akun|pdt_akun|km_akun|pemirsa";
// Satu-satunya penulis tabel akun lain dari pintu masuk: ganti sandi lewat kode WA (ALUR A7). Menambah nama di sini
// butuh keputusan pemilik di KEPUTUSAN-MASUK.md dulu.
export const IZIN_TULIS_AKUN = ["sandiPeranTulis"];
const TULIS = String.raw`(?:INSERT\s+(?:OR\s+\w+\s+)?INTO|DELETE\s+FROM|REPLACE\s+INTO)\s+(?:${TABEL_AKUN})\b`;
const UBAH = new RegExp(String.raw`UPDATE(?:\s+OR\s+\w+)?\s+(?:${TABEL_AKUN})\b([^"\x60]*)`, "gi");
const awalanPenjaga = /^(?:mk|sandiPeran|alunPenulis)/;
export function blokHak(teks) {
  const baris = teks.split("\n"), out = [];
  for (let i = 0; i < baris.length; i++) {
    const h = /^export (?:const|function|async function) (\w+)/.exec(baris[i]);
    if (!h) continue;
    let j = i + 1;
    while (j < baris.length && !/^(?:export |const |let |function |async function |\/[*\/])/.test(baris[j])) j++;
    out.push({nama: h[1], baris: i + 1, isi: baris.slice(i, j).join("\n")});
  }
  return out;
}
const impor = teks => [...teks.matchAll(/import\s*\{([^}]*)\}\s*from\s*["']\.\/hak\.js["']/gs)].flatMap(m => m[1].split(",").map(x => x.trim().split(/\s+as\s+/)[0]).filter(Boolean));
// nama hak.js yang dipanggil di dalam fungsi aturSandi / aturSandiKode sebuah modul peran
export function dipakaiAturSandi(teks) {
  const diimpor = new Set(impor(teks)), out = [];
  for (const b of blokHak(teks.replace(/^(async )?function /gm, "export function "))) {
    if (!/^aturSandi/.test(b.nama)) continue;
    for (const n of diimpor) if (new RegExp(String.raw`\b${n}\s*\(`).test(b.isi)) out.push(n);
  }
  return out;
}
export function g8(teks, tambahan = [], izin = IZIN_TULIS_AKUN) {
  const salah = [], ekstra = new Set(tambahan), reTulis = new RegExp(TULIS, "gi");
  for (const b of blokHak(teks)) {
    if (!awalanPenjaga.test(b.nama) && !ekstra.has(b.nama)) continue;
    const id = `${b.nama} (baris ${b.baris})`;
    for (const m of b.isi.matchAll(reTulis)) salah.push(`${id}: menulis tabel akun modul lain: ${m[0]}`);
    for (const m of b.isi.matchAll(UBAH)) {
      if (!izin.includes(b.nama)) { salah.push(`${id}: menulis tabel akun modul lain: ${m[0].slice(0, 40)}`); continue; }
      const [set, ...w] = m[1].split(/\bWHERE\b/i), where = w.join(" ");
      if (/\bstatus\s*=/i.test(set)) salah.push(`${id}: fungsi berizin mengubah kolom status akun (SET): ${m[0].slice(0, 60)}`);
      if (!/\bstatus\s*=\s*'aktif'/i.test(where)) salah.push(`${id}: UPDATE tabel akun tanpa status = 'aktif' di WHERE: ${m[0].slice(0, 60)}`);
    }
  }
  return salah;
}
// cakupan nyata: hak.js + nama yang diimpor masuk*.js + nama yang dipanggil aturSandi di tiga modul peran
export function g8Nyata() {
  const tambahan = [...srcMasuk().flatMap(r => impor(baca(r))),
    ...["src/instansi.js", "src/pendataan.js", "src/kemitraan_akun.js"].filter(r => existsSync(AKAR + r)).flatMap(r => dipakaiAturSandi(baca(r)))];
  return g8(baca("src/hak.js"), tambahan);
}

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

const H = "export const ";
test("G-8 mode gagal: penulis tabel akun di luar izin ditolak, tabel sesi dan mk_* lolos", () => {
  assert.equal(g8(H + "mkA = (env) => env.DB.prepare(\"UPDATE pdt_akun SET aktif=1\")").length, 1);
  assert.equal(g8(H + "mkB = async (env) => {\n  await x(\"INSERT INTO km_akun (a) VALUES (1)\");\n};").length, 1);
  assert.equal(g8(H + "mkC = e => e.DB.prepare('DELETE FROM pemirsa WHERE 1')").length, 1);
  assert.equal(g8(H + "sandiPeranLain = e => e.DB.prepare('UPDATE staf SET a=1')").length, 1);   // awalan sandiPeran, bukan izin
  assert.deepEqual(g8(H + "mkD = e => e.DB.prepare('INSERT INTO pdt_sesi (a) SELECT 1 FROM pdt_akun')"), []);
  assert.deepEqual(g8(H + "mkE = e => e.DB.prepare('INSERT INTO pemirsa_sesi (a) VALUES (1)')"), []);
  assert.deepEqual(g8(H + "alunPenulisTulis = e => e.DB.prepare('INSERT INTO alun_penulis (a) VALUES (1)')"), []);
  assert.deepEqual(g8(H + "lain = e => e.DB.prepare('UPDATE staf SET a=1')"), []);               // di luar cakupan, tanpa impor
});
test("G-8 mode gagal: fungsi non-mk yang diimpor masuk.js atau dipanggil aturSandi ikut dipindai", () => {
  const hak = H + "tulisAkun = e => e.DB.prepare(\"UPDATE pdt_akun SET garam = 1 WHERE id = 1 AND status = 'aktif'\")";
  assert.deepEqual(g8(hak), []);
  assert.equal(g8(hak, ["tulisAkun"]).length, 1);
  assert.deepEqual(impor('import {a as b,\n  tulisAkun, mkX} from "./hak.js";'), ["a", "tulisAkun", "mkX"]);
  assert.deepEqual(dipakaiAturSandi('import {tulisAkun, mkSesiPeran} from "./hak.js";\nexport async function aturSandi(env) {\n  return await tulisAkun(env);\n}\nasync function lain() { mkSesiPeran(); }'), ["tulisAkun"]);
  assert.deepEqual(dipakaiAturSandi('import {tulisAkun} from "./hak.js";\nasync function aturSandiKode(env) { return tulisAkun(env); }\nexport {aturSandiKode as aturSandi};'), ["tulisAkun"]);
});
test("G-8 mode gagal: fungsi berizin tidak boleh SET status, INSERT, atau UPDATE tanpa status aktif di WHERE", () => {
  const ok = H + "sandiPeranTulis = async env => {\n  const a = env.DB.prepare(\"UPDATE pdt_akun SET garam = ?2, wajib_ganti = 0 WHERE id = ?1 AND status = 'aktif' AND dummy = 0\");\n};";
  assert.deepEqual(g8(ok), []);
  assert.equal(g8(ok.replace("wajib_ganti = 0", "status = 'aktif'")).length, 1);                       // SET status
  assert.equal(g8(ok.replace("SET garam", "SET status='nonaktif', garam")).length, 1);
  assert.equal(g8(ok.replace(" AND status = 'aktif'", "")).length, 1);                                 // WHERE tanpa status aktif
  assert.equal(g8(ok.replace(/ WHERE.*?"/, ' "')).length, 1);                                          // tanpa WHERE sama sekali
  assert.equal(g8(ok + '\n// x\nexport const sandiPeranTulis2 = 1;').length, 0);
  assert.equal(g8(ok.replace("UPDATE pdt_akun", "INSERT INTO km_akun")).length, 1);                    // INSERT dilarang
  assert.equal(g8(ok.replace("UPDATE pdt_akun SET", "DELETE FROM staf WHERE x = 1; UPDATE pdt_akun SET")).length, 1);
  assert.deepEqual(g8(ok.replace("'aktif' AND dummy = 0\")", "'aktif' AND dummy = 0\"") + H + "mkDel = e => e.DB.prepare('DELETE FROM pdt_sesi WHERE akun_id = 1')"), []);
});
test("G-8 berkas nyata: fungsi hak.js untuk pintu masuk tidak menulis tabel akun modul lain kecuali penulis sandi berizin", () => {
  const salah = g8Nyata().map(s => `src/hak.js: ${s}`);
  assert.deepEqual(salah, [], `G-8 dilanggar. Akibat: akun instansi, pendataan, kampus, staf, atau pemirsa bisa diaktifkan, dinonaktifkan, atau diubah dari pintu masuk, padahal D19 menyerahkannya ke Super Admin dan modul pemilik. Perbaiki: buang tulisan itu dari fungsi tsb; ubah akun lewat fungsi modul pemiliknya, tandai di antrean tinjau (mk_*), atau, bila memang penulis sandi, hanya SET kolom sandi dengan WHERE status = 'aktif' dan catat keputusannya di KEPUTUSAN-MASUK.md sebelum menambah IZIN_TULIS_AKUN. ${RUJUK}`);
});
