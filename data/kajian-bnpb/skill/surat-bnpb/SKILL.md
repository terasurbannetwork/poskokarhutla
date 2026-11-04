---
name: surat-bnpb
description: Membuat surat dinas BNPB dalam Word (.docx) berkop BNPB, siap diberi nomor dan ditandatangani. Pakai setiap kali diminta membuat, menyusun, atau mengedit surat, surat dinas, surat permohonan audiensi, surat undangan, surat permohonan data, atau surat dari BNPB ke kementerian, lembaga, pemda, atau perguruan tinggi.
---

# Surat Dinas BNPB

Mesin: `scripts/buat_surat.py` membangun surat dari satu berkas JSON. Contoh nyata:
`contoh/audiensi-ugm.json` (surat audiensi ke UGM, 4 Nov 2026). Self-check:
`python3 scripts/buat_surat.py --cek`.

```bash
python3 scripts/buat_surat.py surat.json -o ~/Downloads
```

Lalu render dan periksa: `soffice --headless --convert-to pdf <berkas>.docx`, lihat
halamannya, pastikan **satu halaman**. Kirim .docx (pemilik menyunting di Word).

## Format (dari surat ber-TTD Pusdatinkom, 2 Nov 2026)

- A4, Times New Roman 12, kop BNPB (logo `assets/logo-bnpb.png` + teks Word, garis tebal).
- Blok kepala: `Nomor`, `Sifat`, `Lampiran`, `Perihal`; tanggal di kanan baris Nomor.
- Nomor: `B-       /BNPB/<UNIT>/<klasifikasi>/<bulan>/<tahun>`; nomor urut dan tanggal
  dikosongkan, diisi TU. Kerja sama: klasifikasi `KS.01.01`, unit Biro HOK `HOK`
  (kode unit belum dikonfirmasi TU).
- Isi rata kiri-kanan, indentasi baris pertama, jarak antarparagraf 6 pt.
- Tanda tangan di kanan: jabatan (boleh dua baris), empat baris kosong, nama + gelar lengkap.

## Aturan pemilik (4 Nov 2026)

1. **Tujuan ke jabatan, bukan nama orang**, dan ke unit yang mengurus: unit kerja sama
   atau pusat studinya, **bukan langsung ke Rektor**. Kalau kampus sendiri menunjuk
   tujuannya (UGM: Direktur Kemitraan dan Relasi Global), ikuti itu.
2. **Alamat lengkap** di baris ketiga tujuan, bukan "di Yogyakarta"/"di Jakarta".
   Alamat UGM resmi memang tanpa nama jalan: "Bulaksumur, Yogyakarta 55281".
3. Sapaan **Bapak/Ibu**, walau nama pejabatnya diketahui.
4. Pemilik: **Sdr. Alfatehan Septianta, Staf Ahli Kepala BNPB Bidang Riset, Inovasi dan
   Kerja Sama Perguruan Tinggi**. Bukan "Tenaga Ahli". Tanpa "beserta tim".
5. Penutup: "Demikian permohonan kami, atas perhatian dan kerja sama Bapak/Ibu kami
   ucapkan terima kasih."
6. Penanda tangan surat kerja sama perguruan tinggi: **Kepala Biro Hukum, Organisasi, dan
   Kerja Sama, Irma Dewi Rismayati, S.IP., M.A.** (pemilik memilih tetap beliau walau ada
   berita pelantikan ke KBRI Hanoi, 1 Okt 2026). Gelar selalu lengkap.
7. Nomor HP narahubung **tidak pernah masuk repo** (repo publik): isi di JSON lokal saat
   membuat surat, contoh di repo memakai `[nomor HP]`.
8. Riset nama jabatan dan alamat tujuan lewat web sebelum menulis; sebut sumbernya ke
   pemilik, dan tandai yang belum terkonfirmasi.
9. Perihal pendek dan menyebut kedua pihak, mis. "Permohonan Audiensi Program Kerja Sama
   BNPB dan UGM". Jangan pakai titik tengah, jangan tulis "Pantau Bencana".

## Tujuan kampus Yogyakarta yang sudah diriset (Nov 2026)

| Kampus | Yth. | Alamat |
| --- | --- | --- |
| UGM | Direktur Kemitraan dan Relasi Global | Gedung Pusat UGM, Bulaksumur, Yogyakarta 55281 |
| UII | Direktur Kemitraan/Kantor Urusan Internasional | Kampus Terpadu UII, Jalan Kaliurang km 14,5, Sleman, Yogyakarta 55584 |
| UMY | Direktur Kemitraan Global dan Employability | Jalan Brawijaya, Tamantirto, Kasihan, Bantul, Yogyakarta 55183 |
| UNY | Kepala Kantor Urusan Internasional dan Kemitraan | Jalan Colombo Nomor 1, Karangmalang, Yogyakarta 55281 |
| UPN "Veteran" Yogyakarta | Kepala Pusat Studi Manajemen Bencana LPPM | Jalan SWK 104 (Lingkar Utara), Condongcatur, Depok, Sleman 55283 |

## Kolom JSON

| Kolom | Wajib | Isi |
| --- | --- | --- |
| `berkas` | | nama .docx keluaran |
| `nomor` | ya | nomor surat dengan nomor urut kosong |
| `tanggal` | | teks di kanan baris Nomor, mis. `"        November 2026"` |
| `sifat`, `lampiran` | | bawaan `Biasa`, `-` |
| `perihal` | ya | baris panjang terlipat rapi di bawah teksnya |
| `tujuan` | ya | daftar baris: `Yth. <jabatan>`, instansi, alamat |
| `isi` | ya | daftar paragraf, terakhir kalimat penutup |
| `penanda_tangan` | ya | `{"jabatan": [baris...], "nama": "..."}` |
| `tembusan` | | daftar instansi; dicetak bernomor di bawah tanda tangan |

Surat berlampiran tabel (mis. daftar kebutuhan data) belum didukung mesin; tambahkan
halaman lampiran di Word atau perluas `bangun()` saat pertama kali dibutuhkan.
