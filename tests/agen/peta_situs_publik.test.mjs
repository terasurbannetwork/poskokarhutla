import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {bangun} from "../../scripts/agents/peta_situs_publik.mjs";

const berkas = JSON.parse(readFileSync(new URL("../../public/inti/peta_situs_publik.json", import.meta.url), "utf8"));

test("JSON publik segar terhadap registri (jalankan npm run peta:build bila gagal)", () => {
  assert.deepEqual(berkas, JSON.parse(JSON.stringify(bangun())));
});

test("tanpa rute pintu tertutup dan tanpa kolom hak", () => {
  const larang = /^\/(admin|bnpb|instansi|petugas|pipa|command-center|ai|direktori)(\/|$|\.)/;
  assert.ok(berkas.halaman.length > 0);
  for (const e of berkas.halaman) {
    assert.ok(!larang.test(e.rute), e.rute);
    assert.deepEqual(Object.keys(e).sort(), ["grup", "ikon", "induk", "nama", "pintu", "rute"]);
    assert.ok(["publik", "kampus"].includes(e.pintu));
  }
  assert.deepEqual(Object.keys(berkas.pintu).sort(), ["kampus", "publik"]);
});
