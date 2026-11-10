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
