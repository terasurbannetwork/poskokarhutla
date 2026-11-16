// Gerbang penjaga data beku (PB-68.10): scripts/agents/cek_basi.py memeriksa umur berkas dari tanggal di dalamnya dan gagal bila beku;
// lintas.yml dan statis.yml wajib memanggilnya sebagai langkah akhir `if: always()` TANPA continue-on-error; risiko.py terjadwal bulanan dan di-commit.
import {test} from "node:test";
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import {mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";

const py = ["python3", "python"].find(p => spawnSync(p, ["-c", "pass"]).status === 0);
const jalan = (...a) => spawnSync(py, ["scripts/agents/cek_basi.py", ...a], {encoding: "utf8"});
const hari = n => new Date(Date.now() - n * 864e5).toISOString().slice(0, 19) + "Z";

function akar(isi) {
  const d = mkdtempSync(join(tmpdir(), "basi-"));
  for (const [p, v] of Object.entries(isi)) {
    mkdirSync(join(d, p, ".."), {recursive: true});
    writeFileSync(join(d, p), typeof v === "string" ? v : JSON.stringify(v));
  }
  return d;
}
const SEMUA = ["public/data/kekeringan_prakiraan.json", "public/data/kekeringan_neraca.json", "public/gunungapi/data/paparan.json", "public/gunungapi/data/risiko.json"];
const segar = Object.fromEntries(SEMUA.map(p => [p, {dibuat: hari(0.5)}]));

test("self-check python lulus", () => {
  assert.ok(py, "python tidak ada");
  const r = jalan("uji");
  assert.equal(r.status, 0, r.stdout + r.stderr);
});

test("berkas segar lolos (keluar 0)", () => {
  const d = akar(segar);
  try { const r = jalan("lintas", "--akar", d); assert.equal(r.status, 0, r.stdout + r.stderr); } finally { rmSync(d, {recursive: true, force: true}); }
});

test("berkas basi gagal (keluar 1) dan menyebut berkasnya", () => {
  const d = akar({...segar, "public/data/kekeringan_neraca.json": {dibuat: hari(30)}});
  try {
    const r = jalan("lintas", "--akar", d);
    assert.equal(r.status, 1);
    assert.match(r.stdout, /::error title=Data beku::public\/data\/kekeringan_neraca\.json/);
  } finally { rmSync(d, {recursive: true, force: true}); }
});

test("ambang kuning hanya memberi ::warning, tidak gagal", () => {
  const d = akar({...segar, "public/data/kekeringan_neraca.json": {dibuat: hari(5)}});
  try {
    const r = jalan("lintas", "--akar", d);
    assert.equal(r.status, 0, r.stdout);
    assert.match(r.stdout, /::warning title=Data mulai basi::public\/data\/kekeringan_neraca\.json/);
  } finally { rmSync(d, {recursive: true, force: true}); }
});

test("berkas tanpa tanggal, bertanggal rusak, atau hilang = gagal", () => {
  const d = akar({"public/data/kekeringan_prakiraan.json": {sumber: "x"}, "public/data/kekeringan_neraca.json": {dibuat: "bukan tanggal"}, "public/gunungapi/data/risiko.json": {dibuat: hari(1)}});
  try {
    const r = jalan("lintas", "--akar", d);
    assert.equal(r.status, 1);
    assert.match(r.stdout, /kekeringan_prakiraan\.json kunci 'dibuat' kosong/);
    assert.match(r.stdout, /kekeringan_neraca\.json kunci 'dibuat' kosong/);
    assert.match(r.stdout, /paparan\.json berkas tidak ada/);
  } finally { rmSync(d, {recursive: true, force: true}); }
});

test("tanggal saja (tanpa jam) terbaca", () => {
  const d = akar({...segar, "public/gunungapi/data/risiko.json": {dibuat: new Date().toISOString().slice(0, 10)}});
  try { assert.equal(jalan("statis", "--akar", d).status, 0); } finally { rmSync(d, {recursive: true, force: true}); }
});

test("grup tak dikenal ditolak (keluar 2)", () => assert.equal(jalan("ngawur").status, 2));

const W = ".github/workflows";
test("lintas.yml dan statis.yml memanggil penjaga sebagai langkah akhir always() tanpa continue-on-error", () => {
  for (const [f, g] of [["lintas.yml", "lintas"], ["statis.yml", "statis"]]) {
    const langkah = readFileSync(`${W}/${f}`, "utf8").split(/\n(?=      - name: )/);
    const akhir = langkah[langkah.length - 1];
    assert.match(akhir, new RegExp(String.raw`python3 scripts/agents/cek_basi\.py ${g}(?![\w])`), `${f}: langkah akhir bukan penjaga`);
    assert.match(akhir, /if: always\(\)/, f);
    assert.doesNotMatch(akhir, /continue-on-error/, `${f}: penjaga tidak boleh ditelan`);
  }
});

test("statis.yml: risiko.py bulanan dan keluarannya di-commit", () => {
  const s = readFileSync(`${W}/statis.yml`, "utf8");
  assert.match(s, /scripts\/gunungapi\/risiko\.py/);
  assert.match(s, /B="[^"]*public\/gunungapi\/data\/risiko\.json/);
});

test("statis.yml: mentah gunung api (krb.geojson) dipulihkan dan disimpan di cache lintas-", () => {
  const s = readFileSync(`${W}/statis.yml`, "utf8");
  assert.match(s, /actions\/cache\/restore@v4\n\s+with:\n\s+path: \|\n(?:\s+\S+\n)*?\s+data\/raw\/gunungapi\n(?:\s+\S+\n)*?\s+key: lintas-/);
  assert.match(s, /actions\/cache\/save@v4\n\s+with:\n\s+path: \|\n(?:\s+\S+\n)*?\s+data\/raw\/gunungapi\n(?:\s+\S+\n)*?\s+key: lintas-/);
});
