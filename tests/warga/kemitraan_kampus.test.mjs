/* Kemitraan Kampus KM-D05: rute kampus (daftar, lembar, setujui/tolak/profil/tautan), arsip perjanjian MoU/PKS (multipart R2), kode BPBD, daftar kampus publik (src/kemitraan_akun.js, src/kemitraan_hitung.js)
   di atas worker utuh (Miniflare), D1 lokal dan R2 sungguhan, tanpa mock klien DB (TEST.md).
   Dijaga: KK tidak bisa membaca atau mengubah kampus lain (403, sebelum cari); PM hanya baca; perjanjian: PNG berlabel .pdf 400, 6 MB 413, berakhir <= mulai 400, KK tak boleh MoU payung;
   unduh attachment + nosniff + sandbox; kode BPBD hanya sha di D1, kab4 liar 400, hari di luar 30-365 400; statusPerjanjian cocok dengan kasus acuan A13.
   Jalankan: node --test tests/warga/kemitraan_kampus.test.mjs */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {siapkan, berantai, ADMIN, MOD2, sha256} from "./_bnpb.mjs";
import {badanPanjang} from "./_bantu.mjs";
import "../../src/worker.js";
import {statusPerjanjian} from "../../src/kemitraan_hitung.js";

const U = await siapkan("uji-km-kampus", {r2: true}), uji = berantai();
const PB = {"x-pb": "1"}, JAM = 3600e3, KINI = Date.now(), SAMA = {origin: "http://bnpb.lokal"};
let ipN = 0; const ip = () => ({"cf-connecting-ip": `10.8.${Math.floor(++ipN / 250)}.${ipN % 250}`});
const PDF = new Uint8Array([...new TextEncoder().encode("%PDF-1.4\n1 0 obj<<>>endobj\n"), ...Array(300).fill(65)]);
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, ...Array(300).fill(1)]);
const ST = {...ADMIN, ...SAMA}, MOD = {...MOD2, ...SAMA};
const kkH = (k, h = {}) => ({cookie: k.cookie, "x-km": "1", ...SAMA, ...ip(), ...h});

async function form(jalur, data, bytes, h = {}, medan = "surat") {
  const f = new FormData(); f.append("data", JSON.stringify(data));
  if (bytes) f.append(medan, new File([bytes], "x.pdf", {type: "application/pdf"}));
  const {body, headers} = await badanPanjang(f);
  const r = await U.mf.dispatchFetch("http://bnpb.lokal" + jalur, {method: "POST", headers: {...headers, ...ip(), ...h}, body});
  const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch (e) {}
  return {s: r.status, j, t, h: r.headers};
}
let nK = 0;
async function daftarKampus(nama) {
  const n = ++nK, d = {nama, jenis: "pts", prov: "62", pic_nama: "Koordinator " + n, pic_jabatan: "Dosen", pic_email: `koor${n}@kampus.ac.id`, pic_wa: "0812800" + String(1000 + n), setuju: true};
  const r = await form("/api/kemitraan/daftar/kampus", d, PDF); assert.equal(r.s, 201, r.t);
  return {id: (await U.DB.prepare("SELECT id FROM institusi WHERE nama = ?").bind(nama).first()).id, d};
}
async function kampusAktif(peran = "mitra") {
  const nama = `Universitas Kampus Uji ${nK + 1} Raya`, {id, d} = await daftarKampus(nama);
  const s = await U.api("POST", `/api/kemitraan/kampus/${id}`, {aksi: "setujui", peran}, {...ST, ...ip()}); assert.equal(s.s, 200, s.t);
  const sandi = "sandi-uji-koordinator-" + nK;
  assert.equal((await U.api("POST", "/api/kemitraan/atur-sandi", {token: s.j.token, sandi}, {...SAMA, ...ip()})).s, 200);
  const m = await U.api("POST", "/api/kemitraan/masuk", {email: d.pic_email, sandi}, {...SAMA, ...ip()}); assert.equal(m.s, 200, m.t);
  return {id, nama, cookie: m.h.get("set-cookie").split(";")[0]};
}
let nStaf = 0;
async function stafBaru(peran) {
  const r = await U.api("POST", "/api/staf/admin/buat", {nama: "Staf Uji", nip: `1982${++nStaf}0012005`, unit: "Direktorat Uji", email: `kp${nStaf}@bnpb.go.id`, wa: "081234567890", peran, wilayah: []}, ADMIN);
  assert.equal(r.s, 201, r.t);
  const m = await U.api("POST", "/api/staf/masuk", {username: r.j.username, sandi: r.j.sandi}, ip()), cookie = m.h.get("set-cookie").split(";")[0];
  assert.equal((await U.api("POST", "/api/staf/gantisandi", {}, {cookie, ...PB, ...ip()})).s, 200);
  return {cookie, ...PB, ...SAMA};
}
const perj = (o = {}) => ({jenis: "mou_kampus", nomor: "MoU/001/2026", pihak: "BNPB dan Kampus", mulai: "2026-01-01", berakhir: "2028-01-01", ...o});

uji("statusPerjanjian cocok dengan kasus acuan A13 (acuan.json) dan menerima ms epoch", async () => {
  const acuan = JSON.parse(readFileSync(new URL("../kemitraan/fixtures/acuan.json", import.meta.url), "utf8")).status_perjanjian;
  assert.ok(acuan.length >= 5);
  for (const k of acuan) assert.equal(statusPerjanjian(k.masuk.berakhir, k.masuk.kini), k.keluar, `${k.id}: berakhir ${k.masuk.berakhir} kini ${k.masuk.kini}`);
  assert.equal(statusPerjanjian("2026-12-29", Date.parse("2026-10-30T05:00:00Z")), "segera_habis", "ms epoch dibaca sebagai hari WIB");
});
uji("daftar kampus publik hanya yang aktif (nama, prov); tanpa kontak", async () => {
  const k = await kampusAktif("simpul"); await daftarKampus("Universitas Masih Menunggu Raya");
  const r = await U.api("GET", "/api/kemitraan/publik/kampus", undefined, ip()); assert.equal(r.s, 200, r.t);
  assert.deepEqual(r.j.kampus.map(x => x.id), [k.id]); assert.deepEqual(Object.keys(r.j.kampus[0]).sort(), ["id", "nama", "prov", "singkatan"]);
  assert.doesNotMatch(r.t, /@|0812|62812/, "tanpa kontak"); assert.match(r.h.get("cache-control"), /max-age=300/);
});
uji("setujui/tolak: hanya staf, peran wajib sah, tolak wajib alasan, tidak dua kali; KK tak bisa menyetujui dirinya", async () => {
  const a = await daftarKampus("Universitas Antrean Pertama Raya"), b = await daftarKampus("Universitas Antrean Kedua Raya");
  const kk = await kampusAktif(), J = id => `/api/kemitraan/kampus/${id}`;
  assert.equal((await U.api("POST", J(a.id), {aksi: "setujui", peran: "mitra"}, kkH(kk))).s, 403, "KK bukan staf");
  assert.equal((await U.api("POST", J(a.id), {aksi: "setujui", peran: "mitra"}, ip())).s, 401, "tamu");
  assert.equal((await U.api("POST", J(a.id), {aksi: "setujui", peran: "raja"}, {...ST, ...ip()})).s, 400, "peran liar");
  assert.equal((await U.api("POST", J(a.id), {aksi: "setujui"}, {...ST, ...ip()})).s, 400, "tanpa peran");
  assert.equal((await U.api("POST", J(a.id), {aksi: "setujui", peran: "mitra", simpul_id: "0".repeat(16)}, {...ST, ...ip()})).s, 400, "simpul_id hanya untuk satelit");
  assert.equal((await U.api("POST", J(a.id), {aksi: "setujui", peran: "satelit", simpul_id: kk.id}, {...ST, ...ip()})).s, 400, "kampus itu bukan simpul");
  assert.equal((await U.api("POST", J(a.id), {aksi: "bebas"}, {...ST, ...ip()})).s, 400, "aksi liar");
  assert.equal((await U.api("POST", J(a.id), {aksi: "tolak"}, {...ST, ...ip()})).s, 400, "tolak tanpa alasan");
  assert.equal((await U.DB.prepare("SELECT status FROM km_kampus WHERE institusi_id = ?").bind(a.id).first()).status, "menunggu", "penolakan tidak mengubah apa pun");
  const t = await U.api("POST", J(a.id), {aksi: "tolak", alasan: "surat tugas tidak sah"}, {...ST, ...ip()}); assert.equal(t.s, 200, t.t);
  assert.deepEqual(await U.DB.prepare("SELECT k.status, k.alasan, a.status akun FROM km_kampus k JOIN km_akun a ON a.institusi_id = k.institusi_id WHERE k.institusi_id = ?").bind(a.id).first(), {status: "ditolak", alasan: "surat tugas tidak sah", akun: "ditolak"});
  assert.equal((await U.api("POST", J(a.id), {aksi: "setujui", peran: "mitra"}, {...ST, ...ip()})).s, 409, "yang ditolak tak bisa disetujui");
  assert.equal((await U.api("POST", J(a.id), {aksi: "tolak", alasan: "ulang saja"}, {...ST, ...ip()})).s, 409);
  assert.equal((await U.api("POST", J("f".repeat(16)), {aksi: "tolak", alasan: "tidak ada"}, {...ST, ...ip()})).s, 404);
  /* satelit menunjuk simpul aktif; moderator biasa (ST) boleh */
  const simpul = await kampusAktif("simpul");
  const s = await U.api("POST", J(b.id), {aksi: "setujui", peran: "satelit", simpul_id: simpul.id}, {...MOD, ...ip()}); assert.equal(s.s, 200, s.t);
  const bk = await U.DB.prepare("SELECT status, peran, simpul_id, disetujui FROM km_kampus WHERE institusi_id = ?").bind(b.id).first();
  assert.deepEqual([bk.status, bk.peran, bk.simpul_id], ["aktif", "satelit", simpul.id]); assert.ok(bk.disetujui);
  assert.deepEqual((await U.DB.prepare("SELECT aksi FROM km_jejak WHERE tabel = 'km_kampus' AND baris = ? ORDER BY id").bind(a.id).all()).results.map(x => x.aksi), ["daftar", "tolak"]);
});
uji("tautan atur sandi baru oleh staf mematikan tautan lama; hanya untuk kampus aktif dan staf", async () => {
  const kk = await kampusAktif(), J = `/api/kemitraan/kampus/${kk.id}`;
  assert.equal((await U.api("POST", J, {aksi: "tautan"}, kkH(kk))).s, 403, "KK tak bisa menerbitkan tautan");
  const t1 = await U.api("POST", J, {aksi: "tautan"}, {...ST, ...ip()}), t2 = await U.api("POST", J, {aksi: "tautan"}, {...ST, ...ip()});
  assert.equal(t1.s, 200, t1.t); assert.match(t2.j.token, /^[0-9a-f]{32}$/);
  assert.equal((await U.api("POST", "/api/kemitraan/atur-sandi", {token: t1.j.token, sandi: "sandi-baru-yang-panjang"}, {...SAMA, ...ip()})).s, 403, "tautan lama mati");
  assert.equal((await U.api("POST", "/api/kemitraan/atur-sandi", {token: t2.j.token, sandi: "sandi-baru-yang-panjang"}, {...SAMA, ...ip()})).s, 200);
  const menunggu = await daftarKampus("Universitas Belum Aktif Sekali");
  assert.equal((await U.api("POST", `/api/kemitraan/kampus/${menunggu.id}`, {aksi: "tautan"}, {...ST, ...ip()})).s, 409, "kampus belum aktif");
});
uji("baca kampus: ST semua, KK hanya miliknya (kampus lain 403, bukan 404), PM tanpa kontak PIC dan anggota agregat, AG/BP/tamu ditolak", async () => {
  const a = await kampusAktif(), b = await kampusAktif(), pm = await stafBaru(["pimpinan"]);
  const daftar = await U.api("GET", "/api/kemitraan/kampus?status=aktif", undefined, {...ST, ...ip()});
  assert.equal(daftar.s, 200, daftar.t); assert.ok(daftar.j.kampus.length >= 2); assert.ok(daftar.j.kampus.every(k => k.status === "aktif"));
  const sendiri = await U.api("GET", "/api/kemitraan/kampus", undefined, {cookie: a.cookie, ...ip()});
  assert.deepEqual(sendiri.j.kampus.map(k => k.id), [a.id], "KK hanya melihat kampusnya");
  const lembar = await U.api("GET", `/api/kemitraan/kampus/${a.id}`, undefined, {cookie: a.cookie, ...ip()});
  assert.equal(lembar.s, 200, lembar.t); assert.equal(lembar.j.kampus.nama, a.nama); assert.ok(lembar.j.pic.email); assert.deepEqual(lembar.j.anggota, []);
  assert.equal((await U.api("GET", `/api/kemitraan/kampus/${b.id}`, undefined, {cookie: a.cookie, ...ip()})).s, 403, "KK kampus lain");
  assert.equal((await U.api("GET", `/api/kemitraan/kampus/${"e".repeat(16)}`, undefined, {cookie: a.cookie, ...ip()})).s, 403, "kampus yang tidak ada: sama dengan milik lain (tanpa oracle)");
  assert.equal((await U.api("GET", `/api/kemitraan/kampus/${"e".repeat(16)}`, undefined, {...ST, ...ip()})).s, 404);
  assert.equal((await U.api("GET", `/api/kemitraan/kampus/${a.id}`, undefined, ip())).s, 401);
  const kode = "d".repeat(26); await U.DB.prepare("INSERT INTO km_bpbd_kode (id, kode_sha, kab4, prov, nama, berlaku, dibuat) VALUES ('2222222222222222', ?, '6211', '62', 'Pak Anto', ?, ?)").bind(sha256(kode), KINI + JAM, KINI).run();
  for (const j of ["/api/kemitraan/kampus", `/api/kemitraan/kampus/${a.id}`, "/api/kemitraan/perjanjian"]) assert.equal((await U.api("GET", j, undefined, {"x-kode": kode, ...ip()})).s, 403, `BP ditolak: ${j}`);
  const p = await U.api("GET", `/api/kemitraan/kampus/${a.id}`, undefined, {...pm, ...ip()});
  assert.equal(p.s, 200, p.t); assert.equal(p.j.pic, undefined, "PM tanpa kontak PIC"); assert.equal(p.j.anggota, undefined, "PM tanpa daftar anggota");
  assert.deepEqual(Object.values(p.j.anggota_agregat), Array(4).fill("di bawah 5"), "k < 5 tidak dirilis");
  assert.equal((await U.api("POST", `/api/kemitraan/kampus/${a.id}`, {aksi: "tautan"}, {...pm, ...ip()})).s, 403, "PM tidak menulis");
  assert.equal((await U.api("GET", "/api/kemitraan/kampus?status=liar", undefined, {...ST, ...ip()})).s, 400);
  const sur = await U.api("GET", `/api/kemitraan/kampus/${a.id}/surat`, undefined, {...ST, ...ip()});
  assert.equal(sur.s, 200); assert.match(sur.h.get("content-disposition"), /^attachment/); assert.equal(sur.h.get("x-content-type-options"), "nosniff");
  assert.equal((await U.api("GET", `/api/kemitraan/kampus/${a.id}/surat`, undefined, {cookie: a.cookie, ...ip()})).s, 403, "surat tugas hanya staf");
});
uji("profil kampus: KK miliknya dan ST; KK lain 403; nilai liar 400", async () => {
  const a = await kampusAktif(), b = await kampusAktif(), J = id => `/api/kemitraan/kampus/${id}`;
  const ok = {aksi: "profil", kota: "Palangka Raya", lat: -2.21, lon: 113.92, web: "https://kampus.ac.id", mk_dibuka: 2027, pusat_studi: ["Pusat Studi Bencana"], fasilitas: [{jenis: "posko", nama: "Gedung Rektorat", kapasitas: 200, lat: -2.2, lon: 113.9}]};
  assert.equal((await U.api("POST", J(a.id), ok, kkH(b))).s, 403, "KK kampus lain");
  const r = await U.api("POST", J(a.id), ok, kkH(a)); assert.equal(r.s, 200, r.t);
  const l = await U.api("GET", J(a.id), undefined, {cookie: a.cookie, ...ip()});
  assert.equal(l.j.kampus.kota, "Palangka Raya"); assert.equal(l.j.kampus.mk_dibuka, 2027); assert.deepEqual(l.j.kampus.pusat_studi, ["Pusat Studi Bencana"]); assert.equal(l.j.kampus.fasilitas[0].jenis, "posko");
  for (const [nama, o] of [["web http", {web: "http://kampus.ac.id"}], ["web bukan url", {web: "https://"}], ["lat di luar", {lat: 40}], ["lon di luar", {lon: 10}], ["tahun liar", {mk_dibuka: 1999}], ["kota 1 huruf", {kota: "A"}],
    ["fasilitas jenis liar", {fasilitas: [{jenis: "bandara", nama: "Landasan"}]}], ["fasilitas bukan larik", {fasilitas: "posko"}], ["pusat_studi 11 butir", {pusat_studi: Array(11).fill("Pusat Studi")}], ["kosong", {}]])
    { const x = await U.api("POST", J(a.id), {aksi: "profil", ...o}, kkH(a)); assert.equal(x.s, 400, `${nama}: harus 400, dapat ${x.s} ${x.t}`); }
  assert.equal((await U.api("POST", J(a.id), {aksi: "profil", kota: "Banjarmasin"}, {...ST, ...ip()})).s, 200, "ST boleh mengisi profil");
  const menunggu = await daftarKampus("Universitas Profil Belum Aktif");
  assert.equal((await U.api("POST", J(menunggu.id), {aksi: "profil", kota: "Medan"}, {...ST, ...ip()})).s, 409, "profil hanya untuk kampus aktif");
});
uji("perjanjian: KK 201 + PDF di R2; PNG berlabel .pdf 400; 6 MB 413; berakhir <= mulai 400; KK tak boleh MoU payung atau kampus lain", async () => {
  const a = await kampusAktif(), b = await kampusAktif();
  const r = await form("/api/kemitraan/perjanjian", perj(), PDF, kkH(a), "berkas"); assert.equal(r.s, 201, r.t);
  assert.equal(r.j.status, "aktif"); const id = r.j.id;
  const baris = await U.DB.prepare("SELECT institusi_id, berkas_r2, jenis FROM km_perjanjian WHERE id = ?").bind(id).first();
  assert.deepEqual([baris.institusi_id, baris.berkas_r2, baris.jenis], [a.id, `kemitraan/perjanjian/${id}.pdf`, "mou_kampus"]);
  const objek = await (await U.mf.getR2Bucket("MEDIA")).get(baris.berkas_r2); assert.deepEqual(new Uint8Array(await objek.arrayBuffer()), PDF);
  const X = async (nama, o, bytes, s, h = kkH(a)) => { const x = await form("/api/kemitraan/perjanjian", o, bytes, h, "berkas"); assert.equal(x.s, s, `${nama}: harus ${s}, dapat ${x.s} ${x.t}`); return x; };
  await X("PNG berlabel pdf", perj({nomor: "MoU/002/2026"}), PNG, 400);
  await X("6 MB", perj({nomor: "MoU/003/2026"}), new Uint8Array(6 * 1048576).fill(37), 413);
  await X("berakhir = mulai", perj({nomor: "MoU/004/2026", berakhir: "2026-01-01"}), PDF, 400);
  await X("berakhir sebelum mulai", perj({nomor: "MoU/005/2026", berakhir: "2025-01-01"}), PDF, 400);
  await X("tanggal tak ada", perj({nomor: "MoU/006/2026", mulai: "2026-02-30"}), PDF, 400);
  await X("jenis liar", perj({nomor: "MoU/007/2026", jenis: "rahasia"}), PDF, 400);
  await X("jenis lama (mou_relawan) bukan di sini", perj({nomor: "MoU/008/2026", jenis: "mou_relawan"}), PDF, 400);
  await X("nomor 2 huruf", perj({nomor: "ab"}), PDF, 400);
  await X("KK memakai MoU payung", perj({nomor: "MoU/009/2026", jenis: "mou_payung"}), PDF, 403);
  await X("tamu", perj({nomor: "MoU/010/2026"}), PDF, 401, {...SAMA});
  assert.equal(await U.n("km_perjanjian"), 1, "yang ditolak tidak meninggalkan baris");
  assert.equal((await (await U.mf.getR2Bucket("MEDIA")).list({prefix: "kemitraan/perjanjian/"})).objects.length, 1, "yang ditolak tidak meninggalkan berkas R2");
  /* institusi_id dari KK diabaikan: selalu kampusnya sendiri */
  const lain = await form("/api/kemitraan/perjanjian", perj({nomor: "MoU/011/2026", institusi_id: b.id}), PDF, kkH(a), "berkas"); assert.equal(lain.s, 201);
  assert.equal((await U.DB.prepare("SELECT institusi_id FROM km_perjanjian WHERE id = ?").bind(lain.j.id).first()).institusi_id, a.id, "KK tak bisa mencatat untuk kampus lain");
  /* ST mencatat untuk kampus mana pun, dan MoU payung tanpa institusi */
  const st = await form("/api/kemitraan/perjanjian", perj({nomor: "MoU/012/2026", institusi_id: b.id, jenis: "pks_satgas"}), null, {...ST}, "berkas"); assert.equal(st.s, 201, st.t);
  assert.equal((await U.DB.prepare("SELECT berkas_r2 FROM km_perjanjian WHERE id = ?").bind(st.j.id).first()).berkas_r2, null, "berkas boleh menyusul");
  const pay = await form("/api/kemitraan/perjanjian", perj({nomor: "MoU/013/2026", jenis: "mou_payung", institusi_id: b.id}), PDF, {...ST}, "berkas"); assert.equal(pay.s, 201, pay.t);
  assert.equal((await U.DB.prepare("SELECT institusi_id FROM km_perjanjian WHERE id = ?").bind(pay.j.id).first()).institusi_id, null, "MoU payung tanpa institusi");
  assert.equal((await form("/api/kemitraan/perjanjian", perj({nomor: "MoU/014/2026", institusi_id: undefined}), PDF, {...ST}, "berkas")).s, 400, "ST: institusi_id wajib selain payung");
  assert.equal((await form("/api/kemitraan/perjanjian", perj({nomor: "MoU/015/2026", institusi_id: "9".repeat(16)}), PDF, {...ST}, "berkas")).s, 404, "kampus tak ada");
  assert.equal(await U.n("km_jejak", "tabel = 'km_perjanjian' AND aksi = 'tambah'"), 4);
  /* status dari tanggal berakhir */
  const dekat = await form("/api/kemitraan/perjanjian", perj({nomor: "MoU/016/2026", mulai: "2020-01-01", berakhir: new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10)}), null, kkH(a), "berkas");
  assert.equal(dekat.j.status, "segera_habis");
  const lewat = await form("/api/kemitraan/perjanjian", perj({nomor: "MoU/017/2026", mulai: "2020-01-01", berakhir: "2021-01-01"}), null, kkH(a), "berkas"); assert.equal(lewat.j.status, "habis");
});
uji("perjanjian: daftar dan unduh; KK hanya miliknya (milik lain 403); PM baca; unduh attachment + nosniff + sandbox", async () => {
  const a = (await U.DB.prepare("SELECT institusi_id id FROM km_perjanjian WHERE berkas_r2 IS NOT NULL AND institusi_id IS NOT NULL LIMIT 1").first()).id;
  const b = (await U.DB.prepare("SELECT institusi_id id FROM km_kampus WHERE institusi_id <> ? AND status = 'aktif' LIMIT 1").bind(a).first()).id;
  const kkA = {};
  /* masuk ulang sebagai KK kampus a lewat tautan baru */
  const t = await U.api("POST", `/api/kemitraan/kampus/${a}`, {aksi: "tautan"}, {...ST, ...ip()});
  await U.api("POST", "/api/kemitraan/atur-sandi", {token: t.j.token, sandi: "sandi-ulang-yang-panjang"}, {...SAMA, ...ip()});
  const email = (await U.DB.prepare("SELECT email FROM km_akun WHERE institusi_id = ?").bind(a).first()).email;
  const m = await U.api("POST", "/api/kemitraan/masuk", {email, sandi: "sandi-ulang-yang-panjang"}, {...SAMA, ...ip()}); kkA.cookie = m.h.get("set-cookie").split(";")[0];
  const l = await U.api("GET", "/api/kemitraan/perjanjian", undefined, {cookie: kkA.cookie, ...ip()});
  assert.equal(l.s, 200, l.t); assert.ok(l.j.perjanjian.length >= 2); assert.ok(l.j.perjanjian.every(p => p.institusi_id === a), "KK hanya melihat perjanjian kampusnya");
  assert.ok(l.j.perjanjian.every(p => ["belum", "aktif", "segera_habis", "habis"].includes(p.status)));
  const semua = await U.api("GET", "/api/kemitraan/perjanjian", undefined, {...ST, ...ip()}); assert.ok(semua.j.perjanjian.length > l.j.perjanjian.length, "ST melihat semua kampus");
  assert.equal((await U.api("GET", `/api/kemitraan/perjanjian?institusi_id=${b}`, undefined, {cookie: kkA.cookie, ...ip()})).j.perjanjian.every(p => p.institusi_id === a), true, "filter institusi_id KK diabaikan");
  const mine = l.j.perjanjian.find(p => p.ada_berkas), lain = semua.j.perjanjian.find(p => p.institusi_id && p.institusi_id !== a && p.ada_berkas) ?? semua.j.perjanjian.find(p => p.institusi_id === null && p.ada_berkas);
  const d = await U.api("GET", `/api/kemitraan/perjanjian/${mine.id}`, undefined, {cookie: kkA.cookie, ...ip()});
  assert.equal(d.s, 200); assert.equal(d.h.get("content-type"), "application/pdf"); assert.match(d.h.get("content-disposition"), /^attachment; filename="perjanjian-[0-9a-f]{16}\.pdf"$/);
  assert.equal(d.h.get("x-content-type-options"), "nosniff"); assert.match(d.h.get("content-security-policy"), /sandbox/); assert.match(d.h.get("cache-control"), /no-store/); assert.match(d.t, /^%PDF/);
  assert.equal((await U.api("GET", `/api/kemitraan/perjanjian/${lain.id}`, undefined, {cookie: kkA.cookie, ...ip()})).s, 403, "perjanjian kampus lain/payung");
  assert.equal((await U.api("GET", `/api/kemitraan/perjanjian/${"1".repeat(16)}`, undefined, {cookie: kkA.cookie, ...ip()})).s, 403, "tidak ada = sama dengan milik lain");
  assert.equal((await U.api("GET", `/api/kemitraan/perjanjian/${"1".repeat(16)}`, undefined, {...ST, ...ip()})).s, 404);
  assert.equal((await U.api("GET", `/api/kemitraan/perjanjian/${mine.id}`, undefined, ip())).s, 401);
  const pm = await stafBaru(["pimpinan"]);
  assert.equal((await U.api("GET", "/api/kemitraan/perjanjian", undefined, {...pm, ...ip()})).s, 200, "PM membaca");
  assert.equal((await form("/api/kemitraan/perjanjian", perj({nomor: "MoU/PM/2026", institusi_id: a}), PDF, {...pm}, "berkas")).s, 403, "PM tidak menulis");
  assert.equal((await U.api("GET", "/api/kemitraan/perjanjian?institusi_id=xyz", undefined, {...ST, ...ip()})).s, 400);
  /* lembar kampus memuat perjanjian baru DAN lama (ADR-05) */
  await U.DB.prepare("INSERT INTO institusi_perjanjian (id, institusi_id, jenis_perjanjian, nomor, mulai, berakhir, kuota, dibuat, diubah) VALUES ('3333333333333333', ?, 'mou_relawan', 'LAMA/1', '2026-01-01', '2027-01-01', 10, ?, ?)").bind(a, KINI, KINI).run();
  const lb = await U.api("GET", `/api/kemitraan/kampus/${a}`, undefined, {cookie: kkA.cookie, ...ip()});
  assert.ok(lb.j.perjanjian.length >= 2); assert.equal(lb.j.perjanjian_lama[0].nomor, "LAMA/1"); assert.ok(lb.j.perjanjian_lama[0].status);
});
uji("kode BPBD: ST 201 kode sekali (hanya sha di D1) lalu BP dikenali; kab4 liar, hari di luar 30-365, WA liar 400; KK/PM/BP 403", async () => {
  const kk = await kampusAktif(), pm = await stafBaru(["pimpinan"]), B = (o, h = {...ST, ...ip()}) => U.api("POST", "/api/kemitraan/bpbd-kode", o, h);
  const dasar = {kab4: "6211", nama: "Pak Anto", jabatan: "Kepala Pelaksana", wa: "081355500011", berlaku_hari: 90};
  const r = await B(dasar); assert.equal(r.s, 201, r.t);
  assert.match(r.j.kode, /^[0-9a-f]{26}$/); assert.match(r.j.tautan, new RegExp(`/kemitraan/saya#k=${r.j.kode}$`));
  const baris = await U.DB.prepare("SELECT kode_sha, kab4, prov, jenis, berlaku, wa, dicabut FROM km_bpbd_kode WHERE id = ?").bind(r.j.id).first();
  assert.equal(baris.kode_sha, sha256(r.j.kode), "hanya sha di D1"); assert.deepEqual([baris.kab4, baris.prov, baris.jenis, baris.dicabut, baris.wa], ["6211", "62", "bpbd", null, "6281355500011"]);
  assert.ok(Math.abs(baris.berlaku - (Date.now() + 90 * 864e5)) < 60e3, "berlaku 90 hari");
  assert.doesNotMatch(JSON.stringify((await U.DB.prepare("SELECT * FROM km_bpbd_kode").all()).results), new RegExp(r.j.kode), "kode mentah tidak tersimpan");
  const me = await U.api("GET", "/api/kemitraan/saya", undefined, {"x-kode": r.j.kode, ...ip()});
  assert.equal(me.j.jenis, "BP"); assert.equal(me.j.profil.kab4, "6211");
  for (const [nama, o] of [["kab4 62AB", {kab4: "62AB"}], ["kab4 3 digit", {kab4: "621"}], ["kab4 tak dikenal", {kab4: "9999"}], ["kab4 angka", {kab4: 6211}], ["hari 29", {berlaku_hari: 29}], ["hari 366", {berlaku_hari: 366}],
    ["hari kosong", {berlaku_hari: null}], ["hari pecahan", {berlaku_hari: 30.5}], ["nama 1 huruf", {nama: "A"}], ["WA liar", {wa: "12"}], ["jabatan 1 huruf", {jabatan: "x"}]]) {
    const x = await B({...dasar, ...o}); assert.equal(x.s, 400, `${nama}: harus 400, dapat ${x.s} ${x.t}`);
  }
  assert.equal((await B({...dasar, wa: ""})).s, 201, "WA boleh kosong");
  assert.equal((await B(dasar, kkH(kk))).s, 403, "KK"); assert.equal((await B(dasar, {...pm, ...ip()})).s, 403, "PM");
  assert.equal((await B(dasar, {"x-kode": r.j.kode, ...SAMA, ...ip()})).s, 403, "BP tidak menerbitkan kode");
  assert.equal((await B(dasar, {...SAMA, ...ip()})).s, 401, "tamu");
  assert.equal(await U.n("km_jejak", "tabel = 'km_bpbd_kode' AND aksi = 'terbit'"), 2);
  /* laju 60/jam per penerbit */
  const penuh = []; for (let i = 0; i < 60; i++) penuh.push((await B(dasar)).s);
  assert.equal(penuh.at(-1), 429, "setelah 60 per jam: 429");
});
