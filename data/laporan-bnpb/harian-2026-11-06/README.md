# Laporan Kejadian Bencana Harian 061126

- `jalan.py` = salinan 051126, tanggal maju sehari. Website terbit s.d. 5 Nov, jadi angka karhutla berlabel 5 Nov.
- Sumber kejadian: WA Koordalops 5 Nov 07.00 s.d. 6 Nov 07.00 WIB (23 laporan, 16 menonjol; `wa-koordalops.txt`).
  Kejadian baru (4): banjir Kab. Pidie Jaya dan Kab. Aceh Selatan (keduanya surut), angin kencang Kab. Kediri (81 KK, 1 RB, 1 RS, 78 RR),
  karhutla Kab. Banggai Kepulauan (± 44,25 ha WA; website 917 ha kumulatif, sisa 15 ha). Ditambah 3 provinsi dari tabel website
  (Kalimantan Selatan, Sulawesi Tenggara, Maluku): 26 laporan, 19 kejadian menonjol, 7 perlu perhatian. Riau dan Kalimantan Barat selesai
  (belum padam website 0 ha, firespot 0), walau WA masih menulis sisa 0,5 ha dan 3 ha.
- BMKG PM2.5 6 Nov 06.00 WIB: tertinggi Kemayoran 80,5 (Tidak sehat). PVMBG 6 Nov 06.00 WIB: 0 Awas, 3 Siaga, 24 Waspada, 42 Normal.
- Parser `wa_harian.py` dibetulkan untuk teks hari ini:
  - WA BMKG tanpa kategori PM2.5 ("* KEMAYORAN 80.5") -> kategori dari ambang ISPU PM2.5 (cocok dengan arsip: 55,3 Sedang, 96,6 Tidak sehat).
  - "Angin Kencang: NIL." tidak lagi terbaca sebagai provinsi.
  - "Api belum sepenuhnya berhasil dipadamkan" (Banggai Kepulauan) kini status belum, bukan selesai.
  - Arsip WA BMKG 27 Okt s.d. 5 Nov tetap terurai sama; uji `python wa_harian.py` lolos.
- Revisi siang (pemilik: "Memantau udara: 3 lokasi Tidak Sehat ke atas" tidak efektif dan nanggung): `harian.py tindak_ubah` memisah
  stasiun PM2.5 Tidak Sehat ke atas jadi asap karhutla (provinsi yang punya karhutla di laporan) dan polusi udara (selain itu), satu butir
  per kelompok dengan provinsi, kategori, dan nilai tertinggi: "Memantau asap karhutla Kalteng: Tidak Sehat (PM2.5 64,2)" dan
  "Memantau polusi udara Jakarta: Tidak Sehat (PM2.5 80,5)".
- Revisi siang 2 (pemilik, menegaskan jawaban 5 Nov soal Desa Bintangor Mukti: "untuk provinsi yg udah ada di slide pengkinian, kalau ada
  kejadian baru gausah ditampilin"): karhutla baru Kab. Banggai Kepulauan dilebur ke baris Sulawesi Tengah (`jalan.py`, angka provinsi
  website sudah memuatnya; 18 kejadian menonjol, 11 karhutla). `harian.py baru()` melewati karhutla baru di provinsi yang sudah berbaris
  provinsi; panel Karhutla slide 3 tetap tampil dengan pesan "Tidak ada karhutla di provinsi baru" dan satu baris per kejadian yang
  ikut baris provinsinya (`kh_kosong`).
- Rev 2 (pemilik: "slide 3 dihapus, terus banjir sama angin kencang yang ada di slide 3 gabung ke slide 4"): `REV=2` membangun
  `Laporan Kejadian Bencana Harian 061126 (rev2).pptx/.pdf`, 6 slide: tanpa Kejadian Baru, judul "Pengkinian kejadian: 11 karhutla,
  3 kekeringan, dan 4 bencana lainnya", banjir Pidie Jaya dan Aceh Selatan serta angin kencang Kediri masuk panel Bencana lainnya,
  bagian jadi 3 (Ringkasan, Pengkinian, Status siaga). Tanpa `REV`, versi 7 slide tetap dibangun seperti biasa.
  Jalankan: `$env:REV=2; ...jalan.py` (log `jalan-rev2.log`).
- Versi 3 (pemilik, "perombakan banyak", acuan versi biasa): `REV=3` membangun `... 061126 (rev3).pptx/.pdf`, 2 slide, tanpa sampul,
  penutup, lampiran, Kejadian Baru, dan Pengkinian.
  - Slide 1 = ringkasan (`harian.Deck.V3`): kotak dan tanda seru Perlu perhatian dihapus (kartu Kejadian bencana selebar slide),
    panel Status penanganan diganti INFORMASI BENCANA (`info_bencana`): bencana, provinsi, kab/kota, dampak KK, strip bila tidak ada.
  - Slide 2 = status siaga gunung api apa adanya.
  - Logo KRIS di kiri logo BNPB pada tiap slide (`KRIS_ISI`, `judul_xml`); judul 20 pt supaya judul gunung api tetap satu baris.
- Versi 4 (6 Nov sore, Bang Ghozi: "coba cari data real-nya", "ok mainkan aja versi kita coba"; pemilik: "turutin kemauan bang ghozi"):
  `jalan_rev4.py` = tata letak versi 4 (2 slide, tanpa karhutla, panel Informasi bencana, logo KRIS + BNPB; dijajaki dulu dengan teks
  Menko PMK 4-5 Nov di harian-2026-11-05) dengan data real WA Koordalops 5-6 Nov, BMKG dan PVMBG 6 Nov; folder kerja `kerja-061126-rev4`.
  14 laporan (26 dikurangi 12 karhutla), 7 kejadian menonjol di 4 provinsi (3 kekeringan, 4 bencana lainnya).
  - Peta: tiap jenis punya lingkaran atau lencana sendiri (`peta_blok`); dulu Aceh 3 banjir + 1 longsor tergambar "4" biru.
  - Kolom Kejadian baru: yang masih ditangani "Mengkaji cepat dampak" (Kediri), yang sudah surut "Memantau pascabencana" (Pidie Jaya,
    Aceh Selatan); sebelumnya terpotong "…" dan ditolak gerbang D-17.
- Unggah Pantau Banjir (`dalops_banjir.py --unggah`) gagal di mesin ini (npx/wrangler tidak ada); laporan tidak terpengaruh.
- Jalankan: `$env:PYTHONUTF8=1; $env:DECK_BNPB="$HOME\.claude\skills\ppt-konsultan\bnpb"; C:\Python314\python data\laporan-bnpb\harian-2026-11-06\jalan.py`
