/* LJ-03: pembukaan berkas data lanjutan dan rute baca (src/lapor_lanjut.js, migrasi 0161; paket data/kajian-bnpb/lapor-lanjutan, RENCANA-UJI bagian 2).
   worker.js utuh di workerd (Miniflare), D1 sungguhan dengan migrasi apa adanya, tanpa mock. Tiket terkirim disisipkan langsung (alur percakapan BPBD
   diuji di tests/lapor/rute.test.mjs); bukaBerkas dipanggil dengan D1 yang sama, persis yang dipanggil pesan() sesudah tiket terkirim.
   Nomor WA rekaan, bukan nomor pemilik. Jalan: node --test tests/lapor/lanjut_rute.test.mjs */
import assert from "node:assert/strict";
import {siapkan, berantai, ADMIN, sha256} from "../warga/_bnpb.mjs";
import "../../src/worker.js";
import {bukaBerkas, samarPribadi, kabSama} from "../../src/lapor_lanjut.js";

const uji = berantai();
const U = await siapkan("uji-lapor-data", {r2: true, ikat: {WA_MESIN: "mesin-rahasia"}}), {api, DB, n} = U;
const env = {DB}, ASAL = "http://bnpb.lokal", kini = Date.now();
const KETUA = "6281299880001", KODE = "6281299880002", LUAR = "6281299880003", WARGA = "6281299880004";
const BOGOR = {provKode: "32", prov: "Jawa Barat", kabKode: "32.71", kab: "Kota Bogor", kecKode: "32.71.03", desa: "Paledang"};
const XPB = {"x-pb": "1", origin: ASAL};
let berkasId, token, kuki;

async function tiket(nomor, wa, tingkat, wilayah = BOGOR) {
  const kerja = {tingkat, isian: {lokasi: {nilai: {lat: -6.6, lon: 106.8, wilayah}}, jenis: {nilai: "banjir"}}, transkrip: []};
  await DB.batch([DB.prepare(`INSERT INTO lapor_sesi (id, wa, status, tingkat, jenis, kab, lat, lon, nomor, token_sha, terkirim, kerja, ringkas, rev, dibuat, diubah)
      VALUES (?, ?, 'terkirim', ?, 'banjir', ?, -6.6, 106.8, ?, ?, ?, ?, '{}', 0, ?, ?)`).bind("s" + nomor, wa, tingkat, wilayah.kabKode, nomor, sha256(nomor), kini, JSON.stringify(kerja), kini, kini),
    DB.prepare("INSERT INTO lapor_tiket (nomor, sesi, status, diubah) VALUES (?, ?, 'baru', ?)").bind(nomor, "s" + nomor, kini)]);
}
const izin = (wa, peran, kab) => DB.prepare("INSERT INTO lapor_izin (wa, peran, kab, oleh, dibuat) VALUES (?, ?, ?, 'uji', ?)").bind(wa, peran, kab, kini).run();
let nu = 0;
async function lembaga({jenis, tingkat, prov, kab}) {   // akun lembaga aktif + sesi /masuk lewat anggota (pola tests/lapor/rute.test.mjs)
  nu++; const id = String(nu).padStart(16, "0"), mk = "mk" + String(nu).padStart(14, "0"), tok = (String(nu).padStart(2, "0") + "8e").repeat(32).slice(0, 64), waMk = `62812002${String(nu).padStart(4, "0")}`;
  await DB.batch([DB.prepare(`INSERT INTO instansi_akun (id, username, jenis, tingkat, wilayah, kunci_wilayah, cakupan, prov, kab, garam, sandi_sha, status, nama, nip, jabatan, unit, email, wa, surat, kartu, wajib_ganti, dibuat)
      VALUES (?, ?, ?, ?, 'Wilayah uji', ?, ?, ?, ?, ?, ?, 'aktif', 'Petugas Uji', '19800101', 'Kasi', 'BPBD', ?, ?, 1, 1, 0, ?)`)
      .bind(id, "lembagadata" + nu, jenis, tingkat, kab ? `${prov}|${kab}` : prov, JSON.stringify([prov]), prov, kab ?? null, "g".repeat(32), "0".repeat(64), `data${nu}@b.id`, `62812003${String(nu).padStart(4, "0")}`, kini),
    DB.prepare("INSERT INTO mk_akun (id, wa, nama, status, dibuat) VALUES (?, ?, 'Anggota Uji', 'aktif', ?)").bind(mk, waMk, kini),
    DB.prepare("INSERT INTO mk_anggota (id, mk_id, tabel, akun_id, status, jalur, rujukan, dibuat, diubah) VALUES (?, ?, 'instansi_akun', ?, 'aktif', 'tinjau', 'uji', ?, ?)").bind("ag" + String(nu).padStart(14, "0"), mk, id, kini, kini),
    DB.prepare("INSERT INTO mk_sesi (token_sha, mk_id, kode_pada, dibuat, habis) VALUES (?, ?, ?, ?, ?)").bind(sha256(tok), mk, kini, kini, kini + 3600e3)]);
  return {cookie: `sesi_masuk=${tok}`, origin: ASAL, "x-pb": "1"};
}

uji("fungsi murni: kab izin kode atau nama; penyamaran tidak membocorkan nomor utuh", () => {
  assert.ok(kabSama("32.71", BOGOR)); assert.ok(kabSama("Kota Bogor", BOGOR)); assert.ok(!kabSama("Kab. Bogor", BOGOR)); assert.ok(!kabSama(null, BOGOR));
  const s = samarPribadi({nama: "Sari Rahmawati", hp: "6281234567890", nik: "3171010101010001", rentan: ["hamil_t1"]});
  assert.equal(s.hp, "*********7890"); assert.equal(s.nik, "************0001"); assert.equal(s.nama, "S********"); assert.equal(s.rentan, "(disembunyikan)");
});

uji("pembukaan: BPBD di kab izinnya membuka satu berkas, ketua, dan pesan pembuka bertautan; sekali saja", async () => {
  await izin(KETUA, "bpbd", "Kota Bogor"); await tiket("LA-231126-01", KETUA, "bpbd");
  const r = await bukaBerkas(env, "LA-231126-01", kini, ASAL); assert.equal(r.buka, true, JSON.stringify(r)); berkasId = r.berkas;
  const b = await DB.prepare("SELECT * FROM lj_berkas WHERE id = ?").bind(berkasId).first();
  assert.equal(b.induk, "LA-231126-01"); assert.equal(b.kab, "32.71"); assert.equal(b.status, "terbuka"); assert.equal(JSON.parse(b.isian).kab_nama, "Kota Bogor");
  const t = await DB.prepare("SELECT * FROM lj_tim WHERE berkas = ?").bind(berkasId).all();
  assert.equal(t.results.length, 1); assert.equal(t.results[0].peran, "ketua"); assert.equal(t.results[0].wa, KETUA);
  const k = await DB.prepare("SELECT * FROM lj_kabar WHERE wa = ?").bind(KETUA).all();
  assert.equal(k.results.length, 1); assert.equal(k.results[0].jenis, "pembuka");
  token = /\/lapor\/data\/\?t=([0-9a-f]{32})/.exec(k.results[0].teks)?.[1]; assert.ok(token, k.results[0].teks);
  assert.equal(sha256(token), t.results[0].token_sha, "D1 hanya menyimpan sidik token");
  assert.ok(!/Sari|NIK|\b62812\d+/.test(k.results[0].teks.replace(`?t=${token}`, "")), "pesan pembuka tanpa data orang");
  const ulang = await bukaBerkas(env, "LA-231126-01", kini, ASAL); assert.equal(ulang.buka, false); assert.equal(ulang.sebab, "sudah_ada");
  assert.equal(await n("lj_berkas"), 1); assert.equal(await n("lj_kabar"), 1);
});

uji("pembukaan: laporan kedua sekelompok KJ di kab sama tidak membuat berkas kedua; izin berkode juga cocok", async () => {
  await izin(KODE, "bpbd", "32.71"); await tiket("LA-231126-02", KODE, "bpbd");
  await DB.batch([DB.prepare("INSERT INTO lapor_kelompok (nomor, kode, induk, dibuat) VALUES ('LA-231126-01', 'KJ-231126-01', NULL, ?)").bind(kini),
    DB.prepare("INSERT INTO lapor_kelompok (nomor, kode, induk, dibuat) VALUES ('LA-231126-02', 'KJ-231126-01', 'LA-231126-01', ?)").bind(kini)]);
  const r = await bukaBerkas(env, "LA-231126-02", kini, ASAL); assert.equal(r.sebab, "sudah_ada"); assert.equal(r.berkas, berkasId);
  assert.equal(await n("lj_tim"), 1, "pelapor kedua tidak menjadi ketua (gabung tim lewat LJ-09)");
});

uji("pembukaan ditolak: warga, BPBD di luar kab izinnya (D1), klaim tanpa izin", async () => {
  await tiket("LA-231126-03", WARGA, "warga"); assert.equal((await bukaBerkas(env, "LA-231126-03", kini, ASAL)).sebab, "bukan_bpbd");
  await izin(LUAR, "bpbd", "Kota Bandung"); await tiket("LA-231126-04", LUAR, "bpbd");
  assert.equal((await bukaBerkas(env, "LA-231126-04", kini, ASAL)).sebab, "luar_kab");
  await tiket("LA-231126-05", "6281299880005", "bpbd"); assert.equal((await bukaBerkas(env, "LA-231126-05", kini, ASAL)).sebab, "izin");
  assert.equal(await n("lj_berkas"), 1);
});

uji("masuk: token sekali pakai ditukar kuki HttpOnly; tanpa x-pb, token salah, dan pakai ulang ditolak", async () => {
  assert.equal((await api("POST", "/api/lapor/data/masuk", {t: token}, {origin: ASAL})).s, 403, "tanpa x-pb");
  assert.equal((await api("POST", "/api/lapor/data/masuk", {t: "zz"}, XPB)).s, 400);
  assert.equal((await api("POST", "/api/lapor/data/masuk", {t: "0".repeat(32)}, XPB)).s, 403);
  const r = await api("POST", "/api/lapor/data/masuk", {t: token}, XPB); assert.equal(r.s, 200, r.t);
  assert.equal(r.j.berkas, berkasId); assert.equal(r.j.peran, "ketua");
  const sc = r.h.get("set-cookie"); assert.match(sc, /^lapor_data=[0-9a-f]{64};/); assert.match(sc, /HttpOnly/); assert.match(sc, /Path=\/api\/lapor\/data/); assert.match(sc, /SameSite=Lax/);
  assert.equal(r.h.get("cache-control"), "private, no-store");
  kuki = sc.split(";")[0];
  assert.equal((await api("POST", "/api/lapor/data/masuk", {t: token}, XPB)).s, 403, "token tautan hanya sekali pakai");
});

uji("berkas untuk tim: data pribadi utuh, nomor tim utuh, tiap buka tercatat", async () => {
  await DB.prepare(`INSERT INTO lj_objek (id, berkas, jenis, urut, data, pribadi, oleh, dibuat, diubah) VALUES ('${"a".repeat(16)}', ?, 'jiwa', 1, ?, ?, 'uji', ?, ?)`)
    .bind(berkasId, JSON.stringify({titik: "TP-AAAA1111", umur: 30, jk: "p", desa_asal: "Paledang", masuk: "2026-11-01", kk: "diri"}), JSON.stringify({nama: "Sari Rahmawati", hp: "6281234567890"}), kini, kini).run();
  const sebelum = await n("lj_akses");
  const r = await api("GET", "/api/lapor/data/berkas", undefined, {cookie: kuki}); assert.equal(r.s, 200, r.t);
  assert.equal(r.j.objek[0].pribadi.hp, "6281234567890"); assert.equal(r.j.tim[0].wa, KETUA); assert.equal(r.j.saya.peran, "ketua");
  assert.equal(r.j.rekap.mengungsi, 1, "rekap dihitung dari daftar (spek LJ-02) dengan tanggal hari ini");
  assert.equal(await n("lj_akses"), sebelum + 1);
});

uji("tanpa kuki atau sesi: 401 tanpa data; kuki kedaluwarsa dan anggota dicabut ditolak", async () => {
  const r = await api("GET", "/api/lapor/data/berkas"); assert.equal(r.s, 401); assert.ok(!/Sari|6281234567890/.test(r.t));
  await DB.prepare("UPDATE lj_tim SET kedaluwarsa = ? WHERE berkas = ?").bind(kini - 1, berkasId).run();
  assert.equal((await api("GET", "/api/lapor/data/berkas", undefined, {cookie: kuki})).s, 401);
  await DB.prepare("UPDATE lj_tim SET kedaluwarsa = ?, dicabut = ? WHERE berkas = ?").bind(kini + 864e5, kini, berkasId).run();
  assert.equal((await api("GET", "/api/lapor/data/berkas", undefined, {cookie: kuki})).s, 401);
  await DB.prepare("UPDATE lj_tim SET dicabut = NULL WHERE berkas = ?").bind(berkasId).run();
});

uji("staf BNPB: pribadi dan nomor tim tersamar; Tampilkan memberi utuh dan tercatat; daftar tanpa data pribadi", async () => {
  const r = await api("GET", `/api/lapor/data/berkas?id=${berkasId}`, undefined, ADMIN); assert.equal(r.s, 200, r.t);
  assert.ok(!/6281234567890|Sari Rahmawati|6281299880001/.test(r.t), "tidak ada nomor atau nama utuh"); assert.equal(r.j.objek[0].pribadi.hp, "*********7890");
  assert.equal((await api("GET", "/api/lapor/data/berkas?id=xx", undefined, ADMIN)).s, 400);
  assert.equal((await api("GET", `/api/lapor/data/berkas?id=${"f".repeat(16)}`, undefined, ADMIN)).s, 404);
  const t = await api("POST", "/api/lapor/data/tampil", {objek: "a".repeat(16)}, ADMIN); assert.equal(t.s, 200, t.t);
  assert.equal(t.j.pribadi.hp, "6281234567890");
  assert.equal(await n("lj_akses", "aksi = 'tampil_pribadi'"), 1);
  const d = await api("GET", "/api/lapor/data/daftar", undefined, ADMIN); assert.equal(d.s, 200);
  assert.equal(d.j.berkas.length, 1); assert.equal(d.j.berkas[0].objek.jiwa, 1); assert.ok(!/pribadi|Sari|6281/.test(d.t));
  assert.equal((await api("GET", "/api/lapor/data/daftar")).s, 401);
  assert.equal((await api("POST", "/api/lapor/data/tampil", {objek: "a".repeat(16)}, {cookie: kuki})).s, 403, "tim memakai rute berkas; Tampilkan hanya staf BNPB");
});

uji("akun lembaga (Q15): kab sendiri tersamar, kab lain 404 dan tidak di daftar, provinsi rekap saja, Tampilkan ditolak", async () => {
  const bogor = await lembaga({jenis: "pemkot", tingkat: "kab", prov: "32", kab: "Kota Bogor"});
  const bandung = await lembaga({jenis: "pemkot", tingkat: "kab", prov: "32", kab: "Kota Bandung"});
  const jabar = await lembaga({jenis: "pemprov", tingkat: "prov", prov: "32"}), dki = await lembaga({jenis: "pemprov", tingkat: "prov", prov: "31"});
  const a = await api("GET", `/api/lapor/data/berkas?id=${berkasId}`, undefined, bogor); assert.equal(a.s, 200, a.t);
  assert.equal(a.j.objek[0].pribadi.hp, "*********7890"); assert.ok(!/6281234567890/.test(a.t));
  assert.equal((await api("GET", `/api/lapor/data/berkas?id=${berkasId}`, undefined, bandung)).s, 404);
  assert.deepEqual((await api("GET", "/api/lapor/data/daftar", undefined, bandung)).j.berkas, []);
  const p = await api("GET", `/api/lapor/data/berkas?id=${berkasId}`, undefined, jabar); assert.equal(p.s, 200);
  assert.equal(p.j.objek, undefined); assert.equal(p.j.tim, undefined); assert.equal(p.j.rekap.mengungsi, 1);
  assert.equal((await api("GET", `/api/lapor/data/berkas?id=${berkasId}`, undefined, dki)).s, 404);
  assert.equal((await api("POST", "/api/lapor/data/tampil", {objek: "a".repeat(16)}, bogor)).s, 403);
});

uji("staf Koordalops tidak membuka berkas data lanjutan (Q15: hanya admin dan Pusdalops); Pusdalops bisa", async () => {
  const sesi = async (id, peran) => { const tok = (id.slice(0, 2) + "7d").repeat(32).slice(0, 64);
    await DB.batch([DB.prepare(`INSERT INTO staf (id, username, nama, nip, unit, email, wa, peran, wilayah, garam, sandi_sha, wajib_ganti, dibuat, dibuat_oleh, dummy)
      VALUES (?, ?, 'Nama', ?, 'Unit', ?, ?, ?, '[]', 'gggggggggggggggggggggggggggggggg', ?, 0, 1, 'tes', 0)`).bind(id, "uji" + id.slice(0, 6), "200" + id.slice(0, 4), id.slice(0, 4) + "@b.id", "6281200" + id.slice(0, 5), JSON.stringify([peran]), "a".repeat(64)),
      DB.prepare("INSERT INTO staf_sesi (token_sha, staf_id, dibuat, kedaluwarsa) VALUES (?, ?, 1, ?)").bind(sha256(tok), id, Date.now() + 3600e3)]);
    return {cookie: `sesi_staf=${tok}`, origin: ASAL, "x-pb": "1"}; };
  const koord = await sesi("11111a1a1a1a1a1a", "koordalops"), pusdal = await sesi("22222b2b2b2b2b2b", "pusdalops");
  assert.equal((await api("GET", `/api/lapor/data/berkas?id=${berkasId}`, undefined, koord)).s, 401);
  assert.equal((await api("POST", "/api/lapor/data/tampil", {objek: "a".repeat(16)}, koord)).s, 403);
  const p = await api("GET", `/api/lapor/data/berkas?id=${berkasId}`, undefined, pusdal); assert.equal(p.s, 200, p.t); assert.ok(!/6281234567890/.test(p.t));
});

uji("batas laju: Tampilkan paling banyak 60 per jam per IP", async () => {
  await DB.prepare("DELETE FROM laju_bnpb").run();
  let s = 0; for (let i = 0; i < 61; i++) s = (await api("POST", "/api/lapor/data/tampil", {objek: "a".repeat(16)}, ADMIN)).s;
  assert.equal(s, 429);
});
