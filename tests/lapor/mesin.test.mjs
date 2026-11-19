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
  assert.equal(v.tanggapan, "", "tanggapan berangka atau berkata aman dibuang");
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
  assert.equal(h.pilihan.length, JENIS.length, "semua jenis tetap bisa dipilih, termasuk Lainnya");
  assert.equal(h.pilihan.at(-1), "Lainnya", "Lainnya di urutan terakhir");
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
      darurat_jiwa: false, tanggapan: "Terima kasih sudah melapor."};
    return {isian: [{nama: "rumah_berat", nilai: "3", kutipan: "tiga rusak berat"}, {nama: "mengungsi_jiwa", nilai: "12", kutipan: "dua belas orang mengungsi"}],
      jenis_tebak: [], darurat_jiwa: false, tanggapan: "Baik, kami catat."};
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
  h = await putaran({sesi: h.sesi, pelapor, pesan: {teks: "1", saluran: "web"}, kini: Date.now() + 1});
  assert.match(h.balasan, /Tercatat 3 dari 5/);
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
