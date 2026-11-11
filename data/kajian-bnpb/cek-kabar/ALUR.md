# ALUR: Cek Kabar Luar ujung ke ujung

## Alur data harian

1. Bot WA atau mesin pemilik menjalankan `python3 scripts/data/dalops_banjir.py --wa --unggah` (sudah terjadwal di `scripts/wa/otomatis.mjs`).
2. Sebelum menulis tiap `dalops/<jenis>.json`, `dalops_banjir.py` memanggil `dalops_kabar.periksa(rows, hari, jenis, bahan)`.
3. `bahan` dimuat sekali per jalan oleh `dalops_kabar.muat_bahan()`:
   - unduh berkas berita tayang yang sesuai jenis dan gabungkan ke arsip lokal `data/raw/dalops/berita_arsip/<id>.json` (dedup per `id`, simpan 60 hari [BAWAAN SEMENTARA]);
   - unduh berkas alam yang sesuai jenis (RISET 3).
   - Gagal unduh: bahan jenis itu kosong, label menjadi "Belum ada kabar luar" dengan keterangan "sumber tidak terjangkau", jalan tidak berhenti.
4. Tiap baris belum selesai mendapat kolom `luar` (DESAIN-TEKNIS). Baris yang sudah selesai tidak diperiksa dan kolom `luar` lamanya dihapus (jalur `--wa` membaca ulang berkas R2).
5. Label hari itu ditambahkan ke `data/raw/dalops/cek_arsip.jsonl` (satu baris per kejadian per hari; baris hari yang sama tidak ditulis dua kali).
6. Berkas diunggah ke R2 seperti sekarang.

## Alur staf

1. Buka `/bnpb/dalops`, pilih tab jenis.
2. Ringkasan di atas tabel: "12 kemungkinan selesai, 30 belum ada kabar luar, 8 masih berlangsung".
3. Bagian "Perlu ditanya" (per kab/kota) memuat kelompok yang angkanya bolong atau basi ditambah semua kelompok "Kemungkinan selesai", terurut menurut label (PRD F4, ALGORITMA 5).
4. Klik label pada satu baris: pop-up bukti terbuka (artikel dan angka alam).
5. Tombol WA mengirim teks sesuai label ke grup BPBD.
6. Bila BPBD menjawab selesai, laporan masuk lewat WA Koordalops atau logbook seperti biasa, dan baris itu tertutup oleh pipeline, bukan oleh label.

## Status label

```
belum selesai ──> ada bukti luar sesudah laporan terakhir ──────────────> Masih berlangsung
             ├──> ada berita "surut/padam/normal" ATAU (jenis bersinyal alam, senyap >= Q1 hari, alam normal) ──> Kemungkinan selesai
             └──> selain itu ───────────────────────────────────────────> Belum ada kabar luar
```

Bila bukti "masih" dan bukti "pulih" sama-sama ada, yang lebih baru menang; seri berarti "Masih berlangsung" (ragu = belum selesai, sama dengan aturan `selesai()`).
