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
