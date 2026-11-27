/* Gerbang Orang Hilang publik (OH-16; data/kajian-bnpb/orang-hilang-publik/RENCANA-UJI.md bagian 6): janji privasi dan keamanan paket
   dibaca dari KODE NYATA (matriks hak, SQL, migrasi, wrangler, registri halaman), bukan dari mock.
   Jalankan: node --test tests/agen/gerbang-orang-hilang.test.mjs
   Akibat gagal: data orang yang dicari (nomor, foto, vektor wajah, anak) bisa bocor ke publik, atau profil tayang tanpa keputusan pemilik.
   Tiap butir dipisah jadi fungsi murni yang mengembalikan daftar pelanggaran; uji "mode gagal" memberinya contoh sintetis yang HARUS ditolak. */
import {test} from "node:test";
import assert from "node:assert/strict";
import {existsSync, readFileSync, readdirSync} from "node:fs";
import {join} from "node:path";
import {fileURLToPath} from "node:url";
import "../../src/worker.js";   // urutan impor sungguhan Worker: hak.js dan siklus_kejadian.js saling impor, tanpa ini siklus meledak
import {SUMBER_TANPA_KEJADIAN} from "../../src/siklus_kejadian.js";
import {MATRIKS, OH_KOLOM_PUBLIK, ohSqlDaftar} from "../../src/hak.js";
import {profilPublik, BIDANG_PUBLIK} from "../../src/orang_hilang_murni.js";
import {HTML_RUTE, PUBLIK_TANPA_SESI} from "../../src/gerbang_halaman.js";
import {HALAMAN} from "../../src/peta_situs.js";

const AKAR = fileURLToPath(new URL("../..", import.meta.url));
const baca = rel => readFileSync(join(AKAR, rel), "utf8");
const ls = (dir, re) => readdirSync(join(AKAR, dir)).filter(n => re.test(n)).map(n => `${dir}/${n}`);

/* berkas paket: kode Worker, layar, meja, migrasi */
const SRC = [...ls("src", /^orang_hilang.*\.js$/)];
const LAYAR_JS = [...ls("public/lapor", /hilang.*\.js$/), "public/lapor/hilang.html", "public/lapor/h/index.html"];
const MIGRASI = ["0188_orang_hilang.sql", "0190_orang_hilang_usia.sql", "0191_oh_nomor_ketik.sql"].map(n => `migrations/${n}`);
const CSS = ["public/lapor/hilang.css"];

const tanpaKomentarJs = s => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:\\"'`])\/\/[^\n]*/g, "$1");
const tanpaKomentarSql = s => s.replace(/--[^\n]*/g, "");
/* semua literal string "..." '...' `...` (teks yang bisa sampai ke layar) */
const literal = s => [...tanpaKomentarJs(s).matchAll(/"((?:[^"\\\n]|\\.)*)"|'((?:[^'\\\n]|\\.)*)'|`((?:[^`\\]|\\.)*)`/g)].map(m => m[1] ?? m[2] ?? m[3]);

/* ---- 1. lp_publik tidak punya hak baca tabel pribadi (matriks hak.js) ---- */
const PRIBADI = ["lapor_cari", "lapor_cari_temu", "lapor_cari_foto", "lapor_cari_foto_lain", "lapor_cari_riwayat", "oh_temu", "oh_temu_foto", "oh_info", "oh_riwayat", "oh_nomor_ketik", "oh_cari_foto"];
export function periksaMatriks(m) {
  const salah = [];
  for (const t of PRIBADI) if (Object.hasOwn(m, t) && (m[t].lp_publik ?? []).includes("baca")) salah.push(`lp_publik boleh baca ${t}`);
  if ((m.oh_publik?.lp_publik ?? []).join() !== "baca") salah.push("lp_publik di oh_publik harus persis [baca]");
  for (const t of Object.keys(m).filter(t => /^oh_/.test(t))) for (const h of m[t].lp_publik ?? []) if (h !== "baca" && !(t === "oh_info" && h === "tambah")) salah.push(`lp_publik punya ${h} di ${t}`);
  return salah;
}
test("lp_publik tidak membaca lapor_cari, oh_temu, oh_info, dan tabel pribadi lain", () => {
  assert.deepEqual(periksaMatriks(MATRIKS), [], "Hak lp_publik di src/hak.js terlalu lebar: data pribadi orang dicari bisa terbaca tanpa sesi. Cabut hak itu dari MATRIKS; publik hanya baca oh_publik lewat daftar putih.");
});
test("mode gagal: matriks yang membuka lapor_cari atau oh_temu ke lp_publik ditolak", () => {
  assert.ok(periksaMatriks({oh_publik: {lp_publik: ["baca"]}, lapor_cari: {lp_publik: ["baca"]}}).length);
  assert.ok(periksaMatriks({oh_publik: {lp_publik: ["baca"]}, oh_temu: {lp_publik: ["baca"]}}).length);
  assert.ok(periksaMatriks({oh_publik: {lp_publik: ["baca", "ubah"]}}).length);
});

/* ---- 2. status ditemukan_* hanya lewat cariStatus (staf), dan crStatus hanya dipanggil dari sana ---- */
export function periksaStatusCari(berkas) {   // berkas: {nama: isi}
  const salah = [];
  for (const [n, isi] of Object.entries(berkas)) {
    const k = tanpaKomentarJs(isi);
    if (/\bcrStatus\s*\(/.test(k) && !/lapor_selamat\.js$/.test(n)) salah.push(`${n} memanggil crStatus di luar lapor_selamat.js (cariStatus)`);
    if (/(UPDATE|INSERT)[^;`"']*lapor_cari\b/i.test(k)) salah.push(`${n} menulis lapor_cari langsung`);
    if (/status\s*=\s*'ditemukan_/i.test(k)) salah.push(`${n} mengisi status ditemukan_* lewat SQL`);
  }
  return salah;
}
test("status ditemukan_* hanya dari cariStatus staf; paket tidak menulis lapor_cari", () => {
  const b = Object.fromEntries([...SRC, ...ls("src", /^(lapor_selamat|lapor_ai|meja.*|orang_tinjau)\.js$/)].map(n => [n, baca(n)]));
  assert.ok(Object.keys(b).some(n => /lapor_selamat/.test(n)), "lapor_selamat.js harus ikut diperiksa");
  assert.deepEqual(periksaStatusCari(b), [], "Ada kode di luar cariStatus yang menetapkan penemuan orang. Penemuan hanya boleh diputuskan petugas lewat rute cariStatus (K115).");
});
test("mode gagal: pemanggil crStatus lain dan UPDATE lapor_cari ditolak", () => {
  assert.equal(periksaStatusCari({"src/orang_hilang.js": "await H.crStatus(env, S, id, 'x')"}).length, 1);
  assert.equal(periksaStatusCari({"src/orang_hilang.js": "env.DB.prepare(\"UPDATE lapor_cari SET status = 'ditemukan_selamat'\")"}).length, 2);
});

/* ---- 3. foto penanya tidak disimpan ---- */
export function periksaFoto({srcBerkas, skemaCariFoto, fotoPublikSql}) {
  const salah = [];
  for (const [n, isi] of Object.entries(srcBerkas)) {
    const k = tanpaKomentarJs(isi);
    for (const m of k.matchAll(/\.put\(\s*([^,)]*)/g)) if (!/^kunciFotoPublik\(|^kunci$/.test(m[1].trim())) salah.push(`${n}: R2 put dengan kunci tak dikenal (${m[1].trim()})`);
    if (/(INSERT|UPDATE)[^;`"']*lapor_cari_foto/i.test(k)) salah.push(`${n} menulis lapor_cari_foto*`);
  }
  const kol = [...skemaCariFoto.matchAll(/^\s*(\w+)\s+(?:INTEGER|TEXT|BLOB)/gim)].map(m => m[1]);
  const boleh = ["id", "nomor_sha", "waktu", "kandidat", "tingkat"];
  for (const c of kol) if (!boleh.includes(c)) salah.push(`oh_cari_foto punya kolom ${c} (hanya statistik laju yang boleh)`);
  if (/BLOB/i.test(skemaCariFoto)) salah.push("oh_cari_foto punya kolom BLOB");
  if (/\bfoto_(penanya|cari|unggah)\b/i.test(fotoPublikSql)) salah.push("kode foto publik menyebut foto penanya");
  return salah;
}
const skemaCF = () => (tanpaKomentarSql(baca("migrations/0188_orang_hilang.sql")).match(/CREATE TABLE IF NOT EXISTS oh_cari_foto \([\s\S]*?\n\);/) ?? [""])[0];
test("foto penanya tidak disimpan: R2 hanya foto publik, oh_cari_foto hanya statistik laju", () => {
  assert.ok(skemaCF().includes("nomor_sha"), "skema oh_cari_foto tidak ditemukan di migrasi 0188");
  assert.deepEqual(periksaFoto({srcBerkas: Object.fromEntries(SRC.map(n => [n, baca(n)])), skemaCariFoto: skemaCF(), fotoPublikSql: baca("src/orang_hilang_foto_publik.js")}), [],
    "Foto orang yang mencari tidak boleh disimpan (KEAMANAN-PRIVASI: 0 hari). Hapus penyimpanannya; foto hanya hidup di memori satu permintaan.");
});
test("mode gagal: put R2 liar, kolom foto di oh_cari_foto, tulis lapor_cari_foto ditolak", () => {
  const ok = skemaCF();
  assert.equal(periksaFoto({srcBerkas: {"a.js": "env.MEDIA.put(`cari/${id}`, b)"}, skemaCariFoto: ok, fotoPublikSql: ""}).length, 1);
  assert.equal(periksaFoto({srcBerkas: {"a.js": "INSERT INTO lapor_cari_foto (x)"}, skemaCariFoto: ok, fotoPublikSql: ""}).length, 1);
  assert.ok(periksaFoto({srcBerkas: {}, skemaCariFoto: "CREATE TABLE oh_cari_foto (\n id INTEGER PRIMARY KEY,\n foto BLOB NOT NULL,\n waktu INTEGER\n);", fotoPublikSql: ""}).length >= 2);
});

/* ---- 4. tanpa vektor wajah, embedding, atau pustaka wajah di berkas paket ---- */
const WAJAH = /\b(vektor|vector|embedding|embeddings|descriptor|descriptors|face-?api|faceapi|face_recognition|insightface|facenet|mediapipe|opencv|tfjs|tensorflow|onnx)\b/i;
export const periksaWajah = berkas => Object.entries(berkas).flatMap(([n, isi]) => {
  const k = /\.sql$/.test(n) ? tanpaKomentarSql(isi) : tanpaKomentarJs(isi); const m = k.match(WAJAH); return m ? [`${n} memuat "${m[0]}"`] : [];
});
test("tidak ada vektor wajah, embedding, atau pustaka wajah di berkas paket", () => {
  assert.deepEqual(periksaWajah(Object.fromEntries([...SRC, ...LAYAR_JS, ...MIGRASI, "public/lapor/meja_hilang.js"].map(n => [n, baca(n)]))), [],
    "Paket Orang Hilang tidak menyimpan atau menghitung vektor wajah (KEPUTUSAN, KEAMANAN-PRIVASI). Hapus kode itu; pencocokan wajah di luar paket.");
});
test("mode gagal: kata vektor, embedding, face-api ditolak; komentar tidak dihitung", () => {
  assert.equal(periksaWajah({"a.js": "const embedding = f(x)"}).length, 1);
  assert.equal(periksaWajah({"a.js": "import 'face-api'"}).length, 1);
  assert.equal(periksaWajah({"a.sql": "ALTER TABLE t ADD vector BLOB"}).length, 1);
  assert.equal(periksaWajah({"a.js": "// tanpa vektor wajah\nconst a = 1"}).length, 0);
});

/* ---- 5. nomor kontak dan data pribadi tidak pernah di kunci publik ---- */
const KUNCI_BAHAYA = /nomor|kontak|telp|telepon|wali|setuju|nik|alamat|hubungan|titik|lat|lon|sha|oleh|catatan|foto_asli|inisial_raw/i;
export function periksaKolomPublik({kolom, bidang, sql, keluaran}) {
  const salah = [];
  for (const k of kolom) if (KUNCI_BAHAYA.test(k)) salah.push(`kolom publik ${k} terlihat pribadi`);
  for (const [kelas, ks] of Object.entries(bidang)) for (const k of ks) if (KUNCI_BAHAYA.test(k)) salah.push(`bidang ${kelas}.${k} terlihat pribadi`);
  if (/\*/.test(sql.split(" FROM ")[0])) salah.push("SQL daftar memakai SELECT *");
  if (/nomor|kontak|telepon|wali/i.test(sql)) salah.push("SQL daftar menyentuh kolom nomor/kontak/wali");
  for (const o of keluaran) {
    const asing = Object.keys(o.profil).filter(k => !bidang[o.kelas].includes(k));
    if (asing.length) salah.push(`profilPublik ${o.kelas} membocorkan kunci ${asing.join(",")}`);
    if (/\d{8,}/.test(JSON.stringify(o.profil))) salah.push(`profilPublik ${o.kelas} memuat deret angka mirip nomor telepon`);
  }
  return salah;
}
const BARIS = {token: "a".repeat(32), nama: "Budi Santoso", panggilan: "Bud", umur: 34, kelamin: "Laki-laki", tinggi: 170, pakaian: "kaos biru", ciri: "tato di lengan", kec: "Cibinong", kab_nama: "Bogor",
  waktu: Date.UTC(2026, 10, 20), nomor_pencari: "081234567890", nomor_dicari: "081298765432", nomor_kontak: "081211112222", kontak: "081233334444", wali_oleh: "petugas1", hubungan: "ayah", lat: -6.5, lon: 106.8,
  kejadian: {jenis: "banjir", kab: "3201", mulai: "2026-11-19", nomor: "081255556666"}};
test("nomor kontak dan data pribadi tidak pernah di kunci publik (profilPublik, daftar putih, SQL daftar)", () => {
  const [sql] = ohSqlDaftar({sejak: 0, batas: 10, kab: "32.01", umur5: 30});
  const keluaran = ["dewasa", "anak"].map(kelas => ({kelas, profil: profilPublik(BARIS, kelas, {foto: ["/api/lapor/hilang/foto/x"], ciri_ditinjau: true})}));
  assert.deepEqual(periksaKolomPublik({kolom: OH_KOLOM_PUBLIK, bidang: BIDANG_PUBLIK, sql, keluaran}), [],
    "Respons publik orang hilang memuat kolom pribadi. Nomor, wali, titik, dan hubungan hanya untuk petugas; ubah daftar putih OH_KOLOM_PUBLIK / BIDANG_PUBLIK, jangan daftar hitam.");
});
test("mode gagal: kolom nomor_kontak, SELECT *, dan profil yang bocor ditolak", () => {
  const ok = {kolom: ["token", "nama"], bidang: {dewasa: ["id"], anak: ["id"]}, sql: "SELECT token FROM oh_publik", keluaran: []};
  assert.deepEqual(periksaKolomPublik(ok), []);
  assert.equal(periksaKolomPublik({...ok, kolom: ["token", "nomor_kontak"]}).length, 1);
  assert.equal(periksaKolomPublik({...ok, bidang: {dewasa: ["id", "telepon"], anak: ["id"]}}).length, 1);
  assert.ok(periksaKolomPublik({...ok, sql: "SELECT * FROM oh_publik"}).length);
  assert.equal(periksaKolomPublik({...ok, keluaran: [{kelas: "dewasa", profil: {id: "x", nomor: "081234567890"}}]}).length, 2);
});

/* ---- 6. tanpa berkas JSON profil di public/ ---- */
function jelajah(dir, hasil = []) {
  for (const e of readdirSync(join(AKAR, dir), {withFileTypes: true})) {
    if (e.name === "node_modules" || e.name.startsWith(".")) continue;
    const rel = `${dir}/${e.name}`;
    if (e.isDirectory()) jelajah(rel, hasil); else if (/\.(json|jsonl|ndjson|csv)$/i.test(e.name)) hasil.push(rel);
  }
  return hasil;
}
export const periksaJsonPublik = (daftar, isi) => daftar.flatMap(n => /hilang|oh_publik|orang[-_]dicari/i.test(n) ? [`${n}: nama berkas profil di public/`]
  : /"token"\s*:/.test(isi(n)) && /"kelas"\s*:\s*"(dewasa|anak)"/.test(isi(n)) && /"panggilan"\s*:/.test(isi(n)) ? [`${n}: isi mirip profil orang hilang`] : []);
test("tidak ada berkas JSON profil orang hilang di public/", () => {
  const daftar = jelajah("public");
  assert.ok(daftar.length > 10, "penjelajahan public/ tidak menemukan berkas");
  assert.deepEqual(periksaJsonPublik(daftar, n => { try { return baca(n); } catch { return ""; } }), [],
    "Profil orang hilang hanya boleh lewat API Worker yang bisa menurunkannya seketika (K114). Berkas statis di public/ tidak bisa dicabut. Hapus berkas itu.");
});
test("mode gagal: berkas bernama hilang atau berisi profil ditolak", () => {
  assert.equal(periksaJsonPublik(["public/data/orang_hilang.json"], () => "[]").length, 1);
  assert.equal(periksaJsonPublik(["public/data/x.json"], () => '[{"token":"a","kelas":"anak","panggilan":"b"}]').length, 1);
  assert.equal(periksaJsonPublik(["public/data/x.json"], () => '[{"id":1}]').length, 0);
});

/* ---- 7. teks layar: tanpa "aman", "pasti", titik tengah, ALL-CAPS, literal warna ---- */
export function periksaTeks({literals, css}) {
  const salah = [];
  for (const [n, ls] of Object.entries(literals)) for (const t of ls) {
    if (/\b(aman|pasti)\b/i.test(t)) salah.push(`${n}: kata aman/pasti di "${t.slice(0, 60)}"`);
    if (/\s·\s|·/.test(t)) salah.push(`${n}: titik tengah di "${t.slice(0, 60)}"`);
    if (/(?:\b[A-Z]{4,}\b[ ,]+){2,}\b[A-Z]{4,}\b/.test(t)) salah.push(`${n}: ALL-CAPS di "${t.slice(0, 60)}"`);
  }
  for (const [n, isi] of Object.entries(css)) {
    if (/text-transform\s*:\s*uppercase/i.test(isi)) salah.push(`${n}: text-transform uppercase`);
    const k = isi.replace(/\/\*[\s\S]*?\*\//g, "");
    if (/#[0-9a-f]{3,8}\b|\b(?:rgb|hsl)a?\(/i.test(k)) salah.push(`${n}: literal warna (pakai token tema.css)`);
  }
  return salah;
}
const teksHtml = s => [...s.replace(/<(script|style)[\s\S]*?<\/\1>/gi, "").replace(/<!--[\s\S]*?-->/g, "").matchAll(/>([^<]+)</g)].map(m => m[1].trim()).filter(Boolean);
test("teks orang hilang tanpa aman/pasti, titik tengah, ALL-CAPS; CSS tanpa uppercase dan literal warna", () => {
  const literals = {};
  for (const n of [...SRC, ...LAYAR_JS, "public/lapor/meja_hilang.js"]) literals[n] = /\.html$/.test(n) ? teksHtml(baca(n)) : literal(baca(n));
  assert.deepEqual(periksaTeks({literals, css: Object.fromEntries(CSS.map(n => [n, baca(n)]))}), [],
    "Teks Orang Hilang melanggar selera pemilik atau menjanjikan kepastian. Tulis ulang (\"belum diketahui\", \"menurut laporan\"), tanpa titik tengah dan huruf kapital semua; warna lewat token.");
});
test("mode gagal: teks menjanjikan aman, titik tengah, ALL-CAPS, uppercase, warna ditolak", () => {
  const c = {a: ""};
  assert.equal(periksaTeks({literals: {a: ["Orang ini pasti selamat"]}, css: c}).length, 1);
  assert.equal(periksaTeks({literals: {a: ["Dia sudah aman"]}, css: c}).length, 1);
  assert.equal(periksaTeks({literals: {a: ["Bogor · Depok"]}, css: c}).length, 1);
  assert.equal(periksaTeks({literals: {a: ["HARAP SEGERA HUBUNGI PETUGAS"]}, css: c}).length, 1);
  assert.equal(periksaTeks({literals: {a: ["Ini bukan kepastian, keamanan tidak dijamin"]}, css: c}).length, 0);
  assert.equal(periksaTeks({literals: {}, css: {a: ".x{text-transform:uppercase}"}}).length, 1);
  assert.equal(periksaTeks({literals: {}, css: {a: ".x{color:#ff0000}"}}).length, 1);
  assert.equal(periksaTeks({literals: {}, css: {a: ".x{color:var(--navy)}"}}).length, 0);
});

/* ---- 8. sumber orang_hilang tidak membuat kejadian ---- */
test("sumber orang_hilang terdaftar di SUMBER_TANPA_KEJADIAN", () => {
  assert.ok(SUMBER_TANPA_KEJADIAN.includes("orang_hilang"), "Tanpa ini laporan orang hilang bisa membuat atau mengubah kejadian di Buku Besar. Tambahkan \"orang_hilang\" ke SUMBER_TANPA_KEJADIAN di src/siklus_kejadian.js.");
  const k = baca("src/kejadian_tautan.js");
  assert.match(k, /\.\.\.SUMBER_TANPA_KEJADIAN/, "kejadian_tautan.js harus memakai SUMBER_TANPA_KEJADIAN di daftar TERLIHAT");
});

/* ---- 9. bendera bawaan "0" di kedua wrangler ---- */
const jsonc = s => JSON.parse(s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "").replace(/,(\s*[}\]])/g, "$1"));
export function periksaBendera(konfig) {
  const salah = [], telusur = (o, jalur, atas = false) => { if (o && typeof o === "object") for (const [k, v] of Object.entries(o)) { if (k === "vars" && !atas && v && typeof v === "object") for (const b of ["OH_PUBLIK", "OH_TULIS", "OH_FOTO"]) if (b in v && v[b] !== "0") salah.push(`${jalur}.vars.${b} = ${JSON.stringify(v[b])}`); telusur(v, `${jalur}.${k}`); } };   // vars tingkat atas sudah diperiksa di bawah; ini hanya env bersarang
  for (const [n, c] of Object.entries(konfig)) {
    for (const b of ["OH_PUBLIK", "OH_TULIS", "OH_FOTO"]) if (c.vars?.[b] !== "0") salah.push(`${n}: vars.${b} harus "0" (ada: ${JSON.stringify(c.vars?.[b])})`);
    telusur(c, n, true);
  }
  return salah;
}
test("OH_PUBLIK, OH_TULIS, OH_FOTO bawaan \"0\" di wrangler.jsonc dan wrangler.warga.jsonc", () => {
  const k = {"wrangler.jsonc": jsonc(baca("wrangler.jsonc")), "wrangler.warga.jsonc": jsonc(baca("wrangler.warga.jsonc"))};
  assert.deepEqual(periksaBendera(k), [], "Bendera menyala di konfigurasi yang di-commit: profil bisa tayang sebelum pemilik meninjau dan menerapkan migrasi. Kembalikan ke \"0\"; pemilik menyalakannya sendiri (OH-12).");
});
test("mode gagal: bendera \"1\", hilang, atau di env lain ditolak", () => {
  const ok = {vars: {OH_PUBLIK: "0", OH_TULIS: "0", OH_FOTO: "0"}};
  assert.deepEqual(periksaBendera({a: ok}), []);
  assert.equal(periksaBendera({a: {vars: {...ok.vars, OH_TULIS: "1"}}}).length, 1);
  assert.equal(periksaBendera({a: {vars: {OH_PUBLIK: "0", OH_TULIS: "0"}}}).length, 1);
  assert.ok(periksaBendera({a: {...ok, env: {produksi: {vars: {OH_FOTO: "1"}}}}}).length);
});

/* ---- 10. noindex, token di luar statistik, tanpa daftar putih tanpa sesi ---- */
export function periksaHalaman({htmlRute, publik, peta, workerSrc, html, keputusanMasuk}) {
  const salah = [], H = "/lapor/hilang", S = "/lapor/h";
  const kunci = (jalur, contoh) => { const e = htmlRute.find(([re]) => re.test(contoh)); if (!e) { salah.push(`${jalur}: tidak ada di HTML_RUTE`); return null; } return e; };
  const h = kunci(H, H), s = kunci(S, `${S}/${"a".repeat(32)}`);
  if (h && h[2] !== H) salah.push(`${H}: kunci statistik harus string tetap "${H}"`);
  if (s && s[2] !== S) salah.push(`${S}: kunci statistik harus string tetap "${S}" (token tidak boleh masuk statistik hit)`);
  const ent = peta.find(e => e.rute === S);
  if (!ent) salah.push(`${S}: tidak ada di Peta Situs (gerbang peta-situs butuh entri berpenanda token)`); else if (!ent.token) salah.push(`${S}: harus token:true agar tidak tampil di menu`);
  if (!peta.some(e => e.rute === H)) salah.push(`${H}: tidak ada di Peta Situs`);
  for (const r of [H, S]) {
    if (!new RegExp(`jalur === "${r}"[^]*?x-robots-tag", "noindex`).test(workerSrc) && !new RegExp(`"${r}"[^\\n]*x-robots-tag[^\\n]*noindex`).test(workerSrc)) salah.push(`${r}: Worker tidak memberi header x-robots-tag noindex`);
    if (publik.has(r)) salah.push(`${r}: ada di PUBLIK_TANPA_SESI`);
  }
  if ([...publik.keys()].some(r => /^\/lapor\/h(ilang)?(\/|$)/.test(r)) && !/\/lapor\/hilang/.test(keputusanMasuk)) salah.push("halaman orang hilang publik tanpa keputusan pemilik di KEPUTUSAN-MASUK");
  for (const [n, isi] of Object.entries(html)) if (!/<meta name="robots" content="[^"]*noindex/.test(isi)) salah.push(`${n}: tanpa meta robots noindex`);
  return salah;
}
const masukan = () => ({htmlRute: HTML_RUTE, publik: PUBLIK_TANPA_SESI, peta: HALAMAN, workerSrc: baca("src/worker.js"),
  html: {"public/lapor/hilang.html": baca("public/lapor/hilang.html"), "public/lapor/h/index.html": baca("public/lapor/h/index.html")}, keputusanMasuk: baca("data/kajian-bnpb/pintu-masuk/KEPUTUSAN-MASUK.md")});
test("/lapor/hilang dan /lapor/h: noindex, token di luar statistik, tidak di daftar tanpa sesi", () => {
  assert.deepEqual(periksaHalaman(masukan()), [], "Halaman orang hilang bisa terindeks mesin pencari, token profil bocor ke statistik, atau halaman terbuka tanpa keputusan pemilik. Perbaiki src/gerbang_halaman.js, src/worker.js (header), public/lapor/hilang.html, h/index.html, atau catat keputusan di KEPUTUSAN-MASUK.");
});
test("mode gagal: kunci statistik berfungsi, daftar tanpa sesi, tanpa noindex ditolak", () => {
  const m = masukan();
  const rute = HTML_RUTE.map(e => /lapor\\\/h\\\//.test(e[0].source) ? [e[0], e[1]] : e);   // kunci statistik hilang = jalur apa adanya
  assert.ok(periksaHalaman({...m, htmlRute: rute}).some(x => /statistik/.test(x)));
  assert.ok(periksaHalaman({...m, publik: new Map([...PUBLIK_TANPA_SESI, ["/lapor/h", "x"]]), keputusanMasuk: ""}).length >= 2);
  assert.ok(periksaHalaman({...m, html: {"a.html": "<head></head>"}}).length);
  assert.ok(periksaHalaman({...m, workerSrc: "tanpa header"}).length >= 2);
  assert.ok(periksaHalaman({...m, peta: HALAMAN.map(e => e.rute === "/lapor/h" ? {...e, token: false} : e)}).length);
});
