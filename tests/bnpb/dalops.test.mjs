/* Fungsi murni layar Pantau Banjir Dalops (public/bnpb/dalops_hitung.js): kelompok per kab dan status surut, lama banjir, perlu ditanya,
   status banjir per kab, urutan siaga, teks WA. Kasus diambil dari deck "Situasi Banjir Sepekan" 2 Nov 2026.
   Jalan: node --test tests/bnpb/dalops.test.mjs */
import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import "../../public/bnpb/dalops_hitung.js";
import "../../public/bnpb/dalops_karhutla.js";
import "../../public/bnpb/dalops_gunungapi.js";
const H = globalThis.DalopsHitung, HARI = "2026-11-01";
const K = (id, kab, mulai, terakhir, surut, x = {}) => ({id, prov: "Aceh", prov_kode: "11", kab: ["Kab. " + kab], kab_kode: ["11|" + kab], mulai, pertama: mulai, terakhir,
  kk: null, jiwa: null, mengungsi: null, rumah_terendam: null, tinggi_cm: null, surut, kondisi: "", ...x});

test("dua kejadian sekab dan sestatus dalam sepekan jadi satu baris: mulai paling awal, kabar paling akhir, angka terakhir", () => {
  const kel = H.kelompok([K("a", "Aceh Tenggara", "2026-10-26", "2026-10-26", false), K("b", "Aceh Tenggara", "2026-10-28", "2026-10-30", false, {kk: 532, jiwa: 1920})], HARI);
  assert.equal(kel.length, 1);
  assert.deepEqual([kel[0].mulai, kel[0].terakhir, kel[0].kk, kel[0].jiwa], ["2026-10-26", "2026-10-30", 532, 1920]);
  assert.equal(H.lama(kel[0], HARI), 7, "belum surut: dihitung s.d. hari logbook, termasuk hari mulai (deck: 7)");
});

test("kab yang punya kejadian surut dan belum muncul di dua kelompok; kejadian senyap > sepekan tidak memanjangkan lama", () => {
  const kel = H.kelompok([K("a", "Langkat", "2026-10-28", "2026-11-01", true), K("b", "Langkat", "2026-10-29", "2026-10-30", false), K("c", "Langkat", "2026-10-05", "2026-10-05", false)], HARI);
  assert.equal(kel.length, 3);
  const pekan = H.sepekan(kel, HARI);
  assert.equal(pekan.length, 2, "kejadian 5 Okt tidak masuk sepekan");
  assert.equal(H.lama(pekan.find(x => !x.surut), HARI), 4, "deck: Langkat belum surut 4 hari");
  assert.equal(H.lama(pekan.find(x => x.surut), HARI), 5, "sudah surut: s.d. kabar terakhir");
});

test("perlu ditanya: belum surut dengan kabar >= 1 hari atau angka bolong; surut tidak; urut kabar paling lama", () => {
  const kel = H.kelompok([K("a", "Nagan Raya", "2026-10-25", "2026-10-26", false), K("b", "Aceh Selatan", "2026-10-28", "2026-11-01", false, {kk: 81, jiwa: 314, tinggi_cm: [10, 20]}),
    K("c", "Pidie Jaya", "2026-10-25", "2026-11-01", false), K("d", "Gayo Lues", "2026-10-28", "2026-10-30", true), K("e", "Nias Selatan", "2026-10-02", "2026-10-02", false)], HARI);
  const t = H.perluDitanya(kel, HARI);
  assert.deepEqual(t.map(x => x.nama), ["Nias Selatan", "Nagan Raya", "Pidie Jaya"], "Aceh Selatan lengkap dan baru, Gayo Lues surut");
  assert.equal(t[0].senyap, true); assert.equal(t[1].umur, 6);
  assert.deepEqual(t[1].kurang, ["kabar", "kk", "jiwa", "tinggi"]);
  assert.deepEqual(t[2].kurang, ["kk", "jiwa", "tinggi"], "kabar hari ini tidak dianggap kurang");
});

test("status per kab = tertinggi di kecamatannya; siaga urut level, sudah banjir dulu, lalu hujan", () => {
  const st = {hari: ["2026-11-02", "2026-11-03", "2026-11-04", "2026-11-05"], kec: {
    "11|Nagan Raya|A": {b: [1, 2, 0, 1], h3: 100}, "11|Nagan Raya|B": {b: [0, 1, 2, 2], h3: 114.7},
    "61|Ketapang|A": {b: [2, 2, 0, 1], h3: 91.7}, "35|Lumajang|A": {b: [2, 2, 0, 0], h3: 89.3}, "11|Aceh Barat|A": {b: [2, 1, 1, 1], h3: 81.7}, "13|Pesisir Selatan|A": {b: [1, 1, 1, 1], h3: 85.8}}};
  const sk = H.statusKab(st);
  assert.deepEqual(sk["11|Nagan Raya"].b, [1, 2, 2, 2]); assert.equal(sk["11|Nagan Raya"].h3, 114.7);
  const s = H.siaga(sk, new Set(["11|Nagan Raya", "11|Aceh Barat"]));
  assert.deepEqual(s.map(x => x.nama), ["Nagan Raya", "Aceh Barat", "Ketapang", "Lumajang"], "Waspada saja tidak ikut pada ambang bawaan");
  assert.equal(H.siaga(sk, new Set(), 1).length, 5);
});

test("teks WA: menyebut kab, tanggal, daftar yang diminta bernomor, tanpa sapaan nama", () => {
  const [x] = H.perluDitanya(H.kelompok([K("a", "Dairi", "2026-10-23", "2026-10-26", false, {kk: 10})], HARI), HARI);
  const t = H.pesanWA(x);
  assert.match(t, /BPBD Dairi/); assert.match(t, /sejak 23 Oktober 2026, kabar terakhir 26 Oktober 2026/);
  assert.match(t, /1\. Kondisi terkini dan apakah banjir sudah surut\n2\. Jumlah jiwa terdampak\n3\. Tinggi genangan \(cm\)\n4\. Jumlah warga mengungsi/);
  assert.doesNotMatch(t, /KK terdampak/, "KK sudah ada, tidak diminta"); assert.doesNotMatch(t, /Bapak|Pak |·/);
});

test("ringkasan per provinsi: kab unik, belum surut unik, jumlah angka, kejadian = banyak id; urut kejadian terbanyak (deck 2 Nov: Sumut 12 kejadian, 10 kab)", () => {
  const S = (id, kab, mulai, terakhir, surut, x = {}) => ({...K(id, kab, mulai, terakhir, surut, x), prov: "Sumatera Utara", prov_kode: "12", kab: ["Kab. " + kab], kab_kode: ["12|" + kab]});
  const kel = H.kelompok([S("a", "Langkat", "2026-10-28", "2026-11-01", true, {kk: 3157}), S("b", "Langkat", "2026-10-29", "2026-10-30", false, {kk: 310}),
    S("c", "Dairi", "2026-10-23", "2026-10-26", false), K("d", "Aceh Jaya", "2026-10-31", "2026-11-01", false, {jiwa: 9, mengungsi: 2})], HARI);
  const p = H.perProv(H.sepekan(kel, HARI));
  assert.deepEqual(p.map(r => [r.prov_kode, r.kejadian, r.nKab, r.nBelum, r.kk, r.jiwa, r.mengungsi]), [["12", 3, 2, 2, 3467, 0, 0], ["11", 1, 1, 1, 0, 9, 2]]);
});

test("hujan tiga hari per tanggal per kab = tertinggi di kecamatannya; status.json lama tanpa h3d tetap jalan", () => {
  const sk = H.statusKab({hari: ["a", "b"], kec: {"11|X|A": {b: [1, 2], h3: 90, h3d: [50, 90]}, "11|X|B": {b: [2, 0], h3: 80, h3d: [80, 10]}, "11|Y|A": {b: [1, 1], h3: 40}}});
  assert.deepEqual(sk["11|X"].h3d, [80, 90]);
  assert.deepEqual(sk["11|Y"].h3d, []);
});

test("rincian kab: kecamatan digabung, desa dikelompokkan per kecamatan, histori dua kejadian dijumlah per tanggal", () => {
  const kel = H.kelompok([K("a", "Aceh Selatan", "2026-10-28", "2026-10-30", false, {kec: ["Trumon Tengah"], desa: [{nama: "Lhok Raya", kec: null, kk: 30, jiwa: 112, tinggi_cm: null}],
      riwayat: [{tgl: "2026-10-29", kk: 30, jiwa: 112, tinggi_cm: [30, 40], surut: false, kondisi: "a"}]}),
    K("b", "Aceh Selatan", "2026-10-29", "2026-11-01", false, {kec: ["Trumon", "Trumon Tengah"], desa: [{nama: "Padang Harapan", kec: "Trumon", kk: null, jiwa: null, tinggi_cm: [30, 60]}],
      riwayat: [{tgl: "2026-10-29", kk: 10, jiwa: 20, tinggi_cm: [10, 60], surut: false, kondisi: "b"}, {tgl: "2026-11-01", kk: 5, jiwa: null, tinggi_cm: null, surut: false, kondisi: "c"}]})], HARI);
  assert.equal(kel.length, 1);
  assert.deepEqual(kel[0].kec, ["Trumon Tengah", "Trumon"]);
  assert.deepEqual(kel[0].riwayat.map(r => [r.tgl, r.kk, r.jiwa, r.tinggi_cm]), [["2026-10-29", 40, 132, [10, 60]], ["2026-11-01", 5, null, null]]);
  assert.deepEqual(H.perKec(kel[0]).map(k => [k.nama, k.desa.map(d => d.nama)]), [["Trumon Tengah", []], ["Trumon", ["Padang Harapan"]], [null, ["Lhok Raya"]]]);
});

test("laporan harian terbaru memperbarui Pantau Banjir: jalan.py memanggil dalops_banjir.py --unggah (pemilik 5 Nov 2026)", async () => {
  const {readdirSync} = await import("node:fs");
  const akar = new URL("../../data/laporan-bnpb/", import.meta.url);
  // folder harian/<YYYY-MM>/<tanggal> dengan jalan.py, mulai 5 Nov 2026 (sebelumnya belum ada aturannya; susunan folder 13 Nov 2026)
  const hari = readdirSync(new URL("harian/", akar)).filter(b => /^\d{4}-\d{2}$/.test(b))
    .flatMap(b => readdirSync(new URL(`harian/${b}/`, akar)).filter(n => /^\d{4}-\d{2}-\d{2}$/.test(n) && n >= "2026-11-05").map(n => `harian/${b}/${n}`)).sort();
  const terbaru = hari.reverse().find(n => { try { readFileSync(new URL(n + "/jalan.py", akar)); return true; } catch { return false; } });
  assert.ok(terbaru, "tidak ada data/laporan-bnpb/harian/<YYYY-MM>/<tanggal>/jalan.py sejak 5 Nov 2026");
  assert.match(readFileSync(new URL(terbaru + "/jalan.py", akar), "utf8"), /dalops_banjir\.py['"],\s*['"]--unggah/,
    `${terbaru}/jalan.py tidak memanggil scripts/data/dalops_banjir.py --unggah: kondisi banjir WA tidak sampai ke /bnpb/dalops`);
});

test("tab Karhutla: angka dari peta_karhutla_kab (luas/belum hari terakhir, tidak dijumlah antarhari), kabar BPBD terbaru per kab, perlu ditanya", () => {
  const K = globalThis.DalopsKarhutla;
  const hari = Array.from({length: 10}, (_, i) => `2026-10-${String(26 + i).padStart(2, "0")}`.replace("2026-10-32", "2026-11-01").replace("2026-10-33", "2026-11-02").replace("2026-10-34", "2026-11-03").replace("2026-10-35", "2026-11-04"));
  const kab = {hari, kab: {
    "62|Kapuas": {nama: "Kapuas", prov: "62", d: [[6, 900, 700], [7, 1200, 900], [8, 1400, 1000], [9, 1534, 1086]]},   // belum 4 hari berturut
    "62|Seruyan": {nama: "Seruyan", prov: "62", d: [[8, 50, 20], [9, 30, 0]]},                                       // padam hari terakhir
    "15|Lama": {nama: "Lama", prov: "15", d: [[1, 10, 5]]}}};                                                         // di luar 7 hari
  const kabar = [{kab_kode: ["62|Kapuas"], terakhir: "2026-11-01", surut: false, kondisi: "a"}, {kab_kode: ["62|Kapuas"], terakhir: "2026-11-03", surut: false, kondisi: "b"}];
  const {hari: h, baris} = K.rakit(kab, kabar);
  assert.equal(h, "2026-11-04");
  assert.deepEqual(baris.map(x => [x.nama, x.luas, x.belum, x.padam, x.lama, x.kabar?.kondisi ?? null]), [["Kapuas", 1534, 1086, false, 4, "b"], ["Seruyan", 30, 0, true, 0, null]]);
  assert.equal(baris[0].harian.length, 7);
  assert.deepEqual(K.perluDitanya(baris, h).map(x => [x.nama, x.umur]), [["Kapuas", 1]], "Kapuas berkabar 3 Nov, data 4 Nov: ditanya; Seruyan padam: tidak");
});

test("tab Karhutla ikut pemilih periode (pemilik 13 Nov 2026): N hari terakhir atau rentang tanggal, angka tetap hari akhir jendela", () => {
  const K = globalThis.DalopsKarhutla;
  const hari = ["2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30", "2026-10-31", "2026-11-01", "2026-11-02", "2026-11-03", "2026-11-04"];
  const kab = {hari, kab: {
    "62|Kapuas": {nama: "Kapuas", prov: "62", d: [[6, 900, 700], [7, 1200, 900], [8, 1400, 1000], [9, 1534, 1086]]},
    "15|Lama": {nama: "Lama", prov: "15", d: [[1, 10, 5]]}}};
  const kabar = [{kab_kode: ["62|Kapuas"], terakhir: "2026-11-03", surut: false, kondisi: "b"}];
  // hari ini saja: satu hari log, Lama di luar
  const a = K.rakit(kab, kabar, {hari: 1});
  assert.deepEqual([a.hari, a.dari, a.lebar, a.baris.map(x => x.nama)], ["2026-11-04", "2026-11-04", 1, ["Kapuas"]]);
  // 30 hari: data cuma 10 hari, Lama ikut dan sudah padam di akhir jendela
  const b = K.rakit(kab, kabar, {hari: 30});
  assert.deepEqual([b.dari, b.lebar, b.baris.map(x => [x.nama, x.padam])], ["2026-10-26", 10, [["Kapuas", false], ["Lama", true]]]);
  // rentang 27 Okt sampai 1 Nov: hari akhir 1 Nov, angka Kapuas hari itu, kabar 3 Nov (sesudah jendela) tidak dipakai
  const c = K.rakit(kab, kabar, {dari: "2026-10-27", sampai: "2026-11-01"});
  assert.deepEqual([c.hari, c.lebar], ["2026-11-01", 6]);
  assert.deepEqual(c.baris.map(x => [x.nama, x.luas, x.belum, x.lama, x.kabar]), [["Kapuas", 900, 700, 1, null], ["Lama", 0, 0, 0, null]], "Lama terbakar 27 Okt, padam di akhir jendela");
  // sampai melewati data: dipotong ke hari data terakhir
  assert.equal(K.rakit(kab, kabar, {dari: "2026-11-01", sampai: "2026-12-31"}).hari, "2026-11-04");
});

test("kata per jenis: teks WA dan daftar kurang longsor tanpa tinggi genangan; status.json kolom l untuk longsor", () => {
  const x = {nama: "Kab. Gayo Lues", mulai: "2026-11-04", terakhir: "2026-11-04", kurang: [], mengungsi: 5};
  const wa = H.pesanWA(x, H.KATA.longsor);
  assert.match(wa, /mencatat longsor di Kab\. Gayo Lues/); assert.match(wa, /belum dilaporkan tertangani/); assert.doesNotMatch(wa, /surut|genangan|perahu/);
  assert.match(H.pesanWA(x), /banjir .* belum dilaporkan surut/);
  const kel = [{nama: "A", surut: false, terakhir: "2026-11-04", kk: 1, jiwa: 2, tinggi_cm: null}];
  assert.deepEqual(H.perluDitanya(kel, "2026-11-04", H.KATA.longsor), []);
  assert.deepEqual(H.perluDitanya(kel, "2026-11-04")[0].kurang, ["tinggi"]);
  const sk = H.statusKab({kec: {"11|Gayo Lues|Blangkejeren": {b: [0, 0, 0, 0], l: [1, 2, 2, 0]}}}, "l");
  assert.deepEqual(sk["11|Gayo Lues"].b, [1, 2, 2, 0]);
});

test("desa tanpa angka tidak bisa dibuka: adaAngka butuh KK, jiwa, atau tinggi air (pemilik 5 Nov 2026)", () => {
  assert.equal(H.adaAngka({nama: "Napai", kk: null, jiwa: null, tinggi_cm: null}), false);
  assert.equal(H.adaAngka({nama: "Napai"}), false);
  assert.equal(H.adaAngka({kk: 30, jiwa: null, tinggi_cm: null}), true);
  assert.equal(H.adaAngka({kk: null, jiwa: null, tinggi_cm: [10, 15]}), true);
  // gerbang layar: baris desa dan histori kecamatan disaring adaAngka, kecamatan tanpa desa berangka tidak bisa diklik
  const src = readFileSync(new URL("../../public/bnpb/dalops.js", import.meta.url), "utf8");
  assert.match(src, /k\.desa\.filter\(H\.adaAngka\)/, "baris desa harus disaring H.adaAngka");
  assert.match(src, /filter\(r => r && H\.adaAngka\(r\)\)/, "histori kecamatan harus disaring H.adaAngka");
  // kartu Upaya penanganan paling bawah
  const urut = src.slice(src.lastIndexOf("bagianWilayah(pekan, prov, hari"));   // panggilan di render(), bukan definisinya
  assert.ok(urut.indexOf("bagianUpaya(") > urut.indexOf("Peringatan dini"), "bagianUpaya harus sesudah Peringatan dini");
});

test("tindakan: upaya, pihak, kebutuhan, kendala dari kejadian terbaru yang mengisinya; histori harian menggabungkan upaya per tanggal", () => {
  const kel = H.kelompok([K("a", "Aceh Selatan", "2026-10-28", "2026-10-30", false, {upaya: ["Asesmen"], terlibat: ["TNI"], upaya_tgl: "2026-10-30", riwayat: [{tgl: "2026-10-30", upaya: ["Asesmen"]}]}),
    K("b", "Aceh Selatan", "2026-10-29", "2026-11-01", false, {upaya: ["Evakuasi"], terlibat: [], upaya_tgl: "2026-11-01", riwayat: [{tgl: "2026-10-30", upaya: ["Pendataan"]}]})], HARI);
  assert.equal(kel.length, 1);
  assert.deepEqual([kel[0].upaya, kel[0].terlibat, kel[0].upaya_tgl], [["Evakuasi"], ["TNI"], "2026-11-01"], "pihak kosong di kejadian terbaru tidak menghapus yang lama");
  assert.deepEqual(kel[0].riwayat.find(r => r.tgl === "2026-10-30").upaya, ["Asesmen", "Pendataan"]);
  assert.match(H.pesanWA({...kel[0], kurang: ["upaya"]}), /Upaya penanganan yang sudah dilakukan/);
});

// teks rekomendasi PVMBG 18-19 Okt 2026 (public/banjir/data/gunungapi_status.json), disalin supaya uji tidak ikut berubah bersama data
const REKOM = {
  merapi: "1. Potensi bahaya saat ini berupa guguran lava dan awanpanas pada sektor selatan-barat daya meliputi Sungai Boyong sejauh maksimal 5 km, Sungai Bedog, Krasak, Bebeng sejauh maksimal 7 km. Pada sektor tenggara meliputi Sungai Woro sejauh maksimal 3 km dan Sungai Gendol 5 km. Sedangkan lontaran material vulkanik bila terjadi letusan eksplosif dapat menjangkau radius 3 km dari puncak. 2. Data pemantauan menunjukkan suplai magma masih berlangsung 4. Masyarakat agar mewaspadai bahaya lahar dan awanpanas guguran [ APG] terutama saat terjadi hujan di seputar G. Merapi. 5. Masyarakat agar mengantisipasi gangguan akibat abu vulkanik dari erupsi Gunung Merapi.",
  semeru: "1. Tidak melakukan aktivitas apapun di sektor tenggara di sepanjang Besuk Kobokan, sejauh 13 km dari puncak (pusat erupsi). Di luar jarak tersebut, masyarakat tidak melakukan aktivitas pada jarak 500 meter dari tepi sungai (sempadan sungai) di sepanjang Besuk Kobokan karena berpotensi terlanda perluasan awan panas dan aliran lahar hingga jarak 17 km dari puncak. 2. Tidak beraktivitas dalam radius 5 Km dari kawah/puncak Gunung Api Semeru karena rawan terhadap bahaya lontaran batu (pijar). 3. Mewaspadai potensi awan panas, guguran lava, dan lahar di sepanjang aliran sungai/lembah yang berhulu di puncak Gunung Api Semeru, terutama sepanjang Besuk Kobokan, Besuk Bang, Besuk Kembar, dan Besuk Sat serta potensi lahar pada sungai-sungai kecil.",
  krakatau: "1. Masyarakat di sekitar Gunungapi Anak Krakatau dan pengunjung/wisatawan/pendaki tidak diperbolehkan memasuki dan melakukan kegiatan di dalam wilayah radius 5 km dari pusat erupsi Anak Krakatau. 2. Masyarakat di sekitar Gunungapi Anak Krakatau dan pengunjung/wisatawan tidak diperbolehkan memasuki dan melakukan kegiatan di dalam wilayah radius 1 km dari pulau baru di sektor barat laut dan tenggara Gunungapi Anak Krakatau. 3. Meningkatkan kewaspadaan terhadap ancaman bahaya lontaran batu pijar, hujan abu lebat, aliran lava, dan potensi erupsi sekunder yang ditimbulkan oleh kontak panas lava, baik dengan air laut maupun air hujan dalam radius 5 km dari pusat erupsi Anak Krakatau. 4. Masyarakat di wilayah pantai Provinsi Banten dan Lampung harap tenang."};

test("tab Gunung Api: urai() Merapi = radius 3 km, sektor selatan-barat daya 7 km, ancaman dan sungai dari teks", () => {
  const u = globalThis.DalopsGunungApi.urai(REKOM.merapi);
  assert.equal(u.radius, 3); assert.deepEqual(u.sektor, {arah: "selatan-barat daya", km: 7});
  assert.deepEqual(u.sudut, [202.5], "selatan-barat daya = di antara selatan (180) dan barat daya (225)");
  for (const a of ["Awan panas", "Guguran lava", "Lontaran material", "Hujan abu", "Lahar"]) assert.ok(u.ancaman.includes(a), a);
  assert.deepEqual(u.kawasan, ["Sektor selatan-barat daya dan tenggara", "Sungai Boyong, Bedog, Krasak, Bebeng, Woro, Gendol"]);
});

test("tab Gunung Api: urai() Semeru = radius 5 km, sektor tenggara 13 km (bukan 500 meter, bukan 17 km perluasan di luar zona), Besuk dari teks", () => {
  const u = globalThis.DalopsGunungApi.urai(REKOM.semeru);
  assert.equal(u.radius, 5); assert.deepEqual(u.sektor, {arah: "tenggara", km: 13}); assert.deepEqual(u.sudut, [135]);
  assert.deepEqual(u.ancaman, ["Awan panas", "Guguran lava", "Lontaran batu pijar", "Lahar"]);
  assert.ok(u.kawasan.includes("Besuk Kobokan, Bang, Kembar, Sat"), u.kawasan.join(" | "));
});

test("tab Gunung Api: Anak Krakatau, 'radius 1 km dari pulau baru di sektor barat laut dan tenggara' bukan jarak sektor utama", () => {
  const u = globalThis.DalopsGunungApi.urai(REKOM.krakatau);
  assert.equal(u.radius, 5, "radius utama 5 km dari pusat erupsi, bukan 1 km pulau baru");
  assert.equal(u.sektor, null); assert.deepEqual(u.sudut, []);
  assert.deepEqual(u.ancaman, ["Aliran lava", "Lontaran batu pijar", "Hujan abu", "Erupsi sekunder"]);
  assert.ok(u.kawasan.includes("1 km dari pulau baru (barat laut dan tenggara)"), u.kawasan.join(" | "));
  assert.deepEqual(globalThis.DalopsGunungApi.sudut("barat laut dan tenggara"), [315, 135]);
  assert.deepEqual(globalThis.DalopsGunungApi.urai(""), {radius: null, sektor: null, sudut: [], ancaman: [], kawasan: []}, "teks kosong aman");
});

test("tab Gunung Api: tanggal berlaku dari perubahan, kalau tidak tercatat 'Sebelum <awal riwayat>' (tidak dikarang)", () => {
  const G = globalThis.DalopsGunungApi, d = {perubahan: [{nama: "Sinabung", dari: 3, ke: 2, tgl: "2026-10-19"}], riwayat: [{tgl: "2026-10-16"}, {tgl: "2026-10-19"}]};
  assert.equal(G.labelBerlaku(G.tglBerlaku({nama: "Sinabung", level: 2}, d)), "Berlaku 19 Okt");
  assert.equal(G.labelBerlaku(G.tglBerlaku({nama: "Merapi", level: 3}, d)), "Sebelum 16 Okt 2026");
  assert.equal(G.labelBerlaku(G.tglBerlaku({nama: "Merapi", level: 3}, {})), "Tanggal berlaku belum diketahui");
});

test("kata per jenis baru: gempa, cuaca ekstrem, kekeringan, gelombang pasang, kebakaran permukiman; WA tanpa 'surut', tinggi air, atau perahu", () => {
  const x = {nama: "Cianjur", mulai: "2026-11-04", terakhir: "2026-11-05", kurang: [], mengungsi: 5};
  for (const [j, kata, selesai] of [["gempa", "gempa bumi", "selesai"], ["cuaca", "cuaca ekstrem", "selesai"], ["kekeringan", "kekeringan", "berakhir"], ["permukiman", "kebakaran permukiman", "padam"]]) {
    const wa = H.pesanWA(x, H.KATA[j]);
    assert.match(wa, new RegExp(`mencatat ${kata} di Cianjur`)); assert.match(wa, new RegExp(`belum dilaporkan ${selesai}`));
    assert.doesNotMatch(wa, /surut|genangan|perahu|Tinggi/);
    assert.equal(H.KATA[j].tinggi, false);
    assert.deepEqual(H.perluDitanya([{nama: "A", surut: false, terakhir: "2026-11-05", kk: 1, jiwa: 2, tinggi_cm: null}], "2026-11-05", H.KATA[j]), [], "tinggi air tidak ditanyakan");
    assert.doesNotMatch(H.pesanProv("Jawa Barat", [{...x, surut: false}], H.KATA[j]), /genangan|surut/);
  }
});

test("kolom korban gempa (md, hilang, status_darurat) ikut kelompok bila ada, null bila tidak", () => {
  const kel = H.kelompok([K("a", "Cianjur", "2026-11-01", "2026-11-01", false, {md: 3, hilang: 2, status_darurat: "Tanggap darurat"}), K("b", "Garut", "2026-11-01", "2026-11-01", false)], HARI);
  const c = kel.find(x => x.nama === "Cianjur"), g = kel.find(x => x.nama === "Garut");
  assert.deepEqual([c.md, c.hilang, c.status_darurat], [3, 2, "Tanggap darurat"]); assert.deepEqual([g.md, g.hilang, g.status_darurat], [null, null, null]);
});

test("gelombang pasang: kata surut tanpa tinggi air, dan jenis logbook memakai kata tab-nya", () => {
  const wa = H.pesanWA({nama: "Rembang", mulai: "2026-11-04", terakhir: "2026-11-05", kurang: []}, H.KATA.gelombang);
  assert.match(wa, /mencatat gelombang pasang di Rembang/); assert.match(wa, /belum dilaporkan surut/); assert.doesNotMatch(wa, /perahu|Tinggi/);
  assert.equal(H.kataJenis("gelombang_pasang"), H.KATA.gelombang); assert.equal(H.kataJenis("kebakaran_permukiman"), H.KATA.permukiman);
});

test("dalops.js: sebelas tab berurutan (Laporan Masuk tepat sebelum Laporan), gunung api dari JSON publik, jenis tanpa prakiraan melewati status.json dan Peringatan dini", () => {
  const src = readFileSync(new URL("../../public/bnpb/dalops.js", import.meta.url), "utf8");
  const tab = src.match(/const TAB = \[([\s\S]*?)\];/)[1];
  assert.deepEqual([...tab.matchAll(/\["(\w+)", "/g)].map(m => m[1]), ["karhutla", "banjir", "longsor", "gunungapi", "gempa", "cuaca", "kekeringan", "gelombang", "permukiman", "laporan_masuk", "laporan"]);
  assert.match(tab, /\["gempa", "Gempa & Tsunami"/, "label gempa memuat tsunami (pemilik 11 Nov 2026)");
  assert.match(src, /fetch\("\/banjir\/data\/gunungapi_status\.json"\)/);
  assert.match(src, /JN\[jenis\]\.pra === false \? null : await/, "status.json tidak dimuat untuk jenis tanpa prakiraan");
  assert.match(src, /!adaPra \? null :/, "bagian Peringatan dini dilewati, bukan kotak kosong");
  assert.match(readFileSync(new URL("../../public/bnpb/dalops.html", import.meta.url), "utf8"), /dalops_gunungapi\.js\?v=\d+/);
});

/* ---------- Mitigasi (tab Banjir): H.mitigasi ---------- */
const KEC = (b, l = [0, 0, 0, 0]) => ({b, l});
const ST = {hari: ["2026-11-08", "2026-11-09", "2026-11-10", "2026-11-11"], kec: {
  "11|Aceh Barat|A": KEC([0, 3, 3, 0]), "11|Aceh Barat|B": KEC([0, 3, 0, 0], [0, 2, 0, 0]), "11|Aceh Barat|C": KEC([0, 3, 0, 0]), "11|Aceh Barat|D": KEC([0, 3, 0, 0]), "11|Aceh Barat|E": KEC([0, 3, 0, 0]),
  "11|Pidie|X": KEC([2, 0, 0, 0]), "11|Pidie|Y": KEC([0, 0, 2, 0]),
  "11|Langkat|Z": KEC([0, 0, 0, 3]), "12|Deli|Q": KEC([1, 0, 0, 0]), "12|Toba|R": KEC([0, 1, 0, 0]), "12|Nias|S": KEC([0, 0, 3, 0])}};
const PK = {lapangan: [{jenis: "permanen", prov: "11", kab: "Aceh Barat", kec: "A"}, {jenis: "siaga", prov: "11", kab: "Aceh Barat", kec: "b"}, {jenis: "waspada", prov: "11", kab: "Aceh Barat", kec: "C"}]};
const P = (kode, x = {}) => ({kab_kode: kode, nama: kode.split("|")[1], prov_kode: kode.split("|")[0], surut: false, terakhir: "2026-11-09", kebutuhan: [], kendala: [], kk: 5, jiwa: 9, kec: [], ...x});
const baris = (m, k) => m.grup.find(g => g.kunci === k)?.baris || [];

test("mitigasi: satu kab satu kelompok, urutan prioritas, hitungan n", () => {
  const m = H.mitigasi(ST, PK, [P("12|Nias"), P("12|Deli", {surut: true}), P("11|Pidie", {surut: true}), P("12|Toba", {surut: true})], "2026-11-09");
  assert.deepEqual(m.grup.map(g => g.kunci), ["terdampak", "awas", "siaga", "pantau"]);
  assert.deepEqual(baris(m, "terdampak").map(x => x.nama), ["Nias"], "Nias punya Awas tapi terdampak menang");
  assert.deepEqual(baris(m, "awas").map(x => x.nama), ["Aceh Barat", "Langkat"]);
  assert.deepEqual(baris(m, "siaga").map(x => x.nama), ["Pidie"], "surut tapi Siaga: bukan pantau");
  assert.deepEqual(baris(m, "pantau").map(x => x.nama).sort(), ["Deli", "Toba"]);
  assert.deepEqual(m.n, {terdampak: 1, awas: 2, siaga: 1, pantau: 2, total: 6});
  const semua = m.grup.flatMap(g => g.baris.map(x => x.kab_kode)); assert.equal(new Set(semua).size, semua.length);
});

test("mitigasi: kecamatan posko tidak muncul lagi di evakuasi, batas 3 nama, lereng", () => {
  const [ab] = baris(H.mitigasi(ST, PK, [], "2026-11-09"), "awas");
  assert.equal(ab.langkah, "Posko A, B; siapkan evakuasi C, D, E; pantau lereng B", "posko jenis waspada tidak dihitung; posko cocok tanpa peduli huruf besar");
  const st2 = {...ST, kec: {...ST.kec, "11|Aceh Barat|F": KEC([0, 3, 0, 0]), "11|Aceh Barat|G": KEC([0, 3, 0, 0])}};
  assert.match(baris(H.mitigasi(st2, PK, [], "2026-11-09"), "awas")[0].langkah, /siapkan evakuasi C, D, E dan 2 lainnya/);
});

test("mitigasi: tenggat hari ke-0 Sekarang, berikutnya tanggal; urut tenggat dekat dulu; posko null tetap jalan", () => {
  const m = H.mitigasi(ST, null, [], "2026-11-09"), a = baris(m, "awas");
  assert.deepEqual(a.map(x => [x.nama, x.tenggat]), [["Aceh Barat", "Sebelum 9 Nov"], ["Nias", "Sebelum 10 Nov"], ["Langkat", "Sebelum 11 Nov"]]);
  assert.equal(baris(m, "siaga")[0].tenggat, "Sekarang");
  assert.match(a[0].langkah, /^Siapkan evakuasi A, B, C dan 2 lainnya; pantau lereng B$/, "tanpa posko: semua kecamatan tertinggi masuk evakuasi");
});

test("mitigasi: langkah terdampak dari data terlapor, tidak mengarang saat kosong", () => {
  const m = H.mitigasi(ST, PK, [P("20|Satu", {kebutuhan: ["tenda", "air bersih"], kendala: ["jalan putus"], terakhir: "2026-11-07"}), P("20|Dua", {kk: null, jiwa: null}), P("20|Tiga")], "2026-11-09");
  const t = Object.fromEntries(baris(m, "terdampak").map(x => [x.nama, x]));
  assert.equal(t.Satu.langkah, "Penuhi kebutuhan: tenda, air bersih; Atasi kendala: jalan putus; Konfirmasi status surut ke BPBD, laporan terakhir 7 Nov");
  assert.equal(t.Dua.langkah, "Tuntaskan pendataan dampak");
  assert.equal(t.Tiga.langkah, "Lanjutkan penanganan dan laporkan perkembangan");
  assert.ok(Object.values(t).every(x => x.tenggat === "Sekarang"));
  assert.doesNotMatch(JSON.stringify(m), /tanggul|perahu|drainase/i);
  assert.deepEqual(H.mitigasi(null, null, [], "2026-11-09").n.total, 0);
});

test("dalops.js: Mitigasi hanya di tab Banjir, sesudah Peringatan dini dan sebelum Upaya", () => {
  const src = readFileSync(new URL("../../public/bnpb/dalops.js", import.meta.url), "utf8");
  assert.match(src, /if \(!st \|\| J\.k !== "banjir"\) return null/);
  assert.ok(src.indexOf("bagianMitigasi(st, posko, pekan, hari),\n      bagianUpaya") > src.indexOf('"Peringatan dini", `Prakiraan'));
  assert.match(src, /"Usulan langkah"/);
});

test("mitigasi: status.json tertinggal dari hari data tidak memberi tenggat yang sudah lewat", () => {
  const st = {hari: ["2026-10-13", "2026-10-14", "2026-10-15", "2026-10-16"], kec: {"91|Sarmi|Bonggo": {b: [0, 0, 0, 3], l: [0, 0, 0, 0]}}};
  const m = H.mitigasi(st, null, [], "2026-11-09");
  assert.equal(m.grup[0].baris[0].tenggat, "Sekarang");
  assert.equal(H.mitigasi(st, null, [], "2026-10-13").grup[0].baris[0].tenggat, "Sebelum 16 Okt");
});

/* ---------- tab Laporan Masuk: rekap harian WA Koordalops (bentuk kontrak GET /api/dalops/laporan) ---------- */
const LK = {
  A: {jenis: "karhutla", prov: "14", lokasi: "", tempat: "Prov. Riau"}, B: {jenis: "banjir", prov: "13", lokasi: "Solok", tempat: "Kab. Solok"},
  C: {jenis: "longsor", prov: "32", lokasi: "Cianjur", tempat: "Kab. Cianjur"}, D: {jenis: "cuaca", prov: "33", lokasi: "Cilacap", tempat: "Kab. Cilacap"},
  E: {jenis: "gempabumi", prov: "75", lokasi: "Boalemo", tempat: "Kab. Boalemo"}, F: {jenis: "cuaca", prov: "35", lokasi: "Lamongan", tempat: "Kab. Lamongan"},
  X: {jenis: "banjir", prov: "35", lokasi: "Gresik", tempat: "Kab. Gresik"}};
const rek = (tanggal, ...isi) => ({tanggal, status: "ok", diterima: Date.parse(tanggal) + 42 * 6e4, jam: "07.42", laporan: isi.length + 5, menonjol: isi.length, lewat: 0, alasan: "",
  kejadian: isi.map(([k, sifat, status]) => ({...LK[k], sifat, status}))});
const ARSIP = [
  rek("2026-11-01", ["A", "pengkinian", "berjalan"], ["B", "baru", "berjalan"], ["F", "pengkinian", "belum"]),
  rek("2026-11-02", ["A", "pengkinian", "berjalan"], ["B", "pengkinian", "belum"], ["C", "baru", "belum"]),
  {tanggal: "2026-11-03", status: "gagal", diterima: 1, jam: "07.50", laporan: null, menonjol: null, lewat: 0, kejadian: [], alasan: "rekap terpotong"},
  rek("2026-11-05", ["A", "pengkinian", "berjalan"], ["B", "pengkinian", "selesai"]),
  rek("2026-11-06", ["A", "pengkinian", "berjalan"], ["C", "pengkinian", "belum"], ["D", "baru", "berjalan"]),
  rek("2026-11-07", ["A", "pengkinian", "berjalan"], ["B", "baru", "berjalan"], ["D", "baru", "berjalan"], ["E", "baru", "belum"]),
  rek("2026-11-08", ["A", "pengkinian", "berjalan"], ["X", "pengkinian", "berjalan"]),
  rek("2026-11-09", ["A", "pengkinian", "berjalan"])].reverse();   // terbaru dulu, seperti jawaban Worker
const nama = r => r.map(x => x.k.lokasi || x.k.tempat);

test("kunciKejadian: jenis, provinsi, lokasi tanpa awalan Kab./Kota/Prov. dan spasi rapat", () => {
  assert.equal(H.kunciKejadian({jenis: "banjir", prov: "11", lokasi: "Kab.  Aceh   Barat"}), "banjir|11|aceh barat");
  assert.equal(H.kunciKejadian({jenis: "banjir", prov: "11", lokasi: "Kota Banda Aceh"}), "banjir|11|banda aceh");
  assert.equal(H.kunciKejadian({jenis: "karhutla", prov: "14", lokasi: ""}), "karhutla|14|");
  assert.equal(H.kunciKejadian({jenis: "karhutla", prov: "14", lokasi: "Prov. Riau"}), "karhutla|14|riau");
});

test("tanggalPantau: tujuh tanggal WIB terbaru dulu, hari ini dilewati sebelum 07.00 WIB", () => {
  const sebelum = H.tanggalPantau(Date.parse("2026-11-09T23:30:00Z")), sesudah = H.tanggalPantau(Date.parse("2026-11-10T00:00:00Z"));   // 06.30 dan 07.00 WIB 10 Nov
  assert.deepEqual(sebelum, ["2026-11-09", "2026-11-08", "2026-11-07", "2026-11-06", "2026-11-05", "2026-11-04", "2026-11-03"]);
  assert.equal(sesudah.length, 7); assert.equal(sesudah[0], "2026-11-10"); assert.equal(sesudah[6], "2026-11-04");
  assert.equal(H.tanggalPantau(Date.parse("2026-12-01T10:00:00Z"))[6], "2026-11-25", "melewati pergantian bulan");
});

test("ringkasLaporan: hari tanpa rekap atau gagal tidak dihitung tagih; pesannya dari status", () => {
  const gagal = H.ringkasLaporan(ARSIP, "2026-11-03"), belum = H.ringkasLaporan(ARSIP, "2026-11-04");
  assert.deepEqual([gagal.ada, gagal.status, gagal.tagih.length, gagal.baru.length], [false, "gagal", 0, 0]);
  assert.deepEqual([belum.ada, belum.status, belum.tagih.length], [false, "belum", 0]);
});

test("ringkasLaporan: baru dan pengkinian ikut sifat; kemunculan pertama pengkinian di tanggal arsip awal = Sebelum, hari ke kosong", () => {
  const r = H.ringkasLaporan(ARSIP, "2026-11-01");
  assert.deepEqual(nama(r.baru), ["Solok"]); assert.deepEqual(nama(r.pengkinian), ["Prov. Riau", "Lamongan"]);
  const a = r.pengkinian[0]; assert.deepEqual([a.sebelum, a.hariKe, a.pertama], [true, null, "2026-11-01"]);
  assert.equal(r.baru[0].sebelum, false); assert.equal(r.baru[0].hariKe, 1);
  assert.equal(r.perluDicek.length, 0, "hari awal arsip tidak penuh tanda palsu");
  const s = H.ringkasLaporan(ARSIP, "2026-11-05").pengkinian.find(x => x.k.lokasi === "Solok");
  assert.deepEqual([s.sebelum, s.pertama, s.hariKe], [false, "2026-11-01", 5]);
});

test("ringkasLaporan: tagih = terbuka 14 hari sebelum T, bukan selesai, tidak ada di rekap T; tanpa kabar, nada, usul tutup, urut terlama", () => {
  const r = H.ringkasLaporan(ARSIP, "2026-11-09");
  assert.deepEqual(r.tagih.map(x => x.k.lokasi || x.k.tempat), ["Lamongan", "Cianjur", "Solok", "Cilacap", "Boalemo", "Gresik"]);
  const por = Object.fromEntries(r.tagih.map(x => [x.k.lokasi, x]));
  assert.deepEqual([por.Lamongan.tanpa, por.Lamongan.nada, por.Lamongan.usulTutup, por.Lamongan.sebelum], [8, "merah", true, true], "tanpa kabar > 7 hari: usul tutup");
  assert.deepEqual([por.Cianjur.tanpa, por.Cianjur.nada, por.Cianjur.usulTutup, por.Cianjur.pertama], [3, "merah", false, "2026-11-02"]);
  assert.deepEqual([por.Solok.tanpa, por.Solok.nada], [2, "kuning"], "Solok selesai 5 Nov lalu muncul berjalan 7 Nov: terbuka lagi");
  assert.deepEqual([por.Gresik.tanpa, por.Gresik.nada], [1, "kuning"]);
  assert.ok(!r.tagih.some(x => x.k.jenis === "karhutla"), "Riau ada di rekap hari itu");
  const lima = H.ringkasLaporan(ARSIP, "2026-11-05");   // Solok selesai di rekap itu sendiri; Cianjur terakhir 2 Nov, rekap 3 Nov gagal tidak menolong
  assert.deepEqual(lima.tagih.map(x => x.k.lokasi), ["Lamongan", "Cianjur"]);
  assert.equal(lima.tagih[1].tanpa, 3);
});

test("ringkasLaporan: selesai pada kemunculan terakhir tidak ditagih; di luar 14 hari tidak ikut", () => {
  const arsip = [rek("2026-11-20", ["A", "pengkinian", "berjalan"]), rek("2026-11-05", ["B", "baru", "selesai"], ["C", "baru", "belum"]), rek("2026-11-01", ["E", "baru", "belum"])];
  const r = H.ringkasLaporan(arsip, "2026-11-20");
  assert.deepEqual(r.tagih.map(x => x.k.lokasi), [], "C terakhir 5 Nov = 15 hari lalu, E lebih lama, B selesai");
  assert.deepEqual(H.ringkasLaporan(arsip, "2026-11-19").tagih.length, 0, "rekap 19 Nov tidak ada");
});

test("perlu dicek: baru padahal sudah terbuka = Mungkin pengkinian; pengkinian tanpa kemunculan sebelumnya hanya bila T >= awal arsip + 7 hari", () => {
  const baru = H.ringkasLaporan(ARSIP, "2026-11-07");
  assert.deepEqual(baru.perluDicek.map(x => [x.k.lokasi, x.alasan]), [["Cilacap", "mungkin_pengkinian"]], "Solok selesai dulu, jadi baru yang sah");
  const kini = H.ringkasLaporan(ARSIP, "2026-11-08");
  assert.deepEqual(kini.perluDicek.map(x => [x.k.lokasi, x.alasan]), [["Gresik", "tanpa_pertama"]]);
  const awal = [rek("2026-11-01", ["A", "pengkinian", "berjalan"]), rek("2026-11-06", ["A", "pengkinian", "berjalan"], ["X", "pengkinian", "berjalan"])];
  assert.equal(H.ringkasLaporan(awal, "2026-11-06").perluDicek.length, 0, "6 hari sesudah arsip awal: belum ditandai");
  assert.equal(H.ringkasLaporan([...awal, rek("2026-11-08", ["X", "pengkinian", "berjalan"])], "2026-11-08").perluDicek.length, 0, "X sudah pernah muncul");
});

test("cocokLogbook: jenis + provinsi + lokasi; provinsi (lokasi kosong) cukup jenis + provinsi; tgl logbook = T - 1", () => {
  const entri = [{jenis: "banjir", prov: "13", kab: "Kab. Solok"}, {jenis: "karhutla", prov: "14", kab: "Pelalawan"}, {jenis: "cuaca", prov: "33", kab: "Cilacap"}];
  assert.equal(H.cocokLogbook(LK.B, entri), true); assert.equal(H.cocokLogbook(LK.A, entri), true, "Riau tingkat provinsi");
  assert.equal(H.cocokLogbook(LK.C, entri), false); assert.equal(H.cocokLogbook({...LK.B, lokasi: "Solok Selatan"}, entri), false);
  assert.equal(H.cocokLogbook({...LK.D, jenis: "gelombang_pasang"}, entri), true, "gelombang pasang dicatat sebagai cuaca");
  assert.equal(H.cocokLogbook(LK.B, []), false);
  assert.equal(H.tglLogbook("2026-11-01"), "2026-10-31"); assert.equal(H.tglLogbook("2026-03-01"), "2026-02-28");
});

test("label kejadian dan pesan tagih: nama jenis + tempat, tanpa titik tengah dan sapaan nama", () => {
  const pv = k => ({14: "Riau"})[k];
  assert.equal(H.labelKejadian(LK.B, pv), "Banjir Kab. Solok"); assert.equal(H.labelKejadian({...LK.A, tempat: ""}, pv), "Karhutla Riau");
  const x = H.ringkasLaporan(ARSIP, "2026-11-09").tagih.find(t => t.k.lokasi === "Cianjur"), t = H.pesanTagih(x, "Cianjur", H.kataJenis("longsor"));
  assert.match(t, /BPBD Cianjur/); assert.match(t, /longsor di Cianjur sejak 2 November 2026, kabar terakhir 6 November 2026 \(3 hari tanpa pembaruan\)/);
  assert.doesNotMatch(t, /Bapak|Pak |·/);
  const sebelum = H.ringkasLaporan(ARSIP, "2026-11-09").tagih[0];
  assert.match(H.pesanTagih(sebelum, "Lamongan", H.kataJenis("cuaca")), /sebelum 1 November 2026/);
  assert.match(H.pesanTagih(x, "Riau", H.kataJenis("karhutla")), /api sudah padam/);
});

test("layar Laporan Masuk: kartu standar, tanpa teks dampak, tanpa titik tengah, kelas WA dijaga baca saja", () => {
  const js = readFileSync("public/bnpb/dalops_laporan_masuk.js", "utf8"), css = readFileSync("public/bnpb/menu_pusdalops.css", "utf8");
  assert.doesNotMatch(js.replace(/\/\*[\s\S]*?\*\//g, ""), /·|Pantau Bencana|hotspot|luas/i);
  assert.match(js, /bagian\("lm-rekap"/); assert.match(js, /bagian\("lm-tagih"/); assert.match(js, /bagian\("lm-baru"/); assert.match(js, /bagian\("lm-kini"/);
  assert.match(js, /lm-tagih-aksi/); assert.match(css, /html\[data-baca-saja\] \.lm-tagih-aksi\{display:none\}/);
  assert.match(js, /DATA DUMMY/); assert.match(js, /\/api\/dalops\/laporan\/dummy/); assert.match(js, /requestAnimationFrame\(\(\) => requestAnimationFrame/);
  assert.match(readFileSync("public/bnpb/dalops.js", "utf8"), /\["laporan_masuk", "Laporan Masuk", "daftar"\], \["laporan", "Laporan", "simpan"\]/);
  assert.match(readFileSync("public/bnpb/dalops.html", "utf8"), /dalops_laporan_masuk\.js/);
});

test("menu Pusdalops: 6 grup di navbar, 13 halaman lama tetap terjangkau lewat deretan sub-halaman, tanpa daftar turun (pemilik 11 Nov 2026)", () => {
  const js = readFileSync("public/bnpb/menu_pusdalops.js", "utf8");
  const grup = js.match(/const GRUP = \[([\s\S]*?)\]\]\];/)[1];
  assert.deepEqual([...grup.matchAll(/^\s*\["(\w+)", "\w+", \[/gm)].map(m => m[1]), ["Pantau", "Logbook", "Laporan", "Operasi", "Perencanaan", "Kontak"]);
  const rute = [...grup.matchAll(/\["(\/[^"]*)", "/g)].map(m => m[1]);
  for (const r of ["/bnpb/dalops", "/admin/pantau", "/bnpb/logbook", "/bnpb/bahan", "/admin/laporan-karhutla", "/admin/omc", "/laporan-bnpb", "/bnpb/dokumen",
    "/bnpb/operasi", "/?operasi", "/bnpb/perencanaan", "/bnpb/siaga", "/daftar-kontak"]) assert.ok(rute.includes(r), r + " hilang dari menu");
  assert.doesNotMatch(js, /<details|<select|dropdown/i, "tanpa daftar turun");
});

/* Cek Kabar Luar CK-05/06 (data/kajian-bnpb/cek-kabar/RENCANA-UJI L1-L6) */
const LU = (label, senyap, bukti = []) => ({label, dasar: bukti.length ? "berita" : null, senyap, alam: null, bukti, catatan: null});
test("cek kabar L1/L1b: label kelompok paling waspada, perluDitanya memuat kemungkinan selesai dan mengurutkan menurut label", () => {
  const lengkap = {kk: 5, jiwa: 10};
  const kel = H.kelompok([
    K("a", "Aceh Besar", "2026-10-20", "2026-10-31", false, {...lengkap, luar: LU("mungkin_selesai", 1)}),
    K("b", "Aceh Besar", "2026-10-20", "2026-10-30", false, {...lengkap, luar: LU("masih", 2, [{judul: "x", url: "https://a.id/1", tgl: "2026-10-31", arah: "masih"}])}),
    K("c", "Pidie", "2026-10-20", "2026-10-25", false, {...lengkap, luar: LU("mungkin_selesai", 7)}),
    K("d", "Bireuen", "2026-10-20", "2026-10-28", false, {luar: LU("belum_ada", 4)}),
    K("e", "Simeulue", "2026-10-20", "2026-10-29", false, {luar: LU("masih", 3)})], HARI);
  assert.equal(kel.find(x => x.nama.includes("Aceh Besar")).luar.label, "masih", "masih mengalahkan mungkin_selesai");
  assert.equal(kel.find(x => x.nama.includes("Aceh Besar")).luar.bukti.length, 1);
  const t = H.perluDitanya(kel, HARI, H.KATA.banjir);
  assert.deepEqual(t.map(x => x.luar.label), ["mungkin_selesai", "belum_ada", "masih", "masih"]);
  assert.ok(t[0].nama.includes("Pidie"), "kemungkinan selesai berangka lengkap ikut ditanya");
  assert.deepEqual(H.ringkasLuar(kel), {masih: 2, mungkin_selesai: 1, belum_ada: 1}, "L3: jumlah tiga angka = kelompok belum selesai");
});
test("cek kabar L2: teks WA kemungkinan selesai meminta konfirmasi, tanpa isi berita", () => {
  const x = {nama: "Kab. Pidie", mulai: "2026-10-20", terakhir: "2026-10-25", kurang: [], luar: LU("mungkin_selesai", 7, [{judul: "RAHASIA JUDUL", url: "https://a.id", tgl: "2026-10-30", arah: "pulih"}])};
  const wa = H.pesanWA(x, H.KATA.banjir);
  assert.match(wa, /Mohon konfirmasi apakah sudah selesai \(surut\)/); assert.doesNotMatch(wa, /RAHASIA|https/);
  assert.doesNotMatch(H.pesanWA({...x, luar: LU("masih", 1)}, H.KATA.banjir), /konfirmasi apakah sudah selesai/);
});
test("cek kabar L4/L5/L6: tautan bukti hanya http(s), berkas tanpa 'luar' tetap jalan, WA tersembunyi untuk baca-saja, judul tanpa kata dobel", () => {
  const js = readFileSync("public/bnpb/dalops.js", "utf8");
  assert.match(js, /const amanUrl = u => \/\^https\?:\\\/\\\/\/i\.test/); assert.match(js, /amanUrl\(a\.url\) \? h\("a"/);
  assert.match(js, /if \(!d\.luar\.length\) sL\.remove\(\);/, "berkas lama tanpa kolom luar: bagian tidak dirender");
  /* judul lintas bencana (12 Nov 2026) tidak memakai kata selesai per jenis lagi, jadi 'sudah sudah surut' tidak mungkin */
  assert.match(js, /"Kabar luar semua bencana yang belum dilaporkan selesai"/);
  const kel = H.kelompok([K("a", "Pidie", "2026-10-20", "2026-10-25", false, {kk: 1, jiwa: 2})], HARI);
  assert.equal(kel[0].luar, undefined); assert.deepEqual(H.ringkasLuar(kel), {masih: 0, mungkin_selesai: 0, belum_ada: 0});
  assert.match(readFileSync("public/bnpb/menu_pusdalops.css", "utf8"), /html\[data-baca-saja\] \.dl-wa\{display:none\}/);
});

test("pesanKurang: dikelompokkan per provinsi, sapaan tujuan, dipotong di maks dengan sisa", () => {
  const x = (nama, prov) => ({nama, prov, jenis: "banjir", mulai: "2026-11-01", terakhir: "2026-11-05", minta: ["kondisi terkini", "jiwa pengungsi"]});
  const t = H.pesanKurang([x("Kab. Langkat", "Sumatera Utara"), x("Kab. Dairi", "Sumatera Utara"), x("Kab. Aceh Jaya", "Aceh")], "Provinsi Sumatera Utara dan kab/kota");
  assert.match(t, /^Yth\. rekan BPBD Provinsi Sumatera Utara dan kab\/kota\./);
  assert.match(t, /\*Sumatera Utara\*\n1\. Kab\. Langkat, banjir sejak 1 Nov \(kabar terakhir 5 Nov\): kondisi terkini, jiwa pengungsi\n2\. Kab\. Dairi/);
  assert.match(t, /\*Aceh\*\n1\. Kab\. Aceh Jaya/);
  assert.doesNotMatch(t, /kejadian lain/);
  const p = H.pesanKurang(Array.from({length: 5}, (_, i) => x("Kab. " + i, "Aceh")), null, 2);
  assert.match(p, /rekan BPBD provinsi dan kab\/kota/); assert.match(p, /Dan 3 kejadian lain/); assert.doesNotMatch(p, /Kab\. 2/);
  assert.equal(H.pesanKurang([], null), "");
});

test("xlsx: zip sah (tanda tangan, CRC per berkas), lembar dan sel teks/angka, karakter XML diloloskan", () => {
  assert.equal(H.crc32(new TextEncoder().encode("123456789")).toString(16), "cbf43926");
  const b = H.xlsx([{nama: "Kelengkapan data", kepala: ["No", "Kab/kota"], baris: [[1, "Aceh <Utara> & co"], [2, null]]}, {nama: "Kabar/luar", kepala: ["A"], baris: []}]);
  const v = new DataView(b.buffer), dec = new TextDecoder(), berkas = {};
  assert.equal(v.getUint32(0, true), 0x04034b50);
  for (let o = 0; v.getUint32(o, true) === 0x04034b50;) {
    const crc = v.getUint32(o + 14, true), n = v.getUint32(o + 18, true), ln = v.getUint16(o + 26, true), nama = dec.decode(b.subarray(o + 30, o + 30 + ln)), isi = b.subarray(o + 30 + ln, o + 30 + ln + n);
    assert.equal(H.crc32(isi), crc, nama); berkas[nama] = dec.decode(isi); o += 30 + ln + n;
  }
  assert.deepEqual(Object.keys(berkas).sort(), ["[Content_Types].xml", "_rels/.rels", "xl/_rels/workbook.xml.rels", "xl/styles.xml", "xl/workbook.xml", "xl/worksheets/sheet1.xml", "xl/worksheets/sheet2.xml"]);
  assert.match(berkas["xl/workbook.xml"], /name="Kelengkapan data".*name="Kabar luar"/);
  const s1 = berkas["xl/worksheets/sheet1.xml"];
  assert.match(s1, /<c r="A1" t="inlineStr" s="1">/); assert.match(s1, /<c r="A2"><v>1<\/v><\/c>/); assert.match(s1, /Aceh &lt;Utara&gt; &amp; co/);
  assert.doesNotMatch(s1, /r="B3"/, "sel kosong tidak ditulis");
});
