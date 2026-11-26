// Gerbang pemilik (26 Nov 2026, diulang dua kali: "Jangan ada yang lewati"): isian /lapor tidak menawarkan tombol Lewati; cukup Kirim, wajib diisi.
// Pengecualian sementara hanya langkah foto (KEPUTUSAN-LAPOR-AI K68 foto darurat opsional, K108 foto orang dicari tidak wajib) sampai pemilik memutuskan ulang.
// Ikut di sini: tempat menunggu (orang hilang) hanya mencari di sekitar lokasi terakhir terlihat, dan pencari nama wilayah mencocokkan awal kata.
import {test} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {buatWilayah} from "../../src/lapor_wilayah.js";

const baca = p => fs.readFileSync(new URL(`../../${p}`, import.meta.url), "utf8");

test("mesin Lapor: tidak ada pilihan Lewati di luar langkah foto", () => {
  const src = baca("src/lapor_mesin.js"), langgar = [];
  // ratchet: klarifikasi kronologi ("Lewati, lanjut") ditanyakan ke pemilik 26 Nov 2026; hapus dari daftar ini begitu dijawab
  const TUNGGU = [/"Lewati, lanjut"/];
  src.split("\n").forEach((b, i) => { if (/jawab\(/.test(b) && /\[[^\]]*"Lewati/.test(b) && !/"foto(_cari)?"/.test(b) && !TUNGGU.some(r => r.test(b))) langgar.push(`src/lapor_mesin.js:${i + 1}`); });
  assert.deepEqual(langgar, [], "pilihan Lewati di isian: jadikan wajib (kirim saja)");
});

test("tempat menunggu: tanpa pencarian wilayah se-Indonesia", () => {
  const js = baca("public/lapor/lapor.js"), a = js.indexOf("function kartuAntar("), b = js.indexOf("\nfunction ", a + 10);
  assert.ok(a > 0); assert.doesNotMatch(js.slice(a, b), /cariTempat\(|\/api\/lapor\/cari\b/, "kartuAntar tidak boleh mencari kab/kota lintas provinsi");
});

test("cariNama: kata cocok di awal kata, 'al bar' tidak menangkap kab Kalimantan Barat", async () => {
  const W = buatWilayah(async p => JSON.parse(fs.readFileSync(new URL(`../../public${p}`, import.meta.url), "utf8")));
  const h = await W.cariNama("al bar");
  const kab = h.filter(x => x.tingkat === "kab").map(x => x.judul).join(", ");
  assert.doesNotMatch(kab, /Bengkayang|Ketapang|Kapuas Hulu|Kayong Utara|Halmahera Barat|Kepulauan Tanimbar/, `kab nyasar: ${kab}`);
  assert.ok((await W.cariNama("cibinong")).some(x => /Cibinong/.test(x.judul)), "pencarian biasa tetap jalan");
});
