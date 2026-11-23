/* Akun BPBD dengan profil PIC (paket data/kajian-bnpb/profil-bpbd/, RENCANA-UJI UP-*): Worker + D1 + R2 sungguhan lewat Miniflare, migrasi apa adanya, tanpa tiruan klien DB.
   Jalankan: node --test tests/warga/profil.test.mjs */
import {test, before, after} from "node:test";
import assert from "node:assert/strict";
import {readFileSync, existsSync} from "node:fs";
import path from "node:path";
import {Miniflare} from "miniflare";
import {AKAR, migrasi, pecah, JPEG_SAH} from "./_bantu.mjs";
import {PROFIL_KUNCI, sha256, hmacPin, profilAktif} from "./_profil.mjs";
import "../../src/worker.js";
import {susunDefs} from "../../src/instansi.js";
import {pinSah, pinSementara} from "../../src/profil.js";

const ADMIN = {"x-admin-token": "rahasia-admin"}, MOD = {"x-admin-token": "moderator-dua"};
const MENIT = 60e3, JAM = 36e5, BASE = "http://instansi.lokal";
const aset = async req => {
  const p = decodeURIComponent(new URL(req.url).pathname), f = path.join(AKAR, "public", p);
  return existsSync(f) && f.startsWith(path.join(AKAR, "public")) && !p.endsWith("/") ? new Response(readFileSync(f)) : new Response("tidak ada", {status: 404});
};
const opsi = (nama, tambah = {}) => ({modules: true, scriptPath: path.join(AKAR, "src/worker.js"), modulesRoot: AKAR, modulesRules: [{type: "ESModule", include: ["**/*.js"]}],
  compatibilityDate: "2024-09-23", d1Databases: {DB: nama}, r2Buckets: {MEDIA: nama}, cf: {country: "ID", colo: "CGK"},
  bindings: {IP_SALT: "garam-uji", ADMIN_TOKEN: "rahasia-admin, moderator-dua", SESI_KUNCI: "kunci-sesi-uji", SUPER_ADMIN: sha256("rahasia-admin").slice(0, 12), PROFIL_KUNCI, ...tambah},
  serviceBindings: {ASSETS: aset}, outboundService: async () => new Response("diblok di uji", {status: 599}), cache: false});
let mf, DB, R2, mfTanpa, DBTanpa, rusak = null;
before(async () => {
  mf = new Miniflare(opsi("uji-profil")); DB = await mf.getD1Database("DB"); R2 = await mf.getR2Bucket("MEDIA");
  await DB.batch(pecah(migrasi()).map(s => DB.prepare(s)));
});
after(async () => { await mf?.dispose(); await mfTanpa?.dispose(); });
const uji = (nama, fn) => test(nama, async () => {
  if (rusak) throw new Error(`tidak dijalankan: "${rusak}" gagal lebih dulu`);
  try { await fn(); } catch (e) { rusak = nama; throw e; }
});
let ipN = 0;
const ipBaru = () => ({"cf-connecting-ip": `198.51.100.${(++ipN % 240) + 1}`});
const api = async (metode, j, body, h = {}, m = mf) => {
  const isi = body === undefined ? undefined : typeof body === "string" || body instanceof Uint8Array ? body : JSON.stringify(body);
  const pb = metode === "POST" && j.startsWith("/api/instansi/") && !j.includes("/admin/") ? {"x-pb": "1"} : {};
  const sesi = metode === "POST" && /sesi_(instansi|profil|staf)=/.test(h.cookie || "") ? {origin: BASE} : {};
  const pjg = isi !== undefined && metode === "POST" ? {"content-length": String(typeof isi === "string" ? new TextEncoder().encode(isi).length : isi.length)} : {};
  const json = isi !== undefined && typeof body === "object" && !(body instanceof Uint8Array) ? {"content-type": "application/json"} : {};
  const r = await m.dispatchFetch(BASE + j, {method: metode, headers: {...pb, ...pjg, ...sesi, ...json, ...h}, body: isi});
  const buf = new Uint8Array(await r.arrayBuffer()), t = new TextDecoder().decode(buf); let x = null; try { x = JSON.parse(t); } catch {}
  return {s: r.status, j: x, t, b: buf, h: r.headers, sc: r.headers.getSetCookie?.() ?? []};
};
const kukiDari = r => Object.fromEntries(r.sc.map(c => c.split(";")[0].split("=")));
const n = async (tabel, w = "1") => (await DB.prepare(`SELECT count(*) n FROM ${tabel} WHERE ${w}`).first()).n;

/* ---- akun lewat sisipan D1 langsung (jalur massal diuji sendiri di UP-1); sandi dikenal ---- */
const SANDI = "SandiUji23456789";
let ak = 0;
const buatAkun = async (jenis = "pemprov", {status = "belum_klaim", surat = 0, kartu = 0, wajibGanti = 0, prov = "13", kab = null, tingkat = jenis === "pemkab" || jenis === "pemkot" ? "kab" : "prov"} = {}) => {
  const id = (++ak).toString(16).padStart(16, "a"), username = `${jenis}uji${ak}x`, garam = "g".repeat(32), wilayah = `Wilayah Uji ${ak}`;
  await DB.prepare(`INSERT INTO instansi_akun (id, username, jenis, tingkat, wilayah, kunci_wilayah, cakupan, prov, kab, garam, sandi_sha, status, surat, kartu, wajib_ganti, dibuat)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(id, username, jenis, tingkat, wilayah, `k${ak}`, JSON.stringify([prov]), tingkat === "kab" ? prov : null, tingkat === "kab" ? (kab ?? `Kabupaten ${ak}`) : null,
    garam, sha256(garam + SANDI), status, surat, kartu, wajibGanti, Date.now()).run();
  return {id, username};
};
const masukAkun = async a => { const r = await api("POST", "/api/instansi/masuk", {username: a.username, sandi: SANDI}, ipBaru()); assert.equal(r.s, 200, r.t); return {...kukiDari(r), r, cookie: `sesi_instansi=${kukiDari(r).sesi_instansi}`}; };
const NIP = i => `19800101200501${1000 + i}`, ISI = (i, o = {}) => ({nama: `Petugas ${i}`, jabatan: "Staf Pusdalops", nip: NIP(i), email: `petugas${i}@bpbd.go.id`, wa: `08123400${String(1000 + i)}`, setuju: true, ...o});
const buatProfil = async (c, i, o = {}) => api("POST", "/api/instansi/profil", ISI(i, o), c);
const foto = async (c, id, b = JPEG_SAH, h = {}) => api("POST", `/api/instansi/profil/foto/${id}`, b, {...c, ...h});
const pinPertama = (c, id, pin) => api("POST", `/api/instansi/profil/pin/${id}`, {pin}, {...c, ...ipBaru()});
/* satu akun belum_klaim dengan tiga profil lengkap (foto + PIN), surat dan kartu ada: siap dikirim */
const siapKirim = async (jenis = "pemprov", opsiAkun = {}) => {
  const a = await buatAkun(jenis, {surat: 1, kartu: 1, ...opsiAkun}), m = await masukAkun(a), pins = ["482915", "739104", "261850"], ps = [];
  for (let i = 1; i <= 3; i++) {
    const r = await buatProfil(m, i + ak * 10); assert.equal(r.s, 201, r.t);
    assert.equal((await foto(m, r.j.id)).s, 200); assert.equal((await pinPertama(m, r.j.id, pins[i - 1])).s, 200);
    ps.push({id: r.j.id, pin: pins[i - 1]});
  }
  return {a, m, ps};
};
const setujuiAkun = async a => { const d = (await DB.prepare("SELECT dikirim FROM instansi_akun WHERE id = ?").bind(a.id).first()).dikirim;
  return api("POST", `/api/instansi/admin/akun/${a.id}`, {aksi: "setuju", dikirim: d}, ADMIN); };
const aktifSiap = async (jenis = "pemprov", opsiAkun = {}) => { const s = await siapKirim(jenis, opsiAkun); assert.equal((await api("POST", "/api/instansi/kirim", {}, s.m)).s, 201); assert.equal((await setujuiAkun(s.a)).s, 200); return s; };
const masukPin = (m, id, pin, h = {}) => api("POST", `/api/instansi/profil/pin/${id}`, {pin}, {...m, ...h});

uji("UP-26 migrasi dijalankan dua kali tanpa galat; tabel profil belum ada: rute profil 503, masuk dan rute kerja non-pemda tetap jalan", async () => {
  await DB.batch(pecah(migrasi()).filter(s => /instansi_profil|instansi_sesi_profil/.test(s)).map(s => DB.prepare(s)));   // kedua kali: IF NOT EXISTS
  const sql = pecah(migrasi()).filter(s => !/instansi_profil|instansi_sesi_profil/.test(s));
  mfTanpa = new Miniflare(opsi("uji-profil-tanpa")); DBTanpa = await mfTanpa.getD1Database("DB");
  await DBTanpa.batch(sql.map(s => DBTanpa.prepare(s)));
  const garam = "g".repeat(32), sisip = (id, u, jenis, tingkat) => DBTanpa.prepare(`INSERT INTO instansi_akun (id, username, jenis, tingkat, wilayah, kunci_wilayah, cakupan, prov, garam, sandi_sha, status, wajib_ganti, dibuat, nama, nip, jabatan, unit, email, wa, surat, kartu, dikirim, diputus)
    VALUES (?, ?, ?, ?, 'Wilayah', ?, '["13"]', NULL, ?, ?, 'aktif', 0, 1, 'Budi Santoso', '198001012005011001', 'Kepala', 'Unit', 'b@x.go.id', '6281234567890', 1, 1, 1, 1)`).bind(id, u, jenis, tingkat, "k" + u, garam, sha256(garam + SANDI)).run();
  await sisip("a".repeat(16), "polda13tanpa", "polda", "prov"); await sisip("b".repeat(16), "pemprov13tnp", "pemprov", "prov");
  const lama = await api("POST", "/api/instansi/masuk", {username: "polda13tanpa", sandi: SANDI}, ipBaru(), mfTanpa); assert.equal(lama.s, 200, lama.t);
  const pm = await api("POST", "/api/instansi/masuk", {username: "pemprov13tnp", sandi: SANDI}, ipBaru(), mfTanpa); assert.equal(pm.s, 200, "masuk tetap jalan walau tabel profil belum ada");
  const c = {cookie: `sesi_instansi=${kukiDari(pm).sesi_instansi}`};
  assert.equal((await api("GET", "/api/instansi/profil", undefined, c, mfTanpa)).s, 503);
  assert.equal((await api("GET", "/api/instansi/tugas", undefined, {cookie: `sesi_instansi=${kukiDari(lama).sesi_instansi}`}, mfTanpa)).s, 200, "akun non-pemda tidak terpengaruh");
  assert.equal((await api("GET", "/api/instansi/saya", undefined, c, mfTanpa)).s, 200);
});

uji("UP-1 buat massal: hanya pemprov, pemkab, pemkot; jumlah = 38 + pasangan kab/kota unik; dua kali jalan tanpa baris ganda", async () => {
  const hasil = [], semua = susunDefs(JSON.parse(readFileSync(path.join(AKAR, "public/banjir/data/pusat_kec.json"), "utf8")));
  const harap = semua.filter(d => ["pemprov", "pemkab", "pemkot"].includes(d.jenis)).length;
  assert.ok(harap > 500 && semua.length > harap, "daftar penuh memuat jenis lain, jadi saringan nyata");
  for (const putaran of [1, 2]) {
    let mulai = 0, dibuat = 0;
    for (let guard = 0; guard < 20; guard++) {
      const r = await api("POST", "/api/instansi/admin/buat", {mulai, batas: 200}, ADMIN); assert.equal(r.s, 200, r.t);
      dibuat += r.j.dibuat.length; assert.equal(r.j.total, harap); hasil.push(...r.j.dibuat);
      if (r.j.berikut == null) break; mulai = r.j.berikut;
    }
    assert.equal(dibuat, putaran === 1 ? harap : 0, `putaran ${putaran}`);
  }
  assert.ok(hasil.every(x => ["pemprov", "pemkab", "pemkot"].includes(x.jenis)));
  assert.equal(await n("instansi_akun", "jenis IN ('polda', 'polres', 'kodam', 'kodim') "), 0);   // uji ini berjalan pertama: hanya akun hasil buat massal yang ada
  assert.equal(await n("instansi_akun"), harap);
  const prov = new Set((await DB.prepare("SELECT kunci_wilayah k FROM instansi_akun WHERE jenis = 'pemprov'").all()).results.map(x => x.k));
  assert.equal(prov.size, 38);
});

uji("UP-2 masuk akun pemda membawa profil_mode dan menulis log masuk tanpa profil; akun polda tanpa profil_mode", async () => {
  const a = await buatAkun("pemprov"), m = await masukAkun(a);
  assert.equal(m.r.j.profil_mode, true);
  const log = await DB.prepare("SELECT profil_id, jenis, ip FROM instansi_profil_log WHERE akun_id = ?").bind(a.id).first();
  assert.deepEqual([log.profil_id, log.jenis, log.ip.length], [null, "masuk", 12]);
  const p = await buatAkun("polda"), mp = await masukAkun(p); assert.equal(mp.r.j.profil_mode, false);
  assert.equal((await api("GET", "/api/instansi/profil", undefined, {cookie: mp.cookie})).j.profil_mode, false);
});

uji("UP-4, UP-11 profil: milik akun sendiri, tanpa NIP, email, HP; profil kelima ditolak lewat rute dan trigger; dicabut tidak dihitung; trigger jenis", async () => {
  const a = await buatAkun("pemkab"), b = await buatAkun("pemkab"), ma = await masukAkun(a), mb = await masukAkun(b);
  const ids = [];
  for (let i = 1; i <= 4; i++) { const r = await buatProfil(ma, 100 + i); assert.equal(r.s, 201, r.t); ids.push(r.j.id); }
  const l5 = await buatProfil(ma, 105); assert.equal(l5.s, 409); assert.match(l5.j.galat, /paling banyak 4/);
  await assert.rejects(DB.prepare("INSERT INTO instansi_profil (id, akun_id, nama, jabatan, nip, email, wa, dibuat, diubah) VALUES ('f'||'0000000000000001', ?, 'Nama', 'Jabatan', '12345678', 'z@bpbd.go.id', '6281234567890', 1, 1)").bind(a.id).run(), /paling banyak 4/);
  const daftar = await api("GET", "/api/instansi/profil", undefined, ma);
  assert.equal(daftar.s, 200); assert.equal(daftar.j.profil.length, 4);
  for (const p of daftar.j.profil) { assert.ok(!("nip" in p) && !("email" in p) && !("wa" in p), "tanpa data pribadi di kisi"); assert.equal(p.status, "draf"); }
  assert.ok(!/pin_sha|pin_garam/.test(daftar.t));
  assert.equal((await api("GET", "/api/instansi/profil", undefined, mb)).j.profil.length, 0, "akun lain tidak melihatnya");
  for (const [m, j, body] of [[mb, `/api/instansi/profil/${ids[0]}`, ISI(1)], [mb, `/api/instansi/profil/pin/${ids[0]}`, {pin: "482915"}], [mb, `/api/instansi/profil/foto/${ids[0]}`, JPEG_SAH]]) {
    const r = await api("POST", j, body, m); assert.equal(r.s, 403, j); assert.match(r.j.galat, /tidak ada atau bukan milik akun ini/);
  }
  assert.equal((await api("POST", `/api/instansi/profil/pin/${"e".repeat(16)}`, {pin: "482915"}, mb)).t, (await api("POST", `/api/instansi/profil/pin/${ids[0]}`, {pin: "482915"}, mb)).t, "tidak ada dan milik lain dijawab sama");
  await DB.prepare("UPDATE instansi_profil SET status = 'dicabut' WHERE id = ?").bind(ids[0]).run();
  assert.equal((await buatProfil(ma, 106)).s, 201, "profil dicabut tidak dihitung");
  const pol = await buatAkun("polda"); await assert.rejects(DB.prepare("INSERT INTO instansi_profil (id, akun_id, nama, jabatan, nip, email, wa, dibuat, diubah) VALUES ('d0000000000000001', ?, 'Nama', 'Jabatan', '12345678', 'z@bpbd.go.id', '6281234567890', 1, 1)").bind(pol.id).run(), /hanya untuk akun pemda/);
  assert.equal((await buatProfil(await masukAkun(pol), 1)).s, 403, "rute: akun polda 403");
  const tanpaSetuju = await api("POST", "/api/instansi/profil", ISI(7, {setuju: false}), mb); assert.equal(tanpaSetuju.s, 400);
});

uji("UP-14, UP-29 PIN pertama sekali saja; PIN mudah ditebak ditolak; NIP dan email ganda per akun", async () => {
  const a = await buatAkun("pemprov"), m = await masukAkun(a), r = await buatProfil(m, 201), id = r.j.id;
  for (const lemah of ["123456", "000000", "654321", "111111", "12345", "abcdef", "1234567"]) {
    const x = await pinPertama(m, id, lemah); assert.ok([400].includes(x.s), `${lemah} -> ${x.s}`);
  }
  const wa = (await DB.prepare("SELECT wa FROM instansi_profil WHERE id = ?").bind(id).first()).wa;
  assert.equal((await pinPertama(m, id, wa.slice(-6))).s, 400, "enam angka terakhir HP");
  assert.equal((await pinPertama(m, id, "482915")).s, 200);
  const dua = await pinPertama(m, id, "739104"); assert.equal(dua.s, 403, "profil yang sudah ber-PIN tidak aktif: bukan jalur atur PIN"); // draf ber-PIN: jalur periksa menolak sebab profil belum aktif
  const p = await DB.prepare("SELECT pin_sha, pin_garam FROM instansi_profil WHERE id = ?").bind(id).first();
  assert.equal(p.pin_sha, hmacPin(PROFIL_KUNCI, id, p.pin_garam, "482915"), "PIN lama tetap berlaku");
  assert.ok(!p.pin_sha.includes("482915"));
  const r2 = await buatProfil(m, 202); const p2 = await pinPertama(m, r2.j.id, "482915"); assert.equal(p2.s, 200);
  const s2 = await DB.prepare("SELECT pin_sha FROM instansi_profil WHERE id = ?").bind(r2.j.id).first(); assert.notEqual(s2.pin_sha, p.pin_sha, "PIN sama, hash beda (profil dan garam)");
  const ganda = await buatProfil(m, 201); assert.equal(ganda.s, 409);
  assert.equal((await buatProfil(m, 203, {email: "petugas201@bpbd.go.id"})).s, 409, "email ganda");
  const lain = await buatAkun("pemprov"); assert.equal((await buatProfil(await masukAkun(lain), 201)).s, 201, "akun lain boleh memakai NIP yang sama");
  await DB.prepare("UPDATE instansi_profil SET status = 'dicabut' WHERE id = ?").bind(id).run();
  assert.equal((await buatProfil(m, 201)).s, 201, "NIP profil dicabut boleh dipakai lagi");
  assert.equal(pinSah("482915"), true); assert.equal(pinSah("012345"), false); assert.equal(pinSah("987654"), false);
  for (let i = 0; i < 200; i++) assert.ok(pinSah(pinSementara("6281234567890"), "6281234567890"));
});

uji("UP-12 foto: PNG dan PDF ditolak, EXIF dibuang, lebih dari 2 MB ditolak, laju 20 per jam, akun lain tidak mengambil, disajikan tersandbox", async () => {
  const a = await buatAkun("pemprov"), m = await masukAkun(a), b = await masukAkun(await buatAkun("pemprov")), id = (await buatProfil(m, 301)).j.id;
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, ...Array(100).fill(0)]);
  assert.equal((await foto(m, id, png)).s, 400); assert.equal((await foto(m, id, new TextEncoder().encode("%PDF-1.4\n1 0 obj<<>>endobj\n%%EOF"))).s, 400);
  const exif = new TextEncoder().encode("Exif\0\0EXIFRAHASIA-LOKASI"), app1 = new Uint8Array([0xff, 0xe1, (exif.length + 2) >> 8, (exif.length + 2) & 255, ...exif]);
  const denganExif = new Uint8Array([0xff, 0xd8, ...app1, ...JPEG_SAH.slice(2)]);
  const ok = await foto(m, id, denganExif); assert.equal(ok.s, 200, ok.t);
  const o = await R2.get(`instansi/profil/${a.id}/${id}`), simpan = new Uint8Array(await o.arrayBuffer());
  assert.ok(!new TextDecoder("latin1").decode(simpan).includes("EXIFRAHASIA"), "EXIF dibuang"); assert.equal(o.httpMetadata.contentType, "image/jpeg");
  assert.equal((await foto(m, id, new Uint8Array(2 * 1048576 + 10).fill(1))).s, 413);
  const l = await api("GET", `/api/instansi/profil/foto/${id}`, undefined, m);
  assert.equal(l.s, 200); assert.match(l.h.get("content-security-policy"), /sandbox/); assert.match(l.h.get("cache-control"), /no-store/);
  assert.equal((await api("GET", `/api/instansi/profil/foto/${id}`, undefined, b)).s, 403);
  assert.equal((await foto(b, id)).s, 403);
  const ids = []; for (let i = 0; i < 2; i++) ids.push((await buatProfil(m, 310 + i)).j.id);
  let tolak = 0; for (let i = 0; i < 22; i++) if ((await foto(m, ids[i % 2])).s === 429) tolak++;
  assert.ok(tolak >= 1, "laju unggah jalan");
});

uji("UP-13, UP-15 kirim: syarat ditolak 409 dengan alasan; kirim sukses menyalin PIC pertama; setuju mengaktifkan; tolak mengembalikan ke draf", async () => {
  const a = await buatAkun("pemkot", {surat: 1, kartu: 1}), m = await masukAkun(a);
  let r = await api("POST", "/api/instansi/kirim", {}, m); assert.equal(r.s, 409); assert.match(r.j.galat, /Baru ada 0/);
  const p1 = (await buatProfil(m, 401)).j.id, p2 = (await buatProfil(m, 402)).j.id, p3 = (await buatProfil(m, 403)).j.id;
  for (const id of [p1, p2]) { await foto(m, id); await pinPertama(m, id, "482915"); }
  r = await api("POST", "/api/instansi/kirim", {}, m); assert.equal(r.s, 409); assert.match(r.j.galat, /Baru ada 2/); assert.match(r.j.galat, /belum punya foto dan PIN/);
  await foto(m, p3); r = await api("POST", "/api/instansi/kirim", {}, m); assert.equal(r.s, 409, "tanpa PIN");
  await pinPertama(m, p3, "739104");
  await DB.prepare("UPDATE instansi_akun SET surat = 0 WHERE id = ?").bind(a.id).run();
  assert.equal((await api("POST", "/api/instansi/kirim", {}, m)).s, 409, "surat belum ada");
  await DB.prepare("UPDATE instansi_akun SET surat = 1 WHERE id = ?").bind(a.id).run();
  assert.equal((await DB.prepare("SELECT status FROM instansi_akun WHERE id = ?").bind(a.id).first()).status, "belum_klaim");
  r = await api("POST", "/api/instansi/kirim", {}, m); assert.equal(r.s, 201, r.t);
  const ak1 = await DB.prepare("SELECT status, nama, nip, jabatan, unit, email, wa, wilayah, dikirim FROM instansi_akun WHERE id = ?").bind(a.id).first();
  assert.equal(ak1.status, "menunggu"); assert.ok(ak1.dikirim);
  const pic = await DB.prepare("SELECT nama, nip, jabatan, email, wa FROM instansi_profil WHERE id = ?").bind(p1).first();
  assert.deepEqual([ak1.nama, ak1.nip, ak1.jabatan, ak1.email, ak1.wa, ak1.unit], [pic.nama, pic.nip, pic.jabatan, pic.email, pic.wa, ak1.wilayah]);
  assert.equal(await n("instansi_profil", `akun_id = '${a.id}' AND status = 'menunggu'`), 3);
  assert.equal((await masukPin(m, p1, "482915", ipBaru())).s, 403, "sebelum disetujui PIN benar tidak menerbitkan sesi profil");
  assert.equal(await n("instansi_sesi_profil", `akun_id = '${a.id}'`), 0);
  const tolak = await api("POST", `/api/instansi/admin/akun/${a.id}`, {aksi: "tolak", dikirim: ak1.dikirim, alasan: "Foto kartu kurang jelas"}, ADMIN); assert.equal(tolak.s, 200, tolak.t);
  assert.equal((await DB.prepare("SELECT status, alasan FROM instansi_akun WHERE id = ?").bind(a.id).first()).status, "ditolak");
  assert.equal(await n("instansi_profil", `akun_id = '${a.id}' AND status = 'draf'`), 3);
  assert.equal((await api("POST", "/api/instansi/kirim", {}, m)).s, 201, "kirim ulang berhasil");
  const d = (await DB.prepare("SELECT dikirim FROM instansi_akun WHERE id = ?").bind(a.id).first()).dikirim;
  const s = await api("POST", `/api/instansi/admin/akun/${a.id}`, {aksi: "setuju", dikirim: d}, ADMIN); assert.equal(s.s, 200, s.t);
  assert.equal((await DB.prepare("SELECT status FROM instansi_akun WHERE id = ?").bind(a.id).first()).status, "aktif");
  assert.equal(await n("instansi_profil", `akun_id = '${a.id}' AND status = 'aktif'`), 3);
});

uji("setuju akun pemda ditolak 409 bila kurang dari 3 profil lengkap menunggu (pra-periksa)", async () => {
  const a = await buatAkun("pemprov", {surat: 1, kartu: 1, status: "menunggu"}).catch(() => null);
  assert.equal(a, null, "CHECK instansi_akun: status menunggu butuh data lengkap, jadi akun diisi lewat kirim");
  const s = await siapKirim(); await api("POST", "/api/instansi/kirim", {}, s.m);
  await DB.prepare("UPDATE instansi_profil SET status = 'dicabut' WHERE id = ?").bind(s.ps[0].id).run();
  const d = (await DB.prepare("SELECT dikirim FROM instansi_akun WHERE id = ?").bind(s.a.id).first()).dikirim;
  const r = await api("POST", `/api/instansi/admin/akun/${s.a.id}`, {aksi: "setuju", dikirim: d}, ADMIN); assert.equal(r.s, 409); assert.match(r.j.galat, /kurang dari 3 profil lengkap/);
  assert.equal((await DB.prepare("SELECT status FROM instansi_akun WHERE id = ?").bind(s.a.id).first()).status, "menunggu");
});

uji("UP-6, UP-3 PIN benar menerbitkan sesi profil (3 kuki berjalur); rute kerja butuh sesi profil; rute akun tetap terbuka", async () => {
  const s = await aktifSiap(), {a, m, ps} = s;
  const ip = ipBaru(), salah = await masukPin(m, ps[0].id, "000111", ip); assert.equal(salah.s, 401); assert.ok(!/000111/.test(salah.t));
  const ok = await masukPin(m, ps[0].id, ps[0].pin, ipBaru()); assert.equal(ok.s, 200, ok.t);
  assert.ok(!/pin_sha|pin_garam|482915/.test(ok.t));
  const garis = ok.sc.filter(c => c.startsWith("sesi_profil="));
  assert.deepEqual(garis.map(c => c.match(/Path=([^;]+)/)[1]).sort(), ["/api/instansi", "/api/lapor", "/instansi"]);
  for (const c of garis) for (const f of ["HttpOnly", "Secure", "SameSite=Lax", "Max-Age=43200"]) assert.ok(c.includes(f), f);
  const profil = {cookie: `${m.cookie}; sesi_profil=${kukiDari(ok).sesi_profil}`};
  for (const [met, j] of [["GET", "/api/instansi/tugas"], ["GET", "/api/instansi/kontak"], ["POST", "/api/instansi/kontak"], ["POST", "/api/instansi/media"], ["POST", "/api/instansi/konfirmasi/" + "c".repeat(16)], ["GET", "/api/instansi/media/" + "c".repeat(16)]]) {
    const tanpa = await api(met, j, met === "POST" ? {} : undefined, m); assert.equal(tanpa.s, 401, `${met} ${j} tanpa profil: ${tanpa.t}`); assert.equal(tanpa.j?.profil_perlu, true);
  }
  assert.equal((await api("GET", "/api/instansi/tugas", undefined, profil)).s, 200, "dengan sesi profil");
  for (const j of ["/api/instansi/saya", "/api/instansi/profil"]) assert.equal((await api("GET", j, undefined, m)).s, 200, j + " tetap terbuka");
  assert.equal((await api("POST", "/api/instansi/gantisandi", {}, {cookie: m.cookie})).s, 200, "gantisandi terbuka (dan mencabut sesi profil, lihat UP-24)");
  const dari = await DB.prepare("SELECT profil_id, jenis FROM instansi_profil_log WHERE akun_id = ? AND jenis = 'pin_ok'").bind(a.id).first(); assert.equal(dari.profil_id, ps[0].id);
});

uji("UP-5 sesi profil akun lain bersama sesi akun ini ditolak", async () => {
  const s1 = await aktifSiap(), s2 = await aktifSiap();
  const ok = await masukPin(s2.m, s2.ps[0].id, s2.ps[0].pin, ipBaru()), kuki2 = kukiDari(ok).sesi_profil;
  const r = await api("GET", "/api/instansi/tugas", undefined, {cookie: `${s1.m.cookie}; sesi_profil=${kuki2}`}); assert.equal(r.s, 401); assert.equal(r.j.profil_perlu, true);
  assert.equal((await api("GET", "/api/instansi/tugas", undefined, {cookie: `${s1.m.cookie}; sesi_profil=${kuki2}`, "x-akun": s2.a.id})).s, 401);
});

uji("UP-7 lima PIN salah dalam 15 menit dari satu IP mengunci IP itu; IP lain tetap masuk; sesudah 15 menit terbuka", async () => {
  const {m, ps} = await aktifSiap(), ip = {"cf-connecting-ip": "203.0.113.50"};
  for (let i = 0; i < 5; i++) assert.ok([401, 423].includes((await masukPin(m, ps[0].id, "100000".replace("1", String(i + 2)), ip)).s));
  const kunci = await masukPin(m, ps[0].id, ps[0].pin, ip); assert.equal(kunci.s, 423); assert.match(kunci.j.galat, /dikunci sementara.*pukul \d\d\.\d\d/); assert.ok(kunci.j.buka > Date.now());
  assert.equal((await masukPin(m, ps[0].id, ps[0].pin, {"cf-connecting-ip": "203.0.113.51"})).s, 200, "IP lain tidak terkunci");
  await DB.prepare("UPDATE laju_bnpb SET waktu = waktu - ? WHERE kunci LIKE ?").bind(16 * MENIT, `pf:${ps[0].id}:%`).run();
  assert.equal((await masukPin(m, ps[0].id, ps[0].pin, ip)).s, 200, "jendela lewat");
  assert.ok((await n("instansi_profil_log", `profil_id = '${ps[0].id}' AND jenis = 'terkunci'`)) >= 1);
});

uji("UP-8 dua puluh PIN salah serentak: paling banyak 5 lolos ke pembandingan, sisanya 423; PIN benar sesudahnya ditolak", async () => {
  const {m, ps} = await aktifSiap(), ip = {"cf-connecting-ip": "203.0.113.60"};
  const hasil = await Promise.all(Array.from({length: 20}, (_, i) => masukPin(m, ps[0].id, String(200000 + i * 7), ip)));
  const kode = hasil.map(x => x.s); assert.ok(kode.filter(x => x === 401).length <= 5, JSON.stringify(kode)); assert.ok(kode.filter(x => x === 423).length >= 15, JSON.stringify(kode));
  const tulis = await n("instansi_profil_log", `profil_id = '${ps[0].id}' AND jenis IN ('pin_salah', 'terkunci')`); assert.ok(tulis <= 5, `${tulis} baris log`);
  assert.equal((await masukPin(m, ps[0].id, ps[0].pin, ip)).s, 423);
});

uji("UP-9, UP-31 sepuluh salah sehari memasang kunci admin; PIN benar ditolak sampai dibuka; pengunci per IP; profil lain tak terpengaruh; PIN benar ke-10 tidak mengunci", async () => {
  const {m, ps} = await aktifSiap();
  const lepas = () => DB.prepare("UPDATE laju_bnpb SET waktu = waktu - ? WHERE kunci LIKE ?").bind(20 * MENIT, `pf:${ps[0].id}:%`).run();
  for (let i = 0; i < 9; i++) { assert.equal((await masukPin(m, ps[0].id, "100000".replace("1", String(2 + (i % 7))), ipBaru())).s, 401); if (i % 4 === 3) await lepas(); }
  assert.equal((await DB.prepare("SELECT salah_hari, kunci_admin FROM instansi_profil WHERE id = ?").bind(ps[0].id).first()).salah_hari, 9);
  const benar10 = await masukPin(m, ps[0].id, ps[0].pin, ipBaru()); assert.equal(benar10.s, 200, "PIN benar pada percobaan ke-10 tidak mengunci");
  assert.deepEqual(await DB.prepare("SELECT salah_hari, kunci_admin FROM instansi_profil WHERE id = ?").bind(ps[0].id).first(), {salah_hari: 9, kunci_admin: 0});
  assert.equal((await masukPin(m, ps[1].id, ps[1].pin, ipBaru())).s, 200, "profil lain di akun yang sama tak terpengaruh");
  const kunciAdmin = await masukPin(m, ps[0].id, "300000", ipBaru()); assert.equal(kunciAdmin.s, 423); assert.equal(kunciAdmin.j.kunci_admin, true);
  assert.equal((await masukPin(m, ps[0].id, ps[0].pin, ipBaru())).s, 423, "PIN benar ditolak selama kunci admin");
  const buka = await api("POST", `/api/instansi/admin/profil/${ps[0].id}`, {aksi: "buka_kunci"}, ADMIN); assert.equal(buka.s, 200, buka.t);
  assert.equal((await masukPin(m, ps[0].id, ps[0].pin, ipBaru())).s, 200);
  await DB.prepare("UPDATE instansi_profil SET salah_hari = 4, hari_tgl = hari_tgl - 1 WHERE id = ?").bind(ps[1].id).run();
  assert.equal((await masukPin(m, ps[1].id, "300001", ipBaru())).s, 401);
  assert.equal((await DB.prepare("SELECT salah_hari FROM instansi_profil WHERE id = ?").bind(ps[1].id).first()).salah_hari, 1, "hari berikutnya hitungan kembali");
  const PIC = (await api("GET", "/api/instansi/profil", undefined, m)).j.profil.find(p => p.id === ps[2].id); assert.ok(!PIC.terkunci);
});

uji("UP-10 profil dicabut: sandi dan PIN benar ditolak; sesi berjalan gagal berikutnya; profil lain tetap masuk", async () => {
  const {m, ps} = await aktifSiap(), ok = await masukPin(m, ps[0].id, ps[0].pin, ipBaru()), profil = {cookie: `${m.cookie}; sesi_profil=${kukiDari(ok).sesi_profil}`};
  assert.equal((await api("GET", "/api/instansi/tugas", undefined, profil)).s, 200);
  const c = await api("POST", `/api/instansi/admin/profil/${ps[0].id}`, {aksi: "cabut"}, ADMIN); assert.equal(c.s, 200, c.t);
  assert.equal((await api("GET", "/api/instansi/tugas", undefined, profil)).s, 401, "sesi berjalan gagal pada permintaan berikutnya");
  assert.equal((await masukPin(m, ps[0].id, ps[0].pin, ipBaru())).s, 403);
  assert.equal((await masukPin(m, ps[1].id, ps[1].pin, ipBaru())).s, 200);
  assert.equal((await api("POST", `/api/instansi/admin/profil/${ps[0].id}`, {aksi: "cabut"}, ADMIN)).s, 409);
});

uji("UP-16 atur ulang PIN admin: PIN sementara sekali, wajib ganti, hanya rute ganti PIN yang lolos; PIC lain tidak bisa", async () => {
  const {a, m, ps} = await aktifSiap(), tetangga = await masukPin(m, ps[1].id, ps[1].pin, ipBaru());
  const profilLain = {cookie: `${m.cookie}; sesi_profil=${kukiDari(tetangga).sesi_profil}`};
  assert.equal((await api("POST", `/api/instansi/admin/profil/${ps[0].id}`, {aksi: "reset_pin"}, profilLain)).s, 403, "PIC lain tidak bisa");
  const rs = await api("POST", `/api/instansi/admin/profil/${ps[0].id}`, {aksi: "reset_pin"}, MOD); assert.equal(rs.s, 200, rs.t);
  const sem = rs.j.pin_sementara; assert.match(sem, /^\d{6}$/);
  assert.equal((await masukPin(m, ps[0].id, ps[0].pin, ipBaru())).s, 401, "PIN lama gagal");
  const ok = await masukPin(m, ps[0].id, sem, ipBaru()); assert.equal(ok.s, 200, ok.t); assert.equal(ok.j.pin_wajib_ganti, true);
  const kuki = {cookie: `${m.cookie}; sesi_profil=${kukiDari(ok).sesi_profil}`};
  for (const [met, j] of [["GET", "/api/instansi/tugas"], ["GET", "/api/instansi/saya"], ["POST", "/api/instansi/kontak"], ["GET", "/api/instansi/profil/log"], ["POST", "/api/instansi/kirim"]]) {
    const r = await api(met, j, met === "POST" ? {} : undefined, kuki); assert.equal(r.s, 403, `${met} ${j}`); assert.equal(r.j.pin_wajib_ganti, true);
  }
  assert.equal((await api("GET", "/api/instansi/profil", undefined, kuki)).s, 200);
  assert.equal((await api("POST", `/api/instansi/profil/gantipin/${ps[0].id}`, {lama: sem, baru: "123456"}, {...kuki, ...ipBaru()})).s, 400, "PIN baru lemah");
  const g = await api("POST", `/api/instansi/profil/gantipin/${ps[0].id}`, {lama: sem, baru: "908172"}, {...kuki, ...ipBaru()}); assert.equal(g.s, 200, g.t);
  assert.equal((await api("GET", "/api/instansi/tugas", undefined, kuki)).s, 200, "sesudah PIN baru semua rute terbuka");
  const sisa = await DB.prepare("SELECT pin_wajib_ganti FROM instansi_profil WHERE id = ?").bind(ps[0].id).first(); assert.equal(sisa.pin_wajib_ganti, 0);
  assert.ok(!(await DB.prepare("SELECT group_concat(jenis || coalesce(rute, '') || coalesce(objek, ''), ' ') t FROM instansi_profil_log").first()).t.includes(sem), "PIN sementara tidak di log");
  const log = await DB.prepare("SELECT oleh FROM instansi_profil_log WHERE profil_id = ? AND jenis = 'reset_pin'").bind(ps[0].id).first(); assert.ok(log.oleh.length >= 3);
  const gagalLama = await api("POST", `/api/instansi/profil/gantipin/${ps[0].id}`, {lama: "111222", baru: "563412"}, {...kuki, ...ipBaru()}); assert.equal(gagalLama.s, 401);
});

uji("UP-17 CSRF: POST profil tanpa x-pb atau Origin asing ditolak; Origin kosong tanpa sec-fetch-site ditolak saat ada kuki sesi_profil", async () => {
  const {m, ps} = await aktifSiap(), ok = await masukPin(m, ps[0].id, ps[0].pin, ipBaru()), kuki = `${m.cookie}; sesi_profil=${kukiDari(ok).sesi_profil}`;
  const mentah = (h, j = "/api/instansi/profil/keluar") => mf.dispatchFetch(BASE + j, {method: "POST", headers: {cookie: kuki, "content-length": "2", ...h}, body: "{}"});
  assert.equal((await mentah({origin: BASE})).status, 403, "tanpa x-pb");
  assert.equal((await mentah({origin: "https://jahat.example", "x-pb": "1"})).status, 403);
  assert.equal((await mentah({"x-pb": "1"})).status, 403, "Origin kosong");
  assert.equal((await mentah({"x-pb": "1", "sec-fetch-site": "same-origin"})).status, 200);
  const pinTanpaPb = await mf.dispatchFetch(BASE + `/api/instansi/profil/pin/${ps[1].id}`, {method: "POST", headers: {cookie: kuki, origin: BASE, "content-length": "16"}, body: '{"pin":"482915"}'});
  assert.equal(pinTanpaPb.status, 403);
});

uji("UP-18 staf verifikator wilayah lain 403, wilayah sendiri boleh setuju profil keempat, tidak boleh reset_pin atau cabut", async () => {
  const bikin = async (wilayah, i) => {
    const r = await api("POST", "/api/staf/admin/buat", {nama: `Verifikator ${i}`, nip: `19960${i}0012005`, unit: "Pusdalops BNPB", email: `v${i}@bnpb.go.id`, wa: "081234567890", peran: ["verifikator"], wilayah}, ADMIN); assert.equal(r.s, 201, r.t);
    const x = await api("POST", "/api/staf/masuk", {username: r.j.username, sandi: r.j.sandi}, ipBaru()); assert.equal(x.s, 200, x.t);
    const cookie = x.h.get("set-cookie").split(";")[0]; assert.equal((await api("POST", "/api/staf/gantisandi", {}, {cookie, "x-pb": "1"})).s, 200); return {cookie, "x-pb": "1"};
  };
  const sendiri = await bikin(["13"], 1), lain = await bikin(["32"], 2), {a, m, ps} = await aktifSiap("pemprov", {prov: "13"});
  const baru = await buatProfil(m, 901); await foto(m, baru.j.id); await pinPertama(m, baru.j.id, "482915");
  assert.equal((await api("POST", `/api/instansi/profil/ajukan/${baru.j.id}`, {}, m)).s, 201);
  const diLuar = await api("POST", `/api/instansi/admin/profil/${baru.j.id}`, {aksi: "setuju"}, lain); assert.equal(diLuar.s, 404, "akun di luar wilayahnya tidak terlihat: " + diLuar.t);
  for (const aksi of ["reset_pin", "cabut", "buka_kunci"]) assert.equal((await api("POST", `/api/instansi/admin/profil/${ps[0].id}`, {aksi}, sendiri)).s, 403, aksi);
  const aktifSudah = await n("instansi_profil", `akun_id = '${a.id}' AND status = 'aktif'`); assert.equal(aktifSudah, 3);
  const s = await api("POST", `/api/instansi/admin/profil/${baru.j.id}`, {aksi: "setuju"}, sendiri); assert.equal(s.s, 200, s.t);
  assert.equal((await masukPin(m, baru.j.id, "482915", ipBaru())).s, 200, "sesudah setuju bisa masuk (UP-30)");
  const lagi = await buatProfil(m, 902); assert.equal(lagi.s, 409, "sudah 4 profil bukan dicabut");
  assert.equal((await api("GET", `/api/instansi/admin/profil/${a.id}`, undefined, lain)).s, 404);
  const lihat = await api("GET", `/api/instansi/admin/profil/${a.id}`, undefined, sendiri); assert.equal(lihat.s, 200); assert.equal(lihat.j.profil.length, 4); assert.ok(lihat.j.profil[0].nip);
  assert.equal((await api("GET", `/api/instansi/admin/profil/${a.id}`, undefined, {})).s, 403);
});

uji("UP-30 profil keempat tidak bisa dipakai sebelum admin setuju", async () => {
  const {m, ps} = await aktifSiap(); await DB.prepare("UPDATE instansi_profil SET status = 'dicabut' WHERE id = ?").bind(ps[2].id).run();
  const baru = await buatProfil(m, 910); await foto(m, baru.j.id); await pinPertama(m, baru.j.id, "482915");
  assert.equal((await masukPin(m, baru.j.id, "482915", ipBaru())).s, 403, "draf");
  assert.equal((await api("POST", `/api/instansi/profil/ajukan/${baru.j.id}`, {}, m)).s, 201);
  assert.equal((await masukPin(m, baru.j.id, "482915", ipBaru())).s, 403, "menunggu");
  assert.equal((await api("POST", `/api/instansi/admin/profil/${baru.j.id}`, {aksi: "setuju"}, ADMIN)).s, 200);
  assert.equal((await masukPin(m, baru.j.id, "482915", ipBaru())).s, 200);
});

uji("UP-23 PROFIL_KUNCI kosong atau 31 karakter: rute PIN 503 dan tidak ada baris ditulis; pin_sha bergantung pada kunci dan tidak memuat PIN", async () => {
  const {m, ps} = await aktifSiap(), p = await DB.prepare("SELECT pin_sha, pin_garam FROM instansi_profil WHERE id = ?").bind(ps[0].id).first();
  assert.equal(p.pin_sha, hmacPin(PROFIL_KUNCI, ps[0].id, p.pin_garam, ps[0].pin)); assert.notEqual(p.pin_sha, hmacPin("k".repeat(40), ps[0].id, p.pin_garam, ps[0].pin), "mengganti kunci membuat PIN lama tidak cocok");
  assert.ok(!p.pin_sha.includes(ps[0].pin) && !p.pin_garam.includes(ps[0].pin));
  for (const [nama, kunci] of [["kosong", ""], ["31 karakter", "x".repeat(31)]]) {
    const x = new Miniflare(opsi("uji-profil-k-" + nama.length, {PROFIL_KUNCI: kunci})), D2 = await x.getD1Database("DB");
    try {
      await D2.batch(pecah(migrasi()).map(s => D2.prepare(s)));
      const garam = "g".repeat(32); await D2.prepare(`INSERT INTO instansi_akun (id, username, jenis, tingkat, wilayah, kunci_wilayah, cakupan, garam, sandi_sha, status, wajib_ganti, dibuat) VALUES ('${"a".repeat(16)}', 'pemprovkunci1', 'pemprov', 'prov', 'Prov', 'kk', '["13"]', ?, ?, 'belum_klaim', 0, 1)`).bind(garam, sha256(garam + SANDI)).run();
      const msk = await api("POST", "/api/instansi/masuk", {username: "pemprovkunci1", sandi: SANDI}, ipBaru(), x), c = {cookie: `sesi_instansi=${kukiDari(msk).sesi_instansi}`};
      await D2.prepare("INSERT INTO instansi_profil (id, akun_id, nama, jabatan, nip, email, wa, dibuat, diubah) VALUES (?, ?, 'Nama', 'Jabatan', '12345678', 'z@bpbd.go.id', '6281234567890', 1, 1)").bind("b".repeat(16), "a".repeat(16)).run();
      assert.equal((await api("POST", `/api/instansi/profil/pin/${"b".repeat(16)}`, {pin: "482915"}, {...c, ...ipBaru()}, x)).s, 503, nama);
      assert.equal((await api("POST", `/api/instansi/admin/profil/${"b".repeat(16)}`, {aksi: "reset_pin"}, ADMIN, x)).s, 503, nama);
      assert.equal((await D2.prepare("SELECT count(*) n FROM laju_bnpb WHERE aksi LIKE 'profil.%'").first()).n, 0, "tidak ada baris laju ditulis");
      assert.equal((await D2.prepare("SELECT pin_sha FROM instansi_profil").first()).pin_sha, null, "tidak ada PIN ditulis");
    } finally { await x.dispose(); }
  }
});

uji("UP-24 gantisandi, reset, dan cabut akun menghapus semua sesi profil akun itu", async () => {
  for (const cara of ["gantisandi", "reset", "cabut"]) {
    const {a, m, ps} = await aktifSiap(), ok = await masukPin(m, ps[0].id, ps[0].pin, ipBaru()), kuki = {cookie: `${m.cookie}; sesi_profil=${kukiDari(ok).sesi_profil}`};
    assert.equal(await n("instansi_sesi_profil", `akun_id = '${a.id}'`), 1);
    if (cara === "gantisandi") assert.equal((await api("POST", "/api/instansi/gantisandi", {}, kuki)).s, 200);
    else assert.equal((await api("POST", `/api/instansi/admin/akun/${a.id}`, {aksi: cara, alasan: "uji"}, ADMIN)).s, 200);
    assert.equal(await n("instansi_sesi_profil", `akun_id = '${a.id}'`), 0, cara);
    assert.equal((await api("GET", "/api/instansi/tugas", undefined, kuki)).s, 401, cara);
  }
});

uji("UP-25 keluar profil menghapus sesi profil dan kuki di tiga Path; sesi akun tetap; keluar penuh mencabut keduanya", async () => {
  const {a, m, ps} = await aktifSiap(), ok = await masukPin(m, ps[0].id, ps[0].pin, ipBaru()), kuki = {cookie: `${m.cookie}; sesi_profil=${kukiDari(ok).sesi_profil}`};
  const k = await api("POST", "/api/instansi/profil/keluar", {}, kuki); assert.equal(k.s, 200);
  const hapus = k.sc.filter(c => c.startsWith("sesi_profil=;")); assert.deepEqual(hapus.map(c => c.match(/Path=([^;]+)/)[1]).sort(), ["/api/instansi", "/api/lapor", "/instansi"]); assert.ok(hapus.every(c => c.includes("Max-Age=0")));
  assert.equal(await n("instansi_sesi_profil", `akun_id = '${a.id}'`), 0);
  assert.equal((await api("GET", "/api/instansi/saya", undefined, m)).s, 200, "sesi akun tetap");
  assert.equal((await masukPin(m, ps[0].id, "999999", ipBaru())).s, 401, "pilih profil lagi wajib PIN");
  const ok2 = await masukPin(m, ps[0].id, ps[0].pin, ipBaru()), kuki2 = {cookie: `${m.cookie}; sesi_profil=${kukiDari(ok2).sesi_profil}`};
  const penuh = await api("POST", "/api/instansi/keluar", {}, kuki2); assert.equal(penuh.s, 200); assert.ok(penuh.sc.filter(c => c.startsWith("sesi_profil=;")).length === 3);
  assert.equal(await n("instansi_sesi_profil", `akun_id = '${a.id}'`), 0); assert.equal(await n("instansi_sesi", `akun_id = '${a.id}'`), 0);
  assert.equal((await DB.prepare("SELECT count(*) n FROM instansi_profil_log WHERE akun_id = ? AND jenis IN ('ganti_profil', 'keluar')").bind(a.id).first()).n, 2);
});

uji("UP-27 verifikasi lama untuk akun pemda 409; akun polda tidak berubah", async () => {
  const a = await buatAkun("pemprov", {surat: 1, kartu: 1}), m = await masukAkun(a);
  const v = {nama: "Budi Santoso", nip: "198001012005011001", jabatan: "Kepala", unit: "BPBD", email: "b@bpbd.go.id", wa: "081234567890"};
  const r = await api("POST", "/api/instansi/verifikasi", v, m); assert.equal(r.s, 409); assert.match(r.j.galat, /pendaftaran PIC/);
  const p = await buatAkun("polda", {surat: 1, kartu: 1}), mp = await masukAkun(p);
  assert.equal((await api("POST", "/api/instansi/verifikasi", v, mp)).s, 201);
});

uji("wajib ganti sandi: rute profil menolak akun yang masih memakai sandi awal", async () => {
  const a = await buatAkun("pemprov", {wajibGanti: 1}), m = await masukAkun(a);
  const r = await buatProfil(m, 950); assert.equal(r.s, 403); assert.equal(r.j.wajib_ganti, true);
});

uji("pembersihan jam-an menghapus sesi profil kedaluwarsa dan foto profil dicabut lebih dari 30 hari, sisanya utuh (UP-28)", async () => {
  const {a, m, ps} = await aktifSiap(), {bersihkanInstansi} = await import("../../src/instansi.js");
  const lama = Date.now() - 40 * 864e5;
  await R2.put(`instansi/profil/${a.id}/${ps[0].id}`, JPEG_SAH); await R2.put(`instansi/profil/${a.id}/${ps[1].id}`, JPEG_SAH);
  await DB.prepare("UPDATE instansi_profil SET status = 'dicabut', diubah = ? WHERE id = ?").bind(lama, ps[0].id).run();
  await DB.prepare("UPDATE instansi_profil SET status = 'dicabut', diubah = ? WHERE id = ?").bind(Date.now() - 5 * 864e5, ps[1].id).run();
  await DB.prepare("INSERT INTO instansi_sesi_profil (sesi_sha, profil_id, akun_id, dibuat, kedaluwarsa) VALUES (?, ?, ?, 1, 2)").bind("a".repeat(64), ps[2].id, a.id).run();
  const hasil = await bersihkanInstansi({DB, MEDIA: R2, ASSETS: {fetch: aset}}, Date.now());
  assert.equal(await n("instansi_sesi_profil", "sesi_sha = '" + "a".repeat(64) + "'"), 0);
  assert.equal(await R2.get(`instansi/profil/${a.id}/${ps[0].id}`), null, "foto cabut 40 hari dibuang");
  assert.ok(await R2.get(`instansi/profil/${a.id}/${ps[1].id}`), "foto cabut 5 hari tetap");
  assert.equal((await DB.prepare("SELECT foto FROM instansi_profil WHERE id = ?").bind(ps[0].id).first()).foto, 0);
  assert.ok(hasil.profil);
});

uji("M1 trigger: profil dicabut tidak bisa dihidupkan lagi lewat UPDATE bila akun sudah punya 4 profil bukan dicabut; S5 PIN berulang dan palindrom ditolak", async () => {
  const a = await buatAkun("pemkab"), m = await masukAkun(a), ids = [];
  for (let i = 1; i <= 4; i++) ids.push((await buatProfil(m, 700 + i)).j.id);
  await DB.prepare("UPDATE instansi_profil SET status = 'dicabut' WHERE id = ?").bind(ids[0]).run();
  const lima = (await buatProfil(m, 705)).j.id;   // slot kosong terisi lagi (4 bukan dicabut)
  await assert.rejects(DB.prepare("UPDATE instansi_profil SET status = 'draf' WHERE id = ?").bind(ids[0]).run(), /paling banyak 4/);
  await DB.prepare("UPDATE instansi_profil SET status = 'dicabut' WHERE id = ?").bind(lima).run();
  await DB.prepare("UPDATE instansi_profil SET status = 'draf' WHERE id = ?").bind(ids[0]).run();   // sekarang muat: tiga lain + satu
  for (const lemah of ["121212", "123123", "112233", "123321", "456654", "909090"]) assert.equal(pinSah(lemah), false, lemah);
  for (const kuat of ["482915", "739104", "261850"]) assert.equal(pinSah(kuat), true, kuat);
});

uji("S1 anggota lama akun pemda tidak dikenali mkAkunSaya; S2 keluar tanpa kuki akun tetap mencabut sesi profil", async () => {
  const {mkAkunSaya} = await import("../../src/hak.js"), {a, m, ps} = await aktifSiap();
  await DB.prepare("INSERT INTO mk_akun (id, wa, nama, status, dibuat) VALUES ('mk0000000000s1aa', '6281200055501', 'Lama', 'aktif', 1)").run();
  await DB.prepare("INSERT INTO mk_anggota (id, mk_id, tabel, akun_id, status, jalur, rujukan, dibuat, diubah) VALUES ('ag0000000000s1aa', 'mk0000000000s1aa', 'instansi_akun', ?, 'aktif', 'kontak', 'uji', 1, 1)").bind(a.id).run();
  assert.deepEqual(await mkAkunSaya({DB}, "mk0000000000s1aa", "6281200055501", 5), [], "anggota pemda disaring");
  const ok = await masukPin(m, ps[0].id, ps[0].pin, ipBaru()), kuki = kukiDari(ok).sesi_profil;
  assert.equal(await n("instansi_sesi_profil", `akun_id = '${a.id}'`), 1);
  const k = await api("POST", "/api/instansi/keluar", {}, {cookie: `sesi_profil=${kuki}`, origin: BASE}); assert.equal(k.s, 200);
  assert.equal(await n("instansi_sesi_profil", `akun_id = '${a.id}'`), 0, "sesi profil dicabut walau kuki akun tidak ada");
});

uji("S3 foto baru diganti lewat kunci sementara (tidak tersisa); S4 log profil_ubah memuat nama kolom, bukan nilai", async () => {
  const a = await buatAkun("pemprov"), m = await masukAkun(a), id = (await buatProfil(m, 800)).j.id;
  assert.equal((await foto(m, id)).s, 200); assert.ok(await R2.get(`instansi/profil/${a.id}/${id}`)); assert.equal(await R2.get(`instansi/profil/${a.id}/${id}.baru`), null, "kunci sementara dibuang");
  const ubah = await api("POST", `/api/instansi/profil/${id}`, ISI(800, {jabatan: "Kepala Seksi Baru"}), m); assert.equal(ubah.s, 200, ubah.t);
  const log = await DB.prepare("SELECT objek FROM instansi_profil_log WHERE profil_id = ? AND jenis = 'profil_ubah'").bind(id).first();
  assert.equal(log.objek, "jabatan"); assert.ok(!JSON.stringify(log).includes("Kepala Seksi"));
});

uji("G2, G3, G6 batas laju ubah dan ajukan, saringan log, 413 badan besar, 405 metode lain, log lembaga dan admin, foto admin", async () => {
  const {a, m, ps} = await aktifSiap(), ok = await masukPin(m, ps[0].id, ps[0].pin, ipBaru()), dalam = {cookie: `${m.cookie}; sesi_profil=${kukiDari(ok).sesi_profil}`};
  const besar = await api("POST", "/api/instansi/profil", {nama: "x".repeat(3000)}, m); assert.equal(besar.s, 413, "G6: badan lebih dari 2048");
  const put = await mf.dispatchFetch(BASE + "/api/instansi/profil", {method: "PUT", headers: {...dalam, "x-pb": "1", origin: BASE, "content-length": "2"}, body: "{}"}); assert.equal(put.status, 405, "G6: PUT di jalur profil");
  assert.equal((await api("GET", "/api/instansi/profil/log?jenis=ZZ", undefined, dalam)).s, 400, "G3 jenis tidak sah");
  assert.equal((await api("GET", "/api/instansi/profil/log?sebelum=abc", undefined, dalam)).s, 400, "G3 sebelum bukan angka");
  assert.equal((await api("GET", "/api/instansi/admin/log?sebelum=abc", undefined, ADMIN)).s, 400);
  const al = await api("GET", `/api/instansi/admin/log?akun=${a.id}&jenis=pin_ok`, undefined, ADMIN); assert.equal(al.s, 200); assert.ok(al.j.log.every(x => x.jenis === "pin_ok") && al.j.log.length >= 1);
  await DB.prepare("UPDATE instansi_profil SET foto = 1 WHERE id = ?").bind(ps[0].id).run(); await R2.put(`instansi/profil/${a.id}/${ps[0].id}`, JPEG_SAH);
  const f = await api("GET", `/api/instansi/admin/profil/foto/${ps[0].id}`, undefined, ADMIN); assert.equal(f.s, 200); assert.match(f.h.get("content-security-policy"), /sandbox/);
  assert.equal((await api("GET", `/api/instansi/admin/profil/foto/${ps[0].id}`, undefined, {})).s, 403);
  const sebelum = (await DB.prepare("SELECT count(*) n FROM laju_bnpb WHERE aksi = 'profil.ubah'").first()).n; void sebelum;
  let tolak = 0; for (let i = 0; i < 62; i++) if ((await api("POST", `/api/instansi/profil/${ps[0].id}`, ISI(900, {nama: `Nama ${i} Uji`, nip: NIP(900), email: "ubah@bpbd.go.id"}), dalam)).s === 429) tolak++;
  assert.ok(tolak >= 2, "G2: ubah dibatasi 60 per jam per akun");
  const tolakKirim = []; for (let i = 0; i < 22; i++) tolakKirim.push((await api("POST", "/api/instansi/kirim", {}, dalam)).s); assert.ok(tolakKirim.includes(429), "G2: kirim dibatasi 20 per jam");
});

uji("M2 trigger pindah akun: profil tidak bisa dipindah ke akun non-pemda atau akun yang sudah punya 4; N2 emoji dihitung per code point (400, bukan 500)", async () => {
  const a = await buatAkun("pemkab"), b = await buatAkun("pemkab"), pol = await buatAkun("polda"), m = await masukAkun(a), mb = await masukAkun(b), ids = [];
  for (let i = 1; i <= 4; i++) ids.push((await buatProfil(mb, 960 + i)).j.id);
  const satu = (await buatProfil(m, 970)).j.id;
  await assert.rejects(DB.prepare("UPDATE instansi_profil SET akun_id = ? WHERE id = ?").bind(b.id, satu).run(), /tidak bisa dipindah/, "akun tujuan sudah 4");
  await assert.rejects(DB.prepare("UPDATE instansi_profil SET akun_id = ? WHERE id = ?").bind(pol.id, satu).run(), /tidak bisa dipindah|hanya untuk akun pemda/, "akun non-pemda");
  await DB.prepare("UPDATE instansi_profil SET status = 'dicabut' WHERE id = ?").bind(ids[0]).run();
  await DB.prepare("UPDATE instansi_profil SET akun_id = ? WHERE id = ?").bind(b.id, satu).run();   // ada tempat: boleh
  const r = await buatProfil(m, 971, {jabatan: "😀"}); assert.equal(r.s, 400, "satu emoji = satu karakter, kurang dari minimal 2: 400 dari JS, bukan CHECK 500");
  assert.equal((await buatProfil(m, 972, {nama: "😀".repeat(101)})).s, 400);
  assert.equal((await buatProfil(m, 973, {nama: "😀😀"})).s, 201);
});
