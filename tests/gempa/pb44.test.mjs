// PB-44 (gempa dan tsunami b): kriteria RENCANA-UJI paritas-bencana baris PB-44:
// tsunami tanpa tingkat 1; gempa tidak pernah diberi saran Siaga; batas basi gempa 2 jam.
// Ditambah: tangga gempa dan tsunami hanya menyala di registri bila kamusnya bersumber (pola gunung api, commit 0dcd58e2e).
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {spawnSync} from "node:child_process";
import {BENCANA, tindakanUntuk} from "../../public/ews_tindakan.js";
import {GEMPA_UMUR_MAKS} from "../../src/ews.js";
import {tingkatGempa} from "../../src/peringatan.js";

const baca = p => fs.readFileSync(new URL("../../" + p, import.meta.url), "utf8");
const REG = JSON.parse(baca("public/bencana.json")).bencana.find(b => b.id === "gempa");

test("tsunami tanpa tingkat 1: kamus hanya tingkat 2 dan 3, tingkat 1 jatuh ke tingkat 2", () => {
  assert.deepEqual(Object.keys(BENCANA.tsunami.tindakan).sort(), ["2", "3"]);
  assert.equal(tindakanUntuk("tsunami", 1), BENCANA.tsunami.tindakan[2]);
});

test("peringatan gempa hanya Waspada atau Siaga dari magnitudo, kedalaman, dan MMI; tidak pernah Awas", () => {
  for (const r of [{m: 9, dalam: 5}, {m: 6, dalam: 60}, {m: 6, dalam: 61}, {m: 5}, {m: 4.9, mmi_maks: 4}, {m: 4.9, mmi_maks: 3}])
    assert.notEqual(tingkatGempa(r), "Awas", JSON.stringify(r));
  assert.equal(tingkatGempa({m: 4.9, mmi_maks: 3}), null);
});

test("saran status: gempa dan tsunami tidak pernah disarankan Siaga (saran_status.py uji)", () => {
  const s = baca("scripts/umum/saran_status.py");
  assert.match(s, /not any\(j in ATURAN for j in \("gempa", "tsunami"\)\)/, "uji saran_status menjaga gempa dan tsunami di luar ATURAN");
  const py = process.env.PYTHON || "python3", r = spawnSync(py, ["-I", "scripts/umum/saran_status.py", "uji"], {cwd: new URL("../../", import.meta.url), encoding: "utf8"});
  if (r.error?.code === "ENOENT") return;   // tanpa python di mesin ini: uji isi berkas di atas tetap jalan, CI memakai python3
  assert.equal(r.status, 0, r.stderr || r.stdout);
});

test("batas basi gempa untuk email 2 jam; data harian gempa dijaga cek_basi.py di gempa.yml", () => {
  assert.equal(GEMPA_UMUR_MAKS, 2 * 36e5);
  assert.match(baca("scripts/agents/cek_basi.py"), /\("gempa", "public\/gempa\/data\/laporan\.json", "dibuat"/);
  assert.match(baca(".github/workflows/gempa.yml"), /run: python3 scripts\/agents\/cek_basi\.py gempa/);
});

test("registri: tangga gempa menyala hanya bila tiap butir gempa dan tsunami punya rujukan", () => {
  const bersumber = ["gempa", "tsunami"].every(j => Object.entries(BENCANA[j].tindakan).every(([t, d]) => BENCANA[j].rujukan?.[t]?.length === d.length));
  assert.equal(REG.kemampuan.ews.tangga, bersumber);
  if (bersumber) assert.deepEqual([...REG.kemampuan.ews.kunci].sort(), ["gempa", "tsunami"]);
});
