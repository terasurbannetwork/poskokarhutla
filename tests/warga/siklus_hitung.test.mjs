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
