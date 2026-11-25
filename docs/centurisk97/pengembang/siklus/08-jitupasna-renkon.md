# Jitupasna ke R3P, renkon, gladi

Halaman ini merinci metode Jitupasna ke R3P serta renkon dan gladi.

## Jitupasna ke R3P (F4)

Klasifikasi tingkat kerusakan menurut persentase kerusakan fisik p (Perka 15/2011 Formulir 05):

```
p > 70       -> RB (rusak berat)
30 <= p <= 70 -> RS (rusak sedang)
p < 30       -> RR (rusak ringan)
```

"Hancur total" adalah isian terpisah. Tingkat rumah rusak `berat`, `sedang`, `ringan` dipetakan ke RB, RS, RR, tanpa tabel rumah rusak kedua.

Harga satuan terindeks dan nilai:

```
h   = h_ref x ( IKK_k / IKK_ref ) x ( IHPB_t1 / IHPB_t0 )
V_s = jumlah_t ( n_{s,t} x h_{s,t} ),  t di {hancur_total, RB, RS, RR};  V = jumlah_s V_s
L_s = jumlah_c ( arus_c x bulan_c )      kerugian per komponen
Kebutuhan_s = V_s + jumlah_kegiatan ( volume x satuan_biaya x IKK_k / IKK_ref )
```

`h_ref` diisi manual dari dokumen HSBGN atau Perka dan berlabel asumsi kebijakan (tidak ada API harga resmi). IKK memakai variabel BPS 2515 hanya dalam tahun yang sama, IHPB variabel 1018 hanya pada seri berdasar sama. Harga kosong berstatus menunggu. Monotonitas harga (hancur >= RB >= RS >= RR) dicek dan pelanggaran ditandai, tidak diperbaiki. Penanda lain: hitung ganda (komponen sama di dua sektor), cakupan (sektor tanpa isian), kewajaran. Sektor Jitupasna dipetakan ke lima sektor R3P (permukiman, infrastruktur, ekonomi, sosial, lintas sektor), dan subsektor yang tidak terpeta dilaporkan terpisah sebagai `belum_terpeta`, dengan invarian lima sektor ditambah belum_terpeta sama dengan total.

Stimulan dan dana tunggu hunian:

```
Stimulan = n_RB x 60 juta + n_RS x 30 juta + n_RR x 15 juta      asumsi kebijakan (U8, sumber sekunder)
DTH      = KK x Rp600.000 x 3 bulan                              Juklak DTH 1/2023
```

Tarif stimulan 50/25/10 juta dan 80 juta tidak dipakai sampai pemilik memutuskan. Contoh: 10 RB, 20 RS, 30 RR memberi Rp1.650 juta, dan 100 KK memberi Rp180 juta.

Waktu:

```
sisa_90   = 90 - (hari_ini - tanggal_mulai_tanggap_darurat)     (Perban 5/2017 Pasal 2)
PDNA BNPB = akhir darurat - 14 hari;  PDNA BPBD = akhir darurat - 7 hari
```

Sisa 0 atau negatif tampil sebagai "lewat batas", bukan penolakan. Kemajuan pelaksanaan:

```
persen_i     = realisasi_i / target_i x 100     (target kosong atau 0 -> menunggu; lebih dari target ditandai anomali, tampil maksimum 100)
persen_total = jumlah_i ( nilai_i x persen_i / 100 ) / jumlah_i nilai_i     hanya bila semua nilai terisi
macet        = lebih dari 60 hari pada tahap yang sama    (`rehab_macet_hari`, asumsi tanpa pasal)
```

Status Jitupasna: dibuka, pengumpulan, dihitung, ditinjau, final. Jitupasna final dan R3P yang sudah ditetapkan dikunci oleh pemicu di D1 (nilai tidak bisa diubah).

## Renkon dan gladi (F5)

Kebutuhan dasar menurut Perka 7/2008, J jiwa, h hari, KK keluarga:

| Komponen | Rumus |
| --- | --- |
| penampungan | 3 x J (m2) |
| beras | 0,4 x J x h (kg) |
| makan | 2 x J x h (porsi) |
| air bersih | J x ( 7 x min(h; 3) + 15 x max(h - 3; 0) ) (liter) |
| air minum | 2,5 x J x h (liter) |
| jamban | ceil(J / 20) (unit) |
| tempat sampah 100 L | ceil(KK / 10) (unit), menunggu bila KK kosong |
| sabun mandi | 0,25 x J x ceil(h / 30) (kg) |
| sabun cuci | 0,2 x J x ceil(h / 30) (kg) |
| energi | 2.100 kkal per orang per hari (nilai tetap, `public/siklus/hitung.js:192`) |

Contoh: J = 1.000 dan h = 5 menghasilkan 3.000 m2, beras 2.000 kg, air bersih 51.000 liter, jamban 50 unit. Standar Sphere (3,5 m2 dan 15 liter) tampil berdampingan sebagai hipotesis dan tidak menggantikan Perka 7/2008. Keluaran hanya usulan dan berlabel `estimasi-model` karena J adalah perkiraan.

Kesenjangan stok memakai stok kondisi baik di gudang wilayah dari LogPal:

```
gap_b = maks(0; K_b - S_b);  surplus_b = maks(0; S_b - K_b)
```

Stok rusak dan belum dinilai tampil terpisah dan tidak dihitung. Barang tanpa padanan Perka dan stok yang belum tercatat tidak dihitung dan ditulis demikian. Standar kebutuhan personel tidak ada di sumber, sehingga target personel adalah isian Koordalops (asumsi kebijakan).

Kesegaran renkon (Perban 2/2023 Pasal 21):

```
berlaku_sampai = tgl_sah + 36 bulan (hari dipangkas ke akhir bulan)
sisa           = berlaku_sampai - hari_ini
reviu_jatuh    = max(tgl_sah, reviu_terakhir) + 6 bulan
status = kedaluwarsa     bila sisa < 0
         segera_habis    bila sisa <= 90
         perlu_reviu     bila reviu_jatuh < hari_ini
         berlaku         selain itu
```

Contoh: `tgl_sah` 29 Februari 2024 berlaku sampai 28 Februari 2027. Ada ketidaksesuaian sumber: riset menyebut Lampiran 1.8, sedangkan `jam_aturan.json` memakai Pasal 21 ayat (1), dan kode mengikuti yang kedua.

Skor kesiapan gladi adalah rancangan sementara (asumsi kebijakan), karena Juklak 4/2026 tidak memberi rumus:

```
K1 renkon: 0 bila kedaluwarsa, selain itu 1
K2 logistik: rerata min(1; S_b / K_b) atas barang yang stoknya tercatat
K3 personel: min(1; siap / target), dilewati bila target kosong
K4 tindak lanjut: rekomendasi gladi terakhir yang tertaut ke renkon / seluruh rekomendasi, dilewati bila belum ada gladi
skor = rerata komponen yang tersedia x 100    (menunggu bila komponen tersedia kurang dari 2)
```

Pemutaran ulang kejadian memakai entri arsip kejadian yang sudah dipromosikan, tanpa nama korban. Waktu relatif `T_i = waktu_i - waktu_pertama` dalam jam, dan percepatan opsional c membagi T_i. Nilai diinjeksikan apa adanya tanpa simulasi atau interpolasi.
