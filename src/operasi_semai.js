/* Peluang semai awan: berkas prakiraan R2 + target renlap OMC (data/kajian-bnpb/semai-awan/DESAIN-TEKNIS.md §5, KEAMANAN-PRIVASI.md §4; skema migrations/0129_semai_target.sql).
   Baca = hak yang sama dengan /api/operasi/peta. Tulis = stafPeran PERAN_TULIS atau modOK (S7). Koordinat, skor, alasan, jendela SELALU dari arsip R2 putaran, bukan badan klien. */
import {json, gagal, bacaBody, adminOK} from "./worker.js";
import {wib, modOK} from "./posko.js";
import {stafPeran, pemirsaLihat} from "./staf.js";
import {PERAN_BACA, bungkus} from "./operasi_udara.js";
import {smTargetHari, smTargetRentang, smBase, smTargetAktif, smLajuBuat, smSisip, smLajuHapus, smHapus, ssHari, ssAktif, ssLajuBuat, ssLajuHapus, ssSisip, ssHapus} from "./hak.js";
import {NAMA_KAB4} from "./siklus_kab.js";

export const PERAN_TULIS = ["pusdalops", "tmc"];
const MAKS_HARI = 30, HARI = 864e5;
const NAMA_SAH = n => n === "semai.json" || n === "angin_asap.json" || n === "semai_banjir.json" || n === "rapor_banjir.json" || /^arsip\/\d{10}(_banjir)?\.json$/.test(n)
  || (/^(awan|asap)_(\d{1,2})\.png$/.test(n) && (m => m <= 36 && m % 3 === 0)(Number(n.match(/_(\d+)\./)[1])));
const teks = (v, maks) => typeof v === "string" ? v.replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim().slice(0, maks) : "";
const bacaOK = async (env, req) => await adminOK(env, req) || await stafPeran(env, req, PERAN_BACA) || await pemirsaLihat(env, req);
const tglSah = t => typeof t === "string" && /^\d{4}-\d\d-\d\d$/.test(t) && !Number.isNaN(Date.parse(t));
const sha = async s => new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)));
/* SEMAI_TOKEN (DESAIN-TEKNIS semai-banjir §4.1): hanya dipanggil dari dua rute GET di bawah; tanpa sesi, tanpa peran. Banding waktu tetap atas hash SHA-256.
   Rahasia kosong = jalur mati. Dicek SEBELUM adminOK supaya token pipeline tidak masuk hitungan gagal-admin per IP. */
async function tokenOK(env, req) {
  const t = (req.headers.get("authorization") || "").match(/^Bearer\s+(\S+)$/i)?.[1];
  if (!t || typeof env.SEMAI_TOKEN !== "string" || !env.SEMAI_TOKEN) return false;
  const [a, b] = await Promise.all([sha(t), sha(env.SEMAI_TOKEN)]); let d = 0;
  for (let i = 0; i < 32; i++) d |= a[i] ^ b[i];
  return d === 0;
}
/* null = boleh; selain itu Response: 401 bila ada Bearer yang tidak sah, 403 bila tanpa kredensial */
async function bacaAtauToken(env, req, pesan) {
  if (await tokenOK(env, req) || await bacaOK(env, req)) return null;
  return gagal(/^Bearer\s/i.test(req.headers.get("authorization") || "") ? 401 : 403, pesan);
}

async function berkas(env, req, url, kini, ctx, nama) {
  if (!await bacaOK(env, req)) return gagal(403, "prakiraan semai awan hanya untuk akun centurisk97, staf berperan, atau moderator");
  if (!NAMA_SAH(nama || "")) return gagal(404, "berkas tidak ada");
  if (!env.MEDIA) return gagal(503, "penyimpanan belum aktif");
  const o = await env.MEDIA.get("operasi/semai/" + nama); if (!o) return gagal(404, "berkas tidak ada");
  return new Response(o.body, {headers: {"content-type": nama.endsWith(".png") ? "image/png" : "application/json; charset=utf-8", "cache-control": "private, max-age=600", "x-content-type-options": "nosniff"}});
}

async function daftar(env, req, url, kini) {
  const tolak = await bacaAtauToken(env, req, "target semai awan hanya untuk akun centurisk97, staf berperan, atau moderator"); if (tolak) return tolak;
  const t = url.searchParams.get("tanggal") ?? wib(kini), sejak = url.searchParams.get("sejak");
  if (!tglSah(t)) return gagal(400, "tanggal harus YYYY-MM-DD yang sah");
  if (sejak != null && (!tglSah(sejak) || sejak > t || Date.parse(t) - Date.parse(sejak) > 120 * HARI)) return gagal(400, "sejak harus YYYY-MM-DD sah, tidak melewati tanggal, rentang paling lama 120 hari");
  const r = sejak == null ? await smTargetHari(env, t) : await smTargetRentang(env, sejak, t);
  return json(r, 200, {"cache-control": "no-store"});
}

/* hak tulis + badan; mengembalikan {oleh, o} atau Response */
async function masuk(env, req) {
  const m = await modOK(env, req), oleh = m ? "admin:" + m : await stafPeran(env, req, PERAN_TULIS);
  if (!oleh) return gagal(403, "target semai awan hanya untuk staf Pusdalops, TMC, atau moderator");
  if (!env.IP_SALT) return gagal(503, "server belum dikonfigurasi (IP_SALT)");
  const b = await bacaBody(req, 4096); if (b.galat) return gagal(b.status || 400, b.galat);
  return {oleh, o: b.o};
}

async function buat(env, req, url, kini) {
  const p = await masuk(env, req); if (p instanceof Response) return p;
  const {oleh, o} = p, {zona_id, putaran, base_id, tanggal} = o;
  if (typeof zona_id !== "string" || !/^\d{10}-B?[A-E]$/.test(zona_id)) return gagal(400, "zona_id harus 10 angka, tanda hubung, huruf A sampai E (awalan B untuk semai banjir)");
  const banjir = zona_id.length === 13;
  if (typeof putaran !== "string" || !/^\d{10}$/.test(putaran) || putaran !== zona_id.slice(0, 10)) return gagal(400, "putaran harus 10 angka dan sama dengan awal zona_id");
  if (typeof tanggal !== "string" || ![wib(kini), wib(kini + HARI)].includes(tanggal)) return gagal(400, "tanggal harus hari ini atau besok (WIB)");
  if (o.catatan != null && (typeof o.catatan !== "string" || o.catatan.length > 500)) return gagal(400, "catatan maksimal 500 huruf");
  const catatan = o.catatan == null ? null : teks(o.catatan, 500) || null;
  if (typeof base_id !== "string") return gagal(400, "base_id tidak sah");
  if (!env.MEDIA) return gagal(503, "penyimpanan belum aktif");
  const ar = await env.MEDIA.get(`operasi/semai/arsip/${putaran}${banjir ? "_banjir" : ""}.json`);
  let z, hariSasaran; try { const a = await ar?.json(); z = a?.zona?.find(x => x.id === zona_id); hariSasaran = a?.hari_sasaran; } catch (e) { z = null; }
  if (!z) return gagal(404, "zona tidak ada di putaran itu");
  // Lapis B: hari sasaran dari arsip, bukan dari badan klien (DESAIN-TEKNIS semai-banjir §4.1)
  if (banjir && !tglSah(hariSasaran)) return gagal(404, "arsip banjir tanpa hari_sasaran");
  const alasan = banjir ? {...(z.alasan && typeof z.alasan === "object" ? z.alasan : {}), hari_sasaran: hariSasaran} : z.alasan ?? [];
  let icao, nama;  // base = bandara terdekat dari arsip (S10), atau base op_base lain
  if (z.base?.id === base_id) ({icao, nama} = z.base);
  else { const b = await smBase(env, base_id); if (!b) return gagal(400, "base_id tidak ada di arsip zona maupun daftar base"); ({icao, nama} = b); }
  icao = teks(icao, 8) || null; nama = teks(nama, 80) || null;
  const mulai = z.jendela?.[0], selesai = z.jendela?.[1];
  if (!(Date.parse(selesai) > kini)) return gagal(400, "jendela terbang zona ini sudah lewat");
  if (await smTargetAktif(env, zona_id, base_id)) return gagal(409, "zona ini sudah jadi target untuk base itu");
  const awal = new Date(Date.parse(wib(kini) + "T00:00:00+07:00")).toISOString();
  // ponytail: cek baca-lalu-tulis tanpa kunci, dua isian serentak bisa melewati batas harian sedikit; duplikat tetap dijaga indeks unik
  if (await smLajuBuat(env, oleh, awal) >= MAKS_HARI) return gagal(429, `maksimal ${MAKS_HARI} target per hari per akun`);
  const id = crypto.randomUUID();
  try {
    await smSisip(env, id, zona_id, putaran, base_id, icao, nama, tanggal, z.lat, z.lon, mulai, selesai, z.skor, JSON.stringify(alasan), catatan, oleh, new Date(kini).toISOString());
  } catch (e) {
    if (/UNIQUE/i.test(String(e?.message || e))) return gagal(409, "zona ini sudah jadi target untuk base itu");
    if (/CHECK/i.test(String(e?.message || e))) return gagal(400, "koordinat atau skor zona di arsip tidak sah");
    throw e;
  }
  return json({ok: true, id}, 201);
}

async function hapus(env, req, url, kini) {
  const p = await masuk(env, req); if (p instanceof Response) return p;
  const {oleh, o} = p, alasan = teks(o.alasan, 300);
  if (typeof o.id !== "string" || o.id.length > 60) return gagal(400, "id tidak sah");
  if (typeof o.alasan !== "string" || o.alasan.length > 300 || alasan.length < 5) return gagal(400, "alasan wajib 5 sampai 300 huruf");
  const awal = new Date(Date.parse(wib(kini) + "T00:00:00+07:00")).toISOString();
  if (await smLajuHapus(env, oleh, awal) >= MAKS_HARI) return gagal(429, `maksimal ${MAKS_HARI} hapus per hari per akun`);
  return await smHapus(env, new Date(kini).toISOString(), alasan, oleh, o.id) ? json({ok: true}) : gagal(404, "target tidak ada atau sudah dihapus");
}

async function sasaranDaftar(env, req, url, kini) {
  const tolak = await bacaAtauToken(env, req, "sasaran semai banjir hanya untuk akun centurisk97, staf berperan, atau moderator"); if (tolak) return tolak;
  const t = url.searchParams.get("tanggal") ?? wib(kini);
  if (!tglSah(t)) return gagal(400, "tanggal harus YYYY-MM-DD yang sah");
  return json(await ssHari(env, t), 200, {"cache-control": "no-store"});
}

async function sasaranBuat(env, req, url, kini) {
  const p = await masuk(env, req); if (p instanceof Response) return p;
  const {oleh, o} = p, {kab, tanggal} = o;
  if (typeof kab !== "string" || !/^\d{4}$/.test(kab) || !Object.hasOwn(NAMA_KAB4, kab)) return gagal(400, "kab harus kode kab/kota 4 angka yang ada di daftar");
  if (typeof tanggal !== "string" || ![wib(kini), wib(kini + HARI)].includes(tanggal)) return gagal(400, "tanggal harus hari ini atau besok (WIB)");
  if (o.catatan != null && (typeof o.catatan !== "string" || o.catatan.length > 300)) return gagal(400, "catatan maksimal 300 huruf");
  const catatan = o.catatan == null ? null : teks(o.catatan, 300) || null;
  if (await ssAktif(env, kab, tanggal)) return gagal(409, "kab itu sudah jadi sasaran untuk tanggal itu");
  const awal = new Date(Date.parse(wib(kini) + "T00:00:00+07:00")).toISOString();
  // ponytail: baca-lalu-tulis tanpa kunci, seperti target; duplikat tetap dijaga indeks unik
  if (await ssLajuBuat(env, oleh, awal) >= MAKS_HARI) return gagal(429, `maksimal ${MAKS_HARI} sasaran per hari per akun`);
  const id = crypto.randomUUID();
  try { await ssSisip(env, id, kab, tanggal, catatan, oleh, new Date(kini).toISOString()); }
  catch (e) { if (/UNIQUE/i.test(String(e?.message || e))) return gagal(409, "kab itu sudah jadi sasaran untuk tanggal itu"); throw e; }
  return json({ok: true, id}, 201);
}

async function sasaranHapus(env, req, url, kini) {
  const p = await masuk(env, req); if (p instanceof Response) return p;
  const {oleh, o} = p, alasan = teks(o.alasan, 300);
  if (typeof o.id !== "string" || o.id.length > 60) return gagal(400, "id tidak sah");
  if (typeof o.alasan !== "string" || o.alasan.length > 300 || alasan.length < 5) return gagal(400, "alasan wajib 5 sampai 300 huruf");
  const awal = new Date(Date.parse(wib(kini) + "T00:00:00+07:00")).toISOString();
  if (await ssLajuHapus(env, oleh, awal) >= MAKS_HARI) return gagal(429, `maksimal ${MAKS_HARI} hapus per hari per akun`);
  return await ssHapus(env, new Date(kini).toISOString(), alasan, oleh, o.id) ? json({ok: true}) : gagal(404, "sasaran tidak ada atau sudah dihapus");
}

export const RUTE_SEMAI = Object.fromEntries(Object.entries({
  "GET /api/operasi/semai/berkas/:nama": berkas,
  "GET /api/operasi/semai/target": daftar,
  "POST /api/operasi/semai/target": buat,
  "POST /api/operasi/semai/target/hapus": hapus,
  "GET /api/operasi/semai/sasaran": sasaranDaftar,
  "POST /api/operasi/semai/sasaran": sasaranBuat,
  "POST /api/operasi/semai/sasaran/hapus": sasaranHapus,
}).map(([k, f]) => [k, bungkus(f)]));
