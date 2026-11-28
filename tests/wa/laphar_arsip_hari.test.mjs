// RU-045: laphar_arsip.mjs --hari. pdftotext diganti skrip kecil yang menyalin fixture teks bersih (tanpa nama orang).
import test from "node:test";
import assert from "node:assert/strict";
import {mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, chmodSync} from "node:fs";
import {execFileSync, spawnSync} from "node:child_process";
import {tmpdir} from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";

const AKAR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SKRIP = path.join(AKAR, "scripts/umum/laphar_arsip.mjs");
const FIX = path.join(AKAR, "tests/wa/fixtures/laphar_contoh_2026-11-25.txt");

function siapkan() {
  const d = mkdtempSync(path.join(tmpdir(), "laphar-"));
  mkdirSync(path.join(d, "arsip/11"), {recursive: true});
  writeFileSync(path.join(d, "arsip/11/Laporan Harian Dit. Koordalops BNPB 25112026.pdf"), "%PDF-palsu");
  writeFileSync(path.join(d, "arsip/11/Laporan Harian Dit. Koordalops BNPB 20112026.docx"), "x");
  const pt = path.join(d, "pdftotext.sh");
  writeFileSync(pt, `#!/bin/sh\ncp "${FIX}" "$6"\n`); chmodSync(pt, 0o755);
  return {d, pt};
}
const jalan = ({d, pt}, ...a) => spawnSync("node", [SKRIP, "--arsip", path.join(d, "arsip"), "--keluar", path.join(d, "raw"), ...a], {env: {...process.env, PDFTOTEXT: pt}, encoding: "utf8"});

test("--hari: satu tanggal terurai, indeks digabung, aman diulang", () => {
  const s = siapkan();
  let r = jalan(s, "--hari", "2026-11-25");
  assert.equal(r.status, 0, r.stderr);
  const f = path.join(s.d, "raw/hari/2026-11-25.json"), fi = path.join(s.d, "raw/indeks.json");
  const h = JSON.parse(readFileSync(f, "utf8"));
  assert.equal(h.tanggal, "2026-11-25"); assert.equal(h.kejadian.length, 2);
  assert.equal(h.kejadian[0].jenis, "banjir");
  const i1 = JSON.parse(readFileSync(fi, "utf8"));
  assert.deepEqual(i1.hari.map(x => x.tanggal), ["2026-11-25"]);
  assert.deepEqual(i1.tanpa_pdf, []);                       // 25 Nov punya PDF; 20 Nov tidak disentuh mode satu hari
  const isi1 = readFileSync(f, "utf8");
  r = jalan(s, "--hari", "2026-11-25");
  assert.equal(r.status, 0);
  assert.equal(readFileSync(f, "utf8"), isi1, "ulang = hari/*.json identik");
  assert.deepEqual(JSON.parse(readFileSync(fi, "utf8")).hari.map(x => x.tanggal), ["2026-11-25"], "tidak dobel");
});

test("--hari: tanggal tidak sah ditolak, tanggal tanpa berkas tidak mengubah apa pun", () => {
  const s = siapkan();
  assert.equal(jalan(s, "--hari", "2026-13-01").status, 2);
  assert.equal(jalan(s, "--hari", "../x").status, 2);
  assert.equal(jalan(s, "--hari", "2026-11-26").status, 3);
  assert.ok(!existsSync(path.join(s.d, "raw/indeks.json")));
  assert.equal(jalan(s, "--hari", "2026-11-20").status, 0);  // hanya .docx: dicatat tanpa_pdf
  assert.deepEqual(JSON.parse(readFileSync(path.join(s.d, "raw/indeks.json"), "utf8")).tanpa_pdf, ["2026-11-20"]);
});

test("laphar_arsip.py: Giat BNPB (upaya) jadi kelas pendampingan episode, tanpa teks bebas", () => {
  const s = siapkan();
  assert.equal(jalan(s, "--hari", "2026-11-25").status, 0);
  const keluar = path.join(s.d, "riwayat.json");
  execFileSync("python3", ["-I", path.join(AKAR, "scripts/umum/laphar_arsip.py"), "--masuk", path.join(s.d, "raw"), "--keluar", keluar]);
  const j = JSON.parse(readFileSync(keluar, "utf8"));
  assert.equal(j.cakupan.sampai, "2026-11-25");
  const pati = j.episode.find(e => e.jenis === "banjir");
  assert.deepEqual(pati.pendampingan, {isi: true, kelas: ["logistik", "personel"]});
  assert.ok(!readFileSync(keluar, "utf8").includes("penyaluran"), "teks penuh tidak terbit");
});

test("self-check bawaan skrip lulus", () => {
  assert.match(execFileSync("node", [SKRIP, "uji"], {encoding: "utf8"}), /lulus/);
});
