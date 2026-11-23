/* LJ-03: pembukaan berkas data lanjutan dan rute baca (src/lapor_lanjut.js, migrasi 0161; paket data/kajian-bnpb/lapor-lanjutan, RENCANA-UJI bagian 2).
   worker.js utuh di workerd (Miniflare), D1 sungguhan dengan migrasi apa adanya, tanpa mock. Tiket terkirim disisipkan langsung (alur percakapan BPBD
   diuji di tests/lapor/rute.test.mjs); bukaBerkas dipanggil dengan D1 yang sama, persis yang dipanggil pesan() sesudah tiket terkirim.
   Nomor WA rekaan, bukan nomor pemilik. Jalan: node --test tests/lapor/lanjut_rute.test.mjs */
import assert from "node:assert/strict";
import {siapkan, berantai, ADMIN, sha256} from "../warga/_bnpb.mjs";
import {JPEG_SAH} from "../warga/_bantu.mjs";
import {profilAktif} from "../warga/_profil.mjs";
import "../../src/worker.js";
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
  assert.equal((await tulis({jenis: "jiwa", isian: {}})).s, 400, "jiwa menyusul di LJ-06");
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
