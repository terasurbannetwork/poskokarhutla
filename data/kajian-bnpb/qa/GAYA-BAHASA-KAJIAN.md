# Gaya bahasa kajian BNPB

Panduan ini berlaku untuk dokumen kajian dan laporan BNPB (DOCX, PDF, ringkasan pimpinan). Isinya gabungan aturan
pemilik (13 Nov 2026) dan aturan yang diadaptasi dari tiga skill penulisan bahasa Indonesia berlisensi MIT:
naskah-id (nothinx), indonesia-eyd-writing-skill (fathurwithyou), dan humanizer-bahasa-indonesia (onesoira).
Pemeriksa otomatisnya `periksa_bahasa.py` di folder ini, yang ditulis ulang sendiri (kode skill asal tidak dijalankan).

## 1. Susunan

- Kerangka baku IMRaD: Pendahuluan, Metode, Hasil, Pembahasan, Kesimpulan dan Rekomendasi. Ringkasan pimpinan dan
  abstrak di depan.
- Kalimat pertama tiap subbab Hasil adalah jawabannya, dengan angka.
- Satu paragraf satu gagasan, kalimat topik di awal. Pembahasan ditulis sebagai paragraf, bukan butir berjudul tebal.
- Kesimpulan menjawab pertanyaan penelitian langsung, tanpa temuan baru. Saran harus bisa dikerjakan.

## 2. Istilah dan singkatan

- Tidak ada singkatan atau kode ciptaan sendiri (KJN, RBS, L1, M1, K2, opsi a). Tulis syaratnya atau namanya langsung.
- Singkatan lembaga yang lazim dijelaskan pada kemunculan pertama: Badan Penanggulangan Bencana Daerah (BPBD).
- Istilah asing: pakai bentuk yang dipakai pembaca. Bila padanan Indonesianya kaku atau jarang dipakai (delineasi,
  agregasi, operasionalisasi, peladen), pakai istilah Inggris yang lazim dan cetak miring: *threshold*, *database*,
  *trend*, *baseline*, *cut-off*, *hotspot*, *double counting*, *long tail*. Laporan untuk pejabat dan BPBD dibaca
  orang di luar bidang statistik, jadi jelaskan istilah itu sekali.
- Satu konsep satu istilah di seluruh naskah. *Database* di Bab 2 dan basis data di Bab 4 adalah kesalahan.

## 3. Kalimat efektif

| Masalah | Contoh salah | Perbaikan |
|---|---|---|
| Subjek hilang karena kata depan | Dari hasil uji menunjukkan... | Hasil uji menunjukkan... |
| Kalimat tanpa pelaku dan tanpa pasif | Untuk menghitung kejadian menggunakan data DIBI. | Kejadian dihitung dengan data DIBI. |
| Nominalisasi | melakukan analisis terhadap, mengalami penurunan sebesar | menganalisis, turun |
| Pleonasme | adalah merupakan, agar supaya, berbagai macam, para pencatat-pencatat | adalah, agar, berbagai, para pencatat |
| Perangkai salah | Karena..., maka...; Meskipun..., tetapi...; antara A dengan B; lebih besar dari | Karena..., ...; Meskipun..., ...; antara A dan B; lebih besar daripada |
| "Sehingga" atau "Sedangkan" di awal kalimat | Sehingga jumlahnya naik. | gabungkan ke kalimat sebelumnya, atau Akibatnya, |
| Kalke Inggris | di mana (penghubung), yang mana, memainkan peran, mengambil tempat | yang, tempat, saat; berperan; berlangsung |
| Kalimat terlalu panjang | lebih dari 35 kata | pecah menjadi dua |
| Rantai "yang" | tiga "yang" atau lebih dalam satu frasa | pecah kalimat |

Pasif di- wajar di bab Metode. Aktif untuk temuan: "Aturan baru menurunkan jumlah kejadian 9,3 persen."

## 4. Pola yang dibuang

- Pembuka kosong: Di era..., Seiring perkembangan..., Tidak dapat dipungkiri bahwa..., Perlu diketahui bahwa...
- Klaim digelembungkan tanpa angka: sangat krusial, inovatif, komprehensif, holistik, transformatif.
- Tiga sifat berderet dan kontras formulaik ("bukan sekadar X, melainkan Y") yang berulang.
- Penutup paragraf yang hanya mengulang isi paragraf.
- Em dash, titik tengah, tanda seru, emoji.

Yang TIDAK dibuang (pemilik 13 Nov 2026: "justru itu bahasa indo yang lazim"): frasa lazim surat dan laporan
dinas seperti dalam rangka, guna, dalam hal ini, hal ini, adapun, selain itu, oleh karena itu. Skill humanizer
dan naskah-id menandainya sebagai klise; untuk dokumen BNPB aturan itu tidak berlaku.

## 5. Kejujuran

- Angka, nama, dan rujukan hanya dari data dan sumber yang diperiksa. Klaim yang belum diperiksa ditandai
  [BELUM TERVERIFIKASI]; contoh rekaan ditandai [ILUSTRASI].
- Kekuatan klaim tidak boleh naik saat menyunting: "diduga" tidak menjadi "terbukti", "berkaitan" tidak menjadi
  "menyebabkan".
- Setelah menyunting, bandingkan angka di teks lama dan baru (`periksa_bahasa.py --banding lama.md baru.md`).
