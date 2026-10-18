/* Ubin peta PMTiles dari R2 (binding MEDIA, kunci "ubin/<nama>.pmtiles"). Baca-saja, publik, mendukung satu Range.
   Diunggah manual ke bucket; tidak ada daftar direktori. Dipanggil dari fetch() di worker.js sebelum rute lain. */
export const UBIN = new Set(["sawit", "kelapa", "terbangun", "jalan_logging"]);   // daftar putih nama; nama final dari pipa-data, ganti di sini saja
const NAMA = /^\/ubin\/([a-z0-9_-]{1,40})\.pmtiles$/;
const CORS = {"access-control-allow-origin": "*", "access-control-expose-headers": "Content-Range, Content-Length, ETag, Accept-Ranges"};
const CC = "public, max-age=86400, stale-while-revalidate=604800";
const polos = (status, teks, extra = {}) => new Response(teks, {status, headers: {"content-type": "text/plain; charset=utf-8", ...CORS, ...extra}});

/* "bytes=a-b" | "bytes=a-" | "bytes=-n" -> [awal, akhir] inklusif; null = tidak valid. ponytail: satu rentang saja, multi-rentang = 416. */
export function uraiRange(h, size) {
  const m = /^bytes=(\d*)-(\d*)$/.exec(h.trim());
  if (!m || (m[1] === "" && m[2] === "")) return null;
  if (m[1] === "") { const n = +m[2]; return n === 0 || size === 0 ? null : [Math.max(0, size - n), size - 1]; }
  const a = +m[1], b = m[2] === "" ? size - 1 : Math.min(+m[2], size - 1);
  return a >= size || a > b ? null : [a, b];
}

const dasar = etag => ({...CORS, "content-type": "application/octet-stream", etag, "accept-ranges": "bytes", "cache-control": CC, "x-content-type-options": "nosniff"});
const cocokEtag = (inm, etag) => inm && (inm.trim() === "*" || inm.split(",").some(e => e.trim().replace(/^W\//, "") === etag));

/* cache: Cache API (caches.default) bisa disuntik untuk uji. Cache API menolak put() respons 206, jadi potongan disimpan sebagai 200
   bertanda x-ubin-status dan dikembalikan sebagai 206. Hanya potongan Range yang di-cache; 200 penuh (berkas besar) dialirkan langsung. */
export async function layaniUbin(req, env, ctx, cache = globalThis.caches?.default) {
  const url = new URL(req.url);
  if (!url.pathname.startsWith("/ubin/")) return null;
  if (req.method === "OPTIONS")
    return new Response(null, {status: 204, headers: {...CORS, "access-control-allow-methods": "GET, HEAD, OPTIONS", "access-control-allow-headers": "Range, If-None-Match, If-Range", "access-control-max-age": "86400"}});
  if (req.method !== "GET" && req.method !== "HEAD") return polos(405, "metode tidak diizinkan", {allow: "GET, HEAD, OPTIONS"});
  const m = NAMA.exec(url.pathname);
  if (!m || !UBIN.has(m[1])) return polos(404, "tidak ada", {"cache-control": "public, max-age=3600"});
  const kepala = req.method === "HEAD", rg0 = req.headers.get("range"), ifr = req.headers.get("if-range"), inm = req.headers.get("if-none-match");
  const kc = cache && rg0 && !kepala ? new Request(`${url.origin}${url.pathname}?r=${encodeURIComponent(rg0.trim())}`) : null;
  if (kc) {
    const c = await cache.match(kc);
    if (c && c.headers.get("x-ubin-status") === "206") {
      const et = c.headers.get("etag");
      if (cocokEtag(inm, et)) return new Response(null, {status: 304, headers: dasar(et)});
      if (!ifr || ifr === et) { const hd = new Headers(c.headers); hd.delete("x-ubin-status"); return new Response(c.body, {status: 206, headers: hd}); }
    }
  }
  if (!env.MEDIA) return polos(503, "penyimpanan belum terpasang");
  const kunci = `ubin/${m[1]}.pmtiles`, h = await env.MEDIA.head(kunci);
  if (!h) return polos(404, "tidak ada", {"cache-control": "public, max-age=60"});
  if (cocokEtag(inm, h.httpEtag)) return new Response(null, {status: 304, headers: dasar(h.httpEtag)});
  const rg = rg0 && (!ifr || ifr === h.httpEtag) ? rg0 : null;   // If-Range tak cocok: abaikan Range, kirim penuh
  const r = rg ? uraiRange(rg, h.size) : null;
  if (rg && !r) return polos(416, "rentang tidak valid", {"content-range": `bytes */${h.size}`});
  if (kepala) return new Response(null, r ? {status: 206, headers: {...dasar(h.httpEtag), "content-range": `bytes ${r[0]}-${r[1]}/${h.size}`, "content-length": String(r[1] - r[0] + 1)}}
    : {headers: {...dasar(h.httpEtag), "content-length": String(h.size)}});
  const o = await env.MEDIA.get(kunci, r ? {range: {offset: r[0], length: r[1] - r[0] + 1}} : undefined);
  if (!o) return polos(404, "tidak ada", {"cache-control": "public, max-age=60"});
  if (o.size !== h.size || o.httpEtag !== h.httpEtag) { o.body?.cancel?.().catch?.(() => {}); return polos(503, "berkas berubah, coba lagi", {"retry-after": "5"}); }   // berkas diganti di antara head dan get
  if (!r) return new Response(o.body, {headers: {...dasar(o.httpEtag), "content-length": String(o.size)}});
  const hd = {...dasar(o.httpEtag), "content-range": `bytes ${r[0]}-${r[1]}/${o.size}`, "content-length": String(r[1] - r[0] + 1)};
  if (kc && cache) {
    const [a, b] = o.body.tee();
    const p = cache.put(kc, new Response(b, {status: 200, headers: {...hd, "x-ubin-status": "206"}})).catch(() => {});
    ctx?.waitUntil ? ctx.waitUntil(p) : await p;
    return new Response(a, {status: 206, headers: hd});
  }
  return new Response(o.body, {status: 206, headers: hd});
}
