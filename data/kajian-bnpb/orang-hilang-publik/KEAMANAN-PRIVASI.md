# KEAMANAN-PRIVASI: Orang hilang publik

Paket ini memproses data paling sensitif di Pantau Bencana: identitas, foto wajah, lokasi terakhir, dan data anak. Tinjauan hukum pemilik (K23) dan penilaian dampak pelindungan data (DPIA) diperlukan sebelum fitur foto menyala. Teks pasal di RISET bagian 4 berlabel [periksa].

## 1. Data apa, di mana, berapa lama

| Data | Di mana | Siapa melihat | Berapa lama |
| --- | --- | --- | --- |
| Isian orang dicari (nama, panggilan, ciri, tinggi, berat, pakaian, lokasi, hubungan, nomor pelapor, nomor dicari) | `lapor_cari` | petugas wilayah, BNPB | 730 hari sesudah ditutup lalu anonim (Q67) |
| Foto orang dicari (sampai 10) | R2 privat `lapor/foto/` | petugas | sama |
| Persetujuan tayang (versi, waktu, bidang, wali) | `oh_publik` | petugas | sama |
| Foto publik turunan | R2 `orang-hilang/publik/` | siapa saja saat profil `tayang` | dihapus saat `turun` (paling lama 1 jam) |
| Profil publik (bidang daftar putih) | dibentuk saat diminta, tidak disimpan terpisah | publik saat `tayang` | selama `tayang` |
| Laporan menemukan orang | `oh_temu`, `oh_temu_foto` | petugas | 730 hari sesudah ditutup lalu anonim |
| Foto penanya (cari lewat foto) | **tidak disimpan** | tidak ada | 0 (hanya di memori satu permintaan) |
| Catatan pencarian foto | `oh_cari_foto` | statistik petugas | 90 hari |
| Informasi dari warga | `oh_info` (nomor pemberi hanya petugas) | petugas | 180 hari sesudah selesai |
| Riwayat tinjau | `oh_riwayat` | petugas | append-only; catatan baku plus teks pendek tersaring, dianonimkan bersama laporan; hanya aksi tulis |

Tidak ada data orang di `public/`, di repo, di log, atau di pesan WA ke luar tim.

## 2. Klasifikasi

Data spesifik (UU PDP [periksa]): foto wajah, data anak, data kesehatan bila ada di ciri ("terluka", "sakit"). Diperlakukan dengan: persetujuan eksplisit, minimisasi, tinjauan manusia, hak akses petugas per wilayah, jejak aksi.

## 3. Hak akses

| Pelaku | Boleh | Tidak boleh |
| --- | --- | --- |
| Publik | Baca profil `tayang` (bidang daftar putih), foto publik, kirim informasi dengan sesi `/masuk` | Nomor, titik, rincian lokasi, hubungan, profil `menunggu` atau `turun`, foto asli |
| Pelapor (sesi `/masuk` terbukti atau gateway WA untuk cabut, perpanjang, baca; nomor ketikan hanya boleh membuat laporan obrolan) | Membuat, mencabut, memperpanjang, melihat laporannya sendiri | Melihat laporan orang lain; menghubungi pemberi informasi langsung |
| Petugas BPBD | Wilayahnya: tinjau, tayang, tolak, ganti foto, ubah kejadian, tutup | Wilayah lain (`dalamWilayah`), mengubah teks persetujuan, melihat foto penanya (tidak ada) |
| Petugas BNPB | Semua wilayah, cadangan bila BPBD tidak aktif (Q7) | Mengubah riwayat |
| Cron | Menurunkan, menghapus berkas, anonimkan | Menayangkan |
| Agent | Tidak ada akses data produksi | Menarik data orang dari D1 produksi |

## 4. Ancaman dan penjagaan

| Ancaman | Penjagaan |
| --- | --- |
| Kebocoran bidang lewat respons | Daftar putih di SQL dan di fungsi murni; uji tanda tangan kunci (ALGORITMA 2); `lp_publik` tidak punya hak baca kolom nomor |
| Enumerasi profil | Token acak 16 byte bukan id urut; 404 sama untuk tidak ada, turun, belum tayang; laju IP; tidak ada pencarian per nama atau nomor di publik |
| Pencarian foto dipakai menguntit | Sesi `/masuk`, laju Q12, hasil hanya profil publik, tanpa lokasi rinci, tanpa kontak, tembusan ke petugas, jawaban "tidak ada" tidak menyatakan apa-apa tentang orang itu |
| Penipuan atas nama keluarga | Tidak ada kontak publik; informasi lewat petugas; peringatan di kartu "Petugas tidak pernah meminta uang" (teks diperiksa pemilik) |
| Profil palsu | Tinjauan manusia (K113), batas 5 per nomor per hari, tombol laporkan, penanda kejadian dikonfirmasi petugas (D24) |
| Foto anak tersebar | Tidak tampil publik; bidang anak sempit; tidak masuk pembanding foto publik |
| Penolakan dikabari (orang yang sengaja pergi) | D19 dan Q15; petugas hanya menyampaikan selamat tanpa lokasi; panduan petugas |
| Injeksi lewat teks (ciri, ucapan, pesan informasi) | Teks dibersihkan (`teks()`), dilepas di layar lewat `textContent`, tidak pernah `innerHTML`; panjang dibatasi |
| Injeksi prompt lewat gambar atau teks ke model | Isi gambar dan teks adalah data, bukan instruksi; keluaran model dipaksa ke daftar tertutup; jawaban lain dibuang |
| Pengunggah foto berbahaya | Batas ukuran dan jenis, penanda tipe sebenarnya, tidak dieksekusi, tidak disimpan (cari foto) |
| Kebocoran lewat log dan galat | `samarkan`, uji: log tidak memuat nama, nomor, foto, badan model |
| Mesin pencari dan pratinjau media sosial | `noindex`, `x-robots-tag`, tanpa gambar OG berfoto, `referrer-policy: no-referrer` |
| Akses staf berlebih | Hak per wilayah, jejak aksi tulis di `oh_riwayat` (pembacaan panel privat tidak dicatat, D31, Q26), laju meja |
| Mencabut atau menayangkan ulang atas nama orang lain | Rute `saya/*` wajib sesi terbukti atau gateway WA; nomor ketikan 401 (D28) |
| Aplikasi dipakai di luar bencana (K116) | Penyaring dua lapis (D24); laporan non-bencana tidak disimpan sebagai profil (D26) |

## 5. Foto dan model pihak ketiga

Pembanding foto mengirim foto ke Claude API (Anthropic, luar negeri). Syarat sebelum `OH_FOTO` menyala (Q13): (1) tinjauan hukum transfer data lintas negara; (2) DPIA tertulis; (3) konfirmasi tertulis pemilik atas retensi dan penggunaan data oleh penyedia (agent tidak mengasumsikan); (4) uji tidak ada foto penanya atau foto kandidat tersimpan di sisi kita; (5) penanya diberi tahu di layar bahwa foto dikirim ke penyedia model untuk dibandingkan dan tidak disimpan oleh kita. Foto kandidat yang dikirim adalah foto publik yang sudah disetujui keluarganya, bukan foto privat.

Pembacaan ciri dari foto orang dicari (K105) yang **sudah berjalan** juga mengirim foto ke Claude API di luar negeri; tinjauan pengacara atas transfer itu menjadi butir wajib OH-12 (bukan hanya OH-15), dan pengungkapannya ada di teks persetujuan dan di langkah foto (D33).

## 6. Persetujuan, draf teks (Q18, tinjauan hukum wajib)

Draf: "Saya menyetujui bahwa nama, foto yang saya pilih, umur dalam rentang, dan kecamatan terakhir terlihat orang yang saya laporkan ditampilkan kepada publik di halaman Orang hilang setelah diperiksa petugas BNPB atau BPBD. Saya menyatakan saya kerabat atau wali orang ini dan berhak melaporkannya. Saya paham foto yang saya unggah dikirim ke penyedia model kecerdasan buatan di luar negeri untuk dibaca cirinya. Saya paham nomor telepon saya tidak ditampilkan, bahwa profil bisa dilihat dan dibagikan siapa saja selama tampil, dan bahwa saya bisa mencabut persetujuan kapan saja sehingga profil langsung turun. Saya paham bahwa layanan ini tidak menggantikan laporan ke kepolisian."

Dicatat: versi, waktu, bidang yang dipilih, id foto yang dipilih, status wali. Persetujuan hanya untuk data yang ia berikan dan hubungannya; orang yang dilaporkan tidak bisa menyetujui sendiri, sehingga dasar kepentingan vital dan kemanusiaan dinilai oleh pengacara (RISET 4). Anak: persetujuan wali (Q5).

## 7. Hak subjek data

| Hak | Cara |
| --- | --- |
| Cabut persetujuan | Tombol di Laporan saya, atau lewat petugas; profil turun seketika (K114) |
| Akses dan koreksi | Lewat petugas; pelapor melihat isi laporannya di Laporan saya (tanpa ciri rinci seperti sudah ada) |
| Penghapusan | Permintaan lewat petugas; profil dan foto publik langsung dihapus; data privat mengikuti masa simpan kecuali hukum meminta lain (Q6, K23) |
| Orang yang dilaporkan menghubungi petugas | Petugas mencatat, menurunkan profil bila diminta, dan tidak mengungkap lokasi atau kontak ke pelapor (D19) |

## 8. Larangan

Tidak menyimpan foto penanya. Tidak menyimpan atau menghitung vektor wajah. Tidak mencocokkan dari nama atau nomor di publik. Tidak menampilkan nomor, titik, hubungan, berat, foto anak, atau foto yang tidak dipilih. Tidak menayangkan tanpa tinjauan manusia dan tanpa kejadian bencana terkonfirmasi. Tidak menayangkan jenazah atau orang tak sadar. Tidak menulis "aman" atau "pasti". Tidak ada data orang di repo atau di `public/`. Tidak ada data dummy; uji membangun data uji sintetis di dalam uji. Foto uji pembanding hanya foto sintetis atau foto relawan yang setuju tertulis, tidak pernah foto laporan nyata.
