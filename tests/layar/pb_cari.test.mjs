// PB-75 (F-38): mesin cari luas public/inti/cari.js. Skrip klasik dimuat lewat vm. Diperiksa: pencocokan murni (huruf besar/kecil,
// diakritik, urutan, batas jumlah), saringan lapisan dari registri, lapisan khas karhutla tidak ikut, dan data dimuat malas.
import test from "node:test"; import assert from "node:assert/strict"; import fs from "node:fs"; import vm from "node:vm";
const baca = p => fs.readFileSync(new URL("../../" + p, import.meta.url), "utf8");
function dunia({reg, berkas = {}} = {}) {
  const diminta = [];
  const g = {console, Date, Math, Number, JSON, Promise, Object, Array, Set, setTimeout, clearTimeout, Intl,
    fetch: async u => { diminta.push(u); if (u === "/bencana.json") return {ok: !!reg, json: async () => reg}; const d = berkas[u]; return {ok: d !== undefined, status: d !== undefined ? 200 : 404, json: async () => d}; }};
  g.window = g; vm.runInContext(baca("public/inti/cari.js"), vm.createContext(g)); return {g, diminta, M: g.CariLuas.model};
}
const lurus = x => JSON.parse(JSON.stringify(x));
const item = (M, t, n, k = "", p = "32") => M.siapkan({t, n, k, p});

test("norm: huruf besar/kecil dan diakritik diabaikan", () => {
  const {M} = dunia();
  assert.equal(M.norm("  Yogyakarta, DI  "), "yogyakarta di"); assert.equal(M.norm("Pasar Éclair"), "pasar eclair");
});
test("cocok: persis di depan, lalu diawali, lalu kata di tengah", () => {
  const {M} = dunia();
  const xs = [item(M, "desa", "Sukamaju Baru"), item(M, "desa", "Baru"), item(M, "desa", "Desa Barukan"), item(M, "desa", "Baru Jaya")];
  const r = M.cocok(xs, "BARU", {perLapis: 10}).map(i => i.n);
  assert.deepEqual(lurus(r), ["Baru", "Baru Jaya", "Desa Barukan", "Sukamaju Baru"]);
  assert.deepEqual(lurus(M.cocok(xs, "b")), []);   // kurang dari 2 huruf
});
test("cocok: batas per lapisan dan total", () => {
  const {M} = dunia();
  const xs = ["a", "b", "c", "d", "e"].flatMap(x => ["desa", "sekolah", "faskes", "posko", "bpbd", "bandara"].map(t => item(M, t, `Cianjur ${x}`)));
  const r = M.cocok(xs, "cianjur");
  assert.ok(r.length <= M.BATAS_TOTAL); assert.ok(["desa", "sekolah", "faskes"].every(t => r.filter(i => i.t === t).length <= M.BATAS_LAPIS));
  assert.equal(M.cocok(xs, "cianjur", {perLapis: 1, total: 100}).length, 6);
});
test("cocok: semua kata harus cocok dan lapisan disaring", () => {
  const {M} = dunia();
  const xs = [item(M, "sekolah", "SDN 1 Cianjur", "Cianjur"), item(M, "faskes", "RS Cianjur"), item(M, "desa", "Cianjur", "Kec. Cianjur, Cianjur")];
  assert.deepEqual(lurus(M.cocok(xs, "sdn cianjur").map(i => i.t)), ["sekolah"]);
  assert.deepEqual(lurus(M.cocok(xs, "cianjur", {lapisan: ["faskes"]}).map(i => i.t)), ["faskes"]);
});
test("lapisan dari registri: hanya slug dikenal, kosong bila tidak ada", () => {
  const {M} = dunia();
  const reg = {bencana: [{id: "gempa", kemampuan: {layar: {cari: ["sekolah", "desa", "konsesi", "pabrik", "daops"]}}}, {id: "banjir", kemampuan: {layar: {cari: []}}}, {id: "x", kemampuan: {}}]};
  assert.deepEqual(lurus(M.lapisanDari(reg, "gempa")), ["desa", "sekolah"]);
  for (const id of ["banjir", "x", "tak-ada"]) assert.deepEqual(lurus(M.lapisanDari(reg, id)), []);
  assert.deepEqual(lurus(M.lapisanDari(null, "gempa")), []);
});
test("lapisan khas karhutla tidak ada di mesin", () => {
  const {M} = dunia();
  for (const t of ["pabrik", "sawit", "hti", "hph", "tambang", "daops", "tn", "khg", "gunung", "sungai"]) assert.ok(!M.LAPISAN.includes(t), t);
  assert.equal(Object.keys(M.SUMBER).some(u => /daops|pabrik|konsesi|kawasan/.test(u)), false);
});
const BERKAS = {
  "/data/desa_cari.json": {kab: {"32.03": "Cianjur"}, baris: [["32.03.01.2001", "Sukamulya", "Cianjur"]]},
  "/data/metar.json": [{nama: "Bandara Halim", prov: "31", icao: "WIHH", lon: 106.89, lat: -6.26}],
  "/data/bpbd.json": {kantor: [{nama: "KAB. CIANJUR", prov: "32", kab: "Cianjur", lon: 107.1, lat: -6.8}]},
  "/data/posko.json": {pusat: [], menengah: [], posko: []}, "/data/fasilitas.json": [{t: "rs", nama: "RSUD Cianjur", prov: "32", lon: 107.14, lat: -6.82}],
  "/data/sekolah.json": {kolom: ["nama", "prov", "desa", "kab", "lon", "lat"], baris: [["SDN 1 Cianjur", "32", "SUKAMULYA", "Cianjur", 107.1, -6.8]]}};
test("ketik: memuat malas, hanya berkas lapisan yang dinyalakan, terbang ke titik", async () => {
  const reg = {bencana: [{id: "gempa", kemampuan: {layar: {cari: ["faskes", "bpbd"]}}}]};
  const {g, diminta} = dunia({reg, berkas: BERKAS}); const terbang = [];
  g.CariLuas.tema({id: "gempa", nama: k => "Prov " + k, terbang: t => terbang.push(lurus(t))});
  assert.equal(diminta.length, 0);   // belum mengetik = belum ada permintaan
  g.CariLuas.ketik("c", r => assert.deepEqual(lurus(r), {hasil: [], memuat: false})); assert.equal(diminta.length, 0);
  const akhir = await new Promise(ok => { let u; g.CariLuas.ketik("cianjur", r => { u = r; if (!r.memuat) ok(u); }); });
  assert.deepEqual(lurus(akhir.hasil.map(h => h.jenis).sort()), ["Fasilitas kesehatan", "Kantor BPBD"]);
  assert.deepEqual(lurus(diminta.filter(u => u !== "/bencana.json").sort()), ["/data/bpbd.json", "/data/fasilitas.json"]);
  assert.equal(akhir.hasil[0].prov.startsWith("Prov "), true);
  assert.ok(await g.CariLuas.pilih(0)); assert.equal(terbang.length, 1); assert.equal(terbang[0].c.length, 2);
  assert.ok(g.CariLuas.html(akhir.hasil).includes("data-ci=\"0\""));
});
test("ketik: registri kosong atau gagal tidak memuat apa pun", async () => {
  for (const reg of [null, {bencana: [{id: "gempa", kemampuan: {layar: {cari: []}}}]}]) {
    const {g, diminta} = dunia({reg, berkas: BERKAS}); g.CariLuas.tema({id: "gempa", nama: k => k, terbang() {}});
    const r = await new Promise(ok => g.CariLuas.ketik("cianjur", ok)); assert.deepEqual(lurus(r), {hasil: [], memuat: false});
    assert.deepEqual(lurus(diminta), ["/bencana.json"]); assert.equal(await g.CariLuas.aktif(), false);
  }
});
test("ketik: ketikan lama dibatalkan (debounce)", async () => {
  const reg = {bencana: [{id: "gempa", kemampuan: {layar: {cari: ["faskes"]}}}]};
  const {g} = dunia({reg, berkas: BERKAS}); g.CariLuas.tema({id: "gempa", nama: k => k, terbang() {}}); let lama = 0;
  g.CariLuas.ketik("cia", () => lama++);
  const r = await new Promise(ok => g.CariLuas.ketik("rsud", x => { if (!x.memuat) ok(x); }));
  assert.equal(lama, 0); assert.equal(r.hasil[0].n, "RSUD Cianjur");
});
const tunggu = (g, q) => new Promise(ok => g.CariLuas.ketik(q, r => { if (!r.memuat) ok(r); }));
test("muat gagal di tengah indeks tidak menggandakan item sesudah dimuat ulang", async () => {
  const reg = {bencana: [{id: "gempa", kemampuan: {layar: {cari: ["faskes"]}}}]};
  const bagus = [{t: "rs", nama: "RSUD Cianjur", prov: "32", lon: 107.1, lat: -6.8}];
  const berkas = {"/data/fasilitas.json": [...bagus, null]};   // baris kedua melempar saat dipetakan
  const {g, diminta} = dunia({reg, berkas}); g.CariLuas.tema({id: "gempa", nama: k => k, terbang() {}});
  assert.deepEqual(lurus((await tunggu(g, "cianjur")).hasil), []);   // gagal: tidak ada item setengah jadi
  berkas["/data/fasilitas.json"] = bagus;
  const r = await tunggu(g, "cianjur"); assert.equal(r.hasil.length, 1);
  assert.equal(diminta.filter(u => u === "/data/fasilitas.json").length, 2);
  assert.equal((await tunggu(g, "cianjur")).hasil.length, 1);   // ketikan ulang tetap satu item
});
test("sekolah (lapisan besar) baru dimuat pada 3 huruf", async () => {
  const reg = {bencana: [{id: "gempa", kemampuan: {layar: {cari: ["sekolah", "faskes"]}}}]};
  const {g, diminta} = dunia({reg, berkas: BERKAS}); g.CariLuas.tema({id: "gempa", nama: k => k, terbang() {}});
  await tunggu(g, "ci");
  assert.ok(!diminta.includes("/data/sekolah.json")); assert.ok(diminta.includes("/data/fasilitas.json"));
  const r = await tunggu(g, "cia");
  assert.ok(diminta.includes("/data/sekolah.json")); assert.ok(r.hasil.some(h => h.t === "sekolah"));
  assert.equal((await tunggu(g, "ci")).hasil.some(h => h.t === "sekolah"), false);   // 2 huruf: sekolah tidak ikut
});
test("pemindaian bertahap = pemindaian penuh, juga dari himpunan cocok sebelumnya; ketikan baru membatalkan", async () => {
  const {M} = dunia();
  const xs = Array.from({length: 45000}, (_, k) => item(M, k % 3 ? "desa" : "sekolah", `Desa ${k % 7 ? "Sukamaju" : "Cianjur"} ${k}`, "Kab"));
  const penuh = M.cocok(xs, "cianjur 1", {lapisan: ["desa", "sekolah"]});
  const a = await M.cocokBertahap(xs, "cianjur", {lapisan: ["desa", "sekolah"]});
  const b = await M.cocokBertahap(a.lolos, "cianjur 1", {lapisan: ["desa", "sekolah"]});   // diperpanjang: pindai hanya yang cocok tadi
  assert.ok(a.lolos.length < xs.length);
  assert.deepEqual(b.hasil.map(i => i.n), penuh.map(i => i.n));
  assert.deepEqual((await M.cocokBertahap(xs, "cianjur 1", {lapisan: ["desa", "sekolah"]})).hasil.map(i => i.n), penuh.map(i => i.n));
  assert.equal(await M.cocokBertahap(xs, "cianjur", {}, () => true), null);   // dibatalkan di tengah
});
