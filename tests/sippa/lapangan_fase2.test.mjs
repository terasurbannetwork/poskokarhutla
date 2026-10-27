/* Fase 2 form lapangan (keputusan 61; SP-120 sampai SP-129, SP-131): fungsi murni formulir.js dan lapangan.js, serta antrean luring untuk jenis baru.
   Kontrak medan = src/sippa_lapangan.js (server); uji "sepakat dengan server" menjalankan KEDUANYA pada kasus yang sama supaya salah satu tidak menyimpang diam-diam.
   DOM (tombol SOS tahan 2 detik, GPS, getar) dibuktikan di peramban mode ponsel, bukan di sini. */
import test from "node:test";
import assert from "node:assert/strict";
import {cekLapangan} from "../../src/sippa_lapangan.js";
import * as F from "../../public/pipa/formulir.js";

const L = await import("../../public/pipa/lapangan.js");
const KINI = Date.UTC(2026, 9, 28, 3, 0);
const POS = {lat: -2.2, lon: 113.9};

test("hitungDebit fase 2: pelampung = lebar x dalam x kecepatan x 0,85 x 1000, ember = liter per detik; isian kurang atau di luar batas = null", () => {
  assert.equal(F.hitungDebit({metode: "pelampung", lebar_m: 2, dalam_m: 0.5, kecepatan_ms: 0.3}), 255);
  assert.equal(F.hitungDebit({metode: "ember", volume_l: 20, detik: 8}), 2.5);
  assert.equal(F.hitungDebit({metode: "ember", volume_l: 20, detik: 0.4}), null, "detik di bawah 0,5 ditolak seperti server");
  assert.equal(F.hitungDebit({metode: "pelampung", lebar_m: 2, dalam_m: 0.5}), null);
  assert.equal(F.hitungDebit({metode: "pelampung", lebar_m: 0, dalam_m: 1, kecepatan_ms: 1}), null);
  assert.equal(F.hitungDebit({metode: "kolam"}), null); assert.equal(F.hitungDebit(null), null);
});

test("bandingDebit: tepat 5 liter per detik = cukup untuk satu kit, 4,999 = kurang, null = tidak ada vonis", () => {
  assert.equal(F.KEBUTUHAN_DEBIT_LPS, 5);
  assert.equal(F.bandingDebit(5).cukup, true); assert.equal(F.bandingDebit(4.999).cukup, false); assert.equal(F.bandingDebit(10).rasio, 2); assert.equal(F.bandingDebit(null), null);
});

test("peringatanBor: di bawah 50 cm bukan gambut, 50 sampai 99 cm lance bisa tembus, 100 cm ke atas tanpa peringatan; nilai tak sah tanpa peringatan", () => {
  assert.match(F.peringatanBor(49.9), /bukan gambut/); assert.match(F.peringatanBor(0), /bukan gambut/);
  assert.match(F.peringatanBor(50), /tembus/); assert.match(F.peringatanBor(99.9), /tembus/);
  assert.equal(F.peringatanBor(100), null); assert.equal(F.peringatanBor(1500), null);
  assert.equal(F.peringatanBor(-1), null); assert.equal(F.peringatanBor(1501), null); assert.equal(F.peringatanBor(NaN), null);
});

test("peringatanTekanan: hanya di lance dan di bawah 2 bar; tepat 2 bar tanpa peringatan; pompa 1 bar tanpa peringatan", () => {
  assert.ok(F.peringatanTekanan("lance", 1.99)); assert.equal(F.peringatanTekanan("lance", 2), null);
  assert.equal(F.peringatanTekanan("pompa", 1), null); assert.equal(F.peringatanTekanan("manifold", 0), null); assert.equal(F.peringatanTekanan("lance", 30), null);
});

test("pengingatTekanan: sesi tidak aktif tidak pernah mengingatkan; aktif mengingatkan tepat pada 10 menit sejak catatan terakhir, sisa waktu dihitung", () => {
  const T = 1e12;
  assert.deepEqual(F.pengingatTekanan({aktif: false, terakhir: 0, kini: T}), {perlu: false, sisaMs: null});
  assert.equal(F.pengingatTekanan({aktif: true, terakhir: T - 599999, kini: T}).perlu, false);
  assert.equal(F.pengingatTekanan({aktif: true, terakhir: T - 600000, kini: T}).perlu, true);
  assert.equal(F.pengingatTekanan({aktif: true, terakhir: T - 60000, kini: T}).sisaMs, 540000);
  assert.equal(F.PENGINGAT_TEKANAN_MS, 10 * 60000);
});

test("jarakM: satu derajat lintang kira-kira 111 km; titik sama = 0", () => {
  assert.equal(F.jarakM([0, 100], [0, 100]), 0);
  assert.ok(Math.abs(F.jarakM([0, 100], [1, 100]) - 111195) < 200);
});

test("tambahTitikJejak: titik pertama disimpan; kurang dari 20 m dan kurang dari 30 detik dibuang; 20 m ATAU 30 detik menyimpan; titik di luar Indonesia dibuang", () => {
  const A = [-2.2, 113.9, 1e12];
  let t = F.tambahTitikJejak([], A); assert.equal(t.length, 1);
  assert.equal(F.tambahTitikJejak(t, [-2.2 + 0.00009, 113.9, 1e12 + 1000]), t, "10 m dalam 1 detik: objek yang sama, tidak disimpan");
  assert.equal(F.tambahTitikJejak(t, [-2.2 + 0.0002, 113.9, 1e12 + 1000]).length, 2, "22 m menyimpan");
  assert.equal(F.tambahTitikJejak(t, [-2.2, 113.9, 1e12 + 29999]).length, 1, "29,999 detik diam tidak menyimpan");
  assert.equal(F.tambahTitikJejak(t, [-2.2, 113.9, 1e12 + 30000]).length, 2, "30 detik menyimpan walau diam");
  assert.equal(F.tambahTitikJejak(t, [40, 113.9, 1e12 + 40000]), t); assert.equal(F.tambahTitikJejak(t, [-2.2, 113.9, NaN]), t); assert.equal(F.tambahTitikJejak(t, null), t);
});

test("tambahTitikJejak: tidak pernah lebih dari 500 titik; titik awal dan titik terakhir tetap ada sesudah penjarangan", () => {
  let t = [];
  for (let i = 0; i < 1500; i++) { t = F.tambahTitikJejak(t, [-2.2 + i * 0.001, 113.9, 1e12 + i * 31000]); assert.ok(t.length <= 500, `terlalu banyak di ${i}`); }
  assert.equal(t[0][2], 1e12); assert.equal(t.at(-1)[2], 1e12 + 1499 * 31000);
  assert.ok(t.every((x, i) => i === 0 || x[2] > t[i - 1][2]), "urutan waktu tetap menaik");
  assert.ok(F.panjangJejakM(t) > 100000);
});

/* kasus yang dijalankan KLIEN dan SERVER; keduanya harus sepakat sah atau tidak */
const KASUS = [
  ["periksa", {langkah: "tiba", waktu: KINI}, true], ["periksa", {langkah: "Tiba", waktu: KINI}, false], ["periksa", {langkah: "t", waktu: KINI}, false], ["periksa", {langkah: "tiba"}, false],
  ["periksa", {langkah: "tiba", waktu: KINI, petak_id: "L1"}, true], ["periksa", {langkah: "tiba", waktu: KINI, petak_id: "L/1"}, false],
  ["sos", {...POS, waktu: KINI}, true], ["sos", {...POS, waktu: KINI, pesan: "ular"}, true], ["sos", {lat: 40, lon: 113.9, waktu: KINI}, false], ["sos", {lat: -2.2, waktu: KINI}, false], ["sos", {...POS, waktu: KINI, pesan: "x".repeat(201)}, false],
  ["tekanan", {titik: "lance", bar: 2.5, waktu: KINI}, true], ["tekanan", {titik: "selang", bar: 2.5, waktu: KINI}, false], ["tekanan", {titik: "pompa", bar: 25.1, waktu: KINI}, false], ["tekanan", {titik: "pompa", bar: -0.1, waktu: KINI}, false], ["tekanan", {titik: "pompa", bar: 25, waktu: KINI}, true],
  ["bor", {...POS, kedalaman_cm: 0, waktu: KINI}, true], ["bor", {...POS, kedalaman_cm: 1500, waktu: KINI}, true], ["bor", {...POS, kedalaman_cm: 1500.5, waktu: KINI}, false], ["bor", {...POS, waktu: KINI}, false], ["bor", {...POS, kedalaman_cm: 80, waktu: KINI, catatan: "x".repeat(201)}, false],
  ["debit", {...POS, metode: "pelampung", lebar_m: 2, dalam_m: 0.5, kecepatan_ms: 0.3, waktu: KINI}, true], ["debit", {...POS, metode: "ember", volume_l: 20, detik: 8, waktu: KINI}, true], ["debit", {...POS, metode: "ember", volume_l: 20, detik: 0.4, waktu: KINI}, false],
  ["debit", {...POS, metode: "pelampung", lebar_m: 2, dalam_m: 0.5, waktu: KINI}, false], ["debit", {...POS, metode: "kolam", waktu: KINI}, false], ["debit", {...POS, metode: "pelampung", lebar_m: 501, dalam_m: 1, kecepatan_ms: 1, waktu: KINI}, false],
  ["selesai", {waktu: KINI, alat_kembali: ["P-101", "SF-101"], alat_hilang: ["C-101"]}, true], ["selesai", {waktu: KINI, alat_hilang: ["p-101"]}, false], ["selesai", {waktu: KINI}, true], ["selesai", {waktu: KINI, catatan: "x".repeat(501)}, false], ["selesai", {waktu: KINI, alat_kembali: "P-101"}, false],
  ["jejak", {titik: [[-2.2, 113.9, KINI], [-2.201, 113.9, KINI + 1]], moda: "jalan_kaki"}, true], ["jejak", {titik: [[-2.2, 113.9, KINI]], moda: "jalan_kaki"}, false], ["jejak", {titik: [[-2.2, 113.9, KINI], [-2.201, 113.9, KINI + 1]], moda: "terbang"}, false],
  ["jejak", {titik: [[-2.2, 113.9, KINI], [60, 113.9, KINI + 1]], moda: "perahu"}, false], ["jejak", {titik: Array.from({length: 501}, (_, i) => [-2.2, 113.9, KINI + i]), moda: "kendaraan"}, false], ["jejak", {titik: Array.from({length: 500}, (_, i) => [-2.2, 113.9, KINI + i]), moda: "kendaraan"}, true],
];
test("cekFase2 sepakat dengan cekLapangan server pada semua kasus sah dan tidak sah (jejak, SOS, bor, debit, tekanan, periksa, selesai)", () => {
  for (const [jenis, data, sah] of KASUS) {
    const klien = F.cekFase2(jenis, data).ok, server = !("galat" in cekLapangan(jenis, data, KINI));
    assert.equal(server, sah, `server ${jenis} ${JSON.stringify(data).slice(0, 80)}`);
    assert.equal(klien, sah, `klien ${jenis} ${JSON.stringify(data).slice(0, 80)}`);
  }
});

test("cekFase2: jenis asing, butir bukan objek, dan medan tak dikenal ditolak dengan nama medannya", () => {
  assert.equal(F.cekFase2("foto", {}).galat[0].medan, "jenis"); assert.equal(F.cekFase2("sos", null).galat[0].medan, "butir"); assert.equal(F.cekFase2("sos", []).ok, false);
  assert.deepEqual(F.cekFase2("sos", {...POS, waktu: KINI, pangkat: 1}).galat.map(g => g.medan), ["pangkat"]);
  assert.deepEqual(F.cekFase2("debit", {...POS, metode: "ember", volume_l: 20, detik: 8, waktu: KINI, debit_lps: 99}).galat.map(g => g.medan), ["debit_lps"], "debit dihitung server, klien tidak mengirimnya");
});

test("urutan kerja renlap: sembilan langkah kode a-z0-9_ sah di server; lima tahap foto sama dengan server", async () => {
  assert.equal(F.LANGKAH_PERIKSA.length, 9);
  for (const [kode] of F.LANGKAH_PERIKSA) assert.ok(!("galat" in cekLapangan("periksa", {langkah: kode, waktu: KINI}, KINI)), kode);
  const S = await import("../../src/sippa_lapangan.js");
  assert.deepEqual(F.TAHAP_FOTO.map(t => t[0]), S.TAHAP_FOTO); assert.deepEqual(F.JENIS_FASE2, S.JENIS_LAP);
});

test("inspeksi tunggu_suku_cadang: sah di form inspeksi lapangan; tindakan terdaftar; tindakan liar tetap ditolak", () => {
  const dasar = {id: "0".repeat(16), jenis: "pasca_gelar", sasaran_jenis: "komponen", sasaran_id: "0123456789abcdef", skor: 2};
  assert.equal(F.cekButir("inspeksi", {...dasar, tindakan: "tunggu_suku_cadang"}).ok, true);
  assert.equal(F.cekButir("inspeksi", {...dasar, tindakan: "bakar"}).ok, false);
  assert.ok(F.INSPEKSI_LAPANGAN.tindakan.includes("tunggu_suku_cadang"));
  const b = L.bangunInspeksi({jenis: "pasca_gelar", nilai: [{sasaran_jenis: "komponen", sasaran_id: "0123456789abcdef", kode_bom: "P-101", skor: 2}, {sasaran_jenis: "komponen", sasaran_id: "fedcba9876543210", kode_bom: "SF-101", skor: 0}],
    tunggu: new Set(["0123456789abcdef", "fedcba9876543210"])}, KINI);
  assert.equal(b[0].tindakan, "tunggu_suku_cadang"); assert.equal("tindakan" in b[1], false, "komponen baik tidak menunggu suku cadang");
  assert.equal("tindakan" in L.bangunInspeksi({jenis: "pra_gelar", nilai: [{sasaran_jenis: "komponen", sasaran_id: "0123456789abcdef", kode_bom: "P-101", skor: 2}]}, KINI)[0], false);
});

test("daftarAlat dan bangunSelesai: alat unik urut kode; yang tidak ditandai hilang dianggap kembali; kode ketikan dibersihkan; tanpa daftar server semua lewat kolom ketik", () => {
  const kit = {komponen: [{kode_bom: "SF-101", nama: "Saringan"}, {kode_bom: "P-101", nama: "Pompa"}, {kode_bom: "P-101", nama: "Pompa"}, {kode_bom: 7}]};
  const alat = L.daftarAlat(kit); assert.deepEqual(alat.map(a => a.kode_bom), ["P-101", "SF-101"]); assert.deepEqual(L.daftarAlat({}), []); assert.deepEqual(L.daftarAlat(null), []);
  const d = L.bangunSelesai({alat, hilang: ["SF-101"], catatan: " selang bocor "}, KINI);
  assert.deepEqual(d, {waktu: KINI, alat_kembali: ["P-101"], alat_hilang: ["SF-101"], catatan: "selang bocor"});
  assert.ok(F.cekFase2("selesai", d).ok && !("galat" in cekLapangan("selesai", d, KINI)));
  const k = L.bangunSelesai({alat: [], ketik: "c-101, p-102;c-101  i-101"}, KINI); assert.deepEqual(k.alat_hilang, ["C-101", "P-102", "I-101"]); assert.deepEqual(k.alat_kembali, []);
  assert.equal(F.cekFase2("selesai", L.bangunSelesai({alat: [], ketik: "bukan kode"}, KINI)).ok, false, "kode ngawur ditolak sebelum antre");
});

test("titikKumpul: teks atau objek dari data tugas; tanpa data = null (layar menyebut belum dicatat)", () => {
  assert.deepEqual(L.titikKumpul({titik_kumpul: " Ujung jalan desa "}), {nama: "Ujung jalan desa"});
  assert.deepEqual(L.titikKumpul({titik_kumpul: {nama: "Parkir", lat: -2.2, lon: 113.9}}), {nama: "Parkir", lat: -2.2, lon: 113.9});
  assert.deepEqual(L.titikKumpul({titik_kumpul: {nama: "Parkir", lat: "x"}}), {nama: "Parkir", lat: undefined, lon: undefined});
  assert.equal(L.titikKumpul({}), null); assert.equal(L.titikKumpul(null), null); assert.equal(L.titikKumpul({titik_kumpul: "  "}), null);
});

test("kalimatDebit: angka id-ID dibanding 5 liter per detik; isian belum lengkap = kalimat petunjuk", () => {
  assert.match(L.kalimatDebit(255), /^Debit 255 liter per detik, cukup untuk satu kit \(butuh 5 liter per detik\)\.$/);
  assert.match(L.kalimatDebit(2.5), /2,5 liter per detik, kurang/); assert.match(L.kalimatDebit(null), /Isi semua kolom/);
});

/* ---------- antrean luring jenis baru ---------- */
let nomor = 0;
const KODE = "0123456789abcdef0123456789";
function idbPalsu() {
  const isi = {butir: new Map(), foto: new Map()};
  const minta = f => { const r = {}; queueMicrotask(() => { try { r.result = f(); r.onsuccess?.({target: r}); } catch (e) { r.error = e; r.onerror?.({target: r}); } }); return r; };
  const db = {createObjectStore: () => ({}), transaction: nama => ({objectStore: () => ({
    put: v => minta(() => { isi[nama].set(v.id, structuredClone(v)); return v.id; }), get: k => minta(() => structuredClone(isi[nama].get(k))),
    getAll: () => minta(() => [...isi[nama].values()].map(v => structuredClone(v))), delete: k => minta(() => { isi[nama].delete(k); })})})};
  return {isi, open: () => { const q = {}; queueMicrotask(() => { q.result = db; q.onupgradeneeded?.({target: q}); q.onsuccess?.({target: q}); }); return q; }};
}
async function siap(balas) {
  const idb = idbPalsu(), m = new Map(); globalThis.indexedDB = idb;
  globalThis.localStorage = {getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k), key: i => [...m.keys()][i] ?? null, get length() { return m.size; }};
  m.set("sippa.kode", KODE);
  const panggilan = []; globalThis.fetch = async (url, init = {}) => { panggilan.push({url, badan: typeof init.body === "string" ? JSON.parse(init.body) : init.body}); const j = await balas(panggilan.at(-1)); return {ok: j.status < 300, status: j.status, json: async () => j.json ?? {}}; };
  return {A: await import(`../../public/pipa/antre.js?fase2=${++nomor}`), idb, panggilan};
}
const diterima = r => ({status: 200, json: Array.isArray(r.badan) || r.badan?.get ? {foto_id: "f".repeat(16)} : {diterima: Object.values(r.badan).filter(Array.isArray).flat().map(b => b.id), ganda: [], ditolak: [], jam_server: Date.now()}});
const T1 = {tugas_id: "T1"};

test("antre fase 2: tujuh jenis baru tersimpan luring tanpa fetch, terkirim dalam larik bernama jenisnya, antrean kosong sesudahnya", async () => {
  const {A, idb, panggilan} = await siap(diterima);
  const butir = [["periksa", {langkah: "tiba", waktu: KINI}], ["sos", {...POS, waktu: KINI}], ["tekanan", {titik: "lance", bar: 2.4, waktu: KINI}], ["jejak", {titik: [[-2.2, 113.9, KINI], [-2.3, 113.9, KINI + 1]], moda: "perahu"}],
    ["selesai", {waktu: KINI, alat_kembali: ["P-101"], alat_hilang: []}], ["bor", {...POS, kedalaman_cm: 120, waktu: KINI}], ["debit", {...POS, metode: "ember", volume_l: 20, detik: 8, waktu: KINI}]];
  for (const [jenis, data] of butir) assert.equal((await A.tambah({jenis, data, tugas_id: "T1"})).ok, true, jenis);
  assert.equal(panggilan.length, 0); assert.equal(idb.isi.butir.size, 7);
  const h = await A.kirimSemua(T1);
  assert.equal(panggilan.length, 1); assert.equal(h.diterima, 7);
  for (const [jenis] of butir) assert.equal(panggilan[0].badan[jenis].length, 1, jenis);
  assert.deepEqual(panggilan[0].badan.log, []); assert.equal((await A.jumlah()).total, 0);
});

test("antre fase 2: butir yang melanggar kontrak ditolak saat tambah dan tidak masuk antrean (SOS di luar Indonesia, bor 2000 cm, debit tanpa metode)", async () => {
  const {A, idb} = await siap(diterima);
  for (const [jenis, data] of [["sos", {lat: 51, lon: 0, waktu: KINI}], ["bor", {...POS, kedalaman_cm: 2000, waktu: KINI}], ["debit", {...POS, waktu: KINI}]]) {
    const r = await A.tambah({jenis, data, tugas_id: "T1"}); assert.equal(r.ok, false, jenis); assert.ok(r.galat.length);
  }
  assert.equal(idb.isi.butir.size, 0);
});

test("antre fase 2: foto bukti berdiri sendiri berangkat lewat /lapangan/foto dengan tahap, lat, lon; tanpa lokasi atau dengan tahap asing ditolak sebelum disimpan", async () => {
  const {A, idb, panggilan} = await siap(diterima);
  const jpeg = {type: "image/jpeg", size: 10};
  assert.equal((await A.tambahFoto(jpeg, null, {tahap: "tiba", tugas_id: "T1"})).ok, false, "tanpa GPS");
  assert.equal((await A.tambahFoto(jpeg, null, {tahap: "siang", lat: -2.2, lon: 113.9, tugas_id: "T1"})).ok, false, "tahap asing");
  assert.equal(idb.isi.foto.size, 0);
  assert.equal((await A.tambahFoto(jpeg, null, {tahap: "injeksi", lat: -2.123456789, lon: 113.9, tugas_id: "T1"})).ok, true);
  assert.equal(panggilan.length, 0);
  await A.kirimSemua(T1);
  assert.equal(panggilan.length, 1); assert.match(panggilan[0].url, /\/api\/sippa\/lapangan\/foto$/);
  const fd = panggilan[0].badan; assert.equal(fd.get("tahap"), "injeksi"); assert.equal(fd.get("lat"), "-2.123457"); assert.equal(fd.get("lon"), "113.9");
  assert.match(fd.get("lat"), /^-?\d{1,3}(\.\d{1,10})?$/, "format yang diterima server");
  assert.equal(idb.isi.foto.size, 0, "foto terhapus sesudah terkirim");
});

test("antre fase 2: foto bukti tugas lain tidak ikut berangkat dengan kode tugas ini; foto lama (log) tetap hanya milik butir tugasnya", async () => {
  const {A, panggilan} = await siap(diterima);
  await A.tambahFoto({type: "image/jpeg", size: 10}, null, {tahap: "tiba", lat: -2.2, lon: 113.9, tugas_id: "T2"});
  await A.kirimSemua(T1); assert.equal(panggilan.length, 0);
  await A.kirimSemua({tugas_id: "T2"}); assert.equal(panggilan.length, 1);
});
