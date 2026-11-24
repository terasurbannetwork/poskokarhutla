Tugas: merapikan bahan WhatsApp yang gagal dibaca generator laporan.

Generator membaca teks WA dengan pola tetap (penomoran kejadian "1. ", label seperti "Lokasi:", "Dampak:", kepala provinsi, nama "Kab." atau "Kota"). Staf sering mengetik dengan format yang meleset: spasi sebelum titik ("1 .Bencana"), penomoran ganda atau terlewat, label salah tulis, kejadian yang tergabung dalam satu nomor, kepala jumlah kejadian yang tidak sama dengan jumlah kejadian yang tertulis, karakter tak terlihat, atau bintang tebal di tempat yang salah.

Yang kamu terima: pesan galat generator dan teks mentah tiap bahan (`kunci` = jenis bahan).

Yang kamu kerjakan:

1. Baca pesan galat untuk tahu bagian mana yang gagal.
2. Betulkan BENTUK teks supaya mengikuti pola format bahan itu yang paling umum di teks yang sama: penomoran, spasi, label, pemisah kejadian, kepala provinsi.
3. Bila kepala menyebut jumlah kejadian yang tidak sama dengan jumlah kejadian yang benar-benar tertulis, sesuaikan angka di kepala itu dengan jumlah kejadian yang tertulis. Jangan membuang atau mengarang kejadian.
4. Jangan mengubah isi: nama tempat, angka korban, dampak, waktu, dan keterangan tetap persis. Jangan menambah angka yang tidak ada di teks mentah, kecuali nomor urut kejadian dan jumlah kejadian di kepala.
5. Kembalikan hanya bahan yang kamu ubah, masing-masing dengan teks lengkapnya (bukan potongan). Tulis tiap perubahan sebagai satu kalimat pendek di `perubahan`, misalnya "Penomoran kejadian 3 sampai 7 diseragamkan".
6. Pengirim kadang mengganti kalimat pembuka laporan padahal isinya sama. Bila galat menyebut kepala atau jumlah kejadian tidak ditemukan, tulis ulang kalimat kepala ke bentuk baku di bawah dengan MEMINDAHKAN angka yang sudah ada di kepala itu (jangan menggandakan atau menambah angka; angka yang tidak ada dibiarkan tidak ada).
   - Rekap Koordalops (`rekap_koordalops_24`, `rekap_koordalops_12`): `... tanggal DD/MM/YYYY pkl HH.MM WIB s.d DD/MM/YYYY pkl HH.MM WIB adalah sejumlah N kejadian.` lalu kepala provinsi `*A. Prov. Nama*`, kejadian `1. Bencana Alam <Jenis> di Kab./Kota <Nama> *(Kejadian Baru)*` atau `*(Pengkinian Data)*`, dan butir `* Dampak:`, `* Pengungsi:`, `* Kerusakan:`, `* Penetapan Status:`, `* Kondisi Mutakhir:`.
7. Bila galat tidak bisa diperbaiki dengan merapikan bentuk (misalnya bahan memang kosong), kembalikan `bahan` kosong dan jelaskan sebabnya di `perubahan`.
