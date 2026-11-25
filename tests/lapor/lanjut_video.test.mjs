/* LJ-18: video bersambung untuk objek data lanjutan (mulai, bagian, selesai), disajikan dengan Range lewat /api/lapor/data/media.
   worker.js utuh di workerd (Miniflare), D1 dan R2 sungguhan, tanpa mock. Nomor WA dan nama rekaan, bukan nomor pemilik.
   Jalan: node --test tests/lapor/lanjut_video.test.mjs */
import assert from "node:assert/strict";
import {siapkan, berantai, sha256} from "../warga/_bnpb.mjs";
import "../../src/worker.js";
import {bukaBerkas} from "../../src/lapor_lanjut.js";
import {bersihkanLapor} from "../../src/lapor_ai.js";

const uji = berantai();
const U = await siapkan("uji-lapor-video", {r2: true, ikat: {WA_MESIN: "mesin-rahasia"}}), {api, DB, n} = U;
const env = {DB}, ASAL = "http://bnpb.lokal", kini = Date.now(), XPB = {"x-pb": "1", origin: ASAL}, MESIN = {authorization: "Bearer mesin-rahasia"};
const KETUA = "6281299880001", AGT = "6281299880002", BOGOR = {provKode: "32", prov: "Jawa Barat", kabKode: "32.71", kab: "Kota Bogor", kecKode: "32.71.03", desa: "Paledang"};
const INDUK = "LA-241126-07", RUMAH = {kk: "Budi Rahasia", desa: "Paledang", kec: "Bogor Tengah", alamat: "RT 01 RW 02", tingkat: "rb", terendam: false, huni: "mengungsi", jiwa: 4};
let berkasId, kuki, kukiAgt, r2, rumah, rumahAgt, korban;
const KETUA_H = () => ({cookie: kuki, ...XPB}), AGT_H = () => ({cookie: kukiAgt, ...XPB});

/* MP4 minimal: ftyp + moov/mvhd (versi 0, skala 1000) lalu nol sampai ukuran; kotak mvhd cukup untuk durasiMP4 */
function mp4(detik, ukuran) {
  const b = new Uint8Array(ukuran), v = new DataView(b.buffer), t = (i, s) => [...s].forEach((c, k) => { b[i + k] = c.charCodeAt(0); });
  v.setUint32(0, 20); t(4, "ftyp"); t(8, "isom"); t(16, "isom");
  v.setUint32(20, 8 + 108); t(24, "moov"); v.setUint32(28, 108); t(32, "mvhd"); v.setUint32(48, 1000); v.setUint32(52, detik * 1000);
  return b;
}
const mulai = (b, h = KETUA_H()) => api("POST", "/api/lapor/data/video/mulai", b, h);
const bagian = async (id, i, byt, h = KETUA_H()) => {   // badan biner: lewat dispatchFetch langsung, bukan api() yang menyandikan teks
  const r = await U.mf.dispatchFetch(`${ASAL}/api/lapor/data/video/${id}/${i}`, {method: "PUT", body: byt, headers: {...h, "content-type": "application/octet-stream"}});
  const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch {} return {s: r.status, j, t};
};
const selesai = (id, h = KETUA_H()) => api("POST", `/api/lapor/data/video/${id}/selesai`, {}, h);
const kirimVideo = async (objek, byt, h = KETUA_H(), tipe = "video/mp4") => {   // seluruh jalur: mulai, bagian 5 MB, selesai
  const m = await mulai({objek, ukuran: byt.length, tipe}, h); if (m.s !== 200) return m;
  for (let i = 0; i < m.j.jumlah; i++) { const p = await bagian(m.j.id, i, byt.subarray(i * m.j.bagian, (i + 1) * m.j.bagian), h); if (p.s !== 200) return p; }
  return selesai(m.j.id, h);
};
const media = (id, h, rentang) => U.mf.dispatchFetch(`${ASAL}/api/lapor/data/media?id=${id}`, {headers: {...h, ...(rentang ? {range: rentang} : {})}});

uji("siapkan: berkas terbuka, ketua dan anggota, tiga objek (rumah ketua, rumah anggota, korban)", async () => {
  r2 = await U.mf.getR2Bucket("MEDIA");
  await DB.prepare("INSERT INTO lapor_izin (wa, peran, kab, oleh, dibuat) VALUES (?, 'bpbd', 'Kota Bogor', 'uji', ?)").bind(KETUA, kini).run();
  const kerja = {tingkat: "bpbd", isian: {lokasi: {nilai: {lat: -6.6, lon: 106.8, wilayah: BOGOR}}, jenis: {nilai: "banjir"}}, transkrip: []};
  await DB.batch([DB.prepare(`INSERT INTO lapor_sesi (id, wa, status, tingkat, jenis, kab, lat, lon, nomor, token_sha, terkirim, kerja, ringkas, rev, dibuat, diubah)
      VALUES (?, ?, 'terkirim', 'bpbd', 'banjir', '32.71', -6.6, 106.8, ?, ?, ?, ?, '{}', 0, ?, ?)`).bind("s" + INDUK, KETUA, INDUK, sha256(INDUK), kini, JSON.stringify(kerja), kini, kini),
    DB.prepare("INSERT INTO lapor_tiket (nomor, sesi, status, diubah) VALUES (?, ?, 'ditindaklanjuti', ?)").bind(INDUK, "s" + INDUK, kini)]);
  const r = await bukaBerkas(env, INDUK, kini, ASAL); berkasId = r.berkas;
  const t = /\?t=([0-9a-f]{32})/.exec((await DB.prepare("SELECT teks FROM lj_kabar WHERE wa = ?").bind(KETUA).first()).teks)[1];
  kuki = (await api("POST", "/api/lapor/data/masuk", {t}, XPB)).h.get("set-cookie").split(";")[0];
  assert.equal((await api("POST", "/api/lapor/data/tim", {aksi: "tambah", wa: AGT, nama: "Anggota Uji"}, KETUA_H())).s, 200);
  const ta = /\?t=([0-9a-f]{32})/.exec((await DB.prepare("SELECT teks FROM lj_kabar WHERE wa = ? AND jenis = 'tim'").bind(AGT).first()).teks)[1];
  kukiAgt = (await api("POST", "/api/lapor/data/masuk", {t: ta}, XPB)).h.get("set-cookie").split(";")[0];
  rumah = (await api("POST", "/api/lapor/data/objek", {jenis: "rumah", isian: RUMAH}, KETUA_H())).j.objek.id;
  rumahAgt = (await api("POST", "/api/lapor/data/objek", {jenis: "rumah", isian: RUMAH}, AGT_H())).j.objek.id;
  korban = (await api("POST", "/api/lapor/data/objek", {jenis: "korban", isian: {status: "hilang", nama: "Rani Rahasia", umur: 30, jk: "p", desa: "Paledang", kontak_nama: "Dedi Kontak", kontak_hp: "081299880099", terakhir_lokasi: "Dekat sungai",
    terakhir_waktu: new Date(kini).toISOString().slice(0, 10), pencarian: "dicari", ciri: "Tahi lalat"}}, KETUA_H())).j.objek.id;
  assert.ok(rumah && rumahAgt && korban);
});

uji("video lengkap: mulai, bagian, selesai menulis lj_media jenis video; disajikan dengan Range (206, 416) dan dicatat sekali di lj_akses", async () => {
  const byt = mp4(10, 6000), r = await kirimVideo(rumah, byt); assert.equal(r.s, 201, r.t);
  const md = await DB.prepare("SELECT * FROM lj_media WHERE objek = ?").bind(rumah).first();
  assert.equal(md.jenis, "video"); assert.equal(md.pintu, "web"); assert.match(md.kunci_r2, new RegExp(`^lapor/data/${berkasId}/${rumah}/[0-9a-f]{16}\\.mp4$`)); assert.ok(await r2.head(md.kunci_r2));
  assert.equal(await n("lapor_unggah", `kunci_r2 = '${md.kunci_r2}'`), 0, "baris unggah dibuang");
  assert.equal(await n("lj_jejak", `aksi = 'video' AND objek = '${rumah}'`), 1);
  assert.ok(r.j.objek.media.some(m => m.jenis === "video" && m.id === md.id));
  const penuh = await media(md.id, KETUA_H()); assert.equal(penuh.status, 200); assert.equal(penuh.headers.get("content-type"), "video/mp4"); assert.equal(penuh.headers.get("accept-ranges"), "bytes"); assert.equal((await penuh.arrayBuffer()).byteLength, 6000);
  const a = await media(md.id, KETUA_H(), "bytes=100-199"); assert.equal(a.status, 206); assert.equal(a.headers.get("content-range"), "bytes 100-199/6000"); assert.equal((await a.arrayBuffer()).byteLength, 100);
  assert.equal((await media(md.id, KETUA_H(), "bytes=9000-")).status, 416);
  assert.equal(await n("lj_akses", `aksi = 'media' AND objek = '${rumah}'`), 1, "hanya permintaan penuh atau rentang dari byte 0 yang dicatat");
});

uji("hak: tanpa x-pb 403, tanpa kuki 401, anggota tak bisa ke objek ketua, korban (hanya foto wajah) ditolak, anggota ke objeknya sendiri sah", async () => {
  const b = {objek: rumah, ukuran: 6000, tipe: "video/mp4"};
  assert.equal((await mulai(b, {cookie: kuki, origin: ASAL})).s, 403); assert.equal((await mulai(b, XPB)).s, 401);
  assert.equal((await mulai(b, AGT_H())).s, 403, "objek ketua");
  assert.equal((await mulai({...b, objek: korban})).s, 400, "korban"); assert.equal((await mulai({...b, objek: "0".repeat(16)})).s, 404);
  assert.equal((await kirimVideo(rumahAgt, mp4(5, 3000), AGT_H())).s, 201, "anggota objek sendiri");
  assert.equal((await mulai({...b, tipe: "video/x-flv"})).s, 400); assert.equal((await mulai({...b, ukuran: 31457281})).s, 400); assert.equal((await mulai({...b, ukuran: 10})).s, 400);
});

uji("unggahan milik tim berkas itu saja: nomor lain, berkas lain, dan jalur Lapor tahap 1 tidak bisa menyentuhnya", async () => {
  const m = await mulai({objek: rumahAgt, ukuran: 3000, tipe: "video/mp4"}, AGT_H()); assert.equal(m.s, 200, m.t);
  assert.equal((await bagian(m.j.id, 0, mp4(5, 3000))).s, 404, "ketua bukan pemilik unggahan anggota");   // wa beda
  assert.equal((await selesai(m.j.id)).s, 404);
  const t1 = await api("PUT", `/api/lapor/unggah/${m.j.id}/0`, mp4(5, 3000), {...MESIN, "content-type": "application/octet-stream"});
  assert.ok([404, 400, 401, 403].includes(t1.s), "tahap 1: " + t1.s);
  assert.equal((await bagian(m.j.id, 0, mp4(5, 2999), AGT_H())).s, 400, "bagian terpotong");
  assert.equal((await selesai(m.j.id, AGT_H())).s, 409, "bagian belum lengkap");
  assert.equal((await bagian(m.j.id, 0, mp4(5, 3000), AGT_H())).s, 200);
  const r = await selesai(m.j.id, AGT_H()); assert.equal(r.s, 201, r.t);   // video kedua milik anggota
});

uji("isi ditolak: bukan video, durasi lebih dari 60 detik, tipe tak sama dengan byte; berkas R2 dan baris unggah dibuang; batas 2 per objek", async () => {
  const teks = new TextEncoder().encode("ini bukan video ".repeat(200)), lama = mp4(90, 4000), webmDiMp4 = new Uint8Array(4000); webmDiMp4.set([0x1a, 0x45, 0xdf, 0xa3]);
  for (const [byt, pola, tipe] of [[teks, /bukan video/, "video/mp4"], [lama, /paling lama 60/, "video/mp4"], [webmDiMp4, /tidak sama/, "video/mp4"]]) {
    const r = await kirimVideo(rumah, byt, KETUA_H(), tipe); assert.equal(r.s, 400, r.t); assert.match(r.j.galat, pola);
  }
  assert.equal(await n("lapor_unggah", `kunci_r2 LIKE 'lapor/data/${berkasId}/${rumah}/%'`), 0); assert.equal((await r2.list({prefix: `lapor/data/${berkasId}/${rumah}/`})).objects.length, 1, "hanya video sah pertama");
  assert.equal((await kirimVideo(rumah, mp4(8, 2500))).s, 201);
  assert.equal((await mulai({objek: rumah, ukuran: 2500, tipe: "video/mp4"})).s, 400, "batas 2 video per objek");
});

uji("dua bagian: 5 MB lebih sedikit tersusun, ukuran akhir sama; sekian unggahan berjalan dibatasi 5 per nomor", async () => {
  const objek = (await api("POST", "/api/lapor/data/objek", {jenis: "rumah", isian: RUMAH}, KETUA_H())).j.objek.id;
  const byt = mp4(20, 5 * 1048576 + 4000), r = await kirimVideo(objek, byt); assert.equal(r.s, 201, r.t);
  const md = await DB.prepare("SELECT kunci_r2 FROM lj_media WHERE objek = ?").bind(objek).first(); assert.equal((await r2.head(md.kunci_r2)).size, byt.length);
  const o2 = (await api("POST", "/api/lapor/data/objek", {jenis: "rumah", isian: RUMAH}, KETUA_H())).j.objek.id;
  const kode = []; for (let i = 0; i < 6; i++) kode.push((await mulai({objek: o2, ukuran: 3000, tipe: "video/mp4"})).s);
  assert.deepEqual(kode, [200, 200, 200, 200, 200, 429], "paling banyak 5 unggahan berjalan per nomor");
});

uji("cron menit 17 membuang unggahan video yang menggantung 24 jam (multipart di-abort); berkas ditutup: mulai dan selesai 409, tak ada media masuk", async () => {
  const sisa = await n("lapor_unggah", `kunci_r2 LIKE 'lapor/data/%'`); assert.ok(sisa > 0);
  await bersihkanLapor({DB, MEDIA: r2}, kini + 25 * 36e5); assert.equal(await n("lapor_unggah", `kunci_r2 LIKE 'lapor/data/%'`), 0);
  const o = (await api("POST", "/api/lapor/data/objek", {jenis: "rumah", isian: RUMAH}, KETUA_H())).j.objek.id;
  const m = await mulai({objek: o, ukuran: 3000, tipe: "video/mp4"}); assert.equal(m.s, 200, m.t); assert.equal((await bagian(m.j.id, 0, mp4(5, 3000))).s, 200);
  await DB.prepare("UPDATE lj_berkas SET status = 'selesai', ditutup = ? WHERE id = ?").bind(kini, berkasId).run();
  assert.equal((await selesai(m.j.id)).s, 409); assert.equal((await mulai({objek: o, ukuran: 3000, tipe: "video/mp4"})).s, 409);
  assert.equal(await n("lj_media", `objek = '${o}'`), 0, "tidak ada video masuk berkas yang ditutup");
  assert.equal(await n("lapor_unggah", `id = '${m.j.id}'`), 1, "unggahan menunggu cron"); await bersihkanLapor({DB, MEDIA: r2}, kini + 25 * 36e5); assert.equal(await n("lapor_unggah", `id = '${m.j.id}'`), 0);
});

/* ---------- putaran perbaikan pemeriksa ---------- */
uji("halaman /lapor/data terbuka tanpa sesi dengan header privat; tidak ada kuki = 401 sebelum badan bagian dibaca; tipe prototipe ditolak", async () => {
  await DB.prepare("UPDATE lj_berkas SET status = 'terbuka', ditutup = NULL WHERE id = ?").bind(berkasId).run();
  for (const j of ["/lapor/data", "/lapor/data/"]) {
    const r = await U.mf.dispatchFetch(ASAL + j + "?t=" + "a".repeat(32)); assert.equal(r.status, 200, j);
    assert.equal(r.headers.get("cache-control"), "private, no-store"); assert.match(r.headers.get("x-robots-tag"), /noindex/); assert.equal(r.headers.get("referrer-policy"), "no-referrer");
  }
  const tanpaKuki = await U.mf.dispatchFetch(`${ASAL}/api/lapor/data/video/${"a".repeat(16)}/0`, {method: "PUT", body: new Uint8Array(6e6), headers: {"x-pb": "1", origin: ASAL}});
  assert.equal(tanpaKuki.status, 401, "kuki dicek sebelum badan 5 MB dibaca");
  for (const tipe of ["constructor", "__proto__", "toString"]) assert.equal((await mulai({objek: rumah, ukuran: 6000, tipe})).s, 400, tipe);
});

uji("selesai diulang sesudah berhasil: 200 dengan id yang sama, tidak menggandakan media; orang lain 404", async () => {
  await DB.prepare("DELETE FROM laju_bnpb WHERE aksi = 'lapor.data.video'").run();   // uji sebelumnya sudah memakai jatah per orang
  const o = (await api("POST", "/api/lapor/data/objek", {jenis: "rumah", isian: RUMAH}, KETUA_H())).j.objek.id, byt = mp4(7, 3000);
  const m = await mulai({objek: o, ukuran: 3000, tipe: "video/mp4"}); assert.equal((await bagian(m.j.id, 0, byt)).s, 200);
  assert.equal((await selesai(m.j.id)).s, 201);
  const ulang = await selesai(m.j.id); assert.equal(ulang.s, 200, ulang.t); assert.equal(ulang.j.video, m.j.id); assert.equal(await n("lj_media", `objek = '${o}'`), 1);
  assert.equal((await selesai(m.j.id, AGT_H())).s, 404, "anggota bukan pemilik objek ketua");
});

uji("laju per orang: mulai dan selesai paling banyak 30 per jam per anggota, walau IP berganti", async () => {
  await DB.prepare("DELETE FROM laju_bnpb WHERE aksi = 'lapor.data.video'").run();
  const kode = new Set();
  for (let i = 0; i < 32; i++) kode.add((await mulai({objek: "0".repeat(16), ukuran: 3000, tipe: "video/mp4"}, {...AGT_H(), "cf-connecting-ip": `198.51.100.${i + 1}`})).s);
  assert.ok(kode.has(429), [...kode].join());
});

uji("lj_akses video: permintaan pertama dicatat apa pun Range-nya (bytes=1- dan sufiks), berikutnya dalam 5 menit tidak berlipat", async () => {
  const md = await DB.prepare("SELECT id, objek FROM lj_media WHERE jenis = 'video' AND objek = ?").bind(rumahAgt).first();
  const sebelum = await n("lj_akses", `aksi = 'media' AND objek = '${md.objek}'`);
  assert.equal((await media(md.id, AGT_H(), "bytes=1-")).status, 206);
  assert.equal(await n("lj_akses", `aksi = 'media' AND objek = '${md.objek}'`), sebelum + 1, "bytes=1- tercatat");
  await media(md.id, AGT_H(), "bytes=-100"); await media(md.id, AGT_H(), "bytes=5-9");
  assert.equal(await n("lj_akses", `aksi = 'media' AND objek = '${md.objek}'`), sebelum + 1, "batas wajar per 5 menit");
});
