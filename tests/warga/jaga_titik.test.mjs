/* Cadangan pemicu titik.yml dari cron Worker (src/jaga_pipa.js). Satu-satunya tiruan: api.github.com (eksternal).
   Jalankan: node --test tests/warga/jaga_titik.test.mjs */
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync, readdirSync} from "node:fs";
import {jagaTitik, PIPA} from "../../src/jaga_pipa.js";

const JAM = 3600e3, KINI = Date.parse("2026-11-07T09:52:00Z"), iso = jam => new Date(KINI - jam * JAM).toISOString();
function tiruan({sukses, terbaru, semua = [], status = 204}) {
  const panggil = [];
  const ambil = async (url, o = {}) => {
    panggil.push({url, metode: o.method || "GET", auth: o.headers?.authorization, body: o.body});
    if (!url.startsWith("https://api.github.com/repos/terasurbannetwork/poskokarhutla/actions/")) return new Response("diblok", {status: 599});
    if (url.endsWith("/dispatches")) return new Response(null, {status});
    if (url.includes("status=success")) return Response.json({workflow_runs: sukses == null ? [] : [{created_at: iso(sukses)}]});
    if (url.includes("workflows/titik.yml/runs")) return Response.json({workflow_runs: [{created_at: iso(terbaru)}]});
    return Response.json({workflow_runs: semua});
  };
  return {ambil, panggil, dispatch: () => panggil.filter(p => p.metode === "POST")};
}
const ENV = {GITHUB_TOKEN: "ghp_uji"};

test("jaga titik: tanpa GITHUB_TOKEN lewat tanpa memanggil GitHub", async () => {
  const t = tiruan({sukses: 9, terbaru: 9});
  assert.deepEqual(await jagaTitik({}, KINI, t.ambil), {lewat: "tanpa token"});
  assert.equal(t.panggil.length, 0);
});

test("jaga titik: run sukses terakhir < 4 jam tidak memicu", async () => {
  const t = tiruan({sukses: 3.5, terbaru: 3.5});
  assert.equal((await jagaTitik(ENV, KINI, t.ambil)).lewat, "segar");
  assert.equal(t.dispatch().length, 0);
});

test("jaga titik: GitHub melewatkan jadwal (sukses 8,7 jam lalu) memicu workflow_dispatch titik.yml ref main sekali", async () => {
  const t = tiruan({sukses: 8.7, terbaru: 8.7, semua: [{status: "completed", path: ".github/workflows/titik.yml"}, {status: "in_progress", path: ".github/workflows/terbit.yml"}]});
  const h = await jagaTitik(ENV, KINI, t.ambil);
  assert.equal(h.dipicu, true); assert.equal(h.umur_jam, 8.7);
  const [d] = t.dispatch();
  assert.equal(t.dispatch().length, 1);
  assert.equal(d.url, "https://api.github.com/repos/terasurbannetwork/poskokarhutla/actions/workflows/titik.yml/dispatches");
  assert.equal(d.auth, "Bearer ghp_uji"); assert.deepEqual(JSON.parse(d.body), {ref: "main"});
});

test("jaga titik: run terbaru < 3 jam (gagal atau masih jalan) tidak dipicu ulang", async () => {
  const t = tiruan({sukses: 8.7, terbaru: 0.5});
  assert.equal((await jagaTitik(ENV, KINI, t.ambil)).lewat, "run baru < 3 jam");
  assert.equal(t.dispatch().length, 0);
});

test("jaga titik: run grup data antre atau jalan tidak diusir dispatch", async () => {
  const t = tiruan({sukses: 9, terbaru: 9, semua: [{status: "queued", path: ".github/workflows/banjir.yml"}]});
  assert.equal((await jagaTitik(ENV, KINI, t.ambil)).lewat, "grup data sibuk");
  assert.equal(t.dispatch().length, 0);
});

test("jaga titik: belum pernah sukses tetap dipicu; dispatch ditolak dilaporkan, GitHub galat dilempar", async () => {
  const t = tiruan({sukses: null, terbaru: 30, status: 403});
  assert.deepEqual(await jagaTitik(ENV, KINI, t.ambil), {gagal: "dispatch HTTP 403"});
  await assert.rejects(jagaTitik(ENV, KINI, async () => new Response("x", {status: 401})), /GitHub HTTP 401/);
});

test("jaga titik: created_at rusak tidak memicu (gagal tertutup)", async () => {
  const t = tiruan({sukses: 9, terbaru: 9});
  const rusak = async (url, o) => url.includes("titik.yml/runs") && !url.includes("success") ? Response.json({workflow_runs: [{created_at: "bukan tanggal"}]}) : t.ambil(url, o);
  assert.equal((await jagaTitik(ENV, KINI, rusak)).lewat, "run baru < 3 jam");
  assert.equal(t.dispatch().length, 0);
});

test("jaga titik: regex grup data sama persis dengan workflow ber-group data", () => {
  const D = new URL("../../.github/workflows/", import.meta.url);
  const grup = readdirSync(D).filter(f => /\.ya?ml$/.test(f) && !/ 2\./.test(f) && /^\s*group:\s*data\s*$/m.test(readFileSync(new URL(f, D), "utf8")) && f !== "terbit.yml");
  for (const f of grup) assert.ok(PIPA.test(".github/workflows/" + f), `${f} ber-group data tetapi tidak ada di PIPA (src/jaga_pipa.js)`);
  for (const n of PIPA.source.match(/\(([^)]+)\)/)[1].split("|")) assert.ok(grup.includes(n + ".yml"), `${n}.yml di PIPA tetapi bukan group data`);
});
