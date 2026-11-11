/* Siklus Bencana F1: fungsi murni src/siklus_hitung.js. UJ-F1-04 (bagian JS), UJ-F1-08 (resolusi alias), UJ-F1-09 (selisih), F1.8 (basi).
   Vektor ID dibaca dari tests/siklus/fixtures/acuan.json (dihitung hashlib); tidak disunting di sini. Jalankan: node --test tests/warga/siklus_hitung.test.mjs */
import {test as uji} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import path from "node:path";
import {AKAR} from "./_bantu.mjs";
import {idKejadian, idBebas, kunciPendiri, selisihAntarsumber, selisihDampak, resolusiAlias, basi, faseSah, angkaPublik, RE_KJ, FASE,
  klasifikasiTingkat, hargaTerindeks, nilaiKerusakan, nilaiKerugian, petaLimaSektor, tigaPenanda, stimulan, dth, sisa90, pdna, persenRealisasi, macet, PETA_SEKTOR, SEKTOR_R3P} from "../../src/siklus_hitung.js";

const ACUAN = JSON.parse(readFileSync(path.join(AKAR, "tests/siklus/fixtures/acuan.json"), "utf8"));

uji("UJ-F1-04: idKejadian sama persis dengan vektor acuan.json (hashlib), panjang 16, format KJ-", async () => {
  assert.ok(ACUAN.id_kejadian.length >= 4);
  for (const v of ACUAN.id_kejadian) {
    const [kunci, n] = v.masukan.split("|").length === 4 ? [v.masukan.split("|").slice(0, 3).join("|"), Number(v.masukan.split("|")[3])] : [v.masukan, 1];
    const id = await idKejadian(kunci, n);
    assert.equal(id, v.id, v.masukan);
    assert.equal(id.length, 16);
    assert.match(id, RE_KJ);
    assert.equal(id.slice(3, 7), String(v.tahun));
  }
});

uji("UJ-F1-04: kunci pendiri urut jenis tak bergantung urutan masuk (INV-9) dan kab terkecil", async () => {
  assert.equal(kunciPendiri(["longsor", "banjir"], "3201", "2026-03-02"), "banjir+longsor|3201|2026-03-02");
  assert.equal(kunciPendiri(["banjir", "longsor"], ["3202", "3201"], "2026-03-02"), "banjir+longsor|3201|2026-03-02");
  assert.equal(await idKejadian(kunciPendiri(["longsor", "banjir"], "3201", "2026-03-02")), "KJ-2026-MT5Z0ZVT");
  assert.equal(await idKejadian(kunciPendiri("banjir", "3201", "2026-03-02")), "KJ-2026-9A2WGN3G");
});

uji("idKejadian menolak kunci rusak dan n tak sah; idBebas menghash ulang saat tabrakan", async () => {
  await assert.rejects(() => idKejadian("banjir|3201"));
  await assert.rejects(() => idKejadian("banjir|3201|2026-3-2"));
  await assert.rejects(() => idKejadian("banjir|3201|2026-03-02", 0));
  const terpakai = new Set(["KJ-2026-9A2WGN3G"]);
  assert.equal(await idBebas("banjir|3201|2026-03-02", async id => terpakai.has(id)), "KJ-2026-8N57ZZ0Y");
  terpakai.add("KJ-2026-8N57ZZ0Y");
  assert.equal(await idBebas("banjir|3201|2026-03-02", async id => terpakai.has(id)), await idKejadian("banjir|3201|2026-03-02", 3));
  await assert.rejects(() => idBebas("banjir|3201|2026-03-02", async () => true), /50 percobaan/);
});

uji("UJ-F1-09: selisih antarsumber cocok dengan acuan.json; null bukan nol; tanpa total", () => {
  for (const k of ACUAN.selisih) {
    const r = selisihAntarsumber(k.nilai);
    assert.equal(r.n, k.n); assert.equal(r.selisih, k.selisih); assert.deepEqual(r.arah, k.arah); assert.equal(r.persen, k.persen);
    assert.ok(!("total" in r) && !("rata" in r));
  }
  assert.deepEqual(selisihAntarsumber({dibi: 0, logbook: 5}), {n: 2, selisih: 5, arah: {maks: "logbook", min: "dibi"}, persen: 100}, "nol yang dilaporkan adalah angka");
  assert.equal(selisihAntarsumber({dibi: 0, logbook: 0}).persen, null, "persen hanya bila maks > 0");
  assert.equal(selisihAntarsumber(undefined).n, 0);
  assert.equal(selisihAntarsumber({a: NaN, b: "3"}).n, 0);
});

uji("selisihDampak: metrik yang dilaporkan sumber mana pun, per sumber berdampingan", () => {
  const r = selisihDampak({dibi: {meninggal: {n: 12}, luka: {n: 4}}, logbook: {meninggal: {n: 15}}, sistem: {}});
  assert.deepEqual(r.map(x => x.metrik), ["luka", "meninggal"]);
  assert.equal(r.find(x => x.metrik === "meninggal").selisih, 3);
  assert.equal(r.find(x => x.metrik === "luka").selisih, null, "satu sumber saja: tanpa selisih");
  assert.deepEqual(selisihDampak(null), []);
});

uji("UJ-F1-08: resolusi alias B->A->C, batas 32 langkah gagal keras, putaran dan rantai putus gagal", async () => {
  const peta = {B: {fase: "digabung", ke: "A"}, A: {fase: "digabung", ke: "C"}, C: {fase: "tanggap", ke: null}, X: {fase: "tanggap"}};
  assert.equal(await resolusiAlias("B", async id => peta[id] ?? null), "C");
  assert.equal(await resolusiAlias("C", async id => peta[id] ?? null), "C");
  const rantai = {}; for (let i = 0; i < 40; i++) rantai["n" + i] = {fase: "digabung", ke: "n" + (i + 1)}; rantai.n40 = {fase: "selesai"};
  await assert.rejects(() => resolusiAlias("n0", async id => rantai[id] ?? null), /lebih dari 32/);
  assert.equal(await resolusiAlias("n9", async id => rantai[id] ?? null), "n40", "31 langkah masih lolos");
  await assert.rejects(() => resolusiAlias("P", async id => ({P: {fase: "digabung", ke: "Q"}, Q: {fase: "digabung", ke: "P"}})[id] ?? null), /berputar/);
  await assert.rejects(() => resolusiAlias("Z", async () => null), /putus/);
  await assert.rejects(() => resolusiAlias("Y", async () => ({fase: "digabung", ke: null})), /tanpa ke/);
});

uji("F1.8: basi hanya tampilan, ambang BASI_HARI = 3 (acuan.json)", () => {
  assert.equal(ACUAN.konstanta.BASI_HARI, 3);
  assert.equal(basi("2026-03-02", "2026-03-06"), true, "4 > 3");
  assert.equal(basi("2026-03-02", "2026-03-05"), false, "3 tidak lebih dari 3");
});

uji("faseSah mencerminkan trigger sk_kejadian_fase; angkaPublik k-anonim", () => {
  assert.equal(faseSah("terdeteksi", "terverifikasi"), true);
  assert.equal(faseSah("terdeteksi", "dibatalkan"), true);
  assert.equal(faseSah("tanggap", "dibatalkan"), false);
  assert.equal(faseSah("terdeteksi", "pemulihan"), false);
  assert.equal(faseSah("selesai", "pemulihan"), true);
  assert.equal(faseSah("dibatalkan", "terdeteksi"), false);
  assert.equal(faseSah("digabung", "terdeteksi"), false);
  for (const f of FASE) assert.equal(faseSah(f, "digabung"), true);
  assert.equal(angkaPublik(4), "di bawah 5"); assert.equal(angkaPublik(5), 5); assert.equal(angkaPublik(0), "di bawah 5"); assert.equal(angkaPublik(null), null);
});

/* ================================================================ F4 (SK-068): UJ-F4-02 sampai UJ-F4-08 */
const JT = 1e6, H_RUMAH = {hancur: 300 * JT, rb: 100 * JT, rs: 50 * JT, rr: 20 * JT};
const hRumah = (s, t) => s === "perumahan" ? H_RUMAH[t] ?? null : null;
const rumah = (rb, rs, rr) => [{sektor: "perumahan", tingkat: "rb", unit: rb}, {sektor: "perumahan", tingkat: "rs", unit: rs}, {sektor: "perumahan", tingkat: "rr", unit: rr}];

uji("UJ-F4-02: klasifikasi p = 70 RS, 70,01 RB, 30 RS, 29,99 RR; di luar 0-100 atau bukan angka = null", () => {
  assert.deepEqual([70, 70.01, 30, 29.99, 0, 100].map(klasifikasiTingkat), ["rs", "rb", "rs", "rr", "rr", "rb"]);
  for (const x of [-1, 100.1, NaN, "50", null, undefined]) assert.equal(klasifikasiTingkat(x), null, String(x));
});
uji("UJ-F4-03: RB 10 x 100 jt, RS 20 x 50 jt, RR 30 x 20 jt = Rp2.600 juta; IKK 95/100 = 2.470 juta; IHPB 118/112 = 2.602,32 juta", () => {
  const k = nilaiKerusakan(rumah(10, 20, 30), hRumah); assert.equal(k.total, 2600 * JT); assert.equal(k.per.perumahan.nilai, 2600 * JT); assert.equal(k.menunggu, false);
  assert.equal(hargaTerindeks({href: 2600 * JT, ikkK: 95, ikkRef: 100}).nilai, 2470 * JT);
  const g = hargaTerindeks({href: 2600 * JT, ikkK: 95, ikkRef: 100, ihpb1: 118, ihpb0: 112}); assert.equal((g.nilai / JT).toFixed(2), "2602.32"); assert.equal(g.status, "asumsi-kebijakan");
  assert.equal(hargaTerindeks({href: 100}).nilai, 100, "tanpa indeks = faktor 1");
});
uji("UJ-F4-03: h_RS 120 jt > h_RB 100 jt = bendera monoton (tidak diperbaiki); harga kosong menunggu bukan 0; patahan IHPB dan separuh pasangan menunggu", () => {
  const k = nilaiKerusakan(rumah(1, 1, 0), (s, t) => ({hancur: 300 * JT, rb: 100 * JT, rs: 120 * JT, rr: 20 * JT})[t]);
  assert.equal(k.per.perumahan.monoton.ok, false); assert.deepEqual(k.per.perumahan.monoton.langgar, ["rs > rb"]); assert.equal(k.per.perumahan.nilai, 220 * JT, "nilai tidak diubah");
  const kosong = nilaiKerusakan([...rumah(1, 0, 0), {sektor: "pendidikan", tingkat: "rb", unit: 2}], hRumah);
  assert.equal(kosong.per.pendidikan.nilai, null); assert.equal(kosong.per.pendidikan.menunggu, true); assert.equal(kosong.total, null, "sektor menunggu: total null, bukan 0"); assert.equal(kosong.per.perumahan.nilai, 100 * JT);
  assert.equal(hargaTerindeks({href: 1e6, ihpb1: 118, ihpb0: 112, patahan: true}).status, "menunggu");
  for (const x of [{href: null}, {href: 0}, {href: 1e6, ikkK: 95}, {href: 1e6, ikkK: 95, ikkRef: 0}]) assert.equal(hargaTerindeks(x).nilai, null, JSON.stringify(x));
  assert.equal(nilaiKerusakan([{sektor: "perumahan", tingkat: "rb", unit: 0}], () => null).per.perumahan.nilai, 0, "nol unit = nol nyata, harga tak dibutuhkan");
});
uji("UJ-F4-04: kerugian arus x bulan; hitung ganda (air_minum di dua sektor), cakupan (ekonomi kosong), kewajaran (V_s melebihi semua unit hancur)", () => {
  const rugi = [{sektor: "perumahan", komponen: "air_minum", arus_rp: 2 * JT, bulan: 3}, {sektor: "air_sanitasi", komponen: "air_minum", arus_rp: 1 * JT, bulan: 6}, {sektor: "kesehatan", komponen: "obat", arus_rp: JT, bulan: 1}];
  const kru = nilaiKerugian(rugi); assert.deepEqual(kru.per, {perumahan: 6 * JT, air_sanitasi: 6 * JT, kesehatan: JT}); assert.equal(kru.total, 13 * JT); assert.equal(nilaiKerugian([]).total, null);
  assert.deepEqual([kru.menunggu, kru.dibuang], [false, {}]);
  const buang = nilaiKerugian([{sektor: "perumahan", arus_rp: 5, bulan: 2}, {sektor: "perumahan", bulan: 3}, {sektor: "kesehatan", arus_rp: 9}, {sektor: "kesehatan", arus_rp: 9, bulan: "3"}]);
  assert.equal(buang.menunggu, true); assert.deepEqual(buang.dibuang, {perumahan: 1, kesehatan: 2}, "baris tanpa arus_rp atau bulan dihitung per sektor, tidak diam-diam 0"); assert.deepEqual(buang.per, {perumahan: 10});
  const ker = nilaiKerusakan(rumah(10, 20, 30), hRumah);
  const p = tigaPenanda({kerusakan: ker, barisRugi: rugi, sektorTerisi: ["perumahan", "air_sanitasi", "kesehatan"]});
  assert.deepEqual(p.hitung_ganda, [{komponen: "air_minum", sektor: ["air_sanitasi", "perumahan"]}]); assert.deepEqual(p.kosong, ["ekonomi", "lintas_sektor"]); assert.deepEqual(p.tidak_wajar, []);
  const mahal = nilaiKerusakan(rumah(1, 0, 0), (s, t) => ({hancur: 10 * JT, rb: 100 * JT})[t] ?? null);
  assert.equal(mahal.per.perumahan.wajar, false); assert.deepEqual(tigaPenanda({kerusakan: mahal, barisRugi: [], sektorTerisi: ["perumahan"]}).tidak_wajar, ["perumahan"]);
});
uji("UJ-F4-05: peta ke lima sektor; subsektor di luar tabel masuk belum_terpeta; lima sektor + belum_terpeta = total", () => {
  const nilai = {perumahan: 100, jalan_jembatan: 50, air_sanitasi: 25, pertanian: 10, pariwisata: 5, kesehatan: 7, lingkungan: 3, sektor_baru_tak_dikenal: 11, pendidikan: null};
  const r = petaLimaSektor(nilai);
  assert.deepEqual([r.permukiman, r.infrastruktur, r.ekonomi, r.sosial, r.lintas_sektor, r.belum_terpeta], [100, 75, 15, 7, 3, 11]);
  assert.equal(SEKTOR_R3P.reduce((a, k) => a + r[k], 0) + r.belum_terpeta, r.total); assert.equal(r.total, 211, "null tidak dihitung");
  assert.equal(PETA_SEKTOR.perumahan, "permukiman"); assert.equal(Object.hasOwn(PETA_SEKTOR, "__proto__"), false);
  assert.deepEqual(r.menunggu, ["sosial"], "hanya sektor tanpa angka atau sebagian: sosial (pendidikan null)");
  const kosong = petaLimaSektor({perumahan: 100, pertanian: null}); assert.deepEqual([kosong.infrastruktur, kosong.sosial, kosong.lintas_sektor, kosong.belum_terpeta], [null, null, null, null], "sektor tanpa angka = null, bukan 0");
  assert.deepEqual(kosong.menunggu, ["infrastruktur", "ekonomi", "sosial", "lintas_sektor"]); assert.equal(kosong.total, 100); assert.equal(petaLimaSektor({}).total, null);
  assert.equal(petaLimaSektor({__proto__: null, toString: 5}).belum_terpeta, 5, "kunci mirip bawaan objek tidak lolos sebagai sektor");
});
uji("UJ-F4-06: stimulan 10 RB, 20 RS, 30 RR = Rp1.650 juta (asumsi-kebijakan); DTH 100 KK = Rp180 juta; kosong menunggu", () => {
  const s = stimulan({rb: 10, rs: 20, rr: 30}); assert.equal(s.nilai, 1650 * JT); assert.equal(s.yakin, "asumsi-kebijakan");
  assert.equal(dth(100).nilai, 180 * JT); assert.equal(stimulan({rb: 10}).nilai, null); assert.equal(stimulan({rb: 10}).yakin, "menunggu"); assert.equal(dth(undefined).nilai, null);
  assert.notEqual(stimulan({rb: 1, rs: 0, rr: 0}).nilai, 50 * JT, "tarif 50/25/10 tidak dipakai"); assert.notEqual(stimulan({rb: 1, rs: 0, rr: 0}).nilai, 80 * JT, "usulan 80 juta tidak dipakai");
});
uji("UJ-F4-07: tanggap 2026-08-01 hari ini 2026-09-15 berlalu 45 sisa 45; nol atau minus lewat batas; PDNA BNPB 2026-09-16, BPBD 2026-09-23", () => {
  assert.deepEqual(sisa90("2026-08-01", "2026-09-15"), {berlalu: 45, sisa: 45, lewat: false});
  assert.deepEqual(sisa90("2026-08-01", "2026-10-30"), {berlalu: 90, sisa: 0, lewat: true}); assert.equal(sisa90("2026-08-01", "2026-11-10").sisa, -11); assert.equal(sisa90("2026-08-01", "2026-11-10").lewat, true);
  assert.deepEqual(sisa90(null, "2026-09-15"), {berlalu: null, sisa: null, lewat: null});
  assert.deepEqual(pdna("2026-09-30"), {bnpb: "2026-09-16", bpbd: "2026-09-23"}); assert.deepEqual(pdna(null), {bnpb: null, bpbd: null});
});
uji("UJ-F4-08: A 800 jt target 100 realisasi 50, B 200 jt target 10 realisasi 10 = 50 dan 100, total tertimbang 60; target kosong menunggu; lebih dari target anomali maks 100; macet 65 hari ya, 60 hari tidak", () => {
  const r = persenRealisasi([{id: "a", nilai: 800 * JT, target: 100, realisasi: 50, satuan: "unit"}, {id: "b", nilai: 200 * JT, target: 10, realisasi: 10, satuan: "titik"}]);
  assert.deepEqual(r.per.map(x => x.persen), [50, 100]); assert.equal(r.total, 60); assert.equal(r.yakin, "asumsi-kebijakan");
  const k = persenRealisasi([{id: "a", nilai: JT, target: 0, realisasi: 5}, {id: "b", nilai: JT, target: null, realisasi: 5}, {id: "c", nilai: JT, target: 10, realisasi: null}]);
  assert.deepEqual(k.per.map(x => x.status), ["menunggu", "menunggu", "menunggu"]); assert.equal(k.total, null);
  const a = persenRealisasi([{id: "a", nilai: JT, target: 10, realisasi: 15}]); assert.equal(a.per[0].persen, 100); assert.equal(a.per[0].anomali, true);
  assert.equal(persenRealisasi([{id: "a", nilai: null, target: 10, realisasi: 5}]).total, null, "satu nilai kosong: total menunggu");
  assert.equal(macet("2026-08-01", "2026-10-05"), true); assert.equal(macet("2026-08-01", "2026-09-30"), false); assert.equal(macet(null, "2026-10-05"), false);
});

/* ---------- F5 Renkon Hidup dan Gladi (SK-086): UJ-F5-02 sampai UJ-F5-06 (bagian JS) ---------- */
import * as F5 from "../../src/siklus_hitung.js";
uji("UJ-F5-02: kebutuhan dasar Perka 7/2008: J = 1.000, h = 5; Sphere berdampingan; KK kosong menunggu; masukan salah menunggu", () => {
  const k = F5.kebutuhanDasar({jiwa: 1000, hari: 5}), c = k.komponen, nilai = Object.fromEntries(Object.entries(c).map(([n, x]) => [n, x.nilai]));
  assert.deepEqual(nilai, {penampungan: 3000, beras: 2000, makan: 10000, energi: 2100, air_bersih: 51000, air_minum: 12500, jamban: 50, tempat_sampah: null, sabun_mandi: 250, sabun_cuci: 200});
  assert.equal(c.tempat_sampah.status, "menunggu"); assert.equal(k.yakin, "estimasi-model");
  assert.equal(k.sphere.penampungan.nilai, 3500); assert.equal(k.sphere.air_bersih.nilai, 75000); assert.equal(k.sphere.yakin, "hipotesis");
  assert.equal(F5.kebutuhanDasar({jiwa: 1000, hari: 5, kk: 250}).komponen.tempat_sampah.nilai, 25);
  assert.equal(F5.kebutuhanDasar({jiwa: 1000, hari: 2}).komponen.air_bersih.nilai, 14000, "h <= 3: 7 liter per orang per hari");
  assert.equal(F5.kebutuhanDasar({jiwa: 1000, hari: 31}).komponen.sabun_mandi.nilai, 500, "ceil(31/30) = 2 bulan");
  for (const o of [{}, {jiwa: -1, hari: 5}, {jiwa: 10, hari: 0}, {jiwa: 1.5, hari: 5}, {jiwa: "10", hari: 5}]) assert.equal(F5.kebutuhanDasar(o).status, "menunggu", JSON.stringify(o));
});
uji("UJ-F5-03: kesenjangan: rusak tidak dihitung; surplus; satuan beda; tidak punya padanan; stok belum tercatat bukan 0; target personel", () => {
  const beras = F5.kesenjanganItem("beras", {nilai: 2000, satuan: "kg"}, {baik: 1200, rusak: 100, belum: 20, satuan: "kg"});
  assert.deepEqual([beras.gap, beras.surplus, beras.rusak, beras.belum_dinilai], [800, 0, 100, 20]);
  const air = F5.kesenjanganItem("air_minum", {nilai: 12500, satuan: "liter"}, {baik: 15000, rusak: 0, satuan: "liter"}); assert.deepEqual([air.gap, air.surplus], [0, 2500]);
  assert.equal(F5.kesenjanganItem("tenda", {nilai: 10, satuan: "unit"}, null).status, "tidak punya padanan");
  const terigu = F5.kesenjanganItem("terigu", {nilai: 10, satuan: "kg"}, null, true); assert.equal(terigu.status, "stok belum tercatat"); assert.equal(terigu.gap, null, "bukan 0");
  assert.equal(F5.kesenjanganItem("beras", {nilai: 10, satuan: "kg"}, {baik: 5, satuan: "karung"}).status, "satuan beda, menunggu");
  assert.deepEqual(F5.kesenjanganPersonel(50, 40), {status: "dihitung", target: 50, siap: 40, gap: 10, yakin: "asumsi-kebijakan"});
  for (const x of [beras, air, terigu, F5.kesenjanganItem("tenda", {nilai: 1, satuan: "unit"}, null), F5.kesenjanganItem("beras", {nilai: 10, satuan: "kg"}, {baik: 5, satuan: "karung"})]) assert.equal(x.yakin, "estimasi-model", "angka kebutuhan per item = estimasi-model");
  for (const baik of [undefined, null, "12", NaN]) { const x = F5.kesenjanganItem("beras", {nilai: 10, satuan: "kg"}, {baik, satuan: "kg"}); assert.equal(x.status, "stok belum tercatat", String(baik)); assert.equal(x.gap, null); }
  assert.equal(F5.kesenjanganPersonel(null, 40).yakin, "asumsi-kebijakan");
  assert.equal(F5.kesenjanganPersonel(null, 40).status, "target menunggu"); assert.equal(F5.kesenjanganPersonel(0, 40).status, "target menunggu"); assert.equal(F5.kesenjanganPersonel(30, 40).gap, 0);
});
uji("UJ-F5-04: kesegaran: pangkas akhir bulan, segera_habis, kedaluwarsa, perlu_reviu, menunggu", () => {
  assert.equal(F5.tambahBulan("2024-02-29", 36), "2027-02-28"); assert.equal(F5.tambahBulan("2025-08-31", 6), "2026-02-28");
  const a = F5.kesegaran({tgl_sah: "2024-02-29", hariIni: "2026-12-15"}); assert.deepEqual([a.status, a.berlaku_sampai, a.sisa], ["segera_habis", "2027-02-28", 75]);
  const b = F5.kesegaran({tgl_sah: "2024-02-29", hariIni: "2027-03-01"}); assert.deepEqual([b.status, b.sisa], ["kedaluwarsa", -1]);
  assert.equal(F5.kesegaran({tgl_sah: "2024-02-29", hariIni: "2027-02-28"}).status, "segera_habis", "sisa 0 belum kedaluwarsa");
  const c = F5.kesegaran({tgl_sah: "2025-01-10", hariIni: "2025-07-11"}); assert.deepEqual([c.status, c.reviu_jatuh], ["perlu_reviu", "2025-07-10"]);
  assert.equal(F5.kesegaran({tgl_sah: "2025-01-10", reviu_terakhir: "2025-06-01", hariIni: "2025-07-11"}).status, "berlaku", "reviu terakhir menggeser acuan");
  assert.equal(F5.kesegaran({tgl_sah: "2025-01-10", hariIni: "2025-02-01"}).status, "berlaku");
  const d = F5.kesegaran({tgl_sah: null, hariIni: "2025-02-01"}); assert.deepEqual([d.status, d.sisa], ["menunggu", null]);
  assert.equal(F5.kesegaran({tgl_sah: "2025-01-10", hariIni: "2025-02-01", segeraHari: 2000}).status, "segera_habis", "ambang dari jam_aturan");
});
uji("UJ-F5-05: skor kesiapan: K1 = 1, K2 = 0,8, K3 = 0,8, K4 lewat: 86,67 dari 3 komponen; kurang dari 2 komponen menunggu", () => {
  const barang = [F5.kesenjanganItem("beras", {nilai: 2000, satuan: "kg"}, {baik: 1200, satuan: "kg"}), F5.kesenjanganItem("air_minum", {nilai: 51000, satuan: "liter"}, {baik: 60000, satuan: "liter"})];
  const s = F5.skorGladi({kesegaran: "berlaku", barang, personel: F5.kesenjanganPersonel(50, 40), rekomendasi: null});
  assert.deepEqual([s.skor, s.label, s.status, s.komponen.k4], [86.67, "3 dari 4 komponen", "dihitung", null]);
  assert.equal(F5.skorGladi({kesegaran: "kedaluwarsa", barang: [], personel: null}).skor, null, "satu komponen: menunggu");
  assert.equal(F5.skorGladi({kesegaran: "kedaluwarsa", barang, personel: null}).komponen.k1, 0);
  assert.equal(F5.skorGladi({kesegaran: "berlaku", rekomendasi: [{tertaut: true}, {tertaut: false}], barang: []}).komponen.k4, 0.5);
  assert.equal(F5.skorGladi({kesegaran: "menunggu", barang: [{status: "stok belum tercatat"}]}).komponen.k1, null, "menunggu bukan komponen");
});
uji("UJ-F5-06: pemutaran ulang: 08:00, 11:30, esoknya 08:00 menjadi 0; 3,5; 24 jam, c = 2 menjadi 0; 1,75; 12; urutan stabil; tanpa interpolasi", () => {
  const T = Date.UTC(2026, 2, 1, 1, 0), e = [{waktu: T + 24 * 36e5, sumber: "dibi", metrik: "meninggal", nilai: 5}, {waktu: T, sumber: "dibi", metrik: "meninggal", nilai: 0}, {waktu: T + 3.5 * 36e5, sumber: "dibi", metrik: "meninggal", nilai: 3}];
  assert.deepEqual(F5.putarUlang(e).langkah.map(x => x.t_jam), [0, 3.5, 24]); assert.deepEqual(F5.putarUlang(e, 2).langkah.map(x => x.t_jam), [0, 1.75, 12]);
  assert.deepEqual(F5.putarUlang(e).langkah.map(x => x.nilai), [0, 3, 5], "nilai apa adanya"); assert.equal(F5.putarUlang(e).label, "Model sederhana, bukan prakiraan");
  const kembar = F5.putarUlang([{waktu: T, sumber: "logbook", metrik: "luka", nilai: 1}, {waktu: T, sumber: "dibi", metrik: "meninggal", nilai: 2}, {waktu: T, sumber: "dibi", metrik: "hilang", nilai: 3}]).langkah.map(x => x.sumber + ":" + x.metrik);
  assert.deepEqual(kembar, ["dibi:hilang", "dibi:meninggal", "logbook:luka"], "waktu sama: sumber lalu metrik");
  assert.deepEqual(F5.putarUlang([]).langkah, []); assert.equal(F5.putarUlang([{waktu: T, sumber: "x", metrik: "y", nilai: "bukan angka"}]).langkah.length, 0);
  for (const c of [0, 0.5, -1, NaN, "2"]) assert.throws(() => F5.putarUlang(e, c), /percepatan/, String(c));
});
