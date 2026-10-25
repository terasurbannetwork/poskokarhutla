# Lapis (c) penyunting bahasa: mitigasi bab 09 (Bencana Sosial)

Tanggal: 25 Okt 2026. Berkas: `naskah/mitigasi/bab-09.md`.

## Vonis slop

- Sebelum sunting: LOLOS, skor 1 (3.782 kata), satu temuan S-30 rendah (baris 27, rekomendasi r-m03 46 kata).
- Sesudah sunting: LOLOS, skor 0 (3.860 kata), nol temuan, kata kosong 0,0 per 1.000.
- Perintah: `.venv/bin/python qa/slop.py --final naskah/mitigasi/bab-09.md`.
- Dua S-30 sempat muncul di tengah sunting (baris 82 dan 211, akibat kepanjangan Komnas HAM dan BA BUN); keduanya dipecah dan hilang pada putaran kedua.

## Suntingan

| Letak | Sebelum | Sesudah | Alasan |
| --- | --- | --- | --- |
| Ringkasan, temuan 3 | Peran BNPB | Peran Badan Nasional Penanggulangan Bencana (BNPB) | T-9, singkatan pertama di bab |
| Ringkasan, r-m03 | satu kalimat 46 kata dengan forum di dalam kurung; Kemenko PMK | forum dipindah ke kalimat kedua; Kementerian Koordinator Bidang Pembangunan Manusia dan Kebudayaan (Kemenko PMK) dieja | S-30; T-9. Lembaga, forum, dan tenggat tetap |
| Ringkasan, r-m08 | di DIBI | di Data dan Informasi Bencana Indonesia (DIBI) | T-9 |
| 9.1, paragraf 2 | pimpinan DPRD atau DPR; bantuan kekuatan TNI | DPRD, DPR, dan TNI dieja lengkap | singkatan pertama di bab (TNI di glosarium; DPRD/DPR belum) |
| 9.2, paragraf 1 | Jawa Barat di urutan kelima | Jawa Barat berada di urutan kelima | predikat eksplisit |
| 9.2, paragraf 2 | sehingga DKI Jakarta tidak ditulis sebagai provinsi paling rawan konflik tanpa menyebut ukurannya | dan peringkat itu hanya bermakna bila ukurannya disebut bersama | meta-komentar tentang cara menulis diganti pernyataan substansi |
| 9.2, paragraf 2 | Kepulauan Riau satu-satunya provinsi | Kepulauan Riau adalah satu-satunya provinsi | predikat eksplisit |
| 9.2, paragraf 3 | tidak dibaca sebagai tren | belum dapat dibaca sebagai tren | batas simpulan, bukan meta-komentar |
| 9.2, paragraf 4 | ..., sehingga @gbr:peta-perkelahian memuat | ...; oleh sebab itu @gbr:peta-perkelahian memuat | "sehingga" terpakai 13 kali di bab; variasi penghubung |
| 9.2, paragraf DIBI | satu kalimat 48 kata; angka korban Komnas HAM | dipecah tiga kalimat; Komisi Nasional Hak Asasi Manusia (Komnas HAM) dieja | S-30; singkatan pertama |
| Kotak catatan DIBI | Renas PB 2025–2029 | Rencana Nasional Penanggulangan Bencana (Renas PB) 2025–2029 | T-9 untuk Renas dan PB |
| 9.3, paragraf 2 | diberikan kepada Bakornas PB | Badan Koordinasi Nasional Penanggulangan Bencana (Bakornas PB) | singkatan pertama |
| 9.3, paragraf 2 | ..., sehingga lantai skenario kajian ini ditulis dua | kalimat dipecah; "Oleh sebab itu," | variasi penghubung, kalimat lebih pendek |
| Kartu 9.1, pemulihan | melalui DAK | melalui Dana Alokasi Khusus (DAK) | T-9 |
| 9.4, paragraf 1 | Kemenko Polkam dan Kemenko Kumham Imipas | kedua kementerian koordinator dieja lengkap | singkatan pertama |
| 9.4, paragraf 2 | BNPB atau BPBD; Renstra BNPB | Badan Penanggulangan Bencana Daerah (BPBD); Rencana Strategis (Renstra) BNPB | T-9 |
| 9.4, paragraf Perpres 46 | katalog JDIH BNPB | katalog Jaringan Dokumentasi dan Informasi Hukum (JDIH) BNPB | T-9 |
| 9.4, paragraf Perban 5/2018 | sehingga ketiadaannya adalah urutan waktu, dan perubahan | kalimat dipecah; "Ketiadaan perubahan itu mencerminkan urutan waktu, dan perubahan" | acuan "-nya" kabur; variasi penghubung |
| Kotak temuan, Dampak | hampir tidak menyaring, sehingga penyaring yang sebenarnya | dua kalimat | variasi penghubung |
| Daftar instrumen, butir 5 | DSP BA BUN ...; teks yang dibaca | Bagian Anggaran Bendahara Umum Negara (BA BUN) dieja; kalimat dipecah | singkatan pertama; S-30 |

Token `{{angka:...}}`, rujukan pustaka, rujukan silang `@rek/@tbl/@gbr/@sub`, kutipan langsung, dan bilangan tidak berubah (dicek mesin: himpunan sebelum dan sesudah sama). Makna tidak diubah. Emulasi T-9 atas berkas markdown (prosa dan butir, tanpa tabel dan metadata direktif): nol singkatan glosarium tanpa kepanjangan.

## Daftar periksa M-1 sampai M-14

- M-1 pasif penyembunyi pelaku: tidak ditemukan; penetap (kepala daerah, Presiden, Kepala BNPB, menteri koordinator) dan pencatat (BPS, DIBI, ICG, HRW, Presiden) tersebut.
- M-2 sinonim berputar: istilah konsisten (perkelahian massal antarkelompok masyarakat, keadaan tertentu, status keadaan konflik, lantai kejadian regional).
- M-3 kalimat pertama mengulang judul: tidak ada.
- M-4 keberatan fiktif: tidak ada.
- M-5 angka ketik tangan: angka data bertoken; "tujuh jenis", "lima sumber", "sembilan kabupaten", "sepuluh tahun", "tiga bulan" adalah bilangan teks dari sumber yang dirujuk.
- M-6 sebab dari korelasi: kenaikan Podes 2021–2024 ditulis bukan tren dan bukan dasar peluang.
- M-7 paragraf satu gagasan: terpenuhi.
- M-8 subbab templat: tidak ada.
- M-9 rekomendasi: ketiga rekomendasi ringkasan berlembaga, berforum, dan bertenggat.
- M-10 kontras "X, bukan Y": berlandas (indikator potensi bukan hitungan konflik UU 7/2012, kejadian analog bukan proyeksi model, mandat bukan keberadaan Satgas).
- M-11 register: formal ilmiah.
- M-12 tebal sebagai penekanan: hanya kalimat pembuka paragraf temuan (L16), label ringkasan, dan label kotak.
- M-13 kalimat bijak kosong: tidak ada.
- M-14 uji tukar logo: tidak berlaku untuk naskah.

Pelajaran wajib: tidak ada program konflik yang disebut terbukti (kompendium kosong, ditulis eksplisit); lantai kartu tidak di bawah angka tercatat (Maluku untuk korban, 2001 untuk pengungsi serentak); angka bertentangan Wamena 2019 berdampingan; kewenangan mengikuti UU 7/2012, PP 2/2015, dan Perpres 46/2026.

## Catatan untuk sesi induk

- `bangun/kontrak/naskah.py` menolak bab ini dengan `kunci angka "sosial.desa_kelurahan.2024" tidak ada di data/angka.json` (baris 15). Token itu sudah ada sebelum sunting dan tidak disentuh; kuncinya perlu ditambahkan pemilik paket angka.
- DPR, DPRD, Komnas HAM (HAM), ICG, HRW, Bakornas PBP, SNPK, BA BUN, dan DKI belum terdaftar di `data/glosarium.json`; T-10 akan menandainya sampai didaftarkan. Semuanya sudah dieja di bab. Glosarium di luar cakupan lapis ini.
- Substansi, bukan bahasa: 9.4 paragraf 1 menyebut Perpres 90/2025 tetapi kutipannya `[@ri-2024-perpres144]`. Perlu dicek lapis substansi apakah Perpres 90/2025 punya entri pustaka sendiri.
- Tiap paragraf prosa subbab sudah berkalimat pembuka tebal (L16); kotak koreksi dan catatan mengikuti direktifnya masing-masing.
