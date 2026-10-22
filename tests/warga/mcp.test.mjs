/* Server MCP remote (src/mcp.js, POST /mcp): JSON-RPC 2.0 stateless di atas logika API v1. Worker utuh di workerd + D1 + R2 sungguhan (TEST.md: tanpa mock).
   Jalankan: node --test tests/warga/mcp.test.mjs */
import assert from "node:assert/strict";
import {siapkan, berantai, ADMIN} from "./_bnpb.mjs";
import "../../src/worker.js";   // dulu: worker.js dan modul rute saling impor
import {NAMA_TOOLS} from "../../src/mcp.js";

const uji = berantai();
const U = await siapkan("uji-mcp", {r2: true});
const {DB, api, n, mf} = U;
const R2 = await mf.getR2Bucket("MEDIA");
const PUBLIK = ["titik_api_terkini", "status_kabupaten", "laporan_harian", "kualitas_udara", "peringatan_aktif", "daftar_wilayah"];
const KUNCI = ["rumah_rusak", "rumah_rusak_rekap", "bangunan_terpapar", "laporan_bnpb"];
const BATAS_KB = 24000;
let ipN = 0, id = 0;
const ip = () => ({"cf-connecting-ip": `203.0.113.${++ipN % 250}`});
const rpc = (method, params, h = {}) => api("POST", "/mcp", {jsonrpc: "2.0", id: ++id, method, params}, {...ip(), ...h});
const panggil = (nama, args, h) => rpc("tools/call", {name: nama, arguments: args}, h);
const terbit = async (nama, cakupan) => (await api("POST", "/api/kunci-api/admin/buat", {nama, cakupan}, ADMIN)).j;
const isi = r => JSON.parse(r.j.result.content[0].text);
let semua, rumah;

uji("daftar tool di kode sama dengan yang dijanjikan (publik + berkunci)", () => assert.deepEqual(NAMA_TOOLS, [...PUBLIK, ...KUNCI]));

uji("initialize: membalas versi yang diminta bila didukung, jatuh ke terbaru bila tidak; capabilities hanya tools", async () => {
  for (const v of ["2025-06-18", "2025-03-26", "2024-11-05"]) {
    const r = await rpc("initialize", {protocolVersion: v, capabilities: {}, clientInfo: {name: "uji", version: "1"}});
    assert.equal(r.s, 200, r.t); assert.equal(r.j.id, id); assert.equal(r.j.jsonrpc, "2.0");
    assert.equal(r.j.result.protocolVersion, v); assert.deepEqual(r.j.result.capabilities, {tools: {}}); assert.equal(r.j.result.serverInfo.name, "pantau-bencana");
  }
  assert.equal((await rpc("initialize", {protocolVersion: "1999-01-01"})).j.result.protocolVersion, "2025-06-18");
  assert.deepEqual((await rpc("ping")).j.result, {});
});

uji("notifikasi 202 tanpa badan; metode tak dikenal -32601; JSON rusak -32700; batch dan bentuk salah -32600", async () => {
  const kirim = (body, h = {}) => mf.dispatchFetch("http://bnpb.lokal/mcp", {method: "POST", headers: {"content-type": "application/json", ...ip(), ...h}, body});
  const nt = await kirim(JSON.stringify({jsonrpc: "2.0", method: "notifications/initialized"})); assert.equal(nt.status, 202); assert.equal(await nt.text(), "");
  const tak = await rpc("tidak/ada"); assert.equal(tak.s, 200); assert.equal(tak.j.error.code, -32601); assert.equal(tak.j.id, id);
  const rusak = await kirim("{bukan json"); const jr = await rusak.json(); assert.equal(jr.error.code, -32700); assert.equal(jr.id, null);
  assert.equal((await (await kirim(JSON.stringify([{jsonrpc: "2.0", id: 1, method: "ping"}]))).json()).error.code, -32600);
  assert.equal((await (await kirim(JSON.stringify({id: 1, method: "ping"}))).json()).error.code, -32600, "tanpa jsonrpc 2.0");
  assert.equal((await (await kirim(JSON.stringify({jsonrpc: "2.0", id: 1, method: 5}))).json()).error.code, -32600);
  assert.equal((await kirim("x".repeat(70000))).status, 413, "badan besar ditolak");
});

uji("HTTP: GET /mcp 405, OPTIONS 204 dengan CORS tanpa credentials; Origin lokal/privat 403, Origin publik dan tanpa Origin lolos", async () => {
  const g = await api("GET", "/mcp"); assert.equal(g.s, 405); assert.equal(g.h.get("allow"), "POST, OPTIONS");
  const o = await api("OPTIONS", "/mcp", undefined, {origin: "https://claude.ai"}); assert.equal(o.s, 204);
  assert.equal(o.h.get("access-control-allow-origin"), "*"); assert.equal(o.h.get("access-control-allow-credentials"), null);
  for (const h of ["x-api-key", "mcp-session-id", "mcp-protocol-version", "content-type"]) assert.match(o.h.get("access-control-allow-headers").toLowerCase(), new RegExp(h));
  for (const asal of ["http://localhost:3000", "http://127.0.0.1", "http://192.168.1.5:8080", "http://10.0.0.7", "http://172.20.1.1", "http://[::1]:5173", "http://app.localhost", "null", "bukan url"])
    assert.equal((await rpc("ping", undefined, {origin: asal})).s, 403, asal);
  for (const asal of ["https://claude.ai", "https://mitra.example", "http://8.8.8.8", "http://172.32.0.1"]) assert.equal((await rpc("ping", undefined, {origin: asal})).s, 200, asal);
  assert.equal((await rpc("ping")).s, 200);
  assert.equal((await rpc("ping")).h.get("access-control-allow-origin"), "*");
});

uji("tools/list tanpa kunci: hanya tool publik, tiap tool punya deskripsi Indonesia dan inputSchema ketat", async () => {
  const r = await rpc("tools/list"); assert.equal(r.s, 200);
  assert.deepEqual(r.j.result.tools.map(t => t.name), PUBLIK);
  for (const t of r.j.result.tools) {
    assert.ok(t.description.length > 60, t.name); assert.equal(t.inputSchema.type, "object"); assert.equal(t.inputSchema.additionalProperties, false, t.name);
    assert.ok(typeof t.inputSchema.properties === "object", t.name);
  }
});

uji("tools/call tiap tool publik: sukses, JSON sah, ukuran di bawah batas", async () => {
  const kasus = [["titik_api_terkini", {}], ["titik_api_terkini", {jam: 72, limit: 200}], ["titik_api_terkini", {prov: "62", limit: 5}], ["status_kabupaten", {}], ["status_kabupaten", {prov: "62", urut: "luas", limit: 100}],
    ["laporan_harian", {}], ["kualitas_udara", {}], ["kualitas_udara", {prov: "62"}], ["peringatan_aktif", {}], ["daftar_wilayah", {}], ["daftar_wilayah", {prov: "62"}]];
  for (const [nama, args] of kasus) {
    const r = await panggil(nama, args); assert.equal(r.s, 200, nama); assert.ok(!r.j.error, `${nama}: ${JSON.stringify(r.j.error)}`); assert.ok(!r.j.result.isError, `${nama} ${JSON.stringify(args)}: ${r.j.result.content?.[0]?.text}`);
    const t = r.j.result.content[0].text; assert.ok(t.length < BATAS_KB, `${nama} ${JSON.stringify(args)}: ${t.length} karakter >= ${BATAS_KB}`); JSON.parse(t);
  }
  const t = isi(await panggil("titik_api_terkini", {prov: "62", limit: 5}));
  const fr = t.kolom.indexOf("frp_mw"), wl = t.kolom.indexOf("wilayah");
  assert.ok(t.titik.length > 0 && t.titik.length <= 5 && t.titik.every(x => t.wilayah[x[wl]][0] === "62"), "baris merujuk tabel wilayah provinsi 62"); assert.ok(t.titik.every((x, i, a) => !i || a[i - 1][fr] >= x[fr]), "terurut FRP menurun");
  assert.ok(t.jumlah_cocok >= t.titik.length); assert.ok(!("N21" in t.per_sensor), "NOAA-21 tidak dihitung");
  const l = isi(await panggil("laporan_harian", {})); assert.equal(l.provinsi.length > 30, true); assert.ok(l.nasional.titik > 0);
  assert.equal(isi(await panggil("daftar_wilayah", {})).provinsi.length, 38);
  assert.ok(isi(await panggil("daftar_wilayah", {prov: "62"})).kabupaten.includes("Kapuas"));
  const s = isi(await panggil("status_kabupaten", {prov: "62", limit: 3})); assert.equal(s.kabupaten.length, 3); assert.ok(s.kabupaten.every(k => k.prov === "62"));
  assert.ok(s.kabupaten[0].titik >= s.kabupaten[1].titik);
});

uji("argumen salah, tool tak dikenal, dan data tak ada: isError (bukan crash); tool tak dikenal -32602", async () => {
  const salah = [["titik_api_terkini", {prov: "6"}], ["titik_api_terkini", {prov: 62}], ["titik_api_terkini", {jam: 48}], ["titik_api_terkini", {limit: 0}], ["titik_api_terkini", {limit: 201}], ["titik_api_terkini", {limit: 1.5}],
    ["titik_api_terkini", {tak_dikenal: 1}], ["titik_api_terkini", {kab: "x".repeat(81)}], ["titik_api_terkini", []], ["status_kabupaten", {urut: "acak"}], ["laporan_harian", {tanggal: "kemarin"}], ["laporan_harian", {tanggal: "2020-01-01"}],
    ["kualitas_udara", {prov: "00"}], ["daftar_wilayah", {prov: "00"}]];
  for (const [nama, args] of salah) { const r = await panggil(nama, args); assert.equal(r.s, 200, nama); assert.equal(r.j.result?.isError, true, `${nama} ${JSON.stringify(args)} harus isError: ${r.t.slice(0, 120)}`); assert.ok(r.j.result.content[0].text.length > 5); }
  const t = await panggil("tidak_ada", {}); assert.equal(t.j.error.code, -32602);
});

uji("berkunci tanpa kunci: tidak ada di tools/list, tools/call → isError yang menyebut kunci; kunci salah → 401", async () => {
  const l = (await rpc("tools/list")).j.result.tools.map(t => t.name); for (const k of KUNCI) assert.ok(!l.includes(k), k);
  for (const k of KUNCI) { const r = await panggil(k, k === "laporan_bnpb" ? {jenis: "harian"} : {}); assert.equal(r.j.result.isError, true, k); assert.match(r.j.result.content[0].text, /X-API-Key/, k); }
  const salah = await rpc("tools/list", undefined, {"x-api-key": "pb_" + "0".repeat(64)}); assert.equal(salah.s, 401); assert.equal(salah.h.get("access-control-allow-origin"), "*");
  const query = await api("POST", "/mcp?x-api-key=pb_xx", {jsonrpc: "2.0", id: 1, method: "tools/list"}, ip()); assert.deepEqual(query.j.result.tools.map(t => t.name), PUBLIK, "kunci di query string tidak dibaca");
});

uji("berkunci dengan kunci bercakupan: tools/list menyesuaikan cakupan; tools/call menjalankan logika v1", async () => {
  semua = await terbit("Mitra MCP", ["rumah_rusak", "bangunan", "laporan_bnpb"]); rumah = await terbit("Mitra MCP Rumah", ["rumah_rusak"]);
  const kr = {"x-api-key": rumah.kunci}, ks = {"x-api-key": semua.kunci};
  assert.deepEqual((await rpc("tools/list", undefined, kr)).j.result.tools.map(t => t.name), [...PUBLIK, "rumah_rusak", "rumah_rusak_rekap"]);
  assert.deepEqual((await rpc("tools/list", undefined, ks)).j.result.tools.map(t => t.name), [...PUBLIK, ...KUNCI]);
  const sisip = (i, status, pelapor) => DB.prepare("INSERT INTO rumah_rusak (id, bencana, tanggal, lat, lon, prov, kab, kec, tingkat, pelapor, waktu, status) VALUES (?, 'banjir', '2026-10-12', -2, 114, '62', 'Kapuas', 'Kec A', 'berat', ?, ?, ?)").bind(i.repeat(16), pelapor, Date.now(), status);
  await DB.batch([sisip("1", "sah", "akun:rahasiapelapor"), sisip("2", "ditolak", "akun:rahasiapelapor")]);
  const r = await panggil("rumah_rusak", {prov: "62"}, kr); assert.ok(!r.j.result.isError, r.t); const d = isi(r);
  assert.equal(d.laporan.length, 1); assert.ok(!r.t.includes("rahasiapelapor") && !r.t.includes("ditolak") && !("pelapor" in d.laporan[0]) && !("foto" in d.laporan[0]));
  const rk = isi(await panggil("rumah_rusak_rekap", {dari: "2026-10-01", sampai: "2026-10-31"}, kr)); assert.equal(rk.total.total, 1); assert.equal(rk.kabupaten[0].kab, "Kapuas");
  const kurang = await panggil("bangunan_terpapar", {}, kr); assert.equal(kurang.j.result.isError, true); assert.match(kurang.j.result.content[0].text, /bangunan/);
  const salahArg = await panggil("rumah_rusak", {dari: "kemarin"}, kr); assert.equal(salahArg.j.result.isError, true);
  assert.equal((await panggil("rumah_rusak", {prov: 62}, kr)).j.result.isError, true);
  await R2.put("bangunan/terpapar.json", JSON.stringify({bahaya: {karhutla: Array.from({length: 500}, (_, i) => ({id: i, bangunan: i}))}}));
  const b = await panggil("bangunan_terpapar", {limit: 10}, ks); assert.ok(!b.j.result.isError, b.t); const bd = isi(b); assert.equal(bd.bahaya.karhutla.length, 10); assert.equal(bd._dipotong_elemen, 490);
  assert.ok(b.j.result.content[0].text.length < BATAS_KB);
  await DB.prepare("INSERT INTO laporan_bnpb (jenis, tanggal, isi, diubah, oleh) VALUES ('harian', '2026-10-20', ?, 1, 'moderator1')").bind('{"rumah_rusak":5}').run();
  assert.deepEqual(isi(await panggil("laporan_bnpb", {jenis: "harian", tanggal: "2026-10-20"}, ks)).isi, {rumah_rusak: 5});
  assert.equal((await panggil("laporan_bnpb", {jenis: "lain"}, ks)).j.result.isError, true);
  assert.equal((await panggil("laporan_bnpb", {}, ks)).j.result.isError, true, "jenis wajib");
});

uji("kunci dicabut: tools/list langsung 401; laju MCP anonim per hash IP 429 setelah 600 per jam", async () => {
  await api("POST", "/api/kunci-api/admin/cabut/" + rumah.id, {}, ADMIN);
  assert.equal((await rpc("tools/list", undefined, {"x-api-key": rumah.kunci})).s, 401);
  const alamat = "198.51.100.88", kini = Date.now(), kunci = (await import("node:crypto")).createHash("sha256").update("garam-uji|" + alamat).digest("hex");
  await DB.batch(Array.from({length: 600}, () => DB.prepare("INSERT INTO laju_bnpb (kunci, aksi, waktu) VALUES (?, 'mcp.ip', ?)").bind(kunci, kini)));
  const r = await api("POST", "/mcp", {jsonrpc: "2.0", id: 1, method: "ping"}, {"cf-connecting-ip": alamat}); assert.equal(r.s, 429); assert.equal(r.h.get("access-control-allow-origin"), "*");
  assert.equal((await rpc("ping")).s, 200, "IP lain tidak ikut");
  assert.equal(await n("laju_bnpb", `kunci = '${alamat}'`), 0, "IP mentah tidak disimpan");
});

uji("terbuka di semua host: centurisk97.id melayani /mcp tanpa masuk", async () => {
  const r = await mf.dispatchFetch("https://centurisk97.id/mcp", {method: "POST", redirect: "manual", headers: {"content-type": "application/json", "cf-connecting-ip": "192.0.2.50"}, body: JSON.stringify({jsonrpc: "2.0", id: 1, method: "tools/list"})});
  assert.equal(r.status, 200); assert.equal((await r.json()).result.tools.length, PUBLIK.length);
  const g = await mf.dispatchFetch("https://centurisk97.id/mcp", {redirect: "manual"}); assert.equal(g.status, 405); await g.arrayBuffer();
});

uji("galat HTTP /mcp (401, 403 Origin, 405, 413, 429) dibungkus envelope JSON-RPC id null dengan status HTTP tetap; tool rumah rusak tanpa catatan dan koordinat 4 desimal", async () => {
  const cek = (r, status, kode) => { assert.equal(r.s, status, r.t); assert.equal(r.j.jsonrpc, "2.0"); assert.equal(r.j.id, null); assert.equal(r.j.error.code, kode, r.t); assert.ok(r.j.error.message.length > 3); assert.equal(r.h.get("access-control-allow-origin"), "*"); };
  cek(await rpc("tools/list", undefined, {"x-api-key": "pb_" + "2".repeat(64)}), 401, -32001);
  cek(await rpc("ping", undefined, {origin: "http://localhost:3000"}), 403, -32001);
  cek(await api("GET", "/mcp"), 405, -32600);
  const besar = await mf.dispatchFetch("http://bnpb.lokal/mcp", {method: "POST", headers: {"content-type": "application/json", ...ip()}, body: "x".repeat(70000)});
  assert.equal(besar.status, 413); assert.equal((await besar.json()).error.code, -32600);
  const alamat = "198.51.100.99", kunci = (await import("node:crypto")).createHash("sha256").update("garam-uji|" + alamat).digest("hex");
  await DB.batch(Array.from({length: 300}, () => DB.prepare("INSERT INTO laju_bnpb (kunci, aksi, waktu) VALUES (?, 'api.kunci_gagal', ?)").bind(kunci, Date.now())));
  const r429 = await api("POST", "/mcp", {jsonrpc: "2.0", id: 1, method: "tools/list"}, {"cf-connecting-ip": alamat, "x-api-key": semua.kunci});
  cek(r429, 429, -32001); assert.equal(r429.h.get("retry-after"), "3600");
  await DB.prepare("DELETE FROM laju_bnpb WHERE aksi IN ('api.v1', 'api.kunci_gagal')").run();
  await DB.prepare("INSERT INTO rumah_rusak (id, bencana, tanggal, lat, lon, prov, kab, kec, tingkat, catatan, pelapor, waktu) VALUES (?, 'banjir', '2026-10-14', -2.123456, 114.987654, '62', 'Kapuas', 'Kec A', 'ringan', 'rumah pak Budi', 'akun:abc123', ?)").bind("8".repeat(16), Date.now() + 10).run();
  const t = await panggil("rumah_rusak", {prov: "62"}, {"x-api-key": semua.kunci}); const d = isi(t);
  assert.ok(!t.t.includes("pak Budi") && !t.t.includes("-2.123456") && d.laporan.every(l => !("catatan" in l)), "catatan dan presisi koordinat tidak bocor lewat MCP");
  assert.equal(d.laporan[0].lat, -2.1235);
  await DB.prepare("INSERT INTO laporan_bnpb (jenis, tanggal, isi, diubah, oleh) VALUES ('harian', '2026-10-21', '{}', 1, 'rahasia-oleh')").run();
  assert.ok(!(await panggil("laporan_bnpb", {jenis: "harian"}, {"x-api-key": semua.kunci})).t.includes("rahasia-oleh"), "oleh tidak keluar lewat MCP");
});
