/* Kotak masuk WhatsApp laporan harian (pemilik 29 Okt 2026). Nomor bot di Fonnte meneruskan tiap pesan masuk ke webhook
   POST /api/wa/fonnte?k=<WA_KUNCI>. Hanya pengirim di WA_IZIN (nomor dipisah koma, boleh 08.. atau 62..) yang disimpan; sisanya diterima 200 lalu dibuang,
   supaya Fonnte tidak mengulang. TIDAK ADA BALASAN ke pengirim (pemilik: "cukup terima aja").
   Pesan = bahan, bukan angka laporan: layar /laporan-bnpb mengambilnya lewat GET /api/wa/masuk lalu mengurainya dengan pengurai yang sama
   (public/laporan_urai.js) dan petugas menekan Masukkan ke isian. Angka hotspot/firespot/luas karhutla tetap dari sistem, bukan dari WA.
   Tanggal laporan: tanggal yang ditulis di awal pesan (2026-10-28, 28/10/2026, 28-10-2026), selain itu tanggal WIB saat diterima.
   Jenis: tagar #karhutla / #bencana, selain itu kata kunci karhutla di teks atau nama berkas, selain itu bencana. */
import {json, gagal, adminOK, sha} from "./worker.js";
import {KONTROL, tglSah} from "./posko.js";

const MAKS_BODY = 262144, MAKS_TEKS = 65536, MAKS_BERKAS = 20 * 1024 * 1024, MAKS_HARI = 500;
const RE_KARHUTLA = /karhutla|kebakaran\s+(hutan|lahan)|pemadaman|water\s*bombing|titik\s+panas|hotspot|firespot|modifikasi\s+cuaca|\bomc\b/i;
const TIPE_AMAN = /^(application\/pdf|image\/(png|jpeg|webp)|text\/plain|application\/vnd\.openxmlformats-officedocument\.[a-z.]+|application\/(msword|vnd\.ms-excel))$/;

export const normalNo = s => { const d = String(s ?? "").split("@")[0].replace(/\D/g, ""); return d.startsWith("0") ? "62" + d.slice(1) : d; };
export const hariWib = kini => new Date(kini + 7 * 3600e3).toISOString().slice(0, 10);
export function tanggalDari(teks, kini) {
  const t = String(teks ?? "").replace(/^(\s*#\w+)+/, "").trimStart().slice(0, 40);   // tagar jenis boleh mendahului tanggal
  let m = t.match(/^(?:tgl\.?|tanggal)?\s*(\d{4})-(\d{2})-(\d{2})\b/i), iso = m && `${m[1]}-${m[2]}-${m[3]}`;
  if (!iso && (m = t.match(/^(?:tgl\.?|tanggal)?\s*(\d{1,2})[/-](\d{1,2})[/-](\d{4})\b/i))) iso = `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return iso && tglSah(iso) ? iso : hariWib(kini);
}
export const jenisDari = (teks, nama) => /#karhutla\b/i.test(teks) ? "karhutla" : /#bencana\b/i.test(teks) ? "bencana" : RE_KARHUTLA.test(`${teks} ${nama}`) ? "karhutla" : "bencana";

/* baca aliran per potong dan berhenti di batas: tanpa content-length (chunked) kiriman besar tidak dimuat utuh dulu. null = melewati batas. */
async function bacaTerbatas(aliran, maks) {
  const potong = [], baca = aliran.getReader(); let n = 0;
  for (let x; !(x = await baca.read()).done;) { n += x.value.byteLength; if (n > maks) { await baca.cancel(); return null; } potong.push(x.value); }
  const b = new Uint8Array(n); let o = 0; for (const p of potong) { b.set(p, o); o += p.byteLength; }
  return b;
}
async function bacaKiriman(req) {
  if (Number(req.headers.get("content-length") || 0) > MAKS_BODY || !req.body) return null;
  const b = await bacaTerbatas(req.body, MAKS_BODY); if (!b) return null;
  const s = new TextDecoder().decode(b);
  try { const o = JSON.parse(s); return o && typeof o === "object" ? o : null; } catch { return Object.fromEntries(new URLSearchParams(s)); }
}

async function ambilBerkas(env, u, kini) {
  if (!/^https:\/\//i.test(u)) return null;
  const r = await fetch(u, {signal: AbortSignal.timeout(15000), redirect: "follow"});
  if (!r.ok || Number(r.headers.get("content-length") || 0) > MAKS_BERKAS) return null;
  const b = r.body && await bacaTerbatas(r.body, MAKS_BERKAS); if (!b?.byteLength) return null;
  const tipe = (r.headers.get("content-type") || "").split(";")[0].trim().toLowerCase(), kunci = `wa/${hariWib(kini)}/${kini}-${crypto.randomUUID().slice(0, 8)}`;
  await env.MEDIA.put(kunci, b, {httpMetadata: {contentType: tipe || "application/octet-stream"}});
  return {kunci, tipe};
}

async function terima(env, req, url, kini) {
  if (!env.WA_KUNCI) return gagal(503, "webhook WA belum dikonfigurasi");
  if (await sha(url.searchParams.get("k") || "") !== await sha(env.WA_KUNCI)) return gagal(403, "kunci salah");
  const o = await bacaKiriman(req); if (!o) return gagal(400, "kiriman tidak terbaca");
  const izin = new Set(String(env.WA_IZIN || "").split(",").map(normalNo).filter(Boolean)), dari = normalNo(o.member || o.sender);
  if (!izin.has(dari)) return json({ok: true, disimpan: false});   // bukan pengirim terdaftar: diam, tidak disimpan
  /* plafon harian: kunci di URL bisa bocor lewat log; pemalsu pengirim terdaftar berhenti di sini (indeks wa_masuk_tanggal, satu baca) */
  if ((await env.DB.prepare("SELECT count(*) n FROM wa_masuk WHERE tanggal = ?").bind(hariWib(kini)).first()).n >= MAKS_HARI) return gagal(429, "plafon pesan WA hari ini tercapai");
  const teks = String(o.message ?? o.text ?? "").normalize("NFC").replace(KONTROL, "").slice(0, MAKS_TEKS) || null;
  const namaBerkas = o.filename ? String(o.filename).replace(KONTROL, "").slice(0, 200) : null;
  let berkas = null;
  if (o.url) { try { berkas = await ambilBerkas(env, String(o.url), kini); } catch (e) { console.error("wa.berkas", e?.message); } }
  if (!teks && !berkas) return json({ok: true, disimpan: false});
  const tanggal = tanggalDari(teks, kini), jenis = jenisDari(teks || "", namaBerkas || "");
  await env.DB.prepare("INSERT INTO wa_masuk (diterima, tanggal, jenis, dari, nama, teks, berkas, nama_berkas, tipe) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)")
    .bind(kini, tanggal, jenis, dari, o.name ? String(o.name).replace(KONTROL, "").slice(0, 100) : null, teks, berkas?.kunci ?? null, namaBerkas, berkas?.tipe ?? null).run();
  return json({ok: true, disimpan: true, tanggal, jenis});
}

async function daftar(env, req, url, kini) {
  if (!await adminOK(env, req, kini)) return gagal(403, "perlu masuk admin");
  const t = url.searchParams.get("tanggal"), j = url.searchParams.get("jenis");
  if (!tglSah(t || "")) return gagal(400, "tanggal harus YYYY-MM-DD");
  if (j && !["bencana", "karhutla"].includes(j)) return gagal(400, "jenis harus bencana atau karhutla");
  const r = await env.DB.prepare(`SELECT id, diterima, jenis, dari, nama, teks, nama_berkas, tipe, berkas IS NOT NULL AS ada_berkas FROM wa_masuk
    WHERE tanggal = ?1 ${j ? "AND jenis = ?2" : ""} ORDER BY diterima LIMIT 300`).bind(...(j ? [t, j] : [t])).all();
  return json({tanggal: t, pesan: r.results}, 200, {"cache-control": "no-store"});
}

async function berkas(env, req, url, kini) {
  if (!await adminOK(env, req, kini)) return gagal(403, "perlu masuk admin");
  const id = Number(url.searchParams.get("id")); if (!Number.isSafeInteger(id)) return gagal(400, "id tidak sah");
  const r = await env.DB.prepare("SELECT berkas, nama_berkas, tipe FROM wa_masuk WHERE id = ?").bind(id).first();
  const o = r?.berkas && await env.MEDIA.get(r.berkas); if (!o) return gagal(404, "berkas tidak ada");
  const nama = (r.nama_berkas || "berkas").replace(/[^\w.\- ]/g, "_");
  return new Response(o.body, {headers: {"content-type": TIPE_AMAN.test(r.tipe || "") ? r.tipe : "application/octet-stream", "content-disposition": `attachment; filename="${nama}"`,
    "cache-control": "private, no-store", "x-content-type-options": "nosniff", "content-security-policy": "sandbox"}});
}

export const RUTE_WA = {
  "POST /api/wa/fonnte": (env, req, url, kini) => terima(env, req, url, kini),
  "GET /api/wa/masuk": (env, req, url, kini) => daftar(env, req, url, kini),
  "GET /api/wa/berkas": (env, req, url, kini) => berkas(env, req, url, kini),
};
