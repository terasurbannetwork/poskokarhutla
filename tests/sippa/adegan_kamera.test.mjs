/* Adegan 3D yang dibangun ulang (meniru simulasi): bagian murni tanpa DOM dan tanpa WebGL.
   Parameter adegan dari masukan kalkulator (trase = L_m kalkulator), kamera tiap mode, linimasa, batang skala, label = angka panel,
   dan pembebasan sumber daya GPU (dispose). Runtime three dibuktikan di peramban preview. */
import test from "node:test";
import assert from "node:assert/strict";
import {SKALA_JALUR, SEGMEN_MAKS_ANIMASI, titikJalur, kedalamanPenampang, pusatBulb, JARAK_LANCE_M, lebarPenampang, tandaKedalaman, rentangWaktu, waktuStatis, majuWaktu, waktuTampil, KECEPATAN, KAMERA_MODE, kameraMode, easeKeluar, batangSkala, teksJarak, labelAdegan, reliefTanah, bebaskan, tataKomponen, LUBANG_M} from "../../public/pipa/adegan.js";
import {hidraulika, KONST} from "../../public/pipa/hitung.js";

const id = n => Number(n).toLocaleString("id-ID", {maximumFractionDigits: 1});
const P = {q_lpm: 300, L_m: 1000, dz_m: 2, n_lance: 8, dalam_m: 1.5, dn_mm: 100};
const hit = (p = P) => hidraulika({...p, dz_sumber: "masukan", n_pompa: 1});

test("titikJalur: panjang trase di adegan = L_m kalkulator untuk beberapa masukan, ujung selalu di SKALA_JALUR", () => {
  for (const L_m of [100, 500, 1000, 1572, 5000]) {
    const p = {...P, L_m}, h = hit(p), t = titikJalur(p, h, null);
    assert.equal(t.L, h.profil.at(-1).x_m, `L ${L_m}: panjang adegan beda dari profil kalkulator`);
    assert.equal(t.L, L_m, `L ${L_m}: panjang adegan bukan masukan`);
    assert.ok(Math.abs(t.pos(t.L)[0] - SKALA_JALUR) < 1e-9, `L ${L_m}: ujung trase di ${t.pos(t.L)[0]} bukan ${SKALA_JALUR}`);
    assert.ok(Math.abs(t.esk * t.L - SKALA_JALUR) < 1e-9);
  }
});

test("titikJalur: tinggi dari beda elevasi masukan (lurus), tegak dilebihkan atau diperkecil, kompleks tak cocok diabaikan", () => {
  const h = hit(), t = titikJalur(P, h, null);
  assert.equal(t.pos(0)[1], 0); assert.ok(Math.abs(t.pos(P.L_m)[1] - P.dz_m * t.skalaY) < 1e-9);
  assert.ok(t.tinggiDi(P.L_m / 2) > 0 && t.tinggiDi(P.L_m / 2) < t.tinggiDi(P.L_m), "naik monoton untuk dz positif");
  const turun = titikJalur({...P, dz_m: -4}, hit({...P, dz_m: -4}), null);
  assert.ok(turun.tinggiDi(P.L_m) < 0, "dz negatif turun");
  assert.equal(t.terKompleks, false);
  const k = {elev_air_m: 13, elev_kompleks_m: 25.5};
  assert.equal(titikJalur({...P, dz_m: 12.5}, hit({...P, dz_m: 12.5}), k).terKompleks, true, "dz sama dengan profil kompleks memakai profil kompleks");
  assert.equal(titikJalur({...P, dz_m: 3}, hit({...P, dz_m: 3}), k).terKompleks, false, "dz dari kontrol berbeda dari kompleks: garis lurus");
  const tegak = titikJalur({...P, dz_m: 50}, hit({...P, dz_m: 50}), null);
  assert.ok(Math.abs(tegak.pos(P.L_m)[1]) <= 6 + 1e-9, "tinggi adegan dibatasi 6 satuan");
  assert.ok(titikJalur({...P, dz_m: 0}, hit({...P, dz_m: 0}), null).tinggiDi(500) === 0);
});

test("penampang injeksi: kedalaman gambar, pusat bola, lebar mengikuti jumlah lance dan kedalaman masukan", () => {
  for (const d of [0, 0.5, 1.5, 3, KONST.dalam_maks_m]) {
    assert.ok(kedalamanPenampang(d) >= d + 1.5 - 1e-9 && kedalamanPenampang(d) >= 2, `kedalaman gambar ${kedalamanPenampang(d)} untuk lance ${d}`);
    assert.ok(pusatBulb(d) > 0 && pusatBulb(d) <= Math.max(d, 0.15), `pusat bola ${pusatBulb(d)} di luar rentang untuk lance ${d}`);
  }
  assert.equal(pusatBulb(1.5), 1.5 - LUBANG_M / 2);
  let sebelum = 0; for (let n = 1; n <= 16; n++) { const w = lebarPenampang(n); assert.ok(w >= 6 && w >= sebelum, `lebar turun di n=${n}`); sebelum = w; }
  assert.ok(lebarPenampang(16) >= (16 - 1) * JARAK_LANCE_M, "16 lance muat dalam lebar");
  assert.deepEqual(tandaKedalaman(1.5), [0, 0.5, 1, 1.5]); assert.deepEqual(tandaKedalaman(0), [0, 0.5, 1, 1.5]);
  assert.deepEqual(tandaKedalaman(2.2).at(-1), 2.5); assert.equal(tandaKedalaman(KONST.dalam_maks_m).at(-1), KONST.dalam_maks_m);
});

test("jumlah lance masukan menentukan jumlah komponen lance di adegan susunan", () => {
  for (const n of [1, 4, 8, 16]) assert.equal(tataKomponen(n).filter(b => b.kode_bom === "I-101").length, n);
});

test("kameraMode: delapan sudut kotak pembatas selalu muat di bingkai untuk tiap mode dan rasio layar", () => {
  const bing = {pusat: [3, 1, -2], setengah: [30, 4, 10]};
  for (const mode of Object.keys(KAMERA_MODE)) for (const aspek of [0.55, 1.17, 2.1]) {
    const K = kameraMode(mode, bing, aspek, 38), d = K.posisi.map((v, i) => (v - K.target[i]) / K.jarak), tv = Math.tan(38 * Math.PI / 360), th = tv * aspek;
    assert.ok(Math.abs(Math.hypot(...d) - 1) < 1e-9, "arah ternormalisasi");
    const f = d.map(v => -v), r0 = [-f[2], 0, f[0]], rn = Math.hypot(...r0), r = r0.map(v => v / rn), u = [r[1] * f[2] - r[2] * f[1], r[2] * f[0] - r[0] * f[2], r[0] * f[1] - r[1] * f[0]];
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) {
      const c = [sx * 30, sy * 4, sz * 10], dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], kedalaman = K.jarak - dot(c, d);
      assert.ok(kedalaman > 0, `${mode} aspek ${aspek}: sudut di belakang kamera (${kedalaman})`);
      assert.ok(Math.abs(dot(c, r)) <= kedalaman * th + 1e-9, `${mode} aspek ${aspek}: sudut keluar kiri/kanan`);
      assert.ok(Math.abs(dot(c, u)) <= kedalaman * tv + 1e-9, `${mode} aspek ${aspek}: sudut keluar atas/bawah`);
    }
    assert.ok(K.minJarak < K.jarak && K.jarak < K.maksJarak);
  }
});

test("kameraMode: tiap mode punya sudut pandang berbeda, hanya injeksi membatasi azimut, mode tak dikenal ditolak", () => {
  const bing = {pusat: [0, 0, 0], setengah: [10, 3, 5]}, K = Object.fromEntries(Object.keys(KAMERA_MODE).map(m => [m, kameraMode(m, bing, 1.2, 38)]));
  const arah = m => K[m].posisi.map(v => Math.round(v / K[m].jarak * 100));
  assert.notDeepEqual(arah("susunan"), arah("jalur")); assert.notDeepEqual(arah("jalur"), arah("injeksi")); assert.notDeepEqual(arah("susunan"), arah("injeksi"));
  assert.ok(K.injeksi.azimut > 0 && K.susunan.azimut === 0 && K.jalur.azimut === 0, "penampang injeksi hanya dilihat dari depan");
  assert.ok(K.injeksi.posisi[1] < K.susunan.posisi[1], "injeksi lebih rendah dari susunan (muka penampang)");
  assert.throws(() => kameraMode("lain", bing, 1, 38), RangeError);
});

test("linimasa: rentang per mode, bingkai diam, maju waktu mengulang dan tahan di ujung", () => {
  const h = hit();
  const j = rentangWaktu("jalur", h), i = rentangWaktu("injeksi", h), s = rentangWaktu("susunan", h);
  assert.equal(j.maks, Math.ceil(h.t_tiba_menit) + 3); assert.equal(j.tiba, h.t_tiba_menit);
  assert.equal(i.maks, SEGMEN_MAKS_ANIMASI); assert.equal(s.ada, false);
  assert.equal(waktuStatis("jalur", j), j.maks, "diam: jalur terisi penuh"); assert.equal(waktuStatis("injeksi", i), 18); assert.equal(waktuStatis("susunan", s), 0);
  assert.equal(majuWaktu(0, 1, 1, 30), 1); assert.equal(majuWaktu(0, 1, 2, 30), 2, "kecepatan 2x"); assert.equal(majuWaktu(0, 1, 0.5, 30), 0.5);
  assert.equal(majuWaktu(29.5, 1, 1, 30), 30.5, "tahan melewati ujung"); assert.equal(majuWaktu(32.9, 0.2, 1, 30), 0, "ulang dari nol sesudah jeda 3 menit");
  assert.ok(majuWaktu(5, 1, 1, 0) > 5, "tanpa rentang: waktu jalan terus");
  let t = 0; for (let k = 0; k < 200; k++) { const n = majuWaktu(t, 0.1, 1, 30); assert.ok(n >= t || n === 0, `waktu mundur di langkah ${k}`); t = n; }
  assert.equal(waktuTampil(31.2, 30), 30); assert.equal(waktuTampil(12, 30), 12); assert.equal(waktuTampil(7, 0), 7);
  assert.deepEqual([...KECEPATAN].sort((a, b) => a - b), [...KECEPATAN]); assert.ok(KECEPATAN.includes(1));
  assert.equal(easeKeluar(0), 0); assert.equal(easeKeluar(1), 1); assert.ok(easeKeluar(0.5) > 0.5 && easeKeluar(2) === 1 && easeKeluar(-1) === 0);
});

test("batangSkala: panjang bulat 1, 2, 5 kali sepuluh pangkat n yang muat, lebar piksel sesuai skala", () => {
  for (const [mpp, maks] of [[0.01, 180], [0.0173, 200], [1.3, 150], [17, 180], [0.5, 90], [2, 100]]) {
    const b = batangSkala(mpp, maks), mantisa = b.meter / Math.pow(10, Math.floor(Math.log10(b.meter)));
    assert.ok([1, 2, 5].some(v => Math.abs(mantisa - v) < 1e-9), `${b.meter} bukan 1, 2, atau 5 kali 10^n`);
    assert.ok(b.piksel <= maks + 1e-9 && b.piksel > maks / 2.6, `piksel ${b.piksel} di luar (${maks / 2.6}, ${maks}]`);
    assert.ok(Math.abs(b.piksel * mpp - b.meter) < 1e-9);
  }
  assert.equal(batangSkala(0, 100), null); assert.equal(batangSkala(1, 0), null); assert.equal(batangSkala(NaN, 10), null);
  assert.equal(teksJarak(200), `${id(200)} m`); assert.equal(teksJarak(0.5), `${id(0.5)} m`); assert.equal(teksJarak(2000), `${id(2)} km`);
});

test("labelAdegan: angka label sama dengan hasil kalkulator dan masukan, id unik, tanpa karakter terlarang", () => {
  const h = hit(), semua = [];
  for (const m of ["susunan", "jalur", "injeksi"]) {
    const l = labelAdegan(m, h, P); semua.push(...l);
    assert.equal(new Set(l.map(x => x.id)).size, l.length, `${m}: id label ganda`);
    for (const x of l) assert.ok(x.judul.length > 0, `${m}/${x.id}: judul kosong`);
  }
  const teks = labelAdegan("jalur", h, P).map(x => `${x.judul} ${x.nilai}`).join(" | ");
  for (const angka of [h.p_pompa_bar, h.p_ujung_bar, h.t_tiba_menit, h.v_ms, h.tdh_m, P.L_m, P.dz_m]) assert.ok(teks.includes(id(angka)), `label jalur tanpa angka ${id(angka)}: ${teks}`);
  const sus = labelAdegan("susunan", h, P).map(x => `${x.judul} ${x.nilai}`).join(" | ");
  for (const angka of [h.p_pompa_bar, h.p_ujung_bar, P.n_lance, P.dz_m === 0 ? 0 : P.dalam_m]) assert.ok(sus.includes(id(angka)), `label susunan tanpa angka ${id(angka)}: ${sus}`);
  assert.ok(labelAdegan("jalur", hit({...P, dz_m: 0}), {...P, dz_m: 0}).every(x => x.id !== "dz"), "tanpa beda elevasi, tanpa label elevasi");
  assert.equal(labelAdegan("injeksi", h, P).filter(x => /^d\d+$/.test(x.id)).length, tandaKedalaman(P.dalam_m).length);
  const gabung = semua.map(x => x.judul + x.nilai).join("");
  assert.doesNotMatch(gabung, /[—·]|terbukti|titik api/i);
});

test("reliefTanah: deterministik dan terbatas di [-1, 1] di seluruh petak", () => {
  let mn = 9, mx = -9;
  for (let x = -40; x <= 120; x += 1.7) for (let z = -40; z <= 40; z += 1.3) { const v = reliefTanah(x, z); assert.equal(v, reliefTanah(x, z)); mn = Math.min(mn, v); mx = Math.max(mx, v); }
  assert.ok(mn >= -1 - 1e-9 && mx <= 1 + 1e-9, `relief di luar [-1, 1]: ${mn} sampai ${mx}`);
  assert.ok(mx - mn > 0.8, "relief tidak datar");
});

test("bebaskan: geometri dan bahan dibuang, bahan larik ikut, tekstur bersama (simpan) tidak dibuang", () => {
  const log = [], dis = nama => ({dispose: () => log.push(nama)});
  const kecil = {geometry: dis("g1"), material: Object.assign(dis("m1"), {map: dis("t1")})};
  const larik = {geometry: dis("g2"), material: [dis("m2a"), Object.assign(dis("m2b"), {map: Object.assign(dis("t2"), {userData: {simpan: true}})})]};
  const kosong = {};
  const akar = {traverse(f) { for (const o of [this, kecil, larik, kosong]) f(o); }};
  const n = bebaskan(akar);
  assert.deepEqual(log.sort(), ["g1", "g2", "m1", "m2a", "m2b", "t1"], `yang dibuang: ${log.join(",")}`);
  assert.deepEqual(n, {geometri: 2, bahan: 3, tekstur: 1});
  const dua = []; bebaskan({traverse(f) { f({geometry: {dispose: () => dua.push("g")}, material: {dispose: () => dua.push("m")}}); }});
  assert.deepEqual(dua, ["g", "m"], "bahan tanpa tekstur tetap dibuang");
});
