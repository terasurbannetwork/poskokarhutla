/* hak.js: pintu D1 untuk akun staf (staf.js tidak menyentuh env.DB). Pola dari platformmeti/src/hak.js, dikecilkan: MATRIKS sebagai data,
   satu fungsi bernama per pernyataan, semua nilai lewat .bind(), kolom dari daftar putih. Pelaku = {peran: "sistem"|"diri"|"admin", id?}.
   sistem = jalur sebelum login dan pembersihan; diri = staf bersesi (hanya baris miliknya); admin = Super Admin.
   Tulis oleh diri/admin selalu satu batch dengan baris pantau_jejak (tulisJejak). Pelaku tanpa hak: Galat 403, diubah bungkusStaf menjadi gagal(403). */
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
  sk_kejadian_sumber: {sistem: ["baca", "tambah"], sk_staf: ["baca", "tambah", "ubah"], sk_instansi: ["baca"], admin: ["baca", "tambah", "ubah", "hapus"]},
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
export const dlTindakTerkini = async (env, sejak) => (await env.DB.prepare("SELECT kunci, status, catatan, oleh, waktu FROM dl_tindak WHERE waktu > ? ORDER BY waktu DESC LIMIT 2000").bind(sejak).all()).results;
export const dlTindakRiwayat = async (env, kunci) => (await env.DB.prepare("SELECT waktu, status, catatan, langkah, oleh FROM dl_tindak_log WHERE kunci = ? ORDER BY id DESC LIMIT 100").bind(kunci).all()).results;
export const dlTindakLaju = async (env, oleh, sejak) => (await env.DB.prepare("SELECT count(*) n FROM dl_tindak_log WHERE oleh = ? AND waktu > ?").bind(oleh, sejak).first())?.n ?? 0;
export const dlStmtTindak = (env, kunci, status, catatan, oleh, kini) => env.DB.prepare("INSERT INTO dl_tindak (kunci, status, catatan, oleh, waktu) VALUES (?1, ?2, ?3, ?4, ?5) ON CONFLICT (kunci) DO UPDATE SET status = ?2, catatan = ?3, oleh = ?4, waktu = ?5").bind(kunci, status, catatan, oleh, kini);
export const dlStmtTindakLog = (env, kunci, status, catatan, langkah, oleh, kini) => env.DB.prepare("INSERT INTO dl_tindak_log (kunci, status, catatan, langkah, oleh, waktu) VALUES (?, ?, ?, ?, ?, ?)").bind(kunci, status, catatan, langkah, oleh, kini);
/* nama staf untuk kolom pengisi (Q3): hanya id yang diminta, lewat kunci utama */
export const dlNamaStaf = async (env, ids) => ids.length ? new Map((await env.DB.prepare("SELECT id, nama FROM staf WHERE id IN (SELECT value FROM json_each(?))").bind(JSON.stringify(ids)).all()).results.map(r => [r.id, r.nama])) : new Map();
