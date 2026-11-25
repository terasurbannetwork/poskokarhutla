/* KI-40: mesin perlakuan inti (public/inti/perlakuan.js) + ratchet salinan. node --test tests/layar/ki_perlakuan.test.mjs */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
const akar = new URL("../../", import.meta.url).pathname;
const baca = p => fs.readFileSync(path.join(akar, p), "utf8");
const muat = p => { const m = {exports: {}}; new Function("module", baca(p))(m); return m.exports; };
const PK = muat("public/inti/perlakuan.js");

test("pareto: tak ada anggota front yang dikalahkan baris mana pun; yang bukan front memang dikalahkan; front urut biaya, manfaat naik", () => {
  const u = PK.undian(7, 40, 2), b = u.map((x, i) => ({nama: "o" + i, selamat: Math.round(x[0] * 1000), biaya: Math.round(x[1] * 1000)}));
  const dasar = {nama: "dasar", selamat: 0, biaya: 0}; b.unshift(dasar); PK.tandaiPareto(b);
  const kalah = (c, p) => c !== p && c.selamat >= p.selamat && c.biaya <= p.biaya && (c.selamat > p.selamat || c.biaya < p.biaya);
  for (const p of b.filter(x => x.pareto)) assert.ok(!b.some(c => kalah(c, p)), `${p.nama} (${p.selamat}, ${p.biaya}) dikalahkan`);
  for (const x of b.filter(y => !y.pareto)) assert.ok(b.some(c => kalah(c, x)), `${x.nama} bukan pareto tapi tak dikalahkan siapa pun`);
  const f = PK.front(b, dasar); assert.ok(f.length >= 1);
  for (let i = 1; i < f.length; i++) assert.ok(f[i].biaya >= f[i - 1].biaya && f[i].selamat > f[i - 1].selamat - 1e-9, "front harus urut biaya dan manfaat naik");
});

test("bilangan acak bersama: biji sama = undian identik; semua opsi memakai undian yang sama; biji beda = beda", () => {
  assert.deepEqual(PK.undian(3, 20, 4), PK.undian(3, 20, 4));
  assert.notDeepEqual(PK.undian(3, 20, 4), PK.undian(4, 20, 4));
  const lihat = [], opsi = [{nama: "a"}, {nama: "b"}, {nama: "c"}];
  PK.kestabilan(opsi, (o, u) => { lihat.push([o.nama, u]); return {selamat: 1, biaya: 1}; }, {biji: 5, n: 10, dim: 3});
  const per = n => lihat.filter(x => x[0] === n).map(x => x[1]);
  assert.deepEqual(per("a"), per("b")); assert.deepEqual(per("b"), per("c"));
  assert.equal(per("a").length, 10);
});

test("kestabilan: deterministik untuk biji sama; opsi yang selalu dikalahkan tak pernah naik peringkat", () => {
  const opsi = [{nama: "murah", k: 1}, {nama: "mahal", k: 3}, {nama: "kalah", k: 3}];
  const hitung = (o, u) => o.nama === "kalah" ? {selamat: 5, biaya: 100} : {selamat: (10 + 10 * u[0]) * o.k, biaya: 10 * o.k};
  const a = PK.kestabilan(opsi, hitung, {biji: 9, n: 50, dim: 2}), b = PK.kestabilan(opsi, hitung, {biji: 9, n: 50, dim: 2});
  assert.deepEqual(a, b, "biji sama harus hasil identik");
  assert.equal(a[2].rank_rata, 3, `rata peringkat opsi yang selalu kalah ${a[2].rank_rata}, harus 3`);
  assert.equal(a[2].p_pareto, 0);
  assert.ok(a[0].rank_rata <= a[1].rank_rata, `rata peringkat ${a[0].rank_rata} vs ${a[1].rank_rata}`);
  for (const x of a) assert.ok(x.p_teratas >= 0 && x.p_teratas <= 1 && x.selamat.p10 <= x.selamat.med && x.selamat.med <= x.selamat.p90);
});

/* ---------- ratchet: salinan mesin peringkat di luar inti ---------- */
const BATAS_SALINAN = 3;   /* naik = pelanggaran; turun = kemajuan, perkecil angka ini saat entri dihapus */
const fx = JSON.parse(baca("tests/agen/fixtures/perlakuan_salinan.json"));
const POLA_DOMINASI = /\.pareto\s*=[^=]/;   /* penanda dominasi pareto yang dulu ditulis tangan di gunungapi/sim_tanggap.js */
function jalan(d, hasil = []) { for (const e of fs.readdirSync(path.join(akar, d), {withFileTypes: true})) { const r = d + "/" + e.name;
  if (e.isDirectory()) { if (e.name !== "vendor" && e.name !== "node_modules") jalan(r, hasil); } else if (/\.js$/.test(e.name)) hasil.push(r); } return hasil; }

test("ratchet salinan: daftar hanya menyusut, tiap berkas masih ada", () => {
  assert.ok(fx.salinan.length <= BATAS_SALINAN, `${fx.salinan.length} salinan tercatat, batas ${BATAS_SALINAN}: daftar tak boleh bertambah`);
  for (const s of fx.salinan) assert.ok(fs.existsSync(path.join(akar, s.berkas)), `${s.berkas} tercatat sebagai salinan tapi tidak ada: hapus entrinya dari perlakuan_salinan.json`);
});
test("tak ada salinan baru pola dominasi pareto di luar public/inti", () => {
  const tercatat = new Set(fx.salinan.map(s => s.berkas));
  const salah = jalan("public").filter(f => !f.startsWith("public/inti/") && !tercatat.has(f) && POLA_DOMINASI.test(baca(f)));
  assert.deepEqual(salah, [], `pola ".pareto =" di luar inti: pakai Perlakuan.tandaiPareto dari public/inti/perlakuan.js (${salah.join(", ")})`);
  assert.ok(POLA_DOMINASI.test("b.pareto = !x"), "pola penjaga harus mengenali penulisan lama");
});
test("pemakai mesin inti: gunung api dan gempa memanggil Perlakuan, bukan salinan", () => {
  assert.match(baca("public/gunungapi/sim_tanggap.js"), /tandaiPareto/); assert.match(baca("public/gempa/tanggap.js"), /tandaiPareto/);
});
