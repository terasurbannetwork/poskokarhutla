/* Modul Pegawai dan Relawan Lapangan, sisi petugas, tahap A (data/kajian-bnpb/lapangan/DESAIN-TEKNIS.md §2 dan §4, ALUR A2):
   konstanta publik, profil sendiri, persetujuan wajah, dummy. Wajah, nonce, absen, logbook menyusul per tiket (LP-011 dst.).
   Skema: migrations/0095_lapangan_orang.sql. Konstanta dan fungsi murni: src/lapangan_konst.js. Rute pimpinan: src/lapangan_panel.js (digabung di bawah).
   Akses petugas = header x-kode: kode pribadi baris `orang` (hanya sha256 di D1), atau kode relawan yang sudah ada (relawan.kode_sha, status sudah diverifikasi).
   Relawan masuk ke `orang` lewat salinOrang(): dipanggil saat diverifikasi (src/relawan.js) dan, bila terlewat, saat kodenya dipakai pertama kali.
   Kode salah dijawab 401 (dihitung per IP oleh pemegangKode, 60 gagal per jam = 429). */
import {gagal, json, acak, bacaBody, ipHash, cacheTepi} from "./worker.js";
import {superOK} from "./posko.js";
import {pemegangKode, laju, kodeBaru} from "./bnpb.js";
import {KONST_PUBLIK, VERSI_SETUJU, TEKS_SETUJU} from "./lapangan_konst.js";
import {RUTE_LAPANGAN_PANEL, jaga, pb} from "./lapangan_panel.js";
export {bersihkanLapangan} from "./lapangan_panel.js";

const JAM = 3600e3;
const STATUS_RELAWAN_SAH = "'diverifikasi', 'siap_tugas', 'ditugaskan', 'bertugas', 'selesai'";

/* Buat atau perbarui baris orang jenis relawan dari baris relawan (satu orang per relawan: indeks unik orang_relawan_u). Anonim tidak disalin. */
export const salinOrang = (env, relawanId, kini = Date.now()) => env.DB.prepare(
  `INSERT INTO orang (id, jenis, relawan_id, nama, wa, email, prov, kab, status, wajah_status, dibuat, diubah, dummy)
   SELECT ?, 'relawan', id, nama, wa, email, prov, kab, 'aktif', 'belum', ?2, ?2, dummy FROM relawan WHERE id = ?3 AND anonim = 0
   ON CONFLICT (relawan_id) WHERE relawan_id IS NOT NULL DO UPDATE SET nama = excluded.nama, wa = excluded.wa, email = excluded.email, prov = excluded.prov, kab = excluded.kab, diubah = excluded.diubah`)
  .bind(acak(8), kini, relawanId).run();

/* hak UU PDP: relawan yang cabut diri (anonimkan di src/relawan.js) ikut kehilangan salinan di modul lapangan: baris orang, wajah, persetujuan, antrean WA bermuatan kode, foto acuan.
   Dipanggil sesudah batch anonimkan, terpisah, karena batch itu gagal utuh bila tabel 0095 belum ada. */
export async function hapusOrang(env, relawanId) {
  try {
    const {results} = await env.DB.prepare("SELECT id FROM orang WHERE relawan_id = ?").bind(relawanId).all();
    if (!results.length) return;
    await env.DB.batch(results.flatMap(({id}) => ["DELETE FROM orang_wajah WHERE orang_id = ?", "DELETE FROM orang_setuju WHERE orang_id = ?", "DELETE FROM wa_antre WHERE rujukan = ?", "DELETE FROM orang WHERE id = ?"].map(q => env.DB.prepare(q).bind(id))));
    for (const {id} of results) await env.MEDIA?.delete(`lapangan/acuan/${id}.jpg`).catch(() => {});
  } catch (e) { if (!/no such table/i.test(e?.message || "")) throw e; }
}

const cariOrang = (env, kini) => async kodeSha => {
  const o = await env.DB.prepare("SELECT * FROM orang WHERE kode_sha = ? AND status = 'aktif'").bind(kodeSha).first();
  if (o) return o;
  const r = await env.DB.prepare(`SELECT id FROM relawan WHERE kode_sha = ? AND anonim = 0 AND status IN (${STATUS_RELAWAN_SAH})`).bind(kodeSha).first();
  if (!r) return null;
  await salinOrang(env, r.id, kini);
  return env.DB.prepare("SELECT * FROM orang WHERE relawan_id = ? AND status = 'aktif'").bind(r.id).first();
};
/* baris orang atau Response: tanpa kode 401, kode salah/dicabut 401 (bukan 403 pemegangKode), terlalu banyak tebakan 429 */
async function petugas(env, req, kini) {
  if (!req.headers.get("x-kode")) return gagal(401, "kode tidak diberikan; buka tautan pribadimu");
  const r = await pemegangKode(env, req, "lapangan", cariOrang(env, kini), kini, 60);
  return r instanceof Response && r.status === 403 ? gagal(401, "kode tidak berlaku (salah atau sudah diganti); minta tautan baru dari admin") : r;
}

const setujuTerakhir = (env, orangId) => env.DB.prepare("SELECT versi_teks, setuju FROM orang_setuju WHERE orang_id = ? ORDER BY waktu DESC, rowid DESC LIMIT 1").bind(orangId).first();

async function saya(env, req, kini) {
  const o = await petugas(env, req, kini); if (o instanceof Response) return o;
  const s = await setujuTerakhir(env, o.id);
  return json({
    orang: {id: o.id, nama: o.nama, jenis: o.jenis, unit: o.unit, jabatan: o.jabatan, prov: o.prov, kab: o.kab, wajah_status: o.wajah_status, setuju_versi: s?.setuju ? s.versi_teks : null},
    setuju: {versi: VERSI_SETUJU, teks: TEKS_SETUJU},
    tugas: [],   // LP-012 (tugas) menyusul
    hari_ini: {absen_masuk: null, absen_pulang: null, logbook: null},
  });
}

async function setuju(env, req, kini) {
  const o = await petugas(env, req, kini); if (o instanceof Response) return o;
  const lj = await laju(env, o.id, "lapangan.setuju", [[JAM, 20]], kini); if (lj) return lj;
  const b = await bacaBody(req, 1024); if (b.galat) return gagal(b.status || 400, b.galat);
  if (b.o.versi !== VERSI_SETUJU) return gagal(400, "versi teks persetujuan sudah berganti; muat ulang layar");
  if (typeof b.o.setuju !== "boolean") return gagal(400, "setuju harus true atau false");
  await env.DB.batch([
    env.DB.prepare("INSERT INTO orang_setuju (id, orang_id, versi_teks, setuju, waktu, ip_hash) VALUES (?, ?, ?, ?, ?, ?)").bind(acak(8), o.id, VERSI_SETUJU, b.o.setuju ? 1 : 0, kini, await ipHash(env, req)),
    /* mencabut: vektor dan foto acuan dihapus seketika; hanya yang sudah terdaftar berubah jadi 'dihapus' */
    ...(b.o.setuju ? [] : [env.DB.prepare("DELETE FROM orang_wajah WHERE orang_id = ?").bind(o.id),
      env.DB.prepare("UPDATE orang SET wajah_status = 'dihapus', wajah_versi = NULL, diubah = ? WHERE id = ? AND wajah_status = 'terdaftar'").bind(kini, o.id)]),
  ]);
  if (!b.o.setuju) await env.MEDIA?.delete(`lapangan/acuan/${o.id}.jpg`).catch(() => {});   // foto acuan (LP-011); tanpa bucket: tidak ada yang dihapus
  return json({ok: true, setuju_versi: b.o.setuju ? VERSI_SETUJU : null});
}

/* ================================================================ dummy (Super Admin) */
const hapusDummyStmt = env => ["DELETE FROM orang_wajah WHERE orang_id IN (SELECT id FROM orang WHERE dummy = 1)", "DELETE FROM orang_setuju WHERE orang_id IN (SELECT id FROM orang WHERE dummy = 1)",
  "DELETE FROM wa_antre WHERE dummy = 1", "DELETE FROM orang WHERE dummy = 1"].map(s => env.DB.prepare(s));
/* [jenis, nama, nip, unit, jabatan, wajah_status, riwayat persetujuan (lama ke baru)] */
const DUMMY = [
  ["pegawai", "Rina Wulandari (contoh)", "999900000000000001", "Pusdalops PB", "Analis Pusdalops", "terdaftar", [1]],
  ["pegawai", "Agus Prasetyo (contoh)", "999900000000000002", "Direktorat Sistem Penanggulangan Bencana", "Staf Direktorat", "belum", []],
  ["relawan", "Sari Lestari (contoh)", null, null, null, "dihapus", [1, 0]],
];
async function buatDummy(env, req, kini) {
  if (!await superOK(env, req)) return gagal(403, "isi data contoh hanya untuk Super Admin");
  const baris = [], kodeSatu = [];
  for (const [i, [jenis, nama, nip, unit, jabatan, wajah, setujuRiwayat]] of DUMMY.entries()) {
    const id = acak(8), k = await kodeBaru(); if (!i) kodeSatu.push(k.kode);
    baris.push(env.DB.prepare("INSERT INTO orang (id, jenis, nama, nip, unit, jabatan, wa, prov, kab, status, kode_sha, wajah_status, wajah_versi, dibuat, diubah, dummy) VALUES (?, ?, ?, ?, ?, ?, NULL, '62', 'Contoh', 'aktif', ?, ?, ?, ?, ?, 1)")
      .bind(id, jenis, nama, nip, unit, jabatan, k.kode_sha, wajah, wajah === "terdaftar" ? "contoh-1" : null, kini, kini));
    if (wajah === "terdaftar") for (const arah of ["depan", "kiri", "kanan", "atas", "bawah"])
      baris.push(env.DB.prepare("INSERT INTO orang_wajah (orang_id, arah, vektor, versi, mutu, dibuat) VALUES (?, ?, 'AACAPwAAAAA=', 'contoh-1', 0.9, ?)").bind(id, arah, kini));
    setujuRiwayat.forEach((s, j) => baris.push(env.DB.prepare("INSERT INTO orang_setuju (id, orang_id, versi_teks, setuju, waktu, ip_hash) VALUES (?, ?, ?, ?, ?, NULL)").bind(acak(8), id, VERSI_SETUJU, s, kini - (setujuRiwayat.length - j) * 1000)));
  }
  await env.DB.batch([...hapusDummyStmt(env), ...baris]);
  return json({kode: kodeSatu[0], n: DUMMY.length}, 201);
}
async function hapusDummy(env, req) {
  if (!await superOK(env, req)) return gagal(403, "hapus data contoh hanya untuk Super Admin");
  const n = (await env.DB.prepare("SELECT count(*) n FROM orang WHERE dummy = 1").first()).n;
  await env.DB.batch(hapusDummyStmt(env));
  return json({ok: true, n});
}

/* rute digabung ke RUTE di src/worker.js */
export const RUTE_LAPANGAN = jaga({
  "GET /api/petugas/konst": (env, req, url, kini, ctx) => cacheTepi(new Request(new URL("/api/petugas/konst", url), {method: "GET"}), ctx, 3600, async () => json(KONST_PUBLIK)),
  /* jalur /api/petugas/*: /api/petugas/saya dan halaman /lapangan milik regu Posko lama (src/posko.js), jadi modul ini memakai awalan sendiri */
  "GET /api/petugas/saya": (env, req, url, kini) => saya(env, req, kini),
  "POST /api/petugas/setuju": (env, req, url, kini) => pb(req) ?? setuju(env, req, kini),
  "POST /api/petugas/dummy": (env, req, url, kini) => pb(req) ?? buatDummy(env, req, kini),
  "DELETE /api/petugas/dummy": (env, req) => pb(req) ?? hapusDummy(env, req),
  ...RUTE_LAPANGAN_PANEL,
});
