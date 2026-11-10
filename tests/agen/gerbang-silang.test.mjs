/* Gerbang Silang Sumber (data/kajian-bnpb/silang-sumber/RENCANA-UJI.md): berkas Silang tidak menyentuh model prediksi,
   tidak memakai kata terlarang, dan arsipnya append-only. Statis dan cepat (baca berkas kecil). */
import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync, readdirSync, existsSync} from "node:fs";

const ROOT = new URL("../..", import.meta.url).pathname;
const baca = p => readFileSync(ROOT + p, "utf8");
const SKRIP = ["scripts/bnpb/silang/dasar.py", "scripts/bnpb/silang/rapor_sumber.py", "scripts/bnpb/silang/beda_sumber.py", "scripts/umum/kalender_ancaman.py"].filter(p => existsSync(ROOT + p));
const LAYAR = ["public/bnpb/silang.js", "public/bnpb/silang.html", "public/bnpb/rapor-sumber.js", "public/bnpb/rapor-sumber.html"].filter(p => existsSync(ROOT + p));
const KELUARAN = ["public/data/bnpb/rapor_sumber.json", "public/data/bnpb/beda_sumber.json", "public/data/kalender_ancaman.json"].filter(p => existsSync(ROOT + p));
const ARSIP = ["public/data/bnpb/rapor_sumber_arsip", "public/data/bnpb/beda_sumber_arsip"];

test("berkas Silang ada (gerbang tidak kosong)", () => {
  assert.ok(SKRIP.length >= 3 && LAYAR.length >= 2 && KELUARAN.length >= 2, "daftar berkas Silang menyusut: gerbang jadi tak menjaga apa-apa; perbarui daftar di gerbang-silang.test.mjs");
});

test("skrip Silang tidak menulis ke public/prediksi atau scripts/prediksi (K3: tidak mengubah model)", () => {
  for (const p of SKRIP) {
    const teks = baca(p).split("\n").filter(l => !l.trim().startsWith("#")).join("\n");
    // membaca arsip prospektif dari public/banjir/data boleh; menulis ke prediksi tidak. Cari penulisan: simpan(/open(..., "w")/tambah_arsip( dengan jalur prediksi.
    for (const m of teks.matchAll(/(simpan|tambah_arsip|open)\(([^)]*)\)/g))
      assert.doesNotMatch(m[2], /prediksi/, `${p}: menulis ke prediksi lewat ${m[0]}. Keluaran Silang hanya ke public/data/bnpb atau public/data; ubah jalur keluarannya`);
  }
});

test("tidak ada kata aman atau Pantau Bencana di keluaran dan layar", () => {
  for (const p of [...KELUARAN, ...LAYAR]) {
    const t = baca(p).toLowerCase().replaceAll("peringatan dini", "");
    assert.doesNotMatch(t, /\baman\b/, `${p}: kata "aman" dilarang (tidak ada klaim keamanan); tulis keadaan terukurnya`);
    assert.doesNotMatch(t, /pantau bencana/, `${p}: nama produk tertulis Centurisk97, bukan Pantau Bencana`);
  }
});

test("arsip append-only: tiap berkas JSONL valid, satu baris per tanggal, tanggal urut naik", () => {
  for (const dir of ARSIP) {
    if (!existsSync(ROOT + dir)) continue;
    for (const f of readdirSync(ROOT + dir).filter(x => x.endsWith(".jsonl"))) {
      const tgl = baca(`${dir}/${f}`).split("\n").filter(Boolean).map(l => JSON.parse(l).tanggal);
      assert.ok(tgl.every(Boolean), `${dir}/${f}: baris tanpa tanggal`);
      assert.equal(new Set(tgl).size, tgl.length, `${dir}/${f}: tanggal ganda, arsip ditimpa atau diisi dua kali; hanya tambah_arsip() yang boleh menulis`);
      assert.deepEqual([...tgl].sort(), tgl, `${dir}/${f}: tanggal tidak urut, ada baris disisipkan mundur`);
      assert.ok(tgl.every(t => f.startsWith(t.slice(0, 7))), `${dir}/${f}: tanggal di luar bulan berkas`);
    }
  }
});
