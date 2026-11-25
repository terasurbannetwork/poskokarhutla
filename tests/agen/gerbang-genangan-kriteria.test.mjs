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

test("prasyarat: kriteria terkunci dan riwayatnya utuh", {skip: dangkal && "checkout dangkal: butuh fetch-depth: 0"}, () => {
  const r = jalan("prasyarat");
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /prasyarat lulus/);
});
