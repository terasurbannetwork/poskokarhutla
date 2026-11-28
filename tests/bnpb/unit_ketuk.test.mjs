/* RU-034 MB-7 antrean setuju (public/bnpb/unit/ketuk.js + scripts/bnpb/unit/terima.py). Gabung murni di vm (aturan sama dengan terima.py),
   daftar medan koreksi sama dengan src/unit.js, tanpa innerHTML; Chrome nyata: /bnpb/unit/pspb menampilkan usulan menunggu, Tolak menyembunyikan
   baris seketika dan mengirim satu POST, Koreksi hanya mengirim medan yang diubah, 403 mengembalikan baris dengan pesan, 1440 dan 390 px.
   Jalan: node --test tests/bnpb/unit_ketuk.test.mjs */
import {test} from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import {createHash} from "node:crypto";
import {readFileSync, existsSync, statSync} from "node:fs";
import path from "node:path";
import vm from "node:vm";
import {spawnSync} from "node:child_process";
import {bukaPeramban, cariChrome} from "./_peramban.mjs";
import {petaSitus} from "./_peta.mjs";

const AKAR = path.resolve(new URL("../..", import.meta.url).pathname), PUB = path.join(AKAR, "public"), CHROME = cariChrome();
const baca = p => readFileSync(path.join(AKAR, p), "utf8");
const ctx = {window: {}, Date, Intl, Number, String, Array, Math, Object, isNaN, Map, URL};
vm.createContext(ctx);
vm.runInContext(baca("public/bnpb/unit/ketuk.js"), ctx);
const K = ctx.window.UnitKetuk;
const CSP = baca("src/bnpb.js").match(/export const CSP = "([^"]+)"/)[1];
const TIPE = {".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png"};
const bukanSisi = g => !/favicon\.ico|fonts\.g(oogleapis|static)\.com|ERR_(INTERNET|NAME|CONNECTION)|status of (401|403|404)/.test(g);
const kini = new Date().toISOString();
const id = k => createHash("sha1").update("rpbdhttps://x/" + k + k).digest("hex").slice(0, 16);
const U = {berkas: "rpbd", baris: ["1101", "1102", "1103"].map(k => ({id: id(k), sumber: {jenis: "jdih", nama: "Perda RPBD " + k, url: "https://x/" + k}, label: "sekunder",
  isi: {kode: k, status: "sesuai_3_2026", periode: "2026-2030", url: "https://x/" + k}, keyakinan: "pola_longgar", keputusan: "menunggu"}))};

test("antre: keputusan terbaru, koreksi hanya medan yang ada, usulan tanpa keputusan menunggu", () => {
  const a = K.antre(U, [{usulan_id: id("1101"), keputusan: "terima", waktu: "t1"}, {usulan_id: id("1102"), keputusan: "koreksi", koreksi: {status: "habis", liar: "x"}, waktu: "t2"},
    {usulan_id: "0".repeat(16), keputusan: "tolak"}, {usulan_id: id("1103"), keputusan: "aneh"}]);
  assert.equal(JSON.stringify(a.menunggu.map(b => b.id)), JSON.stringify([id("1103")]), "keputusan tak dikenal tidak dihitung sebagai keputusan");
  assert.equal(a.diputuskan.map(b => b.status).join(), "diterima,dikoreksi");
  assert.deepEqual(JSON.parse(JSON.stringify(a.diputuskan[1].isi)), {kode: "1102", status: "habis", periode: "2026-2030", url: "https://x/1102"});
  assert.equal(U.baris[1].isi.status, "sesuai_3_2026", "usulan asli tidak berubah");
  assert.equal(K.antre(null, null).menunggu.length, 0);
});

test("terima.py: id usulan sama dengan sha1 jenis + url + kunci yang dipakai uji ini", () => {
  const r = spawnSync("python3", ["-I", "-c", `import sys; sys.path.insert(0, "scripts/bnpb/unit"); import terima; print(terima.usulan_id("rpbd", "https://x/1101", "1101"))`], {cwd: AKAR, encoding: "utf8"});
  assert.equal(r.stdout.trim(), id("1101"), r.stderr);
});

test("medan koreksi sama dengan src/unit.js; berkas induk ada di DATA_UNIT; tanpa innerHTML", () => {
  const src = baca("src/unit.js"), m = src.match(/export const MEDAN_KOREKSI = (\{[^}]*\})/)[1];
  const dari = JSON.parse(m.replace(/(\w+):/g, '"$1":'));
  assert.deepEqual(JSON.parse(JSON.stringify(K.MEDAN_KOREKSI)), dari);
  const daftar = src.match(/export const DATA_UNIT = \[([^\]]+)\]/)[1];
  for (const u of Object.values(K.BERKAS)) assert.ok(daftar.includes(`"${u}"`), u);
  assert.doesNotMatch(baca("public/bnpb/unit/ketuk.js"), /innerHTML|insertAdjacentHTML|document\.write/);
  for (const m2 of dari.usulan_rpbd) assert.ok(K.MEDAN[m2], `medan ${m2} tanpa nama tampil`);
  assert.match(K.NILAI.sesuai_3_2026, /Perban 3\/2026/); assert.ok(!/[a-z]_[a-z]/.test(Object.values(K.NILAI).join(" ")), "nilai tampil tanpa garis bawah");
});

test("antrean di Chrome: usulan menunggu, Tolak menyembunyikan seketika, Koreksi hanya medan berubah, 403 mengembalikan baris", {skip: CHROME ? false : "Chrome tidak ada"}, async () => {
  const post = [];
  const srv = http.createServer((q, s) => {
    const u = decodeURIComponent(q.url.split("?")[0]);
    const js = (o, c = 200) => { s.writeHead(c, {"content-type": "application/json"}); s.end(JSON.stringify(o)); };
    if (q.method === "POST") { let b = ""; q.on("data", d => { b += d; }); q.on("end", () => { const o = JSON.parse(b); post.push({u, h: q.headers["x-pb"], o}); const tolak = o.usulan_id === id("1103"); setTimeout(() => js(tolak ? {galat: "tidak boleh"} : o, tolak ? 403 : 201), tolak ? 600 : 0); }); return; }   // jawaban lambat: baris harus sudah hilang sebelumnya
    if (u === "/api/peta-situs") return js(petaSitus());
    if (u === "/api/unit/indeks") return js({dibuat: kini, berkas: [{nama: "rpbd", sistem: "PSPB-1", dibuat: kini, basi_jam: 240, ok: true, galat: null, diunggah: kini, basi: false}]});
    if (u === "/api/unit/data/rpbd") return js({dibuat: kini, basi_jam: 240, label: ["sekunder"], sumber: [], kartu: [{id: "pspb1-rpbd", sistem: "PSPB-1", pil: "Register RPBD", ikon: "data", judul: "Register RPBD", label: ["sekunder"], sumber: ["jdih_daerah"],
      rumus: null, aturan: [], angka: [{k: "n", label: "Pemda", nilai: 3}], kolom: [], baris: []}]});
    if (u === "/api/unit/data/usulan_rpbd") return js({dibuat: kini, basi_jam: 240, ...U});
    if (u === "/api/unit/ketuk") return js({berkas: "usulan_rpbd", keputusan: [{usulan_id: id("1101"), keputusan: "terima", koreksi: null, catatan: null, oleh: "staf:1", waktu: kini}]});
    if (u.startsWith("/api/")) return js({galat: "belum"}, 404);
    const f = path.join(PUB, /^\/bnpb\/unit\/[a-z]{2,4}$/.test(u) ? "/bnpb/unit/unit.html" : u);
    if (!f.startsWith(PUB) || !existsSync(f) || !statSync(f).isFile()) { s.writeHead(404); return s.end(); }
    s.writeHead(200, {"content-type": TIPE[path.extname(f)] || "application/octet-stream", "content-security-policy": CSP}); s.end(readFileSync(f));
  });
  await new Promise(ok => srv.listen(0, "127.0.0.1", ok));
  const asal = `http://127.0.0.1:${srv.address().port}`, br = await bukaPeramban(), t = await br.tab();
  try {
    await t.ukuran(1440, 900);
    await t.buka(asal + "/bnpb/unit/pspb", {tunggu: "#ketuk-pspb-1 .un-antre"});
    assert.equal(await t.eval("document.querySelectorAll('#ketuk-pspb-1 .ex-bd > .un-antre-daftar > .un-antre').length"), 2, "1101 sudah diterima, tersisa dua");
    assert.match(await t.eval("document.querySelector('#ketuk-pspb-1 .ex-bd > .un-antre-daftar > .un-antre').innerText"), /Perda RPBD 1102[\s\S]*Sekunder, diurai dengan pola longgar[\s\S]*berlaku, sesuai Perban 3\/2026/);
    assert.doesNotMatch(await t.eval("document.querySelector('#ketuk-pspb-1').innerText"), /sesuai_3_2026|pola_longgar|undefined|null|·/);
    assert.equal(await t.eval("document.querySelector('#ketuk-pspb-1 .un-antre-sudah summary').textContent"), "Sudah diputuskan (1)");
    // Koreksi: hanya medan yang berubah
    await t.eval("(() => { const f = document.querySelector('#ketuk-pspb-1 .ex-bd > .un-antre-daftar > .un-antre form'); f.elements.periode.value = '2027-2031'; f.requestSubmit(); })()");
    await t.tungguFungsi("document.querySelectorAll('#ketuk-pspb-1 .ex-bd > .un-antre-daftar > .un-antre:not([hidden])').length === 1");
    assert.deepEqual(post[0], {u: "/api/unit/ketuk", h: "1", o: {berkas: "usulan_rpbd", usulan_id: id("1102"), keputusan: "koreksi", koreksi: {periode: "2027-2031"}}});
    // 403: baris kembali dengan pesan
    await t.eval("document.querySelector('#ketuk-pspb-1 .un-antre:not([hidden]) [data-keputusan=tolak]').click()");
    assert.equal(await t.eval("document.querySelectorAll('#ketuk-pspb-1 .ex-bd > .un-antre-daftar > .un-antre:not([hidden])').length"), 0, "baris hilang seketika, sebelum jawaban server");
    await t.tungguFungsi("document.querySelectorAll('#ketuk-pspb-1 .ex-bd > .un-antre-daftar > .un-antre:not([hidden])').length === 1");
    assert.match(await t.eval("document.querySelector('#ketuk-pspb-1 .un-antre-cat:not(:empty)').textContent"), /belum boleh memutuskan/);
    assert.equal(post.length, 2); assert.equal(post[1].o.keputusan, "tolak");
    const {sw, iw} = await t.lebihLebar(); assert.ok(sw <= iw, `gulir mendatar ${sw} > ${iw}`);
    await t.ukuran(390, 844);
    const l = await t.lebihLebar(); assert.ok(l.sw <= l.iw, `gulir mendatar ${l.sw} > ${l.iw} @390`);
    assert.deepEqual(t.galat().filter(bukanSisi), [], "konsol");
  } finally { await t.tutup?.(); await br.tutup?.(); srv.close(); }
});
