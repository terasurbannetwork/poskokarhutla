/* Langkah tur peta karhutla (mesin: inti/tur.js). Pemilik 24 Nov 2026: pilihan singkat dan lengkap di awal,
   interaksi (klik baris, rincian cluster muncul di samping, dll.) ikut diperagakan. Peragaan dikembalikan saat tur selesai. */
(() => {
  if (!window.Tur) return;
  const $ = s => document.querySelector(s);
  // S, naik, bukaTab: global skrip utama index.html (deklarasi tingkat atas skrip klasik)
  const st = () => (typeof S !== "undefined" ? S : null);
  const bukaKelompok = () => { let d = $("#rows details"); while (d) { d.open = true; d = d.querySelector("details"); } };
  const keadaan = {
    async lintas({klik, tunggu}) { if (!await klik("#upd")) return null; return tunggu("#lintasPop:not([hidden])"); },
    async provinsi({klik, tunggu}) { await tunggu("#rows button[data-k]"); await klik("#rows button[data-k]"); return tunggu("#crumb button"); },
    // daftar cluster berkelompok provinsi > kab/kota dalam <details> tertutup: buka kelompok teratas seperti pengguna
    async cluster({klik, tunggu}) { await klik('#panelMode [data-m="kom"]'); if (!await tunggu("#rows details")) return null; bukaKelompok(); return tunggu("#rows [data-kom]"); },
    async laci({klik, tunggu}) { await klik('#panelMode [data-m="kom"]'); if (!await tunggu("#rows details")) return null; bukaKelompok();
      const b = await tunggu("#rows [data-kom]"); if (!b) return null; b.click(); return tunggu("#laci.on"); },
    async lapis({klik}) { if (!window.Tur.tampak("#lapis")) await klik("#lapisBtn"); },
  };
  const pulihkan = async () => {
    const pop = $("#lintasPop"); if (pop && !pop.hidden) pop.querySelector(".lp-x")?.click();
    const dl = $("#dlgLaci"); if (dl?.open) dl.close();
    if ($("#laci.on")) $("#laci .tutup")?.click();
    $("#lapis")?.classList.remove("buka");
    if (st() && st().panel !== "wil") $('#panelMode [data-m="wil"]')?.click();
    if (st()?.jalur?.length && typeof naik === "function") naik(0);
    await window.Tur.jeda(200);
  };
  window.Tur.pasang({
    nama: "Karhutla",
    sapa: "Pantau titik panas, cluster api, asap, dan kondisi wilayah kebakaran hutan dan lahan di seluruh Indonesia dari satu peta.",
    gambar: "/img/foto-satelit.jpg",
    sorot: [["titik", "Titik panas", "diperbarui tiap 3 jam"], ["wilayah", "Per wilayah", "provinsi sampai kecamatan"], ["dok", "Laporan harian", "siap dibuka dan dibagikan"]],
    keadaan, pulihkan,
    singkat: [
      {sel: "#tabs", judul: "Menu utama", isi: "Pindah antara Peta, Dalops, Insight, dan halaman lain dari sini."},
      {sel: "#panel", judul: "Panel wilayah", isi: "Daftar provinsi diurutkan dari yang paling genting, lengkap dengan jumlah titik panas dan cluster api."},
      {sel: "#laci", keadaan: "laci", judul: "Rincian cluster api", isi: "Tekan satu cluster di daftar atau di peta, rinciannya muncul di samping: status, luas, posko terdekat, dan tindakan yang disarankan.", peraga: "Kami membuka satu cluster untuk Anda. Tutup dengan tombol X di pojok panel."},
      {sel: "#lapis", keadaan: "lapis", judul: "Lapisan peta", isi: "Nyalakan lapisan tambahan seperti gambut, konsesi, angin, dan citra satelit."},
      {sel: "#upd", judul: "Waktu data", isi: "Jam data terakhir. Tekan untuk melihat lintasan satelit di atas Indonesia."},
      {sel: "#turBuka", judul: "Putar ulang tur", isi: "Buka tur lagi kapan saja dari tombol ini, termasuk tur lengkap."},
    ],
    lengkap: [
      {sel: ".top .bencana", judul: "Pilih jenis bencana", isi: "Ganti pemantauan dari karhutla ke jenis bencana lain, misalnya banjir atau gunung api. Tiap jenis punya peta dan menunya sendiri."},
      {sel: '#tabs [data-t="peta"]', judul: "Peta", isi: "Pemantauan langsung: titik panas, cluster api, cuaca, asap, riwayat, dan luas terbakar."},
      {sel: '#tabs [data-t="operasi"]', judul: "Operasi", isi: "Laporan operasi udara, armada, dan rencana lapangan."},
      {sel: '#tabs [data-t="dalops"]', judul: "Dalops", isi: "Pantauan kejadian dan penanganannya dari Pusdalops."},
      {sel: '#tabs [data-t="insight"]', judul: "Insight", isi: "Temuan penting dalam grafik dan tabel, termasuk daftar cluster api."},
      {sel: "#tabs .lainnya", judul: "Lainnya", isi: "Halaman lain: Berita, Tren, Dampak, Metode, Simulasi, Monitor, dan Laporan."},
      {sel: ".top .bhs", judul: "Bahasa", isi: "Ganti tampilan antara bahasa Indonesia dan Inggris."},
      {sel: "#upd", judul: "Tanggal dan jam data", isi: "Waktu data terakhir diperbarui. Tekan tombol ini untuk membuka lintasan satelit."},
      {sel: "#lintasPop", keadaan: "lintas", fokus: false, judul: "Lintasan satelit", isi: "Jadwal satelit yang melintas di atas Indonesia kemarin, hari ini, dan besok. Titik panas baru muncul sesudah satelit lewat.", peraga: "Kami membukanya untuk Anda. Tutup dengan tombol X."},
      {sel: '.top .stat a[href="/laporan"]', judul: "Laporan harian", isi: "Buka laporan harian yang disusun dari data sistem."},
      {sel: "#sapaBuka", judul: "Rincian situasi hari ini", isi: "Ringkasan situasi terkini: jumlah titik, cluster, dan wilayah yang menonjol, dalam satu jendela."},
      {sel: "#prioritasBuka", judul: "Prioritas provinsi", isi: "Daftar provinsi yang perlu perhatian lebih dulu beserta alasannya."},
      {sel: "#tema", judul: "Tema terang atau gelap", isi: "Ganti tampilan sesuai kenyamanan mata."},
      {sel: "#keluar", judul: "Keluar", isi: "Akhiri sesi masuk Anda."},
      {sel: "#panel .cari", judul: "Cari", isi: "Ketik nama provinsi, kabupaten, taman nasional, gunung, konsesi, atau nomor cluster seperti K001."},
      {sel: "#panelMode", judul: "Isi panel", isi: "Real Time untuk kondisi terkini, Riwayat untuk tahun-tahun sebelumnya, Cluster api untuk daftar kelompok titik yang dianggap satu kejadian."},
      {sel: "#rows", judul: "Daftar wilayah", isi: "Tiap baris satu wilayah: jumlah titik panas, firespot, cluster, dan status api. Urutannya dari yang paling genting."},
      {sel: "#panel", keadaan: "provinsi", judul: "Masuk ke satu wilayah", isi: "Tekan satu baris, panel turun ke kabupaten/kota di dalamnya dan peta memperbesar ke wilayah itu.", peraga: "Kami membuka provinsi teratas untuk Anda."},
      {sel: "#crumb", keadaan: "provinsi", judul: "Kembali ke atas", isi: "Jejak wilayah yang sedang dibuka. Tekan Indonesia atau tingkat di atasnya untuk kembali."},
      {sel: "#rows", keadaan: "cluster", judul: "Daftar cluster api", isi: "Pilihan Cluster api menampilkan kelompok titik per provinsi dan kabupaten, dengan status Rutin, Patroli, Awal, atau Prioritas.", peraga: "Kami memindahkan panel ke Cluster api."},
      {sel: "#laci", keadaan: "laci", judul: "Rincian cluster", isi: "Tekan satu cluster, panel rincian muncul di samping: luas, lama menyala, gambut, posko dan regu terdekat, tren, serta tindakan yang disarankan. Bisa dibagikan lewat tautan.", peraga: "Kami membuka cluster teratas. Tutup dengan tombol X di pojok panel."},
      {sel: "#rentangKartu", judul: "Tanggal data", isi: "Pilih hari yang ingin dilihat. Peta dan panel ikut berganti."},
      {sel: null, judul: "Peta", isi: "Geser dan perbesar peta dengan mouse atau jari. Tekan titik, cluster, atau wilayah di peta untuk membuka rinciannya, sama seperti dari daftar."},
      {sel: "#lapis", keadaan: "lapis", judul: "Lapisan peta", isi: "Daftar overlay: gambut, konsesi, kawasan hutan, angin, asap, citra satelit, dan lainnya. Centang untuk menyalakan."},
      {sel: "#legenda", judul: "Legenda", isi: "Arti warna dan simbol untuk lapisan yang sedang menyala."},
      {sel: "#turBuka", judul: "Putar ulang tur", isi: "Tur ini bisa dibuka lagi kapan saja dari tombol ini."},
    ],
  });
})();
