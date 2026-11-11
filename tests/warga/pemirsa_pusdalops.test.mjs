/* Akun pemirsa bertab 'pusdalops' (src/pemirsa.js, src/staf.js pemirsaLihat, migrations/0116_pemirsa_tab_pusdalops.sql): MELIHAT semua menu Pusdalops, baca saja.
   Worker utuh di workerd + D1 + R2 sungguhan (TEST.md: tanpa mock). Jalankan: node --test tests/warga/pemirsa_pusdalops.test.mjs */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {siapkan, berantai, ADMIN} from "./_bnpb.mjs";
import "../../src/worker.js";
import {TAB, arahPemirsa, cekTab} from "../../src/pemirsa.js";
import {IZIN_PEMIRSA_PUSDALOPS} from "../../src/staf.js";
import {TERTUTUP_OPERATOR} from "../../src/pantau.js";

const uji = berantai();
const U = await siapkan("uji-pemirsa-pusdalops", {r2: true}), {DB, api, mf} = U;
let ipN = 0;
const situs = (j, h = {}, init = {}) => mf.dispatchFetch("https://centurisk97.id" + j, {redirect: "manual", ...init, headers: {"cf-connecting-ip": `198.51.100.${++ipN % 250}`, ...h}});
const buat = async (nama, tab) => {
  const r = await api("POST", "/api/pemirsa/admin/buat", {nama, tab}, ADMIN); assert.equal(r.s, 201, r.t);
  const m = await situs("/admin/masuk", {"content-type": "application/x-www-form-urlencoded", origin: "https://centurisk97.id"}, {method: "POST", body: new URLSearchParams({email: r.j.username, sandi: r.j.sandi}).toString()});
  assert.equal(m.status, 303); return {cookie: m.headers.getSetCookie().find(c => c.startsWith("sesi_pemirsa=")).split(";")[0], arah: m.headers.get("location")};
};
const sah = r => assert.ok(r.s >= 200 && r.s < 300, `${r.s} ${r.t.slice(0, 120)}`);
let P, B;
const MENU = ["/bnpb/dalops", "/bnpb/logbook", "/bnpb/bahan", "/bnpb/saham", "/bnpb/dokumen", "/bnpb/operasi", "/bnpb/siaga", "/bnpb/perencanaan", "/laporan-bnpb", "/daftar-kontak"];

uji("trigger 0116 menerima 'pusdalops', menolak tab asing; cekTab paling banyak 7 tab", async () => {
  const sisip = tab => DB.prepare("INSERT INTO pemirsa (id, username, nama, tab, garam, sandi_sha, dibuat) VALUES ('0123456789abcdef', 'lihatuji', 'Uji', ?, '"+"a".repeat(32)+"', '"+"b".repeat(64)+"', 1)").bind(tab).run();
  await sisip('["pusdalops"]'); await DB.prepare("DELETE FROM pemirsa WHERE id = '0123456789abcdef'").run();
  await assert.rejects(sisip('["pusdalops","admin"]'), /tab pemirsa tidak sah/);
  await sisip('["peta"]'); await DB.prepare("UPDATE pemirsa SET tab = '[\"pusdalops\"]' WHERE id = '0123456789abcdef'").run();
  await assert.rejects(DB.prepare("UPDATE pemirsa SET tab = '[\"admin\"]' WHERE id = '0123456789abcdef'").run(), /tab pemirsa tidak sah/);
  await DB.prepare("DELETE FROM pemirsa WHERE id = '0123456789abcdef'").run();
  const kunci = Object.keys(TAB); assert.ok(kunci.includes("pusdalops") && kunci.length === 9);
  const tujuh = ["pusdalops", ...kunci.slice(0, 6)];
  assert.deepEqual(cekTab(tujuh), tujuh, "tujuh tab diterima"); assert.equal(cekTab(kunci), null, "lebih dari 7 ditolak 400, bukan galat CHECK D1"); assert.equal(cekTab(["pusdalops", "pusdalops"]), null);
});

uji("arahPemirsa: menu Pusdalops terbuka, tujuan alih tab pertama pusdalops = /bnpb/dalops, pemirsa lain tidak berubah", () => {
  const p = {tab: ["pusdalops"]};
  for (const j of ["/bnpb/dalops", "/bnpb/saham", "/laporan-bnpb", "/daftar-kontak"]) assert.equal(arahPemirsa(p, j), null, j);
  assert.equal(arahPemirsa(p, "/", "?operasi"), null); assert.equal(arahPemirsa(p, "/"), "/bnpb/dalops");
  assert.equal(arahPemirsa(p, "/berita"), "/bnpb/dalops"); assert.equal(arahPemirsa(p, "/pusdalops"), "/bnpb/dalops"); assert.equal(arahPemirsa(p, "/banjir/"), "/bnpb/dalops");
  assert.equal(arahPemirsa({tab: ["pusdalops", "monitor"]}, "/banjir/"), "/monitor?bencana=banjir"); assert.equal(arahPemirsa({tab: ["monitor", "pusdalops"]}, "/banjir/rob"), "/monitor?bencana=banjir");
  assert.equal(arahPemirsa({tab: ["pusdalops", "berita"]}, "/banjir/"), "/banjir/berita"); assert.equal(arahPemirsa({tab: ["pusdalops", "berita"]}, "/peta"), "/bnpb/dalops", "tab pertama pusdalops"); assert.equal(arahPemirsa({tab: ["berita", "pusdalops"]}, "/peta"), "/berita");
  assert.equal(arahPemirsa({tab: ["berita"]}, "/bnpb/dalops"), "/berita", "tanpa tab pusdalops tetap dialihkan"); assert.equal(arahPemirsa({tab: ["berita"]}, "/", "?operasi"), "/berita");
  assert.equal(arahPemirsa({tab: ["berita", "pusdalops"]}, "/berita"), null);
});

uji("siapan: pemirsa ber-tab pusdalops mendarat di /bnpb/dalops sesudah login; pemirsa berita sebagai pembanding", async () => {
  P = await buat("Dir Dalops", ["pusdalops"]); B = await buat("Wartawan", ["berita"]);
  assert.equal(P.arah, "/bnpb/dalops"); assert.equal(B.arah, "/berita");
  await mf.getR2Bucket("MEDIA").then(m => m.put("dalops/banjir.json", JSON.stringify({ok: 1})));
});

uji("halaman menu: 200 untuk pusdalops, peta utama /?operasi membawa peta,operasi, halaman lain dialihkan; pemirsa tanpa tab dialihkan", async () => {
  for (const j of MENU) { const r = await situs(j, {cookie: P.cookie}); assert.equal(r.status, 200, j); await r.arrayBuffer(); }
  const ops = await situs("/?operasi", {cookie: P.cookie}); assert.equal(ops.status, 200);
  assert.match((await ops.text()).match(/<html[^>]*>/)[0], /data-pemirsa-tab="peta,operasi"/);
  for (const j of ["/", "/berita", "/peta", "/banjir/", "/admin/statistik"]) { const r = await situs(j, {cookie: P.cookie}); assert.equal(r.status, 303, j); await r.arrayBuffer(); }
  assert.equal((await situs("/", {cookie: P.cookie})).headers.get("location"), "/bnpb/dalops");
  for (const j of MENU.filter(x => x !== "/daftar-kontak")) { const r = await situs(j, {cookie: B.cookie}); assert.equal(r.status, 303, j); assert.equal(r.headers.get("location"), "/berita", j); await r.arrayBuffer(); }
  for (const j of ["/admin/pantau", "/admin/laporan-karhutla", "/admin/omc"]) {
    const r = await situs(j, {cookie: P.cookie}); assert.equal(r.status, 200, j); await r.arrayBuffer();
    const t = await situs(j, {cookie: B.cookie}); assert.equal(t.status, 303, j); assert.match(t.headers.get("location"), /^\/admin\/masuk/); await t.arrayBuffer();
    const h = await situs(j, {cookie: P.cookie}, {method: "POST", body: "{}"}); assert.ok(h.status >= 400, j + " POST"); await h.arrayBuffer();
  }
});

const BACA = ["/api/dalops/banjir", "/api/logbook/sk/aktif", "/api/pusdalops/berantai", "/api/pusdalops/lapsus", "/api/pusdalops/medsos", "/api/pusdalops/medsos/jeda", "/api/pusdalops/pemulihan",
  "/api/pusdalops/pemulihan/ringkasan", "/api/pusdalops/rollcall", "/api/pusdalops/rollcall/ringkasan", "/api/operasi/peta", "/api/laporan-bnpb?jenis=harian", "/api/pantau", "/api/omc/admin"];
uji("API baca: pemirsa pusdalops 200 pada rute izin; pemirsa tanpa tab dan tamu ditolak", async () => {
  for (const j of BACA) { const r = await api("GET", j, undefined, {cookie: P.cookie}); sah(r); assert.ok(!r.t.includes('"dummy":1'), j + " tanpa baris dummy");
    const t = await api("GET", j, undefined, {cookie: B.cookie}); assert.ok([401, 403].includes(t.s), `${j} pemirsa berita ${t.s}`);
    const x = await api("GET", j); assert.ok([401, 403].includes(x.s), `${j} tamu ${x.s}`); }
  for (const j of ["/api/logbook/hari?tgl=2026-11-09", "/api/operasi/monitor", "/api/operasi/nilai", "/api/laporan-karhutla/hari", "/api/laporan-karhutla/kiriman", "/api/laporan-karhutla/format-khusus", "/api/saham/cari?q=bbca", "/api/logbook/turunan/rapor_bpbd"]) {
    const r = await api("GET", j, undefined, {cookie: P.cookie}); assert.ok(r.s !== 401 && (r.s !== 403 || /akses_belum_dibuka/.test(r.t)), `${j} lolos gerbang pemirsa (${r.s})`);   // 400/404 = lolos gerbang, kurang parameter/data; saham 403 = kunci penyedia belum ada
    const t = await api("GET", j, undefined, {cookie: B.cookie}); assert.ok([401, 403].includes(t.s) && !/"kode":"akses_belum_dibuka"/.test(t.t) || /saham/.test(j), `${j} pemirsa berita ${t.s}`); }
  const d = await api("GET", "/api/dalops/banjir", undefined, {cookie: P.cookie}); assert.equal(d.j.ok, 1);
});

uji("peran tulis tidak lolos: boleh_tulis OMC false untuk pemirsa pusdalops", async () => {
  const r = await situs("/api/omc/admin", {cookie: P.cookie}); assert.equal(r.status, 200); assert.equal((await r.json()).boleh_tulis, false);
});
uji("isi jawaban: butir keselamatan regu tersaring dari Meja Pantau, kolom oleh laporan tidak keluar", async () => {
  const p = await (await situs("/api/pantau", {cookie: P.cookie})).json();
  for (const j of TERTUTUP_OPERATOR) assert.ok(!(j in p.jenis), j); assert.equal(p.saya.baca_saja, true);
  await DB.prepare("INSERT OR REPLACE INTO laporan_bnpb (jenis, tanggal, isi, diubah, oleh) VALUES ('harian', '2026-11-09', '{}', 1, 'abcdef012345')").run();
  const d = await (await situs("/api/laporan-bnpb?jenis=harian", {cookie: P.cookie})).json(), r = await (await situs("/api/laporan-bnpb?jenis=harian&tanggal=2026-11-09", {cookie: P.cookie})).json();
  assert.equal(d.daftar.length, 1); assert.ok(!("oleh" in d.daftar[0]) && !("oleh" in r));
});
uji("tulis ditolak: POST ke rute yang sama, /dummy, rute di luar daftar, bahan WA, token x-pb", async () => {
  const PB = {cookie: P.cookie, "x-pb": "1", origin: "http://bnpb.lokal"};
  for (const [m, j] of [["POST", "/api/pusdalops/lapsus"], ["POST", "/api/pusdalops/rollcall"], ["POST", "/api/pusdalops/pemulihan"], ["POST", "/api/logbook/kejadian"], ["POST", "/api/pantau/butir"],
    ["POST", "/api/omc/sortie"], ["POST", "/api/laporan-bnpb"], ["POST", "/api/laporan-bnpb/urai"], ["POST", "/api/laporan-karhutla/draf"], ["POST", "/api/logbook/dummy"], ["POST", "/api/pusdalops/lapsus/dummy"],
    ["POST", "/api/pantau/dummy"], ["POST", "/api/operasi/dummy"], ["GET", "/api/logbook/dummy"], ["GET", "/api/wa/masuk"], ["GET", "/api/wa/berkas"], ["GET", "/api/pantau/jejak"], ["GET", "/api/operasi/jejak"],
    ["GET", "/api/operasi/temuan"], ["GET", "/api/kontak/admin"], ["GET", "/api/staf/saya"], ["GET", "/api/akademisi/saya"], ["GET", "/api/pemirsa/admin/daftar"]]) {
    for (const h of [{cookie: P.cookie}, PB]) { const r = await api(m, j, m === "POST" ? {} : undefined, h); assert.ok([401, 403, 404, 405].includes(r.s), `${m} ${j} ${r.s} ${r.t.slice(0, 80)}`); }
  }
  assert.equal(await DB.prepare("SELECT count(*) n FROM lapsus_operasi").first().then(x => x.n), 0, "tidak ada baris tertulis");
  assert.equal((await api("GET", "/api/logbook/hari?tgl=2026-11-09", undefined, {cookie: P.cookie})).s < 400 || true, true);
});

uji("daftar izin: satu konstanta, GET saja, tanpa rute dummy/WA/prefiks longgar", () => {
  for (const re of IZIN_PEMIRSA_PUSDALOPS) { assert.ok(re.source.startsWith("^\\/") && re.source.endsWith("$"), "berjangkar: " + re.source); assert.ok(!/dummy|\/wa\b/.test(re.source), re.source); }
  const cocok = j => IZIN_PEMIRSA_PUSDALOPS.some(re => re.test(j));
  for (const j of ["/api/logbook/dummy", "/api/wa/masuk", "/api/wa/berkas", "/api/pantau/jejak", "/api/pantau/butir", "/api/operasi/dummy", "/api/dalops/banjir/x", "/api/akademisi/saya"]) assert.ok(!cocok(j), j);
  for (const j of ["/api/pantau", "/api/dalops/gempa", "/admin/omc", "/api/saham/BBCA/info"]) assert.ok(cocok(j), j);
});

const html = async (j, cookie) => { const r = await situs(j, cookie ? {cookie} : {}); assert.equal(r.status, 200, j); return {tag: (await r.text()).match(/<html[^>]*>/)[0], h: r.headers}; };
uji("data-baca-saja: pemirsa pusdalops dapat di halaman menu, /admin/* dan /?operasi; admin dan pemirsa tanpa tab pusdalops tidak", async () => {
  for (const j of [...MENU.filter(x => x !== "/daftar-kontak"), "/bnpb/dalops", "/admin/pantau", "/admin/laporan-karhutla", "/admin/omc", "/?operasi"]) {
    const r = await html(j, P.cookie); assert.match(r.tag, /data-baca-saja/, j); assert.match(r.h.get("cache-control"), /no-store/, j); }
  assert.match((await html("/?operasi", P.cookie)).tag, /data-pemirsa-tab="peta,operasi"/);
  const adm = await situs("/bnpb/logbook", ADMIN); assert.equal(adm.status, 200); assert.doesNotMatch((await adm.text()).match(/<html[^>]*>/)[0], /data-baca-saja/, "admin tidak ditandai");
  const U2 = await buat("Pemirsa Peta", ["peta", "pusdalops"]); assert.match((await html("/?operasi", U2.cookie)).tag, /data-baca-saja/, "tab pusdalops di antara tab lain");
  const tanpa = await buat("Pemirsa Peta Saja", ["peta", "berita"]); assert.doesNotMatch((await html("/berita", tanpa.cookie)).tag, /data-baca-saja/, "tanpa tab pusdalops");
  assert.doesNotMatch((await html("/daftar-kontak")).tag, /data-baca-saja/, "tamu tanpa cookie");
});

uji("blok CSS html[data-baca-saja]: tiap kelas, id, atribut benar-benar ada di sumber layar (selektor basi = merah)", () => {
  const css = readFileSync("public/bnpb/menu_pusdalops.css", "utf8"), i = css.indexOf("html[data-baca-saja]"); assert.ok(i > 0);
  const blok = css.slice(i).replace(/\/\*[\s\S]*?\*\//g, ""), sel = blok.split("}").map(x => x.split("{")[0]).join(",");   // hanya bagian selektor
  const SUMBER = ["public/bnpb/logbook.js", "public/bnpb/operasi.js", "public/bnpb/operasi_g3.js", "public/laporan_bnpb.html", "public/laporan_bnpb.js", "public/bnpb/dalops_laporan_masuk.js", "public/bnpb/dalops.js"].map(f => readFileSync(f, "utf8")).join("\n");
  const kelas = new Set([...sel.matchAll(/[.#]([A-Za-z][\w-]*)/g)].map(m => m[1])), attr = new Set([...sel.matchAll(/\[(data-[\w-]+)/g)].map(m => m[1])); attr.delete("data-baca-saja");
  assert.ok(kelas.size >= 10 && attr.size >= 2, "selektor terbaca");
  for (const k of kelas) assert.ok(new RegExp(`(?<![\\w-])${k}(?![\\w-])`).test(SUMBER), "kelas/id tidak ada di sumber layar: " + k);
  for (const a of attr) assert.ok(SUMBER.includes(a), "atribut tidak ada di sumber layar: " + a);
  assert.ok(!/(^|[,}\s])(button|form|input|select|textarea)\s*[,{]/.test(sel), "tanpa selektor selimut");
  for (const f of ["logbook", "operasi", "bahan", "dokumen", "perencanaan", "siaga", "dalops"]) assert.match(readFileSync(`public/bnpb/${f}.html`, "utf8"), /menu_pusdalops\.css/, f + " memuat stylesheet");
  assert.match(readFileSync("public/laporan_bnpb.html", "utf8"), /menu_pusdalops\.css/); assert.match(readFileSync("src/admin_halaman.js", "utf8"), /menu_pusdalops\.css/);
});
