// PB-18: layar renlap lintas bencana (public/inti/renlap.js). Murni diuji lewat vm; sisanya gerbang statis.
import test from "node:test"; import assert from "node:assert/strict"; import fs from "node:fs"; import vm from "node:vm";
const baca = p => fs.readFileSync(new URL("../../" + p, import.meta.url), "utf8");
const win = {}; win.window = win; vm.runInContext(baca("public/inti/renlap.js"), vm.createContext({window: win, Intl, console}));
const R = win.PbRenlap, ALASAN_DB = ["akses_terputus", "cuaca", "sarana_kurang", "warga_menolak", "sudah_aman", "lokasi_salah", "lainnya"];

test("alasan: semua kode CHECK 0130 berlabel; sudah_aman tampil sebagai tidak diperlukan lagi", () => {
  const m = baca("migrations/0130_paritas_operasi.sql").match(/alasan IN \(([^)]*)\)/)[1].match(/[a-z_]+/g);
  assert.deepEqual(m.sort(), [...ALASAN_DB].sort());
  for (const k of ALASAN_DB) assert.ok(R.ALASAN[k], k);
  assert.equal(R.labelAlasan("sudah_aman"), "Tidak diperlukan lagi");
  for (const t of [...Object.values(R.ALASAN), ...Object.values(R.STATUS), ...Object.values(R.HASIL)]) assert.doesNotMatch(t, /aman/i);
  assert.doesNotMatch(baca("public/inti/renlap.js").replace(/sudah_aman[^,}]*/g, ""), /["'][^"'\n]*\baman\b[^"'\n]*["']/i);
});
test("diminta lebih dari 30 menit dibaca gagal, ulangi; kurang dari itu tetap diproses", () => {
  const kini = 1e12, r = dibuat => ({status: "diminta", dibuat});
  assert.equal(R.labelStatus(r(kini - 31 * 60e3), kini), "Gagal, ulangi"); assert.equal(R.labelStatus(r(kini - 5 * 60e3), kini), "Diminta, diproses");
  assert.equal(R.labelStatus({status: "terbit", dibuat: 0}, kini), "Terbit");
});
test("unduh hanya untuk draf, terbit, selesai; tidak ada PDF", () => {
  for (const s of ["draf", "terbit", "selesai"]) assert.ok(R.bisaUnduh({status: s})); for (const s of ["diminta", "gagal", "dibatalkan"]) assert.ok(!R.bisaUnduh({status: s}));
  assert.equal(R.FORMAT.map(x => x[0]).join(), "kml,gpx,json"); assert.doesNotMatch(baca("public/inti/renlap.js"), /fmt=pdf|"PDF"/i);
});
test("target diratakan berurut dari base dan patroli; butir hanya memuat alasan bila tidak didatangi", () => {
  const t = R.targetDari({base: [{nama: "A", patroli: [{tempat: "Kec X"}, {kec: "Kec Y"}]}, {nama: "B", patroli: [{}]}]});
  assert.deepEqual(JSON.parse(JSON.stringify(t.map(x => [x.no, x.nama]))), [[1, "Kec X"], [2, "Kec Y"], [3, "Target 3"]]); assert.equal(R.targetDari(null).length, 0);
  const b = R.butirDari([{no: 1, didatangi: "1", alasan: "cuaca", hasil: "selesai", catatan: " ok "}, {no: 2, didatangi: "0", alasan: "sudah_aman"}, {no: 3, didatangi: ""}]);
  assert.deepEqual(JSON.parse(JSON.stringify(b)), [{target_no: 1, didatangi: true, hasil: "selesai", catatan: "ok"}, {target_no: 2, didatangi: false, alasan: "sudah_aman"}, {target_no: 3, didatangi: null}]);
  assert.equal(R.potong(Array.from({length: 250}, (_, i) => i), R.MAKS_BUTIR).length, 3);
});
test("kepatuhan: belum_diisi terpisah dari tidak didatangi; persen berkoma", () => {
  const k = R.ringkasKepatuhan({didatangi: 6, target: 10, belum_diisi: 2, persen: 60.5, per_alasan: {cuaca: 1, sudah_aman: 3, tanpa_alasan: 1}});
  assert.equal(k.belum_diisi, 2); assert.equal(k.tidakJumlah, 5); assert.deepEqual([...k.tidak[0]], ["Tidak diperlukan lagi", 3]);
  assert.equal(R.ringkasKepatuhan({}).persen, undefined);
});
test("galat: pesan server menang, kode dikenal ramah", () => {
  assert.equal(R.galatRamah(400, {galat: "x"}), "x"); assert.match(R.galatRamah(409, null), /berubah/); assert.match(R.galatRamah(418, null), /418/);
});
test("aman teks: textContent, tanpa inline, tanpa kapital dipaksa, tanpa titik tengah, tanpa subjudul", () => {
  const js = baca("public/inti/renlap.js"), css = baca("public/inti/renlap.css");
  assert.doesNotMatch(js, /innerHTML|insertAdjacentHTML|outerHTML|document\.write|\beval\(|alert\(|confirm\(|prompt\(/);
  assert.doesNotMatch(css, /text-transform\s*:\s*uppercase/); assert.doesNotMatch(css, /border[^;{]*:\s*\d+px\s+solid[^;{]*;[^}]*\.rl-/);
  assert.doesNotMatch(js, /["'][^"'\n]*[ ]·[ ][^"'\n]*["']/); assert.doesNotMatch(js, /Sumber:|class="ex-ft"|ops-lead/);
});
test("kartu: kepala = nama seksi berikon, rute sesuai kontrak, 100 baris, kerja berat ditunda", () => {
  const js = baca("public/inti/renlap.js");
  for (const n of ['"Renlap", "renlap"', '"Hasil tindakan", "hasil"', '"Kepatuhan", "patuh"']) assert.ok(js.includes(n), n);
  for (const r of ["/api/pb/renlap?", '"/api/pb/renlap"', "/api/pb/renlap/terbit", "/api/pb/renlap/selesai-tandai", "/api/pb/renlap/berkas?id=", "/api/pb/hasil", "/api/pb/kepatuhan?"]) assert.ok(js.includes(r), r);
  assert.equal(R.MAKS_BARIS, 100); assert.match(js, /slice\(0, S\.batas\)/); assert.match(js, /requestAnimationFrame/);
  assert.match(js, /gambarTabel\(\) \{\s*if \(S\.tutup\) return;/); assert.match(js, /tutup\(\) \{ S\.tutup = true/);
});
test("terpasang di /operasi bersama seksi sarana, hanya lewat registri (karhutla tak berubah)", () => {
  const js = baca("public/operasi_laporan.js");
  assert.match(js, /b\.id !== "karhutla" && b\.kemampuan\?\.operasi === true/); assert.match(js, /PbRenlap\.pasang\(isi2, \{bencana: b\.id, tindakan:/); assert.match(js, /\/inti\/renlap\.js/); assert.match(js, /\/inti\/renlap\.css/);
});
test("PB-18 perbaikan: pilih renlap baru mengosongkan isian lama, catatan keselamatan tetap, muat gagal tidak di-cache", () => {
  const js = baca("public/inti/renlap.js"), lp = baca("public/operasi_laporan.js");
  assert.match(js, /S\.target = \[\]; hasilWadah\.replaceChildren\(\); simpanB\.hidden = true;/);
  assert.match(R.catatanDari(null), /bukan perintah terbang\. Skor hipotesis\./);
  assert.doesNotMatch(R.catatanDari({catatan: "USULAN x", bobot_label: "HIPOTESIS"}), /[A-Z]{3,}/);   // tanpa huruf kapital dari mesin
  assert.match(js, /\[alat, aksi, status, tabelWadah, catat,/);
  assert.match(lp, /renlap\.js\?v=2"\)\.catch\(\(\) => 0\)/); assert.match(lp, /pbMuat = null/);
});
test("TO-05: butirDari membawa tindakan hanya bila disentuh, urut registri", () => {
  const b = R.butirDari([{no: 1, didatangi: "1", tindakan: new Set(["pompa", "evakuasi"])}, {no: 2, didatangi: "1", tindakan: new Set()}, {no: 3, didatangi: "1"}], ["evakuasi", "pompa"]);
  assert.deepEqual(JSON.parse(JSON.stringify(b.map(x => x.tindakan))), [["evakuasi", "pompa"], [], null]);
  assert.ok(!("tindakan" in b[2]));
});
test("TO-05: kepatuhan per_tindakan berlabel, urut n turun, kode asing apa adanya", () => {
  const k = R.ringkasKepatuhan({per_tindakan: {pompa: 2, evakuasi: 5, xyz: 1}}, [["evakuasi", "Evakuasi warga"], ["pompa", "Penyedotan genangan"]]);
  assert.deepEqual(JSON.parse(JSON.stringify(k.tindakan)), [["Evakuasi warga", 5], ["Penyedotan genangan", 2], ["xyz", 1]]);
  assert.equal(R.ringkasKepatuhan({}).tindakan.length, 0);
});
test("TO-05: persen logbook bilangan bulat; bencana tak ada di logbook = tidak tercatat", () => {
  const lb = {jenis: {banjir: {n: 1000, tindakan: {evakuasi: 731, pompa: 5}}}};
  assert.equal(R.persenLogbook(lb, "banjir", "evakuasi"), 73); assert.equal(R.persen(73), "73 persen"); assert.equal(R.persen(null), "–");
  assert.equal(R.persenLogbook(lb, "udara", "evakuasi"), null); assert.equal(R.persenLogbook(null, "banjir", "x"), null);
  assert.equal(R.persenLogbook(lb, "banjir", "tak_ada"), 0);
});
test("TO-05: kartu Tindakan pertama, kolom hasil, pesan tindakan:false, tanpa warna literal", () => {
  const js = baca("public/inti/renlap.js"), css = baca("public/inti/renlap.css"), lp = baca("public/operasi_laporan.js");
  assert.ok(js.includes('"Tindakan", "tindakan"')); assert.match(js, /replaceChildren\(\.\.\.\(kT \? \[kT\] : \[\]\), k1, k2, k3\)/);
  assert.ok(js.includes("/data/bnpb/logbook_tindakan.json")); assert.match(js, /r\.j\.tindakan === false && r\.j\.pesan/); assert.match(js, /persen kejadian berisi di logbook Pusdalops 2011-2026/);
  assert.doesNotMatch(css.slice(css.indexOf(".rl-bar")), /#[0-9a-f]{3,6}\b|rgb\(/i); assert.match(lp, /j\?\.tindakan/);
});
test("TO-05 INP: isi details malas lewat toggle ter-delegasi, tampilkan lagi hanya append, logbook cache modul, pil banyak", () => {
  const js = baca("public/inti/renlap.js"), lp = baca("public/operasi_laporan.js"), pc = baca("public/operasi_peta.css");
  assert.match(js, /function daftarTdk\(pilih\) \{ const d = el\("details", "rl-tdk"\); d\.append\(el\("summary"/); assert.doesNotMatch(js.slice(js.indexOf("function daftarTdk"), js.indexOf("function barisHasil")), /checkbox/);
  assert.match(js, /addEventListener\("toggle", e => \{[\s\S]*?\}, true\)/); assert.match(js, /tb\.append\(\.\.\.S\.target\.slice\(dari, S\.batasT\)/);
  assert.match(js, /let lbJanji = null;/); assert.match(js, /if \(!j\) lbJanji = null/);
  assert.match(lp, /ops-kat-banyak/); assert.match(pc, /\.ops-kat\.ops-kat-banyak\{grid-auto-flow:row;grid-template-columns:repeat\(auto-fit,minmax\(170px,1fr\)\)/);
});
test("TO-05: tiga keadaan kartu Tindakan, title kolom, rekap target", () => {
  const js = baca("public/inti/renlap.js");
  for (const t of ["memuat data", "data logbook belum bisa dimuat", "tidak tercatat", "pencocokan kata kunci, bisa kurang atau lebih dari kenyataan", "data dibuat ", "kejadian berisi", '" target"']) assert.ok(js.includes(t), t);
  assert.match(js, /gambarTindakan\("memuat"\)/); assert.match(js, /lb \? "ada" : "gagal"/);
});
