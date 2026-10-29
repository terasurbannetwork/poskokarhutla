/* keputusan 61: SP-104 kit siap gelar, SP-105/107 lampu titik panas, SP-111 tautan SWIR, SP-112 riwayat kompleks, SP-113 katalog alat.
   Fungsi murni tanpa DOM; MapLibre dan DOM dibuktikan di peramban. */
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync, existsSync} from "node:fs";

(0, eval)(readFileSync(new URL("../../public/inti/format.js", import.meta.url), "utf8").replace(/^"use strict";?/, "") + ";globalThis.fmt=fmt;globalThis.esc=esc;globalThis.jamWIB=jamWIB;");
const K = await import("../../public/pipa/kesiapan.js");
const A = await import("../../public/pipa/katalog_alat.js");
const P = await import("../../public/pipa/layar_peta.js");
const R = await import("../../public/pipa/layar_ringkas.js");
const teks = h => h.replace(/<[^>]*>/g, "");

const kit = (o = {}) => ({id: "0123456789abcdef", kode: "SIPPA-001", jenis: "gambut", status: "gudang", lokasi: "Palangka Raya", komponen_kurang: 0, ...o});
const komp = (o = {}) => [{kode_bom: "P-101", jumlah: 2, kondisi: "baik"}, {kode_bom: "H-101", jumlah: 1000, kondisi: "baik", ...o}];
const bbm = (...l) => l.map(([aksi, liter]) => ({jenis: "bensin", aksi, liter}));

test("saldoBbm dan perluBbm: terima dan kembali menambah, keluar mengurangi, tanpa baris bensin = null; 20 liter per pompa BOM", () => {
  assert.equal(K.saldoBbm([]), null);
  assert.equal(K.saldoBbm([{jenis: "solar", aksi: "terima", liter: 50}]), null, "solar bukan bensin pompa");
  assert.equal(K.saldoBbm(bbm(["terima", 100], ["keluar", 30], ["kembali", 5], ["koreksi", 999])), 75);
  assert.equal(K.perluBbm(komp()), 40);
  assert.equal(K.perluBbm([]), 20, "tanpa pompa di BOM tetap satu pompa");
});

test("kesiapanKit: siap hanya bila laik, lengkap, dan BBM cukup; BBM belum tercatat = belum siap, bukan karangan", () => {
  const rinci = bbmL => ({komponen: komp(), bbm: bbm(...bbmL)});
  assert.equal(K.kesiapanKit(kit(), rinci([["terima", 40]])).siap, true);
  const tanpaBbm = K.kesiapanKit(kit(), rinci([]));
  assert.deepEqual([tanpaBbm.bbm, tanpaBbm.siap], [null, false]);
  assert.equal(K.kesiapanKit(kit(), rinci([["terima", 39]])).bbm, false);
  const rusak = K.kesiapanKit(kit(), {komponen: komp({kode_bom: "H-101", kondisi: "rusak_berat"}), bbm: bbm(["terima", 99])});
  assert.deepEqual([rusak.laik, rusak.siap], [false, false], "K2 rusak berat tidak laik");
  assert.equal(K.kesiapanKit(kit({komponen_kurang: 2}), rinci([["terima", 99]])).siap, false, "komponen hilang = tidak lengkap");
  assert.equal(K.kesiapanKit(kit({status: "gelar"}), rinci([["terima", 99]])).siap, false, "kit digelar bukan siap gelar");
  assert.equal(K.kesiapanKit(kit({jenis: "banjir"}), rinci([["terima", 99]])).ditempat, false);
  assert.equal(K.kesiapanKit(kit(), null).laik, null, "tanpa rincian laik tidak diketahui");
});

test("ringkasDepot dan kesiapanHtml: satu baris per depot, BBM belum tercatat disebut, tanpa kit teks kosong", () => {
  const k2 = kit({id: "fedcba9876543210", kode: "SIPPA-002"}), k3 = kit({id: "aaaaaaaaaaaaaaaa", kode: "SIPPA-003", lokasi: "Kapuas", status: "depot"});
  const d = K.ringkasDepot([kit(), k2, k3, kit({id: "bbbbbbbbbbbbbbbb", status: "banjir"})], {[kit().id]: {komponen: komp(), bbm: bbm(["terima", 40])}, [k2.id]: {komponen: komp(), bbm: []}});
  assert.deepEqual(d.map(x => [x.depot, x.n, x.siap, x.bbmBelum]), [["Palangka Raya", 2, 1, 1], ["Kapuas", 1, 0, 1]]);
  const t = teks(K.kesiapanHtml(d));
  assert.match(t, /1 dari 3 kit siap gelar/); assert.match(t, /BBM belum tercatat 1/); assert.doesNotMatch(t, /toFixed|·|—/);
  assert.match(K.kesiapanHtml([]), /Belum ada kit gambut/);
});

test("muatRincian: hanya kit di depot dan berid sah, yang gagal dimuat tidak masuk", async () => {
  const dipanggil = [], ambil = async url => { dipanggil.push(url); if (url.includes("fedcba")) throw new Error("x"); return {komponen: komp(), bbm: []}; };
  const r = await K.muatRincian(ambil, [kit(), kit({id: "fedcba9876543210"}), kit({id: "cccccccccccccccc", status: "hilang"}), kit({id: "pendek"})], null);
  assert.deepEqual(Object.keys(r), ["0123456789abcdef"]); assert.equal(dipanggil.length, 2);
});

test("kartuKit: bagian kit siap gelar hanya muncul bila ada ringkasan depot (Ringkas)", () => {
  const d = {kit: [kit()], kehilangan: null};
  assert.doesNotMatch(R.kartuKit(d).isi, /siap gelar/);
  const s = R.kartuKit(d, K.ringkasDepot(d.kit, {[kit().id]: {komponen: komp(), bbm: bbm(["terima", 40])}}));
  assert.match(teks(s.isi), /1 dari 1 kit siap gelar/);
});

const kompleks = [{id: "K0001", lat: -2, lon: 114, jam_tiba: 2}, {id: "K0002", lat: -2.5, lon: 114, jam_tiba: null}];
const pri = {kompleks: [{id: "K0001", darat: true, menit: 90, dari: "Daops X"}, {id: "K0003", darat: false}]};
test("jarakKm dan kompleksTerdekat: garis lurus, batas 2 km, yang terdekat menang", () => {
  assert.ok(Math.abs(K.jarakKm(-2, 114, -2, 115) - 111.2) < 0.5);
  assert.equal(K.kompleksTerdekat(-2.01, 114, kompleks).k.id, "K0001");
  assert.equal(K.kompleksTerdekat(-2.05, 114, kompleks), null, "5,5 km = di luar 2 km");
});

test("lampuTitik: hijau ada kit siap, kuning tanpa kit siap, merah tak terjangkau, abu tanpa kompleks atau akses tak diketahui; huruf berbeda tiap lampu", () => {
  const siap = [{kode: "SIPPA-001", lokasi: "Palangka Raya", lat: -2, lon: 113, status: "gudang"}], tanpaKoor = [{kode: "SIPPA-002", status: "gudang"}];
  const ctx = (kits, p = pri, kp = kompleks) => ({kompleks: kp, pri: new Map(p.kompleks.map(r => [r.id, r])), siap: kits});
  const h = K.lampuTitik(-2.005, 114, ctx(siap));
  assert.equal(h.lampu, "hijau"); assert.equal(h.menit, 90); assert.equal(h.kitTerdekat.kode, "SIPPA-001");
  assert.match(K.teksTitik(h), /Kit siap terdekat SIPPA-001 \(Palangka Raya\), 111,1 km garis lurus/); assert.match(K.teksTitik(h), /dari Daops X ke kompleks 90 menit/); assert.match(K.teksTitik(h), /estimasi model/);
  assert.equal(K.lampuTitik(-2.005, 114, ctx([])).lampu, "kuning");
  assert.match(K.teksTitik(K.lampuTitik(-2.005, 114, ctx(tanpaKoor))), /koordinat kit belum dicatat, jarak tidak dihitung/);
  assert.equal(K.lampuTitik(-2.005, 114, ctx(siap, {kompleks: [{id: "K0001", darat: false}]})).lampu, "merah");
  assert.equal(K.lampuTitik(0, 100, ctx(siap)).lampu, "abu");
  assert.equal(K.lampuTitik(-2.505, 114, ctx(siap)).lampu, "abu", "K0002 tanpa prioritas dan tanpa jam_tiba = akses tak diketahui");
  assert.equal(K.lampuTitik(-2.505, 114, ctx(siap, {kompleks: []}, [{id: "K0002", lat: -2.5, lon: 114, jam_tiba: 3}])).lampu, "hijau", "tanpa prioritas, model akses kelayakan");
  assert.equal(new Set(Object.values(K.LAMPU).map(l => l.huruf)).size, 4, "huruf berbeda: warna saja tidak cukup (keputusan 52)");
  assert.match(K.legendaLampuHtml(), /H<\/i>.*Hijau/s);
});

test("buatKonteks: kit siap dihitung dari rincian; popupTitik lolos esc", () => {
  const c = K.buatKonteks(kompleks, pri, [kit(), kit({id: "fedcba9876543210"})], {[kit().id]: {komponen: komp(), bbm: bbm(["terima", 40])}});
  assert.equal(c.siap.length, 1); assert.equal(c.pri.get("K0001").menit, 90);
  assert.doesNotMatch(K.popupTitik({lampu: "merah", alasan: "<script>x</script>"}), /<script>/);
});

test("geoApi: titik di provinsi terpilih; dengan konteks membawa lampu dan huruf, tanpa konteks tetap polos", () => {
  const j = {baris: [[-2.005, 114, 0, 0, 0, 0, 0], [-2.005, 114, 0, 0, 0, 0, 1]], wilayah: ["62|a|b", "63|a|b"]};
  assert.deepEqual(P.geoApi(j, "62").features[0].properties, {});
  const g = P.geoApi(j, "62", K.buatKonteks(kompleks, pri, [kit({lat: -2, lon: 113})], {[kit().id]: {komponen: komp(), bbm: bbm(["terima", 40])}}));
  assert.equal(g.features.length, 1); assert.equal(g.features[0].properties.lampu, "hijau"); assert.equal(g.features[0].properties.huruf, "H");
  assert.equal(g.features[0].properties.kompleks, "K0001"); assert.equal(g.features[0].properties.info, undefined, "tanpa JSON per fitur");
  const balik = K.titikDariProps(g.features[0].properties); assert.equal(balik.kitTerdekat.kode, "SIPPA-001"); assert.equal(balik.menit, 90);
  assert.match(K.teksTitik(balik), /Kit siap terdekat SIPPA-001/);
  assert.deepEqual(Object.keys(P.WARNA_LAMPU), ["hijau", "kuning", "merah", "abu"]);
  assert.equal(P.geoApi(null, "62").features.length, 0);
});

test("tautanSwir: parameter Copernicus Browser persis, 4 desimal, titik desimal; di luar rentang null; swirHtml membuka tab baru", () => {
  assert.equal(K.tautanSwir(-2.2, 113.9), "https://browser.dataspace.copernicus.eu/?zoom=14&lat=-2.2000&lng=113.9000&themeId=DEFAULT-THEME&datasetId=S2_L2A_CDAS&layerId=6-SWIR&date=latest");
  assert.match(K.tautanSwir(-2.123456, 113.987654), /lat=-2\.1235&lng=113\.9877/);
  assert.equal(K.tautanSwir(null, 1), null); assert.equal(K.tautanSwir(95, 1), null); assert.equal(K.tautanSwir(NaN, 1), null);
  const h = K.swirHtml(-2.2, 113.9);
  assert.match(h, /target="_blank" rel="noopener noreferrer"/); assert.match(h, /Lihat citra satelit SWIR terbaru/); assert.match(h, /Bara dan api tampak oranye terang; perlu akun Copernicus gratis\./);
  assert.equal(K.swirHtml(null, null), "");
});

const kk = {id: "K0001", kab: "Pulang Pisau", terbakar_n_2km: 3, terbakar_akhir: 2023, lat: -2.2, lon: 113.9};
const log = [
  {id: "a", kompleks_id: "K0001", jenis: "karhutla", t_tiba: Date.UTC(2026, 9, 20), t_air_mengalir: Date.UTC(2026, 9, 20) + 3.5 * 36e5, kit_kode: "SIPPA-001", kelas_medan: "I", air_sampai_lance: 1},
  {id: "b", kompleks_id: "K0001", jenis: "karhutla", t_tiba: Date.UTC(2026, 9, 10), kit_kode: "SIPPA-001", kecelakaan: 1},
  {id: "c", kompleks_id: "K0001", jenis: "karhutla", t_tiba: Date.UTC(2026, 9, 25), koreksi_dari: "b"},
  {id: "d", kompleks_id: "K0009", jenis: "karhutla", t_tiba: 1}, {id: "e", kompleks_id: "K0001", jenis: "latihan", t_tiba: 1},
];
test("riwayatGelar dan riwayatHtml: tahun terbakar, gelar sebelumnya dan hasilnya, koreksi menggantikan, jenis lain dan kompleks lain dibuang", () => {
  const r = K.riwayatGelar("K0001", log);
  assert.deepEqual(r.map(x => x.tibaAir), [null, 3.5], "c mengoreksi b; terbaru dulu");
  const t = teks(K.riwayatHtml(kk, log));
  assert.match(t, /3 tahun dalam 2 km, terakhir 2023/); assert.match(t, /air mengalir 3,5 jam setelah tiba/); assert.match(t, /air sampai di lance/); assert.match(t, /waktu air mengalir belum tercatat/);
  assert.match(teks(K.riwayatHtml(kk, [])), /Belum pernah digelar SIPPA/); assert.match(teks(K.riwayatHtml(kk, null)), /tidak bisa dimuat/);
  assert.equal(K.riwayatSingkat("K0001", log).startsWith("2 kali"), true); assert.equal(K.riwayatSingkat("K0001", []), "belum pernah"); assert.equal(K.riwayatSingkat("K0001", null), null);
});

test("rincian dan pop-up kompleks (peta): memuat riwayat dan tautan SWIR; tanpa log layar lama tetap sama", () => {
  const ada = {...kk, zona_k: "A", zona_o: "A", kab: "Pulang Pisau", air_km_lama: 1, jalan_km_lama: 2, beda_air_m: 1};
  const r = P.rincianKompleks(ada, {}, "k", {log});
  assert.match(r, /Riwayat kompleks/); assert.match(r, /Lihat citra satelit SWIR terbaru/);
  assert.doesNotMatch(P.rincianKompleks(ada, {}, "k", {}), /Riwayat kompleks/);
  const p = P.popupKompleks(ada, "k", {}, log);
  assert.match(teks(p), /Gelar SIPPA2 kali/); assert.match(p, /target="_blank" rel="noopener noreferrer"/);
  assert.match(teks(P.popupKompleks(ada, "k", {}, null)), /riwayat tidak bisa dimuat/);
  assert.doesNotMatch(P.popupKompleks(ada, "k", {}), /Gelar SIPPA/);
});

test("katalog alat: 16 alat berfoto yang ada di public, kredit dan lisensi tampil, tanpa merek, ada tautan Commons", () => {
  assert.equal(A.ALAT.length, 16);
  for (const a of A.ALAT) {
    assert.ok(existsSync(new URL(`../../public${a.foto}`, import.meta.url)), `foto ${a.foto} ada`);
    assert.ok(a.artis && a.lisensi && a.halaman.startsWith("https://commons.wikimedia.org/wiki/File:"), `kredit ${a.kunci}`);
    assert.ok(a.spek.length >= 2 && a.fungsi && a.jumlah);
  }
  const h = A.katalogHtml();
  assert.equal((h.match(/<article class="sp-alat"/g) || []).length, 16);
  assert.match(h, /Foto: TeWeBs, CC BY-SA 4\.0, <a href="https:\/\/commons\.wikimedia\.org\/wiki\/File:Funchal/);
  assert.match(h, /rel="noopener noreferrer"/); assert.doesNotMatch(teks(h), /toFixed|·|—/);
  assert.match(A.kartuAlatHtml({...A.ALAT[0], nama: "<b>x</b>"}), /alt="&lt;b&gt;x&lt;\/b&gt;"/, "teks lewat esc");
});

test("muatGayaKit: layar_kit.css dimuat sekali lewat tautan data-sp=kit, dipanggil Kit, Ringkas, Peta, dan Pelihara", () => {
  const kode = f => readFileSync(new URL(`../../public/pipa/${f}`, import.meta.url), "utf8");
  assert.match(kode("layar_kit.js"), /export function muatGayaKit[\s\S]*data-sp="kit"[\s\S]*layar_kit\.css/);
  for (const f of ["layar_kit.js", "layar_ringkas.js", "layar_peta.js", "layar_pelihara.js"]) assert.match(kode(f), /muatGayaKit\(/, f);
  assert.match(kode("layar_pelihara.js"), /katalogHtml\(\)/);
  assert.doesNotMatch(kode("layar_kit.css"), /#[0-9a-fA-F]{3,8}\b|style=/);
});

test("kitTerpotong: kit di depot lewat 12 dinyatakan di kartu 'Rincian 12 kit pertama'; prafilter kotak tidak mengubah hasil kompleksTerdekat", () => {
  const banyak = Array.from({length: 14}, (_, i) => kit({id: i.toString(16).padStart(16, "0")}));
  assert.equal(K.kitTerpotong(banyak), 2); assert.equal(K.kitTerpotong(banyak.slice(0, 12)), 0);
  assert.match(teks(K.kesiapanHtml(K.ringkasDepot(banyak), 2)), /Rincian 12 kit pertama; 2 kit lain belum dihitung siap/);
  assert.doesNotMatch(K.kesiapanHtml(K.ringkasDepot(banyak)), /Rincian 12/);
  const dekat = [{id: "A", lat: -2.0, lon: 114.0178}, {id: "B", lat: -2.0, lon: 114.0182}];
  assert.equal(K.kompleksTerdekat(-2, 114, dekat).k.id, "A", "1,99 km masuk, 2,01 km keluar");
  assert.equal(K.kompleksTerdekat(-2, 114, [{id: "C", lat: -2.0, lon: 114.0182}]), null);
});
