/* laporan_contoh.js: isian CONTOH = data NYATA Laporan Kejadian Bencana Harian BNPB 20-21 Okt 2026 (halaman 2): 18 kejadian menonjol di 12 provinsi
   (17 karhutla, 1 gempabumi NTT; 6 selesai, 8 berjalan, 4 belum padam), 3 gunung api Siaga, 19 laporan masuk. Tidak ada angka karangan di sini.
   Dipakai tombol "Isi contoh" di /laporan-bnpb (hanya mengisi draf peramban, tidak menulis ke server) dan uji tests/agen/laporan-konpers.test.mjs. */
(() => {
const K = (jenis, prov, lokasi, utama, status, kedua = "", ket = "", catatan = "", perhatian = "") => ({jenis, prov, lokasi, utama, kedua, ket, catatan, status, perhatian: status === "belum" ? perhatian : ""});
const KH = (...a) => K("karhutla", ...a);
window.LaporanContoh = {
  harian: (tanggal = "2026-10-21", mulai = "2026-10-20") => ({
    mulai, jam: "07.00", laporan_masuk: 19, penyaji: "Letnan Jenderal TNI Kristomei Sianturi, S.Sos., M.Si., M.Si. (Han)", jabatan: "Kepala BNPB",
    instansi: "Badan Nasional Penanggulangan Bencana", singkatan: "BNPB",
    kejadian: [
      KH("62", "", "± 24.402,56 ha", "berjalan", "indikatif", "padam 63,10 | sisa 389,39"),
      KH("16", "", "± 9.061,13 ha", "berjalan", "s.d. 19 Okt", "padam 293,17 | sisa 108,50"),
      KH("14", "", "± 20.696,28 ha", "selesai", "s.d. 20 Okt", "penambahan nihil"),
      KH("15", "", "± 4.852,75 ha", "berjalan", "indikatif", "padam 32,00 | sisa 64,50"),
      KH("33", "Gunung Sumbing", "± 140 ha", "belum", "14 titik api", "152 pendaki", "", "14 titik api, 152 pendaki"),
      KH("33", "Karanganyar", "± 490 ha", "berjalan", "hutan pinus"),
      KH("33", "Boyolali", "± 2,55 ha", "selesai"),
      KH("35", "Bromo Probolinggo", "± 75,37 ha", "berjalan", "5 jiwa meninggal", "", "TNBTS"),
      KH("35", "Arjuno Welirang Pasuruan", "dalam pendataan", "belum", "titik api masih terlihat", "", "", "titik api masih terlihat"),
      KH("35", "Malang", "dalam pendataan", "berjalan", "56 personel memadamkan"),
      KH("35", "Mojokerto", "± 2 ha", "selesai"),
      KH("72", "Sigi", "± 60 ha", "belum", "", "", "", "belum padam"),
      KH("72", "Tojo Una-Una", "± 10 ha", "belum", "", "", "", "belum padam"),
      KH("21", "Lingga", "± 2 ha", "selesai"),
      KH("18", "TN Way Kambas", "± 26 ha", "berjalan", "", "padam 3,40 | sisa 22,60"),
      KH("73", "Sinjai", "± 4 ha", "selesai"),
      KH("81", "Seram Bagian Timur", "± 12 ha", "selesai", "136 jiwa ISPA"),
      K("gempabumi", "53", "", "± 27.847 jiwa mengungsi", "berjalan", "masa transisi s.d. 27 Des", "huntara dibangun"),
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
})();
