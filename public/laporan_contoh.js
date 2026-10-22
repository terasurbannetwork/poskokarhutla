/* laporan_contoh.js: isian CONTOH = data NYATA Laporan Kejadian Bencana Harian BNPB 20-21 Okt 2026 (halaman 2): 18 kejadian menonjol di 12 provinsi
   (17 karhutla, 1 gempabumi NTT; 6 selesai, 8 berjalan, 4 belum padam), 3 gunung api Siaga, 19 laporan masuk. Tidak ada angka karangan di sini.
   Dipakai tombol "Isi contoh" di /laporan-bnpb (hanya mengisi draf peramban, tidak menulis ke server) dan uji tests/agen/laporan-konpers.test.mjs. */
(() => {
const K = (jenis, prov, lokasi, utama, status, kedua = "", ket = "", catatan = "", perhatian = "") => ({jenis, prov, lokasi, utama, kedua, ket, catatan, status, perhatian: status === "belum" ? perhatian : ""});
const KH = (...a) => K("karhutla", ...a);
const X = (k, o) => ({...k, ...o});
/* turunan: dampak dari angka utama, kondisi dari status baris (selesai = api padam, belum = belum padam) */
const D = (k, o = {}) => ({...k, dampak: /^±/.test(k.utama) ? `${k.utama} lahan terbakar` : "Luas lahan terbakar dalam pendataan",
  kondisi: k.catatan || (k.status === "selesai" ? "Api sudah berhasil dipadamkan" : k.status === "belum" ? "Api belum padam" : "Pemadaman masih berlangsung"), ...o});
window.LaporanContoh = {
  harian: (tanggal = "2026-10-21", mulai = "2026-10-20") => ({
    mulai, jam: "07.00", laporan_masuk: 19, penyaji: "Letnan Jenderal TNI Kristomei Sianturi, S.Sos., M.Si., M.Si. (Han)", jabatan: "Kepala BNPB",
    instansi: "Badan Nasional Penanggulangan Bencana", singkatan: "BNPB",
    kepada: "Kepala BNPB", tembusan: ["Unsur Pengarah BNPB", "Ess I BNPB", "Ess II BNPB", "Tenaga Ahli Ka.BNPB"], koordinator: "Jazmi",
    /* urutan = urutan kemunculan di laporan Koordalops asli (A-L); kolom sifat s.d. entry_no hanya diisi bila ada di laporan asli, sisanya turunan dari angka dan status di baris yang sama */
    kejadian: [
      X(KH("16", "", "± 9.061,13 ha", "berjalan", "s.d. 19 Okt", "padam 293,17 | sisa 108,50"), {sifat: "Pengkinian Data", dampak: "Estimasi luas lahan terbakar (berdasarkan data dari Sipongi) di Provinsi Sumatera Selatan sampai dengan 19 Oktober 2026 seluas 1.926,23 Ha + 7.134,90 Ha = ± 9.061,13 Ha",
        status_penetapan: "Siaga Darurat TMT 22/04/2026 s.d 30/11/2026", pendampingan: "Tim BNPB", kondisi: "Jumlah luas lahan terbakar pada tanggal 19 Oktober 2026 adalah ± 401,67 ha", entry_no: 3}),
      X(KH("21", "Lingga", "± 2 ha", "selesai"), {sifat: "Kejadian Baru", dampak: "±2 ha lahan terbakar", status_penetapan: "Siaga Darurat TMT 13/08/2026 s.d 10/11/2026", pendampingan: "-", kondisi: "Api sudah berhasil dipadamkan", entry_no: 4}),
      D(KH("14", "", "± 20.696,28 ha", "selesai", "s.d. 20 Okt", "penambahan nihil")),
      D(KH("15", "", "± 4.852,75 ha", "berjalan", "indikatif", "padam 32,00 | sisa 64,50")),
      D(KH("18", "TN Way Kambas", "± 26 ha", "berjalan", "", "padam 3,40 | sisa 22,60")),
      D(KH("33", "Gunung Sumbing", "± 140 ha", "belum", "14 titik api", "152 pendaki", "", "14 titik api, 152 pendaki"), {tempat: "Gunung Sumbing", dampak: "± 140 ha lahan terbakar, 14 titik api, 152 pendaki"}),
      D(KH("33", "Boyolali", "± 2,55 ha", "selesai")),
      D(KH("33", "Karanganyar", "± 490 ha", "berjalan", "hutan pinus")),
      D(KH("35", "Bromo Probolinggo", "± 75,37 ha", "berjalan", "5 jiwa meninggal", "", "TNBTS"), {tempat: "Kawasan Bromo TNBTS, Kab. Probolinggo", dampak: "± 75,37 ha lahan terbakar, 5 jiwa meninggal dunia"}),
      D(KH("35", "Mojokerto", "± 2 ha", "selesai")),
      D(KH("35", "Arjuno Welirang Pasuruan", "dalam pendataan", "belum", "titik api masih terlihat", "", "", "titik api masih terlihat"), {tempat: "Gunung Arjuno Welirang, Kab. Pasuruan"}),
      D(KH("35", "Malang", "dalam pendataan", "berjalan", "56 personel memadamkan"), {kondisi: "56 personel memadamkan"}),
      D(KH("81", "Seram Bagian Timur", "± 12 ha", "selesai", "136 jiwa ISPA"), {dampak: "± 12 ha lahan terbakar, 136 jiwa ISPA"}),
      D(KH("73", "Sinjai", "± 4 ha", "selesai")),
      D(KH("72", "Tojo Una-Una", "± 10 ha", "belum", "", "", "", "belum padam")),
      D(KH("72", "Sigi", "± 60 ha", "belum", "", "", "", "belum padam")),
      X(K("gempabumi", "53", "", "± 27.847 jiwa mengungsi", "berjalan", "masa transisi s.d. 27 Des", "huntara dibangun"), {sifat: "Pengkinian Data", dampak: "± 27.847 jiwa mengungsi", kondisi: "Masa transisi s.d. 27 Des, huntara dibangun"}),
      D(KH("62", "", "± 24.402,56 ha", "berjalan", "indikatif", "padam 63,10 | sisa 389,39")),
    ],
    perhatian_tambahan: [
      {jenis: "gunungapi", judul: "Anak Krakatau (Lampung) berstatus Siaga", isi: "14 letusan, 72 hybrid, radius 5 km dan 1 km dari pulau baru", status: "berjalan"},
      {jenis: "gunungapi", judul: "Merapi (Jateng, DIY) berstatus Siaga", isi: "16 guguran, 11 hybrid, awan panas hingga 7 km selatan-barat daya", status: "berjalan"},
      {jenis: "gunungapi", judul: "Semeru (Jatim) berstatus Siaga", isi: "53 letusan, 44 hembusan, 13 km tenggara (Besuk Kobokan), radius 5 km", status: "berjalan"},
    ],
    tindak: [{judul: "Pemadaman lanjutan", isi: "Gunung Sumbing, Arjuno Welirang, Sigi, dan Tojo Una-Una masih belum padam."},
      {judul: "Pengungsi gempabumi NTT", isi: "Masa transisi sampai 27 Des, hunian sementara dibangun."},
      {judul: "Gunung api Siaga", isi: "Anak Krakatau, Merapi, dan Semeru dipantau."}, {judul: "", isi: ""}],
    imbauan: [], konpers_pembuka: "", judul_ringkasan: "", judul_rincian: "",
  }),
};
const tb = document.getElementById?.("lbContoh"); if (tb) tb.textContent = "Isi contoh (laporan 21 Okt 2026)";   // jelas ini contoh dari laporan resmi, bukan data hari ini
})();
