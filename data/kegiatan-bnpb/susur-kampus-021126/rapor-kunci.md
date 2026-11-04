# Rapor pemeriksa: Jadwal Susur Kampus Kunci 021126 (27 halaman)

Pemeriksa berkonteks bersih, 2 Nov 2026. Yang dibaca: PDF lewat render h01–h27, `kunci_model.py` (dijalankan), `susur_model.py`, CSV `data/kunci`, serta riset-kampus/biaya/jarak.json.

| Dimensi | Nilai | Bukti |
|---|---|---|
| Judul | 3 | Judul h03–h19 berupa kalimat aksi berangka dan alurnya runtut, tetapi ada judul yang tidak terbukti oleh isinya. h03: "4 hari tanpa kunjungan untuk istirahat dan rekap", padahal 3 dari 4 hari itu hari perjalanan jauh. h08: "paling banyak 2 kampus per hari", tetapi syarat "hanya bila sekota" dilanggar itinerary h12–h15. h10: "12 dari 14 kali tiga slot" sulit dibaca (maksudnya 12 dari 42 slot). h17 hanya deskriptif dan melewatkan temuan bahwa skenario 10 hari termurah per kampus. h18 menyebut "risiko terbesar" tanpa peringkat risiko. |
| Grafik | 4 | Batang bertumpuk h10 (21/30/42 slot) dan h17 (49,6/76,2/96,8) proporsional dan cocok dengan model. Gantt h09 dan matriks cakupan h06 bersih. Cacatnya di peta h05: legenda berlabel "2, 1, 1", dua lingkaran acuan berbeda ukuran sama-sama berlabel 1. Lingkaran Jatinangor juga tertelan lingkaran Bandung, dan lingkaran Jakarta tumpang tindih dengan Depok. |
| Tata letak | 4 | Templat konsisten dan panel rapi. Pita kaki, chip status h19, dan chevron h18 sudah benar. Tabel 10 baris h13 kecil tetapi masih terbaca. Halaman lampiran h21 kosong sebagian dan bertipo "A, Rincian pendukung". Tidak ada luapan teks. |
| Sumber dan angka | 3 | Semua angka cocok dengan model setelah dihitung ulang: pagu 49,64/76,16/96,80 juta, riil 45,7/70,2/88,8 juta, malam 6/8/11, hari tanpa kunjungan 3/4/6, slot K-J-P-I-S 6-4-3-4-4, 10-3-6-5-6, dan 12-5-8-9-8, serta komponen h17 dan A3. Tetapi klaim "3 PTS yang masuk QS 2027" (h03, h05) bertentangan dengan riset-kampus.json: QS 2027 memuat 4 PTS, Trisakti di pita 1401+. h22 malah menulis Usakti "di luar 1400 besar". Pita sumber h06 memakai sumber biaya untuk tabel cakupan. Tarif KA Semarang ke Surabaya masih "asumsi; belum ditemukan" (h27). Transfer stasiun di kota tujuan tidak dihitung. |
| Alur | 3 | Urutan bagian logis: kampus, ritme, skenario, biaya, keputusan. Tetapi tidak ada slide yang menimbang mengapa 10 hari lebih baik dari 7 atau 14 hari. Skenario 10 hari diam-diam membuang Undip (PTN tier satu), dan panel h06 tidak menyebutnya. Aturan h08 dibantah oleh itinerary h12–h15. Pemesanan tiket di h18 (Biro Hukum, pekan ini) bertentangan dengan h19 (Biro Umum dan Keuangan, paling lambat 9 Nov). |
| Rasa mahal | 3 | Tampilannya setara deck siap paparan (h05, h09, h17, h19), tetapi isinya masih perlu disunting sebelum sampai ke Kepala BNPB. Kontradiksi aturan dengan jadwal (h03, h08 lawan h12–h15), klaim QS PTS (h03, h05, h22), dan "hari bebas" (h08, h10) akan langsung ketahuan pembaca yang teliti. |

## Pemeriksaan yang lulus

- **Tanggal.** 16 Nov 2026 jatuh pada Senin (diperiksa dengan Python). Label hari h12–h15, h24, dan h25 cocok semua sampai Min 29 Nov.
- **Akhir pekan.** Tidak ada kampus pada Sabtu atau Minggu di ketiga skenario (21, 22, 28, 29 Nov). November 2026 juga tanpa libur nasional maupun cuti bersama (riset-jarak, SKB 3 Menteri).
- **Waktu tempuh cocok dengan riset-jarak.json:**
  - Whoosh Halim 07.25 adalah keberangkatan pertama, 45–47 menit, jadi ITB 10.00 masuk akal.
  - Argo Wilis Bandung 07.45 tiba 13.34 (tetapi sumbernya agregator, dan jadwal Daop 5 berubah sejak 1 Mei 2026).
  - KA Muria berangkat Tawang 07.00, sekitar 5,3 jam.
  - Sancaka Yogyakarta ke Surabaya sekitar 4 jam.
  - Tol Surabaya ke Malang 1,5–2 jam, jadi UB 10.00 masuk akal.
  - Yogyakarta ke Semarang lewat Solo sekitar 3–3,5 jam, jadi Undip 13.30 longgar.
- **Biaya.** Hotel, uang harian, sewa, tol, dan tiket per skenario cocok sampai ribuan rupiah dengan A3 (h26) dan h17. Contoh 14 hari: penginapan 33,186, uang harian 16,14, sewa 11,156 juta.

## Temuan yang perlu dibetulkan

1. **Aturan "kampus kedua hanya bila sekota" (h08, h10) dilanggar jadwal sendiri, dan h03 salah menulis "umumnya satu".**
   - Pelanggarannya: Sel 17 Nov tujuh hari (ITB Bandung + Unpad Jatinangor), Sen 16 Nov sepuluh hari (UI Depok + IPB Bogor), Sel 17 Nov empat belas hari (IPB Bogor + Binus Jakarta), dan Kam 19 Nov empat belas hari (Unpad Jatinangor + Telkom U).
   - Hari dengan dua kampus ternyata dominan: 4 dari 6 hari kampus pada skenario 10 hari, 2 dari 4 pada 7 hari, 4 dari 8 pada 14 hari.
   - Bunyi "Pagi untuk kampus; sore dipakai rekap" (h03) juga dibantah oleh kunjungan pukul 14.00–14.30 pada hari-hari itu.
   - Perbaikan: ganti aturannya menjadi "kampus kedua bila jarak tempuh di bawah 1,5 jam dan selesai sebelum 16.00", lalu ganti "umumnya satu" dengan angka sebenarnya.
2. **"4 hari tanpa kunjungan untuk istirahat dan rekap" (judul h03) dan "4 hari bebas dalam sepuluh hari" (h08) melebih-lebihkan.**
   - Dari empat hari itu, tiga adalah hari perjalanan jauh: 19 Nov KA hampir 6 jam, 22 Nov KA 4 jam, 25 Nov tol plus pesawat.
   - Sabtu 21 Nov pun diisi Merapi dan rekap.
   - Slot istirahat murni hanya 5 dari 30 (h10).
   - Panel h10 juga berjudul "Hari Kampus dan Hari Bebas".
   - Perbaikan: sebut "4 hari tanpa kunjungan (3 hari perjalanan, 1 hari susur dan rekap)", atau tambah satu hari istirahat sungguhan.
3. **Skenario 10 hari yang direkomendasikan membuang Undip, padahal Undip PTN tier satu (QS 2027: 662), sementara dua PTS (Telkom U, UMY) tetap masuk.**
   - Ini berlawanan dengan arahan pemilik "utamakan PTN".
   - Panel h06 menulis skenario 10 hari "menambah IPB dan Telkom University, juga tiga kampus Jawa Timur" tanpa menyebut Undip hilang. Cakupannya tidak bertingkat: Undip ada di 7 hari, hilang di 10 hari, kembali di 14 hari.
   - Perbaikan, pilih salah satu:
     - tukar Telkom U dengan Undip lewat rute Yogyakarta, Semarang, Surabaya seperti skenario 14 hari;
     - nyatakan pertukaran ini terang-terangan beserta alasannya.
4. **Tidak ada slide yang membuktikan mengapa sepuluh hari dipilih (h17 ke h19 langsung meloncat ke keputusan).**
   - Model sebenarnya memberi argumennya: pagu per kampus 7,62 juta (10 hari), lebih murah dari 8,27 juta (7 hari) dan 8,07 juta (14 hari).
   - Biaya marjinal juga berbeda: dari 7 ke 10 hari +26,5 juta untuk +4 kampus bersih (sekitar 6,6 juta per kampus), dari 10 ke 14 hari +20,6 juta untuk +2 kampus (sekitar 10,3 juta per kampus).
   - Perbaikan: jadikan ini judul h17, atau buat satu slide perbandingan opsi.
5. **Klaim "3 PTS yang masuk QS 2027" (h03, h05) bertentangan dengan sumber sendiri.**
   - riset-kampus.json mencatat 4 PTS di QS 2027 (Binus, Telkom U, UMY, Trisakti), dengan Trisakti di pita 1401+.
   - h22 malah menulis Usakti "di luar 1400 besar". Hal yang sama berlaku untuk UPI dan UNY yang juga 1401+.
   - Perbaikan: ganti kriterianya menjadi "3 PTS di 1400 besar QS 2027", atau masukkan Trisakti. Angka QS juga masih dikutip dari media, belum dari topuniversities.com.
6. **h18 dan h19 bertentangan soal pemesanan tiket.**
   - h18 menaruh "Pesan tiket" di kolom "Pekan ini" dengan penanggung jawab Biro Hukum.
   - h19 menaruh pemesanan pada Biro Umum dan Keuangan, paling lambat 9 Nov (pekan depan).
   - Perbaikan: samakan penanggung jawab dan tenggatnya.
7. **Peta h05 perlu dibetulkan.**
   - Legenda "2, 1, 1" memberi label sama pada dua lingkaran acuan yang ukurannya berbeda. Pakai 2 dan 1 saja, atau beri label yang benar.
   - Lingkaran Jatinangor tertelan lingkaran Bandung, dan lingkaran Jakarta tumpang tindih dengan Depok.
8. **Judul h10 "12 dari 14 kali tiga slot" kaku.** Ganti menjadi "12 dari 42 slot". Judul h18 "risiko terbesar" juga perlu dasar, misalnya peluang × dampak, atau cukup tulis "risiko utama".
9. **Biaya transfer stasiun dan bandara di kota tujuan tidak dihitung.**
   - Model hanya memakai TRANSFER_DKI.
   - Hari pindah kota tanpa sewa mobil tidak menanggung transfer, misalnya skenario 10 hari pada 19 Nov (Bandung dan Yogyakarta) dan 22 Nov (Yogyakarta dan Surabaya).
   - Untuk skenario 10 hari, nilainya sekitar 2,8 juta menurut SBM Lampiran II No. 16 (Jabar 180 ribu, DIY 258 ribu, Jatim 225 ribu per orang per kali).
   - Jumlahnya masih tertutup kontinjensi 10%, tetapi perlu ditulis sebagai pos atau asumsi.
10. **Data perjalanan yang belum mantap.**
    - Pada skenario 14 hari, KA Semarang ke Surabaya (25 Nov) tanpa nama dan jam kereta, dan tarifnya masih asumsi (h27).
    - Sancaka ditulis berangkat "siang" (skenario 10 hari, 22 Nov), padahal riset hanya menyebut keberangkatan pagi dan sore.
    - Jadwal Argo Wilis 07.45 berasal dari agregator. Cek ulang di Access by KAI sebelum mencetak.
11. **Ketelitian kecil.**
    - h06: tujuh hari ditulis "Jakarta, ...", padahal UI ada di Depok. Pita sumber h06 juga sumber biaya, bukan QS atau laman kampus.
    - h14: "6 kampus di Jakarta dan Bandung" mencakup Depok, Bogor, dan Jatinangor. Tulis "Jabodetabek dan Bandung Raya".
    - h21: tipo "A, Rincian pendukung".
    - Skenario 7 hari, Jum 20 Nov: berangkat 06.30 untuk Undip 13.30 menyisakan sekitar 3 jam lebih. Bisa berangkat sekitar 08.30, sejalan dengan semangat "tim tetap segar", tetap dengan jeda Jumatan.
