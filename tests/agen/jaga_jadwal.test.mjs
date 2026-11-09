/* Pemeriksa jadwal terlewat (scripts/terbit/jaga_jadwal.mjs) dan denyut Worker (src/jaga_jadwal.js), insiden 7-8 Nov 2026. Tanpa jaringan.
   Jalankan: node --test tests/agen/jaga_jadwal.test.mjs */
import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {JADWAL, jalankan, putuskan} from "../../scripts/terbit/jaga_jadwal.mjs";
import {denyutJaga} from "../../src/jaga_jadwal.js";

const titik = JADWAL.find(j => j.wf === "titik.yml"), jp = JADWAL.find(j => j.wf === "jarak_pandang.yml");
const iso = ms => new Date(ms).toISOString();
const J = t => Date.parse(`2026-11-08T${t}:00Z`);
const run = (t, conclusion = "success", status = "completed") => ({created_at: iso(t), conclusion, status});

test("insiden 8 Nov: titik sukses terakhir 06.41 UTC tanpa run berikutnya, dipicu begitu lewat batas irama", () => {
  assert.equal(putuskan(titik, [run(J("06:41"))], J("09:52")).aksi, "picu");
});

test("putaran cut-off 09.10 UTC terlewat: dipicu begitu batas 09.50 lewat walau irama 3 jam belum habis", () => {
  const d = putuskan(titik, [run(J("07:30"))], J("09:52"));
  assert.equal(d.aksi, "picu"); assert.match(d.alasan, /cut-off/);
  assert.equal(putuskan(titik, [run(J("07:30"))], J("09:49")).aksi, "tunggu");
});

test("run sukses sesudah jendela dibuka berarti putaran cut-off sudah ada", () => {
  assert.equal(putuskan(titik, [run(J("09:20"))], J("10:30")).aksi, "tunggu");
});

test("lebih dari batas menit tanpa run sukses: dipicu", () => {
  assert.equal(putuskan(titik, [run(J("01:54"))], J("05:30")).aksi, "picu");
  assert.equal(putuskan(titik, [run(J("03:00"))], J("05:30")).aksi, "tunggu");
});

test("run gagal atau batal tidak dihitung sukses", () => {
  assert.equal(putuskan(titik, [run(J("05:00"), "cancelled"), run(J("01:00"))], J("06:30")).aksi, "picu");
});

test("tak memicu saat run masih jalan, baru dibuat, atau gagal tiga kali berturut", () => {
  assert.equal(putuskan(titik, [run(J("05:00"), null, "in_progress"), run(J("00:00"))], J("06:30")).aksi, "tunggu");
  assert.equal(putuskan(titik, [run(J("06:00"), "failure"), run(J("00:00"))], J("06:30")).alasan, "run terakhir baru dibuat");
  assert.equal(putuskan(titik, [run(J("03:00"), "failure"), run(J("02:00"), "failure"), run(J("01:00"), "failure")], J("07:00")).alasan, "gagal tiga kali berturut");
});

test("workflow berjam aktif tidak dipicu di luar jamnya, dan rentang melewati tengah malam terbaca", () => {
  assert.equal(putuskan(jp, [run(J("10:12"))], J("18:00")).alasan, "di luar jam aktif");
  assert.equal(putuskan(jp, [run(J("00:12"))], J("05:00")).aksi, "picu");
});

test("jendela 22.55 UTC masih berlaku sesudah tengah malam", () => {
  const besok = t => Date.parse(`2026-11-09T${t}:00Z`);
  const d = putuskan(titik, [run(Date.parse("2026-11-08T22:40:00Z"))], besok("00:53"));
  assert.equal(d.aksi, "picu"); assert.match(d.alasan, /cut-off/);
  assert.equal(putuskan(titik, [run(Date.parse("2026-11-08T23:00:00Z"))], besok("00:53")).aksi, "tunggu");
});

test("sesudah gagal tiga kali dicoba lagi begitu 6 jam lewat", () => {
  const r = [run(J("03:00"), "failure"), run(J("02:00"), "failure"), run(J("01:00"), "failure")];
  assert.equal(putuskan(titik, r, J("08:59")).alasan, "gagal tiga kali berturut");
  assert.equal(putuskan(titik, r, J("09:01")).aksi, "picu");
});

test("insiden 9 Nov: tiga run merah tidak menahan putaran cut-off, di luar jendela tetap tertahan", () => {
  const merah = [run(J("08:40"), "failure"), run(J("07:30"), "failure"), run(J("06:30"), "failure"), run(J("06:10"))];
  const d = putuskan(titik, merah, J("09:52"));
  assert.equal(d.aksi, "picu"); assert.match(d.alasan, /cut-off/);
  assert.equal(putuskan(titik, merah, J("09:49")).alasan, "gagal tiga kali berturut");
  assert.equal(putuskan(titik, merah, J("11:51")).alasan, "gagal tiga kali berturut");
  const him = JADWAL.find(j => j.wf === "himawari.yml");
  assert.equal(putuskan(him, merah, J("09:52")).alasan, "gagal tiga kali berturut");
});

test("titik.yml: hanya Himawari basi jadi peringatan, sumber lain tetap merah", () => {
  const yml = readFileSync(new URL("../../.github/workflows/titik.yml", import.meta.url), "utf8");
  const langkah = yml.slice(yml.indexOf("name: Periksa kesegaran data yang tayang"));
  assert.match(langkah, /"\$kode" = 503 \] && python3 -c '[^']*\.get\("basi"\) == \["himawari"\]/);
  assert.match(langkah, /::error title=Data basi::[^\n]*\n\s*exit 1/);
});

test("irama pengganti saat jadwal mati: pemeriksaan tiap 60 menit memberi selang yang dimaksud", () => {
  const periksa = (j, jamMaju) => putuskan(j, [run(J("12:00") + 5000)], J("12:00") + jamMaju * 3600000).aksi;
  const him = JADWAL.find(j => j.wf === "himawari.yml"), dat = JADWAL.find(j => j.wf === "data.yml");
  assert.equal(periksa(him, 1), "picu");
  assert.equal(periksa(titik, 2), "tunggu"); assert.equal(periksa(titik, 3), "picu");
  assert.equal(periksa(dat, 24), "tunggu"); assert.equal(periksa(dat, 25), "picu");
});

const SEGAR = {workflow_runs: [run(J("09:30"))]}, TELAT = {workflow_runs: [run(J("01:00"))]};
const tiruan = (telat, antre, catat) => async (u, o = {}) => {
  catat.push({u, m: o.method || "GET", b: o.body});
  if (o.method === "POST") return new Response(null, {status: 204});
  if (u.includes("/runs?status=")) return Response.json({workflow_runs: antre});
  return Response.json(telat.some(w => u.includes(`/workflows/${w}/`)) ? TELAT : SEGAR);
};

test("telat dan slot kosong: dispatch membawa input jaga", async () => {
  const c = [], h = await jalankan("t", J("10:00"), "a/b", tiruan(["titik.yml"], [], c));
  assert.ok(h.find(x => x.wf === "titik.yml").dipicu);
  assert.deepEqual(JSON.parse(c.find(x => x.m === "POST").b), {ref: "main", inputs: {jaga: "ya"}});
});

test("slot antre terisi run pipeline lain: tidak dispatch", async () => {
  const c = [], h = await jalankan("t", J("10:00"), "a/b", tiruan(["titik.yml"], [{path: ".github/workflows/banjir.yml"}], c));
  assert.equal(h.find(x => x.wf === "titik.yml").lewat, "slot antre terisi"); assert.ok(!c.some(x => x.m === "POST"));
});

test("paling banyak satu workflow grup data per putaran, yang di luar grup tetap dipicu", async () => {
  const c = [], h = await jalankan("t", J("10:00"), "a/b", tiruan(["titik.yml", "jarak_pandang.yml", "himawari.yml"], [], c));
  assert.ok(h.find(x => x.wf === "titik.yml").dipicu); assert.ok(h.find(x => x.wf === "himawari.yml").dipicu);
  assert.equal(h.find(x => x.wf === "jarak_pandang.yml").lewat, "slot antre terisi");
  assert.equal(c.filter(x => x.m === "POST").length, 2);
});

test("langkah jaga.yml sebelumnya sudah memicu pipeline: pemeriksa tidak memicu pipeline lagi", async () => {
  const c = [], h = await jalankan("t", J("10:00"), "a/b", tiruan(["titik.yml"], [], c), true);
  assert.equal(h.find(x => x.wf === "titik.yml").lewat, "slot antre terisi"); assert.ok(!c.some(x => x.m === "POST"));
});

test("GitHub menolak saat membaca riwayat: dilaporkan per workflow, yang lain tetap diperiksa", async () => {
  const h = await jalankan("t", J("10:00"), "a/b", async () => new Response("x", {status: 403}));
  assert.equal(h.length, JADWAL.length); assert.ok(h.every(x => x.galat === 403));
});

test("denyut Worker: tanpa token tak menyentuh jaringan, GitHub menolak dilaporkan tanpa melempar", async () => {
  assert.deepEqual(await denyutJaga({}, () => { throw new Error("jaringan"); }), {lewat: "tanpa token"});
  assert.deepEqual(await denyutJaga({GITHUB_TOKEN: "t"}, async () => new Response("x", {status: 403})), {galat: 403});
  let u; assert.deepEqual(await denyutJaga({GITHUB_TOKEN: "t"}, async a => { u = a; return new Response(null, {status: 204}); }), {dipicu: true});
  assert.match(u, /workflows\/jaga\.yml\/dispatches$/);
});
