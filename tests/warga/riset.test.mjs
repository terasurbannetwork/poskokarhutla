/* Kemitraan riset (src/riset.js, migrations/0025_riset.sql) di workerd (Miniflare) dengan D1 lokal sungguhan, migrasi apa adanya (TEST.md: tanpa mock DB).
   Jalankan: node --test tests/warga/riset.test.mjs */
import assert from "node:assert/strict";
import {readFileSync, existsSync} from "node:fs";
import path from "node:path";
import {AKAR, pecah} from "./_bantu.mjs";
import {siapkan, berantai, ADMIN, MOD2, GERBANG} from "./_bnpb.mjs";
import "../../src/worker.js";   // worker.js dulu: riset.js dan worker.js saling impor
import {TEMA, STATUS, ALUR, JENIS_LUARAN, STATUS_PERMINTAAN, BENTUK, BENCANA_SAH, KATALOG, tautanSah, doiSah, statusPks} from "../../src/riset.js";
import REGISTRY from "../../src/bencana.generated.js";

const U = await siapkan("uji-riset"), uji = berantai(), HARI = 24 * 3600e3;
const SQL = readFileSync(path.join(AKAR, "migrations/0025_riset.sql"), "utf8");
const tgl = n => new Date(Date.now() + n * HARI).toISOString().slice(0, 10);
const kode = k => ({"x-kode": k});
const PIC = {nama: "Dra. PIC Rahasia", email: "rahasia.pic@kampus-uji.ac.id", wa: "081234567890"}, KETUA = "Dr. Ketua Rahasia";
const mitraBody = (institusi, x = {}) => ({institusi, unit: "Pusat Studi Uji", pic_nama: PIC.nama, pic_email: PIC.email, pic_wa: PIC.wa, pks_nomor: "PKS/UJI/1/2026", pks_mulai: tgl(-100), pks_sampai: tgl(300), ...x});
const usulanBody = (x = {}) => ({judul: "Peringatan dini asap berbasis ansambel", ketua: KETUA, anggota: "A. Satu, B. Dua", bencana: "karhutla", wilayah: "Kalimantan Tengah", metode: "Analisis deret waktu dan uji balik terhadap kejadian.",
  data_butuh: ["titik_panas", "fwi"], mulai: tgl(10), selesai: tgl(200), luaran_rencana: "Artikel jurnal dan policy brief", ...x});
const buatMitra = async (institusi, x) => { const r = await U.adm("POST", "/api/riset/admin/mitra", mitraBody(institusi, x)); assert.equal(r.s, 201, r.t); return r.j; };
const idHex = () => Array.from({length: 16}, () => "0123456789abcdef"[Math.floor(Math.random() * 16)]).join("");
let A, B, usulanA, agendaId;

uji("migrasi 0025 idempoten: jalan dua kali di atas data, baris utuh", async () => {
  const dummyMitra = idHex();
  await U.DB.prepare("INSERT INTO mitra_riset (id, institusi, pic_nama, kode_sha, dibuat) VALUES (?, 'Kampus Awal', 'PIC', ?, 1)").bind(dummyMitra, "a".repeat(64)).run();
  await U.DB.batch(pecah(SQL).map(s => U.DB.prepare(s)));
  assert.equal(await U.n("mitra_riset"), 1);
  await U.DB.prepare("DELETE FROM mitra_riset WHERE id = ?").bind(dummyMitra).run();
});

uji("daftar tetap di JS sama persis dengan CHECK migrasi (tema, status, jenis, bentuk, permintaan, alur trigger)", async () => {
  const blok = tabel => SQL.split("CREATE TABLE IF NOT EXISTS ").find(b => b.startsWith(tabel + " "));
  const enumDari = (tabel, kol) => { const m = blok(tabel).match(new RegExp(`\\b${kol} IN \\(([^)]+)\\)`)); assert.ok(m, `${tabel}.${kol}`); return m[1].split(",").map(x => x.trim().replace(/^'|'$/g, "")); };
  assert.deepEqual(enumDari("riset_agenda", "tema"), Object.keys(TEMA));
  assert.deepEqual(enumDari("riset_usulan", "status"), STATUS);
  assert.deepEqual(enumDari("riset_jejak", "ke"), STATUS);
  assert.deepEqual(enumDari("riset_luaran", "jenis"), JENIS_LUARAN);
  assert.deepEqual(enumDari("riset_permintaan", "status"), STATUS_PERMINTAAN);
  assert.deepEqual(enumDari("riset_kebijakan", "bentuk"), Object.keys(BENTUK));
  assert.deepEqual(enumDari("riset_kemajuan", "jenis"), ["kemajuan", "akhir"]);
  assert.deepEqual(BENCANA_SAH, [...REGISTRY.bencana.map(b => b.id), "lintas"]);
  /* trigger alur: tiap pasangan (dari, ke) diterima D1 tepat bila ada di ALUR */
  const m = idHex(); await U.DB.prepare("INSERT INTO mitra_riset (id, institusi, pic_nama, kode_sha, dibuat) VALUES (?, 'Kampus Alur', 'PIC', ?, 1)").bind(m, "b".repeat(64)).run();
  for (const dari of STATUS) for (const ke of STATUS) {
    if (dari === ke) continue;
    const id = idHex();
    await U.DB.prepare(`INSERT INTO riset_usulan (id, mitra_id, judul, ketua, bencana, wilayah, metode, mulai, selesai, luaran_rencana, status, nomor_pks, dibuat, diubah)
      VALUES (?, ?, 'Judul uji alur', 'Ketua', 'banjir', 'Jawa', 'metode sepuluh huruf', '2026-01-01', '2026-12-31', 'artikel', ?, 'PKS/ALUR', 1, 1)`).bind(id, m, dari).run();
    const ok = await U.DB.prepare("UPDATE riset_usulan SET status = ? WHERE id = ?").bind(ke, id).run().then(() => true, e => { assert.match(String(e.message), /transisi status usulan tidak sah/); return false; });
    assert.equal(ok, !!ALUR[dari][ke], `${dari} -> ${ke}`);
  }
  await U.DB.batch([U.DB.prepare("DELETE FROM riset_usulan WHERE mitra_id = ?").bind(m), U.DB.prepare("DELETE FROM mitra_riset WHERE id = ?").bind(m)]);
});

uji("CHECK menolak isian liar langsung di D1 (tema, prioritas, tautan javascript:, DOI, sitasi, jalur //, status tanpa PKS)", async () => {
  const gagalSql = async (sql, ...b) => assert.rejects(U.DB.prepare(sql).bind(...b).run(), /CHECK|constraint|transisi/i, sql.slice(0, 60));
  await gagalSql("INSERT INTO riset_agenda (id, judul, latar, bencana, tema, prioritas, luaran, dibuat, diubah) VALUES (?, 'Judul agenda', '', 'karhutla', 'sembarang', 1, '', 1, 1)", idHex());
  await gagalSql("INSERT INTO riset_agenda (id, judul, latar, bencana, tema, prioritas, luaran, dibuat, diubah) VALUES (?, 'Judul agenda', '', 'karhutla', 'logistik', 4, '', 1, 1)", idHex());
  await gagalSql("INSERT INTO riset_agenda (id, judul, latar, bencana, tema, prioritas, luaran, dibuat, diubah) VALUES (?, 'Judul agenda', '', 'Karhutla!', 'logistik', 1, '', 1, 1)", idHex());
  const m = idHex(), u = idHex();
  await U.DB.batch([U.DB.prepare("INSERT INTO mitra_riset (id, institusi, pic_nama, kode_sha, dibuat) VALUES (?, 'Kampus Cek', 'PIC', ?, 1)").bind(m, "c".repeat(64)),
    U.DB.prepare(`INSERT INTO riset_usulan (id, mitra_id, judul, ketua, bencana, wilayah, metode, mulai, selesai, luaran_rencana, dibuat, diubah) VALUES (?, ?, 'Judul cek', 'Ketua', 'banjir', 'Jawa', 'metode sepuluh huruf', '2026-01-01', '2026-12-31', 'x luaran', 1, 1)`).bind(u, m)]);
  const luaran = (tautan, doi) => ["INSERT INTO riset_luaran (id, usulan_id, jenis, judul, tautan, doi, waktu) VALUES (?, ?, 'artikel', 'Judul luaran', ?, ?, 1)", idHex(), u, tautan, doi];
  await gagalSql(...luaran("javascript:alert(1)", null)); await gagalSql(...luaran("ftp://x.id/a", null)); await gagalSql(...luaran("https://x.id/a b", null)); await gagalSql(...luaran(null, "bukan-doi"));
  const [qOk, ...bOk] = luaran("https://contoh.id/a", "10.1234/abc"); await U.DB.prepare(qOk).bind(...bOk).run();
  await gagalSql("INSERT INTO riset_kemajuan (id, usulan_id, jenis, isi, tautan, waktu) VALUES (?, ?, 'kemajuan', 'isi laporan cukup panjang', 'data:text/html,x', 1)", idHex(), u);
  await gagalSql("INSERT INTO riset_permintaan (id, mitra_id, dataset, tujuan, sitasi, dibuat) VALUES (?, ?, 'titik_panas', 'tujuan cukup panjang', 0, 1)", idHex(), m);
  await gagalSql("INSERT INTO riset_permintaan (id, mitra_id, dataset, tujuan, sitasi, status, jalur, dibuat) VALUES (?, ?, 'titik_panas', 'tujuan cukup panjang', 1, 'diminta', '//jahat.id/x', 1)", idHex(), m);
  await gagalSql("INSERT INTO riset_permintaan (id, mitra_id, dataset, tujuan, sitasi, status, dibuat) VALUES (?, ?, 'titik_panas', 'tujuan cukup panjang', 1, 'disetujui', 1)", idHex(), m);
  await gagalSql("UPDATE riset_usulan SET status = 'selesai', nomor_pks = 'PKS/1' WHERE id = ?", u);
  await gagalSql("INSERT INTO riset_usulan (id, mitra_id, judul, ketua, bencana, wilayah, metode, data_butuh, mulai, selesai, luaran_rencana, dibuat, diubah) VALUES (?, ?, 'Judul cek', 'Ketua', 'banjir', 'Jawa', 'metode sepuluh huruf', 'bukan json', '2026-01-01', '2026-12-31', 'x luaran', 1, 1)", idHex(), m);
  await gagalSql("INSERT INTO riset_usulan (id, mitra_id, judul, ketua, bencana, wilayah, metode, mulai, selesai, luaran_rencana, dibuat, diubah) VALUES (?, ?, 'Judul cek', 'Ketua', 'banjir', 'Jawa', 'metode sepuluh huruf', '2026-12-31', '2026-01-01', 'x luaran', 1, 1)", idHex(), m);
  await U.DB.batch([U.DB.prepare("DELETE FROM riset_luaran WHERE usulan_id = ?").bind(u), U.DB.prepare("DELETE FROM riset_usulan WHERE mitra_id = ?").bind(m), U.DB.prepare("DELETE FROM mitra_riset WHERE id = ?").bind(m)]);
  assert.equal(await U.n("riset_usulan"), 0);
});

uji("penyaring tautan dan DOI: hanya http/https tanpa kredensial", () => {
  for (const x of ["https://contoh.id/a?b=1", "http://contoh.id"]) assert.ok(tautanSah(x), x);
  for (const x of ["javascript:alert(1)", "JaVaScRiPt:alert(1)", "data:text/html,x", "ftp://a.id/x", "//a.id/x", "https://u:p@a.id/x", "https://a.id/ x", "https://a.id/<x>", "https://a.id/\"x", "x".repeat(301), 5, {}]) assert.equal(tautanSah(x), undefined, String(x));
  assert.equal(tautanSah(""), null); assert.equal(tautanSah(null), null);
  assert.equal(doiSah("10.1234/abc.5"), "10.1234/abc.5"); assert.equal(doiSah("doi:10.1/x"), undefined); assert.equal(doiSah(""), null);
  assert.equal(statusPks(null, Date.now()).s, "tanpa"); assert.equal(statusPks(tgl(30), Date.now()).s, "hampir"); assert.equal(statusPks(tgl(-3), Date.now()).s, "kedaluwarsa"); assert.equal(statusPks(tgl(200), Date.now()).s, "berlaku");
  const jalur = KATALOG.filter(k => k.jalur?.startsWith("/data/") || k.jalur?.startsWith("/banjir/"));
  assert.ok(jalur.length >= 8); for (const k of jalur) assert.ok(existsSync(path.join(AKAR, "public", k.jalur)), `berkas katalog ${k.id} tidak ada: ${k.jalur}`);
  assert.equal(new Set(KATALOG.map(k => k.id)).size, KATALOG.length);
});

uji("rute admin tanpa token 403, token akun gerbang situs 403, GET /api/riset/admin berbentuk", async () => {
  const rute = [["GET", "/api/riset/admin"], ["GET", "/api/riset/admin/csv?tabel=usulan"], ["POST", "/api/riset/admin/agenda"], ["POST", `/api/riset/admin/agenda/${idHex()}`], ["POST", "/api/riset/admin/mitra"],
    ["POST", `/api/riset/admin/mitra/${idHex()}`], ["POST", `/api/riset/admin/usulan/${idHex()}`], ["POST", `/api/riset/admin/permintaan/${idHex()}`], ["POST", "/api/riset/admin/kebijakan"], ["POST", `/api/riset/admin/kebijakan/${idHex()}`], ["POST", "/api/riset/dummy"]];
  for (const [m, j] of rute) {
    assert.equal((await U.api(m, j, m === "POST" ? {} : undefined)).s, 403, `${m} ${j} tanpa token`);
    assert.equal((await U.api(m, j, m === "POST" ? {} : undefined, GERBANG)).s, 403, `${m} ${j} akun gerbang`);
    assert.equal((await U.api(m, j, m === "POST" ? {} : undefined, {"x-admin-token": "salah"})).s, 403, `${m} ${j} token salah`);
  }
  const r = await U.adm("GET", "/api/riset/admin");
  assert.equal(r.s, 200); for (const k of ["agenda", "mitra", "usulan", "jejak", "kemajuan", "permintaan", "luaran", "kebijakan", "kartu", "enum"]) assert.ok(k in r.j, k);
});

uji("agenda: admin membuat, memvalidasi, menutup; publik hanya melihat yang buka", async () => {
  const bad = [{}, {judul: "Judul agenda", bencana: "karhutla", tema: "sembarang", prioritas: 1}, {judul: "Judul agenda", bencana: "tsunami_x", tema: "logistik", prioritas: 1}, {judul: "Judul agenda", bencana: "karhutla", tema: "logistik", prioritas: 5},
    {judul: "Judul agenda", bencana: "karhutla", tema: "logistik", prioritas: "1"}, {judul: "abc", bencana: "karhutla", tema: "logistik", prioritas: 1}];
  for (const b of bad) assert.equal((await U.adm("POST", "/api/riset/admin/agenda", b)).s, 400, JSON.stringify(b));
  const a = await U.adm("POST", "/api/riset/admin/agenda", {judul: "Bagaimana peringatan dini asap lintas batas?", latar: "BNPB butuh model 3 hari.", bencana: "karhutla", tema: "peringatan_dini", prioritas: 1, luaran: "Policy brief"});
  assert.equal(a.s, 201, a.t); agendaId = a.j.id;
  const t = await U.adm("POST", "/api/riset/admin/agenda", {judul: "Agenda yang akan ditutup", bencana: "lintas", tema: "teknologi", prioritas: 3});
  assert.equal(t.s, 201);
  assert.equal((await U.adm("POST", `/api/riset/admin/agenda/${t.j.id}`, {status: "tutup"})).s, 200);
  assert.equal((await U.adm("POST", `/api/riset/admin/agenda/${t.j.id}`, {tema: "nggak"})).s, 400);
  assert.equal((await U.adm("POST", `/api/riset/admin/agenda/${idHex()}`, {status: "tutup"})).s, 404);
  const p = await U.api("GET", "/api/riset/ringkas");
  assert.equal(p.s, 200); assert.deepEqual(p.j.agenda.map(x => x.judul), ["Bagaimana peringatan dini asap lintas batas?"]);
  assert.equal(p.j.agenda[0].tema, "peringatan_dini"); assert.equal(p.j.agenda[0].prioritas, 1);
});

uji("mitra: admin membuat kode (tampil sekali, hash saja di D1), validasi, kode salah/dicabut 403", async () => {
  for (const b of [{}, mitraBody("AB"), mitraBody("Kampus Uji", {pic_email: "bukan-email"}), mitraBody("Kampus Uji", {pic_wa: "abc"}), mitraBody("Kampus Uji", {pks_mulai: "2026-13-45"}), mitraBody("Kampus Uji", {pks_mulai: tgl(10), pks_sampai: tgl(-10)})])
    assert.equal((await U.adm("POST", "/api/riset/admin/mitra", b)).s, 400, JSON.stringify(b).slice(0, 80));
  A = await buatMitra("Universitas Uji Satu"); B = await buatMitra("Universitas Uji Dua");
  assert.match(A.kode, /^[0-9a-f]{26}$/); assert.match(A.tautan, /\/riset\/mitra#k=[0-9a-f]{26}$/);
  const baris = await U.DB.prepare("SELECT kode_sha FROM mitra_riset WHERE id = ?").bind(A.id).first();
  assert.notEqual(baris.kode_sha, A.kode); assert.equal(baris.kode_sha.length, 64);
  assert.equal((await U.adm("GET", "/api/riset/admin")).t.includes(A.kode), false, "kode tidak pernah dikembalikan lagi");
  for (const h of [{}, kode("0".repeat(26)), kode("zz"), kode(A.kode.toUpperCase().replace(/./, "g"))]) assert.equal((await U.api("GET", "/api/riset/mitra/saya", undefined, h)).s, 403);
  const saya = await U.api("GET", "/api/riset/mitra/saya", undefined, kode(A.kode));
  assert.equal(saya.s, 200); assert.equal(saya.j.mitra.institusi, "Universitas Uji Satu"); assert.equal(saya.j.mitra.pks.s, "berlaku"); assert.deepEqual(saya.j.usulan, []);
  assert.ok(saya.j.agenda.some(a => a.id === agendaId));
  const C = await buatMitra("Universitas Dicabut");
  assert.equal((await U.api("GET", "/api/riset/mitra/saya", undefined, kode(C.kode))).s, 200);
  assert.equal((await U.adm("POST", `/api/riset/admin/mitra/${C.id}`, {aksi: "cabut"})).s, 200);
  assert.equal((await U.adm("POST", `/api/riset/admin/mitra/${C.id}`, {aksi: "cabut"})).s, 409);
  assert.equal((await U.api("GET", "/api/riset/mitra/saya", undefined, kode(C.kode))).s, 403, "dicabut dijawab sama dengan salah");
  assert.equal((await U.api("POST", "/api/riset/mitra/usulan", usulanBody(), kode(C.kode))).s, 403);
  assert.equal((await U.adm("POST", `/api/riset/admin/mitra/${idHex()}`, {aksi: "cabut"})).s, 404);
  assert.equal((await U.adm("POST", `/api/riset/admin/mitra/${A.id}`, {aksi: "pks", pks_nomor: "PKS/UJI/2/2026", pks_mulai: tgl(-5), pks_sampai: tgl(40)})).s, 200);
  assert.equal((await U.api("GET", "/api/riset/mitra/saya", undefined, kode(A.kode))).j.mitra.pks.s, "hampir");
  assert.equal((await U.adm("POST", `/api/riset/admin/mitra/${A.id}`, {aksi: "pks", pks_nomor: "PKS/UJI/2/2026", pks_mulai: tgl(-5), pks_sampai: tgl(400)})).s, 200);
});

uji("usulan: mitra mengajukan; isian liar 400; tanpa kode 403; tercatat di jejak", async () => {
  const kirim = (b, h = kode(A.kode)) => U.api("POST", "/api/riset/mitra/usulan", b, h);
  assert.equal((await kirim(usulanBody(), {})).s, 403);
  const liar = [{judul: "abc"}, {ketua: ""}, {bencana: "tsunami_x"}, {data_butuh: ["bukan_dataset"]}, {data_butuh: "titik_panas"}, {data_butuh: ["fwi", "fwi"]}, {mulai: "2026-02-31"}, {mulai: tgl(50), selesai: tgl(10)},
    {metode: "pendek"}, {agenda_id: "bukan-id"}, {agenda_id: idHex()}, {luaran_rencana: ""}, {wilayah: "x"}, {judul: 5}, {anggota: "x".repeat(401)}];
  for (const x of liar) assert.equal((await kirim(usulanBody(x))).s, 400, JSON.stringify(x));
  const r = await kirim(usulanBody({agenda_id: agendaId}));
  assert.equal(r.s, 201, r.t); usulanA = r.j.id;
  const saya = (await U.api("GET", "/api/riset/mitra/saya", undefined, kode(A.kode))).j;
  assert.equal(saya.usulan.length, 1); assert.equal(saya.usulan[0].status, "diajukan"); assert.deepEqual(saya.usulan[0].data_butuh, ["titik_panas", "fwi"]);
  assert.deepEqual(saya.jejak.map(j => [j.ke, j.oleh]), [["diajukan", "mitra"]]);
});

uji("isolasi: mitra B tidak melihat dan tidak bisa mengubah usulan mitra A", async () => {
  const sayaB = (await U.api("GET", "/api/riset/mitra/saya", undefined, kode(B.kode))).j;
  assert.deepEqual(sayaB.usulan, []); assert.deepEqual(sayaB.jejak, []); assert.equal(JSON.stringify(sayaB).includes(usulanA), false, "id usulan A tidak muncul untuk B");
  const hB = kode(B.kode);
  for (const [j, b] of [[`/api/riset/mitra/usulan/${usulanA}`, usulanBody()], [`/api/riset/mitra/kemajuan/${usulanA}`, {isi: "laporan dari mitra lain yang jahat"}],
    [`/api/riset/mitra/luaran/${usulanA}`, {jenis: "artikel", judul: "Luaran curian"}]])
    assert.equal((await U.api("POST", j, b, hB)).s, 404, j);
  assert.equal((await U.api("POST", "/api/riset/mitra/permintaan", {dataset: "fwi", tujuan: "tujuan cukup panjang untuk uji", sitasi: true, usulan_id: usulanA}, hB)).s, 404);
  assert.equal((await U.api("POST", `/api/riset/mitra/kemajuan/xyz`, {isi: "laporan dari mitra lain"}, hB)).s, 404);
  const baris = await U.DB.prepare("SELECT status, mitra_id FROM riset_usulan WHERE id = ?").bind(usulanA).first();
  assert.deepEqual([baris.status, baris.mitra_id], ["diajukan", A.id]);
});

uji("alur status: hanya transisi sah; catatan/nomor PKS wajib; revisi lalu diajukan ulang oleh mitra", async () => {
  const adm = (ke, x = {}) => U.adm("POST", `/api/riset/admin/usulan/${usulanA}`, {ke, ...x});
  for (const ke of ["selesai", "berjalan", "disetujui", "laporan_akhir", "ditolak", "revisi", "diajukan"]) assert.equal((await adm(ke, {catatan: "catatan uji", nomor_pks: "PKS/1"})).s, 409, `diajukan -> ${ke}`);
  assert.equal((await adm("terserah")).s, 400);
  assert.equal((await U.adm("POST", `/api/riset/admin/usulan/${idHex()}`, {ke: "ditelaah"})).s, 404);
  assert.equal((await adm("ditelaah")).s, 200);
  assert.equal((await adm("revisi")).s, 400, "revisi tanpa catatan");
  assert.equal((await adm("ditolak", {catatan: "x"})).s, 400, "penolakan tanpa catatan memadai");
  assert.equal((await adm("disetujui")).s, 400, "persetujuan tanpa nomor PKS");
  assert.equal((await adm("revisi", {catatan: "Perjelas metode validasi."})).s, 200);
  assert.equal((await adm("ditelaah")).s, 409, "revisi -> ditelaah hanya lewat mitra");
  /* mitra merevisi: hanya saat status revisi */
  const rev = (b, h = kode(A.kode)) => U.api("POST", `/api/riset/mitra/usulan/${usulanA}`, b, h);
  assert.equal((await rev(usulanBody({judul: "abc"}))).s, 400);
  assert.equal((await rev(usulanBody({metode: "Metode divalidasi dengan data pembanding independen."}))).s, 200);
  assert.equal((await rev(usulanBody())).s, 409, "sudah diajukan lagi");
  assert.equal((await adm("ditelaah")).s, 200);
  assert.equal((await adm("disetujui", {nomor_pks: "PKS/BNPB/2026/007"})).s, 200);
  assert.equal((await U.DB.prepare("SELECT nomor_pks, status FROM riset_usulan WHERE id = ?").bind(usulanA).first()).nomor_pks, "PKS/BNPB/2026/007");
  assert.equal((await U.api("POST", `/api/riset/mitra/kemajuan/${usulanA}`, {isi: "Laporan sebelum berjalan harus ditolak."}, kode(A.kode))).s, 409, "belum berjalan");
  assert.equal((await adm("berjalan")).s, 200);
  const jejak = (await U.adm("GET", "/api/riset/admin")).j.jejak.filter(j => j.usulan_id === usulanA).reverse();
  assert.deepEqual(jejak.map(j => `${j.dari}>${j.ke}`), ["null>diajukan", "diajukan>ditelaah", "ditelaah>revisi", "revisi>diajukan", "diajukan>ditelaah", "ditelaah>disetujui", "disetujui>berjalan"]);
  assert.equal(jejak[2].catatan, "Perjelas metode validasi."); assert.match(jejak[2].oleh, /^admin:[0-9a-f]{12}$/);
  const sayaJejak = (await U.api("GET", "/api/riset/mitra/saya", undefined, kode(A.kode))).j.jejak;
  assert.ok(sayaJejak.every(j => j.oleh === "admin" || j.oleh === "mitra"), "identitas admin tidak bocor ke mitra");
});

uji("laporan kemajuan, luaran, laporan akhir: tautan hanya http/https, DOI sah, status mengikuti", async () => {
  const h = kode(A.kode), kem = b => U.api("POST", `/api/riset/mitra/kemajuan/${usulanA}`, b, h), lua = b => U.api("POST", `/api/riset/mitra/luaran/${usulanA}`, b, h);
  for (const t of ["javascript:alert(1)", "data:text/html,<b>", "ftp://a.id/x", "https://a.id/ spasi"]) { assert.equal((await kem({isi: "Laporan kemajuan yang cukup panjang.", tautan: t})).s, 400, t); assert.equal((await lua({jenis: "artikel", judul: "Luaran", tautan: t})).s, 400, t); }
  assert.equal((await kem({isi: "pendek"})).s, 400);
  assert.equal((await lua({jenis: "buku", judul: "Luaran"})).s, 400); assert.equal((await lua({jenis: "artikel", judul: "Luaran", doi: "bukan doi"})).s, 400);
  const k = await kem({isi: "Pengumpulan data selesai, analisis awal berjalan.", tautan: "https://drive.contoh.ac.id/laporan1"});
  assert.equal(k.s, 201, k.t);
  for (const jenis of JENIS_LUARAN) assert.equal((await lua({jenis, judul: `Luaran ${jenis}`, tautan: "https://contoh.ac.id/" + jenis, doi: jenis === "artikel" ? "10.1234/uji.2026" : undefined})).s, 201, jenis);
  assert.equal((await lua({jenis: "model", judul: "Luaran tanpa tautan"})).s, 201, "tautan opsional");
  const akhir = await kem({isi: "Laporan akhir: temuan utama dan rekomendasi untuk BNPB.", tautan: "https://contoh.ac.id/akhir.pdf", akhir: true});
  assert.equal(akhir.s, 201); assert.equal(akhir.j.status, "laporan_akhir");
  assert.equal((await kem({isi: "Laporan tambahan sesudah laporan akhir."})).s, 409);
  assert.equal((await U.adm("POST", `/api/riset/admin/usulan/${usulanA}`, {ke: "selesai"})).s, 200);
  assert.equal((await lua({jenis: "dataset", judul: "Dataset sesudah selesai"})).s, 201, "luaran masih bisa dicatat sesudah selesai");
  const saya = (await U.api("GET", "/api/riset/mitra/saya", undefined, h)).j;
  assert.equal(saya.usulan[0].status, "selesai"); assert.equal(saya.kemajuan.length, 2); assert.equal(saya.luaran.length, 7);
  assert.ok(saya.kemajuan.some(x => x.jenis === "akhir"));
});

uji("permintaan data: janji sitasi wajib, katalog, satu yang menunggu per dataset, admin memutuskan sekali", async () => {
  const h = kode(A.kode), minta = b => U.api("POST", "/api/riset/mitra/permintaan", b, h), dasar = {dataset: "titik_panas", tujuan: "Validasi model peringatan dini asap.", sitasi: true};
  for (const x of [{sitasi: false}, {sitasi: "true"}, {sitasi: undefined}, {dataset: "tidak_ada"}, {dataset: "../etc"}, {tujuan: "pendek"}]) assert.equal((await minta({...dasar, ...x})).s, 400, JSON.stringify(x));
  assert.equal((await minta(dasar)).s, 201);
  assert.equal((await minta(dasar)).s, 409);
  assert.equal((await U.api("POST", "/api/riset/mitra/permintaan", dasar, {})).s, 403);
  const p2 = await minta({...dasar, dataset: "laporan_warga_agregat", usulan_id: usulanA}); assert.equal(p2.s, 201);
  const daftar = (await U.adm("GET", "/api/riset/admin")).j.permintaan, id1 = daftar.find(x => x.dataset === "titik_panas").id, id2 = p2.j.id;
  const putus = (id, b) => U.adm("POST", `/api/riset/admin/permintaan/${id}`, b);
  assert.equal((await putus(id1, {ke: "disetujui"})).s, 400, "setuju tanpa jalur"); assert.equal((await putus(id1, {ke: "disetujui", jalur: "javascript:alert(1)"})).s, 400);
  assert.equal((await putus(id1, {ke: "disetujui", jalur: "//jahat.id/x"})).s, 400); assert.equal((await putus(id1, {ke: "ditolak"})).s, 400, "tolak tanpa catatan"); assert.equal((await putus(id1, {ke: "diminta"})).s, 400);
  assert.equal((await putus(id1, {ke: "disetujui", jalur: "/data/hotspot.json", catatan: "Cantumkan sitasi."})).s, 200);
  assert.equal((await putus(id1, {ke: "ditolak", catatan: "terlambat"})).s, 409, "sudah diputuskan");
  assert.equal((await putus(id2, {ke: "ditolak", catatan: "Perlu persetujuan unit data."})).s, 200);
  assert.equal((await putus(idHex(), {ke: "ditolak", catatan: "tidak ada"})).s, 404);
  const saya = (await U.api("GET", "/api/riset/mitra/saya", undefined, h)).j.permintaan;
  assert.deepEqual(saya.map(p => p.status).sort(), ["disetujui", "ditolak"]); assert.equal(saya.find(p => p.status === "disetujui").jalur, "/data/hotspot.json");
});

uji("dipakai untuk kebijakan: admin mencatat pemanfaatan luaran; validasi; hapus", async () => {
  const luaran = (await U.adm("GET", "/api/riset/admin")).j.luaran, l = luaran.find(x => x.jenis === "artikel");
  const catat = b => U.adm("POST", "/api/riset/admin/kebijakan", b), dasar = {luaran_id: l.id, instansi: "Direktorat Pusdalops BNPB", bentuk: "juknis", tanggal: tgl(-2), catatan: "Dipakai sebagai dasar juknis."};
  for (const x of [{luaran_id: "x"}, {luaran_id: idHex()}, {instansi: "x"}, {bentuk: "pidato"}, {tanggal: "2026-99-99"}, {tanggal: tgl(30)}]) assert.equal((await catat({...dasar, ...x})).s, x.luaran_id?.length === 16 ? 404 : 400, JSON.stringify(x));
  const r = await catat(dasar); assert.equal(r.s, 201, r.t);
  assert.equal((await catat({...dasar, bentuk: "se"})).s, 201);
  const a = (await U.adm("GET", "/api/riset/admin")).j;
  assert.equal(a.kebijakan.length, 2); assert.equal(a.kartu.kebijakan, 1, "dua pemanfaatan pada satu riset = 1 riset dipakai");
  assert.equal(a.luaran.find(x => x.id === l.id).kebijakan, 2);
  assert.equal((await U.adm("POST", `/api/riset/admin/kebijakan/${r.j.id}`, {aksi: "hapus"})).s, 200);
  assert.equal((await U.adm("POST", `/api/riset/admin/kebijakan/${r.j.id}`, {aksi: "hapus"})).s, 404);
  assert.equal((await U.adm("POST", `/api/riset/admin/kebijakan/${r.j.id}`, {aksi: "lain"})).s, 400);
});

uji("perbaikan ulasan: luaran mitra baru tampil di publik hanya sesudah admin menyetujui; mitra tidak bisa menyetujui", async () => {
  const semua = (await U.adm("GET", "/api/riset/admin")).j.luaran, h = kode(A.kode);
  assert.equal(semua.length, 7); assert.ok(semua.every(l => l.disetujui === 0), "luaran baru mulai belum disetujui");
  const sebelum = (await U.api("GET", "/api/riset/ringkas")).j;
  assert.equal(sebelum.kartu.luaran, 0); assert.equal(sebelum.riset[0].luaran.length, 0);
  assert.equal(JSON.stringify(sebelum).includes("contoh.ac.id"), false, "tautan belum disetujui tidak bocor");
  const art = semua.find(l => l.jenis === "artikel"), mod = (id, b, hh) => U.api("POST", `/api/riset/admin/luaran/${id}`, b, hh);
  for (const hh of [{}, h, kode(B.kode)]) assert.equal((await mod(art.id, {aksi: "setujui"}, hh)).s, 403, "bukan admin");
  assert.equal(await U.n("riset_luaran", "disetujui = 1"), 0);
  assert.equal((await U.adm("POST", `/api/riset/admin/luaran/${art.id}`, {aksi: "lain"})).s, 400);
  assert.equal((await U.adm("POST", `/api/riset/admin/luaran/${idHex()}`, {aksi: "setujui"})).s, 404);
  assert.equal((await U.adm("POST", `/api/riset/admin/luaran/${art.id}`, {aksi: "setujui"})).s, 200);
  const satu = (await U.api("GET", "/api/riset/ringkas")).j;
  assert.equal(satu.kartu.luaran, 1); assert.deepEqual(satu.riset[0].luaran.map(l => [l.judul, l.host]), [["Luaran artikel", "contoh.ac.id"]]);
  assert.equal((await U.api("GET", "/api/riset/mitra/saya", undefined, h)).j.luaran.filter(l => l.disetujui === 1).length, 1);
  assert.equal((await U.adm("POST", `/api/riset/admin/luaran/${art.id}`, {aksi: "tolak"})).s, 200);
  assert.equal((await U.api("GET", "/api/riset/ringkas")).j.kartu.luaran, 0, "persetujuan bisa dicabut");
  for (const l of semua) assert.equal((await U.adm("POST", `/api/riset/admin/luaran/${l.id}`, {aksi: "setujui"})).s, 200);
});

uji("publik: ringkasan agregat tanpa kontak PIC, tanpa ketua, tanpa id; riset selesai tampil dengan luaran", async () => {
  const p = await U.api("GET", "/api/riset/ringkas");
  assert.equal(p.s, 200); assert.match(p.h.get("cache-control") || "", /no-store|max-age/);
  for (const rahasia of [PIC.email, "kampus-uji.ac.id", PIC.wa, PIC.nama, "PIC Rahasia", KETUA, "Ketua Rahasia", A.kode, "pic_email", "pic_wa", "kode_sha", "ketua", "x-admin"]) assert.equal(p.t.includes(rahasia), false, `bocor di rute publik: ${rahasia}`);
  assert.ok(!JSON.stringify(p.j).includes(usulanA) && !JSON.stringify(p.j).includes(A.id), "id internal tidak keluar");
  assert.deepEqual(p.j.kartu, {mitra_aktif: 2, berjalan: 0, selesai: 1, luaran: 7, kebijakan: 1});
  assert.equal(p.j.riset.length, 1); const r = p.j.riset[0];
  assert.deepEqual([r.institusi, r.status, r.bencana, r.kebijakan], ["Universitas Uji Satu", "selesai", "karhutla", 1]);
  assert.equal(r.luaran.length, 7); assert.ok(r.luaran.every(l => l.tautan == null || /^https?:\/\//.test(l.tautan)));
  assert.equal(p.j.katalog.length, KATALOG.length); assert.ok(p.j.katalog.every(k => k.lisensi === "CC BY 4.0"));
  assert.deepEqual(p.j.mitra.map(m => m.institusi), ["Universitas Uji Dua", "Universitas Uji Satu"], "yang dicabut tidak dihitung");
  assert.equal(Object.keys(p.j.riset[0]).some(k => /kontak|email|wa|ketua|pic/i.test(k)), false);
});

uji("batas laju: usulan 10 per hari per kode, permintaan data, tebakan kode dihitung per IP", async () => {
  const Cc = await buatMitra("Universitas Laju"), h = {...kode(Cc.kode), "cf-connecting-ip": "203.0.113.50"};
  for (let i = 0; i < 10; i++) assert.equal((await U.api("POST", "/api/riset/mitra/usulan", usulanBody({judul: `Usulan laju nomor ${i}`}), h)).s, 201, `ke-${i}`);
  const r = await U.api("POST", "/api/riset/mitra/usulan", usulanBody({judul: "Usulan laju kesebelas"}), h);
  assert.equal(r.s, 429); assert.ok(r.h.get("retry-after"));
  assert.equal(await U.n("riset_usulan", `mitra_id = '${Cc.id}'`), 10);
  /* kode berbeda dari IP yang sama masih punya jatah per kode, tetapi IP terbatas 30/hari: IP lain tak terkena */
  const lain = {...kode(A.kode), "cf-connecting-ip": "203.0.113.51"};
  assert.equal((await U.api("GET", "/api/riset/mitra/saya", undefined, lain)).s, 200);
  /* tebakan kode: > 300 gagal per jam dari satu IP mengunci IP itu */
  const ipTebak = {"cf-connecting-ip": "203.0.113.99"};
  assert.equal((await U.api("GET", "/api/riset/mitra/saya", undefined, {...ipTebak, ...kode("1".repeat(26))})).s, 403);
  assert.ok(await U.n("laju_bnpb", "aksi = 'riset.kode_gagal'") >= 1);
});

uji("ekspor CSV: admin saja, tabel dikenal, sel berawalan rumus diberi apostrof", async () => {
  await buatMitra("=HYPERLINK(\"http://jahat.id\")");
  const r = await U.adm("GET", "/api/riset/admin/csv?tabel=mitra");
  assert.equal(r.s, 200); assert.match(r.h.get("content-type"), /text\/csv/); assert.match(r.h.get("content-disposition"), /attachment/);
  assert.ok(r.t.includes("'=HYPERLINK"), "rumus dinetralkan"); assert.equal(/(^|,)=HYPERLINK/m.test(r.t), false);
  assert.ok(r.t.split("\r\n")[0].includes("institusi"));
  for (const t of ["agenda", "usulan", "permintaan", "luaran", "kebijakan"]) assert.equal((await U.adm("GET", `/api/riset/admin/csv?tabel=${t}`)).s, 200, t);
  assert.equal((await U.adm("GET", "/api/riset/admin/csv?tabel=sqlite_master")).s, 400);
  assert.equal((await U.adm("GET", "/api/riset/admin/csv")).s, 400);
});

uji("halaman /riset, /riset/mitra, /admin/riset: 200 dengan CSP ketat, tanpa skrip/gaya inline", async () => {
  for (const [j, pribadi] of [["/riset", false], ["/riset/mitra", true]]) {
    const r = await U.api("GET", j); assert.equal(r.s, 200, j); const csp = r.h.get("content-security-policy");
    assert.match(csp, /script-src 'self'(;|$)/); assert.doesNotMatch(csp, /unsafe-inline/); assert.match(csp, /frame-ancestors 'none'/);
    assert.match(r.h.get("content-type"), /text\/html/); assert.equal(/<script(?![^>]*\ssrc=)[^>]*>/i.test(r.t), false, "skrip inline"); assert.equal(/\son[a-z]+\s*=|\sstyle\s*=|<style/i.test(r.t), false, "handler/gaya inline");
    if (pribadi) { assert.match(r.h.get("cache-control"), /no-store/); assert.match(r.h.get("x-robots-tag"), /noindex/); assert.equal(r.h.get("referrer-policy"), "no-referrer"); }
    for (const [, src] of r.t.matchAll(/(?:src|href)="(\/[^"?]+\.(?:js|css|svg|png|jpg))(?:\?[^"]*)?"/g)) assert.ok(existsSync(path.join(AKAR, "public", src)), `aset ${src} tidak ada`);
  }
  const tanpa = await U.api("GET", "/admin/riset"); assert.equal(tanpa.t.includes("/admin/riset.js"), false, "tanpa token dialihkan ke halaman masuk"); assert.match(tanpa.t, /\/admin\/masuk\.js/);
  const ada = await U.adm("GET", "/admin/riset"); assert.equal(ada.s, 200); assert.match(ada.t, /\/admin\/riset\.js/); assert.match(ada.t, /\/admin\/riset\.css/);
  assert.equal(existsSync(path.join(AKAR, "public/admin/riset.js")), true);
});

uji("dummy: hanya Super Admin; rantai lengkap tiap status; publik tidak berubah; hapus bersih tanpa sentuh data asli", async () => {
  const asli = {}; for (const t of ["riset_agenda", "mitra_riset", "riset_usulan", "riset_jejak", "riset_kemajuan", "riset_luaran", "riset_permintaan", "riset_kebijakan"]) asli[t] = await U.n(t);
  const publikSebelum = (await U.api("GET", "/api/riset/ringkas")).t;
  for (const h of [{}, GERBANG, MOD2]) assert.equal((await U.api("POST", "/api/riset/dummy", {aksi: "isi"}, h)).s, 403);
  assert.equal((await U.adm("POST", "/api/riset/dummy", {aksi: "lain"})).s, 400);
  const isi = await U.adm("POST", "/api/riset/dummy", {aksi: "isi"});
  assert.equal(isi.s, 200, isi.t); assert.ok(isi.j.agenda >= 9 && isi.j.mitra >= 4 && isi.j.usulan >= 8 && isi.j.luaran >= 5 && isi.j.permintaan >= 3 && isi.j.kebijakan >= 3);
  assert.equal((await U.adm("POST", "/api/riset/dummy", {aksi: "isi"})).s, 409, "gerbang sudah ada");
  const a = (await U.adm("GET", "/api/riset/admin")).j, dummy = x => x.filter(r => r.dummy === 1);
  for (const s of STATUS) assert.ok(dummy(a.usulan).some(u => u.status === s), `usulan dummy berstatus ${s}`);
  for (const s of STATUS_PERMINTAAN) assert.ok(dummy(a.permintaan).some(p => p.status === s), `permintaan dummy ${s}`);
  for (const t of Object.keys(TEMA)) assert.ok(dummy(a.agenda).some(x => x.tema === t), `agenda dummy tema ${t}`);
  for (const j of JENIS_LUARAN) assert.ok(dummy(a.luaran).some(x => x.jenis === j), `luaran dummy ${j}`);
  assert.ok(dummy(a.luaran).some(x => x.disetujui === 1) && dummy(a.luaran).some(x => x.disetujui === 0), "luaran dummy: ada yang disetujui dan yang belum");
  for (const b of Object.keys(BENTUK)) assert.ok(dummy(a.kebijakan).some(x => x.bentuk === b), `kebijakan dummy ${b}`);
  assert.ok(dummy(a.agenda).some(x => x.status === "tutup") && dummy(a.agenda).some(x => x.status === "buka"));
  const pks = dummy(a.mitra).map(m => m.pks.s); for (const s of ["berlaku", "hampir", "kedaluwarsa"]) assert.ok(pks.includes(s), `PKS dummy ${s}`);
  assert.ok(dummy(a.mitra).some(m => m.dicabut) && dummy(a.mitra).some(m => !m.dicabut));
  assert.ok(dummy(a.mitra).every(m => m.pic_email.endsWith(".invalid")), "kontak dummy tidak nyata");
  for (const u of dummy(a.usulan)) { const j = a.jejak.filter(x => x.usulan_id === u.id); assert.ok(j.length >= 1 && j[0].ke === u.status, `jejak usulan dummy ${u.status}`); }
  assert.equal(await U.n("riset_usulan", "dummy = 1 AND status IN ('disetujui','berjalan','laporan_akhir','selesai') AND nomor_pks IS NULL"), 0);
  /* publik tidak melihat dummy; admin dengan ?dummy=1 melihat semua kartu berangka */
  assert.equal((await U.api("GET", "/api/riset/ringkas")).t, publikSebelum, "publik tanpa dummy tidak berubah");
  assert.equal((await U.api("GET", "/api/riset/ringkas?dummy=1")).t, publikSebelum, "?dummy=1 tanpa admin = publik biasa");
  const d = (await U.adm("GET", "/api/riset/ringkas?dummy=1")).j;
  for (const k of ["mitra_aktif", "berjalan", "selesai", "luaran", "kebijakan"]) assert.ok(d.kartu[k] > 0, `kartu ${k} bukan nol`);
  assert.ok(d.kartu.kebijakan < d.kartu.luaran, "yang dipakai kebijakan lebih sedikit dari seluruh luaran");
  assert.ok(d.agenda.length > 1 && d.riset.length > 1 && d.riset.some(r => r.status === "berjalan") && d.riset.some(r => r.status === "laporan_akhir") && d.riset.some(r => r.status === "selesai"));
  assert.equal(a.kartu.antre >= 2, true, "antrean telaah berangka (diajukan + ditelaah)");
  /* hapus */
  const hapus = await U.adm("POST", "/api/riset/dummy", {aksi: "hapus"});
  assert.equal(hapus.s, 200, hapus.t); assert.equal(hapus.j.usulan, isi.j.usulan);
  for (const [t, n] of Object.entries(asli)) { assert.equal(await U.n(t), n, `${t} data asli utuh`); assert.equal(await U.n(t, "dummy = 1").catch(() => 0), 0, `${t} tanpa dummy`); }
  assert.equal((await U.api("GET", "/api/riset/ringkas")).t, publikSebelum);
  assert.equal((await U.adm("POST", "/api/riset/dummy", {aksi: "hapus"})).j.usulan, 0, "hapus kedua tidak menyentuh apa pun");
});

uji("tabel belum dimigrasi: semua rute riset membalas 503 (bukan 500), tetap bergerbang", async () => {
  const V = await siapkan("uji-riset-tanpa-tabel");
  await V.DB.batch(["riset_kebijakan", "riset_permintaan", "riset_luaran", "riset_kemajuan", "riset_jejak", "riset_usulan", "riset_agenda", "mitra_riset"].map(t => V.DB.prepare(`DROP TABLE ${t}`)));
  assert.equal((await V.api("GET", "/api/riset/ringkas")).s, 503);
  assert.equal((await V.adm("GET", "/api/riset/admin")).s, 503);
  assert.equal((await V.api("GET", "/api/riset/admin")).s, 403, "gerbang tetap menahan walau tabel belum ada");
  assert.equal((await V.api("GET", "/api/riset/mitra/saya", undefined, kode("a".repeat(26)))).s, 503);
  assert.equal((await V.api("GET", "/api/riset/mitra/saya", undefined, {})).s, 403);
  assert.equal((await V.adm("POST", "/api/riset/dummy", {aksi: "isi"})).s, 503);
  assert.equal((await V.adm("POST", "/api/riset/admin/mitra", mitraBody("Kampus Tanpa Tabel"))).s, 503);
  assert.equal((await V.api("GET", "/riset")).s, 200, "halaman statis tidak butuh tabel");
});
