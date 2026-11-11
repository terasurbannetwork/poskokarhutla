// Gerbang antrean grup `data` (insiden 27 Okt 2026): grup concurrency hanya menyimpan SATU run menunggu, jadi push beruntun yang memicu
// terbit.yml mengusir titik.yml terjadwal. Uji ini menjaga tiga hal secara mekanis:
//  1. terbit.yml tak punya pemicu push (terbit_antre.yml yang punya, di luar grup `data`);
//  2. daftar PIPA di terbit_antre.yml dan jaga.yml = semua workflow ber-grup `data` selain terbit.yml;
//  3. tiap cron tambahan titik.yml (selain "40 */3 * * *") disaring dari langkah jejak api dan prioritas 6 jam lewat github.event.schedule.
import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync, readdirSync} from "node:fs";

const W = ".github/workflows";
const baca = f => readFileSync(`${W}/${f}`, "utf8");
const semua = readdirSync(W).filter(f => f.endsWith(".yml"));
const tanpaKomentar = s => s.split("\n").filter(b => !/^\s*#/.test(b)).join("\n");

test("terbit.yml tanpa pemicu push; terbit_antre.yml memegangnya dan tak masuk grup data", () => {
  const terbit = tanpaKomentar(baca("terbit.yml")), antre = tanpaKomentar(baca("terbit_antre.yml"));
  assert.doesNotMatch(terbit, /^\s*push:/m, "terbit.yml tak boleh dipicu push langsung (mengusir run terjadwal dari slot antre grup data)");
  assert.match(terbit, /^\s*workflow_dispatch:/m);
  assert.match(terbit, /group:\s*data\b/, "terbit.yml tetap di grup data (tak boleh menerbitkan bersamaan dengan pipeline)");
  assert.match(antre, /^\s*push:/m);
  assert.doesNotMatch(antre, /group:\s*data\b/, "terbit_antre.yml harus di luar grup data supaya tak mengisi slot antre");
  assert.match(antre, /cancel-in-progress:\s*true/, "push beruntun harus saling membatalkan di antrean ringan");
  assert.match(antre, /gh workflow run terbit\.yml/);
});

test("daftar PIPA (terbit_antre.yml, jaga.yml) = workflow ber-grup data selain terbit.yml", () => {
  const dataGrup = semua.filter(f => f !== "terbit.yml" && /group:\s*data\s*$/m.test(tanpaKomentar(baca(f)))).map(f => f.replace(/\.yml$/, "")).sort();
  assert.ok(dataGrup.includes("titik") && dataGrup.includes("data"), `pencarian grup data rusak: ${dataGrup}`);
  for (const f of ["terbit_antre.yml", "jaga.yml"]) {
    const m = tanpaKomentar(baca(f)).match(/^\s*PIPA:\s*([\w|]+)\s*(#.*)?$/m);
    assert.ok(m, `${f} tanpa PIPA:`);
    assert.deepEqual(m[1].split("|").sort(), dataGrup, `${f}: PIPA harus memuat semua workflow ber-grup data (tambah workflow data baru ke daftar ini)`);
  }
});

test("jaga.yml tak mengira run menunggu-slot (pending) sebagai 'tak ada antrean'", () => {
  const jaga = tanpaKomentar(baca("jaga.yml"));
  assert.doesNotMatch(jaga, /status == "queued" or \.status == "in_progress"/, "status pending/waiting lolos dari penyaring lama");
  assert.match(jaga, /pending/);
});

test("cron tambahan titik.yml disaring dari langkah jejak api dan prioritas 6 jam", () => {
  const s = baca("titik.yml");
  const cron = [...tanpaKomentar(s).matchAll(/^\s*-\s*cron:\s*"([^"]+)"/gm)].map(m => m[1]);
  assert.equal(cron[0], "40 */3 * * *", "cron reguler harus yang pertama");
  const tambahan = cron.slice(1);
  assert.ok(tambahan.length >= 2, `putaran cut-off 17.00 dan 07.00 WIB harus ada: ${cron}`);
  for (const nama of ["Jejak api kompleks aktif", "Indeks risiko dan prioritas dampak tiap 6 jam"]) {
    const mulai = s.indexOf(`- name: ${nama}`);
    assert.ok(mulai > 0, `langkah ${nama} hilang`);
    const blok = s.slice(mulai, s.indexOf("\n      - name:", mulai + 1));
    const kondisi = (blok.match(/^\s+if:.*$/m) || [""])[0];
    for (const c of tambahan) assert.ok(kondisi.includes(`github.event.schedule != '${c}'`), `${nama}: cron tambahan '${c}' belum disaring di if:`);
  }
});

test("jam pengganti (scripts/terbit/jaga_jadwal.mjs): PIPA sama dengan jaga.yml, tiap workflow dijaga bisa di-dispatch, dan worker memanggilnya", async () => {
  const {PIPA, JADWAL} = await import("../../scripts/terbit/jaga_jadwal.mjs");
  const m = tanpaKomentar(baca("jaga.yml")).match(/^\s*PIPA:\s*([\w|]+)/m);
  assert.deepEqual([...PIPA].sort(), m[1].split("|").sort(), "PIPA scripts/terbit/jaga_jadwal.mjs harus sama dengan jaga.yml");
  for (const j of JADWAL) {
    const isi = tanpaKomentar(baca(j.wf));
    assert.match(isi, /^\s*workflow_dispatch:/m, `${j.wf} harus bisa di-dispatch`);
    for (const k of Object.keys(j.masukan || {})) assert.match(isi, new RegExp(`^[ ]+${k}:`, "m"), `${j.wf} harus mendeklarasikan input ${k}`);
  }
  assert.ok(JADWAL.some(j => j.wf === "titik.yml" && j.jendela?.length), "putaran cut-off titik.yml wajib dijaga");
  assert.match(readFileSync("src/worker.js", "utf8"), /await denyutJaga\(env\)/, "cron Worker harus memicu jaga.yml");
  assert.match(tanpaKomentar(baca("jaga.yml")), /node scripts\/terbit\/jaga_jadwal\.mjs/, "jaga.yml harus menjalankan pemeriksa jadwal");
  assert.match(tanpaKomentar(baca("jaga.yml")), /actions\/checkout@/, "jaga.yml harus checkout: skrip pemeriksa ada di repo");
  assert.equal((tanpaKomentar(baca("titik.yml")).match(/inputs\.jaga/g) || []).length, 2, "jaga=ya harus mengikuti aturan jam di langkah jejak api dan prioritas 6 jam");
});

test("terbit_antre.yml memantau run terbit dan memicu ulang bila cancelled sebelum mulai (11 Nov 2026)", () => {
  const antre = tanpaKomentar(baca("terbit_antre.yml"));
  assert.match(antre, /gh run list --workflow terbit\.yml --created/, "run terbit hasil dispatch harus dipantau");
  assert.match(antre, /"cancelled"/, "status cancelled harus dikenali");
  assert.match(antre, /picu ulang/, "cancelled harus berujung dispatch ulang");
  assert.ok((antre.match(/tunggu_slot/g) || []).length >= 2, "dispatch ulang harus menunggu slot lagi");
  assert.match(antre, /timeout-minutes:\s*170/);
});
