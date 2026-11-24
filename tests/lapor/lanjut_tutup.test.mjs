/* LJ-13: penutupan berkas data lanjutan (D13, D14, D23, Q2, Q7): kondisi akhir dari daftar, versi beku tanpa data pribadi (sidik objek HMAC berkunci),
   tulis objek, foto, batal, dan nihil terkunci di SQL begitu berkas tidak terbuka, terima staf Pusdalops, tiket LA- ke selesai, buka lagi jadi versi baru.
   Paket data/kajian-bnpb/lapor-lanjutan, RENCANA-UJI baris 17, 42, 43, 81. worker.js utuh di workerd (Miniflare), D1 sungguhan, tanpa mock.
   Nomor WA dan nama rekaan, bukan nomor pemilik. Jalan: node --test tests/lapor/lanjut_tutup.test.mjs */
import assert from "node:assert/strict";
import {siapkan, berantai, sha256} from "../warga/_bnpb.mjs";
import "../../src/worker.js";
import {bukaBerkas} from "../../src/lapor_lanjut.js";
import * as H from "../../src/hak.js";

const uji = berantai();
const U = await siapkan("uji-lapor-tutup", {r2: true, ikat: {WA_MESIN: "mesin-rahasia"}}), {api, DB, n} = U;
const env = {DB}, ASAL = "http://bnpb.lokal", kini = Date.now(), XPB = {"x-pb": "1", origin: ASAL}, MESIN = {authorization: "Bearer mesin-rahasia"};
const KETUA = "6281299660001", AGT = "6281299660002", BOGOR = {provKode: "32", prov: "Jawa Barat", kabKode: "32.71", kab: "Kota Bogor", kecKode: "32.71.03", desa: "Paledang"};
const INDUK = "LA-241126-01";
const hari = (g = 0) => new Date(Date.now() + 7 * 36e5 + g * 864e5).toISOString().slice(0, 10);
let berkasId, kuki, kukiAgt, pusdal;

const tulis = (b, h = {cookie: kuki, ...XPB}) => api("POST", "/api/lapor/data/objek", b, h);
const tutup = (b, h = {cookie: kuki, ...XPB}) => api("POST", "/api/lapor/data/tutup", b, h);
const terima = (b, h) => api("POST", "/api/lapor/data/terima", b, h ?? pusdal);
const wa = (nomor, teks) => api("POST", "/api/lapor/pesan", {wa: nomor, teks}, MESIN);
const berkas = () => DB.prepare("SELECT * FROM lj_berkas WHERE id = ?").bind(berkasId).first();
const beku = () => DB.prepare("SELECT * FROM lj_beku WHERE berkas = ? ORDER BY versi").bind(berkasId).all().then(r => r.results);
const KORBAN = {status: "hilang", nama: "Rani Rahasia", umur: 30, jk: "p", desa: "Paledang", kontak_nama: "Dedi Kontak", kontak_hp: "081299660099", terakhir_lokasi: "Dekat sungai",
  terakhir_waktu: hari(-2), pencarian: "dicari", ciri: "Tahi lalat pipi kiri"};
const RUMAH = {kk: "Budi Rahasia", desa: "Paledang", kec: "Bogor Tengah", alamat: "RT 01 RW 02", tingkat: "rb", terendam: false, huni: "mengungsi", jiwa: 4};
const sesiStaf = async (id, peran, wilayah = []) => { const tok = (id.slice(0, 2) + "7e").repeat(32).slice(0, 64);
  await DB.batch([DB.prepare(`INSERT INTO staf (id, username, nama, nip, unit, email, wa, peran, wilayah, garam, sandi_sha, wajib_ganti, dibuat, dibuat_oleh, dummy)
    VALUES (?, ?, 'Nama', ?, 'Unit', ?, ?, ?, ?, 'gggggggggggggggggggggggggggggggg', ?, 0, 1, 'tes', 0)`).bind(id, "uji" + id.slice(0, 6), "300" + id.slice(0, 4), id.slice(0, 4) + "@b.id", "6281300" + id.slice(0, 5), JSON.stringify([peran]), JSON.stringify(wilayah), "a".repeat(64)),
    DB.prepare("INSERT INTO staf_sesi (token_sha, staf_id, dibuat, kedaluwarsa) VALUES (?, ?, 1, ?)").bind(sha256(tok), id, Date.now() + 3600e3)]);
  return {cookie: `sesi_staf=${tok}`, origin: ASAL, "x-pb": "1"}; };

uji("siapkan: tiket terkirim, berkas terbuka, ketua dan anggota masuk dengan kuki", async () => {
  await DB.prepare("INSERT INTO lapor_izin (wa, peran, kab, oleh, dibuat) VALUES (?, 'bpbd', 'Kota Bogor', 'uji', ?)").bind(KETUA, kini).run();
  const kerja = {tingkat: "bpbd", isian: {lokasi: {nilai: {lat: -6.6, lon: 106.8, wilayah: BOGOR}}, jenis: {nilai: "banjir"}}, transkrip: []};
  await DB.batch([DB.prepare(`INSERT INTO lapor_sesi (id, wa, status, tingkat, jenis, kab, lat, lon, nomor, token_sha, terkirim, kerja, ringkas, rev, dibuat, diubah)
      VALUES (?, ?, 'terkirim', 'bpbd', 'banjir', '32.71', -6.6, 106.8, ?, ?, ?, ?, '{}', 0, ?, ?)`).bind("s" + INDUK, KETUA, INDUK, sha256(INDUK), kini, JSON.stringify(kerja), kini, kini),
    DB.prepare("INSERT INTO lapor_tiket (nomor, sesi, status, diubah) VALUES (?, ?, 'ditindaklanjuti', ?)").bind(INDUK, "s" + INDUK, kini)]);
  const r = await bukaBerkas(env, INDUK, kini, ASAL); assert.equal(r.buka, true); berkasId = r.berkas;
  const t = /\?t=([0-9a-f]{32})/.exec((await DB.prepare("SELECT teks FROM lj_kabar WHERE wa = ?").bind(KETUA).first()).teks)[1];
  const m = await api("POST", "/api/lapor/data/masuk", {t}, XPB); assert.equal(m.s, 200, m.t); kuki = m.h.get("set-cookie").split(";")[0];
  const a = await api("POST", "/api/lapor/data/tim", {aksi: "tambah", wa: AGT, nama: "Anggota Uji"}, {cookie: kuki, ...XPB}); assert.equal(a.s, 200, a.t);
  const ta = /\?t=([0-9a-f]{32})/.exec((await DB.prepare("SELECT teks FROM lj_kabar WHERE wa = ? AND jenis = 'tim'").bind(AGT).first()).teks)[1];
  kukiAgt = (await api("POST", "/api/lapor/data/masuk", {t: ta}, XPB)).h.get("set-cookie").split(";")[0];
  pusdal = await sesiStaf("55555e5e5e5e5e5e", "pusdalops");
  assert.equal((await tulis({jenis: "korban", isian: KORBAN})).s, 201); assert.equal((await tulis({jenis: "rumah", isian: RUMAH})).s, 201);
});

uji("pratinjau tanpa konfirmasi tidak menulis; anggota 403; tanggal masa depan, terlalu lama, salah bentuk, dan SK bukan nomor ditolak (Q7: tanpa minimum objek)", async () => {
  const p = await tutup({tgl_selesai: hari()}); assert.equal(p.s, 200, p.t); assert.equal(p.j.pratinjau, true);
  assert.equal(p.j.kondisi.status, "selesai_catatan"); assert.deepEqual(p.j.kondisi.alasan.find(x => x.metrik === "hilang"), {metrik: "hilang", nilai: 1, teks: "korban hilang belum ditemukan"});
  assert.equal(p.j.kondisi.alasan.find(x => x.metrik === "prasarana_putus").nilai, null, "prasarana belum didata: alasan, bukan 0");
  assert.equal((await berkas()).status, "terbuka"); assert.equal(await n("lj_beku"), 0);
  assert.equal((await tutup({tgl_selesai: hari(), konfirmasi: true}, {cookie: kukiAgt, ...XPB})).s, 403);
  for (const salah of [{tgl_selesai: hari(1)}, {tgl_selesai: "2026-02-30"}, {}, {tgl_selesai: hari(), sk_nomor: "SK <b>12</b>"}, {tgl_selesai: hari(), sk_nomor: "081299660099"}, {tgl_selesai: "2020-01-01"}, {tgl_selesai: hari(), sk_tanggal: hari(2)}])
    assert.equal((await tutup({...salah, konfirmasi: true})).s, 400, JSON.stringify(salah));
  assert.equal((await tutup({tgl_selesai: hari(), konfirmasi: true}, {cookie: kuki})).s, 403, "tanpa x-pb");
  assert.equal(await n("lj_beku"), 0);
});

uji("tanggal selesai mundur tidak menyembunyikan pengungsi: jiwa aktif yang masuk sesudahnya menolak penutupan (tinjauan validasi-model)", async () => {
  const k = Date.now(), jw = "9".repeat(16);
  await DB.prepare("INSERT INTO lj_objek (id, berkas, jenis, urut, data, oleh, dibuat, diubah) VALUES (?, ?, 'jiwa', 99, ?, 'uji', ?, ?)").bind(jw, berkasId, JSON.stringify({umur: 30, jk: "p", masuk: hari(-1)}), k, k).run();
  const r = await tutup({tgl_selesai: hari(-3), konfirmasi: true}); assert.equal(r.s, 400, r.t); assert.match(r.j.galat, /masuk pengungsi/);
  assert.equal((await tutup({tgl_selesai: hari()})).j.kondisi.alasan.find(x => x.metrik === "mengungsi").nilai, 1, "hari ini: masih mengungsi");
  await DB.prepare("DELETE FROM lj_objek WHERE id = ?").bind(jw).run(); assert.equal(await n("lj_beku"), 0);
});

uji("usul tutup: status usul_tutup, versi 1 tanpa data pribadi, sidik objek berkunci (bukan SHA-256 polos), jejak tercatat (RENCANA-UJI 17, 42)", async () => {
  const r = await tutup({tgl_selesai: hari(), sk_nomor: "SK 12/2026", catatan: "Budi Santoso belum ditemukan", konfirmasi: true}); assert.equal(r.s, 200, r.t);
  assert.equal(r.j.status, "usul_tutup"); assert.equal(r.j.status_akhir, "selesai_catatan"); assert.equal(r.j.versi, 1);
  const b = await berkas(), pen = JSON.parse(b.isian).penutupan; assert.equal(b.status, "usul_tutup"); assert.equal(b.ditutup, null, "ditutup baru saat staf menerima (D23)");
  assert.deepEqual(pen, {tgl_selesai: hari(), sk_nomor: "SK 12/2026", sk_tanggal: null, status: "selesai_catatan"}, "tanpa catatan bebas: nama polos tidak masuk versi beku permanen");
  const [v] = await beku(); assert.equal(v.versi, 1); assert.equal(v.sidik, r.j.sidik); assert.equal(v.sidik, sha256(v.isi)); assert.equal(v.oleh, "ketua");
  for (const x of ["Budi Santoso", "Rani Rahasia", "Budi Rahasia", "Dedi Kontak", "081299660099", "6281299660099", KETUA, "pribadi"]) assert.ok(!v.isi.includes(x), `${x} tidak masuk versi beku`);
  const isi = JSON.parse(v.isi); assert.equal(isi.objek.length, 2); assert.equal(isi.kondisi_akhir.status, "selesai_catatan"); assert.equal(isi.rekap.hilang, 1);
  const ob = await DB.prepare("SELECT id, data, pribadi FROM lj_objek WHERE berkas = ? AND jenis = 'korban'").bind(berkasId).first(), s = isi.objek.find(x => x.id === ob.id).sidik;
  const kanon = `{"data":${JSON.stringify(ob.data)},"pribadi":${JSON.stringify(ob.pribadi)}}`;
  assert.notEqual(s, sha256(kanon), "sidik objek bukan SHA-256 polos: HP dan NIK tidak bisa ditebak dari versi");
  assert.equal(await n("lj_jejak", `berkas = '${berkasId}' AND aksi = 'usul_tutup'`), 1);
});

uji("berkas usul_tutup terkunci: rute tulis 409; pernyataan SQL objek, ubah, batal, titik, foto, nihil kalah walau pemeriksaan kode terlewati (balapan tutup lawan tulis)", async () => {
  assert.equal((await tulis({jenis: "rumah", isian: RUMAH})).s, 409);
  assert.equal((await tutup({tgl_selesai: hari(), konfirmasi: true})).s, 409, "usul ulang ditolak");
  assert.equal((await api("POST", "/api/lapor/data/nihil", {metrik: "meninggal", nihil: true}, {cookie: kuki, ...XPB})).s, 409);
  const o = await DB.prepare("SELECT * FROM lj_objek WHERE berkas = ? AND jenis = 'rumah'").bind(berkasId).first(), T = H.pelakuLjTim, kini2 = Date.now();
  const baru = {id: "f".repeat(16), berkas: berkasId, jenis: "rumah", data: o.data, pribadi: null, oleh: "uji"};
  const r = await H.ljBatch(env, T, [H.ljStmtObjekBaru(env, T, baru, kini2), H.ljStmtObjekUbah(env, T, {...baru, id: o.id}, o.rev, kini2), H.ljStmtObjekBatal(env, T, o.id, berkasId, o.rev, kini2),
    H.ljStmtObjekTitik(env, T, o.id, -6.6, 106.8, kini2),
    H.ljStmtMediaBaru(env, T, {id: "e".repeat(16), objek: o.id, kunci_r2: "lapor/data/x.jpg", jenis: "foto", waktu_terima: kini2, lencana: "tanpa", pintu: "web", oleh: "uji"}, 10),
    H.ljStmtNihil(env, T, berkasId, "meninggal", true, kini2)]);
  assert.deepEqual(r.map(x => x.meta.changes), [0, 0, 0, 0, 0, 0]);
  assert.equal(await n("lj_objek", `berkas = '${berkasId}'`), 2); assert.equal(await n("lj_media"), 0);
});

uji("usul tutup kalah bila objek berubah sesudah dihitung: diubah berkas atau max(diubah) objek tidak sama", async () => {
  const T = H.pelakuLjTim, b = await DB.prepare("SELECT id, diubah FROM lj_berkas WHERE id = ?").bind(berkasId).first();
  const r = await H.ljBatch(env, T, [H.ljStmtUsulTutup(env, T, berkasId, "{}", b.diubah, 1, Date.now())]); assert.equal(r[0].meta.changes, 0, "status bukan terbuka, dan objek lebih baru");
});

uji("terima: hanya staf Pusdalops; status jadi selesai_catatan, ditutup terisi, tiket LA- ke selesai dengan riwayat dan kabar, ketua dikabari (Q2, RENCANA-UJI 43)", async () => {
  assert.equal((await terima({berkas: berkasId, aksi: "tutup"}, {cookie: kuki, ...XPB})).s, 401, "tim berkas tidak bisa menerima sendiri");
  const luar = await sesiStaf("66666f6f6f6f6f6f", "pusdalops", ["31"]); assert.equal((await terima({berkas: berkasId, aksi: "tutup"}, luar)).s, 403, "wilayah lain");
  const r = await terima({berkas: berkasId, aksi: "tutup"}); assert.equal(r.s, 200, r.t); assert.equal(r.j.status, "selesai_catatan"); assert.equal(r.j.tiket_selesai, true);
  const b = await berkas(); assert.equal(b.status, "selesai_catatan"); assert.ok(b.ditutup > 0);
  assert.equal((await DB.prepare("SELECT status FROM lapor_tiket WHERE nomor = ?").bind(INDUK).first()).status, "selesai");
  assert.equal(await n("lapor_tiket_riwayat", `nomor = '${INDUK}' AND ke = 'selesai'`), 1);
  assert.match((await DB.prepare("SELECT teks FROM lapor_kabar WHERE nomor = ? AND jenis = 'status'").bind(INDUK).first()).teks, /Selesai ditangani/);
  const k = await DB.prepare("SELECT teks FROM lj_kabar WHERE wa = ? AND jenis = 'tutup'").bind(KETUA).first(); assert.match(k.teks, /diterima Pusdalops BNPB, dengan catatan/);
  assert.ok(!k.teks.includes("Rani"), "tanpa nama korban di pesan");
  assert.equal((await terima({berkas: berkasId, aksi: "tutup"})).s, 409, "terima ulang ditolak");
  assert.equal((await tulis({jenis: "rumah", isian: RUMAH})).s, 409, "berkas selesai tetap terkunci");
});

uji("buka lagi: wajib alasan; ditutup kosong (hitungan 5 tahun mulai ulang), tulis boleh lagi; tutup kedua jadi versi 2 dan versi 1 utuh (ALUR 8, RENCANA-UJI 81)", async () => {
  const v1 = (await beku())[0];
  assert.equal((await terima({berkas: berkasId, aksi: "buka"})).s, 400); assert.equal((await terima({berkas: berkasId, aksi: "buka", alasan: "ok"})).s, 400);
  assert.equal((await terima({berkas: berkasId, aksi: "buka", alasan: "telp 081299660099 dulu"})).s, 400, "nomor di alasan");
  const r = await terima({berkas: berkasId, aksi: "buka", alasan: "Korban hilang ditemukan, mohon diperbarui"}); assert.equal(r.s, 200, r.t);
  let b = await berkas(); assert.equal(b.status, "terbuka"); assert.equal(b.ditutup, null); assert.equal(JSON.parse(b.isian).penutupan, undefined);
  assert.match((await DB.prepare("SELECT teks FROM lj_kabar WHERE wa = ? AND jenis = 'tutup' ORDER BY id DESC").bind(KETUA).first()).teks, /dibuka lagi.*Korban hilang ditemukan/s);
  assert.equal((await terima({berkas: berkasId, aksi: "buka", alasan: "Dibuka dua kali"})).s, 409);
  const ob = await DB.prepare("SELECT id, rev FROM lj_objek WHERE berkas = ? AND jenis = 'korban'").bind(berkasId).first();
  const u = await tulis({id: ob.id, rev: ob.rev, isian: {...KORBAN, pencarian: "ditemukan_hidup"}}); assert.equal(u.s, 200, u.t);
  for (const m of ["prasarana_putus", "mengungsi"]) assert.equal((await api("POST", "/api/lapor/data/nihil", {metrik: m, nihil: true}, {cookie: kuki, ...XPB})).s, 200, m);
  const t = await tutup({tgl_selesai: hari(), konfirmasi: true}); assert.equal(t.s, 200, t.t); assert.equal(t.j.versi, 2);
  assert.equal(t.j.status_akhir, "selesai", "hilang 0 dari data, mengungsi dan putus nihil: selesai tanpa catatan (D13)");
  const vs = await beku(); assert.equal(vs.length, 2); assert.deepEqual(vs[0], v1, "versi 1 tidak berubah"); assert.notEqual(vs[1].sidik, v1.sidik);
  assert.equal((await terima({berkas: berkasId, aksi: "tutup"})).s, 200); b = await berkas(); assert.equal(b.status, "selesai");
});

uji("tiket dengan dua berkas: tiket tetap terbuka sampai semua berkasnya ditutup", async () => {
  const nomor = "LA-241126-02", id2 = "c".repeat(16), id3 = "d".repeat(16), k = Date.now();
  await DB.batch([DB.prepare("INSERT INTO lapor_tiket (nomor, sesi, status, diubah) VALUES (?, 'sesi-dua', 'ditindaklanjuti', ?)").bind(nomor, k),
    DB.prepare("INSERT INTO lapor_sesi (id, wa, status, tingkat, jenis, kab, nomor, token_sha, terkirim, kerja, ringkas, rev, dibuat, diubah) VALUES ('sesi-dua', ?, 'terkirim', 'bpbd', 'banjir', '32.71', ?, ?, ?, '{}', '{}', 0, ?, ?)").bind(KETUA, nomor, sha256(nomor), k, k, k),
    ...[[id2, "32.71"], [id3, "32.73"]].map(([i, kab]) => DB.prepare("INSERT INTO lj_berkas (id, induk, kab, status, isian, dibuat, diubah) VALUES (?, ?, ?, 'usul_tutup', ?, ?, ?)").bind(i, nomor, kab, JSON.stringify({penutupan: {status: "selesai"}}), k, k))]);
  const a = await terima({berkas: id2, aksi: "tutup"}); assert.equal(a.s, 200, a.t); assert.equal(a.j.tiket_selesai, false);
  assert.equal((await DB.prepare("SELECT status FROM lapor_tiket WHERE nomor = ?").bind(nomor).first()).status, "ditindaklanjuti");
  const b = await terima({berkas: id3, aksi: "tutup"}); assert.equal(b.s, 200, b.t); assert.equal(b.j.tiket_selesai, true);
  assert.equal((await DB.prepare("SELECT status FROM lapor_tiket WHERE nomor = ?").bind(nomor).first()).status, "selesai");
});

uji("WA: ketua *tutup* mengusulkan penutupan dengan tanggal hari ini; anggota ditolak; tanggal masa depan ditolak; berkas terkunci sesudahnya", async () => {
  await terima({berkas: berkasId, aksi: "buka", alasan: "Uji penutupan lewat WhatsApp"});
  assert.match((await wa(AGT, "tutup")).j.balasan, /Hanya ketua tim/);
  assert.match((await wa(KETUA, `tutup 01-01-${new Date().getUTCFullYear() + 1}`)).j.balasan, /masa depan/);
  const r = await wa(KETUA, "tutup"); assert.equal(r.s, 200, r.t); assert.match(r.j.balasan, /diusulkan.*menunggu diterima Pusdalops/s);
  const b = await berkas(); assert.equal(b.status, "usul_tutup"); assert.equal(JSON.parse(b.isian).penutupan.tgl_selesai, hari()); assert.equal((await beku()).length, 3);
  /* sesudah itu nomor ketua tidak lagi punya berkas terbuka, jadi pesannya kembali ke alur Lapor biasa (D11); tidak diuji di sini karena sesi Lapor uji ini rekaan minimal */
});
