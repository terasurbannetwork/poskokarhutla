# Lapis (c) penyunting bahasa: mitigasi bab 13 (Kesimpulan dan Rekomendasi)

Tanggal: 25 Okt 2026. Berkas: `naskah/mitigasi/bab-13.md`.

## Vonis slop

- Sebelum sunting: LOLOS, skor 0 (5.170 kata), satu temuan rendah S-18 (tiga-serangkai gaya, baris 107, legenda kode peran). Emulasi gerbang T-9 pada prosa (tabel, metadata direktif, dan judul dikecualikan): 19 singkatan glosarium muncul pertama kali tanpa kepanjangan.
- Sunting antara: satu temuan baru S-30 (48 kata, baris 105) akibat ejaan lengkap Destana, SPAB, dan InaTEWS; kalimat dipecah.
- Sesudah sunting: LOLOS, skor 0 (5.273 kata), nol temuan dalam bentuk apa pun, kata kosong 0,0 per 1.000. Emulasi T-9: nol singkatan tanpa kepanjangan (sisa "Renas"/"PB" adalah positif palsu karena "Renas PB" sudah dieja di ringkasan).
- Perintah: `.venv/bin/python qa/slop.py --final naskah/mitigasi/bab-13.md`.

## Suntingan

| Letak | Sebelum | Sesudah | Alasan |
| --- | --- | --- | --- |
| Ringkasan, temuan 1 | DIBI mencatat | DIBI Badan Nasional Penanggulangan Bencana (BNPB) mencatat | T-9, kemunculan pertama BNPB di bab |
| Kesimpulan, paragraf 1 | DIBI Badan Nasional Penanggulangan Bencana (BNPB) | DIBI BNPB | ejaan dipindah ke kemunculan pertama |
| Kesimpulan, paragraf 2 | Laporan Kinerja (LKIP) BNPB 2025 | LKIP BNPB 2025 | sudah dieja di ringkasan; tidak dieja dua kali |
| Keputusan, paragraf dasar hukum | Renstra BNPB; di luar Progsun | Rencana Strategis (Renstra) BNPB; Program Penyusunan Peraturan (Progsun) | T-9 di prosa (sebelumnya hanya dieja di tabel) |
| KD-2, opsi revisi | capaian 2025 turun ... bila dihitung tertimbang | capaian 2025 yang dihitung tertimbang ... turun | "bila" ganda dalam satu kalimat bersyarat |
| KD-3, opsi Manual IKU | Manual IKU (Kepka BNPB 318/2025); berkategori IKD | Manual Indikator Kinerja Utama (IKU) dalam Kepka BNPB 318/2025; Indeks Ketahanan Daerah (IKD) | T-9 di prosa |
| KD-3, opsi kab/kota | kelas kapasitas KRB | kelas kapasitas Kajian Risiko Bencana (KRB) | T-9 di prosa |
| Paragraf KD-4 | Catatan metode IRBI 2025 | Catatan metode Indeks Risiko Bencana Indonesia (IRBI) 2025 | T-9 |
| Rekomendasi internal, paragraf 1 | Unit mengikuti | Nama unit mengikuti | subjek eksplisit |
| Paragraf program berbukti | Destana dan SPAB belum ditemukan bukti dampaknya ...; dan InaTEWS ... | Bukti dampak Desa Tangguh Bencana (Destana) dan Satuan Pendidikan Aman Bencana (SPAB) belum ditemukan .... *Indonesia Tsunami Early Warning System* (InaTEWS) .... Ketiganya ... | subjek kalimat diluruskan; T-9; S-30 (dipecah jadi tiga kalimat) |
| Legenda kode peran | K koordinator, P pelaksana atau pendukung, R ..., dan I ... | dua kalimat berpasangan (K dan P; R dan I) plus ejaan NSPK | S-18; T-9 untuk NSPK yang dipakai di semua kode peran |
| r-a02 | sehingga BPBD perlu diminta | Badan Penanggulangan Bencana Daerah (BPBD) | T-9 |
| r-a02, langkah pelaksanaan | puncak musim BMKG | puncak musim dari Badan Meteorologi, Klimatologi, dan Geofisika (BMKG) | T-9 |
| r-m03, langkah pelaksanaan | rakor Kemenko PMK | rakor Kementerian Koordinator Bidang Pembangunan Manusia dan Kebudayaan (Kemenko PMK) | T-9 |
| r-m10 | Basarnas | Badan Nasional Pencarian dan Pertolongan (Basarnas) | T-9 |
| r-m11 | Menteri ESDM | Menteri Energi dan Sumber Daya Mineral | T-9 |
| r-m13 | {{angka}} daerah belum ... (kalimat dibuka angka) | Sebanyak {{angka}} daerah belum ... | PUEBI: kalimat tidak dibuka angka |
| r-m16 | RPKB | Rencana Penanggulangan Kedaruratan Bencana (RPKB) | T-9 |
| r-m21 | RIPB ditinjau | Rencana Induk Penanggulangan Bencana (RIPB) ditinjau | T-9 |
| Rekomendasi lintas, paragraf 1 | status KLB | status "kejadian luar biasa" (KLB) | T-9; petik istilah mengikuti bab 8 dan bab 10 |
| r-m15 | penutupan TPA | penutupan tempat pemrosesan akhir (TPA) | T-9 |
| r-m23 | R3P Aceh | Rencana Rehabilitasi dan Rekonstruksi Pascabencana (R3P) Aceh | T-9 |

Token `{{angka:...}}`, rujukan pustaka, rujukan silang `@rek/@tbl/@sub`, dan jangkar `{#...}` tidak berubah (dicek mesin: multiset sebelum dan sesudah sama). Kutipan langsung tidak ada yang disentuh. Tabel, pita keputusan di luar dua kalimat KD-2/KD-3, dan metadata direktif tidak disentuh. Makna tidak diubah.

## Daftar periksa M-1 sampai M-14

- M-1 pasif penyembunyi pelaku: tidak ditemukan; penetap (Kepala BNPB, Menteri Kesehatan, Kementerian Dalam Negeri), pencatat (BPK, LKIP, DIBI), dan unit pemimpin tersebut per rekomendasi.
- M-2 sinonim berputar: istilah konsisten (lantai tercatat, jalur berkala/jalur bencana, program berbukti kuat/sedang, daftar perhatian, hari ke-0).
- M-3 kalimat pertama mengulang judul: tidak ada; subbab dibuka tesis bertoken, dasar hukum keputusan, atau kalimat pembuka tebal berangka (L16).
- M-4 keberatan fiktif: tidak ada; "Yang Sengaja Tidak Direkomendasikan" berisi usulan nyata dari bab analisis, masing-masing bersumber.
- M-5 angka ketik tangan: angka data bertoken; "delapan", "tiga puluh enam", "dua puluh tujuh", "sembilan", "sebelas", "tujuh dari sepuluh" adalah hitungan struktur register atau tabel bab, bukan angka data.
- M-6 sebab dari korelasi: korelasi IRBI dan DIBI ditulis sebagai ketidaksesuaian peringkat; IRB dan korban ditulis "tidak menyimpulkan hubungan arah"; koefisien peringatan dini ditulis rasio asosiasi, bukan efek kausal.
- M-7 paragraf satu gagasan: terpenuhi.
- M-8 subbab templat: tidak ada.
- M-9 rekomendasi: tiap rekomendasi berunit, bertenggat, berindikator, dan berdasar temuan.
- M-10 kontras "X, bukan Y": berlandas ("evaluasi dampak, bukan klaim keberhasilan" dari kekuatan bukti; "ekspektasi, bukan skenario terburuk" dari lantai tercatat; "rujukan tata kelola, bukan program terbukti" dari paket program-terbukti).
- M-11 register: formal ilmiah sepanjang bab.
- M-12 tebal sebagai penekanan: tebal hanya pada kalimat pembuka temuan (L16) dan label ringkasan dan rekomendasi.
- M-13 kalimat bijak kosong: tidak ada.
- M-14 uji tukar logo: tidak berlaku untuk naskah.

Pelajaran wajib: tidak ada program yang disebut "terbukti" tanpa bukti kuat (Destana, SPAB, InaTEWS ditulis sebagai garis dasar dan agenda evaluasi); pita La Niña selalu berdampingan dengan lantai tercatat dan berlabel estimasi model; angka korban LKIP dan DIBI ditulis berdampingan; BNPB disebut penetap persyaratan analisis risiko, bukan regulator keselamatan industri.

## Catatan untuk sesi induk

- `bangun/kontrak/naskah.py` menolak bab ini dengan `kunci angka "dibi.alam.meninggal_hilang.2025" tidak ada di data/angka.json` (baris 15). Galat yang sama muncul pada salinan sebelum sunting; token tidak disentuh. Kuncinya perlu ditambahkan pemilik paket angka (kemungkinan kunci lain menyusul setelah yang ini dibetulkan).
- Progsun, IKU, Destana, dan rakor tidak berentri di `data/glosarium.json`; Progsun, IKU, dan Destana dieja di bab ini. Glosarium di luar cakupan lapis ini.
- Tabel `tbl:belum-diketahui`: paragraf pengantar menyebut empat kelompok sisa "tetap sebagai permintaan data", tetapi satu baris (Penduduk BPS per kab/kota) bertindak lanjut "penyebut nasional BPS 2026 dipakai". Tidak disunting karena menyangkut isi; perlu dicek lapis substansi.
