/* Laporan BNPB (/laporan-bnpb): tim mengetik angka Laporan Kejadian Bencana Harian dan Paparan Presiden, peramban menyusun PPTX/PDF.
   Skema: migrations/0023_laporan_bnpb.sql. Semua rute wajib admin (adminOK: ADMIN_TOKEN atau akun AKUN_SITUS*), di alamat mana pun.
   Server tidak tahu bentuk slide: isi = JSON bebas, dibersihkan generik (kunci, panjang teks, kedalaman, ukuran). Bentuknya dijaga
   public/laporan_bnpb.js; penggambaran slide memakai teks apa adanya (tidak pernah innerHTML), jadi teks mentah aman. */
import {json, gagal, adminOK, bacaBody} from "./worker.js";
import {KONTROL, tglSah} from "./posko.js";

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
  const jenis = jenisDari(url); if (!jenis) return gagal(400, "jenis harus harian atau presiden");
  const t = url.searchParams.get("tanggal");
  const h = {"cache-control": "no-store"};
  if (t == null) {   // daftar tanggal tersimpan, terbaru dulu
    const r = await env.DB.prepare("SELECT tanggal, diubah, oleh FROM laporan_bnpb WHERE jenis = ? ORDER BY tanggal DESC LIMIT 400").bind(jenis).all();
    return json({jenis, daftar: r.results}, 200, h);
  }
  if (!tglSah(t)) return gagal(400, "tanggal harus YYYY-MM-DD");
  const r = await env.DB.prepare("SELECT isi, diubah, oleh FROM laporan_bnpb WHERE jenis = ? AND tanggal = ?").bind(jenis, t).first();
  return r ? json({jenis, tanggal: t, isi: JSON.parse(r.isi), diubah: r.diubah, oleh: r.oleh}, 200, h) : gagal(404, "belum ada laporan tanggal itu");
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

export const RUTE_LAPORAN_BNPB = {
  "GET /api/laporan-bnpb": (env, req, url) => baca(env, req, url),
  "POST /api/laporan-bnpb": (env, req, url, kini) => simpan(env, req, url, kini),
};
