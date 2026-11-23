// PB-79b: adaptor /gunungapi untuk mesin bersama. Ukuran daftar (F-39), saring tanggal erupsi (F-36), unduh tabel (F-34), pemasangan di index.html.
// Adaptor tidak bisa dimuat utuh tanpa peta, jadi bagiannya dipotong dari sumber dan dijalankan di vm dengan data halaman buatan.
import test from "node:test"; import assert from "node:assert/strict"; import fs from "node:fs"; import vm from "node:vm";
const baca = p => fs.readFileSync(new URL("../../" + p, import.meta.url), "utf8");
const POTONG = (s, a, b) => { const i = s.indexOf(a), j = s.indexOf(b, i); assert.ok(i >= 0 && j > i, "penanda tak ditemukan: " + a); return s.slice(i, j); };
const ST = {dibuat: "2026-11-10T15:47:44+07:00", letusan_cakupan: {dari: "2026-11-09T12:55+07:00", sampai: "2026-11-10T15:47+07:00"},
  gunung: [{nama: "Semeru", prov: "Jawa Timur", level: 3, radius_km: 5, tinggi: 3676}, {nama: "Merapi", prov: "DI Yogyakarta", level: 2, radius_km: 3, tinggi: 2930}, {nama: "Sinabung", prov: "Sumatera Utara", level: 2, tinggi: 2460}, {nama: "Dieng", prov: "Jawa Tengah", level: 1}],
  letusan: [{gunung: "Semeru", waktu: "2026-11-10T15:03+07:00"}, {gunung: "Semeru", waktu: "2026-11-09T20:00+07:00"}, {gunung: "Merapi", waktu: "2026-11-09T13:00+07:00"}],
  perubahan: [{nama: "Sinabung", dari: 3, ke: 2, tgl: "2026-10-19"}]};

function dunia() {
  const peta = baca("public/gunungapi/peta.js"), tabel = baca("public/inti/tabel.js"), app = baca("public/gunungapi/app.js");
  const rows = {innerHTML: "", addEventListener() {}}, ctx = {console, Date, Promise, Object, Math, Number, Set, Array, JSON, String, setTimeout,
    $: s => s === "#rows" ? rows : {innerHTML: "", addEventListener() {}}, esc: x => String(x), fmt: n => String(n), nanti: f => f(), BLN: ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"],
    pilLv: l => `<i>L${l}</i>`, window: {}, Peta: {}, Detail: {}};
  const k = vm.createContext(ctx);
  vm.runInContext(tabel, k);
  vm.runInContext(POTONG(app, "const S = {", "\n") + "\n" + POTONG(peta, "const urut = (a, b)", "const Peta = {") + "\n" + POTONG(peta, "/* tabel standar panel kiri", '$("#levelSeg").addEventListener')
    + "\nglobalThis.__x = {S, KAT_UKURAN, ukAktif, saring, renderDaftar, pilihUkuran, erupsiPadaTgl};", k);
  const x = ctx.__x; x.S.st = JSON.parse(JSON.stringify(ST)); return {k, x, rows};
}
const reg = slug => [{id: "gunungapi", kemampuan: {layar: {ukuran_provinsi: slug}}}];

test("tanpa registri: kolom bawaan Radius dan tanpa segmen", () => {
  const {x, rows} = dunia(); x.renderDaftar();
  assert.ok(rows.innerHTML.includes(">Radius<") && !rows.innerHTML.includes("data-ukuran-k"));
  assert.equal(x.ukAktif().slug, "radius");
});
test("ukuran dari registri: segmen tampil, urut dan kolom mengikuti, ukuran tak terdaftar ditolak", () => {
  const {k, x, rows} = dunia(); x.S.ukuranIzin = k.ukuranDiizinkan(reg(["radius", "erupsi", "tinggi"]), "gunungapi", x.KAT_UKURAN);
  assert.equal(x.S.ukuranIzin.length, 3); x.renderDaftar();
  assert.equal((rows.innerHTML.match(/data-ukuran-k/g) || []).length, 3);
  assert.equal(x.pilihUkuran("erupsi"), true);
  assert.equal(x.S.urut.k, "er"); assert.ok(rows.innerHTML.includes(">Erupsi<"));
  assert.ok(rows.innerHTML.indexOf("Semeru") < rows.innerHTML.indexOf("Merapi"), "Semeru (2 erupsi) di atas Merapi (1)");
  x.pilihUkuran("tinggi"); assert.ok(rows.innerHTML.includes("3676 m"));
  const y = dunia().x; y.S.ukuranIzin = k.ukuranDiizinkan(reg(["radius"]), "gunungapi", y.KAT_UKURAN); assert.equal(y.pilihUkuran("tinggi"), false);
});
test("tanggal erupsi menyaring gunung; tanpa erupsi pada tanggal itu daftar kosong dengan pesan jujur", () => {
  const {x, rows} = dunia(); x.S.tanggal = "2026-11-09";
  assert.deepEqual([...x.saring().map(g => g.nama).sort()], ["Merapi", "Semeru"]);
  x.S.tanggal = "2026-11-10"; assert.deepEqual([...x.saring().map(g => g.nama)], ["Semeru"]);
  x.S.tanggal = "2026-11-08"; assert.equal(x.saring().length, 0); x.renderDaftar();
  assert.ok(rows.innerHTML.includes("Tidak ada erupsi tercatat pada tanggal itu."));
  x.S.tanggal = null; assert.equal(x.saring().length, 4);
});

test("adaptor tanggal: hanya tanggal pada jendela data erupsi bisa dibuka (D16)", () => {
  let adaptor = null; const win = {PilihTanggal: {pasang: a => { adaptor = a; return a; }}, S: {st: JSON.parse(JSON.stringify(ST))}, Peta: {segarkan() {}}};
  const ctx = vm.createContext({console, Date, Number, Object, Math, document: {getElementById: () => null}, ...win, window: {}});
  vm.runInContext(baca("public/gunungapi/tanggal.js"), ctx);
  const k = ctx.window.TanggalGunungapi; assert.ok(adaptor && k);
  assert.deepEqual(JSON.parse(JSON.stringify(k.hitung())), {"2026-11-09": 2, "2026-11-10": 1});
  assert.equal(k.kalender.bisa("2026-11-09"), true); assert.equal(k.kalender.bisa("2026-11-08"), false); assert.equal(k.kalender.bisa("2026-11-11"), false);
  assert.equal(k.kalender.awal, "2026-11-09");
  assert.equal(adaptor.tanggal().length, 3);
  adaptor.ubah("2026-11-09"); assert.equal(ctx.S.tanggal, "2026-11-09");
});

test("adaptor unduh: membaca baris yang tampil, tanpa menghitung ulang", async () => {
  let adaptor = null; const sel = t => ({textContent: t}), tb = (...t) => ({children: [sel(""), ...t.map(sel)]});
  const rows = {querySelector: () => tb("Gunung", "Provinsi", "Radius", "Status"), querySelectorAll: s => s.includes("data-n") ? [tb("Semeru", "Jawa Timur", "5 km", "Siaga"), tb("Merapi", "DI Yogyakarta", "3 km", "Waspada")] : []};
  const doc = {querySelector: s => s === "#rows" ? rows : null, addEventListener() {}};
  const ctx = vm.createContext({console, Date, Promise, document: doc, S: {tanggal: "2026-11-10", level: 3}, LEVEL: {3: ["III", "Siaga"]},
    window: {}});
  vm.runInContext(baca("public/inti/unduh_tabel.js"), ctx);   // tabelHtml dan laporan dari mesin bersama
  Object.assign(ctx.window.UnduhTabel, {tema: a => { adaptor = a; }, registri: async () => [{id: "gunungapi", bagikan: {sumber: "PVMBG"}}]});
  vm.runInContext(baca("public/gunungapi/unduh.js"), ctx);
  const d = await adaptor.kumpul(); assert.equal(adaptor.id, "gunungapi");
  assert.equal(d.tabel.length, 1); assert.deepEqual(JSON.parse(JSON.stringify(d.tabel[0].baris[0])), ["Semeru", "Jawa Timur", "5 km", "Siaga"]);
  assert.ok(d.tabel[0].ket.includes("10 Nov 2026") && d.tabel[0].ket.includes("Level III Siaga")); assert.equal(d.iso, "2026-11-10");
});

test("index.html: berkas dimuat berurutan, penampung ada, tanpa titik tengah atau kata aman di adaptor", () => {
  const h = baca("public/gunungapi/index.html"), pos = f => { const i = h.indexOf(`src="${f}"`); assert.ok(i > 0, "tidak dimuat: " + f); return i; };
  assert.ok(pos("../inti/unduh.js") < pos("../inti/unduh_tabel.js") && pos("../inti/unduh_tabel.js") < pos("unduh.js"));
  assert.ok(pos("../inti/kalender.js") < pos("../inti/pilih_tanggal.js") && pos("../inti/pilih_tanggal.js") < pos("peta.js") && pos("peta.js") < pos("tanggal.js"));
  assert.ok(pos("../inti/brief.js") < pos("brief.js") && pos("../inti/cari.js") < pos("cari.js") && pos("../inti/profil_kab.js") < pos("cari.js"));
  for (const c of ["brief.css", "kalender.css"]) assert.ok(h.includes("../inti/" + c)); assert.ok(h.includes("../unduh_tabel.css"));
  assert.ok(h.includes('id="pilihTanggal"') && h.includes('id="hasil"'));
  for (const f of ["unduh", "tanggal", "brief", "cari", "operasi"]) { const s = baca(`public/gunungapi/${f}.js`); assert.ok(!/·/.test(s), f + " memakai titik tengah"); assert.ok(!/\baman\b/i.test(s.replace(/\/\*[\s\S]*?\*\//g, "")), f + " menulis aman"); }
});
