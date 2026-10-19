/* Arsip sitrep harian (C10, docs/bnpb/RENCANA-SEMPURNA-12-JAM.md): yang diarsipkan MASUKAN sitrep, bukan HTML-nya.
   Cron 00:05 dan 00:35 UTC (= 07 WIB; yang kedua hanya ulang bila yang pertama gagal) mengambil semua masukan yang dibaca public/bnpb/sitrep.js,
   merakit SATU JSON tanpa parse (potongan teks disambung), gzip, lalu R2 MEDIA `sitrep/YYYY-MM-DD.json.gz`. Hari yang sudah ada tidak ditulis ulang.
   Masukan semuanya agregat/publik (tidak ada wa/email/kode). Sitrep.js dengan ?tgl= menukar fetch() jadi pembacaan isi arsip ini.
   Cara ambil: aset lewat env.ASSETS.fetch; API lewat worker.fetch(...) sendiri (pemanggilan handler internal, bukan HTTP keluar:
   subrequest ke zona sendiri dari Worker yang sama memakan jatah subrequest dan kena loop-guard, sedangkan pemanggilan fungsi tidak). */
import worker, {json, gagal, cacheTepi} from "./worker.js";

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
  const teks = await Promise.all(jalur.map(([, j, a]) => ambilTeks(env, j, a)));
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
  return cacheTepi(req, ctx, 86400, async () => {
    const o = await env.MEDIA.get(kunciR2(tgl));
    if (!o) return gagal(404, "arsip tanggal itu tidak ada");
    return new Response(o.body, {headers: {"content-type": "application/json; charset=utf-8", "content-encoding": "gzip", "vary": "accept-encoding", "x-content-type-options": "nosniff"}});
  });
}
/* 60 hari terakhir yang tersedia, terbaru dulu. startAfter memotong daftar di R2 (tanpa itu list 1000 pertama = hari tertua). */
async function daftar(env, req, url, kini, ctx) {
  if (!env.MEDIA) return gagal(503, "penyimpanan arsip belum diaktifkan (R2 binding MEDIA)");
  return cacheTepi(req, ctx, 600, async () => {
    const l = await env.MEDIA.list({prefix: "sitrep/", startAfter: kunciR2(wibTgl(kini - 61 * 86400e3)), limit: 200});
    const tgl = l.objects.map(o => /^sitrep\/(\d{4}-\d\d-\d\d)\.json\.gz$/.exec(o.key)?.[1]).filter(Boolean).sort().reverse().slice(0, 60);
    return json({tgl});
  });
}

export const RUTE_SITREP = {
  "GET /api/sitrep/arsip": arsip,
  "GET /api/sitrep/arsip/daftar": daftar,
};
