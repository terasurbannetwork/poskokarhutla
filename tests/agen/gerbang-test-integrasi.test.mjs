/* Gerbang uji integrasi ujung ke ujung (~/.claude/TEST.md, aturan pemilik 23 Agu 2026): alur lintas-tabel dan lintas proses
   wajib punya uji yang benar-benar menjalankannya, terdaftar di tests/e2e/cakupan.json. Gerbang ini tanpa database: hanya
   membaca registri, berkas uji, dan janji di data/kajian-bnpb/<modul>/RENCANA-UJI.md. Suite e2e sendiri TIDAK jalan di sini
   (Miniflare + python3, terlalu berat untuk tiap push); jalankan node --test <berkas> saat alurnya berubah. */
import {test} from "node:test";
import assert from "node:assert/strict";
import {existsSync, readFileSync, readdirSync} from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const REG = "tests/e2e/cakupan.json";
const BATAS_ANTRE = 0;   // hanya boleh turun
const reg = JSON.parse(readFileSync(path.join(ROOT, REG), "utf8"));
const baca = f => readFileSync(path.join(ROOT, f), "utf8");

test("registri e2e berbentuk benar: diuji, dikecualikan, antre", () => {
  for (const k of ["diuji", "dikecualikan", "antre"]) assert.equal(typeof reg[k], "object", `${REG} tanpa kunci "${k}": registri tidak bisa dibaca gerbang; tambahkan objek kosong {}`);
  const pendek = Object.entries(reg.dikecualikan).filter(([, v]) => String(v).trim().length < 15).map(([k]) => k);
  assert.deepEqual(pendek, [], `alasan pengecualian kurang dari 15 karakter di ${REG}: alur dikecualikan tanpa alasan sama dengan utang tersembunyi; tulis alasannya`);
  const n = Object.keys(reg.antre).length;
  assert.ok(n <= BATAS_ANTRE, `antre e2e berisi ${n} alur, batasnya ${BATAS_ANTRE}: antre hanya boleh menyusut; tulis ujinya lalu pindahkan ke diuji`);
});

test("tiap entri diuji menunjuk berkas yang ada dan nama uji yang ada; tanpa mock", () => {
  const salah = [];
  for (const [alur, e] of Object.entries(reg.diuji)) {
    if (!e?.berkas || !existsSync(path.join(ROOT, e.berkas))) { salah.push(`${alur}: berkas ${e?.berkas} tidak ada`); continue; }
    const isi = baca(e.berkas), nama = [].concat(e.uji || []);
    if (!nama.length) salah.push(`${alur}: daftar "uji" kosong`);
    for (const u of nama) if (!isi.includes(`uji("${u}`) && !isi.includes(`test("${u}`)) salah.push(`${alur}: uji "${u}" tidak ditemukan di ${e.berkas}`);
    if (/\bmock\s*\.\s*(method|fn|module|timers)\b|from\s+["'](sinon|vitest|jest)/.test(isi)) salah.push(`${alur}: ${e.berkas} memakai mock; uji e2e harus menjalankan sistem sungguhan`);
  }
  assert.deepEqual(salah, [], `registri ${REG} menunjuk uji yang tidak ada atau bermock: alur dianggap teruji padahal tidak. Betulkan nama uji (potongan awal nama yang ADA) atau berkasnya:\n${salah.join("\n")}`);
});

test("tiap tests/e2e/*.test.mjs terdaftar", () => {
  const ada = readdirSync(path.join(ROOT, "tests/e2e")).filter(f => f.endsWith(".test.mjs")).map(f => "tests/e2e/" + f);
  const terdaftar = new Set([...Object.values(reg.diuji).map(e => e.berkas), ...Object.values(reg.antre)]);
  const yatim = ada.filter(f => !terdaftar.has(f));
  assert.deepEqual(yatim, [], `uji e2e tanpa entri di ${REG}: tidak ada yang tahu alur apa yang dijaganya; tambahkan ke "diuji":\n${yatim.join("\n")}`);
});

test("berkas tests/e2e/ yang dijanjikan RENCANA-UJI.md ada dan terdaftar", () => {
  const akar = path.join(ROOT, "data/kajian-bnpb"), janji = [];
  for (const m of readdirSync(akar, {withFileTypes: true})) {
    const f = path.join(akar, m.name, "RENCANA-UJI.md");
    if (!m.isDirectory() || !existsSync(f)) continue;
    for (const x of readFileSync(f, "utf8").matchAll(/tests\/e2e\/[\w.-]+\.test\.mjs/g)) janji.push([`data/kajian-bnpb/${m.name}/RENCANA-UJI.md`, x[0]]);
  }
  const terdaftar = new Set([...Object.values(reg.diuji).map(e => e.berkas), ...Object.values(reg.antre)]);
  const ingkar = janji.filter(([, b]) => !terdaftar.has(b) || !existsSync(path.join(ROOT, b))).map(([d, b]) => `${d} -> ${b}`);
  assert.deepEqual([...new Set(ingkar)], [], `rencana uji menjanjikan uji e2e yang belum ada atau belum terdaftar di ${REG}: kriteria terima tiketnya tidak bisa dibuktikan. Tulis ujinya dan daftarkan di "diuji" (atau "antre" sementara):\n${ingkar.join("\n")}`);
});
