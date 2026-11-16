/* PB-68.8: aturan tautan susulan gempa di bawah M 5 (Uhrhammer 1986, dipotong 35 hari) + uji balik pada katalog BMKG InaTEWS di repo.
   Uji balik lengkap dan angkanya: data/kajian-bnpb/paritas-bencana/uji-balik/susulan-gempa.md. Jalankan: node --test tests/warga/gempa_susulan.test.mjs */
import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync, existsSync} from "node:fs";
import path from "node:path";
import {AKAR} from "./_bantu.mjs";
import {jendelaSusulan, tautSusulan, MAKS_HARI_SUSULAN} from "../../src/gempa.js";

const HARI = 864e5;
const KAT = path.join(AKAR, "public/gempa/data/inatews_katalog.json");
const R = Math.PI / 180, km = (a, b, c, d) => { const p = Math.sin((c - a) * R / 2) ** 2 + Math.cos(a * R) * Math.cos(c * R) * Math.sin((d - b) * R / 2) ** 2; return 12742 * Math.asin(Math.sqrt(p)); };

test("jendelaSusulan: nilai Uhrhammer 1986 dan pemotongan 35 hari", () => {
  const w5 = jendelaSusulan(5), w6 = jendelaSusulan(6), w8 = jendelaSusulan(8);
  assert.ok(Math.abs(w5.km - Math.exp(-1.024 + 0.804 * 5)) < 1e-9 && Math.abs(w5.km - 19.9) < 0.2, "M5: sekitar 20 km");
  assert.ok(Math.abs(w5.hari - Math.exp(-2.87 + 1.235 * 5)) < 1e-9, "M5: sekitar 27 hari, di bawah potongan");
  assert.ok(w6.km > w5.km && w6.hari === MAKS_HARI_SUSULAN, "M6: 94 hari dipotong 35");
  assert.equal(w8.hari, 35); assert.ok(w8.km > 200, "M8: jarak tidak dipotong");
});

test("tautSusulan: batas waktu, jarak, dan arah waktu", () => {
  const k = {mulai: 1e12, lat: -3, lon: 100, m: 5};
  const {km: R5, hari} = jendelaSusulan(5), dLon = R5 / 111.19;   // di ekuator-ish: 1 derajat bujur ~ 111 km * cos(3 deg)
  const x = (dt, dl = 0) => ({t: k.mulai + dt, lat: -3, lon: 100 + dl});
  assert.equal(tautSusulan(k, x(0)), true, "tepat saat gempa utama termasuk");
  assert.equal(tautSusulan(k, x(-1)), false, "sebelum gempa utama = bukan susulan");
  assert.equal(tautSusulan(k, x(hari * HARI)), true, "tepat di batas waktu termasuk");
  assert.equal(tautSusulan(k, x(hari * HARI + 1)), false, "lewat batas waktu");
  assert.equal(tautSusulan(k, x(HARI, dLon * 0.95)), true, "dalam jarak");
  assert.equal(tautSusulan(k, x(HARI, dLon * 1.2)), false, "lewat jarak");
  assert.equal(tautSusulan(k, x(30 * HARI)), false, "hari ke-30 melewati 27 hari M5 (aturan lama 3 hari tak pernah menautkan ini juga)");
  assert.equal(tautSusulan({...k, m: 7}, x(30 * HARI, 0.5)), true, "M7: hari ke-30 dan 55 km masih dalam jendela");
  assert.equal(tautSusulan({...k, m: 7}, x(36 * HARI)), false, "potongan 35 hari berlaku untuk gempa besar");
});

test("uji balik: katalog InaTEWS repo, presisi lawan kontrol cincin dan urutan Flores M7,7 (kriteria: presisi >= 0,75, Flores >= 50 tertaut)", {skip: !existsSync(KAT) && "katalog InaTEWS tidak ada"}, () => {
  const semua = JSON.parse(readFileSync(KAT, "utf8")).baris.map(r => ({t: r[1] * 1000, lat: r[2], lon: r[3], m: r[4]}))
    .filter(r => r.lat >= -12 && r.lat <= 7 && r.lon >= 94 && r.lon <= 142).sort((a, b) => a.t - b.t);
  const kecil = semua.filter(r => r.m < 5), utama = [];
  for (const x of semua.filter(r => r.m >= 5)) {   // gempa utama = M5+ yang tidak jatuh di jendela gempa M5+ lebih besar sebelumnya
    const w = c => jendelaSusulan(c.m);
    if (utama.some(c => c.m >= x.m && x.t > c.t && x.t - c.t <= w(c).hari * HARI && km(c.lat, c.lon, x.lat, x.lon) <= w(c).km)) continue;
    utama.push({...x, mulai: x.t});
  }
  let tertaut = 0, kontrol = 0, flores = null;
  for (const c of utama) {
    const w = jendelaSusulan(c.m); let n = 0;
    for (const x of kecil) {
      if (x.t <= c.t || x.t > c.t + w.hari * HARI) continue;
      const d = km(c.lat, c.lon, x.lat, x.lon);
      if (tautSusulan(c, x)) n++; else if (d > w.km * Math.SQRT2 && d <= w.km * Math.sqrt(3)) kontrol++;   // cincin luas sama dengan lingkaran jendela
    }
    tertaut += n; if (c.m >= 7.5 && (!flores || n > flores)) flores = n;
  }
  assert.ok(utama.length >= 20, "cukup gempa utama untuk uji: " + utama.length);
  const presisi = 1 - kontrol / tertaut;
  assert.ok(presisi >= 0.75, `presisi ${presisi.toFixed(2)} (tertaut ${tertaut}, kontrol ${kontrol})`);
  assert.ok(flores == null || flores >= 50, `urutan M7,5+ menarik ${flores} susulan`);
});
