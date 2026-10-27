/* Perluasan karhutla ke banjir di atas worker.js utuh (Miniflare, D1 lokal sungguhan, migrasi apa adanya; TEST.md: tanpa mock klien DB):
   1. push 3-jam "status banjir naik" per wilayah akun (src/push.js, migrations/0064_push_banjir.sql), dibaca dari aset /banjir/data/status.json
   2. antrean prioritas BPBD memuat kejadian banjir AKTIF (src/pengingat.js, kejadian_aktif_awal.json)
   3. uji lapangan banjir: POST /api/instansi/uji-banjir + GET /api/uji-lapangan/banjir (src/uji_banjir.js, migrations/0065_uji_banjir.sql)
   Jalankan: node --test tests/warga/banjir_perluasan.test.mjs */
import assert from "node:assert/strict";
import {createECDH, createHmac, createDecipheriv, generateKeyPairSync, randomBytes} from "node:crypto";
import {readFileSync, existsSync} from "node:fs";
import vm from "node:vm";
import path from "node:path";
import {AKAR, pecah} from "./_bantu.mjs";
import {ipHash} from "../../src/worker.js";   // worker.js dulu: push.js, instansi.js, dan worker.js saling impor
import {siapkan, berantai, sha256} from "./_bnpb.mjs";

const JAM = 3600e3, HARI = 24 * JAM, uji = berantai();
const wib = t => new Date(t + 7 * JAM).toISOString().slice(0, 10);
const T0 = Date.UTC(2026, 9, 22, 3, 25);
const {privateKey} = generateKeyPairSync("ec", {namedCurve: "prime256v1"});
const jwk = privateKey.export({format: "jwk"}), b64 = b => Buffer.from(b).toString("base64url");
const KUNCI = {VAPID_PUBLIK: b64(Buffer.concat([Buffer.from([4]), Buffer.from(jwk.x, "base64url"), Buffer.from(jwk.y, "base64url")])), VAPID_PRIVAT: jwk.d, VAPID_SUBJEK: "mailto:pemilik@contoh.id"};

/* aset terkendali: status.json, kejadian_aktif_awal.json, risiko_prioritas.json (null = 404); selain itu berkas public/ apa adanya */
const K = {status: null, kej: null, prio: null};
const aset = async req => {
  const p = new URL(req.url).pathname, peta = {"/banjir/data/status.json": K.status, "/banjir/data/kejadian_aktif_awal.json": K.kej, "/banjir/data/risiko_prioritas.json": K.prio};
  return p in peta && peta[p] != null ? new Response(typeof peta[p] === "string" ? peta[p] : JSON.stringify(peta[p])) : p in peta || p.endsWith("/") || !existsSync(path.join(AKAR, "public", p)) ? new Response("tidak ada", {status: 404}) : new Response(readFileSync(path.join(AKAR, "public", p)));
};
const kiriman = [], statusPush = new Map();
const luar = async req => {
  const u = new URL(req.url);
  if (!/(fcm\.googleapis\.com)$/.test(u.hostname)) return new Response("diblok di uji", {status: 599});
  kiriman.push({url: req.url, b: new Uint8Array(await req.arrayBuffer())});
  return new Response(null, {status: statusPush.get(req.url) ?? 201});
};
const U = await siapkan("uji-banjir-perluasan", {ikat: KUNCI, luar, asetKu: aset});

function perangkat(id = randomBytes(6).toString("hex")) {
  const ecdh = createECDH("prime256v1"); ecdh.generateKeys(); const auth = randomBytes(16), endpoint = `https://fcm.googleapis.com/fcm/send/${id}`;
  return {ecdh, auth, endpoint, sub: {endpoint, keys: {p256dh: b64(ecdh.getPublicKey()), auth: b64(auth)}}};
}
const hmac = (k, d) => createHmac("sha256", k).update(d).digest();
function dekripsi(p, body) {
  const salt = body.slice(0, 16), idlen = body[20], asPub = body.slice(21, 21 + idlen), ct = body.slice(21 + idlen);
  const ikm = hmac(hmac(p.auth, p.ecdh.computeSecret(asPub)), Buffer.concat([Buffer.from("WebPush: info\0"), p.ecdh.getPublicKey(), asPub, Buffer.from([1])]));
  const prk = hmac(salt, ikm), cek = hmac(prk, Buffer.from("Content-Encoding: aes128gcm\0\x01")).slice(0, 16), nonce = hmac(prk, Buffer.from("Content-Encoding: nonce\0\x01")).slice(0, 12);
  const d = createDecipheriv("aes-128-gcm", cek, nonce); d.setAuthTag(ct.slice(-16));
  const t = Buffer.concat([d.update(ct.slice(0, -16)), d.final()]);
  return JSON.parse(t.slice(0, -1).toString());
}
let nomor = 0;
async function akun(user, {tingkat = "kab", prov = "62", kab = "Pulang Pisau", status: st = "aktif"} = {}) {
  const id = randomBytes(8).toString("hex"), token = randomBytes(32).toString("hex"), kini = Date.now();
  await U.DB.prepare(`INSERT INTO instansi_akun (id, username, jenis, tingkat, wilayah, kunci_wilayah, cakupan, prov, kab, garam, sandi_sha, status, nama, nip, jabatan, unit, email, wa, surat, kartu, wajib_ganti, dibuat)
    VALUES (?, ?, 'pemkab', ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Budi', '198001012005011001', 'Kepala', 'BPBD', 'budi@x.go.id', '6281234567890', 1, 1, 0, ?)`)
    .bind(id, user, tingkat, `pemkab ${kab}`, `${prov}|${kab}|${++nomor}`, JSON.stringify([prov]), tingkat === "kab" ? prov : null, tingkat === "kab" ? kab : null, "g".repeat(32), "a".repeat(64), st, kini).run();
  await U.DB.prepare("INSERT INTO instansi_sesi (token_sha, akun_id, dibuat, kedaluwarsa) VALUES (?, ?, ?, ?)").bind(sha256(token), id, kini, kini + 30 * HARI).run();
  return {id, h: {cookie: `sesi_instansi=${token}`}};
}
const PB = {"x-pb": "1"};
const jalankan = ms => U.mf.getWorker().then(w => w.scheduled({cron: "* * * * *", scheduledTime: ms}));
const stat = (hari, kec) => ({hari: [hari, wib(Date.parse(hari) + HARI)], kec: Object.fromEntries(Object.entries(kec).map(([k, l]) => [k, {b: [l, 0]}]))});
const hariT0 = wib(T0);

/* ================================================================ 1. push banjir naik */
const A = await akun("pemkabpulangpisau"), B = await akun("pemkabkapuas", {kab: "Kapuas"});
const pA = perangkat(), pB = perangkat();
for (const [a, p] of [[A, pA], [B, pB]]) await U.api("POST", "/api/instansi/push/langganan", p.sub, {...PB, ...a.h});
await U.DB.prepare("UPDATE push_langganan SET dibuat = ?").bind(T0 - 5 * HARI).run();
const PP = "62|Pulang Pisau|", KP = "62|Kapuas|";
const tulisStatus = (kec, hari = hariT0) => { K.status = stat(hari, kec); };
const kirimanKe = p => kiriman.filter(k => k.url === p.endpoint);
const levelTercatat = async (a, kab) => (await U.DB.prepare("SELECT level FROM push_banjir WHERE akun_id = ? AND kab = ?").bind(a.id, kab).first())?.level;

uji("push banjir: putaran pertama hanya mencatat garis dasar, tidak membanjiri akun dengan status yang sudah ada", async () => {
  tulisStatus({[PP + "Kahayan Hilir"]: 2, [PP + "Maliku"]: 1, [KP + "Selat"]: 3});
  await jalankan(T0);
  assert.equal(kiriman.length, 0);
  assert.equal(await levelTercatat(A, "62|Pulang Pisau"), 2); assert.equal(await levelTercatat(B, "62|Kapuas"), 3);
  assert.equal(await U.n("push_banjir", `akun_id = '${A.id}'`), 1, "hanya kabupaten wilayah akun itu");
});

uji("push banjir: kabupaten naik ke Siaga/Awas dikirim ke akun wilayahnya saja, tidak berulang di putaran berikutnya", async () => {
  tulisStatus({[PP + "Kahayan Hilir"]: 3, [PP + "Maliku"]: 1, [KP + "Selat"]: 3});
  await jalankan(T0 + 3 * JAM);
  assert.equal(kirimanKe(pB).length, 0, "Kapuas tidak naik");
  assert.equal(kirimanKe(pA).length, 1);
  const m = dekripsi(pA, Buffer.from(kirimanKe(pA)[0].b));
  assert.deepEqual(m, {judul: "Status banjir naik di Kab. Pulang Pisau", isi: "Status banjir naik: Kab. Pulang Pisau ke Awas", tag: "pb-" + A.id, url: "/instansi"});
  assert.ok(!/budi|198001|6281/i.test(JSON.stringify(m)));
  assert.equal(await levelTercatat(A, "62|Pulang Pisau"), 3);
  await jalankan(T0 + 6 * JAM); assert.equal(kirimanKe(pA).length, 1, "level sama = tidak berulang");
});

uji("push banjir: turun tidak mengirim tetapi dicatat, naik lagi ke Waspada dikirim lagi", async () => {
  tulisStatus({[PP + "Kahayan Hilir"]: 0, [PP + "Maliku"]: 0, [KP + "Selat"]: 3});
  await jalankan(T0 + 9 * JAM); assert.equal(kirimanKe(pA).length, 1); assert.equal(await levelTercatat(A, "62|Pulang Pisau"), 0);
  tulisStatus({[PP + "Kahayan Hilir"]: 1, [PP + "Maliku"]: 0, [KP + "Selat"]: 3});
  await jalankan(T0 + 12 * JAM); assert.equal(kirimanKe(pA).length, 2);
  assert.match(dekripsi(pA, Buffer.from(kirimanKe(pA)[1].b)).isi, /^Status banjir naik: Kab\. Pulang Pisau ke Waspada$/);
});

uji("push banjir: kiriman gagal tidak dicatat sehingga dicoba lagi; berkas status basi atau hilang tidak mengirim apa pun", async () => {
  tulisStatus({[PP + "Kahayan Hilir"]: 2, [KP + "Selat"]: 3});
  statusPush.set(pA.endpoint, 500);
  await jalankan(T0 + 15 * JAM); assert.equal(kirimanKe(pA).length, 3, "dicoba");
  assert.equal(await levelTercatat(A, "62|Pulang Pisau"), 1, "gagal: level naik belum dicatat");
  statusPush.delete(pA.endpoint);
  await jalankan(T0 + 18 * JAM); assert.equal(kirimanKe(pA).length, 4); assert.equal(await levelTercatat(A, "62|Pulang Pisau"), 2);
  const sebelum = kiriman.length;
  tulisStatus({[PP + "Kahayan Hilir"]: 3}, wib(T0 - 5 * HARI)); await jalankan(T0 + 21 * JAM);   // hari ke-0 lima hari lalu
  K.status = null; await jalankan(T0 + 24 * JAM);   // 404
  assert.equal(kiriman.length, sebelum); assert.equal(await levelTercatat(A, "62|Pulang Pisau"), 2);
});

uji("push banjir: akun provinsi menerima ringkasan banyak kabupaten, dibatasi lima nama", async () => {
  const P = await akun("pemprovkalteng", {tingkat: "prov"}), pP = perangkat();
  await U.api("POST", "/api/instansi/push/langganan", pP.sub, {...PB, ...P.h}); await U.DB.prepare("UPDATE push_langganan SET dibuat = ? WHERE akun_id = ?").bind(T0 - 5 * HARI, P.id).run();
  const kabs = ["Satu", "Dua", "Tiga", "Empat", "Lima", "Enam", "Tujuh"], rendah = Object.fromEntries(kabs.map(k => [`62|${k}|X`, 0])), tinggi = Object.fromEntries(kabs.map((k, i) => [`62|${k}|X`, i < 3 ? 3 : 2]));
  tulisStatus(rendah, wib(T0 + 27 * JAM)); await jalankan(T0 + 27 * JAM); assert.equal(kirimanKe(pP).length, 0);
  tulisStatus(tinggi, wib(T0 + 30 * JAM)); await jalankan(T0 + 30 * JAM);
  const m = dekripsi(pP, Buffer.from(kirimanKe(pP)[0].b));
  assert.equal(m.isi, "Status banjir naik: Kab. Dua ke Awas, Kab. Satu ke Awas, Kab. Tiga ke Awas, Kab. Empat ke Siaga, Kab. Enam ke Siaga, dan 2 kabupaten lain");
});

uji("migrasi 0064 dan 0065 idempoten (dijalankan dua kali tanpa galat)", async () => {
  for (const f of ["0064_push_banjir.sql", "0065_uji_banjir.sql"]) for (let i = 0; i < 2; i++) for (const s of pecah(readFileSync(path.join(AKAR, "migrations", f), "utf8"))) await U.DB.prepare(s).run();
});

/* ================================================================ 2. antrean BPBD: kejadian banjir aktif */
const kec = (n, o = {}) => ({prov: "33", prov_nama: "Jawa Tengah", kab: "Kabupaten A", kec: "Kec " + n, kelas: 2, kelas_nama: "Tinggi", skor: 60, utama: "banjir", utama_nama: "Banjir", pend: 1000, perubahan: "tetap", dari_kelas: "Tinggi", bpbd: {nama: "AAA", pusdalops: "0812-3456-7890", km: 5, sekab: true}, ...o});
const hariIni = () => wib(Date.now());
const kejadian = (list, hari = hariIni()) => ({hari, dibuat: hari + "T07:00+07:00", terakhir: 33, ambang_level: 2, kejadian: list});
const KEJ = (kode, level, kec) => ({kode, sejak: hariIni(), level_tertinggi: level, n_kec: kec.length, kec, prov: ["33"], penduduk: 777, h3_mm: 100, bahaya_banjir: 0.5, skor: 60, pusat: [-7, 110]});
const periksa = () => U.adm("POST", "/api/pengingat/admin/periksa", {});
const barisKej = async () => (await U.DB.prepare("SELECT id, keadaan, status, judul, rincian, muatan FROM pengingat WHERE jenis = 'prioritas_dampak' AND keadaan LIKE 'j%' ORDER BY judul").all()).results;

uji("antrean BPBD: kejadian banjir aktif masuk per (kejadian, kabupaten) dengan BPBD dari risiko_prioritas, tautan WA, tanpa data pribadi", async () => {
  K.prio = JSON.stringify({hari: hariIni(), usang: false, kec: [kec(1), kec(2)]});
  K.kej = kejadian([KEJ("B0007", 3, ["33|Kabupaten A|Kec 1", "33|Kabupaten A|Kec 2", "33|Kabupaten A|Kec 9"]), KEJ("B0008", 2, ["33|Kabupaten Z|Kec Q"])]);
  const a = await periksa(); assert.equal(a.s, 200, a.t);
  const rs = await barisKej(); assert.equal(rs.length, 2);
  const r1 = rs.find(r => r.judul.includes("B0007")), r2 = rs.find(r => r.judul.includes("B0008"));
  assert.equal(r1.keadaan, "j3"); assert.equal(r1.judul, "Banjir aktif B0007, Kabupaten A: Awas, 3 kecamatan, ±2.000 jiwa");
  assert.equal(r1.rincian, "BPBD AAA; kecamatan Kec 1, Kec 2, Kec 9"); assert.equal(r2.rincian, "BPBD tujuan belum ada; kecamatan Kec Q");
  assert.equal(JSON.parse(r2.muatan).jiwa, 777, "kabupaten tunggal: jiwa dari kejadian"); assert.equal(JSON.parse(r2.muatan).wa, null);
  const g = (await U.adm("GET", "/api/pengingat/admin")).j.kelompok_prioritas, A1 = g.find(x => x.bpbd === "AAA");
  assert.ok(A1.tautan.startsWith("https://wa.me/6281234567890?text="), A1.tautan); assert.ok(A1.teks.includes("Banjir aktif B0007 (sejak"), A1.teks);
  assert.equal(g.find(x => x.bpbd === "" && x.wa === null).tautan, null, "tanpa nomor: tanpa tautan");
  assert.ok(!/budi|198001|@/i.test(JSON.stringify(g)), "tanpa data pribadi");
  const b = await periksa(); assert.equal(b.j.dibuat, 0, "dua kali jalan tidak berulang");
});

uji("antrean BPBD: naik level = baris baru; kejadian reda dihapus; berkas kejadian hilang atau basi mempertahankan baris lama", async () => {
  K.kej = kejadian([KEJ("B0007", 2, ["33|Kabupaten A|Kec 1"])]);
  const a = await periksa(); assert.equal(a.j.dibuat, 1, "j2 baru"); assert.equal(a.j.dihapus, 2, "j3 lama dan B0008 hilang dari berkas");
  assert.deepEqual((await barisKej()).map(r => r.keadaan), ["j2"]);
  for (const rusak of [null, kejadian([KEJ("B0099", 3, ["33|Kabupaten A|Kec 1"])], wib(Date.now() - 10 * HARI)), "{bukan json"]) {
    K.kej = rusak; const x = await periksa(); assert.equal(x.s, 200, x.t);
    assert.deepEqual((await barisKej()).map(r => r.keadaan), ["j2"], "baris kejadian lama tidak dipangkas");
    assert.equal(await U.n("pengingat", "jenis = 'prioritas_dampak' AND keadaan LIKE 'k%'"), 2, "baris risiko tetap");
  }
  K.kej = kejadian([]);   // berkas sah tanpa kejadian = semua reda
  assert.equal((await periksa()).j.dihapus, 1); assert.equal((await barisKej()).length, 0);
});

/* ================================================================ 3. uji lapangan banjir */
const KECAMATAN = "62|Pulang Pisau|Kahayan Hilir", LAIN = "62|Kapuas|Selat";
const kirimUji = (a, b, h = {}) => U.api("POST", "/api/instansi/uji-banjir", b, {...PB, ...a.h, ...h});
const IPH = {"cf-connecting-ip": "203.0.113.9"};
const dasar = {sampel: "genangan", kec: KECAMATAN, lat: -2.7412, lon: 114.2518, tinggi_cm: 40, lama_jam: 6};
let C, ujiHari;
uji("uji banjir: genangan sah tersimpan; status peta dibaca server dari status.json, bukan dari klien; koordinat dibulatkan", async () => {
  ujiHari = hariIni(); K.status = stat(ujiHari, {[KECAMATAN]: 2, [PP + "Maliku"]: 0, [LAIN]: 3});
  C = await akun("pemkabpulangpisau2");
  const r = await kirimUji(C, {...dasar, luas_ha: 12.5}); assert.equal(r.s, 201, r.t);
  assert.equal(r.j.status_peta, "Siaga"); assert.equal(r.j.hari_status, ujiHari); assert.match(r.j.id, /^[0-9a-f]{16}$/);
  const d = await U.DB.prepare("SELECT * FROM uji_banjir WHERE id = ?").bind(r.j.id).first();
  assert.deepEqual([d.sampel, d.prov, d.kab, d.kec, d.status_peta, d.lat, d.lon, d.tinggi_cm, d.luas_ha, d.lama_jam, d.akun_id], ["genangan", "62", "Pulang Pisau", "Kahayan Hilir", 2, -2.741, 114.252, 40, 12.5, 6, C.id]);
  assert.equal((await kirimUji(C, {...dasar, status_peta: 0})).s, 400, "klien tidak boleh mengisi status peta");
});

uji("uji banjir: gerbang route, tanpa sesi 401, tanpa x-pb 403, akun belum aktif 403, di luar wilayah 403, kecamatan tak dikenal 400", async () => {
  assert.equal((await U.api("POST", "/api/instansi/uji-banjir", dasar, PB)).s, 401);
  assert.equal((await U.api("POST", "/api/instansi/uji-banjir", dasar, C.h)).s, 403);
  const m = await akun("pemkabmenunggu", {status: "menunggu", kab: "Barito"}); assert.equal((await kirimUji(m, dasar)).s, 403);
  assert.equal((await kirimUji(C, {...dasar, kec: LAIN})).s, 403);
  assert.equal((await kirimUji(C, {...dasar, kec: PP + "Tidak Ada"})).s, 400);
  assert.equal((await U.api("GET", "/api/instansi/uji-banjir", undefined, C.h)).s, 405, "hanya POST");
});

uji("uji banjir: validasi medan genangan dan kontrol", async () => {
  const buruk = [{...dasar, sampel: "lain"}, {...dasar, kec: "x"}, {...dasar, lat: 50}, {...dasar, lat: "-2.7"}, {...dasar, tinggi_cm: 0}, {...dasar, tinggi_cm: 1001}, {...dasar, tinggi_cm: 4.5}, {...dasar, tinggi_cm: undefined},
    {...dasar, lama_jam: -1}, {...dasar, lama_jam: 721}, {...dasar, lama_jam: undefined}, {...dasar, luas_ha: 0}, {...dasar, luas_ha: 100001}, {...dasar, luas_ha: "9"}, {...dasar, foto_id: "zz"}, {...dasar, ekstra: 1},
    {...dasar, sampel: "kontrol", kec: PP + "Maliku"}];   // kontrol tidak membawa medan genangan
  for (const b of buruk) { const r = await kirimUji(C, b); assert.equal(r.s, 400, JSON.stringify(b) + " -> " + r.t); }
  assert.equal((await kirimUji(C, {...dasar, sampel: "kontrol", kec: KECAMATAN, tinggi_cm: undefined, lama_jam: undefined})).s, 409, "kontrol hanya untuk lokasi Aman");
  const ok = await kirimUji(C, {sampel: "kontrol", kec: PP + "Maliku", lat: -2.8, lon: 114.3}); assert.equal(ok.s, 201, ok.t); assert.equal(ok.j.status_peta, "Aman");
  const g = await kirimUji(C, {...dasar, kec: PP + "Maliku"}); assert.equal(g.s, 201, "genangan di lokasi berstatus Aman = banjir terlewat, sah dan justru penting");
  assert.equal((await U.DB.prepare("SELECT status_peta s FROM uji_banjir WHERE id = ?").bind(g.j.id).first()).s, 0);
  const nol = await kirimUji(C, {...dasar, lama_jam: 0, tinggi_cm: 1}); assert.equal(nol.s, 201, nol.t);
});

uji("uji banjir: foto harus ada, non-dummy, dari IP yang sama dalam 30 menit, dan dalam 1 km; satu pesan galat untuk semua sebab", async () => {
  const ip = await ipHash({IP_SALT: "garam-uji"}, new Request("http://x/", {headers: IPH})), kini = Date.now();
  const foto = (id, lat, lon, o = {}) => U.DB.prepare("INSERT INTO foto (id, jenis, kategori, lat, lon, akurasi, diambil, dibuat, ukuran, mime, ip_hash, dummy) VALUES (?, 'foto', 'dampak', ?, ?, 10, 1, ?, 10, 'image/jpeg', ?, ?)").bind(id, lat, lon, o.dibuat ?? kini, o.ip ?? ip, o.dummy ?? 0).run();
  await foto("aaaaaaaaaaaaaaaa", -2.7415, 114.2520); await foto("bbbbbbbbbbbbbbbb", -2.9, 114.6); await foto("dddddddddddddddd", -2.7415, 114.2520, {dummy: 1});
  await foto("eeeeeeeeeeeeeeee", -2.7415, 114.2520, {ip: "x".repeat(64)}); await foto("ffffffffffffffff", -2.7415, 114.2520, {dibuat: kini - 31 * 60e3});
  const galat = new Set();
  for (const id of ["cccccccccccccccc", "bbbbbbbbbbbbbbbb", "dddddddddddddddd", "eeeeeeeeeeeeeeee", "ffffffffffffffff"]) { const r = await kirimUji(C, {...dasar, foto_id: id}, IPH); assert.equal(r.s, 400, id); galat.add(r.j.galat); }
  assert.deepEqual([...galat], ["foto_id tidak valid untuk lokasi ini"], "bukan oracle");
  const r = await kirimUji(C, {...dasar, foto_id: "aaaaaaaaaaaaaaaa"}, IPH); assert.equal(r.s, 201, r.t);
  assert.equal((await U.DB.prepare("SELECT foto_id f FROM uji_banjir WHERE id = ?").bind(r.j.id).first()).f, "aaaaaaaaaaaaaaaa");
});

uji("uji banjir: CHECK skema menolak kontrol non-Aman, kontrol bermedan genangan, genangan tanpa tinggi", async () => {
  const sisip = (o) => U.DB.prepare(`INSERT INTO uji_banjir (id, akun_id, sampel, prov, kab, kec, hari_status, status_peta, lat, lon, tinggi_cm, luas_ha, lama_jam, waktu, dibuat) VALUES (?, ?, ?, '62', 'Kab Uji', 'Kec Uji', '2026-10-22', ?, -2, 114, ?, NULL, ?, 1, 1)`)
    .bind(randomBytes(8).toString("hex"), C.id, o.sampel, o.st, o.tinggi ?? null, o.lama ?? null).run();
  await sisip({sampel: "kontrol", st: 0});   // bentuk sah
  await assert.rejects(sisip({sampel: "kontrol", st: 2}), /CHECK/i); await assert.rejects(sisip({sampel: "kontrol", st: 0, tinggi: 10, lama: 1}), /CHECK/i);
  await assert.rejects(sisip({sampel: "genangan", st: 1}), /CHECK/i); await sisip({sampel: "genangan", st: 1, tinggi: 5, lama: 0});
});

uji("uji banjir: status banjir hilang atau basi = 503/400 sopan, bukan label tanpa dasar; batas laju 60 per jam per akun", async () => {
  K.status = null; const r = await kirimUji(C, dasar); assert.equal(r.s, 503, r.t);
  K.status = stat(wib(Date.now() - 6 * HARI), {[KECAMATAN]: 2}); assert.equal((await kirimUji(C, dasar)).s, 503);
  K.status = stat(ujiHari, {[KECAMATAN]: 2});
  await U.DB.prepare("DELETE FROM laju_bnpb WHERE aksi = 'uji.banjir'").run();
  const D = await akun("pemkablaju");
  await U.DB.batch(Array.from({length: 60}, () => U.DB.prepare("INSERT INTO laju_bnpb (kunci, aksi, waktu) VALUES (?, 'uji.banjir', ?)").bind("ujib:" + D.id, Date.now())));
  assert.equal((await kirimUji(D, dasar)).s, 429); assert.equal((await kirimUji(C, dasar)).s, 201, "batas per akun, bukan global");
});

uji("uji banjir agregat: tanpa login 403; sel kecil ditahan; angka muncul sesudah 5 sampel; tanpa koordinat, akun, atau kecamatan", async () => {
  assert.equal((await U.api("GET", "/api/uji-lapangan/banjir")).s, 403);
  await U.DB.prepare("DELETE FROM uji_banjir").run();
  let r = await U.adm("GET", "/api/uji-lapangan/banjir"); assert.equal(r.s, 200, r.t);
  assert.equal(r.j.genangan.n, null); assert.equal(r.j.genangan.ditahan, true); assert.equal(r.j.kontrol.n, null);
  for (let i = 0; i < 5; i++) assert.equal((await kirimUji(C, {...dasar, tinggi_cm: 10 * (i + 1)})).s, 201);
  K.status = stat(ujiHari, {[KECAMATAN]: 0});
  for (let i = 0; i < 2; i++) assert.equal((await kirimUji(C, {...dasar, tinggi_cm: 20})).s, 201);
  for (let i = 0; i < 5; i++) assert.equal((await kirimUji(C, {sampel: "kontrol", kec: KECAMATAN, lat: -2.7, lon: 114.2})).s, 201);
  r = await U.adm("GET", "/api/uji-lapangan/banjir"); assert.equal(r.s, 200, r.t);
  assert.equal(r.j.genangan.n, 7); assert.equal(r.j.kontrol.n, 5); assert.equal(r.j.genangan.tinggi_median_cm, 20);
  assert.deepEqual(r.j.genangan.per_status.map(x => x.status), ["Aman", "Waspada", "Siaga", "Awas"]);
  assert.deepEqual(r.j.genangan.per_status.map(x => x.n), [null, null, null, null], "Aman 2 (<5) menahan semua");
  assert.ok(!/lat|lon|akun|Kahayan|Pulang|114\.|-2\.7|[0-9a-f]{16}/.test(r.t), "tanpa koordinat, akun, atau wilayah: " + r.t);
});

/* ================================================================ 4. formulir petugas di /uji-lapangan (public/instansi_uji.html + instansi_uji.js) */
const muatKlien = () => {
  const ctx = {window: {}, document: {readyState: "complete", addEventListener() {}, getElementById() { return null; }}, navigator: {}, FormData, Blob}; vm.createContext(ctx);
  vm.runInContext(readFileSync(path.join(AKAR, "public/instansi_uji.js"), "utf8"), ctx, {filename: "instansi_uji.js"});
  return ctx.window.UjiBanjir;
};
/* fetch klien -> worker sungguhan dengan cookie sesi akun; catat jalur yang dipanggil */
const jembatan = (akunSesi, catat) => async (url, o = {}) => {
  catat.push(`${o.method || "GET"} ${url}`);
  const r = await U.api(o.method || "GET", url, typeof o.body === "string" ? JSON.parse(o.body) : undefined, {...(o.headers || {}), ...akunSesi.h});
  return {status: r.s, json: async () => r.j};
};
uji("formulir uji banjir: halaman /uji-lapangan memuat formulir dan skrip; semua medan yang dibaca skrip ada di HTML; tanpa handler inline, titik tengah, atau em dash", async () => {
  const r = await U.adm("GET", "/uji-lapangan"); assert.equal(r.s, 200);
  for (const m of ['id="ujbForm"', 'name="sampel"', 'name="kec"', 'id="ujbLokasi"', 'name="tinggi"', 'name="lama"', 'name="luas"', 'name="foto"', 'name="setuju"', 'Foto dan lokasinya boleh tayang publik', 'id="ujbKirim"', 'id="ujbStatus"', 'id="ujbLokasiInfo"', 'src="/instansi_uji.js"']) assert.ok(r.t.includes(m), m);
  const bagian = r.t.slice(r.t.indexOf('id="ujbForm"'), r.t.indexOf('id="jujur"'));
  assert.doesNotMatch(bagian, /\bon[a-z]+="|·|—/i); assert.match(bagian, /<svg/);
  for (const f of ["public/instansi_uji.js", "public/instansi_uji.html"]) assert.ok(!/ · |—/.test(readFileSync(path.join(AKAR, f), "utf8")), f);
});
uji("formulir uji banjir: GET /api/instansi/uji-banjir/kec hanya kecamatan di wilayah akun beserta status; tanpa sesi 401", async () => {
  K.status = stat(ujiHari, {[KECAMATAN]: 3, [PP + "Maliku"]: 0, [LAIN]: 2});
  assert.equal((await U.api("GET", "/api/instansi/uji-banjir/kec")).s, 401);
  const r = await U.api("GET", "/api/instansi/uji-banjir/kec", undefined, C.h); assert.equal(r.s, 200, r.t);
  assert.deepEqual(r.j.kecamatan.map(x => [x.nama, x.kab, x.status]), [["Kahayan Hilir", "Pulang Pisau", "Awas"], ["Maliku", "Pulang Pisau", "Aman"]]);
  assert.ok(!/lat|lon|Selat/.test(r.t));
  K.status = null; assert.equal((await U.api("GET", "/api/instansi/uji-banjir/kec", undefined, C.h)).s, 503);
});
uji("formulir uji banjir: skrip klien memanggil route yang benar dan data tersimpan di D1; kesalahan input dicegat sebelum jaringan", async () => {
  K.status = stat(ujiHari, {[KECAMATAN]: 2, [PP + "Maliku"]: 0}); const UB = muatKlien(), jalur = [], ambil = jembatan(C, jalur);
  const k = await UB.kecamatan(ambil); assert.equal(k.s, 200); assert.equal(k.j.kecamatan.length, 2);
  const sebelum = await U.n("uji_banjir");
  const g = await UB.kirim({sampel: "genangan", kec: KECAMATAN, lat: -2.74, lon: 114.25, tinggi: "35", lama: "4", luas: "", fotoId: null}, ambil); assert.equal(g.s, 201, JSON.stringify(g));
  const c = await UB.kirim({sampel: "kontrol", kec: PP + "Maliku", lat: -2.8, lon: 114.3, tinggi: "99"}, ambil); assert.equal(c.s, 201, JSON.stringify(c));
  assert.deepEqual(jalur, ["GET /api/instansi/uji-banjir/kec", "POST /api/instansi/uji-banjir", "POST /api/instansi/uji-banjir"]);
  assert.equal(await U.n("uji_banjir"), sebelum + 2);
  const d = await U.DB.prepare("SELECT sampel, tinggi_cm, lama_jam, luas_ha FROM uji_banjir WHERE id = ?").bind(c.j.id).first(); assert.deepEqual({...d}, {sampel: "kontrol", tinggi_cm: null, lama_jam: null, luas_ha: null}, "kontrol tidak membawa medan genangan");
  for (const n of [{sampel: "x"}, {sampel: "genangan"}, {sampel: "genangan", kec: KECAMATAN}, {sampel: "genangan", kec: KECAMATAN, lat: 1, lon: 1, tinggi: "0", lama: "1"}, {sampel: "genangan", kec: KECAMATAN, lat: 1, lon: 1, tinggi: "5", lama: "-1"}])
    await assert.rejects(UB.kirim(n, ambil), /./);
  assert.equal(jalur.length, 3, "tidak ada panggilan jaringan untuk input salah");
});
uji("formulir uji banjir: foto diunggah lewat POST /api/foto (bencana banjir, kategori genangan, GPS) dan id-nya ikut ke POST uji-banjir", async () => {
  const UB = muatKlien(), panggilan = [];
  const r = await UB.foto(new Blob(["x"]), {lat: -2.74012, lon: 114.25049, akurasi: 12, waktu: 5}, true, {kompres: async (b, sisi) => new Blob([String(sisi)]), ambil: async (url, o) => { panggilan.push([url, o.method, Object.fromEntries([...o.body.entries()].map(([k, v]) => [k, typeof v === "string" ? v : "berkas"]))]); return {status: 201, json: async () => ({id: "aaaaaaaaaaaaaaaa"})}; }});
  assert.equal(r.s, 201); assert.equal(r.j.id, "aaaaaaaaaaaaaaaa");
  assert.deepEqual(panggilan, [["/api/foto", "POST", {bencana: "banjir", kategori: "genangan", setuju: "1", lat: "-2.7401", lon: "114.2505", akurasi: "12", waktu_gps: "5", media: "berkas", thumb: "berkas"}]]);
  await assert.rejects(UB.foto(new Blob(["x"]), {lat: 1, lon: 1, akurasi: 1, waktu: 1}, false, {ambil: async () => { throw new Error("tidak boleh dipanggil"); }, kompres: async () => new Blob(["x"])}), /persetujuan/);
  await assert.rejects(UB.foto(new Blob(["x"]), {lat: 1, lon: 1, akurasi: 1, waktu: 1}, undefined, {ambil: async () => { throw new Error("tidak boleh dipanggil"); }, kompres: async () => new Blob(["x"])}), /persetujuan/);
  assert.equal(UB.badan({sampel: "genangan", kec: KECAMATAN, lat: 1, lon: 1, tinggi: "5", lama: "1", fotoId: "aaaaaaaaaaaaaaaa"}).foto_id, "aaaaaaaaaaaaaaaa");
});

uji("uji banjir agregat: satu sel per status < 5 menahan SEMUA sel per status; total tetap tampil bila >= 5", async () => {
  await U.DB.prepare("DELETE FROM uji_banjir").run(); K.status = stat(ujiHari, {[KECAMATAN]: 2, [PP + "Maliku"]: 0});
  for (let i = 0; i < 5; i++) assert.equal((await kirimUji(C, {...dasar})).s, 201);
  for (let i = 0; i < 2; i++) assert.equal((await kirimUji(C, {...dasar, kec: PP + "Maliku"})).s, 201);
  const r = await U.adm("GET", "/api/uji-lapangan/banjir");
  assert.equal(r.j.genangan.n, 7); assert.ok(r.j.genangan.per_status.every(x => x.n === null), "Aman 2 menahan Siaga 5 juga");
  for (let i = 0; i < 3; i++) await kirimUji(C, {...dasar, kec: PP + "Maliku"});
  assert.deepEqual((await U.adm("GET", "/api/uji-lapangan/banjir")).j.genangan.per_status.map(x => x.n), [5, 0, 5, 0]);
});

uji("uji banjir retensi: bersihkanUjiBanjir menghapus baris > 12 bulan saja; cron jam menit 17 memanggilnya", async () => {
  const {bersihkanUjiBanjir} = await import("../../src/uji_banjir.js"), kini = Date.now(), n0 = await U.n("uji_banjir");
  const lama = id => U.DB.prepare("INSERT INTO uji_banjir (id, akun_id, sampel, prov, kab, kec, hari_status, status_peta, lat, lon, tinggi_cm, lama_jam, waktu, dibuat) SELECT ?, ?, 'genangan', '62', 'Kab Uji', 'Kec Uji', '2025-01-01', 1, -2, 114, 5, 1, ?, ? ").bind(id, C.id, kini - 366 * HARI, kini - 366 * HARI).run();
  await lama("1111111111111111"); await lama("2222222222222222");
  assert.equal(await bersihkanUjiBanjir({DB: U.DB}, kini), 2); assert.equal(await U.n("uji_banjir"), n0);
  await lama("3333333333333333"); await jalankan(Date.UTC(2026, 9, 28, 5, 17));   // cron * * * * * menit 17
  assert.equal(await U.n("uji_banjir", "id = '3333333333333333'"), 0, "terhapus lewat cron");
  assert.match(readFileSync(path.join(AKAR, "src/worker.js"), "utf8"), /bersihkanUjiBanjir\(env/);
});
