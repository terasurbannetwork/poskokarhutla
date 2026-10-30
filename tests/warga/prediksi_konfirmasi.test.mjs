/* /prediksi fase 2: konfirmasi lapangan. worker.js utuh di workerd + D1 lokal dengan migrasi apa adanya (TEST.md: tanpa mock). */
import {test} from "node:test";
import assert from "node:assert/strict";
import {siapkan, berantai, ADMIN} from "./_bnpb.mjs";

const uji = berantai();
const U = await siapkan("uji-prediksi", {ikat: {PIPA_TOKEN: "token-pipa-uji"}});
const PIPA = {authorization: "Bearer token-pipa-uji"}, wib = ms => new Date(ms + 7 * 36e5).toISOString().slice(0, 10);
const KINI = Date.now(), HARI_INI = wib(KINI), LUSA_LALU = wib(KINI - 2 * 864e5);
const sah = (o = {}) => ({kab: "Katingan", tanggal: LUSA_LALU, kode: "BNJ", terjadi: 1, nilai: 35, catatan: "genangan 35 cm", ...o});
const post = (b, h) => U.api("POST", "/api/prediksi/konfirmasi", b, h);
let kode;
uji("siapkan regu", async () => {
  const r = await U.adm("POST", "/api/posko/regu", {nama: "Regu Uji", unsur: "BPBD", prov: "62", kab: "Katingan"}); assert.equal(r.s, 201, r.t); kode = r.j.kode;
});

uji("POST: kode regu sah tersimpan, kirim ulang menimpa (satu baris)", async () => {
  const h = {"x-kode-regu": kode};
  assert.equal((await post(sah(), h)).s, 200);
  assert.equal((await post(sah({terjadi: 0, nilai: null}), h)).s, 200);
  const rows = (await U.DB.prepare("SELECT terjadi, nilai, sumber, kode_regu FROM prediksi_konfirmasi").all()).results;
  assert.equal(rows.length, 1, JSON.stringify(rows));
  assert.deepEqual([rows[0].terjadi, rows[0].nilai, rows[0].sumber], [0, null, "regu"]);
  assert.notEqual(rows[0].kode_regu, kode, "yang disimpan id regu, bukan kodenya");
});
uji("POST: sesi staf (admin) juga boleh", async () => {
  assert.equal((await post(sah({kode: "HJN"}), ADMIN)).s, 200);
  assert.equal(await U.n("prediksi_konfirmasi", "kode_regu = 'admin'"), 1);
});
uji("POST: tanpa regu/sesi atau kode regu salah ditolak", async () => {
  assert.equal((await post(sah())).s, 403);
  assert.equal((await post(sah(), {"x-kode-regu": "0".repeat(26)})).s, 403);
  assert.equal((await post(sah(), {"x-kode-regu": "bukan-kode"})).s, 403);
});
uji("POST: field salah ditolak 400 dan tidak tersimpan", async () => {
  const h = {"x-kode-regu": kode}, n0 = await U.n("prediksi_konfirmasi");
  const salah = [{kode: "XXX"}, {kode: "bnj"}, {tanggal: "2020-01-01"}, {tanggal: wib(KINI + 2 * 864e5)}, {tanggal: wib(KINI - 9 * 864e5)}, {tanggal: "bukan"}, {tanggal: undefined},
    {kab: ""}, {kab: "<script>"}, {kab: undefined}, {terjadi: 2}, {terjadi: "1"}, {terjadi: undefined}, {nilai: "abc"}, {nilai: 1e9}, {catatan: "x".repeat(501)}, {catatan: 5}];
  for (const s of salah) { const r = await post(sah(s), h); assert.equal(r.s, 400, JSON.stringify(s) + " -> " + r.t); }
  assert.equal(await U.n("prediksi_konfirmasi"), n0);
});

uji("GET /api/prediksi/konfirmasi: tanpa token 401; token sah memuat baris regu dan warga positif tanpa identitas", async () => {
  const get = (j, h) => U.api("GET", "/api/prediksi/konfirmasi" + j, undefined, h);
  assert.equal((await get("")).s, 401);
  assert.equal((await get("", {authorization: "Bearer salah"})).s, 401);
  assert.equal((await get("?sejak=bukan", PIPA)).s, 400);
  const H = "a".repeat(64), ms = KINI - 864e5;
  await U.DB.prepare(`INSERT INTO laporan (id, jenis, sub, bahaya, lat, lon, dibuat, kedaluwarsa, ip_hash, token_hash) VALUES ('warga001', 'info', 'umum', 'banjir', -2.5, 113.9, ?, ?, ?, ?)`).bind(ms, ms + 36e5, H, H).run();
  await U.DB.prepare("INSERT INTO laporan_wilayah (laporan_id, prov, kab, sumber) VALUES ('warga001', '62', 'Katingan', 'masuk')").run();
  await U.DB.prepare("INSERT INTO prediksi_konfirmasi (kab, tanggal, kode, terjadi, sumber, kode_regu, dibuat) VALUES ('Kapuas', ?, 'API', 0, 'regu', 'r1', 'x')").bind(HARI_INI).run();
  const r = await get(`?sejak=${wib(KINI - 3 * 864e5)}`, PIPA);
  assert.equal(r.s, 200, r.t);
  const k = r.j.konfirmasi;
  assert.ok(k.some(x => x.kab === "Kapuas" && x.kode === "API" && x.terjadi === 0 && x.sumber === "regu"), r.t);
  const w = k.find(x => x.sumber === "warga"); assert.ok(w && w.kode === "BNJ" && w.terjadi === 1 && w.kab === "Katingan" && w.tanggal === wib(ms), r.t);
  assert.ok(k.every(x => x.sumber !== "warga" || x.terjadi === 1), "warga positif saja");
  assert.ok(!r.t.includes("kode_regu") && !r.t.includes(H), "tanpa identitas pelapor");
});

uji("GET: groundcheck karhutla = API terjadi 1 per kab-tanggal WIB kunjungan; hanya api terlihat, foto dekat, GPS wajar, data nyata, karhutla; warga tak dobel; tanpa identitas", async () => {
  const id16 = () => [...crypto.getRandomValues(new Uint8Array(8))].map(b => b.toString(16).padStart(2, "0")).join(""), akun = id16(), akunContoh = id16(), idTugas = [];
  const buatAkun = (id, username, dummy) => U.DB.prepare(`INSERT INTO instansi_akun (id, username, jenis, tingkat, wilayah, kunci_wilayah, cakupan, prov, kab, garam, sandi_sha, status, nama, nip, jabatan, unit, email, wa, surat, kartu, dikirim, diputus, wajib_ganti, dibuat, dummy)
    VALUES (?, ?, 'pemkab', 'kab', 'Pemerintah Kab Uji', ?, '["62"]', '62', 'Pulang Pisau', ?, ?, 'aktif', 'Budi Uji', '198001012005011001', 'Kalak', 'BPBD', 'budi@uji.go.id', '628123456789', 1, 1, 1, 1, 0, 1, ?)`)
    .bind(id, username, "uji|" + username, "g".repeat(32), "a".repeat(64), dummy).run();
  await buatAkun(akun, "pemkabprediksi", 0); await buatAkun(akunContoh, "pemkabcontoh", 1);
  const ms = Date.parse(`${LUSA_LALU}T00:30:00+07:00`), BESOKNYA = wib(ms + 864e5), SEBELUMNYA = wib(ms - 36e5);   // 00.30 WIB = 17.30 UTC sehari sebelumnya: tanggal harus WIB
  const tugas = async (kab, {dummy = 0, bencana} = {}) => {
    const id = id16(); idTugas.push(id);
    await U.DB.prepare("INSERT INTO tugas_api (id, prov, kab, kec, lat, lon, level, n24, luas_ha, dibuat, terakhir_terdeteksi, status, isian_terakhir, dummy) VALUES (?, '62', ?, 'Kec', -2.2, 113.9, 3, 10, 50, ?, ?, 'buka', ?, ?)")
      .bind(id, kab, ms, ms, ms, dummy).run();
    if (bencana) await U.DB.prepare("INSERT INTO tugas_bencana (tugas_id, bencana) VALUES (?, ?)").bind(id, bencana).run();
    return id;
  };
  const isi = (tid, {langkah = "konfirmasi", hasil = null, status = null, dummy = 0, oleh = akun, jarak = 0.3, curiga = null, gps} = {}, t = ms) => U.DB.prepare(`INSERT INTO tugas_isian
    (id, tugas_id, akun_id, klien_id, langkah, dibuat, lat, lon, waktu_gps, jarak_km, gps_curiga, hasil, pic_nama, pic_jabatan, pic_wa, status_api, dummy) VALUES (?, ?, ?, ?, ?, ?, -2.2, 113.9, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(id16(), tid, oleh, "klien-" + id16(), langkah, t, gps ?? t, jarak, curiga, hasil, hasil && "Pak Rahasia", hasil && "Kepala Desa", hasil && "6281299998888", status, dummy).run();
  await isi(await tugas("Pulang Pisau"), {hasil: "api_ada"});
  await isi(await tugas("Pulang Pisau"), {hasil: "api_ada"});   // dua lokasi satu kab satu hari = satu baris
  const kt = await tugas("Katingan"); await isi(kt, {hasil: "api_ada", status: "menyala"}); await isi(kt, {langkah: "tindakan", status: "bara"}, ms + 864e5);   // urutan sah: api_ada lalu kabar
  await isi(await tugas("Murung Raya"), {hasil: "api_ada", gps: ms - 36e5}, ms + 30 * 6e4);   // dilihat 23.30 WIB, terkirim 01.00 WIB: tanggal kunjungan
  const sr = await tugas("Seruyan"); await isi(sr, {hasil: "api_ada"}, KINI - 10 * 864e5); await isi(sr, {langkah: "tindakan", status: "padam"});   // api_ada sebelum sejak, padam bukan api terlihat
  await isi(await tugas("Kotawaringin Timur"), {hasil: "bukan_api"});
  await isi(await tugas("Barito Selatan"), {hasil: "sudah_padam"});
  await isi(await tugas("Lamandau"), {hasil: "api_ada", dummy: 1});
  await isi(await tugas("Sukamara", {dummy: 1}), {hasil: "api_ada"});
  await isi(await tugas("Barito Utara", {bencana: "banjir"}), {hasil: "api_ada"});
  await isi(await tugas("Gunung Mas"), {hasil: "api_ada", oleh: akunContoh});   // akun contoh (dummy) di tugas nyata
  await isi(await tugas("Barito Timur"), {hasil: "api_ada", jarak: 8});   // foto > 5 km: tautan diteruskan
  await isi(await tugas("Kotawaringin Barat"), {hasil: "api_ada", curiga: "tiga bacaan GPS sama persis"});
  await isi(await tugas("Kapuas"), {hasil: "api_ada", jarak: null});   // tanpa foto berlokasi
  const H = "b".repeat(64);
  await U.DB.prepare(`INSERT INTO laporan (id, jenis, sub, bahaya, lat, lon, dibuat, kedaluwarsa, ip_hash, token_hash) VALUES ('warga002', 'info', 'umum', 'karhutla', -2.5, 113.9, ?, ?, ?, ?)`).bind(ms, ms + 36e5, H, H).run();
  await U.DB.prepare("INSERT INTO laporan_wilayah (laporan_id, prov, kab, sumber) VALUES ('warga002', '62', 'Pulang Pisau', 'masuk')").run();
  const r = await U.api("GET", `/api/prediksi/konfirmasi?sejak=${wib(KINI - 3 * 864e5)}`, undefined, PIPA); assert.equal(r.s, 200, r.t);
  const gc = r.j.konfirmasi.filter(x => x.sumber === "groundcheck");
  for (const x of gc) assert.deepEqual(Object.keys(x).sort(), ["catatan", "kab", "kode", "nilai", "prov", "sumber", "tanggal", "terjadi"], JSON.stringify(x));
  assert.deepEqual(gc.map(x => [x.prov, x.kab, x.tanggal, x.kode, x.terjadi, x.nilai, x.catatan]).sort(), [
    ["62", "Katingan", BESOKNYA, "API", 1, null, null], ["62", "Katingan", LUSA_LALU, "API", 1, null, null],
    ["62", "Murung Raya", SEBELUMNYA, "API", 1, null, null], ["62", "Pulang Pisau", LUSA_LALU, "API", 1, null, null]].sort(), r.t);
  assert.ok(!r.j.konfirmasi.some(x => x.sumber === "warga" && x.kab === "Pulang Pisau"), "warga lemah tidak ditambahkan di kab-tanggal yang sudah ada groundcheck");
  for (const rahasia of ["Rahasia", "6281299998888", "klien-", akun, akunContoh, "198001012005011001", "budi@uji.go.id", "628123456789", "113.9", "-2.2", ...idTugas])
    assert.ok(!r.t.includes(rahasia), `tanpa identitas, kontak, koordinat, atau id: ${rahasia}`);
});

uji("POST: batas laju 120 per jam per IP -> 429", async () => {
  const h = {"x-kode-regu": kode, "cf-connecting-ip": "203.0.113.9"};
  let s; for (let i = 0; i < 125; i++) { s = (await post(sah({kode: "ROB"}), h)).s; if (s === 429) break; }
  assert.equal(s, 429);
});

uji("/prediksi di host terkunci tanpa sesi tidak terbuka; dengan sesi admin lolos gerbang", async () => {
  const r = await U.mf.dispatchFetch("https://centurisk97.id/prediksi", {redirect: "manual"});
  assert.ok(r.status === 302 || r.status === 303, `status ${r.status}`);
  assert.match(r.headers.get("location") || "", /masuk|pantau/);
  const s = await U.mf.dispatchFetch("https://centurisk97.id/prediksi", {redirect: "manual", headers: ADMIN});
  assert.ok(s.status !== 302 && s.status !== 303, `status ${s.status}`);
});
