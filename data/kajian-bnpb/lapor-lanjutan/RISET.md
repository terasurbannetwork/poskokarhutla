# RISET: Data lanjutan BPBD

## 1. Aturan yang berlaku

| Sumber | Isi yang dipakai | Dipakai di |
| --- | --- | --- |
| Juklak 7/2023 Lampiran I huruf A (sudah jadi meja `dampak`, `juklak/DATA-DAMPAK.md`) | Bagian kejadian, kebutuhan, akibat terhadap manusia, sosial ekonomi, prasarana vital, rumah, pelayanan dasar; data dinamis dimutakhirkan minimal sehari sekali (BAB II) | Daftar jenis objek (D3), pertanyaan harian (D12) |
| Meja `pengungsi` (Juklak pengungsi terpilah, `src/meja_spek.js`) | Kelompok umur, L/P, ibu hamil per trimester, menyusui, disabilitas, yatim piatu, terpisah wali, kebutuhan per sektor | Isian `jiwa` dan `titik` |
| UU 27/2022 Pelindungan Data Pribadi | Data anak dan data kesehatan termasuk data spesifik; dasar pemrosesan, pembatasan tujuan, akses terbatas | KEAMANAN-PRIVASI |
| Kriteria RB/RS/RR di repo (`siklus/GLOSARIUM.md`, `siklus/ALGORITMA.md` baris 318) | RB lebih dari 70%, RS 30 sampai 70%, RR kurang dari 30% | Isian rumah dan prasarana; dipakai atas keputusan pemilik K10 |

## 2. Temuan dari data yang ada

Angka dari `juklak/DATA-DAMPAK.md` (bukan dihitung ulang di sini):

| Temuan | Angka | Akibat |
| --- | --- | --- |
| Baris DIBI tanpa satu pun angka dampak | 36,3% dari 4.404 | Pilihan "nihil" dibedakan dari "belum didata" (D15) |
| Kejadian yang hanya sekali dilaporkan | 75,9% dari 56.685 | Pertanyaan harian (D12) |
| Kecamatan terisi di logbook | 45,5% | Desa dan kecamatan objek wajib, diambil dari titik foto bila ada |

## 3. Kode repo yang dipakai ulang

| Kebutuhan | Yang sudah ada | Catatan |
| --- | --- | --- |
| Mesin percakapan berkutipan | `src/lapor_mesin.js`, `src/lapor_spek.js` | Spek per jenis objek ditambah di pola yang sama |
| Foto bergeotag dan lencana `gps/exif/wa/tanpa` | `lapor_foto` (0155), logika lencana di `src/lapor_ai.js` | Media tahap 2 di tabel sendiri, logika lencana dipakai ulang |
| Video bersambung | `lapor_unggah` (0158) | Dipakai apa adanya |
| Tautan web dan kuki perangkat | `lapor_sesi.token_sha`, `lapor_perangkat` (0159) | Token per anggota ditukar kuki (D20) |
| Kelompok kejadian sama | `lapor_kelompok` (0160) | Induk berkas (D2) |
| Register tempat pengungsian | `titik_pengungsian` (0134), meja `pengungsi` per titik (0135) | D6 |
| Rekap dampak | meja `dampak` (`src/meja_spek.js`) | D5 |
| Lifeline | sumber bukti `meja_dampak` di `src/lifeline_usulan.js` (`BUKTI_SAH`), tabel 0141 | D7: lewat kolom prasarana meja `dampak`, tanpa tulis langsung |
| Jitupasna | `sk_jitupasna_baris` (0123), `sk_harga` | D8 |
| Antrean luring | `public/inti/antre.js` (saluran `rahasia` hanya memori) | D10, D21 |
| Spek form lintas modul | `public/inti/spek.js` | D10 |

## 4. Praktik lazim

| Praktik | Diambil |
| --- | --- |
| Formulir kaji kerusakan rumah per bangunan berfoto dan bertitik (pola formulir lapangan luring seperti KoboToolbox/ODK) | Satu objek satu baris, foto wajib, titik dari foto, bekerja luring |
| Pendaftaran pengungsi per keluarga lalu per jiwa | Nomor HP cukup satu per KK; jiwa berinduk KK |
| Pencarian orang hilang lintas lembaga | Tidak diambil (K8) |

Penamaan alat di atas hanya rujukan bentuk kerja; tidak ada data atau kode yang diambil dari sana.
