# RENCANA-UJI: Lapor Bencana BNPB

Semua uji jalan tanpa jaringan dan tanpa kunci API kecuali disebut. Perintah bukti di akhir tiap baris.

## 1. Uji mesin murni (`tests/lapor/mesin.test.mjs`)

| Kriteria | Bukti |
| --- | --- |
| Identitas: nomor baru ditanya peran, nama, (BPBD) kab dan jabatan; cerita pertama tertunda dan dipakai sesudahnya | `node --test tests/lapor` |
| Pilihan BPBD sendiri = `bpbd_klaim`; `bpbd` hanya dari `lapor_izin` | idem |
| Angka tanpa kutipan di pesan dibuang; "dua belas" dikenali 12 | idem |
| Kosong tidak pernah jadi 0; "tidak ada" = nihil satu kelompok; dua kali tak dijawab = belum didata | idem |
| Urutan isian: wajib awal dulu, lalu kelompok menurut spek; isian sistem tidak pernah ditanya | idem |
| `kirim` sebelum wajib lengkap ditolak dengan daftar kurang | idem |
| Transisi tiket: semua pasangan di A8 sah, lainnya ditolak | idem |
| Keluaran model palsu yang menyebut isian tak dikenal, angka di luar rentang, atau pertanyaan berangka karangan ditolak | idem |

## 2. Uji percakapan emas (`tests/lapor/emas/*.json`)

Paling sedikit 12 skenario dari kalimat laporan nyata di laphar (`04-landasan-formulir/isian.json`, contoh tulisan saja), satu per jenis di `src/lapor_spek.js` (10 jenis) ditambah subjenis banjir bandang dan banjir rob ditambah pelapor yang menjawab "belum tahu" terus dan pelapor yang mengoreksi angka. Tiap skenario memuat pesan berurutan, keluaran model rekaman (tanpa jaringan), dan isian akhir yang diharapkan. Bukti: `node --test tests/lapor`.

Satu set yang sama dijalankan dengan model sungguhan sebelum F0 dibuka (`LAPOR_UJI_NYATA=1`, butuh kunci): isian akhir cocok paling sedikit 95 persen isian, nol angka karangan.

## 3. Uji rute dengan D1 lokal (`tests/lapor/rute.test.mjs`, pola `tests/warga`)

| Kriteria | Bukti |
| --- | --- |
| Migrasi 0155 idempoten (jalan dua kali) | `npm run uji:warga` |
| Pesan dari nomor tanpa izin pada F0 ditolak; sesi orang lain 404 | idem |
| Kirim laporan menulis versi, nomor, tiket, riwayat, antrean PDF dalam satu batch | idem |
| Foto WA tanpa lokasi = lencana `tanpa`; dengan lokasi WA 20 menit sebelumnya = `wa`; Dokumen dengan EXIF 6 km jauhnya = tolak | idem |
| Rute foto lama `src/foto.js` tetap lulus uji lamanya sesudah `periksaFotoLokasi` dipisah | idem |
| Monitoring tanpa sesi staf 403, jawaban `private, no-store` | idem |
| Batas laju per nomor bekerja | idem |

## 4. Uji lapangan F0 (pengguna uji pertama)

Dicatat per laporan di monitoring; ditinjau pemilik sesudah 2 minggu atau 10 laporan:

- waktu dari pesan pertama sampai terkirim (target median 5 menit);
- jumlah balasan pelapor sampai terkirim (target paling banyak 8 untuk laporan awal);
- persen lengkap saat terkirim;
- isian yang dikoreksi pemilik sesudah dibaca (target nol angka karangan);
- foto dengan lencana GPS perangkat, EXIF, atau lokasi WA lawan tanpa lokasi;
- PDF jadi dan terkirim (target semua, paling lama 2 menit sesudah terkirim).

## 5. Layar

- `inp-reviewer`: kirim pesan, ganti tab Peta/Daftar/Foto, filter, buka rincian tidak membekukan layar.
- `selera-angka`: format angka Indonesia di ringkasan, PDF, dan monitoring.
- `gerbang-token-warna`, `gerbang-kartu-std`, `gerbang-tanpa-kesimpulan`: halaman `public/lapor/**` masuk daftarnya.
- Tinjau pemilik di `http://localhost:8800/lapor`, `/lapor/meja`, dan PDF satu laporan; layar 360 px dan 1440 px.

---

## Lanjutan 19 Nov 2026

Semua uji jalan tanpa jaringan dan tanpa kunci API (model ditiru rekaman) kecuali disebut. Fungsi murni diuji lewat `node --test tests/lapor`; rute dengan D1 lokal lewat `npm run uji:warga`; Python lewat self-check di berkasnya. Uji emas lama tetap lulus (perilaku F-0 sampai F-17 tidak berubah). Tiap bagian di bawah memuat kriteria dan perintah bukti.

## 6. Verifikasi dua arah (`tests/lapor/verif.test.mjs`)

| Kriteria | Bukti |
| --- | --- |
| Tombol nonaktif bila kab tanpa kontak terdaftar; F0 hanya ke PEMILIK | `node --test tests/lapor` |
| Token acak 32 byte, hanya sha256 tersimpan, kedaluwarsa 48 jam, token salah dan kedaluwarsa menjawab 404 yang sama | `npm run uji:warga` |
| Halaman dan jawaban rute tidak memuat nama dan nomor pelapor | idem |
| Jawaban kedua menambah baris, jawaban terbaru yang dipakai, riwayat tetap | idem |
| Jawaban tidak mengubah isi laporan, status tiket, atau kejadian | idem |
| "Sebagian benar" tanpa koreksi ditolak 400; koreksi disaring `teksBersih` | `node --test tests/lapor` |

## 7. Gugus (`tests/lapor/gugus.test.mjs`, `scripts/siklus/pasang.py` self-check)

| Kriteria | Bukti |
| --- | --- |
| Dua laporan jenis sama, dua nomor berbeda, jarak 2 km dan selisih 3 jam (banjir) = satu gugus; jarak 4 km atau selisih 7 jam = tidak | `node --test tests/lapor` |
| Dua laporan satu nomor tidak mendirikan gugus | idem |
| Laporan menyambung dua gugus menggabungkan ke yang tertua; yang lain `digabung_ke` | idem |
| Jenis gempa: kab sama dalam 12 jam; kekeringan dan abrasi tidak digugus | idem |
| Pusat = median, radius paling kecil 300 m; label `gugus_kuat` hanya bila syarat A9 | idem |
| Angka dampak ditampilkan per laporan dengan rentang, tidak dijumlah | idem |
| Laporan ganda (D67) tidak dihitung | idem |
| `pasang.py`: rekaman `lapor_ai` menempel ke kembar KJ-; tanpa kembar menghasilkan `tanpa_pasangan`, bukan `baru`; tidak ada KJ- baru dari sumber ini | `python3 scripts/siklus/pasang.py uji` (fungsi `_uji()`, pola di baris 496 sampai 513) |
| Gugus dihitung paling lama 2 detik untuk 1.000 laporan jenis sama (indeks dipakai) | `node --test tests/lapor` |

## 8. Mode Tanya (`tests/lapor/tanya.test.mjs`, `tests/lapor/emas/tanya.json`)

| Kriteria | Bukti |
| --- | --- |
| 30 pertanyaan tulisan tangan (paling sedikit 2 per topik utama, bahasa sehari-hari, ejaan longgar) menghasilkan topik yang diharapkan di peringkat satu pada paling sedikit 90 persen | `node --test tests/lapor` |
| 10 pertanyaan di luar cakupan (resep, politik, harga) tidak menghasilkan jawaban | idem |
| Setiap kalimat jawaban berasal dari butir `edukasi.json` (uji mencocokkan teks jawaban dengan teks butir); tidak ada kalimat lain selain label tetap | idem |
| Tiap jawaban memuat sumber topik dengan tautan | idem |
| Id yang dikembalikan model palsu di luar kandidat dibuang; model gagal memakai urutan kode | idem |
| Pertanyaan keadaan sekarang dan lokasi diarahkan, tidak dijawab dari edukasi | idem |
| Pertanyaan darurat jiwa menghasilkan templat darurat | idem |
| Log hanya berisi topik, skor, ada, nilai; tidak ada teks pertanyaan dan nomor | `npm run uji:warga` |
| `edukasi.json`: tiap topik punya sumber dengan url `https` | `node --test tests/lapor` |

## 9. Susulan (`tests/lapor/susulan.test.mjs`)

| Kriteria | Bukti |
| --- | --- |
| Pesan sesudah terkirim dalam 72 jam menanyakan Tambah atau Baru; menyebut nomor tiket langsung susulan; lewat 72 jam atau tiket selesai atau tidak valid = tidak ditawarkan | `node --test tests/lapor` |
| Jenis, lokasi, waktu kejadian tidak berubah; penyebutan tempat lain menawarkan laporan baru | idem |
| Angka baru dan koreksi turun dengan kutipan diterima; tanpa kutipan dibuang | idem |
| Tidak ada perubahan = tidak ada versi | idem |
| Satu batch menulis versi, selisih, riwayat tiket (status tidak berubah), antrean PDF; dua susulan serentak tidak menghasilkan versi ganda | `npm run uji:warga` |
| Versi 11 ditolak | idem |
| Penanda "ada susulan" menyala sampai baris riwayat staf berikutnya | idem |

## 10. Suara dan foto saja (`tests/lapor/suara.test.mjs`, `tests/wa/lapor_suara.test.mjs`)

| Kriteria | Bukti |
| --- | --- |
| Pesan suara lebih dari 90 detik dibalas templat panjang tanpa transkripsi | `node --test tests/wa` |
| Transkrip tidak masuk A1 sebelum dikonfirmasi; konfirmasi 2 meminta ulang | `node --test tests/lapor` |
| Audio dan wav dihapus pada sukses, gagal, dan waktu habis (uji dengan biner transkripsi palsu) | `node --test tests/wa` |
| Biner transkripsi tidak ada: balasan "Kirim dalam bentuk tulisan" | idem |
| Angka dari transkrip punya kutipan dari teks terkonfirmasi, asal `suara` | `node --test tests/lapor` |
| Foto tanpa teks dari nomor berizin membuat sesi; nomor baru ditahan sampai identitas selesai, lalu foto menempel; nomor di luar izin tidak tersentuh | `npm run uji:warga` |
| Uji mutu nyata (LA-29): 20 rekaman pesan suara (logat berbeda, ada angka) oleh penguji dewasa, kata benar paling sedikit 90 persen dan angka benar paling sedikit 95 persen sebelum fitur dibuka; di bawah itu fitur tetap tertutup | manual, dicatat di LA-29 |

## 11. Kabar balik (`tests/lapor/kabar.test.mjs`)

| Kriteria | Bukti |
| --- | --- |
| Hanya langganan `setuju = 1`; `berhenti kabar` menghapus lokasi seketika | `npm run uji:warga` |
| Poligon: titik di dalam dikirimi, di luar tidak (uji sinar termasuk poligon berlubang dan multi-poligon) | `node --test tests/lapor` |
| Tanpa poligon: cocok hanya bila provinsi dan nama kecamatan unik; nama kecamatan ganda dalam provinsi tidak dikirimi | idem |
| Peringatan `severity` Minor, `urgency` Past, `aktif` palsu, atau lewat 3 jam sesudah selesai tidak dikirim | idem |
| Satu kabar per peringatan per nomor (kunci unik), 1 per 6 jam, 3 per hari | `npm run uji:warga` |
| Kabar gugus tanpa persetujuan staf ditolak 403; penerima mengecualikan anggota gugus; paling banyak 200 | idem |
| Teks kabar sama dengan templat (uji pencocokan), tanpa kata "aman" | `node --test tests/lapor` |
| Tidak ada penerima di luar F0 dan F1 (konfigurasi `LAPOR_KABAR_MAKS`) | idem |
| Contoh nyata: `public/banjir/data/peringatan.json` yang sedang ada dijalankan melawan langganan uji; tidak ada kecocokan salah kab | `node --test tests/lapor` |

## 12. Mode luring (`tests/lapor/luring.test.mjs`, `tests/inti/antre.test.mjs` tidak diubah)

| Kriteria | Bukti |
| --- | --- |
| Formulir menolak simpan tanpa jenis, waktu, atau lokasi | `node --test tests/lapor` |
| Butir tidak memuat identitas, token, kode akses (antre.js menolak kunci rahasia) | idem |
| Kirim ganda `klien_id` yang sama menghasilkan satu laporan dan jawaban yang sama | `npm run uji:warga` |
| `waktu_klien` di masa depan lebih dari 5 menit atau lebih dari 14 hari lalu ditolak | idem |
| 401 menghentikan antrean dan butir tetap; sesudah masuk lagi terkirim | `node --test tests/inti` (pola antre) |
| Nomor tanpa identitas: 409 berkeadaan `identitas`, butir tidak dikirim ulang otomatis | `npm run uji:warga` |
| Laporan luring menghasilkan versi 1 dengan `waktu_klien` dan `waktu_terima`, tiket, PDF antre, gugus dihitung dari waktu kejadian | idem |
| Foto luring ber-lencana lemah di `lapor_foto_luring`; aturan EXIF D11 tetap menolak jarak lebih dari 5 km | idem |
| Gerbang keterpaduan: tidak ada `indexedDB.open` di berkas baru | `npm run uji:agen` |
| Tinjau manual: matikan jaringan di peramban, simpan laporan, nyalakan jaringan, tiket terbit; layar 360 px | manual di `http://localhost:8800/lapor` |

## 13. Penilaian foto (`tests/lapor/foto_nilai.test.mjs`)

| Kriteria | Bukti |
| --- | --- |
| dHash: foto yang sama diubah ukuran dan kompresinya berjarak Hamming 10 atau kurang; foto lain berjarak lebih | `node --test tests/lapor` (fixture dibuat dari gambar sintetis yang dibangkitkan uji, tanpa foto warga) |
| Skor buram foto sintetis tajam lebih besar dari foto yang sama dikaburkan | idem |
| `lama`: EXIF 7 jam lalu ditandai, 5 jam tidak, tanpa EXIF tidak ditandai | idem |
| Foto satu sesi dan susulan sesi yang sama tidak ditandai mirip; sesi berbeda ditandai | idem |
| Tidak ada foto yang ditolak atau disembunyikan karena penilaian | `npm run uji:warga` |
| Sebelum `T_BURAM` disetel, lencana Buram tidak tampil dan skor tampil di rincian | idem |
| Tanpa `ffmpeg`, baris antrean `gagal` dan laporan tidak terganggu | `node --test tests/wa` |
| Teks layar tidak memuat "asli", "palsu", "bukan dari internet" (uji teks) | `node --test tests/lapor` |

## 14. Ringkasan harian (`tests/lapor/ringkas.test.mjs`)

| Kriteria | Bukti |
| --- | --- |
| Jendela 24 jam sampai cut off; laporan tepat di batas masuk ke satu jendela saja | `node --test tests/lapor` |
| Pengelompokan per provinsi dan jenis; tanpa wilayah masuk "Tanpa wilayah"; tidak valid dikeluarkan dan disebut terpisah; ganda tidak dihitung | idem |
| Rentang dampak antarlaporan, tidak dijumlah; kosong tidak jadi 0 | idem |
| Pemanggilan ulang tanggal yang sama idempoten; buat ulang menaikkan versi; versi lama tetap | `npm run uji:warga` |
| Teks salin memakai format id-ID, tanpa kapital semua, tanpa titik tengah, tanpa em dash, tanpa kata "aman" | `node --test tests/lapor` |
| Satu kueri D1 berindeks (uji menghitung jumlah kueri) | `npm run uji:warga` |
| Ringkasan tidak menulis ke Buku Besar dan tidak ke dokumen laporan harian (uji: tidak ada pemanggilan rute ingest) | idem |

## 15. Penugasan (`tests/lapor/tugas.test.mjs`)

| Kriteria | Bukti |
| --- | --- |
| Penerima staf tanpa nomor WA ditolak; penerima BPBD hanya kontak terdaftar kab itu | `npm run uji:warga` |
| Tenggat kurang dari 10 menit atau lebih dari 30 hari ditolak | `node --test tests/lapor` |
| Merah: terbuka, tenggat lewat, tanpa tindakan = merah; tindakan sebelum tenggat = tidak merah; tindakan sesudah tenggat menghapus merah dan menulis baris riwayat | idem |
| Susulan pelapor bukan tindakan petugas; catatan staf dan jawaban verifikasi adalah tindakan | idem |
| Pengingat 1 jam dilewati bila tenggat kurang dari 2 jam; tiap pengingat terkirim sekali walau timer jalan dua kali (klaim atomik) | `npm run uji:warga` |
| Tidak ada eskalasi otomatis; status tiket tidak berubah oleh tugas | idem |
| Tautan tugas: tombol hanya mengisi riwayat tugas itu, tanpa membaca laporan lain | idem |

## 16. Sinyal awal dan pembanding (`tests/lapor/sinyal.test.mjs`)

| Kriteria | Bukti |
| --- | --- |
| `meja/sinyal` tanpa sesi 403, tanpa nama dan nomor di jawaban, paling banyak 1.000 baris | `npm run uji:warga` |
| Lapisan tidak ditawarkan dan tidak ada permintaan lanjutan bagi publik (uji skrip dengan 403) | `node --test tests/lapor` |
| Pembanding: sel A, B, C dihitung benar dari fixture kecil; sel "tidak dilaporkan dan tidak diprediksi" tidak ada | idem |
| Di bawah `N_MIN` tidak ada persentase dan ada teks "terlalu sedikit untuk dinilai"; di atasnya tetap hanya hitungan | idem |
| Teks catatan wajib (C bukan prediksi keliru) tampil; tidak ada kata "aman", "salah", "akurat" | idem |
| Pembanding tidak menulis ke `public/` dan tidak mengubah berkas uji prediksi | `npm run uji:agen` |

## 17. LogPal (`tests/lapor/logpal_draf.test.mjs`)

| Kriteria | Bukti |
| --- | --- |
| Pemetaan opsi ke `item_standar` sesuai tabel A20; yang tak berpadanan "perlu dipilih" | `node --test tests/lapor` |
| Laporan warga belum terverifikasi tidak bisa dibuat drafnya; `bpbd` atau verifikasi Benar atau Sebagian benar bisa | `npm run uji:warga` |
| Draf tidak punya jumlah barang dan tidak punya nomor WA atau nama pelapor | idem |
| Akun BPBD kab lain tidak melihat draf; tanpa sesi LogPal sah 303 ke `/instansi` | idem |
| Tidak ada penulisan ke `logpal_permintaan` sebelum BPBD mengajukan lewat alur yang ada; `src/logpal.js` tidak bertambah (uji plafon `d1-sisa.json`) | `npm run uji:agen` |
| Tidak ada data nama gudang asli di berkas baru (uji yang sudah ada untuk LogPal) | idem |

## 18. Meja lanjutan (`tests/lapor/meja_lanjut.test.mjs`)

| Kriteria | Bukti |
| --- | --- |
| Skor perhatian = jumlah penanda; urutan skor menurun lalu tertua; lokasi WA tidak menyalakan GPS; kosong tidak menyalakan Korban | `node --test tests/lapor` |
| Linimasa: penggeser tanpa permintaan jaringan; reduced-motion mematikan putar otomatis tetapi penggeser manual jalan | idem |
| Kab terbanyak: 10 teratas menurut saringan, ganda tidak dihitung, ketuk menyaring tabel | idem |
| Massal: satu laporan tidak sah tidak menggagalkan yang lain; hasil per laporan; lebih dari 50 ditolak; teruskan beda kab ditolak | `npm run uji:warga` |
| Ganda: induk wajib; ganda dikeluarkan dari hitungan; pembatalan menulis baris baru; laporan bertugas terbuka tidak bisa ditandai | idem |
| Waktu tanggap: belum = kosong bukan 0; median benar; format id-ID | `node --test tests/lapor` |
| Layar besar tidak merender nama dan nomor; basi lebih dari 5 menit merah; 401 menghentikan jajak dan menampilkan pita | idem |
| Ekspor: 1.000 baris; sel diawali rumus dinetralkan; tanpa nama dan nomor; lembar "Saringan" ada; Excel terbaca (tanda tangan zip dan nama lembar) | idem |
| `inp-reviewer`: klik pil lapisan, centang, kab terbanyak, linimasa, dan saringan tidak membekukan layar; chrome kontrol berganti seketika | agent `inp-reviewer` |
| `selera-angka`: angka id-ID, satuan, tanpa presisi palsu di panel, kolom waktu, PDF, ringkasan | agent `selera-angka` |
| Gerbang `gerbang-token-warna`, `gerbang-kartu-std`, `gerbang-tanpa-kesimpulan`, `gerbang-kartu-tidak-menempel` untuk berkas baru di `public/lapor/**` | `npm run uji:agen` |
| Tinjau pemilik: `http://localhost:8800/lapor/meja`, `/lapor/meja?layar=besar` pada 1920 px, 1440 px, dan 360 px | manual |

## 19. Metrik F0 tambahan (dicatat di meja, ditinjau 2 minggu)

- jumlah laporan luring dan selisih `waktu_klien` ke `waktu_terima`;
- jumlah gugus, pasangan laporan yang dinilai staf "satu kejadian" lawan "bukan" (dasar penyetelan Q18);
- jawaban verifikasi per hasil dan waktu jawab;
- jumlah susulan per laporan dan jenis isian yang paling sering berubah;
- jumlah pertanyaan Mode Tanya tanpa jawaban per topik terdekat dan nilai rata-rata;
- foto bertanda buram, lama, mirip, dan yang dikoreksi staf (dasar `T_BURAM` dan ambang);
- median `lama_dibuka` dan `lama_tindak`;
- jumlah tugas lewat tenggat tanpa tindakan.
