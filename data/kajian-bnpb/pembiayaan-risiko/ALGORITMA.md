# ALGORITMA: Pembiayaan risiko

Semua ambang dan model di sini **HIPOTESIS** sampai lulus uji balik. Sistem tidak pernah menampilkan angka dari model yang belum lulus sebagai fakta; pada tahap hipotesis hanya staf yang bisa melihatnya, berlabel hipotesis.

## 1. Sisi kerugian resmi

Nilai kerusakan = jumlah (unit x harga satuan) per sektor, nilai kerugian = jumlah (arus rupiah x bulan), sesuai `nilaiKerusakan` dan `nilaiKerugian`. Layar membaca hasilnya, tidak menghitung ulang. Bila ada sektor tanpa harga, total `null` dan status menunggu. Keyakinan satu angka = yang terendah dari harga yang dipakai: `asumsi-kebijakan` bila ada satu saja bertingkat itu, `resmi` bila semua resmi.

## 2. Model perkiraan awal (belum ada)

Syarat sebelum tampil:

1. Pra-registrasi: rumus, masukan, tahun harga, dan ambang lulus ditulis dan dibekukan di `docs` sebelum data uji dilihat (tanggal dan hash). Pembagian data: tinggalkan-satu-kejadian (leave-one-event-out) untuk menyetel, atau hold-out beku yang ditetapkan sebelum melihat nilai resmi; parameter tidak pernah disetel pada kejadian yang dipakai menilai.
2. Uji balik terhadap kejadian lalu yang punya nilai Jitupasna resmi: untuk tiap kejadian bandingkan rentang model dengan nilai resmi. Ukuran lulus (**[BAWAAN SEMENTARA, HIPOTESIS]**, angka 20 kejadian dan 70 persen belum punya dasar statistik dan ditinjau validasi-model sebelum dibekukan): paling sedikit 20 kejadian, minimal 70 persen nilai resmi jatuh dalam rentang, dan lebar rentang tengah di bawah satu orde besaran. Bila kejadian beruji kurang dari 20, label "belum diuji balik" tetap dan kartu tidak tampil.
3. Calon model (Q3): (a) koefisien kerugian ekonomi USGS PAGER, belum diverifikasi apakah ada untuk Indonesia (cek publikasi USGS); (b) paparan per bangunan x kerentanan x harga satuan `sk_harga`.
4. Keluaran selalu tiga angka (bawah, tengah, atas); tidak pernah satu angka titik.

## 3. Sisi dana

Total yang tersedia per lapis, tidak dijumlah lintas lapis: (i) realisasi DSP kejadian itu = jumlah `realisasi` pada permohonan kejadian itu; nilai yang belum diisi diabaikan dan dihitung di catatan "belum SPJ"; (ii) saldo DSP dari input staf; (iii) saldo PFB dari input staf. Tiap lapis membawa tanggal data dan sumber. Realisasi DSP hanya dari permohonan yang sudah tertaut ke KJ (PR-02b). Isian lebih tua dari batas basi (Q1; bawaan 35 hari) diberi tanda basi.

## 4. Pembandingan

Selisih = kerugian lawan satu lapis dana, hanya bila keduanya bukan menunggu dan bukan belum diisi. Hasil: angka selisih dan keyakinan terendah dari kedua sisi. Tanpa rasio tunggal, tanpa vonis (D5). Catatan wajib bila lapis dana dan kerugian berbeda tahun harga (Q8).

## 5. Pemantau parametrik

Masukan: catatan skema staf (indeks, batas bawah, wilayah, jendela waktu) dan data sistem untuk indeks itu (mis. katalog gempa, curah hujan). Keluaran: "terpenuhi", "belum", atau "tidak dapat dinilai" (data indeks tidak ada atau di luar wilayah polis). Tanpa catatan skema, tidak ada keluaran. Sistem tidak pernah membuat batas sendiri dan tidak menyatakan pembayaran.
