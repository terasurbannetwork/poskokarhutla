# KEPUTUSAN-TIGA-W: Siapa mengerjakan apa di mana, dan pintu tawaran bantuan

Dokumen ini menang atas semua dokumen lain di folder ini. Keputusan pemilik dicatat apa adanya. Hal yang belum diputuskan ada di bagian Q dan tidak dijawab dengan karangan; bawaan sementaranya ditandai **[BAWAAN SEMENTARA]**.

## Masalah

Saat bencana besar, kementerian, TNI dan Polri, NGO, dunia usaha, kampus, dan lembaga internasional hadir bersamaan. Sistem tidak tahu siapa mengerjakan apa di kab mana, jadi tumpang tindih dan wilayah yang tidak tersentuh baru terlihat lewat telepon. Tawaran bantuan (Palu 2018: 85 NGO internasional menawarkan, aturan disampaikan sepotong-sepotong) tidak tercatat dan tidak dicocokkan ke kebutuhan. Di repo: meja `klaster` hanya mencatat dokumen (`src/meja_spek.js:301`), tidak ada register organisasi tunggal (`institusi` hanya kampus dan organisasi relawan), daftar delapan klaster hanya ada sebagai peta kata kunci (`public/fungsi_direktori.js:84`).

## Keputusan pemilik

| No | Keputusan |
| --- | --- |
| K1 | 15 Nov 2026: F3 siapa mengerjakan apa di mana (3W ala OCHA) disetujui. |
| K2 | 15 Nov 2026: F4 pintu bantuan internasional dan dunia usaha disetujui; boleh satu paket dengan F3. |
| K3 | 15 Nov 2026: satu pintu WA masuk ditolak ("jangan"); paket ini tidak membuat router WA. |
| K4 | Paket dokumen dulu, baru kode (AGENTS.md 3.7). |

## Keputusan rancangan (agent, bisa dibatalkan pemilik)

| No | Keputusan | Alasan |
| --- | --- | --- |
| D1 | Satu register organisasi baru `org` untuk aktor luar (kementerian/lembaga, TNI, Polri, NGO nasional, NGO internasional, dunia usaha, kampus, PMI, lembaga PBB/regional). Kampus menautkan `institusi_id` yang sudah ada, tidak disalin. | `institusi` membatasi jenis ke kampus dan organisasi relawan; mengubah CHECK-nya butuh bangun ulang tabel produksi. |
| D2 | Baris 3W = (kejadian `KJ-`, kab4, klaster, organisasi, kegiatan singkat, mulai, selesai, status rencana/berjalan/selesai). Tingkat 3W dulu; 4W (kapan, detail kegiatan) menyusul. | OCHA: hari-hari awal hanya organisasi, klaster, lokasi. |
| D3 | Delapan klaster PB nasional (Keputusan Kepala BNPB 173/2014): kesehatan, pencarian dan penyelamatan, logistik, pengungsian dan perlindungan, pendidikan, sarana prasarana, ekonomi, pemulihan dini; disimpan sebagai konstanta tunggal yang dipakai juga oleh `fungsi_direktori.js`. | Satu sumber daftar. |
| D4 | Isian 3W lewat dua jalur web: staf Pusdalops atau koordinator klaster, dan tautan bertoken per organisasi per kejadian (mirip tautan `/renlap`: token di fragmen `#t=`, disimpan sha-256 di tabel `tw_token`, satu per organisasi per kejadian; berbeda dari uji pilot yang memakai satu token tetap). Tanpa WA. | K3; organisasi luar tidak punya akun. |
| D5 | Tawaran = (kejadian, organisasi, barang dari daftar `BARANG` meja logistik atau "lainnya", jumlah, satuan, syarat, mitra lokal), status masuk, dicocokkan, diterima, dialihkan, ditolak; alasan wajib untuk dialihkan dan ditolak. | Palu 2018. |
| D6 | Pencocokan tawaran ke kebutuhan: daftar baris meja logistik berstatus diminta/disetujui dan permintaan LogPal di kab kejadian dengan barang sama; staf memilih, mesin hanya mengurutkan. | Tidak ada keputusan bantuan oleh mesin. |
| D7 | Tabel per kejadian (`tw_baris`, `tw_token`, `tw_tawaran`, `tw_tawaran_riwayat`) membawa `kejadian_id` FK `sk_kejadian` (aturan Keterpaduan D2); register `org` tidak per kejadian. | Gerbang keterpaduan. |
| D8 | Peta 3W per kab menandai kab terdampak yang belum punya organisasi di klaster tertentu (celah) dan kab dengan lebih dari N organisasi di klaster sama (tumpang tindih, N di Q4). | Tujuan 3W. |

## Pertanyaan terbuka untuk pemilik (Q)

| Q | Pertanyaan | Bawaan sementara | Menahan |
| --- | --- | --- | --- |
| Q1 | Siapa yang memutuskan tawaran diterima, dialihkan, ditolak? | **[BAWAAN SEMENTARA]** staf Kedeputian Penanganan Darurat (peran pusdalops dan koordalops di sistem); tawaran internasional dicatat dengan tanda "lewat AHA Centre" bila datang dari jalur itu. | TW-07 |
| Q2 | Tawaran internasional wajib punya mitra lokal (aturan Palu 2018)? | **[BAWAAN SEMENTARA]** ya, isian mitra lokal wajib untuk NGO internasional; ditolak tanpa itu. | TW-06 |
| Q3 | 3W tampil untuk siapa? | **[BAWAAN SEMENTARA]** staf, BPBD (kab wilayahnya), dan organisasi lewat tautan tokennya (hanya baris miliknya); tidak publik. | TW-08 |
| Q4 | Ambang tumpang tindih? | **[BAWAAN SEMENTARA, HIPOTESIS]** lebih dari 3 organisasi di klaster dan kab yang sama dengan status berjalan. | tidak menahan |
| Q5 | Nilai rupiah tawaran dicatat? | **[BAWAAN SEMENTARA]** tidak; jumlah dan satuan saja. | tidak menahan |
| Q6 | Siapa yang membuat tautan token untuk organisasi? | **[BAWAAN SEMENTARA]** staf Pusdalops, per organisasi per kejadian, berlaku sampai kejadian selesai atau dicabut, paling lama 90 hari sejak terbit (23 Nov 2026, sama dengan batas `src/token.js`; kejadian panjang = terbitkan token baru). | TW-05 |
| Q7 | Alasan penolakan atau pengalihan untuk organisasi dipisah dari catatan internal staf? | **[BAWAAN SEMENTARA]** ya: `alasan_organisasi` tampil ke organisasi, `alasan_internal` hanya staf. | TW-07 |


## Jawaban pemilik 25 Nov 2026

Pemilik: "gas semua bawaan". Semua pertanyaan terbuka di berkas ini yang punya bawaan sementara kini **diputuskan sesuai bawaannya**, kecuali yang tertulis di bawah. Rekap pertanyaan: `data/kajian-bnpb/PERTANYAAN-TERBUKA.md`.

