# Katalog format dokumen Pusdalops BNPB (Drive "00. PIKET PUSDALOPS")

Dibaca 1 Nov 2026. Tanpa nama orang, nomor HP, email. Drive mode stream sangat lambat (PDF 3 MB butuh menit); yang TIDAK terbaca ditandai "belum dibaca" di tiap bagian. Berkas gslides/gdoc/gsheet tidak bisa dibaca dari disk: dicatat saja.

Padanan di repo yang sudah ada (jangan diduplikasi): `src/logbook.js` + `public/bnpb/logbook.*` (logbook kejadian, entri berwaktu, JENIS 14, KENDALA 14, KEBUTUHAN 10, BATAS_WAJAR), `scripts/wa/panduan_resmi.json` (ringkasan 3 panduan resmi: kode 101-301, ambang menonjol/laphar, status darurat, KIB, kolom rekap harian & mingguan), `scripts/wa/urai_laporan.py` (teks WA ke isian logbook), `public/laporan_bnpb*.js` (deck harian/presiden/konpers), `laporan_koordalops.js`, `laporan_urai.js`, `public/arsip_laporan.js`, `data/raw/pusdalops-drive/` (salinan lokal 20 berkas). TIDAK ADA di repo (grep src, public/bnpb, scripts/wa, scripts/bnpb): laporan shift, BAST, roll call radio, disposisi, buku tamu, lembar kerja Laporan Menonjol, KIB per kejadian (hanya di json), huntara/DTH, jembatan gantung/sumur bor, siaran pers gunung api, taksiran kerugian, disagregasi umur/jenis kelamin.

---

## 1. LAPORAN SHIFT 2026 (laporan pelaksanaan shift piket)
- Jumlah: folder bulanan 1-11 (Jan-Nov), Oktober = 31 xlsx, satu berkas per hari (`DDMMYYYY - Laporan Pelaksanaan Shift Piket.xlsx`). Rentang: 2026 penuh sampai 31 Okt; 2025 punya folder "Laporan Shift" Nov-Des + Contoh.
- Struktur: 3 sheet (Shift 1 06.30-15.00, Shift 2, Shift 3 21.00-07.00). Judul + tanggal. Tabel personel: No, Nama, Role Utama (Konfirmator/Gateway, Laporan Harian, Laporan Shift, Komunikasi Radio, Logbook, Rekap Harian, Simampu, Rollcall Radio), Keterangan (Hadir). Tabel laporan masuk: No, Laporan Yang Masuk (judul kejadian), Konfirmator (kanal: Via WA), Logbook, Laphar ("Sudah diinput" atau "Tidak termasuk kriteria"), Rekapitulasi Harian, Simampu, SMS Gateway, Pendampingan BNPB, Status Kejadian (Baru / Pengkinian), Catatan Tindak Lanjut (Catatan Sebelumnya, Shift 1/2/3, isi "Update untuk Laporan berikutnya" atau "Selesai"), Perlu Tidaknya (Perlu Tindak Lanjut / Tuntas), Waktu Pembuatan Catatan (tanggal + pukul). Tiap shift menyalin daftar shift sebelumnya lalu menambah baris (kumulatif, ~13 baris S1, 23 S2, 28 S3 pada 31 Okt).
- Informasi baru untuk sistem: (a) jejak serah-terima per kejadian per shift (siapa menangani kapan); (b) status "masuk laphar atau tidak" per laporan = label kelayakan menonjol (kriteria ambang) yang bisa jadi label latih penguraian; (c) kanal masuk (WA, SMS gateway, Simampu) dan latensi laporan; (d) peran per orang per shift.
- Insight: beban per shift (laporan masuk per jam), kejadian terbuka lintas shift (umur kejadian), rasio baru vs pengkinian, rasio "tidak termasuk kriteria" (kualitas penyaringan), jam puncak laporan (08-17 WIB dominan), kejadian tak kunjung "Tuntas".
- Usulan template: **Form Shift** di `/bnpb/shift`. Diisi petugas piket; daftar kejadian terisi OTOMATIS dari logbook (entri berwaktu pada jendela shift), petugas tinggal centang peran, status tuntas/lanjut, catatan. Keluaran: xlsx/PDF identik format lama + metrik shift. Padanan: logbook_entri (sumber), tidak ada form shift.

## 2. LAPORAN MENONJOL 2026 (lembar kerja Laporan Menonjol / Lapjol)
- Jumlah: folder bulanan Jul-Nov (+ 2025 Mei-Des), Oktober = 28 gdoc `DDMMYYYY Lembar Kerja Tim N` (tim bergilir 1-11 per hari). gdoc tidak terbaca; satu salinan docx lokal (1 Nov, Tim 10) dibaca.
- Struktur lembar kerja: aturan kerja (data pengkinian berwarna biru; cut off lapjol sore 18.00; hanya jiwa/KK dan rumah di dampak; Penetapan Status cukup jenis + TMT; bullet manual agar siap copas ke WA). Tabel 50 baris: No Logbook, Kejadian Baru (laphar Y/T, lapjol Y/T), PJ (rotasi 4 orang), Kejadian Update (laphar, lapjol). Lalu dua templat pesan WA: "Format Laporan Menonjol Pagi (Dengan Pendampingan)" dan "(Tanpa Pendampingan)": salam Yth. Kepala BNPB, CC (Sestama, Unsur Pengarah, Ess I, Ess II, Tenaga Ahli), jendela pantau 07.00 sampai 07.00 WIB, "Laporan kejadian bencana sejumlah N", "Kejadian menonjol sejumlah N", dikelompokkan per provinsi (A, B, C...), tiap kejadian: judul + (Kejadian Baru atau Pengkinian Data), Dampak, Penetapan Status, Pendampingan BNPB, Kondisi Mutakhir, Detail (Entry nomor laphar tanggal), penutup koordinator pembuat laporan. Karhutla punya pola khusus: estimasi luas terbakar kumulatif (Sipongi + laporan BPBD), target dipadamkan, luas dipadamkan, sisa.
- Informasi baru: penugasan PJ per kejadian, flag laphar/lapjol per kejadian, daftar CC pimpinan, pola kalimat karhutla (target/padam/sisa), rumus kumulatif luas (Sipongi sampai bulan X + estimasi bulan berjalan).
- Insight: berapa persen laporan harian naik jadi menonjol (BAST 27-29 Okt: 26 laporan, 20 menonjol), beban PJ, kejadian pengkinian yang berulang tiap hari (karhutla 4 provinsi hampir selalu menonjol).
- Usulan template: **Penyusun Lapjol** (`/bnpb/lapjol`): pilih kejadian dari logbook, sistem menyusun blok Dampak/Status/Pendampingan/Kondisi Mutakhir dari entri terakhir + SK status, centang menonjol memakai ambang `panduan_resmi.json`, urut per provinsi, keluaran teks WA dengan bullet manual + jumlah otomatis. Padanan: ambang menonjol sudah di json, `urai_laporan.py` mengisi `menonjol`; penyusun pesan belum ada.

## 3. LAPORAN MINGGUAN 2026
- Jumlah: 43 xlsx (nomor urut, Kamis 18.00 sampai Kamis 18.00 WIB) + subfolder PDF. Terbaru: no. 43, 22-29 Okt 2026. Salinan lokal ada (no. 42, 43).
- Struktur: sheet "Rekapitulasi Mingguan Bencana Berdampak Signifikan di Wilayah Indonesia": No, Lokasi (Prov/Kab, Kecamatan), Nama Kejadian, Waktu Kejadian, Kronologis, Dampak (Korban: terdampak KK/jiwa, mengungsi KK/jiwa, MD, HL, luka; Rumah RB/RS/RR/TRD; Fasum/Fasos rusak/TRD; Lahan ha), Ket, LOGBOOK (rujukan nomor). Dikelompokkan per jenis. Sheet "Hitung Luas Lahan Terbakar": per provinsi prioritas (Kaltim, Sumsel, Kalsel, Kalbar, Riau, Jambi) kolom TANGGAL, WB (wilayah basah?), DARAT, TOTAL, LOGBOOK, plus catatan metode (Sipongi + laporan BPBD, ambil selisih awal-akhir, cek estimasi lahan di pantauan hotspot).
- Informasi baru: metode hitung luas karhutla per hari yang dirujuk silang ke nomor logbook; konvensi minggu Kamis-Kamis.
- Insight: tren mingguan per jenis, luas karhutla harian per provinsi vs hotspot sistem kita (uji kecocokan luas resmi vs hotspot).
- Usulan template: **Rekap Mingguan otomatis** dari logbook (kolom identik), plus tabel luas karhutla harian per provinsi diisi dari entri logbook jenis karhutla. Padanan: `panduan_resmi.json` memetakan kolom; generator belum ada.

## 4. BAST PIKET 2026 (Berita Acara Serah Terima)
- Jumlah: folder bulanan Mar?-Okt, Oktober = 12 docx bernomor urut (91-101 pada Okt 2026, sekitar tiap 3 hari). Juga 2024, 2025, ARSIP BAST. Nomor surat `NNN/PTEO/PO.02/BB/2026`.
- Struktur: judul BAST Pelaksanaan Pemantauan Dit. Koordalops; hari/tanggal dalam huruf; Tim shift berjalan (koordinator + 3 anggota) menyerahkan ke Tim pengganti; tabel PELAKSANAAN (tim ke-, jadwal, jam 07.00-07.00); tabel jumlah laporan per hari (jumlah kejadian = kejadian baru + pengkinian; 27 Okt: 20 = 5 baru + 15 pengkinian; 28 Okt: 17 = 1+16; 29 Okt: 28 = 8+20); bagian B menyalin seluruh Laporan Menonjol per hari; tanda tangan koordinator kedua tim + supervisor.
- Informasi baru: hitung baru/pengkinian harian resmi, rotasi tim (11 tim, 4 orang), supervisor yang mengetahui.
- Insight: ritme 3 hari per tim; BAST = tulang punggung audit beban.
- Usulan template: **BAST otomatis**: pilih tim berjalan, tanggal; angka baru/pengkinian dari logbook, lampiran menonjol dari Penyusun Lapjol; keluaran docx/PDF bernomor otomatis. Padanan: tidak ada; semua bahannya sudah ada di logbook.

## 5. POSKO HALIM - NTT dan SITREP GEMPA NTT 2026
- Jumlah: Posko Halim = 11 berkas (kontak pejabat NTT, narahubung posko, sebaran titik pengungsi gsheet, update data terdampak xlsx, Format Laporan Halim). SITREP = 5 berkas harian 16-20 Agustus 2026 (docx + pptx Pospenas). Kontak: hanya dicatat kolomnya, tidak dibuka.
- Format Laporan Halim (harian, Tim Pendampingan Koordalops di Posko Logistik Nasional): Yth. Direktur Koordalops, CC JFT/JFU; A. Giat Tim Koordalops (daftar bernomor: koordinasi data distribusi udara per bandara, sinkron data pengungsi, rapat evaluasi); B. Rencana giat besok. Data logistik: barang masuk gudang Halim (kg, jumlah donatur), keluar per moda (pesawat TNI AU: tipe, rute, kg; komersil; kapal KRI: truk, tanggal berangkat/tiba), RENDIS (rencana distribusi) besok per sortie. Aturan: staf hadir paling lambat 08.00, cut off data Posduklognas 14.00, kirim ke Pospenas 14.30, rapat evaluasi 17.00, data logistik satu pintu.
- Sitrep (Laporan Situasi Terkini): judul "Data dilaporkan sampai tgl jam"; Detail Laporan (tanggal, disiapkan oleh, hal penting: pembaruan dicetak Warna Biru, distribusi); Highlight (kejadian, korban, rumah, fasum, status, posko, jembatan udara); gambar susulan; Situasi: korban jiwa per kab (MD, luka), pengungsian per kab, data sementara kerusakan per kab (rumah RB/RS/RR, faskes, fasdik, ibadah, perkantoran, jalan-jembatan, pasar, hotel, jaringan air, irigasi), Rekapitulasi Status Kedaruratan (lokasi, status, TMT, no. SK, tautan SK), Rekapitulasi Status Keposkoan (no. SK, tanggal, tautan), Pemenuhan Logistik, Kebutuhan Mendesak per kab (tenda, beras ton, velbed, selimut, genset, HT...).
- Informasi baru: rantai logistik udara/laut (sortie, kg, donatur), perbedaan data antar tim (rumah rusak Sikka vs Ngada) dan aturan satu pintu, tabel SK status + SK posko dengan tautan, kebutuhan mendesak terstruktur (jenis, jumlah, satuan) per kabupaten.
- Insight: nisbah korban luka vs MD per kab (Manggarai Timur luka 955 vs MD 25 pada satu laporan, kemungkinan salah ketik, contoh perlunya validasi), pengungsi ± 59 ribu jiwa di 7 kab, selisih angka antar versi harian.
- Usulan template: **Form Posko Pendampingan** (log giat harian + tabel Banlogpal masuk/keluar per moda) dan **Sitrep bergenerator** dari logbook + tabel SK. Padanan: `src/sitrep.js` + `public/bnpb/sitrep.*` (sudah ada sitrep; periksa apakah punya tabel SK/posko, rendis, dan penanda "warna biru").

## 6. SURAT TUGAS PIKET 2026
- Jumlah: 9 pdf bulanan (ST 26 Feb sampai ST 179 Sep). Format saja: surat penugasan jadwal piket per bulan, nomor ST berurut; memuat daftar tim dan tanggal. Nama dan isi orang tidak dicatat. PDF tidak dibuka (lambat, pribadi).
- Usulan: jadwal piket 11 tim sebagai tabel data (tim, anggota, tanggal serah); dari situ BAST, laporan shift, dan rotasi PJ lapjol terisi otomatis. Padanan: tidak ada.

## 7. 2024: LAPORAN KHUSUS 2024
- Jumlah: 34 docx + folder kedua "(1)", satu berkas per hari per kejadian (`DDMMYYYY BANJIR KAB PESISIR SELATAN.docx`, mulai 7 Mar 2024).
- Struktur (Vol. 0.1): judul Laporan Khusus Penanganan Darurat Bencana; Data dilaporkan sampai; blok "Informasi Kejadian" (jenis, waktu, lokasi per kecamatan); lalu dampak, status, posko, kebutuhan (hanya awal dibaca).
- Evolusi: 2025 (Senyar) dipadatkan jadi format pesan WA bertingkat (lihat bagian 9).
- Usulan: gabung dengan template Lapsus bagian 9.

## 8. 2024: SITREP ERUPSI GUNUNG LEWOTOBI LAKI-LAKI dan AKTIVITAS GUNUNG API PVMBG
- Sitrep: 2 folder (Nov, Des 2024). Contoh 13 Nov 2024 (disiapkan BPBD Flores Timur): sama kerangka dengan Sitrep NTT (Detail Laporan, Highlight, Kronologis, Situasi Terkini dengan pengamatan visual + kegempaan: jumlah gempa letusan/hembusan/low frequency, amplitudo mm, durasi detik; potensi bahaya; level (I Normal sampai IV Awas); rekomendasi radius km sektoral).
- AKTIVITAS GUNUNG API PVMBG: 37 pdf evaluasi mingguan PVMBG (Marapi, Anak Krakatau, Semeru, Awu... periode 7 hari, level Siaga). File TINGKAT AKTIVITAS GUNUNG (akar): 8 item, termasuk surat penaikan level (Lokon Waspada ke Siaga, Karangetang), siaran pers Lewotobi 13 Feb dan 20 Mar 2025, pptx Lewotobi. LAPSUS PERS RELEASE GUNUNG API 2026: Ili Lewotolok, Anak Krakatau, Awu. PDF tidak dibuka (lambat).
- Informasi baru: seri level per gunung dengan tanggal perubahan, radius bahaya km (7 km, sektoral 9 km), parameter kegempaan per jenis, rekomendasi per level.
- Insight: durasi di tiap level, gunung yang naik level cepat, hubungan level vs jumlah pengungsi.
- Usulan: **Kartu Status Gunung Api** (input: gunung, level, tanggal, radius, rekomendasi, sumber PVMBG) agar Pusdalops tinggal ketik dan sistem membuat siaran pers/kartu; padanan: `public/gunungapi` (modul gunungapi-kering) untuk status; cek apakah ada riwayat level dan radius.

## 9. 2025: Laporan Khusus Tropical Cyclone Senyar
- Jumlah: 22 berkas docx harian 1-19 Des 2025 (+ rekap gsheet, folder tangkapan layar dashboard Sumbar).
- Struktur (19 Des): legenda warna per wilayah (Aceh ungu, Sumut hitam, Sumbar biru; merah = belum diupdate); "Yth. Kepala BNPB, CC (Unsur Pengarah, Ess I, Ess II, Tenaga Ahli)"; per provinsi: Penetapan Status (termasuk perpanjangan TMT), Aktivasi Posko (no. SK, komandan, lokasi), Dampak Korban provinsi, Pendampingan BNPB (pemimpin + 10 tim A-J); per tim, per kejadian (Banjir di Kab./Kota): Dampak (MD, hilang, luka, KK/jiwa mengungsi, KK/jiwa terdampak, rumah rusak), Kebutuhan mendesak (daftar barang + jumlah: tenda, sekop 2.400, backhoe 10 unit...), Penetapan Status, Aktivasi Posko, Kondisi mutakhir (air bersih, listrik, akses terisolir, pengungsi mandiri 633 lokasi), Hal menonjol (BBM, komunikasi, listrik, air), Tanggal pemutakhiran (per kab beda hari).
- Informasi baru: struktur penugasan tim pendamping per kab; stempel "tanggal pemutakhiran" per kejadian; kebutuhan mendesak berkuantitas; kondisi layanan dasar (BBM, komunikasi, listrik, air) sebagai indikator tersendiri; pengungsi mandiri jumlah lokasi.
- Insight: kebutuhan mendesak berubah dari pangan ke alat berat dan huntara seiring hari ke-15; dampak makin tak berubah = data basi (warna merah); indeks "kebutuhan terpenuhi" bisa dihitung jika kebutuhan dan distribusi dicatat.
- Usulan: **Form Lapsus (operasi besar)**: induk operasi, per provinsi, per tim pendamping, per kejadian; indikator layanan dasar 4 titik (BBM, sinyal, listrik, air: normal/sebagian/padam); status basi otomatis bila tanggal pemutakhiran > 24 jam. Padanan: `public/bnpb/kebutuhan.*`, `sitrep.*`, `siaga.*` (cek isi; tim pendamping belum terlihat).

## 10. 2025: LAPORAN KEJADIAN DAN PENANGANAN BANJIR JABODETABEK 2025
- Jumlah: 21 docx, 6-7 Mar 2025 pagi/sore/revisi; juga Banjir Sumatera 2025 (hanya gdoc 28 Nov 2025).
- Struktur per kab/kota: Update (tanggal pukul + kapan update berikutnya + siapa), Daerah Terdampak (kelurahan/kecamatan), Korban jiwa, Warga terdampak KK/jiwa, Ketinggian banjir cm, Cuaca terkini, Situasi terkini, Pengungsi terpusat (jumlah + jumlah titik + rincian per titik), Upaya BNPB (aktivasi posko, SAR, kebutuhan dasar, pendataan, OMC TMT, bantuan senilai Rp dengan rincian barang), penanganan pengungsi di gudang BNPB (tenda, toilet bilik, dapur umum bungkus per hari), Upaya NGO/BUMN.
- Informasi baru: nilai rupiah bantuan BNPB, kapasitas dapur umum dan toilet, ketinggian banjir per update, titik pengungsian terpusat, kontribusi NGO/BUMN, OMC sebagai upaya banjir.
- Insight: rasio pengungsi terpusat vs terdampak (284 jiwa terpusat dari 86.437 jiwa terdampak di Bekasi = 0,3%, pengungsi mandiri mendominasi), efektivitas OMC vs hari banjir.
- Usulan: **Form Penanganan Banjir kota** (sub-modul lapsus): medan di atas, plus tabel bantuan (barang, jumlah, nilai) yang menjadi basis angka "total bantuan Rp". Padanan: `public/bnpb/relawan`, `kebutuhan`; nilai bantuan belum ada.
- Laporan untuk pimpinan negara: "FORMAT LAPORAN UNTUK RI 2" (laporan wapres per hari, mis. ambruknya bangunan ponpes: dasar kejadian, dugaan sebab, korban per rumah sakit [dirawat/rawat inap/pulang/meninggal/dirujuk], jumlah dalam pencarian, evakuasi) dan "Laporan Khusus (RI 1 / Menko PMK)": surat resmi bernomor, perihal, daftar korban meninggal (nama, L/P, umur), kerugian materiil, unsur yang terlibat, tanda tangan Kepala BNPB. Daftar nama korban TIDAK disalin di sini (data pribadi).
- Usulan: **Surat Laporan Kejadian ke Pimpinan** (nomor surat otomatis, perihal, isi dari logbook, lampiran foto). Padanan: `laporan_bnpb_slide` (deck presiden) tapi surat resmi belum.

## 11. 2025: PENANGANAN KARHUTLA 2025 dan PAPARAN RAKOR KARHUTLA 2025
- PENANGANAN: 13 berkas, semuanya gambar (jpeg/png) dan satu mp4 OMC: tangkapan peta/infografik status per provinsi/kab (Riau, Jambi, Aceh, Kalbar, Muara Enim, Ogan Ilir, Pulang Pisau, OMC Sumbar/Kalbar). Format kartu infografik, bukan teks.
- PAPARAN RAKOR (28 Jul 2025): 10 berkas pptx/pdf paparan Kepala BNPB, BMKG, Gubernur Riau/Jambi/Sumbar/Kalbar/Sumut/Kalsel. Belum dibaca isi (pdf lambat); judul menunjukkan tiap gubernur menyajikan situasi, status, sumber daya, OMC.
- 2026: "Format Pelaporan Khusus untuk BNPB.xlsx" (salinan lokal 25 Okt): sheet "Perkembangan harian setiap titik/lokasi yang terbakar" kolom NO, TITIK/LOKASI (jalan, kelurahan, kecamatan), LUAS TERBAKAR, LUAS DIPADAMKAN, STATUS (Padam / Belum Padam), UPAYA, KENDALA, KET (Baru/Lanjutan); dikelompokkan per kab/kota (mis. Palangka Raya, 367 baris). Penghubung ke hotspot sistem: koordinat titik tidak ada.
- Informasi baru: daftar titik api bernama dengan luas padam harian dan status = data kebenaran-dasar untuk model sebaran/hotspot; label "Baru/Lanjutan".
- Insight: laju padam (ha dipadamkan per hari), umur api (Baru menjadi Lanjutan), titik yang tak kunjung padam.
- Usulan: **Form Titik Api Harian** per kab: lokasi (pilih desa), luas terbakar, luas padam, status, upaya, kendala; sistem otomatis memberi Baru/Lanjutan. Padanan: `public/bnpb/kebakaran.*` (cek apakah sama); `tugas api` (ruang-instansi).

## 12. Akar: STANDAR PENGOLAHAN DATA (26 item) dan Juklak
- Isi: Instruksi Kerja (draft panduan Logbook/Laphar/Lapjol 9 Juli 2025; templat Lapjol, Logbook, Laphar; IK Gateway [templat salinan instansi lain, belum disesuaikan: masih bahasa Bea Cukai, kartu identitas]), Dasar Hukum (Juklak 7/2023, 3/2022, 9/2023, Perka 15/2012), Data Bencana 04062025 (xlsx/pdf: kode wilayah Prov/Kab untuk KIB), MASALAH DAN SOLUSI.xlsx (belum terbaca), Buku Saku Tata Naskah Dinas BNPB, Pedoman Platform SPDB (draft), KERANGKA gdoc.
- Draft Panduan Logbook (nomor 01/PO.02/07/2025, 9 Juli 2025) sudah dibaca penuh; selisih terhadap sistem kita ada di bagian "Selisih juklak vs sistem" di bawah.
- IK Gateway (IP-01/PO.1/2025): kerangka matriks RASCI (Responsible, Accountable, Support, Consulted, Informed) laporan daerah masuk sampai jadi logbook; belum diisi bagan alir BNPB. Usulan: isi RASCI dari alur WA gateway yang sudah ada.

## 13. Akar: JUKLAK BNPB (7 pdf) dan Juklak 7/2023
- Juklak 7/2023 Standar Data Kejadian dan Dampak Bencana (Dasar Hukum; dibaca penuh, 95 KB teks): 13 jenis ancaman, KIB 16 digit, ambang kejadian bencana (6 kriteria), metode hitung (satu tipe utama; kejadian multi-wilayah dihitung 1 nasional, per provinsi/kab sesuai terdampak; dua lokasi hari sama dalam satu kab dihitung satu kejadian dengan indeks), Daftar Data (8 kelompok: kejadian, kebutuhan, manusia, sosial ekonomi, prasarana vital, rumah, pelayanan dasar, aset layanan), Lampiran formulir dan tabel format data.
- Juklak 3/2022 Pengkajian Cepat (dibaca sebagian): tahap per status (siaga darurat dst), form pengkajian cepat, tabel pengungsi per kelompok umur (bayi 0-11 bln, balita 12-59 bln, anak 5-17), ibu hamil/menyusui, DBD per bulan; template analisis (distribusi frekuensi, tabel silang).
- Juklak 10/2023 Sistem Komando Penanganan Darurat (dibaca sebagian): Posko PDB kabupaten/kota 24 jam 7 hari, rapat harian minimal 1 kali, laporan harian; seksi: hunian sementara, logistik, kesehatan, evakuasi, SAR, peralatan-transportasi, perbaikan darurat prasarana vital, perlindungan, sandang pangan, kesehatan jiwa/psikososial, pendidikan darurat, gizi, air bersih dan sanitasi, DVI, pemulihan layanan pemerintahan dan ekonomi dini. Formulir permintaan bantuan personel.
- Juklak 1/2023 (Dana Tunggu Hunian), 3/2023 (Huntara), 4/2023 (Penilaian Awal), 6/2023 (Penilaian Perkembangan Darurat), 9/2023 (Data pengungsi terpilah): BELUM dibaca (PDF lambat/ scan; 1/2023 tanpa lapisan teks). Perka 15/2012 juga scan tanpa teks.

## 14. Akar: DATA PROV. ACEH (huntara, logistik, jembatan)
- KAB. ACEH TAMIANG: 19 berkas. Contoh "DATA DAN PROGRESS HUNTARA HUNTAP TAMIANG 10 Apr 2026": sheet "HUNTARA BNPB": rekap per vendor (NO, VENDOR, KECAMATAN, DESA, PEMILIK LAHAN [hibah warga/tanah pemda/fasum/milik desa], PENERIMA KK, status data penerima BNBA [sudah/sebagian], status koordinat, koordinat lat lon); sheet "HUNTARA KL LAIN" (K/L dan swasta: vendor, KK, lokasi, ket "561 KK sudah masuk"). Juga laporan penyaluran Dana Tunggu Hunian (BNPB dan bank), daftar kontrak huntara.
- DATA JEMBATAN GANTUNG: rekap jembatan gantung, sumur bor (selesai/proses/persiapan), listrik, alat berat yang dibangun dengan dana BNPB 2026 per provinsi/kab (10 Mar 2026).
- Informasi baru: pipeline pemulihan (huntara, huntap, DTH, jembatan, sumur bor) per kab dengan status dan koordinat; kontrak vendor; keterbatasan: koordinat sering kosong.
- Insight: kapasitas huntara terpusat (KK) vs jumlah rumah rusak berat; tingkat kelengkapan koordinat dan data penerima (BNBA); pihak swasta/K-L yang berkontribusi.
- Usulan: **Form Tracker Pemulihan** (huntara/huntap/DTH/jembatan/sumur): lokasi titik, vendor, KK/kapasitas, status (persiapan/proses/selesai/dihuni), % koordinat dan BNBA lengkap; peta. Padanan: tidak ada di repo (grep huntara/DTH/jembatan gantung tidak menemukan fitur).

## 15. Akar: PON XX di PAPUA (2021), NTT, Gempa, Simampu, Isoman, lain-lain
- PON XX PAPUA (16 berkas, 27 Sep-16 Okt 2021): laporan harian COVID-19 per tanggal (pdf), prakiraan cuaca harian PON, HOTSPOT dan prakiraan cuaca PON, Data Isolasi PON (xlsx). Format: paket dukungan acara besar (kesehatan + cuaca + hotspot). Belum dibuka isi.
- Bencana dan Kejadian alam Prov. NTT: satu docx "Laporan Harian Dit. Koordalops 27 Apr 2026": kompilasi kejadian Januari-Juni 2026 per bulan; per kejadian: Kronologis, Lokasi (jumlah kec/desa + nama), Korban jiwa, Kerugian materiil (rumah, ha lahan, akses jalan), Upaya. Kop memuat hotline Direktorat 117, kanal WA, email, situs.
- Perumus Template Laporan Harian Gempa Bumi.docx: templat "Format Laporan Harian Pusdalops" (kop instansi, "kejadian alam dan bencana ... sejak hari X pukul sampai hari Y pukul"), pembagian penanggung jawab jenis (banjir, longsor, gelombang-abrasi, cuaca ekstrem, kekeringan-karhutla, gempa-tsunami, erupsi), blok Kejadian Bencana: Kronologis, Nama Kejadian, Tanggal, Waktu, Lokasi (total kec/desa), Provinsi, Kabupaten, Daerah cakupan, Koordinat (Long X, Lat Y), Cakupan dampak (luas dan tinggi genangan; panjang, lebar, radius). Menambah dua medan yang tidak ada di logbook kita: koordinat dan cakupan dampak.
- Sosialisasi Simampu 2025.pptx (36 slide): modul SIMAMPU (Sistem Manajemen Pusdalops, simampu.bnpb.go.id): Registrasi-Login, Pengaturan Umum, Manajemen Sumber Daya (struktur organisasi, SDM internal/eksternal, desk, relawan, logistik-peralatan), Kesiapsiagaan (rencana kontingensi, pemantauan ancaman), Diseminasi (kontak, moda, templat), Kejadian Bencana (data kejadian), Darurat Bencana (penetapan status, SKPDB, rencana operasi), Dashboard Kedaruratan Publik, Statistik dan Laporan (logbook, laphar, laporan mingguan, laporan situasi, laporan khusus, roll call radio), Peta. "What next": dashboard interaktif real time.
- Tabel data Harian Isoman, Isoter, Meninggal Jawa-Bali (xlsx): COVID 2021, format saja: tidak dibuka (satu xlsx). Bentuk umum: harian per provinsi isoman/isoter/meninggal.
- Update Pusdalops 23 Nov 2025 (.gslides), Laporan BENCANA (.gdoc), Untitled gslides/gsheet, JADWAL PIKET PPPK, UKURAN SEPATU: tidak terbaca.
- Dilewati sesuai perintah: SKP 2026, SE WFH, WFA, SOP Administrasi, Mbd, KONTAK BPBD (kolom yang tercatat di nama: kontak BPBD se-Indonesia versi Mei 2023 dan Okt 2025, "Kontak WAG Laporan Pusdalops").
- Lain dari 2024-2026 yang disebut di daftar tetapi tidak dibuka (format saja): DISPOSISI 2024 (pdf Dispo bernomor 333-795 dengan tujuan [Kabid/ K.PTEO/ K.TU]; format: nomor disposisi, penerima, perihal, surat asal), DAFTAR KUNJUNGAN PUSDALOPS (gform + gsheet buku tamu), Grafik Roll Call Radio (xlsx).
- Roll Call Radio 2026 (salinan lokal): satu sheet per bulan; 3 baris: BPBD Prov, BPBD Kab/Kota, Komunitas yang menjawab roll call per tanggal (angka 0-9). Contoh Jan-Jul 2026: rata-rata Prov 3-6, Kab/Kota 2-6, Komunitas 0-1. Bukti ketaatan radio.

---

## Selisih juklak/panduan vs sistem kita

Panduan Logbook 01/PO.02/07/2025 + Juklak 7/2023 dibanding `src/logbook.js`, `panduan_resmi.json`, `logbook_turunan.js`:

1. KIB 16 digit + sufiks -001/-002 pengkinian + aturan indeks (banjir/gempa selalu 1; multi-kab satu provinsi tanpa KIB; episentrum laut = wilayah terdekat): HANYA di json, tidak dibangkitkan atau disimpan di logbook (tabel `logbook_kejadian` pakai id acak). KIB adalah kunci interoperabilitas ke SIMAMPU/DIBI.
2. Data kebutuhan standar 5 kelompok (Dana, SDM, Sarana-prasarana, Logistik, Peralatan) dengan jumlah per barang: kita punya KEBUTUHAN 10 kode tanpa jumlah. Kebutuhan mendesak butuh barang + jumlah (contoh: tenda 80 unit, beras 50 ton).
3. Taksiran kerugian (juta rupiah) per kelompok: tidak ada; parser arsip Python menyebut tetapi `periksaEntri` tidak.
4. Disagregasi korban menurut umur (anak 0-17, dewasa 18-59, lansia 60+) x jenis kelamin (L/P) untuk meninggal, hilang, luka, terdampak, mengungsi: tidak ada (hanya total).
5. Kerusakan lengkap: kita punya rumah RB/RS/RR/terendam dan luas ha; standar juga: sawah, lahan, kebun, hutan, kolam (ha, terpisah), kios/toko, pabrik, jaringan air/listrik/telekomunikasi/irigasi, jalan km, jembatan RB/RS/RR, transportasi, SPBU, rumah ibadat, faskes, sekolah, kantor, pasar (unit RB/RS/RR/terendam). ANGKA di logbook kita hanya md, hilang, luka, mengungsi, rumah, luas.
6. Medan kejadian yang belum ada: penyebab, kronologis terstruktur (templat kalimat per jenis dengan jam), deskripsi, letak geografis (lat/lon sudah ada di kejadian, tetapi bukan wajib), cakupan dampak (panjang, lebar, radius; tinggi/luas genangan), upaya penanganan (lima kelompok: kaji cepat, penyelamatan-evakuasi, kebutuhan dasar, kelompok rentan, pemulihan sarpras), unsur terlibat, keposkoan (no. SK + masa berlaku + tautan), pendampingan BNPB, dokumentasi (satu tautan folder per KIB dengan penamaan `YYYYMMDD_n`).
7. Status darurat: kita menyimpan status kejadian; panduan butuh 3 tingkat urut (Transisi Darurat ke Pemulihan, Tanggap Darurat, Siaga Darurat), SK Provinsi didahulukan, TMT mulai-selesai, perpanjangan ke-N, dengan tautan dokumen SK. Sistem punya `data/raw/.../sk/` tetapi belum tersambung per kejadian.
8. Sumber informasi: pemberi (instansi, jabatan, nama, kanal, maksimal 3 pada pengkinian), dokumentasi informasi (maks. 3 tautan terakhir), diinput oleh / diupdate oleh (maks. 3 terakhir), status SIMAMPU dan rekap harian (sudah/belum + siapa + kapan). Kita punya `sumber_instansi` dan `oleh` saja; tidak ada status SIMAMPU/rekap.
9. Warna pengkinian per slot waktu (pagi 07.00-16.00 magenta, siang 16.00-21.30 ungu, malam 21.30-07.00 biru) dan warna biru untuk pembaruan sitrep: aturan tampilan yang bisa jadi "slot pengkinian" tersimpan otomatis. Belum ada.
10. Jendela pantau 07.00 hari H-1 sampai 07.00 WIB hari H dan cut off Lapjol 18.00: ada di json (`jendela_pantau`), tetapi laporan mingguan memakai Kamis 18.00; logbook kita memotong per tanggal kalender? Perlu diperiksa.
11. Klasifikasi: json memuat 13 jenis resmi; `JENIS` di logbook memuat 14 (ada `kecelakaan`, `lainnya`, `kekeringan`...) dan belum memisah gagal teknologi (203) secara kode (kunci `kegagalan_teknologi` null di json). `kecelakaan` tidak ada di standar (203 gagal teknologi; kejadian ambruk ponpes pada laporan wapres 2025 dikategorikan gagal teknologi struktur bangunan).
12. Ambang kejadian (6 kriteria) hanya diterapkan untuk Laphar/menonjol; standar menyebutnya syarat "kejadian bencana" itu sendiri.
13. Aturan hitung (satu kejadian nasional untuk multi-provinsi; satu kejadian bila dua lokasi hari sama dalam satu kab): tidak dituangkan di kode penghitungan statistik kita.
14. Pengungsi terpilah (Juklak 9/2023) dan pengkajian cepat (Juklak 3/2022): kelompok rentan (bayi, balita, ibu hamil/menyusui, lansia, disabilitas) belum ada di `pendataan` / logbook.
15. Struktur Posko PDB (Juklak 10/2023) dengan 16 seksi: belum ada pemetaan seksi untuk tugas lapangan.
16. Sistem kita melangkah lebih jauh dari panduan: `BATAS_WAJAR` + `yakin`, laju tulis, validasi tanpa karakter kontrol, turunan (jam rawan, rapor BPBD), semuanya tidak ada di panduan.

---

## Peringkat 10 usulan teratas (dampak/usaha)

| # | Usulan | Dampak | Usaha | Padanan di repo |
|---|--------|--------|-------|-----------------|
| 1 | KIB otomatis + sufiks pengkinian pada logbook (bangkitkan dari prov, kab, kode 101-301, tanggal, indeks) | Tinggi: kunci tukar-data ke SIMAMPU/DIBI, pondasi usulan lain | Rendah (fungsi murni + kolom) | json saja |
| 2 | BAST otomatis dari logbook (baru vs pengkinian per hari + lampiran menonjol, bernomor) | Tinggi: dokumen wajib tiap ~3 hari | Rendah-sedang | tidak ada |
| 3 | Penyusun Laporan Menonjol: format pesan WA pagi dengan/tanpa pendampingan, per provinsi, centang ambang | Tinggi: pekerjaan harian paling berulang | Sedang | ambang di `panduan_resmi.json` |
| 4 | Form Laporan Shift (3 shift) terisi dari logbook + peran + status tuntas | Tinggi: audit beban dan serah terima | Sedang | tidak ada |
| 5 | Rekap Mingguan otomatis (Kamis-Kamis) + luas karhutla harian per provinsi prioritas | Sedang-tinggi | Sedang | kolom di json |
| 6 | Perluas isian logbook ke standar Juklak 7: kebutuhan berjumlah, taksiran kerugian, usia x jenis kelamin, kerusakan prasarana, cakupan dampak | Tinggi (standar resmi) | Sedang-tinggi (migrasi D1) | `periksaEntri` |
| 7 | Tabel SK status + SK posko per kejadian (TMT, perpanjangan, tautan) dipakai sitrep dan lapjol | Tinggi: terus dipakai di sitrep NTT dan Lapsus | Sedang | `data/raw/.../sk/` |
| 8 | Form Lapsus operasi besar (provinsi, tim pendamping, kejadian, kebutuhan mendesak, 4 indikator layanan dasar, stempel basi) | Sedang-tinggi saat operasi besar | Sedang-tinggi | `sitrep`, `kebutuhan`, `siaga` |
| 9 | Tracker pemulihan (huntara/huntap/DTH/jembatan gantung/sumur bor) dengan koordinat dan status | Sedang: data nyata Aceh Tamiang sudah ada | Sedang | tidak ada |
| 10 | Roll Call Radio + Kartu Status Gunung Api (input singkat, grafik ketaatan, siaran pers otomatis) | Sedang | Rendah | `gunungapi`; radio tidak ada |

Catatan: usulan 1 harus lebih dahulu (KIB dipakai 2, 3, 4, 7). Belum dibaca (perlu sesi lanjutan saat Drive cepat): Juklak 1/3/4/6/9 2023, Perka 15/2012 (scan), MASALAH DAN SOLUSI.xlsx, paparan Rakor Karhutla 2025, evaluasi PVMBG, PON Papua, daftar disposisi dan kunjungan (hanya daftar nama).
