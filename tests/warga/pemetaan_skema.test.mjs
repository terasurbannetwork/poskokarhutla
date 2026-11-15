/* Pemetaan bangunan relawan HR-06 (data/kajian-bnpb/pemetaan-relawan/RENCANA-UJI.md T4, T6, T7, T13): skema pm_proyek, pm_gabung, pm_riwayat di workerd (Miniflare)
   dengan D1 sungguhan. Alur dan satu-proyek-aktif dijaga DB; hak per peran menyusul bersama rute (HR-08). Jalankan: node --test tests/warga/pemetaan_skema.test.mjs */
import {test as uji} from "node:test";
import assert from "node:assert/strict";
import {siapkan} from "./_bnpb.mjs";

const {DB} = await siapkan("uji-pemetaan-skema"), KINI = Date.parse("2026-11-15T12:00:00Z");
const n = async (t, w = "1") => (await DB.prepare(`SELECT count(*) n FROM ${t} WHERE ${w}`).first()).n;
let nid = 0;
const id16 = () => String(++nid).padStart(16, "0").replace(/[^0-9]/g, "0");
const proyek = (o = {}) => { const v = {id: id16(), kab4: "3201", bahaya: "gempa", status: "disiapkan", hashtag: "CentuRisk-3201", setuju: null, ...o};
  return DB.prepare("INSERT INTO pm_proyek (id, kab4, bahaya, status, aoi_r2, hashtag_dasar, dibuat, diubah, disetujui_oleh) VALUES (?, ?, ?, ?, 'pemetaan/aoi.geojson', ?, ?, ?, ?)").bind(v.id, v.kab4, v.bahaya, v.status, v.hashtag, KINI, KINI, v.setuju).run().then(() => v.id); };
const ubah = (id, set, ...b) => DB.prepare(`UPDATE pm_proyek SET ${set} WHERE id = ?`).bind(...b, id).run();
const status = async id => (await DB.prepare("SELECT status FROM pm_proyek WHERE id = ?").bind(id).first()).status;
const TM = "https://tasks.hotosm.org/projects/12345";

uji("T7 satu kab hanya satu proyek aktif; ditolak dan ditutup membebaskan kab; kab lain bebas", async () => {
  const a = await proyek();
  await assert.rejects(() => proyek(), /UNIQUE|satu per kab/);
  await proyek({kab4: "3202"});
  await ubah(a, "status = 'ditolak'", ); assert.equal(await status(a), "ditolak");
  const b = await proyek(); assert.ok(b);
  await assert.rejects(() => proyek({kab4: "32"}), /CHECK/); await assert.rejects(() => proyek({kab4: "abcd"}), /CHECK/);
  await assert.rejects(() => proyek({bahaya: "multi", kab4: "3210"}), /CHECK/); await assert.rejects(() => proyek({hashtag: "Centu Risk!", kab4: "3210"}), /CHECK/);
  for (const o of [{status: "dikirim"}, {status: "disetujui", setuju: "x"}]) await assert.rejects(() => proyek({kab4: "3210", ...o}), /harus disiapkan/, "INSERT langsung di status lanjut melewati gerbang");
  await assert.rejects(() => DB.prepare("INSERT INTO pm_proyek (id, kab4, bahaya, aoi_r2, hashtag_dasar, dibuat, diubah, cek_wiki) VALUES ('9999999999999999', '3210', 'gempa', 'a/b.json', 'Tag', 1, 1, 1)").run(), /harus disiapkan/);
  await assert.rejects(() => DB.prepare("INSERT OR REPLACE INTO pm_proyek (id, kab4, bahaya, aoi_r2, hashtag_dasar, dibuat, diubah) VALUES (?, '3201', 'gempa', 'a/b.json', 'Tag', 1, 1)").bind(b).run(), /harus disiapkan/, "REPLACE sama id");
  await assert.rejects(() => DB.prepare("INSERT OR REPLACE INTO pm_proyek (id, kab4, bahaya, aoi_r2, hashtag_dasar, dibuat, diubah) VALUES ('8888888888888888', '3201', 'gempa', 'a/b.json', 'Tag', 1, 1)").run(), /harus disiapkan/, "REPLACE proyek aktif sekab");
  assert.equal(await status(b), "disiapkan");
});

uji("T4 alur status: loncat ditolak; ditolak dan ditutup terminal; tautan hanya sesudah dikirim", async () => {
  const p = await proyek({kab4: "3301"});
  for (const ke of ["dikirim", "berjalan", "selesai", "ditutup"]) await assert.rejects(() => ubah(p, "status = ?", ke), /tidak sah|CHECK|belum lengkap/, "disiapkan -> " + ke);
  await assert.rejects(() => ubah(p, "tautan_tm = ?", TM), /CHECK/, "tautan tanpa status dikirim");
  await ubah(p, "status = 'disetujui', disetujui_oleh = 'pemilik'");
  await assert.rejects(() => ubah(p, "status = 'selesai'"), /tidak sah/);
  await assert.rejects(() => ubah(p, "status = 'disiapkan'"), /tidak sah/);
  await assert.rejects(() => ubah(p, "tautan_tm = ?", TM), /CHECK/, "tautan tanpa pindah ke dikirim");
  const t = await proyek({kab4: "3302"}); await ubah(t, "status = 'ditolak'");
  await assert.rejects(() => ubah(t, "status = 'disetujui', disetujui_oleh = 'pemilik'"), /tidak sah/);
  await assert.rejects(() => DB.prepare("DELETE FROM pm_proyek WHERE id = ?").bind(t).run(), /tidak boleh/);
});

uji("T13 dikirim butuh tautan https dan ketiga centang daftar penyuntingan; lalu berjalan, selesai, ditutup", async () => {
  const p = await proyek({kab4: "3303"}); await ubah(p, "status = 'disetujui', disetujui_oleh = 'pemilik'");
  await assert.rejects(() => ubah(p, "status = 'dikirim', tautan_tm = ?", TM), /belum lengkap/);
  await ubah(p, "cek_wiki = 1, cek_komunitas = 1");
  await assert.rejects(() => ubah(p, "status = 'dikirim', tautan_tm = ?", TM), /belum lengkap/, "hashtag belum dicentang");
  await ubah(p, "cek_hashtag = 1");
  await assert.rejects(() => ubah(p, "status = 'dikirim'"), /belum lengkap/, "tanpa tautan");
  await assert.rejects(() => ubah(p, "status = 'dikirim', tautan_tm = 'http://tasks.hotosm.org/projects/1'"), /CHECK/);
  await assert.rejects(() => ubah(p, "status = 'dikirim', tautan_tm = 'https://x.org/a b'"), /CHECK/);
  await ubah(p, "status = 'dikirim', tautan_tm = ?", TM); assert.equal(await status(p), "dikirim");
  await assert.rejects(() => ubah(p, "status = 'ditutup'"), /tidak sah/, "harus lewat selesai");
  await ubah(p, "status = 'berjalan'"); await ubah(p, "status = 'selesai', rasio_akhir = 1.2"); await ubah(p, "status = 'ditutup'");
  assert.equal(await status(p), "ditutup");
  await assert.rejects(() => ubah(p, "rasio_akhir = -0.1"), /CHECK/);
  const q = await proyek({kab4: "3306"}); await ubah(q, "status = 'disetujui', disetujui_oleh = 'pemilik', cek_wiki = 1, cek_komunitas = 1, cek_hashtag = 1"); await ubah(q, "status = 'dikirim', tautan_tm = ?", TM);
  for (const set of ["tautan_tm = NULL", "cek_wiki = 0", "cek_komunitas = 0", "cek_hashtag = 0"]) await assert.rejects(() => ubah(q, set), /CHECK|tidak boleh dicabut/, set);
  await ubah(q, "rasio_awal = 0.2");   // ubahan lain tetap boleh
  assert.equal(await status(q), "dikirim");
});

uji("pm_riwayat append-only; pm_gabung PK (proyek, institusi), hashtag CentuRisk-*, FK ke institusi dan proyek", async () => {
  const p = await proyek({kab4: "3304"}), q = await proyek({kab4: "3305"}), inst = "inst000000000001";
  await DB.prepare("INSERT INTO institusi (id, nama, jenis, pic_nama, dibuat, diubah) VALUES (?, 'Kampus Uji', 'pts', 'PIC', 1, 1)").bind(inst).run();
  for (const [pid, st] of [[p, "disiapkan"], [p, "disetujui"], [q, "disiapkan"]]) await DB.prepare("INSERT INTO pm_riwayat (proyek_id, status, catatan, oleh, waktu) VALUES (?, ?, NULL, 'staf:1', ?)").bind(pid, st, KINI).run();
  assert.equal(await n("pm_riwayat", `proyek_id = '${p}'`), 2);
  await assert.rejects(() => DB.prepare("INSERT OR REPLACE INTO pm_riwayat (id, proyek_id, status, oleh, waktu) VALUES (1, ?, 'ditutup', 'x', 1)").bind(p).run(), /tidak boleh ditimpa/);
  assert.equal((await DB.prepare("SELECT status FROM pm_riwayat WHERE id = 1").first()).status, "disiapkan");
  for (const sql of ["UPDATE pm_riwayat SET status = 'ditutup'", "DELETE FROM pm_riwayat"]) await assert.rejects(() => DB.prepare(sql).run(), /tidak boleh/);
  await assert.rejects(() => DB.prepare("INSERT INTO pm_riwayat (proyek_id, status, oleh, waktu) VALUES ('ffffffffffffffff', 'disiapkan', 'x', 1)").run(), /FOREIGN KEY/);
  await assert.rejects(() => DB.prepare("INSERT INTO pm_riwayat (proyek_id, status, oleh, waktu) VALUES (?, 'salah', 'x', 1)").bind(p).run(), /CHECK/);
  const gabung = (pid, ins, h = "CentuRisk-UJI") => DB.prepare("INSERT INTO pm_gabung (proyek_id, institusi_id, hashtag, dibuat) VALUES (?, ?, ?, ?)").bind(pid, ins, h, KINI).run();
  await gabung(p, inst); await gabung(q, inst);
  await assert.rejects(() => gabung(p, inst), /UNIQUE|PRIMARY/); await assert.rejects(() => gabung(p, "inst0000000000ff"), /FOREIGN KEY/);
  await assert.rejects(() => gabung(p, inst, "tanpa-awalan"), /CHECK/); await assert.rejects(() => gabung(q, "inst000000000002", "CentuRisk-UJI"), /FOREIGN KEY/);
  const plan = async (sql, ...b) => (await DB.prepare("EXPLAIN QUERY PLAN " + sql).bind(...b).all()).results.map(r => r.detail).join(" | ");
  assert.match(await plan("SELECT proyek_id FROM pm_gabung WHERE institusi_id = ?", inst), /pm_gabung_institusi/);
  assert.match(await plan("SELECT status FROM pm_riwayat WHERE proyek_id = ? ORDER BY id", p), /pm_riwayat_proyek/);
  assert.match(await plan("SELECT id FROM pm_proyek WHERE kab4 = ? AND status NOT IN ('ditolak', 'ditutup')", "3304"), /pm_proyek_aktif/);
  assert.match(await plan("SELECT id FROM pm_proyek WHERE status = ? ORDER BY dibuat", "disiapkan"), /pm_proyek_status/);
});
