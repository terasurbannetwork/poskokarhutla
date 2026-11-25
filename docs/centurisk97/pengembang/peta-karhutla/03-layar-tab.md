# Dashboard, Insight, Tren, Dampak

Halaman ini menguraikan Prioritas provinsi di layar dan tab Dashboard, Insight, Tren, Dampak, serta tab lain di peta.

## Prioritas provinsi

Ikon "Prioritas provinsi" di kepala halaman membuka dialog daftar provinsi dengan status Prioritas, Bertahan, atau Di luar daftar, beserta rata-rata tiga hari dan batang tujuh hari (`public/prioritas.js`). Data diambil malas saat ikon diklik dari `data/harian_panjang.json`. Aturan masuk dan keluar ada di Metode.

## Dashboard (Ringkasan)

Tab Dashboard (`public/ringkasan.js`) ditujukan bagi pimpinan, tetapi tombolnya disembunyikan dari menu atas akun staf dan instansi (lihat [Ikhtisar peta karhutla](/docs/pengembang/peta-karhutla/ikhtisar)); halamannya tetap bisa dibuka lewat tautan langsung atau lewat akun pemirsa yang diberi tab itu. Angkanya dihitung dari berkas data yang sama dengan tab lain; aturan tingkat dan kartu keputusan dikutip di dialog "Aturan" di halaman. Kartu "Titik panas 24 jam" menampilkan tiga angka setara: hitungan kita, setara SiPongi, dan hanya keyakinan tinggi, di samping angka resmi SiPongi bila ada (`public/pembanding.js:99` sampai `110`, berkas `data/titik_setara.json`).

## Insight

Tab Insight menampilkan kartu standar `.ex.ex-std`. Daftar dasarnya `Insight.EX` di `public/index.html:4073`: Peluang, Tren harian, Kumulatif, Riwayat nasional, Logbook, Musim, Cuaca, dan Kesehatan (paparan asap). Kartu bnpb, penanganan, dan aktorPsn sengaja disembunyikan pemilik (`public/index.html:4072`, `public/aktor.js:54`). Skrip lain menyisipkan kartu ke daftar itu saat dimuat: Asia Tenggara, Petak api, Prospek musim, Pembanding luas, Kelas FRP, dan Tanah gambut (`public/pembanding.js:138`); Citra satelit (`public/citra.js:92`); BMKG hari ini (`public/karhutla_bmkg.js:72` sampai `74`); Konsesi dan tata kawasan, Deteksi malam, dan Sinyal publik (`public/karhutla_data.js:83` dan `99`); Perusahaan, Modal asing, dan Grup usaha (`public/aktor.js:51` sampai `54`); serta Cerita data (`public/cerita_karhutla.js:423` sampai `425`). Tabel kecamatan yang terbakar hampir setiap tahun mendapat kolom Pencegahan utama dan saring per jenis tindakan dari `public/preventif.js`. Alert pembukaan tajuk dan kartu per kabupaten ada di `public/tebang.js`. Di bawah kartu ada tabel prioritas dan tabel cluster. Pilihan provinsi di kartu mengikuti sembilan provinsi prioritas (`PRIO` di `public/index.html:3729`: kode 14, 15, 16, 61, 62, 63, 64, 53, 93). Tiap kartu berkepala nama seksi tanpa kalimat kesimpulan (AGENTS.md bagian 3.5).

## Tren

Tab Tren (`Tren`, `public/index.html:3820`; rumus skor di `skorRiwayat`, `public/index.html:3732` sampai `3744`) memuat riwayat panjang: luas terbakar per tahun, luas, riwayat nasional, perbandingan dunia, peringkat risiko historis kecamatan atau kabupaten/kota (50 baris per halaman, pilihan provinsi bisa lebih dari satu), dan kalender "Periode berbahaya tiap tahun" berupa peluang tiap 10 hari menjadi periode api besar, dipisah tahun El Nino dan tahun biasa. Kotak bergaris menandai dasarian hari ini.

## Dampak

Tab Dampak berisi sepuluh bagian dampak kebakaran musim berjalan (`public/dampak.js`): Kualitas udara, Penerbangan, Kesehatan, Pendidikan, Permukiman, Hutan dan gambut, Emisi karbon, Ekonomi lahan, Lintas batas, dan Total kerugian. Angka berat dihitung harian oleh `scripts/data/dampak.py` dan `scripts/data/penerbangan.py`; berkas JS hanya menggambar. Kelas kualitas udara memakai ambang ISPU PM2.5 15,5; 55,4; 150,4; dan 250,4 µg/m3 (`public/dampak.js:7`).

## Tab lain di peta

Posko (daftar posko, sarana, operasi, dan keputusan lewat sub-pilihan), Simulasi (penjalaran api 24, 48, dan 72 jam), Berita, Foto, Informasi (laporan warga), Laporan (pintu ke tiga generator laporan), dan Metode (rumus dan ambang dikutip dari kode). Tab ini punya dokumen sendiri atau tidak dibahas di sini.
