/* RU-004 F0-1: pil "dicabut menurut teks" di /bnpb/hukum. Stub API; Chrome nyata dengan CSP dari src/bnpb.js. Tanpa Chrome: dilewati.
   Jalan: node --test tests/bnpb/hukum_pil_layar.test.mjs */
import {test} from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import {readFileSync, existsSync, statSync} from "node:fs";
import path from "node:path";
import {bukaPeramban, cariChrome} from "./_peramban.mjs";

const CSP = readFileSync(new URL("../../src/bnpb.js", import.meta.url), "utf8").match(/export const CSP = "([^"]+)"/)[1];
const PUB = path.resolve(new URL("../../public", import.meta.url).pathname), CHROME = cariChrome();
const TIPE = {".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml"};
const bukanSisi = g => !/favicon\.ico|fonts\.g(oogleapis|static)\.com|ERR_(INTERNET|NAME|CONNECTION)|status of 404/.test(g);
const dok = (id, status, dicabut_oleh) => ({id, judul: "Judul " + id, jenis: "PERBAN", singkatan: "perban", nomor: 6, tahun: 2021, status, halaman: 1, segmen: [{id: 1, jenis: "pasal", label: "Pasal 1", teks: "x"}], ...(dicabut_oleh ? {dicabut_oleh} : {})});
const hit = (id, status, dicabut_oleh) => ({segmen: 1, dok: id, judul: "J " + id, singkatan: "perban", nomor: 6, tahun: 2021, status, label: "Pasal 1", cuplikan: "[[x]]", ...(dicabut_oleh ? {dicabut_oleh} : {})});
const API = {
  "perban-6-2021": dok("perban-6-2021", "BERLAKU", ["perban-4-2025"]),
  "perban-6-2025": dok("perban-6-2025", "BERLAKU"),                         /* field belum ada (sebelum RU-002) */
  "perban-1-2000": dok("perban-1-2000", "DICABUT", ["perban-4-2025"]),      /* sudah DICABUT: bukan konflik */
};

test("pil dicabut menurut teks: hanya saat BERLAKU dan dicabut_oleh terisi; tautan ke pencabut; aman tanpa field", {skip: CHROME ? false : "Chrome tidak ada"}, async () => {
  const srv = http.createServer((q, r) => {
    const [u0, qs] = q.url.split("?"); let u = decodeURIComponent(u0);
    if (u === "/api/hukum/dok") { const b = API[new URLSearchParams(qs).get("id")]; r.writeHead(b ? 200 : 404, {"content-type": "application/json"}); return r.end(JSON.stringify(b || {galat: "tidak ada"})); }
    if (u === "/api/hukum/cari") { r.writeHead(200, {"content-type": "application/json"}); return r.end(JSON.stringify({total: 3, hal: 1, per_hal: 20, per_jenis: {}, hasil: [hit("perban-6-2021", "BERLAKU", ["perban-4-2025"]), hit("perban-6-2025", "BERLAKU"), hit("perban-1-2000", "DICABUT", ["perban-4-2025"])]})); }
    if (u === "/bnpb/hukum") u = "/bnpb/hukum.html";
    const f = path.join(PUB, u);
    if (!f.startsWith(PUB) || !existsSync(f) || !statSync(f).isFile()) { r.writeHead(404); return r.end(); }
    r.writeHead(200, {"content-type": TIPE[path.extname(f)] || "application/octet-stream", "content-security-policy": CSP}); r.end(readFileSync(f));
  });
  await new Promise(ok => srv.listen(0, "127.0.0.1", ok));
  const asal = `http://127.0.0.1:${srv.address().port}`, br = await bukaPeramban(), t = await br.tab();
  const n = sel => t.eval(`document.querySelectorAll(${JSON.stringify(sel)}).length`);
  try {
    await t.ukuran(1440, 900);
    await t.buka(asal + "/bnpb/hukum#d=perban-6-2021", {tunggu: ".hk-kepala"});
    assert.equal(await n(".hk-kepala [data-cabut]"), 1, "BERLAKU + dicabut_oleh = tepat satu pil");
    assert.equal(await t.eval("document.querySelector('.hk-kepala a[data-cabut]').getAttribute('href')"), "#d=perban-4-2025", "pil menaut ke pencabut");
    assert.equal(await t.eval("document.querySelector('.hk-kepala [data-cabut]').textContent"), "Dicabut oleh Perban 4/2025 menurut teks; JDIH masih BERLAKU");
    await t.buka(asal + "/bnpb/hukum#d=perban-6-2025", {tunggu: ".hk-kepala"});
    assert.equal(await n(".hk-kepala [data-cabut]"), 0, "tanpa field dicabut_oleh = tanpa pil dan tanpa galat");
    await t.buka(asal + "/bnpb/hukum#d=perban-1-2000", {tunggu: ".hk-kepala"});
    assert.equal(await n(".hk-kepala [data-cabut]"), 0, "status DICABUT bukan konflik");
    await t.buka(asal + "/bnpb/hukum#t=cari", {tunggu: "#fCari"});
    await t.eval("document.getElementById('q').value = 'x'; document.getElementById('fCari').requestSubmit(); 1");
    await t.tunggu(".hk-hit");
    assert.equal(await n(".hk-hit"), 3);
    assert.equal(await n(".hk-hit [data-cabut]"), 1, "di hasil cari: pil hanya pada hit konflik (1 dari 3)");
    assert.equal(await n(".hk-hit a"), 0, "pil di kartu hasil bukan <a> (tautan bersarang dilarang)");
    assert.deepEqual(t.galat().filter(bukanSisi), [], "konsol bersih");
  } finally { t.tutup(); await br.tutup(); srv.close(); }
});
