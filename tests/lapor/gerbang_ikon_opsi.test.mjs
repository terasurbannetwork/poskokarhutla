/* Gerbang ikon pilihan /lapor (pemilik 26 Nov 2026: "iconnya kok sama semua"): tiap pilihan berikon yang bermakna,
   i-daftar hanya untuk "Lainnya", tidak ada dua pilihan satu pertanyaan yang berikon sama, dan tiap ikon ada di sprite.
   Aturan render mencerminkan public/lapor/lapor.js (kartuPilihan: cabang pilihan ganda dan cabang pilihan tunggal). */
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {ISIAN, JENIS, KRONOLOGI, opsiBerlaku} from "../../src/lapor_spek.js";
import {ikonKebutuhan, ikonOpsi, bertingkat} from "../../public/lapor/ikon_opsi.js";

const sprite = new Set([...readFileSync(new URL("../../public/lapor/index.html", import.meta.url), "utf8").matchAll(/<symbol id="([^"]+)"/g)].map(m => m[1]));
// salinan tinggiAir di lapor.js: pilihan dengan tinggi air di keterangannya digambar sebagai permukaan air, bukan ikon
const tinggiAir = ket => /(sekitar|lebih dari) ([\d,.]+) ?(cm|m)\b/i.test(ket || "");

const grup = [];
for (const j of JENIS) for (const i of ISIAN) {
  if (!i.opsi?.length) continue;
  const ob = opsiBerlaku(i, j.id); if (ob.length < 2) continue;
  grup.push({nama: `${i.nama}@${j.id}`, banyak: i.tipe === "opsi_banyak", opsi: ob.map(o => o[0]), ket: ob.map(o => o[1])});
}
for (const [jn, ls] of Object.entries(KRONOLOGI)) ls.forEach((l, k) => grup.push({nama: `kronologi.${jn}.${k}`, banyak: !!l.banyak, opsi: l.opsi.map(o => o[0]), ket: []}));
// pilihan tetap di src/lapor_mesin.js (CARI_KELAMIN, CARI_HUB, CARI_WAKTU, tanyaKorban); diduplikasi di sini, ubah bersama
grup.push(
  {nama: "cari.kelamin", opsi: ["Laki-laki", "Perempuan", "Tidak tahu"], ket: []},
  {nama: "cari.hubungan", opsi: ["Anak", "Orang tua", "Suami atau istri", "Saudara", "Teman atau tetangga", "Lainnya"], ket: []},
  {nama: "cari.waktu", opsi: ["Hari ini", "Kemarin", "2 sampai 3 hari lalu", "Lebih dari 3 hari lalu"], ket: []},
  {nama: "korban.ada", opsi: ["Ya, ada", "Tidak ada", "Belum tahu"], ket: []});

// ikon yang benar-benar tampil; "~air" = gambar tinggi air, "~tingkat" = skala batang berurutan (dua-duanya dikecualikan dari aturan duplikat)
const GENERIK = new Set(["i-daftar", "i-kebutuhan"]);
const ikonTampil = (g, o, i) => g.banyak ? ikonKebutuhan(o, null) || ikonOpsi(o) || "i-kebutuhan"
  : tinggiAir(g.ket[i]) ? "~air" : ikonOpsi(o) || (bertingkat(g.opsi) ? "~tingkat" : "i-daftar");

test("tiap pilihan berikon bermakna, tanpa duplikat dan tanpa ikon umum selain Lainnya", () => {
  const seen = new Set(), masalah = [];
  for (const g of grup) {
    const kunci = g.banyak + g.opsi.join("|"); if (seen.has(kunci)) continue; seen.add(kunci);
    const ik = g.opsi.map((o, i) => ikonTampil(g, o, i)), per = {};
    g.opsi.forEach((o, i) => {
      if (!/^lainnya$/i.test(o) && GENERIK.has(ik[i])) masalah.push(`${g.nama}: "${o}" jatuh ke ikon umum ${ik[i]}`);
      if (!ik[i].startsWith("~") && !sprite.has(ik[i])) masalah.push(`${g.nama}: "${o}" memakai ikon ${ik[i]} yang tidak ada di sprite`);
      if (!ik[i].startsWith("~")) (per[ik[i]] ||= []).push(o);
    });
    for (const [x, os] of Object.entries(per)) if (os.length > 1) masalah.push(`${g.nama}: ikon ${x} dipakai bersama: ${os.join(" / ")}`);
  }
  assert.equal(masalah.length, 0, "\n" + masalah.join("\n"));
});
