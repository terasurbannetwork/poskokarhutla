/* SS-22 Beda Sumber: menjalankan beda_sumber.py sungguhan dengan fixture tulisan tangan, lalu memeriksa beda_sumber.json nyata dan silang.js. */
import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {py, uji_mandiri, AKAR} from "./_silang.mjs";

const D = "scripts/bnpb/silang";
const B = JSON.parse(readFileSync(AKAR + "public/data/bnpb/beda_sumber.json", "utf8"));

test("self-check Python beda_sumber.py uji hijau", () => {
  const r = uji_mandiri(D + "/beda_sumber.py");
  assert.equal(r.status, 0, r.err);
});

const S = py(D, `
import beda_sumber as b
p = b.baca(b.PETA)
bd = lambda *a, **k: b.banding(p, *a, **k)[0]
wil = {"kab": [{"kode": "1101", "prov": "11", "nama": "Aceh Selatan"}]}
bm = {"terbit": {"2026-03-01": {"hari": ["2026-03-01"], "kab": {"11.01": [[120.0, 5]]}}}}
pr = {"ambang_catat": {"mm": 30, "kmj": 45}, "terbit": {"2026-03-01": {"hari": ["2026-03-01"], "kab": {}}}}
mar = {"terbit": "2026-03-01T00:00:00Z", "hari": ["2026-03-01", "2026-03-02"], "perairan": [["P.1", "Uji", "11", 1, 1, [5, 30], ["a", "a"], [1, 1], [1, 1], [None, 12]]], "pelabuhan": []}
o = b.bangun("2026-03-01", p, bm, pr, wil, mar)
print(json.dumps({
  "dua_peringkat": bd("hujan", 120, 10), "satu_peringkat": bd("hujan", 60, 10), "hilang_a": bd("hujan", None, 10), "hilang_b": bd("gelombang", 1.0, None, True),
  "lantai_selaras": bd("gelombang", 0.05, 0.12, True), "lantai_cek": bd("gelombang", 0.05, 0.5, True), "tepat2": bd("gelombang", 1.0, 2.0, True), "lebih2": bd("gelombang", 1.0, 2.6, True),
  "o": o, "ulang": o == b.bangun("2026-03-01", p, bm, pr, wil, mar)}))
`);

test("beda dua peringkat menyalakan perlu_dicek; beda satu peringkat selaras", () => {
  assert.equal(S.dua_peringkat, "perlu_dicek");
  assert.equal(S.satu_peringkat, "selaras");
});

test("sumber hilang = tidak_dibandingkan, bukan selaras", () => {
  assert.equal(S.hilang_a, "tidak_dibandingkan");
  assert.equal(S.hilang_b, "tidak_dibandingkan");
  // gelombang 1 Mar tanpa nilai model: dihitung tidak_dibandingkan di ringkasan
  assert.equal(S.o.ringkas.per_bahaya.gelombang.tidak_dibandingkan, 1);
});

test("rasio gelombang memakai lantai 0,1 m; tepat 2 kali bukan lebih dari 2", () => {
  assert.equal(S.lantai_selaras, "selaras");   // 0,12 / 0,1 = 1,2; tanpa lantai 2,4 kali
  assert.equal(S.lantai_cek, "perlu_dicek");
  assert.equal(S.tepat2, "selaras");
  assert.equal(S.lebih2, "perlu_dicek");
});

test("tidak ada field yang menyebut sumber benar; deterministik", () => {
  const kunciSemua = [];
  JSON.stringify([S.o, B], (k, v) => (kunciSemua.push(k), v));
  assert.ok(kunciSemua.length > 50);
  assert.deepEqual(kunciSemua.filter(k => /benar|menang|valid|pemenang/i.test(k)), []);
  assert.equal(S.ulang, true);
});

test("beda_sumber.json nyata: skema, kedua lembaga, ringkasan konsisten", () => {
  assert.equal(B.versi, 1);
  assert.ok(B.ambang && B.ringkas && Array.isArray(B.baris));
  assert.equal(B.ringkas.n_perlu_dicek, B.baris.length);
  for (const x of B.baris) {
    assert.equal(x.status, "perlu_dicek");
    for (const s of [x.a, x.b]) for (const k of ["sumber", "lembaga", "satuan", "peringkat", "diambil"]) assert.ok(s[k] !== undefined && s[k] !== "", `sumber tanpa ${k}`);
    assert.notEqual(x.a.lembaga, x.b.lembaga, "dua lembaga berbeda");
    assert.ok(x.alasan);
    assert.ok(Math.abs(x.a.peringkat - x.b.peringkat) >= B.ambang.peringkat || x.bahaya === "gelombang");
  }
  const t = JSON.stringify(B).toLowerCase();
  assert.doesNotMatch(t, /pantau bencana/);
  assert.doesNotMatch(t, /\baman\b/);
});

test("kartu silang.js menampilkan kedua lembaga dan memuat beda_sumber.json", () => {
  const js = readFileSync(AKAR + "public/bnpb/silang.js", "utf8");
  assert.match(js, /\/data\/bnpb\/beda_sumber\.json/);
  assert.match(js, /\$\{x\.a\.lembaga\}.*\$\{x\.b\.lembaga\}/s);
});
