/* Relawan + kampus PTN (src/relawan.js, migrasi 0023) di atas worker utuh (Miniflare) dan D1 lokal sungguhan.
   Dijaga: migrasi idempoten, CHECK menolak isian liar, enum JS == CHECK, pendaftaran sah/liar/duplikat/laju, kode pribadi, isolasi kampus dan relawan,
   pencocokan, jam kerja dari check-in/out, MoU habis, cabut diri, data pribadi tidak bocor di rute publik, dummy isi/hapus, halaman + CSP. */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {randomBytes} from "node:crypto";
import path from "node:path";
import {AKAR, pecah} from "./_bantu.mjs";
import {siapkan, berantai, ADMIN, MOD2, GERBANG, GERBANG_ORANG, sha256} from "./_bnpb.mjs";
import "../../src/worker.js";
import * as R from "../../src/relawan.js";

const U = await siapkan("uji-relawan"), uji = berantai();
const SQL = readFileSync(path.join(AKAR, "migrations/0023_relawan.sql"), "utf8");
const JAM = 3600e3, HARI = 24 * JAM;
const geser = h => new Date(Date.now() + 7 * JAM + h * HARI).toISOString().slice(0, 10);
const id16 = () => randomBytes(8).toString("hex");
let ipN = 0; const ipBaru = () => ({"cf-connecting-ip": `10.9.${Math.floor(++ipN / 250)}.${ipN % 250}`});
let nWA = 0; const unik = () => { nWA++; return {wa: "08127" + String(nWA).padStart(6, "0"), email: `u${nWA}@contoh.id`, darurat_wa: "08139" + String(nWA).padStart(6, "0")}; };
const form = (o = {}) => ({nama: "Budi Santoso", ...unik(), prov: "62", kab: "Pulang Pisau", jalur: "umum", keahlian: ["medis"], sertifikat: "BTCLS", hari_per_minggu: 3, maks_hari: 30,
  luar_provinsi: false, gol_darah: "O+", darurat_nama: "Ibu Budi", setuju: true, ...o});
const daftar = (o, h = ipBaru()) => U.api("POST", "/api/relawan/daftar", form(o), h);
const idRelawan = async nama => (await U.DB.prepare("SELECT id FROM relawan WHERE nama = ?").bind(nama).first()).id;
const K = kode => ({"x-kode": kode, ...ipBaru()});
async function buatSiap(o) {
  const r = await daftar(o); assert.equal(r.s, 201, r.t);
  const id = await idRelawan(o.nama);
  assert.equal((await U.adm("POST", `/api/relawan/admin/relawan/${id}`, {aksi: "verifikasi"})).s, 200);
  assert.equal((await U.adm("POST", `/api/relawan/admin/relawan/${id}`, {aksi: "siap"})).s, 200);
  return {id, kode: r.j.kode};
}
const sisip = (tabel, o) => { const k = Object.keys(o); return U.DB.prepare(`INSERT INTO ${tabel} (${k.join(", ")}) VALUES (${k.map(() => "?").join(", ")})`).bind(...k.map(x => o[x])).run(); };
/* institusi + MoU relawan (C7): argumen datar no_mou/mulai/berakhir/kuota dipetakan ke perjanjian bersarang */
const mouBody = ({no_mou = "MoU/UJI/1/2026", mulai = geser(-100), berakhir = geser(200), kuota = 50, ...o} = {}) => ({nama: "Universitas Uji Satu", singkatan: "UUS", jenis: "ptn", prov: "62", pic_nama: "Dr. Rahasia PIC", pic_jabatan: "Wakil Rektor",
  pic_email: "pic.rahasia@kampus-uji.ac.id", pic_wa: "081299990001", catatan: "uji", ...o, perjanjian: {jenis_perjanjian: "mou_relawan", nomor: no_mou, mulai, berakhir, kuota}});
const butuhBody = (o = {}) => ({judul: "Pos kesehatan uji", bencana: "karhutla", prov: "62", kab: "Pulang Pisau", butuh: [{keahlian: "medis", jumlah: 3}], mulai: geser(1), selesai: geser(10), ...o});

const ADMIN_RUTE = [["GET", "/api/relawan/admin/relawan"], ["GET", "/api/relawan/admin/relawan/0123456789abcdef"], ["POST", "/api/relawan/admin/relawan/0123456789abcdef"], ["GET", "/api/relawan/admin/csv"],
  ["GET", "/api/relawan/admin/institusi"], ["POST", "/api/relawan/admin/institusi"], ["POST", "/api/relawan/admin/institusi/0123456789abcdef"], ["GET", "/api/relawan/admin/permintaan"], ["POST", "/api/relawan/admin/permintaan"],
  ["GET", "/api/relawan/admin/permintaan/0123456789abcdef"], ["POST", "/api/relawan/admin/permintaan/0123456789abcdef"], ["GET", "/api/relawan/admin/penugasan"], ["POST", "/api/relawan/admin/penugasan/0123456789abcdef"],
  ["POST", "/api/relawan/admin/jam/0123456789abcdef"], ["GET", "/api/relawan/admin/pelatihan"], ["POST", "/api/relawan/admin/pelatihan"], ["POST", "/api/relawan/admin/pelatihan/0123456789abcdef"], ["POST", "/api/relawan/dummy"]];
const KODE_RUTE = [["GET", "/api/relawan/saya"], ["POST", "/api/relawan/saya"], ["POST", "/api/relawan/saya/penugasan/0123456789abcdef"], ["GET", "/api/relawan/kampus/saya"], ["GET", "/api/relawan/kampus/csv"],
  ["POST", "/api/relawan/kampus/relawan/0123456789abcdef"], ["POST", "/api/relawan/kampus/jam/0123456789abcdef"]];

uji("migrasi 0023 relawan idempoten: jalan dua kali, data tetap", async () => {
  const iid = id16();
  await sisip("institusi", {id: iid, nama: "Kampus Awal", jenis: "pts", prov: "62", pic_nama: "PIC", dibuat: 1, diubah: 1});
  await sisip("institusi_perjanjian", {id: id16(), institusi_id: iid, jenis_perjanjian: "mou_relawan", nomor: "MoU/1", mulai: "2026-01-01", berakhir: "2026-12-31", kuota: 5, dibuat: 1, diubah: 1});
  await U.DB.batch(pecah(SQL).map(s => U.DB.prepare(s)));
  assert.equal(await U.n("institusi"), 1); assert.equal(await U.n("institusi_perjanjian"), 1);
  await U.DB.batch([U.DB.prepare("DELETE FROM institusi_perjanjian"), U.DB.prepare("DELETE FROM institusi")]);
});

uji("enum JS sama persis dengan CHECK dan trigger migrasi 0023", async () => {
  const dalam = [...SQL.matchAll(/IN \(([^)]*)\)/g)].map(m => m[1].split(",").map(s => s.trim().replace(/'/g, "")).join("|"));
  for (const [nama, daftar] of [["STATUS", R.STATUS], ["JALUR", R.JALUR], ["GOL_DARAH", R.GOL_DARAH], ["STATUS_PENUGASAN", R.STATUS_PENUGASAN], ["ASURANSI", R.ASURANSI], ["STATUS_PERMINTAAN", R.STATUS_PERMINTAAN], ["KEAHLIAN", Object.keys(R.KEAHLIAN)], ["JENIS_INSTITUSI", R.JENIS_INSTITUSI], ["JENIS_PERJANJIAN", R.JENIS_PERJANJIAN]])
    assert.ok(dalam.includes(daftar.join("|")), `${nama} tidak sama dengan CHECK/trigger di 0023`);
  assert.equal(Object.keys(R.PROV).length, 38);
});

uji("CHECK menolak isian liar langsung di D1 (tanpa lewat worker)", async () => {
  const dasar = () => ({id: id16(), nama: "Uji CHECK", wa: "628123450001", email: "x@y.id", prov: "62", kab: "Kab", jalur: "umum", hari_per_minggu: 3, maks_hari: 30, luar_provinsi: 0, setuju_pdp: 1, dibuat: 1, diubah: 1});
  const dasarId = dasar().id; await sisip("relawan", {...dasar(), id: dasarId}); await U.DB.prepare("DELETE FROM relawan WHERE id = ?").bind(dasarId).run();   // kontrol: isian sah lolos
  const liar = {status: "gaib", jalur: "bebas", wa: "08abc", prov: "6a", hari_per_minggu: 8, maks_hari: 0, luar_provinsi: 2, gol_darah: "Z", setuju_pdp: 0, anonim: 3, keahlian: "bukan json", nama: "x",
    email: "tanpa-at", kampus_id: undefined};
  for (const [k, v] of Object.entries(liar)) {
    if (v === undefined) continue;
    await assert.rejects(sisip("relawan", {...dasar(), [k]: v}), /CHECK|constraint|malformed JSON/i, `kolom ${k} liar lolos`);
  }
  await assert.rejects(sisip("relawan", {...dasar(), keahlian: '["medis","sulap"]'}), /keahlian tidak dikenal/);
  await assert.rejects(sisip("relawan", {...dasar(), keahlian: '{"a":1}'}), /CHECK|keahlian tidak dikenal/i);
  await assert.rejects(sisip("relawan", {...dasar(), jalur: "kampus"}), /CHECK/i, "jalur kampus tanpa kampus_id");
  await assert.rejects(sisip("relawan", {...dasar(), anonim: 1}), /CHECK/i, "baris anonim tidak boleh menyimpan WA");
  const a = dasar(); await sisip("relawan", a);
  await assert.rejects(U.DB.prepare("UPDATE relawan SET keahlian = ? WHERE id = ?").bind('["sulap"]', a.id).run(), /keahlian tidak dikenal/);
  await assert.rejects(sisip("relawan", {...dasar(), wa: a.wa, email: "lain@y.id"}), /UNIQUE/i, "WA aktif ganda");
  await assert.rejects(sisip("relawan", {...dasar(), email: a.email}), /UNIQUE/i, "email aktif ganda");
  await U.DB.prepare("UPDATE relawan SET status = 'ditolak' WHERE id = ?").bind(a.id).run();
  await sisip("relawan", {...dasar(), wa: a.wa, email: a.email});   // yang ditolak boleh mendaftar ulang
  await U.DB.prepare("DELETE FROM relawan").run();
  const kdasar = {id: id16(), nama: "Kampus CHECK", jenis: "pts", prov: "62", pic_nama: "PIC", dibuat: 1, diubah: 1};
  for (const [k, v] of Object.entries({jenis: "bebas", prov: "x1", pic_wa: "12ab", kode_sha: "pendek", singkatan: "x"})) await assert.rejects(sisip("institusi", {...kdasar, [k]: v}), /CHECK/i, `institusi.${k}`);
  await sisip("institusi", kdasar);   // kontrol: sah lolos (prov NULL juga sah: riset boleh belum mengisinya)
  await sisip("institusi", {...kdasar, id: id16(), prov: null});
  const pjdasar = {id: id16(), institusi_id: kdasar.id, jenis_perjanjian: "mou_relawan", nomor: "MoU/1", mulai: "2026-01-01", berakhir: "2026-12-31", kuota: 5, dibuat: 1, diubah: 1};
  for (const [k, v] of Object.entries({mulai: "2026-1-1", berakhir: "2025-12-31", kuota: 0, jenis_perjanjian: "x", nomor: "ab"})) await assert.rejects(sisip("institusi_perjanjian", {...pjdasar, [k]: v}), /CHECK/i, `perjanjian.${k}`);
  await assert.rejects(sisip("institusi_perjanjian", {...pjdasar, kuota: null}), /CHECK/i, "MoU relawan wajib berkuota");
  await assert.rejects(sisip("institusi_perjanjian", {...pjdasar, jenis_perjanjian: "pks_riset"}), /CHECK/i, "PKS riset tanpa kuota");
  await assert.rejects(sisip("institusi_perjanjian", {...pjdasar, institusi_id: id16()}), /FOREIGN/i, "perjanjian harus merujuk institusi");
  await sisip("institusi_perjanjian", pjdasar);
  await assert.rejects(sisip("institusi_perjanjian", {...pjdasar, id: id16()}), /UNIQUE/i, "nomor sama pada jenis sama");
  await sisip("institusi_perjanjian", {...pjdasar, id: id16(), jenis_perjanjian: "pks_riset", kuota: null});   // jenis lain boleh bernomor sama: satu institusi, dua perjanjian
  await U.DB.batch([U.DB.prepare("DELETE FROM institusi_perjanjian"), U.DB.prepare("DELETE FROM institusi")]);
  const pdasar = {id: id16(), judul: "Judul uji", bencana: "banjir", prov: "62", kab: "Kab", butuh: "[]", mulai: "2026-01-01", selesai: "2026-01-02", dibuat: 1};
  for (const [k, v] of Object.entries({butuh: "[]", status: "x", lat: 40, selesai: "2025-01-01"})) await assert.rejects(sisip("relawan_permintaan", {...pdasar, [k]: v}), /CHECK/i, `permintaan.${k}`);
  for (const [k, v] of Object.entries({butuh: '{"a":1}'})) await assert.rejects(sisip("relawan_permintaan", {...pdasar, butuh: v}), /CHECK/i, `permintaan.${k}`);
});

uji("tanpa auth: tiap rute admin 403 (juga akun gerbang), tiap rute berkode 403, halaman admin dialihkan", async () => {
  for (const [m, j] of ADMIN_RUTE) {
    for (const h of [{}, GERBANG, GERBANG_ORANG, {"x-admin-token": "salah"}]) {
      const r = await U.api(m, j, m === "POST" ? {aksi: "x"} : undefined, {...h, ...ipBaru()});
      assert.equal(r.s, 403, `${m} ${j} tanpa auth harus 403, dapat ${r.s}`);
    }
  }
  for (const [m, j] of KODE_RUTE) assert.equal((await U.api(m, j, m === "POST" ? {aksi: "x"} : undefined, ipBaru())).s, 403, `${m} ${j} tanpa kode`);
  const h = await U.api("GET", "/admin/relawan", undefined, ipBaru());
  assert.ok(!h.t.includes("/admin/relawan.js"), "tanpa sesi: dialihkan ke halaman masuk, bukan halaman relawan");
});

uji("POST /api/relawan/daftar: sah 201, kode 26 hex tampil sekali dan hanya hash-nya yang tersimpan", async () => {
  const wa = "0812-5550-0001", r = await daftar({nama: "Sah Pertama", wa, email: "Sah.Pertama@Contoh.ID"});
  assert.equal(r.s, 201, r.t);
  assert.match(r.j.kode, /^[0-9a-f]{26}$/);
  assert.equal(r.j.tautan, `http://bnpb.lokal/relawan/saya#k=${r.j.kode}`);
  const d = await U.DB.prepare("SELECT * FROM relawan WHERE nama = 'Sah Pertama'").first();
  assert.equal(d.wa, "6281255500001"); assert.equal(d.email, "sah.pertama@contoh.id");
  assert.equal(d.kode_sha, sha256(r.j.kode)); assert.equal(d.status, "terdaftar");
  assert.ok(!JSON.stringify(d).includes(r.j.kode), "kode mentah tidak boleh tersimpan");
  assert.ok(!Object.keys(d).some(k => /nik|ktp/i.test(k)), "tanpa NIK/KTP");
});

uji("POST /api/relawan/daftar: isian liar 400 dengan pesan jelas", async () => {
  const liar = [{nama: ""}, {nama: "x".repeat(81)}, {wa: "12345"}, {wa: null}, {email: "bukan-email"}, {prov: "99"}, {prov: "constructor"}, {kab: ""}, {jalur: "bebas"}, {jalur: "kampus"}, {jalur: "kampus", kampus_id: "zzz"},
    {jalur: "organisasi"}, {keahlian: []}, {keahlian: ["sulap"]}, {keahlian: ["medis", "medis"]}, {keahlian: "medis"}, {keahlian: ["constructor"]}, {sertifikat: "x".repeat(301)}, {hari_per_minggu: 0}, {hari_per_minggu: 8},
    {hari_per_minggu: 2.5}, {maks_hari: 366}, {maks_hari: "abc"}, {luar_provinsi: "ya"}, {luar_provinsi: undefined}, {gol_darah: "Z"}, {darurat_nama: ""}, {darurat_wa: "1"}, {setuju: false}, {setuju: "true"}, {setuju: undefined}];
  for (const o of liar) { const r = await daftar(o); assert.equal(r.s, 400, `${JSON.stringify(o)} -> ${r.s} ${r.t}`); assert.ok(r.j.galat); }
  assert.equal((await U.api("POST", "/api/relawan/daftar", "{bukan json", ipBaru())).s, 400);
  assert.equal((await U.api("POST", "/api/relawan/daftar", "[]", ipBaru())).s, 400);
  assert.equal((await U.api("POST", "/api/relawan/daftar", JSON.stringify({nama: "x".repeat(20000)}), ipBaru())).s, 413);
  assert.equal(await U.n("relawan", "nama IN ('', 'Budi Santoso')"), 0, "isian liar tidak boleh menulis");
});

uji("POST /api/relawan/daftar: WA atau email yang masih aktif ditolak 409 dengan pesan ramah", async () => {
  const a = unik(); assert.equal((await daftar({...a, nama: "Duplikat Asli"})).s, 201);
  const wa = await daftar({...unik(), wa: a.wa.replace("08127", "+628127"), nama: "Duplikat WA"});
  assert.equal(wa.s, 409); assert.match(wa.j.galat, /admin/); assert.doesNotMatch(wa.j.galat, /whatsapp|email|nomor|sudah terdaftar/i, "pesan generik, tidak menyebut kolom yang bentrok");
  assert.equal((await daftar({...unik(), email: a.email.toUpperCase(), nama: "Duplikat Email"})).s, 409);
  assert.equal(await U.n("relawan", "nama IN ('Duplikat WA', 'Duplikat Email')"), 0);
});

uji("POST /api/relawan/daftar: laju per IP 3 per jam, IP lain tidak ikut terkunci", async () => {
  const ip = {"cf-connecting-ip": "10.77.0.1"};
  for (let i = 0; i < 3; i++) assert.equal((await daftar({nama: `Laju ${i}`}, ip)).s, 201);
  const r = await daftar({nama: "Laju 3"}, ip);
  assert.equal(r.s, 429); assert.ok(r.h.get("retry-after"));
  assert.equal((await daftar({nama: "Laju lain IP"}, {"cf-connecting-ip": "10.77.0.2"})).s, 201);
  assert.equal(await U.n("relawan", "nama = 'Laju 3'"), 0);
});

uji("GET /api/relawan/saya: kode salah/format liar 403, kode benar hanya data diri sendiri tanpa WA atau email", async () => {
  const a = await daftar({nama: "Saya Satu", sertifikat: "Sertifikat A"}), b = await daftar({nama: "Saya Dua", sertifikat: "Sertifikat B"});
  assert.equal((await U.api("GET", "/api/relawan/saya", undefined, K("0".repeat(26)))).s, 403);
  assert.equal((await U.api("GET", "/api/relawan/saya", undefined, K("bukan-kode"))).s, 403);
  assert.equal((await U.api("GET", "/api/relawan/saya", undefined, K(a.j.kode.toUpperCase().slice(0, 25)))).s, 403);
  const s = await U.api("GET", "/api/relawan/saya", undefined, K(a.j.kode));
  assert.equal(s.s, 200); assert.equal(s.j.relawan.nama, "Saya Satu"); assert.equal(s.j.relawan.status, "terdaftar");
  assert.ok(!s.t.includes("Saya Dua") && !s.t.includes("Sertifikat B"), "relawan lain tidak boleh terlihat");
  const w = await U.DB.prepare("SELECT wa, email, darurat_wa FROM relawan WHERE nama = 'Saya Satu'").first();
  for (const x of Object.values(w)) assert.ok(!s.t.includes(x), `respons memuat data pribadi ${x}`);
  assert.deepEqual(s.j.alur, ["terdaftar", "diverifikasi", "siap_tugas", "ditugaskan", "bertugas", "selesai"]);
  assert.equal(s.h.get("cache-control"), "no-store");
});

uji("kode relawan tidak bisa dipakai di rute kampus; tebakan salah > 300 per jam dari satu IP memberi 429, IP lain tidak terkunci", async () => {
  const a = await daftar({nama: "Silang Satu"});
  assert.equal((await U.api("GET", "/api/relawan/kampus/saya", undefined, K(a.j.kode))).s, 403);
  const ip = "10.88.0.1", kunci = sha256("garam-uji|" + ip), kini = Date.now();
  await U.DB.batch(Array.from({length: 300}, (_, i) => U.DB.prepare("INSERT INTO laju_bnpb (kunci, aksi, waktu) VALUES (?, 'relawan.kode_gagal', ?)").bind(kunci, kini - i)));
  const kena = await U.api("GET", "/api/relawan/saya", undefined, {"x-kode": a.j.kode, "cf-connecting-ip": ip});
  assert.equal(kena.s, 200, "kode BENAR lolos walau IP sudah banyak menebak salah");
  assert.equal((await U.api("GET", "/api/relawan/saya", undefined, {"x-kode": "0".repeat(26), "cf-connecting-ip": ip})).s, 429, "tebakan salah dari IP itu ditahan 429");
  assert.equal((await U.api("GET", "/api/relawan/saya", undefined, K(a.j.kode))).s, 200);
});

/* ---------------- kampus ---------------- */
let A, B, kA, kB;
uji("POST /api/relawan/admin/institusi: validasi 400, sah 201 dengan kode koordinator sekali tampil", async () => {
  for (const o of [{nama: "ab"}, {prov: "99"}, {no_mou: ""}, {mulai: "2026-13-40"}, {berakhir: geser(-200)}, {pic_nama: ""}, {pic_email: "x"}, {pic_wa: "12"}, {kuota: 0}, {kuota: 1.5}, {singkatan: "x"}]) {
    const r = await U.adm("POST", "/api/relawan/admin/institusi", mouBody(o)); assert.equal(r.s, 400, JSON.stringify(o) + r.t);
  }
  assert.equal((await U.api("POST", "/api/relawan/admin/institusi", mouBody(), MOD2)).s, 201, "moderator boleh");
  A = await U.adm("POST", "/api/relawan/admin/institusi", mouBody({nama: "Universitas Alfa Uji", singkatan: "UAU", kuota: 2}));
  B = await U.adm("POST", "/api/relawan/admin/institusi", mouBody({nama: "Universitas Beta Uji", singkatan: "UBU", prov: "16"}));
  assert.equal(A.s, 201); assert.match(A.j.kode, /^[0-9a-f]{26}$/); assert.equal(A.j.tautan, `http://bnpb.lokal/kampus#k=${A.j.kode}`);
  assert.equal((await U.DB.prepare("SELECT kode_sha FROM institusi WHERE id = ?").bind(A.j.id).first()).kode_sha, sha256(A.j.kode));
  kA = A.j.kode; kB = B.j.kode;
});

uji("pendaftaran jalur kampus: kampus mitra aktif diterima; kampus tak dikenal 404; kuota penuh 409", async () => {
  assert.equal((await daftar({nama: "Mhs A1", jalur: "kampus", kampus_id: A.j.id})).s, 201);
  assert.equal((await daftar({nama: "=Mhs A2", jalur: "kampus", kampus_id: A.j.id})).s, 201);
  const penuh = await daftar({nama: "Mhs A3", jalur: "kampus", kampus_id: A.j.id});
  assert.equal(penuh.s, 409); assert.match(penuh.j.galat, /kuota/);
  assert.equal((await daftar({nama: "Mhs B1", jalur: "kampus", kampus_id: B.j.id})).s, 201);
  assert.equal((await daftar({nama: "Mhs B2", jalur: "kampus", kampus_id: B.j.id})).s, 201);
  assert.equal((await daftar({nama: "Mhs X", jalur: "kampus", kampus_id: id16()})).s, 404);
  const org = await daftar({nama: "Org Satu", jalur: "organisasi", organisasi: "Komunitas Uji"}); assert.equal(org.s, 201);
  assert.equal((await U.DB.prepare("SELECT organisasi FROM relawan WHERE nama = 'Org Satu'").first()).organisasi, "Komunitas Uji");
});

uji("isolasi kampus: koordinator A hanya melihat dan memverifikasi relawan kampusnya, bukan kampus B", async () => {
  const a = await U.api("GET", "/api/relawan/kampus/saya", undefined, K(kA));
  assert.equal(a.s, 200); assert.equal(a.j.kampus.nama, "Universitas Alfa Uji");
  assert.deepEqual(a.j.relawan.map(r => r.nama).sort(), ["=Mhs A2", "Mhs A1"]);
  assert.ok(!a.t.includes("Mhs B"), "relawan kampus B bocor ke koordinator A");
  const b = await U.api("GET", "/api/relawan/kampus/saya", undefined, K(kB));
  assert.deepEqual(b.j.relawan.map(r => r.nama).sort(), ["Mhs B1", "Mhs B2"]);
  const idB1 = await idRelawan("Mhs B1"), idA1 = await idRelawan("Mhs A1");
  for (const aksi of ["verifikasi", "tolak"]) assert.equal((await U.api("POST", `/api/relawan/kampus/relawan/${idB1}`, {aksi}, K(kA))).s, 404, "A tidak boleh memutus relawan B");
  assert.equal((await U.DB.prepare("SELECT status FROM relawan WHERE id = ?").bind(idB1).first()).status, "terdaftar");
  for (const w of await U.DB.prepare("SELECT wa, email, darurat_wa, darurat_nama FROM relawan WHERE kampus_id = ?").bind(A.j.id).all().then(x => x.results)) for (const v of Object.values(w)) assert.ok(!a.t.includes(v), `koordinator melihat data pribadi ${v}`);
  assert.ok(!a.t.includes("pic.rahasia") && !a.t.includes("081299990001"), "PIC kampus tidak tampil di halaman koordinator");
  const v = await U.api("POST", `/api/relawan/kampus/relawan/${idA1}`, {aksi: "verifikasi"}, K(kA));
  assert.equal(v.s, 200); assert.equal(v.j.status, "diverifikasi");
  assert.equal((await U.api("POST", `/api/relawan/kampus/relawan/${idA1}`, {aksi: "verifikasi"}, K(kA))).s, 409);
  assert.equal((await U.api("POST", `/api/relawan/kampus/relawan/${idA1}`, {aksi: "hapus"}, K(kA))).s, 400);
  assert.equal((await U.api("POST", `/api/relawan/kampus/relawan/${idA1}`, {aksi: "verifikasi"}, K(kB))).s, 404, "B tidak boleh menyentuh relawan A");
  const tolak = await U.api("POST", `/api/relawan/kampus/relawan/${await idRelawan("Mhs B2")}`, {aksi: "tolak", alasan: "bukan mahasiswa"}, K(kB));
  assert.equal(tolak.j.status, "ditolak");
});

uji("GET /api/relawan/kampus/csv: rekap hanya kampus sendiri, sel berawalan rumus dinetralkan, tanpa data pribadi", async () => {
  const r = await U.api("GET", "/api/relawan/kampus/csv", undefined, K(kA));
  assert.equal(r.s, 200); assert.match(r.h.get("content-type"), /text\/csv/); assert.match(r.h.get("content-disposition"), /rekap-relawan-uau-.*\.csv/);
  assert.match(r.t, /nama,provinsi,kabupaten_kota,status,keahlian,sesi,jam_sah,jam_menunggu_validasi/);
  assert.ok(r.t.includes("Mhs A1") && !r.t.includes("Mhs B1"));
  assert.ok(/^'=Mhs A2,/m.test(r.t), "awalan = harus diberi tanda kutip tunggal");
  assert.ok(!/(^|,)=Mhs/m.test(r.t), "sel tidak boleh berawalan rumus");
  assert.ok(!/@contoh\.id|62812/.test(r.t), "CSV koordinator tanpa WA/email");
});

uji("MoU habis atau belum mulai menolak pendaftar kampus itu; MoU <= 60 hari ditandai segera_habis", async () => {
  const habis = await U.adm("POST", "/api/relawan/admin/institusi", mouBody({nama: "Universitas Habis Uji", singkatan: "UHU", mulai: geser(-400), berakhir: geser(-1)}));
  const belum = await U.adm("POST", "/api/relawan/admin/institusi", mouBody({nama: "Universitas Belum Uji", singkatan: "UBL", mulai: geser(5), berakhir: geser(300)}));
  const segera = await U.adm("POST", "/api/relawan/admin/institusi", mouBody({nama: "Universitas Segera Uji", singkatan: "USU", mulai: geser(-300), berakhir: geser(40)}));
  for (const k of [habis, belum]) { const r = await daftar({nama: "Mhs " + k.j.id, jalur: "kampus", kampus_id: k.j.id}); assert.equal(r.s, 409, r.t); assert.match(r.j.galat, /MoU/); }
  assert.equal((await daftar({nama: "Mhs Segera", jalur: "kampus", kampus_id: segera.j.id})).s, 201, "segera habis masih menerima");
  const l = (await U.adm("GET", "/api/relawan/admin/institusi")).j.institusi.map(k => ({...k, ...k.mou})), per = nama => l.find(k => k.nama === nama);
  assert.equal(per("Universitas Habis Uji").status, "habis"); assert.equal(per("Universitas Belum Uji").status, "belum");
  assert.equal(per("Universitas Segera Uji").status, "segera_habis"); assert.equal(per("Universitas Segera Uji").sisa_hari, 40);
  assert.equal(per("Universitas Alfa Uji").status, "aktif");
  assert.equal(per("Universitas Alfa Uji").pic_nama, "Dr. Rahasia PIC", "admin melihat PIC");
  const r = (await U.api("GET", "/api/relawan/ringkas", undefined, ipBaru())).j;
  const nama = r.kampus.map(k => k.nama);
  assert.ok(nama.includes("Universitas Alfa Uji") && nama.includes("Universitas Segera Uji"));
  assert.ok(!nama.includes("Universitas Habis Uji") && !nama.includes("Universitas Belum Uji"), "MoU tidak berlaku tidak dipajang sebagai mitra aktif");
});

uji("kampus validasi jam: koordinator mengesahkan atau menolak jam relawan kampusnya saja, angka publik dan rekap hanya berubah untuk yang sah", async () => {
  const idA1 = await idRelawan("Mhs A1"), pid = id16(), gid = id16(), j1 = id16(), j2 = id16(), kini = Date.now();
  await sisip("relawan_permintaan", {id: pid, judul: "Uji jam kampus", bencana: "banjir", prov: "62", kab: "Kab", butuh: '[{"keahlian":"medis","jumlah":1}]', mulai: geser(-5), selesai: geser(5), dibuat: kini});
  await sisip("relawan_penugasan", {id: gid, permintaan_id: pid, relawan_id: idA1, status: "bertugas", dibuat: kini, diubah: kini});
  await sisip("relawan_jam", {id: j1, relawan_id: idA1, penugasan_id: gid, masuk: kini - 5 * JAM, keluar: kini - 3 * JAM, menit: 120});
  await sisip("relawan_jam", {id: j2, relawan_id: idA1, penugasan_id: gid, masuk: kini - 2 * JAM, keluar: kini - JAM, menit: 60});
  const jamPublik = async () => (await U.api("GET", "/api/relawan/ringkas", undefined, ipBaru())).j.jam_kerja_jam;
  const sahDb = async id => (await U.DB.prepare("SELECT sah FROM relawan_jam WHERE id = ?").bind(id).first()).sah;
  const rekap = async () => (await U.api("GET", "/api/relawan/kampus/csv", undefined, K(kA))).t.match(/^Mhs A1,.*$/m)[0];
  const p0 = await jamPublik();
  assert.match(await rekap(), /,2,0,3$/, "sesi 2, jam sah 0, menunggu 3");
  const url = id => `/api/relawan/kampus/jam/${id}`;
  assert.equal((await U.api("POST", url(j1), {aksi: "sah"}, K("0".repeat(26)))).s, 403, "kode salah");
  assert.equal((await U.api("POST", url(j1), {aksi: "sah"}, ipBaru())).s, 403, "tanpa kode");
  for (const aksi of ["x", undefined, "SAH"]) assert.equal((await U.api("POST", url(j1), {aksi}, K(kA))).s, 400, `aksi ${aksi}`);
  assert.equal((await U.api("POST", url(id16()), {aksi: "sah"}, K(kA))).s, 404, "id tak dikenal");
  assert.equal((await U.api("POST", url(j1), {aksi: "sah"}, K(kB))).s, 404, "koordinator B tidak boleh menyentuh jam relawan kampus A");
  assert.equal(await sahDb(j1), 0); assert.equal(await jamPublik(), p0);
  assert.equal((await U.api("POST", url(j1), {aksi: "sah"}, K(kA))).j.sah, 1);
  assert.equal(await sahDb(j1), 1);
  assert.ok(Math.abs(await jamPublik() - p0 - 2) < 0.06, "angka publik naik 2 jam, hanya dari yang sah");
  assert.match(await rekap(), /,2,2,1$/, "rekap: jam sah 2, menunggu 1");
  assert.equal((await U.api("POST", url(j2), {aksi: "tolak"}, K(kA))).j.sah, 2);
  assert.equal(await sahDb(j2), 2);
  assert.ok(Math.abs(await jamPublik() - p0 - 2) < 0.06, "yang ditolak tidak menambah angka publik");
  assert.match(await rekap(), /,2,2,0$/, "rekap: yang ditolak tidak lagi menunggu");
});

uji("POST /api/relawan/admin/institusi/:id: kode baru mencabut kode lama, cabut_kode menutup, ubah menyimpan", async () => {
  const baru = await U.adm("POST", `/api/relawan/admin/institusi/${B.j.id}`, {aksi: "kode_baru"});
  assert.equal(baru.s, 200); assert.notEqual(baru.j.kode, kB);
  assert.equal((await U.api("GET", "/api/relawan/kampus/saya", undefined, K(kB))).s, 403, "kode lama harus mati");
  assert.equal((await U.api("GET", "/api/relawan/kampus/saya", undefined, K(baru.j.kode))).s, 200); kB = baru.j.kode;
  assert.equal((await U.adm("POST", `/api/relawan/admin/institusi/${B.j.id}`, {aksi: "cabut_kode"})).s, 200);
  assert.equal((await U.api("GET", "/api/relawan/kampus/saya", undefined, K(kB))).s, 403);
  assert.equal((await U.adm("POST", `/api/relawan/admin/institusi/${B.j.id}`, {aksi: "ubah", ...mouBody({nama: "Universitas Beta Uji", singkatan: "UBU", kuota: 77, prov: "16"})})).s, 200);
  const pj = await U.DB.prepare("SELECT id, nomor FROM institusi_perjanjian WHERE institusi_id = ?").bind(B.j.id).first();
  assert.equal((await U.adm("POST", `/api/relawan/admin/institusi/${B.j.id}`, {aksi: "perjanjian", perjanjian_id: pj.id, ...mouBody({kuota: 77}).perjanjian})).s, 200, "perpanjang / ubah kuota lewat perjanjian");
  assert.equal((await U.DB.prepare("SELECT kuota FROM institusi_perjanjian WHERE institusi_id = ?").bind(B.j.id).first()).kuota, 77);
  assert.equal((await U.adm("POST", `/api/relawan/admin/institusi/${id16()}`, {aksi: "kode_baru"})).s, 404);
  assert.equal((await U.adm("POST", `/api/relawan/admin/institusi/${B.j.id}`, {aksi: "x"})).s, 400);
  const baru2 = await U.adm("POST", `/api/relawan/admin/institusi/${B.j.id}`, {aksi: "kode_baru"}); kB = baru2.j.kode;
});

/* ---------------- alur relawan: verifikasi, pencocokan, penugasan, jam ---------------- */
let P, rA, rB, rC, rD, rE, rF;
uji("POST /api/relawan/admin/relawan/:id: alur verifikasi, siap, tolak, aturan transisi, daftar hitam wajib alasan", async () => {
  const a = await daftar({nama: "Alur Satu"}), id = await idRelawan("Alur Satu"), u = (aksi, x = {}) => U.adm("POST", `/api/relawan/admin/relawan/${id}`, {aksi, ...x});
  assert.equal((await u("siap")).s, 409, "belum diverifikasi");
  assert.equal((await u("verifikasi")).j.status, "diverifikasi");
  assert.equal((await u("verifikasi")).s, 409);
  assert.equal((await u("sulap")).s, 400);
  assert.equal((await U.api("POST", `/api/relawan/admin/relawan/${id}`, {aksi: "siap"}, GERBANG)).s, 403);
  assert.equal((await U.api("POST", `/api/relawan/saya`, {aksi: "siap"}, K(a.j.kode))).j.status, "siap_tugas", "relawan menyatakan siap sendiri");
  assert.equal((await U.api("POST", `/api/relawan/saya`, {aksi: "istirahat"}, K(a.j.kode))).j.status, "diverifikasi");
  assert.equal((await U.api("POST", `/api/relawan/saya`, {aksi: "istirahat"}, K(a.j.kode))).s, 409);
  assert.equal((await u("daftar_hitam")).s, 400); assert.equal((await u("daftar_hitam", {alasan: "xx"})).s, 400);
  assert.equal((await U.api("POST", `/api/relawan/admin/relawan/${id}`, {aksi: "daftar_hitam", alasan: "melanggar kesepakatan lapangan"}, MOD2)).j.status, "daftar_hitam");
  assert.equal((await U.api("POST", `/api/relawan/saya`, {aksi: "siap"}, K(a.j.kode))).s, 403, "daftar hitam tidak bisa mengubah akun");
  const ulang = await daftar({nama: "Alur Ulang", wa: (await U.DB.prepare("SELECT wa FROM relawan WHERE id = ?").bind(id).first()).wa});
  assert.equal(ulang.s, 409, "daftar hitam tidak bisa mendaftar ulang dengan WA yang sama");
  assert.equal((await u("pulihkan", {alasan: "banding diterima admin"})).j.status, "nonaktif");
  const kb = await u("kode_baru"); assert.match(kb.j.kode, /^[0-9a-f]{26}$/);
  assert.equal((await U.api("GET", "/api/relawan/saya", undefined, K(a.j.kode))).s, 403, "kode lama mati sesudah kode_baru");
  assert.equal((await U.api("GET", "/api/relawan/saya", undefined, K(kb.j.kode))).s, 200);
});

uji("POST /api/relawan/admin/permintaan: validasi 400, sah 201", async () => {
  for (const o of [{judul: "ab"}, {bencana: "Banjir!"}, {prov: "99"}, {kab: ""}, {butuh: []}, {butuh: [{keahlian: "sulap", jumlah: 1}]}, {butuh: [{keahlian: "medis", jumlah: 0}]},
    {butuh: [{keahlian: "medis", jumlah: 1}, {keahlian: "medis", jumlah: 2}]}, {lat: -2}, {lat: 50, lon: 100}, {mulai: "2026-02-30"}, {selesai: geser(-5)}, {catatan: "x".repeat(501)}]) {
    const r = await U.adm("POST", "/api/relawan/admin/permintaan", butuhBody(o)); assert.equal(r.s, 400, JSON.stringify(o) + r.t);
  }
  const r = await U.adm("POST", "/api/relawan/admin/permintaan", butuhBody({lat: -2.2, lon: 114, butuh: [{keahlian: "medis", jumlah: 3}, {keahlian: "perawat", jumlah: 2}]}));
  assert.equal(r.s, 201); P = r.j.id;
  assert.equal((await U.adm("GET", "/api/relawan/admin/permintaan")).j.permintaan.find(p => p.id === P).dibutuhkan, 5);
});

uji("GET /api/relawan/admin/permintaan/:id: pencocokan memilih kandidat yang benar dan mengurutkan dengan alasan", async () => {
  rA = await buatSiap(form({nama: "Kand A Sama Kab", kab: "Pulang Pisau", keahlian: ["medis", "perawat"], maks_hari: 30}));
  rB = await buatSiap(form({nama: "Kand B Sama Prov", kab: "Kapuas", keahlian: ["medis"], maks_hari: 30}));
  rC = await buatSiap(form({nama: "Kand C Luar Bersedia", prov: "16", kab: "OKI", keahlian: ["medis"], luar_provinsi: true}));
  rD = await buatSiap(form({nama: "Kand D Luar Menolak", prov: "16", kab: "OKI", keahlian: ["medis"], luar_provinsi: false}));
  rE = await buatSiap(form({nama: "Kand E Salah Keahlian", kab: "Pulang Pisau", keahlian: ["bahasa_isyarat"]}));
  rF = await buatSiap(form({nama: "Kand F Singkat", kab: "Pulang Pisau", keahlian: ["medis"], maks_hari: 2}));
  const belumSiap = await daftar({nama: "Kand G Belum Siap", keahlian: ["medis"]});
  const r = await U.adm("GET", `/api/relawan/admin/permintaan/${P}`);
  assert.equal(r.s, 200);
  const urut = r.j.kandidat.map(k => k.nama);
  assert.deepEqual(urut, ["Kand A Sama Kab", "Kand F Singkat", "Kand B Sama Prov", "Kand C Luar Bersedia"].sort((x, y) => urut.indexOf(x) - urut.indexOf(y)), "urutan harus konsisten");
  assert.equal(urut[0], "Kand A Sama Kab", "keahlian ganda + kabupaten sama + waktu cukup = teratas");
  assert.ok(urut.indexOf("Kand B Sama Prov") < urut.indexOf("Kand C Luar Bersedia"), "satu provinsi mendahului luar provinsi");
  assert.ok(urut.indexOf("Kand A Sama Kab") < urut.indexOf("Kand F Singkat"));
  for (const nama of ["Kand D Luar Menolak", "Kand E Salah Keahlian", "Kand G Belum Siap"]) assert.ok(!urut.includes(nama), `${nama} tidak boleh jadi kandidat`);
  const a = r.j.kandidat[0]; assert.deepEqual(a.cocok.sort(), ["medis", "perawat"]); assert.equal(a.wilayah, "sama_kab"); assert.equal(a.cukup_waktu, true);
  assert.equal(r.j.kandidat.find(k => k.nama === "Kand F Singkat").cukup_waktu, false);
  assert.equal(belumSiap.s, 201);
});

uji("hitungKandidat: beban 90 hari menurunkan peringkat, nama sebagai pemutus seri", async () => {
  const p = {butuh: JSON.stringify([{keahlian: "medis", jumlah: 1}]), prov: "62", kab: "X", mulai: "2026-01-01", selesai: "2026-01-10"};
  const c = (nama, beban) => ({id: nama, nama, prov: "62", kab: "Y", jalur: "umum", keahlian: '["medis"]', maks_hari: 30, luar_provinsi: 0, beban});
  assert.deepEqual(R.hitungKandidat(p, [c("Bayu", 3), c("Citra", 0), c("Anto", 0)], Date.now()).map(k => k.nama), ["Anto", "Citra", "Bayu"]);
});

let G1;
uji("POST /api/relawan/admin/permintaan/:id tugaskan: hanya siap_tugas, tidak ganda, relawan lain dummy ditolak", async () => {
  const u = b => U.adm("POST", `/api/relawan/admin/permintaan/${P}`, b);
  assert.equal((await u({aksi: "tugaskan"})).s, 400);
  assert.equal((await u({aksi: "tugaskan", relawan_id: id16()})).s, 404);
  const belum = await idRelawan("Kand G Belum Siap");
  assert.equal((await u({aksi: "tugaskan", relawan_id: belum})).s, 409, "belum siap_tugas");
  const t = await u({aksi: "tugaskan", relawan_id: rA.id}); assert.equal(t.s, 201); G1 = t.j.id;
  assert.equal((await u({aksi: "tugaskan", relawan_id: rA.id})).s, 409, "relawan yang sama tidak bisa ditugaskan dua kali");
  assert.equal((await U.DB.prepare("SELECT status FROM relawan WHERE id = ?").bind(rA.id).first()).status, "ditugaskan");
  const k = (await U.adm("GET", `/api/relawan/admin/permintaan/${P}`)).j.kandidat.map(x => x.nama);
  assert.ok(!k.includes("Kand A Sama Kab"), "yang sudah ditugaskan keluar dari kandidat");
});

uji("relawan melihat penugasan di /relawan/saya; relawan lain tidak bisa menyentuhnya (404)", async () => {
  const s = await U.api("GET", "/api/relawan/saya", undefined, K(rA.kode));
  assert.equal(s.j.relawan.status, "ditugaskan"); assert.equal(s.j.penugasan.length, 1); assert.equal(s.j.penugasan[0].status, "ditawarkan"); assert.equal(s.j.penugasan[0].judul, "Pos kesehatan uji");
  const lain = await U.api("GET", "/api/relawan/saya", undefined, K(rB.kode)); assert.equal(lain.j.penugasan.length, 0);
  assert.ok(!lain.t.includes("Pos kesehatan uji"));
  for (const aksi of ["terima", "tolak", "masuk", "keluar"]) assert.equal((await U.api("POST", `/api/relawan/saya/penugasan/${G1}`, {aksi}, K(rB.kode))).s, 404, `relawan lain ${aksi}`);
  assert.equal((await U.api("POST", `/api/relawan/saya/penugasan/${G1}`, {aksi: "masuk"}, K(rA.kode))).s, 409, "belum diterima tidak bisa check-in");
  assert.equal((await U.api("POST", `/api/relawan/saya/penugasan/${G1}`, {aksi: "sulap"}, K(rA.kode))).s, 400);
});

uji("check-in dan check-out menghitung jam kerja; validasi sah masuk ringkasan publik", async () => {
  const g = aksi => U.api("POST", `/api/relawan/saya/penugasan/${G1}`, aksi, K(rA.kode));
  assert.equal((await g({aksi: "terima"})).j.status, "diterima");
  assert.equal((await g({aksi: "masuk", lat: 99, lon: 0})).s, 400, "lokasi di luar Indonesia");
  assert.equal((await g({aksi: "masuk", lat: -2.2})).s, 400, "lat tanpa lon");
  assert.equal((await g({aksi: "keluar"})).s, 409, "check-out tanpa check-in");
  assert.equal((await g({aksi: "masuk", lat: -2.2, lon: 114.0})).s, 200);
  assert.equal((await g({aksi: "masuk"})).s, 409, "check-in ganda");
  assert.equal((await U.DB.prepare("SELECT status FROM relawan WHERE id = ?").bind(rA.id).first()).status, "bertugas");
  await U.DB.prepare("UPDATE relawan_jam SET masuk = masuk - ? WHERE relawan_id = ? AND keluar IS NULL").bind(3 * JAM + 30 * 60e3, rA.id).run();   // mundurkan: 3,5 jam lalu
  const o = await g({aksi: "keluar"});
  assert.equal(o.s, 200); assert.ok(Math.abs(o.j.menit - 210) <= 1, `menit ${o.j.menit}`);
  const j = await U.DB.prepare("SELECT id, menit, sah FROM relawan_jam WHERE relawan_id = ?").bind(rA.id).first();
  assert.equal(j.sah, 0);
  /* sesi 20 jam yang lupa check-out dibatasi 16 jam */
  assert.equal((await g({aksi: "masuk"})).s, 200);
  await U.DB.prepare("UPDATE relawan_jam SET masuk = masuk - ? WHERE relawan_id = ? AND keluar IS NULL").bind(20 * JAM, rA.id).run();
  assert.equal((await g({aksi: "keluar"})).j.menit, 960);
  const sebelum = (await U.api("GET", "/api/relawan/ringkas", undefined, ipBaru())).j.jam_kerja_jam;
  assert.equal((await U.adm("POST", `/api/relawan/admin/jam/${j.id}`, {aksi: "sah"})).s, 200);
  assert.equal((await U.adm("POST", `/api/relawan/admin/jam/${j.id}`, {aksi: "x"})).s, 400);
  assert.equal((await U.adm("POST", `/api/relawan/admin/jam/${id16()}`, {aksi: "sah"})).s, 404);
  const sesudah = (await U.api("GET", "/api/relawan/ringkas", undefined, ipBaru())).j.jam_kerja_jam;
  assert.ok(Math.abs(sesudah - sebelum - 3.5) < 0.06, `jam publik naik ${sesudah - sebelum}, harusnya 3,5`);
  const s = await U.api("GET", "/api/relawan/saya", undefined, K(rA.kode)); assert.equal(s.j.relawan.status, "bertugas"); assert.equal(s.j.jam.length, 2);
  assert.ok(Math.abs(s.j.jam_sah_menit - 210) <= 1);
});

uji("luring: check-in/out dengan klien_id ganda tidak membuat baris ganda; waktu klien dipakai; kiriman serentak aman", async () => {
  const g = b => U.api("POST", `/api/relawan/saya/penugasan/${G1}`, b, K(rA.kode)), kini = Date.now();
  const baris = col => U.DB.prepare(`SELECT count(*) n FROM relawan_jam WHERE relawan_id = ? AND ${col} IS NOT NULL`).bind(rA.id).first().then(r => r.n);
  try {
    const m = {aksi: "masuk", klien_id: "klien-masuk-0001", waktu_klien: kini - 2 * JAM};
    const a = await g(m); assert.equal(a.s, 200, a.t); assert.equal(a.j.masuk, m.waktu_klien, "jam masuk = waktu klien");
    const b = await g(m); assert.equal(b.s, 200, b.t); assert.equal(b.j.ulang, true); assert.equal(b.j.masuk, a.j.masuk); assert.equal(await baris("klien_masuk"), 1);
    assert.equal((await g({aksi: "masuk", klien_id: "klien-masuk-0002"})).s, 409, "klien_id lain saat masih check-in tetap 409");
    const k = {aksi: "keluar", klien_id: "klien-keluar-0001", waktu_klien: kini - JAM};
    const c = await g(k); assert.equal(c.s, 200, c.t); assert.equal(c.j.menit, 60); assert.equal(c.j.keluar, k.waktu_klien);
    const d = await g(k); assert.equal(d.s, 200, d.t); assert.equal(d.j.ulang, true); assert.equal(d.j.menit, 60); assert.equal(await baris("klien_keluar"), 1);
    assert.equal((await g({aksi: "masuk", klien_id: "klien-masuk-0001"})).j.ulang, true, "check-in lama tetap dikenali sesudah check-out");
    assert.equal((await g({aksi: "masuk", klien_id: "pendek"})).s, 400); assert.equal((await g({aksi: "masuk", waktu_klien: "x"})).s, 400);
    /* serentak + waktu di masa depan diabaikan */
    const par = await Promise.all([1, 2, 3].map(() => g({aksi: "masuk", klien_id: "klien-masuk-0003", waktu_klien: kini + 3 * JAM})));
    assert.ok(par.every(r => r.s === 200), par.map(r => r.s).join()); assert.ok(par.every(r => r.j.masuk === par[0].j.masuk && r.j.masuk <= Date.now() + 1000));
    assert.equal(await baris("klien_masuk"), 2);
    assert.equal((await g({aksi: "keluar", klien_id: "klien-keluar-0002", waktu_klien: kini - 10 * JAM})).s, 200, "keluar sebelum masuk dijepit ke jam masuk (CHECK)");
    assert.equal((await U.DB.prepare("SELECT menit FROM relawan_jam WHERE klien_keluar = 'klien-keluar-0002'").first()).menit, 0);
  } finally { await U.DB.prepare("DELETE FROM relawan_jam WHERE relawan_id = ? AND (klien_masuk IS NOT NULL OR klien_keluar IS NOT NULL)").bind(rA.id).run(); }
});

uji("POST /api/relawan/admin/penugasan/:id: asuransi, selesai (butuh check-out), penilaian 1-5 hanya setelah selesai", async () => {
  const u = b => U.adm("POST", `/api/relawan/admin/penugasan/${G1}`, b);
  assert.equal((await u({aksi: "asuransi", asuransi: "kebal"})).s, 400);
  assert.equal((await u({aksi: "asuransi", asuransi: "aktif", polis: "POL-1"})).j.asuransi, "aktif");
  assert.equal((await u({aksi: "nilai", nilai: 5})).s, 409, "belum selesai");
  await U.api("POST", `/api/relawan/saya/penugasan/${G1}`, {aksi: "masuk"}, K(rA.kode));
  assert.equal((await u({aksi: "selesai"})).s, 409, "masih check-in");
  await U.api("POST", `/api/relawan/saya/penugasan/${G1}`, {aksi: "keluar"}, K(rA.kode));
  assert.equal((await u({aksi: "selesai"})).j.status, "selesai");
  assert.equal((await U.DB.prepare("SELECT status FROM relawan WHERE id = ?").bind(rA.id).first()).status, "selesai");
  for (const n of [0, 6, 2.5, "x"]) assert.equal((await u({aksi: "nilai", nilai: n})).s, 400, `nilai ${n}`);
  assert.equal((await u({aksi: "nilai", nilai: 4, catatan: "tepat waktu"})).j.nilai, 4);
  const l = (await U.adm("GET", "/api/relawan/admin/penugasan")).j.penugasan.find(p => p.id === G1);
  assert.equal(l.nilai, 4); assert.equal(l.asuransi, "aktif"); assert.equal(l.nama, "Kand A Sama Kab");
  assert.equal((await U.api("POST", `/api/relawan/saya`, {aksi: "siap"}, K(rA.kode))).j.status, "siap_tugas", "selesai bisa siap lagi");
});

uji("penugasan ditolak relawan mengembalikan siap_tugas; admin bisa membatalkan tawaran", async () => {
  const t1 = await U.adm("POST", `/api/relawan/admin/permintaan/${P}`, {aksi: "tugaskan", relawan_id: rB.id}), t2 = await U.adm("POST", `/api/relawan/admin/permintaan/${P}`, {aksi: "tugaskan", relawan_id: rC.id});
  assert.equal((await U.api("POST", `/api/relawan/saya/penugasan/${t1.j.id}`, {aksi: "tolak"}, K(rB.kode))).j.status, "ditolak");
  assert.equal((await U.DB.prepare("SELECT status FROM relawan WHERE id = ?").bind(rB.id).first()).status, "siap_tugas");
  assert.equal((await U.adm("POST", `/api/relawan/admin/penugasan/${t2.j.id}`, {aksi: "batalkan"})).j.status, "dibatalkan");
  assert.equal((await U.DB.prepare("SELECT status FROM relawan WHERE id = ?").bind(rC.id).first()).status, "siap_tugas");
  assert.equal((await U.adm("POST", `/api/relawan/admin/penugasan/${t2.j.id}`, {aksi: "batalkan"})).s, 409);
  assert.equal((await U.adm("POST", `/api/relawan/admin/permintaan/${P}`, {aksi: "tutup"})).j.status, "ditutup");
  assert.equal((await U.adm("POST", `/api/relawan/admin/permintaan/${P}`, {aksi: "tugaskan", relawan_id: rD.id})).s, 409, "permintaan ditutup");
  assert.equal((await U.adm("POST", `/api/relawan/admin/permintaan/${P}`, {aksi: "buka"})).j.status, "buka");
});

uji("pelatihan: catat, kedaluwarsa ditandai, validasi 400, hapus", async () => {
  const b = (o = {}) => ({relawan_id: rA.id, nama: "BTCLS", penyelenggara: "PMI", tgl: geser(-200), berlaku_sampai: geser(100), ...o});
  for (const o of [{relawan_id: "x"}, {nama: ""}, {tgl: "2026-02-30"}, {berlaku_sampai: geser(-300)}, {penyelenggara: "x".repeat(121)}]) assert.equal((await U.adm("POST", "/api/relawan/admin/pelatihan", b(o))).s, 400, JSON.stringify(o));
  assert.equal((await U.adm("POST", "/api/relawan/admin/pelatihan", b({relawan_id: id16()}))).s, 404);
  const ok = await U.adm("POST", "/api/relawan/admin/pelatihan", b()), lama = await U.adm("POST", "/api/relawan/admin/pelatihan", b({nama: "SAR Dasar", tgl: geser(-500), berlaku_sampai: geser(-5)}));
  assert.equal(ok.s, 201);
  const l = (await U.adm("GET", "/api/relawan/admin/pelatihan")).j.pelatihan;
  assert.equal(l.find(p => p.nama === "SAR Dasar").kedaluwarsa, true); assert.equal(l.find(p => p.nama === "BTCLS").kedaluwarsa, false);
  assert.equal((await U.api("GET", "/api/relawan/saya", undefined, K(rA.kode))).j.pelatihan.length, 2, "relawan melihat sertifikat pelatihannya");
  assert.equal((await U.adm("POST", `/api/relawan/admin/pelatihan/${lama.j.id}`, {aksi: "hapus"})).s, 200);
  assert.equal((await U.adm("POST", `/api/relawan/admin/pelatihan/${lama.j.id}`, {aksi: "hapus"})).s, 404);
});

uji("GET /api/relawan/admin/relawan: filter prov, keahlian, status, jalur; data pribadi tampil; CSV admin memuat WA", async () => {
  const q = s => U.adm("GET", "/api/relawan/admin/relawan" + s);
  const prov16 = (await q("?prov=16")).j.relawan; assert.ok(prov16.length >= 2 && prov16.every(r => r.prov === "16"));
  const medis = (await q("?keahlian=medis&status=siap_tugas")).j.relawan; assert.ok(medis.length >= 3 && medis.every(r => r.keahlian.includes("medis") && r.status === "siap_tugas"));
  assert.ok((await q("?jalur=kampus")).j.relawan.every(r => r.jalur === "kampus"));
  assert.equal((await q("?q=Kand%20A")).j.relawan.length, 1);
  for (const s of ["?status=x", "?prov=9", "?keahlian=sulap", "?jalur=x", "?q=" + "a".repeat(61)]) assert.equal((await q(s)).s, 400, s);
  const a = (await q("?q=Kand%20A")).j.relawan[0];
  assert.match(a.wa, /^628127/); assert.match(a.email, /@contoh\.id$/); assert.ok(a.darurat_nama); assert.equal(a.kampus, null);
  assert.ok((await q("")).j.hitung.siap_tugas >= 3);
  const rinci = await U.adm("GET", `/api/relawan/admin/relawan/${rA.id}`); assert.equal(rinci.j.penugasan.length, 1); assert.equal(rinci.j.jam.length, 3);
  assert.equal((await U.adm("GET", `/api/relawan/admin/relawan/${id16()}`)).s, 404);
  const c = await U.adm("GET", "/api/relawan/admin/csv?prov=62");
  assert.equal(c.s, 200); assert.match(c.h.get("content-type"), /text\/csv/); assert.ok(c.t.includes(a.wa) && c.t.includes("Kand A Sama Kab"));
});

uji("POST /api/relawan/saya: ketersediaan divalidasi dan tersimpan", async () => {
  const x = (o) => U.api("POST", "/api/relawan/saya", {aksi: "ketersediaan", hari_per_minggu: 5, maks_hari: 10, luar_provinsi: true, ...o}, K(rB.kode));
  assert.equal((await x({hari_per_minggu: 9})).s, 400); assert.equal((await x({maks_hari: 0})).s, 400); assert.equal((await x({luar_provinsi: "ya"})).s, 400);
  assert.equal((await x({})).s, 200);
  const d = await U.DB.prepare("SELECT hari_per_minggu h, maks_hari m, luar_provinsi l FROM relawan WHERE id = ?").bind(rB.id).first();
  assert.deepEqual({...d}, {h: 5, m: 10, l: 1});
});

uji("cabut diri: butuh konfirmasi HAPUS, data pribadi dikosongkan, kode mati, jam kerja tetap sebagai angka", async () => {
  const r = await daftar({nama: "Cabut Diri", wa: "0812-5550-7777", email: "cabut@contoh.id", sertifikat: "rahasia sertifikat", jalur: "organisasi", organisasi: "Org Cabut"});
  assert.equal((await U.api("POST", "/api/relawan/saya", {aksi: "cabut"}, K(r.j.kode))).s, 400);
  assert.equal((await U.api("POST", "/api/relawan/saya", {aksi: "cabut", konfirmasi: "hapus"}, K(r.j.kode))).s, 400);
  assert.equal(await U.n("relawan", "nama = 'Cabut Diri'"), 1);
  assert.equal((await U.api("POST", "/api/relawan/saya", {aksi: "cabut", konfirmasi: "HAPUS"}, K(r.j.kode))).j.dihapus, true);
  assert.equal(await U.n("relawan", "nama = 'Cabut Diri'"), 0);
  const d = await U.DB.prepare("SELECT * FROM relawan WHERE wa IS NULL AND anonim = 1 AND nama = '(dihapus)' AND dibuat = (SELECT max(dibuat) FROM relawan WHERE anonim = 1)").first();
  assert.ok(d, "baris anonim ada"); for (const k of ["wa", "email", "organisasi", "sertifikat", "gol_darah", "darurat_nama", "darurat_wa", "kode_sha"]) assert.equal(d[k], null, k);
  assert.equal(d.status, "nonaktif"); assert.equal(d.keahlian, "[]");
  assert.equal((await U.api("GET", "/api/relawan/saya", undefined, K(r.j.kode))).s, 403);
  assert.equal((await daftar({nama: "Cabut Kembali", wa: "0812-5550-7777", email: "cabut@contoh.id"})).s, 201, "WA yang sama boleh mendaftar lagi");
  /* sedang bertugas: sesi terbuka ikut ditutup, penugasan dibatalkan */
  const b = await buatSiap(form({nama: "Cabut Bertugas", keahlian: ["medis"]}));
  const t = await U.adm("POST", `/api/relawan/admin/permintaan/${P}`, {aksi: "tugaskan", relawan_id: b.id});
  await U.api("POST", `/api/relawan/saya/penugasan/${t.j.id}`, {aksi: "terima"}, K(b.kode)); await U.api("POST", `/api/relawan/saya/penugasan/${t.j.id}`, {aksi: "masuk"}, K(b.kode));
  assert.equal(await U.n("relawan_jam", `relawan_id = '${b.id}' AND keluar IS NULL`), 1);
  assert.equal((await U.api("POST", "/api/relawan/saya", {aksi: "cabut", konfirmasi: "HAPUS"}, K(b.kode))).s, 200);
  assert.equal(await U.n("relawan_jam", `relawan_id = '${b.id}' AND keluar IS NULL`), 0);
  assert.equal((await U.DB.prepare("SELECT status FROM relawan_penugasan WHERE id = ?").bind(t.j.id).first()).status, "dibatalkan");
});

uji("rute publik tidak memuat WA, email, kontak darurat, PIC, kode, atau nama relawan", async () => {
  const sensitif = (await U.DB.prepare("SELECT wa, email, darurat_wa, darurat_nama, nama FROM relawan WHERE anonim = 0 AND dummy = 0").all()).results.flatMap(r => Object.values(r)).filter(Boolean);
  const kampus = (await U.DB.prepare("SELECT pic_nama, pic_email, pic_wa FROM institusi").all()).results.flatMap(r => Object.values(r)).filter(Boolean);
  assert.ok(sensitif.length > 20 && kampus.length >= 3);
  for (const j of ["/api/relawan/ringkas", "/api/relawan/ringkas?dummy=1"]) {
    const r = await U.api("GET", j, undefined, ipBaru()); assert.equal(r.s, 200);
    for (const s of [...sensitif, ...kampus]) assert.ok(!r.t.includes(s), `${j} membocorkan ${s}`);
    assert.ok(!/kode_sha|"kode"/.test(r.t));
  }
  const d = (await U.api("GET", "/api/relawan/ringkas", undefined, ipBaru())).j;
  assert.ok(d.siap_tugas >= 3 && Array.isArray(d.per_provinsi) && Array.isArray(d.per_keahlian) && d.kampus.length >= 2);   // sel < 5 / < 3 orang ditekan (keamanan 2:), jadi panjangnya tidak dijaga di sini
  assert.deepEqual(Object.keys(d.kampus[0]).sort(), ["id", "nama", "prov", "relawan", "singkatan"]);
  assert.ok(d.konfig.keahlian.medis && d.konfig.provinsi["62"]);
  for (const h of ["halaman", "kampus"]) { const x = await U.api("GET", h === "halaman" ? "/relawan" : "/kampus", undefined, ipBaru()); for (const s of sensitif) assert.ok(!x.t.includes(s)); }
});

/* ---------------- dummy ---------------- */
let sebelum;
uji("POST /api/relawan/dummy: hanya Super Admin; tanpa auth, moderator biasa, akun gerbang ditolak", async () => {
  for (const h of [{}, MOD2, GERBANG]) assert.equal((await U.api("POST", "/api/relawan/dummy", {aksi: "isi"}, {...h, ...ipBaru()})).s, 403);
  assert.equal((await U.adm("POST", "/api/relawan/dummy", {aksi: "sulap"})).s, 400);
  assert.equal(await U.n("relawan", "dummy = 1"), 0);
});

uji("dummy isi: rantai lengkap, tiap status minimal satu, MoU segera habis dan habis, angka admin bukan nol", async () => {
  const snap = async () => Object.fromEntries(await Promise.all(["institusi", "institusi_perjanjian", "relawan", "relawan_permintaan", "relawan_penugasan", "relawan_jam", "relawan_pelatihan"].map(async t => [t, await U.n(t, "dummy = 0")])));
  sebelum = await snap();
  const asli = (await U.api("GET", "/api/relawan/ringkas", undefined, ipBaru())).j;
  const r = await U.adm("POST", "/api/relawan/dummy", {aksi: "isi"});
  assert.equal(r.s, 201, r.t); assert.ok(r.j.kampus >= 3 && r.j.relawan >= 9 && r.j.permintaan >= 3 && r.j.penugasan >= 5 && r.j.jam >= 8 && r.j.pelatihan >= 4);
  assert.equal((await U.adm("POST", "/api/relawan/dummy", {aksi: "isi"})).s, 409, "gerbang sudah ada");
  for (const s of R.STATUS) assert.ok(await U.n("relawan", `dummy = 1 AND status = '${s}'`) >= 1, `status ${s} tak terwakili`);
  for (const s of R.STATUS_PENUGASAN.filter(x => ["ditawarkan", "diterima", "bertugas", "selesai"].includes(x))) assert.ok(await U.n("relawan_penugasan", `dummy = 1 AND status = '${s}'`) >= 1, `penugasan ${s}`);
  for (const s of R.STATUS_PERMINTAAN) assert.ok(await U.n("relawan_permintaan", `dummy = 1 AND status = '${s}'`) >= 1, `permintaan ${s}`);
  for (const j of [0, 1, 2]) assert.ok(await U.n("relawan_jam", `dummy = 1 AND sah = ${j} AND keluar IS NOT NULL`) >= 1, `jam sah=${j}`);
  assert.ok(await U.n("relawan_jam", "dummy = 1 AND keluar IS NULL") >= 1, "satu sesi masih terbuka");
  assert.ok(await U.n("relawan_penugasan", "dummy = 1 AND nilai IS NOT NULL") >= 3);
  assert.equal(await U.n("relawan_jam", "dummy = 1 AND menit != min(960, round((keluar - masuk) / 60000.0))  AND keluar IS NOT NULL"), 0, "menit lahir dari check-in/out");
  const mou = (await U.adm("GET", "/api/relawan/admin/institusi")).j.institusi.filter(k => k.dummy);
  assert.deepEqual(mou.map(k => k.mou.status).sort(), ["aktif", "habis", "segera_habis"]);
  /* ringkasan admin: tiap angka berisi */
  const a = (await U.api("GET", "/api/relawan/ringkas?dummy=1", undefined, ADMIN)).j;
  assert.ok(a.relawan > asli.relawan && a.siap_tugas > asli.siap_tugas && a.bertugas >= 2 && a.jam_kerja_jam > asli.jam_kerja_jam && a.kampus.length > asli.kampus.length);
  assert.ok(a.per_provinsi.length > 0 && a.per_keahlian.length > 0 && a.kampus.some(k => k.relawan > 0));
  /* ringkasan publik tidak berubah */
  const pub = (await U.api("GET", "/api/relawan/ringkas", undefined, ipBaru())).j, pub2 = (await U.api("GET", "/api/relawan/ringkas?dummy=1", undefined, ipBaru())).j;
  for (const x of [pub, pub2]) { assert.equal(x.relawan, asli.relawan); assert.equal(x.siap_tugas, asli.siap_tugas); assert.equal(x.jam_kerja_jam, asli.jam_kerja_jam); assert.deepEqual(x.kampus.map(k => k.nama), asli.kampus.map(k => k.nama)); assert.ok(!x.kampus.some(k => /Contoh/.test(k.nama))); }
  /* tiap daftar admin berisi */
  assert.ok((await U.adm("GET", "/api/relawan/admin/relawan")).j.relawan.filter(r => r.dummy).length >= 9);
  assert.ok((await U.adm("GET", "/api/relawan/admin/permintaan")).j.permintaan.filter(p => p.dummy && p.ditugaskan > 0).length >= 2);
  assert.ok((await U.adm("GET", "/api/relawan/admin/penugasan")).j.penugasan.filter(p => p.dummy && p.jam_sah_menit > 0).length >= 2);
  assert.ok((await U.adm("GET", "/api/relawan/admin/pelatihan")).j.pelatihan.some(p => p.dummy && p.kedaluwarsa));
  const buka = (await U.adm("GET", "/api/relawan/admin/permintaan")).j.permintaan.find(p => p.dummy && p.status === "buka");
  const kand = (await U.adm("GET", `/api/relawan/admin/permintaan/${buka.id}`)).j.kandidat;
  assert.ok(kand.length >= 1 && kand.every(k => /Contoh/.test(k.nama)), "pencocokan dummy hanya memakai relawan dummy");
  const asliP = (await U.adm("GET", `/api/relawan/admin/permintaan/${P}`)).j.kandidat;
  assert.ok(asliP.every(k => !/Contoh/.test(k.nama)), "pencocokan asli tidak memakai relawan dummy");
  assert.equal((await U.adm("POST", `/api/relawan/admin/permintaan/${P}`, {aksi: "tugaskan", relawan_id: (await U.DB.prepare("SELECT id FROM relawan WHERE dummy = 1 AND status = 'siap_tugas'").first()).id})).s, 404, "relawan dummy tidak bisa ditugaskan ke permintaan asli");
  assert.equal((await daftar({nama: "Daftar ke Dummy", jalur: "kampus", kampus_id: (await U.DB.prepare("SELECT id FROM institusi WHERE dummy = 1 LIMIT 1").first()).id})).s, 404, "pendaftar publik tidak bisa masuk kampus dummy");
});

uji("dummy hapus: bersih, data asli tidak tersentuh, bisa isi lagi", async () => {
  const r = await U.adm("POST", "/api/relawan/dummy", {aksi: "hapus"});
  assert.equal(r.s, 200); assert.ok(r.j.relawan >= 9 && r.j.kampus >= 3 && r.j.jam >= 8);
  for (const t of ["institusi", "institusi_perjanjian", "relawan", "relawan_permintaan", "relawan_penugasan", "relawan_jam", "relawan_pelatihan"]) {
    assert.equal(await U.n(t, "dummy = 1"), 0, `${t} masih punya dummy`);
    assert.equal(await U.n(t, "dummy = 0"), sebelum[t], `${t}: data asli berubah`);
  }
  assert.equal((await U.adm("POST", "/api/relawan/dummy", {aksi: "hapus"})).j.relawan, 0);
  assert.equal((await U.adm("POST", "/api/relawan/dummy", {aksi: "isi"})).s, 201);
  assert.equal((await U.adm("POST", "/api/relawan/dummy", {aksi: "hapus"})).s, 200);
});

/* ---------------- halaman + CSP ---------------- */
uji("GET /relawan, /relawan/saya, /kampus, /admin/relawan: 200 dengan CSP, tanpa skrip/gaya inline dan on*=", async () => {
  const hal = [["/relawan", {}, false], ["/relawan/saya", {}, true], ["/kampus", {}, true], ["/admin/relawan", ADMIN, true]];
  for (const [j, h, pribadi] of hal) {
    const r = await U.api("GET", j, undefined, {...h, ...ipBaru()});
    assert.equal(r.s, 200, j); assert.match(r.h.get("content-type"), /text\/html/);
    assert.match(r.h.get("content-security-policy") || "", /script-src 'self'/, `${j} tanpa CSP`);
    assert.ok(!/unsafe-inline/.test(r.h.get("content-security-policy")), `${j} CSP longgar`);
    assert.ok(!/<script(?![^>]*\bsrc=)[^>]*>/i.test(r.t), `${j}: skrip inline`);
    assert.ok(!/\son[a-z]+\s*=/i.test(r.t), `${j}: on*=`); assert.ok(!/\sstyle\s*=/i.test(r.t), `${j}: atribut style`); assert.ok(!/<style/i.test(r.t), `${j}: <style>`);
    if (pribadi && j !== "/admin/relawan") { assert.equal(r.h.get("cache-control"), "no-store"); assert.match(r.h.get("x-robots-tag") || "", /noindex/); assert.equal(r.h.get("referrer-policy"), "no-referrer"); }
  }
  assert.equal((await U.api("GET", "/relawan", undefined, ipBaru())).h.get("x-robots-tag"), null, "pendaftaran publik boleh diindeks");
  for (const berkas of ["/bnpb/relawan.js", "/bnpb/relawan.css", "/bnpb/relawan-saya.js", "/bnpb/kampus.js", "/admin/relawan.js", "/admin/relawan.css", "/admin/institusi.js", "/admin/institusi.css"]) assert.equal((await U.api("GET", berkas, undefined, ipBaru())).s, 200, berkas);
  const js = ["public/bnpb/relawan.js", "public/bnpb/relawan-saya.js", "public/bnpb/kampus.js", "public/admin/relawan.js", "public/admin/institusi.js", "public/admin/riset.js"].map(f => readFileSync(path.join(AKAR, f), "utf8")).join("\n");
  assert.ok(!/—/.test(js), "em dash di teks layar"); assert.ok(!/\.style\.|style=/.test(js.replace(/\.style\.display/g, "")), "gaya inline lewat JS/atribut");
});

uji("tabel relawan belum dimigrasi: rute membalas 503 yang jelas, bukan 500", async () => {
  await U.DB.prepare("ALTER TABLE relawan_jam RENAME TO relawan_jam_x").run();
  try {
    const r = await U.api("GET", "/api/relawan/ringkas", undefined, ipBaru());
    assert.equal(r.s, 503); assert.match(r.j.galat, /migrasi 0022\/0023/);
    assert.equal((await U.adm("GET", "/api/relawan/admin/penugasan")).s, 503);
  } finally { await U.DB.prepare("ALTER TABLE relawan_jam_x RENAME TO relawan_jam").run(); }
  assert.equal((await U.api("GET", "/api/relawan/ringkas", undefined, ipBaru())).s, 200);
});

uji("Turnstile aktif: pendaftaran tanpa token 403, halaman /relawan mengizinkan widget Cloudflare, halaman lain tidak", async () => {
  const T = await siapkan("uji-relawan-ts", {ikat: {TURNSTILE_SITEKEY: "1x00000000000000000000AA", TURNSTILE_SECRET: "rahasia-ts"}});
  const r = await T.api("POST", "/api/relawan/daftar", form(), ipBaru());
  assert.equal(r.s, 403); assert.match(r.j.galat, /Turnstile/);
  assert.equal(await T.n("relawan"), 0);
  const h = await T.api("GET", "/relawan", undefined, ipBaru());
  assert.match(h.h.get("content-security-policy"), /script-src 'self' https:\/\/challenges\.cloudflare\.com/); assert.match(h.h.get("content-security-policy"), /frame-src https:\/\/challenges\.cloudflare\.com/);
  assert.ok(!/challenges/.test((await T.api("GET", "/relawan/saya", undefined, ipBaru())).h.get("content-security-policy")), "halaman berkode tidak dilonggarkan");
  assert.equal((await T.api("GET", "/api/relawan/ringkas", undefined, ipBaru())).j.konfig.turnstile, "1x00000000000000000000AA");
});

/* ---------------------------------------------------------------- perbaikan ulasan */
uji("perbaikan ulasan: cabut diri mengosongkan semua kuasi-identifier (relawan, jam lat/lon, penugasan polis/catatan/oleh); D1 menjamin lewat CHECK", async () => {
  const kp = await U.adm("POST", "/api/relawan/admin/institusi", mouBody({nama: "Kampus Anonim Uji", singkatan: "KAU", no_mou: "MoU/ANON/1"})); assert.equal(kp.s, 201, kp.t);
  const b = await buatSiap(form({nama: "Anonim Penuh", jalur: "kampus", kampus_id: kp.j.id, organisasi: "Org X", keahlian: ["medis", "sar"], luar_provinsi: true, hari_per_minggu: 5, maks_hari: 90}));
  await U.DB.prepare("UPDATE relawan SET oleh = 'admin-x', alasan = 'catatan' WHERE id = ?").bind(b.id).run();
  await U.DB.prepare("INSERT INTO relawan_pelatihan (id, relawan_id, nama, tgl, dibuat) VALUES (?, ?, 'Latihan', '2026-01-01', 1)").bind(id16(), b.id).run();
  const t = await U.adm("POST", `/api/relawan/admin/permintaan/${P}`, {aksi: "tugaskan", relawan_id: b.id}); assert.equal(t.s, 201, t.t);
  await U.adm("POST", `/api/relawan/admin/penugasan/${t.j.id}`, {aksi: "asuransi", asuransi: "aktif", polis: "POLIS-RAHASIA"});
  await U.DB.prepare("UPDATE relawan_penugasan SET status = 'diterima', nilai_catatan = 'catatan nilai', oleh = 'admin-x' WHERE id = ?").bind(t.j.id).run();
  assert.equal((await U.api("POST", `/api/relawan/saya/penugasan/${t.j.id}`, {aksi: "masuk", lat: -2.2, lon: 114.0}, K(b.kode))).s, 200);
  assert.equal((await U.api("POST", `/api/relawan/saya/penugasan/${t.j.id}`, {aksi: "keluar"}, K(b.kode))).s, 200);
  await U.DB.prepare("UPDATE relawan_jam SET oleh = 'kampus:abc' WHERE relawan_id = ?").bind(b.id).run();
  assert.equal((await U.api("POST", "/api/relawan/saya", {aksi: "cabut", konfirmasi: "HAPUS"}, K(b.kode))).s, 200);
  const r = await U.DB.prepare("SELECT * FROM relawan WHERE id = ?").bind(b.id).first();
  for (const k of ["wa", "email", "organisasi", "sertifikat", "gol_darah", "darurat_nama", "darurat_wa", "kode_sha", "alasan", "kampus_id", "oleh", "diverifikasi", "wa_sha", "email_sha"]) assert.equal(r[k], null, k);
  assert.deepEqual([r.nama, r.kab, r.keahlian, r.hari_per_minggu, r.maks_hari, r.luar_provinsi, r.anonim, r.prov], ["(dihapus)", "(dihapus)", "[]", 1, 1, 0, 1, "62"]);
  const j = await U.DB.prepare("SELECT lat, lon, oleh, menit, sah FROM relawan_jam WHERE relawan_id = ?").bind(b.id).first();
  assert.deepEqual([j.lat, j.lon, j.oleh], [null, null, null]); assert.ok(j.menit != null, "jam tetap sebagai angka");
  const g = await U.DB.prepare("SELECT polis, nilai_catatan, oleh FROM relawan_penugasan WHERE id = ?").bind(t.j.id).first();
  assert.deepEqual([g.polis, g.nilai_catatan, g.oleh], [null, null, null]);
  assert.equal(await U.n("relawan_pelatihan", `relawan_id = '${b.id}'`), 0);
  /* CHECK di D1: baris anonim tidak boleh menyimpan kuasi-identifier */
  const dasar = {id: id16(), nama: "(dihapus)", kab: "(dihapus)", prov: "62", jalur: "umum", hari_per_minggu: 1, maks_hari: 1, luar_provinsi: 0, setuju_pdp: 1, anonim: 1, dibuat: 1, diubah: 1};
  await sisip("relawan", dasar); await U.DB.prepare("DELETE FROM relawan WHERE id = ?").bind(dasar.id).run();
  for (const [k, v] of Object.entries({organisasi: "Org", sertifikat: "s", gol_darah: "A+", alasan: "a", kampus_id: kp.j.id, oleh: "x", diverifikasi: 1, nama: "Budi", kab: "Kota", keahlian: '["medis"]', hari_per_minggu: 3, maks_hari: 9, luar_provinsi: 1, wa_sha: "a".repeat(64), email_sha: "b".repeat(64)}))
    await assert.rejects(sisip("relawan", {...dasar, id: id16(), [k]: v}), /CHECK/i, `anonim menyimpan ${k}`);
  await sisip("relawan", {...dasar, id: id16(), status: "daftar_hitam", wa_sha: "a".repeat(64)});   // hanya daftar_hitam boleh menyimpan hash
});

uji("perbaikan ulasan: aksi jam 'constructor'/'__proto__' ditolak 400, bukan 500 (kampus dan admin)", async () => {
  const kp = await U.adm("POST", "/api/relawan/admin/institusi", mouBody({nama: "Kampus Proto Uji", singkatan: "KPU", no_mou: "MoU/PROTO/1"}));
  const id = id16();
  for (const aksi of ["constructor", "__proto__", "toString", "hasOwnProperty", 1, null, ["sah"]]) {
    const k = await U.api("POST", `/api/relawan/kampus/jam/${id}`, {aksi}, K(kp.j.kode)); assert.equal(k.s, 400, `kampus ${String(aksi)} -> ${k.s} ${k.t}`);
    const a = await U.api("POST", `/api/relawan/admin/jam/${id}`, {aksi}, ADMIN); assert.equal(a.s, 400, `admin ${String(aksi)} -> ${a.s} ${a.t}`);
  }
  assert.equal((await U.api("POST", `/api/relawan/kampus/jam/${id}`, {aksi: "sah"}, K(kp.j.kode))).s, 404, "aksi sah tetap jalan sampai pencarian sesi");
});

uji("perbaikan ulasan: laju IP dihitung sebelum Turnstile (IP yang sudah di batas tidak memanggil Turnstile lagi)", async () => {
  const T = await siapkan("uji-relawan-ts2", {ikat: {TURNSTILE_SITEKEY: "1x00000000000000000000AA", TURNSTILE_SECRET: "rahasia-ts"}});
  const ip = {"cf-connecting-ip": "10.88.0.1"};
  for (let i = 0; i < 3; i++) assert.equal((await T.api("POST", "/api/relawan/daftar", form(), ip)).s, 403, "dalam batas: Turnstile menolak");
  const r = await T.api("POST", "/api/relawan/daftar", form(), ip);
  assert.equal(r.s, 429, "lewat batas: 429 sebelum Turnstile (bukan 403)");
});

uji("perbaikan ulasan: POST ber-kode dibatasi laju per pemegang kode (relawan 60/jam, koordinator 600/jam)", async () => {
  const b = await buatSiap(form({nama: "Laju Kode"}));
  const kp = await U.adm("POST", "/api/relawan/admin/institusi", mouBody({nama: "Kampus Laju Kode", singkatan: "KLK", no_mou: "MoU/LAJU/1"}));
  const kini = Date.now();
  await U.DB.batch([...Array(60)].map(() => U.DB.prepare("INSERT INTO laju_bnpb (kunci, aksi, waktu) VALUES (?, 'relawan.ubah', ?)").bind(b.id, kini)));
  const r = await U.api("POST", "/api/relawan/saya", {aksi: "istirahat"}, K(b.kode)); assert.equal(r.s, 429, r.t);
  assert.equal((await U.api("POST", `/api/relawan/saya/penugasan/${id16()}`, {aksi: "terima"}, K(b.kode))).s, 404, "aksi lain (relawan.penugasan) punya hitungan sendiri");
  await U.DB.batch([...Array(60)].map(() => U.DB.prepare("INSERT INTO laju_bnpb (kunci, aksi, waktu) VALUES (?, 'relawan.penugasan', ?)").bind(b.id, kini)));
  assert.equal((await U.api("POST", `/api/relawan/saya/penugasan/${id16()}`, {aksi: "terima"}, K(b.kode))).s, 429);
  for (const [aksi, j] of [["relawan.putus_relawan", `/api/relawan/kampus/relawan/${id16()}`], ["relawan.putus_jam", `/api/relawan/kampus/jam/${id16()}`]]) {
    assert.notEqual((await U.api("POST", j, {aksi: "verifikasi"}, K(kp.j.kode))).s, 429);
    await U.DB.batch([...Array(600)].map(() => U.DB.prepare("INSERT INTO laju_bnpb (kunci, aksi, waktu) VALUES (?, ?, ?)").bind(kp.j.id, aksi, kini)));
    assert.equal((await U.api("POST", j, {aksi: "sah"}, K(kp.j.kode))).s, 429, aksi);
  }
});

uji("perbaikan ulasan: duplikat dijawab pesan generik dan dibatasi 3 per hari per hash WA dan per hash email walau IP berganti, tanpa WA mentah di laju_bnpb", async () => {
  const a = unik(); assert.equal((await daftar({...a, nama: "Oracle Asli"})).s, 201);
  const gen = [];
  for (let i = 0; i < 2; i++) gen.push(await daftar({...unik(), wa: a.wa, nama: "Oracle WA " + i}));   // WA sama, email lain
  const em = await daftar({...unik(), email: a.email, nama: "Oracle Email"});
  assert.ok([...gen, em].every(r => r.s === 409), "semua duplikat 409");
  const pesanDup = new Set([...gen, em].map(r => r.j.galat));
  assert.equal(pesanDup.size, 1, "pesan sama untuk WA bentrok dan email bentrok");
  assert.doesNotMatch([...pesanDup][0], /whatsapp|email|nomor/i);
  /* percobaan ke-4 pada WA yang sama dari IP baru = 429 (bukan 409) */
  const ke4 = await daftar({...unik(), wa: a.wa, nama: "Oracle WA 4"}); assert.equal(ke4.s, 429, ke4.t);
  assert.equal((await daftar({...unik(), email: a.email, nama: "Oracle Email 3"})).s, 409);   // ke-3 untuk email ini: masih dijawab
  const em4 = await daftar({...unik(), email: a.email, nama: "Oracle Email 4"}); assert.equal(em4.s, 429, em4.t);
  const kunci = (await U.DB.prepare("SELECT kunci FROM laju_bnpb WHERE aksi = 'relawan.daftar_kontak'").all()).results.map(r => r.kunci);
  assert.ok(kunci.length >= 2 && kunci.every(k => /^[0-9a-f]{32}$/.test(k)), "kunci = 32 hex hash");
  assert.ok(!kunci.some(k => k.includes(a.wa) || k.includes(a.email)), "WA/email mentah tidak disimpan di laju");
  assert.ok(!kunci.includes(sha256(a.wa).slice(0, 32)), "hash bergaram, bukan sha polos");
});

uji("perbaikan ulasan: kode relawan dan koordinator di sessionStorage (bukan localStorage) dengan tombol Keluar", async () => {
  for (const f of ["relawan-saya.js", "kampus.js"]) {
    const js = readFileSync(path.join(AKAR, "public/bnpb", f), "utf8");
    assert.ok(!/localStorage\.(set|get)Item/.test(js), `${f} tidak menyimpan kode di localStorage`);
    assert.match(js, /sessionStorage\.setItem\(K/); assert.match(js, /data-keluar/); assert.match(js, /sessionStorage\.removeItem\(K\)/);
  }
  assert.match(readFileSync(path.join(AKAR, "public/bnpb/relawan-saya.js"), "utf8"), /tanpa identitas/, "teks hapus jujur: jam kerja tersisa sebagai angka tanpa identitas");
});

uji("perbaikan ulasan: bersihkanRelawan menganonimkan ditolak/nonaktif > 180 hari, daftar_hitam diminimalkan ke hash dan tetap menolak pendaftaran ulang", async () => {
  const kini = Date.now(), lama = kini - 181 * HARI, baru = kini - 10 * HARI;
  const mk = async (nama, status, diubah) => { const r = await daftar({nama}); assert.equal(r.s, 201, r.t); const id = await idRelawan(nama);
    await U.DB.prepare("UPDATE relawan SET status = ?, diubah = ? WHERE id = ?").bind(status, diubah, id).run(); return id; };
  const [tolakLama, nonLama, tolakBaru, hitamLama, hitamBaru, aktifLama] = [await mk("Ret Tolak Lama", "ditolak", lama), await mk("Ret Non Lama", "nonaktif", lama), await mk("Ret Tolak Baru", "ditolak", baru),
    await mk("Ret Hitam Lama", "daftar_hitam", lama), await mk("Ret Hitam Baru", "daftar_hitam", baru), await mk("Ret Aktif Lama", "siap_tugas", lama)];
  const hitam = await U.DB.prepare("SELECT wa FROM relawan WHERE id = ?").bind(hitamLama).first();
  const n = await R.bersihkanRelawan({DB: U.DB}, kini); assert.equal(n, 3);
  const ambil = id => U.DB.prepare("SELECT * FROM relawan WHERE id = ?").bind(id).first();
  for (const id of [tolakLama, nonLama]) { const r = await ambil(id); assert.equal(r.anonim, 1); assert.equal(r.nama, "(dihapus)"); assert.equal(r.status, "nonaktif"); assert.deepEqual([r.wa, r.email, r.wa_sha, r.email_sha, r.kode_sha], [null, null, null, null, null]); }
  const h = await ambil(hitamLama);
  assert.equal(h.anonim, 1); assert.equal(h.status, "daftar_hitam"); assert.equal(h.nama, "(dihapus)"); assert.deepEqual([h.wa, h.email, h.darurat_wa, h.kode_sha], [null, null, null, null]);
  assert.match(h.wa_sha, /^[0-9a-f]{64}$/); assert.match(h.email_sha, /^[0-9a-f]{64}$/);
  for (const id of [tolakBaru, hitamBaru, aktifLama]) assert.equal((await ambil(id)).anonim, 0, "belum waktunya / bukan sasaran");
  assert.equal(await R.bersihkanRelawan({DB: U.DB}, kini), 0, "idempoten");
  /* daftar_hitam yang sudah diminimalkan masih menolak pendaftaran ulang dengan WA yang sama */
  const ulang = await daftar({nama: "Ret Ulang", wa: hitam.wa}); assert.equal(ulang.s, 409, ulang.t);
  assert.equal(await U.n("relawan", "nama = 'Ret Ulang'"), 0);
});

/* ---------------- C3: kapasitas per kabupaten ---------------- */
uji("sempurna: GET /api/relawan/kapasitas agregat per kabupaten cocok dengan hitung manual, tanpa string pribadi, dummy tersembunyi", async () => {
  const kini = Date.now(), PROVK = "61", KABK = "Kab Kapasitas Uji";
  let n = 0;
  const rel = (status, keahlian, o = {}) => { n++; const id = id16(); return sisip("relawan", {id, nama: `Kap Orang ${n}`, wa: `62819${String(n).padStart(7, "0")}`, email: `kap${n}@rahasia-kapasitas.id`, prov: PROVK, kab: KABK, jalur: "umum", status,
    keahlian: JSON.stringify(keahlian), hari_per_minggu: 3, maks_hari: 30, luar_provinsi: 0, setuju_pdp: 1, dibuat: kini, diubah: kini, dummy: 0, ...o}).then(() => id); };
  const r1 = await rel("siap_tugas", ["medis", "sar"]), r2 = await rel("siap_tugas", ["medis", "logistik", "dapur_umum"]), r3 = await rel("bertugas", ["sar", "psikososial"]);
  await rel("terdaftar", ["medis"]); await rel("diverifikasi", ["sar"]);   // belum siap: tidak dihitung
  const r5 = await rel("nonaktif", ["medis"]);                              // tidak dihitung sebagai kapasitas, tetapi jam sahnya tetap
  await rel("siap_tugas", ["gis_data"], {kab: KABK.toLowerCase()});         // huruf kecil = kabupaten yang sama; keahlian di luar lima utama
  await rel("siap_tugas", ["medis"], {dummy: 1, kab: "Kab Kapasitas Dummy"});
  await rel("siap_tugas", ["medis"]); await rel("siap_tugas", ["medis"]);   // kab uji = 5 siap + 1 bertugas = 6 (>= 5 supaya terlihat)
  for (const pv of ["91", "92", "93", "94", "95"]) await rel("siap_tugas", ["medis"], {prov: pv, kab: "Kab Sepi " + pv});   // 5 sel kecil tersembunyi: sisa komplementer >= 5, sel kab uji tidak ikut ditekan
  const pid = id16(), gid = id16();
  await sisip("relawan_permintaan", {id: pid, judul: "Uji kapasitas", bencana: "banjir", prov: PROVK, kab: KABK, butuh: '[{"keahlian":"medis","jumlah":1}]', mulai: geser(-60), selesai: geser(60), dibuat: kini});
  const tugas = {};
  const jam = async (rid, masuk, menit, sah, o = {}) => { const g = tugas[rid] ||= id16(); if (!(await U.DB.prepare("SELECT 1 FROM relawan_penugasan WHERE id = ?").bind(g).first())) await sisip("relawan_penugasan", {id: g, permintaan_id: pid, relawan_id: rid, dibuat: kini, diubah: kini, dummy: o.dummy || 0});
    await sisip("relawan_jam", {id: id16(), relawan_id: rid, penugasan_id: g, masuk: kini - masuk * HARI, keluar: kini - masuk * HARI + menit * 60e3, menit, sah, dummy: 0, ...o}); };
  await jam(r1, 2, 120, 1); await jam(r1, 40, 300, 1);   // yang kedua di luar 30 hari
  await jam(r1, 3, 60, 0); await jam(r1, 4, 90, 2);       // menunggu dan ditolak tidak sah
  await jam(r3, 10, 150, 1); await jam(r5, 1, 60, 1);
  const d = (await U.api("GET", "/api/relawan/kapasitas", undefined, ipBaru())).j;
  assert.deepEqual(Object.keys(d).sort(), ["dibuat", "kab"]); assert.ok(Math.abs(d.dibuat - kini) < 60e3);
  assert.deepEqual(d.kab[`${PROVK}|${KABK}`], {siap: 6, bertugas: null, keahlian: {medis: 4, sar: null, logistik: null, dapur_umum: null, psikososial: null}, jam30: 10},
    "siap = siap+bertugas, bertugas null, keahlian < 3 null, jam30 5,5 jam dibulatkan ke atas ke 10");
  assert.ok(!(`${PROVK}|${KABK.toLowerCase()}` in d.kab), "huruf besar/kecil satu kabupaten");
  assert.ok(!("61|Kab Kapasitas Dummy" in d.kab), "dummy tersembunyi dari publik");
  /* tiap kabupaten: sel tersembunyi seluruhnya null; sel terlihat = hitung manual aktif (siap+bertugas) >= 5 */
  const semua = (await U.DB.prepare("SELECT prov, kab, status FROM relawan WHERE anonim = 0 AND dummy = 0 AND status IN ('siap_tugas', 'bertugas')").all()).results;
  for (const [k, c] of Object.entries(d.kab)) {
    const [pv, kb] = k.split("|"), aktif = semua.filter(x => x.prov === pv && x.kab.trim().toLowerCase() === kb.trim().toLowerCase()).length;
    assert.ok(aktif > 0, `${k}: kab tanpa relawan aktif tidak dimuat`);
    if (c.siap === null) { assert.deepEqual(c, {siap: null, bertugas: null, keahlian: {}, jam30: null}); continue; }
    assert.equal(c.siap, aktif, `${k}: angka endpoint = hitung manual`); assert.ok(c.siap >= 5); assert.equal(c.bertugas, null);
    assert.equal(c.jam30 % 5, 0, "jam30 kelipatan 5");
  }
  /* tanpa data pribadi */
  const pribadi = (await U.DB.prepare("SELECT nama, wa, email, darurat_wa, darurat_nama, id FROM relawan WHERE anonim = 0").all()).results.flatMap(r => Object.values(r)).filter(Boolean);
  const t = JSON.stringify(d);
  assert.ok(pribadi.length > 40); for (const s of pribadi) assert.ok(!t.includes(String(s)), `kapasitas membocorkan ${s}`);
  assert.ok(!/@|rahasia-kapasitas|Kap Orang/.test(t));
  /* publik: tanpa auth; ?dummy=1 tanpa admin = publik; admin ?dummy=1 melihat dummy, tidak lewat cache tepi */
  const pub = await U.api("GET", "/api/relawan/kapasitas", undefined, ipBaru());
  assert.equal(pub.s, 200); assert.match(pub.h.get("cache-control"), /max-age=600/);
  const tanpaAdmin = await U.api("GET", "/api/relawan/kapasitas?dummy=1", undefined, ipBaru());
  assert.ok(!("61|Kab Kapasitas Dummy" in tanpaAdmin.j.kab), "?dummy=1 tanpa admin diabaikan");
  const admin = await U.adm("GET", "/api/relawan/kapasitas?dummy=1");
  assert.equal(admin.j.kab["61|Kab Kapasitas Dummy"].siap, 1, "admin dummy tanpa penekanan"); assert.doesNotMatch(admin.h.get("cache-control") || "", /max-age/);
  assert.equal((await U.api("POST", "/api/relawan/kapasitas", {}, ipBaru())).s >= 400, true, "hanya GET");
});

/* ---------------- C7: institusi tunggal ---------------- */
uji("sempurna: institusi punya beberapa perjanjian; jenis dan kuota divalidasi; tanpa MoU relawan bukan kampus mitra; satu daftar untuk dua tab", async () => {
  const pjMou = (o = {}) => ({jenis_perjanjian: "mou_relawan", nomor: "MoU/SEM/1", mulai: geser(-20), berakhir: geser(400), kuota: 10, ...o});
  const buat = (o = {}, h) => U.api("POST", "/api/relawan/admin/institusi", {nama: "Organisasi Sempurna Uji", singkatan: "OSU", jenis: "organisasi", prov: "13", pic_nama: "PIC Sempurna", ...o}, h || ADMIN);
  /* validasi: jenis institusi, perjanjian rusak, PKS tidak berkuota, MoU wajib berkuota */
  for (const o of [{jenis: "swasta"}, {jenis: 5}, {perjanjian: {}}, {perjanjian: "x"}, {perjanjian: pjMou({jenis_perjanjian: "lain"})}, {perjanjian: pjMou({kuota: undefined})}, {perjanjian: {...pjMou({jenis_perjanjian: "pks_riset"}), kuota: 5}},
    {perjanjian: pjMou({berakhir: geser(-30)})}, {perjanjian: pjMou({nomor: "ab"})}, {prov: ""}, {pic_wa: "12"}]) {
    const r = await buat(o); assert.equal(r.s, 400, `${JSON.stringify(o)} -> ${r.s} ${r.t}`);
  }
  assert.equal(await U.n("institusi", "nama = 'Organisasi Sempurna Uji'"), 0, "penolakan tidak menulis");
  /* institusi tanpa perjanjian dan institusi dengan PKS riset saja: tidak punya kode koordinator, tidak bisa dipilih pendaftar kampus */
  const polos = await buat({nama: "Institusi Polos Uji"}); assert.equal(polos.s, 201); assert.equal(polos.j.kode, undefined);
  const pks = await buat({nama: "Institusi Riset Saja"}); assert.equal(pks.s, 201);
  const tambah = await U.adm("POST", `/api/relawan/admin/institusi/${pks.j.id}`, {aksi: "perjanjian", ...pjMou({jenis_perjanjian: "pks_riset", nomor: "PKS/SEM/1", kuota: undefined})}); assert.equal(tambah.s, 201, tambah.t);
  const d = await daftar({nama: "Mhs Riset Saja", jalur: "kampus", kampus_id: pks.j.id}); assert.equal(d.s, 404, "PKS riset bukan MoU relawan");
  assert.equal((await U.api("GET", "/api/relawan/ringkas", undefined, ipBaru())).j.kampus.some(k => k.id === pks.j.id), false);
  /* beberapa perjanjian di satu institusi; terpilih = yang berlaku; nomor ganda per jenis 409; ubah milik institusi lain 404 */
  const o1 = await buat({perjanjian: pjMou()}); assert.equal(o1.s, 201, o1.t); assert.match(o1.j.kode, /^[0-9a-f]{26}$/);
  const lama = await U.adm("POST", `/api/relawan/admin/institusi/${o1.j.id}`, {aksi: "perjanjian", ...pjMou({nomor: "MoU/SEM/LAMA", mulai: geser(-900), berakhir: geser(-500), kuota: 99})}); assert.equal(lama.s, 201, lama.t);
  assert.equal((await U.adm("POST", `/api/relawan/admin/institusi/${o1.j.id}`, {aksi: "perjanjian", ...pjMou({nomor: "MoU/SEM/LAMA"})})).s, 409, "nomor ganda pada jenis sama");
  const hit = await daftar({nama: "Mhs Org Sempurna", jalur: "kampus", kampus_id: o1.j.id}); assert.equal(hit.s, 201, hit.t);
  const baris = (await U.adm("GET", "/api/relawan/admin/institusi")).j.institusi, ini = baris.find(i => i.id === o1.j.id);
  assert.equal(ini.perjanjian.length, 2); assert.equal(ini.mou.nomor, "MoU/SEM/1", "yang berlaku hari ini dipilih, bukan yang kuotanya besar"); assert.equal(ini.mou.status, "aktif");
  assert.equal(baris.find(i => i.id === pks.j.id).mou, null); assert.equal(baris.find(i => i.id === pks.j.id).pks.nomor, "PKS/SEM/1");
  const pid = ini.perjanjian.find(p => p.nomor === "MoU/SEM/LAMA").id;
  assert.equal((await U.adm("POST", `/api/relawan/admin/institusi/${pks.j.id}`, {aksi: "perjanjian", perjanjian_id: pid, ...pjMou()})).s, 404, "perjanjian milik institusi lain");
  assert.equal((await U.adm("POST", `/api/relawan/admin/institusi/${o1.j.id}`, {aksi: "perjanjian", perjanjian_id: "zzz", ...pjMou()})).s, 400);
  /* kolom Relawan dan Riset ada pada satu daftar */
  for (const k of ["kode_aktif", "terisi", "antre", "mou", "kode_riset", "usulan", "pks", "perjanjian", "pic_email", "jenis"]) assert.ok(k in ini, k);
  assert.equal(ini.terisi, 1); assert.equal(ini.kode_riset, 0);
  /* publik tidak memuat PIC institusi */
  const pub = (await U.api("GET", "/api/relawan/ringkas", undefined, ipBaru())).t;
  assert.ok(!pub.includes("PIC Sempurna") && !pub.includes("MoU/SEM"), "ringkasan publik tanpa PIC dan nomor perjanjian");
});

uji("sempurna: tab Institusi di /admin/relawan dan /admin/riset memakai SATU modul bersama (tanpa salinan), dan modul itu satu-satunya pembaca daftar institusi", async () => {
  const baca = f => readFileSync(path.join(AKAR, f), "utf8"), rel = baca("public/admin/relawan.js"), ris = baca("public/admin/riset.js"), bersama = baca("public/admin/institusi.js"), css = baca("public/admin/institusi.css");
  for (const [nama, js] of [["relawan", rel], ["riset", ris]]) {
    assert.match(js, /import\("\/admin\/institusi\.js/, `${nama}.js memuat modul bersama`);
    assert.ok(!js.includes("/api/relawan/admin/institusi"), `${nama}.js tidak membaca daftar institusi sendiri`);
    assert.ok(!/no_mou|pic_jabatan|kode_aktif/.test(js), `${nama}.js tidak menyalin formulir/tabel institusi`);
  }
  assert.ok(bersama.includes("/api/relawan/admin/institusi") && /export (async )?function pasang/.test(bersama));
  assert.ok(/data-urut/.test(bersama) && /data-hal/.test(bersama), "tabel standar: urut dan berhalaman");
  assert.ok(bersama.includes("Relawan") && bersama.includes("Riset"), "kolom Relawan dan Riset");
  assert.ok(!/—/.test(bersama + css) && !/\.style\.|style=/.test(bersama), "tanpa em dash dan gaya inline");
  assert.ok(/stopPropagation/.test(bersama), "penangan induk (data-*) tidak ikut menangkap klik modul bersama");
});

/* ---------------- keamanan 2: k-anonimitas, waktu klien, MoU mati ---------------- */
uji("keamanan 2: kapasitas dan ringkas menekan sel kecil; selisih total - sel terlihat tidak membuka sel tersembunyi", async () => {
  const kini = Date.now(), PV = "81";
  let n = 0;
  const rel = (kab, status, keahlian) => { n++; const id = id16(); return sisip("relawan", {id, nama: `K2 Orang ${n}`, wa: `62877${String(n).padStart(7, "0")}`, email: `k2o${n}@contoh-k2.id`, prov: PV, kab, jalur: "umum", status,
    keahlian: JSON.stringify(keahlian), hari_per_minggu: 3, maks_hari: 30, luar_provinsi: 0, setuju_pdp: 1, dibuat: kini, diubah: kini, dummy: 0}).then(() => id); };
  const kecil = await rel("K2 Kecil", "siap_tugas", ["medis", "bahasa_isyarat"]), kecil2 = await rel("K2 Kecil", "bertugas", ["medis"]);   // 2 orang: siapa bertugas tidak boleh terbaca
  for (let i = 0; i < 5; i++) await rel("K2 Pas", "siap_tugas", ["logistik"]);                                                                 // 5 = batas, tetapi ikut ditekan sebagai komplemen
  const besar = []; for (let i = 0; i < 6; i++) besar.push(await rel("K2 Besar", i === 0 ? "bertugas" : "siap_tugas", ["medis"]));
  const pid = id16(); await sisip("relawan_permintaan", {id: pid, judul: "Uji k2", bencana: "banjir", prov: PV, kab: "K2 Besar", butuh: '[{"keahlian":"medis","jumlah":1}]', mulai: geser(-60), selesai: geser(60), dibuat: kini});
  for (const [rid, menit] of [[kecil2, 600], [besar[1], 90]]) {
    const g = id16(); await sisip("relawan_penugasan", {id: g, permintaan_id: pid, relawan_id: rid, dibuat: kini, diubah: kini});
    await sisip("relawan_jam", {id: id16(), relawan_id: rid, penugasan_id: g, masuk: kini - 2 * HARI, keluar: kini - 2 * HARI + menit * 60e3, menit, sah: 1, dummy: 0});
  }
  const kap = (await U.api("GET", "/api/relawan/kapasitas", undefined, ipBaru())).j.kab, rin = (await U.api("GET", "/api/relawan/ringkas", undefined, ipBaru())).j;
  const NOL = {siap: null, bertugas: null, keahlian: {}, jam30: null};
  assert.deepEqual(kap[`${PV}|K2 Kecil`], NOL, "kab 2 relawan: tanpa angka, tanpa siap->bertugas, tanpa jam");
  assert.deepEqual(kap[`${PV}|K2 Pas`], NOL, "sel 5 ditekan sebagai komplemen: sisa tersembunyi hanya 2 orang");
  assert.deepEqual(kap[`${PV}|K2 Besar`], {siap: 6, bertugas: null, keahlian: {medis: 6, sar: null, logistik: null, dapur_umum: null, psikososial: null}, jam30: 5}, "6 aktif; jam 1,5 dibulatkan ke atas 5; keahlian kosong null");
  assert.ok(!JSON.stringify(rin).includes("K2 Kecil") && !kap[`${PV}|K2 Kecil`].jam30, "jam 10 jam kab kecil tidak keluar");
  /* keahlian langka (1 orang) tidak keluar di ringkas; di sel kab null */
  assert.ok(!rin.per_keahlian.some(k => k.keahlian === "bahasa_isyarat"), "keahlian dengan 1 orang tidak dirilis");
  assert.equal(rin.per_keahlian.find(k => k.keahlian === "medis").n >= 6, true);
  /* uji pengurangan atas seluruh data: total provinsi dikurangi kab terlihat, dan total keahlian dikurangi sel terlihat, harus 0 atau >= ambang */
  const pv = rin.per_provinsi.find(p => p.prov === PV); assert.ok(pv && pv.n === 13, "provinsi 81 = 13 aktif");
  const nasional = rin.siap_tugas + rin.bertugas;
  for (const p of rin.per_provinsi) {
    const terlihat = Object.entries(kap).filter(([k, c]) => k.startsWith(p.prov + "|") && c.siap !== null).reduce((a, [, c]) => a + c.siap, 0), sisa = p.n - terlihat;
    assert.ok(sisa === 0 || sisa >= 5, `provinsi ${p.prov}: sisa ${sisa} membuka sel tersembunyi`);
    assert.ok(p.n >= 5, "provinsi < 5 tidak dirilis");
  }
  assert.equal(pv.n - 6, 7, "sisa provinsi 81 = Kecil 2 + Pas 5, tidak bisa dipecah");
  const tersembunyi = nasional - rin.per_provinsi.reduce((a, p) => a + p.n, 0); assert.ok(tersembunyi === 0 || tersembunyi >= 5, `sisa nasional ${tersembunyi}`);
  for (const k of ["medis", "sar", "logistik", "dapur_umum", "psikososial"]) {
    const total = rin.per_keahlian.find(x => x.keahlian === k)?.n; if (total == null) continue;
    const terlihat = Object.values(kap).reduce((a, c) => a + (c.keahlian[k] ?? 0), 0), sisa = total - terlihat;
    assert.ok(sisa === 0 || sisa >= 3, `keahlian ${k}: sisa ${sisa}`);
  }
  for (const c of Object.values(kap)) { assert.equal(c.bertugas, null); if (c.jam30 !== null) assert.equal(c.jam30 % 5, 0); }
  /* admin ?dummy=1 tetap melihat angka mentah */
  assert.equal((await U.adm("GET", "/api/relawan/kapasitas?dummy=1")).j.kab[`${PV}|K2 Kecil`].siap, 2);
});

uji("keamanan 2: check-out luring dijepit ke masuk..masuk+16 jam; beda jam klien > 1 jam tampil ke koordinator dan admin", async () => {
  const idA1 = await idRelawan("Mhs A1"), kini = Date.now();
  const pid = id16(), gid = id16(); await sisip("relawan_permintaan", {id: pid, judul: "Uji waktu klien", bencana: "banjir", prov: "62", kab: "Kab", butuh: '[{"keahlian":"medis","jumlah":1}]', mulai: geser(-5), selesai: geser(5), dibuat: kini});
  await sisip("relawan_penugasan", {id: gid, permintaan_id: pid, relawan_id: idA1, status: "diterima", dibuat: kini, diubah: kini});
  await U.DB.prepare("UPDATE relawan SET status = 'ditugaskan' WHERE id = ?").bind(idA1).run();
  const kodeA1 = (await U.adm("POST", `/api/relawan/admin/relawan/${idA1}`, {aksi: "kode_baru"})).j.kode, g = b => U.api("POST", `/api/relawan/saya/penugasan/${gid}`, b, K(kodeA1));
  try {
    const m = await g({aksi: "masuk", klien_id: "k2-masuk-0001", waktu_klien: kini - 3 * JAM}); assert.equal(m.s, 200, m.t);
    await U.DB.prepare("UPDATE relawan_jam SET masuk = ?, keluar = NULL WHERE relawan_id = ? AND keluar IS NULL").bind(kini - 30 * JAM, idA1).run();
    const o = await g({aksi: "keluar", klien_id: "k2-keluar-0001", waktu_klien: kini}); assert.equal(o.s, 200, o.t);
    assert.equal(o.j.menit, 960); assert.equal(o.j.keluar, kini - 30 * JAM + 16 * JAM, "keluar dijepit masuk + 16 jam");
    const j = (await U.api("GET", "/api/relawan/kampus/saya", undefined, K(kA))).j.jam.find(x => x.relawan_id === idA1 && x.menit === 960);
    assert.equal(j.catatan_waktu, "waktu klien berbeda 3 jam"); assert.ok(!("selisih_menit" in j));
    const adm = (await U.adm("GET", "/api/relawan/admin/penugasan")).j.jam.find(x => x.id === j.id); assert.equal(adm.catatan_waktu, "waktu klien berbeda 3 jam");
    assert.equal((await U.adm("GET", `/api/relawan/admin/relawan/${idA1}`)).j.jam.find(x => x.id === j.id).catatan_waktu, "waktu klien berbeda 3 jam");
    const lain = (await U.api("GET", "/api/relawan/kampus/saya", undefined, K(kA))).j.jam.filter(x => x.id !== j.id);
    assert.ok(lain.every(x => x.catatan_waktu === null), "tanpa waktu klien: tanpa catatan");
  } finally { await U.DB.prepare("DELETE FROM relawan_jam WHERE penugasan_id = ?").bind(gid).run(); await U.DB.prepare("DELETE FROM relawan_penugasan WHERE id = ?").bind(gid).run(); await U.DB.prepare("UPDATE relawan SET status = 'diverifikasi' WHERE id = ?").bind(idA1).run(); }
});

uji("keamanan 2: MoU habis atau belum mulai: koordinator tidak bisa menulis (403), baca dan unduh rekap tetap jalan", async () => {
  const k = await U.adm("POST", "/api/relawan/admin/institusi", mouBody({nama: "Universitas Mati Uji", singkatan: "UMT"})); assert.equal(k.s, 201, k.t);
  const kode = k.j.kode, r = await daftar({nama: "Mhs Mati", jalur: "kampus", kampus_id: k.j.id}); assert.equal(r.s, 201, r.t);
  const rid = await idRelawan("Mhs Mati"), jid = id16(), pid = id16(), gid = id16(), kini = Date.now();
  await sisip("relawan_permintaan", {id: pid, judul: "Uji mou mati", bencana: "banjir", prov: "62", kab: "Kab", butuh: '[{"keahlian":"medis","jumlah":1}]', mulai: geser(-5), selesai: geser(5), dibuat: kini});
  await sisip("relawan_penugasan", {id: gid, permintaan_id: pid, relawan_id: rid, status: "bertugas", dibuat: kini, diubah: kini});
  await sisip("relawan_jam", {id: jid, relawan_id: rid, penugasan_id: gid, masuk: kini - 3 * JAM, keluar: kini - JAM, menit: 120});
  const tulis = () => [U.api("POST", `/api/relawan/kampus/relawan/${rid}`, {aksi: "verifikasi"}, K(kode)), U.api("POST", `/api/relawan/kampus/jam/${jid}`, {aksi: "sah"}, K(kode))];
  for (const [mulai, berakhir, status] of [[geser(-400), geser(-1), "habis"], [geser(5), geser(300), "belum"]]) {
    await U.DB.prepare("UPDATE institusi_perjanjian SET mulai = ?, berakhir = ? WHERE institusi_id = ?").bind(mulai, berakhir, k.j.id).run();
    for (const x of await Promise.all(tulis())) { assert.equal(x.s, 403, x.t); assert.match(x.j.galat, /MoU/); }
    assert.equal(await U.n("relawan", `id = '${rid}' AND status = 'terdaftar'`), 1, "tidak ada tulisan"); assert.equal(await U.n("relawan_jam", `id = '${jid}' AND sah = 0`), 1);
    const s = await U.api("GET", "/api/relawan/kampus/saya", undefined, K(kode)); assert.equal(s.s, 200); assert.equal(s.j.kampus.status, status);
    assert.equal((await U.api("GET", "/api/relawan/kampus/csv", undefined, K(kode))).s, 200);
    assert.equal((await U.adm("POST", `/api/relawan/admin/jam/${jid}`, {aksi: "menunggu"})).s, 200, "admin tidak terikat MoU");
  }
  await U.DB.prepare("UPDATE institusi_perjanjian SET mulai = ?, berakhir = ? WHERE institusi_id = ?").bind(geser(-10), geser(200), k.j.id).run();
  const [a, b] = await Promise.all(tulis()); assert.equal(a.s, 200, a.t); assert.equal(b.s, 200, b.t);
});

uji("keamanan 2: jumlah relawan per kampus di ringkas publik ditekan bila < 5 (nama kampus tetap tampil)", async () => {
  const r = await U.api("GET", "/api/relawan/ringkas");
  assert.equal(r.s, 200);
  for (const k of r.j.kampus) assert.ok(k.relawan === null || k.relawan >= 5, `${k.nama}: ${k.relawan}`);
});
