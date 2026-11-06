/* Kemitraan Kampus: akun, kampus, anggota, perjanjian, kode BPBD (KM-D01, KM-D05). Skema: migrations/0080 (km_kampus, km_akun, km_sesi, km_anggota, km_perjanjian, km_bpbd_kode, km_jejak).
   Rancangan: data/kajian-bnpb/kampus/ALUR.md §1, DESAIN-TEKNIS.md §4.3 §6.1 §6.2 §10, KEAMANAN-PRIVASI.md §2 §3 §4 §5.
   - Daftar kampus (multipart, surat tugas PDF <= 2 MB) dan daftar anggota (JSON) publik: laju 10/jam/IP, Turnstile bila sitekey, jawaban duplikat IDENTIK dengan yang baru (anti-oracle).
   - KK masuk: PBKDF2 (hashSandi pendataan), laju IP dulu, kunci 15 menit setelah 5 gagal (km_akun.gagal/kunci_sampai), sesi 12 jam (sha di km_sesi), cookie HttpOnly Secure SameSite=Strict.
   - Tautan atur sandi: 32 hex, 72 jam, sekali pakai, hanya sha di D1. Kode pribadi: 26 hex, hanya sha di D1, tampil sekali.
   - Berkas: magic byte %PDF, nama R2 dibangkitkan server, unduh attachment + nosniff. Tiap tulis menulis baris km_jejak.
   Diekspor sebagai fungsi (ruteAkun) supaya impor siklik dengan kemitraan.js aman urutan muat apa pun.
   ponytail: kunci akun bisa dipakai penyerang untuk mengunci KK 15 menit (harga yang sama dengan pendataan); pendaftar yang WA/email-nya sudah ada di relawan tidak bisa bergabung lewat modul ini
   (DT §10 menyuruh menempelkan km_anggota ke relawan lama, tetapi tidak ada tempat menyimpan permintaan sebelum KK setuju dan KK akan memutar kode orang lain). */
import {json, gagal, acak, sha, bacaBody, bacaBytes, normalWA, turnstileOK, cacheTepi} from "./worker.js";
import {tx, num, tglSah, RE_EMAIL} from "./posko.js";
import {laju, lajuIP, kodeBaru} from "./bnpb.js";
import {hashSandi} from "./pendataan.js";
import {KEAHLIAN, PROV, cekInstitusi, sisipInstitusi, statusMou} from "./relawan.js";
import {hakKm} from "./kemitraan.js";
import {statusPerjanjian} from "./kemitraan_hitung.js";

const MENIT = 60e3, JAM = 60 * MENIT, HARI = 24 * JAM, COOKIE = "sesi_kemitraan", SESI_UMUR = 12 * JAM, KUNCI_UMUR = 15 * MENIT, ATUR_UMUR = 72 * JAM, MAKS_GAGAL = 5;
const MAKS_SURAT = 2 * 1048576, MAKS_PERJANJIAN = 5 * 1048576;
const RE_ID = /^[0-9a-f]{16}$/, UNSUR = ["dosen", "tendik", "mahasiswa", "alumni"], PERAN_KAMPUS = ["simpul", "satelit", "mitra"];
const JENIS_PERJANJIAN = ["mou_payung", "mou_kampus", "pks_pendampingan", "pks_satgas", "lainnya"], JENIS_FASILITAS = ["posko", "gudang", "pengungsian", "rs_pendidikan", "lab"];
const STATUS_AKTIF_ANGGOTA = "('diverifikasi', 'siap_tugas', 'ditugaskan', 'bertugas', 'selesai')";
const OK_KAMPUS = {ok: true, status: "menunggu"}, OK_ANGGOTA = {ok: true, status: "menunggu_persetujuan"};
const SUDAH_AKTIF = "Kampus sudah terdaftar. Hubungi koordinatornya.";
const sama = (a, b) => { if (a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; };
const hashKontak = (env, jenis, nilai) => sha(`${env.IP_SALT}|kontak|${jenis}|${nilai}`);
const normNama = s => s.normalize("NFKD").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const pdf = b => b.length > 4 && b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46;   // %PDF
const urai = s => { try { return JSON.parse(s); } catch (e) { return null; } };

/* ---------------- bantuan ---------------- */
/* null bila peran boleh; selain itu Response siap kirim (kode salah 403/429, tanpa kredensial 401, peran salah 403) */
const izin = (h, boleh) => h.tolak ?? (!h.peran ? gagal(401, "belum masuk atau kode tidak diberikan") : boleh.includes(h.peran) ? null : gagal(403, "peran ini tidak berhak atas rute ini"));
const staf = h => h.peran === "ST" || h.peran === "SA";
const halaman = url => { const per = Math.min(100, Math.max(1, Math.floor(Number(url.searchParams.get("per"))) || 50)), hal = Math.max(1, Math.floor(Number(url.searchParams.get("hal"))) || 1); return {per, off: (hal - 1) * per, hal}; };
/* Satu baris jejak (ALUR: tiap tulis D1 menulis km_jejak). jikaUbah: hanya tertulis bila pernyataan SEBELUMNYA di batch mengubah baris (changes() > 0). */
export function jejak(env, tabel, baris, aksi, oleh, kini, {dari = null, ke = null, catatan = null, jikaUbah = false} = {}) {
  return env.DB.prepare(`INSERT INTO km_jejak (tabel, baris, dari, ke, aksi, oleh, catatan, waktu) ${jikaUbah ? "SELECT ?, ?, ?, ?, ?, ?, ?, ? WHERE changes() > 0" : "VALUES (?, ?, ?, ?, ?, ?, ?, ?)"}`)
    .bind(tabel, baris, dari, ke, aksi, String(oleh).slice(0, 80), catatan, kini);
}
let KODE = null;   // public/data/kemitraan/kode.json: kab4 -> {nama, prov, ...}
async function kodeKab(env, url) {
  if (KODE) return KODE;
  const r = env.ASSETS ? await env.ASSETS.fetch(new Request(new URL("/data/kemitraan/kode.json", url))) : null;
  if (!r?.ok) { r?.body?.cancel(); return null; }
  return KODE = await r.json();
}
const cookieSet = (nilai, umur) => `${COOKIE}=${nilai}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${umur}`;
const tokenDari = req => (req.headers.get("cookie") || "").match(new RegExp(`(?:^|;\\s*)${COOKIE}=([0-9a-f]{64})(?:;|$)`))?.[1] ?? null;
/* multipart: Content-Length wajib dan dibatasi SEBELUM body dibaca; field `data` = JSON objek (<= 8192 huruf), field `berkas` opsional */
async function formulir(req, maksBerkas, medan = "berkas") {
  if (!(req.headers.get("content-type") || "").startsWith("multipart/form-data")) return {r: gagal(400, "kirim sebagai multipart/form-data (field data berisi JSON)")};
  const pjg = Number(req.headers.get("content-length") || 0);
  if (!(pjg > 0)) return {r: gagal(411, "Content-Length wajib pada unggahan")};
  if (pjg > maksBerkas + 65536) { await bacaBytes(req, maksBerkas + 65536); return {r: gagal(413, `kiriman ${pjg} byte, berkas maksimal ${maksBerkas} byte`)}; }   // bacaBytes membuang kelebihan: tanpa itu klien yang masih mengunggah kena reset sambungan
  let f; try { f = await req.formData(); } catch (e) { return {r: gagal(400, "formulir tidak terbaca")}; }
  const d = f.get("data"); let o = null;
  if (typeof d === "string" && d.length <= 8192) o = urai(d);
  if (!o || typeof o !== "object" || Array.isArray(o)) return {r: gagal(400, "field data harus objek JSON (maksimal 8192 huruf)")};
  const b = f.get(medan);
  return {o, berkas: b instanceof File && b.size ? b : null};
}
/* berkas PDF: {bytes} atau {r: Response} */
async function bacaPdf(berkas, maks) {
  if (berkas.size > maks) return {r: gagal(413, `berkas ${berkas.size} byte, maksimal ${maks} byte`)};
  const bytes = new Uint8Array(await berkas.arrayBuffer());
  return pdf(bytes) ? {bytes} : {r: gagal(400, "berkas harus PDF asli (isi berkas bukan PDF)")};
}
const unduh = async (env, kunci, nama) => {
  const o = await env.MEDIA.get(kunci);
  return o ? new Response(o.body, {headers: {"content-type": "application/pdf", "content-disposition": `attachment; filename="${nama}"`, "x-content-type-options": "nosniff", "cache-control": "private, no-store", "content-security-policy": "default-src 'none'; sandbox"}}) : gagal(404, "berkas tidak ada");
};
const tanpaMedia = () => gagal(503, "penyimpanan berkas belum tersedia");

/* ================================================================ daftar kampus (PB, multipart) */
async function daftarKampus(env, req, url, kini) {
  if (!env.MEDIA) return tanpaMedia();
  const lj = await lajuIP(env, req, "kemitraan.daftar_kampus", [[JAM, 10]], kini); if (lj) return lj;   // laju SEBELUM membaca multipart (badan besar) dan sebelum Turnstile (layanan luar); kunci terpisah dari daftar anggota
  const m = await formulir(req, MAKS_SURAT, "surat"); if (m.r) return m.r;
  const c = cekInstitusi(m.o); if (c.galat) return gagal(400, c.galat);
  const v = c.v;
  if (v.jenis !== "ptn" && v.jenis !== "pts") return gagal(400, "jenis kampus harus ptn atau pts");
  if (v.pic.length > 80) return gagal(400, "nama PIC maksimal 80 karakter");
  if (v.jabatan != null && v.jabatan.length < 2) return gagal(400, "jabatan PIC 2-80 karakter");
  if (!v.email || v.email.length > 120) return gagal(400, "email PIC wajib (maksimal 120 karakter)");
  if (!v.wa) return gagal(400, "WA PIC wajib (contoh 0812xxxxxxx)");
  if (m.o.setuju !== true) return gagal(400, "persetujuan pemrosesan data pribadi (UU PDP) wajib");
  if (!m.berkas) return gagal(400, "surat tugas PDF wajib");
  const p = await bacaPdf(m.berkas, MAKS_SURAT); if (p.r) return p.r;
  if (!(await turnstileOK(env, m.o.turnstile, req))) return gagal(403, "verifikasi Turnstile gagal");
  /* institusi dengan nama sama (ternormalisasi): aktif -> pesan baku; menunggu atau dicabut -> diam (sama dengan sukses); ditolak -> boleh mendaftar ulang */
  const kunciNama = normNama(v.nama);
  const ada = (await env.DB.prepare("SELECT i.id, i.nama, k.status, k.surat_r2 FROM institusi i LEFT JOIN km_kampus k ON k.institusi_id = i.id WHERE i.dummy = 0 AND i.jenis IN ('ptn', 'pts') LIMIT 5000").all()).results.find(r => normNama(r.nama) === kunciNama);
  if (ada?.status === "aktif") return gagal(409, SUDAH_AKTIF);
  if (ada?.status && ada.status !== "ditolak") return json(OK_KAMPUS, 201);
  const lama = await env.DB.prepare("SELECT id, institusi_id, status FROM km_akun WHERE email = ?").bind(v.email).first();
  if (lama && !(ada?.status === "ditolak" && lama.institusi_id === ada.id && lama.status === "ditolak")) return json(OK_KAMPUS, 201);   // email terdaftar: jawaban sama dengan sukses
  const id = ada?.id ?? acak(8), surat = `kemitraan/surat/${acak(8)}.pdf`;   // kunci R2 acak per kiriman, tidak diturunkan dari id institusi: catch UNIQUE tak bisa menghapus berkas pemenang
  await env.MEDIA.put(surat, p.bytes, {httpMetadata: {contentType: "application/pdf"}});
  const akunBaru = lama
    ? env.DB.prepare("UPDATE km_akun SET nama = ?, jabatan = ?, wa = ?, status = 'menunggu', garam = NULL, sandi_sha = NULL, atur_sha = NULL, atur_sampai = NULL, gagal = 0, kunci_sampai = NULL, diubah = ? WHERE id = ?").bind(v.pic, v.jabatan, v.wa, kini, lama.id)
    : env.DB.prepare("INSERT INTO km_akun (id, institusi_id, nama, jabatan, email, wa, status, dibuat, diubah) VALUES (?, ?, ?, ?, ?, ?, 'menunggu', ?, ?)").bind(acak(8), id, v.pic, v.jabatan, v.email, v.wa, kini, kini);
  try {
    await env.DB.batch([...(ada ? [] : [sisipInstitusi(env, id, v, null, kini, "daftar")]),
      ada?.status === "ditolak"
        ? env.DB.prepare("UPDATE km_kampus SET status = 'menunggu', surat_r2 = ?, alasan = NULL, disetujui = NULL, diubah = ?, oleh = 'daftar' WHERE institusi_id = ? AND status = 'ditolak'").bind(surat, kini, id)
        : env.DB.prepare("INSERT INTO km_kampus (institusi_id, status, surat_r2, dibuat, diubah, oleh) VALUES (?, 'menunggu', ?, ?, ?, 'daftar')").bind(id, surat, kini, kini),
      akunBaru,
      jejak(env, "km_kampus", id, ada?.status === "ditolak" ? "daftar_ulang" : "daftar", "daftar", kini, {dari: ada?.status ?? null, ke: "menunggu"})]);
  } catch (e) {
    await env.MEDIA.delete(surat);   // kunci acak milik kiriman ini saja
    if (/UNIQUE/i.test(String(e?.message))) return json(OK_KAMPUS, 201);
    throw e;
  }
  if (ada?.surat_r2) await env.MEDIA.delete(ada.surat_r2).catch(() => {});   // surat penolakan lama diganti
  return json(OK_KAMPUS, 201);
}

/* ================================================================ daftar anggota (PB, JSON) */
function cekAnggota(o) {
  const nama = tx(o.nama, 80), wa = normalWA(o.wa), email = typeof o.email === "string" ? o.email.trim().toLowerCase() : "";
  if (!nama || nama.length < 2) return {galat: "nama 2-80 karakter"};
  if (!wa) return {galat: "nomor WhatsApp tidak sah (contoh 0812xxxxxxx)"};
  if (!email || email.length > 254 || !RE_EMAIL.test(email)) return {galat: "email tidak sah"};
  if (typeof o.kampus_id !== "string" || !RE_ID.test(o.kampus_id)) return {galat: "pilih kampus"};
  if (typeof o.unsur !== "string" || !UNSUR.includes(o.unsur)) return {galat: `unsur harus salah satu dari ${UNSUR.join(", ")}`};
  if (typeof o.kab4 !== "string" || !/^\d{4}$/.test(o.kab4)) return {galat: "kabupaten/kota domisili tidak sah"};
  const k = o.keahlian;
  if (!Array.isArray(k) || !k.length || k.length > 15 || !k.every(x => typeof x === "string" && Object.hasOwn(KEAHLIAN, x)) || new Set(k).size !== k.length) return {galat: "pilih 1-15 keahlian dari daftar"};
  const prodi = tx(o.prodi, 100), instansi = o.unsur === "alumni" ? tx(o.instansi, 120) : null, angkatan = num(o.angkatan, 1960, 2035, true);
  if (prodi === undefined || (prodi && prodi.length < 2)) return {galat: "prodi 2-100 karakter"};
  if (instansi === undefined || (instansi && instansi.length < 2)) return {galat: "instansi 2-120 karakter"};
  if (Number.isNaN(angkatan)) return {galat: "angkatan 1960-2035"};
  const kab4_kerja = o.unsur === "alumni" && o.kab4_kerja != null && o.kab4_kerja !== "" ? o.kab4_kerja : null;
  if (kab4_kerja !== null && !(typeof kab4_kerja === "string" && /^\d{4}$/.test(kab4_kerja))) return {galat: "kabupaten/kota tempat kerja tidak sah"};
  if (o.setuju !== true) return {galat: "persetujuan pemrosesan data pribadi (UU PDP) wajib"};
  return {v: {nama, wa, email, kampus_id: o.kampus_id, unsur: o.unsur, kab4: o.kab4, keahlian: k, prodi, instansi, angkatan, kab4_kerja}};
}
async function daftarAnggota(env, req, url, kini) {
  const b = await bacaBody(req, 8192); if (b.galat) return gagal(b.status || 400, b.galat);
  const c = cekAnggota(b.o); if (c.galat) return gagal(400, c.galat);
  const v = c.v;
  const lj = await lajuIP(env, req, "kemitraan.daftar_anggota", [[JAM, 10]], kini); if (lj) return lj;   // laju dulu: Turnstile memanggil layanan luar
  if (!(await turnstileOK(env, b.o.turnstile, req))) return gagal(403, "verifikasi Turnstile gagal");
  const kode = await kodeKab(env, url); if (!kode) return gagal(503, "daftar wilayah belum tersedia");
  const kab = kode[v.kab4]; if (!kab) return gagal(400, "kabupaten/kota domisili tidak dikenal");
  if (v.kab4_kerja && !kode[v.kab4_kerja]) return gagal(400, "kabupaten/kota tempat kerja tidak dikenal");
  if (!(await env.DB.prepare("SELECT 1 FROM km_kampus WHERE institusi_id = ? AND status = 'aktif' AND dummy = 0").bind(v.kampus_id).first())) return gagal(404, "kampus tidak ditemukan atau belum aktif");
  const wa_sha = await hashKontak(env, "wa", v.wa), email_sha = await hashKontak(env, "email", v.email);
  for (const h of [wa_sha, email_sha]) { const lk = await laju(env, h.slice(0, 32), "kemitraan.daftar_kontak", [[HARI, 3]], kini); if (lk) return lk; }
  /* WA/email sudah dipakai relawan lain (atau daftar hitam): tidak membuat baris, jawaban identik dengan sukses (KP §5) */
  const dupe = await env.DB.prepare("SELECT 1 FROM relawan WHERE (anonim = 0 AND status NOT IN ('ditolak', 'nonaktif') AND (wa = ?1 OR email = ?2)) OR (status = 'daftar_hitam' AND (wa_sha = ?3 OR email_sha = ?4)) LIMIT 1").bind(v.wa, v.email, wa_sha, email_sha).first();
  if (dupe) return json(OK_ANGGOTA, 201);
  const id = acak(8);
  try {
    await env.DB.batch([
      env.DB.prepare(`INSERT INTO relawan (id, kode_sha, nama, wa, email, prov, kab, jalur, kampus_id, keahlian, hari_per_minggu, maks_hari, luar_provinsi, status, setuju_pdp, dibuat, diubah, wa_sha, email_sha)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'kampus', ?, ?, 1, 3, 0, 'terdaftar', 1, ?, ?, ?, ?)`).bind(id, await sha(acak(16)), v.nama, v.wa, v.email, kab.prov, kab.nama.slice(0, 60), v.kampus_id, JSON.stringify(v.keahlian), kini, kini, wa_sha, email_sha),
      env.DB.prepare("INSERT INTO km_anggota (relawan_id, unsur, prodi, angkatan, instansi, kab4_kerja, dibuat, diubah) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").bind(id, v.unsur, v.prodi, v.angkatan, v.instansi, v.kab4_kerja, kini, kini),
      jejak(env, "km_anggota", id, "daftar", "daftar", kini, {ke: "terdaftar"})]);
  } catch (e) { if (/UNIQUE/i.test(String(e?.message))) return json(OK_ANGGOTA, 201); throw e; }
  return json(OK_ANGGOTA, 201);
}

/* ================================================================ masuk, atur sandi, keluar (KK) */
async function masuk(env, req, url, kini) {
  const b = await bacaBody(req, 1024); if (b.galat) return gagal(b.status || 400, b.galat);
  const email = typeof b.o.email === "string" ? b.o.email.trim().toLowerCase().slice(0, 120) : "", sandi = typeof b.o.sandi === "string" ? b.o.sandi.slice(0, 100) : "";
  const lj = await lajuIP(env, req, "kemitraan.masuk", [[JAM, 20]], kini); if (lj) return lj;   // laju SEBELUM cek sandi
  const a = email ? await env.DB.prepare("SELECT id, institusi_id, nama, garam, sandi_sha, status, kunci_sampai FROM km_akun WHERE email = ? AND dummy = 0").bind(email).first() : null;
  const cek = await hashSandi(a?.garam ?? "0".repeat(32), sandi);   // hash SELALU dihitung (email tak dikenal, belum bersandi, atau terkunci): waktu jawab sama
  const terkunci = a?.kunci_sampai > kini;
  if (terkunci || !a?.sandi_sha || !sama(cek, a.sandi_sha)) {   // terkunci dijawab persis sama dengan email tak dikenal (tanpa oracle keberadaan akun); sandi benar pun ditolak selama kunci
    if (a && !terkunci) await env.DB.prepare("UPDATE km_akun SET kunci_sampai = CASE WHEN gagal + 1 >= ?1 THEN ?2 ELSE kunci_sampai END, gagal = CASE WHEN gagal + 1 >= ?1 THEN 0 ELSE gagal + 1 END WHERE id = ?3").bind(MAKS_GAGAL, kini + KUNCI_UMUR, a.id).run();
    return gagal(401, "email atau sandi salah");
  }
  if (a.status !== "aktif") return gagal(403, "akun belum aktif atau sudah dicabut; hubungi BNPB");
  const token = acak(32);
  await env.DB.batch([env.DB.prepare("INSERT INTO km_sesi (sha, akun_id, dibuat, sampai) VALUES (?, ?, ?, ?)").bind(await sha(token), a.id, kini, kini + SESI_UMUR),
    env.DB.prepare("DELETE FROM km_sesi WHERE akun_id = ? AND sampai <= ?").bind(a.id, kini),
    env.DB.prepare("UPDATE km_akun SET gagal = 0, kunci_sampai = NULL WHERE id = ?").bind(a.id)]);
  const r = json({jenis: "KK", nama: a.nama, institusi_id: a.institusi_id}); r.headers.append("set-cookie", cookieSet(token, SESI_UMUR / 1000)); return r;
}
async function aturSandi(env, req, url, kini) {
  const b = await bacaBody(req, 1024); if (b.galat) return gagal(b.status || 400, b.galat);
  const token = b.o.token, sandi = b.o.sandi;
  if (typeof token !== "string" || !/^[0-9a-f]{32}$/.test(token)) return gagal(400, "tautan atur sandi tidak sah");
  if (typeof sandi !== "string" || sandi.length < 10 || sandi.length > 100) return gagal(400, "sandi minimal 10 huruf, maksimal 100");
  const lj = await lajuIP(env, req, "kemitraan.atur", [[JAM, 20]], kini); if (lj) return lj;
  const tsha = await sha(token), a = await env.DB.prepare("SELECT id FROM km_akun WHERE atur_sha = ? AND atur_sampai > ? AND status = 'aktif'").bind(tsha, kini).first();
  const TOLAK = "tautan atur sandi tidak berlaku (sudah dipakai atau lewat 72 jam); minta tautan baru dari BNPB";
  if (!a) return gagal(403, TOLAK);
  const garam = acak(16), sandi_sha = await hashSandi(garam, sandi);
  /* sekali pakai: hanya satu permintaan yang mengubah baris (atur_sha dikosongkan di UPDATE yang sama) */
  const [u] = await env.DB.batch([env.DB.prepare("UPDATE km_akun SET garam = ?, sandi_sha = ?, atur_sha = NULL, atur_sampai = NULL, gagal = 0, kunci_sampai = NULL, diubah = ? WHERE atur_sha = ? AND atur_sampai > ? AND status = 'aktif'").bind(garam, sandi_sha, kini, tsha, kini),
    jejak(env, "km_akun", a.id, "atur_sandi", "kk:" + a.id, kini, {jikaUbah: true})]);
  if (!u.meta.changes) return gagal(403, TOLAK);
  await env.DB.prepare("DELETE FROM km_sesi WHERE akun_id = ?").bind(a.id).run();   // sandi baru mematikan sesi lama
  return json({ok: true});
}
async function keluar(env, req) {
  const t = tokenDari(req);
  if (t) await env.DB.prepare("DELETE FROM km_sesi WHERE sha = ?").bind(await sha(t)).run();
  const r = json({ok: true}); r.headers.append("set-cookie", cookieSet("", 0)); return r;
}

/* ================================================================ GET saya: profil menurut jenis (dipanggil kemitraan.js) */
export async function profilSaya(env, h) {
  if (h.peran === "KK") return env.DB.prepare("SELECT a.nama, a.jabatan, i.id kampus_id, i.nama kampus, k.status kampus_status FROM km_akun a JOIN institusi i ON i.id = a.institusi_id LEFT JOIN km_kampus k ON k.institusi_id = i.id WHERE a.id = ?").bind(h.akun_id).first();
  if (h.peran === "AG") return env.DB.prepare("SELECT r.nama, r.status, a.unsur, a.prodi, a.angkatan, a.mentor, i.id kampus_id, i.nama kampus FROM relawan r JOIN km_anggota a ON a.relawan_id = r.id LEFT JOIN institusi i ON i.id = r.kampus_id WHERE r.id = ?").bind(h.relawan_id).first();
  if (h.peran === "BP") return env.DB.prepare("SELECT nama, jabatan, kab4, prov, jenis, berlaku FROM km_bpbd_kode WHERE id = ?").bind(h.kode_id).first();
  if (h.peran === "PL") return env.DB.prepare("SELECT nama, jenis, berlaku FROM km_pl_kode WHERE id = ?").bind(h.kode_id).first();
  return null;
}

/* ================================================================ anggota: setujui, tolak, kode (KK kampusnya, ST) */
async function aksiAnggota(env, req, url, kini, ctx, p) {
  const h = await hakKm(env, req, kini), x = izin(h, ["SA", "ST", "KK"]); if (x) return x;
  if (h.peran === "KK" && h.institusi_id !== p.id) return gagal(403, "kampus ini bukan milikmu");
  const b = await bacaBody(req, 2048); if (b.galat) return gagal(b.status || 400, b.galat);
  const aksi = b.o.aksi;
  if (!["setujui", "tolak", "kode"].includes(aksi)) return gagal(400, "aksi harus setujui, tolak, atau kode");
  const lj = await laju(env, h.oleh, "kemitraan.tulis", [[JAM, 300]], kini); if (lj) return lj;
  const r = await env.DB.prepare("SELECT r.id, r.status FROM relawan r JOIN km_anggota a ON a.relawan_id = r.id WHERE r.id = ? AND r.kampus_id = ? AND r.anonim = 0").bind(p.rid, p.id).first();
  if (!r) return gagal(404, "anggota tidak ditemukan di kampus ini");
  if (!(await env.DB.prepare("SELECT 1 FROM km_kampus WHERE institusi_id = ? AND status = 'aktif'").bind(p.id).first())) return gagal(409, "kampus belum aktif");
  const oleh = h.oleh.slice(0, 64);
  if (aksi === "tolak") {
    const alasan = tx(b.o.alasan, 300);
    if (!alasan || alasan.length < 3) return gagal(400, "alasan penolakan 3-300 karakter");
    const [u] = await env.DB.batch([env.DB.prepare("UPDATE relawan SET status = 'ditolak', alasan = ?, diubah = ?, oleh = ? WHERE id = ? AND status = 'terdaftar'").bind(alasan, kini, oleh, r.id),
      jejak(env, "km_anggota", r.id, "tolak", h.oleh, kini, {dari: "terdaftar", ke: "ditolak", catatan: alasan, jikaUbah: true})]);
    return u.meta.changes ? json({ok: true, status: "ditolak"}) : gagal(409, `anggota berstatus ${r.status}, hanya yang terdaftar bisa ditolak`);
  }
  const k = await kodeBaru();   // setujui dan kode: kode lama mati (sha diganti), kode baru tampil SEKALI
  const [u] = aksi === "setujui"
    ? await env.DB.batch([env.DB.prepare("UPDATE relawan SET status = 'diverifikasi', kode_sha = ?, diverifikasi = ?, diubah = ?, oleh = ? WHERE id = ? AND status = 'terdaftar'").bind(k.kode_sha, kini, kini, oleh, r.id),
      jejak(env, "km_anggota", r.id, "setujui", h.oleh, kini, {dari: "terdaftar", ke: "diverifikasi", jikaUbah: true})])
    : await env.DB.batch([env.DB.prepare(`UPDATE relawan SET kode_sha = ?, diubah = ? WHERE id = ? AND status IN ${STATUS_AKTIF_ANGGOTA}`).bind(k.kode_sha, kini, r.id),
      jejak(env, "km_anggota", r.id, "kode_ulang", h.oleh, kini, {jikaUbah: true})]);
  if (!u.meta.changes) return gagal(409, aksi === "setujui" ? `anggota berstatus ${r.status}, hanya yang terdaftar bisa disetujui` : `anggota berstatus ${r.status}, kode hanya untuk anggota yang sudah disetujui`);
  const r2 = json({ok: true, status: aksi === "setujui" ? "diverifikasi" : r.status, kode: k.kode, tautan: `${url.origin}/kemitraan/saya#k=${k.kode}`});
  r2.headers.set("cache-control", "no-store");
  return r2;
}

/* ================================================================ kampus (ST semua, PM baca, KK miliknya) */
const LIHAT_KAMPUS = "i.id, i.nama, i.singkatan, i.jenis, i.prov, k.status, k.peran, k.simpul_id, k.kota, k.lat, k.lon, k.web, k.nama_akademisi, k.pusat_studi, k.fasilitas, k.mk_dibuka, k.renkon_ada, k.alasan, k.disetujui, k.dibuat, k.surat_r2 IS NOT NULL ada_surat";
const bentukKampus = r => ({...r, ada_surat: !!r.ada_surat, pusat_studi: r.pusat_studi ? urai(r.pusat_studi) : null, fasilitas: r.fasilitas ? urai(r.fasilitas) : null});
const bentukPerjanjian = (r, kini) => ({id: r.id, institusi_id: r.institusi_id, kampus: r.kampus ?? null, jenis: r.jenis, nomor: r.nomor, pihak: r.pihak, mulai: r.mulai, berakhir: r.berakhir, catatan: r.catatan, ada_berkas: !!r.berkas_r2, status: statusPerjanjian(r.berakhir, kini)});

async function daftarKampusAdmin(env, req, url, kini) {
  const h = await hakKm(env, req, kini), x = izin(h, ["SA", "ST", "PM", "KK"]); if (x) return x;
  const st = url.searchParams.get("status"), {per, off} = halaman(url);
  if (st && !["menunggu", "aktif", "ditolak", "dicabut"].includes(st)) return gagal(400, "status tidak dikenal");
  const sy = ["k.dummy = 0"], arg = [];
  if (h.peran === "KK") { sy.push("i.id = ?"); arg.push(h.institusi_id); }
  if (st) { sy.push("k.status = ?"); arg.push(st); }
  const W = sy.join(" AND ");
  const [rs, n] = await Promise.all([env.DB.prepare(`SELECT ${LIHAT_KAMPUS} FROM km_kampus k JOIN institusi i ON i.id = k.institusi_id WHERE ${W} ORDER BY (k.status = 'menunggu') DESC, i.nama LIMIT ? OFFSET ?`).bind(...arg, per, off).all(),
    env.DB.prepare(`SELECT count(*) n FROM km_kampus k JOIN institusi i ON i.id = k.institusi_id WHERE ${W}`).bind(...arg).first()]);
  return json({total: n.n, kampus: rs.results.map(bentukKampus)});
}

async function lembarKampus(env, req, url, kini, ctx, p) {
  const h = await hakKm(env, req, kini), x = izin(h, ["SA", "ST", "PM", "KK"]); if (x) return x;
  if (h.peran === "KK" && h.institusi_id !== p.id) return gagal(403, "kampus ini bukan milikmu");   // sebelum cari: KK tidak bisa menguji keberadaan kampus lain
  const k = await env.DB.prepare(`SELECT ${LIHAT_KAMPUS}, i.pic_nama, i.pic_jabatan, i.pic_email, i.pic_wa FROM km_kampus k JOIN institusi i ON i.id = k.institusi_id WHERE i.id = ?`).bind(p.id).first();
  if (!k) return gagal(404, "kampus tidak ditemukan");
  const {pic_nama, pic_jabatan, pic_email, pic_wa, ...kampus} = k, pj = await env.DB.prepare("SELECT p.*, i.nama kampus FROM km_perjanjian p LEFT JOIN institusi i ON i.id = p.institusi_id WHERE p.institusi_id = ? ORDER BY p.berakhir DESC LIMIT 100").bind(p.id).all();
  const lama = await env.DB.prepare("SELECT id, jenis_perjanjian, nomor, mulai, berakhir FROM institusi_perjanjian WHERE institusi_id = ? LIMIT 100").bind(p.id).all();
  const o = {kampus: bentukKampus(kampus), perjanjian: pj.results.map(r => bentukPerjanjian(r, kini)), perjanjian_lama: lama.results.map(r => ({...r, ...statusMou(r, kini)}))};
  if (h.peran !== "PM") o.pic = {nama: pic_nama, jabatan: pic_jabatan, email: pic_email, wa: pic_wa};
  if (staf(h)) o.akun = (await env.DB.prepare("SELECT id, nama, jabatan, email, wa, status, sandi_sha IS NOT NULL punya_sandi, atur_sampai FROM km_akun WHERE institusi_id = ?").bind(p.id).all()).results;
  if (h.peran === "PM") {   // agregat per unsur; kurang dari 5 orang tidak dirilis (KP §2)
    const agr = (await env.DB.prepare("SELECT a.unsur, count(*) n FROM relawan r JOIN km_anggota a ON a.relawan_id = r.id WHERE r.kampus_id = ? AND r.anonim = 0 AND r.status NOT IN ('ditolak', 'nonaktif') GROUP BY a.unsur").bind(p.id).all()).results;
    o.anggota_agregat = Object.fromEntries(UNSUR.map(u => { const n = agr.find(r => r.unsur === u)?.n ?? 0; return [u, n >= 5 ? n : "di bawah 5"]; }));
  } else {
    const {per, off} = halaman(url), st = url.searchParams.get("anggota");
    if (st && !["terdaftar", "diverifikasi", "siap_tugas", "ditugaskan", "bertugas", "selesai", "ditolak", "nonaktif"].includes(st)) return gagal(400, "status anggota tidak dikenal");
    const sy = "r.kampus_id = ?1 AND r.anonim = 0" + (st ? " AND r.status = ?4" : ""), arg = st ? [p.id, per, off, st] : [p.id, per, off];
    const rs = await env.DB.prepare(`SELECT r.id, r.nama, r.wa, r.email, r.status, r.alasan, r.dibuat, a.unsur, a.prodi, a.angkatan, a.instansi FROM relawan r JOIN km_anggota a ON a.relawan_id = r.id WHERE ${sy} ORDER BY (r.status = 'terdaftar') DESC, r.dibuat DESC LIMIT ?2 OFFSET ?3`).bind(...arg).all();
    o.anggota = rs.results;
    o.anggota_menunggu = (await env.DB.prepare("SELECT count(*) n FROM relawan WHERE kampus_id = ? AND anonim = 0 AND status = 'terdaftar'").bind(p.id).first()).n;
  }
  return json(o);
}

const URL_HTTPS = s => typeof s === "string" && s.length <= 200 && s.startsWith("https://") && URL.canParse(s);
/* profil kampus (KK miliknya, ST): kolom hanya yang dikirim; null mengosongkan. Mengembalikan {set: {kolom: nilai}} atau {galat}. */
function cekProfil(o) {
  const set = {}, ada = k => Object.hasOwn(o, k);
  if (ada("kota")) { const t = tx(o.kota, 60); if (t === undefined || (t && t.length < 2)) return {galat: "kota 2-60 karakter"}; set.kota = t; }
  for (const [k, lo, hi] of [["lat", -11.5, 6.5], ["lon", 94.5, 141.5]]) if (ada(k)) { const n = num(o[k], lo, hi); if (Number.isNaN(n)) return {galat: `${k} harus di dalam Indonesia (${lo} sampai ${hi})`}; set[k] = n; }
  if (ada("web")) { if (o.web !== null && o.web !== "" && !URL_HTTPS(o.web)) return {galat: "web harus alamat https:// (maksimal 200 huruf)"}; set.web = o.web || null; }
  if (ada("nama_akademisi")) { const t = tx(o.nama_akademisi, 160); if (t === undefined) return {galat: "nama_akademisi maksimal 160 karakter"}; set.nama_akademisi = t; }
  for (const k of ["mk_dibuka", "renkon_ada"]) if (ada(k)) { const n = num(o[k], 2026, 2035, true); if (Number.isNaN(n)) return {galat: `${k} harus tahun 2026-2035`}; set[k] = n; }
  if (ada("pusat_studi")) {
    const a = o.pusat_studi;
    if (a === null) set.pusat_studi = null;
    else { const t = Array.isArray(a) && a.length <= 10 ? a.map(x => tx(x, 100)) : null; if (!t || t.some(x => !x || x.length < 2)) return {galat: "pusat_studi: larik maksimal 10 nama 2-100 karakter"}; set.pusat_studi = JSON.stringify(t); }
  }
  if (ada("fasilitas")) {
    const a = o.fasilitas;
    if (a === null) set.fasilitas = null;
    else {
      const t = Array.isArray(a) && a.length <= 20 ? a.map(f => {
        if (!f || typeof f !== "object" || !JENIS_FASILITAS.includes(f.jenis)) return null;
        const nama = tx(f.nama, 100), kap = num(f.kapasitas, 0, 1e6, true), lat = num(f.lat, -11.5, 6.5), lon = num(f.lon, 94.5, 141.5);
        return !nama || nama.length < 2 || [kap, lat, lon].some(Number.isNaN) ? null : {jenis: f.jenis, nama, kapasitas: kap, lat, lon};
      }) : null;
      if (!t || t.includes(null)) return {galat: `fasilitas: larik maksimal 20 butir {jenis (${JENIS_FASILITAS.join("/")}), nama, kapasitas, lat, lon}`};
      set.fasilitas = JSON.stringify(t);
    }
  }
  return Object.keys(set).length ? {set} : {galat: "tidak ada kolom profil yang dikirim"};
}
async function ubahKampus(env, req, url, kini, ctx, p) {
  const h = await hakKm(env, req, kini), x = izin(h, ["SA", "ST", "KK"]); if (x) return x;
  if (h.peran === "KK" && h.institusi_id !== p.id) return gagal(403, "kampus ini bukan milikmu");
  const b = await bacaBody(req, 16384); if (b.galat) return gagal(b.status || 400, b.galat);
  const aksi = b.o.aksi;
  if (!["setujui", "tolak", "profil", "tautan"].includes(aksi)) return gagal(400, "aksi harus setujui, tolak, profil, atau tautan");
  if (aksi !== "profil" && !staf(h)) return gagal(403, "hanya staf BNPB yang boleh menyetujui, menolak, atau menerbitkan tautan");
  const lj = await laju(env, h.oleh, "kemitraan.tulis", [[JAM, 300]], kini); if (lj) return lj;
  const k = await env.DB.prepare("SELECT status FROM km_kampus WHERE institusi_id = ? AND dummy = 0").bind(p.id).first();
  if (!k) return gagal(404, "kampus tidak ditemukan");
  const oleh = h.oleh.slice(0, 80);
  if (aksi === "profil") {
    if (k.status !== "aktif") return gagal(409, "profil hanya bisa diubah untuk kampus yang aktif");
    const c = cekProfil(b.o); if (c.galat) return gagal(400, c.galat);
    const kol = Object.keys(c.set);
    await env.DB.batch([env.DB.prepare(`UPDATE km_kampus SET ${kol.map(k2 => `${k2} = ?`).join(", ")}, diubah = ? WHERE institusi_id = ?`).bind(...kol.map(k2 => c.set[k2]), kini, p.id),
      jejak(env, "km_kampus", p.id, "profil", h.oleh, kini, {catatan: kol.join(",")})]);
    return json({ok: true});
  }
  if (aksi === "tolak") {
    const alasan = tx(b.o.alasan, 500);
    if (!alasan || alasan.length < 3) return gagal(400, "alasan penolakan 3-500 karakter");
    if (k.status !== "menunggu") return gagal(409, `kampus berstatus ${k.status}, hanya yang menunggu bisa ditolak`);
    await env.DB.batch([env.DB.prepare("UPDATE km_kampus SET status = 'ditolak', alasan = ?, oleh = ?, diubah = ? WHERE institusi_id = ? AND status = 'menunggu'").bind(alasan, oleh, kini, p.id),
      env.DB.prepare("UPDATE km_akun SET status = 'ditolak', diubah = ? WHERE institusi_id = ? AND status = 'menunggu'").bind(kini, p.id),
      jejak(env, "km_kampus", p.id, "tolak", h.oleh, kini, {dari: "menunggu", ke: "ditolak", catatan: alasan})]);
    return json({ok: true, status: "ditolak"});
  }
  /* setujui dan tautan: token atur sandi 32 hex, 72 jam, hanya sha di D1, tampil SEKALI */
  let stmt = [];
  if (aksi === "setujui") {
    if (k.status !== "menunggu") return gagal(409, `kampus berstatus ${k.status}, hanya yang menunggu bisa disetujui`);
    const peran = b.o.peran, simpul = b.o.simpul_id ?? null;
    if (typeof peran !== "string" || !PERAN_KAMPUS.includes(peran)) return gagal(400, `peran kampus harus salah satu dari ${PERAN_KAMPUS.join(", ")}`);
    if (simpul !== null && (peran !== "satelit" || typeof simpul !== "string" || !RE_ID.test(simpul) || !(await env.DB.prepare("SELECT 1 FROM km_kampus WHERE institusi_id = ? AND peran = 'simpul' AND status = 'aktif'").bind(simpul).first()))) return gagal(400, "simpul_id hanya untuk satelit dan harus kampus simpul yang aktif");
    stmt = [env.DB.prepare("UPDATE km_kampus SET status = 'aktif', peran = ?, simpul_id = ?, alasan = NULL, disetujui = ?, oleh = ?, diubah = ? WHERE institusi_id = ? AND status = 'menunggu'").bind(peran, simpul, kini, oleh, kini, p.id),
      jejak(env, "km_kampus", p.id, "setujui", h.oleh, kini, {dari: "menunggu", ke: "aktif", catatan: peran, jikaUbah: true})];
  } else if (k.status !== "aktif") return gagal(409, "tautan hanya untuk kampus yang aktif");
  const token = acak(16), akun = await env.DB.prepare("SELECT id, wa FROM km_akun WHERE institusi_id = ? AND status IN ('menunggu', 'aktif') ORDER BY dibuat LIMIT 1").bind(p.id).first();
  if (!akun) return gagal(409, "kampus ini tidak punya akun koordinator");
  const [u] = await env.DB.batch([...stmt, env.DB.prepare("UPDATE km_akun SET status = 'aktif', atur_sha = ?, atur_sampai = ?, diubah = ? WHERE id = ? AND (SELECT status FROM km_kampus WHERE institusi_id = ?) = 'aktif'").bind(await sha(token), kini + ATUR_UMUR, kini, akun.id, p.id),
    jejak(env, "km_akun", akun.id, "tautan_atur", h.oleh, kini)]);
  if (aksi === "setujui" && !u.meta.changes) return gagal(409, "kampus sudah diproses staf lain");
  const r = json({ok: true, status: "aktif", token, tautan: `${url.origin}/kemitraan/masuk?atur=${token}`, berlaku_sampai: kini + ATUR_UMUR, wa: akun.wa});
  return r;
}

/* surat tugas kampus: hanya staf (dibaca saat menimbang persetujuan) */
async function suratKampus(env, req, url, kini, ctx, p) {
  const h = await hakKm(env, req, kini), x = izin(h, ["SA", "ST"]); if (x) return x;
  if (!env.MEDIA) return tanpaMedia();
  const k = await env.DB.prepare("SELECT surat_r2 FROM km_kampus WHERE institusi_id = ?").bind(p.id).first();
  return k?.surat_r2 ? unduh(env, k.surat_r2, `surat-tugas-${p.id}.pdf`) : gagal(404, "surat tugas tidak ada");
}

/* ================================================================ perjanjian (ST semua, PM baca, KK miliknya) */
async function daftarPerjanjian(env, req, url, kini) {
  const h = await hakKm(env, req, kini), x = izin(h, ["SA", "ST", "PM", "KK"]); if (x) return x;
  const {per, off} = halaman(url), inst = h.peran === "KK" ? h.institusi_id : url.searchParams.get("institusi_id");
  if (inst && !RE_ID.test(inst)) return gagal(400, "institusi_id tidak sah");
  const W = inst ? "WHERE p.institusi_id = ? AND p.dummy = 0" : "WHERE p.dummy = 0", arg = inst ? [inst] : [];
  const rs = await env.DB.prepare(`SELECT p.*, i.nama kampus FROM km_perjanjian p LEFT JOIN institusi i ON i.id = p.institusi_id ${W} ORDER BY p.berakhir LIMIT ? OFFSET ?`).bind(...arg, per, off).all();
  return json({perjanjian: rs.results.map(r => bentukPerjanjian(r, kini))});
}
function cekPerjanjian(o, h) {
  const nomor = tx(o.nomor, 80), pihak = tx(o.pihak, 200), catatan = tx(o.catatan, 500);
  if (typeof o.jenis !== "string" || !JENIS_PERJANJIAN.includes(o.jenis)) return {galat: `jenis harus salah satu dari ${JENIS_PERJANJIAN.join(", ")}`};
  if (!nomor || nomor.length < 3) return {galat: "nomor perjanjian 3-80 karakter"};
  if (!pihak || pihak.length < 3) return {galat: "pihak 3-200 karakter"};
  if (catatan === undefined) return {galat: "catatan maksimal 500 karakter"};
  if (typeof o.mulai !== "string" || !tglSah(o.mulai) || typeof o.berakhir !== "string" || !tglSah(o.berakhir)) return {galat: "tanggal mulai dan berakhir harus YYYY-MM-DD yang sah"};
  if (o.berakhir <= o.mulai) return {galat: "tanggal berakhir harus sesudah tanggal mulai"};
  let inst = h.peran === "KK" ? h.institusi_id : o.institusi_id ?? null;
  if (o.jenis === "mou_payung") { if (h.peran === "KK") return {galat: "MoU payung hanya dicatat staf BNPB", status: 403}; inst = null; }
  else if (typeof inst !== "string" || !RE_ID.test(inst)) return {galat: "institusi_id wajib untuk perjanjian selain MoU payung"};
  return {v: {jenis: o.jenis, nomor, pihak, catatan, mulai: o.mulai, berakhir: o.berakhir, inst}};
}
async function buatPerjanjian(env, req, url, kini) {
  const h = await hakKm(env, req, kini), x = izin(h, ["SA", "ST", "KK"]); if (x) return x;
  if (!env.MEDIA) return tanpaMedia();
  const lj = await laju(env, h.oleh, "kemitraan.berkas", [[JAM, 60]], kini); if (lj) return lj;
  const m = await formulir(req, MAKS_PERJANJIAN); if (m.r) return m.r;
  const c = cekPerjanjian(m.o, h); if (c.galat) return gagal(c.status || 400, c.galat);
  const v = c.v;
  if (v.inst && !(await env.DB.prepare("SELECT 1 FROM km_kampus WHERE institusi_id = ? AND status = 'aktif' AND dummy = 0").bind(v.inst).first())) return gagal(404, "kampus aktif tidak ditemukan");
  let bytes = null;
  if (m.berkas) { const p = await bacaPdf(m.berkas, MAKS_PERJANJIAN); if (p.r) return p.r; bytes = p.bytes; }
  const id = acak(8), kunci = bytes ? `kemitraan/perjanjian/${id}.pdf` : null;
  if (bytes) await env.MEDIA.put(kunci, bytes, {httpMetadata: {contentType: "application/pdf"}});
  try {
    await env.DB.batch([env.DB.prepare("INSERT INTO km_perjanjian (id, institusi_id, jenis, nomor, pihak, mulai, berakhir, berkas_r2, catatan, dibuat, diubah, oleh) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
        .bind(id, v.inst, v.jenis, v.nomor, v.pihak, v.mulai, v.berakhir, kunci, v.catatan, kini, kini, h.oleh.slice(0, 80)),
      jejak(env, "km_perjanjian", id, "tambah", h.oleh, kini, {ke: v.jenis})]);
  } catch (e) { if (kunci) await env.MEDIA.delete(kunci); throw e; }
  return json({ok: true, id, status: statusPerjanjian(v.berakhir, kini)}, 201);
}
async function unduhPerjanjian(env, req, url, kini, ctx, p) {
  const h = await hakKm(env, req, kini), x = izin(h, ["SA", "ST", "PM", "KK"]); if (x) return x;
  if (!env.MEDIA) return tanpaMedia();
  const r = await env.DB.prepare("SELECT institusi_id, berkas_r2 FROM km_perjanjian WHERE id = ? AND dummy = 0").bind(p.id).first();
  if (h.peran === "KK" && (!r || r.institusi_id !== h.institusi_id)) return gagal(403, "perjanjian ini bukan milik kampusmu");   // sama untuk tidak ada dan milik lain
  return r?.berkas_r2 ? unduh(env, r.berkas_r2, `perjanjian-${p.id}.pdf`) : gagal(404, "berkas perjanjian tidak ada");
}

/* ================================================================ kode BPBD (ST) */
async function kodeBpbd(env, req, url, kini) {
  const h = await hakKm(env, req, kini), x = izin(h, ["SA", "ST"]); if (x) return x;
  const b = await bacaBody(req, 2048); if (b.galat) return gagal(b.status || 400, b.galat);
  const nama = tx(b.o.nama, 80), jabatan = tx(b.o.jabatan, 100), wa = b.o.wa == null || b.o.wa === "" ? null : normalWA(b.o.wa), hari = num(b.o.berlaku_hari, 30, 365, true);
  if (typeof b.o.kab4 !== "string" || !/^\d{4}$/.test(b.o.kab4)) return gagal(400, "kab4 harus 4 digit kode kabupaten/kota");
  if (!nama || nama.length < 2) return gagal(400, "nama petugas 2-80 karakter");
  if (jabatan === undefined || (jabatan && jabatan.length < 2)) return gagal(400, "jabatan 2-100 karakter");
  if (b.o.wa != null && b.o.wa !== "" && !wa) return gagal(400, "WA tidak sah (contoh 0812xxxxxxx)");
  if (hari === null || Number.isNaN(hari)) return gagal(400, "berlaku_hari harus 30-365");
  const lj = await laju(env, h.oleh, "kemitraan.berkas", [[JAM, 60]], kini); if (lj) return lj;
  const kode = await kodeKab(env, url); if (!kode) return gagal(503, "daftar wilayah belum tersedia");
  const kab = kode[b.o.kab4]; if (!kab || !Object.hasOwn(PROV, kab.prov)) return gagal(400, "kab4 tidak dikenal");
  const id = acak(8), k = await kodeBaru(), berlaku = kini + hari * HARI;
  await env.DB.batch([env.DB.prepare("INSERT INTO km_bpbd_kode (id, kode_sha, kab4, prov, nama, jabatan, wa, jenis, berlaku, dibuat, oleh) VALUES (?, ?, ?, ?, ?, ?, ?, 'bpbd', ?, ?, ?)")
      .bind(id, k.kode_sha, b.o.kab4, kab.prov, nama, jabatan, wa, berlaku, kini, h.oleh.slice(0, 80)),
    jejak(env, "km_bpbd_kode", id, "terbit", h.oleh, kini, {ke: b.o.kab4})]);
  return json({ok: true, id, kode: k.kode, tautan: `${url.origin}/kemitraan/saya#k=${k.kode}`, kab4: b.o.kab4, berlaku, wa}, 201);
}

/* ================================================================ publik: kampus aktif untuk form daftar (DT §4.3) */
async function kampusPublik(env) {
  const rs = await env.DB.prepare("SELECT i.id, i.nama, i.singkatan, i.prov FROM km_kampus k JOIN institusi i ON i.id = k.institusi_id WHERE k.status = 'aktif' AND k.dummy = 0 ORDER BY i.nama LIMIT 1000").all();
  return json({kampus: rs.results}, 200, {"cache-control": "public, max-age=300"});
}

export function ruteAkun() {
  return {
    "GET /api/kemitraan/publik/kampus": (env, req, url, kini, ctx) => cacheTepi(req, ctx, 300, () => kampusPublik(env), true),   // cache tepi 300 dtk: miss tidak membaca D1 tiap permintaan
    "POST /api/kemitraan/daftar/kampus": daftarKampus,
    "POST /api/kemitraan/daftar/anggota": daftarAnggota,
    "POST /api/kemitraan/masuk": masuk,
    "POST /api/kemitraan/atur-sandi": aturSandi,
    "POST /api/kemitraan/keluar": (env, req) => keluar(env, req),
    "GET /api/kemitraan/kampus": daftarKampusAdmin,
    "GET /api/kemitraan/kampus/:id": lembarKampus,
    "POST /api/kemitraan/kampus/:id": ubahKampus,
    "GET /api/kemitraan/kampus/:id/surat": suratKampus,
    "POST /api/kemitraan/kampus/:id/anggota/:rid": aksiAnggota,
    "GET /api/kemitraan/perjanjian": daftarPerjanjian,
    "POST /api/kemitraan/perjanjian": buatPerjanjian,
    "GET /api/kemitraan/perjanjian/:id": unduhPerjanjian,
    "POST /api/kemitraan/bpbd-kode": kodeBpbd,
  };
}
