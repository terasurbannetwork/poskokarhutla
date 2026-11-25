# Kemitraan: profil dan masalah otomatis

Bagian ini memerinci kunci wilayah, profil daerah, masalah otomatis, skor prioritas, dan masalah dari IKD terlemah.

## Kemitraan Kampus: kunci wilayah dan profil daerah

Sumber: 514 kabupaten/kota dengan kode IRBI 4 digit (`public/data/wilayah/indeks.json` berisi 548 baris, yaitu 514 kabupaten/kota dan 34 provinsi; hanya 514 yang dipakai). Crosswalk dibangun `scripts/kemitraan/kode.py` ke `public/data/kemitraan/kode.json`.

Aturan:

- Ada empat skema kode di repositori (IRBI, BPS, Kemendagri bertitik, kunci nama "NN|Nama"). Contoh perbedaan: 3171 menurut IRBI adalah Jakarta Pusat, tetapi 3171 menurut BPS adalah Jakarta Selatan. Semua penggabungan harus lewat `kode.json`.
- Yang tidak cocok pasti dijadikan `null` dan dicatat di `kode_gagal.json`. Sistem tidak menebak. Kolom `bps` bernilai `null` untuk semua kabupaten/kota sampai daftar BPS resmi tersedia.
- Titik pusat kabupaten/kota adalah centroid poligon `public/geo/kabupaten/<prov>.json`.

Profil per kabupaten/kota (`scripts/kemitraan/profil_daerah.py`) menghasilkan 514 berkas `public/data/kemitraan/daerah/<kode4>.json`, ringkasan `ringkas.json`, dan 38 berkas provinsi `prov/<NN>.json`. Blok profil: wilayah, penduduk, sosek, irbi, inarisk_kec, kejadian (dengan tren), fasilitas, kapasitas, gempa, karhutla, kekeringan, gunungapi, pesisir, udara, neraca_air, model, siluet, dan masalah. Setiap blok memuat sumber, tanggal, dan keyakinan. Data hilang menjadi `null`. Ukuran berkas dibatasi: 60.000 byte per kabupaten/kota, 120.000 byte untuk `ringkas.json`, 60.000 byte per provinsi (`profil_daerah.py:21`, `:1115`).

Aturan khusus yang terbukti di kode:

- Tren kejadian memakai kemiringan Theil-Sen. Tren dinyatakan datar bila selisih relatif di bawah 0,05, dan "jarang" bila tahun berkejadian kurang dari 3 (`konst.py` kelompok `MASALAH`).
- Tahun 2024 dikecualikan untuk data per jenis DIBI (`profil_daerah.py:759`).
- Persentil memakai peringkat minimum (nilai kembar mendapat peringkat terendah), dihitung atas semua kabupaten/kota non-null, dibulatkan 4 desimal setengah ke atas. Pembulatan memakai setengah-ke-atas, bukan pembulatan bawaan Python.
- Email BPBD tidak ditulis, karena gerbang melarang email, nomor 62..., dan id OpenAlex di `public/data/kemitraan/**` (`profil_daerah.py:23`).

Status uji: tidak ada uji balik untuk profil (isinya data sumber). Keluaran dijaga `profil_daerah.py --cek` dan `--jaga` (membandingkan tanggal per berkas dengan versi git sebelumnya supaya tanggal tidak mundur).

## Kemitraan Kampus: masalah otomatis dan skor prioritas

Dokumen rujukan: `data/kajian-bnpb/kampus/ALGORITMA.md` §3. Kode: `scripts/kemitraan/masalah.py`. Semua bobot dan ambang berstatus asumsi-kebijakan dan hidup di satu tempat, `scripts/kemitraan/konst.py` yang harus identik dengan `public/kemitraan/konst.js` (dijaga `tests/kemitraan/konst.test.mjs`).

Bahan per kabupaten/kota k dan bahaya b, semuanya dinormalkan menjadi persentil nasional 0 sampai 1:

| Simbol | Arti | Sumber |
| --- | --- | --- |
| H | skor bahaya IRBI 2025 | `public/data/wilayah/NN.json` |
| F | frekuensi kejadian 2015-2025 per 100 ribu penduduk | `banjir/data/kejadian.json`, risiko gempa, titik VIIRS karhutla, riwayat kekeringan |
| T | tren Theil-Sen; `null` bila kurang dari 5 tahun data | sumber yang sama |
| D | dampak 12 bulan: meninggal x 10 + mengungsi / 100 + rumah rusak berat | `public/data/dibi_kejadian.json` |
| P | paparan: rerata persentil balita+lansia dan persentil bangunan | blok `pp` profil wilayah |
| K | celah kapasitas: 1 dikurangi (perda PB + perda BPBD + RPB + renkon + BPBD berstatus Terbentuk) / 5 | blok `rg` dan `bp` |
| M | kelas risiko model platform (bukti saja, tidak masuk skor) | `risiko_kecamatan.json` |

Rumus:

```
S_auto(k,b) = 0,25*H + 0,20*F + 0,10*T + 0,15*D + 0,15*P + 0,15*K
```

Bobot ada di `konst.py` kelompok `BOBOT.auto`. Bila komponen `null`, komponen itu dikeluarkan dan bobot sisanya dinormalkan ulang. Masalah tidak dibuat bila komponen tersedia kurang dari 4 (`MASALAH.KOMP_MIN`). Komponen yang nilai mentahnya sama untuk semua kabupaten/kota (misalnya D tsunami nol di mana-mana) dikeluarkan sebagai tidak informatif.

Kelas prioritas dari skor yang sudah dibulatkan 4 desimal: P1 bila S >= 0,70, atau H >= 0,80 dan K >= 0,60. P2 bila S >= 0,50. Selain itu P3.

Masalah dibuat per aturan hanya bila S_auto >= 0,40 (`MASALAH.S_MIN`):

| Aturan | Aspek | Syarat |
| --- | --- | --- |
| Risiko tinggi tanpa dokumen rencana | A5 | H >= 0,6, RPB dan renkon sama-sama tidak tercatat |
| Kejadian meningkat | A1 | F >= 0,6, T >= 0,6, tren "naik" |
| Peringatan dini lokal | A2 | bahaya banjir, longsor, cuaca ekstrem, atau karhutla, dan F >= 0,6 |
| Dampak besar 12 bulan | A9 | D >= 0,7 |
| Kelompok rentan | A7 | P >= 0,7 dan H >= 0,5 |
| Karhutla di gambut | A3 | karhutla dan gambut lebih dari 10 persen luas |
| Bangunan di zona gempa atau tsunami | A3 | gempa atau tsunami, H >= 0,7 |

Keputusan pemilik 2 November 2026 (butir 25): model platform yang gagal uji tidak lagi membentuk masalah. Vonis nasional yang gagal (semua sub-uji bahaya itu gagal) hanya menjadi bukti tambahan pada masalah pertama pasangan (kabupaten/kota, bahaya) yang sudah lolos aturan lain, berlabel "Vonis NASIONAL ... bukan hasil uji per kabupaten".

Judul masalah memakai teks baku tanpa angka. Angka ada di baris bukti (nilai asli, sumber, tanggal, keyakinan). Keyakinan masalah sama dengan bukti yang terlemah.

Prioritas masalah yang diajukan BPBD (`src/kemitraan_hitung.js:20`):

```
S_bpbd = 0,5 * (U + C + R + J) / 12 + 0,5 * S_auto
```

U urgensi, C cakupan, R kesiapan data, J kecocokan kampus, masing-masing 0 sampai 3. Bila S_auto tidak tersedia atau bahayanya `multi`, dipakai 0,5. Kelasnya memakai aturan P1 sampai P3 yang sama.

Penggabungan lintas daerah: dua masalah digabung bila kategori (bahaya dan aspek) sama dan kemiripan Jaccard token judul dan uraian (setelah kata henti dibuang) bernilai 0,5 atau lebih (`MASALAH.JACCARD`). Induk adalah yang skornya tertinggi.

Status uji: skor prioritas otomatis berstatus HIPOTESIS dengan pil "Belum diuji". Rencana ujinya: setelah sedikitnya 100 masalah tervalidasi pendataan, hitung AUC S_auto terhadap label "tervalidasi P1" dan bandingkan dengan H saja. Uji ini belum dijalankan.

Batasan: komposisi masalah condong ke aspek A5 karena dokumen renkon tercatat hanya untuk sedikit kabupaten/kota; kelas yang terbentuk hanya P1 dan P2 pada pasangan yang ada (catatan ilmu agent, 2 November 2026).

## Kemitraan Kampus: masalah dari prioritas IKD terlemah

Kode: `scripts/kemitraan/ikd.py`, keluaran `public/data/kemitraan/masalah_ikd.json`. Keputusan pemilik 24 November 2026 (butir 26) menggantikan bawaan "IKD diisi manual" untuk bahan masalah.

Sumber: `public/data/inarisk/ikd.json`, analisa berkunci "kabupaten/tahun". Langkah:

1. Per kabupaten/kota, ambil tahun terbaru yang punya analisa. Analisa 2 digit (provinsi) dilewati.
2. Pilih hingga 2 prioritas (P1 sampai P7) bernilai terendah yang punya rekomendasi indikator. Bila nilai seri, nomor prioritas yang lebih kecil menang.
3. Tiap pilihan menjadi satu butir dengan `auto_id = ikd-<kab4>-<tahun>-P<n>`, judul "Prioritas IKD terlemah: <nama prioritas>", teks indikator rekomendasi apa adanya, dan label "IKD InaRISK <tahun>". Bahaya diset `multi` dan aspek A5.
4. Kabupaten/kota tanpa analisa atau tanpa rekomendasi tidak punya butir (kosong, bukan nol).

Catatan: `ikd.py` belum dipanggil dari workflow mana pun. `.github/workflows/kemitraan.yml` hanya menjalankan kode wilayah, uji geo dan masalah, profil daerah, bank pertanyaan, jaga keutuhan, dan commit. Jadi `masalah_ikd.json` (yang dibaca `cocok_pakar.py`) hanya terisi bila `ikd.py` dijalankan manual dan tidak diperbarui otomatis.

Butir ini tidak punya skor S_auto atau kelas P1 sampai P3, tidak mengubah masalah otomatis, dan ikut pencocokan pakar. Kabupaten/kota 9707 tidak ada di `kode.json` sehingga dilewati.
