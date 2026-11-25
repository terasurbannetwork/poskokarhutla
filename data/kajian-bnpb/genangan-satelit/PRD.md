# PRD: Genangan satelit per kejadian banjir

## 1. Tujuan

Staf Pusdalops dan Koordalops melihat, dalam satu kartu Kaji Cepat, di mana air terlihat oleh radar sesudah banjir besar, seberapa luas per kab dan kecamatan, berapa penduduk dan lahan apa yang berada di area itu, dan citra sebelum dan sesudahnya. Semuanya berlabel perkiraan radar dan berdampingan dengan laporan resmi.

## 2. Pengguna dan hak

| Peran | Lihat | Ubah status kaji |
| --- | --- | --- |
| Pusdalops (PD), Koordalops (KO) | semua kejadian | Diperiksa, Dipakai, Tarik |
| BPBD kab (BP) | kejadian wilayahnya | tidak |
| Publik | ringkasan, rincian per kab, lahan, sel, citra di `/banjir` (K4, GS-14), berlabel perkiraan radar dan hipotesis | tidak |

## 3. Fitur

- F-1 Pasangan GFM per kejadian: untuk tiap kab anggota `KJ-` banjir, lintasan bercakupan terbesar dalam 0 sampai 12 hari sesudah `mulai`, pra pada orbit dan jam serupa yang jatuh sebelum `mulai` (D2).
- F-2 Luas per kab dan kecamatan: tergenang baru, latar, diamati, ter-mask, cakupan persen, sinyal lemah (D3).
- F-3 Penduduk di area genangan: rentang bawah sampai atas per kab dan untuk kab sah, per sumber jiwa berdampingan (D4).
- F-4 Lahan tergenang per kelas WorldCover (11 kelas resmi; yang nol tidak digambar), dalam ha (D5).
- F-5 Persen luas: tergenang baru dibagi luas teramati kab; luas kab hanya sebagai keterangan.
- F-6 Citra sebelum dan sesudah per kab: radar VV, optik warna asli, optik semu SWIR, dengan penggeser (D10).
- F-7 Kartu Kaji `banjir_gfm` di `/siklus/kaji/:id`: ringkasan, tabel per kab, lahan, citra, metode, berdampingan dengan `banjir_jam1` dan isian petugas.
- F-8 Lapis peta "Genangan radar" di peta kaji: titik tergenang baru dalam sel 110 m (tanpa koordinat bangunan).
- F-9 Uji balik peringkat terhadap DIBI dengan kriteria terkunci; vonis tertulis di kartu.
- F-10 Jadwal: hitung ulang saat ada lintasan baru (Q9).

## 4. Larangan

- Tanpa ambang radar sendiri, penggeser ambang, atau hitung ulang di peramban (K2, D11).
- Tanpa angka bangunan terendam (D6).
- Tanpa nol untuk kab tak teramati atau tanpa lintasan; tulis alasannya.
- Tanpa kata "aman", "tidak banjir", "surut", "terdampak" untuk angka radar. Yang dipakai: "di area genangan", "teramati radar".
- Tanpa menjumlah atau merata-rata dengan DIBI, Logbook, atau isian petugas.
- Tanpa data per bangunan atau per orang di D1, layar, atau `public/`.
- Versi publik hanya yang dirinci di DESAIN-TEKNIS 8 dan KEAMANAN-PRIVASI 6 (K4); tanpa kecamatan, bangunan, atau data orang di publik.

## 5. Ukuran berhasil

- Kejadian uji Sumatera 26 Nov 2025 terhitung ujung ke ujung dalam anggaran Q7.
- Uji balik terkunci punya vonis tertulis (lulus, gagal, atau tak dapat dinilai) sebelum pil hipotesis dicabut.
- `banjir_jam1` keluarannya sama persis dengan sebelum paket ini (golden).
- Layar lolos `inp-reviewer` dan `selera-angka`, ditinjau pemilik di `http://localhost:8800/siklus/kaji`.
