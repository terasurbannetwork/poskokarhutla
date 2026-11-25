/* LJ-17 (D23, K9): data pribadi dihapus 5 tahun sesudah penutupan diterima; LJ-19: foto draf R2 yatim disapu.
   Cron bersih-bersih sungguhan (hapusPribadiLama, sapuDrafYatim) di workerd (Miniflare), D1 dan R2 sungguhan, tanpa mock. Nomor WA rekaan.
   Jalan: node --test tests/lapor/lanjut_hapus.test.mjs */
import assert from "node:assert/strict";
import {siapkan, berantai} from "../warga/_bnpb.mjs";
import "../../src/worker.js";
import {hapusPribadiLama, sapuDrafYatim, LIMA_TAHUN_MS} from "../../src/lapor_lanjut.js";
import {bersihkanLapor} from "../../src/lapor_ai.js";
import {kunciFotoDraf} from "../../src/lapor_lanjut_mesin.js";

const uji = berantai();
const U = await siapkan("uji-lapor-hapus", {r2: true}), {DB, n} = U;
const HARI = 864e5, kini = Date.now(), JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);
let r2, env;
const id = (c, i) => c.repeat(15) + i.toString(16);   // 16 heks
const berkas = async (b, status, ditutup, induk) => {
  await DB.prepare("INSERT INTO lj_berkas (id, induk, kab, status, isian, ditutup, dibuat, diubah) VALUES (?, ?, '32.71', ?, '{}', ?, 1, 1)").bind(b, induk, status, ditutup).run();
  await DB.prepare("INSERT INTO lj_tim (berkas, wa, peran, oleh, dibuat) VALUES (?, '6281299770001', 'ketua', 'uji', 1)").bind(b).run();
};
const objek = async (b, o, jenis, urut) => DB.prepare("INSERT INTO lj_objek (id, berkas, jenis, urut, data, pribadi, oleh, dibuat, diubah) VALUES (?, ?, ?, ?, '{\"umur\":30}', '{\"nama\":\"Rani Rahasia\",\"hp\":\"081299770099\"}', 'uji', 1, 1)").bind(o, b, jenis, urut).run();
const media = async (b, o, m, jenis) => {
  const kunci = `lapor/data/${b}/${jenis === "wajah" ? "wajah" : o}/${m}.jpg`;
  await r2.put(kunci, JPEG); await DB.prepare("INSERT INTO lj_media (id, objek, kunci_r2, jenis, waktu_terima, lencana, pintu, oleh) VALUES (?, ?, ?, ?, 1, 'tanpa', 'web', 'uji')").bind(m, o, kunci, jenis).run();
  return kunci;
};
const pribadi = b => DB.prepare("SELECT count(*) n FROM lj_objek WHERE berkas = ? AND pribadi IS NOT NULL").bind(b).first().then(x => x.n);
const jejak = b => n("lj_jejak", `berkas = '${b}' AND aksi = 'hapus_pribadi'`);
const A = id("a", 1), B = id("b", 2), C = id("c", 3), D = id("d", 4), K = {};

uji("siapkan: empat berkas (lewat 5 tahun sehari, kurang sehari, dibuka lagi, masih terbuka) dengan pengungsi, foto wajah, dan foto rumah", async () => {
  r2 = await U.mf.getR2Bucket("MEDIA"); env = {DB, MEDIA: r2};
  const t = LIMA_TAHUN_MS;
  await berkas(A, "selesai", Math.round(kini - t - HARI), "LA-241126-01");
  await berkas(B, "selesai_catatan", Math.round(kini - t + HARI), "LA-241126-02");
  await berkas(C, "terbuka", null, "LA-241126-03");   // dibuka lagi: ditutup NULL
  await berkas(D, "terbuka", null, "LA-241126-04");
  let i = 0;
  for (const b of [A, B, C]) {
    const jw = id("j", ++i), rm = id("r", ++i);
    await objek(b, jw, "jiwa", 1); await objek(b, rm, "rumah", 1);
    K[b] = {wajah: await media(b, jw, id("w", ++i), "wajah"), foto: await media(b, rm, id("f", ++i), "foto"), jw, rm};
  }
  assert.equal(await pribadi(A), 2);
});

uji("5 tahun lewat sehari dikosongkan: pribadi NULL, wajah hilang dari R2 dan D1, foto rumah dan data tetap, jejak tercatat; kurang sehari dan berkas dibuka lagi tidak", async () => {
  const h = await hapusPribadiLama(env, kini); assert.deepEqual(h, {berkas: 1, objek: 2, wajah: 1});
  assert.equal(await pribadi(A), 0); assert.equal(await r2.head(K[A].wajah), null); assert.ok(await r2.head(K[A].foto));
  assert.equal(await n("lj_media", `objek = '${K[A].jw}'`), 0); assert.equal(await n("lj_media", `objek = '${K[A].rm}' AND jenis = 'foto'`), 1);
  assert.equal(JSON.parse((await DB.prepare("SELECT data FROM lj_objek WHERE id = ?").bind(K[A].jw).first()).data).umur, 30, "isian data tetap");
  assert.equal(await jejak(A), 1);
  for (const b of [B, C]) { assert.equal(await pribadi(b), 2, b); assert.ok(await r2.head(K[b].wajah), b); assert.equal(await jejak(b), 0); }
  assert.equal(await jejak(D), 0);
});

uji("idempoten: putaran kedua tidak menulis jejak lagi; berkas yang dibuka lalu ditutup lagi dihitung dari penutupan baru", async () => {
  assert.deepEqual(await hapusPribadiLama(env, kini), {berkas: 0, objek: 0, wajah: 0}); assert.equal(await jejak(A), 1);
  await DB.prepare("UPDATE lj_berkas SET status = 'terbuka', ditutup = NULL WHERE id = ?").bind(A).run();
  await DB.prepare("UPDATE lj_objek SET pribadi = '{\"nama\":\"Baru Rahasia\"}' WHERE id = ?").bind(K[A].jw).run();
  assert.deepEqual(await hapusPribadiLama(env, kini), {berkas: 0, objek: 0, wajah: 0}); assert.equal(await pribadi(A), 1, "dibuka lagi: tidak dihapus");
  await DB.prepare("UPDATE lj_berkas SET status = 'selesai', ditutup = ? WHERE id = ?").bind(kini - 1000, A).run();   // ditutup lagi sekarang, belum 5 tahun
  assert.deepEqual(await hapusPribadiLama(env, kini), {berkas: 0, objek: 0, wajah: 0}); assert.equal(await pribadi(A), 1, "belum 5 tahun sejak penutupan baru");
});

uji("sampai 5 tahun sejak penutupan baru lewat: dikosongkan lagi lewat bersihkanLapor (cron menit 17), jejak kedua", async () => {
  const nanti = Math.round(kini + LIMA_TAHUN_MS + 5000);   // jam bergeser 5 tahun: penutupan baru (kini + 1 detik) sudah lewat batas, jejak lama bertanggal sebelum penutupan baru
  await DB.prepare("UPDATE lj_berkas SET ditutup = ? WHERE id = ?").bind(kini + 1000, A).run();
  await bersihkanLapor(env, nanti);
  assert.equal(await pribadi(A), 0); assert.equal(await jejak(A), 2); assert.equal(await pribadi(C), 2, "dibuka lagi tidak");
});

/* ---------- LJ-19 ---------- */
uji("sapu draf: draf yatim lebih dari 2 hari dibuang, draf yang masih dipakai lj_sesi dan draf muda tidak tersentuh", async () => {
  const kunciTua = `lapor/data/${D}/draf/${id("1", 1)}.jpg`, kunciMuda = `lapor/data/${D}/draf/${id("2", 2)}.jpg`, kunciPakai = kunciFotoDraf(D, id("3", 3));
  for (const k of [kunciTua, kunciPakai]) await r2.put(k, JPEG);
  await DB.prepare("INSERT INTO lj_sesi (wa, berkas, keadaan, diubah) VALUES ('6281299770001', ?, ?, ?)").bind(D, JSON.stringify({foto: [{i: id("3", 3)}]}), kini).run();
  assert.equal(await sapuDrafYatim(env, kini), 0, "semua masih muda");
  assert.equal(await sapuDrafYatim(env, kini + 3 * HARI), 1, "jam digeser 3 hari: hanya yang tidak disebut sesi");   // uploaded R2 = waktu nyata; jam uji yang digeser
  assert.equal(await r2.head(kunciTua), null); assert.ok(await r2.head(kunciPakai), "dipakai sesi");
  await r2.put(kunciMuda, JPEG); assert.equal(await sapuDrafYatim(env, kini + 1000), 0); assert.ok(await r2.head(kunciMuda), "muda tidak tersentuh");
});

uji("sapu draf: tanpa R2 tidak galat; sesi yang sudah tidak menyebut draf melepasnya", async () => {
  assert.equal(await sapuDrafYatim({DB}, kini), 0);
  await DB.prepare("DELETE FROM lj_sesi WHERE berkas = ?").bind(D).run();
  assert.equal(await sapuDrafYatim(env, kini + 3 * HARI), 2, "tanpa sesi: draf dipakai dan muda sama-sama lewat 2 hari pada jam geser");
  assert.equal((await r2.list({prefix: `lapor/data/${D}/draf/`})).objects.length, 0);
});

/* ---------- putaran perbaikan pemeriksa ---------- */
uji("hapus pribadi: D1 dulu dijaga syarat tutup; berkas dibuka lagi sesudah daftar dibaca tidak kehilangan foto; sidik jejak pribadi dikosongkan; yatim R2 disapu", async () => {
  const E = id("e", 5), F = id("f", 6), lama = Math.round(kini - LIMA_TAHUN_MS - HARI);
  await berkas(E, "selesai", lama, "LA-241126-05"); const jw = id("k", 9); await objek(E, jw, "jiwa", 1); const kw = await media(E, jw, id("v", 9), "wajah");
  await DB.prepare("INSERT INTO lj_jejak (berkas, aksi, pribadi_sidik, oleh, waktu) VALUES (?, 'isian', ?, 'tim:x', 1)").bind(E, "9".repeat(64)).run();
  const yatim = `lapor/data/${E}/wajah/${id("y", 1)}.jpg`; await r2.put(yatim, JPEG);   // foto tanpa baris D1
  // balapan: berkas dibuka lagi tepat sesudah daftar jatuh tempo dibaca, sebelum penghapusan
  const H = await import("../../src/hak.js");
  const daftar = await H.ljPribadiJatuhTempo(env, H.pelakuLpCron, Math.round(kini - LIMA_TAHUN_MS), 50); assert.ok(daftar.includes(E));
  await DB.prepare("UPDATE lj_berkas SET status = 'terbuka', ditutup = NULL WHERE id = ?").bind(E).run();
  const r = await H.ljBatch(env, H.pelakuLpCron, [H.ljStmtMediaLepas(env, H.pelakuLpCron, E, Math.round(kini - LIMA_TAHUN_MS), [id("v", 9)])]);
  assert.equal(r[0].results.length, 0, "tidak ada baris terhapus untuk berkas yang dibuka lagi"); assert.ok(await r2.head(kw), "foto tetap"); assert.equal(await n("lj_media", `objek = '${jw}'`), 1);
  // tutup lagi, lewat 5 tahun: semua beres
  await DB.prepare("UPDATE lj_berkas SET status = 'selesai', ditutup = ? WHERE id = ?").bind(lama, E).run();
  assert.equal((await hapusPribadiLama(env, kini)).berkas, 1);
  assert.equal(await r2.head(kw), null); assert.equal(await r2.head(yatim), null, "yatim R2 disapu"); assert.equal(await pribadi(E), 0);
  assert.equal(await n("lj_jejak", `berkas = '${E}' AND aksi = 'isian' AND pribadi_sidik IS NULL`), 1, "sidik pribadi di jejak dikosongkan, baris jejak tetap");
  assert.equal(await n("lj_tim", `berkas = '${E}'`), 1, "lj_tim tidak disentuh");
});
