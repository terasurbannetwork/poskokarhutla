// PB-81.3 (F-41, D15, D16): mesin lapisan per kab/kota public/inti/peta_kab.js. Model murni diuji lewat vm; data nyata dari tiga laporan harian.
import test from "node:test"; import assert from "node:assert/strict"; import fs from "node:fs"; import vm from "node:vm";
const baca = p => fs.readFileSync(new URL("../../" + p, import.meta.url), "utf8");
const LAP = {gempa: "public/gempa/data/laporan.json", kekeringan: "public/data/kekeringan_laporan.json", cuaca: "public/banjir/data/cuaca_laporan.json"};
function dunia(registri) {
  const urls = [], win = {}; win.window = win;
  const doc = {head: {insertAdjacentHTML() {}}, getElementById: () => null, documentElement: {}, createElement: () => ({})};
  const fetch = async u => { urls.push(u); return u === "/bencana.json" ? {ok: true, json: async () => ({bencana: registri})} : {ok: false}; };
  vm.runInContext(baca("public/inti/peta_kab.js"), vm.createContext({window: win, document: doc, fetch, Intl, Promise, Number, Object, Math, JSON, Date, Array, String, Set, console, setTimeout, getComputedStyle: () => ({getPropertyValue: () => ""})}));
  return {P: win.PetaKabInti, urls};
}
const {P} = dunia([]), M = P.model, J = x => JSON.parse(JSON.stringify(x));   // objek vm lain realm: banding lewat JSON
const reg = v => [{id: "gempa", kemampuan: {layar: {peta_kab: v}}}, {id: "karhutla", kemampuan: {layar: {peta_kab: true}}}];

test("registri: hanya bila kemampuan.layar.peta_kab true, tidak pernah untuk karhutla", () => {
  assert.equal(M.izinReg(reg(true), "gempa"), true); assert.equal(M.izinReg(reg(false), "gempa"), false);
  assert.equal(M.izinReg(reg(true), "karhutla"), false); assert.equal(M.izinReg([], "gempa"), false); assert.equal(M.izinReg(null, "gempa"), false);
});
test("pasang: kunci mati = tidak mengunduh laporan maupun geometri", async () => {
  const {P: p, urls} = dunia(reg(false)); p.pasang({id: "gempa", url: "/gempa/data/laporan.json", peta: () => null, host: () => ({appendChild() { throw new Error("tidak boleh"); }}), legenda: () => null});
  await new Promise(r => setTimeout(r, 20)); assert.deepEqual(J(urls), ["/bencana.json"]);
});
test("gabung: jumlah, maks, rerata menurut agregat; hari kosong dilewati; semua kosong = null (bukan nol)", () => {
  assert.equal(M.gabung({agregat: "jumlah"}, [1, null, 3]), 4); assert.equal(M.gabung({agregat: "maks"}, [1, null, 3]), 3);
  assert.equal(M.gabung({agregat: "rerata"}, [2, null, 4]), 3); assert.equal(M.gabung({agregat: "jumlah"}, [null, null]), null);
  assert.equal(M.gabung({agregat: "jumlah"}, [0, 0]), 0); assert.equal(M.gabung({agregat: "jumlah"}, undefined), null);
});
test("opsiPeriode: berakhir di hari_lengkap; 7 dan 30 hari hanya bila harinya cukup", () => {
  const hari = n => Array.from({length: n}, (_, i) => `2026-10-${String(i + 1).padStart(2, "0")}`);
  assert.deepEqual(J(M.opsiPeriode({hari: hari(5), hari_lengkap: "2026-10-05"}).map(o => o.k)), ["1"]);
  assert.deepEqual(J(M.opsiPeriode({hari: hari(10), hari_lengkap: "2026-10-09"}).map(o => [o.k, o.i0, o.i1])), [["1", 8, 8], ["7", 2, 8]]);
  assert.deepEqual(J(M.opsiPeriode({hari: hari(30), hari_lengkap: "2026-10-30"}).map(o => o.k)), ["1", "7", "30"]);
  assert.equal(M.opsiPeriode({hari: hari(30), hari_lengkap: "tidak ada"}).at(-1).i1, 29);
  assert.deepEqual(J(M.opsiPeriode({hari: []})), []);
});
test("kelas: tidak ada data -1, nol 0, positif menurut batas; batas tanpa duplikat dan kelas teratas tidak kosong", () => {
  assert.equal(M.kelas([2, 5], null), -1); assert.equal(M.kelas([2, 5], 0), 0); assert.equal(M.kelas([2, 5], 1), 1);
  assert.equal(M.kelas([2, 5], 2), 1); assert.equal(M.kelas([2, 5], 3), 2); assert.equal(M.kelas([2, 5], 9), 3);
  assert.deepEqual(J(M.batas([null, 0, 0])), []); assert.deepEqual(J(M.batas([3, 3, 3, 3])), []);
  const b = M.batas([1, 1, 1, 2, 4, 8, 16, 32, null, 0]); assert.ok(b.every((x, i) => i === 0 || x > b[i - 1]));
  assert.ok(b.length === 0 || b.at(-1) < 32, "nilai terbesar jatuh di kelas atas");
  assert.equal(M.jumlahKelas([1, 2]), 4); assert.equal(M.takaran(4).length, 4); assert.ok(M.takaran(4)[0] < M.takaran(4)[1]);
});
test("takaran naik monoton dan dalam (0,1]", () => { for (const n of [2, 3, 4, 5]) { const t = M.takaran(n); assert.ok(t.every((x, i) => x > 0 && x <= 1 && (i === 0 || x > t[i - 1])), String(n)); } });
test("arah metrik menentukan token warna", () => {
  assert.equal(M.arahToken({arah: "naik_buruk"}), "--f3"); assert.equal(M.arahToken({arah: "naik_baik"}), "--info"); assert.equal(M.arahToken({arah: "netral"}), "--brand2");
});
test("labelBatas dan angka: tanpa titik tengah, desimal menurut metrik", () => {
  const t = M.labelBatas([2, 5], {desimal: 0}); assert.deepEqual(J(t), ["0", "≤ 2", "≤ 5", "> 5"]); assert.ok(!t.join("").includes("·"));
  assert.equal(M.angka(7.25, {desimal: 1}), "7,3"); assert.equal(M.angka(null, {desimal: 0}), "–"); assert.equal(M.angka(1200, {desimal: 0}), "1.200");
});
for (const [id, f] of Object.entries(LAP)) {
  test(`data nyata ${id}: seri kab dipakai apa adanya, kab tanpa angka = null, nilai cocok dengan penjumlahan manual`, () => {
    const D = JSON.parse(baca(f)), op = M.opsiPeriode(D), akhir = op[0].i1;
    assert.equal(D.hari[akhir], D.hari_lengkap, "periode berakhir di hari lengkap");
    for (const m of D.metrik) {
      const p7 = op.find(o => o.k === "7") || op[0], v = M.nilaiKab(D, m, p7.i0, p7.i1);
      assert.equal(Object.keys(v).length, D.kab.length);
      for (const k of D.kab) { const man = k[m.k].slice(p7.i0, p7.i1 + 1).filter(x => typeof x === "number");
        const harap = !man.length ? null : m.agregat === "maks" ? Math.max(...man) : m.agregat === "rerata" ? man.reduce((a, b) => a + b, 0) / man.length : man.reduce((a, b) => a + b, 0);
        assert.equal(v[M.kunciKab(k.prov, k.nama)], harap, `${k.nama} ${m.k}`); }
    }
  });
  test(`data nyata ${id}: tiap kab punya bentuk di geo/kabupaten (nama dan provinsi cocok)`, () => {
    const D = JSON.parse(baca(f)), geo = {};
    for (const k of D.kab) { const g = geo[k.prov] ||= new Set(JSON.parse(baca(`public/geo/kabupaten/${k.prov}.json`)).features.map(x => x.properties.kab)); assert.ok(g.has(k.nama), `${k.prov} ${k.nama}`); }
  });
}
test("berkas terpasang: tiga laman memuat mesin dan adaptor; tanpa titik tengah dan tanpa kata aman di mesin", () => {
  for (const d of ["gempa", "kekeringan", "cuaca"]) { const h = baca(`public/${d}/index.html`); assert.match(h, /inti\/peta_kab\.js/); assert.match(h, /src="peta_kab\.js"/); }
  const s = baca("public/inti/peta_kab.js") + baca("public/inti/peta_kab.css"); assert.ok(!/\baman\b/i.test(s)); assert.ok(!s.replace(/≤|>/g, "").includes("·"));
  assert.ok(!/(#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(|oklch\()/i.test(baca("public/inti/peta_kab.css")), "CSS hanya token");
});
