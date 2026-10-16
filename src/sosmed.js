/* Kurasi post media sosial untuk tab Berita: admin menempel URL (Instagram, X, Threads), layar publik menampilkan embed iframe.
   Skema: migrations/0012_sosmed.sql. Hanya URL kanonik yang disimpan; URL embed dihitung ulang dari situ (uraiSosmed) tiap dibaca,
   jadi bentuk embed bisa diganti tanpa migrasi dan D1 tidak pernah memuat URL yang tak lolos uraian. */
import {json, gagal, acak, adminOK, bacaBody, cacheTepi} from "./worker.js";

/* murni: URL post -> {platform, kode, akun, url, embed}; null bila bukan https atau host/jalur tak dikenal. Query & fragmen dibuang. */
export function uraiSosmed(teksUrl) {
  let u; try { u = new URL(String(teksUrl).trim()); } catch (e) { return null; }
  if (u.protocol !== "https:" || u.username || u.password || u.port) return null;
  const h = u.hostname.replace(/^(www|mobile)\./, ""), p = u.pathname;
  let m;
  if (h === "instagram.com" && (m = p.match(/^\/(?:p|reel|tv)\/([A-Za-z0-9_-]{5,40})\/?$/)))
    return {platform: "instagram", kode: m[1], akun: null, url: `https://www.instagram.com/p/${m[1]}/`, embed: `https://www.instagram.com/p/${m[1]}/embed/captioned/`};
  if ((h === "x.com" || h === "twitter.com") && (m = p.match(/^\/([A-Za-z0-9_]{1,15})\/status\/(\d{5,25})\/?$/)))
    return {platform: "x", kode: m[2], akun: "@" + m[1], url: `https://x.com/${m[1]}/status/${m[2]}`, embed: `https://platform.twitter.com/embed/Tweet.html?id=${m[2]}&dnt=true&lang=id`};
  if ((h === "threads.net" || h === "threads.com") && (m = p.match(/^\/@([A-Za-z0-9._]{1,30})\/post\/([A-Za-z0-9_-]{5,40})\/?$/)))
    return {platform: "threads", kode: m[2], akun: "@" + m[1], url: `https://www.threads.com/@${m[1]}/post/${m[2]}`, embed: `https://www.threads.com/@${m[1]}/post/${m[2]}/embed`};
  return null;
}

/* bersihTeks (worker.js) tidak dipakai ulang: ia membuang URL, menolak > 280, dan menyaring kata kasar, padahal teks tweet boleh memuat tautan sampai 500.
   Yang sama hanya langkah kontrol/bidi: dipisah di sini, tanpa ubah bersihTeks. */
const bersih = t => String(t).normalize("NFC").replace(/[\u0000-\u0008\u000B-\u001F\u007F\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g, "").trim();
const ENTITAS = {amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", mdash: "—", ndash: "–", hellip: "…"};
const dekode = s => s.replace(/&(?:#(\d+)|#x([0-9a-f]+)|(\w+));/gi, (a, d, x, n) => {
  const k = d ? +d : x ? parseInt(x, 16) : null;
  try { return k != null ? String.fromCodePoint(k) : (ENTITAS[n.toLowerCase()] ?? a); } catch (e) { return a; }
});
/* oEmbed X: isi <p> sebagai teks. Akun tetap @handle dari URL (author_name hanya nama tampilan). Gagal apa pun = diabaikan (admin bisa mengisi sendiri). */
async function oembedX(url) {
  try {
    const r = await fetch(`https://publish.twitter.com/oembed?url=${encodeURIComponent(url)}&omit_script=1&dnt=true`, {signal: AbortSignal.timeout(5000), redirect: "manual"});
    if (!r.ok) return {};
    const o = await r.json(), p = String(o.html || "").match(/<p[^>]*>([\s\S]*?)<\/p>/i);
    return {teks: p ? bersih(dekode(p[1].replace(/<br\s*\/?>/gi, " ").replace(/<[^>]*>/g, "")).replace(/\s+/g, " ")).slice(0, 500) : null};
  } catch (e) { return {}; }
}

const RE_BENCANA = /^[a-z]{3,20}$/;
const KOLOM = "id, platform, url, akun, teks, prov, bencana, dibuat";
const keluar = (r, admin) => { const e = uraiSosmed(r.url); return e && {id: r.id, platform: r.platform, url: r.url, embed: e.embed, akun: r.akun, teks: r.teks, prov: r.prov, dibuat: r.dibuat,
  ...(admin ? {bencana: r.bencana, tampil: r.tampil, oleh: r.oleh} : {})}; };
const daftar = async (env, admin, sql, ...b) => json({post: (await env.DB.prepare(sql).bind(...b).all()).results.map(r => keluar(r, admin)).filter(Boolean)});

async function tambah(env, req, kini) {
  const mod = await adminOK(env, req); if (!mod) return gagal(403, "token admin salah atau ADMIN_TOKEN belum diset");
  const b = await bacaBody(req); if (b.galat) return gagal(400, b.galat);
  const {url, teks, akun, prov, bencana = "karhutla"} = b.o;
  const e = typeof url === "string" ? uraiSosmed(url) : null;
  if (!e) return gagal(400, "URL tidak dikenal: pakai tautan post Instagram, X (Twitter), atau Threads berawalan https://");
  if (teks != null && (typeof teks !== "string" || teks.length > 500)) return gagal(400, "teks harus berupa teks, maksimal 500 karakter");
  if (akun != null && (typeof akun !== "string" || (bersih(akun) && !/^@?[A-Za-z0-9._]{1,30}$/.test(bersih(akun))))) return gagal(400, "akun tidak valid: 1-30 huruf, angka, titik, atau garis bawah");
  if (prov != null && !(typeof prov === "string" && /^\d{2}$/.test(prov))) return gagal(400, "prov harus kode provinsi 2 digit");
  if (typeof bencana !== "string" || !RE_BENCANA.test(bencana)) return gagal(400, "bencana tidak valid");
  if (await env.DB.prepare("SELECT 1 FROM sosmed WHERE url = ?").bind(e.url).first()) return gagal(409, "post ini sudah ada");
  let t = teks == null ? null : bersih(teks) || null, a = (akun == null ? "" : bersih(akun)) || e.akun;
  if (e.platform === "x" && !t) { const o = await oembedX(e.url); t = o.teks || null; }
  if (a && !a.startsWith("@")) a = "@" + a;
  const id = acak(8);
  try { await env.DB.prepare("INSERT INTO sosmed (id, platform, kode, url, akun, teks, prov, bencana, dibuat, oleh) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .bind(id, e.platform, e.kode, e.url, a || null, t, prov == null ? null : String(prov), bencana, kini, mod).run(); }
  catch (x) { if (/UNIQUE/i.test(String(x.message || x))) return gagal(409, "post ini sudah ada"); throw x; }
  return json({post: keluar(await env.DB.prepare(`SELECT ${KOLOM}, tampil, oleh FROM sosmed WHERE id = ?`).bind(id).first(), true)}, 201);
}

async function atur(env, req, id) {
  if (!await adminOK(env, req)) return gagal(403, "token admin salah atau ADMIN_TOKEN belum diset");
  const b = await bacaBody(req); if (b.galat) return gagal(400, b.galat);
  if (b.o.tampil !== 0 && b.o.tampil !== 1) return gagal(400, "tampil harus 0 atau 1");
  const r = await env.DB.prepare("UPDATE sosmed SET tampil = ? WHERE id = ?").bind(b.o.tampil, id).run();
  return r.meta.changes ? json({id, tampil: b.o.tampil}) : gagal(404, "post tidak ditemukan");
}

/* rute: digabung ke RUTE di src/worker.js (gerbang uji membaca kunci tabel ini) */
export const RUTE_SOSMED = {
  "GET /api/sosmed": (env, req, url, kini, ctx) => {
    const bencana = url.searchParams.get("bencana") || "karhutla";
    if (!RE_BENCANA.test(bencana)) return gagal(400, "bencana tidak valid");
    /* kunci cache hanya ?bencana=: parameter lain tidak memecah cache; 30 dtk supaya sembunyikan cepat berlaku */
    const norm = new Request(new URL("/api/sosmed?bencana=" + bencana, url), {method: "GET"});
    return cacheTepi(norm, ctx, 30, () => daftar(env, false, `SELECT ${KOLOM} FROM sosmed WHERE bencana = ? AND tampil = 1 ORDER BY dibuat DESC LIMIT 100`, bencana));
  },
  "POST /api/sosmed": (env, req, url, kini) => tambah(env, req, kini),
  "POST /api/sosmed/:id": (env, req, url, kini, ctx, id) => atur(env, req, id),
  "GET /api/sosmed/admin": async (env, req) => await adminOK(env, req)
    ? daftar(env, true, `SELECT ${KOLOM}, tampil, oleh FROM sosmed ORDER BY dibuat DESC LIMIT 300`)
    : gagal(403, "token admin salah atau ADMIN_TOKEN belum diset"),
};
