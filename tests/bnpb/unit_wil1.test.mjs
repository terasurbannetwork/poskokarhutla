/* RU-078 dit_wilayah.json dan RU-079 Meja Wilayah (wil1.py hasil, wil1.js fungsi urut). Jalan: node --test tests/bnpb/unit_wil1.test.mjs */
import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {spawnSync} from "node:child_process";
import vm from "node:vm";
import {fileURLToPath} from "node:url";

const AKAR = fileURLToPath(new URL("../..", import.meta.url));
const baca = p => readFileSync(AKAR + p, "utf8");
const DIT = JSON.parse(baca("public/data/bnpb/dit_wilayah.json"));
const KODE_38 = ["11","12","13","14","15","16","17","18","19","21","31","32","33","34","35","36","51","52","53","61","62","63","64","65","71","72","73","74","75","76","81","82","91","92","93","94","95","96"];

test("RU-078: 38 provinsi dan IKN, tiap provinsi tepat di satu direktorat", () => {
  assert.deepEqual(DIT.direktorat.map(d => d.id), ["wil1", "wil2", "wil3"]);
  const semua = DIT.direktorat.flatMap(d => d.provinsi);
  assert.equal(semua.length, 39, "38 provinsi + IKN");
  const kode = semua.map(p => p.kode).filter(Boolean);
  assert.equal(new Set(kode).size, 38, "kode kembar");
  assert.deepEqual([...kode].sort(), KODE_38, "kode provinsi tidak sama dengan daftar 38 provinsi");
  assert.equal(semua.filter(p => p.kode === null).length, 1);
  assert.equal(semua.find(p => p.kode === null).provinsi, "Daerah Ibu Kota Nusantara");
  assert.equal(new Set(semua.map(p => p.provinsi)).size, 39, "nama kembar");
  assert.deepEqual(DIT.direktorat.map(d => d.provinsi.length), [13, 14, 12]);
});

test("RU-078: tiap provinsi disebut di kutipan pasalnya, dan kutipan sama dengan teks pasal di seed", () => {
  const seed = baca("data/hukum/seed.sql");
  for (const d of DIT.direktorat) {
    for (const p of d.provinsi) assert.ok(d.kutipan.includes(p.kode ? `Provinsi ${p.provinsi}` : p.provinsi), `${d.id}: ${p.provinsi} tidak ada di kutipan ${d.pasal}`);
    const nama = (d.kutipan.match(/Provinsi /g) || []).length + (d.kutipan.includes("Daerah Ibu Kota Nusantara") ? 1 : 0);
    assert.equal(nama, d.provinsi.length, `${d.id}: kutipan menyebut ${nama} wilayah, berkas ${d.provinsi.length}`);
    const baris = seed.split("\n").find(b => b.startsWith("INSERT INTO hukum_segmen") && b.includes("'perban-11-2025'") && b.includes(`'${d.pasal}'`));
    assert.ok(baris, `segmen ${d.pasal} Perban 11/2025 tidak ada di seed`);
    assert.ok(baris.includes(d.kutipan.replaceAll("'", "''")), `${d.id}: kutipan tidak sama dengan teks ${d.pasal} di seed`);
  }
});

// ---------- RU-079 ----------
const ctx = {window: {}, Date, Intl, Number, String, Array, Math, Object, isNaN, Set};
vm.createContext(ctx);
vm.runInContext(baca("public/inti/format.js") + "\n;globalThis.esc = esc; globalThis.fmt = fmt;", ctx);
vm.runInContext(baca("public/bnpb/unit/rapor.js"), ctx);
vm.runInContext(baca("public/bnpb/unit/wil1.js"), ctx);
const W = ctx.window.UnitWil1, R = ctx.window.UnitRapor;
const py = (kode, masuk) => { const p = spawnSync("python3", ["-I", "-c", `import sys,json;sys.path.insert(0,'scripts/bnpb/unit');import wil1,rapor\n${kode}`], {cwd: AKAR, input: JSON.stringify(masuk), encoding: "utf8"}); assert.equal(p.status, 0, p.stderr); return p.stdout; };
const BUTIR = [{tenggat: "2026-11-28", jiwa: 5, kab_kode: "1201", kab: "A", prov: "12"}, {tenggat: null, jiwa: 9, kab_kode: "1101", kab: "B", prov: "11"},
  {tenggat: "2026-11-27", jiwa: 1, kab_kode: "1301", kab: "C", prov: "13"}, {tenggat: "2026-11-28", jiwa: 50, kab_kode: "1202", kab: "D", prov: "12"},
  {tenggat: "2026-11-28", jiwa: 5, kab_kode: "1101", kab: "E", prov: "11"}, {tenggat: "2026-11-28", jiwa: null, kab_kode: null, kab: null, prov: "14"}];

test("urutan wil1.js sama dengan wil1.py: tenggat terdekat, pengungsi terbanyak, kode wilayah", () => {
  const js = JSON.parse(JSON.stringify(W.urut(BUTIR).map(b => b.kab)));   // vm: deepEqual lintas realm gagal
  const pyUrut = JSON.parse(py("print(json.dumps([x['kab'] for x in sorted(json.load(sys.stdin), key=wil1.urut_kunci)]))", BUTIR));
  assert.deepEqual(js, pyUrut);
  assert.deepEqual(js, ["C", "D", "E", "A", null, "B"]);
});

const DATA = {hari: "2026-11-26", tipe: {1: {tersedia: true, alasan: null}, 2: {tersedia: false, alasan: "laporan harian terlalu tua"}, 3: {tersedia: true}, 4: {tersedia: false, alasan: "data DSP di meja"}, 5: {tersedia: true}},
  direktorat: {wil1: {nama: "Wilayah I", butir: [{tipe: 1, ...BUTIR[0], jenis: "Banjir", alasan: "Banjir di A: laporan belum mencatat pendampingan BNPB.", sumber: ["laphar_riwayat"]}, {tipe: 5, ...BUTIR[4], jenis: "banjir", alasan: "Prakiraan.", sumber: ["prediksi"]}]},
    wil2: {nama: "Wilayah II", butir: [{tipe: 1, ...BUTIR[3], jenis: "Banjir", alasan: "Banjir di D.", sumber: ["laphar_riwayat"]}]}, wil3: {nama: "Wilayah III", butir: []}}};

test("pilih: satu direktorat, Semua menggabung dan mengurut, tipe tanpa data tidak jadi nol", () => {
  const ks = (d, t) => JSON.parse(JSON.stringify(W.pilih(DATA, d, t).butir.map(b => b.kab)));
  assert.deepEqual(ks("wil1", 1), ["A"]);
  assert.deepEqual(ks("semua", 1), ["D", "A"]);
  const t2 = W.pilih(DATA, "semua", 2);
  assert.equal(t2.tersedia, false); assert.match(t2.alasan, /terlalu tua/);
  const k = W.skema(DATA, "semua", 2); assert.equal(k.angka[0].nilai, null, "tipe tanpa data: angka kosong, bukan 0");
  assert.match(R.html(k, {dibuat: "2026-11-26T01:00:00Z", basi_jam: 48}, Date.parse("2026-11-26T02:00:00Z")), /belum ada data/);
  assert.equal(W.pilih(DATA, "wil3", 1).butir.length, 0); assert.equal(W.pilih(DATA, "wil3", 1).tersedia, true, "tersedia tanpa butir = nol yang dihitung");
});

test("kartu antrean lolos skema rapor.py, tanpa titik tengah dan kata aman, kepala = nama seksi", () => {
  const k = W.skema(DATA, "semua", 1);
  py("k=json.load(sys.stdin);k.pop('aturan');rapor.kartu(aturan=(),**k);print('ok')", k);
  const h = R.html(k, {dibuat: "2026-11-26T01:00:00Z", basi_jam: 48}, Date.parse("2026-11-26T02:00:00Z"));
  assert.doesNotMatch(h, /·|\baman\b/i); assert.doesNotMatch(h, /Sumber: |ex-ft/);
  assert.match(h, /<h3 id="wil1-antrean-j"><svg[^]*?<\/svg>Belum didampingi<\/h3>/);
  assert.match(h, /data-label="Alasan"/); assert.match(h, /Banjir di D/);
});

test("berkas meja_wilayah dari wil1.py lolos rapor.periksa_berkas dan memuat tiap butir dengan sumber", () => {
  const b = JSON.parse(py("import datetime;b=wil1.jalan(datetime.datetime(2026,11,26,3,0,tzinfo=datetime.timezone.utc))['meja_wilayah'];rapor.periksa_berkas({'dibuat':'2026-11-26T03:00:00Z','basi_jam':48,**b});print(json.dumps(b))", {}));
  assert.deepEqual(Object.keys(b.data.direktorat), ["wil1", "wil2", "wil3"]);
  for (const d of Object.values(b.data.direktorat)) for (const x of d.butir) { assert.ok(x.sumber.length && x.alasan, "butir tanpa alasan atau sumber"); assert.ok([1, 2, 3, 4, 5].includes(x.tipe)); }
  assert.ok(Object.values(b.data.tipe).every(t => t.tersedia || t.alasan), "tipe tanpa data wajib beralasan");
  const tampil = ctx.window.UnitTampil["WIL-1"];
  assert.equal(typeof tampil, "function");
});
