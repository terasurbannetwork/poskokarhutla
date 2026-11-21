/* Peringatan dini warga (paket pwa-peringatan, PW-06, PW-07) di workerd (Miniflare) dengan D1 sungguhan dan migrasi 0163 apa adanya.
   Rute langganan, status, berhenti, cari, dan pemicu cron yang menulis pw_status, pw_peristiwa, pw_kendali. Tidak ada kiriman ke jaringan:
   langganan uji ada di kab yang tidak punya peristiwa, jadi pengirim tidak memanggil layanan push.
   Jalankan: node --test tests/lapor/peringatan_rute.test.mjs */
import assert from "node:assert/strict";
import {siapkan, berantai} from "../warga/_bnpb.mjs";
import "../../src/worker.js";   // worker dulu: modul saling impor (siklus)
import {jalankanPeringatan} from "../../src/pw_peringatan.js";

const uji = berantai();
const VAPID = {VAPID_PUBLIK_WARGA: "B" + "A".repeat(86), VAPID_PRIVAT_WARGA: "d".repeat(43), VAPID_SUBJEK: "mailto:uji@contoh.id"};
const U = await siapkan("uji-peringatan", {ikat: VAPID}), {api, DB, n} = U;
const PB = {"x-pb": "1"};
const EP = "https://fcm.googleapis.com/fcm/send/uji-perangkat-satu", EP2 = "https://web.push.apple.com/uji-perangkat-dua";
const KUNCI = {p256dh: "B" + "x".repeat(86), auth: "a".repeat(22)};

uji("kunci publik tersedia bila VAPID warga terpasang; cari kecamatan tanpa akun", async () => {
  const k = await api("GET", "/api/lapor/peringatan/kunci");
  assert.equal(k.s, 200); assert.equal(k.j.tersedia, true); assert.equal(k.j.publik, VAPID.VAPID_PUBLIK_WARGA);
  const c = await api("GET", "/api/lapor/peringatan/cari?q=cakung");
  assert.equal(c.s, 200); assert.ok(c.j.hasil.some(x => x.kode === "31.75.06"), JSON.stringify(c.j));
});

uji("langganan: x-pb wajib, endpoint di luar layanan push ditolak, kecamatan 1 sampai 3, simpan satu baris per kecamatan", async () => {
  const b = {endpoint: EP, kunci: KUNCI, kec: ["31.75.06"], jenis: 15, ambang: 1};
  assert.equal((await api("POST", "/api/lapor/peringatan/langganan", b)).s, 403, "tanpa x-pb");
  assert.equal((await api("POST", "/api/lapor/peringatan/langganan", {...b, endpoint: "https://contoh.com/push/x"}, PB)).s, 400, "endpoint sembarang");
  assert.equal((await api("POST", "/api/lapor/peringatan/langganan", {...b, kec: ["31.75.01", "31.75.02", "31.75.03", "31.75.04"]}, PB)).s, 400, "lebih dari 3 kecamatan");
  assert.equal((await api("POST", "/api/lapor/peringatan/langganan", {...b, kec: ["99.99.99"]}, PB)).s, 400, "kecamatan tidak dikenal");
  const r = await api("POST", "/api/lapor/peringatan/langganan", {...b, kec: ["31.75.06", "31.75.07"]}, PB);
  assert.equal(r.s, 200, r.t); assert.deepEqual(r.j.kec.map(x => x.kode), ["31.75.06", "31.75.07"]);
  assert.equal(await n("pw_langganan", `endpoint = '${EP}'`), 2);
  assert.equal(await n("pw_langganan", "kab_kode = '3175'"), 2);
});

uji("ubah daftar kecamatan menghapus yang tidak dipilih lagi; status hanya untuk pemegang endpoint; berhenti menghapus semua", async () => {
  const r = await api("POST", "/api/lapor/peringatan/ubah", {endpoint: EP, kunci: KUNCI, kec: ["31.75.07"], jenis: 1, ambang: 2}, PB);
  assert.equal(r.s, 200, r.t);
  assert.equal(await n("pw_langganan", `endpoint = '${EP}'`), 1);
  const s = await api("POST", "/api/lapor/peringatan/status", {endpoint: EP}, PB);
  assert.deepEqual(s.j.kec.map(x => x.kode), ["31.75.07"]); assert.equal(s.j.jenis, 1); assert.equal(s.j.ambang, 2);
  assert.equal((await api("POST", "/api/lapor/peringatan/status", {endpoint: EP2}, PB)).j.aktif, false);
  assert.equal((await api("POST", "/api/lapor/peringatan/berhenti", {endpoint: EP}, PB)).s, 200);
  assert.equal(await n("pw_langganan", `endpoint = '${EP}'`), 0);
});

uji("cron: peristiwa naik tingkat tercatat sekali per terbitan; terbitan sama tidak diulang; tanpa penerima peristiwa selesai", async () => {
  // langganan uji di kab lain (Bogor 3201), peristiwa di Jakarta Timur 3175: pengirim tidak memanggil layanan push
  assert.equal((await api("POST", "/api/lapor/peringatan/langganan", {endpoint: EP2, kunci: KUNCI, kec: ["32.01.01"], jenis: 15, ambang: 1}, PB)).s, 200);
  const kini = Date.now(), tgl = d => new Date(kini + 7 * 3600e3 + d * 864e5).toISOString().slice(0, 10);
  const P = {dibuat: new Date(kini - 3600e3).toISOString(), kode: {HJN: {kol: ["tot"], hari: [tgl(0), tgl(1), tgl(2)]}, BNJ: {kol: ["lv", "ps"]}, LSR: {kol: ["lv", "ps"]}, ASP: {kol: ["pm", "kat"]}, CEX: {kol: ["emb", "lv"]}},
    kab: [{id: "3175", nama: "Kota Administrasi Jakarta Timur", BNJ: [[2, 0], [0, 0], [1, 0]], LSR: [[0, 0], [0, 0], [0, 0]], ASP: [null, null, null], CEX: [[0, 0], [0, 0], [0, 0]]}]};
  const env = {DB, ...VAPID}, muat = () => async () => P;
  const h1 = await jalankanPeringatan(env, kini, muat);
  assert.equal(h1.peristiwa, 1, JSON.stringify(h1));
  assert.equal(await n("pw_status", "kab_kode = '3175'"), 2, "dua sel naik: banjir hari 1 dan hari 3");
  assert.equal(await n("pw_kendali", `kunci = 'dibuat_terakhir' AND nilai = '${P.dibuat}'`), 1);
  assert.equal(h1.kirim?.ok ?? 0, 0, "tidak ada penerima di 3175");
  assert.equal(await n("pw_peristiwa", "selesai = 1"), 1, "peristiwa tanpa penerima langsung selesai");
  const h2 = await jalankanPeringatan(env, kini + 60e3, muat);
  assert.equal(h2.peristiwa, undefined, "terbitan sama tidak diproses ulang");
  assert.equal(await n("pw_peristiwa"), 1);
  const P2 = {...P, dibuat: new Date(kini).toISOString()};   // terbitan baru dengan tingkat sama: tidak ada peristiwa baru
  await jalankanPeringatan(env, kini + 120e3, () => async () => P2);
  assert.equal(await n("pw_peristiwa"), 1, "tingkat sama di terbitan baru tidak memicu");
  await DB.prepare("INSERT INTO pw_kendali (kunci, nilai) VALUES ('jeda', '1') ON CONFLICT(kunci) DO UPDATE SET nilai = '1'").run();
  assert.equal((await jalankanPeringatan(env, kini + 180e3, () => async () => ({...P, dibuat: "x"}))).lewat, "jeda");
});
