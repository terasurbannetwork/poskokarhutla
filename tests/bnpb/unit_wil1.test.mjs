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

// ---------- RU-099 WIL-2: K1 sampai K5 di peramban (fungsi murni; keputusan pemilik 27 Nov 2026) ----------
const J = await import("../../public/inti/jam_aturan.js");
const W2 = ctx.window.UnitWil2;
const j = x => JSON.parse(JSON.stringify(x));   // lintas realm vm
const TGL = "2026-11-26";
const hariLalu = n => new Date(Date.UTC(2026, 10, 26) - n * 864e5).toISOString().slice(0, 10);
const cat = (nama, jiwa, kk, {buka = hariLalu(2), data = TGL, kab = "Aceh Utara", prov = "11", tutup, dummy = 0} = {}) =>
  ({meja: "pengungsi", prov, kab, dummy, status_efektif: "berjalan", data: {nama_tempat: nama, jiwa_total: jiwa, kk, tgl_buka: buka, tgl_data: data, ...(tutup ? {tgl_tutup: tutup} : {})}});
const grupDari = (catatan, kab = "Aceh Utara") => W2.tempatDariCatatan(catatan, TGL).get(`11|${W2.normKab(kab)}`);
const laphar = (kab, ung, {mulai = hariLalu(3), terakhir = TGL} = {}) => ({episode: [{tingkat: "kab", prov: "11", kab: "11|" + kab, mulai, terakhir, puncak: {mengungsi_jiwa: ung}}]});

test("WIL-2 K1 dan K2: kebutuhan per tempat dari Jam Aturan, hari ke-3 lawan hari ke-5", () => {
  const k1 = j(W2.barisTempat(J, grupDari([cat("Gor A", 230, 61, {buka: hariLalu(2)})]), TGL))[0];
  assert.deepEqual([k1.beras, k1.air, k1.jamban, k1.hunian, k1.sampah, k1.sabun, k1.hari_ke], [92, 1610, 12, 690, 21, 57.5, 3]);
  assert.equal(j(W2.barisTempat(J, grupDari([cat("Gor A", 230, 61, {buka: hariLalu(4)})]), TGL))[0].air, 3450);
});

test("WIL-2 K3: batas jamban 20 dan 21 jiwa", () => {
  const jamban = n => j(W2.barisTempat(J, grupDari([cat("T", n, 5)]), TGL))[0].jamban;
  assert.deepEqual([jamban(20), jamban(21)], [1, 2]);
});

test("WIL-2 K4: selisih pusat 4.385 lawan daerah 18.908 = 76,8 persen, merah; kedua angka tampil, tidak ada yang dipilih", () => {
  const g = grupDari([cat("Gor A", 18000, 4000), cat("Gor B", 908, 200)]);
  const r = j(W2.ringkasKab(J, g, laphar("Aceh Utara", 4385), TGL));
  assert.equal(r.jiwa_daerah, 18908); assert.equal(r.jiwa_pusat, 4385);
  assert.ok(Math.abs(r.selisih - 0.768) < 0.001 && r.merah === true, r);
  const k = j(W2.skemaRekap([r])).baris[0];
  assert.equal(k.daerah, 18908); assert.equal(k.pusat, 4385); assert.match(k.status, /merah/);
  const dekat = j(W2.ringkasKab(J, grupDari([cat("Gor A", 100, 30)]), laphar("Aceh Utara", 120), TGL));
  assert.equal(dekat.merah, false, "selisih 16,7 persen tidak merah");
  assert.equal(j(W2.ringkasKab(J, grupDari([cat("Gor A", 0, 0)]), laphar("Aceh Utara", 0), TGL)).selisih, 0, "0 lawan 0 = selisih 0");
});

test("WIL-2 K5: tempat basi (data 3 hari) tidak dijumlah dan ditandai; tanpa tempat segar daerah kosong, bukan 0", () => {
  const g = grupDari([cat("Lama", 500, 100, {data: hariLalu(3)}), cat("Baru", 300, 80, {data: hariLalu(2)})]);
  const r = j(W2.ringkasKab(J, g, laphar("Aceh Utara", 4385), TGL));
  assert.equal(r.segar, 1); assert.equal(r.basi, 1); assert.equal(r.jiwa_daerah, 300, "yang basi tidak dijumlah; 2 hari masih segar");
  const baris = j(W2.barisTempat(J, g, TGL)), lama = baris.find(b => b.tempat === "Lama");
  assert.match(lama.status, /basi/); assert.equal(lama.beras, null, "kebutuhan tempat basi tidak diisi"); assert.equal(baris.find(b => b.tempat === "Baru").status, "segar");
  const semuaBasi = j(W2.ringkasKab(J, grupDari([cat("Lama", 500, 100, {data: hariLalu(5)})]), laphar("Aceh Utara", 4385), TGL));
  assert.equal(semuaBasi.jiwa_daerah, null); assert.equal(semuaBasi.selisih, null); assert.equal(semuaBasi.merah, null); assert.equal(semuaBasi.kebutuhan, null);
  assert.equal(j(W2.ringkasKab(J, grupDari([cat("Baru", 300, 80)]), { episode: [] }, TGL)).jiwa_pusat, null, "tanpa episode pusat kosong, bukan 0");
  assert.match(W2.skemaRekap([semuaBasi]).baris[0].status, /belum bisa dibandingkan/);
});

test("WIL-2: tempat di bawah 10 jiwa tidak tampil per tempat tetapi ikut jumlah; catatan terbaru per tempat; ditutup dan dummy tidak ikut", () => {
  const g = grupDari([cat("Kecil", 9, 3), cat("Besar", 10, 3, {data: hariLalu(1)}), cat("Besar", 400, 100), cat("Tutup", 700, 200, {tutup: hariLalu(1)}), cat("Contoh", 900, 200, {dummy: 1})]);
  assert.equal(j(W2.barisTempat(J, g, TGL)).map(b => b.tempat).join(), "Besar");
  assert.equal(j(W2.barisTempat(J, g, TGL))[0].jiwa, 400, "catatan terbaru per tempat");
  const r = j(W2.ringkasKab(J, g, laphar("Aceh Utara", 1), TGL));
  assert.equal(r.jiwa_daerah, 409, "tempat 9 jiwa tidak tampil tetapi tetap dijumlah");
  const tdkSah = grupDari([cat("Salah", 50, 0)]); assert.equal(tdkSah.tidak_sah, 1); assert.equal(tdkSah.tempat.length, 0, "KK 0 dengan jiwa > 0 tidak sah");
  assert.equal(W2.normKab("Kabupaten Aceh Utara"), W2.normKab("Kab. Aceh Utara"));
});
