/* Laporan Karhutla otomatis (src/laporan_karhutla.js, public/laporan_karhutla_spek.js, migrations/0032_laporan_karhutla.sql) di workerd (Miniflare) dengan D1 lokal sungguhan,
   migrasi apa adanya (TEST.md: tanpa mock). Dibuktikan: skema idempoten dan trigger menahan; spek bersama; PUTAR ULANG laporan 21 Okt 2026 (angka per provinsi data 20 Okt) menghasilkan
   target 983,34 ha, padam 502,08 ha, belum padam 481,26 ha, 261 FS dan Kalteng memisah TNTP; sortie lintas provinsi dihitung sekali; kunci ditolak saat belum lengkap dan diterima dengan
   "lanjut tanpa X" yang tercetak; ralat tidak mengubah snapshot lama; rekonsiliasi kuning antarhari; merah menahan kunci; hak (provinsi lain 404, staf berperan); konflik 409; draf cron dan
   draf dari tugas api; pengait Meja Pantau; dummy; 503 sopan tanpa 0032.
   Jalankan: node --test tests/warga/laporan_karhutla.test.mjs */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import path from "node:path";
import {AKAR, pecah} from "./_bantu.mjs";
import {siapkan, berantai, ADMIN, GERBANG, sha256} from "./_bnpb.mjs";
import "../../src/worker.js";   // worker dulu: modul saling impor (siklus)
import * as S from "../../public/laporan_karhutla_spek.js";
import {teksWA} from "../../public/laporan_karhutla_wa.js";
import {KATEGORI} from "../../src/inventaris.js";

const JAM = 3600e3, HARI = 24 * JAM, PB = {"x-pb": "1"};
const uji = berantai();
const U = await siapkan("uji-lk", {r2: true});
const {DB, api, mf} = U;
const teks = (...p) => readFileSync(path.join(AKAR, ...p), "utf8");
const id16 = () => [...crypto.getRandomValues(new Uint8Array(8))].map(b => b.toString(16).padStart(2, "0")).join("");
const sisip = (tabel, o) => DB.prepare(`INSERT INTO ${tabel} (${Object.keys(o).join(", ")}) VALUES (${Object.keys(o).map(() => "?").join(", ")})`).bind(...Object.values(o)).run();
const n = async (tabel, where = "1", ...ikat) => (await DB.prepare(`SELECT count(*) n FROM ${tabel} WHERE ${where}`).bind(...ikat).first()).n;
let ipN = 0, kidN = 0;
const ipBaru = () => ({"cf-connecting-ip": `192.0.2.${++ipN % 250}`});
const kid = () => "kid" + String(++kidN).padStart(8, "0");
const P = "/api/laporan-karhutla/";

/* ---------------- pelaku: akun pemprov aktif (masuk lewat rute sungguhan), staf berperan, admin ---------------- */
const SANDI = "SandiUji123456";
const NAMA = {"62": "Kalteng", "63": "Kalsel", "61": "Kalbar", "16": "Sumsel", "15": "Jambi", "14": "Riau", "11": "Aceh"};
const pemprov = async (kode, o = {}) => {
  const garam = "c".repeat(32), id = id16(), username = "pemprov" + NAMA[kode].toLowerCase() + id.slice(0, 4);
  await sisip("instansi_akun", {id, username, jenis: "pemprov", tingkat: "prov", wilayah: "Provinsi " + NAMA[kode], kunci_wilayah: "k" + id, cakupan: JSON.stringify([kode]), prov: null, kab: null, garam, sandi_sha: sha256(garam + SANDI),
    status: "aktif", nama: "Budi", nip: "198001012005011001", jabatan: "Kalak", unit: "BPBD Provinsi", email: "budi@contoh.go.id", wa: "6281234500" + kode, surat: 1, kartu: 1, dikirim: 1, diputus: 1, wajib_ganti: 0,
    dibuat: Date.now() - 3 * HARI, dummy: 0, ...o});
  const m = await api("POST", "/api/instansi/masuk", {username, sandi: SANDI}, {...PB, ...ipBaru()}); assert.equal(m.s, 200, m.t);
  const cookie = m.h.get("set-cookie").split(";")[0];
  return {id, pemprov: true, h: {cookie}, hp: {cookie, ...PB}};
};
let nipN = 0;
const staf = async (nama, peran) => {
  const r = await api("POST", "/api/staf/admin/buat", {nama, nip: `19970${++nipN}0012005`, unit: "Pusdalops BNPB", email: `lk${nipN}@bnpb.go.id`, wa: "081234567890", peran, wilayah: []}, ADMIN); assert.equal(r.s, 201, r.t);
  const m = await api("POST", "/api/staf/masuk", {username: r.j.username, sandi: r.j.sandi}, ipBaru()); assert.equal(m.s, 200, m.t);
  const cookie = m.h.get("set-cookie").split(";")[0]; assert.equal((await api("POST", "/api/staf/gantisandi", {}, {cookie, ...PB})).s, 200);
  return {h: {cookie}, hp: {cookie, ...PB}};
};
/* cookie sesi instansi hanya terkirim ke /instansi dan /api/instansi: operator provinsi memakai alias /api/instansi/laporan/{kiriman,draf,kirim} (handler sama) */
const via = (a, j) => a.pemprov && /^\/api\/laporan-karhutla\/(draf|kirim|kiriman)(\?|$)/.test(j) ? j.replace("/api/laporan-karhutla/", "/api/instansi/laporan/") : j;
const GET = (a, j) => api("GET", via(a, j), undefined, a.h), POST = (a, j, b) => api("POST", via(a, j), b, a.hp);
const AD = {h: ADMIN, hp: ADMIN};

/* ---------------- bantuan alur ---------------- */
const kirim = (a, tanggal, sumber, isi, dasar = 0, extra = {}) => POST(a, P + "kirim", {tanggal, sumber, isi, versi_dasar: dasar, klien_id: kid(), ...extra});
const setuju = async (tanggal, sumber, versi, a = AD) => POST(a, P + "verifikasi", {tanggal, sumber, aksi: "setujui", versi});
const prio = (tanggal, provinsi) => POST(AD, P + "prioritas", {tanggal, provinsi});
const hari = async tanggal => (await GET(AD, P + "hari?tanggal=" + tanggal)).j;
const snap = async (tanggal, q = "") => GET(AD, P + "snapshot/" + tanggal + q);
const hampir = (a, b) => assert.ok(Math.abs(a - b) < 0.005, `${a} bukan ${b}`);
const tot = (fs, fs_padam, target_ha, padam_ha) => ({fs, fs_padam, target_ha, padam_ha});
const UDARA = {armada: [{prov: "62", pemilik: "BNPB", jenis: "heli", registrasi: "PK-SNK", status: "operasi"}, {prov: "63", pemilik: "KLHK", jenis: "heli", registrasi: "PK-TDK", status: "tidak_terbang", alasan: "visibilitas"}],
  sortie: [{jenis: "wb", registrasi: "PK-SNK", jam_mulai: "08:15", provs: ["62", "63"], lintas: true, bom: 6, liter: 3000, padam_ha: 2.5}, {jenis: "patroli", registrasi: "PK-AAA", jam_mulai: "09:00", provs: ["62"], durasi_menit: 90, temuan_fs: 2, temuan_ha: 1.2}]};
const OMC = {sortie: [{registrasi: "PK-OMC", jam_mulai: "10:00", bahan: "dry_ice", kg: 800, sasaran: ["Kapuas"], provs: ["62"]}], hasil: [{sasaran: "Kapuas", hujan: "ya", curah_mm: 5}]};
const DATA = {   // laporan 21 Okt 2026, angka per provinsi data 20 Okt (pesan pemilik dan SOP)
  "62": {total: tot(98, 38, 431.66, 110.31), blok: [{kawasan: "Di luar TNTP", ...tot(46, 33, 74.77, 58.31)}, {kawasan: "TNTP", ...tot(52, 5, 356.89, 52)}], hotspot: {total: 2083}, personel: {total: 16387, shift: "2 shift + standby", keterangan: "Termasuk 2 shift dan standby"}},
  "63": {total: tot(32, 28, 61.14, 57.42), hotspot: {total: 896}, personel: {total: 7927}},
  "61": {total: tot(6, 5, 16.79, 14.6), hotspot: {total: 14}, personel: {total: 14458}},
  "16": {total: tot(96, 84, 375.25, 291.25), hotspot: {total: 1055}, personel: {total: 12285}},
  "15": {total: tot(29, 18, 98.5, 28.5), hotspot: {total: 77}, personel: {total: 5984}},
  "14": {total: tot(0, 0, 0, 0), hotspot: {total: 4}, personel: {total: 14837}},
};
let A = {}, V, SU, ST, SO, PM, SPIM;   // A[kode] = akun pemprov; V verifikator; SU udara; ST tmc; SO koordalops; PM pimpinan

/* ================================================================ skema */
uji("migrasi 0032 idempoten; CHECK dan trigger menahan sumber liar, riwayat dan snapshot beku, hari terkunci tidak dibuka, FS dengan provinsi salah", async () => {
  const sql = teks("migrations/0032_laporan_karhutla.sql");
  for (let i = 0; i < 2; i++) await DB.batch(pecah(sql).map(s => DB.prepare(s)));
  const pr = '["62"]', k = (o = {}) => sisip("lk_kiriman", {tanggal_laporan: "2026-01-01", sumber: "udara", status: "draf", versi: 1, isi: "{}", pengirim: "uji", diubah: 1, ...o});
  await assert.rejects(() => k({sumber: "prov:6"}), /CHECK/); await assert.rejects(() => k({sumber: "prov:ab"}), /CHECK/); await assert.rejects(() => k({sumber: "gudang"}), /CHECK/);
  await assert.rejects(() => k({status: "selesai"}), /CHECK/); await assert.rejects(() => k({isi: "bukan json"}), /CHECK/); await assert.rejects(() => k({status: "disetujui"}), /CHECK/, "disetujui tanpa verifikator");
  await k({sumber: "prov:62"});
  await assert.rejects(() => sisip("lk_hari", {tanggal_laporan: "21-10-2026", prioritas: pr, dibuat: 1}), /CHECK/);
  await assert.rejects(() => sisip("lk_hari", {tanggal_laporan: "2026-01-02", prioritas: "[]", dibuat: 1}), /CHECK/);
  await assert.rejects(() => sisip("lk_hari", {tanggal_laporan: "2026-01-02", prioritas: pr, status: "dikunci", dibuat: 1}), /CHECK/, "dikunci wajib berhash");
  await sisip("lk_hari", {tanggal_laporan: "2026-01-02", prioritas: pr, status: "dikunci", hash: "a".repeat(64), dikunci_oleh: "uji", dikunci_pada: 1, dibuat: 1});
  await assert.rejects(() => DB.prepare("UPDATE lk_hari SET status = 'terbuka' WHERE tanggal_laporan = '2026-01-02'").run(), /sudah dikunci/);
  await assert.rejects(() => DB.prepare("UPDATE lk_hari SET prioritas = '[\"61\"]' WHERE tanggal_laporan = '2026-01-02'").run(), /sudah dikunci/);
  await DB.prepare("UPDATE lk_hari SET ralat = 1, hash = ? WHERE tanggal_laporan = '2026-01-02'").bind("b".repeat(64)).run();   // ralat boleh menggeser hash terbaru
  const v = {tanggal_laporan: "2026-01-01", sumber: "udara", versi: 1, aksi: "draf", status: "draf", isi: "{}", oleh: "uji", waktu: 1};
  await sisip("lk_versi", v);
  await assert.rejects(() => sisip("lk_versi", v), /UNIQUE/); await assert.rejects(() => sisip("lk_versi", {...v, versi: 2, klien_id: "klien0001"}).then(() => sisip("lk_versi", {...v, versi: 3, klien_id: "klien0001"})), /UNIQUE/);
  await assert.rejects(() => DB.prepare("UPDATE lk_versi SET isi = '{\"a\":1}'").run(), /hanya bisa ditambah/); await assert.rejects(() => DB.prepare("DELETE FROM lk_versi WHERE dummy = 0").run(), /hanya bisa ditambah/);
  const sn = {tanggal_laporan: "2026-01-02", ralat: 0, hash: "c".repeat(64), isi: "{}", oleh: "uji", waktu: 1};
  await sisip("lk_snapshot", sn);
  await assert.rejects(() => sisip("lk_snapshot", {...sn, ralat: 1}), /CHECK/, "ralat wajib beralasan");
  await assert.rejects(() => DB.prepare("UPDATE lk_snapshot SET isi = '{\"x\":1}'").run(), /beku/); await assert.rejects(() => DB.prepare("DELETE FROM lk_snapshot WHERE dummy = 0").run(), /beku/);
  const fs = {fs_id: "FS-62-20261019-007", tanggal_laporan: "2026-01-01", prov: "62", target_ha: 5, padam_ha: 1, sisa_ha: 4, status: "menyala"};
  await sisip("lk_fs", fs);
  await assert.rejects(() => sisip("lk_fs", {...fs, prov: "63"}), /CHECK/, "fs_id memuat provinsi");
  await assert.rejects(() => sisip("lk_fs", {...fs, fs_id: "XX-62-20261019-008"}), /CHECK/);
  await assert.rejects(() => sisip("lk_fs", {...fs, fs_id: "FS-62-20261019-008", status: "hilang"}), /CHECK/);
  await sisip("lk_fs", {...fs, tanggal_laporan: "2026-01-02", tugas_id: "a".repeat(16)});
  await assert.rejects(() => sisip("lk_fs", {...fs, fs_id: "FS-62-20261019-009", tanggal_laporan: "2026-01-02", tugas_id: "a".repeat(16)}), /UNIQUE/, "satu tugas satu FS per hari");
});   // baris 2026-01-0x tertinggal (riwayat dan snapshot beku): tidak mengganggu tanggal uji lain

uji("spek bersama: angka gaya Indonesia, sisa dihitung, daftar tetap sama dengan skema dan inventaris", async () => {
  assert.equal(S.angkaID("1.234,56"), 1234.56); assert.equal(S.angkaID("2.083"), 2083); assert.equal(S.angkaID("74,77"), 74.77); assert.equal(S.angkaID("  "), null); assert.ok(Number.isNaN(S.angkaID("1,2,3"))); assert.ok(Number.isNaN(S.angkaID("abc")));
  const {isi, galat} = S.normalisasiProvinsi({fs: [{kab: "Kapuas", target_ha: "10,5", padam_darat_ha: "4", padam_udara_ha: 1, status: "menyala"}]}, {kode: "62", tanggal_laporan: "2026-10-12"}, true);
  assert.deepEqual(galat.filter(g => !/total|personel/.test(g.jalur)), []);
  assert.equal(isi.fs[0].sisa_ha, 5.5, "sisa dihitung dari target dikurangi padam darat dan udara"); assert.equal(isi.fs[0].fs_id, "FS-62-20261011-001", "FS baru diberi identitas tetap dari tanggal data");
  assert.deepEqual(isi.total.dihitung, true, "tanpa total diisi, total dari baris");
  assert.ok(S.normalisasiProvinsi({fs: [{target_ha: "abc"}]}, {kode: "62", tanggal_laporan: "2026-10-12"}).galat.some(g => g.jalur === "fs[0].target_ha"));
  assert.ok(S.normalisasiProvinsi({fs: [{fs_id: "FS-63-20261011-001"}]}, {kode: "62", tanggal_laporan: "2026-10-12"}).galat.some(g => g.jalur === "fs[0].fs_id"), "fs_id provinsi lain");
  assert.equal(S.tanggalData("2026-10-21"), "2026-10-20"); assert.deepEqual(S.sumberWajib(["62"]), ["prov:62", "udara", "omc"]); assert.deepEqual(S.PRIORITAS_BAWAAN, ["62", "63", "61", "16", "15", "14"]);   // urutan laporan asli BNPB
  assert.deepEqual(S.STATUS_KIRIMAN, [...teks("migrations/0032_laporan_karhutla.sql").match(/status IN \('draf', 'terkirim', 'dikembalikan', 'disetujui'\)/)[0].matchAll(/'(\w+)'/g)].map(m => m[1]));
  assert.deepEqual([...S.KATEGORI_ALAT].sort(), Object.keys(KATEGORI).sort(), "kategori peralatan sama dengan inventaris");
  const s0 = teks("public/laporan_karhutla_spek.js"); assert.ok(!/ · /.test(s0) && !/ · /.test(teks("public/laporan_karhutla_wa.js")), "tanpa titik pemisah");
});

uji("pelaku disiapkan: akun pemprov, staf berperan", async () => {
  for (const k of ["62", "63", "61", "16", "15", "14", "11"]) A[k] = await pemprov(k);
  V = await staf("Verifikator", ["verifikator"]); SU = await staf("Udara", ["udara"]); ST = await staf("TMC", ["tmc"]); SO = await staf("Koordalops", ["koordalops"]); PM = await staf("Pimpinan", ["pimpinan"]); SPIM = await staf("Pusdalops", ["pusdalops"]);
  assert.ok(V.hp.cookie);
});

/* ================================================================ dummy (sebelum putar ulang: tanggal 21 Okt dipakai bersama) */
uji("dummy: hanya Super Admin; satu hari penuh laporan 21 Okt dari data nyata; bisa dikunci; hapus bersih", async () => {
  assert.equal((await POST(V, P + "dummy", {aksi: "isi"})).s, 403, "staf bukan Super Admin"); assert.equal((await api("POST", P + "dummy", {aksi: "isi"}, GERBANG)).s, 403);
  assert.equal((await POST(AD, P + "dummy", {aksi: "salah"})).s, 400);
  const r = await POST(AD, P + "dummy", {aksi: "isi"}); assert.equal(r.s, 201, r.t); assert.equal(r.j.kiriman, 9);
  assert.equal((await POST(AD, P + "dummy", {aksi: "isi"})).s, 409, "dua kali ditolak");
  const h = await hari("2026-10-21"); assert.equal(h.dummy, 1); assert.equal(h.status, "lengkap"); assert.ok(h.kiriman.every(k => k.status === "disetujui"));
  assert.equal(await n("lk_kiriman", "dummy = 0 AND tanggal_laporan = '2026-10-21'"), 0, "semua baris dummy bertanda");
  assert.equal((await POST(V, P + "kunci", {tanggal: "2026-10-21"})).s, 409, "aktor nyata di hari dummy ditolak");
  const kunci = await POST(AD, P + "kunci", {tanggal: "2026-10-21"});   // Super Admin pemilik hari dummy assert.equal(kunci.s, 201, kunci.t);
  const s = (await snap("2026-10-21")).j; hampir(s.snapshot.nasional.fs_ha.target_ha, 983.34); assert.equal(s.snapshot.nasional.fs_ha.fs, 261); assert.equal(s.snapshot.nasional.hotspot.total, 4129);
  assert.equal(s.snapshot.nasional.hotspot.tinggi, 281); assert.equal(s.snapshot.nasional.hotspot.sedang, 3848); assert.equal(s.snapshot.nasional.personel.total, 71878);
  assert.equal(s.snapshot.udara.water_bombing.sortie, 0, "udara kosong jujur, tanpa angka karangan"); assert.match(s.snapshot.udara.alasan_kosong, /tidak ada di data sumber/);
  const del = await POST(AD, P + "dummy", {aksi: "hapus"}); assert.equal(del.s, 200); assert.equal(del.j.hari, 1);
  for (const t of ["lk_hari", "lk_kiriman", "lk_versi", "lk_snapshot", "lk_fs"]) assert.equal(await n(t, "dummy = 1"), 0, t);
  assert.equal((await snap("2026-10-21")).s, 404);
});

/* ================================================================ kunci */
uji("kunci ditolak saat belum lengkap; diterima dengan lanjut-tanpa beralasan yang tercetak dengan data terakhir", async () => {
  assert.equal((await prio("2026-10-06", ["62"])).s, 200);
  const o6 = await kirim(ST, "2026-10-06", "omc", OMC); assert.equal(o6.s, 201, o6.t);   // OMC hari sebelumnya: data terakhir yang dibawa
  assert.equal((await prio("2026-10-07", ["62"])).s, 200); assert.equal((await prio("2026-10-07", ["62", "63"])).s, 200); assert.equal((await prio("2026-10-07", ["62"])).s, 200);
  const k0 = await POST(V, P + "kunci", {tanggal: "2026-10-07"}); assert.equal(k0.s, 409); assert.deepEqual(k0.j.belum.map(b => b.sumber), ["prov:62", "udara", "omc"]); assert.ok(k0.j.belum.every(b => b.status === "belum"));
  const p = await kirim(A["62"], "2026-10-07", "prov:62", DATA["62"]); assert.equal(p.s, 201, p.t); assert.equal((await setuju("2026-10-07", "prov:62", 1)).s, 200);
  const u = await kirim(SU, "2026-10-07", "udara", UDARA); assert.equal(u.s, 201);
  const k1 = await POST(V, P + "kunci", {tanggal: "2026-10-07"}); assert.equal(k1.s, 409, "udara terkirim tetapi belum disetujui"); assert.deepEqual(k1.j.belum.map(b => [b.sumber, b.status]), [["udara", "terkirim"], ["omc", "belum"]]);
  assert.equal((await setuju("2026-10-07", "udara", 1)).s, 200);
  assert.equal((await POST(V, P + "kunci", {tanggal: "2026-10-07", lanjut_tanpa: [{sumber: "omc", alasan: "singkat"}]})).s, 400, "alasan minimal 10 huruf");
  assert.equal((await POST(V, P + "kunci", {tanggal: "2026-10-07", lanjut_tanpa: [{sumber: "prov:99", alasan: "Provinsi ini tidak wajib hari ini"}]})).s, 400, "hanya sumber wajib");
  assert.equal((await POST(PM, P + "kunci", {tanggal: "2026-10-07", lanjut_tanpa: [{sumber: "omc", alasan: "Pimpinan tidak boleh mengunci"}]})).s, 403);
  assert.equal((await POST(A["62"], P + "kunci", {tanggal: "2026-10-07"})).s, 404, "operator provinsi tidak mengunci");
  const k = await POST(V, P + "kunci", {tanggal: "2026-10-07", lanjut_tanpa: [{sumber: "omc", alasan: "OMC tidak beroperasi karena awan tertutup"}]}); assert.equal(k.s, 201, k.t); assert.equal(k.j.status, "dikunci_pengecualian");
  assert.deepEqual(k.j.pengecualian, [{sumber: "omc", label: "OMC", alasan: "OMC tidak beroperasi karena awan tertutup", data_terakhir: "2026-10-06"}]);
  const s = (await snap("2026-10-07")).j; assert.equal(s.snapshot.status, "dikunci_pengecualian"); assert.equal(s.snapshot.omc.data_terakhir, "2026-10-06"); assert.equal(s.snapshot.omc.sortie, 1);
  assert.ok(s.teks_wa.laporan_karhutla.includes("_Catatan: OMC, data terakhir 6 Okt 2026 (OMC tidak beroperasi karena awan tertutup)_"), s.teks_wa.laporan_karhutla.slice(-300));
  assert.ok(s.snapshot.kesimpulan.some(x => x.includes("data terakhir 2026-10-06")));
  assert.equal((await hari("2026-10-07")).status, "dikunci_pengecualian");
  /* sesudah dikunci: tidak ada jalan masuk selain ralat */
  assert.equal((await kirim(A["62"], "2026-10-07", "prov:62", DATA["62"], 2)).s, 409); assert.equal((await POST(V, P + "kunci", {tanggal: "2026-10-07"})).s, 409); assert.equal((await prio("2026-10-07", ["62", "63"])).s, 409);
  assert.equal((await POST(V, P + "verifikasi", {tanggal: "2026-10-07", sumber: "udara", aksi: "kembalikan", catatan: "tidak bisa", versi: 1})).s, 409);
  await assert.rejects(() => DB.prepare("UPDATE lk_hari SET status = 'terbuka' WHERE tanggal_laporan = '2026-10-07'").run(), /sudah dikunci/);
  assert.equal((await POST(V, P + "ralat", {tanggal: "2026-10-06", alasan: "Hari belum dikunci sama sekali", ganti: {omc: OMC}})).s, 409, "ralat hanya untuk hari terkunci");
});

/* ================================================================ putar ulang laporan 21 Okt 2026 */
uji("putar ulang laporan 21 Okt: snapshot target 983,34 ha, padam 502,08 ha, belum padam 481,26 ha, 261 FS; Kalteng memisah TNTP; sortie PK-SNK dihitung sekali", async () => {
  for (const [kode, d] of Object.entries(DATA)) {
    const r = await kirim(A[kode], "2026-10-21", "prov:" + kode, d); assert.equal(r.s, 201, kode + r.t); assert.equal(r.j.hitung.merah, 0, kode + JSON.stringify(r.j.cek));
    assert.equal((await setuju("2026-10-21", "prov:" + kode, r.j.versi, V)).s, 200);
  }
  assert.equal((await POST(V, P + "kunci", {tanggal: "2026-10-21"})).s, 409, "udara dan OMC wajib belum ada");
  const u = await kirim(SU, "2026-10-21", "udara", UDARA); assert.equal(u.s, 201, u.t); assert.equal((await setuju("2026-10-21", "udara", 1, SPIM)).s, 200);
  const o = await kirim(ST, "2026-10-21", "omc", OMC); assert.equal(o.s, 201, o.t); assert.equal((await setuju("2026-10-21", "omc", 1, V)).s, 200);
  const kz = await kirim(SO, "2026-10-21", "koordalops", {kejadian: [{prov: "Sumatera Utara", kab: "Langkat", luas_ha: 3.2}], hotspot_nasional: {total: 4129, tinggi: 281, sedang: 3848}}); assert.equal(kz.s, 201, kz.t); assert.equal((await setuju("2026-10-21", "koordalops", 1, V)).s, 200);
  const hs = await hari("2026-10-21"); assert.equal(hs.status, "lengkap");
  const k = await POST(V, P + "kunci", {tanggal: "2026-10-21"}); assert.equal(k.s, 201, k.t); assert.equal(k.j.status, "dikunci");
  const r = await snap("2026-10-21"); assert.equal(r.s, 200, r.t); const s = r.j.snapshot;
  assert.equal(r.j.utuh, true); assert.equal(r.j.hash, k.j.hash); assert.equal(r.j.hash, sha256(JSON.stringify(s)));
  hampir(s.nasional.fs_ha.target_ha, 983.34); hampir(s.nasional.fs_ha.padam_ha, 502.08); hampir(s.nasional.fs_ha.sisa_ha, 481.26); assert.equal(s.nasional.fs_ha.fs, 261);
  assert.equal(s.tanggal_data, "2026-10-20"); assert.equal(s.tanggal_laporan, "2026-10-21");
  const kalteng = s.provinsi.find(p => p.kode === "62"); assert.deepEqual(kalteng.blok.map(b => [b.kawasan, b.target_ha, b.padam_ha, b.sisa_ha, b.fs]), [["Di luar TNTP", 74.77, 58.31, 16.46, 46], ["TNTP", 356.89, 52, 304.89, 52]]);
  hampir(kalteng.total.target_ha, 431.66); hampir(kalteng.total.sisa_ha, 321.35); assert.equal(kalteng.total.fs_sisa, 60);
  const wil = Object.fromEntries(s.wilayah.map(w => [w.wilayah, w])); hampir(wil.Kalimantan.target_ha, 61.14 + 16.79 + 431.66); hampir(wil.Sumatera.target_ha, 375.25 + 98.5);
  assert.deepEqual([s.nasional.hotspot.total, s.nasional.hotspot.tinggi, s.nasional.hotspot.sedang, s.nasional.personel.total], [4129, 281, 3848, 71878]);
  assert.equal(s.udara.water_bombing.sortie, 1, "PK-SNK lintas Kalteng dan Kalsel dihitung sekali di total nasional"); assert.equal(s.udara.water_bombing.lintas_provinsi, 1);
  assert.equal(s.udara.water_bombing.bom, 6); assert.deepEqual([s.udara.per_provinsi["62"].wb, s.udara.per_provinsi["63"].wb], [1, 1], "tiap provinsi tetap melihat sortienya");
  assert.equal(s.udara.patroli.sortie, 1); assert.equal(s.omc.sortie, 1); assert.equal(s.omc.kg_total, 800); assert.equal(s.omc.per_bahan.dry_ice.kg, 800);
  assert.equal(s.di_luar_prioritas.kejadian[0].kab, "Langkat");
  for (const kunci of ["A1_fs_per_provinsi", "A2_rincian_fs", "A3_personel", "A4_peralatan", "A5_kondisi_wilayah", "A6_hambatan_upaya", "A7_kedaruratan", "A8_armada_udara", "A9_water_bombing_patroli", "A10_omc", "A11_di_luar_prioritas",
    "B1_hotspot_provinsi", "B2_tren_hotspot", "B3_konsesi_gambut", "B4_konsesi_terindikasi", "B5_riwayat_tahunan"]) assert.ok(Object.hasOwn(s.lampiran, kunci), kunci);
  assert.equal(s.lampiran.B3_konsesi_gambut, null, "tanpa aset: null jujur, bukan angka karangan"); assert.equal(s.lampiran.B2_tren_hotspot?.length ?? 6, 6);
  assert.ok(s.kesimpulan[0].includes("261"));
  assert.deepEqual(s.riwayat.map(x => x.tanggal_laporan), ["2026-10-07"], "tiga hari dibaca dari snapshot yang sudah beku, bukan dihitung ulang"); assert.deepEqual(s.tiga_hari.map(x => x.tanggal_laporan), ["2026-10-07", "2026-10-21"]);
  hampir(s.tiga_hari[0].nasional.target_ha, 431.66); hampir(s.tiga_hari[1].nasional.target_ha, 983.34);
  /* teks WA deterministik, hanya dari snapshot */
  const w = r.j.teks_wa; assert.deepEqual(w, teksWA(JSON.parse(JSON.stringify(s))), "deterministik"); assert.deepEqual(Object.keys(w), ["laporan_karhutla", "gelar_pesawat", "rekap_dry_ice", "hasil_hujan_omc"]);
  assert.ok(w.laporan_karhutla.includes("*LAPORAN KARHUTLA*") && w.laporan_karhutla.includes("_21 Oktober 2026_") && w.laporan_karhutla.includes("20 Oktober 2026"), "judul dan tanggal laporan dan data");
  assert.ok(w.laporan_karhutla.includes("261 FS") && w.laporan_karhutla.includes("983,34 ha") && w.laporan_karhutla.includes("502,08 ha") && w.laporan_karhutla.includes("481,26 ha") && w.laporan_karhutla.includes("TNTP") && w.laporan_karhutla.includes("356,89"));
  assert.ok(w.rekap_dry_ice.includes("800 kg") && w.gelar_pesawat.includes("1 sortie") && /belum membuktikan/.test(w.hasil_hujan_omc) && /sebab-akibat/.test(w.hasil_hujan_omc));
  for (const t of Object.values(w)) assert.ok(!t.includes(" · ") && !/undefined|NaN/.test(t), t);
  assert.equal((await api("GET", "/api/laporan-karhutla/snapshot/2026-10-21?ralat=abc", undefined, ADMIN)).s, 400); assert.equal((await snap("2026-10-21", "?ralat=7")).s, 404); assert.equal((await snap("2026-10-22")).s, 404, "belum dikunci");
});

uji("dummy menolak bila 21 Okt nyata sudah ada, dan hapus dummy tidak menyentuh data nyata", async () => {
  assert.equal((await POST(AD, P + "dummy", {aksi: "isi"})).s, 409); const sebelum = await n("lk_kiriman");
  assert.equal((await POST(AD, P + "dummy", {aksi: "hapus"})).s, 200); assert.equal(await n("lk_kiriman"), sebelum); assert.equal((await snap("2026-10-21")).s, 200);
});

/* ================================================================ ralat */
uji("ralat: snapshot baru, snapshot lama utuh dan bisa dibuka, daftar angka berubah tercetak", async () => {
  const lama = (await snap("2026-10-21")).j, tinggi = {...DATA["63"], total: tot(32, 29, 61.14, 58.0)};
  assert.equal((await POST(V, P + "ralat", {tanggal: "2026-10-21", alasan: "pendek", ganti: {"prov:63": tinggi}})).s, 400, "alasan minimal 10 huruf");
  assert.equal((await POST(V, P + "ralat", {tanggal: "2026-10-21", alasan: "Koreksi padam Kalsel dari Pusdalops", ganti: {}})).s, 400);
  assert.equal((await POST(V, P + "ralat", {tanggal: "2026-10-21", alasan: "Koreksi tanpa perubahan angka", ganti: {"prov:63": DATA["63"]}})).s, 400, "tidak mengubah angka apa pun");
  assert.equal((await POST(PM, P + "ralat", {tanggal: "2026-10-21", alasan: "Koreksi padam Kalsel dari Pusdalops", ganti: {"prov:63": tinggi}})).s, 403, "pimpinan hanya membaca");
  const r = await POST(V, P + "ralat", {tanggal: "2026-10-21", alasan: "Koreksi padam Kalsel dari Pusdalops", ganti: {"prov:63": tinggi}}); assert.equal(r.s, 201, r.t); assert.equal(r.j.ralat, 1);
  assert.ok(r.j.perubahan.some(p => p.jalur.includes("padam_ha") && p.baru === 58 && p.lama === 57.42), JSON.stringify(r.j.perubahan.slice(0, 5)));
  const nol = (await snap("2026-10-21", "?ralat=0")).j, baru = (await snap("2026-10-21")).j;
  assert.equal(nol.hash, lama.hash, "ralat 0 tidak berubah"); assert.deepEqual(nol.snapshot, lama.snapshot); assert.equal(nol.terbaru, false);
  assert.equal(baru.ralat, 1); assert.equal(baru.terbaru, true); assert.notEqual(baru.hash, lama.hash); assert.equal(baru.utuh, true); assert.equal(baru.snapshot.ralat, 1); assert.equal(baru.alasan_ralat, "Koreksi padam Kalsel dari Pusdalops");
  hampir(baru.snapshot.nasional.fs_ha.padam_ha, 502.08 + 0.58); assert.deepEqual(baru.ralat_tersedia.map(x => x.ralat), [0, 1]);
  assert.equal((await hari("2026-10-21")).ralat, 1);
  await assert.rejects(() => DB.prepare("UPDATE lk_snapshot SET isi = '{}' WHERE ralat = 0").run(), /beku/);
  assert.equal((await POST(V, P + "ralat", {tanggal: "2026-10-01", alasan: "Hari belum ada sama sekali", ganti: {"prov:63": tinggi}})).s, 404);
});

/* ================================================================ cek merah dan kuning */
uji("merah menahan setujui dan kunci: padam melebihi target, sisa salah, FS tanpa kab, total beda baris, sortie dua provinsi", async () => {
  assert.equal((await prio("2026-10-05", ["62"])).s, 200);
  const fs = [{kab: "Kapuas", target_ha: 5, padam_darat_ha: 8, padam_udara_ha: 0, status: "menyala"}, {kab: "", target_ha: 4, padam_darat_ha: 1, padam_udara_ha: 0, sisa_ha: 9, status: "menyala"}];
  const r = await kirim(A["62"], "2026-10-05", "prov:62", {fs, total: tot(2, 0, 20, 9), personel: {total: 1000}}); assert.equal(r.s, 201, r.t);
  const kode = r.j.cek.filter(c => c.t === "merah").map(c => c.k); for (const w of ["padam_lebih_target", "sisa_salah", "fs_tanpa_kab", "total_beda_baris"]) assert.ok(kode.includes(w), w + " tidak ada di " + kode);
  const ap = await setuju("2026-10-05", "prov:62", 1); assert.equal(ap.s, 422); assert.ok(ap.j.merah.length >= 4);
  const kb = await POST(V, P + "verifikasi", {tanggal: "2026-10-05", sumber: "prov:62", aksi: "kembalikan", catatan: "", versi: 1}); assert.equal(kb.s, 400, "catatan pengembalian wajib");
  assert.equal((await POST(V, P + "verifikasi", {tanggal: "2026-10-05", sumber: "prov:62", aksi: "kembalikan", catatan: "Padam melebihi target, mohon dibetulkan", versi: 1})).s, 200);
  const kir = (await GET(A["62"], P + "kiriman?tanggal=2026-10-05&sumber=prov:62")).j; assert.equal(kir.status, "dikembalikan"); assert.equal(kir.catatan, "Padam melebihi target, mohon dibetulkan");
  /* sortie dua provinsi tanpa tanda lintas, dan sortie tercatat dua kali */
  const ud = await kirim(SU, "2026-10-05", "udara", {sortie: [{jenis: "wb", registrasi: "PK-SNK", jam_mulai: "08:00", provs: ["62", "63"], bom: 4}, {jenis: "wb", registrasi: "PK-ABC", jam_mulai: "09:00", provs: ["62"], bom: 2}, {jenis: "wb", registrasi: "PK-ABC", jam_mulai: "09:00", provs: ["63"], bom: 2}]});
  assert.equal(ud.s, 201, ud.t); assert.deepEqual(ud.j.cek.filter(c => c.t === "merah").map(c => c.k).sort(), ["sortie_dua_provinsi", "sortie_ganda"]);
  assert.equal((await setuju("2026-10-05", "udara", 1)).s, 422);
  const ok = await kirim(SU, "2026-10-05", "udara", {sortie: [{jenis: "wb", registrasi: "PK-ABC", jam_mulai: "09:00", provs: ["62"], lintas: true, bom: 2}, {jenis: "wb", registrasi: "PK-ABC", jam_mulai: "09:00", provs: ["63"], lintas: true, bom: 2}]}, 1);
  assert.equal(ok.j.hitung.merah, 0, "kedua baris bertanda lintas: sah, dihitung sekali");
  /* kunci tetap tertahan walau status disetujui dipaksa lewat SQL: cek ulang di Worker */
  await DB.prepare("UPDATE lk_kiriman SET status = 'disetujui', verif_oleh = 'uji', verif_pada = 1 WHERE tanggal_laporan = '2026-10-05'").run();
  const k = await POST(V, P + "kunci", {tanggal: "2026-10-05", lanjut_tanpa: [{sumber: "omc", alasan: "OMC tidak ada pada hari uji ini"}]}); assert.equal(k.s, 422, k.t); assert.equal(k.j.sumber, "prov:62"); assert.ok(k.j.merah.length);
  assert.equal((await hari("2026-10-05")).status_tersimpan, "terbuka");
});

uji("rekonsiliasi kuning antarhari: luasan berubah, padam turun, FS hilang, personel berubah > 50%; keterangan menjelaskan", async () => {
  assert.equal((await prio("2026-10-12", ["61"])).s, 200); assert.equal((await prio("2026-10-13", ["61"])).s, 200);
  const hari1 = {fs: [{kab: "Kapuas", target_ha: 10, padam_darat_ha: 4, padam_udara_ha: 0, status: "menyala"}, {kab: "Pulang Pisau", target_ha: 5, padam_darat_ha: 5, padam_udara_ha: 0, status: "padam"}], personel: {total: 4686}};
  const r1 = await kirim(A["61"], "2026-10-12", "prov:61", hari1); assert.equal(r1.s, 201, r1.t); assert.equal(r1.j.hitung.merah, 0); assert.equal(r1.j.hitung.kuning, 0, JSON.stringify(r1.j.cek));
  const db = (await DB.prepare("SELECT fs_id, sisa_ha, padam_ha FROM lk_fs WHERE tanggal_laporan = '2026-10-12' AND prov = '61' ORDER BY fs_id").all()).results;
  assert.deepEqual(db.map(f => [f.fs_id, f.sisa_ha]), [["FS-61-20261011-001", 6], ["FS-61-20261011-002", 0]], "FS terkirim jadi baris relasional dengan identitas tetap");
  /* draf hari berikutnya: hanya FS kemarin yang sisanya > 0, padam hari ini dikosongkan, personel disalin tak diperbarui */
  const d = (await GET(A["61"], P + "kiriman?tanggal=2026-10-13&sumber=prov:61")).j;
  assert.equal(d.ada, false); assert.equal(d.draf_otomatis, true); assert.equal(d.versi, 0); assert.equal(d.fs_kemarin, 1); assert.equal(d.isi.fs.length, 1);
  assert.deepEqual([d.isi.fs[0].fs_id, d.isi.fs[0].target_ha, d.isi.fs[0].padam_darat_ha, d.isi.fs[0].kemarin.padam_ha], ["FS-61-20261011-001", 10, null, 4]);
  assert.deepEqual([d.isi.personel.total, d.isi.personel.diperbarui], [4686, false]);
  const id = d.isi.fs[0].fs_id, A1 = (o = {}) => ({fs_id: id, kab: "Kapuas", target_ha: 12, padam_darat_ha: 7, padam_udara_ha: 0, status: "menyala", ...o});
  const r2 = await kirim(A["61"], "2026-10-13", "prov:61", {fs: [A1()], personel: {total: 16387}}); assert.equal(r2.s, 201, r2.t);
  const kuning = Object.fromEntries(r2.j.cek.filter(c => c.t === "kuning").map(c => [c.k, c])); assert.ok(kuning.luasan_berubah && !kuning.luasan_berubah.dijelaskan); assert.ok(kuning.personel_berubah && !kuning.personel_berubah.dijelaskan);
  assert.equal(r2.j.hitung.merah, 0); assert.equal(r2.j.hitung.kuning_belum_dijelaskan, 2);
  const r3 = await kirim(A["61"], "2026-10-13", "prov:61", {fs: [A1({alasan: "Api meluas ke lahan sebelah"})], personel: {total: 16387, keterangan: "Termasuk 2 shift dan standby"}}, 1);
  assert.equal(r3.s, 201, r3.t); assert.ok(r3.j.cek.filter(c => c.t === "kuning").every(c => c.dijelaskan), "keterangan menjelaskan"); assert.equal(r3.j.hitung.kuning_belum_dijelaskan, 0); assert.equal(r3.j.hitung.kuning, 2);
  const r4 = await kirim(A["61"], "2026-10-13", "prov:61", {fs: [A1({target_ha: 10, padam_darat_ha: 3})], personel: {total: 4686}}, 2); assert.ok(r4.j.cek.some(c => c.k === "padam_turun" && !c.dijelaskan), JSON.stringify(r4.j.cek));
  const r5 = await kirim(A["61"], "2026-10-13", "prov:61", {fs: [], total: tot(0, 0, 0, 0), personel: {total: 4686}}, 3); assert.ok(r5.j.cek.some(c => c.k === "fs_hilang" && c.p.includes("FS-61-20261011-001")), JSON.stringify(r5.j.cek));
  const r6 = await kirim(A["61"], "2026-10-13", "prov:61", {fs: [A1({alasan: "Api meluas ke lahan sebelah"})], personel: {total: 16387, keterangan: "Termasuk 2 shift dan standby"}}, 4); assert.equal(r6.s, 201);
  assert.equal(r6.j.versi, 5); assert.equal(await n("lk_fs", "prov = '61' AND tanggal_laporan = '2026-10-13'"), 1, "kirim ulang mengganti baris FS hari itu");
  assert.equal(await n("lk_versi", "tanggal_laporan = '2026-10-13' AND sumber = 'prov:61'"), 5, "tiap versi tersimpan, tidak menimpa");
});

uji("draf dari tugas api (api_ada), satelit, inventaris, dan personel tugas; tugas_id hanya milik provinsinya", async () => {
  /* hari 14 Okt: FS baru dari tugas yang dikonfirmasi pada jendela 13 Okt 07.00 s.d. 14 Okt 07.00 WIB; FS kemarin (A, sisa 5) ikut */
  const t = id16(), akunId = A["61"].id, tugasBaris = (id, prov, kab) => sisip("tugas_api", {id, prov, kab, kec: "Mentaya", lat: -2.2, lon: 113.9, level: 3, n24: 4, luas_ha: 8, dibuat: Date.parse("2026-10-13T05:00:00+07:00"), terakhir_terdeteksi: Date.parse("2026-10-13T06:00:00+07:00"), dummy: 0});
  const konf = (id, akun, dibuat) => sisip("tugas_isian", {id: id16(), tugas_id: id, akun_id: akun, klien_id: "konf" + id, langkah: "konfirmasi", dibuat, lat: -2.2, lon: 113.9, waktu_gps: dibuat, hasil: "api_ada", pic_nama: "Pak Joko", pic_jabatan: "Kades", pic_wa: "628123456781"});
  await tugasBaris(t, "61", "Kapuas"); await konf(t, akunId, Date.parse("2026-10-13T10:00:00+07:00"));
  await sisip("tugas_isian", {id: id16(), tugas_id: t, akun_id: akunId, klien_id: "tind" + t, langkah: "tindakan", dibuat: Date.parse("2026-10-13T12:00:00+07:00"), status_api: "menyala", luas_ha: 6.5, padam_ha: 1.5});
  const lama = id16(); await tugasBaris(lama, "61", "Barito"); await konf(lama, akunId, Date.parse("2026-10-12T10:00:00+07:00"));   // di luar jendela
  const bukanApi = id16(); await tugasBaris(bukanApi, "61", "Seruyan"); await sisip("tugas_isian", {id: id16(), tugas_id: bukanApi, akun_id: akunId, klien_id: "konf" + bukanApi, langkah: "konfirmasi", dibuat: Date.parse("2026-10-13T10:00:00+07:00"), lat: -2.2, lon: 113.9, waktu_gps: 1, hasil: "bukan_api", pic_nama: "Pak Joko", pic_jabatan: "Kades", pic_wa: "628123456781"});
  /* sampel KONTROL uji lapangan (0054): api_ada pada kunjungan sampel bukan api prioritas, jadi bukan FS baru */
  const kontrol = id16(); await tugasBaris(kontrol, "61", "Pulang Pisau"); await konf(kontrol, akunId, Date.parse("2026-10-13T10:00:00+07:00"));
  await sisip("uji_tugas", {tugas_id: kontrol, sampel: "kontrol", level: 1, firespot: "mungkin", prov: "61", minggu: "2026-W42", dibuat: Date.parse("2026-10-13T05:00:00+07:00")});
  const d = (await GET(A["61"], P + "kiriman?tanggal=2026-10-14&sumber=prov:61")).j;
  assert.equal(d.fs_baru, 1); assert.equal(d.fs_kemarin, 1); const baru = d.isi.fs.find(f => f.tugas_id === t);
  assert.deepEqual([baru.fs_id, baru.kab, baru.target_ha, baru.padam_darat_ha, baru.status], ["FS-61-20261013-001", "Kapuas", 6.5, 1.5, "menyala"], "luas dan padam dari kabar tindakan");
  assert.ok(!d.isi.fs.some(f => f.tugas_id === lama || f.tugas_id === bukanApi), "di luar jendela dan bukan api tidak masuk"); assert.ok(!d.isi.fs.some(f => f.tugas_id === kontrol), "sampel kontrol uji lapangan tidak jadi FS baru");
  /* tugas_id provinsi lain ditolak; tugas yang sama dua baris ditolak */
  const t63 = id16(); await tugasBaris(t63, "63", "Banjar"); const lengkap = f => ({...f, padam_darat_ha: f.padam_darat_ha ?? 0, padam_udara_ha: f.padam_udara_ha ?? 0});
  const salah = await kirim(A["61"], "2026-10-14", "prov:61", {fs: [lengkap({...baru, tugas_id: t63})], personel: {total: 1}}); assert.equal(salah.s, 400, salah.t); assert.match(salah.j.galat, /provinsi ini/);
  const dobel = await kirim(A["61"], "2026-10-14", "prov:61", {fs: [lengkap(baru), lengkap({...baru, fs_id: ""})], personel: {total: 1}}); assert.equal(dobel.s, 400, dobel.t);
  /* hari berikut: tugas yang sudah tertaut ke FS tidak jadi FS baru lagi */
  const ok = await kirim(A["61"], "2026-10-14", "prov:61", {fs: d.isi.fs.map(f => lengkap({...f, alasan: "diperbarui"})), personel: {total: 4686}}); assert.equal(ok.s, 201, ok.t);
  assert.equal((await DB.prepare("SELECT tugas_id FROM lk_fs WHERE tanggal_laporan = '2026-10-14' AND tugas_id = ?").bind(t).first()).tugas_id, t);
  const esok = (await GET(A["61"], P + "kiriman?tanggal=2026-10-15&sumber=prov:61")).j; assert.equal(esok.fs_baru, 0);
  /* satelit (laporan.json, hari terakhir 17 Okt), inventaris siap, personel dari tugas: provinsi 63 yang belum punya kiriman sebelumnya */
  const satelit = JSON.parse(teks("public/data/laporan.json")); const g = id16();
  await sisip("gudang", {id: g, akun_id: A["63"].id, nama: "Gudang Kalsel", jenis: "gudang", prov: "63", lat: -3.3, lon: 114.6, dibuat: 1, diubah: 1}); await sisip("alat", {id: id16(), gudang_id: g, kategori: "nozzle", jumlah: 3, dibuat: 1, diubah: 1});
  const t3 = id16(); await tugasBaris(t3, "63", "Banjar"); await sisip("tugas_isian", {id: id16(), tugas_id: t3, akun_id: A["63"].id, klien_id: "tind" + t3, langkah: "tindakan", dibuat: Date.parse("2026-10-17T10:00:00+07:00"), status_api: "menyala", personel_unsur: '{"bpbd":10,"tni":5}'});
  const s63 = (await GET(A["63"], P + "kiriman?tanggal=2026-10-18&sumber=prov:63")).j, idx = satelit.hari.indexOf("2026-10-17");
  assert.equal(s63.isi.hotspot.total, satelit.prov["63"].titik[idx]); assert.equal(s63.isi.hotspot.sumber, "GIS/satelit"); assert.deepEqual(s63.isi.peralatan, [{kategori: "nozzle", stok: 3, tambahan: 0, catatan: null}]);
  assert.deepEqual([s63.isi.personel.total, s63.isi.personel.unsur.bpbd, s63.isi.personel.unsur.tni, s63.isi.personel.diperbarui], [15, 10, 5, false]);
  await DB.prepare("DELETE FROM alat WHERE gudang_id = ?").bind(g).run(); await DB.prepare("DELETE FROM gudang WHERE id = ?").bind(g).run();
});

/* ================================================================ hak dan konflik */
uji("hak: operator provinsi hanya provinsinya (lain 404), pemkab dan tamu ditolak, staf berperan menulis sumbernya saja, pimpinan membaca", async () => {
  assert.equal((await prio("2026-10-08", ["62", "63"])).s, 200);
  const jalan = (a, sumber, tgl = "2026-10-08") => POST(a, P + "draf", {tanggal: tgl, sumber, isi: {}, versi_dasar: 0, klien_id: kid()});
  assert.equal((await jalan(A["62"], "prov:63")).s, 404, "Kalteng ke Kalsel"); assert.equal((await jalan(A["63"], "prov:62")).s, 404); assert.equal((await jalan(A["62"], "udara")).s, 404, "pemprov tidak menulis sumber pusat");
  assert.equal((await jalan(A["11"], "prov:62")).s, 404); assert.equal((await jalan(A["11"], "prov:11")).s, 409, "Aceh bukan provinsi prioritas hari itu");
  assert.equal((await GET(A["62"], P + "kiriman?tanggal=2026-10-08&sumber=prov:63")).s, 404, "tidak boleh melihat provinsi lain"); assert.equal((await GET(A["62"], P + "kiriman?tanggal=2026-10-08&sumber=udara")).s, 404);
  assert.equal((await GET(A["62"], P + "hari?tanggal=2026-10-08")).s, 403); assert.equal((await GET(A["62"], P + "snapshot/2026-10-21")).s, 403, "pemprov tidak membaca snapshot nasional");
  assert.equal((await api("POST", P + "draf", {tanggal: "2026-10-08", sumber: "prov:62", isi: {}, versi_dasar: 0}, {cookie: A["62"].h.cookie})).s, 403, "pemprov tanpa x-pb");
  assert.equal((await api("POST", P + "draf", {tanggal: "2026-10-08", sumber: "prov:62", isi: {}, versi_dasar: 0})).s, 401, "tamu"); assert.equal((await api("POST", P + "draf", {tanggal: "2026-10-08", sumber: "prov:62", isi: {}, versi_dasar: 0}, GERBANG)).s, 401, "akun gerbang situs");
  assert.equal((await api("GET", P + "hari?tanggal=2026-10-08")).s, 401);
  /* akun kabupaten tidak mengisi laporan */
  const g = "c".repeat(32), id = id16(); await sisip("instansi_akun", {id, username: "pemkabkapuaslk", jenis: "pemkab", tingkat: "kab", wilayah: "Kab Kapuas", kunci_wilayah: "kk" + id, cakupan: '["62"]', prov: "62", kab: "Kapuas", garam: g, sandi_sha: sha256(g + SANDI),
    status: "aktif", nama: "Budi", nip: "198001012005011001", jabatan: "Kalak", unit: "BPBD", email: "b@contoh.go.id", wa: "628123456789", surat: 1, kartu: 1, dikirim: 1, diputus: 1, wajib_ganti: 0, dibuat: 1, dummy: 0});
  const m = await api("POST", "/api/instansi/masuk", {username: "pemkabkapuaslk", sandi: SANDI}, {...PB, ...ipBaru()}); const kab = {h: {cookie: m.h.get("set-cookie").split(";")[0]}}; kab.hp = {...kab.h, ...PB};
  assert.equal((await jalan(kab, "prov:62")).s, 403);
  /* staf: hanya sumbernya */
  assert.equal((await jalan(SU, "udara")).s, 201); assert.equal((await jalan(SU, "omc")).s, 403); assert.equal((await jalan(ST, "omc")).s, 201); assert.equal((await jalan(ST, "udara")).s, 403); assert.equal((await jalan(SO, "koordalops")).s, 201);
  assert.equal((await jalan(SO, "prov:62")).s, 403, "staf tidak mengisi form provinsi"); assert.equal((await jalan(PM, "udara")).s, 403); assert.equal((await jalan(V, "udara")).s, 403, "verifikator tidak mengisi udara");
  assert.equal((await jalan(AD, "omc", "2026-10-08")).s, 409, "admin menulis omc: versi_dasar 0 sudah dipakai staf"); assert.equal((await jalan(AD, "prov:62")).s, 403, "moderator tidak menulis atas nama provinsi");
  /* pembacaan */
  assert.equal((await GET(PM, P + "hari?tanggal=2026-10-08")).s, 200); assert.equal((await GET(SU, P + "hari?tanggal=2026-10-08")).s, 200);
  assert.equal((await POST(PM, P + "verifikasi", {tanggal: "2026-10-08", sumber: "udara", aksi: "setujui", versi: 1})).s, 403); assert.equal((await POST(SU, P + "verifikasi", {tanggal: "2026-10-08", sumber: "udara", aksi: "setujui", versi: 1})).s, 403, "pengirim tak menyetujui diri sendiri");
  assert.equal((await POST(A["62"], P + "verifikasi", {tanggal: "2026-10-08", sumber: "udara", aksi: "setujui", versi: 1})).s, 404); assert.equal((await prio("2026-10-08", ["62"])).s, 200);
  assert.equal((await POST(PM, P + "prioritas", {tanggal: "2026-10-08", provinsi: ["62"]})).s, 403); assert.equal((await POST(V, P + "prioritas", {tanggal: "2026-10-08", provinsi: ["99"]})).s, 400);
  assert.equal((await GET(PM, P + "snapshot/2026-10-21")).s, 200, "pimpinan membaca snapshot");
  const h = (await GET(V, P + "hari?tanggal=2026-10-08")).j; assert.deepEqual(h.boleh.tulis, []); assert.equal(h.boleh.verifikasi, true); assert.ok(h.kiriman.every(k => !("isi" in k)));
  assert.deepEqual((await GET(SU, P + "hari?tanggal=2026-10-08")).j.boleh.tulis, ["udara"]);
});

uji("konflik 409: penguncian optimistis, klien_id tidak menggandakan, dua operator serentak", async () => {
  assert.equal((await prio("2026-10-09", ["62"])).s, 200);
  const draf = (dasar, k, isi = {personel: {total: 100}}) => POST(A["62"], P + "draf", {tanggal: "2026-10-09", sumber: "prov:62", isi, versi_dasar: dasar, klien_id: k});
  const a = await draf(0, "klien-satu"); assert.equal(a.s, 201); assert.equal(a.j.versi, 1);
  const ulang = await draf(0, "klien-satu"); assert.equal(ulang.s, 200); assert.equal(ulang.j.versi, 1); assert.equal(ulang.j.ulang, true); assert.equal(await n("lk_versi", "tanggal_laporan = '2026-10-09' AND sumber = 'prov:62'"), 1);
  const basi = await draf(0, "klien-dua"); assert.equal(basi.s, 409); assert.equal(basi.h.get("x-versi"), "1"); assert.match(basi.j.galat, /versi terakhir 1/);
  const dua = await draf(1, "klien-tiga", {personel: {total: 200}}); assert.equal(dua.j.versi, 2);
  const serentak = await Promise.all([draf(2, "klien-empat", {personel: {total: 300}}), draf(2, "klien-lima", {personel: {total: 400}})]);
  assert.deepEqual(serentak.map(r => r.s).sort(), [201, 409], "tepat satu menang"); assert.equal(await n("lk_versi", "tanggal_laporan = '2026-10-09' AND sumber = 'prov:62'"), 3);
  const sisa = (await GET(A["62"], P + "kiriman?tanggal=2026-10-09&sumber=prov:62")).j; assert.equal(sisa.versi, 3); assert.equal(sisa.riwayat.length, 3);
  assert.equal((await draf("x", "klien-enam")).s, 400); assert.equal((await draf(3, "pendek")).s, 400, "klien_id minimal 8");
  assert.equal((await POST(A["62"], P + "draf", {tanggal: "2026-10-09", sumber: "prov:62", isi: {fs: [{target_ha: "abc"}]}, versi_dasar: 3, klien_id: kid()})).s, 400, "bentuk salah ditolak di Worker, bukan dipercaya dari peramban");
  assert.equal((await POST(A["62"], P + "draf", {tanggal: "2099-01-01", sumber: "prov:62", isi: {}, versi_dasar: 0})).s, 400);
  /* edit sesudah kirim membuka ulang: kembali draf dan tidak dihitung terkirim */
  const k = await kirim(A["62"], "2026-10-09", "prov:62", {personel: {total: 100}, fs: [], total: tot(0, 0, 0, 0)}, 3); assert.equal(k.s, 201); assert.equal((await setuju("2026-10-09", "prov:62", 4)).s, 200);
  assert.equal((await draf(4, "klien-tujuh", {personel: {total: 120}})).j.status, "draf"); assert.equal((await hari("2026-10-09")).kiriman[0].status, "draf", "koreksi setelah disetujui menuntut kirim dan verifikasi ulang");
  assert.equal((await setuju("2026-10-09", "prov:62", 4)).s, 409, "versi lama/ status bukan terkirim");
});

/* ================================================================ cron dan pengait Meja Pantau */
uji("cron 07.01 WIB membuat hari dan draf 9 sumber, idempoten", async () => {
  const w = await mf.getWorker(), cron = menit => w.scheduled({cron: "* * * * *", scheduledTime: Date.UTC(2026, 9, 22, 0, menit)});
  await cron(1); const h = await DB.prepare("SELECT * FROM lk_hari WHERE tanggal_laporan = '2026-10-22'").first(); assert.ok(h); assert.deepEqual(JSON.parse(h.prioritas), S.PRIORITAS_BAWAAN);
  assert.equal(await n("lk_kiriman", "tanggal_laporan = '2026-10-22'"), 9); assert.equal(await n("lk_kiriman", "tanggal_laporan = '2026-10-22' AND pengirim = 'sistem' AND status = 'draf' AND versi = 1"), 9);
  await cron(31); assert.equal(await n("lk_kiriman", "tanggal_laporan = '2026-10-22'"), 9); assert.equal(await n("lk_versi", "tanggal_laporan = '2026-10-22' AND aksi = 'draf_otomatis'"), 9);
  const d = (await GET(A["62"], P + "kiriman?tanggal=2026-10-22&sumber=prov:62")).j; assert.equal(d.ada, true); assert.equal(d.versi, 1); assert.equal(d.draf_otomatis, false);
  const sebelum = await n("lk_versi"); await cron(2); assert.equal(await n("lk_versi"), sebelum, "menit lain tidak membuat apa-apa");
  /* operator mengisi di atas draf cron memakai versi 1 */
  const s = await POST(A["62"], P + "draf", {tanggal: "2026-10-22", sumber: "prov:62", isi: {personel: {total: 5}}, versi_dasar: 1, klien_id: kid()}); assert.equal(s.s, 201); assert.equal(s.j.versi, 2);
});

uji("pengait Meja Pantau: provinsi wajib belum kirim lewat 09.00 WIB jadi butir pusdalops, hilang saat terkirim", async () => {
  let kemarin = null;   // tanggal bebas dalam 6 hari terakhir (tanggal uji tetap lain sudah terpakai)
  for (let d = 1; d <= 6 && !kemarin; d++) { const t = new Date(Date.now() + 7 * JAM - d * HARI).toISOString().slice(0, 10); if (!await DB.prepare("SELECT 1 FROM lk_hari WHERE tanggal_laporan = ?").bind(t).first()) kemarin = t; }
  assert.ok(kemarin); const id = kode => `lk-belum:${kemarin}:${kode}`;
  assert.equal((await prio(kemarin, ["62", "63"])).s, 200);
  const ada = async (h, awal = "lk-belum:" + kemarin) => (await api("GET", "/api/pantau", undefined, h)).j.butir.filter(b => b.jenis === "laporan_harian" && b.id.startsWith(awal));
  const b0 = await ada(ADMIN); assert.deepEqual(b0.map(b => b.id).sort(), [id("62"), id("63")]);
  assert.match(b0[0].judul, /belum mengirim laporan harian karhutla .*lewat .* dari batas 09\.00 WIB/); assert.deepEqual(b0.find(b => b.id === id("62")).provs, ["62"]); assert.equal(b0[0].label, "Provinsi belum kirim laporan harian");
  assert.equal((await ada(SPIM.h)).length, 2, "staf pusdalops melihat"); assert.equal((await ada(SU.h)).length, 0, "staf udara tidak berperan pusdalops"); assert.equal((await ada(PM.h)).length, 2, "pimpinan melihat semua jenis");
  const r = await kirim(A["62"], kemarin, "prov:62", {fs: [], total: tot(0, 0, 0, 0), personel: {total: 10}}); assert.equal(r.s, 201, r.t);
  assert.deepEqual((await ada(ADMIN)).map(b => b.id), [id("63")], "yang sudah kirim hilang sendiri");
  assert.equal((await ada(ADMIN, "lk-belum:2026-10-21")).length, 0, "hari yang sudah dikunci tidak menagih");
  /* tagih: tautan wa.me hanya untuk verifikator dan moderator, ke PIC akun pemprov aktif */
  const th = (await GET(V, P + `hari?tanggal=${kemarin}`)).j; assert.equal(th.lewat_batas, true); assert.deepEqual(th.tagih.map(t => t.sumber), ["prov:63"], "provinsi yang sudah kirim tidak ditagih");
  assert.ok(th.tagih[0].tautan.startsWith("https://wa.me/628123450063?text=")); assert.ok(decodeURIComponent(th.tagih[0].tautan).includes("belum terkirim (batas 09.00 WIB)"));
  assert.equal((await GET(AD, P + `hari?tanggal=${kemarin}`)).j.tagih.length, 1); assert.deepEqual((await GET(PM, P + `hari?tanggal=${kemarin}`)).j.tagih, [], "pimpinan tidak menagih");
});

/* ================================================================ perbaikan hasil tinjau keamanan (21 Okt 2026) */
uji("isolasi dummy: aktor dummy tak menyentuh hari nyata (404) dan tak membuat hari; aktor nyata di hari dummy 409; cron tak menimpa hari dummy dan Meja Pantau mengingatkan", async () => {
  const dumPem = await pemprov("62", {dummy: 1});
  /* A: dummy menimpa hari nyata */
  const isiNyata = (await GET(A["62"], P + "kiriman?tanggal=2026-10-09&sumber=prov:62")).j; assert.ok(isiNyata.ada);
  const sebelum = await DB.prepare("SELECT versi, pengirim, dummy FROM lk_kiriman WHERE tanggal_laporan = '2026-10-09' AND sumber = 'prov:62'").first();
  const a1 = await kirim(dumPem, "2026-10-09", "prov:62", {personel: {total: 1}, fs: [], total: tot(0, 0, 0, 0)}, isiNyata.versi); assert.equal(a1.s, 404, a1.t);
  assert.deepEqual({...await DB.prepare("SELECT versi, pengirim, dummy FROM lk_kiriman WHERE tanggal_laporan = '2026-10-09' AND sumber = 'prov:62'").first()}, {...sebelum}, "kiriman nyata utuh");
  assert.equal((await POST(dumPem, P + "draf", {tanggal: "2026-10-09", sumber: "prov:62", isi: {}, versi_dasar: 0, klien_id: kid()})).s, 404);
  /* dummy tidak membuat hari baru */
  const a2 = await kirim(dumPem, "2026-10-04", "prov:62", {personel: {total: 1}, fs: [], total: tot(0, 0, 0, 0)}); assert.equal(a2.s, 404); assert.equal(await n("lk_hari", "tanggal_laporan = '2026-10-04'"), 0, "tidak ada hari baru dari aktor dummy");
  /* hari nyata yang dibuat aktor biasa selalu dummy = 0 */
  assert.equal((await prio("2026-10-04", ["62"])).s, 200); assert.equal((await DB.prepare("SELECT dummy FROM lk_hari WHERE tanggal_laporan = '2026-10-04'").first()).dummy, 0);
  assert.equal((await POST(dumPem, P + "prioritas", {tanggal: "2026-10-04", provinsi: ["62"]})).s, 404, "dummy pemprov bukan verifikator");
  /* B: aktor nyata di hari dummy */
  await sisip("lk_hari", {tanggal_laporan: "2026-10-02", prioritas: '["62"]', dibuat: 1, dummy: 1});
  const pesan = r => { assert.equal(r.s, 409, r.t); assert.match(r.j.galat, /berisi data contoh; Super Admin perlu menghapusnya/); };
  pesan(await kirim(A["62"], "2026-10-02", "prov:62", {personel: {total: 1}, fs: [], total: tot(0, 0, 0, 0)})); pesan(await POST(A["62"], P + "draf", {tanggal: "2026-10-02", sumber: "prov:62", isi: {}, versi_dasar: 0, klien_id: kid()}));
  pesan(await kirim(SU, "2026-10-02", "udara", UDARA)); pesan(await POST(V, P + "prioritas", {tanggal: "2026-10-02", provinsi: ["62"]}));
  pesan(await POST(V, P + "verifikasi", {tanggal: "2026-10-02", sumber: "udara", aksi: "setujui", versi: 1})); pesan(await POST(V, P + "kunci", {tanggal: "2026-10-02"}));
  pesan(await POST(V, P + "ralat", {tanggal: "2026-10-02", alasan: "ralat di hari contoh", ganti: {omc: OMC}}));
  assert.equal(await n("lk_kiriman", "tanggal_laporan = '2026-10-02'"), 0, "tak ada tulisan nyata di hari dummy");
  /* aktor dummy boleh di hari dummy; barisnya bertanda dummy */
  const d1 = await kirim(dumPem, "2026-10-02", "prov:62", {personel: {total: 5}, fs: [], total: tot(0, 0, 0, 0)}); assert.equal(d1.s, 201, d1.t);
  assert.equal((await DB.prepare("SELECT dummy FROM lk_kiriman WHERE tanggal_laporan = '2026-10-02'").first()).dummy, 1);
  /* C: cron tidak membuat draf nyata di atas hari dummy */
  /* tanggal tetap jauh di belakang: 24 Okt bertabrakan dengan hari "kemarin" yang dibuat uji lain sejak 25 Okt 2026 */
  const cron = (w, h, m) => w.scheduled({cron: "* * * * *", scheduledTime: Date.UTC(2026, 8, 14, h, m)});
  await sisip("lk_hari", {tanggal_laporan: "2026-09-14", prioritas: JSON.stringify(S.PRIORITAS_BAWAAN), dibuat: 1, dummy: 1});
  await cron(await mf.getWorker(), 0, 1); assert.equal(await n("lk_kiriman", "tanggal_laporan = '2026-09-14'"), 0, "cron melewati hari dummy"); assert.equal(await n("lk_hari", "tanggal_laporan = '2026-09-14' AND dummy = 1"), 1);
  /* Meja Pantau: butir untuk hari ini bila hari ini berisi dummy */
  const hariIni = new Date(Date.now() + 7 * JAM).toISOString().slice(0, 10);
  if (!await DB.prepare("SELECT 1 FROM lk_hari WHERE tanggal_laporan = ?").bind(hariIni).first()) {
    await sisip("lk_hari", {tanggal_laporan: hariIni, prioritas: '["62"]', dibuat: 1, dummy: 1});
    const b = (await api("GET", "/api/pantau", undefined, SPIM.h)).j.butir.filter(x => x.id === `lk-dummy:${hariIni}`); assert.equal(b.length, 1, "pusdalops nyata melihat peringatan hari dummy"); assert.match(b[0].judul, /berisi data contoh/); assert.equal(b[0].dummy ?? 0, 0);
    await DB.prepare("DELETE FROM lk_hari WHERE tanggal_laporan = ?").bind(hariIni).run();
  }
});

uji("ralat menolak merah (422); pengecualian ralat dari snapshot terakhir: ralat #2 tidak membatalkan ralat #1", async () => {
  const D = "2026-10-11", D1 = "2026-10-10";
  assert.equal((await prio(D, ["62"])).s, 200);
  assert.equal((await kirim(ST, D1, "omc", OMC)).s, 201); assert.equal((await kirim(SU, D1, "udara", UDARA)).s, 201);
  assert.equal((await kirim(A["62"], D, "prov:62", DATA["62"])).s, 201); assert.equal((await setuju(D, "prov:62", 1)).s, 200);
  const k = await POST(V, P + "kunci", {tanggal: D, lanjut_tanpa: [{sumber: "omc", alasan: "tidak ada operasi omc hari ini"}, {sumber: "udara", alasan: "tidak ada operasi udara hari ini"}]}); assert.equal(k.s, 201, k.t);
  const MERAH = {fs: [{kab: "X", target_ha: 1, padam_darat_ha: 5, padam_udara_ha: 0, status: "menyala"}], personel: {total: 10}};
  const m = await POST(V, P + "ralat", {tanggal: D, alasan: "ralat dengan angka merah sengaja", ganti: {"prov:62": MERAH}}); assert.equal(m.s, 422, m.t); assert.ok(m.j.merah.length && m.j.sumber === "prov:62");
  assert.equal((await hari(D)).ralat, 0, "tak ada ralat tertulis"); assert.equal(await n("lk_snapshot", `tanggal_laporan = '${D}'`), 1);
  const OMC2 = {...OMC, sortie: [{...OMC.sortie[0], registrasi: "PK-BARU"}]};
  const r1 = await POST(V, P + "ralat", {tanggal: D, alasan: "ralat omc nyata dari lapangan", ganti: {omc: OMC2}}); assert.equal(r1.s, 201, r1.t);
  const s1 = (await snap(D)).j.snapshot; assert.deepEqual(s1.omc.daftar.map(x => x.registrasi), ["PK-BARU"]); assert.deepEqual(s1.pengecualian.map(p => p.sumber), ["udara"]); assert.equal(s1.omc.data_terakhir, null);
  const UD2 = {...UDARA, sortie: UDARA.sortie.map(x => ({...x, bom: 99}))};
  const r2 = await POST(V, P + "ralat", {tanggal: D, alasan: "ralat udara nyata dari lapangan", ganti: {udara: UD2}}); assert.equal(r2.s, 201, r2.t);
  const s2 = (await snap(D)).j.snapshot; assert.deepEqual(s2.omc.daftar.map(x => x.registrasi), ["PK-BARU"], "ralat #1 (omc) tidak dibatalkan oleh ralat #2"); assert.equal(s2.omc.data_terakhir, null); assert.deepEqual(s2.pengecualian, []);
  assert.equal(s2.udara.water_bombing.bom, 99); assert.equal(s2.status, "dikunci");
  assert.equal((await snap(D, "?ralat=0")).j.snapshot.pengecualian.length, 2, "snapshot kunci pertama utuh");
});

uji("kunci dan ralat: tanggal di depan hari ini WIB ditolak; lanjut tanpa untuk hari ini hanya sesudah 09.00 WIB", async () => {
  const besok = new Date(Date.now() + 7 * JAM + HARI).toISOString().slice(0, 10), hariIni = new Date(Date.now() + 7 * JAM).toISOString().slice(0, 10);
  const wajib = ["prov:61", "prov:62", "prov:63", "prov:14", "prov:15", "prov:16", "udara", "omc"].map(sumber => ({sumber, alasan: "tidak ada data sama sekali"}));
  const k = await POST(V, P + "kunci", {tanggal: besok, lanjut_tanpa: wajib}); assert.equal(k.s, 400, k.t); assert.match(k.j.galat, /belum tiba/); assert.equal(await n("lk_hari", `tanggal_laporan = '${besok}' AND status != 'terbuka'`), 0, "tidak terkunci"); assert.equal(await n("lk_snapshot", `tanggal_laporan = '${besok}'`), 0);
  assert.equal((await POST(V, P + "ralat", {tanggal: besok, alasan: "ralat hari yang belum tiba", ganti: {omc: OMC}})).s, 400);
  const sudahSembilan = Date.now() >= Date.parse(hariIni + "T09:00:00+07:00"), ada = await DB.prepare("SELECT status FROM lk_hari WHERE tanggal_laporan = ?").bind(hariIni).first();
  if (!sudahSembilan && !(ada && ada.status !== "terbuka")) { const t = await POST(V, P + "kunci", {tanggal: hariIni, lanjut_tanpa: wajib}); assert.equal(t.s, 409, t.t); assert.match(t.j.galat, /09\.00 WIB/); }
  else if (sudahSembilan && !ada) { const t = await POST(V, P + "kunci", {tanggal: hariIni, lanjut_tanpa: wajib}); assert.equal(t.s, 201, t.t); }   // sesudah batas: boleh
});

uji("satu baris: whitespace dan baris baru di alasan lanjut-tanpa, alasan ralat, catatan verifikasi, dan isian spek tidak bisa menyisipkan baris WA", async () => {
  assert.equal(S.ringkas("a\nb\tc\r\n  d"), "a b c d");
  const {isi} = S.normalisasiProvinsi({...DATA["63"], personel: {total: 7927, shift: "2 shift)\n*Belum padam: 0 ha*\n(x"}, catatan: "baris1\nbaris2"}, {kode: "63", tanggal_laporan: "2026-10-12"}, true);
  assert.ok(!/[\n\t\r]/.test(isi.personel.shift) && !/[\n\t\r]/.test(isi.catatan), JSON.stringify(isi.personel.shift));
  const D = "2026-10-12"; assert.equal((await prio(D, ["62"])).s, 200); assert.equal((await kirim(A["62"], D, "prov:62", DATA["62"])).s, 201);
  const kb = await POST(V, P + "verifikasi", {tanggal: D, sumber: "prov:62", aksi: "kembalikan", versi: 1, catatan: "perbaiki\n*Belum padam: 0 ha*"}); assert.equal(kb.s, 200);
  assert.equal((await DB.prepare("SELECT catatan FROM lk_kiriman WHERE tanggal_laporan = ? AND sumber = 'prov:62'").bind(D).first()).catatan, "perbaiki *Belum padam: 0 ha*");
  assert.equal((await kirim(A["62"], D, "prov:62", DATA["62"], 1)).s, 201); assert.equal((await setuju(D, "prov:62", 2)).s, 200);
  const k = await POST(V, P + "kunci", {tanggal: D, lanjut_tanpa: [{sumber: "udara", alasan: "tidak terbang\n*Belum padam: 0 ha*\n_data palsu_"}, {sumber: "omc", alasan: "tidak operasi\tkarena cuaca"}]}); assert.equal(k.s, 201, k.t);
  const s = (await snap(D)).j; for (const p of s.snapshot.pengecualian) assert.ok(!/[\n\t\r]/.test(p.alasan), p.alasan);
  for (const [nama, teks] of Object.entries(s.teks_wa)) assert.ok(!teks.split("\n").some(b => b === "*Belum padam: 0 ha*"), nama + ": tidak ada baris sisipan");
  const r = await POST(V, P + "ralat", {tanggal: D, alasan: "koreksi padam\n*Belum padam: 0 ha*", ganti: {"prov:62": {...DATA["62"], personel: {total: 16000}}}}); assert.equal(r.s, 201, r.t);
  assert.ok(!/[\n\t\r]/.test((await snap(D)).j.alasan_ralat), "alasan ralat satu baris");
});

uji("tautan tagih: nomor harus 8-15 digit dan akun yang dipakai deterministik (paling lama dibuat)", async () => {
  const garam = "c".repeat(32), akun14 = (wa, dibuat) => { const id = id16(); return sisip("instansi_akun", {id, username: "pemprovriau" + id.slice(0, 5), jenis: "pemprov", tingkat: "prov", wilayah: "Provinsi Riau " + wa, kunci_wilayah: "k" + id, cakupan: '["14"]', garam, sandi_sha: sha256(garam + SANDI),
    status: "aktif", nama: "Budi", nip: "198001012005011001", jabatan: "Kalak", unit: "BPBD", email: "b@contoh.go.id", wa, surat: 1, kartu: 1, dikirim: 1, diputus: 1, wajib_ganti: 0, dibuat, dummy: 0}); };
  await akun14("628120000142", 2000); await akun14("628120000141", 1000);
  const th = (await GET(V, P + "hari?tanggal=2026-10-03")).j, t = th.tagih.find(x => x.sumber === "prov:14");
  assert.ok(t && t.tautan.startsWith("https://wa.me/628120000141?text="), t?.tautan); assert.match(t.tautan, /^https:\/\/wa\.me\/\d{8,15}\?text=/);
  assert.deepEqual((await GET(PM, P + "hari?tanggal=2026-10-03")).j.tagih, [], "pimpinan tidak menagih");
});

uji("penulis yang kalah balapan: UPDATE gagal = 409 tanpa versi dan tanpa FS; CHECK ukuran dipetakan ke 413/400, bukan 409", async () => {
  const D = "2026-10-13b".slice(0, 10), T0 = "2026-10-15"; assert.equal((await prio(T0, ["62"])).s, 200);
  const fsBaris = {fs: [{kab: "Kapuas", target_ha: 10, padam_darat_ha: 1, padam_udara_ha: 0, status: "menyala"}], personel: {total: 5}};
  const a1 = await kirim(A["62"], T0, "prov:62", fsBaris); assert.equal(a1.s, 201, a1.t);
  const fsAwal = JSON.stringify((await DB.prepare("SELECT fs_id, target_ha FROM lk_fs WHERE tanggal_laporan = ? AND prov = '62'").bind(T0).all()).results), versiAwal = await n("lk_versi", `tanggal_laporan = '${T0}' AND sumber = 'prov:62'`);
  /* pemicu meniru UPDATE yang kalah (RAISE(IGNORE) = tak ada baris berubah) */
  await DB.prepare("CREATE TRIGGER uji_kalah BEFORE UPDATE ON lk_kiriman WHEN NEW.sumber = 'prov:62' AND NEW.tanggal_laporan = '2026-10-15' BEGIN SELECT RAISE(IGNORE); END").run();
  const kalah = await kirim(A["62"], T0, "prov:62", {fs: [{kab: "Pulang Pisau", target_ha: 99, padam_darat_ha: 0, padam_udara_ha: 0, status: "menyala"}], personel: {total: 6}}, 1);
  await DB.prepare("DROP TRIGGER uji_kalah").run();
  assert.equal(kalah.s, 409, kalah.t); assert.equal(await n("lk_versi", `tanggal_laporan = '${T0}' AND sumber = 'prov:62'`), versiAwal, "tak ada versi untuk yang kalah");
  assert.equal(JSON.stringify((await DB.prepare("SELECT fs_id, target_ha FROM lk_fs WHERE tanggal_laporan = ? AND prov = '62'").bind(T0).all()).results), fsAwal, "lk_fs tak tersentuh oleh yang kalah");
  assert.equal((await kirim(A["62"], T0, "prov:62", fsBaris, 1)).s, 201, "tanpa pemicu normal lagi");
  /* isian terlalu besar */
  const besar = {fs: Array.from({length: 400}, (_, i) => ({kab: "K".repeat(60), kec: "C".repeat(60), kawasan: "W".repeat(60), target_ha: 1, padam_darat_ha: 0, padam_udara_ha: 0, status: "menyala", alasan: "a".repeat(300)})), personel: {total: 5}};
  const b = await kirim(A["62"], T0, "prov:62", besar, 2); assert.equal(b.s, 413, b.t.slice(0, 200)); assert.match(b.j.galat, /terlalu besar|ukuran/);
  assert.equal(D.length, 10);
});

uji("draf OMC terisi dari catatan sortie TMC di D1 (hari data, bukan sortie dihapus)", async () => {
  const baris = (o = {}) => sisip("omc_sortie", {id: id16(), tanggal: "2026-10-17", pesawat: "PK-TMC", mulai: Date.parse("2026-10-17T10:30:00+07:00"), bahan: "dry_ice", kg: 700, ketinggian_kaki: 12000, sasaran_kab: '["62|Kapuas"]', lintas_provinsi: 0, prov: '["62"]', pengisi: "uji", dibuat: 1, diubah: 1, dummy: 0, ...o});
  await baris(); await baris({pesawat: "PK-HAPUS", dihapus: 5}); await baris({tanggal: "2026-10-16", pesawat: "PK-LAIN"});
  const d = (await GET(V, P + "kiriman?tanggal=2026-10-18&sumber=omc")).j;
  assert.equal(d.draf_otomatis, true); assert.equal(d.isi.sortie.length, 1, "hanya sortie hari data yang tidak dihapus");
  const x = d.isi.sortie[0]; assert.deepEqual([x.registrasi, x.jam_mulai, x.bahan, x.kg, x.sasaran, x.provs, x.ketinggian_ft], ["PK-TMC", "10:30", "dry_ice", 700, ["Kapuas"], ["62"], 12000]);
  assert.equal(d.hitung.merah, 0);
});

/* ================================================================ 503 tanpa 0032 */
uji("503 sopan tanpa migrasi 0032: semua rute, cron tetap jalan, Meja Pantau tidak rusak", async () => {
  for (const t of ["lk_snapshot", "lk_versi", "lk_fs", "lk_kiriman", "lk_hari"]) await DB.prepare(`DROP TABLE ${t}`).run();
  for (const [m, j, b] of [["GET", P + "hari?tanggal=2026-10-21"], ["GET", P + "kiriman?tanggal=2026-10-21&sumber=udara"], ["GET", P + "snapshot/2026-10-21"], ["POST", P + "kirim", {tanggal: "2026-10-21", sumber: "udara", isi: {}, versi_dasar: 0}],
    ["POST", P + "draf", {tanggal: "2026-10-21", sumber: "udara", isi: {}, versi_dasar: 0}], ["POST", P + "verifikasi", {tanggal: "2026-10-21", sumber: "udara", aksi: "setujui", versi: 1}], ["POST", P + "kunci", {tanggal: "2026-10-21"}],
    ["POST", P + "ralat", {tanggal: "2026-10-21", alasan: "Tanpa tabel sama sekali", ganti: {omc: OMC}}], ["POST", P + "prioritas", {tanggal: "2026-10-21", provinsi: ["62"]}], ["POST", P + "dummy", {aksi: "isi"}]]) {
    const r = await api(m, j, b, ADMIN); assert.equal(r.s, 503, `${m} ${j}: ${r.t}`); assert.match(r.j.galat, /migrasi 0032/);
  }
  assert.equal((await api("GET", "/admin/laporan-karhutla", undefined, ADMIN)).s, 200, "kerangka halaman tetap terbuka");
  assert.equal((await api("GET", "/api/pantau", undefined, ADMIN)).s, 200, "Meja Pantau tetap jalan tanpa 0032");
  await (await mf.getWorker()).scheduled({cron: "* * * * *", scheduledTime: Date.UTC(2026, 9, 23, 0, 1)});
});
