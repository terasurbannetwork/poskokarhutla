// Uji layar /pesisir/: hitungan murni (hitung.js) terhadap berkas data nyata, plus kontrak berkas halaman.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
await import("../../public/pesisir/hitung.js");
const P = globalThis.Pesisir;
const baca = f => JSON.parse(fs.readFileSync(new URL(`../../public/${f}`, import.meta.url)));
const teks = f => fs.readFileSync(new URL(`../../public/pesisir/${f}`, import.meta.url), "utf8");
const abr = baca("pesisir/data/abrasi.json"), rob = baca("banjir/data/rob.json"), pas = baca("banjir/data/pasut_30h.json"), gel = baca("banjir/data/cuaca_gelombang.json");

test("abrasi: transek tercepat urut mundur, nyata, bukan tinjau, bukan keyakinan rendah", () => {
  const T = P.abrasiTercepat(abr, 8);
  assert.equal(T.length, 8);
  for (let i = 1; i < T.length; i++) assert.ok(T[i - 1].laju <= T[i].laju);
  for (const t of T) { assert.equal(t.kelas, "abrasi"); assert.notEqual(t.keyakinan, "rendah");
    assert.ok(!abr.situs.find(s => s.id === t.situs).tinjau.includes(t.id), t.id + " bertanda tinjau"); }
});
test("abrasi: kelas bersih + tinjau + gangguan = transek berkelas; seri tahunan berurutan", () => {
  const per = P.perSitus(abr);
  for (const s of per) { assert.equal(s.abrasi + s.akresi + s.tidak, s.bersih, s.id); assert.equal(s.bersih + s.tinjau + s.gangguan, s.n, s.id); }
  assert.equal(per.reduce((n, s) => n + s.n, 0), abr.transek.filter(t => t.kelas).length);
  const seri = P.seriSitus(abr); assert.ok(seri.length >= 3);
  for (const s of seri) for (let i = 1; i < s.titik.length; i++) assert.ok(s.titik[i].y > s.titik[i - 1].y);
});
const lompat = t => t.jarak.some((p, i) => i && p[0] - t.jarak[i - 1][0] <= 2 && Math.abs(p[1] - t.jarak[i - 1][1]) > 300);
test("saringan lompatan: tiap transek berlompatan > 300 m/tahun bertanda tinjau dan tak masuk daftar, median situs, atau judul", () => {
  for (const t of abr.transek) if (t.jarak && !t.gangguan && lompat(t)) assert.ok(t.tinjau?.length, t.id + " berlompatan tapi tak bertanda tinjau (jalankan abrasi.py ringkas)");
  const bersih = P.abrasiBersih(abr); assert.ok(bersih.length > 5);
  for (const t of bersih) { assert.ok(!lompat(t) && !t.gangguan && !t.tinjau?.length, t.id); }
  assert.ok(!P.abrasiTercepat(abr, 8).some(t => t.id === "bekasi-32"), "artefak tangga bekasi-32 tak boleh jadi batang");
  const W = P.abrasiSitus(abr); assert.ok(W.length && W.every(x => x.n >= 3));
  for (let i = 1; i < W.length; i++) assert.ok(W[i - 1].median <= W[i].median);
  const sem = bersih.filter(t => t.situs === W[0].id).map(t => t.laju); assert.equal(W[0].median, P.med(sem));
});
test("seri situs: tanpa transek gangguan, baseline lebih dari satu tahun, penyebut hanya transek berbaseline", () => {
  const sintetis = {situs: [{id: "x", nama: "X"}], transek: [
    ...Array.from({length: 6}, (_, i) => ({id: "x-" + i, situs: "x", jarak: [[1988, 100], [1989, 0], [1990, 100], [1991, 200], [1992, 100], [2000, -100], [2010, -200]]})),
    {id: "x-g", situs: "x", gangguan: "bangunan", jarak: [[1988, 0], [2010, 9999]]}]};
  const s = P.seriSitus(sintetis)[0]; assert.equal(s.nT, 6);
  assert.deepEqual(s.titik.find(p => p.y === 2010), {y: 2010, v: -300, n: 6});   // baseline = median(100,0,100,200,100) = 100, bukan satu tahun 1988
  assert.ok(P.BASE[1] - P.BASE[0] >= 4);
  for (const x of P.seriSitus(abr)) { const T = abr.transek.filter(t => t.situs === x.id && !t.gangguan && t.jarak.some(p => p[0] <= 1992)); assert.equal(x.nT, T.length); }
});
test("rob: hari di luar data = null, di dalam data tanpa titik lv null terhitung", () => {
  assert.equal(P.robHari(rob, "2030-01-01"), null);
  const r = P.robHari(rob, rob.hari[3]); assert.ok(r);
  assert.equal(r.L.length, rob.titik.length);
  assert.equal(r.ada.length, rob.titik.filter(t => t.lv[3] != null).length);
  assert.ok(r.L.every(x => x.lv >= -1 && x.lv <= 3));
  assert.deepEqual(r.aktif.map(x => x.lv), [...r.aktif.map(x => x.lv)].sort((a, b) => b - a));
  assert.ok(P.robSeri(rob, rob.hari[0], 5).length <= 5);
});
test("rob: peringatan BMKG disaring menurut tanggal; kejadian per tahun menjumlah ke total", () => {
  for (const b of P.robBmkg(rob, "2026-10-20")) assert.ok(b.tanggal_mulai <= "2026-10-20" && "2026-10-20" <= b.tanggal_selesai);
  const {tahun, akhir} = P.robTahun(rob);
  assert.equal(tahun.reduce((n, t) => n + t.n, 0), rob.kejadian.length);
  assert.equal(akhir, rob.kejadian.map(k => k.tanggal).sort().pop());
});
test("pasang surut: puncak pekan urut turun dan memakai p90 stasiunnya sendiri", () => {
  const L = P.pasutPekan(pas, pas.mulai, 7); assert.ok(L.length > 50);
  for (let i = 1; i < L.length; i++) assert.ok(L[i - 1].cm >= L[i].cm);
  assert.equal(L[0].lebih, L[0].cm - L[0].s.p90);
  assert.deepEqual(P.pasutPekan(pas, "2030-01-01", 7), []);
});
test("gelombang model: tinggi hari = maksimum 24 jam (dm ke m); hari di luar data dibuang", () => {
  const tgl = P.tglWIB(Date.parse(gel.t0) + 24 * 36e5), G = P.gelHari(gel, tgl); assert.ok(G.length > 100);
  for (let i = 1; i < G.length; i++) assert.ok(G[i - 1].hs >= G[i].hs);
  assert.deepEqual(P.gelHari(gel, "2030-01-01"), []);
  assert.equal(P.kelasGel(2.5)[1], "Tinggi"); assert.equal(P.kelasGel(1.2)[1], "Rendah"); assert.equal(P.kelasGel(6.1)[1], "Ekstrem");
});
test("gelombang BMKG: kelas sedang bukan peringatan, yang lewat masa berlaku dibuang", () => {
  const per = {gelombang: [
    {wilayah: "A", prov: "11", dari: "2026-10-01T00:00", sampai: "2026-10-03T00:00", zona: "WIB", sedang: ["x"], tinggi: [], sangat_tinggi: [], ekstrem: []},
    {wilayah: "B", prov: "12", dari: "2026-10-01T00:00", sampai: "2026-10-03T00:00", zona: "WIB", sedang: [], tinggi: ["p1", "p2"], sangat_tinggi: ["p3"], ekstrem: []},
    {wilayah: "C", prov: "13", dari: "2026-09-01T00:00", sampai: "2026-09-03T00:00", zona: "WIB", sedang: [], tinggi: ["z"], sangat_tinggi: [], ekstrem: []}]};
  const o = P.gelBmkg(per, Date.parse("2026-10-02T00:00:00+07:00"));
  assert.deepEqual(o.map(x => [x.prov, x.lv, x.total]), [["12", 2, 3]]);
});
test("halaman: tiap tab TABS punya <section id=p-...>, tanpa titik tengah dan tanpa nama lama", () => {
  const html = teks("index.html"), js = teks("pesisir.js");
  const tabs = [...js.match(/const TABS\s*=\s*\[([\s\S]*?)\];/)[1].matchAll(/\[\s*"([a-z_]+)"\s*,/g)].map(m => m[1]);
  assert.deepEqual(tabs, ["peta", "insight", "tren", "tentang"]);
  for (const t of tabs) assert.match(html, new RegExp(`<section[^>]*id="p-${t}"`), t);
  for (const f of ["index.html", "pesisir.js", "peta.js", "insight.js", "tren.js", "tentang.js", "hitung.js", "grafik.js", "pesisir.css"]) {
    const s = teks(f); assert.ok(!s.includes("·"), f + " memuat titik tengah"); assert.ok(!/Pantau Bencana/i.test(s), f + " menyebut Pantau Bencana"); }
  for (const m of html.matchAll(/<script[^>]*src="(?!https?:)([^"]+)"/g)) assert.ok(fs.existsSync(new URL(m[1].replace(/^\//, "../../public/").replace(/^\.\.\/(?!\.\.)/, "../../public/").replace(/^(?!\.\.)/, "../../public/pesisir/"), import.meta.url)), m[1] + " tidak ada");
});

test("Tren: arah per situs dari cacah transek, judul tanpa angka meter, rentang antarkuartil berurutan", () => {
  const sayung = P.seriSitus(abr).find(x => x.id === "sayung"); assert.ok(sayung?.arah);
  const r = sayung.arah; assert.ok(r.mundur100 <= r.M && r.tinjau <= r.M && r.M === sayung.nT || r.M <= sayung.nT);
  assert.ok(r.q1 <= r.med && r.med <= r.q3, "kuartil tak urut");
  assert.equal(r.yAkhir, sayung.titik.at(-1).y);
  const src = teks("tren.js"), jd = src.match(/return kartuP\("Garis pantai", "abrasi", `([^`]*)`/)[1];
  assert.ok(!/\d\s*m\b|rb\(|Math\.abs/.test(jd.replace(/\$\{fmt\(r\.mundur100\)[^}]*\}/, "").replace("lebih dari 100 m", "")), "judul memuat angka meter: " + jd);
  assert.match(jd, /mundur lebih dari 100 m/);
  assert.match(src, /bertanda tinjau \(lompatan citra\)/);
});
