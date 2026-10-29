/* Laporan BNPB (/laporan-bnpb): tim mengetik angka Laporan Kejadian Bencana Harian dan Paparan Presiden, peramban menyusun PPTX/PDF.
   Skema: migrations/0023_laporan_bnpb.sql. Semua rute wajib admin (adminOK: ADMIN_TOKEN atau akun AKUN_SITUS*), di alamat mana pun.
   Server tidak tahu bentuk slide: isi = JSON bebas, dibersihkan generik (kunci, panjang teks, kedalaman, ukuran). Bentuknya dijaga
   public/laporan_bnpb.js; penggambaran slide memakai teks apa adanya (tidak pernah innerHTML), jadi teks mentah aman. */
import {json, gagal, adminOK, bacaBody} from "./worker.js";
import {laju} from "./bnpb.js";
import {MODEL_URAI, MAKS_URAI, HARI, BATAS_URAI_HARI, BATAS_BACA_HARI, SKEMA_URAI, SISTEM_URAI, ULANG_URAI, uraiJson, rapat, periksaSalinan} from "./laporan_bnpb_spek.js";
export {MODEL_URAI, periksaSalinan};
import {KONTROL, tglSah} from "./posko.js";
import {bacaTerbatas, MAKS_BERKAS} from "./wa.js";

export const JENIS_LAPORAN = ["harian", "presiden"];
const MAKS_ISI = 98304, MAKS_TEKS = 2000, MAKS_LARIK = 200, MAKS_KUNCI = 80, MAKS_DALAM = 6;
const RE_KUNCI = /^[a-z][a-z0-9_]{0,39}$/;

/* bersihkan nilai JSON: teks NFC tanpa karakter kontrol/bidi, angka hingga, larik/objek dibatasi. Melempar Error berpesan bila melanggar. */
export function bersihIsi(v, dalam = 0) {
  if (dalam > MAKS_DALAM) throw new Error("isi terlalu dalam");
  if (v === null || typeof v === "boolean") return v;
  if (typeof v === "number") { if (!Number.isFinite(v)) throw new Error("angka tidak sah"); return v; }
  if (typeof v === "string") { const s = v.normalize("NFC").replace(KONTROL, ""); if (s.length > MAKS_TEKS) throw new Error(`teks lebih dari ${MAKS_TEKS} huruf`); return s; }
  if (Array.isArray(v)) { if (v.length > MAKS_LARIK) throw new Error(`daftar lebih dari ${MAKS_LARIK} baris`); return v.map(x => bersihIsi(x, dalam + 1)); }
  if (typeof v === "object") {
    const k = Object.keys(v); if (k.length > MAKS_KUNCI) throw new Error("terlalu banyak kolom");
    const o = {};
    for (const x of k) { if (!RE_KUNCI.test(x)) throw new Error(`nama kolom tidak sah: ${x.slice(0, 40)}`); o[x] = bersihIsi(v[x], dalam + 1); }
    return o;
  }
  throw new Error("tipe tidak sah");
}

const jenisDari = u => { const j = u.searchParams.get("jenis"); return JENIS_LAPORAN.includes(j) ? j : null; };
const tolak = () => gagal(403, "perlu masuk admin");

async function baca(env, req, url) {
  if (!await adminOK(env, req)) return tolak();
  return bacaLaporan(env, url);
}
/* tanpa pemeriksaan akses: dipanggil setelah adminOK di atas, atau setelah kunci API bercakupan laporan_bnpb (src/api_v1.js) */
export async function bacaLaporan(env, url, tanpaOleh = false) {
  const jenis = jenisDari(url); if (!jenis) return gagal(400, "jenis harus harian atau presiden");
  const t = url.searchParams.get("tanggal");
  const h = {"cache-control": "no-store"};
  if (t == null) {   // daftar tanggal tersimpan, terbaru dulu
    const r = await env.DB.prepare(`SELECT tanggal, diubah${tanpaOleh ? "" : ", oleh"} FROM laporan_bnpb WHERE jenis = ? ORDER BY tanggal DESC LIMIT 400`).bind(jenis).all();
    return json({jenis, daftar: r.results}, 200, h);
  }
  if (!tglSah(t)) return gagal(400, "tanggal harus YYYY-MM-DD");
  const r = await env.DB.prepare(`SELECT isi, diubah${tanpaOleh ? "" : ", oleh"} FROM laporan_bnpb WHERE jenis = ? AND tanggal = ?`).bind(jenis, t).first();
  return r ? json({jenis, tanggal: t, isi: JSON.parse(r.isi), diubah: r.diubah, ...(tanpaOleh ? {} : {oleh: r.oleh})}, 200, h) : gagal(404, "belum ada laporan tanggal itu");
}

async function simpan(env, req, url, kini) {
  const mod = await adminOK(env, req, kini); if (!mod) return tolak();
  const b = await bacaBody(req, MAKS_ISI + 512); if (b.galat) return gagal(b.status || 400, b.galat);
  const {jenis, tanggal, isi} = b.o;
  if (!JENIS_LAPORAN.includes(jenis)) return gagal(400, "jenis harus harian atau presiden");
  if (typeof tanggal !== "string" || !tglSah(tanggal)) return gagal(400, "tanggal harus YYYY-MM-DD");
  if (!isi || typeof isi !== "object" || Array.isArray(isi)) return gagal(400, "isi harus objek");
  let bersih; try { bersih = JSON.stringify(bersihIsi(isi)); } catch (e) { return gagal(400, e.message); }
  if (bersih.length > MAKS_ISI) return gagal(413, `isi lebih dari ${MAKS_ISI / 1024} KB`);
  /* penguncian optimistis (seperti laporan_karhutla): klien mengirim `diubah` terakhir yang ia muat; tanpa itu hanya baris baru yang boleh disisipkan */
  const dasar = b.o.diubah, kalah = () => gagal(409, "Laporan ini baru diubah petugas lain. Muat ulang dulu.");
  if (dasar != null && !Number.isSafeInteger(dasar)) return gagal(400, "diubah harus angka waktu dari muatan terakhir");
  if (dasar != null) {
    const u = await env.DB.prepare("UPDATE laporan_bnpb SET isi = ?1, diubah = ?2, oleh = ?3 WHERE jenis = ?4 AND tanggal = ?5 AND diubah = ?6").bind(bersih, kini, mod, jenis, tanggal, dasar).run();
    if (!u.meta.changes) return kalah();
  } else {
    try { await env.DB.prepare("INSERT INTO laporan_bnpb (jenis, tanggal, isi, diubah, oleh) VALUES (?1, ?2, ?3, ?4, ?5)").bind(jenis, tanggal, bersih, kini, mod).run(); }
    catch (e) { if (/UNIQUE|PRIMARY KEY/i.test(String(e?.message || e))) return kalah(); throw e; }
  }
  return json({ok: true, jenis, tanggal, diubah: kini, ukuran: bersih.length}, 201);
}

/* ---------------------------------------------------------------- urai dengan model (jalur cadangan)
   Bahan harian Pusdalops yang bentuknya tetap -- rekap WA Dit. Koordalops dan laphar PDF -- diurai di
   peramban tanpa model (public/laporan_urai.js). Rute ini HANYA untuk teks yang bentuknya tidak dikenali
   pengurai itu, dan menirukan empat lapis pintu dokumen pangantara:

     1. VONIS BERTINGKAT. "model bilang tidak ada kejadian" bukan "model gagal": yang pertama balik 200
        dengan daftar kosong dan catatannya, yang kedua balik galat. Dulu keduanya tak dibedakan dan
        yang terjadi adalah isian terisi karangan.
     2. ULANG BERUMPAN-BALIK. Jawaban kosong pada teks yang jelas memuat kejadian = model menyerah,
        bukan vonis. Diulang SEKALI dengan instruksi korektif, bukan diulang buta.
     3. PEMOTONGAN DILAPORKAN. Mutu jatuh pada prompt panjang, jadi teks dipotong di MAKS_URAI dan
        pemotongannya SELALU diberitahukan ke layar, tidak senyap.
     4. ANGKA TIDAK PERNAH DIKARANG. Tiap nilai teks yang dikembalikan model wajib benar-benar ada di
        dalam teks sumber (periksaSalinan); yang tidak ada dibuang. Ini pengganti korpus koreksi
        pangantara: lebih murah, dan menutup kelas kesalahan yang paling mahal di laporan ini.

   Hasilnya tidak pernah langsung tersimpan: layar menampilkannya untuk diperiksa, lalu petugas menekan
   Masukkan ke isian. */
async function uraiModel(env, req, kini) {
  if (!await adminOK(env, req, kini)) return tolak();
  /* Validasi masukan DULU, baru ketersediaan model: kiriman yang memang salah harus dapat 400 yang
     menjelaskan, bukan 503 yang menyesatkan ke "server ini tidak punya model". */
  const b = await bacaBody(req, MAKS_URAI * 4 + 1024); if (b.galat) return gagal(b.status || 400, b.galat);
  const mentah = typeof b.o?.teks === "string" ? b.o.teks : "";
  if (rapat(mentah).length < 40) return gagal(400, "teks terlalu pendek untuk diurai");
  if (typeof env.AI?.run !== "function") return gagal(503, "model tidak tersedia di server ini");
  const terpotong = mentah.length > MAKS_URAI, teks = mentah.slice(0, MAKS_URAI);
  const g = await laju(env, "global", "lbnpb.urai", [[HARI, BATAS_URAI_HARI]], kini); if (g) return g;   // plafon biaya model
  const minta = async tambahan => uraiJson(await env.AI.run(MODEL_URAI, {max_tokens: 2000, temperature: 0, response_format: {type: "json_schema", json_schema: SKEMA_URAI},
    messages: [{role: "system", content: SISTEM_URAI + (tambahan ? " " + tambahan : "")}, {role: "user", content: `--- MULAI TEKS SUMBER ---\n${teks}\n--- AKHIR TEKS SUMBER ---`}]}));
  let out;
  try {
    out = await minta("");
    /* berbau: teks yang jelas memuat baris kejadian. Sengaja longgar -- salah tebak hanya memakai satu
       panggilan tambahan, salah diam berarti laporan hilang tanpa jejak. */
    const berbau = /bencana|kejadian|karhutla|banjir|gempa|kekeringan|longsor|erupsi/i.test(teks);
    if (berbau && !(out?.kejadian || []).length) out = await minta(ULANG_URAI);
  } catch (e) { console.error("lbnpb.urai AI", e?.message); return gagal(502, "model gagal membaca teks ini"); }
  const {kejadian, dibuang} = periksaSalinan(out?.kejadian, teks);
  const catatan = [];
  if (terpotong) catatan.push(`teks dipotong di ${MAKS_URAI} huruf; bagian sesudahnya belum dibaca`);
  if (dibuang.length) catatan.push(`${dibuang.length} nilai dibuang karena tidak ada di teks sumber`);
  if (!kejadian.length) catatan.push("model tidak menemukan kejadian di teks ini");
  return json({kejadian, catatan, dibuang: dibuang.slice(0, 10), terpotong, model: MODEL_URAI}, 200, {"cache-control": "no-store"});
}

/* Baca dokumen jadi teks (POST /api/laporan-bnpb/baca): DOCX/XLSX/PDF/dst lewat env.AI.toMarkdown, foto lewat model penglihatan (toMarkdown hanya
   MENGGAMBARKAN foto). Hasil ?wa=<id> disimpan di R2 `${berkas}.teks.json` karena OCR memakan neuron. PDF scan tidak dirasterisasi di worker. */
export const MODEL_OCR = "@cf/meta/llama-4-scout-17b-16e-instruct";
const MAKS_TEKS_BACA = 200000;
const PROMPT_OCR = "Salin SEMUA teks pada gambar ini persis seperti tertulis. Baris tabel tulis sebagai satu baris dengan pemisah ' | '. Jangan meringkas, jangan menerjemahkan, jangan menambah angka atau kata yang tidak ada di gambar.";
const TIPE_DOK = {pdf: "application/pdf", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  xls: "application/vnd.ms-excel", odt: "application/vnd.oasis.opendocument.text", ods: "application/vnd.oasis.opendocument.spreadsheet", csv: "text/csv", html: "text/html", htm: "text/html"};
const TIPE_GAMBAR = {jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp"};
/* tipe dari content-type bila dikenal, selain itu dari ekstensi nama (WA sering mengirim application/octet-stream) */
function jenisBerkas(nama, tipe) {
  const t = String(tipe || "").split(";")[0].trim().toLowerCase(), e = (String(nama).match(/\.([a-z0-9]+)$/i)?.[1] || "").toLowerCase();
  if (/^image\/(jpeg|png|webp)$/.test(t)) return {gambar: true, tipe: t};
  if (TIPE_GAMBAR[e]) return {gambar: true, tipe: TIPE_GAMBAR[e]};
  if (/^(application\/pdf|text\/(csv|html)|application\/vnd\.(openxmlformats-officedocument\.(wordprocessingml\.document|spreadsheetml\.sheet)|ms-excel|oasis\.opendocument\.(text|spreadsheet)))$/.test(t)) return {gambar: false, tipe: t, pdf: t === "application/pdf"};
  if (TIPE_DOK[e]) return {gambar: false, tipe: TIPE_DOK[e], pdf: e === "pdf"};
  return null;
}
function base64(b) { let s = ""; for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000)); return btoa(s); }

export async function bacaDokumen(env, {nama, bytes, tipe}) {
  const j = jenisBerkas(nama, tipe); if (!j) return {galat: 415, pesan: "jenis berkas belum didukung"};
  if (typeof env.AI?.run !== "function") return {galat: 503, pesan: "model tidak tersedia di server ini"};
  if (j.gambar) {
    if (bytes.byteLength > 4 * 1048576) return {galat: 413, pesan: "foto terlalu besar untuk OCR (maks 4 MB), kecilkan dulu"};
    const o = await env.AI.run(MODEL_OCR, {temperature: 0, max_tokens: 4000, messages: [{role: "user", content: [{type: "text", text: PROMPT_OCR},
      {type: "image_url", image_url: {url: `data:${j.tipe};base64,${base64(bytes)}`}}]}]});
    const teks = String(o?.response ?? o?.choices?.[0]?.message?.content ?? "").trim();
    return {nama, jenis: "ocr", teks: teks.slice(0, MAKS_TEKS_BACA), ...(teks ? {} : {catatan: "model tidak menemukan teks pada gambar"})};
  }
  const dok = {name: nama, blob: new Blob([bytes], {type: j.tipe})};
  let h;
  if (j.pdf) { try { h = await env.AI.toMarkdown(dok, {conversionOptions: {pdf: {metadata: false}}}); } catch (e) { h = null; } }   // opsi tak dikenal: ulangi tanpa opsi
  h = h || await env.AI.toMarkdown(dok);
  const r = Array.isArray(h) ? h[0] : h, md = String(r?.data ?? "");
  const out = {nama, jenis: "markdown", teks: md.slice(0, MAKS_TEKS_BACA)};
  if (r?.format === "error" || r?.error) { console.error("lbnpb.baca md", String(r.error || r.data || "").slice(0, 200)); return {galat: 502, pesan: "dokumen tidak terbaca"}; }
  if (j.pdf && md.replace(/^#+.*$/gm, "").replace(/\s+/g, "").length < 200) out.catatan = "PDF hasil scan: kirim sebagai foto untuk OCR";
  return out;
}

async function bacaRute(env, req, url, kini) {
  if (!await adminOK(env, req, kini)) return tolak();
  let nama, tipe, bytes, simpan = null;
  const wa = url.searchParams.get("wa");
  if (wa !== null) {
    if (!/^\d{1,15}$/.test(wa)) return gagal(400, "id tidak sah");
    const id = Number(wa);
    const r = await env.DB.prepare("SELECT berkas, nama_berkas, tipe FROM wa_masuk WHERE id = ?").bind(id).first();
    const o = r?.berkas && await env.MEDIA?.get(r.berkas); if (!o) return gagal(404, "berkas tidak ada");
    nama = r.nama_berkas || "berkas"; tipe = r.tipe || "";
    const c = await env.MEDIA.get(r.berkas + ".teks.json");
    if (c) { try { return json(await c.json(), 200, {"cache-control": "no-store"}); } catch (e) { /* cache rusak: baca ulang */ } }
    if (!jenisBerkas(nama, tipe)) return gagal(415, "jenis berkas belum didukung");
    bytes = new Uint8Array(await o.arrayBuffer()); simpan = r.berkas + ".teks.json";
  } else {
    if (Number(req.headers.get("content-length") || 0) > MAKS_BERKAS) return gagal(413, "berkas lebih dari 20 MB");
    if (!req.body) return gagal(400, "berkas kosong");
    try { nama = decodeURIComponent(req.headers.get("x-nama-berkas") || "").replace(KONTROL, "").slice(0, 200) || "berkas"; } catch (e) { return gagal(400, "x-nama-berkas tidak sah"); }
    tipe = req.headers.get("content-type") || "";
    if (!jenisBerkas(nama, tipe)) return gagal(415, "jenis berkas belum didukung");
    if (typeof env.AI?.run !== "function") return gagal(503, "model tidak tersedia di server ini");   // sebelum membaca 20 MB
    bytes = await bacaTerbatas(req.body, MAKS_BERKAS); if (!bytes) return gagal(413, "berkas lebih dari 20 MB"); if (!bytes.byteLength) return gagal(400, "berkas kosong");
  }
  const g = await laju(env, "global", "lbnpb.baca", [[HARI, BATAS_BACA_HARI]], kini); if (g) return g;   // plafon biaya model; cache di atas tetap gratis
  let h;
  try { h = await bacaDokumen(env, {nama, bytes, tipe}); } catch (e) { console.error("lbnpb.baca AI", e?.message); return gagal(502, "model gagal membaca berkas ini"); }
  if (h.galat) return gagal(h.galat, h.pesan);
  if (simpan && h.teks) await env.MEDIA.put(simpan, JSON.stringify(h), {httpMetadata: {contentType: "application/json"}});
  return json(h, 200, {"cache-control": "no-store"});
}

export const RUTE_LAPORAN_BNPB = {
  "POST /api/laporan-bnpb/baca": (env, req, url, kini) => bacaRute(env, req, url, kini),
  "GET /api/laporan-bnpb": (env, req, url) => baca(env, req, url),
  "POST /api/laporan-bnpb": (env, req, url, kini) => simpan(env, req, url, kini),
  "POST /api/laporan-bnpb/urai": (env, req, url, kini) => uraiModel(env, req, kini),
};
