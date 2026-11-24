/* Layar /lapor/data/ (LJ-15): bagian murni public/lapor/data/murni.js dicocokkan ke spek server, plus antrean luring jalur rahasia.
   node --test tests/lapor/layar_data.test.mjs */
import {test} from "node:test";
import assert from "node:assert/strict";
import {FORM, JENIS, METRIK, METRIK_TAB, bangunIsian, ringkasObjek, teksRekap, wajahTampil, punyaPribadi, layakAntre, kondisiBaris, wajibIni, tglIndo, saluranJenis, teksNilai, labelButir} from "../../public/lapor/data/murni.js";
import {spek, NAMA_PRIBADI, METRIK_NIHIL, validasi, JENIS as JENIS_SERVER} from "../../src/lapor_lanjut_spek.js";
import "../../public/inti/antre.js";

test("FORM layar = SPEK server: nama butir, tanda pribadi, nilai pilihan, urutan jenis", () => {
  assert.deepEqual(JENIS.map(j => j[0]), JENIS_SERVER);
  for (const j of JENIS_SERVER) {
    const s = spek(j).isian;
    assert.deepEqual(FORM[j].map(f => f[0]), s.map(b => b[0]), `butir ${j}`);
    assert.deepEqual(FORM[j].filter(f => f[4]).map(f => f[0]), NAMA_PRIBADI[j], `pribadi ${j}`);
    for (const [nama, , tp] of FORM[j]) {
      const sj = s.find(b => b[0] === nama)[1];
      if (tp.t === "pilih" || tp.t === "banyak") assert.deepEqual(tp.v, sj.v, `pilihan ${j}.${nama}`);
      if (tp.t === "angka") assert.equal(sj.t, "angka");
    }
  }
});

test("wajib layar sejalan dengan server untuk isian lengkap dan kosong", () => {
  for (const j of JENIS_SERVER) {
    const wajibServer = validasi(j, {}).galat;   // isian kosong: semua butir wajib tanpa syarat muncul sebagai galat
    const wajibLayar = FORM[j].filter(f => wajibIni(f, {})).map(f => f[0]);
    assert.deepEqual(wajibLayar.sort(), wajibServer.sort(), j);
  }
  assert.ok(wajibIni(FORM.jiwa.find(f => f[0] === "hp"), {kk: "diri"}) && !wajibIni(FORM.jiwa.find(f => f[0] === "hp"), {kk: "abc"}));
});

test("semua metrik nihil di layar dikenal server; nama dan kelompok tab ada labelnya", () => {
  for (const m of Object.keys(METRIK)) assert.ok(METRIK_NIHIL.has(m), m);
  for (const ms of Object.values(METRIK_TAB)) for (const m of ms) assert.ok(METRIK[m], m);
  assert.equal(METRIK_TAB.prasarana.length, new Set(METRIK_TAB.prasarana).size);
});

test("bangunIsian membuang kosong, mengubah angka, mempertahankan false dan daftar", () => {
  const i = bangunIsian("rumah", {kk: " Budi ", desa: "", jiwa: "4", terendam: false, tingkat: "rb", bukan_butir: "x"});
  assert.deepEqual(i, {kk: "Budi", jiwa: 4, terendam: false, tingkat: "rb"});
  assert.deepEqual(bangunIsian("usaha", {besaran: "1,5", jenis: "sawah"}), {besaran: 1.5, jenis: "sawah"});
  assert.equal(bangunIsian("usaha", {besaran: "abc"}).besaran, "abc");   // server yang menolak, dengan nama butirnya
  assert.deepEqual(bangunIsian("jiwa", {rentan: []}), {});
});

test("kosong tidak pernah tampil 0; nol dari nihil tampil 0", () => {
  assert.equal(teksRekap(null, "meninggal"), "belum didata");
  assert.equal(teksRekap(undefined), "belum didata");
  assert.equal(teksRekap(0, "meninggal"), "0 orang"); assert.equal(teksRekap(3, "rumah_rb"), "3 rumah"); assert.equal(teksRekap(2, "listrik_unit"), "2 unit"); assert.equal(teksRekap(4, "mengungsi"), "4 jiwa");
  assert.equal(teksRekap(1.5, "jalan_km"), "1,5 km"); assert.equal(teksRekap(1.234, "jalan_km"), "1,2 km");
});

test("kartu objek tersamar tidak memuat nama dan tidak menulis undefined", () => {
  const r = ringkasObjek({jenis: "jiwa", urut: 3, data: {umur: 30, jk: "p", desa_asal: "Sukamaju", kk: "diri"}, pribadi: null});
  assert.equal(r.judul, "tanpa nama"); assert.ok(r.pil.includes("Kepala keluarga")); assert.ok(!JSON.stringify(r).includes("undefined"));
  const k = ringkasObjek({jenis: "korban", urut: 1, data: {status: "hilang", pencarian: "dicari", umur: 8, desa: "X"}, pribadi: {nama: "Ani"}});
  assert.equal(k.judul, "Ani"); assert.deepEqual(k.pil, ["Hilang", "Masih dicari"]);
});

test("foto wajah hanya dewasa tidak menolak, dan korban hilang yang dicari", () => {
  assert.ok(wajahTampil("jiwa", {umur: 18})); assert.ok(!wajahTampil("jiwa", {umur: 17})); assert.ok(!wajahTampil("jiwa", {umur: 30, menolak_foto: true}));
  assert.ok(wajahTampil("korban", {status: "hilang", pencarian: "dicari"})); assert.ok(!wajahTampil("korban", {status: "hilang", pencarian: "ditemukan_hidup"}));
  assert.ok(!wajahTampil("rumah", {}));
});

test("jenis berisi data pribadi antre di saluran rahasia, sisanya tidak", () => {
  assert.deepEqual(JENIS_SERVER.filter(punyaPribadi), ["rumah", "jiwa", "korban"]);
  assert.ok(layakAntre(0) && layakAntre(503) && layakAntre(429) && !layakAntre(400) && !layakAntre(409) && !layakAntre(403));
});

test("kondisi akhir: belum didata disebut dengan nama, tidak nol", () => {
  const k = kondisiBaris({status: "selesai_catatan", alasan: [{metrik: "hilang", nilai: 2, teks: "korban hilang belum ditemukan"}, {metrik: "mengungsi", nilai: null, teks: "warga masih mengungsi: belum didata"}], belum_didata: ["rumah_rb"]});
  assert.equal(k.status, "Selesai dengan catatan"); assert.deepEqual(k.baris, ["korban hilang belum ditemukan: 2", "warga masih mengungsi: belum didata"]); assert.deepEqual(k.belum, ["Rumah rusak berat"]);
});

/* antrean luring: saluran rahasia berpenyimpanan memori tidak menyentuh localStorage atau IndexedDB (D21) */
test("saluran rahasia di memori: butir pribadi tidak tertulis di localStorage maupun IndexedDB, butir umum terkirim ulang sekali", async () => {
  const {PbAntre} = globalThis, tulisan = [];
  globalThis.localStorage = {getItem: () => null, setItem: (k, v) => tulisan.push(["ls", k, v]), removeItem() {}};
  globalThis.indexedDB = {open: () => { tulisan.push(["idb"]); throw new Error("tidak boleh"); }};
  const kirim = []; let putus = true;
  const rahasia = PbAntre.saluran("lanjut-rahasia-uji", {rahasia: true, simpan: PbAntre.memori(), langsung: false, pemicu: false, rand: () => 0.5,
    kirim: async b => { kirim.push(b[0].klien_id); return putus ? {s: 0, j: {}} : {s: 201, j: {}}; }});
  const umum = PbAntre.saluran("lanjut-umum-uji", {simpan: PbAntre.memori(), langsung: false, pemicu: false, rand: () => 0.5, kirim: async b => { kirim.push(b[0].klien_id); return putus ? {s: 0, j: {}} : {s: 201, j: {}}; }});
  await rahasia.masukkan({klien_id: "abcd1234abcd", data: {jenis: "jiwa", isian: {nama: "Rekaan", nik: "1234567890123456"}}});
  await umum.masukkan({klien_id: "efgh5678efgh", data: {jenis: "titik", isian: {nama: "Balai"}}});
  await rahasia.kirimSekarang(); await umum.kirimSekarang();
  assert.deepEqual(tulisan, [], "tidak ada penulisan ke penyimpanan perangkat");
  assert.equal(await rahasia.menunggu(), 1); assert.equal(await umum.menunggu(), 1);
  putus = false; await rahasia.kirimSekarang(); await umum.kirimSekarang();
  assert.equal(await rahasia.menunggu(), 0); assert.equal(await umum.menunggu(), 0);
  assert.deepEqual(kirim.filter(k => k === "abcd1234abcd").length, 2, "dua percobaan: putus lalu sambung");
  delete globalThis.localStorage; delete globalThis.indexedDB;
});

test("jenis dengan butir pribadi (spek f[4]) selalu ke saluran rahasia; tanggal dan label pribadi terbaca manusia", () => {
  for (const j of JENIS_SERVER) assert.equal(saluranJenis(j), NAMA_PRIBADI[j].length ? "rahasia" : "umum", j);
  assert.equal(saluranJenis("jiwa"), "rahasia"); assert.equal(saluranJenis("korban"), "rahasia"); assert.equal(saluranJenis("titik"), "umum");
  assert.equal(tglIndo("2026-11-20"), "20 November 2026"); assert.equal(tglIndo(null), null);
  assert.equal(labelButir("rumah", "nik_kk"), "NIK kepala keluarga"); assert.equal(teksNilai("jiwa", "jk", "l"), "Laki-laki");
  assert.equal(teksNilai("jiwa", "rentan", ["hamil_t1", "lansia"]), "Hamil trimester 1, Lansia"); assert.equal(teksNilai("jiwa", "menolak_foto", true), "Ya");
  assert.equal(teksNilai("jiwa", "hp", "tidak_ada"), "Tidak ada"); assert.equal(teksNilai("korban", "terakhir_waktu", "2026-11-03"), "3 November 2026");
});
