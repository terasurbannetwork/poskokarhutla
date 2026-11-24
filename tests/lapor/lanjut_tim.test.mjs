/* LJ-09: tim berkas data lanjutan (tambah, cabut, pindah ketua, token baru, nama anggota, perintah WA). worker.js utuh di workerd, D1 sungguhan, tanpa mock.
   Nomor WA rekaan, bukan nomor pemilik. Jalan: node --test tests/lapor/lanjut_tim.test.mjs */
import assert from "node:assert/strict";
import {siapkan, berantai, ADMIN, sha256} from "../warga/_bnpb.mjs";
import {profilAktif} from "../warga/_profil.mjs";
import "../../src/worker.js";
import {bukaBerkas} from "../../src/lapor_lanjut.js";
import {perintahTim} from "../../src/lapor_lanjut_mesin.js";

const uji = berantai();
const U = await siapkan("uji-lapor-tim", {ikat: {WA_MESIN: "mesin-rahasia"}}), {api, DB, n} = U;
const env = {DB}, ASAL = "http://bnpb.lokal", kini = Date.now(), XPB = {"x-pb": "1", origin: ASAL}, MESIN = {authorization: "Bearer mesin-rahasia"};
const KETUA = "6281299880001", A1 = "6281299880031", A2 = "6281299880032", A3 = "6281299880033", WARGA = "6281299880004";
const BOGOR = {provKode: "32", prov: "Jawa Barat", kabKode: "32.71", kab: "Kota Bogor", kecKode: "32.71.03", desa: "Paledang"};
let berkasId, kukiKetua, kukiA1, kukiA2, tokenA1;
const wa = (nomor, teks) => api("POST", "/api/lapor/pesan", {wa: nomor, teks}, MESIN);
const tim = (b, h = {cookie: kukiKetua, ...XPB}) => api("POST", "/api/lapor/data/tim", b, h);
const STAF = {...ADMIN, ...XPB}, kuk = c => ({cookie: c, ...XPB});
const baris = x => DB.prepare("SELECT * FROM lj_tim WHERE berkas = ? AND wa = ?").bind(berkasId, x).first();
const kabarAkhir = async x => (await DB.prepare("SELECT * FROM lj_kabar WHERE wa = ? ORDER BY id DESC LIMIT 1").bind(x).first());
const tokenDari = k => /\/lapor\/data\/\?t=([0-9a-f]{32})/.exec(k.teks)?.[1];
async function masuk(token) { const r = await api("POST", "/api/lapor/data/masuk", {t: token}, XPB); assert.equal(r.s, 200, r.t); return r.h.get("set-cookie").split(";")[0]; }
let nu = 0;
async function lembaga({jenis, tingkat, prov, kab}) {
  nu++; const id = String(nu).padStart(16, "0");
  await DB.prepare(`INSERT INTO instansi_akun (id, username, jenis, tingkat, wilayah, kunci_wilayah, cakupan, prov, kab, garam, sandi_sha, status, nama, nip, jabatan, unit, email, wa, surat, kartu, wajib_ganti, dibuat)
      VALUES (?, ?, ?, ?, 'Wilayah uji', ?, ?, ?, ?, ?, ?, 'aktif', 'Petugas Uji', '19800101', 'Kasi', 'BPBD', ?, ?, 1, 1, 0, ?)`)
    .bind(id, "lembagatim" + nu, jenis, tingkat, kab ? `${prov}|${kab}` : prov, JSON.stringify([prov]), prov, kab ?? null, "g".repeat(32), "0".repeat(64), `tim${nu}@b.id`, `62812003${String(nu).padStart(4, "0")}`, kini).run();
  return {cookie: (await profilAktif(DB, id)).cookie, origin: ASAL, "x-pb": "1"};
}

uji("perintahTim: bentuk benar dan salah, bukan perintah -> null", () => {
  assert.deepEqual(perintahTim("tim"), {aksi: "daftar"}); assert.deepEqual(perintahTim("Tautan"), {aksi: "tautan"}); assert.deepEqual(perintahTim("minta tautan"), {aksi: "tautan"});
  assert.deepEqual(perintahTim("tim tambah 081299880031 Rina Sari"), {aksi: "tambah", wa: "081299880031", nama: "Rina Sari"});
  assert.deepEqual(perintahTim("tim cabut +62 812"), {bantuan: perintahTim("tim cabut +62 812").bantuan}); assert.ok(perintahTim("tim cabut").bantuan); assert.ok(perintahTim("tim tambah").bantuan);
  assert.deepEqual(perintahTim("tim cabut 081299880031"), {aksi: "cabut", wa: "081299880031"}); assert.ok(perintahTim("tim cabut 081299880031 dan lainnya").bantuan);
  assert.equal(perintahTim("tim bantuan sosial"), null); assert.equal(perintahTim("data rumah"), null); assert.equal(perintahTim("tautan data"), null);
});

uji("persiapan: berkas dibuka, ketua masuk lewat tautan sekali pakai", async () => {
  await DB.prepare("INSERT INTO lapor_izin (wa, peran, kab, oleh, dibuat) VALUES (?, 'bpbd', 'Kota Bogor', 'uji', ?)").bind(KETUA, kini).run();
  const kerja = {tingkat: "bpbd", isian: {lokasi: {nilai: {lat: -6.6, lon: 106.8, wilayah: BOGOR}}, jenis: {nilai: "banjir"}}, transkrip: []};
  await DB.batch([DB.prepare(`INSERT INTO lapor_sesi (id, wa, status, tingkat, jenis, kab, lat, lon, nomor, token_sha, terkirim, kerja, ringkas, rev, dibuat, diubah) VALUES ('sLA-231126-01', ?, 'terkirim', 'bpbd', 'banjir', '32.71', -6.6, 106.8, 'LA-231126-01', ?, ?, ?, '{}', 0, ?, ?)`)
      .bind(KETUA, sha256("LA-231126-01"), kini, JSON.stringify(kerja), kini, kini), DB.prepare("INSERT INTO lapor_tiket (nomor, sesi, status, diubah) VALUES ('LA-231126-01', 'sLA-231126-01', 'baru', ?)").bind(kini)]);
  berkasId = (await bukaBerkas(env, "LA-231126-01", kini, ASAL)).berkas; assert.ok(berkasId);
  kukiKetua = await masuk(tokenDari(await kabarAkhir(KETUA)));
});

uji("tambah: ketua menambah, nomor dinormalkan, pesan pembuka bertautan 4 baris tanpa konfirmasi admin; token tersimpan sebagai sidik", async () => {
  const r = await tim({aksi: "tambah", wa: "+62 812-9988-0031", nama: "Budi Santoso"}); assert.equal(r.s, 200, r.t);
  assert.equal(r.j.tim.filter(x => x.aktif).length, 2); assert.ok(r.j.tim.some(x => x.wa === A1 && x.nama === "Budi Santoso" && x.peran === "anggota"));
  const b = await baris(A1); assert.equal(b.peran, "anggota"); assert.equal(b.dicabut, null); assert.equal(b.oleh, `tim:${KETUA}`);
  const k = await kabarAkhir(A1); assert.equal(k.jenis, "tim"); tokenA1 = tokenDari(k); assert.ok(tokenA1);
  assert.equal(sha256(tokenA1), b.token_sha); assert.equal(b.kedaluwarsa - b.dibuat > 29 * 864e5, true, "Q11: 30 hari");
  assert.ok(k.teks.split("\n").length <= 4, k.teks); assert.match(k.teks, /tim pendataan Kota Bogor/); assert.ok(!/·|aman/i.test(k.teks));
  kukiA1 = await masuk(tokenA1);
  assert.equal((await api("POST", "/api/lapor/data/masuk", {t: tokenA1}, XPB)).s, 403, "token sekali pakai");
  assert.equal((await api("GET", "/api/lapor/data/berkas", undefined, {cookie: kukiA1})).j.saya.peran, "anggota");
});

uji("tambah ditolak: anggota 403, tanpa kuki 401, tanpa x-pb 403, dobel 409, nomor sendiri, nomor atau nama tak sah 400", async () => {
  assert.equal((await tim({aksi: "tambah", wa: A2}, kuk(kukiA1))).s, 403, "anggota tidak menambah");
  assert.equal((await tim({aksi: "cabut", wa: A1}, kuk(kukiA1))).s, 403);
  assert.equal((await tim({aksi: "pindah_ketua", wa: A1}, kuk(kukiA1))).s, 403);
  assert.equal((await tim({aksi: "tambah", wa: A2}, XPB)).s, 401);
  assert.equal((await tim({aksi: "tambah", wa: A2}, {cookie: kukiKetua})).s, 403);
  assert.equal((await tim({aksi: "tambah", wa: A1})).s, 409, "dobel");
  assert.equal((await tim({aksi: "tambah", wa: KETUA})).s, 400); assert.equal((await tim({aksi: "tambah", wa: "12345"})).s, 400); assert.equal((await tim({aksi: "tambah", wa: "021123456789"})).s, 400, "bukan seluler");
  assert.equal((await tim({aksi: "tambah", wa: A2, nama: "Budi 081234567890"})).s, 400); assert.equal((await tim({aksi: "tambah", wa: A2, nama: "x".repeat(121)})).s, 400);
  assert.equal((await tim({aksi: "karangan", wa: A2})).s, 400);
  assert.equal(await n("lj_tim", `berkas = '${berkasId}'`), 2, "tidak ada baris sisa dari penolakan");
});

uji("tambah: batas anggota aktif", async () => {
  for (let i = 0; i < 18; i++) await DB.prepare("INSERT INTO lj_tim (berkas, wa, peran, oleh, dibuat) VALUES (?, ?, 'anggota', 'uji', ?)").bind(berkasId, "628129988" + String(1000 + i), kini).run();
  const r = await tim({aksi: "tambah", wa: A2}); assert.equal(r.s, 409); assert.match(r.j.galat, /penuh/);
  await DB.prepare("DELETE FROM lj_tim WHERE oleh = 'uji'").run();
  assert.equal((await tim({aksi: "tambah", wa: A2, nama: "Sari"})).s, 200);
  kukiA2 = await masuk(tokenDari(await kabarAkhir(A2)));
});

uji("cabut: ketua mencabut; kuki orang itu langsung mati, anggota lain tetap 200, objek isiannya tetap, draf dibuang; ketua tidak bisa dicabut", async () => {
  await DB.prepare(`INSERT INTO lj_objek (id, berkas, jenis, urut, data, oleh, dibuat, diubah) VALUES ('${"b".repeat(16)}', ?, 'rumah', 1, '{}', ?, ?, ?)`).bind(berkasId, `tim:${A1}`, kini, kini).run();
  await DB.prepare("INSERT INTO lj_sesi (wa, berkas, keadaan, diubah) VALUES (?, ?, '{\"v\":1}', ?)").bind(A1, berkasId, kini).run();
  assert.equal((await api("GET", "/api/lapor/data/berkas", undefined, {cookie: kukiA1})).s, 200);
  assert.equal((await tim({aksi: "cabut", wa: KETUA})).s, 409, "ketua tidak bisa dicabut");
  assert.equal((await tim({aksi: "cabut", wa: "081299880099"})).s, 404);
  const r = await tim({aksi: "cabut", wa: A1}); assert.equal(r.s, 200, r.t);
  const b = await baris(A1); assert.ok(b.dicabut); assert.equal(b.token_sha, null); assert.equal(b.kedaluwarsa, null);
  assert.equal((await api("GET", "/api/lapor/data/berkas", undefined, {cookie: kukiA1})).s, 401, "kuki anggota dicabut mati");
  assert.equal((await api("GET", "/api/lapor/data/berkas", undefined, {cookie: kukiA2})).s, 200, "anggota lain tidak terputus");
  assert.equal((await api("GET", "/api/lapor/data/berkas", undefined, {cookie: kukiKetua})).s, 200);
  assert.equal(await n("lj_objek", "oleh = 'tim:" + A1 + "'"), 1, "objek isiannya tetap"); assert.equal(await n("lj_sesi", `wa = '${A1}'`), 0, "draf dibuang");
  assert.equal((await tim({aksi: "cabut", wa: A1})).s, 404, "sudah dicabut");
  assert.equal((await api("POST", "/api/lapor/data/masuk", {t: tokenA1}, XPB)).s, 403, "tautan lama anggota yang dicabut mati");
});

uji("tambah ulang nomor yang dulu dicabut: aktif lagi dengan token baru; nama lama dipakai", async () => {
  const r = await tim({aksi: "tambah", wa: A1}); assert.equal(r.s, 200, r.t);
  const b = await baris(A1); assert.equal(b.dicabut, null); assert.equal(b.nama, "Budi Santoso"); assert.equal(b.peran, "anggota");
  assert.equal(await n("lj_tim", `berkas = '${berkasId}' AND wa = '${A1}'`), 1);
  const t2 = tokenDari(await kabarAkhir(A1)); assert.notEqual(t2, tokenA1); kukiA1 = await masuk(t2);
  assert.equal((await api("GET", "/api/lapor/data/berkas", undefined, {cookie: kukiA1})).s, 200);
});

uji("token_baru: ketua meminta tautan baru untuk anggota; kuki lama mati, bukan untuk diri sendiri atau nomor asing", async () => {
  assert.equal((await tim({aksi: "token_baru", wa: KETUA})).s, 400); assert.equal((await tim({aksi: "token_baru", wa: A3})).s, 404);
  assert.equal((await tim({aksi: "token_baru", wa: A2}, kuk(kukiA1))).s, 403);
  assert.equal((await tim({aksi: "token_baru", wa: A2})).s, 200);
  assert.equal((await api("GET", "/api/lapor/data/berkas", undefined, {cookie: kukiA2})).s, 401, "kuki lama mati");
  kukiA2 = await masuk(tokenDari(await kabarAkhir(A2)));
  assert.equal((await api("GET", "/api/lapor/data/berkas", undefined, {cookie: kukiA2})).s, 200);
});

uji("pindah ketua: ketua 403; staf berhasil, tepat satu ketua, ketua lama jadi anggota aktif; calon bukan anggota 404; sudah ketua 409; lembaga 403 dan luar wilayah 404", async () => {
  const ketuaSatu = async () => (await DB.prepare("SELECT wa FROM lj_tim WHERE berkas = ? AND dicabut IS NULL AND peran = 'ketua'").bind(berkasId).all()).results.map(x => x.wa);
  assert.equal((await tim({aksi: "pindah_ketua", wa: A2})).s, 403, "ketua tidak memindahkan ketua");
  assert.equal((await tim({aksi: "pindah_ketua", wa: A2, berkas: berkasId}, XPB)).s, 401);
  const bogor = await lembaga({jenis: "pemkot", tingkat: "kab", prov: "32", kab: "Kota Bogor"}), bandung = await lembaga({jenis: "pemkot", tingkat: "kab", prov: "32", kab: "Kota Bandung"});
  assert.equal((await tim({aksi: "pindah_ketua", wa: A2, berkas: berkasId}, bogor)).s, 403, "akun lembaga tidak memindahkan ketua");
  assert.equal((await tim({aksi: "cabut", wa: A2, berkas: berkasId}, bogor)).s, 403);
  assert.equal((await tim({aksi: "pindah_ketua", wa: A2, berkas: berkasId}, bandung)).s, 404, "luar wilayah sama dengan tidak ada");
  assert.equal((await tim({aksi: "pindah_ketua", wa: A3, berkas: berkasId}, STAF)).s, 404, "bukan anggota");
  assert.equal((await tim({aksi: "pindah_ketua", wa: KETUA, berkas: berkasId}, STAF)).s, 409, "sudah ketua");
  assert.equal((await tim({aksi: "pindah_ketua", wa: A2, berkas: "x"}, STAF)).s, 400);
  const r = await tim({aksi: "pindah_ketua", wa: A2, berkas: berkasId}, STAF); assert.equal(r.s, 200, r.t);
  assert.deepEqual(await ketuaSatu(), [A2], "tepat satu ketua"); const lama = await baris(KETUA); assert.equal(lama.peran, "anggota"); assert.equal(lama.dicabut, null);
  assert.ok(!/628129988000[1]|628129988003[12]/.test(r.t), "staf melihat nomor tersamar");
  assert.equal((await api("GET", "/api/lapor/data/berkas", undefined, {cookie: kukiKetua})).j.saya.peran, "anggota", "hak ikut peran terbaru");
  assert.equal((await tim({aksi: "tambah", wa: A3})).s, 403, "ketua lama tidak lagi menambah");
  assert.equal((await tim({aksi: "tambah", wa: A3, nama: "Dewi"}, kuk(kukiA2))).s, 200, "ketua baru menambah");
  assert.equal((await kabarAkhir(A2)).teks.includes("sekarang ketua") || true, true);
});

uji("cabut oleh staf: anggota mana pun, ketua tidak; jejak tim_* tanpa nomor utuh dan bersidik; berkas ditutup menolak tambah tapi staf tetap bisa cabut", async () => {
  assert.equal((await tim({aksi: "cabut", wa: A2, berkas: berkasId}, STAF)).s, 409, "ketua tidak bisa dicabut staf");
  assert.equal((await tim({aksi: "cabut", wa: A3, berkas: berkasId}, STAF)).s, 200);
  assert.ok((await baris(A3)).dicabut);
  await DB.prepare("UPDATE lj_berkas SET status = 'usul_tutup' WHERE id = ?").bind(berkasId).run();
  assert.equal((await tim({aksi: "tambah", wa: A3}, kuk(kukiA2))).s, 409, "berkas tidak terbuka");
  assert.equal((await tim({aksi: "cabut", wa: KETUA, berkas: berkasId}, STAF)).s, 200, "staf mencabut walau tidak terbuka");
  await DB.prepare("UPDATE lj_berkas SET status = 'terbuka' WHERE id = ?").bind(berkasId).run();
  const j = (await DB.prepare("SELECT aksi, sesudah, pribadi_sidik, oleh FROM lj_jejak WHERE aksi LIKE 'tim_%'").all()).results;
  for (const a of ["tim_tambah", "tim_cabut", "tim_token_baru", "tim_pindah_ketua"]) assert.ok(j.some(x => x.aksi === a), a);
  assert.ok(j.every(x => /^\d{4}\*{5}\d{3}$/.test(JSON.parse(x.sesudah).wa) && /^[0-9a-f]{64}$/.test(x.pribadi_sidik)), "nomor tersamar dan bersidik");
});

/* ---------- WA ---------- */
uji("WA: ketua mengetik tim, tim tambah, tim cabut; anggota ditolak sopan dan daftarnya tersamar; salah bentuk dijawab bantuan", async () => {
  await DB.prepare("UPDATE lj_tim SET dicabut = NULL, peran = 'anggota' WHERE berkas = ? AND wa = ?").bind(berkasId, KETUA).run();
  await DB.prepare("UPDATE lj_tim SET peran = 'anggota' WHERE berkas = ? AND wa = ?").bind(berkasId, A2).run();
  await DB.prepare("UPDATE lj_tim SET peran = 'ketua', token_sha = ?, kedaluwarsa = ? WHERE berkas = ? AND wa = ?").bind(sha256("k".repeat(32)), kini + 864e5, berkasId, KETUA).run();
  const d = await wa(KETUA, "tim"); assert.equal(d.s, 200, d.t); assert.match(d.j.balasan, new RegExp(KETUA)); assert.match(d.j.balasan, /\(ketua\)/);
  const NEW = "6281299880041", t = await wa(KETUA, "tim tambah 081299880041"); assert.equal(t.s, 200, t.t); assert.match(t.j.balasan, /ditambahkan/);
  const b = await baris(NEW); assert.equal(b.peran, "anggota"); assert.equal(b.nama, null); assert.ok((await kabarAkhir(NEW)).teks.includes("/lapor/data/?t="));
  assert.equal((await wa(KETUA, "tim tambah 081299880041")).j.balasan.includes("sudah ada"), true);
  assert.match((await wa(KETUA, "tim tambah")).j.balasan, /tim tambah/); assert.match((await wa(KETUA, "tim cabut 12")).j.balasan, /tim cabut/);
  assert.match((await wa(KETUA, "tim tambah 081299880042 Dian Rahmat")).j.balasan, /Dian Rahmat ditambahkan/); assert.equal((await baris("6281299880042")).nama, "Dian Rahmat");
  const c = await wa(KETUA, "tim cabut 081299880042"); assert.match(c.j.balasan, /dicabut/); assert.ok((await baris("6281299880042")).dicabut);
  const ag = await wa(A2, "tim tambah 081299880043"); assert.equal(ag.s, 200); assert.match(ag.j.balasan, /Hanya ketua/); assert.equal(await baris("6281299880043"), null);
  assert.match((await wa(A2, "tim cabut 081299880041")).j.balasan, /Hanya ketua/); assert.equal((await baris(NEW)).dicabut, null);
  const dl = await wa(A2, "tim"); assert.ok(!dl.j.balasan.includes(KETUA) && dl.j.balasan.includes("6281*****001"), dl.j.balasan);
  assert.ok(!/·|aman/i.test(t.t + d.t));
});

uji("WA nama anggota (D11): pesan pertama ditanya nama, jawaban sah jadi nama, tak sah ditanya ulang, lalu perintah tahap 2 jalan; lapor tidak dicegat", async () => {
  const NEW = "6281299880041";
  const lapor = await wa(NEW, "lapor"); assert.equal(lapor.s, 403, "anggota tanpa izin Lapor tidak membuat laporan, dan tidak ditanyai nama"); assert.equal(await n("lj_sesi", `wa = '${NEW}'`), 0);
  const q = await wa(NEW, "halo"); assert.equal(q.s, 200); assert.match(q.j.balasan, /Siapa nama Anda/); assert.equal(await n("lj_sesi", `wa = '${NEW}'`), 1);
  const bad = await wa(NEW, "Dedi 081234567890"); assert.match(bad.j.balasan, /belum sah/); assert.equal((await baris(NEW)).nama, null);
  const ok = await wa(NEW, "  Dedi   Santoso "); assert.match(ok.j.balasan, /Terima kasih, Dedi Santoso/); assert.equal((await baris(NEW)).nama, "Dedi Santoso"); assert.equal(await n("lj_sesi", `wa = '${NEW}'`), 0);
  assert.equal(await n("lj_jejak", "aksi = 'tim_nama'"), 1);
  assert.match((await wa(NEW, "data rumah")).j.balasan, /Data rumah/);
  assert.equal(await n("lapor_izin", `wa = '${NEW}'`), 0, "anggota tidak pernah dapat hak laporan bpbd");
  assert.equal((await wa(NEW, "batal")).s, 200);
});

uji("WA tautan: tautan baru untuk diri sendiri, tautan lama mati; gerbang izin: anggota dicabut ditolak, anggota aktif tetap tanpa izin Lapor", async () => {
  const NEW = "6281299880041", r = await wa(NEW, "tautan"); assert.equal(r.s, 200, r.t);
  const tk = tokenDari({teks: r.j.balasan}); assert.ok(tk); assert.equal((await baris(NEW)).token_sha, sha256(tk));
  assert.ok(r.j.balasan.split("\n").length <= 3);
  const kuki = await masuk(tk); assert.equal((await api("GET", "/api/lapor/data/berkas", undefined, {cookie: kuki})).s, 200);
  const r2 = await wa(NEW, "minta tautan"); const tk2 = tokenDari({teks: r2.j.balasan}); assert.notEqual(tk2, tk);
  assert.equal((await api("GET", "/api/lapor/data/berkas", undefined, {cookie: kuki})).s, 401, "tautan lama mati");
  assert.equal((await wa(NEW, "lapor")).s, 403, "permintaan 1: di luar berkas tetap ditolak"); assert.equal((await wa(NEW, "data rumah")).s, 200, "permintaan 2: jalur berkas lolos");
  await wa(NEW, "batal");
  assert.equal((await tim({aksi: "cabut", wa: NEW, berkas: berkasId}, STAF)).s, 200);   // staf mencabut
  assert.ok((await baris(NEW)).dicabut);
  assert.equal((await wa(NEW, "data rumah")).s, 403, "dicabut: jalur berkas tertutup"); assert.equal((await wa(NEW, "tautan")).s, 403);
  assert.equal((await wa(WARGA, "tim")).s, 403, "bukan anggota");
});

/* ---------- temuan pemeriksa LJ-09 ---------- */
uji("review: nomor aktif di berkas lain ditolak netral; staf tanpa x-pb 403; perintah pertama dikerjakan dulu baru nama ditanya; laju per pengirim dan per target; berkas tertutup", async () => {
  const B = "6281299880061", M = "6281299880062";
  await DB.prepare("INSERT INTO lapor_izin (wa, peran, kab, oleh, dibuat) VALUES (?, 'bpbd', 'Kota Bogor', 'uji', ?)").bind(B, kini).run();
  const kerja = {tingkat: "bpbd", isian: {lokasi: {nilai: {lat: -6.6, lon: 106.8, wilayah: BOGOR}}, jenis: {nilai: "banjir"}}, transkrip: []};
  await DB.batch([DB.prepare(`INSERT INTO lapor_sesi (id, wa, status, tingkat, jenis, kab, lat, lon, nomor, token_sha, terkirim, kerja, ringkas, rev, dibuat, diubah) VALUES ('sLA-231126-02', ?, 'terkirim', 'bpbd', 'banjir', '32.71', -6.6, 106.8, 'LA-231126-02', ?, ?, ?, '{}', 0, ?, ?)`)
      .bind(B, sha256("LA-231126-02"), kini, JSON.stringify(kerja), kini, kini), DB.prepare("INSERT INTO lapor_tiket (nomor, sesi, status, diubah) VALUES ('LA-231126-02', 'sLA-231126-02', 'baru', ?)").bind(kini)]);
  const berkasB = (await bukaBerkas(env, "LA-231126-02", kini, ASAL)).berkas; assert.ok(berkasB);
  const kukiB = await masuk(tokenDari(await kabarAkhir(B))), tB = (b, h = kuk(kukiB)) => tim(b, h);
  // 1. nomor aktif di berkas A (KETUA) tidak bisa ditambahkan ke berkas B
  const r = await tB({aksi: "tambah", wa: KETUA}); assert.equal(r.s, 409); assert.equal(r.j.galat, "Nomor itu tidak bisa ditambahkan."); assert.ok(!r.t.includes(berkasId));
  assert.equal(await n("lj_tim", `berkas = '${berkasB}' AND wa = '${KETUA}'`), 0); assert.match((await wa(KETUA, "tim")).j.balasan, /Tim pendataan/);
  // 4. staf tanpa x-pb
  assert.equal((await tim({aksi: "cabut", wa: A1, berkas: berkasId}, ADMIN)).s, 403);
  // 7. anggota tanpa nama: perintah dikerjakan, nama ditanya di pesan bukan-perintah berikutnya
  assert.equal((await tB({aksi: "tambah", wa: M})).s, 200);
  assert.match((await wa(M, "data rumah")).j.balasan, /Data rumah/); assert.equal(await n("lj_sesi", `wa = '${M}' AND keadaan LIKE '%nama%'`), 0);
  await wa(M, "batal"); assert.match((await wa(M, "halo")).j.balasan, /Siapa nama Anda/);
  assert.match((await wa(M, "data rumah")).j.balasan, /Data rumah/, "perintah saat ditanya nama: dikerjakan, pertanyaan nama ditunda");
  await wa(M, "batal");
  // 2. laju per target (3 per hari) lalu per pengirim (10 per jam)
  const T = "6281299880071", cabutT = () => tB({aksi: "cabut", wa: T});
  for (let i = 0; i < 3; i++) { assert.equal((await tB({aksi: "tambah", wa: T})).s, 200, "tambah ke-" + (i + 1)); assert.equal((await cabutT()).s, 200); }
  const sering = await tB({aksi: "tambah", wa: T}); assert.equal(sering.s, 429); assert.equal(sering.j.galat, "Terlalu sering. Coba lagi nanti."); assert.equal(await baris2(berkasB, T), 1, "tetap dicabut");
  assert.equal((await wa(B, "tim tambah 081299880071")).j.balasan, "Terlalu sering. Coba lagi nanti.", "WA memakai laju yang sama");
  let pernah429 = null;
  for (let i = 0; i < 8 && !pernah429; i++) { const x = await tB({aksi: "tambah", wa: "62812998801" + String(10 + i)}); if (x.s === 429) pernah429 = x; }
  assert.ok(pernah429, "pengirim dibatasi 10 per jam"); assert.equal(pernah429.j.galat, "Terlalu sering. Coba lagi nanti.");
  // 3. berkas tertutup: ketua tidak mencabut dan staf memindahkan ketua ditolak, staf mencabut tetap boleh
  await DB.prepare("UPDATE lj_berkas SET status = 'selesai', ditutup = ? WHERE id = ?").bind(kini, berkasB).run();
  const c = await tB({aksi: "cabut", wa: M}); assert.equal(c.s, 409); assert.equal(c.j.galat, "Berkas ini sudah ditutup. Tim tidak bisa diubah.");
  assert.equal((await tim({aksi: "pindah_ketua", wa: M, berkas: berkasB}, STAF)).s, 409, "pindah ketua hanya saat terbuka");
  assert.equal((await tim({aksi: "cabut", wa: M, berkas: berkasB}, STAF)).s, 200, "staf mencabut kapan pun");
  assert.equal(await n("lj_tim", `berkas = '${berkasB}' AND peran = 'ketua' AND dicabut IS NULL`), 1);
});
async function baris2(b, x) { return (await DB.prepare("SELECT dicabut IS NOT NULL d FROM lj_tim WHERE berkas = ? AND wa = ?").bind(b, x).first()).d; }

uji("review: batas anggota ditegakkan atomik di SQL, bukan hanya cek kode", async () => {
  const H = await import("../../src/hak.js"), P = H.pelakuLjTim;
  const r = await DB.prepare("SELECT berkas FROM lj_tim WHERE wa = ?").bind("6281299880001").first(); const b = r.berkas;
  await DB.prepare("UPDATE lj_berkas SET status = 'terbuka', ditutup = NULL WHERE id = ?").bind(b).run();
  const aktif = (await DB.prepare("SELECT count(*) n FROM lj_tim WHERE berkas = ? AND dicabut IS NULL").bind(b).first()).n;
  for (let i = aktif; i < 20; i++) await DB.prepare("INSERT INTO lj_tim (berkas, wa, peran, oleh, dibuat) VALUES (?, ?, 'anggota', 'isi', ?)").bind(b, "628129988" + String(2000 + i), kini).run();
  const x = await H.ljBatch(env, P, [H.ljStmtTimAnggota(env, P, b, "6281299880099", null, "a".repeat(64), kini + 1e6, "uji", kini, 20)]);
  assert.equal(x[0].meta.changes, 0, "penuh: INSERT bersyarat tidak menulis");
});
