# Sisa pekerjaan semua paket (26 Nov 2026, sore)

Disusun dari `PRIORITAS.md` dan semua `data/kajian-bnpb/*/TIKET.md`, lalu dicocokkan dengan kode dan riwayat commit.
Tabel tiket yang basi tidak dihitung: SIPPA `/pipa` (98 baris "belum", padahal layar dan uji sudah dibangun 27-28 Okt),
Silang Sumber SS-10 dan SS-50 (selesai di 340660433), Peta Situs PS-09 dan PS-11 (selesai 25 Nov).

Tanda: **[bisa]** dikerjakan Claude sekarang, **[tunggu]** tertahan pada pemilik, data, atau tiket lain.

## A. Sedang dikerjakan sekarang

- Ruang Unit RU-047, RU-052, RU-059, RU-060, RU-064, RU-065 (agent `ruang-bnpb`).
- Prakiraan lawan Kejadian PK-4 rute `/api/dalops/lapor` dan PK-7 bagian Worker (agent `warga-api`).

## B. Bisa dikerjakan Claude (urut PRIORITAS)

### P1
- **Ruang Unit (kedeputian)**, sekitar 45 tiket: RU-034 layar ketuk dan `terima.py`, RU-045 dan RU-047 Laphar, RU-058 rusak sedang dan ringan DIBI,
  RU-066 sampai RU-093 gelombang 10 dan seterusnya, MT-4, OJL-1. Penanda "risiko dari n kecamatan" di PLP-2 (saran pemeriksa).
- **Prakiraan lawan Kejadian**: PK-1 `pasangkan()`, PK-2 Dalops baca `prediksi.json`, PK-3 prakiraan cuaca, gelombang, udara, karhutla,
  PK-5 seksi Prakiraan dan kejadian, PK-6 lapis peta, PK-7 bagian `scripts/prediksi`.
- **Laporan Berkala**: perbarui baris TIKET yang basi; LB-10 `berkala.yml` (jadwal rakit tiap periode).
- **Lapor Bencana**: LA-17, LA-18, LA-21, LA-56, LA-57.
- **Silang Sumber**: SS-02 pembaca arsip, SS-20 beda sumber, SS-52 kalender di laporan.
- **Tangga**: TG-9, TG-10, TG-11. **Prakiraan Besok**: BS-9.
- Satu-satu: Desa Waspada DW-06, Docs DC-10, InaRISK IR-08, IR-09, Dashboard DB-01, DB-02, Kemampuan inti KI-74, KI-77,
  Misi udara MU-06, MU-11, Paritas PB-03 (uji golden), PB-21, Semai banjir SB-05, SB-11, Lifeline LF-05, Lapangan OS-4,
  Bot laporan BL-20, Pembanding PKH-01, Insiden Kaya IK-07, IK-08, IK-10, IK-12.

### P2 riset satelit (boleh gagal, tetap hipotesis)
- **Tsunami genangan**: TS-17 `genangan.js`, TS-18 pasang ke tab Simulasi, TS-19 animasi, TS-20 bab metode, TS-22 gerbang, TS-23 prospektif,
  TS-24 hitung per gempa, TS-25 pantai berikutnya, TS-26 paparan, TS-27 non-gempa, TS-28 bagikan, TS-29 tutup. Uji balik TS-15, TS-16 bila belum.
- **Kerusakan satelit**: KS-03 uji balik banjir, KS-04 anggaran R2, KS-05 migrasi, KS-07 rute, KS-08 kartu Jitupasna, KS-09 karhutla.
- **Bekas longsor**: LS-01 sampai LS-08 (belum ada kode).
- **Lereng bangunan**: LT-01 sampai LT-12 (DEMNAS: Claude mengunduh, sandi portal diketik pemilik).
- **Penurunan tanah**: PT-02 tinjauan keamanan LiCSBAS, PT-04 Jakarta, PT-05 Semarang dan Pekalongan, PT-06, PT-09 lapis dan kartu, PT-10 DeltaDTM, PT-12.
- **InSAR gambut**: IG-04, IG-05, IG-07.

### P3
- **Semai awan** SA-22 sampai SA-35 (inti SA-01 sampai SA-21 sudah ada di kode; dicek ulang per tiket sebelum dikerjakan).
- **Alun-alun instansi** AT-01 sampai AT-12 (belum ada kode).
- **Pembiayaan risiko** PR-02 sampai PR-10 (belum ada kode; PR-07 hanya bila PR-06 lulus).
- **Pemetaan relawan** HR-02, HR-08, HR-09, HR-13.

## C. Tertahan pada pemilik

### Migrasi D1 produksi
0143 (3W), 0147 (kaji ulang), 0148, 0149, 0150, 0153 (tindakan operasi), 0163, 0166 dan 0167 (profil PIC), 0168, 0170 (lapor ke kejadian),
0171 dan 0172 (segel), 0178 dan 0179 (Laporan Berkala), 0185 (foto orang dicari), 0186 (foto orang dicari ke-2 sampai ke-10),
0187 (Ruang Unit MB-7), GS-09 (genangan). Migrasi tiket KS-05, PR-*, HR-12, RU-057 menyusul.

### Kunci dan secret
`BPS_KEY` (IKK, rapor Ruang Unit), `PROFIL_KUNCI`, kunci VAPID (PWA peringatan), token Earthdata (GSMaP, kerusakan satelit), rahasia renlap SIPPA.

### Izin dan isian
- Izin tertulis data dan CCTV pihak lain (EWS EW-06, EW-07, EW-08, EW-10).
- Lembar isian HR-05 pemetaan relawan diisi pemilik sendiri, lalu `python3 -I scripts/pemetaan/uji_jujur.py --vonis`.
- Judul Lampiran 9 LAKIP (37 judul Satu Data).
- Saklar `LAPOR_USUL` dan tinjauan LK-13.

### Keputusan
- Rantai Kejadian: 12 pertanyaan tanpa bawaan (RT-00 sampai RT-14 tertahan).
- LogPal: 14 pertanyaan tanpa bawaan (LG-06 sampai LG-22).
- Cek kabar Q6, InaRISK Q7, status `belum_mulai` Jam Aturan, ambang biaya U13, Paritas Q23 ambang aktivasi Pusdalops.
- Ruang Unit: kolom `dummy` di tabel 0187 dipertahankan atau dihapus; BAST hibah dan angkatan diklat boleh dihapus atau tidak.
- Kerusakan satelit Q2 (gempa), Penurunan tanah Q1 (aturan izin LiCSBAS), Pembiayaan Q1 dan Q3 (saldo DSP dan PFB resmi, data Jitupasna historis).
- Lifeline LF-09 dan Kaji ulang KU-10: pilih jalur data CI.

### Menunggu waktu atau data
- SS-03 arsip 30 hari, KU-12 sepuluh kejadian disahkan, SA-10 n >= 30, SS-30 dan RU-036 data stok gudang (LogPal).
- RU-046 gateway WA mati sejak 4 Nov.
