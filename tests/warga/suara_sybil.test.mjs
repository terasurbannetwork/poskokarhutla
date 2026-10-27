/* Aduan/konfirmasi laporan warga di workerd (Miniflare) + D1 dengan migrasi apa adanya.
   1. Aduan wajib Turnstile (tiga IP anonim tak boleh menyembunyikan laporan orang).
   2. Laporan bantuan (minta, tawar, sehat, padam, evakuasi) tidak disembunyikan otomatis oleh aduan maupun suara 'salah'; laporan lain tetap. */
import {test, before, after} from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import {Miniflare} from "miniflare";
import {AKAR, migrasi, pecah} from "./_bantu.mjs";

let mf, DB;
const luar = async req => {
  if (new URL(req.url).hostname !== "challenges.cloudflare.com") return new Response("diblok di uji", {status: 599});
  const f = await req.formData();
  return Response.json({success: f.get("response") === "lolos"});
};
before(async () => {
  mf = new Miniflare({modules: true, scriptPath: path.join(AKAR, "src/worker.js"), modulesRoot: AKAR, modulesRules: [{type: "ESModule", include: ["**/*.js"]}],
    compatibilityDate: "2024-09-23", d1Databases: {DB: "uji-suara-sybil"}, bindings: {IP_SALT: "garam-uji", ADMIN_TOKEN: "rahasia-admin", TURNSTILE_SITEKEY: "kunci-situs", TURNSTILE_SECRET: "rahasia-ts"},
    serviceBindings: {ASSETS: () => new Response("tidak ada", {status: 404})}, outboundService: luar});
  DB = await mf.getD1Database("DB");
  await DB.batch(pecah(migrasi()).map(s => DB.prepare(s)));
});
after(() => mf?.dispose());

let ipN = 0, geser = 0;
const panggil = async (m, jalur, body, h = {}) => {
  const r = await mf.dispatchFetch("http://warga.lokal" + jalur, {method: m, headers: {"cf-connecting-ip": `10.7.0.${++ipN}`, "content-type": "application/json", ...h},
    body: body === undefined ? undefined : JSON.stringify(body)});
  const teks = await r.text(); let j = null; try { j = JSON.parse(teks); } catch (e) {}
  return {status: r.status, j, teks};
};
const buat = async (jenis, sub, bahaya = "umum") => {
  const r = await panggil("POST", "/api/warga", {jenis, sub, bahaya, teks: "uji " + jenis, lat: -3 + ++geser * 0.05, lon: 110, turnstile: "lolos"});
  assert.equal(r.status, 201, r.teks); return r.j.id;
};
const aduan = (id, turnstile = "lolos") => panggil("POST", `/api/warga/${id}/lapor`, {nilai: "palsu", turnstile});
let jamN = 0;   // cache tepi 30 dtk aktif di sini: URL unik per panggilan supaya daftar tidak basi
const terdaftar = async id => (await panggil("GET", "/api/warga?jam=" + (++jamN % 168 + 1))).j.features.some(f => f.id === id);

test("aduan tanpa token sah = 403 dan tidak tersimpan; konfirmasi tetap tanpa token", async () => {
  const id = await buat("info", "umum");
  for (const t of [null, "", "palsu"]) assert.equal((await aduan(id, t)).status, 403, `token ${JSON.stringify(t)}`);
  assert.equal((await DB.prepare("SELECT count(*) n FROM suara WHERE laporan_id = ?").bind(id).first()).n, 0);
  assert.equal((await aduan(id)).status, 200);
  assert.equal((await panggil("POST", `/api/warga/${id}/konfirmasi`, {nilai: "benar"})).status, 200);
});

test("laporan non-bantuan: 3 aduan dari 3 IP tetap menyembunyikan", async () => {
  const id = await buat("info", "umum");
  for (let i = 0; i < 3; i++) await aduan(id);
  assert.equal(await terdaftar(id), false);
  assert.equal((await DB.prepare("SELECT disembunyikan FROM laporan WHERE id = ?").bind(id).first()).disembunyikan, 1);
});

test("laporan bantuan (tiap jenis): 3 aduan dan 3 suara salah tidak menyembunyikan; aduan terhitung dan muncul di daftar admin", async () => {
  const { JENIS } = await import("../../public/informasi_jenis.js");
  const bantuan = Object.keys(JENIS).filter(k => JENIS[k].bantuan);
  assert.deepEqual(bantuan.sort(), ["evakuasi", "minta", "padam", "sehat", "tawar"], "himpunan jenis bantuan di klien = yang dikodekan di worker dan migrasi 0069");
  for (const jenis of bantuan) {
    const id = await buat(jenis, Object.keys(JENIS[jenis].sub)[0], JENIS[jenis].bahaya?.[0] ?? "umum");
    for (let i = 0; i < 3; i++) { assert.equal((await aduan(id)).status, 200); await panggil("POST", `/api/warga/${id}/konfirmasi`, {nilai: "salah"}); }
    const baris = await DB.prepare("SELECT disembunyikan, aduan, salah FROM laporan WHERE id = ?").bind(id).first();
    assert.deepEqual([baris.disembunyikan, baris.aduan, baris.salah], [0, 3, 3], jenis);
    assert.equal(await terdaftar(id), true, `${jenis} harus tetap di daftar publik`);
    const adm = await panggil("GET", "/api/warga/admin?tersembunyi=1", undefined, {"x-admin-token": "rahasia-admin"});
    assert.ok(adm.j.some(x => x.id === id && x.aduan === 3), `${jenis} aduan>=3 harus muncul di daftar admin`);
  }
});

test("antrean moderator (tersembunyi=1) diurut aduan terbanyak dulu; daftar admin biasa tetap terbaru dulu", async () => {
  const banyak = await buat("minta", "makanan"), sedikit = await buat("info", "umum"), nol = await buat("info", "umum");
  for (let i = 0; i < 3; i++) await aduan(banyak);
  await aduan(sedikit);
  // paksa urutan waktu: banyak paling lama, nol paling baru
  const t = 9_000_000_000_000;
  for (const [id, d] of [[banyak, 0], [sedikit, 1], [nol, 2]]) await DB.prepare("UPDATE laporan SET dibuat = ?, kedaluwarsa = ? WHERE id = ?").bind(t + d, t + d + 86400000, id).run();
  const h = {"x-admin-token": "rahasia-admin"};
  const urut = j => j.map(x => x.id).filter(id => [banyak, sedikit, nol].includes(id));
  const antre = await panggil("GET", "/api/warga/admin?tersembunyi=1", undefined, h);
  assert.deepEqual(urut(antre.j), [banyak, sedikit]);   // nol tak teraduan: bukan bagian antrean
  const semua = await panggil("GET", "/api/warga/admin", undefined, h);
  assert.deepEqual(urut(semua.j), [nol, sedikit, banyak]);
});
