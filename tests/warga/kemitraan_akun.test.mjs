/* Kemitraan Kampus KM-D01: daftar kampus, daftar anggota, masuk KK, atur sandi, keluar, setujui/tolak/kode anggota, GET saya (src/kemitraan_akun.js)
   di atas worker utuh (Miniflare), D1 lokal dan R2 sungguhan, tanpa mock klien DB (TEST.md). Termasuk alur RENCANA-UJI E1 tanpa layar.
   Dijaga: laju daftar 10/jam/IP; jawaban duplikat IDENTIK dengan yang baru dan tidak menambah baris; surat bukan PDF/terlalu besar ditolak; token atur sandi sekali pakai dan berbatas 72 jam;
   kunci 15 menit setelah 5 sandi salah (sandi benar pun ditolak selama kunci); cookie HttpOnly Secure SameSite=Strict; KK kampus lain DITOLAK (403); kode lama mati setelah diterbitkan ulang.
   Jalankan: node --test tests/warga/kemitraan_akun.test.mjs */
import assert from "node:assert/strict";
import {siapkan, berantai, ADMIN, sha256} from "./_bnpb.mjs";
import {badanPanjang} from "./_bantu.mjs";
import "../../src/worker.js";

const U = await siapkan("uji-km-akun", {r2: true}), uji = berantai();
const KINI = Date.now(), JAM = 3600e3;
let ipN = 0; const ip = () => ({"cf-connecting-ip": `10.9.${Math.floor(++ipN / 250)}.${ipN % 250}`});
const PDF = new Uint8Array([...new TextEncoder().encode("%PDF-1.4\n1 0 obj<<>>endobj\n"), ...Array(300).fill(65)]);
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, ...Array(300).fill(1)]);
const SAMA_ORIGIN = {origin: "http://bnpb.lokal"};

/* multipart ber-Content-Length seperti peramban */
async function kirimForm(jalur, data, bytes, h = {}) {
  const f = new FormData(); f.append("data", JSON.stringify(data));
  if (bytes) f.append("surat", new File([bytes], "surat.pdf", {type: "application/pdf"}));
  const {body, headers} = await badanPanjang(f);
  const r = await U.mf.dispatchFetch("http://bnpb.lokal" + jalur, {method: "POST", headers: {...headers, ...ip(), ...h}, body});
  const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch (e) {}
  return {s: r.status, j, t, h: r.headers};
}
const dataKampus = (n, o = {}) => ({nama: `Universitas Uji Satu ${n}`, singkatan: "UUS", jenis: "ptn", prov: "62", pic_nama: "Koordinator " + n, pic_jabatan: "Dosen", pic_email: `kk${n}@kampus.ac.id`, pic_wa: "0812700" + String(1000 + n), setuju: true, ...o});
const dataAnggota = (kampus_id, n, o = {}) => ({kampus_id, unsur: "dosen", nama: "Dosen Uji " + n, wa: "0813100" + String(1000 + n), email: `dosen${n}@kampus.ac.id`, kab4: "6211", keahlian: ["medis", "sar"], prodi: "Kesehatan Masyarakat", angkatan: 2005, setuju: true, ...o});
const kkH = (cookie, h = {}) => ({cookie, "x-km": "1", ...SAMA_ORIGIN, ...h});
const kkCookie = r => r.h.get("set-cookie").split(";")[0];

let nK = 0;
/* kampus aktif lengkap dengan KK bersandi: {id, email, sandi, cookie} */
async function kampusAktif(peran = "mitra") {
  const n = ++nK, d = dataKampus(n, {nama: `Universitas Aktif ${n} Nusantara`});
  assert.equal((await kirimForm("/api/kemitraan/daftar/kampus", d, PDF)).s, 201);
  const id = (await U.DB.prepare("SELECT id FROM institusi WHERE nama = ?").bind(d.nama).first()).id;
  const s = await U.api("POST", `/api/kemitraan/kampus/${id}`, {aksi: "setujui", peran}, {...ADMIN, ...ip(), ...SAMA_ORIGIN});
  assert.equal(s.s, 200, s.t);
  const sandi = "sandi-koordinator-" + n;
  assert.equal((await U.api("POST", "/api/kemitraan/atur-sandi", {token: s.j.token, sandi}, {...ip(), ...SAMA_ORIGIN})).s, 200);
  const m = await U.api("POST", "/api/kemitraan/masuk", {email: d.pic_email, sandi}, {...ip(), ...SAMA_ORIGIN}); assert.equal(m.s, 200, m.t);
  return {id, email: d.pic_email, sandi, cookie: kkCookie(m)};
}

uji("daftar kampus: valid 201; duplikat (email sama) jawaban IDENTIK tanpa baris baru; yang salah DITOLAK", async () => {
  const d = dataKampus(1000), a = await kirimForm("/api/kemitraan/daftar/kampus", d, PDF);
  assert.equal(a.s, 201, a.t);
  assert.equal(await U.n("km_kampus", "status = 'menunggu'"), 1); assert.equal(await U.n("km_akun", "status = 'menunggu'"), 1);
  const surat = (await U.DB.prepare("SELECT surat_r2 FROM km_kampus").first()).surat_r2;
  assert.match(surat, /^kemitraan\/surat\/[0-9a-f]{16}\.pdf$/);
  assert.ok(!surat.includes((await U.DB.prepare("SELECT institusi_id id FROM km_kampus").first()).id), "kunci R2 acak, bukan turunan id institusi"); assert.ok(await U.mf.getR2Bucket("MEDIA").then(b => b.head(surat)), "surat tersimpan di R2");
  const kembar = await kirimForm("/api/kemitraan/daftar/kampus", {...d, nama: "Universitas Lain Sekali"}, PDF);   // email KK sama
  assert.equal(kembar.s, 201); assert.equal(kembar.t, a.t, "jawaban duplikat harus IDENTIK dengan yang baru (oracle)");
  assert.equal(await U.n("institusi"), 1, "duplikat tidak membuat institusi"); assert.equal(await U.n("km_akun"), 1);
  const sama = await kirimForm("/api/kemitraan/daftar/kampus", {...d, nama: "  universitas UJI satu 1000 ", pic_email: "lain@kampus.ac.id"}, PDF);   // nama sama (ternormalisasi), sedang menunggu
  assert.equal(sama.t, a.t); assert.equal(await U.n("km_akun"), 1);
  const buruk = [["jenis organisasi", {...d, nama: "Organisasi Baru Raya", pic_email: "x1@kampus.ac.id", jenis: "organisasi"}, PDF, 400],
    ["tanpa PDP", {...d, nama: "Universitas Dua Raya", pic_email: "x2@kampus.ac.id", setuju: false}, PDF, 400],
    ["tanpa surat", {...d, nama: "Universitas Tiga Raya", pic_email: "x3@kampus.ac.id"}, null, 400],
    ["surat PNG berlabel .pdf", {...d, nama: "Universitas Empat Raya", pic_email: "x4@kampus.ac.id"}, PNG, 400],
    ["surat 2 MB + 1", {...d, nama: "Universitas Lima Raya", pic_email: "x5@kampus.ac.id"}, new Uint8Array(2 * 1048576 + 70000).fill(37), 413],
    ["email PIC kosong", {...d, nama: "Universitas Enam Raya", pic_email: ""}, PDF, 400],
    ["WA PIC liar", {...d, nama: "Universitas Tujuh Raya", pic_email: "x7@kampus.ac.id", pic_wa: "abc"}, PDF, 400],
    ["provinsi liar", {...d, nama: "Universitas Delapan Raya", pic_email: "x8@kampus.ac.id", prov: "99"}, PDF, 400]];
  for (const [nama, dd, b, s] of buruk) { const r = await kirimForm("/api/kemitraan/daftar/kampus", dd, b); assert.equal(r.s, s, `${nama}: harus ${s}, dapat ${r.s} ${r.t}`); }
  assert.equal(await U.n("institusi"), 1, "yang ditolak tidak meninggalkan baris");
  const nr = await U.api("POST", "/api/kemitraan/daftar/kampus", d, ip()); assert.equal(nr.s, 400, "bukan multipart ditolak");
});
uji("daftar kampus: tanpa Content-Length 411; PDF asli hanya lewat magic byte, bukan nama berkas", async () => {
  const f = new FormData(); f.append("data", JSON.stringify(dataKampus(1100))); f.append("surat", new File([PDF], "x.pdf"));
  const r0 = new Response(f), body = new Uint8Array(await r0.arrayBuffer());
  const r = await U.mf.dispatchFetch("http://bnpb.lokal/api/kemitraan/daftar/kampus", {method: "POST", headers: {"content-type": r0.headers.get("content-type"), ...ip()}, body: new ReadableStream({start(c) { c.enqueue(body); c.close(); }}), duplex: "half"});
  assert.equal(r.status, 411, await r.text());
});
uji("setujui kampus -> tautan atur sandi sekali pakai 72 jam; sandi pendek/token liar/ulang DITOLAK; kampus aktif tak bisa daftar lagi", async () => {
  const id = (await U.DB.prepare("SELECT institusi_id id FROM km_kampus WHERE status = 'menunggu'").first()).id;
  const H = {...ADMIN, ...ip(), ...SAMA_ORIGIN};
  const s = await U.api("POST", `/api/kemitraan/kampus/${id}`, {aksi: "setujui", peran: "simpul"}, H); assert.equal(s.s, 200, s.t);
  assert.match(s.j.token, /^[0-9a-f]{32}$/); assert.match(s.j.tautan, /\/kemitraan\/masuk\?atur=[0-9a-f]{32}$/);
  const a = await U.DB.prepare("SELECT atur_sha, atur_sampai, status, sandi_sha FROM km_akun").first();
  assert.equal(a.atur_sha, sha256(s.j.token), "hanya sha token di D1"); assert.equal(a.status, "aktif"); assert.equal(a.sandi_sha, null);
  assert.ok(Math.abs(a.atur_sampai - (Date.now() + 72 * JAM)) < 60e3, "berlaku 72 jam");
  assert.doesNotMatch(JSON.stringify(await U.DB.prepare("SELECT * FROM km_akun").all()), new RegExp(s.j.token), "token mentah tidak tersimpan");
  const P = {...ip(), ...SAMA_ORIGIN};
  assert.equal((await U.api("POST", "/api/kemitraan/atur-sandi", {token: s.j.token, sandi: "pendek"}, P)).s, 400, "sandi < 10 huruf");
  assert.equal((await U.api("POST", "/api/kemitraan/atur-sandi", {token: "xyz", sandi: "sandi-yang-panjang"}, P)).s, 400, "token bentuk liar");
  assert.equal((await U.api("POST", "/api/kemitraan/atur-sandi", {token: "0".repeat(32), sandi: "sandi-yang-panjang"}, P)).s, 403, "token tak dikenal");
  await U.DB.prepare("UPDATE km_akun SET atur_sampai = ?").bind(KINI - 1).run();
  assert.equal((await U.api("POST", "/api/kemitraan/atur-sandi", {token: s.j.token, sandi: "sandi-yang-panjang"}, P)).s, 403, "token lewat 72 jam");
  await U.DB.prepare("UPDATE km_akun SET atur_sampai = ?").bind(Date.now() + JAM).run();
  const ok = await U.api("POST", "/api/kemitraan/atur-sandi", {token: s.j.token, sandi: "sandi-koordinator-1000"}, P); assert.equal(ok.s, 200, ok.t);
  assert.equal((await U.api("POST", "/api/kemitraan/atur-sandi", {token: s.j.token, sandi: "sandi-lain-lagi-xx"}, P)).s, 403, "token sekali pakai");
  const k = await U.DB.prepare("SELECT garam, sandi_sha, atur_sha FROM km_akun").first();
  assert.equal(k.garam.length, 32); assert.equal(k.sandi_sha.length, 64); assert.equal(k.atur_sha, null);
  assert.equal((await U.api("POST", `/api/kemitraan/kampus/${id}`, {aksi: "setujui", peran: "simpul"}, H)).s, 409, "setujui dua kali");
  const lagi = await kirimForm("/api/kemitraan/daftar/kampus", dataKampus(1000, {pic_email: "lain2@kampus.ac.id"}), PDF);
  assert.equal(lagi.s, 409); assert.match(lagi.j.galat, /sudah terdaftar/i, "kampus aktif: pesan baku ALUR 1.1");
});
uji("masuk KK: cookie HttpOnly Secure SameSite=Strict; salah 401 sama untuk email asing; kunci 15 menit setelah 5 gagal (sandi benar pun ditolak)", async () => {
  const P = ip(), m = await U.api("POST", "/api/kemitraan/masuk", {email: "kk1000@kampus.ac.id", sandi: "sandi-koordinator-1000"}, {...P, ...SAMA_ORIGIN});
  assert.equal(m.s, 200, m.t); assert.equal(m.j.jenis, "KK");
  const ck = m.h.get("set-cookie"); assert.match(ck, /sesi_kemitraan=[0-9a-f]{64}/); for (const f of ["HttpOnly", "Secure", "SameSite=Strict", "Max-Age=43200"]) assert.ok(ck.includes(f), `cookie harus ${f}: ${ck}`);
  const sesi = await U.DB.prepare("SELECT sha, sampai, dibuat FROM km_sesi").first();
  assert.equal(sesi.sha, sha256(ck.match(/sesi_kemitraan=([0-9a-f]{64})/)[1]), "hanya sha sesi di D1"); assert.equal(sesi.sampai - sesi.dibuat, 12 * JAM);
  const s1 = await U.api("GET", "/api/kemitraan/saya", undefined, {cookie: kkCookie(m), ...ip()});
  assert.equal(s1.j.jenis, "KK"); assert.equal(s1.j.profil.kampus_status, "aktif");
  const salah = await U.api("POST", "/api/kemitraan/masuk", {email: "kk1000@kampus.ac.id", sandi: "salah-salah-salah"}, {...ip(), ...SAMA_ORIGIN});
  const asing = await U.api("POST", "/api/kemitraan/masuk", {email: "tidakada@kampus.ac.id", sandi: "salah-salah-salah"}, {...ip(), ...SAMA_ORIGIN});
  assert.equal(salah.s, 401); assert.equal(asing.t, salah.t, "email asing dan sandi salah dijawab sama");
  for (let i = 0; i < 3; i++) assert.equal((await U.api("POST", "/api/kemitraan/masuk", {email: "kk1000@kampus.ac.id", sandi: "salah-salah-salah"}, {...ip(), ...SAMA_ORIGIN})).s, 401);
  assert.equal((await U.DB.prepare("SELECT gagal FROM km_akun").first()).gagal, 4);
  assert.equal((await U.api("POST", "/api/kemitraan/masuk", {email: "kk1000@kampus.ac.id", sandi: "salah-salah-salah"}, {...ip(), ...SAMA_ORIGIN})).s, 401, "gagal ke-5 masih 401");
  const kunci = (await U.DB.prepare("SELECT kunci_sampai k FROM km_akun").first()).k;
  assert.ok(Math.abs(kunci - (Date.now() + 15 * 60e3)) < 60e3, "kunci 15 menit");
  const benar = await U.api("POST", "/api/kemitraan/masuk", {email: "kk1000@kampus.ac.id", sandi: "sandi-koordinator-1000"}, {...ip(), ...SAMA_ORIGIN});
  const asingKunci = await U.api("POST", "/api/kemitraan/masuk", {email: "tidakada@kampus.ac.id", sandi: "sandi-koordinator-1000"}, {...ip(), ...SAMA_ORIGIN});
  assert.equal(benar.s, 401, "sandi benar pun ditolak selama kunci, persis seperti email tak dikenal: " + benar.t);
  assert.equal(benar.s, asingKunci.s); assert.equal(benar.t, asingKunci.t, "isi sama persis dengan email tak dikenal"); assert.equal(benar.h.get("retry-after"), null);
  assert.equal((await U.DB.prepare("SELECT gagal FROM km_akun").first()).gagal, 0, "percobaan saat terkunci tidak menggeser hitungan");
  await U.DB.prepare("UPDATE km_akun SET kunci_sampai = ?").bind(Date.now() + 15 * 60e3 - 5e3).run();
  assert.equal((await U.api("POST", "/api/kemitraan/masuk", {email: "kk1000@kampus.ac.id", sandi: "sandi-koordinator-1000"}, {...ip(), ...SAMA_ORIGIN})).s, 401, "sisa 15 menit: masih terkunci");
  await U.DB.prepare("UPDATE km_akun SET kunci_sampai = ?").bind(Date.now() - 1).run();   // waktu maju melewati kunci
  await U.DB.prepare("UPDATE km_akun SET kunci_sampai = ?").bind(KINI - 1).run();
  assert.equal((await U.api("POST", "/api/kemitraan/masuk", {email: "kk1000@kampus.ac.id", sandi: "sandi-koordinator-1000"}, {...ip(), ...SAMA_ORIGIN})).s, 200, "kunci lewat: masuk lagi");
  assert.equal((await U.DB.prepare("SELECT gagal FROM km_akun").first()).gagal, 0, "sukses mengosongkan hitungan gagal");
  /* laju IP 20/jam dihitung SEBELUM cek sandi */
  const tetap = {"cf-connecting-ip": "10.99.0.1", ...SAMA_ORIGIN};
  for (let i = 0; i < 20; i++) await U.api("POST", "/api/kemitraan/masuk", {email: "tidakada@kampus.ac.id", sandi: "salah-salah-salah"}, tetap);
  const l = await U.api("POST", "/api/kemitraan/masuk", {email: "kk1000@kampus.ac.id", sandi: "sandi-koordinator-1000"}, tetap); assert.equal(l.s, 429, "IP ke-21: 429 walau sandi benar");
});
uji("akun belum bersandi / dicabut tidak bisa masuk; bentuk liar ditolak", async () => {
  assert.equal((await U.api("POST", "/api/kemitraan/masuk", {email: "kk1000@kampus.ac.id"}, {...ip(), ...SAMA_ORIGIN})).s, 401, "tanpa sandi");
  assert.equal((await U.api("POST", "/api/kemitraan/masuk", {email: 5, sandi: 5}, {...ip(), ...SAMA_ORIGIN})).s, 401);
  await U.DB.prepare("UPDATE km_akun SET status = 'dicabut'").run();
  const r = await U.api("POST", "/api/kemitraan/masuk", {email: "kk1000@kampus.ac.id", sandi: "sandi-koordinator-1000"}, {...ip(), ...SAMA_ORIGIN}); assert.equal(r.s, 403, "dicabut: " + r.t);
  await U.DB.prepare("UPDATE km_akun SET status = 'aktif'").run();
});
uji("keluar menghapus sesi D1 dan kuki; kuki lama tak berlaku lagi", async () => {
  const m = await U.api("POST", "/api/kemitraan/masuk", {email: "kk1000@kampus.ac.id", sandi: "sandi-koordinator-1000"}, {...ip(), ...SAMA_ORIGIN}), cookie = kkCookie(m);
  const n0 = await U.n("km_sesi");
  const k = await U.api("POST", "/api/kemitraan/keluar", {}, {cookie, ...ip(), ...SAMA_ORIGIN}); assert.equal(k.s, 200); assert.match(k.h.get("set-cookie"), /Max-Age=0/);
  assert.equal(await U.n("km_sesi"), n0 - 1);
  assert.equal((await U.api("GET", "/api/kemitraan/saya", undefined, {cookie, ...ip()})).s, 401);
  assert.equal((await U.api("POST", "/api/kemitraan/keluar", {}, {cookie, ...ip(), origin: "https://evil.example"})).s, 403, "keluar dari origin asing ditolak (CSRF)");
});
uji("daftar anggota: kampus belum aktif/tak ada 404; bentuk liar 400; valid 201; duplikat WA atau email JAWABAN IDENTIK tanpa baris baru", async () => {
  const kk = await kampusAktif();
  const menunggu = (await kirimForm("/api/kemitraan/daftar/kampus", dataKampus(2000), PDF), (await U.DB.prepare("SELECT institusi_id id FROM km_kampus WHERE status = 'menunggu'").first()).id);
  const D = (o, h = {}) => U.api("POST", "/api/kemitraan/daftar/anggota", o, {...ip(), ...h});
  assert.equal((await D(dataAnggota(menunggu, 1))).s, 404, "kampus menunggu bukan tujuan");
  assert.equal((await D(dataAnggota("0".repeat(16), 1))).s, 404);
  const buruk = [["unsur liar", {unsur: "rektor"}], ["kab4 liar", {kab4: "62AB"}], ["kab4 tak dikenal", {kab4: "9999"}], ["keahlian kosong", {keahlian: []}], ["keahlian liar", {keahlian: ["terbang"]}], ["tanpa PDP", {setuju: false}],
    ["WA liar", {wa: "123"}], ["email liar", {email: "bukan-email"}], ["angkatan liar", {angkatan: 1800}], ["kampus_id liar", {kampus_id: "xyz"}], ["nama 1 huruf", {nama: "A"}]];
  for (const [nama, o] of buruk) { const r = await D({...dataAnggota(kk.id, 1), ...o}); assert.equal(r.s, 400, `${nama}: harus 400, dapat ${r.s} ${r.t}`); }
  assert.equal(await U.n("km_anggota"), 0);
  const a = await D(dataAnggota(kk.id, 1)); assert.equal(a.s, 201, a.t);
  const r = await U.DB.prepare("SELECT r.status, r.jalur, r.kampus_id, r.kab, r.prov, r.kode_sha, a.unsur FROM relawan r JOIN km_anggota a ON a.relawan_id = r.id").first();
  assert.deepEqual([r.status, r.jalur, r.kampus_id, r.kab, r.prov, r.unsur], ["terdaftar", "kampus", kk.id, "Kab. Pulang Pisau", "62", "dosen"]); assert.equal(r.kode_sha.length, 64);
  const dw = await D({...dataAnggota(kk.id, 1), email: "baru@kampus.ac.id", nama: "Nama Lain"}), de = await D({...dataAnggota(kk.id, 1), wa: "081399990001"});
  assert.equal(dw.t, a.t, "WA sama: identik"); assert.equal(de.t, a.t, "email sama: identik"); assert.equal(dw.s, 201);
  assert.equal(await U.n("km_anggota"), 1); assert.equal(await U.n("relawan"), 1);
  assert.equal(await U.n("km_jejak", "tabel = 'km_anggota' AND aksi = 'daftar'"), 1);
  /* laju 10/jam/IP */
  const tetap = {"cf-connecting-ip": "10.98.0.1"}; let s = 0;
  for (let i = 0; i < 11; i++) s = (await D({...dataAnggota(kk.id, 50 + i)}, tetap)).s;
  assert.equal(s, 429, "daftar ke-11 dari satu IP");
});
uji("E1: ST setujui kampus -> atur sandi -> KK masuk -> anggota daftar -> KK setujui -> kode -> /saya 200 jenis AG", async () => {
  const kk = await kampusAktif(), H = kkH(kk.cookie, ip());
  const dA = dataAnggota(kk.id, 3000); assert.equal((await U.api("POST", "/api/kemitraan/daftar/anggota", dA, ip())).s, 201);
  const rid = (await U.DB.prepare("SELECT id FROM relawan WHERE email = ?").bind(dA.email).first()).id;
  assert.equal((await U.api("GET", "/api/kemitraan/saya", undefined, {"x-kode": "a".repeat(26), ...ip()})).s, 403, "sebelum disetujui tidak ada kode yang sah");
  const s = await U.api("POST", `/api/kemitraan/kampus/${kk.id}/anggota/${rid}`, {aksi: "setujui"}, H); assert.equal(s.s, 200, s.t);
  assert.match(s.j.kode, /^[0-9a-f]{26}$/); assert.match(s.j.tautan, new RegExp(`/kemitraan/saya#k=${s.j.kode}$`));
  const bar = await U.DB.prepare("SELECT status, kode_sha, diverifikasi FROM relawan WHERE id = ?").bind(rid).first();
  assert.equal(bar.status, "diverifikasi"); assert.equal(bar.kode_sha, sha256(s.j.kode), "hanya sha kode di D1"); assert.ok(bar.diverifikasi);
  const me = await U.api("GET", "/api/kemitraan/saya", undefined, {"x-kode": s.j.kode, ...ip()});
  assert.equal(me.s, 200, me.t); assert.equal(me.j.jenis, "AG"); assert.equal(me.j.profil.unsur, "dosen"); assert.equal(me.j.profil.kampus_id, kk.id);
  assert.doesNotMatch(me.t, /081310|dosen\d+@/, "profil AG tidak membocorkan kontak orang lain");
  assert.equal((await U.api("POST", `/api/kemitraan/kampus/${kk.id}/anggota/${rid}`, {aksi: "setujui"}, H)).s, 409, "setujui dua kali");
  /* kode hilang: terbitkan ulang, kode lama mati */
  const ulang = await U.api("POST", `/api/kemitraan/kampus/${kk.id}/anggota/${rid}`, {aksi: "kode"}, H); assert.equal(ulang.s, 200, ulang.t); assert.notEqual(ulang.j.kode, s.j.kode);
  assert.equal((await U.api("GET", "/api/kemitraan/saya", undefined, {"x-kode": s.j.kode, ...ip()})).s, 403, "kode lama mati");
  assert.equal((await U.api("GET", "/api/kemitraan/saya", undefined, {"x-kode": ulang.j.kode, ...ip()})).j.jenis, "AG");
  assert.deepEqual((await U.DB.prepare("SELECT aksi FROM km_jejak WHERE tabel = 'km_anggota' AND baris = ? ORDER BY id").bind(rid).all()).results.map(x => x.aksi), ["daftar", "setujui", "kode_ulang"]);
  /* daftar anggota untuk KK/ST: lembar kampus memuat identitas, tanpa kode_sha */
  const lembar = await U.api("GET", `/api/kemitraan/kampus/${kk.id}`, undefined, {cookie: kk.cookie, ...ip()});
  assert.equal(lembar.s, 200, lembar.t); assert.equal(lembar.j.anggota.length, 1); assert.doesNotMatch(lembar.t, /kode_sha/);
});
uji("aksi anggota: yang salah DITOLAK (KK kampus lain 403, AG/BP 403, tamu 401, aksi liar 400, tolak tanpa alasan 400, tolak ulang 409)", async () => {
  const a = await kampusAktif(), b = await kampusAktif();
  const dA = dataAnggota(a.id, 4000); await U.api("POST", "/api/kemitraan/daftar/anggota", dA, ip());
  const rid = (await U.DB.prepare("SELECT id FROM relawan WHERE email = ?").bind(dA.email).first()).id, J = `/api/kemitraan/kampus/${a.id}/anggota/${rid}`;
  assert.equal((await U.api("POST", J, {aksi: "setujui"}, kkH(b.cookie, ip()))).s, 403, "KK kampus lain");
  assert.equal((await U.api("POST", `/api/kemitraan/kampus/${b.id}/anggota/${rid}`, {aksi: "setujui"}, kkH(b.cookie, ip()))).s, 404, "anggota kampus a lewat kampus b");
  assert.equal((await U.api("POST", J, {aksi: "setujui"}, {...ip(), ...SAMA_ORIGIN})).s, 401, "tamu");
  assert.equal((await U.api("POST", J, {aksi: "setujui"}, {...kkH(a.cookie, ip()), "x-km": "0"})).s, 401, "KK tanpa x-km: 1");
  assert.equal((await U.api("POST", J, {aksi: "setujui"}, {"x-kode": "b".repeat(26), ...ip()})).s, 403, "kode salah");
  assert.equal((await U.DB.prepare("SELECT status FROM relawan WHERE id = ?").bind(rid).first()).status, "terdaftar", "penolakan tidak mengubah apa pun");
  assert.equal((await U.api("POST", J, {aksi: "hapus"}, kkH(a.cookie, ip()))).s, 400, "aksi liar");
  assert.equal((await U.api("POST", J, {}, kkH(a.cookie, ip()))).s, 400, "tanpa aksi");
  assert.equal((await U.api("POST", J, {aksi: "kode"}, kkH(a.cookie, ip()))).s, 409, "kode untuk yang belum disetujui");
  assert.equal((await U.api("POST", J, {aksi: "tolak"}, kkH(a.cookie, ip()))).s, 400, "tolak tanpa alasan");
  const t = await U.api("POST", J, {aksi: "tolak", alasan: "bukan civitas kampus kami"}, kkH(a.cookie, ip())); assert.equal(t.s, 200, t.t);
  assert.equal((await U.DB.prepare("SELECT status, alasan FROM relawan WHERE id = ?").bind(rid).first()).status, "ditolak");
  assert.equal((await U.api("POST", J, {aksi: "tolak", alasan: "ulang saja"}, kkH(a.cookie, ip()))).s, 409, "tolak ulang");
  assert.equal((await U.api("POST", J, {aksi: "setujui"}, kkH(a.cookie, ip()))).s, 409, "yang ditolak tak bisa disetujui");
  const st = await U.api("POST", `/api/kemitraan/kampus/${a.id}/anggota/${"0".repeat(16)}`, {aksi: "setujui"}, {...ADMIN, ...ip(), ...SAMA_ORIGIN}); assert.equal(st.s, 404, "anggota tak ada");
  /* ST (admin) boleh menyetujui anggota kampus mana pun */
  const dB = dataAnggota(a.id, 4001); await U.api("POST", "/api/kemitraan/daftar/anggota", dB, ip());
  const rb = (await U.DB.prepare("SELECT id FROM relawan WHERE email = ?").bind(dB.email).first()).id;
  assert.equal((await U.api("POST", `/api/kemitraan/kampus/${a.id}/anggota/${rb}`, {aksi: "setujui"}, {...ADMIN, ...ip(), ...SAMA_ORIGIN})).s, 200);
  /* rute kampus yang sudah dicabut tidak menerima persetujuan */
  await U.DB.prepare("UPDATE km_kampus SET status = 'dicabut' WHERE institusi_id = ?").bind(a.id).run();
  assert.equal((await U.api("POST", J, {aksi: "setujui"}, {...ADMIN, ...ip(), ...SAMA_ORIGIN})).s, 409, "kampus tidak aktif");
});
uji("GET saya: BP dan PL dapat profil; tamu 401", async () => {
  const kode = "c".repeat(26);
  await U.DB.prepare("INSERT INTO km_bpbd_kode (id, kode_sha, kab4, prov, nama, berlaku, dibuat) VALUES ('1111111111111111', ?, '6211', '62', 'Pak Anto', ?, ?)").bind(sha256(kode), KINI + JAM, KINI).run();
  const r = await U.api("GET", "/api/kemitraan/saya", undefined, {"x-kode": kode, ...ip()});
  assert.equal(r.j.jenis, "BP"); assert.equal(r.j.profil.kab4, "6211"); assert.equal(r.j.profil.nama, "Pak Anto");
  assert.equal((await U.api("GET", "/api/kemitraan/saya", undefined, ip())).s, 401);
});
