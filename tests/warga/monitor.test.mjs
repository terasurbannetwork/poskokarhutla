/* /api/monitor (src/monitor.js, migrations/0062_monitor_baca.sql) di workerd (Miniflare) dengan D1 lokal sungguhan, migrasi apa adanya.
   Jalankan: node --test tests/warga/monitor.test.mjs */
import assert from "node:assert/strict";
import {AKAR} from "./_bantu.mjs";
import {siapkan, berantai, ADMIN, sha256} from "./_bnpb.mjs";
import "../../src/worker.js";

const JAM = 3600e3, PB = {"x-pb": "1"}, uji = berantai(), SANDI = "SandiUji23456789";
const U = await siapkan("uji-monitor", {r2: true}), {DB, api, mf} = U;
let ipN = 0;
const ip = () => ({"cf-connecting-ip": `198.51.100.${++ipN % 250}`});
const id16 = () => [...crypto.getRandomValues(new Uint8Array(8))].map(b => b.toString(16).padStart(2, "0")).join("");
const bikinStaf = async (peran, wilayah = []) => {
  const r = await api("POST", "/api/staf/admin/buat", {nama: "Staf " + peran[0], nip: `1980${++ipN}0012005`, unit: "Pusdalops BNPB", email: `s${ipN}@bnpb.go.id`, wa: "081234567890", peran, wilayah}, ADMIN);
  assert.equal(r.s, 201, r.t);
  const m = await api("POST", "/api/staf/masuk", {username: r.j.username, sandi: r.j.sandi}, ip()), cookie = m.h.get("set-cookie").split(";")[0];
  assert.equal((await api("POST", "/api/staf/gantisandi", {}, {cookie, ...PB})).s, 200);
  return {cookie, ...PB};
};
async function akun(username, {jenis = "pemkab", tingkat = "kab", prov = "62", kab = "Kab Satu", cakupan = ["62"]} = {}) {
  const garam = "g".repeat(32), id = id16();
  await DB.prepare(`INSERT INTO instansi_akun (id, username, jenis, tingkat, wilayah, kunci_wilayah, cakupan, prov, kab, garam, sandi_sha, status, nama, nip, jabatan, unit, email, wa, surat, kartu, dikirim, diputus, wajib_ganti, dibuat, dummy)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'aktif', 'Budi Uji', '198001012005011001', 'Kalak', 'BPBD', 'budi@uji.go.id', '628123456789', 1, 1, 1, 1, 0, 1, 0)`)
    .bind(id, username, jenis, tingkat, tingkat === "kab" ? `Pemerintah ${kab}` : `Provinsi ${prov}`, `uji|${username}`, JSON.stringify(cakupan), tingkat === "kab" ? prov : null, tingkat === "kab" ? kab : null, garam, sha256(garam + SANDI)).run();
  const r = await api("POST", "/api/instansi/masuk", {username, sandi: SANDI}, {...PB, ...ip()}); assert.equal(r.s, 200, r.t);
  return {id, h: {cookie: r.h.get("set-cookie").split(",")[0].split(";")[0], ...PB}};
}
async function tugas(prov, kab, {status = "buka", umurJam = 1, dummy = 0} = {}) {
  const id = id16(), t = Date.now() - umurJam * JAM;
  await DB.prepare("INSERT INTO tugas_api (id, prov, kab, kec, lat, lon, level, n24, luas_ha, dibuat, terakhir_terdeteksi, status, dummy) VALUES (?, ?, ?, 'Kec Uji', -2.2, 113.9, 3, 10, 50, ?, ?, ?, ?)").bind(id, prov, kab, t, t, status, dummy).run();
  return id;
}
const T = {};
uji("siapan data", async () => {
  T.a = await tugas("62", "Kab Satu"); T.b = await tugas("62", "Kab Dua"); T.c = await tugas("64", "Kab Luar");
  T.lama = await tugas("62", "Kab Satu", {status: "padam", umurJam: 100}); T.dum = await tugas("62", "Kab Satu", {dummy: 1});
  const aki = await akun("pemkabsatu", {}); T.aki = aki;
  const isi = id16();
  await DB.prepare(`INSERT INTO tugas_isian (id, tugas_id, akun_id, klien_id, langkah, dibuat, lat, lon, waktu_gps, hasil, pic_nama, pic_jabatan, pic_wa, jarak_km) VALUES (?, ?, ?, 'klien-uji-1', 'konfirmasi', ?, -2.2, 113.9, 1, 'api_ada', 'Pak PIC', 'Kasi', '628123456780', 0.4)`).bind(isi, T.a, aki.id, Date.now()).run();
  const tin = id16();
  await DB.prepare(`INSERT INTO tugas_isian (id, tugas_id, akun_id, klien_id, langkah, dibuat, tindakan, status_api) VALUES (?, ?, ?, 'klien-uji-2', 'tindakan', ?, 'Sekat kanal', 'bara')`).bind(tin, T.a, aki.id, Date.now()).run();
  T.foto = id16();
  await DB.prepare(`INSERT INTO instansi_media (id, akun_id, tugas_id, isian_id, jenis, mime, ukuran, waktu_ambil, sumber_waktu, lat, lon, waktu_gps, dibuat) VALUES (?, ?, ?, ?, 'foto', 'image/jpeg', 10, ?, 'exif', -2.2, 113.9, ?, ?)`).bind(T.foto, aki.id, T.a, isi, Date.now(), Date.now(), Date.now()).run();
});
uji("tanpa sesi: 401 JSON di GET dan POST", async () => {
  const g = await api("GET", "/api/monitor"); assert.equal(g.s, 401); assert.ok(g.j.galat);
  assert.equal((await api("POST", "/api/monitor/baca", {tugas: [T.a]}, PB)).s, 401);
  assert.equal((await api("GET", `/api/monitor/thumb/${T.foto}`)).s, 401);
});
uji("dalops: lihat seluruh negeri, 72 jam, tanpa dummy; bentuk JSON lengkap", async () => {
  const s = await bikinStaf(["pusdalops"]), r = await api("GET", "/api/monitor", undefined, s);
  assert.equal(r.s, 200, r.t); assert.equal(r.j.pihak, "dalops"); assert.equal(r.j.saya.unit, "Pusdalops BNPB");
  const ids = r.j.tugas.map(t => t.id); assert.ok([T.a, T.b, T.c].every(i => ids.includes(i)), "nasional"); assert.ok(!ids.includes(T.lama) && !ids.includes(T.dum));
  const a = r.j.tugas.find(t => t.id === T.a);
  assert.deepEqual(Object.keys(a), ["id", "prov", "prov_nama", "kab", "kec", "lat", "lon", "level", "status", "dibuat", "terakhir_terdeteksi", "padam_verif", "baca", "groundcheck", "tindak", "n_tindakan"]);
  assert.equal(a.groundcheck.hasil, "api_ada"); assert.equal(a.groundcheck.media[0].thumb, `/api/monitor/thumb/${T.foto}`); assert.equal(a.tindak.status_api, "bara"); assert.equal(a.n_tindakan, 1);
  assert.equal(r.j.tugas.find(t => t.id === T.b).groundcheck, null);
  const wil = await bikinStaf(["koordalops"], ["64"]), w = await api("GET", "/api/monitor", undefined, wil);
  assert.deepEqual(w.j.tugas.map(t => t.id), [T.c], "staf berwilayah hanya provinsinya");
  const tmc = await bikinStaf(["tmc"]); assert.equal((await api("GET", "/api/monitor", undefined, tmc)).s, 403);
  assert.ok((await api("GET", "/api/monitor", undefined, ADMIN)).j.tugas.some(t => t.id === T.dum), "admin melihat dummy");
});
uji("bpbd: hanya wilayahnya; polisi ditolak", async () => {
  const r = await api("GET", "/api/monitor", undefined, T.aki.h); assert.equal(r.s, 200, r.t); assert.equal(r.j.pihak, "bpbd");
  assert.deepEqual(r.j.tugas.map(t => t.id), [T.a], "kabupaten sendiri saja");
  const pol = await akun("polresuji", {jenis: "polres"}); assert.equal((await api("GET", "/api/monitor", undefined, pol.h)).s, 403);
  const prov = await akun("pemprov62", {jenis: "pemprov", tingkat: "prov"}); assert.deepEqual((await api("GET", "/api/monitor", undefined, prov.h)).j.tugas.map(t => t.id).sort(), [T.a, T.b].sort());
});
uji("POST baca: sekali per pembaca (idempoten), pihak benar, di luar wilayah tidak tercatat", async () => {
  const s = await bikinStaf(["pusdalops"]);
  let r = await api("POST", "/api/monitor/baca", {tugas: [T.a, T.b]}, s); assert.equal(r.j.dicatat, 2, r.t);
  r = await api("POST", "/api/monitor/baca", {tugas: [T.a]}, s); assert.equal(r.j.dicatat, 0, "kedua kali tidak menambah");
  const w1 = (await DB.prepare("SELECT waktu FROM monitor_baca WHERE tugas_id = ?").bind(T.a).first()).waktu;
  await api("POST", "/api/monitor/baca", {tugas: [T.a]}, s); assert.equal((await DB.prepare("SELECT waktu FROM monitor_baca WHERE tugas_id = ?").bind(T.a).first()).waktu, w1, "waktu baca pertama tetap");
  r = await api("POST", "/api/monitor/baca", {tugas: [T.a, T.b, T.c]}, T.aki.h); assert.equal(r.j.dicatat, 1, "bpbd hanya tugas kabupatennya"); 
  assert.equal(await U.n("monitor_baca", `tugas_id = '${T.c}'`), 0, "luar wilayah tidak tercatat");
  const g = (await api("GET", "/api/monitor", undefined, ADMIN)).j.tugas.find(t => t.id === T.a);
  assert.equal(g.baca.dalops.length, 1); assert.equal(g.baca.bpbd.length, 1); assert.equal(g.baca.bpbd[0].nama, "Budi Uji");
  assert.equal((await api("POST", "/api/monitor/baca", {tugas: []}, s)).s, 400); assert.equal((await api("POST", "/api/monitor/baca", {tugas: ["x"]}, s)).s, 400);
  assert.equal((await api("POST", "/api/monitor/baca", {tugas: [T.a]}, {cookie: T.aki.h.cookie})).s, 403, "akun instansi tanpa x-pb");
  const wil = await bikinStaf(["pusdalops"], ["64"]); assert.equal((await api("POST", "/api/monitor/baca", {tugas: [T.a]}, wil)).j.dicatat, 0, "staf berwilayah lain");
});
uji("media: di luar wilayah 404, di dalam melewati auth (R2 kosong = 404 berkas)", async () => {
  const luar = await akun("pemkabdua", {kab: "Kab Dua"}); assert.equal((await api("GET", `/api/monitor/media/${T.foto}`, undefined, luar.h)).s, 404);
  const ok = await api("GET", `/api/monitor/media/${T.foto}`, undefined, T.aki.h); assert.equal(ok.s, 404); assert.match(ok.j.galat, /berkas tidak ada/);
  const R2 = await mf.getR2Bucket("MEDIA"); await R2.put(`instansi/media/${T.foto}`, new Uint8Array([1, 2, 3]));
  const v = await mf.dispatchFetch("http://bnpb.lokal/api/monitor/media/" + T.foto, {headers: T.aki.h}); assert.equal(v.status, 200); assert.equal((await v.arrayBuffer()).byteLength, 3);
});
uji("tabel monitor_baca belum ada: GET tetap jalan, POST 503", async () => {
  await DB.exec("DROP TABLE monitor_baca");
  const g = await api("GET", "/api/monitor", undefined, ADMIN); assert.equal(g.s, 200, g.t); assert.deepEqual(g.j.tugas.find(t => t.id === T.a).baca, {dalops: [], bpbd: []});
  const p = await api("POST", "/api/monitor/baca", {tugas: [T.a]}, T.aki.h); assert.equal(p.s, 503); assert.match(p.j.galat, /0062/);
});
