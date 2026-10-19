// Gerbang mesin laporan harian generik (public/inti/laporan.js): data contoh lolos kontrak v1,
// skrip sah secara sintaks, dan penyusun HTML-nya (murni, tanpa DOM) memuat tiap bagian, menyaring provinsi, dan meng-escape teks data.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import {execFileSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import path from "node:path";

const akar = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const baca = p => fs.readFileSync(path.join(akar, p), "utf8");
const SRC_JSON = baca("public/inti/data/laporan-contoh.json");
const D = JSON.parse(SRC_JSON);

test("laporan-contoh.json lolos invarian kontrak v1", () => {
  const n = D.hari.length, tingkat = ["awas", "siaga", "waspada", "info"];
  assert.equal(D.v, 1);
  assert.ok(n >= 7 && n <= 120, `panjang hari ${n} di luar 7..120`);
  assert.ok(D.hari.every((h, i) => /^\d{4}-\d\d-\d\d$/.test(h) && (!i || h > D.hari[i - 1])), "hari harus ISO, naik, tanpa duplikat");
  assert.ok(D.metrik.length >= 1 && D.metrik.length <= 6);
  assert.equal(D.metrik.filter(m => m.utama).length, 1, "harus tepat satu metrik utama");
  const seri = (o, lokasi) => D.metrik.forEach(m => {
    assert.ok(Array.isArray(o[m.k]) && o[m.k].length === n, `${lokasi}.${m.k}: panjang ${o[m.k]?.length} != ${n}`);
    o[m.k].forEach(v => assert.ok(v === null || typeof v === "number" && (m.arah === "netral" || v >= 0), `${lokasi}.${m.k}: nilai ${v} tidak sah`));
  });
  seri(D.nasional, "nasional");
  for (const [k, p] of Object.entries(D.prov)) { assert.match(k, /^\d{2}$/, `kode prov ${k}`); seri(p, "prov." + k); }
  D.kab.forEach(k => { assert.ok(D.prov[k.prov], `kab ${k.kode}: prov ${k.prov} tidak ada`); seri(k, "kab." + k.kode); });
  D.metrik.filter(m => m.agregat === "jumlah").forEach(m => {
    for (const [pk, p] of Object.entries(D.prov)) for (let i = 0; i < n; i++) {
      const j = D.kab.filter(k => k.prov === pk).reduce((a, k) => a + (k[m.k][i] || 0), 0);
      assert.ok(j <= (p[m.k][i] || 0) + 1e-6, `${m.k} prov ${pk} hari ${D.hari[i]}: jumlah kab ${j} > prov ${p[m.k][i]}`);
    }
  });
  D.sorot.forEach(s => assert.ok(tingkat.includes(s.tingkat), `tingkat sorot ${s.tingkat}`));
  assert.ok(D.sorot.length <= 8);
  assert.ok(Buffer.byteLength(SRC_JSON) <= 400 * 1024);
});

test("laporan.js sah secara sintaks", () => {
  execFileSync(process.execPath, ["--check", path.join(akar, "public/inti/laporan.js")]);
});

// jalankan skrip klasik inti dalam konteks vm dengan document minimal; const tingkat atas dibagi antar skrip
function muat() {
  const ctx = vm.createContext({document: {addEventListener() {}, querySelector: () => null, querySelectorAll: () => [], documentElement: {dataset: {}}}, URLSearchParams, console});
  for (const f of ["format.js", "kartu.js", "laporan.js"]) vm.runInContext(baca("public/inti/" + f), ctx, {filename: f});
  ctx.__src = SRC_JSON;
  return (kode) => vm.runInContext(kode, ctx);
}
const jalan = muat();
const bangun = qs => jalan(`(() => { const D = JSON.parse(__src); return Laporan.bangun(D, Laporan.awal(D, ${JSON.stringify(qs)})); })()`);

test("tiap bagian digambar dan memuat judulnya", () => {
  const h = bangun("");
  assert.equal(Object.keys(h).join(), jalan("Laporan.urut.join()"), "bagian bangun != daftar urut");
  const harus = {
    kop: [D.judul, "Centurisk97"], kepala: [D.judul, "Cut-off", "lpCetak", 'data-set="prov"', 'data-set="hari"'],
    ring: ["Ringkasan", "Kejadian", "Magnitudo tertinggi", "Bulan ini"], tren: ["Tren harian", 'data-set="rentang"', "lp-bar", "lp-sm"],
    sorot: ["Perlu perhatian", D.sorot[0].judul], prakiraan: [D.prakiraan.judul, "18%"], prov: ["Per provinsi", "Sulawesi Tengah", "Nasional", 'data-k="ubah"'],
    naik: ["Kenaikan terbesar"], kab: ["Per kab/kota", "Kab. Donggala", "lp-grp"], tambahan: [D.tambahan[0].judul, "Donggala"], sumber: ["Sumber dan cut-off", D.sumber[0].nama, "https://example.org/data"],
  };
  for (const [k, l] of Object.entries(harus)) for (const t of l) assert.ok(h[k].includes(t), `bagian "${k}" tidak memuat "${t}"`);
  assert.match(h.prov, /1\.\d{3}|\d/, "angka id-ID");
});

test("?prov=72 menyaring semua kartu ke provinsi itu", () => {
  const semua = bangun(""), s = bangun("?prov=72");
  for (const k of ["prov", "kab", "naik"]) assert.ok(semua[k].includes("Jawa Barat") || k === "naik", `bagian ${k} nasional harus memuat provinsi lain`);
  for (const k of ["prov", "kab", "naik", "prakiraan", "sorot", "ring", "tren"]) {
    assert.ok(!s[k].includes("Jawa Barat") && !s[k].includes("Kota Makassar") && !s[k].includes("Aceh Besar"), `bagian ${k} bocor wilayah lain saat ?prov=72`);
  }
  assert.ok(s.prov.includes("Sulawesi Tengah") && !s.prov.includes("Nasional"));
  assert.ok(s.kepala.includes('value="72" selected'), "pemilih provinsi harus menandai 72");
  assert.ok(bangun("?prov=zzz").prov.includes("Jawa Barat"), "kode tak dikenal = semua provinsi");
});

test("hari berjalan ditandai dan nilai kosong tampil tanda minus panjang", () => {
  const h = bangun("?hari=2026-10-18");
  assert.ok(h.kepala.includes("berjalan") && h.ring.includes("berjalan"));
  const j = bangun("?prov=32&hari=2026-10-08"); // Jawa Barat 8 Okt sengaja null
  assert.ok(j.ring.includes("–"), "null harus tampil –");
});

test("teks dari JSON di-escape (XSS)", () => {
  const h = jalan(`(() => { const D = JSON.parse(__src), x = '<img src=x onerror=alert(1)>';
    D.judul = x; D.prov["72"].nama = x; D.kab[0].nama = x; D.sorot[0].judul = x; D.sorot[0].tautan = "javascript:alert(1)"; D.sumber[0].url = "javascript:alert(1)"; D.sumber[0].nama = x;
    D.prakiraan.judul = x; D.tambahan[0].judul = x; D.tambahan[0].baris[0][1] = x; D.metrik[0].label = x;
    return Laporan.bangun(D, Laporan.awal(D, "")); })()`);
  for (const [k, v] of Object.entries(h)) {
    assert.ok(!v.includes("<img src=x"), `bagian ${k} memuat tag <img> mentah dari data`);
    assert.ok(!/href="javascript:/i.test(v), `bagian ${k} memuat href javascript:`);
  }
  assert.ok(h.sorot.includes("&lt;img"), "teks berbahaya harus tampil sebagai teks");
});

test("kontrak gagal ditolak dengan pesan, bukan layar kosong", () => {
  assert.ok(jalan(`Laporan.cek({v: 2})`).length > 0);
  assert.ok(jalan(`Laporan.cek({v: 1, hari: [], metrik: [], nasional: {}})`).length > 0);
  assert.equal(jalan(`Laporan.cek(JSON.parse(__src))`), "");
});

test("tabel bisa diurut: baris berubah menurut kolom dan arah", () => {
  const urut = (k, turun) => jalan(`(() => { const D = JSON.parse(__src), S = Laporan.awal(D, ""); S.urut.prov = {urut: ${JSON.stringify(k)}, turun: ${turun}, hal: 0}; return Laporan.baris(D, S, "prov"); })()`);
  const nm = h => [...h.matchAll(/<td>([^<]+)<\/td>/g)].map(m => m[1]);
  assert.equal(nm(urut("nama", false)).join(), [...nm(urut("nama", false))].sort((a, b) => a.localeCompare(b, "id")).join());
  assert.equal(nm(urut("nama", true)).join(), nm(urut("nama", false)).reverse().join());
});

test("fokus (laporan kejadian satu kab/kota): ringkasan memakai seri kab, tabel provinsi dan kenaikan dilewati", () => {
  const h = jalan(`(() => { const D = JSON.parse(__src); D.fokus = D.kab[0].kode; return Laporan.bangun(D, Laporan.awal(D, "")); })()`), nama = D.kab[0].nama;
  assert.ok(h.ring.includes(nama) && h.tren.includes(nama), "ringkasan dan tren harus menyebut kab fokus");
  assert.equal(h.prov, ""); assert.equal(h.naik, "");
  assert.ok(!h.kepala.includes('data-set="prov"'), "pemilih provinsi disembunyikan saat fokus");
  assert.ok(h.kab.includes(nama));
});
