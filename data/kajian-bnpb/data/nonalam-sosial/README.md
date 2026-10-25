# Paket `nonalam-sosial`: pandemi, gagal teknologi, kebakaran TPA, konflik dan kerusuhan

Bahan Bab 8 (Bencana Nonalam), Bab 9 (Bencana Sosial), Lampiran C (kartu skenario) dan G (rekonsiliasi angka)
*Grand Design Mitigasi Bencana Indonesia 2026–2030*. Dibangun 23 Okt 2026; semua sumber jaringan ditarik atau dibuka
pada tanggal itu.

**Format angka.** CSV/JSON: UTF-8, pemisah koma, titik desimal, tanpa pemisah ribuan. Kejadian DIBI pecahan
(1/k per kab, Juklak BNPB 7/2023) dibulatkan 2 desimal. Di README ini angka ditulis gaya Indonesia (6.811.945; 2,41%).

## Menjalankan ulang

```
python3 data/kajian-bnpb/bangun/nonalam-sosial.py          # bangun luring dari mentah/ + rujukan + korpus, lalu self-check
python3 data/kajian-bnpb/bangun/nonalam-sosial.py tarik    # tarik ulang DIBI, WHO, arsip covid19.go.id, InaRISK, lalu bangun
```

Python 3 stdlib. Pencocok nama provinsi (`kunci_nama`, `PROVINSI`) dipakai ulang dari `scripts/banjir/`. Angka yang
disalin tangan ada di `data/kajian-bnpb/bangun/nonalam-sosial_rujukan.json` (tiap baris: sumber, URL, label, catatan).

Tiga berkas mentah **diekstrak sekali dari PDF dengan PyMuPDF** (bukan stdlib, tidak ditarik ulang oleh `tarik`):
`bps_podes2024_gangguan_keamanan.json`, `bps_kriminal2025_lampiran26.json`, `who_jee2023_idn.json`. Hash SHA-256 PDF
asalnya dicatat di berkas masing-masing (`berkas_pdf_sha256` / `pdf_sha256`). Skrip memeriksa jumlahnya, bukan
mengekstrak ulang. Kolom `skor_tabel_ringkasan` di `who_jee2023_idn.json` ditambahkan kemudian (23 Okt 2026) dari tabel
ringkasan PDF yang sama, diekstrak dengan `pdftotext -layout`.

**Sistem kode.** `kode` kab di semua tabel KRB dan `kode_prov` = kode Kemendagri (`scripts/udara/kota.json`,
Kepmendagri 300.2.2-2138/2025). `id_kab_bps` di tabel DIBI = kode BPS dari DIBI apa adanya; awalannya beda dengan
`kode_prov` di 26 baris Papua (mis. Papua Pegunungan `kode_prov` 95, `id_kab_bps` 94xx; Papua Barat 92 lawan 91xx).
InaRISK memakai kode BPS untuk Kab. Fakfak (9101, bukan 9203); skrip menariknya lewat `KRB_ALIAS`.

### Self-check (assert; gagal = keluar non-nol)

1. **514 kab/kota, 119 di Jawa**: KRB COVID-19 lengkap untuk 514 kode `scripts/udara/kota.json`; jumlah kab per provinsi
   sama dengan Tabel 1.1 BPS Podes 2024 (38 provinsi, 514 kab/kota, 7.281 kecamatan, 84.276 desa/kelurahan). Mentah KRB
   wajib ditarik dengan alias kode Fakfak. Kab berpenduduk 0 di API harus **tepat** daftar putih bernama `KRB_TANPA_UNIT`
   (6 kab), masing-masing satu provinsi dengan baris yang memuatnya; keenamnya ditulis kosong, bukan 0. Bila paket
   `irbi` ada, penduduk API baris yang memuat harus 0,85–1,1 × (penduduk_2026 irbi kedua kab) dan ≥ 1,3 × kab itu sendiri.
   Kab dengan terpapar > penduduk harus **tepat** daftar tertutup `KRB_TERPAPAR_LEBIH` (25 kab). Penduduk KRB > 1,6 × kolom
   jiwa `kota.json` dicetak sebagai peringatan (8 kab), bukan kegagalan.
2. **Total cocok dengan sumber**: angka Renas PB Tabel 2.2/2.5/2.6 dibaca dari korpus JDIH lokal dan harus sama dengan
   nilai yang diketik; COVID-19 Renas = API InaRISK nasional (terpapar 272.566.688; luas bahaya rendah/sedang/tinggi);
   jumlah 514 kab = API nasional **persis** untuk penduduk, terpapar, jiwa terpapar, kelas kapasitas, dan aset (RS,
   puskesmas, sekolah), luas dalam ±5 ha (pembulatan per kab; selisih terukur 1–4 ha); kutipan Renstra (6.811.945 kasus,
   161.870 meninggal), Perpres 17/2018, dan Perpres 46/2026 dicek ke teks korpus. Jenis sanksi TPA 231 + 22 + 20 = 273 =
   250 + 23.
3. **DIBI**: total per tahun × jenis Juklak × cakupan dari tarik baris paket ini sama persis dengan agregat paket `dibi`
   (tarik terpisah hari yang sama) untuk ≤ 2025; 2026 boleh naik (dilewati dengan pesan bila mentah paket `dibi` tidak
   ada). Tiap penunjuk DIBI di `peristiwa.csv` cocok tepat 1 baris.
4. **COVID-19**: 34 provinsi (batas 2022); jumlah provinsi dalam 0,1% dari nasional per 30 Sep 2022; kumulatif kasus
   **dan** meninggal covid19.go.id = jumlah harian = `total`; kumulatif kasus dan kematian WHO = jumlah mingguan; minggu
   puncak WHO = jumlah 7 hari covid19.go.id; angka Renstra jatuh di antara dua pekan WHO Jun–Jul 2023; kematian berlebih
   2020 + 2021 = 2020–2021, dan di skenario tidak boleh tampil tanpa kedua batas selangnya.
5. **BPS**: 38 provinsi menjumlah ke INDONESIA di Tabel 1.1, 18.1, 18.2; 2021 menjumlah ke 1.553; persen dihitung =
   persen BPS (± 0,011); Lampiran 26 (2024) = Tabel 18.2.
6. **JEE 2023**: 56 indikator di 19 area, skor 1–5 di kedua tabel PDF; indikator yang beda antara tabel ringkasan dan
   bagian rinci harus tepat {P3.3, P8.3, R4.1}; sebaran skor kedua tabel dicatat di `meta.jee2023_sebaran`. SPAR 0–100.
7. **Semua tabel**: tanpa NaN/inf; label sah; kolom sumber terisi; URL tidak boleh akar domain; baris `narasi` tanpa
   angka dan baris berangka bukan `narasi`; CFR di skenario hanya sebagai `narasi`; durasi `peristiwa.csv` yang punya
   tanggal dihitung skrip, tidak boleh diketik; CSV dan JSON dibaca ulang dari disk dan dibandingkan **per sel**.

Uji mutasi 23 Okt (putaran 2, sesudah perbaikan pemeriksa): menolkan penduduk satu kab di luar daftar putih, menghapus
alias Fakfak, menambah 1 jiwa pada satu kab, mengubah satu kematian harian covid19.go.id, mengubah satu skor tabel
ringkasan JEE, mengubah satu sel CSV sesudah ditulis, dan memberi URL akar domain di rujukan semuanya ditolak; kontrol
tanpa mutasi hijau (skrip uji sekali pakai di luar repo, keluaran ke folder sementara).

## Label keyakinan

| Label | Arti di paket ini |
| --- | --- |
| `resmi` | instansi pemerintah RI: DIBI, InaRISK/KRB, Renas dan Renstra BNPB, rilis bnpb.go.id, Setkab, KLH/BPLH, BPS, Satgas COVID-19 (covid19.go.id), JDIH BPK/peraturan.go.id, TGPF Mei 1998 (tim bentukan pemerintah) |
| `terverifikasi` | sumber primer non-pemerintah RI yang dibuka: WHO (dashboard, JEE, GHO/SPAR/WUENIC/TB), ICG, Human Rights Watch, laporan seminar Brookings-CUNY |
| `sekunder` | berita yang mengutip pejabat/instansi; dokumen primernya tidak dibuka. **Bukan angka utama**, hanya pembanding (pola sama dengan paket `dibi`) |
| `narasi` | baris tanpa angka (keterangan, narasi analog, celah) |
| `estimasi-model` | estimasi model statistik yang belum diuji balik (KERANGKA.md): hanya kematian berlebih WHO 2020–2021 (`covid19_nasional.csv`, `skenario_terburuk.csv`, `rekonsiliasi.csv`). Galat = selang 95% WHO di baris `batas_bawah_95`/`batas_atas_95`; **selalu tulis sebagai rentang**. Indonesia tidak punya data kematian semua sebab bulanan nasional: WHO memodelkannya dari data bulanan Jakarta dan data tahunan historis (Methods §5.1, dalam zip WHO) |
| `asumsi-kebijakan` | tidak dipakai: paket ini tidak memuat parameter kebijakan |

Angka turunan (CFR, kematian per 100 ribu, durasi hari, jumlah per provinsi/pulau) memakai label sumbernya dan
kolom `metode` (di `peristiwa.csv`: kolom `catatan`) menyebut cara hitungnya. **Durasi** memakai satu konvensi: hari
kalender inklusif, tanggal awal dan tanggal akhir ikut dihitung (seperti masa status "terhitung sejak ... sampai dengan
..."). Satu-satunya durasi yang diketik dari sumber adalah lama pemadaman Rawa Kucing (13 hari, kata Wali Kota).

## Berkas

| Berkas | Isi | Sumber (tanggal tarik/akses 23 Okt 2026) | Label | Keterbatasan |
| --- | --- | --- | --- | --- |
| `covid19_nasional.csv` | versi kumulatif kasus/meninggal (Kemenkes 2024, covid19.go.id 30 Sep dan 27 Okt 2022, WHO), per tahun 2020–2025, minggu puncak, kematian berlebih WHO 2020/2021/2020–2021 (rerata, selang 95%), durasi status bencana nasional | Renstra BNPB hlm. 14 (korpus); `mentah/covid19goid_update.json`; `mentah/who_covid19_idn.csv`; `mentah/who_excess_idn.json`; Keppres 12/2020 dan 17/2023 | resmi / terverifikasi / estimasi-model (kematian berlebih) | data harian covid19.go.id hanya sampai 27 Okt 2022 (arsip Wayback); WHO menurut tanggal laporan mingguan; tanggal potong angka Kemenkes 2024 tidak disebut Renstra (setara WHO akhir Jun 2023) |
| `covid19_provinsi.csv` | 34 provinsi batas 2022: kasus, sembuh, meninggal, dirawat, CFR, kematian per 100 ribu | `mentah/covid19goid_prov.json` (data 30 Sep 2022); penduduk KRB dari `krb_covid19_kab.csv` | resmi | bukan angka akhir (status berakhir Jun 2023); data provinsi akhir tidak ditemukan; penyebut = penduduk KRB, bukan BPS (Fakfak termasuk lewat alias; kab tanpa unit KRB terhitung di baris tetangga provinsi yang sama) |
| `indikator.csv` | JEE IHR 2023 (56 indikator), skor SPAR 2018–2025, imunisasi DTP3 dan MCV1 2000–2025, notifikasi TB 2000–2021, angka TPA open dumping KLH | `mentah/who_jee2023_idn.json`, `mentah/who_gho_idn.json`, rujukan (KLH 26 Feb dan 17 Apr 2026) | terverifikasi / resmi | JEE 2023 (edisi 3) tidak sebanding dengan JEE 2017; SPAR edisi 1 dan 2 tidak sebanding; skor JEE dari bagian rinci 'Indicators and scores' (skor berdampingan dengan dasar penilaiannya), padahal tabel ringkasan PDF yang sama memberi P3.3 = 3, P8.3 = 5, R4.1 = 3 (lihat rekonsiliasi); catatan WHO bahwa skor P7.1 tidak sepenuhnya mencerminkan kapasitas dibawa di baris P7.1 |
| `krb_covid19_kab.csv` | 514 kab: penduduk, terpapar, luas bahaya dan risiko per kelas, kelas dominan, kapasitas kab, RS/puskesmas/sekolah di kelas bahaya sedang/tinggi, `catatan` | `mentah/krb_covid19_kab.json` (InaRISK apiv4/kajian-summary/covid-19, kajian=bahaya dan risiko; Fakfak lewat kode 9101) | resmi | KRB 2022–2026 punya 508 unit kab. **6 kab lama bukan unit KRB** dan ditulis kosong: Toba, Kep. Siau Tagulandang Biaro, Bolaang Mongondow Selatan, Pangkajene dan Kepulauan, Pohuwato, Pasangkayu; penduduk dan luas wilayahnya terbaca di baris Karo, Bolaang Mongondow Utara, Bolaang Mongondow Timur, Maros, Bone Bolango, Majene (dugaan penyusun dari luas wilayah API dan penduduk_2026 paket `irbi`; rasio gabungan 0,92–0,98), sehingga angka keenam baris itu bukan angka kab tunggal. **`terpapar` terhitung ganda di 5 kab Sulbar** (persis 2 × penduduk) dan lebih besar dari penduduk di 20 kab lain (1–19.040 jiwa); terpapar nasional 272.566.688 > penduduk 271.680.290, jadi tulis "praktis seluruh penduduk". Arti kolom `jiwa_terpapar` API tidak didokumentasikan |
| `krb_covid19_wilayah.csv` | agregat nasional (API dan jumlah 514 kab), 7 pulau, 38 provinsi | turunan tabel di atas | resmi | `terpapar` Sulbar dan nasional ikut terhitung ganda (kolom `catatan`) |
| `krb_nonalam_nasional.csv` | KRB 2022–2026 nasional untuk COVID-19, epidemi dan wabah penyakit, kegagalan teknologi: luas bahaya per kelas, penduduk terpapar (rentan umur, miskin, disabilitas), potensi kerugian | Renas PB 2025–2029 (Perban BNPB 1/2025) Tabel 2.2, 2.5, 2.6, dibaca dari `data/raw/hukum/teks/perban-nomor-1-tahun-2025.json` | resmi | API InaRISK tidak punya `kajian-summary` per kab untuk epidemi dan kegagalan teknologi (slug tidak ada di peta bahaya frontend), jadi sebaran kab hanya untuk COVID-19 |
| `dibi_nonalam_sosial_baris.csv` | 1.197 baris DIBI id_tipe ≥ 2000 (epidemi, kebakaran gedung/permukiman, gagal teknologi, konflik sosial, lainnya) per tanggal × kab, dengan tanda mutu `catatan_penyusun` | `mentah/dibi_nonalam_sosial.json` | resmi | DIBI data hidup; 2026 sementara; jenis nonalam/sosial baru rapat sejak 2024 |
| `dibi_nonalam_sosial_rekap.csv` | rekap per tahun × jenis Juklak × cakupan (`bencana` = ambang Juklak 7/2023; `semua_laporan`), nasional dan per provinsi | turunan tabel di atas | resmi | rekap menjumlah entri ganda DIBI apa adanya (lihat rekonsiliasi) |
| `peristiwa.csv` | kejadian per metrik per versi: gagal teknologi (Balongan 2021, Cilacap 2021, Plumpang 2023, Morowali 2023, Al Khoziny 2025, Bekasi 2026, Gunungkidul 2025), kebakaran TPA 2023–2026 (16 TPA 2023, Sarimukti, Kopi Luhur, Putri Cempo, Suwung, Rawa Kucing, Jalupang, Jatiwaringin, Jatibarang, Antang), konflik (Sambas 1996–97 dan 1999, Mei 1998, Maluku, Poso, Sampit, pengungsi nasional 2001, Wamena 2019 dan 2026, kerusuhan Agt 2025), epidemi (rabies NTT 2024) | rujukan; baris `asal=DIBI` diisi dari mentah DIBI. Dua versi Plumpang (Kompas TV: 51 luka, 579 pengungsi) disalin dari `data/dibi/kejadian_besar.csv` ke rujukan, jadi build tidak bergantung pada paket `dibi` | campuran, per baris | banyak versi sekunder; pencocokan baris DIBI ke kejadian bernama ditandai "dugaan" bila belum pasti; versi media tanpa URL artikel (dua versi Wamena 2019, satu versi meninggal Plumpang) dibuang dan diganti baris `narasi` tanpa angka |
| `konflik_podes_provinsi.csv` | 38 provinsi + nasional: desa/kelurahan, desa dengan perkelahian massal 2024 dan 2021, persen, desa dengan korban meninggal/luka, tujuh jenis perkelahian | `mentah/bps_podes2024_gangguan_keamanan.json` (Statistik Potensi Desa Indonesia 2024, Tabel 1.1, 18.1, 18.2); `mentah/bps_kriminal2025_lampiran26.json` (Statistik Kriminal 2024/2025 Lampiran 26) | resmi | satuan = desa, bukan kejadian atau korban; 2021 kosong untuk 4 provinsi Papua baru |
| `regulasi.csv` | pasal kunci UU 24/2007, UU 7/2012, PP 2/2015, Perpres 17/2018 jo. 46/2026, Keppres 3/2001, garis waktu status COVID-19 (Keppres 7, 11, 12/2020; Perpres 82/2020; Keppres 17/2023; Perpres 48/2023) | teks dibuka di peraturan.go.id, JDIH Kemenkeu, JDIH BPK, korpus JDIH lokal | resmi | UU 6/2018 dan UU 17/2023 hanya dirujuk lewat konsiderans, pasalnya tidak dibuka |
| `skenario_terburuk.csv` | per jenis: dasar resmi (atau ketiadaannya), parameter historis, analog berangka, narasi analog, celah kerugian | turunan tabel lain + rujukan | per baris | tidak ada skenario resmi berangka untuk pandemi, TPA, maupun konflik; tidak ada angka yang dikalikan atau dikarang. CFR (H5N1 2006–2008, influenza 1918) hanya `narasi` agar tidak dikalikan dengan penduduk terpapar; penduduk terpapar KRB ditulis "praktis seluruh penduduk" |
| `rekonsiliasi.csv` | versi angka yang bertentangan berdampingan, tanda mutu DIBI, API lawan jumlah kab (Fakfak, kab tergabung), terpapar lawan penduduk KRB, JEE tabel ringkasan lawan bagian rinci (dan kedua sebarannya), keterbandingan JEE | turunan | per baris | — |
| `nonalam_sosial.json` | semua tabel + `meta` (jumlah baris, cek silang, sebaran skor JEE kedua tabel); tanpa jam bangun, jadi uji ulang tidak mengubah berkas | | | |

### Mentah

| Berkas | Asal |
| --- | --- |
| `dibi_nonalam_sosial.json` | `POST https://dibi.bnpb.go.id/api/v1/chart/data` (konteks dasbor publik 1, tamu), saring `id_tipe_bencana >= 2000`, kelompok dt × provinsi × kab × id_tipe × kategori × is_bencana, SUM 12 kolom dampak + COUNT |
| `krb_covid19_kab.json` | `https://inarisk.bnpb.go.id/apiv4/kajian-summary/covid-19/{kab}?level=kabupaten&kajian={bahaya,risiko}` untuk 514 kab + `ALL?level=nasional`; kab 9203 diisi ulang 23 Okt 2026 dari kode InaRISK 9101 (`alias_kode`, `catatan_alias`) |
| `who_covid19_idn.csv` | baris Indonesia dari `https://srhdpeuwpubsa.blob.core.windows.net/whdh/COVID/WHO-COVID-19-global-data.csv` |
| `who_excess_idn.json` | lembar "Deaths by year" `WHO_COVID_Excess_Deaths_EstimatesByCountry.xlsx` dalam zip WHO 19 Mei 2023 (dibaca dengan pembaca xlsx stdlib) |
| `who_gho_idn.json` | WHO GHO OData: `WHS4_100`, `WHS8_110`, `TB_notif_num`, `SDGIHR2018`, `SDGIHR2021`, saring IDN |
| `covid19goid_prov.json`, `covid19goid_update.json` | arsip Wayback `data.covid19.go.id/public/api/{prov,update}.json` (snapshot 29 Nov dan 27 Okt 2022; API asli mati) |
| `who_jee2023_idn.json` | skor JEE dari PDF WHO 2024 (ISBN 9789240095151): `skor` dari bagian rinci (PyMuPDF), `skor_tabel_ringkasan` dari tabel ringkasan (pdftotext), `catatan_who` P7.1 |
| `bps_podes2024_gangguan_keamanan.json` | Tabel 1.1, 18.1, 18.2 PDF Statistik Potensi Desa Indonesia 2024 |
| `bps_kriminal2025_lampiran26.json` | Lampiran 26 PDF Statistik Kriminal 2024/2025 (`berkas_pdf_sha256` 48a27c44…) |

## Angka kunci

**Pandemi.** COVID-19: 6.811.945 kasus dan 161.870 meninggal (Kemenkes 2024 via Renstra BNPB, resmi), kumulatif s.d.
sekitar akhir Juni 2023: Renstra tidak menyebut tanggal potongnya ("Maret 2020 hingga Maret 2023" hanya judul Grafik 1.3),
dan kumulatif WHO baru mencapai angka itu antara pekan 25 Jun 2023 (6.811.780 / 161.865) dan 2 Jul 2023 (6.812.087 /
161.878). Jangan ditulis "hingga Maret 2023". WHO 6.830.274 dan 162.059 (laporan terakhir berisi 25 Mei 2025). Kematian
berlebih 2020–2021 menurut model WHO (`estimasi-model`, selalu sebagai rentang): **806.815–1.343.849** (selang 95%;
rerata 1.067.865; 2020: 358.240; 2021: 709.625), lawan kematian terlapor 2020 22.138 dan 2021 121.956 (covid19.go.id).
Minggu puncak 12.444 kematian (pekan 26 Jul – 1 Agt 2021, tanggal laporan WHO 1 Agt; sama persis dengan jumlah harian
covid19.go.id). Status bencana nasional nonalam 13 Apr 2020 – 21 Jun 2023 = 1.165 hari kalender inklusif (1.164 bila hari
berlakunya Keppres 17/2023 tidak dihitung). Per 30 Sep 2022 kematian per 100 ribu tertinggi DIY 161,4, Kaltim 150,7, DKI
138,4; terbanyak Jateng 33.543 dan Jatim 31.808. Dampak layanan: DTP3 85% (2019) → 67% (2021), MCV1 88% → 72%,
notifikasi TB 566.846 (2019) → 393.323 (2020). JEE 2023 menurut bagian rinci (dipakai): dari 56 indikator, 32 skor 4,
20 skor 3, 3 skor 5, 1 skor 2; menurut tabel ringkasan PDF yang sama: 29 skor 4, 22 skor 3, 4 skor 5, 1 skor 2 (beda di
P3.3, P8.3, R4.1). Skor 2 = P7.1 sistem biosafety dan biosecurity lintas pemerintahan, yang menurut WHO tidak sepenuhnya
mencerminkan kapasitas nyata (tertahan satu syarat regulasi). SPAR naik 64 (2021) → 80 (2024, 2025). KRB COVID-19:
kelas bahaya tinggi 1.181.863 ha, 82% di antaranya di Jawa (971.660 ha); kelas risiko tinggi hanya 4.231 ha, hampir
semua di Papua (3.716 ha); penduduk terpapar = "praktis seluruh penduduk" (bukan 272,6 juta sebagai angka presisi).

**Gagal teknologi.** KRB 2022–2026: 186.940 ha bahaya (3.600 ha tinggi), 713.784 jiwa terpapar, potensi kerugian
fisik Rp584.288 juta (Renas PB). Plumpang 2023: 17 meninggal, 49 luka berat, 18 hilang, 1.085 pengungsi (Kepala BNPB, hari
ke-2; resmi), naik ke 29 meninggal per 18 Mar (BPBD DKI, sekunder). Balongan 2021: 912 → 932 pengungsi, 1 meninggal,
6 luka berat, 29 luka ringan, 5 desa (BNPB). Morowali 2023: 19–20 meninggal (20 = Polda Sulteng via ANTARA, dikutip
BHRRC), 29 luka berat (BHRRC, tanpa atribusi; sekunder). DIBI gagal
teknologi 2018–2026: 10 kejadian, 90 meninggal, terbesar ambruknya musala Ponpes Al Khoziny (63 DIBI; 67 Basarnas).

**Kebakaran TPA.** 2023: 16 TPA terbakar hebat bersamaan (BNPB). Sarimukti: 80% lahan terbakar, 3.000 KK terdampak
asap (BNPB), status tanggap darurat kabupaten 21 hari + provinsi 14 hari, darurat sampah Kota Bandung 28 hari (sekunder).
Suwung 32,4 ha, 7 km dari bandara (BNPB). Rawa Kucing 10 ha, 450 personel (BNPB), status 14 hari (sekunder). Jatiwaringin
2026: 15 ha, 4 helikopter, status Keputusan Bupati Tangerang 609/2026, padam 100% 30 Jun – 9 Jul = 10 hari kalender
(BNPB). KLH: 485 TPA;
sekitar 369 belum berhenti open dumping akhir 2025; 273 disanksi; target berhenti total Agustus 2026.

**Konflik dan kerusuhan.** Desa/kelurahan dengan perkelahian massal 2.031 (2,41%) pada 2024, naik dari 1.553 (1,85%)
pada 2021; 150 desa dengan korban meninggal (BPS). Persen tertinggi: DKI 18,73%, Maluku 11,41%, Maluku Utara 11,33%.
DIBI konflik sosial 2019–2026: 17 kejadian, 93 meninggal, 14.804 mengungsi (2026 sementara: 8 kejadian, 46 meninggal,
4.279 mengungsi)¹. Analog: Maluku 1999–2002 sedikitnya 5.000 (mungkin 10.000) meninggal, sekitar 700.000 mengungsi (ICG);
Poso sekitar 1.000 dan > 100.000 (HRW); Sampit sekitar 500 dan 108.000 (ICG); pengungsi tercatat resmi > 1 juta pada
2001; Mei 1998 Jakarta 288 sampai 1.217 meninggal: 288 (Pemda DKI), 451 (Polda), dan 463 (Kodam) versi aparat atau
pemda, 1.217 versi Tim Relawan (non-pemerintah); keempatnya dimuat laporan TGPF, dibaca dari transkripsi Wikisource;
kerusuhan Agt 2025 11 meninggal (Komnas HAM, sekunder).

¹ Termasuk dugaan entri ganda Maluku Tengah (1 kejadian, 4 meninggal, tercatat 3 Apr 2025 dan 3 Apr 2026) dan baris
Jayawijaya 7 Mei 2026 (33 meninggal) yang bertanggal hari jembatan Wouma putus, sehingga kemungkinan memuat korban
jembatan.

**Mandat.** UU 24/2007 Pasal 1 angka 3–4 memasukkan epidemi, wabah, gagal teknologi (nonalam) dan konflik sosial
(sosial) ke bencana. UU 7/2012 menaruh penghentian kekerasan di Polri dan status konflik di kepala daerah/Presiden; BNPB
hanya unsur Satgas Penyelesaian Konflik Sosial skala nasional (Pasal 49). PP 2/2015 menugaskan pemenuhan kebutuhan dasar
pengungsi konflik ke menteri sosial. Perpres 46/2026 membuka penyelenggaraan PB oleh Kepala BNPB dalam keadaan tertentu
untuk ancaman faktor "alam, nonalam, dan/atau sosial" dan daerah dalam rekonsiliasi pascakonflik berkapasitas fiskal
rendah, setelah keputusan rakor yang dikoordinasikan Menko.

## Rekonsiliasi dan tanda mutu yang harus dibawa ke naskah

- **COVID-19 meninggal**: 158.112 (30 Sep 2022) / 158.522 (27 Okt 2022) / 161.870 (Kemenkes 2024, setara WHO akhir Jun
  2023) / 162.059 (WHO) adalah pemutakhiran; 806.815–1.343.849 (rerata 1.067.865) adalah estimasi model WHO atas kematian
  berlebih semua sebab dikurangi kematian akibat konflik/bencana alam, bukan kematian COVID terkonfirmasi. Jumlah meninggal
  34 provinsi per 30 Sep 2022 (158.174) lawan nasional (158.112): selisih tidak dijelaskan sumber.
- **Plumpang**: 17 (hari ke-2) → 21 → 29; satu versi lain yang dicatat riset A (JPNN/Katadata) tidak ditemukan ulang dan
  tidak dipakai. Pengungsi 1.085 (BNPB) lawan 579 (Kompas TV, 4 Mar). DIBI tidak punya baris.
- **DIBI**: entri ganda subjenis (Nias Selatan 9 Jan 2025: 14 meninggal tercatat dua kali di "Epidemi dan Wabah Penyakit"
  dan "Wabah Penyakit", sehingga epidemi 2025 terbaca 28 meninggal; Bima 16 Mar 2025 sama tetapi tanpa korban, jadi yang
  terhitung dua kali hanya kejadiannya) dan dugaan entri ganda lintas tahun (Maluku Tengah 3 Apr 2025 dan 3 Apr 2026:
  meninggal, luka, dan rumah rusak berat identik; mengungsi beda, 1.135 lawan 1.385). "Gagal teknologi" DIBI memuat runtuhnya bangunan,
  dugaan tabrakan KA (Bekasi Timur, jenis "Kecelakaan Industri") dan dugaan kejadian pantai (Gunungkidul), sementara
  Balongan, Plumpang, dan Morowali tidak ada barisnya. Kebakaran TPA tidak punya jenis tersendiri di DIBI.
- **Wamena 2026**: DIBI "Konflik Sosial" bertanggal 7 Mei 2026 (33 meninggal, 1.917 mengungsi) = hari jembatan gantung
  Wouma putus (24 jenazah tenggelam menurut Polres); Polda Papua mencatat 874 pengungsi konflik (18 Mei).
- **TPA open dumping**: 343 (diawasi awal 2025), 388 (diawasi s.d. Feb 2026), 273 (disanksi), 485 (total TPA), 369 (belum
  berhenti); rilis 17 Apr 2026 menyebut "sekitar 30%" berhenti tetapi 485 − 369 = 116 (24%).
- **KRB API lawan jumlah 514 kab**: sama persis (penduduk 271.680.290; kapasitas rendah 315) setelah Kab. Fakfak ditarik
  dengan kode InaRISK 9101. Tanpa alias, selisihnya sama dengan baris Fakfak: 88.767 jiwa, 1.431.380 ha bahaya rendah,
  1 kab kapasitas rendah. Akibat lama kesalahan ini: penyebut per 100 ribu Papua Barat di `covid19_provinsi.csv` kurang
  88.767 jiwa (kini 33,5, sebelumnya 36,2).
- **KRB terpapar lawan penduduk**: terpapar API 272.566.688 > penduduk 271.680.290 karena terpapar 5 kab Sulbar persis 2 ×
  penduduk (kelebihan 1.436.323) dan 20 kab lain lebih kecil selisihnya. Angka terpapar yang sama muncul di Renas Tabel
  2.5. Di naskah: "praktis seluruh penduduk".
- **JEE 2023**: tabel ringkasan lawan bagian rinci beda di P3.3 (3 lawan 4), P8.3 (5 lawan 4), R4.1 (3 lawan 4); keduanya
  di `rekonsiliasi.csv`. Paket memakai bagian rinci; bila naskah mengutip sebaran, sebutkan bagian mana.

## Keterbatasan dan celah

- **Tidak ada skenario pandemi resmi berangka** untuk Indonesia yang ditemukan (Kepmenkes 300/2009 hanya pedoman
  episenter; renkon pandemi influenza nasional disebut WHO Indonesia 2019 tetapi dokumennya tidak ditemukan). Skenario
  disajikan sebagai analog COVID-19 dan parameter historis, tanpa perkalian.
- **Kerugian rupiah dan imateriil** untuk keempat jenis tidak ada di sumber yang dibuka, kecuali potensi kerugian fisik
  kegagalan teknologi (KRB) dan biaya darurat Sarimukti (biaya respons, sekunder).
- **COVID-19 per provinsi** hanya sampai 30 Sep 2022 (arsip). Angka provinsi akhir (Maret–Juni 2023) tidak ditemukan.
- **Sebaran kab** hanya untuk COVID-19 (KRB). Epidemi lain dan kegagalan teknologi hanya nasional. Enam baris kab KRB
  memuat wilayah kab tetangga (lihat `krb_covid19_kab.csv`); per-kab untuk keenam pasangan itu tidak bisa dipisah dari API.
- Halaman yang tidak terbuka dan karenanya tidak dipakai: Laporan Harian Pusdalops BNPB 2023 (DNS gagal), USCR/Refworld
  (verifikasi bot Cloudflare; tidak ditembus), Kompas (paywall: angka 80/100 pengungsi Cilacap), Bisnis.com (403).
- **Antang (Makassar) 2023**: kejadian kebakaran tidak ditemukan; jangan dikutip.
- Agustus 2025: laporan LNHAM (20 Apr 2026) belum dibuka; angka korban hanya versi Komnas HAM via berita.
- Status darurat TPA umumnya hanya diketahui dari berita (sekunder); nomor SK yang tercatat: Kota Tangerang
  442/Kep.1023-BPBD/2023, Kota Denpasar 188.45/2575/HK/2023 dan 188.45/2651/HK/2023, Kab. Tangerang 609/2026 dan 613/2026
  (yang terakhir dari BNPB, resmi).
