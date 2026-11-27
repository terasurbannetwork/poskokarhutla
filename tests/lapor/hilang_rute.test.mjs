/* Orang hilang publik OH-03 (migrasi 0188, src/hak.js bagian oh_*, src/orang_hilang.js): worker.js utuh di Miniflare + D1 sungguhan, migrasi apa adanya, tanpa mock.
   RENCANA-UJI bagian 2: 2.1, 2.12, 2.12b, 2.15, 2.16, 2.17 (+ batas skema tiap tabel oh_*). Jalankan: node --test tests/lapor/hilang_rute.test.mjs */
import assert from "node:assert/strict";
import {siapkan, berantai} from "../warga/_bnpb.mjs";
import "../../src/worker.js";   // worker dulu: modul saling impor
import * as H from "../../src/hak.js";
import {SUMBER_TANPA_KEJADIAN} from "../../src/siklus_kejadian.js";
import {tglWib, profilPublik, BIDANG_PUBLIK} from "../../src/orang_hilang_murni.js";

const uji = berantai();
const HARI = 864e5, kini = Date.now(), hari = n => tglWib(kini - n * HARI);
const U = await siapkan("uji-oh-rute", {r2: true, ikat: {OH_PUBLIK: "1", PIPA_TOKEN: "token-pipa-uji"}}), {api, DB, n} = U, env = {DB};
const MATI = await siapkan("uji-oh-mati", {r2: true, ikat: {PIPA_TOKEN: "token-pipa-uji"}});
const TOK = {authorization: "Bearer token-pipa-uji"};
const ip = i => ({"cf-connecting-ip": `192.0.2.${i}`});
const KJ = i => `KJ-2026-${String(i).padStart(8, "0")}`, hex = (c, n) => c.repeat(n);
const kejadian = (id, o = {}) => DB.batch([
  DB.prepare("INSERT INTO sk_kejadian (id, jenis, nama, prov, kab4, mulai, fase, fase_diubah, asal, publik, ringkasan_publik, dibuat, diubah, oleh, dummy) VALUES (?, ?, ?, ?, ?, ?, ?, 1, 'otomatis', ?, ?, 1, 1, 'uji', ?)")
    .bind(id, o.jenis ?? "banjir", o.nama ?? "Nama kejadian rahasia", "32", o.kab4 ?? "3203", o.mulai ?? hari(1), o.fase ?? "tanggap", o.publik ? 1 : 0, o.publik ? "Ringkasan publik uji" : null, o.dummy ? 1 : 0),
  ...(o.kab ?? [o.kab4 ?? "3203"]).map(k => DB.prepare("INSERT INTO sk_kejadian_kab (kejadian_id, kab4, mulai, dibuat, dummy) VALUES (?, ?, ?, 1, ?)").bind(id, k, o.mulai ?? hari(1), o.dummy ? 1 : 0))]);

uji("2.1 bendera OH_PUBLIK mati (bawaan): rute kejadian 404 tanpa menyentuh D1", async () => {
  const r = await MATI.api("GET", "/api/lapor/hilang/kejadian?kab=3203");
  assert.equal(r.s, 404); assert.equal(await MATI.n("laju_bnpb"), 0, "tidak menulis laju");
});

uji("2.17 rute kejadian: hanya jenis, kab, tanggal (dan id kejadian); kab tanpa kejadian = daftar kosong; jendela dan fase aktif", async () => {
  await kejadian(KJ(1), {jenis: "banjir", fase: "tanggap", mulai: hari(1)});
  await kejadian(KJ(2), {jenis: "longsor", fase: "selesai", mulai: hari(10)});
  await kejadian(KJ(3), {jenis: "gempa", fase: "selesai", mulai: hari(90)});        // di luar jendela dan sudah selesai
  await kejadian(KJ(4), {jenis: "banjir", fase: "pemulihan", mulai: hari(90)});     // aktif walau lama
  await kejadian(KJ(5), {jenis: "banjir", fase: "terdeteksi", mulai: hari(1)});     // belum diverifikasi
  await kejadian(KJ(6), {jenis: "banjir", fase: "dibatalkan", mulai: hari(1)});
  await kejadian(KJ(7), {jenis: "banjir", fase: "tanggap", mulai: hari(1), dummy: true});
  await kejadian(KJ(8), {jenis: "banjir", fase: "tanggap", mulai: hari(1), kab4: "3204"});                         // kab lain
  await kejadian(KJ(9), {jenis: "cuaca", fase: "tanggap", mulai: hari(2), kab4: "3204", kab: ["3204", "3203"]});   // banyak kab, salah satunya 3203
  await kejadian("KJ-2026-0000000A", {jenis: "kecelakaan", fase: "tanggap", mulai: hari(1)});                       // bukan bencana
  const r = await api("GET", "/api/lapor/hilang/kejadian?kab=32.03", undefined, ip(1)); assert.equal(r.s, 200, r.t);
  assert.deepEqual(new Set(r.j.kejadian.map(k => k.id)), new Set([KJ(1), KJ(9), KJ(4), KJ(2)]), "yang sah saja");
  assert.deepEqual(r.j.kejadian.slice(0, 3).map(k => k.id).sort(), [KJ(1), KJ(4), KJ(9)].sort(), "aktif dulu");
  assert.equal(r.j.kejadian[3].id, KJ(2), "selesai dalam jendela di urutan akhir");
  for (const k of r.j.kejadian) assert.deepEqual(Object.keys(k).sort(), ["id", "jenis", "kab", "kab4", "mulai"], "hanya kolom daftar putih");
  assert.deepEqual(Object.keys(r.j).sort(), ["jendela_hari", "kab", "kab4", "kejadian"]);
  const teks = r.t; for (const t of ["rahasia", "nama", "lat", "pusat", "sumber", "orang", "nomor", "kecelakaan", "fase"]) assert.ok(!teks.includes(t), `bocor: ${t}`);
  assert.equal(r.h.get("cache-control"), "private, no-store"); assert.equal(r.h.get("x-robots-tag"), "noindex");
  const kosong = await api("GET", "/api/lapor/hilang/kejadian?kab=3271", undefined, ip(2)); assert.equal(kosong.s, 200); assert.deepEqual(kosong.j.kejadian, [], "kosong, bukan 0 atau galat");
  for (const j of ["", "?kab=", "?kab=9999", "?kab=abc", "?kab=3203&x=1", "?kab=3203&kab=3204", "?kab=32.03.1"]) assert.equal((await api("GET", "/api/lapor/hilang/kejadian" + j, undefined, ip(3))).s, 400, j);
  assert.equal((await api("POST", "/api/lapor/hilang/kejadian?kab=3203", {})).s, 405, "hanya GET");
});

uji("2.17b rute kejadian dibatasi laju per IP", async () => {
  let s = 0; for (let i = 0; i < 61; i++) s = (await api("GET", "/api/lapor/hilang/kejadian?kab=3271", undefined, ip(77))).s;
  assert.equal(s, 429, "permintaan ke-61 dalam sejam ditolak");
});

uji("2.12 sumber orang_hilang hanya menempel: tidak membuat kejadian, tidak menambah kab, tidak membawa dampak, tidak mengubah fase", async () => {
  assert.deepEqual(SUMBER_TANPA_KEJADIAN, ["orang_hilang"]);
  const POST = b => api("POST", "/api/siklus/ingest/kejadian", b, TOK);
  const item = (o = {}) => ({aksi: "tambah", sumber: "orang_hilang", kode: hex("a", 16), jenis: "banjir", mulai: hari(1), diambil: kini, kejadian_id: KJ(1), ...o});   // tanpa kab4: sumber ini hanya menempel
  const sebelum = {kej: await n("sk_kejadian"), kab: await n("sk_kejadian_kab"), fase: (await DB.prepare("SELECT fase, fase_diubah FROM sk_kejadian WHERE id = ?").bind(KJ(1)).first())};
  for (const [nama, o] of [["baru", {aksi: "baru", kab4: "3203", nama: "Kejadian karangan", kejadian_id: undefined}], ["tambah dengan kab4", {kab4: "3204"}], ["kab[]", {kab: ["3204"]}], ["ambigu", {aksi: "ambigu", kandidat: [KJ(1)], kejadian_id: undefined}], ["tanpa_wilayah", {aksi: "tanpa_wilayah", kejadian_id: undefined}], ["dampak", {dampak: {meninggal: {n: 1, y: "resmi", t: "2026"}}}]]) {
    const r = await POST({keputusan: [item({kode: hex("b", 16), ...o})]}); assert.equal(r.s, 400, `${nama}: ${r.t}`);
  }
  assert.equal(await n("sk_kejadian"), sebelum.kej); assert.equal(await n("sk_kejadian_kab"), sebelum.kab); assert.equal(await n("sk_kejadian_sumber", "sumber = 'orang_hilang'"), 0, "penolakan tidak menulis (tidak masuk antrean staf juga)");
  const ok = await POST({keputusan: [item()]}); assert.equal(ok.s, 200, ok.t); assert.equal(ok.j.terpasang, 1);
  assert.equal(await n("sk_kejadian"), sebelum.kej, "tidak ada kejadian baru"); assert.equal(await n("sk_kejadian_kab"), sebelum.kab, "tidak ada kab baru");
  assert.deepEqual(await DB.prepare("SELECT fase, fase_diubah FROM sk_kejadian WHERE id = ?").bind(KJ(1)).first(), sebelum.fase, "fase tidak berubah");
  assert.equal(await n("sk_kejadian_sumber", "sumber = 'orang_hilang' AND kejadian_id = '" + KJ(1) + "'"), 1);
  const lain = await POST({keputusan: [item({sumber: "dibi", kode: "dibi|3203|x", aksi: "baru", kab4: "3203", nama: "Banjir uji", kejadian_id: undefined, dampak: {meninggal: {n: 1, y: "resmi", t: "2026"}}})]});
  assert.equal(lain.s, 200, "sumber lain tetap boleh membuat kejadian: " + lain.t);
});

uji("2.12b respons publik Buku Besar dan Alun-alun tidak memuat sumber orang_hilang maupun id profil", async () => {
  await kejadian(KJ(11), {jenis: "banjir", fase: "tanggap", publik: true});
  await DB.prepare("INSERT INTO sk_kejadian_sumber (id, sumber, kode, kejadian_id, status, jenis, kab4, mulai, diambil, dibuat, diubah) VALUES (?, 'orang_hilang', ?, ?, 'terpasang', 'banjir', '3203', ?, 1, 1, 1)").bind(hex("c", 16), hex("d", 16), KJ(11), hari(1)).run();
  const p = await api("GET", `/api/siklus/publik/kejadian/${KJ(11)}`, undefined, ip(5)); assert.equal(p.s, 200, p.t);
  const a = await api("GET", "/api/lapor/alun", undefined, ip(6));
  for (const r of [p, a]) for (const t of ["orang_hilang", "oh_", hex("d", 16), hex("c", 16)]) assert.ok(!r.t.includes(t), `bocor: ${t}`);
  const d = await api("GET", "/api/lapor/hilang/kejadian?kab=3203", undefined, ip(7)); assert.ok(!d.t.includes("orang_hilang") && !d.t.includes(hex("d", 16)));
});

const baris = (o = {}) => ({cari_id: o.cari_id ?? hex("1", 16), token: o.token ?? hex("a", 32), kelas: "dewasa", nama: "Budi Santoso", panggilan: "Budi", umur: 23, kelamin: "Laki-laki", tinggi: 168, pakaian: "kaos merah",
  kec: "Cianjur", kab: "32.03", kab_nama: "Kab. Cianjur", waktu_terakhir: kini, kejadian_id: KJ(1), kejadian_jenis: "banjir", kejadian_kab: "3203", kejadian_mulai: hari(1), setuju_versi: 1, setuju_waktu: kini, bidang_pilihan: {foto: 0}, ...o});

uji("2.15 hak tabel: lp_publik hanya membaca oh_publik; oh_riwayat tak bisa diubah atau dihapus petugas; tak seorang pun menghapus riwayat", async () => {
  const P = {pub: H.pelakuLpPublik, staf: H.pelakuLpStaf, pel: H.pelakuLpPelapor, cron: H.pelakuLpCron, sistem: H.pelakuSistem};
  for (const t of ["lapor_cari", "oh_temu", "oh_temu_foto", "oh_info", "oh_riwayat", "oh_cari_foto"]) assert.equal(H.boleh(P.pub, t, "baca"), false, `lp_publik baca ${t}`);
  for (const a of ["tambah", "ubah", "hapus"]) assert.equal(H.boleh(P.pub, "oh_publik", a), false, `lp_publik ${a} oh_publik`);
  assert.equal(H.boleh(P.pub, "oh_publik", "baca"), true);
  for (const [nama, p] of Object.entries(P)) { assert.equal(H.boleh(p, "oh_riwayat", "hapus"), false, `${nama} hapus riwayat`); }
  assert.equal(H.boleh(P.staf, "oh_riwayat", "ubah"), false, "staf tidak mengubah riwayat"); assert.equal(H.boleh(P.staf, "oh_riwayat", "tambah"), true);
  assert.equal(H.boleh(P.cron, "oh_riwayat", "ubah"), true, "cron hanya untuk anonim");
  await assert.rejects(H.ohRiwayat(env, P.pub, hex("1", 16)), e => e instanceof H.Galat && e.status === 403);
  assert.throws(() => H.ohById(env, P.pub, hex("1", 16)), e => e instanceof H.Galat && e.status === 403, "lp_publik tidak membaca baris penuh");
  assert.throws(() => H.ohTambah(env, P.pub, baris(), kini), e => e.status === 403);
});

uji("status: draf ke menunggu ke tayang ke turun lewat ohPindah satu batch dengan riwayat; kalah balapan dan pasangan tak sah ditolak", async () => {
  await H.ohTambah(env, H.pelakuLpPelapor, baris(), kini);
  const S = H.pelakuLpStaf, pindah = (dari, ke, o = {}) => H.ohPindah(env, S, {cari_id: hex("1", 16), dari, ke, oleh: "staf:uji", ...o}, kini + 1000);
  assert.equal((await H.ohById(env, S, hex("1", 16))).status, "draf");
  await assert.rejects(pindah("draf", "tayang"), e => e.status === 409, "draf tidak langsung tayang");
  assert.equal(await pindah("draf", "menunggu"), true); assert.equal(await pindah("draf", "menunggu"), false, "kalah balapan: status lama sudah berubah");
  assert.equal(await n("oh_riwayat", "cari_id = '" + hex("1", 16) + "'"), 1, "riwayat hanya bila UPDATE mengubah baris");
  assert.equal(await pindah("menunggu", "draf", {alasan: "minta_perbaikan", catatan: "foto kurang jelas"}), true);
  assert.equal(await pindah("draf", "menunggu"), true); assert.equal(await pindah("menunggu", "tayang"), true);
  const t = await H.ohById(env, S, hex("1", 16)); assert.equal(t.status, "tayang"); assert.equal(t.tayang_waktu, kini + 1000);
  assert.equal(await pindah("tayang", "turun", {alasan_turun: "dicabut"}), true);
  const d = await H.ohById(env, S, hex("1", 16)); assert.deepEqual([d.status, d.alasan_turun, d.dicabut_waktu], ["turun", "dicabut", kini + 1000]);
  assert.equal(await pindah("turun", "menunggu"), false, "turun karena dicabut tidak bisa kembali sendiri"); assert.equal((await H.ohById(env, S, hex("1", 16))).status, "turun");
  assert.deepEqual((await H.ohRiwayat(env, S, hex("1", 16))).map(r => `${r.dari}>${r.ke}:${r.alasan}`), ["draf>menunggu:menunggu", "menunggu>draf:minta_perbaikan", "draf>menunggu:menunggu", "menunggu>tayang:tayang", "tayang>turun:dicabut"]);
  await assert.rejects(pindah("menunggu", "turun", {alasan_turun: "bebas"}), e => e.status === 400); await assert.rejects(pindah("menunggu", "turun"), e => e.status === 400);
  await H.ohTambah(env, H.pelakuLpPelapor, baris({cari_id: hex("2", 16), token: hex("b", 32)}), kini);
  const k = {cari_id: hex("2", 16), oleh: "cron"}, C = H.pelakuLpCron;
  for (const [a, b, o] of [["draf", "menunggu"], ["menunggu", "tayang"], ["tayang", "turun", {alasan_turun: "kedaluwarsa"}]]) assert.equal(await H.ohPindah(env, C, {...k, dari: a, ke: b, ...o}, kini + 5), true);
  assert.equal(await H.ohPindah(env, C, {...k, dari: "turun", ke: "menunggu"}, kini + 6), true, "kedaluwarsa boleh menayangkan lagi");
  assert.deepEqual(await DB.prepare("SELECT status, alasan_turun FROM oh_publik WHERE cari_id = ?").bind(hex("2", 16)).first(), {status: "menunggu", alasan_turun: null});
});

uji("2.16 daftar publik: SQL tanpa kolom nomor dan tanpa SELECT *, hanya status tayang, kursor opak, rentang umur 5 tahun, indeks terpakai", async () => {
  const S0 = kini - 30 * HARI, [sql] = H.ohSqlDaftar({batas: 20, sejak: S0}); assert.ok(!/nomor|\*/.test(sql), sql); assert.ok(sql.includes("status = 'tayang'"));
  for (const t of H.OH_KOLOM_PUBLIK) assert.ok(!/nomor|pelapor|wali|setuju|kejadian_id|kejadian_oleh|bidang_pilihan|cari_id/.test(t), t);
  const S = H.pelakuLpStaf, PUB = H.pelakuLpPublik;
  for (let i = 3; i <= 8; i++) {
    const id = hex(String(i), 16), st = ["menunggu", "tayang", "tayang", "turun", "tayang", "tayang"][i - 3];
    await H.ohTambah(env, H.pelakuLpPelapor, baris({cari_id: id, token: hex(String(i), 32), umur: 20 + i, kelas: i === 8 ? "anak" : "dewasa"}), kini);
    if (st !== "menunggu") for (const [a, b, o] of [["draf", "menunggu"], ["menunggu", "tayang"], ...(st === "turun" ? [["tayang", "turun", {alasan_turun: "petugas"}]] : [])]) await H.ohPindah(env, S, {cari_id: id, dari: a, ke: b, oleh: "staf:uji", ...o}, kini + i * 1000);
    else await H.ohPindah(env, S, {cari_id: id, dari: "draf", ke: "menunggu", oleh: "staf:uji"}, kini);
  }
  const semua = await H.ohDaftarPublik(env, PUB, {batas: 20, sejak: S0});
  assert.deepEqual(semua.map(r => r.token), [hex("8", 32), hex("7", 32), hex("5", 32), hex("4", 32)], "hanya tayang, terbaru dulu");
  for (const r of semua) { for (const k of Object.keys(r)) assert.ok([...H.OH_KOLOM_PUBLIK, "tayang_waktu"].includes(k), `kolom di luar daftar putih: ${k}`); assert.ok(!("cari_id" in r) && !("kejadian_id" in r)); }
  const h1 = await H.ohDaftarPublik(env, PUB, {batas: 2, sejak: S0}); assert.equal(h1.length, 3, "batas + 1 untuk tanda halaman berikut");
  const h2 = await H.ohDaftarPublik(env, PUB, {batas: 2, sejak: S0, sesudah: {w: h1[1].tayang_waktu, token: h1[1].token}});
  assert.deepEqual([...h1.slice(0, 2), ...h2].map(r => r.token), semua.map(r => r.token), "kursor berjalan tanpa duplikat");
  assert.deepEqual((await H.ohDaftarPublik(env, PUB, {batas: 20, sejak: S0, umur5: 25})).map(r => r.token), [hex("7", 32), hex("5", 32)], "umur 25 sampai 29, dewasa saja (anak berumur 28 tidak ikut)");
  assert.equal((await H.ohDaftarPublik(env, PUB, {batas: 20, sejak: S0, kab: "32.99"})).length, 0);
  assert.equal(await H.ohByToken(env, PUB, hex("3", 32), S0), null, "menunggu = tidak ada"); assert.equal(await H.ohByToken(env, PUB, hex("6", 32), S0), null, "turun = tidak ada"); assert.equal(await H.ohByToken(env, PUB, hex("f", 32), S0), null);
  assert.equal((await H.ohByToken(env, PUB, hex("4", 32), S0)).nama, "Budi Santoso");
  // data anak tidak keluar dari D1; keluaran profilPublik hanya kunci BIDANG_PUBLIK[kelas]
  const anak = (await H.ohDaftarPublik(env, PUB, {batas: 20, sejak: S0})).find(r => r.token === hex("8", 32));
  assert.deepEqual([anak.nama, anak.foto_publik, anak.kelamin, anak.tinggi, anak.ciri, anak.inisial], [null, null, null, null, null, "B. S."]);
  const dewasa = (await H.ohDaftarPublik(env, PUB, {batas: 20, sejak: S0})).find(r => r.token === hex("7", 32));
  assert.equal(dewasa.nama, "Budi Santoso"); assert.deepEqual(Object.keys(dewasa).sort(), [...H.OH_KOLOM_PUBLIK, "tayang_waktu"].sort());
  assert.deepEqual(Object.keys(profilPublik({...anak, nama: anak.inisial}, "anak")).sort(), [...BIDANG_PUBLIK.anak].sort());
  assert.equal(profilPublik({...anak, nama: anak.inisial}, "anak").nama, "B. S.");
  // masa tayang lewat tidak keluar walau cron belum menurunkan
  assert.equal((await H.ohDaftarPublik(env, PUB, {batas: 20, sejak: kini + 60e3})).length, 0); assert.equal(await H.ohByToken(env, PUB, hex("4", 32), kini + 60e3), null);
  assert.throws(() => H.ohSqlDaftar({batas: 20}), e => e.status === 500); assert.throws(() => H.ohByToken(env, PUB, hex("4", 32)), e => e.status === 500);
  const [q, a] = H.ohSqlDaftar({batas: 20, sejak: S0, kab: "32.03"}), plan = (await DB.prepare("EXPLAIN QUERY PLAN " + q).bind(...a).all()).results.map(r => r.detail).join(" | ");
  assert.match(plan, /oh_publik_tayang|oh_publik_status|USING INDEX|SEARCH/, plan);
  const pk = (await DB.prepare("EXPLAIN QUERY PLAN " + H.ohSqlDaftar({batas: 20, sejak: S0})[0]).bind(S0, 21).all()).results.map(r => r.detail).join(" | "); assert.match(pk, /oh_publik_tayang/, "indeks parsial terpakai: " + pk);
  const kj = (await DB.prepare("EXPLAIN QUERY PLAN SELECT k.id FROM sk_kejadian_kab c JOIN sk_kejadian k ON k.id = c.kejadian_id WHERE c.kab4 = ?1 AND c.dummy = 0 ORDER BY c.mulai DESC LIMIT 100").bind("3203").all()).results.map(r => r.detail).join(" | ");
  assert.match(kj, /sk_kejkab_kab/, "pembaca kejadian lewat indeks kab: " + kj);
});

uji("batas skema tiap tabel oh_*: CHECK menolak isian liar, nol bukan pengganti kosong", async () => {
  const gagal = async (sql, ...b) => assert.rejects(DB.prepare(sql).bind(...b).run(), /CHECK|constraint|UNIQUE/i, sql.slice(0, 60));
  const ok = (sql, ...b) => DB.prepare(sql).bind(...b).run();
  const kolomBaru = "(cari_id, token, kelas, status, alasan_turun, umur, dibuat)";
  await gagal(`INSERT INTO oh_publik ${kolomBaru} VALUES (?, ?, 'dewasa', 'turun', NULL, NULL, 1)`, hex("e", 16), hex("e", 32));          // turun tanpa alasan
  await gagal(`INSERT INTO oh_publik ${kolomBaru} VALUES (?, ?, 'dewasa', 'tayang', 'ditolak', NULL, 1)`, hex("e", 16), hex("e", 32));    // alasan tanpa turun
  await gagal(`INSERT INTO oh_publik ${kolomBaru} VALUES (?, ?, 'dewasa', 'draf', NULL, 200, 1)`, hex("e", 16), hex("e", 32));
  await gagal(`INSERT INTO oh_publik ${kolomBaru} VALUES (?, ?, 'dewasa', 'draf', NULL, NULL, 1)`, hex("e", 16), "TOKEN-BUKAN-HEKS-TOKEN-BUKAN-HEK");
  await gagal(`INSERT INTO oh_publik ${kolomBaru} VALUES (?, ?, 'kakek', 'draf', NULL, NULL, 1)`, hex("e", 16), hex("e", 32));
  await gagal(`INSERT INTO oh_publik ${kolomBaru} VALUES (?, ?, 'dewasa', 'draf', NULL, NULL, 1)`, hex("1", 16), hex("e", 32));          // cari_id kembar
  await gagal(`INSERT INTO oh_publik ${kolomBaru} VALUES (?, ?, 'dewasa', 'draf', NULL, NULL, 1)`, hex("e", 16), hex("a", 32));          // token kembar
  await ok(`INSERT INTO oh_publik ${kolomBaru} VALUES (?, ?, 'anak', 'draf', NULL, NULL, 1)`, hex("e", 16), hex("e", 32));
  assert.equal((await DB.prepare("SELECT umur FROM oh_publik WHERE cari_id = ?").bind(hex("e", 16)).first()).umur, null, "kosong tetap NULL");
  const temu = "(id, kab, waktu_temu, kondisi, dibuat)";
  await gagal(`INSERT INTO oh_temu ${temu} VALUES (?, '32.03', 1, 'mabuk', 1)`, hex("1", 16));
  await gagal("INSERT INTO oh_temu (id, kab, waktu_temu, kondisi, bersama, dibuat) VALUES (?, '32.03', 1, 'sadar', 'tetangga', 1)", hex("1", 16));
  await gagal("INSERT INTO oh_temu (id, kab, waktu_temu, kondisi, lat, dibuat) VALUES (?, '32.03', 1, 'sadar', 80, 1)", hex("1", 16));
  await ok(`INSERT INTO oh_temu ${temu} VALUES (?, '32.03', 1, 'terluka', 1)`, hex("1", 16)); assert.equal((await DB.prepare("SELECT status, foto_boleh FROM oh_temu").first()).status, "menunggu");
  await ok("INSERT INTO oh_temu_foto (temu_id, foto_id) VALUES (?, ?)", hex("1", 16), hex("2", 16)); await gagal("INSERT INTO oh_temu_foto (temu_id, foto_id) VALUES (?, ?)", hex("1", 16), hex("2", 16));
  await gagal("INSERT INTO oh_cari_foto (nomor_sha, waktu, kandidat, tingkat) VALUES (?, 1, 1, 'pasti')", hex("a", 64));
  await gagal("INSERT INTO oh_cari_foto (nomor_sha, waktu, kandidat, tingkat) VALUES (?, 1, 9, 'mirip')", hex("a", 64));
  await ok("INSERT INTO oh_cari_foto (nomor_sha, waktu, kandidat, tingkat) VALUES (?, 1, 2, 'mirip')", hex("a", 64));
  await gagal("INSERT INTO oh_info (id, jenis, sasaran_token, dibuat) VALUES (?, 'ancam', ?, 1)", hex("1", 16), hex("a", 32));
  await gagal("INSERT INTO oh_info (id, jenis, sasaran_token, pesan, dibuat) VALUES (?, 'informasi', ?, ?, 1)", hex("1", 16), hex("a", 32), "x".repeat(501));
  await ok("INSERT INTO oh_info (id, jenis, sasaran_token, dibuat) VALUES (?, 'orang_ini', ?, 1)", hex("1", 16), hex("a", 32)); assert.equal((await DB.prepare("SELECT status FROM oh_info").first()).status, "baru");
  await gagal("INSERT INTO oh_riwayat (dari, ke, alasan, oleh, waktu) VALUES ('draf', 'menunggu', 'x', 'u', 1)");                                          // tanpa cari_id maupun temu_id
  await gagal("INSERT INTO oh_riwayat (cari_id, temu_id, dari, ke, alasan, oleh, waktu) VALUES (?, ?, 'draf', 'menunggu', 'x', 'u', 1)", hex("1", 16), hex("1", 16));   // keduanya
  await gagal("INSERT INTO oh_riwayat (cari_id, dari, ke, alasan, catatan, oleh, waktu) VALUES (?, 'a', 'b', 'x', ?, 'u', 1)", hex("1", 16), "x".repeat(141));
  await ok("INSERT INTO oh_riwayat (temu_id, dari, ke, alasan, oleh, waktu) VALUES (?, 'menunggu', 'ditinjau', 'tinjau', 'staf:1', 1)", hex("1", 16));
});

uji("migrasi 0188 idempoten dan tanpa trigger atau data contoh", async () => {
  const {readFileSync} = await import("node:fs"), sql = readFileSync(new URL("../../migrations/0188_orang_hilang.sql", import.meta.url), "utf8");
  assert.ok(!/CREATE TRIGGER|ALTER TABLE|INSERT INTO|DROP /i.test(sql), "tanpa trigger, ALTER, data contoh");
  for (const m of sql.matchAll(/CREATE (?:UNIQUE )?(TABLE|INDEX) (IF NOT EXISTS )?/g)) assert.ok(m[2], "wajib IF NOT EXISTS");
  const {pecah} = await import("../warga/_bantu.mjs"), sebelum = await n("oh_publik");
  await DB.batch(pecah(sql).map(s => DB.prepare(s))); assert.equal(await n("oh_publik"), sebelum, "diterapkan ulang tidak mengubah isi");
  assert.equal(await n("sk_kejadian", "dummy = 1 AND id LIKE 'KJ-%' AND nama LIKE '%oh%'"), 0);
});
