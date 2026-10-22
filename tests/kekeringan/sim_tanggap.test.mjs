/* Uji lapis tanggap, dampak padi, dan peringkat perlakuan simulasi kekeringan (public/kekeringan/sim_tanggap.js, simulasi.js, data/tutupan.json).
   node --test tests/kekeringan/sim_tanggap.test.mjs */
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const baca = f => readFileSync(new URL("../../public/kekeringan/" + f, import.meta.url), "utf8");
const muat = f => { const m = {exports: {}}; new Function("module", baca(f))(m); return m.exports; };
const T = muat("sim_tanggap.js"), S = muat("simulasi.js");
const json = f => JSON.parse(readFileSync(new URL("../../public/" + f, import.meta.url), "utf8"));

test("rit tangki: makin jauh makin sedikit; di luar jam kerja nol; kapasitas dan jiwa terlayani tak melebihi batas", () => {
  assert.ok(T.ritPerHari(T.tempuhJam(10)) > T.ritPerHari(T.tempuhJam(100)), "pangkalan dekat harus lebih banyak rit");
  assert.equal(T.ritPerHari(6), 0, "tempuh 6 jam sekali jalan: tak ada putaran utuh dalam 10 jam kerja");
  const p = T.pangkalanTerdekat(-3.75, 119.75, [{nama: "jauh", lat: -3.75, lon: 123}, {nama: "dekat", lat: -3.6, lon: 119.8}], 2);
  assert.equal(p[0].nama, "dekat"); assert.ok(p[0].km >= T.ASUMSI.jarak_dalam_sel_km, "jarak minimal dalam sel");
  const k2 = T.kapasitasTangki(p, 2), k10 = T.kapasitasTangki(p, 10);
  assert.ok(k2 > 0 && Math.abs(k10 - 5 * k2) < 1e-6, `kapasitas harus linear dalam jumlah truk: ${k2} vs ${k10}`);
  assert.equal(T.jiwaTerlayani(1000, 1e9), 1000, "tidak melayani lebih dari jiwa yang butuh");
  assert.equal(T.jiwaTerlayani(1e6, 15 * 400), 400);
});

test("urutkan: kunci padi, jiwa, biaya", () => {
  const k = [{padiHa: 5, jiwa: 0, biaya: 9}, {padiHa: 0, jiwa: 70, biaya: 3}, {padiHa: 9, jiwa: 0, biaya: 20}];
  assert.deepEqual(T.urutkan(k, "padi").map(x => x.padiHa), [9, 5, 0]);
  assert.equal(T.urutkan(k, "jiwa")[0].jiwa, 70);
  assert.equal(T.urutkan(k, "biaya")[0].biaya, 3);
});

/* Dua sel sintetis: sel 0 dengan padi 1.000 ha dan kebun 200 ha, sel 1 tanpa sawah. hujanMg = mm per minggu di kedua sel. */
const P = {p: .2, fase: [30, 30, 60, 30], kc: [1.05, 1.2, .9], kc_bera: .5, ambang_berat: .5, zr: .5};
const mini = hujanMg => {
  const D = {n: 2, lat: [0, 0.5], lon: [100, 100], taw: [65, 65], dr0: [0, 0], jiwa: [10000, 500], km2: [3098, 3098], sawah: [1000, 0], kebun: [200, 0], param: P};
  const sk = {int: 15, hujan: [Array(26).fill(hujanMg), Array(26).fill(hujanMg)], et0: [[5], [5]]};
  return {D, sk, hj: S.hujanHarian(D, sk)};
};
const pang = [{nama: "BPBD A", lat: 0.2, lon: 100, km: 25, tJam: 0.875, rit: 3}];
const jalan = (m, tanam = 0) => { const {D, sk, hj} = mini(m); return S.evaluasi(T, D, sk, hj, [0, 1], {tanam, pangkalan: pang}); };

test("dampak padi: kemarau tanpa hujan menghilangkan hasil; pompa dan tanam awal mengurangi; peringkat konsisten", () => {
  const E = jalan(0);
  assert.ok(E.dasar.hilang > 900, `1000 ha tanpa setetes hujan harus hilang hampir seluruhnya, dapat ${E.dasar.hilang}`);
  assert.ok(E.dasar.puso >= 1000 && E.dasar.kebunPuncak === 200, `puso ${E.dasar.puso}, kebun ${E.dasar.kebunPuncak}`);
  const per = Object.fromEntries(E.kand.map(k => [k.id, k]));
  assert.ok(per.p60.padiHa >= per.p20.padiHa && per.p20.padiHa > 0, `lebih banyak pompa tak boleh menyelamatkan lebih sedikit: ${per.p20.padiHa} vs ${per.p60.padiHa}`);
  assert.ok(per.t10.jiwa >= per.t2.jiwa && per.t2.jiwa > 0 && per.t10.jiwa <= E.dasar.jiwaPuncak, "tangki: monoton dan dibatasi jiwa yang butuh");
  assert.equal(per.t2.padiHa, 0, "truk tangki tidak menyelamatkan padi"); assert.equal(per.s10.padiHa, 0);
  assert.ok(per.p20.biaya > 0 && per.omc.biaya === 5 * T.ASUMSI.omc_rp_hari, "biaya hujan buatan = 5 hari × tarif");
  for (const k of E.kand) assert.ok(k.padiHa <= E.dasar.hilang + 1e-6, `${k.id} menyelamatkan ${k.padiHa} ha > yang hilang ${E.dasar.hilang}`);
});

test("jiwa rentan: tak pernah melebihi penduduk × porsi rentan; hujan menghapusnya; butuh N hari kering berturut-turut", () => {
  const {D, sk, hj} = mini(0), idx = [0, 1], penuh = S.dampak(D, S.jalankan(D, sk, hj, {tanam: 0, laju: 0, kap: 0, omc: 0}, idx), idx);
  assert.ok(penuh.jiwaPuncak <= 10500 + 1e-6, `jiwaPuncak ${penuh.jiwaPuncak} > penduduk 10.500`);
  const D2 = {...D, rentan: [0.2, 0.2]}, r2 = S.dampak(D2, S.jalankan(D2, sk, hj, {tanam: 0, laju: 0, kap: 0, omc: 0}, idx), idx);
  assert.ok(r2.jiwaPuncak <= 0.2 * 10500 + 1e-6 && Math.abs(r2.jiwaPuncak - 0.2 * penuh.jiwaPuncak) < 1e-6, `porsi 20%: ${r2.jiwaPuncak} vs ${penuh.jiwaPuncak}`);
  const b = mini(400), basah = S.dampak(b.D, S.jalankan(b.D, b.sk, b.hj, {tanam: 0, laju: 0, kap: 0, omc: 0}, idx), idx);
  assert.equal(basah.jiwaPuncak, 0, "hujan 400 mm/minggu: tanah tak pernah stres, tak ada jiwa rentan");
  const D3 = {...D, nKering: 400}, r3 = S.dampak(D3, S.jalankan(D3, sk, hj, {tanam: 0, laju: 0, kap: 0, omc: 0}, idx), idx);
  assert.equal(r3.jiwaPuncak, 0, "N lebih panjang dari simulasi: tak pernah terpenuhi");
  assert.ok(penuh.hariKrisis > 0 && penuh.hariKrisis <= S.H);
});

test("dampak padi: hujan cukup hampir tidak menghilangkan padi", () => {
  const basah = jalan(400), kering = jalan(0);
  assert.ok(basah.dasar.hilang < 0.05 * kering.dasar.hilang, `hujan 400 mm/minggu: hilang ${basah.dasar.hilang} ha, seharusnya jauh di bawah ${kering.dasar.hilang}`);
});

test("pita anggota: p10 (kering) merugikan paling besar, p90 (basah) paling kecil; tanpa anggota -> null", () => {
  const {D, sk} = mini(0), w = m => Array.from({length: 2}, () => Array(26).fill(m));
  assert.equal(S.pita(T, D, sk, [0, 1], {tanam: 0, pangkalan: pang}), null);
  const b = S.pita(T, D, {...sk, anggota: {p10: w(0), p50: w(60), p90: w(400)}}, [0, 1], {tanam: 0, pangkalan: pang});
  assert.ok(b.hilang[0] < b.hilang[1], `rentang padi hilang harus melebar: ${b.hilang}`);
  assert.ok(b.hilang[1] > 900 && b.hilang[0] < 0.05 * b.hilang[1], `anggota 0 mm hilang hampir semua, 400 mm/minggu hampir tidak: ${b.hilang}`);
  assert.ok(b.kand.p20[1] >= b.kand.p20[0] && Object.keys(b.kand).length === 8);
});

test("data nyata: tutupan selaras dengan neraca, jumlah sawah = acuan nasional, peringkat berjalan", () => {
  const n = json("data/kekeringan_neraca.json"), t = json("kekeringan/data/tutupan.json"), c = n.sel_data;
  assert.deepEqual(t.lat, c.lat); assert.deepEqual(t.lon, c.lon);
  const tot = t.sawah.reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(tot - t.lbs_ha) / t.lbs_ha < 1e-3, `jumlah sawah ${tot} ≠ acuan ${t.lbs_ha}`);
  for (let i = 0; i < t.lat.length; i++) assert.ok(t.sawah[i] >= 0 && t.hutan[i] + t.sawit[i] + t.hti[i] + t.tambang[i] <= t.darat[i] * 1.001 + 1, `sel ${i}: kelas melebihi daratan`);
  const D = {...c, n: c.lat.length, param: n.param, sawah: t.sawah, kebun: t.sawit.map((v, i) => v + t.hti[i]), km2: c.lat.map(la => 3098 * Math.cos(la * Math.PI / 180))};
  const sk = n.skenario.ecmwf || n.skenario.nino, hj = S.hujanHarian(D, sk), i0 = c.lat.findIndex((la, i) => la === -3.75 && c.lon[i] === 119.75);
  assert.ok(i0 >= 0, "sel bawaan uji tidak ada di kisi");
  const idx = S.fokusSel(D, i0, 1); assert.ok(idx.length >= 4 && idx.length <= 25, `kawasan ${idx.length} sel`);
  const E = S.evaluasi(T, D, sk, hj, idx, {tanam: n.mulai.hariini.tanam, pangkalan: pang});
  assert.ok(E.dasar.sawah > 0 && E.dasar.hilang >= 0 && E.dasar.hilang <= E.dasar.sawah, `hilang ${E.dasar.hilang} dari sawah ${E.dasar.sawah}`);
  assert.equal(E.kand.length, 8);
});
