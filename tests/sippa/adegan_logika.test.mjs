/* SP-049: logika murni layar 3D (RU §2.3 D1): komponen tidak saling tumpuk, profil tekanan = hidraulika(), front basah monoton,
   kedalaman di atas batas ditolak. Tanpa DOM dan tanpa WebGL; runtime three dibuktikan di peramban (RU §2.3 D2, D3). */
import test from "node:test";
import assert from "node:assert/strict";
import {INFO_KOMPONEN, kelompokKomponen, tataKomponen, profilWarna, frontBasah, cekKedalaman, kelasTekanan, angkaPanel, profilTrase, dariKompleks, SKALA_TEKANAN, LUBANG_M} from "../../public/pipa/adegan.js";
import {hidraulika, KONST, saranSarana} from "../../public/pipa/hitung.js";

const tumpuk = (a, b) => ["x", "y", "z"].every((s, i) => {
  const d = ["lebar", "tinggi", "dalam"][i];
  return Math.abs(a[s] - b[s]) < (a[d] + b[d]) / 2 - 1e-9;
});

test("tataKomponen: tiga kotak tidak saling tumpuk untuk 1, 8, dan 16 lance", () => {
  for (const n of [1, 8, 16]) {
    const k = tataKomponen(n), tabrak = [];
    for (let i = 0; i < k.length; i++) for (let j = i + 1; j < k.length; j++) if (tumpuk(k[i], k[j])) tabrak.push(`${k[i].id} x ${k[j].id}`);
    assert.deepEqual(tabrak, [], `${tabrak.length} pasangan saling tumpuk pada ${n} lance: ${tabrak.join(", ")}`);
  }
});

test("tataKomponen: setiap kode BOM rantai relay muncul, lance sejumlah masukan, kotak berukuran positif di atas tanah", () => {
  const k = tataKomponen(8), kode = new Set(k.map(x => x.kode_bom));
  for (const w of ["ST-101", "P-101", "P-102", "SF-101", "V-101", "FT-101", "PT-101", "H-101", "M-101", "H-201", "I-101", "U-102"]) assert.ok(kode.has(w), `kode ${w} tidak ada`);
  assert.equal(k.filter(x => x.kode_bom === "I-101").length, 8);
  assert.equal(new Set(k.map(x => x.id)).size, k.length, "id komponen harus unik");
  for (const x of k) { assert.ok(x.lebar > 0 && x.tinggi > 0 && x.dalam > 0, `${x.id} berukuran nol`); assert.ok(Math.abs(x.y - x.tinggi / 2) < 1e-9, `${x.id} melayang atau tenggelam`); }
});

test("tataKomponen: jumlah lance bukan bilangan bulat positif ditolak", () => {
  for (const n of [0, -1, 2.5, NaN, "8"]) assert.throws(() => tataKomponen(n), RangeError, `n=${n} harus ditolak`);
});

test("profilWarna: tekanan tiap segmen 50 m sama dengan hidraulika().profil", () => {
  const h = hidraulika({L_m: 1000});
  const s = profilWarna(h);
  assert.equal(s.length, h.profil.length - 1);
  s.forEach((g, i) => {
    assert.equal(g.p_awal, h.profil[i].p_bar); assert.equal(g.p_akhir, h.profil[i + 1].p_bar);
    assert.equal(g.x0, h.profil[i].x_m); assert.equal(g.x1, h.profil[i + 1].x_m);
  });
  assert.equal(s.at(-1).x1, 1000);
});

test("profilWarna: merah bila melewati batas kerja atau di bawah 2 bar, hijau-biru bila di dalam rentang", () => {
  const baik = profilWarna(hidraulika({L_m: 500, q_lpm: 300}));
  assert.ok(baik.every(g => !g.merah), "kasus bawaan 500 m tidak boleh bertanda merah");
  const lebih = hidraulika({L_m: 2000, q_lpm: 2000, bahan: "hdpe", od_mm: 160, sdr: 11, dz_m: 10, sisa_bar: 2, hisap: false, n_lance: 8, serap_lain_lpm: 1700});
  assert.ok(lebih.p_pompa_bar > lebih.p_batas_bar, "fixture harus melewati batas kerja");
  assert.ok(profilWarna(lebih)[0].merah, "segmen pertama melewati batas harus merah");
  const rendah = {profil: [{x_m: 0, p_bar: 3}, {x_m: 50, p_bar: 1.2}], p_batas_bar: 11};
  assert.equal(profilWarna(rendah)[0].merah, true); assert.equal(profilWarna(rendah)[0].kelas, 0);
});

test("kelasTekanan: pita naik menurut tekanan, di bawah 2 bar dan di atas batas = kelas merah 0 dan terakhir", () => {
  assert.equal(kelasTekanan(1.99, 11), 0); assert.equal(kelasTekanan(2, 11), 1);
  assert.ok(kelasTekanan(5, 11) > kelasTekanan(2.5, 11));
  assert.equal(kelasTekanan(3.99, 11), 1); assert.equal(kelasTekanan(4, 11), 2); assert.equal(kelasTekanan(5.99, 11), 2); assert.equal(kelasTekanan(6, 11), 3);
  assert.equal(kelasTekanan(11.01, 11), SKALA_TEKANAN.length - 1);
  assert.throws(() => kelasTekanan(NaN, 11), RangeError);
});

test("frontBasah: r = akar(Q t / (pi h ne)), nol di t = 0, monoton naik terhadap waktu", () => {
  assert.equal(frontBasah(0, 0.67, 0.5), 0);
  const Q = 40 / 60, h = 0.5, ne = 0.5, t = 600;
  const harapan = Math.sqrt((Q / 1000) * t / (Math.PI * h * ne));
  assert.ok(Math.abs(frontBasah(t, Q, h, ne) - harapan) < 1e-12);
  let sebelum = -1;
  for (let s = 0; s <= 7200; s += 60) { const r = frontBasah(s, Q, h, ne); assert.ok(r >= sebelum, `turun di t=${s}: ${r} < ${sebelum}`); sebelum = r; }
  assert.ok(frontBasah(3600, Q, h) > frontBasah(60, Q, h), "porositas bawaan 0,5 dipakai bila tidak diisi");
});

test("frontBasah: waktu negatif, panjang lubang dan porositas tidak positif ditolak", () => {
  assert.throws(() => frontBasah(-1, 1, 0.5), RangeError);
  assert.throws(() => frontBasah(1, 1, 0), RangeError);
  assert.throws(() => frontBasah(1, 1, 0.5, 0), RangeError);
  assert.throws(() => frontBasah(1, 1, 0.5, 1.2), RangeError);
  assert.throws(() => frontBasah(NaN, 1, 0.5), RangeError);
  assert.ok(LUBANG_M > 0);
});

test("cekKedalaman: tepat batas lolos, melewati batas, negatif, dan bukan angka ditolak dengan angkanya", () => {
  assert.equal(cekKedalaman(0), 0); assert.equal(cekKedalaman(1.5), 1.5); assert.equal(cekKedalaman(KONST.dalam_maks_m), KONST.dalam_maks_m);
  assert.throws(() => cekKedalaman(KONST.dalam_maks_m + 0.1), e => e instanceof RangeError && /5,1/.test(e.message));
  for (const m of [-0.1, NaN, Infinity, "2", null]) assert.throws(() => cekKedalaman(m), RangeError, `${m} harus ditolak`);
});

test("angkaPanel: angka panel teks sama dengan hasil hidraulika, kartu melewati batas ditandai", () => {
  const h = hidraulika({L_m: 1000});
  const a = Object.fromEntries(angkaPanel(h).map(x => [x.kunci, x]));
  assert.equal(a.p_pompa.nilai, h.p_pompa_bar); assert.equal(a.p_ujung.nilai, h.p_ujung_bar); assert.equal(a.t_tiba.nilai, h.t_tiba_menit);
  assert.equal(a.v.nilai, h.v_ms); assert.equal(a.tdh.nilai, h.tdh_m); assert.equal(a.vonis.nilai, h.vonis);
  assert.equal(a.p_pompa.banding, h.p_batas_bar);
  const rusak = hidraulika({L_m: 2000, q_lpm: 2000, bahan: "hdpe", od_mm: 160, sdr: 11, dz_m: 10, sisa_bar: 2, hisap: false, n_lance: 8, serap_lain_lpm: 1700});
  assert.equal(Object.fromEntries(angkaPanel(rusak).map(x => [x.kunci, x])).p_pompa.lewat, true);
  assert.equal(a.p_pompa.lewat, false);
});

test("profilTrase: tiga titik air, tengah linear, kompleks; tanpa kompleks null", () => {
  const p = profilTrase({elev_air_m: 13, elev_kompleks_m: 25.5}, 1000);
  assert.deepEqual(p, [{x_m: 0, z_m: 13}, {x_m: 500, z_m: 19.25}, {x_m: 1000, z_m: 25.5}]);
  assert.equal(profilTrase(null, 1000), null);
  assert.equal(profilTrase({elev_air_m: null, elev_kompleks_m: 3}, 1000), null);
});

test("kelompokKomponen dan INFO_KOMPONEN: tiap kode di adegan punya info dan kelompok warna, awalan liar jatuh ke hidrolik", () => {
  for (const b of tataKomponen(3)) { assert.ok(INFO_KOMPONEN[b.kode_bom], `${b.kode_bom} tanpa info`); assert.ok(["pompa", "hidrolik", "sensor", "lance"].includes(kelompokKomponen(b.kode_bom)), `${b.kode_bom} tanpa kelompok`); }
  assert.equal(kelompokKomponen("P-101"), "pompa"); assert.equal(kelompokKomponen("I-101"), "lance"); assert.equal(kelompokKomponen("ZZ-9"), "hidrolik");
});

test("dariKompleks: panjang = jarak air x liku 1,2 sama dengan saranSarana().tautan_hitung.L_m, Δz = elevasi kompleks dikurangi elevasi air, air kosong null", () => {
  assert.deepEqual(dariKompleks({air_km_lama: 1.31, elev_air_m: 13, elev_kompleks_m: 25.5}), {air_km: 1.31, L_m: 1572, dz_m: 12.5});
  assert.equal(dariKompleks({air_km_lama: 1.31}).L_m, saranSarana({air_km_lama: 1.31}, "k", false).tautan_hitung.L_m);
  assert.equal(dariKompleks({air_km_lama: null, air_km_semua: 0.01}).L_m, 12, "tanpa minimal baru");
  assert.equal(dariKompleks({air_km_lama: 2, elev_air_m: null, elev_kompleks_m: 4}).dz_m, null);
  assert.equal(dariKompleks({air_km_lama: null, air_km_semua: null}), null); assert.equal(dariKompleks(null), null);
});
