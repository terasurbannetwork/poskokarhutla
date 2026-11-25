# GLOSARIUM: Semai Redistribusi Banjir dan Penguji Efektivitas

Istilah semai awan (sel, putaran, langkah, gerbang G1 sampai G9, Q, titik hujan, τ, angin pengarah, zona, jendela terbang, LCL, CAPE,
dan lainnya) mengikuti `data/kajian-bnpb/semai-awan/GLOSARIUM.md`. Istilah Operasi Udara mengikuti
`data/kajian-bnpb/operasi-udara/GLOSARIUM.md`.

| Istilah | Arti di modul ini |
| ------- | ----------------- |
| Tujuan | Sumbu baru seksi Peluang semai: `karhutla` (hujan diinginkan jatuh di area api) atau `banjir` (hujan diinginkan jatuh sebelum sasaran). Berbeda dari `mode` (`bawaan` atau `nimbus`), yang mengatur cara skor |
| OMC pengurangan curah hujan | Operasi modifikasi cuaca untuk mitigasi banjir; di sumber BMKG berjenis `Pengurangan CH - Bencana` |
| Semai redistribusi | Penyemaian awan di hulu angin atau di laut supaya hujannya turun sebelum awan sampai ke kab/kota sasaran; hipotesis kerja paket ini, belum dokumen teknis BMKG |
| Sasaran | Kab/kota yang ingin dilindungi dari hujan lebat pada hari sasaran |
| Hari sasaran | Tanggal setempat yang langkah siangnya dicakup putaran IFS |
| Asal sasaran | `prakiraan` (prakiraan banjir `/prediksi`), `bmkg` (pernyataan hujan lebat BMKG), `tetap` (daftar Jabodetabek), `manual` (ditambah Pusdalops) |
| Daftar tetap | Kab/kota yang selalu dihitung walau tanpa sinyal prakiraan; bawaan 13 kab/kota daratan Jabodetabek |
| Zona cegat | Zona semai tujuan banjir, A sampai E, berkode `<putaran>-B<huruf>` |
| Koridor hulu | Pita sel di sepanjang lintasan mundur dari sasaran, 30 sampai 150 km dari tepinya |
| Lintasan mundur | Jalur angin pengarah yang ditelusuri ke belakang waktu dari sasaran untuk menemukan dari mana awan datang |
| Tenggang tiba | Jam dari titik hujan zona sampai awan memasuki sasaran menurut lintasan maju |
| H, lepas sebelum sasaran | Faktor 0 sampai 1: penuh bila tenggang tiba 1 sampai 3 jam, turun ke 0 di 4 jam |
| P, paparan zona | Faktor 0 sampai 1: 1 bila titik hujan di laut; di darat naik dari 0 (<= 10 km dari kota) ke 1 (>= 50 km) |
| Aturan jangan memindah banjir | Zona yang selnya atau titik hujannya berada di daratan kab/kota sasaran atau kab/kota yang terancam banjir hari itu dibuang (GB2) |
| Angin lemah | Angin pengarah < 2 m/s di pusat sasaran; awan nyaris diam dan tidak bisa dicegat dari hulu |
| Penguji efektivitas | Analisis yang membandingkan hujan sasaran pada hari ber-OMC dengan hari tanpa OMC yang prakiraannya setara; hanya kesesuaian |
| Lapis A | Penguji retrospektif di tingkat provinsi-hari dari halaman OMC resmi BMKG |
| Lapis B | Penguji prospektif di tingkat sasaran-hari dari target renlap tujuan banjir |
| Provinsi-hari | Satu provinsi pada satu tanggal di dalam periode OMC BMKG |
| Provinsi-periode | Satu baris periode OMC BMKG untuk satu provinsi; satuan klaster galat baku Lapis A |
| Sasaran-hari | Satu kab/kota sasaran pada satu tanggal yang punya target renlap tujuan banjir |
| Niat semai | Perlakuan Lapis B: Pusdalops menjadikan zona target renlap; bukan bukti pesawat terbang |
| Terkonfirmasi BMKG | Sasaran-hari yang provinsinya punya periode OMC BMKG aktif pada tanggal itu |
| Kontrafaktual | Hujan yang diperkirakan terjadi tanpa OMC, ditaksir dari kontrol dan kovariat prakiraan IFS |
| TWFE | Regresi efek tetap dua arah (kab dan hari) |
| Uji permutasi | Mengacak label perlakuan berulang kali untuk melihat seberapa sering taksiran sebesar itu muncul tanpa efek |
| Permutasi blok | Permutasi yang memindah satu periode utuh ke tanggal lain di bulan kalender yang sama, supaya musim tetap |
| Plasebo waktu, plasebo ruang | Prosedur yang sama dijalankan pada tanggal atau tempat tanpa OMC; hasil "efek" di sana menandakan derau atau bias |
| MDE | Efek minimum terdeteksi pada daya 80% dan alfa 5%; di atas 30% (efek sasaran yang ingin dilihat) membuat hasil tak bermakna berlabel "tidak informatif" |
| Vonis | `sejalan`, `tak_terbedakan`, `berlawanan`, `data_kurang` (kategori `scripts/omc/nilai.py`), kriteria di RENCANA-UJI §6 |
| Pra-registrasi, sidik | Aturan uji ditulis dan disidik `sha256` sebelum data hasil ditarik, supaya tidak diubah sesudah melihat hasil |
| CHIRPS | Hujan harian 0,05 derajat dari satelit dan stasiun (CHC UCSB), hanya daratan, hari UTC |
| IMERG Late | Hujan harian satelit NASA 0,1 derajat, mencakup laut, butuh token Earthdata |
| Uji golden | Bukti bahwa keluaran karhutla tidak berubah satu byte pun sesudah tujuan banjir ditambahkan |
