/* Web Push akun instansi (src/push.js): worker.js utuh di workerd (Miniflare) dengan D1 lokal sungguhan dan migrasi apa adanya (TEST.md: tanpa mock klien DB).
   Layanan push dijawab fixture lewat outboundService; kiriman DIDEKRIPSI di sisi uji dengan node:crypto (RFC 8291, HMAC manual, bukan kode src) dan
   JWT VAPID diverifikasi dengan kunci publik uji. Jalankan: node --test tests/warga/push.test.mjs */
import assert from "node:assert/strict";
import {createECDH, createHmac, createDecipheriv, generateKeyPairSync, verify, randomBytes} from "node:crypto";
import "../../src/worker.js";   // worker.js dulu: push.js, instansi.js, dan worker.js saling impor
import {siapkan, berantai, sha256} from "./_bnpb.mjs";

const JAM = 3600e3, HARI = 24 * JAM, uji = berantai();
const T0 = Date.UTC(2026, 9, 22, 3, 25);   // jam 3 UTC (kelipatan 3), menit 25
const {privateKey, publicKey} = generateKeyPairSync("ec", {namedCurve: "prime256v1"});
const jwk = privateKey.export({format: "jwk"}), b64 = b => Buffer.from(b).toString("base64url");
const VAPID_PUBLIK = b64(Buffer.concat([Buffer.from([4]), Buffer.from(jwk.x, "base64url"), Buffer.from(jwk.y, "base64url")]));
const KUNCI = {VAPID_PUBLIK, VAPID_PRIVAT: jwk.d, VAPID_SUBJEK: "mailto:pemilik@contoh.id"};

/* layanan push palsu: catat kiriman, jawab status per endpoint (bawaan 201) */
const kiriman = [], status = new Map();
const luar = async req => {
  const u = new URL(req.url);
  if (!/(fcm\.googleapis\.com|\.push\.apple\.com)$/.test(u.hostname)) return new Response("diblok di uji", {status: 599});
  kiriman.push({url: req.url, h: Object.fromEntries(req.headers), b: new Uint8Array(await req.arrayBuffer())});
  return new Response(null, {status: status.get(req.url) ?? 201});
};
const U = await siapkan("uji-push", {ikat: KUNCI, luar}), S = await siapkan("uji-push-tanpa", {luar});

/* perangkat palsu: pasangan kunci pelanggan sungguhan */
function perangkat(host = "fcm.googleapis.com", id = randomBytes(6).toString("hex")) {
  const ecdh = createECDH("prime256v1"); ecdh.generateKeys();
  const auth = randomBytes(16);
  return {ecdh, auth, endpoint: `https://${host}/fcm/send/${id}`, sub: {endpoint: `https://${host}/fcm/send/${id}`, keys: {p256dh: b64(ecdh.getPublicKey()), auth: b64(auth)}}};
}
const hmac = (k, d) => createHmac("sha256", k).update(d).digest();
/* RFC 8291 sisi pelanggan */
function dekripsi(p, body) {
  const salt = body.slice(0, 16), idlen = body[20], asPub = body.slice(21, 21 + idlen), ct = body.slice(21 + idlen);
  assert.equal(body.readUInt32BE(16), 4096); assert.equal(idlen, 65);
  const rahasia = p.ecdh.computeSecret(asPub), uaPub = p.ecdh.getPublicKey();
  const ikm = hmac(hmac(p.auth, rahasia), Buffer.concat([Buffer.from("WebPush: info\0"), uaPub, asPub, Buffer.from([1])]));
  const prk = hmac(salt, ikm), cek = hmac(prk, Buffer.from("Content-Encoding: aes128gcm\0\x01")).slice(0, 16), nonce = hmac(prk, Buffer.from("Content-Encoding: nonce\0\x01")).slice(0, 12);
  const d = createDecipheriv("aes-128-gcm", cek, nonce); d.setAuthTag(ct.slice(-16));
  const t = Buffer.concat([d.update(ct.slice(0, -16)), d.final()]);
  assert.equal(t[t.length - 1], 2, "pembatas record terakhir");
  return JSON.parse(t.slice(0, -1).toString());
}

/* akun + sesi disemai lewat SQL (jalur masuk/verifikasi diuji di instansi.test.mjs) */
let nomor = 0;
async function akun(T, {user, jenis = "pemkab", tingkat = "kab", prov = "62", kab = "Pulang Pisau", wilayah, status: st = "aktif"}) {
  const id = randomBytes(8).toString("hex"), token = randomBytes(32).toString("hex"), kini = Date.now();
  await T.DB.prepare(`INSERT INTO instansi_akun (id, username, jenis, tingkat, wilayah, kunci_wilayah, cakupan, prov, kab, garam, sandi_sha, status, nama, nip, jabatan, unit, email, wa, surat, kartu, wajib_ganti, dibuat)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Budi', '198001012005011001', 'Kepala', 'BPBD', 'budi@x.go.id', '6281234567890', 1, 1, 0, ?)`)
    .bind(id, user, jenis, tingkat, wilayah ?? `${jenis} ${kab ?? prov}`, `${prov}|${kab ?? ""}|${++nomor}`, JSON.stringify([prov]), tingkat === "kab" ? prov : null, tingkat === "kab" ? kab : null, "g".repeat(32), "a".repeat(64), st, kini).run();
  await T.DB.prepare("INSERT INTO instansi_sesi (token_sha, akun_id, dibuat, kedaluwarsa) VALUES (?, ?, ?, ?)").bind(sha256(token), id, kini, kini + 30 * HARI).run();
  return {id, h: {cookie: `sesi_instansi=${token}`}};
}
const PB = {"x-pb": "1"};
const tugas = (T, o) => T.DB.prepare(`INSERT INTO tugas_api (id, prov, kab, kec, lat, lon, level, dibuat, terakhir_terdeteksi, status, konfirmasi_pada, isian_terakhir, padam_verif, padam_pada, verif_pada)
  VALUES (?, ?, ?, 'Kec', -2.5, 114, 2, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(randomBytes(8).toString("hex"), o.prov ?? "62", o.kab, o.dibuat, o.dibuat, o.status ?? "buka", o.konf ?? null, o.isian ?? null, o.verif ?? null, o.padam ?? null, o.verifPada ?? null).run();
const jalankan = (T, ms) => T.mf.getWorker().then(w => w.scheduled({cron: "* * * * *", scheduledTime: ms}));
const pasang = async (T, a, p, h = {}) => T.api("POST", "/api/instansi/push/langganan", p.sub, {...PB, ...a.h, ...h});
const reset = async T => { for (const t of ["push_langganan", "push_akun", "tugas_api", "laju_bnpb"]) await T.DB.prepare(`DELETE FROM ${t}`).run(); kiriman.length = 0; status.clear(); };

const A = await akun(U, {user: "pemkabpulangpisau"}), B = await akun(U, {user: "pemkabkapuas", kab: "Kapuas"});

uji("push: tanpa kunci VAPID rute 503 rapi, status tersedia false, cron tidak melempar", async () => {
  const a = await akun(S, {user: "pemkabpulangpisau"}), p = perangkat();
  assert.deepEqual((await S.api("GET", "/api/instansi/push/status", undefined, a.h)).j, {tersedia: false});
  for (const j of ["langganan", "uji"]) { const r = await S.api("POST", "/api/instansi/push/" + j, p.sub, {...PB, ...a.h}); assert.equal(r.s, 503, j); assert.match(r.j.galat, /belum diaktifkan/); }
  await jalankan(S, T0);   // tidak melempar
  assert.equal(kiriman.length, 0);
});

uji("push: tanpa sesi 401, tanpa header x-pb 403, akun belum aktif 403", async () => {
  const p = perangkat();
  assert.equal((await U.api("GET", "/api/instansi/push/status")).s, 401);
  assert.equal((await U.api("POST", "/api/instansi/push/langganan", p.sub, PB)).s, 401);
  assert.equal((await U.api("POST", "/api/instansi/push/langganan", p.sub, A.h)).s, 403);   // sesi sah tetapi tanpa x-pb
  const m = await akun(U, {user: "pemkabmenunggu", kab: "Barito", status: "menunggu"});
  assert.equal((await U.api("POST", "/api/instansi/push/langganan", p.sub, {...PB, ...m.h})).s, 403);
});

uji("push: langganan sah tersimpan, status memuat kunci publik dan jumlah, endpoint tidak bocor", async () => {
  const p = perangkat(), r = await pasang(U, A, p);
  assert.equal(r.s, 200, r.t);
  const s = await U.api("GET", "/api/instansi/push/status", undefined, A.h);
  assert.deepEqual(s.j, {tersedia: true, publik: VAPID_PUBLIK, perangkat: 1, maks: 10});
  assert.ok(!r.t.includes(p.endpoint) && !s.t.includes(p.endpoint));
  assert.equal((await pasang(U, A, p)).s, 200);   // sama lagi: tidak menggandakan
  assert.equal(await U.n("push_langganan"), 1);
  assert.equal((await U.api("GET", "/api/instansi/push/status", undefined, B.h)).j.perangkat, 0);
});

uji("push: langganan liar ditolak 400 (endpoint bukan layanan push, kunci cacat)", async () => {
  const bagus = perangkat(), buruk = [
    {...bagus.sub, endpoint: "https://evil.example.com/x"}, {...bagus.sub, endpoint: "http://fcm.googleapis.com/fcm/send/x"}, {...bagus.sub, endpoint: "https://fcm.googleapis.com:8443/fcm/send/xxxxx"},
    {...bagus.sub, endpoint: "https://u:p@fcm.googleapis.com/fcm/send/xxxxx"}, {...bagus.sub, endpoint: "https://fcm.googleapis.com.evil.com/fcm/send/xxxxxx"}, {...bagus.sub, endpoint: "https://notpush.apple.com.evil.io/x"},
    {...bagus.sub, endpoint: "https://127.0.0.1/x"}, {...bagus.sub, endpoint: 5}, {...bagus.sub, keys: {...bagus.sub.keys, p256dh: "pendek"}}, {...bagus.sub, keys: {...bagus.sub.keys, p256dh: b64(Buffer.concat([Buffer.from([4]), randomBytes(64)]))}},
    {...bagus.sub, keys: {...bagus.sub.keys, auth: "x"}}, {...bagus.sub, keys: {...bagus.sub.keys, auth: "!!!!!!!!!!!!!!!!!!!!!!"}}, {endpoint: bagus.endpoint}];
  for (const b of buruk) { const r = await U.api("POST", "/api/instansi/push/langganan", b, {...PB, ...A.h}); assert.equal(r.s, 400, JSON.stringify(b).slice(0, 120) + " -> " + r.t); }
  assert.equal(await U.n("push_langganan"), 1);   // hanya yang sah tadi
  for (const h of ["web.push.apple.com", "wns2-par02p.notify.windows.com", "updates.push.services.mozilla.com"]) { const x = perangkat(h); assert.equal((await pasang(U, B, x)).s, 200, h); }
});

uji("push: akun lain tidak bisa berhenti langganan milik akun lain; pemilik bisa", async () => {
  await reset(U);
  const p = perangkat(); await pasang(U, A, p);
  await U.api("POST", "/api/instansi/push/berhenti", {endpoint: p.endpoint}, {...PB, ...B.h});
  assert.equal(await U.n("push_langganan"), 1, "milik A tetap ada");
  assert.equal((await U.api("POST", "/api/instansi/push/berhenti", {endpoint: p.endpoint}, {...PB, ...A.h})).s, 200);
  assert.equal(await U.n("push_langganan"), 0);
});

uji("push: maksimum 10 perangkat per akun, perangkat yang sudah ada tetap boleh diperbarui", async () => {
  const ps = Array.from({length: 10}, () => perangkat());
  for (const p of ps) assert.equal((await pasang(U, A, p)).s, 200);
  const r = await pasang(U, A, perangkat()); assert.equal(r.s, 409); assert.match(r.j.galat, /maksimum 10/);
  assert.equal((await pasang(U, A, ps[0])).s, 200);
  assert.equal(await U.n("push_langganan", `akun_id = '${A.id}'`), 10);
  assert.equal((await pasang(U, B, perangkat())).s, 200, "batas per akun, bukan global");
});

uji("push: cron hanya jam UTC kelipatan 3 mulai menit 25", async () => {
  await reset(U);
  const p = perangkat(); await pasang(U, A, p); await tugas(U, {kab: "Pulang Pisau", dibuat: T0 - HARI}).then(() => 0);
  await U.DB.prepare("UPDATE push_langganan SET dibuat = ?").bind(T0 - 5 * HARI).run();
  for (const t of [Date.UTC(2026, 9, 22, 3, 24), Date.UTC(2026, 9, 22, 4, 25), Date.UTC(2026, 9, 22, 5, 30), Date.UTC(2026, 9, 22, 3, 18)]) { await jalankan(U, t); assert.equal(kiriman.length, 0, new Date(t).toISOString()); }
  await jalankan(U, T0); assert.equal(kiriman.length, 1);
});

uji("push: isi per wilayah akun saja, terenkripsi benar, tanpa data pribadi", async () => {
  await reset(U);
  const p = perangkat(); await pasang(U, A, p);
  await U.DB.prepare("UPDATE push_akun SET terakhir_kirim = ? WHERE akun_id = ?").bind(T0 - 3 * JAM, A.id).run();   // push terakhir 3 jam lalu
  const PP = "Pulang Pisau";
  await tugas(U, {kab: PP, dibuat: T0 - 1 * JAM}); await tugas(U, {kab: PP, dibuat: T0 - 2 * JAM});   // 2 baru
  await tugas(U, {kab: PP, dibuat: T0 - 8 * JAM});   // lewat 6 jam tanpa konfirmasi
  await tugas(U, {kab: PP, dibuat: T0 - 4 * HARI, konf: T0 - 40 * JAM, isian: T0 - 30 * JAM});   // kabar tindakan terlambat
  await tugas(U, {kab: PP, dibuat: T0 - 4 * HARI, konf: T0 - 3 * HARI, isian: T0 - 1 * JAM, verif: "muncul_lagi", verifPada: T0 - 1 * JAM});   // muncul lagi
  await tugas(U, {kab: PP, dibuat: T0 - 5 * HARI, status: "padam", verif: "padam_dilaporkan", padam: T0 - 2 * HARI});   // cek ulang H+1 lewat (lahan tak diketahui dianggap gambut)
  for (let i = 0; i < 6; i++) await tugas(U, {kab: "Kapuas", dibuat: T0 - JAM});   // kabupaten lain: tidak boleh terhitung
  await tugas(U, {prov: "61", kab: "Pulang Pisau", dibuat: T0 - JAM});   // nama sama di provinsi lain: tidak terhitung
  await jalankan(U, T0);
  assert.equal(kiriman.length, 1);
  const x = kiriman[0]; assert.equal(x.url, p.endpoint);
  assert.equal(x.h["content-encoding"], "aes128gcm"); assert.ok(Number(x.h.ttl) > 0); assert.equal(x.h.topic, A.id);
  const m = dekripsi(p, Buffer.from(x.b));
  assert.deepEqual(m, {judul: "2 api baru di Kab. Pulang Pisau", isi: "1 tugas belum dikonfirmasi, 1 tugas belum ada kabar tindakan, 1 api muncul lagi, 1 cek ulang jatuh tempo", tag: "pb-" + A.id, url: "/instansi"});
  assert.ok(!/budi|198001|6281/i.test(JSON.stringify(m)));
  assert.equal((await U.DB.prepare("SELECT terakhir_kirim t FROM push_akun WHERE akun_id = ?").bind(A.id).first()).t, T0);
  const sama = kiriman.length; await jalankan(U, T0 + 60e3); assert.equal(kiriman.length, sama, "satu notifikasi per akun per putaran");
  await jalankan(U, T0 + 3 * JAM);   // putaran berikutnya: api baru sudah dihitung, tersisa yang belum dicek, judul bukan lagi "api baru"
  assert.equal(kiriman.length, 2);
  assert.match(dekripsi(p, Buffer.from(kiriman[1].b)).judul, /^Ada yang perlu dicek di Kab\. Pulang Pisau$/);
});

uji("push: JWT VAPID ES256 terverifikasi, aud origin endpoint, exp tidak lebih dari 24 jam", async () => {
  await reset(U);
  for (const host of ["fcm.googleapis.com", "web.push.apple.com"]) await pasang(U, A, perangkat(host));
  await tugas(U, {kab: "Pulang Pisau", dibuat: T0 - JAM});
  await U.DB.prepare("UPDATE push_langganan SET dibuat = ?").bind(T0 - 2 * JAM).run();
  await jalankan(U, T0);
  assert.equal(kiriman.length, 2);
  for (const k of kiriman) {
    const m = /^vapid t=([\w-]+)\.([\w-]+)\.([\w-]+), k=([\w-]+)$/.exec(k.h.authorization); assert.ok(m, k.h.authorization);
    assert.equal(m[4], VAPID_PUBLIK);
    assert.deepEqual(JSON.parse(Buffer.from(m[1], "base64url")), {typ: "JWT", alg: "ES256"});
    assert.ok(verify("sha256", Buffer.from(`${m[1]}.${m[2]}`), {key: publicKey, dsaEncoding: "ieee-p1363"}, Buffer.from(m[3], "base64url")), "tanda tangan ES256 sah");
    const c = JSON.parse(Buffer.from(m[2], "base64url")), kini = Date.now();
    assert.equal(c.aud, new URL(k.url).origin); assert.equal(c.sub, KUNCI.VAPID_SUBJEK);
    assert.ok(c.exp * 1000 > T0 && c.exp * 1000 <= T0 + 24 * JAM, "exp dalam 24 jam dari waktu kirim");
  }
});

uji("push: semua nol tidak mengirim apa pun, penanda putaran tetap dicatat", async () => {
  await reset(U);
  await pasang(U, B, perangkat());   // Kapuas tanpa tugas
  await tugas(U, {kab: "Pulang Pisau", dibuat: T0 - JAM});   // tugas kabupaten lain tidak berarti apa-apa bagi B
  await U.DB.prepare("UPDATE push_langganan SET dibuat = ?").bind(T0 - 2 * JAM).run();
  await jalankan(U, T0);
  assert.equal(kiriman.length, 0);
  assert.equal((await U.DB.prepare("SELECT putaran p, terakhir_kirim t FROM push_akun WHERE akun_id = ?").bind(B.id).first()).p, Math.floor(T0 / (3 * JAM)));
});

uji("push: 410 menghapus langganan, 429 dan 5xx dicoba lagi putaran berikutnya", async () => {
  await reset(U);
  const mati = perangkat(), sibuk = perangkat("web.push.apple.com"), baik = perangkat(); for (const p of [mati, sibuk, baik]) await pasang(U, A, p);
  await tugas(U, {kab: "Pulang Pisau", dibuat: T0 - JAM}); await U.DB.prepare("UPDATE push_langganan SET dibuat = ?").bind(T0 - 2 * JAM).run();
  status.set(mati.endpoint, 410); status.set(sibuk.endpoint, 429);
  await jalankan(U, T0);
  assert.equal(await U.n("push_langganan", `endpoint = '${mati.endpoint}'`), 0, "410 dihapus");
  assert.equal((await U.DB.prepare("SELECT terakhir_status s FROM push_langganan WHERE endpoint = ?").bind(sibuk.endpoint).first()).s, 429);
  assert.equal(await U.n("push_langganan"), 2);
  /* semua perangkat gagal sementara: terakhir_kirim tidak maju, api baru tetap dihitung putaran berikutnya */
  await reset(U); const x = perangkat(); await pasang(U, A, x); await tugas(U, {kab: "Pulang Pisau", dibuat: T0 - JAM}); await U.DB.prepare("UPDATE push_langganan SET dibuat = ?").bind(T0 - 2 * JAM).run();
  status.set(x.endpoint, 503); await jalankan(U, T0);
  assert.equal((await U.DB.prepare("SELECT terakhir_kirim t FROM push_akun WHERE akun_id = ?").bind(A.id).first()).t, null);
  status.clear(); await jalankan(U, T0 + 3 * JAM);
  assert.equal(dekripsi(x, Buffer.from(kiriman.at(-1).b)).judul, "1 api baru di Kab. Pulang Pisau");
  assert.equal(await U.n("push_langganan"), 1);
});

uji("push: kerja dibatasi per invokasi dan dilanjutkan menit berikutnya tanpa kirim ganda", async () => {
  await reset(U);
  await U.DB.prepare("DELETE FROM instansi_akun WHERE username LIKE 'massal%'").run();
  const banyak = [];
  for (let i = 0; i < 5; i++) { const a = await akun(U, {user: "massal" + i, kab: "Kab" + i}); banyak.push(a); await tugas(U, {kab: "Kab" + i, dibuat: T0 - JAM}); for (let k = 0; k < 10; k++) await pasang(U, a, perangkat()); }
  await U.DB.prepare("UPDATE push_langganan SET dibuat = ?").bind(T0 - 2 * JAM).run();
  await jalankan(U, T0);
  assert.ok(kiriman.length > 0 && kiriman.length <= 40, `invokasi pertama ${kiriman.length} kiriman`);
  const awal = kiriman.length; assert.ok(awal < 50);
  await jalankan(U, T0 + 60e3);
  assert.equal(kiriman.length, 50, "sisa akun dilanjutkan menit 26");
  assert.equal(new Set(kiriman.map(k => k.url)).size, 50, "tiap perangkat tepat sekali");
  await jalankan(U, T0 + 2 * 60e3); assert.equal(kiriman.length, 50);
});

uji("push: kirim notifikasi uji ke perangkat akun itu, batas 5 per jam", async () => {
  await reset(U);
  const p = perangkat(); await pasang(U, A, p);
  assert.equal((await U.api("POST", "/api/instansi/push/uji", {}, {...PB, ...B.h})).s, 404, "B tidak punya perangkat");
  const r = await U.api("POST", "/api/instansi/push/uji", {}, {...PB, ...A.h});
  assert.deepEqual(r.j, {terkirim: 1, dari: 1});
  assert.equal(dekripsi(p, Buffer.from(kiriman[0].b)).judul, "Notifikasi uji");
  for (let i = 0; i < 4; i++) assert.equal((await U.api("POST", "/api/instansi/push/uji", {}, {...PB, ...A.h})).s, 200);
  assert.equal((await U.api("POST", "/api/instansi/push/uji", {}, {...PB, ...A.h})).s, 429);
});

uji("push keamanan: keluar mencabut langganan perangkat itu, ganti sandi mencabut semua langganan akun", async () => {
  await reset(U);
  const a = await akun(U, {user: "keamanankeluar", kab: "Barito"}), p1 = perangkat(), p2 = perangkat();
  await pasang(U, a, p1); await pasang(U, a, p2);
  assert.equal((await U.api("POST", "/api/instansi/keluar", {endpoint: p1.endpoint}, {...PB, ...a.h})).s, 200);
  assert.equal(await U.n("push_langganan", `akun_id = '${a.id}'`), 1, "hanya perangkat yang keluar");
  const b = await akun(U, {user: "keamanansandi", kab: "Murung Raya"}); await pasang(U, b, perangkat()); await pasang(U, b, perangkat());
  assert.equal((await U.api("POST", "/api/instansi/gantisandi", {}, {...PB, ...b.h})).s, 200);
  assert.equal(await U.n("push_langganan", `akun_id = '${b.id}'`), 0);
});

uji("push keamanan: akun cacat tidak mematikan akun lain dan tidak diulang", async () => {
  await reset(U);
  const buruk = await akun(U, {user: "keamananburuk", kab: "Kapuas"}), baik = await akun(U, {user: "keamananbaik", kab: "Pulang Pisau"});
  for (const a of [buruk, baik]) { await pasang(U, a, perangkat()); await tugas(U, {kab: a === buruk ? "Kapuas" : "Pulang Pisau", dibuat: T0 - JAM}); }
  await U.DB.prepare("UPDATE push_langganan SET dibuat = ?").bind(T0 - 2 * JAM).run();
  await U.DB.exec("PRAGMA ignore_check_constraints = ON"); await U.DB.prepare(`UPDATE instansi_akun SET kab = NULL WHERE id = ?`).bind(buruk.id).run();
  await jalankan(U, T0);
  assert.equal(kiriman.length, 1, "akun baik tetap terkirim");
  assert.equal((await U.DB.prepare("SELECT putaran p FROM push_akun WHERE akun_id = ?").bind(buruk.id).first()).p, Math.floor(T0 / (3 * JAM)), "akun cacat ditandai terproses");
  await jalankan(U, T0 + 60e3); assert.equal(kiriman.length, 1);
});

uji("push keamanan: klaim putaran mencegah kiriman ganda dan pindah akun mereset dasar", async () => {
  await reset(U);
  const p = perangkat(); await pasang(U, A, p); await tugas(U, {kab: "Pulang Pisau", dibuat: T0 - JAM});
  await U.DB.prepare("UPDATE push_langganan SET dibuat = ?").bind(T0 - 2 * JAM).run();
  await U.DB.prepare("UPDATE push_akun SET putaran = ? WHERE akun_id = ?").bind(Math.floor(T0 / (3 * JAM)), A.id).run();   // sudah diklaim invokasi lain
  await jalankan(U, T0); assert.equal(kiriman.length, 0);
  /* pindah akun: dibuat diperbarui dan push lama akun baru dilupakan */
  await U.DB.prepare("UPDATE push_akun SET putaran = 0").run();
  await U.DB.prepare("INSERT INTO push_akun (akun_id, terakhir_kirim, putaran) VALUES (?, ?, 0) ON CONFLICT(akun_id) DO UPDATE SET terakhir_kirim = excluded.terakhir_kirim").bind(B.id, T0 - 30 * HARI).run();
  await pasang(U, B, p);
  const r = await U.DB.prepare("SELECT akun_id a, dibuat d FROM push_langganan WHERE endpoint = ?").bind(p.endpoint).first();
  assert.equal(r.a, B.id); assert.ok(r.d > T0, "dibuat diperbarui ke waktu pindah");
  assert.equal((await U.DB.prepare("SELECT terakhir_kirim t FROM push_akun WHERE akun_id = ?").bind(B.id).first()).t, null);
});

uji("push keamanan: path FCM dibatasi, record 3993 byte terenkripsi, redirect tidak diikuti", async () => {
  await reset(U);
  const p = perangkat(); p.sub.endpoint = "https://fcm.googleapis.com/admin/internal/x";
  assert.equal((await pasang(U, A, p)).s, 400);
  const w = perangkat("fcm.googleapis.com"); w.sub.endpoint = "https://fcm.googleapis.com/wp/abcdefgh"; w.endpoint = w.sub.endpoint;
  assert.equal((await pasang(U, A, w)).s, 200);
  const { enkripsi } = await import("../../src/push.js");
  assert.ok((await enkripsi(new Uint8Array(3993), Buffer.from(w.sub.keys.p256dh, "base64url"), w.auth)).length > 0);
  await U.DB.prepare("UPDATE push_langganan SET dibuat = ?").bind(T0 - 2 * JAM).run();
  await tugas(U, {kab: "Pulang Pisau", dibuat: T0 - JAM}); status.set(w.endpoint, 302);
  await jalankan(U, T0);
  assert.equal(kiriman.length, 1);
  assert.equal((await U.DB.prepare("SELECT terakhir_status s FROM push_langganan WHERE endpoint = ?").bind(w.endpoint).first()).s, 302);
});
