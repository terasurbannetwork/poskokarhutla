// PB-79b (F-35): adaptor brief gunung api. Model murni dari status PVMBG yang sudah dimuat; level apa adanya, nilai kosong "belum tersedia".
import test from "node:test"; import assert from "node:assert/strict"; import fs from "node:fs"; import vm from "node:vm";
const baca = p => fs.readFileSync(new URL("../../" + p, import.meta.url), "utf8");
let adaptor = null; const Brief = {tema: a => { adaptor = a; }, pasang: s => { Brief.sel = s; }};
const LEVEL = {1: ["I", "Normal"], 2: ["II", "Waspada"], 3: ["III", "Siaga"], 4: ["IV", "Awas"]};
const ctx = vm.createContext({console, Date, Brief, S: {st: null}, LEVEL, fmt: n => String(n), tglJam: t => "J" + t});
vm.runInContext(baca("public/gunungapi/brief.js"), ctx);
const B = Brief.gunungapi;
const ST = {dibuat: "2026-11-10T15:47:44+07:00", letusan_cakupan: {dari: "a", sampai: "b"},
  gunung: [{nama: "Semeru", prov: "Jawa Timur", level: 3, radius_km: 5}, {nama: "Merapi", prov: "DI Yogyakarta", level: 2}, {nama: "Dieng", prov: "Jawa Tengah", level: 1}],
  letusan: [{gunung: "Semeru", waktu: "2026-11-10T15:03+07:00"}], perubahan: [{nama: "Sinabung", dari: 3, ke: 2, tgl: "2026-10-19"}]};
test("adaptor terdaftar dengan id gunungapi dan tombol dipasang di kepala", () => { assert.equal(adaptor.id, "gunungapi"); assert.ok(Brief.sel.includes("laporan.html")); });
test("model: hitungan level dari daftar, radius kosong jadi belum tersedia", () => {
  const m = B.bangun(ST, {tglJamFn: t => "J" + t, sekarang: Date.parse("2026-11-16T03:00:00Z")});
  assert.deepEqual([...m.kpi.map(k => k.v)], ["0", "1", "1", "1"]);
  assert.deepEqual([...m.tabel1.baris.map(r => r[0])], ["Semeru", "Merapi"]); assert.equal(m.tabel1.baris[1][3], "belum tersedia");
  assert.equal(m.tabel1.baris[0][2], "Level III Siaga"); assert.equal(m.tabel2.baris[0][1], "Semeru"); assert.equal(m.daftar.item.length, 1);
  assert.ok(m.daftar.item[0].includes("Level III Siaga") && m.daftar.item[0].includes("Level II Waspada"));
  assert.ok(!JSON.stringify(m).includes("·") && !/\baman\b/i.test(JSON.stringify(m)));
});
test("tanpa data erupsi: KPI erupsi null (belum tersedia), bukan nol", () => {
  const m = B.bangun({gunung: ST.gunung}); assert.equal(m.kpi[3].v, null); assert.equal(m.cutoff, null);
});
test("siap hanya bila status termuat", () => { ctx.S.st = null; assert.equal(adaptor.siap(), false); ctx.S.st = ST; assert.equal(adaptor.siap(), true); });
