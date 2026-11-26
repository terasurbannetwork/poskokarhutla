/* Semai banjir: zona -B, sasaran manual, SEMAI_TOKEN (src/operasi_semai.js, migrations/0181_semai_sasaran.sql; data/kajian-bnpb/semai-banjir/RENCANA-UJI.md §4).
   Worker sungguhan di Miniflare dengan D1 dan R2 lokal; arsip R2 = fixture uji (bentuk DESAIN-TEKNIS semai-banjir §2).
   Jalankan: node --test tests/warga/semai_banjir_rute.test.mjs */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import path from "node:path";
import {AKAR, pecah} from "./_bantu.mjs";
import {siapkan, berantai, ADMIN, MOD2} from "./_bnpb.mjs";
import {NAMA_KAB4} from "../../src/siklus_kab.js";
import "../../src/worker.js";

const PB = {"x-pb": "1", origin: "http://bnpb.lokal"};
const TOKEN = "t".repeat(40), uji = berantai();
const U = await siapkan("uji-semai-banjir", {r2: true, ikat: {SEMAI_TOKEN: TOKEN}});
const {DB, api, n, mf} = U;
const R2 = await mf.getR2Bucket("MEDIA");
const kini = Date.now(), wibStr = t => new Date(t + 7 * 3600e3).toISOString().slice(0, 10), iso = t => new Date(t).toISOString();
const hari = wibStr(kini), besok = wibStr(kini + 864e5), kemarin = wibStr(kini - 864e5), lusa = wibStr(kini + 2 * 864e5);
const P = "2026112512", PK = "2026112500", HS = "2026-11-26";
const bz = (h, o = {}) => ({id: `${P}-B${h}`, huruf: h, tujuan: "banjir", lat: -5.8, lon: 106.6, skor: 0.59, langkah: 27, jendela: [iso(kini + 6 * 3600e3), iso(kini + 9 * 3600e3)],
  alasan: {sasaran: ["3172"], C: "c"}, base: {id: "PKY"}, ...o});
await R2.put(`operasi/semai/arsip/${P}_banjir.json`, JSON.stringify({hari_sasaran: HS, zona: [bz("A"), bz("B")]}));
await R2.put(`operasi/semai/arsip/${PK}.json`, JSON.stringify({zona: [{id: `${PK}-A`, lat: -1.4, lon: 115.3, skor: 0.7, jendela: [iso(kini + 6 * 3600e3), iso(kini + 9 * 3600e3)], alasan: ["x"], base: {id: "PKY"}}]}));
await R2.put("operasi/semai/arsip/2026112600_banjir.json", JSON.stringify({zona: [bz("A", {id: "2026112600-BA"})]}));   // tanpa hari_sasaran
for (const f of ["semai_banjir.json", "rapor_banjir.json"]) await R2.put("operasi/semai/" + f, "{}");
let nipN = 0, ipN = 0;
const bikin = async (nama, peran) => {
  const r = await api("POST", "/api/staf/admin/buat", {nama, nip: `19970${++nipN}0012005`, unit: "Pusdalops BNPB", email: `sb${nipN}@bnpb.go.id`, wa: "081234567890", peran, wilayah: []}, ADMIN); assert.equal(r.s, 201, r.t);
  const m = await api("POST", "/api/staf/masuk", {username: r.j.username, sandi: r.j.sandi}, {"cf-connecting-ip": `192.0.2.${++ipN}`}); assert.equal(m.s, 200, m.t);
  const cookie = m.h.get("set-cookie").split(";")[0]; assert.equal((await api("POST", "/api/staf/gantisandi", {}, {cookie, ...PB})).s, 200);
  return {h: {cookie}, hp: {cookie, ...PB}};
};
const bear = t => ({authorization: "Bearer " + t});
const pos = (b, h) => api("POST", "/api/operasi/semai/target", b, h);
const sas = (b, h) => api("POST", "/api/operasi/semai/sasaran", b, h);
const hps = (b, h) => api("POST", "/api/operasi/semai/sasaran/hapus", b, h);
let pusdalops, udara, idT;

uji("migrasi 0181 dua kali; kab bukan 4 huruf, catatan >300, kolom wajib kosong, kembar aktif ditolak", async () => {
  for (const s of pecah(readFileSync(path.join(AKAR, "migrations/0181_semai_sasaran.sql"), "utf8"))) await DB.prepare(s).run();
  const sisip = (kab, cat = null, oleh = "o") => DB.prepare("INSERT INTO op_semai_sasaran (id,kab,tanggal,catatan,oleh,dibuat) VALUES (?,?,'2026-01-01',?,?,'d')").bind(crypto.randomUUID(), kab, cat, oleh).run();
  await assert.rejects(sisip("31720"), "kab 5 huruf"); await assert.rejects(sisip("317"), "kab 3 huruf");
  await assert.rejects(sisip("3172", "x".repeat(301)), "catatan 301"); await assert.rejects(sisip("3172", null, null), "oleh wajib");
  await sisip("3172"); await assert.rejects(sisip("3172"), "kembar aktif");
  await DB.prepare("DELETE FROM op_semai_sasaran WHERE tanggal = '2026-01-01'").run();
  pusdalops = await bikin("Pusdalops Banjir", ["pusdalops"]); udara = await bikin("Udara Banjir", ["udara"]);
});

uji("target -B: arsip banjir, alasan_json memuat sasaran dan hari_sasaran dari arsip bukan dari klien", async () => {
  const r = await pos({zona_id: `${P}-BA`, putaran: P, base_id: "PKY", tanggal: besok, hari_sasaran: "2000-01-01", alasan: ["palsu"]}, pusdalops.hp); assert.equal(r.s, 201, r.t); idT = r.j.id;
  const b = await DB.prepare("SELECT * FROM op_semai_target WHERE id = ?").bind(idT).first(), a = JSON.parse(b.alasan_json);
  assert.deepEqual(a.sasaran, ["3172"]); assert.equal(a.hari_sasaran, HS); assert.equal(b.tanggal, besok); assert.deepEqual([b.lat, b.lon], [-5.8, 106.6]);
});

uji("target -B ditolak: hanya arsip karhutla 404, tanpa hari_sasaran 404, pola zona_id 400, peran salah 403, token 403", async () => {
  assert.equal((await pos({zona_id: `${PK}-BA`, putaran: PK, base_id: "PKY", tanggal: hari}, pusdalops.hp)).s, 404, "hanya arsip karhutla ada");
  assert.equal((await pos({zona_id: "2026112600-BA", putaran: "2026112600", base_id: "PKY", tanggal: hari}, pusdalops.hp)).s, 404, "arsip tanpa hari_sasaran");
  for (const z of [`${P}-BF`, `${P}-XA`, `${P}-BAA`, `${P}-BBA`]) assert.equal((await pos({zona_id: z, putaran: P, base_id: "PKY", tanggal: hari}, pusdalops.hp)).s, 400, z);
  const b = {zona_id: `${P}-BB`, putaran: P, base_id: "PKY", tanggal: hari};
  assert.equal((await pos(b, udara.hp)).s, 403);
  assert.equal((await pos(b, {})).s, 403);
  assert.equal((await pos(b, bear(TOKEN))).s, 403, "token tidak menulis");
});

uji("target karhutla -A tetap bekerja dan alasan_json tetap larik", async () => {
  const r = await pos({zona_id: `${PK}-A`, putaran: PK, base_id: "PKY", tanggal: hari}, pusdalops.hp); assert.equal(r.s, 201, r.t);
  assert.deepEqual(JSON.parse((await DB.prepare("SELECT alasan_json j FROM op_semai_target WHERE id = ?").bind(r.j.id).first()).j), ["x"]);
});

uji("sasaran: kab sah 201; kab tak dikenal, teks bebas, tanggal salah, catatan panjang 400; ganda 409; hapus lalu 201", async () => {
  const b = {kab: "3172", tanggal: hari, catatan: " uji\u0000 sasaran "};
  const r = await sas(b, pusdalops.hp); assert.equal(r.s, 201, r.t);
  assert.equal((await DB.prepare("SELECT catatan FROM op_semai_sasaran WHERE id = ?").bind(r.j.id).first()).catatan, "uji sasaran");
  assert.equal((await sas({kab: "3172", tanggal: hari}, MOD2)).s, 409);
  for (const x of [{kab: "9999"}, {kab: "Jakarta Utara"}, {kab: 3172}, {kab: "__proto__"}, {tanggal: kemarin}, {tanggal: lusa}, {catatan: "x".repeat(301)}])
    assert.equal((await sas({kab: "3173", tanggal: hari, ...x}, pusdalops.hp)).s, 400, JSON.stringify(x));
  assert.equal((await hps({id: r.j.id, alasan: "abc"}, pusdalops.hp)).s, 400);
  assert.equal((await hps({id: r.j.id, alasan: "salah pilih kab"}, udara.hp)).s, 403);
  assert.equal((await hps({id: r.j.id, alasan: "salah pilih kab"}, bear(TOKEN))).s, 403);
  assert.equal((await hps({id: r.j.id, alasan: "salah pilih kab"}, pusdalops.hp)).s, 200);
  assert.equal((await hps({id: r.j.id, alasan: "salah pilih kab"}, pusdalops.hp)).s, 404);
  assert.equal((await sas(b, pusdalops.hp)).s, 201, "sesudah hapus lunak boleh lagi");
});

uji("sasaran: tamu, pembaca saja, dan token tak boleh menulis", async () => {
  for (const [nama, h] of [["tamu", {}], ["pembaca udara", udara.hp], ["token", bear(TOKEN)]]) assert.equal((await sas({kab: "3174", tanggal: hari}, h)).s, 403, nama);
  assert.equal(await n("op_semai_sasaran", "kab = '3174'"), 0);
});

uji("GET sasaran dan target: sesi pembaca, moderator, dan SEMAI_TOKEN 200; tamu 403", async () => {
  assert.equal((await api("GET", `/api/operasi/semai/sasaran?tanggal=${hari}`, undefined, {})).s, 403);
  for (const h of [udara.h, MOD2, bear(TOKEN)]) {
    const s = await api("GET", `/api/operasi/semai/sasaran?tanggal=${hari}`, undefined, h); assert.equal(s.s, 200, s.t); assert.deepEqual(s.j.map(x => x.kab), ["3172"]);
    assert.ok(!("oleh" in s.j[0]));
    assert.equal((await api("GET", `/api/operasi/semai/target?tanggal=${besok}`, undefined, h)).s, 200);
  }
  assert.equal((await api("GET", "/api/operasi/semai/sasaran?tanggal=bukan", undefined, bear(TOKEN))).s, 400);
});

uji("SEMAI_TOKEN: beda satu byte, terpotong, kelebihan, kosong 401; token tidak membuka rute lain", async () => {
  for (const t of [TOKEN.slice(0, -1) + "u", TOKEN.slice(0, -1), TOKEN + "t", "x"]) {
    assert.equal((await api("GET", `/api/operasi/semai/sasaran?tanggal=${hari}`, undefined, bear(t))).s, 401, t);
    assert.equal((await api("GET", `/api/operasi/semai/target?tanggal=${hari}`, undefined, bear(t))).s, 401, t);
  }
  assert.equal((await api("GET", `/api/operasi/semai/sasaran?tanggal=${hari}`, undefined, {authorization: "Bearer "})).s, 403, "tanpa nilai = tanpa kredensial");
  for (const j of ["/api/operasi/peta", "/api/operasi/semai/berkas/semai_banjir.json", "/api/staf/admin/daftar"])
    assert.notEqual((await api("GET", j, undefined, bear(TOKEN))).s, 200, j);
  assert.equal((await api("POST", "/api/operasi/semai/target/hapus", {id: idT, alasan: "coba pakai token"}, bear(TOKEN))).s, 403);
  assert.equal(await n("op_semai_target", "terhapus IS NOT NULL"), 0);
});

uji("secret Worker kosong: jalur token mati 401, tanpa nilai cadangan", async () => {
  const V = await siapkan("uji-semai-banjir-kosong", {r2: true, ikat: {SEMAI_TOKEN: ""}});
  for (const t of ["x", TOKEN]) assert.equal((await V.api("GET", "/api/operasi/semai/sasaran", undefined, bear(t))).s, 401, t);
  assert.equal((await V.api("GET", "/api/operasi/semai/target", undefined, {})).s, 403);
});

uji("secret pendek (< 32): jalur token mati 401 walau tokennya cocok", async () => {
  const V = await siapkan("uji-semai-banjir-pendek", {r2: true, ikat: {SEMAI_TOKEN: "pendek"}});
  assert.equal((await V.api("GET", "/api/operasi/semai/sasaran", undefined, bear("pendek"))).s, 401);
  assert.equal((await V.api("GET", "/api/operasi/semai/target", undefined, bear("pendek"))).s, 401);
});

uji("token sah ditolak 403 di semua rute selain dua GET: POST sasaran, target, hapus sasaran, GET berkas", async () => {
  const h = bear(TOKEN);
  assert.equal((await sas({kab: "3175", tanggal: hari}, h)).s, 403);
  assert.equal((await pos({zona_id: `${P}-BB`, putaran: P, base_id: "PKY", tanggal: hari}, h)).s, 403);
  assert.equal((await hps({id: "x", alasan: "coba pakai token"}, h)).s, 403);
  assert.equal((await api("GET", "/api/operasi/semai/berkas/semai_banjir.json", undefined, h)).s, 403);
  assert.equal(await n("op_semai_sasaran", "kab = '3175'"), 0);
});

uji("laju dicek sebelum duplikat: akun di batas dapat 429, bukan 409, pada kab yang sudah aktif", async () => {
  const w = await bikin("Pusdalops Laju C", ["pusdalops"]), kabs = Object.keys(NAMA_KAB4).filter(k => !["3172", "3173", "3174", "3175"].includes(k)).slice(100, 130);
  for (const k of kabs) assert.equal((await sas({kab: k, tanggal: besok}, w.hp)).s, 201);
  assert.equal((await sas({kab: kabs[0], tanggal: besok}, w.hp)).s, 429, "duplikat tetap dihitung kuota");
  assert.equal((await sas({kab: kabs[0], tanggal: besok}, pusdalops.hp)).s, 409);
});

uji("tabel sasaran belum ada: 503 dengan pesan sendiri tanpa menyebut migrasi 0103", async () => {
  const V = await siapkan("uji-semai-banjir-lama", {r2: true, ikat: {SEMAI_TOKEN: TOKEN}, sampai: "0179_"});
  for (const [m, j, b] of [["POST", "/api/operasi/semai/sasaran", {kab: "3172", tanggal: hari}], ["POST", "/api/operasi/semai/sasaran/hapus", {id: "x", alasan: "uji tabel hilang"}], ["GET", "/api/operasi/semai/sasaran", undefined]]) {
    const r = await V.api(m, j, b, m === "GET" ? bear(TOKEN) : MOD2); assert.equal(r.s, 503, j); assert.doesNotMatch(r.t, /0103/);
  }
});

uji("GET target ?sejak=: rentang urut tanggal, tanpa sejak satu hari, validasi", async () => {
  const w = await bikin("Pusdalops Sejak", ["pusdalops"]);
  assert.equal((await pos({zona_id: `${P}-BB`, putaran: P, base_id: "PKY", tanggal: hari}, w.hp)).s, 201);
  const r = await api("GET", `/api/operasi/semai/target?sejak=${hari}&tanggal=${besok}`, undefined, bear(TOKEN)); assert.equal(r.s, 200, r.t);
  assert.ok(r.j.length >= 3 && r.j.every(x => x.tanggal >= hari && x.tanggal <= besok) && r.j.some(x => JSON.parse(x.alasan_json).hari_sasaran === HS));
  assert.deepEqual(r.j.map(x => x.tanggal), [...r.j.map(x => x.tanggal)].sort());
  assert.ok((await api("GET", `/api/operasi/semai/target?tanggal=${hari}`, undefined, bear(TOKEN))).j.every(x => x.tanggal === hari), "tanpa sejak = satu hari");
  for (const q of [`sejak=${besok}&tanggal=${hari}`, "sejak=bukan", `sejak=2020-01-01&tanggal=${hari}`]) assert.equal((await api("GET", "/api/operasi/semai/target?" + q, undefined, bear(TOKEN))).s, 400, q);
});

uji("berkas banjir dilayani; yang mirip ditolak 404", async () => {
  for (const f of ["semai_banjir.json", "rapor_banjir.json", `arsip/${P}_banjir.json`]) assert.equal((await api("GET", "/api/operasi/semai/berkas/" + f, undefined, MOD2)).s, 200, f);
  for (const f of ["semai_banjir.json.bak", "arsip/../x", "arsip/abc_banjir.json", `arsip/${P}_banjir.jsonx`, "rapor.json"]) assert.equal((await api("GET", "/api/operasi/semai/berkas/" + f, undefined, MOD2)).s, 404, f);
});

uji("sasaran ke-31 sehari 429, baris terhapus ikut dihitung, akun lain tidak terkena", async () => {
  const w = await bikin("Pusdalops Laju B", ["pusdalops"]), kabs = Object.keys(NAMA_KAB4).filter(k => !["3172", "3173"].includes(k)), ids = [];
  for (const k of kabs.slice(0, 30)) { const r = await sas({kab: k, tanggal: besok}, w.hp); assert.equal(r.s, 201, r.t); ids.push(r.j.id); }
  const x = {kab: kabs[30], tanggal: besok};
  assert.equal((await sas(x, w.hp)).s, 429);
  assert.equal((await hps({id: ids[0], alasan: "uji hitung hapus"}, w.hp)).s, 200);
  assert.equal((await sas(x, w.hp)).s, 429);
  assert.equal((await sas(x, pusdalops.hp)).s, 201);
});
