# Berkas bukti BAB 7 BENCANA HIDROMETEOROLOGI

Kajian: Grand Design Mitigasi Bencana Indonesia 2026–2030 (BNPB; pembaca utama Kepala BNPB).
Disusun peneliti 24 Oktober 2026 untuk penulis bab (PEDOMAN-DESAIN §C9). Penulis bab menulis hanya dari berkas ini
dan dari registri angka; klaim yang tidak ada di sini ditolak penyunting substansi.

Berkas pendamping:

- `naskah/mitigasi/bukti/bab-07.angka.json`: kunci angka baru untuk registri (belum digabung ke `data/angka.json`).
- `naskah/mitigasi/bukti/bab-07.pustaka.json`: entri CSL-JSON (27 sumber).

Bahan yang dibaca: `KERANGKA.md` §2, §5 (Bab 7), §6, §7, §8; `KEPUTUSAN.md`; Buku Pegangan L56–L64 (titik tengah
dilarang, angka kunci di depan); `PEDOMAN-DESAIN.md` §C9 dan tabel kode grafik G1–G25; `riset/A`–`E`; paket
`data/skenario-hidromet/` (README, `kartu_skenario.csv`, `musim_hujan.csv`, `kepekaan_peringatan_dini.csv`,
`karhutla_provinsi.csv`, `dibi_kab_tahun.csv`, `kalender_bulanan_pulau.csv`), `data/dibi/` (`rekap_nasional_tahunan.csv`,
`kejadian_besar.csv`), `data/irbi/irbi_kab_2025.csv`, `data/program-terbukti/kompendium_program.csv` dan
`bukti_dampak.csv`, `data/angka.json`; berkas bukti mitigasi Bab 1–4 dan kajian air Bab 3, 5, 6, 7 (supaya kunci tidak
berganda); korpus `data/raw/hukum/teks/perban-nomor-1-tahun-2025.json` (Renas PB), `perban-nomor-5-tahun-2025.json`
(Renstra), `perban-nomor-2-tahun-2024.json` (sistem peringatan dini); cache `riset/mentah/oni_cpc.txt` dan
`riset/mentah/sipongi_luas_2015_2026.json`; `public/data/luas_resmi.json`; sumber web yang dibuka 24 Oktober 2026
(disebut per butir).

## Konvensi label

| Label | Arti |
| --- | --- |
| resmi | Instansi pemerintah RI, dokumen atau tabel dibuka langsung |
| terverifikasi | Sumber primer non-pemerintah RI yang dibuka (jurnal bertinjauan, Bank Dunia, NOAA, WMO) |
| estimasi-model | Keluaran model yang belum diuji balik terhadap data Indonesia (termasuk model peneliti bertinjauan) |
| asumsi-kebijakan | Pilihan penyusun (aturan pemilihan analog, ambang, koefisien R) |
| sekunder | Berita atau kutipan pihak lain; sumber primer tidak terbuka. **Tidak masuk badan teks**, hanya pembanding atau celah, dan tidak masuk registri |
| olah(x) | Hitungan tim dari angka berlabel x; rumus disebut |

Bagian "Inferensi" adalah penilaian tim peneliti, bukan temuan sumber, dan ditandai **[Inferensi tim]**.

Konvensi angka hidrometeorologi di berkas ini:

- **Musim hujan** = 1 Oktober tahun Y sampai 30 April Y+1, jenis banjir, banjir bandang, longsor, "banjir dan tanah
  longsor", cuaca ekstrem (`skenario-hidromet/README.md` §Metode). Musim acuan 18: 2008/2009–2025/2026.
- **Angka per tahun per jenis** dari `dibi/rekap_nasional_tahunan.csv` cakupan `bencana`; patahan kategori 2018 dan 2024
  berlaku (Banjir Bandang, Banjir dan Tanah Longsor, Banjir Rob, Puting Beliung muncul 2018, kosong 2024; Tanah Longsor
  2024 hanya 207 kejadian). Tahun 2026 sementara, ditarik 23 Oktober 2026.
- **Model rasio** paket (`korban_jiwa`): Σ kejadian analog × rasio (meninggal + hilang)/kejadian DIBI 2010–2025 per jenis;
  batas tinggi menyisihkan tahun terburuk tercatat; belum diuji balik. Selalu ditulis berdampingan dengan angka tercatat.

---

## Kerangka bab (dari KERANGKA.md §5, BAB 7)

- **Judul:** BAB 7 BENCANA HIDROMETEOROLOGI (19 hlm; KERANGKA §5 versi 24 Okt 2026).
- **Subbab:** 7.1 Banjir dan Banjir Bandang; 7.2 Tanah Longsor; 7.3 Cuaca Ekstrem; 7.4 Gelombang Ekstrem, Abrasi, dan
  Rob; 7.5 Kekeringan; 7.6 Kebakaran Hutan dan Lahan; 7.7 Kartu Agregat Musim Hujan; 7.8 Kartu Agregat Musim Kemarau;
  7.9 Kepekaan Peringatan Dini; 7.10 Kesenjangan Spesifik dan Implikasi. Tiap subbab jenis 7.1–7.6 ditutup kartu per
  jenis (KERANGKA §2 butir 9, "satu jenis satu kartu").
- **Tujuan bab:** menetapkan lantai skenario hidrometeorologi dari kejadian nyata dan menyiapkan 2026/2027.
- **Pertanyaan kunci:**
  1. Seberapa berat musim hujan tercatat terburuk dan kejadian tunggal terburuk?
  2. Apa yang diharapkan pada musim 2026/2027 dan kemarau 2027?
  3. Berapa korban dapat ditekan dengan cakupan peringatan dini menurut target Renstra dan target Renas?
  4. Apa beban karhutla yang dapat dinyatakan dengan data yang ada?
- **Temuan kunci yang diharapkan (KERANGKA) dan status setelah diperiksa:**

| Temuan yang diharapkan | Status setelah diperiksa |
| --- | --- |
| Kartu 7.1: musim 2025/26 1.506 meninggal, 186 hilang, 1.043.740 mengungsi, RB 65.929, RS 57.141, RR 131.235; Sumatra Nov 2025 1.202 + 140, 970.876 mengungsi, RB 63.019; model rasio 396–954 (2025/26) dan 525–1.204 (2020/21) | Dikonfirmasi semua angka. **Ditambah:** Sumatra = 79,3% meninggal dan hilang musim 2025/2026; lantai 1.692 = 2,8 kali musim terberat kedua (600, 2018/2019) dan 5,6 kali median 18 musim (301,5); banjir saja tercatat 1.421 lawan model banjir 229–580 (P1) |
| Kartu 7.2: musim setelah El Niño kuat, 2009/10 (322 + 51), 2015/16 (144 + 55), 2023/24 (212 + 34); kenaikan kejadian musim berikutnya (2016/17, 2024/25) | Angka dikonfirmasi. **Dikoreksi:** tiga musim itu adalah musim hujan *dengan* El Niño kuat berlangsung (ONI NDJ ≥ 1,5), sama dengan posisi 2026/2027; kenaikan kejadian musim berikutnya terjadi 2016/17 (+53,6%) dan 2024/25 (+148,2%) tetapi tidak 2010/11 (−2,5%). Kartu 7.2 bukan skenario terburuk: lantai 1.692 tetap berlaku (prinsip 9) (P2) |
| Kekeringan (Kartu 7.3): terdampak terbesar 2018 (7.798.763, DIBI); KRB bahaya tinggi 30.002.273 ha; korban jiwa tidak berlaku; kepekaan kemarau tahun kedua 2027 | Dua angka pertama dikonfirmasi. **Dibantah:** "korban jiwa tidak berlaku". DIBI mencatat 6 meninggal kekeringan di Kab. Puncak 2023 dan 2 di Sumba Timur 2010; lantai korban kekeringan = 6 (Bahan subbab 7.4–7.5). Baris kepekaan kemarau tahun kedua dibuat di P2 butir 14 |
| Karhutla (Kartu 7.5) 2015: 2.611.411 ha, US$16,1 miliar (1,9% PDB), ISPA 450.431, meninggal DIBI provinsi asap 12; 2019: 1.649.258 ha, US$5,2 miliar, ISPA 919.516; Koplitz 91.600 (24.000–159.200) di kartu | Luas, kerugian, dan DIBI dikonfirmasi; Koplitz dikonfirmasi (riset E §E15, dibuka ulang 24 Okt 2026), dengan koreksi: paparan Juli–Oktober 2015 dan kematian dewasa saja (P4 butir 3). **Dibantah:** ISPA 450.431 dan 919.516 hanya bersumber pers, rilis BNPB asli tidak ditemukan; versi Badan Keahlian DPR (686.723) juga rangkuman pers. Ketiganya sekunder: tidak masuk badan teks, kartu, atau registri, hanya catatan Tabel 7.1 dan Celah (P4) |
| Banjir dan banjir bandang (Kartu 7.6), tanah longsor (Kartu 7.7), cuaca ekstrem (Kartu 7.8): lantai kejadian tunggal dan tahun tercatat terburuk dari `lantai_jenis.csv` | **Belum dapat diisi:** `skenario-hidromet/lantai_jenis.csv` belum ada di paket (diperiksa 24 Okt 2026). Angka lantai per jenis tidak diketik di naskah sampai turunan itu ada; P1 butir 9 hanya kandidat untuk memeriksa turunan, tidak masuk registri |
| Gelombang dan rob nasional: 4 meninggal tercatat pada musim analog; KRB terpapar gelombang 4.129.597 | Angka dikonfirmasi. **Dibantah sebagai lantai:** tahun gelombang tercatat terburuk 2011, 4 meninggal dan 32 hilang (36); kartu tidak boleh memakai 4 (Bahan subbab 7.4–7.5) |
| Kepekaan peringatan dini dua lintasan per jenis; longsor tidak dihitung | **Belum ada di paket:** `kepekaan_peringatan_dini.csv` menghitung total musim termasuk longsor dan tidak dipecah per jenis. Dihitung di berkas ini (olah, P3) |

- **Komponen (KERANGKA):** Gambar 7.1 peta kecil berganda IRBI 2025 banjir, longsor, kekeringan, karhutla (G19); Gambar 7.2
  meninggal dan hilang per musim hujan nasional 2008/09–2025/26 dengan penanda La Niña dan El Niño kuat (G1); kartu per
  jenis (B5.11), masing-masing dengan lantai kejadian tunggal dan tahun tercatat terburuk, empat besaran P10 (korban jiwa,
  luas terdampak, kerugian materiil, kerugian imateriil), dan baris kepekaan: Kartu 7.6 banjir dan banjir bandang, 7.7
  tanah longsor, 7.8 cuaca ekstrem, 7.4 gelombang ekstrem, abrasi, rob (ringkas), 7.3 kekeringan, 7.5 karhutla; kartu
  agregat operasional (B5.11): Kartu 7.1 musim hujan tercatat terburuk nasional dan 7.2 musim hujan 2026/2027; Gambar 7.3
  kepekaan peringatan dini dua lintasan per jenis (G14); Tabel 7.1 luas, kerugian, ISPA karhutla per provinsi asap 2015
  dan 2019 (B5.7).
- **Status data (KERANGKA):** ada (termasuk Koplitz dkk. 2016); sebagian (lantai per jenis menunggu `lantai_jenis.csv`);
  celah (luas genangan rob di luar WS Jratunseluna; puso; debit sungai). Luas rawan rob resmi ada untuk satu WS
  (Jratunseluna 22.897 ha, hasil simulasi).

Catatan lingkup: prinsip 17 berlaku. Bab ini berhenti di bahaya, histori, status resmi, kartu, kesenjangan spesifik, dan
implikasi. Program (InaTEWS, Sekolah Lapang Iklim, MPA/Desa Bebas Api, sekat kanal, kesiapsiagaan siklon Bangladesh)
hanya dicatat posisi buktinya supaya penulis tidak menyebutnya "terbukti".

---

## P1. Seberapa berat musim hujan tercatat terburuk dan kejadian tunggal terburuk?

### Inti

Musim hujan 2025/2026 adalah yang terberat dalam 18 musim acuan: 1.506 meninggal dan 186 hilang (1.692), 1.043.740
mengungsi (jumlah semusim, bukan serentak), dan 65.929 rumah rusak berat, sehingga 1.692 menjadi lantai skenario terburuk hidrometeorologi nasional;
angka itu 2,8 kali musim terberat kedua (600, 2018/2019) dan 1,8 kali batas atas model rasio untuk musim yang sama (954).
Kejadian tunggal terburuk adalah banjir dan longsor Aceh, Sumatera Utara, dan Sumatera Barat akhir November 2025: 1.202
meninggal dan 140 hilang (79,3% korban musim itu), 970.876 mengungsi, 63.019 rumah rusak berat. Musim itu bukan musim
La Niña (ONI NDJ −0,60, bukan episode CPC), jadi fase ENSO tidak cukup sebagai penanda musim terburuk.

### Temuan bersumber

1. **Seri 18 musim hujan nasional (meninggal + hilang):**

   | Musim | ONI NDJ | La Niña | Kejadian | Meninggal | Hilang | M + H | Mengungsi | Rumah RB |
   | --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: |
   | 2008/2009 | −0,79 | ya | 810 | 232 | 110 | 342 | 234.876 | 9.526 |
   | 2009/2010 | 1,50 | – | 1.148 | 322 | 51 | 373 | 266.551 | 10.472 |
   | 2010/2011 | −1,48 | ya | 1.119 | 439 | 160 | 599 | 199.970 | 9.618 |
   | 2011/2012 | −0,92 | ya | 1.098 | 190 | 18 | 208 | 149.153 | 6.952 |
   | 2012/2013 | −0,03 | – | 1.094 | 285 | 29 | 314 | 292.128 | 6.590 |
   | 2013/2014 | −0,11 | – | 1.232 | 343 | 54 | 397 | 614.407 | 6.658 |
   | 2014/2015 | 0,80 | – | 1.523 | 253 | 36 | 289 | 246.462 | 3.142 |
   | 2015/2016 | 2,59 | – | 1.310 | 144 | 55 | 199 | 247.675 | 2.494 |
   | 2016/2017 | −0,37 | – | 2.012 | 179 | 60 | 239 | 189.994 | 4.317 |
   | 2017/2018 | −0,76 | ya | 2.167 | 257 | 24 | 281 | 171.273 | 7.992 |
   | 2018/2019 | 1,05 | – | 2.503 | 475 | 125 | 600 | 115.851 | 4.995 |
   | 2019/2020 | 0,75 | – | 2.549 | 198 | 13 | 211 | 573.336 | 6.030 |
   | 2020/2021 | −1,06 | ya | 3.077,5 | 465 | 72 | 537 | 508.914 | 13.675 |
   | 2021/2022 | −0,83 | ya | 2.888,5 | 159 | 14 | 173 | 197.634 | 3.148 |
   | 2022/2023 | −0,70 | ya | 2.545,5 | 244 | 24 | 268 | 388.330 | 3.815 |
   | 2023/2024 | 1,99 | – | 1.630,5 | 212 | 34 | 246 | 359.202 | 5.362 |
   | 2024/2025 | −0,43 | – | 4.046,3 | 362 | 36 | 398 | 131.366 | 5.188 |
   | 2025/2026 | −0,60 | – | 2.598,5 | 1.506 | 186 | 1.692 | 1.043.740 | 65.929 |

   Sumber: `skenario-hidromet/musim_hujan.csv` (baris `wilayah=nasional`); DIBI BNPB ditarik 23 Okt 2026; ONI NOAA CPC.
   Label: resmi (DIBI); terverifikasi (ONI); kolom M + H olah(resmi). La Niña = NDJ bagian episode CPC (≥ 5 musim tumpang
   ≤ −0,5); 2025/2026 bukan episode (hanya 3 musim). Kejadian pecahan karena DIBI membagi kejadian lintas kab.
2. **Lantai nasional = 1.692 meninggal dan hilang (2025/2026)**, juga terbesar dalam 10 musim terakhir; mengungsi dan rumah
   rusak berat juga terbesar di musim yang sama, tetapi menderita terbesar 2008/2009 (9.389.379) dan kejadian terbanyak
   2024/2025 (4.046,3). Sumber: `skenario-hidromet/kartu_skenario.csv` baris `musim_hujan_lantai, nasional`;
   `kunci: hidromet.nasional.lantai.meninggal_hilang`, `kunci: hidromet.nasional.lantai.musim`,
   `kunci: hidromet.nasional.lantai.meninggal_hilang_10_musim` (sudah di registri); `kunci: hidromet.nasional.musim_2025.mengungsi`,
   `kunci: hidromet.nasional.musim_2025.rumah_rb` (usulan bab-03). Label: resmi.
3. **Kartu 7.1, metrik lengkap musim 2025/2026:** kejadian 2.598,5; meninggal 1.506; hilang 186; menderita 8.242.120;
   mengungsi 1.043.740 (jumlah pengungsi tercatat semusim dari 2.598,5 kejadian, bukan pengungsi serentak); rumah RB
   65.929, RS 57.141, RR 131.235; hari mengungsi 7.306.180 (3.131.220–31.312.200; mengungsi × 7 hari, rendah 3, tinggi
   30). Paket juga menghitung stimulan rumah semua jenis Rp6,04–7,64 T (RB/RS/RR × skema 50/25/10 juta dan 60/30/15 juta),
   tetapi angka itu didominasi banjir genangan (1.421 dari 1.692 korban), sedangkan KERANGKA §2 butir 9 (c) membatasi
   stimulan rumah pada gempa, longsor, dan banjir bandang. **Penyajian:** stimulan semua jenis tidak tampil di Kartu 7.1;
   stimulan khusus longsor dan banjir bandang menunggu rumah rusak per jenis (tidak ada di `kartu_skenario.csv`; Celah).
   Sumber: `kartu_skenario.csv` baris `musim_hujan_terberat_tercatat, nasional`; `public/banjir/data/param_banjir.json`
   (hari mengungsi, stimulan); kunci baru `hidromet.nasional.musim_2025.*`, `hidromet.nasional.terberat.hari_mengungsi`,
   `hidromet.nasional.terberat.stimulan_rumah_semua_jenis` (jalur ke metrik paket `materiil_batas_bawah`; bukan kerugian
   materiil). Label: resmi (DIBI); asumsi-kebijakan (hari mengungsi, stimulan).
4. **Komposisi lantai per jenis (2025/2026):** banjir 1.421; longsor 202; cuaca ekstrem 40; banjir bandang 26; "banjir dan
   tanah longsor" 3 (jumlah 1.692). Sumber: `kartu_skenario.csv` baris `musim_hujan_terberat_tercatat, nasional,
   meninggal_hilang_tercatat_<jenis>`; `kunci: hidromet.nasional.terberat.meninggal_hilang_tercatat_banjir` (usulan bab-03),
   kunci baru untuk empat jenis lain. Label: resmi. Catatan: patahan kategori membuat banjir bandang dan "banjir dan tanah
   longsor" tidak sebanding antartahun.
5. **Model rasio lawan tercatat, musim yang sama:**

   | Musim | Model korban (rendah–tinggi) | Tercatat M + H | Tercatat ÷ batas tinggi |
   | --- | ---: | ---: | ---: |
   | 2025/2026 (terberat) | 395,8–954,3 | 1.692 | 1,77 |
   | 2025/2026, banjir saja | 229,3–580,1 | 1.421 | 2,45 |
   | 2020/2021 (La Niña analog) | 524,8–1.203,8 | 537 | 0,45 |
   | 2020/2021, longsor saja | 250,0–545,9 | 153 | 0,28 |

   Sumber: `kartu_skenario.csv` baris `korban_jiwa*` dan `meninggal_hilang_tercatat_*`; `kunci: hidromet.nasional.lanina.korban_jiwa`
   (registri), `kunci: hidromet.nasional.terberat.korban_jiwa`, `kunci: hidromet.nasional.terberat.korban_jiwa_banjir` (usulan
   bab-03). Label: estimasi-model (belum diuji balik) lawan resmi; rasio olah. Kartu paket sendiri menulis: "pembanding musim
   berat tipikal, bukan skenario terburuk: batas tinggi di bawah lantai tercatat (1692 jiwa)". **Dibantah oleh** KERANGKA §2
   butir 9: metode paket menyisihkan tahun terburuk tercatat, padahal penyisihan hanya boleh untuk peluang lima tahun < 0,2%.
6. **Musim terberat tetap 2025/2026 dengan atau tanpa rekaman Kota Bekasi 1 Jan 2020** (366.274 mengungsi, status tidak
   terbukti di `dibi/rekonsiliasi.csv`); tanpa rekaman itu, mengungsi 2019/2020 turun dari 573.336 ke 207.062. Sumber:
   `kartu_skenario.csv` baris `uji_kepekaan_bekasi, nasional`. Label: resmi (angka); asumsi-kebijakan (aturan pemilihan).
7. **Kejadian tunggal terburuk, banjir dan longsor Sumatra 15 Nov–31 Des 2025** (Aceh, Sumatera Utara, Sumatera Barat):
   77 kejadian (pecahan DIBI), 1.202 meninggal, 140 hilang, 4.679.735 menderita, 970.876 mengungsi, rumah RB 63.019, RS 53.596,
   RR 111.645; stimulan rumah semua jenis Rp5,61–7,06 T (banjir dan longsor tidak dipisah; tidak tampil di kartu sampai
   rumah rusak longsor dan banjir bandang terpisah). Mengungsi 970.876 juga jumlah lintas laporan kab, bukan pengungsi
   serentak. Porsi terhadap musim: 1.342/1.692 = 79,3%. Sumber: `kartu_skenario.csv` baris
   `kasus_sumatra_nov2025`; `kunci: dibi.sumatra2025.meninggal`, `kunci: dibi.sumatra2025.hilang` (registri),
   `kunci: dibi.sumatra2025.mengungsi`, `kunci: hidromet.sumatra2025.rumah_rusak_berat` (usulan bab-01/04); kunci baru
   `hidromet.sumatra2025.porsi_musim_2025`, `hidromet.sumatra2025.stimulan_rumah_semua_jenis`. Label: resmi; porsi
   olah(resmi); stimulan asumsi-kebijakan.
   **Ditulis berdampingan:** `dibi/kejadian_besar.csv` (jendela 22 Nov–31 Des, semua laporan) mencatat RB 62.956 dan 55
   kab/kota; BNPB per 12 Jan 2026 (via Suara Surabaya) 1.189 meninggal dan 141 hilang [sekunder]; Buletin Info Bencana
   Desember 2025 hlm. 6, Aceh saja, 527 meninggal dan 31 hilang [resmi, satu provinsi].
8. **Kejadian hidrometeorologi besar lain di DIBI (pembanding, bukan lantai):** Wasior Okt 2010 170 meninggal dan 118 hilang;
   Seroja Apr 2021 154 dan 34 (Renstra hlm. 11: 184 dan 47); Jakarta Jan 2013 38; Jabodetabek awal 2020 51 (Renstra: 61);
   Demak 2024 11. Sumber: `dibi/kejadian_besar.csv`; `kunci: dibi.wasior2010.*`, `kunci: dibi.seroja2021.*`,
   `kunci: renstra.seroja2021.*`, `kunci: dibi.jabodetabek2020.meninggal` (usulan bab-03/04). Label: resmi.
9. **Lantai per jenis: menunggu `lantai_jenis.csv`.** KERANGKA §2 butir 9 mewajibkan tiap kartu per jenis memuat lantai
   kejadian tunggal tercatat terburuk dan tahun tercatat terburuk dari turunan `skenario-hidromet/lantai_jenis.csv`, dan
   angka itu tidak diketik di naskah sebelum turunan ada. Turunan itu belum ada di paket (diperiksa 24 Okt 2026). Angka di
   bawah hanya **kandidat untuk memeriksa turunan** saat dibuat; tidak untuk naskah, kartu, atau registri.
   - *Tahun terburuk (kandidat, `dibi/rekap_nasional_tahunan.csv` kode 101–106, cakupan bencana 2008–2025):* banjir 2025
     (1.396 + 189 = 1.585); longsor 2014 (331 + 23 = 354); cuaca ekstrem 2025 (80 + 1 = 81); banjir bandang 2021 (90,
     cache paket `dibi_kab_tahun.csv`); gelombang dan abrasi 2011 (4 + 32 = 36); kekeringan 2023 (6); karhutla 2015 (24).
     Angka cache paket (semua laporan) dapat berbeda satu atau dua jiwa dari rekap cakupan bencana (banjir 2025: 1.584
     lawan 1.585).
   - *Kejadian tunggal terburuk (kandidat, hanya dari daftar `dibi/kejadian_besar.csv` yang jendela dan wilayahnya dipilih
     penyusun paket, bukan pemindaian seluruh peristiwa DIBI):* banjir dan longsor majemuk, Sumatra Nov 2025 (1.202 + 140,
     `kartu_skenario.csv`; dicatat di kartu banjir dan kartu longsor sebagai kejadian majemuk); banjir bandang, Wasior Okt
     2010 (170 + 118; DIBI mengategorikannya Banjir, sebelum kategori Banjir Bandang 2018); longsor, Serasan (Natuna) Mar
     2023 (43 + 4); cuaca ekstrem, Siklon Tropis Seroja Apr 2021 (DIBI 154 + 34; Renstra hlm. 11 184 + 47); gelombang dan
     abrasi, Jepara 2011 (1 + 31, satu kejadian, `dibi_kab_tahun.csv`); kekeringan, Kab. Puncak 2023 (6, satu kejadian);
     karhutla: tidak ada kejadian tunggal (DIBI mencatat per kab, kartu memakai tahun 2015).
   - Label: resmi (DIBI); jumlah olah(resmi). Kunci `dibi.nasional.<jenis>.meninggal_hilang_maks` **ditahan dari registri**
     sampai `lantai_jenis.csv` dibuat; kunci kejadian yang sudah diusulkan berkas lain (`dibi.wasior2010.*`,
     `dibi.seroja2021.*`, `dibi.sumatra2025.*`) tetap dipakai untuk pembanding kejadian besar (butir 8).
10. **Kemungkinan lantai.** Dengan posisi plot Weibull, peluang paling sedikit satu musim seburuk 2025/2026 dalam 5 musim
    1 − (18/19)^5 = 23,7% (pita 4 NRR); La Niña dalam jendela 5 tahun 84,7% (pita 5). Sumber: berkas bukti bab-03 P2;
    `kunci: hidromet.nasional.lantai.peluang_5_musim`, `kunci: enso.lanina_ndj_porsi_jendela5` (usulan). Label:
    asumsi-kebijakan.
11. **Kelas dampak kependudukan.** Pita fatalitas Cabinet Office (≤ 8, 9–40, 41–200, 201–1.000, > 1.000) yang dipilih Bab 3:
    lantai nasional 1.692 dan kasus Sumatra 1.342 jatuh di skor 5. Sumber: pustaka `cabinetoffice-2025-nrr` hlm. 14 Tabel 3;
    bukti bab-03 P2. Label: asumsi-kebijakan.

### Inferensi

- **[Inferensi tim]** Lantai musim hujan nasional ditentukan oleh satu kejadian: tanpa Sumatra November 2025, musim
  2025/2026 bernilai 350 meninggal dan hilang, sedikit di atas median 18 musim (301,5) dan jauh di bawah 2010/2011 (599)
  dan 2018/2019 (600). Artinya risiko korban hidrometeorologi nasional didorong oleh ekor kejadian tunggal berskala provinsi,
  bukan oleh jumlah kejadian; ini sejalan dengan temuan Bab 4 (korelasi peringkat kejadian dan meninggal 0,22).
- **[Inferensi tim]** Model rasio tidak menangkap kejadian katastrofik secara struktural, bukan karena kalibrasi: batas
  tingginya dibuat dengan menyisihkan tahun terburuk tercatat. Untuk musim La Niña tipikal model malah di atas tercatat
  (2020/2021: 525–1.204 lawan 537). Penulis menulis kalimat wajib KERANGKA: "metode ini tidak menangkap kejadian
  katastrofik", dan model hanya kolom pembanding di Kartu 7.1, tidak di judul.
- **[Inferensi tim]** Musim terburuk terjadi di luar episode La Niña. Penyebab meteorologis kejadian Sumatra hanya
  bersumber pers (lihat Celah), sehingga naskah tidak menyebut pemicunya; yang dapat ditulis adalah bahwa ONI NDJ −0,60
  tidak memenuhi definisi episode CPC.
- **[Inferensi tim]** Rancangan Kartu 7.1 (B5.11, tiga blok Perban 2/2023 Pasal 7, pustaka `bnpb-2023-renkon`): kolom "musim tercatat terburuk 2025/2026"
  (resmi) sebagai skenario; kolom "kasus Sumatra 2025" (resmi); kolom "model rasio" berpil estimasi-model. Baris
  kebutuhan respons: KERANGKA §2 butir 9 meminta pengungsi tercatat puncak tanggap darurat, dan angka itu **tidak tersedia
  di DIBI** (DIBI menjumlah pengungsi per laporan). Kartu menulis "puncak serentak tidak tersedia di DIBI" dan, sebagai
  pembanding berlabel, jumlah pengungsi tercatat per kejadian Sumatra 970.876 (jumlah lintas laporan kab) serta jumlah
  semusim 1.043.740 (bukan serentak); keduanya batas atas, bukan kebutuhan logistik serentak. Kelas dampak kependudukan
  5; aspek ekonomi "tidak dinilai" atau batas atas KRB berlabel.

### Celah

- Pemicu meteorologis kejadian Sumatra (Siklon Tropis Senyar, peringatan BMKG delapan hari sebelumnya) hanya ditemukan di
  pers (detik.com, bisnis.com, jpnn.com, 28 Nov–1 Des 2025) [sekunder]; siaran BMKG aslinya tidak ditemukan di daftar siaran
  pers yang dapat dibuka (halaman 1 hanya mundur ke 6 Sep 2026). **Penyajian:** tidak disebut. **Permintaan:** BMKG
  (Kedeputian Meteorologi) untuk laporan kejadian dan rekaman peringatan.
- PDNA atau R3P kejadian Sumatra 2025 tidak ditemukan; kerugian ekonomi kejadian tidak ada. **Penyajian:** stimulan rumah
  sebagai batas bawah berlabel asumsi-kebijakan. **Permintaan:** Deputi Bidang Rehabilitasi dan Rekonstruksi.
- Patahan kategori DIBI 2018 dan 2024 membuat jenis banjir bandang dan "banjir dan tanah longsor" tidak sebanding
  antartahun; lantai per jenis untuk dua jenis itu tidak ditulis di kartu, hanya total musim.
- `skenario-hidromet/lantai_jenis.csv` (kejadian tunggal dan tahun tercatat terburuk per jenis, KERANGKA §10) belum
  dibuat; Kartu 7.5–7.8 dan 7.3, 7.4 tidak dapat diisi lantainya. **Permintaan:** pengerja paket `skenario-hidromet`.
- Rumah rusak per jenis untuk musim 2025/2026 dan kasus Sumatra tidak ada di `kartu_skenario.csv`, sehingga stimulan
  rumah longsor dan banjir bandang (KERANGKA §2 butir 9 (c)) tidak dapat dihitung. Pengungsi puncak serentak tidak ada
  di DIBI.

---

## P2. Apa yang diharapkan pada musim 2026/2027 dan kemarau 2027?

### Inti

Musim hujan 2026/2027 dimulai di bawah El Niño sangat kuat: ONI JAS 2026 = 2,16, tertinggi di seri JAS 1950–2026
(NOAA), indeks ENSO BMKG JAS +2,63 dan ASO +3,08; BMKG memprakirakan awal musim mundur di 529 ZOM (61,08% luas wilayah), sebagian
besar Jawa mulai Desember dan berpuncak Februari 2027, dan CPC (8 Okt 2026) memprakirakan El Niño kuat sampai sangat kuat
bertahan sampai Januari–Maret 2027. Tiga musim analog dengan El Niño kuat (2009/10, 2015/16, 2023/24) mencatat 199–373
meninggal dan hilang, di bawah lantai; karena itu Kartu 7.2 adalah kartu ekspektasi, sedangkan skenario terburuk tetap
lantai 1.692. Kemarau 2027 tidak punya dasar prakiraan fase ENSO resmi; dari delapan El Niño kuat (ONI NDJ ≥ 1,5) sejak
1950 tidak satu pun bertahan ke JAS tahun berikutnya, tetapi El Niño dua tahun pernah tercatat (1986–1987, JAS 1987 1,46),
sehingga lantai kemarau diambil dari tercatat terburuk: kekeringan 2018 (7.798.763 terdampak) dan 2023 (6 meninggal),
karhutla 2015, dengan baris kepekaan kemarau tahun kedua yang kemungkinannya "tidak dinilai".

### Temuan bersumber

**Kondisi iklim saat bab ditulis**

1. **BMKG, 22 Sep 2026:** anomali Niño3.4 akhir Agustus +2,83; indeks ENSO JAS +2,63 (El Niño sangat kuat); IOD Agustus
   +0,376 menuju positif. Awal musim hujan mundur di 529 ZOM (61,08% luas wilayah), maju 11 ZOM (1,12% luas), sama 26
   ZOM; awal November 185 ZOM, Desember 266 ZOM; puncak Desember 155 ZOM, Januari 162 ZOM, Februari 190 ZOM; sifat hujan
   normal 510 ZOM (69,76% luas daratan), atas normal 147 ZOM (18,55% luas daratan), bawah normal 42 ZOM (11,69%); durasi
   lebih pendek di 482 ZOM (51,90% luas daratan). Semua persentase siaran adalah persen luas daratan, bukan persen
   jumlah ZOM; siaran tidak menyebut total ZOM, sehingga porsi ZOM tidak dapat dihitung. Jawa mulai sebagian
   November dan sebagian besar Desember, puncak sebagian Januari dan sebagian besar Februari 2027; HTH > 60 hari di 25
   provinsi, terpanjang 131 hari (Bantul). Rekomendasi ke pemda memuat kesiapan evakuasi banjir dan longsor pada awal dan
   puncak musim. Sumber: pustaka `bmkg-2026-siaran-musim-hujan`, dibuka ulang 24 Okt 2026; `kunci: bmkg.musim_2026.*`
   (usulan bab-01); kunci baru `bmkg.musim_2026.persen_atas_normal` (satuan % luas daratan). Label: resmi. Catatan:
   subtotal ZOM per kategori tidak saling menjumlah; kutip per kategori dengan "luas wilayah/daratan" (riset E §E9).
2. **BMKG, Analisis Dinamika Atmosfer Dasarian I Oktober 2026 (13 Okt):** Niño 3.4 dasarian +3,33; indeks ENSO ASO +3,08
   ("intensitas sangat kuat"); IOD +0,703. Peringatan dini kekeringan meteorologis dasarian II Oktober: kategori Awas di
   sebagian kab/kota pada 22 provinsi (Sumatera Selatan, Bangka Belitung, Lampung, Banten, DKI Jakarta, Jawa Barat, Jawa
   Tengah, DI Yogyakarta, Jawa Timur, Bali, NTB, NTT, Kalimantan Tengah, Kalimantan Selatan, Sulawesi Utara, Gorontalo,
   Sulawesi Tengah, Sulawesi Selatan, Sulawesi Tenggara, Maluku, Maluku Utara, Papua Selatan). Sumber: pustaka
   `bmkg-2026-dinamika-okt1`, dibuka 24 Okt 2026; `kunci: bmkg.dasarian_okt1_2026.nino34` (usulan air bab-05); kunci baru
   `bmkg.dasarian_okt1_2026.enso_aso`, `bmkg.pdkm_okt2_2026.prov_awas_nasional`. Label: resmi.
3. **NOAA CPC, ENSO Diagnostic Discussion 8 Okt 2026:** status El Niño Advisory; El Niño menguat, kuat sampai sangat kuat
   kemungkinan bertahan sampai Januari–Maret 2027; Niño-3.4 bulanan +2,1 °C; peluang kejadian historis (RONI tiga bulan
   ≥ +2,5 °C) 83% untuk Oktober–Desember 2026 dan 70% untuk November–Januari. Halaman tidak memuat peluang fase untuk
   musim setelah Januari–Maret 2027. Sumber: pustaka `noaa-cpc-2026-ensodisc`, dibuka 24 Okt 2026; kunci baru
   `cpc.ensodisc_2026_10.peluang_historis_ond`. Label: terverifikasi.
4. **ONI JAS 2026 = 2,16, peringkat 1 dari 77 nilai JAS 1950–2026** (berikutnya 1997: 1,79; 2015: 1,73). Sumber:
   `riset/mentah/oni_cpc.txt` (pustaka `noaa-2026-oni`) [dihitung penyusun bukti]; `kunci: oni.jas_2026` (usulan air
   bab-01); kunci baru `oni.jas_2026.peringkat`. Label: olah(terverifikasi). **Angka berdampingan:** ONI JAS 2,16 (NOAA),
   indeks ENSO JAS +2,63 dan ASO +3,08 (BMKG), Niño 3.4 dasarian +3,33 (BMKG); indeks berbeda periode dan metode, ditulis
   dengan nama indeksnya.
5. **Kemarau 2026 yang sedang berjalan (DIBI sementara, s.d. 23 Okt):** kekeringan 122 kejadian, 1.949.544 terdampak;
   karhutla 1.024 kejadian, 8 meninggal, 6 hilang (rekap cakupan bencana); rincian per kab di cache paket berjumlah 9
   meninggal dan 6 hilang (Probolinggo 5 dan 4; Kota Ternate 0 dan 2; Banyumas, Singkawang, Pinrang, Raja Ampat masing-masing
   1 meninggal), selisih satu jiwa karena cakupan berbeda. SiPongi 2026 s.d. Juli 202.010,96 ha. BMKG 20 Okt 2026: penyemaian dry ice untuk mengurai
   asap karhutla di Sumatra dan Kalimantan, BNPB mengoordinasikan dukungan. Sumber: `dibi/rekap_nasional_tahunan.csv`
   `[tahun=2026, kode 105 dan 106, cakupan=bencana]`; `skenario-hidromet/dibi_kab_tahun.csv`; `public/data/luas_resmi.json`
   (pustaka `sipongi-luas`); pustaka `bmkg-2026-siaran-asap`. Kunci baru `dibi.nasional.kekeringan.terdampak.2026`,
   `dibi.nasional.karhutla.kejadian.2026`, `sipongi.karhutla2026.luas_juli`. Label: resmi (sementara).

**Musim hujan analog dan pola tercatat**

6. **Musim hujan dengan El Niño kuat (ONI NDJ ≥ 1,5), 3 dari 18:** 2009/2010 373 meninggal dan hilang (322 + 51), 266.551
   mengungsi, 1.148 kejadian; 2015/2016 199 (144 + 55), 247.675, 1.310; 2023/2024 246 (212 + 34), 359.202, 1.630,5.
   Rerata 272,7; rentang 199–373; median 18 musim 301,5. Sumber: `kartu_skenario.csv` baris `musim_hujan_pasca_elnino,
   nasional`; `kunci: hidromet.nasional.pasca_elnino.n_musim` (registri); kunci baru `hidromet.nasional.pasca_elnino.meninggal_hilang_<tahun>`,
   `hidromet.nasional.musim.median_meninggal_hilang`. Label: resmi; rerata dan median olah(resmi). Catatan nama: paket
   menamai baris ini `pasca_elnino`, tetapi ketiganya adalah musim hujan *selama* El Niño kuat, bukan sesudahnya.
7. **Musim berikutnya (ENSO netral atau La Niña):** kejadian 2010/2011 turun 2,5% (1.148 ke 1.119) tetapi meninggal dan
   hilang naik ke 599; 2016/2017 naik 53,6% (1.310 ke 2.012), meninggal dan hilang 239; 2024/2025 naik 148,2% (1.630,5 ke
   4.046,3), meninggal dan hilang 398. Sumber: `musim_hujan.csv` [dihitung penyusun bukti]; kunci baru
   `hidromet.nasional.musim_berikut.kenaikan_kejadian_<tahun>`. Label: olah(resmi); "pola tercatat", n = 3, dipengaruhi
   patahan kategori 2018 dan 2024.
8. **Kalender musim hujan nasional (2008–2026, semua pulau):** porsi meninggal dan hilang lima jenis musim hujan per bulan:
   November 21,6%, Januari 12,3%, Maret 11,1%, Februari 8,8%, April 8,8%, Desember 8,1%, Oktober 7,1%; Agustus terendah
   2,4%. Porsi November dipengaruhi kuat oleh Sumatra 2025. Kekeringan menumpuk Juni–September (84% kejadian), karhutla
   Juli–Oktober (69%). Sumber: `skenario-hidromet/kalender_bulanan_pulau.csv` [dijumlah penyusun bukti]; kunci baru
   `hidromet.nasional.kalender.porsi_mh_november`, `hidromet.nasional.kalender.porsi_kekeringan_jun_sep`. Label: olah(resmi).
9. **Lantai berlaku untuk 2026/2027.** KERANGKA §2 butir 9: skenario tidak boleh lebih ringan daripada musim tercatat
   terburuk untuk jenis dan wilayah yang sama, dan penyisihan hanya untuk peluang lima tahun < 0,2%. Peluang lantai 23,7%
   (P1 butir 10). Label: asumsi-kebijakan (keputusan kajian).

**Kemarau 2027**

10. **El Niño kuat tidak pernah bertahan ke JAS tahun berikutnya:** delapan episode ONI NDJ ≥ 1,5 sejak 1950 (1957, 1965,
    1972, 1982, 1997, 2009, 2015, 2023) diikuti ONI JAS tahun berikutnya −1,24 sampai 0,32 (1958: 0,32; 2010: −1,24;
    2016: −0,34; 2024: −0,04). Sumber: `riset/mentah/oni_cpc.txt` [dihitung ulang penyusun bukti, sama dengan kajian air];
    `kunci: enso.elnino_kuat_jas_berikut_maks` (usulan air bab-05). Label: olah(terverifikasi). Tidak ada prakiraan fase
    ENSO resmi (BMKG atau CPC) untuk Juni–September 2027 di sumber yang dibuka.
11. **Kemarau tahun sesudah El Niño kuat (pola tercatat):** luas karhutla SiPongi 2016 438.363,19 ha dan 2024 376.805,05 ha,
    lawan tahun El Niño 2015 2.611.411,44 ha dan 2023 1.161.192,9 ha; DIBI kekeringan terdampak 2010 172.000, 2016 tanpa
    baris kekeringan, 2024 1.480.331. Sumber: `riset/mentah/sipongi_luas_2015_2026.json` (pustaka `sipongi-luas`);
    `dibi/rekap_nasional_tahunan.csv` kode 105. Kunci baru `sipongi.karhutla2016.luas_ha`, `sipongi.karhutla2023.luas_ha`,
    `sipongi.karhutla2024.luas_ha`. Label: resmi. SiPongi tidak memuat 2010.
12. **Lantai kemarau (tercatat terburuk 2008–2025):** kekeringan terdampak terbesar 2018, 7.798.763 (130 kejadian; ONI JAS
    2018 hanya 0,30); kekeringan meninggal terbesar 2023, 6 (Kab. Puncak); karhutla luas terbesar 2015, 2.611.411,44 ha
    (SiPongi, seri dari 2015), meninggal DIBI karhutla 2015 24 (12 di provinsi asap). Sumber: `kartu_skenario.csv` baris
    `kekeringan_2015` (metrik `dibi_terdampak_2018`) dan `karhutla_2015`; `dibi/rekap_nasional_tahunan.csv`; kunci baru
    `hidromet.nasional.kekeringan.dibi_terdampak_2018`, `dibi.puncak2023.kekeringan.meninggal`, `sipongi.karhutla2015.luas_ha`.
    Label: resmi. Catatan prinsip 7: jumlah kejadian dan terdampak kekeringan DIBI mengukur intensitas pelaporan, bukan
    keparahan (2018 bukan tahun El Niño).
13. **Model kekeringan platform tidak masuk kartu utama:** mesin neraca dan padi belum diuji balik; puso model 2.931.339 ha,
    padi turun nasional 68,6% dan Jawa 85,7% hanya di `lampiran_kekeringan_model.csv`; persentase kab SPI-3 ≤ −1 Oktober 2015
    82% berlabel "tidak layak sebagai status". Sumber: `skenario-hidromet/README.md` §Kekeringan analog 2015;
    `kekeringan_ujibalik.json` (POD 0,10, FAR 0,99). Label: estimasi-model.
14. **Baris kepekaan kekeringan dan karhutla: kemarau berakhir Desember 2026 lawan kemarau tahun kedua 2027 (KERANGKA §2
    butir 10).** Analog tahun kedua yang ada di data:
    - *1987, ONI saja:* El Niño 1986–1987 bertahan dua tahun (NDJ 1986 1,21; JAS 1987 1,46; ASO 1987 1,49). Episode ini
      tidak masuk delapan El Niño kuat karena NDJ 1986 < 1,5. Sebelum jendela DIBI dan SiPongi, jadi tanpa angka dampak.
    - *2015, tahun kedua episode 2014–2016:* ONI melewati 0,5 sejak SON 2014 (0,51; NDJ 2014 0,80) dan menguat ke JAS
      2015 1,73. Angka tercatat 2015: kekeringan 7 kejadian, 232.348 terdampak, 0 meninggal (DIBI); karhutla 2.611.411,44 ha
      (SiPongi), 46 kejadian, 24 meninggal (DIBI). Tahun pertamanya lemah (NDJ 2014 0,80), tidak setara dengan 2026 (JAS
      2,16).
    - **Kemungkinan: tidak dinilai.** Dua analog ini tidak memberi peluang; prakiraan fase ENSO resmi untuk JAS 2027
      tidak ada di sumber yang dibuka. Baris kepekaan menulis lantai kemarau tercatat (P2 butir 12) untuk kedua varian,
      karena tahun kedua tercatat (2015) adalah juga tahun lantai karhutla.
    Sumber: `riset/mentah/oni_cpc.txt` [dibaca penyusun bukti]; `dibi/rekap_nasional_tahunan.csv` `[tahun=2015,
    kode_jenis_juklak=105 dan 106, cakupan=bencana]`; `sipongi.karhutla2015.luas_ha`. Label: olah(terverifikasi) untuk
    ONI; resmi untuk DIBI dan SiPongi; pemilihan analog asumsi-kebijakan. Tidak ada kunci baru.

### Inferensi

- **[Inferensi tim]** Kartu 7.2 menyatakan dua hal terpisah: (a) ekspektasi operasional berdasar tiga musim El Niño kuat,
  199–373 meninggal dan hilang, dengan awal musim terlambat dan puncak Desember–Februari; (b) skenario terburuk = lantai
  1.692, karena tidak ada dasar peluang untuk menyisihkan musim 2025/2026 dan El Niño tidak menghalangi kejadian ekstrem
  setempat. Penulis tidak boleh menulis bahwa musim 2026/2027 "lebih ringan".
- **[Inferensi tim]** Kalender menunjukkan risiko di awal musim: November menyumbang porsi korban terbesar, dan BMKG
  menyebut awal dan puncak musim di sebagian besar Jawa berdekatan (Desember dan Februari) setelah kemarau panjang. Peta
  jalan KERANGKA (hari ke-100 jatuh Desember 2026–Februari 2027) cocok dengan jendela ini. Porsi November tanpa 2025 tidak
  dapat dihitung dari berkas kalender; penulis menulis porsi itu dengan catatan Sumatra 2025.
- **[Inferensi tim]** Kemarau 2027 lebih mungkin netral atau La Niña daripada El Niño menurut catatan delapan episode, tetapi
  itu catatan sejarah, bukan prakiraan. Kartu 7.3 dan 7.5 memakai lantai tercatat dan menulis kemungkinan "tidak
  dinilai". Varian "kemarau tahun kedua di bawah El Niño" tidak punya analog di antara delapan El Niño kuat, tetapi punya
  analog lemah di luar kelompok itu (1987 dari ONI; 2015 sebagai tahun kedua episode 2014–2016), dan menjadi baris
  kepekaan (butir 14), bukan kartu terpisah.
- **[Inferensi tim]** Musim hujan 2027/2028 adalah musim yang secara tercatat paling sering naik jumlah kejadiannya (dua
  dari tiga), sehingga kalender berpemicu ENSO 2028–2030 (prinsip 11) relevan mulai 2027, bukan hanya 2026/2027.

### Celah

- Prakiraan musim kemarau 2027 BMKG belum terbit (lazimnya awal tahun); rilis BMKG bertanggal 2 Oktober 2026 tidak ada di
  daftar siaran pers; tabel prakiraan per ZOM dan HTH per pos tidak ditautkan. **Penyajian:** tingkat nasional dan pulau
  saja (KERANGKA §7 butir 35). **Permintaan:** BMKG (Kedeputian Klimatologi) untuk tabel ZOM 2026/2027 dalam format data.
- Data operasional kemarau 2026 (status darurat SK, distribusi air, desa terdampak) belum ada di bahan; KERANGKA §6 butir (3)
  menjadikannya permintaan 14 hari pertama ke BPBD provinsi dan Pusdalops (Pusdatinkom).
- Puso per kab (Kementan) dan produksi padi BPS per provinsi untuk 2015, 2019, 2023 tidak ditarik; dampak pangan kemarau
  tidak dikuantifikasi resmi (KERANGKA §7 butir 24, 34).
- CPC tidak memuat peluang La Niña untuk 2027 di halaman yang dibuka; halaman "strengths" dan IRI plume tidak dibuka.

---

## P3. Berapa korban dapat ditekan dengan cakupan peringatan dini menurut target Renstra dan target Renas?

### Inti

Dengan rumus yang sama (penduduk tercakup bermortalitas 1/8 penduduk tak tercakup, koefisien asosiasi lintas negara WMO),
lintasan Renas 1.c (11.060 ke 52.000 per 100.000) menurunkan korban musim lantai sekitar 39,7%, dari 1.692 menjadi
sekitar 1.021, atau dari 1.490 menjadi sekitar 899 bila longsor tidak dihitung; lintasan IKP Renstra (6,10% ke 6,32%)
hanya sekitar 0,2%, sekitar 3 jiwa. Dua indikator itu berpenyebut berbeda, dan baseline cakupan per provinsi tidak ada,
sehingga angka ini batas atas ilustratif berlabel asumsi-kebijakan dan tidak masuk tesis, Pesan Kunci, atau judul.

### Temuan bersumber

1. **Renas PB 2025–2029 Tabel 2.8, indikator 1.c:** "Proporsi penduduk per 100.000 jiwa di daerah berisiko bencana yang
   tercakup oleh informasi peringatan dini melalui pemerintah daerah atau melalui mekanisme diseminasi nasional": proyeksi
   2025 = 11.060, target 2029 = 52.000. Sumber: korpus `perban-nomor-1-tahun-2025.json` hlm. PDF 32 (pustaka
   `bnpb-2025-renas`) [dibaca penyusun bukti]; `kunci: hidromet.nasional.lanina.pd_renas.cakupan_2025`, `.cakupan_2029`
   (registri). Label: resmi. Catatan: kolom bernama "PROYEKSI 2025", bukan capaian terukur.
2. **Renstra BNPB 2025–2029, IKP "Persentase cakupan layanan peringatan dini di daerah berisiko bencana":** 6,10% (2025),
   6,17%, 6,21%, 6,26%, 6,32% (2029); baseline "N/A". Sumber: korpus `perban-nomor-5-tahun-2025.json` hlm. 133 dan 161
   (pustaka `bnpb-2025-renstra`); `kunci: renstra.ikp_peringatan_dini.2025`, `.2029` (usulan air bab-01);
   `kunci: hidromet.nasional.lanina.pd_renstra.cakupan_2025`, `.cakupan_2029` (registri). Label: resmi.
3. **RPJMN 2025–2029, KP 08.04.02:** cakupan layanan peringatan dini di daerah berisiko, baseline 6,00, target 2025 6,10,
   target 2029 6,32. Sumber: riset E §E11(b), Lampiran III hlm. 913 (pustaka `ri-2025-perpres12-rpjmn`);
   `kunci: rpjmn.peringatan_dini.baseline` (usulan bab-03). Label: resmi.
4. **Renstra hlm. 70 (isu RPJMN):** "tingkat keterpenuhan sistem peringatan dini bencana baru mencapai 6 persen dari total
   potensi masyarakat yang terpapar di kawasan yang berisiko tinggi". Sumber: korpus `perban-nomor-5-tahun-2025.json`
   hlm. 70; `program-terbukti/bukti_dampak.csv` B017; `kunci: renstra.peringatan_dini.keterpenuhan_persen` (usulan bab-03).
   Label: resmi. Penyebutnya (masyarakat terpapar di kawasan risiko tinggi) berbeda dengan IKP dan dengan Renas 1.c.
5. **Koefisien R = 8:** laporan UNDRR–WMO Target G: negara bercakupan peringatan dini terbatas punya "disaster mortality
   that is eight times higher" daripada negara bercakupan substansial sampai komprehensif. Sumber: pustaka
   `wmo-2022-peringatan-dini` (13 Okt 2022), dibuka ulang 24 Okt 2026; kunci baru `wmo.2022.rasio_mortalitas`. Label:
   terverifikasi; dipakai sebagai koefisien = asumsi-kebijakan (asosiasi lintas negara, bukan efek kausal).
6. **Rumus dan faktor:** faktor = ((1 − c1) + c1/R) / ((1 − c0) + c0/R). Renas (c0 0,1106; c1 0,52): faktor 0,6034,
   penurunan 39,7%. Renstra IKP (c0 0,061; c1 0,0632): faktor 0,9980, penurunan 0,20%. Pembanding dengan baseline RPJMN
   (c0 0,060; c1 0,0632): faktor 0,9970, penurunan 0,30%. Cakupan penuh dari 11,06%: faktor 0,1384 (batas atas, bukan
   target). Sumber: `skenario-hidromet/kepekaan_peringatan_dini.csv`; `kunci: hidromet.nasional.lanina.pd_renas.faktor`,
   `kunci: hidromet.nasional.lanina.pd_renstra.faktor` (registri); kunci baru `hidromet.nasional.pd_rpjmn.faktor`,
   `hidromet.nasional.pd_renas.penurunan_persen`, `hidromet.nasional.pd_renstra.penurunan_persen`. Label: asumsi-kebijakan.
7. **Dua lintasan per jenis pada lantai tercatat 2025/2026 (longsor tidak dihitung):**

   | Jenis | Tercatat M + H | Lintasan Renas: sesudah (turun) | Lintasan Renstra: sesudah (turun) |
   | --- | ---: | ---: | ---: |
   | Banjir | 1.421 | 857,4 (563,6) | 1.418,1 (2,9) |
   | Cuaca ekstrem | 40 | 24,1 (15,9) | 39,9 (0,1) |
   | Banjir bandang | 26 | 15,7 (10,3) | 25,9 (0,1) |
   | Banjir dan tanah longsor | 3 | 1,8 (1,2) | 3,0 (0,0) |
   | **Jumlah tanpa longsor** | **1.490** | **899,1 (590,9)** | **1.487,0 (3,0)** |
   | Longsor (tidak dihitung) | 202 | – | – |
   | Gelombang dan abrasi, lantai 2011 | 36 | 21,7 (14,3) | 35,9 (0,1) |

   Sumber: lantai per jenis dari P1 butir 4 dan Bahan subbab butir 1; faktor dari butir 6 [dihitung penyusun bukti].
   Kunci baru `hidromet.nasional.lantai_tanpa_longsor.*`, `hidromet.nasional.lantai.pd_renas.korban_jiwa_<jenis>`,
   `hidromet.nasional.gelombang.lantai.pd_renas.korban_jiwa`. Label: asumsi-kebijakan.
8. **Paket menghitung total termasuk longsor:** lantai 1.692 → 1.020,9 (Renas) dan 1.688,6 (Renstra); model musim terberat
   395,8–954,3 → 238,8–575,8 (Renas). Sumber: `kepekaan_peringatan_dini.csv` baris `utama=true` dan `lintasan=renstra`;
   `kunci: hidromet.nasional.lantai.pd_renas.korban_jiwa`, `kunci: hidromet.nasional.lantai.pd_renstra.korban_jiwa`
   (registri). Label: asumsi-kebijakan. **Bertentangan dengan** KERANGKA §2 butir 10 ("dipecah per jenis; longsor tidak
   dihitung"); butir 7 di atas memenuhi aturan itu.
9. **Rantai peringatan saat ini (hulu):** menurut ringkasan Badan Keahlian DPR atas LHP Kinerja BPK 2022, hanya 19,68%
   kejadian banjir yang telah mendapat peringatan dini dari Impact Based Forecasting; akurasi prakiraan cuaca 34 provinsi
   82,82% terhadap target 87%; kekurangan 40 radar, 311 AWS, 6.536 ARG. Sumber: pustaka `dpr-2022-deteksi-dini` hlm. 3–4,
   dibuka ulang 24 Okt 2026 (`pdftotext`); `kunci: bpk.bmkg.ibf_banjir_terperingatkan_persen` dan `bpk.bmkg.*` (usulan air
   bab-07). Label: resmi (dokumen lembaga negara yang mengutip LHP BPK; LHP tidak dibuka; periode data tidak disebut).
10. **Kerangka hukum:** Perban BNPB 2/2024 menetapkan platform peringatan dini multiancaman yang dikelola Deputi Bidang
    Pencegahan (Pasal 3) dengan kapasitas integrasi pengamatan, analisis, rekomendasi keputusan, penyebarluasan, dan
    dorongan tindakan masyarakat (Pasal 4); analisis dampak menghasilkan potensi jiwa dan aset terpapar (Pasal 11). Tidak
    ada definisi cara menghitung "cakupan". Sumber: korpus `perban-nomor-2-tahun-2024.json` (pustaka `bnpb-2024-spdb`).
    Label: resmi.
11. **Posisi bukti program terkait (bukan untuk diusulkan di bab ini):** InaTEWS P03 "sedang", posisi "Program berjalan,
    wajib evaluasi dampak"; Sekolah Lapang Iklim P04 "lemah"; kesiapsiagaan siklon Bangladesh P19 "kuat" (luar negeri,
    tanpa status Indonesia; Haque dkk. 2012, pustaka `haque-2012-siklon`, mencatat kematian siklon turun lebih dari 100 kali
    1970–2007 dan efek terpisah tiap komponen belum terbukti); Odisha P20 "sedang". Sumber: `program-terbukti/kompendium_program.csv` kolom `kekuatan`,
    `posisi`; `bukti_dampak.csv` B108–B126. Label: sesuai kolom sumber. **Larangan:** tidak satu pun program Indonesia
    hidrometeorologi di kompendium berkekuatan "kuat"; penulis tidak menyebut peringatan dini Indonesia "terbukti".

### Inferensi

- **[Inferensi tim]** Selisih dua lintasan bukan selisih kinerja, melainkan selisih definisi: IKP Renstra naik 0,22 poin
  persen dalam lima tahun, Renas 1.c naik dari 11,06% ke 52% penduduk daerah berisiko. Faktor keluaran rumus (0,2% dan
  39,7%) hanya hasil hitung dari asumsi R = 8 yang sama, bukan konfirmasi empiris, dan hanya tampil di Gambar 7.3 berpil
  asumsi-kebijakan. Faktor ini tidak dikaitkan ke KD-2: akibat KD-2 di KERANGKA §6 ditulis dengan besaran target (6,32%
  lawan 52.000 per 100.000) dan catatan penyebut, dan putusan V02 serta prinsip 10 melarang keluaran R = 8 masuk pita
  keputusan.
- **[Inferensi tim]** Manfaat terbesar ada di banjir (563,6 dari 590,9 jiwa pada lintasan Renas), karena banjir menyumbang
  84% korban lantai. Untuk banjir bandang dan longsor yang waktu tunggunya pendek, koefisien R = 8 hampir pasti
  melebih-lebihkan; itu alasan longsor tidak dihitung dan banjir bandang perlu catatan.
- **[Inferensi tim]** Angka hulu (19,68% kejadian banjir terperingatkan IBF) dan angka hilir (6% keterpenuhan; 11.060 per
  100.000) berbeda ukuran tetapi sama arah: cakupan nyata saat ini rendah, sehingga faktor kepekaan tidak boleh dibaca
  sebagai capaian yang sudah dekat. Gambar 7.3 wajib membawa pil asumsi-kebijakan dan catatan penyebut berbeda.
- **[Inferensi tim]** Peringatan dini tidak mengurangi rumah rusak dan pengungsi; kartu menulis faktor hanya pada baris
  korban jiwa.

### Celah

- Baseline cakupan Renas 1.c per provinsi dan kab tidak ada; cara hitung "tercakup" tidak tertulis di Renas maupun Perban
  2/2024 (KERANGKA §7 butir 33). **Penyajian:** sasaran nasional saja. **Permintaan:** Direktorat Peringatan Dini.
- Tidak ada uji kausal Indonesia untuk efek peringatan dini pada korban banjir; R = 8 adalah asosiasi lintas negara.
  **Penyajian:** batas atas ilustratif, hanya di kartu dan grafik berpil asumsi-kebijakan (prinsip 10).
- LHP Kinerja BPK 2022 atas BMKG dan laporan evaluasi sistem peringatan dini per empat bulan (Perban 2/2024 Pasal 29)
  tidak dibuka. **Permintaan:** BPK atau Inspektorat Utama BNPB; Deputi Bidang Pencegahan.
- Rekaman peringatan sebelum kejadian Sumatra November 2025 hanya bersumber pers [sekunder]; tidak dipakai.

---

## P4. Apa beban karhutla yang dapat dinyatakan dengan data yang ada?

### Inti

Karhutla 2015 adalah analog terburuk: 2.611.411 ha terbakar (SiPongi), kerugian US$16,1 miliar atau 1,9% PDB (Bank
Dunia), dan 12 meninggal tercatat DIBI di provinsi asap; model Koplitz dkk. memperkirakan 91.600 kematian dewasa berlebih
akibat paparan asap Juli–Oktober 2015 di Indonesia (24.000–159.200), sekitar 7.600 kali angka tercatat, sehingga keduanya
wajib ditulis berdampingan dengan label berbeda. Karhutla 2019 (1.649.258 ha, US$5,2
miliar, 0,5% PDB) dan 2023 (1.161.192,9 ha) menjadi pembanding; paparan resmi nasional KRB 128.283.490 ha (25.457.756 ha
kelas tinggi) dengan potensi kerugian Rp709,05 T, tanpa angka penduduk terpapar dan tanpa angka per kab.

### Temuan bersumber

1. **Luas terbakar SiPongi per tahun (ha):** 2015 2.611.411,44; 2016 438.363,19; 2017 165.483,92; 2018 529.266,64; 2019
   1.649.258; 2020 296.942; 2021 358.867; 2022 204.894; 2023 1.161.192,9; 2024 376.805,05; 2026 s.d. Juli 202.010,96.
   Sumber: `riset/mentah/sipongi_luas_2015_2026.json` (ditarik 23 Okt 2026) dan API yang sama ditarik ulang 24 Okt 2026
   untuk 2024–2026 (pustaka `sipongi-luas`); 2018–2023 sama dengan `public/data/luas_resmi.json` (yang mencatat sama
   dengan Tulisan Hukum JDIH BPK 2024). Label: resmi (indikasi luas dari titik panas dan verifikasi, bukan citra).
   **Bertentangan:** 2025 = 359.619,42 ha di `luas_resmi.json` (ditarik 16 Okt 2026) lawan 11.052,13 ha di API yang
   sama pada 23 dan 24 Okt 2026 (mis. Aceh 8.924,98 lawan 296,11). Angka 2025 tidak dipakai (Celah).
2. **Kartu karhutla 2015:** SiPongi 2.611.411,44 ha; Bank Dunia 2,611 juta ha (Juni–Oktober); kerugian Bank Dunia US$16,1
   miliar (Rp221 T), 1,9% PDB 2015, delapan provinsi, biaya regional dan global tidak termasuk; DIBI karhutla 46 kejadian,
   24 meninggal (12 di provinsi asap: Kota Palembang 5, Kota Pekanbaru 4, Kota Pontianak, Kota Palangkaraya, Kota Jambi
   masing-masing 1; 12 di provinsi lain: Magetan 7, Ponorogo 5, kebakaran hutan setempat), 0 mengungsi. Sumber:
   `kartu_skenario.csv` baris `karhutla_2015`; pustaka `worldbank-2016-cost-fire` (PDF dibuka ulang 24 Okt 2026: US$16,1
   miliar dan Rp221 T hlm. PDF 3; 1,9% PDB 2015 hlm. PDF 6; 2,6 juta ha Juni–Oktober, delapan provinsi, hlm. PDF 3, tabel
   luas bersumber BPPT; "19 people" dan "more than 500,000" ISPA mengutip The Guardian hlm. PDF 7); `kunci: dibi.karhutla2015.meninggal`
   (usulan bab-04); kunci baru `sipongi.karhutla2015.luas_ha`, `bankdunia.karhutla2015.kerugian_usd`,
   `bankdunia.karhutla2015.pct_pdb`, `dibi.karhutla2015.meninggal_prov_asap`. Label: resmi (SiPongi, DIBI); terverifikasi
   (Bank Dunia). **Ditulis berdampingan:** Bank Dunia "19 meninggal" (mengutip The Guardian) [sekunder]; pembanding
   setaranya DIBI provinsi asap 12, bukan DIBI semua provinsi 24.
3. **Kematian akibat asap 2015 (model):** paparan PM2,5 asap seluruh musim bakar Juli–Oktober 2015 menghasilkan 91.600
   kematian dewasa berlebih di Indonesia (selang 95%: 24.000–159.200); 100.300 di Indonesia, Malaysia, Singapura. Model
   GEOS-Chem adjoint. "September–Oktober" hanya ada di judul makalah; bagian 3.2 memperluas horizon ke Juli–Oktober.
   Makalah hanya menghitung kematian dewasa ("focus only on adult mortality"); kematian anak tidak dihitung, sehingga
   angka ini bukan beban kematian total. Sumber:
   pustaka `koplitz-2016-asap`, doi 10.1088/1748-9326/11/9/094023 (dibuka riset E §E15 dan dibuka ulang 24 Okt 2026, CC BY 3.0);
   `kunci: koplitz.asap2015.kematian_berlebih` (usulan bab-04). Label: estimasi-model (model peneliti bertinjauan; belum
   diuji balik terhadap data kematian Indonesia). Lebar pita 6,6 kali (di bawah satu orde): boleh di kartu, tidak di judul
   tanpa angka tercatat di sampingnya.
4. **ISPA 2015 [sekunder]:** 450.431 kasus, Juli–22 Okt 2015, enam provinsi (Riau 65.232; Jambi 90.747; Sumatera Selatan
   101.332; Kalimantan Barat 43.477; Kalimantan Tengah 52.213; Kalimantan Selatan 97.430), laporan puskesmas dan RS; BNPB
   menyebut angka riil lebih besar. Sumber: `skenario-hidromet/karhutla_provinsi.csv` kolom `ispa_2015`; asal angka: BNPB
   (Sutopo Purwo Nugroho) 22 Okt 2015 via JawaPos 23 Okt 2015 (pustaka `jawapos-2015-ispa`, sekunder); rilis BNPB asli
   tidak ditemukan (penelusuran web 24 Okt 2026). Label: **sekunder** (paket melabelinya terverifikasi, tetapi asalnya
   pers; konvensi berkas ini menang). Tidak masuk badan teks, Inti, kartu, atau registri; hanya catatan Tabel 7.1 dan
   Celah. **Ditulis berdampingan:** Bank Dunia (2016) hlm. PDF 7 "more than 500,000" (juga mengutip The Guardian)
   [sekunder].
5. **Kartu karhutla 2019:** SiPongi 1.649.258 ha (tahunan); Bank Dunia/KLHK 620.201 ha (Januari–September, periode beda);
   kerugian Bank Dunia US$5,2 miliar (kerusakan aset US$157 juta + kerugian ekonomi US$5,0 miliar), 0,5% PDB, delapan
   provinsi Juni–Oktober, kesehatan dan pendidikan tidak termasuk; DIBI 746 kejadian, 10 meninggal (1 di provinsi asap:
   Banyuasin 4 Jan 2019, di luar musim asap; 9 di Jawa), 150 mengungsi. Sumber: `kartu_skenario.csv` baris `karhutla_2019`;
   pustaka `worldbank-2019-ieq` Box A.1 hlm. 7–8; `kunci: sipongi.karhutla2019.luas_ha` (usulan bab-04); kunci baru
   `bankdunia.karhutla2019.kerugian_usd`, `bankdunia.karhutla2019.pct_pdb`, `dibi.karhutla2019.meninggal_prov_asap`. Label:
   resmi (SiPongi, DIBI); terverifikasi (Bank Dunia).
6. **ISPA 2019, tiga versi, semuanya sekunder:** (a) 919.516 kasus, enam provinsi, data Kemenkes per 23 Sep 2019 (BNPB
   via CNN Indonesia): Riau 275.793; Jambi 63.554; Sumatera Selatan 291.807; Kalimantan Barat 180.695; Kalimantan Tengah
   67.293; Kalimantan Selatan 40.374. (b) Badan Keahlian DPR, Info Singkat Vol. XI No. 19 Oktober 2019 hlm. 15 (hlm. PDF
   3): Sumatera Selatan 291.807; Jambi 63.554; Riau 34.000; Kalimantan Barat 189.695; Kalimantan Selatan 67.293;
   Kalimantan Tengah 40.374; jumlah 686.723. Paragraf ISPA itu bersumber pers (antaranews 14 Sep 2019; Kompas 23 Sep 2019;
   Kompas "24 September 2014" sebagaimana tertulis), bukan data Pusdatin BNPB yang dibuka; jadi versi DPR adalah rangkuman pers oleh lembaga negara, tanggal data
   tidak disebut. (c) Bank Dunia, IEQ Desember 2019 Box A.1: "As of September 2019, over 900,000 people had
   reported respiratory health diseases", tanpa rincian provinsi; Bank Dunia sendiri merujuk sumber lain (catatan kaki
   3). Sumber: `karhutla_provinsi.csv` kolom `ispa_2019` (pustaka `cnnindonesia-2019-ispa`); pustaka `dpr-2019-ispa`;
   pustaka `worldbank-2019-ieq` (teks dibuka ulang 24 Okt 2026). Label: (a) sekunder (pers); (b) sekunder (lembaga
   mengutip pers); (c) terverifikasi sebagai kutipan Bank Dunia, tetapi bukan angka primer ISPA, jadi dipakai hanya
   sebagai pembanding orde besaran. Tidak ada versi yang masuk badan teks, kartu, atau registri. **Bertentangan:** Riau
   275.793 lawan 34.000; Kalimantan Barat 180.695 lawan 189.695; angka Kalimantan Tengah dan Kalimantan Selatan tertukar
   antarversi; jumlah 919.516 lawan 686.723 lawan "lebih dari 900.000".
7. **Karhutla 2023 (El Niño):** SiPongi 1.161.192,9 ha; DIBI 2.051 kejadian, 4 meninggal, 301 mengungsi. Sumber:
   `sipongi_luas_2015_2026.json`; `dibi/rekap_nasional_tahunan.csv` `[tahun=2023,kode_jenis_juklak=106,cakupan=bencana]`.
   Kunci baru `sipongi.karhutla2023.luas_ha`. Label: resmi.
8. **Paparan resmi nasional KRB 2022–2026 (Renas Tabel 2.1–2.7):** luas bahaya karhutla 128.283.490 ha; kelas tinggi
   25.457.756 ha; potensi kerugian Rp709.049.963 juta; potensi kerusakan lingkungan 6.284.991 ha; penduduk terpapar
   "tidak disajikan"; API KRB per kab untuk karhutla membalas nol. Sumber: `kartu_skenario.csv` baris `karhutla_2015`
   (metrik `*_krb_karhutla`); riset A §1.4; `kunci: renas.krb.kerugian_karhutla` (usulan bab-02); kunci baru
   `renas.krb.luas_karhutla`, `renas.krb.luas_tinggi_karhutla`. Label: resmi (dikutip dari Renas lewat riset A).
9. **IRBI 2025 karhutla:** 467 dari 514 kab bernilai, 47 kosong ("tidak dinilai"). Sumber: `irbi/irbi_kab_2025.csv` kolom
   `karlahut`; `kunci: irbi.nasional.2025.karhutla_kosong` (usulan bab-03). Label: resmi.
10. **Posisi bukti program karhutla (bukan untuk diusulkan di bab ini):** MPA dan Desa Bebas Api P05 "lemah", posisi "Uji
    coba terukur" (bukti dari siaran pers perusahaan: penurunan luas terbakar 90% di 9 desa 2014–2015); restorasi gambut
    sekat kanal P06 "lemah", "Program berjalan, wajib evaluasi dampak" (efek muka air tanah 1,5 cm dari model Urzainki dkk.
    2023). Sumber: `program-terbukti/kompendium_program.csv`; `bukti_dampak.csv` B026–B041. **Larangan:** keduanya tidak
    boleh disebut "terbukti".

### Inferensi

- **[Inferensi tim]** Beban karhutla yang dapat dinyatakan resmi adalah luas dan kejadian; korban jiwa tercatat (12 di
  provinsi asap 2015) hampir pasti jauh di bawah beban kesehatan sebenarnya, karena DIBI mencatat kematian langsung,
  bukan kematian berlebih akibat paparan. Model Koplitz memberi orde besaran beban itu. Kartu 7.5 memuat keduanya pada
  baris berbeda: "meninggal tercatat DIBI (resmi) 12" dan "kematian dewasa berlebih akibat asap Juli–Oktober 2015
  (estimasi-model) 91.600 (24.000–159.200)". Kelas dampak kependudukan dihitung dari angka tercatat (skor 2); angka model di catatan kelas.
- **[Inferensi tim]** Kerugian ekonomi karhutla adalah satu-satunya besaran kerugian kejadian hidrometeorologi nasional
  yang punya analisis ekonomi utuh (Bank Dunia 2016 dan 2019); untuk banjir hanya DaLA Jabodetabek 2007 (Rp5.184,43 M,
  resmi). Ini relevan bagi Renas indikator 2.a yang belum punya data (KERANGKA §7 butir 10), tetapi rekomendasinya milik
  Bab 12.
- **[Inferensi tim]** Kemarau 2026 adalah tahun El Niño terkuat menurut ONI JAS, sedangkan luas SiPongi s.d. Juli 2026
  (202.010,96 ha) masih jauh di bawah 2015 dan 2023 karena puncak kebakaran Agustus–Oktober belum masuk. Penulis tidak
  membandingkan 2026 dengan tahun penuh.

### Celah

- Rilis BNPB asli untuk ISPA 2015 (22 Okt 2015) dan 2019 (23 Sep 2019) tidak ditemukan; angka nasional dan per provinsi
  bersumber pers, termasuk versi Badan Keahlian DPR (686.723), yang paragrafnya mengutip antaranews dan Kompas.
  **Penyajian:** semua versi sekunder. ISPA tidak masuk Inti, badan teks, kartu, atau registri; di catatan Tabel 7.1
  kedua versi per provinsi 2019 (pers dan DPR) tampil berdampingan sebagai pembanding sekunder, ditambah Bank Dunia
  "lebih dari 500.000" (2015) dan "lebih dari 900.000" (2019) sebagai pembanding orde besaran. **Permintaan (jalan
  keluar):** Pusdatinkom BNPB dan Kemenkes untuk rekap ISPA karhutla 2015, 2019, 2023, 2026 dalam format data.
- SiPongi 2025 bertentangan (359.619,42 ha lawan 11.052,13 ha antartarik); **Permintaan:** Kementerian Kehutanan (Direktorat
  Pengendalian Kebakaran Hutan dan Lahan) untuk angka final 2025.
- Kematian berlebih akibat asap untuk 2019, 2023, 2026 tidak ditemukan dalam sumber primer; penduduk terpapar karhutla KRB
  "tidak disajikan" dan per kab nol.
- Kerugian ekonomi karhutla 2023 dan 2026 tidak ditemukan (tidak ada analisis Bank Dunia setara di bahan).

---

## Bahan subbab 7.2 sampai 7.5: longsor, cuaca ekstrem, gelombang dan rob, kekeringan (bukan pertanyaan kunci)

### Inti

Lantai per jenis yang belum tertulis di KERANGKA: gelombang dan abrasi 36 meninggal dan hilang (2011, Jepara 32), bukan 4
(tahun analog 2021); kekeringan 6 meninggal (Kab. Puncak 2023), bukan "tidak berlaku"; longsor tahunan 354 (2014) dan cuaca
ekstrem 81 (2025) sebagai kandidat. Semua angka lantai per jenis di bagian ini adalah kandidat untuk memeriksa
`lantai_jenis.csv` (belum ada); angka final kartu per jenis diambil dari turunan itu (KERANGKA §2 butir 9). Rob tidak pernah mencatat korban jiwa di DIBI dan luas genangannya tidak ada secara nasional.

### Temuan bersumber

1. **Gelombang ekstrem dan abrasi, seri meninggal + hilang DIBI 2008–2025:** 11, 2, 12, **36** (2011), 1, 7, 7, 1, 0, 0, 3,
   1, 0, 4 (2021), 1, 0, 8, 7. Tahun 2011: Kab. Jepara 1 meninggal dan 31 hilang dalam satu kejadian, Kab. Pacitan 3 dan 1.
   Kartu paket memakai tahun analog 2021 (kejadian terbanyak, 90 kejadian, 4 meninggal) dengan model 5,1–90 (lebar 17,7
   kali). Sumber: `dibi/rekap_nasional_tahunan.csv` kode 103; `skenario-hidromet/dibi_kab_tahun.csv`; `kartu_skenario.csv`
   baris `gelombang_abrasi_rob`; `kunci: hidromet.nasional.gelombang_abrasi_rob.korban_jiwa` (usulan bab-03); kunci baru
   `hidromet.nasional.gelombang.lantai_meninggal_hilang`, `dibi.jepara2011.gelombang.hilang`. Label: resmi (DIBI);
   estimasi-model (pita). **Dibantah oleh** prinsip 9: kartu dengan 4 meninggal lebih ringan daripada 2011.
2. **Rob:** DIBI baru mencatat rob sejak 2018, kosong 2019 dan 2024; meninggal dan hilang 0 di semua tahun; tahun analog
   2021 76 kejadian. Luas rawan rob resmi hanya untuk WS Jratunseluna: 22.897 ha, dari simulasi pasang 1,8 m (RPSDA
   Jratunseluna 2024 hlm. 27–28, Tabel 5.86 hlm. 265). Sumber: `kartu_skenario.csv`; riset E §E6 (pustaka
   `pupr-2024-rpsda-jratunseluna`). Label: resmi (DIBI); estimasi-model (simulasi dalam dokumen resmi Kementerian PU).
3. **Paparan gelombang, tiga versi:** Renas 4.129.597 jiwa; API KRB nasional 4.104.943; jumlah 514 kab 4.080.596; potensi
   kerugian KRB jumlah kab Rp24,37 T (Renas: Rp21,62 T); luas kelas tinggi 301.655 ha (kab) lawan 303.252 ha (Renas). IRBI
   2025 abrasi: 326 kab bernilai, 188 kosong. Sumber: `kartu_skenario.csv` (InaRISK, pustaka `bnpb-2026-krb`);
   `skenario-hidromet/README.md` §Angka yang
   bertentangan; riset A §1.4; `irbi/irbi_kab_2025.csv` kolom `abrasi`; `kunci: renas.krb.terpapar_gelombang_abrasi`
   (usulan bab-02); kunci baru `irbi.nasional.2025.abrasi_kosong`. Label: resmi.
4. **Kekeringan, korban jiwa tercatat:** DIBI 2023 kekeringan 6 meninggal, satu kejadian di Kab. Puncak (Papua Tengah); 2010
   2 meninggal di Kab. Sumba Timur; tahun lain 0. Kemenko PMK (2 Agu 2023) mengonfirmasi bencana kekeringan dan embun beku
   yang menyebabkan gagal panen, kekurangan pangan, dan kelaparan di Distrik Agandugume, Lambewi, Oneri, tanpa menyebut
   angka korban. Sumber: `dibi/rekap_nasional_tahunan.csv` kode 105; `skenario-hidromet/dibi_kab_tahun.csv`; pustaka
   `kemenkopmk-2023-puncak` (dibuka 24 Okt 2026); kunci baru `dibi.puncak2023.kekeringan.meninggal`. Label: resmi.
   **Ditulis berdampingan:** pers (Jakarta Post 1 Agu 2023, iNews) menyebut BNPB mencatat 6 meninggal dan sekitar 7.500
   terdampak [sekunder]. Model paket kekeringan 0–0,24 (2015) dan 0–4,48 (2018) di bawah lantai 6.
5. **Kekeringan, paparan dan terdampak:** KRB luas bahaya tinggi 30.002.273 ha (jumlah kab; Renas 30.002.272), terpapar
   272.564.439 jiwa (Renas); DIBI terdampak 2015 232.348, 2018 7.798.763 (terbesar), 2019 3.874.558, 2023 4.394.370, 2024
   1.480.331, 2026 sementara 1.949.544. IRBI 2025 kekeringan: 514 kab bernilai. Sumber: `kartu_skenario.csv` baris
   `kekeringan_2015`; `dibi/rekap_nasional_tahunan.csv`; `kunci: renas.krb.terpapar_kekeringan` (usulan bab-02); kunci baru
   `hidromet.nasional.kekeringan.luas_bahaya_tinggi`. Label: resmi.
6. **Longsor:** tahun tercatat terburuk 2014, 331 meninggal dan 23 hilang; Tanah Longsor 2024 hanya 207 kejadian (2014–2023
   berkisar 502–1.320) tetapi 213 meninggal, tanda patahan pencatatan 2024; KRB terpapar 25.252.687 (Renas); IRBI 2025 longsor 455 kab bernilai, 59 kosong. Sumber:
   `dibi/rekap_nasional_tahunan.csv` kode 102; riset A §1.4; `irbi_kab_2025.csv` kolom `longsor`. Label: resmi.
7. **Cuaca ekstrem:** tahun terburuk 2025, 80 meninggal dan 1 hilang; 2024 67 dan 1; tahun lain paling banyak 62 (2014:
   32 meninggal dan 30 hilang); kejadian
   bergeser antarkategori (Cuaca Ekstrem, Puting Beliung, Angin Kencang) 2018–2023. KRB terpapar 255.437.799 (Renas),
   potensi kerugian Rp2.744,33 T (terbesar di antara bahaya KRB). Sumber: `dibi/rekap_nasional_tahunan.csv` kode 104;
   `skenario-hidromet/README.md` §DIBI; riset A §1.4; `kunci: renas.krb.kerugian_cuaca_ekstrem` (usulan bab-03). Label: resmi.
8. **Banjir, IRBI 2025:** 510 kab bernilai, 4 kosong; KRB terpapar 113.829.496 (Renas), jumlah 514 kab 100,00%. Sumber:
   `irbi_kab_2025.csv` kolom `banjir`; `kartu_skenario.csv`. Kunci baru `irbi.nasional.2025.banjir_kosong`. Label: resmi.
9. **Kerugian kejadian banjir analog:** DaLA Bappenas banjir Jabodetabek Februari 2007, Tabel III.1 hlm. 33: kerusakan
   Rp1.765,89 M + kerugian Rp3.418,70 M = Rp5.184,43 M. Sumber: `kartu_skenario.csv` baris
   `pembanding_rugi_banjir_jabodetabek_2007`; pustaka `bappenas-2007-dala` (dibuka paket 23 Okt 2026). Label: resmi.
   **Ditulis berdampingan:** ringkasan DaLA Rp5,16 T; perkiraan APINDO/AAUI Rp3,6 T yang dikutip DaLA (terverifikasi, dapat
   tumpang tindih); banjir bandang Garut 2016 Rp44–396,5 M (estimasi-model, sumber primer belum dibuka).

### Inferensi

- **[Inferensi tim]** Kartu 7.4 gelombang harus memakai 36 (2011) sebagai skenario korban; 2021 tetap dapat menjadi
  analog kejadian (90 kejadian) dan rumah rusak. Kejadian Jepara 2011 kemungkinan korban di laut (31 hilang dalam satu
  kejadian), dan definisi "gelombang ekstrem" di DIBI tidak membedakan korban di laut dan di darat; penulis menulis
  "tercatat DIBI sebagai gelombang pasang dan abrasi", tanpa menafsirkan pekerjaan korban.
- **[Inferensi tim]** Untuk kekeringan, korban jiwa langsung jarang, tetapi bukan nol; kejadian Puncak 2023 menunjukkan
  jalur dampak lewat pangan dan air di wilayah terpencil. Kartu 7.3 menulis "meninggal tercatat terbesar 6 (2023)" dengan
  kelas dampak kependudukan skor 1, dan dampak utama kekeringan tetap terdampak dan layanan air.
- **[Inferensi tim]** Matriks ketersediaan kuantifikasi untuk rob: korban "Resmi, 0 tercatat"; luas "Tidak dikuantifikasi"
  secara nasional (satu WS berlabel estimasi-model); kerugian "Tidak dikuantifikasi".

### Celah

- Luas genangan rob teramati nasional tidak ada; model rob platform tidak layak (KERANGKA §7 butir 23). **Penyajian:** kab
  berkejadian rob DIBI dan luas rawan rob Jratunseluna berlabel simulasi.
- Debit sungai dan luas genangan banjir per kejadian tidak ada (0 titik GloFAS di Jawa). **Penyajian:** KRB sebagai batas
  atas, bukan jejak kejadian.
- Rincian kejadian Jepara 2011 (lokasi, nelayan atau bukan) tidak dibuka; hanya baris DIBI.

---

## Komponen

| Komponen | Isi | Sumber data | Kode | Catatan untuk penulis dan perancang |
| --- | --- | --- | --- | --- |
| Gambar 7.1 | Peta kecil berganda IRBI 2025 per kab: banjir (510 bernilai), longsor (455), kekeringan (514), karhutla (467); 5 kelas nilai; sel kosong abu "tidak dinilai" | `irbi/irbi_kab_2025.csv` kolom `banjir`, `longsor`, `kekeringan`, `karlahut` | G19 | Prinsip 7: tanpa kelas resmi per bahaya, tanpa peringkat; catatan "skala 2025 tidak sebanding dengan 2015–2024". Label resmi |
| Gambar 7.2 | Meninggal dan hilang per musim hujan nasional 2008/09–2025/26 (18 batang), penanda La Niña (7) dan El Niño kuat (3), garis lantai 1.692, anotasi Sumatra 2025 (1.342) | `skenario-hidromet/musim_hujan.csv` | G1 | 18 periode ≤ 24. Batang 2025/2026 dipecah Sumatra dan lainnya. Catatan: "2025/2026 bukan episode La Niña (ONI NDJ −0,60)". Label resmi; ONI terverifikasi |
| Kartu 7.1 (agregat operasional) | Musim hujan tercatat terburuk nasional: tiga blok Perban 2/2023 Pasal 7, kolom 2025/2026, kasus Sumatra, model rasio (pembanding); baris kebutuhan respons | `kartu_skenario.csv` (`musim_hujan_terberat_tercatat`, `musim_hujan_lantai`, `kasus_sumatra_nov2025`) | B5.11 | Skenario = lantai 1.692; model 396–954 berpil estimasi-model dengan kalimat "metode ini tidak menangkap kejadian katastrofik"; kelas kependudukan 5; stimulan rumah semua jenis tidak tampil (KERANGKA §2 butir 9 (c)); pengungsi ditulis "puncak serentak tidak tersedia di DIBI", jumlah semusim dan per kejadian hanya pembanding berlabel. Tidak menggantikan kartu per jenis |
| Kartu 7.2 (agregat operasional) | Musim hujan 2026/2027 di bawah El Niño kuat: ekspektasi (tiga musim analog 199–373, awal musim mundur di 529 ZOM atau 61,08% luas wilayah, puncak Des–Feb) dan skenario terburuk (lantai 1.692) | `kartu_skenario.csv` (`musim_hujan_pasca_elnino`, `musim_hujan_lantai`); BMKG 22 Sep 2026; CPC 8 Okt 2026 | B5.11 | Judul tidak boleh menyiratkan musim lebih ringan; kemungkinan lantai 23,7% (pita 4); fase El Niño sedang berlangsung; persen BMKG adalah persen luas, bukan persen ZOM |
| Kartu 7.3 (per jenis) | Kekeringan: lantai terdampak 7.798.763 (2018), meninggal 6 (2023); KRB bahaya tinggi 30.002.273 ha; kerugian materiil dan imateriil sesuai matriks ketersediaan; kepekaan kemarau berakhir Desember 2026 lawan tahun kedua 2027 (P2 butir 14) | `kartu_skenario.csv` (`kekeringan_2015`); `dibi_kab_tahun.csv`; `lantai_jenis.csv` (menunggu) | B5.11 | Kemungkinan "tidak dinilai"; angka model kekeringan platform tidak tampil; lantai final dari `lantai_jenis.csv` |
| Kartu 7.4 (per jenis, ringkas) | Gelombang ekstrem, abrasi, rob (ringkas): lantai korban 36 (2011), analog kejadian 2021 (gelombang 90 dan rob 76 kejadian, 1.625 rumah rusak gabungan, 7.225 mengungsi), rob 0 korban, paparan tiga versi | `kartu_skenario.csv` (`gelombang_abrasi_rob`); `dibi/rekap_nasional_tahunan.csv` kode 103 | B5.11 | Pita model 5,1–90 (17,7 kali) dilarang tampil di kartu angka (lebih dari satu orde); hanya lampiran; lantai 36 kandidat sampai `lantai_jenis.csv` ada |
| Kartu 7.5 (per jenis) | Karhutla: lantai tahun 2015 (2.611.411 ha SiPongi; US$16,1 miliar, 1,9% PDB, Bank Dunia; 12 meninggal DIBI provinsi asap); kematian dewasa berlebih Koplitz 91.600 (24.000–159.200) pada baris berbeda; kepekaan luas 2015 lawan 2019 dan kemarau tahun kedua | `kartu_skenario.csv` (`karhutla_2015`, `karhutla_2019`); pustaka `koplitz-2016-asap`, `worldbank-2016-cost-fire` | B5.11 | ISPA tidak tampil (sekunder, P4 Celah); Koplitz berpil estimasi-model, "kematian dewasa, paparan Juli–Oktober 2015, bukan beban total"; kemungkinan "tidak dinilai" |
| Kartu 7.6 (per jenis) | Banjir dan banjir bandang: lantai kejadian tunggal dan tahun tercatat terburuk, dua baris (banjir bandang sejak kategori 2018); Sumatra Nov 2025 sebagai kejadian majemuk; empat besaran P10; kepekaan rekaman Bekasi dan dua lintasan peringatan dini | `lantai_jenis.csv` (**menunggu**); `kartu_skenario.csv`; DaLA 2007 | B5.11 | Angka lantai tidak diketik sebelum turunan ada; kandidat di P1 butir 9 hanya untuk memeriksa turunan; stimulan rumah hanya banjir bandang |
| Kartu 7.7 (per jenis) | Tanah longsor: lantai kejadian tunggal dan tahun tercatat terburuk; Sumatra Nov 2025 sebagai kejadian majemuk; empat besaran P10; kepekaan patahan kategori 2018 dan 2024 | `lantai_jenis.csv` (**menunggu**); KRB | B5.11 | Peringatan dini tidak dihitung untuk longsor; angka lantai tidak diketik sebelum turunan ada |
| Kartu 7.8 (per jenis, ringkas) | Cuaca ekstrem: lantai kejadian tunggal dan tahun tercatat terburuk; empat besaran P10 (luas tidak dikuantifikasi); kepekaan tahun analog dengan dan tanpa tahun berpatahan kategori | `lantai_jenis.csv` (**menunggu**); KRB | B5.11 | Angka lantai tidak diketik sebelum turunan ada |
| Gambar 7.3 | Kepekaan peringatan dini, dua lintasan berdampingan per jenis pada lantai tercatat (banjir, cuaca ekstrem, banjir bandang, gelombang); longsor tidak dihitung | P3 butir 7; `kepekaan_peringatan_dini.csv` | G14 | Pil asumsi-kebijakan; label "turun 39,7%" (Renas) dan "turun 0,2%" (Renstra); catatan penyebut berbeda dan R = 8 asosiasi lintas negara; tidak di judul temuan |
| Tabel 7.1 | Karhutla per provinsi asap 2015 dan 2019: luas SiPongi, luas Bank Dunia 2015, DIBI kejadian dan meninggal; ISPA hanya di catatan tabel | `skenario-hidromet/karhutla_provinsi.csv`; pustaka `dpr-2019-ispa`, `worldbank-2019-ieq` | B5.7 | Papua memakai batas sebelum pemekaran 2022 untuk luas; catatan tabel: ISPA 2015 dan dua versi per provinsi 2019 (pers lawan DPR) berdampingan, berlabel sekunder, ditambah Bank Dunia "lebih dari 900.000" (2019) |
| Tabel 7.2 (usulan) | Lantai tercatat per jenis lawan pita model: banjir, banjir bandang, longsor, cuaca ekstrem, gelombang, kekeringan, karhutla; kejadian tunggal dan tahun, angka, label | `lantai_jenis.csv` (**menunggu**); `kartu_skenario.csv` | B5.7 | Menjadi kontrak isi kartu (matriks ketersediaan kuantifikasi prinsip 9); hanya bila halaman cukup |
| Gambar 7.4 (usulan) | Kalender bulanan nasional: porsi meninggal dan hilang lima jenis musim hujan dan porsi kejadian kekeringan dan karhutla per bulan | `kalender_bulanan_pulau.csv` | G16 | Tabel peta panas; catatan "porsi November dipengaruhi Sumatra 2025"; mendukung Kartu 7.2 dan peta jalan |

---

## Angka untuk registri

Ditulis juga sebagai JSON di `naskah/mitigasi/bukti/bab-07.angka.json` dengan bentuk entri `data/angka.json` (bentuk A:
`berkas` + `jalur` relatif ke `data/`; bentuk B: `nilai` atau `rendah`/`tinggi` + `pustaka`). `data/angka.json` tidak
disunting. Kunci yang sudah ada di registri atau diusulkan berkas bukti lain dipakai ulang dan tidak didaftar lagi:
`hidromet.nasional.lantai.meninggal_hilang`, `.musim`, `.meninggal_hilang_10_musim`, `hidromet.nasional.lanina.korban_jiwa`,
`hidromet.nasional.lanina.pd_renas.*`, `hidromet.nasional.lanina.pd_renstra.*`, `hidromet.nasional.lantai.pd_renas.korban_jiwa`,
`hidromet.nasional.lantai.pd_renstra.korban_jiwa`, `hidromet.nasional.pasca_elnino.n_musim`, `hidromet.nasional.musim_lanina.n`,
`hidromet.nasional.musim_2025.meninggal`, `.oni`, `dibi.sumatra2025.meninggal`, `.hilang` (registri);
`hidromet.nasional.terberat.*`, `hidromet.nasional.musim_2025.mengungsi`, `.rumah_rb`, `hidromet.nasional.lantai.peluang_5_musim`,
`hidromet.nasional.gelombang_abrasi_rob.korban_jiwa`, `renstra.peringatan_dini.keterpenuhan_persen`,
`rpjmn.peringatan_dini.baseline`, `irbi.nasional.2025.karhutla_kosong`, `renas.krb.kerugian_cuaca_ekstrem` (bab-03);
`dibi.sumatra2025.mengungsi`, `hidromet.sumatra2025.rumah_rusak_berat` (bab-01); `koplitz.asap2015.kematian_berlebih`,
`sipongi.karhutla2019.luas_ha`, `dibi.karhutla2015.meninggal`, `dibi.wasior2010.*`, `dibi.seroja2021.*` (bab-04);
`renas.krb.kerugian_karhutla`, `renas.krb.terpapar_gelombang_abrasi`, `renas.krb.terpapar_kekeringan` (bab-02);
`bmkg.musim_2026.*`, `oni.jas_2026`, `renstra.ikp_peringatan_dini.*` (air bab-01); `bmkg.dasarian_okt1_2026.nino34`,
`enso.elnino_kuat_jas_berikut_maks` (air bab-05); `bpk.bmkg.*` (air bab-07); `enso.lanina_ndj_porsi_jendela5` (air bab-03).
Angka sekunder tidak masuk registri: `ispa.karhutla2015`, `ispa.karhutla2019`, dan `dpr.ispa2019.jumlah_6prov` dicabut
(asal pers). Kunci `dibi.nasional.<jenis>.meninggal_hilang_maks` ditahan sampai `skenario-hidromet/lantai_jenis.csv` ada.

| Kunci | Nilai | Berkas sumber + jalur (atau pustaka) | Label | Sumber |
| --- | --- | --- | --- | --- |
| hidromet.nasional.musim_2025.kejadian | 2.598,5 | skenario-hidromet/musim_hujan.csv `[wilayah=nasional,tahun_awal=2025].kejadian` | resmi | DIBI |
| hidromet.nasional.musim_2025.hilang | 186 | idem `.hilang` | resmi | DIBI |
| hidromet.nasional.musim_2025.rumah_rs | 57.141 | idem `.rumah_rs` | resmi | DIBI |
| hidromet.nasional.musim_2025.rumah_rr | 131.235 | idem `.rumah_rr` | resmi | DIBI |
| hidromet.nasional.musim_2025.menderita | 8.242.120 | idem `.menderita` | resmi | DIBI |
| hidromet.nasional.terberat.hari_mengungsi | 7.306.180 (3.131.220–31.312.200) | skenario-hidromet/kartu_skenario.csv `[skenario=musim_hujan_terberat_tercatat,wilayah=nasional,metrik=hari_mengungsi]` | asumsi-kebijakan | mengungsi × 7 (3–30) hari |
| hidromet.nasional.terberat.stimulan_rumah_semua_jenis | Rp6,04–7,64 T | idem `metrik=materiil_batas_bawah` | asumsi-kebijakan | stimulan rumah semua jenis; bukan kerugian materiil; tidak tampil di Kartu 7.1 |
| hidromet.nasional.terberat.meninggal_hilang_tercatat_longsor | 202 | idem `metrik=meninggal_hilang_tercatat_longsor` | resmi | DIBI |
| hidromet.nasional.terberat.meninggal_hilang_tercatat_cuaca_ekstrem | 40 | idem | resmi | DIBI |
| hidromet.nasional.terberat.meninggal_hilang_tercatat_banjir_bandang | 26 | idem | resmi | DIBI |
| hidromet.nasional.terberat.meninggal_hilang_tercatat_banjir_longsor | 3 | idem | resmi | DIBI |
| hidromet.nasional.musim.median_meninggal_hilang | 301,5 | pustaka bnpb-2026-dibi | resmi | olah median 18 musim |
| hidromet.nasional.musim.kedua_terberat_meninggal_hilang | 600 | pustaka bnpb-2026-dibi | resmi | olah 475 + 125, 2018/2019 |
| hidromet.nasional.lantai.rasio_batas_tinggi_model | 1,77 | pustaka bnpb-2026-dibi | estimasi-model | olah 1.692 / 954,27 |
| hidromet.sumatra2025.porsi_musim_2025 | 79,3% | pustaka bnpb-2026-dibi | resmi | olah 1.342 / 1.692 |
| hidromet.sumatra2025.stimulan_rumah_semua_jenis | Rp5,61–7,06 T | kartu_skenario.csv `[skenario=kasus_sumatra_nov2025,...,metrik=materiil_batas_bawah]` | asumsi-kebijakan | stimulan rumah |
| hidromet.sumatra2025.menderita | 4.679.735 | idem `metrik=terdampak_menderita` | resmi | DIBI |
| hidromet.nasional.gelombang.lantai_meninggal_hilang | 36 | pustaka bnpb-2026-dibi | resmi | olah 2011: 4 + 32 |
| dibi.jepara2011.gelombang.hilang | 31 | skenario-hidromet/dibi_kab_tahun.csv `[kode=3320,jenis=gelombang_abrasi,tahun=2011].hilang` | resmi | DIBI |
| dibi.puncak2023.kekeringan.meninggal | 6 | skenario-hidromet/dibi_kab_tahun.csv `[kode=9405,jenis=kekeringan,tahun=2023].meninggal` | resmi | DIBI |
| hidromet.nasional.kekeringan.dibi_terdampak_2018 | 7.798.763 | kartu_skenario.csv `[skenario=kekeringan_2015,wilayah=nasional,metrik=dibi_terdampak_2018]` | resmi | DIBI |
| hidromet.nasional.kekeringan.luas_bahaya_tinggi | 30.002.273 ha | idem `metrik=luas_bahaya_tinggi_kekeringan` | resmi | KRB 2022–2026 |
| dibi.nasional.kekeringan.terdampak.2026 | 1.949.544 | dibi/rekap_nasional_tahunan.csv `[tahun=2026,kode_jenis_juklak=105,cakupan=bencana].menderita` | resmi | DIBI sementara |
| dibi.nasional.karhutla.kejadian.2026 | 1.024 | idem `[tahun=2026,kode_jenis_juklak=106,cakupan=bencana].kejadian` | resmi | DIBI sementara |
| hidromet.nasional.pasca_elnino.meninggal_hilang_2009 | 373 | kartu_skenario.csv `[skenario=musim_hujan_pasca_elnino,wilayah=nasional,metrik=meninggal_hilang_2009]` | resmi | DIBI |
| hidromet.nasional.pasca_elnino.meninggal_hilang_2015 | 199 | idem `metrik=meninggal_hilang_2015` | resmi | DIBI |
| hidromet.nasional.pasca_elnino.meninggal_hilang_2023 | 246 | idem `metrik=meninggal_hilang_2023` | resmi | DIBI |
| hidromet.nasional.musim_berikut.kenaikan_kejadian_2016 | 53,6% | pustaka bnpb-2026-dibi | resmi | olah 2.012 / 1.310 − 1 |
| hidromet.nasional.musim_berikut.kenaikan_kejadian_2024 | 148,2% | pustaka bnpb-2026-dibi | resmi | olah 4.046,3 / 1.630,5 − 1 |
| hidromet.nasional.musim_berikut.kenaikan_kejadian_2010 | −2,5% | pustaka bnpb-2026-dibi | resmi | olah 1.119 / 1.148 − 1 |
| hidromet.nasional.kalender.porsi_mh_november | 21,6% | pustaka bnpb-2026-dibi | resmi | olah kalender_bulanan_pulau.csv |
| hidromet.nasional.kalender.porsi_kekeringan_jun_sep | 84% | pustaka bnpb-2026-dibi | resmi | olah idem |
| oni.jas_2026.peringkat | 1 dari 77 | pustaka noaa-2026-oni | terverifikasi | olah JAS 1950–2026 |
| cpc.ensodisc_2026_10.peluang_historis_ond | 83% | pustaka noaa-cpc-2026-ensodisc | terverifikasi | CPC 8 Okt 2026 |
| bmkg.musim_2026.persen_atas_normal | 18,55% luas daratan | pustaka bmkg-2026-siaran-musim-hujan | resmi | 147 ZOM; persen luas, bukan persen ZOM |
| bmkg.dasarian_okt1_2026.enso_aso | +3,08 | pustaka bmkg-2026-dinamika-okt1 | resmi | BMKG 13 Okt 2026 |
| bmkg.pdkm_okt2_2026.prov_awas_nasional | 22 | pustaka bmkg-2026-dinamika-okt1 | resmi | provinsi dengan sebagian kab Awas |
| wmo.2022.rasio_mortalitas | 8 kali | pustaka wmo-2022-peringatan-dini | terverifikasi | UNDRR–WMO Target G |
| hidromet.nasional.pd_renas.penurunan_persen | 39,7% | pustaka bnpb-2025-renas | asumsi-kebijakan | 1 − 0,6034 |
| hidromet.nasional.pd_renstra.penurunan_persen | 0,2% | pustaka bnpb-2025-renstra | asumsi-kebijakan | 1 − 0,9980 |
| hidromet.nasional.pd_rpjmn.faktor | 0,9970 | pustaka ri-2025-perpres12-rpjmn | asumsi-kebijakan | c0 6,00, c1 6,32, R 8 |
| hidromet.nasional.lantai_tanpa_longsor.meninggal_hilang | 1.490 | pustaka bnpb-2026-dibi | resmi | olah 1.692 − 202 |
| hidromet.nasional.lantai_tanpa_longsor.pd_renas.korban_jiwa | 899,1 | pustaka bnpb-2025-renas | asumsi-kebijakan | 1.490 × 0,6034 |
| hidromet.nasional.lantai_tanpa_longsor.pd_renstra.korban_jiwa | 1.487,0 | pustaka bnpb-2025-renstra | asumsi-kebijakan | 1.490 × 0,9980 |
| hidromet.nasional.lantai.pd_renas.korban_jiwa_banjir | 857,4 | pustaka bnpb-2025-renas | asumsi-kebijakan | 1.421 × 0,6034 |
| hidromet.nasional.lantai.pd_renas.korban_jiwa_cuaca_ekstrem | 24,1 | pustaka bnpb-2025-renas | asumsi-kebijakan | 40 × 0,6034 |
| hidromet.nasional.lantai.pd_renas.korban_jiwa_banjir_bandang | 15,7 | pustaka bnpb-2025-renas | asumsi-kebijakan | 26 × 0,6034 |
| hidromet.nasional.gelombang.lantai.pd_renas.korban_jiwa | 21,7 | pustaka bnpb-2025-renas | asumsi-kebijakan | 36 × 0,6034 |
| sipongi.karhutla2015.luas_ha | 2.611.411,44 ha | kartu_skenario.csv `[skenario=karhutla_2015,wilayah=nasional,metrik=luas_terbakar_sipongi]` | resmi | SiPongi |
| sipongi.karhutla2016.luas_ha | 438.363,19 ha | pustaka sipongi-luas | resmi | SiPongi, tarik 23 Okt 2026 |
| sipongi.karhutla2023.luas_ha | 1.161.192,9 ha | pustaka sipongi-luas | resmi | idem |
| sipongi.karhutla2024.luas_ha | 376.805,05 ha | pustaka sipongi-luas | resmi | idem |
| sipongi.karhutla2026.luas_juli | 202.010,96 ha | pustaka sipongi-luas | resmi | s.d. Juli 2026 |
| bankdunia.karhutla2015.kerugian_usd | US$16,1 miliar | kartu_skenario.csv `[skenario=karhutla_2015,...,metrik=kerugian_bank_dunia]` | terverifikasi | Bank Dunia 2016 hlm. PDF 3, dibuka 24 Okt 2026 |
| bankdunia.karhutla2015.pct_pdb | 1,9% | idem `metrik=kerugian_bank_dunia_pct_pdb` | terverifikasi | idem hlm. PDF 6 |
| bankdunia.karhutla2019.kerugian_usd | US$5,2 miliar | kartu_skenario.csv `[skenario=karhutla_2019,...,metrik=kerugian_bank_dunia]` | terverifikasi | Bank Dunia 2019 |
| bankdunia.karhutla2019.pct_pdb | 0,5% | idem `metrik=kerugian_bank_dunia_pct_pdb` | terverifikasi | idem |
| dibi.karhutla2015.meninggal_prov_asap | 12 | kartu_skenario.csv `[skenario=karhutla_2015,...,metrik=dibi_meninggal_hilang_prov_asap]` | resmi | DIBI |
| dibi.karhutla2019.meninggal_prov_asap | 1 | kartu_skenario.csv `[skenario=karhutla_2019,...,metrik=dibi_meninggal_hilang_prov_asap]` | resmi | DIBI |
| renas.krb.luas_karhutla | 128.283.490 ha | kartu_skenario.csv `[skenario=karhutla_2015,...,metrik=luas_bahaya_total_krb_karhutla]` | resmi | Renas Tabel 2.1–2.7 |
| renas.krb.luas_tinggi_karhutla | 25.457.756 ha | idem `metrik=luas_bahaya_tinggi_krb_karhutla` | resmi | idem |
| irbi.nasional.2025.banjir_kosong | 4 | pustaka bnpb-irbi | resmi | olah irbi_kab_2025.csv |
| irbi.nasional.2025.abrasi_kosong | 188 | pustaka bnpb-irbi | resmi | olah idem |

---

## Pustaka

Entri CSL-JSON lengkap di `naskah/mitigasi/bukti/bab-07.pustaka.json` (27 entri; kunci `id` dipakai kolom `pustaka`
registri; id yang sama dengan berkas bukti lain dipakai ulang). Ringkas:

| id | Sumber | Verifikasi |
| --- | --- | --- |
| bnpb-2026-dibi | BNPB, DIBI dasbor publik 1, ditarik 23 Okt 2026 | primer |
| bnpb-irbi | BNPB, IRBI kab/kota 2015–2025 | primer |
| bnpb-2026-krb | BNPB, InaRISK ringkasan KRB 2022–2026 per kab | primer |
| bnpb-2025-renas | Perban BNPB 1/2025 Renas PB 2025–2029 (korpus) | primer |
| bnpb-2025-renstra | Perban BNPB 5/2025 Renstra BNPB 2025–2029 (korpus) | primer |
| ri-2025-perpres12-rpjmn | Perpres 12/2025 RPJMN 2025–2029 (dibuka riset E) | primer |
| bnpb-2024-spdb | Perban BNPB 2/2024 Sistem Peringatan Dini Bencana (korpus) | primer |
| bnpb-2023-renkon | Perban BNPB 2/2023 Penyusunan Rencana Kontingensi (korpus) | primer |
| bmkg-2026-siaran-musim-hujan | BMKG, siaran pers 22 Sep 2026 | primer |
| bmkg-2026-dinamika-okt1 | BMKG, Analisis Dinamika Atmosfer Dasarian I Oktober 2026 | primer |
| bmkg-2026-siaran-asap | BMKG, siaran pers 20 Okt 2026 (dry ice, asap karhutla) | primer |
| noaa-2026-oni | NOAA CPC, Oceanic Niño Index | primer |
| noaa-cpc-2026-ensodisc | NOAA CPC, ENSO Diagnostic Discussion 8 Okt 2026 | primer |
| sipongi-luas | Kementerian Kehutanan, SiPongi indikasi luas kebakaran per provinsi | primer |
| worldbank-2016-cost-fire | Bank Dunia (2016), The Cost of Fire (PDF documents1.worldbank.org, dibuka 24 Okt 2026, hlm. PDF 3, 6, 7) | primer |
| worldbank-2019-ieq | Bank Dunia (2019), Indonesia Economic Quarterly Desember 2019, Box A.1 | primer |
| koplitz-2016-asap | Koplitz dkk. (2016), ERL 11: 094023 | primer |
| wmo-2022-peringatan-dini | WMO, siaran pers 13 Okt 2022 | primer |
| haque-2012-siklon | Haque dkk. (2012), Bull. WHO 90: 150–156 | primer |
| bappenas-2007-dala | Bappenas (2007), DaLA banjir Jabodetabek Februari 2007 | primer (dibuka paket) |
| dpr-2019-ispa | Badan Keahlian DPR, Info Singkat Vol. XI No. 19 Oktober 2019 (paragraf ISPA mengutip pers) | sekunder untuk angka ISPA |
| dpr-2022-deteksi-dini | Badan Keahlian DPR (2022), Accountability Brief deteksi dini | primer terhadap DPR |
| kemenkopmk-2023-puncak | Kemenko PMK, 2 Agu 2023, kekeringan Kab. Puncak | primer |
| pupr-2024-rpsda-jratunseluna | Kementerian PU, RPSDA WS Jratunseluna 2024 (dibuka riset E) | primer |
| cabinetoffice-2025-nrr | Cabinet Office, National Risk Register 2025 | primer |
| jawapos-2015-ispa | JawaPos, 23 Okt 2015 (angka ISPA BNPB) | sekunder |
| cnnindonesia-2019-ispa | CNN Indonesia, 23 Sep 2019 (angka ISPA BNPB/Kemenkes) | sekunder |

---

## Catatan tindak lanjut pemeriksaan (24 Oktober 2026)

Sepuluh temuan pemeriksa dicek ke sumber dan semuanya diterima; tidak ada yang ditolak.

| Temuan | Cek ke sumber | Tindakan |
| --- | --- | --- |
| ISPA 2015 dan 2019 berlabel terverifikasi padahal asal pers | Pustaka `jawapos-2015-ispa` dan `cnnindonesia-2019-ispa` sekunder; rilis BNPB asli tidak ditemukan | Dicabut dari registri; dihapus dari Inti P4; label sekunder; hanya catatan Tabel 7.1 dan Celah; Bank Dunia IEQ 2019 "over 900,000" ditambah sebagai pembanding (teks Box A.1 dibuka ulang) |
| Versi Badan Keahlian DPR berlabel resmi | PDF tidak dapat dibuka ulang (Access Denied dari berkas.dpr.go.id, 24 Okt 2026); kutipan sumber paragraf dari pemeriksa diterima karena arah koreksinya menurunkan label | Label sekunder; `dpr.ispa2019.jumlah_6prov` dicabut; Celah diubah, permintaan ke Pusdatinkom BNPB dan Kemenkes jadi jalan keluar |
| Kerangka bab usang (16 hlm, Kartu 7.3 gabungan) | KERANGKA §2 butir 9 dan §5 BAB 7 versi berlaku dibaca: 19 hlm, satu jenis satu kartu, `lantai_jenis.csv` belum ada di paket | Header, tabel temuan, Komponen diselaraskan (Kartu 7.3, 7.4, 7.5–7.8); lantai per jenis ditandai menunggu turunan; kunci `dibi.nasional.*.meninggal_hilang_maks` ditahan; kandidat kejadian tunggal per jenis ditambah (P1 butir 9) |
| 0,2% dikaitkan ke KD-2 | KERANGKA §6 KD-2 dan putusan V02 dibaca | Kaitan dihapus; faktor hanya di Gambar 7.3 berpil asumsi-kebijakan |
| Bank Dunia 2016 tercatat sekunder di pustaka | PDF documents1.worldbank.org dibuka: US$16,1 miliar dan Rp221 T hlm. PDF 3, 1,9% PDB hlm. PDF 6, 19 meninggal dan > 500.000 ISPA (The Guardian) hlm. PDF 7, luas 2.611 ribu ha bersumber BPPT | Pustaka diperbarui jadi primer dengan URL, halaman, tanggal buka |
| 61,08% ditulis persen ZOM | Siaran BMKG 22 Sep 2026: "61,08% luas daratan", "18,55% luas daratan", "51,90% luas daratan" | Semua tempat ditulis persen luas; satuan registri "% luas daratan" |
| Koplitz "September–Oktober" | Makalah bagian 3.2: horizon Juli–Oktober; "focus only on adult mortality" | Ditulis paparan Juli–Oktober 2015, kematian dewasa, bukan beban total |
| "Tidak punya analog" untuk kemarau tahun kedua | Cache ONI: NDJ 1986 1,21, JAS 1987 1,46, ASO 1987 1,49; episode 2014–2016 di atas 0,5 sejak SON 2014 | Baris kepekaan dibuat (P2 butir 14), kemungkinan "tidak dinilai"; frasa dibatasi ke delapan El Niño kuat |
| Stimulan rumah dengan kunci "materiil" | KERANGKA §2 butir 9 (c); `kartu_skenario.csv` tidak memuat rumah rusak per jenis | Kunci diganti `*.stimulan_rumah_semua_jenis`; stimulan dikeluarkan dari Kartu 7.1; pemecahan per jenis masuk Celah |
| Mengungsi 1.043.740 disebut puncak | Catatan `kartu_skenario.csv`: jumlah pengungsi tercatat semusim | Dilabel jumlah semusim, bukan serentak; kartu menulis "puncak serentak tidak tersedia di DIBI" |
