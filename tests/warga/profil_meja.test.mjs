/* Meja Lapor Bencana dan pintu /masuk untuk akun BPBD dengan profil PIC (paket data/kajian-bnpb/profil-bpbd/, PF-04, RENCANA-UJI UP-21 dan UP-22).
   Profil aktif disiapkan lewat sisipan D1 langsung (tests/warga/_profil.mjs), tanpa alur kirim dan setuju. Jalankan: node --test tests/warga/profil_meja.test.mjs */
import assert from "node:assert/strict";
import {siapkan, berantai, ADMIN, sha256} from "./_bnpb.mjs";
import {profilAktif, PROFIL_KUNCI} from "./_profil.mjs";
import "../../src/worker.js";

const uji = berantai();
const U = await siapkan("uji-profil-meja", {r2: true, ikat: {PROFIL_KUNCI}}), {api, DB, n} = U;
const ASAL = "http://bnpb.lokal", kini = Date.now(), XPB = {"x-pb": "1", origin: ASAL};
const SUMBAR = {provKode: "13", prov: "Sumatera Barat", kabKode: "13.71", kab: "Kota Padang", kecKode: "13.71.01", desa: "Padang Barat"};
const JABAR = {provKode: "32", prov: "Jawa Barat", kabKode: "32.71", kab: "Kota Bogor", kecKode: "32.71.03", desa: "Paledang"};
let nu = 0;
async function lembaga({jenis, tingkat, prov, kab, wa = null}) {
  nu++; const id = String(nu).padStart(16, "0");
  await DB.prepare(`INSERT INTO instansi_akun (id, username, jenis, tingkat, wilayah, kunci_wilayah, cakupan, prov, kab, garam, sandi_sha, status, nama, nip, jabatan, unit, email, wa, surat, kartu, wajib_ganti, dibuat)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'aktif', 'Petugas Uji', '19800101', 'Kasi', 'BPBD', ?, ?, 1, 1, 0, ?)`)
    .bind(id, "profilmeja" + nu, jenis, tingkat, `BPBD uji ${nu}`, kab ? `${prov}|${kab}` : prov, JSON.stringify([prov]), prov, kab ?? null, "g".repeat(32), "0".repeat(64), `lembaga${nu}@b.id`, wa ?? `62812009${String(nu).padStart(4, "0")}`, kini).run();
  return {id};
}
async function tiket(nomor, wilayah, wa) {
  const kerja = {tingkat: "bpbd", isian: {lokasi: {nilai: {lat: -0.9, lon: 100.35, wilayah}}, jenis: {nilai: "banjir"}}, transkrip: []};
  await DB.batch([DB.prepare(`INSERT INTO lapor_sesi (id, wa, status, tingkat, jenis, kab, lat, lon, nomor, token_sha, terkirim, kerja, ringkas, rev, dibuat, diubah)
      VALUES (?, ?, 'terkirim', 'bpbd', 'banjir', ?, -0.9, 100.35, ?, ?, ?, ?, ?, 0, ?, ?)`).bind("s" + nomor, wa, wilayah.kabKode, nomor, sha256(nomor), kini, JSON.stringify(kerja), JSON.stringify({wilayah}), kini, kini),
    DB.prepare("INSERT INTO lapor_tiket (nomor, sesi, status, diubah) VALUES (?, ?, 'baru', ?)").bind(nomor, "s" + nomor, kini)]);
}
const pakai = (p, tambah = {}) => ({cookie: p.cookie, ...XPB, ...tambah});
let sumbar, bogor, jabar, padang, tamuMasuk;

uji("siapkan: dua tiket (Sumatera Barat dan Jawa Barat), akun lembaga pemda dengan profil aktif", async () => {
  await tiket("LA-261101-01", SUMBAR, "6281200100001"); await tiket("LA-261101-02", JABAR, "6281200100002");
  const a = await lembaga({jenis: "pemprov", tingkat: "prov", prov: "13", wa: "6281200100010"});
  sumbar = {...a, p: await profilAktif(DB, a.id, {nama: "Rina Putri"})};
  const b = await lembaga({jenis: "pemkot", tingkat: "kab", prov: "32", kab: "Kota Bogor"}); bogor = {...b, p: await profilAktif(DB, b.id, {nama: "Budi Santoso"})};
  const c = await lembaga({jenis: "pemprov", tingkat: "prov", prov: "32"}); jabar = {...c, p: await profilAktif(DB, c.id)};
  const d = await lembaga({jenis: "pemkot", tingkat: "kab", prov: "13", kab: "Kota Padang"}); padang = {...d, p: await profilAktif(DB, d.id)};
});

uji("UP-21 meja: sesi profil pemprov Sumatera Barat melihat provinsinya saja; pemkot hanya kotanya; pelaku memuat lembaga dan nama profil", async () => {
  for (const [akun, nomorAda, nomorTak, label] of [[sumbar, "LA-261101-01", "LA-261101-02", /BPBD/], [bogor, "LA-261101-02", "LA-261101-01", /BPBD/], [jabar, "LA-261101-02", "LA-261101-01", /BPBD/], [padang, "LA-261101-01", "LA-261101-02", /BPBD/]]) {
    const d = await api("GET", "/api/lapor/meja", undefined, pakai(akun.p)); assert.equal(d.s, 200, d.t.slice(0, 200));
    assert.equal(d.j.akun.jenis, "bpbd"); assert.match(d.j.akun.label, label);
    const ada = d.j.baris.map(x => x.nomor); assert.ok(ada.includes(nomorAda), `${akun.id}: ${nomorAda}`); assert.ok(!ada.includes(nomorTak), `${akun.id}: ${nomorTak} di luar wilayah`);
    assert.equal((await api("GET", `/api/lapor/meja/${nomorTak}`, undefined, pakai(akun.p))).s, 404);
  }
  const balas = await api("POST", "/api/lapor/meja/LA-261101-01/balas", {teks: "Tim BPBD menuju lokasi."}, pakai(sumbar.p)); assert.equal(balas.s, 200, balas.t.slice(0, 300));
  const pelaku = await DB.prepare("SELECT oleh FROM lapor_balasan WHERE nomor = 'LA-261101-01' ORDER BY id DESC").first();
  assert.match(pelaku.oleh, /^BPBD .*Rina Putri$/, "pelaku = lembaga + nama profil");
  assert.equal((await n("instansi_profil_log", `profil_id = '${sumbar.p.id}' AND jenis = 'meja'`)), 1, "satu baris log meja per tindakan, bukan per bacaan");
  const log = await DB.prepare("SELECT rute, objek, oleh, ip FROM instansi_profil_log WHERE profil_id = ? AND jenis = 'meja'").bind(sumbar.p.id).first();
  assert.equal(log.rute, "POST /api/lapor/meja/LA-261101-01/balas".replace("LA-261101-01", "LA-261101-01")); assert.ok(!JSON.stringify(log).includes("Tim BPBD"), "isi pesan tidak masuk log");
});

uji("meja: akun pemprov hasil buat massal lama (kolom prov kosong, hanya cakupan) tetap melihat provinsinya", async () => {
  await DB.prepare("UPDATE instansi_akun SET prov = NULL WHERE id = ?").bind(sumbar.id).run();   // bentuk baris buatMassal sebelum 23 Nov 2026
  try {
    const d = await api("GET", "/api/lapor/meja", undefined, pakai(sumbar.p)); assert.equal(d.s, 200, d.t.slice(0, 200));
    assert.ok(d.j.baris.some(x => x.nomor === "LA-261101-01")); assert.ok(!d.j.baris.some(x => x.nomor === "LA-261101-02"));
  } finally { await DB.prepare("UPDATE instansi_akun SET prov = '13' WHERE id = ?").bind(sumbar.id).run(); }
});

uji("UP-21 meja: tanpa sesi profil 403; sesi /masuk dengan nomor akun pemda tidak membuka meja; staf BNPB tetap penuh; x-pb wajib untuk non-GET", async () => {
  assert.equal((await api("GET", "/api/lapor/meja", undefined, {})).s, 403);
  const tok = "ab".repeat(32), mk = "mk00000000000001";
  await DB.batch([DB.prepare("INSERT INTO mk_akun (id, wa, nama, status, dibuat) VALUES (?, ?, 'Pemilik Nomor', 'aktif', ?)").bind(mk, "6281200100010", kini),
    DB.prepare("INSERT INTO mk_sesi (token_sha, mk_id, kode_pada, dibuat, habis) VALUES (?, ?, ?, ?, ?)").bind(sha256(tok), mk, kini, kini, kini + 3600e3)]);
  assert.equal((await api("GET", "/api/lapor/meja", undefined, {cookie: `sesi_masuk=${tok}`})).s, 403, "nomor sama dengan instansi_akun.wa pemda, tetap tidak membuka meja");
  await DB.prepare("INSERT INTO mk_anggota (id, mk_id, tabel, akun_id, status, jalur, rujukan, dibuat, diubah) VALUES ('ag00000000000001', ?, 'instansi_akun', ?, 'aktif', 'tinjau', 'uji', ?, ?)").bind(mk, sumbar.id, kini, kini).run();
  assert.equal((await api("GET", "/api/lapor/meja", undefined, {cookie: `sesi_masuk=${tok}`})).s, 403, "anggota mk_anggota pemda tidak membuka meja");
  const bnpb = await api("GET", "/api/lapor/meja", undefined, ADMIN); assert.equal(bnpb.s, 200); assert.equal(bnpb.j.akun.jenis, "bnpb");
  assert.ok(bnpb.j.baris.length >= 2, "staf BNPB melihat semua");
  const tanpaPb = {cookie: sumbar.p.cookie, origin: ASAL};
  assert.equal((await api("POST", "/api/lapor/meja/LA-261101-01/lihat", {}, tanpaPb)).s, 403, "POST bersesi wajib x-pb");
  assert.equal((await api("POST", "/api/lapor/meja/LA-261101-01/lihat", {}, {cookie: sumbar.p.cookie, "x-pb": "1", origin: "https://jahat.example"})).s, 403);
  assert.equal((await api("POST", "/api/lapor/meja/LA-261101-01/lihat", {}, pakai(sumbar.p))).s, 200);
});

uji("UP-21 meja: sesi profil dengan pin_wajib_ganti 403 di semua rute meja; profil dicabut atau akun dicabut menutup meja seketika", async () => {
  const x = await lembaga({jenis: "pemprov", tingkat: "prov", prov: "14"}), p = await profilAktif(DB, x.id, {wajibGanti: 1});
  const d = await api("GET", "/api/lapor/meja", undefined, pakai(p)); assert.equal(d.s, 403); assert.equal(d.j.pin_wajib_ganti, true);
  assert.equal((await api("POST", "/api/lapor/meja/LA-261101-01/lihat", {}, pakai(p))).s, 403);
  const y = await lembaga({jenis: "pemprov", tingkat: "prov", prov: "15"}), q = await profilAktif(DB, y.id);
  assert.equal((await api("GET", "/api/lapor/meja", undefined, pakai(q))).s, 200);
  await DB.prepare("UPDATE instansi_profil SET status = 'dicabut' WHERE id = ?").bind(q.id).run();
  assert.equal((await api("GET", "/api/lapor/meja", undefined, pakai(q))).s, 403, "profil dicabut");
  const r = await profilAktif(DB, y.id, {baru: true}); assert.equal((await api("GET", "/api/lapor/meja", undefined, pakai(r))).s, 200);
  await DB.prepare("UPDATE instansi_akun SET status = 'dicabut', alasan = 'uji' WHERE id = ?").bind(y.id).run();
  assert.equal((await api("GET", "/api/lapor/meja", undefined, pakai(r))).s, 403, "akun dicabut");
});

uji("UP-22 /masuk: nomor yang cocok dengan akun pemda tidak menghasilkan ruang atau sesi instansi; polda tetap; undangan dan permohonan ke akun pemda ditolak", async () => {
  const waPemda = "6281200100020", waPolda = "6281200100021";
  const pm = await lembaga({jenis: "pemkab", tingkat: "kab", prov: "13", kab: "Padang Pariaman", wa: waPemda});
  const pl = await lembaga({jenis: "polda", tingkat: "prov", prov: "13", wa: waPolda});
  const {mkRuangPeran, mkSesiPeran, mkAkunSaya} = await import("../../src/hak.js"), env = {DB};
  const ruang = await mkRuangPeran(env, waPemda, 5); assert.equal(ruang.instansi.length, 0, "pemda bukan ruang /masuk");
  assert.deepEqual((await mkRuangPeran(env, waPolda, 5)).instansi.map(x => x.id), [pl.id], "polda tidak berubah (tanpa regresi)");
  assert.equal(await mkSesiPeran(env, "instansi", pm.id, "e".repeat(64), kini, kini + 36e5), false, "tidak ada sesi instansi untuk pemda lewat pintu kode");
  assert.equal(await mkSesiPeran(env, "instansi", pl.id, "f".repeat(64), kini, kini + 36e5), true);
  assert.equal(await n("instansi_sesi", `akun_id = '${pm.id}'`), 0);
  assert.deepEqual((await mkAkunSaya(env, "mk-tak-ada", waPemda, 5)).map(x => x.id), [], "atur sandi lewat kode tidak untuk pemda");
  const tok = "cd".repeat(32), mk = "mk00000000000002";
  await DB.batch([DB.prepare("INSERT INTO mk_akun (id, wa, nama, status, dibuat) VALUES (?, ?, 'Calon', 'aktif', ?)").bind(mk, "6281200100030", kini),
    DB.prepare("INSERT INTO mk_sesi (token_sha, mk_id, kode_pada, dibuat, habis) VALUES (?, ?, ?, ?, ?)").bind(sha256(tok), mk, kini, kini, kini + 3600e3)]);
  const H = {cookie: `sesi_masuk=${tok}`, origin: ASAL, "x-pb": "1", "content-type": "application/json"};
  const mohon = await api("POST", "/api/masuk/mohon", {jenis: "instansi", akun_id: pm.id}, H); assert.equal(mohon.s, 403, mohon.t); assert.match(mohon.j.galat, /\/instansi/);
  const undang = await api("POST", "/api/masuk/undang", {ke: "instansi", akun_id: pm.id, wa: "081200100031"}, {...H, ...ADMIN});
  assert.ok([409, 400, 403].includes(undang.s), "undangan ke akun pemda ditolak: " + undang.t);
  assert.equal(await n("mk_undang", `akun_id = '${pm.id}'`), 0);
});
