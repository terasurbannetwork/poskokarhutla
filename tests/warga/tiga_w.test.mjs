/* 3W dan tawaran TW-02/TW-03 (data/kajian-bnpb/tiga-w/RENCANA-UJI.md T1-T4, T6-T8 sisi fungsi, T10, T11, T12) di workerd (Miniflare) dengan D1 sungguhan,
   migrasi apa adanya. Jalankan: node --test tests/warga/tiga_w.test.mjs */
import {test as uji} from "node:test";
import assert from "node:assert/strict";
import {siapkan} from "./_bnpb.mjs";
import "../../src/worker.js";   // worker dulu: modul saling impor
import {Galat, pelakuTwBaca, pelakuTwTulis, twOrgBuat, twBarisBuat, twBarisUbah, twBarisDaftar, twGrid, twCelahTumpang, twTokenBuat, twTokenCabut, twTokenCari,
  twTawaranBuat, twTawaranDaftar, twRiwayat, twKeputusan, twKandidat, TW_SQL, TW_KLASTER} from "../../src/hak.js";
import {NAMA_KAB4} from "../../src/siklus_kab.js";
import {BARANG} from "../../src/meja_spek.js";

const {DB} = await siapkan("uji-tiga-w"), env = {DB}, JAM = 36e5, T = pelakuTwTulis, B = pelakuTwBaca;
const KINI = Date.parse("2026-11-15T12:00:00Z"), MULAI = "2026-11-10";
const KJ = "KJ-2026-0000000A", KJ2 = "KJ-2026-0000000B";
let nId = 0; const id16 = () => "id" + String(++nId).padStart(14, "0");
const n = async (t, w = "1") => (await DB.prepare(`SELECT count(*) n FROM ${t} WHERE ${w}`).first()).n;
const galat = async (f, status) => { try { await f(); } catch (e) { assert.ok(e instanceof Galat, String(e)); assert.equal(e.status, status); return; } assert.fail("seharusnya Galat " + status); };
const kejadian = async (kj, kabs, mulai = MULAI) => {
  await DB.prepare("INSERT INTO sk_kejadian (id, jenis, nama, kab4, mulai, fase_diubah, asal, dibuat, diubah, oleh) VALUES (?, 'banjir', 'Banjir uji', ?, ?, ?, 'manual', ?, ?, 'uji')").bind(kj, kabs[0], mulai, KINI, KINI, KINI).run();
  for (const k of kabs) await DB.prepare("INSERT INTO sk_kejadian_kab (kejadian_id, kab4, mulai, dibuat) VALUES (?, ?, ?, ?)").bind(kj, k, mulai, KINI).run();
};
const org = async (nama, jenis = "ngo_nasional", extra = {}) => { const id = id16(); assert.equal(await twOrgBuat(env, T, {id, nama, jenis, oleh: "staf:1", ...extra}, KINI), true); return id; };
const baris = (o, kab4, klaster, status = "berjalan", kj = KJ) => twBarisBuat(env, T, {id: id16(), kejadianId: kj, kab4, klaster, orgId: o, kegiatan: "Distribusi bantuan uji", status, sumber: "staf", oleh: "staf:1"}, KINI);
const mkMeja = async (kab, barang, status, dibuat, diminta, kirim = null) => DB.prepare("INSERT INTO meja_catatan (id, meja, prov, kab, data, status, dibuat, diubah, oleh) VALUES (?, 'logistik', '32', ?, ?, ?, ?, ?, 'uji')")
  .bind(id16(), kab, JSON.stringify({barang, jumlah_diminta: diminta, satuan: "buah", posko: "Posko " + kab, ...(kirim ? {jumlah_kirim: kirim} : {})}), status, dibuat, dibuat).run();

await kejadian(KJ, ["3201", "3202", "3203"]);
await kejadian(KJ2, ["3204"]);

uji("T1 organisasi: internasional tanpa negara ditolak; jenis asing ditolak; kampus menautkan institusi_id", async () => {
  await galat(() => twOrgBuat(env, T, {id: id16(), nama: "Lembaga Asing", jenis: "ngo_internasional", oleh: "s"}, KINI), 400);
  await galat(() => twOrgBuat(env, T, {id: id16(), nama: "Lembaga", jenis: "aneh", oleh: "s"}, KINI), 400);
  await galat(() => twOrgBuat(env, B, {id: id16(), nama: "Lembaga", jenis: "kl", oleh: "s"}, KINI), 403);
  await assert.rejects(() => DB.prepare("INSERT INTO org (id, nama, jenis, dibuat, oleh) VALUES ('x000000000000001', 'Asing', 'ngo_internasional', 1, 's')").run(), /CHECK/);
  await org("Save Asing", "ngo_internasional", {negara: "nl"});
  assert.equal((await DB.prepare("SELECT negara FROM org WHERE nama = 'Save Asing'").first()).negara, "NL");
  await assert.rejects(() => twOrgBuat(env, T, {id: id16(), nama: "Kampus X", jenis: "kampus", institusiId: "tidakada00000000", oleh: "s"}, KINI), /FOREIGN/i);
});

uji("T2 baris 3W: klaster di luar delapan ditolak; kab di luar sk_kejadian_kab tidak menulis; klaster sah semua diterima", async () => {
  const o = await org("PMI Uji", "pmi");
  await galat(() => baris(o, "3201", "intelijen"), 400);
  await assert.rejects(() => DB.prepare("INSERT INTO tw_baris (id, kejadian_id, kab4, klaster, org_id, kegiatan, status, sumber, diubah, oleh) VALUES ('b000000000000001', ?, '3201', 'intelijen', ?, 'kegiatan uji', 'berjalan', 'staf', 1, 's')").bind(KJ, o).run(), /CHECK/);
  assert.equal(await baris(o, "3204", "sar"), false, "3204 bukan bagian kejadian KJ");
  assert.equal(await baris(o, "3201", "sar", "berjalan", "KJ-2026-ZZZZZZZZ"), false);
  assert.equal(await n("tw_baris"), 0);
  for (const c of TW_KLASTER) assert.equal(await baris(o, "3201", c, "rencana"), true);
  assert.equal(await n("tw_baris"), 8);
  await galat(() => baris(o, "3201", "sar", "mulai"), 400);
  const [b] = await twBarisDaftar(env, B, KJ, o); assert.equal(b.org_nama, "PMI Uji");
  assert.equal(await twBarisUbah(env, T, {id: b.id, kejadianId: KJ, orgId: "orang-lain-0000", status: "berjalan", kegiatan: "Distribusi bantuan uji", oleh: "s"}, KINI), false, "baris milik organisasi lain");
  assert.equal(await twBarisUbah(env, T, {id: b.id, kejadianId: KJ, orgId: o, status: "berjalan", kegiatan: "Distribusi bantuan uji", oleh: "s"}, KINI), true);
  await DB.prepare("DELETE FROM tw_baris").run();
});

uji("T3 celah: kab tanpa organisasi berjalan di klaster tampil celah; selesai dan rencana tidak dihitung; pendidikan tidak celah untuk kejadian < 3 hari", async () => {
  const o = await org("Org Celah");
  await baris(o, "3201", "kesehatan"); await baris(o, "3202", "sar", "selesai"); await baris(o, "3203", "logistik", "rencana");
  const r = Object.fromEntries((await twCelahTumpang(env, B, KJ, KINI)).map(x => [x.kab4, x]));
  assert.ok(!r["3201"].celah.includes("kesehatan")); assert.equal(r["3201"].celah.length, 7);
  assert.ok(r["3202"].celah.includes("sar") && r["3203"].celah.includes("logistik"));
  assert.deepEqual(r["3201"].tumpang, []);
  const muda = (await twCelahTumpang(env, B, KJ, Date.parse(MULAI + "T00:00:00+07:00") + 2 * 864e5))[0];
  assert.ok(!muda.celah.includes("pendidikan") && r["3201"].celah.includes("pendidikan"));
  assert.deepEqual((await twGrid(env, B, KJ)).map(x => [x.kab4, x.klaster, x.n]), [["3201", "kesehatan", 1]]);
});

uji("T4 tumpang tindih: 4 organisasi berjalan di (kab, klaster) ditandai; 3 tidak; organisasi sama dua baris dihitung satu", async () => {
  const os = []; for (let i = 0; i < 4; i++) os.push(await org("Org Tumpang " + i));
  for (const o of os.slice(0, 3)) await baris(o, "3202", "pengungsian");
  await baris(os[0], "3202", "pengungsian");   // org sama, baris kedua
  let r = (await twCelahTumpang(env, B, KJ, KINI)).find(x => x.kab4 === "3202");
  assert.deepEqual(r.tumpang, []); assert.equal(r.per_klaster.pengungsian, 3);
  await baris(os[3], "3202", "pengungsian");
  r = (await twCelahTumpang(env, B, KJ, KINI)).find(x => x.kab4 === "3202");
  assert.deepEqual(r.tumpang, ["pengungsian"]);
  await baris(os[3], "3203", "pengungsian", "selesai");   // selesai tidak dihitung
  assert.deepEqual((await twCelahTumpang(env, B, KJ, KINI)).find(x => x.kab4 === "3203").tumpang, []);
});

uji("T5 token: hanya sha disimpan; terbit ulang mencabut yang lama (penanda, bukan hapus); sha unik", async () => {
  const o = await org("Org Token"), sha = h => h.repeat(64);
  assert.equal(await twTokenBuat(env, T, {id: id16(), orgId: o, kejadianId: KJ, tokenSha: sha("a")}, KINI), true);
  assert.equal(await twTokenBuat(env, T, {id: id16(), orgId: o, kejadianId: KJ, tokenSha: sha("b")}, KINI + JAM), true);
  assert.equal(await n("tw_token", `org_id = '${o}'`), 2); assert.equal(await n("tw_token", `org_id = '${o}' AND cabut IS NULL`), 1);
  assert.equal((await twTokenCari(env, B, sha("a"))).cabut, KINI + JAM);
  const b = await twTokenCari(env, B, sha("b")); assert.equal(b.cabut, null); assert.equal(b.org_id, o); assert.equal(b.fase, "terdeteksi");
  assert.equal(await twTokenCari(env, B, sha("c")), null);
  await assert.rejects(() => DB.prepare("INSERT INTO tw_token (id, org_id, kejadian_id, token_sha, dibuat) VALUES (?, ?, ?, ?, 1)").bind(id16(), o, KJ2, "kata-sandi-mentah").run(), /CHECK/);
  assert.equal(await twTokenCabut(env, T, o, KJ, KINI + 2 * JAM), 1);
  assert.equal((await twTokenCari(env, B, sha("b"))).cabut, KINI + 2 * JAM);
});

uji("T6 tawaran: NGO internasional tanpa mitra lokal ditolak; barang di luar daftar ditolak; riwayat awal tertulis", async () => {
  const asing = await org("NGO Asing", "ngo_internasional", {negara: "NL"}), lokal = await org("Mitra Lokal"), nas = await org("NGO Nasional");
  const dasar = {kejadianId: KJ, barang: "tenda", jumlah: 50, satuan: "unit"};
  await galat(() => twTawaranBuat(env, T, {...dasar, id: id16(), orgId: asing}, KINI, BARANG), 400);
  await galat(() => twTawaranBuat(env, T, {...dasar, id: id16(), orgId: nas, barang: "rudal"}, KINI, BARANG), 400);
  await galat(() => twTawaranBuat(env, T, {...dasar, id: id16(), orgId: nas, barang: "lainnya"}, KINI, BARANG), 400);
  assert.equal(await n("tw_tawaran"), 0);
  const a = id16(); assert.equal(await twTawaranBuat(env, T, {...dasar, id: a, orgId: asing, mitraLokalOrgId: lokal}, KINI, BARANG), true);
  assert.equal(await twTawaranBuat(env, T, {...dasar, id: id16(), orgId: nas, kejadianId: "KJ-2026-ZZZZZZZZ"}, KINI, BARANG), false);
  assert.equal(await n("tw_tawaran_riwayat", `tawaran_id = '${a}' AND status = 'masuk'`), 1);
});

uji("T7 keputusan: dialihkan/ditolak tanpa alasan ditolak; riwayat bertambah tiap putusan dalam satu batch; keputusan final tidak bisa diubah", async () => {
  const o = await org("NGO Putus"), a = id16(), dasar = {id: a, kejadianId: KJ};
  await twTawaranBuat(env, T, {id: a, kejadianId: KJ, orgId: o, barang: "terpal", jumlah: 10, satuan: "lembar"}, KINI, BARANG);
  await galat(() => twKeputusan(env, T, {...dasar, status: "ditolak", alasanInternal: "internal saja", oleh: "staf:1"}, KINI), 400);
  await galat(() => twKeputusan(env, T, {...dasar, status: "dialihkan", alasanOrganisasi: "ya", oleh: "staf:1"}, KINI), 400);
  await galat(() => twKeputusan(env, T, {...dasar, status: "masuk", oleh: "staf:1"}, KINI), 400);
  await galat(() => twKeputusan(env, B, {...dasar, status: "diterima", oleh: "staf:1"}, KINI), 403);
  assert.equal(await n("tw_tawaran_riwayat", `tawaran_id = '${a}'`), 1);
  assert.equal(await twKeputusan(env, T, {...dasar, status: "dicocokkan", kebutuhan: [{sumber: "meja", id: "x"}], oleh: "staf:1"}, KINI + JAM), true);
  assert.equal(await twKeputusan(env, T, {...dasar, status: "dialihkan", alasanInternal: "BPBD sudah cukup", alasanOrganisasi: "Dialihkan ke kab lain yang lebih butuh", oleh: "staf:2"}, KINI + 2 * JAM), true);
  assert.equal(await twKeputusan(env, T, {...dasar, status: "diterima", oleh: "staf:2"}, KINI + 3 * JAM), false, "dialihkan sudah final");
  assert.equal(await n("tw_tawaran_riwayat", `tawaran_id = '${a}'`), 3, "putusan yang kalah tidak menulis riwayat");
  assert.deepEqual((await twRiwayat(env, B, a)).map(r => r.status), ["dialihkan", "dicocokkan", "masuk"]);
  await assert.rejects(() => DB.prepare("UPDATE tw_tawaran SET status = 'ditolak', alasan_organisasi = NULL WHERE id = ?").bind(a).run(), /CHECK/);
});

uji("T7b riwayat tawaran append-only (trigger)", async () => {
  for (const sql of ["UPDATE tw_tawaran_riwayat SET status = 'diterima'", "DELETE FROM tw_tawaran_riwayat"]) await assert.rejects(() => DB.prepare(sql).run(), /tidak boleh/);
});

uji("T12 untukOrg tidak pernah memuat alasan_internal (tawaran dan riwayat); staf melihatnya", async () => {
  const o = await org("NGO Alasan"), a = id16();
  await twTawaranBuat(env, T, {id: a, kejadianId: KJ, orgId: o, barang: "genset", jumlah: 2, satuan: "unit"}, KINI, BARANG);
  await twKeputusan(env, T, {id: a, kejadianId: KJ, status: "ditolak", alasanInternal: "RAHASIA-STAF", alasanOrganisasi: "Barang tidak sesuai kebutuhan", oleh: "staf:1"}, KINI + JAM);
  const org_ = await twTawaranDaftar(env, B, KJ, {orgId: o, untukOrg: true}), staf = await twTawaranDaftar(env, B, KJ, {orgId: o});
  assert.ok(!JSON.stringify(org_).includes("RAHASIA-STAF") && !("alasan_internal" in org_[0]) && org_[0].alasan_organisasi);
  assert.equal(staf[0].alasan_internal, "RAHASIA-STAF");
  assert.ok(!JSON.stringify(await twRiwayat(env, B, a, {untukOrg: true})).includes("RAHASIA-STAF"));
  assert.ok(JSON.stringify(await twRiwayat(env, B, a)).includes("RAHASIA-STAF"));
  assert.equal((await twTawaranDaftar(env, B, KJ, {orgId: "lain-0000000000x", untukOrg: true})).length, 0);
});

uji("T8 pencocokan: hanya barang itu, status diminta/disetujui, kab kejadian; urut paling lama lalu sisa terbesar; LogPal ikut; lainnya kosong", async () => {
  const k = z => NAMA_KAB4[z], t0 = KINI - 48 * JAM;
  await mkMeja(k("3201"), "tenda", "diminta", t0 + 5 * JAM, 100);
  await mkMeja(k("3202"), "tenda", "disetujui", t0, 100, 30);          // paling lama, sisa 70
  await mkMeja(k("3203"), "tenda", "diminta", t0 + 5 * JAM, 500);     // sama dengan 3201 tapi sisa lebih besar
  await mkMeja(k("3201"), "tenda", "dikirim", t0, 100);               // status salah
  await mkMeja(k("3201"), "terpal", "diminta", t0, 100);              // barang lain
  await mkMeja(k("3204"), "tenda", "diminta", t0, 100);               // kab di luar kejadian
  await mkMeja("Kab Tidak Ada", "tenda", "diminta", t0, 100);          // tak terpetakan
  await DB.prepare("INSERT INTO logpal_permintaan (id, jenis, bpbd, provinsi, kab, items, tahap, dibuat, diubah) VALUES (?, 'Tanggap darurat', 'BPBD uji', 'Jawa Barat', ?, ?, 1, ?, ?)")
    .bind(id16(), k("3201"), JSON.stringify([{barang: "Tenda", jumlah: 20, satuan: "unit"}, {barang: "Selimut", jumlah: 5, satuan: "pcs"}]), t0 + JAM, t0 + JAM).run();
  const {kandidat, tak_terpetakan} = await twKandidat(env, B, KJ, "tenda", KINI, {"32": "Jawa Barat"});
  assert.deepEqual(kandidat.map(c => [c.sumber, c.kab4, c.sisa]), [["meja", "3202", 70], ["logpal", "3201", 20], ["meja", "3203", 500], ["meja", "3201", 100]]);
  assert.equal(tak_terpetakan, 1);
  assert.deepEqual((await twKandidat(env, B, KJ, "lainnya", KINI)).kandidat, []);
  assert.deepEqual((await twKandidat(env, B, KJ, "selimut", KINI, {"32": "Jawa Barat"})).kandidat.map(c => c.sumber), ["logpal"]);
  assert.deepEqual((await twKandidat(env, B, KJ, "tenda", KINI, {"32": "Jawa Timur"})).kandidat.map(c => c.sumber), ["meja", "meja", "meja"], "provinsi LogPal beda tidak cocok");
});

uji("T10 tw_baris, tw_token, tw_tawaran, tw_tawaran_riwayat berFK ke sk_kejadian (PRAGMA foreign_key_list)", async () => {
  for (const t of ["tw_baris", "tw_token", "tw_tawaran", "tw_tawaran_riwayat"]) {
    const fk = (await DB.prepare(`SELECT "table" tabel, "from" dari FROM pragma_foreign_key_list('${t}')`).all()).results;
    assert.ok(fk.some(f => f.tabel === "sk_kejadian" && f.dari === "kejadian_id"), `${t} tanpa FK kejadian_id -> sk_kejadian: ${JSON.stringify(fk)}`);
  }
  const kol = (await DB.prepare("SELECT group_concat(name) c FROM (SELECT name FROM pragma_table_info('org') UNION ALL SELECT name FROM pragma_table_info('tw_baris'))").first()).c;
  assert.ok(!/dummy/.test(kol), "tanpa kolom dummy");
});

uji("T11 pencocokan meja logistik terlayani indeks ekspresi tw_meja_barang (EXPLAIN)", async () => {
  const plan = (await DB.prepare("EXPLAIN QUERY PLAN " + TW_SQL.meja).bind("32", "tenda", 0).all()).results.map(r => r.detail).join(" | ");
  assert.match(plan, /tw_meja_barang/); assert.doesNotMatch(plan, /SCAN meja_catatan/);
  const lain = (await DB.prepare("EXPLAIN QUERY PLAN " + TW_SQL.meja.replace("INDEXED BY tw_meja_barang ", "")).bind("32", "tenda", 0).all()).results.map(r => r.detail).join(" | ");
  assert.match(lain, /USING (COVERING )?INDEX/, "tanpa INDEXED BY tetap memakai indeks, bukan SCAN: " + lain);
});
