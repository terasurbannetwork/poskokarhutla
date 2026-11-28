/* Orang hilang publik OH-05 (foto publik turunan), OH-06 (anak dan wali), OH-07 (meja tinjau), saran tinjauan: laju saya, sapuan foto yatim.
   worker.js utuh di Miniflare + D1 + R2 sungguhan. RENCANA-UJI 2.4, 2.5, 2.11, 2.11b, 2.13, 2.21 dan 1.3/1.6 sisi rute. Jalankan: node --test tests/lapor/hilang_meja.test.mjs */
import assert from "node:assert/strict";
import {siapkan, berantai, sha256, ADMIN} from "../warga/_bnpb.mjs";
import {profilAktif} from "../warga/_profil.mjs";
import {JPEG_SAH} from "../warga/_bantu.mjs";
import "../../src/worker.js";
import * as H from "../../src/hak.js";
import {bersihOrangHilang, kunciFotoPublik} from "../../src/orang_hilang.js";
import {periksaFotoPublik, MAKS_BYTE} from "../../src/orang_hilang_foto_publik.js";
import {tglWib} from "../../src/orang_hilang_murni.js";

const uji = berantai();
const HARI = 864e5, kini = Date.now(), WA = "6281200000121", WA2 = "6281200000122", KAB = "32.03";
const U = await siapkan("uji-oh-meja", {r2: true, ikat: {OH_PUBLIK: "1", OH_TULIS: "1", WA_MESIN: "mesin-rahasia"}}), {api, DB, n} = U;
const MATI = await siapkan("uji-oh-meja-mati", {r2: true, ikat: {OH_TULIS: "1"}});
const R2 = await U.mf.getR2Bucket("MEDIA"), env = {DB, MEDIA: R2}, STAF = H.pelakuLpStaf, PEL = H.pelakuLpPelapor;
const SESI = {}, sesi = (wa, i) => SESI[i] ??= (async () => {
  const mk = "mk" + String(i).padStart(14, "0"), tok = (String(i).padStart(2, "0") + "7e").repeat(32).slice(0, 64);
  await DB.batch([DB.prepare("INSERT INTO mk_akun (id, wa, nama, status, dibuat) VALUES (?, ?, 'Warga Uji', 'aktif', ?)").bind(mk, wa, kini), DB.prepare("INSERT INTO mk_sesi (token_sha, mk_id, kode_pada, dibuat, habis) VALUES (?, ?, ?, ?, ?)").bind(sha256(tok), mk, kini, kini, kini + 90 * HARI)]);
  return {cookie: `sesi_masuk=${tok}`, origin: "http://bnpb.lokal", "x-pb": "1"};
})();
const bpbd = async (nu, kab) => { const id = String(nu).padStart(16, "0");
  await DB.prepare(`INSERT INTO instansi_akun (id, username, jenis, tingkat, wilayah, kunci_wilayah, cakupan, prov, kab, garam, sandi_sha, status, nama, nip, jabatan, unit, email, wa, surat, kartu, wajib_ganti, dibuat) VALUES (?, ?, 'pemkab', 'kab', 'Wilayah uji', ?, ?, '32', ?, ?, ?, 'aktif', 'Petugas Uji', '19800101', 'Kasi', 'BPBD', ?, ?, 1, 1, 0, ?)`)
    .bind(id, "ohmeja" + nu, `32|${kab}`, JSON.stringify(["32"]), kab, "g".repeat(32), "0".repeat(64), `ohm${nu}@b.id`, "62812003" + String(nu).padStart(4, "0"), kini).run();
  return {cookie: (await profilAktif(DB, id)).cookie, origin: "http://bnpb.lokal", "x-pb": "1"}; };
const kej = (id, o = {}) => DB.batch([DB.prepare("INSERT INTO sk_kejadian (id, jenis, nama, prov, kab4, mulai, fase, fase_diubah, asal, publik, ringkasan_publik, dibuat, diubah, oleh, dummy) VALUES (?, ?, 'Kejadian uji', '32', ?, ?, ?, 1, 'otomatis', 0, NULL, 1, 1, 'uji', 0)").bind(id, o.jenis ?? "banjir", "3203", tglWib(kini - HARI), o.fase ?? "tanggap"),
  DB.prepare("INSERT INTO sk_kejadian_kab (kejadian_id, kab4, mulai, dibuat, dummy) VALUES (?, '3203', ?, 1, 0)").bind(id, tglWib(kini - HARI))]);
const KJ1 = "KJ-2026-00000001", KJ2 = "KJ-2026-00000002";
let seq = 0;
async function buat({nomor = WA, status = "menunggu", kelas = "dewasa", umur = 30, kab = KAB, nomorDicari = null, kejadian = KJ1, versi = 1, konfirm = false, wali = null, tayang = kini} = {}) {
  const i = ++seq, id = String(i).padStart(16, "0"), token = "d".repeat(32 - String(i).length) + i;
  await H.crTambah(env, PEL, {id, nomor_pencari: nomor, nama_dicari: "Budi Santoso", ciri: "tahi lalat", lokasi_terakhir: "Desa X", waktu_terakhir: "Hari ini", nomor_dicari: nomorDicari, hubungan: "Anak", kab}, kini);
  await H.ohTambah(env, PEL, {cari_id: id, token, kelas, nama: "Budi Santoso", panggilan: "Budi", umur: kelas === "anak" ? 9 : umur, kelamin: "Laki-laki", pakaian: "kaos merah", kec: "Cianjur", kab, kab_nama: "Kab. Cianjur", waktu_terakhir: kini,
    kejadian_id: kejadian, kejadian_jenis: kejadian ? "banjir" : null, kejadian_kab: kejadian ? "3203" : null, kejadian_mulai: kejadian ? tglWib(kini - HARI) : null, setuju_versi: versi, setuju_waktu: kini, setuju_wali: wali}, kini);
  if (status !== "draf") await H.ohPindah(env, STAF, {cari_id: id, dari: "draf", ke: "menunggu", oleh: "uji"}, kini);
  if (status === "tayang") await H.ohPindah(env, STAF, {cari_id: id, dari: "menunggu", ke: "tayang", oleh: "uji"}, tayang);
  if (konfirm) await DB.prepare("UPDATE oh_publik SET kejadian_oleh = 'staf:uji', kejadian_waktu = 1 WHERE cari_id = ?").bind(id).run();
  return {id, token};
}
const baca = id => DB.prepare("SELECT * FROM oh_publik WHERE cari_id = ?").bind(id).first();
const riwayat = async id => (await H.ohRiwayat(env, STAF, id)).map(r => `${r.dari}>${r.ke}:${r.alasan}`);
const mentah = async (mf, j, bytes, h) => { const r = await mf.dispatchFetch("http://bnpb.lokal" + j, {method: "POST", body: bytes, headers: {...h, "content-type": "image/jpeg"}}), t = await r.text(); let x = null; try { x = JSON.parse(t); } catch {} return {s: r.status, j: x, t, h: r.headers}; };
const unggah = (id, bytes, h) => mentah(U.mf, `/api/lapor/hilang/saya/foto?id=${id}`, bytes, h);
const EXIF = new Uint8Array([JPEG_SAH[0], JPEG_SAH[1], 0xff, 0xe1, 0, 8, 0x45, 0x78, 0x69, 0x66, 0, 0, ...JPEG_SAH.subarray(2)]);
const aksi = (id, b, h = ADMIN) => api("POST", `/api/lapor/meja/hilang/${id}/aksi`, b, h);

uji("OH-05 murni: JPEG, PNG, WebP sah lolos; EXIF, XMP, IPTC, tipe palsu, lebih 300 KB, lebih 800 px ditolak", () => {
  assert.deepEqual(periksaFotoPublik(JPEG_SAH), {jenis: "image/jpeg", w: 1, h: 1});
  assert.match(periksaFotoPublik(EXIF).galat, /EXIF/);
  const png = (...b) => { const x = new Uint8Array(33 + b.length + 12); x.set([0x89, 0x50, 0x4e, 0x47, 13, 10, 26, 10, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52, 0, 0, 1, 0, 0, 0, 1, 0, 8, 2, 0, 0, 0, 0, 0, 0, 0]); x.set(b, 33); x.set([0, 0, 0, 0, 0x49, 0x45, 0x4e, 0x44, 0, 0, 0, 0], 33 + b.length); return x; };
  assert.deepEqual(periksaFotoPublik(png()), {jenis: "image/png", w: 256, h: 256});
  assert.match(periksaFotoPublik(png(0, 0, 0, 0, 0x65, 0x58, 0x49, 0x66, 0, 0, 0, 0)).galat, /EXIF/, "chunk eXIf");
  const webp = flag => { const x = new Uint8Array(30); x.set([0x52, 0x49, 0x46, 0x46, 22, 0, 0, 0, 0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38, 0x58, 10, 0, 0, 0, flag, 0, 0, 0, 99, 0, 0, 99, 0, 0]); return x; };
  assert.deepEqual(periksaFotoPublik(webp(0)), {jenis: "image/webp", w: 100, h: 100}); assert.match(periksaFotoPublik(webp(0x08)).galat, /EXIF/); assert.match(periksaFotoPublik(webp(0x04)).galat, /EXIF/, "XMP");
  assert.match(periksaFotoPublik(new Uint8Array(100).fill(1)).galat, /JPEG, PNG, atau WebP/); assert.match(periksaFotoPublik(new Uint8Array(MAKS_BYTE + 1)).galat, /300 KB/);
  const besar = new Uint8Array(JPEG_SAH); besar[7] = 0x04; besar[8] = 0; assert.match(periksaFotoPublik(besar).galat, /800 px/);
  assert.match(periksaFotoPublik(JPEG_SAH.subarray(0, 10)).galat, /bukan foto/);
  // lolos-parser (tinjauan keamanan): marker tanpa panjang, APP sesudah SOF, COM, APP selain JFIF, byte sesudah EOI
  const sisip = (di, ...x) => new Uint8Array([...JPEG_SAH.subarray(0, di), ...x, ...JPEG_SAH.subarray(di)]);
  const exif = [0xff, 0xe1, 0, 8, 0x45, 0x78, 0x69, 0x66, 0, 0];
  assert.match(periksaFotoPublik(sisip(2, 0xff, 0xd0, ...exif)).galat, /EXIF/, "APP1 sesudah RST0");
  assert.match(periksaFotoPublik(sisip(2, 0xff, 0x01, ...exif)).galat, /EXIF/, "APP1 sesudah FF01");
  const pad = new Array(0xffe1 - 4).fill(0x41), jp = new Uint8Array([0xff, 0xd8, 0xff, 0xd0, ...exif, 0xff, 0xfe, ...[(pad.length + 2) >> 8, (pad.length + 2) & 255], ...pad, ...JPEG_SAH.subarray(2)]);
  assert.ok(periksaFotoPublik(jp).galat, "contoh pelewat dari tinjauan ditolak");
  assert.match(periksaFotoPublik(sisip(11 + 4, ...exif)).galat, /EXIF/, "APP1 sesudah SOF");
  assert.match(periksaFotoPublik(sisip(2, 0xff, 0xfe, 0, 4, 0x41, 0x42)).galat, /EXIF/, "COM ditolak"); assert.match(periksaFotoPublik(sisip(2, 0xff, 0xe2, 0, 4, 0x41, 0x42)).galat, /EXIF/, "APP2 ditolak"); assert.match(periksaFotoPublik(sisip(2, 0xff, 0xee, 0, 4, 0x41, 0x42)).galat, /EXIF/, "APP14 ditolak");
  assert.match(periksaFotoPublik(sisip(2, 0xff, 0xe0, 0, 4, 0x41, 0x42)).galat, /EXIF/, "APP0 bukan JFIF ditolak");
  assert.ok(periksaFotoPublik(sisip(2, 0xff, 0xe0, 0, 16, 0x4a, 0x46, 0x49, 0x46, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0)).jenis, "JFIF boleh");
  assert.match(periksaFotoPublik(new Uint8Array([...png(), 1, 2, 3])).galat, /sesudah akhir/, "byte sesudah IEND"); assert.match(periksaFotoPublik(new Uint8Array([...webp(0), 1, 2, 3])).galat, /tidak cocok/, "ukuran RIFF tidak sama dengan berkas");
  assert.match(periksaFotoPublik(new Uint8Array([...JPEG_SAH, 0xff, 0xe1, 0, 8, 0x45, 0x78, 0x69, 0x66, 0, 0])).galat, /sesudah akhir/, "byte sesudah EOI");
});

uji("OH-05 saya/foto: sesi terbukti, milik sendiri, dewasa, sebelum tayang, paling 3; berkas R2 acak, EXIF ditolak (2.11)", async () => {
  const H1 = await sesi(WA, 1), H2 = await sesi(WA2, 2), a = await buat({status: "draf"}), anak = await buat({kelas: "anak", wali: 1}), tay = await buat({status: "tayang"});
  assert.equal((await unggah(a.id, JPEG_SAH, {origin: "http://bnpb.lokal", "x-pb": "1"})).s, 401, "tanpa sesi");
  assert.equal((await unggah(a.id, JPEG_SAH, H2)).s, 404, "milik nomor lain");
  const x = await unggah(a.id, EXIF, H1); assert.equal(x.s, 400); assert.match(x.j.galat, /EXIF/);
  assert.equal((await unggah(a.id, new Uint8Array(1000).fill(3), H1)).s, 400);
  assert.equal((await unggah(anak.id, JPEG_SAH, H1)).s, 403, "foto anak tidak tampil"); assert.equal((await unggah(tay.id, JPEG_SAH, H1)).s, 409, "sesudah tayang lewat petugas");
  const ids = []; for (let i = 0; i < 3; i++) { const r = await unggah(a.id, JPEG_SAH, H1); assert.equal(r.s, 200, r.t); ids.push(r.j.id); }
  assert.ok(ids.every(f => /^[0-9a-f]{32}$/.test(f) && !f.includes(a.id)), "nama acak tanpa hubungan dengan cari_id"); assert.ok(await R2.head(kunciFotoPublik(ids[0])));
  assert.equal((await unggah(a.id, JPEG_SAH, H1)).s, 409, "paling 3"); assert.equal(await n("oh_publik", `cari_id = '${a.id}' AND json_array_length(foto_publik) = 3`), 1); assert.equal((await R2.list({prefix: kunciFotoPublik("")})).objects.length, 3, "unggahan yang ditolak tidak menyisakan berkas");
  assert.equal((await unggah(a.id, JPEG_SAH, {...H1, "x-pb": ""})).s, 403);
});

uji("OH-05 foto dilayani hanya untuk profil dewasa yang tayang, dengan header D29; turun seketika (2.11b)", async () => {
  const a = await buat({}), f = "a".repeat(32); await R2.put(kunciFotoPublik(f), JPEG_SAH, {httpMetadata: {contentType: "image/jpeg"}}); await DB.prepare("UPDATE oh_publik SET foto_publik = ? WHERE cari_id = ?").bind(JSON.stringify([f]), a.id).run();
  const g = () => api("GET", `/api/lapor/hilang/foto/${f}`, undefined, {"cf-connecting-ip": "192.0.2.50"});
  assert.equal((await g()).s, 404, "menunggu: tidak dilayani"); assert.equal((await MATI.api("GET", `/api/lapor/hilang/foto/${f}`)).s, 404, "bendera mati");
  await H.ohPindah(env, STAF, {cari_id: a.id, dari: "menunggu", ke: "tayang", oleh: "uji"}, kini);
  const r = await g(); assert.equal(r.s, 200); assert.equal(r.h.get("cache-control"), "private, no-store"); assert.equal(r.h.get("x-robots-tag"), "noindex"); assert.equal(r.h.get("x-content-type-options"), "nosniff"); assert.equal(r.h.get("referrer-policy"), "no-referrer"); assert.ok(!/public|max-age/.test(r.h.get("cache-control")));
  assert.equal((await api("GET", "/api/lapor/hilang/foto/zz")).s, 404, "id tak sah");
  const H1 = await sesi(WA, 1); assert.equal((await api("POST", "/api/lapor/hilang/saya/cabut", {id: a.id}, H1)).s, 200);
  assert.equal((await g()).s, 404, "turun: permintaan berikutnya 404"); assert.equal(await R2.head(kunciFotoPublik(f)), null, "berkas terhapus");
  const anak = await buat({kelas: "anak", wali: 1, status: "tayang"}), fa = "b".repeat(32); await R2.put(kunciFotoPublik(fa), JPEG_SAH); await DB.prepare("UPDATE oh_publik SET foto_publik = ? WHERE cari_id = ?").bind(JSON.stringify([fa]), anak.id).run();
  assert.equal((await api("GET", `/api/lapor/hilang/foto/${fa}`)).s, 404, "foto anak tidak pernah dilayani");
});

uji("saran: sayaGet dibatasi 120 per jam per nomor; sapuan foto yatim hanya yang lebih dari 1 jam dan tak tertaut", async () => {
  const H1 = await sesi(WA, 1); let s = 0; for (let i = 0; i < 121; i++) s = (await api("GET", "/api/lapor/hilang/saya", undefined, H1)).s; assert.equal(s, 429, "ke-121 ditolak");
  const a = await buat({}), ada = "c".repeat(32), yatim = "e".repeat(32);
  await R2.put(kunciFotoPublik(ada), "x"); await R2.put(kunciFotoPublik(yatim), "x"); await DB.prepare("UPDATE oh_publik SET foto_publik = ? WHERE cari_id = ?").bind(JSON.stringify([ada]), a.id).run();
  await bersihOrangHilang(env, kini); assert.ok(await R2.head(kunciFotoPublik(yatim)), "unggahan baru belum disapu");
  await bersihOrangHilang(env, kini + 2 * 36e5); assert.equal(await R2.head(kunciFotoPublik(yatim)), null, "yatim tersapu"); assert.ok(await R2.head(kunciFotoPublik(ada)), "yang tertaut tetap");
});

uji("OH-07 meja: antrean hanya menunggu dalam wilayah; pratinjau persis publik; panel privat terpisah; syarat Tayang terlihat", async () => {
  await kej(KJ1); await kej(KJ2, {jenis: "longsor"});
  const a = await buat({nomorDicari: "6281200000999"}), lain = await buat({kab: "32.04"}), d = await buat({status: "draf"}), meja = await bpbd(1, KAB);
  const g = await api("GET", "/api/lapor/meja/hilang", undefined, ADMIN); assert.equal(g.s, 200, g.t);
  const ids = g.j.baris.map(x => x.id); assert.ok(ids.includes(a.id) && ids.includes(lain.id) && !ids.includes(d.id), "draf tidak masuk antrean");
  const gb = await api("GET", "/api/lapor/meja/hilang", undefined, meja); assert.equal(gb.s, 200); const idb = gb.j.baris.map(x => x.id); assert.ok(idb.includes(a.id) && !idb.includes(lain.id), "BPBD hanya wilayahnya");
  const x = g.j.baris.find(y => y.id === a.id);
  assert.deepEqual(Object.keys(x.pratinjau).sort(), ["ciri", "foto", "id", "kejadian", "kelamin", "lokasi", "nama", "panggilan", "pakaian", "tinggi", "umur", "waktu"].sort());
  assert.ok(!JSON.stringify(x.pratinjau).includes("6281"), "pratinjau tanpa nomor"); assert.equal(x.privat.tampil, false); assert.equal(x.privat.nomor_dicari, "6281200000999"); assert.equal(x.prioritas, true, "kejadian aktif (fase tanggap) didahulukan");
  assert.deepEqual(x.syarat_belum, ["kejadian_belum_dikonfirmasi", "telepon_belum_dicatat"]);
  assert.equal(g.h.get("cache-control"), "private, no-store");
});

uji("OH-07 Tayang: layak, persetujuan sah, telepon D34, tanpa laporan pihak ketiga; riwayat tiap aksi; tolak, perbaikan, ganti foto, ubah kejadian", async () => {
  const a = await buat({nomorDicari: "6281200000999"}), tay = id => aksi(id, {aksi: "tayang"});
  let r = await tay(a.id); assert.equal(r.s, 409); assert.deepEqual(r.j.syarat_belum, ["kejadian_belum_dikonfirmasi", "telepon_belum_dicatat"]); assert.equal((await baca(a.id)).status, "menunggu");
  assert.equal((await aksi(a.id, {aksi: "konfirmasi_kejadian"})).s, 200);
  assert.equal((await aksi(a.id, {aksi: "telepon", hasil: "tanpa_nomor"})).s, 409, "ada nomor_dicari: wajib telepon"); assert.equal((await aksi(a.id, {aksi: "telepon", hasil: "bebas"})).s, 400);
  assert.equal((await aksi(a.id, {aksi: "telepon", hasil: "tidak_ingin"})).s, 200); r = await tay(a.id); assert.ok(r.j.syarat_belum.includes("orang_tidak_ingin_dicari"), "orang itu tidak ingin dicari");
  const b = await buat({nomorDicari: "6281200000999", konfirm: true}); await aksi(b.id, {aksi: "telepon", hasil: "ingin"});
  await DB.prepare("INSERT INTO oh_info (id, jenis, sasaran_token, dibuat) VALUES (?, 'laporkan', ?, 1)").bind("9".repeat(16), b.token).run(); r = await tay(b.id); assert.deepEqual(r.j.syarat_belum, ["laporan_pihak_ketiga_terbuka"]);
  await DB.prepare("UPDATE oh_info SET status = 'selesai', selesai_waktu = 2").run(); r = await tay(b.id); assert.equal(r.s, 200, r.t); assert.equal((await baca(b.id)).status, "tayang"); assert.ok(!(await riwayat(b.id)).some(x => x === "menunggu>tayang:menunggu"));
  assert.deepEqual((await riwayat(b.id)).slice(-2), ["menunggu>menunggu:telepon_ingin", "menunggu>tayang:tayang"]);
  assert.equal((await tay(b.id)).s, 404, "sudah tayang: tidak di antrean");
  const lama = await buat({konfirm: true, versi: 2, nomorDicari: null}); await aksi(lama.id, {aksi: "telepon", hasil: "tanpa_nomor"}); r = await tay(lama.id); assert.deepEqual(r.j.syarat_belum, ["persetujuan_tidak_sah"], "versi lama");
  const tanpaKej = await buat({kejadian: null}); assert.equal((await aksi(tanpaKej.id, {aksi: "konfirmasi_kejadian"})).s, 409, "tanpa kejadian tidak pernah tayang (K116)");
  assert.equal((await aksi(tanpaKej.id, {aksi: "ubah_kejadian", kejadian: "KJ-2026-0000000Z"})).s, 400, "kejadian baru tidak dibuat di sini");
  assert.equal((await aksi(tanpaKej.id, {aksi: "ubah_kejadian", kejadian: KJ2})).s, 200); const t = await baca(tanpaKej.id); assert.deepEqual([t.kejadian_id, t.kejadian_jenis, t.kejadian_oleh !== null], [KJ2, "longsor", true]);
  // perbaikan, tolak, foto
  const c = await buat({}); assert.equal((await aksi(c.id, {aksi: "perbaikan"})).s, 400); const pb = await aksi(c.id, {aksi: "perbaikan", catatan: "foto kurang jelas, nomor 0812 3456 7890"}); assert.equal(pb.s, 200); assert.equal((await baca(c.id)).status, "draf");
  const rc = await H.ohRiwayat(env, STAF, c.id); assert.ok(!rc.at(-1).catatan.includes("3456 7890"), "catatan lolos samarkan"); assert.ok(rc.at(-1).catatan.length <= 140);
  const e = await buat({}); assert.equal((await aksi(e.id, {aksi: "tolak", alasan: "asal"})).s, 400); assert.equal((await aksi(e.id, {aksi: "tolak", alasan: "duplikat"})).s, 200);
  assert.deepEqual([(await baca(e.id)).status, (await baca(e.id)).alasan_turun], ["turun", "ditolak"]); assert.equal((await riwayat(e.id)).at(-1), "menunggu>turun:tolak_duplikat");
  const f = await buat({}), fid = "f".repeat(32); await R2.put(kunciFotoPublik(fid), "x"); await DB.prepare("UPDATE oh_publik SET foto_publik = ? WHERE cari_id = ?").bind(JSON.stringify([fid]), f.id).run();
  assert.equal((await aksi(f.id, {aksi: "ganti_foto", foto: "0".repeat(32)})).s, 404); assert.equal((await aksi(f.id, {aksi: "ganti_foto", foto: fid})).s, 200); assert.equal((await baca(f.id)).foto_publik, "[]"); assert.equal(await R2.head(kunciFotoPublik(fid)), null);
  // wilayah dan hak
  const meja = await bpbd(2, "32.04"), g = await buat({}); assert.equal((await aksi(g.id, {aksi: "tolak", alasan: "duplikat"}, meja)).s, 404, "BPBD wilayah lain");
  assert.equal((await api("POST", `/api/lapor/meja/hilang/${g.id}/aksi`, {aksi: "tayang"})).s, 403, "tanpa sesi staf"); assert.equal((await aksi("zz", {aksi: "tayang"})).s, 404); assert.equal((await aksi(g.id, {aksi: "hapus"})).s, 400);
  assert.equal(await n("oh_riwayat", `cari_id = '${g.id}'`) , 1, "aksi tertolak tidak menulis riwayat");
});

uji("OH-06 anak: wali harus diverifikasi petugas sebelum tayang; telepon tidak berlaku; bukan wali tidak bisa diverifikasi; bendera mati menahan (2.4, 1.3)", async () => {
  const a = await buat({kelas: "anak", wali: 1, konfirm: true}), tay = id => aksi(id, {aksi: "tayang"});
  let r = await tay(a.id); assert.deepEqual(r.j.syarat_belum, ["wali_belum_diverifikasi"]);
  assert.equal((await aksi(a.id, {aksi: "telepon", hasil: "ingin"})).s, 409, "daftar periksa telepon untuk dewasa");
  assert.equal((await aksi(a.id, {aksi: "verifikasi_wali"})).s, 200); r = await tay(a.id); assert.equal(r.s, 200, r.t);
  const bukan = await buat({kelas: "anak", wali: 0, konfirm: true}); assert.equal((await aksi(bukan.id, {aksi: "verifikasi_wali"})).s, 409); assert.deepEqual((await tay(bukan.id)).j.syarat_belum, ["wali_belum_diverifikasi"]);
  assert.equal((await aksi((await buat({})).id, {aksi: "verifikasi_wali"})).s, 409, "dewasa");
  const m = await buat({konfirm: true, nomorDicari: null}); await DB.prepare("INSERT INTO oh_riwayat (cari_id, dari, ke, alasan, oleh, waktu) VALUES (?, 'menunggu', 'menunggu', 'telepon_tanpa_nomor', 'u', 1)").bind(m.id).run();
  const mati = await MATI.api("POST", `/api/lapor/meja/hilang/${m.id}/aksi`, {aksi: "tayang"}, ADMIN); assert.equal(mati.s, 404, "profil ada di D1 lain: 404");
  await MATI.DB.prepare("INSERT INTO lapor_cari (id, nomor_pencari, nama_dicari, kab, dibuat) VALUES (?, ?, 'Budi', ?, 1)").bind(m.id, WA, KAB).run();
  await MATI.DB.prepare("INSERT INTO oh_publik (cari_id, token, kelas, kab, kejadian_id, kejadian_jenis, kejadian_kab, kejadian_mulai, kejadian_oleh, setuju_versi, status, dibuat) VALUES (?, ?, 'dewasa', ?, ?, 'banjir', '3203', '2026-11-26', 'u', 1, 'menunggu', 1)").bind(m.id, "a".repeat(32), KAB, KJ1).run();
  await MATI.DB.prepare("INSERT INTO oh_riwayat (cari_id, dari, ke, alasan, oleh, waktu) VALUES (?, 'menunggu', 'menunggu', 'telepon_tanpa_nomor', 'u', 1)").bind(m.id).run();
  const k = await MATI.api("POST", `/api/lapor/meja/hilang/${m.id}/aksi`, {aksi: "tayang"}, ADMIN); assert.equal(k.s, 409); assert.deepEqual(k.j.syarat_belum, ["bendera_mati"], "bendera OH_PUBLIK mati: tidak tayang");
});

uji("tinjauan: telepon lama tidak dihitung sesudah masuk menunggu lagi; tidak_ingin lama memblokir sampai telepon baru; sapuan yatim memakai kursor; aksi menurut id", async () => {
  const a = await buat({konfirm: true, nomorDicari: "6281200000999"}); await aksi(a.id, {aksi: "telepon", hasil: "ingin"});
  assert.equal((await H.ohTeleponTerbaru(env, STAF, a.id)).segar, true);
  await H.ohPindah(env, STAF, {cari_id: a.id, dari: "menunggu", ke: "draf", alasan: "minta_perbaikan", oleh: "uji"}, kini); await H.ohPindah(env, STAF, {cari_id: a.id, dari: "draf", ke: "menunggu", oleh: "pelapor"}, kini);
  const t = await H.ohTeleponTerbaru(env, STAF, a.id); assert.deepEqual(t, {hasil: "ingin", segar: false});
  assert.deepEqual((await aksi(a.id, {aksi: "tayang"})).j.syarat_belum, ["telepon_belum_dicatat"], "telepon lama tidak cukup sesudah kirim ulang");
  await aksi(a.id, {aksi: "telepon", hasil: "tidak_ingin"}); await H.ohPindah(env, STAF, {cari_id: a.id, dari: "menunggu", ke: "draf", alasan: "minta_perbaikan", oleh: "uji"}, kini); await H.ohPindah(env, STAF, {cari_id: a.id, dari: "draf", ke: "menunggu", oleh: "pelapor"}, kini);
  assert.deepEqual((await aksi(a.id, {aksi: "tayang"})).j.syarat_belum, ["orang_tidak_ingin_dicari"], "tidak_ingin lama tetap memblokir");
  await aksi(a.id, {aksi: "telepon", hasil: "ingin"}); assert.equal((await aksi(a.id, {aksi: "tayang"})).s, 200, "telepon baru membuka");
  // aksi menurut id walau antrean lebih dari 100
  for (let i = 0; i < 101; i++) await buat({}); const akhir = await buat({}); assert.equal((await aksi(akhir.id, {aksi: "perbaikan", catatan: "uji"})).s, 200, "baris ke-102 tetap terjangkau");
  // kursor: lebih dari 1000 kunci yatim
  await Promise.all(Array.from({length: 1010}, (_, i) => R2.put(kunciFotoPublik(i.toString(16).padStart(32, "0")), "x")));
  await bersihOrangHilang(env, kini + 2 * 36e5); assert.equal((await R2.list({prefix: kunciFotoPublik("0".repeat(20))})).objects.length, 0, "semua halaman tersapu (1010 kunci)");
});
