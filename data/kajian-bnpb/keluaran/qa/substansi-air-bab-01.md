# QA lapis (b) penyunting substansi: kajian air Bab 1

Berkas: `naskah/air/bab-01.md`. Pembanding: `naskah/air/bukti/bab-01.md`, `bab-01.angka.json`, `data/angka.json`,
`naskah/air/bab-10.md` (register R-A), KERANGKA §2 dan §4 Bab 1, NASKAH-SPEK §11.1, Buku Pegangan L16 dan L60.
Diperiksa 24 Oktober 2026.

## Pemeriksaan mekanis

- 54 token angka unik (kunci dan opsi) dibaca lewat `bangun/kontrak/naskah.py` dengan registri gabungan `data/angka.json` +
  `naskah/air/bukti/bab-*.angka.json`: semua kunci ada, nilai tampil cocok dengan berkas bukti (T1.7 sampai T4.8), label
  keyakinan sah. `baca()` atas bab utuh lulus.
- 43 dari 54 kunci baru ada di `bab-01.angka.json`, belum di `data/angka.json`. Bab gagal dibangun sampai registri digabung.
- `qa/slop.py --final`: LOLOS, skor 0. Em dash dan titik tengah: nol.

## Suntingan

| No | Letak | Masalah | Tindakan |
| --- | --- | --- | --- |
| 1 | Ringkasan butir 1; Latar Belakang paragraf hari ke-0 | Klaim "awal dan puncak musim hujan berada di dalam 100 hari pertama" untuk semua tanggal November melebihi bukti: hari ke-0 1 November memberi hari ke-100 pada 9 Februari, hari ke-0 30 November pada 10 Maret (T1.14), dan Bab 10 menetapkan 20 November sebagai batas bulan puncak | Ditulis: awal musim hujan Desember masuk 100 hari pertama; hanya hari ke-0 sampai 20 November yang menempatkan hari ke-100 di bulan puncak Februari; akhir November jatuh sesudah puncak. Butir ringkasan dipecah (S-30) |
| 2 | Ringkasan butir 2 | Angka kekeringan 2026 tanpa tanda sementara | Ditambah "(sementara)" (T1.8) |
| 3 | Ringkasan, Rekomendasi | Kode ditulis "R-A01" teks polos, padahal NASKAH-SPEK §11.1 meminta rujukan `@rek`; kalimat meta "Kode R-A adalah kode sementara ..."; horizon "14 hari pertama" tidak cocok dengan `waktu: 100-hari` di register; unit R-A03 dan R-A05 berbeda dari Bab 10 | Diganti `@rek:r-a01/03/05/12`; kalimat meta dibuang; horizon "100 hari"; unit diselaraskan dengan register Bab 10 (R-A03 dengan Direktorat PD Wilayah I sampai III; R-A05 dengan Direktorat Pengembangan Strategi PB) |
| 4 | Kotak temuan Pasal 35, Pembuka | "BNPB dan BPBD menyambungkan jangkar ayat (5) ..." terbaca sebagai fakta, padahal bukti I2.5 menyatakan pengait itu belum terhubung ke rencana kontinjensi BPBD dan sistem peringatan dini BNPB | Ditulis sebagai dua pengait yang tersedia dan belum terhubung menurut teks yang dibaca |
| 5 | Paragraf BOP Pantura | "Kepala BNPB ditulis 'dapat dilibatkan'" bernada meta | Ditulis langsung: dapat dilibatkan tetapi tidak berhak dilibatkan (T2.13, I2.4) |
| 6 | Status Dokumen, paragraf akhir | "(R-A05)" teks polos | `@rek:r-a05` |
| 7 | Sistematika | "Bab 9 menetapkan pemilik bermandat" bertentangan dengan status kajian rekomendasi yang tidak menetapkan apa pun (I4.4) | "mengusulkan" |

## Diperiksa dan tidak diubah

- Lantai skenario: 270 meninggal dan hilang (2008/2009) tertulis sebagai lantai; 2025/2026 (216 meninggal, 237 meninggal dan
  hilang) di sampingnya dengan metrik "terbanyak" yang tegas (T1.10, T1.12, KERANGKA §2 butir 9). Tidak ada skenario di bawah
  lantai.
- Angka model: porsi air permukaan 6,3% berlabel estimasi model, dengan catatan tidak ada rentang galat (Radhika 2017) dan
  pasangan tercatat DIBI kekeringan 2026. Neraca air di tabel resolusi berlabel estimasi-model.
- Angka bertentangan berdampingan: indeks ENSO BMKG +2,63 dan ONI 2,16 dengan nama indeks masing-masing; dua indikator
  peringatan dini Renas dan Renstra dengan penyebut berbeda, tidak dibaca sebagai kekurangan.
- Kewenangan: Pasal 35 ayat (2), (5), (6) dikutip; tautan ayat (5) ke UU 24/2007 dan penempatan BNPB sebagai LPNK di PP 30/2024
  berlabel tafsiran; pemetaan "Menteri" ke Kementerian PU dipisah dari bunyi pasal; kekeringan "tidak tercantum", bukan
  "dikecualikan"; BNPB sudah kontributor Renas 2.4.4.a (bukan usul menjadi kontributor). Tidak ada klaim BNPB sebagai regulator.
- "Terbukti": tidak ada klaim program terbukti di bab ini.
- Arah pengaruh El Niño: naskah menulis catatan DIBI tidak cukup untuk menyimpulkan arah (T1.11), musim 2023/24 dan 2024/25
  dikeluarkan sebagai pembanding dengan alasan lubang data 2024.
- Pertanyaan kunci KERANGKA §4 Bab 1 terjawab: PK1 di 1.1, PK2 di 1.2, PK3 di 1.4, PK4 di 1.5 dan 1.6. Komponen ada: Kotak 1.1
  (direktif `temuan`), Gambar 1.1 garis waktu musim, Tabel 1.1 keterkaitan dokumen (`tbl:dokumen`), Tabel 1.2 resolusi data
  (`tbl:resolusi-data`). Urutan tabel di naskah: resolusi data muncul lebih dulu dari keterkaitan dokumen, sehingga penomoran
  otomatis membalik nomor KERANGKA (1.1 resolusi, 1.2 dokumen); isi tetap lengkap.

## Sisa untuk orkestrator (di luar berkas ini)

1. Gabungkan `bab-01.angka.json` dan `bab-01.pustaka.json` ke registri utama; entri penulis tanpa `family` di pustaka gabungan
   masih membuat `Konteks._akhiran_tahun()` galat (sama dengan temuan Bab 10).
2. Angka sekunder Sumatra 2025 (BNPB per 12 Januari 2026 lewat media: 1.189 meninggal, 141 hilang) tidak dimuat karena sekunder
   dan berjendela lain; bila pemilik ingin berdampingan, perlu entri pustaka primer BNPB.
3. KERANGKA §4 Bab 1 masih menyebut BRS BPS No. 7/01/Th. XXIV; naskah memakai tabel SP2020 di sensus.bps.go.id karena BRS belum
   dibuka. KERANGKA §2 butir 2 dan KD-5 (a) tentang "usul menjadi kontributor 2.4.4.a" tetap bertentangan dengan Renas hlm. 86.
4. ID R-A masih sementara sampai register bersama dengan Kajian 2 dibangun.
