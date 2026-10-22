/* Perbaikan audit keamanan Worker, dijalankan di workerd (Miniflare) dengan D1 dan R2 lokal sungguhan, migrasi apa adanya. Tanpa mock.
   Mencakup: unggah foto (411 + pembersihan metadata), body berbatas (jejak, pesan), batas gagal masuk per email, CSRF berbasis cookie sesi_admin,
   filter ?bahaya=, cron bersih-bersih yang tahan gagal satu langkah, kode sah lolos penghitung gagal.
   Jalankan: node --test tests/warga/audit-keamanan-worker.test.mjs */
import {test, before, after} from "node:test";
import assert from "node:assert/strict";
import {readFileSync, existsSync} from "node:fs";
import path from "node:path";
import {Miniflare} from "miniflare";
import {AKAR, migrasi, pecah, JPEG_SAH, WEBP_SAH, badanPanjang} from "./_bantu.mjs";

const JAM = 3600e3, UA = "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36";
const SANDI = "sandi uji:7#&", AKUN = `admin@contoh.id:${SANDI}`;
const aset = async req => {
  const p = decodeURIComponent(new URL(req.url).pathname), f = path.join(AKAR, "public", p.endsWith("/") ? p + "index.html" : p);
  return existsSync(f) && f.startsWith(path.join(AKAR, "public")) ? new Response(readFileSync(f)) : new Response("tidak ada", {status: 404});
};
let mf, DB, R2;
before(async () => {
  mf = new Miniflare({modules: true, scriptPath: path.join(AKAR, "src/worker.js"), modulesRoot: AKAR, modulesRules: [{type: "ESModule", include: ["**/*.js"]}], compatibilityDate: "2024-09-23",
    d1Databases: {DB: "uji-audit"}, r2Buckets: {MEDIA: "media-audit"},
    bindings: {IP_SALT: "garam-uji", ADMIN_TOKEN: `rahasia-admin, ${AKUN}`, SESI_KUNCI: "kunci-sesi-uji-0123456789"}, serviceBindings: {ASSETS: aset}, cache: false});
  DB = await mf.getD1Database("DB"); R2 = await mf.getR2Bucket("MEDIA");
  await DB.batch(pecah(migrasi()).map(s => DB.prepare(s)));
});
after(() => mf?.dispose());
let n = 0; const ipBaru = () => `10.55.${Math.floor(++n / 250)}.${n % 250}`;
const kirim = async (metode, jalur, {body, h = {}, ip = ipBaru()} = {}) => {
  const r = await mf.dispatchFetch("http://warga.lokal" + jalur, {method: metode, redirect: "manual", headers: {"cf-connecting-ip": ip, "user-agent": UA, ...h}, body});
  const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch (e) {}
  return {s: r.status, j, t, h: r.headers};
};
const alir = (potong, jumlah) => new ReadableStream({start(c) { const e = new TextEncoder(); for (let i = 0; i < jumlah; i++) c.enqueue(e.encode(potong)); c.close(); }});   // body chunked: tanpa Content-Length

/* ---------------- 1. foto ---------------- */
const sampel = (t = Date.now()) => JSON.stringify([[-2.21002, 113.91999, 18, t - 2000], [-2.20999, 113.92002, 16, t - 1000], [-2.21, 113.92, 15, t]]);
const formFoto = (media, thumb = WEBP_SAH) => {
  const f = new FormData(), t = Date.now();
  for (const [k, v] of Object.entries({kategori: "api", lat: "-2.2100", lon: "113.9200", akurasi: "15", waktu_gps: String(t), setuju: "1", keterangan: "uji", sampel: sampel(t)})) f.append(k, v);
  f.append("media", new File([media], "a.bin")); f.append("thumb", new File([thumb], "t.bin")); return f;
};
const unggah = async (f, ekstra = {}) => { const b = await badanPanjang(f, {"cf-connecting-ip": ipBaru(), "user-agent": UA, ...ekstra});
  const r = await mf.dispatchFetch("http://warga.lokal/api/foto", {method: "POST", ...b, cf: {country: "ID"}}); return {s: r.status, j: await r.json().catch(() => null)}; };

test("foto: tanpa Content-Length (chunked) 411 sebelum formData(); sah tetap 201", async () => {
  const r = await mf.dispatchFetch("http://warga.lokal/api/foto", {method: "POST", headers: {"content-type": "multipart/form-data; boundary=x", "cf-connecting-ip": ipBaru(), "user-agent": UA},
    body: alir("--x\r\n", 1000), duplex: "half"});
  assert.equal(r.status, 411, await r.text());
  assert.equal((await unggah(formFoto(JPEG_SAH))).s, 201);
});

test("foto: EXIF/komentar dibuang dari berkas dan thumbnail di R2; struktur rusak 400 dan tidak ada yang tersimpan", async () => {
  const exif = [0xff, 0xe1, 0, 12, 69, 120, 105, 102, 0, 0, 71, 80, 83, 0], kom = [0xff, 0xfe, 0, 8, 1, 2, 3, 4, 5, 6];   // APP1 Exif + COM
  const kotor = new Uint8Array([...JPEG_SAH.slice(0, 2), ...exif, ...kom, ...JPEG_SAH.slice(2)]);
  const r = await unggah(formFoto(kotor, kotor)); assert.equal(r.s, 201, JSON.stringify(r.j));
  for (const k of [`foto/${r.j.id}`, `foto/${r.j.id}_t`]) {
    const b = new Uint8Array(await (await R2.get(k)).arrayBuffer());
    assert.equal(b.length, JPEG_SAH.length, k + ": segmen asing dibuang"); assert.ok(!new TextDecoder("latin1").decode(b).includes("Exif"), k + " masih membawa Exif");
  }
  assert.equal((await DB.prepare("SELECT ukuran FROM foto WHERE id = ?").bind(r.j.id).first()).ukuran, JPEG_SAH.length, "ukuran = berkas yang disimpan");
  const sebelum = (await R2.list()).objects.length;
  const rusak = await unggah(formFoto(new Uint8Array([0xff, 0xd8, 0xff, 0xe0, ...Array(2000).fill(7)]))); assert.equal(rusak.s, 400); assert.match(rusak.j.galat, /struktur/);
  const thumbRusak = await unggah(formFoto(JPEG_SAH, new Uint8Array([..."RIFF"].map(c => c.charCodeAt(0)), 0, 0, 0, 0, ..."WEBPVP8 ".split("").map(c => c.charCodeAt(0)), 1, 1))); assert.equal(thumbRusak.s, 400); assert.match(thumbRusak.j.galat, /thumbnail/);
  assert.equal((await R2.list()).objects.length, sebelum, "tolakan tidak meninggalkan berkas di R2");
});

/* ---------------- 2. body berbatas ---------------- */
test("jejak dan pesan: body chunked besar ditolak 413 (dibaca bertahap), bukan ditampung penuh", async () => {
  for (const [jalur, h, jml] of [["/api/jejak", {}, 60], ["/api/pesan", {}, 100]]) {   // di atas batas baca (4x), di bawah batas buang (8x): sambungan tidak putus
    const r = await mf.dispatchFetch("http://warga.lokal" + jalur, {method: "POST", headers: {"content-type": "application/json", "cf-connecting-ip": ipBaru(), "user-agent": UA, ...h}, body: alir("x".repeat(1024), jml), duplex: "half"});
    assert.equal(r.status, 413, jalur + " " + await r.text());
  }
  const ok = await kirim("POST", "/api/jejak", {body: JSON.stringify({v: "uji0000000000001", h: "karhutla"}), h: {"content-type": "application/json"}}); assert.equal(ok.s, 204, ok.t);
});

/* ---------------- 3. batas gagal masuk per email ---------------- */
test("masuk admin: 20 kegagalan per email per jam (IP berbeda-beda) mengunci akun itu, email lain tidak terganggu", async () => {
  const masuk = (email, sandi, ip = ipBaru()) => kirim("POST", "/admin/masuk", {body: `email=${encodeURIComponent(email)}&sandi=${encodeURIComponent(sandi)}`, ip, h: {"content-type": "application/x-www-form-urlencoded"}});
  for (let i = 0; i < 20; i++) assert.equal((await masuk("admin@contoh.id", "salah" + i)).s, 401, "percobaan " + i);
  const kunci = await masuk("admin@contoh.id", SANDI); assert.equal(kunci.s, 429, "IP baru, sandi benar, tetap terkunci: " + kunci.t); assert.ok(kunci.h.get("retry-after"));
  assert.equal((await masuk("lain@contoh.id", "salah")).s, 401, "email lain tidak terkunci");
  const baris = (await DB.prepare("SELECT kunci FROM laju_posko WHERE aksi = 'admin_gagal'").all()).results;
  assert.ok(!baris.some(x => x.kunci.includes("@")), "email mentah tidak tersimpan");
});

/* ---------------- 4. CSRF ---------------- */
test("CSRF: POST bercookie sesi_admin wajib Origin sama-situs (kosong dan \"null\" ditolak); tanpa cookie perilaku lama", async () => {
  const kue = {cookie: "sesi_admin=1.abc.def"}, j = {"content-type": "application/json"};
  for (const jalur of ["/api/pesan", "/api/warga"]) {   // rute() dan blok /api/warga lama
    assert.equal((await kirim("POST", jalur, {body: "{}", h: {...j, ...kue}})).s, 403, jalur + " tanpa Origin");
    assert.equal((await kirim("POST", jalur, {body: "{}", h: {...j, ...kue, origin: "null"}})).s, 403, jalur + " Origin null");
    assert.equal((await kirim("POST", jalur, {body: "{}", h: {...j, ...kue, origin: "https://jahat.example"}})).s, 403, jalur + " origin lain");
    const sama = await kirim("POST", jalur, {body: "{}", h: {...j, ...kue, origin: "http://warga.lokal"}}); assert.equal(sama.s, 400, jalur + " origin sama lolos ke validasi: " + sama.t);
    const polos = await kirim("POST", jalur, {body: "{}", h: j}); assert.equal(polos.s, 400, jalur + " tanpa cookie, tanpa Origin: perilaku lama");
  }
});

/* ---------------- 5. ?bahaya= ---------------- */
test("GET /api/warga?bahaya= benar-benar menyaring", async () => {
  const buat = (bahaya, jenis, sub, lat) => kirim("POST", "/api/warga", {body: JSON.stringify({bahaya, jenis, sub, lat, lon: 110.5}), h: {"content-type": "application/json"}});
  assert.equal((await buat("gunungapi", "abu", "tebal", -7.1)).s, 201); assert.equal((await buat("kekeringan", "antre_air", "antre", -6.1)).s, 201);
  const d = await kirim("GET", "/api/warga?bahaya=gunungapi"); assert.equal(d.s, 200);
  assert.ok(d.j.features.length >= 1 && d.j.features.every(f => f.properties.bahaya === "gunungapi"), "hanya bahaya gunungapi: " + d.j.features.map(f => f.properties.bahaya));
  assert.ok((await kirim("GET", "/api/warga")).j.features.some(f => f.properties.bahaya === "kekeringan"), "tanpa filter, bahaya lain tetap ada");
});

/* ---------------- 7. kode sah lolos penghitung gagal ---------------- */
test("kode regu: sah lolos walau IP sudah >= 300 tebakan salah; tebakan salah berikutnya 429", async () => {
  const ip = "198.51.100.77", kunci = (await import("node:crypto")).createHash("sha256").update("garam-uji|" + ip).digest("hex");
  const buat = await kirim("POST", "/api/posko/regu", {body: JSON.stringify({nama: "Regu Audit", unsur: "MPA", prov: "62", kab: "Kapuas"}), h: {"content-type": "application/json", "x-admin-token": "rahasia-admin", origin: "http://warga.lokal"}});
  assert.ok(buat.s === 201 && buat.j?.kode, "regu dibuat: " + buat.t);
  const kini = Date.now();
  await DB.batch(Array.from({length: 300}, (_, i) => DB.prepare("INSERT INTO laju_posko (kunci, aksi, waktu) VALUES (?, 'kode_gagal', ?)").bind(kunci, kini - i)));
  const sah = await kirim("GET", "/api/lapangan/saya", {ip, h: {"x-kode-regu": buat.j.kode}}); assert.notEqual(sah.s, 429, "kode sah tidak ikut terkunci: " + sah.t); assert.notEqual(sah.s, 403, sah.t);
  assert.equal((await kirim("GET", "/api/lapangan/saya", {ip, h: {"x-kode-regu": "0".repeat(26)}})).s, 429);
});

/* ---------------- 5b. cron ---------------- */
test("cron menit 17: satu langkah gagal (bersihkan) tidak menghentikan langkah sesudahnya", async () => {
  const kini = Date.now();
  await DB.prepare("INSERT INTO laju_bnpb (kunci, aksi, waktu) VALUES ('kunci-tua-audit', 'uji.tua', ?)").bind(kini - 3 * 24 * JAM).run();
  await DB.exec("DROP TABLE jejak");   // bersihkan() menjalankan DELETE FROM jejak: kini melempar
  const t = new Date(kini); t.setUTCMinutes(17, 0, 0);
  await (await mf.getWorker()).scheduled({cron: "* * * * *", scheduledTime: t.getTime()});
  assert.equal((await DB.prepare("SELECT count(*) n FROM laju_bnpb WHERE kunci = 'kunci-tua-audit'").first()).n, 0, "retensi laju_bnpb tetap jalan walau bersihkan() gagal");
});
