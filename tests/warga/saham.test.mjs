/* Uji integrasi proksi saham /api/saham/* (src/saham.js) lewat Worker sungguhan di Miniflare + D1 sungguhan.
   Gateway Stellar Data ditiru lewat outboundService (tidak ada jaringan nyata); yang dibuktikan: gerbang staf, peta kegagalan,
   validasi, kunci terkirim sebagai header dan tidak pernah bocor ke balasan, serta cache jawaban sukses. */
import {test, before, after} from "node:test";
const uji = test;   // gerbang cakupan (tests/warga/gerbang.test.mjs) mencari uji("<nama>")
import assert from "node:assert/strict";
import path from "node:path";
import {existsSync} from "node:fs";
import {createHash} from "node:crypto";
import {Miniflare} from "miniflare";
import {AKAR, migrasi, pecah} from "./_bantu.mjs";
import "../../src/worker.js";   // urutan impor: worker dulu (saham.js mengimpor balik worker.js)

const sha = s => createHash("sha256").update(s).digest("hex"), TOKEN_STAF = "b".repeat(64);
const KEY_I = "kunci-investing-RAHASIA-1", KEY_S = "kunci-stockbit-RAHASIA-2";
let mf, mfCache, minta = [], jawab = null;
const luar = async req => {
  const u = new URL(req.url);
  if (u.hostname !== "edge.stellardata.ai") return new Response("diblok di uji", {status: 599});
  minta.push({u, kunci: req.headers.get("x-stellar-api-key")});
  return jawab(u);
};
const buat = async (nama, bindings, cache) => {
  const m = new Miniflare({modules: true, scriptPath: path.join(AKAR, "src/worker.js"), modulesRoot: AKAR, modulesRules: [{type: "ESModule", include: ["**/*.js"]}],
    compatibilityDate: "2024-09-23", d1Databases: {DB: nama}, bindings: {IP_SALT: "garam-uji", ADMIN_TOKEN: "rahasia-admin", SUPER_ADMIN: sha("rahasia-admin").slice(0, 12), ...bindings},
    serviceBindings: {ASSETS: req => new URL(req.url).pathname === "/bnpb/saham.html" ? new Response("<h1>saham</h1>") : new Response("tidak ada", {status: 404})}, outboundService: luar, cache});
  const DB = await m.getD1Database("DB"); await DB.batch(pecah(migrasi()).map(s => DB.prepare(s)));
  await DB.prepare(`INSERT INTO staf (id, username, nama, nip, unit, email, wa, peran, wilayah, garam, sandi_sha, wajib_ganti, dibuat, dibuat_oleh, dummy)
    VALUES ('s1s1s1s1s1s1s1s1', 'anipusdalops', 'Ani', '12345', 'Unit', 'a@b.id', '628123456789', '["pusdalops"]', '[]', 'gggggggggggggggggggggggggggggggg', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', 0, 1, 'tes', 0)`).run();
  await DB.prepare("INSERT INTO staf_sesi (token_sha, staf_id, dibuat, kedaluwarsa) VALUES (?, 's1s1s1s1s1s1s1s1', 1, ?)").bind(sha(TOKEN_STAF), Date.now() + 3600e3).run();
  return m;
};
before(async () => {
  mf = await buat("uji-saham", {STELLAR_KEY_INVESTING: KEY_I, STELLAR_KEY_STOCKBIT: KEY_S}, false);
  mfCache = await buat("uji-saham-cache", {STELLAR_KEY_INVESTING: KEY_I, STELLAR_KEY_STOCKBIT: KEY_S}, true);
});
after(() => Promise.all([mf?.dispose(), mfCache?.dispose()]));

const ADMIN = {"x-admin-token": "rahasia-admin"}, STAF = {cookie: "sesi_staf=" + TOKEN_STAF, "x-pb": "1"};
const api = async (j, h = STAF, m = mf) => { const r = await m.dispatchFetch("http://saham.lokal" + j, {headers: h}); const t = await r.text(); return {status: r.status, t, j: (() => { try { return JSON.parse(t); } catch (e) { return null; } })()}; };
const ok = o => new Response(JSON.stringify(o), {headers: {"content-type": "application/json"}});
const CARI = {status: "OK", code: 200, data: {data: [{pair_ID: 29046, search_main_text: "JKLQ45", search_main_longtext: "Jakarta Stock Exchange LQ45", search_main_subtext: "Indonesia"}, {pair_ID: 1, search_main_text: "BBCA", search_main_longtext: "Bank Central Asia", search_main_subtext: "Indonesia"}]}};
const DIV = {data: {data: {summary: {data: {annualized_payout: 3.92, dividend_yield: 0.75}}, yield: {data: {data: []}}, date: {data: {cursor: null, data: [{div_amount: 0.98, div_date: "2026-11-19T00:00:00Z", div_payment_type: "Quarterly", pay_date: "2026-12-10T00:00:00Z", yield: 0.75}]}}}}};
const PP = d => ({data: {provider_payload: d}, meta: {}});

uji("saham: anonim 401 dan gateway tidak dipanggil", async () => {
  minta = []; jawab = () => ok(CARI);
  for (const j of ["/api/saham/cari?q=lq", "/api/saham/dividen?pair_id=1", "/api/saham/BBCA/info", "/api/saham/BBCA/transaksi", "/api/saham/BBCA/grafik"]) assert.equal((await api(j, {})).status, 401, j);
  assert.equal((await api("/api/saham/cari?q=lq", {cookie: "sesi_staf=" + "c".repeat(64), "x-pb": "1"})).status, 401);
  assert.equal(minta.length, 0);
});

uji("saham: halaman /bnpb/saham pribadi (no-store, noindex)", async () => {
  const r = await mf.dispatchFetch("http://saham.lokal/bnpb/saham"), t = await r.text();
  assert.equal(r.status, 200); assert.match(t, /saham/); assert.equal(r.headers.get("cache-control"), "no-store"); assert.match(r.headers.get("x-robots-tag"), /noindex/);
});

uji("saham: di centurisk97.id anonim ke login, staf Pusdalops boleh membuka /bnpb/saham", async () => {
  const buka = async h => { const r = await mf.dispatchFetch("https://centurisk97.id/bnpb/saham", {redirect: "manual", headers: h}); await r.text(); return r; };
  const a = await buka({}); assert.equal(a.status, 303); assert.match(a.headers.get("location"), /\/admin\/masuk/);
  assert.equal((await buka(STAF)).status, 200, "peran pusdalops lolos MENU_PUSDALOPS");
});

uji("saham: cari sukses dipetakan dan kunci Investing terkirim sebagai header", async () => {
  minta = []; jawab = () => ok(CARI);
  const r = await api("/api/saham/cari?q=lq45");
  assert.equal(r.status, 200);
  assert.deepEqual(r.j, {ok: true, hasil: [{pair_id: 29046, kode: "JKLQ45", nama: "Jakarta Stock Exchange LQ45", bursa: "Indonesia"}, {pair_id: 1, kode: "BBCA", nama: "Bank Central Asia", bursa: "Indonesia"}]});
  assert.equal(minta.length, 1); assert.equal(minta[0].u.pathname, "/investing/search"); assert.equal(minta[0].u.searchParams.get("keyword"), "lq45"); assert.equal(minta[0].kunci, KEY_I);
  assert.equal((await api("/api/saham/cari?q=lq45", ADMIN)).status, 200, "admin juga boleh");
});

uji("saham: dividen, info, transaksi, grafik memakai jalur, parameter, dan kunci yang benar", async () => {
  /* bentuk nyata Stockbit via Stellar Data (4 Nov 2026), dipangkas */
  const INFO = {data: {name: "Bank Central Asia Tbk.", symbol: "BBCA", exchange: "IDX", sector: "Keuangan", sub_sector: "Bank", type_company: "Saham", price: "4920", change: "+80.00", percentage: 1.65, previous: "4840", average: "220770108.00", volume: "191269500",
    orderbook: {bid: {price: "4910.000000", volume: "3069200.000000"}, offer: {price: "4920.000000", volume: "169900.000000"}}, market_hour: {status: "open"}, updated: "2026-11-04T08:00:02+07:00", is_holding_exist: true, is_price_alert_exist: true, followed: 0}, message: "ok"};
  const RT = {data: {is_open_market: true, date: "2026-11-04", running_trade: [{time: "14:35:23", action: "buy", code: "BBCA", price: "4,920", change: "+1.65%", lot: "20", market_board: "RG", value: {raw: 9840000, formatted: "9.8M"}}, {time: "14:35:20", action: "sell", price: "4,910", lot: "5", market_board: "RG", value: {raw: 2455000}}]}, message: "ok"};
  const CH = {data: {from: "2026-11-03", to: "2026-11-03", date_session_info: "3 Nov 2026", price_chart_data: [{date: "2026-11-03", time: "09:00", value: {raw: "5025"}, open: {raw: "5050"}, high: {raw: "5050"}, low: {raw: "5025"}}, {date: "2026-11-03", time: "09:01", value: {raw: "5050"}, open: null, high: null, low: null}]}, message: "ok"};
  minta = []; jawab = u => u.pathname === "/investing/dividends" ? ok(DIV) : ok(PP(u.pathname.endsWith("/info") ? INFO : u.pathname.endsWith("/chart") ? CH : RT));
  const d = await api("/api/saham/dividen?pair_id=252");
  assert.equal(d.status, 200); assert.deepEqual(d.j, {ok: true, ringkas: {annualized_payout: 3.92, dividend_yield: 0.75}, riwayat: [{tanggal: "2026-11-19T00:00:00Z", nilai: 0.98, jenis: "Quarterly", bayar: "2026-12-10T00:00:00Z", yield: 0.75}]});
  assert.equal(minta[0].u.searchParams.get("pair_id"), "252"); assert.equal(minta[0].kunci, KEY_I);
  const i = await api("/api/saham/bbca/info");   // huruf kecil dinaikkan
  assert.deepEqual(i.j, {ok: true, data: {nama: "Bank Central Asia Tbk.", kode: "BBCA", bursa: "IDX", sektor: "Keuangan", sub_sektor: "Bank", jenis: "Saham", harga: 4920, perubahan: 80, perubahan_persen: 1.65, volume: 191269500, sebelumnya: 4840, rata_rata: 220770108,
    bid_harga: 4910, bid_volume: 3069200, offer_harga: 4920, offer_volume: 169900, status_pasar: "open", diperbarui: "2026-11-04T08:00:02+07:00"}}, "daftar-putih: bidang akun gateway (is_holding_exist dst.) tidak diteruskan");
  assert.equal(minta[1].u.pathname, "/stockbit/BBCA/info"); assert.equal(minta[1].kunci, KEY_S);
  const t = await api("/api/saham/BBCA/transaksi?limit=7");
  assert.deepEqual(t.j, {ok: true, data: {tanggal: "2026-11-04", pasar_buka: true, baris: [{waktu: "14:35:23", sisi: "Beli", harga: 4920, lot: 20, nilai: 9840000, papan: "RG"}, {waktu: "14:35:20", sisi: "Jual", harga: 4910, lot: 5, nilai: 2455000, papan: "RG"}]}});
  assert.equal(minta[2].u.pathname, "/stockbit/BBCA/running-trade"); assert.equal(minta[2].u.searchParams.get("limit"), "7"); assert.equal(minta[2].u.searchParams.get("sort"), "DESC");
  const g = await api("/api/saham/BBCA/grafik?periode=LAST_1_MONTH");
  assert.deepEqual(g.j, {ok: true, data: {dari: "2026-11-03", sampai: "2026-11-03", sesi: "3 Nov 2026", deret: [{t: "2026-11-03T09:00:00+07:00", harga: 5025, buka: 5050, tertinggi: 5050, terendah: 5025}, {t: "2026-11-03T09:01:00+07:00", harga: 5050, buka: null, tertinggi: null, terendah: null}]}});
  assert.equal(g.status, 200); assert.equal(minta[3].u.pathname, "/stockbit/BBCA/running-trade/chart"); assert.equal(minta[3].u.searchParams.get("period"), "RT_PERIOD_LAST_1_MONTH");
  await api("/api/saham/BBCA/grafik"); assert.equal(minta[4].u.searchParams.get("period"), "RT_PERIOD_LAST_1_DAY");
});

uji("saham: 403 penyedia dan 401 provider_unauthorized menjadi akses_belum_dibuka", async () => {
  jawab = () => new Response(JSON.stringify({message: "You're not allowed to access this resource"}), {status: 403});
  let r = await api("/api/saham/dividen?pair_id=252");
  assert.equal(r.status, 403); assert.deepEqual(r.j, {ok: false, kode: "akses_belum_dibuka", pesan: r.j.pesan}); assert.ok(r.j.pesan.length > 5);
  jawab = () => new Response(JSON.stringify({error: {code: "provider_unauthorized"}}), {status: 401});
  for (const j of ["/api/saham/BBCA/info", "/api/saham/BBCA/transaksi", "/api/saham/BBCA/grafik"]) { r = await api(j); assert.equal(r.status, 403, j); assert.equal(r.j.kode, "akses_belum_dibuka"); }
});

uji("saham: 5xx, bentuk tak dikenal, dan badan bukan JSON menjadi penyedia_galat 502", async () => {
  jawab = () => new Response("boom", {status: 500});
  let r = await api("/api/saham/BBCA/info"); assert.equal(r.status, 502); assert.equal(r.j.kode, "penyedia_galat"); assert.equal(r.j.ok, false);
  jawab = () => ok({tidak: "dikenal"});
  for (const j of ["/api/saham/cari?q=a", "/api/saham/dividen?pair_id=3", "/api/saham/BBCA/info", "/api/saham/BBCA/transaksi"]) { r = await api(j); assert.equal(r.status, 502, j); assert.equal(r.j.kode, "penyedia_galat"); }
  jawab = () => new Response("<html>", {status: 200}); assert.equal((await api("/api/saham/BBCA/grafik")).status, 502);
});

uji("saham: secret kosong = akses_belum_dibuka tanpa fetch ke gateway", async () => {
  const m = await buat("uji-saham-kosong", {}, false);
  try {
    minta = []; jawab = () => ok(CARI);
    for (const j of ["/api/saham/cari?q=lq", "/api/saham/dividen?pair_id=1", "/api/saham/BBCA/info", "/api/saham/BBCA/transaksi", "/api/saham/BBCA/grafik"]) {
      const r = await api(j, STAF, m); assert.equal(r.status, 403, j); assert.equal(r.j.kode, "akses_belum_dibuka");
    }
    assert.equal(minta.length, 0);
  } finally { await m.dispose(); }
});

uji("saham: validasi masukan 400 masukan_salah tanpa fetch", async () => {
  minta = []; jawab = () => ok(CARI);
  for (const j of ["/api/saham/cari", "/api/saham/cari?q=", "/api/saham/cari?q=" + "a".repeat(41), "/api/saham/dividen", "/api/saham/dividen?pair_id=0", "/api/saham/dividen?pair_id=-5", "/api/saham/dividen?pair_id=1.5", "/api/saham/dividen?pair_id=abc",
    "/api/saham/.BBCA/info", "/api/saham/B..A/info",
    "/api/saham/BB%20CA/info", "/api/saham/BBCA..........X/info", "/api/saham/BB$A/info", "/api/saham/BBCA/transaksi?limit=0", "/api/saham/BBCA/transaksi?limit=201", "/api/saham/BBCA/transaksi?limit=abc",
    "/api/saham/BBCA/grafik?periode=KEMARIN", "/api/saham/BBCA/grafik?periode=LAST_1_DAY%26x"]) {
    const r = await api(j); assert.equal(r.status, 400, j); assert.equal(r.j.kode, "masukan_salah"); assert.equal(r.j.ok, false);
  }
  /* segmen titik murni dinormalkan URL parser sebelum sampai Worker (jalur lain, bukan rute saham); apa pun hasilnya tidak boleh sampai ke gateway */
  for (const j of ["/api/saham/../info", "/api/saham/./info", "/api/saham/%2e%2e/info", "/api/saham/%2E/transaksi", "/api/saham/%2e%2e/grafik"]) assert.notEqual((await api(j)).status, 200, j);
  assert.equal(minta.length, 0);
  jawab = () => ok(PP({data: {a: 1}}));
  assert.equal((await api("/api/saham/BBCA/grafik?periode=RT_PERIOD_YEAR_TO_DATE")).status, 200);
  assert.equal((await api("/api/saham/BBCA/transaksi?limit=200")).status, 200);
});

uji("saham: kunci tidak pernah bocor ke balasan (sukses maupun gagal)", async () => {
  jawab = () => ok(PP({data: {a: 1}})); const semua = [];
  semua.push(await api("/api/saham/BBCA/info"), await api("/api/saham/cari?q=x"));
  jawab = () => new Response(`kunci salah: ${KEY_S} ${KEY_I}`, {status: 401}); semua.push(await api("/api/saham/BBCA/transaksi"));
  jawab = () => new Response(`${KEY_S}`, {status: 500}); semua.push(await api("/api/saham/BBCA/grafik"));
  for (const r of semua) { assert.ok(!r.t.includes("RAHASIA"), r.t); }
});

uji("saham: jawaban sukses di-cache, jawaban gagal tidak", async () => {
  minta = []; jawab = () => ok(PP({data: {n: 1}}));
  const a = await api("/api/saham/TLKM/info", STAF, mfCache), b = await api("/api/saham/TLKM/info", STAF, mfCache);
  assert.equal(a.status, 200); assert.deepEqual(b.j, a.j); assert.equal(minta.length, 1, "kedua dari cache");
  minta = []; jawab = () => new Response("x", {status: 500});
  await api("/api/saham/ASII/info", STAF, mfCache); await api("/api/saham/ASII/info", STAF, mfCache);
  assert.equal(minta.length, 2, "galat tidak di-cache");
});

uji("saham: konsesi anonim 401, staf 200 berisi emiten, bukan aset publik; TTL grafik panjang 6 jam", async () => {
  minta = [];
  assert.equal((await api("/api/saham/konsesi", {})).status, 401);
  assert.equal((await api("/api/saham/konsesi", {cookie: "sesi_staf=" + "c".repeat(64), "x-pb": "1"})).status, 401);
  for (const h of [STAF, ADMIN]) {
    const r = await api("/api/saham/konsesi", h);
    assert.equal(r.status, 200); assert.equal(r.j.ok, true); assert.ok(Array.isArray(r.j.emiten) && r.j.emiten.length > 0 && r.j.emiten[0].kode);
    assert.ok(Array.isArray(r.j.grup_tanpa_emiten) && r.j.periode?.dari);
  }
  assert.equal(minta.length, 0, "tanpa gateway");
  /* data/ di luar ./public: tidak ada jalur aset publik ke berkasnya (ASSETS uji hanya mengenal /bnpb/saham.html) */
  for (const j of ["/data/bnpb/saham_konsesi.js", "/bnpb/saham_konsesi.js", "/saham_konsesi.js"]) assert.notEqual((await api(j, {})).status, 200, j);
  assert.equal(existsSync(path.join(AKAR, "public/data/bnpb/saham_konsesi.js")), false);
  const {ttlGrafik} = await import("../../src/saham.js");
  assert.equal(ttlGrafik("LAST_1_YEAR"), 21600); assert.equal(ttlGrafik("LAST_3_MONTHS"), 21600);
  for (const p of ["LAST_1_DAY", "LAST_7_DAYS", "LAST_1_MONTH", "YEAR_TO_DATE"]) assert.equal(ttlGrafik(p), 60, p);
});

uji("saham: batas laju per staf 429", async () => {
  const m = await buat("uji-saham-laju", {STELLAR_KEY_STOCKBIT: KEY_S}, false);
  try {
    jawab = () => ok(PP({data: {a: 1}})); let s429 = 0;
    for (let i = 0; i < 62; i++) if ((await api("/api/saham/BBCA/info?x=" + i, STAF, m)).status === 429) s429++;
    assert.ok(s429 >= 1 && s429 <= 2, "batas 60/mnt: " + s429);
    assert.equal((await api("/api/saham/BBCA/info", ADMIN, m)).status, 200, "admin kuota sendiri");
  } finally { await m.dispose(); }
});
