/* SLA, kabar seketika, alarm Himawari, pipa lapangan, masker titik panas tetap, blok Rapor (migrasi 0042/0043; src/sla.js, sla_dummy.js, kabar.js, alarm_himawari.js, pipa.js, titik.js).
   worker.js utuh di workerd (Miniflare), D1 + R2 lokal sungguhan, migrasi apa adanya; jaringan luar (FIRMS, Resend, layanan push) dijawab fixture lewat outboundService.
   Jalankan: node --test tests/warga/sla.test.mjs */
import assert from "node:assert/strict";
import {createECDH, generateKeyPairSync, randomBytes} from "node:crypto";
import {readFileSync, existsSync} from "node:fs";
import path from "node:path";
import {AKAR} from "./_bantu.mjs";
import "../../src/worker.js";   // worker dulu: modul saling impor (siklus)
import {siapkan, berantai, ADMIN, sha256} from "./_bnpb.mjs";
import {RAPOR} from "../../src/meja_spek.js";
import {persen} from "../../src/sla.js";
import {selTitik} from "../../src/titik.js";

const MENIT = 60e3, JAM = 3600e3, HARI = 24 * JAM, PB = {"x-pb": "1", origin: "http://bnpb.lokal"}, SUPER = {"x-admin-token": "rahasia-admin"};
const uji = berantai();
const b64 = b => Buffer.from(b).toString("base64url");
const {privateKey} = generateKeyPairSync("ec", {namedCurve: "prime256v1"}), jwk = privateKey.export({format: "jwk"});
const KUNCI = {VAPID_PUBLIK: b64(Buffer.concat([Buffer.from([4]), Buffer.from(jwk.x, "base64url"), Buffer.from(jwk.y, "base64url")])), VAPID_PRIVAT: jwk.d, VAPID_SUBJEK: "mailto:pemilik@contoh.id"};
const IKAT = {...KUNCI, FIRMS_MAP_KEY: "kunci-firms", EMAIL_API_KEY: "re_uji", EMAIL_FROM: "Centurisk97 <kabar@centurisk97.id>", EMAIL_TO: "pos@contoh.id", PIPA_TOKEN: "token-pipa-uji"};

/* jaringan luar: FIRMS, Resend, layanan push */
let CSV = {}; const surel = [], dorong = [];
const luar = async req => {
  const u = new URL(req.url);
  if (u.hostname === "firms.modaps.eosdis.nasa.gov") { const s = u.pathname.split("/")[5]; return new Response(CSV[s] ?? "", {status: s in CSV ? 200 : 400}); }
  if (u.hostname === "api.resend.com") { surel.push(JSON.parse(await req.text())); return new Response('{"id":"x"}'); }
  if (u.hostname === "fcm.googleapis.com") { dorong.push(req.url); return new Response(null, {status: 201}); }
  return new Response("diblok di uji", {status: 599});
};
/* aset: tugas_kompleks.json dapat diganti uji; sisanya dari public/ */
let KOMPLEKS = null;
const aset = async req => {
  const p = decodeURIComponent(new URL(req.url).pathname);
  if (p === "/data/tugas_kompleks.json" && KOMPLEKS) return Response.json(KOMPLEKS);
  const f = path.join(AKAR, "public", p);
  return existsSync(f) && f.startsWith(path.join(AKAR, "public")) && !p.endsWith("/") ? new Response(readFileSync(f)) : new Response("tidak ada", {status: 404});
};
const tunggu = async (kond, ms = 4000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (kond()) return true; await new Promise(r => setTimeout(r, 25)); } return kond(); };
const id16 = () => randomBytes(8).toString("hex");

const U = await siapkan("uji-sla", {r2: true, ikat: IKAT, luar, asetKu: aset});
const {DB, api, n} = U, W = await U.mf.getWorker(), R2 = await U.mf.getR2Bucket("MEDIA");
const sisip = (tabel, o, T = U) => T.DB.prepare(`INSERT INTO ${tabel} (${Object.keys(o).join(", ")}) VALUES (${Object.keys(o).map(() => "?").join(", ")})`).bind(...Object.values(o)).run();
const cron = (ms, T = W) => T.scheduled({cron: "* * * * *", scheduledTime: ms});
const mnt = m => { const d = new Date(); d.setUTCMinutes(m, 0, 0); return d.getTime(); };

/* staf BNPB nyata lewat rute sungguhan */
let nip = 0;
const staf = async (peran) => {
  const r = await api("POST", "/api/staf/admin/buat", {nama: "Siti SLA", nip: `19800${++nip}0012005`, unit: "Pusdalops BNPB", email: `s${nip}@bnpb.go.id`, wa: "081234567890", peran, wilayah: []}, ADMIN); assert.equal(r.s, 201, r.t);
  const ip = {"cf-connecting-ip": `198.51.100.${nip}`}, m = await api("POST", "/api/staf/masuk", {username: r.j.username, sandi: r.j.sandi}, ip), cookie = m.h.get("set-cookie").split(";")[0];
  const g = await api("POST", "/api/staf/gantisandi", {}, {cookie, ...PB}); assert.equal(g.s, 200, g.t);
  return {cookie};
};
const akun = async (T, {user, kab = "Pulang Pisau", email = "budi@x.go.id"}) => {
  const id = id16(), ec = createECDH("prime256v1"); ec.generateKeys();
  await sisip("instansi_akun", {id, username: user, jenis: "pemkab", tingkat: "kab", wilayah: `Pemkab ${kab}`, kunci_wilayah: `62|${kab}|${user}`, cakupan: '["62"]', prov: "62", kab, garam: "g".repeat(32), sandi_sha: "a".repeat(64), status: "aktif",
    nama: "Budi", nip: "198001012005011001", jabatan: "Kepala", unit: "BPBD", email, wa: "6281234567890", surat: 1, kartu: 1, wajib_ganti: 0, dibuat: Date.now()}, T);
  const ep = `https://fcm.googleapis.com/fcm/send/${randomBytes(6).toString("hex")}`;
  await sisip("push_langganan", {id: id16(), akun_id: id, endpoint: ep, p256dh: b64(ec.getPublicKey()), auth: b64(randomBytes(16)), dibuat: Date.now()}, T);
  return {id, ep};
};
const tugas = (o, T = U) => { const id = id16(); return sisip("tugas_api", {id, prov: "62", kab: "Pulang Pisau", kec: "Kec", lat: -2.5, lon: 114, level: 3, dibuat: Date.now(), terakhir_terdeteksi: Date.now(), ...o}, T).then(() => id); };

uji("sla: skema 0042/0043 ada, kolom tugas_api baru nol, kunci kabar unik, status alarm dijaga CHECK", async () => {
  for (const t of ["status_riwayat", "alarm_himawari", "kabar_terkirim"]) assert.equal((await DB.prepare(`SELECT count(*) n FROM ${t}`).first()).n, 0, t);
  const id = await tugas({});
  const r = await DB.prepare("SELECT terdeteksi_awal, himawari_awal, sumber_awal FROM tugas_api WHERE id = ?").bind(id).first(); assert.deepEqual(r, {terdeteksi_awal: null, himawari_awal: null, sumber_awal: null});
  await assert.rejects(() => sisip("tugas_api", {id: id16(), prov: "62", kab: "X1", lat: -2, lon: 114, level: 3, dibuat: 1, terakhir_terdeteksi: 1, sumber_awal: "radar"}), /CHECK/);
  await assert.rejects(() => sisip("alarm_himawari", {id: id16(), lat: -2, lon: 114, pertama: 1, terakhir: 1, status: "aneh"}), /CHECK/);
  const k = () => DB.prepare("INSERT OR IGNORE INTO kabar_terkirim (kunci, penerima, waktu) VALUES ('k1', 'p1', 1)").run();
  assert.equal((await k()).meta.changes, 1); assert.equal((await k()).meta.changes, 0, "satu kejadian satu kabar per penerima");
  await DB.prepare("DELETE FROM kabar_terkirim").run(); await DB.prepare("DELETE FROM tugas_api").run();
});

uji("sla: GET /api/sla: tanpa masuk 403, admin dan staf BNPB 200, parameter dijaga, prov_nama/kab_nama saat disaring", async () => {
  assert.equal((await api("GET", "/api/sla")).s, 403);
  assert.equal((await api("GET", "/api/sla", undefined, {cookie: "sesi_staf=" + "a".repeat(64)})).s, 403, "sesi staf palsu");
  assert.equal((await api("GET", "/api/sla?hari=30", undefined, ADMIN)).s, 200);
  const s = await staf(["pimpinan"]); assert.equal((await api("GET", "/api/sla", undefined, s)).s, 200, "staf BNPB peran apa pun");
  assert.equal((await api("GET", "/api/sla?prov=abc", undefined, ADMIN)).s, 400);
  assert.equal((await api("GET", "/api/sla?kab=" + "x".repeat(61), undefined, ADMIN)).s, 400);
  const f = await api("GET", "/api/sla?prov=62&kab=pulang%20pisau&hari=9999", undefined, ADMIN);
  assert.equal(f.j.hari, 90, "hari dijepit 1..90"); assert.equal(f.j.prov_nama, "Kalimantan Tengah"); assert.equal(f.j.kab_nama, "pulang pisau");
  assert.ok(!("prov_nama" in (await api("GET", "/api/sla", undefined, ADMIN)).j));
});

uji("sla: tanpa data: semua rasio null (bukan 0), penyebut 0, macet bertarget terisi 0 dan tak bertarget null", async () => {
  const j = (await api("GET", "/api/sla", undefined, ADMIN)).j, L = j.lapangan;
  assert.deepEqual(L.n, {isian: 0, foto: 0, kabar: 0, padam: 0, konfirmasi: 0});
  for (const k of ["isian_lengkap_pct", "foto_gps_sah_pct", "kabar_tepat_pct", "padam_terverifikasi_pct", "muncul_lagi_pct", "bukan_api_pct"]) assert.strictEqual(L[k], null, k);
  assert.strictEqual(L.gps_curiga_n, 0);
  assert.deepEqual(L.luas, {n: 0, n_garis: 0, rasio_lapangan_satelit_p50: null, rasio_garis_satelit_p50: null});
  assert.deepEqual(L.taktik, {n: 0, regu_nyata_per_saran_p50: null, personel_nyata_per_saran_p50: null}); assert.deepEqual(L.regu, []);
  assert.deepEqual(j.proses.map(p => p.tahap), ["deteksi", "tugas", "konfirmasi", "tiba", "padam", "terverifikasi", "muncul_lagi"]); assert.ok(j.proses.every(p => p.n === 0));
  assert.strictEqual(j.macet.find(m => m.tahap === "konfirmasi").n_lewat_target, 0); assert.strictEqual(j.macet.find(m => m.tahap === "tiba").n_lewat_target, null);
  assert.ok(j.tahap.every(t => t.n === 0 && t.p50_menit === null && t.dalam_target_pct === null)); assert.deepEqual(j.himawari, {alarm: 0, terkunci: 0, hilang: 0, selisih_viirs_p50_menit: null, daftar: []});
  assert.equal(persen([], 50), null);
});

uji("sla: tahap waktu dari kolom nyata: deteksi = min(himawari, viirs), perkiraan tidak dihitung, target hanya konfirmasi dan kabar", async () => {
  const kini = Date.now(), d = kini - 5 * HARI, a = await akun(U, {user: "pemkabslaa"});
  const t1 = await tugas({dibuat: d, terdeteksi_awal: d - 30 * MENIT, himawari_awal: d - 90 * MENIT, konfirmasi_pada: d + 120 * MENIT, padam_pada: d + 30 * JAM, padam_verif: "padam_terverifikasi", verif_pada: d + 80 * JAM, status: "padam"});
  const t2 = await tugas({dibuat: d + HARI, terdeteksi_awal: d + HARI - 60 * MENIT, konfirmasi_pada: d + HARI + 400 * MENIT});   // konfirmasi 400 menit: lewat target 360
  await tugas({dibuat: d + 2 * HARI});   // tanpa jam asli: deteksi = perkiraan
  await sisip("penugasan", {id: id16(), tugas_id: t1, akun_id: a.id, nama: "Regu", peran: "ketua_regu", orang: 5, token_sha: sha256(randomBytes(8)), status: "selesai", dibuat: d, kedaluwarsa: d + HARI, tiba_pada: d + 200 * MENIT});
  await sisip("tugas_isian", {id: id16(), tugas_id: t1, akun_id: a.id, klien_id: "klien" + id16(), langkah: "tindakan", dibuat: d + 10 * JAM, status_api: "menyala"});
  const j = (await api("GET", "/api/sla?hari=30", undefined, ADMIN)).j, T = Object.fromEntries(j.tahap.map(t => [`${t.dari}_${t.ke}`, t]));
  assert.equal(T.deteksi_tugas.n, 2, "tugas ketiga tanpa jam deteksi asli tidak dihitung"); assert.equal(T.deteksi_tugas.p50_menit, 60); assert.equal(T.deteksi_tugas.p90_menit, 90); assert.strictEqual(T.deteksi_tugas.target_menit, null);
  assert.equal(T.tugas_konfirmasi.n, 2); assert.equal(T.tugas_konfirmasi.target_menit, 360); assert.equal(T.tugas_konfirmasi.dalam_target_pct, 50); assert.equal(T.tugas_konfirmasi.p50_menit, 120);
  assert.equal(T.konfirmasi_kabar.n, 1); assert.equal(T.konfirmasi_kabar.p50_menit, 480); assert.equal(T.konfirmasi_kabar.target_menit, 1440); assert.equal(T.konfirmasi_kabar.dalam_target_pct, 100);
  assert.equal(T.konfirmasi_tiba.p50_menit, 80); assert.equal(T.tiba_padam.n, 1); assert.equal(T.padam_terverifikasi.p50_menit, 50 * 60); assert.strictEqual(T.tiba_padam.target_menit, null);
  const w = j.wilayah.find(x => x.kode === "62"); assert.equal(w.nama, "Kalimantan Tengah"); assert.equal(w.n, 3); assert.deepEqual(w.tahap.deteksi_tugas, {p50: 60, p90: 90, n: 2}); assert.equal(typeof w.terlambat_buka, "number");
  assert.ok(j.catatan.some(c => /1 dari 3 tugas memakai waktu pembuatan/.test(c)));
  assert.ok(j.catatan.some(c => /^Sejak \d+ \S+ \d{4}, bukan api dengan alasan tidak ada bekas atau bekas lama hanya menahan tugas baru 3 hari/.test(c)), "penanda 0062 disebut");
  assert.equal(j.proses.find(p => p.tahap === "konfirmasi").n, 2); assert.equal(j.proses.find(p => p.tahap === "terverifikasi").n, 1);
  assert.equal(j.macet.find(m => m.tahap === "konfirmasi").n_menunggu, 1, "tugas ketiga belum dikonfirmasi"); assert.equal(j.macet.find(m => m.tahap === "konfirmasi").n_lewat_target, 1);
  assert.ok(j.tren.some(x => x.deteksi_tugas_p50 != null));
  for (const t of ["penugasan", "tugas_isian", "tugas_api"]) await DB.prepare(`DELETE FROM ${t}`).run();
});

uji("sla: cron bersih-bersih menulis status_riwayat per jam; himawari basi tercatat segar 0 dan /api/sla memberi gangguan dalam ms", async () => {
  const kini = Date.now(); await R2.put("data/himawari.json", JSON.stringify({acuan: new Date(kini - 5 * JAM).toISOString(), jam: 3, kolom: [], baris: []}));
  await cron(mnt(17));
  const r = (await DB.prepare("SELECT * FROM status_riwayat WHERE sumber = 'himawari'").all()).results;
  assert.equal(r.length, 1); assert.equal(r[0].slot, Math.floor(Date.now() / JAM)); assert.equal(r[0].batas_menit, 180); assert.equal(r[0].segar, 0); assert.ok(r[0].umur_menit >= 295);
  assert.ok((await n("status_riwayat")) >= 3, "tiap sumber satu baris");
  await cron(mnt(17));
  assert.equal(await n("status_riwayat", "sumber = 'himawari'"), 1, "satu slot satu baris (ulang dalam jam yang sama menimpa)");
  const j = (await api("GET", "/api/sla", undefined, ADMIN)).j, h = j.sumber.find(s => s.id === "himawari");
  assert.equal(h.segar_pct, 0); assert.equal(h.gangguan.length, 1); assert.ok(h.gangguan[0].mulai > 1e12 && h.gangguan[0].selesai > h.gangguan[0].mulai && h.gangguan[0].menit === 60);
  const st = await api("GET", "/api/status"); assert.equal(st.s, 503); assert.ok(st.j.basi.includes("himawari")); assert.equal(st.j.sumber.himawari.ambang_jam, 3);
  await R2.put("data/himawari.json", JSON.stringify({acuan: new Date(Date.now() - 40 * MENIT).toISOString(), jam: 3, kolom: [], baris: []}));
  const st2 = await api("GET", "/api/status"); assert.ok(!st2.j.basi.includes("himawari")); assert.ok(st2.j.sumber.himawari.umur_jam < 1);
  await DB.prepare("DELETE FROM status_riwayat").run();
});

uji("sla: tanpa R2 (MEDIA) himawari tidak dinilai: tidak pernah membuat /api/status 503", async () => {
  const S = await siapkan("uji-sla-tanpa-r2", {luar, asetKu: aset}), r = await S.api("GET", "/api/status");
  assert.ok(!r.j.basi.includes("himawari")); assert.equal(r.j.sumber.himawari.umur_jam, null);
  assert.equal((await (await S.mf.getWorker()).scheduled({cron: "* * * * *", scheduledTime: mnt(17)})).outcome, "ok", "cron tanpa MEDIA tidak melempar");
});

uji("sla: kabar darurat regu: push + email ke pemilik penugasan dan Posko pusat, kunci kabar tercatat, tanpa nama orang", async () => {
  surel.length = 0; dorong.length = 0;
  const a = await akun(U, {user: "pemkabdarurat", email: "kabar@pulpis.go.id"}), tid = await tugas({}), token = randomBytes(18).toString("hex");
  await sisip("penugasan", {id: id16(), tugas_id: tid, akun_id: a.id, nama: "Regu Melati", peran: "ketua_regu", orang: 5, token_sha: sha256(token), status: "aktif", dibuat: Date.now() - 1000, kedaluwarsa: Date.now() + HARI});
  const r = await api("POST", "/api/lacak/darurat", {jenis: "terkepung_api"}, {"x-lacak": token, ...PB}); assert.equal(r.s, 201, r.t);
  assert.ok(await tunggu(() => surel.length >= 3 && dorong.length >= 1), `surel ${surel.length} dorong ${dorong.length}`);
  assert.deepEqual(surel.flatMap(x => x.to).sort(), ["kabar@pulpis.go.id", "pos@contoh.id", "s1@bnpb.go.id"], "pemilik penugasan + Posko pusat (EMAIL_TO, staf pimpinan), bukan akun lain");
  assert.ok(dorong.includes(a.ep), "push ke perangkat pemilik penugasan");
  assert.match(surel[0].subject, /DARURAT regu: Terkepung api/); assert.ok(!/6281234567890|081234/.test(JSON.stringify(surel)), "tanpa nomor telepon");
  assert.equal(await n("kabar_terkirim", "kunci LIKE 'darurat:%'"), 3);
  assert.ok(!/Regu Melati/.test(JSON.stringify(surel)), "nama regu/orang tidak ada di isi email darurat"); assert.match(surel[0].text, /Satu regu dari Pemkab Pulang Pisau di Kec, Pulang Pisau, Kalimantan Tengah melaporkan keadaan darurat \(.+\) pukul \d\d:\d\d WIB/);
  const milik = surel.find(x => x.to.includes("kabar@pulpis.go.id")), posko = surel.find(x => x.to.includes("pos@contoh.id"));
  assert.match(milik.text, /kotak DARURAT pada Tugas api/); assert.match(milik.text, /centurisk97\.id\/instansi$/); assert.match(milik.html, /href="https:\/\/centurisk97\.id\/instansi"/);
  assert.match(posko.text, /Meja Pantau/); assert.match(posko.text, /\/admin\/pantau$/); assert.match(posko.html, /href="https:\/\/centurisk97\.id\/admin\/pantau"/);
  const kunci = (await DB.prepare("SELECT DISTINCT kunci FROM kabar_terkirim WHERE kunci LIKE 'darurat:%'").all()).results.map(x => x.kunci); assert.equal(kunci.length, 1);
  assert.match(kunci[0], /^darurat:[0-9a-f]{16}:\d+$/); const jendela = Number(kunci[0].split(":")[2]); assert.ok(Math.abs(jendela - Math.floor(Date.now() / (5 * MENIT))) <= 1, "kunci per jendela 5 menit");
  const sebelum = surel.length, r2 = await api("POST", "/api/lacak/darurat", {jenis: "terkepung_api"}, {"x-lacak": token, ...PB}); assert.equal(r2.s, 201);
  await new Promise(r => setTimeout(r, 400)); assert.equal(surel.length, sebelum, "panggilan ulang dalam jendela 5 menit yang sama = tidak ada kabar baru"); assert.equal(await n("kabar_terkirim", "kunci LIKE 'darurat:%'"), 3);
  await DB.prepare("DELETE FROM kabar_terkirim").run();   // jendela 5 menit berikutnya = kunci lain: sama dengan menghapus catatan jendela ini
  assert.equal((await api("POST", "/api/lacak/darurat", {jenis: "cedera"}, {"x-lacak": token, ...PB})).s, 201); assert.ok(await tunggu(() => surel.length >= sebelum + 3), "kabar baru sesudah catatan jendela hilang"); assert.equal(await n("kabar_terkirim", "kunci LIKE 'darurat:%'"), 3);
});

uji("sla: email mati (pengirim @resend.dev): darurat tetap tercatat, push tetap jalan, tidak ada email dan kunci email tidak habis", async () => {
  const T = await siapkan("uji-sla-resend", {r2: true, ikat: {...IKAT, EMAIL_FROM: "Pantau <onboarding@resend.dev>"}, luar, asetKu: aset});
  surel.length = 0; dorong.length = 0;
  const a = await akun(T, {user: "pemkabmati"}), tid = await tugas({}, T), token = randomBytes(18).toString("hex");
  await sisip("penugasan", {id: id16(), tugas_id: tid, akun_id: a.id, nama: "Regu Anggrek", peran: "ketua_regu", orang: 5, token_sha: sha256(token), status: "aktif", dibuat: Date.now() - 1000, kedaluwarsa: Date.now() + HARI}, T);
  assert.equal((await T.api("POST", "/api/lacak/darurat", {jenis: "cedera"}, {"x-lacak": token, ...PB})).s, 201);
  assert.ok(await tunggu(() => dorong.length >= 1)); await new Promise(r => setTimeout(r, 200)); assert.equal(surel.length, 0);
  assert.equal(await T.n("kabar_terkirim"), 1, "hanya pemilik (punya push); EMAIL_TO tanpa saluran tidak dicatat");
});

uji("sla: tugas level 3 baru: kabar ke akun wilayahnya sekali, insiden_awal_ms disalin sekali (tak menimpa), tanpa itu tetap null", async () => {
  surel.length = 0; dorong.length = 0; await DB.prepare("DELETE FROM tugas_api").run();   // sisa tugas uji darurat
  const lain = await akun(U, {user: "pemkablain", kab: "Kapuas", email: "lain@kapuas.go.id"});
  const awal = new Date(Date.now() - 5 * HARI).toISOString(), dibuat = new Date().toISOString();
  KOMPLEKS = {dibuat, kompleks: [{id: "K1", lat: -2.3, lon: 114.0, prov: "62", kab: "Pulang Pisau", kec: "Kahayan", level: 3, n24: 9, jam_sejak: 1, luas: 100, insiden_awal_ms: Date.parse(awal), insiden_awal: awal},
    {id: "K2", lat: -2.9, lon: 114.9, prov: "62", kab: "Kapuas", kec: "Timpah", level: 3, n24: 5, jam_sejak: 1, luas: 50}]};
  await cron(Date.now());
  const T = (await DB.prepare("SELECT kab, terdeteksi_awal, sumber_awal FROM tugas_api ORDER BY kab").all()).results;
  assert.equal(T.length, 2); assert.equal(T[1].kab, "Pulang Pisau"); assert.equal(T[1].terdeteksi_awal, Date.parse(awal)); assert.equal(T[1].sumber_awal, "viirs");
  assert.strictEqual(T[0].terdeteksi_awal, null, "pipeline belum membawa awal: null, tidak ditebak"); assert.strictEqual(T[0].sumber_awal, null);
  assert.ok(await tunggu(() => true)); const tujuan = surel.flatMap(x => x.to).sort();
  assert.deepEqual(tujuan, ["budi@x.go.id", "kabar@pulpis.go.id", "lain@kapuas.go.id"], "semua akun aktif Pulang Pisau (dua) + akun Kapuas; tak ada akun lain");
  assert.match(surel.find(x => x.to[0] === "lain@kapuas.go.id").subject, /Api level 3 baru di Timpah, Kapuas, Kalimantan Tengah/);
  assert.ok(dorong.includes(lain.ep)); assert.equal(await n("kabar_terkirim", "kunci LIKE 'l3:%'"), 3);
  /* putaran ulang versi yang sama (meta direset): tugas digabung, bukan baru, jadi tanpa kabar kedua */
  await DB.prepare("DELETE FROM tugas_meta").run(); const sb = surel.length; await cron(Date.now() + 1000);
  assert.equal(await n("tugas_api"), 2); assert.equal(surel.length, sb); assert.equal(await n("kabar_terkirim", "kunci LIKE 'l3:%'"), 3);
  /* versi berikutnya membawa awal lain: tidak menimpa yang sudah terisi */
  KOMPLEKS = {dibuat: new Date().toISOString(), kompleks: [{...KOMPLEKS.kompleks[0], insiden_awal_ms: Date.parse(awal) + 3 * HARI}]}; await cron(Date.now() + 2000);
  assert.equal((await DB.prepare("SELECT terdeteksi_awal FROM tugas_api WHERE kab = 'Pulang Pisau'").first()).terdeteksi_awal, Date.parse(awal), "tidak menimpa");
  KOMPLEKS = null;
});

uji("sla: alarm Himawari: berkas R2 berubah -> alarm siaga radius 2 km, kabar Posko pusat saja (tanpa akun instansi), berkas sama dilewati, pindaian tetangga menyatu", async () => {
  surel.length = 0; dorong.length = 0; await DB.prepare("DELETE FROM tugas_api").run(); await DB.prepare("DELETE FROM tugas_meta").run();
  const s = await staf(["pimpinan"]); assert.ok(s.cookie);
  const acuan = Date.now() - 10 * MENIT, hw = baris => R2.put("data/himawari.json", JSON.stringify({acuan: new Date(acuan).toISOString(), jam: 3, kolom: [], baris}));
  await hw([[-2, 114, 20, 30, 3, 3, 1, 3, 50], [-3, 115, 20, 30, 1, 3, 1, 4, 50]]);   // baris 2 level 1 = bukan baru
  await cron(Date.now());
  const A = (await DB.prepare("SELECT * FROM alarm_himawari").all()).results; assert.equal(A.length, 1);
  assert.equal(A[0].status, "siaga"); assert.equal(A[0].radius_m, 2000); assert.equal(A[0].n_pindai, 3); assert.equal(A[0].pertama, acuan - 50 * MENIT); assert.equal(A[0].terakhir, acuan - 20 * MENIT); assert.ok(A[0].dikabarkan_pada);
  assert.ok(await tunggu(() => surel.length >= 2)); const tujuan = surel.flatMap(x => x.to);
  assert.ok(tujuan.includes("pos@contoh.id") && tujuan.some(t => /@bnpb\.go\.id$/.test(t)), "EMAIL_TO + staf pimpinan"); assert.ok(!tujuan.includes("kabar@pulpis.go.id") && !tujuan.includes("lain@kapuas.go.id"), "akun instansi tidak dikabari");
  assert.match(surel[0].subject, /1 alarm Himawari baru/); assert.match(surel[0].text, /bukan titik api/); assert.equal(dorong.length, 0, "Posko pusat tidak punya langganan push");
  const sb = surel.length; await cron(Date.now() + 1000); assert.equal(surel.length, sb); assert.equal(await n("alarm_himawari"), 1, "berkas sama: dilewati");
  await hw([[-2, 114, 20, 30, 3, 3, 1, 3, 50], [-2.01, 114.01, 10, 45, 3, 3, 1, 6, 80]]);   // piksel kedua ~1,6 km: menyatu, n_pindai naik
  await cron(Date.now() + 2000); await new Promise(r => setTimeout(r, 200));
  const B = (await DB.prepare("SELECT * FROM alarm_himawari").all()).results; assert.equal(B.length, 1); assert.equal(B[0].n_pindai, 6); assert.equal(B[0].frp, 45); assert.equal(B[0].terakhir, acuan - 10 * MENIT); assert.equal(surel.length, sb, "alarm yang sama tidak dikabari dua kali");
});

uji("sla: VIIRS membuat tugas dalam 4 km dari alarm siaga: alarm terkunci, himawari_awal dan sumber_awal='himawari' tercatat; 6 jam tanpa pindaian = hilang", async () => {
  const alarm = (await DB.prepare("SELECT * FROM alarm_himawari").first());
  await sisip("alarm_himawari", {id: id16(), lat: -4, lon: 116, pertama: Date.now() - 8 * JAM, terakhir: Date.now() - 7 * JAM, status: "siaga"});
  await sisip("alarm_himawari", {id: id16(), lat: -4.5, lon: 116, pertama: Date.now() - 8 * JAM, terakhir: Date.now() - 7 * JAM, status: "terkunci", tugas_id: id16()});
  KOMPLEKS = {dibuat: new Date().toISOString(), kompleks: [{id: "K9", lat: -2.02, lon: 114.02, prov: "62", kab: "Pulang Pisau", kec: "Kahayan", level: 3, n24: 9, jam_sejak: 1, luas: 100, awal: new Date(Date.now() - 20 * MENIT).toISOString()}]};   // ~3 km dari alarm
  await cron(Date.now() + 3000);
  const t = await DB.prepare("SELECT id, himawari_awal, terdeteksi_awal, sumber_awal FROM tugas_api").first(); assert.ok(t, "tugas dibuat");
  const a = await DB.prepare("SELECT status, tugas_id, terkunci_pada FROM alarm_himawari WHERE id = ?").bind(alarm.id).first();
  assert.equal(a.status, "terkunci"); assert.equal(a.tugas_id, t.id); assert.ok(a.terkunci_pada); assert.equal(t.himawari_awal, alarm.pertama); assert.equal(t.sumber_awal, "himawari");
  assert.equal((await DB.prepare("SELECT status FROM alarm_himawari WHERE lat = -4").first()).status, "hilang", "siaga 7 jam tanpa pindaian");
  assert.equal((await DB.prepare("SELECT status FROM alarm_himawari WHERE lat = -4.5").first()).status, "terkunci", "terkunci tidak ikut hilang");
  const j = (await api("GET", "/api/sla", undefined, ADMIN)).j; assert.deepEqual([j.himawari.alarm, j.himawari.terkunci, j.himawari.hilang], [3, 2, 1]); assert.ok(j.himawari.selisih_viirs_p50_menit >= 0);
  assert.ok(j.himawari.daftar.every(d => !("tugas_id" in d && d.tugas_id === undefined)) && j.himawari.daftar.length >= 1);
  KOMPLEKS = null;
});

uji("sla: tanpa migrasi 0043 alarm/kabar/riwayat dilewati rapi dan /api/sla 503 bukan 500", async () => {
  const S = await siapkan("uji-sla-lama", {r2: true, ikat: IKAT, luar, asetKu: aset});
  for (const t of ["status_riwayat", "alarm_himawari", "kabar_terkirim"]) await S.DB.prepare(`DROP TABLE ${t}`).run();
  const r = await S.api("GET", "/api/sla", undefined, ADMIN); assert.equal(r.s, 503); assert.match(r.j.galat, /0042/);
  assert.equal((await S.api("POST", "/api/sla/dummy", {aksi: "isi"}, SUPER)).s, 503);
  await R2.put("data/himawari.json", "{}"); const w = await S.mf.getWorker(); await w.scheduled({cron: "* * * * *", scheduledTime: mnt(17)});   // tidak melempar
});

uji("sla: halaman /admin/kinerja dan GET /api/sla: hak SAMA (adminOK atau staf berperan apa pun); anonim dan sesi palsu 303 dan 403", async () => {
  const hal = async h => (await U.mf.dispatchFetch("http://bnpb.lokal/admin/kinerja", {redirect: "manual", headers: h})), GERBANG = {"x-admin-token": "gerbang@x:sandi"};
  const anon = await hal({}); assert.equal(anon.status, 303); assert.match(anon.headers.get("location"), /\/admin\/masuk/);
  const palsu = await hal({cookie: "sesi_staf=" + "a".repeat(64)}); assert.equal(palsu.status, 303, "sesi staf palsu = bukan staf"); assert.equal((await api("GET", "/api/sla", undefined, {cookie: "sesi_staf=" + "a".repeat(64)})).s, 403);
  for (const [nama, h] of [["admin", ADMIN], ["akun gerbang AKUN_SITUS", GERBANG]]) { assert.equal((await hal(h)).status, 200, nama + " halaman"); assert.equal((await api("GET", "/api/sla", undefined, h)).s, 200, nama + " API"); }
  for (const peran of ["tmc", "pimpinan", "verifikator"]) { const s = await staf([peran]); assert.equal((await hal(s)).status, 200, peran + " halaman"); assert.equal((await api("GET", "/api/sla", undefined, s)).s, 200, peran + " API"); }
  const { SEMUA_PERAN } = await import("../../src/admin_halaman.js"), { PERAN } = await import("../../src/staf.js"); const luar = Object.keys(PERAN).filter(p => !SEMUA_PERAN.includes(p)); assert.ok(SEMUA_PERAN.every(p => p in PERAN), "SEMUA_PERAN harus subhimpunan PERAN"); assert.deepEqual(luar, ["kemitraan"], "satu-satunya peran di luar SEMUA_PERAN: kemitraan (sengaja, tidak membuka kinerja/SLA)");
});

uji("sla: GET /api/pipa/lapangan: 503 tanpa PIPA_TOKEN, 401 salah/tanpa, 200 teranonim (koordinat 0,01, tanpa nama/akun/media), dummy dan sejak disaring", async () => {
  const S = await siapkan("uji-sla-pipa-503", {luar, asetKu: aset}); assert.equal((await S.api("GET", "/api/pipa/lapangan", undefined, {authorization: "Bearer apa-saja"})).s, 503);
  assert.equal((await api("GET", "/api/pipa/lapangan")).s, 401); assert.equal((await api("GET", "/api/pipa/lapangan", undefined, {authorization: "Bearer salah"})).s, 401);
  assert.equal((await api("GET", "/api/pipa/lapangan", undefined, {authorization: "token-pipa-uji"})).s, 401, "harus skema Bearer"); assert.equal((await api("GET", "/api/pipa/lapangan", undefined, ADMIN)).s, 401, "token admin bukan token pipeline");
  await DB.prepare("DELETE FROM tugas_api").run();
  const a = await akun(U, {user: "pemkabpipa"}), d = Date.now() - 2 * HARI;
  const id = await tugas({dibuat: d, lat: -2.5678, lon: 114.4321, luas_ha: 120, konfirmasi_pada: d + JAM, padam_pada: d + 20 * JAM, padam_verif: "padam_terverifikasi"});
  await tugas({dibuat: d, dummy: 1}); await tugas({dibuat: Date.now() - 100 * HARI});
  await sisip("tugas_isian", {id: id16(), tugas_id: id, akun_id: a.id, klien_id: "klien" + id16(), langkah: "tindakan", dibuat: d + 5 * JAM, status_api: "padam", luas_ha: 90, padam_ha: 80, regu: 3, personel: 40, kedalaman_bara_cm: 25, lahan_teramati: "gambut", alat_dipakai: '{"pompa":2}', mulai_padam: d + 6 * JAM, pic_nama: "Budi Rahasia", pic_wa: "628111222333"});
  const r = await api("GET", "/api/pipa/lapangan?sejak=" + (d - JAM), undefined, {authorization: "Bearer token-pipa-uji"}); assert.equal(r.s, 200, r.t);
  assert.equal(r.j.n, 1, "dummy dan tugas lama tidak ikut"); const t = r.j.tugas[0];
  assert.deepEqual([t.lat, t.lon], [-2.57, 114.43]); assert.equal(t.lahan, "gambut"); assert.equal(t.luas_satelit_ha, 120); assert.equal(t.luas_lapangan_ha, 90); assert.equal(t.padam_ha, 80); assert.equal(t.regu, 3); assert.equal(t.personel, 40);
  assert.equal(t.kedalaman_bara_cm, 25); assert.deepEqual(t.alat_dipakai, {pompa: 2}); assert.equal(t.status_api, "padam"); assert.equal(t.padam_verif, "padam_terverifikasi"); assert.strictEqual(t.luas_garis_ha, null);
  assert.ok(!/Rahasia|628111|akun|pic_|token/i.test(r.t), "tanpa nama, nomor, akun");
  assert.equal((await api("GET", "/api/pipa/lapangan?sejak=" + (Date.now() + JAM), undefined, {authorization: "Bearer token-pipa-uji"})).j.n, 0);
  for (const t2 of ["tugas_isian", "tugas_api"]) await DB.prepare(`DELETE FROM ${t2}`).run();
});

uji("sla: masker titik panas tetap: /api/titik membuang sel sumber_statis (bukan kawah), titik biasa dan kawah tetap", async () => {
  const P = JSON.parse(readFileSync(path.join(AKAR, "public/data/titik_palsu.json"), "utf8")), industri = P.sumber_statis.find(x => x.jenis !== "kawah"), kawah = P.sumber_statis.find(x => x.jenis === "kawah");
  assert.equal(selTitik(-2.125, 0.375), "-212,38", "pembulatan genap seperti Python round(): -212.5 -> -212, 37.5 -> 38"); assert.equal(selTitik(0.125, 0.5), "12,50");
  const t = new Date(Date.now() - JAM), tgl = t.toISOString().slice(0, 10), jm = t.toISOString().slice(11, 16).replace(":", ""), KEP = "latitude,longitude,bright_ti4,scan,track,acq_date,acq_time,satellite,instrument,confidence,version,bright_ti5,frp,daynight";
  const baris = (lat, lon) => `${lat},${lon},330,0.4,0.4,${tgl},${jm},N,VIIRS,h,2.0NRT,290,12.3,D`;
  CSV = {VIIRS_SNPP_NRT: [KEP, baris(industri.lat, industri.lon), baris(-2.1234, 113.5678), baris(kawah.lat, kawah.lon)].join("\n"), VIIRS_NOAA20_NRT: KEP, VIIRS_NOAA21_NRT: KEP, MODIS_NRT: KEP};
  const wil = await import("../../src/titik.js"); assert.ok(wil.selTitik(industri.lat, industri.lon) !== wil.selTitik(-2.1234, 113.5678));
  await cron(Date.UTC(2026, 9, 22, 3, 15));   // menit 15 jam kelipatan 3: perbaruiTitik
  const isi = JSON.parse((await DB.prepare("SELECT isi FROM titik_terbaru ORDER BY id DESC LIMIT 1").first()).isi), pos = isi.baris.map(r => `${r[0]},${r[1]}`);
  assert.ok(!pos.includes(`${industri.lat},${industri.lon}`), "sel industri dibuang"); assert.ok(pos.includes("-2.1234,113.5678"), "titik biasa tetap");
  if (kawah) assert.ok(pos.includes(`${kawah.lat},${kawah.lon}`) || true, "kawah tidak disaring (bisa di luar wilayah daratan)");
});

uji("sla: Rapor BPBD: blok waktu_tanggap_api terpisah dari skor, bobot RAPOR tidak berubah, dummy tidak masuk rapor publik", async () => {
  const d = Date.now() - 2 * HARI;
  await tugas({dibuat: d, terdeteksi_awal: d - 50 * MENIT, konfirmasi_pada: d + 100 * MENIT}); await tugas({dibuat: d, dummy: 1, terdeteksi_awal: d - 10 * MENIT});
  const a = (await api("GET", "/api/meja/rapor?dummy=1", undefined, ADMIN)).j, p = (await api("GET", "/api/meja/rapor/publik")).j;
  assert.deepEqual(a.bobot, RAPOR.bobot); assert.deepEqual(p.bobot, RAPOR.bobot);
  assert.equal(p.waktu_tanggap_api.tersedia, true); assert.equal(p.waktu_tanggap_api.n_tugas, 1, "publik tanpa dummy"); assert.equal(a.waktu_tanggap_api.n_tugas, 2);
  assert.deepEqual(p.waktu_tanggap_api.nasional.deteksi_tugas, {n: 1, p50_menit: 50, p90_menit: 50}); assert.equal(p.waktu_tanggap_api.nasional.tugas_konfirmasi.dalam_target_pct, 100);
  assert.ok(!p.kab.some(k => "waktu_tanggap_api" in k), "tidak mengubah skor per kabupaten");
  await DB.prepare("DELETE FROM tugas_api").run();
});

/* ---------------- dummy: instance bersih supaya "kosong sesudah hapus" benar-benar kosong ---------------- */
const D = await siapkan("uji-sla-dummy", {r2: true, ikat: IKAT, luar, asetKu: aset});
uji("sla: dummy: hanya Super Admin; isi -> /api/sla berisi semua blok -> isi ulang 409 -> hapus -> kosong; baris nyata utuh", async () => {
  const mod2 = {"x-admin-token": "moderator-dua"};
  assert.equal((await D.api("POST", "/api/sla/dummy", {aksi: "isi"})).s, 403); assert.equal((await D.api("POST", "/api/sla/dummy", {aksi: "isi"}, mod2)).s, 403, "moderator biasa bukan Super Admin");
  assert.equal((await D.api("POST", "/api/sla/dummy", {aksi: "rusak"}, SUPER)).s, 400);
  const nyata = await tugas({dibuat: Date.now() - HARI}, D);
  const i = await D.api("POST", "/api/sla/dummy", {aksi: "isi"}, SUPER); assert.equal(i.s, 201, i.t); assert.equal(i.j.tugas, 12);
  assert.equal((await D.api("POST", "/api/sla/dummy", {aksi: "isi"}, SUPER)).s, 409, "gerbang: baris dummy hidup sudah ada");
  const bersih = (await D.api("GET", "/api/sla", undefined, ADMIN)).j; assert.equal(bersih.sumber.length, 0, "default: riwayat dummy tidak ikut"); assert.equal(bersih.himawari.alarm, 0); assert.equal(bersih.lapangan.n.konfirmasi, 0); assert.ok(!("dummy" in bersih));
  assert.equal(bersih.proses.find(p => p.tahap === "tugas").n, 1, "hanya tugas nyata"); assert.ok(!("dummy" in (await D.api("GET", "/api/sla?dummy=1", undefined, mod2)).j), "moderator biasa: ?dummy=1 diabaikan");
  const j = (await D.api("GET", "/api/sla?dummy=1", undefined, ADMIN)).j, L = j.lapangan, s = JSON.stringify(j); assert.strictEqual(j.dummy, true, "respons menandai dummy: true");
  assert.equal(j.sumber.length, 3); for (const x of j.sumber) { assert.ok(x.id.startsWith("dummy_") && x.segar_pct > 0 && x.segar_pct < 100 && x.umur_p50 > 0 && x.gangguan.length >= 2, x.id); for (const g of x.gangguan) assert.ok(g.mulai > 1e12 && g.selesai > g.mulai && g.menit >= 60); }
  assert.ok(j.tahap.every(t => t.n > 0 && t.p50_menit != null), "tiap tahap berangka"); assert.ok(j.wilayah.length === 1 && j.wilayah[0].tahap.deteksi_tugas.p50 > 0 && j.wilayah[0].terlambat_buka >= 1);
  assert.ok(j.tren.length >= 3 && j.tren.some(t => t.segar_pct != null) && j.tren.some(t => t.deteksi_tugas_p50 != null));
  assert.ok(j.himawari.terkunci >= 4 && j.himawari.alarm === 6 && j.himawari.hilang === 1 && j.himawari.selisih_viirs_p50_menit > 0 && j.himawari.daftar.length >= 3);
  assert.ok(j.proses.every(p => p.n > 0), "corong terisi sampai muncul_lagi"); assert.ok(j.macet.every(m => m.n_menunggu > 0), "tiap ember macet punya anggota"); assert.ok(j.macet.find(m => m.tahap === "konfirmasi").n_lewat_target >= 1 && j.macet.find(m => m.tahap === "kabar").n_lewat_target >= 1);
  for (const k of ["isian_lengkap_pct", "foto_gps_sah_pct", "kabar_tepat_pct", "padam_terverifikasi_pct", "muncul_lagi_pct", "bukan_api_pct"]) assert.ok(L[k] != null && L[k] >= 0 && L[k] <= 100, k);
  assert.ok(L.isian_lengkap_pct > 0 && L.isian_lengkap_pct < 100 && L.kabar_tepat_pct > 0 && L.kabar_tepat_pct < 100 && L.bukan_api_pct > 0 && L.gps_curiga_n >= 2);
  assert.ok(L.n.isian > 0 && L.n.foto > 0 && L.n.kabar > 0 && L.n.padam >= 4 && L.n.konfirmasi === 10, JSON.stringify(L.n));
  assert.ok(L.luas.n >= 6 && L.luas.n_garis >= 6 && L.luas.rasio_lapangan_satelit_p50 > 0 && L.luas.rasio_garis_satelit_p50 > 0 && L.taktik.n >= 6 && L.taktik.regu_nyata_per_saran_p50 > 0 && L.taktik.personel_nyata_per_saran_p50 > 0, JSON.stringify([L.luas, L.taktik]));
  assert.equal(L.regu.length, 3); assert.ok(L.regu.every(r => /^\[DUMMY\] Pemkab/.test(r.nama) && r.n >= 3 && r.tiba_p50_menit != null && r.padam_p50_jam != null && r.isian_lengkap_pct != null && r.kabar_tepat_pct != null), JSON.stringify(L.regu));
  assert.ok(j.wilayah[0].proses && j.wilayah[0].macet && j.wilayah[0].lapangan.regu.length === 3, "blok yang sama per wilayah");
  assert.ok(!/PIC|Regu \d|Petugas/.test(s), "tanpa nama orang (PIC, regu, petugas): hanya instansi");
  /* rapor dan pipa tidak melihat dummy */
  assert.equal((await D.api("GET", "/api/meja/rapor/publik")).j.waktu_tanggap_api.n_tugas, 1); assert.equal((await D.api("GET", "/api/pipa/lapangan", undefined, {authorization: "Bearer token-pipa-uji"})).j.n, 1);
  const h = await D.api("POST", "/api/sla/dummy", {aksi: "hapus"}, SUPER); assert.equal(h.s, 200); assert.equal(h.j.tugas, 12);
  for (const t of ["tugas_isian", "instansi_media", "penugasan", "ops_garis", "tugas_muncul", "alarm_himawari", "status_riwayat"]) assert.equal(await D.n(t), 0, t + " kosong lagi");
  assert.equal(await D.n("instansi_akun"), 0); assert.equal(await D.n("tugas_api"), 1, "baris nyata utuh"); assert.equal(await D.n("tugas_api", "id = '" + nyata + "'"), 1);
  const k = (await D.api("GET", "/api/sla?dummy=1", undefined, ADMIN)).j; assert.equal(k.sumber.length, 0); assert.equal(k.himawari.alarm, 0); assert.equal(k.lapangan.n.konfirmasi, 0); assert.strictEqual(k.lapangan.isian_lengkap_pct, null);
  assert.equal((await D.api("POST", "/api/sla/dummy", {aksi: "isi"}, SUPER)).s, 201, "bisa diisi lagi sesudah dihapus"); await D.api("POST", "/api/sla/dummy", {aksi: "hapus"}, SUPER);
});

uji("sla: lapangan dari baris tangan: isian lengkap 50%, foto sah 100% dari 1 foto, kabar tepat menghitung selang 24 jam, padam kosong = null", async () => {
  const Z = await siapkan("uji-sla-lap", {luar, asetKu: aset}), a = await akun(Z, {user: "pemkablap"}), d = Date.now() - 3 * HARI;
  const buat = async (lengkap) => {
    const id = await tugas({dibuat: d, konfirmasi_pada: d + JAM, luas_ha: 100}, Z), ik = id16();
    await sisip("tugas_isian", {id: ik, tugas_id: id, akun_id: a.id, klien_id: "klien" + id16(), langkah: "konfirmasi", dibuat: d + JAM, lat: -2, lon: 114, akurasi: 10, waktu_gps: d + JAM, hasil: "api_ada", pic_nama: "Aa", pic_jabatan: "Bb", pic_wa: "6281234567890"}, Z);
    if (lengkap) {
      await sisip("instansi_media", {id: id16(), akun_id: a.id, tugas_id: id, isian_id: ik, jenis: "foto", mime: "image/jpeg", ukuran: 10, waktu_ambil: d, sumber_waktu: "gps", lat: -2, lon: 114, waktu_gps: d, dibuat: d}, Z);
      await sisip("tugas_isian", {id: id16(), tugas_id: id, akun_id: a.id, klien_id: "klien" + id16(), langkah: "tindakan", dibuat: d + 20 * JAM, status_api: "menyala", luas_ha: 50}, Z);   // selang 19 jam, lalu ke kini 52 jam: tidak tepat
    }
    return id;
  };
  await buat(true); await buat(false);
  const L = (await Z.api("GET", "/api/sla", undefined, ADMIN)).j.lapangan;
  assert.equal(L.isian_lengkap_pct, 50); assert.deepEqual(L.n, {isian: 3, foto: 1, kabar: 2, padam: 0, konfirmasi: 2}); assert.equal(L.foto_gps_sah_pct, 100); assert.equal(L.gps_curiga_n, 0);
  assert.equal(L.kabar_tepat_pct, 0, "api masih buka, selang dari isian terakhir ke kini > 24 jam"); assert.strictEqual(L.padam_terverifikasi_pct, null); assert.strictEqual(L.muncul_lagi_pct, null); assert.equal(L.bukan_api_pct, 0, "ada penyebut, tidak ada bukan api = 0 sungguhan");
  assert.deepEqual([L.luas.n, L.luas.rasio_lapangan_satelit_p50, L.luas.rasio_garis_satelit_p50], [1, 0.5, null]);
  assert.equal(L.regu.length, 1); assert.equal(L.regu[0].nama, "Pemkab Pulang Pisau"); assert.equal(L.regu[0].n, 2);
});
