// Uji mesin murni Lapor Bencana BNPB (data/kajian-bnpb/lapor-ai/RENCANA-UJI.md bagian 1). Tanpa jaringan: model disuntik.
import {test} from "node:test";
import assert from "node:assert/strict";
import {putaran, angkaDalam, validasiUraian, wajibKurang} from "../../src/lapor_mesin.js";
import {langkahKronologi, rangkaiKronologi, JENIS} from "../../src/lapor_spek.js";
const kr1 = jenis => langkahKronologi(jenis).map(() => "1"); // jawab pilihan pertama di tiap langkah kronologi

let jam = 0;
async function obrol(langkah, {model = null, pelapor = null} = {}) {
  let sesi = null, hasil;
  for (const pesan of langkah) {
    hasil = await putaran({sesi, pelapor, pesan: typeof pesan === "string" ? {teks: pesan, wa: "6280000000000"} : pesan, model, kini: ++jam});
    sesi = hasil.sesi; pelapor = hasil.pelapor;
  }
  return hasil;
}

test("bilangan tertulis dan digit dikenali", () => {
  assert.ok(angkaDalam("dua belas orang mengungsi").has(12));
  assert.ok(angkaDalam("seratus lima rumah").has(105));
  assert.ok(angkaDalam("1.250 jiwa").has(1250));
  assert.ok(angkaDalam("tiga rusak berat").has(3));
});

test("angka tanpa kutipan atau kutipan tanpa angka itu ditolak; 0 hanya dari kalimat negasi", () => {
  const teks = "tiga rumah rusak berat, tidak ada korban jiwa";
  const v = validasiUraian({isian: [
    {nama: "rumah_berat", nilai: "3", kutipan: "tiga rumah rusak berat"},
    {nama: "meninggal", nilai: "0", kutipan: "tidak ada korban jiwa"},
    {nama: "luka", nilai: "5", kutipan: "tiga rumah rusak berat"},     // angka tidak ada di kutipan
    {nama: "hilang", nilai: "2", kutipan: "dua orang hilang"},        // kutipan tidak ada di pesan
    {nama: "rahasia", nilai: "1", kutipan: "tiga"},                    // isian tak dikenal
  ], jenis_tebak: [], darurat_jiwa: false, tanggapan: "Ada 3 rumah, aman."}, teks, "banjir");
  assert.deepEqual(Object.keys(v.isian).sort(), ["meninggal", "rumah_berat"]);
  assert.equal(v.isian.rumah_berat.nilai, 3);
  assert.equal(v.tanggapan, "", "tanggapan bukan id (kalimat bebas model) dibuang");
});

test("nomor baru: identitas dulu, cerita pertama disimpan dan dipakai sesudahnya (tanpa model)", async () => {
  const h1 = await obrol(["Ada banjir bandang di Desa Sukamaju, air masuk rumah warga sejak tadi pagi"]);
  assert.deepEqual(h1.pilihan, ["Setuju", "Tidak setuju"], "persetujuan data paling awal");
  const h0 = await obrol(["Ada banjir bandang di Desa Sukamaju, air masuk rumah warga sejak tadi pagi", "1", "1", "Budi Santoso"]);
  assert.equal(h0.minta, "lokasi", "lokasi wajib paling awal");
  assert.match(h0.balasan, /Bagikan lokasi/);
  const tolak = await obrol(["Ada banjir bandang di Desa Sukamaju, air masuk rumah warga sejak tadi pagi", "1", "1", "Budi Santoso", "di Desa Sukamaju"]);
  assert.match(tolak.balasan, /wajib dibagikan/, "teks tidak menggantikan lokasi");
  const h = await obrol(["Ada banjir bandang di Desa Sukamaju, air masuk rumah warga sejak tadi pagi", "1", "1", "Budi Santoso", {lokasi: {lat: -6.6, lon: 106.8, akurasi: 12, sumber: "gps"}}]);
  assert.equal(h.pelapor.nama, "Budi Santoso");
  assert.equal(h.pelapor.peran, "warga");
  assert.ok(h.sesi.isian.kronologi, "cerita tertunda jadi kronologi");
  assert.match(h.balasan, /Jenis bencana/);
  assert.equal(h.pilihan[0], "Banjir", "saran dari cerita di urutan teratas");
  // pemilik 21 Nov 2026: "Hilangkan lainnya" dari pilihan jenis bencana
  assert.equal(h.pilihan.length, JENIS.length - 1, "semua jenis bisa dipilih kecuali Lainnya");
  assert.ok(!h.pilihan.includes("Lainnya"), "Lainnya tidak ditawarkan");
});

test("BPBD yang mengaku sendiri = bpbd_klaim, ditanya kab dan jabatan", async () => {
  const h = await obrol(["lapor", "1", "2", "Siti", "Kabupaten Bogor", "Kalaksa", {lokasi: {lat: -6.6, lon: 106.8, akurasi: 12, sumber: "gps"}}]);
  assert.equal(h.pelapor.peran, "bpbd_klaim");
  assert.equal(h.pelapor.kab, "Kabupaten Bogor");
  assert.match(h.balasan, /Jenis bencana/, "sesudah lokasi: jenis bencana dipilih dulu");
  assert.equal(h.minta, "jenis");
  const h2 = await obrol(["lapor", "1", "2", "Siti", "Kabupaten Bogor", "Kalaksa", {lokasi: {lat: -6.6, lon: 106.8, akurasi: 12, sumber: "gps"}}, "1", "1"]);
  assert.match(h2.balasan, new RegExp(`1 dari ${langkahKronologi("banjir").length}`), "sesudah jenis dan karakteristik: kronologi berpandu langkah 1");
  assert.ok(h2.pilihan.length >= 2, "langkah kronologi berupa pilihan");
});

test("nomor dikenal cukup konfirmasi; alur lengkap sampai terkirim tanpa model", async () => {
  const pelapor = {wa: "6280000000000", nama: "Budi", peran: "warga"};
  const langkah = ["lapor", "1", {lokasi: {lat: -6.6, lon: 106.8, akurasi: 12, sumber: "gps"}},
    "2",                          // Tanah longsor dari pilihan
    "1",                          // subjenis Longsoran
    ...kr1("longsor"),            // kronologi berpandu: pilihan pertama tiap langkah
    "2",                          // tidak ada tambahan
    "hari ini jam 05.30"];
  let h = await obrol(langkah, {pelapor});
  assert.equal(h.sesi.isian.jenis.nilai, "longsor");
  assert.equal(h.sesi.isian.lokasi.nilai.ketelitian, "titik GPS");
  assert.deepEqual(wajibKurang(h.sesi), []);
  // sisa isian: jawab "tidak ada" / "belum tahu" sampai ringkasan
  let sesi = h.sesi, p = h.pelapor;
  for (let i = 0; i < 40 && sesi.status !== "ringkasan"; i++) {
    h = await putaran({sesi, pelapor: p, pesan: {teks: h.pilihan ? "1" : i % 2 ? "belum tahu" : "tidak ada"}, kini: ++jam}); // pilihan (opsi, foto) dijawab 1
    sesi = h.sesi;
  }
  assert.equal(sesi.status, "ringkasan");
  assert.ok(sesi.fotoSelesai, "langkah foto ditanyakan sebelum ringkasan");
  assert.deepEqual(h.pilihan, ["Kirim", "Ubah", "Batal"]);
  h = await putaran({sesi, pelapor: p, pesan: {teks: "1"}, kini: ++jam});
  assert.equal(h.kirim, true);
  assert.equal(h.sesi.status, "terkirim");
});

test("dengan model: uraian berkutipan masuk, kelompok ditanya sekaligus, lokasi luar Indonesia ditolak", async () => {
  const model = async ({teks}) => {
    if (teks.includes("banjir")) return {isian: [{nama: "lokasi", nilai: "Desa Air Tenang, Aceh Tamiang", kutipan: "Desa Air Tenang, Aceh Tamiang"}],
      jenis_tebak: [{jenis: "banjir", subjenis: "Banjir luapan sungai", yakin: 0.8}, {jenis: "banjir", subjenis: "Banjir bandang", yakin: 0.5}],
      darurat_jiwa: false, tanggapan: "terima_kasih", topik: "bencana"};
    return {isian: [{nama: "rumah_berat", nilai: "3", kutipan: "tiga rusak berat"}, {nama: "mengungsi_jiwa", nilai: "12", kutipan: "dua belas orang mengungsi"}],
      jenis_tebak: [], darurat_jiwa: false, tanggapan: "terima_kasih", topik: "bencana"};
  };
  const pelapor = {wa: "6280000000000", nama: "Budi", peran: "warga"};
  let h = await obrol(["lapor", "1", {lokasi: {lat: -6.6, lon: 106.8, akurasi: 12, sumber: "gps"}}, "1", "1", ...kr1("banjir"), "1", "Ada banjir, air masuk rumah warga di Desa Air Tenang, Aceh Tamiang"], {model, pelapor});
  assert.match(h.sesi.isian.kronologi.nilai, /intensitas tinggi.*Desa Air Tenang/, "kronologi dirangkai dari pilihan, keterangan tambahan ikut");
  assert.match(h.balasan, /Terima kasih sudah melapor/);
  assert.equal(h.sesi.isian.jenis.nilai, "banjir");
  h = await putaran({sesi: h.sesi, pelapor, pesan: {lokasi: {lat: 40, lon: -3, sumber: "wa"}}, model, kini: ++jam});
  assert.match(h.balasan, /di luar Indonesia/);
});

import {uraiWaktu} from "../../src/lapor_mesin.js";
test("waktu wajib tanggal dan jam; 'tadi malam' di siang hari = kemarin; masa depan ditolak", () => {
  const kini = Date.UTC(2026, 10, 19, 7, 30); // 14.30 WIB
  assert.equal(uraiWaktu("tadi malam jam 21.00", kini).tampil, "18 November 2026, 21.00 WIB");
  assert.equal(uraiWaktu("19 November 2026 jam 9 pagi", kini).tampil, "19 November 2026, 09.00 WIB");
  assert.equal(uraiWaktu("hari ini", kini).galat, "jam");
  assert.equal(uraiWaktu("jam 3 sore", kini).galat, "tanggal");
  assert.equal(uraiWaktu("hari ini jam 22.00", kini).galat, "masa_depan");
  assert.equal(uraiWaktu("19/11/2026 10.15", kini, "73").tampil, "19 November 2026, 10.15 WITA", "zona dari provinsi");
});

test("kronologi berpandu dirangkai jadi kalimat gaya laporan Pusdalops; pilihan berbahaya memunculkan peringatan", async () => {
  const L = langkahKronologi("banjir"), jawaban = L.map(l => l.banyak ? "1, 2" : "2"); // langkah 2 pilihan kedua = naik cepat (bahaya)
  const awal = ["lapor", "1", "2", "Siti", "Kabupaten Bogor", "Kalaksa", {lokasi: {lat: -6.6, lon: 106.8, akurasi: 12, sumber: "gps"}}, "1", "1"];
  const sela = await obrol([...awal, ...jawaban.slice(0, 2)]);
  assert.match(sela.balasan, /^\*[^*]+\*[\s\S]*Peringatan keselamatan/, "pilihan bertanda bahaya memunculkan peringatan sebelum langkah berikutnya");
  const h = await obrol([...awal, ...jawaban, "2"]);
  const frasa = L.map((l, i) => l.banyak ? `${l.awalan} ${[0, 1].map(n => l.opsi[n][1]).filter(Boolean).join(", ")}.` : l.opsi[1][1]).filter(Boolean);
  assert.equal(h.sesi.isian.kronologi.nilai, rangkaiKronologi(frasa));
  assert.doesNotMatch(h.sesi.isian.kronologi.nilai, /\.\.|null|undefined/);
  assert.equal(h.sesi.status, "melengkapi");
});

test("isian daftar: jumlah baris mengikuti angka yang dilaporkan", async () => {
  const {isiAwal} = await import("../../src/lapor_mesin.js");
  assert.equal(isiAwal("nama_sekolah", Date.now(), {isian: {fasilitas_sekolah: {nilai: 1}}}), "Nama sekolah rusak:\n1. ");
  assert.equal(isiAwal("nama_sekolah", Date.now(), {isian: {fasilitas_sekolah: {nilai: 2}}}).split("\n").length, 3);
});

test("petunjuk khusus WhatsApp tidak tampil di saluran web", async () => {
  const {putaran} = await import("../../src/lapor_mesin.js");
  const h = await putaran({sesi: null, pelapor: {wa: "6280000000000", nama: "Budi", peran: "warga"}, pesan: {teks: "lapor", saluran: "web"}, kini: Date.now()});
  const h2 = await putaran({sesi: h.sesi, pelapor: h.pelapor, pesan: {teks: "1", saluran: "web"}, kini: Date.now() + 1});
  assert.doesNotMatch(h2.balasan, /WhatsApp:/);
});

test("daftar nama kurang dari jumlah: ditanya sisanya sekali, lalu diterima dengan konfirmasi", async () => {
  const {putaran} = await import("../../src/lapor_mesin.js");
  const sesi = {status: "melengkapi", tanya: "nama_faskes", ditanya: [], transkrip: [], isian: {jenis: {nilai: "banjir"}, fasilitas_kesehatan: {nilai: 5}}};
  const pelapor = {wa: "6280000000000", nama: "Budi", peran: "warga"};
  let h = await putaran({sesi, pelapor, pesan: {teks: "Nama fasilitas kesehatan rusak:\n1. Klinik Lima\n2. Klinik Pasta\n3. Klinik Gas\n4.\n5.", saluran: "web"}, kini: Date.now()});
  assert.match(h.balasan, /baru 3 nama/);
  assert.equal(h.sesi.isian.nama_faskes.nilai, "Klinik Lima; Klinik Pasta; Klinik Gas");
  assert.match(h.isiAwal, /4\. \n5\. /);
  const simpan = structuredClone(h.sesi);
  h = await putaran({sesi: h.sesi, pelapor, pesan: {teks: "2", saluran: "web"}, kini: Date.now() + 1});   // Tidak tahu
  assert.match(h.balasan, /Tercatat 3 dari 5/);
  // "Tulis 2 lagi" (pemilik 25 Nov 2026): kotak bernomor terbuka, nama baru ditambahkan ke yang sudah ada
  h = await putaran({sesi: simpan, pelapor, pesan: {teks: "1", saluran: "web"}, kini: Date.now() + 2});
  assert.match(h.balasan, /Tambahkan 2 nama lagi/); assert.equal(h.minta, "tempat:faskes"); assert.deepEqual(h.sudah, ["Klinik Lima", "Klinik Pasta", "Klinik Gas"]); assert.match(h.isiAwal, /4\. \n5\. /);
  h = await putaran({sesi: h.sesi, pelapor, pesan: {teks: "Nama fasilitas kesehatan rusak:\n4. Klinik Enam\n5. Klinik Tujuh", saluran: "web"}, kini: Date.now() + 3});
  assert.equal(h.sesi.isian.nama_faskes.nilai, "Klinik Lima; Klinik Pasta; Klinik Gas; Klinik Enam; Klinik Tujuh");
});

test("titik pengungsian tidak dihitung dari jumlah orang mengungsi (pemilik 25 Nov 2026)", async () => {
  const {putaran} = await import("../../src/lapor_mesin.js");
  const sesi = {status: "melengkapi", tanya: "titik_pengungsian", ditanya: [], transkrip: [], isian: {jenis: {nilai: "banjir"}, mengungsi_jiwa: {nilai: 5}}};
  const h = await putaran({sesi, pelapor: {wa: "6280000000000", nama: "Budi", peran: "warga"}, pesan: {teks: "Titik pengungsian: SD Negeri 21, Tenda di Kantor Kepala Desa", saluran: "web"}, kini: Date.now()});
  assert.doesNotMatch(h.balasan, /baru 2 nama/);
  assert.equal(h.sesi.isian.mengungsi_jiwa.nilai, 5);
  assert.equal(h.sesi.isian.titik_pengungsian.nilai, "SD Negeri 21; Tenda di Kantor Kepala Desa");
});

test("nama yang tidak sesuai jenisnya dikonfirmasi dulu", async () => {
  const {putaran} = await import("../../src/lapor_mesin.js");
  const sesi = {status: "melengkapi", tanya: "nama_faskes", ditanya: [], transkrip: [], isian: {jenis: {nilai: "banjir"}, fasilitas_kesehatan: {nilai: 1}}};
  const pelapor = {wa: "6280000000000", nama: "Budi", peran: "warga"};
  let h = await putaran({sesi, pelapor, pesan: {teks: "Nama fasilitas kesehatan rusak:\n1. SD 03", saluran: "web"}, kini: Date.now()});
  assert.match(h.balasan, /tampaknya bukan fasilitas kesehatan/);
  h = await putaran({sesi: h.sesi, pelapor, pesan: {teks: "2", saluran: "web"}, kini: Date.now() + 1});
  assert.match(h.balasan, /Tulis ulang/);
  assert.equal(h.sesi.isian.nama_faskes, undefined);
});

test("salah pilih: 'kembali' memulihkan pertanyaan sebelumnya beserta isiannya", async () => {
  const awal = ["lapor", "1", "2", "Siti", "Kabupaten Bogor", "Kalaksa", {lokasi: {lat: -6.6, lon: 106.8, akurasi: 12, sumber: "gps"}}];
  const sesudahJenis = await obrol([...awal, "1"]);
  assert.equal(sesudahJenis.sesi.isian.jenis.nilai, "banjir");
  const h = await putaran({sesi: sesudahJenis.sesi, pelapor: sesudahJenis.pelapor, pesan: {teks: "kembali"}, kini: ++jam});
  assert.equal(h.kembali, true);
  assert.equal(h.sesi.isian.jenis, undefined, "jenis yang salah pilih terhapus");
  assert.match(h.inti, /Jenis bencana/, "pertanyaan jenis tampil lagi");
  const lagi = await putaran({sesi: h.sesi, pelapor: h.pelapor, pesan: {teks: "2"}, kini: ++jam});
  assert.equal(lagi.sesi.isian.jenis.nilai, "longsor", "bisa memilih ulang");
});

test("isian warga baru: lahan per jenis, kelompok rentan, layanan terganggu", async () => {
  const {berlaku, isianNama} = await import("../../src/lapor_spek.js");
  const ada = j => berlaku(j).map(i => i.nama);
  for (const j of ["banjir", "longsor", "kekeringan", "erupsi", "cuaca", "tsunami", "abrasi"]) assert.ok(ada(j).includes("lahan_terendam"), `lahan untuk ${j}`);
  for (const j of ["karhutla", "gempa", "kebakaran_gedung", "lainnya"]) assert.ok(!ada(j).includes("lahan_terendam"), `tanpa lahan untuk ${j}`);
  assert.match(isianNama.lahan_terendam.tanyaJenis.kekeringan, /puso/);
  for (const j of JENIS.map(x => x.id)) { assert.ok(ada(j).includes("rentan")); assert.ok(ada(j).includes("layanan_terganggu")); }
});

test("isian per jenis: karhutla tanpa jalan/jembatan dan rumah terendam; kekeringan tanpa rumah dan fasilitas", async () => {
  const {berlaku, KELOMPOK} = await import("../../src/lapor_spek.js");
  const ada = j => berlaku(j).map(i => i.nama);
  for (const n of ["jalan_jembatan", "rumah_terendam"]) assert.ok(!ada("karhutla").includes(n), `karhutla tanpa ${n}`);
  assert.ok(ada("karhutla").includes("rumah_berat"));
  for (const n of ["rumah_berat", "fasilitas_sekolah", "jalan_jembatan"]) assert.ok(!ada("kekeringan").includes(n), `kekeringan tanpa ${n}`);
  assert.ok(ada("banjir").includes("rumah_terendam") && ada("banjir").includes("jalan_jembatan"));
  assert.match(KELOMPOK.find(k => k.id === "fasilitas").tanyaJenis.karhutla, /terbakar/);
});

import {buatModel} from "../../src/lapor_model.js";
test("model: alamat router dipakai bila dasar diisi; header beta dan fallbacks tidak dikirim lewat router; balasan [DONE] terbaca", async () => {
  const panggilan = [];
  const f = async (u, o) => { panggilan.push({u, h: o.headers, b: JSON.parse(o.body)}); return new Response(`${JSON.stringify({content: [{type: "text", text: '{"a":1}'}], usage: {}, stop_reason: "end_turn"})}\n\ndata: [DONE]\n`); };
  const arg = {sistem: "s", skema: {type: "object"}, teks: "t"};
  assert.deepEqual(await buatModel({kunci: "k", fetch: f, dasar: "https://router.contoh.id/"})(arg), {a: 1});
  assert.equal(panggilan[0].u, "https://router.contoh.id/v1/messages");
  assert.equal(panggilan[0].h["x-app"], "cli"); assert.equal(panggilan[0].h["anthropic-beta"], undefined); assert.equal(panggilan[0].b.fallbacks, undefined);
  await buatModel({kunci: "k", fetch: f})(arg);
  assert.equal(panggilan[1].u, "https://api.anthropic.com/v1/messages"); assert.ok(panggilan[1].h["anthropic-beta"]); assert.equal(panggilan[1].b.fallbacks, "default"); assert.equal(panggilan[1].h["x-app"], undefined);
});

/* ---------- kejadian yang sama (K66, D103-D105; TIKET LA-68) ---------- */
const WIL = {kode: "32.01.01.2001", desa: "Sukamaju", kec: "Cibinong", kab: "Kabupaten Bogor", kabKode: "32.01", prov: "Jawa Barat", provKode: "32", sekitar: [{kode: "32.01.01.2001", desa: "Sukamaju", kec: "Cibinong", jarakKm: 1}]};
const wilayahUji = async () => ({...WIL});
const LOK = {lokasi: {lat: -6.6, lon: 106.8, akurasi: 12, sumber: "gps"}};
const WAKTU_INDUK = Date.UTC(2026, 10, 20, 3, 0), KINI_KJ = Date.UTC(2026, 10, 20, 4, 0);
const KAND = {nomor: "LA-201126-01", jenis: "banjir", subjenis: "Banjir bandang", ref: WAKTU_INDUK, n: 2, waktu: {nilai: "20 November 2026, 10.00 WIB", ms: WAKTU_INDUK}, kejadian: null};
async function obrolKj(langkah, kandidat) {
  let sesi = null, pelapor = null, hasil;
  for (const pesan of langkah) {
    hasil = await putaran({sesi, pelapor, pesan: typeof pesan === "string" ? {teks: pesan, wa: "6280000000000"} : {wa: "6280000000000", ...pesan}, model: null, wilayah: wilayahUji, kandidat, kini: KINI_KJ});
    sesi = hasil.sesi; pelapor = hasil.pelapor;
  }
  return hasil;
}
const HINGGA_LOKASI = ["lapor", "1", "1", "Budi Santoso", LOK, "1", "tidak tahu"];

test("kejadian sama: kandidat sekecamatan ditawarkan sesudah RT/RW, tanpa nama, nomor tiket, atau isi laporan lain", async () => {
  let dipanggil = null;
  const h = await obrolKj(HINGGA_LOKASI, async a => { dipanggil = a; return [KAND]; });
  assert.equal(dipanggil.kecKode, "32.01.01", "kode kecamatan dari kode desa");
  assert.match(h.balasan, /\*Kejadian yang sama\?\*/);
  assert.match(h.balasan, /Di Kec\. Cibinong sudah ada laporan banjir sejak 20 November 2026, 10\.00 WIB dari 2 warga\./);
  assert.match(h.balasan, /Apakah Anda melaporkan kejadian ini\?/);
  assert.deepEqual(h.pilihan, ["Ya, banjir ini", "Bukan, kejadian lain"]);
  assert.doesNotMatch(h.balasan, /LA-\d|Budi|6280/, "tanpa nomor tiket, nama, atau nomor WA");
  assert.equal(h.sesi.status, "kejadian");
});

test("kejadian sama: ya mengunci jenis, subjenis, waktu, lalu detail bebas, foto, ringkasan, kirim; isian lain tidak ditanya", async () => {
  const kand = async () => [KAND];
  let h = await obrolKj([...HINGGA_LOKASI, "1"], kand);
  assert.match(h.balasan, /Ada detail yang ingin Anda tambahkan\?/);
  assert.equal(h.sesi.isian.jenis.nilai, "banjir");
  assert.equal(h.sesi.isian.subjenis.nilai, "Banjir bandang");
  assert.equal(h.sesi.isian.waktu.nilai, "20 November 2026, 10.00 WIB");
  assert.equal(h.sesi.isian.waktu.ms, WAKTU_INDUK);
  assert.deepEqual(h.sesi.kejadian, {induk: "LA-201126-01", kode: null, ya: true});
  h = await obrolKj([...HINGGA_LOKASI, "1", "meninggal 3, air setinggi dada dan 40 kk mengungsi"], kand);
  assert.equal(h.sesi.isian.meninggal?.nilai, 3, "angka dari detail bebas tercatat");
  assert.equal(h.sesi.status, "foto", "sesudah detail langsung foto, bukan pertanyaan isian satu per satu");
  h = await obrolKj([...HINGGA_LOKASI, "1", "1", "1"], kand);   // tanpa detail, tanpa foto
  assert.equal(h.sesi.status, "ringkasan");
  assert.ok(h.sesi.isian.lokasi && !h.sesi.isian.meninggal, "tak ada isian dampak yang dikarang");
  h = await obrolKj([...HINGGA_LOKASI, "1", "1", "1", "kirim"], kand);
  assert.equal(h.kirim, true);
  assert.equal(h.sesi.kejadian.induk, "LA-201126-01");
});

test("kejadian sama: Bukan = jalur lama (pilih jenis); tanpa kandidat atau tanpa fungsi = tidak ada pertanyaan baru", async () => {
  const bukan = await obrolKj([...HINGGA_LOKASI, "2"], async () => [KAND]);
  assert.match(bukan.balasan, /Jenis bencana/);
  assert.equal(bukan.sesi.kejadian, undefined);
  for (const kand of [async () => [], null, async () => { throw new Error("D1 mati"); }]) {
    const h = await obrolKj(HINGGA_LOKASI, kand);
    assert.match(h.balasan, /Jenis bencana/, "perilaku lama tidak berubah sama sekali");
    assert.notEqual(h.sesi.status, "kejadian");
  }
});

test("kejadian sama: pilihan di luar daftar ditanyakan ulang; beberapa kandidat satu pilihan per jenis", async () => {
  const dua = async () => [KAND, {...KAND, nomor: "LA-201126-02", jenis: "longsor", subjenis: "Longsor tanah", n: 1}];
  let h = await obrolKj(HINGGA_LOKASI, dua);
  assert.deepEqual(h.pilihan, ["Ya, banjir ini", "Ya, tanah longsor ini", "Bukan, kejadian lain"]);
  assert.match(h.balasan, /salah satu kejadian ini/);
  h = await obrolKj([...HINGGA_LOKASI, "9"], dua);
  assert.equal(h.sesi.status, "kejadian", "angka di luar daftar tidak mengunci apa pun");
  h = await obrolKj([...HINGGA_LOKASI, "2"], dua);
  assert.equal(h.sesi.isian.jenis.nilai, "longsor");
});

test("lapor darurat (K68): identitas, lokasi, jenis, korban, foto boleh dilewati, ringkasan lalu kirim", async () => {
  const L = {lokasi: {lat: -6.6, lon: 106.8, akurasi: 12, sumber: "gps"}};
  const h1 = await obrol(["darurat", "1", "1", "Budi Santoso", L]);
  assert.equal(h1.sesi.status, "darurat_jenis"); assert.ok(h1.sesi.darurat); assert.equal(h1.minta, "jenis");
  assert.ok(!h1.pilihan.includes("Lainnya") && h1.pilihan.length === JENIS.filter(j => j.id !== "lainnya").length);
  const h2 = await obrol(["darurat", "1", "1", "Budi Santoso", L, "1"]);
  assert.equal(h2.sesi.isian.jenis.nilai, JENIS[0].id); assert.ok(h2.sesi.isian.waktu?.ms, "waktu kejadian = saat dilaporkan");
  assert.deepEqual(h2.pilihan, ["Ya, ada", "Tidak ada", "Belum tahu"]);
  const h3 = await obrol(["darurat", "1", "1", "Budi Santoso", L, "1", "ya ada yang terjebak"]);
  assert.equal(h3.sesi.darurat.korban, "ya"); assert.equal(h3.sesi.status, "darurat_isi");   // K97: ada korban, tanya terjebak lalu butuh medis
  assert.match(h3.balasan, /Orang terjebak/); assert.equal(h3.pilihan[0], "Ya, ada yang terlihat atau terdengar");
  const h3b = await obrol(["darurat", "1", "1", "Budi Santoso", L, "1", "ya ada yang terjebak", "1", "1"]);
  assert.equal(h3b.sesi.status, "foto"); assert.equal(h3b.sesi.isian.butuh_penyelamatan.nilai, "Ya, ada yang terlihat atau terdengar"); assert.ok(h3b.sesi.isian.butuh_medis?.nilai);
  const h4 = await obrol(["darurat", "1", "1", "Budi Santoso", L, "1", "3", "1"]);
  assert.equal(h4.sesi.status, "ringkasan"); assert.equal(h4.sesi.darurat.korban, "belum_tahu"); assert.match(h4.balasan, /Ringkasan laporan darurat/);
  const h5 = await obrol(["darurat", "1", "1", "Budi Santoso", L, "1", "2", "1", "1"]);
  assert.equal(h5.sesi.status, "terkirim"); assert.ok(h5.kirim);
});

test("lapor darurat: kata darurat di tengah laporan biasa membuka laporan darurat baru", async () => {
  const h = await obrol(["lapor", "1", "1", "Budi Santoso", {lokasi: {lat: -6.6, lon: 106.8, akurasi: 12, sumber: "gps"}}, "darurat"]);
  assert.ok(h.sesi.darurat); assert.equal(h.sesi.status, "identitas");
});

test("cerita pertama yang tidak dipakai tetap memakai kronologi berpandu, bukan ketik bebas (pemilik 23 Nov 2026)", async () => {
  const jenis = JENIS.findIndex(j => j.id === "abrasi");
  const h = await obrol(["tolong buatkan puisi tentang laut yang indah sekali ya", "1", "1", "Budi Santoso",
    {lokasi: {lat: -6.19, lon: 106.87, akurasi: 12, sumber: "gps"}}, String(jenis + 1), "1"]);
  assert.equal(h.sesi.status, "kronologi", "langsung ke langkah kronologi berpilihan");
  assert.ok(h.pilihan?.length > 1, "kronologi dijawab dengan memilih");
});

/* pemilik 24 Nov 2026: cerita bencana dibalas "Layanan ini hanya untuk melaporkan kejadian bencana", lalu kronologi jatuh ke ketik bebas */
const modelBukan = async () => ({isian: [], jenis_tebak: [{jenis: "abrasi", subjenis: "Gelombang pasang", yakin: 0.9}], darurat_jiwa: false, tanggapan: "terima_kasih", topik: "bukan_bencana"});
const wilayahUtan = async () => ({desa: "Utan Kayu Utara", kec: "Matraman", kab: "Kota Administrasi Jakarta Timur", prov: "DKI Jakarta", kode: "3172021003", sekitar: []});
async function obrolW(langkah, model) {
  let sesi = null, pelapor = {wa: "6280000000000", nama: "Budi", peran: "warga"}, hasil;
  for (const p of langkah) { hasil = await putaran({sesi, pelapor, pesan: typeof p === "string" ? {teks: p, wa: "6280000000000"} : p, model, wilayah: wilayahUtan, kini: ++jam}); sesi = hasil.sesi; pelapor = hasil.pelapor; }
  return hasil;
}
const GPS = {lokasi: {lat: -6.193411, lon: 106.868136, akurasi: 55, sumber: "gps"}}, TT = {form: {kosong: true}};
const ABRASI = "1";   // tebakan model (abrasi) ada di urutan teratas daftar jenis

test("cerita yang menyebut jenis bencana tidak pernah luar topik walau model menilai bukan_bencana", async () => {
  const h = await obrolW(["ada gelombang pasang tinggi di pantai dekat rumah", "1", GPS, "1", TT], modelBukan);
  assert.doesNotMatch(h.balasan, /hanya untuk melaporkan kejadian bencana/);
  assert.ok(!h.sesi.luar, "tidak dihitung luar topik");
});

test("cerita awal panjang tidak melewati kronologi berpandu; cerita ditempel di belakang kalimat pilihan", async () => {
  const awal = ["ada gelombang pasang tinggi di pantai dekat rumah", "1", GPS, "1", TT, ABRASI, "1"];
  const h = await obrolW(awal, modelBukan);
  assert.equal(h.sesi.status, "kronologi", "sesudah karakteristik: kronologi berpandu, bukan kotak ketik");
  assert.ok(h.pilihan.length >= 2);
  const n = langkahKronologi("abrasi").length;
  const selesai = await obrolW([...awal, ...Array(n).fill("1"), "2"], modelBukan);
  assert.match(selesai.sesi.isian.kronologi.nilai, /gelombang pasang tinggi di pantai dekat rumah/, "cerita awal ikut");
  assert.ok(selesai.sesi.krSelesai, "panduan sekali per sesi");
  assert.notEqual(selesai.sesi.status, "kronologi");
});

test("lapor orang hilang lewat obrolan (pemilik 25 Nov 2026): identitas, lokasi terakhir, nama, hubungan, ciri, foto, waktu, nomor, ringkasan, kirim", async () => {
  const W = async () => ({desa: "Sukamaju", kec: "Cibinong", kab: "Kab. Bogor", kabKode: "32.01", provKode: "32", kode: "32.01.01.2001", sekitar: []});
  let sesi = null, pelapor = null, h;
  const kirim = async teks => { h = await putaran({sesi, pelapor, pesan: typeof teks === "string" ? {teks, wa: "6280000000000"} : {...teks, wa: "6280000000000"}, wilayah: W, kini: ++jam}); sesi = h.sesi; pelapor = h.pelapor; return h; };
  for (const t of ["orang hilang", "1", "1", "Budi Santoso"]) await kirim(t);
  assert.ok(sesi.cari); assert.equal(sesi.status, "lokasi"); assert.match(h.balasan, /terakhir terlihat/);
  await kirim({lokasi: {lat: -6.6, lon: 106.8, akurasi: 12, sumber: "gps"}}); assert.equal(sesi.status, "wilayah");
  await kirim("1"); assert.equal(sesi.status, "cari_nama", "tanpa RT/RW");
  assert.equal((await kirim("A1")).sesi.status, "cari_nama", "nama berangka ditolak");
  await kirim("Siti Aminah"); assert.equal(sesi.status, "cari_panggilan", "nama lengkap dulu, baru nama panggilan"); assert.match(h.balasan, /Nama panggilan Siti Aminah/); assert.deepEqual(h.pilihan, ["Lewati"]);
  assert.equal((await kirim("A1")).sesi.status, "cari_panggilan", "panggilan berangka ditolak");
  await kirim("Ami"); assert.equal(sesi.status, "cari_hubungan"); assert.ok(h.pilihan.includes("Anak"));
  await kirim("1"); assert.equal(sesi.cari.hubungan, "Anak");
  // ciri ditanya satu per satu (pemilik 26 Nov 2026): kelamin dipilih, umur ditulis angka, pakaian dan tanda boleh dilewati
  assert.equal(sesi.status, "cari_kelamin"); assert.deepEqual(h.pilihan, ["Laki-laki", "Perempuan", "Tidak tahu"]);
  await kirim("2"); assert.equal(sesi.status, "cari_umur"); assert.equal(h.minta, "angka"); assert.deepEqual(h.pilihan, ["Tidak tahu"]);
  assert.equal((await kirim("sembilan")).sesi.status, "cari_umur", "umur bukan angka ditanya ulang");
  assert.equal((await kirim("200")).sesi.status, "cari_umur", "umur di luar 0..120 ditanya ulang");
  await kirim("9"); assert.equal(sesi.status, "cari_pakaian");
  await kirim("kaos merah"); assert.equal(sesi.status, "cari_tanda");
  await kirim("1"); assert.equal(sesi.status, "cari_foto", "sesudah ciri: foto (pemilik 26 Nov 2026)"); assert.equal(h.minta, "foto_cari"); assert.deepEqual(h.pilihan, ["Lewati"]); assert.match(h.balasan, /galeri/);
  assert.equal((await kirim("apa ini")).sesi.status, "cari_foto", "teks lain ditanya ulang");
  await kirim({foto: {id: "f".repeat(16), lencana: "tanpa"}}); assert.equal(sesi.cari.foto, "f".repeat(16)); assert.equal(sesi.foto.length, 1); assert.equal(sesi.status, "cari_waktu"); assert.match(h.balasan, /Foto diterima/);
  // web: "Kapan terakhir terlihat" memakai kartu tanggal dan jam seperti waktu kejadian (pemilik 26 Nov 2026), jam boleh kosong
  await kirim({teks: "x", saluran: "web"}); assert.equal(sesi.status, "cari_waktu"); assert.equal(h.form.judul, "Kapan terakhir terlihat"); assert.equal(h.form.jamOpsional, true); assert.equal(h.pilihan, null);
  await kirim({form: {tanggal: "2999-01-01", jam: ""}, saluran: "web"}); assert.equal(sesi.status, "cari_waktu", "tanggal masa depan ditanya ulang"); assert.match(h.balasan, /belum terjadi/);
  await kirim({form: {tanggal: "1970-02-30", jam: ""}, saluran: "web"}); assert.match(h.balasan, /tidak sah/, "tanggal yang tidak ada ditolak");
  await kirim({form: {tanggal: "1970-01-01", jam: ""}, saluran: "web"}); assert.equal(sesi.cari.waktu, "1 Januari 1970");
  assert.equal((await kirim("123")).sesi.status, "cari_nomor", "nomor tidak sah ditanya ulang");
  await kirim("0812 3456 7890"); assert.equal(sesi.cari.nomor, "6281234567890"); assert.equal(sesi.status, "cari_kontak"); assert.deepEqual(h.pilihan, ["Pakai nomor saya"]);
  assert.equal((await kirim("12")).sesi.status, "cari_kontak", "nomor kontak tidak sah ditanya ulang");
  await kirim("1"); assert.equal(sesi.cari.kontak, "6280000000000", "pakai nomor pelapor"); assert.equal(sesi.status, "cari_tempat"); assert.match(h.balasan, /nama jalan/);
  assert.equal((await kirim("ok")).sesi.status, "cari_tempat", "tempat terlalu pendek ditanya ulang");
  await kirim("Posko Masjid Al Ikhlas, Jl. Raya Cibinong No 12"); assert.equal(sesi.status, "cari_konfirm");
  assert.match(h.balasan, /Ringkasan laporan orang dicari/); assert.match(h.balasan, /Nama: Siti Aminah \(panggilan Ami\)/); assert.match(h.balasan, /Diantar ke: Posko Masjid Al Ikhlas, Jl\. Raya Cibinong No 12/); assert.match(h.balasan, /Foto: ada/);
  await kirim("1");
  assert.equal(sesi.status, "cari_terkirim"); assert.ok(!h.kirim, "bukan laporan bertiket");
  assert.deepEqual(sesi.cari, {nama: "Siti Aminah"}, "ciri, nomor, hubungan tidak tertinggal di salinan sesi");
  assert.deepEqual(h.kirimCari, {nama_dicari: "Siti Aminah", ciri: "Perempuan, 9 tahun, pakaian terakhir kaos merah", lokasi_terakhir: "Desa/Kel. Sukamaju, Kec. Cibinong", waktu_terakhir: "1 Januari 1970", nomor_dicari: "6281234567890", hubungan: "Anak", kab: "32.01"});
  assert.deepEqual(h.kirimTemu, {panggilan: "Ami", nomor_kontak: "6280000000000", tempat_tunggu: "Posko Masjid Al Ikhlas, Jl. Raya Cibinong No 12", foto_id: "f".repeat(16)});
  assert.match(h.balasan, /mengantar ke Posko Masjid Al Ikhlas/);
  const baru = await kirim("halo"); assert.equal(baru.sesi.cari, undefined, "sesudah terkirim, pesan berikutnya membuka laporan biasa");
  assert.deepEqual(sesi.cari ?? {}, {}, "sesi baru tanpa rincian orang dicari");
  const L = {lokasi: {lat: -6.6, lon: 106.8, akurasi: 12, sumber: "gps"}};
  const draf = await obrol(["darurat", "1", "1", "Budi Santoso", L, "1", "orang hilang"]);
  assert.equal(draf.sesi.cari, undefined, "jawaban 'orang hilang' di tengah laporan lain tidak menimpa draf"); assert.equal(draf.sesi.status, "darurat_korban");
  const tombol = await obrol(["darurat", "1", "1", "Budi Santoso", L, "1", "lapor orang hilang"]);
  assert.ok(tombol.sesi.cari, "tombol Lapor orang hilang membuka obrolan baru");
});
