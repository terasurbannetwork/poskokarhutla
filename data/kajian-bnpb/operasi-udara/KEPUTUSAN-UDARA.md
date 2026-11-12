# KEPUTUSAN-UDARA: Pantauan Operasi Udara (layar `/operasi`, bagian Operasi Udara)

Dokumen ini menang atas semua dokumen lain di folder ini. Keputusan pemilik ditulis dengan tanggal dan kalimat aslinya.
Pertanyaan yang belum dijawab pemilik ditulis sebagai **Q**, dengan bawaan sementara bertanda **[SEMENTARA]**. Bawaan sementara
boleh dipakai untuk membangun, tetapi tidak boleh tampil di layar sebagai angka pasti: layar menandainya "perkiraan" sampai Q dijawab.

## Keputusan pemilik

| No | Tanggal | Keputusan | Kalimat pemilik |
| -- | ------- | --------- | --------------- |
| K1 | 11 Nov 2026 | Lingkup modul = delapan kelompok pantauan di PRD §3 (kesiapan, boleh terbang, kecocokan ancaman, pelaksanaan, hasil, renlap lawan realisasi, keselamatan dan perawatan, kontrak dan biaya). | "Gas" atas daftar rekomendasi |
| K2 | 11 Nov 2026 | PDF renlap yang sudah dibuat bot Mac mini wajib bisa diunduh dari layar, per base dan gabungan. | "Renlap pdf nya mana?" |
| K3 | 11 Nov 2026 | Tiap perubahan layar ditinjau pemilik di lokal (`http://localhost:8800/operasi`) sebelum menunggu terbit. | "ke depan project apapun lu akan kasih deploy local" |
| K4 | 11 Nov 2026 | Tanpa huruf kapital semua, tanpa latar sorot abu-abu, label berikon, kartu tidak menempel. | "gw ga pernah suka capslock", "Gw ga pernah mau ada highlight abu" |
| K5 | 11 Nov 2026 | Base dikelompokkan per pulau dan bisa dilipat; klik base = rincian armada; klik armada = pop-up histori. | "dicategorize yang bisa collapsible", "Ketika di klik ada histori semua kegiatan dia" |
| K6 | 11 Nov 2026 | Waypoint renlap tersedia dalam KML dan GPX. | "waypoint kml dan waypoint gpx" |
| K7 | 4 Nov 2026 | Menu Operasi = laporan, dua bagian berikon: Operasi Udara, Operasi Darat. Bagian "tanpa peta" ditimpa K8. | (AGENTS, kepala `public/operasi_laporan.js`) |
| K8 | 11 Nov 2026 | Operasi Udara punya kartu peta (pola peta Pantau Dalops): base dan jangkauan, cluster api, target renlap, aksi armada. | "Iniperlu ditambahin ga peta?", "petanyakaya gini. ataulu buat lebih bagus lagi" |
| K9 | 11 Nov 2026 | Pemilih periode seperti pangantara: Hari, Minggu, Bulan, Rentang, 12 Bulan. | "Period picker nya gini. Bisa pilih minggu bulan rentang dan 12 bulan" |
| K10 | 11 Nov 2026 | Bilah cari + ekspor Excel dan PDF seperti pangantara, di atas daftar. | "Ada fitur search dan exportnya gini" |
| K11 | 11 Nov 2026 | Layar dibagi seksi seperti pangantara: deret tab seksi di atas, Ringkasan lipat, kartu periode, bilah cari dan ekspor, tab status, lalu isi seksi. | "Kira kira bentuknya section dan pembagiannya seperti ini" |
| K12 | 12 Nov 2026 | Semua data operasi yang tampil di `/operasi` bisa juga diisi manual, di samping bot WA. Pengecualian tetap: angka satelit (hotspot, firespot, luas, belum padam), METAR, ADS-B, dan renlap mesin (PRD §6). | "Kalo misalnya dia bentuknya adalah inputan manual gitu bisa ga? ... Pastiin semua yang ada disini bisa ada masuk inputan" |
| K13 | 12 Nov 2026 | Rancangan isian manual ditulis dulu di paket ini, baru kode (AGENTS §3.7). | "buat" |
| K14 | 12 Nov 2026 | Q16: yang boleh mengisi data operasi manual hanya peran `pusdalops` (plus moderator ber-`ADMIN_TOKEN`); peran lain membaca saja. | "Bawaan: `pudalops`" |
| K15 | 12 Nov 2026 | Q17: bila bot WA dan isian manual mengisi butir yang sama, isian manual menang. | "Bawaan: manual menang" |
| K16 | 12 Nov 2026 | Q18: personel darat dicatat sebagai angka akumulasi per provinsi per unsur. | "Akumulasi" |
| K17 | 12 Nov 2026 | Q19: isian salah dihapus lunak dengan alasan wajib. | "Bawaan: hapus lunak dengan alasan" |
| K18 | 12 Nov 2026 | Q20: foto unggahan wajib berkoordinat, dan koordinat serta jamnya diambil dari data foto itu sendiri (EXIF), bukan diketik. | "Wajib. Nanti foto akan ambil datanya sendiri" |
| K19 | 12 Nov 2026 | Q21: kontrak diisi tanpa harga dan tarif. | "Bawaan: tanpa harga" |

## Prinsip yang mengikat semua tiket

1. **Tidak ada data dummy** (standar pemilik 11 Nov 2026). Angka yang belum ada sumbernya tampil "–" dengan keterangan sumbernya belum masuk.
2. **Kru tanpa nama.** Jam kerja kru dihitung per pesawat per hari; nama, NIK, dan nomor HP kru tidak pernah disimpan (`src/operasi_udara.js` kepala: "Nama kru tidak disimpan").
3. **Belum lapor bukan nol.** Status, jam, atau biaya yang belum dilaporkan tidak boleh dijumlah sebagai nol.
4. **Satu sumber per angka.** Angka antarsumber (sistem kita, BMKG, laporan operator) tidak dijumlah; ditampilkan berdampingan dengan label sumber.
5. **Klik tidak membekukan layar** (INP): chrome kontrol dicat dulu, isi berat menyusul.

## Pertanyaan terbuka untuk pemilik

| Q | Pertanyaan | Bawaan sementara |
| - | ---------- | ---------------- |
| Q1 | Batas waktu laporan gelar armada WA per base: jam berapa dianggap telat? Sama untuk semua base atau per zona waktu? | [SEMENTARA] 07.30 waktu setempat base (WIB/WITA), sekali per hari |
| Q2 | Apa yang dihitung "tidak siap berulang"? | [SEMENTARA] tidak siap ≥ 3 hari dalam 7 hari terakhir |
| Q3 | Sumber jam terbang dan jadwal inspeksi per pesawat (jam ke inspeksi 50/100 jam, dsb.): operator mengisi formulir, kirim lewat WA, atau ditarik dari dokumen kontrak? | [SEMENTARA] belum ada sumber; kartu tampil "belum ada data perawatan" |
| Q4 | Batas jam kerja kru per hari untuk penanda: ikut aturan mana (CASR 91/135 atau ketentuan kontrak BNPB)? | [SEMENTARA] 8 jam terbang per hari per pesawat sebagai penanda kuning, tanpa klaim aturan |
| Q5 | Laporan insiden dan nyaris celaka: lewat formulir di layar staf, WA grup satgas, atau tidak dicatat di sistem ini? Siapa boleh membaca? | [SEMENTARA] tidak dibangun sebelum Q5 dijawab |
| Q6 | Sumber NOTAM: AirNav Indonesia, FAA NOTAM API, atau ditempel manual oleh Pusdalops? | [SEMENTARA] tidak dibangun sebelum Q6 dijawab |
| Q7 | Harga kontrak per jam dan plafon jam per kontrak: boleh masuk sistem? Siapa boleh melihat angka biaya (pemilik saja, pimpinan, operator)? | [SEMENTARA] biaya tidak ditampilkan; sisa jam hanya bila plafon tersedia |
| Q8 | Liter per jatuhan: dihitung kapasitas bucket × jumlah jatuhan (anggap penuh) atau menunggu laporan operator? | [SEMENTARA] kapasitas × jatuhan, berlabel "perkiraan, anggap bucket penuh" |
| Q9 | Sumber titik air (dip site): pakai titik sumber air SIPPA, peta badan air satelit, atau daftar dari Posko? | [SEMENTARA] badan air terdekat dari data yang sudah ada di repo (lihat RISET §3), berlabel perkiraan |
| Q10 | Definisi waktu respons: dari titik panas pertama cluster terdeteksi satelit sampai aksi armada pertama ≤ 2 km dari cluster? | [SEMENTARA] ya, ≤ 2 km, hari yang sama atau sesudahnya, maksimal 72 jam |
| Q11 | Luas terbakar sebelum dan sesudah: dari luas cluster titik panas sistem kita, atau citra Sentinel-2 (dNBR)? | [SEMENTARA] luas cluster sistem kita; Sentinel-2 jadi tiket lanjutan |
| Q13 | Untuk periode lebih dari satu hari, kartu yang bersifat keadaan (status armada, kelayakan terbang, renlap) menampilkan hari terakhir periode atau rata-rata? | [SEMENTARA] hari terakhir periode, berlabel "per <tanggal>"; kartu kegiatan (sortie, aksi, padam, galeri, kepatuhan) dijumlah sepanjang periode |
| Q14 | Seksi apa saja di Operasi Udara, dan urutannya? | [SEMENTARA] Ringkasan, Base dan armada, Renlap, Aksi dan hasil, Operator dan kontrak, Dokumentasi; Operasi Darat tetap tab sendiri |
| Q15 | Ekspor berisi apa: hanya seksi yang sedang tampil (sesuai saringan dan periode), atau seluruh laporan? | [SEMENTARA] seksi yang sedang tampil, sesuai saringan dan periode |
| Q12 | PDF renlap: boleh dibaca semua staf berperan yang bisa membuka `/operasi`, atau hanya Pusdalops dan pimpinan? Dan renlap JSON/TXT yang sekarang publik di `public/data/operasi/`: tetap publik atau dipindah ke balik sesi? | [SEMENTARA] PDF sama dengan hak baca `/api/operasi/peta`; JSON/TXT tetap seperti sekarang sampai dijawab |

Q16 sampai Q21 dijawab pemilik 12 Nov 2026, lihat K14 sampai K19.
