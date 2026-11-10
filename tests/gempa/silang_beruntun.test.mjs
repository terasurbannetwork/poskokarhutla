import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const c = {console, Math, JSON, Date, esc: x => String(x ?? ""), fmt: n => (n == null ? "-" : String(n).replace(".", ","))};
vm.createContext(c);
vm.runInContext(fs.readFileSync("public/gempa/beruntun.js", "utf8") + "\nthis.B = Beruntun;", c);
const B = c.B, D = JSON.parse(fs.readFileSync("public/gempa/data/beruntun.json", "utf8"));

test("label Deteksi Centurisk97, bukan prediksi, hipotesis belum teruji", () => {
  assert.equal(D.label, "Deteksi Centurisk97"); assert.equal(D.bukan_prediksi, true); assert.equal(D.teruji, false);
  assert.equal(D.ambang.status, "hipotesis"); assert.equal(D.baseline, "relatif");
});

test("tanpa klaim prediksi, janji kejadian, atau kata aman", () => {
  const s = fs.readFileSync("public/gempa/beruntun.js", "utf8") + JSON.stringify(D);
  assert.doesNotMatch(s, /akan terjadi|\baman\b|Pantau Bencana/i);
  assert.doesNotMatch(B.judul(D).replace(/<[^>]+>/g, ""), /prediksi|akan /i);
});

test("ringkas konsisten dan data kurang tidak diberi peluang", () => {
  assert.equal(D.ringkas.dinilai + D.ringkas.data_kurang, D.ringkas.sasaran);
  for (const s of D.sasaran) { if (s.status === "data_kurang") assert.equal(s.p_koreksi, null); else assert.ok(s.p_koreksi >= 0 && s.p_koreksi <= 1); }
});

test("urutan: perlu dicek dulu; p tampil tiga angka", () => {
  const u = B.urut({sasaran: [{nama: "b", status: "biasa", N: 1}, {nama: "a", status: "perlu_dicek", N: 0}, {nama: "c", status: "data_kurang", N: 9}]});
  assert.equal(u.map(x => x.nama).join(), "a,b,c");
  assert.equal(B.p3(null), "–"); assert.match(B.p3(0.0004), /< 0,01/); assert.equal(B.p3(0.456), "0,46"); assert.match(B.waktuData("2026-11-10T09:47Z"), /^10 Nov 2026 pukul 16\.47 WIB$/);
});
