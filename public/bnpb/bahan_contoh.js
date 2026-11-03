/* Isian contoh tombol dummy halaman /bnpb/bahan (Super Admin): angka nyata laporan 3 Nov 2026
   (data/laporan-bnpb/harian-2026-11-03/wa-*.txt) dan satgas 2 Nov 2026 (satelit-2026-11-02/wa-satgas.txt). Tidak menulis D1. */
const kej = (jenis, prov, kab, baru, o) => ({jenis, prov, kab, baru, status_darurat: "", pendampingan: "", detail: "Entri contoh (dummy)", ...o});
export const CONTOH = {
  rekap_koordalops_24: {sampai: "2026-11-03", laporan: 26, kejadian: [
    kej("banjir", "11", "Kota Subulussalam", false, {rumah_terendam: 2245, mengungsi_kk: 32, kondisi: "Kecamatan Sultan Daulat Air mulai surut di Jalan Lintas, namun masih ada desa yang tergenang air."}),
    kej("banjir", "11", "Aceh Selatan", false, {mengungsi_jiwa: 205, mengungsi_kk: 58, rumah_terendam: 222, kondisi: "Genangan berangsur surut, pendataan masih berjalan."}),
    kej("cuaca", "12", "Dairi", true, {kondisi: "Hujan lebat disertai angin kencang, pendataan dampak oleh BPBD."})]},
  bmkg_pagi: {tanggal: "2026-11-03", jam: "06.00", periode: {mulai: "2026-11-02", selesai: "2026-11-05"},
    pm: [["PANGKALANBUN", 252.8], ["TALANG BETUTU PALEMBANG", 89.5], ["KOTA JAMBI", 84.2], ["MUSI 2 PALEMBANG", 64.3], ["PESAWARAN", 64.0], ["MUARO JAMBI", 63.2], ["BANJARBARU", 58.7], ["KEMAYORAN", 49.6], ["MAROS", 45.7], ["MEDAN", 37.9]].map(([stasiun, nilai]) => ({stasiun, nilai})),
    hujan: ["11", "12", "14", "15", "16", "19", "21", "32", "33", "34", "35", "51", "61", "62", "65", "73", "75", "82", "91", "92", "93", "95"], lebat: ["13"], angin: ["13"]},
  pvmbg_pagi: {tanggal: "2026-11-03", jam: "06.00", level: {awas: 0, siaga: 3, waspada: 23, normal: 43}, gunung: [
    {nama: "Anak Krakatau", level: "Siaga", visual: ["Gunung api tertutup Kabut 0-III. Teramati asap kawah utama berwarna putih dengan intensitas tipis hingga sedang tinggi sekitar 50-200 meter dari puncak."],
      gempa: [{jumlah: 1, jenis: "Tremor Menerus", rincian: "amplitudo 10-40 mm, dominan 25 mm"}],
      rekom: ["Masyarakat dan pengunjung tidak diperbolehkan memasuki wilayah radius 5 km dari pusat erupsi Anak Krakatau."]},
    {nama: "Merapi", level: "Siaga", visual: ["Gunung api terlihat jelas. Teramati asap kawah utama berwarna putih dengan intensitas sedang tinggi sekitar 50 meter dari puncak.", "Teramati 6 kali guguran lava ke arah Kali Sat/Putih dengan jarak luncur maksimum 1500 meter."],
      gempa: [{jumlah: 15, jenis: "Guguran", rincian: "amplitudo 2-13 mm dan lama gempa 36.18-157.61 detik"}, {jumlah: 1, jenis: "Tremor Non-Harmonik", rincian: "amplitudo 25 mm, dan lama gempa 68.53 detik"},
        {jumlah: 21, jenis: "Hybrid/Fase Banyak", rincian: "amplitudo 2-19 mm, S-P tidak teramati dan lama gempa 20.73-54.09 detik"}, {jumlah: 4, jenis: "Vulkanik Dangkal", rincian: "amplitudo 5-69 mm, dan lama gempa 11.38-20.09 detik"}],
      rekom: ["Masyarakat agar tidak melakukan kegiatan apapun di daerah potensi bahaya.", "Masyarakat agar mewaspadai bahaya lahar dan awanpanas guguran terutama saat terjadi hujan di seputar Gunung Merapi."]},
    {nama: "Semeru", level: "Siaga", visual: ["Gunung api tertutup Kabut 0-III. Asap kawah tidak teramati. Cuaca berawan hingga mendung, angin lemah ke arah barat daya, barat dan barat laut."],
      gempa: [{jumlah: 20, jenis: "Letusan/Erupsi", rincian: "amplitudo 10-25 mm, dan lama gempa 76-241 detik"}, {jumlah: 9, jenis: "Guguran", rincian: "amplitudo 1-7 mm dan lama gempa 39-140 detik"}, {jumlah: 16, jenis: "Hembusan", rincian: "amplitudo 1-9 mm, dan lama gempa 48-112 detik"}],
      rekom: ["Tidak beraktivitas dalam radius 5 Km dari kawah/puncak Gunung Api Semeru karena rawan terhadap bahaya lontaran batu (pijar)."]}]},
  satgas: {tanggal_laporan: "2026-11-02", tanggal_kegiatan: "2026-11-01",
    personel: [["61", 14458], ["62", 16387], ["63", 7927], ["16", 12285], ["14", 14837], ["15", 5984]].map(([prov, jumlah]) => ({prov, jumlah})),
    armada: [["61", 2, 6], ["62", 3, 8], ["63", 8, 4], ["16", 5, 5], ["14", 1, 1], ["15", 2, 3]].map(([prov, patroli, wb]) => ({prov, patroli, wb})).concat([{prov: "64", ikn: true, patroli: 0, wb: 1}, {prov: "93", patroli: 1, wb: 0}, {prov: "96", patroli: 0, wb: 1}]),
    omc: [{prov: "62", sortie: 6, nacl: 6800, dryice: 2500, sasaran: ["Katingan", "Kotawaringin Timur", "Kapuas", "Palangka Raya", "Tanjung Puting"], hujan: null, hujan_lokasi: []},
      {prov: "63", sortie: 2, nacl: 3000, dryice: 0, sasaran: ["Tanah Bumbu", "Banjar"], hujan: null, hujan_lokasi: []},
      {prov: "16", sortie: 4, nacl: 7200, dryice: 0, sasaran: ["OKI", "Ogan Ilir", "Banyuasin", "Musi Banyuasin"], hujan: {intensitas: "ringan hingga sedang"}, hujan_lokasi: ["OKI", "Ogan Ilir", "Banyuasin"]}],
    pemilik: {}},
};
