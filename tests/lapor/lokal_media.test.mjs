/* Server lokal Lapor (scripts/lapor/lokal.mjs) dijalankan sungguhan lewat HTTP: video unggah bersambung (K57, K61, D77, D89),
   bukti tindak lanjut (K60, D87, D88), Alun-alun bergugus dengan titik pusat desa (K59, D84, D85), pembaca MP4 (src/media_berkas.js).
   Data di HOME sementara, tanpa model AI. Jalankan: node --test tests/lapor/lokal_media.test.mjs */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import http from "node:http";

const RUMAH = fs.mkdtempSync(path.join(os.tmpdir(), "lapor-lokal-uji-"));
process.env.HOME = RUMAH; process.argv.push("--tanpa-ai");
const {tanganiLapor} = await import("../../scripts/lapor/lokal.mjs");
const {durasiMP4, waktuMP4, lokasiMP4, jenisBerkas} = await import("../../src/media_berkas.js");
const DIR = path.join(RUMAH, ".lapor-lokal"), BERKAS = path.join(DIR, "data.json");

const srv = http.createServer((q, s) => tanganiLapor(q, s, new URL(q.url, "http://x"))).listen(0);
const DASAR = `http://127.0.0.1:${srv.address().port}`;
test.after(() => { srv.close(); fs.rmSync(RUMAH, {recursive: true, force: true}); });
const api = async (m, j, b, raw, h = {}) => { const r = await fetch(DASAR + j, {method: m, headers: {...(raw ? {} : {"content-type": "application/json"}), ...h}, body: raw ?? (b ? JSON.stringify(b) : undefined)});
  const t = await r.text(); let x = null; try { x = JSON.parse(t); } catch {} return {s: r.status, j: x}; };

/* MP4 kecil sah: ftyp + moov(mvhd, udta ©xyz) + mdat isian sampai ukuran yang diminta */
function mp4(ukuran, {detik = 20, waktu = Date.now() - 3600e3, xyz = "-6.2100+106.8600/"} = {}) {
  const kotak = (tipe, isi) => { const b = Buffer.alloc(8 + isi.length); b.writeUInt32BE(8 + isi.length); b.write(tipe, 4, "latin1"); isi.copy(b, 8); return b; };
  const mvhd = Buffer.alloc(100); mvhd.writeUInt32BE(Math.floor(waktu / 1000) + 2082844800, 4); mvhd.writeUInt32BE(1000, 12); mvhd.writeUInt32BE(detik * 1000, 16);
  const xyzB = Buffer.concat([Buffer.from([0, xyz.length, 0x15, 0xc7]), Buffer.from(xyz, "latin1")]);
  const udta = kotak("udta", Buffer.concat([Buffer.from([0, 0, 0, 8 + xyzB.length, 0xa9, 0x78, 0x79, 0x7a]), xyzB]));
  const kepala = Buffer.concat([kotak("ftyp", Buffer.from("isom\0\0\0\0isommp41", "latin1")), kotak("moov", Buffer.concat([kotak("mvhd", mvhd), udta]))]);
  return Buffer.concat([kepala, kotak("mdat", Buffer.alloc(ukuran - kepala.length - 8, 7))]);
}
const GPS = () => ({lat: -6.2088, lon: 106.8456, akurasi: 15, waktu: Date.now()});
const WA = "6281200000011", WA2 = "6281200000012";
const SAMPUL = `data:image/jpeg;base64,${Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(800, 1)]).toString("base64")}`;

function benih() { // satu sesi menunggu foto, dua laporan terkirim bergugus (nomor berbeda, desa sama, jenis banjir) berstatus ditindaklanjuti
  const kini = Date.now(), lok = {lat: -6.2088, lon: 106.8456, sumber: "gps", wilayah: {kode: "31.75.06.1001", desa: "Uji", kec: "Uji", kab: "Kota Uji", prov: "Uji", provKode: "31", kabKode: "31.75"}};
  const isian = {jenis: {nilai: "banjir"}, lokasi: {nilai: lok}, waktu: {nilai: "19 November 2026", ms: kini - 3600e3}, meninggal: {nilai: 0, nihil: true}, mengungsi_jiwa: {nilai: 12}};
  const terkirim = (id, wa, nomor, token, t) => ({id, wa, nomor, token, status: "terkirim", terkirim: t, isian: structuredClone(isian), foto: [], transkrip: [], versi: [{versi: 1}],
    tiket: {status: "ditindaklanjuti", riwayat: [{ke: "baru", waktu: t}, {ke: "ditindaklanjuti", waktu: t + 1}]}});
  fs.mkdirSync(DIR, {recursive: true});
  fs.writeFileSync(BERKAS, JSON.stringify({pelapor: {[WA]: {nama: "Uji Satu", peran: "warga"}, [WA2]: {nama: "Uji Dua", peran: "warga"}},
    sesi: {s1: {id: "s1", wa: WA, status: "foto", isian: {}, foto: [], transkrip: [], jejak: [], ditanya: []},
      a1: terkirim("a1", WA, "LA-191126-91", "a".repeat(32), kini - 1800e3), a2: terkirim("a2", WA2, "LA-191126-92", "b".repeat(32), kini - 900e3)},
    aktif: {[WA]: "s1"}, urut: {}, kotak: {}}));
}

test("pembaca MP4: jenis, durasi, waktu rekam, lokasi ©xyz", () => {
  const b = mp4(4000, {detik: 42, waktu: Date.UTC(2026, 10, 19, 3)});
  assert.equal(jenisBerkas(b), "video/mp4"); assert.equal(durasiMP4(b), 42); assert.equal(waktuMP4(b), Date.UTC(2026, 10, 19, 3));
  assert.deepEqual(lokasiMP4(b), {lat: -6.21, lon: 106.86});
  assert.equal(lokasiMP4(mp4(4000, {xyz: "tanpa"})), null);
});

test("video bersambung: putus di tengah, status menyebut bagian yang sudah ada, lanjut, selesai masuk laporan", async () => {
  benih();
  const vid = mp4(11 * 1048576 + 123);
  const m = await api("POST", "/api/lapor/unggah/mulai", {wa: WA, ukuran: vid.length, durasi: 20, gps: GPS()});
  assert.equal(m.s, 200, JSON.stringify(m.j)); assert.equal(m.j.jumlah, 3);
  const B = m.j.bagian, id = m.j.id, potong = n => vid.subarray(n * B, (n + 1) * B);
  assert.equal((await api("PUT", `/api/lapor/unggah/${id}/0`, null, potong(0))).s, 200);
  assert.equal((await api("PUT", `/api/lapor/unggah/${id}/1`, null, potong(1).subarray(0, 1000))).s, 400, "bagian terpotong (sinyal putus) ditolak");
  assert.equal((await api("POST", `/api/lapor/unggah/${id}/selesai`, {})).s, 409, "belum lengkap");
  assert.deepEqual((await api("GET", `/api/lapor/unggah/${id}`)).j.diterima, [0], "lanjut dari bagian 2, bukan dari nol");
  for (const n of [1, 2]) assert.equal((await api("PUT", `/api/lapor/unggah/${id}/${n}`, null, potong(n))).s, 200);
  const s = await api("POST", `/api/lapor/unggah/${id}/selesai`, {sampul: SAMPUL});
  assert.equal(s.s, 200, JSON.stringify(s.j)); assert.equal(s.j.fotoBaru.jenis, "video"); assert.equal(s.j.fotoBaru.lencana, "gps"); assert.equal(s.j.fotoBaru.durasi, 20);
  const d = JSON.parse(fs.readFileSync(BERKAS, "utf8"));
  assert.equal(d.sesi.s1.foto.length, 1); assert.equal(d.sesi.s1.foto[0].eks, "mp4");
  assert.ok(fs.existsSync(path.join(DIR, "foto", `${id}.mp4`)) && fs.existsSync(path.join(DIR, "foto", `${id}.jpg`)));
  assert.equal(d.unggah[id], undefined, "bagian sementara dibersihkan");
});

test("video ditolak: terlalu lama, bukan video, terlalu besar, lokasi jauh", async () => {
  benih();
  const coba = async (buf, b = {}) => { const m = await api("POST", "/api/lapor/unggah/mulai", {wa: WA, ukuran: buf.length, gps: GPS(), ...b}); if (m.s !== 200) return m;
    for (let n = 0; n < m.j.jumlah; n++) await api("PUT", `/api/lapor/unggah/${m.j.id}/${n}`, null, buf.subarray(n * m.j.bagian, (n + 1) * m.j.bagian));
    return api("POST", `/api/lapor/unggah/${m.j.id}/selesai`, {}); };
  assert.equal((await coba(mp4(5000, {detik: 90}))).s, 400);
  assert.equal((await coba(Buffer.alloc(5000, 3))).s, 400);
  assert.equal((await coba(mp4(5000, {xyz: "-7.5000+110.0000/"}))).s, 400, "lebih dari 5 km dari GPS perangkat");
  assert.equal((await api("POST", "/api/lapor/unggah/mulai", {wa: WA, ukuran: 31 * 1048576})).s, 400);
});

test("bukti tindak lanjut: Selesai butuh foto atau alasan; foto tampil di lacak, Alun-alun hanya bila publik", async () => {
  benih();
  const N = "LA-191126-91", JPG = `data:image/jpeg;base64,${Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(3000, 2)]).toString("base64")}`;
  const t1 = await api("POST", `/api/lapor/meja/${N}/status`, {ke: "selesai"});
  assert.equal(t1.s, 400); assert.equal(t1.j.perluBukti, true);
  const b = await api("POST", `/api/lapor/meja/${N}/bukti`, {data: JPG, gps: GPS()});
  assert.equal(b.s, 200); assert.equal(b.j.bukti.length, 1); assert.equal(b.j.bukti[0].publik, false);
  const bid = b.j.bukti[0].id;
  assert.equal((await api("GET", `/api/lapor/bukti/${bid}?alun=1`)).s, 404, "belum publik");
  assert.equal((await api("GET", `/api/lapor/bukti/${bid}?t=${"a".repeat(32)}`)).s, 200, "pelapor dengan token melihat");
  assert.equal((await api("GET", `/api/lapor/bukti/${bid}?t=${"b".repeat(32)}`)).s, 404, "token laporan lain tidak");
  assert.equal((await api("POST", `/api/lapor/meja/${N}/status`, {ke: "selesai"})).s, 200);
  assert.equal((await api("GET", `/api/lapor/lacak?t=${"a".repeat(32)}`)).j.bukti.length, 1);
  assert.equal((await api("POST", `/api/lapor/meja/${N}/bukti-publik`, {id: bid, publik: true})).s, 200);
  assert.equal((await api("GET", `/api/lapor/bukti/${bid}?alun=1`)).s, 200);
  // tanpa foto: alasan tertulis tercatat
  const N2 = "LA-191126-92";
  assert.equal((await api("POST", `/api/lapor/meja/${N2}/status`, {ke: "selesai", tanpaBukti: "Lokasi tertutup air, kamera rusak"})).s, 200);
  const r2 = (await api("GET", `/api/lapor/meja/${N2}`)).j.riwayat.at(-1);
  assert.match(r2.catatan, /Tanpa foto penanganan: Lokasi tertutup air/);
});

test("Alun-alun: satu kartu per gugus dengan N warga, titik pusat desa, tanpa nomor dan nama", async () => {
  benih();
  const a = await api("GET", "/api/lapor/alun");
  assert.equal(a.s, 200); assert.equal(a.j.jumlah, 1, "dua laporan satu gugus jadi satu kartu");
  const x = a.j.baris[0];
  assert.equal(x.nWarga, 2); assert.equal(x.dampak.mengungsi, 12, "angka tidak dijumlah");
  const teks = JSON.stringify(a.j); for (const rahasia of [WA, WA2, "Uji Satu", "LA-191126-91", "a".repeat(32)]) assert.ok(!teks.includes(rahasia), rahasia);
  const id1 = x.id; benih(); assert.equal((await api("GET", "/api/lapor/alun")).j.baris[0].id, id1, "id kartu tetap untuk Ikuti");
});

test("meja BPBD: hanya wilayahnya, tanpa buka kembali, pelaku tercatat, log akses (K63, D94-D96)", async () => {
  benih();
  const KAB = {cookie: "lapor_sebagai=kab:31.75"}, LAIN = {cookie: "lapor_sebagai=kab:32.01"}, PROV = {cookie: "lapor_sebagai=prov:31"}, N = "LA-191126-91";
  const m = await api("GET", "/api/lapor/meja", null, null, KAB);
  assert.equal(m.s, 200); assert.equal(m.j.akun.jenis, "bpbd"); assert.equal(m.j.baris.length, 2);
  assert.equal((await api("GET", "/api/lapor/meja", null, null, LAIN)).j.baris.length, 0, "kab lain tidak melihat");
  assert.equal((await api("GET", "/api/lapor/meja", null, null, PROV)).j.baris.length, 2, "provinsi melihat kab di dalamnya");
  assert.equal((await api("GET", `/api/lapor/meja/${N}`, null, null, LAIN)).s, 404, "rincian di luar wilayah = tidak ada");
  assert.equal((await api("POST", `/api/lapor/meja/${N}/balas`, {teks: "coba"}, null, LAIN)).s, 404);
  const r = await api("POST", `/api/lapor/meja/${N}/lihat`, {}, null, KAB);
  assert.equal(r.s, 200); assert.ok(!r.j.pindah.includes("ditelaah") || r.j.status !== "selesai");
  assert.equal((await api("POST", `/api/lapor/meja/${N}/status`, {ke: "selesai", tanpaBukti: "Ditangani BPBD, foto menyusul"}, null, KAB)).s, 200);
  const sesudah = await api("GET", `/api/lapor/meja/${N}`, null, null, KAB);
  assert.deepEqual(sesudah.j.pindah, [], "BPBD tidak ditawari buka kembali");
  assert.equal((await api("POST", `/api/lapor/meja/${N}/status`, {ke: "ditelaah", catatan: "buka lagi"}, null, KAB)).s, 403);
  assert.equal((await api("POST", `/api/lapor/meja/${N}/status`, {ke: "ditelaah", catatan: "buka lagi"})).s, 200, "BNPB boleh membuka kembali");
  const d = JSON.parse(fs.readFileSync(BERKAS, "utf8")).sesi.a1;
  assert.match(d.tiket.riwayat.find(x => x.ke === "selesai").pelaku, /^BPBD Kota Jakarta Timur/);
  assert.equal(d.akses.length, 1, "pembukaan rincian BPBD tercatat");
});

test("agregat data terbuka: tanpa identitas, sel kecil <3, CSV berkolom kamus (K62, D91)", async () => {
  benih();
  const a = await api("GET", "/api/lapor/agregat?format=json");
  assert.equal(a.s, 200); assert.equal(a.j.baris.length, 1);
  const b = a.j.baris[0];
  assert.equal(b.kab_kode, "31.75"); assert.equal(b.laporan, "<3"); assert.equal(b.median_menit_lapor, null); assert.equal(b.selisih_resmi_menit, "belum tersedia");
  const teks = JSON.stringify(a.j); for (const rahasia of [WA, WA2, "Uji Satu", "LA-191126-91", "31.75.06.1001", "-6.2088"]) assert.ok(!teks.includes(rahasia), rahasia);
  const r = await fetch(DASAR + "/api/lapor/agregat?format=csv"), csv = await r.text();
  assert.match(r.headers.get("content-type"), /text\/csv/); assert.ok(csv.startsWith("minggu,prov_kode,provinsi,kab_kode,kab_kota,jenis,laporan,pelapor,"));
});
