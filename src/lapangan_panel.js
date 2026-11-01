/* Modul Pegawai dan Relawan Lapangan, sisi pimpinan, tahap A (data/kajian-bnpb/lapangan/DESAIN-TEKNIS.md §2 dan §4, ALUR A1):
   impor CSV induk pegawai (pratinjau lalu simpan), daftar orang, kirim tautan pribadi lewat antrean WA.
   Skema: migrations/0095_lapangan_orang.sql. Rute digabung ke RUTE lewat src/lapangan.js (RUTE_LAPANGAN).
   Penjaga: moderator ke atas (modOK, bukan akun gerbang situs) atau staf berperan pimpinan/koordalops; impor = Super Admin saja.
   Daftar orang TIDAK memuat wa/email mentah, dan vektor wajah tidak pernah keluar dari Worker.
   ponytail: satu impor memuat paling banyak 5000 baris dan kueri dikelompokkan per batch D1; di Workers Free (CPU 10 ms) impor sebesar itu butuh paket berbayar, pecah per unit bila terpotong. */
import {gagal, json, acak, bacaBody, normalWA} from "./worker.js";
import {superOK, modOK, tx, RE_EMAIL, uraiCsvKontak} from "./posko.js";
import {modAtauStaf, dalamWilayahStaf, wilayahStaf} from "./staf.js";
import {laju, kodeBaru} from "./bnpb.js";
import {JENIS_ORANG} from "./lapangan_konst.js";

const JAM = 3600e3;
export const PERAN_PANEL = ["pimpinan", "koordalops"];
export const TAUTAN_DASAR = "https://centurisk97.id/petugas#k=";
const MAKS_BARIS = 5000, MAKS_CSV = 1_500_000, HALAMAN = 50;
const KOLOM_CSV = ["nama", "nip", "unit", "jabatan", "wa", "email", "prov", "kab"];

/* semua rute tulis modul: header x-pb: 1 (anti-CSRF, pola src/instansi.js); tabel 0095 belum ada = 503 yang jelas */
export const pb = req => req.headers.get("x-pb") === "1" ? null : gagal(403, "kiriman wajib membawa header x-pb: 1 (dikirim otomatis oleh halaman)");
export const jaga = rute => Object.fromEntries(Object.entries(rute).map(([k, f]) => [k, async (...a) => {
  try { return await f(...a); }
  catch (e) { if (/no such table/i.test(e?.message || "")) return gagal(503, "modul lapangan belum aktif (migrasi 0095 belum diterapkan)"); throw e; }
}]));
const tolakPanel = () => gagal(403, "akses ditolak: hanya pimpinan, koordinator Pusdalops, atau moderator");
const penjaga = (env, req) => modAtauStaf(env, req, PERAN_PANEL);

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

export const RUTE_LAPANGAN_PANEL = jaga({
  "POST /api/petugas/panel/impor": (env, req, url, kini) => pb(req) ?? impor(env, req, kini),
  "GET /api/petugas/panel/orang": (env, req, url) => daftarOrang(env, req, url),
  "POST /api/petugas/panel/tautan/:id": (env, req, url, kini, ctx, id) => pb(req) ?? tautan(env, req, url, kini, ctx, id),
});

/* cron menit 17: antrean WA memuat kode pribadi, jadi tidak disimpan lama. Terkirim/gagal > 24 jam dan antre > 72 jam dibuang. */
export const bersihkanLapangan = (env, kini = Date.now()) => env.DB.batch([
  env.DB.prepare("DELETE FROM wa_antre WHERE status IN ('dikirim', 'gagal') AND coalesce(dikirim, dibuat) < ?").bind(kini - 24 * JAM),
  env.DB.prepare("DELETE FROM wa_antre WHERE status = 'antre' AND dibuat < ?").bind(kini - 72 * JAM),
]);
