# Draf surat permintaan akses data karhutla

Draf untuk dikirim lewat jalur resmi BNPB (keputusan pemilik 22 Okt 2026, butir 4 rancangan api padam).
Nomor surat, tanggal, penandatangan, dan alamat tujuan diisi Sekretariat. Tiga surat, isi intinya sama;
yang berbeda hanya data yang diminta.

---

Nomor   : ....../BNPB/....../2026
Sifat   : Segera
Lampiran: 1 (satu) berkas spesifikasi data
Perihal : Permohonan akses data untuk percepatan pemadaman kebakaran hutan dan lahan

Yth. [Pimpinan instansi tujuan]
di tempat

Dalam rangka percepatan penanganan darurat kebakaran hutan dan lahan, BNPB mengembangkan sistem
pemantauan operasional yang menyatukan titik panas satelit, laporan lapangan, dan penugasan regu
pemadam per kabupaten. Sistem ini dipakai Pusdalops BNPB dan BPBD untuk menentukan lokasi, ukuran,
dan kebutuhan sumber daya tiap kejadian api.

Agar perkiraan kebutuhan pemadaman dan prioritas pembasahan gambut lebih tepat, kami memohon akses
data berikut:

[Pilih satu blok sesuai tujuan]

**A. Badan Restorasi Gambut dan Mangrove (BRGM)**
1. Tinggi muka air tanah gambut (TMAT) dari stasiun pemantau (SiPALAGA), per stasiun per jam:
   koordinat, waktu, TMAT (cm), kelembapan tanah, curah hujan.
2. Lokasi dan status sekat kanal serta sumur bor yang sudah dibangun.

**B. Kementerian Kehutanan (SiPongi)**
1. Luas indikatif kebakaran per provinsi dan kabupaten (rekapitulasi bulanan dan, bila ada, mingguan).
2. Poligon areal terbakar hasil verifikasi.

**C. Kementerian Kehutanan, Direktorat Pengendalian Kebakaran Hutan (Manggala Agni)**
1. Lokasi markas Daerah Operasi (Daops) dan pos jaga.
2. Status kesiapan regu harian (jumlah regu siaga, sedang bertugas, lokasi penugasan).

Bentuk akses yang kami harapkan, berurutan dari yang paling membantu: (1) API atau tautan data
yang diperbarui otomatis, (2) berkas CSV/GeoJSON berkala, (3) salinan sekali untuk kalibrasi.

Data dipakai hanya untuk keperluan operasional penanganan darurat dan analisis internal. Data
pribadi tidak diminta. Sumber data akan disebut pada setiap tampilan, dan data mentah tidak
diterbitkan ulang tanpa persetujuan instansi pemilik.

Narahubung teknis: [nama, jabatan, email, telepon].

Atas perhatian dan kerja samanya kami ucapkan terima kasih.

[Jabatan penandatangan]
[Nama]

Tembusan:
1. Kepala BNPB
2. Deputi Bidang Penanganan Darurat BNPB

---

## Lampiran: spesifikasi teknis singkat

| Data | Kolom minimum | Frekuensi | Dipakai untuk |
|---|---|---|---|
| TMAT | id_stasiun, lat, lon, waktu, tmat_cm | per jam atau harian | kebasahan gambut, risiko bara (butir 3.4) |
| Sekat kanal | lat, lon, status, tahun | sekali, lalu perubahan | sumber air dan pembasahan (3.2) |
| Luas SiPongi | prov, kab, periode, luas_ha | bulanan | faktor koreksi luas (1.4) |
| Poligon terbakar | geometri, tanggal | per kejadian | uji balik luas, kalibrasi (4.2) |
| Daops dan regu | id_daops, lat, lon, regu_siaga, regu_bertugas, waktu | harian | usulan penugasan, Meja Pantau |

Sistem sudah punya pengimpor CSV untuk TMAT dan status regu Daops (operasi lapangan L13), jadi berkas
CSV bisa langsung dipakai tanpa menunggu integrasi API.
