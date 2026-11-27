/* hak.js: pintu D1 untuk akun staf (staf.js tidak menyentuh env.DB). Pola dari platformmeti/src/hak.js, dikecilkan: MATRIKS sebagai data,
   satu fungsi bernama per pernyataan, semua nilai lewat .bind(), kolom dari daftar putih. Pelaku = {peran: "sistem"|"diri"|"admin", id?}.
   sistem = jalur sebelum login dan pembersihan; diri = staf bersesi (hanya baris miliknya); admin = Super Admin.
   Tulis oleh diri/admin selalu satu batch dengan baris pantau_jejak (tulisJejak). Pelaku tanpa hak: Galat 403, diubah bungkusStaf menjadi gagal(403). */
import {bolehPindah, ALASAN_TURUN as OH_ALASAN_TURUN, inisial as ohInisial} from "./orang_hilang_murni.js";   // murni, tanpa impor lain (tidak menarik modul rute ke hak.js)
export class Galat extends Error { constructor(status, pesan) { super(pesan); this.status = status; } }

export const MATRIKS = {
  staf:         {sistem: ["baca"], diri: ["ubah"], admin: ["baca", "tambah", "ubah"]},
  staf_sesi:    {sistem: ["baca", "tambah", "hapus"], diri: ["hapus"], admin: ["hapus"]},
  laju_bnpb:    {sistem: ["baca", "tambah"]},
  pantau_jejak: {diri: ["tambah"], admin: ["tambah"]},
};
export const KOLOM_STAF = ["id", "username", "nama", "nip", "unit", "email", "wa", "peran", "wilayah", "wajib_ganti", "status", "dibuat", "dibuat_oleh", "diputus", "dummy"];   // daftar putih kolom yang boleh dibaca
const KOLOM = KOLOM_STAF.join(", ");

export const pelakuSistem = {peran: "sistem"}, pelakuAdmin = {peran: "admin"}, pelakuDiri = id => ({peran: "diri", id});
export const boleh = (p, tabel, aksi) => !!MATRIKS[tabel]?.[p?.peran]?.includes(aksi);
/* diri hanya boleh menyentuh baris miliknya: `id` harus sama dengan p.id */
const izin = (p, tabel, aksi, id) => {
  if (!boleh(p, tabel, aksi)) throw new Galat(403, `pelaku ${p?.peran ?? "-"} tidak berhak ${aksi} ${tabel}`);
  if (p.peran === "diri" && (id == null || p.id !== id)) throw new Galat(403, "staf hanya mengubah barisnya sendiri");
};
const sedia = (env, p, tabel, aksi, sql, id) => { izin(p, tabel, aksi, id); return env.DB.prepare(sql); };

/* ---------- baca ---------- */
export const sesiDariToken = (env, p, tokenSha, kini) => sedia(env, p, "staf_sesi", "baca",
  `SELECT ${KOLOM_STAF.map(k => "s." + k).join(", ")} FROM staf_sesi x JOIN staf s ON s.id = x.staf_id WHERE x.token_sha = ? AND x.kedaluwarsa > ? AND s.status = 'aktif'`).bind(tokenSha, kini).first();
export const stafUntukMasuk = (env, p, username) => sedia(env, p, "staf", "baca", "SELECT id, garam, sandi_sha, status FROM staf WHERE username = ?").bind(username).first();
export const stafById = (env, p, id) => sedia(env, p, "staf", "baca", `SELECT ${KOLOM} FROM staf WHERE id = ?`).bind(id).first();
export const stafAdaNip = (env, p, nip) => sedia(env, p, "staf", "baca", "SELECT 1 FROM staf WHERE nip = ?").bind(nip).first();
export const stafDaftar = async (env, p) => (await sedia(env, p, "staf", "baca", `SELECT ${KOLOM} FROM staf ORDER BY status, nama LIMIT 500`).all()).results;
export const hitungLaju = async (env, p, kunci, aksi, sejak) => (await sedia(env, p, "laju_bnpb", "baca", "SELECT count(*) n FROM laju_bnpb WHERE kunci = ? AND aksi = ? AND waktu > ?").bind(kunci, aksi, sejak).first()).n;

/* ---------- pernyataan tulis (belum dijalankan; dirangkai ke batch) ---------- */
export const stmtLaju = (env, p, kunci, aksi, kini) => sedia(env, p, "laju_bnpb", "tambah", "INSERT INTO laju_bnpb (kunci, aksi, waktu) VALUES (?, ?, ?)").bind(kunci, aksi, kini);
export const stmtSesiBaru = (env, p, tokenSha, stafId, kini, kedaluwarsa) => sedia(env, p, "staf_sesi", "tambah", "INSERT INTO staf_sesi (token_sha, staf_id, dibuat, kedaluwarsa) VALUES (?, ?, ?, ?)").bind(tokenSha, stafId, kini, kedaluwarsa);
export const stmtSesiBasi = (env, p, stafId, kini) => sedia(env, p, "staf_sesi", "hapus", "DELETE FROM staf_sesi WHERE staf_id = ? AND kedaluwarsa <= ?", stafId).bind(stafId, kini);
export const stmtSesiLain = (env, p, stafId, tokenSha) => sedia(env, p, "staf_sesi", "hapus", "DELETE FROM staf_sesi WHERE staf_id = ? AND token_sha != ?", stafId).bind(stafId, tokenSha);
export const stmtSesiSemua = (env, p, stafId) => sedia(env, p, "staf_sesi", "hapus", "DELETE FROM staf_sesi WHERE staf_id = ?", stafId).bind(stafId);
export const stmtSandi = (env, p, id, garam, sandiSha, wajibGanti) => sedia(env, p, "staf", "ubah", "UPDATE staf SET garam = ?, sandi_sha = ?, wajib_ganti = ? WHERE id = ?", id).bind(garam, sandiSha, wajibGanti, id);
export const stmtCabut = (env, p, id, kini) => sedia(env, p, "staf", "ubah", "UPDATE staf SET status = 'dicabut', diputus = ? WHERE id = ?", id).bind(kini, id);
export const stmtPeran = (env, p, id, peran, wilayah) => sedia(env, p, "staf", "ubah", "UPDATE staf SET peran = ?, wilayah = ? WHERE id = ?", id).bind(JSON.stringify(peran), JSON.stringify(wilayah), id);
export const stmtStafBaru = (env, p, id, username, v, sandi, kini, oleh, dummy = 0) => sedia(env, p, "staf", "tambah", `INSERT INTO staf (id, username, nama, nip, unit, email, wa, peran, wilayah, garam, sandi_sha, wajib_ganti, dibuat, dibuat_oleh, dummy)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, id).bind(id, username, v.nama, v.nip, v.unit, v.email, v.wa, JSON.stringify(v.peran), JSON.stringify(v.wilayah), sandi.garam, sandi.sandi_sha, dummy ? 0 : 1, kini, oleh, dummy);
/* diri hanya mencatat jejak atas namanya sendiri (oleh = "staf:<id>") */
export const stmtJejak = (env, p, oleh, obyek, aksi, ke, catatan, kini, dummy = 0) => sedia(env, p, "pantau_jejak", "tambah",
  "INSERT INTO pantau_jejak (waktu, oleh, obyek, aksi, ke, catatan, dummy) VALUES (?, ?, ?, ?, ?, ?, ?)", oleh === "staf:" + p.id ? p.id : undefined).bind(kini, oleh, obyek, aksi, ke ?? null, catatan ?? null, dummy);

/* ---------- jalankan ---------- */
/* tulis oleh diri/admin: jejak WAJIB, satu batch */
export const tulisJejak = (env, p, tulis, jejak) => {
  if (!jejak) throw new Galat(500, "tulis tanpa jejak ditolak");
  if (p?.peran !== "diri" && p?.peran !== "admin") throw new Galat(403, `pelaku ${p?.peran ?? "-"} tidak menulis dengan jejak`);
  return env.DB.batch([...tulis, jejak]);
};
/* batch tanpa jejak (laju, sesi masuk): hanya pelaku sistem */
export const tulisSistem = (env, p, stmts) => { if (p?.peran !== "sistem") throw new Galat(403, "batch tanpa jejak hanya untuk pelaku sistem"); return env.DB.batch(stmts); };
export const hapusSesiToken = (env, p, tokenSha) => sedia(env, p, "staf_sesi", "hapus", "DELETE FROM staf_sesi WHERE token_sha = ?").bind(tokenSha).run();
export const bersihkanSesi = async (env, p, kini) => (await sedia(env, p, "staf_sesi", "hapus", "DELETE FROM staf_sesi WHERE kedaluwarsa <= ?").bind(kini).run()).meta.changes;

/* Meja Kerja: identitas pelapor pengaduan (Juklak 5/2025, migrasi 0118), terpisah dari meja_catatan.data; dibaca hanya lewat rute peran Irtama/ULP (src/meja.js). */
export const stmtPelapor = (env, id, v, kini, dummy = 0) => env.DB.prepare("INSERT INTO meja_pelapor (catatan_id, nama, alamat, kontak, pekerjaan, dibuat, dummy) VALUES (?, ?, ?, ?, ?, ?, ?)").bind(id, v.nama ?? null, v.alamat ?? null, v.kontak ?? null, v.pekerjaan ?? null, kini, dummy);
export const stmtHapusPelaporDummy = env => env.DB.prepare("DELETE FROM meja_pelapor WHERE dummy = 1");
export const pengaduanById = (env, id) => env.DB.prepare("SELECT id, status FROM meja_catatan WHERE id = ? AND meja = 'pengaduan'").bind(id).first();
export const bacaPelapor = (env, id) => env.DB.prepare("SELECT nama, alamat, kontak, pekerjaan FROM meja_pelapor WHERE catatan_id = ?").bind(id).first();
export const stmtJejakPelapor = (env, id, status, kini, oleh) => env.DB.prepare("INSERT INTO meja_jejak (catatan_id, dari, ke, waktu, oleh, catatan) VALUES (?, ?, ?, ?, ?, 'identitas pelapor dibuka')").bind(id, status, status, kini, oleh);

/* Logbook: isian naratif Juklak 7/2023 dan kejadian utama lintas wilayah (migrasi 0117). Akses D1 baru tinggal di sini (gerbang-d1). */
export const tabelNarasiAda = async env => !!(await env.DB.prepare("SELECT 1 x FROM sqlite_master WHERE type = 'table' AND name = 'logbook_narasi'").first());
export const stmtNarasiLogbook = (env, kolom, kejadian, narasi, indukId, kini) => env.DB.prepare(`INSERT INTO logbook_narasi (kejadian_id, ${kolom}, induk_id, diubah) VALUES (?, ${kolom.map(() => "?")}, ?, ?)
  ON CONFLICT (kejadian_id) DO UPDATE SET ${kolom.map(c => `${c} = COALESCE(excluded.${c}, ${c})`)}, induk_id = COALESCE(excluded.induk_id, induk_id), diubah = excluded.diubah`).bind(kejadian, ...kolom.map(c => narasi?.[c] ?? null), indukId ?? null, kini);
export const indukLogbook = (env, kib) => env.DB.prepare("SELECT b.kejadian_id id, k.jenis, k.prov, n.induk_id FROM logbook_kib b JOIN logbook_kejadian k ON k.id = b.kejadian_id LEFT JOIN logbook_narasi n ON n.kejadian_id = k.id WHERE b.kib = ?").bind(kib).first();
export const punyaAnakLogbook = (env, id) => env.DB.prepare("SELECT 1 x FROM logbook_narasi WHERE induk_id = ?").bind(id).first();

/* ---- meja Data kejadian dan dampak (migrasi 0119): pasangkan ke Logbook, simpan tautan, kelengkapan per kabupaten, impor ---- */
/* kejadian Logbook dengan jenis, prov, kab, dan tanggal mulai (WIB) sama; mulai dibatasi dua hari di sekitar tanggal dulu supaya date() tidak memindai semuanya. Tanpa logbook_kib (0094 belum jalan): tanpa kolom kib. */
export async function cariKejadianLogbook(env, jenis, prov, kab, tgl) {
  const hari = n => new Date(Date.parse(tgl + "T00:00:00Z") + n * 864e5).toISOString().slice(0, 10);
  const sql = kib => `SELECT k.id, ${kib ? "b.kib" : "NULL AS kib"}, k.mulai, k.status FROM logbook_kejadian k ${kib ? "LEFT JOIN logbook_kib b ON b.kejadian_id = k.id" : ""}
    WHERE k.jenis = ? AND k.prov = ? AND k.kab = ? AND k.mulai >= ? AND k.mulai < ? AND date(k.mulai, '+7 hours') = ? ORDER BY k.mulai LIMIT 6`;
  const a = [jenis, prov, kab, hari(-1), hari(2), tgl];
  try { return (await env.DB.prepare(sql(true)).bind(...a).all()).results; }
  catch (e) { if (!/no such table: logbook_kib/i.test(String(e?.message || e))) throw e; return (await env.DB.prepare(sql(false)).bind(...a).all()).results; }
}
export const kejadianLogbookById = (env, id) => env.DB.prepare("SELECT id, jenis, prov, kab, mulai, status FROM logbook_kejadian WHERE id = ?").bind(id).first();
export const kibLogbook = async (env, id) => { try { return (await env.DB.prepare("SELECT kib FROM logbook_kib WHERE kejadian_id = ?").bind(id).first())?.kib ?? null; } catch (e) { return null; } };
/* tautan ke Logbook disimpan di catatan (kunci sistem logbook_id/logbook_kib di kolom data), penerimaan berikutnya jadi pengkinian */
export const simpanTautanLogbook = (env, id, logbookId, kib) => env.DB.prepare("UPDATE meja_catatan SET data = json_set(data, '$.logbook_id', ?, '$.logbook_kib', ?) WHERE id = ? AND meja = 'dampak'").bind(logbookId, kib, id).run();
/* batal terima: Logbook gagal ditulis sesudah catatan diklaim; kembali ke diverifikasi (pasangan sistem di trigger meja_catatan_ubah) dan jejaknya tercatat */
export const batalTerima = (env, id, kini, oleh, alasan) => env.DB.batch([
  env.DB.prepare("UPDATE meja_catatan SET status = 'diverifikasi', diubah = max(diubah, ?) WHERE id = ? AND status = 'masuk_logbook' AND meja = 'dampak'").bind(kini, id),
  env.DB.prepare("INSERT INTO meja_jejak (catatan_id, dari, ke, waktu, oleh, catatan, diterima) SELECT ?, 'masuk_logbook', 'diverifikasi', ?, ?, ?, ? WHERE changes() > 0").bind(id, kini, oleh, ("terima ke Logbook dibatalkan: " + alasan).slice(0, 200), kini)]);
/* kelengkapan per kabupaten (agregat; dibangun ulang bersama meja_ringkas dari baris yang sudah dibaca, tanpa pemindaian tambahan) */
export const stmtHapusKelengkapanGrup = (env, prov, kab, dummy) => env.DB.prepare("DELETE FROM meja_kelengkapan WHERE prov = ? AND kab = ? AND dummy = ?").bind(prov, kab, dummy);
export const stmtHapusKelengkapan = (env, dummyJuga = true) => env.DB.prepare(dummyJuga ? "DELETE FROM meja_kelengkapan" : "DELETE FROM meja_kelengkapan WHERE dummy = 1");
export const stmtSisipKelengkapan = (env, baris) => env.DB.prepare("INSERT INTO meja_kelengkapan (prov, kab, dummy, n, persen_jumlah, inti_lengkap, belum, kosong, terbaru) SELECT json_extract(value, '$[0]'), json_extract(value, '$[1]'), json_extract(value, '$[2]'), json_extract(value, '$[3]'), json_extract(value, '$[4]'), json_extract(value, '$[5]'), json_extract(value, '$[6]'), json_extract(value, '$[7]'), json_extract(value, '$[8]') FROM json_each(?)").bind(JSON.stringify(baris));
export const bacaKelengkapan = async (env, dummyJuga) => (await env.DB.prepare(`SELECT prov, kab, dummy, n, persen_jumlah, inti_lengkap, belum, kosong, terbaru FROM meja_kelengkapan${dummyJuga ? "" : " WHERE dummy = 0"} ORDER BY prov, kab`).all()).results;
/* satu catatan impor = dua pernyataan; INSERT OR IGNORE + jejak bersyarat changes() supaya baris ganda (balapan) tidak menggagalkan batch dan tidak menulis jejak palsu */
export const stmtImporDampak = (env, b) => [
  env.DB.prepare("INSERT OR IGNORE INTO meja_catatan (id, meja, prov, kab, kec, desa, data, status, dibuat, diubah, oleh, petugas_id) VALUES (?, 'dampak', ?, ?, ?, ?, ?, 'dilaporkan', ?, ?, ?, ?)").bind(b.id, b.prov, b.kab, b.kec, b.desa, b.data, b.kini, b.kini, b.oleh, b.petugas),
  env.DB.prepare("INSERT INTO meja_jejak (catatan_id, dari, ke, waktu, oleh, catatan, diterima) SELECT ?, NULL, 'dilaporkan', ?, ?, 'impor', ? WHERE changes() > 0").bind(b.id, b.kini, b.oleh, b.kini)];
export const batchTulis = (env, stmts) => env.DB.batch(stmts);

/* skema meja_catatan di D1 sudah memuat meja ini? (migrasi 0118/0119 belum tentu sudah diterapkan di produksi); sqlite_master berisi teks CHECK-nya */
let SKEMA_MEJA = "";
export const skemaMejaAda = async (env, meja) => {
  if (!SKEMA_MEJA.includes(`'${meja}'`)) SKEMA_MEJA = (await env.DB.prepare("SELECT sql FROM sqlite_master WHERE name = 'meja_catatan'").first())?.sql ?? "";   // hanya yang sudah ada yang dicache; yang belum dicek ulang
  return SKEMA_MEJA.includes(`'${meja}'`);
};

/* ======================================================================================================================================================
   Bagian Siklus Bencana (migrasi 0120_sk_kejadian, DESAIN-TEKNIS 2.3): SEMUA SQL sk_* tinggal di sini; src/siklus*.js tidak menyentuh env.DB.
   Pelaku: sistem (Bearer ingest), sk_staf (sesi staf atau moderator; pembeda PD/KO/PM di gerbang peran rute), sk_instansi (BP, hanya baca), admin (Super Admin).
   `hapus` hanya admin dan hanya baris dummy = 1 (fungsi hapus dummy menyusul tiket dummy). Tulis selalu lewat skBatch: batch tanpa baris sk_jejak ditolak (INV-4).
   ponytail: pembacaan-lalu-tulis tanpa penguncian; transisi fase yang kalah balapan ditolak trigger sk_kejadian_fase dan membatalkan seluruh batch (atomik). */
export const MATRIKS_SK = {
  sk_kejadian:        {sistem: ["baca", "tambah"], sk_staf: ["baca", "tambah", "ubah"], sk_instansi: ["baca"], admin: ["baca", "tambah", "ubah", "hapus"]},
  sk_kejadian_kab:    {sistem: ["baca", "tambah"], sk_staf: ["baca", "tambah"], sk_instansi: ["baca"], admin: ["baca", "tambah", "hapus"]},
  sk_kejadian_alias:  {sistem: ["baca"], sk_staf: ["baca", "tambah"], sk_instansi: ["baca"], admin: ["baca", "tambah", "hapus"]},
  sk_kejadian_sumber: {sistem: ["baca", "tambah"], sk_staf: ["baca", "tambah", "ubah"], sk_instansi: ["baca"], admin: ["baca", "tambah", "ubah", "hapus"], lp_staf: ["baca"]},   // lp_staf: hanya lpUsulanSumber (LK-09, LK-11)
  sk_kaji:            {sistem: ["baca", "tambah"], sk_staf: ["baca", "ubah"], sk_instansi: ["baca"], admin: ["baca", "tambah", "ubah", "hapus"]},
  sk_harga:           {sk_staf: ["baca", "tambah"], admin: ["baca", "tambah", "hapus"]},
  sk_jitupasna:       {sk_staf: ["baca", "tambah", "ubah"], sk_instansi: ["baca"], admin: ["baca", "tambah", "ubah", "hapus"]},
  sk_jitupasna_baris: {sk_staf: ["baca", "tambah", "ubah"], sk_instansi: ["baca", "tambah"], admin: ["baca", "tambah", "ubah", "hapus"]},
  sk_r3p:             {sk_staf: ["baca", "tambah", "ubah"], sk_instansi: ["baca"], admin: ["baca", "tambah", "ubah", "hapus"]},
  sk_r3p_kegiatan:    {sk_staf: ["baca", "tambah", "ubah"], sk_instansi: ["baca"], admin: ["baca", "tambah", "ubah", "hapus"]},
  sk_renkon:          {sk_staf: ["baca", "tambah", "ubah"], sk_instansi: ["baca"], admin: ["baca", "tambah", "ubah", "hapus"]},
  sk_gladi:           {sk_staf: ["baca", "tambah", "ubah"], sk_instansi: ["baca"], admin: ["baca", "tambah", "ubah", "hapus"]},
  sk_jejak:           {sistem: ["baca", "tambah"], sk_staf: ["baca", "tambah"], sk_instansi: ["baca", "tambah"], admin: ["baca", "tambah", "hapus"]},
};
Object.assign(MATRIKS, MATRIKS_SK);
export const pelakuSkStaf = {peran: "sk_staf"}, pelakuSkInstansi = {peran: "sk_instansi"};

const KOL_KEJ = "id, jenis, nama, prov, kab4, mulai, akhir, pusat_lat, pusat_lon, fase, fase_diubah, ke, tanggap_mulai, tanggap_akhir, nomor_induk, asal, arsip_tahun, publik, ringkasan_publik, yakin, dibuat, diubah, oleh, dummy";
const KOL_SUM = "id, sumber, kode, kode_hari, pengenal_luar, kejadian_id, asal_id, status, jenis, kab4, mulai, kandidat, dampak, diambil, dibuat, diubah, dummy";
const JEJAK_SK = new WeakSet();   // pernyataan yang dibuat skStmtJejak; skBatch menolak batch tanpa satu pun

/* ---------- baca ---------- */
/* daftar kejadian hidup (tanpa digabung), selalu berentang mulai (indeks sk_kej_mulai / sk_kej_kab). f: {dari, sampai, kab4?, prov?, jenis?, fase?, sesudah?: {mulai, id}, batas, dummyOk, lingkup?: JSON larik kab4 untuk BP}.
   BP berangkat dari sk_kejadian_kab (indeks sk_kejkab_kab) supaya kejadian multi-kabupaten ikut bila salah satu kab4-nya di lingkup. */
export async function skKejadianDaftar(env, p, f) {
  const m = f.lingkup ? "k.mulai" : "e.mulai";   // BP: rentang lewat indeks sk_kejkab_kab (kab4, mulai DESC, kejadian_id)
  const w = ["e.fase != 'digabung'", `${m} >= ?`, `${m} <= ?`], a = [f.dari, f.sampai];
  if (!f.dummyOk) w.push("e.dummy = 0");
  for (const [k, v] of [["e.kab4", f.kab4], ["e.prov", f.prov], ["e.jenis", f.jenis], ["e.fase", f.fase]]) if (v) { w.push(`${k} = ?`); a.push(v); }
  if (f.sesudah) { w.push(`(${m} < ? OR (${m} = ? AND e.id < ?))`); a.push(f.sesudah.mulai, f.sesudah.mulai, f.sesudah.id); }
  const kolom = KOL_KEJ.split(", ").map(k => "e." + k).join(", ");
  const dari = f.lingkup ? "sk_kejadian_kab k JOIN sk_kejadian e ON e.id = k.kejadian_id" : "sk_kejadian e";
  if (f.lingkup) { w.unshift("k.kab4 IN (SELECT value FROM json_each(?))"); a.unshift(f.lingkup); }
  return (await sedia(env, p, "sk_kejadian", "baca", `SELECT ${f.lingkup ? "DISTINCT " : ""}${kolom} FROM ${dari} WHERE ${w.join(" AND ")} ORDER BY e.mulai DESC, e.id DESC LIMIT ?`).bind(...a, f.batas + 1).all()).results;
}
export const skKejadianById = (env, p, id) => sedia(env, p, "sk_kejadian", "baca", `SELECT ${KOL_KEJ} FROM sk_kejadian WHERE id = ?`).bind(id).first();
export const skKejadianKab = async (env, p, id) => (await sedia(env, p, "sk_kejadian_kab", "baca", "SELECT kab4 FROM sk_kejadian_kab WHERE kejadian_id = ? ORDER BY kab4 LIMIT 100").bind(id).all()).results.map(r => r.kab4);
export const skSumberDariKejadian = async (env, p, id) => (await sedia(env, p, "sk_kejadian_sumber", "baca", `SELECT ${KOL_SUM} FROM sk_kejadian_sumber WHERE kejadian_id = ? ORDER BY sumber, kode LIMIT 100`).bind(id).all()).results;
export const skSumberById = (env, p, sid) => sedia(env, p, "sk_kejadian_sumber", "baca", `SELECT ${KOL_SUM} FROM sk_kejadian_sumber WHERE id = ?`).bind(sid).first();
export const skJejakObyek = async (env, p, obyek, obyekId, batas = 50, dummyOk = false) => (await sedia(env, p, "sk_jejak", "baca", `SELECT id, waktu, oleh, obyek, obyek_id, aksi, dari, ke, catatan FROM sk_jejak WHERE obyek = ? AND obyek_id = ?${dummyOk ? "" : " AND dummy = 0"} ORDER BY waktu DESC, id DESC LIMIT ?`).bind(obyek, obyekId, batas).all()).results;
/* kolom minimal untuk alias, validasi, dan transisi */
/* dampak per sumber untuk banyak kejadian sekaligus (indeks sk_ks_kej): daftar kejadian memuat korban ringkas tanpa pindai */
export const skDampakBanyak = async (env, p, ids) => ids.length ? (await sedia(env, p, "sk_kejadian_sumber", "baca", "SELECT kejadian_id, sumber, kode, dampak FROM sk_kejadian_sumber WHERE kejadian_id IN (SELECT value FROM json_each(?)) AND status = 'terpasang' AND dampak IS NOT NULL ORDER BY sumber, kode LIMIT 1000").bind(JSON.stringify(ids)).all()).results : [];
export const skKejadianRingkas = (env, p, id) => sedia(env, p, "sk_kejadian", "baca", "SELECT id, fase, ke, mulai, kab4, jenis, dummy, publik FROM sk_kejadian WHERE id = ?").bind(id).first();
export const skKejadianRingkasBanyak = async (env, p, ids) => (await sedia(env, p, "sk_kejadian", "baca", "SELECT id, fase, mulai, kab4, jenis, dummy FROM sk_kejadian WHERE id IN (SELECT value FROM json_each(?))").bind(JSON.stringify(ids)).all()).results;
export const skIdTerpakai = async (env, p, ids) => (await sedia(env, p, "sk_kejadian", "baca", "SELECT id FROM sk_kejadian WHERE id IN (SELECT value FROM json_each(?))").bind(JSON.stringify(ids)).all()).results.map(r => r.id);
/* ringkasan publik: hanya publik = 1 dan dummy = 0; kolom terbatas (tanpa oleh, nomor_induk) */
export const skKejadianPublik = (env, p, id) => sedia(env, p, "sk_kejadian", "baca", "SELECT id, jenis, prov, kab4, mulai, fase, ringkasan_publik, yakin, diubah FROM sk_kejadian WHERE id = ? AND publik = 1 AND dummy = 0 AND fase NOT IN ('terdeteksi', 'dibatalkan', 'digabung')").bind(id).first();
/* kandidat serupa untuk POST kejadian (kab4 sama, mulai dalam jendela hari); fase hidup saja */
export async function skKejadianSerupa(env, p, kab4, dari, sampai, dummyOk) {
  return (await sedia(env, p, "sk_kejadian", "baca", `SELECT id, jenis, nama, mulai, fase FROM sk_kejadian WHERE kab4 = ? AND mulai >= ? AND mulai <= ? AND fase NOT IN ('dibatalkan', 'digabung')${dummyOk ? "" : " AND dummy = 0"} ORDER BY mulai LIMIT 20`).bind(kab4, dari, sampai).all()).results;
}
/* antrean pemasangan (indeks parsial sk_ks_antre): status ambigu / tanpa_wilayah, urut mulai naik; sesudah = {mulai, id} */
export async function skAntreanDaftar(env, p, f) {
  const w = ["status IN ('ambigu', 'tanpa_wilayah')"], a = [];
  if (f.status) { w.push("status = ?"); a.push(f.status); }
  if (!f.dummyOk) w.push("dummy = 0");
  if (f.sesudah) { w.push("(mulai > ? OR (mulai = ? AND id > ?))"); a.push(f.sesudah.mulai, f.sesudah.mulai, f.sesudah.id); }
  return (await sedia(env, p, "sk_kejadian_sumber", "baca", `SELECT ${KOL_SUM} FROM sk_kejadian_sumber WHERE ${w.join(" AND ")} ORDER BY mulai, id LIMIT ?`).bind(...a, f.batas + 1).all()).results;
}
/* ingest: kejadian ringkas per jendela tanggal mulai (sk_kej_mulai) dan sumber per jendela (sk_ks_mulai), kolom minimal, keyset (mulai, id) naik */
export async function skIngestJendela(env, p, f) {
  const w = ["mulai >= ?", "mulai <= ?", "dummy = 0"], a = [f.dari, f.sampai];
  if (f.sesudah) { w.push("(mulai > ? OR (mulai = ? AND id > ?))"); a.push(f.sesudah.mulai, f.sesudah.mulai, f.sesudah.id); }
  return (await sedia(env, p, "sk_kejadian", "baca", `SELECT id, jenis, kab4, mulai, fase FROM sk_kejadian WHERE ${w.join(" AND ")} ORDER BY mulai, id LIMIT ?`).bind(...a, f.batas + 1).all()).results;
}
export async function skIngestSumber(env, p, f) {
  const w = ["mulai >= ?", "mulai <= ?", "dummy = 0"], a = [f.dari, f.sampai];
  if (f.sesudah) { w.push("(mulai > ? OR (mulai = ? AND id > ?))"); a.push(f.sesudah.mulai, f.sesudah.mulai, f.sesudah.id); }
  return (await sedia(env, p, "sk_kejadian_sumber", "baca", `SELECT id, sumber, kode, kejadian_id, status, jenis, kab4, mulai FROM sk_kejadian_sumber WHERE ${w.join(" AND ")} ORDER BY mulai, id LIMIT ?`).bind(...a, f.batas + 1).all()).results;
}
/* pasangan (sumber, kode) yang sudah ada (dummy = 0), lewat indeks unik; pairs: [[sumber, kode], ...] */
export async function skSumberAda(env, p, pairs) {
  return (await sedia(env, p, "sk_kejadian_sumber", "baca", `SELECT s.sumber, s.kode FROM json_each(?) j JOIN sk_kejadian_sumber s ON s.sumber = json_extract(j.value, '$[0]') AND s.kode = json_extract(j.value, '$[1]') AND s.dummy = 0`).bind(JSON.stringify(pairs)).all()).results;
}

/* ---------- pernyataan tulis (belum dijalankan; dirangkai ke skBatch) ---------- */
/* belumAda = [sumber, kode] (ingest, item 7): kejadian hanya dibuat bila baris sumber itu belum ada, sehingga kalah balapan tidak meninggalkan kejadian yatim */
export const skStmtKejadianBaru = (env, p, k) => sedia(env, p, "sk_kejadian", "tambah", `INSERT INTO sk_kejadian (id, jenis, nama, prov, kab4, mulai, akhir, pusat_lat, pusat_lon, fase, fase_diubah, asal, arsip_tahun, yakin, dibuat, diubah, oleh, dummy)
  SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ? WHERE ${k.belumAda ? "NOT EXISTS (SELECT 1 FROM sk_kejadian_sumber WHERE sumber = ? AND kode = ? AND dummy = 0)" : "1"}`).bind(k.id, k.jenis, k.nama, k.prov ?? null, k.kab4 ?? null, k.mulai, k.akhir ?? null, k.pusat_lat ?? null, k.pusat_lon ?? null, k.fase ?? "terdeteksi", k.kini, k.asal,
    k.arsip_tahun ?? null, k.yakin ?? "terverifikasi", k.kini, k.kini, k.oleh, k.dummy ? 1 : 0, ...(k.belumAda ?? []));
/* mulai kolom kab disalin dari kejadiannya (indeks sk_kejkab_kab: kab4, mulai DESC). belumAda = [sumber, kode]: lewati bila baris sumber itu sudah ada (kalah balapan ingest, item 7) */
export const skStmtKab = (env, p, id, kab4, kini, dummy = 0, belumAda = null) => sedia(env, p, "sk_kejadian_kab", "tambah", `INSERT INTO sk_kejadian_kab (kejadian_id, kab4, mulai, dibuat, dummy) SELECT e.id, ?, e.mulai, ?, ? FROM sk_kejadian e WHERE e.id = ?${belumAda ? " AND NOT EXISTS (SELECT 1 FROM sk_kejadian_sumber WHERE sumber = ? AND kode = ? AND dummy = 0)" : ""} ON CONFLICT (kejadian_id, kab4) DO NOTHING`).bind(kab4, kini, dummy ? 1 : 0, id, ...(belumAda ?? []));
/* salin semua kab4 dari kejadian `dari` ke `ke` (gabung) */
export const skStmtKabSalin = (env, p, dari, ke, kini) => sedia(env, p, "sk_kejadian_kab", "tambah", "INSERT INTO sk_kejadian_kab (kejadian_id, kab4, mulai, dibuat, dummy) SELECT ?, k.kab4, e.mulai, ?, k.dummy FROM sk_kejadian_kab k JOIN sk_kejadian e ON e.id = ? WHERE k.kejadian_id = ? ON CONFLICT (kejadian_id, kab4) DO NOTHING").bind(ke, kini, ke, dari);
export const skStmtAlias = (env, p, alias, ke, alasan, kini, oleh, dummy = 0) => sedia(env, p, "sk_kejadian_alias", "tambah", "INSERT INTO sk_kejadian_alias (alias_id, ke_id, alasan, dibuat, oleh, dummy) VALUES (?, ?, ?, ?, ?, ?)").bind(alias, ke, alasan, kini, oleh, dummy ? 1 : 0);
/* ubah fase; publik turun ke 0 dalam pernyataan yang sama bila fase baru melarangnya (ALUR 2.1) */
export const skStmtFase = (env, p, id, ke, kini, tm = null, ta = null, kejadianKe = null) => sedia(env, p, "sk_kejadian", "ubah", `UPDATE sk_kejadian SET fase = ?, fase_diubah = ?, diubah = ?, ke = ?, publik = CASE WHEN ? IN ('terdeteksi', 'dibatalkan', 'digabung') THEN 0 ELSE publik END,
  tanggap_mulai = COALESCE(?, tanggap_mulai), tanggap_akhir = COALESCE(?, tanggap_akhir) WHERE id = ?`).bind(ke, kini, kini, kejadianKe, ke, tm, ta, id);
export const skStmtPublik = (env, p, id, publik, ringkasan, kini) => sedia(env, p, "sk_kejadian", "ubah", "UPDATE sk_kejadian SET publik = ?, ringkasan_publik = COALESCE(?, ringkasan_publik), diubah = ? WHERE id = ?").bind(publik ? 1 : 0, ringkasan ?? null, kini, id);
/* pindahkan SEMUA baris sumber satu kejadian ke kejadian lain (gabung); asal_id = kejadian sebelumnya */
export const skStmtSumberPindahSemua = (env, p, dari, ke, kini) => sedia(env, p, "sk_kejadian_sumber", "ubah", "UPDATE sk_kejadian_sumber SET asal_id = kejadian_id, kejadian_id = ?, diubah = ? WHERE kejadian_id = ?").bind(ke, kini, dari);
/* pindahkan satu baris (koreksi manual); hanya bila masih terpasang ke `dari` */
export const skStmtSumberPindah = (env, p, sid, dari, ke, kini) => sedia(env, p, "sk_kejadian_sumber", "ubah", "UPDATE sk_kejadian_sumber SET asal_id = kejadian_id, kejadian_id = ?, diubah = ? WHERE id = ? AND kejadian_id = ? AND status = 'terpasang'").bind(ke, kini, sid, dari);
/* keputusan antrean: pasang ke kejadian (terpasang), atau ditolak (kejadian NULL); kab4 baru ikut diset bila diberikan */
export const skStmtAntrean = (env, p, sid, status, kejadianId, kab4, kini) => sedia(env, p, "sk_kejadian_sumber", "ubah", "UPDATE sk_kejadian_sumber SET status = ?, kejadian_id = ?, kab4 = COALESCE(?, kab4), kandidat = NULL, diubah = ? WHERE id = ? AND status IN ('ambigu', 'tanpa_wilayah')").bind(status, kejadianId, kab4 ?? null, kini, sid);
/* baris sumber baru dari ingest; kunci unik (sumber, kode, dummy) DO NOTHING: kiriman ulang tidak menimpa */
export const skStmtSumberBaru = (env, p, s) => sedia(env, p, "sk_kejadian_sumber", "tambah", `INSERT INTO sk_kejadian_sumber (id, sumber, kode, kode_hari, pengenal_luar, kejadian_id, status, jenis, kab4, mulai, kandidat, dampak, diambil, dibuat, diubah, dummy)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT (sumber, kode, dummy) DO NOTHING`).bind(s.id, s.sumber, s.kode, s.kode_hari ?? null, s.pengenal_luar ?? null, s.kejadian_id ?? null, s.status, s.jenis, s.kab4 ?? null, s.mulai,
    s.kandidat ?? null, s.dampak ?? null, s.diambil, s.kini, s.kini, s.dummy ? 1 : 0);
/* ---------- Kaji Cepat Otomatis (G2, migrasi 0122_sk_kaji): baca ---------- */
const KOL_KAJI = "id, kejadian_id, model, versi, status, masukan, ringkas, hasil_r2, galat_kalibrasi, yakin, alasan_tarik, dihitung, diubah, oleh, dummy";
export const skKajiDaftar = async (env, p, kejadianId, dummyOk, batas = 50) => (await sedia(env, p, "sk_kaji", "baca", `SELECT ${KOL_KAJI} FROM sk_kaji WHERE kejadian_id = ?${dummyOk ? "" : " AND dummy = 0"} ORDER BY versi DESC, model LIMIT ?`).bind(kejadianId, batas).all()).results;
export const skKajiById = (env, p, id) => sedia(env, p, "sk_kaji", "baca", `SELECT ${KOL_KAJI} FROM sk_kaji WHERE id = ?`).bind(id).first();
export const skKajiIds = async (env, p, kejadianId, dummyOk) => (await sedia(env, p, "sk_kaji", "baca", `SELECT id FROM sk_kaji WHERE kejadian_id = ?${dummyOk ? "" : " AND dummy = 0"} ORDER BY versi DESC, model LIMIT 50`).bind(kejadianId).all()).results.map(r => r.id);
/* isian petugas meja kaji_cepat untuk wilayah kejadian (indeks meja_catatan_wilayah: meja, prov, kab): HANYA kolom angka dan jenis, tanpa teks bebas, foto, atau petugas. Jendela waktu dibuat: [dari, sampai] ms. */
export const skMejaKajiCepat = async (env, prov, kab, dari, sampai, dummy) => (await env.DB.prepare(`SELECT id, kec, desa, status, dibuat, json_extract(data, '$.kejadian') kejadian, json_extract(data, '$.tanggal') tanggal,
  json_extract(data, '$.meninggal') meninggal, json_extract(data, '$.hilang') hilang, json_extract(data, '$.luka') luka, json_extract(data, '$.mengungsi') mengungsi,
  json_extract(data, '$.rumah_rb') rumah_rb, json_extract(data, '$.rumah_rs') rumah_rs, json_extract(data, '$.rumah_rr') rumah_rr
  FROM meja_catatan WHERE meja = 'kaji_cepat' AND status IN ('diverifikasi', 'masuk_jitupasna') AND prov = ? AND kab = ? AND dummy = ? AND dibuat >= ? AND dibuat <= ? ORDER BY dibuat DESC LIMIT 20`).bind(prov, kab, dummy ? 1 : 0, dari, sampai).all()).results;
/* versi baru = max(versi)+1 untuk (kejadian, model, dummy), dihitung dalam pernyataan yang sama; dua penulis berbarengan: UNIQUE menolak yang kalah (409). Tidak pernah menimpa. */
export const skStmtKajiBaru = (env, p, k) => sedia(env, p, "sk_kaji", "tambah", `INSERT INTO sk_kaji (id, kejadian_id, model, versi, status, masukan, ringkas, hasil_r2, galat_kalibrasi, alasan_tarik, dihitung, diubah, oleh, dummy)
  SELECT ?, ?, ?, coalesce(max(versi), 0) + 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ? FROM sk_kaji WHERE kejadian_id = ? AND model = ? AND dummy = ?`).bind(k.id, k.kejadian_id, k.model, k.status, k.masukan, k.ringkas, k.hasil_r2 ?? null, k.galat_kalibrasi ?? null, k.alasan_tarik ?? null, k.kini, k.kini, k.oleh, k.dummy ? 1 : 0, k.kejadian_id, k.model, k.dummy ? 1 : 0);
/* ubah status hanya dari `dari` (pembanding atomik: kalah balapan = 0 baris berubah); jejak ikut hanya bila berubah */
export const skStmtKajiStatus = (env, p, id, dari, ke, alasan, kini) => sedia(env, p, "sk_kaji", "ubah", "UPDATE sk_kaji SET status = ?, alasan_tarik = ?, diubah = ? WHERE id = ? AND status = ?").bind(ke, ke === "ditarik" ? alasan : null, kini, id, dari);
export const skStmtJejakJikaBerubah = (env, p, oleh, obyek, obyekId, aksi, dari, ke, catatan, kini, dummy = 0) => {
  const s = sedia(env, p, "sk_jejak", "tambah", "INSERT INTO sk_jejak (waktu, oleh, obyek, obyek_id, aksi, dari, ke, catatan, dummy) SELECT ?, ?, ?, ?, ?, ?, ?, ?, ? WHERE changes() > 0").bind(kini, oleh, obyek, obyekId, aksi, dari ?? null, ke ?? null, catatan ?? null, dummy ? 1 : 0);
  JEJAK_SK.add(s);
  return s;
};
/* ---------- Jitupasna ke R3P (G3, migrasi 0123_sk_pulih): baca ---------- */
const KOL_JP = "id, kejadian_id, kaji_id, prov, kab4, status, tim_sk, versi, induk_id, tahun_harga, hitung, dibuat, diubah, oleh, dummy";
/* harga dummy tidak pernah dipakai Jitupasna nyata (dan sebaliknya): saringan dummy = ? di skHargaCari */
const KOL_R3P = "id, jitupasna_id, kejadian_id, status, versi, induk_id, tanggap_mulai, disetujui_oleh, disetujui_pada, no_keputusan, tgl_keputusan, penandatangan, total_rp, dibuat, diubah, oleh, dummy";
const KOL_BARIS = "id, jitupasna_id, jenis, sektor, tingkat, unit, komponen, arus_rp, bulan, unit_asal, harga_id, nilai_rp, asumsi, klien_id, dibuat, oleh, dummy";
export const skJitupasnaDaftar = async (env, p, kejadianId, dummyOk) => (await sedia(env, p, "sk_jitupasna", "baca", `SELECT ${KOL_JP} FROM sk_jitupasna WHERE kejadian_id = ?${dummyOk ? "" : " AND dummy = 0"} ORDER BY kab4, versi DESC LIMIT 100`).bind(kejadianId).all()).results;
export const skJitupasnaIds = async (env, p, kejadianId, dummyOk) => (await sedia(env, p, "sk_jitupasna", "baca", `SELECT id FROM sk_jitupasna WHERE kejadian_id = ?${dummyOk ? "" : " AND dummy = 0"} ORDER BY kab4, versi DESC LIMIT 100`).bind(kejadianId).all()).results.map(r => r.id);
export const skJitupasnaById = (env, p, id) => sedia(env, p, "sk_jitupasna", "baca", `SELECT ${KOL_JP} FROM sk_jitupasna WHERE id = ?`).bind(id).first();
/* Jitupasna terbaru untuk (kejadian, kab4, dummy): dasar versi baru dan penolakan bila yang lama belum final */
export const skJitupasnaTerbaru = (env, p, kejadianId, kab4, dummy) => sedia(env, p, "sk_jitupasna", "baca", "SELECT id, status, versi FROM sk_jitupasna WHERE kejadian_id = ? AND kab4 = ? AND dummy = ? ORDER BY versi DESC LIMIT 1").bind(kejadianId, kab4, dummy ? 1 : 0).first();
export const skBarisDaftar = async (env, p, jpId) => (await sedia(env, p, "sk_jitupasna_baris", "baca", `SELECT ${KOL_BARIS} FROM sk_jitupasna_baris WHERE jitupasna_id = ? ORDER BY sektor, jenis, dibuat LIMIT 501`).bind(jpId).all()).results;
export const skBarisHitung = async (env, p, jpId) => (await sedia(env, p, "sk_jitupasna_baris", "baca", "SELECT count(*) n FROM sk_jitupasna_baris WHERE jitupasna_id = ?").bind(jpId).first()).n;
/* harga untuk tahun dan sektor tertentu: acuan kabupaten lebih dulu, lalu nasional (kab4 NULL); yang terbaru dulu */
export const skHargaCari = async (env, p, sektor, tahun, kab4, dummy = 0) => (await sedia(env, p, "sk_harga", "baca", "SELECT id, sektor, tingkat, satuan, harga_rp, tahun, kab4, dokumen, yakin, dibuat FROM sk_harga WHERE sektor IN (SELECT value FROM json_each(?)) AND tahun = ? AND (kab4 IS NULL OR kab4 = ?) AND dummy = ? ORDER BY (kab4 IS NULL), dibuat DESC LIMIT 500").bind(JSON.stringify(sektor), tahun, kab4, dummy ? 1 : 0).all()).results;
export const skHargaDaftar = async (env, p, sektor, tahun, dummyOk = false) => (await sedia(env, p, "sk_harga", "baca", `SELECT id, sektor, tingkat, satuan, harga_rp, tahun, kab4, dokumen, yakin, dibuat FROM sk_harga WHERE sektor = ?${tahun ? " AND tahun = ?" : ""}${dummyOk ? "" : " AND dummy = 0"} ORDER BY tingkat, tahun DESC, dibuat DESC LIMIT 200`).bind(...(tahun ? [sektor, tahun] : [sektor])).all()).results;
export const skR3pById = (env, p, id) => sedia(env, p, "sk_r3p", "baca", `SELECT ${KOL_R3P} FROM sk_r3p WHERE id = ?`).bind(id).first();
export const skR3pDariJitupasna = async (env, p, jpId) => (await sedia(env, p, "sk_r3p", "baca", `SELECT ${KOL_R3P} FROM sk_r3p WHERE jitupasna_id = ? ORDER BY versi DESC LIMIT 20`).bind(jpId).all()).results;
export const skKegiatanDaftar = async (env, p, r3pId) => (await sedia(env, p, "sk_r3p_kegiatan", "baca", "SELECT id, r3p_id, sektor, nama, target, satuan, nilai_rp, tautan_jenis, tautan_id, status, dibuat, diubah, oleh, dummy FROM sk_r3p_kegiatan WHERE r3p_id = ? ORDER BY sektor, dibuat LIMIT 200").bind(r3pId).all()).results;
/* syarat fase transisi -> pemulihan (ALUR 2.1): ada R3P diusulkan atau lebih untuk kejadian ini. Tabel belum ada (0123 belum diterapkan) = null: syarat belum berlaku. */
export const skR3pDiusulkanAda = async (env, p, kejadianId) => {
  try { return !!(await sedia(env, p, "sk_r3p", "baca", "SELECT 1 x FROM sk_r3p WHERE kejadian_id = ? AND status != 'draf' LIMIT 1").bind(kejadianId).first()); }
  catch (e) { if (/no such table: sk_r3p/i.test(String(e?.message || e))) return null; throw e; }
};
/* baca dari modul lain, tanpa koordinat, foto, nama pelapor (KP 4, KA 12-13): hitungan per tingkat dari rumah_rusak yang sah; kemajuan dari pemulihan */
export const skRekapRumahRusak = async (env, f) => (await env.DB.prepare(`SELECT kec, sum(tingkat = 'berat') berat, sum(tingkat = 'sedang') sedang, sum(tingkat = 'ringan') ringan, count(*) total
  FROM rumah_rusak WHERE status = 'sah' AND prov = ? AND kab = ? AND tanggal BETWEEN ? AND ?${f.bencana ? " AND bencana = ?" : ""} GROUP BY kec ORDER BY kec LIMIT 300`).bind(f.prov, f.kab, f.dari, f.sampai, ...(f.bencana ? [f.bencana] : [])).all()).results;
export const skKemajuanPemulihan = async (env, ids) => ids.length ? (await env.DB.prepare("SELECT id, jenis, satuan, target, realisasi, status, mulai, selesai, diubah FROM pemulihan WHERE id IN (SELECT value FROM json_each(?)) LIMIT 200").bind(JSON.stringify(ids)).all()).results : [];
/* rujukan tautan kegiatan: pemulihan (id 16 heks) atau catatan meja rehab; tabel belum ada = tidak ada */
export const skTautanAda = async (env, jenis, id) => {
  try { return !!(await env.DB.prepare(jenis === "pemulihan" ? "SELECT 1 x FROM pemulihan WHERE id = ?" : "SELECT 1 x FROM meja_catatan WHERE id = ? AND meja = 'rehab'").bind(id).first()); }
  catch (e) { if (/no such table/i.test(String(e?.message || e))) return false; throw e; }
};

/* ---------- Jitupasna ke R3P: pernyataan tulis ---------- */
export const skStmtHargaBaru = (env, p, h) => sedia(env, p, "sk_harga", "tambah", "INSERT INTO sk_harga (id, sektor, tingkat, satuan, harga_rp, tahun, kab4, dokumen, yakin, dibuat, oleh, dummy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'asumsi-kebijakan', ?, ?, ?)")
  .bind(h.id, h.sektor, h.tingkat, h.satuan, h.harga_rp, h.tahun, h.kab4 ?? null, h.dokumen, h.kini, h.oleh, h.dummy ? 1 : 0);
/* versi = max+1 untuk (kejadian, kab4, dummy), dihitung dalam pernyataan yang sama; UNIQUE menolak yang kalah balapan */
export const skStmtJitupasnaBaru = (env, p, j) => sedia(env, p, "sk_jitupasna", "tambah", `INSERT INTO sk_jitupasna (id, kejadian_id, prov, kab4, tim_sk, versi, induk_id, dibuat, diubah, oleh, dummy)
  SELECT ?, ?, ?, ?, ?, coalesce(max(versi), 0) + 1, (SELECT id FROM sk_jitupasna WHERE kejadian_id = ? AND kab4 = ? AND dummy = ? ORDER BY versi DESC LIMIT 1), ?, ?, ?, ? FROM sk_jitupasna WHERE kejadian_id = ? AND kab4 = ? AND dummy = ?`)
  .bind(j.id, j.kejadian_id, j.prov, j.kab4, j.tim_sk ?? null, j.kejadian_id, j.kab4, j.dummy ? 1 : 0, j.kini, j.kini, j.oleh, j.dummy ? 1 : 0, j.kejadian_id, j.kab4, j.dummy ? 1 : 0);
/* baris hanya masuk selama Jitupasna dibuka atau pengumpulan DAN jumlahnya masih di bawah 500 (predikat di pernyataan, batch berurutan menghitung baris sebelumnya); klien_id kembar = DO NOTHING (changes 0 = duplikat) */
export const skStmtBaris = (env, p, jpId, b, kini, oleh, dummy) => sedia(env, p, "sk_jitupasna_baris", "tambah", `INSERT INTO sk_jitupasna_baris (id, jitupasna_id, jenis, sektor, tingkat, unit, komponen, arus_rp, bulan, asumsi, klien_id, dibuat, oleh, dummy)
  SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ? WHERE (SELECT status FROM sk_jitupasna WHERE id = ?) IN ('dibuka', 'pengumpulan') AND (SELECT count(*) FROM sk_jitupasna_baris WHERE jitupasna_id = ?) < 500 ON CONFLICT (jitupasna_id, klien_id) DO NOTHING`)
  .bind(b.id, jpId, b.jenis, b.sektor, b.tingkat ?? null, b.unit ?? null, b.komponen ?? null, b.arus_rp ?? null, b.bulan ?? null, b.asumsi ?? null, b.klien_id ?? null, kini, oleh, dummy ? 1 : 0, jpId, jpId);
export const skStmtJitupasnaStatus = (env, p, id, dari, ke, kini) => sedia(env, p, "sk_jitupasna", "ubah", "UPDATE sk_jitupasna SET status = ?, diubah = ? WHERE id = ? AND status = ?").bind(ke, kini, id, dari);
/* hitung: beku harga_id dan nilai_rp per baris (satu UPDATE ... FROM json_each), lalu status dihitung dan hasil JSON; dari pengumpulan atau dihitung saja */
export const skStmtBarisNilai = (env, p, jpId, nilai) => sedia(env, p, "sk_jitupasna_baris", "ubah", `UPDATE sk_jitupasna_baris SET harga_id = json_extract(j.value, '$[1]'), nilai_rp = json_extract(j.value, '$[2]') FROM json_each(?) j
  WHERE sk_jitupasna_baris.id = json_extract(j.value, '$[0]') AND sk_jitupasna_baris.jitupasna_id = ?`).bind(JSON.stringify(nilai), jpId);
export const skStmtHitung = (env, p, id, tahun, hitung, kini) => sedia(env, p, "sk_jitupasna", "ubah", "UPDATE sk_jitupasna SET status = 'dihitung', tahun_harga = ?, hitung = ?, diubah = ? WHERE id = ? AND status IN ('pengumpulan', 'dihitung')").bind(tahun, hitung, kini, id);
export const skStmtR3pBaru = (env, p, id, jpId, kini, oleh) => sedia(env, p, "sk_r3p", "tambah", `INSERT INTO sk_r3p (id, jitupasna_id, kejadian_id, versi, induk_id, tanggap_mulai, dibuat, diubah, oleh, dummy)
  SELECT ?, j.id, j.kejadian_id, (SELECT coalesce(max(versi), 0) + 1 FROM sk_r3p WHERE jitupasna_id = j.id AND dummy = j.dummy), (SELECT id FROM sk_r3p WHERE jitupasna_id = j.id AND dummy = j.dummy ORDER BY versi DESC LIMIT 1),
  (SELECT tanggap_mulai FROM sk_kejadian WHERE id = j.kejadian_id), ?, ?, ?, j.dummy FROM sk_jitupasna j WHERE j.id = ?`).bind(id, kini, kini, oleh, jpId);
/* status maju satu langkah; menjadi diusulkan menghitung total_rp (hanya bila semua kegiatan bernilai); ditetapkan_resmi membawa nomor, tanggal, penandatangan sebagai teks */
export const skStmtR3pStatus = (env, p, id, dari, ke, v, kini) => sedia(env, p, "sk_r3p", "ubah", `UPDATE sk_r3p SET status = ?, no_keputusan = coalesce(?, no_keputusan), tgl_keputusan = coalesce(?, tgl_keputusan), penandatangan = coalesce(?, penandatangan),
  total_rp = CASE WHEN ? = 'diusulkan' THEN (SELECT CASE WHEN count(*) > 0 AND count(*) = count(nilai_rp) THEN sum(nilai_rp) END FROM sk_r3p_kegiatan WHERE r3p_id = ?) ELSE total_rp END, diubah = ? WHERE id = ? AND status = ?`)
  .bind(ke, v?.no_keputusan ?? null, v?.tgl_keputusan ?? null, v?.penandatangan ?? null, ke, id, kini, id, dari);
/* tanda setuju internal (U7): hanya dari diusulkan; trigger sk_r3p_setuju menolak pembuat draf dan pelaku bukan staf:<id> */
export const skStmtR3pSetuju = (env, p, id, oleh, kini) => sedia(env, p, "sk_r3p", "ubah", "UPDATE sk_r3p SET status = 'disetujui_pm', disetujui_oleh = ?, disetujui_pada = ?, diubah = ? WHERE id = ? AND status = 'diusulkan'").bind(oleh, kini, kini, id);
/* kegiatan baru hanya selagi R3P draf */
export const skStmtKegiatanBaru = (env, p, r3pId, k, kini, oleh, dummy) => sedia(env, p, "sk_r3p_kegiatan", "tambah", `INSERT INTO sk_r3p_kegiatan (id, r3p_id, sektor, nama, target, satuan, nilai_rp, tautan_jenis, tautan_id, status, dibuat, diubah, oleh, dummy)
  SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ? WHERE (SELECT status FROM sk_r3p WHERE id = ?) = 'draf'`)
  .bind(k.id, r3pId, k.sektor, k.nama, k.target ?? null, k.satuan ?? null, k.nilai_rp ?? null, k.tautan_jenis ?? null, k.tautan_id ?? null, k.status ?? "rencana", kini, kini, oleh, dummy ? 1 : 0, r3pId);

/* dummy G3 (hanya admin): Jitupasna dengan status dan versi bebas (baris diisi sebelum status dinaikkan, nilai dibekukan, lalu status naik lewat skStmtJitupasnaStatus/skStmtHitung) */
export const skStmtJitupasnaDummy = (env, p, j) => sedia(env, p, "sk_jitupasna", "tambah", "INSERT INTO sk_jitupasna (id, kejadian_id, kaji_id, prov, kab4, tim_sk, versi, induk_id, dibuat, diubah, oleh, dummy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)")
  .bind(j.id, j.kejadian_id, j.kaji_id ?? null, j.prov, j.kab4, j.tim_sk ?? null, j.versi, j.induk_id ?? null, j.kini, j.kini, j.oleh);
/* tautan kegiatan dummy ke pemulihan dummy yang SUDAH ada (modul A tidak menulis dummy modul B); tabel belum ada = tidak ada */
export const skPemulihanDummyId = async env => { try { return (await env.DB.prepare("SELECT id FROM pemulihan WHERE dummy = 1 ORDER BY id LIMIT 1").first())?.id ?? null; } catch (e) { if (/no such table/i.test(String(e?.message || e))) return null; throw e; } };

/* ---------- G4 (migrasi 0124): renkon dan gladi (F5), pintu (F7), ringkasan resmi untuk MCP ---------- */
const KOL_RK = "id, judul, bencana, prov, kab4, skenario, asumsi, kerangka, kesenjangan, status, versi, induk_id, tgl_sah, berlaku_sampai, no_penetapan, reviu_terakhir, meja_id, dibuat, diubah, oleh, dummy";
const KOL_GL = "id, jenis, renkon_id, kejadian_id, status, skenario, masalah, rekomendasi, dibuat, diubah, oleh, dummy";
const RK_PRA = "status IN ('persiapan', 'pelaksanaan', 'finalisasi', 'ditetapkan')";   // sama persis dengan predikat indeks sk_rk_status
/* daftar satu provinsi lewat sk_rk_wil (prov wajib); f: {prov, kab4?, bencana?, dummyOk} */
export const skRenkonDaftar = async (env, p, f) => (await sedia(env, p, "sk_renkon", "baca", `SELECT ${KOL_RK} FROM sk_renkon WHERE prov = ?${f.kab4 ? " AND kab4 = ?" : ""}${f.bencana ? " AND bencana = ?" : ""}${f.dummyOk ? "" : " AND dummy = 0"}${RK_LING(f.ling)} ORDER BY kab4, bencana, versi DESC LIMIT 101`)
  .bind(...[f.prov, f.kab4, f.bencana].filter(x => x), ...(f.ling ? [f.ling.kab, f.ling.prov] : [])).all()).results;
export const skRenkonById = (env, p, id) => sedia(env, p, "sk_renkon", "baca", `SELECT ${KOL_RK} FROM sk_renkon WHERE id = ?`).bind(id).first();
export const skRenkonTerbaru = (env, p, prov, kab4, bencana, dummy) => sedia(env, p, "sk_renkon", "baca", "SELECT id, status, versi FROM sk_renkon WHERE prov = ? AND kab4 IS ? AND bencana = ? AND dummy = ? ORDER BY versi DESC LIMIT 1").bind(prov, kab4 ?? null, bencana, dummy ? 1 : 0).first();
export const skStmtRenkonBaru = (env, p, r) => sedia(env, p, "sk_renkon", "tambah", "INSERT INTO sk_renkon (id, judul, bencana, prov, kab4, skenario, versi, induk_id, meja_id, dibuat, diubah, oleh, dummy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
  .bind(r.id, r.judul, r.bencana, r.prov, r.kab4 ?? null, r.skenario ?? null, r.versi ?? 1, r.induk_id ?? null, r.meja_id ?? null, r.kini, r.kini, r.oleh, r.dummy ? 1 : 0);
/* isian staf sebelum ditetapkan; dokumen yang sudah ditetapkan tidak ditimpa (status di WHERE) */
export const skStmtRenkonIsi = (env, p, id, v, kini) => sedia(env, p, "sk_renkon", "ubah", "UPDATE sk_renkon SET asumsi = coalesce(?, asumsi), kerangka = coalesce(?, kerangka), kesenjangan = coalesce(?, kesenjangan), skenario = coalesce(?, skenario), meja_id = coalesce(?, meja_id), diubah = ? WHERE id = ? AND status IN ('persiapan', 'pelaksanaan', 'finalisasi')")
  .bind(v.asumsi ?? null, v.kerangka ?? null, v.kesenjangan ?? null, v.skenario ?? null, v.meja_id ?? null, kini, id);
export const skStmtRenkonReviu = (env, p, id, tgl, kini) => sedia(env, p, "sk_renkon", "ubah", "UPDATE sk_renkon SET reviu_terakhir = ?, diubah = ? WHERE id = ? AND status IN ('ditetapkan', 'berlaku')").bind(tgl, kini, id);
export const skStmtRenkonStatus = (env, p, id, dari, ke, v, kini) => sedia(env, p, "sk_renkon", "ubah", "UPDATE sk_renkon SET status = ?, tgl_sah = coalesce(?, tgl_sah), berlaku_sampai = coalesce(?, berlaku_sampai), no_penetapan = coalesce(?, no_penetapan), diubah = ? WHERE id = ? AND status = ?")
  .bind(ke, v?.tgl_sah ?? null, v?.berlaku_sampai ?? null, v?.no_penetapan ?? null, kini, id, dari);
/* pintu: renkon berlaku menurut berlaku_sampai (sk_rk_batas) dan renkon yang masih disusun (sk_rk_status); keduanya LIMIT 50, tanpa pindai */
/* lingkup BP didorong ke SQL SEBELUM LIMIT: ling = {kab: JSON larik kab4, prov: JSON larik prov untuk akun provinsi (renkon tanpa kab4)} atau null untuk staf */
const RK_LING = ling => ling ? " AND (kab4 IN (SELECT value FROM json_each(?)) OR (kab4 IS NULL AND prov IN (SELECT value FROM json_each(?))))" : "";
export const skRenkonBerlaku = async (env, p, dummyOk, ling = null) => (await sedia(env, p, "sk_renkon", "baca", `SELECT id, judul, bencana, prov, kab4, status, tgl_sah, berlaku_sampai, reviu_terakhir, dummy FROM sk_renkon WHERE status = 'berlaku' AND berlaku_sampai >= '0000-01-01'${dummyOk ? "" : " AND dummy = 0"}${RK_LING(ling)} ORDER BY berlaku_sampai LIMIT 50`).bind(...(ling ? [ling.kab, ling.prov] : [])).all()).results;
export const skRenkonDisusun = async (env, p, dummyOk, ling = null) => (await sedia(env, p, "sk_renkon", "baca", `SELECT id, judul, bencana, prov, kab4, status, diubah, dummy FROM sk_renkon WHERE ${RK_PRA} AND diubah >= 0${dummyOk ? "" : " AND dummy = 0"}${RK_LING(ling)} ORDER BY diubah DESC LIMIT 50`).bind(...(ling ? [ling.kab, ling.prov] : [])).all()).results;
export const skGladiDaftar = async (env, p, renkonId, dummyOk) => (await sedia(env, p, "sk_gladi", "baca", `SELECT ${KOL_GL} FROM sk_gladi WHERE renkon_id = ?${dummyOk ? "" : " AND dummy = 0"} ORDER BY diubah DESC LIMIT 50`).bind(renkonId).all()).results;
export const skGladiById = (env, p, id) => sedia(env, p, "sk_gladi", "baca", `SELECT ${KOL_GL} FROM sk_gladi WHERE id = ?`).bind(id).first();
export const skGladiRencana = async (env, p, renkonIds, dummyOk) => renkonIds.length ? (await sedia(env, p, "sk_gladi", "baca", `SELECT id, renkon_id, jenis, status, kejadian_id FROM sk_gladi WHERE renkon_id IN (SELECT value FROM json_each(?)) AND status IN ('dirancang', 'siap')${dummyOk ? "" : " AND dummy = 0"} LIMIT 50`).bind(JSON.stringify(renkonIds)).all()).results : [];
export const skStmtGladiBaru = (env, p, g) => sedia(env, p, "sk_gladi", "tambah", "INSERT INTO sk_gladi (id, jenis, renkon_id, kejadian_id, skenario, dibuat, diubah, oleh, dummy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
  .bind(g.id, g.jenis, g.renkon_id, g.kejadian_id, g.skenario ?? null, g.kini, g.kini, g.oleh, g.dummy ? 1 : 0);
export const skStmtGladiStatus = (env, p, id, dari, ke, rekomendasi, kini) => sedia(env, p, "sk_gladi", "ubah", "UPDATE sk_gladi SET status = ?, rekomendasi = coalesce(?, rekomendasi), diubah = ? WHERE id = ? AND status = ?").bind(ke, rekomendasi ?? null, kini, id, dari);
/* catatan matriks masalah: ditulis hanya bila baris belum berubah sejak dibaca (diubah lama di WHERE) */
export const skStmtGladiMasalah = (env, p, id, masalah, diubahLama, kini) => sedia(env, p, "sk_gladi", "ubah", "UPDATE sk_gladi SET masalah = ?, diubah = ? WHERE id = ? AND diubah = ? AND status IN ('siap', 'berjalan', 'dievaluasi')").bind(masalah, kini, id, diubahLama);
/* dummy G4 (hanya admin): status bebas, CHECK tetap berlaku */
export const skStmtRenkonDummy = (env, p, r) => sedia(env, p, "sk_renkon", "tambah", `INSERT INTO sk_renkon (${KOL_RK.replace(/, dummy$/, "")}, dummy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`)
  .bind(r.id, r.judul, r.bencana, r.prov, r.kab4 ?? null, r.skenario ?? null, r.asumsi ?? null, r.kerangka ?? null, r.kesenjangan ?? null, r.status, r.versi ?? 1, r.induk_id ?? null, r.tgl_sah ?? null, r.berlaku_sampai ?? null, r.no_penetapan ?? null, r.reviu_terakhir ?? null, r.meja_id ?? null, r.kini, r.kini, r.oleh);
export const skStmtGladiDummy = (env, p, g) => sedia(env, p, "sk_gladi", "tambah", "INSERT INTO sk_gladi (id, jenis, renkon_id, kejadian_id, status, skenario, masalah, rekomendasi, dibuat, diubah, oleh, dummy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)")
  .bind(g.id, g.jenis, g.renkon_id, g.kejadian_id, g.status, g.skenario ?? null, g.masalah ?? null, g.rekomendasi ?? null, g.kini, g.kini, g.oleh);
/* skenario gladi dari kejadian terpromosi: entri logbook (hitungan dampak saja; tanpa catatan, pelapor, atau nama) */
export const skLogbookEntri = async (env, kejadianId) => (await env.DB.prepare("SELECT waktu, md, hilang, luka, mengungsi_jiwa, mengungsi_kk, rumah_rb, rumah_rs, rumah_rr, rumah_terendam, luas_ha FROM logbook_entri WHERE kejadian_id = ? ORDER BY waktu LIMIT 200").bind(kejadianId).all()).results;
/* stok LogPal kondisi baik/rusak per barang padanan (beras, air mineral) di gudang satu provinsi (opsional satu kabupaten); dibaca, tidak disalin */
export const skStokLogpal = async (env, prov, kabVarian, dummy) => {
  try {
    return (await env.DB.prepare(`SELECT b.barang, b.item_standar, b.satuan, sum(b.baik) baik, sum(b.rusak) rusak, sum(b.jumlah) jumlah FROM logpal_barang b JOIN logpal_gudang g ON g.id = b.gudang_id
      WHERE g.prov = ? AND g.dummy = ?${kabVarian?.length ? " AND lower(g.kab) IN (SELECT value FROM json_each(?))" : ""} AND (lower(b.barang) LIKE '%beras%' OR lower(b.item_standar) LIKE '%beras%' OR lower(b.barang) LIKE '%air mineral%' OR lower(b.barang) LIKE '%air minum%' OR lower(b.item_standar) LIKE '%air mineral%')
      GROUP BY b.barang, b.satuan LIMIT 50`).bind(...[prov, dummy ? 1 : 0, ...(kabVarian?.length ? [JSON.stringify(kabVarian)] : [])]).all()).results;
  } catch (e) { if (/no such table/i.test(String(e?.message || e))) return null; throw e; }
};
export const skPersonelSiap = async (env, prov, dummy) => {
  try { return (await env.DB.prepare("SELECT count(*) n FROM relawan WHERE status = 'siap_tugas' AND anonim = 0 AND prov = ? AND dummy = ?").bind(prov, dummy ? 1 : 0).first()).n; }
  catch (e) { if (/no such table/i.test(String(e?.message || e))) return null; throw e; }
};
export const skRenkonDummyAda = async (env, p) => (await sedia(env, p, "sk_renkon", "baca", "SELECT count(*) n FROM sk_renkon WHERE dummy = 1").first()).n;
export const skKejadianDummyTerbaru = (env, p) => sedia(env, p, "sk_kejadian", "baca", "SELECT id, jenis, mulai, kab4, prov FROM sk_kejadian WHERE dummy = 1 AND fase NOT IN ('digabung', 'dibatalkan') ORDER BY id LIMIT 1").first();
/* pintu (F7): kejadian aktif lewat indeks parsial sk_kej_fase, LIMIT 50; R3P lewat sk_r3p_kej; ringkasan resmi publik */
export const skKejadianAktif = async (env, p, dummyOk, lingkup = null) => (await sedia(env, p, "sk_kejadian", "baca", `SELECT id, jenis, nama, prov, kab4, mulai, fase, fase_diubah, tanggap_mulai, tanggap_akhir, publik, ringkasan_publik, yakin, dummy FROM sk_kejadian WHERE fase IN ('tanggap', 'transisi', 'pemulihan') AND fase NOT IN ('selesai', 'dibatalkan', 'digabung')${dummyOk ? "" : " AND dummy = 0"}${lingkup ? " AND kab4 IN (SELECT value FROM json_each(?))" : ""} ORDER BY fase_diubah DESC LIMIT 50`).bind(...(lingkup ? [lingkup] : [])).all()).results;
/* lingkup (BP): hanya R3P yang kabupaten Jitupasna-nya di dalam lingkup, disaring di SQL sebelum LIMIT */
export const skR3pAktifBanyak = async (env, p, kejadianIds, dummyOk, lingkup = null) => kejadianIds.length ? (await sedia(env, p, "sk_r3p", "baca", `SELECT r.id, r.jitupasna_id, r.kejadian_id, r.status, r.tanggap_mulai, r.dummy FROM sk_r3p r${lingkup ? " JOIN sk_jitupasna j ON j.id = r.jitupasna_id" : ""} WHERE r.kejadian_id IN (SELECT value FROM json_each(?)) AND r.status IN ('draf', 'diusulkan', 'disetujui_pm', 'ditetapkan_resmi', 'berjalan')${dummyOk ? "" : " AND r.dummy = 0"}${lingkup ? " AND j.kab4 IN (SELECT value FROM json_each(?))" : ""} LIMIT 50`).bind(JSON.stringify(kejadianIds), ...(lingkup ? [lingkup] : [])).all()).results : [];
export const skKejadianPublikDaftar = async (env, p, batas = 20) => (await sedia(env, p, "sk_kejadian", "baca", "SELECT id, jenis, prov, kab4, mulai, fase, ringkasan_publik, yakin, diubah FROM sk_kejadian WHERE publik = 1 AND dummy = 0 AND mulai >= '0000-01-01' AND fase NOT IN ('terdeteksi', 'dibatalkan', 'digabung') ORDER BY mulai DESC, id DESC LIMIT ?").bind(batas).all()).results;

/* ---------- dummy (DT 9): hanya admin (SA); hapus hanya baris dummy = 1, anak sebelum induk ---------- */
/* kejadian dummy hidup dalam rentang mulai (lewat indeks parsial sk_kej_dummy) */
export const skDummyKejadianAda = async (env, p, dari, sampai) => (await sedia(env, p, "sk_kejadian", "baca", "SELECT count(*) n FROM sk_kejadian WHERE dummy = 1 AND mulai >= ? AND mulai <= ?").bind(dari, sampai).first()).n;
/* urutan wajib = SK_DUMMY_TABEL. ponytail: sumber dummy berstatus ditolak tanpa kejadian tidak terjangkau indeks (tidak ikut terhapus); tambah indeks parsial bila SA sering menolak sumber dummy */
export const SK_DUMMY_TABEL = ["sk_gladi", "sk_renkon", "sk_r3p_kegiatan", "sk_r3p", "sk_jitupasna_baris", "sk_jitupasna", "sk_harga", "sk_kaji", "sk_kejadian_sumber", "sk_kejadian_alias", "sk_kejadian_kab", "sk_jejak", "sk_kejadian"];
export const skStmtDummyHapus = (env, p) => {
  const dum = "SELECT id FROM sk_kejadian WHERE dummy = 1";
  return [
    sedia(env, p, "sk_gladi", "hapus", "DELETE FROM sk_gladi WHERE dummy = 1"),
    sedia(env, p, "sk_renkon", "hapus", "DELETE FROM sk_renkon WHERE dummy = 1"),
    sedia(env, p, "sk_r3p_kegiatan", "hapus", "DELETE FROM sk_r3p_kegiatan WHERE dummy = 1"),
    sedia(env, p, "sk_r3p", "hapus", "DELETE FROM sk_r3p WHERE dummy = 1"),
    sedia(env, p, "sk_jitupasna_baris", "hapus", "DELETE FROM sk_jitupasna_baris WHERE dummy = 1"),
    sedia(env, p, "sk_jitupasna", "hapus", "DELETE FROM sk_jitupasna WHERE dummy = 1"),
    sedia(env, p, "sk_harga", "hapus", "DELETE FROM sk_harga WHERE dummy = 1"),
    sedia(env, p, "sk_kaji", "hapus", "DELETE FROM sk_kaji WHERE dummy = 1"),
    sedia(env, p, "sk_kejadian_sumber", "hapus", `DELETE FROM sk_kejadian_sumber WHERE dummy = 1 AND (kejadian_id IN (${dum}) OR status IN ('ambigu', 'tanpa_wilayah'))`),
    sedia(env, p, "sk_kejadian_alias", "hapus", `DELETE FROM sk_kejadian_alias WHERE dummy = 1 AND (ke_id IN (${dum}) OR alias_id IN (${dum}))`),
    sedia(env, p, "sk_kejadian_kab", "hapus", `DELETE FROM sk_kejadian_kab WHERE dummy = 1 AND kejadian_id IN (${dum})`),
    sedia(env, p, "sk_jejak", "hapus", "DELETE FROM sk_jejak WHERE dummy = 1"),
    sedia(env, p, "sk_kejadian", "hapus", "DELETE FROM sk_kejadian WHERE dummy = 1")];
};
/* baca rinci paparan: satu baris jejak per bacaan, tanpa data lain */
export const skJejakBacaRinci = (env, p, oleh, kab4, kini, dummy = 0) => skBatch(env, p, [skStmtJejak(env, p, oleh, "paparan", kab4, "baca_rinci", null, null, null, kini, dummy)]);

/* jejak: satu per batch tulis (INV-4); dibedakan dari pernyataan lain lewat JEJAK_SK */
export const skStmtJejak = (env, p, oleh, obyek, obyekId, aksi, dari, ke, catatan, kini, dummy = 0) => {
  const s = sedia(env, p, "sk_jejak", "tambah", "INSERT INTO sk_jejak (waktu, oleh, obyek, obyek_id, aksi, dari, ke, catatan, dummy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(kini, oleh, obyek, obyekId, aksi, dari ?? null, ke ?? null, catatan ?? null, dummy ? 1 : 0);
  JEJAK_SK.add(s);
  return s;
};
/* jalankan: tulis tanpa jejak ditolak; hasil per pernyataan (meta.changes) dikembalikan */
export const skBatch = (env, p, stmts) => {
  if (!stmts.some(s => JEJAK_SK.has(s))) throw new Galat(500, "tulis sk_* tanpa baris sk_jejak ditolak");
  return env.DB.batch(stmts);
};

/* ======================================================================================================================================================
   Operasi Udara isian manual (migrasi 0126_operasi_isian, 0127_op_isian_terhapus; src/operasi_isian.js, DESAIN-TEKNIS operasi-udara 7.3/7.4).
   Hak tulis dicek di rute (stafPeran pusdalops atau modOK), di sini hanya SQL. Fungsi stmt* belum dijalankan: dirangkai ke batchTulis. */
const opP = (env, sql, ...b) => env.DB.prepare(sql).bind(...b);
const opJson = o => o == null ? null : JSON.stringify(o);
const opTanpaIsian = e => /no such table: op_isian/i.test(String(e?.message || e));
const OP_KOL_GERAK = "id, tanggal, registrasi, jenis, jam_utc, misi, lokasi, lat, lon";
const OP_KOL_TEMUAN = "tanggal, jam_utc, registrasi, lat, lon, status, luas_klaim_ha, lokasi";
const OP_KOL_HASIL = ["drops", "liter", "lapor"];

/* "tabel|kunci" semua butir yang dihapus manual (indeks op_isian_terhapus). 0126 belum diterapkan: kosong. */
export async function opDihapusManual(env) {
  try { return new Set((await env.DB.prepare("SELECT tabel, kunci FROM op_isian WHERE terhapus = 1").all()).results.map(r => `${r.tabel}|${r.kunci}`)); }
  catch (e) { if (opTanpaIsian(e)) return new Set(); throw e; }
}
export const opIsianTerhapus = async (env, tabel) => new Set((await opP(env, "SELECT kunci FROM op_isian WHERE tabel = ? AND terhapus = 1", tabel).all()).results.map(r => r.kunci));
export const opLajuIsian = async (env, oleh, sejak) => (await opP(env, "SELECT count(*) n FROM op_isian_log WHERE oleh = ? AND waktu > ?", oleh, sejak).first())?.n ?? 0;
export const opStmtIsian = (env, tabel, kunci, oleh, kini, terhapus = 0) => opP(env, "INSERT INTO op_isian (tabel, kunci, sumber, oleh, waktu, terhapus) VALUES (?1, ?2, 'manual', ?3, ?4, ?5) ON CONFLICT (tabel, kunci) DO UPDATE SET oleh = ?3, waktu = ?4, terhapus = ?5", tabel, kunci, oleh, kini, terhapus);
export const opStmtLog = (env, oleh, kini, tabel, kunci, aksi, sebelum, sesudah, alasan = null) => opP(env, "INSERT INTO op_isian_log (waktu, oleh, tabel, kunci, aksi, sebelum, sesudah, alasan) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", kini, oleh, tabel, kunci, aksi, opJson(sebelum), opJson(sesudah), alasan);
/* K15: koordinat baris manual dilengkapi cron, tercatat */
export const opStmtLogLengkapi = (env, kini, kunci, sesudah) => opP(env, "INSERT INTO op_isian_log (waktu, oleh, tabel, kunci, aksi, sesudah) VALUES (?1, 'cron', 'op_gerak', ?2, 'lengkapi', ?3)", kini, kunci, opJson(sesudah));
export const opStmtKejadian = (env, jenis, tanggal, registrasi, sub, id) => opP(env, "INSERT OR IGNORE INTO op_isian_kejadian (jenis, tanggal, registrasi, sub, id) VALUES (?, ?, ?, ?, ?)", jenis, tanggal, registrasi, sub, id);

export const opArmada = (env, registrasi) => opP(env, "SELECT registrasi, base_id FROM op_armada WHERE registrasi = ?", registrasi).first();
export const opBaseAda = (env, id) => opP(env, "SELECT id FROM op_base WHERE id = ?", id).first();
export const opStatusTanggal = async (env, tanggal) => (await opP(env, "SELECT registrasi, status, alasan, sumber FROM op_armada_status WHERE tanggal = ?", tanggal).all()).results;
export const opStmtStatusManual = (env, tanggal, registrasi, status, alasan, kini) => opP(env, "INSERT INTO op_armada_status (tanggal, registrasi, status, alasan, sumber, diubah) VALUES (?1, ?2, ?3, ?4, 'manual', ?5) ON CONFLICT (tanggal, registrasi) DO UPDATE SET status = ?3, alasan = ?4, sumber = 'manual', diubah = ?5", tanggal, registrasi, status, alasan, kini);
/* baris bot jadi milik manual supaya pembaca menyembunyikannya; bot yang menulis lagi mengembalikan 'wa' */
export const opStmtStatusJadiManual = (env, tanggal, registrasi) => opP(env, "UPDATE op_armada_status SET sumber = 'manual' WHERE tanggal = ? AND registrasi = ?", tanggal, registrasi);

export const opGerakById = (env, id) => opP(env, `SELECT ${OP_KOL_GERAK} FROM op_gerak WHERE dummy = 0 AND id = ?`, id).first();
/* sortie sama yang belum dihapus manual */
export const opGerakKembar = (env, tanggal, registrasi, jenis, jam) => opP(env, `SELECT ${OP_KOL_GERAK} FROM op_gerak WHERE dummy = 0 AND tanggal = ?1 AND registrasi = ?2 AND jenis = ?3 AND jam_utc IS ?4 AND NOT EXISTS (SELECT 1 FROM op_isian WHERE tabel = 'op_gerak' AND kunci = CAST(op_gerak.id AS TEXT) AND terhapus = 1)`, tanggal, registrasi, jenis, jam).first();
export const opSisipGerak = async (env, g) => (await opP(env, "INSERT INTO op_gerak (tanggal, registrasi, jenis, jam_utc, misi, lokasi, lat, lon, wa_id, dummy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, 0)", g.tanggal, g.registrasi, g.jenis, g.jam_utc, g.misi, g.lokasi, g.lat, g.lon).run()).meta.last_row_id;
export const opStmtUbahGerak = (env, id, g) => opP(env, "UPDATE op_gerak SET tanggal = ?2, registrasi = ?3, jenis = ?4, jam_utc = ?5, misi = ?6, lokasi = ?7, lat = ?8, lon = ?9 WHERE id = ?1", id, g.tanggal, g.registrasi, g.jenis, g.jam_utc, g.misi, g.lokasi, g.lat, g.lon);
export const opHasil = (env, gid) => opP(env, "SELECT drops, liter, lapor FROM op_gerak_hasil WHERE gerak_id = ?", gid).first();
/* kol: bagian dari drops, liter, lapor (daftar putih); kolom satelit tidak disentuh */
export const opStmtHasil = (env, gid, isi) => {
  const kol = OP_KOL_HASIL.filter(k => isi[k] != null);
  return opP(env, `INSERT INTO op_gerak_hasil (gerak_id, ${kol.join(", ")}) VALUES (?, ${kol.map(() => "?").join(", ")}) ON CONFLICT (gerak_id) DO UPDATE SET ${kol.map(k => `${k} = excluded.${k}`).join(", ")}`, gid, ...kol.map(k => isi[k]));
};
export const opTemuanById = (env, id) => opP(env, `SELECT ${OP_KOL_TEMUAN} FROM op_temuan WHERE id = ? AND dummy = 0`, id).first();
export const opSisipTemuan = async (env, t) => (await opP(env, "INSERT INTO op_temuan (tanggal, jam_utc, registrasi, lat, lon, status, luas_klaim_ha, lokasi, wa_id, dummy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, 0)", t.tanggal, t.jam_utc, t.registrasi, t.lat, t.lon, t.status, t.luas_klaim_ha, t.lokasi).run()).meta.last_row_id;
export const opStmtUbahTemuan = (env, id, t) => opP(env, "UPDATE op_temuan SET tanggal = ?2, jam_utc = ?3, registrasi = ?4, lat = ?5, lon = ?6, status = ?7, luas_klaim_ha = ?8, lokasi = ?9 WHERE id = ?1", id, t.tanggal, t.jam_utc, t.registrasi, t.lat, t.lon, t.status, t.luas_klaim_ha, t.lokasi);
/* batalkan baris baru bila penanda isiannya gagal ditulis (tanpa penanda, bot bisa menggandakan) */
export const opBatalSisip = (env, tabel, id) => opP(env, tabel === "op_temuan" ? "DELETE FROM op_temuan WHERE id = ?" : "DELETE FROM op_gerak WHERE id = ?", id).run();

/* butir untuk hapus lunak: undefined = kunci tidak sesuai bentuk tabelnya, null = tidak ditemukan */
export async function opButir(env, tabel, kunci) {
  if (tabel === "op_armada_status") { const [t, r] = kunci.split("|"); return t && r ? opP(env, "SELECT tanggal, registrasi, status, alasan, sumber FROM op_armada_status WHERE tanggal = ? AND registrasi = ?", t, r).first() : undefined; }
  if (!/^\d+$/.test(kunci)) return undefined;
  const id = Number(kunci);
  if (tabel === "op_gerak") { const g = await opGerakById(env, id); if (!g) return null; const {id: _, ...sisa} = g; return sisa; }
  if (tabel === "op_gerak_hasil") return opHasil(env, id);
  if (tabel === "op_temuan") return opTemuanById(env, id);
  return undefined;
}
/* riwayat: per butir {tabel, kunci} atau per tanggal; maks 200, terbaru dulu */
export const opRiwayat = async (env, {tabel, kunci, tanggal}) => (tabel != null
  ? await opP(env, "SELECT waktu, oleh, tabel, kunci, aksi, sebelum, sesudah, alasan FROM op_isian_log WHERE tabel = ? AND kunci = ? ORDER BY id DESC LIMIT 200", tabel, kunci).all()
  : await opP(env, "SELECT waktu, oleh, tabel, kunci, aksi, sebelum, sesudah, alasan FROM op_isian_log WHERE json_extract(coalesce(sesudah, sebelum), '$.tanggal') = ? ORDER BY id DESC LIMIT 200", tanggal).all()).results;

/* ======================================================================================================================================================
   Dalops tindak lanjut Usulan langkah (migrasi 0128_dl_tindak; src/dalops_tindak.js; data/kajian-bnpb/tindak-langkah/DESAIN-TEKNIS.md).
   Hak dicek di rute (modAtauStaf untuk baca; modOK atau staf pusdalops/koordalops untuk tulis). dl_tindak_log append-only: tidak ada fungsi ubah/hapus. */
export const dlTindakTerkini = async (env, sejak) => (await env.DB.prepare("SELECT kunci, status, catatan, oleh, waktu FROM dl_tindak WHERE waktu > ? AND (kunci < 'kaji|' OR kunci >= 'kaji}') ORDER BY waktu DESC LIMIT 2000").bind(sejak).all()).results;
export const dlTindakRiwayat = async (env, kunci) => (await env.DB.prepare("SELECT waktu, status, catatan, langkah, oleh FROM dl_tindak_log WHERE kunci = ? ORDER BY id DESC LIMIT 100").bind(kunci).all()).results;
export const dlTindakLaju = async (env, oleh, sejak) => (await env.DB.prepare("SELECT count(*) n FROM dl_tindak_log WHERE oleh = ? AND waktu > ?").bind(oleh, sejak).first())?.n ?? 0;
export const dlStmtTindak = (env, kunci, status, catatan, oleh, kini) => env.DB.prepare("INSERT INTO dl_tindak (kunci, status, catatan, oleh, waktu) VALUES (?1, ?2, ?3, ?4, ?5) ON CONFLICT (kunci) DO UPDATE SET status = ?2, catatan = ?3, oleh = ?4, waktu = ?5").bind(kunci, status, catatan, oleh, kini);
export const dlStmtTindakLog = (env, kunci, status, catatan, langkah, oleh, kini) => env.DB.prepare("INSERT INTO dl_tindak_log (kunci, status, catatan, langkah, oleh, waktu) VALUES (?, ?, ?, ?, ?, ?)").bind(kunci, status, catatan, langkah, oleh, kini);
/* nama staf untuk kolom pengisi (Q3): hanya id yang diminta, lewat kunci utama */
export const dlNamaStaf = async (env, ids) => ids.length ? new Map((await env.DB.prepare("SELECT id, nama FROM staf WHERE id IN (SELECT value FROM json_each(?))").bind(JSON.stringify(ids)).all()).results.map(r => [r.id, r.nama])) : new Map();

/* ======================================================================================================================================================
   Target semai awan (migrasi 0129_semai_target; src/operasi_semai.js; data/kajian-bnpb/semai-awan/DESAIN-TEKNIS.md §4). Hak dicek di rute. */
export const smTargetHari = async (env, t) => (await env.DB.prepare("SELECT id, zona_id, putaran, base_id, base_icao, base_nama, tanggal, lat, lon, mulai, selesai, skor, alasan_json, catatan, dibuat FROM op_semai_target WHERE tanggal = ? AND terhapus IS NULL ORDER BY base_id, mulai LIMIT 200").bind(t).all()).results;
export const smTargetRentang = async (env, lo, hi) => (await env.DB.prepare("SELECT id, zona_id, putaran, base_id, base_icao, base_nama, tanggal, lat, lon, mulai, selesai, skor, alasan_json, catatan, dibuat FROM op_semai_target WHERE tanggal >= ? AND tanggal <= ? AND terhapus IS NULL ORDER BY tanggal, base_id, mulai LIMIT 2000").bind(lo, hi).all()).results;
/* Sasaran manual semai banjir (migrasi 0181_semai_sasaran; DESAIN-TEKNIS semai-banjir §4). oleh = id akun. */
export const ssHari = async (env, t) => (await env.DB.prepare("SELECT id, kab, tanggal, catatan, dibuat FROM op_semai_sasaran WHERE tanggal = ? AND terhapus IS NULL ORDER BY kab LIMIT 200").bind(t).all()).results;
export const ssAktif = async (env, kab, t) => !!await env.DB.prepare("SELECT 1 FROM op_semai_sasaran WHERE kab = ? AND tanggal = ? AND terhapus IS NULL").bind(kab, t).first();
export const ssLajuBuat = async (env, oleh, awal) => (await env.DB.prepare("SELECT count(*) n FROM op_semai_sasaran WHERE oleh = ? AND dibuat >= ?").bind(oleh, awal).first()).n;
export const ssLajuHapus = async (env, oleh, awal) => (await env.DB.prepare("SELECT count(*) n FROM op_semai_sasaran WHERE dihapus_oleh = ? AND terhapus >= ?").bind(oleh, awal).first()).n;
export const ssSisip = (env, ...v) => env.DB.prepare("INSERT INTO op_semai_sasaran (id, kab, tanggal, catatan, oleh, dibuat) VALUES (?,?,?,?,?,?)").bind(...v).run();
export const ssHapus = async (env, waktu, alasan, oleh, id) => !!(await env.DB.prepare("UPDATE op_semai_sasaran SET terhapus = ?, alasan_hapus = ?, dihapus_oleh = ? WHERE id = ? AND terhapus IS NULL").bind(waktu, alasan, oleh, id).run()).meta.changes;
export const smBase = (env, id) => env.DB.prepare("SELECT icao, nama FROM op_base WHERE id = ?").bind(id).first();
export const smTargetAktif = async (env, zona, base) => !!await env.DB.prepare("SELECT 1 FROM op_semai_target WHERE zona_id = ? AND base_id = ? AND terhapus IS NULL").bind(zona, base).first();
export const smLajuBuat = async (env, oleh, awal) => (await env.DB.prepare("SELECT count(*) n FROM op_semai_target WHERE oleh = ? AND dibuat >= ?").bind(oleh, awal).first()).n;
export const smLajuHapus = async (env, oleh, awal) => (await env.DB.prepare("SELECT count(*) n FROM op_semai_target WHERE dihapus_oleh = ? AND terhapus >= ?").bind(oleh, awal).first()).n;
export const smSisip = (env, ...v) => env.DB.prepare("INSERT INTO op_semai_target (id, zona_id, putaran, base_id, base_icao, base_nama, tanggal, lat, lon, mulai, selesai, skor, alasan_json, catatan, oleh, dibuat) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)").bind(...v).run();
export const smHapus = async (env, waktu, alasan, oleh, id) => !!(await env.DB.prepare("UPDATE op_semai_target SET terhapus = ?, alasan_hapus = ?, dihapus_oleh = ? WHERE id = ? AND terhapus IS NULL").bind(waktu, alasan, oleh, id).run()).meta.changes;

/* ======================================================================================================================================================
   Keterpaduan (migrasi 0132_indeks_kursor_modul; src/kejadian_tautan.js; data/kajian-bnpb/keterpaduan/DESAIN-TEKNIS.md). Pelaku: sistem (Bearer ingest), hak dicek di rute.
   Baca baris modul per jendela [lo, hi) pada kolom kursor + penanda (w, c): `col >= max(lo, c.w) AND (col > c.w OR id > c.id)` supaya baris semilidetik tidak terlewat.
   Tiap kueri terlayani indeks kursornya; hanya kolom yang dibutuhkan pencocok (tanpa nama, WA, PIC, isi laporan). LIMIT diisi pemanggil (batas + 1). */
const KT = {
  tugas_api: ["SELECT t.id kode, t.id cid, t.dibuat w, t.prov, t.kab, coalesce((SELECT b.bencana FROM tugas_bencana b WHERE b.tugas_id = t.id LIMIT 1), 'karhutla') jenis FROM tugas_api t WHERE t.dummy = 0 AND t.dibuat >= ?1 AND t.dibuat < ?2 AND (t.dibuat > ?3 OR t.id > ?4) ORDER BY t.dibuat, t.id LIMIT ?5"],   // indeks tugas_api_dibuat
  logbook_d1: ["SELECT id kode, id cid, dibuat w, prov, kab, jenis, mulai FROM logbook_kejadian WHERE dummy = 0 AND dibuat >= ?1 AND dibuat < ?2 AND (dibuat > ?3 OR id > ?4) ORDER BY dibuat, id LIMIT ?5"],   // logbook_kejadian_dibuat
  sippa: ["SELECT t.id kode, t.id cid, t.mulai w, t.prov, t.kab, k.jenis jenis FROM sippa_tugas t LEFT JOIN sippa_kit k ON k.id = t.kit_id WHERE t.dummy = 0 AND t.mulai >= ?1 AND t.mulai < ?2 AND (t.mulai > ?3 OR t.id > ?4)"
    + " AND NOT (EXISTS (SELECT 1 FROM sippa_log_gelar g WHERE g.tugas_id = t.id AND g.jenis = 'latihan') AND NOT EXISTS (SELECT 1 FROM sippa_log_gelar g WHERE g.tugas_id = t.id AND g.jenis <> 'latihan')) ORDER BY t.mulai, t.id LIMIT ?5"],   // sippa_tugas_mulai + sippa_log_tugas
  lapangan: ["SELECT id kode, id cid, mulai w, bencana jenis, lat, lon FROM lp_tugas WHERE dummy = 0 AND mulai >= ?1 AND mulai < ?2 AND (mulai > ?3 OR id > ?4) ORDER BY mulai, id LIMIT ?5"],   // lp_tugas_mulai
  // gempa_kejadian tidak punya kolom dummy (0009), jadi tidak disaring
  gempa_d1: ["SELECT kode, kode cid, mulai w, utama_id, lat, lon FROM gempa_kejadian WHERE mulai >= ?1 AND mulai < ?2 AND (mulai > ?3 OR kode > ?4) ORDER BY mulai, kode LIMIT ?5"],   // gempa_kejadian_mulai
  lapsus: ["SELECT l.operasi_id || ':' || l.kejadian_id kode, l.operasi_id || ':' || l.kejadian_id cid, l.dibuat w, k.jenis, k.prov, k.kab, k.mulai FROM lapsus_kejadian l JOIN logbook_kejadian k ON k.id = l.kejadian_id JOIN lapsus_operasi o ON o.id = l.operasi_id AND o.dummy = 0 WHERE k.dummy = 0 AND l.dibuat >= ?1 AND l.dibuat < ?2 AND (l.dibuat > ?3 OR l.operasi_id || ':' || l.kejadian_id > ?4) ORDER BY l.dibuat, l.operasi_id, l.kejadian_id LIMIT ?5"],   // lapsus_kejadian_dibuat
  /* LJ-14 (lapor-lanjutan): hanya tiket induk laporan tingkat bpbd yang punya berkas data lanjutan; tanpa WA, nama, atau isi. kab berkode "32.71" diterjemahkan item() di kejadian_tautan.js. */
  /* LK-10 (lapor-kejadian K87, A6): ditambah usulan staf lk_usulan (kode LU-, kab4 baku, jenis sudah jenis Buku Besar), hanya putaran terakhir per kejadian laporan.
     mulai = terkirim tiket kejadian laporan (LEFT JOIN: GL- tanpa baris lapor_sesi jatuh ke waktu usulan di item()). Tanpa oleh, anggota, WA, desa, atau catatan. */
  lapor_ai: ["SELECT s.nomor kode, s.nomor cid, s.terkirim w, s.kab, s.jenis, 0 usulan, NULL mulai FROM lapor_sesi s WHERE s.terkirim >= ?1 AND s.terkirim < ?2 AND (s.terkirim > ?3 OR s.nomor > ?4) AND s.tingkat = 'bpbd' AND EXISTS (SELECT 1 FROM lj_berkas b WHERE b.induk = s.nomor)"
    + " UNION ALL SELECT u.kode kode, u.kode cid, u.waktu w, u.kab4 kab, u.jenis, 1 usulan, s.terkirim mulai FROM lk_usulan u LEFT JOIN lapor_sesi s ON s.nomor = u.kejadian_laporan WHERE u.waktu >= ?1 AND u.waktu < ?2 AND (u.waktu > ?3 OR u.kode > ?4)"
    + " AND NOT EXISTS (SELECT 1 FROM lk_usulan v WHERE v.kejadian_laporan = u.kejadian_laporan AND v.putaran > u.putaran) ORDER BY w, cid LIMIT ?5",
    // cadangan bila migrasi 0170 (lk_usulan) belum diterapkan: tiket LA- saja, supaya tiket tidak ikut hilang
    "SELECT s.nomor kode, s.nomor cid, s.terkirim w, s.kab, s.jenis, 0 usulan, NULL mulai FROM lapor_sesi s WHERE s.terkirim >= ?1 AND s.terkirim < ?2 AND (s.terkirim > ?3 OR s.nomor > ?4) AND s.tingkat = 'bpbd' AND EXISTS (SELECT 1 FROM lj_berkas b WHERE b.induk = s.nomor) ORDER BY s.terkirim, s.nomor LIMIT ?5"],   // lapor_sesi_terkirim + lk_usulan_waktu; lj_berkas UNIQUE (induk, kab); lk_usulan_kejadian
};
export const KT_SQL = KT, KT_SUMBER = Object.keys(KT);
/* KP-06 baca tautan per pasangan (sumber, kode): satu kueri per pasangan lewat UNIQUE (sumber, kode, dummy), dibatch; dummy = 0 didahulukan. Tanpa nama/WA/isi. */
export const ktTautan = async (env, p, pairs, dummyOk) => {
  const sql = sedia(env, p, "sk_kejadian_sumber", "baca", "SELECT sumber, kode, kejadian_id, status, kab4, kandidat FROM sk_kejadian_sumber WHERE sumber = ? AND kode = ? AND dummy IN (0, ?) ORDER BY dummy LIMIT 1");
  return (await env.DB.batch(pairs.map(([s, k]) => sql.bind(s, k, dummyOk ? 1 : 0)))).map(r => r.results[0] ?? null);
};
export const ktKab = async (env, p, ids) => ids.length ? (await sedia(env, p, "sk_kejadian_kab", "baca", "SELECT kejadian_id, kab4 FROM sk_kejadian_kab WHERE kejadian_id IN (SELECT value FROM json_each(?))").bind(JSON.stringify(ids)).all()).results : [];
export const ktBaris = async (env, sumber, {lo, hi, w, id, batas}) => {
  const baca = sql => env.DB.prepare(sql).bind(Math.max(lo, w), hi, w, id, batas + 1).all().then(r => r.results);
  const tanpaTabel = e => sumber === "lapor_ai" && /no such table/i.test(String(e?.message));
  try { return await baca(KT[sumber][0]); }
  catch (e) {
    if (!tanpaTabel(e)) throw e;
    if (!/lk_usulan/i.test(String(e?.message))) return [];   // migrasi 0161 belum diterapkan
    try { return await baca(KT[sumber][1]); } catch (e2) { if (tanpaTabel(e2)) return []; throw e2; }   // 0170 belum: tiket LA- saja
  }
};

/* KP-19 titik pengungsian (migrasi 0134_titik_pengungsian, 0135_meja_pengungsi_titik; src/pengungsian_titik.js). Hak dicek di rute; tidak ada rute publik. */
export const tpDaftar = async (env, kab4) => (await env.DB.prepare("SELECT t.id, t.prov, t.kab4, t.kec, t.desa, t.nama, t.jenis_tempat, t.lat, t.lon, t.kejadian_id, t.buka, t.tutup, (SELECT max(json_extract(c.data, '$.tgl_data')) FROM meja_catatan c WHERE c.meja = 'pengungsi' AND json_extract(c.data, '$.titik_id') = t.id) putaran_terakhir FROM titik_pengungsian t WHERE t.kab4 = ? ORDER BY t.tutup IS NOT NULL, t.nama LIMIT 300").bind(kab4).all()).results;
export const tpById = (env, id) => env.DB.prepare("SELECT id, kab4, nama, tutup, buka FROM titik_pengungsian WHERE id = ?").bind(id).first();
export const tpSekitar = async (env, kab4, lat, lon, d) => (await env.DB.prepare("SELECT id, nama, lat, lon FROM titik_pengungsian WHERE kab4 = ? AND lat BETWEEN ? AND ? AND lon BETWEEN ? AND ? LIMIT 50").bind(kab4, lat - d, lat + d, lon - d, lon + d).all()).results;
export const tpKejadianKab = async (env, kejadianId, kab4) => { try { return !!await env.DB.prepare("SELECT 1 FROM sk_kejadian_kab WHERE kejadian_id = ? AND kab4 = ?").bind(kejadianId, kab4).first(); } catch (e) { if (/no such table/i.test(String(e?.message || e))) return false; throw e; } };
export const tpSisip = (env, ...v) => env.DB.prepare("INSERT INTO titik_pengungsian (id, prov, kab4, kec, desa, nama, jenis_tempat, lat, lon, kejadian_id, buka, dibuat, pembuat) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)").bind(...v).run();
export const tpTutup = async (env, id, tgl) => !!(await env.DB.prepare("UPDATE titik_pengungsian SET tutup = ? WHERE id = ? AND tutup IS NULL").bind(tgl, id).run()).meta.changes;

/* KP-21/22 orang_akun dan orang_tinjau (migrasi 0138, 0139; KEPUTUSAN D10). Dipakai layar tinjau admin (KP-23); pencocok KP-22 menulis SQL di luar repo. Hak dicek di rute. */
export const oaTinjauAntre = async env => (await env.DB.prepare("SELECT id, akun_tabel, akun_id, kandidat, alasan, dibuat FROM orang_tinjau WHERE keputusan IS NULL AND dibuat > 0 ORDER BY dibuat, id LIMIT 200").all()).results;
/* KP-23 satu batch atomik: UPDATE tinjau (hanya bila belum diputus dan, untuk pasang, akun belum berpasangan) lalu orang_akun dan jejak yang hanya masuk bila baris tinjau itu baru saja diputus oleh batch ini. true = tertulis; false = 0 baris, tak ada yang lain tertulis. */
export async function oaPutusBatch(env, t, keputusan, orangId, pemutus, kini) {
  const pasang = keputusan === "pasang", sudah = "EXISTS (SELECT 1 FROM orang_tinjau WHERE id = ?1 AND keputusan = ?2 AND diputus = ?3 AND pemutus = ?4)";
  const stmts = [env.DB.prepare("UPDATE orang_tinjau SET keputusan = ?2, diputus = ?3, pemutus = ?4 WHERE id = ?1 AND keputusan IS NULL" + (pasang ? " AND NOT EXISTS (SELECT 1 FROM orang_akun WHERE tabel = ?5 AND akun_id = ?6)" : "")).bind(...[t.id, keputusan, kini, pemutus, ...(pasang ? [t.akun_tabel, t.akun_id] : [])])];
  if (pasang) stmts.push(env.DB.prepare(`INSERT INTO orang_akun (tabel, akun_id, orang_id, cara, dibuat) SELECT ?5, ?6, ?7, 'admin', ?3 WHERE ${sudah}`).bind(t.id, keputusan, kini, pemutus, t.akun_tabel, t.akun_id, orangId));
  stmts.push(env.DB.prepare(`INSERT INTO pantau_jejak (waktu, oleh, obyek, aksi, ke, catatan, dummy) SELECT ?3, ?4, 'orang_tinjau:' || ?1, ?2, ?5, NULL, 0 WHERE ${sudah.replace("?4)", "?4)")}`).bind(t.id, keputusan, kini, pemutus, orangId ?? null));
  return !!(await env.DB.batch(stmts))[0].meta.changes;
}

/* KP-23 layar tinjau pasangan (src/orang_tinjau.js): ringkasan akun (tanpa nama), orang kandidat, satu baris tinjau. Hak dicek di rute (modOK). Satu batch per halaman: subrequest Free 50. */
const OA_AKUN = {
  staf: "SELECT nip, wa, unit FROM staf WHERE id = ?", instansi_akun: "SELECT nip, wa, unit FROM instansi_akun WHERE id = ?",
  pdt_akun: "SELECT nip, wa, unit FROM pdt_akun WHERE id = ?", km_akun: "SELECT NULL nip, wa, jabatan unit FROM km_akun WHERE id = ?",
};
export const oaAkunBanyak = async (env, baris) => baris.length ? (await env.DB.batch(baris.map(r => env.DB.prepare(OA_AKUN[r.akun_tabel]).bind(r.akun_id)))).map(x => x.results[0] ?? null) : [];
export const oaOrangRingkas = async (env, ids) => ids.length ? (await env.DB.prepare("SELECT id, jenis, unit, jabatan, nip, wa FROM orang WHERE id IN (SELECT value FROM json_each(?))").bind(JSON.stringify(ids)).all()).results : [];
export const oaTinjauById = (env, id) => env.DB.prepare("SELECT id, akun_tabel, akun_id, kandidat, keputusan FROM orang_tinjau WHERE id = ?").bind(id).first();
/* KP-24 jejak per orang (K9: orangnya sendiri dan admin). Hanya hitungan per hari per jenis dari kolom pelaku yang terverifikasi di migrasi: lp_absen.orang_id, lp_logbook.orang_id, tugas_isian.akun_id (lewat orang_akun 'instansi_akun').
   Tanpa isi, vektor, atau foto. meja_catatan.oleh dan logbook_entri.oleh teks bebas tanpa pemetaan ke orang_akun: tidak dibaca. Hak dicek di rute (src/lapangan_jejak.js). */
export const oaAkunDari = (env, tabel, akunId, orangId) => env.DB.prepare("SELECT 1 FROM orang_akun WHERE tabel = ? AND akun_id = ? AND orang_id = ?").bind(tabel, akunId, orangId).first();
export const oaJejakBaca = async (env, orangId, tglDari, tglSampai, msDari, msSampai) => {
  const [o, a, l, t] = await env.DB.batch([
    env.DB.prepare("SELECT 1 FROM orang WHERE id = ?").bind(orangId),
    env.DB.prepare("SELECT tanggal, count(*) n FROM lp_absen WHERE orang_id = ? AND tanggal BETWEEN ? AND ? AND status <> 'tolak' GROUP BY tanggal").bind(orangId, tglDari, tglSampai),
    env.DB.prepare("SELECT tanggal, count(*) n FROM lp_logbook WHERE orang_id = ? AND tanggal BETWEEN ? AND ? GROUP BY tanggal").bind(orangId, tglDari, tglSampai),
    env.DB.prepare("SELECT strftime('%Y-%m-%d', (dibuat + 25200000) / 1000, 'unixepoch') tanggal, count(*) n FROM tugas_isian WHERE akun_id IN (SELECT akun_id FROM orang_akun WHERE orang_id = ? AND tabel = 'instansi_akun') AND dibuat BETWEEN ? AND ? GROUP BY tanggal").bind(orangId, msDari, msSampai)]);
  return o.results.length ? {absen: a.results, logbook: l.results, tugas: t.results} : null;
};
export const oaJejakCatat = (env, oleh, orangId, kini) => env.DB.prepare("INSERT INTO pantau_jejak (waktu, oleh, obyek, aksi, ke, catatan, dummy) VALUES (?, ?, ?, 'jejak_baca', NULL, NULL, 0)").bind(kini, oleh.slice(0, 40), "orang:" + orangId).run();

/* ======================================================================================================================================================
   Paritas bencana PB-07 (migrasi 0130; data/kajian-bnpb/paritas-bencana/DESAIN-TEKNIS.md 3.2). Jenis tugas longsor dan pesisir ada di tugas_bencana_x (CHECK tugas_bencana 0047
   tidak mencakupnya). Tabel 0130 belum diterapkan = hanya tugas_bencana yang dibaca; karhutla dan tujuh jenis lama tetap jalan. Keduanya SEARCH lewat PK tugas_id. */
export const tanpaTabelPb = e => /no such table: (main\.)?(tugas_bencana_x|pb_\w+)/i.test(String(e?.message || e));
const SQL_TB = "SELECT tugas_id, bencana FROM tugas_bencana WHERE tugas_id IN (SELECT value FROM json_each(?))";
const SQL_TBX = "SELECT tugas_id, bencana FROM tugas_bencana_x WHERE tugas_id IN (SELECT value FROM json_each(?))";
/* Map id tugas -> teks jenis mentah (id tanpa baris = karhutla, diputuskan pemanggil). Melempar "no such table: tugas_bencana" bila 0047 belum ada. */
export async function tugasBencanaPer(env, ids) {
  const out = new Map(); if (!ids.length) return out;
  const j = JSON.stringify(ids); let hs;
  try { hs = await env.DB.batch([env.DB.prepare(SQL_TB).bind(j), env.DB.prepare(SQL_TBX).bind(j)]); }
  catch (e) { if (!tanpaTabelPb(e)) throw e; hs = [await env.DB.prepare(SQL_TB).bind(j).all()]; }
  for (const h of hs) for (const r of h.results) out.set(r.tugas_id, r.bencana);
  return out;
}
/* tabel jenis untuk bencana ini ada? (melempar "no such table" bila belum; bencana x memeriksa tugas_bencana_x) */
export const tugasBencanaAda = (env, x) => (x ? env.DB.prepare("SELECT 1 FROM tugas_bencana_x WHERE tugas_id = ''") : env.DB.prepare("SELECT 1 FROM tugas_bencana WHERE tugas_id = ''")).first();
export const stmtTugasBencanaBaru = (env, id, bc, x) => x ? env.DB.prepare("INSERT OR IGNORE INTO tugas_bencana_x (tugas_id, bencana) VALUES (?, ?)").bind(id, bc) : env.DB.prepare("INSERT OR IGNORE INTO tugas_bencana (tugas_id, bencana) VALUES (?, ?)").bind(id, bc);
/* Penutupan tugas per jenis (instansi.js tutupKedaluwarsa, selesaiBencana). x = jenis di tugas_bencana_x (longsor, pesisir), selain itu tugas_bencana; indeks tugas_bencana_jenis / tugas_bencana_x_jenis. */
const SQL_BUKA = {
  false: "SELECT t.id FROM tugas_bencana x JOIN tugas_api t ON t.id = x.tugas_id WHERE x.bencana = ?1 AND t.status = 'buka' AND t.dummy = 0 AND t.dibuat <= ?2 LIMIT ?3",
  true: "SELECT t.id FROM tugas_bencana_x x JOIN tugas_api t ON t.id = x.tugas_id WHERE x.bencana = ?1 AND t.status = 'buka' AND t.dummy = 0 AND t.dibuat <= ?2 LIMIT ?3"};
const SQL_TUNGGU = {
  false: "SELECT t.id FROM tugas_bencana x JOIN tugas_api t ON t.id = x.tugas_id WHERE x.bencana = ? AND t.status = 'padam' AND t.padam_verif = 'padam_dilaporkan' AND t.padam_pada <= ? AND t.dummy = 0 LIMIT 500",
  true: "SELECT t.id FROM tugas_bencana_x x JOIN tugas_api t ON t.id = x.tugas_id WHERE x.bencana = ? AND t.status = 'padam' AND t.padam_verif = 'padam_dilaporkan' AND t.padam_pada <= ? AND t.dummy = 0 LIMIT 500"};
const SQL_TUTUP = {
  false: "SELECT x.tugas_id FROM tugas_bencana x JOIN tugas_api t ON t.id = x.tugas_id WHERE x.bencana = ?1 AND x.reda >= ?2 AND t.status = 'buka' AND t.dummy = 0 LIMIT 500",
  true: "SELECT x.tugas_id FROM tugas_bencana_x x JOIN tugas_api t ON t.id = x.tugas_id WHERE x.bencana = ?1 AND x.reda >= ?2 AND t.status = 'buka' AND t.dummy = 0 LIMIT 500"};
const SQL_REDA = {
  false: "UPDATE tugas_bencana SET reda = CASE WHEN ?1 THEN reda + 1 ELSE 0 END WHERE tugas_id = ?2",
  true: "UPDATE tugas_bencana_x SET reda = CASE WHEN ?1 THEN reda + 1 ELSE 0 END WHERE tugas_id = ?2"};
const idDari = r => r.results.map(v => v.id ?? v.tugas_id);
/* tugas buka jenis b yang dibuat sebelum/pada `sampai` (ms), paling banyak `maks` */
export const tugasBukaJenis = async (env, b, x, sampai, maks) => idDari(await env.DB.prepare(SQL_BUKA[x]).bind(b, sampai, maks).all());
export const tugasTungguVerifJenis = async (env, b, x, sampai) => idDari(await env.DB.prepare(SQL_TUNGGU[x]).bind(b, sampai).all());
export const tugasRedaCukupJenis = async (env, b, x, berturut) => idDari(await env.DB.prepare(SQL_TUTUP[x]).bind(b, berturut).all());
export const stmtRedaTugas = (env, x, reda, id) => env.DB.prepare(SQL_REDA[x]).bind(reda ? 1 : 0, id);

/* ======================================================================================================================================================
   Paritas bencana PB-10 (migrasi 0130 pb_titik, pb_log; DESAIN-TEKNIS paritas-bencana 2.3, 2.4, 3.2). SEMUA SQL pb_* tinggal di sini; src/pb_*.js tidak menyentuh env.DB.
   Hak tulis dicek di rute (src/pb_isian.js: modOK atau stafPeran pusdalops, wilayah); di sini hanya pelaku pb_tulis / pb_baca. Daftar kolom tanpa `oleh` (tanpa identitas pengisi di keluaran). */
export const MATRIKS_PB = {
  pb_titik: {pb_baca: ["baca"], pb_tulis: ["baca", "tambah", "ubah"]},
  pb_log:   {pb_tulis: ["baca", "tambah"]},
};
Object.assign(MATRIKS, MATRIKS_PB);
export const pelakuPbTulis = {peran: "pb_tulis"}, pelakuPbBaca = {peran: "pb_baca"};
const KOL_PB_TITIK = "id, golongan, jenis, bencana, prov, kab, nama, lat, lon, kapasitas, status, catatan, dibuat, diubah";
export const PB_SQL = {
  daftar: `SELECT ${KOL_PB_TITIK} FROM pb_titik WHERE prov = ?1 AND bencana = ?2 AND dihapus IS NULL AND (?3 = '' OR kab = ?3) AND (?4 = '' OR golongan = ?4) AND (?5 = '' OR jenis = ?5) ORDER BY jenis, nama LIMIT 500`,
  satu: `SELECT ${KOL_PB_TITIK}, dihapus FROM pb_titik WHERE id = ?`,
  sisip: "INSERT INTO pb_titik (id, golongan, jenis, bencana, prov, kab, nama, lat, lon, kapasitas, status, catatan, oleh, dibuat, diubah) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?14)",
  ubah: "UPDATE pb_titik SET golongan = ?2, jenis = ?3, nama = ?4, lat = ?5, lon = ?6, kapasitas = ?7, status = ?8, catatan = ?9, diubah = ?10 WHERE id = ?1 AND dihapus IS NULL",
  hapus: "UPDATE pb_titik SET dihapus = ?2, diubah = ?2 WHERE id = ?1 AND dihapus IS NULL",
  log: "INSERT INTO pb_log (waktu, oleh, tabel, kunci, aksi, sebelum, sesudah, alasan) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
  laju: "SELECT count(*) n FROM pb_log WHERE oleh = ? AND waktu > ?",
};
export const pbTitikDaftar = async (env, p, q) => (await sedia(env, p, "pb_titik", "baca", PB_SQL.daftar).bind(q.prov, q.bencana, q.kab ?? "", q.golongan ?? "", q.jenis ?? "").all()).results;
export const pbTitikById = (env, p, id) => sedia(env, p, "pb_titik", "baca", PB_SQL.satu).bind(id).first();
export const pbStmtTitikSisip = (env, p, t, oleh, kini) => sedia(env, p, "pb_titik", "tambah", PB_SQL.sisip).bind(t.id, t.golongan, t.jenis, t.bencana, t.prov, t.kab, t.nama, t.lat, t.lon, t.kapasitas, t.status, t.catatan, oleh, kini);
export const pbStmtTitikUbah = (env, p, id, t, kini) => sedia(env, p, "pb_titik", "ubah", PB_SQL.ubah).bind(id, t.golongan, t.jenis, t.nama, t.lat, t.lon, t.kapasitas, t.status, t.catatan, kini);
export const pbStmtTitikHapus = (env, p, id, kini) => sedia(env, p, "pb_titik", "ubah", PB_SQL.hapus).bind(id, kini);
export const pbStmtLog = (env, p, kini, oleh, tabel, kunci, aksi, sebelum, sesudah, alasan = null) =>
  sedia(env, p, "pb_log", "tambah", PB_SQL.log).bind(kini, oleh, tabel, kunci, aksi, sebelum == null ? null : JSON.stringify(sebelum), sesudah == null ? null : JSON.stringify(sesudah), alasan);
export const pbLogLaju = async (env, p, oleh, sejak) => (await sedia(env, p, "pb_log", "baca", PB_SQL.laju).bind(oleh, sejak).first())?.n ?? 0;

/* PB-12 renlap generik (pb_renlap; DESAIN-TEKNIS paritas-bencana 3.2, 5). Versi = max+1 dalam SATU INSERT..SELECT (UNIQUE menutup balapan); diminta kedua < 30 menit ditolak di SQL yang sama.
   Hapus tidak ada: hanya status. Semua kueri lewat PK atau indeks pb_renlap_tanggal / pb_log_oleh. */
Object.assign(MATRIKS, {pb_renlap: {pb_baca: ["baca"], pb_tulis: ["baca", "tambah", "ubah"]}});
const KOL_PB_RENLAP = "id, bencana, prov, kab, tanggal, versi, status, berlaku_sampai, jml_target, ukuran, sha, galat, dibuat, diubah";
export const PB_SQL_RENLAP = {
  minta: `INSERT INTO pb_renlap (id, bencana, prov, kab, tanggal, versi, status, oleh, dibuat, diubah)
    SELECT ?1, ?2, ?3, ?4, ?5, v, 'diminta', ?6, ?7, ?7 FROM (SELECT coalesce(max(versi), 0) + 1 v FROM pb_renlap WHERE bencana = ?2 AND prov = ?3 AND kab = ?4 AND tanggal = ?5)
    WHERE NOT EXISTS (SELECT 1 FROM pb_renlap WHERE bencana = ?2 AND prov = ?3 AND kab = ?4 AND tanggal = ?5 AND status = 'diminta' AND dibuat > ?8)`,
  satu: `SELECT ${KOL_PB_RENLAP} FROM pb_renlap WHERE id = ?`,
  daftar: `SELECT ${KOL_PB_RENLAP} FROM pb_renlap WHERE tanggal BETWEEN ?1 AND ?2 AND bencana = ?3 AND (?4 = '' OR prov = ?4) ORDER BY tanggal DESC, versi DESC LIMIT 200`,
  geser: "UPDATE pb_renlap SET status = ?3, berlaku_sampai = ?4, jml_target = coalesce(?5, jml_target), ukuran = coalesce(?6, ukuran), sha = coalesce(?7, sha), galat = ?8, diubah = ?9 WHERE id = ?1 AND status = ?2",
  lajuMinta: "SELECT count(*) n FROM pb_log WHERE oleh = ? AND waktu > ? AND aksi = 'minta'",
};
export const pbRenlapMinta = (env, p, r, oleh, kini, tahan) => sedia(env, p, "pb_renlap", "tambah", PB_SQL_RENLAP.minta).bind(r.id, r.bencana, r.prov, r.kab, r.tanggal, oleh, kini, kini - tahan);
export const pbRenlapById = (env, p, id) => sedia(env, p, "pb_renlap", "baca", PB_SQL_RENLAP.satu).bind(id).first();
export const pbRenlapDaftar = async (env, p, dari, sampai, bencana, prov) => (await sedia(env, p, "pb_renlap", "baca", PB_SQL_RENLAP.daftar).bind(dari, sampai, bencana, prov).all()).results;
/* true bila satu baris bergeser dari status `dari` ke `ke` (transisi mundur atau ulang = false) */
export const pbRenlapGeser = async (env, p, id, dari, ke, f, kini) => (await sedia(env, p, "pb_renlap", "ubah", PB_SQL_RENLAP.geser)
  .bind(id, dari, ke, f.berlaku ?? null, f.jml ?? null, f.ukuran ?? null, f.sha ?? null, f.galat ?? null, kini).run()).meta.changes === 1;
export const pbRenlapLajuMinta = async (env, p, oleh, sejak) => (await sedia(env, p, "pb_log", "baca", PB_SQL_RENLAP.lajuMinta).bind(oleh, sejak).first())?.n ?? 0;

/* ======================================================================================================================================================
   Satu Pintu Masuk (migrasi 0133_masuk; src/masuk.js; data/kajian-bnpb/pintu-masuk/DESAIN-TEKNIS.md §2, §4.1). Hak dicek di rute (publik berlaju, kode sah, atau sesi_masuk).
   Semua kueri lewat kunci utama atau indeks mk_kode_nomor / UNIQUE mk_akun.wa. Kode hanya HMAC; pesan wa_antre jenis 'otp' berbagi id dengan mk_kode (hapus lewat kunci utama). */
export const mkJedaTerakhir = async (env, nsha, sejak) => (await env.DB.prepare("SELECT max(dibuat) d FROM mk_kode WHERE nomor_sha = ? AND dibuat > ?").bind(nsha, sejak).first())?.d ?? null;
/* satu-satunya penulis antrean WA (FITUR §9, src/keluar.js): pernyataan untuk dimasukkan ke batch pemanggil. dummy = pesan contoh, tidak pernah ditarik gateway */
export const stmtAntreWa = (env, {id, tujuan, pesan, jenis, rujukan, kini, dummy = 0}) =>
  env.DB.prepare("INSERT INTO wa_antre (id, tujuan, pesan, jenis, rujukan, status, percobaan, dibuat, dummy) VALUES (?, ?, ?, ?, ?, 'antre', 0, ?, ?)")
    .bind(id, tujuan, pesan.slice(0, 1500), jenis, rujukan, kini, dummy ? 1 : 0);
/* kode baru dan pesan antrean dalam satu batch; kode lama nomor itu TETAP sah (D18: peminta iseng tidak mematikan kode korban) */
export const mkKodeBaru = (env, id, nsha, kodeSha, nomor, pesan, kini, habis) => env.DB.batch([
  env.DB.prepare("INSERT INTO mk_kode (id, nomor_sha, kode_sha, saluran, coba, dibuat, habis) VALUES (?, ?, ?, 'wa', 0, ?, ?)").bind(id, nsha, kodeSha, kini, habis),
  stmtAntreWa(env, {id, tujuan: nomor, pesan, jenis: "otp", rujukan: id, kini})]);
/* semua kode aktif nomor itu naik `coba` dalam satu pernyataan, sebelum dibandingkan; RETURNING membawa nilai sesudah naik */
export const mkNaikCobaSemua = async (env, nsha, kini, maks) => (await env.DB.prepare("UPDATE mk_kode SET coba = coba + 1 WHERE id IN (SELECT id FROM mk_kode WHERE nomor_sha = ?1 AND dipakai IS NULL AND habis > ?2 ORDER BY dibuat DESC LIMIT ?3) RETURNING id, coba, kode_sha, saluran").bind(nsha, kini, maks).all()).results;
/* sesudah satu kode menang: kode aktif lain nomor itu hangus dan semua baris otp-nya (termasuk milik pemenang) dihapus lewat kunci utama */
export const mkSelesaiKode = async (env, nsha, idMenang, kini) => {
  const ids = (await env.DB.prepare("UPDATE mk_kode SET habis = ? WHERE nomor_sha = ? AND dipakai IS NULL AND habis > ? RETURNING id").bind(kini, nsha, kini).all()).results.map(r => r.id);
  await env.DB.batch([idMenang, ...ids].map(i => env.DB.prepare("DELETE FROM wa_antre WHERE id = ? AND jenis = 'otp'").bind(i)));
};
export const mkHanguskan = (env, id, kini) => env.DB.prepare("UPDATE mk_kode SET habis = ? WHERE id = ?").bind(kini, id).run();
/* true hanya untuk satu pemanggil: dua periksa serentak, satu yang mengubah baris */
export const mkPakaiKode = async (env, id, kini) => (await env.DB.prepare("UPDATE mk_kode SET dipakai = ? WHERE id = ? AND dipakai IS NULL AND habis > ?").bind(kini, id, kini).run()).meta.changes === 1;
export const mkHapusOtp = (env, id) => env.DB.prepare("DELETE FROM wa_antre WHERE id = ? AND jenis = 'otp'").bind(id).run();
export const mkHanguskanBanyak = (env, ids, kini) => ids.length ? env.DB.batch(ids.map(i => env.DB.prepare("UPDATE mk_kode SET habis = ? WHERE id = ?").bind(kini, i))) : null;
/* PM-04: denyut gerbang WA, satu baris; ditulis hanya bila lama sudah lewat `jeda` (paling banyak sekali per menit). Tabel belum ada = dilewati diam. */
export const mkDenyut = async (env, kini, jeda) => {
  try { await env.DB.prepare("INSERT INTO mk_denyut (nama, waktu) VALUES ('wa', ?1) ON CONFLICT (nama) DO UPDATE SET waktu = ?1 WHERE mk_denyut.waktu <= ?2").bind(kini, kini - jeda).run(); }
  catch (e) { if (!/no such table/i.test(String(e?.message || e))) throw e; }
};
export const mkDenyutBaca = async env => {
  try { return (await env.DB.prepare("SELECT waktu FROM mk_denyut WHERE nama = 'wa'").first())?.waktu ?? null; }
  catch (e) { if (/no such table/i.test(String(e?.message || e))) return null; throw e; }
};
/* PM-04: pembersihan sejam sekali (dipanggil bersihkanLapangan); otp lama selalu, tabel mk_* belum ada = dilewati */
export const mkBersihkan = async (env, kini, c) => {
  await env.DB.prepare("DELETE FROM wa_antre WHERE jenis = 'otp' AND status IN ('antre', 'gagal', 'dikirim') AND dibuat < ?").bind(kini - c.OTP_UMUR).run();
  try {
    await env.DB.batch([
      env.DB.prepare("DELETE FROM mk_kode_akun WHERE kode_id IN (SELECT id FROM mk_kode WHERE dibuat < ?)").bind(kini - c.RETENSI_KODE),
      env.DB.prepare("DELETE FROM mk_kode WHERE dibuat < ?").bind(kini - c.RETENSI_KODE),
      env.DB.prepare("DELETE FROM mk_sesi WHERE habis < ?").bind(kini),
      env.DB.prepare("UPDATE mk_undang SET status = 'dicabut' WHERE status = 'terkirim' AND habis < ?").bind(kini),
      env.DB.prepare("DELETE FROM mk_undang WHERE habis < ?").bind(kini - c.RETENSI_UNDANG),
      env.DB.prepare("DELETE FROM mk_masuk_log WHERE waktu < ?").bind(kini - c.RETENSI_LOG)]);
  } catch (e) { if (!/no such table/i.test(String(e?.message || e))) throw e; }
};
/* akun umum kosong untuk nomor yang kodenya sah; nama, wilayah, persetujuan dilengkapi PM-08 */
export const mkAkunUntuk = async (env, id, nomor, kini) => {
  await env.DB.prepare("INSERT INTO mk_akun (id, wa, status, dibuat) VALUES (?, ?, 'aktif', ?) ON CONFLICT (wa) DO NOTHING").bind(id, nomor, kini).run();
  return env.DB.prepare("SELECT id, status, setuju_pdp FROM mk_akun WHERE wa = ?").bind(nomor).first();
};
export const mkSesiBaru = (env, tokenSha, akunId, kini, habis) => env.DB.batch([
  env.DB.prepare("INSERT INTO mk_sesi (token_sha, mk_id, kode_pada, dibuat, habis) VALUES (?, ?, ?, ?, ?)").bind(tokenSha, akunId, kini, kini, habis),
  env.DB.prepare("UPDATE mk_akun SET terakhir_masuk = ? WHERE id = ?").bind(kini, akunId)]);
export const mkSesiDari = (env, tokenSha, kini) => env.DB.prepare("SELECT s.kode_pada, a.id, a.wa, a.nama, a.prov, a.kab, a.setuju_pdp FROM mk_sesi s JOIN mk_akun a ON a.id = s.mk_id WHERE s.token_sha = ? AND s.habis > ? AND a.status = 'aktif'").bind(tokenSha, kini).first();
/* PM-08: profil akun umum; waktu persetujuan pertama dipertahankan (setuju_pdp = waktu ms, > 0 berarti sudah setuju) */
export const mkLengkapi = (env, id, nama, prov, kab, kini) => env.DB.prepare("UPDATE mk_akun SET nama = ?, prov = ?, kab = ?, setuju_pdp = coalesce(setuju_pdp, ?) WHERE id = ?").bind(nama, prov, kab, kini, id).run();
export const mkCabutSesi = (env, tokenSha) => env.DB.prepare("DELETE FROM mk_sesi WHERE token_sha = ?").bind(tokenSha).run();

/* PM-06 dan PM-07 (ALGORITMA 3): akun peran yang terikat LANGSUNG ke nomor terbukti (D4), sesi peran, log masuk, nomor pemirsa.
   Tiap kueri lewat indeks wa (instansi_akun_wa, pdt_akun_wa, km_akun_wa, staf_wa, orang_wa, relawan_wa_aktif, UNIQUE mk_akun.wa / mk_pemirsa_wa.wa). Nomor selalu bentuk 62...; hanya orang dan relawan dicocokkan juga bentuk 08... */
const duaBentuk = n => [n, "0" + n.slice(2)];
const MK_SESI_SQL = {   // [terbitkan hanya bila akun aktif, buang sesi kedaluwarsa akun itu, cabut satu token]
  instansi: ["INSERT INTO instansi_sesi (token_sha, akun_id, dibuat, kedaluwarsa) SELECT ?1, id, ?3, ?4 FROM instansi_akun WHERE id = ?2 AND status = 'aktif' AND dummy = 0 AND jenis NOT IN ('pemprov', 'pemkab', 'pemkot')", "DELETE FROM instansi_sesi WHERE akun_id = ?1 AND kedaluwarsa <= ?2", "DELETE FROM instansi_sesi WHERE token_sha = ?1"],
  pendataan: ["INSERT INTO pdt_sesi (token_sha, akun_id, dibuat, kedaluwarsa) SELECT ?1, id, ?3, ?4 FROM pdt_akun WHERE id = ?2 AND status = 'aktif' AND dummy = 0", "DELETE FROM pdt_sesi WHERE akun_id = ?1 AND kedaluwarsa <= ?2", "DELETE FROM pdt_sesi WHERE token_sha = ?1"],
  kemitraan: ["INSERT INTO km_sesi (sha, akun_id, dibuat, sampai) SELECT ?1, id, ?3, ?4 FROM km_akun WHERE id = ?2 AND status = 'aktif' AND dummy = 0", "DELETE FROM km_sesi WHERE akun_id = ?1 AND sampai <= ?2", "DELETE FROM km_sesi WHERE sha = ?1"],
  pemirsa: ["INSERT INTO pemirsa_sesi (token_sha, pemirsa_id, dibuat, kedaluwarsa) SELECT ?1, id, ?3, ?4 FROM pemirsa WHERE id = ?2 AND status = 'aktif' AND diputus IS NULL", "DELETE FROM pemirsa_sesi WHERE pemirsa_id = ?1 AND kedaluwarsa <= ?2", "DELETE FROM pemirsa_sesi WHERE token_sha = ?1"]};
/* true bila sesi terbit: akun harus (masih) aktif pada saat INSERT (satu pernyataan, tanpa celah baca-lalu-tulis) */
export const mkSesiPeran = async (env, jenis, akunId, tokenSha, kini, habis) => {
  const [t, b] = MK_SESI_SQL[jenis];
  return (await env.DB.batch([env.DB.prepare(t).bind(tokenSha, akunId, kini, habis), env.DB.prepare(b).bind(akunId, kini)]))[0].meta.changes === 1;
};
export const mkCabutSesiPeran = (env, jenis, tokenSha) => env.DB.prepare(MK_SESI_SQL[jenis][2]).bind(tokenSha).run();
/* satu batch: instansi langsung, instansi lewat keanggotaan (mk_anggota aktif ke akun aktif), pendataan, kampus, staf (tanpa sesi), pemirsa lewat mk_pemirsa_wa */
export const mkRuangPeran = async (env, nomor, maks) => {
  const [i, a, p, k, s, m] = (await env.DB.batch([
    env.DB.prepare("SELECT id, jenis, wilayah FROM instansi_akun WHERE wa = ?1 AND status = 'aktif' AND dummy = 0 AND jenis NOT IN ('pemprov', 'pemkab', 'pemkot') LIMIT ?2").bind(nomor, maks),
    env.DB.prepare("SELECT x.id, x.jenis, x.wilayah FROM mk_akun u JOIN mk_anggota g ON g.mk_id = u.id AND g.tabel = 'instansi_akun' AND g.status = 'aktif' JOIN instansi_akun x ON x.id = g.akun_id AND x.status = 'aktif' AND x.dummy = 0 AND x.jenis NOT IN ('pemprov', 'pemkab', 'pemkot') WHERE u.wa = ?1 AND u.status = 'aktif' LIMIT ?2").bind(nomor, maks),
    env.DB.prepare("SELECT id, unit, unit_lain FROM pdt_akun WHERE wa = ?1 AND status = 'aktif' AND dummy = 0 LIMIT ?2").bind(nomor, maks),
    env.DB.prepare("SELECT k.id, (SELECT nama FROM institusi WHERE id = k.institusi_id) lembaga FROM km_akun k WHERE k.wa = ?1 AND k.status = 'aktif' AND k.dummy = 0 LIMIT ?2").bind(nomor, maks),
    env.DB.prepare("SELECT id, username FROM staf WHERE wa = ?1 AND status = 'aktif' AND dummy = 0 LIMIT ?2").bind(nomor, maks),
    env.DB.prepare("SELECT p.id, p.nama, p.tab FROM mk_pemirsa_wa w JOIN pemirsa p ON p.id = w.pemirsa_id WHERE w.wa = ?1 AND p.status = 'aktif' AND p.diputus IS NULL LIMIT 1").bind(nomor)])).map(x => x.results);
  const ada = new Set(i.map(x => x.id));
  return {instansi: [...i, ...a.filter(x => !ada.has(x.id))].slice(0, maks), pendataan: p, kemitraan: k, staf: s, pemirsa: m};
};
export const mkStafPerWa = async (env, nomor, maks) => (await env.DB.prepare("SELECT id, username FROM staf WHERE wa = ?1 AND status = 'aktif' AND dummy = 0 LIMIT ?2").bind(nomor, maks).all()).results;
export const mkLogMasuk = (env, daftar, mkId, kini) => daftar.length ? env.DB.batch(daftar.map(d => env.DB.prepare("INSERT INTO mk_masuk_log (id, mk_id, tabel, akun_id, waktu) VALUES (?, ?, ?, ?, ?)").bind(d.id, mkId, d.tabel, d.akun_id, kini))) : null;
/* orang dan relawan: tepat satu baris (>= 2 dikembalikan apa adanya supaya pemanggil menolak). relawan hanya kolom yang dipakai rute /api/relawan/saya: tanpa wa, email, gol_darah, darurat_* */
export const mkOrangDariWa = async (env, nomor) => (await env.DB.prepare("SELECT * FROM orang WHERE wa IN (?1, ?2) AND status = 'aktif' AND dummy = 0 LIMIT 2").bind(...duaBentuk(nomor)).all()).results;
export const mkOrangDariRelawan = (env, relawanId) => env.DB.prepare("SELECT * FROM orang WHERE relawan_id = ? AND status = 'aktif'").bind(relawanId).first();
export const mkRelawanDariWa = async (env, nomor, statusSah) => (await env.DB.prepare(`SELECT id, nama, prov, kab, jalur, kampus_id, organisasi, keahlian, sertifikat, hari_per_minggu, maks_hari, luar_provinsi, status, alasan, dibuat
  FROM relawan WHERE anonim = 0 AND dummy = 0 AND status NOT IN ('ditolak', 'nonaktif') AND wa IN (?1, ?2) AND status IN (SELECT value FROM json_each(?3)) LIMIT 2`).bind(...duaBentuk(nomor), JSON.stringify(statusSah)).all()).results;
/* nomor pemirsa (D17): hanya Super Admin yang memanggil. wa null = hapus. Nomor sudah dipakai pemirsa lain = melempar UNIQUE (pemanggil menjawab 409) */
export const mkPemirsaAda = async (env, id) => !!(await env.DB.prepare("SELECT 1 x FROM pemirsa WHERE id = ?").bind(id).first());
export const mkPemirsaWaSet = (env, id, wa, oleh, kini) => wa == null
  ? env.DB.prepare("DELETE FROM mk_pemirsa_wa WHERE pemirsa_id = ?").bind(id).run()
  : env.DB.prepare("INSERT INTO mk_pemirsa_wa (pemirsa_id, wa, oleh, dibuat) VALUES (?1, ?2, ?3, ?4) ON CONFLICT (pemirsa_id) DO UPDATE SET wa = excluded.wa, oleh = excluded.oleh, dibuat = excluded.dibuat").bind(id, wa, oleh, kini).run();

/* PM-09 sampai PM-12 (ALGORITMA §4, §5, §8): anggota, email terpetakan, undangan berantai, papan aktivasi. Tiap kueri lewat indeks
   (mk_anggota_akun, mk_anggota_status 0140, mk_undang_wa/akun/oleh, mk_domain PK, kontak_pemangku_wa/wilayah, instansi_akun_wa/wilayah, pdt_akun_wa); tabel mk_* belum ada = melempar "no such table" (pemanggil menjawab 503). */
export const mkInstansiById = (env, id) => env.DB.prepare("SELECT id, jenis, tingkat, wilayah, prov, kab, cakupan, status, wa FROM instansi_akun WHERE id = ? AND dummy = 0").bind(id).first();
/* akun aktif yang bisa dipilih pemohon: tingkat kabupaten (prov+kab persis) dan tingkat provinsi yang cakupannya memuat prov; jenis disaring ke satu rumpun */
export const mkAkunPilihan = async (env, jenis, prov, kab) => {
  const j = JSON.stringify(jenis);
  const [a, b] = await env.DB.batch([
    env.DB.prepare("SELECT id, jenis, tingkat, wilayah FROM instansi_akun WHERE tingkat = 'kab' AND prov = ?1 AND kab = ?2 AND status = 'aktif' AND dummy = 0 AND jenis IN (SELECT value FROM json_each(?3)) LIMIT 20").bind(prov, kab ?? "", j),
    env.DB.prepare("SELECT id, jenis, tingkat, wilayah FROM instansi_akun WHERE tingkat = 'prov' AND status = 'aktif' AND dummy = 0 AND jenis IN (SELECT value FROM json_each(?2)) AND EXISTS (SELECT 1 FROM json_each(cakupan) WHERE value = ?1) LIMIT 20").bind(prov, j)]);
  return [...(kab ? a.results : []), ...b.results];
};
/* undangan hanya sah selama pengundangnya MASIH berhak: admin, staf aktif, anggota aktif akun itu, atau pemilik nomor akun aktif (x = instansi_akun tujuan) */
const UNDANG_BERHAK = "(u.oleh_tabel = 'admin' OR (u.oleh_tabel = 'staf' AND EXISTS (SELECT 1 FROM staf s WHERE s.id = u.oleh_id AND s.status = 'aktif')) OR (u.oleh_tabel = 'mk_akun' AND (EXISTS (SELECT 1 FROM mk_anggota g WHERE g.mk_id = u.oleh_id AND g.tabel = 'instansi_akun' AND g.akun_id = u.akun_id AND g.status = 'aktif') OR EXISTS (SELECT 1 FROM mk_akun o WHERE o.id = u.oleh_id AND o.status = 'aktif' AND o.wa = x.wa))))";
export const mkUndangBerlaku = (env, nomor, akunId, kini) => env.DB.prepare(`SELECT u.id, u.oleh_tabel, u.oleh_id FROM mk_undang u JOIN instansi_akun x ON x.id = u.akun_id AND x.status = 'aktif' AND x.dummy = 0 WHERE u.wa = ?1 AND u.status = 'terkirim' AND u.tabel = 'instansi_akun' AND u.akun_id = ?2 AND u.habis > ?3 AND ${UNDANG_BERHAK} ORDER BY u.dibuat DESC LIMIT 1`).bind(nomor, akunId, kini).first();
/* kontak pemangku aktif: nomor = wa (bukan ajudan_wa), kategori dalam daftar, wilayah sama dengan akun (kabupaten persis tanpa beda huruf; akun provinsi: kontak tingkat provinsi dalam cakupan) */
export const mkKontakCocok = (env, nomor, kategori, a) => env.DB.prepare(`SELECT id FROM kontak_pemangku WHERE wa = ?1 AND status = 'aktif' AND kategori IN (SELECT value FROM json_each(?2))
  AND ((?3 = 'kab' AND prov = ?4 AND lower(kab) = lower(?5)) OR (?3 <> 'kab' AND kab IS NULL AND prov IN (SELECT value FROM json_each(?6)))) LIMIT 1`).bind(nomor, JSON.stringify(kategori), a.tingkat, a.prov ?? "", a.kab ?? "", a.cakupan ?? "[]").first();
export const mkAnggotaCari = (env, mkId, akunId) => env.DB.prepare("SELECT id, status, jalur FROM mk_anggota WHERE mk_id = ? AND tabel = 'instansi_akun' AND akun_id = ?").bind(mkId, akunId).first();
export const mkMenungguHitung = async (env, mkId) => (await env.DB.prepare("SELECT count(*) n FROM mk_anggota WHERE mk_id = ? AND status = 'menunggu'").bind(mkId).first()).n;
/* satu baris per (mk_id, akun): baru, atau menunggu yang naik jadi aktif. Aktif dan dicabut tidak pernah ditimpa di sini. undangId: undangan itu ikut menjadi diterima. */
export const mkAnggotaTulis = async (env, id, mkId, akunId, status, jalur, rujukan, oleh, undangId, kini) => {
  const st = [env.DB.prepare(`INSERT INTO mk_anggota (id, mk_id, tabel, akun_id, status, jalur, rujukan, oleh, dibuat, diubah) VALUES (?1, ?2, 'instansi_akun', ?3, ?4, ?5, ?6, ?7, ?8, ?8)
    ON CONFLICT (mk_id, tabel, akun_id) DO UPDATE SET status = excluded.status, jalur = excluded.jalur, rujukan = excluded.rujukan, oleh = excluded.oleh, diubah = excluded.diubah WHERE mk_anggota.status = 'menunggu' AND excluded.status = 'aktif'`)
    .bind(id, mkId, akunId, status, jalur, rujukan, oleh ?? null, kini)];
  if (undangId) st.push(env.DB.prepare("UPDATE mk_undang SET status = 'diterima' WHERE id = ? AND status = 'terkirim'").bind(undangId));
  await env.DB.batch(st);
  return mkAnggotaCari(env, mkId, akunId);
};
/* saat kode sah: semua undangan berlaku untuk nomor itu ke akun aktif menjadi anggota aktif (jalur undang), lalu ditandai diterima bila anggotanya aktif */
export const mkUndangTerima = (env, mkId, nomor, kini) => env.DB.batch([
  env.DB.prepare(`INSERT INTO mk_anggota (id, mk_id, tabel, akun_id, status, jalur, rujukan, oleh, dibuat, diubah)
    SELECT lower(hex(randomblob(8))), ?1, 'instansi_akun', u.akun_id, 'aktif', 'undang', 'undang:' || u.id, u.oleh_tabel || ':' || u.oleh_id, ?3, ?3
    FROM mk_undang u JOIN instansi_akun x ON x.id = u.akun_id AND x.status = 'aktif' AND x.dummy = 0
    WHERE u.wa = ?2 AND u.status = 'terkirim' AND u.tabel = 'instansi_akun' AND u.habis > ?3 AND ${UNDANG_BERHAK}
    ON CONFLICT (mk_id, tabel, akun_id) DO UPDATE SET status = 'aktif', jalur = 'undang', rujukan = excluded.rujukan, oleh = excluded.oleh, diubah = excluded.diubah WHERE mk_anggota.status = 'menunggu'`).bind(mkId, nomor, kini),
  env.DB.prepare(`UPDATE mk_undang SET status = 'diterima' WHERE wa = ?1 AND status = 'terkirim' AND tabel = 'instansi_akun' AND habis > ?2
    AND EXISTS (SELECT 1 FROM mk_anggota g WHERE g.mk_id = ?3 AND g.tabel = 'instansi_akun' AND g.akun_id = mk_undang.akun_id AND g.status = 'aktif' AND g.rujukan = 'undang:' || mk_undang.id)`).bind(nomor, kini, mkId)]);
/* tanda antrean tinjau: nomor yang pernah dibuktikan lewat kode (punya mk_akun) dan kontak pemangku aktif bernomor itu */
export const mkTandaNomor = async (env, daftar, kini = Date.now()) => {
  const j = JSON.stringify([...new Set(daftar.filter(Boolean))]);
  const [a, k, d] = (await env.DB.batch([
    env.DB.prepare("SELECT wa FROM mk_akun WHERE wa IN (SELECT value FROM json_each(?1))").bind(j),
    env.DB.prepare("SELECT wa, kategori, prov, kab FROM kontak_pemangku WHERE wa IN (SELECT value FROM json_each(?1)) AND status = 'aktif'").bind(j),
    env.DB.prepare("SELECT wa FROM mk_undang WHERE wa IN (SELECT value FROM json_each(?1)) AND status = 'terkirim' AND tabel = 'pdt_akun' AND habis > ?2").bind(j, kini)])).map(x => x.results);
  return {terbukti: new Set(a.map(r => r.wa)), kontak: k, diundang: new Set(d.map(r => r.wa))};
};
export const mkWaKampus = async (env, ids) => (await env.DB.prepare("SELECT institusi_id, wa FROM km_akun WHERE institusi_id IN (SELECT value FROM json_each(?1)) AND dummy = 0").bind(JSON.stringify(ids)).all()).results;
/* antrean anggota menunggu (admin dan staf) dan daftar anggota satu akun (pemilik dan admin) */
/* hak disaring DI SQL sebelum LIMIT: semua = admin atau staf nasional; nomor = pemilik nomor akun (akun aktif); wilayah = JSON kode provinsi staf berwilayah */
export const mkAnggotaMenunggu = async (env, maks, semua, nomor, wilayah, akunId = "") => (await env.DB.prepare(`SELECT g.id, g.dibuat, u.nama, u.wa, x.id akun_id, x.jenis, x.tingkat, x.wilayah, x.prov, x.kab, x.cakupan, x.status akun_status
  FROM mk_anggota g JOIN mk_akun u ON u.id = g.mk_id JOIN instansi_akun x ON x.id = g.akun_id WHERE g.status = 'menunggu' AND g.tabel = 'instansi_akun'
  AND (?2 = 1 OR (?3 <> '' AND x.wa = ?3 AND x.status = 'aktif') OR (?4 <> '[]' AND EXISTS (SELECT 1 FROM json_each(x.cakupan) WHERE json_each.value IN (SELECT value FROM json_each(?4))))) AND (?5 = '' OR x.id = ?5) ORDER BY g.dibuat LIMIT ?1`).bind(maks, semua ? 1 : 0, nomor ?? "", wilayah ?? "[]", akunId).all()).results;
export const mkAnggotaAkun = async (env, akunId, maks) => (await env.DB.prepare(`SELECT g.id, g.status, g.jalur, g.dibuat, u.nama, u.wa, u.terakhir_masuk FROM mk_anggota g JOIN mk_akun u ON u.id = g.mk_id
  WHERE g.tabel = 'instansi_akun' AND g.akun_id = ?1 AND g.status <> 'dicabut' ORDER BY g.dibuat DESC LIMIT ?2`).bind(akunId, maks).all()).results;
export const mkAnggotaById = (env, id) => env.DB.prepare("SELECT g.id, g.status, g.mk_id, g.akun_id, x.cakupan, x.wa akun_wa, x.status akun_status FROM mk_anggota g JOIN instansi_akun x ON x.id = g.akun_id WHERE g.id = ?").bind(id).first();
export const mkAnggotaSetujui = async (env, id, oleh, kini) => (await env.DB.prepare("UPDATE mk_anggota SET status = 'aktif', jalur = 'tinjau', rujukan = ?2, oleh = ?2, diubah = ?3 WHERE id = ?1 AND status = 'menunggu'").bind(id, oleh, kini).run()).meta.changes === 1;
export const mkAnggotaCabut = async (env, id, oleh, kini) => (await env.DB.prepare("UPDATE mk_anggota SET status = 'dicabut', rujukan = ?2, oleh = ?2, diubah = ?3 WHERE id = ?1 AND status IN ('aktif', 'menunggu')").bind(id, oleh, kini).run()).meta.changes === 1;
export const mkCabutSesiAkun = (env, akunId) => env.DB.prepare("DELETE FROM instansi_sesi WHERE akun_id = ?").bind(akunId).run();   // semua sesi akun instansi itu, siapa pun pemegangnya (sesi modul tidak mencatat orang)
/* akun instansi yang boleh diundangkan seseorang: yang nomornya = nomor sesi (pemilik) dan yang ia anggota aktifnya */
export const mkAkunSaya = async (env, mkId, nomor, maks) => {
  const [a, b] = (await env.DB.batch([
    env.DB.prepare("SELECT id, jenis, tingkat, wilayah, prov, kab, cakupan, 1 pemilik FROM instansi_akun WHERE wa = ?1 AND status = 'aktif' AND dummy = 0 AND jenis NOT IN ('pemprov', 'pemkab', 'pemkot') LIMIT ?2").bind(nomor, maks),
    env.DB.prepare(`SELECT x.id, x.jenis, x.tingkat, x.wilayah, x.prov, x.kab, x.cakupan, 0 pemilik FROM mk_anggota g JOIN instansi_akun x ON x.id = g.akun_id AND x.status = 'aktif' AND x.dummy = 0 AND x.jenis NOT IN ('pemprov', 'pemkab', 'pemkot')
      WHERE g.mk_id = ?1 AND g.tabel = 'instansi_akun' AND g.status = 'aktif' LIMIT ?2`).bind(mkId, maks)])).map(x => x.results);
  const ada = new Set(a.map(x => x.id));
  return [...a, ...b.filter(x => !ada.has(x.id))];
};
/* undangan */
export const mkUndangHitung = async (env, olehTabel, olehId, sejak, kini) => {
  const [h, t] = (await env.DB.batch([
    env.DB.prepare("SELECT count(*) n FROM mk_undang WHERE oleh_tabel = ?1 AND oleh_id = ?2 AND dibuat > ?3").bind(olehTabel, olehId, sejak),
    env.DB.prepare("SELECT count(*) n FROM mk_undang WHERE oleh_tabel = ?1 AND oleh_id = ?2 AND status = 'terkirim' AND habis > ?3").bind(olehTabel, olehId, kini)])).map(x => x.results[0].n);
  return {harian: h, terbuka: t};
};
export const mkSudahAnggota = async (env, nomor, akunId) => !!(await env.DB.prepare(`SELECT 1 x FROM mk_akun u JOIN mk_anggota g ON g.mk_id = u.id AND g.tabel = 'instansi_akun' AND g.akun_id = ?2 AND g.status = 'aktif' WHERE u.wa = ?1
  UNION ALL SELECT 1 FROM instansi_akun WHERE id = ?2 AND wa = ?1 LIMIT 1`).bind(nomor, akunId).first());
/* undangan yang dicabut tidak dihitung: pengirim yang mengirim lalu mencabut tidak bisa menutup undangan sah ke nomor itu */
export const mkUndangNomorHitung = async (env, nomor, sejak) => (await env.DB.prepare("SELECT count(*) n FROM mk_undang WHERE wa = ?1 AND dibuat > ?2 AND status IN ('terkirim', 'diterima')").bind(nomor, sejak).first()).n;
/* pengundang kehilangan hak atas satu akun: undangannya yang masih terkirim ke akun itu dicabut */
export const mkUndangCabutOleh = (env, olehTabel, olehId, akunId) => env.DB.prepare("UPDATE mk_undang SET status = 'dicabut' WHERE oleh_tabel = ?1 AND oleh_id = ?2 AND tabel = 'instansi_akun' AND akun_id = ?3 AND status = 'terkirim'").bind(olehTabel, olehId, akunId).run();
export const mkUndangAda = (env, nomor, tabel, akunId, kini) => env.DB.prepare("SELECT id FROM mk_undang WHERE wa = ?1 AND status = 'terkirim' AND tabel = ?2 AND akun_id IS ?3 AND habis > ?4 LIMIT 1").bind(nomor, tabel, akunId, kini).first();
/* undangan dan pesan WA dalam satu batch; id sama dipakai kedua baris */
export const mkUndangBaru = (env, u, pesan, kini) => env.DB.batch([
  env.DB.prepare("INSERT INTO mk_undang (id, wa, nama, tabel, akun_id, oleh_tabel, oleh_id, status, dibuat, habis) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 'terkirim', ?8, ?9)").bind(u.id, u.wa, u.nama ?? null, u.tabel, u.akun_id ?? null, u.oleh_tabel, u.oleh_id, kini, kini + u.umur),
  stmtAntreWa(env, {id: u.id, tujuan: u.wa, pesan, jenis: "undang", rujukan: u.id, kini})]);
/* olehTabel/olehId (opsional): anggota biasa hanya melihat kirimannya sendiri, disaring di SQL sebelum LIMIT */
export const mkUndangDaftar = async (env, tabel, akunId, maks, olehTabel = null, olehId = null) => (await env.DB.prepare("SELECT id, wa, nama, status, dibuat, habis, oleh_tabel, oleh_id FROM mk_undang WHERE tabel = ?1 AND akun_id IS ?2 AND status <> 'dicabut' AND (?4 IS NULL OR (oleh_tabel = ?4 AND oleh_id = ?5)) ORDER BY dibuat DESC LIMIT ?3").bind(tabel, akunId, maks, olehTabel, olehId).all()).results;
export const mkUndangById = (env, id) => env.DB.prepare("SELECT id, tabel, akun_id, oleh_tabel, oleh_id, status FROM mk_undang WHERE id = ?").bind(id).first();
export const mkUndangCabut = async (env, id) => (await env.DB.prepare("UPDATE mk_undang SET status = 'dicabut' WHERE id = ? AND status = 'terkirim'").bind(id).run()).meta.changes === 1;
export const mkKontakById = (env, id) => env.DB.prepare("SELECT id, nama, wa, kategori, prov, kab FROM kontak_pemangku WHERE id = ? AND status = 'aktif'").bind(id).first();
/* domain email terpetakan: kandidat = tiap akhiran berbatas titik dari domain surel; yang cocok harus dipetakan ke akun itu */
export const mkDomainCocok = async (env, kandidat, akunId) => (await env.DB.prepare("SELECT domain FROM mk_domain WHERE domain IN (SELECT value FROM json_each(?1)) AND tabel = 'instansi_akun' AND akun_id = ?2 LIMIT 1").bind(JSON.stringify(kandidat), akunId).first())?.domain ?? null;
export const mkDomainTulis = (env, domain, akunId, oleh, kini) => env.DB.prepare("INSERT INTO mk_domain (domain, tabel, akun_id, oleh, dibuat) VALUES (?, 'instansi_akun', ?, ?, ?) ON CONFLICT DO NOTHING").bind(domain, akunId, oleh, kini).run();
export const mkDomainHapus = async (env, domain, akunId) => (await env.DB.prepare("DELETE FROM mk_domain WHERE domain = ? AND tabel = 'instansi_akun' AND akun_id = ?").bind(domain, akunId).run()).meta.changes === 1;
export const mkKodeEmailBaru = (env, id, nsha, kodeSha, kini, habis) => env.DB.prepare("INSERT INTO mk_kode (id, nomor_sha, kode_sha, saluran, coba, dibuat, habis) VALUES (?, ?, ?, 'email', 0, ?, ?)").bind(id, nsha, kodeSha, kini, habis).run();
/* papan aktivasi: lima kueri berkelompok (bukan per baris); kunci hasil = "<prov>|<kab>" */
export const mkPapanHitung = async (env, kini, jendelaLog, kategori) => {
  const [a, g, t, u, k] = (await env.DB.batch([
    env.DB.prepare("SELECT prov, kab, count(*) n FROM instansi_akun WHERE tingkat = 'kab' AND status = 'aktif' AND dummy = 0 GROUP BY prov, kab"),
    env.DB.prepare("SELECT x.prov, x.kab, count(*) n FROM mk_anggota g JOIN instansi_akun x ON x.id = g.akun_id WHERE g.tabel = 'instansi_akun' AND g.status = 'aktif' AND x.tingkat = 'kab' AND x.status = 'aktif' GROUP BY x.prov, x.kab"),
    env.DB.prepare("SELECT x.prov, x.kab, max(l.waktu) n FROM mk_masuk_log l JOIN instansi_akun x ON x.id = l.akun_id WHERE l.tabel = 'instansi_akun' AND l.waktu > ?1 AND x.tingkat = 'kab' GROUP BY x.prov, x.kab").bind(kini - jendelaLog),
    env.DB.prepare("SELECT x.prov, x.kab, sum(u.status = 'terkirim' AND u.habis > ?1) terkirim, sum(u.status = 'diterima') diterima FROM mk_undang u JOIN instansi_akun x ON x.id = u.akun_id WHERE u.tabel = 'instansi_akun' AND x.tingkat = 'kab' GROUP BY x.prov, x.kab").bind(kini),
    env.DB.prepare(`SELECT k.prov, k.kab, count(*) n FROM kontak_pemangku k WHERE k.status = 'aktif' AND k.kab IS NOT NULL AND k.wa IS NOT NULL AND k.kategori IN (SELECT value FROM json_each(?1))
      AND NOT EXISTS (SELECT 1 FROM mk_akun w JOIN mk_anggota m ON m.mk_id = w.id AND m.tabel = 'instansi_akun' AND m.status = 'aktif' WHERE w.wa = k.wa)
      AND NOT EXISTS (SELECT 1 FROM instansi_akun y WHERE y.wa = k.wa AND y.status = 'aktif' AND y.dummy = 0) GROUP BY k.prov, k.kab`).bind(JSON.stringify(kategori))])).map(x => x.results);
  return {akun: a, anggota: g, terakhir: t, undangan: u, kontak: k};
};
export const mkPapanRinci = async (env, prov, kab, kategori, maks) => {
  const [k, a] = (await env.DB.batch([
    env.DB.prepare(`SELECT k.id, k.nama, k.jabatan, k.kategori, k.wa FROM kontak_pemangku k WHERE k.status = 'aktif' AND k.prov = ?1 AND k.kab = ?2 AND k.wa IS NOT NULL AND k.kategori IN (SELECT value FROM json_each(?3))
      AND NOT EXISTS (SELECT 1 FROM mk_akun w JOIN mk_anggota m ON m.mk_id = w.id AND m.tabel = 'instansi_akun' AND m.status = 'aktif' WHERE w.wa = k.wa)
      AND NOT EXISTS (SELECT 1 FROM instansi_akun y WHERE y.wa = k.wa AND y.status = 'aktif' AND y.dummy = 0) ORDER BY k.nama LIMIT ?4`).bind(prov, kab, JSON.stringify(kategori), maks),
    env.DB.prepare("SELECT id, jenis, wilayah FROM instansi_akun WHERE tingkat = 'kab' AND prov = ?1 AND kab = ?2 AND status = 'aktif' AND dummy = 0").bind(prov, kab)])).map(x => x.results);
  return {kontak: k, akun: a};
};

/* PM-13 sampai PM-16 (data/kajian-bnpb/pintu-masuk/: ALGORITMA §2.4, §6, §7; ALUR A7, A8, A10). Tabel akun lama hanya ditulis modul pemiliknya lewat fungsi ini (G-7). */
/* sandi baru satu akun peran; true bila akun aktif dan baris berubah. Hanya kolom sandi, penanda kunci, dan sesi; kolom status tidak pernah ditulis. Sesi akun itu dicabut semua. Hash sudah dihitung modul pemilik (format hash aturan modulnya). */
const tanpaTabel = e => /no such table/i.test(String(e?.message || e));
export const sandiPeranTulis = async (env, jenis, id, garam, hash, kini) => {
  const st = {
    instansi: [env.DB.prepare("UPDATE instansi_akun SET garam = ?2, sandi_sha = ?3, wajib_ganti = 0 WHERE id = ?1 AND status = 'aktif' AND dummy = 0").bind(id, garam, hash),
      env.DB.prepare("INSERT INTO instansi_jejak (waktu, oleh, akun_id, aksi, alasan) SELECT ?2, 'pengguna', ?1, 'ganti_sandi', 'lewat kode WA' WHERE changes() > 0").bind(id, kini),
      env.DB.prepare("DELETE FROM instansi_sesi WHERE akun_id = ?1").bind(id)],
    pendataan: [env.DB.prepare("UPDATE pdt_akun SET garam = ?2, sandi_hash = ?3, wajib_ganti = 0 WHERE id = ?1 AND status = 'aktif' AND dummy = 0").bind(id, garam, hash),
      env.DB.prepare("DELETE FROM pdt_sesi WHERE akun_id = ?1").bind(id)],
    kemitraan: [env.DB.prepare("UPDATE km_akun SET garam = ?2, sandi_sha = ?3, atur_sha = NULL, atur_sampai = NULL, gagal = 0, kunci_sampai = NULL, diubah = ?4 WHERE id = ?1 AND status = 'aktif' AND dummy = 0").bind(id, garam, hash, kini),
      env.DB.prepare("INSERT INTO km_jejak (tabel, baris, aksi, oleh, waktu) SELECT 'km_akun', ?1, 'atur_sandi', 'kode:' || ?1, ?2 WHERE changes() > 0").bind(id, kini),
      env.DB.prepare("DELETE FROM km_sesi WHERE akun_id = ?1").bind(id)]}[jenis];
  const ok = (await env.DB.batch(st))[0].meta.changes === 1;
  if (ok && jenis === "instansi") await env.DB.prepare("DELETE FROM push_langganan WHERE akun_id = ?").bind(id).run().catch(e => { if (!tanpaTabel(e)) throw e; });   // perangkat lain tidak boleh tetap menerima push
  return ok;
};
/* bukti ulang 180 hari: anggota aktif yang terakhir masuk ke akun itu (mk_masuk_log; belum pernah = dari `dibuat`) sebelum `batas`. Indeks mk_masuk_log_akun, mk_anggota (mk_id, tabel, akun_id) */
export const mkAnggotaLama = async (env, mkId, batas) => (await env.DB.prepare(`SELECT g.id, x.jenis, x.tingkat, x.prov, x.kab, x.cakupan FROM mk_anggota g JOIN instansi_akun x ON x.id = g.akun_id
  WHERE g.mk_id = ?1 AND g.tabel = 'instansi_akun' AND g.status = 'aktif'
  AND coalesce((SELECT max(l.waktu) FROM mk_masuk_log l WHERE l.mk_id = g.mk_id AND l.tabel = 'instansi_akun' AND l.akun_id = g.akun_id), g.dibuat) < ?2`).bind(mkId, batas).all()).results;
export const mkAnggotaMenungguMilik = async (env, mkId) => (await env.DB.prepare("SELECT x.wilayah FROM mk_anggota g JOIN instansi_akun x ON x.id = g.akun_id WHERE g.mk_id = ?1 AND g.tabel = 'instansi_akun' AND g.status = 'menunggu' LIMIT 5").bind(mkId).all()).results;
export const mkAnggotaTurun = async (env, id, kini) => (await env.DB.prepare("UPDATE mk_anggota SET status = 'menunggu', jalur = 'tinjau', rujukan = 'ulang', oleh = NULL, diubah = ?2 WHERE id = ?1 AND status = 'aktif'").bind(id, kini).run()).meta.changes === 1;
/* hapus akun umum: keanggotaan, sesi, penanda penulis alun-alun, undangan terkirim buatannya (beserta pesan antreannya). Kiriman alun-alun dan mk_masuk_log tetap. Eksplisit, tanpa mengandalkan CASCADE. */
export const mkHapusAkun = async (env, id) => {
  await env.DB.batch([
    env.DB.prepare("DELETE FROM wa_antre WHERE jenis = 'undang' AND status = 'antre' AND rujukan IN (SELECT id FROM mk_undang WHERE oleh_tabel = 'mk_akun' AND oleh_id = ?1 AND status = 'terkirim')").bind(id),
    env.DB.prepare("DELETE FROM mk_undang WHERE oleh_tabel = 'mk_akun' AND oleh_id = ?1 AND status = 'terkirim'").bind(id),
    env.DB.prepare("DELETE FROM mk_anggota WHERE mk_id = ?1").bind(id), env.DB.prepare("DELETE FROM mk_sesi WHERE mk_id = ?1").bind(id),
    env.DB.prepare("DELETE FROM mk_akun WHERE id = ?1").bind(id)]);
  await env.DB.prepare("DELETE FROM alun_penulis WHERE mk_id = ?1").bind(id).run().catch(e => { if (!tanpaTabel(e)) throw e; });
};
/* cookie sesi_masuk milik akun yang diblokir: alun-alun tidak boleh menulis sebagai akun */
export const mkSesiDiblokir = async (env, tokenSha, kini) => !!(await env.DB.prepare("SELECT 1 x FROM mk_sesi s JOIN mk_akun a ON a.id = s.mk_id WHERE s.token_sha = ? AND s.habis > ? AND a.status <> 'aktif'").bind(tokenSha, kini).first());
/* kode lewat email (ALGORITMA §2.4): alamat (huruf kecil) sama dengan kolom email akun peran AKTIF yang wa-nya nomor itu. Satu kueri untuk semua permintaan; tiap cabang lewat indeks wa. */
export const mkEmailAkunCocok = async (env, nomor, email) => (await env.DB.prepare(`SELECT 'instansi_akun' tabel, id FROM instansi_akun WHERE wa = ?1 AND lower(email) = ?2 AND status = 'aktif' AND dummy = 0
  UNION ALL SELECT 'pdt_akun', id FROM pdt_akun WHERE wa = ?1 AND lower(email) = ?2 AND status = 'aktif' AND dummy = 0
  UNION ALL SELECT 'km_akun', id FROM km_akun WHERE wa = ?1 AND lower(email) = ?2 AND status = 'aktif' AND dummy = 0
  UNION ALL SELECT 'staf', id FROM staf WHERE wa = ?1 AND lower(email) = ?2 AND status = 'aktif' AND dummy = 0 LIMIT 10`).bind(nomor, email).all()).results;
/* kode email + ikatannya ke akun yang cocok dalam satu batch (D21); akun kosong = baris kode yang sudah hangus tanpa ikatan (jawaban dan kerja DB sama untuk alamat tak cocok) */
export const mkKodeEmailAkun = (env, id, nsha, kodeSha, kini, habis, akun) => env.DB.batch([
  env.DB.prepare("INSERT INTO mk_kode (id, nomor_sha, kode_sha, saluran, coba, dibuat, habis) VALUES (?, ?, ?, 'email', 0, ?, ?)").bind(id, nsha, kodeSha, kini, habis),
  ...akun.map(a => env.DB.prepare("INSERT INTO mk_kode_akun (kode_id, tabel, akun_id) VALUES (?, ?, ?)").bind(id, a.tabel, a.id))]);
/* akun yang diikat satu kode email; baris dibuang saat dibaca (kode sekali pakai) */
export const mkKodeAkunAmbil = async (env, kodeId) => (await env.DB.batch([env.DB.prepare("SELECT tabel, akun_id FROM mk_kode_akun WHERE kode_id = ?1 ORDER BY tabel, akun_id").bind(kodeId),
  env.DB.prepare("DELETE FROM mk_kode_akun WHERE kode_id = ?1").bind(kodeId)]))[0].results;
/* PM-15 alun-alun mengenali akun: baris penulis per pos (utas atau balasan); tabel belum ada = tanpa tanda */
export const alunPenulisTulis = async (env, posId, mkId, label) => {
  try { await env.DB.prepare("INSERT OR IGNORE INTO alun_penulis (pos_id, mk_id, label) VALUES (?, ?, ?)").bind(posId, mkId, label).run(); return true; }
  catch (e) { if (tanpaTabel(e)) return false; throw e; }
};
/* pos dari akun yang terhubung ke lebih dari satu lembaga tampil terverifikasi dengan label NULL: memang maksudnya (G3), label hanya untuk tepat satu lembaga */
export const alunPenulisBaca = async (env, ids) => {
  if (!ids.length) return new Map();
  try { return new Map((await env.DB.prepare("SELECT pos_id, label FROM alun_penulis WHERE pos_id IN (SELECT value FROM json_each(?))").bind(JSON.stringify(ids)).all()).results.map(r => [r.pos_id, r.label])); }
  catch (e) { if (tanpaTabel(e)) return new Map(); throw e; }
};

/* Paritas bencana PB-21 (D13, DESAIN-TEKNIS 3.4): peringatan jenis baru di tabel samping peringatan_x (migrasi 0137); `peringatan` lama tidak disentuh.
   Tanpa migrasi 0137: tulis dilewati (null), baca hanya tabel lama, jalur jenis lama tidak terganggu. */
export const JENIS_PERINGATAN_X = ["gunungapi", "udara", "kekeringan", "pesisir", "longsor", "rob"];
const tanpaPx = e => /no such table: (main\.)?peringatan_x/i.test(String(e?.message || e));
const KOLOM_PX = ["kunci", "jenis", "tingkat", "prov", "kab", "lat", "lon", "judul", "teks", "sumber", "sumber_url", "dibuat", "berlaku_hingga"];
export const stmtPeringatanXMasuk = env => env.DB.prepare("INSERT OR IGNORE INTO peringatan_x (" + KOLOM_PX + ") VALUES (" + KOLOM_PX.map(() => "?") + ")");
/* satu baris (array urut KOLOM_PX); true = masuk, false = duplikat, null = tabel belum ada. CHECK melanggar = melempar (pemanggil melewati satu baris). */
export const peringatanXTulis = async (env, nilai) => {
  try { return (await stmtPeringatanXMasuk(env).bind(...nilai).run()).meta.changes > 0; }
  catch (e) { if (tanpaPx(e)) return null; throw e; }
};
const SAH_PX = "berlaku_hingga > ?1 AND dicabut IS NULL AND dibuat >= ?2";
const CAB = t => `SELECT * FROM (SELECT * FROM ${t} WHERE ${SAH_PX} ORDER BY dibuat DESC LIMIT ?3)`;
/* UNION ALL kedua tabel, tiap cabang LIMIT sendiri lalu urut dibuat DESC dan LIMIT di luar; hitung = tambah COUNT per tingkat per cabang (dijumlah pemanggil) */
export const peringatanAktifGabung = async (env, kini, sejak, batas, hitung = false) => {
  const cnt = t => env.DB.prepare(`SELECT tingkat, count(*) n FROM ${t} WHERE ${SAH_PX} GROUP BY tingkat`).bind(kini, sejak);
  const gab = env.DB.prepare(`SELECT * FROM (${CAB("peringatan")} UNION ALL ${CAB("peringatan_x")}) ORDER BY dibuat DESC LIMIT ?3`).bind(kini, sejak, batas);
  const lama = env.DB.prepare(`${CAB("peringatan")} ORDER BY dibuat DESC`).bind(kini, sejak, batas);
  try {
    const [r, ...c] = await env.DB.batch([gab, ...(hitung ? [cnt("peringatan"), cnt("peringatan_x")] : [])]);
    return {daftar: r.results, hitungan: c.flatMap(x => x.results)};
  } catch (e) {
    if (!tanpaPx(e)) throw e;
    const [r, ...c] = await env.DB.batch([lama, ...(hitung ? [cnt("peringatan")] : [])]);
    return {daftar: r.results, hitungan: c.flatMap(x => x.results)};
  }
};
export const peringatanXBersih = async (env, batas) => {
  try { await env.DB.prepare("DELETE FROM peringatan_x WHERE berlaku_hingga <= ?").bind(batas).run(); }
  catch (e) { if (!tanpaPx(e)) throw e; }
};
/* cabut di tabel samping; null = tabel belum ada, 0 = tak ada baris aktif, 1 = tercabut, -1 = sudah tercabut sebelumnya */
export const peringatanXCabut = async (env, kunci, kini, oleh) => {
  try {
    const r = await env.DB.prepare("UPDATE peringatan_x SET dicabut = ?, dicabut_oleh = ? WHERE kunci = ? AND dicabut IS NULL").bind(kini, oleh, kunci).run();
    if (r.meta.changes) return 1;
    return (await env.DB.prepare("SELECT 1 x FROM peringatan_x WHERE kunci = ?").bind(kunci).first()) ? -1 : 0;
  } catch (e) { if (tanpaPx(e)) return null; throw e; }
};

/* ======================================================================================================================================================
   PB-16 hasil tindakan dan kepatuhan renlap (pb_renlap_hasil, migrasi 0130; DESAIN-TEKNIS paritas-bencana 3.2, 5). Upsert satu baris per (renlap, target); tanpa hapus.
   Kepatuhan = didatangi / jml_target renlap berstatus terbit atau selesai; dilaporkan per bencana, wilayah, alasan, TIDAK per pengisi (kolom oleh tidak pernah dibaca).
   Hanya versi terbaru berstatus terbit/selesai per (bencana, prov, kab, tanggal) dihitung. Kueri lewat indeks pb_renlap_tanggal lalu PK pb_renlap_hasil (SEARCH). */
Object.assign(MATRIKS, {pb_renlap_hasil: {pb_baca: ["baca"], pb_tulis: ["baca", "tambah", "ubah"]}});
export const PB_SQL_HASIL = {
  upsert: `INSERT INTO pb_renlap_hasil (renlap_id, target_no, didatangi, alasan, hasil, catatan, oleh, waktu) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
    ON CONFLICT (renlap_id, target_no) DO UPDATE SET didatangi = excluded.didatangi, alasan = excluded.alasan, hasil = excluded.hasil, catatan = excluded.catatan, oleh = excluded.oleh, waktu = excluded.waktu`,
  renlap: "SELECT count(*) renlap, coalesce(sum(r.jml_target), 0) target FROM pb_renlap r WHERE r.tanggal BETWEEN ?1 AND ?2 AND r.bencana = ?3 AND (?4 = '' OR r.prov = ?4) AND r.status IN ('terbit','selesai') AND NOT EXISTS (SELECT 1 FROM pb_renlap n WHERE n.bencana = r.bencana AND n.prov = r.prov AND n.kab = r.kab AND n.tanggal = r.tanggal AND n.versi > r.versi AND n.status IN ('terbit','selesai'))",
  rinci: `SELECT h.didatangi, h.alasan, count(*) n FROM pb_renlap r JOIN pb_renlap_hasil h ON h.renlap_id = r.id
    WHERE r.tanggal BETWEEN ?1 AND ?2 AND r.bencana = ?3 AND (?4 = '' OR r.prov = ?4) AND r.status IN ('terbit','selesai') AND NOT EXISTS (SELECT 1 FROM pb_renlap n WHERE n.bencana = r.bencana AND n.prov = r.prov AND n.kab = r.kab AND n.tanggal = r.tanggal AND n.versi > r.versi AND n.status IN ('terbit','selesai')) GROUP BY h.didatangi, h.alasan`,
};
export const pbStmtHasil = (env, p, id, b, oleh, kini) => sedia(env, p, "pb_renlap_hasil", "tambah", PB_SQL_HASIL.upsert).bind(id, b.target_no, b.didatangi, b.alasan, b.hasil, b.catatan, oleh, kini);
/* Tindakan per target (pb_renlap_tindakan, migrasi 0153; tindakan-operasi D5, D6): hapus set per (renlap, target) lalu sisip satu kode. per_tindakan memakai saringan versi terbaru yang sama dengan rinci. */
Object.assign(MATRIKS, {pb_renlap_tindakan: {pb_baca: ["baca"], pb_tulis: ["baca", "tambah", "hapus"]}});
PB_SQL_HASIL.tindakanHapus = "DELETE FROM pb_renlap_tindakan WHERE renlap_id = ?1 AND target_no IN (SELECT value FROM json_each(?2))";
PB_SQL_HASIL.tindakanSisip = "INSERT INTO pb_renlap_tindakan (renlap_id, target_no, tindakan, oleh, waktu) SELECT ?1, json_extract(value, '$[0]'), json_extract(value, '$[1]'), ?3, ?4 FROM json_each(?2)";
PB_SQL_HASIL.perTindakan = PB_SQL_HASIL.rinci.replace("SELECT h.didatangi, h.alasan, count(*) n FROM pb_renlap r JOIN pb_renlap_hasil h", "SELECT h.tindakan, count(*) n FROM pb_renlap r JOIN pb_renlap_tindakan h").replace("GROUP BY h.didatangi, h.alasan", "GROUP BY h.tindakan");
/* dua pernyataan per permintaan: nomor = daftar target_no bertindakan, pasangan = [[target_no, kode], ...] (batas kueri D1 per pemanggilan) */
export const pbStmtTindakanHapus = (env, p, id, nomor) => sedia(env, p, "pb_renlap_tindakan", "hapus", PB_SQL_HASIL.tindakanHapus).bind(id, JSON.stringify(nomor));
export const pbStmtTindakanSisip = (env, p, id, pasangan, oleh, kini) => sedia(env, p, "pb_renlap_tindakan", "tambah", PB_SQL_HASIL.tindakanSisip).bind(id, JSON.stringify(pasangan), oleh, kini);
export const pbTindakanRekap = async (env, p, dari, sampai, bencana, prov) => Object.fromEntries((await sedia(env, p, "pb_renlap_tindakan", "baca", PB_SQL_HASIL.perTindakan).bind(dari, sampai, bencana, prov).all()).results.map(x => [x.tindakan, x.n]));
export const pbKepatuhan = async (env, p, dari, sampai, bencana, prov) => {
  const [a, b] = await env.DB.batch([sedia(env, p, "pb_renlap_hasil", "baca", PB_SQL_HASIL.renlap).bind(dari, sampai, bencana, prov), sedia(env, p, "pb_renlap_hasil", "baca", PB_SQL_HASIL.rinci).bind(dari, sampai, bencana, prov)]);
  return {renlap: a.results[0].renlap, target: a.results[0].target, rinci: b.results};
};

/* PB-22 dokumen terbit (pb_dokumen; DESAIN-TEKNIS paritas-bencana 3.3, 6.2). Versi = max+1 dalam SATU INSERT..SELECT (UNIQUE menutup balapan). Beku tidak pernah di-UPDATE lagi (WHERE status = 'draf'). Tanpa DELETE.
   Daftar lewat indeks pb_dokumen_periode (rentang periode), satu lewat PK. Kolom oleh tidak pernah keluar. */
Object.assign(MATRIKS, {pb_dokumen: {pb_baca: ["baca"], pb_tulis: ["baca", "tambah", "ubah"]}});
const KOL_PB_DOK = "id, jenis, bencana, prov, kab, kib, periode, versi, status, ukuran, sha, dibuat, dibekukan";
export const PB_SQL_DOK = {
  rakit: `INSERT INTO pb_dokumen (id, jenis, bencana, prov, kab, kib, periode, versi, status, oleh, dibuat)
    SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7, v, 'draf', ?8, ?9 FROM (SELECT coalesce(max(versi), 0) + 1 v FROM pb_dokumen WHERE jenis = ?2 AND bencana = ?3 AND prov = ?4 AND kab = ?5 AND periode = ?7)`,
  satu: `SELECT ${KOL_PB_DOK} FROM pb_dokumen WHERE id = ?`,
  daftar: `SELECT ${KOL_PB_DOK} FROM pb_dokumen WHERE periode BETWEEN ?3 AND ?4 AND jenis = ?1 AND (?2 = '' OR bencana = ?2) AND (?5 = '' OR prov = ?5) ORDER BY periode DESC, versi DESC LIMIT 200`,
  beku: "UPDATE pb_dokumen SET status = 'beku', ukuran = ?2, sha = ?3, dibekukan = ?4 WHERE id = ?1 AND status = 'draf'",
};
export const pbStmtDokRakit = (env, p, d, oleh, kini) => sedia(env, p, "pb_dokumen", "tambah", PB_SQL_DOK.rakit).bind(d.id, d.jenis, d.bencana, d.prov, d.kab, d.kib, d.periode, oleh, kini);
export const pbDokById = (env, p, id) => sedia(env, p, "pb_dokumen", "baca", PB_SQL_DOK.satu).bind(id).first();
export const pbDokDaftar = async (env, p, jenis, bencana, dari, sampai, prov) => (await sedia(env, p, "pb_dokumen", "baca", PB_SQL_DOK.daftar).bind(jenis, bencana, dari, sampai, prov).all()).results;
export const pbDokBeku = async (env, p, id, ukuran, sha, kini) => (await sedia(env, p, "pb_dokumen", "ubah", PB_SQL_DOK.beku).bind(id, ukuran, sha, kini).run()).meta.changes;

/* PB-28 papan status darurat (F-20; DESAIN-TEKNIS paritas-bencana 6.4). Baca saja dari logbook_sk (0094) + kejadiannya lewat PK; indeks logbook_sk_selesai (0098/0131).
   Dua cabang UNION ALL (tmt_selesai >= hari ini; tmt_selesai IS NULL), keduanya tmt_mulai <= hari ini, supaya OR tidak jadi SCAN. Kolom oleh dan tautan tidak pernah dibaca. */
Object.assign(MATRIKS, {logbook_sk: {pb_baca: ["baca"]}});
export const PB_SQL_PAPAN_SK = `SELECT s.kejadian_id, s.tingkat, s.wilayah, s.nomor, s.tgl_sk, s.tmt_mulai, s.tmt_selesai, s.perpanjangan_ke, k.jenis, k.prov, k.kab
  FROM (SELECT * FROM logbook_sk WHERE tmt_selesai >= ?1 AND tmt_mulai <= ?1 UNION ALL SELECT * FROM logbook_sk WHERE tmt_selesai IS NULL AND tmt_mulai <= ?1) s
  JOIN logbook_kejadian k ON k.id = s.kejadian_id WHERE k.dummy = 0 AND (?2 = '' OR k.jenis = ?2) AND (?3 = '[]' OR k.prov IN (SELECT value FROM json_each(?3))) ORDER BY s.tmt_selesai IS NULL, s.tmt_selesai LIMIT 500`;
/* wilayah = daftar kode prov (JSON); '[]' = nasional. Filter di SQL supaya LIMIT 500 berlaku sesudahnya. */
export const papanSk = async (env, p, tgl, bencana, wilayah) => (await sedia(env, p, "logbook_sk", "baca", PB_SQL_PAPAN_SK).bind(tgl, bencana, JSON.stringify(wilayah)).all()).results;

/* PB-27 tangga tindakan (pb_tindakan, migrasi 0131; DESAIN-TEKNIS paritas-bencana 3.3, 5). Upsert satu baris per (peringatan, butir); tanpa hapus. Semua kueri lewat PK (SEARCH).
   pbPeringatanAktif: peringatan lama lalu tabel samping peringatan_x (0137); tanpa 0137 hanya tabel lama. Kolom oleh tidak pernah dibaca. */
Object.assign(MATRIKS, {pb_tindakan: {pb_baca: ["baca"], pb_tulis: ["baca", "tambah", "ubah"]}});
export const PB_SQL_TINDAKAN = {
  daftar: "SELECT butir, pelaksana, batas, selesai, waktu FROM pb_tindakan WHERE peringatan = ?",
  satu: "SELECT butir, pelaksana, batas, selesai, waktu FROM pb_tindakan WHERE peringatan = ?1 AND butir = ?2",
  upsert: `INSERT INTO pb_tindakan (peringatan, butir, pelaksana, batas, selesai, oleh, waktu) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
    ON CONFLICT (peringatan, butir) DO UPDATE SET pelaksana = excluded.pelaksana, batas = excluded.batas, selesai = excluded.selesai, oleh = excluded.oleh, waktu = excluded.waktu`,
};
export const pbPeringatanAktif = async (env, kunci, kini) => {
  const SQL = t => `SELECT kunci, jenis, tingkat, prov, kab FROM ${t} WHERE kunci = ?1 AND berlaku_hingga > ?2 AND dicabut IS NULL`;
  const a = await env.DB.prepare(SQL("peringatan")).bind(kunci, kini).first(); if (a) return a;
  try { return await env.DB.prepare(SQL("peringatan_x")).bind(kunci, kini).first(); }
  catch (e) { if (tanpaPx(e)) return null; throw e; }
};
export const pbTindakanDaftar = async (env, p, kunci) => (await sedia(env, p, "pb_tindakan", "baca", PB_SQL_TINDAKAN.daftar).bind(kunci).all()).results;
export const pbTindakanSatu = (env, p, kunci, butir) => sedia(env, p, "pb_tindakan", "baca", PB_SQL_TINDAKAN.satu).bind(kunci, butir).first();
export const pbStmtTindakanUpsert = (env, p, kunci, butir, t, oleh, kini) => sedia(env, p, "pb_tindakan", "tambah", PB_SQL_TINDAKAN.upsert).bind(kunci, butir, t.pelaksana, t.batas, t.selesai, oleh, kini);

/* PB-30 GET /api/pb/ringkas (DESAIN-TEKNIS paritas-bencana 6.3, 9). Hitungan murah per bencana, wilayah (JSON kode prov, '[]' = nasional) disaring di SQL, semua SEARCH:
   renlap lewat pb_renlap_tanggal (30 hari), hasil lewat PK renlap_id, tindakan dari peringatan aktif (peringatan_aktif / peringatan_x_aktif) ke PK pb_tindakan. Tanpa kolom oleh. */
const PB_RENLAP_TERBARU = "r.status IN ('terbit','selesai') AND NOT EXISTS (SELECT 1 FROM pb_renlap n WHERE n.bencana = r.bencana AND n.prov = r.prov AND n.kab = r.kab AND n.tanggal = r.tanggal AND n.versi > r.versi AND n.status IN ('terbit','selesai'))";
export const PB_SQL_RINGKAS = {
  renlap: `SELECT r.bencana, count(*) renlap, coalesce(sum(r.tanggal = ?3), 0) hari_ini, coalesce(sum(r.jml_target), 0) target FROM pb_renlap r
    WHERE r.tanggal BETWEEN ?1 AND ?2 AND (?4 = '[]' OR r.prov IN (SELECT value FROM json_each(?4))) AND ${PB_RENLAP_TERBARU} GROUP BY r.bencana LIMIT 500`,
  didatangi: `SELECT r.bencana, count(*) n FROM pb_renlap r INDEXED BY pb_renlap_tanggal CROSS JOIN pb_renlap_hasil h ON h.renlap_id = r.id
    WHERE r.tanggal BETWEEN ?1 AND ?2 AND (?3 = '[]' OR r.prov IN (SELECT value FROM json_each(?3))) AND h.didatangi = 1 AND ${PB_RENLAP_TERBARU} GROUP BY r.bencana LIMIT 500`,
  tindakan: t => `SELECT p.jenis bencana, count(*) n FROM ${t} p CROSS JOIN pb_tindakan x ON x.peringatan = p.kunci
    WHERE p.berlaku_hingga > ?1 AND p.dicabut IS NULL AND x.selesai = 0 AND (?2 = '[]' OR p.prov IN (SELECT value FROM json_each(?2))) GROUP BY p.jenis LIMIT 500`,
};
export const pbRingkasRenlap = async (env, p, dari, sampai, hari, wil) => {
  const [a, b] = await env.DB.batch([sedia(env, p, "pb_renlap", "baca", PB_SQL_RINGKAS.renlap).bind(dari, sampai, hari, JSON.stringify(wil)), sedia(env, p, "pb_renlap_hasil", "baca", PB_SQL_RINGKAS.didatangi).bind(dari, sampai, JSON.stringify(wil))]);
  return {renlap: a.results, didatangi: b.results};
};
export const pbRingkasTindakan = async (env, kini, wil) => {
  const w = JSON.stringify(wil), hasil = (await sedia(env, pelakuPbBaca, "pb_tindakan", "baca", PB_SQL_RINGKAS.tindakan("peringatan")).bind(kini, w).all()).results;
  try { hasil.push(...(await sedia(env, pelakuPbBaca, "pb_tindakan", "baca", PB_SQL_RINGKAS.tindakan("peringatan_x")).bind(kini, w).all()).results); }
  catch (e) { if (!tanpaPx(e)) throw e; }
  return hasil;
};

/* ---------- Status Lifeline (LF-02, LF-03, LF-04; data/kajian-bnpb/lifeline/DESAIN-TEKNIS.md, ALGORITMA.md) ----------
   Hak (siapa boleh menetapkan, Q2) dicek di rute LF-05; di sini hanya pelaku lf_baca / lf_tulis. lf_isyarat = pembacaan isyarat dari tabel modul lain.
   Bukti dari Lapor Warga hanya jumlah dan waktu; ip_hash dipakai di dalam SQL (pelapor berbeda) dan tidak pernah dikembalikan (KEAMANAN-PRIVASI). */
import {BUKTI_SAH as LF_BUKTI_SAH, LABEL_KAB as LF_LABEL_KAB, LAYANAN as LF_LAYANAN, WARNA as LF_WARNA, WARGA as LF_WARGA, TITIK_BASI_HARI as LF_BASI_HARI, usulan as lfUsulan} from "./lifeline_usulan.js";
import {kab4Dari as lfKab4Dari} from "./siklus_kab.js";
export {LF_LAYANAN, LF_WARNA};
Object.assign(MATRIKS, {
  lf_status:  {lf_baca: ["baca"], lf_tulis: ["baca", "tambah", "ubah"]},
  lf_riwayat: {lf_baca: ["baca"], lf_tulis: ["baca", "tambah"]},
  lf_usulan:  {lf_baca: ["baca"], lf_tulis: ["baca", "tambah", "ubah"]},
  lf_isyarat: {lf_baca: ["baca"], lf_tulis: ["baca"]},
});
export const pelakuLfBaca = {peran: "lf_baca"}, pelakuLfTulis = {peran: "lf_tulis"};
const LF_JENDELA_MS = 24 * 36e5, LF_HARI_MS = 864e5, LF_MAKS_BUKTI = 10;
const lfMulaiMs = tgl => Date.parse(tgl + "T00:00:00+07:00");   // kejadian dicatat per tanggal WIB
const LF_JENIS_SQL = Object.values(LF_WARGA).flatMap(w => w.jenis).map(j => `'${j}'`).join(", ");   // konstanta kode, bukan masukan
const LF_JENIS_LAYANAN = Object.fromEntries(Object.entries(LF_WARGA).flatMap(([l, w]) => w.jenis.map(j => [j, l])));

export const LF_SQL = {
  kab: "SELECT kab4, mulai FROM sk_kejadian_kab WHERE kejadian_id = ?1 ORDER BY kab4 LIMIT 600",
  status: "SELECT kab4, layanan, warna, catatan, diubah FROM lf_status WHERE kejadian_id = ?1 LIMIT 5000",
  statusSel: "SELECT kab4, layanan, warna, catatan, oleh, diubah FROM lf_status WHERE kejadian_id = ?1 AND kab4 = ?2 AND layanan = ?3",
  usulan: "SELECT kab4, layanan, warna, alasan, isyarat, dihitung FROM lf_usulan WHERE kejadian_id = ?1 LIMIT 5000",
  usulanSel: "SELECT warna, alasan, isyarat, dihitung FROM lf_usulan WHERE kejadian_id = ?1 AND kab4 = ?2 AND layanan = ?3",
  riwayat: "SELECT id, warna, catatan, bukti, oleh, dibuat FROM lf_riwayat WHERE kejadian_id = ?1 AND kab4 = ?2 AND layanan = ?3 ORDER BY dibuat DESC, id DESC LIMIT 100",
  /* INDEXED BY: tanpa itu planner memilih laporan_aktif (disembunyikan=?) dan memindai semua laporan (dibuktikan uji T10). Migrasi 0142 WAJIB terapan sebelum rute apa pun memanggil ini (LF-05 tidak terbit sebelum LF-11).
     Satu baris per pelapor (ip_hash; kolomnya NOT NULL, jadi tak ada pelapor NULL yang menyatu) per layanan (elpiji digabung ke bbm) per kab: sub dan waktu laporan TERAKHIRnya; ip_hash tinggal di subkueri. */
  warga: `SELECT prov, kab, jenis, sub, t FROM (SELECT w.prov prov, w.kab kab, CASE l.jenis WHEN 'elpiji' THEN 'bbm' ELSE l.jenis END jenis, l.sub sub, max(l.dibuat) t FROM laporan l INDEXED BY laporan_jenis_dibuat JOIN laporan_wilayah w ON w.laporan_id = l.id
    WHERE l.jenis IN (${LF_JENIS_SQL}) AND l.dibuat >= ?1 AND l.disembunyikan = 0 GROUP BY w.prov, w.kab, 3, l.ip_hash) LIMIT 20000`,
  /* kode kendala dan kebutuhan logbook per kab dalam satu provinsi; dilayani logbook_kejadian_kab / logbook_entri_waktu */
  logbook: `SELECT k.kab kab, 'kendala' s, j.value kode, count(*) n, max(e.waktu) t FROM logbook_entri e JOIN logbook_kejadian k ON k.id = e.kejadian_id, json_each(e.kendala) j
    WHERE k.prov = ?1 AND e.waktu >= ?2 AND k.dummy = 0 AND j.value IN ('listrik', 'sinyal', 'akses') GROUP BY k.kab, j.value
    UNION ALL SELECT k.kab, 'kebutuhan', j.value, count(*), max(e.waktu) FROM logbook_entri e JOIN logbook_kejadian k ON k.id = e.kejadian_id, json_each(e.kebutuhan) j
    WHERE k.prov = ?1 AND e.waktu >= ?2 AND k.dummy = 0 AND j.value = 'air_bersih' GROUP BY k.kab, j.value LIMIT 2000`,
  /* kerusakan meja dampak per kab; dilayani meja_catatan_prov_diubah (0142: meja, prov, diubah; kueri tidak menyaring kab) */
  dampak: `SELECT kab, sum(coalesce(json_extract(data, '$.listrik_unit'), 0)) listrik, sum(coalesce(json_extract(data, '$.telekom_unit'), 0)) telekom, sum(coalesce(json_extract(data, '$.air_unit'), 0)) air,
    sum(coalesce(json_extract(data, '$.spbu_unit'), 0)) spbu, sum(coalesce(json_extract(data, '$.jalan_km'), 0) + coalesce(json_extract(data, '$.jembatan_rb'), 0) + coalesce(json_extract(data, '$.jembatan_rs'), 0) + coalesce(json_extract(data, '$.jembatan_rr'), 0)) jalan,
    sum(coalesce(json_extract(data, '$.faskes_rb'), 0) + coalesce(json_extract(data, '$.faskes_rs'), 0) + coalesce(json_extract(data, '$.faskes_rr'), 0) + coalesce(json_extract(data, '$.faskes_terendam'), 0)) faskes, max(diubah) t
    FROM meja_catatan WHERE meja = 'dampak' AND prov = ?1 AND diubah >= ?2 AND dummy = 0 GROUP BY kab LIMIT 600`,
  /* catatan meja pengungsi sejak kejadian (keadaan titik = catatan terbarunya, dipilah di JS); dilayani meja_catatan_prov_diubah (0142) */
  pengungsi: `SELECT kab, coalesce('t:' || json_extract(data, '$.titik_id'), 'n:' || lower(json_extract(data, '$.nama_tempat'))) tempat, json_extract(data, '$.tgl_data') tgl, json_extract(data, '$.tgl_tutup') tutup,
    json_extract(data, '$.keb_air') air, json_extract(data, '$.keb_pangan') pangan, diubah FROM meja_catatan WHERE meja = 'pengungsi' AND prov = ?1 AND diubah >= ?2 AND dummy = 0 LIMIT 5000`,
};
const lfPilih = (env, p, tabel, sql) => sedia(env, p, tabel, "baca", sql);

/* ---------- LF-02: baca kisi, sel, riwayat; tulis status + riwayat ---------- */
/* kisi: tiap kab di sk_kejadian_kab x delapan layanan; tanpa baris lf_status = abu (T1). Tanpa `oleh`. */
export const lfKisi = async (env, p, kejadianId) => {
  const [kab, st, us] = await env.DB.batch([lfPilih(env, p, "lf_isyarat", LF_SQL.kab).bind(kejadianId), lfPilih(env, p, "lf_status", LF_SQL.status).bind(kejadianId), lfPilih(env, p, "lf_usulan", LF_SQL.usulan).bind(kejadianId)]);
  const s = new Map(st.results.map(r => [r.kab4 + "|" + r.layanan, r])), u = new Map(us.results.map(r => [r.kab4 + "|" + r.layanan, r]));
  return kab.results.map(({kab4}) => ({kab4, layanan: Object.fromEntries(LF_LAYANAN.map(l => {
    const a = s.get(kab4 + "|" + l), b = u.get(kab4 + "|" + l);
    return [l, {warna: a?.warna ?? "abu", catatan: a?.catatan ?? null, diubah: a?.diubah ?? null, usulan: b ? {warna: b.warna, alasan: b.alasan, isyarat: JSON.parse(b.isyarat), dihitung: b.dihitung} : null}];
  }))}));
};
/* satu sel + riwayat (terbaru dulu). null bila kab bukan bagian kejadian. `oleh` ikut (status dan tiap riwayat): rute LF-05 WAJIB membuangnya untuk pimpinan (KEAMANAN-PRIVASI: pimpinan hanya melihat peran). */
export const lfSel = async (env, p, kejadianId, kab4, layanan) => {
  const [ada, st, us, rw] = await env.DB.batch([lfPilih(env, p, "lf_isyarat", "SELECT 1 x FROM sk_kejadian_kab WHERE kejadian_id = ?1 AND kab4 = ?2").bind(kejadianId, kab4), lfPilih(env, p, "lf_status", LF_SQL.statusSel).bind(kejadianId, kab4, layanan),
    lfPilih(env, p, "lf_usulan", LF_SQL.usulanSel).bind(kejadianId, kab4, layanan), lfPilih(env, p, "lf_riwayat", LF_SQL.riwayat).bind(kejadianId, kab4, layanan)]);
  if (!ada.results.length) return null;
  const a = st.results[0], b = us.results[0];
  return {kab4, layanan, status: a ? {...a} : {warna: "abu", catatan: null, oleh: null, diubah: null}, usulan: b ? {...b, isyarat: JSON.parse(b.isyarat)} : null,
    riwayat: rw.results.map(r => ({...r, bukti: JSON.parse(r.bukti)}))};
};
/* bukti: daftar {sumber, kode, jumlah, waktu}; hanya pasangan sumber+kode dari BUKTI_SAH, kunci lain dibuang, label selalu dari konstanta server (bukan klien); paling banyak 2000 karakter JSON */
export const lfBersihBukti = b => {
  if (b == null) return [];
  if (!Array.isArray(b) || b.length > LF_MAKS_BUKTI) throw new Galat(400, `bukti harus larik paling banyak ${LF_MAKS_BUKTI}`);
  const hasil = b.map(x => {
    if (!x || typeof x !== "object" || !LF_BUKTI_SAH[x.sumber]?.includes(x.kode)) throw new Galat(400, "bukti tidak sah");
    const angka = v => typeof v === "number" && Number.isFinite(v) ? v : null;
    return {sumber: x.sumber, kode: x.kode, jumlah: angka(x.jumlah), waktu: angka(x.waktu), label: LF_LABEL_KAB};
  });
  if (JSON.stringify(hasil).length > 2000) throw new Galat(400, "bukti terlalu panjang");
  return hasil;
};
/* Tetapkan status: riwayat + status dalam SATU batch (atomik). Selain abu wajib bukti atau catatan (D4); kab di luar kejadian = tidak menulis apa pun, hasil false. */
export const lfTetapkan = async (env, p, {kejadianId, kab4, layanan, warna, catatan = null, bukti = [], oleh}, kini) => {
  if (!LF_LAYANAN.includes(layanan)) throw new Galat(400, "layanan tidak dikenal");
  if (!LF_WARNA.includes(warna)) throw new Galat(400, "warna tidak dikenal");
  const b = lfBersihBukti(bukti), c = catatan == null || catatan === "" ? null : String(catatan).trim();
  if (c !== null && (c.length < 20 || c.length > 300)) throw new Galat(400, "catatan 20 sampai 300 karakter");
  if (warna !== "abu" && !b.length && c === null) throw new Galat(400, "status selain abu wajib bukti atau catatan");
  const kab = "FROM sk_kejadian_kab WHERE kejadian_id = ?1 AND kab4 = ?2";
  const rw = sedia(env, p, "lf_riwayat", "tambah", `INSERT INTO lf_riwayat (kejadian_id, kab4, layanan, warna, catatan, bukti, oleh, dibuat) SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8 ${kab}`).bind(kejadianId, kab4, layanan, warna, c, JSON.stringify(b), oleh, kini);
  const st = sedia(env, p, "lf_status", "ubah", `INSERT INTO lf_status (kejadian_id, kab4, layanan, warna, catatan, oleh, diubah) SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7 ${kab}
    ON CONFLICT (kejadian_id, kab4, layanan) DO UPDATE SET warna = excluded.warna, catatan = excluded.catatan, oleh = excluded.oleh, diubah = excluded.diubah`).bind(kejadianId, kab4, layanan, warna, c, oleh, kini);
  const [r] = await env.DB.batch([rw, st]);
  return r.meta.changes === 1;
};

/* ---------- LF-03: pembaca isyarat ---------- */
const lfKosong = layanan => ({layanan, warga: {total: 0, n: {}, pulih: 0, t: 0}, logbook: {n: 0, t: 0}, meja: {n: 0, t: 0}, titik: {terbuka: 0, tidak: 0, basi: 0, t: 0}});
/* kabs = [{kab4, mulai: 'YYYY-MM-DD'}]. Hasil: {isyarat: {kab4: {layanan: isyarat}}, tak_terpetakan: {lapor_warga, logbook, meja}}. Jendela 24 jam, hanya sesudah mulai kab di kejadian (D9: isyarat kab). */
export const lfBacaIsyarat = async (env, p, kabs, kini) => {
  const peta = new Map(kabs.map(k => [k.kab4, lfMulaiMs(k.mulai)])), isy = {}, tak = {lapor_warga: 0, logbook: 0, meja: 0};
  for (const {kab4} of kabs) isy[kab4] = Object.fromEntries(LF_LAYANAN.map(l => [l, lfKosong(l)]));
  const awal = kini - LF_JENDELA_MS, batas = k => Math.max(awal, peta.get(k));
  const grup = new Map();   // provinsi|mulai -> kab4; satu kueri per kelompok supaya batas waktu pas
  for (const [k, m] of peta) { const g = k.slice(0, 2) + "|" + m; grup.set(g, [...(grup.get(g) ?? []), k]); }
  const stm = [lfPilih(env, p, "lf_isyarat", LF_SQL.warga).bind(awal)];
  for (const g of grup.keys()) { const [prov, m] = g.split("|"), dari = Math.max(awal, +m);
    stm.push(lfPilih(env, p, "lf_isyarat", LF_SQL.logbook).bind(prov, dari), lfPilih(env, p, "lf_isyarat", LF_SQL.dampak).bind(prov, dari), lfPilih(env, p, "lf_isyarat", LF_SQL.pengungsi).bind(prov, +m)); }
  const [warga, ...lain] = await env.DB.batch(stm), grupKunci = [...grup.keys()];
  /* Lapor Warga: per kab, per layanan, daftar {sub, t} per pelapor */
  const per = {};
  for (const r of warga.results) {
    const k = r.prov && r.kab ? lfKab4Dari(r.prov, r.kab) : null;
    if (!k) { tak.lapor_warga++; continue; }
    if (!peta.has(k) || r.t < batas(k)) continue;
    ((per[k] ??= {})[LF_JENIS_LAYANAN[r.jenis]] ??= []).push({sub: r.sub, t: r.t});
  }
  for (const [k, ls] of Object.entries(per)) for (const [l, rows] of Object.entries(ls)) {
    const w = isy[k][l].warga, cfg = LF_WARGA[l], gt = Math.max(0, ...rows.filter(x => cfg.gangguan.includes(x.sub)).map(x => x.t));
    w.total = rows.length; w.t = Math.max(...rows.map(x => x.t));
    for (const x of rows) w.n[x.sub] = (w.n[x.sub] ?? 0) + 1;
    if (cfg.baik) w.pulih = rows.filter(x => x.sub === cfg.baik && x.t > gt).length;
  }
  const taruh = (k, l, bagian, n, t) => { if (n > 0) { const o = isy[k][l][bagian]; o.n += n; o.t = Math.max(o.t, t ?? 0); } };
  grupKunci.forEach((g, i) => {
    const prov = g.slice(0, 2), [lb, dm, pg] = lain.slice(i * 3, i * 3 + 3), anggota = new Set(grup.get(g));
    const petakan = (kab, jenis) => { const k = lfKab4Dari(prov, kab); if (!k) { if (jenis) tak[jenis]++; return null; } return anggota.has(k) ? k : null; };
    const LB = {listrik: "listrik", sinyal: "sinyal", akses: "jalan", air_bersih: "air"};
    for (const r of lb.results) { const k = petakan(r.kab, "logbook"); if (k) taruh(k, LB[r.kode], "logbook", r.n, r.t); }
    for (const r of dm.results) { const k = petakan(r.kab, "meja"); if (k) for (const [l, v] of [["listrik", r.listrik], ["sinyal", r.telekom], ["air", r.air], ["bbm", r.spbu], ["jalan", r.jalan], ["faskes", r.faskes]]) taruh(k, l, "meja", v, r.t); }
    /* pengungsi: keadaan tiap tempat = catatan dengan tgl_data terbaru (lalu diubah terbaru) */
    const terbaru = new Map();
    for (const r of pg.results) { const k = petakan(r.kab, null); if (!k || !r.tempat) continue; const kk = k + "|" + r.tempat, a = terbaru.get(kk); if (!a || (r.tgl ?? "") > (a.tgl ?? "") || ((r.tgl ?? "") === (a.tgl ?? "") && r.diubah > a.diubah)) terbaru.set(kk, {...r, k}); }
    for (const r of terbaru.values()) {
      if (r.tutup) continue;
      const basi = !r.tgl || kini - lfMulaiMs(r.tgl) > LF_BASI_HARI * LF_HARI_MS;
      for (const l of ["air", "pangan", "pengungsian"]) {
        const t = isy[r.k][l].titik; t.terbuka++; t.t = Math.max(t.t, r.diubah);
        if ((l === "air" && r.air === "tidak") || (l === "pangan" && r.pangan === "tidak")) t.tidak++;
        if (basi) t.basi++;
      }
    }
  });
  return {isyarat: isy, tak_terpetakan: tak};
};

/* ---------- LF-04: cache usulan ---------- */
export const lfStmtUsulan = (env, p, kejadianId, kab4, layanan, u, kini) => sedia(env, p, "lf_usulan", "ubah",
  `INSERT INTO lf_usulan (kejadian_id, kab4, layanan, warna, alasan, isyarat, dihitung) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
   ON CONFLICT (kejadian_id, kab4, layanan) DO UPDATE SET warna = excluded.warna, alasan = excluded.alasan, isyarat = excluded.isyarat, dihitung = excluded.dihitung`).bind(kejadianId, kab4, layanan, u.warna, u.alasan, JSON.stringify(u.isyarat), kini);
/* hitung usulan seluruh kisi satu kejadian dan simpan ke lf_usulan; TIDAK menyentuh lf_status (T6). Kembali {sel, tak_terpetakan}. */
export const lfHitungUsulan = async (env, p, kejadianId, kini) => {
  const kabs = (await lfPilih(env, p, "lf_isyarat", LF_SQL.kab).bind(kejadianId).all()).results;
  if (!kabs.length) return {sel: 0, tak_terpetakan: {lapor_warga: 0, logbook: 0, meja: 0}};
  const {isyarat, tak_terpetakan} = await lfBacaIsyarat(env, p, kabs, kini);
  const stm = kabs.flatMap(({kab4}) => LF_LAYANAN.map(l => lfStmtUsulan(env, p, kejadianId, kab4, l, lfUsulan(isyarat[kab4][l]), kini)));
  for (let i = 0; i < stm.length; i += 50) await env.DB.batch(stm.slice(i, i + 50));
  return {sel: stm.length, tak_terpetakan};
};

/* ---------- TigaW: 3W dan tawaran bantuan (TW-03; data/kajian-bnpb/tiga-w/DESAIN-TEKNIS.md, ALGORITMA.md, migrasi 0143) ----------
   Hak (siapa boleh, Q1/Q3/Q6) dicek di rute TW-04 sampai TW-07; di sini hanya pelaku tw_baca / tw_tulis. Token organisasi: hanya sha-256.
   alasan_internal tidak pernah dikembalikan bila `untukOrg` (T12). kab4 -> nama kab lewat NAMA_KAB4; nama kab di meja/LogPal -> kab4 lewat kab4Dari DI JS (tidak di SQL). */
import {NAMA_KAB4 as TW_NAMA_KAB4, kab4Dari as twKab4Dari} from "./siklus_kab.js";
Object.assign(MATRIKS, {
  org:                {tw_baca: ["baca"], tw_tulis: ["baca", "tambah"]},
  tw_baris:           {tw_baca: ["baca"], tw_tulis: ["baca", "tambah", "ubah"]},
  tw_token:           {tw_baca: ["baca"], tw_tulis: ["baca", "tambah", "ubah"]},
  tw_tawaran:         {tw_baca: ["baca"], tw_tulis: ["baca", "tambah", "ubah"]},
  tw_tawaran_riwayat: {tw_baca: ["baca"], tw_tulis: ["baca", "tambah"]},
  tw_isyarat:         {tw_baca: ["baca"], tw_tulis: ["baca"]},   // pembacaan meja logistik dan LogPal untuk pencocokan
});
export const pelakuTwBaca = {peran: "tw_baca"}, pelakuTwTulis = {peran: "tw_tulis"};
export const TW_KLASTER = ["kesehatan", "sar", "logistik", "pengungsian", "pendidikan", "sarpras", "ekonomi", "pemulihan"];
export const TW_STATUS_BARIS = ["rencana", "berjalan", "selesai"];
export const TW_JENIS_ORG = ["kl", "tni", "polri", "ngo_nasional", "ngo_internasional", "dunia_usaha", "kampus", "pmi", "pbb_regional", "lainnya"];
export const TW_AMBANG_TUMPANG = 3;   // HIPOTESIS (Q4): tumpang tindih bila LEBIH dari 3 organisasi berjalan di (kab, klaster); belum diuji balik
const TW_PENDIDIKAN_HARI = 3;         // klaster pendidikan bukan celah untuk kejadian kurang dari 3 hari (ALGORITMA 1)
const twMs = tgl => Date.parse(tgl + "T00:00:00+07:00");
const twTeks = (v, min, maks, nama) => { const s = v == null ? "" : String(v).trim(); if (s.length < min || s.length > maks) throw new Galat(400, `${nama} ${min} sampai ${maks} karakter`); return s; };
const twOpsi = (v, maks) => (v == null || v === "" ? null : twTeks(v, 2, maks, "isian"));
const twTawaranKolom = untukOrg => "id, org_id, barang, barang_lain, jumlah, satuan, syarat, mitra_lokal_org_id, status, alasan_organisasi, kebutuhan, dibuat, diubah" + (untukOrg ? "" : ", alasan_internal");
const twPilih = (env, p, tabel, sql) => sedia(env, p, tabel, "baca", sql);

/* ---- organisasi ---- */
export const twOrgBuat = async (env, p, {id, nama, singkatan = null, jenis, negara = null, institusiId = null, oleh}, kini) => {
  if (!TW_JENIS_ORG.includes(jenis)) throw new Galat(400, "jenis organisasi tidak dikenal");
  if (jenis === "ngo_internasional" && !negara) throw new Galat(400, "organisasi internasional wajib menyebut negara asal");
  const r = await sedia(env, p, "org", "tambah", "INSERT INTO org (id, nama, singkatan, jenis, negara, institusi_id, dibuat, oleh) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)")
    .bind(id, twTeks(nama, 2, 120, "nama"), twOpsi(singkatan, 20), jenis, negara ? String(negara).toUpperCase() : null, institusiId, kini, oleh).run();
  return r.meta.changes === 1;
};
export const twOrgDaftar = (env, p) => twPilih(env, p, "org", "SELECT id, nama, singkatan, jenis, negara, institusi_id, dibuat FROM org ORDER BY nama LIMIT 1000").all().then(r => r.results);
export const twOrgById = (env, p, id) => twPilih(env, p, "org", "SELECT id, nama, singkatan, jenis, negara, institusi_id FROM org WHERE id = ?1").bind(id).first();

/* ---- baris 3W ---- */
const twCekBaris = ({klaster, status, kegiatan}) => {
  if (!TW_KLASTER.includes(klaster)) throw new Galat(400, "klaster tidak dikenal");
  if (!TW_STATUS_BARIS.includes(status)) throw new Galat(400, "status tidak dikenal");
  return twTeks(kegiatan, 5, 200, "kegiatan");
};
/* kab di luar sk_kejadian_kab = tidak menulis apa pun, hasil false (T2) */
export const twBarisBuat = async (env, p, b, kini) => {
  const keg = twCekBaris(b);
  const r = await sedia(env, p, "tw_baris", "tambah", `INSERT INTO tw_baris (id, kejadian_id, kab4, klaster, org_id, kegiatan, status, mulai, selesai, sumber, diubah, oleh)
    SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12 FROM sk_kejadian_kab WHERE kejadian_id = ?2 AND kab4 = ?3`)
    .bind(b.id, b.kejadianId, b.kab4, b.klaster, b.orgId, keg, b.status, b.mulai ?? null, b.selesai ?? null, b.sumber ?? "staf", kini, b.oleh).run();
  return r.meta.changes === 1;
};
/* ubah status/kegiatan/selesai; orgId bila lewat token (hanya baris miliknya, T5) */
export const twBarisUbah = async (env, p, {id, kejadianId, orgId = null, status, kegiatan, selesai = null, oleh}, kini) => {
  if (!TW_STATUS_BARIS.includes(status)) throw new Galat(400, "status tidak dikenal");
  const r = await sedia(env, p, "tw_baris", "ubah", `UPDATE tw_baris SET status = ?3, kegiatan = ?4, selesai = ?5, diubah = ?6, oleh = ?7
    WHERE id = ?1 AND kejadian_id = ?2 AND (?8 IS NULL OR org_id = ?8)`).bind(id, kejadianId, status, twTeks(kegiatan, 5, 200, "kegiatan"), selesai, kini, oleh, orgId).run();
  return r.meta.changes === 1;
};
export const twBarisDaftar = (env, p, kejadianId, orgId = null) => twPilih(env, p, "tw_baris",
  `SELECT b.id, b.kab4, b.klaster, b.org_id, o.nama org_nama, o.jenis org_jenis, b.kegiatan, b.status, b.mulai, b.selesai, b.sumber, b.diubah FROM tw_baris b JOIN org o ON o.id = b.org_id
   WHERE b.kejadian_id = ?1 AND (?2 IS NULL OR b.org_id = ?2) ORDER BY b.kab4, b.klaster, b.diubah DESC LIMIT 2000`).bind(kejadianId, orgId).all().then(r => r.results);
/* jumlah organisasi berbeda berstatus berjalan per (kab4, klaster) */
export const twGrid = (env, p, kejadianId) => twPilih(env, p, "tw_baris",
  "SELECT kab4, klaster, count(DISTINCT org_id) n FROM tw_baris WHERE kejadian_id = ?1 AND status = 'berjalan' GROUP BY kab4, klaster LIMIT 5000").bind(kejadianId).all().then(r => r.results);
/* celah dan tumpang tindih per kab kejadian (ALGORITMA 1, 2). Klaster pendidikan bukan celah selama kejadian < 3 hari di kab itu. */
export const twCelahTumpang = async (env, p, kejadianId, kini) => {
  const [kab, grid] = await env.DB.batch([twPilih(env, p, "tw_baris", "SELECT kab4, mulai FROM sk_kejadian_kab WHERE kejadian_id = ?1 ORDER BY kab4 LIMIT 600").bind(kejadianId),
    twPilih(env, p, "tw_baris", "SELECT kab4, klaster, count(DISTINCT org_id) n FROM tw_baris WHERE kejadian_id = ?1 AND status = 'berjalan' GROUP BY kab4, klaster LIMIT 5000").bind(kejadianId)]);
  const n = new Map(grid.results.map(r => [r.kab4 + "|" + r.klaster, r.n]));
  return kab.results.map(({kab4, mulai}) => {
    const muda = kini - twMs(mulai) < TW_PENDIDIKAN_HARI * 864e5;
    const relevan = TW_KLASTER.filter(c => !(c === "pendidikan" && muda));
    return {kab4, celah: relevan.filter(c => !(n.get(kab4 + "|" + c) > 0)), tumpang: TW_KLASTER.filter(c => n.get(kab4 + "|" + c) > TW_AMBANG_TUMPANG),
      per_klaster: Object.fromEntries(TW_KLASTER.map(c => [c, n.get(kab4 + "|" + c) ?? 0]))};
  });
};

/* ---- token organisasi (hanya sha-256) ---- */
/* terbitkan: cabut token aktif lama lalu sisipkan yang baru dalam SATU batch */
export const twTokenBuat = async (env, p, {id, orgId, kejadianId, tokenSha}, kini) => {
  const [, r] = await env.DB.batch([sedia(env, p, "tw_token", "ubah", "UPDATE tw_token SET cabut = ?3 WHERE org_id = ?1 AND kejadian_id = ?2 AND cabut IS NULL").bind(orgId, kejadianId, kini),
    sedia(env, p, "tw_token", "tambah", "INSERT INTO tw_token (id, org_id, kejadian_id, token_sha, dibuat) VALUES (?1, ?2, ?3, ?4, ?5)").bind(id, orgId, kejadianId, tokenSha, kini)]);
  return r.meta.changes === 1;
};
export const twTokenCabut = async (env, p, orgId, kejadianId, kini) => (await sedia(env, p, "tw_token", "ubah", "UPDATE tw_token SET cabut = ?3 WHERE org_id = ?1 AND kejadian_id = ?2 AND cabut IS NULL").bind(orgId, kejadianId, kini).run()).meta.changes;
/* null = tak dikenal; cabut != null = tercabut; fase dari kejadian (rute menolak 'selesai', 'dibatalkan', 'digabung') */
export const twTokenCari = (env, p, tokenSha) => twPilih(env, p, "tw_token",
  "SELECT t.id, t.org_id, t.kejadian_id, t.cabut, t.dibuat, k.fase FROM tw_token t JOIN sk_kejadian k ON k.id = t.kejadian_id WHERE t.token_sha = ?1").bind(tokenSha).first();

/* ---- tawaran ---- */
/* Q2: NGO internasional wajib menyebut mitra lokal (organisasi terdaftar). barang selain daftar meja logistik = "lainnya" + barang_lain. */
export const twTawaranBuat = async (env, p, {id, kejadianId, orgId, barang, barangLain = null, jumlah, satuan, syarat = null, mitraLokalOrgId = null, mitraNama = null}, kini, barangSah = []) => {
  if (barang !== "lainnya" && !barangSah.includes(barang)) throw new Galat(400, "barang tidak dikenal");
  if (barang === "lainnya" && !barangLain) throw new Galat(400, "barang lainnya wajib diisi");
  if (!Number.isInteger(jumlah) || jumlah < 1 || jumlah > 1e8) throw new Galat(400, "jumlah bilangan bulat 1 sampai 100000000");
  const org = await twOrgById(env, p, orgId);
  if (!org) return false;
  if (org.jenis === "ngo_internasional" && !mitraLokalOrgId && !mitraNama) throw new Galat(400, "organisasi internasional wajib menyebut mitra lokal");
  if (mitraLokalOrgId && !(await twOrgById(env, p, mitraLokalOrgId))) throw new Galat(400, "mitra lokal tidak terdaftar");
  const st = [sedia(env, p, "tw_tawaran", "tambah", `INSERT INTO tw_tawaran (id, kejadian_id, org_id, barang, barang_lain, jumlah, satuan, syarat, mitra_lokal_org_id, dibuat, diubah)
    SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?10 FROM sk_kejadian WHERE id = ?2`).bind(id, kejadianId, orgId, barang, twOpsi(barangLain, 80), jumlah, twTeks(satuan, 1, 20, "satuan"), twOpsi(mitraNama ? `Mitra lokal (belum dicocokkan staf): ${mitraNama}${syarat ? "; " + syarat : ""}`.slice(0, 300) : syarat, 300), mitraLokalOrgId, kini),
    sedia(env, p, "tw_tawaran_riwayat", "tambah", `INSERT INTO tw_tawaran_riwayat (tawaran_id, kejadian_id, status, oleh, dibuat) SELECT id, kejadian_id, 'masuk', ?2, ?3 FROM tw_tawaran WHERE id = ?1 AND dibuat = ?3`).bind(id, "org:" + orgId, kini)];
  const [r] = await env.DB.batch(st);
  return r.meta.changes === 1;
};
/* untukOrg: hanya tawaran organisasi itu dan TANPA alasan_internal (T12) */
export const twTawaranDaftar = (env, p, kejadianId, {orgId = null, untukOrg = false} = {}) => twPilih(env, p, "tw_tawaran",
  `SELECT ${twTawaranKolom(untukOrg)} FROM tw_tawaran WHERE kejadian_id = ?1 AND (?2 IS NULL OR org_id = ?2) ORDER BY dibuat DESC LIMIT 1000`).bind(kejadianId, orgId).all().then(r => r.results);
export const twTawaranById = (env, p, kejadianId, id, {orgId = null, untukOrg = false} = {}) => twPilih(env, p, "tw_tawaran",
  `SELECT ${twTawaranKolom(untukOrg)} FROM tw_tawaran WHERE id = ?1 AND kejadian_id = ?2 AND (?3 IS NULL OR org_id = ?3)`).bind(id, kejadianId, orgId).first();
export const twRiwayat = (env, p, tawaranId, {untukOrg = false} = {}) => twPilih(env, p, "tw_tawaran_riwayat",
  `SELECT id, status, ${untukOrg ? "" : "alasan_internal, oleh, "}alasan_organisasi, dibuat FROM tw_tawaran_riwayat WHERE tawaran_id = ?1 ORDER BY id DESC LIMIT 100`).bind(tawaranId).all().then(r => r.results);

/* keputusan: status + riwayat dalam SATU batch. Hanya tawaran berstatus masuk/dicocokkan yang bisa diputus (diterima/dialihkan/ditolak final). dialihkan/ditolak wajib alasan_organisasi (>= 5, juga dijaga CHECK). */
export const TW_STATUS_TAWARAN = ["masuk", "dicocokkan", "diterima", "dialihkan", "ditolak"];
export const twKeputusan = async (env, p, {id, kejadianId, status, alasanInternal = null, alasanOrganisasi = null, kebutuhan = null, oleh}, kini) => {
  if (!TW_STATUS_TAWARAN.includes(status) || status === "masuk") throw new Galat(400, "status keputusan tidak dikenal");
  const ai = alasanInternal ? twTeks(alasanInternal, 1, 300, "alasan internal") : null, ao = alasanOrganisasi ? twTeks(alasanOrganisasi, 1, 300, "alasan organisasi") : null;
  if ((status === "dialihkan" || status === "ditolak") && (!ao || ao.length < 5)) throw new Galat(400, "dialihkan atau ditolak wajib alasan untuk organisasi");
  const keb = kebutuhan == null ? null : JSON.stringify(kebutuhan);
  if (keb !== null && keb.length > 2000) throw new Galat(400, "kebutuhan terlalu panjang");
  const [u] = await env.DB.batch([
    sedia(env, p, "tw_tawaran", "ubah", `UPDATE tw_tawaran SET status = ?3, alasan_internal = ?4, alasan_organisasi = ?5, kebutuhan = coalesce(?6, kebutuhan), diubah = ?7
      WHERE id = ?1 AND kejadian_id = ?2 AND status IN ('masuk', 'dicocokkan')`).bind(id, kejadianId, status, ai, ao, keb, kini),
    sedia(env, p, "tw_tawaran_riwayat", "tambah", `INSERT INTO tw_tawaran_riwayat (tawaran_id, kejadian_id, status, alasan_internal, alasan_organisasi, oleh, dibuat)
      SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7 WHERE changes() > 0`).bind(id, kejadianId, status, ai, ao, oleh, kini)]);
  return u.meta.changes === 1;
};

/* ---- pencocokan (ALGORITMA 3, D6): hanya mengurutkan, staf yang memilih. Barang "lainnya" tidak dicocokkan. ----
   meja logistik: kueri per provinsi dilayani indeks tw_meja_barang (0143); nama kab dipetakan ke kab4 di JS (kab4Dari). */
export const TW_SQL = {
  kab: "SELECT kab4, mulai FROM sk_kejadian_kab WHERE kejadian_id = ?1 ORDER BY kab4 LIMIT 600",
  meja: `SELECT id, prov, kab, status, dibuat, json_extract(data, '$.jumlah_diminta') diminta, json_extract(data, '$.jumlah_kirim') kirim, json_extract(data, '$.posko') posko
    FROM meja_catatan INDEXED BY tw_meja_barang WHERE meja = 'logistik' AND prov = ?1 AND json_extract(data, '$.barang') = ?2 AND status IN ('diminta', 'disetujui') AND dibuat >= ?3 AND dummy = 0 ORDER BY dibuat LIMIT 500`,
  logpal: `SELECT id, provinsi, kab, items, dibuat FROM logpal_permintaan WHERE jenis = 'Tanggap darurat' AND ditolak = 0 AND tahap < 5 AND kab <> '' AND dibuat >= ?1 AND dummy = 0 ORDER BY dibuat LIMIT 500`,
};
const twNorm = s => String(s ?? "").toLowerCase().replace(/_/g, " ").trim();
/* provNama: {kode: nama provinsi} (src/instansi.js PROV bentuk [slug, nama] dipetakan pemanggil) supaya kab sama nama beda provinsi tidak tertukar; tanpa itu LogPal dicocokkan lewat nama kab saja. */
export const twKandidat = async (env, p, kejadianId, barang, kini, provNama = null) => {
  if (!barang || barang === "lainnya") return {kandidat: [], tak_terpetakan: 0};
  const kabs = (await twPilih(env, p, "tw_isyarat", TW_SQL.kab).bind(kejadianId).all()).results;
  if (!kabs.length) return {kandidat: [], tak_terpetakan: 0};
  const mulai = Math.min(...kabs.map(k => twMs(k.mulai))), set = new Set(kabs.map(k => k.kab4)), provs = [...new Set(kabs.map(k => k.kab4.slice(0, 2)))];
  const [lp, ...mj] = await env.DB.batch([twPilih(env, p, "tw_isyarat", TW_SQL.logpal).bind(mulai), ...provs.map(pv => twPilih(env, p, "tw_isyarat", TW_SQL.meja).bind(pv, barang, mulai))]);
  const kandidat = []; let tak = 0;
  mj.forEach((h, i) => { for (const r of h.results) { const k = twKab4Dari(provs[i], r.kab); if (!k) { tak++; continue; } if (!set.has(k)) continue;
    kandidat.push({sumber: "meja", id: r.id, kab4: k, posko: r.posko, status: r.status, dibuat: r.dibuat, sisa: Math.max(0, (r.diminta ?? 0) - (r.kirim ?? 0))}); } });
  const cari = twNorm(barang);
  for (const r of lp.results) {
    const pv = provNama ? Object.keys(provNama).find(k => twNorm(provNama[k]) === twNorm(r.provinsi)) : null;
    if (provNama && !pv) continue;
    const ada = (() => { try { return JSON.parse(r.items).filter(x => twNorm(x.barang) === cari); } catch { return []; } })();
    if (!ada.length) continue;
    const k = pv ? twKab4Dari(pv, r.kab) : [...set].find(s => twNorm(TW_NAMA_KAB4[s]) === twNorm(r.kab));
    if (!k) { tak++; continue; }
    if (!set.has(k)) continue;
    kandidat.push({sumber: "logpal", id: r.id, kab4: k, status: "tanggap darurat", dibuat: r.dibuat, sisa: ada.reduce((a, x) => a + (+x.jumlah || 0), 0)});
  }
  kandidat.sort((a, b) => a.dibuat - b.dibuat || b.sisa - a.sisa);
  return {kandidat, tak_terpetakan: tak};
};

/* ---------- Kaji ulang pasca-kejadian (KU-02; data/kajian-bnpb/kaji-ulang/DESAIN-TEKNIS.md, KEAMANAN-PRIVASI.md) ----------
   Pelaku seperti Lifeline: ku_baca (Pimpinan, BP baca-saja) dan ku_tulis (Pusdalops/Koordalops/Super Admin); rute KU-04..06 memetakan sesi ke pelaku dan menegakkan peran halus,
   BP hanya kab wilayahnya dan hanya yang disahkan. Bukan MATRIKS_SK/pelaku admin: hak.test mengunci isi keduanya.
   `oleh` ikut di hasil baca; rute WAJIB membuangnya untuk Pimpinan. Nama personel lapangan tidak pernah dibaca di sini. Status rekomendasi tinggal di dl_tindak (kunci kaji|KJ|nn).
   Sahkan dan sahkan ulang menyusul di KU-06 (pemicu ku_kaji_arsip_versi memindahkan versi lama ke ku_potret). */
const KU_BACA = {ku_baca: ["baca"], ku_tulis: ["baca"]}, KU_ISI = {ku_baca: ["baca"], ku_tulis: ["baca", "tambah", "ubah"]};
Object.assign(MATRIKS, {ku_kaji: KU_ISI, ku_pelajaran: KU_ISI, ku_rekomendasi: KU_ISI, ku_potret: {ku_baca: ["baca"], ku_tulis: ["baca", "tambah"]}, dl_tindak: KU_BACA});
export const pelakuKuBaca = {peran: "ku_baca"}, pelakuKuTulis = {peran: "ku_tulis"};
export const KU_MAKS_REKOMENDASI = 99, KU_STATUS = ["belum", "proses", "selesai"];
const KU_RE_KJ = /^KJ-\d{4}-[0-9A-HJKMNP-TV-Z]{8}$/, KU_RE_ID = /^[0-9a-f]{16}$/, KU_RE_KONTAK = /\d(?:\D{0,3}\d){8,}|@/;   // sama dengan RE_HP2 logbook.js (tidak diimpor: siklus impor)
const KU_RE_TERSEMBUNYI = /[\u0080-\u009f\u200b-\u200f\u202a-\u202e\u2066-\u2069\ufeff]/, KU_KUNCI_RUJUK = ["peristiwa", "waktu", "sumber", "kab4"];
const kuTeks = (v, nama, min, maks) => {
  const t = typeof v === "string" ? v.normalize("NFKC").replace(/\s+/g, " ").trim() : "";
  if (t.length < min || t.length > maks || /[\u0000-\u001f\u007f]/.test(t) || KU_RE_TERSEMBUNYI.test(t)) throw new Galat(400, `${nama} ${min}-${maks} karakter tanpa karakter kontrol atau tersembunyi`);
  if (KU_RE_KONTAK.test(t)) throw new Galat(400, `${nama} tidak boleh memuat nomor telepon atau surel`);
  return t;
};
const kuKj = id => { if (!KU_RE_KJ.test(id ?? "")) throw new Galat(400, "kejadian tidak sah"); return id; };
const kuTgl = v => {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v) || new Date(v + "T00:00:00Z").toISOString().slice(0, 10) !== v) throw new Galat(400, "tenggat wajib, bentuk YYYY-MM-DD");
  return v;
};
const kuId = () => [...crypto.getRandomValues(new Uint8Array(8))].map(b => b.toString(16).padStart(2, "0")).join("");
export const kuKunci = (kejadianId, nomor) => `kaji|${kejadianId}|${String(nomor).padStart(2, "0")}`;
/* batas rentang kunci kaji|KJ|nn di PK dl_tindak: '}' (0x7D) tepat sesudah '|' (0x7C), jadi tanpa LIKE */
export const kuRentang = kejadianId => [`kaji|${kuKj(kejadianId)}|`, `kaji|${kejadianId}}`];
export const KU_SQL = {
  kaji: "SELECT kejadian_id, status, versi, mulai_oleh, dibuat, disahkan_oleh, disahkan_pada, diubah FROM ku_kaji WHERE kejadian_id = ?1",
  potret: "SELECT versi, potret, disahkan_oleh, disahkan_pada FROM ku_kaji WHERE kejadian_id = ?1",
  potretLama: "SELECT versi, potret, disahkan_oleh, disahkan_pada FROM ku_potret WHERE kejadian_id = ?1 AND versi = ?2",
  pelajaran: "SELECT id, kategori, teks, rujuk, asal_ops_id, versi_tambah, oleh, dibuat FROM ku_pelajaran WHERE kejadian_id = ?1 ORDER BY dibuat, id LIMIT 500",
  rekomendasi: "SELECT id, nomor, kunci, teks, unit, tenggat, pelajaran_id, tidak_dilanjutkan, oleh, dibuat FROM ku_rekomendasi WHERE kejadian_id = ?1 ORDER BY nomor LIMIT 99",
  rekomendasiNomor: "SELECT id, nomor, kunci, teks, tidak_dilanjutkan FROM ku_rekomendasi WHERE kejadian_id = ?1 AND nomor = ?2",
  nomorBerikut: "SELECT coalesce(max(nomor), 0) + 1 n FROM ku_rekomendasi WHERE kejadian_id = ?1",
  tindak: "SELECT kunci, status, catatan, oleh, waktu FROM dl_tindak WHERE kunci >= ?1 AND kunci < ?2 ORDER BY kunci LIMIT 200",
  lintas: "SELECT r.kejadian_id, r.nomor, r.teks, r.unit, r.tenggat, r.tidak_dilanjutkan, t.status, t.waktu FROM ku_rekomendasi r LEFT JOIN dl_tindak t ON t.kunci = r.kunci ORDER BY r.tenggat, r.kejadian_id, r.nomor LIMIT 2000",
};
/* satu batch: kaji, pelajaran, rekomendasi, status tindak (rentang kunci). Tanpa potret (berat); potret lewat kuPotret. null bila kaji ulang belum dimulai. */
export const kuBaca = async (env, p, kejadianId) => {
  kuKj(kejadianId);
  const [k, pl, rk, tn] = await env.DB.batch([sedia(env, p, "ku_kaji", "baca", KU_SQL.kaji).bind(kejadianId), sedia(env, p, "ku_pelajaran", "baca", KU_SQL.pelajaran).bind(kejadianId),
    sedia(env, p, "ku_rekomendasi", "baca", KU_SQL.rekomendasi).bind(kejadianId), sedia(env, p, "dl_tindak", "baca", KU_SQL.tindak).bind(...kuRentang(kejadianId))]);
  if (!k.results.length) return null;
  const st = new Map(tn.results.map(r => [r.kunci, r]));
  return {kaji: k.results[0], pelajaran: pl.results.map(r => ({...r, rujuk: JSON.parse(r.rujuk)})), rekomendasi: rk.results.map(r => ({...r, status: st.get(r.kunci) ?? null}))};
};
/* potret beku: versi terkini dari ku_kaji, versi lama dari ku_potret; null bila belum disahkan atau versi tidak ada */
export const kuPotret = async (env, p, kejadianId, versi = null) => {
  kuKj(kejadianId);
  const k = await sedia(env, p, "ku_kaji", "baca", KU_SQL.potret).bind(kejadianId).first();
  if (!k?.potret) return null;
  const r = versi == null || versi === k.versi ? k : await sedia(env, p, "ku_potret", "baca", KU_SQL.potretLama).bind(kejadianId, versi).first();
  return r ? {...r, potret: JSON.parse(r.potret)} : null;
};
/* F-7 lintas kejadian: tiap rekomendasi dengan status terkininya (null = belum ada baris dl_tindak); lewat tenggat dihitung pemanggil dari tanggal */
export const kuDaftarRekomendasi = async (env, p) => (await sedia(env, p, "ku_rekomendasi", "baca", KU_SQL.lintas).all()).results;
/* mulai: satu baris draf bila kejadian ada dan belum dimulai; jejak sk_jejak hanya bila baris tertulis. true = baru dimulai. */
export const kuMulai = async (env, p, {kejadianId, oleh}, kini) => {
  kuKj(kejadianId);
  const s = sedia(env, p, "ku_kaji", "tambah", "INSERT INTO ku_kaji (kejadian_id, status, versi, mulai_oleh, dibuat, diubah) SELECT id, 'draf', 0, ?2, ?3, ?3 FROM sk_kejadian WHERE id = ?1 AND NOT EXISTS (SELECT 1 FROM ku_kaji WHERE kejadian_id = ?1)").bind(kejadianId, oleh, kini);
  try {
    const [r] = await skBatch(env, p, [s, skStmtJejakJikaBerubah(env, pelakuSkStaf /* hak tulis sudah dicek di sedia(ku_kaji); sk_jejak hanya mengenal pelaku sk_* */, oleh, "kaji_ulang", kejadianId, "mulai", null, "draf", null, kini)]);
    return r.meta.changes === 1;
  } catch (e) { if (/sudah ada; tidak boleh ditimpa/.test(String(e?.message ?? e))) return false; throw e; }   // balapan dua mulai: pemicu ku_kaji_tetap_sisip, batch batal
};
const kuBerubah = async f => { try { return await f(); } catch (e) {
  const m = String(e?.message ?? e);
  if (/tidak boleh (diubah|dihapus)/.test(m)) throw new Galat(409, "kaji ulang sudah disahkan; hanya bisa menambah baris baru");
  if (/FOREIGN KEY/i.test(m)) throw new Galat(404, "kejadian atau pelajaran tidak ada");
  if (/UNIQUE/i.test(m)) throw new Galat(409, "nomor rekomendasi bentrok; ulangi");
  throw e; } };
/* pelajaran baru: versi_tambah = versi kaji saat ini (0 bila draf); kaji ulang harus sudah dimulai (404 bila tidak) */
export const kuTambahPelajaran = (env, p, {kejadianId, kategori, teks, rujuk = [], asalOpsId = null, oleh}, kini) => {
  kuKj(kejadianId);
  if (!["baik", "perbaiki"].includes(kategori)) throw new Galat(400, "kategori baik atau perbaiki");
  const t = kuTeks(teks, "teks pelajaran", 10, 1000);
  if (!Array.isArray(rujuk) || rujuk.some(x => !x || typeof x !== "object" || Array.isArray(x) || Object.keys(x).some(k => !KU_KUNCI_RUJUK.includes(k)) || Object.values(x).some(v => v !== null && !["string", "number"].includes(typeof v)))) throw new Galat(400, `rujuk larik objek dengan kunci ${KU_KUNCI_RUJUK.join(", ")}`);
  const rj = JSON.stringify(rujuk);
  if (rj.length > 400) throw new Galat(400, "rujuk paling banyak 400 karakter");
  if (rujuk.some(x => Object.values(x).some(v => typeof v === "number" ? !Number.isFinite(v) : typeof v === "string" && (KU_RE_KONTAK.test(v.normalize("NFKC")) || KU_RE_TERSEMBUNYI.test(v))))) throw new Galat(400, "rujuk tidak boleh memuat nomor telepon, surel, atau karakter tersembunyi");
  if (asalOpsId != null && !/^[A-Za-z0-9_-]{1,40}$/.test(asalOpsId)) throw new Galat(400, "asal_ops_id tidak sah");
  const id = kuId();
  return kuBerubah(async () => {
    const [r] = await env.DB.batch([sedia(env, p, "ku_pelajaran", "tambah", `INSERT INTO ku_pelajaran (id, kejadian_id, kategori, teks, rujuk, asal_ops_id, versi_tambah, oleh, dibuat)
      SELECT ?1, kejadian_id, ?3, ?4, ?5, ?6, versi, ?7, ?8 FROM ku_kaji WHERE kejadian_id = ?2`).bind(id, kejadianId, kategori, t, rj, asalOpsId ?? null, oleh, kini)]);
    if (r.meta.changes !== 1) throw new Galat(404, "kaji ulang belum dimulai");
    return id;
  });
};
/* ubah teks/kategori pelajaran: hanya saat masih draf (pemicu ku_pelajaran_beku_ubah menolak sisanya -> 409) */
export const kuUbahPelajaran = (env, p, {id, kategori, teks}, kini) => {
  if (!KU_RE_ID.test(id ?? "")) throw new Galat(400, "id tidak sah");
  if (!["baik", "perbaiki"].includes(kategori)) throw new Galat(400, "kategori baik atau perbaiki");
  const t = kuTeks(teks, "teks pelajaran", 10, 1000);
  return kuBerubah(async () => (await sedia(env, p, "ku_pelajaran", "ubah", "UPDATE ku_pelajaran SET kategori = ?2, teks = ?3 WHERE id = ?1").bind(id, kategori, t).run()).meta.changes === 1);
};
/* dl_tindak(+log) hanya bila baris ku_rekomendasi tadi tertulis (SELECT ... WHERE EXISTS id): pelajaran lintas kejadian = tidak ada yang tertulis */
const dlStmtTindakJikaBaru = (env, id, oleh, kini) => env.DB.prepare("INSERT INTO dl_tindak (kunci, status, catatan, oleh, waktu) SELECT kunci, 'belum', NULL, ?2, ?3 FROM ku_rekomendasi WHERE id = ?1").bind(id, oleh, kini);
const dlStmtTindakLogJikaBaru = (env, id, teks, oleh, kini) => env.DB.prepare("INSERT INTO dl_tindak_log (kunci, status, catatan, langkah, oleh, waktu) SELECT kunci, 'belum', NULL, ?2, ?3, ?4 FROM ku_rekomendasi WHERE id = ?1").bind(id, teks, oleh, kini);
/* rekomendasi baru: nomor = max+1 (bentrok balapan = UNIQUE -> 409, seluruh batch batal), satu batch dengan dl_tindak (belum) dan dl_tindak_log (langkah = teks) (T8).
   Tenggat wajib (D7/Q4); rentang 7..365 hari dicek rute (butuh tanggal sahkan). Kembali {id, nomor, kunci}. */
export const kuTambahRekomendasi = async (env, p, {kejadianId, teks, unit, tenggat, pelajaranId = null, oleh}, kini) => {
  kuKj(kejadianId);
  const t = kuTeks(teks, "teks rekomendasi", 10, 400), u = kuTeks(unit, "unit", 2, 80), tg = kuTgl(tenggat);
  if (pelajaranId != null && !KU_RE_ID.test(pelajaranId)) throw new Galat(400, "pelajaran tidak sah");
  if (!(await sedia(env, p, "ku_kaji", "baca", KU_SQL.kaji).bind(kejadianId).first())) throw new Galat(404, "kaji ulang belum dimulai");
  const n = (await sedia(env, p, "ku_rekomendasi", "baca", KU_SQL.nomorBerikut).bind(kejadianId).first()).n;
  if (n > KU_MAKS_REKOMENDASI) throw new Galat(409, "paling banyak 99 rekomendasi per kejadian");
  const id = kuId(), kunci = kuKunci(kejadianId, n);
  const [r] = await kuBerubah(() => env.DB.batch([sedia(env, p, "ku_rekomendasi", "tambah", `INSERT INTO ku_rekomendasi (id, kejadian_id, nomor, kunci, teks, unit, tenggat, pelajaran_id, oleh, dibuat)
    SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10 WHERE ?8 IS NULL OR EXISTS (SELECT 1 FROM ku_pelajaran WHERE id = ?8 AND kejadian_id = ?2)`)
    .bind(id, kejadianId, n, kunci, t, u, tg, pelajaranId, oleh, kini), dlStmtTindakJikaBaru(env, id, oleh, kini), dlStmtTindakLogJikaBaru(env, id, t, oleh, kini)]));
  if (r.meta.changes !== 1) throw new Galat(400, "pelajaran bukan milik kejadian ini");
  return {id, nomor: n, kunci};
};
/* status rekomendasi lewat dl_tindak + dl_tindak_log + (bila tidak dilanjutkan) penanda di ku_rekomendasi, satu batch. Selesai wajib catatan 20..300 (D7); tidakDilanjutkan wajib selesai (Q8). null = nomor tidak ada. */
export const kuUbahStatus = async (env, p, {kejadianId, nomor, status, catatan = null, tidakDilanjutkan = false, oleh}, kini) => {
  if (!boleh(p, "ku_rekomendasi", "ubah")) throw new Galat(403, `pelaku ${p?.peran ?? "-"} tidak berhak ubah status rekomendasi`);   // dlStmtTindak* tidak lewat sedia
  kuKj(kejadianId);
  if (!KU_STATUS.includes(status)) throw new Galat(400, "status belum, proses, atau selesai");
  const c = catatan == null || catatan === "" ? null : kuTeks(catatan, "catatan", status === "selesai" ? 20 : 1, 300);
  if (status === "selesai" && c === null) throw new Galat(400, "status selesai wajib catatan penutup 20-300 karakter");
  if (tidakDilanjutkan && status !== "selesai") throw new Galat(400, "tidak dilanjutkan hanya dengan status selesai");
  const r = await sedia(env, p, "ku_rekomendasi", "baca", KU_SQL.rekomendasiNomor).bind(kejadianId, Number(nomor)).first();
  if (!r) return null;
  const stm = [dlStmtTindak(env, r.kunci, status, c, oleh, kini), dlStmtTindakLog(env, r.kunci, status, c, r.teks, oleh, kini)];
  if (tidakDilanjutkan && !r.tidak_dilanjutkan) stm.push(sedia(env, p, "ku_rekomendasi", "ubah", "UPDATE ku_rekomendasi SET tidak_dilanjutkan = 1 WHERE id = ?1").bind(r.id));
  await kuBerubah(() => env.DB.batch(stm));
  return {kunci: r.kunci, status};
};
/* riwayat satu rekomendasi (terbaru dulu, maks 100); null bila nomor tidak ada */
export const kuRiwayat = async (env, p, kejadianId, nomor) => {
  kuKj(kejadianId);
  const r = await sedia(env, p, "ku_rekomendasi", "baca", KU_SQL.rekomendasiNomor).bind(kejadianId, Number(nomor)).first();
  return r ? dlTindakRiwayat(env, r.kunci) : null;
};

/* ---------- Kaji ulang: bahan draf (KU-03; ALGORITMA 2a, 3) ----------
   Bacaan draf, tanpa tulis dan tanpa nama orang. Tugas terhubung = sk_kejadian_sumber sumber 'tugas_api' status 'terpasang'; `kode` di sana = tugas_api.id (KT.tugas_api memakai `t.id kode`;
   sumber lain seperti lapsus berkode gabungan, jadi hanya 'tugas_api' yang benar-benar tugas). SATU kueri set-based memuat tugas (kolom sama dengan muatTugas di sla.js: tiba dan kabar lewat
   subkueri, awal 0043 dan penugasan 0035 digugurkan bila belum ada); tabel pendamping dibaca SEKALI lewat subkueri yang sama, tak pernah per tugas. Tabel opsional yang belum ada = null
   ("belum diaktifkan"), bukan larik kosong. Hitungan kueri maksimal KU_MAKS_KUERI_DRAF (diuji lewat pembungkus prepare). Hak: satu cek ku_kaji baca (tabel sk_*, tugas_*, lf_*, tw_* milik pelaku lain). */
export const KU_MAKS_KUERI_DRAF = 14, KU_MAKS_TUGAS = 200;
const KU_TAUTAN = `SELECT kode FROM sk_kejadian_sumber WHERE kejadian_id = ?1 AND sumber = 'tugas_api' AND status = 'terpasang' ORDER BY kode LIMIT ${KU_MAKS_TUGAS}`;   // ORDER BY: yang terpotong selalu sama (temp b-tree hanya atas tautan satu kejadian)
export const KU_BATAS = {jejak: 50, muncul: 400, pelajaran: 400, layanan: 1000, baris3w: 1000, tawaran: 1000};   // tiap sumber dibaca batas + 1; kelebihan = terpotong (tidak diam)
export const KU_SQL_DRAF = {
  kejadian: "SELECT id, jenis, nama, fase, fase_diubah, dibuat, tanggap_mulai, tanggap_akhir FROM sk_kejadian WHERE id = ?1",
  kab: "SELECT kab4 FROM sk_kejadian_kab WHERE kejadian_id = ?1 LIMIT 100",
  jejak: `SELECT waktu, dari, ke FROM sk_jejak WHERE obyek = 'kejadian' AND obyek_id = ?1 AND aksi = 'fase' ORDER BY waktu LIMIT ${KU_BATAS.jejak + 1}`,
  tautan: "SELECT count(*) n FROM sk_kejadian_sumber WHERE kejadian_id = ?1 AND sumber = 'tugas_api' AND status = 'terpasang'",
  muncul: `SELECT tugas_id, waktu FROM tugas_muncul WHERE tugas_id IN (${KU_TAUTAN}) LIMIT ${KU_BATAS.muncul + 1}`,
  pelajaran: `SELECT id, tugas_id, catatan, dibuat FROM ops_pelajaran WHERE tugas_id IN (${KU_TAUTAN}) LIMIT ${KU_BATAS.pelajaran + 1}`,
  layanan: `SELECT kab4, layanan, warna, dibuat FROM lf_riwayat WHERE kejadian_id = ?1 ORDER BY kab4, layanan, dibuat LIMIT ${KU_BATAS.layanan + 1}`,
  baris3w: `SELECT kab4, klaster, mulai FROM tw_baris WHERE kejadian_id = ?1 LIMIT ${KU_BATAS.baris3w + 1}`,
  tawaran: `SELECT dibuat FROM tw_tawaran WHERE kejadian_id = ?1 LIMIT ${KU_BATAS.tawaran + 1}`,
};
export const kuSqlTugas = (awal, tugasan, bencana) => `SELECT t.id, t.prov, t.kab, t.status, t.dibuat, t.konfirmasi_pada, t.padam_pada, t.verif_pada, t.padam_verif,
  ${awal ? "t.terdeteksi_awal, t.himawari_awal" : "NULL terdeteksi_awal, NULL himawari_awal"},
  ${tugasan ? "(SELECT min(tiba_pada) FROM penugasan WHERE tugas_id = t.id AND tiba_pada IS NOT NULL) tiba" : "NULL tiba"},
  (SELECT min(dibuat) FROM tugas_isian WHERE tugas_id = t.id AND langkah = 'tindakan') kabar,
  ${bencana ? "coalesce((SELECT b.bencana FROM tugas_bencana b WHERE b.tugas_id = t.id), 'karhutla')" : "'karhutla'"} bencana
  FROM tugas_api t WHERE t.dummy = 0 AND t.id IN (${KU_TAUTAN})`;
const kuOpsional = async (env, sql, ...bind) => {
  try { return (await env.DB.prepare(sql).bind(...bind).all()).results; }
  catch (e) { if (/no such table/i.test(String(e?.message ?? e))) return null; throw e; }
};
/* null bila kejadian tidak ada. Bentuk hasil = masukan rakitKajiUlang (src/kaji_ulang_rakit.js). */
export const kuMuatDraf = async (env, p, kejadianId) => {
  izin(p, "ku_kaji", "baca");
  kuKj(kejadianId);
  const [kej, kab, jejak, tautan] = await env.DB.batch(["kejadian", "kab", "jejak", "tautan"].map(k => env.DB.prepare(KU_SQL_DRAF[k]).bind(kejadianId)));
  if (!kej.results.length) return null;
  let awal = true, tugasan = true, bencana = true, baris = null;
  for (let i = 0; i < 4 && !baris; i++) {
    try { baris = (await env.DB.prepare(kuSqlTugas(awal, tugasan, bencana)).bind(kejadianId).all()).results; }
    catch (e) {
      const m = String(e?.message ?? e);
      if (awal && /no such column: t?\.?(terdeteksi_awal|himawari_awal)/i.test(m)) awal = false;
      else if (tugasan && /no such table: (main\.)?penugasan/i.test(m)) tugasan = false;
      else if (bencana && /no such table: (main\.)?tugas_bencana/i.test(m)) bencana = false;
      else throw e;
    }
  }
  const [muncul, pelajaran, layanan, baris3w, tawaran] = [await kuOpsional(env, KU_SQL_DRAF.muncul, kejadianId), await kuOpsional(env, KU_SQL_DRAF.pelajaran, kejadianId),
    await kuOpsional(env, KU_SQL_DRAF.layanan, kejadianId), await kuOpsional(env, KU_SQL_DRAF.baris3w, kejadianId), await kuOpsional(env, KU_SQL_DRAF.tawaran, kejadianId)];
  const terpotong = [], potong = (nama, a) => { if (a && a.length > KU_BATAS[nama]) { terpotong.push(nama); return a.slice(0, KU_BATAS[nama]); } return a; };
  return {kejadian: kej.results[0], kab: kab.results.map(r => r.kab4), jejak: potong("jejak", jejak.results), tugas: baris, tautan: tautan.results[0].n, muncul: potong("muncul", muncul), pelajaran: potong("pelajaran", pelajaran),
    layanan: potong("layanan", layanan), baris3w: potong("baris3w", baris3w), tawaran: potong("tawaran", tawaran), terpotong, kolom: {awal, penugasan: tugasan}};
};

/* ---------- Kaji ulang: kandidat, tugas belum bertaut, pengesahan (KU-04..06; ALGORITMA 1, 2; ALUR A4; keputusan Q1, Q3) ----------
   SQL saja; kriteria Q1 (HIPOTESIS) dan aturan penulis tunggal Q3 diputuskan di rute src/kaji_ulang.js. Hak lewat izin()/sedia() pada tabel ku_*. */
export const KU_MAKS_KANDIDAT = 120;
const KU_SQL_KANDIDAT = merah => `SELECT k.id, k.jenis, k.nama, k.fase, k.mulai, k.tanggap_mulai, k.tanggap_akhir,
  (SELECT count(*) FROM sk_kejadian_kab WHERE kejadian_id = k.id) nkab, ${merah ? "EXISTS (SELECT 1 FROM lf_riwayat WHERE kejadian_id = k.id AND warna = 'merah')" : "NULL"} merah, u.status kaji_status, u.versi kaji_versi
  FROM sk_kejadian k LEFT JOIN ku_kaji u ON u.kejadian_id = k.id WHERE k.fase IN ('transisi', 'pemulihan', 'selesai') AND (?1 = 1 OR k.dummy = 0) ORDER BY k.mulai DESC, k.id DESC LIMIT ${KU_MAKS_KANDIDAT}`;
/* {baris, lifeline}: lifeline=false bila lf_riwayat belum ada (kriteria itu dilewati, bukan nol) */
export const kuKandidatBaris = async (env, p, dummyOk) => {
  izin(p, "ku_kaji", "baca");
  try { return {baris: (await env.DB.prepare(KU_SQL_KANDIDAT(true)).bind(dummyOk ? 1 : 0).all()).results, lifeline: true}; }
  catch (e) { if (!/no such table: (main\.)?lf_riwayat/i.test(String(e?.message ?? e))) throw e; }
  return {baris: (await env.DB.prepare(KU_SQL_KANDIDAT(false)).bind(dummyOk ? 1 : 0).all()).results, lifeline: false};
};
/* KU-08 baca BPBD: kaji ulang yang SUDAH disahkan dari kejadian yang menyentuh salah satu kab4 di `lingkup` (larik kab4 wilayah akun; kosong = tanpa baris). Tanpa kolom oleh. */
export const KU_MAKS_DISAHKAN = 200;
export const kuDisahkanLingkup = async (env, p, lingkup, dummyOk) => {
  izin(p, "ku_kaji", "baca");
  return (await env.DB.prepare(`SELECT k.id, k.jenis, k.nama, k.fase, k.mulai, u.versi, u.disahkan_pada FROM ku_kaji u JOIN sk_kejadian k ON k.id = u.kejadian_id
    WHERE u.status = 'disahkan' AND (?2 = 1 OR k.dummy = 0) AND EXISTS (SELECT 1 FROM sk_kejadian_kab x WHERE x.kejadian_id = k.id AND x.kab4 IN (SELECT value FROM json_each(?1)))
    ORDER BY u.disahkan_pada DESC, k.id LIMIT ${KU_MAKS_DISAHKAN}`).bind(JSON.stringify(lingkup ?? []), dummyOk ? 1 : 0).all()).results;
};
/* T21: tugas_api yang dibuat dalam [dari, sampai) di provinsi kejadian tanpa baris sk_kejadian_sumber; pencocokan kab dilakukan pemanggil (kab4Dari). null bila tugas_api belum ada. */
export const kuTugasBelumBertaut = async (env, p, dari, sampai, provs) => {
  izin(p, "ku_kaji", "baca");
  try {
    return (await env.DB.prepare(`SELECT t.prov, t.kab FROM tugas_api t WHERE t.dummy = 0 AND t.dibuat >= ?1 AND t.dibuat < ?2 AND t.prov IN (SELECT value FROM json_each(?3))
      AND NOT EXISTS (SELECT 1 FROM sk_kejadian_sumber s WHERE s.sumber = 'tugas_api' AND s.kode = t.id) LIMIT 500`).bind(dari, sampai, JSON.stringify(provs)).all()).results;
  } catch (e) { if (/no such table/i.test(String(e?.message ?? e))) return null; throw e; }
};
/* siapa saja yang menulis isi kaji ulang (pelajaran dan rekomendasi), untuk aturan penulis tunggal */
export const kuPenulis = async (env, p, kejadianId) => {
  izin(p, "ku_pelajaran", "baca"); izin(p, "ku_rekomendasi", "baca"); kuKj(kejadianId);
  return (await env.DB.prepare("SELECT oleh FROM ku_pelajaran WHERE kejadian_id = ?1 UNION SELECT oleh FROM ku_rekomendasi WHERE kejadian_id = ?1 LIMIT 50").bind(kejadianId).all()).results.map(r => r.oleh);
};
/* ada staf Koordalops aktif lain selain `stafId` (Q3: dua pasang mata) */
export const kuKoordalopsLain = async (env, p, stafId) => {
  izin(p, "ku_kaji", "ubah");
  return (await env.DB.prepare("SELECT count(*) n FROM staf WHERE status = 'aktif' AND dummy = 0 AND id != ?1 AND EXISTS (SELECT 1 FROM json_each(peran) WHERE value = 'koordalops')").bind(String(stafId)).first()).n > 0;
};
/* sahkan (versiLama 0) atau sahkan ulang (>= 1): naik satu versi dengan pembanding versi lama (balapan = 0 baris = false); pemicu ku_kaji_arsip_versi memindahkan potret lama ke ku_potret; sk_jejak sebatch */
export const kuSahkan = async (env, p, {kejadianId, versiLama, potret, oleh}, kini) => {
  kuKj(kejadianId);
  const s = sedia(env, p, "ku_kaji", "ubah", "UPDATE ku_kaji SET status = 'disahkan', versi = versi + 1, disahkan_oleh = ?3, disahkan_pada = ?4, potret = ?5, diubah = ?4 WHERE kejadian_id = ?1 AND versi = ?2").bind(kejadianId, versiLama, oleh, kini, potret);
  const ulang = versiLama > 0;
  const [r] = await skBatch(env, p, [s, skStmtJejakJikaBerubah(env, pelakuSkStaf, oleh, "kaji_ulang", kejadianId, ulang ? "sahkan_ulang" : "sahkan", ulang ? "disahkan" : "draf", "disahkan", `versi ${versiLama + 1}`, kini)]);
  return r.meta.changes > 0;   // D1 menghitung baris pemicu arsip ku_potret juga, jadi bukan === 1
};

/* ---------- Bot Laporan WA (BL-02; data/kajian-bnpb/bot-laporan/DESAIN-TEKNIS.md, ALUR.md, ALGORITMA.md A1 dan A9, migrasi 0154) ----------
   SQL saja; validasi masukan di src/wa_proyek.js. Pelaku bl_mesin = mesin bot (Bearer WA_MESIN), bl_staf = daftar untuk tab /pelaporan
   (tanpa isian, bahan, atau wa_sha). bl_versi append-only: di sini hanya INSERT, tidak ada UPDATE atau DELETE pada tabel itu.
   Tiap kueri SEARCH lewat PK atau indeks 0154 (kuota baca D1 Free). */
Object.assign(MATRIKS, {
  bl_proyek: {bl_mesin: ["baca", "tambah", "ubah"], bl_staf: ["baca"]},
  bl_bahan:  {bl_mesin: ["baca", "tambah"]},
  bl_versi:  {bl_mesin: ["baca", "tambah"]},
  bl_pola:   {bl_mesin: ["baca", "tambah", "ubah"]},
  bl_daftar: {bl_mesin: ["baca", "tambah", "ubah"], bl_staf: ["baca"]},
  bl_biaya:  {bl_mesin: ["baca", "tambah", "ubah"], bl_staf: ["baca"]},
  bl_detak:  {bl_mesin: ["baca", "tambah", "ubah"], bl_staf: ["baca"]},
});
export const pelakuBlMesin = {peran: "bl_mesin"}, pelakuBlStaf = {peran: "bl_staf"};
export const BL_STATUS = ["terbuka", "bertanya", "membangun", "draf", "final", "ditutup", "batal", "kedaluwarsa"];
export const BL_AKTIF = ["terbuka", "bertanya", "membangun", "draf"];   // proyek yang masih menerima bahan, revisi, dan versi; final dan ditutup tidak dibuka lagi (ALUR)
/* ALUR "Status proyek": terbuka -> bertanya -> membangun -> draf -> membangun (revisi) -> draf ... -> final -> ditutup; keluar samping batal dan kedaluwarsa.
   Syarat versi: ke draf dan final butuh versi >= 1; membangun mundur ke terbuka/bertanya hanya bila belum ada versi (bangun v1 gagal atau bot bertanya dulu). */
export const BL_TRANSISI = {
  terbuka:     ["bertanya", "membangun", "batal", "kedaluwarsa"],
  bertanya:    ["terbuka", "membangun", "batal", "kedaluwarsa"],
  membangun:   ["draf", "terbuka", "bertanya", "batal", "kedaluwarsa"],
  draf:        ["membangun", "final", "batal", "kedaluwarsa"],
  final:       ["ditutup"],
  ditutup: [], batal: [], kedaluwarsa: [],
};
export const blBolehPindah = (dari, ke, versi) => !!BL_TRANSISI[dari]?.includes(ke)
  && (!["draf", "final"].includes(ke) || versi >= 1) && !(dari === "membangun" && ["terbuka", "bertanya"].includes(ke) && versi > 0);
const BL_KOL_PROYEK = "id, wa_sha, jenis, tanggal, status, versi, drive_url, dibuat, diubah";
const BL_AKTIF_SQL = "('terbuka', 'bertanya', 'membangun', 'draf')";

/* ---- proyek ---- */
export const blProyekById = (env, p, id) => sedia(env, p, "bl_proyek", "baca", `SELECT ${BL_KOL_PROYEK} FROM bl_proyek WHERE id = ?1`).bind(id).first();
const blProyekAktif = (env, p, waSha, jenis, tanggal) => sedia(env, p, "bl_proyek", "baca",
  `SELECT ${BL_KOL_PROYEK} FROM bl_proyek WHERE wa_sha = ?1 AND status IN ${BL_AKTIF_SQL} AND jenis = ?2 AND tanggal = ?3 ORDER BY dibuat DESC LIMIT 1`).bind(waSha, jenis, tanggal).first();
/* buka atau ambil proyek aktif per (nomor, jenis, tanggal) (Q6). Kode P-DDMMYY-NN dari tanggal WIB pembuatan, NN urut per hari (maks 99).
   INSERT ... WHERE NOT EXISTS: dua panggilan bersamaan untuk tuple yang sama tidak membuat dua proyek aktif; bentrok kode = coba nomor berikut. */
export async function blProyekBuka(env, p, {waSha, jenis, tanggal}, kini) {
  const ada = await blProyekAktif(env, p, waSha, jenis, tanggal); if (ada) return {proyek: ada, baru: false};
  const d = new Date(kini + 7 * 3600e3).toISOString(), awal = `P-${d.slice(8, 10)}${d.slice(5, 7)}${d.slice(2, 4)}-`;
  for (let coba = 0; coba < 4; coba++) {
    const akhir = await sedia(env, p, "bl_proyek", "baca", "SELECT id FROM bl_proyek WHERE id > ?1 AND id < ?2 ORDER BY id DESC LIMIT 1").bind(awal + "00", awal + "99~").first();
    const nn = (akhir ? Number(akhir.id.slice(9)) : 0) + 1;
    if (nn > 99) throw new Galat(429, "kode proyek hari ini habis (99 per hari)");
    const id = awal + String(nn).padStart(2, "0");
    try {
      const r = await sedia(env, p, "bl_proyek", "tambah", `INSERT INTO bl_proyek (id, wa_sha, jenis, tanggal, status, versi, dibuat, diubah)
        SELECT ?1, ?2, ?3, ?4, 'terbuka', 0, ?5, ?5 WHERE NOT EXISTS (SELECT 1 FROM bl_proyek WHERE wa_sha = ?2 AND status IN ${BL_AKTIF_SQL} AND jenis = ?3 AND tanggal = ?4)`)
        .bind(id, waSha, jenis, tanggal, kini).run();
      if (r.meta.changes === 1) return {proyek: await blProyekById(env, p, id), baru: true};
      const lain = await blProyekAktif(env, p, waSha, jenis, tanggal); if (lain) return {proyek: lain, baru: false};
    } catch (e) { if (!/UNIQUE|PRIMARY/i.test(String(e?.message ?? e))) throw e; }
  }
  throw new Galat(503, "kode proyek bentrok; coba lagi");
}
/* pindah status dengan pembanding status dan versi lama (balapan = 0 baris = false). drive_url hanya saat ke ditutup. */
export async function blProyekPindah(env, p, {id, ke, driveUrl = null}, kini) {
  const pr = await blProyekById(env, p, id); if (!pr) throw new Galat(404, "proyek tidak ada");
  if (!blBolehPindah(pr.status, ke, pr.versi)) throw new Galat(409, `transisi ${pr.status} ke ${ke} tidak sah${["draf", "final"].includes(ke) && pr.versi < 1 ? " (belum ada versi)" : ""}`);
  const r = await sedia(env, p, "bl_proyek", "ubah", "UPDATE bl_proyek SET status = ?2, diubah = ?3, drive_url = COALESCE(?4, drive_url) WHERE id = ?1 AND status = ?5 AND versi = ?6")
    .bind(id, ke, kini, ke === "ditutup" ? driveUrl : null, pr.status, pr.versi).run();
  if (r.meta.changes !== 1) throw new Galat(409, "status proyek berubah bersamaan; baca ulang");
  return {...pr, status: ke, diubah: kini, drive_url: ke === "ditutup" && driveUrl ? driveUrl : pr.drive_url, dari: pr.status};
}
/* daftar untuk staf /pelaporan: tanpa wa_sha, isian, bahan; nama pemegang dari bl_daftar setuju bila ada */
export const blProyekStaf = async (env, p, sejak) => {
  izin(p, "bl_daftar", "baca");
  return (await sedia(env, p, "bl_proyek", "baca", `SELECT r.id, r.jenis, r.tanggal, r.status, r.versi, r.drive_url, r.dibuat, r.diubah, d.nama pemegang FROM bl_proyek r
    LEFT JOIN bl_daftar d ON d.wa_sha = r.wa_sha AND d.status = 'setuju' WHERE r.status IN ('terbuka', 'bertanya', 'membangun', 'draf', 'final', 'ditutup', 'batal', 'kedaluwarsa') AND r.diubah >= ?1
    ORDER BY r.diubah DESC LIMIT 200`).bind(sejak).all()).results;
};

/* ---- bahan: tautan ke wa_masuk lewat wa_id; ganda diabaikan (PK); tiap tambah menyegarkan diubah (aktivitas untuk kedaluwarsa Q7) ---- */
export async function blBahanTambah(env, p, id, bahan, kini) {
  if (!bahan.length) return 0;
  const s = bahan.map(b => sedia(env, p, "bl_bahan", "tambah", `INSERT INTO bl_bahan (proyek_id, wa_id, jenis_bahan, ditambah)
    SELECT ?1, ?2, ?3, ?4 WHERE EXISTS (SELECT 1 FROM bl_proyek WHERE id = ?1 AND status IN ${BL_AKTIF_SQL}) ON CONFLICT (proyek_id, wa_id) DO NOTHING`).bind(id, b.wa_id, b.jenis_bahan ?? null, kini));
  const r = await env.DB.batch([...s, sedia(env, p, "bl_proyek", "ubah", `UPDATE bl_proyek SET diubah = ?2 WHERE id = ?1 AND status IN ${BL_AKTIF_SQL}`).bind(id, kini)]);
  return r.slice(0, -1).reduce((n, x) => n + x.meta.changes, 0);
}
export const blBahanDaftar = async (env, p, id) => (await sedia(env, p, "bl_bahan", "baca", "SELECT wa_id, jenis_bahan, ditambah FROM bl_bahan WHERE proyek_id = ?1 ORDER BY ditambah, wa_id LIMIT 200").bind(id).all()).results;

/* ---- versi (D6): append-only. n harus = versi proyek + 1 dan proyek masih aktif; INSERT dan naik versi sebatch dengan syarat yang sama,
   jadi n yang sudah ada = galat PK (tidak pernah menimpa) dan n melompat = 0 baris. Berkas R2 tiap percobaan di awalan unik v<n>-<acak>/ (src/wa_proyek.js). ---- */
export async function blVersiTambah(env, p, v, kini) {
  const syarat = `EXISTS (SELECT 1 FROM bl_proyek WHERE id = ?1 AND versi = ?2 - 1 AND status IN ${BL_AKTIF_SQL})`;
  try {
    const [a] = await env.DB.batch([
      sedia(env, p, "bl_versi", "tambah", `INSERT INTO bl_versi (proyek_id, n, isian_r2, ubah_r2, pptx_r2, pdf_r2, instruksi, peringatan, dibuat) SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9 WHERE ${syarat}`)
        .bind(v.id, v.n, v.isian_r2 ?? null, v.ubah_r2 ?? null, v.pptx_r2 ?? null, v.pdf_r2 ?? null, v.instruksi ?? null, v.peringatan ?? null, kini),
      sedia(env, p, "bl_proyek", "ubah", `UPDATE bl_proyek SET versi = ?2, diubah = ?3 WHERE id = ?1 AND versi = ?2 - 1 AND status IN ${BL_AKTIF_SQL}`).bind(v.id, v.n, kini)]);
    return a.meta.changes === 1;
  } catch (e) { if (/UNIQUE|PRIMARY/i.test(String(e?.message ?? e))) throw new Galat(409, `versi ${v.n} sudah ada; versi tidak bisa ditimpa`); throw e; }
}
const BL_KOL_VERSI = "proyek_id, n, isian_r2, ubah_r2, pptx_r2, pdf_r2, instruksi, peringatan, dibuat";
export const blVersiBaca = (env, p, id, n) => sedia(env, p, "bl_versi", "baca", `SELECT ${BL_KOL_VERSI} FROM bl_versi WHERE proyek_id = ?1 AND n = ?2`).bind(id, n).first();
export const blVersiDaftar = async (env, p, id) => (await sedia(env, p, "bl_versi", "baca", `SELECT ${BL_KOL_VERSI} FROM bl_versi WHERE proyek_id = ?1 ORDER BY n LIMIT 999`).bind(id).all()).results;

/* ---- pola revisi (K10, A9, Q12 BAWAAN SEMENTARA: 3 kejadian dalam 14 hari dari minimal 2 proyek; ditolak = tidak diusulkan 30 hari).
   Kejadian per (proyek, versi) dicatat pemanggil di R2 (bl_pola hanya punya hitung); fungsi murni blPolaNilai memutuskan status. ---- */
export const BL_POLA = {hari: 14, kali: 3, proyek: 2, tolakHari: 30};
const BL_KOL_POLA = "id, jenis, slide_judul, operasi, ringkas, hitung, status, diubah";
export const blPolaById = (env, p, id) => sedia(env, p, "bl_pola", "baca", `SELECT ${BL_KOL_POLA} FROM bl_pola WHERE id = ?1`).bind(id).first();
export const blPolaJenis = async (env, p, jenis) => (await sedia(env, p, "bl_pola", "baca", `SELECT ${BL_KOL_POLA} FROM bl_pola WHERE jenis = ?1 AND status IN ('diusulkan', 'aturan') ORDER BY status, diubah DESC LIMIT 100`).bind(jenis).all()).results;
/* row lama (atau null), label, kejadian dalam jendela -> {baris baru, capai: baru saja mencapai ambang} */
export function blPolaNilai(lama, label, kejadian, kini) {
  const jendela = kejadian.filter(k => kini - k.t <= BL_POLA.hari * 864e5), nProyek = new Set(jendela.map(k => k.p)).size;
  const cukup = jendela.length >= BL_POLA.kali && nProyek >= BL_POLA.proyek;
  let status = lama?.status ?? "mengamati", diubah = lama?.diubah ?? kini;
  if (status === "ditolak" && kini - diubah >= BL_POLA.tolakHari * 864e5) { status = "mengamati"; diubah = kini; }
  const capai = status === "mengamati" && cukup;
  if (capai) { status = "diusulkan"; diubah = kini; }
  if (!lama) diubah = kini;
  return {baris: {id: lama?.id ?? label.id, jenis: lama?.jenis ?? label.jenis, slide_judul: lama?.slide_judul ?? label.slide_judul, operasi: lama?.operasi ?? label.operasi, ringkas: lama?.ringkas ?? label.ringkas, hitung: jendela.length, status, diubah}, capai};
}
export const blPolaSimpan = (env, p, b) => sedia(env, p, "bl_pola", "tambah", `INSERT INTO bl_pola (id, jenis, slide_judul, operasi, ringkas, hitung, status, diubah) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
  ON CONFLICT (id) DO UPDATE SET hitung = excluded.hitung, status = excluded.status, diubah = excluded.diubah`).bind(b.id, b.jenis, b.slide_judul, b.operasi, b.ringkas, b.hitung, b.status, b.diubah).run();
/* putusan pemilik atas usulan: aturan atau ditolak, hanya dari diusulkan */
export const blPolaPutus = async (env, p, id, putusan, kini) => (await sedia(env, p, "bl_pola", "ubah", "UPDATE bl_pola SET status = ?2, diubah = ?3 WHERE id = ?1 AND status = 'diusulkan'").bind(id, putusan, kini).run()).meta.changes === 1;

/* ---- daftar nomor (K14, A1): menunggu dari pesan daftar; setuju/tolak dari putusan pemilik (dijaga gateway). Nomor setuju tidak diturunkan oleh daftar ulang;
   nomor tolak baru boleh menunggu lagi BL_TOLAK_HARI sesudah ditolak (dibuat = waktu putusan tolak), sebelum itu tetap tolak dan gateway diam. ---- */
export const BL_TOLAK_HARI = 30;
export async function blDaftarTulis(env, p, {waSha, nama = null, instansi = null, status}, kini) {
  const s = status === "menunggu"
    ? sedia(env, p, "bl_daftar", "tambah", `INSERT INTO bl_daftar (wa_sha, nama, instansi, status, dibuat) VALUES (?1, ?2, ?3, 'menunggu', ?4)
        ON CONFLICT (wa_sha) DO UPDATE SET nama = excluded.nama, instansi = excluded.instansi, status = 'menunggu', dibuat = excluded.dibuat
        WHERE bl_daftar.status = 'menunggu' OR (bl_daftar.status = 'tolak' AND bl_daftar.dibuat <= ?5)`).bind(waSha, nama, instansi, kini, kini - BL_TOLAK_HARI * 864e5)
    : sedia(env, p, "bl_daftar", "ubah", `INSERT INTO bl_daftar (wa_sha, nama, instansi, status, dibuat) VALUES (?1, ?2, ?3, ?4, ?5)
        ON CONFLICT (wa_sha) DO UPDATE SET status = excluded.status, nama = COALESCE(excluded.nama, bl_daftar.nama), instansi = COALESCE(excluded.instansi, bl_daftar.instansi),
          dibuat = CASE WHEN excluded.status = 'tolak' AND bl_daftar.status != 'tolak' THEN excluded.dibuat ELSE bl_daftar.dibuat END`).bind(waSha, nama, instansi, status, kini);
  await s.run();
  return sedia(env, p, "bl_daftar", "baca", "SELECT status, nama, instansi, dibuat FROM bl_daftar WHERE wa_sha = ?1").bind(waSha).first();
}
export const blMenungguHitung = async (env, p) => (await sedia(env, p, "bl_daftar", "baca", "SELECT count(*) n FROM bl_daftar WHERE status = 'menunggu'").first()).n;
/* satu nomor (lewat PK): dipakai src/wa.js untuk kiriman gateway berkunci yang membawa wa_sha, jadi pencabutan berlaku seketika tanpa menunggu salinan gateway */
export const blDaftarSetuju = async (env, p, waSha) => !!(await sedia(env, p, "bl_daftar", "baca", "SELECT 1 ada FROM bl_daftar WHERE wa_sha = ?1 AND status = 'setuju'").bind(waSha).first());
export const blTerdaftar = async (env, p) => (await sedia(env, p, "bl_daftar", "baca", "SELECT wa_sha FROM bl_daftar WHERE status = 'setuju' ORDER BY wa_sha LIMIT 5000").all()).results.map(r => r.wa_sha);

/* ---- biaya harian (A10, Q5), mikro-USD ---- */
/* pemantau biaya /admin/biaya-bot: jumlah harian sejak tanggal (PK tanggal, paling banyak 400 baris) */
export const blBiayaRentang = async (env, p, dari) => (await sedia(env, p, "bl_biaya", "baca", "SELECT tanggal, usd_mikro FROM bl_biaya WHERE tanggal >= ?1 ORDER BY tanggal LIMIT 400").bind(dari).all()).results;
export const blBiayaBaca = async (env, p, tanggal) => (await sedia(env, p, "bl_biaya", "baca", "SELECT usd_mikro FROM bl_biaya WHERE tanggal = ?1").bind(tanggal).first())?.usd_mikro ?? 0;
export const blBiayaTambah = async (env, p, tanggal, usdMikro) => (await sedia(env, p, "bl_biaya", "tambah", `INSERT INTO bl_biaya (tanggal, usd_mikro) VALUES (?1, ?2)
  ON CONFLICT (tanggal) DO UPDATE SET usd_mikro = bl_biaya.usd_mikro + excluded.usd_mikro RETURNING usd_mikro`).bind(tanggal, usdMikro).first()).usd_mikro;

/* ---- detak mesin (K11, Q2) ---- */
export const blDetakBaca = async (env, p, mesin) => (await sedia(env, p, "bl_detak", "baca", "SELECT terakhir FROM bl_detak WHERE mesin = ?1").bind(mesin).first())?.terakhir ?? null;
export const blDetakTulis = (env, p, mesin, kini) => sedia(env, p, "bl_detak", "tambah", "INSERT INTO bl_detak (mesin, terakhir) VALUES (?1, ?2) ON CONFLICT (mesin) DO UPDATE SET terakhir = excluded.terakhir").bind(mesin, kini).run();
export const blDetakSemua = async (env, p) => (await sedia(env, p, "bl_detak", "baca", "SELECT mesin, terakhir FROM bl_detak WHERE mesin > '' ORDER BY mesin LIMIT 20").all()).results;

/* ---------- Lapor Bencana BNPB (LA-05, LA-06, LA-10; data/kajian-bnpb/lapor-ai/DESAIN-TEKNIS.md, migrasi 0155) ----------
   SQL saja; validasi, izin, dan alur ada di src/lapor_ai.js. Pelaku: lp_pelapor = pemilik nomor (sesi /masuk atau gateway WA_MESIN yang membawa nomor),
   lp_publik = pemegang tautan lacak atau pembaca alun-alun (tanpa identitas), lp_staf = admin/staf meja, lp_mesin = mesin Mac mini (PDF dan kabar).
   lapor_tiket_riwayat dan lapor_pesan append-only: hanya INSERT di sini. Tiap kueri lewat PK atau indeks 0155 (kuota baca D1 Free). */
Object.assign(MATRIKS, {
  lapor_pelapor:       {lp_pelapor: ["baca", "tambah", "ubah"], lp_publik: ["baca"], lp_staf: ["baca"], lp_mesin: ["baca"]},
  lapor_izin:          {lp_pelapor: ["baca"], lp_cron: ["baca"], lp_mesin: ["baca", "tambah", "ubah", "hapus"], lp_staf: ["baca", "tambah", "ubah", "hapus"]},
  lapor_sesi:          {lp_pelapor: ["baca", "tambah", "ubah"], lp_publik: ["baca"], lp_staf: ["baca", "ubah"], lp_mesin: ["baca"]},   // staf ubah: hanya revisi angka pengecekan (D110), lewat rev
  lapor_pesan:         {lp_pelapor: ["tambah"], lp_staf: ["baca"]},
  lapor_foto:          {lp_pelapor: ["baca", "tambah"], lp_publik: ["baca"], lp_staf: ["baca"], lp_mesin: ["baca"]},
  lapor_tiket:         {lp_pelapor: ["baca", "tambah"], lp_publik: ["baca"], lp_staf: ["baca", "ubah"], lp_mesin: ["baca"]},
  lapor_tiket_riwayat: {lp_pelapor: ["tambah"], lp_publik: ["baca"], lp_staf: ["baca", "tambah"], lp_mesin: ["baca"]},
  lapor_balasan:       {lp_publik: ["baca"], lp_staf: ["baca", "tambah"], lp_mesin: ["baca"]},
  lapor_kabar:         {lp_pelapor: ["baca"], lp_staf: ["tambah"], lp_mesin: ["baca", "tambah", "ubah"]},
  lapor_urut:          {lp_pelapor: ["tambah"]},
  lapor_versi:         {lp_pelapor: ["baca", "tambah"], lp_publik: ["baca"], lp_hari: ["baca"], lp_staf: ["baca", "tambah"], lp_mesin: ["baca"]},
  lapor_pdf:           {lp_pelapor: ["tambah"], lp_publik: ["baca"], lp_staf: ["tambah"], lp_mesin: ["baca", "ubah"]},
  lapor_bukti:         {lp_staf: ["baca", "tambah", "ubah"], lp_publik: ["baca"], lp_mesin: ["baca"]},
  lapor_akses:         {lp_staf: ["tambah"]},
  lapor_unduh:         {lp_staf: ["tambah"]},
  lapor_kabar_bpbd:    {lp_staf: ["baca", "tambah"], lp_mesin: ["baca", "ubah"]},
  laju_bnpb:           {sistem: ["baca", "tambah"], lp_pelapor: ["baca", "tambah"]},
  lapor_unggah:        {lp_pelapor: ["baca", "tambah", "ubah", "hapus"], lp_cron: ["baca", "hapus"]},   // lp_cron = bersih-bersih menit 17 (D90)
  lapor_perangkat:     {lp_pelapor: ["baca", "tambah", "ubah"]},   // migrasi 0159: ikatan nomor ketikan dan perangkat (K65, D100)
  lapor_milik:         {lp_pelapor: ["baca", "tambah", "hapus"], lp_publik: ["baca"], lp_cron: ["hapus"]},
  lapor_kelompok:      {lp_pelapor: ["baca", "tambah"], lp_staf: ["baca", "hapus"]},   // migrasi 0160: kejadian yang sama (K66, D103-D107)
  lapor_kelompok_urut: {lp_pelapor: ["tambah"]},
  /* data lanjutan BPBD (migrasi 0161, paket lapor-lanjutan, LJ-01). lj_tim = ketua dan anggota berkas lewat kuki per orang (D20);
     lp_cron = pertanyaan harian (D12) dan hapus data pribadi 5 tahun (D23); lp_mesin = gateway WA (antrean lj_kabar, gerbang izin anggota D11).
     Append-only: lj_jejak, lj_beku, lj_akses tanpa ubah dan hapus. Staf membaca pribadi hanya lewat Tampilkan yang menulis lj_akses (D22). */
  lj_berkas:           {lp_pelapor: ["baca", "tambah"], lj_tim: ["baca", "ubah"], lp_staf: ["baca", "ubah"], lp_cron: ["baca"]},
  lj_tim:              {lp_pelapor: ["baca", "tambah"], lj_tim: ["baca", "tambah", "ubah"], lp_staf: ["baca", "ubah"], lp_cron: ["baca"], lp_mesin: ["baca"]},
  lj_objek:            {lj_tim: ["baca", "tambah", "ubah"], lp_staf: ["baca"], lp_cron: ["baca", "ubah"]},
  lj_jejak:            {lj_tim: ["baca", "tambah"], lp_staf: ["baca", "tambah"], lp_cron: ["tambah", "ubah"]},   // lp_cron ubah: hanya mengosongkan pribadi_sidik saat masa simpan 5 tahun habis (LJ-17, K9)
  lj_media:            {lj_tim: ["baca", "tambah", "hapus"], lp_staf: ["baca"], lp_cron: ["baca", "hapus"]},
  lj_tanya:            {lj_tim: ["baca", "ubah"], lp_cron: ["baca", "tambah"]},
  lj_kabar:            {lp_pelapor: ["tambah"], lj_tim: ["tambah"], lp_staf: ["tambah"], lp_cron: ["tambah", "hapus"], lp_mesin: ["baca", "ubah"]},   // LJ-11: lp_cron hapus pembuka basi dan baris terkirim lama
  lj_beku:             {lj_tim: ["baca", "tambah"], lp_staf: ["baca"]},
  lj_akses:            {lj_tim: ["tambah"], lp_staf: ["baca", "tambah"]},
  titik_pengungsian:   {lj_tim: ["baca", "tambah", "ubah"]},   // LJ-06: register TP dibuat atau disinkronkan dari objek titik berkas (D6); tp* di atas tetap untuk rute meja
  lj_sesi:             {lj_tim: ["baca", "tambah", "ubah", "hapus"], lp_staf: ["hapus"], lp_mesin: ["baca"], lp_cron: ["baca", "hapus"]},   // migrasi 0165: draf percakapan WA tahap 2 (D24), dibuang 24 jam
  lapor_periksa:       {lp_staf: ["baca", "tambah"], lp_hari: ["baca"]},   // migrasi 0162: pengecekan lapangan, append-only (K69, D108); lp_hari = rute publik hari ini, hanya lewat lpPeriksaValidSejak dan lpPeriksaAkunNomor (LK-05)
  lapor_tindakan:      {lp_staf: ["baca", "tambah"]},   // migrasi 0162: jenis tindakan, append-only (K70, D112)
  lk_periksa_akun:     {lp_staf: ["baca", "tambah"], lp_hari: ["baca"]},   // migrasi 0169: penanda jenis dan wilayah pemeriksa, append-only (lapor-kejadian LK-02, A3)
  lk_tarik:            {lp_staf: ["baca", "tambah"], lp_hari: ["baca"]},   // migrasi 0170: tarikan dari halaman publik, append-only (LK-03, D8); lp_hari membaca untuk menyaring kartu
  lk_usulan:           {lp_staf: ["baca", "tambah"]},   // migrasi 0170: usulan ke Buku Besar, append-only (LK-03, D9); status dari sk_kejadian_sumber (A7)
  lapor_selamat:       {lp_pelapor: ["baca", "tambah", "ubah"], lp_publik: ["baca"], lp_staf: ["baca"], lp_cron: ["hapus"]},   // migrasi 0173: kabar selamat (K91, D126-D130); publik hanya lewat token
  lapor_cari:          {lp_pelapor: ["baca", "tambah"], lp_staf: ["baca", "ubah"], lp_cron: ["ubah"]},   // migrasi 0173: orang dicari, tidak pernah publik (D129); pelapor baca hanya miliknya (crMilik)
  lapor_cari_riwayat:  {lp_staf: ["baca", "tambah"]},   // migrasi 0173: append-only
  lapor_cari_temu:     {lp_pelapor: ["tambah"], lp_staf: ["baca"], lp_cron: ["hapus"]},   // migrasi 0177: panggilan, nomor kontak, tempat tunggu (pemilik 25 Nov 2026); dihapus bersama anonim Q67
  lapor_cari_foto:     {lp_pelapor: ["tambah"], lp_staf: ["baca"], lp_cron: ["baca", "hapus"]},   // migrasi 0185: foto orang dicari (pemilik 26 Nov 2026); berkas R2 dan baris dihapus bersama anonim Q67
  lapor_cari_foto_lain: {lp_pelapor: ["tambah"], lp_staf: ["baca"], lp_cron: ["baca", "hapus"]},   // migrasi 0186: foto ke-2 sampai ke-10 orang dicari, aturan sama dengan lapor_cari_foto
  lp_komen:            {lp_pelapor: ["baca", "tambah", "ubah"], lp_publik: ["baca"], lp_staf: ["baca", "ubah"]},   // migrasi 0180: komentar kartu Alun-alun (K95, D136); publik hanya kolom id, teks, dibuat
  lp_komen_aduan:      {lp_pelapor: ["baca", "tambah"], lp_staf: ["baca"]},
  lp_komen_usul:       {lp_mesin: ["tambah"], lp_staf: ["baca", "ubah"]},   // LA-86 menulis, LA-88 memutus
  lp_komen_putus:      {lp_staf: ["baca", "tambah"]},   // migrasi 0183: riwayat keputusan meja (LA-88), append-only
});
/* peringatan dini warga Pantau Bencana (migrasi 0163, paket pwa-peringatan PW-01). pw_publik = rute langganan tanpa akun (endpoint push = rahasia pemegangnya);
   pw_cron = pemicu dan pengirim tiap menit plus bersih-bersih; lp_staf = ringkasan staf. Tidak ada data orang selain endpoint push dan kode kecamatan. */
Object.assign(MATRIKS, {
  pw_langganan: {pw_publik: ["baca", "tambah", "ubah", "hapus"], pw_cron: ["baca", "hapus"], lp_staf: ["baca"]},
  pw_status:    {pw_cron: ["baca", "tambah", "ubah", "hapus"]},
  pw_peristiwa: {pw_cron: ["baca", "tambah", "ubah", "hapus"], lp_staf: ["baca"]},
  pw_kendali:   {pw_cron: ["baca", "tambah", "ubah"], lp_staf: ["baca", "tambah", "ubah"]},
  pw_kendali_status: {pw_cron: ["baca", "tambah", "ubah"]},   // migrasi 0184 (DP-13)
  pw_kirim_harian:   {pw_cron: ["baca", "tambah", "hapus"]},
});
export const pelakuPwPublik = {peran: "pw_publik"}, pelakuPwCron = {peran: "pw_cron"};
const PW_KOL = "id, endpoint, p256dh, auth, kec_kode, kab_kode, kec_nama, jenis, ambang, bahasa, uji";
export const pwMilik = async (env, p, endpoint) => (await sedia(env, p, "pw_langganan", "baca", `SELECT kec_kode, kec_nama, jenis, ambang, bahasa FROM pw_langganan WHERE endpoint = ?1 LIMIT 3`).bind(endpoint).all()).results;
export const pwJumlah = (env, p) => sedia(env, p, "pw_langganan", "baca", "SELECT count(*) n FROM pw_langganan").first("n");
export const pwSimpanStmt = (env, p, b, kini) => sedia(env, p, "pw_langganan", "tambah",
  `INSERT INTO pw_langganan (${PW_KOL}, dibuat, terakhir_aktif) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?12)
   ON CONFLICT(id) DO UPDATE SET p256dh = excluded.p256dh, auth = excluded.auth, kec_nama = excluded.kec_nama, jenis = excluded.jenis, ambang = excluded.ambang,
   bahasa = excluded.bahasa, terakhir_aktif = excluded.terakhir_aktif`).bind(b.id, b.endpoint, b.p256dh, b.auth, b.kec_kode, b.kab_kode, b.kec_nama, b.jenis, b.ambang, b.bahasa, b.uji, kini);
export const pwHapusLainStmt = (env, p, endpoint, simpan) => sedia(env, p, "pw_langganan", "hapus",
  `DELETE FROM pw_langganan WHERE endpoint = ?1 AND kec_kode NOT IN (SELECT value FROM json_each(?2))`).bind(endpoint, JSON.stringify(simpan));
export const pwBerhenti = (env, p, endpoint) => sedia(env, p, "pw_langganan", "hapus", "DELETE FROM pw_langganan WHERE endpoint = ?1").bind(endpoint).run();
export const pwBatch = (env, p, stmts) => { if (!String(p?.peran).startsWith("pw_")) throw new Galat(403, "batch peringatan hanya untuk pelaku pw_*"); return env.DB.batch(stmts); };
export const pwKendali = async (env, p) => Object.fromEntries((await sedia(env, p, "pw_kendali", "baca", "SELECT kunci, nilai FROM pw_kendali").all()).results.map(r => [r.kunci, r.nilai]));
export const pwKendaliStmt = (env, p, kunci, nilai) => sedia(env, p, "pw_kendali", "ubah",
  "INSERT INTO pw_kendali (kunci, nilai) VALUES (?1, ?2) ON CONFLICT(kunci) DO UPDATE SET nilai = excluded.nilai").bind(kunci, String(nilai));
export const pwStatusDibuat = async (env, p) => (await sedia(env, p, "pw_kendali_status", "baca", "SELECT nilai FROM pw_kendali_status WHERE kunci = 'status_dibuat'").first())?.nilai ?? "";
export const pwStatusDibuatStmt = (env, p, nilai) => sedia(env, p, "pw_kendali_status", "ubah",
  "INSERT INTO pw_kendali_status (kunci, nilai) VALUES ('status_dibuat', ?1) ON CONFLICT(kunci) DO UPDATE SET nilai = excluded.nilai").bind(String(nilai));
export const pwKirimHarian = async (env, p, kab, tgl) => (await sedia(env, p, "pw_kirim_harian", "baca", "SELECT perangkat, jenis FROM pw_kirim_harian WHERE kab_kode = ?1 AND tanggal = ?2").bind(kab, tgl).all()).results;
export const pwKirimHarianStmt = (env, p, perangkat, kab, jenis, tgl) => sedia(env, p, "pw_kirim_harian", "tambah",
  "INSERT OR IGNORE INTO pw_kirim_harian (perangkat, kab_kode, jenis, tanggal) VALUES (?1, ?2, ?3, ?4)").bind(perangkat, kab, jenis, tgl);
export const pwStatusKab = async (env, p, kab, sejak) => (await sedia(env, p, "pw_status", "baca", "SELECT jenis, tanggal, level FROM pw_status WHERE kab_kode = ?1 AND tanggal >= ?2").bind(kab, sejak).all()).results;
export const pwStatusSemua = async (env, p, sejak) => (await sedia(env, p, "pw_status", "baca", "SELECT kab_kode, jenis, tanggal, level FROM pw_status WHERE tanggal >= ?1").bind(sejak).all()).results;
export const pwStatusStmt = (env, p, kab, jenis, tanggal, level) => sedia(env, p, "pw_status", "tambah",
  `INSERT INTO pw_status (kab_kode, jenis, tanggal, level) VALUES (?1, ?2, ?3, ?4) ON CONFLICT(kab_kode, jenis, tanggal) DO UPDATE SET level = max(level, excluded.level)`).bind(kab, jenis, tanggal, level);
export const pwPeristiwaStmt = (env, p, berkas, kab, ringkas, kini, tahan) => sedia(env, p, "pw_peristiwa", "tambah",
  "INSERT INTO pw_peristiwa (dibuat_berkas, kab_kode, ringkas, dibuat, ditahan_sampai) VALUES (?1, ?2, ?3, ?4, ?5)").bind(berkas, kab, ringkas, kini, tahan ?? null);
export const pwPeristiwaBerikut = (env, p, kini) => sedia(env, p, "pw_peristiwa", "baca",
  "SELECT id, kab_kode, ringkas, kursor FROM pw_peristiwa WHERE selesai = 0 AND (ditahan_sampai IS NULL OR ditahan_sampai <= ?1) ORDER BY id LIMIT 1").bind(kini).first();
export const pwPenerima = async (env, p, kab, kursor, uji) => (await sedia(env, p, "pw_langganan", "baca",
  `SELECT ${PW_KOL} FROM pw_langganan WHERE kab_kode = ?1 AND id > ?2 ${uji ? "AND uji = 1" : ""} ORDER BY id LIMIT 60`).bind(kab, kursor).all()).results;
export const pwPeristiwaMajuStmt = (env, p, id, kursor, selesai, ok, gagal, mati) => sedia(env, p, "pw_peristiwa", "ubah",
  "UPDATE pw_peristiwa SET kursor = ?2, selesai = ?3, ok = ok + ?4, gagal = gagal + ?5, mati = mati + ?6 WHERE id = ?1").bind(id, kursor, selesai ? 1 : 0, ok, gagal, mati);
export const pwHapusIdStmt = (env, p, id) => sedia(env, p, "pw_langganan", "hapus", "DELETE FROM pw_langganan WHERE id = ?1").bind(id);
export const pwBersih = (env, p, kini, tglBatas) => env.DB.batch([
  sedia(env, p, "pw_peristiwa", "hapus", "DELETE FROM pw_peristiwa WHERE dibuat < ?1").bind(kini - 30 * 864e5),
  sedia(env, p, "pw_status", "hapus", "DELETE FROM pw_status WHERE tanggal < ?1").bind(tglBatas),
  sedia(env, p, "pw_langganan", "hapus", "DELETE FROM pw_langganan WHERE terakhir_aktif < ?1").bind(kini - 180 * 864e5)]);
export const pwBersihHarian = (env, p, tglBatas) => sedia(env, p, "pw_kirim_harian", "hapus", "DELETE FROM pw_kirim_harian WHERE tanggal < ?1").bind(tglBatas).run();
export const pwRingkasStaf = async (env, p, kini) => ({
  langganan: (await sedia(env, p, "pw_langganan", "baca", "SELECT kab_kode, count(*) n FROM pw_langganan GROUP BY kab_kode ORDER BY n DESC LIMIT 50").all()).results,
  peristiwa: (await sedia(env, p, "pw_peristiwa", "baca", "SELECT id, kab_kode, ringkas, dibuat, selesai, ok, gagal, mati FROM pw_peristiwa WHERE dibuat >= ?1 ORDER BY id DESC LIMIT 100").bind(kini - 7 * 864e5).all()).results});

/* lp_hari = rute publik halaman hari ini (lapor-kejadian LK-05): pelaku sempit supaya pelebaran baca pengecekan tidak ikut ke rute publik lain (lp_publik) */
export const pelakuLpHari = {peran: "lp_hari"};
export const pelakuLpCron = {peran: "lp_cron"}, pelakuLpPelapor = {peran: "lp_pelapor"}, pelakuLpPublik = {peran: "lp_publik"}, pelakuLpStaf = {peran: "lp_staf"}, pelakuLpMesin = {peran: "lp_mesin"};

/* kabar selamat dan orang dicari (LA-80, migrasi 0173). Satu tanda aktif per nomor: yang lama dicabut (slCabut mengembalikan token_id-nya) sebelum yang baru ditambah.
   Token tautan di tautan_token lewat src/token.js; di sini hanya token_id. */
/* cabut tanda lama dan tambah yang baru dalam SATU batch (transaksi): gagal insert tidak menghilangkan tanda lama, dua POST serentak tidak membuat dua tanda aktif
   (indeks unik lapor_selamat_aktif). Mengembalikan token_id tanda yang dicabut. */
export const slGanti = async (env, p, nomor, b, kini) => { izin(p, "lapor_selamat", "ubah"); izin(p, "lapor_selamat", "tambah");
  const [lama] = await env.DB.batch([env.DB.prepare("UPDATE lapor_selamat SET dicabut = ?2 WHERE nomor = ?1 AND dicabut IS NULL RETURNING token_id").bind(nomor, kini),
    env.DB.prepare("INSERT INTO lapor_selamat (id, nomor, nama_panggil, status, kab, token_id, dibuat, kedaluwarsa) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)")
      .bind(b.id, nomor, b.nama_panggil, b.status, b.kab, b.token_id, kini, b.kedaluwarsa)]);
  return lama.results.map(r => r.token_id); };
export const slCabut = async (env, p, nomor, kini) => (await sedia(env, p, "lapor_selamat", "ubah",
  "UPDATE lapor_selamat SET dicabut = ?2 WHERE nomor = ?1 AND dicabut IS NULL RETURNING token_id").bind(nomor, kini).all()).results.map(r => r.token_id);
export const slAktif = (env, p, nomor, kini) => sedia(env, p, "lapor_selamat", "baca",
  "SELECT nama_panggil, status, kab, dibuat, kedaluwarsa FROM lapor_selamat WHERE nomor = ?1 AND dicabut IS NULL AND kedaluwarsa > ?2 ORDER BY dibuat DESC LIMIT 1").bind(nomor, kini).first();
export const slById = (env, p, id, kini) => sedia(env, p, "lapor_selamat", "baca",
  "SELECT nama_panggil, status, kab, dibuat FROM lapor_selamat WHERE id = ?1 AND dicabut IS NULL AND kedaluwarsa > ?2").bind(id, kini).first();
/* tanda aktif untuk sekumpulan nomor (pencocokan D130: nomor sama persis, tidak pernah nama) */
export const slAktifNomor = async (env, p, daftar, kini) => daftar.length ? (await sedia(env, p, "lapor_selamat", "baca",
  "SELECT nomor, status, dibuat FROM lapor_selamat WHERE nomor IN (SELECT value FROM json_each(?1)) AND dicabut IS NULL AND kedaluwarsa > ?2").bind(JSON.stringify(daftar), kini).all()).results : [];
export const slBersih = (env, p, batas) => sedia(env, p, "lapor_selamat", "hapus", "DELETE FROM lapor_selamat WHERE dibuat < ?1").bind(batas).run();
export const crTambah = (env, p, b, kini) => sedia(env, p, "lapor_cari", "tambah",
  "INSERT INTO lapor_cari (id, nomor_pencari, nama_dicari, ciri, lokasi_terakhir, waktu_terakhir, nomor_dicari, hubungan, kab, dibuat) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)")
  .bind(b.id, b.nomor_pencari, b.nama_dicari, b.ciri, b.lokasi_terakhir, b.waktu_terakhir, b.nomor_dicari, b.hubungan, b.kab, kini).run();
/* wilayah disaring di SQL (awalan kode kab/prov) supaya LIMIT 500 global tidak menyembunyikan laporan wilayah akun; prefiks null = semua (BNPB) */
/* komentar kartu Alun-alun (migrasi 0180, LA-85). Jawaban publik hanya id, teks, dibuat; nomor penulis tidak pernah dibaca jalur publik. */
export const kmDaftarPublik = async (env, p, kartu) => (await sedia(env, p, "lp_komen", "baca",
  "SELECT id, teks, dibuat FROM lp_komen WHERE kartu = ?1 AND status = 'tampil' ORDER BY dibuat LIMIT 200").bind(kartu).all()).results;
export const kmTambah = (env, p, b) => sedia(env, p, "lp_komen", "tambah",
  "INSERT INTO lp_komen (id, kartu, sesi, wa, teks, dibuat) VALUES (?1, ?2, ?3, ?4, ?5, ?6)").bind(b.id, b.kartu, b.sesi, b.wa, b.teks, b.dibuat).run();
/* usulan angka dari komentar (LA-86): satu baris per kolom, status usul; tidak menyentuh laporan atau kartu */
export const kmUsulTambah = (env, p, komen, angka, kini) => { izin(p, "lp_komen_usul", "tambah");
  return env.DB.batch(angka.map(a => env.DB.prepare("INSERT INTO lp_komen_usul (komen, kolom, nilai, kutipan, dibuat) VALUES (?1, ?2, ?3, ?4, ?5)").bind(komen, a.kolom, a.nilai, a.kutipan, kini))); };
export const kmById = (env, p, id) => sedia(env, p, "lp_komen", "baca", "SELECT id, kartu, wa, status, aduan FROM lp_komen WHERE id = ?1").bind(id).first();
/* aduan: satu per pengadu (PK; sidik nomor atau IP, src/lapor_komen.js); hitungan naik hanya bila aduan baru tersimpan, dan aduan ke-ambang mengubah tampil -> dilaporkan, dalam satu batch */
export const kmAdu = async (env, p, id, pengadu, kini, ambang) => { izin(p, "lp_komen_aduan", "tambah"); izin(p, "lp_komen", "ubah");
  const [a] = await env.DB.batch([env.DB.prepare("INSERT OR IGNORE INTO lp_komen_aduan (komen, pengadu, waktu) VALUES (?1, ?2, ?3)").bind(id, pengadu, kini),
    env.DB.prepare("UPDATE lp_komen SET aduan = aduan + 1, status = CASE WHEN status = 'tampil' AND aduan + 1 >= ?2 THEN 'dilaporkan' ELSE status END WHERE id = ?1 AND changes() > 0").bind(id, ambang)]);
  return a.meta.changes > 0; };
/* meja (LA-88): semua komentar satu kartu dengan nomor penulis (penyaring identitas di pemanggil), usulan, riwayat keputusan, dan jumlah komentar tersembunyi per nomor (Q74) */
export const kmMejaDaftar = async (env, p, kartu) => (await sedia(env, p, "lp_komen", "baca",
  "SELECT id, wa, teks, status, aduan, dibuat FROM lp_komen WHERE kartu = ?1 ORDER BY dibuat LIMIT 200").bind(kartu).all()).results;
export const kmUsulKomen = async (env, p, ids) => ids.length ? (await sedia(env, p, "lp_komen_usul", "baca",
  "SELECT id, komen, kolom, nilai, kutipan, status, diputus_oleh, diputus FROM lp_komen_usul WHERE komen IN (SELECT value FROM json_each(?1)) ORDER BY id").bind(JSON.stringify(ids)).all()).results : [];
export const kmPutusKomen = async (env, p, ids) => ids.length ? (await sedia(env, p, "lp_komen_putus", "baca",
  "SELECT komen, usul, aksi, nomor, isian, alasan, oleh, waktu FROM lp_komen_putus WHERE komen IN (SELECT value FROM json_each(?1)) ORDER BY id").bind(JSON.stringify(ids)).all()).results : [];
/* kartu null = semua kejadian (staf BNPB); akun BPBD hanya kartu yang sedang dibuka (ulasan keamanan LA-88) */
export const kmTersembunyiWa = async (env, p, was, kartu = null) => was.length ? (await sedia(env, p, "lp_komen", "baca",
  "SELECT wa, count(*) n FROM lp_komen WHERE wa IN (SELECT value FROM json_each(?1)) AND status = 'tersembunyi' AND (?2 IS NULL OR kartu = ?2) GROUP BY wa").bind(JSON.stringify(was), kartu).all()).results : [];
export const kmUsulById = (env, p, id) => sedia(env, p, "lp_komen_usul", "baca",
  "SELECT u.id, u.komen, u.kolom, u.nilai, u.kutipan, u.status, k.kartu FROM lp_komen_usul u JOIN lp_komen k ON k.id = u.komen WHERE u.id = ?1").bind(id).first();
/* keputusan: usulan hanya berpindah dari usul (sekali); g = jalan hanya bila pernyataan sebelumnya mengubah baris (rantai batch) */
export const kmStmtUsulPutus = (env, p, id, status, oleh, kini, g = false) => sedia(env, p, "lp_komen_usul", "ubah",
  `UPDATE lp_komen_usul SET status = ?2, diputus_oleh = ?3, diputus = ?4 WHERE id = ?1 AND status = 'usul'${g ? " AND changes() > 0" : ""}`).bind(id, status, oleh, kini);
export const kmStmtStatus = (env, p, id, status) => sedia(env, p, "lp_komen", "ubah", "UPDATE lp_komen SET status = ?2 WHERE id = ?1 AND status <> ?2").bind(id, status);
export const kmStmtPutus = (env, p, b, g = false) => sedia(env, p, "lp_komen_putus", "tambah", lpIns(g, "", "lp_komen_putus", "komen, usul, aksi, nomor, isian, alasan, oleh, waktu"))
  .bind(b.komen, b.usul ?? null, b.aksi, b.nomor ?? null, b.isian ?? null, b.alasan ?? null, b.oleh, b.waktu);
export const crDaftar = async (env, p, prefiks = null) => (await sedia(env, p, "lapor_cari", "baca",
  "SELECT id, nomor_pencari, nama_dicari, ciri, lokasi_terakhir, waktu_terakhir, nomor_dicari, hubungan, kab, status, dibuat, ditutup_oleh, ditutup FROM lapor_cari WHERE (?1 IS NULL OR substr(kab, 1, length(?1)) = ?1) ORDER BY dibuat DESC LIMIT 500").bind(prefiks).all()).results;
/* Q67 (BAWAAN SEMENTARA): masa simpan 2 tahun sejak ditutup. Anonim, bukan hapus: id, kab, status, waktu tetap; kolom pribadi diganti nilai yang lolos CHECK 0173 (nomor_pencari NOT NULL, nama_dicari NOT NULL). Laporan "buka" tidak pernah tersentuh; riwayat append-only tidak disentuh. */
export const CARI_SIMPAN_HARI = 730, CARI_NOMOR_ANONIM = "62000000000", CARI_NAMA_ANONIM = "dihapus";
export const crAnonimkan = (env, p, batas) => sedia(env, p, "lapor_cari", "ubah",
  "UPDATE lapor_cari SET nomor_pencari = ?2, nama_dicari = ?3, ciri = NULL, lokasi_terakhir = NULL, nomor_dicari = NULL, hubungan = NULL WHERE status <> 'buka' AND ditutup < ?1 AND nomor_pencari <> ?2")
  .bind(batas, CARI_NOMOR_ANONIM, CARI_NAMA_ANONIM).run();
/* tambahan 0177 ditulis sesudah batch sesi (bukan di dalamnya) supaya laporan tetap masuk selama migrasi belum diterapkan di produksi */
export const ctTambah = (env, p, b) => sedia(env, p, "lapor_cari_temu", "tambah",
  "INSERT OR IGNORE INTO lapor_cari_temu (cari_id, panggilan, nomor_kontak, tempat_tunggu) VALUES (?1, ?2, ?3, ?4)").bind(b.cari_id, b.panggilan, b.nomor_kontak, b.tempat_tunggu).run();
export const ctBaca = async (env, p, ids) => ids.length ? (await sedia(env, p, "lapor_cari_temu", "baca",
  "SELECT cari_id, panggilan, nomor_kontak, tempat_tunggu FROM lapor_cari_temu WHERE cari_id IN (SELECT value FROM json_each(?1))").bind(JSON.stringify(ids)).all()).results : [];
export const cfTambah = (env, p, cari_id, foto_id) => sedia(env, p, "lapor_cari_foto", "tambah",
  "INSERT OR IGNORE INTO lapor_cari_foto (cari_id, foto_id) VALUES (?1, ?2)").bind(cari_id, foto_id).run();
/* foto ke-2 sampai ke-10 (0186); pemanggil menangkap galat tabel belum ada seperti 0185 */
export const cfBacaLain = async (env, p, ids) => ids.length ? (await sedia(env, p, "lapor_cari_foto_lain", "baca",
  "SELECT cari_id, foto_id FROM lapor_cari_foto_lain WHERE cari_id IN (SELECT value FROM json_each(?1)) ORDER BY rowid").bind(JSON.stringify(ids)).all()).results : [];
export const cfTambahLain = (env, p, cari_id, foto_id) => sedia(env, p, "lapor_cari_foto_lain", "tambah",
  "INSERT OR IGNORE INTO lapor_cari_foto_lain (cari_id, foto_id) VALUES (?1, ?2)").bind(cari_id, foto_id).run();
export const cfAnonimFotoLain = async (env, p) => (await sedia(env, p, "lapor_cari_foto_lain", "baca",
  "SELECT foto_id FROM lapor_cari_foto_lain WHERE cari_id IN (SELECT id FROM lapor_cari WHERE nomor_pencari = ?1)").bind(CARI_NOMOR_ANONIM).all()).results.map(r => r.foto_id);
export const cfAnonimLain = (env, p) => sedia(env, p, "lapor_cari_foto_lain", "hapus",
  "DELETE FROM lapor_cari_foto_lain WHERE cari_id IN (SELECT id FROM lapor_cari WHERE nomor_pencari = ?1)").bind(CARI_NOMOR_ANONIM).run();
export const cfBaca = async (env, p, ids) => ids.length ? (await sedia(env, p, "lapor_cari_foto", "baca",
  "SELECT cari_id, foto_id FROM lapor_cari_foto WHERE cari_id IN (SELECT value FROM json_each(?1))").bind(JSON.stringify(ids)).all()).results : [];
export const cfAnonimFoto = async (env, p) => (await sedia(env, p, "lapor_cari_foto", "baca",
  "SELECT foto_id FROM lapor_cari_foto WHERE cari_id IN (SELECT id FROM lapor_cari WHERE nomor_pencari = ?1)").bind(CARI_NOMOR_ANONIM).all()).results.map(r => r.foto_id);
export const cfAnonim = (env, p) => sedia(env, p, "lapor_cari_foto", "hapus",
  "DELETE FROM lapor_cari_foto WHERE cari_id IN (SELECT id FROM lapor_cari WHERE nomor_pencari = ?1)").bind(CARI_NOMOR_ANONIM).run();
export const ctAnonim = (env, p) => sedia(env, p, "lapor_cari_temu", "hapus",
  "DELETE FROM lapor_cari_temu WHERE cari_id IN (SELECT id FROM lapor_cari WHERE nomor_pencari = ?1)").bind(CARI_NOMOR_ANONIM).run();
/* orang dicari lewat obrolan (K105): satu pernyataan di batch sesi supaya sesi "cari_terkirim" dan baris lapor_cari tersimpan bersama (g = hanya bila pernyataan sebelumnya mengubah baris) */
export const crStmtTambah = (env, p, b, kini, g = false) => sedia(env, p, "lapor_cari", "tambah",
  lpIns(g, "", "lapor_cari", "id, nomor_pencari, nama_dicari, ciri, lokasi_terakhir, waktu_terakhir, nomor_dicari, hubungan, kab, dibuat"))
  .bind(b.id, b.nomor_pencari, b.nama_dicari, b.ciri, b.lokasi_terakhir, b.waktu_terakhir, b.nomor_dicari, b.hubungan, b.kab, kini);
/* laporan orang dicari milik satu pencari untuk daftar Laporan saya (pemilik 25 Nov 2026): tanpa nomor siapa pun, tanpa ciri */
export const crMilik = async (env, p, nomor) => (await sedia(env, p, "lapor_cari", "baca",
  "SELECT id, nama_dicari, kab, status, dibuat FROM lapor_cari WHERE nomor_pencari = ?1 ORDER BY dibuat DESC LIMIT 20").bind(nomor).all()).results;
export const crById = (env, p, id) => sedia(env, p, "lapor_cari", "baca", "SELECT id, kab, status FROM lapor_cari WHERE id = ?1").bind(id).first();
/* status baru + baris riwayat dalam satu batch; status selain buka mengisi ditutup dan ditutup_oleh */
export const crStatus = (env, p, id, status, catatan, oleh, kini) => { izin(p, "lapor_cari", "ubah"); izin(p, "lapor_cari_riwayat", "tambah");
  return env.DB.batch([env.DB.prepare("UPDATE lapor_cari SET status = ?2, ditutup = ?3, ditutup_oleh = ?4 WHERE id = ?1")
      .bind(id, status, status === "buka" ? null : kini, status === "buka" ? null : oleh),
    env.DB.prepare("INSERT INTO lapor_cari_riwayat (cari_id, status, catatan, oleh, waktu) VALUES (?1, ?2, ?3, ?4, ?5)").bind(id, status, catatan, oleh, kini)]); };
const LP_SESI = "id, wa, kerja, rev, nomor, terkirim, token_sha, diubah";
/* g = true: INSERT ... SELECT ... WHERE changes() > 0, hanya menulis bila pernyataan sebelumnya dalam batch (pembaruan sesi) benar-benar mengubah baris */
const lpIns = (g, atau, tabel, kolom) => { const n = kolom.split(",").length, ph = Array.from({length: n}, (_, i) => "?" + (i + 1)).join(", ");
  return g ? `INSERT ${atau}INTO ${tabel} (${kolom}) SELECT ${ph} WHERE changes() > 0` : `INSERT ${atau}INTO ${tabel} (${kolom}) VALUES (${ph})`; };
/* tulis banyak pernyataan sekaligus; pelaku harus salah satu pelaku Lapor */
export const lpBatch = (env, p, stmts) => { if (!String(p?.peran).startsWith("lp_")) throw new Galat(403, "batch Lapor hanya untuk pelaku lp_*"); return env.DB.batch(stmts); };

/* ---- izin uji (K2) dan identitas ---- */
export const lpIzin = (env, p, wa) => sedia(env, p, "lapor_izin", "baca", "SELECT wa, peran, kab FROM lapor_izin WHERE wa = ?1").bind(wa).first();
export const lpIzinDaftar = async (env, p) => (await sedia(env, p, "lapor_izin", "baca", "SELECT wa FROM lapor_izin ORDER BY wa LIMIT 500").all()).results.map(r => r.wa);
export const lpIzinSimpan = (env, p, wa, peran, kab, oleh, kini) => sedia(env, p, "lapor_izin", "tambah",
  "INSERT INTO lapor_izin (wa, peran, kab, oleh, dibuat) VALUES (?1, ?2, ?3, ?4, ?5) ON CONFLICT (wa) DO UPDATE SET peran = excluded.peran, kab = excluded.kab, oleh = excluded.oleh").bind(wa, peran, kab, oleh, kini).run();
export const lpIzinCabut = (env, p, wa) => sedia(env, p, "lapor_izin", "hapus", "DELETE FROM lapor_izin WHERE wa = ?1").bind(wa).run();
export const lpPelapor = (env, p, wa) => sedia(env, p, "lapor_pelapor", "baca", "SELECT wa, nama, peran, kab, jabatan, dibuat, diubah FROM lapor_pelapor WHERE wa = ?1").bind(wa).first();
export const lpStmtPelapor = (env, p, wa, v, kini, g = false) => sedia(env, p, "lapor_pelapor", "tambah",
  `${lpIns(g, "", "lapor_pelapor", "wa, nama, peran, kab, jabatan, dibuat, diubah")} ON CONFLICT (wa) DO UPDATE SET nama = excluded.nama, peran = excluded.peran, kab = excluded.kab, jabatan = excluded.jabatan, diubah = excluded.diubah`.replace("?7", "?6"))
  .bind(wa, String(v.nama).slice(0, 120), v.peran, v.kab ? String(v.kab).slice(0, 120) : null, v.jabatan ? String(v.jabatan).slice(0, 120) : null, kini);

/* ---- sesi ---- */
export const lpSesiAktif = (env, p, wa) => sedia(env, p, "lapor_sesi", "baca", `SELECT ${LP_SESI} FROM lapor_sesi WHERE wa = ?1 ORDER BY diubah DESC LIMIT 1`).bind(wa).first();
export const lpSesiNomor = (env, p, nomor) => sedia(env, p, "lapor_sesi", "baca", `SELECT ${LP_SESI} FROM lapor_sesi WHERE nomor = ?1`).bind(nomor).first();
export const lpSesiToken = (env, p, tokenSha) => sedia(env, p, "lapor_sesi", "baca", `SELECT ${LP_SESI} FROM lapor_sesi WHERE token_sha = ?1`).bind(tokenSha).first();
export const lpSesiMilik = async (env, p, wa) => (await sedia(env, p, "lapor_sesi", "baca",
  `SELECT s.nomor, s.kerja, s.terkirim, t.status tiket FROM lapor_sesi s JOIN lapor_tiket t ON t.nomor = s.nomor WHERE s.wa = ?1 AND s.nomor IS NOT NULL ORDER BY s.terkirim DESC LIMIT 5`).bind(wa).all()).results;
export const lpHitungTerkirim = async (env, p, wa, sejak) => (await sedia(env, p, "lapor_sesi", "baca", "SELECT count(*) n FROM lapor_sesi WHERE wa = ?1 AND terkirim > ?2").bind(wa, sejak).first()).n;
export const lpStmtSesiBaru = (env, p, s, kini) => sedia(env, p, "lapor_sesi", "tambah",
  `INSERT INTO lapor_sesi (id, wa, status, tingkat, jenis, kab, lat, lon, kerja, rev, dibuat, diubah) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, 0, ?10, ?10)`)
  .bind(s.id, s.wa, s.status, s.tingkat ?? null, s.jenis ?? null, s.kab ?? null, s.lat ?? null, s.lon ?? null, s.kerja, kini);
/* pembaruan optimistis: hanya bila rev masih sama (dua pesan serentak dari satu nomor tidak saling menimpa); mengembalikan jumlah baris berubah */
export const lpStmtSesiUbah = (env, p, s, revLama, kini) => sedia(env, p, "lapor_sesi", "ubah",
  `UPDATE lapor_sesi SET status = ?1, tingkat = ?2, jenis = ?3, kab = ?4, lat = ?5, lon = ?6, kerja = ?7, nomor = COALESCE(?8, nomor), token_sha = COALESCE(?9, token_sha),
   terkirim = COALESCE(?10, terkirim), ringkas = COALESCE(?11, ringkas), rev = rev + 1, diubah = ?12 WHERE id = ?13 AND rev = ?14`)
  .bind(s.status, s.tingkat ?? null, s.jenis ?? null, s.kab ?? null, s.lat ?? null, s.lon ?? null, s.kerja, s.nomor ?? null, s.token_sha ?? null, s.terkirim ?? null, s.ringkas ?? null, kini, s.id, revLama);
export const lpSesiUbah = async (env, p, s, revLama, kini) => (await lpStmtSesiUbah(env, p, s, revLama, kini).run()).meta.changes;
export const lpNomorBerikut = async (env, p, tgl) => (await sedia(env, p, "lapor_urut", "tambah",
  "INSERT INTO lapor_urut (tgl, n) VALUES (?1, 1) ON CONFLICT (tgl) DO UPDATE SET n = n + 1 RETURNING n").bind(tgl).first()).n;
export const lpStmtPesan = (env, p, sesi, dari, pintu, teks, waktu, g = false) => sedia(env, p, "lapor_pesan", "tambah",
  lpIns(g, "", "lapor_pesan", "sesi, dari, pintu, teks, waktu")).bind(sesi, dari, pintu, teks == null ? null : String(teks).slice(0, 4000), waktu);

/* ---- tiket, riwayat, balasan, kabar, PDF ---- */
export const lpStmtTiketBaru = (env, p, nomor, sesi, kini, g = false) => sedia(env, p, "lapor_tiket", "tambah", lpIns(g, "", "lapor_tiket", "nomor, sesi, status, diubah").replace("?3, ?4", "'baru', ?3")).bind(nomor, sesi, kini);
export const lpStmtRiwayat = (env, p, nomor, dari, ke, catatan, pelaku, kini, g = false) => sedia(env, p, "lapor_tiket_riwayat", "tambah",
  lpIns(g, "", "lapor_tiket_riwayat", "nomor, dari, ke, catatan, pelaku, waktu")).bind(nomor, dari, ke, catatan, pelaku, kini);
export const lpStmtPdfAntre = (env, p, nomor, versi, kini, g = false) => sedia(env, p, "lapor_pdf", "tambah", lpIns(g, "OR IGNORE ", "lapor_pdf", "nomor, versi, status, diubah").replace("?3, ?4", "'antre', ?3")).bind(nomor, versi, kini);
export const lpTiket = (env, p, nomor) => sedia(env, p, "lapor_tiket", "baca", "SELECT nomor, status, diubah FROM lapor_tiket WHERE nomor = ?1").bind(nomor).first();
export const lpRiwayat = async (env, p, nomor) => (await sedia(env, p, "lapor_tiket_riwayat", "baca",
  "SELECT dari, ke, catatan, pelaku, waktu FROM lapor_tiket_riwayat WHERE nomor = ?1 ORDER BY id LIMIT 100").bind(nomor).all()).results;
export const lpBalasan = async (env, p, nomor) => (await sedia(env, p, "lapor_balasan", "baca",
  "SELECT teks, oleh, waktu FROM lapor_balasan WHERE nomor = ?1 ORDER BY id LIMIT 100").bind(nomor).all()).results;
/* pindah status bersyarat (status asal harus masih sama); stmt berikutnya yang memakai changes() hanya menulis bila perpindahan ini benar-benar terjadi */
export const lpStmtTiketPindah = (env, p, nomor, dari, ke, kini) => sedia(env, p, "lapor_tiket", "ubah", "UPDATE lapor_tiket SET status = ?3, diubah = ?4 WHERE nomor = ?1 AND status = ?2").bind(nomor, dari, ke, kini);
export const lpStmtRiwayatJikaBerubah = (env, p, nomor, dari, ke, catatan, pelaku, kini) => sedia(env, p, "lapor_tiket_riwayat", "tambah",
  "INSERT INTO lapor_tiket_riwayat (nomor, dari, ke, catatan, pelaku, waktu) SELECT ?1, ?2, ?3, ?4, ?5, ?6 WHERE changes() > 0").bind(nomor, dari, ke, catatan, pelaku, kini);
export const lpStmtKabarJikaBerubah = (env, p, wa, nomor, jenis, teks, kini) => sedia(env, p, "lapor_kabar", "tambah",
  "INSERT INTO lapor_kabar (wa, nomor, jenis, teks, dibuat) SELECT ?1, ?2, ?3, ?4, ?5 WHERE changes() > 0").bind(wa, nomor, jenis, String(teks).slice(0, 2000), kini);
export const lpStmtBalasan = (env, p, nomor, teks, oleh, kini) => sedia(env, p, "lapor_balasan", "tambah", "INSERT INTO lapor_balasan (nomor, teks, oleh, waktu) VALUES (?1, ?2, ?3, ?4)").bind(nomor, teks, oleh, kini);
export const lpStmtKabar = (env, p, wa, nomor, jenis, teks, url, kini) => sedia(env, p, "lapor_kabar", "tambah",
  "INSERT INTO lapor_kabar (wa, nomor, jenis, teks, url, dibuat) VALUES (?1, ?2, ?3, ?4, ?5, ?6)").bind(wa, nomor, jenis, String(teks).slice(0, 2000), url ?? null, kini);
export const lpKabarAntre = async (env, p, batas = 50) => (await sedia(env, p, "lapor_kabar", "baca",
  "SELECT id, wa, jenis, teks, url, nomor FROM lapor_kabar WHERE terkirim IS NULL ORDER BY id LIMIT ?1").bind(batas).all()).results;
export const lpKabarTerkirim = async (env, p, id, kini) => (await sedia(env, p, "lapor_kabar", "ubah", "UPDATE lapor_kabar SET terkirim = ?2 WHERE id = ?1 AND terkirim IS NULL").bind(id, kini).run()).meta.changes;
/* LJ-11: antrean WA tahap 2 untuk gateway. Teks dikosongkan ("-", CHECK menolak kosong) saat terkirim karena pembuka dan tim memuat token tautan mentah. */
export const ljKabarAntre = async (env, p, batas = 50) => (await sedia(env, p, "lj_kabar", "baca",
  "SELECT id, wa, jenis, teks FROM lj_kabar WHERE terkirim IS NULL ORDER BY id LIMIT ?1").bind(batas).all()).results;
export const ljKabarTerkirim = async (env, p, id, kini) => (await sedia(env, p, "lj_kabar", "ubah",
  "UPDATE lj_kabar SET terkirim = ?2, teks = '-' WHERE id = ?1 AND terkirim IS NULL").bind(id, kini).run()).meta.changes;
/* belum terkirim: pembuka dan tim (bertoken) dibuang sesudah 1 hari, jenis lain sesudah 7 hari supaya baris gagal permanen tidak menyumbat LIMIT antrean */
export const ljKabarBersih = async (env, p, tokenSebelum, terkirimSebelum, macetSebelum) => (await sedia(env, p, "lj_kabar", "hapus",
  "DELETE FROM lj_kabar WHERE (terkirim IS NULL AND (dibuat < ?3 OR (jenis IN ('pembuka', 'tim') AND dibuat < ?1))) OR terkirim < ?2").bind(tokenSebelum, terkirimSebelum, macetSebelum).run()).meta.changes;
export const lpKabarWeb = async (env, p, wa, sejak) => (await sedia(env, p, "lapor_kabar", "baca",
  "SELECT nomor, teks, dibuat waktu, jenis FROM lapor_kabar WHERE wa = ?1 AND dibuat > ?2 AND jenis != 'pdf' ORDER BY id LIMIT 50").bind(wa, sejak).all()).results;
/* antrean cetak: yang 'antre', atau 'cetak' > 5 menit tanpa hasil (mesin mati di tengah) dan masih di bawah 3 percobaan; yang diambil langsung ditandai 'cetak' */
export async function lpPdfAmbil(env, p, kini, batas = 5) {
  const r = (await sedia(env, p, "lapor_pdf", "baca", "SELECT nomor, versi FROM lapor_pdf WHERE status = 'antre' OR (status = 'cetak' AND diubah < ?1 AND coba < 3) ORDER BY diubah LIMIT ?2").bind(kini - 300e3, batas).all()).results;
  if (r.length) await env.DB.batch(r.map(x => sedia(env, p, "lapor_pdf", "ubah", "UPDATE lapor_pdf SET status = 'cetak', coba = coba + 1, diubah = ?3 WHERE nomor = ?1 AND versi = ?2").bind(x.nomor, x.versi, kini)));
  return r;
}
export const lpPdfStatus = async (env, p, nomor, versi, status, kini) => (await sedia(env, p, "lapor_pdf", "ubah", "UPDATE lapor_pdf SET status = ?3, diubah = ?4 WHERE nomor = ?1 AND versi = ?2").bind(nomor, versi, status, kini).run()).meta.changes;
export const lpPdfAda = (env, p, nomor, versi) => sedia(env, p, "lapor_pdf", "baca", "SELECT status FROM lapor_pdf WHERE nomor = ?1 AND versi = ?2").bind(nomor, versi).first();

/* ---- foto ---- */
export const lpStmtFoto = (env, p, f, g = false) => sedia(env, p, "lapor_foto", "tambah",
  lpIns(g, "", "lapor_foto", "id, sesi, kunci_r2, lat, lon, akurasi, waktu_ambil, waktu_terima, lencana, pintu"))
  .bind(f.id, f.sesi, f.kunci, f.lat ?? null, f.lon ?? null, f.akurasi ?? null, f.waktuAmbil ?? null, f.waktuTerima, f.lencana, f.pintu);
export const lpFotoById = (env, p, id) => sedia(env, p, "lapor_foto", "baca",
  "SELECT f.id, f.sesi sesi_id, f.kunci_r2, s.wa, s.token_sha, s.nomor FROM lapor_foto f JOIN lapor_sesi s ON s.id = f.sesi WHERE f.id = ?1").bind(id).first();

/* ---- unggah video bersambung (migrasi 0158, K61, D89): bagian = JSON {"<n>": etag}, json_set atomik ---- */
export const lpUnggahBaru = (env, p, u) => sedia(env, p, "lapor_unggah", "tambah",
  "INSERT INTO lapor_unggah (id, wa, kunci_r2, upload_id, ukuran, jumlah, gps, durasi, bahasa, mulai, akhir) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?10)")
  .bind(u.id, u.wa, u.kunci, u.uploadId, u.ukuran, u.jumlah, u.gps ?? null, u.durasi ?? null, u.bahasa, u.kini).run();
export const lpUnggahBaca = (env, p, id) => sedia(env, p, "lapor_unggah", "baca",
  "SELECT id, wa, kunci_r2, upload_id, ukuran, jumlah, bagian, gps, durasi, bahasa FROM lapor_unggah WHERE id = ?1").bind(id).first();
export const lpUnggahHitung = async (env, p, wa) => (await sedia(env, p, "lapor_unggah", "baca", "SELECT count(*) n FROM lapor_unggah WHERE wa = ?1").bind(wa).first()).n;
export const lpUnggahBagian = (env, p, id, n, etag, kini) => sedia(env, p, "lapor_unggah", "ubah",
  "UPDATE lapor_unggah SET bagian = json_set(bagian, ?2, ?3), akhir = ?4 WHERE id = ?1").bind(id, `$."${Number(n)}"`, etag, kini).run();
export const lpUnggahHapus = (env, p, id) => env.DB.batch([sedia(env, p, "lapor_unggah", "hapus", "DELETE FROM lapor_unggah WHERE id = ?1").bind(id),
  sedia(env, p, "lapor_milik", "hapus", "DELETE FROM lapor_milik WHERE jenis = 'unggah' AND id = ?1").bind(id)]).catch(e => { if (/no such table/i.test(String(e?.message))) return sedia(env, p, "lapor_unggah", "hapus", "DELETE FROM lapor_unggah WHERE id = ?1").bind(id).run(); throw e; });   // sebelum 0159 hanya baris unggah
export const lpUnggahBasi = async (env, p, batas) => (await sedia(env, p, "lapor_unggah", "baca",
  "SELECT id, kunci_r2, upload_id FROM lapor_unggah WHERE akhir <= ?1 ORDER BY akhir LIMIT 20").bind(batas).all()).results;

/* ---- pintu web tanpa kode (migrasi 0159, K65, D100): nomor ketikan terikat ke perangkat. dev = sha256 kunci kuki lapor_perangkat. ---- */
export const lpPerangkatBaris = async (env, p, dev) => (await sedia(env, p, "lapor_perangkat", "baca", "SELECT wa, terakhir FROM lapor_perangkat WHERE perangkat_sha = ?1 LIMIT 20").bind(dev).all()).results;
export const lpPerangkatTambah = (env, p, dev, wa, kini) => sedia(env, p, "lapor_perangkat", "tambah",
  "INSERT OR IGNORE INTO lapor_perangkat (perangkat_sha, wa, dibuat, terakhir) VALUES (?1, ?2, ?3, ?3)").bind(dev, wa, kini).run();
export const lpPerangkatSentuh = (env, p, dev, wa, kini) => sedia(env, p, "lapor_perangkat", "ubah", "UPDATE lapor_perangkat SET terakhir = ?3 WHERE perangkat_sha = ?1 AND wa = ?2").bind(dev, wa, kini).run();
export const lpMilikStmt = (env, p, jenis, id, dev, g = false) => sedia(env, p, "lapor_milik", "tambah", lpIns(g, "OR IGNORE ", "lapor_milik", "jenis, id, perangkat_sha")).bind(jenis, id, dev);
export const lpMilikTambah = (env, p, jenis, id, dev) => lpMilikStmt(env, p, jenis, id, dev).run();
export const lpMilikAda = async (env, p, jenis, id, dev) => !!await sedia(env, p, "lapor_milik", "baca", "SELECT 1 a FROM lapor_milik WHERE jenis = ?1 AND id = ?2 AND perangkat_sha = ?3").bind(jenis, id, dev).first();
const LP_SESI_S = LP_SESI.split(", ").map(k => "s." + k).join(", ");
export const lpSesiAktifPerangkat = (env, p, wa, dev) => sedia(env, p, "lapor_sesi", "baca",
  `SELECT ${LP_SESI_S} FROM lapor_sesi s JOIN lapor_milik m ON m.jenis = 'sesi' AND m.id = s.id WHERE s.wa = ?1 AND m.perangkat_sha = ?2 ORDER BY s.diubah DESC LIMIT 1`).bind(wa, dev).first();
export const lpSesiMilikPerangkat = async (env, p, wa, dev) => (await sedia(env, p, "lapor_sesi", "baca",
  `SELECT s.nomor, s.kerja, s.terkirim, t.status tiket FROM lapor_sesi s JOIN lapor_tiket t ON t.nomor = s.nomor JOIN lapor_milik m ON m.jenis = 'sesi' AND m.id = s.id
   WHERE s.wa = ?1 AND m.perangkat_sha = ?2 AND s.nomor IS NOT NULL ORDER BY s.terkirim DESC LIMIT 5`).bind(wa, dev).all()).results;
export const lpKabarWebPerangkat = async (env, p, wa, dev, sejak) => (await sedia(env, p, "lapor_kabar", "baca",
  `SELECT k.nomor, k.teks, k.dibuat waktu, k.jenis FROM lapor_kabar k JOIN lapor_sesi s ON s.nomor = k.nomor JOIN lapor_milik m ON m.jenis = 'sesi' AND m.id = s.id
   WHERE k.wa = ?1 AND m.perangkat_sha = ?2 AND k.dibuat > ?3 AND k.jenis != 'pdf' ORDER BY k.id LIMIT 50`).bind(wa, dev, sejak).all()).results;

/* ---- kejadian yang sama (migrasi 0160, K66, D103-D107). Sebelum 0160 semua bacaan memberi kosong lewat pemanggil (tabelBelum). ---- */
/* kandidat: laporan terkirim sekab sejak waktu tertentu, lengkap dengan kode kejadian dan jumlah warga di kejadiannya; kecamatan disaring pemanggil dari ringkasan */
export const lpKandidatKejadian = async (env, p, kab, sejak) => (await sedia(env, p, "lapor_sesi", "baca",
  `SELECT s.nomor, s.jenis, s.terkirim, s.ringkas, t.status, k.kode,
     CASE WHEN k.kode IS NULL THEN 1 ELSE (SELECT count(DISTINCT s2.wa) FROM lapor_kelompok k2 JOIN lapor_sesi s2 ON s2.nomor = k2.nomor WHERE k2.kode = k.kode) END n
   FROM lapor_sesi s JOIN lapor_tiket t ON t.nomor = s.nomor LEFT JOIN lapor_kelompok k ON k.nomor = s.nomor
   WHERE s.kab = ?1 AND s.terkirim > ?2 ORDER BY s.terkirim DESC LIMIT 150`).bind(kab, sejak).all()).results;
export const lpKejadianKode = async (env, p, nomor) => (await sedia(env, p, "lapor_kelompok", "baca", "SELECT kode FROM lapor_kelompok WHERE nomor = ?1").bind(nomor).first())?.kode ?? null;
export const lpKejadianBerikut = async (env, p, tgl) => (await sedia(env, p, "lapor_kelompok_urut", "tambah",
  "INSERT INTO lapor_kelompok_urut (tgl, n) VALUES (?1, 1) ON CONFLICT (tgl) DO UPDATE SET n = n + 1 RETURNING n").bind(tgl).first()).n;
/* induk lebih dulu (bila belum punya kode), lalu laporan baru menyalin kode induk lewat SELECT: dua laporan serentak ke induk yang sama tetap satu kode. Dipakai dalam batch sesudah sesi bernomor. */
export const lpStmtKejadianInduk = (env, p, induk, kode, kini) => sedia(env, p, "lapor_kelompok", "tambah",
  "INSERT OR IGNORE INTO lapor_kelompok (nomor, kode, induk, dibuat) SELECT ?1, ?2, NULL, ?3 WHERE EXISTS (SELECT 1 FROM lapor_sesi WHERE nomor = ?1)").bind(induk, kode, kini);
export const lpStmtKejadianAnggota = (env, p, nomor, induk, kini) => sedia(env, p, "lapor_kelompok", "tambah",
  "INSERT OR IGNORE INTO lapor_kelompok (nomor, kode, induk, dibuat) SELECT ?1, kode, ?2, ?3 FROM lapor_kelompok WHERE nomor = ?2 AND EXISTS (SELECT 1 FROM lapor_sesi WHERE nomor = ?1)").bind(nomor, induk, kini);
/* ringkasan kejadian per kode untuk daftar meja: {kode: {n_laporan, n_pelapor}}; hanya kode yang diminta */
export async function lpKejadianRingkas(env, p, kodes) {
  if (!kodes.length) return {};
  const r = (await sedia(env, p, "lapor_kelompok", "baca",
    `SELECT k.kode, count(*) n_laporan, count(DISTINCT s.wa) n_pelapor FROM lapor_kelompok k JOIN lapor_sesi s ON s.nomor = k.nomor WHERE k.kode IN (${kodes.map((_, i) => "?" + (i + 1)).join(",")}) GROUP BY k.kode`).bind(...kodes).all()).results;
  return Object.fromEntries(r.map(x => [x.kode, {n_laporan: x.n_laporan, n_pelapor: x.n_pelapor}]));
}
export const lpKejadianNomor = async (env, p, nomor) => (await sedia(env, p, "lapor_kelompok", "baca", "SELECT nomor, kode FROM lapor_kelompok WHERE nomor = ?1").bind(nomor).first());
export const lpKejadianSemuaNomor = async (env, p) => (await sedia(env, p, "lapor_kelompok", "baca", "SELECT nomor, kode FROM lapor_kelompok ORDER BY dibuat DESC LIMIT 3000").all()).results;
/* lepas satu laporan; bila kejadiannya tinggal satu laporan, sisanya ikut dilepas (kejadian minimal dua laporan). Satu batch. */
export const lpKejadianLepas = (env, p, nomor, kode, ekstra = []) => env.DB.batch([
  sedia(env, p, "lapor_kelompok", "hapus", "DELETE FROM lapor_kelompok WHERE nomor = ?1 AND kode = ?2").bind(nomor, kode),
  sedia(env, p, "lapor_kelompok", "hapus", "DELETE FROM lapor_kelompok WHERE kode = ?1 AND (SELECT count(*) FROM lapor_kelompok WHERE kode = ?1) < 2").bind(kode), ...ekstra]);

/* ---- monitoring staf dan alun-alun ---- */
const LP_KOLOM_FILTER = {jenis: "s.jenis = ?", status: "t.status = ?", kab: "s.kab = ?", prov: "s.kab LIKE ? || '%'"};   // prov (2 angka) hanya diisi server dari cakupan akun BPBD
export async function lpMejaDaftar(env, p, f) {
  const where = ["s.terkirim IS NOT NULL"], ikat = [];
  if (Number.isFinite(f.dari)) { where.push("s.terkirim >= ?"); ikat.push(f.dari); }
  if (Number.isFinite(f.sampai)) { where.push("s.terkirim <= ?"); ikat.push(f.sampai); }
  for (const k of Object.keys(LP_KOLOM_FILTER)) if (f[k]) { where.push(LP_KOLOM_FILTER[k]); ikat.push(f[k]); }
  const sql = susulan => `SELECT s.nomor, s.wa, s.terkirim, s.jenis, s.lat, s.lon, s.ringkas, t.status, pl.nama, pl.peran, pl.kab pkab,
       (SELECT count(*) FROM lapor_balasan b WHERE b.nomor = s.nomor) balasan${susulan ? `,
       COALESCE((SELECT max(v.versi) FROM lapor_versi v WHERE v.nomor = s.nomor), 1) versi,
       (SELECT count(*) FROM lapor_versi w WHERE w.nomor = s.nomor AND w.waktu > COALESCE((SELECT max(r.waktu) FROM lapor_tiket_riwayat r WHERE r.nomor = s.nomor AND r.pelaku != 'Pelapor'), 0)) ada_susulan` : ""}
     FROM lapor_sesi s JOIN lapor_tiket t ON t.nomor = s.nomor LEFT JOIN lapor_pelapor pl ON pl.wa = s.wa
     WHERE ${where.join(" AND ")} ORDER BY s.terkirim DESC LIMIT 1000`;
  try { return (await sedia(env, p, "lapor_sesi", "baca", sql(true)).bind(...ikat).all()).results; }
  catch (e) { if (!/no such table: lapor_versi/i.test(String(e?.message))) throw e; return (await sedia(env, p, "lapor_sesi", "baca", sql(false)).bind(...ikat).all()).results; }   // kode tayang sebelum 0156
}
export const lpAlunBaris = async (env, p, prov, jenis) => (await sedia(env, p, "lapor_sesi", "baca",
  `SELECT s.id, s.nomor, s.jenis, s.ringkas, s.terkirim, s.tingkat, t.status FROM lapor_sesi s JOIN lapor_tiket t ON t.nomor = s.nomor
   WHERE t.status IN ('ditindaklanjuti', 'selesai') AND (?1 IS NULL OR s.kab LIKE ?1 || '%') AND (?2 IS NULL OR s.jenis = ?2) ORDER BY s.terkirim DESC LIMIT 300`).bind(prov || null, jenis || null).all()).results;

/* semua laporan terkirim 30 hari terakhir untuk menghitung gugus (alun-alun) dan agregat; tanpa teks, hanya kolom indeks dan ringkasan beku */
export const lpGugusBaris = async (env, p, sejak) => (await sedia(env, p, "lapor_sesi", "baca",
  `SELECT s.id, s.nomor, s.wa, s.jenis, s.lat, s.lon, s.terkirim, s.ringkas, t.status,
     EXISTS (SELECT 1 FROM lapor_foto f WHERE f.sesi = s.id AND f.lencana IN ('gps', 'exif')) foto_sah
   FROM lapor_sesi s JOIN lapor_tiket t ON t.nomor = s.nomor WHERE s.terkirim > ?1 ORDER BY s.terkirim DESC LIMIT 3000`).bind(sejak).all()).results;
export const lpAgregatBaris = async (env, p, batas = 50000) => (await sedia(env, p, "lapor_sesi", "baca",
  `SELECT s.wa, s.jenis, s.terkirim, s.ringkas, t.status,
     EXISTS (SELECT 1 FROM lapor_foto f WHERE f.sesi = s.id AND f.lencana IN ('gps', 'exif')) foto_sah
   FROM lapor_sesi s JOIN lapor_tiket t ON t.nomor = s.nomor WHERE s.terkirim IS NOT NULL ORDER BY s.terkirim DESC LIMIT ?1`).bind(batas).all()).results;

/* ---- bukti tindak lanjut (migrasi 0157, K60, D87, D88) ---- */
export const lpBuktiDaftar = async (env, p, nomor) => (await sedia(env, p, "lapor_bukti", "baca",
  "SELECT id, publik, waktu, lat FROM lapor_bukti WHERE nomor = ?1 ORDER BY waktu, id LIMIT 10").bind(nomor).all()).results;
export const lpBuktiHitung = async (env, p, nomor) => (await sedia(env, p, "lapor_bukti", "baca", "SELECT count(*) n FROM lapor_bukti WHERE nomor = ?1").bind(nomor).first()).n;
/* tambah hanya bila nomor itu masih di bawah 10 foto (satu pernyataan: tanpa celah baca-lalu-tulis); stmt berikutnya memakai changes() */
export const lpStmtBukti = (env, p, b) => sedia(env, p, "lapor_bukti", "tambah",
  "INSERT INTO lapor_bukti (id, nomor, kunci_r2, oleh, lat, lon, akurasi, publik, waktu) SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7, 0, ?8 WHERE (SELECT count(*) FROM lapor_bukti WHERE nomor = ?2) < 10")
  .bind(b.id, b.nomor, b.kunci, String(b.oleh).slice(0, 200), b.lat ?? null, b.lon ?? null, b.akurasi ?? null, b.waktu);
export const lpBuktiPublik = async (env, p, nomor, id, publik) => (await sedia(env, p, "lapor_bukti", "ubah", "UPDATE lapor_bukti SET publik = ?3 WHERE id = ?2 AND nomor = ?1").bind(nomor, id, publik ? 1 : 0).run()).meta.changes;
export const lpBuktiById = (env, p, id) => sedia(env, p, "lapor_bukti", "baca",
  "SELECT b.id, b.kunci_r2, b.publik, b.nomor, s.token_sha, t.status FROM lapor_bukti b JOIN lapor_sesi s ON s.nomor = b.nomor JOIN lapor_tiket t ON t.nomor = b.nomor WHERE b.id = ?1").bind(id).first();
export const lpBuktiAlun = async (env, p) => (await sedia(env, p, "lapor_bukti", "baca",
  "SELECT b.id, b.nomor FROM lapor_bukti b JOIN lapor_tiket t ON t.nomor = b.nomor WHERE b.publik = 1 AND t.status IN ('ditindaklanjuti', 'selesai') ORDER BY b.waktu DESC LIMIT 500").all()).results;

/* ---- jejak akses meja BPBD (D95) dan unduhan agregat (D93) ---- */
export const lpStmtAkses = (env, p, nomor, oleh, kini) => sedia(env, p, "lapor_akses", "tambah", "INSERT INTO lapor_akses (nomor, oleh, waktu) VALUES (?1, ?2, ?3)").bind(nomor, String(oleh).slice(0, 200), kini);
export const lpUnduhCatat = (env, p, akun, berkas, kini) => sedia(env, p, "lapor_unduh", "tambah", "INSERT INTO lapor_unduh (akun, berkas, waktu) VALUES (?1, ?2, ?3)").bind(String(akun).slice(0, 200), berkas, kini).run();

/* Meja BPBD tidak lagi membaca sesi /masuk untuk akun pemda (PF-04, Q1): hak meja dari sesi profil (pfSesiDari), jadi lpAkunMeja dihapus. */
/* akun lembaga kab/kota aktif di satu provinsi, dengan nomor WA, untuk pemberitahuan teruskan (D97); dicocokkan nama oleh pemanggil (bakuKab) */
export const lpAkunKabProv = async (env, prov) => (await env.DB.prepare(
  "SELECT id, jenis, kab, wa FROM instansi_akun WHERE tingkat = 'kab' AND prov = ?1 AND status = 'aktif' AND dummy = 0 AND jenis IN ('pemkab', 'pemkot') AND wa IS NOT NULL AND wa GLOB '62[0-9]*' AND wa NOT GLOB '*[^0-9]*' LIMIT 200").bind(prov).all()).results;   // format sama dengan CHECK lapor_kabar_bpbd.wa: satu nomor tak baku tidak menggagalkan batch teruskan
/* satu pesan ke antrean BPBD, hanya bila pernyataan sebelumnya dalam batch mengubah baris (changes() > 0) dan kab itu belum 20 pesan dalam 24 jam (Q55) */
export const lpStmtKabarBpbd = (env, p, wa, nomor, kab, teks, kini) => sedia(env, p, "lapor_kabar_bpbd", "tambah",
  "INSERT INTO lapor_kabar_bpbd (wa, nomor, kab, teks, dibuat) SELECT ?1, ?2, ?3, ?4, ?5 WHERE changes() > 0 AND (SELECT count(*) FROM lapor_kabar_bpbd WHERE kab = ?3 AND dibuat > ?5 - 86400000) < 20")
  .bind(wa, nomor, String(kab).slice(0, 120), String(teks).slice(0, 1000), kini);
export const lpKabarBpbdAntre = async (env, p, batas = 50) => (await sedia(env, p, "lapor_kabar_bpbd", "baca", "SELECT id, wa, teks FROM lapor_kabar_bpbd WHERE terkirim IS NULL ORDER BY id LIMIT ?1").bind(batas).all()).results;
export const lpKabarBpbdTerkirim = async (env, p, id, kini) => (await sedia(env, p, "lapor_kabar_bpbd", "ubah", "UPDATE lapor_kabar_bpbd SET terkirim = ?2 WHERE id = ?1 AND terkirim IS NULL").bind(id, kini).run()).meta.changes;

/* kuota Lapor: daftar = [{kunci, aksi, batas: [[jendela ms, maks], ...]}]. Semua batas dibaca dulu; lewat salah satu -> {sisa detik sampai baris tertua keluar dari jendela}
   tanpa menulis apa pun; lolos semua -> satu baris laju_bnpb per kunci. */
export async function lpKuota(env, p, daftar, kini) {
  for (const {kunci, aksi, batas} of daftar) for (const [jendela, maks] of batas) {
    const r = await sedia(env, p, "laju_bnpb", "baca", "SELECT count(*) n, min(waktu) t FROM laju_bnpb WHERE kunci = ?1 AND aksi = ?2 AND waktu > ?3").bind(kunci, aksi, kini - jendela).first();
    if (r.n >= maks) return {sisa: Math.max(1, Math.ceil((r.t + jendela - kini) / 1000))};
  }
  await env.DB.batch(daftar.map(({kunci, aksi}) => sedia(env, p, "laju_bnpb", "tambah", "INSERT INTO laju_bnpb (kunci, aksi, waktu) VALUES (?1, ?2, ?3)").bind(kunci, aksi, kini)));
  return null;
}

/* ---- laporan susulan (migrasi 0156): versi 2+ ---- */
export const lpStmtVersi = (env, p, nomor, versi, isi, perubahan, waktu, g = false) => sedia(env, p, "lapor_versi", "tambah",
  lpIns(g, "", "lapor_versi", "nomor, versi, isi, perubahan, waktu")).bind(nomor, versi, isi, perubahan, waktu);
/* versi terakhir (1 bila belum ada susulan) dan penanda "ada susulan": versi > 1 lebih baru daripada riwayat tiket terakhir oleh selain Pelapor. Tanpa tabel 0156: versi 1, tanpa penanda. */
export async function lpVersiInfo(env, p, nomor) {
  try {
    const r = await sedia(env, p, "lapor_versi", "baca",
      `SELECT COALESCE(max(v.versi), 1) versi, (SELECT count(*) FROM lapor_versi w WHERE w.nomor = ?1 AND w.waktu > COALESCE((SELECT max(r.waktu) FROM lapor_tiket_riwayat r WHERE r.nomor = ?1 AND r.pelaku != 'Pelapor'), 0)) ada
       FROM lapor_versi v WHERE v.nomor = ?1`).bind(nomor).first();
    return {versi: r.versi, ada: r.ada > 0};
  } catch (e) { if (/no such table/i.test(String(e?.message))) return {versi: 1, ada: false}; throw e; }
}
/* pengecekan lapangan dan tindakan (migrasi 0162): hanya INSERT dan SELECT; g = hanya bila pernyataan sebelumnya mengubah baris */
export const lpPeriksaDaftar = async (env, p, nomor) => (await sedia(env, p, "lapor_periksa", "baca",
  "SELECT hasil, catatan, perubahan, oleh, waktu FROM lapor_periksa WHERE nomor = ?1 ORDER BY waktu, id LIMIT 50").bind(nomor).all()).results;
export const lpStmtPeriksa = (env, p, nomor, hasil, catatan, perubahan, oleh, kini, g = false) => sedia(env, p, "lapor_periksa", "tambah",
  lpIns(g, "", "lapor_periksa", "nomor, hasil, catatan, perubahan, oleh, waktu")).bind(nomor, hasil, catatan, perubahan, oleh, kini);
/* hasil pengecekan terakhir per laporan untuk daftar meja (SQLite: kolom polos ikut baris max(id)).
   ponytail: membaca seluruh lapor_periksa tiap muat daftar; batasi ke nomor yang tampil bila tabelnya membesar (kuota baca D1 Free) */
export const lpPeriksaTerakhirSemua = async (env, p) => (await sedia(env, p, "lapor_periksa", "baca",
  "SELECT nomor, hasil, max(id) id FROM lapor_periksa GROUP BY nomor").all()).results;
/* penanda pemeriksa (migrasi 0169, LK-02): baris samping lapor_periksa yang baru saja ditulis di batch yang sama (last_insert_rowid),
   hanya bila INSERT sebelumnya mengubah baris */
export const lpStmtPeriksaAkun = (env, p, t) => sedia(env, p, "lk_periksa_akun", "tambah",
  "INSERT INTO lk_periksa_akun (periksa_id, jenis, tingkat, prov, kab, kab_nama) SELECT last_insert_rowid(), ?1, ?2, ?3, ?4, ?5 WHERE changes() > 0")
  .bind(t.jenis, t.tingkat, t.prov, t.kab, t.kab_nama);
/* pengecekan beserta penandanya untuk sekumpulan nomor (penentu terverifikasiBpbd); ponytail: IN sampai 100 nomor per panggilan */
export const lpPeriksaAkunNomor = async (env, p, nomor) => nomor.length ? (await sedia(env, p, "lk_periksa_akun", "baca",
  `SELECT r.id, r.nomor, r.hasil, r.waktu, a.jenis, a.tingkat, a.prov, a.kab, a.kab_nama FROM lapor_periksa r LEFT JOIN lk_periksa_akun a ON a.periksa_id = r.id
   WHERE r.nomor IN (${nomor.map((_, i) => "?" + (i + 1)).join(", ")}) ORDER BY r.nomor, r.waktu, r.id`).bind(...nomor).all()).results : [];
/* halaman hari ini (lapor-kejadian LK-05, A4): nomor dengan pengecekan Valid sejak batas. ponytail: lapor_periksa hanya berindeks (nomor, waktu),
   jadi ini memindai tabel penuh; tambah indeks (hasil, waktu) bila tabelnya melewati puluhan ribu baris (cache tepi 60 detik menahan bebannya) */
export const lpPeriksaValidSejak = async (env, p, sejak) => (await sedia(env, p, "lapor_periksa", "baca",
  "SELECT nomor FROM lapor_periksa WHERE hasil = 'valid' AND waktu > ?1 GROUP BY nomor ORDER BY max(waktu) DESC LIMIT 500").bind(sejak).all()).results.map(r => r.nomor);
/* versi terakhir per nomor (A3 butir 4); ponytail: IN sampai 100 nomor per panggilan */
export const lpVersiTerakhir = async (env, p, nomor) => nomor.length ? (await sedia(env, p, "lapor_versi", "baca",
  `SELECT nomor, max(waktu) waktu FROM lapor_versi WHERE nomor IN (${nomor.map((_, i) => "?" + (i + 1)).join(", ")}) GROUP BY nomor`).bind(...nomor).all()).results : [];
/* rekonsiliasi tiga sumber (lapor-ai LA-76): calon laporan terverifikasi dalam rentang terkirim, hanya yang punya paling sedikit satu
   pengecekan Valid; penentu akhirnya terverifikasiBpbd (LK-02). Tanpa wa, nama, teks: hanya kolom wilayah, jenis, waktu. */
export async function lpRekonCalon(env, p, dari, sampai, prov) {
  const sql = versi => `SELECT s.nomor, s.jenis, s.terkirim, s.ringkas, t.status${versi ? ", (SELECT max(v.waktu) FROM lapor_versi v WHERE v.nomor = s.nomor) versi_waktu" : ""}
     FROM lapor_sesi s JOIN lapor_tiket t ON t.nomor = s.nomor
     WHERE s.terkirim BETWEEN ?1 AND ?2 AND (?3 IS NULL OR s.kab LIKE ?3 || '.%') AND t.status != 'tidak_valid'
       AND EXISTS (SELECT 1 FROM lapor_periksa r WHERE r.nomor = s.nomor AND r.hasil = 'valid') ORDER BY s.terkirim LIMIT 2000`;
  try { return (await sedia(env, p, "lapor_sesi", "baca", sql(true)).bind(dari, sampai, prov || null).all()).results; }
  catch (e) { if (!/no such table: lapor_versi/i.test(String(e?.message))) throw e; return (await sedia(env, p, "lapor_sesi", "baca", sql(false)).bind(dari, sampai, prov || null).all()).results; }
}
/* titik laporan untuk peta Dalops (prediksi-kejadian PK-4, D10): laporan terkirim bukan tidak_valid, hanya kolom tanpa nama, WA, isi, foto.
   periksa = hasil pengecekan terakhir (null = belum diperiksa). jenis = daftar jenis lapor_sesi hasil pemetaan rute. Maks 2000, terbaru dulu. */
export const lpTitikDalops = async (env, p, jenis, dari) => (await sedia(env, p, "lapor_sesi", "baca",
  `SELECT s.nomor tiket, s.jenis, s.tingkat, s.kab, s.lat, s.lon, s.terkirim waktu, t.status,
     (SELECT r.hasil FROM lapor_periksa r WHERE r.nomor = s.nomor ORDER BY r.id DESC LIMIT 1) periksa
   FROM lapor_sesi s JOIN lapor_tiket t ON t.nomor = s.nomor
   WHERE s.terkirim >= ?1 AND s.jenis IN (SELECT value FROM json_each(?2)) AND t.status != 'tidak_valid' ORDER BY s.terkirim DESC LIMIT 2000`).bind(dari, JSON.stringify(jenis)).all()).results;
/* tarikan halaman publik (migrasi 0170, LK-03, A8): semua baris untuk sekumpulan kode kejadian laporan, urut waktu lalu id, supaya penentu
   terverifikasiBpbd memakai baris terakhir. ponytail: IN sampai 100 kode per panggilan, sama dengan lpPeriksaAkunNomor */
export const lpTarikKode = async (env, p, kode) => kode.length ? (await sedia(env, p, "lk_tarik", "baca",
  `SELECT id, kode, aktif, waktu FROM lk_tarik WHERE kode IN (${kode.map((_, i) => "?" + (i + 1)).join(", ")}) ORDER BY kode, waktu, id`).bind(...kode).all()).results : [];
export const lpStmtTarik = (env, p, kode, aktif, alasan, oleh, kini) => sedia(env, p, "lk_tarik", "tambah",
  "INSERT INTO lk_tarik (kode, aktif, alasan, oleh, waktu) VALUES (?1, ?2, ?3, ?4, ?5)").bind(kode, aktif ? 1 : 0, alasan || null, oleh, kini);
/* usulan ke Buku Besar (migrasi 0170, LK-03, D9, A6): satu per (kejadian laporan, putaran), jadi INSERT kedua pada putaran yang sama gagal UNIQUE
   dan rute menjawab 409; putaran bawaan 1, putaran berikut hanya sesudah ditolak staf Siklus (menunggu keputusan pemilik) */
export const lpUsulanKejadian = async (env, p, kejadian) => kejadian.length ? (await sedia(env, p, "lk_usulan", "baca",
  `SELECT kode, kejadian_laporan, putaran, anggota, jenis, kab4, oleh, waktu FROM lk_usulan WHERE kejadian_laporan IN (${kejadian.map((_, i) => "?" + (i + 1)).join(", ")})`)
  .bind(...kejadian).all()).results : [];
export const lpStmtUsulan = (env, p, u) => sedia(env, p, "lk_usulan", "tambah",
  "INSERT INTO lk_usulan (kode, kejadian_laporan, putaran, anggota, jenis, kab4, oleh, waktu) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)")
  .bind(u.kode, u.kejadian_laporan, u.putaran ?? 1, JSON.stringify(u.anggota), u.jenis, u.kab4, u.oleh, u.waktu);
/* LK-09: kode usulan LU-ddmmyy-NN dihitung DI SQL (urut harian dari baris hari itu; tabel append-only, D1 menjalankan satu tulis sekaligus),
   jadi galat UNIQUE hanya bisa datang dari (kejadian_laporan, putaran) = klik ganda, dan rute menjawab 409. hari = "ddmmyy" WIB. */
export const lpStmtUsulanHari = (env, p, u, hari) => sedia(env, p, "lk_usulan", "tambah",
  `INSERT INTO lk_usulan (kode, kejadian_laporan, putaran, anggota, jenis, kab4, oleh, waktu)
   SELECT 'LU-' || ?1 || '-' || printf('%02d', count(*) + 1), ?2, ?3, ?4, ?5, ?6, ?7, ?8 FROM lk_usulan WHERE kode >= 'LU-' || ?1 || '-' AND kode < 'LU-' || ?1 || '.'
   RETURNING kode, putaran`).bind(hari, u.kejadian_laporan, u.putaran, JSON.stringify(u.anggota), u.jenis, u.kab4, u.oleh, u.waktu);
/* status usulan terakhir di meja (A7, D11, LK-11): satu-satunya bacaan lp_staf atas sk_kejadian_sumber; satu baris lewat UNIQUE (sumber, kode, dummy).
   Tidak ada baris = belum dicocokkan pasang.py (menunggu pencocokan); ditolak menentukan boleh tidaknya putaran berikut */
export const lpUsulanSumber = (env, p, kode) => sedia(env, p, "sk_kejadian_sumber", "baca",
  "SELECT status, kejadian_id FROM sk_kejadian_sumber WHERE sumber = 'lapor_ai' AND kode = ?1 AND dummy = 0").bind(kode).first();
export const lpTindakanDaftar = async (env, p, nomor) => (await sedia(env, p, "lapor_tindakan", "baca",
  "SELECT kode, label, oleh, waktu FROM lapor_tindakan WHERE nomor = ?1 ORDER BY waktu, id LIMIT 100").bind(nomor).all()).results;
export const lpStmtTindakan = (env, p, nomor, kode, label, oleh, kini, g = false) => sedia(env, p, "lapor_tindakan", "tambah",
  lpIns(g, "", "lapor_tindakan", "nomor, kode, label, oleh, waktu")).bind(nomor, kode, label, oleh, kini);
export const lpPdfTerakhir = async (env, p, nomor) => (await sedia(env, p, "lapor_pdf", "baca", "SELECT max(versi) v FROM lapor_pdf WHERE nomor = ?1 AND status = 'jadi'").bind(nomor).first())?.v ?? null;

/* ---------- Data lanjutan BPBD (paket lapor-lanjutan, migrasi 0161, LJ-03). Pelaku: lp_pelapor membuka berkas dari tiket terkirim, lj_tim = ketua
   dan anggota lewat kuki per orang (D20), lp_staf = staf BNPB dan akun lembaga lewat hakMeja. Semua kueri memakai indeks (gerbang d1-pindai). ---------- */
export const pelakuLjTim = {peran: "lj_tim"};
export const ljBatch = (env, p, stmts) => { if (!/^(lp_|lj_tim$|lj_rekap$)/.test(String(p?.peran))) throw new Galat(403, "batch data lanjutan hanya untuk pelaku lp_*, lj_tim, dan lj_rekap"); return env.DB.batch(stmts); };
const LJ_BERKAS = "id, induk, kab, kejadian_id, kab4, status, isian, ditutup, dibuat, diubah";
export const ljIndukKelompok = async (env, p, nomor) => (await sedia(env, p, "lapor_kelompok", "baca", "SELECT coalesce(induk, nomor) induk FROM lapor_kelompok WHERE nomor = ?1").bind(nomor).first())?.induk ?? null;
export const ljBerkasDari = (env, p, induk, kab) => sedia(env, p, "lj_berkas", "baca", `SELECT ${LJ_BERKAS} FROM lj_berkas WHERE induk = ?1 AND kab = ?2`).bind(induk, kab).first();
export const ljBerkas = (env, p, id) => sedia(env, p, "lj_berkas", "baca", `SELECT ${LJ_BERKAS} FROM lj_berkas WHERE id = ?1`).bind(id).first();
/* daftar untuk staf: semua status lewat indeks lj_berkas_status; kab4/kab disaring di kode menurut cakupan akun */
export const ljBerkasDaftar = async (env, p) => (await sedia(env, p, "lj_berkas", "baca",
  `SELECT ${LJ_BERKAS} FROM lj_berkas WHERE status IN ('terbuka', 'usul_tutup', 'selesai', 'selesai_catatan') ORDER BY diubah DESC LIMIT 500`).all()).results;
export const ljStmtBerkasBaru = (env, p, b, kini) => sedia(env, p, "lj_berkas", "tambah",
  "INSERT OR IGNORE INTO lj_berkas (id, induk, kab, kejadian_id, kab4, status, isian, dibuat, diubah) VALUES (?1, ?2, ?3, ?4, ?5, 'terbuka', ?7, ?6, ?6)").bind(b.id, b.induk, b.kab, b.kejadian_id ?? null, b.kab4 ?? null, kini, b.isian ?? "{}");
/* ketua hanya ditulis bila berkasnya baru saja dibuat oleh pernyataan sebelumnya (changes() > 0), supaya pelapor kedua tidak menjadi ketua */
export const ljStmtTimBaru = (env, p, berkas, wa, peran, tokenSha, kedaluwarsa, oleh, kini, g = false) => sedia(env, p, "lj_tim", "tambah",
  g ? "INSERT INTO lj_tim (berkas, wa, peran, token_sha, kedaluwarsa, oleh, dibuat) SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7 WHERE changes() > 0"
    : "INSERT INTO lj_tim (berkas, wa, peran, token_sha, kedaluwarsa, oleh, dibuat) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)").bind(berkas, wa, peran, tokenSha, kedaluwarsa, oleh, kini);
export const ljStmtKabar = (env, p, wa, jenis, teks, kini, g = false) => sedia(env, p, "lj_kabar", "tambah",
  g ? "INSERT INTO lj_kabar (wa, jenis, teks, dibuat) SELECT ?1, ?2, ?3, ?4 WHERE changes() > 0" : "INSERT INTO lj_kabar (wa, jenis, teks, dibuat) VALUES (?1, ?2, ?3, ?4)").bind(wa, jenis, teks, kini);
export const ljTimToken = (env, p, tokenSha) => sedia(env, p, "lj_tim", "baca",
  "SELECT berkas, wa, nama, peran, kedaluwarsa, dicabut FROM lj_tim WHERE token_sha = ?1").bind(tokenSha).first();
/* tukar token: hanya bila token lama masih sama (sekali pakai, tahan balapan) */
export const ljStmtTukarToken = (env, p, lama, baru, kedaluwarsa) => sedia(env, p, "lj_tim", "ubah",
  "UPDATE lj_tim SET token_sha = ?2, kedaluwarsa = ?3 WHERE token_sha = ?1 AND dicabut IS NULL").bind(lama, baru, kedaluwarsa);
export const ljTim = async (env, p, berkas) => (await sedia(env, p, "lj_tim", "baca",
  "SELECT wa, nama, peran, dibuat, dicabut FROM lj_tim WHERE berkas = ?1 ORDER BY dibuat").bind(berkas).all()).results;
/* LJ-09: atur tim. Tiap pernyataan bergaransi ditulis sesudah pernyataan yang menentukan berhasil tidaknya (changes() > 0), satu DB.batch. */
export const ljTimBaris = (env, p, berkas, wa) => sedia(env, p, "lj_tim", "baca", "SELECT wa, nama, peran, dicabut FROM lj_tim WHERE berkas = ?1 AND wa = ?2").bind(berkas, wa).first();
const LJ_PENUH = "(SELECT count(*) FROM lj_tim WHERE berkas = ?1 AND dicabut IS NULL) < ?8";   // batas anggota aktif atomik (?8 = maks, ketua ikut dihitung)
export const ljStmtTimAnggota = (env, p, berkas, wa, nama, tokenSha, kedaluwarsa, oleh, kini, maks) => sedia(env, p, "lj_tim", "tambah",
  `INSERT INTO lj_tim (berkas, wa, nama, peran, token_sha, kedaluwarsa, oleh, dibuat) SELECT ?1, ?2, ?3, 'anggota', ?4, ?5, ?6, ?7 WHERE ${LJ_PENUH}`).bind(berkas, wa, nama, tokenSha, kedaluwarsa, oleh, kini, maks);
export const ljStmtTimAktifkan = (env, p, berkas, wa, nama, tokenSha, kedaluwarsa, oleh, kini, maks) => sedia(env, p, "lj_tim", "ubah",
  `UPDATE lj_tim SET dicabut = NULL, peran = 'anggota', nama = coalesce(?3, nama), token_sha = ?4, kedaluwarsa = ?5, oleh = ?6, dibuat = ?7 WHERE berkas = ?1 AND wa = ?2 AND dicabut IS NOT NULL AND ${LJ_PENUH}`)
  .bind(berkas, wa, nama, tokenSha, kedaluwarsa, oleh, kini, maks);
export const ljStmtTimCabut = (env, p, berkas, wa, kini) => sedia(env, p, "lj_tim", "ubah",
  "UPDATE lj_tim SET dicabut = ?3, token_sha = NULL, kedaluwarsa = NULL WHERE berkas = ?1 AND wa = ?2 AND dicabut IS NULL AND peran = 'anggota'").bind(berkas, wa, kini);
export const ljStmtTimToken = (env, p, berkas, wa, tokenSha, kedaluwarsa) => sedia(env, p, "lj_tim", "ubah",
  "UPDATE lj_tim SET token_sha = ?3, kedaluwarsa = ?4 WHERE berkas = ?1 AND wa = ?2 AND dicabut IS NULL").bind(berkas, wa, tokenSha, kedaluwarsa);
export const ljStmtTimNama = (env, p, berkas, wa, nama) => sedia(env, p, "lj_tim", "ubah",
  "UPDATE lj_tim SET nama = ?3 WHERE berkas = ?1 AND wa = ?2 AND dicabut IS NULL AND nama IS NULL").bind(berkas, wa, nama);
/* pindah ketua: calon naik dulu; ketua lama turun hanya bila calon sudah ketua (EXISTS, tidak bergantung changes() sebelumnya); satu batch = tepat satu ketua sesudahnya */
export const ljStmtKetuaNaik = (env, p, berkas, wa) => sedia(env, p, "lj_tim", "ubah",
  "UPDATE lj_tim SET peran = 'ketua' WHERE berkas = ?1 AND wa = ?2 AND peran = 'anggota' AND dicabut IS NULL").bind(berkas, wa);
export const ljStmtKetuaTurun = (env, p, berkas, wa) => sedia(env, p, "lj_tim", "ubah",
  "UPDATE lj_tim SET peran = 'anggota' WHERE berkas = ?1 AND peran = 'ketua' AND wa <> ?2 AND EXISTS (SELECT 1 FROM lj_tim WHERE berkas = ?1 AND wa = ?2 AND peran = 'ketua')").bind(berkas, wa);
export const ljStmtSesiBuang = (env, p, wa, berkas) => sedia(env, p, "lj_sesi", "hapus", "DELETE FROM lj_sesi WHERE wa = ?1 AND berkas = ?2 AND changes() > 0").bind(wa, berkas);
export const ljObjek = async (env, p, berkas) => (await sedia(env, p, "lj_objek", "baca",
  "SELECT id, jenis, urut, data, pribadi, titik_id, desa, lat, lon, status, oleh, rev, dibuat, diubah FROM lj_objek WHERE berkas = ?1 ORDER BY jenis, urut").bind(berkas).all()).results;
export const ljObjekSatu = (env, p, id) => sedia(env, p, "lj_objek", "baca", "SELECT id, berkas, jenis, pribadi FROM lj_objek WHERE id = ?1").bind(id).first();
/* jumlah objek aktif per jenis untuk banyak berkas sekaligus (daftar staf) */
export const ljHitungJenis = async (env, p, ids) => ids.length ? (await sedia(env, p, "lj_objek", "baca",
  `SELECT berkas, jenis, count(*) n FROM lj_objek WHERE berkas IN (${ids.map((_, i) => "?" + (i + 1)).join(",")}) AND status = 'aktif' GROUP BY berkas, jenis`).bind(...ids).all()).results : [];
export const ljStmtAkses = (env, p, berkas, objek, aksi, oleh, kini, g = false) => sedia(env, p, "lj_akses", "tambah",
  g ? "INSERT INTO lj_akses (berkas, objek, aksi, oleh, waktu) SELECT ?1, ?2, ?3, ?4, ?5 WHERE changes() > 0" : "INSERT INTO lj_akses (berkas, objek, aksi, oleh, waktu) VALUES (?1, ?2, ?3, ?4, ?5)").bind(berkas, objek, aksi, oleh, kini);
/* LJ-04: objek, jejak, media. Objek baru mengambil urut berikutnya dalam satu pernyataan (indeks lj_objek_berkas); UNIQUE (berkas, jenis, urut)
   menolak balapan dan pemanggil mengulang. Ubah dan batal dijaga rev (409 bila kalah). */
const LJ_OBJEK = "id, berkas, jenis, urut, data, pribadi, titik_id, desa, lat, lon, status, klien_id, oleh, rev, dibuat, diubah";
export const ljObjekId = (env, p, id) => sedia(env, p, "lj_objek", "baca", `SELECT ${LJ_OBJEK} FROM lj_objek WHERE id = ?1`).bind(id).first();
/* LJ-07: korban dicari lewat nomor urut di berkas (perintah WA "ubah hilang <nomor>"); UNIQUE (berkas, jenis, urut) */
export const ljObjekUrut = (env, p, berkas, jenis, urut) => sedia(env, p, "lj_objek", "baca", `SELECT ${LJ_OBJEK} FROM lj_objek WHERE berkas = ?1 AND jenis = ?2 AND urut = ?3 AND status = 'aktif'`).bind(berkas, jenis, urut).first();
export const ljObjekKlien = (env, p, klien) => sedia(env, p, "lj_objek", "baca", `SELECT ${LJ_OBJEK} FROM lj_objek WHERE klien_id = ?1`).bind(klien).first();
export const ljStmtObjekBaru = (env, p, o, kini) => sedia(env, p, "lj_objek", "tambah",
  `INSERT INTO lj_objek (id, berkas, jenis, urut, data, pribadi, titik_id, desa, lat, lon, klien_id, oleh, dibuat, diubah)
   SELECT ?1, ?2, ?3, coalesce(max(urut), 0) + 1, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?12 FROM lj_objek WHERE berkas = ?2 AND jenis = ?3
   HAVING (?13 IS NULL OR EXISTS (SELECT 1 FROM lj_objek t WHERE t.berkas = ?2 AND t.jenis = 'titik' AND t.status = 'aktif' AND t.titik_id = ?13)) AND EXISTS (SELECT 1 FROM lj_berkas bk WHERE bk.id = ?2 AND bk.status = 'terbuka')`)
  .bind(o.id, o.berkas, o.jenis, o.data, o.pribadi, o.titik_id ?? null, o.desa ?? null, o.lat ?? null, o.lon ?? null, o.klien_id ?? null, o.oleh, kini, o.syaratTitik ?? null);   // syaratTitik (jiwa): titik harus masih aktif saat INSERT, atomik (LJ-06)
export const ljStmtObjekUbah = (env, p, o, rev, kini) => sedia(env, p, "lj_objek", "ubah",
  `UPDATE lj_objek SET data = ?3, pribadi = ?4, titik_id = ?5, desa = ?6, lat = ?7, lon = ?8, rev = rev + 1, diubah = ?9 WHERE id = ?1 AND berkas = ?2 AND rev = ?10 AND status = 'aktif'
   AND (?11 IS NULL OR EXISTS (SELECT 1 FROM lj_objek t WHERE t.berkas = ?2 AND t.jenis = 'titik' AND t.status = 'aktif' AND t.titik_id = ?11)) AND EXISTS (SELECT 1 FROM lj_berkas bk WHERE bk.id = ?2 AND bk.status = 'terbuka')`)
  .bind(o.id, o.berkas, o.data, o.pribadi, o.titik_id ?? null, o.desa ?? null, o.lat ?? null, o.lon ?? null, kini, rev, o.syaratTitik ?? null);
/* titikId (hanya saat objeknya titik): batal ditolak bila masih ada jiwa atau kebutuhan aktif di titik itu, atomik di SQL (LJ-06, LJ-08) */
export const ljStmtObjekBatal = (env, p, id, berkas, rev, kini, titikId = null) => sedia(env, p, "lj_objek", "ubah",
  `UPDATE lj_objek SET status = 'batal', rev = rev + 1, diubah = ?4 WHERE id = ?1 AND berkas = ?2 AND rev = ?3 AND status = 'aktif'
   AND (?5 IS NULL OR NOT EXISTS (SELECT 1 FROM lj_objek j WHERE j.berkas = ?2 AND j.jenis IN ('jiwa', 'kebutuhan') AND j.status = 'aktif' AND json_extract(j.data, '$.titik') = ?5))
   AND (?5 IS NULL OR coalesce((SELECT json_extract(b.isian, '$.posko.titik') FROM lj_berkas b WHERE b.id = ?2), '') <> ?5) AND EXISTS (SELECT 1 FROM lj_berkas bk WHERE bk.id = ?2 AND bk.status = 'terbuka')`).bind(id, berkas, rev, kini, titikId);   // titik yang jadi posko tidak bisa batal
/* titik dari foto hanya mengisi objek yang belum bertitik (ALGORITMA 3: isian manual didahulukan) */
export const ljStmtObjekTitik = (env, p, id, lat, lon, kini, g = false) => sedia(env, p, "lj_objek", "ubah",
  `UPDATE lj_objek SET lat = ?2, lon = ?3, diubah = ?4 WHERE id = ?1 AND lat IS NULL AND EXISTS (SELECT 1 FROM lj_berkas bk WHERE bk.id = lj_objek.berkas AND bk.status = 'terbuka')${g ? " AND changes() > 0" : ""}`).bind(id, lat, lon, kini);
export const ljStmtJejak = (env, p, j, kini, g = false) => sedia(env, p, "lj_jejak", "tambah",
  g ? "INSERT INTO lj_jejak (berkas, objek, aksi, sebelum, sesudah, pribadi_sidik, oleh, waktu) SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8 WHERE changes() > 0"
    : "INSERT INTO lj_jejak (berkas, objek, aksi, sebelum, sesudah, pribadi_sidik, oleh, waktu) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)")
  .bind(j.berkas, j.objek ?? null, j.aksi, j.sebelum ?? null, j.sesudah ?? null, j.pribadi_sidik ?? null, j.oleh, kini);
/* LJ-08: isian berkas (status darurat, SK, posko, upaya, personel) dan tanda nihil per metrik hidup di lj_berkas.isian (JSON). Semua perubahan = SATU pernyataan UPDATE
   (json_patch, json_set), bukan baca lalu tulis, jadi dua simpan serentak tidak saling menghapus kunci lain (nihil, kab_nama). Hanya berkas terbuka. */
export const ljStmtIsian = (env, p, berkas, patch, kini, titikPosko = null) => sedia(env, p, "lj_berkas", "ubah",
  `UPDATE lj_berkas SET isian = json_patch(isian, ?2), diubah = ?3 WHERE id = ?1 AND status = 'terbuka'
   AND (?4 IS NULL OR EXISTS (SELECT 1 FROM lj_objek t WHERE t.berkas = ?1 AND t.jenis = 'titik' AND t.status = 'aktif' AND t.titik_id = ?4))`).bind(berkas, patch, kini, titikPosko);   // posko.titik harus masih titik aktif saat tulis
export const ljStmtNihil = (env, p, berkas, metrik, nihil, kini) => sedia(env, p, "lj_berkas", "ubah", nihil
  ? `UPDATE lj_berkas SET isian = json_set(isian, '$.nihil', json((SELECT json_group_array(v) FROM (SELECT value v FROM json_each(isian, '$.nihil') UNION SELECT ?2 ORDER BY 1)))), diubah = ?3
     WHERE id = ?1 AND status = 'terbuka' AND NOT EXISTS (SELECT 1 FROM json_each(isian, '$.nihil') WHERE value = ?2)`
  : `UPDATE lj_berkas SET isian = json_set(isian, '$.nihil', json(coalesce((SELECT json_group_array(value) FROM json_each(isian, '$.nihil') WHERE value <> ?2), '[]'))), diubah = ?3
     WHERE id = ?1 AND status = 'terbuka' AND EXISTS (SELECT 1 FROM json_each(isian, '$.nihil') WHERE value = ?2)`).bind(berkas, metrik, kini);
/* objek baru atau diubah mencabut nihil metrik yang disentuhnya, di batch yang sama dengan objek; hanya bila objeknya benar tersimpan (diubah = kini), hanya yang memang bertanda */
export const ljStmtNihilCabut = (env, p, berkas, metrik, objek, kini) => sedia(env, p, "lj_berkas", "ubah",
  `UPDATE lj_berkas SET isian = json_set(isian, '$.nihil', json(coalesce((SELECT json_group_array(value) FROM json_each(isian, '$.nihil') WHERE value NOT IN (SELECT value FROM json_each(?2))), '[]'))), diubah = ?4
   WHERE id = ?1 AND status = 'terbuka' AND EXISTS (SELECT 1 FROM json_each(isian, '$.nihil') WHERE value IN (SELECT value FROM json_each(?2))) AND EXISTS (SELECT 1 FROM lj_objek WHERE id = ?3 AND diubah = ?4)`)
  .bind(berkas, JSON.stringify(metrik), objek, kini);
/* LJ-13 penutupan (D13, D14, Q2). Tulis objek, foto, batal, nihil, dan isian di atas hanya kena berkas TERBUKA, dijaga di SQL (EXISTS lj_berkas status terbuka),
   jadi tulis yang balapan dengan tutup kalah tanpa jendela baca-lalu-tulis. Usul tutup hanya bila berkas dan objeknya tidak berubah sejak dibaca (diubah berkas
   dan max(diubah) objek sama), supaya versi beku sama persis dengan daftar yang dihitung. Versi beku append-only: nomor versi diambil di SQL. */
export const ljObjekBeku = async (env, p, berkas) => (await sedia(env, p, "lj_objek", "baca",
  "SELECT id, jenis, urut, data, pribadi, titik_id, status, diubah FROM lj_objek WHERE berkas = ?1").bind(berkas).all()).results;
export const ljStmtUsulTutup = (env, p, berkas, penutupan, diubahBerkas, diubahObjek, kini) => sedia(env, p, "lj_berkas", "ubah",
  `UPDATE lj_berkas SET status = 'usul_tutup', isian = json_set(isian, '$.penutupan', json(?2)), diubah = ?3 WHERE id = ?1 AND status = 'terbuka' AND diubah = ?4
   AND coalesce((SELECT max(o.diubah) FROM lj_objek o WHERE o.berkas = ?1), 0) = ?5`).bind(berkas, penutupan, kini, diubahBerkas, diubahObjek);
export const ljStmtBekuBaru = (env, p, berkas, isi, sidik, oleh, kini) => sedia(env, p, "lj_beku", "tambah",
  "INSERT INTO lj_beku (berkas, versi, isi, sidik, oleh, waktu) SELECT ?1, coalesce(max(versi), 0) + 1, ?2, ?3, ?4, ?5 FROM lj_beku WHERE berkas = ?1 HAVING changes() > 0")
  .bind(berkas, isi, sidik, oleh, kini);
export const ljBekuTerakhir = (env, p, berkas) => sedia(env, p, "lj_beku", "baca", "SELECT versi, sidik, waktu FROM lj_beku WHERE berkas = ?1 ORDER BY versi DESC LIMIT 1").bind(berkas).first();
/* staf menerima usul tutup: status akhir dari kondisi akhir yang dihitung saat ketua menutup (isian.penutupan.status), ditutup = awal hitungan 5 tahun (D23) */
export const ljStmtTutupTerima = (env, p, berkas, kini) => sedia(env, p, "lj_berkas", "ubah",
  `UPDATE lj_berkas SET status = json_extract(isian, '$.penutupan.status'), ditutup = ?2, diubah = ?2
   WHERE id = ?1 AND status = 'usul_tutup' AND json_extract(isian, '$.penutupan.status') IN ('selesai', 'selesai_catatan')`).bind(berkas, kini);
/* LJ-14: kejadian_id dan kab4 berkas diisi dari tautan sk_kejadian_sumber (sumber lapor_ai, kode = tiket induk) hanya bila masih NULL. Tidak menyentuh diubah (penjaga usul tutup memakainya).
   Satu UPDATE: PK lj_berkas, UNIQUE (sumber, kode, dummy). kab4 dari tautan, kalau kosong dari kode kab berkas ("32.71"). */
export const ljIsiTautan = (env, p, berkas) => sedia(env, p, "lj_berkas", "ubah",
  `UPDATE lj_berkas SET kejadian_id = (SELECT s.kejadian_id FROM sk_kejadian_sumber s WHERE s.sumber = 'lapor_ai' AND s.kode = lj_berkas.induk AND s.dummy = 0 AND s.status = 'terpasang'),
     kab4 = coalesce(kab4, (SELECT s.kab4 FROM sk_kejadian_sumber s WHERE s.sumber = 'lapor_ai' AND s.kode = lj_berkas.induk AND s.dummy = 0 AND s.status = 'terpasang'),
       CASE WHEN kab GLOB '[0-9][0-9].[0-9][0-9]' THEN substr(kab, 1, 2) || substr(kab, 4, 2) END)
   WHERE id = ?1 AND kejadian_id IS NULL AND EXISTS (SELECT 1 FROM sk_kejadian_sumber s WHERE s.sumber = 'lapor_ai' AND s.kode = lj_berkas.induk AND s.dummy = 0 AND s.status = 'terpasang')`).bind(berkas).run();
/* LJ-14: berkas tertaut ke satu kejadian yang penutupannya SUDAH diterima staf, dengan versi beku terakhir (tanpa data pribadi). Indeks lj_berkas_kejadian, PK/indeks lj_beku (berkas, versi). */
export const ljBerkasUsulan = async (env, p, kejadian) => (await sedia(env, p, "lj_berkas", "baca",
  `SELECT b.induk, b.kab, b.status, b.ditutup, (SELECT x.isi FROM lj_beku x WHERE x.berkas = b.id ORDER BY x.versi DESC LIMIT 1) beku FROM lj_berkas b
   WHERE b.kejadian_id = ?1 AND b.status IN ('selesai', 'selesai_catatan') AND b.ditutup IS NOT NULL ORDER BY b.ditutup LIMIT 20`).bind(kejadian).all()).results;
/* buka lagi (usul ditolak, atau perubahan sesudah ditutup): ditutup dikosongkan, jadi hitungan 5 tahun mulai lagi dari penutupan berikutnya (D23); versi lama tetap */
export const ljStmtBukaLagi = (env, p, berkas, kini) => sedia(env, p, "lj_berkas", "ubah",
  `UPDATE lj_berkas SET status = 'terbuka', ditutup = NULL, isian = json_remove(isian, '$.penutupan'), diubah = ?2
   WHERE id = ?1 AND status IN ('usul_tutup', 'selesai', 'selesai_catatan')`).bind(berkas, kini);
/* tiket LA- ke selesai hanya bila penutupan berkas ini baru saja diterima (ditutup = kini) dan tidak ada berkas lain tiket itu yang masih terbuka atau menunggu */
export const ljStmtTiketSelesai = (env, p, nomor, dari, berkas, kini) => sedia(env, p, "lapor_tiket", "ubah",
  `UPDATE lapor_tiket SET status = 'selesai', diubah = ?4 WHERE nomor = ?1 AND status = ?2
   AND EXISTS (SELECT 1 FROM lj_berkas b WHERE b.id = ?3 AND b.ditutup = ?4)
   AND NOT EXISTS (SELECT 1 FROM lj_berkas b WHERE b.induk = ?1 AND b.status IN ('terbuka', 'usul_tutup'))`).bind(nomor, dari, berkas, kini);
export const ljMedia = async (env, p, objek) => (await sedia(env, p, "lj_media", "baca",
  "SELECT id, objek, jenis, lat, lon, akurasi, waktu_ambil, waktu_terima, lencana, pintu FROM lj_media WHERE objek = ?1 ORDER BY waktu_terima").bind(objek).all()).results;
export const ljWajahKunci = async (env, p, objek) => (await sedia(env, p, "lj_media", "baca", "SELECT kunci_r2 FROM lj_media WHERE objek = ?1 AND jenis = 'wajah'").bind(objek).all()).results.map(r => r.kunci_r2);
export const ljStmtWajahHapus = (env, p, objek) => sedia(env, p, "lj_media", "hapus",
  "DELETE FROM lj_media WHERE objek = ?1 AND jenis = 'wajah' AND changes() > 0 AND EXISTS (SELECT 1 FROM lj_objek o JOIN lj_berkas bk ON bk.id = o.berkas WHERE o.id = ?1 AND bk.status = 'terbuka')").bind(objek);
export const ljMediaSatu = (env, p, id) => sedia(env, p, "lj_media", "baca",
  "SELECT m.id, m.objek, m.kunci_r2, m.jenis, o.berkas FROM lj_media m JOIN lj_objek o ON o.id = m.objek WHERE m.id = ?1").bind(id).first();
/* batas jumlah per objek dan jenis dicek di pernyataan yang sama (atomik); objek harus masih aktif dan foto wajah hanya bila syaratnya masih terpenuhi saat tulis
   (= wajahBoleh di lapor_lanjut_spek.js; 18 = DEWASA): changes() = 0 berarti penuh, objek batal, atau syarat gugur (LJ-07, balapan dengan ubah status) */
export const ljStmtMediaBaru = (env, p, m, maks) => sedia(env, p, "lj_media", "tambah",
  `INSERT INTO lj_media (id, objek, kunci_r2, jenis, lat, lon, akurasi, waktu_ambil, waktu_terima, lencana, pintu, oleh)
   SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12 WHERE (SELECT count(*) FROM lj_media WHERE objek = ?2 AND jenis = ?4) < ?13
   AND EXISTS (SELECT 1 FROM lj_objek o WHERE o.id = ?2 AND o.status = 'aktif' AND EXISTS (SELECT 1 FROM lj_berkas bk WHERE bk.id = o.berkas AND bk.status = 'terbuka') AND (?4 <> 'wajah'
     OR (o.jenis = 'jiwa' AND coalesce(json_extract(o.data, '$.umur'), -1) >= 18 AND coalesce(json_extract(o.data, '$.menolak_foto'), 0) = 0)
     OR (o.jenis = 'korban' AND json_extract(o.data, '$.status') = 'hilang' AND json_extract(o.data, '$.pencarian') = 'dicari')))`)
  .bind(m.id, m.objek, m.kunci_r2, m.jenis, m.lat ?? null, m.lon ?? null, m.akurasi ?? null, m.waktu_ambil ?? null, m.waktu_terima, m.lencana, m.pintu, m.oleh, maks);

/* LJ-06: register titik pengungsian dari objek `titik` (D6). Baris register yang dibuat berkas ditandai pembuat = "lapor_lanjut:<berkas>"; hanya baris itu yang disinkronkan
   saat objek diubah. Tulis selalu dalam batch yang sama dengan objek dan dijaga changes() > 0 (jejak sebelumnya). Kueri memakai PK dan indeks titik_pengungsian_kab_koordinat. */
export const ljTpById = (env, p, id) => sedia(env, p, "titik_pengungsian", "baca", "SELECT id, kab4, nama, tutup, pembuat FROM titik_pengungsian WHERE id = ?1").bind(id).first();
export const ljTpSekitar = async (env, p, kab4, lat, lon, d) => (await sedia(env, p, "titik_pengungsian", "baca",
  `SELECT id, nama, lat, lon FROM titik_pengungsian WHERE kab4 = ?1 AND lat BETWEEN ?2 AND ?3 AND lon BETWEEN ?4 AND ?5 AND tutup IS NULL
   ORDER BY ((lat - ?6) * (lat - ?6) + (lon - ?7) * (lon - ?7)) LIMIT 50`).bind(kab4, lat - d, lat + d, lon - d, lon + d, lat, lon).all()).results;   // terdekat dulu sebelum LIMIT
export const ljStmtTpBaru = (env, p, t, kini) => sedia(env, p, "titik_pengungsian", "tambah",
  `INSERT INTO titik_pengungsian (id, prov, kab4, kec, desa, nama, jenis_tempat, lat, lon, kejadian_id, buka, dibuat, pembuat)
   SELECT ?1, ?2, ?3, NULL, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12 WHERE changes() > 0`)
  .bind(t.id, t.kab4.slice(0, 2), t.kab4, t.desa ?? null, t.nama, t.jenis_tempat, t.lat ?? null, t.lon ?? null, t.kejadian_id ?? null, t.buka ?? null, kini, t.pembuat);
/* batal titik yang TP-nya dibuat berkas ini: tutup TP (dijaga pembuat, belum tutup, dan pernyataan sebelumnya mengubah baris); tautan milik pihak lain tidak disentuh */
export const ljStmtTpTutup = (env, p, id, tgl, pembuat) => sedia(env, p, "titik_pengungsian", "ubah",
  "UPDATE titik_pengungsian SET tutup = ?2 WHERE id = ?1 AND pembuat = ?3 AND tutup IS NULL AND changes() > 0").bind(id, tgl, pembuat);
export const ljStmtTpUbah = (env, p, t) => sedia(env, p, "titik_pengungsian", "ubah",
  "UPDATE titik_pengungsian SET nama = ?2, desa = ?3, jenis_tempat = ?4, buka = ?5 WHERE id = ?1 AND pembuat = ?6 AND changes() > 0").bind(t.id, t.nama, t.desa ?? null, t.jenis_tempat, t.buka ?? null, t.pembuat);

/* LJ-05: pintu WA tahap 2. Anggota tim aktif = baris lj_tim tanpa dicabut pada berkas yang masih terbuka (D11); draf percakapan di lj_sesi (migrasi 0165, D24). */
export const ljTimAktif = (env, p, wa) => sedia(env, p, "lj_tim", "baca",
  "SELECT t.berkas, t.wa, t.peran, t.nama FROM lj_tim t JOIN lj_berkas b ON b.id = t.berkas WHERE t.wa = ?1 AND t.dicabut IS NULL AND b.status = 'terbuka' ORDER BY t.dibuat DESC LIMIT 1").bind(wa).first();
export const ljSesi = (env, p, wa) => sedia(env, p, "lj_sesi", "baca", "SELECT wa, berkas, keadaan, diubah FROM lj_sesi WHERE wa = ?1").bind(wa).first();
export const ljSesiBaru = (env, p, wa, berkas, keadaan, kini) => sedia(env, p, "lj_sesi", "tambah",
  "INSERT OR REPLACE INTO lj_sesi (wa, berkas, keadaan, diubah) VALUES (?1, ?2, ?3, ?4)").bind(wa, berkas, keadaan, kini).run();
/* jaga bentrok dua pesan serentak: berubah hanya bila diubah masih yang tadi dibaca; changes = 0 berarti kalah */
export const ljSesiUbah = async (env, p, wa, keadaan, diubahLama, kini) => (await sedia(env, p, "lj_sesi", "ubah",
  "UPDATE lj_sesi SET keadaan = ?2, diubah = ?4 WHERE wa = ?1 AND diubah = ?3").bind(wa, keadaan, diubahLama, kini).run()).meta.changes;
export const ljSesiHapus = (env, p, wa, sebelum = null) => sedia(env, p, "lj_sesi", "hapus", "DELETE FROM lj_sesi WHERE wa = ?1 AND (?2 IS NULL OR diubah < ?2)").bind(wa, sebelum).run();
export const ljSesiBasi = async (env, p, sebelum) => (await sedia(env, p, "lj_sesi", "baca",
  "SELECT wa, berkas, keadaan FROM lj_sesi WHERE diubah < ?1 ORDER BY diubah LIMIT 100").bind(sebelum).all()).results;
/* LJ-19: draf milik berkas ini yang masih dipakai sesi tim. Pencarian lewat PK lj_tim (berkas, wa) lalu PK lj_sesi (wa), tanpa pindai. */
export const ljSesiBerkas = async (env, p, berkas) => (await sedia(env, p, "lj_sesi", "baca",
  "SELECT keadaan FROM lj_sesi WHERE wa IN (SELECT wa FROM lj_tim WHERE berkas = ?1) AND berkas = ?1").bind(berkas).all()).results;

/* LJ-17 (D23, K9): hapus data pribadi 5 tahun sesudah penutupan diterima. Syarat "berkas tutup lewat batas" diulang di tiap pernyataan tulis (berkas yang dibuka lagi
   punya ditutup NULL dan lolos tak pernah). Penanda selesai = baris lj_jejak 'hapus_pribadi' bertanggal sesudah ditutup (PK/indeks lj_jejak (berkas, id)). */
const LJ_LEWAT = "EXISTS (SELECT 1 FROM lj_berkas b WHERE b.id = ?1 AND b.status IN ('selesai', 'selesai_catatan') AND b.ditutup < ?2)";
export const ljPribadiJatuhTempo = async (env, p, batas, maks) => (await sedia(env, p, "lj_berkas", "baca",
  `SELECT id FROM lj_berkas b WHERE b.status IN ('selesai', 'selesai_catatan') AND b.ditutup < ?1
   AND NOT EXISTS (SELECT 1 FROM lj_jejak j WHERE j.berkas = b.id AND j.aksi = 'hapus_pribadi' AND j.waktu >= b.ditutup) ORDER BY b.ditutup LIMIT ?2`).bind(batas, maks).all()).results.map(r => r.id);
export const ljWajahBerkas = async (env, p, berkas, batas, maks) => (await sedia(env, p, "lj_media", "baca",
  `SELECT m.id, m.kunci_r2 FROM lj_media m JOIN lj_objek o ON o.id = m.objek WHERE o.berkas = ?1 AND m.jenis = 'wajah' AND ${LJ_LEWAT} LIMIT ?3`).bind(berkas, batas, maks).all()).results;
export const ljStmtMediaLepas = (env, p, berkas, batas, ids) => sedia(env, p, "lj_media", "hapus",
  `DELETE FROM lj_media WHERE jenis = 'wajah' AND id IN (SELECT value FROM json_each(?3)) AND objek IN (SELECT id FROM lj_objek WHERE berkas = ?1) AND ${LJ_LEWAT} RETURNING kunci_r2`).bind(berkas, batas, JSON.stringify(ids));
export const ljStmtPribadiKosong = (env, p, berkas, batas) => sedia(env, p, "lj_objek", "ubah",
  `UPDATE lj_objek SET pribadi = NULL WHERE berkas = ?1 AND pribadi IS NOT NULL AND ${LJ_LEWAT}`).bind(berkas, batas);
/* K9 dibaca ketat: sidik HMAC isian pribadi di lj_jejak ikut dikosongkan (baris jejak tetap; lj_tim tidak disentuh) */
export const ljStmtJejakSidikKosong = (env, p, berkas, batas) => sedia(env, p, "lj_jejak", "ubah",
  `UPDATE lj_jejak SET pribadi_sidik = NULL WHERE berkas = ?1 AND pribadi_sidik IS NOT NULL AND ${LJ_LEWAT}`).bind(berkas, batas);
export const ljStmtPribadiJejak = (env, p, berkas, batas, sesudah, kini) => sedia(env, p, "lj_jejak", "tambah",
  `INSERT INTO lj_jejak (berkas, aksi, sesudah, oleh, waktu) SELECT ?1, 'hapus_pribadi', ?3, 'cron', ?4 WHERE ${LJ_LEWAT}`).bind(berkas, batas, sesudah, kini);

/* LJ-10: pertanyaan harian (D12). Berkas terbuka tanpa baris lj_tanya tanggal itu, ketuanya aktif DAN nomornya di lapor_izin (gerbang fase F0: nomor uji dan PEMILIK).
   Indeks: lj_berkas_status (status), PK lj_tanya (berkas, tgl), PK lj_tim (berkas, wa). */
export const ljBelumTanya = async (env, p, tgl, batas) => (await sedia(env, p, "lj_berkas", "baca",
  `SELECT b.id, b.induk, b.kab, json_extract(b.isian, '$.kab_nama') nama, k.wa FROM lj_berkas b JOIN lj_tim k ON k.berkas = b.id AND k.peran = 'ketua' AND k.dicabut IS NULL
   WHERE b.status = 'terbuka' AND NOT EXISTS (SELECT 1 FROM lj_tanya t WHERE t.berkas = b.id AND t.tgl = ?1)
   AND EXISTS (SELECT 1 FROM lapor_izin z WHERE z.wa = k.wa) ORDER BY b.id LIMIT ?2`).bind(tgl, batas).all()).results;
/* pesan ketua + baris tanyanya dalam SATU rangkaian batch (maks ~90 parameter): pesan ditulis HANYA bila belum ada baris lj_tanya hari itu untuk berkas-berkas ini
   (batch D1 berjalan serial, jadi putaran yang kalah balapan tidak menulis pesan), lalu tiap baris lj_tanya ditulis hanya bila pesannya benar-benar masuk (changes() > 0 berantai). */
export const ljStmtKabarHarian = (env, p, wa, teks, kini, tgl, berkas) => sedia(env, p, "lj_kabar", "tambah",
  `INSERT INTO lj_kabar (wa, jenis, teks, dibuat) SELECT ?1, 'harian', ?2, ?3 WHERE NOT EXISTS (SELECT 1 FROM lj_tanya WHERE tgl = ?4 AND berkas IN (${berkas.map((_, i) => "?" + (i + 5)).join(",")}))`)
  .bind(wa, teks, kini, tgl, ...berkas);
export const ljStmtTanya = (env, p, berkas, tgl, kini) => sedia(env, p, "lj_tanya", "tambah",
  "INSERT INTO lj_tanya (berkas, tgl, waktu) SELECT ?1, ?2, ?3 WHERE changes() > 0").bind(berkas, tgl, kini);
/* pertanyaan hari ini untuk berkas yang diketuai nomor ini, urut seperti nomor di pesan (waktu, berkas). LIMIT 200 = MAKS_TANYA (satu putaran tak pernah menulis lebih).
   Nomor yang baru menjadi ketua SESUDAH pertanyaan dikirim (jejak tim_pindah_ketua bersidik nomor ini, waktu > waktu pertanyaan) tidak ikut: pertanyaan itu bukan untuknya. */
export const ljTanyaKetua = async (env, p, wa, tgl, sidik) => (await sedia(env, p, "lj_tanya", "baca",
  `SELECT t.berkas, t.jawab FROM lj_tanya t JOIN lj_tim k ON k.berkas = t.berkas AND k.wa = ?1 AND k.peran = 'ketua' AND k.dicabut IS NULL
   WHERE t.tgl = ?2 AND NOT EXISTS (SELECT 1 FROM lj_jejak j WHERE j.berkas = t.berkas AND j.aksi = 'tim_pindah_ketua' AND j.pribadi_sidik = ?3 AND j.waktu > t.waktu)
   ORDER BY t.waktu, t.berkas LIMIT 200`).bind(wa, tgl, sidik ?? "").all()).results;
/* putaran ulang: jumlah pertanyaan hari ini per ketua, SATU kueri berkelompok per 90 nomor (batas 100 parameter D1) */
export const ljTanyaHitung = async (env, p, tgl, was) => (await sedia(env, p, "lj_tanya", "baca",
  `SELECT k.wa, count(*) n FROM lj_tim k JOIN lj_tanya t ON t.berkas = k.berkas AND t.tgl = ?1 WHERE k.wa IN (${was.map((_, i) => "?" + (i + 2)).join(",")}) AND k.peran = 'ketua' AND k.dicabut IS NULL GROUP BY k.wa`)
  .bind(tgl, ...was).all()).results;
export const ljStmtTanyaJawab = (env, p, berkas, tgl, jawab) => sedia(env, p, "lj_tanya", "ubah",
  "UPDATE lj_tanya SET jawab = ?3 WHERE berkas = ?1 AND tgl = ?2").bind(berkas, tgl, jawab);

/* ---------- LJ-12: rekap berkas ke meja dampak dan pengungsi, terima ke Jitupasna (D5, D6, D8). Pelaku lj_rekap = mesin rekap (dipanggil sesudah tulis objek), lp_staf = rute terima.
   Catatan meja dampak milik berkas memakai id yang SAMA dengan id berkas (dicari lewat PK, tanpa indeks baru); catatan pengungsi lewat indeks unik meja_pengungsi_titik_hari (0135).
   Tulis ke catatan yang sudah ada dijaga isi lama (data = ?) supaya isian petugas yang masuk di antara baca dan tulis tidak tertimpa; kalah = changes 0. ---------- */
export const pelakuLjRekap = {peran: "lj_rekap"};
Object.assign(MATRIKS, {meja_catatan: {lj_rekap: ["baca", "tambah", "ubah"]}, meja_jejak: {lj_rekap: ["baca", "tambah"]}});
MATRIKS.lj_objek.lj_rekap = ["baca"]; MATRIKS.lj_berkas.lj_rekap = ["baca"]; MATRIKS.lapor_sesi.lj_rekap = ["baca"];
/* lj_terima = HANYA terimaJitupasna (src/lapor_lanjut_meja.js); lp_staf tidak mendapat hak sk_* apa pun dari bagian ini */
export const pelakuLjTerima = {peran: "lj_terima"};
MATRIKS.sk_kejadian.lj_terima = ["baca"]; MATRIKS.sk_jitupasna.lj_terima = ["baca"]; MATRIKS.sk_jitupasna_baris.lj_terima = ["baca", "tambah", "ubah"]; MATRIKS.sk_jejak.lj_terima = ["tambah"];
MATRIKS.lj_objek.lj_terima = ["baca"]; MATRIKS.lj_jejak.lj_terima = ["tambah"];
/* objek aktif dan batal tanpa kolom pribadi: rekap hanya butuh data */
export const ljObjekRekap = async (env, p, berkas) => (await sedia(env, p, "lj_objek", "baca",
  "SELECT id, jenis, urut, data, titik_id, status FROM lj_objek WHERE berkas = ?1").bind(berkas).all()).results;
export const ljIndukInfo = (env, p, nomor) => sedia(env, p, "lapor_sesi", "baca",
  "SELECT jenis, terkirim, json_extract(kerja, '$.isian.waktu.ms') waktu FROM lapor_sesi WHERE nomor = ?1").bind(nomor).first();
export const ljBerkasRekap = (env, p, id) => sedia(env, p, "lj_berkas", "baca", "SELECT id, induk, kab, kab4, isian FROM lj_berkas WHERE id = ?1").bind(id).first();
export const ljDampakBaca = (env, p, id) => sedia(env, p, "meja_catatan", "baca", "SELECT id, status, data FROM meja_catatan WHERE id = ?1 AND meja = 'dampak'").bind(id).first();
export const ljStmtDampakBaru = (env, p, b, kini) => sedia(env, p, "meja_catatan", "tambah",
  "INSERT OR IGNORE INTO meja_catatan (id, meja, prov, kab, kec, desa, data, status, dibuat, diubah, oleh) VALUES (?1, 'dampak', ?2, ?3, NULL, NULL, ?4, 'dilaporkan', ?5, ?5, 'lapor_lanjut')").bind(b.id, b.prov, b.kab, b.data, kini);
export const ljStmtPengungsiBaru = (env, p, b, kini) => sedia(env, p, "meja_catatan", "tambah",
  "INSERT OR IGNORE INTO meja_catatan (id, meja, prov, kab, kec, desa, data, status, dibuat, diubah, oleh) VALUES (?1, 'pengungsi', ?2, ?3, NULL, ?4, ?5, 'tercatat', ?6, ?6, 'lapor_lanjut')").bind(b.id, b.prov, b.kab, b.desa ?? null, b.data, kini);
/* isi lama harus masih sama (data = ?2) dan status masih yang dibaca; diubah hanya maju bila sentuh (rekap yang hanya menandai rekap_baru tidak menyentuh) */
export const ljStmtMejaUbah = (env, p, id, lama, baru, status, kini, sentuh) => sedia(env, p, "meja_catatan", "ubah",
  "UPDATE meja_catatan SET data = ?3, diubah = CASE WHEN ?5 = 1 THEN max(diubah, ?4) ELSE diubah END WHERE id = ?1 AND data = ?2 AND status = ?6").bind(id, lama, baru, kini, sentuh ? 1 : 0, status);
export const ljStmtMejaJejak = (env, p, id, dari, ke, kini, catatan) => sedia(env, p, "meja_jejak", "tambah",
  "INSERT INTO meja_jejak (catatan_id, dari, ke, waktu, oleh, catatan, diterima) SELECT ?1, ?2, ?3, ?4, 'lapor_lanjut', ?5, ?4 WHERE changes() > 0").bind(id, dari, ke, kini, catatan);
/* penulis terakhir sebuah catatan (indeks meja_jejak_catatan): selain lapor_lanjut berarti petugas pernah mengubahnya */
export const ljStmtJejakOleh = (env, p, id) => sedia(env, p, "meja_jejak", "baca", "SELECT oleh FROM meja_jejak WHERE catatan_id = ?1 ORDER BY waktu DESC, id DESC LIMIT 1").bind(id);
/* catatan pengungsi satu titik satu tanggal (indeks parsial meja_pengungsi_titik_hari); beberapa titik = satu batch SELECT */
export const ljStmtPengungsiBaca = (env, p, titik, tgl) => sedia(env, p, "meja_catatan", "baca",
  "SELECT id, status, data FROM meja_catatan WHERE meja = 'pengungsi' AND json_extract(data, '$.titik_id') = ?1 AND json_extract(data, '$.tgl_data') = ?2").bind(titik, tgl);
/* Jitupasna: baris dari berkas, upsert per (jitupasna, klien_id) dan hanya selama dibuka atau pengumpulan (trigger final menolak sisanya); unit_asal rekap_rumah_rusak untuk rumah */
export const ljStmtBarisTerima = (env, p, jpId, b, kini, oleh, dummy) => sedia(env, p, "sk_jitupasna_baris", "tambah",
  `INSERT INTO sk_jitupasna_baris (id, jitupasna_id, jenis, sektor, tingkat, unit, unit_asal, klien_id, dibuat, oleh, dummy)
   SELECT ?1, ?2, 'rusak', ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10 WHERE (SELECT status FROM sk_jitupasna WHERE id = ?2) IN ('dibuka', 'pengumpulan') AND (SELECT count(*) FROM sk_jitupasna_baris WHERE jitupasna_id = ?2) < 500
   ON CONFLICT (jitupasna_id, klien_id) DO UPDATE SET unit = excluded.unit, unit_asal = excluded.unit_asal WHERE (SELECT status FROM sk_jitupasna WHERE id = excluded.jitupasna_id) IN ('dibuka', 'pengumpulan')`)
  .bind(b.id, jpId, b.sektor, b.tingkat, b.unit, b.unit_asal, b.klien_id, kini, String(oleh).slice(0, 64), dummy ? 1 : 0);
/* baris berkas ini yang tidak ada lagi dalam bahan (objek dibatalkan atau tingkatnya berubah) dinolkan, bukan dibiarkan basi; baris tidak dihapus */
export const ljStmtBarisNolkan = (env, p, jpId, awalan, tetap) => sedia(env, p, "sk_jitupasna_baris", "ubah",
  `UPDATE sk_jitupasna_baris SET unit = 0 WHERE jitupasna_id = ?1 AND klien_id GLOB ?2 AND unit <> 0 AND klien_id NOT IN (SELECT value FROM json_each(?3))
   AND (SELECT status FROM sk_jitupasna WHERE id = ?1) IN ('dibuka', 'pengumpulan')`).bind(jpId, awalan + "*", JSON.stringify(tetap));

/* ---------- Tautan bertoken pihak luar (FITUR §6; src/token.js, migrasi 0164) ----------
   tk_terbit = rute staf yang menerbitkan atau mencabut; tk_periksa = rute publik yang menerima token. Pemeriksaan dan pencatatan pakai
   dalam SATU UPDATE ... RETURNING: token dicabut atau kedaluwarsa tidak pernah lolos, dan dipakai_n/terakhir tidak bisa terlewat. */
Object.assign(MATRIKS, {tautan_token: {tk_terbit: ["tambah", "ubah"], tk_periksa: ["ubah"]}});
export const pelakuTkTerbit = {peran: "tk_terbit"}, pelakuTkPeriksa = {peran: "tk_periksa"};
export const tkSimpan = (env, p, b) => sedia(env, p, "tautan_token", "tambah",
  "INSERT INTO tautan_token (id, jenis, token_sha, sasaran, cakupan, dibuat, kedaluwarsa, oleh) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)")
  .bind(b.id, b.jenis, b.token_sha, b.sasaran, b.cakupan, b.dibuat, b.kedaluwarsa, b.oleh).run();
export const tkPakai = (env, p, jenis, tokenSha, kini) => sedia(env, p, "tautan_token", "ubah",
  "UPDATE tautan_token SET dipakai_n = dipakai_n + 1, terakhir = ?3 WHERE token_sha = ?2 AND jenis = ?1 AND dicabut IS NULL AND kedaluwarsa > ?3 RETURNING id, sasaran, cakupan, kedaluwarsa")
  .bind(jenis, tokenSha, kini).first();
export const tkCabut = async (env, p, jenis, id, kini) => (await sedia(env, p, "tautan_token", "ubah",
  "UPDATE tautan_token SET dicabut = ?3 WHERE id = ?2 AND jenis = ?1 AND dicabut IS NULL").bind(jenis, id, kini).run()).meta.changes;   // jenis: modul A tidak mencabut token modul B

/* ---------- Akun BPBD dengan profil PIC (paket data/kajian-bnpb/profil-bpbd/, migrasi 0166, src/profil*.js) ----------
   Semua SQL profil tinggal di sini (fungsi pf*). pin_garam dan pin_sha tidak pernah dikembalikan ke rute selain pfPinData (untuk memeriksa PIN). */
const PF_KOLOM = "id, akun_id, nama, jabatan, nip, email, wa, foto, (pin_sha IS NOT NULL) pin_ada, pin_wajib_ganti, status, salah_hari, hari_tgl, kunci_admin, disetujui, dibuat, diubah, terakhir_masuk";
export const pfProfilAkun = async (env, akunId) => (await env.DB.prepare(`SELECT ${PF_KOLOM} FROM instansi_profil WHERE akun_id = ?1 ORDER BY dibuat, id LIMIT 12`).bind(akunId).all()).results;
export const pfProfil = (env, akunId, id) => env.DB.prepare(`SELECT ${PF_KOLOM} FROM instansi_profil WHERE id = ?1 AND akun_id = ?2`).bind(id, akunId).first();
export const pfProfilById = (env, id) => env.DB.prepare(`SELECT ${PF_KOLOM} FROM instansi_profil WHERE id = ?1`).bind(id).first();
export const pfPinData = (env, akunId, id) => env.DB.prepare("SELECT id, akun_id, pin_garam, pin_sha, pin_wajib_ganti, status, kunci_admin, wa FROM instansi_profil WHERE id = ?1 AND akun_id = ?2").bind(id, akunId).first();
export const pfBuat = (env, akunId, id, v, kini) => env.DB.prepare(
  "INSERT INTO instansi_profil (id, akun_id, nama, jabatan, nip, email, wa, dibuat, diubah) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?8)").bind(id, akunId, v.nama, v.jabatan, v.nip, v.email, v.wa, kini).run();
export const pfUbah = async (env, akunId, id, v, kini) => (await env.DB.prepare(
  "UPDATE instansi_profil SET nama = ?3, jabatan = ?4, nip = ?5, email = ?6, wa = ?7, diubah = ?8 WHERE id = ?1 AND akun_id = ?2 AND status IN ('draf', 'aktif')").bind(id, akunId, v.nama, v.jabatan, v.nip, v.email, v.wa, kini).run()).meta.changes;
export const pfSetFoto = async (env, akunId, id, kini) => (await env.DB.prepare(
  "UPDATE instansi_profil SET foto = 1, diubah = ?3 WHERE id = ?1 AND akun_id = ?2 AND status IN ('draf', 'aktif')").bind(id, akunId, kini).run()).meta.changes;
/* PIN pertama: hanya profil draf yang belum ber-PIN (tidak pernah menimpa PIN yang ada) */
export const pfSetPin = async (env, akunId, id, garam, sha, kini) => (await env.DB.prepare(
  "UPDATE instansi_profil SET pin_garam = ?3, pin_sha = ?4, pin_pada = ?5, diubah = ?5 WHERE id = ?1 AND akun_id = ?2 AND status = 'draf' AND pin_sha IS NULL").bind(id, akunId, garam, sha, kini).run()).meta.changes;
/* ganti PIN: bandingkan-dan-tukar pada hash lama; membuka kewajiban ganti PIN dan mencabut sesi profil lain (yang dipakai sekarang tetap hidup) */
export const pfGantiPin = async (env, akunId, id, shaLama, garam, sha, tokenSekarang, kini) => (await env.DB.batch([
  env.DB.prepare("UPDATE instansi_profil SET pin_garam = ?4, pin_sha = ?5, pin_wajib_ganti = 0, pin_pada = ?6, diubah = ?6 WHERE id = ?1 AND akun_id = ?2 AND status = 'aktif' AND pin_sha = ?3").bind(id, akunId, shaLama, garam, sha, kini),
  env.DB.prepare("DELETE FROM instansi_sesi_profil WHERE profil_id = ?1 AND sesi_sha != ?2 AND changes() > 0").bind(id, tokenSekarang)]))[0].meta.changes;
/* Reservasi percobaan PIN (A5): dua batas dalam satu batch atomik. Baris laju ditulis hanya bila kurang dari `maks` salah dalam jendela; hitungan harian
   naik hanya bila baris laju tertulis dan profil aktif milik akun ini serta tidak terkunci admin. Kembalian {ok, laju, salah_hari, kunci_admin} (ok = bisa membandingkan). */
export async function pfReservasiPin(env, akunId, id, kunciLaju, aksi, maks, jendela, hari, hariMaks, kini) {
  const [a, b] = await env.DB.batch([
    env.DB.prepare("INSERT INTO laju_bnpb (kunci, aksi, waktu) SELECT ?1, ?2, ?3 WHERE (SELECT count(*) FROM laju_bnpb WHERE kunci = ?1 AND aksi = ?2 AND waktu > ?3 - ?4) < ?5 RETURNING rowid").bind(kunciLaju, aksi, kini, jendela, maks),
    env.DB.prepare(`UPDATE instansi_profil SET salah_hari = CASE WHEN hari_tgl = ?3 THEN salah_hari + 1 ELSE 1 END, hari_tgl = ?3,
      kunci_admin = CASE WHEN (CASE WHEN hari_tgl = ?3 THEN salah_hari + 1 ELSE 1 END) >= ?4 THEN 1 ELSE 0 END
      WHERE id = ?1 AND akun_id = ?2 AND status = 'aktif' AND kunci_admin = 0 AND changes() > 0 RETURNING salah_hari, kunci_admin`).bind(id, akunId, hari, hariMaks)]);
  const laju = a.results?.[0]?.rowid ?? null, r = b.results?.[0];
  if (laju && r) return {ok: true, laju, salah_hari: r.salah_hari, kunci_admin: r.kunci_admin};
  if (laju) await pfLajuBuang(env, laju);   // reservasi tertulis tetapi profil bukan miliknya, bukan aktif, atau terkunci admin
  return {ok: false, sebab: laju ? "profil" : "laju"};
}
/* reservasi tertulis tetapi profil bukan miliknya / bukan aktif / terkunci: baris laju dibuang agar IP yang salah alamat tidak menghukum dirinya sendiri */
export const pfLajuBuang = (env, rowid) => env.DB.prepare("DELETE FROM laju_bnpb WHERE rowid = ?1").bind(rowid).run();
/* PIN benar: kembalikan reservasi (baris laju dibuang, hitungan harian turun satu) lalu catat masuk */
export const pfPinBenar = (env, id, rowid, hariMaks, kini) => env.DB.batch([
  env.DB.prepare("DELETE FROM laju_bnpb WHERE rowid = ?1").bind(rowid),
  env.DB.prepare("UPDATE instansi_profil SET kunci_admin = CASE WHEN salah_hari - 1 >= ?2 THEN 1 ELSE 0 END, salah_hari = max(salah_hari - 1, 0), pin_pada = ?3, terakhir_masuk = ?3 WHERE id = ?1").bind(id, hariMaks, kini)]);
/* kapan PIN dari IP ini boleh dicoba lagi: baris laju tertua dalam jendela + jendela */
export const pfBukaLaju = async (env, kunciLaju, aksi, jendela, kini) => {
  const r = await env.DB.prepare("SELECT count(*) n, min(waktu) w FROM laju_bnpb WHERE kunci = ?1 AND aksi = ?2 AND waktu > ?3 - ?4").bind(kunciLaju, aksi, kini, jendela).first();
  return {n: r?.n ?? 0, buka: r?.w ? r.w + jendela : null};
};
export const pfLajuHapusProfil = (env, id) => env.DB.prepare("DELETE FROM laju_bnpb WHERE kunci >= ?1 AND kunci < ?2 AND aksi = 'profil.pin_salah'").bind(`pf:${id}:`, `pf:${id};`);
/* sesi profil */
export const pfSesiBaru = async (env, tokenSha, profilId, akunId, kini, habis) => (await env.DB.batch([
  env.DB.prepare("INSERT INTO instansi_sesi_profil (sesi_sha, profil_id, akun_id, dibuat, kedaluwarsa) SELECT ?1, p.id, p.akun_id, ?4, ?5 FROM instansi_profil p JOIN instansi_akun a ON a.id = p.akun_id WHERE p.id = ?2 AND p.akun_id = ?3 AND p.status = 'aktif' AND a.status = 'aktif'").bind(tokenSha, profilId, akunId, kini, habis),
  env.DB.prepare("DELETE FROM instansi_sesi_profil WHERE profil_id = ?1 AND kedaluwarsa <= ?2").bind(profilId, kini)]))[0].meta.changes === 1;
export const pfSesiDari = (env, tokenSha, kini) => env.DB.prepare(
  `SELECT p.id profil_id, p.nama profil_nama, p.jabatan profil_jabatan, p.pin_wajib_ganti, a.id akun_id, a.jenis, a.tingkat, a.wilayah, COALESCE(a.prov, CASE WHEN a.tingkat = 'prov' THEN json_extract(a.cakupan, '$[0]') END) prov, a.kab, a.cakupan, a.username
   FROM instansi_sesi_profil s JOIN instansi_profil p ON p.id = s.profil_id AND p.status = 'aktif' JOIN instansi_akun a ON a.id = s.akun_id AND a.status = 'aktif'
   WHERE s.sesi_sha = ?1 AND s.kedaluwarsa > ?2`).bind(tokenSha, kini).first();
export const pfSesiCabut = (env, tokenSha) => env.DB.prepare("DELETE FROM instansi_sesi_profil WHERE sesi_sha = ?1").bind(tokenSha).run();
export const pfStmtSesiCabutAkun = (env, akunId) => env.DB.prepare("DELETE FROM instansi_sesi_profil WHERE akun_id = ?1").bind(akunId);
export const pfStmtSesiCabutProfil = (env, profilId) => env.DB.prepare("DELETE FROM instansi_sesi_profil WHERE profil_id = ?1").bind(profilId);
/* log: hanya jenis, rute, id objek; tanpa badan, PIN, atau token */
export const pfStmtLog = (env, l, kini, syarat = "1") => env.DB.prepare("INSERT INTO instansi_profil_log (waktu, akun_id, profil_id, jenis, rute, objek, oleh, ip) SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8 WHERE " + syarat)
  .bind(kini, l.akun, l.profil ?? null, l.jenis, l.rute ? String(l.rute).slice(0, 100) : null, l.objek ? String(l.objek).slice(0, 40) : null, l.oleh ? String(l.oleh).slice(0, 40) : null, l.ip ? String(l.ip).slice(0, 12) : null);
export const pfLog = (env, l, kini) => pfStmtLog(env, l, kini).run();
/* daftar log berhalaman 50 dengan penunjuk waktu (keyset): selalu dibatasi waktu supaya memakai indeks */
export async function pfLogDaftar(env, f, sebelum) {
  const w = ["waktu <= ?1"], p = [sebelum];
  for (const [k, v] of [["akun_id", f.akun], ["profil_id", f.profil], ["jenis", f.jenis]]) if (v) { p.push(v); w.push(`${k} = ?${p.length}`); }
  return (await env.DB.prepare(`SELECT id, waktu, akun_id, profil_id, jenis, rute, objek, oleh FROM instansi_profil_log WHERE ${w.join(" AND ")} ORDER BY waktu DESC, id DESC LIMIT 51`).bind(...p).all()).results;
}
/* kirim untuk disetujui (ALGORITMA 6): satu batch, semua atau tidak sama sekali; `pic` = PIC pertama yang lengkap. Kembalian = jumlah akun yang naik status (1 atau 0) */
export const pfKirim = async (env, akunId, pic, ip, kini) => (await env.DB.batch([
  env.DB.prepare("UPDATE instansi_akun SET nama = ?2, nip = ?3, jabatan = ?4, unit = wilayah, email = ?5, wa = ?6, status = 'menunggu', dikirim = ?7, alasan = NULL WHERE id = ?1 AND status IN ('belum_klaim', 'ditolak') AND surat = 1 AND kartu = 1 AND jenis IN ('pemprov', 'pemkab', 'pemkot')")
    .bind(akunId, pic.nama, pic.nip, pic.jabatan, pic.email, pic.wa, kini),
  env.DB.prepare("UPDATE instansi_profil SET status = 'menunggu', diubah = ?2 WHERE akun_id = ?1 AND status = 'draf' AND pin_sha IS NOT NULL AND foto = 1 AND changes() > 0").bind(akunId, kini),
  pfStmtLog(env, {akun: akunId, jenis: "kirim", ip}, kini, "changes() > 0")]))[0].meta.changes;
/* sambungan ke ubahAkun: dipasang dalam batch yang sama dengan pembaruan akun */
export const pfStmtSetujuAkun = (env, akunId, admin, kini) => env.DB.prepare(
  "UPDATE instansi_profil SET status = 'aktif', disetujui = ?3, oleh = ?2, diubah = ?3 WHERE akun_id = ?1 AND status = 'menunggu' AND (SELECT status FROM instansi_akun WHERE id = ?1) = 'aktif'").bind(akunId, String(admin).slice(0, 40), kini);
export const pfStmtTolakAkun = (env, akunId, kini) => env.DB.prepare(
  "UPDATE instansi_profil SET status = 'draf', diubah = ?2 WHERE akun_id = ?1 AND status = 'menunggu' AND (SELECT status FROM instansi_akun WHERE id = ?1) = 'ditolak'").bind(akunId, kini);
export const pfStmtCabutAkun = (env, akunId) => pfStmtSesiCabutAkun(env, akunId);
/* aksi admin per profil */
export const pfSetujuProfil = async (env, id, akunId, admin, maks, kini) => (await env.DB.batch([
  env.DB.prepare("UPDATE instansi_profil SET status = 'aktif', disetujui = ?3, oleh = ?4, diubah = ?3 WHERE id = ?1 AND akun_id = ?2 AND status = 'menunggu' AND (SELECT status FROM instansi_akun WHERE id = ?2) = 'aktif' AND (SELECT count(*) FROM instansi_profil x WHERE x.akun_id = ?2 AND x.status = 'aktif') < ?5")
    .bind(id, akunId, kini, String(admin).slice(0, 40), maks),
  pfStmtLog(env, {akun: akunId, profil: id, jenis: "setuju", oleh: admin}, kini, "changes() > 0")]))[0].meta.changes;
export const pfCabutProfil = async (env, id, akunId, admin, kini) => (await env.DB.batch([
  env.DB.prepare("UPDATE instansi_profil SET status = 'dicabut', diubah = ?3, oleh = ?4 WHERE id = ?1 AND akun_id = ?2 AND status != 'dicabut'").bind(id, akunId, kini, String(admin).slice(0, 40)),
  pfStmtSesiCabutProfil(env, id),
  pfStmtLog(env, {akun: akunId, profil: id, jenis: "cabut", oleh: admin}, kini, "1")]))[0].meta.changes;
export const pfResetPin = async (env, id, akunId, garam, sha, admin, kini) => (await env.DB.batch([
  env.DB.prepare("UPDATE instansi_profil SET pin_garam = ?3, pin_sha = ?4, pin_wajib_ganti = 1, salah_hari = 0, kunci_admin = 0, diubah = ?5 WHERE id = ?1 AND akun_id = ?2 AND status = 'aktif'").bind(id, akunId, garam, sha, kini),
  pfLajuHapusProfil(env, id), pfStmtSesiCabutProfil(env, id),
  pfStmtLog(env, {akun: akunId, profil: id, jenis: "reset_pin", oleh: admin}, kini, "1")]))[0].meta.changes;
export const pfBukaKunci = async (env, id, akunId, admin, kini) => (await env.DB.batch([
  env.DB.prepare("UPDATE instansi_profil SET kunci_admin = 0, salah_hari = 0, diubah = ?3 WHERE id = ?1 AND akun_id = ?2 AND status = 'aktif'").bind(id, akunId, kini),
  pfLajuHapusProfil(env, id),
  pfStmtLog(env, {akun: akunId, profil: id, jenis: "buka_kunci", oleh: admin}, kini, "1")]))[0].meta.changes;
/* pembersihan jam-an: sesi kedaluwarsa, log lebih dari 730 hari, profil dicabut lebih dari 30 hari yang fotonya masih ada */
export async function pfBersih(env, kini) {
  const [s, l] = await env.DB.batch([env.DB.prepare("DELETE FROM instansi_sesi_profil WHERE kedaluwarsa <= ?1").bind(kini),
    env.DB.prepare("DELETE FROM instansi_profil_log WHERE waktu < ?1").bind(kini - 730 * 864e5)]);
  const foto = (await env.DB.prepare("SELECT id, akun_id FROM instansi_profil WHERE status = 'dicabut' AND diubah < ?1 AND foto = 1 LIMIT 100").bind(kini - 30 * 864e5).all()).results;
  return {sesi: s.meta.changes, log: l.meta.changes, foto};
}
export const pfFotoDibuang = (env, id) => env.DB.prepare("UPDATE instansi_profil SET foto = 0 WHERE id = ?1 AND status = 'dicabut'").bind(id).run();
/* profil tambahan (keempat, atau pengganti) sesudah akun aktif: draf lengkap diajukan, menunggu setuju admin */
export const pfAjukan = async (env, akunId, id, kini) => (await env.DB.batch([
  env.DB.prepare("UPDATE instansi_profil SET status = 'menunggu', diubah = ?3 WHERE id = ?1 AND akun_id = ?2 AND status = 'draf' AND pin_sha IS NOT NULL AND foto = 1 AND (SELECT status FROM instansi_akun WHERE id = ?2) = 'aktif'").bind(id, akunId, kini)]))[0].meta.changes;

/* ---------- PF-07: papan aktivasi per profil (profil-bpbd K11, ALGORITMA 12) ---------- */
/* satu baris per akun pemda: jumlah profil bukan dicabut, aktif, menunggu, dan masuk terakhir; wilayah provinsi dari cakupan, kab dari kolom kab */
export const pfPapanAkun = async env => (await env.DB.prepare(
  `SELECT a.id, a.jenis, a.tingkat, a.prov, a.kab, json_extract(a.cakupan, '$[0]') pv, a.status,
     (SELECT count(*) FROM instansi_profil p WHERE p.akun_id = a.id AND p.status != 'dicabut') pic,
     (SELECT count(*) FROM instansi_profil p WHERE p.akun_id = a.id AND p.status = 'aktif') pic_aktif,
     (SELECT count(*) FROM instansi_profil p WHERE p.akun_id = a.id AND p.status = 'menunggu') pic_menunggu,
     (SELECT max(p.terakhir_masuk) FROM instansi_profil p WHERE p.akun_id = a.id) terakhir
   FROM instansi_akun a WHERE a.jenis IN ('pemprov', 'pemkab', 'pemkot') AND a.dummy = 0`).all()).results;
/* akun pemda satu wilayah: kab/kota lewat (tingkat, prov, kab); provinsi lewat kunci_wilayah = kode provinsi (susunDefs) */
export const pfAkunWilayah = (env, prov, kab) => kab
  ? env.DB.prepare("SELECT id, jenis, tingkat, wilayah, username, status, cakupan, prov, kab FROM instansi_akun WHERE tingkat = 'kab' AND prov = ?1 AND kab = ?2 AND jenis IN ('pemkab', 'pemkot') AND dummy = 0").bind(prov, kab).first()
  : env.DB.prepare("SELECT id, jenis, tingkat, wilayah, username, status, cakupan, prov, kab FROM instansi_akun WHERE jenis = 'pemprov' AND kunci_wilayah = ?1 AND dummy = 0").bind(prov).first();
export const pfAkunPemdaById = (env, id) => env.DB.prepare("SELECT id, jenis, tingkat, wilayah, username, status, cakupan, prov, kab FROM instansi_akun WHERE id = ?1 AND jenis IN ('pemprov', 'pemkab', 'pemkot') AND dummy = 0").bind(id).first();
export const pfProfilRinci = async (env, akunId) => (await env.DB.prepare(
  "SELECT id, nama, jabatan, status, terakhir_masuk, kunci_admin FROM instansi_profil WHERE akun_id = ?1 ORDER BY dibuat, id LIMIT 12").bind(akunId).all()).results;
/* kontak pemangku kategori bpbd yang aktif dan berwa di satu wilayah (kab null = tingkat provinsi) */
export const pfKontakBpbd = async (env, prov, kab) => (await env.DB.prepare(
  "SELECT id, nama, jabatan, wa FROM kontak_pemangku WHERE status = 'aktif' AND kategori = 'bpbd' AND prov = ?1 AND (kab = ?2 OR (?2 IS NULL AND kab IS NULL)) AND wa IS NOT NULL ORDER BY nama LIMIT 20").bind(prov, kab ?? null).all()).results;
/* satu-satunya penulis wa_antre jenis undang_pf (GP-15); pesan tidak pernah memuat sandi */
export const pfUndangAntre = (env, {id, tujuan, pesan, rujukan, kini}) => stmtAntreWa(env, {id, tujuan, pesan, jenis: "undang_pf", rujukan, kini}).run();

/* ---------- PF-08: pengambil laporan dan waktu respons (profil-bpbd K12, migrasi 0167) ---------- */
export const lpAmbilNomor = (env, nomor) => env.DB.prepare("SELECT nomor, profil_id, akun_id, nama, jabatan, label, waktu FROM lapor_ambil WHERE nomor = ?1").bind(nomor).first();
export const lpAmbilDaftar = async (env, nomors) => nomors.length ? (await env.DB.prepare("SELECT nomor, label FROM lapor_ambil WHERE nomor IN (SELECT value FROM json_each(?1))").bind(JSON.stringify(nomors)).all()).results : [];
/* satu batch: ambil (atau ambil ulang bila pengambil lama dicabut) lalu satu baris riwayat dengan dari = ke; riwayat hanya bila ambil terjadi (changes() > 0). Kembalian = baris yang berubah (0 = sudah diambil profil aktif lain) */
export const lpAmbilTulis = async (env, a, kini) => (await env.DB.batch([
  env.DB.prepare(`INSERT INTO lapor_ambil (nomor, profil_id, akun_id, nama, jabatan, label, waktu) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
    ON CONFLICT (nomor) DO UPDATE SET profil_id = excluded.profil_id, akun_id = excluded.akun_id, nama = excluded.nama, jabatan = excluded.jabatan, label = excluded.label, waktu = excluded.waktu
    WHERE (SELECT status FROM instansi_profil WHERE id = lapor_ambil.profil_id) = 'dicabut'`).bind(a.nomor, a.profil, a.akun, a.nama, a.jabatan, a.label, kini),
  env.DB.prepare("INSERT INTO lapor_tiket_riwayat (nomor, dari, ke, catatan, pelaku, waktu) SELECT ?1, ?2, ?2, ?3, ?4, ?5 WHERE changes() > 0").bind(a.nomor, a.status, a.catatan, String(a.pelaku).slice(0, 200), kini)]))[0].meta.changes;
/* bahan hitung respons 30 hari: laporan terkirim (bukan tidak_valid) dengan waktu ambil, lalu waktu dilihat pertama per nomor dari log meja profil */
export const lpResponsLaporan = async (env, sejak, sampai = Number.MAX_SAFE_INTEGER) => (await env.DB.prepare(
  `SELECT s.nomor, s.terkirim, s.ringkas, a.waktu ambil FROM lapor_sesi s JOIN lapor_tiket t ON t.nomor = s.nomor LEFT JOIN lapor_ambil a ON a.nomor = s.nomor
   WHERE s.terkirim > ?1 AND s.terkirim <= ?2 AND t.status != 'tidak_valid' ORDER BY s.terkirim LIMIT 5001`).bind(sejak, sampai).all()).results;
export const lpResponsDilihat = async (env, sejak, sampai = Number.MAX_SAFE_INTEGER) => (await env.DB.prepare(
  "SELECT objek nomor, min(waktu) waktu FROM instansi_profil_log WHERE jenis = 'meja' AND waktu > ?1 AND waktu <= ?2 AND rute LIKE '%/lihat' AND objek IS NOT NULL GROUP BY objek").bind(sejak, sampai + 30 * 86400000).all()).results;   // batas atas: bulan lama tidak memindai seluruh log; +30 hari supaya laporan akhir bulan yang dilihat bulan berikutnya tetap terhitung
export const pfAkunBpbdAktif = async env => (await env.DB.prepare("SELECT id, jenis, tingkat, wilayah, prov, kab FROM instansi_akun WHERE jenis IN ('pemkab', 'pemkot') AND status = 'aktif' AND dummy = 0").all()).results;

/* ---------- PF-09: PIC untuk Pusdalops (profil-bpbd K13, ALGORITMA 14) ---------- */
/* akun BPBD aktif satu provinsi: kab/kota lewat (tingkat, prov), provinsi lewat kunci_wilayah */
export const pfPicAkunProv = async (env, prov) => (await env.DB.batch([
  env.DB.prepare("SELECT id, jenis, tingkat, wilayah, prov, kab FROM instansi_akun WHERE tingkat = 'kab' AND prov = ?1 AND jenis IN ('pemkab', 'pemkot') AND status = 'aktif' AND dummy = 0").bind(prov),
  env.DB.prepare("SELECT id, jenis, tingkat, wilayah, prov, kab FROM instansi_akun WHERE jenis = 'pemprov' AND kunci_wilayah = ?1 AND status = 'aktif' AND dummy = 0").bind(prov)])).flatMap(x => x.results);
export const pfPicDaftar = async (env, akunIds) => akunIds.length ? (await env.DB.prepare(
  `SELECT p.id, p.akun_id, p.nama, p.jabatan, p.wa, p.terakhir_masuk, (SELECT max(l.waktu) FROM instansi_profil_log l WHERE l.profil_id = p.id AND l.jenis = 'meja') terakhir_meja
   FROM instansi_profil p WHERE p.akun_id IN (SELECT value FROM json_each(?1)) AND p.status = 'aktif'`).bind(JSON.stringify(akunIds)).all()).results : [];

/* ---------- Segel dokumen (paket data/kajian-bnpb/segel-dokumen/, SG-02, migrasi 0171) ----------
   Segel menempel pada titik beku yang ada (lk_snapshot.hash, lkb_snapshot.hash, pb_dokumen.sha, lj_beku.sidik); tidak membekukan sendiri.
   Append-only (D14): tidak ada UPDATE atau DELETE untuk segel dan segel_cabut; mencabut = satu baris baru. Hak dicek di rute
   (publik untuk segelCari; moderator atau staf pimpinan untuk cabut, Q5), di sini hanya SQL. stmtSegel belum dijalankan: dirangkai ke batch pembeku. */
let ADA_SEGEL = false;
/* tabel segel sudah ada? Hanya hasil "ada" yang dicache per isolate; yang belum dicek ulang tiap panggilan (migrasi bisa diterapkan sesudah isolate hidup).
   Pembeku WAJIB memanggil ini sebelum menaruh stmtSegel di batch: statement ke tabel yang belum ada menggagalkan seluruh batch (D3).
   Probe lewat PK (SEARCH, satu baca), bukan sqlite_master (SCAN, gerbang d1-pindai); galat "no such table" = belum ada. */
export const adaTabelSegel = async env => {
  if (ADA_SEGEL) return true;
  try { await env.DB.prepare(SEGEL_SQL.ada).first(); return ADA_SEGEL = true; } catch (e) { if (/no such table/i.test(String(e?.message))) return false; throw e; }
};
export const SEGEL_SQL = {
  ada: "SELECT 1 FROM segel WHERE kode = ''",
  sisip: `INSERT INTO segel (kode, jenis, rujukan, dasar, versi, sidik, sidik_berkas, judul, wilayah, periode, penerbit, terbit)
    VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)`,
  /* satu baca: segel + cabut + kode versi lebih tinggi dengan dasar sama (indeks segel_dasar). Kolom alasan dan oleh tidak ikut (publik) */
  cari: `SELECT s.kode, s.jenis, s.rujukan, s.dasar, s.versi, s.sidik, s.sidik_berkas, s.judul, s.wilayah, s.periode, s.penerbit, s.terbit, c.waktu dicabut,
    (SELECT t.kode FROM segel t WHERE t.jenis = s.jenis AND t.dasar = s.dasar AND t.versi > s.versi ORDER BY t.versi DESC LIMIT 1) terbaru
    FROM segel s LEFT JOIN segel_cabut c ON c.kode = s.kode WHERE s.kode = ?1`,
  /* staf: 100 terbaru sejak ?2 (indeks segel_terbit, 0172); status '' semua, 'berlaku' belum dicabut, 'dicabut' sudah. Alasan dan oleh hanya untuk staf */
  daftar: `SELECT s.kode, s.jenis, s.rujukan, s.dasar, s.versi, s.sidik, s.judul, s.wilayah, s.periode, s.penerbit, s.terbit, c.waktu dicabut, c.alasan, c.oleh
    FROM segel s LEFT JOIN segel_cabut c ON c.kode = s.kode
    WHERE s.terbit > ?2 AND (?1 = '' OR (?1 = 'dicabut' AND c.kode IS NOT NULL) OR (?1 = 'berlaku' AND c.kode IS NULL)) ORDER BY s.terbit DESC LIMIT 100`,
  /* hanya segel yang ada; PK segel_cabut menolak cabut kedua (rute menjawab 409) */
  cabut: "INSERT INTO segel_cabut (kode, alasan, oleh, waktu) SELECT kode, ?2, ?3, ?4 FROM segel WHERE kode = ?1",
  /* staf: kode segel satu dokumen beku untuk QR di slide (KEPUTUSAN K5); lewat UNIQUE (jenis, rujukan) */
  untuk: "SELECT kode, substr(sidik, 1, 12) sidik12 FROM segel WHERE jenis = ?1 AND rujukan = ?2",
};
export const stmtSegel = (env, s) => env.DB.prepare(SEGEL_SQL.sisip).bind(s.kode, s.jenis, s.rujukan, s.dasar, s.versi, s.sidik, s.sidik_berkas ?? null,
  s.judul, s.wilayah ?? null, s.periode, s.penerbit, s.terbit);
export const segelUntuk = (env, jenis, rujukan) => env.DB.prepare(SEGEL_SQL.untuk).bind(jenis, rujukan).first();
export const segelCari = (env, kode) => env.DB.prepare(SEGEL_SQL.cari).bind(kode).first();
export const segelDaftar = async (env, status = "", sejak = 0) => (await env.DB.prepare(SEGEL_SQL.daftar).bind(status, sejak).all()).results;
/* kembalian = baris tertulis: 1 tercabut, 0 kode tidak ada; cabut kedua melempar galat UNIQUE/PK */
export const segelCabut = async (env, kode, alasan, oleh, kini) => (await env.DB.prepare(SEGEL_SQL.cabut).bind(kode, alasan, String(oleh).slice(0, 80), kini).run()).meta.changes;
/* SG-04: teks sumber yang dibekukan untuk hitung ulang sidik saat kode dibuka (lewat PK, satu baca). Baris dummy tidak pernah disegel, jadi tidak dibaca. */
export const segelIsiLk = (env, tanggal, ralat) => env.DB.prepare("SELECT isi FROM lk_snapshot WHERE tanggal_laporan = ?1 AND ralat = ?2 AND dummy = 0").bind(tanggal, ralat).first();
export const segelIsiLkb = (env, bencana, tanggal, ralat) => env.DB.prepare("SELECT isi FROM lkb_snapshot WHERE bencana = ?1 AND tanggal_laporan = ?2 AND ralat = ?3 AND dummy = 0").bind(bencana, tanggal, ralat).first();
/* SG-13: segel lj_beku (fase 2, Q1). Versi beku lj dihitung di SQL (max + 1), jadi segel mengambil versi dan sidik dari baris lj_beku yang baru tertulis
   di batch yang sama (berkas + waktu = kini + sidik, lewat PK berkas). Usul tutup yang kalah (changes 0) tidak menulis lj_beku, jadi segel pun tidak tertulis.
   rujukan = <berkas>#<versi>, dasar = berkas. s.rujukan = id berkas. */
export const stmtSegelLj = (env, s) => env.DB.prepare(`INSERT INTO segel (kode, jenis, rujukan, dasar, versi, sidik, sidik_berkas, judul, wilayah, periode, penerbit, terbit)
    SELECT ?1, 'lj', berkas || '#' || versi, berkas, versi, sidik, NULL, ?3, ?4, ?5, ?6, ?7 FROM lj_beku WHERE berkas = ?2 AND waktu = ?7 AND sidik = ?8 ORDER BY versi DESC LIMIT 1`)
  .bind(s.kode, s.rujukan, s.judul, s.wilayah ?? null, s.periode, s.penerbit, s.terbit, s.sidik);
export const segelIsiLj = (env, berkas, versi) => env.DB.prepare("SELECT isi FROM lj_beku WHERE berkas = ?1 AND versi = ?2").bind(berkas, versi).first();

/* ---------- Laporan Berkala (LB-07, migrasi 0178; rute src/laporan_berkala.js, segel jenis 'berkala' migrasi 0179) ----------
   Hak dicek di rute (K4: admin menulis; admin, staf, dan pemirsa bertab pusdalops membaca), di sini hanya SQL. Versi 0 = draf, 1.. = beku (trigger 0178).
   Semua kueri lewat PK (periode, kode, versi): SEARCH, satu tabel kecil (sekitar 400 baris per tahun). */
export const LBR_SQL = {
  daftar: "SELECT kode, versi, diubah, oleh FROM laporan_berkala WHERE periode = ?1 ORDER BY kode DESC, versi DESC LIMIT 400",
  /* tanpa versi (?3 NULL): draf bila ada, bila tidak versi beku terakhir; beku = versi tertinggi (0 bila hanya draf) */
  baris: `SELECT versi, isian, diubah, angka_kunci, angka_sha256, oleh, (SELECT max(versi) FROM laporan_berkala WHERE periode = ?1 AND kode = ?2) beku
    FROM laporan_berkala WHERE periode = ?1 AND kode = ?2 AND (?3 IS NULL OR versi = ?3) ORDER BY versi = 0 DESC, versi DESC LIMIT 1`,
  /* draf satu pernyataan: baris baru selalu masuk; baris lama hanya bila diubah klien = diubah tersimpan (?8 NULL = tidak pernah, jadi 409) */
  simpan: `INSERT INTO laporan_berkala (periode, kode, versi, isian, angka_kunci, angka_sha256, diubah, oleh) VALUES (?1, ?2, 0, ?3, ?4, ?5, ?6, ?7)
    ON CONFLICT (periode, kode, versi) DO UPDATE SET isian = excluded.isian, angka_kunci = excluded.angka_kunci, angka_sha256 = excluded.angka_sha256,
    diubah = excluded.diubah, oleh = excluded.oleh WHERE laporan_berkala.diubah = ?8`,
  jejakBila: "INSERT INTO laporan_berkala_jejak (periode, kode, versi, aksi, oleh, waktu) SELECT ?1, ?2, ?3, ?4, ?5, ?6 WHERE changes() > 0",
  jejak: "INSERT INTO laporan_berkala_jejak (periode, kode, versi, aksi, oleh, waktu) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
  /* Bekukan: versi ?3 hanya bila = max + 1 dan draf masih ber-diubah ?8; isian disalin dari draf di SQL (bukan dari klien) */
  beku: `INSERT INTO laporan_berkala (periode, kode, versi, isian, angka_kunci, angka_sha256, diubah, oleh)
    SELECT periode, kode, ?3, isian, ?4, ?5, ?6, ?7 FROM laporan_berkala WHERE periode = ?1 AND kode = ?2 AND versi = 0 AND diubah = ?8
    AND ?3 = (SELECT max(versi) + 1 FROM laporan_berkala WHERE periode = ?1 AND kode = ?2)`,
  /* draf dibuang hanya bila versi beku baru benar-benar tertulis di batch ini (bukan lewat changes(): rantai penanda rapuh) */
  bekuBuangDraf: `DELETE FROM laporan_berkala WHERE periode = ?1 AND kode = ?2 AND versi = 0
    AND EXISTS (SELECT 1 FROM laporan_berkala WHERE periode = ?1 AND kode = ?2 AND versi = ?3 AND diubah = ?4 AND angka_sha256 = ?5)`,
  bekuJejak: `INSERT INTO laporan_berkala_jejak (periode, kode, versi, aksi, oleh, waktu) SELECT ?1, ?2, ?3, 'bekukan', ?6, ?4
    WHERE EXISTS (SELECT 1 FROM laporan_berkala WHERE periode = ?1 AND kode = ?2 AND versi = ?3 AND diubah = ?4 AND angka_sha256 = ?5)`,
  segel: `INSERT INTO segel (kode, jenis, rujukan, dasar, versi, sidik, sidik_berkas, judul, wilayah, periode, penerbit, terbit)
    SELECT ?1, 'berkala', periode || '/' || kode || '#' || versi, periode || '/' || kode, versi, ?2, NULL, ?3, NULL, kode, ?4, ?5
    FROM laporan_berkala WHERE periode = ?6 AND kode = ?7 AND versi = ?8 AND diubah = ?5 AND angka_sha256 = ?9`,
};
export const lbrDaftar = async (env, periode) => (await env.DB.prepare(LBR_SQL.daftar).bind(periode).all()).results;
export const lbrBaris = (env, periode, kode, versi = null) => env.DB.prepare(LBR_SQL.baris).bind(periode, kode, versi).first();
export const lbrJejak = (env, periode, kode, versi, aksi, oleh, kini) => env.DB.prepare(LBR_SQL.jejak).bind(periode, kode, versi, aksi, oleh, kini).run();
/* kembalian: true tersimpan, false kalah (diubah beda) */
export const lbrSimpan = async (env, d, kini) => (await env.DB.batch([
  env.DB.prepare(LBR_SQL.simpan).bind(d.periode, d.kode, d.isian, d.angka_kunci, d.angka_sha256, kini, d.oleh, d.dasar ?? null),
  env.DB.prepare(LBR_SQL.jejakBila).bind(d.periode, d.kode, 0, "simpan", d.oleh, kini)]))[0].meta.changes > 0;
/* pernyataan pembeku (tanpa segel; segel dirangkai src/segel.js batchBersegel) */
export const lbrStmtBeku = (env, d, kini) => [
  env.DB.prepare(LBR_SQL.beku).bind(d.periode, d.kode, d.versi, d.angka_kunci, d.angka_sha256, kini, d.oleh, d.dasar),
  env.DB.prepare(LBR_SQL.bekuBuangDraf).bind(d.periode, d.kode, d.versi, kini, d.angka_sha256),
  env.DB.prepare(LBR_SQL.bekuJejak).bind(d.periode, d.kode, d.versi, kini, d.angka_sha256, d.oleh)];
/* s.lbr = {periode, kode, versi, angka_sha256}; s.terbit = kini (sama dengan diubah baris beku) */
export const stmtSegelBerkala = (env, s) => env.DB.prepare(LBR_SQL.segel).bind(s.kode, s.sidik, s.judul, s.penerbit, s.terbit, s.lbr.periode, s.lbr.kode, s.lbr.versi, s.lbr.angka_sha256);
export const segelIsiBerkala = (env, periode, kode, versi) => env.DB.prepare("SELECT isian, angka_kunci, angka_sha256 FROM laporan_berkala WHERE periode = ?1 AND kode = ?2 AND versi = ?3 AND versi > 0").bind(periode, kode, versi).first();

/* ---------- ews: kanal resmi (KI-50, Q8) ---------- */
/* Penanda "putaran resmi pertama sudah lewat": satu baris ews_terkirim dengan langganan_id tetap (bukan id pelanggan; id asli 16 hex dari acak, tak pernah semua nol) dan kunci 'x|awal'.
   Dibaca lewat kunci utama (SEARCH, bukan LIKE). bersihkanEws mengecualikan langganan_id ini. */
export const EWS_AWAL_ID = "0000000000000000";
export const ewsAwalAda = async env => !!(await env.DB.prepare("SELECT 1 FROM ews_terkirim WHERE langganan_id = ?1 AND kunci = 'x|awal'").bind(EWS_AWAL_ID).first());
export const ewsAwalTandai = (env, kini) => env.DB.prepare("INSERT OR IGNORE INTO ews_terkirim (langganan_id, kunci, waktu) VALUES (?1, 'x|awal', ?2)").bind(EWS_AWAL_ID, kini).run();
export const ewsCatatSenyap = (env, id, kunci, kini) => env.DB.batch(kunci.map(k => env.DB.prepare("INSERT OR IGNORE INTO ews_terkirim (langganan_id, kunci, waktu) VALUES (?1, ?2, ?3)").bind(id, k, kini)));

/* ---------- alat: panel EWS banjir dan gunung api (EW-04, src/alat.js) ---------- */
/* Baca saja, jalur publik dan staf sama (pembulatan koordinat dan desa diatur alat.js). SQL_RIWAYAT satu definisi untuk sihka.js dan alat.js
   (di sini, bukan di sihka.js: hak.js mengimpor sihka.js menyeret worker.js dan memutar impor). */
/* riwayat satu pos 24 jam terakhir, JSON disusun SQL (Worker tidak mengurai). ?1 = id pos, ?2 = kini (detik), ?3 = kini (ms). Diturunkan rata ke <= 300 titik (sisa (n - rn) % k = 0
   menjaga bacaan terbaru), urut naik. Tak terdaftar = tanpa baris. */
export const SQL_RIWAYAT = `WITH s AS (SELECT t, v, row_number() OVER (ORDER BY t) rn, count(*) OVER () n FROM sihka_baca WHERE pos = ?1 AND t > ?2 - 86400 AND t <= ?2 + 600),
  k AS (SELECT t, v FROM s WHERE (n - rn) % ((n + 299) / 300) = 0 ORDER BY t)
  SELECT json_object('id', p.pos, 'nama', p.nama, 'satuan', p.satuan, 'dibuat', ?3,
    't', json((SELECT coalesce(json_group_array(t), '[]') FROM k)), 'v', json((SELECT coalesce(json_group_array(v), '[]') FROM k))) isi
  FROM sihka_pos p WHERE p.pos = ?1`;
export const ALAT_MAKS = 500, ALAT_MAKS_TITIK = 1500;
const ALAT_SQL_POS = `SELECT a.id, a.jenis, a.kab, a.desa, a.lat, a.lon, a.ambang, b.waktu, b.nilai, b.baterai FROM sensor_alat a
  LEFT JOIN sensor_baca b ON b.alat_id = a.id AND b.waktu = (SELECT max(waktu) FROM sensor_baca WHERE alat_id = a.id)
  WHERE a.aktif = 1 AND a.jenis <> 'gateway' AND a.jenis IN (SELECT value FROM json_each(?1)) ORDER BY a.id LIMIT ${ALAT_MAKS}`;
export const alatSensorPos = async (env, jenis) => (await env.DB.prepare(ALAT_SQL_POS).bind(JSON.stringify(jenis)).all()).results;
export const alatSensorSatu = (env, id) => env.DB.prepare("SELECT id, jenis, ambang FROM sensor_alat WHERE id = ? AND aktif = 1 AND jenis <> 'gateway'").bind(id).first();
/* terbaru menang bila > ALAT_MAKS_TITIK: ambil DESC lalu dibalik ke urutan waktu naik */
export const alatSensorSeri = async (env, id, dari, sampai) => (await env.DB.prepare(`SELECT waktu, nilai FROM sensor_baca WHERE alat_id = ? AND waktu > ? AND waktu <= ? ORDER BY waktu DESC LIMIT ${ALAT_MAKS_TITIK}`).bind(id, dari, sampai).all()).results.reverse();
export const alatSihkaStatus = async env => (await env.DB.prepare("SELECT isi FROM cuaca_sumber WHERE kunci = 'sihka_status'").first())?.isi;
export const alatSihkaRiwayat = async (env, pos, kini) => (await env.DB.prepare(SQL_RIWAYAT).bind(pos, Math.floor(kini / 1000), kini).first())?.isi;

/* ---------- Ruang Unit MB-7 (migrations/0187_unit.sql; kedeputian DESAIN-TEKNIS §2.2, §4.9): keputusan ketuk, hanya ditambah, terbaru per usulan_id yang berlaku ---------- */
/* RU-103: ketuk terbaru satu usulan (tanpa batas 5000 daftar) dan pemulihan yang sudah dibuat dari URL sumber yang sama (anti ulang) */
export const ketukUsulan = (env, berkas, usulanId) => env.DB.prepare("SELECT keputusan FROM unit_ketuk WHERE berkas = ? AND usulan_id = ? AND dummy = 0 ORDER BY id DESC LIMIT 1").bind(berkas, usulanId).first();
export const pemulihanDariUrl = (env, prov, kab, jenis, url) => env.DB.prepare("SELECT id FROM pemulihan WHERE prov = ? AND kab = ? AND jenis = ? AND catatan = ? LIMIT 1").bind(prov, kab, jenis, url).first();   // lewat indeks pemulihan_wilayah
export const ketukTerbaru = async (env, berkas) => (await env.DB.prepare(
  "SELECT id, usulan_id, keputusan, koreksi, catatan, oleh, waktu FROM unit_ketuk WHERE id IN (SELECT max(id) FROM unit_ketuk WHERE berkas = ? AND dummy = 0 GROUP BY usulan_id) ORDER BY waktu DESC LIMIT 5000").bind(berkas).all()).results;
export const ketukTambah = (env, b) => env.DB.prepare(
  "INSERT INTO unit_ketuk (berkas, usulan_id, keputusan, koreksi, catatan, oleh, waktu) VALUES (?, ?, ?, ?, ?, ?, ?)").bind(b.berkas, b.usulan_id, b.keputusan, b.koreksi, b.catatan, b.oleh, b.waktu).run();

/* DIK-1 (RU-068): angkatan diklat tanpa nama peserta. Satu DB.batch = semua atau tidak sama sekali; baris kembar (id sama atau indeks diklat_angkatan_unik) dilewati. 8 baris x 12 kolom <= 100 parameter D1. */
const DIKLAT_KOL = ["id", "program", "jenis", "tgl_mulai", "tgl_selesai", "prov", "kab", "n_peserta", "n_lulus", "penyelenggara", "dibuat", "oleh"];
export async function diklatTambah(env, baris, kini, oleh) {
  const st = [];
  for (let i = 0; i < baris.length; i += 8) { const g = baris.slice(i, i + 8);
    st.push(env.DB.prepare(`INSERT INTO diklat_angkatan (${DIKLAT_KOL.join(", ")}) VALUES ${g.map(() => "(" + DIKLAT_KOL.map(() => "?").join(",") + ")").join(",")} ON CONFLICT DO NOTHING`)
      .bind(...g.flatMap(r => [r.id, r.program, r.jenis, r.tgl_mulai, r.tgl_selesai, r.prov, r.kab, r.n_peserta, r.n_lulus, r.penyelenggara, kini, oleh]))); }
  const tersimpan = (await env.DB.batch(st)).reduce((n, r) => n + (r.meta?.changes ?? 0), 0);
  return {tersimpan, ulang: baris.length - tersimpan};
}
/* ponytail: prov >= '00' hanya agar rencana memakai indeks diklat_angkatan_kab (gerbang d1-pindai); tabel kecil (ratusan baris per 5 tahun), tetap dibaca utuh. */
/* bentuk sama dengan data/raw/unit/diklat_ringkas.json yang dibaca scripts/bnpb/unit/dik1.py: {"kab": {kode4: {angkatan, lulus}}}; baris tingkat provinsi (kab NULL) tidak masuk */
export const diklatRingkas = async (env, sejak) => Object.fromEntries((await env.DB.prepare(
  "SELECT kab, count(*) angkatan, sum(n_lulus) lulus FROM diklat_angkatan WHERE prov >= '00' AND dummy = 0 AND kab IS NOT NULL AND tgl_selesai >= ? GROUP BY kab ORDER BY kab").bind(sejak).all()).results.map(r => [r.kab, {angkatan: r.angkatan, lulus: r.lulus}]));

/* RRI-1 (RU-083): status titik akses putus, hanya ditambah (trigger akses_status_*); kembar (titik, tgl, status) ditolak trigger */
export const aksesTambah = (env, b) => env.DB.prepare(
  "INSERT INTO akses_status (titik_id, tgl, status, sumber, catatan, oleh, waktu) VALUES (?, ?, ?, 'isian', ?, ?, ?)").bind(b.titik_id, b.tgl, b.status, b.catatan, b.oleh, b.waktu).run();

/* ======================================================================================================================================================
   Orang hilang publik (migrasi 0188_orang_hilang; data/kajian-bnpb/orang-hilang-publik/DESAIN-TEKNIS.md bagian 3; OH-03). Semua SQL oh_* tinggal di sini.
   lp_publik hanya membaca oh_publik lewat OH_KOLOM_PUBLIK (daftar putih, tanpa SELECT *) dan hanya menambah oh_info (jenis cabut dan orang_ini tanpa sesi); tidak punya hak baca
   lapor_cari, oh_temu, oh_info. oh_riwayat hanya ditambah petugas, pelapor, dan cron; lp_cron boleh mengubah (mengosongkan catatan) lewat anonim, tidak pernah menghapus. */
Object.assign(MATRIKS, {
  oh_publik:    {lp_pelapor: ["baca", "tambah", "ubah"], lp_publik: ["baca"], lp_staf: ["baca", "ubah"], lp_cron: ["baca", "ubah"]},
  oh_temu:      {lp_pelapor: ["tambah"], lp_staf: ["baca", "ubah"], lp_cron: ["baca", "ubah"]},
  oh_temu_foto: {lp_pelapor: ["tambah"], lp_staf: ["baca"], lp_cron: ["baca", "hapus"]},
  oh_cari_foto: {lp_pelapor: ["tambah"], lp_cron: ["hapus"]},
  oh_info:      {lp_pelapor: ["tambah"], lp_publik: ["tambah"], lp_staf: ["baca", "ubah"], lp_cron: ["baca", "ubah", "hapus"]},
  oh_riwayat:   {lp_pelapor: ["tambah"], lp_staf: ["baca", "tambah"], lp_cron: ["tambah", "ubah"]},
});
export const OH_KOLOM_PUBLIK = ["token", "kelas", "nama", "panggilan", "umur", "kelamin", "tinggi", "pakaian", "ciri", "kec", "kab_nama", "waktu_terakhir", "kejadian_jenis", "kejadian_kab", "kejadian_mulai", "foto_publik", "inisial"];
/* data anak tidak keluar dari D1 (saran keamanan OH-03): nama lengkap, foto, kelamin, tinggi, ciri dibuang di SQL; publik anak hanya memakai inisial */
const OH_SAJA_DEWASA = ["nama", "kelamin", "tinggi", "ciri", "foto_publik"];
const OH_KOLOM_DAFTAR = [...OH_KOLOM_PUBLIK.map(k => OH_SAJA_DEWASA.includes(k) ? `CASE WHEN kelas = 'anak' THEN NULL ELSE ${k} END ${k}` : k), "tayang_waktu"].join(", ");
/* f: {kab (kode "32.71"), umur5 (awal rentang 5 tahun, hanya dewasa; rentang sempit tidak bisa dipakai membongkar umur tepat), sesudah {w, token}, batas, sejak (ms; tayang_waktu harus lebih baru: masa tayang lewat tidak pernah keluar walau cron belum menurunkan)}. Predikat status = 'tayang' wajib persis dan indeks dipaksa (INDEXED BY): perencana tanpa statistik memilih oh_publik_status dan mengurutkan lewat temp b-tree. */
export const ohSqlDaftar = f => {
  if (!Number.isFinite(f.sejak)) throw new Galat(500, "ohSqlDaftar wajib membawa sejak (batas masa tayang)");
  const w = ["status = 'tayang'", "tayang_waktu > ?"], a = [f.sejak];
  if (f.kab) { w.push("kab = ?"); a.push(f.kab); }
  if (f.umur5 != null) { w.push("kelas = 'dewasa' AND umur >= ? AND umur < ?"); a.push(f.umur5, f.umur5 + 5); }
  if (f.sesudah) { w.push("(tayang_waktu < ? OR (tayang_waktu = ? AND token < ?))"); a.push(f.sesudah.w, f.sesudah.w, f.sesudah.token); }
  return [`SELECT ${OH_KOLOM_DAFTAR} FROM oh_publik INDEXED BY oh_publik_tayang WHERE ${w.join(" AND ")} ORDER BY tayang_waktu DESC, token DESC LIMIT ?`, [...a, f.batas + 1]];
};
export const ohDaftarPublik = async (env, p, f) => { const [sql, a] = ohSqlDaftar(f); return (await sedia(env, p, "oh_publik", "baca", sql).bind(...a).all()).results; };
/* token tak ada, belum tayang, dan sudah turun menjawab sama (null) */
export const ohByToken = (env, p, token, sejak) => { if (!Number.isFinite(sejak)) throw new Galat(500, "ohByToken wajib membawa sejak (batas masa tayang)");
  return sedia(env, p, "oh_publik", "baca", `SELECT ${OH_KOLOM_DAFTAR} FROM oh_publik WHERE token = ?1 AND status = 'tayang' AND tayang_waktu > ?2`).bind(token, sejak).first(); };
/* baris penuh (kontak kejadian, wali, setuju): bukan untuk lp_publik, yang boleh baca tabel ini hanya lewat ohDaftarPublik dan ohByToken (kolom daftar putih) */
export const ohById = (env, p, cariId) => p?.peran === "lp_publik" ? (() => { throw new Galat(403, "lp_publik tidak membaca baris penuh oh_publik"); })() : sedia(env, p, "oh_publik", "baca", "SELECT * FROM oh_publik WHERE cari_id = ?1").bind(cariId).first();
/* baris draf sesudah persetujuan versi sah tercatat; kejadian dipilih pelapor tetapi belum dikonfirmasi petugas (kejadian_oleh kosong sampai petugas) */
export const ohTambah = (env, p, b, kini) => sedia(env, p, "oh_publik", "tambah",
  `INSERT INTO oh_publik (cari_id, token, kelas, nama, inisial, panggilan, umur, kelamin, tinggi, pakaian, kec, kab, kab_nama, waktu_terakhir, kejadian_id, kejadian_jenis, kejadian_kab, kejadian_mulai,
   setuju_versi, setuju_waktu, setuju_wali, bidang_pilihan, dibuat) VALUES (?1, ?2, ?3, ?4, ?23, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21, ?22)`)
  .bind(b.cari_id, b.token, b.kelas, b.nama ?? null, b.panggilan ?? null, b.umur ?? null, b.kelamin ?? null, b.tinggi ?? null, b.pakaian ?? null, b.kec ?? null, b.kab ?? null, b.kab_nama ?? null, b.waktu_terakhir ?? null,
    b.kejadian_id ?? null, b.kejadian_jenis ?? null, b.kejadian_kab ?? null, b.kejadian_mulai ?? null, b.setuju_versi ?? null, b.setuju_waktu ?? null, b.setuju_wali ?? null, JSON.stringify(b.bidang_pilihan ?? {}), kini, b.nama ? ohInisial(b.nama) : null).run();
/* pindah status: pembanding dari-ke dari tabel PINDAH (orang_hilang_murni.js), kalah balapan = false. UPDATE bersyarat status lama; baris riwayat ikut hanya bila UPDATE mengubah baris (satu batch).
   Syarat tayang (layak, persetujuan, bendera) dijaga rute, bukan di sini. turun ke menunggu hanya bila alasan_turun = kedaluwarsa. */
export const ohPindah = async (env, p, b, kini) => {
  izin(p, "oh_publik", "ubah"); izin(p, "oh_riwayat", "tambah");
  if (!bolehPindah(b.dari, b.ke, b.dari === "turun" ? "kedaluwarsa" : null)) throw new Galat(409, `status ${b.dari} tidak bisa pindah ke ${b.ke}`);
  const alasanTurun = b.ke === "turun" ? b.alasan_turun ?? null : null;
  if (b.ke === "turun" && !OH_ALASAN_TURUN.includes(alasanTurun)) throw new Galat(400, "alasan turun tidak dikenal");   // jangan jadi 500 dari CHECK D1
  const [u] = await lpBatch(env, p, [env.DB.prepare(`UPDATE oh_publik SET status = ?2, alasan_turun = ?3,
      tayang_waktu = CASE WHEN ?2 = 'tayang' THEN ?4 ELSE tayang_waktu END, turun_waktu = CASE WHEN ?2 = 'turun' THEN ?4 ELSE turun_waktu END,
      dicabut_waktu = CASE WHEN ?2 = 'turun' AND ?3 = 'dicabut' THEN ?4 ELSE dicabut_waktu END
      WHERE cari_id = ?1 AND status = ?5 AND (?5 <> 'turun' OR alasan_turun = 'kedaluwarsa')`).bind(b.cari_id, b.ke, alasanTurun, kini, b.dari),
    env.DB.prepare("INSERT INTO oh_riwayat (cari_id, dari, ke, alasan, catatan, oleh, waktu) SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7 WHERE changes() > 0")
      .bind(b.cari_id, b.dari, b.ke, b.alasan ?? alasanTurun ?? b.ke, b.catatan ?? null, b.oleh, kini)]);
  return u.meta.changes > 0;
};
export const ohRiwayat = async (env, p, cariId) => (await sedia(env, p, "oh_riwayat", "baca", "SELECT dari, ke, alasan, catatan, oleh, waktu FROM oh_riwayat WHERE cari_id = ?1 ORDER BY id LIMIT 200").bind(cariId).all()).results;
/* pembaca sempit penyaring bencana (K116, D25): kejadian yang menyentuh satu kab4, hanya kolom jenis, mulai, fase; tanpa nama, titik, dan sumber. Lewat indeks sk_kejkab_kab (kab4, mulai DESC). Pelaku sistem. */
export const ohKejadianKab = async (env, p, kab4) => (await sedia(env, p, "sk_kejadian_kab", "baca",
  `SELECT k.id, k.jenis, k.mulai, k.fase, c.kab4 FROM sk_kejadian_kab c JOIN sk_kejadian k ON k.id = c.kejadian_id
   WHERE c.kab4 = ?1 AND c.dummy = 0 AND k.dummy = 0 AND k.fase NOT IN ('terdeteksi', 'dibatalkan', 'digabung') ORDER BY c.mulai DESC LIMIT 100`).bind(kab4).all()).results;
