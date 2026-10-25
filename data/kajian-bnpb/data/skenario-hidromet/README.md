# Paket data `skenario-hidromet`

Skenario terburuk yang masuk akal (pola UK NRR) untuk banjir, banjir bandang, longsor, cuaca ekstrem,
gelombang ekstrem/abrasi/rob, kekeringan, dan karhutla. Dipakai Bab 7 Kajian 2 (Mitigasi Bencana
Indonesia 2026–2030) dan Bab 5–6 Kajian 1 (Ketahanan Air Jawa). Data dibekukan per tanggal tarik cache
(saat ini 23 Okt 2026; `meta.tarik` di `kab.json` dan `kartu_skenario.json`).

```
python3 data/kajian-bnpb/bangun/skenario-hidromet.py          # bangun ulang dari cache (tanpa jaringan bila cache lengkap)
python3 data/kajian-bnpb/bangun/skenario-hidromet.py --tarik  # tarik ulang InaRISK, DIBI, SiPongi, ONI, lalu bangun
python3 data/kajian-bnpb/bangun/skenario-hidromet.py uji      # self-check fungsi murni saja
```

Skrip: Python 3 stdlib. Mesin kekeringan `public/kekeringan/simulasi.js` dijalankan lewat `node`.
Tiap bangun menjalankan `uji()` lalu `periksa()`; gagal satu invarian = berhenti dengan pesan berangka.

## Berkas

| Berkas | Isi | Sumber | Label |
| --- | --- | --- | --- |
| `kab.json` | Satu objek per kab (514): penduduk, `paparan[bahaya]`, `dibi[jenis]`, `skenario`. `meta.kolom` memuat label dan arti tiap kolom; `meta.tarik` tanggal tarik tiap cache; `meta.dibi_jenis` semua jenis DIBI dan yang dikecualikan. Untuk peta | semua di bawah | per kolom (`meta.kolom`) |
| `paparan_kab.csv` | 514 kab × 6 bahaya: overlay jiwa kelas tinggi, luas/terpapar/kerugian potensi KRB | InaRISK KRB 2022–2026 per kab; `bahaya.json` × `penduduk.json` | `krb_*` resmi; `overlay_*` estimasi-model |
| `dibi_kab.csv` | 514 kab × 9 jenis: kejadian, meninggal, hilang, menderita, mengungsi, rumah RB/RS/RR, 2008–23 Okt 2026 | DIBI BNPB | resmi |
| `skenario_kab.csv` | per kab: musim hujan analog dan selubung La Niña, kekeringan 2015 (model), karhutla DIBI 2015/2019 | DIBI, mesin neraca | per kolom, lihat `kab.json` `meta.kolom` |
| `kartu_skenario.csv` / `.json` | kartu skenario nasional, Jawa, dan kasus nyata, format panjang: `skenario, wilayah, metrik, nilai, rendah, tinggi, satuan, label, sumber, catatan`. JSON memuat juga `lampiran` | semua | per baris |
| `lampiran_kekeringan_model.csv` | angka padi dan puso model kekeringan 2015 (nasional, Jawa), kolom sama dengan kartu. Dipisah dari kartu utama karena mesinnya belum pernah diuji balik | mesin neraca | estimasi-model |
| `rasio_korban.csv` | rasio (meninggal+hilang)/kejadian dan per 100 rb terdampak per jenis per tahun 2010–2025, kolom `dipakai`, plus median dan p90 (dan `*_dengan_2024` sebagai pembanding) | DIBI | resmi (seri), estimasi (ringkasan) |
| `musim_hujan.csv` | total musim hujan 2008/09–2025/26 (1 Okt–30 Apr), ONI NDJ, status La Niña, penanda analog | DIBI, NOAA CPC | resmi |
| `kepekaan_peringatan_dini.csv` | korban skenario bila cakupan peringatan dini naik; kolom `utama` menandai pasangan Renas 11,06% → 52% | WMO 2022, Renas/Renstra BNPB | asumsi-kebijakan |
| `karhutla_provinsi.csv` | luas 2015/2019 per provinsi (SiPongi dan tabel Bank Dunia), ISPA 2015/2019, DIBI, `prov_asap`, `catatan` | SiPongi, Bank Dunia, BNPB via pers | luas SiPongi dan DIBI resmi; Bank Dunia dan ISPA terverifikasi |
| `ringkas_wilayah.csv` | nasional, 7 pulau, 38 provinsi × 9 jenis: paparan dan DIBI | turunan berkas di atas | sama dengan sumbernya |

Format: CSV UTF-8, pemisah koma, titik desimal, tanpa pemisah ribuan. Sel kosong = tidak tersedia
(bukan nol). `kejadian` DIBI bisa pecahan: satu kejadian lintas kab dibagi pecahan oleh DIBI (mis. lima kota
Jakarta masing-masing 0,2 pada Jan 2020); korban dan rumah dicatat per kab. Rupiah dalam Rp penuh kecuali
kolom berakhiran `_juta_rp`. Kolom `catatan` memakai gaya Indonesia (titik ribuan, koma desimal).

## Sumber dan tanggal tarik (cache di `data/kajian-bnpb/riset/mentah/`)

Tanggal tarik tidak ditulis mati di skrip: dibaca dari kunci `tarik` cache (KRB, DIBI) atau dari mtime
berkas (SiPongi, ONI, yang disimpan sebagai respons mentah). Salin cache dengan `cp -p` supaya mtime ikut.

| Cache | Sumber | Tarik |
| --- | --- | --- |
| `krb_kab/<bahaya>.json` | `https://inarisk.bnpb.go.id/apiv4/kajian-summary/<bahaya>/<kode>?level=kabupaten`, 514 kab × banjir, banjir-bandang, tanah-longsor, cuaca-ekstrim, gelombang-ekstrim-dan-abrasi, kekeringan | 23 Okt 2026 (`tarik`) |
| `dibi_hidromet.json` | DIBI Superset `POST /api/v1/chart/data` (dasbor publik 1), dikelompokkan per tanggal-kab-jenis, SUM; 58.992 baris. Kunci `jenis`: semua jenis DIBI (nama, n baris mentah, kunci paket atau null) | 23 Okt 2026 (`tarik`, `jenis_tarik`) |
| `sipongi_luas_2015_2026.json` | Kementerian Kehutanan (SiPongi; sebelum Okt 2024 KLHK) `opsroom.sipongidata.my.id/api/list/luas-kebakaran/provinsi` | 23 Okt 2026 (mtime) |
| `oni_cpc.txt` | NOAA CPC `https://www.cpc.ncep.noaa.gov/data/indices/oni.ascii.txt` (`tarik_oni()`) | 23 Okt 2026 (mtime) |
| `ks_*.json` (sudah ada) | InaRISK kajian-summary nasional, untuk cek jumlah kab | 23 Okt 2026 (riset A) |

Berkas repo yang dibaca: `scripts/udara/kota.json` (514 kode Kemendagri 2025), `public/data/penduduk.json`,
`scripts/banjir/kejadian.py` (`Pencocok`, `kunci_nama`) yang membaca nama kab dari `public/geo/kabupaten/*.json`,
`scripts/banjir/wilayah.py` (`PROVINSI`), `scripts/kekeringan/hth.py` (`sel_terdekat`),
`public/banjir/data/bahaya.json`, `public/banjir/data/param_banjir.json`, `public/banjir/data/pusat_kec.json`,
`public/banjir/data/replay/maret2025.json`, `public/data/kekeringan_neraca.json` (dibuat 19 Okt 2026),
`public/kekeringan/simulasi.js`, `public/kekeringan/sim_tanggap.js` (`ASUMSI.hari_kering`),
`public/kekeringan/data/hindcast.json`, `public/kekeringan/data/tutupan.json`, `public/data/kekeringan_ujibalik.json`,
`public/data/luas_resmi.json`, `public/pesisir/data/abrasi.json`.

Angka dokumen BNPB yang **tidak** dibuka langsung dari PDF Perban, melainkan dikutip dari
`riset/A-dokumen-bnpb.md`: §1.4 (Renas PB 2025–2029 Tabel 2.1–2.7 hlm. 20–25: penduduk terpapar nasional per
bahaya, paparan karhutla nasional), §2.2 (Renas Tabel 2.8 indikator 1.c: 11.060 dan 52.000 per 100.000),
§2.3 (Renstra hlm. 70: peringatan dini 6%), §4.4 (Renstra hlm. 11: Jabodetabek 2020 61 meninggal, 11.569
pengungsi, 3.245 rumah rusak).

Sumber luar yang dibuka langsung (23 Okt 2026), dikutip di kolom `sumber`:
- Bappenas (Feb 2007) *Laporan Perkiraan Kerusakan dan Kerugian Pasca Bencana Banjir Awal Februari 2007 di
  Wilayah JABODETABEK*, salinan di locjkt.or.id: Tabel III.1 hlm. 33 (PDF hlm. 42) kerusakan Rp1.765,89 M +
  kerugian Rp3.418,70 M = Rp5.184,43 M (pemerintah 649,43 M, swasta/masyarakat 4.535,00 M); ringkasan PDF
  hlm. 8 menyebut Rp5,16 T dan mengutip perkiraan APINDO/AAUI US$400 juta (sekitar Rp3,6 T).
- Bank Dunia (Feb 2016) *The Cost of Fire*, teks di documents1.worldbank.org: USD 16,1 miliar (Rp 221 T), 1,9% PDB 2015, 2,611 juta ha (tabel provinsi), 19 meninggal dan lebih dari 500.000 ISPA (keduanya kutipan Bank Dunia dari The Guardian).
- Bank Dunia (Des 2019) *Indonesia Economic Quarterly*, Box A.1: USD 5,2 miliar (157 juta kerusakan + 5,0 miliar kerugian), 0,5% PDB, 8 provinsi Jun–Okt 2019; 620.201 ha Jan–Sep 2019 (data KLHK).
- BNPB 22 Okt 2015 (via JawaPos): 450.431 ISPA, Juli–22 Okt 2015, 6 provinsi. BNPB 23 Sep 2019 (data Kemenkes, via CNN Indonesia): 919.516 ISPA, 6 provinsi. Rilis asli belum dibuka, jadi berlabel terverifikasi.
- WMO, siaran pers 13 Okt 2022 *UN warns that half the world is not prepared for disasters*
  (`https://wmo.int/media/news/un-warns-half-world-not-prepared-disasters`; laporan UNDRR–WMO *Global Status of
  MHEWS: Target G*): mortalitas bencana 8 kali lebih tinggi di negara bercakupan peringatan dini terbatas
  dibanding yang substansial–komprehensif.
- Haque dkk. (2012) *Bull WHO* 90:150–156: kematian siklon Bangladesh turun lebih dari 100 kali (1970 ±500.000; 1991 138.958; Sidr 2007 4.234).

## Metode

**Wilayah.** 514 kab/kota = `scripts/udara/kota.json`; 119 di Jawa (prov 31–36). Pulau: Sumatera
(11–21), Jawa, Bali-Nusa Tenggara (51–53), Kalimantan (61–65), Sulawesi (71–76), Maluku (81–82), Papua (91–96).
Satu kecamatan di `penduduk.json` (Lemito) memakai ejaan "Pahuwato"; dipetakan ke Kab. Pohuwato.

**Paparan.** Dua versi, berdampingan:
1. *KRB per kab* (resmi). Kolom API `terpapar` adalah angka yang dikutip Renas PB. Jumlah 514 kab terhadap angka
   nasional Renas Tabel 2.1–2.7: banjir 100,00% (113.826.725 lawan 113.829.496), banjir bandang 99,98%, longsor
   99,71%, cuaca ekstrem 99,97%, kekeringan 99,97%, gelombang 98,81% (4.080.596 lawan 4.129.597; API nasional
   gelombang sendiri 4.104.943, juga beda dengan Renas). Tafsiran "`terpapar` = penduduk zona sedang+tinggi"
   adalah **inferensi**: yang terbukti hanya `total_luas` API = luas sedang + tinggi. API juga punya kolom
   `jiwa_terpapar` yang lebih kecil (banjir 109.618.626 nasional); tidak dipakai karena tidak dikutip dokumen
   resmi dan definisinya tidak tertulis. KRB karhutla per kab membalas nol; paparan karhutla **nasional** ada di
   Renas (luas 128.283.490 ha, kelas tinggi 25.457.756 ha, potensi kerugian Rp709.049.963 juta, lingkungan
   6.284.991 ha) dan masuk kartu karhutla.
2. *Overlay platform* (estimasi-model): seluruh penduduk kecamatan yang indeks InaRISK maksimumnya
   (pusat + kisi 3×3) ≥ 2/3. Ambang tiga sama lebar adalah pilihan (sama dengan `scripts/gempa/dampak.py`),
   bukan ambang resmi. Batas atas. Tidak ada untuk cuaca ekstrem.

**DIBI.** Nama kab dicocokkan ke peta lewat `Pencocok` milik `scripts/banjir/kejadian.py` (kode
`id_kab_bps` DIBI adalah kode BPS dan sering beda dengan Kemendagri, jadi tidak dipakai langsung). 58.992
baris, 0 tak cocok. Jenis: banjir (Banjir, Banjir Genangan), banjir_bandang, longsor (Tanah Longsor, Gerakan
Tanah), banjir_longsor ("Banjir dan Tanah Longsor", berdiri sendiri supaya tidak terhitung ganda), cuaca_ekstrem
(Cuaca Ekstrem, Puting Beliung, Angin Kencang, Angin Topan), gelombang_abrasi, rob, kekeringan, karhutla.
Jenis yang dikecualikan tercatat di `meta.dibi_jenis` (antara lain geologi, kebakaran gedung, epidemi, konflik,
"Banjir Lahar (Lahar)" 2 baris, dan "Lainnya" 62 baris).

Patahan kategori DIBI (dari cache ini): Banjir Bandang, Banjir dan Tanah Longsor, Banjir Rob, dan Puting Beliung
baru muncul 2018, kosong pada 2019 (kecuali Puting Beliung) dan **kosong pada 2024**; Gerakan Tanah baru 2021;
Cuaca Ekstrem nol pada 2018–2020 dan hampir nol 2021–2023 (26, 7, 32 kejadian) karena pencatatan pindah ke
Puting Beliung/Angin Kencang; Tanah Longsor 2024 hanya 219 kejadian (tahun lain 584–1.251). Docstring
`scripts/banjir/kejadian.py` juga menyebut DIBI 2024 tidak lengkap. Penggabungan cuaca_ekstrem meredam patahan
2018–2023, tetapi tidak menutup lubang 2024.

**Musim hujan.** 1 Okt Y – 30 Apr Y+1, jenis banjir, bandang, longsor, banjir_longsor, cuaca ekstrem.
La Niña = ONI NDJ Y termasuk episode CPC (≥ 5 musim tumpang berturut ≤ −0,5): 2008, 2010, 2011, 2017,
2020, 2021, 2022. Musim 2025/26 (ONI NDJ −0,60) bukan episode (hanya 3 musim). Analog = musim dengan
jumlah peringkat terkecil atas lima metrik (kejadian, meninggal+hilang, menderita, mengungsi, rumah rusak).
Aturan pemilihan ini buatan paket, jadi baris tahun analog berlabel asumsi-kebijakan (angka DIBI musim itu resmi):
- `musim_hujan_lanina`: nasional dan Jawa sama-sama 2020/21.
- `musim_hujan_terberat_tercatat` (semua musim): nasional 2025/26 (memuat banjir Sumatra Nov 2025), Jawa 2019/20 (ONI NDJ +0,75, netral/El Niño; memuat Jabodetabek 1 Jan 2020).

Kasus nyata (tanpa rentang korban, yang tercatat adalah angkanya): `kasus_jabodetabek_2020` (DIBI
31 Des 2019–8 Jan 2020, 14 kab/kota Jabodetabek, plus baris Jabodetabek + Lebak, berdampingan dengan versi
Renstra BNPB), `kasus_replay_maret2025` (DIBI 2–8 Mar 2025 + keluaran replay genangan beserta galatnya),
`kasus_sumatra_nov2025` (wilayah `sumatra_aceh_sumut_sumbar`, DIBI 15 Nov–31 Des 2025).

**Korban jiwa.** Rasio r = (meninggal+hilang)/kejadian per jenis per tahun DIBI 2010–2025, hanya tahun
dengan ≥ 5 kejadian. Tahun 2024 **tidak dipakai** untuk longsor, banjir bandang, banjir_longsor, rob, dan cuaca
ekstrem (DIBI 2024 tidak lengkap; Tanah Longsor 2024 memberi r 1,07, jauh di atas tahun lain). Rasio dengan 2024
tetap ditulis di `rasio_korban.csv` (`median_dengan_2024`, `p90_dengan_2024`). Rendah = median tahunan. Tinggi =
persentil 90 peringkat terdekat yang **dibatasi nilai terbesar kedua**, sehingga tahun terburuk tercatat selalu
disisihkan (pola RWCS); untuk n < 20 tahun, tinggi = nilai terbesar kedua. Banyak tahun per jenis (nasional):
banjir 16, banjir bandang 6, longsor 15, banjir_longsor 5, cuaca ekstrem 15, gelombang 16, rob 5, kekeringan 14,
karhutla 15. Korban = Σ jenis kejadian analog × r. Rasio per 100 rb terdampak ikut disimpan tetapi tidak
dipakai, karena kolom `menderita` tidak seragam antarjenis dan antartahun. Jawa memakai rasio Jawa bila ada
≥ 5 tahun memenuhi syarat, selain itu rasio nasional (`pinjam_nasional`: banjir bandang, banjir_longsor, rob).
Per kab: kab Jawa memakai rasio Jawa, kab lain rasio nasional, sehingga jumlah 119 kab Jawa = kartu Jawa
(diuji). Jumlah 514 kab (451–1.000 jiwa) **tidak** sama dengan kartu nasional (525–1.204), yang memakai rasio
nasional untuk semua kab; selisihnya persis kartu Jawa dikurangi Jawa dengan rasio nasional (diuji). Bila jumlah
tercatat di periode analog melebihi batas tinggi, catatan baris menandainya. Rasio karhutla disimpan di
`rasio_korban.csv` tetapi tidak dipakai (lihat karhutla). Semua angka korban belum diuji balik.

**Materiil.** Batas bawah = rumah RB/RS/RR DIBI × stimulan BNPB (`param_banjir.json`): rendah skema lama
50/25/10 juta, tinggi skema 2022 ke atas 60/30/15 juta. Bukan kerugian ekonomi penuh. Pembanding:
potensi kerugian KRB (resmi); DaLA Bappenas Jabodetabek 2007 Rp5.184,43 M (resmi, laporan dibuka, Tabel III.1);
perkiraan APINDO/AAUI Rp3,6 T yang dikutip laporan itu (terverifikasi, bisa tumpang tindih dengan DaLA);
banjir bandang Garut 2016 dan rob Semarang (estimasi-model: estimasi akademik dari `param_banjir.json`, sumber
primer belum dibuka); Bank Dunia untuk karhutla.

**Imateriil (non-rupiah).** Mengungsi (DIBI), hari-mengungsi = mengungsi × 7 hari (rendah 3, tinggi 30;
asumsi `param_banjir.json` `hari_mengungsi`), ISPA karhutla dari angka BNPB/Kemenkes via pers. Tidak ada
VSL atau DALY di paket ini.

**Kekeringan analog 2015.** `simulasi.js` (`jalankan`, `dampak`) dijalankan di node dengan pengaturan yang sama
dengan `kalibrasi()` di layar pada mode **Awal kemarau** (tanam hari ke-30, 1 Jul; bawaan layar "Hari ini" memakai
hari ke-10): mulai 1 Jun 2015 simpanan penuh, hujan dan ET0 NASA POWER 2015 (`hindcast.json`), pembanding
`normal_k`, porsi rentan 1, krisis air = tanah acuan stres berat ≥ 14 hari berturut dan ≥ 0,2 TAW lebih kering
dari Normal. Sel 0,5° → kab lewat titik tengah kecamatan ke sel terdekat (`hth.sel_terdekat`), bobot penduduk
(pola `padi.py`). Agregasi Python dicek sama dengan `dampak()` mesin.
**Mesin neraca/padi ini belum pernah diuji balik terhadap data puso atau produksi.** Uji balik yang ada di
`kekeringan_ujibalik.json` (bagian `kejadian.aturan`, POD 0,10, FAR 0,99, `layak=false`) menguji aturan
peringatan SPI-3 ≤ −1, bukan mesin ini. Karena itu angka padi dan puso model (nasional 68,6%, Jawa 85,7%; puso
model 2.931.339 ha) dipindah ke `lampiran_kekeringan_model.csv`, bukan kartu utama. Puso model = sawah sel dengan
hasil turun ≥ 50% (ambang GAGAL `simulasi.js`); itu bukan definisi puso Kementan. Jiwa sel krisis air (porsi
rentan 1, nasional sekitar 228 juta, Jawa sekitar 158 juta) dan jiwa puncak mesin tidak ditulis ke kartu maupun
lampiran karena batas atasnya tidak memberi informasi; nilainya hanya ada di `kab.json` (kolom
`kering2015_jiwa_sel_krisis`, berlabel "tidak untuk dikutip", dan `meta.kering`). Pembanding resmi di kartu:
DIBI 2015 (232.348 terdampak) dan tahun DIBI dengan terdampak terbesar (2018), serta persentase kab SPI-3.

**Karhutla analog 2015 dan 2019.** Luas SiPongi (resmi) dan Bank Dunia (terverifikasi), kerugian Bank
Dunia (terverifikasi, bukan model platform yang divonis tidak layak oleh audit 21 Okt), ISPA BNPB/Kemenkes via
pers (terverifikasi), paparan nasional KRB dari Renas (resmi). Kematian DIBI dipecah: provinsi asap (14, 15, 16,
61, 62, 63, 64, 91, 93) dan provinsi lain. Kematian DIBI karhutla di Jawa adalah kebakaran hutan/gunung
setempat (2015: Magetan 7, Ponorogo 5; 2019: 9 dari 10 kematian), bukan korban asap. **Korban jiwa berbasis rasio
tidak dibuat untuk karhutla**, dan karhutla tidak ada di kepekaan peringatan dini: rasio DIBI karhutla didominasi
kebakaran di Jawa, tidak bermakna untuk skenario asap. Baris DIBI Sumedang 12 Sep 2019 (62.665 menderita) adalah
pencilan; ia ikut di `dibi_kab.csv` dan `ringkas_wilayah.csv` (karhutla, Jawa Barat).

**Kepekaan peringatan dini.** Faktor = ((1−c1) + c1/R) / ((1−c0) + c0/R), R = 8 (WMO 2022): penduduk
tercakup bermortalitas 1/R penduduk tak tercakup. Pasangan **utama** (`utama=true`) = Renas indikator 1.c
11,06% (2025) → 52% (target 2029), penyebut sama, faktor 0,603. c1 = 100% sebagai batas atas ilustratif.
c0 = 6% (Renstra hlm. 70: "masyarakat terpapar di kawasan berisiko tinggi") disimpan sebagai ilustrasi lintas
indikator saja, karena penyebutnya beda dengan target Renas. R adalah asosiasi lintas negara, bukan efek kausal,
sehingga hasilnya batas atas manfaat. Hanya korban jiwa yang dikenai; rumah rusak tidak berkurang oleh
peringatan dini. Bangladesh (lebih dari 100 kali dalam 40 tahun) dicatat sebagai pembanding paket
kesiapsiagaan, tidak dijadikan koefisien.

## Angka yang bertentangan (disimpan berdampingan)

| Butir | Versi |
| --- | --- |
| Banjir Jabodetabek awal 2020 | DIBI 14 kab: 52 meninggal, 433.628 mengungsi. DIBI Jabodetabek + Lebak: 61 meninggal, 2 hilang, 449.791 mengungsi. Renstra BNPB: 61 meninggal, 11.569 pengungsi, 3.245 rumah rusak. Meninggal cocok bila Lebak dihitung; pengungsi tetap berbeda jauh. riset A §4.4 menulis DIBI 60 meninggal, 2 hilang, 450.717 mengungsi: di cache ini 450.717 = Jabodetabek + Lebak + Karawang (926 mengungsi, 0 meninggal), sedangkan meninggal set itu 61; selisih 1 jiwa tidak tereproduksi (kemungkinan revisi DIBI antartarik) |
| Meninggal karhutla 2015 | DIBI provinsi asap 12; Bank Dunia 19 (mengutip The Guardian). DIBI semua provinsi 24 tidak setara: 12 di antaranya kebakaran di Jawa |
| Meninggal karhutla 2019 | DIBI provinsi asap 1 (Banyuasin, Jan 2019, di luar musim asap); DIBI semua provinsi 10, 9 di Jawa |
| ISPA 2015 | BNPB 450.431 (Jul–22 Okt); Bank Dunia "lebih dari 500.000" (The Guardian) |
| Luas karhutla 2015 | SiPongi 2.611.411 ha; Bank Dunia 2.611 ribu ha; per provinsi berbeda (mis. Riau 183.809 lawan 139.000) |
| Luas karhutla 2019 | SiPongi tahunan 1.649.258 ha; Bank Dunia/KLHK Jan–Sep 620.201 ha (periode beda) |
| Kerugian banjir Jabodetabek 2007 | DaLA Tabel III.1 Rp5.184,43 M; ringkasan DaLA Rp5,16 T; `param_banjir.json` Rp5,2–8,8 T (8,8 = DaLA + perkiraan APINDO/AAUI 3,6 T, yang bisa tumpang tindih) |
| Paparan banjir/longsor | KRB `terpapar` (resmi) lawan overlay kecamatan kelas tinggi (batas atas platform) |
| Terpapar gelombang nasional | Renas 4.129.597; API KRB nasional 4.104.943; jumlah 514 kab 4.080.596 |

## Keterbatasan dan celah

- Kekeringan: mesin neraca/padi belum pernah diuji balik terhadap data puso/produksi (Kementan/BPS); angka padi
  dan puso hanya di lampiran. Padi = tadah hujan tanpa irigasi dan sawah dari `tutupan.json` (bukan
  pengamatan): penurunan hasil di daerah beririgasi terlalu tinggi, bahkan iklim normal memberi puluhan persen.
  Yang bermakna hanya selisih terhadap normal. 7 kab pulau kecil tanpa sel neraca (kolom kering kosong).
  `scripts/kekeringan/padi.py` baris 3 masih menyebut ambang puso Kementan "> 75%" tanpa sumber (di luar paket).
- Replay Maret 2025: luas tergenang model 14,5 kali survei ITB di Kota Bekasi, POD 10 cm 0,043 (sel) / 0,261 (3×3), bias kedalaman −160 cm.
- Selubung La Niña per kab tidak boleh dijumlah: tiap kab memakai musim terburuknya sendiri. Kolom `analog_mh_*`
  boleh dijumlah: kejadian, meninggal+hilang, menderita, mengungsi, dan materiil cocok dengan total nasional dan
  Jawa; korban cocok dengan kartu Jawa, tidak dengan kartu nasional (lihat Korban jiwa).
- DIBI 2024 tidak lengkap untuk lima jenis (lihat DIBI); dikeluarkan dari rasio, tetap ada di `dibi_kab.csv` dan musim.
- Luka-luka tidak ada di DIBI Superset (kolomnya tidak ditemukan); sekolah/faskes per kelas bahaya tidak disimpan dari respons KRB.
- Kematian karena asap jangka panjang, luas genangan rob, debit sungai Jawa, air tanah, subsiden: di luar paket (lihat riset D §4).
- Angka Renstra/Renas (6%, 11.060, 52.000, Jabodetabek 2020, paparan KRB nasional) dikutip dari riset A, PDF Perban tidak dibuka ulang.
- `data/kajian-bnpb/data/angka.json` (di luar paket) masih menunjuk kepekaan `cakupan_awal=renstra_2025` dan
  menulis keyakinan "resmi" untuk tahun analog; pasangan utama sekarang `renas_2025`, label tahun analog
  asumsi-kebijakan. Pemilik `angka.json` perlu memindahkan rujukannya.
- DIBI mencatat per kab dan terus direvisi; angka per tanggal tarik di `meta.tarik`.
- Lisensi InaRISK tidak tertulis: cukup tulis "Sumber: InaRISK BNPB".

## Self-check (`periksa()`)

514 kab dan 119 Jawa; penduduk kab = jumlah kecamatan; overlay ≤ penduduk kab dan tiap kecamatan dihitung
sekali; KRB 514 kab per bahaya dan jumlahnya 97–100,01% angka nasional API; DIBI tak cocok ≤ 0,5% dan, untuk
tiap jenis × 8 metrik, total mentah = jumlah kab + baris tak cocok (tanpa syarat); tak ada jenis DIBI mirip
hidromet yang tidak dipetakan; median ≤ p90 ≤ nilai terbesar kedua (tahun terburuk tersisih) dan tahun tak
lengkap tidak dipakai; rendah ≤ tinggi di tiap baris kartu dan lampiran; musim analog per kab dijumlah = total
nasional dan Jawa untuk 8 metrik DIBI dan kolom turunannya; korban kab Jawa = kartu Jawa, korban 514 kab = kartu
nasional − Jawa(rasio nasional) + kartu Jawa; tak ada korban rasio karhutla di kartu maupun kepekaan; DIBI
karhutla provinsi asap + lain = semua; jiwa krisis air dan angka padi/puso tidak di kartu utama; tiap baris
korban punya tepat satu pasangan kepekaan utama, faktor dalam (0, 1]; agregasi kekeringan = `dampak()` mesin;
SiPongi 2019 = `luas_resmi.json`, SiPongi 2015 dalam 0,1% Bank Dunia; salinan tangan Bank Dunia dan ISPA cocok
totalnya; tiap kolom per kab punya label; tidak ada NaN/inf di JSON maupun CSV. `uji()` mengunci p90 (maks tidak
pernah terpilih bila n ≥ 2), pembuangan 2024 per jenis, dan format angka.
