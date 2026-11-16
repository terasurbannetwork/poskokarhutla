// PB-79a: adaptor layar bersama untuk /kekeringan (F-34 unduh, F-35 brief, F-36 tanggal, F-37/F-38 cari dan profil, F-39 ukuran).
// Mesinnya diuji di pb_*.test.mjs lain; di sini hanya adaptor di public/kekeringan/*: dijalankan di vm dengan data halaman buatan.
import test from "node:test"; import assert from "node:assert/strict"; import fs from "node:fs"; import vm from "node:vm";
const baca = p => fs.readFileSync(new URL("../../" + p, import.meta.url), "utf8");
const stabil = x => JSON.parse(JSON.stringify(x));
const POTONG = (s, a, b) => { const i = s.indexOf(a), j = s.indexOf(b, i); assert.ok(i >= 0 && j > i, "penanda tak ditemukan: " + a); return s.slice(i, j); };

const KAB = {"11|Aceh Barat": {lv: 3, jiwa: [200, 200, 200], spi3: -3.1}, "11|Aceh Timur": {lv: 2, jiwa: [500, 100, 0], spi3: -1.4}, "32|Bogor": {lv: 1, jiwa: [900, 0, 0], spi3: -0.6}};
const PROV = {"11": {lv: 3, total: 5e6, jiwa: [700, 300, 200], spi3: -2.4, kab_n: [2, 2, 1]}, "32": {lv: 1, total: 5e7, jiwa: [900, 0, 0], spi3: -0.6, kab_n: [1, 0, 0]}, "73": {lv: 0, total: 9e6, jiwa: [0, 0, 0], spi3: 0.3, kab_n: [0, 0, 0]}};
const META = {hari_ini: "2026-10-19", dibuat: "2026-10-19T17:57+07:00", spi: {bulan: "2026-08"}, provinsi: {"11": "Aceh", "32": "Jawa Barat", "73": "Sulawesi Selatan"},
  nasional: {total: 286e6, jiwa: [223e6, 147e6, 18e6], kab_n: [350, 246, 80], prov_n: [29, 20, 7]}};
const LAP = {hari: ["2026-10-16", "2026-10-17", "2026-10-18"], nasional: {jiwa31: [100, 200, null], hth_maks: [50, 51, null], hujan: [1, 2, null], kab31: [3, 4, null]},
  prov: {"11": {nama: "Aceh", jiwa31: [0, 70, 0], hth_maks: [1, 4, 0], hujan: [9.1, 8, 0]}, "32": {nama: "Jawa Barat", jiwa31: [10, 90, 0], hth_maks: [30, 20, 0], hujan: [1, 2, 0]}, "99": {nama: "Papua Baru", jiwa31: [null, null, null], hth_maks: [null, null, null], hujan: [null, null, null]}},
  kab: [{prov: "11", kode: "1101", nama: "Aceh Barat", jiwa31: [0, 5, 0], hth_maks: [1, 4, 0], hujan: [1, 2, 3]}, {prov: "11", kode: "1102", nama: "Aceh Tengah", jiwa31: [0, 0, 0], hth_maks: [0, 0, 0], hujan: [5, 5, 5]}, {prov: "32", kode: "3201", nama: "Bogor", jiwa31: [1, 2, 3], hth_maks: [1, 2, 3], hujan: [1, 1, 1]}]};
const fmt = n => String(n), esc = x => String(x), rb = v => v == null ? "–" : String(v), F1 = x => String(x), F2 = x => String(x).replace(".", ",");

test("statik: skrip dan gaya adaptor terpasang berurutan; tanpa titik tengah; tab Operasi tidak dibuat (registri tab_operasi mati)", () => {
  const h = baca("public/kekeringan/index.html"), urut = k => { const i = h.indexOf(k); assert.ok(i > 0, k); return i; };
  assert.ok(urut('src="../inti/unduh_tabel.js"') < urut('src="unduh.js"')); assert.ok(urut('src="../inti/pilih_tanggal.js"') < urut('src="tanggal.js"') && urut('src="peta.js"') < urut('src="tanggal.js"'));
  assert.ok(urut('src="../inti/brief.js"') < urut('src="brief.js"') && urut('src="../inti/cari.js"') < urut('src="cari.js"') && urut('src="../inti/profil_kab.js"') < urut('src="cari.js"'));
  assert.ok(h.includes('id="pilihTanggal"') && h.includes("unduh_tabel.css") && h.includes("inti/kalender.css") && h.includes("inti/brief.css"));
  for (const f of ["unduh", "brief", "tanggal", "cari"]) { const k = baca(`public/kekeringan/${f}.js`); assert.ok(!/·/.test(k), f); assert.ok(!/\baman\b/i.test(k.replace(/\/\*[\s\S]*?\*\//g, "")), f); }
  assert.ok(!fs.existsSync(new URL("../../public/kekeringan/operasi.js", import.meta.url)), "tab Operasi menunggu registri layar.tab_operasi");
  const css = baca("public/kekeringan/kekeringan.css"); assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(css.slice(css.indexOf("PB-79a"))), "CSS baru hanya token var(--...)");
});

test("F-34 unduh: tabel panel dibaca apa adanya (nomor urut dibuang), keterangan membawa bulan SPI dan pil ambang", async () => {
  const sp = t => ({textContent: t, children: []});
  const el = kids => ({children: kids, textContent: kids.map(k => k.textContent).join(" ")});
  const rows = {querySelector: s => s === ".tb.kepala" ? el([sp(""), sp("Provinsi"), sp("SPI ↑"), sp("Jiwa"), sp("Status")]) : null,
    querySelectorAll: s => s === ".tb:not(.kepala)" ? [el([sp("1"), sp("Aceh"), sp("−2,44"), sp("700"), sp("Awas")]), el([sp("2"), sp("Jawa Barat"), sp("–"), sp("–"), sp("Normal")])] : []};
  let tema = null; const win = {UnduhTabel: {tema: a => { tema = a; }, registri: async () => [{id: "kekeringan", bagikan: {sumber: "Deteksi Centurisk97"}}]}};
  const ctx = {window: win, document: {querySelector: s => s === "#rows" ? rows : null, addEventListener() {}}, S: {tanggal: null, jalur: [], meta: META, wil: {prov: PROV}}, spiBulan: () => "Agustus 2026", AMBANG_PIL: () => "Ambang masih hipotesis", Date, Promise, Object};
  vm.runInContext(baca("public/kekeringan/unduh.js"), vm.createContext(ctx));
  assert.equal(tema.id, "kekeringan");
  const L = await tema.kumpul(), t = L.tabel[0];
  assert.equal(L.tabel.length, 1); assert.equal(t.nama, "Provinsi"); assert.deepEqual(stabil(t.kolom), ["Provinsi", "SPI", "Jiwa", "Status"]);
  assert.deepEqual(stabil(t.baris), [["Aceh", "−2,44", "700", "Awas"], ["Jawa Barat", "–", "–", "Normal"]]);
  assert.match(t.ket, /SPI Agustus 2026/); assert.match(t.ket, /hipotesis/); assert.equal(L.iso, "2026-10-19"); assert.equal(L.namaTabel, "provinsi");
  ctx.S.tanggal = "2026-10-17"; const H = await tema.kumpul(); assert.equal(H.iso, "2026-10-17"); assert.match(H.tabel[0].ket, /17 Okt 2026/); assert.match(H.tabel[0].ket, /laporan harian/);
  ctx.document.querySelector = () => null; assert.equal((await tema.kumpul()).tabel.length, 0);
});

test("F-35 brief: angka dari data halaman, pil ambang di subjudul, nilai hilang = null (mesin menulis belum tersedia)", () => {
  let tema = null; const ctx = {Brief: {tema: a => { tema = a; return a; }, pasang() {}}, S: {meta: META, wil: {prov: PROV, kab: KAB}}, LEVEL: ["Normal", "Waspada", "Siaga", "Awas"], fmt, rb, F2, jt: v => String(v), namaProv: k => META.provinsi[k], spiBulan: () => "Agustus 2026", AMBANG_PIL: () => "Ambang masih hipotesis", AMBANG_KAKI: () => "Ambang belum lolos uji kejadian DIBI.", jamWIB: d => d, Date, Object};
  const k = vm.createContext(ctx); vm.runInContext(baca("public/kekeringan/brief.js"), k);
  assert.equal(tema.id, "kekeringan"); assert.equal(tema.siap(), true);
  const B = ctx.Brief.kekeringan.bangun({meta: META, wil: {prov: PROV, kab: KAB}, nama: ctx.namaProv, spiTeks: "Agustus 2026", ambang: "Ambang masih hipotesis", kaki: "Ambang belum lolos uji kejadian DIBI.", cutoff: "x"});
  assert.equal(B.kpi.length, 4); assert.equal(B.kpi[0].v, "80"); assert.equal(B.kpi[0].k, "di 7 provinsi"); assert.match(B.subjudul, /hipotesis/); assert.match(B.catatan, /DIBI/);
  assert.deepEqual(stabil(B.tabel1.baris.map(b => b[0])), ["Aceh", "Jawa Barat"], "Normal tidak masuk; urut tingkat lalu jiwa");
  assert.deepEqual(stabil(B.tabel2.baris), [["Aceh Barat", "Aceh", F2(-3.1), "200"]]);
  const kosong = ctx.Brief.kekeringan.bangun({meta: {}, wil: {}, nama: ctx.namaProv, cutoff: null}); assert.equal(kosong.kpi[0].v, null); assert.equal(kosong.tabel1.baris.length, 0); assert.match(kosong.tabel1.kosong, /belum tersedia/);
  ctx.S.meta = null; assert.equal(tema.siap(), false);
});

function duniaTanggal() {
  let adaptor = null;
  const ctx = {PilihTanggal: {pasang: a => { adaptor = a; }, gambar() {}}, S: {tanggal: null, jalur: [], hal: 0, meta: META, wil: {prov: PROV, kab: KAB}}, document: {querySelector: () => null}, fetch: async () => ({ok: true, json: async () => LAP}),
    fmt, esc, rb, F1, renderDaftar: () => {}, window: {UnduhTabel: {tombol: () => '<button class="ud-btn"></button>'}}, Date, Promise, Number, Map, Object, String, Array, console, setTimeout};
  const k = vm.createContext(ctx);
  vm.runInContext(baca("public/kekeringan/tanggal.js") + "\nglobalThis.__K = window.KekTanggal;", k);
  return {k, ctx, adaptor, K: ctx.__K};
}
test("F-36 tanggal: hanya tanggal laporan yang ada angkanya ditawarkan (D16); hari tanpa satu angka dibuang", async () => {
  const d = duniaTanggal(); await new Promise(r => setTimeout(r, 5));
  assert.equal(d.adaptor.tanggal().length, 2, "10-18 semua null: tidak ditawarkan");
  assert.deepEqual(stabil(d.K.tanggalAda(LAP)), ["2026-10-16", "2026-10-17"]);
  assert.equal(d.adaptor.kalender.bisa("2026-10-17"), true); assert.equal(d.adaptor.kalender.bisa("2026-10-18"), false); assert.equal(d.adaptor.kalender.bisa("2026-09-01"), false);
  assert.deepEqual(stabil((await d.adaptor.kalender.muat()).jumlah), {"2026-10-16": 3, "2026-10-17": 4});
  assert.equal(d.adaptor.riwayat, undefined, "tanpa Real Time/Riwayat");
});
test("F-36 tanggal: daftar harian per provinsi dan per kabupaten; baris tanpa angka dibuang; baris hanya jadi tombol bila wilayahnya punya status", async () => {
  const d = duniaTanggal(); await new Promise(r => setTimeout(r, 5));
  assert.equal(d.K.html(), null, "tanpa tanggal: daftar status biasa");
  assert.deepEqual(stabil(d.K.barisHari(LAP, "2026-10-17").map(r => r.kunci)), ["32", "11"], "Papua Baru tanpa angka dibuang; urut jiwa HTH terbanyak");
  assert.deepEqual(stabil(d.K.barisHari(LAP, "2026-10-17", "11").map(r => r.nama)), ["Aceh Barat", "Aceh Tengah"]);
  assert.deepEqual(stabil(d.K.barisHari(LAP, "2020-01-01")), []);
  d.ctx.S.tanggal = "2026-10-17"; const h = d.K.html(); assert.match(h, /17 Okt 2026/); assert.match(h, /status per tanggal tidak tersedia/); assert.match(h, /data-k="32"/); assert.match(h, /ud-btn/);
  d.ctx.S.jalur = ["11"]; const k = d.K.html(); assert.match(k, /data-k="11\|Aceh Barat"/); assert.ok(!/data-k="11\|Aceh Tengah"/.test(k) && /Aceh Tengah/.test(k), "kabupaten tanpa status tampil tetapi tidak bisa diklik");
  assert.equal(d.K.kode("11|aceh barat"), "1101"); assert.equal(d.K.kode("11|tidak ada"), null);
  d.ctx.S.tanggal = "2026-10-17"; d.ctx.S.jalur = ["99"]; assert.match(d.K.html(), /Tidak ada data hari tanpa hujan pada 17 Okt 2026/);
});

test("F-39 ukuran: tiga ukuran dari data yang ada (status, SPI, jiwa) mengatur urutan; ukuran aktif mengikuti klik kepala kolom", () => {
  const peta = baca("public/kekeringan/peta.js"), tabel = baca("public/inti/tabel.js"), ctx = {console, Object, window: {UnduhTabel: null}, nanti: f => f(), renderDaftar: () => {}, S: {urut: null, ukuranIzin: []}};
  const k = vm.createContext(ctx); vm.runInContext(tabel, k);
  vm.runInContext(POTONG(peta, "const KAT_UKURAN", "function renderDaftar") + "\nglobalThis.__x = {KAT_UKURAN, ukAktif, pilihUkuran, barAlat};", k);
  const x = ctx.__x, reg = s => [{id: "kekeringan", kemampuan: {layar: {ukuran_provinsi: s}}}];
  assert.deepEqual(stabil(k.ukuranDiizinkan(reg([]), "kekeringan", x.KAT_UKURAN)), [], "registri kosong = tanpa segmen");
  assert.equal(x.barAlat(), "", "tanpa izin dan tanpa unduh: tidak ada bilah");
  ctx.S.ukuranIzin = k.ukuranDiizinkan(reg(["jiwa", "status", "spi", "tak-ada"]), "kekeringan", x.KAT_UKURAN);
  assert.deepEqual(stabil(ctx.S.ukuranIzin.map(u => u.slug)), ["status", "spi", "jiwa"], "urutan katalog, slug tak dikenal diabaikan");
  assert.match(x.barAlat(), /data-ukuran-k="spi" aria-pressed="false"/); assert.match(x.barAlat(), /data-ukuran-k="status" aria-pressed="true"/);
  assert.equal(x.pilihUkuran("spi"), true); assert.deepEqual(stabil(ctx.S.urut), {k: "spi", d: 1}); assert.equal(x.ukAktif(), "spi");
  assert.equal(x.pilihUkuran("jiwa"), true); assert.deepEqual(stabil(ctx.S.urut), {k: "jiwa", d: -1});
  assert.equal(x.pilihUkuran("status"), true); assert.equal(ctx.S.urut, null); assert.equal(x.ukAktif(), "status");
  ctx.S.urut = {k: "nm", d: 1}; assert.equal(x.ukAktif(), null, "urut nama: tak ada ukuran aktif");
  ctx.S.ukuranIzin = []; assert.equal(x.pilihUkuran("spi"), false, "ukuran yang tidak dinyalakan registri ditolak");
});

test("F-38/F-37 cari dan profil: statik, dedupe kab berstatus, profil hanya lewat ProfilKab", async () => {
  const kode = baca("public/kekeringan/cari.js"), peta = baca("public/kekeringan/peta.js");
  assert.match(kode, /CariLuas\.tema\(\{id: "kekeringan"/); assert.match(kode, /ProfilKab\.pasang\("kekeringan"\)/);
  assert.match(peta, /window\.KekCari\?\.ketik/); assert.match(peta, /ukuranRegistri/);
  let kirim = null; const buka = [];
  const w = {innerHTML: "", querySelector: s => ({setAttribute: () => buka.push("sembunyi " + s)})};
  const win = {}; const ctx = {window: win, CariLuas: {tema: () => {}, aktif: async () => false, ketik: (q, f) => { kirim = f; }, html: h => h.map((x, i) => `<button data-ci="${i}">${x.n}</button>`).join(""), pilih: () => {}},
    ProfilKab: {pasang: () => ({diizinkan: async () => true, buka: async id => { buka.push("profil " + id); return true; }})}, S: {wil: {kab: KAB}}, namaProv: k => k, kiriPad: () => ({}), peta: {},
    $: () => ({value: "aceh", placeholder: ""}), document: {getElementById: id => id === "cariLuas" ? w : {toggleAttribute() {}}}};
  vm.runInContext(kode, vm.createContext(ctx)); const C = win.KekCari; assert.ok(C);
  assert.equal(C.sudahBerstatus({t: "kab", id: "11.01", n: "Aceh Barat"}), true); assert.equal(C.sudahBerstatus({t: "kab", id: "11.05", n: "Aceh Tengah"}), false); assert.equal(C.sudahBerstatus({t: "desa", id: "11.01.01.2001", n: "Aceh Barat"}), false);
  C.ketik("aceh"); kirim({hasil: [{t: "kab", id: "11.01", n: "Aceh Barat"}, {t: "kab", id: "11.05", n: "Aceh Tengah"}, {t: "desa", id: "11.01.01.2001", n: "Desa A"}, {t: "faskes", n: "RS A", c: [1, 2]}]});
  assert.deepEqual(buka, ['sembunyi [data-ci="0"]'], "hanya kab yang sudah berstatus disembunyikan");
  buka.length = 0; assert.equal(await C.pilih(1), true); assert.deepEqual(buka, ["profil 11.05"]); assert.equal(await C.pilih(3), false, "faskes: hanya terbang, tanpa profil");
});
