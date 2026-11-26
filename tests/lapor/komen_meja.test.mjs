/* Meja komentar Alun-alun (src/lapor_komen.js buatKomenMeja, migrasi 0183, tiket LA-88; KEPUTUSAN-LAPOR-AI K95, D139, Q74) ujung ke ujung di workerd dengan D1 sungguhan:
   komentar warga -> usulan angka (model tiruan lewat jaringan luar) -> meja menerima -> angka kartu Alun-alun berubah dan tercatat atas nama petugas.
   Jalankan: node --test tests/lapor/komen_meja.test.mjs */
import assert from "node:assert/strict";
import {siapkan, berantai, ADMIN} from "../warga/_bnpb.mjs";
import {profilAktif} from "../warga/_profil.mjs";
import "../../src/worker.js";   // worker dulu: modul saling impor (siklus)
import {KOLOM_USUL} from "../../src/lapor_komen.js";

const uji = berantai();
const luar = async req => {
  if (new URL(req.url).hostname !== "api.anthropic.com") return new Response("diblok di uji", {status: 599});
  const angka = [{kolom: "mengungsi", nilai: 40, kutipan: "40 warga mengungsi"}, {kolom: "rumah", nilai: 12, kutipan: "12 rumah rusak"},
    {kolom: "meninggal", nilai: 0, kutipan: "tidak ada korban jiwa"}, {kolom: "terendam", nilai: 5, kutipan: "5 rumah terendam"}];
  return new Response(JSON.stringify({model: "palsu", stop_reason: "end_turn", usage: {}, content: [{type: "text", text: JSON.stringify({angka})}]}), {headers: {"content-type": "application/json"}});
};
const U = await siapkan("uji-lapor-komen-meja", {ikat: {ANTHROPIC_API_KEY: "kunci-uji"}, luar}), {api, DB, n} = U;
const PB = {"x-pb": "1"}, WA = "6281200000031", WA2 = "6281200000032", KINI = Date.now();
const BOGOR = {provKode: "32", prov: "Jawa Barat", kabKode: "32.71", kab: "Kota Bogor", kecKode: "32.71.03", kec: "Bogor Tengah", kode: "32.71.03.1001", desa: "Paledang"};
const N1 = "LA-251125-31", N2 = "LA-251125-32";
/* dua laporan banjir di desa yang sama: satu gugus, satu kartu. N2 lebih baru, jadi angka kartu dibaca dari N2 (alunBuat) */
async function laporan(id, nomor, wa, umur, mengungsi) {
  const isian = {lokasi: {nilai: {lat: -6.6, lon: 106.8, wilayah: BOGOR}}, jenis: {nilai: "banjir"}, mengungsi_jiwa: {nilai: mengungsi}};
  const ringkas = JSON.stringify({wilayah: BOGOR, dampak: {meninggal: 0, hilang: 0, luka: 0, mengungsi, rumah: 0, terendam: 0}});
  await DB.batch([
    DB.prepare(`INSERT INTO lapor_sesi (id, wa, status, tingkat, jenis, kab, lat, lon, nomor, terkirim, kerja, ringkas, rev, dibuat, diubah)
      VALUES (?1, ?2, 'terkirim', 'warga', 'banjir', '32.71', -6.6, 106.8, ?3, ?4, ?5, ?6, 0, ?4, ?4)`).bind(id, wa, nomor, KINI - umur, JSON.stringify({status: "terkirim", tingkat: "warga", isian, transkrip: []}), ringkas),
    DB.prepare("INSERT INTO lapor_tiket (nomor, sesi, status, diubah) VALUES (?1, ?2, 'ditindaklanjuti', ?3)").bind(nomor, id, KINI)]);
}
async function bpbd(kab, kabKode) {   // akun lembaga pemkot dengan sesi profil (paket profil-bpbd)
  const id = kabKode.replace(".", "").padStart(16, "0");
  await DB.prepare(`INSERT INTO instansi_akun (id, username, jenis, tingkat, wilayah, kunci_wilayah, cakupan, prov, kab, garam, sandi_sha, status, nama, nip, jabatan, unit, email, wa, surat, kartu, wajib_ganti, dibuat)
    VALUES (?, ?, 'pemkot', 'kab', 'Wilayah uji', ?, ?, '32', ?, ?, ?, 'aktif', 'Petugas Uji', '19800101', 'Kasi', 'BPBD', ?, ?, 1, 1, 0, ?)`)
    .bind(id, "kmmeja" + kabKode.replace(".", ""),`32|${kab}`, JSON.stringify(["32"]), kab, "g".repeat(32), "0".repeat(64), `km${kabKode}@b.id`, "62812009" + kabKode.replace(".", ""), KINI).run();
  return {cookie: (await profilAktif(DB, id)).cookie, origin: "http://bnpb.lokal", "x-pb": "1"};
}
const komen = (kartu, wa, teks) => api("POST", `/api/lapor/komen/${kartu}`, {wa, teks}, PB);
const meja = (nomor, h = ADMIN) => api("GET", `/api/lapor/meja/${nomor}/komen`, undefined, h);
const putus = (nomor, b, h = ADMIN) => api("POST", `/api/lapor/meja/${nomor}/komen`, b, h);
const usulDari = async (komenId, n) => { for (let i = 0; i < 40; i++) { const r = (await DB.prepare("SELECT id, kolom FROM lp_komen_usul WHERE komen = ? ORDER BY id").bind(komenId).all()).results; if (r.length >= n) return Object.fromEntries(r.map(x => [x.kolom, x.id])); await new Promise(s => setTimeout(s, 50)); } return {}; };
let kartu, kId, k2Id, usul, bogor, bandung;

uji("siapkan: satu kartu dua laporan, komentar dan usulan dari mesin", async () => {
  await laporan("sesi-meja-01", N1, "6281299990001", 7200e3, 10); await laporan("sesi-meja-02", N2, "6281299990002", 3600e3, 25);
  const a = await api("GET", "/api/lapor/alun"); assert.equal(a.j.jumlah, 1, `dua laporan satu gugus: ${a.t.slice(0, 300)}`);
  kartu = a.j.baris[0].id; assert.equal(a.j.baris[0].dampak.mengungsi, 25, "kartu membaca laporan terbaru");
  const r = await komen(kartu, WA, "Sekarang 40 warga mengungsi, 12 rumah rusak, tidak ada korban jiwa"); assert.equal(r.s, 200, r.t); kId = r.j.komen.id;
  const r2 = await komen(kartu, WA2, "Ada 5 rumah terendam di dekat sungai"); assert.equal(r2.s, 200, r2.t); k2Id = r2.j.komen.id;
  usul = {...await usulDari(kId, 3), ...await usulDari(k2Id, 1)};
  assert.deepEqual(Object.keys(KOLOM_USUL).filter(k => k in usul),["meninggal", "mengungsi", "rumah", "terendam"]);
  bogor = await bpbd("Kota Bogor", "32.71"); bandung = await bpbd("Kota Bandung", "32.73");
});

uji("meja melihat komentar dan usulan; BPBD tanpa nomor penulis; luar wilayah dan tamu ditolak", async () => {
  assert.equal((await meja(N1, {})).s, 403, "tamu");
  assert.equal((await meja(N1, bandung)).s, 404, "luar wilayah = tidak ada");
  const b = await meja(N1); assert.equal(b.s, 200, b.t);
  assert.equal(b.j.kartu.id, kartu); assert.equal(b.j.kartu.sasaran, N2, "tujuan tulis = laporan terbaru gugus"); assert.equal(b.j.kartu.anggota, 2);
  assert.equal(b.j.komen.length, 2); assert.equal(b.j.komen[0].penulis.wa, WA, "BNPB melihat nomor penulis");
  const urut = Object.keys(KOLOM_USUL);
  assert.deepEqual([...b.j.komen[0].usulan].sort((x, y) => urut.indexOf(x.kolom) - urut.indexOf(y.kolom)).map(u => `${u.kolom}=${u.nilai}:${u.status}`),["meninggal=0:usul", "mengungsi=40:usul", "rumah=12:usul"]);
  assert.deepEqual(b.j.komen[0].usulan.find(u => u.kolom === "rumah").isian, ["rumah_berat", "rumah_sedang", "rumah_ringan"]);
  const d = await meja(N2, bogor); assert.equal(d.s, 200, d.t);
  assert.ok(!d.t.includes(WA) && !d.t.includes(WA2), "BPBD tidak melihat nomor penulis (D95)"); assert.equal(d.j.komen[0].penulis.tersembunyi, 0);
});

uji("terima: angka kartu Alun-alun berubah lewat versi baru atas nama petugas; usulan tidak bisa diputus dua kali", async () => {
  assert.equal((await putus(N1, {aksi: "terima", id: usul.mengungsi}, {})).s, 403, "tamu");
  assert.equal((await putus(N1, {aksi: "terima", id: usul.mengungsi}, bandung)).s, 404, "luar wilayah");
  assert.equal((await putus(N1, {aksi: "hapus", id: usul.mengungsi})).s, 400, "aksi di luar daftar");
  assert.equal((await putus(N1, {aksi: "terima", id: "1"})).s, 400, "id usulan bukan bilangan");
  const t = await putus(N1, {aksi: "terima", id: usul.mengungsi}, bogor); assert.equal(t.s, 200, t.t);
  assert.equal(t.j.komen[0].usulan.find(u => u.kolom === "mengungsi").status, "terima");
  const a = await api("GET", "/api/lapor/alun"); assert.equal(a.j.baris[0].dampak.mengungsi, 40, "kartu berubah lewat laporan terbaru");
  const v = await DB.prepare("SELECT versi, perubahan FROM lapor_versi WHERE nomor = ? ORDER BY versi DESC").bind(N2).first();
  assert.equal(v.versi, 2); const p = JSON.parse(v.perubahan)[0];
  assert.deepEqual({nama: p.nama, dari: p.dari, ke: p.ke}, {nama: "mengungsi_jiwa", dari: 25, ke: 40}); assert.match(p.petugas, /Petugas Uji|BPBD/, "versi atas nama petugas");
  const kerja = JSON.parse((await DB.prepare("SELECT kerja FROM lapor_sesi WHERE nomor = ?").bind(N2).first()).kerja);
  assert.equal(kerja.isian.mengungsi_jiwa.asal.sumber, "petugas"); assert.match(kerja.isian.mengungsi_jiwa.asal.kutipan, /"40 warga mengungsi"/);
  const rw = await DB.prepare("SELECT catatan, pelaku FROM lapor_tiket_riwayat WHERE nomor = ? ORDER BY id DESC").bind(N2).first();
  assert.match(rw.catatan, /kabar warga diterima: .* 25 menjadi 40/i); assert.equal(rw.pelaku, (await DB.prepare("SELECT oleh FROM lp_komen_putus WHERE usul = ?").bind(usul.mengungsi).first()).oleh);
  assert.equal(await n("lapor_pdf", `nomor = '${N2}' AND versi = 2`), 1, "PDF versi baru antre");
  const lagi = await putus(N1, {aksi: "terima", id: usul.mengungsi}); assert.equal(lagi.s, 409, "sudah diputus");
  assert.equal(await n("lapor_versi", `nomor = '${N2}'`), 1, "putusan ganda tidak menambah versi");
  assert.equal(JSON.parse((await DB.prepare("SELECT kerja FROM lapor_sesi WHERE nomor = ?").bind(N1).first()).kerja).isian.mengungsi_jiwa.nilai, 10, "laporan jangkar tidak disentuh");
});

uji("terima rumah wajib pilih tingkat; nol tercatat nihil; isian yang tidak berlaku ditolak", async () => {
  assert.equal((await putus(N1, {aksi: "terima", id: usul.rumah})).s, 400, "rumah tanpa tingkat");
  assert.equal((await putus(N1, {aksi: "terima", id: usul.rumah, isian: "rumah_terendam"})).s, 400, "tingkat di luar pilihan rumah");
  const r = await putus(N1, {aksi: "terima", id: usul.rumah, isian: "rumah_berat"}); assert.equal(r.s, 200, r.t);
  assert.equal((await api("GET", "/api/lapor/alun")).j.baris[0].dampak.rumah, 12);
  const m = await putus(N1, {aksi: "terima", id: usul.meninggal}); assert.equal(m.s, 200, m.t);
  const kerja = JSON.parse((await DB.prepare("SELECT kerja FROM lapor_sesi WHERE nomor = ?").bind(N2).first()).kerja);
  assert.deepEqual({nilai: kerja.isian.meninggal.nilai, nihil: kerja.isian.meninggal.nihil}, {nilai: 0, nihil: true}, "0 dari kata ingkar = tidak ada, bukan kosong");
  /* laporan tujuan longsor tidak punya isian rumah terendam */
  const s = await DB.prepare("SELECT kerja, rev FROM lapor_sesi WHERE nomor = ?").bind(N2).first(), k = JSON.parse(s.kerja); k.isian.jenis.nilai = "longsor";
  await DB.prepare("UPDATE lapor_sesi SET kerja = ?, rev = rev + 1 WHERE nomor = ?").bind(JSON.stringify(k), N2).run();
  assert.equal((await putus(N1, {aksi: "terima", id: usul.terendam})).s, 409, "isian tidak berlaku untuk jenis laporan tujuan");
  k.isian.jenis.nilai = "banjir"; await DB.prepare("UPDATE lapor_sesi SET kerja = ?, rev = rev + 1 WHERE nomor = ?").bind(JSON.stringify(k), N2).run();
});

uji("tolak, sembunyikan, tampilkan lagi; jumlah tersembunyi per nomor; riwayat append-only", async () => {
  const t = await putus(N2, {aksi: "tolak", id: usul.terendam, alasan: "Sudah surut, dicek petugas"}); assert.equal(t.s, 200, t.t);
  assert.equal((await api("GET", "/api/lapor/alun")).j.baris[0].dampak.terendam, 0, "tolak tidak mengubah kartu");
  assert.equal((await putus(N2, {aksi: "terima", id: usul.terendam})).s, 409, "usulan ditolak tidak bisa diterima");
  const s = await putus(N2, {aksi: "sembunyi", id: k2Id, alasan: "Menyebut nama orang"}); assert.equal(s.s, 200, s.t);
  assert.equal((await putus(N2, {aksi: "sembunyi", id: k2Id})).s, 409, "sudah tersembunyi");
  assert.ok(!(await api("GET", `/api/lapor/komen/${kartu}`)).t.includes("rumah terendam"), "komentar tersembunyi hilang dari publik");
  const b = await meja(N2); const k2 = b.j.komen.find(k => k.id === k2Id);
  assert.equal(k2.status, "tersembunyi"); assert.equal(k2.penulis.tersembunyi, 1, "Q74: meja melihat jumlah komentar tersembunyi nomor itu");
  assert.deepEqual(k2.riwayat.map(r => r.aksi), ["tolak", "sembunyi"]);
  assert.equal((await putus(N2, {aksi: "tampil", id: k2Id})).s, 200);
  assert.ok((await api("GET", `/api/lapor/komen/${kartu}`)).t.includes("rumah terendam"), "tampil lagi");
  assert.equal((await putus(N2, {aksi: "sembunyi", id: "0".repeat(16)})).s, 404, "komentar kartu lain atau tidak ada");
  assert.equal(await n("lp_komen_putus"), 6, "terima x3, tolak, sembunyi, tampil");
  await assert.rejects(DB.prepare("UPDATE lp_komen_putus SET aksi = 'tolak'").run(), /append-only/);
  await assert.rejects(DB.prepare("DELETE FROM lp_komen_putus").run(), /append-only/);
  await assert.rejects(DB.prepare("INSERT INTO lp_komen_putus (komen, usul, aksi, oleh, waktu) VALUES (?1, 1, 'terima', 'x', 1)").bind(kId).run(), /CHECK/, "terima tanpa nomor dan isian ditolak CHECK");
  await assert.rejects(DB.prepare("INSERT INTO lp_komen_putus (komen, aksi, oleh, waktu) VALUES (?1, 'tolak', 'x', 1)").bind(kId).run(), /CHECK/, "tolak tanpa usulan ditolak CHECK");
});

uji("gugus lintas kab: BPBD kab lain melihat komentar tanpa nomor dan angka laporan tujuan, tidak bisa memutus", async () => {
  /* laporan Kota Bandung di titik yang sama masuk gugus; laporan terbaru (tujuan) tetap N2 di Kota Bogor */
  const BDG = {...BOGOR, kabKode: "32.73", kab: "Kota Bandung", kecKode: "32.73.01", kec: "Sukasari", kode: "32.73.01.1001", desa: "Uji"};
  const isian = {lokasi: {nilai: {lat: -6.6, lon: 106.8, wilayah: BDG}}, jenis: {nilai: "banjir"}};
  await DB.batch([
    DB.prepare(`INSERT INTO lapor_sesi (id, wa, status, tingkat, jenis, kab, lat, lon, nomor, terkirim, kerja, ringkas, rev, dibuat, diubah)
      VALUES ('sesi-meja-03', '6281299990003', 'terkirim', 'warga', 'banjir', '32.73', -6.6, 106.8, 'LA-251125-33', ?1, ?2, ?3, 0, ?1, ?1)`)
      .bind(KINI - 9000e3, JSON.stringify({status: "terkirim", tingkat: "warga", isian, transkrip: []}), JSON.stringify({wilayah: BDG, dampak: {}})),
    DB.prepare("INSERT INTO lapor_tiket (nomor, sesi, status, diubah) VALUES ('LA-251125-33', 'sesi-meja-03', 'ditindaklanjuti', ?1)").bind(KINI)]);
  const g = await meja("LA-251125-33", bandung); assert.equal(g.s, 200, g.t);
  assert.ok(g.j.kartu, "titik dan jenis sama: satu gugus lintas kab, satu kartu bersama");
  assert.equal(g.j.kartu.sasaran, null, "nomor laporan tujuan kab lain tidak dibuka"); assert.deepEqual(g.j.kartu.isian, []); assert.equal(g.j.kartu.luarWilayah, true);
  assert.ok(!g.t.includes(N2), "nomor laporan kab lain tidak ada di jawaban");
  assert.equal((await putus("LA-251125-33", {aksi: "sembunyi", id: kId}, bandung)).s, 403, "keputusan untuk kejadian yang dikelola wilayah lain ditolak");
  await DB.prepare("DELETE FROM lapor_tiket WHERE nomor = 'LA-251125-33'").run();
});

uji("laporan di luar Alun-alun: daftar kosong, keputusan 409", async () => {
  await DB.prepare("UPDATE lapor_tiket SET status = 'baru' WHERE nomor IN (?1, ?2)").bind(N1, N2).run();
  const b = await meja(N1); assert.equal(b.s, 200); assert.deepEqual(b.j, {kartu: null, komen: []});
  assert.equal((await putus(N1, {aksi: "sembunyi", id: kId})).s, 409);
});
