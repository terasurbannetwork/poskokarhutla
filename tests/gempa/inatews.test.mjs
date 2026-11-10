import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const FIX = "scripts/gempa/fixture_inatews/", fx = n => fs.readFileSync(FIX + n, "utf8");
const kod = fs.readFileSync("public/gempa/inatews.js", "utf8");
const c = {console, Math, JSON, Date, esc: x => String(x)}; vm.createContext(c); vm.runInContext(kod + "\nthis.Ina = Ina;", c);
const I = c.Ina;

test("waktu WIB dan UTC sama dengan inatews.py", () => {
  assert.equal(I.wib("10-11-26", "15:34:04 WIB"), Date.UTC(2026, 10, 10, 8, 34, 4));
  assert.equal(I.wib("15-08-2026", "05:41 WIB"), Date.UTC(2026, 7, 14, 22, 41, 0));
  assert.equal(I.utc("2026/11/10  08:34:06.051"), Date.UTC(2026, 10, 10, 8, 34, 6));
});

test("live30event dan CAP: fixture nyata BMKG", () => {
  const live = I.live(fx("live30event.xml"));
  assert.equal(live.length, 3); assert.equal(live[0].id, "bmg2026wank"); assert.equal(live[0].m, 5); assert.equal(live[0].fokal, "mt_yes");
  const m5 = I.cap(fx("last30event.xml")), fl = I.cap(fx("last30feltevent.xml")), ts = I.cap(fx("last30tsunamievent.xml"));
  assert.deepEqual([m5.length, fl.length, ts.length], [1, 1, 2]);
  assert.equal(m5[0].jenis, "m5"); assert.equal(fl[0].jenis, "dirasakan"); assert.ok(ts.every(b => b.jenis === "tsunami"));
  assert.equal(m5[0].id, "20261110153700"); assert.equal(fl[0].id, "20261110153404"); assert.equal(m5[0].m, 5.3);
  assert.equal(ts[0].berakhir, true); assert.equal(ts[1].berakhir, false);
  assert.equal(ts[1].zona.length, 2); assert.equal(ts[1].zona[0][2], "SIAGA"); assert.equal(ts[1].pantau[0][3], 0.14);
  assert.equal(ts[1].zona[0][3], I.wib("15-08-2026", "05:02:23 WIB"));
});

test("dua id buletin satu gempa dipasangkan ke satu kejadian (waktu dan jarak)", () => {
  const live = I.live(fx("live30event.xml")), m5 = I.cap(fx("last30event.xml"))[0], fl = I.cap(fx("last30feltevent.xml"))[0];
  assert.equal(I.cocok(m5, live).id, "bmg2026wank"); assert.equal(I.cocok(fl, live).id, "bmg2026wank");
  assert.equal(I.cocok({...m5, t: m5.t + 300e3}, live), null, "selisih 5 menit tidak dipasangkan");
  assert.equal(I.cocok({...m5, lon: m5.lon + 3}, live), null, "jarak 300 km tidak dipasangkan");
  assert.equal(m5.m, 5.3); assert.equal(live[0].m, 5, "parameter beda tetap beda, tidak dirata-rata");
});

test("status tsunami resmi BMKG apa adanya, diam bukan aman", () => {
  const m5 = I.cap(fx("last30event.xml"))[0], fl = I.cap(fx("last30feltevent.xml"))[0];
  assert.deepEqual(Array.from(I.potensi(m5.potensi)), ["Tidak berpotensi tsunami", "#5b6575"]);
  assert.equal(I.potensi(fl.potensi), null, "buletin Dirasakan tidak menyebut tsunami -> null");
  assert.equal(I.potensi("Potensi TSUNAMI untuk diteruskan pada masyarakat")[0], "Potensi tsunami");
  assert.equal(I.potensi(""), null);
  assert.doesNotMatch(kod, /["'`>]Aman\b/i, "tidak ada label Aman");
});

test("peringatan aktif hanya bila buletin terbaru belum berakhir dan masih wajar umurnya", () => {
  const ts = I.cap(fx("last30tsunamievent.xml")), g = I.kelompok(ts);
  assert.equal(g.length, 1); assert.equal(g[0].buletin.length, 2); assert.equal(g[0].buletin[1].berakhir, true, "buletin terakhir menyatakan berakhir");
  assert.equal(I.aktif(g[0], g[0].buletin[1].terbit + 1e6), false);
  const hidup = {buletin: [{berakhir: false, terbit: 1e12}]};
  assert.equal(I.aktif(hidup, 1e12 + 3600e3), true); assert.equal(I.aktif(hidup, 1e12 + 13 * 3600e3), false, "lewat 12 jam tidak dianggap aktif");
  assert.equal(I.aktif({buletin: []}), false);
});

test("MMI per wilayah: daftar, rentang, tunggal", () => {
  const a = I.felt("III Darajat, III Pasirwangi"), b = I.felt("II - III Manokwari"), d = I.felt("IV Padang;V Pulau-pulau batu;II Kerinci");
  const j = r => JSON.stringify(r.map(x => [x.mmi, x.nilai, x.wilayah]));
  assert.equal(j(a), JSON.stringify([["III", 3, "Darajat"], ["III", 3, "Pasirwangi"]]));
  assert.equal(j(b), JSON.stringify([["II - III", 3, "Manokwari"]]));
  assert.equal(JSON.stringify(d.map(x => x.nilai)), "[4,5,2]"); assert.equal(I.felt("").length, 0);
});

test("stasiun PGA dan entitas XML", () => {
  const s = I.stasiun(fx("stationlist_MMI.txt"));
  assert.equal(s.length, 3); assert.equal(s[0][0], "FKSPI"); assert.equal(s[0][5], "IX"); assert.equal(s[1][1], "Anggi, Pegunungan Arfak"); assert.equal(s[0][4], 151.3);
  assert.equal(I.ent("A &amp; B &lt;c&gt;"), "A & B <c>");
});

test("teks BMKG tidak lewat innerHTML mentah, narasi lewat DOMParser", () => {
  assert.match(kod, /new DOMParser\(\)/); assert.match(kod, /\["STRONG", "EM"\]/);
  assert.doesNotMatch(kod, /innerHTML\s*=\s*[^;]*\b(?:d\.)?narasi\b/, "narasi tidak ditulis ke innerHTML");
  assert.doesNotMatch(kod, /Pantau Bencana/); assert.doesNotMatch(kod, /\s·\s/, "tanpa pemisah titik tengah");
  assert.match(kod, /textContent/);
});

test("arsip: katalog append-only terbentuk dan konsisten", { skip: !fs.existsSync("public/gempa/data/inatews_katalog.json") }, () => {
  const k = JSON.parse(fs.readFileSync("public/gempa/data/inatews_katalog.json", "utf8")), i = Object.fromEntries(k.kolom.map((n, j) => [n, j]));
  assert.ok(k.baris.length >= 100); assert.equal(new Set(k.baris.map(r => r[i.id])).size, k.baris.length, "id unik");
  assert.ok(k.baris.every(r => r[i.t] > 1.7e9 && r[i.t] < 2.5e9), "waktu epoch detik");
  assert.ok(k.baris.every((r, j) => j === 0 || r[i.t] <= k.baris[j - 1][i.t]), "urut terbaru dulu");
});

test("P.D. tsunami dibaca dari subject buletin, tanpa tafsir", () => {
  for (const [s, p] of [["Warning Tsunami PD-4", "PD-4"], ["Warning Tsunami PD-3.4", "PD-3.4"], ["Warning Tsunami PD-1", "PD-1"], ["Gempa M>5", ""]]) assert.equal(I.pd(s), p);
  assert.match(I.pilPD({subjek: "Warning Tsunami PD-4"}), /#5b6575/); assert.match(I.pilPD({subjek: "Warning Tsunami PD-3.2"}), /#d64545/);
});

test("skema katalog riwayat PDF dikenali tampilan (null = strip)", { skip: !fs.existsSync("public/gempa/data/katalog_merusak.json") }, () => {
  const m = JSON.parse(fs.readFileSync("public/gempa/data/katalog_merusak.json", "utf8")), t = JSON.parse(fs.readFileSync("public/gempa/data/katalog_tsunami.json", "utf8"));
  for (const [k, set, arr] of [["merusak", m, m.baris], ["tsunami", t, t.baris], ["wilayah", t, t.baris_wilayah]]) {
    const kol = I.RW[k].kol.map(x => x[0]).filter(x => x !== "koor"), ada = new Set(arr.flatMap(r => Object.keys(r)));
    assert.equal(kol.filter(x => !ada.has(x)).join(), "", `kolom ${k} tidak ada di berkas`); assert.ok(arr.length > 100 && set.judul);
  }
});

test("id buletin tak sah dibuang, parse dipakai ulang, format angka riwayat", () => {
  const x = fx("last30event.xml");
  assert.equal(I.cap(x.replace("<eventid>20261110153700</eventid>", "<eventid>../x?y</eventid>")).length, 0);
  assert.equal(I.live(fx("live30event.xml").replace("bmg2026wank", "a b;c")).length, 2);
  assert.ok(I.cap(x) === I.cap(x), "teks sama = hasil sama, tanpa urai ulang");
  assert.equal(I.tglID("2025-11-27"), "27 Nov 2025"); assert.equal(I.tglID(null), "–"); assert.equal(I.jamID("11:56:24"), "11.56");
  assert.equal(I.koord(-2.6, 95.8), "2,60° LS, 95,80° BT"); assert.equal(I.koord(null, 1), "–");
  assert.doesNotMatch(kod, /\baman\b/i, "kata aman tidak muncul di kode tampilan");
});
