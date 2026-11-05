/* Kemitraan Kampus D01/D05, perbaikan temuan pengulas (security-reviewer, guard-api) di src/kemitraan_akun.js, worker utuh + D1 + R2 sungguhan (TEST.md).
   Dijaga: akun terkunci dan email tak dikenal TAK TERBEDAKAN (status, isi, header); daftar ulang kampus (ditolak boleh, menunggu/dicabut diam); kunci R2 surat acak;
   laju daftar kampus 10/jam SEBELUM penguraian multipart dan terpisah dari anggota; kontak 3/hari; atur-sandi 21 -> 429; AG/BP asli 403 di aksi anggota; 405 + allow di semua rute baru;
   publik/kampus lewat cache tepi 300 dtk. Jalankan: node --test tests/warga/kemitraan_perbaikan.test.mjs */
import assert from "node:assert/strict";
import {siapkan, berantai, ADMIN, sha256} from "./_bnpb.mjs";
import {badanPanjang} from "./_bantu.mjs";
import "../../src/worker.js";

const U = await siapkan("uji-km-perbaikan", {r2: true}), uji = berantai();
const KINI = Date.now(), JAM = 3600e3, PB = {"x-pb": "1"}, SAMA = {origin: "http://bnpb.lokal"}, ST = {...ADMIN, ...SAMA};
let ipN = 0; const ip = () => ({"cf-connecting-ip": `10.6.${Math.floor(++ipN / 250)}.${ipN % 250}`});
const PDF = new Uint8Array([...new TextEncoder().encode("%PDF-1.4\n1 0 obj<<>>endobj\n"), ...Array(300).fill(65)]);
async function kirimForm(jalur, data, bytes, h = {}) {
  const f = new FormData(); f.append("data", JSON.stringify(data));
  if (bytes) f.append("surat", new File([bytes], "surat.pdf", {type: "application/pdf"}));
  const {body, headers} = await badanPanjang(f);
  const r = await U.mf.dispatchFetch("http://bnpb.lokal" + jalur, {method: "POST", headers: {...headers, ...ip(), ...h}, body});
  const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch (e) {}
  return {s: r.status, j, t, h: r.headers};
}
const dataKampus = (n, o = {}) => ({nama: `Universitas Perbaikan ${n} Raya`, singkatan: "UPR", jenis: "ptn", prov: "62", pic_nama: "Koordinator " + n, pic_jabatan: "Dosen", pic_email: `kp${n}@kampus.ac.id`, pic_wa: "0812600" + String(1000 + n), setuju: true, ...o});
const dataAnggota = (kampus_id, n, o = {}) => ({kampus_id, unsur: "dosen", nama: "Dosen Perbaikan " + n, wa: "0813600" + String(1000 + n), email: `dp${n}@kampus.ac.id`, kab4: "6211", keahlian: ["medis"], prodi: "Kesehatan", angkatan: 2005, setuju: true, ...o});
const kkH = (cookie, h = {}) => ({cookie, "x-km": "1", ...SAMA, ...h});
let nK = 0;
async function kampusAktif() {
  const n = 100 + ++nK, d = dataKampus(n);
  assert.equal((await kirimForm("/api/kemitraan/daftar/kampus", d, PDF)).s, 201);
  const id = (await U.DB.prepare("SELECT id FROM institusi WHERE nama = ?").bind(d.nama).first()).id;
  const s = await U.api("POST", `/api/kemitraan/kampus/${id}`, {aksi: "setujui", peran: "mitra"}, {...ST, ...ip()}); assert.equal(s.s, 200, s.t);
  const sandi = "sandi-perbaikan-" + n;
  assert.equal((await U.api("POST", "/api/kemitraan/atur-sandi", {token: s.j.token, sandi}, {...SAMA, ...ip()})).s, 200);
  const m = await U.api("POST", "/api/kemitraan/masuk", {email: d.pic_email, sandi}, {...SAMA, ...ip()}); assert.equal(m.s, 200, m.t);
  return {id, email: d.pic_email, sandi, cookie: m.h.get("set-cookie").split(";")[0]};
}
let nStaf = 0;
async function stafBaru(peran) {
  const r = await U.api("POST", "/api/staf/admin/buat", {nama: "Staf Uji", nip: `1983${++nStaf}0012005`, unit: "Direktorat Uji", email: `pb${nStaf}@bnpb.go.id`, wa: "081234567890", peran, wilayah: []}, ADMIN);
  assert.equal(r.s, 201, r.t);
  const m = await U.api("POST", "/api/staf/masuk", {username: r.j.username, sandi: r.j.sandi}, ip()), cookie = m.h.get("set-cookie").split(";")[0];
  assert.equal((await U.api("POST", "/api/staf/gantisandi", {}, {cookie, ...PB, ...ip()})).s, 200);
  return {cookie, ...PB, ...SAMA};
}

uji("masuk: akun terkunci dan email tak dikenal TAK TERBEDAKAN (status, isi, header); hitungan tak bergeser saat terkunci", async () => {
  const kk = await kampusAktif(), M = (email, sandi) => U.api("POST", "/api/kemitraan/masuk", {email, sandi}, {...SAMA, ...ip()});
  for (let i = 0; i < 5; i++) assert.equal((await M(kk.email, "salah-salah-salah")).s, 401);
  assert.ok((await U.DB.prepare("SELECT kunci_sampai k FROM km_akun WHERE email = ?").bind(kk.email).first()).k > Date.now(), "terkunci");
  const terkunci = await M(kk.email, kk.sandi), asing = await M("tidakada@kampus.ac.id", kk.sandi), salah = await M("tidakada@kampus.ac.id", "salah-salah-salah");
  assert.equal(terkunci.s, 401, terkunci.t); assert.equal(terkunci.s, asing.s); assert.equal(terkunci.t, asing.t, "isi sama persis"); assert.equal(asing.t, salah.t);
  for (const x of [terkunci, asing]) assert.equal(x.h.get("retry-after"), null, "tanpa header pembeda");
  assert.equal((await U.DB.prepare("SELECT gagal FROM km_akun WHERE email = ?").bind(kk.email).first()).gagal, 0, "percobaan saat terkunci tidak menggeser hitungan");
  await U.DB.prepare("UPDATE km_akun SET kunci_sampai = ? WHERE email = ?").bind(KINI - 1, kk.email).run();
  assert.equal((await M(kk.email, kk.sandi)).s, 200, "kunci lewat: masuk lagi");
});
uji("daftar ulang kampus: ditolak boleh mendaftar lagi (akun menunggu, surat diganti, tampil di antrean); menunggu dan dicabut diam-diam 201 tanpa efek", async () => {
  const d = dataKampus(5000, {nama: "Universitas Daftar Ulang Raya"});
  assert.equal((await kirimForm("/api/kemitraan/daftar/kampus", d, PDF)).s, 201);
  const id = (await U.DB.prepare("SELECT id FROM institusi WHERE nama = ?").bind(d.nama).first()).id, J = `/api/kemitraan/kampus/${id}`, R2 = await U.mf.getR2Bucket("MEDIA");
  const surat1 = (await U.DB.prepare("SELECT surat_r2 s FROM km_kampus WHERE institusi_id = ?").bind(id).first()).s;
  assert.ok(!surat1.includes(id), "kunci R2 acak, bukan turunan id institusi");
  const snap = async () => JSON.stringify([await U.DB.prepare("SELECT status, surat_r2 FROM km_kampus WHERE institusi_id = ?").bind(id).first(), await U.n("km_akun", `institusi_id = '${id}'`), await U.n("km_jejak", `baris = '${id}'`)]);
  const s0 = await snap(), lagi = await kirimForm("/api/kemitraan/daftar/kampus", {...d, pic_email: "lain5000@kampus.ac.id"}, PDF);
  assert.equal(lagi.s, 201); assert.equal(await snap(), s0, "menunggu: tanpa efek");
  assert.equal((await U.api("POST", J, {aksi: "tolak", alasan: "surat tugas buram"}, {...ST, ...ip()})).s, 200);
  const r1 = await kirimForm("/api/kemitraan/daftar/kampus", {...d, pic_nama: "Koordinator Baru"}, PDF); assert.equal(r1.s, 201, r1.t);   // email sama: akun ditolak dipakai ulang
  const k1 = await U.DB.prepare("SELECT status, surat_r2, alasan FROM km_kampus WHERE institusi_id = ?").bind(id).first();
  assert.equal(k1.status, "menunggu"); assert.equal(k1.alasan, null); assert.notEqual(k1.surat_r2, surat1); assert.match(k1.surat_r2, /^kemitraan\/surat\/[0-9a-f]{16}\.pdf$/);
  assert.equal(await R2.head(surat1), null, "surat lama dihapus"); assert.ok(await R2.head(k1.surat_r2), "surat baru ada");
  const a1 = (await U.DB.prepare("SELECT nama, status, sandi_sha FROM km_akun WHERE institusi_id = ?").bind(id).all()).results;
  assert.equal(a1.length, 1); assert.deepEqual([a1[0].nama, a1[0].status, a1[0].sandi_sha], ["Koordinator Baru", "menunggu", null]);
  assert.equal(await U.n("institusi", `nama = '${d.nama}'`), 1, "institusi tidak digandakan");
  const antre = await U.api("GET", "/api/kemitraan/kampus?status=menunggu", undefined, {...ST, ...ip()}); assert.ok(antre.j.kampus.some(k => k.id === id), "staf melihatnya lagi di antrean");
  assert.deepEqual((await U.DB.prepare("SELECT aksi FROM km_jejak WHERE tabel = 'km_kampus' AND baris = ? ORDER BY id").bind(id).all()).results.map(x => x.aksi), ["daftar", "tolak", "daftar_ulang"]);
  /* ditolak lagi, email BERBEDA: akun kedua, yang lama tetap ditolak */
  assert.equal((await U.api("POST", J, {aksi: "tolak", alasan: "masih buram"}, {...ST, ...ip()})).s, 200);
  assert.equal((await kirimForm("/api/kemitraan/daftar/kampus", {...d, pic_email: "baru5000@kampus.ac.id", pic_nama: "Koordinator Dua"}, PDF)).s, 201);
  assert.deepEqual((await U.DB.prepare("SELECT status FROM km_akun WHERE institusi_id = ?").bind(id).all()).results.map(x => x.status).sort(), ["ditolak", "menunggu"]);
  /* butir 4: lembar persetujuan memperlihatkan PIC institusi yang sudah ada DAN pemohon baru, supaya staf bisa mencocokkan */
  const lembar = await U.api("GET", J, undefined, {...ST, ...ip()});
  assert.equal(lembar.j.pic.email, d.pic_email, "PIC institusi lama"); assert.ok(lembar.j.akun.some(a => a.email === "baru5000@kampus.ac.id" && a.status === "menunggu"), "pemohon baru");
  const s = await U.api("POST", J, {aksi: "setujui", peran: "mitra"}, {...ST, ...ip()}); assert.equal(s.s, 200, s.t);
  assert.equal((await U.api("POST", "/api/kemitraan/atur-sandi", {token: s.j.token, sandi: "sandi-daftar-ulang-ok"}, {...SAMA, ...ip()})).s, 200);
  assert.equal((await U.api("POST", "/api/kemitraan/masuk", {email: "baru5000@kampus.ac.id", sandi: "sandi-daftar-ulang-ok"}, {...SAMA, ...ip()})).s, 200, "pemohon baru bisa masuk");
  assert.equal((await U.api("POST", "/api/kemitraan/masuk", {email: d.pic_email, sandi: "sandi-daftar-ulang-ok"}, {...SAMA, ...ip()})).s, 401, "akun ditolak lama tetap mati");
  await U.DB.prepare("UPDATE km_kampus SET status = 'dicabut' WHERE institusi_id = ?").bind(id).run();
  const s2 = await snap(), dic = await kirimForm("/api/kemitraan/daftar/kampus", {...d, pic_email: "dicabut5000@kampus.ac.id"}, PDF);
  assert.equal(dic.s, 201); assert.equal(dic.t, r1.t, "jawaban identik"); assert.equal(await snap(), s2, "dicabut: tanpa efek");
});
uji("laju daftar: kampus 10/jam/IP (ke-11 429, SEBELUM membaca badan) terpisah dari anggota; anggota 3/hari per kontak", async () => {
  const tetap = {"cf-connecting-ip": "10.97.0.1"}; let s = 0;
  for (let i = 0; i < 10; i++) s = (await kirimForm("/api/kemitraan/daftar/kampus", dataKampus(6000 + i, {nama: `Universitas Laju ${i} Raya`}), PDF, tetap)).s;
  assert.equal(s, 201);
  const sebelas = await kirimForm("/api/kemitraan/daftar/kampus", dataKampus(6100, {nama: "Universitas Laju Sebelas"}), PDF, tetap); assert.equal(sebelas.s, 429, sebelas.t);
  const besar = await U.mf.dispatchFetch("http://bnpb.lokal/api/kemitraan/daftar/kampus", {method: "POST", headers: {...tetap, "content-type": "multipart/form-data; boundary=x", "content-length": "12"}, body: "tidak dibaca"});
  assert.equal(besar.status, 429, "laju mendahului penguraian multipart"); await besar.text();
  const kk = await kampusAktif();
  assert.notEqual((await U.api("POST", "/api/kemitraan/daftar/anggota", dataAnggota(kk.id, 6200), tetap)).s, 429, "kunci laju anggota terpisah dari kampus");
  const kontak = {wa: "081377700001", email: "kontak7000@kampus.ac.id"}, hasil = [];
  for (let i = 0; i < 4; i++) hasil.push((await U.api("POST", "/api/kemitraan/daftar/anggota", dataAnggota(kk.id, 7000, kontak), ip())).s);
  assert.deepEqual(hasil, [201, 201, 201, 429], "kontak yang sama: 3 per hari walau IP berganti");
});
uji("atur-sandi: permintaan ke-21 dari satu IP dalam sejam -> 429", async () => {
  const tetap = {"cf-connecting-ip": "10.97.0.2", ...SAMA}, hasil = [];
  for (let i = 0; i < 21; i++) hasil.push((await U.api("POST", "/api/kemitraan/atur-sandi", {token: "0".repeat(32), sandi: "sandi-panjang-sekali"}, tetap)).s);
  assert.deepEqual([hasil[0], hasil[19], hasil[20]], [403, 403, 429]);
});
uji("hak anggota: AG dan BP dengan kode ASLI ditolak 403; ?anggota=liar 400; PM baca daftar kampus tanpa kontak; surat: tamu 401, PM dan KK 403; rute penampung 401/501", async () => {
  const kk = await kampusAktif(), dA = dataAnggota(kk.id, 8000); await U.api("POST", "/api/kemitraan/daftar/anggota", dA, ip());
  const rid = (await U.DB.prepare("SELECT id FROM relawan WHERE email = ?").bind(dA.email).first()).id, J = `/api/kemitraan/kampus/${kk.id}/anggota/${rid}`;
  const s = await U.api("POST", J, {aksi: "setujui"}, kkH(kk.cookie, ip())); assert.equal(s.s, 200, s.t);
  const ag = await U.api("POST", J, {aksi: "kode"}, {"x-kode": s.j.kode, ...SAMA, ...ip()}); assert.equal(ag.s, 403, "AG asli: " + ag.t);
  const kodeBp = "e".repeat(26);
  await U.DB.prepare("INSERT INTO km_bpbd_kode (id, kode_sha, kab4, prov, nama, berlaku, dibuat) VALUES ('4444444444444444', ?, '6211', '62', 'Pak Anto', ?, ?)").bind(sha256(kodeBp), KINI + JAM, KINI).run();
  assert.equal((await U.api("GET", "/api/kemitraan/saya", undefined, {"x-kode": kodeBp, ...ip()})).j.jenis, "BP");
  const bp = await U.api("POST", J, {aksi: "kode"}, {"x-kode": kodeBp, ...SAMA, ...ip()}); assert.equal(bp.s, 403, "BP asli: " + bp.t);
  assert.equal((await U.api("GET", `/api/kemitraan/kampus/${kk.id}?anggota=liar`, undefined, {...ADMIN, ...ip()})).s, 400, "?anggota=liar");
  assert.equal((await U.api("GET", `/api/kemitraan/kampus/${kk.id}?anggota=terdaftar`, undefined, {...ADMIN, ...ip()})).s, 200);
  const pm = await stafBaru(["pimpinan"]);
  const l = await U.api("GET", "/api/kemitraan/kampus", undefined, {...pm, ...ip()}); assert.equal(l.s, 200, l.t); assert.ok(l.j.kampus.length >= 1); assert.doesNotMatch(l.t, /pic_|@kampus\.ac\.id|"wa"/, "daftar untuk PM tanpa kontak");
  assert.equal((await U.api("GET", `/api/kemitraan/kampus/${kk.id}/surat`, undefined, {...pm, ...ip()})).s, 403, "PM");
  assert.equal((await U.api("GET", `/api/kemitraan/kampus/${kk.id}/surat`, undefined, {cookie: kk.cookie, ...ip()})).s, 403, "KK");
  assert.equal((await U.api("GET", `/api/kemitraan/kampus/${kk.id}/surat`, undefined, ip())).s, 401, "tamu: 401 (belum masuk), konvensi izin()");
  for (const [m, j] of [["GET", "/api/kemitraan/daerah/6211/pakar"], ["POST", "/api/kemitraan/masalah/0123456789abcdef/pakar/A5012345"]]) {
    assert.equal((await U.api(m, j, m === "POST" ? {} : undefined, {...SAMA, ...ip()})).s, 401, `${m} ${j} tanpa hak`);
    assert.equal((await U.api(m, j, m === "POST" ? {} : undefined, {...ST, ...ip()})).s, 501, `${m} ${j} dengan hak`);
  }
});
uji("publik/kampus: lewat cache tepi 300 dtk (cacheable, public), kunci tanpa kueri", async () => {
  const r = await U.api("GET", "/api/kemitraan/publik/kampus", undefined, ip());
  assert.equal(r.s, 200); assert.equal(r.h.get("cache-control"), "public, max-age=300");
  assert.equal((await U.api("GET", "/api/kemitraan/publik/kampus?x=acak", undefined, ip())).t, r.t);
});
uji("405: PUT/DELETE/PATCH/OPTIONS pada semua rute baru (allow benar); HEAD pada rute khusus-POST", async () => {
  const id = "0123456789abcdef", rid = "fedcba9876543210";
  const RUTE = [["/api/kemitraan/publik/kampus", "GET"], ["/api/kemitraan/daftar/kampus", "POST"], ["/api/kemitraan/daftar/anggota", "POST"], ["/api/kemitraan/masuk", "POST"], ["/api/kemitraan/atur-sandi", "POST"],
    ["/api/kemitraan/keluar", "POST"], ["/api/kemitraan/kampus", "GET"], [`/api/kemitraan/kampus/${id}`, "GET, POST"], [`/api/kemitraan/kampus/${id}/surat`, "GET"], [`/api/kemitraan/kampus/${id}/anggota/${rid}`, "POST"],
    ["/api/kemitraan/perjanjian", "GET, POST"], [`/api/kemitraan/perjanjian/${id}`, "GET"], ["/api/kemitraan/bpbd-kode", "POST"], ["/api/kemitraan/saya", "GET"]];
  for (const [j, allow] of RUTE) {
    for (const m of ["PUT", "DELETE", "PATCH", "OPTIONS"]) {
      const r = await U.api(m, j, undefined, {...ST, ...ip()});
      assert.equal(r.s, 405, `${m} ${j}: harus 405, dapat ${r.s} ${r.t}`); assert.equal(r.h.get("allow"), allow, `${m} ${j}: allow`);
    }
    if (allow === "POST") { const h = await U.api("HEAD", j, undefined, {...ST, ...ip()}); assert.equal(h.s, 405, `HEAD ${j}`); assert.equal(h.h.get("allow"), "POST"); }
  }
});
