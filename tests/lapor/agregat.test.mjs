/* Agregat Lapor Bencana (src/lapor_agregat.js, KEPUTUSAN-LAPOR-AI D91): minggu ISO WIB, sel kecil, median. node --test tests/lapor/agregat.test.mjs */
import test from "node:test";
import assert from "node:assert/strict";
import {agregat, mingguIso, keCsv} from "../../src/lapor_agregat.js";

test("minggu ISO memakai tanggal WIB", () => {
  assert.equal(mingguIso(Date.UTC(2026, 10, 19, 3)), "2026-W47");
  assert.equal(mingguIso(Date.UTC(2026, 0, 4, 18)), "2026-W02", "Minggu 4 Jan pukul 01.00 WIB = Senin 5 Jan, minggu 2");
  assert.equal(mingguIso(Date.UTC(2027, 0, 1, 0)), "2026-W53");
});

test("sel terbuka mulai 3 pelapor berbeda; median menit hanya dari laporan berwaktu kejadian", () => {
  const t = Date.UTC(2026, 10, 18, 3), l = (wa, menit, x = {}) => ({provKode: "31", prov: "DKI", kabKode: "31.75", kab: "Jaktim", jenis: "Banjir", kejadian: t, terkirim: t + menit * 6e4, wa, fotoSah: false, status: "baru", ...x});
  const dua = agregat([l("a", 10), l("b", 20), l("a", 30)]);
  assert.equal(dua[0].laporan, "<3"); assert.equal(dua[0].pelapor, "<3");
  const tiga = agregat([l("a", 10), l("b", 20), l("c", 40, {fotoSah: true, status: "tidak_valid"}), l("c", 5, {kejadian: null})]);
  assert.deepEqual([tiga[0].laporan, tiga[0].pelapor, tiga[0].berfoto_sah, tiga[0].tidak_valid, tiga[0].median_menit_lapor], [4, 3, 1, 1, 20]);
  assert.equal(agregat([{...l("a", 1), kabKode: null}]).length, 0, "tanpa kab tidak dihitung");
  assert.ok(keCsv(tiga).split("\n")[1].includes(",4,3,1,1,20,belum tersedia"));
});

import {cakupanMeja, dalamWilayah, bolehAksi, bakuKab} from "../../src/lapor_meja_hak.js";
test("hak meja: akun lembaga bernama kab (instansi_akun.kab) dicocokkan dengan nama wilayah laporan, Bogor bukan Kota Bogor", () => {
  const kab = cakupanMeja({jenis: "pemkab", tingkat: "kab", prov: "32", kab: "Bogor", wilayah: "Pemerintah Kabupaten Bogor", status: "aktif"});
  const kota = cakupanMeja({jenis: "pemkot", tingkat: "kab", prov: "31", kab: "Kota Jakarta Timur", status: "aktif"});
  assert.equal(dalamWilayah(kab, {provKode: "32", kab: "Bogor", kabKode: "32.01"}), true);
  assert.equal(dalamWilayah(kab, {provKode: "32", kab: "Kota Bogor", kabKode: "32.71"}), false);
  assert.equal(dalamWilayah(kota, {provKode: "31", kab: "Kota Administrasi Jakarta Timur"}), true);
  assert.equal(bakuKab("Kabupaten Bogor"), "bogor");
  assert.equal(cakupanMeja({jenis: "polres", tingkat: "kab", prov: "32", kab: "Bogor", status: "aktif"}), null, "Q54: polres belum");
  assert.equal(cakupanMeja({jenis: "pemkab", tingkat: "kab", prov: "32", kab: "Bogor", status: "menunggu"}), null);
  assert.equal(bolehAksi(kab, "status", "selesai", "ditelaah"), false); assert.equal(bolehAksi(cakupanMeja({bnpb: true}), "status", "selesai", "ditelaah"), true);
  assert.equal(dalamWilayah(kab, null), false, "laporan tanpa wilayah hanya BNPB");
});

test("hak meja: BPBD tidak bisa meneruskan lewat jalur status (D97, tinjauan keamanan)", () => {
  const kab = cakupanMeja({jenis: "pemkab", tingkat: "kab", prov: "32", kab: "Bogor", status: "aktif"});
  assert.equal(bolehAksi(kab, "status", "ditelaah", "diteruskan"), false);
  assert.equal(bolehAksi(kab, "status", "ditelaah", "ditindaklanjuti"), true);
  assert.equal(bolehAksi(cakupanMeja({bnpb: true}), "status", "ditelaah", "diteruskan"), true);
});

import {dariIndonesia} from "../../src/lapor_bahasa.js";
test("terjemahan keluar: nomor HP dan nama pelapor tidak sampai ke AI, nama dipulihkan (D12, tinjauan keamanan tahap 2)", async () => {
  let dikirim = "";
  const model = async ({teks}) => { dikirim = teks; const o = JSON.parse(teks); return {teks: o.teks.replace("Terima kasih", "Matur nuwun"), pilihan: o.pilihan, ket: o.ket}; };
  const h = await dariIndonesia(model, {teks: "Terima kasih Budi Santoso. Hubungi 0812 3456 7890. Tiket LA-191126-01, 3 rumah.", pilihan: ["Kirim"], ket: [""], nama: "Budi Santoso"}, "jv");
  assert.ok(!dikirim.includes("Budi") && !dikirim.includes("3456"), dikirim);
  assert.match(h.teks, /^Matur nuwun Budi Santoso/); assert.match(h.teks, /LA-191126-01/);
  const ubahAngka = async ({teks}) => { const o = JSON.parse(teks); return {teks: o.teks.replace("3 rumah", "5 rumah"), pilihan: o.pilihan, ket: o.ket}; };
  assert.match((await dariIndonesia(ubahAngka, {teks: "Ada 3 rumah rusak.", nama: null}, "jv")).teks, /^Ada 3 rumah/, "angka berubah = Indonesia");
});

import {terjemahUi, HURUF_PANGGILAN} from "../../src/lapor_bahasa.js";
test("terjemah teks layar: daftar panjang dipotong per panggilan, satu potongan gagal tidak menggagalkan yang lain (privasi bahasa Bali 20 Nov 2026)", async () => {
  const p = "Laporan dan identitas Anda hanya dapat dibaca petugas BNPB dan BPBD yang menangani kejadian. Laporan tidak ditampilkan di halaman publik.";
  const daftar = Array.from({length: 40}, (_, i) => `${p} Bagian ${i}.`), panggil = [];
  const model = async ({teks}) => { const o = JSON.parse(teks); panggil.push(o.teks.length);
    assert.ok(o.teks.join("").length <= HURUF_PANGGILAN, "satu panggilan tidak melewati batas huruf");
    if (o.teks.some(t => t.includes("Bagian 0."))) return null;   // potongan pertama gagal (mis. max_tokens)
    return {teks: o.teks.map(t => `[BAN] ${t}`)}; };
  const h = await terjemahUi(model, daftar, "ban");
  assert.ok(panggil.length > 1, "lebih dari satu panggilan");
  assert.equal(h.length, 40);
  assert.equal(h[0], null, "potongan gagal tetap null");
  assert.equal(h[39], `[BAN] ${daftar[39]}`, "urutan terjaga, potongan lain tetap diterjemahkan");
  assert.equal(h.filter(Boolean).length, 40 - panggil[0]);
  const panjang = "a".repeat(590) + " 1";
  assert.equal((await terjemahUi(async ({teks}) => ({teks: JSON.parse(teks).teks}), [panjang], "ban"))[0], panjang, "paragraf 590 huruf tidak terpotong");
});
