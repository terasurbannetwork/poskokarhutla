# Lapis (c) penyunting bahasa: mitigasi bab 4 (Histori Bencana Indonesia)

Berkas: `data/kajian-bnpb/naskah/mitigasi/bab-04.md`. Tanggal: 25 Oktober 2026.

## Vonis

- `qa/slop.py --final`: **LOLOS, skor 0, nol temuan** (3.250 kata, kata kosong 0,0 per 1.000). Sebelum sunting LOLOS skor 0 dengan dua temuan S-18 tingkat rendah; keduanya kini hilang.
- Satu putaran antara sempat GAGAL (skor 2): S-21 tinggi karena "Karena itu," dipindah ke awal kalimat penutup §Pola korban, dan S-33 "beberapa versi". Keduanya dibetulkan; putaran akhir bersih.
- Keutuhan: 243 token `{{angka:...}}`, 53 kutipan `[@...]`, dan 1 kutipan bertanda petik sama persis dengan versi sebelum sunting. Rujukan silang naik dari 21 menjadi 22 (satu `@tbl:celah-histori` baru, lihat di bawah). Jumlah baris tetap 224. Nol em dash, nol " · ".

## Suntingan

| Jenis | Lokasi | Perubahan |
| --- | --- | --- |
| Istilah terlarang glosarium (tag riset "tidak ditemukan") | §Kejadian besar, Aceh 2004 | "Buku Utama Rencana Induk itu tidak ditemukan" menjadi "tidak berhasil diperoleh penyusun" |
| M-1 pasif menyembunyikan pelaku | §Kejadian dan dampak, §Kejadian besar | "Seri ini dibaca" menjadi "Kajian ini membaca seri tersebut"; "Selisih ... tidak dijelaskan BRR, jadi keduanya ditulis berdampingan" menjadi kalimat aktif; "kedua jendela ditulis berdampingan" menjadi "Kajian menyandingkan kedua jendela"; studi kasus Merapi: "dihitung penulis" menjadi "Penulis menghitung" |
| Register formal | seluruh bab | "punya" menjadi "memiliki" (5 tempat); "jadi" penghubung menjadi "sehingga"; "walau" menjadi "walaupun"; "lebih aman dibaca" menjadi "lebih tepat dibaca"; "memberinya arsir" menjadi "menampilkannya dengan arsir"; "beda keduanya tidak terjelaskan" menjadi "selisih keduanya belum terjelaskan" |
| Kalimat berantai dipecah (ritme) | §Kejadian dan dampak (versi 2025), §Kejadian besar (musim hujan, rasio hidrometeorologi), studi kasus Merapi (Hasil) | kalimat "..., dan ..., sehingga ..." dipecah menjadi dua atau tiga kalimat; isi dan token tidak berubah |
| Kalimat tebal L16 dirapikan | §Kejadian dan dampak (patahan seri), §Pelajaran (BRR) | struktur "patah ... di dua tempat, dan dengan saringan ..." diberi titik koma; "bukti dampaknya masih lemah seperti ..." disusun ulang supaya pembanding tidak terbaca sebagai contoh bukti lemah |
| Kalimat kabur | §Kejadian besar (Sulawesi Tengah, NTT 2026), §Nonalam (Al Khoziny, unjuk rasa), kartu temuan Palu (Pembuka) | "Sebab ... tidak dapat dibuktikan" menjadi "Data publik tidak menjelaskan mengapa ..."; "dua kali Cianjur" menjadi "dua kali jumlah Cianjur"; "terbesar ambruknya musala" diberi "dengan kejadian terbesar berupa"; "tentang tempat kejadian semacam itu dicatat" menjadi "yang menetapkan kategori pencatatan"; Pembuka InaTEWS dibuang redundansinya ("dievaluasi dampaknya, dan evaluasi itu menjadi syarat ...") |
| Pengulangan antarsubbab | §Kejadian besar | klausa "korban likuefaksi 2018 tergabung dalam angka Sulawesi Tengah" dibuang dari paragraf analog nonalam; isi lengkapnya tetap di §Pelajaran (kejadian berantai) |
| S-18 daftar | §Kejadian besar, §Pelajaran (celah) | daftar enam jenis tanpa lantai diganti jumlah plus rujukan `@tbl:celah-histori` (tabel itu sudah memuat keenamnya); daftar tiga butir @rek:r-m08 disusun ulang tanpa deret koma |
| Kuantor kabur S-33 | §Kejadian dan dampak | "beberapa versi" menjadi "lebih dari satu versi" |

## Yang diperiksa dan dibiarkan

- Singkatan glosarium (T-9): semua dieja pada kemunculan pertama di prosa (DIBI, BNPB, Juklak, Renstra, BRR, USGS, R3P, WHO, TPA, PVMBG, BMKG, InaTEWS, Renas PB, BPBD, RPJMN, BPS). BPBD muncul lebih dulu di sel `@tbl:rekonsiliasi`, yang tidak dihitung T-9; ejaan prosanya di §Pelajaran.
- Istilah terlarang: "Anda" yang terdeteksi adalah bagian dari "Pangandaran".
- L16: semua paragraf temuan dibuka kalimat tebal berangka. Paragraf tanpa kalimat tebal adalah kotak koreksi, studi kasus, dan kartu temuan yang berstruktur direktif.
- Pelajaran wajib: InaTEWS, BRR, Rekompak, dan rehabilitasi rumah Lombok tidak disebut "terbukti"; model La Niña tetap disandingkan angka tercatat dan tidak dipakai sebagai skenario karena di bawah lantai; angka bertentangan (BRR capaian lawan naratif, DIBI lawan USGS, DIBI lawan Renstra, R3P lawan DIBI) tetap ditulis berdampingan.
- M-10: kontras yang tersisa berlandaskan data (versi semua laporan bukan kejadian bencana 2025; angka model bukan korban tercatat).
- "Jendela tanggal ... pilihan penyusun" muncul di §Kejadian besar (Sumatra) dan §Pola korban (lima kejadian): dibiarkan karena cakupannya berbeda.

## Di luar lapis ini

- `qa/periksa.py` bekerja atas DOCX, sehingga T-9 dan D-10 diperiksa dengan skrip setara atas `data/glosarium.json`, bukan dengan periksa.py.
