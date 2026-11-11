/* Gerbang tinjau lokal (pemilik 11 Nov 2026: tiap perubahan layar bisa ditinjau di lokal tanpa menunggu push dan terbit).
   Menjalankan scripts/agents/tinjau_lokal.mjs sungguhan melawan hulu palsu: kode dari folder kerja, data/API/login dari hulu,
   halaman berpintu login tetap dialihkan, cookie menempel di localhost, dan AGENTS.md mewajibkan tautannya. */
import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {buatServer} from "../../scripts/agents/tinjau_lokal.mjs";

const dengar = s => new Promise(ok => s.listen(0, "127.0.0.1", () => ok(s.address().port)));

test("tinjau lokal: kode dari folder kerja, data/API/login dari hulu", async () => {
  const akar = await fs.mkdtemp(path.join(os.tmpdir(), "tinjau-"));
  await fs.mkdir(path.join(akar, "public/data"), {recursive: true});
  await fs.writeFile(path.join(akar, "public/app.js"), "lokal-js");
  await fs.writeFile(path.join(akar, "public/data/x.json"), '"basi"');
  await fs.writeFile(path.join(akar, "public/index.html"), '<html lang="id"><body>LOKAL</body></html>');
  const hulu = http.createServer((req, res) => {
    if (req.url === "/tutup") { res.writeHead(303, {location: `http://127.0.0.1:${pH}/admin/masuk?ke=%2Ftutup`}); return res.end(); }
    if (req.url === "/") { res.writeHead(200, {"content-type": "text/html"}); return res.end('<html lang="id" data-situs="w"><body>HULU</body></html>'); }
    if (req.url === "/api/masuk") { res.writeHead(200, {"set-cookie": "sesi=abc; Path=/; HttpOnly; Secure; Domain=centurisk97.id; SameSite=Lax"}); return res.end(req.headers.origin || ""); }
    res.writeHead(200, {"content-type": "application/json"}); res.end('"hulu"');
  });
  const pH = await dengar(hulu);
  const lokal = await buatServer({hulu: `http://127.0.0.1:${pH}`, akar, rute: [[/^\/$/, "/index.html", "/"], [/^\/tutup$/, "/index.html", "/tutup"]]});
  const pL = await dengar(lokal), L = `http://127.0.0.1:${pL}`;
  try {
    assert.equal(await (await fetch(L + "/app.js")).text(), "lokal-js", "kode dari folder kerja");
    assert.equal(await (await fetch(L + "/data/x.json")).text(), '"hulu"', "jalur /data/ selalu dari hulu");
    assert.equal(await (await fetch(L + "/api/apa")).text(), '"hulu"', "API dari hulu");
    const h = await (await fetch(L + "/")).text();
    assert.match(h, /LOKAL/, "isi HTML dari folder kerja"); assert.match(h, /data-situs="w"/, "tag <html> dari hulu");
    const r = await fetch(L + "/tutup", {redirect: "manual"});
    assert.equal(r.status, 303); assert.equal(r.headers.get("location"), `http://127.0.0.1:${pL}/admin/masuk?ke=%2Ftutup`, "gerbang login hulu tetap berlaku, dialihkan ke lokal");
    const m = await fetch(L + "/api/masuk", {method: "POST", headers: {origin: L}, body: "x"});
    const c = m.headers.get("set-cookie"); assert.match(c, /sesi=abc/); assert.doesNotMatch(c, /Secure|Domain/i, "cookie menempel di localhost");
    assert.equal(await m.text(), `http://127.0.0.1:${pH}`, "Origin ditulis ulang ke hulu");
  } finally { lokal.close(); hulu.close(); }
});

test("tinjau lokal: AGENTS.md mewajibkan tautan localhost:8800 sesudah perubahan layar", async () => {
  const a = await fs.readFile(new URL("../../AGENTS.md", import.meta.url), "utf8");
  assert.match(a, /localhost:8800/);
});
