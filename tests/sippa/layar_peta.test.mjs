/* SP-032: logika murni layar Peta /pipa/peta (PRD §9.4.2, DS §3.6 §4.2, RU §2.3 P1-P7). Pembangun menghasilkan data atau teks tanpa peramban;
   perakit MapLibre dan DOM dibuktikan di peramban preview. Data nyata data/sippa/keluaran/{zona,kelayakan_kompleks,kelayakan_sel}.json
   dipakai sebagai masukan supaya angka judul = angka berkas (A188, A198, A469) dan Terverifikasi berbeda tepat di kompleks yang dicek. */
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

(0, eval)(readFileSync(new URL("../../public/inti/format.js", import.meta.url), "utf8").replace(/^"use strict";?/, "") + ";globalThis.fmt=fmt;globalThis.esc=esc;globalThis.jamWIB=jamWIB;");

const P = await import("../../public/pipa/layar_peta.js");
const nyata = n => JSON.parse(readFileSync(new URL(`../../data/sippa/keluaran/${n}.json`, import.meta.url), "utf8"));
const teks = h => h.replace(/<[^>]*>/g, "");
const zona = nyata("zona"), komp = nyata("kelayakan_kompleks").kompleks;

/* ---------- P1: kartu judul dan ringkasan dari zona.json ---------- */
test("judulPeta: angka persis zona.json, versi kendala.json A188 dan semua jalan OSM A469 (P1)", () => {
  const j = P.judulPeta(zona, "62", "Kalteng");
  assert.equal(j.teks, "188 dari 865 kompleks Kalteng di zona A (versi kendala.json); 469 bila semua jalan OSM termasuk track dihitung");
  assert.deepEqual([j.k, j.o, j.n], [188, 469, 865]);
  assert.equal(P.judulPeta(zona, "99", "X"), null, "provinsi tanpa baris = null, bukan angka karangan");
});

test("ringkasanZona: tabel 4 zona x 4 versi dari zona.json, jalan utama OSM A198, tanpa jalan 16 km 44, median air dan jalan (P1)", () => {
  const r = P.ringkasanZona(zona, "62", komp, {});
  assert.deepEqual(r.baris.map(b => b.zona), ["A", "B", "C", "D"]);
  const a = r.baris[0];
  assert.deepEqual([a.k.n, a.u.n, a.o.n], [188, 198, 469]);
  assert.equal(a.v.n, 188, "tanpa cek jalan, Terverifikasi = Konservatif");
  assert.equal(r.baris.reduce((s, b) => s + b.k.n, 0), 865);
  assert.equal(r.tanpaJalan16, 44);
  assert.deepEqual([r.median.o.air, r.median.o.jalan], [1.02, 2.27]);
  assert.match(a.k.pct, /^21,7/, "persen lewat fmt id-ID");
});

/* ---------- P3: versi Terverifikasi ---------- */
const cek = (id, hasil, musim = "hujan", waktu = 1) => ({id: `${id}-${hasil}-${musim}-${waktu}`, kompleks_id: id, musim, hasil, waktu});

test("cekTerbaru: hanya musim hujan, terbaru per kompleks, lolos lalu gagal = gagal (P3)", () => {
  const m = P.cekTerbaru([cek("K0001", "lolos", "hujan", 5), cek("K0001", "gagal", "hujan", 9), cek("K0002", "lolos", "kemarau", 3), cek("K0003", "lolos", "hujan", 1)]);
  assert.equal(m.K0001.hasil, "gagal"); assert.equal(m.K0002, undefined, "cek kemarau tidak membuat Terverifikasi"); assert.equal(m.K0003.hasil, "lolos");
});

test("zonaVersi dan hitungPerZona: Terverifikasi berbeda dari Konservatif tepat di kompleks yang dicek lolos hujan (P3)", () => {
  const beda = komp.filter(k => k.zona_k !== k.zona_o).slice(0, 10), ids = beda.map(k => k.id);
  const m = P.cekTerbaru([...ids.map(id => cek(id, "lolos")), cek(komp.find(k => k.zona_k !== k.zona_o && !ids.includes(k.id)).id, "gagal")]);
  for (const k of beda) { assert.equal(P.zonaVersi(k, "v", m), k.zona_o); assert.equal(P.zonaVersi(k, "k", m), k.zona_k); }
  const lain = komp.find(k => !ids.includes(k.id)); assert.equal(P.zonaVersi(lain, "v", m), lain.zona_k);
  const hk = P.hitungPerZona(komp, "k", m), hv = P.hitungPerZona(komp, "v", m);
  assert.deepEqual(hk, {A: 188, B: 418, C: 89, D: 170, n: 865});
  assert.notDeepEqual(hv, hk);
  const harap = {...hk}; for (const k of beda) { harap[k.zona_k]--; harap[k.zona_o]++; }
  assert.deepEqual(hv, harap, "selisih hanya dari 10 kompleks yang dicek");
  assert.deepEqual(P.hitungPerZona(komp, "o", {}), {A: 469, B: 158, C: 167, D: 71, n: 865});
});

test("ringkasanHtml: tabel empat baris berhuruf dan berpola, angka zona.json, baris tanpa jalan 16 km dan median; kosong berkalimat", () => {
  const h = P.ringkasanHtml(P.ringkasanZona(zona, "62", komp, {}), "k"), t = teks(h);
  assert.match(h, /<caption class="sr">/); assert.equal([...h.matchAll(/<tbody>.*?<\/tbody>/gs)][0][0].match(/<tr>/g).length, 4);
  for (const s of ["188", "198", "469", "21,7%", "Tanpa jalan kendaraan dalam 16 km: 44", "1,02 km dan jalan 2,27 km"]) assert.ok(t.includes(s), `ringkasan tanpa "${s}"`);
  assert.match(h, /sp-pola-a/); assert.match(P.ringkasanHtml(null), /ad-kosong/);
});

test("popupSel: tahun aktif, hari api, zona terdekat berhuruf, aksi AOI; teks di-escape", () => {
  const h = P.popupSel({sel: "s395_1004", th: 8, hari: 50, zona: "B", kompleks: "K0008"}), t = teks(h);
  assert.ok(t.includes("s395_1004") && t.includes("8 dari 14") && t.includes("B konservatif") && t.includes("K0008")); assert.match(h, /data-aksi="aoi-sel"/);
  assert.match(teks(P.popupSel({sel: "s1_1", th: 1, hari: 1, zona: null})), /tidak ada kompleks dalam 5 km/);
  assert.doesNotMatch(P.popupSel({sel: "<b>", th: 1, hari: 1}), /<b>/);
});

/* ---------- satuan, lapisan, simbol (P2, P6) ---------- */
test("ukuranTitik dan kelasSel: jari-jari 4/6/8 menurut 0-2/3-5/6+ tahun; kelas 1-2, 3-4, 5-6, 7-9, 10-14, nol tidak digambar", () => {
  assert.deepEqual([0, 2, 3, 5, 6, 14].map(P.ukuranTitik), [4, 4, 6, 6, 8, 8]);
  assert.deepEqual([0, 1, 2, 3, 4, 5, 6, 7, 9, 10, 14].map(P.kelasSel), [0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5]);
});

test("rampSel: lima warna, kelas 5 = --f3, makin pekat ke kelas 4, dasar mengikuti tema", () => {
  const t = P.rampSel(false), g = P.rampSel(true);
  assert.equal(t.length, 5); assert.ok(t.every(c => /^#[0-9a-f]{6}$/.test(c)));
  assert.equal(t[4], g[4]); assert.notDeepEqual(t.slice(0, 4), g.slice(0, 4));
  assert.equal(P.campur("#000000", "#ffffff", 0.5), "#808080");
});

test("geoKompleks: satu titik per kompleks dengan zona tiga versi, ukuran, dan id; koordinat [lon, lat]", () => {
  const m = P.cekTerbaru([cek("K0008", "lolos")]), g = P.geoKompleks(komp, m);
  assert.equal(g.type, "FeatureCollection"); assert.equal(g.features.length, 865);
  const f = g.features.find(x => x.properties.id === "K0008"), k = komp.find(x => x.id === "K0008");
  assert.deepEqual(f.geometry.coordinates, [k.lon, k.lat]);
  assert.deepEqual([f.properties.zona_k, f.properties.zona_o, f.properties.zona_v], [k.zona_k, k.zona_o, k.zona_o]);
  assert.equal(f.properties.r, P.ukuranTitik(k.terbakar_n_2km));
  assert.equal(g.features.find(x => x.properties.id === "K0001").properties.zona_v, komp[0].zona_k);
});

test("geoSel: poligon kisi 0,02 derajat tertutup, sel tanpa deteksi tidak digambar, kelas dan zona terdekat dibawa", () => {
  const d = nyata("kelayakan_sel"), g = P.geoSel(d);
  assert.equal(g.features.length, d.baris.filter(b => b[3] > 0).length);
  const f = g.features[0], [sel, lat, lon, th] = d.baris.find(b => b[3] > 0);
  assert.equal(f.properties.sel, sel); assert.equal(f.properties.kelas, P.kelasSel(th));
  const r = f.geometry.coordinates[0]; assert.equal(r.length, 5); assert.deepEqual(r[0], r[4]);
  assert.deepEqual([Math.min(...r.map(p => p[0])), Math.max(...r.map(p => p[0]))].map(x => Math.round(x * 1e4)), [lon - 0.01, lon + 0.01].map(x => Math.round(x * 1e4)));
  assert.ok(g.features.some(x => x.properties.zona), "sel dengan zona kompleks terdekat membawa zona");
});

test("lapisanKompleks: tiap lapisan zona memasang pola (ikon per zona) dan huruf A-D (P6, keputusan 52)", () => {
  for (const kunci of ["zona_k", "zona_o", "zona_v"]) {
    const ls = P.lapisanKompleks(kunci), pola = ls.find(l => l.id === "kompleks-pola"), huruf = ls.find(l => l.id === "kompleks-huruf");
    assert.ok(pola && huruf, "lapisan pola dan huruf wajib ada");
    assert.deepEqual(pola.layout["icon-image"], ["concat", "zona-", ["get", kunci]]);
    assert.deepEqual(huruf.layout["text-field"], ["get", kunci]); assert.equal(huruf.minzoom, 10);
    assert.ok(huruf.layout["text-size"] >= 10);
  }
  assert.deepEqual(Object.keys(P.ZONA_META), ["A", "B", "C", "D"]);
  assert.deepEqual(Object.values(P.ZONA_META).map(z => z.pola), ["penuh", "cincin", "setengah", "silang"]);
  assert.equal(new Set(Object.values(P.ZONA_META).map(z => z.warna)).size, 4, "empat warna palet PRD");
});

test("lapisanSel: isi berkelas lima warna dan garis tepi warna zona", () => {
  const ls = P.lapisanSel(P.rampSel(false)); assert.deepEqual(ls.map(l => l.id), ["sel-isi", "sel-garis"]);
  assert.equal(ls[0].paint["fill-opacity"], 0.75); assert.equal(ls[1].paint["line-width"], 1);
});

test("satuanLapisan: sakelar kompleks dan sel hanya mengubah visibility, tanpa sumber baru (P2)", () => {
  const a = P.satuanLapisan("sel"), b = P.satuanLapisan("kompleks");
  assert.ok(a.sel.every(([, v]) => v === "visible") && a.kompleks.every(([, v]) => v === "none"));
  assert.ok(b.kompleks.every(([, v]) => v === "visible") && b.sel.every(([, v]) => v === "none"));
  assert.ok([...a.kompleks, ...a.sel].every(x => x.length === 2 && typeof x[0] === "string"), "pasangan [idLapisan, visibility], bukan sumber");
  assert.throws(() => P.satuanLapisan("hantu"), /satuan/);
});

/* ---------- saringan dan daftar (P5) ---------- */
const SEMUA = {zona: new Set(["A", "B", "C", "D"]), bakar: 0, tahunAkhir: 2025, gsw: new Set(["permanen", "musiman", "tak_terdeteksi"]), kab: "", cari: "", versi: "k"};
test("saringKompleks: zona A konservatif 188, optimistis 469, tahun terbakar, GSW, kabupaten, dan kotak cari", () => {
  assert.equal(P.saringKompleks(komp, SEMUA, {}).length, 865);
  assert.equal(P.saringKompleks(komp, {...SEMUA, zona: new Set(["A"])}, {}).length, 188);
  assert.equal(P.saringKompleks(komp, {...SEMUA, zona: new Set(["A"]), versi: "o"}, {}).length, 469);
  assert.equal(P.saringKompleks(komp, {...SEMUA, zona: new Set()}, {}).length, 0);
  assert.equal(P.saringKompleks(komp, {...SEMUA, bakar: 3}, {}).length, komp.filter(k => k.terbakar_akhir > 2022).length, "terbakar dalam 3 tahun terakhir = terbakar_akhir 2023 ke atas");
  assert.equal(P.saringKompleks(komp, {...SEMUA, gsw: new Set(["permanen"])}, {}).length, 120);
  assert.equal(P.saringKompleks(komp, {...SEMUA, kab: "Seruyan"}, {}).length, komp.filter(k => k.kab === "Seruyan").length);
  assert.deepEqual(P.saringKompleks(komp, {...SEMUA, cari: " k0008 "}, {}), ["K0008"], "id tanpa peduli huruf besar dan spasi");
  assert.ok(P.saringKompleks(komp, {...SEMUA, cari: "seruy"}, {}).length > 1, "potongan nama kabupaten");
});

test("filterPeta: satu ekspresi in atas id (setFilter), tanpa setData", () => {
  assert.deepEqual(P.filterPeta(["K0001", "K0002"]), ["in", ["get", "id"], ["literal", ["K0001", "K0002"]]]);
  assert.deepEqual(P.filterPeta([]), ["in", ["get", "id"], ["literal", []]], "kosong tetap ekspresi sah yang menyembunyikan semua");
});

test("urutDaftar: bawaan zona lalu tahun terbakar menurun; kolom dan arah bisa diganti; tidak mengubah masukan", () => {
  const dasar = P.urutDaftar(komp, "k", {}, null, false), z = dasar.map(k => k.zona_k).join("");
  assert.equal(z, [...z].sort().join(""), "A di depan, D di belakang");
  const a = dasar.filter(k => k.zona_k === "A"); for (let i = 1; i < a.length; i++) assert.ok(a[i - 1].terbakar_n_2km >= a[i].terbakar_n_2km);
  assert.equal(P.urutDaftar(komp, "k", {}, "air", false)[0].air_km_lama <= P.urutDaftar(komp, "k", {}, "air", false)[1].air_km_lama, true);
  const rapat = Array.from({length: 865}, (_, i) => ({...komp[0], id: `K${String(i + 1).padStart(4, "0")}`}));   // id data nyata tidak rapat (sampai K9983)
  assert.equal(P.urutDaftar(rapat, "k", {}, "id", true)[0].id, "K0865");
  assert.equal(komp[0].id, "K0001");
  assert.equal(P.potong(komp, 0, 50).length, 50); assert.equal(P.potong(komp, 17, 50).length, 15, "halaman terakhir 865 = 17 x 50 + 15");
  assert.equal(P.potong(komp, 99, 50).length, 15, "halaman di luar batas dijepit ke terakhir");
});

/* ---------- rincian, saran, tautan (P4, P7) ---------- */
const K8 = komp.find(k => k.id === "K0008");
test("rincianKompleks: label-nilai lengkap, status lahan tanpa nama perusahaan, waktu tempuh belum dihitung, DSM berkanopi (P4)", () => {
  const h = P.rincianKompleks({...K8, jam_tiba: null}, {}, "k"), t = teks(h);
  for (const s of ["K0008", K8.kab, `${K8.zona_k} konservatif`, "DSM berkanopi", "belum dihitung", "Status lahan", K8.kaw, "Jarak air", "Jarak jalan", "MCD64A1", "VIIRS", "CHIRPS"]) assert.ok(t.includes(s), `rincian tanpa "${s}"`);
  assert.doesNotMatch(h, /pemegang|perusahaan|PT\./i);
  assert.match(P.rincianKompleks({...K8, jam_tiba: 3.5}, {}, "k"), /3,5 jam/);
  assert.match(teks(P.rincianKompleks({...K8, jalan_km_lama: null, terpotong: {jalan_semua: true}}, {}, "k")), /tanpa jalan kendaraan|16 km/);
});

test("rincianKompleks: teks data di-escape (kabupaten, id)", () => {
  const h = P.rincianKompleks({...K8, kab: '<img src=x onerror=alert(1)>', id: 'K"><b>'}, {}, "k");
  assert.doesNotMatch(h, /<img|<b>/); assert.match(h, /&lt;img/);
});

test("popupKompleks: tiga versi zona sebagai pil berhuruf, tombol Rincian dan Hitung hidraulika, teks di-escape", () => {
  const h = P.popupKompleks({...K8, kab: "<x>"}, "k", {});
  assert.match(h, /data-aksi="rincian"/); assert.match(h, /Hitung hidraulika/); assert.doesNotMatch(h, /<x>/);
  assert.equal([...h.matchAll(/class="sp-yakin zona-pil/g)].length, 3);
});

test("tautanHitung: /pipa/hitung?kompleks=<id>, id liar ditolak (P7)", () => {
  assert.equal(P.tautanHitung("K0008"), "/pipa/hitung?kompleks=K0008");
  assert.equal(P.tautanHitung("K0008&x=1"), null); assert.equal(P.tautanHitung(null), null);
});

test("saranHtml: sarana dan alasan berangka dari saranSarana, tautan Hitung, pil asumsi kebijakan (P7)", () => {
  const k = {...K8, zona_k: "A", zona_o: "A", air_km_lama: 1.4, air_km_semua: 1.4, jalan_km_lama: 3.2, jam_tiba: null};
  const h = P.saranHtml(k, "k", false, undefined), t = teks(h);
  assert.match(t, /Kit relay SIPPA/); assert.match(t, /air 1,4 km/); assert.match(t, /jalan 3,2 km/); assert.match(t, /zona A konservatif/);
  assert.match(h, /href="\/pipa\/hitung\?kompleks=K0008"/); assert.match(h, /asumsi-kebijakan/);
  assert.match(P.saranHtml({...k, jam_tiba: 7}, "k", true, undefined), /Tahan front dari udara/, "aturan 1: tempuh lebih dari 6 jam dan api aktif");
  assert.match(teks(P.saranHtml({...k, jam_tiba: 7}, "k", false, undefined)), /Kit relay/, "tanpa api aktif aturan 1 tidak jalan");
});

/* ---------- legenda, daftar, formulir ---------- */
test("legendaHtml: empat zona berhuruf, berpola, beserta arti dan jumlah; ukuran titik; tanpa baris sumber; basi bila > 400 hari", () => {
  const h = P.legendaHtml({A: 188, B: 418, C: 89, D: 170, n: 865}, {per: "2026-10-25", versi: "Konservatif", kini: Date.parse("2026-10-26")}), t = teks(h);
  for (const z of ["A", "B", "C", "D"]) { assert.ok(t.includes(z)); assert.match(h, new RegExp(`sp-pola-${z.toLowerCase()}`)); }
  for (const n of ["188", "418", "89", "170"]) assert.ok(t.includes(n));
  assert.doesNotMatch(t, /Sumber/); assert.match(t, /0–2/); assert.doesNotMatch(h, /basi/);
  assert.match(P.legendaHtml({A: 1, B: 0, C: 0, D: 0, n: 1}, {per: "2024-01-01", versi: "k", kini: Date.parse("2026-10-26")}), /basi, per/);
});

test("polaSvg: empat pola berbeda, SVG dekoratif", () => {
  const s = ["A", "B", "C", "D"].map(P.polaSvg); assert.equal(new Set(s).size, 4);
  assert.ok(s.every(x => /aria-hidden="true"/.test(x) && /<svg/.test(x)));
});

test("tabelDaftarHtml: caption, scope col, tombol urut ber-aria-label, id jadi tombol nyata, data-label tiap sel, huruf zona dalam pil (P5)", () => {
  const h = P.tabelDaftarHtml(komp.slice(0, 3), "k", {}, {urut: "zona", turun: false}), t = teks(h);
  assert.match(h, /<caption class="sr">/); assert.match(h, /scope="col"/); assert.match(h, /aria-label="Urutkan menurut Zona"/);
  assert.match(h, /aria-sort="ascending"/); assert.equal([...h.matchAll(/<button type="button" class="sp-baris-id"/g)].length, 3);
  assert.match(h, /data-label="Kabupaten"/); assert.ok(t.includes("K0001"));
  assert.match(P.tabelDaftarHtml([{...komp[0], kab: "<i>"}], "k", {}, {}), /&lt;i&gt;/);
  assert.match(P.tabelDaftarHtml([], "k", {}, {}), /ad-kosong/);
});

test("badanCek: musim dan hasil wajib, catatan paling banyak 500 huruf, yang salah ditolak per medan", () => {
  const f = {musim: "hujan", hasil: "lolos", kendaraan: "pickup_4x4", catatan: " jalan kering "};
  assert.deepEqual(P.badanCek(f, "K0008", "62"), {badan: {kompleks_id: "K0008", prov: "62", musim: "hujan", hasil: "lolos", kendaraan: "pickup_4x4", catatan: "jalan kering"}, galat: []});
  const x = P.badanCek({musim: "banjir", hasil: "", kendaraan: "tank", catatan: "x".repeat(501)}, "K0008", "62");
  assert.equal(x.badan, null); assert.deepEqual(x.galat.map(g => g.medan), ["musim", "hasil", "kendaraan", "catatan"]);
  assert.equal(P.badanCek({musim: "hujan", hasil: "gagal"}, "K0008", "62").badan.kendaraan, undefined, "kendaraan opsional tidak dikirim");
});

test("badanAoi: alasan 5 sampai 500 huruf, id berpola; kosong ditolak dengan pesan", () => {
  assert.deepEqual(P.badanAoi("K0008", "62", " air dekat dan jalan baik "), {badan: {kompleks_id: "K0008", prov: "62", alasan: "air dekat dan jalan baik"}, galat: []});
  assert.equal(P.badanAoi("K0008", "62", "abc").badan, null); assert.match(P.badanAoi("K0008", "62", "abc").galat[0].pesan, /5/);
  assert.equal(P.badanAoi("K0008", "62", "x".repeat(501)).badan, null); assert.equal(P.badanAoi("bukan-id", "62", "alasan sah").badan, null);
});

test("bolehTulis: hanya peran W dan M mencatat cek jalan dan usul AOI; pembaca melihat alasan", () => {
  assert.equal(P.bolehTulis("W"), true); assert.equal(P.bolehTulis("M"), true); assert.equal(P.bolehTulis("B"), false);
});

test("JALUR dan basi: tiga berkas R2 lewat /api/sippa/data, cek jalan dan usul AOI; basi lewat 400 hari", () => {
  assert.equal(P.JALUR.kompleks, "/api/sippa/data/kelayakan_kompleks"); assert.equal(P.JALUR.sel, "/api/sippa/data/kelayakan_sel"); assert.equal(P.JALUR.zona, "/api/sippa/data/zona");
  assert.equal(P.JALUR.cek, "/api/sippa/jalan-cek"); assert.equal(P.JALUR.aoi, "/api/sippa/aoi");
  assert.equal(P.basiPeta("2025-09-01", Date.parse("2026-10-26")), true); assert.equal(P.basiPeta("2026-10-25", Date.parse("2026-10-26")), false); assert.equal(P.basiPeta(null, 0), false);
});

test("kerangkaPeta: bilah memuat satuan, chip zona A-D, terbakar 3 tahun, tiga GSW, kabupaten, cari, Daftar; kanvas berwilayah; tanpa em dash", () => {
  const h = P.kerangkaPeta({kabupaten: ["Seruyan", "Kapuas"], hitung: {A: 188, B: 418, C: 89, D: 170}});
  assert.match(h, /role="region" aria-label="Peta kelayakan kit"/);
  assert.match(h, /data-satuan="kompleks"/); assert.match(h, /data-satuan="sel"/);
  for (const z of "ABCD") assert.match(h, new RegExp(`data-zona="${z}"`));
  assert.equal([...h.matchAll(/data-gsw="/g)].length, 3); assert.match(h, /data-saring="bakar"/); assert.match(h, /aria-label="Cari kompleks"/); assert.match(h, /data-aksi="daftar"/);
  assert.match(h, /Seruyan/); assert.doesNotMatch(h, /[—·]/);
});

/* ---------- INP (P2): sumber dibuat sekali; sakelar dan saringan hanya setLayoutProperty dan setFilter ---------- */
test("perakit: addSource hanya di pasangLapisan dan tambahSel, setData sekali sesudah tulis cek jalan, setLayoutProperty hanya di terapkanSatuan", () => {
  const kode = readFileSync(new URL("../../public/pipa/layar_peta.js", import.meta.url), "utf8");
  const fungsiDari = idx => { const potong = kode.slice(0, idx), m = [...potong.matchAll(/(?:function|const)\s+([A-Za-z]+)\s*(?:=\s*(?:async\s*)?\(|\()/g)].at(-1); return m?.[1]; };
  const di = re => [...kode.matchAll(re)].map(m => fungsiDari(m.index));
  assert.deepEqual(di(/\.addSource\(/g).sort(), ["pasangLapisan", "tambahSel"]);
  assert.equal(di(/\.setData\(/g).length, 1, "setData sekali: sesudah cek jalan ditulis, tidak saat menyaring");
  assert.deepEqual([...new Set(di(/\.setLayoutProperty\(/g))], ["terapkanSatuan"]);
  assert.deepEqual([...new Set(di(/\.setFilter\(/g))], ["terapkanSaringan"]);
});

test("jarakVersi: air dan jalan tiap versi k, u, o, v memakai kolom yang benar (pop-up, Daftar, urut)", () => {
  const k = {id: "K0001", air_km_lama: 1, air_km_semua: 2, jalan_km_lama: 3, jalan_km_utama: 4, jalan_km_semua: 5};
  assert.deepEqual(P.jarakVersi(k, "k", {}), {air: 1, jalan: 3});
  assert.deepEqual(P.jarakVersi(k, "u", {}), {air: 2, jalan: 4});
  assert.deepEqual(P.jarakVersi(k, "o", {}), {air: 2, jalan: 5});
  assert.deepEqual(P.jarakVersi(k, "v", {}), {air: 2, jalan: 3}, "tanpa cek lolos = jalan konservatif");
  assert.deepEqual(P.jarakVersi(k, "v", {K0001: {hasil: "lolos"}}), {air: 2, jalan: 5});
  assert.deepEqual(P.jarakVersi(k, "v", {K0001: {hasil: "gagal"}}), {air: 2, jalan: 3});
});

test("pop-up: klik aksi hitung tidak dinavigasi dua kali (pop melewati defaultPrevented; handler wadah lebih dulu)", () => {
  const kode = readFileSync(new URL("../../public/pipa/layar_peta.js", import.meta.url), "utf8");
  assert.match(kode, /const pop = e => \{\s*if \(e\.defaultPrevented\) return;/);
  assert.equal([...kode.matchAll(/else if \(a === "hitung"/g)].length, 2, "dua cabang hitung (wadah dan pop) dijaga satu guard defaultPrevented");
});
