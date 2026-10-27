/* Uji kalender rob 30 hari (public/banjir/kalender_rob.js): pilih 30 hari, fase Bulan, gabung hujan, oranye. Memakai pasang_astro.json asli. */
import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import fs from "node:fs";
import {spawnSync} from "node:child_process";

const f = "public/banjir/kalender_rob.js", src = fs.readFileSync(f, "utf8"), ctx = vm.createContext({self: {}});
vm.runInContext(src, ctx);
const K = ctx.self.KalenderRob, pa = JSON.parse(fs.readFileSync("public/banjir/data/pasang_astro.json", "utf8"));
const plain = x => JSON.parse(JSON.stringify(x));
const pantura = pa.pasang_tinggi.pantura;

test("sintaks sah, tanpa titik tengah atau em dash", () => {
  assert.equal(spawnSync("node", ["--check", f], {encoding: "utf8"}).status, 0);
  assert.ok(!/·|—/.test(src));
});

test("fase Bulan cocok tanggal astronomis (WIB)", () => {
  /* purnama 26 Okt 2026 04:12 UTC, 5 Nov 2025 13:19 UTC; bulan baru 9 Nov 2026 07:02 UTC, 20 Okt 2025 14:25 UTC */
  const a = plain(K.fase("2026-10-20", 30));
  assert.equal(a["2026-10-26"], "purnama"); assert.equal(a["2026-11-09"], "baru");
  assert.equal(Object.keys(a).length, 2);
  const b = plain(K.fase("2025-10-15", 30));
  assert.equal(b["2025-10-21"], "baru"); assert.equal(b["2025-11-05"], "purnama");
});

test("pilih: 30 kotak, ambang dari berkas, hari tanpa hujan prakiraan mm null dan tidak oranye", () => {
  const hujan = {"2026-10-27": 20, "2026-10-28": 12, "2026-10-29": 0};
  const r = K.pilih(pa, {profilNama: "pantura", mulai: "2026-10-27", hujanHari: hujan});
  assert.equal(r.hari.length, 30); assert.equal(r.ambang, pantura.ambang);
  const m = Object.fromEntries(r.hari.map(h => [h.tgl, h]));
  assert.equal(m["2026-10-28"].tinggi, true);       /* puncak jendela 28 Okt, nilai 0,793 */
  assert.equal(m["2026-10-28"].oranye, true);       /* tinggi dan hujan 12 mm */
  assert.equal(m["2026-10-29"].oranye, false);      /* hujan 0 mm */
  assert.equal(m["2026-10-26"], undefined);
  for (const h of r.hari) {
    assert.equal(h.tinggi, h.g >= pantura.ambang);
    if (h.oranye) assert.ok(h.tinggi && h.mm >= K.HUJAN_MIN);
    if (h.tgl > "2026-10-29") { assert.equal(h.mm, null); assert.equal(h.oranye, false); }
  }
  assert.equal(m["2026-11-09"].fase, "baru");
});

test("tanpa data hujan tidak ada oranye; profil dipilih dari kab", () => {
  const r = K.pilih(pa, {profilNama: "pantura", mulai: "2026-11-20"});
  assert.ok(r.hari.some(h => h.tinggi) && !r.hari.some(h => h.oranye));
  assert.equal(K.profil(pa, "Jawa Barat|Karawang"), "pantura");
  assert.equal(K.profil(pa, "Sulawesi Selatan|Kota Makassar"), "lain");
});

test("hujanTitik: sel terdekat, null bila jauh", () => {
  const H = {sel: 0.25, hari: ["2026-10-27", "2026-10-28"], grid: [{lat: -6, lon: 106, h: [1, 9]}, {lat: -7, lon: 110, h: [0, 2]}]};
  assert.deepEqual(plain(K.hujanTitik(H, -6.05, 106.1)), {"2026-10-27": 1, "2026-10-28": 9});
  assert.equal(K.hujanTitik(H, 0, 100), null); assert.equal(K.hujanTitik(null, 0, 0), null);
});

test("html: 30 kotak data-tip, kalimat angka duluan, tanpa titik tengah", () => {
  const H = {sel: 0.25, hari_ini: "2026-10-27", hari: ["2026-10-27", "2026-10-28"], grid: [{lat: -6, lon: 106, h: [3, 15]}]};
  const h = K.html({pa, hujan: H, lat: -6, lon: 106, kab: "DKI Jakarta|Kota Administrasi Jakarta Utara"});
  assert.equal((h.match(/data-tip=/g) || []).length, 30);
  assert.match(h, /28 Okt: pasang kuat \(0,79\) dan hujan 15 mm/);
  assert.match(h, /Hujan belum diprakirakan/); assert.match(h, /Bulan purnama/);
  assert.ok(!/·/.test(h)); assert.equal(K.html({}), "");
});
