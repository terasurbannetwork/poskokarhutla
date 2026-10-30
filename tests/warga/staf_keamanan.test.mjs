/* Temuan security-reviewer atas akun staf dan Meja Pantau (21 Okt 2026), tiap butir diuji di workerd + D1 sungguhan (TEST.md: tanpa mock):
   1 kontak PT dibatasi wilayah staf; 2 akun gerbang situs tidak masuk Meja Pantau; 3 roster tugaskan menyaring staf dummy; 4 rute lama yang dibuka untuk staf menyaring baris dummy;
   5 login terkunci tidak menulis baris laju lagi (sandi benar tetap masuk); 6 daftar staf hanya Super Admin.
   Jalankan: node --test tests/warga/staf_keamanan.test.mjs */
import assert from "node:assert/strict";
import {siapkan, berantai, ADMIN, MOD2, GERBANG, sha256} from "./_bnpb.mjs";
import "../../src/worker.js";

const JAM = 3600e3, MENIT = 60e3, PB = {"x-pb": "1", origin: "http://bnpb.lokal"};
const uji = berantai();
const U = await siapkan("uji-staf-keamanan", {r2: true});
const {DB, api, n} = U;
let ipN = 0;
const ipBaru = () => ({"cf-connecting-ip": `203.0.113.${++ipN % 250}`});
let nipN = 0;
const bikin = async (nama, peran, wilayah = []) => {
  const r = await api("POST", "/api/staf/admin/buat", {nama, nip: `19900${++nipN}0012005`, unit: "Pusdalops BNPB", email: `k${nipN}@bnpb.go.id`, wa: "081234567890", peran, wilayah}, ADMIN);
  assert.equal(r.s, 201, r.t);
  const m = await api("POST", "/api/staf/masuk", {username: r.j.username, sandi: r.j.sandi}, ipBaru()); assert.equal(m.s, 200, m.t);
  const cookie = m.h.get("set-cookie").split(";")[0], g = await api("POST", "/api/staf/gantisandi", {}, {cookie, ...PB}); assert.equal(g.s, 200, g.t);
  return {id: r.j.staf.id, username: r.j.username, sandi: g.j.sandi, h: {cookie}, hp: {cookie, ...PB}};
};
const id16 = () => [...crypto.getRandomValues(new Uint8Array(8))].map(b => b.toString(16).padStart(2, "0")).join("");
const sisip = (tabel, o) => DB.prepare(`INSERT INTO ${tabel} (${Object.keys(o).join(", ")}) VALUES (${Object.keys(o).map(() => "?").join(", ")})`).bind(...Object.values(o)).run();
const tgl = () => new Date(Date.now() + 7 * JAM).toISOString().slice(0, 10);
const pgl = (o = {}) => { const id = id16(); return sisip("panggilan", {id, tanggal: tgl(), perusahaan_id: "pt-" + id, nama_pt: "PT Uji " + id.slice(0, 4), prov: "62", kab: "Seruyan", titik_n: 3, terdeteksi: Date.now() - JAM, lat: -2.5, lon: 112.9,
  status: "baru", dibuat: Date.now() - 30 * MENIT, dummy: 0, ...o}).then(() => o.perusahaan_id ?? "pt-" + id); };
const kontak = (pid, dummy = 0) => sisip("kontak_pt", {id: id16(), perusahaan_id: pid, nama_pt: "PT " + pid, wa: "628123456781", diubah: Date.now(), dummy});
const akun = (o = {}) => sisip("instansi_akun", {id: id16(), username: "akun" + id16().slice(0, 8), jenis: "pemkab", tingkat: "kab", wilayah: "Pemerintah Kabupaten Contoh", kunci_wilayah: "k" + id16(), cakupan: '["62"]', prov: "62", kab: "Contoh",
  garam: "a".repeat(32), sandi_sha: "0".repeat(64), status: "menunggu", nama: "Budi", nip: "198001012005011001", jabatan: "Kalak", unit: "BPBD", email: "budi@contoh.go.id", wa: "628123456789", surat: 1, kartu: 1,
  dikirim: Date.now() - 2 * JAM, wajib_ganti: 0, dibuat: Date.now() - 3 * JAM, dummy: 0, ...o});
const nip = () => "1980" + String(++nipN).padStart(8, "0");

uji("1. kontak PT: staf berwilayah hanya perusahaan yang punya panggilan di provinsinya; staf nasional dan moderator penuh", async () => {
  const a = await pgl({prov: "62", perusahaan_id: "pt-kalteng"}), b = await pgl({prov: "11", kab: "Aceh Barat", perusahaan_id: "pt-aceh"});
  await kontak(a); await kontak(b);
  const kal = await bikin("Analis Kalteng", ["analis_konsesi"], ["62"]), nas = await bikin("Analis Nasional", ["analis_konsesi"], []);
  const badan = pid => ({perusahaan_id: pid, nama_pt: "PT Baru " + pid, wa: "081234567890"});
  assert.equal((await api("POST", "/api/posko/kontak", badan(b), kal.hp)).s, 404, "perusahaan provinsi lain");
  assert.equal((await api("POST", "/api/posko/kontak", badan("pt-tak-bernomor-panggilan"), kal.hp)).s, 404, "tanpa panggilan di mana pun = di luar wilayah");
  assert.equal((await api("POST", "/api/posko/kontak", badan(a), kal.hp)).s, 201);
  const baca = async h => (await api("GET", "/api/posko/kontak", undefined, h)).j.kontak.map(k => k.perusahaan_id).sort();
  assert.deepEqual(await baca(kal.h), ["pt-kalteng"], "baca hanya yang sewilayah");
  assert.deepEqual(await baca(nas.h), ["pt-aceh", "pt-kalteng"]); assert.deepEqual(await baca(MOD2), ["pt-aceh", "pt-kalteng"]);
  assert.equal((await api("POST", "/api/posko/kontak", badan(b), nas.hp)).s, 201); assert.equal((await api("POST", "/api/posko/kontak", badan(b), MOD2)).s, 201);
  assert.equal((await DB.prepare("SELECT nama_pt FROM kontak_pt WHERE perusahaan_id = 'pt-aceh'").first()).nama_pt, "PT Baru pt-aceh");
});
uji("2. akun gerbang situs ditolak 403 di Meja Pantau (baca, aksi, jejak); moderator dan Super Admin tetap masuk", async () => {
  assert.equal((await api("GET", "/api/pantau", undefined, GERBANG)).s, 403);
  assert.equal((await api("POST", "/api/pantau/butir", {id: "konsesi:x:62", aksi: "ambil"}, GERBANG)).s, 403);
  assert.equal((await api("GET", "/api/pantau/jejak?id=konsesi:x:62", undefined, GERBANG)).s, 403);
  assert.equal((await api("GET", "/api/pantau")).s, 401, "anonim tetap 401");
  assert.equal((await api("GET", "/api/pantau", undefined, MOD2)).s, 200); assert.equal((await api("GET", "/api/pantau", undefined, ADMIN)).s, 200);
});
let KO;
uji("3. roster tugaskan dan validasi `ke` menyaring staf dummy untuk pelaku nyata; admin (dummy) tetap melihatnya", async () => {
  KO = await bikin("Koordinator Nyata", ["koordalops"]);
  const dummyId = id16();
  await sisip("staf", {id: dummyId, username: "stafdummy01", nama: "Dummy Staf", nip: nip(), unit: "BNPB", email: "d@contoh.invalid", wa: "62000000999", peran: '["pusdalops"]', wilayah: "[]", garam: "a".repeat(32), sandi_sha: "0".repeat(64), wajib_ganti: 0, dibuat: 1, dummy: 1});
  await pgl({prov: "62", perusahaan_id: "pt-butir-roster"});   // satu butir nyata (konsesi tanpa kontak) untuk ditugaskan
  const nama = j => j.staf.map(s => s.nama);
  const nyata = await api("GET", "/api/pantau", undefined, KO.h); assert.equal(nyata.s, 200);
  assert.ok(nama(nyata.j).includes("Koordinator Nyata") && !nama(nyata.j).includes("Dummy Staf"));
  assert.ok(nama((await api("GET", "/api/pantau", undefined, ADMIN)).j).includes("Dummy Staf"), "pelaku dummy melihat roster dummy");
  const butir = nyata.j.butir.find(b => b.id.startsWith("konsesi:pt-butir-roster")); assert.ok(butir, "butir uji ada");
  assert.equal((await api("POST", "/api/pantau/butir", {id: butir.id, aksi: "tugaskan", ke: dummyId}, KO.hp)).s, 400, "tugaskan ke staf dummy ditolak untuk pelaku nyata");
  assert.equal((await api("POST", "/api/pantau/butir", {id: butir.id, aksi: "tugaskan", ke: KO.id}, KO.hp)).s, 200);
});
uji("4. rute lama yang terbuka untuk staf menyaring baris dummy bagi staf nyata; moderator melihat semuanya", async () => {
  const dAkun = id16(); await akun({id: dAkun, username: "akundummy01", dummy: 1}); await akun({username: "akunnyata01"});
  const nAkun = (await DB.prepare("SELECT id FROM instansi_akun WHERE username = 'akunnyata01'").first()).id;
  await sisip("usulan_kontak_pt", {id: id16(), akun_id: dAkun, perusahaan_id: "usul-dummy", nama_pt: "PT Usulan Dummy", wa: "628123456782", status: "menunggu", dibuat: Date.now() - JAM, dummy: 1});
  await sisip("usulan_kontak_pt", {id: id16(), akun_id: nAkun, perusahaan_id: "usul-nyata", nama_pt: "PT Usulan Nyata", wa: "628123456783", status: "menunggu", dibuat: Date.now() - JAM, dummy: 0});
  await pgl({prov: "62", perusahaan_id: "pt-pgl-dummy", dummy: 1}); await kontak("pt-pgl-dummy", 1);
  await sisip("tugas_api", {id: id16(), prov: "62", kab: "Kapuas", kec: "X", lat: -2.5, lon: 113.2, level: 3, n24: 4, dibuat: Date.now() - 9 * JAM, terakhir_terdeteksi: Date.now() - JAM, status: "buka", dummy: 1});
  const ver = await bikin("Verifikator Nyata", ["verifikator", "pusdalops"]), ana = await bikin("Analis Nyata", ["analis_konsesi"]);
  const ada = (r, kunci, f) => r.j[kunci].some(f);
  /* antrean akun */
  const antrean = h => api("GET", "/api/instansi/admin/antrean", undefined, h);
  assert.ok(!ada(await antrean(ver.h), "akun", a => a.username === "akundummy01") && ada(await antrean(ver.h), "akun", a => a.username === "akunnyata01"));
  assert.ok(ada(await antrean(MOD2), "akun", a => a.username === "akundummy01"), "moderator melihat dummy");
  /* pantau instansi: ringkasan provinsi, akun, tugas terlambat */
  const pn = await api("GET", "/api/instansi/admin/pantau", undefined, ver.h); assert.equal(pn.s, 200);
  assert.ok(!pn.j.akun.some(a => a.dummy) && !pn.j.terlambat.some(t => t.dummy));
  assert.ok((await api("GET", "/api/instansi/admin/pantau", undefined, MOD2)).j.terlambat.some(t => t.dummy));
  /* usulan, panggilan, kontak */
  const us = h => api("GET", "/api/instansi/admin/usulan", undefined, h);
  assert.deepEqual((await us(ana.h)).j.usulan.map(u => u.perusahaan_id), ["usul-nyata"]); assert.equal((await us(MOD2)).j.usulan.length, 2);
  const pg = h => api("GET", "/api/posko/panggilan?semua=1", undefined, h);
  assert.ok(!(await pg(ana.h)).j.panggilan.some(p => p.dummy) && (await pg(ana.h)).j.panggilan.length > 0 && (await pg(MOD2)).j.panggilan.some(p => p.dummy));
  assert.ok(!(await api("GET", "/api/posko/kontak", undefined, ana.h)).j.kontak.some(k => k.dummy) && (await api("GET", "/api/posko/kontak", undefined, MOD2)).j.kontak.some(k => k.dummy));
});
uji("5. login yang sudah terkunci tidak menulis baris laju lagi; sandi benar tetap masuk (staf dan instansi)", async () => {
  const s = await bikin("Staf Kunci", ["pusdalops"]), ip = {"cf-connecting-ip": "203.0.113.251"};
  for (let i = 0; i < 14; i++) await api("POST", "/api/staf/masuk", {username: s.username, sandi: "salah" + i}, ip);
  assert.equal(await n("laju_bnpb", "aksi = 'staf.gagal_ui'"), 8, "dihentikan di batas 8 per (username, IP), bukan 14");
  assert.equal((await api("POST", "/api/staf/masuk", {username: s.username, sandi: "salah-lagi"}, ip)).s, 429);
  assert.equal((await api("POST", "/api/staf/masuk", {username: s.username, sandi: s.sandi}, ip)).s, 200, "sandi benar selalu masuk");
  const garam = "b".repeat(32); await akun({username: "akunkunci01", status: "aktif", garam, sandi_sha: sha256(garam + "SandiBenar123")});
  const ip2 = {"cf-connecting-ip": "203.0.113.252"};
  for (let i = 0; i < 14; i++) await api("POST", "/api/instansi/masuk", {username: "akunkunci01", sandi: "salah" + i}, {...ip2, ...PB});
  assert.equal(await n("laju_bnpb", "aksi = 'instansi.gagal_ui'"), 8);
  assert.equal((await api("POST", "/api/instansi/masuk", {username: "akunkunci01", sandi: "SandiBenar123"}, {...ip2, ...PB})).s, 200);
});
uji("6. daftar staf (NIP, WA, email) hanya Super Admin; moderator, akun gerbang, anonim, dan staf 403", async () => {
  for (const h of [MOD2, GERBANG, {}, KO.h]) assert.equal((await api("GET", "/api/staf/admin/daftar", undefined, h)).s, 403);
  const r = await api("GET", "/api/staf/admin/daftar", undefined, ADMIN); assert.equal(r.s, 200); assert.ok(r.j.staf.length >= 2);
});
uji("7. CSP /instansi mengizinkan Google Fonts saja tambahan; versi aset /admin/instansi naik; judul butir memakai 'N jam M menit'", async () => {
  const r = await U.mf.dispatchFetch("http://bnpb.lokal/instansi"), csp = r.headers.get("content-security-policy"); await r.text();
  assert.equal(r.status, 200);
  assert.match(csp, /style-src 'self' https:\/\/cdnjs\.cloudflare\.com https:\/\/fonts\.googleapis\.com;/); assert.match(csp, /font-src https:\/\/fonts\.gstatic\.com;/);
  assert.match(csp, /script-src 'self' https:\/\/cdnjs\.cloudflare\.com;/); assert.ok(!/unsafe-/.test(csp), "tidak ada unsafe-*"); assert.match(csp, /frame-ancestors 'none'/); assert.match(csp, /connect-src 'self' https:\/\/\*\.openfreemap\.org;/);
  const h = await (await U.mf.dispatchFetch("http://bnpb.lokal/admin/instansi", {headers: ADMIN})).text();
  assert.ok(h.includes("/admin/instansi.css?v=3") && h.includes("/admin/instansi.js?v=6"), "versi aset naik");
  await sisip("tugas_api", {id: id16(), prov: "62", kab: "Kapuas", kec: "Mentaya", lat: -2.4, lon: 113.1, level: 3, n24: 4, dibuat: Date.now() - (8 * 60 + 3) * MENIT, terakhir_terdeteksi: Date.now() - JAM, status: "buka", dummy: 0});
  const j = (await api("GET", "/api/pantau", undefined, MOD2)).j, b = j.butir.find(x => x.jenis === "api_konfirmasi" && x.judul.includes("Mentaya"));
  assert.match(b.judul, /lewat 2 jam 3 menit dari batas 6 jam$/);
});
