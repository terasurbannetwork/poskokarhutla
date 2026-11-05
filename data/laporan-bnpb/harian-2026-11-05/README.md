# Laporan Kejadian Bencana Harian 051126

- `jalan.py` = salinan 041126, tanggal maju sehari. Website sudah terbit s.d. 4 Nov, jadi angka karhutla berlabel 4 Nov.
- Sumber kejadian: WA Koordalops 4 Nov 07.00 s.d. 5 Nov 07.00 WIB (23 laporan, 20 menonjol; `wa-koordalops.txt`).
  Kejadian baru (2): tanah longsor Kab. Gayo Lues (1 MD, jalan lintas Blangkejeren lumpuh, Jembatan Agusen Toa ambruk) dan
  karhutla Kab. Morowali Utara (± 5,5 ha). Ditambah 3 provinsi dari tabel website (Papua Selatan, Maluku, Maluku Utara):
  26 laporan, 23 kejadian menonjol, 7 perlu perhatian. Kalimantan Barat selesai (belum padam website 0 ha, firespot 0).
- BMKG PM2.5 5 Nov 06.00 WIB: tertinggi Pangkalan Bun 110,8 (Tidak sehat). PVMBG 5 Nov 06.00 WIB: 0 Awas, 3 Siaga, 24 Waspada, 42 Normal.
- Generator dibetulkan (`harian.py`, panel Kekeringan slide pengkinian): 6 kekeringan + total membuat baris rendah, pil kalender
  sebaris sesudah nama panjang (Pemalang, Temanggung, Grobogan) menimpa angka KK. Pil kini turun ke bawah nama bila ujungnya
  melewati kolom TERDAMPAK.
- PDF gagal di run pertama karena `pdf.py` di `main` masih memakai `file://C:\...` untuk profil LibreOffice; perbaikan URI
  (`Path.as_uri()`) sudah ada di berkas kerja, konversi diulang.
- Jalankan: `$env:PYTHONUTF8=1; $env:DECK_BNPB="$HOME\.claude\skills\ppt-konsultan\bnpb"; C:\Python314\python data\laporan-bnpb\harian-2026-11-05\jalan.py`
- Revisi 5 Nov siang:
  - Atasan ("ini bukannya pakai label?"): kolom TERDAMPAK panel Kekeringan jadi label berbingkai berikon orang (KK + jiwa),
    sejajar pil BANTUAN AIR.
  - Atasan ("samain antara banjir sudah surut dan air sudah surut"): di Bencana lainnya versi ringkas, bila satu kejadian
    berketerangan + angka harus dua baris (Kota Subulussalam), semua kejadian sejenis ikut dua baris (Pidie Jaya).
  - Atasan ("oke buat lampiran aja", soal selesai 5 jadi 3): lampiran halaman 7 sesudah penutup, `harian.Deck.lampiran_selesai`.
    Membandingkan `data.json` kemarin: selesai kemarin, tidak dilaporkan lagi, kembali ditangani, baru selesai, selesai hari laporan.
    `jalan.py` mencari `harian-<kemarin>/kerja-<ddmmyy>/data.json`; bila tidak ada, lampiran dilewati.
  - Atasan sore: label banjir selesai yang BPBD-nya menulis surut diseragamkan jadi "Banjir sudah surut" (`keterangan()`);
    nama + pil tanggal kekeringan satu blok di tengah baris; lampiran berjudul "Lampiran: Perbandingan Hari Sebelumnya" dan
    tidak masuk indikator bagian.
  - Atasan ("jangan perbandingan, daftar kejadian yang sudah selesai aja"; "bulan yang sedang berjalan, nambah terus"): lampiran
    jadi "Lampiran: Daftar Kejadian Selesai November 2026" (`harian.Deck.lampiran_selesai_bulan`, menggantikan `lampiran_selesai`).
    Riwayat dari `data.json` tiap laporan harian 1 bulan ini s.d. hari sebelum laporan + hari laporan; yang sudah selesai di hari
    terakhir bulan lalu tidak dihitung; yang kembali ditangani keluar. 1-5 Nov: 12 kejadian (6 karhutla, 6 banjir), dua kolom
    dibagi rata, slide tambahan (1/2, 2/2) bila lebih dari dua kali baris per kolom.
