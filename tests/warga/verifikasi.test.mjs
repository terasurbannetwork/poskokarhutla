/* Tugas jenis "verifikasi" (cluster firespot "mungkin": cek lapangan, bukan pemadaman) di workerd (Miniflare) dengan D1 dan R2 sungguhan, migrasi apa adanya.
   Menguji src/instansi.js buatTugasIsi/pasKartu/konfirmasi + teks di GET /api/instansi/tugas. Jalankan: node --test tests/warga/verifikasi.test.mjs */
import {test, before, after} from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import {Miniflare} from "miniflare";
import {AKAR, migrasi, pecah} from "./_bantu.mjs";
import "../../src/worker.js";   // worker.js dulu: instansi.js dan worker.js saling impor
import {buatTugas, pasKartu, jenisTugas, teksJenis} from "../../src/instansi.js";

const JAM = 3600e3, MENIT = 60e3, T0 = Date.UTC(2026, 9, 22, 4, 7);
const JUDUL = "Cek lapangan: kemungkinan api, belum pasti";
let KAB = null, BERKAS = null, mf, DB, env, h;
const aset = async () => BERKAS == null ? new Response("tidak ada", {status: 404}) : Response.json(BERKAS);
const sandi = {};
before(async () => {
  mf = new Miniflare({modules: true, scriptPath: path.join(AKAR, "src/worker.js"), modulesRoot: AKAR, modulesRules: [{type: "ESModule", include: ["**/*.js"]}], compatibilityDate: "2024-09-23",
    d1Databases: {DB: "uji-verif"}, r2Buckets: {MEDIA: "uji-verif"}, bindings: {IP_SALT: "g", ADMIN_TOKEN: "rahasia-admin", SUPER_ADMIN: "x", SESI_KUNCI: "k"},
    serviceBindings: {ASSETS: aset}, outboundService: async () => new Response("diblok", {status: 599}), cache: false, cf: {country: "ID", colo: "CGK"}});
  DB = await mf.getD1Database("DB"); env = {DB, ASSETS: {fetch: async () => aset()}};
  await DB.batch(pecah(migrasi()).map(s => DB.prepare(s)));
});
after(async () => { await mf?.dispose(); });
const api = async (metode, j, body, hd = {}) => {
  const isi = body === undefined ? undefined : JSON.stringify(body);
  const r = await mf.dispatchFetch("http://instansi.lokal" + j, {method: metode, headers: {...(metode === "POST" ? {"x-pb": "1", "content-type": "application/json"} : {}), ...hd}, body: isi});
  const t = await r.text(); let x = null; try { x = JSON.parse(t); } catch (e) {} return {s: r.status, j: x, t, sc: r.headers.getSetCookie?.() ?? []};
};
const K = (id, lat, lon, o = {}) => ({id, lat, lon, prov: KAB?.prov ?? "62", kab: KAB?.kab ?? "Seruyan", kec: "Kec Uji", level: 1, n24: 2, jam_sejak: 2, luas: 3, konsesi: [], ...o});
const berkas = (waktu, kompleks) => { BERKAS = {dibuat: new Date(waktu).toISOString(), kompleks}; };
const bersih = () => DB.batch([DB.prepare("DELETE FROM tugas_api"), DB.prepare("DELETE FROM tugas_meta")]);
const kartu = async () => (await DB.prepare("SELECT t.id, t.level, json_extract(k.kartu, '$.jenis') jenis, json_extract(k.kartu, '$.firespot') fs FROM tugas_api t LEFT JOIN tugas_kartu k ON k.tugas_id = t.id ORDER BY t.dibuat, t.id").all()).results;
const seg = (m, isi) => [0xff, m, (isi.length + 2) >> 8, (isi.length + 2) & 255, ...isi];
const jpeg = () => new Uint8Array([0xff, 0xd8, ...seg(0xe0, [0x4a, 0x46, 0x49, 0x46, 0, 1, 1, 0, 0, 0, 0, 1, 0, 0]), ...seg(0xc0, [8, 0, 1, 0, 1, 1, 1, 0x11, 0]), ...seg(0xda, [1, 1, 0, 0, 0x3f, 0]), ...Array(40).fill(7), 0xff, 0xd9]);
const WEBP = (() => { const c = [..."VP8 "].map(x => x.charCodeAt(0)).concat([10, 0, 0, 0], Array(10).fill(1)), n = 4 + c.length; return new Uint8Array([..."RIFF"].map(x => x.charCodeAt(0)).concat([n & 255, n >> 8, 0, 0], [..."WEBP"].map(x => x.charCodeAt(0)), c)); })();
const gps = (lat, lon, t = Date.now()) => ({lat, lon, akurasi: 12, waktu_gps: t, sampel: [[lat + 0.00001, lon, 10, t - 2000], [lat + 0.00002, lon + 0.00001, 11, t - 1000], [lat, lon, 12, t]]});
const V = (id, lat, lon, o = {}) => K(id, lat, lon, {jenis: "verifikasi", firespot: "mungkin", otomatis: true, ...o});

test("murni: jenis dan teks; tanpa jenis = pemadaman; kartu menolak jenis asing", () => {
  assert.equal(jenisTugas(null), "pemadaman"); assert.equal(jenisTugas({}), "pemadaman"); assert.equal(jenisTugas({jenis: "verifikasi"}), "verifikasi"); assert.equal(jenisTugas({jenis: "aneh"}), "pemadaman");
  assert.equal(teksJenis("verifikasi").judul, JUDUL); assert.match(teksJenis("verifikasi").arahan, /Pastikan ada api atau tidak, kabari lewat laporan/); assert.equal(teksJenis("pemadaman").judul, null);
  assert.equal(JSON.parse(pasKartu({jenis: "verifikasi", firespot: "mungkin"})).jenis, "verifikasi");
  assert.equal(pasKartu({jenis: "aneh", firespot: "x"}), null, "jenis dan firespot asing dibuang");
});

test("pembuat tugas: verifikasi tercipta dengan jenis benar; berkas lama tanpa jenis = pemadaman; verifikasi tanpa tabel kartu tetap tercipta", async () => {
  await bersih(); berkas(T0 - 5 * MENIT, [V("K1", -2.5, 112), K("K2", -2.0, 113, {level: 3}), K("K3", -1.5, 114, {level: 2, jenis: "pemadaman"})]);
  assert.deepEqual(await buatTugas(env, T0), {baru: 3, digabung: 0});
  const j = Object.fromEntries((await kartu()).map(r => [r.level + ":" + r.jenis, r.fs]));
  assert.deepEqual(Object.keys(j).sort(), ["1:verifikasi", "2:pemadaman", "3:null"], JSON.stringify(j));
  assert.equal(j["1:verifikasi"], "mungkin");
});

test("penggabungan: verifikasi tidak menurunkan pemadaman; pemadaman menaikkan verifikasi; verifikasi + verifikasi tetap", async () => {
  await bersih(); berkas(T0 - 5 * MENIT, [K("K1", -2.5, 112, {level: 3})]); await buatTugas(env, T0);
  berkas(T0 - 4 * MENIT, [V("K9", -2.5, 112.001)]); assert.equal((await buatTugas(env, T0)).digabung, 1);
  assert.equal((await kartu())[0].jenis, "pemadaman", "tugas lama tanpa jenis tetap pemadaman (bukan diturunkan)");
  await bersih(); berkas(T0 - 5 * MENIT, [V("K1", -2.5, 112)]); await buatTugas(env, T0);
  berkas(T0 - 4 * MENIT, [V("K1", -2.5, 112.001)]); await buatTugas(env, T0); assert.equal((await kartu())[0].jenis, "verifikasi");
  berkas(T0 - 3 * MENIT, [K("K1", -2.5, 112.001, {level: 3, jenis: "pemadaman"})]); await buatTugas(env, T0); const r = await kartu();
  assert.equal(r.length, 1); assert.equal(r[0].jenis, "pemadaman"); assert.equal(r[0].level, 3);
});

test("layar akun: teks verifikasi; bukan api menutup tanpa dihitung padam; api ada menaikkan jadi pemadaman", async () => {
  /* akun nyata lewat rute admin, diaktifkan lewat SQL (jalur verifikasi akun diuji di instansi.test.mjs) */
  for (let mulai = 0; mulai != null;) { const b = await api("POST", "/api/instansi/admin/buat", {mulai, batas: 200}, {"x-admin-token": "rahasia-admin"}); assert.equal(b.s, 200, b.t); for (const a of b.j.dibuat) sandi[a.username] = a.sandi; mulai = b.j.berikut; }
  const AK = await DB.prepare("SELECT username, tingkat, prov, kab, cakupan FROM instansi_akun ORDER BY tingkat = 'kab' DESC, username LIMIT 1").first(); assert.ok(AK, "ada akun"); const U = AK.username;
  KAB = {prov: AK.prov ?? JSON.parse(AK.cakupan)[0], kab: AK.kab ?? "Kabupaten Uji"};
  await DB.prepare("UPDATE instansi_akun SET status = 'aktif', wajib_ganti = 0, nama = 'Budi Santoso', nip = '198001012005011001', jabatan = 'Kepala BPBD', unit = 'BPBD', email = 'b@x.go.id', wa = '6281234567890', surat = 1, kartu = 1, dikirim = 1, diputus = 1 WHERE username = ?").bind(U).run();
  const m = await api("POST", "/api/instansi/masuk", {username: U, sandi: sandi[U]}, {"cf-connecting-ip": "198.51.100.7"}); assert.equal(m.s, 200, m.t);
  h = {cookie: m.sc.map(c => c.split(";")[0]).join("; ")};
  await bersih(); berkas(Date.now() - 5 * MENIT, [V("K1", -2.5, 112), K("K2", -2.0, 113.5, {level: 3})]); await buatTugas(env, Date.now());
  const daftar = (await api("GET", "/api/instansi/tugas", undefined, h)).j.tugas, ver = daftar.filter(t => t.jenis === "verifikasi"), pem = daftar.filter(t => t.jenis === "pemadaman");
  assert.equal(ver.length, 1); assert.equal(pem.length, 1); assert.equal(ver[0].judul, JUDUL); assert.match(ver[0].arahan, /kabari lewat laporan/); assert.equal(pem[0].judul, null);
  assert.ok(!/Padamkan/.test(ver[0].judul + ver[0].arahan), "verifikasi bukan perintah memadamkan");
  const lap = (await api("GET", "/api/instansi/tugas/" + ver[0].id, undefined, h)).j.tugas; assert.equal(lap.jenis, "verifikasi");
  const st = async id => (await DB.prepare("SELECT status FROM tugas_api WHERE id = ?").bind(id).first()).status, jn = async id => (await DB.prepare("SELECT json_extract(kartu, '$.jenis') j FROM tugas_kartu WHERE tugas_id = ?").bind(id).first())?.j;
  const unggah = async tid => {
    const f = new FormData(), g = gps(-2.5, 112.0); f.append("tugas_id", tid); f.append("media", new File([jpeg()], "a.bin")); f.append("thumb", new File([WEBP], "t.bin"));
    for (const k of ["lat", "lon", "akurasi", "waktu_gps"]) f.append(k, String(g[k])); f.append("sampel", JSON.stringify(g.sampel));
    const r0 = new Response(f), buf = new Uint8Array(await r0.arrayBuffer());
    const r = await mf.dispatchFetch("http://instansi.lokal/api/instansi/media", {method: "POST", headers: {"x-pb": "1", "content-type": r0.headers.get("content-type"), "content-length": String(buf.length), ...h}, body: buf});
    const j = await r.json(); assert.equal(r.status, 201, JSON.stringify(j)); return j.id;
  };
  const konf = async (tid, hasil) => api("POST", `/api/instansi/konfirmasi/${tid}`, {klien_id: "verif-" + hasil + tid.slice(0, 4), hasil, pic_nama: "Pak Joko", pic_jabatan: "Kepala Desa", pic_wa: "0812 1111 2222", media: [await unggah(tid)]}, h);
  /* tidak ada api: tugas ditutup bukan_api, bukan padam */
  assert.equal((await konf(ver[0].id, "bukan_api")).s, 201); assert.equal(await st(ver[0].id), "bukan_api");
  assert.equal((await DB.prepare("SELECT count(*) n FROM tugas_api WHERE status = 'padam'").first()).n, 0, "tidak ada api tidak dihitung api padam");
  /* ada api: tetap buka, jenis naik jadi pemadaman (kabar tindakan lalu berlaku), judul verifikasi hilang */
  await bersih(); berkas(Date.now() - 5 * MENIT, [V("K1", -2.5, 112)]); await buatTugas(env, Date.now());
  const t2 = (await api("GET", "/api/instansi/tugas", undefined, h)).j.tugas[0]; assert.equal(t2.jenis, "verifikasi");
  assert.equal((await konf(t2.id, "api_ada")).s, 201); assert.equal(await st(t2.id), "buka"); assert.equal(await jn(t2.id), "pemadaman");
  const sesudah = (await api("GET", "/api/instansi/tugas/" + t2.id, undefined, h)).j.tugas; assert.equal(sesudah.jenis, "pemadaman"); assert.equal(sesudah.judul, null);
  berkas(Date.now() - 4 * MENIT, [V("K1", -2.5, 112.001)]); await DB.prepare("DELETE FROM tugas_meta").run(); await buatTugas(env, Date.now());
  assert.equal(await jn(t2.id), "pemadaman", "pipeline yang masih menulis verifikasi tidak menurunkan tugas yang sudah naik");
});
