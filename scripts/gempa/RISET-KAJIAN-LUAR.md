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

## 4. Untuk kita

1. Jangan memakai unggahan CSL sebagai sumber geometri, jenis, atau dampak sesar.
2. Yang layak dikerjakan: cocokkan lapisan GEM dengan daftar sesar PuSGeN 2017 untuk Jawa Barat, lalu catat segmen
   yang hilang atau jenisnya berbeda. Keputusan pemilik tetap: PuSGeN dipakai begitu ada salinan berlisensi
   (`sesar.py`); sampai itu ada, nama sesar hanya boleh ditambahkan dari sumber berlisensi, bukan diketik dari
   infografis.
3. Kalimat edukasi yang benar dari unggahan ini (jenis sesar, kenali sesar di sekitar rumah, bangun tahan gempa)
   sudah umum; tidak ada angka baru yang perlu masuk layar.
