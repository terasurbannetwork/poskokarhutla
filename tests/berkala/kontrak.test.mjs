// Uji kontrak berkas angka Laporan Berkala (RENCANA-UJI 3): berkas dihasilkan hitung.py dari fixture sumber,
// supaya Python dan layar diuji lawan bentuk yang sama. Fixture angka_bulanan.json harus segar.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const akar = fileURLToPath(new URL("../../", import.meta.url));
const fx = (n) => akar + "tests/berkala/fixtures/" + n;
const cetak = () => JSON.parse(execFileSync("python3", ["-I", akar + "scripts/berkala/hitung.py", "cetak", fx("masukan_bulanan.json")], { encoding: "utf8" }));
const angka = cetak();

const WAJIB = {
  bab1: ["alam", "kelompok", "jenis", "prov", "prov_teratas", "riwayat", "sebelumnya", "tahun_lalu", "bukan_alam"],
  bab2: ["status", "hot", "luas", "belum", "puncak", "akhir", "turun_dari_puncak", "prov", "teratas", "satelit_lawan_dibi", "sebelumnya", "per_bulan"],
  bab3: ["banjir", "longsor", "sebelumnya"],
  bab4: ["cuaca_ekstrem", "kekeringan", "tabel", "sebelumnya"],
  bab5: ["laporan", "gempa", "erupsi", "peristiwa", "selisih", "gunungapi"],
  lampiran: ["prov_jenis", "metode"],
};
const JENIS = ["karhutla", "banjir", "longsor", "cuaca_ekstrem", "kekeringan", "gelombang", "gempa", "erupsi"];

test("kepala berkas: periode, kode, rentang", () => {
  assert.equal(angka.periode, "bulanan");
  assert.equal(angka.kode, "2026-10");
  assert.deepEqual(angka.rentang, ["2026-10-01", "2026-10-31"]);
  assert.equal(typeof angka.dirakit, "string");
});

test("tiap sumber punya tarik dan status", () => {
  for (const [nama, s] of Object.entries(angka.sumber)) {
    assert.ok("tarik" in s, `sumber ${nama} tanpa tarik`);
    assert.ok(["ok", "sebagian", "belum_ada", "gagal"].includes(s.status), `sumber ${nama} status ${s.status}`);
  }
});

test("kunci wajib per bab bulanan", () => {
  for (const [bab, ks] of Object.entries(WAJIB)) for (const k of ks) assert.ok(k in angka[bab], `${bab}.${k} hilang`);
  for (const j of JENIS) assert.equal(typeof angka.bab1.jenis[j].kejadian, "number");
});

test("angka bilangan, bukan string; tidak ada string berbentuk angka", () => {
  const jalan = (v, jalur) => {
    if (typeof v === "string") assert.ok(!/^-?\d+([.,]\d+)?$/.test(v) || /kode|tanggal|tarik|tgl|\.id$|\.kab\[|prov_teratas|prov_terbanyak|label|tabel/.test(jalur), `string angka di ${jalur}: ${v}`);
    else if (Array.isArray(v)) v.forEach((x, i) => jalan(x, `${jalur}[${i}]`));
    else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) jalan(x, `${jalur}.${k}`);
  };
  jalan(angka, "");
});

test("kering + basah + geologi = bencana alam; bukan alam tidak dijumlah", () => {
  const k = angka.bab1.kelompok;
  assert.equal(k.kering.kejadian + k.basah.kejadian + k.geologi.kejadian, angka.bab1.alam.kejadian);
  assert.equal(angka.sumber.dibi.kejadian, angka.bab1.alam.kejadian);
});

test("status surut berjumlah sama dengan kab banjir", () => {
  const s = angka.bab3.banjir.status;
  assert.equal(s.sudah + s.belum + s.belum_dilaporkan, angka.bab3.banjir.kab_n);
});

test("usulan temuan: angka dan sumber, tanpa kata aman", () => {
  assert.ok(angka.usulan_temuan.length > 0);
  for (const u of angka.usulan_temuan) {
    assert.match(u.kode, /^T[1-7]$/);
    assert.ok(u.pil && u.sumber && u.angka && u.kalimat);
    assert.ok(!/\baman\b/i.test(u.kalimat));
  }
});

test("fixture angka_bulanan.json segar (python3 -I scripts/berkala/hitung.py fixture)", () => {
  assert.deepEqual(JSON.parse(readFileSync(fx("angka_bulanan.json"), "utf8")), angka);
});

test("rakit.py uji (normalisasi, R2 lokal, potongan, tanpa jaringan)", () => {
  const keluar = execFileSync("python3", ["-I", akar + "scripts/berkala/rakit.py", "uji"], { encoding: "utf8" });
  assert.match(keluar, /rakit\.py uji: \d+ pemeriksaan lulus/);
});
