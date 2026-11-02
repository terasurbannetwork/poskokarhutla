/* Modul Pegawai dan Relawan Lapangan, sisi petugas, tahap A (data/kajian-bnpb/lapangan/DESAIN-TEKNIS.md §2 dan §4, ALUR A2):
   konstanta publik, profil sendiri, persetujuan wajah, dummy. Wajah, nonce, absen, logbook menyusul per tiket (LP-011 dst.).
   Skema: migrations/0095_lapangan_orang.sql. Konstanta dan fungsi murni: src/lapangan_konst.js. Rute pimpinan: src/lapangan_panel.js (digabung di bawah).
   Akses petugas = header x-kode: kode pribadi baris `orang` (hanya sha256 di D1), atau kode relawan yang sudah ada (relawan.kode_sha, status sudah diverifikasi).
   Relawan masuk ke `orang` lewat salinOrang(): dipanggil saat diverifikasi (src/relawan.js) dan, bila terlewat, saat kodenya dipakai pertama kali.
   Kode salah dijawab 401 (dihitung per IP oleh pemegangKode, 60 gagal per jam = 429). */
import {gagal, json, acak, bacaBody, ipHash, cacheTepi, shaBytes, sha} from "./worker.js";
import {superOK, num, tx} from "./posko.js";
import {dalamWilayahStaf} from "./staf.js";
import {pemegangKode, laju, kodeBaru} from "./bnpb.js";
import {nilaiGps, jaringanRelay} from "./gps.js";
import {jaringanHosting} from "./publik.js";
import {jenisBerkas, ATURAN_MEDIA, jarakM} from "./foto.js";
import {bersihMedia} from "./media_bersih.js";
import {KONST_PUBLIK, VERSI_SETUJU, TEKS_SETUJU, ARAH, TANTANGAN, NONCE, LURING, BATAS_JAM_HP_DETIK, AMBANG_DAFTAR, KONDISI, KEGIATAN, KENDALA, KEBUTUHAN, KONDISI_API, KONDISI_BANJIR, BATAS_FOTO_LOGBOOK, DIM_VEKTOR_MAKS, DIM_VEKTOR_MIN, JENDELA_TUGAS_MS,
  kosinus, vektorDari, haversineM, dalamRadius, lompatanMustahil, putusStatus, tanggalWIB, awalHariWIB, LURING_LAMA_MS, JARINGAN_JENDELA_MS, WAJAH_BARU_ABSEN, SAMPEL_TINJAU, LABEL_TAMBAH_M} from "./lapangan_konst.js";
import {RUTE_LAPANGAN_PANEL, jaga, pb, penjaga, jamRelawan, kirimJpeg} from "./lapangan_panel.js";
export {bersihkanLapangan} from "./lapangan_panel.js";

const MENIT = 60e3, JAM = 3600e3, HARI = 24 * JAM, RE_ID = /^[0-9a-f]{16}$/, RE_TGL = /^\d{4}-\d{2}-\d{2}$/;
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
    /* absen, logbook, dan nonce ikut terhapus (FK CASCADE 0097); berkas R2-nya dibuang dulu selagi barisnya masih ada */
    await hapusBerkasOrang(env, results.map(x => x.id));
    /* baris tahap B dihapus eksplisit (tidak bergantung CASCADE) dan terpisah: tanpa 0097 batch ini gagal, penghapusan tahap A di bawah tetap jalan */
    try {
      await env.DB.batch(results.flatMap(({id}) => ["DELETE FROM lapangan_label WHERE sumber_id IN (SELECT id FROM lp_logbook WHERE orang_id = ?1)", "DELETE FROM lp_logbook_foto WHERE logbook_id IN (SELECT id FROM lp_logbook WHERE orang_id = ?1)",
        "DELETE FROM lp_logbook WHERE orang_id = ?1", "DELETE FROM lp_absen WHERE orang_id = ?1", "DELETE FROM lp_nonce WHERE orang_id = ?1", "DELETE FROM lp_wajah_baru WHERE orang_id = ?1", "DELETE FROM lp_anggota WHERE orang_id = ?1"].map(q => env.DB.prepare(q).bind(id))));
    } catch (e) { if (!/no such table/i.test(e?.message || "")) throw e; }
    await env.DB.batch(results.flatMap(({id}) => ["DELETE FROM orang_wajah WHERE orang_id = ?", "DELETE FROM orang_setuju WHERE orang_id = ?", "DELETE FROM wa_antre WHERE rujukan = ?", "DELETE FROM orang WHERE id = ?"].map(q => env.DB.prepare(q).bind(id))));
    for (const {id} of results) await env.MEDIA?.delete(`lapangan/acuan/${id}.jpg`).catch(() => {});
  } catch (e) { if (!/no such table/i.test(e?.message || "")) throw e; }
}

async function hapusBerkasOrang(env, ids) {
  if (!env.MEDIA) return;
  try {
    const {results} = await env.DB.prepare(`SELECT foto_key k FROM lp_absen WHERE orang_id IN (SELECT value FROM json_each(?1)) UNION ALL
      SELECT f.foto_key FROM lp_logbook_foto f JOIN lp_logbook l ON l.id = f.logbook_id WHERE l.orang_id IN (SELECT value FROM json_each(?1))`).bind(JSON.stringify(ids)).all();
    for (let i = 0; i < results.length; i += 100) await env.MEDIA.delete(results.slice(i, i + 100).map(x => x.k));
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
export async function petugas(env, req, kini) {
  if (!req.headers.get("x-kode")) return gagal(401, "kode tidak diberikan; buka tautan pribadimu");
  const r = await pemegangKode(env, req, "lapangan", cariOrang(env, kini), kini, 60);
  return r instanceof Response && r.status === 403 ? gagal(401, "kode tidak berlaku (salah atau sudah diganti); minta tautan baru dari admin") : r;
}

const setujuTerakhir = (env, orangId) => env.DB.prepare("SELECT versi_teks, setuju FROM orang_setuju WHERE orang_id = ? ORDER BY waktu DESC, rowid DESC LIMIT 1").bind(orangId).first();

async function saya(env, req, kini) {
  const o = await petugas(env, req, kini); if (o instanceof Response) return o;
  const s = await setujuTerakhir(env, o.id);
  const {tugas, hari_ini} = await tugasHariIni(env, o.id, kini);
  return json({
    orang: {id: o.id, nama: o.nama, jenis: o.jenis, unit: o.unit, jabatan: o.jabatan, prov: o.prov, kab: o.kab, wajah_status: o.wajah_status, setuju_versi: s?.setuju ? s.versi_teks : null},
    setuju: {versi: VERSI_SETUJU, teks: TEKS_SETUJU},
    tugas, hari_ini,
  });
}
/* tugas yang jendelanya menyentuh hari ini (WIB) + status absen/logbook hari ini; migrasi 0097 belum jalan = kosong seperti tahap A */
async function tugasHariIni(env, orangId, kini) {
  const hari = tanggalWIB(kini), a0 = awalHariWIB(hari), kosong = {tugas: [], hari_ini: {absen_masuk: null, absen_pulang: null, logbook: null}};
  try {
    const [t, a, l] = await env.DB.batch([
      env.DB.prepare(`SELECT t.id, t.judul, t.bencana, t.lat, t.lon, t.radius_m, t.wilayah_teks, t.renlap_url, t.mulai, t.selesai FROM lp_tugas t JOIN lp_anggota g ON g.tugas_id = t.id
        WHERE g.orang_id = ?1 AND t.mulai < ?3 AND t.selesai >= ?2 ORDER BY t.mulai, t.id`).bind(orangId, a0, a0 + HARI),
      env.DB.prepare("SELECT tugas_id, jenis, waktu, status FROM lp_absen WHERE orang_id = ? AND tanggal = ? ORDER BY (status <> 'tolak') DESC, waktu DESC").bind(orangId, hari),
      env.DB.prepare("SELECT id FROM lp_logbook WHERE orang_id = ? AND tanggal = ? ORDER BY waktu DESC LIMIT 1").bind(orangId, hari)]);
    const ambil = jenis => { const x = a.results.find(r => r.jenis === jenis); return x ? {tugas_id: x.tugas_id, waktu: x.waktu, status: x.status} : null; };
    return {tugas: t.results, hari_ini: {absen_masuk: ambil("masuk"), absen_pulang: ambil("pulang"), logbook: l.results[0] ? {id: l.results[0].id, terkunci: false} : null}};   // logbook hari ini belum lewat 23.59 WIB, jadi terbuka
  } catch (e) { if (/no such table/i.test(e?.message || "")) return kosong; throw e; }
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

/* ================================================================ tahap B: wajah, nonce, absen, logbook, riwayat, foto (migrasi 0097) */
const M_FOTO = ATURAN_MEDIA.maks.foto;
const RE_NONCE = /^[0-9a-f]{32}$/;

/* formulir multipart: Content-Length wajib dan dibatasi SEBELUM body dibaca; field `data` = JSON objek */
async function bacaForm(req, maks) {
  if (!(req.headers.get("content-type") || "").startsWith("multipart/form-data")) return {r: gagal(400, "kirim sebagai multipart/form-data (field data berisi JSON, field foto berisi JPEG)")};
  const n = Number(req.headers.get("content-length"));
  if (!(n > 0)) return {r: gagal(411, "Content-Length wajib pada unggahan")};
  if (n > maks) return {r: gagal(413, `kiriman ${Math.round(n / 1024)} KB, maksimal ${Math.round(maks / 1024)} KB`)};
  let f; try { f = await req.formData(); } catch (e) { return {r: gagal(400, "formulir tidak terbaca")}; }
  const t = f.get("data");
  if (typeof t !== "string") return {r: gagal(400, "field data (JSON) wajib")};
  let d; try { d = JSON.parse(t); } catch (e) { return {r: gagal(400, "field data bukan JSON")}; }
  if (!d || typeof d !== "object" || Array.isArray(d)) return {r: gagal(400, "field data harus objek JSON")};
  return {f, d};
}
/* satu berkas JPEG: jenis dari byte awal (bukan Content-Type), batas ukuran, metadata dibuang bersihMedia; {b, sha} atau Response */
async function bacaJpeg(file, nama) {
  if (!(file instanceof File) || !file.size) return gagal(400, `${nama} wajib (JPEG)`);
  if (file.size > M_FOTO) return gagal(413, `${nama} ${(file.size / 1048576).toFixed(1)} MB, maksimal ${M_FOTO / 1048576} MB`);
  const b = new Uint8Array(await file.arrayBuffer());
  if (jenisBerkas(b) !== "image/jpeg") return gagal(400, `${nama} harus JPEG`);
  const bersih = bersihMedia("image/jpeg", b); if (!bersih) return gagal(400, `struktur ${nama} tidak sah atau rusak`);
  return {b: bersih, sha: await shaBytes(bersih)};
}
const vektorSah = v => {
  if (typeof v !== "string" || v.length < 8 || v.length > 12000 || !/^[A-Za-z0-9+/]+={0,2}$/.test(v)) return null;
  try { const x = vektorDari(v); return x.length >= DIM_VEKTOR_MIN && x.length <= DIM_VEKTOR_MAKS && x.every(Number.isFinite) && x.some(e => e !== 0) ? x : null; } catch (e) { return null; }
};

/* ---------------------------------------------------------------- wajah (LP-011) */
async function wajahDaftar(env, req, kini) {
  const o = await petugas(env, req, kini); if (o instanceof Response) return o;
  if (!env.MEDIA) return gagal(503, "penyimpanan foto belum aktif (R2 MEDIA)");
  const s = await setujuTerakhir(env, o.id);
  if (!s?.setuju || s.versi_teks !== VERSI_SETUJU) return gagal(403, "persetujuan wajah wajib: setujui teks terbaru lebih dulu");
  const f = await bacaForm(req, M_FOTO + 128 * 1024); if (f.r) return f.r;
  const {versi_model: versi, arah, mutu} = f.d;
  if (typeof versi !== "string" || versi.length < 1 || versi.length > 80) return gagal(400, "versi_model wajib (1 sampai 80 karakter)");
  if (!arah || typeof arah !== "object" || Array.isArray(arah) || Object.keys(arah).length !== ARAH.length || !ARAH.every(a => a in arah)) return gagal(400, `arah harus memuat tepat ${ARAH.join(", ")}`);
  if (mutu != null && (typeof mutu !== "object" || Array.isArray(mutu) || Object.values(mutu).some(m => typeof m !== "number" || !(m >= 0 && m <= 1)))) return gagal(400, "mutu harus objek angka 0 sampai 1");
  const v = {}, buruk = [];
  for (const a of ARAH) { v[a] = vektorSah(arah[a]); if (!v[a]) buruk.push(a); }
  if (buruk.length) return json({galat: "vektor tidak sah (base64 Float32, 16 sampai 2048 angka); ulangi arah ini", arah: buruk}, 422);
  if (new Set(ARAH.map(a => v[a].length)).size !== 1) return json({galat: "dimensi vektor antararah berbeda", arah: ARAH.filter(a => v[a].length !== v.depan.length)}, 422);
  const tak = ARAH.filter(a => a !== "depan" && kosinus(v[a], v.depan) < AMBANG_DAFTAR);
  if (tak.length) return json({galat: "wajah pada arah ini tidak cocok dengan wajah depan; ulangi", arah: tak}, 422);
  const foto = await bacaJpeg(f.f.get("foto"), "foto depan"); if (foto instanceof Response) return foto;
  const lj = await laju(env, o.id, "lapangan.wajah", [[HARI, 5]], kini); if (lj) return lj;
  const kunci = `lapangan/acuan/${o.id}.jpg`;
  await env.MEDIA.put(kunci, foto.b, {httpMetadata: {contentType: "image/jpeg"}});
  try {
    await env.DB.batch([env.DB.prepare("DELETE FROM orang_wajah WHERE orang_id = ?").bind(o.id),
      ...ARAH.map(a => env.DB.prepare("INSERT INTO orang_wajah (orang_id, arah, vektor, versi, mutu, dibuat) VALUES (?, ?, ?, ?, ?, ?)").bind(o.id, a, arah[a], versi, mutu?.[a] ?? null, kini)),
      env.DB.prepare("UPDATE orang SET wajah_status = 'terdaftar', wajah_versi = ?, diubah = ? WHERE id = ?").bind(versi, kini, o.id),
      /* daftar ulang (bukan pendaftaran pertama): 3 absen berikutnya ditinjau, supaya pencuri kode tidak bisa mengganti wajah lalu absen mulus. 'dihapus' ikut: hapus lalu daftar adalah jalan pintas yang sama. */
      ...(o.wajah_status !== "belum" ? [env.DB.prepare("INSERT INTO lp_wajah_baru (orang_id, sisa) VALUES (?, ?) ON CONFLICT (orang_id) DO UPDATE SET sisa = excluded.sisa").bind(o.id, WAJAH_BARU_ABSEN)] : [])]);
  } catch (e) { if (o.wajah_status !== "terdaftar") await env.MEDIA.delete(kunci).catch(() => {}); throw e; }
  return json({ok: true, wajah_status: "terdaftar"});
}
async function wajahHapus(env, req, kini) {
  const o = await petugas(env, req, kini); if (o instanceof Response) return o;
  await env.DB.batch([env.DB.prepare("DELETE FROM orang_wajah WHERE orang_id = ?").bind(o.id),
    env.DB.prepare("UPDATE orang SET wajah_status = 'dihapus', wajah_versi = NULL, diubah = ? WHERE id = ? AND wajah_status = 'terdaftar'").bind(kini, o.id)]);
  await env.MEDIA?.delete(`lapangan/acuan/${o.id}.jpg`).catch(() => {});
  return json({ok: true, wajah_status: o.wajah_status === "terdaftar" ? "dihapus" : o.wajah_status});
}

/* ---------------------------------------------------------------- nonce (LP-013) */
async function nonceBaru(env, req, kini) {
  const o = await petugas(env, req, kini); if (o instanceof Response) return o;
  const lj = await laju(env, o.id, "lapangan.nonce", [[JAM, 30]], kini); if (lj) return lj;
  const b = await bacaBody(req, 256); if (b.galat) return gagal(b.status || 400, b.galat);
  const jumlah = b.o.jumlah ?? 1, luring = b.o.luring === true || jumlah === NONCE.luringJumlah;   // simpanan luring: {jumlah: 1..6, luring: true}; jumlah 6 tanpa tanda tetap luring (klien lama)
  if (!Number.isInteger(jumlah) || jumlah < 1 || jumlah > (luring ? NONCE.luringJumlah : 1)) return gagal(400, `jumlah harus 1 (atau 1 sampai ${NONCE.luringJumlah} dengan luring: true)`);
  const umur = luring ? NONCE.luringUmurMs : NONCE.umurMs, daftar = [];
  for (let i = 0; i < jumlah; i++) daftar.push({nonce: acak(16), tantangan: TANTANGAN[crypto.getRandomValues(new Uint8Array(1))[0] % TANTANGAN.length], kedaluwarsa: kini + umur});
  await env.DB.batch(await Promise.all(daftar.map(async n => env.DB.prepare("INSERT INTO lp_nonce (nonce_sha, orang_id, tantangan, kedaluwarsa, dipakai, dibuat) VALUES (?, ?, ?, ?, 0, ?)").bind(await sha(n.nonce), o.id, n.tantangan, n.kedaluwarsa, kini))));
  return json({nonce: daftar, waktu_server: kini});
}

/* ---------------------------------------------------------------- absen (LP-013, LP-032) */
async function absen(env, req, kini) {
  const o = await petugas(env, req, kini); if (o instanceof Response) return o;
  if (!env.MEDIA) return gagal(503, "penyimpanan foto belum aktif (R2 MEDIA)");
  const lj = await laju(env, o.id, "lapangan.absen", [[JAM, 10]], kini); if (lj) return lj;
  const f = await bacaForm(req, M_FOTO + 64 * 1024); if (f.r) return f.r;
  const d = f.d;
  if (typeof d.nonce !== "string" || !RE_NONCE.test(d.nonce)) return gagal(400, "nonce tidak sah");
  if (d.jenis !== "masuk" && d.jenis !== "pulang") return gagal(400, "jenis harus masuk atau pulang");
  if (typeof d.tugas_id !== "string" || !RE_ID.test(d.tugas_id)) return gagal(400, "tugas_id tidak sah");
  if (typeof d.tantangan_lolos !== "boolean" || typeof d.luring !== "boolean") return gagal(400, "tantangan_lolos dan luring harus true atau false");
  const hidup = d.skor_hidup == null ? 0 : num(d.skor_hidup, 0, 1);
  if (Number.isNaN(hidup)) return gagal(400, "skor_hidup harus angka 0 sampai 1");
  if (d.versi_model != null && (typeof d.versi_model !== "string" || d.versi_model.length > 80)) return gagal(400, "versi_model maksimal 80 karakter");
  const zona = tx(d.zona, 40); if (zona === undefined) return gagal(400, "zona maksimal 40 karakter");
  const vek = d.vektor == null ? null : vektorSah(d.vektor);
  if (d.vektor != null && !vek) return gagal(400, "vektor tidak sah");
  /* sampel GPS: [{lat, lon, akurasi, waktu}] urut waktu naik, 3 sampai 10; titik absen = sampel terakhir (pola uji pilot) */
  const sm = d.sampel;
  if (!Array.isArray(sm) || sm.length < 3 || sm.length > 10 || sm.some(x => !x || typeof x !== "object" || ![x.lat, x.lon, x.akurasi, x.waktu].every(Number.isFinite))) return gagal(400, "sampel GPS wajib 3 sampai 10 bacaan {lat, lon, akurasi, waktu}");
  const sampelJson = JSON.stringify(sm.map(x => [x.lat, x.lon, x.akurasi, x.waktu]));
  if (sampelJson.length > 1000) return gagal(400, "sampel GPS terlalu panjang; bulatkan koordinat dan akurasi");   // CHECK kolom 1000 karakter: tolak sebelum menulis apa pun
  const akhir = sm.at(-1);
  if ([num(akhir.lat, -11.5, 6.5), num(akhir.lon, 94.5, 141.5), num(akhir.akurasi, 0, 5000)].some(Number.isNaN)) return gagal(400, "lokasi GPS harus berada di Indonesia (akurasi maksimal 5000 m)");
  /* waktu: daring = jam server; luring = jam HP bila 24 jam ke belakang dan 5 menit ke depan (aturan relawan_jam), kalau tidak jam server + tanda jam_hp */
  const wh = num(d.waktu_hp, 1e12, 4e12);
  if (Number.isNaN(wh)) return gagal(400, "waktu_hp tidak sah");
  let waktu = kini, jamHp = false;
  if (d.luring) { if (wh != null && wh <= kini + LURING.majuMs && wh >= kini - LURING.mundurMs) waktu = Math.round(wh); else jamHp = true; }
  else if (wh == null || Math.abs(wh - kini) / 1000 > BATAS_JAM_HP_DETIK) jamHp = true;
  /* jam acuan penilaian: server untuk absen daring; luring memakai jam yang diklaim HP (sudah dibatasi 24 jam/5 menit di atas) dan DICATAT lewat tanda luring (+ luring_lama bila klaim > 2 jam) */
  const tk = d.luring ? waktu : kini, luringLama = d.luring && kini - waktu > LURING_LAMA_MS;
  if (akhir.waktu > kini + MENIT || akhir.waktu < tk - 10 * MENIT) return gagal(400, "lokasi tidak bisa diverifikasi; muat ulang halaman lalu ambil lokasi lagi");
  const t = await env.DB.prepare("SELECT t.id, t.lat, t.lon, t.radius_m, t.mulai, t.selesai FROM lp_tugas t JOIN lp_anggota g ON g.tugas_id = t.id WHERE t.id = ? AND g.orang_id = ?").bind(d.tugas_id, o.id).first();
  if (!t) return gagal(404, "tugas tidak ditemukan");
  if (waktu < t.mulai - JENDELA_TUGAS_MS || waktu > t.selesai + JENDELA_TUGAS_MS) return gagal(409, "di luar jadwal tugas ini");
  const tanggal = tanggalWIB(waktu);
  const foto = await bacaJpeg(f.f.get("foto"), "foto"); if (foto instanceof Response) return foto;
  /* penilaian GPS (src/gps.js): tolak hanya yang pasti janggal; curiga masuk tinjauan */
  const sebelum = await env.DB.prepare("SELECT lat, lon, waktu FROM lp_absen WHERE orang_id = ? AND waktu > ? AND waktu <= ? ORDER BY waktu DESC LIMIT 1").bind(o.id, waktu - HARI, waktu).first();
  const g = nilaiGps({negara: req.cf?.country, hosting: jaringanHosting(req.cf), relay: jaringanRelay(req.cf), zona, prov: o.prov, lat: akhir.lat, lon: akhir.lon, waktuGps: akhir.waktu,
    sampel: sampelJson, sebelum: sebelum && {lat: sebelum.lat, lon: sebelum.lon, dibuat: sebelum.waktu}, kini: tk});
  if (g.tolak) return gagal(400, g.tolak);
  const ket = [...g.curiga];
  if (sebelum && lompatanMustahil(sebelum, {lat: akhir.lat, lon: akhir.lon, waktu})) ket.push("lompatan lokasi mustahil dari absen sebelumnya");
  /* satu absen per jenis per orang-tugas-hari (yang ditolak peninjau boleh diulang), dan foto yang sama tidak pernah dipakai dua kali */
  if (await env.DB.prepare("SELECT 1 FROM lp_absen WHERE orang_id = ? AND tugas_id = ? AND jenis = ? AND tanggal = ? AND status <> 'tolak'").bind(o.id, t.id, d.jenis, tanggal).first()) return gagal(409, `absen ${d.jenis} hari ini sudah tercatat`);
  /* nonce sekali pakai, terikat orang; satu UPDATE atomik. Salah / terpakai / milik orang lain / kedaluwarsa dijawab sama.
     Daring: harus belum kedaluwarsa menurut jam server. Luring: jam klaim HP, tetapi nonce harus dibuat sebelum klaim (+5 menit) dan harus nonce luring (umur > umur daring),
     supaya nonce 5 menit yang sudah mati tidak bisa dihidupkan lagi dengan memundurkan waktu_hp. */
  const nonce = await env.DB.prepare("UPDATE lp_nonce SET dipakai = 1 WHERE nonce_sha = ?1 AND orang_id = ?2 AND dipakai = 0 AND dibuat <= ?3 + ?4 AND kedaluwarsa > ?3 AND (?5 = 0 OR kedaluwarsa - dibuat > ?6) RETURNING tantangan")
    .bind(await sha(d.nonce), o.id, tk, 5 * MENIT, d.luring ? 1 : 0, NONCE.umurMs).first();
  if (!nonce) return gagal(403, "nonce tidak berlaku (sudah dipakai, kedaluwarsa, atau bukan milikmu); minta nonce baru");
  if (await env.DB.prepare("SELECT 1 FROM lp_absen WHERE foto_sha256 = ?").bind(foto.sha).first()) return gagal(409, "foto ini sudah pernah dipakai; ambil foto baru");   // sesudah nonce: pemegang nonce tak sah tidak bisa menguji foto
  /* kemiripan wajah: kosinus tertinggi ke lima vektor terdaftar; versi model berbeda tidak dibandingkan */
  let skor = null;
  if (vek && o.wajah_status === "terdaftar" && d.versi_model === o.wajah_versi) {
    const {results} = await env.DB.prepare("SELECT vektor FROM orang_wajah WHERE orang_id = ?").bind(o.id).all();
    for (const r of results) { try { const k = kosinus(r.vektor, vek); skor = skor == null ? k : Math.max(skor, k); } catch (e) {} }
  }
  const jarak = Math.round(haversineM(akhir.lat, akhir.lon, t.lat, t.lon)), dalam = dalamRadius(jarak, t.radius_m, akhir.akurasi);
  /* batas klien (KEAMANAN-PRIVASI §3): jaringan lain dari absen sebelumnya dalam 12 jam, daftar ulang wajah, dan sampel acak dinilai di server */
  const ip = await ipHash(env, req);
  const [ipLalu, baru] = await env.DB.batch([
    env.DB.prepare("SELECT ip_hash FROM lp_absen WHERE orang_id = ? AND waktu > ? AND ip_hash IS NOT NULL ORDER BY waktu DESC LIMIT 1").bind(o.id, kini - JARINGAN_JENDELA_MS),
    env.DB.prepare("SELECT sisa FROM lp_wajah_baru WHERE orang_id = ?").bind(o.id)]);
  const jaringanBeda = !!ipLalu.results[0] && ipLalu.results[0].ip_hash !== ip, wajahBaru = (baru.results[0]?.sisa ?? 0) > 0;
  const peluang = env.SAMPEL_TINJAU != null && env.SAMPEL_TINJAU !== "" ? Number(env.SAMPEL_TINJAU) : SAMPEL_TINJAU;
  const sampelAcak = crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32 < peluang;
  const p = putusStatus({fotoSudahDipakai: false, nonceSah: true, gpsDitolak: false, wajahTerdaftar: skor != null, skorWajah: skor, tantanganLolos: d.tantangan_lolos, skorHidup: hidup, gpsCuriga: ket.length > 0, dalamRadius: dalam, jamHp, luring: d.luring, luringLama, jaringanBeda, wajahBaru, sampelAcak});
  const id = acak(8), kunci = `lapangan/absen/${id}.jpg`;
  await env.MEDIA.put(kunci, foto.b, {httpMetadata: {contentType: "image/jpeg"}});
  try {
    await env.DB.prepare(`INSERT INTO lp_absen (id, orang_id, tugas_id, jenis, tanggal, waktu, waktu_hp, selisih_detik, luring, lat, lon, akurasi, sampel, jarak_m, dalam_radius, gps_curiga, gps_ket, skor_wajah, tantangan, tantangan_lolos, skor_hidup, versi_model, foto_key, foto_sha256, status, alasan, ip_hash, dummy)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(id, o.id, t.id, d.jenis, tanggal, waktu, wh == null ? null : Math.round(wh), wh == null ? null : Math.round((wh - kini) / 1000), d.luring ? 1 : 0,
      akhir.lat, akhir.lon, akhir.akurasi, sampelJson, jarak, dalam ? 1 : 0, ket.length ? 1 : 0, ket.join("; ").slice(0, 600) || null, skor, nonce.tantangan, d.tantangan_lolos ? 1 : 0, hidup,
      typeof d.versi_model === "string" ? d.versi_model : null, kunci, foto.sha, p.status, JSON.stringify(p.alasan), ip, o.dummy ? 1 : 0).run();
  } catch (e) {
    await env.MEDIA.delete(kunci).catch(() => {});
    if (/UNIQUE/i.test(e?.message || "")) return gagal(409, "absen atau foto yang sama sudah tercatat");
    throw e;
  }
  if (wajahBaru) await env.DB.prepare("UPDATE lp_wajah_baru SET sisa = sisa - 1 WHERE orang_id = ? AND sisa > 0").bind(o.id).run();
  if (p.status === "lolos") await jamRelawan(env, o, {jenis: d.jenis, waktu, lat: akhir.lat, lon: akhir.lon});   // tinjau yang kemudian disahkan: dibuka/ditutup oleh peninjau (lapangan_panel.js)
  return json({id, status: p.status, alasan: p.alasan, waktu, jarak_m: jarak}, 201);
}

/* ---------------------------------------------------------------- logbook (LP-015, LP-033) */
const daftarTeks = (v, nama, sah) => {
  if (v == null) return {x: []};
  if (!Array.isArray(v) || v.length > sah.length) return {g: `${nama} harus larik maksimal ${sah.length} butir`};
  if (v.some(e => !sah.includes(e)) || new Set(v).size !== v.length) return {g: `${nama}: tiap butir harus salah satu dari ${sah.join(", ")} (tanpa duplikat)`};
  return {x: v};
};
function bacaKondisi(k) {
  if (k == null) return {x: {}};
  if (typeof k !== "object" || Array.isArray(k)) return {g: "kondisi harus objek"};
  const x = {};
  for (const [kunci, nilai] of Object.entries(k)) {
    if (nilai == null || nilai === "") continue;
    if (Object.hasOwn(KONDISI.enum, kunci)) { if (!KONDISI.enum[kunci].includes(nilai)) return {g: `kondisi.${kunci} harus ${KONDISI.enum[kunci].join(", ")}`}; x[kunci] = nilai; }
    else if (Object.hasOwn(KONDISI.angka, kunci)) { const [a, b] = KONDISI.angka[kunci], n = num(nilai, a, b, true); if (n == null || Number.isNaN(n)) return {g: `kondisi.${kunci} harus bilangan bulat ${a} sampai ${b}`}; x[kunci] = n; }
    else return {g: `kondisi.${String(kunci).slice(0, 30)} tidak dikenal`};
  }
  return {x};
}
/* LP-033: tugas api Ruang Instansi terdekat <= 1 km dari titik logbook (tabel tugas_api 0029; tanpa tabelnya = tidak ada tautan) */
async function tugasApiTerdekat(env, lat, lon) {
  try {
    const {results} = await env.DB.prepare("SELECT id, lat, lon FROM tugas_api WHERE lat BETWEEN ?1 AND ?2 AND lon BETWEEN ?3 AND ?4 LIMIT 50").bind(lat - 0.012, lat + 0.012, lon - 0.012, lon + 0.012).all();
    let t = null, m = 1001;
    for (const r of results) { const j = haversineM(lat, lon, r.lat, r.lon); if (j < m) { m = j; t = r; } }
    return t && m <= 1000 ? {id: t.id, jarak_m: Math.round(m)} : null;
  } catch (e) { if (/no such table/i.test(e?.message || "")) return null; throw e; }
}
async function logbook(env, req, kini) {
  const o = await petugas(env, req, kini); if (o instanceof Response) return o;
  const lj = await laju(env, o.id, "lapangan.logbook", [[JAM, 30]], kini); if (lj) return lj;
  const f = await bacaForm(req, BATAS_FOTO_LOGBOOK * M_FOTO + 128 * 1024); if (f.r) return f.r;
  const d = f.d, berkas = f.f.getAll("foto");
  if (typeof d.tugas_id !== "string" || !RE_ID.test(d.tugas_id)) return gagal(400, "tugas_id tidak sah");
  const msTgl = typeof d.tanggal === "string" && RE_TGL.test(d.tanggal) ? Date.parse(d.tanggal + "T00:00:00Z") : NaN;
  if (!Number.isFinite(msTgl) || tanggalWIB(msTgl) !== d.tanggal) return gagal(400, "tanggal harus YYYY-MM-DD yang sah");
  const kegiatan = d.kegiatan, uraian = tx(d.uraian, 2000), hasil = tx(d.hasil, 1000);
  if (!KEGIATAN.includes(kegiatan)) return gagal(400, `kegiatan harus salah satu dari ${KEGIATAN.join(", ")}`);
  if (uraian === undefined || hasil === undefined) return gagal(400, "uraian maksimal 2000 karakter dan hasil maksimal 1000");
  const kd = daftarTeks(d.kendala, "kendala", KENDALA), kb = daftarTeks(d.kebutuhan, "kebutuhan", KEBUTUHAN), kn = bacaKondisi(d.kondisi);
  for (const x of [kd, kb, kn]) if (x.g) return gagal(400, x.g);
  if (berkas.length > BATAS_FOTO_LOGBOOK) return gagal(400, `foto maksimal ${BATAS_FOTO_LOGBOOK}`);
  const meta = d.foto_meta ?? [];
  if (!Array.isArray(meta) || meta.length !== berkas.length) return gagal(400, "foto_meta harus berisi satu entri per foto");
  /* kunci hari: tanggal logbook harus hari ini WIB; sesudah 23.59 WIB terkunci (409), tanggal depan ditolak */
  const hari = tanggalWIB(kini);
  if (d.tanggal > hari) return gagal(400, "tanggal logbook tidak boleh di depan");
  if (d.tanggal < hari) return gagal(409, "logbook tanggal itu sudah terkunci (lewat 23.59 WIB)");
  const t = await env.DB.prepare("SELECT t.id, t.lat, t.lon, t.radius_m, t.mulai, t.selesai FROM lp_tugas t JOIN lp_anggota g ON g.tugas_id = t.id WHERE t.id = ? AND g.orang_id = ?").bind(d.tugas_id, o.id).first();
  if (!t) return gagal(404, "tugas tidak ditemukan");
  if (d.tanggal < tanggalWIB(t.mulai) || d.tanggal > tanggalWIB(t.selesai)) return gagal(409, "tanggal logbook di luar jadwal tugas ini");   // terverifikasi (label) bergantung pada ini
  const ada = await env.DB.prepare("SELECT id, (SELECT count(*) FROM lp_logbook_foto WHERE logbook_id = lp_logbook.id) n FROM lp_logbook WHERE orang_id = ? AND tugas_id = ? AND tanggal = ?").bind(o.id, t.id, d.tanggal).first();
  if ((ada?.n ?? 0) + berkas.length > BATAS_FOTO_LOGBOOK) return gagal(400, `total foto logbook maksimal ${BATAS_FOTO_LOGBOOK}`);
  if (berkas.length && !env.MEDIA) return gagal(503, "penyimpanan foto belum aktif (R2 MEDIA)");
  /* tiap foto: JPEG, geotag + waktu dari perangkat, aturan media yang ada (EXIF <= 5 km dari GPS dan <= 48 jam) */
  const fotos = [];
  for (const [i, file] of berkas.entries()) {
    const m = meta[i], nm = `foto ${i + 1}`;
    if (!m || typeof m !== "object") return gagal(400, `foto_meta ${i + 1} wajib`);
    const lat = num(m.lat, -11.5, 6.5), lon = num(m.lon, 94.5, 141.5), ak = num(m.akurasi, 0, 5000), w = num(m.waktu, kini - ATURAN_MEDIA.exifUmur, kini + 10 * MENIT);
    if ([lat, lon, ak, w].some(x => x == null || Number.isNaN(x))) return gagal(400, `${nm}: lat, lon (Indonesia), akurasi (maks 5000 m), dan waktu (48 jam terakhir) wajib`);
    let exifJarak = null;
    const eLat = num(m.exif_lat, -90, 90), eLon = num(m.exif_lon, -180, 180), eT = num(m.exif_waktu, 0, 4e12);
    if ([eLat, eLon, eT].some(Number.isNaN)) return gagal(400, `${nm}: exif tidak sah`);
    if (eLat != null && eLon != null) { exifJarak = Math.round(jarakM(lat, lon, eLat, eLon)); if (exifJarak > ATURAN_MEDIA.exifJarak) return gagal(400, `${nm} diambil ${(exifJarak / 1000).toFixed(1)} km dari posisi tercatat; unggah dari lokasi pengambilan`); }
    if (eT != null && eT <= kini + 10 * MENIT && kini - eT > ATURAN_MEDIA.exifUmur) return gagal(400, `${nm} diambil lebih dari 48 jam lalu`);
    const b = await bacaJpeg(file, nm); if (b instanceof Response) return b;
    if (fotos.some(x => x.sha === b.sha) || await env.DB.prepare("SELECT 1 FROM lp_logbook_foto WHERE sha256 = ?").bind(b.sha).first()) return gagal(409, `${nm} sudah pernah dipakai; ambil foto baru`);
    fotos.push({...b, id: acak(8), lat, lon, ak, w, exifJarak});
  }
  /* label (ALGORITMA §7): satu per jenis, lokasi = foto pertama atau titik tugas; api ditautkan ke tugas api terdekat <= 1 km */
  /* terverifikasi: foto bergeotag <= radius tugas + 200 m dari titik tugas, EXIF cocok (ada dan <= 5 km, sudah dijamin di atas), tanggal dalam jadwal (dijamin 409 di atas). Ekspor label hanya memakai terverifikasi = 1. */
  const fv = fotos.find(fo => fo.exifJarak != null && haversineM(fo.lat, fo.lon, t.lat, t.lon) <= t.radius_m + LABEL_TAMBAH_M), terverif = fv ? 1 : 0;
  const x = kn.x, f0 = fv ?? fotos[0], titik = f0 ? {lat: f0.lat, lon: f0.lon} : {lat: t.lat, lon: t.lon}, label = [];
  const sub = pilih => Object.fromEntries(pilih.filter(k => k in x).map(k => [k, x[k]]));
  if (KONDISI_API.some(k => k in x)) {
    const nilai = sub(KONDISI_API), ta = "kondisi_api" in x ? await tugasApiTerdekat(env, titik.lat, titik.lon) : null;
    if (ta) { nilai.tugas_api_id = ta.id; nilai.jarak_tugas_m = ta.jarak_m; }
    label.push(["api", nilai]);
  }
  if (KONDISI_BANJIR.some(k => k in x)) label.push(["banjir", sub(KONDISI_BANJIR)]);
  for (const fo of fotos) await env.MEDIA.put(`lapangan/logbook/${fo.id}.jpg`, fo.b, {httpMetadata: {contentType: "image/jpeg"}});
  const kunciLb = [o.id, t.id, d.tanggal], dariLb = "FROM lp_logbook WHERE orang_id = ? AND tugas_id = ? AND tanggal = ?";
  try {
    await env.DB.batch([
      env.DB.prepare(`INSERT INTO lp_logbook (id, orang_id, tugas_id, tanggal, kegiatan, uraian, hasil, kendala, kebutuhan, kondisi, waktu, diubah, terkunci, dummy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
        ON CONFLICT (orang_id, tugas_id, tanggal) DO UPDATE SET kegiatan = excluded.kegiatan, uraian = excluded.uraian, hasil = excluded.hasil, kendala = excluded.kendala, kebutuhan = excluded.kebutuhan, kondisi = excluded.kondisi, diubah = excluded.diubah`)
        .bind(acak(8), o.id, t.id, d.tanggal, kegiatan, uraian, hasil, JSON.stringify(kd.x), JSON.stringify(kb.x), JSON.stringify(x), kini, kini, o.dummy ? 1 : 0),
      ...fotos.map(fo => env.DB.prepare(`INSERT INTO lp_logbook_foto (id, logbook_id, foto_key, sha256, lat, lon, akurasi, waktu, exif_jarak, dummy) SELECT ?, id, ?, ?, ?, ?, ?, ?, ?, ? ${dariLb}`)
        .bind(fo.id, `lapangan/logbook/${fo.id}.jpg`, fo.sha, fo.lat, fo.lon, fo.ak, Math.round(fo.w), fo.exifJarak, o.dummy ? 1 : 0, ...kunciLb)),
      env.DB.prepare(`DELETE FROM lapangan_label WHERE sumber_id = (SELECT id ${dariLb})`).bind(...kunciLb),
      ...label.map(([jenis, nilai]) => env.DB.prepare(`INSERT INTO lapangan_label (id, sumber_id, jenis, nilai, lat, lon, waktu, dummy, terverifikasi) SELECT ?, id, ?, ?, ?, ?, ?, ?, ? ${dariLb}`)
        .bind(acak(8), jenis, JSON.stringify(nilai), titik.lat, titik.lon, kini, o.dummy ? 1 : 0, terverif, ...kunciLb)),
    ]);
  } catch (e) {
    await env.MEDIA?.delete(fotos.map(fo => `lapangan/logbook/${fo.id}.jpg`)).catch(() => {});
    if (/UNIQUE/i.test(e?.message || "")) return gagal(409, "foto atau logbook yang sama sudah tercatat");
    throw e;
  }
  const hasilLb = await env.DB.prepare(`SELECT id ${dariLb}`).bind(...kunciLb).first();
  return json({ok: true, id: hasilLb.id, tanggal: d.tanggal, terkunci: false, foto: (ada?.n ?? 0) + fotos.length, label: label.map(l => l[0]), tugas_api_id: label.find(l => l[0] === "api")?.[1].tugas_api_id ?? null}, ada ? 200 : 201);
}

/* ---------------------------------------------------------------- riwayat 14 hari dan foto */
async function riwayat(env, req, kini) {
  const o = await petugas(env, req, kini); if (o instanceof Response) return o;
  const dari = tanggalWIB(kini - 13 * HARI), hari = tanggalWIB(kini);
  const [a, l] = await env.DB.batch([
    env.DB.prepare("SELECT x.id, x.tugas_id, t.judul tugas, x.jenis, x.tanggal, x.waktu, x.status, x.alasan, x.jarak_m, x.luring FROM lp_absen x JOIN lp_tugas t ON t.id = x.tugas_id WHERE x.orang_id = ? AND x.tanggal >= ? ORDER BY x.waktu DESC LIMIT 100").bind(o.id, dari),
    env.DB.prepare("SELECT l.id, l.tugas_id, t.judul tugas, l.tanggal, l.kegiatan, l.hasil, l.terkunci, (SELECT count(*) FROM lp_logbook_foto WHERE logbook_id = l.id) foto FROM lp_logbook l JOIN lp_tugas t ON t.id = l.tugas_id WHERE l.orang_id = ? AND l.tanggal >= ? ORDER BY l.tanggal DESC, l.waktu DESC LIMIT 100").bind(o.id, dari)]);
  return json({dari, absen: a.results.map(x => ({...x, alasan: JSON.parse(x.alasan), luring: !!x.luring, foto_url: `/api/petugas/foto/${x.id}`})), logbook: l.results.map(x => ({...x, terkunci: !!x.terkunci || x.tanggal < hari}))});
}
/* foto absen atau logbook: pemilik (x-kode) atau peninjau panel; selain itu 404 (tidak membedakan ada/tidak ada) */
async function fotoBaca(env, req, url, kini, ctx, id) {
  if (!env.MEDIA) return gagal(503, "penyimpanan foto belum aktif (R2 MEDIA)");
  let o = null;
  if (req.headers.get("x-kode")) { o = await petugas(env, req, kini); if (o instanceof Response) return o; }
  else if (!await penjaga(env, req)) return gagal(401, "butuh kode pribadi atau akses panel");
  const r = await env.DB.prepare(`SELECT x.foto_key k, x.orang_id, x.tugas_id, p.prov FROM lp_absen x JOIN orang p ON p.id = x.orang_id WHERE x.id = ?1 UNION ALL
    SELECT f.foto_key, l.orang_id, l.tugas_id, p.prov FROM lp_logbook_foto f JOIN lp_logbook l ON l.id = f.logbook_id JOIN orang p ON p.id = l.orang_id WHERE f.id = ?1`).bind(id).first();
  /* pemilik, peninjau panel, atau ketua regu tugas itu (peran 'ketua' di lp_anggota): ketua meninjau absen anggotanya dari antrean tinjauan */
  const ketua = r && o && r.orang_id !== o.id && !!await env.DB.prepare("SELECT 1 FROM lp_anggota WHERE tugas_id = ? AND orang_id = ? AND peran = 'ketua'").bind(r.tugas_id, o.id).first();
  if (!r || (o ? r.orang_id !== o.id && !ketua : !dalamWilayahStaf(req, [r.prov]))) return gagal(404, "foto tidak ada");
  const berkas = await env.MEDIA.get(r.k);
  return berkas ? kirimJpeg(berkas) : gagal(404, "foto tidak ada");
}

/* ================================================================ dummy (Super Admin) */
/* tahap B dulu (anak sebelum induk), lalu 0095; semua tabel dummy=1 */
const hapusDummyStmt = env => ["DELETE FROM lapangan_label WHERE dummy = 1", "DELETE FROM lp_logbook_foto WHERE dummy = 1", "DELETE FROM lp_logbook WHERE dummy = 1", "DELETE FROM lp_absen WHERE dummy = 1",
  "DELETE FROM lp_nonce WHERE orang_id IN (SELECT id FROM orang WHERE dummy = 1)", "DELETE FROM lp_wajah_baru WHERE orang_id IN (SELECT id FROM orang WHERE dummy = 1)", "DELETE FROM lp_anggota WHERE tugas_id IN (SELECT id FROM lp_tugas WHERE dummy = 1)", "DELETE FROM lp_tugas WHERE dummy = 1",
  "DELETE FROM orang_wajah WHERE orang_id IN (SELECT id FROM orang WHERE dummy = 1)", "DELETE FROM orang_setuju WHERE orang_id IN (SELECT id FROM orang WHERE dummy = 1)",
  "DELETE FROM wa_antre WHERE dummy = 1", "DELETE FROM orang WHERE dummy = 1"].map(s => env.DB.prepare(s));
/* berkas R2 milik baris dummy (foto kecil sah supaya kartu panel tidak kosong); dibuang sebelum barisnya */
const JPEG_DUMMY = Uint8Array.from(atob("/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA="), c => c.charCodeAt(0));
async function buangBerkasDummy(env) {
  if (!env.MEDIA) return;
  const {results} = await env.DB.prepare("SELECT foto_key k FROM lp_absen WHERE dummy = 1 UNION ALL SELECT foto_key FROM lp_logbook_foto WHERE dummy = 1").all();
  for (let i = 0; i < results.length; i += 100) await env.MEDIA.delete(results.slice(i, i + 100).map(r => r.k));
}
/* Dummy tahap B (DUMMY.md): satu tugas + tiga orang, absen di tiap ember status (lolos, tinjau, sah, tolak, luring), logbook + foto + label, jadi tiap kartu panel bukan nol:
   hadir (Rina lolos hari ini), belum_absen (Agus), belum_logbook (Agus, Sari), tinjau (Sari hari ini). Rina hari ini + kemarin, Agus/Sari kemarin untuk ember sisanya. */
async function dummyTahapB(env, [rina, agus, sari], kini) {
  const kunciDummy = [], hari = tanggalWIB(kini), a0 = awalHariWIB(hari), kemarin = tanggalWIB(a0 - 1), tg = acak(8), st = [];
  const titik = {lat: -0.0579, lon: 116.4225};
  st.push(env.DB.prepare("INSERT INTO lp_tugas (id, judul, bencana, lat, lon, radius_m, wilayah_teks, renlap_url, mulai, selesai, ketua_id, dibuat_oleh, dibuat, dummy) VALUES (?, 'Contoh: Patroli karhutla Kenohan', 'karhutla', ?, ?, 2000, 'Kec. Kenohan, Kab. Kutai Kartanegara', 'https://centurisk97.id/renlap/contoh', ?, ?, ?, 'dummy', ?, 1)")
    .bind(tg, titik.lat, titik.lon, a0 - 3 * 86400e3, a0 + 5 * 86400e3, rina, kini));
  for (const [o, peran] of [[rina, "ketua"], [agus, "anggota"], [sari, "anggota"]]) st.push(env.DB.prepare("INSERT INTO lp_anggota (tugas_id, orang_id, peran) VALUES (?, ?, ?)").bind(tg, o, peran));
  const lalu = m => Math.max(a0, kini - m * 60e3);
  const baris = [
    /* orang, jenis, waktu, status, alasan, skor, jarak, luring, catatan */
    [rina, "masuk", lalu(25), "lolos", [], 0.82, 180, 0, null],
    [sari, "masuk", lalu(12), "tinjau", ["wajah_belum_daftar", "luar_radius"], null, 3500, 0, null],
    [rina, "masuk", a0 - 16 * 3600e3, "sah", [], 0.52, 240, 0, "Disahkan: wajah tertutup helm (contoh)"],
    [rina, "pulang", a0 - 8 * 3600e3, "lolos", [], 0.79, 150, 0, null],
    [agus, "masuk", a0 - 15 * 3600e3, "tolak", ["wajah_berbeda", "gps_curiga"], 0.21, 9800, 0, "Wajah dan lokasi tidak sesuai tugas (contoh)"],
    [sari, "masuk", a0 - 16 * 3600e3, "lolos", [], 0.74, 320, 1, null],
  ];
  for (const [orang, jenis, waktu, status, alasan, skor, jarak, luring, catatan] of baris) {
    const id = acak(8), kunci = `lapangan/absen/${id}.jpg`; kunciDummy.push(kunci);
    const w = Math.round(waktu), tinjau = status === "sah" || status === "tolak";
    st.push(env.DB.prepare(`INSERT INTO lp_absen (id, orang_id, tugas_id, jenis, tanggal, waktu, waktu_hp, selisih_detik, luring, lat, lon, akurasi, jarak_m, dalam_radius, gps_curiga, skor_wajah, tantangan, tantangan_lolos, skor_hidup, versi_model, foto_key, foto_sha256, status, alasan, peninjau, waktu_tinjau, catatan, dummy)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, 12, ?, ?, ?, ?, 'kedip', 1, 0.9, 'contoh-1', ?, ?, ?, ?, ?, ?, ?, 1)`)
      .bind(id, orang, tg, jenis, tanggalWIB(w), w, w, luring, titik.lat + 0.0008, titik.lon + 0.0006, jarak, jarak <= 2000 ? 1 : 0, alasan.includes("gps_curiga") ? 1 : 0, skor, kunci, hex64(id), status, JSON.stringify(alasan), tinjau ? "dummy" : null, tinjau ? w + 600e3 : null, catatan));
  }
  /* logbook: Rina hari ini (api, ditautkan ke foto dummy), Agus kemarin (banjir, terkunci) */
  const lb = [[acak(8), rina, hari, "pemadaman", "Titik panas dicek, bara di gambut dipadamkan dengan selang.", "Bara padam, asap berkurang.", ["air_jauh"], ["selang_pompa"], {kondisi_api: "bara", tebal_gambut_cm: 120, jarak_air_m: 300, akses: "motor"}, 0],
    [acak(8), agus, kemarin, "pemantauan", "Pengukuran tinggi genangan di dua titik.", "Genangan 35 cm di jalan desa.", [], ["transport"], {tinggi_genangan_cm: 35, hujan_lokal: "lebat"}, 1]];
  for (const [id, orang, tgl, kegiatan, uraian, hasil, kendala, kebutuhan, kondisi, terkunci] of lb) {
    st.push(env.DB.prepare("INSERT INTO lp_logbook (id, orang_id, tugas_id, tanggal, kegiatan, uraian, hasil, kendala, kebutuhan, kondisi, waktu, diubah, terkunci, dummy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)")
      .bind(id, orang, tg, tgl, kegiatan, uraian, hasil, JSON.stringify(kendala), JSON.stringify(kebutuhan), JSON.stringify(kondisi), kini - 3600e3, kini - 3600e3, terkunci));
    const jenis = "kondisi_api" in kondisi ? "api" : "banjir";
    st.push(env.DB.prepare("INSERT INTO lapangan_label (id, sumber_id, jenis, nilai, lat, lon, waktu, dummy) VALUES (?, ?, ?, ?, ?, ?, ?, 1)").bind(acak(8), id, jenis, JSON.stringify(kondisi), titik.lat, titik.lon, kini - 3600e3));
    const fid = acak(8), kunci = `lapangan/logbook/${fid}.jpg`; kunciDummy.push(kunci);
    st.push(env.DB.prepare("INSERT INTO lp_logbook_foto (id, logbook_id, foto_key, sha256, lat, lon, akurasi, waktu, exif_jarak, dummy) VALUES (?, ?, ?, ?, ?, ?, 10, ?, NULL, 1)").bind(fid, id, kunci, hex64(fid), titik.lat, titik.lon, kini - 3600e3));
  }
  return {st, kunciDummy};
}
/* sha256 palsu 64 heks yang unik per id dummy (kolom UNIQUE); bukan hash berkas sungguhan */
const hex64 = id => (id + id + id + id).slice(0, 64);

/* [jenis, nama, nip, unit, jabatan, wajah_status, riwayat persetujuan (lama ke baru)] */
const DUMMY = [
  ["pegawai", "Rina Wulandari (contoh)", "999900000000000001", "Pusdalops PB", "Analis Pusdalops", "terdaftar", [1]],
  ["pegawai", "Agus Prasetyo (contoh)", "999900000000000002", "Direktorat Sistem Penanggulangan Bencana", "Staf Direktorat", "belum", []],
  ["relawan", "Sari Lestari (contoh)", null, null, null, "dihapus", [1, 0]],
];
async function buatDummy(env, req, kini) {
  if (!await superOK(env, req)) return gagal(403, "isi data contoh hanya untuk Super Admin");
  const baris = [], kodeSatu = [], ids = [];
  for (const [i, [jenis, nama, nip, unit, jabatan, wajah, setujuRiwayat]] of DUMMY.entries()) {
    const id = acak(8), k = await kodeBaru(); ids.push(id); if (!i) kodeSatu.push(k.kode);
    baris.push(env.DB.prepare("INSERT INTO orang (id, jenis, nama, nip, unit, jabatan, wa, prov, kab, status, kode_sha, wajah_status, wajah_versi, dibuat, diubah, dummy) VALUES (?, ?, ?, ?, ?, ?, NULL, '62', 'Contoh', 'aktif', ?, ?, ?, ?, ?, 1)")
      .bind(id, jenis, nama, nip, unit, jabatan, k.kode_sha, wajah, wajah === "terdaftar" ? "contoh-1" : null, kini, kini));
    if (wajah === "terdaftar") for (const arah of ["depan", "kiri", "kanan", "atas", "bawah"])
      baris.push(env.DB.prepare("INSERT INTO orang_wajah (orang_id, arah, vektor, versi, mutu, dibuat) VALUES (?, ?, 'AACAPwAAAAA=', 'contoh-1', 0.9, ?)").bind(id, arah, kini));
    setujuRiwayat.forEach((s, j) => baris.push(env.DB.prepare("INSERT INTO orang_setuju (id, orang_id, versi_teks, setuju, waktu, ip_hash) VALUES (?, ?, ?, ?, ?, NULL)").bind(acak(8), id, VERSI_SETUJU, s, kini - (setujuRiwayat.length - j) * 1000)));
  }
  await buangBerkasDummy(env);
  const b = await dummyTahapB(env, ids, kini);
  await env.DB.batch([...hapusDummyStmt(env), ...baris, ...b.st]);
  if (env.MEDIA) for (const k of b.kunciDummy) await env.MEDIA.put(k, JPEG_DUMMY, {httpMetadata: {contentType: "image/jpeg"}});
  return json({kode: kodeSatu[0], n: DUMMY.length}, 201);
}
async function hapusDummy(env, req) {
  if (!await superOK(env, req)) return gagal(403, "hapus data contoh hanya untuk Super Admin");
  const n = (await env.DB.prepare("SELECT count(*) n FROM orang WHERE dummy = 1").first()).n;
  await buangBerkasDummy(env);
  await env.DB.batch(hapusDummyStmt(env));
  return json({ok: true, n});
}

/* rute digabung ke RUTE di src/worker.js */
export const RUTE_LAPANGAN = jaga({
  "GET /api/petugas/konst": (env, req, url, kini, ctx) => cacheTepi(new Request(new URL("/api/petugas/konst", url), {method: "GET"}), ctx, 3600, async () => json(KONST_PUBLIK)),
  /* jalur /api/petugas/*: /api/petugas/saya dan halaman /lapangan milik regu Posko lama (src/posko.js), jadi modul ini memakai awalan sendiri */
  "GET /api/petugas/saya": (env, req, url, kini) => saya(env, req, kini),
  "POST /api/petugas/setuju": (env, req, url, kini) => pb(req) ?? setuju(env, req, kini),
  "POST /api/petugas/wajah": (env, req, url, kini) => pb(req) ?? wajahDaftar(env, req, kini),
  "DELETE /api/petugas/wajah": (env, req, url, kini) => pb(req) ?? wajahHapus(env, req, kini),
  "POST /api/petugas/nonce": (env, req, url, kini) => pb(req) ?? nonceBaru(env, req, kini),
  "POST /api/petugas/absen": (env, req, url, kini) => pb(req) ?? absen(env, req, kini),
  "POST /api/petugas/logbook": (env, req, url, kini) => pb(req) ?? logbook(env, req, kini),
  "GET /api/petugas/riwayat": (env, req, url, kini) => riwayat(env, req, kini),
  "GET /api/petugas/foto/:id": fotoBaca,
  "POST /api/petugas/dummy": (env, req, url, kini) => pb(req) ?? buatDummy(env, req, kini),
  "DELETE /api/petugas/dummy": (env, req) => pb(req) ?? hapusDummy(env, req),
  ...RUTE_LAPANGAN_PANEL,
});
