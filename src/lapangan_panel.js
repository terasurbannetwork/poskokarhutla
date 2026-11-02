/* Modul Pegawai dan Relawan Lapangan, sisi pimpinan, tahap A (data/kajian-bnpb/lapangan/DESAIN-TEKNIS.md §2 dan §4, ALUR A1):
   impor CSV induk pegawai (pratinjau lalu simpan), daftar orang, kirim tautan pribadi lewat antrean WA.
   Skema: migrations/0095_lapangan_orang.sql. Rute digabung ke RUTE lewat src/lapangan.js (RUTE_LAPANGAN).
   Penjaga: moderator ke atas (modOK, bukan akun gerbang situs) atau staf berperan pimpinan/koordalops; impor = Super Admin saja.
   Daftar orang TIDAK memuat wa/email mentah, dan vektor wajah tidak pernah keluar dari Worker.
   ponytail: satu impor memuat paling banyak 5000 baris dan kueri dikelompokkan per batch D1; di Workers Free (CPU 10 ms) impor sebesar itu butuh paket berbayar, pecah per unit bila terpotong. */
import {gagal, json, acak, bacaBody, normalWA, adminOK, sha} from "./worker.js";
import {superOK, modOK, tx, num, RE_EMAIL, uraiCsvKontak} from "./posko.js";
import {modAtauStaf, dalamWilayahStaf, wilayahStaf} from "./staf.js";
import {laju, lajuIP, kodeBaru} from "./bnpb.js";
import {JENIS_ORANG, RADIUS_BAWAAN_M, RETENSI_FOTO_MS, tanggalWIB, awalHariWIB} from "./lapangan_konst.js";
import {RUTE_GATEWAY_WA, panggilBuat, panggilDaftar, antrePenugasan, tugasTerlihat} from "./lapangan_wa.js";
import {petugas} from "./lapangan.js";   // impor melingkar aman: hanya dipanggil saat permintaan, bukan saat modul dimuat

const JAM = 3600e3;
export const PERAN_PANEL = ["pimpinan", "koordalops"];
export const TAUTAN_DASAR = "https://centurisk97.id/petugas#k=";
const MAKS_BARIS = 5000, MAKS_CSV = 1_500_000, HALAMAN = 50;
const KOLOM_CSV = ["nama", "nip", "unit", "jabatan", "wa", "email", "prov", "kab"];

/* wilayah staf mencakup SEMUA provinsi yang disebut (dalamWilayahStaf lama cukup satu: tidak cukup untuk tulis lintas orang). Staf nasional/admin: selalu boleh. */
const semuaDalamWilayah = (req, provs) => { const w = wilayahStaf(req); return !w.length || provs.every(p => w.includes(p)); };

/* semua rute tulis modul: header x-pb: 1 (anti-CSRF, pola src/instansi.js); tabel 0095 belum ada = 503 yang jelas */
export const pb = req => req.headers.get("x-pb") === "1" ? null : gagal(403, "kiriman wajib membawa header x-pb: 1 (dikirim otomatis oleh halaman)");
export const jaga = rute => Object.fromEntries(Object.entries(rute).map(([k, f]) => [k, async (...a) => {
  try { return await f(...a); }
  catch (e) { if (/no such table/i.test(e?.message || "")) return gagal(503, "modul lapangan belum aktif (migrasi 0095, 0097 atau 0101 belum diterapkan)"); throw e; }
}]));
export const tolakPanel = () => gagal(403, "akses ditolak: hanya pimpinan, koordinator Pusdalops, atau moderator");
export const penjaga = (env, req) => modAtauStaf(env, req, PERAN_PANEL);
/* lingkup baca tinjauan/ringkasan: staf/moderator = {staf: true}; ketua regu (x-kode, peran 'ketua' di lp_anggota) = {tugas: [id]} terbatas pada tugasnya; selain itu Response 401/403 */
async function lingkup(env, req, kini) {
  if (await penjaga(env, req)) return {staf: true};
  if (!req.headers.get("x-kode")) return tolakPanel();
  const o = await petugas(env, req, kini); if (o instanceof Response) return o;
  const {results} = await env.DB.prepare("SELECT tugas_id FROM lp_anggota WHERE orang_id = ? AND peran = 'ketua'").bind(o.id).all();
  return results.length ? {tugas: results.map(x => x.tugas_id)} : tolakPanel();
}

/* ================================================================ impor CSV induk */
const RUMUS = /^[\t\r]|^\s*[=+\-@]/;   // sel CSV yang diawali ini dibaca Excel sebagai rumus saat berkas diekspor ulang
function cekBaris(r) {
  if ([r.nama, r.unit, r.jabatan].some(v => RUMUS.test(String(v ?? "")))) return {galat: "nama, unit, dan jabatan tidak boleh diawali = + - @ atau tab (dibaca Excel sebagai rumus)"};
  const nama = tx(r.nama, 120);
  if (!nama || nama.length < 2) return {galat: "nama wajib, 2 sampai 120 karakter"};
  const nip = String(r.nip ?? "").replace(/[\s.\-]/g, "");
  if (!/^\d{18}$/.test(nip)) return {galat: "nip harus 18 angka (tanpa notasi ilmiah Excel)"};
  const unit = tx(r.unit, 120), jabatan = tx(r.jabatan, 120);
  if (unit === undefined || jabatan === undefined) return {galat: "unit dan jabatan maksimal 120 karakter"};
  const waMentah = tx(r.wa, 30);
  if (waMentah === undefined) return {galat: "wa terlalu panjang"};
  const wa = waMentah ? normalWA(waMentah) : null;
  if (waMentah && !wa) return {galat: `wa '${waMentah}' tidak sah (contoh 0812xxxxxxx)`};
  const email = tx(r.email, 254)?.toLowerCase() ?? null;
  if (email === undefined || (email && !RE_EMAIL.test(email))) return {galat: "email tidak sah"};
  const prov = tx(r.prov, 2), kab = tx(r.kab, 60);
  if (prov === undefined || (prov && !/^\d{2}$/.test(prov))) return {galat: "prov harus kode 2 angka"};
  if (kab === undefined) return {galat: "kab maksimal 60 karakter"};
  return {v: {nama, nip, unit, jabatan, wa, email, prov, kab}};
}
const SAMA = ["nama", "unit", "jabatan", "wa", "email", "prov", "kab"];
const dalamBagian = (larik, n = 90) => Array.from({length: Math.ceil(larik.length / n)}, (_, i) => larik.slice(i * n, i * n + n));

async function impor(env, req, kini) {
  const mod = await superOK(env, req); if (!mod) return gagal(403, "impor induk pegawai hanya untuk Super Admin");
  const lj = await laju(env, mod, "lapangan.impor", [[JAM, 30]], kini); if (lj) return lj;
  const b = await bacaBody(req, MAKS_CSV + 1024); if (b.galat) return gagal(b.status || 400, b.galat);
  if (b.o.mode !== "pratinjau" && b.o.mode !== "simpan") return gagal(400, "mode harus pratinjau atau simpan");
  if (typeof b.o.csv !== "string" || !b.o.csv.trim()) return gagal(400, "csv wajib (teks CSV dengan baris kepala)");
  if (b.o.csv.length > MAKS_CSV) return gagal(413, `csv ${b.o.csv.length} karakter, maksimal ${MAKS_CSV}`);
  const [kepala, ...isi] = uraiCsvKontak(b.o.csv), kol = (kepala || []).map(x => x.trim().toLowerCase());
  if (!kol.includes("nama") || !kol.includes("nip")) return gagal(400, "baris kepala wajib memuat nama dan nip");
  const asing = kol.filter(k => !KOLOM_CSV.includes(k));
  if (asing.length) return gagal(400, `kolom tidak dikenal: ${asing.join(", ")} (boleh: ${KOLOM_CSV.join(", ")})`);
  if (!isi.length) return gagal(400, "csv tidak punya baris data");
  if (isi.length > MAKS_BARIS) return gagal(413, `${isi.length} baris; maksimal ${MAKS_BARIS} per impor`);

  const ditolak = [], ok = [], lihat = new Map();
  isi.forEach((r, i) => {
    const baris = i + 2, c = cekBaris(Object.fromEntries(kol.map((k, j) => [k, r[j] ?? ""])));
    if (c.galat) return ditolak.push({baris, alasan: c.galat});
    if (lihat.has(c.v.nip)) return ditolak.push({baris, alasan: `nip ganda di berkas (sama dengan baris ${lihat.get(c.v.nip)})`});
    lihat.set(c.v.nip, baris); ok.push({baris, ...c.v});
  });

  const nips = ok.map(r => r.nip), ada = new Map(), staf = new Map();
  if (nips.length) {
    const hasil = await env.DB.batch(dalamBagian(nips).flatMap(g => [
      env.DB.prepare(`SELECT id, nip, nama, unit, jabatan, wa, email, prov, kab FROM orang WHERE nip IN (${g.map(() => "?").join(",")})`).bind(...g),
      env.DB.prepare(`SELECT id, nip FROM staf WHERE nip IN (${g.map(() => "?").join(",")})`).bind(...g)]));
    hasil.forEach((h, i) => h.results.forEach(x => (i % 2 ? staf : ada).set(x.nip, x)));
  }
  let baru = 0, berubah = 0, sama = 0;
  const stmt = [], contoh = [];
  for (const r of ok) {
    const lama = ada.get(r.nip), sf = staf.get(r.nip)?.id ?? null;
    const status = !lama ? "baru" : SAMA.every(k => (lama[k] ?? null) === (r[k] ?? null)) ? "sama" : "berubah";
    if (status === "baru") baru++; else if (status === "berubah") berubah++; else sama++;
    if (contoh.length < 10) contoh.push({baris: r.baris, status, nama: r.nama, nip: r.nip, unit: r.unit, jabatan: r.jabatan, ada_wa: !!r.wa});
    if (b.o.mode !== "simpan" || status === "sama") continue;
    if (status === "baru") {
      const {kode_sha} = await kodeBaru();   // kode asli dibuang: tautan diterbitkan nanti lewat POST /panel/tautan/:id (kode baru)
      stmt.push(env.DB.prepare("INSERT INTO orang (id, jenis, staf_id, nama, nip, unit, jabatan, wa, email, prov, kab, status, kode_sha, wajah_status, dibuat, diubah, dummy) VALUES (?, 'pegawai', ?, ?, ?, ?, ?, ?, ?, ?, ?, 'aktif', ?, 'belum', ?, ?, 0)")
        .bind(acak(8), sf, r.nama, r.nip, r.unit, r.jabatan, r.wa, r.email, r.prov, r.kab, kode_sha, kini, kini));
    } else {
      stmt.push(env.DB.prepare("UPDATE orang SET nama = ?, unit = ?, jabatan = ?, wa = ?, email = ?, prov = ?, kab = ?, staf_id = coalesce(staf_id, ?), diubah = ? WHERE id = ?")
        .bind(r.nama, r.unit, r.jabatan, r.wa, r.email, r.prov, r.kab, sf, kini, lama.id));
    }
  }
  if (stmt.length) {
    /* ponytail: satu env.DB.batch bersifat atomik tetapi D1 membatasi jumlah pernyataan per batch (50 di Free, 1000 berbayar) dan CPU per panggilan, jadi 5000 baris tidak muat;
       dipecah 200 per batch. Batch yang sudah jalan tidak ditarik kembali, maka kegagalan di tengah melaporkan jumlah baris yang sudah tersimpan; mengulang aman karena baris yang sudah masuk jadi 'sama'. */
    let tersimpan = 0;
    try { for (const g of dalamBagian(stmt, 200)) { await env.DB.batch(g); tersimpan += g.length; } }
    catch (e) {
      const sebagian = tersimpan ? ` ${tersimpan} dari ${stmt.length} baris SUDAH tersimpan; sisanya belum.` : " Belum ada baris yang tersimpan.";
      if (/UNIQUE/i.test(e?.message)) return gagal(409, `impor lain berjalan bersamaan atau nip sudah dipakai.${sebagian} Ulangi pratinjau lalu simpan.`);
      console.error("lapangan.impor", JSON.stringify({tersimpan, total: stmt.length, galat: String(e?.message).slice(0, 120)}));
      return gagal(500, `impor terhenti.${sebagian} Ulangi pratinjau lalu simpan.`);
    }
  }
  if (b.o.mode === "simpan") console.log("lapangan.impor", JSON.stringify({oleh: mod, waktu: kini, baru, berubah, sama, ditolak: ditolak.length}));   // jejak audit: tanpa isi baris
  return json({mode: b.o.mode, baru, berubah, sama, ditolak, contoh});
}

/* ================================================================ daftar orang */
async function daftarOrang(env, req, url) {
  if (!await penjaga(env, req)) return tolakPanel();
  const cari = tx(url.searchParams.get("cari"), 80), jenis = url.searchParams.get("jenis") || "";
  if (cari === undefined) return gagal(400, "cari maksimal 80 karakter");
  if (jenis && !JENIS_ORANG.includes(jenis)) return gagal(400, `jenis harus ${JENIS_ORANG.join(" atau ")}`);
  const hal = Math.min(Math.max(parseInt(url.searchParams.get("halaman"), 10) || 1, 1), 10000);
  const w = [], p = [], wil = wilayahStaf(req);   // staf berwilayah hanya melihat orang di provinsinya; admin dan staf nasional bebas
  if (wil.length) { w.push(`prov IN (${wil.map((_, i) => "?" + (i + 1)).join(",")})`); p.push(...wil); }
  if (cari) { w.push(`(nama LIKE ?${p.length + 1} ESCAPE '\\' OR nip LIKE ?${p.length + 1} ESCAPE '\\' OR unit LIKE ?${p.length + 1} ESCAPE '\\')`); p.push(`%${cari.replace(/[\\%_]/g, "\\$&")}%`); }
  if (jenis) { w.push(`jenis = ?${p.length + 1}`); p.push(jenis); }
  const where = w.length ? "WHERE " + w.join(" AND ") : "";
  const [n, h] = await env.DB.batch([
    env.DB.prepare(`SELECT count(*) n FROM orang ${where}`).bind(...p),
    env.DB.prepare(`SELECT id, nama, nip, unit, jabatan, jenis, wajah_status, wa IS NOT NULL ada_wa FROM orang ${where} ORDER BY nama, id LIMIT ${HALAMAN} OFFSET ${(hal - 1) * HALAMAN}`).bind(...p)]);
  return json({total: n.results[0].n, halaman: hal, ukuran_halaman: HALAMAN, baris: h.results.map(x => ({...x, ada_wa: !!x.ada_wa}))});
}

/* ================================================================ tautan pribadi */
async function tautan(env, req, url, kini, ctx, id) {
  const mod = await penjaga(env, req); if (!mod) return tolakPanel();
  const lj = await laju(env, mod, "lapangan.tautan", [[JAM, 120]], kini); if (lj) return lj;
  const o = await env.DB.prepare("SELECT id, nama, wa, status, relawan_id, prov FROM orang WHERE id = ?").bind(id).first();
  if (!o || !dalamWilayahStaf(req, [o.prov])) return gagal(404, "orang tidak ditemukan");
  if (o.status !== "aktif") return gagal(409, "orang ini nonaktif");
  if (await env.DB.prepare("SELECT 1 FROM regu WHERE id = ?").bind(o.id).first()) return gagal(409, "orang ini berasal dari kode regu Posko; tautan pribadi tidak berlaku, kelola kodenya di /api/posko");
  /* kode hanya dilihat admin (modOK): staf pimpinan/koordalops cukup mengantrekan ke WA orangnya, jadi tak pernah memegang kode pribadi orang lain */
  const admin = !!await modOK(env, req);
  if (!admin && !o.wa) return gagal(409, "WA kosong; minta admin menyalin tautan");
  const {kode, kode_sha} = await kodeBaru(), antre = !!o.wa;
  const url_ = TAUTAN_DASAR + kode;
  await env.DB.batch([
    /* relawan: SATU kode untuk /relawan dan /lapangan (ALUR A2), jadi yang diganti kode relawan-nya; kode di baris orang dikosongkan */
    ...(o.relawan_id ? [env.DB.prepare("UPDATE relawan SET kode_sha = ?, diubah = ? WHERE id = ? AND anonim = 0").bind(kode_sha, kini, o.relawan_id),
      env.DB.prepare("UPDATE orang SET kode_sha = NULL, diubah = ? WHERE id = ?").bind(kini, o.id)]
      : [env.DB.prepare("UPDATE orang SET kode_sha = ?, diubah = ? WHERE id = ?").bind(kode_sha, kini, o.id)]),
    env.DB.prepare("DELETE FROM wa_antre WHERE rujukan = ? AND jenis = 'tautan' AND status = 'antre'").bind(o.id),   // pesan lama memuat kode yang sudah tidak berlaku
    ...(antre ? [env.DB.prepare("INSERT INTO wa_antre (id, tujuan, pesan, jenis, rujukan, status, percobaan, dibuat, dummy) VALUES (?, ?, ?, 'tautan', ?, 'antre', 0, ?, 0)")
      .bind(acak(8), o.wa, `Tautan Lapangan BNPB untuk ${o.nama}: ${url_}`, o.id, kini)] : []),
  ]);
  console.log("lapangan.tautan", JSON.stringify({oleh: mod, orang: o.id, waktu: kini, antre, tampil_kode: admin}));   // jejak audit: tanpa kode dan tanpa nomor WA
  return json(admin ? {ok: true, antre, tautan: url_} : {ok: true, antre});
}


/* ================================================================ tahap B: jam relawan, ringkasan, tinjauan, tugas, acuan */
const MENIT = 60e3, HARI = 24 * JAM, MAKS_SESI_MENIT = 960, RE_ID = /^[0-9a-f]{16}$/;
const tanda = n => Array.from({length: n}, (_, i) => "?" + (i + 1));
/* saringan wilayah staf pada kolom prov; kembalian {sql, p} dengan parameter bernomor mulai dari `dari` */
/* batas data per lingkup: staf = provinsi wilayahnya; ketua = tugasnya (kolomTugas, atau semua anggota tugasnya bila kolomTugas null). Parameter ketua memakai SATU nomor ?dari. */
const sqlBatas = (l, req, kolom, kolomTugas, dari) => !l.tugas ? sqlProv(req, kolom, dari)
  : {sql: ` AND ${kolomTugas ?? "o.id"} IN (SELECT ${kolomTugas ? "value" : "orang_id FROM lp_anggota WHERE tugas_id IN (SELECT value"} FROM json_each(?${dari})${kolomTugas ? "" : ")"})`, p: [JSON.stringify(l.tugas)]};
const sqlProv = (req, kolom, dari) => { const w = wilayahStaf(req); return w.length ? {sql: ` AND ${kolom} IN (${w.map((_, i) => "?" + (dari + i)).join(",")})`, p: w} : {sql: "", p: []}; };

/* Absen relawan yang lolos/sah membuka (masuk) atau menutup (pulang) sesi relawan_jam (U-12): memakai tabel dan batas relawan.js (satu sesi terbuka, maks 960 menit).
   Penugasan relawan_penugasan berstatus diterima/bertugas diperlukan (relawan_jam.penugasan_id wajib); tanpa itu tidak ada sesi jam dan absen tetap tercatat.
   Kembalian 'dibuka' | 'ditutup' | null. Galat tabel/UNIQUE ditelan: absen sudah tercatat dan tidak boleh gagal karenanya. */
export async function jamRelawan(env, o, a) {
  if (!o.relawan_id) return null;
  try {
    if (a.jenis === "masuk") {
      const g = await env.DB.prepare("SELECT id FROM relawan_penugasan WHERE relawan_id = ? AND status IN ('diterima', 'bertugas') ORDER BY diubah DESC LIMIT 1").bind(o.relawan_id).first();
      if (!g) return null;
      const [x] = await env.DB.batch([
        env.DB.prepare("INSERT OR IGNORE INTO relawan_jam (id, relawan_id, penugasan_id, masuk, lat, lon, sah, oleh, dummy) VALUES (?, ?, ?, ?, ?, ?, 1, 'lapangan', ?)").bind(acak(8), o.relawan_id, g.id, a.waktu, a.lat, a.lon, o.dummy ? 1 : 0),
        env.DB.prepare("UPDATE relawan_penugasan SET status = 'bertugas', diubah = ? WHERE id = ? AND status = 'diterima'").bind(a.waktu, g.id),
        env.DB.prepare("UPDATE relawan SET status = 'bertugas', diubah = ? WHERE id = ? AND status IN ('ditugaskan', 'bertugas')").bind(a.waktu, o.relawan_id)]);
      return x.meta.changes ? "dibuka" : null;
    }
    const x = await env.DB.prepare("UPDATE relawan_jam SET keluar = max(masuk, ?1), menit = min(?3, max(0, (max(masuk, ?1) - masuk) / 60000)) WHERE relawan_id = ?2 AND keluar IS NULL").bind(a.waktu, o.relawan_id, MAKS_SESI_MENIT).run();
    return x.meta.changes ? "ditutup" : null;
  } catch (e) { if (/no such table|UNIQUE/i.test(e?.message || "")) return null; throw e; }
}

/* ---------------------------------------------------------------- ringkasan hari ini (kartu angka + peta personel) */
async function ringkas(env, req, url, kini) {
  const l = await lingkup(env, req, kini); if (l instanceof Response) return l;
  const hari = tanggalWIB(kini), a0 = awalHariWIB(hari), a1 = a0 + HARI;
  const w = sqlBatas(l, req, "o.prov", "a.tugas_id", 4), wp = w.p;
  const [ang, tin, tit] = await env.DB.batch([
    env.DB.prepare(`SELECT count(*) total,
        coalesce(sum(EXISTS (SELECT 1 FROM lp_absen x WHERE x.orang_id = a.orang_id AND x.tugas_id = a.tugas_id AND x.tanggal = ?3 AND x.jenis = 'masuk' AND x.status IN ('lolos', 'sah'))), 0) hadir,
        coalesce(sum(NOT EXISTS (SELECT 1 FROM lp_absen x WHERE x.orang_id = a.orang_id AND x.tugas_id = a.tugas_id AND x.tanggal = ?3 AND x.jenis = 'masuk' AND x.status <> 'tolak')), 0) belum_absen,
        coalesce(sum(NOT EXISTS (SELECT 1 FROM lp_logbook l WHERE l.orang_id = a.orang_id AND l.tugas_id = a.tugas_id AND l.tanggal = ?3)), 0) belum_logbook
      FROM lp_anggota a JOIN lp_tugas t ON t.id = a.tugas_id JOIN orang o ON o.id = a.orang_id
      WHERE t.mulai < ?2 AND t.selesai >= ?1 AND o.status = 'aktif'${w.sql}`).bind(a0, a1, hari, ...wp),
    env.DB.prepare(`SELECT count(*) n FROM lp_absen x JOIN orang o ON o.id = x.orang_id WHERE x.status = 'tinjau'${sqlBatas(l, req, "o.prov", "x.tugas_id", 1).sql}`).bind(...wp),
    env.DB.prepare(`SELECT x.orang_id orang, o.nama, t.judul tugas, x.lat, x.lon, x.status, x.waktu FROM lp_absen x JOIN orang o ON o.id = x.orang_id JOIN lp_tugas t ON t.id = x.tugas_id
      WHERE x.tanggal = ?1 AND x.status <> 'tolak' AND x.waktu = (SELECT max(y.waktu) FROM lp_absen y WHERE y.orang_id = x.orang_id AND y.tugas_id = x.tugas_id AND y.tanggal = x.tanggal AND y.status <> 'tolak')${sqlBatas(l, req, "o.prov", "x.tugas_id", 2).sql}
      ORDER BY x.waktu DESC LIMIT 500`).bind(hari, ...wp)]);
  const r = ang.results[0];
  return json({tanggal: hari, hadir: r.hadir, belum_absen: r.belum_absen, belum_logbook: r.belum_logbook, tinjau: tin.results[0].n, titik: tit.results, jejak: await jejakPosisi(env, req, a0, a1, l)});
}
/* LP-031: jejak GPS tautan /lacak (penugasan_posisi) milik petugas yang WA-nya sama dengan WA orang di modul ini; hanya hari ini, 20 titik terakhir per orang, 50 orang.
   Tanpa tabel penugasan (migrasi 0035 belum jalan) = larik kosong. Nomor WA tidak pernah keluar, hanya nama dan titik.
   Ditautkan HANYA bila WA itu milik tepat satu orang (WA ganda = salah orang) dan orangnya sedang menyetujui (persetujuan terakhir setuju = 1); selain itu jejak tidak ditautkan. */
async function jejakPosisi(env, req, a0, a1, l) {
  try {
    const w = sqlBatas(l, req, "o.prov", null, 3);
    const {results: orang} = await env.DB.prepare(`SELECT o.id orang, o.nama, p.id pid FROM penugasan p JOIN orang o ON o.wa = p.wa
      WHERE p.status IN ('aktif', 'selesai') AND o.status = 'aktif'${w.sql}
        AND (SELECT count(*) FROM orang o2 WHERE o2.wa = o.wa) = 1
        AND (SELECT s.setuju FROM orang_setuju s WHERE s.orang_id = o.id ORDER BY s.waktu DESC, s.rowid DESC LIMIT 1) = 1 AND EXISTS (SELECT 1 FROM penugasan_posisi s WHERE s.penugasan_id = p.id AND s.pada >= ?1 AND s.pada < ?2) GROUP BY o.id LIMIT 50`).bind(a0, a1, ...w.p).all();
    if (!orang.length) return [];
    const rs = await env.DB.batch(orang.map(x => env.DB.prepare("SELECT lat, lon, akurasi, pada FROM penugasan_posisi WHERE penugasan_id = ?1 AND pada >= ?2 AND pada < ?3 ORDER BY pada DESC LIMIT 20").bind(x.pid, a0, a1)));
    return orang.map((x, i) => ({orang: x.orang, nama: x.nama, titik: rs[i].results.reverse().map(t => [t.lat, t.lon])}));
  } catch (e) { if (/no such table/i.test(e?.message || "")) return []; throw e; }
}

/* ---------------------------------------------------------------- antrean tinjauan */
async function tinjauDaftar(env, req, url, kini) {
  const l = await lingkup(env, req, kini); if (l instanceof Response) return l;
  const hal = Math.min(Math.max(parseInt(url.searchParams.get("halaman"), 10) || 1, 1), 10000), w = sqlBatas(l, req, "o.prov", "x.tugas_id", 1);
  const [n, h] = await env.DB.batch([
    env.DB.prepare(`SELECT count(*) n FROM lp_absen x JOIN orang o ON o.id = x.orang_id WHERE x.status = 'tinjau'${w.sql}`).bind(...w.p),
    env.DB.prepare(`SELECT x.id, x.orang_id, o.nama, t.judul tugas, x.jenis, x.waktu, x.skor_wajah, x.alasan, x.jarak_m, x.gps_ket, x.luring, x.lat, x.lon, o.wajah_status
      FROM lp_absen x JOIN orang o ON o.id = x.orang_id JOIN lp_tugas t ON t.id = x.tugas_id WHERE x.status = 'tinjau'${w.sql} ORDER BY x.waktu, x.id LIMIT ${HALAMAN} OFFSET ${(hal - 1) * HALAMAN}`).bind(...w.p)]);
  return json({total: n.results[0].n, halaman: hal, ukuran_halaman: HALAMAN, baris: h.results.map(x => ({id: x.id, nama: x.nama, tugas: x.tugas, jenis: x.jenis, waktu: x.waktu, skor_wajah: x.skor_wajah, alasan: JSON.parse(x.alasan), jarak_m: x.jarak_m,
    gps_ket: x.gps_ket, luring: !!x.luring, lat: x.lat, lon: x.lon, foto_url: `/api/petugas/foto/${x.id}`, acuan_url: x.wajah_status === "terdaftar" ? `/api/petugas/panel/acuan/${x.orang_id}` : null}))});
}
/* antrean label menunggu tanda peninjau (pasangan labelVerifikasi); label milik peninjau sendiri tetap tampil (POST menolaknya 403). Tanpa vektor, kode, WA. */
async function labelDaftar(env, req, url, kini) {
  const l = await lingkup(env, req, kini); if (l instanceof Response) return l;
  const hal = Math.min(Math.max(parseInt(url.searchParams.get("halaman"), 10) || 1, 1), 10000), w = sqlBatas(l, req, "o.prov", "b.tugas_id", 1);
  const dari = `FROM lapangan_label x JOIN lp_logbook b ON b.id = x.sumber_id JOIN orang o ON o.id = b.orang_id JOIN lp_tugas t ON t.id = b.tugas_id WHERE x.terverifikasi = 0 AND x.dummy = 0 AND o.dummy = 0${w.sql}`;
  const [n, h] = await env.DB.batch([env.DB.prepare(`SELECT count(*) n ${dari}`).bind(...w.p),
    env.DB.prepare(`SELECT x.id, x.jenis, x.nilai, x.waktu, o.nama, t.judul tugas, (SELECT f.id FROM lp_logbook_foto f WHERE f.logbook_id = b.id ORDER BY f.rowid LIMIT 1) foto ${dari} ORDER BY x.waktu DESC, x.id LIMIT ${HALAMAN} OFFSET ${(hal - 1) * HALAMAN}`).bind(...w.p)]);
  return json({ok: true, total: n.results[0].n, baris: h.results.map(x => ({id: x.id, jenis: x.jenis, nilai: JSON.parse(x.nilai), waktu: x.waktu, nama: x.nama, tugas: x.tugas, foto_url: x.foto ? `/api/petugas/foto/${x.foto}` : null}))});
}
async function tinjauPutus(env, req, url, kini, ctx, id) {
  const mod = await penjaga(env, req); if (!mod) return tolakPanel();
  const lj = await laju(env, mod, "lapangan.tinjau", [[JAM, 600]], kini); if (lj) return lj;
  const b = await bacaBody(req, 2048); if (b.galat) return gagal(b.status || 400, b.galat);
  if (b.o.putus !== "sah" && b.o.putus !== "tolak") return gagal(400, "putus harus sah atau tolak");
  const catatan = tx(b.o.catatan, 300);
  if (catatan === undefined) return gagal(400, "catatan maksimal 300 karakter");
  if (b.o.putus === "tolak" && (!catatan || catatan.length < 3)) return gagal(400, "menolak wajib disertai catatan (minimal 3 karakter)");
  const a = await env.DB.prepare("SELECT x.id, x.jenis, x.waktu, x.lat, x.lon, x.status, o.id orang_id, o.relawan_id, o.staf_id, o.prov, o.dummy FROM lp_absen x JOIN orang o ON o.id = x.orang_id WHERE x.id = ?").bind(id).first();
  if (!a || !dalamWilayahStaf(req, [a.prov])) return gagal(404, "absen tidak ditemukan");
  if (a.staf_id && mod === "staf:" + a.staf_id) return gagal(403, "peninjau tidak boleh memutus absennya sendiri; minta peninjau lain");
  const x = await env.DB.prepare("UPDATE lp_absen SET status = ?, peninjau = ?, waktu_tinjau = ?, catatan = ? WHERE id = ? AND status = 'tinjau'").bind(b.o.putus, String(mod).slice(0, 64), kini, catatan, id).run();
  if (!x.meta.changes) return gagal(409, `absen ini berstatus ${a.status}; hanya yang menunggu tinjauan yang bisa diputus`);
  const jam = b.o.putus === "sah" ? await jamRelawan(env, a, a) : null;
  console.log("lapangan.tinjau", JSON.stringify({oleh: String(mod).slice(0, 64), absen: id, putus: b.o.putus, waktu: kini}));
  return json({ok: true, id, status: b.o.putus, jam});
}

/* ---------------------------------------------------------------- foto acuan wajah: peninjau saja (KEPUTUSAN U3), selalu private */
async function acuan(env, req, url, kini, ctx, id) {
  const mod = await penjaga(env, req); if (!mod) return tolakPanel();
  if (!env.MEDIA) return gagal(503, "penyimpanan foto belum aktif (R2 MEDIA)");
  /* hanya untuk orang yang sedang punya absen menunggu tinjauan: foto acuan bukan galeri yang bisa dibuka sembarang waktu */
  const o = await env.DB.prepare("SELECT id, prov FROM orang WHERE id = ? AND wajah_status = 'terdaftar' AND EXISTS (SELECT 1 FROM lp_absen WHERE orang_id = orang.id AND status = 'tinjau')").bind(id).first();
  if (!o || !dalamWilayahStaf(req, [o.prov])) return gagal(404, "foto acuan tidak ada");
  console.log("lapangan.acuan", JSON.stringify({oleh: String(mod).slice(0, 64), orang: o.id, waktu: kini}));   // jejak audit akses foto acuan
  const f = await env.MEDIA.get(`lapangan/acuan/${o.id}.jpg`);
  if (!f) return gagal(404, "foto acuan tidak ada");
  return kirimJpeg(f);
}
export const kirimJpeg = f => new Response(f.body, {headers: {"content-type": "image/jpeg", "cache-control": "private, no-store", "x-content-type-options": "nosniff", "content-security-policy": "default-src 'none'; sandbox", "content-disposition": "inline"}});

/* ---------------------------------------------------------------- tugas lapangan */
const tulisTugas = (b, req, kini) => {
  const judul = tx(b.judul, 120); if (!judul || judul.length < 2) return {galat: "judul wajib, 2 sampai 120 karakter"};
  if (typeof b.bencana !== "string" || !/^[a-z_]{2,30}$/.test(b.bencana)) return {galat: "bencana wajib (huruf kecil, mis. karhutla atau banjir)"};
  const lat = num(b.lat, -11.5, 6.5), lon = num(b.lon, 94.5, 141.5), radius = b.radius_m == null || b.radius_m === "" ? RADIUS_BAWAAN_M.lapangan : num(b.radius_m, 50, 50000, true);
  if (lat == null || lon == null || [lat, lon].some(Number.isNaN)) return {galat: "titik tugas wajib di dalam Indonesia (lat -11,5..6,5 dan lon 94,5..141,5)"};
  if (radius == null || Number.isNaN(radius)) return {galat: "radius_m bilangan bulat 50 sampai 50000"};
  const wil = tx(b.wilayah_teks, 120); if (wil === undefined) return {galat: "wilayah_teks maksimal 120 karakter"};
  let renlap = tx(b.renlap_url, 300);
  if (renlap === undefined) return {galat: "renlap_url maksimal 300 karakter"};
  if (renlap) { try { const u = new URL(renlap); if (u.protocol !== "https:" || u.username || u.password) throw 0; renlap = u.href; } catch (e) { return {galat: "renlap_url harus tautan https yang sah"}; } }
  const mulai = num(b.mulai, 1e12, 4e12, true), selesai = num(b.selesai, 1e12, 4e12, true);
  if (mulai == null || selesai == null || Number.isNaN(mulai) || Number.isNaN(selesai)) return {galat: "mulai dan selesai wajib (ms epoch)"};
  if (selesai <= mulai || selesai - mulai > 90 * HARI) return {galat: "selesai harus sesudah mulai dan rentangnya maksimal 90 hari"};
  const anggota = b.anggota;
  if (!Array.isArray(anggota) || anggota.length > 100 || anggota.some(x => typeof x !== "string" || !RE_ID.test(x)) || new Set(anggota).size !== anggota.length) return {galat: "anggota harus larik id orang tanpa duplikat (maksimal 100)"};
  const ketua = b.ketua_id ?? null;
  if (ketua !== null && (typeof ketua !== "string" || !anggota.includes(ketua))) return {galat: "ketua_id harus salah satu anggota"};
  if (b.id != null && (typeof b.id !== "string" || !RE_ID.test(b.id))) return {galat: "id tugas tidak sah"};
  return {v: {judul, bencana: b.bencana, lat, lon, radius, wil, renlap, mulai, selesai, anggota, ketua, id: b.id ?? null}};
};
async function tugasSimpan(env, req, url, kini) {
  const mod = await penjaga(env, req); if (!mod) return tolakPanel();
  const lj = await laju(env, mod, "lapangan.tugas", [[JAM, 120]], kini); if (lj) return lj;
  const b = await bacaBody(req, 8192); if (b.galat) return gagal(b.status || 400, b.galat);
  const c = tulisTugas(b.o, req, kini); if (c.galat) return gagal(400, c.galat);
  const v = c.v, ids = JSON.stringify(v.anggota);
  const {results: ada} = await env.DB.prepare("SELECT id, nama, wa, prov, dummy FROM orang WHERE status = 'aktif' AND id IN (SELECT value FROM json_each(?))").bind(ids).all();
  if (ada.length !== v.anggota.length) return gagal(400, "ada anggota yang tidak ditemukan atau nonaktif");
  if (!semuaDalamWilayah(req, ada.map(x => x.prov))) return gagal(403, "anggota di luar wilayah staf ini");
  let id = v.id;
  if (id) {
    const lama = await env.DB.prepare("SELECT t.id, t.dummy, (SELECT json_group_array(o.prov) FROM lp_anggota a JOIN orang o ON o.id = a.orang_id WHERE a.tugas_id = t.id) provs FROM lp_tugas t WHERE t.id = ?").bind(id).first();
    if (!lama) return gagal(404, "tugas tidak ditemukan");
    const provs = JSON.parse(lama.provs || "[]");
    if (wilayahStaf(req).length && !provs.length) return gagal(404, "tugas tidak ditemukan");
    if (!semuaDalamWilayah(req, provs)) return gagal(403, "tugas ini punya anggota di luar wilayah staf ini");   // sunting tugas lintas wilayah bukan hak staf berwilayah
    if (lama.dummy && ada.some(x => !x.dummy)) return gagal(400, "tugas contoh (dummy) tidak bisa diisi anggota nyata");
  } else id = acak(8);
  /* LP-022/040: hanya anggota BARU (belum ada di tugas ini) dapat pesan penugasan + Renlap lewat antrean WA; orang contoh (dummy) dan tanpa WA dilewati */
  const lamaIds = new Set(v.id ? (await env.DB.prepare("SELECT orang_id FROM lp_anggota WHERE tugas_id = ?").bind(id).all()).results.map(x => x.orang_id) : []);
  const pesanBaru = ada.filter(x => x.wa && !x.dummy && !lamaIds.has(x.id)).map(x => antrePenugasan(env, {judul: v.judul, wilayah_teks: v.wil, renlap_url: v.renlap, lat: v.lat, lon: v.lon, mulai: v.mulai, selesai: v.selesai}, x, kini));
  await env.DB.batch([
    id === v.id
      ? env.DB.prepare("UPDATE lp_tugas SET judul = ?, bencana = ?, lat = ?, lon = ?, radius_m = ?, wilayah_teks = ?, renlap_url = ?, mulai = ?, selesai = ?, ketua_id = ? WHERE id = ?").bind(v.judul, v.bencana, v.lat, v.lon, v.radius, v.wil, v.renlap, v.mulai, v.selesai, v.ketua, id)
      : env.DB.prepare("INSERT INTO lp_tugas (id, judul, bencana, lat, lon, radius_m, wilayah_teks, renlap_url, mulai, selesai, ketua_id, dibuat_oleh, dibuat, dummy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)").bind(id, v.judul, v.bencana, v.lat, v.lon, v.radius, v.wil, v.renlap, v.mulai, v.selesai, v.ketua, String(mod).slice(0, 64), kini),
    env.DB.prepare("DELETE FROM lp_anggota WHERE tugas_id = ?").bind(id),
    env.DB.prepare("INSERT INTO lp_anggota (tugas_id, orang_id, peran) SELECT ?1, value, CASE WHEN value = ?3 THEN 'ketua' ELSE 'anggota' END FROM json_each(?2)").bind(id, ids, v.ketua ?? ""),
    ...pesanBaru,
  ]);
  console.log("lapangan.tugas", JSON.stringify({oleh: String(mod).slice(0, 64), tugas: id, anggota: v.anggota.length, waktu: kini}));
  return json({ok: true, id}, v.id ? 200 : 201);
}
async function tugasDaftar(env, req, url, kini) {
  if (!await penjaga(env, req)) return tolakPanel();
  const w = wilayahStaf(req), aktif = url.searchParams.get("aktif") === "1", hari = tanggalWIB(kini);
  /* hadir = orang berbeda yang absen masuk lolos/sah hari ini; logbook = logbook hari ini; temuan = hasil logbook terbaru tugas itu */
  const {results} = await env.DB.prepare(`SELECT t.id, t.judul, t.bencana, t.lat, t.lon, t.radius_m, t.wilayah_teks, t.renlap_url, t.mulai, t.selesai, t.ketua_id,
      (SELECT json_group_array(json_object('id', a.orang_id, 'nama', o.nama, 'peran', a.peran)) FROM lp_anggota a JOIN orang o ON o.id = a.orang_id WHERE a.tugas_id = t.id AND (?1 = '[]' OR o.prov IN (SELECT value FROM json_each(?1)))) anggota,
      (SELECT count(DISTINCT x.orang_id) FROM lp_absen x WHERE x.tugas_id = t.id AND x.tanggal = ?3 AND x.jenis = 'masuk' AND x.status IN ('lolos', 'sah')) hadir,
      (SELECT count(*) FROM lp_logbook l WHERE l.tugas_id = t.id AND l.tanggal = ?3) logbook,
      (SELECT substr(l.hasil, 1, 160) FROM lp_logbook l WHERE l.tugas_id = t.id AND l.hasil <> '' ORDER BY l.tanggal DESC, l.waktu DESC LIMIT 1) temuan
    FROM lp_tugas t WHERE (?1 = '[]' OR EXISTS (SELECT 1 FROM lp_anggota a JOIN orang o ON o.id = a.orang_id WHERE a.tugas_id = t.id AND o.prov IN (SELECT value FROM json_each(?1))))
      AND (?2 = 0 OR t.selesai >= ?4) ORDER BY t.mulai DESC, t.id LIMIT 100`).bind(JSON.stringify(w), aktif ? 1 : 0, hari, kini).all();
  return json({baris: results.map(x => ({...x, anggota: JSON.parse(x.anggota || "[]"), temuan: x.temuan ?? null})).map(x => ({...x, ketua_id: x.anggota.some(a => a.id === x.ketua_id) ? x.ketua_id : null}))});   // ketua di luar wilayah ikut disembunyikan
}

/* ================================================================ tahap C (0101): panggilan, ekspor rekap, keahlian, label */
const panggilPanel = async (env, req, kini) => { const mod = await penjaga(env, req); return mod ? panggilBuat(env, req, mod, kini) : tolakPanel(); };

/* LP-046: orang bertanda keahlian (orang_keahlian, atau keahlian relawan-nya) untuk dipanggil; staf berwilayah hanya melihat provinsinya */
async function orangKeahlian(env, req, url) {
  if (!await penjaga(env, req)) return tolakPanel();
  const k = url.searchParams.get("keahlian") || "";
  if (!/^[a-z_]{2,30}$/.test(k)) return gagal(400, "keahlian harus kata huruf kecil 2 sampai 30 karakter");
  const w = wilayahStaf(req);
  const {results} = await env.DB.prepare(`SELECT o.id, o.nama, o.jenis, o.prov, o.kab,
      (SELECT json_group_array(x.keahlian) FROM orang_keahlian x WHERE x.orang_id = o.id) tanda, r.keahlian rk
    FROM orang o LEFT JOIN relawan r ON r.id = o.relawan_id AND r.anonim = 0
    WHERE o.status = 'aktif' AND (?2 = '[]' OR o.prov IN (SELECT value FROM json_each(?2)))
      AND (EXISTS (SELECT 1 FROM orang_keahlian x WHERE x.orang_id = o.id AND x.keahlian = ?1) OR EXISTS (SELECT 1 FROM json_each(coalesce(r.keahlian, '[]')) WHERE value = ?1))
    ORDER BY o.nama, o.id LIMIT 200`).bind(k, JSON.stringify(w)).all();
  const urai = t => { try { return JSON.parse(t || "[]"); } catch (e) { return []; } };
  return json({ok: true, orang: results.map(x => ({id: x.id, nama: x.nama, jenis: x.jenis, prov: x.prov, kab: x.kab, keahlian: [...new Set([...urai(x.tanda), ...urai(x.rk)])].sort()}))});
}
async function keahlianTulis(env, req, kini, hapus) {
  const mod = await superOK(env, req); if (!mod) return gagal(403, "penanda keahlian hanya untuk Super Admin");
  const lj = await laju(env, mod, "lapangan.keahlian", [[JAM, 120]], kini); if (lj) return lj;
  const b = await bacaBody(req, 1024); if (b.galat) return gagal(b.status || 400, b.galat);
  if (typeof b.o.orang_id !== "string" || !RE_ID.test(b.o.orang_id)) return gagal(400, "orang_id tidak sah");
  if (typeof b.o.keahlian !== "string" || !/^[a-z_]{2,30}$/.test(b.o.keahlian)) return gagal(400, "keahlian harus kata huruf kecil 2 sampai 30 karakter");
  const bukti = tx(b.o.bukti, 200); if (bukti === undefined) return gagal(400, "bukti maksimal 200 karakter");
  if (!await env.DB.prepare("SELECT 1 FROM orang WHERE id = ?").bind(b.o.orang_id).first()) return gagal(404, "orang tidak ditemukan");
  if (hapus) { await env.DB.prepare("DELETE FROM orang_keahlian WHERE orang_id = ? AND keahlian = ?").bind(b.o.orang_id, b.o.keahlian).run(); return json({ok: true}); }
  /* batas 10 atomik: hitung dan tulis dalam satu pernyataan, jadi dua permintaan serentak tidak sama-sama lolos hitungan */
  const w = await env.DB.prepare(`INSERT INTO orang_keahlian (orang_id, keahlian, bukti, dibuat) SELECT ?1, ?2, ?3, ?4
    WHERE (SELECT count(*) FROM orang_keahlian WHERE orang_id = ?1 AND keahlian <> ?2) < 10 ON CONFLICT (orang_id, keahlian) DO UPDATE SET bukti = excluded.bukti`).bind(b.o.orang_id, b.o.keahlian, bukti, kini).run();
  if (!w.meta.changes) return gagal(409, "satu orang maksimal 10 penanda keahlian");
  console.log("lapangan.keahlian", JSON.stringify({oleh: String(mod).slice(0, 64), orang: b.o.orang_id, keahlian: b.o.keahlian, waktu: kini}));
  return json({ok: true});
}

/* LP-024: rekap per orang untuk satu tugas. Tanpa vektor, foto acuan, kode, nomor WA. Sel berawalan = + - @ tab dinetralkan (Excel membaca sebagai rumus). */
const sel = v => { let t = String(v ?? ""); if (RUMUS.test(t)) t = "'" + t; return /[",\r\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t; };
async function ekspor(env, req, url, kini) {
  if (!await penjaga(env, req)) return tolakPanel();
  const tid = url.searchParams.get("tugas_id") || "";
  if (!RE_ID.test(tid)) return gagal(400, "tugas_id tidak sah");
  const lj = await laju(env, await sha(`${env.IP_SALT}|ekspor|${wilayahStaf(req).join()}|${req.headers.get("cf-connecting-ip") || ""}`), "lapangan.ekspor", [[JAM, 60]], kini); if (lj) return lj;
  const t = await tugasTerlihat(env, req, tid); if (!t) return gagal(404, "tugas tidak ditemukan");
  const w = JSON.stringify(wilayahStaf(req));
  const [ang, hdr, tin, lb] = await env.DB.batch([
    env.DB.prepare("SELECT o.id, o.nama, a.peran FROM lp_anggota a JOIN orang o ON o.id = a.orang_id WHERE a.tugas_id = ?1 AND (?2 = '[]' OR o.prov IN (SELECT value FROM json_each(?2))) ORDER BY a.peran DESC, o.nama, o.id").bind(tid, w),
    env.DB.prepare("SELECT orang_id, tanggal, min(CASE WHEN jenis = 'masuk' THEN waktu END) masuk, max(CASE WHEN jenis = 'pulang' THEN waktu END) pulang FROM lp_absen WHERE tugas_id = ? AND status IN ('lolos', 'sah') GROUP BY orang_id, tanggal").bind(tid),
    env.DB.prepare("SELECT orang_id, count(*) n FROM lp_absen WHERE tugas_id = ? AND status = 'tinjau' GROUP BY orang_id").bind(tid),
    env.DB.prepare("SELECT orang_id, count(*) n FROM lp_logbook WHERE tugas_id = ? GROUP BY orang_id").bind(tid)]);
  const per = new Map(); for (const h of hdr.results) { const e = per.get(h.orang_id) ?? {hari: 0, menit: 0}; if (h.masuk != null) { e.hari++; if (h.pulang != null && h.pulang > h.masuk) e.menit += Math.min(MAKS_SESI_MENIT, Math.floor((h.pulang - h.masuk) / MENIT)); } per.set(h.orang_id, e); }
  const n = r => new Map(r.results.map(x => [x.orang_id, x.n]));
  const mTin = n(tin), mLb = n(lb);
  const baris = [["nama", "peran", "hari_hadir", "menit_layanan", "logbook_terisi", "absen_tinjau"], ...ang.results.map(o => [o.nama, o.peran, per.get(o.id)?.hari ?? 0, per.get(o.id)?.menit ?? 0, mLb.get(o.id) ?? 0, mTin.get(o.id) ?? 0])];
  return new Response("\uFEFF" + baris.map(r => r.map(sel).join(",")).join("\r\n") + "\r\n", {headers: {"content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="rekap-tugas-${tid}.csv"`, "cache-control": "private, no-store", "x-content-type-options": "nosniff"}});
}

/* LP-023: label kondisi lapangan untuk model; HANYA yang ditandai peninjau, bukan contoh (dummy). Pembaca: Super Admin (token mesin ekspor harian), 60 per jam per IP.
   Koordinat di sini presisi; scripts/lapangan/ekspor_label.py membulatkannya sebelum menulis ke public/. */
async function label(env, req, url, kini) {
  if (!await superOK(env, req)) return gagal(403, "perlu token Super Admin");
  const lj = await lajuIP(env, req, "lapangan.label", [[JAM, 60]], kini); if (lj) return lj;
  const sejak = url.searchParams.has("sejak") ? num(url.searchParams.get("sejak"), 0, 4e12, true) : 0;
  if (sejak == null || Number.isNaN(sejak)) return gagal(400, "sejak harus ms epoch bilangan bulat");
  const {results} = await env.DB.prepare("SELECT id, jenis, nilai, lat, lon, waktu FROM lapangan_label WHERE terverifikasi = 1 AND dummy = 0 AND waktu >= ? ORDER BY waktu, id LIMIT 5000").bind(sejak).all();
  return json({ok: true, label: results.map(x => ({...x, nilai: JSON.parse(x.nilai)}))});
}

/* tanda peninjau (pimpinan/koordalops/moderator) bahwa label logbook benar: satu-satunya jalan terverifikasi = 1. Peninjau tidak menandai label logbooknya sendiri.
   Tinggi genangan label banjir yang ditandai jadi konfirmasi /prediksi (LP-045) untuk kab TUGAS: kab profil orang hanya dipakai bila wilayah_teks tugas menyebutnya; tugas tanpa kab yang jelas dan label contoh dilewati. */
async function labelVerifikasi(env, req, url, kini, ctx, id) {
  const mod = await penjaga(env, req); if (!mod) return tolakPanel();
  const lj = await laju(env, mod, "lapangan.label_tanda", [[JAM, 600]], kini); if (lj) return lj;
  const l = await env.DB.prepare(`SELECT l.id, l.jenis, l.nilai, l.dummy, b.tanggal, o.id orang_id, o.staf_id, o.kab, o.prov, o.dummy odummy, t.wilayah_teks
    FROM lapangan_label l JOIN lp_logbook b ON b.id = l.sumber_id JOIN orang o ON o.id = b.orang_id JOIN lp_tugas t ON t.id = b.tugas_id WHERE l.id = ?`).bind(id).first();
  if (!l || !dalamWilayahStaf(req, [l.prov])) return gagal(404, "label tidak ditemukan");
  if (l.dummy || l.odummy) return gagal(409, "label contoh tidak diverifikasi");
  if (l.staf_id && mod === "staf:" + l.staf_id) return gagal(403, "peninjau tidak boleh menandai label logbooknya sendiri; minta peninjau lain");
  const x = await env.DB.prepare("UPDATE lapangan_label SET terverifikasi = 1 WHERE id = ? AND terverifikasi = 0").bind(id).run();
  if (!x.meta.changes) return gagal(409, "label ini sudah ditandai");
  const cm = JSON.parse(l.nilai).tinggi_genangan_cm, kab = l.kab?.trim();
  const kabTugas = kab && kab.length >= 2 && String(l.wilayah_teks ?? "").toLowerCase().includes(kab.toLowerCase()) ? kab : null;
  let konfirmasi = false;
  if (l.jenis === "banjir" && Number.isFinite(cm) && kabTugas) {
    await env.DB.prepare(`INSERT INTO prediksi_konfirmasi (kab, tanggal, kode, terjadi, nilai, catatan, sumber, kode_regu, dibuat) VALUES (?, ?, 'BNJ', ?, ?, NULL, 'regu', ?, ?)
      ON CONFLICT (kab, tanggal, kode, kode_regu) DO UPDATE SET terjadi = excluded.terjadi, nilai = excluded.nilai, dibuat = excluded.dibuat`).bind(kabTugas, l.tanggal, cm > 0 ? 1 : 0, cm, "lp:" + l.orang_id, new Date(kini).toISOString()).run();
    konfirmasi = true;
  }
  console.log("lapangan.label_tanda", JSON.stringify({oleh: String(mod).slice(0, 64), label: id, konfirmasi, waktu: kini}));
  return json({ok: true, id, terverifikasi: true, konfirmasi});
}

export const RUTE_LAPANGAN_PANEL = jaga({
  "POST /api/petugas/panel/label/:id": (env, req, url, kini, ctx, id) => pb(req) ?? labelVerifikasi(env, req, url, kini, ctx, id),
  "POST /api/petugas/panel/impor": (env, req, url, kini) => pb(req) ?? impor(env, req, kini),
  "GET /api/petugas/panel/orang": (env, req, url) => url.searchParams.has("keahlian") ? orangKeahlian(env, req, url) : daftarOrang(env, req, url),
  "POST /api/petugas/panel/panggil": (env, req, url, kini) => pb(req) ?? panggilPanel(env, req, kini),
  "GET /api/petugas/panel/panggil": (env, req, url) => penjaga(env, req).then(m => m ? panggilDaftar(env, req, url) : tolakPanel()),
  "GET /api/petugas/panel/ekspor.csv": (env, req, url, kini) => ekspor(env, req, url, kini),
  "POST /api/petugas/panel/keahlian": (env, req, url, kini) => pb(req) ?? keahlianTulis(env, req, kini, false),
  "DELETE /api/petugas/panel/keahlian": (env, req, url, kini) => pb(req) ?? keahlianTulis(env, req, kini, true),
  "GET /api/petugas/label.json": (env, req, url, kini) => label(env, req, url, kini),
  ...RUTE_GATEWAY_WA,
  "POST /api/petugas/panel/tautan/:id": (env, req, url, kini, ctx, id) => pb(req) ?? tautan(env, req, url, kini, ctx, id),
  "GET /api/petugas/panel/ringkas": ringkas,
  "GET /api/petugas/panel/tinjau": tinjauDaftar,
  "GET /api/petugas/panel/label": labelDaftar,
  "POST /api/petugas/panel/tinjau/:id": (env, req, url, kini, ctx, id) => pb(req) ?? tinjauPutus(env, req, url, kini, ctx, id),
  "POST /api/petugas/panel/tugas": (env, req, url, kini) => pb(req) ?? tugasSimpan(env, req, url, kini),
  "GET /api/petugas/panel/tugas": tugasDaftar,
  "GET /api/petugas/panel/acuan/:id": acuan,
});

/* cron menit 17: antrean WA memuat kode pribadi, jadi tidak disimpan lama. Terkirim/gagal > 24 jam dan antre > 72 jam dibuang. */
export const bersihkanLapangan = async (env, kini = Date.now()) => {
  /* tahap B (0097): nonce habis > 1 hari dibuang, logbook hari lampau dikunci; migrasi belum jalan = dilewati tanpa mengganggu pembersihan wa_antre */
  try { await env.DB.batch([env.DB.prepare("DELETE FROM lp_nonce WHERE kedaluwarsa < ?").bind(kini - HARI), env.DB.prepare("UPDATE lp_logbook SET terkunci = 1 WHERE terkunci = 0 AND tanggal < ?").bind(tanggalWIB(kini))]); }
  catch (e) { if (!/no such table/i.test(e?.message || "")) throw e; }
  /* LP-020: baris penerima panggilan (kode balas, status jawaban per relawan) dibuang 30 hari sesudah batas panggilannya */
  try { await env.DB.prepare("DELETE FROM lp_panggil_penerima WHERE panggil_id IN (SELECT id FROM lp_panggil WHERE batas < ?)").bind(kini - 30 * 24 * JAM).run(); }
  catch (e) { if (!/no such table/i.test(e?.message || "")) throw e; }
  await bersihWa(env, kini);
  await hapusFotoLama(env, kini);
};
/* LP-049: foto absen/logbook > 2 tahun dihapus dari R2; barisnya tetap (waktu, lokasi, status) dengan foto_key = 'dihapus' (kolom NOT NULL, CHECK panjang >= 5, jadi bukan NULL). Label dan agregat tidak disentuh.
   ponytail: 100 foto per tabel per jalan cron (tiap jam); tumpukan lama habis dalam hari. Galat R2 menghentikan tabel itu, baris tidak ditandai, jam berikutnya mengulang. */
export const FOTO_DIHAPUS = "dihapus";
async function hapusFotoLama(env, kini) {
  if (!env.MEDIA) return;
  const batas = kini - RETENSI_FOTO_MS;
  for (const [tabel, waktu, kunci] of [["lp_absen", "waktu", "foto_key"], ["lp_logbook_foto", "waktu", "foto_key"]]) {
    try {
      const {results} = await env.DB.prepare(`SELECT id, ${kunci} k FROM ${tabel} WHERE ${waktu} < ? AND ${kunci} <> ? ORDER BY ${waktu} LIMIT 100`).bind(batas, FOTO_DIHAPUS).all();
      if (!results.length) continue;
      await env.MEDIA.delete(results.map(x => x.k));
      await env.DB.batch(results.map(x => env.DB.prepare(`UPDATE ${tabel} SET ${kunci} = ? WHERE id = ?`).bind(FOTO_DIHAPUS, x.id)));
    } catch (e) { if (!/no such table/i.test(e?.message || "")) console.error("lapangan.retensi", tabel, String(e?.message).slice(0, 120)); }
  }
}
const bersihWa = (env, kini) => env.DB.batch([
  env.DB.prepare("DELETE FROM wa_antre WHERE status IN ('dikirim', 'gagal') AND coalesce(dikirim, dibuat) < ?").bind(kini - 24 * JAM),
  env.DB.prepare("DELETE FROM wa_antre WHERE status = 'antre' AND dibuat < ?").bind(kini - 72 * JAM),
]);
