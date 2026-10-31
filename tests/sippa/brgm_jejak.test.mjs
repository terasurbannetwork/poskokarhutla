/* SP-110, SP-108, SP-115, fase 1 provinsi baru: lapisan BRGM, air asin, jejak keputusan, dan kompleks provinsi 16 dengan field null (data nyata, tanpa DB). */
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

(0, eval)(readFileSync(new URL("../../public/inti/format.js", import.meta.url), "utf8").replace(/^"use strict";?/, "") + ";globalThis.fmt=fmt;globalThis.esc=esc;globalThis.jamWIB=jamWIB;");
const B = await import("../../public/pipa/brgm.js");
const K = await import("../../public/pipa/keputusan.js");
const P = await import("../../public/pipa/layar_peta.js");
const D = await import("../../public/pipa/layar_data.js");
const nyata = n => JSON.parse(readFileSync(new URL(`../../data/sippa/keluaran/${n}.json`, import.meta.url), "utf8"));
const kelayakan = nyata("kelayakan_kompleks").kompleks, sumsel = kelayakan.filter(k => k.prov === "16"), teks = h => h.replace(/<[^>]+>/g, " ");

test("brgm geoBrgm: disaring ke kotak provinsi, jenis asing jatuh ke lain, status rencana dibedakan", () => {
  const d = {kolom: ["lon", "lat", "jenis", "status"], baris: [[110, -1, "sekat_kanal", "terbangun"], [110, -1, "sumur_bor", "rencana"], [110, -1, "aneh", "terbangun"], [50, 50, "sekat_kanal", "terbangun"], ["x", 1, "lain", "terbangun"]]};
  const g = B.geoBrgm(d, [109, -2, 111, 0]);
  assert.deepEqual(g.features.map(f => f.properties), [{jenis: "sekat_kanal", st: "ada"}, {jenis: "sumur_bor", st: "rencana"}, {jenis: "lain", st: "ada"}]);
  assert.equal(B.geoBrgm(d, null).features.length, 4, "tanpa kotak semua titik bernilai angka ikut");
  assert.deepEqual(B.geoBrgm(null, null).features, []);
  const kb = B.kotakProv([{lon: 110, lat: -1}, {lon: 112, lat: -3}, {lon: null, lat: 1}]);
  assert.deepEqual(kb.map(x => Math.round(x * 10) / 10), [109.7, -3.3, 112.3, -0.7]); assert.equal(B.kotakProv([]), null);
});

test("brgm data nyata: kotak provinsi 62 membuang titik provinsi lain dan lapisan memakai satu sumber brgm", () => {
  const d = nyata("brgm_pembasahan"), kot = B.kotakProv(kelayakan.filter(k => k.prov === "62")), g = B.geoBrgm(d, kot);
  assert.ok(g.features.length > 0 && g.features.length < d.baris.length, `${g.features.length} dari ${d.baris.length}`);
  const l = B.lapisanBrgm(); assert.equal(l.length, 1); assert.equal(l[0].source, "brgm"); assert.equal(l[0].layout.visibility, "none", "bawaan mati");
  assert.deepEqual(B.LAPISAN_BRGM, l.map(x => x.id));
  assert.equal(B.namaGambarBrgm("sumur_bor", "rencana"), "brgm-sumur_bor-rencana");
});

test("brgm legenda: tiga jenis berbeda bentuk dan huruf, rencana berisi kosong", () => {
  const h = B.legendaBrgmHtml();
  for (const [j, m] of Object.entries(B.JENIS_BRGM)) { assert.match(h, new RegExp(`<b>${m.huruf}</b>${m.nama}`)); assert.ok(B.ikonBrgmSvg(j).includes("sp-brgm-b")); }
  assert.equal(new Set(Object.values(B.JENIS_BRGM).map(m => m.bentuk)).size, 3, "bentuk berbeda, bukan warna saja");
  assert.match(h, /rencana, belum terbangun/); assert.doesNotMatch(h, /[—·]|#[0-9a-f]{3,6}/i);
});

test("brgm brgmTeks: null = belum dihitung, nol = tidak ada, angka id-ID", () => {
  assert.equal(B.brgmTeks({brgm_3km: null}), "belum dihitung"); assert.equal(B.brgmTeks({}), "belum dihitung");
  assert.equal(B.brgmTeks({brgm_3km: {sekat_kanal: 0, sumur_bor: 0, sumur_rencana: 0, lain: 0}}), "tidak ada dalam 3 km");
  assert.equal(B.brgmTeks({brgm_3km: {sekat_kanal: 1200, sumur_bor: 3, sumur_rencana: 0, lain: 2}}), "1.200 sekat kanal, 3 sumur bor, 2 lainnya dalam 3 km");
  assert.doesNotMatch(B.brgmBaris({brgm_3km: null}), /sp-yakin/, "belum dihitung tanpa pil keyakinan");
  assert.match(B.brgmBaris({brgm_3km: {sekat_kanal: 1, sumur_bor: 0, sumur_rencana: 0, lain: 0}}), /sp-yakin resmi/);
});

test("brgm airAsinTeks: air asin true berpil darurat saja dengan penjelasan, false menyebut air tawar lebih dekat, null belum dihitung", () => {
  const a = B.airAsinTeks({air_asin: true, air_asin_jenis: "laut", air_asin_km: 1.5});
  assert.equal(a.asin, true); assert.match(a.html, /air asin, darurat saja/); assert.match(a.html, /laut 1,5 km/);
  assert.match(a.html, /Garam merusak pompa dan masuk ke gambut dan sumur warga; bilas pompa dengan air tawar/); assert.match(a.html, /Saran sarana tetap memakai air tawar/);
  const b = B.airAsinTeks({air_asin: false, air_asin_jenis: "payau", air_asin_km: 9.28});
  assert.equal(b.asin, false); assert.match(b.html, /payau 9,3 km, air tawar lebih dekat/); assert.doesNotMatch(b.html, /darurat/);
  assert.equal(B.airAsinTeks({air_asin: false, air_asin_jenis: null, air_asin_km: 16}).html, "tidak ada air asin dalam 16 km");
  assert.equal(B.airAsinTeks({}).html, "belum dihitung"); assert.equal(B.airAsinTeks(null).asin, false);
});

test("keputusan badanKeputusan dan tombolKeputusan: putusan jalan atau tunda, alasan 3 sampai 300 huruf, peran baca mati", () => {
  assert.deepEqual(K.badanKeputusan({putusan: "jalan", alasan: "  Api aktif  "}, "K0001").badan, {kompleks_id: "K0001", putusan: "jalan", alasan: "Api aktif"});
  assert.equal(K.badanKeputusan({putusan: "constructor", alasan: "ada alasan"}, "K0001").galat[0].medan, "putusan");
  assert.equal(K.badanKeputusan({putusan: "tunda", alasan: "ab"}, "K0001").galat[0].medan, "alasan");
  assert.match(K.badanKeputusan({putusan: "tunda", alasan: "x".repeat(301)}, "K0001").galat[0].pesan, /3 sampai 300 huruf \(sekarang 301\)/);
  assert.equal(K.badanKeputusan({putusan: "tunda", alasan: "alasan"}, "bukan").galat[0].medan, "kompleks_id");
  assert.equal(K.badanKeputusan({putusan: "tunda", alasan: "x".repeat(300)}, "K1").galat.length, 0);
  assert.doesNotMatch(K.tombolKeputusan({id: "K0001"}, true), /disabled/); assert.match(K.tombolKeputusan({id: "K0001"}, true), /data-aksi="putusan"[^>]*data-id="K0001"/);
  assert.match(K.tombolKeputusan({id: "K0001"}, false), /disabled title="Perlu peran tulis"/); assert.match(K.tombolKeputusan({id: "K0001"}, true), />Catat putusan</);
});

test("keputusan jejakTabelHtml: waktu WIB, aksi disaring, terpotong bertanda, teks data di-escape, kosong berkalimat", () => {
  const j = [{id: "1", waktu: Date.parse("2026-10-27T03:00:00Z"), oleh: "staf:a<b", obyek: "sippa_keputusan:abc", aksi: "keputusan", ke: "K0001 jalan", catatan: "api <aktif>", prov: "62"},
    {id: "2", waktu: 1, oleh: "staf:a", obyek: "sippa_kit:xyz", aksi: "ubah", ke: null, catatan: null, prov: "62"}];
  const h = K.jejakTabelHtml(j);
  assert.match(h, /10\.00 WIB|10:00 WIB/); assert.match(h, /Putusan abc/); assert.match(h, /Kit xyz/); assert.match(h, /staf:a&lt;b/); assert.match(h, /api &lt;aktif&gt;/); assert.doesNotMatch(h, /<aktif>|a<b/);
  assert.equal([...K.jejakTabelHtml(j, {aksi: "ubah"}).matchAll(/<tr>/g)].length, 2, "kepala + satu baris");
  assert.match(K.jejakTabelHtml(j, {terpotong: true}), /Jejak dipotong/); assert.doesNotMatch(h, /Jejak dipotong/);
  assert.match(K.jejakTabelHtml([]), /Belum ada jejak/); assert.doesNotMatch(h, /[—·]/);
  assert.deepEqual(K.aksiJejak(j), ["putusan", "diubah"].map(x => Object.entries(K.AKSI_JEJAK).find(([, v]) => v === x)[0]).sort((a, b) => K.namaAksi(a).localeCompare(K.namaAksi(b))));
  assert.equal(K.jalurJejak(1.9e12 + 0.5, 9999), "/api/sippa/jejak?sejak=1900000000000&batas=500");
});

test("provinsi baru: kompleks Sumsel (prov 16) dengan field null tampil belum dihitung di rincian, pop-up, daftar, tanpa NaN atau undefined", () => {
  assert.ok(sumsel.length > 300);
  const cek = {};
  for (const k of sumsel.slice(0, 321)) {
    const h = P.rincianKompleks(k, cek, "k", {per: "2026-10-25"}) + P.popupKompleks(k, "k", cek, undefined) + P.saranHtml(k, "k", false, undefined);
    assert.doesNotMatch(h, /NaN|undefined|null|\[object/, k.id);
  }
  const k = sumsel[0], r = teks(P.rincianKompleks(k, cek, "k"));
  assert.match(r, /Beda elevasi air\s+belum dihitung/); assert.match(r, /Terbakar \(MCD64A1\)\s+belum dihitung/); assert.match(r, /Kekerapan sel \(VIIRS\)\s+belum dihitung/);
  assert.match(r, /Curah hujan \(CHIRPS\)\s+belum dihitung/); assert.match(r, k.jam_tiba == null ? /Waktu tempuh\s+belum dihitung/ : /Waktu tempuh\s+\d/);   // jam_tiba terisi sejak akses semua provinsi (28 Okt) assert.match(r, /Air di citra satelit\s+belum dihitung/);
  assert.match(r, /Sekat kanal dan sumur bor BRGM\s+tidak ada dalam 3 km|Sekat kanal dan sumur bor BRGM\s+\d/); assert.match(r, /Air asin\s+laut 9,3 km, air tawar lebih dekat/);
  assert.match(teks(P.popupKompleks(k, "k", cek)), /Beda elevasi\s+belum dihitung[\s\S]*Terbakar\s+belum dihitung/);
  assert.match(teks(P.tabelDaftarHtml([k], "k", cek)), /belum dihitung[\s\S]*belum dihitung/);
  const asin = kelayakan.find(x => x.air_asin === true);
  if (asin) { assert.match(P.rincianKompleks(asin, {}, "k"), /air asin, darurat saja/); assert.match(P.popupKompleks(asin, "k", {}), /air asin, darurat saja/); }
  assert.doesNotMatch(P.popupKompleks(k, "k", cek), /darurat/, "pop-up hanya menyebut air asin bila air_asin true");
});

test("provinsi baru: saringan GSW tidak membuang kompleks gsw null; legenda tanpa tahun terbakar berkalimat", () => {
  const st = {zona: new Set("ABCD"), bakar: 0, tahunAkhir: -Infinity, gsw: new Set(), kab: "", cari: "", versi: "k"};
  assert.equal(P.saringKompleks(sumsel, st, {}).length, sumsel.length, "gsw null lolos walau semua chip GSW mati");
  assert.equal(P.saringKompleks(kelayakan.filter(k => k.prov === "62"), st, {}).length, 0, "gsw terisi tetap disaring");
  const g = {A: 1, B: 1, C: 1, D: 1, n: 4}, h = P.legendaHtml(g, {per: "2026-10-25", versi: "k", bakarAda: false, brgm: true});
  assert.match(teks(h), /Tahun terbakar belum dihitung untuk provinsi ini/); assert.doesNotMatch(h, /sp-u4/); assert.match(h, /Sekat kanal dan sumur bor BRGM/);
  assert.doesNotMatch(P.legendaHtml(g, {per: "2026-10-25", versi: "k"}), /BRGM|belum dihitung/);
  assert.match(P.kerangkaPeta({tanpaBakar: true}), /data-saring="bakar" disabled/); assert.match(P.kerangkaPeta({}), /data-lapisan="brgm">/);
  assert.doesNotMatch(P.kerangkaPeta({}), /data-lapisan="brgm" checked/, "BRGM bawaan mati");
  assert.match(P.kerangkaPeta({}), /Sekat kanal dan sumur bor BRGM/);
  const geo = P.geoKompleks(sumsel, {}); assert.equal(geo.features.length, sumsel.length); assert.ok(geo.features.every(f => Number.isFinite(f.properties.r)));
});

test("peta perakit: BRGM dimuat malas lewat sakelar, rincian punya tombol Catat putusan, jejak ada di layar Log", () => {
  const peta = readFileSync(new URL("../../public/pipa/layar_peta.js", import.meta.url), "utf8"), log = readFileSync(new URL("../../public/pipa/layar_log.js", import.meta.url), "utf8");
  assert.match(peta, /JALUR\.brgm/); assert.equal([...peta.matchAll(/ambilSekali\(konteks, JALUR\.brgm/g)].length, 1, "satu pembacaan BRGM, hanya dari muatBrgm");
  assert.match(peta, /if \(t\.checked\) nanti\(muatBrgm\)/); assert.match(peta, /tombolKeputusan\(k, tulis\)/); assert.match(peta, /a === "putusan" && k && tulis/);
  assert.match(peta, /layar_peta\.css\?v=7/);
  assert.match(log, /Jejak keputusan dan perubahan/); assert.match(log, /jalurJejak\(/);
});

test("layar_data: kalimat jumlah kelayakan dihitung dari zona.json, dataset brgm_pembasahan dan prioritas terdaftar", () => {
  const z = nyata("zona"), j = D.jumlahKelayakan(z); assert.ok(j.n > 865 && j.prov > 1, "lebih dari Kalteng");
  const d = D.DATASET.find(x => x.kunci === "kelayakan_kompleks");
  assert.equal(D.namaDataset(d, j), `Kelayakan per kompleks (${fmt(j.n)} kompleks di ${j.prov} provinsi)`); assert.equal(D.namaDataset(d, null), "Kelayakan per kompleks, semua provinsi");
  const kunci = D.DATASET.map(x => x.kunci); assert.ok(kunci.includes("brgm_pembasahan") && kunci.includes("prioritas"));
  assert.doesNotMatch(D.tabDatasetHtml({}, D.DATASET, j), /865/); assert.ok(D.tabDatasetHtml({}, D.DATASET, j).includes(`${fmt(j.n)} kompleks di ${j.prov} provinsi`));
  assert.equal(D.jumlahKelayakan({baris: []}), null);
});
