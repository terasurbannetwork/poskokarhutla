/* Gerbang bot pemutakhiran bulanan direktori (PRD lembaga §6.16): logika murni Python (ambang 180 hari, beda kontak disamarkan, status situs)
   dan kontrak dengan penggabung: status_situs bertahan dan gabung ulang hasil gabung tidak mengubah kontak (tak ada data hilang). */
import {test} from "node:test";
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import {gabung} from "../../scripts/akademisi/lembaga_gabung.mjs";

test("logika murni pemutakhiran lulus self-check Python", () => {
  const r = spawnSync("python3", ["-I", "scripts/akademisi/pemutakhiran/uji_inti.py"], {encoding: "utf8"});
  assert.equal(r.status, 0, r.stderr + r.stdout);
  assert.match(r.stdout, /uji_inti: OK/);
});

test("status_situs bertahan lewat penggabung dan gabung ulang bersifat tetap", () => {
  const l = {id: "pmi-uji", nama: "PMI Uji", kategori: "kerelawanan", skala: "nasional", telepon: ["0761-123456"], status_situs: "menolak", web: "https://uji.or.id",
    sumber: [{butir: "telepon", url: "https://uji.or.id/kontak"}], diperiksa: "2026-10-30"};
  const a = gabung([l], [], new Date("2026-10-30")).hasil;
  assert.equal(a[0].status_situs, "menolak");
  const b = gabung(a, [], new Date("2026-10-30")).hasil;
  assert.deepEqual(b.map(x => [x.id, x.telepon, x.status_situs, x.diperiksa]), a.map(x => [x.id, x.telepon, x.status_situs, x.diperiksa]));
});
