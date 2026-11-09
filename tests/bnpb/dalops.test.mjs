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
  // folder harian-YYYY-MM-DD dengan jalan.py, mulai 5 Nov 2026 (sebelumnya belum ada aturannya)
  const hari = readdirSync(akar).filter(n => /^harian-\d{4}-\d{2}-\d{2}$/.test(n) && n >= "harian-2026-11-05").sort();
  const terbaru = hari.reverse().find(n => { try { readFileSync(new URL(n + "/jalan.py", akar)); return true; } catch { return false; } });
  assert.ok(terbaru, "tidak ada data/laporan-bnpb/harian-*/jalan.py sejak 5 Nov 2026");
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

test("kata per jenis baru: gempa, cuaca ekstrem, kekeringan; WA tanpa 'surut', tinggi air, atau perahu", () => {
  const x = {nama: "Cianjur", mulai: "2026-11-04", terakhir: "2026-11-05", kurang: [], mengungsi: 5};
  for (const [j, kata, selesai] of [["gempa", "gempa bumi", "selesai"], ["cuaca", "cuaca ekstrem", "selesai"], ["kekeringan", "kekeringan", "berakhir"]]) {
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

test("dalops.js: delapan tab berurutan, gunung api dari JSON publik, jenis tanpa prakiraan melewati status.json dan Peringatan dini", () => {
  const src = readFileSync(new URL("../../public/bnpb/dalops.js", import.meta.url), "utf8");
  const tab = src.match(/const TAB = \[([\s\S]*?)\];/)[1];
  assert.deepEqual([...tab.matchAll(/\["(\w+)", "/g)].map(m => m[1]), ["karhutla", "banjir", "longsor", "gunungapi", "gempa", "cuaca", "kekeringan", "laporan"]);
  assert.match(src, /fetch\("\/banjir\/data\/gunungapi_status\.json"\)/);
  assert.match(src, /JN\[jenis\]\.pra === false \? null : await/, "status.json tidak dimuat untuk jenis tanpa prakiraan");
  assert.match(src, /!adaPra \? null :/, "bagian Peringatan dini dilewati, bukan kotak kosong");
  assert.match(readFileSync(new URL("../../public/bnpb/dalops.html", import.meta.url), "utf8"), /dalops_gunungapi\.js\?v=\d+/);
});
