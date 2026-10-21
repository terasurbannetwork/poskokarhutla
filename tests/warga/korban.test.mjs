/* Laporan korban jiwa (src/korban.js, migrations/0034_korban_p3k.sql, public/instansi_korban.*, public/admin/korban.*) di workerd (Miniflare) dengan D1 + R2 lokal sungguhan, migrasi apa adanya (TEST.md: tanpa mock).
   Dibuktikan: skema idempoten dan CHECK/trigger menahan; hak melapor (akun instansi aktif, staf pusdalops, moderator; peran lain, akun gerbang, tanpa x-pb ditolak); validasi;
   PRIVASI nama korban (tidak bocor ke pelapor, peran lain, Meja Pantau, jejak, agregat, WA, slide); foto dokumen hanya moderator dan pusdalops; status dilaporkan -> terverifikasi -> dikoreksi dengan jejak append-only;
   butir Meja Pantau prioritas 0 dan banner; agregat korbanHari; dummy per DUMMY.md; 503 sopan tanpa 0034.
   Jalankan: node --test tests/warga/korban.test.mjs */
import assert from "node:assert/strict";
import {readFileSync, readdirSync} from "node:fs";
import path from "node:path";
import {AKAR, pecah} from "./_bantu.mjs";
import {siapkan, berantai, ADMIN, MOD2, GERBANG, sha256} from "./_bnpb.mjs";
import "../../src/worker.js";   // worker dulu: modul saling impor (siklus)
import * as SP from "../../public/laporan_karhutla_spek.js";
import {laporanKarhutla} from "../../public/laporan_karhutla_wa.js";
import {BENCANA, KATEGORI, PENYEBAB, SUMBER, STATUS, cekKorban, korbanHari, teksKorban, butirKorban} from "../../src/korban.js";

const JAM = 3600e3, HARI = 24 * JAM, PB = {"x-pb": "1"}, NAMA = "Siti Rahasia Korban", NAMA2 = "Budi Nama Kedua";
const uji = berantai();
const U = await siapkan("uji-korban", {r2: true});
const {DB, api, n} = U;
const teks = (...p) => readFileSync(path.join(AKAR, ...p), "utf8");
const id16 = () => [...crypto.getRandomValues(new Uint8Array(8))].map(b => b.toString(16).padStart(2, "0")).join("");
const sisip = (tabel, o, db = DB) => db.prepare(`INSERT INTO ${tabel} (${Object.keys(o).join(", ")}) VALUES (${Object.keys(o).map(() => "?").join(", ")})`).bind(...Object.values(o)).run();
let ipN = 0;
const ipBaru = () => ({"cf-connecting-ip": `192.0.2.${++ipN % 250}`});
const wib = t => new Date(t + 7 * JAM).toISOString().slice(0, 10);

const SANDI = "SandiUji123456";
const akun = async (username, o = {}, V = U) => {
  const garam = "c".repeat(32), id = id16();
  await sisip("instansi_akun", {id, username, jenis: "pemkab", tingkat: "kab", wilayah: "Pemerintah Kabupaten " + username, kunci_wilayah: "k" + id, cakupan: '["62"]', prov: "62", kab: "Kapuas", garam, sandi_sha: sha256(garam + SANDI),
    status: "aktif", nama: "Budi", nip: "198001012005011001", jabatan: "Kalak", unit: "BPBD", email: "budi@contoh.go.id", wa: "628123456789", surat: 1, kartu: 1, dikirim: 1, diputus: 1, wajib_ganti: 0, dibuat: Date.now() - 3 * HARI, dummy: 0, ...o}, V.DB);
  const m = await V.api("POST", "/api/instansi/masuk", {username, sandi: SANDI}, {...PB, ...ipBaru()}); assert.equal(m.s, 200, m.t);
  const cookie = m.h.get("set-cookie").split(";")[0];
  return {id, username, h: {cookie}, hp: {cookie, ...PB}};
};
const KAP = {tingkat: "kab", prov: "62", kab: "Kapuas", cakupan: '["62"]'}, PROV62 = {jenis: "pemprov", tingkat: "prov", prov: null, kab: null, cakupan: '["62"]'}, PROV11 = {jenis: "pemprov", tingkat: "prov", prov: null, kab: null, cakupan: '["11"]', wilayah: "Provinsi Aceh"};
const GET = (a, j, V = U) => V.api("GET", j, undefined, a.h), POST = (a, j, b, V = U) => V.api("POST", j, b, a.hp);
let nipN = 0;
const bikin = async (nama, peran, wilayah = []) => {
  const r = await api("POST", "/api/staf/admin/buat", {nama, nip: `19960${++nipN}0012005`, unit: "Pusdalops BNPB", email: `k${nipN}@bnpb.go.id`, wa: "081234567890", peran, wilayah}, ADMIN); assert.equal(r.s, 201, r.t);
  const m = await api("POST", "/api/staf/masuk", {username: r.j.username, sandi: r.j.sandi}, ipBaru()); assert.equal(m.s, 200, m.t);
  const cookie = m.h.get("set-cookie").split(";")[0]; assert.equal((await api("POST", "/api/staf/gantisandi", {}, {cookie, ...PB})).s, 200);
  return {h: {cookie}, hp: {cookie, ...PB}};
};
const tugas = async (o = {}, V = U) => {
  const id = id16(); await sisip("tugas_api", {id, prov: "62", kab: "Kapuas", kec: "Mentaya", lat: -2.2, lon: 113.9, level: 3, n24: 4, luas_ha: 8, dibuat: Date.now() - 8 * JAM, terakhir_terdeteksi: Date.now() - 2 * JAM, status: "buka", dummy: 0, ...o}, V.DB); return id;
};
const BODI = (o = {}) => ({waktu_kejadian: Date.now() - 2 * JAM, prov: "62", kab: "Kapuas", bencana: "karhutla", meninggal: 1, luka_berat: 0, hilang: 0, kategori: "warga", penyebab: "terbakar", sumber: "laporan_langsung", kronologi: "Ditemukan di lahan terbakar.", nama_korban: NAMA, ...o});
const lapor = (h, b, V = U) => V.api("POST", "/api/korban/lapor", b, h);
const jejak = id => DB.prepare("SELECT aksi, dari, ke, alasan, oleh FROM korban_jejak WHERE korban_id = ? ORDER BY id").bind(id).all().then(r => r.results);
const lihat = (h, q = "") => api("GET", "/api/korban" + q, undefined, h);

let A, B, C, D, pus, pusKalteng, pusAceh, ver, pim, koor, ana, tmc;
let id1;

/* ================================================================ skema */
uji("migrasi 0034 idempoten; CHECK dan trigger menahan: semua nol, koordinat tak berpasangan, kategori liar, status liar, terverifikasi tanpa waktu, provinsi di luar cakupan; korban nyata tidak dihapus; jejak hanya menambah", async () => {
  const sql = teks("migrations/0034_korban_p3k.sql");
  for (let i = 0; i < 2; i++) await DB.batch(pecah(sql).map(s => DB.prepare(s)));
  A = await akun("akunkorbana", KAP); B = await akun("akunkorbanb", {...KAP, jenis: "polres"}); C = await akun("akunkorbanc", PROV62); D = await akun("akunkorband", PROV11);
  const k = (o = {}) => sisip("korban", {id: id16(), oleh: "uji:uji", waktu_kejadian: Date.now(), prov: "62", meninggal: 1, kategori: "warga", penyebab: "terbakar", dibuat: 1, diubah: 1, ...o});
  for (const [nama, o] of [["semua nol", {meninggal: 0}], ["lat tanpa lon", {lat: -2.2}], ["lat di luar", {lat: 40, lon: 113.9}], ["kategori liar", {kategori: "alien"}], ["penyebab liar", {penyebab: "ufo"}], ["sumber liar", {sumber: "gosip"}], ["bencana liar", {bencana: "zombi"}],
    ["status liar", {status: "hilang"}], ["terverifikasi tanpa waktu", {status: "terverifikasi"}], ["prov 1 digit", {prov: "6"}], ["jumlah negatif", {luka_berat: -1}], ["jumlah di atas batas", {hilang: 100001}], ["id pendek", {id: "abc"}], ["foto 2", {foto: 2}],
    ["nama panjang", {nama_korban: "x".repeat(301)}], ["kronologi panjang", {kronologi: "x".repeat(601)}], ["waktu nol", {waktu_kejadian: 0}]]) await assert.rejects(() => k(o), /CHECK/, nama);
  await assert.rejects(() => k({akun_id: A.id, prov: "11"}), /di luar cakupan/, "akun instansi hanya provinsi cakupannya");
  const ok = id16(); await k({id: ok, akun_id: A.id, status: "terverifikasi", diverifikasi_pada: 1, diverifikasi_oleh: "staf:abcd"});
  await assert.rejects(() => DB.prepare("DELETE FROM korban WHERE id = ?").bind(ok).run(), /tidak dihapus/, "korban nyata tidak dihapus keras");
  await sisip("korban_jejak", {waktu: 1, oleh: "uji:uji", korban_id: ok, aksi: "lapor"});
  await assert.rejects(() => DB.prepare("UPDATE korban_jejak SET aksi = 'koreksi'").run(), /hanya bisa ditambah/); await assert.rejects(() => DB.prepare("DELETE FROM korban_jejak WHERE korban_id = ?").bind(ok).run(), /hanya bisa ditambah/);
  await assert.rejects(() => sisip("korban_jejak", {waktu: 1, oleh: "uji:uji", korban_id: ok, aksi: "hapus"}), /CHECK/);
  const d = id16(); await k({id: d, dummy: 1}); await DB.prepare("DELETE FROM korban WHERE id = ?").bind(d).run();   // dummy boleh dihapus keras
  /* akun pelapor dihapus (dummy): laporan tetap ada, akun_id jadi NULL */
  const x = await akun("akunkorbanhapus", {...KAP, dummy: 1}), kx = id16(); await k({id: kx, akun_id: x.id, dummy: 1}); await DB.prepare("DELETE FROM instansi_akun WHERE id = ?").bind(x.id).run();
  assert.equal((await DB.prepare("SELECT akun_id FROM korban WHERE id = ?").bind(kx).first()).akun_id, null); await DB.prepare("DELETE FROM korban WHERE dummy = 1").run();
  await DB.prepare("UPDATE korban SET dummy = 1").run(); await DB.prepare("DELETE FROM korban").run(); assert.equal(await n("korban"), 0, "baris uji dibersihkan (jejak nyata memang tak bisa dihapus)");
});
uji("daftar tetap: JS == CHECK migrasi == klien; tanpa titik tengah; teks data lewat textContent; INP; nama korban hanya di berkas korban", async () => {
  const sql = teks("migrations/0034_korban_p3k.sql"), ambil = pola => [...sql.match(pola)[1].matchAll(/'(\w+)'/g)].map(m => m[1]);
  assert.deepEqual(Object.keys(BENCANA), ambil(/bencana TEXT NOT NULL DEFAULT 'karhutla' CHECK \(bencana IN \(([^)]*)\)/)); assert.deepEqual(Object.keys(KATEGORI), ambil(/kategori IN \(('warga'[^)]*)\)/));
  assert.deepEqual(Object.keys(PENYEBAB), ambil(/penyebab IN \(([^)]*)\)/)); assert.deepEqual(Object.keys(SUMBER), ambil(/sumber IN \(('laporan_langsung'[^)]*)\)/)); assert.deepEqual(STATUS, ambil(/status IN \(('dilaporkan'[^)]*)\)/));
  const bencanaReg = JSON.parse(teks("public/bencana.json")).bencana?.map(b => b.id) ?? JSON.parse(teks("public/bencana.json")).map(b => b.id);
  for (const b of bencanaReg) assert.ok(b in BENCANA, "bencana terdaftar belum ada di korban: " + b);
  for (const f of ["public/instansi_korban.js", "public/admin/korban.js"]) { const js = teks(f);
    for (const arr of [Object.keys(BENCANA), Object.keys(KATEGORI), Object.keys(PENYEBAB), Object.keys(SUMBER)]) for (const v of arr) assert.ok(js.includes(`"${v}"`), `${f}: tak mengenal ${v}`);
    assert.ok(!/innerHTML|outerHTML|insertAdjacentHTML|document\.write|eval\(/.test(js), f + ": teks data lewat textContent"); assert.ok(js.includes("requestAnimationFrame"), f + ": INP, kerja berat ditunda"); }
  for (const f of ["migrations/0034_korban_p3k.sql", "src/korban.js", "public/instansi_korban.js", "public/instansi_korban.css", "public/admin/korban.js", "public/admin/korban.css"]) assert.ok(!teks(f).includes(" · "), `${f}: tanpa pemisah titik tengah`);
  /* nama korban tidak boleh dibaca modul laporan, slide, atau WA mana pun */
  const sumber = [...readdirSync(path.join(AKAR, "src")).filter(f => f.endsWith(".js")).map(f => "src/" + f), ...readdirSync(path.join(AKAR, "public")).filter(f => /^(laporan|paparan|sim_)/.test(f) && f.endsWith(".js")).map(f => "public/" + f)];
  const baca = sumber.filter(f => teks(f).includes("nama_korban")); assert.deepEqual(baca, ["src/korban.js"], "hanya src/korban.js yang menyentuh nama_korban: " + baca.join());
  assert.ok(teks("public/instansi_korban.js").includes("nama_korban") && !teks("public/instansi_korban.js").includes("k.nama_korban"), "klien instansi hanya mengirim nama, tidak menampilkannya");
  assert.ok(cekKorban({waktu_kejadian: Date.now(), meninggal: 1, kategori: "warga", penyebab: "terbakar"}).v && cekKorban({waktu_kejadian: Date.now(), meninggal: 0, kategori: "warga", penyebab: "terbakar"}).g && cekKorban({waktu_kejadian: Date.now() + 1e7, meninggal: 1, kategori: "warga", penyebab: "terbakar"}).g);
  assert.equal(teksKorban({meninggal: 2, luka_berat: 1, hilang: 0}), "2 meninggal, 1 luka berat"); assert.equal(teksKorban({meninggal: 0, luka_berat: 0, hilang: 0}), null);
});

/* ================================================================ hak melapor dan validasi */
uji("hak melapor: akun instansi aktif, staf pusdalops, moderator; analis, verifikator, pimpinan, akun gerbang, anonim, akun belum aktif, tanpa x-pb ditolak", async () => {
  pus = await bikin("Pusdalops Nasional", ["pusdalops"]); pusKalteng = await bikin("Pusdalops Kalteng", ["pusdalops"], ["62"]); pusAceh = await bikin("Pusdalops Aceh", ["pusdalops"], ["11"]);
  ver = await bikin("Verifikator K", ["verifikator"]); pim = await bikin("Pimpinan K", ["pimpinan"]); koor = await bikin("Koordinator K", ["koordalops"]); ana = await bikin("Analis K", ["analis_konsesi"]); tmc = await bikin("TMC K", ["tmc"]);
  assert.equal((await api("POST", "/api/korban/lapor", BODI(), PB)).s, 401, "anonim"); assert.equal((await api("POST", "/api/korban/lapor", BODI(), {cookie: A.h.cookie})).s, 403, "instansi tanpa x-pb");
  const belum = await akun("akunkorbanbelum", {...KAP, status: "menunggu"}); assert.equal((await lapor(belum.hp, BODI())).s, 403, "akun belum aktif");
  for (const [nama, h] of [["analis", ana.hp], ["verifikator", ver.hp], ["pimpinan", pim.hp], ["tmc", tmc.hp], ["koordinator", koor.hp]]) assert.equal((await lapor(h, BODI())).s, 403, nama);
  assert.ok([401, 403].includes((await lapor(GERBANG, BODI())).s), "akun gerbang situs bukan moderator dan tidak punya sesi instansi");
  assert.equal((await lapor(pus.h, BODI())).s, 401, "staf tanpa x-pb: sesi staf tidak berlaku untuk kiriman");
  const r1 = await POST(A, "/api/instansi/korban", BODI()); assert.equal(r1.s, 201, r1.t); id1 = r1.j.id;   // pintu akun instansi (cookie Path /api/instansi)
  assert.equal((await api("POST", "/api/instansi/korban", BODI(), {cookie: A.h.cookie})).s, 403, "pintu instansi tanpa x-pb");
  const rp = await lapor(pus.hp, BODI({prov: "14", kab: "Pelalawan", meninggal: 2, waktu_kejadian: Date.now() - 5 * JAM})); assert.equal(rp.s, 201, rp.t);
  const rm = await lapor(MOD2, BODI({prov: "16", meninggal: 0, luka_berat: 3, kategori: "petugas_pemadam", penyebab: "kecelakaan_tugas", waktu_kejadian: Date.now() - 6 * JAM})); assert.equal(rm.s, 201, rm.t);
  const g = await DB.prepare("SELECT * FROM korban WHERE id = ?").bind(id1).first();
  assert.equal(g.status, "dilaporkan"); assert.equal(g.akun_id, A.id); assert.equal(g.oleh, "instansi:" + A.id); assert.equal(g.prov, "62"); assert.equal(g.kab, "Kapuas", "akun kabupaten: kab dari akun"); assert.equal(g.sumber_lokasi, "manual"); assert.equal(g.dummy, 0);
  assert.deepEqual((await jejak(id1)).map(j => [j.aksi, j.oleh]), [["lapor", "instansi:" + A.id]]);
  const k2 = await DB.prepare("SELECT akun_id, oleh, prov FROM korban WHERE id = ?").bind(rp.j.id).first(); assert.deepEqual([k2.akun_id, k2.prov], [null, "14"]); assert.match(k2.oleh, /^staf:/);
  assert.ok((await DB.prepare("SELECT oleh FROM korban WHERE id = ?").bind(rm.j.id).first()).oleh.startsWith("admin:"));
  /* staf berwilayah: provinsi di luar wilayahnya ditolak */
  assert.equal((await lapor(pusAceh.hp, BODI({prov: "62"}))).s, 403, "staf Aceh tidak melapor di Kalteng"); assert.equal((await lapor(pusAceh.hp, BODI({prov: "11", kab: "Aceh Besar", waktu_kejadian: Date.now() - 3 * JAM}))).s, 201);
});
uji("validasi lapor: jumlah, waktu, enum, provinsi di luar cakupan akun, koordinat berpasangan, tugas api dalam lingkup menurunkan lokasi; ketuk ganda tidak menggandakan", async () => {
  for (const [bad, pola] of [[{meninggal: 0}, /minimal satu/], [{meninggal: -1}, /bilangan bulat/], [{meninggal: 1.5}, /bilangan bulat/], [{hilang: "abc"}, /bilangan bulat/], [{waktu_kejadian: Date.now() + 3600e3}, /masa depan/], [{waktu_kejadian: Date.now() - 61 * HARI}, /60 hari/],
    [{waktu_kejadian: "bukan tanggal"}, /waktu kejadian/], [{waktu_kejadian: null}, /waktu kejadian/], [{kategori: "alien"}, /kategori korban/], [{penyebab: null}, /penyebab/], [{sumber: "gosip"}, /sumber/], [{bencana: "zombi"}, /bencana/], [{kronologi: "x".repeat(601)}, /kronologi/],
    [{nama_korban: "x".repeat(301)}, /nama korban/], [{nama_korban: 5}, /nama korban/], [{prov: "11"}, /cakupan/], [{prov: "99"}, /provinsi/], [{lat: -2.2}, /berpasangan/], [{lat: 40, lon: 113.9}, /berpasangan/], [{tugas_id: "tidak-sah"}, /tugas_id/], [{tugas_id: id16()}, /tidak ada/]]) {
    const r = await lapor(A.hp, BODI(bad)); assert.equal(r.s, bad.tugas_id && bad.tugas_id.length === 16 ? 404 : 400, JSON.stringify(bad) + " " + r.t); assert.match(r.j.galat, pola, JSON.stringify(bad));
  }
  const ok = await lapor(C.hp, BODI({prov: "62", kab: "Kapuas", lat: -2.21, lon: 113.9, sumber_lokasi: "gps", waktu_kejadian: new Date(Date.now() - 4 * JAM).toISOString()})); assert.equal(ok.s, 201, ok.t);
  const row = await DB.prepare("SELECT lat, lon, sumber_lokasi, kab FROM korban WHERE id = ?").bind(ok.j.id).first(); assert.deepEqual([row.lat, row.lon, row.sumber_lokasi, row.kab], [-2.21, 113.9, "gps", "Kapuas"], "waktu ISO diterima");
  const tA = await tugas({kab: "Kapuas", lat: -2.3, lon: 113.8}); const rt = await lapor(A.hp, BODI({tugas_id: tA, prov: "11", lat: 1, lon: 100, waktu_kejadian: Date.now() - 7 * JAM})); assert.equal(rt.s, 201, rt.t);
  const rowT = await DB.prepare("SELECT prov, kab, lat, lon, tugas_id, sumber_lokasi FROM korban WHERE id = ?").bind(rt.j.id).first(); assert.deepEqual(rowT, {prov: "62", kab: "Kapuas", lat: -2.3, lon: 113.8, tugas_id: tA, sumber_lokasi: "tugas"}, "lokasi diturunkan dari tugas, bukan dari isian");
  const tLuar = await tugas({prov: "11", kab: "Aceh Besar"}); assert.equal((await lapor(A.hp, BODI({tugas_id: tLuar}))).s, 404, "tugas di luar lingkup akun = 404");
  assert.equal((await lapor(pusAceh.hp, BODI({tugas_id: await tugas({prov: "62"})}))).s, 404, "staf berwilayah: tugas di luar wilayah");
  /* kirim ulang: klien_id dari klien (satu per form), bukan kecocokan isi */
  const b = BODI({prov: "62", meninggal: 4, waktu_kejadian: Date.now() - 9 * JAM}), kl = "klien-" + id16(), s1 = await lapor(C.hp, {...b, klien_id: kl}), s2 = await lapor(C.hp, {...b, klien_id: kl, meninggal: 9});
  assert.equal(s1.s, 201); assert.equal(s2.s, 200); assert.equal(s2.j.id, s1.j.id); assert.equal(s2.j.duplikat, true); assert.equal((await DB.prepare("SELECT meninggal FROM korban WHERE id = ?").bind(s1.j.id).first()).meninggal, 4, "kirim ulang tidak menimpa");
  assert.equal(await n("korban", `klien_id = '${kl}'`), 1); assert.equal((await lapor(A.hp, {...b, klien_id: kl})).s, 201, "klien_id sama dari pelapor lain = laporan lain");
  const kembar = BODI({prov: "62", meninggal: 2, waktu_kejadian: Date.now() - 11 * JAM}), d1 = await lapor(C.hp, kembar), d2 = await lapor(C.hp, kembar); assert.equal([d1.s, d2.s].join(), "201,201", "dua laporan berbeda berangka sama tersimpan dua"); assert.notEqual(d1.j.id, d2.j.id);
  const k1 = await lapor(C.hp, {...kembar, klien_id: "klien-baru-" + id16()}), k2 = await lapor(C.hp, {...kembar, klien_id: "klien-baru-" + id16()}); assert.equal([k1.s, k2.s].join(), "201,201", "klien_id berbeda dengan isi sama = dua laporan");
  for (const bad of ["pendek", "x".repeat(65), "spasi tidak boleh", 5]) assert.equal((await lapor(C.hp, {...b, klien_id: bad})).s, 400, "klien_id " + bad);
  const par = "klien-par-" + id16(), [p1, p2] = await Promise.all([lapor(C.hp, {...kembar, meninggal: 8, klien_id: par}), lapor(C.hp, {...kembar, meninggal: 8, klien_id: par})]); assert.equal(await n("korban", `klien_id = '${par}'`), 1, "serentak: satu baris"); assert.ok([p1.s, p2.s].every(x => x === 200 || x === 201) && p1.j.id === p2.j.id);
  assert.equal((await lapor(A.hp, "{bukan json")).s, 400);
  assert.equal((await lapor(A.hp, "{bukan json")).s, 400);
});

/* ================================================================ privasi nama */
uji("PRIVASI: nama korban hanya untuk moderator dan staf pusdalops; pelapor instansi, verifikator, koordalops, pimpinan hanya melihat penanda; tidak ada di Meja Pantau, jejak, rute publik", async () => {
  await DB.prepare("UPDATE korban SET nama_korban = ? WHERE id = ?").bind(NAMA, id1).run();
  const bocor = (t, ket) => { for (const x of [NAMA, "Rahasia Korban"]) assert.ok(!t.includes(x), `${ket}: nama bocor`); };
  const pel = await GET(A, "/api/instansi/korban"); assert.equal(pel.s, 200); bocor(pel.t, "pelapor instansi"); const mine = pel.j.korban.find(k => k.id === id1); assert.equal(mine.ada_nama, true); assert.ok(!("nama_korban" in mine)); assert.equal(mine.kronologi, "Ditemukan di lahan terbakar.");
  assert.deepEqual((await GET(B, "/api/instansi/korban")).j.korban, [], "akun lain tidak melihat laporan akun A"); assert.equal((await api("GET", "/api/instansi/korban")).s, 401);
  for (const [nama, h] of [["verifikator", ver.h], ["koordinator", koor.h], ["pimpinan", pim.h]]) { const r = await lihat(h); assert.equal(r.s, 200, nama); bocor(r.t, nama); assert.equal(r.j.boleh.nama, false, nama); assert.equal(r.j.korban.find(k => k.id === id1).ada_nama, true); }
  for (const [nama, h] of [["pusdalops nasional", pus.h], ["pusdalops Kalteng", pusKalteng.h], ["moderator", ADMIN], ["moderator 2", MOD2]]) { const r = await lihat(h); assert.equal(r.s, 200, nama); assert.equal(r.j.boleh.nama, true, nama); assert.equal(r.j.korban.find(k => k.id === id1).nama_korban, NAMA, nama); }
  for (const [nama, h] of [["analis", ana.h], ["tmc", tmc.h], ["gerbang", GERBANG], ["anonim", {}]]) assert.equal((await lihat(h)).s, 403, nama);
  /* Meja Pantau (semua peran), jejak, dan rute publik */
  for (const [nama, h] of [["pusdalops", pus.h], ["koordinator", koor.h], ["pimpinan", pim.h], ["verifikator", ver.h], ["admin", ADMIN]]) { const p = await api("GET", "/api/pantau", undefined, h); bocor(p.t, "Meja Pantau " + nama); }
  assert.ok((await api("GET", "/api/korban/jejak/" + id1, undefined, ver.h)).t.length > 10); bocor((await api("GET", "/api/korban/jejak/" + id1, undefined, ver.h)).t, "jejak");
  assert.equal((await api("GET", "/api/korban/jejak/" + id1, undefined, ana.h)).s, 403); assert.equal((await api("GET", "/api/korban/jejak/" + id1, undefined, pusAceh.h)).s, 404, "luar wilayah");
  for (const j of ["/api/status", "/api/warga", "/api/publik", "/api/statistik", "/api/laporan-karhutla/snapshot/" + wib(Date.now()), "/api/omc/sortie", "/korban", "/admin/korban"]) bocor((await api("GET", j)).t, "publik " + j);
  const hal = await api("GET", "/admin/korban", undefined, ADMIN); assert.equal(hal.s, 200); bocor(hal.t, "kerangka halaman"); assert.ok(!(await api("GET", "/admin/korban", undefined, ADMIN)).t.includes("<script>"), "kerangka tanpa skrip inline");
  const agg = await korbanHari({DB}, wib(Date.now() - 2 * JAM)); bocor(JSON.stringify(agg), "korbanHari"); assert.ok(!JSON.stringify(agg).includes("nama_korban"), "agregat tanpa kolom nama korban");
  const dr = await DB.prepare("SELECT nama_korban FROM korban_jejak j JOIN korban k ON k.id = j.korban_id WHERE j.korban_id = ?").bind(id1).all(); assert.ok(dr.results.length >= 1); bocor(JSON.stringify((await DB.prepare("SELECT * FROM korban_jejak").all()).results), "tabel jejak");
});

/* ================================================================ foto dokumen */
uji("foto dokumen opsional: JPEG dibersihkan lewat bersihMedia dan disimpan di R2; hanya pelapor (instansi) atau moderator/pusdalops yang mengunggah; hanya moderator dan pusdalops yang melihat", async () => {
  const seg = (m, isi) => [0xff, m, (isi.length + 2) >> 8, (isi.length + 2) & 255, ...isi], te = t => [...new TextEncoder().encode(t)];
  const jpg = new Uint8Array([0xff, 0xd8, ...seg(0xe0, [...te("JFIF"), 0, 1, 1, 0, 0, 1, 0, 1, 0, 0]), ...seg(0xe1, [...te("Exif"), 0, 0, ...te("GPS-LOKASI-RAHASIA")]), ...seg(0xc0, [8, 0, 1, 0, 1, 1, 1, 0x11, 0]), ...seg(0xda, [1, 1, 0, 0, 0x3f, 0]), ...Array(30).fill(7), 0xff, 0xd9]);
  const kirim = (h, id, isi, x = {}) => U.mf.dispatchFetch("http://bnpb.lokal/api/korban/foto/" + id, {method: "POST", headers: {...h, "content-length": String(isi.length), ...x}, body: isi});
  assert.equal((await kirim(B.hp, id1, jpg)).status, 404, "akun lain bukan pelapor"); assert.equal((await kirim(A.hp, id1, new TextEncoder().encode("bukan gambar"))).status, 400);
  const rj = await U.mf.dispatchFetch("http://bnpb.lokal/api/instansi/foto-korban/" + id1, {method: "POST", headers: {...A.hp, "content-length": String(jpg.length)}, body: jpg}); assert.equal(rj.status, 200, await rj.text());   // pintu instansi
  const r = await kirim(A.hp, id1, jpg); assert.equal(r.status, 200, await r.text()); const bkt = await U.mf.getR2Bucket("MEDIA"), o = await bkt.get("korban/foto/" + id1), b = new Uint8Array(await o.arrayBuffer());
  assert.ok(b.length > 0 && !new TextDecoder("latin1").decode(b).includes("GPS-LOKASI-RAHASIA"), "EXIF dibuang"); assert.equal((await DB.prepare("SELECT foto FROM korban WHERE id = ?").bind(id1).first()).foto, 1);
  const tanpa = await U.mf.dispatchFetch("http://bnpb.lokal/api/korban/foto/" + id1, {method: "POST", headers: A.hp}); assert.equal(tanpa.status, 411); await tanpa.text();
  for (const [nama, h] of [["pusdalops", pus.h], ["moderator", ADMIN]]) { const f = await api("GET", "/api/korban/foto/" + id1, undefined, h); assert.equal(f.s, 200, nama); }
  for (const [nama, h] of [["verifikator", ver.h], ["koordinator", koor.h], ["pimpinan", pim.h], ["analis", ana.h], ["gerbang", GERBANG]]) assert.equal((await api("GET", "/api/korban/foto/" + id1, undefined, h)).s, 403, nama);
  assert.equal((await api("GET", "/api/korban/foto/" + id1, undefined, pusAceh.h)).s, 404, "luar wilayah"); assert.equal((await GET(A, "/api/korban/foto/" + id1)).s, 403, "pelapor instansi tidak melihat dokumen sesudah kirim");
  assert.equal((await api("GET", "/api/korban/foto/" + id16(), undefined, ADMIN)).s, 404);
  assert.equal((await kirim(pus.hp, id1, jpg)).status, 200, "pusdalops boleh melengkapi dokumen"); assert.equal((await kirim(ver.hp, id1, jpg)).status, 403);
});

/* ================================================================ verifikasi dan koreksi */
uji("status: verifikasi oleh verifikator/pusdalops/moderator (pimpinan, instansi, analis tidak); dua kali 409; koreksi wajib beralasan, append-only dengan nilai sebelumnya, nama hanya oleh yang berhak, wilayah dijaga", async () => {
  const v = (h, id, b = {aksi: "verifikasi"}) => api("POST", "/api/korban/" + id, b, h);
  for (const [nama, h] of [["pimpinan", pim.hp], ["koordinator", koor.hp], ["analis", ana.hp], ["gerbang", GERBANG], ["instansi", A.hp]]) assert.equal((await v(h, id1)).s, 403, nama);
  assert.equal((await v(pim.h, id1)).s, 403, "tanpa x-pb"); assert.equal((await v(ver.hp, id16())).s, 404); assert.equal((await v(pusAceh.hp, id1)).s, 404, "luar wilayah staf = tidak ada"); assert.equal((await v(ver.hp, id1, {aksi: "aneh"})).s, 400);
  const k0 = await DB.prepare("SELECT diubah FROM korban WHERE id = ?").bind(id1).first();
  const ok = await v(ver.hp, id1); assert.equal(ok.s, 200, ok.t); assert.equal(ok.j.status, "terverifikasi");
  const g = await DB.prepare("SELECT * FROM korban WHERE id = ?").bind(id1).first(); assert.equal(g.status, "terverifikasi"); assert.ok(g.diverifikasi_pada > 0 && g.diverifikasi_oleh.startsWith("staf:") && g.diubah >= k0.diubah);
  assert.equal((await v(pus.hp, id1)).s, 409, "sudah terverifikasi");
  /* koreksi */
  assert.equal((await v(ver.hp, id1, {aksi: "koreksi", meninggal: 2})).s, 400, "alasan wajib"); assert.equal((await v(ver.hp, id1, {aksi: "koreksi", meninggal: 2, alasan: "ab"})).s, 400);
  assert.equal((await v(ver.hp, id1, {aksi: "koreksi", alasan: "tidak berubah apa pun"})).s, 400, "tanpa perubahan"); assert.equal((await v(ver.hp, id1, {aksi: "koreksi", meninggal: 0, alasan: "jadi nol semua"})).s, 400);
  assert.equal((await v(ver.hp, id1, {aksi: "koreksi", nama_korban: NAMA2, alasan: "ganti nama oleh verifikator"})).s, 403, "verifikator tidak mengubah nama");
  const kr = await v(ver.hp, id1, {aksi: "koreksi", meninggal: 2, luka_berat: 1, kronologi: "Ditemukan dua orang, satu luka berat.", alasan: "Data rumah sakit menambah korban"}); assert.equal(kr.s, 200, kr.t); assert.equal(kr.j.status, "dikoreksi");
  const g2 = await DB.prepare("SELECT * FROM korban WHERE id = ?").bind(id1).first(); assert.deepEqual([g2.status, g2.meninggal, g2.luka_berat, g2.diverifikasi_pada, g2.diverifikasi_oleh, g2.nama_korban], ["dikoreksi", 2, 1, null, null, NAMA], "nama tidak tersentuh");
  const j = (await jejak(id1)).filter(x => x.aksi !== "foto"); assert.deepEqual(j.map(x => x.aksi), ["lapor", "verifikasi", "koreksi"]); assert.deepEqual(JSON.parse(j[2].dari), {meninggal: 1, luka_berat: 0, kronologi: "Ditemukan di lahan terbakar."}); assert.equal(JSON.parse(j[2].ke).meninggal, 2); assert.equal(j[2].alasan, "Data rumah sakit menambah korban");
  assert.ok(!JSON.stringify(j).includes("Rahasia"), "jejak tanpa nama");
  const nm = await v(pus.hp, id1, {aksi: "koreksi", nama_korban: NAMA2, alasan: "Nama diperbaiki sesuai KTP"}); assert.equal(nm.s, 200, nm.t); assert.equal((await DB.prepare("SELECT nama_korban FROM korban WHERE id = ?").bind(id1).first()).nama_korban, NAMA2);
  const j2 = (await jejak(id1)).filter(x => x.aksi !== "foto"); assert.equal(JSON.parse(j2[3].ke).nama_diubah, true); assert.ok(!JSON.stringify(j2).includes("Budi") && !JSON.stringify(j2).includes("Siti"), "jejak hanya menandai nama berubah");
  assert.equal((await v(ADMIN, id1)).s, 200, "verifikasi ulang sesudah koreksi oleh moderator"); assert.equal((await DB.prepare("SELECT status FROM korban WHERE id = ?").bind(id1).first()).status, "terverifikasi");
  assert.deepEqual((await jejak(id1)).map(x => x.aksi).filter(a => a !== "foto"), ["lapor", "verifikasi", "koreksi", "koreksi", "verifikasi"], "tiap langkah tercatat, tidak ada yang ditimpa");
  const tanggal = await v(ADMIN, id1, {aksi: "koreksi", waktu_kejadian: Date.now() + 9e6, alasan: "waktu salah di masa depan"}); assert.equal(tanggal.s, 400, "validasi yang sama dengan lapor");
  await assert.rejects(() => DB.prepare("DELETE FROM korban WHERE id = ?").bind(id1).run(), /tidak dihapus/);
});

uji("foto sesudah verifikasi: instansi tidak bisa unggah ulang (409), pusdalops dan moderator bisa; tiap unggah dan hapus foto tercatat di jejak; hapus foto hanya moderator dan beralasan", async () => {
  const seg = (m, isi) => [0xff, m, (isi.length + 2) >> 8, (isi.length + 2) & 255, ...isi], te = t => [...new TextEncoder().encode(t)];
  const jpg = new Uint8Array([0xff, 0xd8, ...seg(0xe0, [...te("JFIF"), 0, 1, 1, 0, 0, 1, 0, 1, 0, 0]), ...seg(0xc0, [8, 0, 1, 0, 1, 1, 1, 0x11, 0]), ...seg(0xda, [1, 1, 0, 0, 0x3f, 0]), ...Array(30).fill(7), 0xff, 0xd9]);
  const kirim = (jalur, h) => U.mf.dispatchFetch("http://bnpb.lokal" + jalur + id1, {method: "POST", headers: {...h, "content-length": String(jpg.length)}, body: jpg});
  assert.equal((await DB.prepare("SELECT status FROM korban WHERE id = ?").bind(id1).first()).status, "terverifikasi");
  for (const jalur of ["/api/instansi/foto-korban/", "/api/korban/foto/"]) { const r = await kirim(jalur, A.hp); assert.equal(r.status, 409, jalur); assert.match((await r.json()).galat, /terverifikasi/); }
  const j0 = (await jejak(id1)).filter(x => x.aksi === "foto").length; assert.ok(j0 >= 3, "unggah sebelumnya tercatat: instansi, instansi, pusdalops");
  assert.equal((await kirim("/api/korban/foto/", pus.hp)).status, 200); assert.equal((await kirim("/api/korban/foto/", MOD2)).status, 200);
  const jf = (await jejak(id1)).filter(x => x.aksi === "foto"); assert.equal(jf.length, j0 + 2); assert.equal(jf.at(-1).alasan, "diganti"); assert.equal(jf[0].alasan, "diunggah"); assert.ok(jf.every(x => !/Rahasia|Budi|Siti/.test(JSON.stringify(x))));
  const hapus = (h, b) => api("POST", "/api/korban/" + id1, {aksi: "hapus_foto", ...b}, h);
  for (const [nama, h] of [["pusdalops", pus.hp], ["verifikator", ver.hp], ["instansi", A.hp], ["pimpinan", pim.hp]]) assert.equal((await hapus(h, {alasan: "tidak sah dihapus"})).s, 403, nama);
  assert.equal((await hapus(ADMIN, {})).s, 400, "alasan wajib"); const ok = await hapus(ADMIN, {alasan: "Dokumen salah unggah"}); assert.equal(ok.s, 200, ok.t); assert.equal(ok.j.foto, false);
  assert.equal((await DB.prepare("SELECT foto FROM korban WHERE id = ?").bind(id1).first()).foto, 0); assert.equal(await (await U.mf.getR2Bucket("MEDIA")).get("korban/foto/" + id1), null, "berkas R2 dihapus");
  assert.equal((await hapus(ADMIN, {alasan: "sekali lagi"})).s, 409); const jh = (await jejak(id1)).filter(x => x.aksi === "foto_hapus"); assert.equal(jh.length, 1); assert.equal(jh[0].alasan, "Dokumen salah unggah");
  assert.equal((await api("GET", "/api/korban/foto/" + id1, undefined, ADMIN)).s, 404); assert.equal((await lihat(ADMIN)).j.boleh.moderator, true); assert.equal((await lihat(pus.h)).j.boleh.moderator, false);
});

/* ================================================================ Meja Pantau */
uji("Meja Pantau: laporan belum terverifikasi = butir prioritas 0 di atas 'Segera' untuk pusdalops dan koordalops (wilayah dijaga); analis, TMC tidak; hilang saat diverifikasi, muncul lagi saat dikoreksi; banner merah di layar", async () => {
  await tugas({dibuat: Date.now() - 20 * JAM});   // api belum dikonfirmasi 20 jam: butir "Segera" (prioritas 1) sebagai pembanding urutan
  const baru = await lapor(A.hp, BODI({meninggal: 3, luka_berat: 2, waktu_kejadian: Date.now() - 20 * 60e3, kronologi: "Regu menemukan korban baru."})); assert.equal(baru.s, 201); const bid = baru.j.id;
  const butirKorbanDari = async h => (await api("GET", "/api/pantau", undefined, h)).j;
  const p = await butirKorbanDari(pusKalteng.h), k = p.butir.filter(b => b.jenis === "korban_baru");
  assert.ok(k.some(b => b.id.startsWith("korban:" + bid + ":")), "laporan baru langsung jadi butir"); const bk = k.find(b => b.id.startsWith("korban:" + bid)); assert.equal(bk.prioritas, 0); assert.equal(bk.tautan, "/admin/korban"); assert.equal(bk.prov, "62");
  assert.match(bk.judul, /Korban 3 meninggal, 2 luka berat di Kapuas, Kalimantan Tengah, belum diverifikasi, dilaporkan/); assert.equal(bk.label, "Laporan korban jiwa belum diverifikasi"); assert.ok(bk.tenggat > Date.now() - 60e3);
  assert.equal(p.butir[0].jenis, "korban_baru", "korban di urutan teratas"); assert.ok(p.butir.findIndex(b => b.jenis === "api_konfirmasi") > p.butir.findLastIndex(b => b.jenis === "korban_baru") || !p.butir.some(b => b.jenis === "api_konfirmasi"), "korban sebelum butir 'Segera'");
  assert.ok(p.butir.some(b => b.prioritas === 1) && p.butir.every((b, i, a) => !i || a[i - 1].prioritas <= b.prioritas), "urutan prioritas naik, 0 paling atas");
  assert.ok(p.jenis.korban_baru && p.ringkas.per_jenis.korban_baru >= 1);
  for (const [nama, h] of [["koordalops", koor.h], ["pimpinan", pim.h], ["admin", ADMIN], ["pusdalops nasional", pus.h]]) assert.ok((await butirKorbanDari(h)).butir.some(b => b.id.startsWith("korban:" + bid)), nama);
  for (const [nama, h] of [["analis", ana.h], ["tmc", tmc.h], ["verifikator", ver.h], ["pusdalops Aceh", pusAceh.h]]) assert.ok(!(await butirKorbanDari(h)).butir.some(b => b.id.startsWith("korban:" + bid)), nama + " tidak melihat butir ini");
  assert.ok(!(await butirKorbanDari(pusAceh.h)).butir.some(b => b.jenis === "korban_baru" && b.prov === "62"), "wilayah lain tidak melihat Kalteng");
  const sebelumId = bk.id; assert.equal((await api("POST", "/api/pantau/butir", {id: sebelumId, aksi: "selesai"}, pusKalteng.hp)).s, 409, "butir berbasis kondisi: tidak ditandai selesai tangan");
  assert.equal((await api("POST", "/api/pantau/butir", {id: sebelumId, aksi: "ambil"}, pusKalteng.hp)).s, 200, "boleh diambil");
  assert.equal((await api("POST", "/api/korban/" + bid, {aksi: "verifikasi"}, ver.hp)).s, 200);
  assert.ok(!(await butirKorbanDari(pusKalteng.h)).butir.some(b => b.id.startsWith("korban:" + bid)), "terverifikasi: butir hilang sendiri");
  assert.equal((await api("POST", "/api/korban/" + bid, {aksi: "koreksi", hilang: 1, alasan: "Satu korban lagi dilaporkan hilang"}, ver.hp)).s, 200);
  const lagi = (await butirKorbanDari(pusKalteng.h)).butir.find(b => b.id.startsWith("korban:" + bid)); assert.ok(lagi && lagi.id !== sebelumId && /dikoreksi dan perlu diverifikasi ulang/.test(lagi.judul), "dikoreksi: muncul lagi dengan id baru");
  assert.equal(lagi.status, "baru", "penugasan lama tidak ikut ke butir baru");
  /* banner merah di layar dan prioritas 0 di klien */
  const js = teks("public/admin/pantau.js"), css = teks("public/admin/pantau.css"); assert.match(js, /korban_baru/); assert.match(js, /0: "Tertinggi"/); assert.match(js, /pt-banner-korban/); assert.match(js, /\/admin\/korban/); assert.match(css, /\.pt-pil\.p0/); assert.match(css, /\.pt-banner-korban/);
  const langsung = await butirKorban({DB}, Date.now(), false); assert.ok(langsung.every(b => !b.dummy && b.prioritas === 0 && !JSON.stringify(b).includes("Rahasia")), "pengait langsung tanpa dummy dan tanpa nama");
  await api("POST", "/api/korban/" + bid, {aksi: "verifikasi"}, ver.hp);
});

/* ================================================================ agregat harian */
uji("korbanHari: angka per hari WIB kejadian (batas tengah malam WIB), per provinsi, belum diverifikasi dihitung, teks laporan dan 'N jiwa MD' tanpa nama, dummy tidak ikut, tanggal rusak = nol", async () => {
  const hari = "2026-09-10", t = jam => Date.parse(`${hari}T${jam}+07:00`), tglSebelum = "2026-09-09", tglSesudah = "2026-09-11";
  const lap = (o, h = pus.hp) => lapor(h, BODI({waktu_kejadian: t("12:00:00"), kronologi: null, nama_korban: NAMA, ...o}));
  const a1 = await lap({prov: "62", meninggal: 2, luka_berat: 1}); await lap({prov: "62", meninggal: 1, luka_berat: 0, hilang: 2, waktu_kejadian: t("00:00:00")}); await lap({prov: "14", meninggal: 0, luka_berat: 0, hilang: 3, kab: "Pelalawan"});
  await lap({prov: "62", meninggal: 7, waktu_kejadian: t("23:59:59") + 1000}); await lap({prov: "62", meninggal: 5, waktu_kejadian: t("00:00:00") - 1000});
  /* dua laporan terakhir jatuh di luar hari: 00:00:00 hari berikutnya dan 23:59:59 hari sebelumnya */
  assert.equal(a1.s, 201, a1.t);
  await DB.prepare("UPDATE korban SET status = 'terverifikasi', diverifikasi_pada = 1, diverifikasi_oleh = 'staf:uji' WHERE id = ?").bind(a1.j.id).run();
  const k = await korbanHari({DB}, hari);
  assert.equal(k.tanggal, hari); assert.equal(k.laporan, 3); assert.equal(k.meninggal, 3); assert.equal(k.luka_berat, 1); assert.equal(k.hilang, 5); assert.equal(k.belum_diverifikasi, 2); assert.equal(k.meninggal_terverifikasi, 2);
  assert.equal(k.teks, "3 meninggal, 1 luka berat, 5 hilang"); assert.equal(k.teks_md, "3 jiwa MD"); assert.deepEqual(k.provinsi.map(p => [p.prov, p.nama, p.meninggal, p.luka_berat, p.hilang]), [["14", "Riau", 0, 0, 3], ["62", "Kalimantan Tengah", 3, 1, 2]]);
  assert.ok(!JSON.stringify(k).includes("Rahasia") && !JSON.stringify(k).includes("nama_korban"), "tanpa nama");
  assert.equal((await korbanHari({DB}, tglSebelum)).meninggal, 5, "23:59:59 WIB hari sebelumnya"); assert.equal((await korbanHari({DB}, tglSesudah)).meninggal, 7, "00:00:00 WIB hari berikutnya");
  const kosong = await korbanHari({DB}, "2026-01-01"); assert.deepEqual([kosong.laporan, kosong.meninggal, kosong.teks, kosong.teks_md], [0, 0, null, null]);
  for (const bad of ["2026-13-45x", "kemarin", "", null, undefined, 5]) assert.equal((await korbanHari({DB}, bad)).laporan, 0, String(bad));
  await sisip("korban", {id: id16(), oleh: "staf:contoh", waktu_kejadian: t("13:00:00"), prov: "62", meninggal: 9, kategori: "warga", penyebab: "terbakar", dibuat: 1, diubah: 1, dummy: 1});
  assert.equal((await korbanHari({DB}, hari)).meninggal, 3, "dummy tidak ikut agregat nyata"); assert.equal((await korbanHari({DB}, hari, {dummy: true})).meninggal, 12, "dengan {dummy: true} ikut");
  await DB.prepare("DELETE FROM korban WHERE dummy = 1").run();
  /* cara memanggil dari laporan_karhutla.js / Koordalops: sambungan nanti, kontraknya dipaku di sini */
  assert.deepEqual(Object.keys(k).sort(), ["belum_diverifikasi", "hilang", "laporan", "luka_berat", "meninggal", "meninggal_terverifikasi", "provinsi", "tanggal", "teks", "teks_md", "terverifikasi"]); assert.equal(k.terverifikasi, 1);
});

uji("dampak di snapshot laporan karhutla: angka saja dari korbanHari ('terverifikasi N dari M'), muncul di kesimpulan dan teks WA, tanpa nama; tanpa laporan snapshot tidak berubah", async () => {
  const kiriman = {}, dasar = {tanggal_laporan: "2026-09-11", prioritas: ["62"], kiriman, sebelumnya: [], ralat: 0}, tanpa = SP.agregasi(dasar);
  assert.ok(!("dampak" in tanpa) && !tanpa.kesimpulan.some(x => /Korban jiwa/.test(x)), "tanpa dampak: bentuk lama persis"); assert.ok(!laporanKarhutla(tanpa).includes("Korban jiwa"));
  assert.ok(!("dampak" in SP.agregasi({...dasar, dampak: {laporan: 0, terverifikasi: 0, provinsi: []}})), "nol laporan: tidak ada kunci dampak");
  const k = await korbanHari({DB}, "2026-09-10"); assert.ok(k.laporan > 0); const snap = SP.agregasi({...dasar, dampak: k});
  assert.deepEqual(Object.keys(snap.dampak).sort(), ["hilang", "laporan", "luka_berat", "meninggal", "meninggal_terverifikasi", "provinsi", "tanggal", "terverifikasi"]);
  assert.equal(snap.dampak.tanggal, "2026-09-10"); assert.equal(snap.dampak.terverifikasi, 1); assert.equal(snap.dampak.laporan, 3);
  assert.ok(snap.kesimpulan.includes("Korban jiwa 2026-09-10: 3 meninggal, 1 luka berat, 5 hilang (terverifikasi 1 dari 3 laporan)."), snap.kesimpulan.join(" | "));
  const wa = laporanKarhutla(snap); assert.match(wa, /3\. Korban jiwa/); assert.ok(wa.includes("3 meninggal, 1 luka berat, 5 hilang pada 10 September 2026") && wa.includes("terverifikasi 1 dari 3 laporan"), wa.slice(wa.indexOf("Korban") - 50, wa.indexOf("Korban") + 200));
  for (const x of [NAMA, NAMA2, "Rahasia", "nama_korban"]) assert.ok(!wa.includes(x) && !JSON.stringify(snap).includes(x), "tanpa nama: " + x);
  const slide = teks("public/laporan_karhutla_slide.js"); assert.match(slide, /labelVerifikasi/); assert.match(slide, /s\.dampak/); assert.ok(!slide.includes("nama_korban"));
  assert.match(teks("src/laporan_karhutla.js"), /korbanHari\(env, S\.tanggalData\(tanggal\)/); assert.match(teks("src/laporan_karhutla.js"), /lama\?\.dampak \?\? null/, "ralat memakai dampak snapshot sebelumnya");
});
uji("daftar admin: saringan wilayah staf ada di WHERE sebelum LIMIT 1000 (laporan di wilayahnya tidak terpotong oleh laporan provinsi lain yang lebih baru)", async () => {
  const kini = Date.now(), semua = [];
  for (let i = 0; i < 1010; i++) semua.push(DB.prepare("INSERT INTO korban (id, oleh, waktu_kejadian, prov, meninggal, kategori, penyebab, dibuat, diubah, dummy) VALUES (?, 'staf:massal', ?, '62', 1, 'warga', 'terbakar', ?, ?, 0)").bind(id16(), kini - 3600e3 + i, kini, kini));
  for (let i = 0; i < semua.length; i += 100) await DB.batch(semua.slice(i, i + 100));
  const aceh = id16(); await sisip("korban", {id: aceh, oleh: "staf:aceh", waktu_kejadian: kini - 30 * 24 * 3600e3, prov: "11", meninggal: 1, kategori: "warga", penyebab: "terbakar", dibuat: 1, diubah: 1});
  const pa = (await lihat(pusAceh.h)).j; assert.ok(pa.korban.some(k => k.id === aceh), "laporan Aceh (lama) tetap tampil untuk staf Aceh"); assert.ok(pa.korban.every(k => k.prov === "11") && pa.rekap.length === 1 && pa.total.laporan === pa.korban.length);
  const nas = (await lihat(ADMIN)).j; assert.equal(nas.korban.length, 1000, "admin: tetap dibatasi 1000 terbaru"); assert.ok(!nas.korban.some(k => k.id === aceh));
  const kal = (await lihat(pusKalteng.h, "?prov=62&status=dilaporkan")).j; assert.equal(kal.korban.length, 1000); assert.ok((await lihat(pusKalteng.h, "?prov=11")).j.korban.length === 0);
  await DB.prepare("UPDATE korban SET dummy = 1 WHERE oleh IN ('staf:massal', 'staf:aceh')").run(); await DB.prepare("DELETE FROM korban WHERE oleh IN ('staf:massal', 'staf:aceh')").run();
});

/* ================================================================ dummy (DUMMY.md) */
uji("dummy: hanya Super Admin; korban contoh bernama 'Contoh' di beberapa provinsi, ketiga status, jejak lengkap; butir Meja Pantau dari dummy; staf nyata dan akun nyata tidak melihatnya; isi ulang 409; hapus bersih tanpa menyentuh data nyata", async () => {
  for (const h of [MOD2, GERBANG, {}]) assert.equal((await api("POST", "/api/korban/dummy", {aksi: "isi"}, h)).s, 403);
  assert.equal((await api("POST", "/api/korban/dummy", {aksi: "aneh"}, ADMIN)).s, 400);
  const nyata = async () => ({korban: await n("korban", "dummy = 0"), jejak: await n("korban_jejak", "dummy = 0"), akun: await n("instansi_akun", "dummy = 0"), tugas: await n("tugas_api", "dummy = 0")}), sebelum = await nyata();
  const isi = await api("POST", "/api/korban/dummy", {aksi: "isi"}, ADMIN); assert.equal(isi.s, 201, isi.t); assert.ok(isi.j.korban >= 6 && isi.j.butir >= 3, isi.t); assert.deepEqual(await nyata(), sebelum, "data nyata tak tersentuh oleh isi");
  const distinct = async kolom => (await DB.prepare(`SELECT DISTINCT ${kolom} v FROM korban WHERE dummy = 1`).all()).results.map(r => r.v).sort();
  assert.deepEqual(await distinct("status"), [...STATUS].sort(), "ketiga status terisi"); assert.ok((await distinct("prov")).length >= 4); assert.ok((await distinct("kategori")).length >= 3 && (await distinct("penyebab")).length >= 4 && (await distinct("sumber")).length === 3);
  assert.ok((await distinct("bencana")).length >= 2); assert.ok(await n("korban", "dummy = 1 AND tugas_id IS NOT NULL AND lat IS NOT NULL") >= 1, "satu laporan menaut tugas api dummy"); assert.ok(await n("korban", "dummy = 1 AND akun_id IS NOT NULL") >= 1, "satu laporan dari akun instansi dummy");
  for (const a of ["lapor", "verifikasi", "koreksi"]) assert.ok(await n("korban_jejak", `dummy = 1 AND aksi = '${a}'`) >= 1, "jejak " + a);
  const nama = (await DB.prepare("SELECT nama_korban FROM korban WHERE dummy = 1 AND nama_korban IS NOT NULL").all()).results; assert.ok(nama.length >= 4 && nama.every(r => r.nama_korban.startsWith("Contoh ")), "nama fiktif berawalan Contoh");
  const adm = (await lihat(ADMIN)).j, dum = adm.korban.filter(k => k.dummy); assert.equal(dum.length, isi.j.korban); assert.ok(adm.rekap.length >= 4 && adm.total.belum_diverifikasi >= 3 && dum.every(k => k.meninggal + k.luka_berat + k.hilang > 0));
  assert.ok(!(await lihat(pus.h)).j.korban.some(k => k.dummy), "staf nyata tidak melihat dummy"); assert.equal((await api("GET", "/api/korban/jejak/" + dum[0].id, undefined, pus.h)).s, 404); assert.ok((await api("GET", "/api/korban/jejak/" + dum[0].id, undefined, ADMIN)).j.jejak.length >= 1);
  assert.ok(!(await GET(A, "/api/instansi/korban")).j.korban.some(k => k.dummy), "akun nyata tidak melihat dummy");
  const bd = (await api("GET", "/api/pantau", undefined, ADMIN)).j.butir.filter(b => b.dummy && b.jenis === "korban_baru"); assert.ok(bd.length >= 3 && bd.every(b => b.prioritas === 0), "butir Meja Pantau prioritas 0 dari dummy");
  assert.ok(!(await api("GET", "/api/pantau", undefined, pus.h)).j.butir.some(b => b.dummy), "staf nyata tidak melihat butir dummy");
  assert.equal((await api("POST", "/api/korban/dummy", {aksi: "isi"}, ADMIN)).s, 409, "isi ulang 409"); assert.equal(await n("korban", "dummy = 1"), isi.j.korban, "tidak berlipat");
  const hp = await api("POST", "/api/korban/dummy", {aksi: "hapus"}, ADMIN); assert.equal(hp.s, 200, hp.t); assert.equal(hp.j.korban, isi.j.korban);
  for (const [t, w] of [["korban", "dummy = 1"], ["korban_jejak", "dummy = 1"], ["instansi_akun", "dummy = 1"], ["tugas_api", "dummy = 1"]]) assert.equal(await n(t, w), 0, t); assert.deepEqual(await nyata(), sebelum, "data nyata utuh sesudah hapus");
  assert.equal((await api("POST", "/api/korban/dummy", {aksi: "isi"}, ADMIN)).s, 201, "isi ulang sesudah hapus"); assert.equal((await api("POST", "/api/korban/dummy", {aksi: "hapus"}, ADMIN)).s, 200);
});

/* ================================================================ layar dan halaman */
uji("halaman /admin/korban: kerangka tanpa data, CSP ketat, menu staf menurut peran; modul sisip instansi dipasang di /instansi; berkas klien utuh", async () => {
  const h = await U.mf.dispatchFetch("http://bnpb.lokal/admin/korban", {headers: ADMIN}), html = await h.text(); assert.equal(h.status, 200); assert.match(h.headers.get("content-security-policy"), /script-src 'self'/);
  assert.ok(html.includes("/admin/korban.js") && html.includes("/admin/korban.css") && html.includes("/inti/format.js") && html.includes("Korban jiwa") && html.includes('href="/admin/korban"'));
  const sp = await api("GET", "/admin/korban", undefined, pus.h); assert.equal(sp.s, 200); assert.match(sp.t, /data-staf="1" data-peran="pusdalops"/); assert.match(sp.t, /href="\/admin\/korban"/);
  const man = async (j, hd = {}) => { const r = await U.mf.dispatchFetch("http://bnpb.lokal" + j, {headers: hd, redirect: "manual"}); await r.text(); return {s: r.status, l: r.headers.get("location")}; };
  assert.deepEqual(await man("/admin/korban", ana.h), {s: 303, l: "/admin/pantau"}, "analis konsesi tidak punya halaman ini"); assert.equal((await man("/admin/korban")).s, 303);
  assert.doesNotMatch((await api("GET", "/admin/instansi", undefined, ana.h)).t, /href="\/admin\/korban"/, "menu analis tanpa Korban jiwa");
  const html2 = teks("public/instansi.html"); assert.match(html2, /<link rel="stylesheet" href="\/instansi_korban\.css/); assert.match(html2, /<script src="\/instansi_korban\.js[^"]*" defer>/);
  const js = teks("public/instansi_korban.js"); assert.match(js, /tabKorbanTombol/); assert.match(js, /\/api\/instansi\/korban/); assert.match(js, /\/api\/instansi\/foto-korban\//);
  assert.deepEqual([...js.matchAll(/"(\/api\/[^"]*)"/g)].map(m => m[1]).filter(u => !u.startsWith("/api/instansi/")), [], "cookie sesi instansi hanya dikirim ke /api/instansi: klien instansi tidak boleh memanggil jalur lain");
  assert.match(teks("src/instansi.js"), /\["\/instansi", "\/api\/instansi"\]\.map\(p => `\$\{COOKIE\}=\$\{nilai\}; Path=\$\{p\}/, "gerbang ini bergantung pada Path cookie sesi instansi"); assert.match(js, /datetime-local/); assert.match(js, /geolocation/); assert.match(js, /x-pb/);
  const kl = teks("public/admin/korban.js"); assert.match(kl, /\/api\/korban/); assert.match(kl, /data-verif/); assert.match(kl, /aksi: "koreksi"/); assert.match(kl, /Admin\.pasangDummy/); assert.match(kl, /D\.boleh\.nama/);
  assert.equal((await api("GET", "/instansi_korban.js")).s, 200); assert.equal((await api("GET", "/admin/korban.js")).s, 200);
});

/* ================================================================ tanpa migrasi 0034 */
uji("503 sopan bila 0034 belum diterapkan: semua rute korban 503; kerangka halaman, Meja Pantau, dan agregat tidak terganggu", async () => {
  const V = await siapkan("uji-korban-0034", {r2: true});
  for (const t of ["korban_jejak", "korban", "p3k_jejak", "p3k"]) await V.DB.prepare(`DROP TABLE ${t}`).run();
  const a = await akun("akunkorban0034", KAP, V);
  for (const [m, j, b, h] of [["GET", "/api/instansi/korban", undefined, a.h], ["POST", "/api/korban/lapor", BODI(), a.hp], ["GET", "/api/korban", undefined, ADMIN], ["POST", "/api/korban/" + id16(), {aksi: "verifikasi"}, ADMIN],
    ["GET", "/api/korban/jejak/" + id16(), undefined, ADMIN], ["GET", "/api/korban/foto/" + id16(), undefined, ADMIN], ["POST", "/api/korban/dummy", {aksi: "isi"}, ADMIN], ["POST", "/api/korban/foto/" + id16(), "x", {...a.hp, "content-length": "1"}]]) {
    const r = await V.api(m, j, b, h); assert.equal(r.s, 503, `${m} ${j}: ${r.t.slice(0, 120)}`); assert.match(r.j.galat, /0034/);
  }
  assert.equal((await V.api("GET", "/admin/korban", undefined, ADMIN)).s, 200, "kerangka halaman tidak butuh tabel");
  const pa = await V.api("GET", "/api/pantau", undefined, ADMIN); assert.equal(pa.s, 200); assert.ok("korban_baru" in pa.j.jenis && !pa.j.butir.some(b => b.jenis === "korban_baru"));
  const k = await korbanHari({DB: V.DB}, "2026-09-10"); assert.deepEqual([k.laporan, k.meninggal, k.teks], [0, 0, null]); assert.deepEqual(await butirKorban({DB: V.DB}, Date.now(), true), []);
  const rin = await GET(a, "/api/instansi/gudang", V); assert.equal(rin.s, 200, "inventaris biasa tidak terganggu");
});
