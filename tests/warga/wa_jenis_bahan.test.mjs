// Pengenal jenis laporan WA dijalankan ke semua kiriman asli 17-29 Okt 2026 dari pemilik (tests/wa/bahan/kepala.json).
// Bahan baru yang salah dikenali ditambahkan ke berkas itu dulu, baru aturannya dibetulkan.
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {kenali} from "../../src/wa_jenis.js";

const {kiriman} = JSON.parse(readFileSync(new URL("../wa/bahan/kepala.json", import.meta.url)));

test("semua kiriman asli dikenali sesuai jenisnya", () => {
  const salah = kiriman.map((k, i) => ({i, harap: k.harap, dapat: kenali(k.teks, k.nama_berkas)})).filter(x => x.harap !== x.dapat);
  assert.deepEqual(salah, []);
});
