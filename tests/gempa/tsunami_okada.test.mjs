// TS-21 (bagian Okada): perilaku sumber tsunami dijalankan sungguhan lewat python3, tanpa mock.
// Ambang diambil dari self-check scripts/gempa/tsunami_sumber.py (0,5 persen lawan sumber titik Okada 1985), tidak disetel di sini.
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const AKAR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const GEMPA = path.join(AKAR, "scripts/gempa");

function py(args, opsi = {}) {
  const r = spawnSync("python3", ["-I", ...args], { cwd: AKAR, encoding: "utf8", timeout: 240000, ...opsi });
  assert.equal(r.status, 0, `python3 gagal: ${r.stderr}\nSebab: sumber tsunami menyimpang dari aturannya. Perbaiki scripts/gempa/tsunami_sumber.py, jangan longgarkan uji.`);
  return r.stdout;
}

// Jalankan potongan Python dengan modul sumber; keluaran JSON.
function sumber(kode) {
  return JSON.parse(py(["-c", `import sys, json, math\nsys.path.insert(0, ${JSON.stringify(GEMPA)})\nimport tsunami_sumber as t\n${kode}`]));
}

test("self-check tsunami_sumber.py (Okada, segmentasi, layak) lulus", () => {
  assert.match(py([path.join(GEMPA, "tsunami_sumber.py"), "uji"]), /tsunami_sumber uji OK/);
});

test("kesetaraan Python-JS: ukuran, faktorDalam, rupture, layak sama dengan public/gempa/tsunami.js", () => {
  const o = py(["-c", `import sys\nsys.path.insert(0, ${JSON.stringify(GEMPA)})\nimport uji_js_tsunami as u\nu.uji_kesetaraan()`]);
  assert.match(o, /kesetaraan Python-JS OK/);
});

test("Okada dip-slip cocok dengan integrasi sumber titik independen dalam 0,5 persen", () => {
  const h = sumber(`
kasus = ((0, -10, 60, 40, 5, 15), (10, 20, 60, 40, 5, 15), (0, 0, 30, 20, 2, 35), (-25, 8, 40, 15, 3, 60))
out = []
for x, y, L, W, atas, dip in kasus:
    a = t.okada_uz(x, y, L, W, atas, dip, 90, 1.0)
    b = t._uz_bidang_numerik(x, y, L, W, atas, dip, "dip", n=80)
    out.append([a, b])
print(json.dumps(out))`);
  assert.equal(h.length, 4);
  for (const [a, b] of h) assert.ok(Math.abs(a - b) < 0.005 * Math.max(Math.abs(a), Math.abs(b), 0.05), `okada ${a} vs titik ${b}`);
});

test("tanda: thrust naik di atas bagian dangkal, sesar turun kebalikannya", () => {
  const h = sumber(`
out = []
for dip, atas, L, W in ((15, 5.0, 60.0, 40.0), (35, 2.0, 40.0, 20.0), (60, 1.0, 30.0, 15.0)):
    y = -W * math.cos(math.radians(dip)) / 4
    out.append([t.okada_uz(0, y, L, W, atas, dip, 90, 3), t.okada_uz(0, y, L, W, atas, dip, -90, 3)])
print(json.dumps(out))`);
  for (const [naik, turun] of h) {
    assert.ok(naik > 0, `thrust harus naik: ${naik}`);
    assert.ok(turun < 0, `normal harus turun: ${turun}`);
  }
});

test("jenis geser ditolak dengan ValueError (suku strike-slip belum divalidasi)", () => {
  const h = sumber(`
try:
    t.deformasi({"jenis": "geser", "dip": 90, "W": 10, "L": 20, "slip": 1, "dalam": 10}, 0, 0)
    print(json.dumps("tidak ditolak"))
except ValueError:
    print(json.dumps("ditolak"))`);
  assert.equal(h, "ditolak");
});

test("segmentasi M9,1 (Aceh 2004) menghasilkan 8 segmen yang jumlah panjangnya sama dengan rupture", () => {
  const h = sumber(`
r = t.rupture({"lat": 3.3, "lon": 95.9, "m": 9.1, "dalam": 25, "jenis": "subduksi", "strike": 335})
sg = t.segmentasi(r)
print(json.dumps({"n": len(sg), "L": r["L"], "jumlah": sum(s["L"] for s in sg)}))`);
  assert.equal(h.n, 8);
  assert.ok(Math.abs(h.jumlah - h.L) < 1e-9);
});

test("sumber nyata M8,5 selatan Jawa: layak, dan deformasi di atas jejak positif (naik)", () => {
  const h = sumber(`
e = {"lat": -9.75, "lon": 110.6, "m": 8.5, "dalam": 25, "jenis": "subduksi", "strike": 276}
r = t.rupture(e)
print(json.dumps({"layak": t.layak(e, t.muat_grid()), "uz": t.deformasi(r, r["lat"] - 0.3, r["lon"])}))`);
  assert.equal(h.layak, true);
  assert.ok(h.uz > 0, `uz ${h.uz}`);   // tanda saja: angkatan di atas jejak sesar naik
});
