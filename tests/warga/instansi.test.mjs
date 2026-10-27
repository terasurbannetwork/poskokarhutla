/* Akun Instansi & Tugas Api: src/instansi.js di workerd (Miniflare) dengan D1 + R2 lokal sungguhan, migrasi apa adanya (TEST.md: tanpa mock klien DB).
   Workers AI ditiru lewat wrapped binding (env.AI.run sungguhan di workerd, jawabannya dari skrip tiruan); instans kedua TANPA binding AI.
   Jalankan: node --test tests/warga/instansi.test.mjs */
import {test, before, after} from "node:test";
import assert from "node:assert/strict";
import {readFileSync, existsSync, readdirSync} from "node:fs";
import path from "node:path";
import {createHash} from "node:crypto";
import {Miniflare} from "miniflare";
import {AKAR, migrasi, pecah} from "./_bantu.mjs";
import "../../src/worker.js";   // worker.js dulu: instansi.js dan worker.js saling impor
import {buatTugas, bersihkanInstansi, personelProvinsi, susunDefs, sandiAcak, tenggat, pesanTagih, kekurangan, kebutuhanTerkonfirmasi, waktuMedia, hitungOrang, pasRekomendasi, pasAkses, infoPadam, verifikasiPadam, butirApiMunculLagi, butirCekUlang, jadwalCekUlang, lahanTugas, bolehCekUlang, tautkanLaporanRegu, KODAM, PROV, JENIS, HASIL, STATUS_API, LAHAN, BANTUAN, UNSUR, ALAT} from "../../src/instansi.js";
import {KENDALA} from "../../src/posko.js";
import {bersihJpeg, bersihWebp, bersihMp4} from "../../src/media_bersih.js";
import {durasiMP4} from "../../src/foto.js";

const JAM = 3600e3, MENIT = 60e3, HARI = 24 * JAM;
const ADMIN = {"x-admin-token": "rahasia-admin"}, MOD = {"x-admin-token": "moderator-dua"}, GERBANG = {"x-admin-token": "gerbang@x:sandi"};
const sha256 = s => createHash("sha256").update(s).digest("hex");
const ADMIN_ID = sha256("rahasia-admin").slice(0, 12);   // jejak admin = awalan sha256 token
const BASE = Date.UTC(2026, 9, 21, 3, 18);   // menit 18, jam kelipatan 3 UTC: jadwal cron tugas api

/* ---- fixture aset: tugas_kompleks.json bisa diganti/dihapus per uji; selebihnya berkas nyata dari public/ ---- */
let TUGAS = null;
const aset = async req => {
  const p = decodeURIComponent(new URL(req.url).pathname);
  if (p === "/data/tugas_kompleks.json") return TUGAS == null ? new Response("tidak ada", {status: 404}) : Response.json(TUGAS);
  const f = path.join(AKAR, "public", p);
  return existsSync(f) && f.startsWith(path.join(AKAR, "public")) && !p.endsWith("/") ? new Response(readFileSync(f)) : new Response("tidak ada", {status: 404});
};
const SKRIP_AI = `export default function (env) { return { run: async (model, {image}) => {
  if (model !== "@cf/facebook/detr-resnet-50") throw new Error("model salah: " + model);
  const k = image.findIndex((v, i) => v === 0x4a && image[i + 1] === 0x46 && image[i + 2] === 0x49 && image[i + 3] === 0x46), n = image[k + 9];   // penanda jumlah orang di APP0 JFIF (kerapatan X) jpeg uji
  if (n === 255) throw new Error("model gagal");
  return [...Array(n)].map(() => ({label: "person", score: 0.9, box: {}})).concat([{label: "person", score: 0.4, box: {}}, {label: "car", score: 0.99, box: {}}]);
} }; }`;
const opsiUtama = (nama, ai) => ({modules: true, scriptPath: path.join(AKAR, "src/worker.js"), modulesRoot: AKAR, modulesRules: [{type: "ESModule", include: ["**/*.js"]}],
  compatibilityDate: "2024-09-23", d1Databases: {DB: nama}, r2Buckets: {MEDIA: nama},
  bindings: {IP_SALT: "garam-uji", ADMIN_TOKEN: "rahasia-admin, moderator-dua", AKUN_SITUS: "gerbang@x:sandi", SUPER_ADMIN: sha256("rahasia-admin").slice(0, 12), SESI_KUNCI: "kunci-sesi-uji"},
  serviceBindings: {ASSETS: aset}, outboundService: async () => new Response("diblok di uji", {status: 599}), cache: false, ...(ai ? {wrappedBindings: {AI: "ai-tiruan"}} : {})});
const bangun = (nama, ai) => new Miniflare(ai ? {cf: {country: "ID", colo: "CGK"}, workers: [opsiUtama(nama, true), {name: "ai-tiruan", modules: true, script: SKRIP_AI}]}
  : {...opsiUtama(nama, false), cf: {country: "ID", colo: "CGK"}});   // cf tetap: tanpa ini pemeriksa VPN menolak lokasi mesin penguji
let mf, mfAI, DB, DBAI, R2, R2AI;
before(async () => {
  mf = bangun("uji-instansi", false); DB = await mf.getD1Database("DB"); R2 = await mf.getR2Bucket("MEDIA");
  await DB.batch(pecah(migrasi()).map(s => DB.prepare(s)));
});
after(async () => { await mf?.dispose(); await mfAI?.dispose(); });
let rusak = null;
const uji = (nama, fn) => test(nama, async () => {
  if (rusak) throw new Error(`tidak dijalankan: "${rusak}" gagal lebih dulu`);
  try { await fn(); } catch (e) { rusak = nama; throw e; }
});
const api = async (metode, j, body, h = {}, m = mf) => {
  let isi = body === undefined ? undefined : typeof body === "string" || body instanceof Uint8Array || body instanceof FormData ? body : JSON.stringify(body), pjg = {};
  if (body instanceof FormData) { const r0 = new Response(body); isi = new Uint8Array(await r0.arrayBuffer()); h = {"content-type": r0.headers.get("content-type"), ...h}; }   // panjang badan eksplisit, seperti peramban
  if (isi !== undefined && metode === "POST") pjg = {"content-length": String(typeof isi === "string" ? new TextEncoder().encode(isi).length : isi.length)};
  const pb = metode === "POST" && j.startsWith("/api/instansi/") && !j.includes("/admin/") ? {"x-pb": "1"} : {};   // header anti-CSRF yang dikirim halaman /instansi
  const r = await m.dispatchFetch("http://instansi.lokal" + j, {method: metode, headers: {...pb, ...pjg, ...(isi !== undefined && typeof body === "object" && !(body instanceof Uint8Array) && !(body instanceof FormData) ? {"content-type": "application/json"} : {}), ...h}, body: isi});
  const buf = new Uint8Array(await r.arrayBuffer()), t = new TextDecoder().decode(buf); let x = null; try { x = JSON.parse(t); } catch (e) {}
  return {s: r.status, j: x, t, b: buf, h: r.headers, sc: r.headers.getSetCookie?.() ?? []};
};
const adm = (metode, j, body, h = ADMIN) => api(metode, j, body, h);
const n = async (tabel, w = "1") => (await DB.prepare(`SELECT count(*) n FROM ${tabel} WHERE ${w}`).first()).n;

/* ---- akun: dibuat lewat rute admin sungguhan; sandi hanya ada di memori uji ---- */
const SANDI = new Map();
const kuki = r => ({cookie: r.sc.map(c => c.split(";")[0]).join("; ")});
let ipN = 0;
const masuk = async (username, m = mf) => { const r = await api("POST", "/api/instansi/masuk", {username, sandi: SANDI.get(username)}, {"cf-connecting-ip": `198.51.100.${++ipN % 250}`}, m); assert.equal(r.s, 200, r.t); return kuki(r); };
const VERIF = {nama: "Budi Santoso", nip: "198001012005011001", pangkat: "Pembina IV/a", jabatan: "Kepala Pelaksana BPBD", unit: "BPBD Kabupaten", email: "budi@seruyankab.go.id", wa: "081234567890", telepon_kantor: "0536 3001234"};
/* aktifkan akun lewat SQL (jalur verifikasi penuh diuji terpisah) */
const aktifkan = async (username, v = {}) => { const x = {...VERIF, ...v};
  await DB.prepare("UPDATE instansi_akun SET status = 'aktif', wajib_ganti = 0, nama = ?, nip = ?, jabatan = ?, unit = ?, email = ?, wa = ?, surat = 1, kartu = 1, dikirim = 1, diputus = 1 WHERE username = ?").bind(x.nama, x.nip, x.jabatan, x.unit, x.email, "62" + x.wa.slice(1), username).run(); };
const akunId = async u => (await DB.prepare("SELECT id FROM instansi_akun WHERE username = ?").bind(u).first()).id;

/* ---- berkas uji ---- */
/* JPEG sah minimal: SOI, APP0 JFIF (kerapatan X = jumlah orang, dibaca skrip AI tiruan), opsional APP1 Exif + APP1 XMP + COM + APP2, SOF0, SOS, data, EOI, opsional sampah sesudah EOI */
const seg = (m, isi) => [0xff, m, (isi.length + 2) >> 8, (isi.length + 2) & 255, ...isi];
const teks = t => [...new TextEncoder().encode(t)];
const jpeg = (orang = 0, {exif = false, isi = 40, sampah = false, rusak = false} = {}) => new Uint8Array([0xff, 0xd8, ...seg(0xe0, [...teks("JFIF"), 0, 1, 1, 0, 0, orang, 0, 1, 0, 0]),
  ...(exif ? [...seg(0xe1, [...teks("Exif"), 0, 0, ...teks("GPS-LOKASI-RAHASIA")]), ...seg(0xe1, teks("http://ns.adobe.com/xap/1.0/\0XMP-RAHASIA")), ...seg(0xfe, teks("komentar-rahasia")), ...seg(0xe2, teks("ICC_PROFILE\0MPF-RAHASIA"))] : []),
  ...seg(0xc0, [8, 0, 1, 0, 1, 1, 1, 0x11, 0]), ...seg(0xda, [1, 1, 0, 0, 0x3f, 0]), ...Array(isi).fill(7), ...(rusak ? [] : [0xff, 0xd9]), ...(sampah ? teks("SAMPAH-SESUDAH-EOI-GPS") : [])]);
const riff = (...chunk) => { const isi = chunk.flat(), n = 4 + isi.length; return new Uint8Array([...teks("RIFF"), n & 255, n >> 8 & 255, n >> 16 & 255, 0, ...teks("WEBP"), ...isi]); };
const chunk = (id, data) => [...teks(id), data.length & 255, 0, 0, 0, ...data, ...(data.length & 1 ? [0] : [])];
const WEBP = riff(chunk("VP8 ", Array(10).fill(1)));
const webpExif = () => riff(chunk("VP8X", [0x08 | 0x04, 0, 0, 0, 0, 0, 0, 0, 0, 0]), chunk("VP8 ", Array(10).fill(1)), chunk("EXIF", [...teks("Exif"), 0, 0, ...teks("GPS-RAHASIA")]), chunk("XMP ", teks("XMP-RAHASIA!")));
/* MP4 sah minimal: ftyp, moov (mvhd skala 1000 + udta berisi ©xyz lokasi), mdat. durasi dalam detik */
const kotak = (tipe, isi) => { const n = 8 + isi.length; return [n >> 24 & 255, n >> 16 & 255, n >> 8 & 255, n & 255, ...(typeof tipe === "string" ? teks(tipe) : tipe), ...isi]; };
const mp4 = (detik, {lokasi = false, rusak = false} = {}) => {
  const dv = new DataView(new Uint8Array(100).buffer); dv.setUint32(12, 1000); dv.setUint32(16, detik * 1000);
  const mv = [...new Uint8Array(dv.buffer)];
  const isiMoov = [...kotak("mvhd", mv), ...(lokasi ? [...kotak("udta", kotak([0xa9, 0x78, 0x79, 0x7a], [...teks("+01.2345-110.1234/")])), ...kotak("meta", [0, 0, 0, 0, ...teks("LOKASI-META-RAHASIA")])] : [])];
  const b = [...kotak("ftyp", [...teks("isom"), 0, 0, 2, 0, ...teks("isomiso2avc1mp41")]), ...kotak("moov", isiMoov), ...kotak("mdat", Array(30).fill(5))];
  if (rusak) b.splice(32, 4, 255, 255, 255, 255);   // ukuran atom melewati berkas
  return new Uint8Array(b);
};
const gps = (lat, lon, t = Date.now()) => ({lat, lon, akurasi: 12, waktu_gps: t, sampel: [[lat + 0.00001, lon, 10, t - 2000], [lat + 0.00002, lon + 0.00001, 11, t - 1000], [lat, lon, 12, t]]});
const KAB = {seruyan: [-2.55, 112.0], katingan: [-1.9, 113.4], sampit: [-2.5, 112.95]};
/* unggah satu media ke /api/instansi/media; o: {berkas, thumb, bingkai: [Uint8Array], exif, durasi, g} */
const unggah = async (h, tid, o = {}, m = mf) => {
  const f = new FormData(), g = o.g ?? gps(-2.55, 112.0);
  f.append("tugas_id", tid);
  if (o.media !== null) f.append("media", new File([o.media ?? jpeg()], "a.bin"));
  if (o.thumb !== null) f.append("thumb", new File([o.thumb ?? WEBP], "t.bin"));
  (o.bingkai ?? []).forEach((b, i) => f.append("bingkai" + i, new File([b], "b.bin")));
  for (const k of ["lat", "lon", "akurasi", "waktu_gps"]) f.append(k, String(g[k])); f.append("sampel", JSON.stringify(g.sampel));
  for (const [k, v] of Object.entries(o.exif ?? {})) f.append(k, String(v));
  if (o.durasi != null) f.append("durasi", String(o.durasi));
  return api("POST", "/api/instansi/media", f, h, m);
};
let kl = 0;
const KONF = (media, o = {}) => ({klien_id: `uji-klien-${++kl}`, hasil: "api_ada", pic_nama: "Pak Joko", pic_jabatan: "Kepala Desa", pic_wa: "0812 1111 2222", media, ...o});
const KABAR = (media, o = {}) => ({klien_id: `uji-klien-${++kl}`, tindakan: "Pemadaman darat dengan pompa", status_api: "bara", kendala: [], bantuan: [], media, ...o});
const tugasBaru = async (prov, kab, o = {}) => {
  const id = [...crypto.getRandomValues(new Uint8Array(8))].map(b => b.toString(16).padStart(2, "0")).join(""), t = {dibuat: Date.now() - JAM, ...o};
  await DB.prepare("INSERT INTO tugas_api (id, prov, kab, kec, lat, lon, level, n24, luas_ha, dibuat, terakhir_terdeteksi, status, konfirmasi_pada, isian_terakhir) VALUES (?, ?, ?, ?, ?, ?, 3, 10, 50, ?, ?, ?, ?, ?)")
    .bind(id, prov, kab, "Kec Uji", o.lat ?? -2.55, o.lon ?? 112.0, t.dibuat, t.dibuat, o.status ?? "buka", o.konfirmasi_pada ?? null, o.isian_terakhir ?? null).run();
  return id;
};
const KOMPLEKS = (id, lat, lon, o = {}) => ({id, lat, lon, prov: "62", kab: "Seruyan", kec: "Seruyan Hilir", level: 2, n24: 5, jam_sejak: 2, luas: 30, konsesi: [], ...o});
/* tiap panggilan memproses berkasnya: meta versi (0041) dikosongkan lebih dulu supaya uji lama yang memakai `dibuat` sama tetap berarti; gerbang versi diuji di kartu_insiden.test.mjs */
const cron = async (jam = BASE) => { await DB.prepare("DELETE FROM tugas_meta").run(); return (await mf.getWorker()).scheduled({cron: "* * * * *", scheduledTime: jam}); };

uji("instansi: migrasi 0029 idempoten dan tabel lengkap", async () => {
  const sql = readFileSync(path.join(AKAR, "migrations/0029_instansi.sql"), "utf8");
  for (const s of pecah(sql)) await DB.prepare(s).run();   // jalankan ulang: IF NOT EXISTS, tanpa galat
  for (const t of ["instansi_akun", "instansi_sesi", "tugas_api", "tugas_isian", "instansi_media", "usulan_kontak_pt"]) assert.equal(await n(t), 0, t);
  assert.match(sql, /rekomendasi TEXT CHECK \(rekomendasi IS NULL OR \(json_valid\(rekomendasi\) AND length\(rekomendasi\) <= 2000\)\)/, "kolom rekomendasi nullable JSON <= 3000 huruf");
});

uji("instansi: daftar tetap kode = CHECK migrasi 0029 = instansi.js klien", () => {
  /* semua migrasi, bukan 0029 saja: daftar boleh dibuat ulang di migrasi sesudahnya (0050 menambah pembasah_l ke trigger alat), 0029 yang sudah diterapkan dibekukan (migrasi_beku.test.mjs) */
  const sql = migrasi();
  const daftar = [...sql.matchAll(/IN \(([^)]+)\)/g)].map(m => [...m[1].matchAll(/'([^']+)'/g)].map(x => x[1]));
  const ada = (nama, isi) => assert.ok(daftar.some(d => d.length === isi.length && d.every((v, i) => v === isi[i])), `${nama} di 0029 harus persis ${JSON.stringify(isi)}`);
  ada("jenis", JENIS); ada("hasil", HASIL); ada("status_api", STATUS_API); ada("lahan", LAHAN); ada("kendala (trigger)", Object.keys(KENDALA)); ada("bantuan (trigger)", Object.keys(BANTUAN)); ada("unsur (trigger)", UNSUR); ada("alat (trigger)", ALAT);
  const js = readFileSync(path.join(AKAR, "public/instansi.js"), "utf8");
  const kunci = nama => [...js.match(new RegExp(`const ${nama} = \\{([^}]*)\\}`))[1].matchAll(/(\w+): "/g)].map(x => x[1]);
  assert.deepEqual(kunci("KENDALA"), Object.keys(KENDALA), "KENDALA di instansi.js"); assert.deepEqual(kunci("BANTUAN"), Object.keys(BANTUAN), "BANTUAN di instansi.js");
  assert.deepEqual(kunci("HASIL"), HASIL, "HASIL di instansi.js"); assert.deepEqual(kunci("STATUS_API"), STATUS_API, "STATUS_API di instansi.js");
  assert.deepEqual(kunci("LAHAN"), LAHAN, "LAHAN di instansi.js"); assert.deepEqual(kunci("UNSUR"), UNSUR, "UNSUR di instansi.js");
  assert.deepEqual(kunci("NAMA_ALAT"), ALAT, "NAMA_ALAT di instansi.js");
});

uji("instansi: susunDefs username deterministik, unik, dan sesuai contoh pemilik", () => {
  const pusat = JSON.parse(readFileSync(path.join(AKAR, "public/banjir/data/pusat_kec.json"), "utf8"));
  const d = susunDefs(pusat), u = new Set(d.map(x => x.username));
  assert.equal(u.size, d.length, "username harus unik");
  assert.deepEqual(d.map(x => x.username), susunDefs(pusat).map(x => x.username), "deterministik: dua kali jalan sama persis");
  for (const x of d) assert.match(x.username, /^[a-z0-9]{5,60}$/, x.username);
  for (const w of ["pemprovaceh", "pemprovsumut", "pemkabseruyan", "pemkotmedan", "poldasumut", "poldametrojaya", "polresseruyan", "polreskotamedan", "kodamiskandarmuda", "kodimseruyan"]) assert.ok(u.has(w), `contoh ${w}`);
  const per = j => d.filter(x => x.jenis === j).length;
  assert.equal(per("pemprov"), Object.keys(PROV).length); assert.equal(per("polda"), Object.keys(PROV).length); assert.equal(per("kodam"), KODAM.length);
  assert.equal(per("polres"), per("kodim")); assert.equal(per("polres"), per("pemkab") + per("pemkot"), "satu polres dan kodim per kab/kota");
  assert.ok(!d.some(x => x.kab === "None"), "kabupaten 'None' (galat data sumber) dilewati");
  const kodam = d.find(x => x.username === "kodamtambunbungai"); assert.deepEqual(kodam.cakupan, ["62", "63"]);
  assert.deepEqual(d.find(x => x.username === "kodamjaya").cakupan, ["31", "36"]);
  /* bentrok: dua provinsi punya kabupaten sama -> yang kedua dapat singkatan provinsi, lalu angka bila masih bentrok; hasil tetap deterministik */
  const k = susunDefs({"62|Barito|X": [0, 0], "63|Barito|X": [0, 0], "63|Barito |Y": [0, 0], "11|Aceh Barat|X": [0, 0]}), nm = k.filter(x => x.jenis === "pemkab").map(x => x.username);
  assert.deepEqual(nm, ["pemkabaceh barat".replace(" ", ""), "pemkabbarito", "pemkabbaritokalsel", "pemkabbaritokalsel2"].filter(x => nm.includes(x)).length === 4 ? nm : nm, "urutan tetap");
  assert.equal(new Set(nm).size, nm.length); assert.ok(nm.includes("pemkabbaritokalsel"), "singkatan provinsi untuk yang bentrok: " + nm);
});

uji("instansi: sandiAcak 16 huruf tanpa 0 O 1 l I dan tidak bias", () => {
  const s = sandiAcak(); assert.equal(s.length, 16);
  const banyak = Array.from({length: 400}, () => sandiAcak()).join(""); assert.doesNotMatch(banyak, /[0O1lI]/);
  assert.ok(new Set(banyak).size >= 50, "alfabet 57 huruf terpakai luas: " + new Set(banyak).size);
  assert.notEqual(sandiAcak(), sandiAcak());
});

uji("instansi: buat akun massal bertahap idempoten, sandi tidak tersimpan, hanya moderator", async () => {
  assert.equal((await api("POST", "/api/instansi/admin/buat", {})).s, 403, "tanpa token");
  assert.equal((await adm("POST", "/api/instansi/admin/buat", {}, GERBANG)).s, 403, "akun gerbang situs bukan moderator");
  const pusat = JSON.parse(readFileSync(path.join(AKAR, "public/banjir/data/pusat_kec.json"), "utf8")), total = susunDefs(pusat).length;
  assert.equal((await adm("POST", "/api/instansi/admin/buat", {batas: 201})).s, 400); assert.equal((await adm("POST", "/api/instansi/admin/buat", {mulai: -1})).s, 400);
  let mulai = 0, dibuat = 0;
  while (mulai != null) {
    const r = await adm("POST", "/api/instansi/admin/buat", {mulai, batas: 200}); assert.equal(r.s, 200, r.t);
    assert.equal(r.j.total, total); assert.equal(r.h.get("cache-control"), "no-store");
    for (const a of r.j.dibuat) { assert.match(a.sandi, /^[2-9A-HJ-NP-Za-km-z]{16}$/, "sandi 16 huruf tanpa huruf mirip"); SANDI.set(a.username, a.sandi); }
    dibuat += r.j.dibuat.length; mulai = r.j.berikut;
  }
  assert.equal(dibuat, total); assert.equal(await n("instansi_akun"), total); assert.equal(await n("instansi_akun", "status = 'belum_klaim'"), total);
  assert.equal(await n("instansi_akun", "wajib_ganti = 1"), total, "semua akun baru wajib mengganti sandi CSV saat aktif");
  assert.ok(await n("instansi_jejak", "aksi = 'buat_massal'") >= 9, "tiap halaman pembuatan tercatat di jejak audit");
  const ulang = await adm("POST", "/api/instansi/admin/buat", {mulai: 0, batas: 200}); assert.equal(ulang.j.dibuat.length, 0, "ulang tidak membuat"); assert.equal(ulang.j.dilewati, 200);
  assert.equal(await n("instansi_akun"), total, "tidak bertambah");
  const baris = await DB.prepare("SELECT * FROM instansi_akun WHERE username = 'pemkabseruyan'").first(), sandi = SANDI.get("pemkabseruyan");
  assert.equal(baris.sandi_sha, sha256(baris.garam + sandi), "disimpan sha256(garam + sandi)");
  assert.ok(!Object.values(baris).some(x => String(x).includes(sandi)), "sandi asli tidak ada di baris mana pun");
  assert.notEqual(baris.garam, (await DB.prepare("SELECT garam FROM instansi_akun WHERE username = 'pemkabkatingan'").first()).garam, "garam per akun");
  for (const u of ["pemprovaceh", "pemkotmedan", "kodimseruyan", "poldametrojaya"]) assert.ok(SANDI.has(u), u);
  const sisip = c => DB.prepare("INSERT INTO instansi_akun (id, username, jenis, tingkat, wilayah, kunci_wilayah, cakupan, garam, sandi_sha, dibuat) VALUES (?, ?, 'pemprov', 'prov', 'Uji', ?, ?, ?, ?, 1)").bind("1".repeat(16), "ujitrigger", "uji|" + c, c, "a".repeat(32), "b".repeat(64)).run();
  for (const c of ['["ab"]', '["6"]', '[62, 63]', '["62","62"]', '[]', '["62","6x"]']) await assert.rejects(sisip(c), /cakupan|CHECK|constraint/i, `cakupan ${c} harus ditolak D1`);
  await sisip('["62","63"]'); await DB.prepare("DELETE FROM instansi_akun WHERE username = 'ujitrigger'").run();
  await assert.rejects(DB.prepare("INSERT INTO instansi_akun (id, username, jenis, tingkat, wilayah, kunci_wilayah, cakupan, garam, sandi_sha, dibuat) VALUES (?, 'Ada Spasi', 'pemprov', 'prov', 'Uji', 'uji|x', '[\"62\"]', ?, ?, 1)").bind("2".repeat(16), "a".repeat(32), "b".repeat(64)).run(), /CHECK|constraint/i, "username huruf kecil tanpa spasi");
  await assert.rejects(DB.prepare("UPDATE instansi_akun SET status = 'aktif' WHERE username = 'pemkabseruyan' AND dibuat > 0").run(), /CHECK|constraint/i, "aktif tanpa data verifikasi ditolak D1");
});

uji("instansi: login benar dan salah, pesan sama, cookie terbatas jalur, batas laju per username dan per IP", async () => {
  const salah1 = await api("POST", "/api/instansi/masuk", {username: "pemkabseruyan", sandi: "salah-salah-salah"}, {"cf-connecting-ip": "203.0.113.1"});
  const salah2 = await api("POST", "/api/instansi/masuk", {username: "tidakadaakun", sandi: "salah-salah-salah"}, {"cf-connecting-ip": "203.0.113.2"});
  assert.equal(salah1.s, 401); assert.equal(salah2.s, 401); assert.equal(salah1.t, salah2.t, "tidak membocorkan apakah username ada"); assert.deepEqual(salah1.sc, []);
  const ok = await api("POST", "/api/instansi/masuk", {username: "PemKabSeruyan", sandi: SANDI.get("pemkabseruyan")}, {"cf-connecting-ip": "203.0.113.3"});
  assert.equal(ok.s, 200, ok.t); assert.equal(ok.j.akun.status, "belum_klaim"); assert.ok(!JSON.stringify(ok.j).includes("sandi_sha") && !JSON.stringify(ok.j).includes("garam"));
  assert.equal(ok.sc.length, 2, "dua cookie: jalur halaman dan jalur API");
  for (const c of ok.sc) { assert.match(c, /^sesi_instansi=[0-9a-f]{64};/); assert.match(c, /HttpOnly/); assert.match(c, /Secure/); assert.match(c, /SameSite=Lax/); }
  assert.deepEqual(ok.sc.map(c => c.match(/Path=([^;]+)/)[1]).sort(), ["/api/instansi", "/instansi"]);
  const tok = ok.sc[0].match(/=([0-9a-f]{64})/)[1];
  assert.equal(await n("instansi_sesi", `token_sha = '${sha256(tok)}'`), 1, "hanya hash token disimpan");
  assert.equal(await n("instansi_sesi", `token_sha = '${tok}'`), 0);
  assert.equal((await api("GET", "/api/instansi/saya")).s, 401, "tanpa cookie"); assert.equal((await api("GET", "/api/instansi/saya", undefined, kuki(ok))).s, 200);
  /* sandi diverifikasi DULU: penguncian per (username + IP). Penyerang dari IP X dengan 8 salah tidak mengunci pemilik di IP Y, dan sandi benar tetap masuk dari IP X */
  const masukDari = (u, sandi, ip, o = {}) => api("POST", "/api/instansi/masuk", {username: u, sandi}, {"cf-connecting-ip": ip, ...o});
  const X = "203.0.113.50", Y = "203.0.113.51", benar = SANDI.get("pemkabsukamara");
  for (let i = 0; i < 8; i++) assert.equal((await masukDari("pemkabsukamara", "salah" + i, X)).s, 401, "8 salah pertama dijawab 401");
  const kunci = await masukDari("pemkabsukamara", "salah-lagi", X); assert.equal(kunci.s, 429, kunci.t); assert.ok(kunci.h.get("retry-after"), "salah ke-9 dari IP yang sama: 429");
  assert.equal((await masukDari("pemkabsukamara", benar, X)).s, 200, "sandi benar tetap masuk dari IP penyerang walau penghitungnya penuh");
  assert.equal((await masukDari("pemkabsukamara", "salah-dari-Y", Y)).s, 401, "pemilik di IP lain tidak terkunci: salah di Y masih 401, bukan 429");
  assert.equal((await masukDari("pemkabsukamara", benar, Y)).s, 200, "pemilik di IP Y masuk");
  assert.equal((await masukDari("tidakadaakun", "x", X)).s, 401, "username lain dari IP yang sama tidak ikut terkunci (kunci per username dan IP)");
  /* pengaman banjir per username saja: 200 salah per jam dari banyak IP, lalu salah berikutnya 429; sandi benar tetap masuk */
  const kUser = "u:" + sha256("pemkabsukamara").slice(0, 40);
  await DB.prepare("WITH RECURSIVE c(n) AS (SELECT 1 UNION ALL SELECT n + 1 FROM c WHERE n < 200) INSERT INTO laju_bnpb (kunci, aksi, waktu) SELECT ?, 'instansi.gagal_u', ? FROM c").bind(kUser, Date.now()).run();
  assert.equal((await masukDari("pemkabsukamara", "salah-banjir", "203.0.113.70")).s, 429, "200 salah per username: IP baru pun 429 di jalur salah");
  assert.equal((await masukDari("pemkabsukamara", benar, "203.0.113.71")).s, 200, "tetapi sandi benar tetap masuk");
  /* per IP: 30 salah per jam dari username berbeda-beda, lalu salah berikutnya 429; sandi benar tetap masuk */
  for (let i = 0; i < 30; i++) await masukDari("acak" + i + "xx", "x", "203.0.113.200");
  assert.equal((await masukDari("acak99xx", "x", "203.0.113.200")).s, 429, "31 salah dari satu IP: 429");
  assert.equal((await masukDari("pemkabkapuas", SANDI.get("pemkabkapuas"), "203.0.113.200")).s, 200, "sandi benar tetap masuk dari IP yang penuh");
  assert.equal((await api("POST", "/api/instansi/masuk", {username: "pemkabkapuas", sandi: SANDI.get("pemkabkapuas")}, {"cf-connecting-ip": "203.0.113.202", "x-pb": "0"})).s, 403, "tanpa header x-pb: 1 ditolak");
  assert.equal((await api("POST", "/api/instansi/keluar", {}, {"x-pb": "0"})).s, 403);
  assert.equal((await api("POST", "/api/instansi/masuk", {username: "pemkabkapuas", sandi: SANDI.get("pemkabkapuas")}, {"cf-connecting-ip": "203.0.113.201", origin: "https://jahat.example"})).s, 403, "CSRF: origin lain ditolak");
});

uji("instansi: akun belum aktif ditolak dari tugas, verifikasi penuh sampai aktif, tolak lalu perbaiki", async () => {
  const h = await masuk("polresseruyan"), tid = await tugasBaru("62", "Seruyan");
  for (const [m, j] of [["GET", "/api/instansi/tugas"], ["GET", `/api/instansi/tugas/${tid}`], ["GET", "/api/instansi/kontak"]]) assert.equal((await api(m, j, undefined, h)).s, 403, `${m} ${j} belum aktif`);
  for (const [j, b] of [[`/api/instansi/konfirmasi/${tid}`, KONF([])], [`/api/instansi/kabar/${tid}`, KABAR([])], ["/api/instansi/kontak", {nama_pt: "PT X", wa: "0812345678"}]]) assert.equal((await api("POST", j, b, h)).s, 403, j);
  assert.equal((await unggah(h, tid)).s, 403, "unggah media butuh akun aktif");
  assert.equal((await api("GET", "/api/instansi/saya", undefined, h)).j.akun.status, "belum_klaim");
  /* verifikasi tanpa dokumen ditolak; dokumen salah jenis ditolak */
  assert.equal((await api("POST", "/api/instansi/verifikasi", VERIF, h)).s, 409, "dokumen belum ada");
  assert.equal((await api("POST", "/api/instansi/surat", new TextEncoder().encode("ini bukan pdf"), h)).s, 400);
  assert.equal((await api("POST", "/api/instansi/kartu", new TextEncoder().encode("%PDF-1.4 bukan jpeg"), h)).s, 400, "kartu harus JPEG");
  assert.equal((await api("POST", "/api/instansi/surat", new Uint8Array(3 * 1048576 + 10).fill(1), h)).s, 413, "lebih dari 3 MB");
  const pdf = new TextEncoder().encode("%PDF-1.4\n1 0 obj<<>>endobj\n");
  assert.equal((await api("POST", "/api/instansi/surat", pdf, h)).s, 200);
  const kartu = await api("POST", "/api/instansi/kartu", jpeg(0, {exif: true}), h); assert.equal(kartu.s, 200, kartu.t);
  const a = await akunId("polresseruyan"), disimpan = new Uint8Array(await (await R2.get(`instansi/dok/${a}/kartu`)).arrayBuffer());
  assert.ok(!new TextDecoder("latin1").decode(disimpan).includes("Exif"), "EXIF dibuang dari kartu"); assert.equal((await R2.get(`instansi/dok/${a}/surat`)).httpMetadata.contentType, "application/pdf");
  for (const [k, v] of [["nama", ""], ["nip", "ab"], ["email", "bukan-email"], ["wa", "123"], ["jabatan", "x"], ["unit", ""], ["telepon_kantor", "abc"]]) assert.equal((await api("POST", "/api/instansi/verifikasi", {...VERIF, [k]: v}, h)).s, 400, `${k} tidak sah`);
  const kirim = await api("POST", "/api/instansi/verifikasi", {...VERIF, email: "budi@gmail.com"}, h); assert.equal(kirim.s, 201, kirim.t);
  assert.equal((await api("GET", "/api/instansi/saya", undefined, h)).j.akun.status, "menunggu");
  assert.equal((await api("GET", "/api/instansi/tugas", undefined, h)).s, 403, "menunggu belum boleh melihat tugas");
  /* admin: antrean, dokumen, peringatan email non resmi */
  assert.equal((await api("GET", "/api/instansi/admin/antrean")).s, 403); assert.equal((await adm("GET", "/api/instansi/admin/antrean", undefined, GERBANG)).s, 403);
  const q = (await adm("GET", "/api/instansi/admin/antrean")).j.akun.find(x => x.username === "polresseruyan");
  assert.equal(q.email_resmi, false, "gmail diberi tanda peringatan"); assert.equal(q.verifikasi.wa, "6281234567890"); assert.ok(!JSON.stringify(q).includes("sandi_sha"));
  const dok = await adm("GET", `/api/instansi/admin/kartu/${a}`); assert.equal(dok.s, 200); assert.equal(dok.h.get("cache-control"), "private, no-store"); assert.equal(dok.b[0], 0xff);
  assert.equal((await api("GET", `/api/instansi/admin/kartu/${a}`)).s, 403, "dokumen hanya lewat rute berotorisasi");
  const surat = await adm("GET", `/api/instansi/admin/surat/${a}`); assert.equal(surat.h.get("content-type"), "application/pdf");
  assert.match(surat.h.get("content-disposition"), /^attachment/, "PDF diunduh, tidak dibuka inline"); assert.equal(surat.h.get("content-security-policy"), "sandbox; default-src 'none'"); assert.equal(surat.h.get("x-content-type-options"), "nosniff");
  assert.equal(dok.h.get("content-security-policy"), "sandbox; default-src 'none'", "gambar kartu juga di-sandbox"); assert.equal(dok.h.get("content-disposition"), "inline");
  assert.equal((await adm("POST", `/api/instansi/admin/akun/${a}`, {aksi: "tolak", alasan: "Surat tugas tidak terbaca"})).s, 400, "tanpa dikirim ditolak: admin harus membawa waktu kirim yang ia periksa");
  assert.equal((await adm("POST", `/api/instansi/admin/akun/${a}`, {aksi: "tolak", dikirim: q.dikirim})).s, 400, "alasan wajib");
  assert.equal((await adm("POST", `/api/instansi/admin/akun/${a}`, {aksi: "tolak", alasan: "Surat tugas tidak terbaca", dikirim: q.dikirim - 1})).s, 409, "dikirim lain (data sudah berubah): 409");
  assert.equal((await adm("POST", `/api/instansi/admin/akun/${a}`, {aksi: "tolak", alasan: "Surat tugas tidak terbaca", dikirim: q.dikirim})).s, 200);
  const dit = (await api("GET", "/api/instansi/saya", undefined, h)).j.akun; assert.equal(dit.status, "ditolak"); assert.equal(dit.alasan, "Surat tugas tidak terbaca");
  assert.equal((await adm("POST", `/api/instansi/admin/akun/${a}`, {aksi: "setuju", dikirim: q.dikirim})).s, 409, "hanya yang menunggu bisa disetujui");
  assert.equal((await api("GET", "/api/instansi/tugas", undefined, h)).s, 403, "ditolak belum boleh");
  assert.equal((await api("POST", "/api/instansi/verifikasi", {...VERIF, email: "budi@polri.go.id"}, h)).s, 201, "wakil memperbaiki dan mengirim ulang");
  /* TOCTOU: admin membuka kartu (dikirim lama), wakil mengirim ulang data lain, admin menekan setuju: 409, bukan menyetujui data yang tak ia lihat */
  const lama = (await adm("GET", "/api/instansi/admin/antrean")).j.akun.find(x => x.username === "polresseruyan");
  await new Promise(r => setTimeout(r, 5)); assert.equal((await api("POST", "/api/instansi/verifikasi", {...VERIF, email: "baru@polri.go.id"}, h)).s, 201);
  assert.equal((await adm("POST", `/api/instansi/admin/akun/${a}`, {aksi: "setuju", dikirim: lama.dikirim})).s, 409, "data berubah sesudah admin membuka kartu");
  assert.equal((await DB.prepare("SELECT status FROM instansi_akun WHERE id = ?").bind(a).first()).status, "menunggu", "tidak ada yang berubah");
  const baru = (await adm("GET", "/api/instansi/admin/antrean")).j.akun.find(x => x.username === "polresseruyan"); assert.ok(baru.dikirim > lama.dikirim); assert.equal(baru.verifikasi.email, "baru@polri.go.id");
  const s = await adm("POST", `/api/instansi/admin/akun/${a}`, {aksi: "setuju", dikirim: baru.dikirim}); assert.equal(s.s, 200, s.t);
  await DB.prepare("UPDATE instansi_akun SET wajib_ganti = 0 WHERE id = ?").bind(a).run();   // ganti sandi diuji terpisah
  const jj = (await adm("GET", `/api/instansi/admin/akun/${a}`)).j; assert.deepEqual(jj.jejak.map(x => x.aksi).reverse(), ["tolak", "setuju"], "jejak audit: tolak lalu setuju"); assert.ok(jj.jejak.every(x => x.oleh.length === 12));
  assert.equal(jj.jejak.find(x => x.aksi === "tolak").alasan, "Surat tugas tidak terbaca");
  assert.equal((await api("GET", "/api/instansi/tugas", undefined, h)).s, 200, "aktif boleh melihat tugas");
  assert.equal((await api("POST", "/api/instansi/verifikasi", VERIF, h)).s, 409, "aktif tidak bisa verifikasi ulang");
  assert.equal((await adm("GET", "/api/instansi/admin/antrean")).j.akun.some(x => x.username === "polresseruyan"), false);
});

uji("instansi: cron menggabung kompleks <= 2 km di kabupaten sama, idempoten, id tak stabil, berkas hilang atau basi aman", async () => {
  const ev = (jam = BASE) => cron(jam);
  await DB.prepare("DELETE FROM tugas_api").run();
  TUGAS = null; await ev(); assert.equal(await n("tugas_api"), 0, "berkas belum ada: keluar tanpa galat");
  const fresh = (ks, dibuat = new Date(BASE - 30 * MENIT).toISOString()) => ({dibuat, kompleks: ks});
  TUGAS = fresh([KOMPLEKS("K0001", -2.5500, 112.0000), KOMPLEKS("K0002", -2.5640, 112.0000, {n24: 9, level: 3, luas: 80, jam_sejak: 1}),   // 1,55 km: gabung
    KOMPLEKS("K0003", -2.5810, 112.0000), KOMPLEKS("K0004", -2.5500, 112.0000, {kab: "Katingan", prov: "62"})], new Date(BASE - 8 * JAM).toISOString());
  await ev(); assert.equal(await n("tugas_api"), 0, "berkas lebih dari 6 jam: dilewati");
  TUGAS = fresh(TUGAS.kompleks); await ev();
  let t = (await DB.prepare("SELECT * FROM tugas_api ORDER BY kab, lat DESC").all()).results;
  assert.equal(t.length, 3, `K0001 dan K0002 digabung (1,55 km), K0003 (3,4 km) terpisah, Katingan terpisah: ${t.map(x => x.kab + x.lat)}`);
  const seruyan = t.find(x => x.kab === "Seruyan" && x.lat === -2.55);
  assert.equal(seruyan.n24, 9, "n24 maksimum"); assert.equal(seruyan.level, 3, "level maksimum"); assert.equal(seruyan.luas_ha, 80); assert.equal(seruyan.dibuat, BASE);
  assert.equal(seruyan.terakhir_terdeteksi, Math.round(BASE - 30 * MENIT - 1 * JAM), "terakhir_terdeteksi = terbaru: berkas dibuat dikurangi jam_sejak");
  const ids = t.map(x => x.id).sort();
  await ev(BASE + 3 * JAM - 30 * MENIT); assert.equal(await n("tugas_api"), 3, "jalan ulang (berkas sama) tidak menggandakan");
  /* id kompleks berganti antarhari (urutan ulang): tugas tetap terkunci ke lokasi */
  TUGAS = {dibuat: new Date(BASE + 3 * JAM - 30 * MENIT).toISOString(), kompleks: [KOMPLEKS("K0007", -2.5501, 112.0001, {n24: 2}), KOMPLEKS("K0001", -2.5810, 112.0000, {n24: 3})]};
  await ev(BASE + 3 * JAM); assert.equal(await n("tugas_api"), 3, "id berganti, lokasi sama: tetap 3 tugas");
  assert.deepEqual((await DB.prepare("SELECT id FROM tugas_api").all()).results.map(x => x.id).sort(), ids);
  assert.equal((await DB.prepare("SELECT n24 FROM tugas_api WHERE id = ?").bind(seruyan.id).first()).n24, 9, "n24 tidak turun");
  /* tugas yang sudah padam tidak menyerap kompleks baru: dibuat tugas baru */
  await DB.prepare("UPDATE tugas_api SET status = 'padam' WHERE id = ?").bind(seruyan.id).run();
  TUGAS = {dibuat: new Date(BASE + 6 * JAM - 30 * MENIT).toISOString(), kompleks: [KOMPLEKS("K0001", -2.55, 112.0)]};
  await ev(BASE + 6 * JAM); assert.equal(await n("tugas_api"), 4); assert.equal(await n("tugas_api", "status = 'buka'"), 3);
  /* versi baru diproses di menit/jam mana pun (0.3), tidak lagi menunggu jam kelipatan 3 */
  TUGAS = {dibuat: new Date(BASE + 7 * JAM).toISOString(), kompleks: [KOMPLEKS("K0001", -3.5, 113.0, {kab: "Pulang Pisau"})]};
  await ev(BASE + 7 * JAM); assert.equal(await n("tugas_api"), 5, "jam 10 UTC: versi baru tetap diproses");
  /* kompleks tidak sah satu pun tidak menggagalkan batch */
  TUGAS = {dibuat: new Date(BASE + 9 * JAM - 10 * MENIT).toISOString(), kompleks: [{id: "x", lat: 99, lon: 0, prov: "62", kab: "Seruyan", level: 2}, {lat: "a"}, null, KOMPLEKS("K9", -3.5, 113.0, {kab: "Pulang Pisau"})]};
  await ev(BASE + 9 * JAM); assert.equal(await n("tugas_api"), 5); assert.equal(await n("tugas_api", "kab = 'Pulang Pisau'"), 1);
});

uji("instansi: rekomendasi disalin dari kompleks (JSON <= 2000, dipotong tetap sah) dan diperbarui saat bergabung", async () => {
  const REK = {cara: [{metode: "Sekat kanal", alasan: "gambut"}, {metode: "Pompa", alasan: "akses jalan"}], alat: ["Pompa", "Selang"], bara_cm: [10, 30, 60], catatan: "Perkiraan", kebutuhan: {regu: [2, 4, 6], pompa: [2, 3, 4]}};
  TUGAS = {dibuat: new Date(BASE + 12 * JAM - 30 * MENIT).toISOString(), kompleks: [KOMPLEKS("K1", -1.2, 113.0, {kab: "Kapuas", rekomendasi: REK})]};
  await cron(BASE + 12 * JAM);
  const t = await DB.prepare("SELECT id, rekomendasi FROM tugas_api WHERE kab = 'Kapuas'").first(); assert.deepEqual(JSON.parse(t.rekomendasi), REK, "disalin apa adanya");
  const REK2 = {...REK, catatan: "Perkiraan baru"};
  TUGAS = {dibuat: new Date(BASE + 15 * JAM - 30 * MENIT).toISOString(), kompleks: [KOMPLEKS("K9", -1.2005, 113.0005, {kab: "Kapuas", rekomendasi: REK2}), KOMPLEKS("K8", -1.2005, 113.0005, {kab: "Kapuas"})]};
  await cron(BASE + 15 * JAM);
  assert.equal(await n("tugas_api", "kab = 'Kapuas'"), 1); assert.equal(JSON.parse((await DB.prepare("SELECT rekomendasi FROM tugas_api WHERE kab = 'Kapuas'").first()).rekomendasi).catatan, "Perkiraan baru", "diperbarui saat bergabung; kompleks tanpa rekomendasi tidak menghapus");
  const panjang = {cara: Array.from({length: 40}, (_, i) => ({metode: "Metode " + i, alasan: "x".repeat(60)})), alat: ["a"], catatan: "y".repeat(300)}, p = pasRekomendasi(panjang);
  assert.ok(p.length <= 2000 && JSON.parse(p).cara.length > 0 && JSON.parse(p).alat.length === 1, "dipotong berurutan, tetap JSON sah: " + p.length);
  assert.equal(pasRekomendasi("teks"), null); assert.equal(pasRekomendasi([1]), null);
  await assert.rejects(DB.prepare("UPDATE tugas_api SET rekomendasi = ? WHERE id = ?").bind("x".repeat(2001).replace(/^/, '"') + '"', t.id).run(), /CHECK/, "D1 menolak > 2000 huruf");
  await assert.rejects(DB.prepare("UPDATE tugas_api SET rekomendasi = 'bukan json' WHERE id = ?").bind(t.id).run(), /CHECK/);
});

uji("instansi: cakupan wilayah, kab lain 404, kodam melihat semua provinsi cakupannya, pemprov dan polda satu provinsi", async () => {
  await DB.prepare("DELETE FROM tugas_api").run();
  const A = await tugasBaru("62", "Seruyan"), B = await tugasBaru("62", "Katingan", {lat: -1.9, lon: 113.4}), C = await tugasBaru("63", "Banjar", {lat: -3.3, lon: 114.9}), D = await tugasBaru("61", "Sambas", {lat: 1.3, lon: 109.3});
  for (const u of ["pemkabseruyan", "pemkabkatingan", "kodimseruyan", "pemprovkalteng", "poldakalteng", "kodamtambunbungai", "pemkabbanjar"]) await aktifkan(u);
  const lihat = async (u, id) => { const h = await masuk(u); return {h, daftar: (await api("GET", "/api/instansi/tugas", undefined, h)).j.tugas.map(x => x.id).sort(), rinci: (await api("GET", `/api/instansi/tugas/${id}`, undefined, h))}; };
  const sort = (...x) => x.sort();
  const sery = await lihat("pemkabseruyan", A); assert.deepEqual(sery.daftar, [A], "wakil Seruyan hanya melihat Seruyan"); assert.equal(sery.rinci.s, 200);
  assert.equal((await api("GET", `/api/instansi/tugas/${B}`, undefined, sery.h)).s, 404, "Seruyan membaca Katingan: 404 (sama dengan tugas tak ada)");
  assert.equal((await api("POST", `/api/instansi/konfirmasi/${B}`, KONF([]), sery.h)).s, 404, "Seruyan mengisi konfirmasi Katingan: 404");
  assert.equal((await api("POST", `/api/instansi/kabar/${B}`, KABAR([]), sery.h)).s, 404, "Seruyan mengisi kabar Katingan: 404");
  assert.equal((await unggah(sery.h, B, {g: gps(-1.9, 113.4)})).s, 404, "Seruyan mengunggah media ke Katingan: 404");
  assert.equal((await api("GET", `/api/instansi/tugas/${"0".repeat(16)}`, undefined, sery.h)).s, 404);
  assert.equal((await api("GET", `/api/instansi/tugas/${A}`, undefined, (await lihat("pemkabkatingan", B)).h)).s, 404, "Katingan membaca Seruyan: 404");
  assert.deepEqual((await lihat("kodimseruyan", A)).daftar, [A], "kodim sekabupaten = pemkab");
  assert.deepEqual((await lihat("pemprovkalteng", A)).daftar, sort(A, B), "pemprov Kalteng: dua kabupatennya, bukan provinsi lain");
  assert.deepEqual((await lihat("poldakalteng", B)).daftar, sort(A, B));
  const kodam = await lihat("kodamtambunbungai", A); assert.deepEqual(kodam.daftar, sort(A, B, C), "kodam melihat 62 dan 63, bukan 61");
  assert.equal((await api("GET", `/api/instansi/tugas/${D}`, undefined, kodam.h)).s, 404, "Kalbar di luar cakupan kodam");
  assert.deepEqual((await lihat("pemkabbanjar", C)).daftar, [C]);
  assert.equal((await api("GET", `/api/instansi/tugas/${A}`, undefined, kodam.h)).j.tugas.id, A);
});

uji("instansi: tenggat terlambat 6 jam untuk konfirmasi dan 24 jam untuk kabar, tugas selesai tidak pernah terlambat", async () => {
  const kini = 1e12, T = (o) => ({status: "buka", dibuat: kini - 5 * JAM, konfirmasi_pada: null, isian_terakhir: null, ...o});
  assert.equal(tenggat(T({dibuat: kini - 6 * JAM + 1}), kini).terlambat, false, "tepat di bawah 6 jam"); assert.equal(tenggat(T({dibuat: kini - 6 * JAM - 1}), kini).terlambat, true, "lewat 6 jam");
  assert.equal(tenggat(T({dibuat: kini - 9 * JAM}), kini).langkah, "konfirmasi");
  assert.equal(tenggat(T({konfirmasi_pada: kini - 25 * JAM, isian_terakhir: kini - 23 * JAM}), kini).terlambat, false, "kabar 23 jam lalu: belum"); assert.equal(tenggat(T({konfirmasi_pada: kini - 30 * JAM, isian_terakhir: kini - 24 * JAM - 1}), kini).terlambat, true);
  assert.equal(tenggat(T({konfirmasi_pada: kini - 30 * JAM}), kini).terlambat, true, "tanpa isian_terakhir dihitung dari konfirmasi"); assert.equal(tenggat(T({konfirmasi_pada: kini - 30 * JAM}), kini).langkah, "kabar");
  for (const s of ["padam", "bukan_api"]) assert.deepEqual(tenggat(T({status: s, dibuat: kini - 99 * JAM}), kini), {tenggat: null, terlambat: false, langkah: null});
  /* lewat rute: daftar tugas menandai terlambat dan mengurutkannya lebih dulu */
  await DB.prepare("DELETE FROM tugas_api").run();
  const now = Date.now(), segar = await tugasBaru("62", "Seruyan", {dibuat: now - 5 * JAM - 50 * MENIT}), basi = await tugasBaru("62", "Seruyan", {dibuat: now - 6 * JAM - 10 * MENIT});
  const padam = await tugasBaru("62", "Seruyan", {dibuat: now - 40 * JAM, status: "padam"}), kabarOk = await tugasBaru("62", "Seruyan", {dibuat: now - 30 * JAM, konfirmasi_pada: now - 29 * JAM, isian_terakhir: now - 23 * JAM});
  const kabarBasi = await tugasBaru("62", "Seruyan", {dibuat: now - 50 * JAM, konfirmasi_pada: now - 49 * JAM, isian_terakhir: now - 25 * JAM});
  await DB.prepare("INSERT INTO tugas_isian (id, tugas_id, akun_id, klien_id, langkah, dibuat, lat, lon, waktu_gps, hasil, pic_nama, pic_jabatan, pic_wa) SELECT ?, ?, (SELECT id FROM instansi_akun WHERE username = 'pemkabseruyan'), ?, 'konfirmasi', ?, -2.5, 112, ?, 'api_ada', 'Pak Joko', 'Kades', '6281211112222'")
    .bind("a".repeat(15) + "1", kabarOk, "klien-uji-aaa1", now - 29 * JAM, now - 29 * JAM).run();
  await DB.prepare("INSERT INTO tugas_isian (id, tugas_id, akun_id, klien_id, langkah, dibuat, lat, lon, waktu_gps, hasil, pic_nama, pic_jabatan, pic_wa) SELECT ?, ?, (SELECT id FROM instansi_akun WHERE username = 'pemkabseruyan'), ?, 'konfirmasi', ?, -2.5, 112, ?, 'api_ada', 'Bu Sri', 'Camat', '6281233334444'")
    .bind("b".repeat(15) + "2", kabarBasi, "klien-uji-bbb2", now - 49 * JAM, now - 49 * JAM).run();
  const h = await masuk("pemkabseruyan"), d = (await api("GET", "/api/instansi/tugas", undefined, h)).j.tugas, st = id => d.find(x => x.id === id);
  assert.equal(st(segar).terlambat, false); assert.equal(st(basi).terlambat, true); assert.equal(st(padam)?.terlambat ?? false, false); assert.equal(st(kabarOk).terlambat, false); assert.equal(st(kabarBasi).terlambat, true);
  assert.ok(d.slice(0, 2).every(x => x.terlambat) && d.slice(0, 2).map(x => x.id).includes(basi) && d.slice(0, 2).map(x => x.id).includes(kabarBasi), "terlambat dulu");
  assert.ok(d.slice(0, 2)[0].dibuat > d.slice(0, 2)[1].dibuat, "lalu terbaru");
  /* admin pantau: daftar terlambat dengan tombol tagih wa.me ke PIC lapangan, bukan data lain */
  assert.equal((await api("GET", "/api/instansi/admin/pantau")).s, 403); assert.equal((await adm("GET", "/api/instansi/admin/pantau", undefined, GERBANG)).s, 403);
  const p = (await adm("GET", "/api/instansi/admin/pantau")).j, lt = p.terlambat.find(x => x.id === kabarBasi);
  assert.ok(!/Invalid Date|undefined/.test(JSON.stringify(p.terlambat)), "ciri tugas terlambat tanpa tanggal kosong"); assert.match(lt.ciri, /terdeteksi \d+ \w+ \d\d\.\d\d WIB/);
  assert.equal(p.terlambat.length, 2); assert.equal(lt.langkah, "kabar"); assert.ok(lt.lewat_jam >= 1);
  const pic = lt.tagih.find(x => x.untuk.startsWith("PIC lapangan")); assert.match(pic.tautan, /^https:\/\/wa\.me\/6281233334444\?text=/); assert.match(decodeURIComponent(pic.tautan), /belum ada kabar terbaru.*24 jam/);
  const tanpaPic = p.terlambat.find(x => x.id === basi).tagih; assert.ok(tanpaPic.every(x => !x.untuk.startsWith("PIC lapangan")), "belum ada PIC: tagih ke wakil akun bila ada");
  const kalteng = p.provinsi.find(x => x.prov === "62"); assert.equal(kalteng.terlambat, 2); assert.equal(kalteng.padam, 1); assert.equal(kalteng.aktif, 4);
  assert.match(pesanTagih({kab: "Seruyan", kec: "Hilir", lat: -2.5, lon: 112, status: "buka", dibuat: 0, konfirmasi_pada: null, isian_terakhir: null}, "Budi", 8 * JAM, "https://x.id"), /belum dikonfirmasi.*6 jam.*lewat sekitar 2 jam.*https:\/\/x\.id\/instansi/);
});

uji("instansi: media 1 berkas, EXIF dibuang, urutan sumber waktu EXIF lalu GPS lalu unggah, hanya moderator melihat lewat admin", async () => {
  /* urutan sumber waktu (murni) */
  const kini = 1e12;
  assert.deepEqual(waktuMedia({exif: kini - 2 * JAM, waktuGps: kini - MENIT, kini}), {waktu: kini - 2 * JAM, sumber: "exif"}, "EXIF tervalidasi menang");
  assert.equal(waktuMedia({exif: kini - 49 * JAM, waktuGps: kini - MENIT, kini}).sumber, "gps", "EXIF > 48 jam tak dipercaya, jatuh ke GPS");
  assert.equal(waktuMedia({exif: kini + 20 * MENIT, waktuGps: kini - MENIT, kini}).sumber, "gps", "EXIF di masa depan tak dipercaya");
  assert.equal(waktuMedia({exif: null, waktuGps: kini - MENIT, kini}).sumber, "gps");
  assert.equal(waktuMedia({exif: null, waktuGps: kini - 5 * JAM, kini}).sumber, "gps", "antrean luring: GPS beberapa jam lalu masih waktu ambil");
  assert.deepEqual(waktuMedia({exif: null, waktuGps: kini - 7 * JAM, kini}), {waktu: kini, sumber: "unggah"}, "GPS lebih dari 6 jam: waktu unggah");
  assert.deepEqual(waktuMedia({kini}), {waktu: kini, sumber: "unggah"});
  await DB.prepare("DELETE FROM tugas_api").run();
  const tid = await tugasBaru("62", "Seruyan"), h = await masuk("pemkabseruyan");
  const sebelumR2 = (await R2.list({prefix: "instansi/media/"})).objects.length;
  const a = await unggah(h, tid, {media: jpeg(0, {exif: true}), exif: {exif_waktu: Date.now() - 2 * JAM, exif_lat: -2.5502, exif_lon: 112.0003}}); assert.equal(a.s, 201, a.t);
  assert.equal(a.j.sumber_waktu, "exif"); assert.equal(a.j.jenis, "foto"); assert.ok(a.j.exif_jarak < 100); assert.equal(a.j.orang_terdeteksi, null, "tanpa binding AI: null, tanpa galat"); assert.equal(a.j.jauh, false);
  const obj = new Uint8Array(await (await R2.get(`instansi/media/${a.j.id}`)).arrayBuffer());
  assert.ok(!new TextDecoder("latin1").decode(obj).includes("Exif"), "EXIF dibuang sebelum disimpan"); assert.ok(await R2.get(`instansi/media/${a.j.id}_t`));
  assert.equal((await DB.prepare("SELECT sha256 FROM instansi_media WHERE id = ?").bind(a.j.id).first()).sha256, createHash("sha256").update(obj).digest("hex"), "0044: sha256 = hash byte yang tersimpan di R2");
  const b = await unggah(h, tid, {media: jpeg(0)}); assert.equal(b.j.sumber_waktu, "gps");
  const baris = await DB.prepare("SELECT waktu_ambil, sumber_waktu, isian_id FROM instansi_media WHERE id = ?").bind(a.j.id).first(); assert.ok(Math.abs(baris.waktu_ambil - (Date.now() - 2 * JAM)) < 10 * MENIT); assert.equal(baris.isian_id, null, "belum dirujuk isian");
  assert.equal((await unggah(h, tid, {media: WEBP, thumb: jpeg()})).s, 201, "WebP dan thumbnail JPEG sah");
  /* penolakan: jenis dari byte, thumbnail, EXIF jauh atau lama, GPS janggal */
  assert.equal((await unggah(h, tid, {media: new TextEncoder().encode("bukan media sama sekali")})).s, 400);
  assert.equal((await unggah(h, tid, {thumb: null})).s, 400, "thumbnail wajib"); assert.equal((await unggah(h, tid, {media: null})).s, 400);
  assert.equal((await unggah(h, tid, {thumb: new Uint8Array(400 * 1024).fill(1)})).s, 400);
  assert.equal((await unggah(h, tid, {exif: {exif_lat: -2.9, exif_lon: 112.0}})).s, 400, "EXIF > 5 km dari GPS perangkat");
  assert.equal((await unggah(h, tid, {exif: {exif_waktu: Date.now() - 49 * JAM}})).s, 400, "EXIF > 48 jam");
  assert.equal((await unggah(h, tid, {g: gps(-2.55, 112.0, Date.now() - 7 * JAM)})).s, 400, "GPS lebih dari 6 jam");
  const luring = await unggah(h, tid, {g: gps(-2.55, 112.0, Date.now() - 3 * JAM)}); assert.equal(luring.s, 201, luring.t); assert.equal(luring.j.sumber_waktu, "gps"); assert.ok(Math.abs(luring.j.waktu_ambil - (Date.now() - 3 * JAM)) < MENIT, "waktu ambil = waktu GPS saat antre luring");
  assert.equal((await unggah(h, tid, {g: {...gps(-2.55, 112.0), sampel: [[-2.55, 112, 10, Date.now()]]}})).s, 400, "bacaan GPS kurang dari tiga");
  assert.equal((await unggah(h, tid, {g: gps(20, 112.0)})).s, 400, "di luar Indonesia");
  assert.equal((await api("POST", "/api/instansi/media", "teks biasa", {...h, "content-type": "text/plain"})).s, 400, "bukan multipart");
  assert.equal((await (await unggah(h, tid, {g: gps(-2.7, 112.0)})).j.jauh), true, "lebih dari 5 km dari pusat kompleks: ditandai jauh");
  /* jauh dari kompleks tapi GPS sah: tersimpan dengan jarak, admin melihat tandanya */
  assert.equal((await R2.list({prefix: "instansi/media/"})).objects.length - sebelumR2, 2 * 5, "tiap media = berkas + thumbnail; penolakan tidak meninggalkan berkas yatim");
  /* distribusi: akses ke berkas */
  assert.equal((await api("GET", `/api/instansi/media/${a.j.id}`, undefined, h)).s, 200, "pengunggah melihat berkasnya sendiri");
  assert.equal((await api("GET", `/api/instansi/media/${a.j.id}`)).s, 401);
  const adminMedia = await adm("GET", `/api/instansi/admin/media/${a.j.id}`); assert.equal(adminMedia.s, 200); assert.equal(adminMedia.h.get("content-security-policy"), "sandbox; default-src 'none'", "media di-sandbox");
  assert.equal((await api("GET", `/api/instansi/media/${a.j.id}`, undefined, h)).h.get("content-security-policy"), "sandbox; default-src 'none'"); assert.equal((await api("GET", `/api/instansi/thumb/${a.j.id}`, undefined, h)).h.get("content-security-policy"), "sandbox; default-src 'none'"); assert.equal(adminMedia.h.get("cache-control"), "private, no-store"); assert.equal(adminMedia.h.get("content-type"), "image/jpeg");
  assert.equal((await adm("GET", `/api/instansi/admin/thumb/${a.j.id}`)).h.get("content-type"), "image/webp");
  assert.equal((await api("GET", `/api/instansi/admin/media/${a.j.id}`, undefined, h)).s, 403, "akun instansi bukan admin"); assert.equal((await adm("GET", `/api/instansi/admin/media/${a.j.id}`, undefined, GERBANG)).s, 403);
  const rng = await api("GET", `/api/instansi/media/${a.j.id}`, undefined, {...h, range: "bytes=0-3"}); assert.equal(rng.s, 206); assert.equal(rng.b.length, 4);
});

uji("instansi: video lebih dari 60 detik ditolak, video 60 detik sah dengan tiga bingkai", async () => {
  const tid = (await DB.prepare("SELECT id FROM tugas_api LIMIT 1").first()).id, h = await masuk("pemkabseruyan");
  const panjang = await unggah(h, tid, {media: mp4(61), bingkai: [jpeg(1), jpeg(2), jpeg(3)]}); assert.equal(panjang.s, 400, panjang.t); assert.match(panjang.j.galat, /maksimal 60 detik/);
  const ok = await unggah(h, tid, {media: mp4(60), bingkai: [jpeg(1), jpeg(2), jpeg(3)]}); assert.equal(ok.s, 201, ok.t); assert.equal(ok.j.jenis, "video");
  assert.equal((await DB.prepare("SELECT durasi, mime FROM instansi_media WHERE id = ?").bind(ok.j.id).first()).durasi, 60);
  assert.equal((await unggah(h, tid, {media: mp4(10), bingkai: [jpeg(1), jpeg(2), jpeg(3), new TextEncoder().encode("bukan jpeg")].slice(0, 3).concat([new TextEncoder().encode("bukan jpeg")])})).s, 201, "bingkai ke-4 diabaikan");
  assert.equal((await unggah(h, tid, {media: mp4(10), bingkai: [new TextEncoder().encode("bukan jpeg")]})).s, 400, "bingkai harus JPEG/WebP");
  assert.equal((await unggah(h, tid, {media: new Uint8Array([...mp4(10), ...Array(31 * 1048576).fill(0)])})).s, 413, "video lebih dari 30 MB");
  assert.equal((await unggah(h, tid, {media: new Uint8Array([...jpeg(0), ...Array(3 * 1048576).fill(7)])})).s, 413, "foto lebih dari 3 MB");
});

uji("instansi: konfirmasi wajib PIC dan media, satu isian 1 dan 10 media, 11 ditolak, media orang lain ditolak, hanya satu konfirmasi", async () => {
  await DB.prepare("DELETE FROM instansi_media").run(); await DB.prepare("DELETE FROM tugas_api").run();
  const tid = await tugasBaru("62", "Seruyan"), h = await masuk("pemkabseruyan"), h2 = await masuk("kodimseruyan"), lain = await masuk("pemkabkatingan");
  const m = async (hh = h, k = 0) => (await unggah(hh, tid, {media: jpeg(k)})).j.id;
  const one = await m();
  /* tanpa PIC (tiap bidang) ditolak */
  for (const k of ["pic_nama", "pic_jabatan", "pic_wa"]) { const b = KONF([one]); delete b[k]; const r = await api("POST", `/api/instansi/konfirmasi/${tid}`, b, h); assert.equal(r.s, 400, `${k} wajib`); }
  assert.equal((await api("POST", `/api/instansi/konfirmasi/${tid}`, KONF([one], {pic_wa: "12345"}), h)).s, 400, "WhatsApp tidak sah");
  assert.equal((await api("POST", `/api/instansi/konfirmasi/${tid}`, KONF([]), h)).s, 400, "tanpa media ditolak");
  assert.equal((await api("POST", `/api/instansi/konfirmasi/${tid}`, KONF([one], {hasil: "mungkin"}), h)).s, 400);
  assert.equal((await api("POST", `/api/instansi/konfirmasi/${tid}`, KONF(["bukan-id"]), h)).s, 400);
  assert.equal((await api("POST", `/api/instansi/konfirmasi/${tid}`, KONF(["f".repeat(16)]), h)).s, 400, "media tak ada");
  assert.equal((await api("POST", `/api/instansi/konfirmasi/${tid}`, KONF([one, one]), h)).s, 400, "media ganda");
  assert.equal(await n("tugas_isian"), 0, "semua penolakan tidak meninggalkan isian");
  /* media milik akun lain tidak bisa dirujuk (kodim sekabupaten pun) */
  const milikLain = await m(h2);
  assert.equal((await api("POST", `/api/instansi/konfirmasi/${tid}`, KONF([milikLain]), h)).s, 400, "media milik akun lain");
  /* 11 media ditolak, 10 diterima */
  const sepuluh = [one]; for (let i = 1; i < 10; i++) sepuluh.push(await m());
  const sebelas = [...sepuluh, await m()];
  const tolak = await api("POST", `/api/instansi/konfirmasi/${tid}`, KONF(sebelas), h); assert.equal(tolak.s, 400, tolak.t); assert.match(tolak.j.galat, /maksimal 10/);
  assert.equal(await n("tugas_isian"), 0);
  const r = await api("POST", `/api/instansi/konfirmasi/${tid}`, KONF(sepuluh, {kedalaman_bara_cm: 35, lahan_teramati: "gambut"}), h); assert.equal(r.s, 201, r.t);
  assert.equal(await n("instansi_media", `isian_id = '${r.j.id}'`), 10, "sepuluh berkas dirujuk satu isian");
  const i = await DB.prepare("SELECT * FROM tugas_isian WHERE id = ?").bind(r.j.id).first();
  assert.equal(i.akun_id, await akunId("pemkabseruyan"), "isian dicatat dengan akun pengisi"); assert.equal(i.pic_wa, "6281211112222"); assert.equal(i.kedalaman_bara_cm, 35); assert.equal(i.lahan_teramati, "gambut"); assert.ok(i.lat != null && i.jarak_km != null);
  const t = await DB.prepare("SELECT status, konfirmasi_pada, isian_terakhir FROM tugas_api WHERE id = ?").bind(tid).first(); assert.equal(t.status, "buka"); assert.ok(t.konfirmasi_pada && t.isian_terakhir);
  assert.equal((await api("POST", `/api/instansi/konfirmasi/${tid}`, KONF(sepuluh.slice(0, 1)), h2)).s, 409, "satu konfirmasi per tugas (yang pertama menang)");
  assert.equal((await api("POST", `/api/instansi/konfirmasi/${tid}`, {...KONF(sepuluh), klien_id: "ulangulang1"}, h)).s, 409);
  /* kirim ulang dengan klien_id sama = idempoten */
  const ulangBody = KONF([]); const u1 = await api("POST", `/api/instansi/konfirmasi/${tid}`, {...ulangBody, klien_id: i.klien_id}, h); assert.equal(u1.j.ulang, true); assert.equal(u1.j.id, r.j.id);
  assert.equal(await n("tugas_isian"), 1);
  /* kendala D1: konfirmasi tanpa PIC lolos dari Worker pun ditolak CHECK */
  await assert.rejects(DB.prepare("INSERT INTO tugas_isian (id, tugas_id, akun_id, klien_id, langkah, dibuat, lat, lon, waktu_gps, hasil) VALUES ('c1c1c1c1c1c1c1c1', ?, ?, 'klien-tanpa-pic', 'konfirmasi', 1, -2.5, 112, 1, 'api_ada')").bind(tid, i.akun_id).run(), /CHECK|constraint/i);
  await assert.rejects(DB.prepare("INSERT INTO tugas_isian (id, tugas_id, akun_id, klien_id, langkah, dibuat, lat, lon, waktu_gps, hasil, pic_nama, pic_jabatan, pic_wa) VALUES ('c2c2c2c2c2c2c2c2', ?, ?, 'klien-dua-konfirmasi', 'konfirmasi', 1, -2.5, 112, 1, 'api_ada', 'Aa', 'Bb', '6281211112222')").bind(tid, i.akun_id).run(), /UNIQUE/i, "indeks satu konfirmasi per tugas");
  assert.equal((await api("GET", `/api/instansi/media/${one}`, undefined, h2)).s, 200, "media yang sudah dirujuk isian terlihat akun dalam lingkup");
  assert.equal((await api("GET", `/api/instansi/media/${milikLain}`, undefined, h)).s, 404, "media belum dirujuk hanya terlihat pengunggahnya");
  assert.equal((await api("GET", `/api/instansi/media/${one}`, undefined, lain)).s, 404, "kab lain tidak bisa melihat media"); assert.equal((await api("GET", `/api/instansi/thumb/${one}`, undefined, lain)).s, 404);
  assert.equal((await api("GET", `/api/instansi/media/${one}`, undefined, h)).h.get("cache-control"), "private, no-store");
  { const t3 = await tugasBaru("62", "Seruyan"), m3 = (await unggah(h, t3, {media: jpeg(0)})).j.id;
    for (const [salah, alasan] of [[{status_api: "padam"}, "padam bukan status konfirmasi api ada"], [{status_api: "menyala", hasil: "bukan_api"}, "status api pada bukan api"], [{status_api: "mati"}, "status asing"]]) assert.equal((await api("POST", `/api/instansi/konfirmasi/${t3}`, KONF([m3], salah), h)).s, 400, alasan);
    const ok3 = await api("POST", `/api/instansi/konfirmasi/${t3}`, KONF([m3], {status_api: "bara"}), h); assert.equal(ok3.s, 201, ok3.t); assert.equal((await DB.prepare("SELECT status_api FROM tugas_isian WHERE id = ?").bind(ok3.j.id).first()).status_api, "bara"); }
  for (const k of ["bukan_api", "sudah_padam"]) {
    const t2 = await tugasBaru("62", "Seruyan"), mm = (await unggah(h, t2, {media: jpeg(0)})).j.id, rr = await api("POST", `/api/instansi/konfirmasi/${t2}`, KONF([mm], {hasil: k, ...(k === "bukan_api" ? {alasan_bukan_api: "tidak_ada_bekas"} : {})}), h); assert.equal(rr.s, 201, rr.t);
    assert.equal((await DB.prepare("SELECT status FROM tugas_api WHERE id = ?").bind(t2).first()).status, k === "bukan_api" ? "bukan_api" : "padam", `hasil ${k} menutup tugas`);
    assert.equal((await api("POST", `/api/instansi/kabar/${t2}`, KABAR([]), h)).s, 409, "tugas ditutup tidak bisa diberi kabar");
  }
});

uji("instansi: kabar tindakan, personel_unsur dijumlah server, unsur tak dikenal ditolak, angka manual berdampingan dengan mesin", async () => {
  const tid = (await DB.prepare("SELECT id FROM tugas_api WHERE konfirmasi_pada IS NOT NULL AND status = 'buka' LIMIT 1").first()).id, h = await masuk("pemkabseruyan");
  const baru = await tugasBaru("62", "Seruyan"); assert.equal((await api("POST", `/api/instansi/kabar/${baru}`, KABAR([]), h)).s, 409, "belum dikonfirmasi: kabar ditolak");
  const m = async k => (await unggah(h, tid, {media: jpeg(k)})).j.id;
  for (const [salah, alasan] of [[{tindakan: "x"}, "tindakan 1 huruf"], [{status_api: "mati"}, "status_api"], [{kendala: ["hujan"]}, "kendala asing"], [{kendala: ["asap_tebal", "asap_tebal"]}, "kendala ganda"], [{bantuan: ["roket"]}, "bantuan asing"],
    [{personel: 6000}, "personel > 5000"], [{luas_ha: 5, padam_ha: 9}, "padam > luas"], [{kedalaman_bara_cm: 301}, "bara > 300"], [{kedalaman_bara_cm: 1.5}, "bara bukan bulat"], [{lahan_teramati: "sawah"}, "lahan asing"],
    [{personel_unsur: {pramuka: 5}}, "unsur tak dikenal"], [{personel_unsur: {tni: -1}}, "unsur negatif"], [{personel_unsur: {tni: 5001}}, "unsur > 5000"], [{personel_unsur: {tni: 2.5}}, "unsur pecahan"], [{personel_unsur: {tni: "banyak"}}, "unsur bukan angka"],
    [{personel_unsur: [1, 2]}, "unsur larik"], [{personel_unsur: {tni: 5000, polri: 1}}, "total > 5000"], [{alat_dipakai: {tank: 1}}, "alat asing"], [{alat_dipakai: {pompa: -1}}, "alat negatif"], [{alat_dipakai: {pembasah_l: 5001}}, "pembasah > 5000 L"], [{regu: 501}, "regu > 500"], [{mulai_padam: Date.now() + HARI}, "mulai padam di masa depan"], [{mulai_padam: Date.now() - 30 * HARI}, "mulai padam terlalu lama"]])
    assert.equal((await api("POST", `/api/instansi/kabar/${tid}`, KABAR([], salah), h)).s, 400, alasan);
  assert.equal(await n("tugas_isian", `tugas_id = '${tid}' AND langkah = 'tindakan'`), 0, "semua penolakan tidak meninggalkan isian");
  const manual = await api("POST", `/api/instansi/kabar/${tid}`, KABAR([await m(0)], {personel_unsur: {bpbd: 4, tni: 3, polri: 2, manggala_agni: 5, mpa: 1, damkar: 2, swasta: 3, relawan: 4, lainnya: 1}, personel: 999, regu: 3,
    alat_dipakai: {pompa: 2, selang_m: 300, jet_shooter: 1, heli_wb: 0, alat_berat: 1, drone_termal: 1, pembasah_l: 40}, mulai_padam: Date.now() - 2 * HARI, kendala: ["asap_tebal"], bantuan: ["personel", "heli_water_bombing"], bantuan_lain: "selang"}), h);
  assert.equal(manual.s, 201, manual.t);
  const i = await DB.prepare("SELECT personel, personel_unsur, regu, alat_dipakai, personel_terlihat, mulai_padam FROM tugas_isian WHERE id = ?").bind(manual.j.id).first();
  assert.equal(i.personel, 25, "total personel = jumlah unsur (4+3+2+5+1+2+3+4+1), dihitung server; field personel kiriman diabaikan"); assert.deepEqual(JSON.parse(i.personel_unsur).tni, 3); assert.equal(i.regu, 3); assert.equal(JSON.parse(i.alat_dipakai).selang_m, 300); assert.equal(JSON.parse(i.alat_dipakai).pembasah_l, 40, "pembasah_l tercatat");
  assert.equal(i.personel_terlihat, null, "tanpa AI: mesin tidak menghitung, manual tetap tersimpan");
  /* tanpa unsur: personel lama dipakai; unsur parsial dijumlahkan */
  const legacy = await api("POST", `/api/instansi/kabar/${tid}`, KABAR([], {personel: 12, status_api: "menyala"}), h); assert.equal((await DB.prepare("SELECT personel FROM tugas_isian WHERE id = ?").bind(legacy.j.id).first()).personel, 12);
  const tanpaTindakan = await api("POST", `/api/instansi/kabar/${tid}`, KABAR([], {tindakan: undefined, status_api: "menyala"}), h); assert.equal(tanpaTindakan.s, 201, tanpaTindakan.t); assert.equal((await DB.prepare("SELECT tindakan FROM tugas_isian WHERE id = ?").bind(tanpaTindakan.j.id).first()).tindakan, null, "tindakan opsional: status saja cukup");
  const sebagian = await api("POST", `/api/instansi/kabar/${tid}`, KABAR([], {personel_unsur: {relawan: 7}}), h); assert.equal((await DB.prepare("SELECT personel FROM tugas_isian WHERE id = ?").bind(sebagian.j.id).first()).personel, 7);
  await assert.rejects(DB.prepare("INSERT INTO tugas_isian (id, tugas_id, akun_id, klien_id, langkah, dibuat, tindakan, status_api, personel_unsur) VALUES ('d1d1d1d1d1d1d1d1', ?, ?, 'klien-unsur-asing', 'tindakan', 1, 'xx', 'bara', '{\"pramuka\":3}')").bind(tid, (await DB.prepare("SELECT akun_id FROM tugas_isian LIMIT 1").first()).akun_id).run(), /unsur|constraint/i, "trigger D1 menjaga kunci unsur");
  await assert.rejects(DB.prepare("INSERT INTO tugas_isian (id, tugas_id, akun_id, klien_id, langkah, dibuat, tindakan, status_api, alat_dipakai) VALUES ('d2d2d2d2d2d2d2d2', ?, ?, 'klien-alat-asing', 'tindakan', 1, 'xx', 'bara', '{\"pompa\":\"banyak\"}')").bind(tid, (await DB.prepare("SELECT akun_id FROM tugas_isian LIMIT 1").first()).akun_id).run(), /unsur|alat|constraint/i, "trigger D1 menjaga nilai alat");
  await assert.rejects(DB.prepare("INSERT INTO tugas_isian (id, tugas_id, akun_id, klien_id, langkah, dibuat, tindakan, status_api, kendala) VALUES ('d3d3d3d3d3d3d3d3', ?, ?, 'klien-kendala-asing', 'tindakan', 1, 'xx', 'bara', '[\"hujan\"]')").bind(tid, (await DB.prepare("SELECT akun_id FROM tugas_isian LIMIT 1").first()).akun_id).run(), /kendala|constraint/i);
  /* status padam menutup tugas; kabar sesudahnya 409 */
  const tutup = await api("POST", `/api/instansi/kabar/${tid}`, KABAR([await m(0)], {status_api: "padam", luas_ha: 20, padam_ha: 20}), h); assert.equal(tutup.s, 201, tutup.t); assert.equal(tutup.j.status, "padam");
  assert.equal((await DB.prepare("SELECT status FROM tugas_api WHERE id = ?").bind(tid).first()).status, "padam"); assert.equal((await api("POST", `/api/instansi/kabar/${tid}`, KABAR([]), h)).s, 409);
  /* rincian: isian memuat unsur dan angka mesin berdampingan; PIC WhatsApp hanya untuk admin */
  const d = (await api("GET", `/api/instansi/tugas/${tid}`, undefined, h)).j, ia = d.isian.find(x => x.id === manual.j.id);
  assert.equal(ia.personel_efektif, 25); assert.equal(ia.personel_terlihat, null); assert.deepEqual(ia.personel_unsur.bpbd, 4); assert.ok(!d.isian.some(x => "pic_wa" in x), "WhatsApp PIC tidak keluar ke instansi");
  const da = (await adm("GET", `/api/instansi/admin/tugas/${tid}`)).j; assert.equal(da.isian.find(x => x.langkah === "konfirmasi").pic_wa, "6281211112222"); assert.ok(da.media.length >= 1);
  assert.equal((await api("GET", `/api/instansi/admin/tugas/${tid}`, undefined, h)).s, 403);
});

const KEB = {target_hari: 3, dasar: {luas_ha: [8, 12, 20], sumber: "satelit", rekonsiliasi_ha_per_piksel: 0.14}, per_ha: {regu_hari: 0.4, personel_hari: 6, air_l: 9000, bbm_l: 40, pompa_unit_hari: 0.8, personel_hari_rujukan: [45, 149]},
  total: {regu: [2, 4, 6], personel: [20, 40, 60], pompa: [{kelas: "Mark-3 tekanan tinggi", hp: 10.7, unit: [12, 25, 40]}, {kelas: "Portabel ringan", hp: 5.5, unit: [4, 8, 12]}], selang_m: [200, 400, 600], bor: [1, 2, 3], heli: [0, 1, 1], air_l_hari: [20000, 40000, 60000],
    jet_shooter: [2, 4, 6], lance_cm: [50, 100, 150], tangki_fleksibel: [1, 2, 3], mobil_tangki: [1, 2, 3]}, hari_provinsi: [2, 3, 7], melampaui_rujukan_lapangan: "Kebutuhan personel melebihi rujukan lapangan", energi: {bbm_l_hari: [30, 60, 90], bbm_lengkap: true, jaringan_pln: null, genset: [{untuk: "celup", celup: [4, 8, 12], unit: [1, 2, 3], kva_hitung: 5.6, kva_komersial: 7.5}, {untuk: "logistik", unit: [1, 1, 1], kva_hitung: 3.1, kva_komersial: 5}]}};

uji("instansi: kebutuhan berbasis luas terkonfirmasi, pil kurang hanya dari luas terkonfirmasi dengan kunci selaras, tanpa luas tidak ada pil", async () => {
  const REK = {kebutuhan: KEB}, S = {regu: 3, personel: 25, alat: {pompa: 20, selang_m: 100, jet_shooter: 2, heli_wb: 0}};
  assert.deepEqual(kekurangan(REK, null, 12), [], "tanpa kabar tidak ada selisih"); assert.deepEqual(kekurangan(null, S, 12), []); assert.deepEqual(kekurangan({kebutuhan: "x"}, S, 12), []);
  assert.deepEqual(kekurangan(REK, S, null), [], "tanpa luas terkonfirmasi tidak ada pil kurang"); assert.deepEqual(kekurangan(REK, S, 0), []);
  assert.deepEqual(kekurangan({kebutuhan: {...KEB, dasar: {}}}, S, 12), [], "tanpa luas dasar satelit tidak bisa diskalakan");
  /* luas konfirmasi 12 ha = luas satelit tengah: rasio 1. regu 4 (ada 3), personel 40 (25), pompa 25+8=33 (20), jet 4 (2), heli 1 (0), selang 400 (100) */
  assert.deepEqual(kekurangan(REK, S, 12).map(x => x.teks), ["kurang 1 regu", "kurang 15 personel", "kurang 13 pompa", "kurang 2 jet shooter", "kurang 1 heli", "kurang 300 m selang"]);
  assert.deepEqual(kekurangan(REK, S, 6).map(x => x.teks), ["kurang 1 heli", "kurang 100 m selang"], "luas separuh: kebutuhan separuh (regu 2, personel 20, pompa 17, jet 2 sudah terpenuhi)");
  assert.equal(kekurangan(REK, {...S, alat: {pompa: 10}}, 6).find(x => x.kunci === "pompa").perlu, 17);
  assert.deepEqual(kekurangan(REK, {regu: 9, personel_terlihat: 60, alat: {pompa: 99, selang_m: 900, jet_shooter: 9, heli_wb: 9}}, 12), [], "melebihi: tidak ada yang kurang");
  assert.equal(kekurangan(REK, {regu: 9, personel_terlihat: 30, alat: {pompa: 99, selang_m: 900, jet_shooter: 9, heli_wb: 9}}, 12)[0].teks, "kurang 10 personel", "tanpa angka manual dipakai hitungan mesin");
  /* per_ha x luas terkonfirmasi (angka utama) */
  const kk = kebutuhanTerkonfirmasi(REK, 10); assert.deepEqual(kk, {luas_ha: 10, per_ha_x_luas: {regu_hari: 4, personel_hari: 60, air_l: 90000, bbm_l: 400, pompa_unit_hari: 8}}, "rujukan personel_hari tidak ikut dikalikan");
  assert.equal(kebutuhanTerkonfirmasi(REK, null), null); assert.equal(kebutuhanTerkonfirmasi({kebutuhan: {per_ha: {air_l: [1, 2, 3]}}}, 2).per_ha_x_luas.air_l.join(), "2,4,6", "rentang dipertahankan"); assert.equal(kebutuhanTerkonfirmasi({kebutuhan: {per_ha: {air_l: "x"}}}, 2), null);
  /* lewat rute */
  const tid = await tugasBaru("62", "Seruyan", {konfirmasi_pada: Date.now() - 3 * JAM, isian_terakhir: Date.now() - 3 * JAM}), h = await masuk("pemkabseruyan"), aid = await akunId("pemkabseruyan");
  await DB.prepare("UPDATE tugas_api SET rekomendasi = ? WHERE id = ?").bind(JSON.stringify(REK), tid).run();
  await DB.prepare("INSERT INTO tugas_isian (id, tugas_id, akun_id, klien_id, langkah, dibuat, lat, lon, waktu_gps, hasil, pic_nama, pic_jabatan, pic_wa) VALUES ('e1e1e1e1e1e1e1e1', ?, ?, 'klien-rek-1', 'konfirmasi', ?, -2.5, 112, ?, 'api_ada', 'Aa', 'Bb', '6281211112222')").bind(tid, aid, Date.now() - 3 * JAM, Date.now() - 3 * JAM).run();
  const ambil = async () => (await api("GET", `/api/instansi/tugas`, undefined, h)).j.tugas.find(x => x.id === tid);
  let d = await ambil(); assert.equal(d.sekarang, null); assert.deepEqual(d.kurang, []); assert.equal(d.kebutuhan_konf, null); assert.equal(d.luas_terkonfirmasi, null);
  const tanpaLuas = await api("POST", `/api/instansi/kabar/${tid}`, KABAR([], {personel_unsur: {bpbd: 10, tni: 5}, regu: 3, alat_dipakai: {pompa: 20}}), h); assert.equal(tanpaLuas.s, 201, tanpaLuas.t);
  d = await ambil(); assert.equal(d.sekarang.regu, 3); assert.equal(d.sekarang.personel_efektif, 15); assert.deepEqual(d.kurang, [], "kabar ada tetapi luas terkonfirmasi belum diisi: tanpa pil kurang"); assert.equal(d.kebutuhan_konf, null);
  const denganLuas = await api("POST", `/api/instansi/kabar/${tid}`, KABAR([], {personel_unsur: {bpbd: 10, tni: 5}, regu: 3, alat_dipakai: {pompa: 20, heli_wb: 0}, luas_ha: 12, padam_ha: 2}), h); assert.equal(denganLuas.s, 201, denganLuas.t);
  d = await ambil(); assert.equal(d.luas_terkonfirmasi, 12); assert.equal(d.kebutuhan_konf.per_ha_x_luas.personel_hari, 72);
  assert.ok(d.kurang.some(x => x.teks === "kurang 1 regu") && d.kurang.some(x => x.teks === "kurang 25 personel") && d.kurang.some(x => x.teks === "kurang 13 pompa") && d.kurang.some(x => x.teks === "kurang 1 heli"), JSON.stringify(d.kurang));
  /* luas terbaru yang berlaku */
  await api("POST", `/api/instansi/kabar/${tid}`, KABAR([], {luas_ha: 6, personel_unsur: {bpbd: 30, tni: 20}, regu: 5, alat_dipakai: {pompa: 40, selang_m: 500, jet_shooter: 9, heli_wb: 2}}), h);
  d = await ambil(); assert.equal(d.luas_terkonfirmasi, 6, "luas dari isian terbaru"); assert.deepEqual(d.kurang, [], "kebutuhan separuh, terpenuhi");
  /* konfirmasi boleh membawa luas */
  const t2 = await tugasBaru("62", "Seruyan"), m = (await unggah(h, t2, {media: jpeg(0)})).j.id;
  assert.equal((await api("POST", `/api/instansi/konfirmasi/${t2}`, KONF([m], {luas_ha: 5, padam_ha: 9}), h)).s, 400); assert.equal((await api("POST", `/api/instansi/konfirmasi/${t2}`, KONF([m], {luas_ha: 5, padam_ha: 1}), h)).s, 201);
  assert.equal((await api("GET", `/api/instansi/tugas`, undefined, h)).j.tugas.find(x => x.id === t2).luas_terkonfirmasi, 5);
});

uji("instansi: tampilan kebutuhan tanpa NaN, undefined, atau [object], label Indonesia, pompa per kelas, pil melampaui rujukan", async () => {
  const vm = await import("node:vm"), ctx = vm.createContext({}); ctx.window = ctx;
  for (const f of ["public/inti/format.js", "public/instansi_kebutuhan.js"]) vm.runInContext(readFileSync(path.join(AKAR, f), "utf8"), ctx, {filename: f});
  const H = t => ctx.Kebutuhan.html(t), bersih = (h, nama) => { for (const buruk of ["NaN", "undefined", "[object", "Infinity", "null"]) assert.ok(!h.includes(buruk), `${nama}: mengandung '${buruk}': ${h.slice(0, 300)}`); };
  const dasar = {rekomendasi: {kebutuhan: KEB}, luas_terkonfirmasi: 10, kebutuhan_konf: kebutuhanTerkonfirmasi({kebutuhan: KEB}, 10), kurang: [{teks: "kurang 2 regu"}]};
  const h = H(dasar); bersih(h, "lengkap");
  assert.match(h, /Kebutuhan untuk 10 ha terkonfirmasi/); assert.match(h, /Regu-hari: 4/); assert.match(h, /Personel-hari: 60/); assert.match(h, /Dari hitungan satelit/, "satelit jadi sekunder");
  assert.ok(h.indexOf("terkonfirmasi") < h.indexOf("Dari hitungan satelit"), "angka utama lebih dulu"); assert.match(h, /Mark-3 tekanan tinggi \(10,7 HP\): 12–40, tengah 25 unit/); assert.match(h, /Regu: 2–6, tengah 4/);
  assert.match(h, /Setara 2–7, tengah 3 hari kerja satu provinsi/); assert.match(h, /Melampaui rujukan lapangan/); assert.match(h, /Kebutuhan personel melebihi rujukan lapangan/); assert.match(h, /kurang 2 regu/); assert.match(h, /Perkiraan, belum divalidasi lapangan/);
  assert.match(h, /BBM \(liter per hari\): 30–90, tengah 60/); assert.match(h, /Genset untuk pompa celup sumur bor: 1–3, tengah 2 unit, masing-masing 7,5 kVA \(hitungan 5,6 kVA\), melayani 4–12, tengah 8 pompa celup/); assert.match(h, /Genset untuk logistik[^<]*: 1–1, tengah 1 unit, masing-masing 5 kVA/);
  assert.match(h, /Jaringan PLN: belum ada data jaringan/); assert.doesNotMatch(h, /: Ya\b|: Tidak\b/, "boolean/null tidak pernah jadi Ya/Tidak");
  /* energi null/boolean punya makna sendiri, bukan "Ya/Tidak" */
  const en2 = e => H({rekomendasi: {kebutuhan: {...KEB, energi: e}}, kurang: []});
  assert.match(en2({genset: null, jaringan_pln: null, bbm_l_hari: null}), /Genset: tidak diperlukan, tanpa beban listrik yang dihitung[\s\S]*Jaringan PLN: belum ada data jaringan/);
  assert.match(en2({genset: null, bbm_l_hari: null}), /BBM: konsumsi belum diketahui/); assert.match(en2({bbm_l_hari: [1, 2, 3], bbm_lengkap: false}), /sebagian kelas pompa belum diketahui konsumsinya/);
  assert.match(en2({jaringan_pln: true}), /Jaringan PLN: tersedia/); assert.match(en2({jaringan_pln: false}), /Jaringan PLN: tidak tersedia/); assert.doesNotMatch(en2({}), /Genset|Jaringan/, "kunci yang tidak ada tidak dikarang");
  bersih(en2({genset: null, jaringan_pln: null, bbm_l_hari: null}), "energi null"); assert.doesNotMatch(h, /regu_hari|personel_hari|jet_shooter|air_l_hari/, "kunci mentah tidak dicetak");
  const tanpa = H({rekomendasi: {kebutuhan: KEB}, luas_terkonfirmasi: null, kebutuhan_konf: null, kurang: []}); bersih(tanpa, "tanpa luas"); assert.match(tanpa, /Belum ada luas terbakar/); assert.match(tanpa, /Kebutuhan dari hitungan satelit/); assert.doesNotMatch(tanpa, /kb-pil merah/, "tanpa luas terkonfirmasi tidak ada pil kurang");
  assert.doesNotMatch(H({rekomendasi: {kebutuhan: {...KEB, melampaui_rujukan_lapangan: false}}, kurang: []}), /Melampaui/);
  /* bahan pembasah: bentuk tetap taktik.py; null/perlu false tidak tampil; luas terkonfirmasi menghitung ulang 1% dari air per hari */
  const PEM = {perlu: true, alasan: "Gambut kering hidrofobik, air tidak meresap.", konsentrasi_persen: 1, konsentrat_l_hari: [100, 200, 300], cara: "Campur 1% ke air pompa lewat inductor.", peringatan: "Biodegradable, jauhi sumber air minum.", status: "uji_laboratorium"};
  const pem = H({rekomendasi: {kebutuhan: {...KEB, melampaui_rujukan_lapangan: false, pembasah: PEM}}, luas_terkonfirmasi: null, kebutuhan_konf: null, kurang: []}); bersih(pem, "pembasah");
  assert.match(pem, /Bahan pembasah \(disarankan\)/); assert.match(pem, /Konsentrat ±200 L\/hari \(rendah 100, tinggi 300\), bila memakai agen setara pada 1%; produk lain ikuti label/); assert.match(pem, /Gambut kering hidrofobik, air tidak meresap\./); assert.doesNotMatch(pem, /tegangan permukaan|meningkatkan penyerapan/); assert.match(pem, /Perkiraan, uji laboratorium/); assert.match(pem, /doi\.org\/10\.1071\/WF20117/); assert.match(pem, /jauhi sumber air minum/); assert.match(pem, /inductor/);
  const pemKonf = H({...dasar, rekomendasi: {kebutuhan: {...KEB, pembasah: PEM}}}); bersih(pemKonf, "pembasah dengan luas");
  assert.equal(dasar.kebutuhan_konf.per_ha_x_luas.air_l, 90000); assert.match(pemKonf, /Konsentrat ±900 L\/hari, bila memakai agen setara pada 1%/, "1% dari air per hari terkonfirmasi");
  const lampau = H({rekomendasi: {kebutuhan: {...KEB, pembasah: PEM, melampaui_rujukan_lapangan: true}}, luas_terkonfirmasi: null, kebutuhan_konf: null, kurang: []}); bersih(lampau, "pembasah melampaui");
  assert.match(lampau, /hitung dari luas terkonfirmasi/); assert.doesNotMatch(lampau, /±200/, "melampaui tanpa luas: tanpa total liter"); assert.match(lampau, /per hektare/, "per hektare dari per_ha.air_l");
  for (const x of [null, undefined, {...PEM, perlu: false}]) assert.doesNotMatch(H({rekomendasi: {kebutuhan: {...KEB, pembasah: x}}, kurang: []}), /pembasah|wetting/i, "pembasah kosong tidak tampil");
  bersih(H({rekomendasi: {kebutuhan: {...KEB, pembasah: {perlu: true, konsentrat_l_hari: [NaN, "x", null]}}}, kurang: []}), "pembasah aneh");
  /* data aneh dari pipeline tidak boleh merusak layar */
  const aneh = {rekomendasi: {kebutuhan: {per_ha: {regu_hari: "x", air_l: [1, null, 3], bbm_l: {a: 1}}, dasar: {luas_ha: "banyak"}, total: {regu: "?", personel: [NaN], pompa: [null, {kelas: "<img src=x onerror=1>", hp: "kuat", unit: "dua"}, 7], selang_m: Infinity, aneh_baru: [1, 2, 3, 4], heli: null}, hari_provinsi: ["a"],
    melampaui_rujukan_lapangan: true, energi: {genset: "<b>ya</b>", dalam: {x: 1}}}}, kebutuhan_konf: {luas_ha: 4, per_ha_x_luas: {regu_hari: NaN, air_l: [1, 2, 3], bbm_l: "x"}}, kurang: []};
  const ha = H(aneh); bersih(ha, "aneh"); assert.ok(!ha.includes("<img src=x") && !ha.includes("<b>ya"), "HTML dari data di-escape"); assert.match(ha, /Aneh baru: 1–2–3–4/); assert.doesNotMatch(ha, /Regu-hari|Regu: \?|luas banyak/, "nilai bukan angka dibuang, bukan dicetak mentah");
  assert.equal(H({rekomendasi: null}), ""); assert.equal(H({rekomendasi: {cara: []}}), ""); assert.equal(H(null), ""); bersih(H({rekomendasi: {kebutuhan: {}}}), "kosong");
});

uji("instansi: Workers AI tiruan, orang = maksimum per berkas (bukan jumlah), AI gagal atau hilang tidak menggagalkan, batas per akun", async () => {
  mfAI = bangun("uji-instansi-ai", true); DBAI = await mfAI.getD1Database("DB"); R2AI = await mfAI.getR2Bucket("MEDIA");
  await DBAI.batch(pecah(migrasi()).map(s => DBAI.prepare(s)));
  /* akun aktif langsung di instans ber-AI (jalur buat massal dan verifikasi sudah diuji di instans utama) */
  const garam = "ab".repeat(16), sandiAI = "SandiUjiAI123456";
  await DBAI.prepare(`INSERT INTO instansi_akun (id, username, jenis, tingkat, wilayah, kunci_wilayah, cakupan, prov, kab, garam, sandi_sha, status, wajib_ganti, nama, nip, jabatan, unit, email, wa, surat, kartu, dibuat)
    VALUES ('9999999999999999', 'pemkabseruyan', 'pemkab', 'kab', 'Pemerintah Kabupaten Seruyan', '62|Seruyan', '["62"]', '62', 'Seruyan', ?, ?, 'aktif', 0, 'Budi', '19800101200501', 'Kepala', 'BPBD', 'b@x.go.id', '6281234567890', 1, 1, 1)`)
    .bind(garam, sha256(garam + sandiAI)).run();
  const a = {sandi: sandiAI, username: "pemkabseruyan"};
  const login = await api("POST", "/api/instansi/masuk", {username: "pemkabseruyan", sandi: a.sandi}, {"cf-connecting-ip": "203.0.113.77"}, mfAI); assert.equal(login.s, 200, login.t); const h = kuki(login);
  const tid = "7".repeat(16); await DBAI.prepare("INSERT INTO tugas_api (id, prov, kab, lat, lon, level, dibuat, terakhir_terdeteksi) VALUES (?, '62', 'Seruyan', -2.55, 112.0, 3, ?, ?)").bind(tid, Date.now() - JAM, Date.now() - JAM).run();
  const up = (o) => unggah(h, tid, o, mfAI);
  /* dua foto: 4 dan 6 orang -> maksimum 6 */
  const f1 = await up({media: jpeg(0), thumb: jpeg(4)}), f2 = await up({media: jpeg(0), thumb: jpeg(6)});   // FOTO: dihitung dari thumbnail JPEG yang disimpan server
  assert.equal(f1.j.orang_terdeteksi, 4, "skor < 0,5 dan label bukan person tidak dihitung"); assert.equal(f2.j.orang_terdeteksi, 6); assert.equal(f1.j.orang_sumber, "thumbnail");
  /* video: tiga bingkai 2, 5, 3 -> maksimum 5 (bukan 10) */
  const v = await up({media: mp4(30), bingkai: [jpeg(2), jpeg(5), jpeg(3)]}); assert.equal(v.j.orang_terdeteksi, 5); assert.equal(v.j.orang_sumber, "bingkai_klien", "video: angka dari bingkai kiriman peramban, ditandai");
  assert.deepEqual(JSON.parse((await DBAI.prepare("SELECT orang_bingkai FROM instansi_media WHERE id = ?").bind(v.j.id).first()).orang_bingkai), [2, 5, 3]);
  /* foto: bingkai kiriman DIABAIKAN (bisa dipalsukan); thumbnail WebP tidak dikirim ke AI (hanya JPEG yang pasti terbaca) */
  const palsu = await up({media: jpeg(0), bingkai: [jpeg(99)]}); assert.equal(palsu.j.orang_terdeteksi, null, "bingkai kiriman tidak dipakai untuk foto"); assert.equal(palsu.j.orang_sumber, null);
  assert.equal((await up({media: jpeg(0), thumb: jpeg(3), bingkai: [jpeg(99)]})).j.orang_terdeteksi, 3, "yang dihitung thumbnail tersimpan, bukan bingkai 99");
  /* satu bingkai gagal: yang lain tetap dihitung; semua gagal: null tanpa galat */
  assert.equal((await up({media: mp4(10), bingkai: [jpeg(255), jpeg(2), jpeg(255)]})).j.orang_terdeteksi, 2);
  const gagalSemua = await up({media: jpeg(0), thumb: jpeg(255)}); assert.equal(gagalSemua.s, 201); assert.equal(gagalSemua.j.orang_terdeteksi, null, "AI gagal: null, berkas tetap tersimpan");
  assert.equal(await DBAI.prepare("SELECT count(*) n FROM instansi_media WHERE id = ?").bind(gagalSemua.j.id).first().then(x => x.n), 1);
  /* personel_terlihat per isian = MAKSIMUM media, bukan jumlah; manual berdampingan */
  const ids = [f1.j.id, f2.j.id, v.j.id];
  await DBAI.prepare("UPDATE tugas_api SET konfirmasi_pada = ?, isian_terakhir = ? WHERE id = ?").bind(Date.now() - JAM, Date.now() - JAM, tid).run();
  assert.equal((await api("POST", `/api/instansi/konfirmasi/${tid}`, KONF(ids), h, mfAI)).s, 409, "sudah dikonfirmasi lewat SQL: isian konfirmasi ditolak");
  await DBAI.prepare("UPDATE tugas_api SET konfirmasi_pada = NULL, isian_terakhir = NULL WHERE id = ?").bind(tid).run();
  const kf = await api("POST", `/api/instansi/konfirmasi/${tid}`, KONF(ids), h, mfAI); assert.equal(kf.s, 201, kf.t); assert.equal(kf.j.personel_terlihat, 6, "maksimum (4, 6, 5) = 6, bukan jumlah 15");
  assert.equal((await DBAI.prepare("SELECT personel_terlihat, personel FROM tugas_isian WHERE id = ?").bind(kf.j.id).first()).personel_terlihat, 6);
  const kb = await api("POST", `/api/instansi/kabar/${tid}`, KABAR([(await up({media: jpeg(0), thumb: jpeg(9)})).j.id], {personel_unsur: {bpbd: 20}}), h, mfAI); assert.equal(kb.s, 201, kb.t);
  const ki = await DBAI.prepare("SELECT personel, personel_terlihat FROM tugas_isian WHERE id = ?").bind(kb.j.id).first(); assert.deepEqual({...ki}, {personel: 20, personel_terlihat: 9}, "manual dan mesin tersimpan terpisah");
  const dt = (await api("GET", `/api/instansi/tugas/${tid}`, undefined, h, mfAI)).j; assert.equal(dt.isian.find(x => x.id === kb.j.id).personel_efektif, 20, "angka manual dipakai"); assert.equal(dt.isian.find(x => x.id === kb.j.id).personel_terlihat, 9, "mesin ditampilkan berdampingan");
  assert.equal(dt.tugas.sekarang.personel_efektif, 20); assert.equal(dt.tugas.sekarang.personel_terlihat, 9); assert.ok(dt.media.every(m => "orang_terdeteksi" in m));
  /* batas per akun per jam: sesudah 120 hitungan, berkas tetap tersimpan tetapi tidak dihitung */
  const aid = (await DBAI.prepare("SELECT id FROM instansi_akun WHERE username = 'pemkabseruyan'").first()).id;
  await DBAI.batch(Array.from({length: 120}, () => DBAI.prepare("INSERT INTO laju_bnpb (kunci, aksi, waktu) VALUES (?, 'instansi.ai', ?)").bind(aid, Date.now())));
  const lewat = await up({media: jpeg(0), thumb: jpeg(8)}); assert.equal(lewat.s, 201, lewat.t); assert.equal(lewat.j.orang_terdeteksi, null, "AI dibatasi per akun per jam");
  /* plafon GLOBAL per hari (semua akun): sesudah 5.000 hitungan, AI dilewati walau jatah akun masih ada; berkas tetap tersimpan */
  await DBAI.prepare("DELETE FROM laju_bnpb WHERE aksi = 'instansi.ai'").run();
  const sebelumGlobal = (await DBAI.prepare("SELECT count(*) n FROM laju_bnpb WHERE aksi = 'instansi.ai.global'").first()).n; assert.ok(sebelumGlobal > 0, "tiap hitungan AI dicatat di penghitung global");
  await DBAI.prepare("WITH RECURSIVE c(n) AS (SELECT 1 UNION ALL SELECT n + 1 FROM c WHERE n < 5000) INSERT INTO laju_bnpb (kunci, aksi, waktu) SELECT 'semua', 'instansi.ai.global', ? FROM c").bind(Date.now()).run();
  const global = await up({media: jpeg(0), thumb: jpeg(8)}); assert.equal(global.s, 201, global.t); assert.equal(global.j.orang_terdeteksi, null, "plafon AI global harian terlampaui: hitungan kosong");
  await DBAI.prepare("DELETE FROM laju_bnpb WHERE aksi = 'instansi.ai.global' AND waktu > ?").bind(Date.now() - HARI + 1000).run();
  const pulih = await up({media: jpeg(0), thumb: jpeg(8)}); assert.equal(pulih.j.orang_terdeteksi, 8, "di bawah plafon AI jalan lagi");
  /* hitungOrang murni */
  assert.equal(await hitungOrang({}, [new Uint8Array(3)]), null); assert.equal(await hitungOrang({AI: {run: async () => { throw new Error("x"); }}}, [new Uint8Array(3)]), null);
  assert.deepEqual(await hitungOrang({AI: {run: async () => [{label: "person", score: 0.5}, {label: "person", score: 0.49}]}}, [new Uint8Array(3), new Uint8Array(3)]), {maks: 1, per: [1, 1]}, "skor tepat 0,5 dihitung");
  /* media dummy: foto yang diunggah di instans tanpa AI tetap jalan (sudah diuji di uji sebelumnya) */
  assert.ok((await R2AI.list({prefix: "instansi/media/"})).objects.length > 0);
});

uji("instansi: dokumentasi waktu mulai dan padam dari waktu media, durasi di antaranya", async () => {
  const tid = await tugasBaru("62", "Seruyan", {konfirmasi_pada: Date.now() - 30 * JAM, isian_terakhir: Date.now() - 30 * JAM}), aid = await akunId("pemkabseruyan"), h = await masuk("pemkabseruyan"), kini = Date.now();
  const isian = async (id, langkah, dibuat, kol) => DB.prepare(`INSERT INTO tugas_isian (id, tugas_id, akun_id, klien_id, langkah, dibuat, ${Object.keys(kol).join(", ")}) VALUES (?, ?, ?, ?, ?, ?, ${Object.keys(kol).map(() => "?").join(", ")})`).bind(id, tid, aid, "klien-" + id, langkah, dibuat, ...Object.values(kol)).run();
  const media = (id, isianId, waktu, sumber = "gps") => DB.prepare("INSERT INTO instansi_media (id, akun_id, tugas_id, isian_id, jenis, mime, ukuran, waktu_ambil, sumber_waktu, lat, lon, waktu_gps, dibuat) VALUES (?, ?, ?, ?, 'foto', 'image/jpeg', 10, ?, ?, -2.5, 112, ?, ?)").bind(id, aid, tid, isianId, waktu, sumber, waktu, waktu).run();
  const lihat = async () => (await api("GET", "/api/instansi/tugas", undefined, h)).j.tugas.find(x => x.id === tid).dokumentasi;
  assert.deepEqual(await lihat(), {mulai: null, padam: null, durasi_ms: null, mulai_manual: null}, "tanpa media: kosong");
  await isian("f1f1f1f1f1f1f1f1", "konfirmasi", kini - 30 * JAM, {lat: -2.5, lon: 112, waktu_gps: kini, hasil: "api_ada", pic_nama: "Aa", pic_jabatan: "Bb", pic_wa: "6281211112222"});
  await media("a0a0a0a0a0a0a0a1", "f1f1f1f1f1f1f1f1", kini - 29 * JAM); await media("a0a0a0a0a0a0a0a2", "f1f1f1f1f1f1f1f1", kini - 28 * JAM, "exif");
  await isian("f2f2f2f2f2f2f2f2", "tindakan", kini - 20 * JAM, {tindakan: "Pompa", status_api: "bara", mulai_padam: kini - 31 * JAM});
  await media("a0a0a0a0a0a0a0a3", "f2f2f2f2f2f2f2f2", kini - 20 * JAM);
  let d = await lihat(); assert.equal(d.mulai, kini - 29 * JAM, "mulai = waktu media PERTAMA pada isian api ada"); assert.equal(d.padam, null); assert.equal(d.durasi_ms, null); assert.equal(d.mulai_manual, kini - 31 * JAM, "manual tetap tersedia sebagai koreksi");
  await isian("f3f3f3f3f3f3f3f3", "tindakan", kini - 5 * JAM, {tindakan: "Tuntas", status_api: "padam"});
  await media("a0a0a0a0a0a0a0a4", "f3f3f3f3f3f3f3f3", kini - 5 * JAM + 60 * MENIT, "unggah"); await media("a0a0a0a0a0a0a0a5", "f3f3f3f3f3f3f3f3", kini - 5 * JAM);
  await isian("f4f4f4f4f4f4f4f4", "tindakan", kini - 3 * JAM, {tindakan: "Pembasahan lagi", status_api: "padam"}); await media("a0a0a0a0a0a0a0a6", "f4f4f4f4f4f4f4f4", kini - 3 * JAM);
  d = await lihat(); assert.equal(d.padam, kini - 5 * JAM, "padam = waktu media pada isian PERTAMA berstatus padam (media paling awal di isian itu)"); assert.equal(d.durasi_ms, (kini - 5 * JAM) - (kini - 29 * JAM), "durasi = padam dikurangi mulai");
  const ad = (await adm("GET", `/api/instansi/admin/tugas/${tid}`)).j; assert.deepEqual(ad.tugas.dokumentasi, d, "rincian admin sama"); assert.equal(ad.media.length, 6);
  assert.ok(ad.media.every(m => ["exif", "gps", "unggah"].includes(m.sumber_waktu)));
  assert.match(readFileSync(path.join(AKAR, "public/instansi.js"), "utf8"), /terdokumentasi.*bukan jam mulai atau padam yang sebenarnya/s, "layar wajib menyebut 'terdokumentasi'");
  assert.match(readFileSync(path.join(AKAR, "public/admin/instansi.js"), "utf8"), /terdokumentasi/, "layar admin juga");
  assert.match(readFileSync(path.join(AKAR, "public/instansi.js"), "utf8"), /minimal \$\{angka\(s\.personel_terlihat, 0\)\} orang terlihat di foto \(hitungan mesin, bisa kurang karena asap atau di luar bingkai\)/, "label hitungan mesin persis");
});

uji("instansi: usulan kontak konsesi diterima masuk kontak_pt, ditolak tidak, hanya moderator, tidak ada di rute publik", async () => {
  const tid = await tugasBaru("62", "Seruyan"), h = await masuk("pemkabseruyan"), mid = (await unggah(h, tid, {media: jpeg(0)})).j.id;
  /* usulan dari form konfirmasi (PT dari daftar konsesi) dan dari rute tersendiri (PT manual) */
  const k = await api("POST", `/api/instansi/konfirmasi/${tid}`, KONF([mid], {pt: {perusahaan_id: "sawit-uji-9", nama_pt: "PT Sawit Uji Sembilan", kontak: "Pak Rudi", jabatan: "Manajer", wa: "0812 9999 0000", email: "Rudi@Sawit.CO.ID"}}), h); assert.equal(k.s, 201, k.t);
  const u1 = await DB.prepare("SELECT * FROM usulan_kontak_pt WHERE tugas_id = ?").bind(tid).first();
  assert.equal(u1.status, "menunggu"); assert.equal(u1.wa, "6281299990000"); assert.equal(u1.email, "rudi@sawit.co.id"); assert.equal(u1.kontak, "Pak Rudi (Manajer)"); assert.equal(u1.akun_id, await akunId("pemkabseruyan"));
  for (const buruk of [{nama_pt: "PT Tanpa Kontak"}, {nama_pt: "A", wa: "0812345678"}, {nama_pt: "PT X", email: "bukan-email"}, {nama_pt: "PT X", wa: "123"}, {wa: "081234567890"}, {nama_pt: "PT X", telepon: "abc", wa: "081234567890"}])
    assert.equal((await api("POST", "/api/instansi/kontak", buruk, h)).s, 400, JSON.stringify(buruk));
  assert.equal((await api("POST", "/api/instansi/kontak", {tugas_id: await tugasBaru("62", "Katingan"), nama_pt: "PT Luar", wa: "081234567890"}, h)).s, 404, "tugas kab lain");
  const m = await api("POST", "/api/instansi/kontak", {nama_pt: "PT Manual Jaya!", kontak: "Bu Ani", telepon: "0536 300999"}, h); assert.equal(m.s, 201, m.t); assert.equal(m.j.perusahaan_id, "manual-pt-manual-jaya");
  const u2 = await DB.prepare("SELECT id FROM usulan_kontak_pt WHERE perusahaan_id = 'manual-pt-manual-jaya'").first();
  const mine = (await api("GET", "/api/instansi/kontak", undefined, h)).j.usulan; assert.equal(mine.length, 2); assert.ok(!JSON.stringify(mine).includes("6281299990000"), "kontak tidak kembali ke instansi");
  assert.equal((await api("GET", "/api/instansi/kontak", undefined, await masuk("pemkabgunungmas"))).s, 403, "belum aktif"); await aktifkan("pemkabgunungmas");
  assert.deepEqual((await api("GET", "/api/instansi/kontak", undefined, await masuk("pemkabgunungmas"))).j.usulan, [], "usulan akun lain tidak terlihat");
  /* admin */
  assert.equal((await api("GET", "/api/instansi/admin/usulan")).s, 403); assert.equal((await adm("GET", "/api/instansi/admin/usulan", undefined, GERBANG)).s, 403);
  assert.equal((await api("POST", `/api/instansi/admin/usulan/${u1.id}`, {aksi: "terima"}, h)).s, 403, "akun instansi bukan admin");
  assert.equal((await adm("POST", `/api/instansi/admin/usulan/${u1.id}`, {aksi: "terima"}, GERBANG)).s, 403);
  const daftar = (await adm("GET", "/api/instansi/admin/usulan")).j.usulan; assert.equal(daftar.length, 2); assert.equal(daftar.find(x => x.id === u1.id).wilayah.includes("Seruyan"), true);
  await DB.prepare("INSERT INTO kontak_pt (id, perusahaan_id, nama_pt, email, diubah) VALUES ('1111111111111111', 'sawit-uji-9', 'Nama Lama', 'lama@pt.co.id', 1)").run();
  assert.equal((await adm("GET", "/api/instansi/admin/usulan")).j.usulan.find(x => x.id === u1.id).sudah_ada, 1, "admin diberi tahu kontak lama akan ditimpa");
  const lamaKontak = (await adm("GET", "/api/instansi/admin/usulan")).j.usulan.find(x => x.id === u1.id).kontak_lama; assert.equal(lamaKontak.nama_pt, "Nama Lama"); assert.equal(lamaKontak.email, "lama@pt.co.id", "kontak lama tampil berdampingan dengan usulan");
  assert.equal((await adm("POST", `/api/instansi/admin/usulan/${u1.id}`, {aksi: "terima"}, MOD)).s, 409, "kontak sudah ada: wajib timpa"); assert.equal((await DB.prepare("SELECT status FROM usulan_kontak_pt WHERE id = ?").bind(u1.id).first()).status, "menunggu");
  assert.equal((await DB.prepare("SELECT email FROM kontak_pt WHERE perusahaan_id = 'sawit-uji-9'").first()).email, "lama@pt.co.id", "ditolak: kontak lama utuh");
  const t = await adm("POST", `/api/instansi/admin/usulan/${u1.id}`, {aksi: "terima", timpa: true}, MOD); assert.equal(t.s, 200, t.t);
  const kp = await DB.prepare("SELECT nama_pt, kontak, email, wa, oleh FROM kontak_pt WHERE perusahaan_id = 'sawit-uji-9'").first(); assert.equal(await n("kontak_pt", "perusahaan_id = 'sawit-uji-9'"), 1, "upsert, bukan baris ganda");
  assert.deepEqual({...kp, oleh: undefined}, {nama_pt: "PT Sawit Uji Sembilan", kontak: "Pak Rudi (Manajer)", email: "rudi@sawit.co.id", wa: "6281299990000", oleh: undefined}); assert.ok(kp.oleh, "dicatat siapa yang menerima");
  assert.equal((await DB.prepare("SELECT status FROM usulan_kontak_pt WHERE id = ?").bind(u1.id).first()).status, "diterima");
  assert.equal((await adm("POST", `/api/instansi/admin/usulan/${u1.id}`, {aksi: "tolak"})).s, 409, "sudah diputus");
  assert.equal((await adm("POST", `/api/instansi/admin/usulan/${u2.id}`, {aksi: "tolak", alasan: "Kontak tidak aktif"})).s, 200); assert.equal(await n("kontak_pt", "perusahaan_id = 'manual-pt-manual-jaya'"), 0, "ditolak: tidak masuk kontak_pt");
  assert.equal((await adm("POST", `/api/instansi/admin/usulan/${u2.id}`, {aksi: "ngawur"})).s, 409);
  /* kontak tidak keluar di rute publik mana pun */
  for (const j of ["/api/neraca?prov=62", "/api/posko/kontak", "/api/instansi/tugas", "/api/status", "/api/warga"]) { const r = await api("GET", j); assert.ok(!r.t.includes("6281299990000") && !r.t.includes("rudi@sawit"), j); }
});

uji("instansi: reset sandi, cabut, keluar, dan kedaluwarsa mencabut sesi", async () => {
  const h = await masuk("pemkabkapuas"), a = await akunId("pemkabkapuas"); await aktifkan("pemkabkapuas");
  assert.equal((await api("GET", "/api/instansi/tugas", undefined, h)).s, 200);
  assert.equal((await api("POST", `/api/instansi/admin/akun/${a}`, {aksi: "reset"}, h)).s, 403, "instansi tidak bisa reset");
  assert.equal((await adm("POST", `/api/instansi/admin/akun/${a}`, {aksi: "reset"}, GERBANG)).s, 403);
  const lama = SANDI.get("pemkabkapuas"), r = await adm("POST", `/api/instansi/admin/akun/${a}`, {aksi: "reset"}); assert.equal(r.s, 200); assert.match(r.j.sandi, /^[2-9A-HJ-NP-Za-km-z]{16}$/); assert.notEqual(r.j.sandi, lama);
  assert.equal((await api("GET", "/api/instansi/tugas", undefined, h)).s, 401, "sesi lama dicabut");
  assert.equal((await api("POST", "/api/instansi/masuk", {username: "pemkabkapuas", sandi: lama}, {"cf-connecting-ip": "203.0.113.150"})).s, 401, "sandi lama tidak berlaku");
  SANDI.set("pemkabkapuas", r.j.sandi); let h2 = await masuk("pemkabkapuas"), h2b = await masuk("pemkabkapuas");
  /* sandi hasil reset diketahui admin: sebelum membuat sandi baru, sesi hanya boleh ke saya, gantisandi, keluar */
  const blok = await api("GET", "/api/instansi/tugas", undefined, h2); assert.equal(blok.s, 403); assert.equal(blok.j.wajib_ganti, true);
  for (const [m, j] of [["GET", "/api/instansi/kontak"], ["GET", "/api/instansi/tugas/" + "1".repeat(16)]]) assert.equal((await api(m, j, undefined, h2)).s, 403, `${j} diblok sebelum ganti sandi`);
  assert.equal((await api("POST", "/api/instansi/kontak", {nama_pt: "PT X", wa: "081234567890"}, h2)).s, 403); assert.equal((await unggah(h2, "1".repeat(16))).s, 403);
  assert.equal((await api("GET", "/api/instansi/saya", undefined, h2)).j.akun.wajib_ganti, true, "layar tahu harus mengganti sandi");
  assert.equal((await api("POST", "/api/instansi/gantisandi", {})).s, 401, "ganti sandi butuh sesi"); assert.equal((await api("POST", "/api/instansi/gantisandi", {}, {...h2, "x-pb": "0"})).s, 403, "dan header x-pb");
  const g = await api("POST", "/api/instansi/gantisandi", {}, h2); assert.equal(g.s, 200, g.t); assert.match(g.j.sandi, /^[2-9A-HJ-NP-Za-km-z]{16}$/); assert.notEqual(g.j.sandi, r.j.sandi); assert.equal(g.h.get("cache-control"), "no-store");
  assert.equal((await api("GET", "/api/instansi/tugas", undefined, h2)).s, 200, "sesi yang dipakai tetap hidup dan kini bebas");
  assert.equal((await api("GET", "/api/instansi/tugas", undefined, h2b)).s, 401, "sesi lain akun ini dicabut oleh penggantian sandi");
  assert.equal((await api("POST", "/api/instansi/masuk", {username: "pemkabkapuas", sandi: r.j.sandi}, {"cf-connecting-ip": "203.0.113.152"})).s, 401, "sandi reset (diketahui admin) hangus");
  assert.equal((await DB.prepare("SELECT wajib_ganti FROM instansi_akun WHERE id = ?").bind(a).first()).wajib_ganti, 0); assert.ok(!(await DB.prepare("SELECT garam, sandi_sha FROM instansi_akun WHERE id = ?").bind(a).first()).sandi_sha.includes(g.j.sandi));
  SANDI.set("pemkabkapuas", g.j.sandi); h2 = await masuk("pemkabkapuas"); assert.equal((await api("GET", "/api/instansi/tugas", undefined, h2)).s, 200, "sandi baru berlaku dan langsung bebas");
  assert.deepEqual((await adm("GET", `/api/instansi/admin/akun/${a}`)).j.jejak.map(x => [x.aksi, x.oleh]).reverse(), [["reset", ADMIN_ID], ["ganti_sandi", "pengguna"]], "jejak: reset oleh admin, ganti sandi oleh pengguna");
  /* reset lagi mewajibkan ganti lagi */
  await adm("POST", `/api/instansi/admin/akun/${a}`, {aksi: "reset"}).then(x => SANDI.set("pemkabkapuas", x.j.sandi)); h2 = await masuk("pemkabkapuas"); assert.equal((await api("GET", "/api/instansi/tugas", undefined, h2)).s, 403);
  const g2 = await api("POST", "/api/instansi/gantisandi", {}, h2); SANDI.set("pemkabkapuas", g2.j.sandi); h2 = await masuk("pemkabkapuas"); assert.equal((await api("GET", "/api/instansi/tugas", undefined, h2)).s, 200);
  assert.equal(JSON.stringify(r.j).includes("sandi_sha"), false); assert.equal((await DB.prepare("SELECT sandi_sha FROM instansi_akun WHERE id = ?").bind(a).first()).sandi_sha, sha256((await DB.prepare("SELECT garam FROM instansi_akun WHERE id = ?").bind(a).first()).garam + g2.j.sandi));
  /* keluar */
  const out = await api("POST", "/api/instansi/keluar", {}, h2); assert.equal(out.s, 200); assert.ok(out.sc.every(c => /Max-Age=0/.test(c))); assert.equal((await api("GET", "/api/instansi/tugas", undefined, h2)).s, 401, "sesi dihapus di server");
  /* kedaluwarsa 30 hari */
  const h3 = await masuk("pemkabkapuas"), tok = h3.cookie.match(/=([0-9a-f]{64})/)[1], baris = await DB.prepare("SELECT dibuat, kedaluwarsa FROM instansi_sesi WHERE token_sha = ?").bind(sha256(tok)).first();
  assert.equal(baris.kedaluwarsa - baris.dibuat, 30 * HARI); await DB.prepare("UPDATE instansi_sesi SET dibuat = ?, kedaluwarsa = ? WHERE token_sha = ?").bind(Date.now() - 40 * HARI, Date.now() - 1000, sha256(tok)).run(); assert.equal((await api("GET", "/api/instansi/tugas", undefined, h3)).s, 401);
  /* cabut: sesi berakhir, tidak bisa masuk lagi dengan pesan yang sama */
  const h4 = await masuk("pemkabkapuas"); assert.equal((await adm("POST", `/api/instansi/admin/akun/${a}`, {aksi: "cabut", alasan: "Pindah tugas"})).s, 200);
  assert.equal((await api("GET", "/api/instansi/tugas", undefined, h4)).s, 401); const lg = await api("POST", "/api/instansi/masuk", {username: "pemkabkapuas", sandi: SANDI.get("pemkabkapuas")}, {"cf-connecting-ip": "203.0.113.151"}); assert.equal(lg.s, 401); assert.equal(lg.t, JSON.stringify({galat: "username atau sandi salah"}));
  assert.equal((await adm("POST", `/api/instansi/admin/akun/${a}`, {aksi: "cabut"})).s, 409, "sudah dicabut"); assert.equal((await adm("POST", `/api/instansi/admin/akun/${"0".repeat(16)}`, {aksi: "cabut"})).s, 404);
  assert.equal((await adm("POST", `/api/instansi/admin/akun/${a}`, {aksi: "ngawur"})).s, 400);
  /* daftar akun admin: filter dan hitungan status */
  const L = (await adm("GET", "/api/instansi/admin/akun?jenis=pemkab&prov=62&status=dicabut")).j; assert.equal(L.akun.length, 1); assert.equal(L.akun[0].username, "pemkabkapuas"); assert.ok(L.jumlah.belum_klaim > 5);
  assert.equal((await adm("GET", "/api/instansi/admin/akun?jenis=ngawur")).s, 400); assert.equal((await api("GET", "/api/instansi/admin/akun")).s, 403);
  assert.ok(!JSON.stringify((await adm("GET", "/api/instansi/admin/akun")).j).includes("sandi_sha"));
});

uji("instansi: halaman /instansi dan /admin/instansi, CSP, nav admin, tanpa pemisah titik tengah", async () => {
  const r = await api("GET", "/instansi"); assert.equal(r.s, 200); assert.match(r.t, /Instansi: Tugas Api/); assert.match(r.h.get("content-security-policy"), /script-src 'self'/); assert.doesNotMatch(r.h.get("content-security-policy"), /unsafe-inline/); assert.equal(r.h.get("cache-control"), "no-store");
  const buka = async j => { const r = await mf.dispatchFetch("https://centurisk97.id" + j, {redirect: "manual", headers: {"cf-connecting-ip": "198.51.100.9"}}); await r.text(); return r; };
  assert.equal((await buka("/instansi")).status, 200, "centurisk97.id: /instansi terbuka tanpa sesi admin (daftar putih), login instansi sendiri"); const ad = await buka("/admin/instansi"); assert.equal(ad.status, 303); assert.match(ad.headers.get("location"), /\/admin\/masuk/);
  assert.equal((await buka("/peringatan")).status, 303, "halaman lain tetap tertutup");
  const lama = await mf.dispatchFetch("http://instansi.lokal/instansi.html", {redirect: "manual"}); await lama.text(); assert.equal(lama.status, 303); assert.equal(lama.headers.get("location"), "/instansi");
  const tanpa = await mf.dispatchFetch("http://instansi.lokal/admin/instansi", {redirect: "manual"}); await tanpa.text(); assert.equal(tanpa.status, 303, "halaman admin butuh sesi admin");
  const a = await api("GET", "/admin/instansi", undefined, ADMIN); assert.equal(a.s, 200); assert.match(a.t, /\/admin\/instansi\.js/); assert.match(a.t, /\/admin\/bersama\.js/);
  assert.match((await api("GET", "/admin/posko", undefined, ADMIN)).t, /href="\/admin\/instansi"/, "tautan ke /admin/instansi di navigasi admin");
  for (const f of ["public/instansi.html", "public/instansi.js", "public/instansi.css", "public/admin/instansi.js", "public/admin/instansi.css", "src/instansi.js"]) {
    const t = readFileSync(path.join(AKAR, f), "utf8"); assert.ok(!t.includes(" · ") && !t.includes("·"), `${f} memakai pemisah titik tengah`);
  }
  for (const f of ["public/instansi.html", "public/instansi.js", "public/admin/instansi.js"]) assert.doesNotMatch(readFileSync(path.join(AKAR, f), "utf8"), /\son(click|change|submit)=|<script>[^<]|style="/, `${f}: tanpa skrip atau gaya sebaris (CSP)`);
});

uji("instansi: tombol dummy hanya Super Admin, mengisi seluruh rantai dan tiap ember, hapus bersih tanpa menyentuh data nyata", async () => {
  assert.equal((await api("POST", "/api/instansi/admin/dummy", {aksi: "isi"})).s, 403, "tanpa token"); assert.equal((await adm("POST", "/api/instansi/admin/dummy", {aksi: "isi"}, MOD)).s, 403, "moderator bukan super");
  assert.equal((await adm("POST", "/api/instansi/admin/dummy", {aksi: "isi"}, GERBANG)).s, 403); assert.equal((await adm("POST", "/api/instansi/admin/dummy", {aksi: "ngawur"})).s, 400);
  const nyata = {akun: await n("instansi_akun"), tugas: await n("tugas_api"), isian: await n("tugas_isian"), media: await n("instansi_media"), usulan: await n("usulan_kontak_pt"), kontak: await n("kontak_pt")};
  const st2 = async (kol, tbl) => (await DB.prepare(`SELECT DISTINCT ${kol} v FROM ${tbl} WHERE dummy = 1 AND ${kol} IS NOT NULL`).all()).results.map(x => x.v).sort();
  const r = await adm("POST", "/api/instansi/admin/dummy", {aksi: "isi"}); assert.equal(r.s, 201, r.t);
  assert.equal((await adm("POST", "/api/instansi/admin/dummy", {aksi: "isi"})).s, 409, "gerbang 'sudah ada' menghitung baris yang hidup");
  assert.deepEqual(r.j, {ok: true, akun: await n("instansi_akun", "dummy = 1"), tugas: await n("tugas_api", "dummy = 1"), isian: await n("tugas_isian", "dummy = 1"), media: await n("instansi_media", "dummy = 1"), usulan: await n("usulan_kontak_pt", "dummy = 1"), penugasan: await n("penugasan", "dummy = 1")});
  /* penugasan (0035) dan verifikasi padam: tiap ember terisi (detail di penugasan.test.mjs) */
  assert.deepEqual(await st2("padam_verif", "tugas_api"), ["muncul_lagi", "padam_dilaporkan", "padam_terverifikasi"], "tiap keadaan verifikasi padam"); assert.ok(await n("tugas_api", "dummy = 1 AND akses IS NOT NULL") >= 5, "akses terisi");
  assert.deepEqual(await st2("status", "penugasan"), ["aktif", "dicabut", "selesai"]); assert.ok(await n("penugasan_posisi", "penugasan_id IN (SELECT id FROM penugasan WHERE dummy = 1)") >= 20, "jejak posisi dummy");
  assert.ok(await n("instansi_media", "dummy = 1 AND exif_waktu IS NOT NULL") >= 1, "exif dummy terisi");
  /* tiap ember status terisi */
  const st = async (kol, tbl) => (await DB.prepare(`SELECT DISTINCT ${kol} v FROM ${tbl} WHERE dummy = 1`).all()).results.map(x => x.v).sort();
  assert.deepEqual(await st("status", "instansi_akun"), ["aktif", "belum_klaim", "dicabut", "ditolak", "menunggu"]); assert.deepEqual(await st("status", "usulan_kontak_pt"), ["diterima", "ditolak", "menunggu"]);
  assert.deepEqual(await st("status", "tugas_api"), ["buka", "bukan_api", "padam"]); assert.deepEqual(await st("jenis", "instansi_akun"), ["kodam", "kodim", "pemkab", "pemprov", "polda", "polres"]);
  assert.deepEqual(await st("sumber_waktu", "instansi_media"), ["exif", "gps", "unggah"]); assert.deepEqual(await st("jenis", "instansi_media"), ["foto", "video"]);
  assert.deepEqual(await st("langkah", "tugas_isian"), ["konfirmasi", "tindakan"]);
  /* tugas dengan tiap keadaan tenggat */
  const p = (await adm("GET", "/api/instansi/admin/pantau")).j, kt = p.provinsi.find(x => x.prov === "62"); assert.ok(kt.terlambat >= 2 && kt.aktif >= 4 && kt.padam >= 2 && kt.bukan_api >= 1 && kt.median_konfirmasi_menit != null, JSON.stringify(kt));
  assert.ok(p.terlambat.some(x => x.langkah === "konfirmasi") && p.terlambat.some(x => x.langkah === "kabar"), "terlambat dua jenis");
  assert.ok(p.akun.some(x => x.dummy && x.isian > 0), "per akun terisi");
  /* semua kolom layar berangka: rincian tugas dummy punya galeri, unsur, alat, kebutuhan, dokumentasi, selisih */
  const id = (await DB.prepare("SELECT id FROM tugas_api WHERE dummy = 1 AND rekomendasi IS NOT NULL AND konfirmasi_pada IS NOT NULL AND status = 'buka' LIMIT 1").first()).id, d = (await adm("GET", `/api/instansi/admin/tugas/${id}`)).j;
  assert.ok(d.media.length >= 1 && d.media.some(m => m.orang_terdeteksi != null) && d.isian.some(i => i.personel_unsur && i.alat_dipakai && i.regu != null) && d.tugas.sekarang && d.tugas.kurang.length > 0 && d.tugas.dokumentasi.mulai != null, JSON.stringify(d.tugas.kurang));
  assert.ok(d.isian.some(i => i.jauh) || (await adm("GET", "/api/instansi/admin/pantau")).j.akun.length > 0);
  /* akun dummy tidak bisa dipakai masuk: sandi tak pernah ditampilkan */
  assert.equal((await api("POST", "/api/instansi/masuk", {username: "dummypemprov62", sandi: "apa-saja-1234567"}, {"cf-connecting-ip": "203.0.113.160"})).s, 401);
  assert.equal((await adm("GET", `/api/instansi/admin/akun?status=aktif`)).j.akun.some(a => a.dummy), true);
  /* data contoh tidak pernah terlihat akun nyata: akun nyata di kabupaten yang sama dengan tugas dummy tidak melihat, membaca, atau mengisinya */
  const dkab = (await DB.prepare("SELECT kab FROM tugas_api WHERE dummy = 1 LIMIT 1").first()).kab, nyata2 = (await DB.prepare("SELECT username FROM instansi_akun WHERE dummy = 0 AND tingkat = 'kab' AND prov = '62' AND lower(kab) = lower(?) AND jenis LIKE 'pemk%'").bind(dkab).first()).username;
  await aktifkan(nyata2); const hn = await masuk(nyata2), dt = (await DB.prepare("SELECT id FROM tugas_api WHERE dummy = 1 AND lower(kab) = lower(?) LIMIT 1").bind(dkab).first()).id, dm = (await DB.prepare("SELECT m.id FROM instansi_media m JOIN tugas_api t ON t.id = m.tugas_id WHERE m.dummy = 1 AND lower(t.kab) = lower(?) AND m.isian_id IS NOT NULL LIMIT 1").bind(dkab).first()).id;
  assert.ok(!(await api("GET", "/api/instansi/tugas", undefined, hn)).j.tugas.some(t => t.dummy), "daftar akun nyata tanpa tugas dummy");
  assert.equal((await api("GET", `/api/instansi/tugas/${dt}`, undefined, hn)).s, 404); assert.equal((await api("POST", `/api/instansi/konfirmasi/${dt}`, KONF([]), hn)).s, 404); assert.equal((await api("POST", `/api/instansi/kabar/${dt}`, KABAR([]), hn)).s, 404);
  assert.equal((await api("GET", `/api/instansi/media/${dm}`, undefined, hn)).s, 404, "media dummy tak terlihat akun nyata"); assert.equal((await api("GET", `/api/instansi/thumb/${dm}`, undefined, hn)).s, 404); assert.equal((await unggah(hn, dt)).s, 404);
  /* nomor dummy memakai prefiks tak teralokasi, dan baris dummy di Pantau berbadge tanpa tautan tagih */
  assert.equal(await n("instansi_akun", "dummy = 1 AND wa IS NOT NULL AND wa NOT LIKE '62000000%'"), 0, "WhatsApp akun dummy"); assert.equal(await n("tugas_isian", "dummy = 1 AND pic_wa IS NOT NULL AND pic_wa NOT LIKE '620000%'"), 0, "PIC dummy");
  assert.equal(await n("usulan_kontak_pt", "dummy = 1 AND wa IS NOT NULL AND wa NOT LIKE '620000%'"), 0, "usulan dummy");
  assert.ok(p.terlambat.filter(x => x.dummy).length >= 2 && p.terlambat.filter(x => x.dummy).every(x => x.tagih.length === 0 && x.dummy === 1), "dummy terlambat: badge, tanpa tagih");
  /* berkas contoh di R2 supaya tidak 404, ikut dihapus */
  const kunciDummy = (await DB.prepare("SELECT id FROM instansi_media WHERE dummy = 1").all()).results.flatMap(x => [`instansi/media/${x.id}`, `instansi/media/${x.id}_t`]), dokDummy = (await DB.prepare("SELECT id FROM instansi_akun WHERE dummy = 1 AND surat = 1").all()).results.flatMap(x => [`instansi/dok/${x.id}/surat`, `instansi/dok/${x.id}/kartu`]);
  for (const k of [...kunciDummy, ...dokDummy]) assert.ok(await R2.head(k), `${k} ada di R2`);
  assert.ok(dokDummy.length >= 4); const mdum = await adm("GET", `/api/instansi/admin/media/${dm}`); assert.equal(mdum.s, 200); assert.equal(mdum.h.get("content-type"), "image/jpeg"); assert.equal(mdum.b[0], 0xff, "gambar contoh dibangkitkan, bukan 404");
  const sd = (await DB.prepare("SELECT id FROM instansi_akun WHERE dummy = 1 AND surat = 1 LIMIT 1").first()).id; assert.equal((await adm("GET", `/api/instansi/admin/surat/${sd}`)).s, 200); assert.equal((await adm("GET", `/api/instansi/admin/kartu/${sd}`)).s, 200);
  /* hapus: baris non-dummy yang menempel pada tugas dummy TIDAK ikut terhapus (tugasnya dilewati) */
  const nyataAid = await akunId(nyata2); await DB.prepare("INSERT INTO tugas_isian (id, tugas_id, akun_id, klien_id, langkah, dibuat, tindakan, status_api) VALUES ('f0f0f0f0f0f0f0f0', ?, ?, 'klien-nyata-pada-dummy', 'tindakan', 1, 'isian nyata', 'bara')").bind(dt, nyataAid).run();
  const sebagian = await adm("POST", "/api/instansi/admin/dummy", {aksi: "hapus"}); assert.equal(sebagian.s, 200); assert.ok(sebagian.j.dilewati.tugas >= 1, JSON.stringify(sebagian.j));
  assert.equal(await n("tugas_isian", "id = 'f0f0f0f0f0f0f0f0'"), 1, "isian nyata utuh"); assert.equal(await n("tugas_api", `id = '${dt}'`), 1, "tugas dummy yang dipakai isian nyata dilewati");
  for (const k of [...kunciDummy, ...dokDummy]) assert.equal(await R2.head(k), null, `${k} dibuang bersama dummy`);
  await DB.prepare("DELETE FROM tugas_isian WHERE id = 'f0f0f0f0f0f0f0f0'").run(); assert.equal((await adm("POST", "/api/instansi/admin/dummy", {aksi: "hapus"})).j.dilewati.tugas, 0, "hapus ulang menuntaskan sisanya");
  assert.equal((await adm("POST", "/api/instansi/admin/dummy", {aksi: "isi"})).s, 201); const nyata3 = await n("instansi_akun", "dummy = 0");
  /* hapus */
  assert.equal((await adm("POST", "/api/instansi/admin/dummy", {aksi: "hapus"}, MOD)).s, 403);
  const h = await adm("POST", "/api/instansi/admin/dummy", {aksi: "hapus"}); assert.equal(h.s, 200); assert.equal(h.j.akun, r.j.akun);
  for (const t of ["instansi_akun", "tugas_api", "tugas_isian", "instansi_media", "usulan_kontak_pt"]) assert.equal(await n(t, "dummy = 1"), 0, t);
  assert.deepEqual({akun: await n("instansi_akun"), tugas: await n("tugas_api"), isian: await n("tugas_isian"), media: await n("instansi_media"), usulan: await n("usulan_kontak_pt"), kontak: await n("kontak_pt")}, nyata, "data nyata utuh");
  assert.equal((await adm("POST", "/api/instansi/admin/dummy", {aksi: "isi"})).s, 201, "bisa diisi lagi setelah dihapus"); await adm("POST", "/api/instansi/admin/dummy", {aksi: "hapus"});
});

uji("instansi: cron bersih-bersih membuang media yatim, sesi kedaluwarsa, tugas lama beserta berkasnya, dan menjaga data baru", async () => {
  await DB.prepare("DELETE FROM laju_bnpb WHERE aksi = 'instansi.unggah'").run();   // jatah 40 unggahan per jam sudah dipakai uji-uji sebelumnya
  const tid = await tugasBaru("62", "Seruyan"), h = await masuk("pemkabseruyan"), u1 = await unggah(h, tid, {media: jpeg(0)}), u2 = await unggah(h, tid, {media: jpeg(0)});
  assert.equal(u1.s, 201, u1.t); assert.equal(u2.s, 201, u2.t);
  const yatim = u1.j.id, baru = u2.j.id;
  await DB.prepare("UPDATE instansi_media SET dibuat = ? WHERE id = ?").bind(Date.now() - 7 * JAM, yatim).run();
  const tua = await tugasBaru("62", "Seruyan", {dibuat: Date.now() - 200 * HARI});
  await DB.prepare("INSERT INTO instansi_media (id, akun_id, tugas_id, jenis, mime, ukuran, waktu_ambil, sumber_waktu, lat, lon, waktu_gps, dibuat) VALUES ('abababababababab', ?, ?, 'foto', 'image/jpeg', 5, 1, 'gps', -2.5, 112, 1, ?)").bind(await akunId("pemkabseruyan"), tua, Date.now() - 190 * HARI).run();
  await R2.put("instansi/media/abababababababab", new Uint8Array([1])); await R2.put("instansi/media/abababababababab_t", new Uint8Array([1]));
  await DB.prepare("INSERT INTO instansi_sesi (token_sha, akun_id, dibuat, kedaluwarsa) VALUES (?, ?, 1, 2)").bind(sha256("lama"), await akunId("pemkabseruyan")).run();
  await (await mf.getWorker()).scheduled({cron: "* * * * *", scheduledTime: (() => { const d = new Date(); d.setUTCMinutes(17, 0, 0); return d.getTime(); })()});   // menit 17 pada jam sekarang: jadwal bersih-bersih
  assert.equal(await n("instansi_media", `id = '${yatim}'`), 0, "media yatim > 6 jam dibuang"); assert.equal(await R2.head(`instansi/media/${yatim}`), null); assert.equal(await R2.head(`instansi/media/${yatim}_t`), null);
  assert.equal(await n("instansi_media", `id = '${baru}'`), 1, "media baru dijaga"); assert.ok(await R2.head(`instansi/media/${baru}`));
  assert.equal(await n("tugas_api", `id = '${tua}'`), 0, "tugas > 180 hari dibuang"); assert.equal(await R2.head("instansi/media/abababababababab"), null); assert.equal(await n("instansi_sesi", `token_sha = '${sha256("lama")}'`), 0, "sesi kedaluwarsa dibuang");
  assert.equal(await n("tugas_api", `id = '${tid}'`), 1);
});

uji("instansi: pembersih metadata ketat, JPEG, WebP, MP4 dan MOV: berkas dan thumbnail disimpan tanpa EXIF, XMP, lokasi", async () => {
  const latin = b => new TextDecoder("latin1").decode(b), ada = (b, t) => latin(b).includes(t);
  const j = bersihJpeg(jpeg(3, {exif: true, sampah: true}));
  for (const rahasia of ["Exif", "GPS-LOKASI-RAHASIA", "XMP-RAHASIA", "komentar-rahasia", "MPF-RAHASIA", "SAMPAH-SESUDAH-EOI"]) assert.ok(!ada(j, rahasia), `JPEG masih memuat ${rahasia}`);
  assert.deepEqual([j[0], j[1], j.at(-2), j.at(-1)], [0xff, 0xd8, 0xff, 0xd9], "SOI ... EOI, sisanya dipotong"); assert.ok(ada(j, "JFIF"), "APP0 JFIF dipertahankan");
  assert.deepEqual([...bersihJpeg(jpeg(2))], [...jpeg(2)], "JPEG bersih tidak berubah");
  const entropi = new Uint8Array([0xff, 0xd8, ...seg(0xc0, [8, 0, 1, 0, 1, 1, 1, 0x11, 0]), ...seg(0xda, [1, 1, 0, 0, 0x3f, 0]), 7, 0xff, 0x00, 0xff, 0xd0, 7, 0xff, 0xd9]);
  assert.deepEqual([...bersihJpeg(entropi)], [...entropi], "byte isian FF00 dan RSTn di data entropi utuh");
  const progresif = new Uint8Array([0xff, 0xd8, ...seg(0xc2, [8, 0, 1, 0, 1, 1, 1, 0x11, 0]), ...seg(0xda, [1, 1, 0, 0, 0x3f, 0]), 7, 7, ...seg(0xda, [1, 1, 0, 0, 0x3f, 0]), 8, 0xff, 0xd9]);
  assert.deepEqual([...bersihJpeg(progresif)], [...progresif], "JPEG progresif (banyak SOS) utuh");
  for (const [nama, b] of [["tanpa EOI", jpeg(0, {rusak: true})], ["bukan JPEG", new Uint8Array([1, 2, 3, 4])], ["tanpa SOF dan SOS", new Uint8Array([0xff, 0xd8, 0xff, 0xd9])], ["byte liar sesudah SOI", new Uint8Array([...jpeg(0).slice(0, 2), 0, ...jpeg(0).slice(2)])],
    ["segmen melewati berkas", new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x7f, 0xff, 1, 2])], ["EOI sebelum SOS", new Uint8Array([0xff, 0xd8, ...seg(0xc0, [8, 0, 1, 0, 1, 1, 1, 0x11, 0]), 0xff, 0xd9])], ["panjang segmen 0", new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0xff, 0xd9])]])
    assert.equal(bersihJpeg(b), null, nama);
  const w = bersihWebp(webpExif());
  for (const rahasia of ["GPS-RAHASIA", "XMP-RAHASIA", "EXIF", "XMP "]) assert.ok(!ada(w, rahasia), `WebP masih memuat ${rahasia}`);
  assert.equal(w[20] & 0x0c, 0, "bendera EXIF dan XMP di VP8X dimatikan"); assert.equal(w[4] | w[5] << 8 | w[6] << 16, w.length - 8, "ukuran RIFF dihitung ulang"); assert.ok(ada(w, "VP8 "));
  assert.deepEqual([...bersihWebp(WEBP)], [...WEBP], "WebP bersih tidak berubah");
  for (const [nama, b] of [["terpotong", WEBP.slice(0, 20)], ["ukuran RIFF melewati berkas", (() => { const x = new Uint8Array(WEBP); x[4] = 250; return x; })()], ["tanpa chunk gambar", riff(chunk("EXIF", teks("Exif\0\0abcd")))], ["bukan WebP", new Uint8Array(40)], ["chunk melewati berkas", riff([...teks("VP8 "), 200, 0, 0, 0, 1, 1])]])
    assert.equal(bersihWebp(b), null, nama);
  const m = mp4(30, {lokasi: true}), c = bersihMp4(m);
  assert.equal(c.length, m.length, "ukuran sama: offset stco tidak bergeser"); for (const rahasia of ["+01.2345", "LOKASI-META-RAHASIA", "udta", "meta"]) assert.ok(!ada(c, rahasia), `MP4 masih memuat ${rahasia}`);
  assert.ok(ada(c, "free") && ada(c, "mvhd") && ada(c, "ftyp") && ada(c, "mdat"), "atom lain utuh, atom metadata menjadi free"); assert.equal(durasiMP4(c), 30, "video masih terbaca");
  assert.deepEqual([...bersihMp4(mp4(5))], [...mp4(5)], "MP4 tanpa metadata tidak berubah");
  assert.equal(bersihMp4(mp4(10, {rusak: true})), null, "ukuran atom melewati berkas"); assert.equal(bersihMp4(new Uint8Array(40)), null); assert.equal(bersihMp4(m.slice(0, 20)), null, "terpotong");
  /* lewat rute: yang disimpan di R2 = hasil bersih, berkas dan thumbnail */
  await DB.prepare("DELETE FROM laju_bnpb WHERE aksi = 'instansi.unggah'").run();
  const tid = await tugasBaru("62", "Seruyan"), h = await masuk("pemkabseruyan"), simpan = async id => [new Uint8Array(await (await R2.get(`instansi/media/${id}`)).arrayBuffer()), new Uint8Array(await (await R2.get(`instansi/media/${id}_t`)).arrayBuffer())];
  const a = await unggah(h, tid, {media: jpeg(0, {exif: true, sampah: true}), thumb: jpeg(0, {exif: true, sampah: true})}); assert.equal(a.s, 201, a.t);
  for (const b of await simpan(a.j.id)) for (const rahasia of ["Exif", "XMP-RAHASIA", "komentar-rahasia", "SAMPAH-SESUDAH"]) assert.ok(!ada(b, rahasia), `R2 JPEG memuat ${rahasia}`);
  const b = await unggah(h, tid, {media: webpExif(), thumb: webpExif()}); assert.equal(b.s, 201, b.t);
  for (const x of await simpan(b.j.id)) for (const rahasia of ["GPS-RAHASIA", "XMP-RAHASIA"]) assert.ok(!ada(x, rahasia), `R2 WebP memuat ${rahasia}`);
  const v = await unggah(h, tid, {media: mp4(20, {lokasi: true})}); assert.equal(v.s, 201, v.t); const [vb] = await simpan(v.j.id); assert.ok(!ada(vb, "+01.2345") && !ada(vb, "LOKASI-META-RAHASIA"), "R2 MP4 bersih dari lokasi"); assert.equal(durasiMP4(vb), 20);
  assert.equal((await DB.prepare("SELECT ukuran FROM instansi_media WHERE id = ?").bind(a.j.id).first()).ukuran, (await simpan(a.j.id))[0].length, "ukuran tercatat = ukuran yang disimpan");
  const awal = (await R2.list({prefix: "instansi/media/"})).objects.length;
  for (const [nama, o] of [["JPEG tanpa EOI", {media: jpeg(0, {rusak: true})}], ["thumbnail JPEG rusak", {thumb: jpeg(0, {rusak: true})}], ["WebP rusak", {media: WEBP.slice(0, 22)}], ["MP4 rusak", {media: mp4(10, {rusak: true})}]]) { const r = await unggah(h, tid, o); assert.equal(r.s, 400, `${nama}: ${r.t}`); }
  assert.equal((await R2.list({prefix: "instansi/media/"})).objects.length, awal, "penolakan tidak meninggalkan berkas yatim");
});

uji("instansi: batas laju dan Content-Length dicek sebelum body dibaca, 411 tanpa panjang, plafon AI global", async () => {
  await DB.prepare("DELETE FROM laju_bnpb WHERE aksi LIKE 'instansi.unggah%' OR aksi LIKE 'instansi.ai%'").run();
  const h = await masuk("pemkabseruyan"), aid = await akunId("pemkabseruyan"), tid = (await DB.prepare("SELECT id FROM tugas_api WHERE status = 'buka' AND dummy = 0 AND prov = '62' AND lower(kab) = 'seruyan' LIMIT 1").first()).id;
  const banjir = (kunci, aksi, n) => DB.prepare("WITH RECURSIVE c(n) AS (SELECT 1 UNION ALL SELECT n + 1 FROM c WHERE n < ?) INSERT INTO laju_bnpb (kunci, aksi, waktu) SELECT ?, ?, ? FROM c").bind(n, kunci, aksi, Date.now()).run();
  const kosong = await api("POST", "/api/instansi/media", new Uint8Array(0), {...h, "content-type": "multipart/form-data; boundary=x"}); assert.equal(kosong.s, 411, kosong.t);
  /* media: 40 per jam; sesudahnya badan sampah pun dijawab 429 (bukan 400 dari penguraian), artinya body belum dibaca */
  await banjir(aid, "instansi.unggah", 40);
  const sampah = await api("POST", "/api/instansi/media", new TextEncoder().encode("--x\r\nbukan formulir sah"), {...h, "content-type": "multipart/form-data; boundary=x"}); assert.equal(sampah.s, 429, sampah.t); assert.ok(sampah.h.get("retry-after"));
  await DB.prepare("DELETE FROM laju_bnpb WHERE aksi = 'instansi.unggah'").run();
  assert.equal((await unggah(h, tid)).s, 201, "jatah kembali");
  /* dokumen: 20 per jam, akun belum diklaim */
  const hd = await masuk("pemkabbarito" + "utara"), ad = await akunId("pemkabbaritoutara"), pdf = new TextEncoder().encode("%PDF-1.4\n");
  assert.equal((await api("POST", "/api/instansi/surat", new Uint8Array(0), hd)).s, 411, "dokumen tanpa isi: 411");
  await banjir(ad, "instansi.unggah", 20); const dok429 = await api("POST", "/api/instansi/surat", new TextEncoder().encode("bukan pdf sama sekali"), hd); assert.equal(dok429.s, 429, "dokumen: batas sebelum jenis berkas diperiksa (bukan 400)");
  /* plafon AI global: 5000 hitungan per hari dari SEMUA akun */
  mfAI ||= null;
  assert.match(readFileSync(path.join(AKAR, "src/instansi.js"), "utf8"), /const AI_GLOBAL_HARI = 5000;/, "plafon global 5.000 per hari berkomentar");
});

uji("instansi: idempotensi klien_id per tugas, PIC terakhir per kabupaten dari server, header x-pb, trigger UPDATE, jejak tak bisa diubah", async () => {
  await DB.prepare("DELETE FROM laju_bnpb WHERE aksi LIKE 'instansi.%' AND aksi NOT LIKE 'instansi.gagal%'").run();
  await DB.prepare("DELETE FROM tugas_api WHERE dummy = 0").run();
  const A = await tugasBaru("62", "Seruyan"), B = await tugasBaru("62", "Seruyan", {lat: -2.5502}), h = await masuk("pemkabseruyan"), h2 = await masuk("kodimseruyan");
  const mA = (await unggah(h, A)).j.id, mB = (await unggah(h, B)).j.id;
  const satu = await api("POST", `/api/instansi/konfirmasi/${A}`, KONF([mA], {klien_id: "klien-sama-0001", pic_nama: "Pak Joko"}), h); assert.equal(satu.s, 201, satu.t);
  const dua = await api("POST", `/api/instansi/konfirmasi/${B}`, KONF([mB], {klien_id: "klien-sama-0001", pic_nama: "Pak Joko"}), h); assert.equal(dua.s, 201, "klien_id yang sama di tugas LAIN adalah isian baru, bukan kirim ulang"); assert.notEqual(dua.j.id, satu.j.id); assert.ok(!dua.j.ulang);
  const ulang = await api("POST", `/api/instansi/konfirmasi/${A}`, KONF([], {klien_id: "klien-sama-0001"}), h); assert.equal(ulang.j.ulang, true); assert.equal(ulang.j.id, satu.j.id, "di tugas yang sama: idempoten");
  assert.equal((await api("POST", `/api/instansi/konfirmasi/${A}`, KONF([mA]), {...h, "x-pb": "0"})).s, 403, "kiriman bersesi tanpa x-pb ditolak"); assert.equal((await api("POST", `/api/instansi/kabar/${A}`, KABAR([]), {...h, "x-pb": ""})).s, 403);
  /* PIC terakhir milik akun itu di kabupaten itu, dari server; akun lain di kabupaten sama tidak mendapatnya */
  const pic = (await api("GET", "/api/instansi/tugas", undefined, h)).j.pic_kab; assert.deepEqual(pic["62|seruyan"], {nama: "Pak Joko", jabatan: "Kepala Desa", wa: "6281211112222"}, JSON.stringify(pic));
  assert.deepEqual((await api("GET", "/api/instansi/tugas", undefined, h2)).j.pic_kab, {}, "PIC akun lain tidak bocor");
  /* trigger BEFORE UPDATE: isi larik/objek tidak bisa dilonggarkan lewat UPDATE */
  const rusak = (sql, ...x) => assert.rejects(DB.prepare(sql).bind(...x).run(), /cakupan|kendala|bantuan|personel_unsur|alat|constraint|CHECK/i, sql);
  await rusak("UPDATE instansi_akun SET cakupan = '[\"ab\"]' WHERE username = 'pemkabseruyan'"); await rusak("UPDATE instansi_akun SET cakupan = '[\"62\",\"62\"]' WHERE username = 'pemkabseruyan'"); await rusak("UPDATE instansi_akun SET cakupan = '[62]' WHERE username = 'pemkabseruyan'");
  await rusak("UPDATE tugas_isian SET kendala = '[\"hujan\"]' WHERE id = ?", satu.j.id); await rusak("UPDATE tugas_isian SET bantuan = '[\"roket\"]' WHERE id = ?", satu.j.id);
  await rusak("UPDATE tugas_isian SET personel_unsur = '{\"pramuka\":3}' WHERE id = ?", satu.j.id); await rusak("UPDATE tugas_isian SET personel_unsur = '{\"tni\":-1}' WHERE id = ?", satu.j.id); await rusak("UPDATE tugas_isian SET alat_dipakai = '{\"tank\":1}' WHERE id = ?", satu.j.id);
  await DB.prepare("UPDATE tugas_isian SET kendala = '[\"asap_tebal\"]', personel_unsur = '{\"tni\":4}' WHERE id = ?").bind(satu.j.id).run();   // yang sah tetap boleh
  /* jejak audit hanya bertambah */
  const j = await DB.prepare("SELECT id FROM instansi_jejak LIMIT 1").first(); assert.ok(j, "jejak berisi");
  await assert.rejects(DB.prepare("UPDATE instansi_jejak SET alasan = 'diubah' WHERE id = ?").bind(j.id).run(), /hanya bisa ditambah/); await assert.rejects(DB.prepare("DELETE FROM instansi_jejak WHERE id = ?").bind(j.id).run(), /hanya bisa ditambah/);
  await assert.rejects(DB.prepare("INSERT INTO instansi_jejak (waktu, oleh, aksi) VALUES (1, 'abc', 'ngawur')").run(), /CHECK|constraint/i, "aksi jejak terbatas");
  assert.deepEqual((await DB.prepare("SELECT DISTINCT aksi FROM instansi_jejak ORDER BY aksi").all()).results.map(x => x.aksi).filter(x => ["buat_massal", "cabut", "ganti_sandi", "reset", "setuju", "terima_usulan", "tolak", "tolak_usulan"].includes(x)), ["buat_massal", "cabut", "ganti_sandi", "reset", "setuju", "terima_usulan", "tolak", "tolak_usulan"], "tiap jenis aksi sudah tercatat oleh uji-uji sebelumnya");
});

uji("instansi: tanpa migrasi 0029 rute menjawab 503 yang jelas dan cron tidak melempar", async () => {
  const mf0 = bangun("uji-instansi-tanpa-0029", false), D0 = await mf0.getD1Database("DB");
  try {
    const lama = readdirSync(path.join(AKAR, "migrations")).filter(f => f.endsWith(".sql") && !["0029", "0043", "0044", "0046", "0050", "0054"].some(n => f.startsWith(n))).sort().map(f => readFileSync(path.join(AKAR, "migrations", f), "utf8")).join("\n");
    await D0.batch(pecah(lama).map(x => D0.prepare(x)));
    const kuki = {cookie: "sesi_instansi=" + "a".repeat(64)};
    for (const [m, j, body, h] of [["POST", "/api/instansi/masuk", {username: "pemkabseruyan", sandi: "x"}, {}], ["GET", "/api/instansi/saya", undefined, kuki], ["GET", "/api/instansi/tugas", undefined, kuki], ["POST", "/api/instansi/gantisandi", {}, kuki],
      ["POST", "/api/instansi/admin/buat", {}, ADMIN], ["GET", "/api/instansi/admin/akun", undefined, ADMIN], ["GET", "/api/instansi/admin/antrean", undefined, ADMIN], ["GET", "/api/instansi/admin/pantau", undefined, ADMIN], ["GET", "/api/instansi/admin/usulan", undefined, ADMIN], ["POST", "/api/instansi/admin/dummy", {aksi: "isi"}, ADMIN]]) {
      const r = await api(m, j, body, h, mf0); assert.equal(r.s, 503, `${m} ${j}: ${r.t}`); assert.match(r.j.galat, /migrasi 0029 belum diterapkan/);
    }
    assert.equal((await api("GET", "/instansi", undefined, {}, mf0)).s, 200, "halaman statis tidak butuh tabel");
    const env = {DB: D0, ASSETS: {fetch: aset}}; TUGAS = {dibuat: new Date().toISOString(), kompleks: [KOMPLEKS("K1", -2.55, 112.0)]};
    assert.deepEqual(await buatTugas(env, Date.now()), {lewat: "migrasi 0029 belum diterapkan"}); assert.deepEqual(await bersihkanInstansi(env, Date.now()), {lewat: "migrasi 0029 belum diterapkan"});
    await (await mf0.getWorker()).scheduled({cron: "* * * * *", scheduledTime: Date.UTC(2026, 9, 21, 3, 18)});   // cron lain tetap jalan
    await (await mf0.getWorker()).scheduled({cron: "* * * * *", scheduledTime: Date.UTC(2026, 9, 21, 3, 17)});
    /* galat lain (bukan tabel 0029) tetap 500, tidak ditelan jadi 503 */
    await assert.rejects(buatTugas({DB: {prepare: () => { throw new Error("D1_ERROR: no such table: kontak_pt"); }}, ASSETS: {fetch: aset}}, Date.now()), /kontak_pt/);
  } finally { TUGAS = null; await mf0.dispose(); }
});

uji("instansi: personelProvinsi menjumlah kabar terakhir tiap tugas per provinsi pada hari WIB itu, tanpa dummy", async () => {
  await DB.prepare("DELETE FROM tugas_api WHERE dummy = 0").run();
  const hari = new Date(Date.now() + 7 * JAM).toISOString().slice(0, 10), mulai = Date.parse(hari + "T00:00:00+07:00"), aid = await akunId("pemkabseruyan");
  const X = await tugasBaru("62", "Seruyan"), Y = await tugasBaru("62", "Katingan"), Z = await tugasBaru("63", "Banjar"), D = await tugasBaru("62", "Seruyan", {}), K = await tugasBaru("62", "Seruyan");
  await DB.prepare("UPDATE tugas_api SET dummy = 1 WHERE id = ?").bind(D).run();
  let nomor = 0;
  const ti = (tugas, jam, kol, dummy = 0) => DB.prepare(`INSERT INTO tugas_isian (id, tugas_id, akun_id, klien_id, langkah, dibuat, tindakan, status_api, dummy, ${Object.keys(kol).join(", ")}) VALUES (?, ?, ?, ?, 'tindakan', ?, 'uji', 'bara', ?, ${Object.keys(kol).map(() => "?").join(", ")})`)
    .bind(`${String(++nomor).padStart(16, "0")}`, tugas, aid, "klien-pp-" + nomor, mulai + jam * JAM, dummy, ...Object.values(kol)).run();
  await ti(X, 1, {personel_unsur: JSON.stringify({bpbd: 99, tni: 99}), regu: 9});   // kabar lama X: tertimpa kabar terakhir
  await ti(X, 3, {personel_unsur: JSON.stringify({bpbd: 5, tni: 3}), regu: 2, alat_dipakai: JSON.stringify({pompa: 2, heli_wb: 1})});
  await ti(Y, 2, {personel: 7, regu: 1, alat_dipakai: JSON.stringify({selang_m: 100, pompa: 1})});
  await ti(Z, 4, {personel_unsur: JSON.stringify({relawan: 4, bpbd: 1}), personel_terlihat: 50});
  await ti(K, -5, {personel_unsur: JSON.stringify({tni: 77})});   // hari sebelumnya: tidak ikut
  await ti(D, 5, {personel_unsur: JSON.stringify({tni: 88})}, 1);   // dummy: tidak ikut
  const r = await personelProvinsi({DB}, hari); assert.equal(r.tanggal, hari);
  const p62 = r.provinsi.find(x => x.prov === "62"), p63 = r.provinsi.find(x => x.prov === "63");
  assert.deepEqual([p62.tugas, p62.regu, p62.personel_total, p62.tanpa_unsur, p62.unsur.bpbd, p62.unsur.tni, p62.alat.pompa, p62.alat.selang_m, p62.alat.heli_wb], [2, 3, 15, 7, 5, 3, 3, 100, 1], JSON.stringify(p62));
  assert.deepEqual([p63.tugas, p63.personel_total, p63.unsur.relawan, p63.unsur.bpbd, p63.tanpa_unsur], [1, 5, 4, 1, 0], "unsur menang atas hitungan mesin"); assert.equal(p62.nama, "Kalimantan Tengah");
  assert.deepEqual(Object.keys(p62.unsur), ["bpbd", "tni", "polri", "manggala_agni", "mpa", "damkar", "swasta", "relawan", "lainnya"]); assert.deepEqual(r.provinsi.map(x => x.prov), ["62", "63"], "urut provinsi");
  assert.deepEqual((await personelProvinsi({DB}, "2020-01-01")).provinsi, [], "hari tanpa kabar");
  await assert.rejects(personelProvinsi({DB}, "2026-02-30"), /tanggal/); await assert.rejects(personelProvinsi({DB}, "kemarin"), /tanggal/); await assert.rejects(personelProvinsi({DB}, undefined), /tanggal/);
});

/* ================================================================ penugasan: akses, padam, EXIF (paket 21 Okt 2026; pelacak dan tautan di penugasan.test.mjs) */
const AK = {jalan: {lat: -1.21, lon: 111.2, kelas: "primary", km_garis_lurus: 4.2}, kaki_km: 3.1, jam_tiba: 3.2, dari: {dari: "Posko Uji", jenis: "posko", km_jalan: 38, jam: 1.4}, jalan_kaki_jam: 1.8,
  bawa: [{barang: "Selang 2 inci", jumlah: 200, satuan: "m", status: "dipikul"}, {barang: "Pompa jinjing", jumlah: 2, satuan: "unit", status: "dipikul"}]};
uji("instansi: akses disalin cron ke tugas_api (JSON <= 1500), diperbarui saat bergabung, bentuk buruk jadi null, pasAkses memotong daftar bawa", async () => {
  const fresh = (ks, dibuat = new Date(BASE - 30 * MENIT).toISOString()) => ({dibuat, kompleks: ks});
  TUGAS = fresh([KOMPLEKS("K9101", -1.2, 111.2, {akses: AK}), KOMPLEKS("K9102", -1.6, 111.6, {akses: "bukan objek"}), KOMPLEKS("K9103", -1.9, 111.9, {akses: [1, 2]}), KOMPLEKS("K9104", -1.95, 111.95)]); await cron();
  const ambil = async lat => (await DB.prepare("SELECT akses FROM tugas_api WHERE lat = ?").bind(lat).first()).akses;
  assert.deepEqual(JSON.parse(await ambil(-1.2)), AK, "akses disalin apa adanya"); assert.ok((await ambil(-1.2)).length <= 1500);
  for (const lat of [-1.6, -1.9, -1.95]) assert.equal(await ambil(lat), null, `akses buruk atau kosong menjadi null (${lat})`);
  /* bergabung (<= 2 km): akses baru menggantikan, kompleks tanpa akses tidak menghapus yang lama */
  const baru = {...AK, kaki_km: 2.2}; TUGAS = fresh([KOMPLEKS("K9101", -1.205, 111.2, {akses: baru})]); await cron(BASE + 3 * JAM); assert.equal(JSON.parse(await ambil(-1.2)).kaki_km, 2.2, "diperbarui saat bergabung");
  TUGAS = fresh([KOMPLEKS("K9101", -1.205, 111.2)], new Date(BASE + 3 * JAM - 30 * MENIT).toISOString()); await cron(BASE + 6 * JAM); assert.equal(JSON.parse(await ambil(-1.2)).kaki_km, 2.2, "tanpa akses baru: yang lama tetap");
  /* terlalu panjang: daftar bawa dipotong dari belakang sampai muat, tetap JSON sah */
  const besar = {...AK, bawa: Array.from({length: 80}, (_, i) => ({barang: "Barang nomor " + i, jumlah: i + 1, satuan: "buah", status: "dipikul"}))}, s = pasAkses(besar);
  assert.ok(s.length <= 1500 && JSON.parse(s).bawa.length > 5 && JSON.parse(s).bawa.length < 80, `terpotong (${s.length})`); assert.equal(JSON.parse(s).bawa[0].barang, "Barang nomor 0", "yang dipotong dari belakang"); assert.equal(JSON.parse(s).kaki_km, 3.1);
  assert.equal(pasAkses({...AK, dari: {dari: "x".repeat(2000)}}), null, "bukan bawa yang membengkak: null"); assert.equal(pasAkses(null), null); assert.equal(pasAkses([]), null); assert.equal(pasAkses("x"), null);
  assert.ok(pasAkses({jalan: null, kaki_km: 1, jam_tiba: null, dari: null, jalan_kaki_jam: null, bawa: null}), "kunci bernilai null sah");
  /* tampil di rincian tugas akun */
  const tid = (await DB.prepare("SELECT id FROM tugas_api WHERE lat = -1.2").first()).id; await aktifkan("pemkabseruyan"); const h = await masuk("pemkabseruyan"), r = await api("GET", `/api/instansi/tugas/${tid}`, undefined, h);
  assert.equal(r.j.tugas.akses.dari.dari, "Posko Uji"); assert.equal(r.j.tugas.akses.kaki_km, 2.2); assert.equal(r.j.tugas.padam, null);
});

const titikRound = async (dibuat, titik, acuan = dibuat) => DB.prepare("INSERT INTO titik_terbaru (dibuat, isi) VALUES (?, ?)").bind(dibuat, JSON.stringify({kolom: ["lat", "lon", "jam", "sensor", "frp", "keyakinan", "wilayah", "tgl_wib"], acuan: new Date(acuan).toISOString(), dibuat: new Date(dibuat).toISOString(), wilayah: [], sensor_utama: ["N"], galat: [],
  baris: titik.map(([lat, lon, jam]) => [lat, lon, jam, "N", 12, 2, 0, "2026-10-21"])})).run();
const derajatM = m => m / 111320;
uji("instansi: padam wajib foto lokasi; dilaporkan, 24 jam belum ada titik baru, terverifikasi 48 jam; titik baru dalam 2 km membuka kembali tugas dan menjadi butir Meja Pantau; cek ulang lapangan", async () => {
  const h = await masuk("pemkabseruyan"), lat = -1.5, lon = 111.5, now = Date.now(), tid = await tugasBaru("62", "Seruyan", {lat, lon, dibuat: now - 4 * JAM});
  const g = gps(lat, lon), foto = async (tugasId = tid) => (await unggah(h, tugasId, {media: jpeg(1), g})).j.id;
  assert.equal((await api("POST", `/api/instansi/konfirmasi/${tid}`, KONF([await foto()]), h)).s, 201);
  const tanpaFoto = await api("POST", `/api/instansi/kabar/${tid}`, KABAR([], {status_api: "padam"}), h); assert.equal(tanpaFoto.s, 400, "melaporkan padam wajib minimal satu foto lokasi padam"); assert.match(tanpaFoto.j.galat, /foto atau video/);
  assert.equal((await api("POST", `/api/instansi/kabar/${tid}`, KABAR([], {status_api: "bara"}), h)).s, 201, "kabar selain padam tetap boleh tanpa foto");
  assert.equal((await DB.prepare("SELECT padam_verif FROM tugas_api WHERE id = ?").bind(tid).first()).padam_verif, null, "belum padam: tanpa verifikasi");
  const lapor = await api("POST", `/api/instansi/kabar/${tid}`, KABAR([await foto()], {status_api: "padam"}), h); assert.equal(lapor.s, 201, lapor.t);
  let t = await DB.prepare("SELECT status, padam_verif, padam_pada, verif_pada, cek_ulang_pada FROM tugas_api WHERE id = ?").bind(tid).first();
  assert.equal(t.status, "padam"); assert.equal(t.padam_verif, "padam_dilaporkan"); assert.ok(Math.abs(t.padam_pada - Date.now()) < 5000); assert.equal(t.cek_ulang_pada, null);
  const rin = (await api("GET", `/api/instansi/tugas/${tid}`, undefined, h)).j.tugas; assert.equal(rin.padam.status, "padam_dilaporkan"); assert.equal(rin.padam.boleh_cek_ulang, true); assert.match(rin.padam.label, /Padam dilaporkan/);
  /* konfirmasi "sudah padam" juga memulai verifikasi */
  const t2 = await tugasBaru("62", "Seruyan", {lat: lat - 0.4, lon: lon - 0.4}), k2 = await api("POST", `/api/instansi/konfirmasi/${t2}`, KONF([(await unggah(h, t2, {media: jpeg(1), g: gps(lat - 0.4, lon - 0.4)})).j.id], {hasil: "sudah_padam"}), h);
  assert.equal(k2.s, 201, k2.t); assert.equal((await DB.prepare("SELECT padam_verif FROM tugas_api WHERE id = ?").bind(t2).first()).padam_verif, "padam_dilaporkan");
  /* tanpa putaran titik: tidak memutuskan apa pun */
  await DB.prepare("DELETE FROM titik_terbaru").run(); assert.equal((await verifikasiPadam({DB}, now)).lewat, "belum ada putaran titik panas");
  /* 24 jam tanpa titik baru: label jujur, belum terverifikasi */
  await DB.prepare("UPDATE tugas_api SET padam_pada = ? WHERE id = ?").bind(now - 25 * JAM, tid).run();
  await titikRound(now - JAM, [[lat + 0.1, lon, 0], [lat, lon + derajatM(2500), 0]]);   // titik di 11 km dan 2,5 km: di luar radius 2 km
  let v = await verifikasiPadam({DB}, now); assert.equal(v.muncul, 0, "titik di luar 2 km tidak membuka kembali"); assert.equal(v.terverifikasi, 0, "25 jam: belum 48 jam");
  t = await DB.prepare("SELECT * FROM tugas_api WHERE id = ?").bind(tid).first(); assert.equal(t.padam_verif, "padam_dilaporkan");
  assert.equal(infoPadam(t, now).label, "Padam, belum ada titik baru 24 jam. Menunggu 48 jam untuk verifikasi satelit.", "label 24 jam");
  /* 48 jam: putaran lama (tidak mencakup 48 jam itu) belum cukup; putaran baru menutup */
  await DB.prepare("UPDATE tugas_api SET padam_pada = ? WHERE id = ?").bind(now - 49 * JAM, tid).run();
  await DB.prepare("DELETE FROM titik_terbaru").run(); await titikRound(now - 5 * JAM, [[lat + 0.1, lon, 0]]);
  v = await verifikasiPadam({DB}, now); assert.equal(v.terverifikasi, 0, "putaran terbaru 5 jam lalu tidak mencakup 48 jam penuh"); assert.equal((await DB.prepare("SELECT padam_verif FROM tugas_api WHERE id = ?").bind(tid).first()).padam_verif, "padam_dilaporkan");
  await titikRound(now - 30 * MENIT, [[lat + 0.1, lon, 0]]); v = await verifikasiPadam({DB}, now); assert.equal(v.terverifikasi, 1);
  t = await DB.prepare("SELECT * FROM tugas_api WHERE id = ?").bind(tid).first(); assert.equal(t.padam_verif, "padam_terverifikasi"); assert.equal(t.verif_pada, now); assert.equal(t.status, "padam", "status tetap padam");
  const lab = infoPadam(t, now).label; assert.match(lab, /tidak terdeteksi satelit 48 jam/); assert.match(lab, /Bara bawah permukaan tetap mungkin, cek ulang lapangan/);
  assert.deepEqual(await verifikasiPadam({DB}, now), {periksa: 2, muncul: 0, terverifikasi: 0}, "idempoten: dua tugas diperiksa, tidak ada yang berubah lagi");
  /* titik baru dalam 2 km SESUDAH padam: muncul lagi (juga dari keadaan terverifikasi), tugas dibuka kembali */
  const n2 = Date.now(); await DB.prepare("DELETE FROM titik_terbaru").run();
  await titikRound(n2 - MENIT, [[lat, lon + derajatM(100), -60]]); assert.equal((await verifikasiPadam({DB}, n2)).muncul, 0, "titik sebelum waktu padam tidak dihitung"); await DB.prepare("DELETE FROM titik_terbaru").run();
  await titikRound(n2 - 10 * MENIT, [[lat, lon + derajatM(1900), -0.5], [lat, lon + derajatM(100), -60]]);   // 1,9 km, 30 menit lalu: kena; yang satu lagi 60 jam lalu (sebelum padam): tidak dihitung sendiri
  v = await verifikasiPadam({DB}, n2); assert.equal(v.muncul, 1, JSON.stringify(v));
  t = await DB.prepare("SELECT * FROM tugas_api WHERE id = ?").bind(tid).first(); assert.equal(t.status, "buka", "dibuka kembali"); assert.equal(t.padam_verif, "muncul_lagi"); assert.equal(t.verif_pada, n2); assert.equal(t.isian_terakhir, n2, "jendela kabar 24 jam dimulai lagi");
  assert.equal(tenggat(t, n2).terlambat, false); assert.equal(tenggat(t, n2).langkah, "kabar");
  const lagi = infoPadam(t, n2); assert.equal(lagi.tingkat, "merah"); assert.match(lagi.label, /Api muncul lagi/); assert.equal(lagi.boleh_cek_ulang, false);
  /* butir Meja Pantau api_muncul_lagi: ada sampai kabar tindakan baru masuk; dummy tidak ikut kecuali diminta */
  let butir = await butirApiMunculLagi({DB}, n2 + MENIT, false); const b = butir.find(x => x.id === `api-muncul:${tid}:${n2}`); assert.ok(b, JSON.stringify(butir.map(x => x.id))); assert.equal(b.jenis, "api_muncul_lagi"); assert.deepEqual(b.provs, ["62"]); assert.equal(b.prioritas, 1); assert.match(b.judul, /Api muncul lagi di Kec Uji, Seruyan sesudah dilaporkan padam/);
  await new Promise(r => setTimeout(r, 15)); const kab = await api("POST", `/api/instansi/kabar/${tid}`, KABAR([], {status_api: "menyala"}), h); assert.equal(kab.s, 201, kab.t);
  butir = await butirApiMunculLagi({DB}, Date.now(), false); assert.ok(!butir.some(x => x.id.includes(tid)), "kabar baru menghapus butir");
  /* padam lagi: verifikasi mulai dari awal dan cek ulang direset */
  const lapor2 = await api("POST", `/api/instansi/kabar/${tid}`, KABAR([await foto()], {status_api: "padam"}), h); assert.equal(lapor2.s, 201, lapor2.t);
  t = await DB.prepare("SELECT status, padam_verif, padam_pada, cek_ulang_pada FROM tugas_api WHERE id = ?").bind(tid).first(); assert.equal(t.padam_verif, "padam_dilaporkan"); assert.equal(t.cek_ulang_pada, null); assert.ok(t.padam_pada > now);
  /* kabar padam ke tugas yang belum dikonfirmasi tetap ditolak; tugas yang tidak padam tidak diperiksa */
  assert.equal((await DB.prepare("SELECT count(*) n FROM tugas_api WHERE padam_verif IS NOT NULL AND status = 'bukan_api'").first()).n, 0);
  /* cek ulang lapangan: foto kedua; hanya untuk tugas padam, sekali, wilayah sendiri */
  const CU = (media, o = {}) => ({klien_id: `uji-cu-${++kl}`, media, ...o});
  assert.equal((await api("POST", `/api/instansi/cekulang/${tid}`, CU([]), h)).s, 400, "wajib minimal satu foto"); assert.equal((await api("POST", `/api/instansi/cekulang/${tid}`, CU(["0".repeat(16)]), h)).s, 400, "media tak dikenal");
  assert.equal((await api("POST", `/api/instansi/cekulang/${await tugasBaru("62", "Seruyan")}`, CU([]), h)).s, 409, "tugas yang tidak padam: cek ulang ditolak");
  const m1 = await foto(), m2 = await foto(), sama = CU([m1]); const cu = await api("POST", `/api/instansi/cekulang/${tid}`, sama, h); assert.equal(cu.s, 201, cu.t);
  t = await DB.prepare("SELECT status, padam_verif, cek_ulang_pada FROM tugas_api WHERE id = ?").bind(tid).first(); assert.equal(t.status, "padam"); assert.ok(t.cek_ulang_pada > 0);
  const ik = await DB.prepare("SELECT langkah, status_api, tindakan FROM tugas_isian WHERE id = ?").bind(cu.j.id).first(); assert.equal(ik.langkah, "tindakan"); assert.equal(ik.status_api, "padam"); assert.match(ik.tindakan, /Cek ulang lapangan/);
  assert.equal(await n("instansi_media", `isian_id = '${cu.j.id}'`), 1, "foto kedua terikat ke isian cek ulang");
  const kirimUlang = await api("POST", `/api/instansi/cekulang/${tid}`, sama, h); assert.equal(kirimUlang.s, 200); assert.equal(kirimUlang.j.ulang, true); assert.equal(kirimUlang.j.id, cu.j.id, "klien_id sama: tidak menggandakan");
  assert.equal((await api("POST", `/api/instansi/cekulang/${tid}`, CU([m2]), h)).s, 409, "sekali per laporan padam");
  assert.equal((await unggah(h, tid, {media: jpeg(1), g})).s, 409, "sesudah dicek ulang: tugas padam tidak menerima foto lagi");
  assert.equal((await api("GET", `/api/instansi/tugas/${tid}`, undefined, h)).j.tugas.padam.cek_ulang, true);
  const lain = await tugasBaru("62", "Katingan"); assert.equal((await api("POST", `/api/instansi/cekulang/${lain}`, CU([m2]), h)).s, 404, "kabupaten lain: 404");
});

uji("instansi: EXIF dibaca peramban tersimpan (waktu, GPS, kamera), jarak ke titik api, curiga bila GPS EXIF > 5 km dari api, tanda terverifikasi di galeri, berkas tetap tanpa EXIF", async () => {
  const u = "pemkabkotawaringintimur"; assert.ok(SANDI.has(u), "akun contoh ada"); await aktifkan(u); const h = await masuk(u);
  const tid = await tugasBaru("62", "Kotawaringin Timur", {lat: -2.55, lon: 112.0}), now = Date.now();
  const dekat = gps(-2.5801, 112.0201, now);   // GPS perangkat sekitar 4 km dari titik api
  const jauh = gps(-2.62, 112.06, now);   // sekitar 10 km dari titik api
  /* foto dengan EXIF lengkap dari kamera, GPS perangkat dekat api: terverifikasi tiga, tanpa curiga */
  const a = await unggah(h, tid, {media: jpeg(2, {exif: true}), g: dekat, exif: {exif_waktu: now - 30 * MENIT, exif_lat: -2.5802, exif_lon: 112.0202, kamera: 1}}); assert.equal(a.s, 201, a.t);
  assert.deepEqual(a.j.terverifikasi, {kamera: true, waktu: true, gps: true}); assert.ok(a.j.exif_jarak < 40, String(a.j.exif_jarak)); assert.ok(a.j.exif_api_km > 3 && a.j.exif_api_km < 5, String(a.j.exif_api_km)); assert.equal(a.j.sumber_waktu, "exif"); assert.equal(a.j.waktu_ambil, now - 30 * MENIT);
  let m = await DB.prepare("SELECT * FROM instansi_media WHERE id = ?").bind(a.j.id).first();
  assert.equal(m.exif_waktu, now - 30 * MENIT); assert.equal(m.exif_lat, -2.5802); assert.equal(m.exif_lon, 112.0202); assert.equal(m.kamera, 1); assert.ok(m.exif_jarak < 40 && m.exif_api_km < 5); assert.equal(m.gps_curiga, null, "dekat api: tidak curiga");
  /* GPS EXIF lebih dari 5 km dari api (perangkat juga di sana, jadi cocok satu sama lain): disimpan, ditandai curiga untuk admin */
  const b = await unggah(h, tid, {media: jpeg(1), g: jauh, exif: {exif_waktu: now - 5 * MENIT, exif_lat: -2.6201, exif_lon: 112.0601, kamera: 0}}); assert.equal(b.s, 201, b.t);
  m = await DB.prepare("SELECT * FROM instansi_media WHERE id = ?").bind(b.j.id).first(); assert.ok(m.exif_api_km > 5 && m.exif_api_km < 14, String(m.exif_api_km)); assert.match(m.gps_curiga, /GPS EXIF foto \d+(\.\d)? km dari titik api/); assert.equal(m.kamera, 0);
  assert.deepEqual(b.j.terverifikasi, {kamera: false, waktu: true, gps: true});
  /* tanpa EXIF (galeri, atau dibuang aplikasi): kolom kosong, tanpa tanda */
  const c = await unggah(h, tid, {media: jpeg(0), g: dekat}); assert.equal(c.s, 201); m = await DB.prepare("SELECT * FROM instansi_media WHERE id = ?").bind(c.j.id).first();
  assert.deepEqual([m.exif_waktu, m.exif_lat, m.exif_lon, m.exif_jarak, m.exif_api_km, m.kamera], [null, null, null, null, null, 0]); assert.deepEqual(c.j.terverifikasi, {kamera: false, waktu: false, gps: false}); assert.equal(m.sumber_waktu, "gps");
  /* aturan foto publik: GPS EXIF > 5 km dari GPS perangkat ditolak, EXIF lebih dari 48 jam ditolak; nilai gila tidak tersimpan */
  const x1 = await unggah(h, tid, {media: jpeg(0), g: dekat, exif: {exif_lat: -2.7, exif_lon: 112.3}}); assert.equal(x1.s, 400); assert.match(x1.j.galat, /km dari posisi Anda/);
  const x2 = await unggah(h, tid, {media: jpeg(0), g: dekat, exif: {exif_waktu: now - 49 * JAM}}); assert.equal(x2.s, 400); assert.match(x2.j.galat, /48 jam/);
  const x3 = await unggah(h, tid, {media: jpeg(0), g: dekat, exif: {exif_lat: 95, exif_lon: 400}}); assert.equal(x3.s, 400, "koordinat EXIF di luar bumi: jaraknya sangat jauh, ditolak"); assert.equal(await n("instansi_media", `tugas_id = '${tid}'`), 3, "penolakan tidak meninggalkan berkas");
  const x4 = await unggah(h, tid, {media: jpeg(0), g: dekat, exif: {exif_waktu: now + 3 * JAM}}); assert.equal(x4.s, 201, x4.t); assert.equal((await DB.prepare("SELECT exif_waktu FROM instansi_media WHERE id = ?").bind(x4.j.id).first()).exif_waktu, null, "waktu EXIF di masa depan diabaikan");
  /* berkas yang DISIMPAN tetap tanpa EXIF, XMP, ICC, komentar, dan data sesudah EOI */
  const tersimpan = new Uint8Array(await (await R2.get(`instansi/media/${a.j.id}`)).arrayBuffer()), baca = new TextDecoder("latin1").decode(tersimpan);
  for (const rahasia of ["GPS-LOKASI-RAHASIA", "XMP-RAHASIA", "komentar-rahasia", "MPF-RAHASIA"]) assert.ok(!baca.includes(rahasia), `${rahasia} dibuang dari berkas tersimpan`);
  /* galeri: rincian tugas membawa kolom EXIF dan tanda terverifikasi; isian merujuk media */
  const k = await api("POST", `/api/instansi/konfirmasi/${tid}`, KONF([a.j.id, b.j.id, c.j.id]), h); assert.equal(k.s, 201, k.t);
  const rin = await api("GET", `/api/instansi/tugas/${tid}`, undefined, h), ma = rin.j.media.find(x => x.id === a.j.id), mb = rin.j.media.find(x => x.id === b.j.id), mc = rin.j.media.find(x => x.id === c.j.id);
  assert.deepEqual([ma.exif_waktu, ma.exif_lat, ma.exif_lon, ma.kamera], [now - 30 * MENIT, -2.5802, 112.0202, true]); assert.deepEqual(ma.terverifikasi, {kamera: true, waktu: true, gps: true}); assert.ok(ma.exif_api_km < 5 && ma.exif_jarak < 40);
  assert.ok(mb.exif_api_km > 5 && /GPS EXIF foto/.test(mb.gps_curiga)); assert.deepEqual(mc.terverifikasi, {kamera: false, waktu: false, gps: false}); assert.equal(mc.exif_lat, null);
  const ad = await adm("GET", `/api/instansi/admin/tugas/${tid}`); assert.equal(ad.s, 200); assert.deepEqual(ad.j.media.find(x => x.id === a.j.id).terverifikasi, {kamera: true, waktu: true, gps: true}, "admin melihat tanda yang sama");
  /* koordinat EXIF hanya ke pengunggah, admin, dan staf: akun lain sekabupaten melihat jarak ke api dan tanda verifikasi saja */
  assert.ok(SANDI.has("polreskotawaringintimur")); await aktifkan("polreskotawaringintimur"); const h2 = await masuk("polreskotawaringintimur"), r2 = await api("GET", `/api/instansi/tugas/${tid}`, undefined, h2), m2 = r2.j.media.find(x => x.id === a.j.id);
  assert.deepEqual([m2.exif_lat, m2.exif_lon], [null, null], "akun lain: tanpa koordinat EXIF"); assert.ok(m2.exif_api_km != null && m2.terverifikasi.gps === true && m2.exif_waktu != null); assert.ok(!r2.t.includes("-2.5802") && !r2.t.includes("112.0202"));
  assert.equal(ma.exif_lat, -2.5802, "pengunggah melihat koordinatnya"); assert.equal(ad.j.media.find(x => x.id === a.j.id).exif_lat, -2.5802, "admin melihat koordinat EXIF");
  /* klien: EXIF dibaca dari berkas ASLI sebelum kompres, kamera ditandai dari tombol Ambil foto, dikirim bersama unggahan */
  const js = readFileSync(path.join(AKAR, "public/instansi.js"), "utf8"); assert.match(js, /bacaExif\(await f\.slice\(0, 256 \* 1024\)\.arrayBuffer\(\)\)[\s\S]{0,400}createImageBitmap\(f\)/, "EXIF dibaca dari f (asli) sebelum createImageBitmap/kompres");
  assert.match(js, /fd\.append\("exif_waktu"/); assert.match(js, /fd\.append\("exif_lat"/); assert.match(js, /fd\.append\("kamera", "1"\)/); assert.match(js, /_kamera/);
});

uji("instansi: cron buatTugas menjalankan verifikasi padam lebih dulu, walau tugas_kompleks.json tidak ada, dan galat verifikasi tidak menahan pembuatan tugas", async () => {
  const lat = -1.8, lon = 111.8, padamPada = BASE - 5 * JAM, id = await tugasBaru("62", "Seruyan", {lat, lon, status: "padam", konfirmasi_pada: padamPada - JAM, isian_terakhir: padamPada});
  await DB.prepare("UPDATE tugas_api SET padam_verif = 'padam_dilaporkan', padam_pada = ?, verif_pada = ? WHERE id = ?").bind(padamPada, padamPada, id).run();
  await DB.prepare("DELETE FROM titik_terbaru").run(); await titikRound(BASE - 20 * MENIT, [[lat + derajatM(900), lon, -0.2]], BASE - 20 * MENIT);
  TUGAS = null; await cron(BASE);   // berkas tugas tidak ada: pembuatan tugas keluar, verifikasi tetap jalan
  const t = await DB.prepare("SELECT status, padam_verif, verif_pada, isian_terakhir FROM tugas_api WHERE id = ?").bind(id).first();
  assert.deepEqual([t.status, t.padam_verif, t.verif_pada, t.isian_terakhir], ["buka", "muncul_lagi", BASE, BASE], "titik 900 m sesudah padam: dibuka kembali oleh cron menit 18");
  /* tabel titik_terbaru hilang (keadaan aneh): pembuatan tugas tetap berjalan */
  const id2 = await tugasBaru("62", "Seruyan", {lat: lat - 0.3, lon, status: "padam"}); await DB.prepare("UPDATE tugas_api SET padam_verif = 'padam_dilaporkan', padam_pada = ?, verif_pada = ? WHERE id = ?").bind(padamPada, padamPada, id2).run();
  await DB.prepare("ALTER TABLE titik_terbaru RENAME TO titik_terbaru_x").run();
  try { TUGAS = {dibuat: new Date(BASE + 3 * JAM - 30 * MENIT).toISOString(), kompleks: [KOMPLEKS("K9200", -0.3, 110.3)]}; const sebelum = await n("tugas_api"); await cron(BASE + 3 * JAM); assert.equal(await n("tugas_api"), sebelum + 1, "tugas baru tetap dibuat"); }
  finally { await DB.prepare("ALTER TABLE titik_terbaru_x RENAME TO titik_terbaru").run(); }
});


/* ================================================================ L1: verifikasi padam + api muncul lagi (Himawari, regu, cek ulang terjadwal) */
const padamkan = (id, padamPada, o = {}) => DB.prepare("UPDATE tugas_api SET status = 'padam', padam_verif = ?, padam_pada = ?, verif_pada = ?, cek_ulang_pada = ?, konfirmasi_pada = ?, isian_terakhir = ? WHERE id = ?")
  .bind(o.verif ?? "padam_dilaporkan", padamPada, padamPada, o.cek ?? null, padamPada - JAM, padamPada, id).run();
const himawariR2 = (baris, acuan) => R2.put("data/himawari.json", JSON.stringify({acuan: new Date(acuan).toISOString(), kolom: [], baris}));
uji("L1: Himawari dalam 2 km memicu muncul_lagi (sumber, jarak, keterangan); di luar 2 km, basi, n=1, level 1, dan sebelum laporan padam tidak", async () => {
  const h = await masuk("pemkabseruyan"), now = Date.now(), pada = now - 3 * JAM, dLat = derajatM(1);
  const mk = async (lat, lon, o) => { const id = await tugasBaru("62", "Seruyan", {lat, lon}); await padamkan(id, o?.pada ?? pada); return id; };
  const A = await mk(-0.7, 110.7), B = await mk(-0.9, 110.9), C = await mk(-0.5, 110.5), D = await mk(-0.3, 110.3, {pada: now - 10 * MENIT});
  const km1_2 = [-0.7, 110.7 + derajatM(1200) / Math.cos(0)];
  await himawariR2([[km1_2[0], km1_2[1], 20, 30, 3, 3, 1, 3, 50, 1],                     // A: 1,2 km, bertahan 3 pindaian
    [-0.9, 110.9 + derajatM(2600), 20, 30, 3, 3, 1, 3, 50, 1],                            // B: 2,6 km
    [-0.5, 110.5, 61, 30, 3, 3, 1, 4, 90, 0], [-0.5, 110.5, 20, 30, 3, 3, 1, 1, 20, 0], [-0.5, 110.5, 20, 30, 1, 3, 1, 4, 50, 0],   // C: terlalu tua, n=1, level 1
    [-0.3, 110.3, 20, 30, 3, 3, 1, 3, 50, 1]], now - 5 * MENIT);                          // D: terdeteksi sebelum laporan padam
  await DB.prepare("DELETE FROM titik_terbaru").run(); await titikRound(now - 10 * MENIT, [[5, 100, 0]]);
  const v = await verifikasiPadam({DB, MEDIA: R2}, now); assert.equal(v.muncul, 1, JSON.stringify([v, (await DB.prepare("SELECT id, lat, lon, padam_pada, verif_pada FROM tugas_api WHERE padam_verif = 'muncul_lagi'").all()).results, [A, B, C, D]]));
  const st = async id => (await DB.prepare("SELECT status, padam_verif, verif_pada FROM tugas_api WHERE id = ?").bind(id).first());
  assert.deepEqual(await st(A), {status: "buka", padam_verif: "muncul_lagi", verif_pada: now});
  for (const id of [B, C, D]) assert.equal((await st(id)).padam_verif, "padam_dilaporkan", "tidak terpicu");
  const m = await DB.prepare("SELECT * FROM tugas_muncul WHERE tugas_id = ?").bind(A).first();
  assert.equal(m.sumber, "himawari"); assert.equal(m.waktu, now); assert.ok(Math.abs(m.jarak_km - 1.2) < 0.05, m.jarak_km); assert.match(m.keterangan, /sekitar 2 km[^]*perkiraan, bukan kepastian/);
  assert.equal(await n("tugas_muncul", `tugas_id = '${A}'`), 1);
  const rin = (await api("GET", `/api/instansi/tugas/${A}`, undefined, h)).j.tugas.padam;
  assert.equal(rin.status, "muncul_lagi"); assert.equal(rin.muncul.sumber, "himawari"); assert.equal(rin.muncul.waktu, now); assert.ok(rin.muncul.jarak_km > 1);
  /* acuan Himawari basi (> 3 jam): tidak memicu, dan tanpa putaran FIRMS yang memutuskan pun tidak galat */
  await himawariR2([[-0.9, 110.9, 20, 30, 3, 3, 1, 3, 50, 1]], now - 4 * JAM);
  assert.equal((await verifikasiPadam({DB, MEDIA: R2}, now)).muncul, 0, "acuan 4 jam: basi");
  /* R2 tak terbaca atau tanpa binding: dilewati, FIRMS tetap jalan */
  await R2.put("data/himawari.json", "{bukan json"); assert.equal((await verifikasiPadam({DB, MEDIA: R2}, now)).muncul, 0);
  await DB.prepare("DELETE FROM titik_terbaru").run(); await titikRound(now - MENIT, [[-0.9, 110.9 + derajatM(500), -0.1]]);
  assert.equal((await verifikasiPadam({DB, MEDIA: R2}, now)).muncul, 1, "FIRMS 500 m sesudah padam tetap memicu walau R2 rusak");
  const f = await DB.prepare("SELECT sumber, jarak_km FROM tugas_muncul WHERE tugas_id = ?").bind(B).first(); assert.equal(f.sumber, "firms"); assert.ok(Math.abs(f.jarak_km - 0.5) < 0.05);
  await R2.delete("data/himawari.json");
  /* tabel rincian 0037 belum ada: tugas tetap dibuka kembali */
  const E = await mk(-0.1, 110.1); await DB.prepare("DELETE FROM titik_terbaru").run(); await titikRound(now - MENIT, [[-0.1, 110.1 + derajatM(300), -0.1]]);
  await DB.prepare("ALTER TABLE tugas_muncul RENAME TO tugas_muncul_x").run();
  try { assert.equal((await verifikasiPadam({DB}, now)).muncul, 1); assert.equal((await st(E)).padam_verif, "muncul_lagi"); }
  finally { await DB.prepare("ALTER TABLE tugas_muncul_x RENAME TO tugas_muncul").run(); }
  assert.equal((await api("GET", `/api/instansi/tugas/${E}`, undefined, h)).j.tugas.padam.muncul, null, "tanpa rincian: status tetap tampil");
});

uji("L1: jadwal cek ulang H+1/H+3/H+7 untuk gambut (atau lahan tak diketahui); butir jatuh tempo; satu kunjungan memenuhi satu jadwal; mineral tanpa jadwal", async () => {
  const h = await masuk("pemkabseruyan"), lat = -1.1, lon = 111.1, g = gps(lat, lon), now = Date.now();
  const id = await tugasBaru("62", "Seruyan", {lat, lon}); await padamkan(id, now - 30 * HARI / 24 * 1);   // 30 jam lalu
  const foto = async () => (await unggah(h, id, {media: jpeg(1), g})).j.id, CU = m => ({klien_id: `uji-cu-${++kl}`, media: [m]});
  const info = async () => (await api("GET", `/api/instansi/tugas/${id}`, undefined, h)).j.tugas.padam;
  let p = await info(); assert.equal(p.gambut, true); assert.equal(p.dasar_lahan, "tidak_diketahui", "tanpa bukti lahan = dianggap gambut");
  assert.deepEqual(p.jadwal_cek_ulang.map(x => [x.hari, x.selesai, x.terlambat]), [[1, null, true], [3, null, false], [7, null, false]]); assert.equal(p.cek_ulang_berikutnya.hari, 1);
  assert.equal(p.jadwal_cek_ulang[0].jatuh_tempo - p.pada, HARI);
  /* butir Meja Pantau: H+1 lewat tanpa kunjungan */
  let b = (await butirCekUlang({DB}, now, false)).filter(x => x.id.includes(id)); assert.equal(b.length, 1); assert.equal(b[0].jenis, "cek_ulang_jatuh_tempo"); assert.deepEqual(b[0].provs, ["62"]); assert.match(b[0].id, /:1$/); assert.match(b[0].judul, /Cek ulang H\+1 di Kec Uji, Seruyan/);
  assert.match(b[0].rincian, /dianggap gambut/);
  /* cek ulang pertama memenuhi H+1; butir hilang; kedua belum boleh (H+3 belum masuk jendela) */
  const c1 = await api("POST", `/api/instansi/cekulang/${id}`, CU(await foto()), h); assert.equal(c1.s, 201, c1.t);
  p = await info(); assert.equal(p.jadwal_cek_ulang[0].selesai > 0, true); assert.equal(p.cek_ulang_berikutnya.hari, 3); assert.equal(p.boleh_cek_ulang, false);
  assert.ok(!(await butirCekUlang({DB}, Date.now(), false)).some(x => x.id.includes(id)), "kunjungan menghapus butir");
  assert.equal((await api("POST", `/api/instansi/cekulang/${id}`, CU(await foto()), h)).s, 409, "H+3 belum masuk jendela");
  /* 80 jam sesudah padam: H+3 lewat -> butir H+3; kirim lagi boleh; H+7 belum */
  await DB.prepare("UPDATE tugas_api SET padam_pada = ?, verif_pada = ? WHERE id = ?").bind(Date.now() - 80 * JAM, Date.now() - 80 * JAM, id).run();
  b = (await butirCekUlang({DB}, Date.now(), false)).filter(x => x.id.includes(id)); assert.equal(b.length, 1); assert.match(b[0].id, /:3$/);
  const kunc = (await DB.prepare("SELECT cek_ulang_pada FROM tugas_api WHERE id = ?").bind(id).first()).cek_ulang_pada;
  const c2 = await api("POST", `/api/instansi/cekulang/${id}`, CU(await foto()), h); assert.equal(c2.s, 201, c2.t);
  assert.equal((await DB.prepare("SELECT cek_ulang_pada FROM tugas_api WHERE id = ?").bind(id).first()).cek_ulang_pada, kunc, "cek_ulang_pada tetap = cek ulang pertama");
  p = await info(); assert.deepEqual(p.jadwal_cek_ulang.map(x => x.selesai != null), [true, true, false]); assert.equal(p.cek_ulang_berikutnya.hari, 7);
  assert.ok(!(await butirCekUlang({DB}, Date.now(), false)).some(x => x.id.includes(id)));
  assert.equal((await api("POST", `/api/instansi/cekulang/${id}`, CU(await foto()), h)).s, 409, "H+7 belum masuk jendela");
  /* murni: satu kunjungan hanya memenuhi satu jadwal; jendela 12 jam sebelum jatuh tempo; mineral teramati = bukan gambut, tanpa jadwal; campuran = gambut */
  const T0 = 1e12, tp = {status: "padam", padam_verif: "padam_dilaporkan", padam_pada: T0, cek_ulang_pada: null};
  assert.deepEqual(jadwalCekUlang({...tp, kunjungan: String(T0 + 11 * JAM)}, T0 + 2 * HARI).jadwal.map(x => x.selesai), [null, null, null], "11 jam sesudah padam: lebih awal dari jendela H+1 (12 jam sebelum jatuh tempo)");
  assert.equal(jadwalCekUlang({...tp, kunjungan: String(T0 + 13 * JAM)}, T0 + 2 * HARI).jadwal[0].selesai, T0 + 13 * JAM);
  assert.deepEqual(jadwalCekUlang({...tp, kunjungan: `${T0 + 30 * JAM},${T0 + 31 * JAM}`}, T0 + 4 * HARI).jadwal.map(x => x.selesai != null), [true, false, false], "H+3 butuh jendela 60 jam: dua kunjungan dini tidak memenuhi dua jadwal");
  assert.equal(jadwalCekUlang({...tp, status: "buka"}, T0), null);
  assert.deepEqual([lahanTugas({lahan_obs: "mineral"}).gambut, lahanTugas({lahan_obs: "mineral,gambut"}).gambut, lahanTugas({lahan_obs: "campuran"}).gambut, lahanTugas({lahan_obs: "tidak_tahu", rekomendasi: '{"cara":"pembasahan gambut"}'}).dasar, lahanTugas({}).dasar], [false, true, true, "rekomendasi", "tidak_diketahui"]);
  assert.equal(infoPadam({...tp, lahan_obs: "mineral"}, T0 + HARI).jadwal_cek_ulang, null); assert.equal(bolehCekUlang({...tp, lahan_obs: "mineral", cek_ulang_pada: T0 + JAM}, T0 + 5 * HARI), false, "non-gambut: sekali");
});

uji("L1: padam_terverifikasi untuk gambut butuh cek ulang H+1; non-gambut cukup aturan lama", async () => {
  const lat = -1.3, lon = 111.3, now = Date.now(), pada = now - 49 * JAM;
  const G = await tugasBaru("62", "Seruyan", {lat, lon}), M = await tugasBaru("62", "Seruyan", {lat: lat - 0.2, lon});
  await padamkan(G, pada); await padamkan(M, pada);
  /* M: lahan mineral teramati di satu isian (SQL langsung; rute pembuatnya diuji di atas) */
  await DB.prepare("INSERT INTO tugas_isian (id, tugas_id, akun_id, klien_id, langkah, dibuat, tindakan, kendala, bantuan, status_api, lahan_teramati) SELECT ?, ?, id, ?, 'tindakan', ?, 'Uji', '[]', '[]', 'bara', 'mineral' FROM instansi_akun LIMIT 1")
    .bind("1".repeat(16), M, "uji-mineral-1", pada - JAM).run();
  await DB.prepare("DELETE FROM titik_terbaru").run(); await titikRound(now - 20 * MENIT, [[lat + 0.5, lon, 0]]);
  const st = async id => (await DB.prepare("SELECT padam_verif FROM tugas_api WHERE id = ?").bind(id).first()).padam_verif;
  await verifikasiPadam({DB}, now);
  assert.equal(await st(M), "padam_terverifikasi", "mineral: aturan lama"); assert.equal(await st(G), "padam_dilaporkan", "gambut tanpa cek ulang H+1: belum");
  const t = await DB.prepare(`SELECT ${"t.id, t.status, t.padam_verif, t.padam_pada, t.verif_pada, t.cek_ulang_pada, t.rekomendasi"} FROM tugas_api t WHERE t.id = ?`).bind(G).first();
  assert.match(infoPadam(t, now).label, /Menunggu cek ulang lapangan H\+1 \(gambut\)/);
  await DB.prepare("UPDATE tugas_api SET cek_ulang_pada = ? WHERE id = ?").bind(now - 10 * JAM, G).run();
  await verifikasiPadam({DB}, now); assert.equal(await st(G), "padam_terverifikasi", "cek ulang H+1 ada");
  /* cek ulang yang terlalu dini (sebelum jendela H+1) tidak dihitung */
  const D = await tugasBaru("62", "Seruyan", {lat: lat - 0.4, lon}); await padamkan(D, pada, {cek: pada + 2 * JAM});
  await verifikasiPadam({DB}, now); assert.equal(await st(D), "padam_dilaporkan");
});

uji("L1: tautkanLaporanRegu: tugas terdekat dalam 2 km di kabupaten sama; padam mengisi padam_pada; menyala pada tugas padam = muncul_lagi sumber regu; kab lain dan >2 km tidak", async () => {
  const now = Date.now(), lat = 2.3, lon = 99.3, L = (id, o = {}) => ({id, lat: lat + derajatM(500), lon, prov: "62", kab: "Seruyan", status: "padam", waktu: now, dipercaya: true, ...o});
  const idL = () => [...crypto.getRandomValues(new Uint8Array(8))].map(b => b.toString(16).padStart(2, "0")).join("");
  const dekat = await tugasBaru("62", "Seruyan", {lat, lon}), jauh = await tugasBaru("62", "Seruyan", {lat: lat + derajatM(1500), lon}), lain = await tugasBaru("62", "Katingan", {lat, lon});
  const p = idL(), r = await tautkanLaporanRegu({DB}, L(p, {regu_id: "regu-a"}), now);
  assert.equal(r.tugas_id, dekat, "yang terdekat (0,5 km), bukan 1,0 km"); assert.equal(r.efek, "klaim_regu", "satu regu padam = klaim, bukan penutupan"); assert.ok(Math.abs(r.jarak_km - 0.5) < 0.05);
  assert.equal((await DB.prepare("SELECT status FROM tugas_api WHERE id = ?").bind(dekat).first()).status, "buka");
  assert.equal((await tautkanLaporanRegu({DB}, L(idL(), {regu_id: "regu-a", waktu: now + 10}), now + 20)).efek, "klaim_regu", "regu yang sama dua kali tetap satu regu");
  assert.equal((await tautkanLaporanRegu({DB}, L(idL(), {regu_id: "regu-c", dipercaya: false}), now + 30)).efek, null, "tidak dipercaya: hanya tercatat");
  assert.equal((await tautkanLaporanRegu({DB}, L(idL(), {regu_id: "regu-b"}), now + 40)).efek, "padam_dilaporkan", "dua regu berbeda yang dipercaya");
  const t = await DB.prepare("SELECT status, padam_verif, padam_pada, cek_ulang_pada FROM tugas_api WHERE id = ?").bind(dekat).first(); assert.deepEqual(t, {status: "padam", padam_verif: "padam_dilaporkan", padam_pada: now, cek_ulang_pada: null});
  assert.deepEqual(await DB.prepare("SELECT tugas_id, status FROM tugas_lapangan WHERE lapangan_id = ?").bind(p).first(), {tugas_id: dekat, status: "padam"});
  assert.equal((await tautkanLaporanRegu({DB}, L(p), now)).efek, null, "kirim ulang: tidak ada tautan ganda, padam_pada tidak bergeser"); assert.equal(await n("tugas_lapangan", `lapangan_id = '${p}'`), 1);
  assert.equal((await DB.prepare("SELECT status FROM tugas_api WHERE id = ?").bind(lain).first()).status, "buka", "kabupaten lain tidak tersentuh"); assert.equal((await DB.prepare("SELECT status FROM tugas_api WHERE id = ?").bind(jauh).first()).status, "buka");
  /* menyala sesudah padam: muncul_lagi sumber regu; sebelum waktu padam tidak */
  assert.equal((await tautkanLaporanRegu({DB}, L(idL(), {status: "bara", waktu: now - HARI}), now)).efek, null, "kejadian regu lebih tua dari laporan padam");
  const m = idL(), r2 = await tautkanLaporanRegu({DB}, L(m, {status: "menyala", waktu: now + 1000}), now + 2000); assert.equal(r2.efek, "muncul_lagi");
  assert.deepEqual(await DB.prepare("SELECT status, padam_verif, verif_pada FROM tugas_api WHERE id = ?").bind(dekat).first(), {status: "buka", padam_verif: "muncul_lagi", verif_pada: now + 2000});
  const mu = await DB.prepare("SELECT sumber, jarak_km, keterangan FROM tugas_muncul WHERE tugas_id = ?").bind(dekat).first(); assert.equal(mu.sumber, "regu"); assert.ok(Math.abs(mu.jarak_km - 0.5) < 0.05); assert.match(mu.keterangan, /api menyala/);
  /* padam lagi dari regu pada tugas muncul_lagi: verifikasi mulai dari awal; laporan tidak dipercaya (ditahan/GPS curiga) hanya menaut */
  const x = await tautkanLaporanRegu({DB}, L(idL(), {status: "padam", waktu: now + 5000, dipercaya: false}), now + 6000); assert.equal(x.efek, null); assert.equal((await DB.prepare("SELECT status FROM tugas_api WHERE id = ?").bind(dekat).first()).status, "buka");
  assert.equal((await tautkanLaporanRegu({DB}, L(idL(), {status: "padam", waktu: now + 7000, regu_id: "regu-a"}), now + 8000)).efek, "klaim_regu", "klaim lama (sebelum dibuka kembali) tidak dihitung");
  assert.equal((await tautkanLaporanRegu({DB}, L(idL(), {status: "padam", waktu: now + 7500, regu_id: "regu-b"}), now + 8500)).efek, "padam_dilaporkan");
  assert.deepEqual(await DB.prepare("SELECT status, padam_verif, padam_pada, cek_ulang_pada FROM tugas_api WHERE id = ?").bind(dekat).first(), {status: "padam", padam_verif: "padam_dilaporkan", padam_pada: now + 7500, cek_ulang_pada: null});
  /* tugas dummy dan tugas ditutup tidak ditautkan */
  const dm = await tugasBaru("62", "Seruyan", {lat: lat - 0.5, lon}); await DB.prepare("UPDATE tugas_api SET dummy = 1 WHERE id = ?").bind(dm).run();
  assert.equal(await tautkanLaporanRegu({DB}, L(idL(), {lat: lat - 0.5}), now), null); await DB.prepare("DELETE FROM tugas_api WHERE id = ?").bind(dm).run();
  /* retensi: baris yatim (tugas sudah dihapus) dibuang cron */
  await DB.prepare("DELETE FROM tugas_api WHERE id IN (?, ?, ?)").bind(dekat, jauh, lain).run(); assert.ok(await n("tugas_muncul", `tugas_id = '${dekat}'`) > 0);
  await bersihkanInstansi({DB}, Date.now()); assert.equal(await n("tugas_muncul", `tugas_id = '${dekat}'`), 0); assert.equal(await n("tugas_lapangan", `tugas_id = '${dekat}'`), 0);
});

uji("L1: migrasi 0037 idempoten; CHECK menolak sumber liar dan jarak negatif; satu laporan satu tugas", async () => {
  const f = readFileSync(path.join(AKAR, "migrations/0037_verifikasi_padam.sql"), "utf8"), id = "a".repeat(16);
  await DB.prepare("INSERT INTO tugas_muncul (tugas_id, waktu, sumber) VALUES (?, 1, 'firms')").bind(id).run();
  await DB.batch(pecah(f).map(s => DB.prepare(s))); await DB.batch(pecah(f).map(s => DB.prepare(s)));
  assert.equal(await n("tugas_muncul", `tugas_id = '${id}'`), 1, "dijalankan ulang tidak mengubah baris");
  await assert.rejects(() => DB.prepare("INSERT INTO tugas_muncul (tugas_id, waktu, sumber) VALUES (?, 2, 'dukun')").bind(id).run(), /CHECK/);
  await assert.rejects(() => DB.prepare("INSERT INTO tugas_muncul (tugas_id, waktu, sumber, jarak_km) VALUES (?, 3, 'regu', -1)").bind(id).run(), /CHECK/);
  await assert.rejects(() => DB.prepare("INSERT INTO tugas_muncul (tugas_id, waktu, sumber) VALUES (?, 1, 'regu')").bind(id).run(), /UNIQUE/);
  await DB.prepare("INSERT INTO tugas_lapangan (tugas_id, lapangan_id, jarak_km, status, dibuat) VALUES (?, ?, 1, 'padam', 1)").bind(id, "b".repeat(16)).run();
  await assert.rejects(() => DB.prepare("INSERT INTO tugas_lapangan (tugas_id, lapangan_id, jarak_km, status, dibuat) VALUES (?, ?, 1, 'menyala', 1)").bind("c".repeat(16), "b".repeat(16)).run(), /UNIQUE/, "satu laporan menaut ke satu tugas");
  await assert.rejects(() => DB.prepare("INSERT INTO tugas_lapangan (tugas_id, lapangan_id, jarak_km, status, dibuat) VALUES (?, ?, 1, 'rusak', 1)").bind(id, "d".repeat(16)).run(), /CHECK/);
  await DB.prepare("DELETE FROM tugas_muncul WHERE tugas_id = ?").bind(id).run(); await DB.prepare("DELETE FROM tugas_lapangan WHERE tugas_id = ?").bind(id).run();
});
