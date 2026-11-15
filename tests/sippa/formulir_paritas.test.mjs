/* KP-18 b: validasi SIPPA lewat spek bersama (public/inti/spek.js) berperilaku sama dengan salinan lama yang dibeku di fixtures/formulir_lama.mjs.
   Dibandingkan: ok, himpunan medan galat (butir), ok dan data simpan (fase 2 server), pada contoh bangkitan dari MEDAN plus kasus tangan. Pesan boleh beda (kini dari spek bersama).
   Jalankan: node --test tests/sippa/formulir_paritas.test.mjs */
import test from "node:test";
import assert from "node:assert/strict";
import {MEDAN, MEDAN_INSPEKSI, cekButir, cekFase2, periksaFase2, JENIS_FASE2} from "../../public/pipa/formulir.js";
import {cekLapangan} from "../../src/sippa_lapangan.js";
import {cekButirLama, cekFase2Lama, cekLapanganLama} from "./fixtures/formulir_lama.mjs";

const KINI = Date.parse("2026-11-15T05:00:00Z");
const sah = m => ({teks: "abcdefghijklmnopqrstuvwxyz".slice(0, m.panjang?.[0] ?? Math.max(m.min ?? 1, 1)), angka: Math.max(m.min ?? 0, 0) + (m.minEksklusif ? 1 : 0), bulat: Math.max(m.min ?? 0, 1), waktu: 1700000000000,
  pilihan: m.pilihan?.[0], bool: 1, json: "{}"})[m.tipe];
const rusak = m => ({teks: [5, "x".repeat((m.maks ?? 50) + 1), ""], angka: ["1", (m.maks ?? 1e9) + 1, (m.min ?? 0) - 1, NaN], bulat: [1.5, "2"], waktu: [1.5, "7"], pilihan: ["zzz", null], bool: [2, "1"], json: ["{bukan"]})[m.tipe] ?? [];

test("cekButir baru = lama (ok dan himpunan medan gagal) pada semua jenis, termasuk inspeksi dan lengan_dalam", () => {
  let total = 0, tolak = 0;
  for (const [jenis, def] of [...Object.entries(MEDAN), ["inspeksi", MEDAN_INSPEKSI]]) {
    const ms = Object.values(def), dasar = Object.fromEntries(ms.filter(m => m.wajib).map(m => [m.nama, sah(m)]));
    const s = [{}, dasar, {...dasar, liar: 1}, null, [], "x"];
    for (const m of ms) { s.push({...dasar, [m.nama]: sah(m)}); for (const r of rusak(m)) s.push({...dasar, [m.nama]: r}); }
    if (jenis === "log") s.push({...dasar, t_tiba: 10, t_mulai_gelar: 5}, {...dasar, banjir_m3: 3}, {...dasar, jenis: "banjir", banjir_m3: 3});
    if (jenis === "gerak") s.push({...dasar, rencana: 1}, {...dasar, rencana: 0}, {...dasar, tiba: 1700000000000});
    if (jenis === "probe") for (const cm of [10, 100, 150, 500, 77]) s.push({...dasar, kedalaman_cm: cm});
    for (const x of s) for (const opsi of [{}, {lengan_dalam: 1}]) {
      const l = cekButirLama(jenis, x, opsi), b = cekButir(jenis, x, opsi); total++;
      assert.equal(b.ok, l.ok, `${jenis} ${JSON.stringify(x)?.slice(0, 100)}`);
      assert.deepEqual(b.galat.map(g => g.medan).sort(), l.galat.map(g => g.medan).sort(), `${jenis} ${JSON.stringify(x)?.slice(0, 100)}`);
    }
    for (const x of [null, [], "x"]) assert.deepEqual(cekButir(jenis, x), cekButirLama(jenis, x), "bentuk non-objek identik");
  }
  assert.deepEqual(cekButir("nyasar", {}), cekButirLama("nyasar", {}));
  assert.ok(total > 300, `${total} contoh`);
});

const POS = {lat: -2.2, lon: 113.9}, W = {waktu: KINI}, T = [[-2.2, 113.9, KINI], [-2.201, 113.9, KINI + 1]];
const DAS = {periksa: {langkah: "tiba", ...W}, sos: {...POS, ...W}, tekanan: {titik: "lance", bar: 2.5, ...W}, jejak: {titik: T, moda: "perahu"}, selesai: {...W, alat_kembali: ["P-101"], alat_hilang: ["C-101"]},
  bor: {...POS, kedalaman_cm: 80, ...W}, debit: {...POS, metode: "ember", volume_l: 20, detik: 8, ...W}};
const UBAH = {
  periksa: [{langkah: "A"}, {langkah: 5}, {langkah: undefined}, {petak_id: "p 1"}, {petak_id: "@@"}, {waktu: 0}, {waktu: "1"}, {waktu: KINI - 40 * 864e5}, {waktu: KINI + 9e6}],
  sos: [{lat: 40}, {lon: 90}, {lat: "1"}, {pesan: "x".repeat(200)}, {pesan: "x".repeat(201)}, {pesan: 5}, {pesan: "  "}, {pesan: "a​b"}],
  tekanan: [{titik: "selang"}, {bar: -0.1}, {bar: 25}, {bar: 25.1}, {bar: "2"}, {petak_id: "ok-1"}],
  jejak: [{moda: "terbang"}, {titik: [T[0]]}, {titik: [...T, [95, 1, 1]]}, {titik: [[1, 2]]}, {titik: "x"}, {liar: 1}, {petak_id: "ok"}],
  selesai: [{alat_kembali: "P-101"}, {alat_kembali: ["p-101"]}, {alat_hilang: [5]}, {alat_kembali: ["P-1", "P-1"]}, {catatan: "x".repeat(501)}, {catatan: "ok"}, {catatan: 7}],
  bor: [{kedalaman_cm: 0}, {kedalaman_cm: 1500}, {kedalaman_cm: 1500.5}, {kedalaman_cm: undefined}, {catatan: "x".repeat(201)}, {petak_id: "A1"}],
  debit: [{metode: "kolam"}, {detik: 0.4}, {detik: 0.5}, {volume_l: 0}, {metode: "pelampung", lebar_m: 2, dalam_m: 0.5, kecepatan_ms: 0.3}, {metode: "pelampung", lebar_m: 2, dalam_m: 0.5},
    {metode: "pelampung", lebar_m: 501, dalam_m: 1, kecepatan_ms: 1}, {metode: "pelampung", lebar_m: 2, dalam_m: 0.5, kecepatan_ms: 0.3, volume_l: 5, detik: 3}],
};
test("fase 2: server baru = lama (ok dan data simpan) dan klien baru = lama (ok dan himpunan medan gagal)", () => {
  let total = 0;
  for (const jenis of JENIS_FASE2) for (const u of [{}, ...UBAH[jenis]]) {
    const x = {...DAS[jenis], ...u};
    const sl = cekLapanganLama(jenis, x, KINI), sb = cekLapangan(jenis, x, KINI); total++;
    assert.equal("galat" in sb, "galat" in sl, `server ${jenis} ${JSON.stringify(u)}`);
    if (!sl.galat) assert.deepEqual(sb, sl, `data ${jenis} ${JSON.stringify(u)}`);
    const kl = cekFase2Lama(jenis, x), kb = cekFase2(jenis, x);
    assert.equal(kb.ok, kl.ok, `klien ${jenis} ${JSON.stringify(u)}`);
    if (jenis !== "debit") assert.deepEqual(kb.galat.map(g => g.medan).sort(), kl.galat.map(g => g.medan).sort(), `klien medan ${jenis} ${JSON.stringify(u)}`);   // debit: lama menunjuk volume_l untuk detik salah; baru menunjuk medan yang benar
  }
  for (const x of [null, [], "x"]) for (const j of [...JENIS_FASE2, "foto"]) assert.deepEqual(cekFase2(j, x), cekFase2Lama(j, x));
  assert.ok(total > 50, `${total} contoh`);
});

test("fase 2 server tetap longgar: medan asing diabaikan; klien tetap ketat", () => {
  const x = {...DAS.sos, pangkat: 1};
  assert.equal(periksaFase2("sos", x, {longgar: true}).ok, true);
  assert.deepEqual(cekLapangan("sos", x, KINI), cekLapanganLama("sos", x, KINI));
  assert.equal(cekFase2("sos", x).ok, false);
});
