# Kajian sesar dari luar: sembilan sesar Jawa Barat (CEO Sesar Lembang)

Tanggal: 24 November 2026. Bahan: unggahan media sosial akun "CEO Sesar Lembang" (CSL) yang dikirim pemilik. Pasangan
catatan banjir dan longsor: `scripts/banjir/RISET-KAJIAN-LUAR.md`, `scripts/longsor/RISET-KAJIAN-LUAR.md`. Belum ada
kode atau layar yang berubah.

## 1. Isi unggahan

Jawa Barat disebut dilintasi sembilan sesar aktif yang saling terhubung: Walat, Pelabuhanratu, Baribis, Cimandiri,
Jatiluhur, Cipeles, Lembang, Jampang, Citanduy. Tabel ringkasnya:

- sesar naik (bidang landai di bawah 45°, gempa kuat, tsunami bila dekat pantai): Walat, Baribis, Jampang;
- sesar mendatar (bidang curam di atas 70°, kerusakan lateral): Pelabuhanratu, Jatiluhur, Citanduy;
- sesar normal (memicu longsor): Cipeles, Lembang.

Infografis per sesar menambah lokasi dan dampak. Contoh: Lembang sepanjang sekitar 29 km dari Padalarang ke
Jatinangor; Cimandiri dari Teluk Pelabuhanratu lewat Sukabumi dan Cianjur ke Bandung Barat; Baribis lewat Purwakarta,
Subang, Majalengka ke arah Jakarta.

## 2. Penilaian

- Gambarnya buatan AI dan memuat salah tulis yang menandakan itu: "Vantuuni" di peta Cimandiri, "Sesar Citemi
  Citanduy" di peta Walat, "Chek Sopetan Struktural" di Jatiluhur. Gambar tiga dimensi bukan peta; garis sesarnya
  tidak bisa dipakai sebagai geometri.
- Jenis sesar tidak konsisten antarlembar:
  - tabel menyebut Lembang sesar normal, lembar Lembang menyebutnya sesar mendatar dengan komponen vertikal;
  - tabel menyebut Jatiluhur sesar mendatar, lembar Jatiluhur menyebutnya naik atau oblik;
  - Cimandiri tidak masuk tabel, lembarnya menyebut naik atau oblik.
- Klaim "potensi tsunami lokal" untuk Walat tidak didukung: lembar yang sama menaruh Walat di perbukitan daratan.
- "Jika satu bergerak, tekanan bisa berpindah ke sesar lainnya" benar sebagai konsep (perpindahan tegangan Coulomb),
  tetapi unggahan tidak memberi angka atau rujukan untuk pasangan sesar mana pun.
- Tidak ada laju geser, magnitudo maksimum, atau periode ulang. Angka-angka itu ada di PuSGeN 2017, rujukan resmi.

## 3. Temuan di data kita

Lapisan sesar kita (`scripts/gempa/sesar.py`, GEM Global Active Faults, katalog EOS) di kotak 105,8–109,0 BT,
5,8–8,0 LS hanya memuat segmen tanpa nama, jenisnya "geser kanan", "naik", dan "subduksi". Tidak ada segmen
"geser kiri", padahal Lembang dan Cimandiri dalam literatur umumnya disebut sesar geser kiri. Artinya:

- nama sesar yang dikenal warga (Lembang, Cimandiri, Baribis) tidak bisa ditampilkan di layar gempa kita;
- kemungkinan sebagian sesar Jawa Barat tidak tercakup atau jenisnya berbeda di GEM.

Diperiksa 24 November 2026 di berkas GEM mentah (`gem_active_faults_harmonized.geojson`, semua katalog, bukan hanya yang
disaring `sesar.py`): di kotak yang sama hanya ada tiga segmen, semuanya katalog EOS_SE_Asia dan tanpa nama: satu geser
kanan, satu naik, satu subduksi. Jadi kekurangannya ada di sumber, bukan di saringan kita. Sebagian besar sesar
Jawa Barat (Lembang, Cimandiri, Baribis, dan seterusnya) tidak ada di GEM.

Pencarian sumber pengganti berlisensi terbuka tidak menemukan apa-apa. Catatan Geoscience Australia menyebut hanya
Sumatra yang dipetakan cukup rinci, sedangkan sesar aktif di Jawa dan Bali banyak yang belum dipetakan. Makalah
geologi Sesar Lembang (ANU) masih tertutup sampai 2037.

## 4. Untuk kita

1. Jangan memakai unggahan CSL sebagai sumber geometri, jenis, atau dampak sesar.
2. Sesar Jawa Barat tidak bisa dilengkapi dari sumber terbuka yang ada. Jalan keluarnya hanya salinan PuSGeN 2017
   berlisensi, yang perlu diminta resmi ke PuSGeN atau Kementerian PUPR. Keputusan pemilik tetap: PuSGeN dipakai begitu
   salinan berlisensi ada (`sesar.py`). Sampai itu ada, nama dan garis sesar tidak diketik dari infografis atau digambar
   ulang dari gambar makalah.
3. Sampai lapisan lengkap, layar gempa sebaiknya tidak memberi kesan bahwa Jawa Barat "tidak punya sesar". Itu
   keputusan tampilan di modul `gempa`, belum dikerjakan.
4. Kalimat edukasi yang benar dari unggahan ini (jenis sesar, kenali sesar di sekitar rumah, bangun tahan gempa)
   sudah umum; tidak ada angka baru yang perlu masuk layar.
