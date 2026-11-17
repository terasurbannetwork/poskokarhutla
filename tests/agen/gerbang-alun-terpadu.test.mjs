// Gerbang AT-01 paket Alun-alun Terpadu (data/kajian-bnpb/alun-terpadu/RENCANA-UJI.md §3, G-1..G-8).
// Berkas paket belum ada = tidak ada pelanggaran; gerbang mulai menggigit begitu berkas/cabangnya lahir.
// Tiap aturan = fungsi murni (masukan -> daftar pelanggaran), diuji mode-gagalnya, lalu dipindaikan ke berkas nyata.
// Heuristik regex menangkap bentuk lazim, bukan pembuktian; batasnya ditulis di tiap aturan. G-1 menjalankan Python sungguhan.
import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync, readdirSync, existsSync, mkdtempSync, writeFileSync} from "node:fs";
import {execFileSync} from "node:child_process";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {fileURLToPath} from "node:url";

const AKAR = fileURLToPath(new URL("../../", import.meta.url));
const FIX = JSON.parse(readFileSync(new URL("./fixtures/alun_terpadu.json", import.meta.url), "utf8"));
const RUJUK = "Lihat data/kajian-bnpb/alun-terpadu/ (PRD Larangan, RENCANA-UJI §3).";
const ada = r => existsSync(AKAR + r);
const baca = r => readFileSync(AKAR + r, "utf8");
const ls = (dir, re) => ada(dir) ? readdirSync(AKAR + dir).filter(f => re.test(f)).map(f => `${dir}/${f}`) : [];
const semuaSrc = () => ls("src", /\.js$/);
const bukanKomentarJs = t => t.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`\\])\/\/[^\n]*/g, "$1");
const bukanKomentarPy = t => t.replace(/"""[\s\S]*?"""/g, "").replace(/'''[\s\S]*?'''/g, "").replace(/(^|\s)#[^\n]*/g, "$1");

// ---- G-1: utas alun tanpa kandidat tidak boleh menghasilkan aksi "baru" (D3). MENJALANKAN bertahap() di Python.
// Batas: memeriksa satu skenario (satu rekaman, tanpa KJ- sama sekali); cabang yang baru muncul pada kombinasi lain tidak terlihat.
const PY_G1 = `
import importlib.util, json, sys
s = importlib.util.spec_from_file_location("pasang_g1", sys.argv[1]); m = importlib.util.module_from_spec(s); s.loader.exec_module(m)
r = {"sumber": sys.argv[2], "kode": "uji-1", "jenis": ("banjir",), "kab": ["3201"], "tgl": "2026-11-01", "nilai": {}, "akhir": None}
kep, tunda, h = m.bertahap([r], [], [], "2026-11-02T00:00:00Z")
print(json.dumps([k.get("aksi") for k in kep]))`;
export function g1(berkasPy, sumber = "alun") {
  let aksi;
  try { aksi = JSON.parse(execFileSync("python3", ["-I", "-c", PY_G1, berkasPy, sumber], {cwd: AKAR, stdio: ["ignore", "pipe", "pipe"]}).toString()); }
  catch (e) { return [`bertahap() gagal dijalankan untuk sumber ${sumber}: ${String(e.stderr || e.message).trim().split("\n").pop().slice(0, 160)}`]; }
  return aksi.includes("baru") ? [`sumber ${sumber} tanpa kandidat menghasilkan aksi "baru" (aksi: ${aksi.join(",")})`] : [];
}
export const pasangMemuatAlun = teks => /["']alun["']/.test(bukanKomentarPy(teks));

// ---- G-2: siklus_kejadian.js menolak aksi "baru" untuk sumber alun, bila sumber alun terdaftar di KT (hak.js) atau kejadian_tautan.js.
// Batas: pola = satu baris yang memuat `alun`, `baru`, dan kata penolak (tolak|gagal|Galat|throw); penolakan yang ditulis lintas baris tidak terlihat.
export const sumberAlunTerdaftar = (hak, tautan) =>
  /\bconst KT = \{[\s\S]*?^\s*alun\s*:/m.test(hak) || /(^|[^\w./])(?:alun\s*:|["']alun["'])/m.test(bukanKomentarJs(tautan));
export const g2 = teks => bukanKomentarJs(teks).split("\n")
  .some(b => /["']alun["']|\balun\b\s*[=!]==?|\bALUN\b/.test(b) && /["']baru["']/.test(b) && /\b(tolak|gagal|Galat|throw)\b/.test(b)) ? []
  : [`siklus_kejadian.js tidak memuat penolakan aksi "baru" untuk sumber alun (satu baris: alun + "baru" + tolak/gagal/Galat/throw)`];

// ---- G-3: rekap alun-alun tidak keluar lewat jalur yang dibuka pemirsa, mitra, atau publik (Q1, Q2, Q11).
// Batas: nama berkas data diperiksa lewat pola alun+rekap; isi JSON publik dicek hanya kunci `alun_rekap`/`rekap_alun`.
const RUJUK_REKAP = /alun_rekap|rekap_ringkas|rekap_rinci|siklus\/saji\/alun/;
export const g3Teks = teks => RUJUK_REKAP.test(bukanKomentarJs(teks)) ? ["memuat rujukan ke rekap alun-alun (" + (bukanKomentarJs(teks).match(RUJUK_REKAP)[0]) + ")"] : [];
export const g3Nama = daftar => daftar.filter(f => /alun/i.test(f) && /rekap/i.test(f)).map(f => `berkas data publik ${f} berasal dari rekap alun-alun`);
const dataPublik = (dir = "public/data") => ada(dir) ? readdirSync(AKAR + dir, {withFileTypes: true}).flatMap(e => e.isDirectory() ? dataPublik(`${dir}/${e.name}`) : [`${dir}/${e.name}`]) : [];

// ---- G-4: kata "aman" sebagai keluaran dan pola data contoh (K7, larangan PRD).
// Batas: hanya literal string/template (isi diperiksa kata utuh `aman`); kata yang dirakit dari potongan lolos. Komentar dibuang.
export function g4(teks, py = false) {
  const t = py ? bukanKomentarPy(teks) : bukanKomentarJs(teks), salah = [];
  for (const m of t.matchAll(/`(?:\\.|[^`\\])*`|"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'/g))
    if (/(?<![\p{L}\p{N}_])aman(?![\p{L}\p{N}_])/iu.test(m[0])) salah.push(`literal berisi kata "aman": ${m[0].slice(0, 50)}`);
  for (const m of t.matchAll(/dummy|🧪|🧹|data contoh|\bisi\/hapus\b/gi)) salah.push(`pola data contoh: "${m[0]}"`);
  return salah;
}

// ---- G-5: berkas rekap tidak memuat kunci pengenal/isi (D14). Rekursif atas objek hasil JSON.parse.
const KUNCI_HARAM = new Set(["judul", "nama", "wa", "mk_id", "teks", "lat", "lon"]);
export function g5(obj, jalur = "$") {
  if (Array.isArray(obj)) return obj.flatMap((x, i) => g5(x, `${jalur}[${i}]`));
  if (obj && typeof obj === "object") return Object.entries(obj).flatMap(([k, v]) => (KUNCI_HARAM.has(k) ? [`kunci terlarang ${jalur}.${k}`] : []).concat(g5(v, `${jalur}.${k}`)));
  return [];
}

// ---- G-6: layar baru terdaftar di gerbang kartu standar dan tanpa kesimpulan (AGENTS.md 3.5).
// Batas: pencocokan teks nama berkas di sumber gerbang itu; bukti isi kartunya ada di gerbang tersebut.
export const g6 = (layar, teksKartu, teksKesimpulan) => [
  ...(teksKartu.includes(layar) ? [] : [`${layar} belum ada di daftar LAYAR gerbang-kartu-std.test.mjs`]),
  ...(teksKesimpulan.includes(layar) ? [] : [`${layar} belum ada di daftar LAYAR gerbang-tanpa-kesimpulan.test.mjs`]),
];

// ---- G-7: alun_riwayat append-only (D11). Batas heuristik: DELETE FROM alun_riwayat hanya sah di dalam fungsi yang namanya memuat
// "hapus" (function hapusX / const hapusX = / hapus*: ...); fungsi dikenali dari deklarasi terdekat SEBELUM titik DELETE, jadi
// DELETE di fungsi bersarang atau handler anonim di bawah fungsi `hapus*` ikut dianggap sah.
export function g7(teks) {
  const t = bukanKomentarJs(teks), salah = [];
  for (const m of t.matchAll(/UPDATE\s+alun_riwayat\b/gi)) salah.push(`UPDATE alun_riwayat pada offset ${m.index}`);
  for (const m of t.matchAll(/DELETE\s+FROM\s+alun_riwayat\b/gi)) {
    const sebelum = t.slice(0, m.index);
    const dekl = [...sebelum.matchAll(/(?:function\s*\*?\s*(\w+)|(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?(?:function|\([^)]*\)\s*=>|\w+\s*=>)|^\s*(?:async\s+)?(\w+)\s*\([^)]*\)\s*\{)/gm)].pop();
    const nama = dekl ? (dekl[1] || dekl[2] || dekl[3]) : "";
    if (!/hapus/i.test(nama)) salah.push(`DELETE FROM alun_riwayat di luar fungsi hapus (fungsi: ${nama || "tak dikenal"})`);
  }
  return salah;
}

// ---- G-8: plafon pindai src/alun.js tidak boleh naik melewati nilai beku saat paket dimulai.
export const g8 = (pindai, maks) => typeof pindai[ "src/alun.js"] === "number" && pindai["src/alun.js"] > maks
  ? [`pindai src/alun.js ${pindai["src/alun.js"]} > batas beku ${maks}`] : [];

const gagal = (apa, akibat, perbaiki) => `${apa}. Akibat: ${akibat}. Perbaiki: ${perbaiki}. ${RUJUK}`;

// ============================== uji ==============================
test("G-1 mode gagal: bertahap() yang mendirikan kejadian dari sumbernya terdeteksi (logika nyata di Python)", () => {
  const dir = mkdtempSync(join(tmpdir(), "g1-"));
  const buruk = join(dir, "buruk.py"), baik = join(dir, "baik.py");
  writeFileSync(buruk, `def bertahap(rekaman, kj, sumber, diambil):\n    return [dict(aksi="baru", sumber=r["sumber"]) for r in rekaman], [], {}\n`);
  writeFileSync(baik, `def bertahap(rekaman, kj, sumber, diambil):\n    return [], [], {}\n`);
  assert.equal(g1(buruk).length, 1);
  assert.deepEqual(g1(baik), []);
  assert.equal(g1(join(dir, "tidak_ada.py")).length, 1, "kegagalan menjalankan = pelanggaran, bukan lulus diam-diam");
});
test("G-1 mengigit logika asli pasang.py: sumber lain tanpa kandidat memang menghasilkan 'baru' (bukti harness hidup)", () => {
  assert.equal(g1(AKAR + "scripts/siklus/pasang.py", "tugas_api").length, 1, "harness harus melihat 'baru' pada sumber biasa; kalau tidak, G-1 buta");
});
test("G-1 berkas nyata: bila pasang.py memuat sumber alun, alun tanpa kandidat tidak pernah 'baru'", () => {
  const t = baca("scripts/siklus/pasang.py");
  if (!pasangMemuatAlun(t)) return;
  assert.deepEqual(g1(AKAR + "scripts/siklus/pasang.py"), [], gagal("sumber alun menghasilkan aksi baru", "kiriman warga mendirikan kejadian resmi (D3 dilanggar)", "tambahkan cabang di bertahap() agar alun tanpa kandidat jatuh ke 'tanpa_wilayah'/ditunda, bukan 'baru'"));
});

test("G-2 mode gagal: penolakan baru-untuk-alun dikenali; ketiadaannya terdeteksi", () => {
  assert.equal(g2('if (x.aksi === "baru" && x.sumber === "alun") tolak("alun tak boleh mendirikan kejadian");').length, 0);
  assert.equal(g2('const a = x.aksi === "baru";\n// alun baru tolak').length, 1);
  assert.equal(g2("").length, 1);
  assert.ok(sumberAlunTerdaftar("const KT = {\n  tugas_api: [1],\n  alun: [2],\n};", ""));
  assert.ok(!sumberAlunTerdaftar("const KT = {\n  tugas_api: [1],\n};", 'import {PROV} from "./alun.js";'), "impor ./alun.js bukan sumber alun");
});
test("G-2 berkas nyata", () => {
  const terdaftar = sumberAlunTerdaftar(baca("src/hak.js"), ada("src/kejadian_tautan.js") ? baca("src/kejadian_tautan.js") : "");
  if (!terdaftar) return;
  assert.deepEqual(g2(baca("src/siklus_kejadian.js")), [], gagal("sumber alun terdaftar tetapi aksi baru tidak ditolak", "satu kiriman warga dapat membuat kejadian KJ- baru", 'di ingest/kejadian tolak aksi "baru" bila x.sumber === "alun"'));
});

test("G-3 mode gagal: rujukan rekap dan nama berkas data terdeteksi", () => {
  assert.equal(g3Teks("const r = await env.R2.get('siklus/saji/alun/rekap.json');").length, 1);
  assert.equal(g3Teks("// siklus/saji/alun hanya komentar").length, 0);
  assert.equal(g3Teks("import {rekap_ringkas} from './x.js'").length, 1);
  assert.equal(g3Nama(["public/data/alun_rekap_prov.json", "public/data/banjir.json"]).length, 1);
});
test("G-3 berkas nyata: public/data bersih; pb_ringkas.js dan api_v1.js tidak membaca rekap", () => {
  assert.deepEqual(g3Nama(dataPublik()), [], gagal("berkas rekap alun-alun ada di public/data", "angka tampil ke publik tanpa jawaban pemilik Q1", "pindahkan ke R2 siklus/saji/alun/ di balik sesi staf"));
  for (const r of dataPublik().filter(f => f.endsWith(".json") && statSize(f) < 2e6)) {
    const t = baca(r); if (/"alun_rekap"|"rekap_alun"/.test(t)) assert.fail(`${r} memuat kunci rekap alun-alun. ${RUJUK}`);
  }
  for (const r of ["src/pb_ringkas.js", "src/api_v1.js"]) if (ada(r)) assert.deepEqual(g3Teks(baca(r)), [], gagal(`${r} membaca rekap alun-alun`, "pemirsa/mitra melihat angka yang Q2/Q11 larang", "keluarkan rekap dari rute ini; hanya rute staf dan Layar Pimpinan"));
});
function statSize(r) { try { return readFileSync(AKAR + r).length; } catch { return 0; } }

test("G-4 mode gagal: kata aman utuh dan data contoh terdeteksi; keamanan dan komentar tidak", () => {
  assert.equal(g4('const s = "Wilayah aman";').length, 1);
  assert.equal(g4("const s = `status: Aman`;").length, 1);
  assert.equal(g4('const s = "keamanan data, pengaman, amanat";').length, 0);
  assert.equal(g4('// aman\nconst x = 1;').length, 0);
  assert.equal(g4('x = "wilayah aman"  # ok', true).length, 1);
  assert.equal(g4("const d = 'dummy';").length, 1);
  assert.equal(g4("const t = '🧪';").length, 1);
});
test("G-4 berkas nyata: alun_rekap.py dan src/alun_instansi.js", () => {
  if (ada("scripts/siklus/alun_rekap.py")) assert.deepEqual(g4(baca("scripts/siklus/alun_rekap.py"), true), [], gagal("alun_rekap.py menulis 'aman' atau data contoh", "layar menyatakan wilayah aman dari data warga (K7)", "buang kata itu dari keluaran; pakai 'belum ada laporan'"));
  if (ada("src/alun_instansi.js")) assert.deepEqual(g4(baca("src/alun_instansi.js")), [], gagal("alun_instansi.js menulis 'aman' atau data contoh", "pemberitahuan/layar menyatakan aman (K7) atau memuat data contoh", "buang literal itu"));
});

test("G-5 mode gagal: kunci terlarang di kedalaman mana pun terdeteksi", () => {
  assert.equal(g5({prov: {"32": {jenis: [{judul: "x"}]}}}).length, 1);
  assert.equal(g5({a: [{mk_id: 1, nama: "b"}], wa: "x"}).length, 3);
  assert.deepEqual(g5({prov: {"32": {banjir: 4, median_jam: 5}}, tamu: {banjir: 1}}), []);
});
test("G-5 berkas nyata: fixture rekap di tests/ (bila ada)", () => {
  const cand = [];
  const jalan = d => { for (const e of readdirSync(AKAR + d, {withFileTypes: true})) { const p = `${d}/${e.name}`; if (e.isDirectory()) { if (e.name !== "node_modules") jalan(p); } else if (/rekap.*\.json$/i.test(e.name) && /alun/i.test(p)) cand.push(p); } };
  jalan("tests");
  for (const f of cand) assert.deepEqual(g5(JSON.parse(baca(f))), [], gagal(`${f} memuat kunci pengenal`, "rekap membocorkan judul/nama/nomor warga (D14)", "hitung saja per wilayah, jenis bencana, dan jenis utas"));
});

test("G-6 mode gagal: layar yang tidak terdaftar terdeteksi", () => {
  assert.equal(g6("public/instansi_alun.js", "x", "y").length, 2);
  assert.equal(g6("public/instansi_alun.js", "'public/instansi_alun.js'", "[\"public/instansi_alun.js\"]").length, 0);
});
test("G-6 berkas nyata: public/instansi_alun.js terdaftar bila ada", () => {
  if (!ada("public/instansi_alun.js")) return;
  assert.deepEqual(g6("public/instansi_alun.js", baca("tests/agen/gerbang-kartu-std.test.mjs"), baca("tests/agen/gerbang-tanpa-kesimpulan.test.mjs")), [], gagal("layar alun belum terdaftar di gerbang kartu", "layar lahir tanpa penjagaan kartu standar", "tambahkan ke LAYAR kedua gerbang itu (dan SCOPE kartu_std.mjs)"));
});

test("G-7 mode gagal: UPDATE dan DELETE di luar fungsi hapus terdeteksi", () => {
  assert.equal(g7('await db.prepare("UPDATE alun_riwayat SET status=1").run();').length, 1);
  assert.equal(g7('async function ubah(c){ await c.env.DB.prepare("DELETE FROM alun_riwayat WHERE x=1").run(); }').length, 1);
  assert.equal(g7('async function hapusUtas(c){ await c.env.DB.prepare("DELETE FROM alun_riwayat WHERE utas=?").run(); }').length, 0);
  assert.equal(g7('const hapusUtas = async (c) => { c.prepare(`DELETE FROM alun_riwayat WHERE a`) }').length, 0);
  assert.equal(g7("// UPDATE alun_riwayat di komentar\nconst x=1").length, 0);
});
test("G-7 berkas nyata: src/**", () => {
  const salah = semuaSrc().flatMap(f => g7(baca(f)).map(s => `${f}: ${s}`));
  assert.deepEqual(salah, [], gagal("alun_riwayat diubah atau dihapus di luar fungsi hapus utas", "riwayat status tidak lagi append-only, jejak bantuan bisa dipalsukan (D11)", "hanya INSERT; penghapusan lewat fungsi hapusUtas moderasi"));
});

test("G-8 mode gagal dan berkas nyata: plafon pindai src/alun.js tidak naik", () => {
  assert.equal(g8({"src/alun.js": 10}, 9).length, 1);
  assert.deepEqual(g8({"src/alun.js": 9}, 9), []);
  const nyata = JSON.parse(baca("tests/agen/fixtures/d1-pindai.json"));
  assert.deepEqual(g8(nyata, FIX.pindai_maks_src_alun_js), [], gagal("plafon pindai src/alun.js naik di d1-pindai.json", "kueri pindai tabel penuh menambah beban kuota baca D1", "pasang indeks atau kueri SEARCH; jangan menaikkan plafon"));
});
