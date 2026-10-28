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
const ID_OA = /^A\d{4,12}$/, MAKS_KARYA = 8, MAKS_HAL = 50;
/* saringan dari layar, divalidasi di sini: ?hal=1..50, ?urut=sitasi|terbaru, ?jenis=jurnal|prosiding|buku, ?cari=<= 80 huruf (tanpa , | : yang memecah sintaks filter OpenAlex) */
const URUT = {sitasi: "cited_by_count:desc", terbaru: "publication_date:desc"}, JENIS_OA = {jurnal: "journal", prosiding: "conference", buku: "book series"};
async function karya(env, req, ctx, id, url) {
  if (!(await stafOK(env, req, Object.keys(PERAN)))) return gagal(401, "masuk sebagai staf BNPB atau admin");
  if (!ID_OA.test(id)) return gagal(404, "pakar tidak dikenal");
  const q = url.searchParams, hal = Math.min(MAKS_HAL, Math.max(1, parseInt(q.get("hal"), 10) || 1)), urut = URUT[q.get("urut")] ? q.get("urut") : "sitasi",
    jenis = JENIS_OA[q.get("jenis")] ? q.get("jenis") : "", cari = (q.get("cari") || "").replace(/[,|:]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80),
    orcid = /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/.test(q.get("orcid") || "") ? q.get("orcid") : "";
  const kunci = new URL("https://akademisi.karya/" + id); kunci.search = new URLSearchParams({hal, urut, jenis, cari, orcid}).toString();
  return cacheTepi(new Request(kunci), ctx, 86400, async () => {
    const u = new URL("https://api.openalex.org/works");
    u.searchParams.set("filter", ["author.id:" + id, jenis && "primary_location.source.type:" + JENIS_OA[jenis], cari && "title.search:" + cari].filter(Boolean).join(","));
    u.searchParams.set("sort", URUT[urut]); u.searchParams.set("per-page", String(MAKS_KARYA)); u.searchParams.set("page", String(hal));
    u.searchParams.set("select", "id,doi,display_name,publication_year,cited_by_count,primary_location,authorships");
    const p = new URL("https://api.openalex.org/authors/" + id); p.searchParams.set("select", "counts_by_year,summary_stats");
    if (env.OPENALEX_KEY) { u.searchParams.set("api_key", env.OPENALEX_KEY); p.searchParams.set("api_key", env.OPENALEX_KEY); }
    let j, pr, ok;
    try {
      const [r, rp, ro] = await Promise.all([fetch(u, {signal: AbortSignal.timeout(8000)}), fetch(p, {signal: AbortSignal.timeout(8000)}),
        orcid && hal === 1 ? fetch(`https://pub.orcid.org/v3.0/${orcid}/record`, {headers: {accept: "application/json"}, signal: AbortSignal.timeout(8000)}).catch(() => null) : null]);
      ok = ro?.ok ? await ro.json().catch(() => null) : (ro?.body?.cancel(), null);
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
    return json({karya, jumlah: j.meta?.count ?? karya.length, hal, per_hal: MAKS_KARYA, tahunan, i10: pr?.summary_stats?.i10_index ?? null, ...(orcid && hal === 1 ? {orcid: ringkasOrcid(ok)} : {})});
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

/* rekaman publik ORCID -> {publik, biografi, pendidikan, pekerjaan}; publik = ada isi yang bisa dilihat siapa pun (rekaman kosong: tautan disembunyikan layar) */
const thn = d => Number(d?.year?.value) || null;
function riwayat(a, jenis) {
  return (a?.[jenis + "s"]?.["affiliation-group"] || []).flatMap(g => g.summaries || []).map(x => x[jenis + "-summary"]).filter(Boolean).map(x => ({
    institusi: String(x.organization?.name || "").slice(0, 160), peran: String(x["role-title"] || "").slice(0, 160), unit: String(x["department-name"] || "").slice(0, 160),
    mulai: thn(x["start-date"]), selesai: thn(x["end-date"])})).filter(x => x.institusi).sort((a, b) => (b.mulai || 0) - (a.mulai || 0)).slice(0, 12);
}
export function ringkasOrcid(r) {
  if (!r) return {publik: false};
  const a = r["activities-summary"] || {}, biografi = String(r.person?.biography?.content || "").trim().slice(0, 2000);
  const pendidikan = riwayat(a, "education"), pekerjaan = riwayat(a, "employment"), karya = (a.works?.group || []).length;
  return {publik: !!(biografi || pendidikan.length || pekerjaan.length || karya), biografi, pendidikan, pekerjaan};
}

export const RUTE_AKADEMISI = {"GET /api/akademisi": (env, req) => induk(env, req),
  "GET /api/akademisi/karya/:id": (env, req, url, kini, ctx, id) => karya(env, req, ctx, id, url),
  "GET /api/akademisi/sinta/:id": (env, req, url, kini, ctx, id) => sinta(env, req, id)};
