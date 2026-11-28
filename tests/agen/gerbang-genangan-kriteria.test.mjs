// Gerbang kunci kriteria uji balik genangan satelit (GS-13, validasi-model 25 Nov 2026; data/kajian-bnpb/genangan-satelit/TIKET.md).
// Uji balik GS-13 hanya sah bila kriteria terkunci: sidik cocok, jangkar leluhur HEAD, riwayat kunci utuh (jangkar lama leluhur jangkar baru,
// isi lama cocok sidik lama), dan genangan_vonis.json belum pernah ada di riwayat git. Gerbang ini menjalankan mesinnya sungguhan.
import {test} from "node:test";
import assert from "node:assert/strict";
import {execFileSync, spawnSync} from "node:child_process";

const jalan = mode => spawnSync("python3", ["-I", "scripts/siklus/genangan_kriteria.py", mode], {encoding: "utf8", timeout: 120000});

test("self-check genangan_kriteria.py lulus", () => {
  const r = jalan("uji");
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /uji genangan_kriteria: lulus/);
});

// Checkout dangkal (actions/checkout tanpa fetch-depth: 0) tidak memuat commit jangkar dan riwayat vonis: pemeriksaannya mustahil, bukan lulus.
const dangkal = execFileSync("git", ["rev-parse", "--is-shallow-repository"], {encoding: "utf8"}).trim() === "true";

// Sesudah GS-13 menulis genangan_vonis.json (26 Nov 2026), prasyarat WAJIB menolak dengan pesan "sudah dijalankan": pesan itu hanya keluar
// sesudah sidik, jangkar, dan riwayat kunci lolos (periksa_kunci memeriksanya lebih dulu), jadi kunci tetap teruji dan uji balik tertutup.
const adaVonis = execFileSync("git", ["log", "--all", "--format=%H", "--", "scripts/siklus/genangan_vonis.json"], {encoding: "utf8"}).trim() !== "";

test("prasyarat: kriteria terkunci dan riwayatnya utuh", {skip: dangkal && "checkout dangkal: butuh fetch-depth: 0"}, () => {
  const r = jalan("prasyarat");
  if (adaVonis) {
    assert.notEqual(r.status, 0, "vonis GS-13 sudah ada: prasyarat harus menolak uji balik ulang");
    assert.match(r.stdout + r.stderr, /uji balik GS-13 sudah dijalankan/);
    return;
  }
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /prasyarat lulus/);
});
