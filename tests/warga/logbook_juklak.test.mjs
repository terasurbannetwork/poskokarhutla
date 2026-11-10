/* Uji integrasi logbook sesuai Juklak 7/2023 (src/logbook.js, migrasi 0094): KIB, medan baru, SK status.
   Worker + D1 sungguhan di Miniflare, migrasi apa adanya; tidak ada mock. */
import {test, before, after} from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import {Miniflare} from "miniflare";
import {AKAR, migrasi, pecah} from "./_bantu.mjs";
import "../../src/worker.js";
import {ambangKejadian} from "../../src/logbook.js";

const uji = test;
const sha = s => createHash("sha256").update(s).digest("hex");
const TOK = "c".repeat(64), TOK_LUAR = "d".repeat(64);
const HARI = 864e5;
let mf, DB;
before(async () => {
  mf = new Miniflare({modules: true, scriptPath: path.join(AKAR, "src/worker.js"), modulesRoot: AKAR, modulesRules: [{type: "ESModule", include: ["**/*.js"]}],
    compatibilityDate: "2024-09-23", d1Databases: {DB: "uji-logbook-juklak"}, r2Buckets: ["MEDIA"], bindings: {IP_SALT: "garam-uji", ADMIN_TOKEN: "rahasia-admin", SUPER_ADMIN: sha("rahasia-admin").slice(0, 12)},
    serviceBindings: {ASSETS: () => new Response("tidak ada", {status: 404})}, cache: false});
  DB = await mf.getD1Database("DB"); await DB.batch(pecah(migrasi()).map(s => DB.prepare(s)));
  for (const [id, un, tok, peran] of [["s1s1s1s1s1s1s1s1", "pusdalopsa", TOK, '["pusdalops"]'], ["s2s2s2s2s2s2s2s2", "kampusa", TOK_LUAR, '["kemitraan"]']])
    await DB.batch([DB.prepare(`INSERT INTO staf (id, username, nama, nip, unit, email, wa, peran, wilayah, garam, sandi_sha, wajib_ganti, dibuat, dibuat_oleh, dummy)
      VALUES (?, ?, ?, ?, 'Unit', ?, ?, ?, '[]', 'gggggggggggggggggggggggggggggggg', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', 0, 1, 'tes', 0)`).bind(id, un, "Nama " + un, "2000" + id.slice(1, 2) + "000", un + "@b.id", "62812000000" + id.slice(1, 2) + "0", peran),
      DB.prepare("INSERT INTO staf_sesi (token_sha, staf_id, dibuat, kedaluwarsa) VALUES (?, ?, 1, ?)").bind(sha(tok), id, Date.now() + 3600e3)]);
});
after(() => mf?.dispose());

const orig = {origin: "http://logbook.lokal"}, ADMIN = {"x-admin-token": "rahasia-admin", ...orig};
const STAF = {cookie: "sesi_staf=" + TOK, "x-pb": "1", ...orig}, LUAR = {cookie: "sesi_staf=" + TOK_LUAR, "x-pb": "1", ...orig};
const call = async (m, j, h = STAF, b) => { const r = await mf.dispatchFetch("http://logbook.lokal" + j, {method: m, headers: {"content-type": "application/json", ...h}, body: b === undefined ? undefined : JSON.stringify(b)}); return {status: r.status, cc: r.headers.get("cache-control"), vary: r.headers.get("vary"), j: await r.json().catch(() => null)}; };
const KAB = "33|Banjarnegara", hariIni = () => new Date().toISOString().slice(0, 10);
const baru = {jenis: "longsor", kab: KAB, kec: "Pandanarum", desa: "Tulis", lat: -7.3, lon: 109.7, mulai: hariIni(), md: 2, hilang: 5, luka: 3, mengungsi_jiwa: 120, mengungsi_kk: 40, rumah_rb: 4, kendala: ["akses", "sinyal"], kebutuhan: ["tenda", "makanan"], catatan: "akses jalan putus", sumber_instansi: "BPBD Banjarnegara"};
const n = async t => (await DB.prepare(`SELECT count(*) n FROM ${t}`).first()).n;

const KB = "3304";   // BPS Banjarnegara
const kib = (jenis, kode, tgl = hariIni()) => KB + kode + tgl.replaceAll("-", "");
const entri = {kerugian_juta: 1250.5, korban: {md: {"0-17": {L: 1, P: 0}, "18-59": {L: 0, P: 1}}, luka: {"60+": {L: 2, P: 1}}, mengungsi: {"0-17": {L: 10, P: 12}, "18-59": {L: 30, P: 28}}},
  rentan: {bayi: 3, balita: 9, ibu_hamil_menyusui: 4, lansia: 12, disabilitas: 2}, prasarana: [{kode: "jalan", tingkat: "rb", jumlah: 1.5}, {kode: "sekolah", tingkat: "rr", jumlah: 2}, {kode: "sawah", jumlah: 7.25}],
  kebutuhan_rinci: [{kelompok: "logistik", barang: "Tenda", jumlah: 80, satuan: "unit"}, {kelompok: "dana", barang: "Dana siap pakai", jumlah: 250, satuan: "juta rupiah"}],
  pemberi: ["BPBD Banjarnegara", "Basarnas"], dokumentasi: ["https://drive.google.com/drive/folders/abc123"], posko: {ada: true, sk: "360/112/2026", berlaku_mulai: "2026-10-30", berlaku_sampai: "2026-11-13"}};
const badan = (x = {}) => ({...baru, kab_bps: KB, md: 2, luka: 3, mengungsi_jiwa: 100, ...entri, ...x});

uji("juklak: KIB 16 digit terbentuk dari kab_bps + kode DIBI + tanggal + indeks, disimpan, sufiks entri naik -001, -002", async () => {
  const a = await call("POST", "/api/logbook/kejadian", STAF, badan()); assert.equal(a.status, 201, JSON.stringify(a.j));
  assert.equal(a.j.kejadian.kib, kib("longsor", "102") + "1"); assert.match(a.j.kejadian.kib, /^\d{16}$/);
  assert.equal(a.j.entri.kib, a.j.kejadian.kib + "-001");
  assert.equal((await DB.prepare("SELECT kib, urut FROM logbook_kib WHERE kejadian_id = ?").bind(a.j.kejadian.id).first()).urut, 1);
  const e2 = await call("POST", `/api/logbook/kejadian/${a.j.kejadian.id}/entri`, STAF, {md: 3}); assert.equal(e2.status, 201, JSON.stringify(e2.j));
  assert.equal(e2.j.entri.kib, a.j.kejadian.kib + "-002");
  assert.equal((await call("POST", `/api/logbook/kejadian/${a.j.kejadian.id}/entri`, STAF, {md: 3})).j.entri.kib, a.j.kejadian.kib + "-003");
  /* kejadian kedua dengan 15 digit awal sama = indeks 2; jenis lain = kode lain; kode bencana mengikuti panduan_resmi.json */
  const b = await call("POST", "/api/logbook/kejadian", STAF, badan()); assert.equal(b.j.kejadian.kib, kib("longsor", "102") + "2");
  const c = await call("POST", "/api/logbook/kejadian", STAF, badan({jenis: "banjir"})); assert.equal(c.j.kejadian.kib, kib("banjir", "101") + "1");
  /* tanpa kab_bps, kab_bps salah provinsi, atau jenis tanpa kode DIBI: KIB null, kejadian tetap tercatat */
  for (const x of [{kab_bps: undefined}, {kab_bps: "3504"}, {kab_bps: "33"}, {jenis: "lainnya"}, {jenis: "kecelakaan"}]) { const r = await call("POST", "/api/logbook/kejadian", STAF, badan(x)); assert.equal(r.status, 201, JSON.stringify(x)); assert.equal(r.j.kejadian.kib, null, JSON.stringify(x)); assert.equal(r.j.entri.kib, null); }
  /* kejadian lama (tanpa KIB) mendapat KIB pada entri berikutnya bila kab_bps dikirim; urut = jumlah entri */
  const lama = await call("POST", "/api/logbook/kejadian", STAF, badan({kab_bps: undefined, jenis: "karhutla", kab: "33|Cilacap"})); assert.equal(lama.j.kejadian.kib, null);
  const l2 = await call("POST", `/api/logbook/kejadian/${lama.j.kejadian.id}/entri`, STAF, {luas_ha: 5, kab_bps: "3301"}); assert.equal(l2.j.entri.kib, "3301106" + hariIni().replaceAll("-", "") + "1-002");
  const buka = (await call("GET", "/api/logbook/buka?kab=" + encodeURIComponent("33|Cilacap"))).j.kejadian.find(k => k.id === lama.j.kejadian.id); assert.equal(buka.kib, l2.j.entri.kib.slice(0, 16));
  /* kode DIBI di kode == panduan_resmi.json */
  const {KODE_BENCANA} = await import("../../src/logbook.js"), pr = JSON.parse(readFileSync(path.join(AKAR, "scripts/wa/panduan_resmi.json"), "utf8")), sah = new Set(pr.jenis.map(j => j.kode));
  for (const [j, k] of Object.entries(KODE_BENCANA)) { assert.ok(sah.has(k), j); const r = pr.jenis.find(x => x.kode === k); if (r.kunci === j) assert.equal(r.kode, k); }
  assert.deepEqual([KODE_BENCANA.banjir, KODE_BENCANA.karhutla, KODE_BENCANA.gempabumi, KODE_BENCANA.wabah], ["101", "106", "107", "201"]);
});

uji("juklak: medan baru tersimpan dan terbaca di buat, entri lanjutan (menimpa, tidak terbawa), buka, hari", async () => {
  const a = await call("POST", "/api/logbook/kejadian", STAF, badan({kab: "33|Kebumen", kab_bps: "3305"})); assert.equal(a.status, 201, JSON.stringify(a.j));
  for (const k of ["kerugian_juta", "korban", "rentan", "pemberi", "dokumentasi", "posko"]) assert.deepEqual(a.j.entri[k], entri[k], k);
  assert.deepEqual(a.j.entri.prasarana, [{kode: "jalan", tingkat: "rb", jumlah: 1.5, satuan: "km"}, {kode: "sekolah", tingkat: "rr", jumlah: 2, satuan: "unit"}, {kode: "sawah", tingkat: null, jumlah: 7.25, satuan: "ha"}]);
  assert.deepEqual(a.j.entri.kebutuhan_rinci, entri.kebutuhan_rinci);
  const id = a.j.kejadian.id, e2 = await call("POST", `/api/logbook/kejadian/${id}/entri`, STAF, {md: 4, kerugian_juta: 2000, rentan: {lansia: 15}});
  assert.equal(e2.status, 201, JSON.stringify(e2.j)); assert.equal(e2.j.entri.kerugian_juta, 2000); assert.deepEqual(e2.j.entri.rentan, {lansia: 15}); assert.equal(e2.j.entri.korban, null, "yang tidak dikirim = tidak dilaporkan");
  const buka = (await call("GET", "/api/logbook/buka?kab=" + encodeURIComponent("33|Kebumen"))).j.kejadian[0]; assert.equal(buka.id, id); assert.equal(buka.entri_terkini.kerugian_juta, 2000); assert.equal(buka.kib, a.j.kejadian.kib);
  const h = (await call("GET", "/api/logbook/hari?tgl=" + new Date().toISOString().slice(0, 10))).j.entri.filter(x => x.kejadian_id === id);
  for (const x of h) { assert.equal(x.kejadian_mulai, a.j.kejadian.mulai); assert.equal(x.kejadian_kib, a.j.kejadian.kib); assert.ok(x.kib.startsWith(a.j.kejadian.kib)); }
  assert.equal(h.length, 2); assert.ok(h.some(x => x.kib === a.j.kejadian.kib + "-002" && x.kerugian_juta === 2000) && h.some(x => x.kib.endsWith("-001") && x.korban.md["0-17"].L === 1));
  /* nilai disimpan sebagai JSON tervalidasi di D1 */
  assert.equal((await DB.prepare("SELECT json_extract(korban, '$.md.\"0-17\".L') v FROM logbook_entri_juklak j JOIN logbook_entri e ON e.id = j.entri_id WHERE e.kejadian_id = ? AND j.kib_entri LIKE '%-001'").bind(id).first()).v, 1);
});

uji("juklak: entri lama tanpa medan baru tetap lolos (semua opsional) dan bentuk respons lama utuh", async () => {
  const r = await call("POST", "/api/logbook/kejadian", STAF, {...baru, kab: "33|Purworejo"}); assert.equal(r.status, 201, JSON.stringify(r.j));
  for (const k of ["id", "kejadian_id", "waktu", "md", "hilang", "luka", "mengungsi_jiwa", "kendala", "kebutuhan", "catatan", "sumber_instansi", "dibuat"]) assert.ok(k in r.j.entri, k);
  for (const k of ["kerugian_juta", "korban", "rentan", "prasarana", "kebutuhan_rinci", "pemberi", "dokumentasi", "posko", "kib"]) assert.equal(r.j.entri[k], null, k);
  assert.equal(r.j.kejadian.kib, null);
  for (const x of [{kerugian_juta: null}, {korban: null, rentan: null}, {prasarana: [], pemberi: [], dokumentasi: []}]) assert.equal((await call("POST", "/api/logbook/kejadian", STAF, {...baru, ...x})).status, 201, JSON.stringify(x));
});

uji("juklak: batas wajar dan validasi menolak 400 tanpa menyimpan; yakin:true meloloskan batas wajar, bukan batas mutlak", async () => {
  const sebelum = await n("logbook_kejadian"), sebelumE = await n("logbook_entri_juklak");
  const salah = [{kerugian_juta: -1}, {kerugian_juta: "5"}, {kerugian_juta: 1e6 + 1}, {kerugian_juta: 2e8, yakin: true},
    {korban: {md: {"0-17": {L: -1}}}}, {korban: {md: {"0-17": {L: 1.5}}}}, {korban: {md: {"5-9": {L: 1}}}}, {korban: {md: {"0-17": {X: 1}}}}, {korban: {pingsan: {"0-17": {L: 1}}}}, {hilang: 1, korban: {hilang: {"0-17": {L: 2}}}}, {terdampak_jiwa: 1, korban: {terdampak: {"0-17": {L: 2}}}}, {terdampak_jiwa: -1}, {terdampak_jiwa: 1.5}, {terdampak_jiwa: "50"}, {korban: [1]}, {korban: {md: {"0-17": {L: 6000}}}},
    {md: 2, korban: {md: {"18-59": {L: 2, P: 1}}}}, {luka: 1, korban: {luka: {"0-17": {L: 1}, "60+": {P: 1}}}},
    {rentan: {bayi: -1}}, {rentan: {kucing: 1}}, {rentan: {bayi: 3e6}},
    {prasarana: [{kode: "jalan", tingkat: "rb", jumlah: -1}]}, {prasarana: [{kode: "ufo", jumlah: 1}]}, {prasarana: [{kode: "pasar", tingkat: "hancur", jumlah: 1}]}, {prasarana: [{kode: "pasar", jumlah: 1.5}]}, {prasarana: [{kode: "pasar", jumlah: 1}, {kode: "pasar", jumlah: 2}]}, {prasarana: [{kode: "jalan", jumlah: 2e5}]}, {prasarana: Array(41).fill({kode: "pasar", tingkat: "rb", jumlah: 1})},
    {kebutuhan_rinci: [{kelompok: "makanan", barang: "x", jumlah: 1, satuan: "kg"}]}, {kebutuhan_rinci: [{kelompok: "dana", barang: "x", jumlah: 0, satuan: "kg"}]}, {kebutuhan_rinci: [{kelompok: "dana", barang: "", jumlah: 1, satuan: "kg"}]}, {kebutuhan_rinci: [{kelompok: "dana", barang: "x", jumlah: 1}]}, {kebutuhan_rinci: Array(31).fill({kelompok: "dana", barang: "x", jumlah: 1, satuan: "kg"})},
    {pemberi: ["a", "b", "c", "d"]}, {pemberi: ["BPBD 0812-3456-7890"]}, {pemberi: ["hubungi 081234567890"]}, {pemberi: ["+62 812 3456 7890"]}, {pemberi: ["andi@bpbd.go.id"]}, {pemberi: ["x"]}, {pemberi: "BPBD"},
    {dokumentasi: ["http://x.id/a"]}, {dokumentasi: ["javascript:alert(1)"]}, {dokumentasi: ["https://u:p@x.id/a"]}, {dokumentasi: ["https://x.id/a", "https://x.id/b", "https://x.id/c", "https://x.id/d"]}, {dokumentasi: ["bukan url"]}, {dokumentasi: ["https:/evil.com/x"]}, {dokumentasi: ["https:\\evil.com"]}, {dokumentasi: ["https://127.0.0.1/a"]}, {dokumentasi: ["https://[::1]/a"]}, {dokumentasi: ["https://a.com./x"]}, {dokumentasi: ["HTTPS://a.com/x"]},
    {pemberi: ["Budi 0812/3456/7890"]}, {pemberi: ["0812_3456_7890"]}, {pemberi: ["BPBD x\uff20y.com"]}, {pemberi: ["\uff10\uff18\uff11\uff12\uff13\uff14\uff15\uff16\uff17\uff18\uff19\uff10"]},
    {kebutuhan_rinci: [{kelompok: "dana", barang: "hubungi 081234567890", jumlah: 1, satuan: "kg"}]}, {kebutuhan_rinci: [{kelompok: "dana", barang: "x", jumlah: 1, satuan: "a@b.id"}]}, {posko: {ada: true, sk: "0812 3456 7890"}}, {posko: {ada: true, sk: "0812/3456/7890"}},
    {posko: {ada: "ya"}}, {posko: {ada: false, sk: "1/2026"}}, {posko: {ada: true, berlaku_sampai: "2026-02-30"}}, {posko: {ada: true, berlaku_mulai: "2026-11-10", berlaku_sampai: "2026-11-01"}}, {posko: {ada: true, sk: "x".repeat(81)}}];
  for (const x of salah) { const r = await call("POST", "/api/logbook/kejadian", STAF, badan(x)); assert.equal(r.status, 400, JSON.stringify(x).slice(0, 80) + " " + JSON.stringify(r.j)); }
  assert.equal(await n("logbook_kejadian"), sebelum); assert.equal(await n("logbook_entri_juklak"), sebelumE);
  const w = await call("POST", "/api/logbook/kejadian", STAF, badan({kerugian_juta: 1e6 + 1})); assert.equal(w.j.wajar, "kerugian_juta");
  assert.equal((await call("POST", "/api/logbook/kejadian", STAF, badan({kerugian_juta: 1e6 + 1, yakin: true, korban: undefined}))).status, 201, "yakin melewati batas wajar");
  assert.equal((await call("POST", "/api/logbook/kejadian", STAF, badan({kerugian_juta: 2e8, yakin: true}))).status, 400, "batas mutlak tidak bisa ditembus");
  const k = (await call("POST", "/api/logbook/kejadian", STAF, badan({kab: "33|Wonosobo"}))).j.kejadian.id;   // entri lanjutan memakai pemeriksa yang sama
  assert.equal((await call("POST", `/api/logbook/kejadian/${k}/entri`, STAF, {pemberi: ["BPBD 081234567890"]})).status, 400);
  assert.equal((await call("POST", `/api/logbook/kejadian/${k}/entri`, STAF, {rentan: {bayi: 1}})).status, 201);
  const sah = await call("POST", "/api/logbook/kejadian", STAF, badan({kab: "33|Magelang", dokumentasi: ["https://Drive.Google.com/drive/folders/abc"], posko: {ada: true, sk: "360/112/2026"}, pemberi: ["BPBD Kab. Magelang"]}));
  assert.equal(sah.status, 201, JSON.stringify(sah.j)); assert.equal(sah.j.entri.dokumentasi[0], "https://drive.google.com/drive/folders/abc", "URL disimpan kanonik"); assert.equal(sah.j.entri.posko.sk, "360/112/2026");
  assert.equal((await call("POST", "/api/logbook/kejadian", STAF, badan({kab: "33|Temanggung", md: 100, korban: {md: {"18-59": {L: 60, P: 40}}}}))).status, 201, "jumlah terpilah sama dengan total diterima");
});

uji("juklak: SK status per kejadian, hanya staf, provinsi didahulukan, validasi, duplikat nomor 409", async () => {
  const id = (await call("POST", "/api/logbook/kejadian", STAF, badan({kab: "33|Batang"}))).j.kejadian.id, url = `/api/logbook/kejadian/${id}/sk`;
  for (const h of [orig, LUAR]) { assert.equal((await call("POST", url, h, {})).status, 403); assert.equal((await call("GET", url, h)).status, 403); }
  const sk = {tingkat: "tanggap", wilayah: "kab", nomor: "360/101/2026", tgl_sk: "2026-10-30", tmt_mulai: "2026-10-30", tmt_selesai: "2026-11-05", tautan: "https://jdih.example.go.id/sk/101"};
  const a = await call("POST", url, STAF, sk); assert.equal(a.status, 201, JSON.stringify(a.j)); assert.equal(a.j.sk.perpanjangan_ke, 0); assert.equal(a.j.sk.oleh, undefined, "id pelaku tidak keluar");
  assert.equal((await call("POST", url, STAF, {...sk, tmt_mulai: "2026-11-06", nomor: "360/102/2026", perpanjangan_ke: 1, tmt_selesai: "2026-11-12"})).status, 201);
  assert.equal((await call("POST", url, STAF, {...sk, wilayah: "prov", nomor: "188/445/2026", tmt_mulai: "2026-10-01", tmt_selesai: null, tautan: null})).status, 201);
  const d = await call("GET", url, STAF); assert.equal(d.status, 200); assert.equal(d.cc, "no-store");
  assert.deepEqual(d.j.sk.map(x => x.nomor), ["188/445/2026", "360/102/2026", "360/101/2026"], "SK provinsi dulu walau TMT-nya paling lama, lalu kab terbaru dulu");
  assert.equal((await call("POST", url, STAF, sk)).status, 409, "nomor sama");
  assert.equal((await call("POST", url, STAF, {...sk, nomor: "0812 3456 7890"})).status, 400, "nomor SK berpola telepon");
  assert.equal((await call("POST", url, STAF, {...sk, nomor: "360/123/BPBD/2026", tautan: "https://127.0.0.1/sk"})).status, 400, "tautan IP literal");
  assert.equal((await call("POST", url, STAF, {...sk, nomor: "360/123/BPBD/2026", tautan: "https:/evil.com/x"})).status, 400);
  assert.equal((await call("POST", url, STAF, {...sk, nomor: "360/123/BPBD/2026", tautan: "https://a.com/x"})).status, 201, "nomor surat sah tidak salah tolak");
  for (const x of [{tingkat: "darurat"}, {wilayah: "nasional"}, {nomor: ""}, {nomor: "x".repeat(81)}, {tmt_mulai: undefined}, {tmt_mulai: "30-10-2026"}, {tmt_selesai: "2026-10-01"}, {tgl_sk: "2026-13-01"}, {perpanjangan_ke: 21}, {perpanjangan_ke: -1}, {perpanjangan_ke: 1.5}, {tautan: "http://x.id/a"}, {tautan: "ftp://x.id"}])
    assert.equal((await call("POST", url, STAF, {...sk, nomor: "N" + Math.random(), ...x})).status, 400, JSON.stringify(x));
  assert.equal((await call("POST", `/api/logbook/kejadian/0123456789abcdef/sk`, STAF, sk)).status, 404); assert.equal((await call("GET", `/api/logbook/kejadian/0123456789abcdef/sk`, STAF)).status, 404);
  assert.equal(await n(`logbook_sk WHERE kejadian_id = '${id}'`), 4);
});

uji("juklak: migrasi 0094 idempoten dan induk dihapus membawa anak (ON DELETE CASCADE)", async () => {
  const sql = readFileSync(path.join(AKAR, "migrations", "0094_logbook_juklak.sql"), "utf8"), kib0 = await n("logbook_kib"), jk0 = await n("logbook_entri_juklak"), sk0 = await n("logbook_sk");
  await DB.batch(pecah(sql).map(x => DB.prepare(x))); await DB.batch(pecah(sql).map(x => DB.prepare(x)));
  assert.deepEqual([await n("logbook_kib"), await n("logbook_entri_juklak"), await n("logbook_sk")], [kib0, jk0, sk0], "ulang tidak menghapus isi");
  const id = (await call("POST", "/api/logbook/kejadian", STAF, badan({kab: "33|Pati", kab_bps: "3318"}))).j.kejadian.id;
  await call("POST", `/api/logbook/kejadian/${id}/sk`, STAF, {tingkat: "siaga", wilayah: "prov", nomor: "1/2026", tmt_mulai: "2026-11-01"});
  await DB.batch([DB.prepare("DELETE FROM logbook_entri WHERE kejadian_id = ?").bind(id), DB.prepare("DELETE FROM logbook_kejadian WHERE id = ?").bind(id)]);
  assert.deepEqual([await n(`logbook_kib WHERE kejadian_id = '${id}'`), await n("logbook_entri_juklak WHERE entri_id NOT IN (SELECT id FROM logbook_entri)"), await n(`logbook_sk WHERE kejadian_id = '${id}'`)], [0, 0, 0]);
  await assert.rejects(DB.prepare("UPDATE logbook_kib SET kib = '123' WHERE rowid = 1").run(), /CHECK/);
  await assert.rejects(DB.prepare("INSERT INTO logbook_sk (id, kejadian_id, tingkat, wilayah, nomor, tmt_mulai, dibuat) VALUES ('aaaaaaaaaaaaaaaa', 'bbbbbbbbbbbbbbbb', 'siaga', 'kab', 'x', '2026-01-01', 1)").run(), /FOREIGN KEY|constraint/i);
});

uji("juklak: dummy mengisi medan baru (KIB, korban terpilah, prasarana, SK) dan hapus bersih", async () => {
  const dum = aksi => call("POST", "/api/logbook/dummy", ADMIN, {aksi}), sebelumKib = await n("logbook_kib"), sebelumSk = await n("logbook_sk");
  assert.equal((await dum("isi")).status, 201);
  const k = (await DB.prepare("SELECT k.id, b.kib FROM logbook_kejadian k JOIN logbook_kib b ON b.kejadian_id = k.id WHERE k.dummy = 1").all()).results; assert.equal(k.length, 4, "tiap kejadian dummy ber-KIB"); for (const x of k) assert.match(x.kib, /^\d{16}$/);
  const j = (await DB.prepare("SELECT j.* FROM logbook_entri_juklak j JOIN logbook_entri e ON e.id = j.entri_id JOIN logbook_kejadian k ON k.id = e.kejadian_id WHERE k.dummy = 1").all()).results;
  for (const kol of ["kib_entri", "kerugian_juta", "korban", "rentan", "prasarana", "kebutuhan_rinci", "pemberi", "dokumentasi", "posko"]) assert.ok(j.some(x => x[kol] != null), kol + " terisi di minimal satu entri dummy");
  assert.equal(await n("logbook_sk WHERE oleh = 'dummy'"), 2);
  const sk = (await call("GET", `/api/logbook/kejadian/${(await DB.prepare("SELECT kejadian_id FROM logbook_sk WHERE oleh = 'dummy'").first()).kejadian_id}/sk`, STAF)).j.sk; assert.equal(sk[0].wilayah, "prov");
  assert.equal((await dum("hapus")).status, 200);
  assert.deepEqual([await n("logbook_kib"), await n("logbook_sk")], [sebelumKib, sebelumSk]);
  assert.equal(await n("logbook_entri_juklak WHERE entri_id NOT IN (SELECT id FROM logbook_entri)"), 0);
});

uji("juklak: enam kriteria ambang kejadian, batasnya tepat dan terendam tidak dihitung rusak", () => {
  const ya = e => ambangKejadian(e).ya;
  for (const e of [{md: 1}, {luka: 50}, {mengungsi_jiwa: 50}, {korban: {terdampak_jiwa: 50}}, {rumah_rb: 2, rumah_rs: 2, rumah_rr: 1}, {rumah_rb: 3, prasarana: [{kode: "sekolah", tingkat: "rr", jumlah: 2}]}, {luas_ha: 1}, {prasarana: [{kode: "sawah", jumlah: 1}]}, {kebutuhan: ["bantuan_nasional"]}, {ada_sk: 1}])
    assert.equal(ya(e), true, JSON.stringify(e));
  for (const e of [{}, {md: 0, hilang: 3}, {luka: 49}, {korban: {terdampak_jiwa: 49}}, {rumah_rb: 4}, {rumah_terendam: 500}, {prasarana: [{kode: "sekolah", tingkat: "terendam", jumlah: 9}]}, {prasarana: [{kode: "sekolah", jumlah: 9}]}, {prasarana: [{kode: "jalan", tingkat: "rb", jumlah: 9}]}, {luas_ha: 0.99}, {kebutuhan: ["tenda"]}, {ada_sk: 0}])
    assert.equal(ya(e), false, JSON.stringify(e));
  assert.deepEqual(ambangKejadian({}).alasan, []);
});

uji("juklak: hilang dan terdampak tersimpan, ambang ikut balasan dan berubah setelah SK terbit", async () => {
  const dasar = {jenis: "banjir", kab: "33|Temanggung", mulai: hariIni(), kendala: [], kebutuhan: []};
  const a = await call("POST", "/api/logbook/kejadian", STAF, {...dasar, hilang: 2, terdampak_jiwa: 40, korban: {hilang: {"18-59": {L: 1, P: 1}}, terdampak: {"0-17": {L: 20, P: 20}}}});
  assert.equal(a.status, 201, JSON.stringify(a.j));
  assert.deepEqual(a.j.entri.korban.hilang, {"18-59": {L: 1, P: 1}}); assert.equal(a.j.entri.korban.terdampak_jiwa, 40);
  assert.deepEqual(a.j.entri.ambang, {ya: false, alasan: []}, "di bawah ambang tetap tercatat, hanya ditandai"); assert.equal("ada_sk" in a.j.entri, false);
  const id = a.j.kejadian.id;
  assert.equal((await call("POST", `/api/logbook/kejadian/${id}/sk`, STAF, {tingkat: "tanggap", wilayah: "kab", nomor: "360/900/2026", tmt_mulai: "2026-10-30"})).status, 201);
  const h = (await call("GET", "/api/logbook/hari?tgl=" + hariIni(), STAF)).j;
  const baris = (h.entri || h.daftar).find(x => x.kejadian_id === id);
  assert.ok(baris.ambang.ya, "SK di logbook_sk memenuhi kriteria f"); assert.match(baris.ambang.alasan.join(), /status keadaan darurat/);
  const b = await call("POST", "/api/logbook/kejadian", STAF, {...dasar, kab: "33|Kebumen", kebutuhan: ["bantuan_nasional"]});
  assert.equal(b.status, 201, JSON.stringify(b.j)); assert.equal(b.j.entri.ambang.ya, true);
  const t = await call("POST", "/api/logbook/kejadian", STAF, {...dasar, kab: "33|Cilacap", terdampak_jiwa: 75});
  assert.equal(t.status, 201, JSON.stringify(t.j)); assert.equal(t.j.entri.ambang.ya, true); assert.equal(t.j.entri.korban.terdampak_jiwa, 75);
});
