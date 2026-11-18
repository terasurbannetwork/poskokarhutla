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
};
export const KT_SQL = KT, KT_SUMBER = Object.keys(KT);
/* KP-06 baca tautan per pasangan (sumber, kode): satu kueri per pasangan lewat UNIQUE (sumber, kode, dummy), dibatch; dummy = 0 didahulukan. Tanpa nama/WA/isi. */
export const ktTautan = async (env, p, pairs, dummyOk) => {
  const sql = sedia(env, p, "sk_kejadian_sumber", "baca", "SELECT sumber, kode, kejadian_id, status, kab4, kandidat FROM sk_kejadian_sumber WHERE sumber = ? AND kode = ? AND dummy IN (0, ?) ORDER BY dummy LIMIT 1");
  return (await env.DB.batch(pairs.map(([s, k]) => sql.bind(s, k, dummyOk ? 1 : 0)))).map(r => r.results[0] ?? null);
};
export const ktKab = async (env, p, ids) => ids.length ? (await sedia(env, p, "sk_kejadian_kab", "baca", "SELECT kejadian_id, kab4 FROM sk_kejadian_kab WHERE kejadian_id IN (SELECT value FROM json_each(?))").bind(JSON.stringify(ids)).all()).results : [];
export const ktBaris = async (env, sumber, {lo, hi, w, id, batas}) => (await env.DB.prepare(KT[sumber][0]).bind(Math.max(lo, w), hi, w, id, batas + 1).all()).results;

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
/* kode baru dan pesan antrean dalam satu batch; kode lama nomor itu TETAP sah (D18: peminta iseng tidak mematikan kode korban) */
export const mkKodeBaru = (env, id, nsha, kodeSha, nomor, pesan, kini, habis) => env.DB.batch([
  env.DB.prepare("INSERT INTO mk_kode (id, nomor_sha, kode_sha, saluran, coba, dibuat, habis) VALUES (?, ?, ?, 'wa', 0, ?, ?)").bind(id, nsha, kodeSha, kini, habis),
  env.DB.prepare("INSERT INTO wa_antre (id, tujuan, pesan, jenis, rujukan, status, percobaan, dibuat) VALUES (?, ?, ?, 'otp', ?, 'antre', 0, ?)").bind(id, nomor, pesan, id, kini)]);
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
  instansi: ["INSERT INTO instansi_sesi (token_sha, akun_id, dibuat, kedaluwarsa) SELECT ?1, id, ?3, ?4 FROM instansi_akun WHERE id = ?2 AND status = 'aktif' AND dummy = 0", "DELETE FROM instansi_sesi WHERE akun_id = ?1 AND kedaluwarsa <= ?2", "DELETE FROM instansi_sesi WHERE token_sha = ?1"],
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
    env.DB.prepare("SELECT id, jenis, wilayah FROM instansi_akun WHERE wa = ?1 AND status = 'aktif' AND dummy = 0 LIMIT ?2").bind(nomor, maks),
    env.DB.prepare("SELECT x.id, x.jenis, x.wilayah FROM mk_akun u JOIN mk_anggota g ON g.mk_id = u.id AND g.tabel = 'instansi_akun' AND g.status = 'aktif' JOIN instansi_akun x ON x.id = g.akun_id AND x.status = 'aktif' AND x.dummy = 0 WHERE u.wa = ?1 AND u.status = 'aktif' LIMIT ?2").bind(nomor, maks),
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
    env.DB.prepare("SELECT id, jenis, tingkat, wilayah, prov, kab, cakupan, 1 pemilik FROM instansi_akun WHERE wa = ?1 AND status = 'aktif' AND dummy = 0 LIMIT ?2").bind(nomor, maks),
    env.DB.prepare(`SELECT x.id, x.jenis, x.tingkat, x.wilayah, x.prov, x.kab, x.cakupan, 0 pemilik FROM mk_anggota g JOIN instansi_akun x ON x.id = g.akun_id AND x.status = 'aktif' AND x.dummy = 0
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
  env.DB.prepare("INSERT INTO wa_antre (id, tujuan, pesan, jenis, rujukan, status, percobaan, dibuat) VALUES (?1, ?2, ?3, 'undang', ?1, 'antre', 0, ?4)").bind(u.id, u.wa, pesan, kini)]);
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
  "SELECT t.id, t.org_id, t.kejadian_id, t.cabut, k.fase FROM tw_token t JOIN sk_kejadian k ON k.id = t.kejadian_id WHERE t.token_sha = ?1").bind(tokenSha).first();

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
  bl_biaya:  {bl_mesin: ["baca", "tambah", "ubah"]},
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
export const blTerdaftar = async (env, p) => (await sedia(env, p, "bl_daftar", "baca", "SELECT wa_sha FROM bl_daftar WHERE status = 'setuju' ORDER BY wa_sha LIMIT 5000").all()).results.map(r => r.wa_sha);

/* ---- biaya harian (A10, Q5), mikro-USD ---- */
export const blBiayaBaca = async (env, p, tanggal) => (await sedia(env, p, "bl_biaya", "baca", "SELECT usd_mikro FROM bl_biaya WHERE tanggal = ?1").bind(tanggal).first())?.usd_mikro ?? 0;
export const blBiayaTambah = async (env, p, tanggal, usdMikro) => (await sedia(env, p, "bl_biaya", "tambah", `INSERT INTO bl_biaya (tanggal, usd_mikro) VALUES (?1, ?2)
  ON CONFLICT (tanggal) DO UPDATE SET usd_mikro = bl_biaya.usd_mikro + excluded.usd_mikro RETURNING usd_mikro`).bind(tanggal, usdMikro).first()).usd_mikro;

/* ---- detak mesin (K11, Q2) ---- */
export const blDetakBaca = async (env, p, mesin) => (await sedia(env, p, "bl_detak", "baca", "SELECT terakhir FROM bl_detak WHERE mesin = ?1").bind(mesin).first())?.terakhir ?? null;
export const blDetakTulis = (env, p, mesin, kini) => sedia(env, p, "bl_detak", "tambah", "INSERT INTO bl_detak (mesin, terakhir) VALUES (?1, ?2) ON CONFLICT (mesin) DO UPDATE SET terakhir = excluded.terakhir").bind(mesin, kini).run();
export const blDetakSemua = async (env, p) => (await sedia(env, p, "bl_detak", "baca", "SELECT mesin, terakhir FROM bl_detak WHERE mesin > '' ORDER BY mesin LIMIT 20").all()).results;
