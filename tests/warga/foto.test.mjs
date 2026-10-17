/* Foto lapangan: src/worker.js + src/foto.js di workerd (Miniflare) dengan D1 dan R2 lokal sungguhan, migrasi apa adanya.
   Tidak ada mock DB/R2. Jalankan: node --test tests/warga/foto.test.mjs */
import {test, before, after} from "node:test";
import assert from "node:assert/strict";
import {readFileSync, existsSync} from "node:fs";
import path from "node:path";
import {Miniflare} from "miniflare";
import {AKAR, migrasi, pecah} from "./_bantu.mjs";

const JAM = 3600e3, ADMIN = {"x-admin-token": "rahasia-admin"};
const aset = async req => {
  const p = decodeURIComponent(new URL(req.url).pathname), f = path.join(AKAR, "public", p.endsWith("/") ? p + "index.html" : p);
  return existsSync(f) && f.startsWith(path.join(AKAR, "public")) ? new Response(readFileSync(f), {headers: {"content-type": p.endsWith(".html") ? "text/html; charset=utf-8" : "application/octet-stream"}}) : new Response("tidak ada", {status: 404});
};
const opsi = (ikat = {}, r2 = true) => ({modules: true, scriptPath: path.join(AKAR, "src/worker.js"), modulesRoot: AKAR, modulesRules: [{type: "ESModule", include: ["**/*.js"]}],
  compatibilityDate: "2024-09-23", d1Databases: {DB: "uji-foto"}, ...(r2 ? {r2Buckets: {MEDIA: "media-uji"}} : {}),
  bindings: {IP_SALT: "garam-uji", ADMIN_TOKEN: "rahasia-admin", ...ikat}, serviceBindings: {ASSETS: aset}, cache: false});

let mf, DB, R2;
before(async () => {
  mf = new Miniflare(opsi()); DB = await mf.getD1Database("DB"); R2 = await mf.getR2Bucket("MEDIA");
  await DB.batch(pecah(migrasi()).map(s => DB.prepare(s)));
});
after(() => mf?.dispose());
let rusak = null;
const uji = (nama, fn) => test(nama, async () => {
  if (rusak) throw new Error(`tidak dijalankan: "${rusak}" gagal lebih dulu`);
  try { await fn(); } catch (e) { rusak = nama; throw e; }
});

/* berkas uji: hanya byte awal yang menentukan jenisnya */
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, ...Array(2000).fill(7)]);
const WEBP = new Uint8Array([..."RIFF"].map(c => c.charCodeAt(0)).concat([0, 0, 0, 0], [..."WEBPVP8 "].map(c => c.charCodeAt(0)), Array(500).fill(1)));
function mp4(detik) {   // ftyp + mvhd versi 0, skala 1000
  const b = new Uint8Array(200), v = new DataView(b.buffer), tulis = (i, s) => [...s].forEach((c, k) => b[i + k] = c.charCodeAt(0));
  v.setUint32(0, 24); tulis(4, "ftypisom"); v.setUint32(24, 120); tulis(28, "moov"); v.setUint32(32, 108); tulis(36, "mvhd");
  v.setUint32(40 + 12, 1000); v.setUint32(40 + 16, Math.round(detik * 1000)); return b;
}
let n = 0; const ipBaru = () => `10.7.${Math.floor(++n / 250)}.${n % 250}`;
const kini = () => Date.now();
/* lokasi sah: Palangka Raya (darat, Kalteng) */
/* tiga bacaan GPS bergetar sedikit, yang terakhir = titik kiriman (seperti GPS asli) */
const sampel = (lat = -2.21, lon = 113.92, t = kini()) => JSON.stringify([[lat + 2e-5, lon - 1e-5, 18, t - 2000], [lat - 1e-5, lon + 2e-5, 16, t - 1000], [lat, lon, 15, t]]);
const SAH = () => ({kategori: "api", lat: "-2.2100", lon: "113.9200", akurasi: "15", waktu_gps: String(kini()), setuju: "1", keterangan: "Api di belakang kebun", sampel: sampel()});
async function unggah(isian = {}, berkas = {}, ip = ipBaru(), cf = {country: "ID"}) {
  const f = new FormData();
  for (const [k, v] of Object.entries({...SAH(), ...isian})) if (v != null) f.append(k, v);
  if (berkas.media !== null) f.append("media", new File([berkas.media || JPEG], "a.bin"));
  if (berkas.thumb !== null) f.append("thumb", new File([berkas.thumb || WEBP], "t.bin"));
  const r = await mf.dispatchFetch("http://warga.lokal/api/foto", {method: "POST", body: f, headers: {"cf-connecting-ip": ip}, cf});
  return {s: r.status, j: await r.json()};
}
const panggil = async (metode, jalur, body, ip = "10.8.8.8", h = {}) => {
  const r = await mf.dispatchFetch("http://warga.lokal" + jalur, {method: metode, headers: {"cf-connecting-ip": ip, "content-type": "application/json", ...h}, body: body && JSON.stringify(body)});
  const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch (e) {}
  return {s: r.status, j, t, h: r.headers};
};
const setujui = id => panggil("POST", "/api/foto/admin/" + id, {aksi: "setujui"}, "10.8.8.8", ADMIN);
const jumlahFoto = async () => (await DB.prepare("SELECT count(*) n FROM foto").first()).n;

uji("foto: unggah sah masuk antrean dengan wilayah dari koordinat, tidak tampil publik sebelum disetujui", async () => {
  const r = await unggah({nama: "Rina", tampil_nama: "1", email: "rina@contoh.id"});
  assert.equal(r.s, 201, JSON.stringify(r.j));
  assert.equal(r.j.status, "menunggu");
  assert.equal(r.j.wilayah.prov, "62", `wilayah dihitung Worker: ${JSON.stringify(r.j.wilayah)}`);
  assert.ok(r.j.wilayah.kab && r.j.wilayah.kec);
  assert.ok(await R2.head(`foto/${r.j.id}`) && await R2.head(`foto/${r.j.id}_t`), "media dan thumbnail tersimpan di R2");
  const d = await panggil("GET", "/api/foto");
  assert.equal(d.j.foto.length, 0, "belum disetujui = tidak ada di daftar publik");
  assert.equal((await panggil("GET", "/api/foto/" + r.j.id)).s, 404);
  assert.equal((await panggil("GET", "/api/foto/media/" + r.j.id)).s, 404, "media antrean tidak bisa dibuka publik");
  assert.equal((await panggil("GET", "/api/foto/media/" + r.j.id, null, "1.1.1.1", ADMIN)).s, 200, "admin bisa melihat media antrean");
});

uji("foto: masukan salah DITOLAK dan tidak menulis apa pun", async () => {
  const awal = await jumlahFoto(), t = kini();
  const kasus = [
    [{lat: null}, {}, 400, "GPS"], [{akurasi: "2500"}, {}, 400, "akurasi"], [{waktu_gps: String(t - 30 * 60e3)}, {}, 400, "sudah lama"],
    [{lat: "-5.5", lon: "108.0"}, {}, 400, "daratan"], [{kategori: "bebas"}, {}, 400, "kategori"], [{setuju: null}, {}, 400, "persetujuan"],
    [{exif_lat: "-2.6", exif_lon: "113.92"}, {}, 400, "km dari posisi"], [{exif_waktu: String(t - 72 * JAM)}, {}, 400, "48 jam"],
    [{email: "bukan-email"}, {}, 400, "email"], [{tampil_nama: "1"}, {}, 201, ""],   // tampil tanpa nama = diabaikan, bukan galat
    [{}, {media: new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])}, 400, "bukan foto"], [{}, {media: null}, 400, "wajib"], [{}, {thumb: null}, 400, "thumbnail"],
    [{}, {thumb: JPEG.slice(3, 40)}, 400, "thumbnail"], [{}, {media: mp4(75)}, 400, "maksimal 60 detik"],
    [{}, {media: (() => { const b = new Uint8Array(3.2 * 1048576 | 0); b.set([0xff, 0xd8, 0xff]); return b; })()}, 413, "maksimal 3 MB"],
    [{keterangan: "x".repeat(300)}, {}, 400, "maksimal 280"], [{keterangan: "dasar goblok"}, {}, 400, "kasar"],
  ];
  let sah = 0;
  for (const [isian, berkas, s, pesan] of kasus) {
    const r = await unggah(isian, berkas);
    assert.equal(r.s, s, `kasus ${kasus.findIndex(k => k[0] === isian)} ${JSON.stringify(isian).slice(0, 80)}: ${JSON.stringify(r.j)}`);
    if (s === 201) { sah++; const x = await DB.prepare("SELECT tampil_nama FROM foto WHERE id = ?").bind(r.j.id).first(); assert.equal(x.tampil_nama, 0); }
    else assert.match(r.j.galat, new RegExp(pesan), `pesan galat menyebut sebabnya: ${r.j.galat}`);
  }
  assert.equal(await jumlahFoto(), awal + sah, "kiriman yang ditolak tidak menulis baris");
});

uji("foto: video 45 detik sah (durasi dari mvhd), GPS EXIF dekat dicatat jaraknya", async () => {
  const v = await unggah({kategori: "asap", kamera: "1"}, {media: mp4(45)});
  assert.equal(v.s, 201, JSON.stringify(v.j));
  const x = await DB.prepare("SELECT jenis, mime, durasi, kamera FROM foto WHERE id = ?").bind(v.j.id).first();
  assert.deepEqual({...x}, {jenis: "video", mime: "video/mp4", durasi: 45, kamera: 1});
  const e = await unggah({exif_lat: "-2.2110", exif_lon: "113.9210", exif_waktu: String(kini() - 2 * JAM)});
  assert.equal(e.s, 201, JSON.stringify(e.j));
  const y = await DB.prepare("SELECT exif_jarak, exif_waktu, dibuat - diambil umur FROM foto WHERE id = ?").bind(e.j.id).first();
  assert.ok(y.exif_jarak > 100 && y.exif_jarak < 200, `jarak EXIF ${y.exif_jarak} m`);
  assert.equal(y.exif_waktu, 1); assert.ok(Math.abs(y.umur - 2 * JAM) < 60e3, "waktu diambil dari EXIF");
});

uji("foto: anti GPS palsu — tolak yang pasti janggal, tandai yang curiga untuk admin", async () => {
  const t = kini(), diam = JSON.stringify([[-2.21, 113.92, 5, t - 2000], [-2.21, 113.92, 5, t - 1000], [-2.21, 113.92, 5, t]]);
  for (const [isian, cf, pesan] of [
    [{sampel: null}, {country: "ID"}, "tidak bisa diverifikasi"],
    [{sampel: "bukan json"}, {country: "ID"}, "tidak bisa diverifikasi"],
    [{sampel: sampel(-2.3, 113.92)}, {country: "ID"}, "tidak bisa diverifikasi"],
    [{sampel: JSON.stringify([[-2.21, 113.92, 15, t], [-2.21, 113.92, 15, t - 9e3], [-2.21, 113.92, 15, t]])}, {country: "ID"}, "tidak bisa diverifikasi"],
    [{sampel: sampel(-2.21, 113.92, t - 5000)}, {country: "ID"}, "tidak bisa diverifikasi"],   // waktu sampel tak cocok waktu_gps
    [{sampel: "[" + "1,".repeat(600) + "1]"}, {country: "ID"}, "tidak bisa diverifikasi"],
    [{}, {country: "SG"}, "luar Indonesia"]]) {
    const r = await unggah(isian, {}, ipBaru(), cf);
    assert.equal(r.s, 400, `${pesan}: ${JSON.stringify(r.j)}`); assert.match(r.j.galat, new RegExp(pesan));
  }
  const curiga = async id => (await DB.prepare("SELECT gps_curiga c FROM foto WHERE id = ?").bind(id).first()).c;
  const asli = await unggah(); assert.equal(asli.s, 201); assert.equal(await curiga(asli.j.id), "", "GPS bergetar wajar = tanpa tanda");
  const d = await unggah({sampel: diam, akurasi: "5"}); assert.equal(d.s, 201, "diam sempurna tetap masuk antrean (bisa lokasi Wi-Fi)");
  assert.match(await curiga(d.j.id), /tidak bergeser/);
  const ip = ipBaru(); assert.equal((await unggah({}, {}, ip)).s, 201);
  const loncat = await unggah({lat: "-6.2000", lon: "106.8200", sampel: sampel(-6.2, 106.82)}, {}, ip);   // Palangka Raya -> Jakarta dalam detik
  assert.equal(loncat.s, 201); assert.match(await curiga(loncat.j.id), /pindah .* km/);
  const a = await panggil("GET", "/api/foto/admin?status=menunggu", null, "10.8.8.8", ADMIN);
  assert.ok(a.j.foto.find(f => f.id === d.j.id).gps_curiga, "admin melihat tanda curiga");
  const p = await panggil("GET", "/api/foto/" + d.j.id, null, "10.8.8.8", ADMIN);
  assert.equal(JSON.stringify(p.j).includes("gps_curiga"), false, "tanda curiga tidak ikut kolom publik");
});

uji("foto: batas laju 5 unggahan per jam per IP", async () => {
  const ip = ipBaru();
  for (let i = 0; i < 5; i++) assert.equal((await unggah({}, {}, ip)).s, 201);
  const r = await unggah({}, {}, ip);
  assert.equal(r.s, 429, JSON.stringify(r.j));
  assert.equal((await unggah({}, {}, ipBaru())).s, 201, "IP lain tidak terdampak");
});

uji("foto: admin setujui lalu tayang di daftar & rincian tanpa email/hash; kredit hanya bila diizinkan; media dengan Range", async () => {
  const a = await unggah({nama: "Rina", tampil_nama: "1", email: "rina@contoh.id"}), b = await unggah({nama: "Budi", tampil_nama: "0"});
  assert.equal((await setujui(a.j.id)).s, 200); assert.equal((await setujui(b.j.id)).s, 200);
  const d = await panggil("GET", "/api/foto"), fa = d.j.foto.find(x => x.id === a.j.id), fb = d.j.foto.find(x => x.id === b.j.id);
  assert.equal(fa.kredit, "Rina"); assert.equal(fb.kredit, null, "nama tidak tampil bila pengunggah tidak mengizinkan");
  assert.ok(!/rina@contoh|ip_hash|email|Budi/.test(d.t), "daftar publik tidak memuat email, hash, atau nama yang disembunyikan");
  const r = await panggil("GET", "/api/foto/" + a.j.id);
  assert.equal(r.s, 200); assert.ok(!/rina@contoh|ip_hash/.test(r.t));
  const m = await mf.dispatchFetch("http://warga.lokal/api/foto/media/" + a.j.id, {headers: {range: "bytes=0-99"}});
  assert.equal(m.status, 206); assert.equal(m.headers.get("content-range"), `bytes 0-99/${JPEG.length}`); assert.equal((await m.arrayBuffer()).byteLength, 100);
  const t = await mf.dispatchFetch("http://warga.lokal/api/foto/thumb/" + a.j.id);
  assert.equal(t.status, 200); assert.equal(t.headers.get("x-content-type-options"), "nosniff");
});

uji("foto: wilayah dari koordinat untuk layar 'kamu terdeteksi di'", async () => {
  const d = await panggil("GET", "/api/foto/lokasi?lat=-2.2&lon=113.9");
  assert.equal(d.s, 200); assert.equal(d.j.ada, true); assert.equal(d.j.prov, "62"); assert.ok(d.j.kab && d.j.kec, JSON.stringify(d.j));
  assert.equal((await panggil("GET", "/api/foto/lokasi?lat=50&lon=1")).s, 400, "di luar kotak Indonesia ditolak");
  assert.equal((await panggil("GET", "/api/foto/lokasi?lat=abc&lon=1")).s, 400, "bukan angka ditolak");
  const laut = await panggil("GET", "/api/foto/lokasi?lat=5.5&lon=132");
  assert.equal(laut.s, 200); assert.equal(laut.j.ada, false, "laut lepas: tidak ada wilayah");
});

uji("foto: dilihat bertambah tiap rincian yang tayang dibuka", async () => {
  const a = await unggah(); assert.equal((await setujui(a.j.id)).s, 200);
  for (let i = 0; i < 3; i++) assert.equal((await panggil("GET", "/api/foto/" + a.j.id)).s, 200);
  await new Promise(r => setTimeout(r, 200));
  assert.equal(await DB.prepare("SELECT dilihat FROM foto WHERE id = ?").bind(a.j.id).first("dilihat"), 3);
  const d = await panggil("GET", "/api/foto"); assert.equal(d.j.foto.find(x => x.id === a.j.id).dilihat, 3, "daftar publik membawa jumlah dilihat");
});

uji("foto: tolak butuh alasan, tidak tayang, tercatat di audit", async () => {
  const a = await unggah();
  assert.equal((await panggil("POST", "/api/foto/admin/" + a.j.id, {aksi: "tolak"}, "1.1.1.1", ADMIN)).s, 400);
  assert.equal((await panggil("POST", "/api/foto/admin/" + a.j.id, {aksi: "tolak", alasan: "bukan api"}, "1.1.1.1", ADMIN)).s, 200);
  assert.ok(!(await panggil("GET", "/api/foto")).j.foto.some(x => x.id === a.j.id));
  const au = await DB.prepare("SELECT aksi, alasan FROM audit_foto WHERE target = ? ORDER BY id DESC").bind(a.j.id).first();
  assert.deepEqual({...au}, {aksi: "tolak", alasan: "bukan api"});
});

uji("foto: suka sakelar satu per IP, komentar langsung tayang, foto antrean tidak bisa disukai/dikomentari", async () => {
  const a = await unggah(); const id = a.j.id;
  assert.equal((await panggil("POST", "/api/foto/suka/" + id)).s, 404, "belum tayang");
  assert.equal((await panggil("POST", "/api/foto/komentar/" + id, {teks: "halo"})).s, 404);
  await assert.rejects(DB.prepare("INSERT INTO foto_komentar (id, foto_id, teks, dibuat, ip_hash) VALUES ('aaaaaaaaaaaaaaaa', ?, 'x', 1, ?)").bind(id, "a".repeat(64)).run(), /belum tayang/, "trigger DB menolak komentar sebelum tayang");
  await setujui(id);
  const s1 = await panggil("POST", "/api/foto/suka/" + id, null, "10.1.1.1"), s2 = await panggil("POST", "/api/foto/suka/" + id, null, "10.1.1.2");
  assert.deepEqual([s1.j.suka, s2.j.suka, s2.j.suka_saya], [1, 2, true]);
  const s3 = await panggil("POST", "/api/foto/suka/" + id, null, "10.1.1.1");
  assert.deepEqual([s3.j.suka, s3.j.suka_saya], [1, false], "klik kedua = batal suka");
  const k = await panggil("POST", "/api/foto/komentar/" + id, {nama: "Andi", teks: "cek wa.me/628123 atau 081234567890"});
  assert.equal(k.s, 201); assert.match(k.j.teks, /\[tautan dihapus\].*\[nomor dihapus\]/);
  assert.equal((await panggil("POST", "/api/foto/komentar/" + id, {teks: "   "})).s, 400);
  const r = await panggil("GET", "/api/foto/" + id, null, "10.1.1.2");
  assert.equal(r.j.komentar, 1); assert.equal(r.j.komentar_daftar[0].nama, "Andi"); assert.equal(r.j.suka_saya, true);
});

uji("foto: 3 aduan dari 3 IP mengembalikan foto ke antrean; komentar 3 aduan disembunyikan dan hitungan turun", async () => {
  const a = await unggah(); await setujui(a.j.id);
  const k = await panggil("POST", "/api/foto/komentar/" + a.j.id, {teks: "komentar iseng"});
  assert.equal((await panggil("POST", "/api/foto/aduan/" + a.j.id, {alasan: "ngawur"})).s, 400);
  for (const ip of ["10.2.0.1", "10.2.0.2", "10.2.0.2", "10.2.0.3"]) {
    assert.equal((await panggil("POST", "/api/foto/aduan/" + k.j.id, {jenis: "komentar", alasan: "kasar"}, ip)).s, 200);
    if (ip !== "10.2.0.3") assert.equal((await panggil("POST", "/api/foto/aduan/" + a.j.id, {alasan: "tidak_relevan"}, ip)).s, 200);
  }
  let r = await panggil("GET", "/api/foto/" + a.j.id, null, "1.1.1.1", ADMIN);
  assert.equal(r.j.komentar, 0, "komentar 3 aduan tersembunyi"); assert.equal(r.j.komentar_daftar.length, 0);
  assert.equal((await DB.prepare("SELECT status, aduan FROM foto WHERE id = ?").bind(a.j.id).first()).aduan, 2, "aduan dari IP sama dihitung sekali");
  await panggil("POST", "/api/foto/aduan/" + a.j.id, {alasan: "palsu"}, "10.2.0.9");
  assert.equal((await DB.prepare("SELECT status FROM foto WHERE id = ?").bind(a.j.id).first()).status, "menunggu", "3 aduan = kembali ke antrean admin");
  assert.equal((await panggil("GET", "/api/foto/" + a.j.id)).s, 404);
  await setujui(a.j.id);
  assert.equal((await DB.prepare("SELECT status, aduan FROM foto WHERE id = ?").bind(a.j.id).first()).aduan, 0, "disetujui ulang = aduan lama dihapus");
  assert.equal((await panggil("POST", "/api/foto/admin/" + k.j.id, {aksi: "tampilkan_komentar"}, "1.1.1.1", ADMIN)).s, 200);
  r = await panggil("GET", "/api/foto/" + a.j.id); assert.equal(r.j.komentar, 1, "komentar dipulihkan admin");
});

uji("foto: admin wajib masuk untuk antrean, keputusan, dan dummy", async () => {
  for (const [m, j, b] of [["GET", "/api/foto/admin"], ["POST", "/api/foto/admin/0123456789abcdef", {aksi: "setujui"}], ["POST", "/api/foto/dummy", {aksi: "isi"}]])
    assert.equal((await panggil(m, j, b, "1.1.1.1", {"x-admin-token": "salah"})).s, 403, `${m} ${j}`);
  const r = await panggil("GET", "/api/foto/admin?status=menunggu", null, "1.1.1.1", ADMIN);
  assert.equal(r.s, 200); assert.ok(r.j.jumlah.menunggu >= 1); assert.ok(!/"ip_hash"/.test(r.t), "hash IP penuh tidak dikirim, hanya 8 karakter pengirim");
});

uji("foto: hapus admin membuang baris dan berkas R2", async () => {
  const a = await unggah();
  assert.equal((await panggil("POST", "/api/foto/admin/" + a.j.id, {aksi: "hapus"}, "1.1.1.1", ADMIN)).s, 200);
  assert.equal(await DB.prepare("SELECT 1 FROM foto WHERE id = ?").bind(a.j.id).first(), null);
  assert.equal(await R2.head(`foto/${a.j.id}`), null); assert.equal(await R2.head(`foto/${a.j.id}_t`), null);
});

uji("foto dummy: isi semua ember lewat pintunya, publik tidak melihatnya, admin ?dummy=1 melihat, hapus bersih", async () => {
  const isi = await panggil("POST", "/api/foto/dummy", {aksi: "isi"}, "1.1.1.1", ADMIN);
  assert.equal(isi.s, 201, JSON.stringify(isi.j));
  assert.equal((await panggil("POST", "/api/foto/dummy", {aksi: "isi"}, "1.1.1.1", ADMIN)).s, 409, "gerbang sudah ada");
  const akhir = (await DB.prepare("SELECT substr(id, -2) a FROM foto WHERE dummy = 1").all()).results.map(x => x.a);
  assert.equal(new Set(akhir).size, akhir.length, "tiap dummy menunjuk foto contoh yang berbeda");
  const ember = (await DB.prepare("SELECT status, count(*) n FROM foto WHERE dummy = 1 GROUP BY status").all()).results;
  assert.deepEqual(ember.map(x => x.status).sort(), ["ditolak", "menunggu", "tayang"], `tiap ember terisi: ${JSON.stringify(ember)}`);
  const kat = (await DB.prepare("SELECT count(DISTINCT kategori) n, sum(tampil_nama) t, sum(suka) s, sum(komentar) k, sum(aduan) a FROM foto WHERE dummy = 1").first());
  assert.ok(kat.n === 5 && kat.t > 0 && kat.s > 0 && kat.k > 0 && kat.a > 0, `semua fitur terisi: ${JSON.stringify(kat)}`);
  assert.ok((await DB.prepare("SELECT count(*) n FROM foto_komentar WHERE dummy = 1 AND disembunyikan = 1").first()).n > 0, "ada komentar tersembunyi");
  assert.ok(!(await panggil("GET", "/api/foto")).j.foto.some(x => x.contoh), "publik tidak melihat dummy");
  assert.ok((await panggil("GET", "/api/foto?dummy=1", null, "1.1.1.1", ADMIN)).j.foto.some(x => x.contoh), "admin melihat dummy");
  assert.ok(!(await panggil("GET", "/api/foto?dummy=1")).j.foto.some(x => x.contoh), "?dummy=1 tanpa admin diabaikan");
  const d = (await panggil("GET", "/api/foto?dummy=1", null, "1.1.1.1", ADMIN)).j.foto.find(x => x.contoh);
  const m = await mf.dispatchFetch("http://warga.lokal/api/foto/thumb/" + d.id);
  assert.equal(m.status, 200, "thumbnail dummy dari aset contoh"); await m.arrayBuffer();
  const h = await panggil("POST", "/api/foto/dummy", {aksi: "hapus"}, "1.1.1.1", ADMIN);
  assert.equal(h.j.foto, 100);
  assert.equal((await DB.prepare("SELECT count(*) n FROM foto WHERE dummy = 1").first()).n, 0);
  assert.equal((await DB.prepare("SELECT count(*) n FROM foto_komentar WHERE dummy = 1").first()).n, 0);
  assert.equal((await DB.prepare("SELECT count(*) n FROM foto_suka s LEFT JOIN foto f ON f.id = s.foto_id WHERE f.id IS NULL").first()).n, 0, "suka dummy ikut terhapus (cascade)");
});

uji("foto: pratinjau tautan /f/:id memakai keterangan & thumbnail foto", async () => {
  const a = await unggah({keterangan: "Asap pekat dekat sekolah", kategori: "asap"}); await setujui(a.j.id);
  const r = await mf.dispatchFetch("http://warga.lokal/f/" + a.j.id), t = await r.text();
  assert.equal(r.status, 200);
  assert.match(t, new RegExp(`<meta property="og:image" content="http://warga.lokal/api/foto/thumb/${a.j.id}"`));
  assert.match(t, /og:description" content="Asap pekat dekat sekolah/);
  const b = await unggah(); const t2 = await (await mf.dispatchFetch("http://warga.lokal/f/" + b.j.id)).text();
  assert.ok(!t2.includes("/api/foto/thumb/" + b.j.id), "foto antrean tidak bocor lewat pratinjau");
});

uji("foto: cron membuang foto ditolak > 30 hari beserta berkasnya", async () => {
  const a = await unggah();
  await panggil("POST", "/api/foto/admin/" + a.j.id, {aksi: "tolak", alasan: "x"}, "1.1.1.1", ADMIN);
  await DB.prepare("UPDATE foto SET dibuat = ?, diambil = ? WHERE id = ?").bind(kini() - 31 * 24 * JAM, kini() - 31 * 24 * JAM, a.j.id).run();
  await (await mf.getWorker()).scheduled({cron: "17 * * * *"});
  assert.equal(await DB.prepare("SELECT 1 FROM foto WHERE id = ?").bind(a.j.id).first(), null);
  assert.equal(await R2.head(`foto/${a.j.id}`), null);
});

uji("foto: audit hanya bisa ditambah; CHECK skema menolak video tanpa durasi dan kredit tanpa nama", async () => {
  await assert.rejects(DB.prepare("UPDATE audit_foto SET alasan = 'ubah'").run(), /tidak boleh diubah/);
  await assert.rejects(DB.prepare("DELETE FROM audit_foto").run(), /tidak boleh dihapus/);
  const dasar = "INSERT INTO foto (id, jenis, kategori, lat, lon, akurasi, diambil, dibuat, ukuran, mime, ip_hash, nama, tampil_nama, durasi) VALUES (?, ?, 'api', -2, 113, 10, 1, 1, 10, ?, ?, ?, ?, ?)";
  const h = "b".repeat(64);
  await assert.rejects(DB.prepare(dasar).bind("1111111111111111", "video", "video/mp4", h, "", 0, null).run(), /CHECK/);
  await assert.rejects(DB.prepare(dasar).bind("2222222222222222", "foto", "image/webp", h, "", 1, null).run(), /CHECK/);
  await assert.rejects(DB.prepare(dasar).bind("3333333333333333", "foto", "video/mp4", h, "", 0, null).run(), /CHECK/);
  await assert.rejects(DB.prepare(dasar).bind("4444444444444444", "video", "video/mp4", h, "", 0, 90).run(), /CHECK/);
});

uji("foto: tanpa R2 unggah dijawab 503 dan situs tetap jalan", async () => {
  const m2 = new Miniflare(opsi({}, false));
  try {
    const D2 = await m2.getD1Database("DB"); await D2.batch(pecah(migrasi()).map(s => D2.prepare(s)));
    const f = new FormData(); f.append("kategori", "api");
    const r = await m2.dispatchFetch("http://warga.lokal/api/foto", {method: "POST", body: f});
    assert.equal(r.status, 503); assert.match((await r.json()).galat, /R2/);
    const k = await (await m2.dispatchFetch("http://warga.lokal/api/foto/konfig")).json();
    assert.equal(k.media, false);
  } finally { await m2.dispose(); }
});
