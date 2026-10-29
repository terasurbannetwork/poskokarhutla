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

/* tanggal isi laporan = tanggal yang ditulis laporannya sendiri (insiden 29 Okt 2026: kiriman ulang laporan lama tercatat hari terima) */
import {tanggalIsi, tanggalNamaBerkas} from "../../src/wa_jenis.js";
import {readdirSync} from "node:fs";

test("tanggal isi per jenis dari kepala asli", () => {
  const ada = (kunci, mulai, tgl) => { const k = kiriman.find(x => x.harap === kunci && x.teks.includes(mulai)); assert.ok(k, mulai); assert.equal(tanggalIsi(k.teks, kunci), tgl, mulai); };
  ada("rekap_koordalops_24", "25/10/2026 pkl 07.00 WIB s.d 26/10/2026", "2026-10-26");
  ada("rekap_koordalops_12", "22/10/2026 pkl 07.00 WIB s.d 22/10/2026 pkl 19.00", "2026-10-22");
  ada("bmkg_pagi", "Senin, 26 Oktober 2026", "2026-10-26");
  ada("pvmbg_pagi", "Senin, 26 Oktober 2026", "2026-10-26");
  ada("bmkg_malam", "Kamis, 22 Oktober 2026", "2026-10-22");
  ada("pvmbg_malam", "Sabtu, 24 Oktober 2026", "2026-10-24");
  ada("karhutla_mensesneg", "_23 Oktober 2026_", "2026-10-23");
  ada("satgas", "_27 Oktober 2026_", "2026-10-27");
  ada("gelar_armada", "Data: 26 Oktober 2026", "2026-10-26");
  ada("dry_ice_omc", "Selasa, 20 Oktober 2026", "2026-10-20");
  ada("hujan_omc", "Senin, 19 Oktober 2026", "2026-10-19");
  ada("bpbd_kejadian", "Kamis, 22 Oktober 2026", "2026-10-22");
  assert.equal(tanggalNamaBerkas("Laporan Harian Dit. Koordalops BNPB 28102026.docx (4).pdf"), "2026-10-28");
  assert.equal(tanggalNamaBerkas("Laporan Harian 31022026.pdf"), null);
});

test("tanggal isi: tiap kiriman asli terbaca, berkas .txt sesuai nama", () => {
  for (const k of kiriman.filter(x => x.harap !== "laphar_pdf")) assert.match(tanggalIsi(k.teks, k.harap) ?? "", /^2026-10-\d\d$/, k.teks.slice(0, 80));
  const dir = new URL("../wa/bahan/", import.meta.url);
  const harap = {"bmkg_261026_pagi.txt": ["bmkg_pagi", "2026-10-26"], "koordalops_261026_24.txt": ["rekap_koordalops_24", "2026-10-26"], "satgas_271026.txt": ["satgas", "2026-10-27"]};
  for (const f of readdirSync(dir).filter(x => harap[x])) assert.equal(tanggalIsi(readFileSync(new URL(f, dir), "utf8"), harap[f][0]), harap[f][1], f);
  assert.equal(tanggalIsi("tanpa tanggal", "satgas"), null);
  assert.equal(tanggalIsi("pada hari Senin, 31 Februari 2026 pukul 06.00", "bmkg_pagi"), null);
  assert.equal(tanggalIsi("apa saja", null), null);
});
