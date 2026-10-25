# Penyuntingan bahasa: kajian mitigasi, Bab 2

Berkas: `naskah/mitigasi/bab-02.md` (Tinjauan Pustaka dan Kerangka Konseptual)
Lapis: (c) penyunting bahasa, 25 Okt 2026

## Hasil detektor

| Pemindaian | Sebelum | Sesudah |
| --- | --- | --- |
| `qa/slop.py --final` | LOLOS, skor 1 (S-11 "luar biasa", baris 113) | LOLOS, skor 0, nol temuan |
| `qa/slop.py --ambang` | | 0 pelanggaran, vonis LULUS |

Token `{{angka:...}}`, rujukan `[@...]`, dan rujukan silang `@rek:/@tbl:` identik dengan versi
HEAD (diperiksa dengan diff). Tidak ada angka, kutipan, atau makna yang diubah.

## Suntingan

| No | Lokasi | Masalah | Suntingan |
| --- | --- | --- | --- |
| 1 | baris 113 | S-11: "kejadian luar biasa" terbaca sebagai bahasa promosi | ditulis sebagai istilah dalam petik, `status "kejadian luar biasa" (KLB)`, sama dengan Bab 11 |
| 2 | ringkasan, r-m19 | InaTEWS tanpa kepanjangan pada kemunculan pertama (L66) | `*Indonesia Tsunami Early Warning System* (InaTEWS)`, miring, sama dengan Bab 4 |
| 3 | baris 41 | APBN tanpa kepanjangan | `Anggaran Pendapatan dan Belanja Negara (APBN)` |
| 4 | baris 115 | "Permen ESDM" tanpa kepanjangan | `Peraturan Menteri Energi dan Sumber Daya Mineral 32/2021` |
| 5 | baris 186 | WHO tanpa kepanjangan | `World Health Organization (WHO)` |
| 6 | baris 221 | BPBD tanpa kepanjangan | `Badan Penanggulangan Bencana Daerah (BPBD)` |
| 7 | baris 79 | "KP" tidak terdaftar di glosarium | `kegiatan prioritas 08.04.04`, sejajar dengan baris 67 |
| 8 | baris 109, 170, tabel praktik | varian terlarang glosarium "rencana kontingensi" | "rencana kontinjensi" (4 kemunculan, termasuk judul Perban BNPB 2/2023), sejalan dengan "dana kontinjensi" di baris 105 |
| 9 | baris 117 | M-2: "lubang norma" berganti dengan "celah" (baris 107, KERANGKA bagian 7) | "celah" di seluruh paragraf |
| 10 | baris 63 | kalimat tanpa predikat | "Semua provinsi berkelas risiko multibahaya Tinggi kecuali DKI Jakarta, ..." |
| 11 | baris 81 | "nonalam maupun sosial" tanpa "baik" (PUEBI) | "termasuk jenis nonalam dan sosial" |
| 12 | baris 172 | paragraf temuan Kamaishi tanpa kalimat pembuka tebal (L16), dua gagasan dalam satu kalimat | kalimat berangka ditebalkan; batasan bukti menjadi kalimat sendiri; "sekolah menengah pertama" dieja utuh |
| 13 | baris 176 | "alamat berita" ambigu | "alamat tautan berita" |
| 14 | baris 182 | "berposisi program berjalan" | "berposisi sebagai program berjalan" |
| 15 | baris 231 | istilah asing tanpa padanan tidak dimiringkan (PUEBI) | *years of life lost*, *Disability-adjusted life years*, *years lived with disability* dimiringkan |

## Daftar periksa M-1 sampai M-14

| Kode | Hasil |
| --- | --- |
| M-1 | Pasif dipakai untuk pelaku yang tidak relevan ("dikutip", "ditulis berdampingan"); pelaku yang diketahui disebut. Lolos |
| M-2 | "lubang" diganti "celah" (no. 9); "kontinjensi" diseragamkan (no. 8). Lolos sesudah suntingan |
| M-3 | Tidak ada kalimat pertama yang hanya mengulang judul subbab. Lolos |
| M-4 | Tidak ada alternatif palsu. Lolos |
| M-5 | Semua angka data berupa token. Angka yang diketik (34 provinsi lama, nomor pasal, tahun) adalah rujukan, bukan data. Lolos |
| M-6 | Klaim sebab dijaga: Bangladesh "atribusi ke paket belum dievaluasi dengan pembanding"; IRB dan korban "tanpa klaim sebab". Lolos |
| M-7 | Paragraf Kamaishi dipecah (no. 12). Lolos |
| M-8 | Tidak ada subbab templat. Lolos |
| M-9 | Empat rekomendasi di ringkasan menyebut unit, mitra, status, dan tenggat. Lolos |
| M-10 | "Tiga dokumen dirujuk sebagai metode, bukan sebagai program" dilandasi klasifikasi kompendium; "Belum terbukti berarti ..., bukan ..." adalah definisi rubrik. Lolos |
| M-11 | Register formal sepanjang bab; tanpa sapaan. Lolos |
| M-12 | Tebal hanya di kalimat pembuka temuan dan label ringkasan. Lolos |
| M-13 | Tidak ada aforisme atau deret kalimat pendek dramatis. Lolos |
| M-14 | Isi spesifik BNPB (pasal, Renas PB, Renstra, KRB). Lolos |

## Kepatuhan pelajaran wajib (dicek, tidak diubah)

- Bangladesh disebut "berbukti kuat" menurut rubrik kompendium, dengan pembatasan atribusi tertulis; Destana dan SPAB "belum terbukti"; tidak ada program berbukti lemah yang disebut terbukti.
- Angka bertentangan ditulis berdampingan: kapasitas daerah (KRB, RPJMN, Renstra), IRB 2023, Phailin, klaim Asuransi Barang Milik Negara, korban Cianjur.
- Rasio FEMA dilabeli keluaran model; Nankai tidak dikutip angkanya.
- Kewenangan: BNPB dinyatakan bukan regulator keselamatan industri (baris 115).

## Catatan di luar lingkup penyunting

`bangun/kontrak/naskah.py` dijalankan dari CLI tanpa konteks kajian gagal pada kunci
`renas.krb.rasio_jumlah_per_bahaya_multibahaya` (dan 100-an kunci lain yang tidak ada di
`data/angka.json`). Versi HEAD gagal di kunci yang sama, jadi galat itu bukan akibat suntingan
ini. Registri angka kajian mitigasi perlu dicek pemilik pipeline bangun.
