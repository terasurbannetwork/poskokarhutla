# Paket data `skenario-hidromet`

Skenario terburuk yang masuk akal (pola UK NRR) untuk banjir, banjir bandang, longsor, cuaca ekstrem,
gelombang ekstrem/abrasi/rob, kekeringan, dan karhutla. Dipakai Bab 7 Kajian 2 (Mitigasi Bencana
Indonesia 2026–2030) dan Bab 5–6 Kajian 1 (Ketahanan Air Jawa). Data dibekukan 23 Okt 2026.

```
python3 data/kajian-bnpb/bangun/skenario-hidromet.py          # bangun ulang dari cache (tanpa jaringan bila cache lengkap)
python3 data/kajian-bnpb/bangun/skenario-hidromet.py --tarik  # tarik ulang InaRISK, DIBI, SiPongi, lalu bangun
python3 data/kajian-bnpb/bangun/skenario-hidromet.py uji      # self-check fungsi murni saja
```

Skrip: Python 3 stdlib. Mesin kekeringan `public/kekeringan/simulasi.js` dijalankan lewat `node`.
Tiap bangun menjalankan `uji()` lalu `periksa()`; gagal satu invarian = berhenti dengan pesan berangka.

## Berkas

| Berkas | Isi | Sumber | Label |
| --- | --- | --- | --- |
| `kab.json` | Satu objek per kab (514): penduduk, `paparan[bahaya]`, `dibi[jenis]`, `skenario`. `meta.kolom` memuat label dan arti tiap kolom. Untuk peta | semua di bawah | per kolom (`meta.kolom`) |
| `paparan_kab.csv` | 514 kab × 6 bahaya: overlay jiwa kelas tinggi, luas/terpapar/kerugian potensi KRB | InaRISK KRB 2022–2026 per kab; `bahaya.json` × `penduduk.json` | `krb_*` resmi; `overlay_*` estimasi-model |
| `dibi_kab.csv` | 514 kab × 9 jenis: kejadian, meninggal, hilang, menderita, mengungsi, rumah RB/RS/RR, 2008–23 Okt 2026 | DIBI BNPB | resmi |
| `skenario_kab.csv` | per kab: musim hujan analog dan selubung La Niña, kekeringan 2015 (model), karhutla DIBI 2015/2019 | DIBI, mesin neraca | per kolom, lihat `kab.json` `meta.kolom` |
| `kartu_skenario.csv` / `.json` | kartu skenario nasional dan Jawa, format panjang: `skenario, wilayah, metrik, nilai, rendah, tinggi, satuan, label, sumber, catatan` | semua | per baris |
| `rasio_korban.csv` | rasio (meninggal+hilang)/kejadian dan per 100 rb terdampak per jenis per tahun 2010–2025, plus median dan p90 | DIBI | resmi (seri), estimasi (ringkasan) |
| `musim_hujan.csv` | total musim hujan 2008/09–2025/26 (1 Okt–30 Apr), ONI NDJ, status La Niña, penanda analog | DIBI, NOAA CPC | resmi |
| `kepekaan_peringatan_dini.csv` | korban skenario bila cakupan peringatan dini naik | WMO 2022, Renstra/Renas BNPB | asumsi-kebijakan |
| `karhutla_provinsi.csv` | luas 2015/2019 per provinsi (SiPongi dan tabel Bank Dunia), ISPA 2015/2019, DIBI | SiPongi, Bank Dunia, BNPB | resmi / terverifikasi |
| `ringkas_wilayah.csv` | nasional, 7 pulau, 38 provinsi × 9 jenis: paparan dan DIBI | turunan berkas di atas | sama dengan sumbernya |

Format: CSV UTF-8, pemisah koma, titik desimal, tanpa pemisah ribuan. Sel kosong = tidak tersedia
(bukan nol). `kejadian` DIBI bisa pecahan: satu kejadian lintas kab dibagi oleh DIBI. Rupiah dalam Rp
penuh kecuali kolom berakhiran `_juta_rp`.

## Sumber dan tanggal tarik (cache di `data/kajian-bnpb/riset/mentah/`)

| Cache | Sumber | Tarik |
| --- | --- | --- |
| `krb_kab/<bahaya>.json` | `https://inarisk.bnpb.go.id/apiv4/kajian-summary/<bahaya>/<kode>?level=kabupaten`, 514 kab × banjir, banjir-bandang, tanah-longsor, cuaca-ekstrim, gelombang-ekstrim-dan-abrasi, kekeringan | 23 Okt 2026 |
| `dibi_hidromet.json` | DIBI Superset `POST /api/v1/chart/data` (dasbor publik 1), dikelompokkan per tanggal-kab-jenis, SUM; 58.992 baris | 23 Okt 2026 |
| `sipongi_luas_2015_2026.json` | KLHK SiPongi `opsroom.sipongidata.my.id/api/list/luas-kebakaran/provinsi` | 23 Okt 2026 |
| `oni_cpc.txt` | NOAA CPC `https://www.cpc.ncep.noaa.gov/data/indices/oni.ascii.txt` | 23 Okt 2026 |
| `ks_*.json` (sudah ada) | InaRISK kajian-summary nasional, untuk cek jumlah kab | 23 Okt 2026 (riset A) |

Berkas repo yang dibaca: `scripts/udara/kota.json` (514 kode Kemendagri 2025), `public/data/penduduk.json`,
`public/banjir/data/bahaya.json`, `public/banjir/data/param_banjir.json`, `public/banjir/data/pusat_kec.json`,
`public/banjir/data/replay/maret2025.json`, `public/data/kekeringan_neraca.json` (dibuat 19 Okt 2026),
`public/kekeringan/data/hindcast.json`, `public/kekeringan/data/tutupan.json`, `public/data/kekeringan_ujibalik.json`,
`public/data/luas_resmi.json`, `public/pesisir/data/abrasi.json`.

Sumber luar yang dibuka langsung (23 Okt 2026), dikutip di kolom `sumber`:
- Bank Dunia (Feb 2016) *The Cost of Fire*, teks di documents1.worldbank.org: USD 16,1 miliar (Rp 221 T), 1,9% PDB 2015, 2,611 juta ha (tabel provinsi), 19 meninggal dan lebih dari 500.000 ISPA (keduanya kutipan Bank Dunia dari The Guardian).
- Bank Dunia (Des 2019) *Indonesia Economic Quarterly*, Box A.1: USD 5,2 miliar (157 juta kerusakan + 5,0 miliar kerugian), 0,5% PDB, 8 provinsi Jun–Okt 2019; 620.201 ha Jan–Sep 2019 (data KLHK).
- BNPB 22 Okt 2015 (via JawaPos): 450.431 ISPA, Juli–22 Okt 2015, 6 provinsi. BNPB 23 Sep 2019 (data Kemenkes, via CNN Indonesia): 919.516 ISPA, 6 provinsi.
- WMO, siaran pers 13 Okt 2022 (laporan UNDRR–WMO *Global Status of MHEWS: Target G*): mortalitas bencana 8 kali lebih tinggi di negara bercakupan peringatan dini terbatas.
- Haque dkk. (2012) *Bull WHO* 90:150–156: kematian siklon Bangladesh turun lebih dari 100 kali (1970 ±500.000; 1991 138.958; Sidr 2007 4.234).

## Metode

**Wilayah.** 514 kab/kota = `scripts/udara/kota.json`; 119 di Jawa (prov 31–36). Pulau: Sumatera
(11–21), Jawa, Bali-Nusa Tenggara (51–53), Kalimantan (61–65), Sulawesi (71–76), Maluku (81–82), Papua (91–96).
Satu kecamatan di `penduduk.json` (Lemito) memakai ejaan "Pahuwato"; dipetakan ke Kab. Pohuwato.

**Paparan.** Dua versi, berdampingan:
1. *KRB per kab* (resmi). `terpapar` = penduduk zona sedang+tinggi (API memberi `total_luas` = sedang+tinggi;
   jumlah nasional `terpapar` banjir 113.829.496 = angka Renas PB). Jumlah 514 kab = 98–100% angka nasional
   API; selisih = wilayah di luar 514 kab. KRB karhutla membalas nol untuk semua wilayah, jadi tidak ada.
2. *Overlay platform* (estimasi-model): seluruh penduduk kecamatan yang indeks InaRISK maksimumnya
   (pusat + kisi 3×3) ≥ 2/3. Ambang tiga sama lebar adalah pilihan (sama dengan `scripts/gempa/dampak.py`),
   bukan ambang resmi. Batas atas. Tidak ada untuk cuaca ekstrem.

**DIBI.** Nama kab dicocokkan ke peta lewat `Pencocok` milik `scripts/banjir/kejadian.py` (kode
`id_kab_bps` DIBI adalah kode BPS dan sering beda dengan Kemendagri, jadi tidak dipakai langsung). 58.992
baris, 0 tak cocok. Jenis: banjir (Banjir, Banjir Genangan), banjir_bandang, longsor (Tanah Longsor, Gerakan
Tanah), banjir_longsor ("Banjir dan Tanah Longsor", berdiri sendiri supaya tidak terhitung ganda), cuaca_ekstrem
(Cuaca Ekstrem, Puting Beliung, Angin Kencang, Angin Topan), gelombang_abrasi, rob, kekeringan, karhutla.
Banjir bandang dan rob baru ada sejak 2018 dan kosong 2019/2024 di DIBI.

**Musim hujan.** 1 Okt Y – 30 Apr Y+1, jenis banjir, bandang, longsor, banjir_longsor, cuaca ekstrem.
La Niña = ONI NDJ Y termasuk episode CPC (≥ 5 musim tumpang berturut ≤ −0,5): 2008, 2010, 2011, 2017,
2020, 2021, 2022. Musim 2025/26 (ONI NDJ −0,60) bukan episode (hanya 3 musim). Analog = musim dengan
jumlah peringkat terkecil atas lima metrik (kejadian, meninggal+hilang, menderita, mengungsi, rumah rusak):
- `musim_hujan_lanina`: nasional dan Jawa sama-sama 2020/21.
- `musim_hujan_terberat_tercatat` (semua musim): nasional 2025/26 (memuat banjir Sumatra Nov 2025), Jawa 2019/20 (memuat Jabodetabek 1 Jan 2020).

Kasus nyata (tanpa rentang korban, yang tercatat adalah angkanya): `kasus_jabodetabek_2020` (DIBI
31 Des 2019–8 Jan 2020, 14 kab/kota Jabodetabek, berdampingan dengan versi Renstra BNPB),
`kasus_replay_maret2025` (DIBI 2–8 Mar 2025 + keluaran replay genangan beserta galatnya),
`kasus_sumatra_nov2025` (DIBI 15 Nov–31 Des 2025, Aceh+Sumut+Sumbar).

**Korban jiwa.** Rasio r = (meninggal+hilang)/kejadian per jenis per tahun DIBI 2010–2025, hanya tahun
dengan ≥ 5 kejadian. Rendah = median tahunan, tinggi = persentil 90 (peringkat terdekat): tahun paling
ekstrem disisihkan, sesuai definisi RWCS. Korban = Σ jenis kejadian analog × r. Rasio per 100 rb terdampak
ikut disimpan tetapi tidak dipakai, karena kolom `menderita` tidak seragam antarjenis dan antartahun
(longsor: ribuan per 100 rb). Jawa memakai rasio Jawa bila ada ≥ 5 tahun memenuhi syarat, selain itu rasio
nasional (`pinjam_nasional` di `rasio_korban.csv`). Bila jumlah tercatat di periode analog melebihi batas
tinggi, catatan baris menandainya: rasio rata-rata tahunan tidak menangkap kejadian tunggal ekstrem, jadi
angka tercatat dipakai sebagai batas bawah skenario.

**Materiil.** Batas bawah = rumah RB/RS/RR DIBI × stimulan BNPB (`param_banjir.json`): rendah skema lama
50/25/10 juta, tinggi skema 2022 ke atas 60/30/15 juta. Bukan kerugian ekonomi penuh. Pembanding:
potensi kerugian KRB (resmi), DaLA Jabodetabek 2007 Rp 5,2–8,8 T, banjir bandang Garut 2016, rob
Semarang (ketiganya dari `param_banjir.json`; sumber primer belum dibuka ulang), Bank Dunia untuk karhutla.

**Imateriil (non-rupiah).** Mengungsi (DIBI), hari-mengungsi = mengungsi × 7 hari (rendah 3, tinggi 30;
asumsi `param_banjir.json` `hari_mengungsi`), ISPA karhutla hanya dari angka BNPB/Kemenkes. Tidak ada
VSL atau DALY di paket ini.

**Kekeringan analog 2015.** `simulasi.js` (`jalankan`, `dampak`) dijalankan di node persis seperti
`kalibrasi()` di layar: mulai 1 Jun 2015 simpanan penuh, tanam hari ke-30 (1 Jul), hujan dan ET0 NASA POWER
2015 (`hindcast.json`), pembanding `normal_k`, porsi rentan 1, krisis air = tanah acuan stres berat ≥ 14
hari berturut dan ≥ 0,2 TAW lebih kering dari Normal. Sel 0,5° → kab lewat titik tengah kecamatan ke sel
terdekat (`hth.sel_terdekat`), bobot penduduk (pola `padi.py`). Agregasi Python dicek sama dengan
`dampak()` mesin. Pembanding resmi: DIBI 2015 dan tahun DIBI dengan terdampak terbesar (2018).

**Karhutla analog 2015 dan 2019.** Luas SiPongi (resmi) dan Bank Dunia (terverifikasi), kerugian Bank
Dunia (terverifikasi, bukan model platform yang divonis tidak layak oleh audit 21 Okt), ISPA BNPB (resmi),
DIBI untuk kejadian dan korban.

**Kepekaan peringatan dini.** Faktor = ((1−c1) + c1/R) / ((1−c0) + c0/R), R = 8 (WMO 2022): penduduk
tercakup bermortalitas 1/R penduduk tak tercakup. c0 dua versi: 6% (Renstra) dan 11,06% (Renas 2025);
c1: 52% (target Renas 2029) dan 100%. R adalah asosiasi lintas negara, bukan efek kausal, sehingga hasilnya
batas atas manfaat. Hanya korban jiwa yang dikenai; rumah rusak tidak berkurang oleh peringatan dini.
Bangladesh (lebih dari 100 kali dalam 40 tahun) dicatat sebagai pembanding paket kesiapsiagaan, tidak
dijadikan koefisien.

## Angka yang bertentangan (disimpan berdampingan)

| Butir | Versi |
| --- | --- |
| Banjir Jabodetabek awal 2020 | DIBI 14 kab: 52 meninggal, 433.628 mengungsi; Renstra BNPB: 61 meninggal, 11.569 pengungsi, 3.245 rumah rusak |
| Meninggal karhutla 2015 | DIBI 24; Bank Dunia 19 (mengutip The Guardian) |
| ISPA 2015 | BNPB 450.431 (Jul–22 Okt); Bank Dunia "lebih dari 500.000" (The Guardian) |
| Luas karhutla 2015 | SiPongi 2.611.411 ha; Bank Dunia 2.611 ribu ha; per provinsi berbeda (mis. Riau 183.809 lawan 139.000) |
| Luas karhutla 2019 | SiPongi tahunan 1.649.258 ha; Bank Dunia/KLHK Jan–Sep 620.201 ha (periode beda) |
| Paparan banjir/longsor | KRB `terpapar` (sedang+tinggi, resmi) lawan overlay kecamatan kelas tinggi (batas atas platform) |

## Keterbatasan dan celah

- Kekeringan: uji balik deteksi platform `layak=false` (POD 0,10, FAR 0,99, 2023-10..2024-12). Padi =
  tadah hujan tanpa irigasi dan sawah dari `tutupan.json` (bukan pengamatan): penurunan hasil di daerah
  beririgasi terlalu tinggi, bahkan iklim normal memberi puluhan persen. Yang bermakna hanya `selisih`
  terhadap normal. Puso model (hasil turun ≥ 50%) bukan definisi puso Kementan. Jiwa krisis air = penduduk
  sel stres (porsi rentan 1), bukan jiwa terdampak; DIBI 2015 hanya mencatat 232.348 terdampak. 7 kab
  pulau kecil tanpa sel neraca (kolom kering kosong).
- Replay Maret 2025: luas tergenang model 14,5 kali survei ITB di Kota Bekasi, POD 10 cm 0,043 (sel) / 0,261 (3×3), bias kedalaman −160 cm.
- Selubung La Niña per kab tidak boleh dijumlah: tiap kab memakai musim terburuknya sendiri. Kolom `analog_mh_*` boleh dijumlah (diuji sama dengan total nasional).
- Luka-luka tidak ada di DIBI Superset (kolomnya tidak ditemukan); sekolah/faskes per kelas bahaya tidak disimpan dari respons KRB.
- Kematian karena asap jangka panjang, luas genangan rob, debit sungai Jawa, air tanah, subsiden: di luar paket (lihat riset D §4).
- DIBI mencatat per kab dan terus direvisi; angka per tanggal tarik 23 Okt 2026.
- Lisensi InaRISK tidak tertulis: cukup tulis "Sumber: InaRISK BNPB".

## Self-check (`periksa()`)

514 kab dan 119 Jawa; penduduk kab = jumlah kecamatan; overlay ≤ penduduk kab dan tiap kecamatan dihitung
sekali; KRB 514 kab per bahaya dan jumlahnya 97–100,01% angka nasional; DIBI tak cocok ≤ 0,5% dan
meninggal+hilang per jenis = total mentah; median ≤ p90; rendah ≤ tinggi di tiap baris kartu; analog per kab
dijumlah = total nasional; faktor kepekaan dalam (0, 1]; agregasi kekeringan = `dampak()` mesin; SiPongi 2019 =
`luas_resmi.json`, SiPongi 2015 dalam 0,1% Bank Dunia; salinan tangan Bank Dunia dan ISPA cocok totalnya; tiap
kolom per kab punya label; tidak ada NaN/inf di JSON maupun CSV.
