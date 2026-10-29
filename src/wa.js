/* Kotak masuk WhatsApp laporan harian (pemilik 29 Okt 2026). Gerbang WA milik sendiri (Baileys di Mac mini, scripts/wa/gateway/index.js) meneruskan tiap pesan
   masuk lewat POST multipart /api/wa/gateway dengan header x-wa-kunci. Hanya pengirim di WA_IZIN (nomor dipisah koma, boleh 08.. atau 62..) yang disimpan; sisanya diterima 200 lalu dibuang.
   TIDAK ADA BALASAN ke pengirim. Gerbang mengulang dari outbox bila gagal: baris identik (dari, diterima, teks, nama_berkas) dikembalikan, bukan digandakan.
   Pesan = bahan, bukan angka laporan: layar /laporan-bnpb mengambilnya lewat GET /api/wa/masuk lalu mengurainya dengan pengurai yang sama
   (public/laporan_urai.js) dan petugas menekan Masukkan ke isian. Pembacaan boleh admin ATAU mesin (Authorization: Bearer WA_MESIN).
   Angka hotspot/firespot/luas karhutla tetap dari sistem, bukan dari WA.
   Tanggal laporan: tanggal yang ditulis di awal pesan (2026-10-28, 28/10/2026, 28-10-2026), selain itu tanggal WIB saat diterima.
   Jenis: tagar #karhutla / #bencana, selain itu kata kunci karhutla di teks atau nama berkas, selain itu bencana. */
import {json, gagal, adminOK, sha, bacaBytes} from "./worker.js";
import {KONTROL, tglSah} from "./posko.js";
import {JENIS_LAPORAN, kenali} from "./wa_jenis.js";

export const MAKS_BERKAS = 20 * 1024 * 1024;
const MAKS_TEKS = 65536, MAKS_HARI = 500;
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
export async function bacaTerbatas(aliran, maks) {
  const potong = [], baca = aliran.getReader(); let n = 0;
  for (let x; !(x = await baca.read()).done;) { n += x.value.byteLength; if (n > maks) { await baca.cancel(); return null; } potong.push(x.value); }
  const b = new Uint8Array(n); let o = 0; for (const p of potong) { b.set(p, o); o += p.byteLength; }
  return b;
}
const MAKS_FORM = 21 * 1024 * 1024;
const TIPE_TERIMA = /^(image\/(png|jpeg|webp)$|application\/pdf$|application\/msword$|application\/vnd\.ms-excel$|application\/vnd\.openxmlformats-officedocument\.(wordprocessingml\.document|spreadsheetml\.sheet)$|application\/vnd\.oasis\.opendocument\.(text|spreadsheet)$|text\/(plain|csv)$)/;
const EKS_TERIMA = /\.(docx?|xlsx?|odt|ods|txt|csv|pdf|png|jpe?g|webp)$/i;
const bersih = (s, n) => String(s ?? "").normalize("NFC").replace(KONTROL, "").slice(0, n);

async function gerbang(env, req, kini) {
  if (!env.WA_KUNCI) return gagal(503, "gerbang WA belum dikonfigurasi");
  if (await sha(req.headers.get("x-wa-kunci") || "") !== await sha(env.WA_KUNCI)) return gagal(403, "kunci salah");
  const ct = req.headers.get("content-type") || "";
  if (!/^multipart\/form-data/i.test(ct)) return gagal(400, "kiriman harus multipart/form-data");
  const bytes = await bacaBytes(req, MAKS_FORM); if (bytes.galat) return gagal(bytes.status, bytes.galat);   // dibatasi juga tanpa content-length (chunked)
  let f; try { f = await new Response(bytes.b, {headers: {"content-type": ct}}).formData(); } catch { return gagal(400, "kiriman tidak terbaca"); }
  const izin = new Set(String(env.WA_IZIN || "").split(",").map(normalNo).filter(Boolean)), dari = normalNo(f.get("dari"));
  if (!izin.has(dari)) return json({ok: true, disimpan: false});   // bukan pengirim terdaftar: diam, tidak disimpan
  const w = Number(f.get("waktu")), diterima = Number.isFinite(w) && w >= kini - 7 * 864e5 && w <= kini + 5 * 60e3 ? Math.trunc(w) : kini;
  const teks = bersih(f.get("teks"), MAKS_TEKS) || null, nama = bersih(f.get("nama"), 100) || null;
  let b = f.get("berkas"); if (typeof b === "string" || !b?.size) b = null;
  if (b && (b.size > MAKS_BERKAS || !(TIPE_TERIMA.test(b.type || "") || (!b.type || b.type === "application/octet-stream") && EKS_TERIMA.test(b.name || "")))) b = null;   // tipe dikenal, atau tipe kosong/umum dengan ekstensi dikenal
  const namaBerkas = b ? bersih(b.name || "berkas", 200).replace(/[\\/]/g, "_") : null;
  if (!teks && !b) return json({ok: true, disimpan: false});
  /* kiriman ulang dari outbox gerbang: baris identik dikembalikan (indeks wa_masuk_dedup), SEBELUM plafon supaya ulangan sesudah plafon tetap dapat id lama.
     ponytail: dua ulangan paralel bisa lolos bersamaan dan menggandakan baris (tanpa UNIQUE); gerbang mengirim berurutan, naikkan ke UNIQUE bila perlu. */
  const ada = await env.DB.prepare("SELECT id, tanggal, jenis FROM wa_masuk WHERE dari = ?1 AND diterima = ?2 AND teks IS ?3 AND nama_berkas IS ?4 LIMIT 1").bind(dari, diterima, teks, namaBerkas).first();
  if (ada) return json({ok: true, disimpan: true, id: ada.id, tanggal: ada.tanggal, jenis: ada.jenis});
  /* plafon harian menurut waktu terima (hari WIB ini), lewat indeks wa_masuk_diterima: pemalsu pengirim terdaftar berhenti di sini */
  const awal = Date.parse(hariWib(kini)) - 7 * 3600e3;
  if ((await env.DB.prepare("SELECT count(*) n FROM wa_masuk WHERE diterima >= ?1 AND diterima < ?2").bind(awal, awal + 864e5).first()).n >= MAKS_HARI) return gagal(429, "plafon pesan WA hari ini tercapai");
  let kunci = null, tipe = null;
  if (b) {
    kunci = `wa/${hariWib(kini)}/${kini}-${crypto.randomUUID().slice(0, 8)}`; tipe = (b.type || "application/octet-stream").toLowerCase();
    await env.MEDIA.put(kunci, await b.arrayBuffer(), {httpMetadata: {contentType: tipe}});
  }
  const tanggal = tanggalDari(teks, diterima), jenis = jenisDari(teks || "", namaBerkas || "");
  const r = await env.DB.prepare("INSERT INTO wa_masuk (diterima, tanggal, jenis, dari, nama, teks, berkas, nama_berkas, tipe) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)")
    .bind(diterima, tanggal, jenis, dari, nama, teks, kunci, namaBerkas, tipe).run();
  return json({ok: true, disimpan: true, id: r.meta.last_row_id, tanggal, jenis});
}

/* pembaca: admin ATAU mesin (Authorization: Bearer WA_MESIN, banding konstan lewat sha; WA_MESIN kosong = hanya admin) */
async function boleh(env, req, kini) {
  const t = /^Bearer (.+)$/.exec(req.headers.get("authorization") || "")?.[1];
  if (env.WA_MESIN && t && await sha(t) === await sha(env.WA_MESIN)) return true;
  return adminOK(env, req, kini);
}

async function daftar(env, req, url, kini) {
  if (!await boleh(env, req, kini)) return gagal(403, "perlu masuk admin");
  const t = url.searchParams.get("tanggal"), j = url.searchParams.get("jenis");
  if (!tglSah(t || "")) return gagal(400, "tanggal harus YYYY-MM-DD");
  if (j && !["bencana", "karhutla"].includes(j)) return gagal(400, "jenis harus bencana atau karhutla");
  const r = await env.DB.prepare(`SELECT id, diterima, jenis, dari, nama, teks, nama_berkas, tipe, berkas IS NOT NULL AS ada_berkas FROM wa_masuk
    WHERE tanggal = ?1 ${j ? "AND jenis = ?2" : ""} ORDER BY diterima LIMIT 300`).bind(...(j ? [t, j] : [t])).all();
  return json({tanggal: t, pesan: r.results}, 200, {"cache-control": "no-store"});
}

async function berkas(env, req, url, kini) {
  if (!await boleh(env, req, kini)) return gagal(403, "perlu masuk admin");
  const id = Number(url.searchParams.get("id")); if (!Number.isSafeInteger(id)) return gagal(400, "id tidak sah");
  const r = await env.DB.prepare("SELECT berkas, nama_berkas, tipe FROM wa_masuk WHERE id = ?").bind(id).first();
  const o = r?.berkas && await env.MEDIA.get(r.berkas); if (!o) return gagal(404, "berkas tidak ada");
  const nama = (r.nama_berkas || "berkas").replace(/[^\w.\- ]/g, "_");
  return new Response(o.body, {headers: {"content-type": TIPE_AMAN.test(r.tipe || "") ? r.tipe : "application/octet-stream", "content-disposition": `attachment; filename="${nama}"`,
    "cache-control": "private, no-store", "x-content-type-options": "nosniff", "content-security-policy": "sandbox"}});
}

/* ponytail: rekap membaca teks 14 hari lalu mengenali di JS; ~30 baris/hari cukup. Bila membengkak: simpan hasil kenali() di kolom `kunci` saat insert lalu GROUP BY. */
/* pelacak kedatangan: per hari, jenis laporan mana yang sudah tiba (src/wa_jenis.js, tanpa membaca angka). Satu kueri lewat indeks wa_masuk_tanggal. */
async function rekap(env, req, url, kini) {
  if (!await boleh(env, req, kini)) return gagal(403, "perlu masuk admin");
  const sampai = url.searchParams.get("sampai") || hariWib(kini), hari = Math.min(31, Math.max(1, Math.trunc(Number(url.searchParams.get("hari") ?? 14)) || 14));
  if (!tglSah(sampai)) return gagal(400, "sampai harus YYYY-MM-DD");
  const hariKe = i => new Date(Date.parse(sampai) - i * 864e5).toISOString().slice(0, 10), awal = hariKe(hari - 1);
  const r = await env.DB.prepare("SELECT id, diterima, tanggal, nama_berkas, substr(teks, 1, 1500) teks FROM wa_masuk WHERE tanggal BETWEEN ?1 AND ?2 ORDER BY diterima").bind(awal, sampai).all();
  const per = Array.from({length: hari}, (_, i) => ({tanggal: hariKe(i), isi: {}, lain: 0, lihat: new Set()})), peta = new Map(per.map(p => [p.tanggal, p]));
  for (const m of r.results) {
    const p = peta.get(m.tanggal); if (!p) continue;
    const k = kenali(m.teks, m.nama_berkas), sidik = `${k}|${k === "laphar_pdf" ? m.nama_berkas : m.teks ?? m.nama_berkas}`;
    if (k) { const e = p.isi[k] ??= {n: 0, terakhir: 0}; e.terakhir = Math.max(e.terakhir, m.diterima); if (!p.lihat.has(sidik)) e.n++; }
    else if (!p.lihat.has(sidik)) p.lain++;
    p.lihat.add(sidik);
  }
  return json({sampai, hari, jenis: JENIS_LAPORAN, per: per.map(({lihat, ...p}) => p)}, 200, {"cache-control": "no-store"});
}

export const RUTE_WA = {
  "GET /api/wa/rekap": (env, req, url, kini) => rekap(env, req, url, kini),
  "POST /api/wa/gateway": (env, req, url, kini) => gerbang(env, req, kini),
  "GET /api/wa/masuk": (env, req, url, kini) => daftar(env, req, url, kini),
  "GET /api/wa/berkas": (env, req, url, kini) => berkas(env, req, url, kini),
};
