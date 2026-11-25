# PRD: Semai Redistribusi Banjir dan Penguji Efektivitas

Tunduk pada `KEPUTUSAN-SEMAI-BANJIR.md`, lalu paket induk `data/kajian-bnpb/semai-awan/`. Fitur yang tidak tertulis di sini tidak dibuat.

## 1. Masalah

Saat hujan lebat diprakirakan di kab/kota rawan banjir, BNPB dan BMKG menggelar OMC pengurangan curah hujan (BMKG mencatat 104
periode provinsi 2023 sampai 2026, 888 provinsi-hari). Keputusan "awan mana dicegat, di mana, jam berapa" tidak punya layar: seksi Peluang semai hanya
mencari awan yang hanyut **ke** api. Dan tidak ada yang mengukur apakah hujan di sasaran memang lebih rendah dari yang diharapkan
pada hari OMC; klaim "berhasil menurunkan intensitas hujan" tidak punya pembanding.

## 2. Pengguna dan tampilan

Sama dengan PRD induk §2 (Pos komando, Tinjau BMKG, Mitra, Ringkasan teks). Tampilan Mitra pada tujuan banjir hanya menampilkan
"tampilan mitra untuk asap lintas batas; tujuan banjir tidak punya tampilan mitra" (asap tidak dihitung untuk tujuan banjir).

## 3. Fitur

| Kode | Kelompok | Fitur | Bergantung |
| ---- | -------- | ----- | ---------- |
| F-1 | Tujuan | Saklar dua segmen berikon **Karhutla / Banjir** di kepala seksi Peluang semai; tujuan ikut di hash (`#semai` atau `#semai/banjir`) | K1 |
| F-2 | Sasaran | **Sasaran otomatis**: kab/kota dari prakiraan banjir `/prediksi` tenggang 1 dan 2 dan pernyataan hujan lebat BMKG, tiap sasaran menyebut asalnya ("prakiraan kita, belum teruji" atau "BMKG") | Q2, Q6 |
| F-3 | Sasaran | **Sasaran manual**: Pusdalops memilih kab/kota dari daftar; bila sudah ada di `kandidat_sasaran` putaran itu, zona langsung dihitung di peramban; bila belum, "dihitung di putaran berikutnya" dan disimpan | K2, Q12 |
| F-4 | Sasaran | **Daftar tetap** Jabodetabek (13 kab/kota daratan) selalu ikut dihitung, tanpa menunggu prakiraan | Q5 |
| F-5 | Zona | Sampai lima **zona cegat** A sampai E per 24 jam di hulu angin sasaran, lingkaran berskor, garis putus dari titik hujan ke tepi sasaran dengan tenggang tiba | Q3 |
| F-6 | Zona | Kartu **Rekomendasi** tujuan banjir: zona, sasaran yang dilindungi, skor, jendela terbang, koordinat DMS dan desimal, alasan C (awan), H (lepas sebelum sasaran), P (paparan zona), B (base) | – |
| F-7 | Zona | Tanda **laut** atau **darat, paparan rendah** per zona; zona di daratan kab berpeluang banjir tidak pernah muncul | D5 |
| F-8 | Zona | Kartu kosong jujur: "tidak ada sasaran banjir hari ini", "tidak ada awan layak semai di hulu sasaran", "angin pengarah terlalu lemah untuk dicegat" | – |
| F-9 | Zona | **Jadikan target renlap OMC** dengan rute dan halaman `/renlap-omc` yang sama; pil "OMC banjir, sasaran Jakarta Utara" | S7 induk |
| F-10 | Peta | Lapisan **sasaran** (poligon kab bergaris biru tua, isi tipis), lapisan awan layak semai dan angin pengarah dipakai ulang | – |
| F-11 | Tinjau | Penggeser bobot Q, H, P dan tabel faktor 10 sel terbaik, salin CSV, dihitung ulang di peramban | – |
| F-12 | Bagikan | **Ringkasan teks** Pos komando tujuan banjir (Indonesia) | – |
| F-13 | Uji | **Penguji efektivitas Lapis A** (retrospektif): provinsi-hari berperiode OMC `Pengurangan CH - Bencana` BMKG lawan provinsi-hari tanpa OMC dengan prakiraan setara; hasil di `riset/HASIL-A.md`, tampil sesudah pemilik membaca | Q1, Q8 |
| F-14 | Uji | **Penguji efektivitas Lapis B** (prospektif): sasaran-hari dari target renlap tujuan banjir lawan kab-hari tanpa target dengan prakiraan setara; vonis empat kategori; kartu **Rapor uji** di seksi | Q1, Q4 |
| F-15 | Uji | **Kesesuaian dengan BMKG**: persen target renlap tujuan banjir yang provinsinya punya periode OMC BMKG aktif di tanggal itu (bukti operasi digelar, bukan bukti sortie ke zona) | K3 |

## 4. Di luar lingkup

- Mesin kedua, layar kedua, atau halaman renlap kedua (K1).
- Prakiraan asap untuk tujuan banjir.
- Form sortie baru atau kolom sortie baru (K3); `omc_sortie` tidak dipakai penguji karena belum terisi.
- Klaim mm hujan berkurang, persen banjir turun, "mencegah banjir", "aman" (D10).
- Operasi malam (Q10).
- Usulan bahan dan jumlah bahan untuk tujuan banjir (Q9).
- Uji acak hari-layak (Q11), menunggu keputusan kebijakan.
- Penguji di tingkat sortie, jam, atau koordinat semai (tidak ada datanya; RENCANA-UJI §6.6).

## 5. Ukuran berhasil

| Ukuran | Target | Sumber |
| ------ | ------ | ------ |
| Karhutla tidak berubah | `semai.json` tujuan karhutla sama byte dengan rujukan beku (selain `dibuat`) | uji golden SB-01 |
| Jeda putaran ke zona banjir tampil | sama dengan karhutla (< 60 menit) | `dibuat` `semai_banjir.json` |
| Zona di daratan kab berpeluang banjir | 0 | uji SB-04 |
| Titik hujan zona jatuh di dalam sasaran | 0 | uji SB-04 |
| Penguji Lapis A | vonis dan MDE tertulis, plasebo dilaporkan, apa pun hasilnya | `riset/HASIL-A.md` |
| Klik saklar tujuan | INP < 200 ms | `inp-reviewer` |
