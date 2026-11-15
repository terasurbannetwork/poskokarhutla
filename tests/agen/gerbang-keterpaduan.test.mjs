// Gerbang KP-01 paket Keterpaduan (T15; keputusan D1, D2, D5, D6, K14).
// 1. Tabel bernama *kejadian* / *tugas* wajib tertaut (sumber pencocok di pasang.py), diutangkan (menyusut saja),
//    dikecualikan beralasan, atau lahir dengan kolom kejadian_id yang merujuk sk_kejadian.
// 2. indexedDB.open di public/ hanya di public/inti/antre.js; sisa lama di daftar utang yang hanya menyusut.
import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync, readdirSync, statSync} from "node:fs";
import {fileURLToPath} from "node:url";

const AKAR = fileURLToPath(new URL("../../", import.meta.url));
const FIX = JSON.parse(readFileSync(new URL("./fixtures/keterpaduan.json", import.meta.url), "utf8"));
const BUKU_BESAR = ["sk_kejadian", "sk_kejadian_kab", "sk_kejadian_alias", "sk_kejadian_sumber"];
const MIRIP = /(^|_)(kejadian|tugas)(_|$)/;

// murni: sql migrasi urut -> {nama: badan kolom}; DROP TABLE menghapus, ALTER TABLE a RENAME TO b memindah,
// CREATE TABLE IF NOT EXISTS atas tabel yang sudah ada adalah no-op (perilaku SQLite), CREATE tanpa IF NOT EXISTS menimpa
const NAMA = String.raw`[\x60"\[]?(?:\w+\.)?([a-z0-9_]+)[\x60"\]]?`;
export function petaTabel(sqls) {
  const peta = new Map();
  const re = new RegExp(String.raw`\b(CREATE\s+(?:TEMP(?:ORARY)?\s+)?TABLE(\s+IF\s+NOT\s+EXISTS)?|DROP\s+TABLE(?:\s+IF\s+EXISTS)?|ALTER\s+TABLE)\s+${NAMA}(?:\s+RENAME\s+TO\s+${NAMA})?`, "gi");
  for (const sql of sqls) {
    const s = sql.replace(/--[^\n]*/g, "");
    for (const m of s.matchAll(re)) {
      const nama = m[3].toLowerCase();
      if (/^DROP/i.test(m[1])) { peta.delete(nama); continue; }
      if (/^ALTER/i.test(m[1])) { if (m[4] && peta.has(nama)) { const b = peta.get(nama); peta.delete(nama); peta.set(m[4].toLowerCase(), b); } continue; }
      if (m[2] && peta.has(nama)) continue;
      let i = s.indexOf("(", m.index + m[0].length), d = 0, j = i;
      if (i < 0 || /^\s*AS\b/i.test(s.slice(m.index + m[0].length, i))) { peta.set(nama, ""); continue; }
      for (; j < s.length; j++) { if (s[j] === "(") d++; else if (s[j] === ")" && --d === 0) break; }
      peta.set(nama, s.slice(i + 1, j));
    }
  }
  return peta;
}

export const lahirTertaut = badan => /\bkejadian_id\b[^,]*\bREFERENCES\s+sk_kejadian\s*\(/i.test(badan);

// murni: kembalikan daftar pelanggaran tabel
export function periksaTabel(peta, fix, pasang) {
  const salah = [];
  const ada = [...peta.keys()].filter(n => MIRIP.test(n) && !BUKU_BESAR.includes(n));
  const daftar = {bertaut: fix.bertaut, utang: fix.utang, dikecualikan: Object.keys(fix.dikecualikan)};
  for (const n of ada) {
    if (lahirTertaut(peta.get(n))) continue;
    const di = Object.entries(daftar).filter(([, l]) => l.includes(n)).map(([k]) => k);
    if (di.length === 0) salah.push(`tabel ${n}: kejadian/tugas tanpa tautan. Akibat: satu kejadian terpecah jadi banyak nomor (D2). Perbaiki: beri kolom kejadian_id TEXT REFERENCES sk_kejadian (id), atau tambahkan sumber pencocok di scripts/siklus/pasang.py lalu masukkan ke "bertaut".`);
    else if (di.length > 1) salah.push(`tabel ${n}: tercatat di lebih dari satu daftar (${di.join(", ")}) di tests/agen/fixtures/keterpaduan.json. Perbaiki: sisakan satu.`);
  }
  for (const n of fix.utang) {
    if (!ada.includes(n)) salah.push(`utang ${n}: tabel sudah tidak ada. Perbaiki: hapus dari "utang" (ratchet hanya menyusut).`);
    else if (lahirTertaut(peta.get(n))) salah.push(`utang ${n}: sudah punya kejadian_id. Perbaiki: hapus dari "utang".`);
  }
  for (const n of fix.bertaut) {
    if (!ada.includes(n)) salah.push(`bertaut ${n}: tabel tidak ada. Perbaiki: hapus dari "bertaut".`);
    else if (!pasang.includes(n) && !pasang.includes(n.replace(/_(kejadian|tugas)$/, ""))) salah.push(`bertaut ${n}: tidak ada sumber pencocok di scripts/siklus/pasang.py. Akibat: klaim tertaut palsu. Perbaiki: tambah sumbernya atau pindahkan ke "utang".`);
  }
  for (const n of Object.keys(fix.dikecualikan)) {
    if (!ada.includes(n)) salah.push(`dikecualikan ${n}: tabel sudah tidak ada. Perbaiki: hapus dari "dikecualikan".`);
    if (String(fix.dikecualikan[n]).length < 15) salah.push(`dikecualikan ${n}: alasan kurang dari 15 karakter. Perbaiki: tulis alasannya.`);
  }
  return salah;
}

// murni: berkas -> isi; kembalikan pelanggaran antrean luring
export function periksaAntrean(isi, utang) {
  const salah = [];
  const pemanggil = Object.keys(isi).filter(b => /indexedDB\s*(\.|\[)\s*["']?open/.test(isi[b]) && b !== "public/inti/antre.js");
  for (const b of pemanggil) if (!utang.includes(b)) salah.push(`${b}: memanggil indexedDB.open sendiri. Akibat: antrean luring ketujuh, butir bisa hilang atau terkirim ganda (D5). Perbaiki: pakai window.Antre dari public/inti/antre.js.`);
  for (const b of utang) if (!pemanggil.includes(b)) salah.push(`antrean_utang ${b}: tidak lagi memanggil indexedDB.open. Perbaiki: hapus dari "antrean_utang" (ratchet hanya menyusut).`);
  return salah;
}

function jalan(dir, hasil = []) {
  for (const e of readdirSync(dir, {withFileTypes: true})) {
    const p = `${dir}/${e.name}`;
    if (e.isDirectory()) { if (e.name !== "vendor") jalan(p, hasil); }
    else if (/\.(js|mjs|html)$/.test(e.name)) hasil.push(p);
  }
  return hasil;
}

const FIX_KOSONG = {bertaut: [], utang: [], dikecualikan: {}};
const SK = "CREATE TABLE IF NOT EXISTS sk_kejadian (id TEXT PRIMARY KEY);";

test("tabel kejadian baru tanpa tautan gagal; tabel dengan kejadian_id ke sk_kejadian lulus", () => {
  const gagal = petaTabel([SK, "CREATE TABLE IF NOT EXISTS foo_kejadian (id TEXT PRIMARY KEY);"]);
  const s = periksaTabel(gagal, FIX_KOSONG, "");
  assert.equal(s.length, 1);
  assert.match(s[0], /foo_kejadian.*Akibat.*Perbaiki/);
  const lulus = petaTabel([SK, "CREATE TABLE IF NOT EXISTS foo_tugas (id TEXT, kejadian_id TEXT NOT NULL REFERENCES sk_kejadian (id), x INTEGER CHECK (x IN (1,2)));"]);
  assert.deepEqual(periksaTabel(lulus, FIX_KOSONG, ""), []);
  // kolom kejadian_id yang merujuk tabel lain tidak cukup
  const lain = petaTabel(["CREATE TABLE IF NOT EXISTS bar_kejadian (kejadian_id TEXT REFERENCES logbook_kejadian (id));"]);
  assert.equal(periksaTabel(lain, FIX_KOSONG, "").length, 1);
});

test("tabel dibangun ulang: definisi terakhir menang, tabel yang di-DROP hilang", () => {
  const peta = petaTabel([
    "CREATE TABLE IF NOT EXISTS a_kejadian (id TEXT);",
    "DROP TABLE a_kejadian; CREATE TABLE a_kejadian (id TEXT, kejadian_id TEXT REFERENCES sk_kejadian (id));",
    "CREATE TABLE b_tugas (id TEXT);", "DROP TABLE b_tugas;",
  ]);
  assert.deepEqual(periksaTabel(peta, FIX_KOSONG, ""), []);
  assert.ok(!peta.has("b_tugas"));
});

test("mode gagal: entri utang basi, dobel daftar, bertaut palsu, tanpa alasan", () => {
  const peta = petaTabel(["CREATE TABLE IF NOT EXISTS x_tugas (id TEXT);"]);
  assert.match(periksaTabel(peta, {...FIX_KOSONG, utang: ["x_tugas", "hilang_tugas"]}, "").join("\n"), /utang hilang_tugas: tabel sudah tidak ada/);
  assert.match(periksaTabel(peta, {bertaut: [], utang: ["x_tugas"], dikecualikan: {x_tugas: "alasan yang cukup panjang"}}, "").join("\n"), /lebih dari satu daftar/);
  assert.match(periksaTabel(peta, {...FIX_KOSONG, bertaut: ["x_tugas"]}, "dibi logbook").join("\n"), /bertaut x_tugas: tidak ada sumber pencocok/);
  assert.deepEqual(periksaTabel(peta, {...FIX_KOSONG, bertaut: ["x_tugas"]}, "x_tugas"), []);
  assert.match(periksaTabel(peta, {...FIX_KOSONG, dikecualikan: {x_tugas: "pendek"}}, "").join("\n"), /alasan kurang/);
  const baru = petaTabel(["CREATE TABLE IF NOT EXISTS y_tugas (id TEXT, kejadian_id TEXT REFERENCES sk_kejadian (id));"]);
  assert.match(periksaTabel(baru, {...FIX_KOSONG, utang: ["y_tugas"]}, "").join("\n"), /sudah punya kejadian_id/);
});

test("antrean: berkas baru dengan indexedDB.open gagal, entri utang basi gagal, inti/antre.js lulus", () => {
  assert.deepEqual(periksaAntrean({"public/inti/antre.js": "indexedDB.open(x)"}, []), []);
  const baru = periksaAntrean({"public/baru.js": "indexedDB.open('a')"}, []);
  assert.equal(baru.length, 1); assert.match(baru[0], /public\/baru\.js.*Akibat.*Perbaiki/);
  assert.match(periksaAntrean({"public/lama.js": "tanpa db"}, ["public/lama.js"]).join(""), /tidak lagi memanggil/);
  assert.deepEqual(periksaAntrean({"public/lama.js": "indexedDB.open('a')"}, ["public/lama.js"]), []);
});

test("repo nyata: tabel kejadian/tugas semua tertaut, diutangkan, atau dikecualikan", () => {
  const dir = `${AKAR}migrations`;
  const sqls = readdirSync(dir).filter(f => /^\d+.*\.sql$/.test(f) && !/ 2\./.test(f)).sort().map(f => readFileSync(`${dir}/${f}`, "utf8"));
  const peta = petaTabel(sqls);
  assert.ok(peta.has("sk_kejadian") && peta.has("tugas_api"), "parser migrasi tidak menemukan tabel yang pasti ada");
  const pasang = readFileSync(`${AKAR}scripts/siklus/pasang.py`, "utf8");
  assert.deepEqual(periksaTabel(peta, FIX, pasang), []);
});

test("repo nyata: indexedDB.open hanya di public/inti/antre.js dan daftar utang", () => {
  const isi = {};
  for (const p of jalan(`${AKAR}public`)) { const t = readFileSync(p, "utf8"); if (t.includes("indexedDB.open(")) isi[p.slice(AKAR.length)] = t; }
  assert.ok(Object.keys(isi).length > 0, "pemindai tidak menemukan satu pun indexedDB.open; pemindai rusak");
  assert.deepEqual(periksaAntrean(isi, FIX.antrean_utang), []);
});

test("parser: RENAME memindah, IF NOT EXISTS atas tabel yang ada no-op, nama berkutip, pemanggilan open lewat kurung siku", () => {
  const p = petaTabel(["CREATE TABLE IF NOT EXISTS a (x TEXT);", "ALTER TABLE a RENAME TO b_tugas;", "CREATE TABLE IF NOT EXISTS b_tugas (kejadian_id TEXT REFERENCES sk_kejadian (id));", "CREATE TEMP TABLE `c_kejadian` (y TEXT);", "ALTER TABLE b_tugas ADD COLUMN z TEXT;"]);
  assert.ok(!p.has("a") && p.has("b_tugas") && p.has("c_kejadian"));
  assert.ok(!lahirTertaut(p.get("b_tugas")), "CREATE IF NOT EXISTS atas tabel yang sudah ada tidak boleh menimpa badannya");
  assert.equal(periksaTabel(p, {bertaut: [], utang: [], dikecualikan: {}}, "").length, 2);
  assert.equal(periksaAntrean({"public/x.js": "indexedDB['open']('a')"}, []).length, 1);
});
