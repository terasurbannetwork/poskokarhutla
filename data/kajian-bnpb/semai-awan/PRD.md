# PRD: Peluang Semai Awan dan Prakiraan Asap

Tunduk pada `KEPUTUSAN-SEMAI.md`. Fitur yang tidak tertulis di sini tidak dibuat.

## 1. Masalah

Tiap pagi posko TMC dan Pusdalops memutuskan apakah pesawat OMC terbang, ke mana, dan jam berapa. Bahannya tersebar: prakiraan
awan BMKG, titik panas, gelar armada, renlap. Tidak ada satu layar yang menjawab "awan mana dalam 24 jam ke depan yang layak
disemai dan hanyut ke api besar, dari base mana, jam berapa", dan "asap dari api mana menyeberang ke negara tetangga kapan".
Akibatnya sortie OMC tidak bisa dinilai lawan peluang yang ada, dan peringatan asap lintas batas datang sesudah kejadian.

## 2. Pengguna dan tampilan

| Tampilan | Pengguna | Yang dilihat |
| -------- | -------- | ------------ |
| Pos komando | Pusdalops, posko TMC, pimpinan | peta penuh, semua titik api, koordinat persis, alasan, titik hujan, tombol jadikan target renlap |
| Tinjau BMKG | meteorolog peninjau (BMKG, BRIN) | Pos komando + slider bobot, tabel faktor 10 sel terbaik, mode "seperti Nimbus", salin CSV |
| Mitra lintas batas | staf yang menyiapkan bahan untuk mitra asing | cluster teragregasi, zona dibulatkan 0,5 derajat tanpa alasan, peringatan asap penuh, ringkasan Inggris |
| Ringkasan teks | siapa pun pembaca seksi | tombol "Salin ringkasan" pada tampilan aktif |

Hak baca mengikuti seksi Operasi Udara (`/api/operasi/peta`). Tombol renlap mengikuti Q3.

## 3. Fitur

| Kode | Kelompok | Fitur | Bergantung |
| ---- | -------- | ----- | ---------- |
| F-1 | Data | Putaran ECMWF IFS 0,1 derajat 00 dan 12 UTC, langkah 0 sampai 24 jam per 3 jam, wilayah 94 sampai 142 BT, 12 LS sampai 7 LU | Q1 |
| F-2 | Data | Bilah sumber: FIRMS VIIRS (jumlah titik, satelit yang hilang), ECMWF (putaran, resolusi, lisensi), peringatan data > 6 jam | – |
| F-3 | Awan | Lapisan **awan layak semai** per jam: sel biru yang lolos semua gerbang | – |
| F-4 | Awan | Lapisan **angin pengarah** 850 sampai 700 hPa (panah) | – |
| F-5 | Zona | Sampai lima **zona semai** A sampai E per 24 jam: lingkaran berskor, garis putus ke titik hujan | Q6 |
| F-6 | Zona | Kartu **Rekomendasi**: zona teratas, provinsi atau kota terdekat, skor, jendela terbang, koordinat DMS dan desimal, salin koordinat, alasan C, F, T, B | Q7, Q8 |
| F-7 | Zona | **Daftar zona**: klik memindah peta dan bilah jam ke zona | – |
| F-8 | Zona | Kartu kosong yang jujur: "tidak ada awan layak semai yang hanyut ke api 24 jam ke depan" atau "tidak ada cluster api di atas 40 MW" | – |
| F-9 | Zona | **Jadikan target renlap OMC**: satu klik menambah target ke renlap base terdekat yang punya armada OMC; status zona "sudah jadi target" | Q2, Q3 |
| F-10 | Asap | Lapisan **prakiraan asap** per jam (beban relatif) | – |
| F-11 | Asap | Kartu **Peringatan asap**: hijau bila tidak ada asap ke negara lain; merah: jam pertama menyeberang, kota terdekat di sana, cluster asal; daftar kota di bawah asap dengan jam tiba dan tingkat | Q11 |
| F-12 | Waktu | **Bilah jam** 24 jam per 3 jam dengan tombol putar | – |
| F-13 | Cluster | Tabel **cluster aktif**: provinsi, piksel, daya api, terakhir terlihat, zona terbaik; klik baris memperbesar peta | – |
| F-14 | Peran | Pemilih tampilan Pos komando, Tinjau BMKG, Mitra | Q4, Q5 |
| F-15 | Tinjau | Slider bobot Q, D, T dan setel ulang; peringkat dihitung ulang di peramban | – |
| F-16 | Tinjau | Tabel faktor 10 sel terbaik (lintang bujur, Q, D, T, skor) dan salin CSV | – |
| F-17 | Tinjau | Mode **seperti Nimbus** (jumlah berbobot, tanpa syarat awan hangat) untuk pembanding | – |
| F-18 | Bagikan | **Ringkasan teks** Pos komando (Indonesia) dan Mitra (Inggris, dibulatkan 0,5 derajat) | Q12 |
| F-19 | Jujur | Kartu **Cara memutuskan** dan **Yang tidak terlihat satelit dan model**, lipat, diisi dari ALGORITMA | – |
| F-20 | Uji | **Rapor prospektif**: tiap putaran dibekukan; sesudah jam zona lewat, dinilai lawan hujan satelit di titik hujan; ditampilkan persen zona yang benar menjadi hujan lawan sel acak setara | pendaftaran GSMaP |
| F-21 | Uji | **Sortie lawan zona**: sortie OMC (`omc_sortie`, tanpa koordinat: poligon sasaran atau kabupaten sasaran, ALGORITMA §12) yang jamnya beririsan jendela terbang zona | Q10 |
| F-22 | Awan teramati | Tanda pada zona bila Himawari menunjukkan puncak awan dingin di kabupatennya pada jam terbaru | – |

## 4. Di luar lingkup

- Peta dunia dan konsol negara lain (S2).
- Memasukkan zona ke renlap otomatis (S3).
- Klaim mm hujan tambahan, persen titik panas turun, atau "akan padam" (D8).
- Tautan publik tanpa login untuk mitra (Q5 bawaan).
- Pembasahan gambut tanpa api aktif (Q9, tiket lanjutan SA-14).
- Peringatan HP atau email.
- Model data (pembelajaran mesin) sebelum ada ratusan sortie berlabel (R1 §6).

## 5. Ukuran berhasil

| Ukuran | Target | Sumber |
| ------ | ------ | ------ |
| Jeda dari putaran IFS 0,1 derajat lengkap sampai zona tampil | < 60 menit (jadwal 26 menit sesudah terbit + sekitar 15 menit hitung) | `dibuat` di `semai.json` lawan `Last-Modified` `.index` langkah 36 |
| Zona berskor tinggi menjadi hujan alami di titik hujan dalam 30 sampai 90 menit | lebih tinggi dari sel acak setara, diuji prospektif (ALGORITMA §12) | rapor F-20 |
| Arah asap 24 jam | arah dan kota terkena sesuai Himawari asap dan PM2.5 BMKG | uji SA-05 |
| Sortie OMC di dalam zona | naik dari musim sebelumnya | F-21 |
| Klik bilah jam dan pilih zona | INP < 200 ms | `inp-reviewer` |
