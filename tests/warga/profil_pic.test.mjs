/* PIC untuk Pusdalops dan buku kontak (paket data/kajian-bnpb/profil-bpbd/, PF-09, RENCANA-UJI UP-37 dan UP-38). Worker + D1 sungguhan (Miniflare). Jalankan: node --test tests/warga/profil_pic.test.mjs */
import assert from "node:assert/strict";
import {readdirSync, readFileSync, statSync} from "node:fs";
import path from "node:path";
import {siapkan, berantai, ADMIN, sha256} from "./_bnpb.mjs";
import {AKAR} from "./_bantu.mjs";
import {profilAktif, PROFIL_KUNCI} from "./_profil.mjs";
import "../../src/worker.js";

const uji = berantai();
const U = await siapkan("uji-profil-pic", {r2: true, ikat: {PROFIL_KUNCI}}), {api, DB, n} = U;
const ASAL = "http://bnpb.lokal", kini = Date.now(), XPB = {"x-pb": "1", origin: ASAL};
const PADANG = {provKode: "13", prov: "Sumatera Barat", kabKode: "13.71", kab: "Kota Padang", kecKode: "13.71.01", desa: "Padang Barat"};
const NOMOR = "LA-261101-31", WA_RAHASIA = "628120055501";
let nu = 0;
async function lembaga(jenis, tingkat, prov, kab) {
  nu++; const id = String(nu).padStart(16, "0");
  await DB.prepare(`INSERT INTO instansi_akun (id, username, jenis, tingkat, wilayah, kunci_wilayah, cakupan, prov, kab, garam, sandi_sha, status, nama, nip, jabatan, unit, email, wa, surat, kartu, wajib_ganti, dibuat)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'aktif', 'Petugas Uji', '19800101', 'Kasi', 'BPBD', ?, ?, 1, 1, 0, ?)`)
    .bind(id, "picuji" + nu, jenis, tingkat, kab ? `BPBD ${kab}` : `BPBD Provinsi ${prov}`, tingkat === "prov" ? prov : `${prov}|${kab}`, JSON.stringify([prov]), tingkat === "kab" ? prov : null, kab ?? null, "g".repeat(32), "0".repeat(64), `p${nu}@b.id`, `6281200088${String(nu).padStart(3, "0")}`, kini).run();
  return id;
}
const pic = async (akun, nama, wa, extra = {}) => { const p = await profilAktif(DB, akun, {baru: true, nama}); await DB.prepare("UPDATE instansi_profil SET wa = ?, terakhir_masuk = ?, status = ? WHERE id = ?").bind(wa, extra.masuk ?? null, extra.status ?? "aktif", p.id).run(); return p; };
let kab, prov, p1, p2, p3, pp, menunggu, dicabut;

uji("siapkan: BPBD Padang dan provinsi dengan PIC, laporan Padang", async () => {
  kab = await lembaga("pemkot", "kab", "13", "Kota Padang"); prov = await lembaga("pemprov", "prov", "13", null);
  p1 = await pic(kab, "Andi Saputra", WA_RAHASIA, {masuk: kini - 5 * 864e5}); p2 = await pic(kab, "Budi Hartono", "628120055502", {masuk: kini - 1000});
  pp = await pic(prov, "Sari Provinsi", "628120055503", {masuk: kini});
  menunggu = await pic(kab, "Menunggu Orang", "628120055504", {status: "menunggu"}); dicabut = await pic(kab, "Dicabut Orang", "628120055505", {status: "dicabut"});
  await DB.prepare("INSERT INTO instansi_profil_log (waktu, akun_id, profil_id, jenis, rute, objek) VALUES (?, ?, ?, 'meja', 'POST /api/lapor/meja/x/lihat', ?)").bind(kini + 5, kab, p1.id, "LA-000000-00").run();   // p1 terakhir aktif di meja
  const kerja = {tingkat: "bpbd", isian: {lokasi: {nilai: {lat: -0.9, lon: 100.35, wilayah: PADANG}}, jenis: {nilai: "banjir"}}, transkrip: []};
  await DB.batch([DB.prepare(`INSERT INTO lapor_sesi (id, wa, status, tingkat, jenis, kab, lat, lon, nomor, token_sha, terkirim, kerja, ringkas, rev, dibuat, diubah) VALUES ('sesi-pic-31', '628120066001', 'terkirim', 'bpbd', 'banjir', '13.71', -0.9, 100.35, ?, ?, ?, ?, ?, 0, ?, ?)`)
    .bind(NOMOR, sha256(NOMOR), kini, JSON.stringify(kerja), JSON.stringify({wilayah: PADANG}), kini, kini), DB.prepare("INSERT INTO lapor_tiket (nomor, sesi, status, diubah) VALUES (?, 'sesi-pic-31', 'baru', ?)").bind(NOMOR, kini)]);
});

uji("UP-37 PIC di meja: hanya BNPB; urutan terakhir aktif lalu kab sebelum provinsi; menunggu, draf, dicabut tidak muncul; nomor tersamar; POST memberi nomor penuh dan menulis lapor_akses", async () => {
  const r = await api("GET", `/api/lapor/meja/${NOMOR}/pic`, undefined, ADMIN); assert.equal(r.s, 200, r.t);
  assert.deepEqual(r.j.pic.map(x => x.nama), ["Andi Saputra", "Budi Hartono", "Sari Provinsi"], "kab dulu (yang terakhir aktif di meja lebih dulu), provinsi sesudahnya");
  assert.ok(!r.t.includes(WA_RAHASIA) && !/nip|email/i.test(r.t), "tersamar, tanpa NIP dan email"); assert.match(r.j.pic[0].wa_samar, /^x+5501$/); assert.equal(r.j.kontak_situs, undefined);
  const bpbd = await profilAktif(DB, kab); assert.equal((await api("GET", `/api/lapor/meja/${NOMOR}/pic`, undefined, {cookie: bpbd.cookie, ...XPB})).s, 403, "BPBD");
  assert.equal((await api("GET", `/api/lapor/meja/${NOMOR}/pic`, undefined, {})).s, 403, "tamu");
  const sebelum = await n("lapor_akses", `nomor = '${NOMOR}'`);
  const buka = await api("POST", `/api/lapor/meja/${NOMOR}/pic`, {profil_id: p1.id}, {...ADMIN, ...XPB}); assert.equal(buka.s, 200, buka.t); assert.equal(buka.j.wa, WA_RAHASIA);
  assert.equal(await n("lapor_akses", `nomor = '${NOMOR}'`), sebelum + 1); assert.match((await DB.prepare("SELECT oleh FROM lapor_akses WHERE nomor = ? ORDER BY id DESC").bind(NOMOR).first()).oleh, /membuka nomor PIC Andi Saputra/);
  assert.equal((await api("POST", `/api/lapor/meja/${NOMOR}/pic`, {profil_id: menunggu.id}, {...ADMIN, ...XPB})).s, 404, "profil menunggu di luar daftar");
  assert.equal((await api("POST", `/api/lapor/meja/${NOMOR}/pic`, {profil_id: "1".repeat(16)}, {...ADMIN, ...XPB})).s, 404);
  assert.equal((await api("POST", `/api/lapor/meja/${NOMOR}/pic`, {profil_id: p1.id}, {cookie: bpbd.cookie, ...XPB})).s, 403);
});

uji("UP-37 kab tanpa PIC aktif mengembalikan kontak situs bertanda 'situs resmi'; akun non-pemda tidak dihitung", async () => {
  await DB.prepare("UPDATE instansi_profil SET status = 'dicabut' WHERE akun_id = ?").bind(kab).run();
  const r = await api("GET", `/api/lapor/meja/${NOMOR}/pic`, undefined, ADMIN); assert.equal(r.s, 200, r.t);
  assert.deepEqual(r.j.pic.map(x => x.nama), ["Sari Provinsi"]); assert.equal(r.j.kontak_situs.sumber, "situs resmi");
  await DB.prepare("UPDATE instansi_profil SET status = 'aktif' WHERE id IN (?, ?)").bind(p1.id, p2.id).run();
});

uji("UP-38 buku kontak: hanya admin, nomor tersamar; jawaban pelapor tidak berubah dan tanpa nomor PIC; berkas public tanpa nomor PIC", async () => {
  const r = await api("GET", "/api/kontak/admin/pic?prov=13&kab=Kota%20Padang", undefined, ADMIN); assert.equal(r.s, 200, r.t);
  assert.deepEqual(r.j.pic.map(x => x.nama).sort(), ["Andi Saputra", "Budi Hartono"]); assert.ok(!r.t.includes(WA_RAHASIA));
  assert.deepEqual((await api("GET", "/api/kontak/admin/pic?prov=13", undefined, ADMIN)).j.pic.map(x => x.nama), ["Sari Provinsi"]);
  assert.equal((await api("GET", "/api/kontak/admin/pic?prov=13&kab=Kota%20Padang", undefined, {})).s, 403); assert.equal((await api("GET", "/api/kontak/admin/pic?prov=ab", undefined, ADMIN)).s, 400);
  const bpbd = await profilAktif(DB, kab); assert.equal((await api("GET", "/api/kontak/admin/pic?prov=13", undefined, {cookie: bpbd.cookie})).s, 403);
  for (const f of ["src/lapor_kontak.js", "src/lapor_info.js"]) assert.ok(!/pfPic|instansi_profil/.test(readFileSync(path.join(AKAR, f), "utf8")), `${f} tidak memakai PIC`);
  const pindai = d => readdirSync(d).flatMap(x => { const f = path.join(d, x); return statSync(f).isDirectory() ? pindai(f) : /\.(json|js|html)$/.test(x) ? [f] : []; });
  for (const f of pindai(path.join(AKAR, "public/data"))) assert.ok(!readFileSync(f, "utf8").includes(WA_RAHASIA), f);
});

uji("laporan tanpa wilayah.provKode: daftar PIC kosong (bukan 500), kontak situs tetap diberikan", async () => {
  const kerja = {tingkat: "bpbd", isian: {jenis: {nilai: "banjir"}}, transkrip: []}, nomor = "LA-261101-32";
  await DB.batch([DB.prepare(`INSERT INTO lapor_sesi (id, wa, status, tingkat, jenis, kab, lat, lon, nomor, token_sha, terkirim, kerja, ringkas, rev, dibuat, diubah) VALUES ('sesi-pic-32', '628120066002', 'terkirim', 'bpbd', 'banjir', NULL, NULL, NULL, ?, ?, ?, ?, '{}', 0, ?, ?)`)
    .bind(nomor, sha256(nomor), kini, JSON.stringify(kerja), kini, kini), DB.prepare("INSERT INTO lapor_tiket (nomor, sesi, status, diubah) VALUES (?, 'sesi-pic-32', 'baru', ?)").bind(nomor, kini)]);
  const r = await api("GET", `/api/lapor/meja/${nomor}/pic`, undefined, ADMIN); assert.equal(r.s, 200, r.t); assert.deepEqual(r.j.pic, []);
  assert.equal((await api("POST", `/api/lapor/meja/${nomor}/pic`, {profil_id: p1.id}, {...ADMIN, ...XPB})).s, 404);
});
