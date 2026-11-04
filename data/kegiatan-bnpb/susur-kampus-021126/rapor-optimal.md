# Rapor pemeriksa: Rute Optimal Dua Belas Kampus Kunci 021126 (17 halaman)

Pemeriksa berkonteks bersih, 2 Nov 2026. Bahan: PDF, gambar h01 sampai h17, `optimal_model.py` (dijalankan ulang), `kunci_model.py`, `susur_model.py`, CSV `data/optimal`, `01-analisis-kampus.md`, `riset-kampus.json`, `riset-jarak.json`, `riset-biaya.json`.

| Dimensi | Nilai | Bukti |
|---|---|---|
| Judul | 3 | Judul berurutan membentuk alur, tetapi tiga judul tidak terbukti. h8 "Sepuluh hari adalah batas bawah yang wajar" terbantah: ada susunan 9 hari dengan aturan ritme yang sama (temuan 1). h3 "dibanding pola satu kampus per hari, hemat 4 hari" salah label: skenario 14 hari punya 4 hari dengan dua kampus (temuan 2). h6 "Tiap kampus ... membawa keahlian yang dicari BNPB, ... sampai sains data" berlebihan, karena tabelnya sendiri menulis Binus "perlu dijajaki" dan UB "perlu dicek" (temuan 4). h5 "9 kota" tetapi petanya menampilkan 6 wilayah. Judul h9, h10, h12, dan h13 terbukti oleh isinya. |
| Grafik | 3 | Waterfall h12 benar dan terbaca (24,2 terbesar, 18,0 kedua). Gantt h10 cocok dengan `lokasi.csv`. Legenda peta h5 salah: lingkaran acuan berlabel 2, 1, 1 (dua lingkaran beda ukuran sama-sama "1", nilai 3 tidak terwakili). Waterfall h8 untuk 7+1+2 tidak menambah wawasan, dan premisnya batal karena ada susunan 9 hari. |
| Tata letak | 4 | Rapi dan konsisten: panel terbuka, footer sumber, penanda bagian. Kekurangan: h16 menaruh "Hari 10,00" dan "Malam menginap 8,00" di tabel berjudul juta rupiah, dan kolom komponennya lebar kosong. Ikon toga di baris "Tetapkan tim" h13 tidak cocok. |
| Sumber dan angka | 3 | Hitungan cocok dengan model: pagu 81,41; riil 75,43; per kampus 6,78; selisih 14 hari 18,88 jadi 18,9; uang harian 11,79; penginapan 24,17; sewa 11,28; tiket 7,73; 8 malam; slot K 12 dari 30. Masukannya lemah: KA Bandung ke Yogyakarta memakai tarif Lodaya, padahal itinerary naik Argo Wilis. Tarif KA Semarang ke Surabaya masih asumsi, dan durasinya "tidak dicari" di riset-jarak. Tabel tarif h17 tidak memuat hotel Jateng golongan IV (1.286), hotel golongan III dua staf (730 sampai 845), dan uang harian dalam kota DKI (210), jadi 81,4 tidak bisa dibangun ulang dari lampiran. Peringkat QS diambil dari media sekunder, dan riset sendiri meminta cek ulang ke topuniversities.com. |
| Alur | 3 | Urutan alasan kampus, rute, biaya, lalu keputusan sudah benar. Tetapi klaim inti "optimal" tidak terbukti (temuan 1). Pembandingnya orang-orangan sawah (temuan 2). Aturan ritme h10 ("Kereta jauh berangkat pagi pada hari tanpa audiensi") juga dilanggar jadwal h9 sendiri pada 23 dan 25 Nov (temuan 3). |
| Rasa mahal | 3 | Tampilan setara deck pembaruan yang rapi (h3, h9, h12, h13). Isinya perlu suntingan sebelum dipaparkan ke Kepala BNPB: judul h3 dan h8 bisa dipatahkan dengan satu pertanyaan ("kalau mulai Rabu?"), dan legenda peta h5 keliru. |

## Temuan yang perlu dibetulkan

1. **Rute 10 hari bukan yang terpendek dan bukan yang termurah di bawah aturan ritmenya sendiri (h3, h8, h9, h12, h13).** Mulai Rabu 18 Nov menaruh hari kereta Bandung ke Yogyakarta tepat di Sabtu (hari tanpa kampus), dan Minggu tetap untuk istirahat. Susunannya:
   - Rab 18: IPB dan UI.
   - Kam 19: Binus, Whoosh, Telkom U.
   - Jum 20: ITB dan Unpad.
   - Sab 21: KA Argo Wilis 07.45 ke Yogyakarta.
   - Min 22: istirahat dan Merapi.
   - Sen 23: UGM, UMY, lalu mobil ke Semarang.
   - Sel 24: Undip, lalu KA siang ke Surabaya.
   - Rab 25: ITS dan Unair.
   - Kam 26: UB, lalu pesawat pulang.

   Hasilnya 9 hari dan 7 malam. Dihitung dengan `hitung()` dari `kunci_model` dan tarif yang sama, pagunya **Rp 75,50 juta** (riil 70,24), **lebih hemat Rp 5,9 juta dan satu hari**. Aturannya tetap terjaga: kampus di pagi hari, paling banyak dua per hari, akhir pekan tanpa audiensi. Pindah kota sore setelah kampus memang sudah dipakai deck sendiri pada 23 Nov (Undip lalu KA ke Surabaya). Akibatnya, butir h8 "Mulai hari lain tidak memendekkan rute, karena akhir pekan tetap terpotong di tengah" keliru. Pilih salah satu: pakai susunan 9 hari, atau pertahankan 10 hari dengan alasan yang jujur (misalnya pemilik ingin berangkat Senin, atau ingin Sabtu penuh untuk istirahat), lalu ganti judul h8. Skrip uji ada di `C:\Users\USER\AppData\Local\Temp\claude\D--Project-Work-BNPB-poskokarhutla\bf6de88c-509c-4197-81b0-ae877176e51d\scratchpad\cek\alt9.py`.
2. **Pembanding "satu kampus per hari" salah label (h3 judul, h8 butir 1, h12 butir 2, h16 kolom).** Skenario 14 hari (`S14` di `kunci_model.py`) bukan satu kampus per hari. Ia punya 4 hari dengan dua kampus (IPB dan Binus, Unpad dan Telkom U, UGM dan UMY, ITS dan Unair), 8 hari kampus, dan 6 hari tanpa kampus. Selisih Rp 18,9 juta datang dari hari istirahat dan susur kota yang lebih banyak, bukan dari "dua kampus searah digabung" seperti tertulis di h12. Sebut skenario itu "pola lengkap 14 hari", atau hitung pola satu kampus per hari yang sebenarnya (12 hari kampus, sekitar 16 hari kalender).
3. **Jadwal melanggar aturan ritme yang ditulisnya sendiri (h9 dan h10).**
   - Kalimat h10 berbunyi "Kereta jauh berangkat pagi pada hari tanpa audiensi". Padahal pada 23 Nov KA Semarang ke Surabaya (perkiraan 3,5 sampai 4,5 jam, belum diriset, kereta dan jamnya tidak disebut) berangkat siang setelah Undip.
   - Pada 25 Nov tim menempuh tol Surabaya ke Malang pulang-pergi (2 kali 1,5 sampai 2 jam), lalu terbang 1,6 jam ditambah 2 sampai 3 jam urusan bandara, semuanya di hari UB.
   - Rumuskan ulang aturannya dengan jujur (misalnya "perjalanan lebih dari 5 jam di hari tanpa kampus"). Pertimbangkan juga terbang langsung dari Malang ke Jakarta agar tidak kembali ke Surabaya. Tarif SBM Jakarta ke Malang ekonomi PP Rp 2,695 juta, nyaris sama dengan rute Surabaya; ketersediaan penerbangannya perlu dicek.
4. **Alasan kampus di h3, h5, dan h6 lebih kuat daripada buktinya.**
   - "Ada pusat studi atau alat teruji" (h5) tidak berlaku untuk semua dua belas kampus. Unit kebencanaan Binus "tidak dicari" di riset-kampus; pusat studi UB "belum teridentifikasi"; Undip "tidak ditemukan pusat studi bencana resmi", dan buktinya hanya blog FPIK 2021; Unair hanya punya program magister, bukan pusat studi.
   - Unpad "misi gempa Sumedang 2024" tidak sesuai riset, yang menyebut "edukasi mitigasi gempa pascagempa Sumedang 2024". Misi kemanusiaannya adalah Pulau Palue, NTT, 2026.
   - Saran judul h6: "Sembilan kampus membawa unit atau alat teruji; Binus, UB, dan Undip masih dijajaki".
   - Alasan lain cocok dengan bukti: UI (Peraturan Rektor 15/2024, RSUI), UGM (PSBA 1995, GAMA-EWS 30 provinsi), ITB (IGW Sumatra 2025, Geolini), IPB (RFMRC-SEA 2017, pusat latih 2024), ITS (InaTEWS, kapal rumah sakit), Telkom U (PATRIOT-Net, VR SIGAP), UMY (PSLB, MDMC).
5. **Peta h5.** Legenda lingkaran berlabel 2, 1, 1 harus diganti menjadi 3, 2, 1, dengan ukuran sama seperti gelembung peta. Judul "9 kota" harus selaras dengan peta 6 wilayah: tulis "6 wilayah", atau beri label 9 kota (Bogor, Depok, Jakarta, Bandung, Jatinangor, Yogyakarta, Semarang, Surabaya, Malang). Ujung timur rute adalah Surabaya, bukan Malang. Frasa "sepanjang jalur kereta" juga tidak tepat, karena dua ruas ditempuh dengan mobil dan satu dengan pesawat.
6. **Tarif dan lampiran (h12, h17).**
   - Samakan kereta dan tarif: Argo Wilis dengan tarif Argo Wilis, atau ganti itinerary ke Lodaya.
   - Sebut nama dan jam KA Semarang ke Surabaya, lalu ganti asumsi Rp 400 ribu dengan tarif nyata.
   - Lengkapi h17 dengan hotel Jateng golongan IV, hotel golongan III per provinsi, dan uang harian dalam kota DKI, supaya 81,4 bisa dibangun ulang.
   - Beri catatan bahwa peringkat QS dikutip dari media dan perlu dicek di topuniversities.com. Satu sumber menukar peringkat ITB dan Unair.
7. **h16:** baris "Hari" dan "Malam menginap" ditulis dengan dua desimal di tabel juta rupiah. Pindahkan ke tabel sendiri atau tulis sebagai bilangan bulat dengan satuannya.
8. **h13: risiko jadwal tidak ditangani.** Surat dikirim 6 Nov untuk audiensi mulai 16 Nov, jadi rektor hanya punya 10 hari kalender. Rute berantai, sehingga satu rektor yang menggeser jadwal ikut menggeser kampus sesudahnya. Tambahkan tenggat konfirmasi (misalnya 11 Nov) dan slot cadangan. Susunan 9 hari di temuan 1 sekaligus memberi tenggang 12 hari. Ganti juga ikon toga pada "Tetapkan tim".
9. **h10:** "kunjungan kampus hanya 12 dari 30 slot" terbaca sebagai pemborosan dan melemahkan klaim optimal. Ubah sudutnya, misalnya "12 slot kampus, 18 slot untuk perjalanan, persiapan, dan istirahat". Penanda "hari kunjungan utama" Jabodetabek ada di hari 2, padahal dua kampus dikunjungi di hari 1.
10. **Bahasa:** "Itinerary" di h9 diganti "Jadwal perjalanan". "Tier Satu" di subjudul h1 lebih baik "papan atas".

## Yang sudah benar (diperiksa ulang)

- Tanggal: 16 Nov 2026 Senin, 25 Nov Rabu, 6 Nov Jumat, 9 Nov Senin, 13 Nov Jumat, 2 Des Rabu. November 2026 tanpa libur nasional.
- Argo Wilis Bandung 07.45 tiba Yogyakarta 13.34 sesuai riset-jarak (listing agregator; jadwal Daop 5 berubah 1 Mei 2026, perlu dicek di Access by KAI).
- Whoosh, IPB ke UI, ITB ke Unpad, dan Surabaya ke Malang (1,5 sampai 2 jam) masuk akal terhadap riset.
- Tarif SBM yang dipakai (uang harian, hotel, sewa, transport bandara, pesawat PP dibagi dua) cocok dengan riset-biaya PMK 32/2025.
- Tol Yogyakarta ke Semarang 134,5 = 42,5 + 92.
- Model lolos assert: 12 kampus unik dan paling banyak dua kampus per hari.
