/* Rute /ubin/<nama>.pmtiles: handler asli (src/ubin.js dan lewat default.fetch worker.js) melawan R2 palsu berpenyangga memori
   dan Cache API palsu yang disuntik. */
import {test as uji} from "node:test";
import assert from "node:assert/strict";
import {layaniUbin, uraiRange, UBIN} from "../../src/ubin.js";
import worker from "../../src/worker.js";
import {readFileSync} from "node:fs";

const ISI = new Uint8Array(1000).map((_, i) => (i * 7 + 3) & 255), ETAG = '"abc123"', NAMA = [...UBIN][0], J = `/ubin/${NAMA}.pmtiles`;
function r2(ubah = {}) {
  const n = {head: 0, get: 0};
  return {n, async head(k) { n.head++; return k === `ubin/${NAMA}.pmtiles` ? {size: ISI.length, httpEtag: ETAG} : null; },
    async get(k, o) {
      n.get++; if (k !== `ubin/${NAMA}.pmtiles`) return null;
      const a = o?.range?.offset ?? 0, l = o?.range?.length ?? ISI.length - a;
      return {size: ISI.length, httpEtag: ETAG, ...ubah, body: new Response(ISI.slice(a, a + l)).body};
    }};
}
const cachePalsu = () => { const m = new Map(); return {m, async match(q) { const r = m.get(q.url); return r?.clone(); }, async put(q, r) { if (r.status === 206) throw new TypeError("206 ditolak"); m.set(q.url, r); }}; };
const ambil = (jalur, init = {}, e = {MEDIA: r2()}, cache = null) => layaniUbin(new Request("https://x.test" + jalur, init), e, undefined, cache);
const bita = async r => new Uint8Array(await r.arrayBuffer());

uji("ubin: 200 penuh, header publik dan cache", async () => {
  const r = await ambil(J);
  assert.equal(r.status, 200);
  assert.equal(r.headers.get("content-length"), "1000");
  assert.equal(r.headers.get("accept-ranges"), "bytes");
  assert.equal(r.headers.get("etag"), ETAG);
  assert.equal(r.headers.get("access-control-allow-origin"), "*");
  assert.match(r.headers.get("access-control-expose-headers"), /Content-Range.*ETag.*Accept-Ranges/);
  assert.equal(r.headers.get("cache-control"), "public, max-age=86400, stale-while-revalidate=604800");
  assert.deepEqual(await bita(r), ISI);
});

uji("ubin: Range a-b, a-, -n memberi 206 dengan byte tepat", async () => {
  for (const [rg, a, b] of [["bytes=10-19", 10, 19], ["bytes=990-", 990, 999], ["bytes=-5", 995, 999], ["bytes=900-5000", 900, 999], ["bytes=-5000", 0, 999]]) {
    const r = await ambil(J, {headers: {range: rg}});
    assert.equal(r.status, 206, rg);
    assert.equal(r.headers.get("content-range"), `bytes ${a}-${b}/1000`, rg);
    assert.equal(r.headers.get("content-length"), String(b - a + 1), rg);
    assert.deepEqual(await bita(r), ISI.slice(a, b + 1), rg);
  }
});

uji("ubin: Range tak valid ditolak 416 dengan content-range */ukuran", async () => {
  for (const rg of ["bytes=1000-", "bytes=500-100", "bytes=-0", "bytes=-", "bytes=0-1,5-6", "items=0-1", "bytes=a-b"]) {
    const r = await ambil(J, {headers: {range: rg}});
    assert.equal(r.status, 416, rg);
    assert.equal(r.headers.get("content-range"), "bytes */1000", rg);
  }
  assert.equal(uraiRange("bytes=0-0", 1).join(), "0,0");
});

uji("ubin: If-None-Match cocok memberi 304 tanpa badan", async () => {
  for (const v of [ETAG, "W/" + ETAG, '"zzz", ' + ETAG, "*"]) {
    const r = await ambil(J, {headers: {"if-none-match": v}});
    assert.equal(r.status, 304, v);
    assert.equal((await bita(r)).length, 0);
  }
  assert.equal((await ambil(J, {headers: {"if-none-match": '"lain"'}})).status, 200);
});

uji("ubin: HEAD tanpa badan, panjang benar; HEAD+Range 206", async () => {
  const r = await ambil(J, {method: "HEAD"});
  assert.equal(r.status, 200); assert.equal(r.headers.get("content-length"), "1000"); assert.equal((await bita(r)).length, 0);
  const s = await ambil(J, {method: "HEAD", headers: {range: "bytes=0-15"}});
  assert.equal(s.status, 206); assert.equal(s.headers.get("content-length"), "16");
});

uji("ubin: nama di luar daftar putih = 404 tanpa menyentuh R2, cache 1 jam", async () => {
  const e = {MEDIA: r2()};
  for (const j of ["/ubin/", "/ubin/Riau.pmtiles", "/ubin/riau.pmtiles", `${J}/x`, "/ubin/a.b.pmtiles", "/ubin/..%2Ffoto.pmtiles", "/ubin/" + "a".repeat(41) + ".pmtiles", `/ubin/${NAMA}.json`]) {
    const r = await ambil(j, {}, e);
    assert.equal(r.status, 404, j);
    assert.equal(r.headers.get("cache-control"), "public, max-age=3600", j);
  }
  assert.equal(await ambil("/ubin", {}, e), null);
  assert.deepEqual(e.MEDIA.n, {head: 0, get: 0}, "R2 tidak boleh dipanggil untuk nama di luar daftar");
  const ada = {MEDIA: r2()}; // nama dalam daftar tapi objek tak ada di R2
  const lain = [...UBIN][1];
  assert.equal((await ambil(`/ubin/${lain}.pmtiles`, {}, ada)).status, 404);
});

uji("ubin: metode dicek sebelum nama; OPTIONS 204; tanpa MEDIA 503", async () => {
  const e = {MEDIA: r2()};
  for (const j of [J, "/ubin/ngawur.pmtiles", "/ubin/"]) {
    const p = await ambil(j, {method: "POST", body: "x"}, e);
    assert.equal(p.status, 405, j); assert.equal(p.headers.get("allow"), "GET, HEAD, OPTIONS");
  }
  const o = await ambil(J, {method: "OPTIONS"}, e);
  assert.equal(o.status, 204);
  assert.match(o.headers.get("access-control-allow-headers"), /Range/);
  assert.equal(o.headers.get("access-control-allow-origin"), "*");
  assert.equal((await ambil(J, {}, {})).status, 503);
  assert.deepEqual(e.MEDIA.n, {head: 0, get: 0});
});

uji("ubin: If-Range tak cocok mengabaikan Range dan kirim 200 penuh", async () => {
  const a = await ambil(J, {headers: {range: "bytes=0-9", "if-range": '"lain"'}});
  assert.equal(a.status, 200); assert.equal(a.headers.get("content-length"), "1000"); assert.deepEqual(await bita(a), ISI);
  const b = await ambil(J, {headers: {range: "bytes=0-9", "if-range": ETAG}});
  assert.equal(b.status, 206); assert.deepEqual(await bita(b), ISI.slice(0, 10));
  const c = await ambil(J, {headers: {range: "bytes=5000-", "if-range": '"lain"'}});   // Range tak valid pun diabaikan bila If-Range tak cocok
  assert.equal(c.status, 200);
});

uji("ubin: ukuran atau etag objek get beda dari head = 503", async () => {
  for (const [ubah, rg] of [[{size: 999}, "bytes=0-9"], [{size: 999}, null], [{httpEtag: '"baru"'}, "bytes=0-9"]]) {
    const r = await ambil(J, {headers: rg ? {range: rg} : {}}, {MEDIA: r2(ubah)});
    assert.equal(r.status, 503, JSON.stringify(ubah) + rg);
  }
});

uji("ubin: potongan Range di-cache; ulangan tidak memukul R2 dan menghormati If-None-Match/If-Range", async () => {
  const c = cachePalsu(), e = {MEDIA: r2()}, h = {range: "bytes=100-199"};
  const a = await ambil(J, {headers: h}, e, c);
  assert.equal(a.status, 206); assert.deepEqual(await bita(a), ISI.slice(100, 200));
  assert.deepEqual(e.MEDIA.n, {head: 1, get: 1}); assert.equal(c.m.size, 1);
  const b = await ambil(J, {headers: h}, e, c);
  assert.equal(b.status, 206); assert.deepEqual(await bita(b), ISI.slice(100, 200));
  assert.equal(b.headers.get("content-range"), "bytes 100-199/1000"); assert.equal(b.headers.get("etag"), ETAG);
  assert.equal(b.headers.get("x-ubin-status"), null);
  assert.deepEqual(e.MEDIA.n, {head: 1, get: 1}, "ulangan dilayani dari cache");
  assert.equal((await ambil(J, {headers: {...h, "if-none-match": ETAG}}, e, c)).status, 304);
  const ir = await ambil(J, {headers: {...h, "if-range": '"lain"'}}, e, c);   // If-Range tak cocok: lewati cache, kirim penuh
  assert.equal(ir.status, 200); assert.equal(e.MEDIA.n.head, 2);
  await ambil(J, {headers: {range: "bytes=9999-"}}, e, c);   // 416 tidak di-cache
  assert.equal(c.m.size, 1);
});

uji("ubin: lewat worker.fetch melayani /ubin/ dan tidak mengganggu aset lain", async () => {
  const aset = {fetch: async () => new Response("aset", {status: 200})};
  const e = {MEDIA: r2(), ASSETS: aset};
  const r = await worker.fetch(new Request("https://x.test" + J, {headers: {range: "bytes=0-3"}}), e, {waitUntil() {}});
  assert.equal(r.status, 206); assert.deepEqual(await bita(r), ISI.slice(0, 4));
  const s = await worker.fetch(new Request("https://x.test/index.css"), e, {});
  assert.equal(await s.text(), "aset");
});

uji("himawari: R2 data/himawari.json disajikan; objek hilang = kosong 200", async () => {
  const isi = '{"acuan":"2026-10-19T00:00Z","baris":[[-2,114,1,5,1,1,1]]}', ada = {MEDIA: {get: async k => k === "data/himawari.json" ? {body: new Response(isi).body} : null},
    /* poligon provinsi asli: /api/himawari hanya mengirim titik di wilayah Indonesia */
    ASSETS: {fetch: async q => new Response(readFileSync(new URL("../../public" + new URL(q.url).pathname, import.meta.url)))}};
  const a = await worker.fetch(new Request("https://x.test/api/himawari"), ada, undefined);
  assert.equal(a.status, 200); assert.match(a.headers.get("content-type"), /application\/json/); assert.match(a.headers.get("cache-control"), /max-age=300/);
  const j = await a.json(); assert.deepEqual(j.baris, [[-2, 114, 1, 5, 1, 1, 1, 1, 1, 0, 0]]); assert.match(j.wilayah[0], /^62\|/); assert.equal(j.n_baru, 0); assert.equal(j.kolom.at(-1), "w");
  const b = await worker.fetch(new Request("https://x.test/api/himawari?x=1"), {MEDIA: {get: async () => null}}, undefined);
  assert.equal(b.status, 200); assert.deepEqual(await b.json(), {acuan: null, baris: [], n_baru: 0});
});
