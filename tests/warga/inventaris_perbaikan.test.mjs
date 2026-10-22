/* Perbaikan antrean orkestrator 21 Okt 2026 atas Akun Instansi dan Inventaris (src/instansi.js, src/inventaris.js, migrasi 0029 sampai 0031) di workerd (Miniflare) dengan D1 lokal sungguhan.
   Dibuktikan: (1) retensi 180 hari memulangkan alat dalam batch yang sama dan menulis jejak 'sistem', tanpa 0031 tetap jalan; (2) indeks retensi ada; (3) batas laju tulis 200 per jam pada ubah gudang,
   ubah alat, dan hapus; ubah alat dikunci optimistis dan hapus gudang atomik di bawah balapan; (4) koordinat gudang pihak lain dibulatkan 0,01 derajat, pemilik dan admin presisi; (5) pic_wa tidak
   untuk pimpinan; (6) komentar jejak. Jalankan: node --test tests/warga/inventaris_perbaikan.test.mjs */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import path from "node:path";
import {AKAR, pecah} from "./_bantu.mjs";
import {siapkan, berantai, ADMIN, MOD2, sha256} from "./_bnpb.mjs";
import "../../src/worker.js";   // worker dulu: modul saling impor (siklus)

const JAM = 3600e3, HARI = 24 * JAM, PB = {"x-pb": "1"};
const uji = berantai();
const U = await siapkan("uji-inv-perbaikan", {r2: true});
const {DB, api, mf} = U;
const teks = (...p) => readFileSync(path.join(AKAR, ...p), "utf8");
const id16 = () => [...crypto.getRandomValues(new Uint8Array(8))].map(b => b.toString(16).padStart(2, "0")).join("");
const sisip = (tabel, o) => DB.prepare(`INSERT INTO ${tabel} (${Object.keys(o).join(", ")}) VALUES (${Object.keys(o).map(() => "?").join(", ")})`).bind(...Object.values(o)).run();
const n = async (tabel, where = "1") => (await DB.prepare(`SELECT count(*) n FROM ${tabel} WHERE ${where}`).first()).n;
let ipN = 0;
const ipBaru = () => ({"cf-connecting-ip": `192.0.2.${++ipN % 250}`});
const SANDI = "SandiUji123456";
const akun = async (username, o = {}) => {
  const garam = "c".repeat(32), id = id16();
  await sisip("instansi_akun", {id, username, jenis: "pemkab", tingkat: "kab", wilayah: "Pemerintah Kabupaten " + username, kunci_wilayah: "k" + id, cakupan: '["62"]', prov: "62", kab: "Kapuas", garam, sandi_sha: sha256(garam + SANDI),
    status: "aktif", nama: "Budi", nip: "198001012005011001", jabatan: "Kalak", unit: "BPBD", email: "budi@contoh.go.id", wa: "628123456789", surat: 1, kartu: 1, dikirim: 1, diputus: 1, wajib_ganti: 0, dibuat: Date.now() - 3 * HARI, dummy: 0, ...o});
  const m = await api("POST", "/api/instansi/masuk", {username, sandi: SANDI}, {...PB, ...ipBaru()}); assert.equal(m.s, 200, m.t);
  const cookie = m.h.get("set-cookie").split(";")[0];
  return {id, h: {cookie}, hp: {cookie, ...PB}};
};
const POST = (a, j, b) => api("POST", j, b, a.hp), GET = (a, j) => api("GET", j, undefined, a.h);
let nipN = 0;
const staf = async (nama, peran) => {
  const r = await api("POST", "/api/staf/admin/buat", {nama, nip: `19960${++nipN}0012005`, unit: "Pusdalops BNPB", email: `ip${nipN}@bnpb.go.id`, wa: "081234567890", peran, wilayah: []}, ADMIN); assert.equal(r.s, 201, r.t);
  const m = await api("POST", "/api/staf/masuk", {username: r.j.username, sandi: r.j.sandi}, ipBaru()); assert.equal(m.s, 200, m.t);
  const cookie = m.h.get("set-cookie").split(";")[0]; assert.equal((await api("POST", "/api/staf/gantisandi", {}, {cookie, ...PB})).s, 200);
  return {h: {cookie}, hp: {cookie, ...PB}};
};
const tugasSql = (o = {}) => { const id = id16(); return sisip("tugas_api", {id, prov: "62", kab: "Kapuas", kec: "Mentaya", lat: -2.2, lon: 113.9, level: 3, n24: 2, luas_ha: 5, dibuat: Date.now() - HARI, terakhir_terdeteksi: Date.now() - HARI, status: "buka", dummy: 0, ...o}).then(() => id); };
const gudangSql = (akunId, o = {}) => { const id = id16(); return sisip("gudang", {id, akun_id: akunId, nama: "Gudang " + id.slice(0, 4), jenis: "gudang", prov: "62", lat: -2.25, lon: 113.95, dibuat: 1, diubah: 1, ...o}).then(() => id); };
const alatSql = (g, o = {}) => { const id = id16(); return sisip("alat", {id, gudang_id: g, kategori: "nozzle", jumlah: 4, dibuat: 1, diubah: 1, ...o}).then(() => id); };
const cron17 = async () => { const d = new Date(); d.setUTCMinutes(17, 0, 0); await (await mf.getWorker()).scheduled({cron: "* * * * *", scheduledTime: d.getTime()}); };
const jejak = id => DB.prepare("SELECT aksi, dari, ke, tugas_id, oleh FROM alat_jejak WHERE alat_id = ? ORDER BY id").bind(id).all().then(r => r.results);
let A, C, gA, gC;

uji("persiapan: akun pemkab (A) dan pemprov (C) aktif", async () => {
  A = await akun("akunperbaikana"); C = await akun("akunperbaikanc", {jenis: "pemprov", tingkat: "prov", prov: null, kab: null});
  gA = await gudangSql(A.id, {nama: "Gudang A"}); gC = await gudangSql(C.id, {nama: "Gudang C", lat: -2.4567, lon: 114.1234, pic_nama: "Bu Sari", pic_wa: "6281299900001"});
});

/* ================================================================ butir 1: retensi memulangkan alat */
uji("retensi 180 hari: alat yang dikerahkan ke tugas yang dihapus pulang dalam batch yang sama (siap, servis bila rusak berat) dengan jejak sistem; yang lain tak tersentuh", async () => {
  const lama = await tugasSql({dibuat: Date.now() - 200 * HARI}), baru = await tugasSql({dibuat: Date.now() - 10 * HARI}), dum = await tugasSql({dibuat: Date.now() - 200 * HARI, dummy: 1});
  const baik = await alatSql(gA, {status: "dikerahkan", dikerahkan_ke_tugas: lama}), rusak = await alatSql(gA, {kondisi: "rusak_berat", status: "dikerahkan", dikerahkan_ke_tugas: lama}), aman = await alatSql(gA, {status: "dikerahkan", dikerahkan_ke_tugas: baru});
  const dumAlat = await alatSql(gA, {status: "dikerahkan", dikerahkan_ke_tugas: dum, dummy: 1}), siap = await alatSql(gA);
  await cron17();
  assert.equal(await n("tugas_api", `id = '${lama}'`), 0, "tugas 180 hari dihapus"); assert.equal(await n("tugas_api", `id IN ('${baru}', '${dum}')`), 2, "tugas baru dan dummy tetap");
  const st = id => DB.prepare("SELECT status, dikerahkan_ke_tugas t FROM alat WHERE id = ?").bind(id).first().then(r => ({...r}));
  assert.deepEqual(await st(baik), {status: "siap", t: null}); assert.deepEqual(await st(rusak), {status: "servis", t: null}, "rusak berat pulang sebagai servis");
  assert.deepEqual(await st(aman), {status: "dikerahkan", t: baru}); assert.deepEqual(await st(dumAlat), {status: "dikerahkan", t: dum}); assert.equal((await st(siap)).status, "siap");
  assert.deepEqual(await jejak(baik), [{aksi: "status", dari: "dikerahkan", ke: "siap", tugas_id: lama, oleh: "sistem"}], "jejak sistem memuat tugas_id lama");
  assert.deepEqual(await jejak(rusak), [{aksi: "status", dari: "dikerahkan", ke: "servis", tugas_id: lama, oleh: "sistem"}]);
  assert.equal((await jejak(aman)).length, 0); assert.equal((await jejak(siap)).length, 0);
  assert.equal(await n("alat", "status = 'dikerahkan' AND dikerahkan_ke_tugas IS NULL"), 0, "tidak ada alat dikerahkan tanpa tugas");
  await cron17(); assert.equal((await jejak(baik)).length, 1, "dijalankan ulang: tidak menggandakan jejak");
});

/* ================================================================ butir 2: indeks */
uji("indeks retensi ada: tugas_api(dibuat), instansi_sesi(kedaluwarsa), staf_sesi(kedaluwarsa), usulan_kontak_pt(akun_id, dibuat); migrasi bisa dijalankan ulang", async () => {
  const ada = async nama => (await DB.prepare("SELECT sql FROM sqlite_master WHERE type = 'index' AND name = ?").bind(nama).first())?.sql;
  assert.match(await ada("tugas_api_dibuat"), /ON tugas_api \(dibuat\)/); assert.match(await ada("instansi_sesi_kedaluwarsa"), /ON instansi_sesi \(kedaluwarsa\)/);
  assert.match(await ada("staf_sesi_kedaluwarsa"), /ON staf_sesi \(kedaluwarsa\)/); assert.match(await ada("usulan_kontak_pt_akun"), /ON usulan_kontak_pt \(akun_id, dibuat\)/);
  for (const f of ["0029_instansi", "0030_staf", "0031_inventaris"]) for (let i = 0; i < 2; i++) await DB.batch(pecah(teks("migrations", f + ".sql")).map(s => DB.prepare(s)));
  const rencana = async sql => (await DB.prepare("EXPLAIN QUERY PLAN " + sql).bind(Date.now()).all()).results.map(r => r.detail).join(" ");
  assert.match(await rencana("DELETE FROM tugas_api WHERE dibuat <= ? AND dummy = 0"), /tugas_api_dibuat/, "retensi memakai indeks"); assert.match(await rencana("DELETE FROM instansi_sesi WHERE kedaluwarsa <= ?"), /instansi_sesi_kedaluwarsa/);
  assert.match(await rencana("DELETE FROM staf_sesi WHERE kedaluwarsa <= ?"), /staf_sesi_kedaluwarsa/);
});

/* ================================================================ butir 3: laju, penguncian optimistis, hapus atomik */
uji("batas laju tulis (200 per jam): ubah gudang, konfirmasi, hapus gudang, ubah alat, hapus alat semua 429 saat jatah habis, normal sesudahnya", async () => {
  const alat = await alatSql(gA, {kategori: "tenda"}), kosong = await gudangSql(A.id, {nama: "Gudang Kosong Laju"});
  const penuh = async () => { await DB.prepare("DELETE FROM laju_bnpb WHERE kunci = ? AND aksi = 'inventaris.tulis'").bind(A.id).run(); await DB.batch(Array.from({length: 200}, () => DB.prepare("INSERT INTO laju_bnpb (kunci, aksi, waktu) VALUES (?, 'inventaris.tulis', ?)").bind(A.id, Date.now()))); };
  await penuh();
  for (const [nama, j, b] of [["ubah gudang", "/api/instansi/gudang/" + gA, {aksi: "ubah", nama: "Gudang A Baru"}], ["konfirmasi", "/api/instansi/gudang/" + gA, {aksi: "konfirmasi"}], ["hapus gudang", "/api/instansi/gudang/" + kosong, {aksi: "hapus"}],
    ["ubah alat", "/api/instansi/alat/" + alat, {aksi: "ubah", jumlah: 9}], ["hapus alat", "/api/instansi/alat/" + alat, {aksi: "hapus"}]]) { const r = await POST(A, j, b); assert.equal(r.s, 429, `${nama}: ${r.t}`); }
  assert.equal((await DB.prepare("SELECT jumlah FROM alat WHERE id = ?").bind(alat).first()).jumlah, 4, "tak ada yang tertulis"); assert.equal(await n("gudang", `id = '${kosong}'`), 1);
  assert.equal((await POST(C, "/api/instansi/gudang/" + gC, {aksi: "konfirmasi"})).s, 200, "jatah per akun");
  assert.equal((await POST(A, "/api/instansi/gudang/" + gA, {aksi: "aneh"})).s, 400, "aksi tak dikenal ditolak sebelum jatah dihitung");
  await DB.prepare("DELETE FROM laju_bnpb WHERE kunci = ?").bind(A.id).run();
  assert.equal((await POST(A, "/api/instansi/alat/" + alat, {aksi: "ubah", jumlah: 9})).s, 200); assert.equal((await POST(A, "/api/instansi/gudang/" + kosong, {aksi: "hapus"})).s, 200); assert.equal((await POST(A, "/api/instansi/alat/" + alat, {aksi: "hapus"})).s, 200);
  await DB.prepare("DELETE FROM laju_bnpb WHERE kunci = ?").bind(A.id).run();
});

uji("ubah alat dikunci optimistis atas status dan tugas lama: kalah balapan = 409 tanpa jejak; yang menang tercatat sekali; tak pernah menghidupkan lagi alat yang sudah pulang", async () => {
  const tugas = await tugasSql(), alat = await alatSql(gA, {status: "dikerahkan", dikerahkan_ke_tugas: tugas, jumlah: 4});
  /* 1. satu penulis: tanpa konflik */
  assert.equal((await POST(A, "/api/instansi/alat/" + alat, {aksi: "ubah", jumlah: 5})).s, 200);
  /* 2. balapan: pemulangan (status siap) bersamaan dengan 8 ubah jumlah yang membaca baris lama */
  let konflik = 0, sukses = 0;
  for (let ronde = 0; ronde < 6; ronde++) {
    await DB.prepare("UPDATE alat SET status = 'dikerahkan', dikerahkan_ke_tugas = ?, jumlah = 4 WHERE id = ?").bind(tugas, alat).run();
    const awal = await n("alat_jejak", `alat_id = '${alat}'`);
    const rs = await Promise.all([POST(A, "/api/instansi/alat/" + alat, {aksi: "ubah", status: "siap"}), ...Array.from({length: 8}, (_, i) => POST(A, "/api/instansi/alat/" + alat, {aksi: "ubah", jumlah: 10 + i}))]);
    for (const r of rs) assert.ok([200, 409].includes(r.s), r.t); konflik += rs.filter(r => r.s === 409).length; sukses += rs.filter(r => r.s === 200).length;
    const akhir = await DB.prepare("SELECT status, dikerahkan_ke_tugas t, jumlah FROM alat WHERE id = ?").bind(alat).first();
    assert.ok((akhir.status === "dikerahkan") === (akhir.t === tugas), "status dan tugas selalu serasi: " + JSON.stringify(akhir));
    /* jejak sama dengan jumlah tulisan yang menang: tiap 200 membawa tepat satu jejak (jumlah atau status) karena tiap permintaan mengubah tepat satu hal */
    assert.equal((await n("alat_jejak", `alat_id = '${alat}'`)) - awal, rs.filter(r => r.s === 200).length, "jejak hanya untuk tulisan yang menang");
    for (const r of rs.filter(x => x.s === 409)) assert.match(r.j.galat, /sudah berubah/);
  }
  assert.equal(konflik + sukses, 54);
  /* 3. DETERMINISTIK: pemicu pada laju_bnpb (ditulis antara BACA baris dan TULIS batch) meniru padam/kerahkan serentak persis di celah itu */
  const pasangPemicu = async isi => { await DB.batch([DB.prepare("DROP TRIGGER IF EXISTS uji_balapan"), DB.prepare(`CREATE TRIGGER uji_balapan AFTER INSERT ON laju_bnpb WHEN NEW.aksi = 'inventaris.tulis' AND NEW.kunci = '${A.id}' BEGIN ${isi} END`)]); };
  const dikerahkanLagi = (t = tugas) => DB.prepare("UPDATE alat SET status = 'dikerahkan', dikerahkan_ke_tugas = ?, jumlah = 4 WHERE id = ?").bind(t, alat).run();
  const keadaan = async () => ({...(await DB.prepare("SELECT status, dikerahkan_ke_tugas t, jumlah FROM alat WHERE id = ?").bind(alat).first()), jejak: await n("alat_jejak", `alat_id = '${alat}'`), gudang: (await DB.prepare("SELECT diubah FROM gudang WHERE id = ?").bind(gA).first()).diubah});
  await DB.prepare("UPDATE gudang SET diubah = 5 WHERE id = ?").bind(gA).run();
  await pasangPemicu(`UPDATE alat SET status = 'siap', dikerahkan_ke_tugas = NULL WHERE id = '${alat}' AND status = 'dikerahkan';`);   // padam serentak
  await dikerahkanLagi(); let sebelum = await keadaan();
  let r409 = await POST(A, "/api/instansi/alat/" + alat, {aksi: "ubah", jumlah: 11}); assert.equal(r409.s, 409, r409.t); assert.match(r409.j.galat, /sudah berubah/);
  let sesudah = await keadaan(); assert.deepEqual(sesudah, {...sebelum, status: "siap", t: null}, "yang menang (pemulangan) utuh; ubah yang kalah tidak menulis, tidak menjejak, tidak menggeser gudang");
  await dikerahkanLagi(); sebelum = await keadaan(); r409 = await POST(A, "/api/instansi/alat/" + alat, {aksi: "hapus"}); assert.equal(r409.s, 409, r409.t); assert.equal(await n("alat", `id = '${alat}'`), 1, "hapus yang kalah tidak menghapus");
  assert.deepEqual(await keadaan(), {...sebelum, status: "siap", t: null}, "tanpa jejak hapus dan gudang tak bergeser");
  const tugas2 = await tugasSql();   // kerahkan ke tugas LAIN serentak: status sama, tugas beda tetap konflik
  await pasangPemicu(`UPDATE alat SET dikerahkan_ke_tugas = '${tugas2}' WHERE id = '${alat}' AND status = 'dikerahkan';`);
  await dikerahkanLagi(); sebelum = await keadaan(); r409 = await POST(A, "/api/instansi/alat/" + alat, {aksi: "ubah", catatan: "pindah tugas"}); assert.equal(r409.s, 409, r409.t); assert.deepEqual(await keadaan(), {...sebelum, t: tugas2});
  await DB.prepare("DROP TRIGGER uji_balapan").run();
  await dikerahkanLagi(); const ok = await POST(A, "/api/instansi/alat/" + alat, {aksi: "ubah", jumlah: 12}); assert.equal(ok.s, 200, ok.t); assert.equal((await jejak(alat)).at(-1).aksi, "jumlah");
  /* 4. basi secara pasti: alat dipulangkan, lalu permintaan ubah jumlah yang membawa pembacaan lama tidak boleh membuatnya 'dikerahkan' kembali */
  await DB.prepare("UPDATE alat SET status = 'siap', dikerahkan_ke_tugas = NULL WHERE id = ?").bind(alat).run();
  const r = await POST(A, "/api/instansi/alat/" + alat, {aksi: "ubah", jumlah: 77}); assert.equal(r.s, 200); assert.equal(r.j.alat.status, "siap"); assert.equal(r.j.alat.dikerahkan_ke_tugas, null);
});

uji("hapus alat memakai kunci yang sama; hapus gudang atomik: gudang berisi alat tak terhapus, alat yang masuk serentak tak hilang diam-diam", async () => {
  const g = await gudangSql(A.id, {nama: "Gudang Hapus"}), alat = await alatSql(g);
  assert.equal((await POST(A, "/api/instansi/gudang/" + g, {aksi: "hapus"})).s, 409); assert.equal(await n("gudang", `id = '${g}'`), 1);
  assert.equal((await POST(A, "/api/instansi/alat/" + alat, {aksi: "hapus"})).s, 200); assert.deepEqual((await jejak(alat)).map(j => j.aksi), ["hapus"], "jejak hapus tepat sekali");
  assert.equal((await POST(A, "/api/instansi/gudang/" + g, {aksi: "hapus"})).s, 200); assert.equal(await n("gudang", `id = '${g}'`), 0);
  assert.equal((await POST(A, "/api/instansi/gudang/" + g, {aksi: "hapus"})).s, 404, "sudah tidak ada");
  /* DETERMINISTIK: alat masuk persis di celah antara pemeriksaan dan penghapusan (pemicu pada laju_bnpb) tidak boleh ikut terhapus lewat CASCADE */
  const gz = await gudangSql(A.id, {nama: "Gudang Celah"}), az = id16();
  await DB.batch([DB.prepare(`CREATE TRIGGER uji_celah AFTER INSERT ON laju_bnpb WHEN NEW.aksi = 'inventaris.tulis' AND NEW.kunci = '${A.id}' BEGIN INSERT INTO alat (id, gudang_id, kategori, jumlah, dibuat, diubah) VALUES ('${az}', '${gz}', 'tenda', 1, 1, 1); END`)]);
  const celah = await POST(A, "/api/instansi/gudang/" + gz, {aksi: "hapus"}); await DB.prepare("DROP TRIGGER uji_celah").run();
  assert.equal(celah.s, 409, celah.t); assert.equal(await n("gudang", `id = '${gz}'`), 1); assert.equal(await n("alat", `id = '${az}'`), 1, "alat yang masuk di celah tidak lenyap diam-diam");
  /* balapan: tambah alat serentak dengan hapus gudang kosong. Boleh salah satu menang, TIDAK boleh alat tercatat 201 lalu lenyap bersama gudangnya. */
  for (let i = 0; i < 12; i++) {
    const gi = await gudangSql(A.id, {nama: "Gudang Balap " + i});
    const [h, t] = await Promise.all([POST(A, "/api/instansi/gudang/" + gi, {aksi: "hapus"}), POST(A, "/api/instansi/alat", {gudang_id: gi, kategori: "tenda", jumlah: 2})]);
    assert.ok([200, 409].includes(h.s), h.t); assert.ok([201, 409, 404].includes(t.s), `tambah alat serentak: ${t.s} ${t.t}`);
    if (t.s === 201) assert.equal(await n("alat", `id = '${t.j.id}'`), 1, "alat yang berhasil ditambah tidak ikut terhapus bersama gudang"), assert.equal(h.s, 409, "gudang berisi tidak boleh terhapus");
    if (h.s === 200) assert.equal(await n("gudang", `id = '${gi}'`), 0); else assert.equal(await n("gudang", `id = '${gi}'`), 1);
  }
});

/* ================================================================ butir 4: koordinat pihak lain dibulatkan */
uji("ringkasan wilayah: koordinat gudang akun LAIN dibulatkan 0,01 derajat; milik sendiri dan admin presisi; rincian tugas ikut menyamarkan", async () => {
  const w = (await GET(A, "/api/instansi/inventaris/wilayah")).j, c = w.gudang.find(g => g.id === gC), a = w.gudang.find(g => g.id === gA);
  assert.deepEqual([c.lat, c.lon, c.koordinat_kasar], [-2.46, 114.12, true], JSON.stringify(c)); assert.deepEqual([a.lat, a.lon, a.koordinat_kasar], [-2.25, 113.95, false], "milik sendiri presisi");
  assert.ok(!JSON.stringify(w).includes("-2.4567") && !JSON.stringify(w).includes("114.1234"));
  const wC = (await GET(C, "/api/instansi/inventaris/wilayah")).j; assert.deepEqual([wC.gudang.find(g => g.id === gC).lat, wC.gudang.find(g => g.id === gC).lon], [-2.4567, 114.1234], "pemilik presisi");
  const adm = (await api("GET", "/api/inventaris", undefined, ADMIN)).j.gudang.find(g => g.id === gC); assert.deepEqual([adm.lat, adm.lon], [-2.4567, 114.1234], "admin presisi");
  const t = await tugasSql({status: "buka", konfirmasi_pada: Date.now() - JAM, rekomendasi: null}); await alatSql(gC, {kategori: "pompa", kelas_pompa: "debit_besar", hp: 5.5, jumlah: 2});
  await sisip("tugas_isian", {id: id16(), tugas_id: t, akun_id: A.id, klien_id: "konf" + t, langkah: "konfirmasi", dibuat: Date.now() - JAM, lat: -2.2, lon: 113.9, waktu_gps: Date.now() - JAM, hasil: "api_ada", pic_nama: "Pak Joko", pic_jabatan: "Kades", pic_wa: "628123456781"});
  const r = (await GET(A, "/api/instansi/tugas/" + t)).j.gudang_terdekat.gudang.find(g => g.id === gC); assert.deepEqual([r.lat, r.lon], [-2.46, 114.12], "gudang terdekat pihak lain ikut dibulatkan");
  const ra = (await api("GET", "/api/instansi/admin/tugas/" + t, undefined, ADMIN)).j.gudang_terdekat.gudang.find(g => g.id === gC); assert.deepEqual([ra.lat, ra.lon], [-2.4567, 114.1234], "admin presisi");
});

/* ================================================================ butir 5: pic_wa bukan untuk pimpinan */
uji("pic_wa gudang hanya untuk moderator dan staf verifikator/pusdalops; pimpinan dan koordinator melihat gudangnya tanpa nomor", async () => {
  const pim = await staf("Pimpinan", ["pimpinan"]), koord = await staf("Koordinator", ["koordalops"]), ver = await staf("Verifikator", ["verifikator"]), pus = await staf("Pusdalops", ["pusdalops"]);
  const daftar = async h => (await api("GET", "/api/inventaris", undefined, h)).j.gudang.find(g => g.id === gC), rinci = async h => (await api("GET", "/api/inventaris/gudang/" + gC, undefined, h)).j.gudang;
  for (const [nama, h] of [["pimpinan", pim.h], ["koordinator", koord.h]]) { const d = await daftar(h), r = await rinci(h); assert.equal(d.pic_wa, null, nama); assert.equal(r.pic_wa, null, nama); assert.equal(d.pic_nama, "Bu Sari", nama + ": nama PIC tetap terlihat"); assert.ok(d.total >= 0); }
  for (const [nama, h] of [["verifikator", ver.h], ["pusdalops", pus.h], ["moderator", MOD2], ["super", ADMIN]]) { assert.equal((await daftar(h)).pic_wa, "6281299900001", nama); assert.equal((await rinci(h)).pic_wa, "6281299900001", nama); }
  assert.ok(!(await api("GET", "/api/inventaris", undefined, pim.h)).t.includes("6281299900001"), "nomor tak ada di muatan pimpinan");
});

/* ================================================================ butir 6: komentar jejak */
uji("komentar jejak: hanya menambah, kecuali baris dummy", async () => {
  const sql = teks("migrations/0031_inventaris.sql"); assert.ok(sql.includes("hanya menambah, kecuali baris dummy"), "komentar jejak diperjelas");
  await assert.rejects(() => DB.prepare("UPDATE alat_jejak SET aksi = 'hapus' WHERE dummy = 0").run(), /hanya bisa ditambah/); await assert.rejects(() => DB.prepare("DELETE FROM alat_jejak WHERE dummy = 0").run(), /hanya bisa ditambah/);
  await sisip("alat_jejak", {waktu: 1, oleh: "uji", alat_id: id16(), gudang_id: id16(), aksi: "tambah", dummy: 1}); await DB.prepare("DELETE FROM alat_jejak WHERE dummy = 1").run();
});

/* ================================================================ retensi tanpa 0031 (paling akhir: menjatuhkan tabel inventaris) */
uji("retensi tetap jalan tanpa migrasi 0031: tugas lama dihapus, tidak melempar", async () => {
  const lama = await tugasSql({dibuat: Date.now() - 200 * HARI});
  for (const t of ["alat_jejak", "alat", "gudang"]) await DB.prepare(`DROP TABLE ${t}`).run();
  await cron17(); assert.equal(await n("tugas_api", `id = '${lama}'`), 0);
});
