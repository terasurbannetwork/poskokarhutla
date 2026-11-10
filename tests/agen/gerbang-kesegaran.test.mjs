// Gerbang penjaga kesegaran + status gunung api cepat (10 Nov 2026):
//  1. batas umur tiap berkas di scripts/agents/kesegaran.py >= jeda terpanjang cron sumbernya + 1 jam (tabel diturunkan dari jadwal, bukan ditebak);
//  2. tiap workflow yang men-deploy memulihkan cache gunungapi-status- SESUDAH cache banjir- (kalau tidak, deploy mengirim status harian lama);
//  3. titik.yml menjalankan `magma.py cepat` dan penjaga kesegaran sebelum deploy, dan menyimpan cache status.
import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const W = ".github/workflows";
const baca = f => readFileSync(`${W}/${f}`, "utf8");
const tanpaKomentar = s => s.split("\n").filter(b => !/^\s*#/.test(b)).join("\n");

// jam UTC yang disebut kolom jam cron: "*/3", "6,18", "22-23,0-10", "2", "*"
function jam(f) {
  if (f === "*") return [...Array(24).keys()];
  const s = new Set();
  for (const p of f.split(",")) {
    let m;
    if ((m = p.match(/^\*\/(\d+)$/))) for (let h = 0; h < 24; h += +m[1]) s.add(h);
    else if ((m = p.match(/^(\d+)-(\d+)$/))) for (let h = +m[1]; ; h = (h + 1) % 24) { s.add(h); if (h === +m[2]) break; }
    else s.add(+p);
  }
  return [...s].sort((a, b) => a - b);
}
const jedaMaks = hs => hs.length === 1 ? 24 : Math.max(...hs.map((h, i) => (hs[(i + 1) % hs.length] - h + 24) % 24));

test("batas umur kesegaran >= jeda cron sumber + 1 jam", () => {
  const py = readFileSync("scripts/agents/kesegaran.py", "utf8");
  const baris = [...py.matchAll(/^\s*\("([^"]+)", "([^"]+)", "(\w+)", (\d+), "([\w_.-]+\.yml)/gm)];
  assert.ok(baris.length >= 14, `tabel TABEL terbaca ${baris.length} baris; regex buta`);
  const modul = new Set(baris.map(b => b[1]));
  for (const m of ["karhutla", "banjir", "longsor", "cuaca", "udara", "gempa", "gunung api", "kekeringan", "pesisir", "prediksi"]) assert.ok(modul.has(m), `modul ${m} tak dijaga`);
  for (const [, , berkas, , batas, wf] of baris) {
    const crons = [...tanpaKomentar(baca(wf)).matchAll(/^\s*-\s*cron:\s*"([^"]+)"/gm)].map(m => m[1].split(/\s+/)[1]);
    assert.ok(crons.length, `${wf}: tanpa cron`);
    const hs = [...new Set(crons.flatMap(jam))].sort((a, b) => a - b);
    assert.ok(+batas >= jedaMaks(hs) + 1, `${berkas}: batas ${batas} jam < jeda ${jedaMaks(hs)} jam dari ${wf} + 1`);
  }
});

test("tiap deploy memulihkan gunungapi-status- sesudah banjir-", () => {
  for (const f of ["banjir", "data", "lintas", "terbit", "titik", "udara"]) {
    const s = baca(`${f}.yml`);
    const b = s.search(/key:\s*banjir-\$\{\{ github\.run_id \}\}\n\s*restore-keys: banjir-/);
    const g = s.search(/actions\/cache\/restore@v4\n\s*with:\n\s*path: \|\n\s*public\/banjir\/data\/gunungapi_status\.json[\s\S]{0,200}?restore-keys: gunungapi-status-/);
    assert.ok(b > 0 && g > b, `${f}.yml: pemulihan gunungapi-status- harus ada SESUDAH pemulihan banjir-`);
  }
});

test("titik.yml: magma cepat, penjaga kesegaran, simpan cache, semuanya sebelum deploy", () => {
  const s = tanpaKomentar(baca("titik.yml"));
  const d = s.indexOf("wrangler@4.42.0 deploy");
  for (const x of ["magma.py cepat", "scripts/agents/kesegaran.py", "key: gunungapi-status-${{ github.run_id }}\n"]) {
    const i = s.lastIndexOf(x);
    assert.ok(i > 0 && i < d, `titik.yml: '${x}' harus ada sebelum deploy`);
  }
  assert.match(s, /Status gunung api cepat[\s\S]{0,200}schedule != '10 9/, "putaran tambahan cut-off tak perlu status gunung api");
});

test("lintas.yml meng-commit riwayat MAGMA (kegempaan, catatan, perubahan_level) ke main", () => {
  const s = baca("lintas.yml");
  assert.match(s, /git add \$B/);
  assert.match(s, /public\/gunungapi\/data\/kegempaan\.json public\/gunungapi\/data\/catatan public\/gunungapi\/data\/perubahan_level\.json/);
});
