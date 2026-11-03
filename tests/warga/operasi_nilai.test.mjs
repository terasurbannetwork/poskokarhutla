/* OP-5 + mesin Operasi Lapangan (src/operasi_nilai.js, src/operasi_udara.js) di workerd (Miniflare) dengan D1 sungguhan:
   GET /api/operasi/temuan dan POST /api/operasi/renlap (Bearer WA_MESIN), GET /api/operasi/nilai (staf). Angka metrik dihitung TANGAN dari data dummy 2 Nov
   (POST /api/operasi/dummy) ditambah baris nyata kecil buatan uji. Jalankan: node --test tests/warga/operasi_nilai.test.mjs */
import assert from "node:assert/strict";
import "../../src/worker.js";   // worker dulu: modul saling impor (siklus)
import {siapkan, berantai, ADMIN, GERBANG} from "./_bnpb.mjs";
import {hitungNilai} from "../../src/operasi_nilai.js";

const PB = {"x-pb": "1", origin: "http://bnpb.lokal"}, MESIN = {authorization: "Bearer mesin-rahasia"};
const uji = berantai();
const U = await siapkan("uji-operasi-nilai", {ikat: {WA_MESIN: "mesin-rahasia"}});
const {DB, api, n} = U;
let ipN = 0, nipN = 0;
const bikin = async (nama, peran) => {
  const r = await api("POST", "/api/staf/admin/buat", {nama, nip: `19970${++nipN}0012005`, unit: "Pusdalops BNPB", email: `nl${nipN}@bnpb.go.id`, wa: "081234567890", peran, wilayah: []}, ADMIN); assert.equal(r.s, 201, r.t);
  const m = await api("POST", "/api/staf/masuk", {username: r.j.username, sandi: r.j.sandi}, {"cf-connecting-ip": `198.51.100.${++ipN}`}); assert.equal(m.s, 200, m.t);
  const cookie = m.h.get("set-cookie").split(";")[0]; assert.equal((await api("POST", "/api/staf/gantisandi", {}, {cookie, ...PB})).s, 200);
  return {cookie};
};
const sisip = (t, o) => { const k = Object.keys(o); return DB.prepare(`INSERT INTO ${t} (${k.join(", ")}) VALUES (${k.map(() => "?").join(", ")})`).bind(...Object.values(o)).run(); };
const nilai = (h, q = "?dari=2026-11-01&sampai=2026-11-04") => api("GET", "/api/operasi/nilai" + q, undefined, h);
const temuan = (h, q = "?dari=2026-11-02&sampai=2026-11-04") => api("GET", "/api/operasi/temuan" + q, undefined, h);
const renlap = (b, h = MESIN) => api("POST", "/api/operasi/renlap", b, h);
const T = (lat, lon, skor = 1) => ({lat, lon, skor, alasan: {titik_baru: 1}});
let staf, tanpaPeran;

uji("auth mesin: GET /api/operasi/temuan dan POST /api/operasi/renlap menolak tamu, token salah, admin tanpa bearer; rentang ketat", async () => {
  for (const [nama, h] of [["tamu", {}], ["token salah", {authorization: "Bearer salah"}], ["admin tanpa bearer", ADMIN], ["akun gerbang", GERBANG], ["bearer kosong", {authorization: "Bearer "}]]) {
    assert.equal((await temuan(h)).s, 403, `temuan ${nama}`);
    assert.equal((await temuan(h, "?dari=bukan")).s, 403, `${nama}: auth sebelum validasi`);
    assert.equal((await renlap({tanggal: "2026-11-03", versi: "pagi", base: []}, h)).s, 403, `renlap ${nama}`);
  }
  assert.equal((await temuan(MESIN)).s, 200);
  for (const q of ["", "?dari=2026-11-02", "?dari=2026-13-02&sampai=2026-11-03", "?dari=2026-11-05&sampai=2026-11-04", "?dari=2026-11-01&sampai=2026-11-08"]) assert.equal((await temuan(MESIN, q)).s, 400, q);
  assert.equal((await temuan(MESIN, "?dari=2026-11-01&sampai=2026-11-07")).s, 200, "7 hari persis boleh");
});

uji("POST /api/operasi/renlap validasi ketat: tanggal, versi, base, 20 target, bbox, ukuran; tidak menulis apa pun saat ditolak", async () => {
  const ok = {tanggal: "2026-11-03", versi: "malam", base: [{id: "PNK", patroli: [T(-0.3, 109.5)]}]};
  const tolak = async (nama, b, s = 400) => { const r = await renlap(b); assert.equal(r.s, s, `${nama}: ${r.t.slice(0, 120)}`); };
  await tolak("tanggal mustahil", {...ok, tanggal: "2026-02-30"}); await tolak("tanggal hilang", {...ok, tanggal: undefined});
  await tolak("versi siang", {...ok, versi: "siang"}); await tolak("base kosong", {...ok, base: []}); await tolak("base bukan larik", {...ok, base: "PNK"});
  await tolak("base asing", {...ok, base: [{id: "ZZZ", patroli: []}]}); await tolak("base dobel", {...ok, base: [{id: "PNK"}, {id: "PNK"}]});
  await tolak("21 target", {...ok, base: [{id: "PNK", patroli: Array.from({length: 13}, (_, i) => T(-0.3 - i / 100, 109.5)), wb: Array.from({length: 8}, (_, i) => T(-0.5 - i / 100, 109.5))}]});
  await tolak("lat di luar", {...ok, base: [{id: "PNK", patroli: [T(30, 109.5)]}]}); await tolak("lon teks", {...ok, base: [{id: "PNK", wb: [{lat: -1, lon: "109"}]}]});
  await tolak("skor bukan angka", {...ok, base: [{id: "PNK", patroli: [{...T(-1, 109), skor: "tinggi"}]}]});
  await tolak("body bukan objek", "[1]"); await tolak("body bukan JSON", "{bukan");
  await tolak("body kebesaran", {...ok, catatan: "x".repeat(210000)}, 413);
  assert.equal(await n("op_renlap"), 0); assert.equal(await n("op_target"), 0);
  assert.equal((await renlap({...ok, base: [{id: "PNK", patroli: Array.from({length: 12}, (_, i) => T(-0.3 - i / 100, 109.5)), wb: Array.from({length: 8}, (_, i) => T(-0.5 - i / 100, 109.5))}]})).s, 201, "20 persis boleh");
  assert.equal(await n("op_target"), 20);
});

uji("POST /api/operasi/renlap: upsert tidak menggandakan, target lama dihapus, urut berurutan, id deterministik, dikirim tidak ditimpa", async () => {
  await DB.batch([DB.prepare("DELETE FROM op_target"), DB.prepare("DELETE FROM op_renlap")]);
  const mal = {tanggal: "2026-11-03", versi: "malam", dibuat: "2026-11-02T13:00:00Z", base: [{id: "PNK", nama: "Supadio", patroli: [T(-0.3, 109.5), T(-0.9, 109.9)], wb: [T(-0.4, 109.4)]}]};
  let r = await renlap(mal); assert.equal(r.s, 201, r.t); assert.deepEqual([r.j.renlap, r.j.target], [["2026-11-03-malam-PNK"], 3]);
  assert.deepEqual([await n("op_renlap"), await n("op_target")], [1, 3]);
  assert.deepEqual((await DB.prepare("SELECT id, urut, jenis FROM op_target ORDER BY urut").all()).results.map(x => [x.id, x.urut, x.jenis]),
    [["2026-11-03-malam-PNK-1", 1, "patroli"], ["2026-11-03-malam-PNK-2", 2, "patroli"], ["2026-11-03-malam-PNK-3", 3, "wb"]]);
  const baru = {...mal, base: [{id: "PNK", nama: "Supadio", patroli: [T(-0.5, 109.5)]}]};
  assert.equal((await renlap(baru)).s, 201); assert.equal((await renlap(baru)).s, 201);
  assert.deepEqual([await n("op_renlap"), await n("op_target")], [1, 1], "ditulis dua kali = satu baris, target lama hilang");
  const row = await DB.prepare("SELECT * FROM op_renlap").first(); assert.deepEqual([row.base_id, row.versi, row.status, row.dummy], ["PNK", "malam", "draf", 0]);
  assert.deepEqual(JSON.parse(row.isi_json).base.patroli.length, 1);
  assert.equal((await renlap({...baru, versi: "pagi"})).s, 201); assert.equal(await n("op_renlap"), 2, "pagi dan malam disimpan keduanya");
  await DB.prepare("UPDATE op_renlap SET status = 'dikirim' WHERE id = '2026-11-03-malam-PNK'").run();
  r = await renlap(mal); assert.equal(r.s, 409, r.t); assert.equal(await n("op_target", "renlap_id = '2026-11-03-malam-PNK'"), 1, "yang sudah dikirim tidak berubah");
  await DB.batch([DB.prepare("DELETE FROM op_target"), DB.prepare("DELETE FROM op_renlap")]);
});

uji("siapkan bahan nilai: dummy 2 Nov + temuan, gerak, status, renlap, titik panas buatan uji", async () => {
  staf = await bikin("Staf Nilai", ["udara"]); tanpaPeran = await bikin("Kemitraan Nilai", ["kemitraan"]);
  assert.equal((await api("POST", "/api/operasi/dummy", {aksi: "isi"}, ADMIN)).s, 201);
  const Z = (t) => Date.parse(t);
  // 6 berasap PK-FPA 3 Nov 01:00Z di (-0.30 - 0.1 i, 109.5); lima pertama dijawab WB VH-L6T di titik yang sama (30, 40, 50, 60, 90 menit); keenam (-0.9,109.9) tanpa jawaban
  const LAT = [-0.3, -0.4, -0.5, -0.6, -0.7], MNT = [30, 40, 50, 60, 90];
  for (const [i, lat] of LAT.entries()) {
    await sisip("op_temuan", {tanggal: "2026-11-03", jam_utc: Z("2026-11-03T01:00:00Z"), registrasi: "PK-FPA", lat, lon: 109.5, status: "berasap"});
    await sisip("op_gerak", {tanggal: "2026-11-03", registrasi: "VH-L6T", jenis: "berangkat", jam_utc: Z("2026-11-03T01:00:00Z") + MNT[i] * 60e3, lat, lon: 109.5, misi: "WB"});
  }
  await sisip("op_temuan", {tanggal: "2026-11-03", jam_utc: Z("2026-11-03T02:00:00Z"), registrasi: "PK-FPA", lat: -0.9, lon: 109.9, status: "berasap"});
  await sisip("op_temuan", {tanggal: "2026-11-04", jam_utc: Z("2026-11-04T03:00:00Z"), registrasi: "PK-FPA", lat: -0.4, lon: 109.5, status: "berasap"});
  await sisip("op_temuan", {tanggal: "2026-11-01", jam_utc: Z("2026-11-01T03:00:00Z"), registrasi: "H-3217", lat: -0.7, lon: 109.7, status: "clear"});
  for (const [tgl, reg, st] of [["2026-11-03", "VH-L6T", "siap"], ["2026-11-03", "VN-8424", "siaga"], ["2026-11-03", "H-3217", "siaga"], ["2026-11-03", "HA-5231", "siap"], ["2026-11-03", "HA-5228", "tidak_siap"],
    ["2026-11-04", "VN-8424", "siaga"], ["2026-11-04", "HA-5231", "siaga"]]) await sisip("op_armada_status", {tanggal: tgl, registrasi: reg, status: st});
  // renlap 3 Nov: malam PNK memuat target B (-0.9,109.9); pagi PNK menggantikannya: 5 target yang dikunjungi + 3 yang tidak; KTG 2 target tak dikunjungi
  const malam = {tanggal: "2026-11-03", versi: "malam", base: [{id: "PNK", patroli: [T(-0.3, 109.5), T(-0.9, 109.9)]}]};
  assert.equal((await renlap(malam)).s, 201);
  const pagi = {tanggal: "2026-11-03", versi: "pagi", base: [
    {id: "PNK", patroli: [...LAT.map(l => T(l, 109.5)), T(0.5, 109.0), T(0.6, 109.0)], wb: [T(0.7, 109.0)]},
    {id: "KTG", patroli: [T(-2.0, 110.5), T(-2.1, 110.5)]}]};
  assert.equal((await renlap(pagi)).s, 201); assert.equal(await n("op_target"), 2 + 8 + 2);
  // titik panas: awal 31 Okt 00:00Z, akhir (dibuat) 5 Nov 00:00Z; satu titik di Rasau dalam jendela clear dummy (3 Nov 00:00Z), dua titik di luar jendela
  const acuan = Z("2026-11-05T00:00:00Z"), b = (lat, lon, t) => [lat, lon, (Z(t) - acuan) / 36e5, "N20", 1, 1, 0, "x"];
  const isi = {kolom: [], acuan: new Date(acuan).toISOString(), wilayah: [], baris: [b(5, 100, "2026-10-31T00:00:00Z"), b(-0.27103, 109.36153, "2026-11-03T00:00:00Z"),
    b(-0.7, 109.7, "2026-11-03T05:00:00Z"), b(-3.33889, 114.77361, "2026-11-02T10:00:00Z")]};
  await DB.prepare("INSERT INTO titik_terbaru (dibuat, isi) VALUES (?, ?)").bind(acuan, JSON.stringify(isi)).run();
});

uji("GET /api/operasi/temuan: hanya baris nyata, tanpa wa_id, rentang tanggal", async () => {
  const r = await temuan(MESIN, "?dari=2026-11-01&sampai=2026-11-04"); assert.equal(r.s, 200, r.t);
  assert.equal(r.j.temuan.length, 8, "8 baris nyata; 14 dummy tidak ikut"); assert.equal(r.j.gerak.length, 5);
  assert.ok(!JSON.stringify(r.j).match(/wa_id|dummy|kru/), "tanpa kolom wa_id dan dummy");
  assert.deepEqual(Object.keys(r.j.temuan[0]).sort(), ["id", "jam_utc", "kab_kode", "lat", "lokasi", "lon", "luas_klaim_ha", "registrasi", "status", "tanggal", "umur_klaim_hari"]);
  assert.equal((await temuan(MESIN, "?dari=2026-11-04&sampai=2026-11-04")).j.temuan.length, 1);
  assert.equal((await temuan(MESIN, "?dari=2026-11-02&sampai=2026-11-02")).j.temuan.length, 0, "dummy 2 Nov tak keluar");
});

uji("GET /api/operasi/nilai: tamu, token mesin, staf tanpa peran 403 sebelum validasi; staf berperan dan akun centurisk97 (gerbang) 200; rentang maks 31 hari", async () => {
  for (const [nama, h] of [["tamu", {}], ["token mesin", MESIN], ["staf peran lain", tanpaPeran]]) {
    assert.equal((await nilai(h)).s, 403, nama); assert.equal((await nilai(h, "?dari=x")).s, 403, `${nama}: auth dulu`);
  }
  for (const q of ["", "?dari=2026-11-01", "?dari=2026-11-04&sampai=2026-11-01", "?dari=2026-02-30&sampai=2026-03-01", "?dari=2026-10-01&sampai=2026-11-01"]) assert.equal((await nilai(staf, q)).s, 400, q);
  assert.equal((await nilai(staf, "?dari=2026-10-02&sampai=2026-11-01")).s, 200, "31 hari persis boleh");
  assert.equal((await nilai(GERBANG, "?dari=2026-10-02&sampai=2026-11-01")).s, 200, "akun centurisk97 dari login biasa boleh membaca");
  assert.equal((await nilai(staf)).h.get("cache-control"), "no-store");
});

uji("GET /api/operasi/nilai: angka dihitung tangan (admin melihat dummy + nyata)", async () => {
  const r = await nilai(ADMIN); assert.equal(r.s, 200, r.t); const j = r.j, S = j.semua;
  assert.deepEqual([j.dari, j.sampai, j.hari, j.dummy], ["2026-11-01", "2026-11-04", 4, true]);
  // M1: 22 temuan (14 dummy + 7 berasap + 1 clear), tidak clear = 6 + 7 = 13
  assert.deepEqual([S.M1.jumlah, S.M1.n, S.M1.nilai], [13, 22, 0.591]);
  // M2: pagi mengalahkan malam; 10 target (8 PNK + 2 KTG), 5 dikunjungi
  assert.deepEqual([S.M2.jumlah, S.M2.n, S.M2.nilai], [5, 10, 0.5]);
  // M3: hanya 3 Nov punya renlap: 6 temuan, satu (-0.9,109.9) di luar semua target pagi
  assert.deepEqual([S.M3.jumlah, S.M3.n, S.M3.nilai], [1, 6, 0.167]);
  // M4: clear 9 (8 dummy tanpa jam, jendela 2 Nov 17:00Z + 48 jam; 1 nyata 1 Nov 03:00Z); hanya clear Rasau punya titik di jendelanya
  assert.deepEqual([S.M4.jumlah, S.M4.n, S.M4.nilai, S.M4.tak_dinilai], [8, 9, 0.889, 0]);
  assert.deepEqual([S.M5.nilai, S.M5.alasan, S.M8.alasan, S.M9.alasan, S.M10.alasan], [null, "data belum tersedia", "data belum tersedia", "data belum tersedia", "data belum tersedia"]);
  // M6: pesawat-hari siap/operasi/siaga = 6 (3 Nov: 4, 4 Nov: 2); hanya VH-L6T 3 Nov berangkat
  assert.deepEqual([S.M6.jumlah, S.M6.n, S.M6.nilai], [1, 6, 0.167]);
  // M7: lima respons 30, 40, 50, 60, 90 menit -> median 50; dua berasap tanpa respons
  assert.deepEqual([S.M7.nilai, S.M7.n, S.M7.tanpa_respons], [50, 5, 2]);
  // M11: armada WB PNK siaga/siap pada hari berasap <= 120 Nm: 3 Nov 4 (3 menganggur), 4 Nov 2 (2 menganggur)
  assert.deepEqual([S.M11.jumlah, S.M11.n, S.M11.nilai], [5, 6, 0.833]);
  // per base
  const P = j.base.PNK; assert.deepEqual([P.M1.jumlah, P.M1.n, P.M1.nilai, P.M2.jumlah, P.M2.n, P.M2.nilai, P.M6.nilai, P.M7.nilai, P.M11.nilai], [10, 17, 0.588, 5, 8, 0.625, 0.167, 50, 0.833]);
  assert.deepEqual([j.base.KTG.M2.jumlah, j.base.KTG.M2.n, j.base.KTG.M2.nilai, j.base.KTG.M2.catatan], [0, 2, null, "data kurang"]);
  assert.deepEqual([j.base.BDJ.M1.jumlah, j.base.BDJ.M1.n, j.base.BDJ.M1.nilai, j.base.BDJ.M1.catatan], [2, 4, null, "data kurang"], "n < 5 -> null");
  assert.equal(j.base.PKU.M1.n, 0);
  // per provinsi: 61 = PNK + KTG
  assert.deepEqual([j.provinsi["61"].M1.jumlah, j.provinsi["61"].M1.n, j.provinsi["61"].M1.nilai, j.provinsi["61"].M2.jumlah, j.provinsi["61"].M2.n], [11, 18, 0.611, 5, 10]);
  assert.deepEqual(Object.keys(j.provinsi).sort(), ["14", "15", "16", "61", "62", "63"]);
  // per registrasi
  const F = j.registrasi["PK-FPA"]; assert.deepEqual([F.M1.jumlah, F.M1.n, F.M1.nilai, F.M7.nilai, F.M7.n, F.M7.tanpa_respons, F.M2.alasan], [7, 9, 0.778, 50, 5, 2, "target renlap milik base, bukan registrasi"]);
  assert.deepEqual([j.registrasi["VH-L6T"].M6.jumlah, j.registrasi["VH-L6T"].M6.n], [1, 1]);
  assert.equal(j.registrasi["HA-5228"].M6.n, 0, "tidak_siap tak dihitung serviceable");
  for (const m of ["M1", "M2", "M3", "M4", "M5", "M6", "M7", "M8", "M9", "M10", "M11"]) assert.ok(m in S && "n" in S[m] && "nilai" in S[m], m);
});

uji("GET /api/operasi/nilai: staf nyata tanpa dummy; M4 null beralasan bila jendela titik panas belum tertutup", async () => {
  const j = (await nilai(staf)).j; assert.equal(j.dummy, false);
  assert.deepEqual([j.semua.M1.jumlah, j.semua.M1.n, j.semua.M1.nilai], [7, 8, 0.875], "8 temuan nyata");
  assert.deepEqual([j.semua.M4.n, j.semua.M4.nilai, j.semua.M4.jumlah], [1, null, 1], "satu clear nyata, tidak ada titik di jendelanya");
  await DB.prepare("DELETE FROM titik_terbaru").run();
  let a = (await nilai(ADMIN)).j.semua.M4; assert.deepEqual([a.nilai, a.n, a.alasan, a.tak_dinilai], [null, 0, "titik panas sistem tidak terbaca", 9]);
  const isi = {acuan: "2026-11-02T00:00:00Z", baris: [[-5, 100, 0, "N", 1, 1, 0, "x"]]};
  await DB.prepare("INSERT INTO titik_terbaru (dibuat, isi) VALUES (?, ?)").bind(Date.parse("2026-11-02T00:00:00Z"), JSON.stringify(isi)).run();
  a = (await nilai(ADMIN)).j.semua.M4; assert.deepEqual([a.nilai, a.n, a.tak_dinilai, a.alasan], [null, 0, 9, "jendela 48 jam titik panas belum tertutup data"]);
});

uji("hitungNilai murni: tanpa data semua n=0 dan nilai null, tanpa melempar", () => {
  const h = hitungNilai({base: [], armada: [], status: [], gerak: [], temuan: [], renlap: [], target: []});
  assert.deepEqual([h.semua.M1.n, h.semua.M1.nilai, h.semua.M11.n, h.provinsi, h.base, h.registrasi], [0, null, 0, {}, {}, {}]);
});
