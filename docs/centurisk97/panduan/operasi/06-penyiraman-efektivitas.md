# Hasil penyiraman dan efektivitas

Halaman ini menjelaskan cara hasil penyiraman air dan efektivitas operasi diukur dari data satelit.

## Hasil penyiraman air dari satelit

Data: titik panas dari satelit, yang masuk kira-kira tiap 3 jam.

1. Setiap putaran data baru dicocokkan dengan aksi penyiraman berkoordinat dalam 48 jam terakhir yang belum punya hasil.
2. Dihitung titik panas yang jaraknya 1 km atau kurang dari lokasi aksi, dalam 24 jam sesudah aksi.
3. Bila ada titik panas dekat, hasilnya "masih api". Bila 24 jam sudah lewat dan tidak ada titik panas dekat, hasilnya "padam". Bila belum 24 jam dan belum ada titik, hasilnya "menunggu".
4. Patroli, modifikasi cuaca, atau aksi tanpa koordinat atau jam tidak dinilai.

Contoh: penyiraman pukul 10.00 di sebuah lokasi. Sampai pukul 10.00 hari berikutnya tidak ada titik panas dalam 1 km, jadi hasilnya "padam". "Padam" di sini hanya berarti satelit tidak mendeteksi api, bukan konfirmasi dari lapangan. Koordinat yang kosong dilengkapi otomatis dari foto grup atau laporan pilot hari itu bila cocok.

Kepercayaan: ini aturan sederhana pencocokan jarak dan waktu, bukan prediksi. Titik panas dekat waktu nyata bisa terlambat masuk hingga sekitar 3 jam, sehingga hasil bisa berubah.

## Ukuran efektivitas operasi

Dihitung untuk tujuh hari terakhir. Bila kejadian yang dihitung kurang dari 5, nilainya tidak ditampilkan dan diberi catatan "data kurang".

- **Ketepatan target:** temuan pilot yang bukan "bersih" dibagi semua temuan. Makin tinggi makin baik.
- **Kepatuhan renlap:** target renlap yang punya temuan dalam 1 km pada hari yang sama dibagi semua target. Makin tinggi makin baik.
- **Temuan di luar renlap:** temuan yang tidak dekat target mana pun dibagi temuan pada hari yang punya renlap. Makin rendah makin baik.
- **Padam bertahan:** laporan "bersih" yang tidak diikuti titik panas dalam 1 km selama 48 jam dibagi laporan bersih yang bisa dinilai. Makin tinggi makin baik.
- **Utilisasi armada:** pesawat-hari siap yang punya penerbangan dibagi semua pesawat-hari siap. Satu pesawat-hari berarti satu pesawat pada satu hari; 3 pesawat siap selama 2 hari berarti 6 pesawat-hari. Makin tinggi makin baik.
- **Waktu respons:** nilai tengah (angka di tengah bila semua waktu diurutkan) dalam menit dari temuan berasap sampai penyiraman pertama dalam 24 jam yang menuju lokasi itu (1 km atau kurang). Makin rendah makin baik.
- **Siaga tanpa tugas:** armada-hari siaga atau siap tanpa penerbangan pada hari ada temuan berasap dalam 120 mil laut dari pangkalan, dibagi semua armada-hari siaga atau siap. Makin rendah makin baik.

Ada empat ukuran lain yang belum punya sumber data, sehingga tampil "Belum ada data"; namanya belum terdokumentasi di kode. Ini ukuran kinerja, bukan prediksi, jadi uji balik tidak berlaku.

Contoh ketepatan target: dari 10 temuan pilot, 8 bukan "bersih", hasilnya 8 dibagi 10, yaitu 80 persen. Contoh utilisasi armada: 20 pesawat-hari siap dan 5 di antaranya terbang, hasilnya 25 persen.
