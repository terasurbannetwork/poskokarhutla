# PRD: Penurunan tanah dan proyeksi rob

## Tujuan

Untuk tiap kecamatan pesisir di kota yang diproses (Q3), pimpinan, BPBD, dan peneliti melihat laju penurunan tanah terukur radar satelit, rentang ketidakpastiannya, dan seberapa jauh tanah turun dalam 10 dan 20 tahun bila laju bertahan. Penurunan tanah ditampilkan berdampingan dengan rob (tinggi pasang, status), tidak pernah dilebur menjadi satu angka sebelum diuji balik.

## Pengguna

| Peran | Kebutuhan |
| --- | --- |
| Pimpinan dan perencana BNPB, BPBD | Tahu kecamatan mana yang tanahnya turun cepat dan karena itu robnya akan makin sering, dengan batas kepercayaan. |
| Analis peta banjir | Lapis peta laju per kecamatan dan unduh angkanya. |
| Peneliti, kampus mitra | Metode, referensi, dan galat yang bisa diperiksa. |

## Fitur

| Kode | Fitur | Keputusan |
| --- | --- | --- |
| F-1 | Lapis peta "Penurunan tanah terukur" per kecamatan, warna skala cm per tahun, berlabel hipotesis. | D4, Q7 |
| F-2 | Kartu rincian: laju median, p90 sisi turun, rentang, jumlah piksel dan cakupan, periode data, metode (satu atau dua geometri), acuan. | D4, ALGORITMA 3 |
| F-3 | Proyeksi 10 dan 20 tahun: penurunan kumulatif dengan rentang, di kartu terpisah dari kartu rob. | D1, D5, Q5 |
| F-4 | Pembanding literatur: angka per kota dari `subsiden_literatur.json` tampil di samping angka terukur. | ALGORITMA 6 |
| F-5 | Kartu rob yang ada memakai laju kecamatan bila tersedia (bukan hanya maksimum literatur kota), tetap sebagai baris terpisah berlabel. | D1 |
| F-6 | Catatan kaki kartu pasang (`lapis_air.js:122`) diperbarui: penurunan tanah dijelaskan berdiri sendiri, tidak dimasukkan ke angka pasang. | D1 |
| F-7 | Luas atau jumlah kelurahan di bawah ambang elevasi sesudah penurunan 10 dan 20 tahun, dari DeltaDTM. | Q6 |
| F-8 | Tampilan kelurahan/desa. | D6, Q4 |

## Larangan

- Tidak ada satu angka gabungan rob dan penurunan tanah (D1, Q10).
- Tidak ada klaim "akan tergenang pada tahun X"; hanya "tanah turun sekitar N cm bila laju bertahan".
- Tidak ada angka tanpa label hipotesis sebelum validasi GNSS lolos.
- Kota tanpa gerbang pola lolos tidak tampil sebagai terukur; ia tetap literatur.
- Tidak menyunting berkas beku J4 (D7).
- Tidak menimpa `subsiden_literatur.json`; literatur dan terukur tetap dua berkas.
