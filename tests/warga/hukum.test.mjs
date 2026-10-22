/* Pustaka Hukum BNPB (src/hukum.js, migrations/0049_hukum.sql, tool MCP *_peraturan_bnpb). Worker di Miniflare, D1 + FTS5 sungguhan, migrasi apa adanya.
   Satu-satunya stub: env.AI (layanan eksternal), lewat tests/warga/_hukum_worker.mjs. Jalankan: node --test tests/warga/hukum.test.mjs */
import assert from "node:assert/strict";
import {siapkan, berantai} from "./_bnpb.mjs";
import {readFileSync} from "node:fs";
import path from "node:path";
import {AKAR, pecah} from "./_bantu.mjs";
import {verifikasiKutipan, kueriFts, normTeks} from "../../src/hukum_spek.js";

const uji = berantai();
const U = await siapkan("uji-hukum", {skrip: "tests/warga/_hukum_worker.mjs"});
const {DB, api, n} = U;
let ipN = 0;
const ip = (h = {}) => ({"cf-connecting-ip": `198.51.100.${++ipN % 250}`, ...h});
const cari = (qs, h) => api("GET", "/api/hukum/cari?" + qs, undefined, ip(h));
const tanya = (pertanyaan, h = {}, alamat) => api("POST", "/api/hukum/tanya", {pertanyaan}, alamat ?? ip(h));
const rpc = (method, params, h = {}) => api("POST", "/mcp", {jsonrpc: "2.0", id: 1, method, params}, ip(h));
const alat = async (nama, args) => (await rpc("tools/call", {name: nama, arguments: args})).j.result;

const DOK = [
  ["perban-1-2026", "Peraturan", "Peraturan Badan", "PERBAN", "1", 2026, "Pedoman Dana Bersama Penanggulangan Bencana", "BERLAKU"],
  ["perka-2-2012", "Peraturan", "Peraturan Kepala", "PERKA", "2", 2012, "Pedoman Penyusunan Rencana Kontingensi", "DICABUT"],
  ["juknis-5-2023", "Peraturan", "Petunjuk Teknis", "JUKNIS", "5", 2023, "Petunjuk Teknis Logistik Posko Pengungsian", "BERLAKU"],
];
const SEG = [   // [dok, jenis, label, bab, teks]
  ["perban-1-2026", "menimbang", "Menimbang", null, "bahwa penyaluran dana bersama perlu diatur agar cepat dan akuntabel dalam penanggulangan bencana"],
  ["perban-1-2026", "pasal", "Pasal 1", "BAB I KETENTUAN UMUM", "Dana Bersama adalah dana yang dihimpun dari pemerintah dan masyarakat untuk penanggulangan bencana"],
  ["perban-1-2026", "pasal", "Pasal 5", "BAB II PRIORITAS PENYALURAN", "Penyaluran Dana Bersama diprioritaskan untuk kebutuhan dasar korban bencana paling lambat tujuh hari setelah penetapan status darurat"],
  ["perban-1-2026", "pasal", "Pasal 6", "BAB II PRIORITAS PENYALURAN", "Pertanggungjawaban penyaluran dilaporkan kepada Kepala Badan setiap bulan"],
  ["perka-2-2012", "pasal", "Pasal 1", "BAB I KETENTUAN UMUM", "Rencana kontingensi adalah proses perencanaan ke depan dalam keadaan tidak menentu"],
  ["perka-2-2012", "pasal", "Pasal 3", null, "Rencana kontingensi disusun untuk ancaman bencana banjir, gempa bumi, dan kebakaran hutan"],
  ["perka-2-2012", "penjelasan", "Penjelasan Pasal 3", null, "Cukup jelas"],
  ["juknis-5-2023", "pasal", "Pasal 2", null, "Posko pengungsian wajib menyediakan logistik makanan, air bersih, dan selimut bagi pengungsi"],
  ["juknis-5-2023", "lampiran", "Lampiran hal. 12", null, "Daftar periksa logistik posko: beras, air minum, tenda keluarga, dan obat-obatan dasar"],
  ["juknis-5-2023", "lain", "Penutup", null, "Petunjuk teknis ini mulai berlaku pada tanggal ditetapkan"],
];
let idSeg = {};   // "dok|label" -> id

uji("migrasi 0049 idempoten: dijalankan ulang tidak galat, tabel tetap ada", async () => {
  const baris = pecah(readFileSync(path.join(AKAR, "migrations/0049_hukum.sql"), "utf8")); assert.equal(baris.length, 7, "4 tabel + 3 indeks");
  await DB.batch(baris.map(s => DB.prepare(s)));
  for (const t of ["hukum_dok", "hukum_segmen", "hukum_fts", "hukum_relasi"]) assert.equal(await n(t), 0, t);
});

uji("sebelum diisi dan tanpa tabel: tabel kosong membalas 200 kosong; tabel hilang 503 (bukan 500)", async () => {
  const r = await cari("q=dana"); assert.equal(r.s, 200, r.t); assert.equal(r.j.total, 0);
  await DB.prepare("ALTER TABLE hukum_relasi RENAME TO hukum_relasi_x").run();
  assert.equal((await api("GET", "/api/hukum/dok?id=perban-1-2026", undefined, ip())).s, 404, "dok tidak ada dulu = 404 sebelum relasi dibaca");
  await DB.prepare("ALTER TABLE hukum_dok RENAME TO hukum_dok_x").run();
  assert.equal((await cari("q=dana")).s, 503); assert.equal((await tanya("apa itu dana bersama")).s, 503);
  await DB.prepare("ALTER TABLE hukum_dok_x RENAME TO hukum_dok").run(); await DB.prepare("ALTER TABLE hukum_relasi_x RENAME TO hukum_relasi").run();
});

uji("CHECK: jenis segmen dan jenis relasi di luar daftar ditolak langsung di D1; teks > 6000 ditolak", async () => {
  await DB.prepare("INSERT INTO hukum_dok (id, judul) VALUES ('uji-0-0000', 'x')").run();
  const salah = async (sql, ...b) => assert.rejects(DB.prepare(sql).bind(...b).run(), /CHECK|constraint/i, sql);
  await salah("INSERT INTO hukum_segmen (dok, urut, jenis, label, teks) VALUES ('uji-0-0000', 1, 'liar', 'x', 'y')");
  await salah("INSERT INTO hukum_segmen (dok, urut, jenis, label, teks) VALUES ('uji-0-0000', 1, 'pasal', 'x', ?)", "a".repeat(6001));
  await salah("INSERT INTO hukum_relasi (dari, ke, jenis) VALUES ('a', 'b', 'liar')");
  await salah("INSERT INTO hukum_relasi (dari, ke, jenis, terdaftar) VALUES ('a', 'b', 'merujuk', 2)");
  await DB.prepare("DELETE FROM hukum_dok WHERE id = 'uji-0-0000'").run();
  assert.equal(await n("hukum_segmen"), 0);
});

uji("seed mini: 3 dokumen, 10 segmen, FTS terisi, relasi", async () => {
  for (const d of DOK) await DB.prepare("INSERT INTO hukum_dok (id, tipe, jenis, singkatan, nomor, tahun, judul, status, url, pdf) VALUES (?,?,?,?,?,?,?,?,?,?)")
    .bind(...d, `https://jdih.bnpb.go.id/dokumen/${d[0]}`, JSON.stringify([`https://jdih.bnpb.go.id/${d[0]}.pdf`])).run();
  let urut = 0;
  for (const [dok, jenis, label, bab, teks] of SEG) {
    const r = await DB.prepare("INSERT INTO hukum_segmen (dok, urut, jenis, label, bab, halaman, teks) VALUES (?,?,?,?,?,?,?)").bind(dok, ++urut, jenis, label, bab, 1, teks).run();
    idSeg[dok + "|" + label] = r.meta.last_row_id;
    await DB.prepare("INSERT INTO hukum_fts (rowid, teks, label, judul) VALUES (?,?,?,?)").bind(r.meta.last_row_id, teks, label, DOK.find(d => d[0] === dok)[6]).run();
  }
  await DB.batch([
    DB.prepare("INSERT INTO hukum_relasi (dari, ke, jenis, terdaftar, ke_judul) VALUES ('perban-1-2026', 'perka-2-2012', 'mencabut', 1, NULL)"),
    DB.prepare("INSERT INTO hukum_relasi (dari, ke, jenis, terdaftar, ke_judul) VALUES ('perban-1-2026', 'uu-24-2007', 'mengingat', 0, 'Undang-Undang Nomor 24 Tahun 2007 tentang Penanggulangan Bencana')"),
    DB.prepare("INSERT INTO hukum_relasi (dari, ke, jenis, terdaftar) VALUES ('juknis-5-2023', 'perban-1-2026', 'merujuk', 1)")]);
  assert.equal(await n("hukum_segmen"), 10); assert.equal(await n("hukum_fts"), 10);
});

uji("cari: menemukan pasal yang benar, urut relevansi, cuplikan bertanda [[ ]]", async () => {
  const r = await cari("q=" + encodeURIComponent("penyaluran diprioritaskan")); assert.equal(r.s, 200, r.t);
  assert.ok(r.j.total >= 1); assert.equal(r.j.hasil[0].label, "Pasal 5"); assert.equal(r.j.hasil[0].dok, "perban-1-2026"); assert.equal(r.j.hasil[0].segmen, idSeg["perban-1-2026|Pasal 5"]);
  assert.match(r.j.hasil[0].cuplikan, /\[\[/); assert.equal(r.j.hasil[0].singkatan, "PERBAN"); assert.equal(r.j.hasil[0].tahun, 2026);
  const aksen = await cari("q=" + encodeURIComponent("PÉNYALURAN DIPRIORITASKAN")); assert.equal(aksen.j.hasil[0].label, "Pasal 5", "huruf besar dan diakritik dinormalkan FTS");
  const label = await cari("q=" + encodeURIComponent("pasal 5")); assert.equal(label.j.hasil[0].label, "Pasal 5", "label ikut diindeks");
});

uji("cari: filter jenis, tahun, status bekerja dan bisa digabung; halaman di luar jangkauan kosong", async () => {
  const q = "q=" + encodeURIComponent("rencana kontingensi bencana");
  assert.ok((await cari(q)).j.total >= 1);
  const labels = r => new Set(r.j.hasil.map(h => h.dok));
  assert.deepEqual([...labels(await cari("q=pasal&jenis=PERKA"))], ["perka-2-2012"]);
  assert.deepEqual([...labels(await cari("q=pasal&jenis=Peraturan%20Badan"))], ["perban-1-2026"], "jenis lengkap juga diterima");
  assert.deepEqual([...labels(await cari("q=pasal&tahun=2023"))], ["juknis-5-2023"]);
  assert.deepEqual([...labels(await cari("q=pasal&status=dicabut"))], ["perka-2-2012"], "status tak peka huruf");
  assert.equal((await cari("q=pasal&tahun=2023&jenis=PERKA")).j.total, 0);
  const jauh = await cari("q=pasal&hal=50"); assert.equal(jauh.s, 200); assert.equal(jauh.j.hasil.length, 0); assert.ok(jauh.j.total > 0);
});

uji("cari: masukan liar 400; sintaks FTS liar tidak pernah 500", async () => {
  for (const qs of ["", "q=", "q=%20%20", "q=!!!", "q=" + "a".repeat(201), "q=dana&tahun=abc", "q=dana&tahun=1800", "q=dana&hal=0", "q=dana&hal=x", "q=dana&jenis=%3B%20DROP", "q=dana&status=%27%27"])
    assert.equal((await cari(qs)).s, 400, qs);
  const liar = ['"', '""', 'dana"', '*', 'dana*', 'NEAR(', 'NEAR(dana bersama, 2)', ')', '(dana', 'dana OR', 'AND', 'NOT dana', 'teks:dana', '-dana', 'dana ^ bersama', "'; DROP TABLE hukum_dok; --", '{teks}: dana', '\\'];
  for (const q of liar) { const r = await cari("q=" + encodeURIComponent(q)); assert.ok(r.s === 200 || r.s === 400, `${q} -> ${r.s} ${r.t.slice(0, 120)}`); }
  assert.equal(await n("hukum_dok"), 3);
  assert.equal(kueriFts('NEAR(dana "bersama") *'), '"near" "dana" "bersama"');
});

uji("dok: metadata + segmen berurut + relasi keluar/masuk; tidak ada = 404; id liar = 400", async () => {
  const r = await api("GET", "/api/hukum/dok?id=perban-1-2026", undefined, ip()); assert.equal(r.s, 200, r.t);
  assert.equal(r.j.judul, DOK[0][6]); assert.deepEqual(r.j.pdf, ["https://jdih.bnpb.go.id/perban-1-2026.pdf"]);
  assert.deepEqual(r.j.segmen.map(s => s.label), ["Menimbang", "Pasal 1", "Pasal 5", "Pasal 6"]);
  assert.deepEqual(r.j.relasi.keluar.map(x => [x.id, x.jenis, x.terdaftar]).sort(), [["perka-2-2012", "mencabut", 1], ["uu-24-2007", "mengingat", 0]]);
  assert.match(r.j.relasi.keluar.find(x => x.id === "uu-24-2007").judul, /Nomor 24 Tahun 2007/, "rujukan tak terdaftar memakai ke_judul");
  assert.equal(r.j.relasi.keluar.find(x => x.id === "perka-2-2012").judul, DOK[1][6], "yang terdaftar memakai judul dokumen");
  assert.deepEqual(r.j.relasi.masuk.map(x => x.id), ["juknis-5-2023"]);
  assert.equal((await api("GET", "/api/hukum/dok?id=tidak-ada-1-2000", undefined, ip())).s, 404);
  for (const id of ["", "A_B", "x", "../etc"]) assert.equal((await api("GET", "/api/hukum/dok?id=" + encodeURIComponent(id), undefined, ip())).s, 400, id);
});

uji("tanya tanpa AI: segmen teratas, model null, tidak ada jawaban karangan", async () => {
  const r = await tanya("Kapan dana bersama harus disalurkan?"); assert.equal(r.s, 200, r.t);
  assert.equal(r.j.model, null); assert.equal(r.j.jawaban, null); assert.deepEqual(r.j.kutipan, []);
  assert.ok(r.j.segmen_dipakai.length >= 1 && r.j.segmen_dipakai.length <= 8); assert.ok(r.j.segmen_dipakai.some(s => s.label === "Pasal 5"));
  const kosong = await tanya("zzzxqv qqqwww"); assert.equal(kosong.s, 200); assert.match(kosong.j.jawaban, /Tidak ditemukan/); assert.deepEqual(kosong.j.segmen_dipakai, []);
});

uji("tanya: pertanyaan liar 400, body bukan JSON 400", async () => {
  for (const p of ["", "abc", "x".repeat(501), 5, null, "yang dan di ke"]) assert.equal((await tanya(p)).s, 400, String(p).slice(0, 10));
  assert.equal((await api("POST", "/api/hukum/tanya", "{bukan", ip())).s, 400);
});

uji("tanya dengan model (stub): kutipan sah beda spasi/huruf diterima, karangan dan segmen yang tidak dikirim dibuang", async () => {
  const r = await tanya("Kapan dana bersama harus disalurkan?", {"x-ai": "ok"}); assert.equal(r.s, 200, r.t);
  assert.equal(r.j.dibuang, 2); assert.equal(r.j.kutipan.length, 1); assert.match(r.j.model, /llama/);
  assert.equal(r.j.jawaban, r.j.kutipan[0].pernyataan, "hanya pernyataan yang kutipannya sah"); assert.equal(r.j.ringkasan_model, true);
  const asliSeg = (await DB.prepare("SELECT teks FROM hukum_segmen WHERE id = ?").bind(r.j.kutipan[0].segmen).first()).teks;
  assert.ok(asliSeg.includes(r.j.kutipan[0].teks), "kutipan = substring PERSIS segmen asli, bukan ketikan model (model menulis HURUF BESAR + spasi ganda)");
  assert.doesNotMatch(r.t, /sepuluh miliar|Klaim ke segmen lain/, "teks model tanpa kutipan sah tidak pernah keluar");
  assert.ok(normTeks(r.j.segmen_dipakai.find(s => s.segmen === r.j.kutipan[0].segmen).teks).includes(normTeks(r.j.kutipan[0].teks).slice(0, 30)));
  assert.ok(r.j.kutipan[0].dok && r.j.kutipan[0].label);
  const t = await tanya("Kapan dana bersama harus disalurkan?", {"x-ai": "teks"}); assert.equal(t.j.kutipan.length, 1, "JSON di dalam kalimat tetap terbaca"); assert.equal(t.j.dibuang, 0);
});

uji("tanya dengan model: semua karangan = 'tidak ditemukan', teks model tidak tampil; model rusak = jatuh ke segmen", async () => {
  const p = await tanya("Kapan dana bersama harus disalurkan?", {"x-ai": "palsu"});
  assert.equal(p.j.dibuang, 2); assert.deepEqual(p.j.kutipan, []); assert.equal(p.j.jawaban, null, "segmen ada tapi semua kutipan dibuang: bukan TIDAK_ADA"); assert.ok(p.j.segmen_dipakai.length); assert.doesNotMatch(p.t, /sepuluh miliar/);
  const b = await tanya("Kapan dana bersama harus disalurkan?", {"x-ai": "bebas"});
  assert.equal(b.j.dibuang, 1); assert.deepEqual(b.j.kutipan, []); assert.equal(b.j.jawaban, null); assert.doesNotMatch(b.t, /sepuluh miliar/, "klaim bebas dengan kutipan asli generik dibuang");
  const m = await tanya("Kapan dana bersama harus disalurkan?", {"x-ai": "rusak"}); assert.equal(m.s, 200); assert.equal(m.j.model, null); assert.ok(m.j.segmen_dipakai.length);
});

uji("verifikasiKutipan (murni): substring dinormalkan, hasil = potongan ASLI; karangan, segmen tak terkirim, kutipan pendek/sedikit kata, klaim bebas, bentuk rusak dibuang", () => {
  const S1 = "Penyaluran  Dana Bersama diprioritaskan untuk “kebutuhan dasar” korban bencana", S2 = "Penjelasan ini cukup jelas sekali dan tidak perlu diuraikan lagi oleh pembentuk aturan", S3 = "Pertanggungjawaban penyelenggaraan kelembagaan";
  const kirim = new Map([[1, S1], [2, S2], [3, S3]]);
  const k = (segmen, teks, pernyataan = "Dana Bersama diprioritaskan untuk kebutuhan dasar") => ({pernyataan, kutipan: {segmen, teks}});
  const {sah, dibuang} = verifikasiKutipan([
    k(1, "dana bersama   DIPRIORITASKAN untuk \"kebutuhan dasar\" korban"),   // beda spasi, huruf, jenis kutip
    k(1, "Dana Bersama dibagikan merata kepada semua warga desa pada setiap bulan"),   // karangan
    k(9, "Penjelasan ini cukup jelas sekali dan tidak perlu diuraikan lagi", "Penjelasan cukup jelas diuraikan"),   // segmen tidak dikirim
    k(2, "Penjelasan ini cukup jelas sekali dan tidak perlu diuraikan lagi", "Penjelasan ini cukup jelas sekali"),   // sah
    k(2, "cukup jelas", "cukup jelas"),   // terlalu pendek
    k("2", "PENJELASAN ini cukup jelas sekali dan tidak perlu diuraikan", "Penjelasan ini cukup jelas diuraikan"),   // id teks tetap dikenali
    k(1, "Dana Bersama diprioritaskan untuk kebutuhan dasar korban", ""),   // tanpa pernyataan
    k(1, "Dana Bersama diprioritaskan untuk kebutuhan dasar korban", "Denda sepuluh miliar rupiah dikenakan kepada pelanggar"),   // klaim bebas, kutipan asli generik
    k(3, "Pertanggungjawaban penyelenggaraan kelembagaan", "Pertanggungjawaban penyelenggaraan kelembagaan"),   // 3 kata saja
    {pernyataan: "x"}, null, "bukan objek",
  ], kirim);
  assert.deepEqual(sah.map(s => s.segmen), [1, 2, 2]);
  assert.equal(dibuang, 9);
  assert.equal(sah[0].teks, "Dana Bersama diprioritaskan untuk “kebutuhan dasar” korban", "yang dikembalikan potongan asli segmen, bukan ketikan model");
  for (const s of sah) assert.ok(kirim.get(s.segmen).includes(s.teks), s.teks);
  assert.deepEqual(verifikasiKutipan(undefined, kirim), {sah: [], dibuang: 0});
  assert.deepEqual(verifikasiKutipan("x", kirim), {sah: [], dibuang: 0});
});

uji("MCP: tiga tool publik muncul di tools/list; cari/baca/relasi mengembalikan hasil dari D1 yang sama", async () => {
  const l = (await rpc("tools/list")).j.result.tools.map(t => t.name);
  for (const t of ["cari_peraturan_bnpb", "baca_peraturan_bnpb", "relasi_peraturan_bnpb"]) assert.ok(l.includes(t), t);
  const d = (await rpc("tools/list")).j.result.tools.find(t => t.name === "cari_peraturan_bnpb").description; assert.match(d, /pasal\.id/); assert.match(d, /label pasal/i);
  const c = await alat("cari_peraturan_bnpb", {q: "penyaluran diprioritaskan", limit: 3}); assert.ok(!c.isError, JSON.stringify(c));
  const cj = JSON.parse(c.content[0].text); assert.equal(cj.hasil[0].label, "Pasal 5"); assert.equal(cj.hasil[0].dok, "perban-1-2026");
  assert.deepEqual(JSON.parse((await alat("cari_peraturan_bnpb", {q: "pasal 3", tahun: 2012})).content[0].text).hasil.map(h => h.dok), ["perka-2-2012", "perka-2-2012"]);
  const b = JSON.parse((await alat("baca_peraturan_bnpb", {id: "perban-1-2026", pasal: "Pasal 5"})).content[0].text);
  assert.equal(b.segmen.length, 1); assert.match(b.segmen[0].teks, /tujuh hari/);
  assert.equal(JSON.parse((await alat("baca_peraturan_bnpb", {id: "perban-1-2026", pasal: "5"})).content[0].text).segmen[0].label, "Pasal 5", "nomor saja cukup");
  const penuh = JSON.parse((await alat("baca_peraturan_bnpb", {id: "perban-1-2026"})).content[0].text); assert.deepEqual(penuh.daftar_isi, ["Menimbang", "Pasal 1", "Pasal 5", "Pasal 6"]);
  const re = JSON.parse((await alat("relasi_peraturan_bnpb", {id: "perban-1-2026"})).content[0].text); assert.equal(re.keluar.length, 2); assert.equal(re.masuk[0].id, "juknis-5-2023");
});

uji("MCP: galat input/data = isError yang bisa dibaca model (bukan error protokol, bukan 500)", async () => {
  for (const [nama, args, pola] of [["cari_peraturan_bnpb", {}, /wajib/], ["cari_peraturan_bnpb", {q: "x", bukan: 1}, /tidak dikenal/], ["cari_peraturan_bnpb", {q: "!!!"}, /berisi kata/],
    ["baca_peraturan_bnpb", {id: "tidak-ada-1-2000"}, /tidak ada/], ["baca_peraturan_bnpb", {id: "perban-1-2026", pasal: "Pasal 99"}, /tidak ada/], ["baca_peraturan_bnpb", {id: "../x"}, /berformat salah/],
    ["relasi_peraturan_bnpb", {id: "tidak-ada-1-2000"}, /tidak ada/]]) {
    const r = await alat(nama, args); assert.equal(r.isError, true, nama + JSON.stringify(args)); assert.match(r.content[0].text, pola, nama);
  }
});

uji("metode salah dan masukan besar: GET tanya dan POST cari tidak dilayani rute; body besar 413; galat 400 berulang tetap 400", async () => {
  for (const [m, j] of [["GET", "/api/hukum/tanya"], ["POST", "/api/hukum/cari?q=dana"]]) { const r = await api(m, j, m === "POST" ? {} : undefined, ip()); assert.ok(r.s >= 400 && r.s < 500 && r.s !== 200, `${m} ${j} -> ${r.s}`); }
  assert.equal((await tanya("a".repeat(6000))).s, 413);
  for (let i = 0; i < 3; i++) assert.equal((await cari("q=!!!")).s, 400, "400 tidak ter-cache jadi 200");
  const d = await api("GET", "/api/hukum/dok?id=perban-1-2026", undefined, ip()); assert.equal(d.j.relasi_tersedia, true);
  await DB.prepare("ALTER TABLE hukum_relasi RENAME TO hukum_relasi_x").run();
  try { const x = await api("GET", "/api/hukum/dok?id=juknis-5-2023", undefined, ip()); assert.equal(x.s, 200); assert.equal(x.j.relasi_tersedia, false); assert.deepEqual(x.j.relasi, {keluar: [], masuk: []}); }
  finally { await DB.prepare("ALTER TABLE hukum_relasi_x RENAME TO hukum_relasi").run(); }
});

uji("plafon global tanya: habis = 429 SEBELUM model dipanggil; tanpa model tidak terkena", async () => {
  const kini = Date.now();
  await DB.prepare("DELETE FROM laju_bnpb WHERE kunci = 'global'").run();   // panggilan model uji sebelumnya ikut terhitung
  await DB.batch(Array.from({length: 300}, () => DB.prepare("INSERT INTO laju_bnpb (kunci, aksi, waktu) VALUES ('global', 'hukum.tanya', ?)").bind(kini)));
  const r = await tanya("Kapan dana bersama harus disalurkan?", {"x-ai": "ok"}); assert.equal(r.s, 429, r.t); assert.ok(Number(r.h.get("retry-after")) > 0);
  assert.equal((await tanya("Kapan dana bersama harus disalurkan?")).s, 200, "tanpa model = tanpa biaya, tidak dihitung");
  assert.equal(await n("laju_bnpb", "kunci = 'global'"), 300);
  await DB.prepare("DELETE FROM laju_bnpb WHERE kunci = 'global'").run();
});

uji("tanpa data pribadi: respons publik tidak memuat hash IP atau kolom internal", async () => {
  const semua = (await cari("q=pasal")).t + (await api("GET", "/api/hukum/dok?id=perban-1-2026", undefined, ip())).t;
  assert.doesNotMatch(semua, /198\.51\.100|garam-uji|ip_hash|kunci/);
});

uji("halaman /bnpb/hukum: aset belum ada = 404 bersih (bukan 500)", async () => {
  const r = await api("GET", "/bnpb/hukum", undefined, ip()); assert.ok([200, 404].includes(r.s), String(r.s));
});

uji("laju: cari 429 lewat batas per jam; tanya jauh lebih ketat dan 429 membawa retry-after", async () => {
  const tetap = {"cf-connecting-ip": "203.0.113.77"};
  let s = 200, i = 0; while (s === 200 && i < 130) s = (await api("GET", `/api/hukum/cari?q=dana${i++}`, undefined, tetap)).s;
  assert.equal(s, 429); assert.ok(i > 100 && i <= 125, `429 pada permintaan ke-${i}`);
  const t2 = {"cf-connecting-ip": "203.0.113.78"}; let st = 200, j = 0, h;
  while (st !== 429 && j < 12) { const r = await api("POST", "/api/hukum/tanya", {pertanyaan: "dana bersama penyaluran"}, t2); st = r.s; h = r.h; j++; }
  assert.equal(st, 429); assert.ok(j <= 9, `tanya 429 pada permintaan ke-${j}`); assert.ok(Number(h.get("retry-after")) > 0);
});
