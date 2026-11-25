# RISET: Semai Redistribusi Banjir dan Penguji Efektivitas

Riset sains semai, data cuaca, dan benchmark sudah dikerjakan paket induk (`data/kajian-bnpb/semai-awan/RISET.md` dan
`riset/R1` sampai `R5`) dan tidak diulang. Dokumen ini hanya menambah yang khusus tujuan banjir dan penguji efektivitas.
Riset efektivitas OMC dan uji karhutla Okt 2026 ada di `data/laporan-bnpb/omc/riset/` dan dirujuk, bukan disalin.

## 1. Praktik OMC banjir di Indonesia (pemberitaan, belum dokumen teknis)

| Temuan | Sumber | Status |
| ------ | ------ | ------ |
| BMKG menjalankan OMC 24 jam untuk menekan risiko banjir Jabodetabek dari Posko Lanud Halim Perdanakusuma (mulai 7 Jul 2025); BMKG menentukan lokasi semai, BNPB melaksanakan di lapangan | [BMKG, siaran pers](https://www.bmkg.go.id/siaran-pers/bmkg-operasi-modifikasi-cuaca-berjalan-24-jam-untuk-tekan-risiko-banjir-jabodetabek), [Kompas 12 Jul 2025](https://lestari.kompas.com/read/2025/07/12/095106986/cegah-banjir-di-jabodetabek-bmkg-gelar-operasi-modifikasi-cuaca-24-jam) | rilis resmi |
| Armada CASA 212-200, bahan NaCl dan CaO | [Bisnis, 7 Mar 2025](https://kabar24.bisnis.com/read/20250307/15/1859194/bmkg-lakukan-operasi-modifikasi-cuaca-selama-24-jam-untuk-tekan-risiko-banjir-jabodetabek) | pemberitaan |
| BMKG: OMC "langkah mitigasi, bukan solusi banjir"; semai tidak menumbuhkan awan baru | [RMOL, 26 Jan 2026](https://rmol.id/nusantara/read/2026/01/26/695101/bmkg-operasi-modifikasi-cuaca-langkah-mitigasi-bukan-solusi-banjir), [InfoPublik](https://infopublik.id/kategori/nasional-sosial-budaya/956819/bmkg-tegaskan-omc-untuk-mitigasi-bencana-bukan-pemicu-cuaca-tidak-stabil) | pernyataan resmi |
| BMKG menyatakan operasi "berhasil menurunkan intensitas hujan" di wilayah target | siaran pers BMKG di atas | klaim tanpa metode tertulis atau kontrol |
| Operasi berulang Mar 2025, Jul 2025, Jan 2026 (diperpanjang), Nov 2025 oleh BPBD | [Kompas 10 Nov 2025](https://lestari.kompas.com/read/2025/11/10/075638486/bpbd-gelar-modifikasi-cuaca-untuk-cegah-banjir-di-jabodetabek), [Jawapos Jan 2026](https://www.jawapos.com/jabodetabek/2601160248/antisipasi-intensitas-hujan-tinggi-pemprov-dki-lakukan-omc-hingga-22-januari-2026) | pemberitaan |

**Celah.** Pencarian 25 Nov 2026 tidak menemukan dokumen teknis BMKG atau BRIN yang menulis cara memilih lokasi semai untuk tujuan
banjir: berapa jauh di hulu angin, apakah di laut, ambang awan, dan mekanisme yang dipakai (hujan dipercepat jatuh di hulu, atau
penyemaian berlebih supaya tetes awan kecil dan hujan berkurang). Konsep "semai di hulu angin atau di laut sebelum awan masuk
sasaran" di paket ini berasal dari kalimat pemilik dan dipakai sebagai hipotesis kerja. Pertanyaan untuk BMKG dicatat di §5.

## 2. Sains: apa yang berbeda dari karhutla

1. **Arah tujuan terbalik.** Karhutla ingin titik hujan berada di atas api (faktor D). Banjir ingin hujan jatuh **sebelum** sasaran,
   jadi titik hujan zona harus berada di luar sasaran dan sesudah itu awan masih menempuh 30 sampai 150 km ke sasaran.
2. **Hujan sasaran sering lahir di tempat.** Hujan lebat Jabodetabek banyak berasal dari konveksi sore yang tumbuh di atas daratan
   (pemanasan siang, angin laut, lereng Bogor), bukan dari awan yang datang dari laut. Untuk awan seperti itu tidak ada hulu angin
   yang bisa dicegat; mesin akan menulis "tidak ada awan layak semai di hulu sasaran", bukan memaksa zona. Ini batas fisik yang
   ditulis di kartu "Yang tidak terlihat satelit dan model".
3. **Angin pengarah lemah.** Pada angin pengarah < sekitar 2 m/s, awan nyaris diam; tenggang tiba ke sasaran menjadi > 4 jam dan
   lintasan mundur tidak bermakna. Zona dibuang (ALGORITMA §3).
4. **Bukti kemanjuran lebih lemah lagi.** Uji acak higroskopis dunia menilai **penambahan** hujan (CAIPEEX-IV sekitar +18% di area
   hilir 100 km2, `RISET-EFEKTIVITAS-OMC.md`). Tidak ditemukan uji acak untuk **pengurangan** hujan di sasaran hilir. Klaim di layar
   tetap hanya "awan layak semai di hulu sasaran".
5. **Memindah banjir.** Hujan yang dilepas di hulu jatuh di tempat lain. Bila tempat itu daratan berpenduduk yang juga basah, risiko
   pindah. Maka zona di laut didahulukan dan daratan kab berpeluang banjir dibuang (KEPUTUSAN D5).

## 3. Kode dan data repo yang dipakai ulang (inventaris 25 Nov 2026)

| Kebutuhan | Yang sudah ada | Catatan |
| --------- | -------------- | ------- |
| Awan layak semai | `scripts/operasi/semai.py` (`turunan_np`, `gerbang_np`, `komp_np`, `q_np`, `evaluasi`, `rakit_zona`), `semai_murni.py`, `semai_bobot.json` | parameter `mode` sudah dipakai untuk `bawaan`/`nimbus` (KEPUTUSAN D1) |
| Data IFS | `scripts/operasi/semai_ifs.py`, `data/raw/semai/<putaran>/*.npz`, langkah 0 sampai 36; `semai.py` `turunan_np` sudah menghitung `u_pengarah`, `v_pengarah` per langkah | tidak ada unduhan baru |
| Angin dan lintasan | `scripts/udara/lintasan.py`: `angin_di(A, l, lon, lat, jam)` (kisi dict `lat, lon, jam` per 3 jam, `u[l]`, `v[l]` bernilai m/s x 10), `geser(lon, lat, u, v, detik)`, `jalur()` (maju Heun 1 jam) | `semai()` tidak punya kisi IFS yang bisa dipakai ulang: anginnya penutup sebaris 60% 10 m + 40% 850 hPa (`lintasan.py` sekitar baris 362 sampai 386). Maka kisi pengarah dibangun adaptor di `semai.py` (DESAIN-TEKNIS §1) |
| Prakiraan banjir per kab | `public/prediksi/data/prediksi.json`: `kab[]` 514 baris; `BNJ` `[lv, ps]` per tenggang 1 sampai 3; `HJN` `[p1, p20, p50, tot, mulai, lama, puncak, m]`; `waspada[]` beraturan `banjir` | rapor `BNJ` "belum teruji" (24 Nov 2026) |
| Pernyataan BMKG | `public/banjir/data/cuaca_bmkg_kab10.json` (prakiraan kondisi harian BMKG 10 hari per kab, kunci `"11.01"`, label `Hujan Ringan`, `Hujan Sedang`, `Hujan Petir`, dst.); nowcast `public/banjir/data/peringatan.json` | anak tangga `h3` di `tangga.json` seluruhnya model kita (`s: "kita"`, 25 Nov 2026), jadi tidak dipakai sebagai sumber BMKG; nowcast berlaku 2 sampai 3 jam per provinsi: hanya konfirmasi dekat jam terbang |
| Target renlap | `migrations/0129_semai_target.sql`, `src/operasi_semai.js` (`NAMA_SAH`, `buat`, pola `zona_id` `^\d{10}-[A-E]$`) | diperluas `B?` (D6) |
| Renlap OMC | `public/renlap_omc.html/js/css` (`/renlap-omc?zona=`), `scripts/operasi/renlap.py` (`jarak_nm`, `baringan`, `dms`) | rute terbang tidak berubah |
| OMC resmi BMKG | `scripts/omc/bmkg_omc.py` -> `public/udara/data/omc_bmkg.json`: `baris[]` `{tahun, periode_awal, periode_akhir, jenis_kegiatan, operator, bahan_semai, provinsi, kode_prov}`; sumber tidak memuat sortie dan kg | 104 baris berjenis persis `Pengurangan CH - Bencana` (jenis `Pengurangan CH - Acara` dan `- Infrastruktur`, masing-masing 5 baris, tidak dihitung); 103 baris bertanggal sah memberi 888 provinsi-hari unik di 14 provinsi; DKI, Jabar, Banten 319 provinsi-hari; per tahun 2023: 8, 2024: 13, 2025: 48, 2026: 35 baris. Satu baris Jawa Timur (BRIN, NaCl) bertanggal terbalik "1 Januari 2024 - 15 Januari 2023": tidak dijadikan perlakuan, dan Jawa Timur 1 sampai 15 Jan 2023 serta 1 sampai 15 Jan 2024 dibuang dari panel (status perlakuan tak diketahui, aturan 25 Okt PRAREG karhutla). Dihitung ulang 25 Nov 2026. Kovariat IFS baru ada sejak 3 Feb 2024 (KEPUTUSAN D11): 795 provinsi-hari terpakai |
| Penguji karhutla | `scripts/omc/efek.py` (CHIRPS, IFS Open-Meteo `ecmwf_ifs025`, TWFE `resid()` FWL, `ols()` klaster, permutasi, plasebo, MDE) | dipakai ulang lewat impor, bukan disalin |
| Vonis kesesuaian | `scripts/omc/nilai.py`: `sejalan`, `tak_terbedakan`, `berlawanan`, `data_kurang`; plasebo Clopper-Pearson | kategori sama, aturan lolos di RENCANA-UJI §6 |
| Hujan satelit | CHIRPS lewat `efek.py tarik`; IMERG Late `scripts/cuaca/imerg.py` (arsip hanya kab maks >= 10 mm, jadi tersensor) | Q1 |
| Batas kab | `public/geo/kabupaten/*.json` | sama dengan `efek.py` |
| Paparan | `scripts/udara/kota.json` (jiwa per kab/kota) | faktor P |

## 4. Kekuatan statistik: harapan jujur

Uji karhutla Okt 2026 (`HASIL-EFEK-OMC.md`): 109 kab-hari perlakuan, 4.325 kontrol, 9 hari operasi, MDE 106%. Desain itu hanya bisa
melihat OMC yang melipatduakan hujan harian.

Dua perkiraan jumlah sasaran-hari perlakuan yang dibutuhkan untuk melihat pengurangan 20 sampai 30% (daya 80%, alfa 5% dua sisi):

1. **Skala dari hasil karhutla** (galat baku turun sebanding akar n, derau dianggap sama): n = 109 x (106 / efek)^2. Efek 30%:
   sekitar 1.360; efek 20%: sekitar 3.060 sasaran-hari. Batas atas, karena musim kemarau Okt 2026 berhujan rata-rata 1,7 mm/hari
   sehingga derau relatifnya besar.
2. **Rumus dua kelompok** (`RISET-EFEKTIVITAS-OMC.md` butir 7): n per kelompok = 15,7 x CV^2 / efek^2 x (1 - r^2). Musim hujan
   diandaikan CV hujan harian kab 1,5 dan kovariat IFS menjelaskan r^2 = 0,4 (asumsi, diukur di SB-12 sesudah PRAREG terkunci): efek 30%: sekitar 240;
   efek 20%: sekitar 530 per kelompok. Batas bawah.

Jadi butuh sekitar **250 sampai 3.000 sasaran-hari** dengan derau seperti karhutla. Klaster per hari memotong n efektif: 13 kab
Jabodetabek di hari yang sama bukan 13 pengamatan bebas. Lapis A punya 795 provinsi-hari bercakupan IFS (86 provinsi-periode), tetapi satuan provinsi jauh lebih kasar
dari sasaran yang sebenarnya disemai, sehingga efek di sasaran diencerkan oleh kab lain di provinsi yang sama. Harapan jujur: Lapis A
hanya bisa melihat efek besar (MDE kemungkinan 40 sampai 100%), Lapis B butuh beberapa musim hujan. Uji acak hari-layak (Q11) adalah
satu-satunya jalan ke sebab-akibat.

## 5. Pertanyaan untuk BMKG (lewat pemilik)

1. Lokasi semai untuk tujuan pengurangan curah hujan dipilih bagaimana: jarak hulu, laut atau darat, ambang awan?
2. Mekanisme yang dipakai: mempercepat hujan di hulu, atau penyemaian berlebih?
3. Apakah ada log sortie berjam dan berkoordinat untuk operasi `Pengurangan CH - Bencana`? (sama dengan Q10 induk)
4. Kapan CaO dipakai, kapan NaCl?
