/* LJ-03: pembukaan berkas data lanjutan dan rute baca (src/lapor_lanjut.js, migrasi 0161; paket data/kajian-bnpb/lapor-lanjutan, RENCANA-UJI bagian 2).
   worker.js utuh di workerd (Miniflare), D1 sungguhan dengan migrasi apa adanya, tanpa mock. Tiket terkirim disisipkan langsung (alur percakapan BPBD
   diuji di tests/lapor/rute.test.mjs); bukaBerkas dipanggil dengan D1 yang sama, persis yang dipanggil pesan() sesudah tiket terkirim.
   Nomor WA rekaan, bukan nomor pemilik. Jalan: node --test tests/lapor/lanjut_rute.test.mjs */
import assert from "node:assert/strict";
import {siapkan, berantai, ADMIN, sha256} from "../warga/_bnpb.mjs";
import {JPEG_SAH} from "../warga/_bantu.mjs";
import {profilAktif} from "../warga/_profil.mjs";
import "../../src/worker.js";
import * as H from "../../src/hak.js";
import {bukaBerkas, samarPribadi, kabSama, bersihSesiLanjut} from "../../src/lapor_lanjut.js";

const uji = berantai();
const U = await siapkan("uji-lapor-data", {r2: true, ikat: {WA_MESIN: "mesin-rahasia"}}), {api, DB, n} = U;
const env = {DB}, ASAL = "http://bnpb.lokal", kini = Date.now();
const KETUA = "6281299880001", KODE = "6281299880002", LUAR = "6281299880003", WARGA = "6281299880004";
const BOGOR = {provKode: "32", prov: "Jawa Barat", kabKode: "32.71", kab: "Kota Bogor", kecKode: "32.71.03", desa: "Paledang"};
const XPB = {"x-pb": "1", origin: ASAL};
let berkasId, token, kuki, akunBogor, akunJabar;

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
  if (["pemkab", "pemkot", "pemprov"].includes(jenis)) return {cookie: (await profilAktif(DB, id)).cookie, origin: ASAL, "x-pb": "1"};   // akun BPBD: sesi profil (paket profil-bpbd), bukan sesi /masuk
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
  const bogor = akunBogor = await lembaga({jenis: "pemkot", tingkat: "kab", prov: "32", kab: "Kota Bogor"});
  const bandung = await lembaga({jenis: "pemkot", tingkat: "kab", prov: "32", kab: "Kota Bandung"});
  const jabar = akunJabar = await lembaga({jenis: "pemprov", tingkat: "prov", prov: "32"}), dki = await lembaga({jenis: "pemprov", tingkat: "prov", prov: "31"});
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

/* ---------- LJ-04: objek rumah dan prasarana, rev, klien_id, batal, foto, media ---------- */
const RUMAH = {kk: "Budi Santoso", desa: "Paledang", kec: "Bogor Tengah", alamat: "RT 01 RW 02", tingkat: "rb", terendam: false, huni: "mengungsi", jiwa: 4};
const tulis = (b, h = {cookie: kuki, ...XPB}) => api("POST", "/api/lapor/data/objek", b, h);
let rumahId, rumahRev;

uji("objek: penjaga x-pb, kuki, jenis yang belum dibuka, isian wajib", async () => {
  await DB.prepare("DELETE FROM laju_bnpb").run();
  assert.equal((await tulis({jenis: "rumah", isian: RUMAH}, {cookie: kuki, origin: ASAL})).s, 403, "tanpa x-pb");
  assert.equal((await tulis({jenis: "rumah", isian: RUMAH}, XPB)).s, 401, "tanpa kuki");
  assert.equal((await tulis({jenis: "korban", isian: {}})).s, 400, "korban menyusul di LJ-07");
  const r = await tulis({jenis: "rumah", isian: {desa: "Paledang"}}); assert.equal(r.s, 400); assert.ok(r.j.isian.includes("kk") && r.j.isian.includes("tingkat"));
});

uji("objek rumah: tersimpan urut 1, pribadi terpisah, penanda dan kurang foto; klien_id ulang mengembalikan objek yang sama", async () => {
  const r = await tulis({jenis: "rumah", isian: RUMAH, klien_id: "luring-0001"}); assert.equal(r.s, 201, r.t);
  const o = r.j.objek; rumahId = o.id; rumahRev = o.rev;
  assert.equal(o.urut, 1); assert.equal(o.pribadi.kk, "Budi Santoso"); assert.equal(o.data.kk, undefined); assert.equal(o.data.tingkat, "rb");
  assert.deepEqual(o.penanda, ["tanpa_titik"]); assert.deepEqual(o.kurang_foto, {foto: 2, wajah: 0});
  const u = await tulis({jenis: "rumah", isian: RUMAH, klien_id: "luring-0001"}); assert.equal(u.s, 200); assert.equal(u.j.objek.id, rumahId); assert.equal(u.j.ulang, true);
  assert.equal(await n("lj_objek", "jenis = 'rumah' AND status = 'aktif'"), 1);
  const j = await DB.prepare("SELECT sebelum, sesudah, pribadi_sidik FROM lj_jejak WHERE objek = ?").bind(rumahId).first();
  assert.ok(!/Budi/.test(JSON.stringify(j)), "jejak tanpa isian pribadi terbaca"); assert.match(j.pribadi_sidik, /^[0-9a-f]{64}$/);
  const r2 = await tulis({jenis: "rumah", isian: {...RUMAH, kk: "Siti", tingkat: "rs"}}); assert.equal(r2.j.objek.urut, 2);
});

uji("objek ubah: rev dijaga, kalah 409; prasarana jembatan wajib panjang dan kendaraan", async () => {
  const a = await tulis({id: rumahId, rev: rumahRev, isian: {...RUMAH, tingkat: "rs"}, lat: -6.6, lon: 106.8}); assert.equal(a.s, 200, a.t);
  assert.equal(a.j.objek.rev, rumahRev + 1); assert.equal(a.j.objek.data.tingkat, "rs"); assert.deepEqual(a.j.objek.penanda, []);
  assert.equal((await tulis({id: rumahId, rev: rumahRev, isian: RUMAH})).s, 409, "rev lama kalah");
  rumahRev = a.j.objek.rev;
  assert.equal((await tulis({jenis: "prasarana", isian: {jenis: "jembatan", nama: "Jembatan Cisadane", desa: "Paledang", tingkat: "rb", fungsi: "putus"}})).s, 400);
  const p = await tulis({jenis: "prasarana", isian: {jenis: "jembatan", nama: "Jembatan Cisadane", desa: "Paledang", tingkat: "rb", fungsi: "putus", panjang_m: 40, kendaraan: "tidak_ada"}});
  assert.equal(p.s, 201, p.t);
  assert.equal((await tulis({jenis: "rumah", isian: RUMAH, lat: 50, lon: 10})).s, 400, "titik di luar Indonesia");
});

uji("foto: JPEG kamera tersimpan tanpa EXIF, titik dari GPS mengisi objek tanpa titik; media hanya untuk yang berhak", async () => {
  const baru = await tulis({jenis: "rumah", isian: {...RUMAH, kk: "Andi"}}); const id = baru.j.objek.id;
  const foto = b => api("POST", "/api/lapor/data/foto", b, {cookie: kuki, ...XPB});
  const B64 = Buffer.from(JPEG_SAH).toString("base64"), gps = {lat: -6.601, lon: 106.801, akurasi: 8, waktu: Date.now()};
  assert.equal((await foto({objek: id, data: Buffer.from("bukan jpeg").toString("base64")})).s, 400);
  assert.equal((await foto({objek: id, data: B64, exif: {kamera: false}})).s, 400, "tangkapan layar ditolak");
  assert.equal((await foto({objek: id, data: B64, gps, exif: {lat: -7.5, lon: 110.4}})).s, 400, "GPS dan EXIF lebih dari 5 km");
  const f = await foto({objek: id, data: B64, gps}); assert.equal(f.s, 201, f.t);
  assert.equal(f.j.objek.lat, gps.lat); assert.deepEqual(f.j.objek.kurang_foto, {foto: 1, wajah: 0}); assert.equal(f.j.objek.media[0].lencana, "gps");
  const m = await DB.prepare("SELECT kunci_r2 FROM lj_media WHERE id = ?").bind(f.j.foto).first(); assert.match(m.kunci_r2, /^lapor\/data\/[0-9a-f]{16}\/[0-9a-f]{16}\/[0-9a-f]{16}\.jpg$/);
  const g = await api("GET", `/api/lapor/data/media?id=${f.j.foto}`, undefined, {cookie: kuki}); assert.equal(g.s, 200); assert.equal(g.h.get("content-type"), "image/jpeg"); assert.equal(g.h.get("cache-control"), "private, no-store");
  assert.equal((await api("GET", `/api/lapor/data/media?id=${f.j.foto}`)).s, 404, "tanpa hak: sama dengan tidak ada");
  assert.equal((await api("GET", `/api/lapor/data/media?id=${f.j.foto}`, undefined, ADMIN)).s, 200);
  const bogor = akunBogor, jabar = akunJabar;
  assert.equal((await api("GET", `/api/lapor/data/media?id=${f.j.foto}`, undefined, bogor)).s, 200);
  assert.equal((await api("GET", `/api/lapor/data/media?id=${f.j.foto}`, undefined, jabar)).s, 404, "provinsi hanya rekap");
  assert.ok(await n("lj_akses", "aksi = 'media'") >= 3);
});

uji("batal: anggota hanya objek isiannya, ketua semua, alasan wajib; rekap tidak menghitung yang batal; berkas tertutup menolak tulis", async () => {
  const KA = "a1".repeat(32); await DB.prepare("INSERT INTO lj_tim (berkas, wa, nama, peran, token_sha, kedaluwarsa, oleh, dibuat) VALUES (?, '6281299880009', 'Rina', 'anggota', ?, ?, 'uji', ?)").bind(berkasId, sha256(KA), Date.now() + 864e5, kini).run();
  const anggota = {cookie: `lapor_data=${KA}`, ...XPB}, batal = (b, h = {cookie: kuki, ...XPB}) => api("POST", "/api/lapor/data/batal", b, h);
  assert.equal((await batal({objek: rumahId, rev: rumahRev, alasan: "salah rumah"}, anggota)).s, 403);
  const milik = await tulis({jenis: "rumah", isian: {...RUMAH, kk: "Rina A"}}, anggota); assert.equal(milik.s, 201, milik.t);
  assert.equal((await batal({objek: milik.j.objek.id, rev: milik.j.objek.rev, alasan: "dobel"}, anggota)).s, 200, "anggota membatalkan isiannya sendiri");
  assert.equal((await batal({objek: rumahId, rev: rumahRev, alasan: "x"})).s, 400, "alasan terlalu pendek");
  const sebelum = (await api("GET", "/api/lapor/data/berkas", undefined, {cookie: kuki})).j.rekap.rumah_rs;
  assert.equal((await batal({objek: rumahId, rev: rumahRev, alasan: "rumah yang sama tercatat dua kali"})).s, 200);
  assert.equal((await batal({objek: rumahId, rev: rumahRev, alasan: "rumah yang sama tercatat dua kali"})).s, 409, "sudah batal");
  assert.equal((await api("GET", "/api/lapor/data/berkas", undefined, {cookie: kuki})).j.rekap.rumah_rs, sebelum - 1);
  await DB.prepare("UPDATE lj_berkas SET status = 'selesai_catatan', ditutup = ? WHERE id = ?").bind(kini, berkasId).run();
  assert.equal((await tulis({jenis: "rumah", isian: RUMAH})).s, 409, "berkas tertutup");
  await DB.prepare("UPDATE lj_berkas SET status = 'terbuka', ditutup = NULL WHERE id = ?").bind(berkasId).run();
});

uji("temuan pemeriksa LJ-04: anggota tidak mengubah isian orang lain, alasan tanpa NIK, sidik pribadi berkunci, batas 10 foto atomik", async () => {
  const KA = "a1".repeat(32), anggota = {cookie: `lapor_data=${KA}`, ...XPB};
  const k = await tulis({jenis: "rumah", isian: {...RUMAH, kk: "Ketua Isi"}}); const o = k.j.objek;
  assert.equal((await tulis({id: o.id, rev: o.rev, isian: {...RUMAH, kk: "Diganti"}}, anggota)).s, 403);
  assert.equal((await api("POST", "/api/lapor/data/batal", {objek: o.id, rev: o.rev, alasan: "salah, NIK 3171010101010001"}, {cookie: kuki, ...XPB})).s, 400);
  const j = await DB.prepare("SELECT pribadi_sidik FROM lj_jejak WHERE objek = ? ORDER BY id LIMIT 1").bind(o.id).first();
  assert.notEqual(j.pribadi_sidik, sha256(JSON.stringify({kk: "Ketua Isi"})), "bukan SHA-256 polos yang bisa ditebak");
  await DB.batch(Array.from({length: 10}, (_, i) => DB.prepare("INSERT INTO lj_media (id, objek, kunci_r2, jenis, waktu_terima, lencana, pintu, oleh) VALUES (?, ?, ?, 'foto', ?, 'tanpa', 'web', 'uji')")
    .bind(String(i).padStart(16, "c"), o.id, `lapor/data/x/${i}.jpg`, kini)));
  const f = await api("POST", "/api/lapor/data/foto", {objek: o.id, data: Buffer.from(JPEG_SAH).toString("base64")}, {cookie: kuki, ...XPB});
  assert.equal(f.s, 400); assert.match(f.j.galat, /Paling banyak 10 foto/);
  assert.equal(await n("lj_media", `objek = '${o.id}'`), 10);
});

/* ---------- LJ-05: pintu WA tahap 2 (jalur mesin, Bearer WA_MESIN). Anggota tim tanpa lapor_izin; nomor rekaan, bukan nomor pemilik ---------- */
const MESIN = {authorization: "Bearer mesin-rahasia"}, ANGGOTA = "6281299880009", NIK_UJI = "3171010101010001", HP_UJI = "6281234567000";
const wa = (nomor, teks, extra = {}) => api("POST", "/api/lapor/pesan", {wa: nomor, teks, ...extra}, MESIN);
const waFoto = (nomor, extra = {}) => api("POST", "/api/lapor/foto", {wa: nomor, data: Buffer.from(JPEG_SAH).toString("base64"), ...extra}, MESIN);
const semuaBalasan = [];
const kata = async (nomor, teks, extra) => { const r = await wa(nomor, teks, extra); semuaBalasan.push(r.t); return r; };

uji("WA tahap 2: nomor tanpa lj_tim tetap ditolak 403 untuk perintah data dan untuk lapor, anggota tanpa izin hanya lolos di jalur berkas", async () => {
  assert.equal((await wa(WARGA, "data rumah")).s, 403);
  assert.equal((await wa(WARGA, "lapor")).s, 403);
  assert.equal((await waFoto(WARGA)).s, 403);
  assert.equal(await n("lj_sesi"), 0);
  assert.equal(await n("lapor_izin", `wa = '${ANGGOTA}'`), 0, "anggota tidak punya izin Lapor");
  const r = await wa(ANGGOTA, "lapor"); assert.equal(r.s, 403, "anggota tanpa izin tidak membuat laporan biasa (D11)");
  assert.equal((await wa(ANGGOTA, "data rumah")).s, 200, "anggota aktif berkas boleh perintah data");
  await DB.prepare("UPDATE lj_tim SET dicabut = ? WHERE berkas = ? AND wa = ?").bind(kini, berkasId, ANGGOTA).run();
  assert.equal((await wa(ANGGOTA, "batal")).s, 403, "dicabut: kembali ditolak");
  await DB.prepare("UPDATE lj_tim SET dicabut = NULL WHERE berkas = ? AND wa = ?").bind(berkasId, ANGGOTA).run();
  assert.equal((await wa(ANGGOTA, "batal")).s, 200); assert.equal(await n("lj_sesi"), 0);
});

uji("WA rumah: dari data rumah sampai simpan; foto masuk ke objek; pribadi terpisah; balasan tanpa NIK utuh", async () => {
  const a = await kata(ANGGOTA, "data rumah"); assert.equal(a.s, 200); assert.equal(a.j.status, "data_lanjutan"); assert.equal(a.j.teksWa, a.j.balasan); assert.match(a.j.balasan, /Nama kepala keluarga/);
  const jawab = ["Budi WA", "Paledang", "Bogor Tengah", "RT 03 RW 04", "1", "2", "2", "4"];
  for (const t of jawab) assert.equal((await kata(ANGGOTA, t)).s, 200);
  let r = await kata(ANGGOTA, "Siti Pemilik"); assert.match(r.j.balasan, /NIK kepala keluarga/);
  r = await kata(ANGGOTA, NIK_UJI); assert.match(r.j.balasan, /Keterangan tambahan/);
  r = await kata(ANGGOTA, "lewati semua"); assert.match(r.j.balasan, /Kirim foto rumah, kurang 2/);
  assert.equal((await kata(ANGGOTA, "simpan")).s, 200);   // di tahap foto: bukan perintah, hanya menunggu foto
  assert.equal(await n("lj_objek", "klien_id LIKE 'wa-%' AND jenis = 'rumah'"), 0, "simpan hanya dari ringkasan");
  const f1 = await waFoto(ANGGOTA, {lokasi: {lat: -6.601, lon: 106.801}, waktu: Date.now() - 60e3}); assert.equal(f1.s, 200, f1.t); assert.match(f1.j.balasan, /Kurang 1 lagi/);
  const f2 = await waFoto(ANGGOTA); assert.equal(f2.s, 200, f2.t); assert.match(f2.j.balasan, /Ringkasan rumah/); assert.match(f2.j.balasan, /Foto: 2\n/);
  assert.ok(!f2.t.includes(NIK_UJI) && /\*{12}0001/.test(f2.t), "NIK tersamar di ringkasan");
  const sesiSebelum = await DB.prepare("SELECT keadaan FROM lj_sesi WHERE wa = ?").bind(ANGGOTA).first(); assert.match(sesiSebelum.keadaan, /Budi WA/, "draf berisi isian selama belum disimpan");
  assert.equal(await n("lj_objek", "klien_id LIKE 'wa-%' AND jenis = 'rumah'"), 0);
  const s = await kata(ANGGOTA, "simpan"); assert.equal(s.s, 200, s.t); assert.match(s.j.balasan, /rumah nomor \d+ sudah masuk/);
  const o = await DB.prepare("SELECT * FROM lj_objek WHERE oleh = ? AND jenis = 'rumah' AND klien_id LIKE 'wa-%'").bind("tim:" + ANGGOTA).first();
  assert.ok(o, "objek tersimpan lewat jalur yang sama dengan web"); assert.equal(o.berkas, berkasId); assert.equal(o.status, "aktif");
  assert.equal(JSON.parse(o.data).tingkat, "rb"); assert.equal(JSON.parse(o.data).kk, undefined); assert.equal(JSON.parse(o.pribadi).kk, "Budi WA"); assert.equal(JSON.parse(o.pribadi).nik_kk, NIK_UJI);
  assert.equal(o.lat, -6.601, "titik dari lokasi yang dibagikan lewat WA"); assert.match(o.klien_id, /^wa-\d+-62\d{8,13}$/);
  const md = (await DB.prepare("SELECT * FROM lj_media WHERE objek = ?").bind(o.id).all()).results;
  assert.equal(md.length, 2); assert.ok(md.every(m => m.pintu === "wa" && m.jenis === "foto"));
  assert.deepEqual(md.map(m => m.lencana).sort(), ["tanpa", "wa"]);
  for (const m of md) assert.match(m.kunci_r2, new RegExp(`^lapor/data/${berkasId}/${o.id}/[0-9a-f]{16}\\.jpg$`));
  const r2 = await U.mf.getR2Bucket("MEDIA");
  assert.equal((await r2.list({prefix: `lapor/data/${berkasId}/draf/`})).objects.length, 0, "foto draf dipindah, tidak tersisa");
  assert.ok(await r2.head(md[0].kunci_r2));
  const j = await DB.prepare("SELECT sebelum, sesudah, pribadi_sidik, oleh FROM lj_jejak WHERE objek = ? AND aksi = 'tambah'").bind(o.id).first();
  assert.ok(!/Budi|Siti/.test(JSON.stringify(j))); assert.match(j.pribadi_sidik, /^[0-9a-f]{64}$/); assert.equal(j.oleh, "tim:" + ANGGOTA);
  const sesi = await DB.prepare("SELECT keadaan FROM lj_sesi WHERE wa = ?").bind(ANGGOTA).first();
  assert.ok(!/Budi|Siti|3171|RT 03/.test(sesi.keadaan), "sesudah simpan lj_sesi tidak menyimpan pribadi"); assert.equal(JSON.parse(sesi.keadaan).tahap, "sesudah");
  assert.ok(semuaBalasan.every(t => !t.includes(NIK_UJI)), "tidak ada balasan yang memuat NIK utuh");
  const web = await api("GET", "/api/lapor/data/berkas", undefined, {cookie: kuki}); assert.ok(web.j.objek.some(x => x.id === o.id), "objek WA tampak di berkas web");
});

uji("WA lagi: desa dan kecamatan terakhir jadi bawaan; prasarana jembatan dari jembatan rusak; selesai keluar mode", async () => {
  let r = await kata(ANGGOTA, "lagi"); assert.match(r.j.balasan, /Nama kepala keluarga/);
  r = await kata(ANGGOTA, "Rina WA"); assert.match(r.j.balasan, /Alamat/, "desa dan kecamatan tidak ditanya lagi");
  assert.match((await kata(ANGGOTA, "batal")).j.balasan, /dibuang/); assert.equal(await n("lj_sesi", `wa = '${ANGGOTA}'`), 0);
  r = await kata(ANGGOTA, "jembatan rusak"); assert.match(r.j.balasan, /Nama prasarana/);
  for (const t of ["Jembatan Ciliwung", "Paledang", "1", "1"]) r = await kata(ANGGOTA, t);
  assert.match(r.j.balasan, /Panjang/); r = await kata(ANGGOTA, "35"); r = await kata(ANGGOTA, "1"); assert.match(r.j.balasan, /Jalur alternatif/);
  r = await kata(ANGGOTA, "lewati"); assert.match(r.j.balasan, /kurang 2/); r = await kata(ANGGOTA, "lewati"); assert.match(r.j.balasan, /Ringkasan prasarana/);
  r = await kata(ANGGOTA, "simpan"); assert.match(r.j.balasan, /Foto masih kurang 2/);
  const o = await DB.prepare("SELECT data FROM lj_objek WHERE oleh = ? AND jenis = 'prasarana' AND klien_id LIKE 'wa-%'").bind("tim:" + ANGGOTA).first();
  assert.equal(JSON.parse(o.data).jenis, "jembatan"); assert.equal(JSON.parse(o.data).panjang_m, 35); assert.equal(JSON.parse(o.data).kendaraan, "tidak_ada");
  assert.match((await kata(ANGGOTA, "selesai")).j.balasan, /Terima kasih/); assert.equal(await n("lj_sesi", `wa = '${ANGGOTA}'`), 0);
});

uji("WA: foto saat belum waktunya 409; foto tanpa draf jatuh ke alur biasa; ketua berizin yang mengetik lapor keluar ke alur laporan", async () => {
  await kata(ANGGOTA, "data rumah");
  const f = await waFoto(ANGGOTA); assert.equal(f.s, 409); assert.match(f.j.teksWa, /sesudah semua isian terjawab/);
  assert.equal(await n("lj_media", "pintu = 'wa'"), 2, "tidak ada foto baru");
  await kata(ANGGOTA, "batal");
  assert.equal((await waFoto(ANGGOTA)).s, 403, "tanpa draf data foto dilayani alur Lapor: anggota tanpa izin ditolak");
  const IZIN = "6281299880012";   // anggota yang juga berizin Lapor, tanpa sesi laporan sebelumnya
  await izin(IZIN, "bpbd", "Kota Bogor"); await DB.prepare("INSERT INTO lj_tim (berkas, wa, nama, peran, oleh, dibuat) VALUES (?, ?, 'Dedi', 'anggota', 'uji', ?)").bind(berkasId, IZIN, kini).run();
  let r = await kata(IZIN, "data rumah"); assert.equal(r.j.status, "data_lanjutan"); assert.equal(await n("lj_sesi", `wa = '${IZIN}'`), 1);
  r = await wa(IZIN, "lapor"); assert.equal(r.s, 200, r.t); assert.notEqual(r.j.status, "data_lanjutan", "alur laporan biasa");
  assert.equal(await n("lj_sesi", `wa = '${IZIN}'`), 0, "draf data dibuang saat anggota pindah ke laporan");
  r = await wa(IZIN, "lapor"); assert.equal(r.s, 200); assert.notEqual(r.j.status, "data_lanjutan");
  await DB.prepare("DELETE FROM lapor_izin WHERE wa = ?").bind(IZIN).run();
});

uji("WA: draf lebih tua dari 24 jam dibuang saat dibaca; cron bersih-bersih membuang draf basi dan foto drafnya", async () => {
  await kata(ANGGOTA, "data rumah"); await kata(ANGGOTA, "Basi Satu");
  await DB.prepare("UPDATE lj_sesi SET diubah = ? WHERE wa = ?").bind(Date.now() - 25 * 3600e3, ANGGOTA).run();
  const r = await wa(ANGGOTA, "Paledang"); assert.equal(r.s, 403, "draf basi dibuang; teks biasa jatuh ke alur Lapor (anggota tanpa izin)");
  assert.equal(await n("lj_sesi", `wa = '${ANGGOTA}'`), 0);
  await kata(ANGGOTA, "data rumah"); for (const t of ["Basi Dua", "P", "K", "A", "1", "1", "1", "1", "lewati semua"]) await kata(ANGGOTA, t);
  await waFoto(ANGGOTA);
  const r2 = await U.mf.getR2Bucket("MEDIA"), draf = `lapor/data/${berkasId}/draf/`;
  assert.equal((await r2.list({prefix: draf})).objects.length, 1);
  await DB.prepare("UPDATE lj_sesi SET diubah = ? WHERE wa = ?").bind(Date.now() - 25 * 3600e3, ANGGOTA).run();
  assert.equal(await bersihSesiLanjut({DB, MEDIA: r2}, Date.now()), 1);
  assert.equal(await n("lj_sesi"), 0, "tidak ada draf tersisa (termasuk isian pribadi)"); assert.equal((await r2.list({prefix: draf})).objects.length, 0);
});

uji("WA: berkas tertutup menutup jalur tim; kunci mesin salah dan jalur web ketikan tidak membuka jalur tim", async () => {
  await kata(ANGGOTA, "data rumah"); for (const t of ["Tutup", "P", "K", "A", "1", "1", "1", "1", "lewati semua", "lewati"]) await kata(ANGGOTA, t);
  await DB.prepare("UPDATE lj_berkas SET status = 'selesai_catatan', ditutup = ? WHERE id = ?").bind(kini, berkasId).run();
  assert.equal((await wa(ANGGOTA, "simpan")).s, 403, "berkas tertutup: bukan anggota aktif lagi, ditolak");
  await DB.prepare("UPDATE lj_berkas SET status = 'terbuka', ditutup = NULL WHERE id = ?").bind(berkasId).run();
  assert.equal((await api("POST", "/api/lapor/pesan", {wa: ANGGOTA, teks: "data rumah"}, {authorization: "Bearer salah"})).s, 403);
  const web = await api("POST", "/api/lapor/pesan", {wa: ANGGOTA, teks: "data rumah"}, {"x-pb": "1", origin: ASAL}); assert.notEqual(web.j?.status, "data_lanjutan", "jalur web nomor ketikan tidak membuka jalur tim");
  await wa(ANGGOTA, "batal"); assert.equal(await n("lj_sesi"), 0, "batal membuang draf berisi pribadi");
});

/* ---------- LJ-06: titik pengungsian (register TP) dan jiwa pengungsi, web dan WA. Nomor rekaan. ---------- */
const TITIK = {nama: "Gedung Serbaguna", desa: "Paledang", jenis_tempat: "terkonsentrasi", tipe_tempat: "fasilitas_umum", tgl_buka: "2026-11-20",
  keb_air: "ada", keb_pangan: "ada", keb_sandang: "tidak", keb_kesehatan: "tidak", keb_hunian: "tidak", keb_pendidikan: "tidak"};
const JIWA = {nama: "Sari Rahmawati", umur: 30, jk: "p", desa_asal: "Paledang", masuk: "2026-11-21", kk: "diri", hp: "081234567000", nik: NIK_UJI, rentan: ["lansia", "sakit"], kebutuhan: "obat tekanan darah"};
const tp = id => DB.prepare("SELECT * FROM titik_pengungsian WHERE id = ?").bind(id).first();
let tp1, tp2, tpLuar, jiwa1, jiwa2, jiwa3;

uji("titik baru: membuat baris register TP di kab berkas, bertanda pembuat berkas, jejak ada; kab tak dikenal ditolak", async () => {
  await DB.prepare("DELETE FROM laju_bnpb").run();
  const r = await tulis({jenis: "titik", isian: TITIK, lat: -6.6, lon: 106.8}); assert.equal(r.s, 201, r.t);
  tp1 = r.j.objek.titik_id; assert.match(tp1, /^TP-[A-Z2-7]{8}$/); assert.equal(r.j.objek.data.nama, "Gedung Serbaguna");
  const b = await tp(tp1);
  assert.equal(b.kab4, "3271"); assert.equal(b.prov, "32"); assert.equal(b.nama, "Gedung Serbaguna"); assert.equal(b.desa, "Paledang"); assert.equal(b.jenis_tempat, "terkonsentrasi");
  assert.equal(b.buka, "2026-11-20"); assert.equal(b.tutup, null); assert.equal(b.lat, -6.6); assert.equal(b.pembuat, `lapor_lanjut:${berkasId}`);
  assert.equal(await n("lj_jejak", `objek = '${r.j.objek.id}' AND aksi = 'tambah'`), 1);
  assert.equal((await tulis({jenis: "titik", isian: {...TITIK, jenis_tempat: "lain"}})).s, 400);
  await DB.prepare("UPDATE lj_berkas SET kab = '99.99' WHERE id = ?").bind(berkasId).run();
  const x = await tulis({jenis: "titik", isian: TITIK}); assert.equal(x.s, 409); assert.match(x.j.galat, /belum dikenali/);
  await DB.prepare("UPDATE lj_berkas SET kab = '32.71' WHERE id = ?").bind(berkasId).run();
  assert.equal(await n("titik_pengungsian"), 1, "tidak ada baris register karangan");
});

uji("titik dekat TP terbuka: 409 dengan daftar; paksa membuat baru; titik tanpa lat lon tidak diperiksa", async () => {
  const d = await tulis({jenis: "titik", isian: {...TITIK, nama: "Lapangan Dekat"}, lat: -6.6005, lon: 106.8}); assert.equal(d.s, 409, d.t);
  assert.equal(d.j.dekat[0].id, tp1); assert.ok(d.j.dekat[0].jarak_m < 200); assert.equal(await n("titik_pengungsian"), 1);
  const p = await tulis({jenis: "titik", isian: {...TITIK, nama: "Lapangan Dekat"}, lat: -6.6005, lon: 106.8, paksa: true}); assert.equal(p.s, 201, p.t); tp2 = p.j.objek.titik_id;
  const jauh = await tulis({jenis: "titik", isian: {...TITIK, nama: "Sekolah Jauh"}, lat: -6.65, lon: 106.85}); assert.equal(jauh.s, 201, jauh.t);
  assert.equal(await n("titik_pengungsian"), 3);
  const tanpa = await tulis({jenis: "titik", isian: {...TITIK, nama: "Tanpa Titik"}}); assert.equal(tanpa.s, 201); assert.equal((await tp(tanpa.j.objek.titik_id)).lat, null);
});

uji("titik tautkan: TP sekab terbuka ditautkan tanpa baris baru dan tidak ditimpa; kab lain, tutup, ganda, kode salah ditolak", async () => {
  const reg = (id, kab4, tutup = null) => DB.prepare("INSERT INTO titik_pengungsian (id, prov, kab4, nama, jenis_tempat, tutup, dibuat, pembuat) VALUES (?, '32', ?, 'Milik Meja', 'terkonsentrasi', ?, ?, 'meja:uji')").bind(id, kab4, tutup, kini).run();
  await reg("TP-BBBBBBBB", "3271"); await reg("TP-CCCCCCCC", "3273"); await reg("TP-DDDDDDDD", "3271", "2026-11-22");
  const sebelum = await n("titik_pengungsian");
  const l = await tulis({jenis: "titik", isian: {...TITIK, nama: "Nama Lain", tp: "TP-BBBBBBBB"}}); assert.equal(l.s, 201, l.t); assert.equal(l.j.objek.titik_id, "TP-BBBBBBBB");
  assert.equal(await n("titik_pengungsian"), sebelum, "tidak ada baris baru");
  const u = await tulis({id: l.j.objek.id, rev: l.j.objek.rev, isian: {...TITIK, nama: "Diubah Berkas"}}); assert.equal(u.s, 200, u.t);
  assert.equal((await tp("TP-BBBBBBBB")).nama, "Milik Meja", "register buatan orang lain tidak ditimpa");
  assert.equal((await tulis({jenis: "titik", isian: {...TITIK, tp: "TP-BBBBBBBB"}})).s, 409, "sudah tercatat di berkas ini");
  assert.equal((await tulis({jenis: "titik", isian: {...TITIK, tp: "TP-CCCCCCCC"}})).s, 404, "kab lain");
  assert.equal((await tulis({jenis: "titik", isian: {...TITIK, tp: "TP-DDDDDDDD"}})).s, 409, "sudah ditutup");
  assert.equal((await tulis({jenis: "titik", isian: {...TITIK, tp: "TP-ZZZZZZZZ"}})).s, 404);
  assert.equal((await tulis({jenis: "titik", isian: {...TITIK, tp: "tp-abc"}})).s, 400);
  assert.equal(await n("titik_pengungsian"), sebelum);
  tpLuar = "TP-CCCCCCCC";
});

uji("titik ubah: nama, desa, bentuk, dan tanggal buka disinkronkan ke register buatan berkas ini; rev kalah tidak menyentuh register", async () => {
  const o = (await api("GET", "/api/lapor/data/berkas", undefined, {cookie: kuki})).j.objek.find(x => x.titik_id === tp1);
  const kalah = await tulis({id: o.id, rev: o.rev + 5, isian: {...TITIK, nama: "Tidak Boleh"}}); assert.equal(kalah.s, 409); assert.equal((await tp(tp1)).nama, "Gedung Serbaguna");
  const r = await tulis({id: o.id, rev: o.rev, isian: {...TITIK, nama: "Gedung Serbaguna Baru", desa: "Babakan", jenis_tempat: "tidak_terkonsentrasi", tgl_buka: "2026-11-19"}}); assert.equal(r.s, 200, r.t);
  const b = await tp(tp1); assert.equal(b.nama, "Gedung Serbaguna Baru"); assert.equal(b.desa, "Babakan"); assert.equal(b.jenis_tempat, "tidak_terkonsentrasi"); assert.equal(b.buka, "2026-11-19");
  assert.equal(r.j.objek.titik_id, tp1);
});

uji("jiwa: wajib titik berkas ini; kk diri atau kepala keluarga aktif; pribadi terpisah; tanpa titik lokasi; HP wajib bagi kepala keluarga", async () => {
  await DB.batch([DB.prepare("INSERT INTO lj_berkas (id, induk, kab, status, isian, dibuat, diubah) VALUES (?, 'LA-231126-09', '32.71', 'terbuka', '{}', ?, ?)").bind("e".repeat(16), kini, kini),
    DB.prepare("INSERT INTO lj_objek (id, berkas, jenis, urut, data, titik_id, oleh, dibuat, diubah) VALUES (?, ?, 'titik', 1, '{}', 'TP-EEEEEEEE', 'uji', ?, ?)").bind("d".repeat(16), "e".repeat(16), kini, kini)]);
  for (const t of ["TP-EEEEEEEE", tpLuar, "TP-bukan"]) { const x = await tulis({jenis: "jiwa", isian: {...JIWA, titik: t}}); assert.equal(x.s, 400, t); assert.ok(x.j.isian.includes("titik"), t + " " + x.t); }
  const tanpaHp = await tulis({jenis: "jiwa", isian: {...JIWA, titik: tp1, hp: undefined}}); assert.equal(tanpaHp.s, 400); assert.ok(tanpaHp.j.isian.includes("hp"));
  const r = await tulis({jenis: "jiwa", isian: {...JIWA, titik: tp1}, lat: -6.6, lon: 106.8}); assert.equal(r.s, 201, r.t); jiwa1 = r.j.objek;
  assert.equal(jiwa1.titik_id, tp1); assert.equal(jiwa1.data.titik, tp1); assert.equal(jiwa1.pribadi.nama, "Sari Rahmawati"); assert.deepEqual(jiwa1.pribadi.rentan, ["lansia", "sakit"]);
  assert.equal(jiwa1.data.nama, undefined); assert.equal(jiwa1.lat, null, "lokasi orang tidak disimpan"); assert.ok(!jiwa1.penanda.includes("tanpa_titik"));
  assert.deepEqual(jiwa1.kurang_foto, {foto: 0, wajah: 1});
  const j = await DB.prepare("SELECT sebelum, sesudah FROM lj_jejak WHERE objek = ?").bind(jiwa1.id).first(); assert.ok(!/Sari|obat|3171|6281234/.test(JSON.stringify(j)), "jejak tanpa pribadi");
  const a = await tulis({jenis: "jiwa", isian: {...JIWA, titik: tp1, nama: "Rina", kk: jiwa1.id, hp: undefined}}); assert.equal(a.s, 201, a.t); jiwa2 = a.j.objek;
  for (const kk of ["f".repeat(16), jiwa2.id, "xyz"]) { const x = await tulis({jenis: "jiwa", isian: {...JIWA, titik: tp1, nama: "Salah", kk, hp: undefined}}); assert.equal(x.s, 400, kk); assert.ok(x.j.isian.includes("kk")); }
  const k3 = await tulis({jenis: "jiwa", isian: {...JIWA, titik: tp1, nama: "Joko", nik: "3171010101010003"}}); assert.equal(k3.s, 201); jiwa3 = k3.j.objek;
  assert.equal(await n("lj_objek", `berkas = '${berkasId}' AND jenis = 'jiwa' AND status = 'aktif'`), 4, "tiga baru dan satu dari uji LJ-03");
});

uji("jiwa: batal titik berjiwa, batal atau ubah kepala keluarga yang masih dirujuk = 409; sesudah rujukan lepas boleh", async () => {
  const batal = (o, alasan = "salah catat ulang") => api("POST", "/api/lapor/data/batal", {objek: o.id, rev: o.rev, alasan}, {cookie: kuki, ...XPB});
  const titik = (await api("GET", "/api/lapor/data/berkas", undefined, {cookie: kuki})).j.objek.find(x => x.titik_id === tp1);
  assert.equal((await batal(titik)).s, 409); assert.equal((await batal(jiwa1)).s, 409);
  const u = await tulis({id: jiwa1.id, rev: jiwa1.rev, isian: {...JIWA, titik: tp1, kk: jiwa3.id}}); assert.equal(u.s, 409, "kk jiwa1 diubah ke orang lain sementara Rina masih merujuk"); assert.match(u.j.galat, /merujuk/);
  const lepas = await tulis({id: jiwa2.id, rev: jiwa2.rev, isian: {...JIWA, titik: tp1, nama: "Rina", kk: jiwa3.id, hp: undefined}}); assert.equal(lepas.s, 200, lepas.t);
  const baru = await tulis({id: jiwa1.id, rev: jiwa1.rev, isian: {...JIWA, titik: tp1, kk: jiwa3.id}}); assert.equal(baru.s, 200, "tidak ada yang merujuk lagi: boleh pindah kepala keluarga"); jiwa1 = baru.j.objek;
  assert.equal((await batal(jiwa1, "orang ini pindah ke desa lain")).s, 200); jiwa1 = null;
});

uji("wajah: hanya jiwa dewasa yang tidak menolak, maksimal dua, tanpa titik objek; foto biasa ke jiwa dan wajah ke objek lain ditolak", async () => {
  const B64 = Buffer.from(JPEG_SAH).toString("base64"), foto = b => api("POST", "/api/lapor/data/foto", {data: B64, ...b}, {cookie: kuki, ...XPB});
  assert.equal((await foto({objek: jiwa3.id})).s, 400, "foto biasa ke jiwa"); assert.equal((await foto({objek: jiwa3.id, jenis: "video"})).s, 400);
  const rumah = (await tulis({jenis: "rumah", isian: RUMAH})).j.objek; assert.equal((await foto({objek: rumah.id, jenis: "wajah"})).s, 400, "wajah ke rumah");
  const anak = (await tulis({jenis: "jiwa", isian: {...JIWA, titik: tp1, nama: "Anak Kecil", umur: 10, kk: jiwa3.id, hp: undefined}})).j.objek;
  assert.deepEqual(anak.kurang_foto, {foto: 0, wajah: 0}); const a = await foto({objek: anak.id, jenis: "wajah"}); assert.equal(a.s, 400); assert.match(a.j.galat, /di bawah 18/);
  const tolakFoto = (await tulis({jenis: "jiwa", isian: {...JIWA, titik: tp1, nama: "Tidak Mau", kk: jiwa3.id, hp: undefined, menolak_foto: true}})).j.objek;
  assert.deepEqual(tolakFoto.kurang_foto, {foto: 0, wajah: 0}); const m = await foto({objek: tolakFoto.id, jenis: "wajah"}); assert.equal(m.s, 400); assert.match(m.j.galat, /menolak/);
  assert.equal(await n("lj_media", `objek IN ('${anak.id}', '${tolakFoto.id}')`), 0);
  const w1 = await foto({objek: jiwa3.id, jenis: "wajah", gps: {lat: -6.6, lon: 106.8, akurasi: 5, waktu: Date.now()}}); assert.equal(w1.s, 201, w1.t);
  assert.deepEqual(w1.j.objek.kurang_foto, {foto: 0, wajah: 0}); assert.equal(w1.j.objek.lat, null, "wajah tidak mengisi titik objek"); assert.equal(w1.j.objek.media[0].jenis, "wajah"); assert.equal(w1.j.objek.media[0].lat, null);
  const md = await DB.prepare("SELECT kunci_r2, lat, lencana FROM lj_media WHERE id = ?").bind(w1.j.foto).first();
  assert.match(md.kunci_r2, new RegExp(`^lapor/data/${berkasId}/wajah/[0-9a-f]{16}\\.jpg$`)); assert.equal(md.lat, null);
  assert.equal((await foto({objek: jiwa3.id, jenis: "wajah"})).s, 201); const tiga = await foto({objek: jiwa3.id, jenis: "wajah"}); assert.equal(tiga.s, 400); assert.match(tiga.j.galat, /Paling banyak 2 foto wajah/);
  assert.equal(await n("lj_media", `objek = '${jiwa3.id}' AND jenis = 'wajah'`), 2);
  globalThis.wajahId = w1.j.foto;
});

uji("wajah dan pribadi jiwa: tim dan staf Pusdalops boleh; akun lembaga tidak boleh wajah; pribadi tersamar untuk staf dan lembaga, rekap tanpa pribadi", async () => {
  const id = globalThis.wajahId, media = h => api("GET", `/api/lapor/data/media?id=${id}`, undefined, h);
  assert.equal((await media({cookie: kuki})).s, 200); assert.equal((await media(ADMIN)).s, 200);
  assert.equal((await media(akunBogor)).s, 404, "akun lembaga kab hanya foto, bukan wajah"); assert.equal((await media(akunJabar)).s, 404); assert.equal((await media({})).s, 404);
  for (const h of [ADMIN, akunBogor]) {
    const r = await api("GET", `/api/lapor/data/berkas?id=${berkasId}`, undefined, h); assert.equal(r.s, 200, r.t);
    const o = r.j.objek.find(x => x.id === jiwa3.id);
    assert.equal(o.pribadi.nama, "J***"); assert.equal(o.pribadi.hp, "*********7000"); assert.equal(o.pribadi.nik, "************0003");
    assert.equal(o.pribadi.rentan, "(disembunyikan)"); assert.equal(o.pribadi.kebutuhan, "(disembunyikan)");
    assert.ok(!/Joko|Sari Rahmawati|obat tekanan|3171010101010003|081234567000|6281234567000/.test(r.t), "tidak ada pribadi jiwa utuh");
    assert.ok(!/lapor\/data|kunci_r2/.test(r.t));
  }
  const p = await api("GET", `/api/lapor/data/berkas?id=${berkasId}`, undefined, akunJabar); assert.equal(p.j.objek, undefined); assert.ok(!/Joko|obat tekanan/.test(p.t));
  const d = await api("GET", "/api/lapor/data/daftar", undefined, ADMIN); assert.ok(!/Joko|obat tekanan|7000/.test(d.t));
  const tim = await api("GET", "/api/lapor/data/berkas", undefined, {cookie: kuki}); assert.equal(tim.j.objek.find(x => x.id === jiwa3.id).pribadi.nama, "Joko");
  assert.ok(tim.j.rekap.mengungsi >= 3);
});

/* ---------- LJ-06 WA: mesin murni, perintah "data pengungsian" dan "data pengungsi" ---------- */
const adaDi = (balasan, nama) => Number(new RegExp(`(\\d+)\\. ${nama}`).exec(balasan)?.[1]);
const jalan = async (nomor, ...teks) => { let r; for (const t of teks) r = await kata(nomor, t); return r; };
uji("WA titik pengungsian: urutan butir dari spek, ringkasan, simpan membuat TP; titik dekat meminta konfirmasi sebelum memaksa", async () => {
  await DB.prepare("DELETE FROM laju_bnpb").run();
  let r = await kata(ANGGOTA, "data pengungsian"); assert.match(r.j.balasan, /Nama tempat pengungsian/);
  r = await jalan(ANGGOTA, "Posko WA", "Paledang", "1", "1", "hari ini", "1", "1", "2", "2", "2", "2"); assert.match(r.j.balasan, /Ada MCK/);
  r = await kata(ANGGOTA, "lewati semua"); assert.match(r.j.balasan, /Kirim foto tempat pengungsian, kurang 1/);
  r = await kata(ANGGOTA, "", {lokasi: {lat: -6.6003, lon: 106.8}}); assert.match(r.j.balasan, /Titik lokasi diterima/);
  r = await kata(ANGGOTA, "lewati"); assert.match(r.j.balasan, /Ringkasan tempat pengungsian/); assert.match(r.j.balasan, /Nama tempat pengungsian: Posko WA/); assert.match(r.j.balasan, /Titik lokasi: sudah dibagikan/);
  assert.equal(await n("titik_pengungsian", "nama = 'Posko WA'"), 0);
  r = await kata(ANGGOTA, "simpan"); assert.equal(r.s, 200); assert.match(r.j.balasan, /kurang dari 200 m/); assert.match(r.j.balasan, /Gedung Serbaguna Baru/); assert.equal(await n("titik_pengungsian", "nama = 'Posko WA'"), 0);
  r = await kata(ANGGOTA, "simpan"); assert.match(r.j.balasan, /tempat pengungsian nomor \d+ sudah masuk/);
  const b = await DB.prepare("SELECT * FROM titik_pengungsian WHERE nama = 'Posko WA'").first();
  assert.equal(b.kab4, "3271"); assert.equal(b.pembuat, `lapor_lanjut:${berkasId}`); assert.equal(b.lat, -6.6003); assert.match(b.buka, /^\d{4}-\d{2}-\d{2}$/);
  const o = await DB.prepare("SELECT * FROM lj_objek WHERE titik_id = ? AND jenis = 'titik'").bind(b.id).first(); assert.equal(o.oleh, "tim:" + ANGGOTA); assert.equal(JSON.parse(o.data).keb_air, "ada");
  globalThis.tpWa = b.id;
  await kata(ANGGOTA, "selesai");
});

uji("WA jiwa: pilih titik dan kepala keluarga dari daftar bernomor, wajah dari foto, anak tanpa foto, menolak tercatat, HP dan NIK tersamar di balasan", async () => {
  const mulai = await kata(ANGGOTA, "data pengungsi"); assert.match(mulai.j.balasan, /Tempat pengungsian\*\n1\./);
  const no = adaDi(mulai.j.balasan, "Posko WA"); assert.ok(no >= 1);
  let r = await jalan(ANGGOTA, String(no), "Wati WA", "25", "2", "Paledang", "hari ini"); assert.match(r.j.balasan, /Kepala keluarga\*\n1\. Orang ini sendiri kepala keluarga\nBalas dengan nomor\./);
  r = await kata(ANGGOTA, "1"); assert.match(r.j.balasan, /Nomor HP kepala keluarga/); assert.match(r.j.balasan, /Data pribadi/);
  r = await kata(ANGGOTA, "081234567001"); assert.match(r.j.balasan, /NIK/);
  r = await kata(ANGGOTA, "lewati semua"); assert.match(r.j.balasan, /Kirim foto wajah/); assert.match(r.j.balasan, /menolak/);
  const f = await waFoto(ANGGOTA, {lokasi: {lat: -6.7, lon: 106.9}}); assert.equal(f.s, 200, f.t); assert.match(f.j.balasan, /Ringkasan pengungsi/); assert.match(f.j.balasan, /Foto wajah: 1/);
  assert.match(f.j.balasan, /Tempat pengungsian: Posko WA/); assert.match(f.j.balasan, /Kepala keluarga: dia sendiri/); assert.match(f.j.balasan, /\*{8}7001/); assert.ok(!f.t.includes("081234567001") && !f.t.includes("6281234567001"));
  r = await kata(ANGGOTA, "simpan"); assert.match(r.j.balasan, /pengungsi nomor \d+ sudah masuk/);
  const wati = await DB.prepare("SELECT * FROM lj_objek WHERE jenis = 'jiwa' AND oleh = ? AND klien_id LIKE 'wa-%'").bind("tim:" + ANGGOTA).first();
  assert.equal(wati.titik_id, globalThis.tpWa); assert.equal(wati.lat, null, "lokasi pada foto wajah tidak jadi titik objek"); assert.equal(JSON.parse(wati.pribadi).nama, "Wati WA"); assert.equal(JSON.parse(wati.pribadi).hp, "6281234567001"); assert.equal(JSON.parse(wati.data).kk, "diri");
  const md = (await DB.prepare("SELECT * FROM lj_media WHERE objek = ?").bind(wati.id).all()).results; assert.equal(md.length, 1); assert.equal(md[0].jenis, "wajah"); assert.equal(md[0].pintu, "wa"); assert.equal(md[0].lat, null);
  assert.match(md[0].kunci_r2, new RegExp(`^lapor/data/${berkasId}/wajah/[0-9a-f]{16}\\.jpg$`));
  const r2 = await U.mf.getR2Bucket("MEDIA"); assert.equal((await r2.list({prefix: `lapor/data/${berkasId}/draf/`})).objects.length, 0); assert.ok(await r2.head(md[0].kunci_r2));
  assert.ok(semuaBalasan.every(t => !t.includes("081234567001") && !t.includes(NIK_UJI)), "tidak ada balasan dengan HP atau NIK utuh");

  r = await kata(ANGGOTA, "lagi"); assert.match(r.j.balasan, /Nama lengkap pengungsi/, "titik, desa asal, dan tanggal masuk jadi bawaan");
  r = await jalan(ANGGOTA, "Anak WA", "10", "1"); assert.match(r.j.balasan, /Kepala keluarga\*\n1\. Orang ini sendiri kepala keluarga\n2\. keluarga Wati WA/);
  r = await kata(ANGGOTA, "2"); assert.match(r.j.balasan, /Boleh dilewati/); assert.ok(!/Nomor HP/.test(r.j.balasan), "HP hanya milik kepala keluarga");
  r = await kata(ANGGOTA, "lewati semua"); assert.match(r.j.balasan, /Ringkasan pengungsi/, "anak: tanpa permintaan foto wajah"); assert.match(r.j.balasan, /Kepala keluarga: keluarga Wati WA/);
  const tolakAnak = await waFoto(ANGGOTA); assert.equal(tolakAnak.s, 409); assert.match(tolakAnak.j.balasan, /di bawah 18 tahun/);
  await kata(ANGGOTA, "simpan");
  const anak = await DB.prepare("SELECT data FROM lj_objek WHERE jenis = 'jiwa' AND oleh = ? AND klien_id LIKE 'wa-%' ORDER BY urut DESC").bind("tim:" + ANGGOTA).first(); assert.equal(JSON.parse(anak.data).kk, wati.id); assert.equal(JSON.parse(anak.data).umur, 10);

  r = await kata(ANGGOTA, "lagi"); r = await jalan(ANGGOTA, "Tolak WA", "40", "1", "1", "tidak ada", "lewati semua"); assert.match(r.j.balasan, /Kirim foto wajah/);
  r = await kata(ANGGOTA, "menolak"); assert.match(r.j.balasan, /Dicatat: menolak difoto/); assert.match(r.j.balasan, /Ringkasan pengungsi/);
  await kata(ANGGOTA, "simpan");
  const tolak = await DB.prepare("SELECT id, data FROM lj_objek WHERE jenis = 'jiwa' AND oleh = ? AND klien_id LIKE 'wa-%' ORDER BY urut DESC").bind("tim:" + ANGGOTA).first();
  assert.equal(JSON.parse(tolak.data).menolak_foto, true); assert.equal(await n("lj_media", `objek = '${tolak.id}'`), 0);
  await kata(ANGGOTA, "selesai"); assert.equal(await n("lj_sesi", `wa = '${ANGGOTA}'`), 0);
});

uji("WA jiwa tanpa tempat pengungsian di berkas: diarahkan mengisi tempat dulu; titik di berkas lain tidak muncul", async () => {
  await DB.prepare("UPDATE lj_objek SET status = 'batal' WHERE berkas = ? AND jenis = 'jiwa'").bind(berkasId).run();
  await DB.prepare("UPDATE lj_objek SET status = 'batal' WHERE berkas = ? AND jenis = 'titik'").bind(berkasId).run();
  const r = await kata(ANGGOTA, "data pengungsi"); assert.equal(r.s, 200); assert.match(r.j.balasan, /Belum ada tempat pengungsian/); assert.equal(await n("lj_sesi", `wa = '${ANGGOTA}'`), 0);
  await DB.prepare("UPDATE lj_objek SET status = 'aktif' WHERE berkas = ? AND jenis IN ('jiwa', 'titik')").bind(berkasId).run();
});

/* ---------- LJ-06 sesudah pemeriksaan: persetujuan wajah, teks bersih, batas titik, tutup TP, guard atomik ---------- */
const hariWib = new Date(Date.now() + 7 * 36e5).toISOString().slice(0, 10);
const batalWeb = (o, alasan = "salah catat ulang") => api("POST", "/api/lapor/data/batal", {objek: o.id, rev: o.rev, alasan}, {cookie: kuki, ...XPB});

uji("S2 teks titik bersih: nama dan desa memuat surel atau nomor ditolak 400 dengan butirnya; urutan gerbang foto: jenis salah 400 sebelum objek dicari", async () => {
  await DB.prepare("DELETE FROM laju_bnpb").run();
  const a = await tulis({jenis: "titik", isian: {...TITIK, nama: "Posko hubungi budi@contoh.id"}}); assert.equal(a.s, 400); assert.deepEqual(a.j.isian, ["nama"]);
  const b = await tulis({jenis: "titik", isian: {...TITIK, desa: "Paledang 081234567890"}}); assert.equal(b.s, 400); assert.deepEqual(b.j.isian, ["desa"]);
  assert.equal((await api("POST", "/api/lapor/data/foto", {objek: "f".repeat(16), jenis: "video", data: "x"}, {cookie: kuki, ...XPB})).s, 400);
});

uji("S3 batas titik: 30 aktif per berkas = 409; titik baru dibatasi 30 per jam per IP (429)", async () => {
  await DB.prepare("DELETE FROM laju_bnpb").run();
  const ada = await n("lj_objek", `berkas = '${berkasId}' AND jenis = 'titik' AND status = 'aktif'`);
  await DB.batch(Array.from({length: 30 - ada}, (_, i) => DB.prepare("INSERT INTO lj_objek (id, berkas, jenis, urut, data, titik_id, oleh, dibuat, diubah) VALUES (?, ?, 'titik', ?, '{}', ?, 'uji', ?, ?)")
    .bind(`z${String(i).padStart(15, "0")}`, berkasId, 500 + i, `TP-F${String(i).padStart(7, "0")}`, kini, kini)));
  const r = await tulis({jenis: "titik", isian: {...TITIK, nama: "Ke-31"}}); assert.equal(r.s, 409); assert.match(r.j.galat, /paling banyak 30/);
  let s = 0; for (let i = 0; i < 30; i++) s = (await tulis({jenis: "titik", isian: {...TITIK, nama: "Ke-31"}})).s;
  assert.equal(s, 429, "laju lapor.data.titik 30 per jam");
  await DB.prepare("DELETE FROM lj_objek WHERE id LIKE 'z%' AND berkas = ?").bind(berkasId).run(); await DB.prepare("DELETE FROM laju_bnpb").run();
});

uji("R2 batal titik menutup TP buatan berkas ini (hari ini WIB); TP tautan milik pihak lain tidak disentuh; batal tanpa rev yang cocok tidak menutup", async () => {
  const buat = (await tulis({jenis: "titik", isian: {...TITIK, nama: "Titik Salah Buat"}})).j.objek;
  assert.equal((await batalWeb({id: buat.id, rev: buat.rev + 9})).s, 409); assert.equal((await tp(buat.titik_id)).tutup, null);
  assert.equal((await batalWeb(buat)).s, 200); assert.equal((await tp(buat.titik_id)).tutup, hariWib);
  const tautan = (await tulis({jenis: "titik", isian: {...TITIK, nama: "Tautan Lagi", tp: "TP-BBBBBBBB"}}));
  if (tautan.s === 409) await DB.prepare("UPDATE lj_objek SET status = 'batal' WHERE berkas = ? AND titik_id = 'TP-BBBBBBBB'").bind(berkasId).run();
  const t2r = await tulis({jenis: "titik", isian: {...TITIK, nama: "Tautan Lagi", tp: "TP-BBBBBBBB"}}); assert.equal(t2r.s, 201, t2r.t); const t2 = t2r.j.objek; assert.equal(t2.titik_id, "TP-BBBBBBBB");
  assert.equal((await batalWeb(t2)).s, 200); assert.equal((await tp("TP-BBBBBBBB")).tutup, null, "milik meja: tidak ditutup");
});

uji("guard atomik di SQL: batal titik berjiwa dan simpan jiwa ke titik yang sudah batal sama-sama changes 0, tidak ada baris tertulis", async () => {
  const jaga = async stmts => (await H.ljBatch(env, H.pelakuLjTim, stmts))[0].meta.changes;
  const titik = (await api("GET", "/api/lapor/data/berkas", undefined, {cookie: kuki})).j.objek.find(x => x.titik_id === tp1);
  assert.equal(await jaga([H.ljStmtObjekBatal(env, H.pelakuLjTim, titik.id, berkasId, titik.rev, kini, titik.titik_id)]), 0, "masih ada jiwa aktif");
  const t = (await tulis({jenis: "titik", isian: {...TITIK, nama: "Akan Batal"}})).j.objek; await batalWeb(t);
  const sebelum = await n("lj_objek", "jenis = 'jiwa'");
  const baris = {id: "c".repeat(16), berkas: berkasId, jenis: "jiwa", data: "{}", pribadi: null, titik_id: t.titik_id, syaratTitik: t.titik_id, oleh: "uji"};
  assert.equal(await jaga([H.ljStmtObjekBaru(env, H.pelakuLjTim, baris, kini)]), 0, "titik sudah batal: INSERT jiwa tidak terjadi");
  assert.equal(await n("lj_objek", "jenis = 'jiwa'"), sebelum);
  const ada = (await api("GET", "/api/lapor/data/berkas", undefined, {cookie: kuki})).j.objek.find(x => x.id === jiwa3.id);
  assert.equal(await jaga([H.ljStmtObjekUbah(env, H.pelakuLjTim, {id: ada.id, berkas: berkasId, data: JSON.stringify(ada.data), pribadi: null, titik_id: t.titik_id, syaratTitik: t.titik_id}, ada.rev, kini)]), 0, "UPDATE jiwa ke titik batal ditolak");
});

uji("R4 kepala keluarga harus di titik yang sama dengan jiwanya", async () => {
  const lain = (await tulis({jenis: "titik", isian: {...TITIK, nama: "Titik Lain KK"}, lat: -6.7, lon: 106.9})).j.objek.titik_id;
  const kk = (await tulis({jenis: "jiwa", isian: {...JIWA, titik: lain, nama: "KK Lain Titik", nik: undefined}})).j.objek;
  const x = await tulis({jenis: "jiwa", isian: {...JIWA, titik: tp1, nama: "Beda Titik", kk: kk.id, hp: undefined}}); assert.equal(x.s, 400); assert.ok(x.j.isian.includes("kk"));
  const ok = await tulis({jenis: "jiwa", isian: {...JIWA, titik: lain, nama: "Se Titik", kk: kk.id, hp: undefined}}); assert.equal(ok.s, 201, ok.t);
});

uji("S1 web: ubah jiwa jadi anak atau menolak difoto menghapus baris wajah dan berkas R2, jejak mencatat; tetap dewasa tidak menghapus", async () => {
  const B64 = Buffer.from(JPEG_SAH).toString("base64"), r2 = await U.mf.getR2Bucket("MEDIA");
  const buat = async nama => { const o = (await tulis({jenis: "jiwa", isian: {...JIWA, titik: tp1, nama, nik: undefined}})).j.objek;
    const f = await api("POST", "/api/lapor/data/foto", {objek: o.id, jenis: "wajah", data: B64}, {cookie: kuki, ...XPB}); assert.equal(f.s, 201, f.t);
    const k = (await DB.prepare("SELECT kunci_r2 FROM lj_media WHERE id = ?").bind(f.j.foto).first()).kunci_r2; assert.ok(await r2.head(k)); return {o: f.j.objek, k}; };
  const a = await buat("Jadi Anak"), b = await buat("Jadi Menolak"), c = await buat("Tetap Dewasa");
  const tetap = await tulis({id: c.o.id, rev: c.o.rev, isian: {...JIWA, titik: tp1, nama: "Tetap Dewasa", umur: 41, nik: undefined}}); assert.equal(tetap.s, 200); assert.ok(await r2.head(c.k)); assert.equal(await n("lj_media", `objek = '${c.o.id}'`), 1);
  const u1 = await tulis({id: a.o.id, rev: a.o.rev, isian: {...JIWA, titik: tp1, nama: "Jadi Anak", umur: 12, kk: a.o.data.kk, nik: undefined, hp: undefined, kk: jiwa3.id}}); assert.equal(u1.s, 200, u1.t);
  assert.equal(await n("lj_media", `objek = '${a.o.id}'`), 0); assert.equal(await r2.head(a.k), null); assert.deepEqual(u1.j.objek.kurang_foto, {foto: 0, wajah: 0});
  assert.equal(await n("lj_jejak", `objek = '${a.o.id}' AND aksi = 'hapus_wajah'`), 1);
  const u2 = await tulis({id: b.o.id, rev: b.o.rev, isian: {...JIWA, titik: tp1, nama: "Jadi Menolak", nik: undefined, menolak_foto: true}}); assert.equal(u2.s, 200, u2.t);
  assert.equal(await n("lj_media", `objek = '${b.o.id}'`), 0); assert.equal(await r2.head(b.k), null);
});

uji("S1 WA: ubah umur jadi anak sesudah foto wajah membuang foto draf dan tidak ada lj_media; menolak lewat ubah juga; paksa titik hilang saat lokasi berubah; KK tanpa nama", async () => {
  await DB.prepare("DELETE FROM laju_bnpb").run();
  const r2 = await U.mf.getR2Bucket("MEDIA"), draf = async () => (await r2.list({prefix: `lapor/data/${berkasId}/draf/`})).objects.length;
  const mulai = await kata(ANGGOTA, "data pengungsi"), no = adaDi(mulai.j.balasan, "Posko WA");
  await jalan(ANGGOTA, String(no), "Umur Ubah", "40", "2", "Paledang", "hari ini", "1", "tidak ada", "lewati semua");
  let f = await waFoto(ANGGOTA); assert.match(f.j.balasan, /Foto wajah: 1/); assert.equal(await draf(), 1);
  let r = await kata(ANGGOTA, "ubah umur"); r = await kata(ANGGOTA, "10"); assert.match(r.j.balasan, /Foto wajah: 0/); assert.equal(await draf(), 0, "foto draf dibuang dari R2");
  assert.ok(!JSON.parse((await DB.prepare("SELECT keadaan FROM lj_sesi WHERE wa = ?").bind(ANGGOTA).first()).keadaan).buang?.length, "daftar buang dikosongkan");
  r = await kata(ANGGOTA, "simpan"); assert.match(r.j.balasan, /sudah masuk/);
  const o = await DB.prepare("SELECT id FROM lj_objek WHERE jenis = 'jiwa' AND oleh = ? AND klien_id LIKE 'wa-%' ORDER BY urut DESC").bind("tim:" + ANGGOTA).first(); assert.equal(await n("lj_media", `objek = '${o.id}'`), 0);
  await kata(ANGGOTA, "selesai");
  // menolak lewat ubah sesudah foto
  await jalan(ANGGOTA, "data pengungsi", String(no), "Mau Tolak", "40", "1", "Paledang", "hari ini", "1", "tidak ada", "lewati semua");
  await waFoto(ANGGOTA); assert.equal(await draf(), 1); await kata(ANGGOTA, "ubah menolak foto"); r = await kata(ANGGOTA, "1"); assert.match(r.j.balasan, /Foto wajah: 0/); assert.equal(await draf(), 0);
  await kata(ANGGOTA, "batal");
  // paksa hilang saat lokasi berubah
  await jalan(ANGGOTA, "data pengungsian", "Posko Dekat", "Paledang", "1", "1", "hari ini", "1", "1", "2", "2", "2", "2", "lewati semua");
  await kata(ANGGOTA, "", {lokasi: {lat: -6.6004, lon: 106.8}}); await kata(ANGGOTA, "lewati");
  r = await kata(ANGGOTA, "simpan"); assert.match(r.j.balasan, /kurang dari 200 m/);
  const keadaan = async () => JSON.parse((await DB.prepare("SELECT keadaan FROM lj_sesi WHERE wa = ?").bind(ANGGOTA).first()).keadaan);
  assert.equal((await keadaan()).paksa, true);
  await kata(ANGGOTA, "", {lokasi: {lat: -6.8, lon: 107.0}}); assert.equal((await keadaan()).paksa, undefined, "lokasi berubah: izin paksa dicabut");
  r = await kata(ANGGOTA, "simpan"); assert.match(r.j.balasan, /sudah masuk/); await kata(ANGGOTA, "selesai");
  // R3: kepala keluarga tanpa nama tampil "tanpa nama"
  const tpDekat = (await DB.prepare("SELECT id FROM titik_pengungsian WHERE nama = 'Posko Dekat'").first()).id;
  await DB.prepare("INSERT INTO lj_objek (id, berkas, jenis, urut, data, pribadi, titik_id, oleh, dibuat, diubah) VALUES (?, ?, 'jiwa', 900, ?, NULL, ?, 'uji', ?, ?)")
    .bind("8".repeat(16), berkasId, JSON.stringify({titik: tpDekat, kk: "diri", umur: 30, jk: "p", masuk: "2026-11-01", desa_asal: "X"}), tpDekat, kini, kini).run();
  const m2 = await kata(ANGGOTA, "data pengungsi"), n2 = adaDi(m2.j.balasan, "Posko Dekat");
  r = await jalan(ANGGOTA, String(n2), "Anggota X", "5", "1", "Paledang", "hari ini"); assert.match(r.j.balasan, /2\. keluarga tanpa nama/);
  await kata(ANGGOTA, "batal");
});
