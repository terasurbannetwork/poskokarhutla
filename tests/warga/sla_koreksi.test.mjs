/* Koreksi review gelombang 1 (docs/bnpb/RENCANA-LANJUT.md §2.1 W9): alarm dummy tidak bocor ke baris nyata, kabar at-most-once dengan antrean ulang,
   kunci darurat per jendela 5 menit + batas per tugas, batas laju token pipeline, dummy 503 tanpa tulis sebagian, masker titik tak terbaca, batas alarm baru per putaran,
   cakupan rusak di kabarLevel3, staf berwilayah di /api/sla. worker.js utuh di workerd, D1 + R2 lokal sungguhan. Jalankan: node --test tests/warga/sla_koreksi.test.mjs */
import assert from "node:assert/strict";
import {createECDH, generateKeyPairSync, randomBytes} from "node:crypto";
import {readFileSync, existsSync} from "node:fs";
import path from "node:path";
import {AKAR} from "./_bantu.mjs";
import "../../src/worker.js";
import {siapkan, berantai, ADMIN, sha256} from "./_bnpb.mjs";

const MENIT = 60e3, JAM = 3600e3, HARI = 24 * JAM, PB = {"x-pb": "1"}, SUPER = {"x-admin-token": "rahasia-admin"};
const uji = berantai(), b64 = b => Buffer.from(b).toString("base64url");
const {privateKey} = generateKeyPairSync("ec", {namedCurve: "prime256v1"}), jwk = privateKey.export({format: "jwk"});
const KUNCI = {VAPID_PUBLIK: b64(Buffer.concat([Buffer.from([4]), Buffer.from(jwk.x, "base64url"), Buffer.from(jwk.y, "base64url")])), VAPID_PRIVAT: jwk.d, VAPID_SUBJEK: "mailto:pemilik@contoh.id"};
const IKAT = {...KUNCI, FIRMS_MAP_KEY: "kunci-firms", EMAIL_API_KEY: "re_uji", EMAIL_FROM: "Centurisk97 <kabar@centurisk97.id>", EMAIL_TO: "pos@contoh.id", PIPA_TOKEN: "token-pipa-uji"};

/* jaringan luar; GAGAL_* = berapa panggilan berikutnya dijawab 500 (kegagalan sementara) */
let GAGAL_SURAT = 0, GAGAL_PUSH = 0; const surel = [], dorong = [];
const luar = async req => {
  const u = new URL(req.url);
  if (u.hostname === "api.resend.com") { if (GAGAL_SURAT > 0) { GAGAL_SURAT--; await req.text(); return new Response("gagal sementara", {status: 500}); } surel.push(JSON.parse(await req.text())); return new Response('{"id":"x"}'); }
  if (u.hostname === "fcm.googleapis.com") { if (GAGAL_PUSH > 0) { GAGAL_PUSH--; return new Response(null, {status: 503}); } dorong.push(req.url); return new Response(null, {status: 201}); }
  return new Response("diblok di uji", {status: 599});
};
let KOMPLEKS = null;
const aset = async req => {
  const p = decodeURIComponent(new URL(req.url).pathname);
  if (p === "/data/tugas_kompleks.json" && KOMPLEKS) return Response.json(KOMPLEKS);
  const f = path.join(AKAR, "public", p);
  return existsSync(f) && f.startsWith(path.join(AKAR, "public")) && !p.endsWith("/") ? new Response(readFileSync(f)) : new Response("tidak ada", {status: 404});
};
const tunggu = async (kond, ms = 4000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (kond()) return true; await new Promise(r => setTimeout(r, 25)); } return kond(); };
const id16 = () => randomBytes(8).toString("hex"), mnt = m => { const d = new Date(); d.setUTCMinutes(m, 0, 0); return d.getTime(); };

const U = await siapkan("uji-sla-koreksi", {r2: true, ikat: IKAT, luar, asetKu: aset});
const {DB, api, n} = U, W = await U.mf.getWorker(), R2 = await U.mf.getR2Bucket("MEDIA");
const sisip = (tabel, o, T = U) => T.DB.prepare(`INSERT INTO ${tabel} (${Object.keys(o).join(", ")}) VALUES (${Object.keys(o).map(() => "?").join(", ")})`).bind(...Object.values(o)).run();
/* jam UTC kelipatan 3 menit >= 25 adalah jendela push ringkasan 3 jam (worker.js); uji kabar menghitung push,
   jadi waktu cron digeser mundur ke menit 24 jam yang sama supaya hasilnya tidak bergantung jam dinding */
const luarRingkasan = ms => { const w = new Date(ms); return w.getUTCHours() % 3 === 0 && w.getUTCMinutes() >= 25 ? ms - (w.getUTCMinutes() - 24) * 60000 : ms; };
const cron = (ms, T = W) => T.scheduled({cron: "* * * * *", scheduledTime: luarRingkasan(ms)});
let nip = 0;
const staf = async (peran, wilayah = []) => {
  const r = await api("POST", "/api/staf/admin/buat", {nama: "Siti Koreksi", nip: `19800${++nip}0012005`, unit: "Pusdalops BNPB", email: `k${nip}@bnpb.go.id`, wa: "081234567890", peran, wilayah}, ADMIN); assert.equal(r.s, 201, r.t);
  const ip = {"cf-connecting-ip": `198.51.100.${nip}`}, m = await api("POST", "/api/staf/masuk", {username: r.j.username, sandi: r.j.sandi}, ip), cookie = m.h.get("set-cookie").split(";")[0];
  assert.equal((await api("POST", "/api/staf/gantisandi", {}, {cookie, ...PB})).s, 200); return {cookie};
};
const akun = async (T, {user, kab = "Pulang Pisau", email = "budi@x.go.id", push = true, tingkat = "kab", cakupan = '["62"]'}) => {
  const id = id16(), ec = createECDH("prime256v1"); ec.generateKeys();
  await sisip("instansi_akun", {id, username: user, jenis: "pemkab", tingkat, wilayah: `Pemkab ${kab}`, kunci_wilayah: `62|${kab}|${user}`, cakupan, prov: "62", kab: tingkat === "prov" ? null : kab, garam: "g".repeat(32), sandi_sha: "a".repeat(64), status: "aktif",
    nama: "Budi Rahasia", nip: "198001012005011001", jabatan: "Kepala", unit: "BPBD", email, wa: "6281234567890", surat: 1, kartu: 1, wajib_ganti: 0, dibuat: Date.now()}, T);
  const ep = `https://fcm.googleapis.com/fcm/send/${randomBytes(6).toString("hex")}`;
  if (push) await sisip("push_langganan", {id: id16(), akun_id: id, endpoint: ep, p256dh: b64(ec.getPublicKey()), auth: b64(randomBytes(16)), dibuat: Date.now()}, T);
  return {id, ep};
};
const tugas = (o, T = U) => { const id = id16(); return sisip("tugas_api", {id, prov: "62", kab: "Pulang Pisau", kec: "Kec", lat: -2.5, lon: 114, level: 3, dibuat: Date.now(), terakhir_terdeteksi: Date.now(), ...o}, T).then(() => id); };
const penugasan = (tid, a, token, nama = "Regu Melati", T = U) => sisip("penugasan", {id: id16(), tugas_id: tid, akun_id: a.id, nama, peran: "ketua_regu", orang: 5, token_sha: sha256(token), status: "aktif", dibuat: Date.now() - 1000, kedaluwarsa: Date.now() + HARI}, T);
const darurat = (token, jenis = "cedera") => api("POST", "/api/lacak/darurat", {jenis}, {"x-lacak": token, ...PB});
const hw = (baris, acuan = Date.now() - 10 * MENIT) => R2.put("data/himawari.json", JSON.stringify({acuan: new Date(acuan).toISOString(), jam: 3, kolom: [], baris}));

uji("koreksi: alarm dummy aktif tidak ikut cron: piksel nyata membuat alarm nyata baru, dummy siaga tidak diperbarui/dihilangkan/dikunci, alarm nyata terkunci oleh tugas VIIRS dan dikabari", async () => {
  surel.length = 0;
  const dummy = id16().replace(/^./, "d").replace(/^d/, "dummy").slice(0, 16);   // id berawalan "dummy"
  const lama = Date.now() - 8 * JAM;   // sudah lewat 6 jam: alarm nyata seperti ini akan 'hilang'
  await sisip("alarm_himawari", {id: dummy, lat: -2, lon: 114, radius_m: 2000, pertama: lama - JAM, terakhir: lama, n_pindai: 1, frp: 1, status: "siaga"});
  await hw([[-2.005, 114.005, 20, 30, 3, 3, 1, 3, 50]]);
  await cron(Date.now());
  const A = (await DB.prepare("SELECT id, status, n_pindai, terakhir, frp, dikabarkan_pada FROM alarm_himawari ORDER BY id").all()).results, nyata = A.filter(a => !a.id.startsWith("dummy")), d = A.find(a => a.id === dummy);
  assert.equal(nyata.length, 1, "alarm nyata baru dibuat, tidak menyatu ke dummy"); assert.equal(nyata[0].status, "siaga"); assert.ok(nyata[0].dikabarkan_pada);
  assert.deepEqual([d.status, d.n_pindai, d.terakhir, d.frp], ["siaga", 1, lama, 1], "dummy tidak diubah (tidak diperbarui, tidak 'hilang')");
  assert.ok(await tunggu(() => surel.length >= 1), "alarm nyata dikabari"); assert.match(surel[0].subject, /1 alarm Himawari baru/);
  /* tugas VIIRS di dekat keduanya: yang terkunci alarm nyata, dummy tetap siaga */
  KOMPLEKS = {dibuat: new Date().toISOString(), kompleks: [{id: "K1", lat: -2.01, lon: 114.01, prov: "62", kab: "Pulang Pisau", kec: "Kahayan", level: 3, n24: 9, jam_sejak: 1, luas: 100}]};
  await cron(Date.now() + 5000); KOMPLEKS = null;
  const B = (await DB.prepare("SELECT id, status, tugas_id FROM alarm_himawari").all()).results;
  assert.equal(B.find(a => a.id === nyata[0].id).status, "terkunci"); assert.ok(B.find(a => a.id === nyata[0].id).tugas_id);
  assert.deepEqual([B.find(a => a.id === dummy).status, B.find(a => a.id === dummy).tugas_id], ["siaga", null], "dummy tidak dikunci tugas nyata");
});

uji("koreksi: kabar at-most-once: gagal sementara -> antrean ulang (saluran yang gagal saja), cron mengulang dengan jeda, berhasil sekali, tidak kirim ganda; menyerah setelah 5 percobaan", async () => {
  surel.length = 0; dorong.length = 0; await DB.prepare("DELETE FROM kabar_terkirim").run();
  const a = await akun(U, {user: "pemkabulang", email: "ulang@pulpis.go.id"}), tid = await tugas({}), token = randomBytes(18).toString("hex"); await penugasan(tid, a, token);
  GAGAL_SURAT = 99;
  assert.equal((await darurat(token)).s, 201);
  assert.ok(await tunggu(() => dorong.length >= 1), "push sukses langsung"); await new Promise(r => setTimeout(r, 500));
  assert.equal(surel.length, 0); assert.equal(await n("kabar_terkirim"), 0, "belum ada yang dicatat terkirim: semua penerima punya email yang gagal");
  const U1 = (await DB.prepare("SELECT penerima, kanal, percobaan, berikut FROM kabar_ulang ORDER BY penerima").all()).results; assert.equal(U1.length, 2, "pemilik + EMAIL_TO (belum ada staf)");
  assert.equal(U1.find(x => x.penerima.startsWith("akun:")).kanal, "email", "push pemilik sudah berhasil: hanya email yang diulang"); assert.ok(U1.every(x => x.percobaan === 1 && x.berikut > Date.now()), "jeda sebelum percobaan berikut");
  const pushAwal = dorong.length;
  await cron(Date.now() - 1000); assert.equal(await n("kabar_ulang", "percobaan = 1"), 2, "belum jatuh tempo: tidak dicoba");
  await DB.prepare("UPDATE kabar_ulang SET berikut = 0").run(); GAGAL_SURAT = 1;
  await cron(Date.now()); assert.equal(surel.length, 1, "satu gagal lagi, satu berhasil"); assert.equal(await n("kabar_ulang", "percobaan = 2"), 1); assert.equal(await n("kabar_terkirim"), 1);
  await DB.prepare("UPDATE kabar_ulang SET berikut = 0").run(); GAGAL_SURAT = 0;
  await cron(Date.now()); assert.equal(surel.length, 2); assert.equal(await n("kabar_ulang"), 0, "antrean kosong"); assert.equal(await n("kabar_terkirim"), 2);
  assert.deepEqual(surel.flatMap(x => x.to).sort(), ["pos@contoh.id", "ulang@pulpis.go.id"]);
  await cron(Date.now()); await cron(Date.now()); assert.equal(surel.length, 2, "tidak ada kiriman ganda sesudah sukses"); assert.equal(dorong.length, pushAwal, "push yang sudah berhasil tidak diulang");
  /* menyerah */
  await DB.prepare("DELETE FROM kabar_terkirim").run(); await DB.prepare("DELETE FROM kabar_ulang").run(); const token2 = randomBytes(18).toString("hex"); await penugasan(await tugas({kab: "Kapuas"}), a, token2, "Regu Anggrek");
  GAGAL_SURAT = 999; surel.length = 0; assert.equal((await darurat(token2)).s, 201); await new Promise(r => setTimeout(r, 500));
  for (let i = 0; i < 6; i++) { await DB.prepare("UPDATE kabar_ulang SET berikut = 0").run(); await cron(Date.now()); }
  assert.equal(await n("kabar_ulang"), 0, "habis percobaan: antrean dibuang"); assert.equal(await n("kabar_terkirim", "kunci LIKE 'darurat:%'"), 0, "tidak dicatat terkirim bila tidak pernah terkirim"); assert.equal(surel.length, 0);
  GAGAL_SURAT = 0;
});

uji("koreksi: kegagalan push sementara (503) juga diulang; langganan yang sudah mati (410) tidak dianggap gagal", async () => {
  dorong.length = 0; surel.length = 0; await DB.prepare("DELETE FROM kabar_terkirim").run(); await DB.prepare("DELETE FROM kabar_ulang").run();
  const a = await akun(U, {user: "pemkabpush503", email: "p503@pulpis.go.id"}), token = randomBytes(18).toString("hex"); await penugasan(await tugas({kab: "Barito"}), a, token, "Regu Dahlia");
  GAGAL_PUSH = 1; assert.equal((await darurat(token)).s, 201); assert.ok(await tunggu(() => surel.length >= 2)); await new Promise(r => setTimeout(r, 300));
  assert.equal(dorong.length, 0); const r1 = (await DB.prepare("SELECT penerima, kanal FROM kabar_ulang").all()).results; assert.deepEqual(r1.map(x => [x.penerima.startsWith("akun:"), x.kanal]), [[true, "push"]], "email berhasil, hanya push yang menunggu ulang");
  assert.equal(await n("kabar_terkirim", "penerima LIKE 'akun:%'"), 0);
  await DB.prepare("UPDATE kabar_ulang SET berikut = 0").run(); await cron(Date.now()); assert.equal(dorong.length, 1, "push berhasil di percobaan kedua"); assert.equal(await n("kabar_ulang"), 0); assert.equal(await n("kabar_terkirim", "penerima LIKE 'akun:%'"), 1); assert.equal(surel.length, 2, "email tidak dikirim ulang");
});

uji("koreksi: darurat per penugasan (T4): delapan tautan satu tugas semuanya dikabari, satu tautan yang menekan berulang tetap satu kabar per jendela dan 429 sesudah 5", async () => {
  surel.length = 0; await DB.prepare("DELETE FROM kabar_terkirim").run(); await DB.prepare("DELETE FROM kabar_ulang").run(); await DB.prepare("DELETE FROM penugasan_darurat").run();
  const a = await akun(U, {user: "pemkabcap", email: "cap@pulpis.go.id", push: false}), tid = await tugas({kab: "Gunung Mas"}), tokens = [];
  for (let i = 0; i < 8; i++) { const t = randomBytes(18).toString("hex"); tokens.push(t); await penugasan(tid, a, t, "Regu " + i); }
  for (const t of tokens) assert.equal((await darurat(t)).s, 201);
  await new Promise(r => setTimeout(r, 800));
  assert.equal(await n("penugasan_darurat"), 8, "semua panggilan darurat tercatat"); const k = (await DB.prepare("SELECT DISTINCT substr(kunci, 9, 16) p FROM kabar_terkirim WHERE kunci LIKE 'darurat:%'").all()).results; assert.equal(k.length, 8, "kabar pertama tiap penugasan tidak pernah diredam tautan lain");
  const s0 = surel.length, kode = []; for (let i = 0; i < 4; i++) assert.equal((await darurat(tokens[0])).s, 201); assert.equal((await darurat(tokens[0])).s, 429, "batas per tautan di rute"); await new Promise(r => setTimeout(r, 400)); assert.equal(surel.length, s0, "tidak ada kabar baru dalam jendela yang sama"); void kode;
});

uji("koreksi: /api/pipa/lapangan: token salah dihitung per IP (pipa_gagal), lewat 300 per jam = 429; token sah tetap lolos", async () => {
  const ip = {"cf-connecting-ip": "203.0.113.77"};
  for (let i = 0; i < 300; i++) { const r = await api("GET", "/api/pipa/lapangan", undefined, {...ip, authorization: "Bearer salah" + i}); if (r.s !== 401) assert.fail(`ke-${i}: ${r.s}`); }
  const r = await api("GET", "/api/pipa/lapangan", undefined, {...ip, authorization: "Bearer salah-lagi"}); assert.equal(r.s, 429); assert.ok(r.h.get("retry-after"));
  assert.equal((await api("GET", "/api/pipa/lapangan", undefined, {...ip, authorization: "Bearer token-pipa-uji"})).s, 200, "token sah tidak terkena penghitung");
  assert.equal((await api("GET", "/api/pipa/lapangan", undefined, {"cf-connecting-ip": "203.0.113.78", authorization: "Bearer salah"})).s, 401, "IP lain tidak terpengaruh");
  assert.equal(await n("laju_bnpb", "aksi = 'pipa_gagal'"), 301);
});

uji("koreksi: dummy SLA tanpa status_riwayat: 503 dan TIDAK ada tulisan sebagian (akun, tugas, alarm)", async () => {
  const T = await siapkan("uji-sla-dummy503", {r2: true, ikat: IKAT, luar, asetKu: aset});
  await T.DB.prepare("DROP TABLE status_riwayat").run();
  const r = await T.api("POST", "/api/sla/dummy", {aksi: "isi"}, SUPER); assert.equal(r.s, 503, r.t);
  for (const t of ["instansi_akun", "tugas_api", "tugas_isian", "penugasan", "alarm_himawari", "tugas_muncul"]) assert.equal(await T.n(t), 0, t + " tidak tertulis");
});

uji("koreksi: masker titik panas tak terbaca: putaran tetap disimpan dan hasilnya mencatat masker: 'tak terbaca'", async () => {
  const {perbaruiTitik} = await import("../../src/titik.js"), tgl = new Date(Date.now() - JAM), KEP = "latitude,longitude,bright_ti4,scan,track,acq_date,acq_time,satellite,instrument,confidence,version,bright_ti5,frp,daynight";
  const csv = `${KEP}\n-2.1234,113.5678,330,0.4,0.4,${tgl.toISOString().slice(0, 10)},${tgl.toISOString().slice(11, 16).replace(":", "")},N,VIIRS,h,2.0NRT,290,12.3,D`;
  const asetTanpaMasker = {fetch: async req => new URL(req.url).pathname === "/data/titik_palsu.json" ? new Response("rusak", {status: 500}) : aset(req)}, fetchAsli = globalThis.fetch, galat = console.error; let dicatat = false;
  globalThis.fetch = async u => new Response(String(u).includes("VIIRS_SNPP_NRT") ? csv : KEP); console.error = (...a) => { if (/masker/.test(a.join(" "))) dicatat = true; };
  try {
    const h = await perbaruiTitik({DB, ASSETS: asetTanpaMasker, FIRMS_MAP_KEY: "k"}, Date.now());
    assert.equal(h.masker, "tak terbaca"); assert.equal(h.titik, 1, "putaran tidak dibuang"); assert.ok(dicatat, "dicatat di log");
    const ok = await perbaruiTitik({DB, ASSETS: {fetch: aset}, FIRMS_MAP_KEY: "k"}, Date.now() + 1000); assert.ok(!("masker" in ok), "masker terbaca: tanpa penanda");
  } finally { globalThis.fetch = fetchAsli; console.error = galat; }
});

uji("koreksi: alarm baru dibatasi 200 per putaran, sisanya dibawa ke menit berikutnya (etag belum disimpan sampai habis)", async () => {
  await DB.prepare("DELETE FROM alarm_himawari").run(); await DB.prepare("DELETE FROM tugas_meta").run();
  const baris = []; for (let i = 0; i < 16; i++) for (let j = 0; j < 16; j++) if (baris.length < 250) baris.push([-1 - 0.04 * i, 112 + 0.04 * j, 20, 30, 3, 3, 1, 3, 50]);
  await hw(baris); await cron(Date.now());
  assert.equal(await n("alarm_himawari"), 200, "putaran pertama: batas 200"); assert.equal(await n("tugas_meta", "kunci = 'himawari_etag'"), 0, "etag belum disimpan: sisa menunggu");
  await cron(Date.now() + 60000); assert.equal(await n("alarm_himawari"), 250, "putaran kedua menyelesaikan sisa"); assert.equal(await n("tugas_meta", "kunci = 'himawari_etag'"), 1);
  await cron(Date.now() + 120000); assert.equal(await n("alarm_himawari"), 250, "berkas sama dilewati");
});

uji("koreksi: kabarLevel3 dengan cakupan rusak (bukan JSON / bukan larik) tidak menggagalkan putaran; akun sehat tetap dikabari", async () => {
  surel.length = 0; await DB.prepare("DELETE FROM tugas_api").run(); await DB.prepare("DELETE FROM tugas_meta").run(); await DB.prepare("DELETE FROM kabar_terkirim").run();
  /* D1 sendiri menolak cakupan rusak (CHECK + trigger), jadi pertahanan kode diuji langsung dengan baris rusak dari D1 palsu yang hanya menjawab SELECT akun */
  const {kabarLevel3} = await import("../../src/kabar.js"), rusak = c => ({prepare: () => ({all: async () => ({results: [{id: "a1", email: "r@x.go.id", tingkat: "prov", prov: "62", kab: null, cakupan: c}]})})});
  for (const c of ["bukan json {", '{"a":1}', "null", "7"]) assert.deepEqual(await kabarLevel3({DB: rusak(c)}, [{id: "t1", prov: "62", kab: "Pulang Pisau", kec: "K"}]), {akun: 0, push: 0, email: 0}, c);
  await akun(U, {user: "pemkabsehat", email: "sehat@pulpis.go.id", push: false});
  KOMPLEKS = {dibuat: new Date().toISOString(), kompleks: [{id: "K7", lat: -2.3, lon: 114.0, prov: "62", kab: "Pulang Pisau", kec: "Kahayan", level: 3, n24: 9, jam_sejak: 1, luas: 100}]};
  const hasil = await cron(Date.now() + 9000); KOMPLEKS = null;
  assert.equal(hasil.outcome, "ok"); assert.equal(await n("tugas_api"), 1, "tugas tetap dibuat"); assert.ok(await tunggu(() => surel.some(x => x.to.includes("sehat@pulpis.go.id"))), "akun sehat dikabari");
  assert.ok(!surel.some(x => x.to.some(t => /^rusak/.test(t))), "cakupan rusak = tidak mencakup apa pun");
});

uji("koreksi: /api/sla untuk staf berwilayah: prov dipaksa ke wilayahnya, provinsi lain 403, banyak wilayah tersaring, nasional melihat semua", async () => {
  await DB.prepare("DELETE FROM tugas_api").run();
  const d = Date.now() - 2 * HARI; for (const [prov, kab] of [["62", "Pulang Pisau"], ["63", "Banjar"], ["64", "Paser"]]) await tugas({prov, kab, dibuat: d, terdeteksi_awal: d - 30 * MENIT});
  const kode = j => j.wilayah.map(w => w.kode).sort();
  const satu = await staf(["pimpinan"], ["62"]); let r = await api("GET", "/api/sla", undefined, satu); assert.equal(r.s, 200); assert.deepEqual(kode(r.j), ["Pulang Pisau"], "tanpa prov: dipaksa ke wilayah (satu provinsi = rincian per kabupaten)"); assert.equal(r.j.prov_nama, "Kalimantan Tengah");
  assert.equal((await api("GET", "/api/sla?prov=63", undefined, satu)).s, 403); assert.equal((await api("GET", "/api/sla?prov=62", undefined, satu)).s, 200);
  assert.deepEqual((await api("GET", "/api/sla?hari=30&kab=Banjar", undefined, satu)).j.wilayah, [], "kab di provinsi lain tidak bocor");
  const dua = await staf(["tmc"], ["62", "63"]); r = await api("GET", "/api/sla", undefined, dua); assert.deepEqual(kode(r.j), ["62", "63"]); assert.equal((await api("GET", "/api/sla?prov=64", undefined, dua)).s, 403);
  assert.deepEqual(r.j.himawari.daftar, [], "daftar alarm (tanpa provinsi) tidak ditampilkan untuk staf berwilayah");
  const nas = await staf(["udara"], []); assert.deepEqual(kode((await api("GET", "/api/sla", undefined, nas)).j), ["62", "63", "64"]); assert.deepEqual(kode((await api("GET", "/api/sla", undefined, ADMIN)).j), ["62", "63", "64"]);
});

uji("koreksi: skema 0044-0046: sha256 media dan kabar_ulang dan tugas_luas_awal dijaga CHECK, kabar_ulang idempoten per (kunci, penerima)", async () => {
  const t = await tugas({}), a = await akun(U, {user: "pemkabskema", push: false}), media = o => sisip("instansi_media", {id: id16(), akun_id: a.id, tugas_id: t, jenis: "foto", mime: "image/jpeg", ukuran: 1, waktu_ambil: 1, sumber_waktu: "gps", lat: -2, lon: 114, waktu_gps: 1, dibuat: 1, ...o});
  await media({sha256: "a".repeat(64)}); await media({sha256: null});
  for (const buruk of ["a".repeat(63), "A".repeat(64), "g".repeat(64)]) await assert.rejects(() => media({sha256: buruk}), /CHECK/, buruk.slice(0, 5));
  const ulang = o => sisip("kabar_ulang", {kunci: "k1", penerima: "p1", pesan: "{}", kanal: "email", berikut: 1, dibuat: 1, ...o});
  await ulang({}); await assert.rejects(() => ulang({}), /UNIQUE|PRIMARY/); await assert.rejects(() => ulang({penerima: "p2", kanal: "sms"}), /CHECK/); await assert.rejects(() => ulang({penerima: "p3", percobaan: 11}), /CHECK/);
  await sisip("tugas_luas_awal", {tugas_id: t, luas_ha: 5}); await assert.rejects(() => sisip("tugas_luas_awal", {tugas_id: t, luas_ha: 6}), /UNIQUE|PRIMARY/); await assert.rejects(() => sisip("tugas_luas_awal", {tugas_id: id16(), luas_ha: 1}), /FOREIGN/);
  await DB.prepare("DELETE FROM tugas_api WHERE id = ?").bind(t).run(); assert.equal(await n("tugas_luas_awal", `tugas_id = '${t}'`), 0, "ON DELETE CASCADE");
});

uji("koreksi: darurat penugasan dummy tidak mengirim apa pun; kabar darurat kedaluwarsa (> 15 menit) dibuang dari antrean ulang", async () => {
  surel.length = 0; dorong.length = 0; await DB.prepare("DELETE FROM kabar_terkirim").run(); await DB.prepare("DELETE FROM kabar_ulang").run();
  const a = await akun(U, {user: "pemkabdummyd", email: "dd@pulpis.go.id"}), tid = await tugas({kab: "Sukamara"}), token = randomBytes(18).toString("hex");
  await sisip("penugasan", {id: id16(), tugas_id: tid, akun_id: a.id, nama: "Regu Dummy", peran: "ketua_regu", orang: 5, token_sha: sha256(token), status: "aktif", dibuat: Date.now() - 1000, kedaluwarsa: Date.now() + HARI, dummy: 1});
  assert.equal((await darurat(token)).s, 201); await new Promise(r => setTimeout(r, 500)); assert.equal(surel.length, 0); assert.equal(dorong.length, 0); assert.equal(await n("kabar_terkirim") + await n("kabar_ulang"), 0);
  /* kedaluwarsa */
  const t2 = randomBytes(18).toString("hex"); await penugasan(await tugas({kab: "Lamandau"}), a, t2, "Regu Basi"); GAGAL_SURAT = 99; assert.equal((await darurat(t2)).s, 201); await new Promise(r => setTimeout(r, 500));
  assert.ok(await n("kabar_ulang") >= 1); GAGAL_SURAT = 0; surel.length = 0;
  await DB.prepare("UPDATE kabar_ulang SET berikut = 0, pesan = json_set(pesan, '$.kadaluarsa', ?)").bind(Date.now() - 60 * MENIT).run(); await cron(Date.now());   // satu jam lalu: tetap basi walau waktu cron digeser mundur oleh luarRingkasan
  assert.equal(await n("kabar_ulang"), 0, "basi: dibuang"); assert.equal(surel.length, 0, "tidak dikirim terlambat"); assert.equal(await n("kabar_terkirim"), 0);
});

uji("koreksi: cabut peringatan (T1): Origin kosong atau null + cookie sesi_admin ditolak, AKUN_SITUS 403, moderator sah; kunci karhutla tidak membuka id tugas (T2)", async () => {
  const kini = Date.now(); await DB.prepare("DELETE FROM peringatan").run();
  await sisip("peringatan", {kunci: "tsunami:uji:awas", jenis: "tsunami", tingkat: "Awas", judul: "Tsunami", teks: "uji", sumber: "InaTEWS", dibuat: kini, berlaku_hingga: kini + JAM});
  const cabut = (h) => api("POST", "/api/admin/peringatan/tsunami:uji:awas/cabut", undefined, h);
  const masuk = await U.mf.dispatchFetch("http://bnpb.lokal/admin/masuk", {method: "POST", redirect: "manual", headers: {"content-type": "application/x-www-form-urlencoded", origin: "http://bnpb.lokal"}, body: "email=gerbang%40x&sandi=sandi"});
  const cookie = (masuk.headers.get("set-cookie") || "").split(";")[0]; assert.match(cookie, /^sesi_admin=/, "akun gerbang punya sesi_admin");
  assert.equal((await cabut({cookie})).s, 403, "tanpa Origin + cookie ditolak"); assert.equal((await cabut({cookie, origin: "null"})).s, 403); assert.equal((await cabut({cookie, origin: "http://lain.example"})).s, 403);
  assert.equal((await cabut({"x-admin-token": "gerbang@x:sandi"})).s, 403, "AKUN_SITUS bukan moderator"); assert.equal(await n("peringatan", "dicabut IS NOT NULL"), 0);
  assert.equal((await cabut({cookie, origin: "http://bnpb.lokal"})).s, 403, "sesi akun gerbang tetap bukan moderator");
  assert.equal((await cabut(ADMIN)).s, 200, "token moderator tanpa cookie"); assert.equal(await n("peringatan", "dicabut IS NOT NULL"), 1);
  /* T2 */
  await DB.prepare("DELETE FROM tugas_api").run(); const tid = await tugas({dibuat: kini - 10 * MENIT}); await cron(kini);
  const p = (await DB.prepare("SELECT kunci FROM peringatan WHERE jenis = 'karhutla'").first()).kunci; assert.match(p, /^karhutla:[0-9a-f]{12}:siaga$/); assert.ok(!p.includes(tid));
  const publik = await api("GET", "/api/peringatan/aktif.cap"); assert.ok(!publik.t.includes(tid) && publik.t.includes(p.split(":")[1]));
});
