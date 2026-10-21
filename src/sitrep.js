/* Arsip sitrep harian (C10, docs/bnpb/RENCANA-SEMPURNA-12-JAM.md): yang diarsipkan MASUKAN sitrep, bukan HTML-nya.
   Cron 00:05 dan 00:35 UTC (= 07 WIB; yang kedua hanya ulang bila yang pertama gagal) mengambil semua masukan yang dibaca public/bnpb/sitrep.js,
   merakit SATU JSON tanpa parse (potongan teks disambung), gzip, lalu R2 MEDIA `sitrep/YYYY-MM-DD.json.gz`. Hari yang sudah ada tidak ditulis ulang.
   Masukan semuanya agregat/publik (tidak ada wa/email/kode). Sitrep.js dengan ?tgl= menukar fetch() jadi pembacaan isi arsip ini.
   Cara ambil: aset lewat env.ASSETS.fetch; API lewat worker.fetch(...) sendiri (pemanggilan handler internal, bukan HTTP keluar:
   subrequest ke zona sendiri dari Worker yang sama memakan jatah subrequest dan kena loop-guard, sedangkan pemanggilan fungsi tidak). */
import worker, {json, gagal, cacheTepi, bacaBody} from "./worker.js";
import {modOK} from "./posko.js";

const ASET = ["/bencana.json", "/data/meta.json", "/data/laporan.json", "/banjir/data/laporan.json", "/gempa/data/laporan.json", "/banjir/data/cuaca_laporan.json",
  "/udara/data/laporan.json", "/data/kekeringan_laporan.json", "/banjir/data/gunungapi_status.json"];
const API = ["/api/warga?jam=24", "/api/relawan/ringkas", "/api/meja/ringkas", "/api/alun?jenis=butuh_bantuan"];
const ASAL = "https://sitrep.internal", ctxKosong = {waitUntil() {}, passThroughOnException() {}};
const TGL = /^(\d{4})-(\d\d)-(\d\d)$/, kunciR2 = tgl => `sitrep/${tgl}.json.gz`;
const wibTgl = ms => new Date(ms + 7 * 3600e3).toISOString().slice(0, 10);
const sahTgl = t => { const d = TGL.test(t || "") && new Date(t + "T00:00:00Z"); return !!d && !isNaN(d) && d.toISOString().slice(0, 10) === t; };   // 2026-02-30 ikut gugur (tergulung ke Maret)

/* teks JSON mentah atau null; tidak di-parse (hemat CPU Free 10 ms): hanya bentuk luar { } atau [ ] yang diperiksa, halaman galat HTML ditolak */
async function ambilTeks(env, jalur, aset) {
  try {
    const r = aset ? await env.ASSETS.fetch(new Request(ASAL + jalur)) : await worker.fetch(new Request(ASAL + jalur), env, ctxKosong);
    if (!r.ok) { r.body?.cancel(); return null; }
    const t = (await r.text()).trim();
    return /^[\[{]/.test(t) && /[\]}]$/.test(t) ? t : null;
  } catch (e) { return null; }
}
/* arsip hanya perlu hitungan per jenis (public/bnpb/sitrep.js wargaHitung baca jenis, benar, salah): tanpa teks, detail, id, dan tanpa koordinat sama sekali,
   jadi takedown moderator atas satu laporan tidak perlu merambat ke arsip */
function ringkasWarga(t) {
  try {
    const j = JSON.parse(t); if (!Array.isArray(j.features)) return null;
    return JSON.stringify({type: "FeatureCollection", terpotong: !!j.terpotong, features: j.features.map(f => ({type: "Feature", geometry: null,
      properties: {jenis: f.properties?.jenis, benar: f.properties?.benar || 0, salah: f.properties?.salah || 0}}))});
  } catch (e) { return null; }
}
async function gzip(teks) { return new Response(new Blob([teks]).stream().pipeThrough(new CompressionStream("gzip"))).arrayBuffer(); }

/* neraca Posko per provinsi hanya untuk provinsi yang punya baris hari ini (WIB): itu persis yang ditampilkan sitrep.js (/api/neraca tanpa tgl = hari ini).
   Satu query D1, lalu satu permintaan per provinsi berdata (musim karhutla: beberapa; di luar musim: nol), bukan 38. Tabel belum ada = kosong.
   ponytail: pukul 07 WIB neraca hari ini biasanya baru terisi sedikit; kalau pemilik ingin neraca KEMARIN yang penuh, ambil &tgl=kemarin dan simpan di kunci terpisah. */
async function provNeraca(env, kini) {
  try { return (await env.DB.prepare("SELECT DISTINCT prov FROM neraca_harian WHERE tgl = ? AND prov GLOB '[0-9][0-9]' ORDER BY prov").bind(wibTgl(kini)).all()).results.map(x => x.prov); }
  catch (e) { return []; }
}

export async function arsipkanSitrep(env, kini = Date.now()) {
  if (!env.MEDIA) return {lewat: "tanpa MEDIA"};
  const tgl = wibTgl(kini), kunci = kunciR2(tgl);
  if (await env.MEDIA.head(kunci)) return {lewat: "sudah ada", tgl};
  /* [kunci arsip = URL yang diambil sitrep.js, URL yang benar-benar diminta, aset?]; neraca diminta dengan &tgl= eksplisit supaya cocok dengan hari arsip */
  const jalur = [...ASET.map(j => [j, j, true]), ...API.map(j => [j, j, false]), ...(await provNeraca(env, kini)).map(p => [`/api/neraca?prov=${p}`, `/api/neraca?prov=${p}&tgl=${tgl}`, false])];
  const teks = await Promise.all(jalur.map(async ([k, j, a]) => { const t = await ambilTeks(env, j, a); return k === "/api/warga?jam=24" && t ? ringkasWarga(t) : t; }));
  if (!teks[0]) return {lewat: "bencana.json tidak terbaca", tgl};   // tanpa registry sitrep kosong; cron berikutnya mencoba lagi
  const ada = jalur.map((x, i) => teks[i] ? JSON.stringify(x[0]) + ":" + teks[i] : null).filter(Boolean);
  const gz = await gzip(`{"v":1,"tgl":"${tgl}","dibuat":${kini},"masukan":{${ada.join(",")}}}`);
  /* etagDoesNotMatch "*" = tulis hanya bila belum ada (dua cron serentak tidak saling timpa) */
  const o = await env.MEDIA.put(kunci, gz, {httpMetadata: {contentType: "application/json", contentEncoding: "gzip"}, onlyIf: {etagDoesNotMatch: "*"}});
  return o ? {tgl, masukan: ada.length, dari: jalur.length, byte: gz.byteLength} : {lewat: "sudah ada", tgl};
}

async function arsip(env, req, url, kini, ctx) {
  if (!env.MEDIA) return gagal(503, "penyimpanan arsip belum diaktifkan (R2 binding MEDIA)");
  const tgl = url.searchParams.get("tgl");
  if (!sahTgl(tgl) || tgl > wibTgl(kini)) return gagal(400, "tgl wajib YYYY-MM-DD yang sah dan bukan di masa depan");
  /* kunci cache dari parameter tervalidasi saja: parameter liar/ekstra tidak membuat entri cache baru */
  const kunci = new Request(`${url.origin}/api/sitrep/arsip?tgl=${tgl}`);
  return cacheTepi(kunci, ctx, 86400, async () => {
    const o = await env.MEDIA.get(kunciR2(tgl));
    if (!o) {   // cache negatif 1 jam untuk tanggal yang sudah lewat (hari ini bisa terbit 07 WIB); cacheTepi sendiri hanya menyimpan 200
      const r = gagal(404, "arsip tanggal itu tidak ada");
      if (tgl < wibTgl(kini) && globalThis.caches?.default) { const h = new Headers(r.headers); h.set("cache-control", "public, max-age=3600"); ctx?.waitUntil?.(globalThis.caches.default.put(kunci, new Response(r.clone().body, {status: 404, headers: h})).catch(() => {})); }
      return r;
    }
    /* isi R2 gzip: dibuka di sini dan dikirim sebagai JSON biasa (Cloudflare yang mengompres ke klien); content-encoding manual akan di-gzip ganda oleh workerd dan hilang di jalur cache */
    return new Response(o.body.pipeThrough(new DecompressionStream("gzip")), {headers: {"content-type": "application/json; charset=utf-8", "x-content-type-options": "nosniff"}});
  });
}
/* 60 hari terakhir yang tersedia, terbaru dulu. startAfter memotong daftar di R2 (tanpa itu list 1000 pertama = hari tertua). */
async function daftar(env, req, url, kini, ctx) {
  if (!env.MEDIA) return json({tgl: []});   // tanpa penyimpanan = belum ada arsip (bukan galat: halaman sitrep memanggil ini tiap dibuka)
  return cacheTepi(new Request(`${url.origin}/api/sitrep/arsip/daftar`), ctx, 600, async () => {
    const l = await env.MEDIA.list({prefix: "sitrep/", startAfter: kunciR2(wibTgl(kini - 61 * 86400e3)), limit: 200});
    const tgl = l.objects.map(o => /^sitrep\/(\d{4}-\d\d-\d\d)\.json\.gz$/.exec(o.key)?.[1]).filter(Boolean).sort().reverse().slice(0, 60);
    return json({tgl});
  });
}

/* retensi 400 hari; objek tertua dulu (kunci berurut tanggal), maks 50 hapus per panggilan */
export async function bersihkanArsipSitrep(env, kini = Date.now()) {
  if (!env.MEDIA) return 0;
  const batas = kunciR2(wibTgl(kini - 400 * 86400e3)), l = await env.MEDIA.list({prefix: "sitrep/", limit: 50});
  const lama = l.objects.map(o => o.key).filter(k => /^sitrep\/\d{4}-\d\d-\d\d\.json\.gz$/.test(k) && k < batas);
  if (lama.length) await env.MEDIA.delete(lama);
  return lama.length;
}
/* moderator menghapus satu tanggal (mis. memuat data yang kemudian disembunyikan) */
async function hapus(env, req, url) {
  if (!await modOK(env, req)) return gagal(403, "hanya untuk moderator ke atas");
  if (!env.MEDIA) return gagal(503, "penyimpanan arsip belum diaktifkan (R2 binding MEDIA)");
  const b = await bacaBody(req); if (b.galat) return gagal(b.status || 400, b.galat);
  if (typeof b.o.tgl !== "string" || !sahTgl(b.o.tgl)) return gagal(400, "tgl wajib YYYY-MM-DD yang sah");
  if (!await env.MEDIA.head(kunciR2(b.o.tgl))) return gagal(404, "arsip tanggal itu tidak ada");
  await env.MEDIA.delete(kunciR2(b.o.tgl));
  await globalThis.caches?.default?.delete(new Request(`${url.origin}/api/sitrep/arsip?tgl=${b.o.tgl}`)).catch(() => {});
  await globalThis.caches?.default?.delete(new Request(`${url.origin}/api/sitrep/arsip/daftar`)).catch(() => {});
  return json({ok: true, tgl: b.o.tgl});
}

export const RUTE_SITREP = {
  "POST /api/sitrep/arsip/hapus": hapus,
  "GET /api/sitrep/arsip": arsip,
  "GET /api/sitrep/arsip/daftar": daftar,
};
