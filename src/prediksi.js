/* /prediksi fase 2: konfirmasi lapangan (docs/prediksi/RANCANGAN.md). Skema: migrations/0079_prediksi_konfirmasi.sql.
   - POST /api/prediksi/konfirmasi: header x-kode-regu (pola posko.js lapor) ATAU sesi staf (adminOK). Upsert per (kab, tanggal, kode, pelapor).
   - GET /api/prediksi/konfirmasi?sejak=YYYY-MM-DD: Bearer PIPA_TOKEN (pipa.js). Gabung baris regu + laporan warga (positif saja, sumber 'warga').
   ponytail: kab = nama/kode 2-80 karakter sebebas laporan_wilayah.kab; pipeline yang menormalkan ke 514 kab. Pencocokan warga lewat nama (tanpa huruf besar). */
import {json, gagal, adminOK, bacaBody} from "./worker.js";
import {reguDari, tx, num, tglSah, wib} from "./posko.js";
import {lajuIP} from "./bnpb.js";
import {periksaToken} from "./pipa.js";

const HARI = 864e5, KODE = ["HJN", "API", "BNJ", "LSR", "ASP", "ROB"];
const RE_KAB = /^[\p{L}\p{N}][\p{L}\p{N} .,'()\/-]{1,79}$/u;
/* laporan.bahaya -> kode prediksi; bahaya lain (gempa, tsunami, dst.) tidak punya padanan */
const BAHAYA_KODE = {karhutla: "API", banjir: "BNJ", longsor: "LSR", rob: "ROB", cuaca: "HJN", udara: "ASP"};

async function konfirmasi(env, req, url, kini = Date.now()) {
  const regu = req.headers.get("x-kode-regu") ? await reguDari(env, req, kini) : null;
  if (regu instanceof Response) return regu;
  if (!regu && !await adminOK(env, req)) return gagal(403, "butuh header x-kode-regu atau sesi staf");
  const lim = await lajuIP(env, req, "prediksi.konfirmasi", [[3600e3, 120]], kini); if (lim) return lim;
  const b = await bacaBody(req); if (b.galat) return gagal(b.status || 400, b.galat);
  const o = b.o, kab = tx(o.kab, 80);
  if (!kab || !RE_KAB.test(kab)) return gagal(400, "kab wajib: 2-80 karakter huruf, angka, spasi, titik, tanda hubung");
  if (typeof o.tanggal !== "string" || !tglSah(o.tanggal) || o.tanggal > wib(kini) || o.tanggal < wib(kini - 7 * HARI)) return gagal(400, "tanggal wajib YYYY-MM-DD dalam 7 hari terakhir (WIB), tidak di masa depan");
  if (!KODE.includes(o.kode)) return gagal(400, `kode harus ${KODE.join("/")}`);
  if (o.terjadi !== 0 && o.terjadi !== 1) return gagal(400, "terjadi harus 0 atau 1");
  const nilai = num(o.nilai, -1000, 100000), catatan = tx(o.catatan, 500);
  if (Number.isNaN(nilai)) return gagal(400, "nilai harus angka -1000 sampai 100000");
  if (catatan === undefined) return gagal(400, "catatan maksimal 500 karakter");
  await env.DB.prepare(`INSERT INTO prediksi_konfirmasi (kab, tanggal, kode, terjadi, nilai, catatan, sumber, kode_regu, dibuat) VALUES (?, ?, ?, ?, ?, ?, 'regu', ?, ?)
    ON CONFLICT (kab, tanggal, kode, kode_regu) DO UPDATE SET terjadi = excluded.terjadi, nilai = excluded.nilai, catatan = excluded.catatan, dibuat = excluded.dibuat`)
    .bind(kab, o.tanggal, o.kode, o.terjadi, nilai, catatan, regu ? regu.id : "admin", new Date(kini).toISOString()).run();
  return json({ok: true});
}

async function baca(env, req, url, kini = Date.now()) {
  const tolak = await periksaToken(env, req); if (tolak) return tolak;
  const sejak = url.searchParams.get("sejak") || wib(kini - 7 * HARI);
  if (!tglSah(sejak)) return gagal(400, "sejak harus YYYY-MM-DD");
  const regu = (await env.DB.prepare("SELECT kab, tanggal, kode, terjadi, nilai, catatan, sumber FROM prediksi_konfirmasi WHERE tanggal >= ? ORDER BY tanggal, kab, kode LIMIT 5000").bind(sejak).all()).results;
  /* warga: laporan tak disembunyikan sejak tanggal itu (WIB), per kab-tanggal-kode, positif saja; tanpa teks/koordinat/identitas */
  const w = (await env.DB.prepare(`SELECT w.kab, date(l.dibuat / 1000 + 25200, 'unixepoch') tanggal, l.bahaya FROM laporan l JOIN laporan_wilayah w ON w.laporan_id = l.id
    WHERE w.kab IS NOT NULL AND l.disembunyikan = 0 AND l.dibuat >= ? AND l.bahaya IN ('karhutla','banjir','longsor','rob','cuaca','udara') GROUP BY 1, 2, 3 LIMIT 5000`)
    .bind(Date.parse(sejak + "T00:00:00+07:00")).all()).results;
  const ada = new Set(regu.map(r => [r.kab.toLowerCase(), r.tanggal, r.kode].join("|")));
  const warga = w.map(r => ({kab: r.kab, tanggal: r.tanggal, kode: BAHAYA_KODE[r.bahaya], terjadi: 1, nilai: null, catatan: null, sumber: "warga"}))
    .filter(r => !ada.has([r.kab.toLowerCase(), r.tanggal, r.kode].join("|")));
  return json({sejak, konfirmasi: [...regu, ...warga]}, 200, {"cache-control": "no-store"});
}

export const RUTE_PREDIKSI = {
  "POST /api/prediksi/konfirmasi": (env, req, url) => konfirmasi(env, req, url),
  "GET /api/prediksi/konfirmasi": (env, req, url) => baca(env, req, url),
};
