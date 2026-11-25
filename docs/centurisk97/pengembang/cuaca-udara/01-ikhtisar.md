# Ikhtisar cuaca, udara, dan semai

Halaman ini meringkas modul cuaca, udara, modifikasi cuaca, dan peluang semai, lalu menjelaskan halaman Cuaca Ekstrem.

## Ringkasan

Modul ini menjawab empat pertanyaan operasional yang saling terkait.

1. **Cuaca ekstrem** (`/cuaca/`): wilayah mana yang diprakirakan mengalami hujan lebat, embusan angin kencang, gelombang tinggi, atau berada dalam peringatan dini BMKG dalam 72 jam ke depan, dan berapa penduduk di dalamnya.
2. **Kualitas udara** (`/udara/`): berapa PM2,5 (partikel halus) per kabupaten/kota dalam 72 jam ke depan, berapa jiwa yang menghirup udara tidak sehat, dan asap itu datang dari api atau sumber mana.
3. **Modifikasi cuaca (OMC)**: pencatatan sortie penaburan bahan semai oleh staf TMC, penarikan jadwal operasi resmi BMKG, dan evaluasi apakah perubahan PM2,5, jarak pandang, atau hujan sejalan dengan dugaan efek semai. Evaluasi hanya menilai kesesuaian, tidak membuktikan sebab-akibat.
4. **Peluang semai awan dan prakiraan asap 24 jam** (`/operasi#semai`, seksi di Operasi Udara): usulan zona awan yang layak disemai dan hanyut ke api besar, lengkap dengan jendela terbang, bandara berangkat, ketinggian, bahan, dan rute, serta peringatan asap yang menyeberang ke negara lain.

Pengguna utama:

| Pengguna | Memakai apa |
| -------- | ----------- |
| Warga | `/cuaca/` dan `/udara/` (publik), terutama status wilayah, kategori udara, dan saran per kategori. |
| BPBD | Status kecamatan 72 jam, peringatan nowcast, jiwa terpapar, kelompok rentan, tab Kejadian. |
| Staf BNPB (Pusdalops, koordalops) | Insight cuaca dan udara, asal asap, tab Operasi, seksi Peluang semai. |
| Staf TMC (OMC) | Mencatat sortie di `/admin/omc`, memakai zona usulan, menjadikan zona target renlap OMC. |
| Peninjau BMKG dan BRIN | Membaca masukan, bobot, dan alasan tiap zona semai; membaca hasil uji balik di tab Metode. |
| Pimpinan | Ringkasan Insight, ringkasan teks seksi Peluang semai, peringatan Himawari yang dikabarkan ke Posko pusat. |

Prinsip yang berlaku di seluruh modul: angka model berlabel perkiraan model dan bukan pengukuran; pernyataan resmi BMKG tampil apa adanya dengan label lembaga dan jam terbit, terpisah dari deteksi Centurisk97; data yang tidak terukur ditulis kosong atau "belum terukur", tidak pernah nol; model yang belum lulus uji balik berlabel hipotesis.

![Empat jalur data modul ini dari sumber, pipeline berjadwal, sampai layar: cuaca 72 jam, kualitas udara, evaluasi modifikasi cuaca, dan peluang semai awan. Jadwal diambil dari lintas.yml, udara.yml, dan semai.yml.](gambar/cuaca-udara-semai-alur-data.svg)

## Halaman Cuaca Ekstrem (`/cuaca/`)

- **Jalur dan akses**: `https://centurisk97.id/cuaca/`, publik tanpa masuk. Status registri `aktif` (`public/bencana.json`, entri `cuaca`). Tab `posko` dan `informasi` disembunyikan dari menu menurut registri (`tab_sembunyi` di `public/bencana.json`). Kode layar menyembunyikan juga tab `tentang` (`TAB_SEMBUNYI` di `public/cuaca/cuaca.js:68`, disembunyikan pemilik 29 Oktober 2026), sehingga registri dan kode berbeda.
- **Tab yang tersedia**: Peta, Kejadian, Insight, Berita, Tren, Dampak, Simulasi, Foto, Tentang, Metode (daftar di `public/cuaca/cuaca.js:67`); tab Tentang ada di kode tetapi tidak tampil di menu (lihat catatan di atas).

Langkah pakai:

1. Buka `/cuaca/`. Peta menampilkan lapisan hujan, embusan, awan sangat dingin, titik METAR bandara, siklon, dan titik jaringan peringatan dini. Pilih hari prakiraan di bilah hari.
2. Klik wilayah di peta atau baris di tabel untuk membuka laci wilayah: status 72 jam per kecamatan, peringatan BMKG yang berlaku, dan sarana (pelabuhan, bandara) di wilayah itu.
3. Buka tab **Insight** untuk kartu per bahaya: Kejadian cuaca, Kecamatan Waspada Siaga Awas per provinsi (72 jam), Angin siklon tropis (JTWC), Siklon tropis resmi BMKG, Sarana (pelabuhan dan bandara), Bukti BMKG, Bukti Kita, Prakiraan resmi BMKG, Peringatan nowcast, Gelombang, Maritim, Hujan, Angin, Ansambel, Peluang hujan ekstrem, Awan sangat dingin, Provinsi (`public/cuaca/insight.js:32`).
4. Buka tab **Dampak** untuk jiwa di sel prakiraan hujan lebat, kejadian dan korban tahunan BNPB, serta indeks risiko InaRISK.
5. Buka tab **Simulasi** (`/cuaca/simulasi.html`, dimuat sebagai iframe) untuk menggerakkan prakiraan per jam dengan skenario siklon. Hasilnya cara berpikir, bukan prakiraan resmi.
6. Buka tab **Metode** untuk sumber data, jadwal pembaruan, ambang, dan hasil uji balik.

Arti label dan warna:

| Tingkat | Arti |
| ------- | ---- |
| Normal (abu) | Di bawah ambang pertama. |
| Waspada (kuning) | Tingkat 1 salah satu bahaya. |
| Siaga (oranye) | Tingkat 2. |
| Awas (merah) | Tingkat 3. |

Ambang tingkat (`scripts/cuaca/dasar.py:11-15`): hujan harian 50, 100, 150 mm (kelas lebat, sangat lebat, ekstrem BMKG); embusan 54, 72, 90 km/jam; tinggi gelombang 2,5, 4, 6 m; peluang ansambel 40% untuk hujan 50 mm atau lebih (Waspada), 40% untuk 100 mm atau lebih (Siaga), 70% untuk 100 mm atau lebih (Awas). Tingkat satu kecamatan adalah yang terbesar dari semua bahaya itu.

Hal yang sering disalahpahami:

- Status 72 jam adalah hitungan dari prakiraan model, bukan peringatan resmi. Peringatan resmi BMKG tampil di kartu terpisah berlabel BMKG dan tidak dipetakan ulang ke tingkat Centurisk97.
- Ambang hujan dan embusan berstatus hipotesis. Uji balik terhadap logbook Pusdalops menunjukkan hujan model belum terbukti lebih baik daripada kebiasaan kabupaten dan bulan (lihat bagian Metode).
- Peringatan nowcast hanya hidup 2 sampai 3 jam, jadi panel kosong pada jam tertentu bukan berarti wilayah bebas risiko; layar menulis jam terbit BMKG terakhir.
- Badai guntur tidak ditampilkan karena indeks angkat tidak ada di sumber.
- Awan sangat dingin dari Himawari-9 adalah analisis Centurisk97 berstatus hipotesis dan bukan produk BMKG atau JMA.

Ekspor: tombol Bagikan membuat gambar kartu; tab Insight dan Dampak mengunduh tabel (`public/cuaca/unduh.js`, `bagikan.js`).
