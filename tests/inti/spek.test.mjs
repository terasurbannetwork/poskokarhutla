/* KP-16: spek bersama. T9 satu implementasi (Worker = peramban), T10 adapter meja sepakat dengan validasi lama, adapter pipa sepakat dengan cekButir.
   Jalankan: node --test tests/inti/spek.test.mjs */
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import "../../src/worker.js";   // worker.js dulu: posko.js dan worker.js saling impor
import {MEJA, validasi, teksBersih} from "../../src/meja_spek.js";
import {MEDAN, cekButir, URUTAN_WAKTU} from "../../public/pipa/formulir.js";
import * as Worker from "../../src/../public/inti/spek.js";            // jalur impor Worker (src/sippa.js memuat public/pipa/formulir.js begini)
import * as Peramban from "../../public/inti/spek.js?peramban";        // instansi modul lain, seperti <script type="module"> di peramban
const {periksa, dariMeja, dariPipa, dariKolom, templatKolom, tampil, formatRupiah, uraiRupiah} = Worker;
const KINI = Date.parse("2026-11-15T05:00:00Z"), hari = n => new Date(KINI + 7 * 36e5 - n * 864e5).toISOString().slice(0, 10);

/* ---- pembangkit contoh: isi sah per kolom, lalu mutasi tiap kolom ---- */
const sah = c => ({teks: "Uji", angka: c.desimal ? 1.5 : Math.max(c.min ?? 0, 1), pilih: c.nilai?.[0], multi: c.nilai ? [c.nilai[0]] : [], ya: true, tanggal: hari(1), tautan: "https://contoh.id/x", gudang: "0123456789abcdef"})[c.tipe];
const rusak = c => ({teks: [123, "   ", ...((c.maks ?? 120) < 5000 ? ["x".repeat((c.maks ?? 120) + 1)] : []), "hubungi 081234567890"], angka: ["abc", -5, (c.maks ?? 1e9) + 1, 1.25, true], pilih: ["zzz", 5], multi: [["zzz"], "a", [c.nilai?.[0], c.nilai?.[0]]], ya: ["ya", 1], tanggal: ["2026-13-40", "1999-01-01", hari(-30), 5], tautan: ["ftp://x", "bukan url", 7], gudang: ["xyz", 5]})[c.tipe] || [];
function contohMeja(M, tahap) {
  const kol = M.kolom.filter(c => (c.tahap ?? null) === tahap && c.tipe !== "wilayah"), dasar = Object.fromEntries(kol.filter(c => c.wajib).map(c => [c.nama, sah(c)])), out = [{}, dasar, {...dasar, liar: 1}];
  for (const c of kol) { out.push({...dasar, [c.nama]: sah(c)}); for (const r of rusak(c)) out.push({...dasar, [c.nama]: r}); if (c.wajib) { const {[c.nama]: _, ...tanpa} = dasar; out.push(tanpa); out.push({...dasar, [c.nama]: ""}); } }
  return out;
}
const bidang = (M, tahap, g) => { const kol = M.kolom.filter(c => (c.tahap ?? null) === tahap); if (g.startsWith("kolom \"")) return g.slice(7, g.indexOf("\"", 7)); return kol.filter(c => g.startsWith(c.label)).sort((a, b) => b.label.length - a.label.length)[0]?.nama ?? ""; };

test("T10: dariMeja sepakat dengan validasi lama pada ok dan medan pertama yang gagal, semua meja dan tahap", () => {
  let total = 0, tolak = 0;
  for (const M of Object.values(MEJA)) for (const tahap of [null, ...new Set(M.kolom.map(c => c.tahap).filter(Boolean))]) {
    const spek = dariMeja(M, {tahap, bersih: teksBersih});
    for (const s of contohMeja(M, tahap)) {
      const lama = validasi(M.id, s, tahap, KINI), baru = periksa(spek, s, {kini: KINI}); total++;
      assert.equal(baru.ok, !lama.galat, `${M.id}/${tahap} ${JSON.stringify(s).slice(0, 120)} lama=${lama.galat} baru=${JSON.stringify(baru.galat[0])}`);
      if (lama.galat) { tolak++; assert.equal(baru.galat[0].nama, bidang(M, tahap, lama.galat), `${M.id} ${lama.galat}`); }
      else assert.deepEqual(baru.data, Object.fromEntries(Object.entries(lama.data).filter(([k]) => k in baru.data)), `${M.id} data ternormalkan sama`);
    }
  }
  assert.ok(total > 500 && tolak > 100, `${total} contoh, ${tolak} ditolak`);
});

test("T10: aturan lintas medan cek meja ikut, dan tampil_jika dari bila", () => {
  const kaji = dariMeja(MEJA.kaji_cepat), dasar = {kejadian: "banjir", tanggal: hari(1)};
  for (const c of MEJA.kaji_cepat.kolom.filter(c => c.wajib && !(c.nama in dasar))) dasar[c.nama] = sah(c);
  assert.equal(periksa(kaji, dasar, {kini: KINI}).ok, true);
  const r = periksa(kaji, {...dasar, rek_status: "ya"}, {kini: KINI}); assert.equal(r.ok, false); assert.match(r.galat[0].pesan, /lama status/);
  const dampak = dariMeja(MEJA.dampak), bila = dampak.kolom.find(c => c.tampil_jika?.bila);
  assert.ok(bila && !tampil(bila, {}) && tampil(bila, {[bila.tampil_jika.bila[0]]: 3}));
});

/* ---- pipa ---- */
const sahP = m => ({teks: "abcdefghijklmnopqrstuvwxyz".slice(0, m.panjang?.[0] ?? Math.max(m.min ?? 1, 1)), angka: Math.max(m.min ?? 0, 0) + (m.minEksklusif ? 1 : 0), bulat: Math.max(m.min ?? 0, 1), waktu: 1700000000, pilihan: m.pilihan?.[0], bool: 1, json: "{}"})[m.tipe];
const rusakP = m => ({teks: [5, "x".repeat((m.maks ?? 50) + 1)], angka: ["1", (m.maks ?? 1e9) + 1, (m.min ?? 0) - 1], bulat: [1.5, "2"], waktu: [1.5], pilihan: ["zzz"], bool: [2, "1"], json: ["{bukan"]})[m.tipe] || [];
const cekPipa = jenis => jenis === "log" ? b => {
  const g = [], def = MEDAN.log;
  for (const [a, z] of URUTAN_WAKTU) if (Number.isInteger(b[a]) && Number.isInteger(b[z]) && b[z] < b[a]) g.push({nama: z, pesan: "urutan"});
  if (b.banjir_m3 != null && b.jenis !== "banjir") g.push({nama: "banjir_m3", pesan: "hanya banjir"}); return g;
} : jenis === "gerak" ? b => [undefined, null, 0].includes(b.rencana) && b.tiba == null ? [{nama: "tiba", pesan: "wajib"}] : [] : undefined;
test("T9: dariPipa sepakat dengan cekButir (ok dan himpunan medan gagal)", () => {
  let total = 0;
  for (const [jenis, def] of Object.entries(MEDAN)) {
    const spek = dariPipa(def, cekPipa(jenis)), ms = Object.values(def), dasar = Object.fromEntries(ms.filter(m => m.wajib).map(m => [m.nama, sahP(m)]));
    const s = [{}, dasar, {...dasar, liar: 1}, {...dasar, catatan: "x"}];
    for (const m of ms) { s.push({...dasar, [m.nama]: sahP(m)}); for (const r of rusakP(m)) s.push({...dasar, [m.nama]: r}); }
    if (jenis === "log") s.push({...dasar, t_tiba: 20, t_mulai_gelar: 10}, {...dasar, jenis: "karhutla", banjir_m3: 5});
    if (jenis === "gerak") s.push({...dasar, rencana: 0}, {...dasar, rencana: 1});
    for (const b of s) {
      const lama = cekButir(jenis, b), baru = periksa(spek, b); total++;
      assert.equal(baru.ok, lama.ok, `${jenis} ${JSON.stringify(b).slice(-70)}`);
      assert.deepEqual(baru.galat.map(g => g.nama).sort(), lama.galat.map(g => g.medan).sort(), `${jenis} ${JSON.stringify(b).slice(-70)}`);
    }
  }
  assert.ok(total > 150, "" + total);
});

test("T9: Worker dan peramban memberi galat identik (20 contoh per formulir) dan modul tanpa impor", () => {
  const bentuk = [...Object.values(MEJA).map(M => ({id: M.id, spek: dariMeja(M, {bersih: teksBersih}), s: contohMeja(M, null)})),
    ...Object.entries(MEDAN).map(([j, d]) => ({id: "pipa-" + j, spek: dariPipa(d, cekPipa(j)), s: [{}, {liar: 1}, ...Object.values(d).flatMap(m => rusakP(m).map(r => ({[m.nama]: r})))]}))];
  for (const f of bentuk) {
    assert.ok(f.s.length >= 3, f.id);
    for (const s of f.s.slice(0, 20)) assert.deepEqual(Peramban.periksa(f.spek, s, {kini: KINI}), Worker.periksa(f.spek, s, {kini: KINI}), f.id);
  }
  assert.notEqual(Worker.periksa, Peramban.periksa, "dua instansi modul, satu berkas");
  const kode = readFileSync(new URL("../../public/inti/spek.js", import.meta.url), "utf8");
  assert.doesNotMatch(kode, /^\s*import\s/m, "tanpa impor: aman untuk Worker dan <script type=module>");
  assert.doesNotMatch(kode.replace(/gambar[\s\S]*$/, ""), /\b(document|window|localStorage)\b/, "bagian validator tanpa global peramban");
});

test("dariKolom, templatKolom, rupiah, tampil_jika, koordinat, jam, ganda", () => {
  const sp = dariKolom([{k: "nama", label: "Nama", tipe: "teks", wajib: true, maks: 5, bantu: "nama lengkap"}, {k: "suhu", label: "Suhu", tipe: "angka", satuan: "C", min: -10, maks: 900}]);
  assert.deepEqual(periksa(sp, {nama: "Budi", suhu: "36,6"}).galat.map(g => g.nama), ["suhu"], "koma desimal tidak diterima, titik saja");
  assert.equal(periksa(sp, {nama: "Budi", suhu: 36.6}).ok, true);
  assert.deepEqual(periksa(sp, {nama: "Terlalu panjang"}).galat[0], {nama: "nama", pesan: "Nama: maksimal 5 karakter"});
  assert.deepEqual(templatKolom(sp).map(k => [k.kunci, k.judul, k.jenis, k.wajib]), [["nama", "Nama", "teks", true], ["suhu", "Suhu (C)", "angka", false]]);
  assert.equal(formatRupiah(1500000), "Rp 1.500.000"); assert.equal(uraiRupiah("Rp 1.500.000"), 1500000); assert.equal(uraiRupiah(""), null);
  const c = {tampil_jika: {nama: "a", dalam: ["x"]}}; assert.ok(tampil(c, {a: "x"}) && !tampil(c, {a: "y"}) && tampil({tampil_jika: i => i.q > 1}, {q: 2}));
  const lain = {kolom: [{nama: "k", label: "K", tipe: "koordinat"}, {nama: "j", label: "J", tipe: "jam"}, {nama: "g", label: "G", tipe: "ganda", pilihan: ["a", "b"]}, {nama: "t", label: "T", tipe: "tanggal", maks: "hariini"}]};
  assert.equal(periksa(lain, {k: {lat: -6, lon: 106}, j: "14:30", g: ["a"], t: hari(0)}, {kini: KINI}).ok, true);
  assert.deepEqual(periksa(lain, {k: {lat: 50, lon: 106}, j: "25:00", g: ["a", "a"], t: hari(-9)}, {kini: KINI}).galat.map(g => g.nama), ["k", "j", "g", "t"]);
});

test("petaDependensi: nama, bila, fungsi", () => {
  const {petaDependensi, gambar} = Worker;
  const sp = {kolom: [{nama: "a", label: "A", tipe: "bulat"}, {nama: "b", label: "B", tipe: "teks", tampil_jika: {nama: "a", dalam: [1]}}, {nama: "c", label: "C", tipe: "teks", tampil_jika: {bila: ["a", "x"]}}, {nama: "f", label: "F", tipe: "teks", tampil_jika: i => i.q}]};
  const {peta, fungsi} = petaDependensi(sp);
  assert.deepEqual([...peta.get("a")], ["b", "c"]); assert.deepEqual([...peta.get("x")], ["c"]); assert.deepEqual(fungsi, ["f"]); assert.equal(peta.has("q"), false);
  assert.equal(typeof gambar, "function");
});
