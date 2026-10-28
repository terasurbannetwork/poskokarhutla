/* Direktori pakar kebencanaan /akademisi (docs/bnpb/RENCANA-AKADEMISI.md). Keputusan pemilik 28 Okt 2026: HANYA staf BNPB dan admin.
   Data pribadi ribuan dosen TIDAK boleh di public/ (aset statis) maupun di repo (repo publik): satu berkas JSON di R2 MEDIA,
   kunci akademisi/induk.json, diunggah dari mesin pemilik (scripts tidak ikut repo). Rute ini hanya meneruskan berkas itu setelah sesi lolos. */
import {gagal, json, cacheTepi} from "./worker.js";
import {stafOK, PERAN} from "./staf.js";

const KUNCI = "akademisi/induk.json";

async function induk(env, req) {
  if (!(await stafOK(env, req, Object.keys(PERAN)))) return gagal(401, "masuk sebagai staf BNPB atau admin");
  if (!env.MEDIA) return gagal(503, "penyimpanan belum tersedia");
  const o = await env.MEDIA.get(KUNCI);
  if (!o) return gagal(503, "data akademisi belum diunggah ke R2");
  return new Response(o.body, {headers: {"content-type": "application/json; charset=utf-8", "cache-control": "private, no-store",
    "x-content-type-options": "nosniff", "x-diperbarui": o.uploaded.toISOString()}});
}

/* GET /api/akademisi/karya/<id OpenAlex>: 8 karya paling banyak dikutip, diringkas dari OpenAlex (data publik) dengan kunci env.OPENALEX_KEY
   (tanpa kunci OpenAlex membatasi per IP dan sering 429). Sesi staf dicek DULU, baru cache tepi 1 hari. Sumber gagal = 502, layar menyembunyikan bagiannya. */
const ID_OA = /^A\d{4,12}$/, MAKS_KARYA = 8;
async function karya(env, req, ctx, id) {
  if (!(await stafOK(env, req, Object.keys(PERAN)))) return gagal(401, "masuk sebagai staf BNPB atau admin");
  if (!ID_OA.test(id)) return gagal(404, "pakar tidak dikenal");
  return cacheTepi(new Request("https://akademisi.karya/" + id), ctx, 86400, async () => {
    const u = new URL("https://api.openalex.org/works");
    u.searchParams.set("filter", "author.id:" + id); u.searchParams.set("sort", "cited_by_count:desc"); u.searchParams.set("per-page", String(MAKS_KARYA));
    u.searchParams.set("select", "id,doi,display_name,publication_year,cited_by_count,primary_location,authorships");
    const p = new URL("https://api.openalex.org/authors/" + id); p.searchParams.set("select", "counts_by_year,summary_stats");
    if (env.OPENALEX_KEY) { u.searchParams.set("api_key", env.OPENALEX_KEY); p.searchParams.set("api_key", env.OPENALEX_KEY); }
    let j, pr;
    try {
      const [r, rp] = await Promise.all([fetch(u, {signal: AbortSignal.timeout(8000)}), fetch(p, {signal: AbortSignal.timeout(8000)})]);
      if (!r.ok) { rp.body?.cancel(); return gagal(502, `OpenAlex ${r.status}`); }
      j = await r.json(); pr = rp.ok ? await rp.json() : (rp.body?.cancel(), null);   // profil gagal = karya tetap tampil tanpa grafik
    } catch (e) { return gagal(502, "OpenAlex tidak menjawab"); }
    /* seri tahunan (OpenAlex hanya ~10 tahun terakhir), urut naik: [tahun, karya, sitasi] */
    const tahunan = (pr?.counts_by_year || []).filter(c => Number.isInteger(c?.year)).map(c => [c.year, c.works_count ?? 0, c.cited_by_count ?? 0]).sort((a, b) => a[0] - b[0]);
    const JENIS = {journal: "Jurnal", conference: "Prosiding", repository: "Repositori", "book series": "Buku", ebook_platform: "Buku"};
    const karya = (j.results || []).filter(w => w?.display_name).map(w => {
      const nama = (w.authorships || []).map(a => a?.author?.display_name).filter(Boolean), ke = (w.authorships || []).findIndex(a => String(a?.author?.id || "").endsWith("/" + id));
      return {judul: String(w.display_name).slice(0, 300), url: /^https:\/\//.test(w.doi || "") ? w.doi : String(w.id || "").replace(/^https?:\/\/openalex\.org\//, "https://openalex.org/"),
        tahun: w.publication_year ?? null, sitasi: w.cited_by_count ?? 0, terbitan: w.primary_location?.source?.display_name?.slice(0, 160) || "",
        penulis: nama.slice(0, 3).join(", ") + (nama.length > 3 ? " dkk." : ""), urutan: ke >= 0 ? ke + 1 : null, jumlah_penulis: (w.authorships || []).length,
        jenis: JENIS[w.primary_location?.source?.type] || ""};
    });
    return json({karya, tahunan, i10: pr?.summary_stats?.i10_index ?? null});
  });
}

/* GET /api/akademisi/sinta/<SINTA ID>: rincian profil SINTA hasil panen (metrik Scopus/GScholar, skor, grafik per tahun, artikel Scopus
   berkuartil). Disimpan di R2 dalam 64 pecahan (akademisi/sinta/<id % 64>.json, peta id -> rincian) supaya satu permintaan hanya mengurai
   berkas kecil. Staf saja; tidak ada rincian = 404 dan layar diam. */
const ID_SINTA = /^\d{1,9}$/, PECAHAN = 64;
async function sinta(env, req, id) {
  if (!(await stafOK(env, req, Object.keys(PERAN)))) return gagal(401, "masuk sebagai staf BNPB atau admin");
  if (!ID_SINTA.test(id)) return gagal(404, "pakar tidak dikenal");
  if (!env.MEDIA) return gagal(503, "penyimpanan belum tersedia");
  const o = await env.MEDIA.get(`akademisi/sinta/${Number(id) % PECAHAN}.json`);
  const x = o ? (await o.json())[id] : null;
  return x ? json(x, 200, {"cache-control": "private, max-age=3600"}) : gagal(404, "rincian SINTA belum dipanen");
}

export const RUTE_AKADEMISI = {"GET /api/akademisi": (env, req) => induk(env, req),
  "GET /api/akademisi/karya/:id": (env, req, url, kini, ctx, id) => karya(env, req, ctx, id),
  "GET /api/akademisi/sinta/:id": (env, req, url, kini, ctx, id) => sinta(env, req, id)};
