// Uji kontrak berkas angka Laporan Berkala (RENCANA-UJI 3): berkas dihasilkan hitung.py dari fixture sumber,
// supaya Python dan layar diuji lawan bentuk yang sama. Fixture angka_bulanan.json harus segar.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const akar = fileURLToPath(new URL("../../", import.meta.url));
const fx = (n) => akar + "tests/berkala/fixtures/" + n;
const cetak = (m = fx("masukan_bulanan.json")) => JSON.parse(execFileSync("python3", ["-I", akar + "scripts/berkala/hitung.py", "cetak", m], { encoding: "utf8" }));
const angka = cetak();
/* LB-11: satu fixture per periode (D11), dari masukan_bulanan.json + masukan_ringkas.json */
const RINGKAS = { harian: cetak("harian"), mingguan: cetak("mingguan") };

const WAJIB = {
  bab1: ["alam", "kelompok", "jenis", "prov", "prov_teratas", "riwayat", "sebelumnya", "tahun_lalu", "bukan_alam"],
  bab2: ["status", "hot", "luas", "belum", "puncak", "akhir", "turun_dari_puncak", "prov", "teratas", "satelit_lawan_dibi", "sebelumnya", "per_bulan"],
  bab3: ["banjir", "longsor", "sebelumnya"],
  bab4: ["cuaca_ekstrem", "kekeringan", "tabel", "sebelumnya", "hujan"],
  bab5: ["laporan", "gempa", "erupsi", "peristiwa", "selisih", "gunungapi"],
  bab7: ["peluang", "enso", "catatan"],
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
    assert.ok(["ok", "sebagian", "belum_ada", "gagal", "basi"].includes(s.status), `sumber ${nama} status ${s.status}`);
  }
});

const WAJIB_RINGKAS = {
  bab1: ["alam", "kelompok", "jenis", "prov", "riwayat", "sebelumnya", "tahun_lalu", "bukan_alam"],
  bab2: ["status", "hot", "luas", "belum", "puncak", "akhir", "prov", "sebelumnya"],
  bab3: ["banjir", "longsor", "sebelumnya"], bab4: ["cuaca_ekstrem", "kekeringan", "tabel", "sebelumnya"],
  bab5: ["laporan", "gempa", "erupsi", "peristiwa", "gunungapi", "perubahan_level"], prakiraan: ["status"], lampiran: ["prov_jenis", "metode"],
};
test("harian dan mingguan: kepala, kunci wajib, tanpa Bab 7 dan hujan tiga bulan (Q27, ALGORITMA 12)", () => {
  const h = RINGKAS.harian, m = RINGKAS.mingguan;
  assert.deepEqual([h.periode, h.kode, h.rentang], ["harian", "2026-10-31", ["2026-10-31", "2026-10-31"]]);
  assert.deepEqual([m.periode, m.kode, m.rentang], ["mingguan", "2026-W43", ["2026-10-19", "2026-10-25"]]);
  for (const a of [h, m]) {
    for (const [bab, ks] of Object.entries(WAJIB_RINGKAS)) for (const k of ks) assert.ok(k in a[bab], `${a.periode} ${bab}.${k} hilang`);
    assert.ok(!("bab7" in a) && !("hujan" in a.bab4), `${a.periode}: Bab 7 dan hujan tiga bulan hanya bulanan`);
    for (const s of Object.values(a.sumber)) assert.ok("tarik" in s && ["ok", "sebagian", "belum_ada", "gagal", "basi"].includes(s.status));
    assert.doesNotMatch(JSON.stringify(a), /\baman\b/i);
  }
  assert.ok("rerata_7" in h.bab1 && "menonjol" in h.bab1 && "rerata_7" in h.bab2, "harian: rerata 7 hari dan kejadian menonjol");
  assert.equal(h.bab2.puncak, null, "harian: puncak tidak dihitung");
  assert.deepEqual(h.usulan_temuan, [], "harian tanpa usulan temuan");
  assert.equal(h.bab1.riwayat.length, 14); assert.equal(m.bab1.riwayat.length, 8);
  assert.equal(h.prakiraan.untuk, "2026-11-02"); assert.ok(h.prakiraan.label.includes("bukan pernyataan BMKG"));
  assert.ok(m.prakiraan.bmkg.length >= 2 && m.prakiraan.bmkg.every(g => g.lembaga === "BMKG" && g.nama && g.pernyataan.every(x => "masa" in x)), "BMKG per sumber dengan meta");
  assert.ok(Array.isArray(m.prakiraan.kita.ringkas) && !m.prakiraan.kita.ringkas.some(e => e.sumber === "awan"), "kita hanya jenis kita");
  assert.equal(h.bab1.sebelumnya.banding.status, "sementara"); assert.equal(h.bab1.rerata_7.banding.status, "sementara");
});

test("fixture angka_harian.json dan angka_mingguan.json segar (python3 -I scripts/berkala/hitung.py fixture)", () => {
  for (const p of ["harian", "mingguan"]) assert.deepEqual(JSON.parse(readFileSync(fx(`angka_${p}.json`), "utf8")), RINGKAS[p], p);
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
  jalan(angka, ""); jalan(RINGKAS.harian, ""); jalan(RINGKAS.mingguan, "");
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

test("Bab 4.4 dan 7.1: hanya keluaran terbit, berlabel, bukan prakiraan resmi BMKG", () => {
  const h = angka.bab4.hujan, p = angka.bab7.peluang;
  assert.equal(h.status, "ok");
  for (const w of h.wilayah) assert.ok(["uji_balik_lulus", "hipotesis"].includes(w.mutu) && typeof w.anom_pct === "number");
  assert.ok(!h.wilayah.some((w) => h.tidak_tampil.includes(w.kode)));
  assert.equal(p.mutu, "hipotesis");
  for (const b of p.bulan) assert.ok(b.gabung_n <= b.banjir.kab_n + b.longsor.kab_n && b.gabung_n >= Math.max(b.banjir.kab_n, b.longsor.kab_n));
  assert.match(angka.bab7.catatan, /bukan prakiraan resmi BMKG/);
  assert.equal(typeof angka.bab7.enso.nilai, "number");
});

test("fixture angka_bulanan.json segar (python3 -I scripts/berkala/hitung.py fixture)", () => {
  assert.deepEqual(JSON.parse(readFileSync(fx("angka_bulanan.json"), "utf8")), angka);
});

test("rakit.py uji (normalisasi, R2 lokal, potongan, tanpa jaringan)", () => {
  const keluar = execFileSync("python3", ["-I", akar + "scripts/berkala/rakit.py", "uji"], { encoding: "utf8" });
  assert.match(keluar, /rakit\.py uji: \d+ pemeriksaan lulus/);
});
