// PB-17: modul sarana dan fasilitas (public/inti/pb_titik.js). Murni diuji lewat vm; sisanya gerbang statis (aman teks, tanpa kapital, tanpa inline, terpasang hanya lewat registri).
import test from "node:test"; import assert from "node:assert/strict"; import fs from "node:fs"; import vm from "node:vm";
const baca = p => fs.readFileSync(new URL("../../" + p, import.meta.url), "utf8");
const win = {}; win.window = win; vm.runInContext(baca("public/inti/pb_titik.js"), vm.createContext({window: win, Intl, console}));
const P = win.PbTitik;

test("daftar jenis sama dengan src/tugas_bencana.js (satu sumber di server)", () => {
  const k = baca("src/tugas_bencana.js"), ambil = n => JSON.parse(k.match(new RegExp(`export const ${n} = (\\[[^\\]]*\\])`))[1]);
  assert.deepEqual([...P.SARANA], ambil("SARANA")); assert.deepEqual([...P.FASILITAS], ambil("FASILITAS"));
  for (const j of [...P.SARANA, ...P.FASILITAS]) assert.ok(P.LABEL[j], `label ${j}`);
});
test("jenis sarana dibatasi registri bencana; fasilitas tidak", () => {
  assert.deepEqual([...P.jenisUntuk("sarana", ["perahu_karet", "tenda"])].sort(), ["perahu_karet", "tenda"].sort());
  assert.equal(P.jenisUntuk("fasilitas", ["tenda"]).length, P.FASILITAS.length);
});
test("badan simpan: angka, koma desimal, kosong dihilangkan", () => {
  const b = P.badanSimpan({bencana: "banjir", prov: "32", golongan: "fasilitas", jenis: "gudang", nama: "  Gudang A ", lat: "-6,2", lon: "106.8", kapasitas: "", catatan: " ", status: ""});
  assert.deepEqual(JSON.parse(JSON.stringify(b)), {bencana: "banjir", prov: "32", golongan: "fasilitas", jenis: "gudang", nama: "Gudang A", lat: -6.2, lon: 106.8, status: "siap"});
  assert.equal(P.badanSimpan({...b, id: "a".repeat(16), kab: "3273", kapasitas: "0"}).kapasitas, 0);
});
test("cek isian: pesan jelas, lolos bila lengkap", () => {
  const ok = {prov: "32", jenis: "gudang", nama: "A", lat: -6, lon: 106};
  assert.equal(P.cek(ok), null);
  for (const [k, v] of [["prov", ""], ["jenis", ""], ["nama", ""], ["lat", NaN]]) assert.ok(P.cek({...ok, [k]: v}), k);
});
test("geojson membuang titik tanpa koordinat; urut stabil dan lokal", () => {
  const g = P.geojson([{id: "1", nama: "a", status: "rusak", lat: -6, lon: 106}, {id: "2", lat: null, lon: 1}, {id: "3", lat: "x", lon: 1}]);
  assert.equal(g.features.length, 1); assert.equal(g.features[0].properties.warna, "#c0392b");
  assert.equal(P.urut([{nama: "b"}, {nama: "a"}], "nama", true).map(x => x.nama).join(), "a,b");
  assert.equal(P.urut([{kapasitas: 2}, {kapasitas: 10}], "kapasitas", false).map(x => x.kapasitas).join(), "10,2");
});
test("galat: pesan server menang, kode dikenal ramah, sisanya memuat kode", () => {
  assert.equal(P.galatRamah(400, {galat: "nama wajib"}), "nama wajib");
  assert.match(P.galatRamah(403, null), /tidak berhak/); assert.match(P.galatRamah(418, null), /418/);
});
test("aman: teks pengguna hanya lewat textContent, tanpa inline, tanpa kapital dipaksa", () => {
  const js = baca("public/inti/pb_titik.js"), css = baca("public/inti/pb_titik.css");
  assert.doesNotMatch(js, /innerHTML|insertAdjacentHTML|outerHTML|document\.write|\beval\(|alert\(|confirm\(|prompt\(/);
  assert.doesNotMatch(css, /text-transform\s*:\s*uppercase/);
  assert.doesNotMatch(js, /["'][^"'\n]*[ ]·[ ][^"'\n]*["']/, "titik tengah sebagai pemisah");
  assert.doesNotMatch(js, /Sumber:|class="ex-ft"|ops-lead/);
});
test("kartu: kepala = nama seksi berikon, tiga kartu, hapus butuh alasan lewat rute hapus", () => {
  const js = baca("public/inti/pb_titik.js");
  for (const n of ["Daftar sarana dan fasilitas", "Peta fasilitas", '"Isian"']) assert.ok(js.includes(n), n);
  assert.match(js, /\/api\/pb\/titik\/hapus/); assert.match(js, /\/api\/pb\/titik\?/); assert.match(js, /requestAnimationFrame/);
});
test("terpasang di /operasi hanya lewat registri; karhutla dikecualikan dan semua kemampuan.operasi kini mati", () => {
  const js = baca("public/operasi_laporan.js");
  assert.match(js, /b\.id !== "karhutla" && b\.kemampuan\?\.operasi === true/); assert.match(js, /pbBencana\.length/);
  const reg = JSON.parse(baca("public/bencana.json")).bencana, k = reg.find(b => b.id === "karhutla");
  assert.ok(k, "karhutla ada di registri");
});
test("PB-17 perbaikan: batas 100 baris, tutup menahan gambar, koordinat koma", () => {
  const js = baca("public/inti/pb_titik.js");
  assert.equal(P.MAKS_BARIS, 100); assert.match(js, /baris\.slice\(0, S\.batas\)/); assert.match(js, /data-lagi|dataset\.lagi/);
  assert.match(js, /nanti\(gambarTabel\); nanti\(gambarPeta\);/);
  assert.match(js, /gambarTabel\(\) \{\s*if \(S\.tutup\) return;/); assert.match(js, /gambarPeta\(\) \{\s*if \(S\.tutup\) return;/); assert.match(js, /tutup\(\) \{ S\.tutup = true/);
  assert.doesNotMatch(js, /ub = tombol|hp = tombol/, "ikon svg per baris");
  assert.equal(P.koma(-6.2), "-6,20000"); assert.equal(P.badanSimpan({lat: P.koma(-6.2), lon: P.koma(106.8), nama: "a"}).lat, -6.2);
  assert.match(js, /Kapasitas \(jumlah\)/);
});
