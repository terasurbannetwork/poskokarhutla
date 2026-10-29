// Gerbang modul longsor: self-check Python (tanpa jaringan) + invarian keluaran yang ter-commit.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";

const py = (...a) => execFileSync("python3", a, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
const D = "public/longsor/data/";
const baca = (n) => JSON.parse(readFileSync(D + n, "utf8"));

for (const [berkas, arg] of [["dasar.py"], ["rumus.py"], ["model.py", "diri"], ["kejadian.py", "uji"], ["hujan_riwayat.py", "uji"]]) {
  test(`self-check ${berkas}`, () => {
    assert.ok(py(`scripts/longsor/${berkas}`, ...(arg ? [arg] : [])).includes("uji lolos"));
  });
}

test("nowcast.json: berkas bergulir <= 2 MB, indeks kecamatan sah, vonis uji tercatat", { skip: !existsSync(D + "nowcast.json") }, () => {
  assert.ok(statSync(D + "nowcast.json").size <= 2_000_000, "nowcast.json melebihi 2 MB");
  const n = baca("nowcast.json"), k = baca("kerentanan.json");
  for (const [i, S, t] of [...n.tinggi, ...n.sedang]) {
    assert.ok(Number.isInteger(i) && i >= 0 && i < k.kec.length, `indeks kec ${i} di luar ${k.kec.length}`);
    assert.ok(S >= 0 && S <= 1 && t >= 0.8, `baris ${i}: S=${S} t=${t} tak mungkin lolos ambang`);
  }
  assert.ok(["LOLOS", "GAGAL", "BELUM DIUJI"].includes(n.uji_balik.vonis));
});

test("uji_balik.json: vonis LOLOS/GAGAL tegas dan konsisten dengan angkanya", { skip: !existsSync(D + "uji_balik.json") }, () => {
  const u = baca("uji_balik.json");
  assert.ok(u.vonis === "LOLOS" || u.vonis === "GAGAL");
  const lawan = Math.max(u.auc.hujan ?? 0, u.auc.klim ?? 0, u.auc.S ?? 0);
  const pod = (x) => x.sedang_atau_tinggi;
  const lolos = u.auc.model >= lawan + 0.02 && u.auc.model >= 0.6 && pod(u.kelas).pod > (pod(u.kelas).pembanding_laju_sama.hujan.pod ?? 0);
  assert.equal(u.vonis === "LOLOS", lolos, `vonis ${u.vonis} tidak cocok dengan aturan: AUC model ${u.auc.model}, lawan ${lawan}`);
});

test("kejadian.json: tiap baris DIBI menunjuk kabupaten yang ada", () => {
  const j = baca("kejadian.json");
  for (const r of j.dibi) assert.ok(r[1] >= 0 && r[1] < j.kab.length, `indeks kab ${r[1]}`);
  assert.ok(j.dibi.length > 1000 && j.glc.length > 100);
});
