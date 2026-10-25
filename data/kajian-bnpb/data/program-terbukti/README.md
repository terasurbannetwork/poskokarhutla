# Paket `program-terbukti`: kompendium program yang terbukti, organisasi BNPB, dan tabel silang perencanaan

Bahan untuk prinsip 9 dan 11 KERANGKA (program hanya dari praktik terbukti; pemetaan ke unit BNPB dan nomenklatur
peraturan BNPB), Bab 2 dan 8 Kajian Air Jawa, serta Bab 2, 11, dan 12 Kajian Mitigasi.

**Membangun ulang:** `python3 data/kajian-bnpb/bangun/program-terbukti.py` (Python 3 stdlib, luring, kurang dari 2 detik).
Skrip menulis semua berkas di folder ini lalu menjalankan self-check `assert`; keluar non-nol bila satu invarian rusak.
Keluaran terakhir: "self-check hijau". `kompendium.md` dibangkitkan skrip; jangan disunting tangan.

## 1. Masukan dan tanggal tarik

| Masukan | Isi | Tanggal | Label |
| --- | --- | --- | --- |
| `data/raw/hukum/teks/perban-nomor-6-tahun-2025.json` | OTK BNPB (ditetapkan 6 Okt 2025) | korpus JDIH lokal | resmi |
| `data/raw/hukum/teks/perban-nomor-11-tahun-2025.json` | Perubahan OTK (ditetapkan 30 Des 2025): Deputi PD jadi 1 direktorat koordinasi + 3 direktorat wilayah; Deputi RR jadi 3 direktorat sektor; Pusat Pengendalian Operasi diganti Pusat Pembinaan Jabatan Fungsional Kebencanaan | korpus | resmi |
| `data/raw/hukum/teks/perban-nomor-5-tahun-2025.json` | Renstra BNPB 2025-2029: 7 program (hlm. 103), IKP (hlm. 130-131), target (Tabel 4.5-4.7, hlm. 132-139), isu RPJMN (hlm. 69-70), pengalihan SPAB (hlm. 20) | korpus | resmi |
| `data/raw/hukum/teks/perban-nomor-1-tahun-2025.json` | Renas PB 2025-2029: kebijakan (hlm. 33-34), Tabel 2.9, Rencana Aksi Tabel 3.1 (hlm. 50-125); kutipan RIPB 2020-2044 (hlm. 13-16) | korpus | resmi |
| `data/raw/hukum/teks/perban-nomor-7-tahun-2025.json`, `perka-nomor-4-tahun-2012.json`, `perban-nomor-2-tahun-2024.json`, `juklak-nomor-4-tahun-2025.json` | dasar hukum Destana, SPAB, SPDB, Dana Bersama prabencana | korpus | resmi |
| `data/kajian-bnpb/tema.json` kunci `kosakata` | kode status usulan, fase, jenis bencana, jenis aksi, keyakinan (dipakai juga oleh kontrak naskah) | repo | - |
| `data/kajian-bnpb/riset/B-air-jawa.md`, `C-benchmark.md` | angka yang sudah diriset (Citarum, Ciliwung, sumur resapan, Delta Programme) | 23 Okt 2026 | ikut label riset |
| 38 dokumen web (daftar lengkap di `program-terbukti.json` → `meta.sumber`) | laporan, jurnal, siaran pers instansi | dibuka 23 Okt 2026 | per baris |

SHA-1 tiap berkas korpus dicatat di `program-terbukti.json → meta.korpus`. Teks korpus dinormalkan (spasi dirapatkan,
tanda hubung ujung baris disambung) sebelum dicocokkan.

**Tidak ada yang dikutip dari ingatan.** Tiap nama unit, program, strategi, sasaran, fokus capaian, dan angka resmi dicek
ke teks korpus: kutipan utuh untuk teks bersambung; urutan kata dengan jarak terbatas untuk tabel bertumpuk kolom (jarak 3
token untuk Renas Tabel 3.1, 15 untuk RIPB Tabel 1.2, 20 untuk Renstra Tabel 4.7); deret target lima tahun harus muncul
berurutan. Uji mutasi dijalankan saat menyusun: mengganti satu target, nama unit, fokus capaian, atau angka bukti membuat
skrip gagal.

## 2. Berkas keluaran

Semua CSV UTF-8, pemisah koma. Angka di kolom `nilai` ditulis format Indonesia (titik ribuan, koma desimal) persis seperti
di naskah; `nilai_angka` adalah padanannya dengan titik desimal (jam WIB dibaca jam + menit/60). Sel kosong = tidak ada nilai.

| Berkas | Baris | Isi | Label |
| --- | ---: | --- | --- |
| `kompendium_program.csv` | 25 | Satu baris per program: lokasi, periode, pelaksana, fase/bencana/jenis aksi (kode `tema.json`), yang dilakukan, dampak terukur, jenis evaluasi, kekuatan bukti, label angka, syarat keberhasilan, status di Indonesia (`sudah-ada`/`dikembangkan`/`baru`) dan dasarnya, celah, posisi dalam kajian, unit BNPB berlaku, K/L, kode program Renas, fokus capaian RIPB, strategi RIPB, program Renstra | campuran; lihat `keyakinan` |
| `bukti_dampak.csv` | 163 | Satu baris per angka (atau temuan kualitatif) yang dipakai di kolom dampak: nilai, satuan, periode, peran (sebelum/sesudah/hasil/pembanding/klaim/target), sumber, URL atau berkas, lokasi di dokumen, tanggal akses, label, cara verifikasi, kutipan pendek, grup konflik | per baris |
| `organisasi_bnpb.csv` | 45 | Susunan organisasi BNPB per Perban 6/2025 jo. 11/2025: 38 unit berlaku (Kepala, Unsur Pengarah, Sestama, 4 Biro, 4 Bagian, 5 Deputi, 15 Direktorat, Irtama, 3 Inspektorat, 3 Pusat) + 7 unit yang diganti; halaman, kutipan pasal, wilayah provinsi tiap Direktorat Penanganan Darurat | resmi |
| `renstra_bnpb_2025_2029.csv` | 39 | 3 indikator sasaran strategis, 7 program dengan 12 IKP dan target 2025-2029, 24 sasaran kegiatan eselon II (SP1-SP5 lengkap, SP6 hanya Pusdiklat) dengan target lima tahun; `unit_otk_berlaku` memetakan nama unit Renstra (OTK lama) ke OTK berlaku | resmi |
| `renas_pb_2025_2029.csv` | 73 | 6 kebijakan, 4 sasaran, 19 strategi, 44 program Renas dengan fokus capaian RIPB (Tabel 2.9, dicocokkan ke Tabel 3.1) | resmi |
| `renas_aksi_terkait.csv` | 17 | Baris Rencana Aksi Renas yang dipakai untuk status program (baseline 2024, target 2029, penanggung jawab, kontributor). **Kolom pagu indikatif sengaja tidak disalin.** | resmi |
| `ripb_2020_2044.csv` | 46 | RIPB 2020-2044 sebagaimana dikutip Renas: 5 sasaran, 6 kebijakan, 23 strategi, 12 fokus capaian 2025-2029 | resmi |
| `kompendium.md` | - | Kompendium naratif: tabel ringkas, uraian per program dengan tabel buktinya, organisasi, Renstra, Renas, RIPB, batas | turunan |
| `program-terbukti.json` | - | Cermin semua tabel (`tabel.<nama>` = `{kolom, baris}`) + `meta` (korpus SHA-1, definisi label, verifikasi, kekuatan, posisi, daftar sumber) | - |

## 3. Aturan penilaian

**Label keyakinan** (per angka): `resmi` = instansi pemerintah yang berwenang atas data itu (termasuk media yang mengutip
instansi; lihat kolom `penerbit`); `terverifikasi` = sumber primer non-pemerintah yang dibuka (jurnal, laporan donor,
evaluasi independen, rilis perusahaan). `estimasi-model` dan `asumsi-kebijakan` tidak dipakai: tidak ada keluaran mesin
platform di paket ini. Hasil pemodelan pihak ketiga (Urzainki 2023, NIBS/FEMA, Room for the River) berlabel
`terverifikasi`/`resmi` dengan jenis evaluasi `model`.

**Verifikasi** (per angka): `korpus-lokal` (dicek mesin ke teks JDIH), `dibuka-langsung` (114 baris), `via-riset` (17
baris, status mengikuti riset B/C), `ringkasan-mesin-cari` (17 baris: dokumen primer menolak dibuka, 403/404/timeout/>10 MB).
Baris `ringkasan-mesin-cari` **wajib dicek sebelum naskah final**: Artemis (CCRIF 2023), siaran pers Bank Dunia JRF 2011,
Bisnis.com (ABMN 2024), CGTN (sensor Palu 200 km), evaluasi DFAT PAMSIMAS (EIRR), ENW Hoogwater 2021, OCHA Chile (528),
Inquirer (Haiyan, Albay), PreventionWeb (korban 1970), World Vision dan feature Bank Dunia (korban awal Phailin).

**Kekuatan bukti** (per program): `kuat` = deret pra-pasca resmi atau studi bertinjauan, pola konsisten (wajib minimal dua
angka yang dibuka langsung, dicek mesin); `sedang` = terukur tetapi satu kejadian, tanpa pembanding terkontrol, atau model
terdokumentasi; `lemah` = laporan sendiri pelaksana atau klaim pejabat; `belum-terbukti` = tidak ditemukan evaluasi dampak.
Program `belum-terbukti` hanya boleh berposisi "Program berjalan, wajib evaluasi dampak" atau "Uji coba terukur" (dicek mesin).

**Posisi**: Program (bukti kuat) / Program dengan syarat (bukti sedang) / Program berjalan, wajib evaluasi dampak / Uji coba
terukur / Rujukan tata kelola / Pelajaran, bukan teladan.

**Konflik sumber**: versi yang bertentangan disimpan berdampingan dengan `grup_konflik` yang sama (dicek: tiap grup minimal
dua baris). Contoh: rumah Rekompak 300.000 lawan 280.000; korban siklon 1970 500.300 / 300.000 / 1 juta; korban Phailin
44 / 23 / 38; desa peserta FFVP 9 (APRIL) lawan 4 dan 18 (RAPP); klaim ABMN Rp1,14 miliar (isi) lawan Rp114 miliar (judul URL);
rumah rusak berat Lombok 74.774 lawan 74.707 dan selesai 65.000 lawan 68.000 dalam satu rilis.

**Angka naratif terkunci**: setiap angka di kolom `dampak` kompendium wajib muncul sebagai `nilai` di `bukti_dampak.csv`
untuk program yang sama (tahun empat digit dikecualikan). Angka tanpa sumber membuat skrip gagal.

**Tanpa biaya**: tidak ada kolom pagu, anggaran, atau biaya proyek (dicek: kata "pagu", "anggaran proyek", "biaya proyek"
tidak boleh muncul di tabel bukti dan status). Premi dan klaim asuransi dicatat karena itu keluaran program, bukan belanja.

## 4. Temuan penting untuk penyusun naskah

1. **Hanya 4 program berbukti kuat dan semuanya luar negeri**: pengendalian air tanah Tokyo/Bangkok, CPP Bangladesh, Odisha,
   kode bangunan Chile. Program dalam negeri terbaik berbukti sedang (Rekompak, BRR, PAMSIMAS, Citarum Harum, InaTEWS hulu).
2. **Destana dan SPAB belum punya evaluasi dampak** meski berjalan lebih dari 10 tahun. Perban 7/2025 sudah memuat Penilaian
   Ketangguhan bertingkat (pratama, madya, utama) yang bisa jadi garis dasar evaluasi. SPAB dialihkan ke kementerian pendidikan
   sejak 2023; di Renas BNPB hanya kontributor.
3. **Sekat kanal**: model terkalibrasi 168 sekat di 22.000 ha menunjukkan muka air tanah rata-rata hanya naik 1,5 cm.
4. **Renstra 2025-2029 memakai nama unit OTK lama** (Perban 4/2019: 24 unit eselon II) untuk Deputi Penanganan Darurat dan
   Deputi RR, sementara OTK berlaku sudah berubah (Perban 11/2025). Pemetaan di `unit_otk_berlaku` tidak satu-satu; tidak ada
   pasal peralihan.
5. **Perban 11/2025 tidak ikut mengubah Pasal 104 dan 106 Perban 6/2025**: Inspektorat II masih disebut mengawasi "Pusat
   Pengendalian Operasi" yang paragrafnya sudah diganti (dicek mesin).
6. **Juklak 4/2025 (Dana Bersama prabencana) tidak memuat kewajiban analisis manfaat-biaya**; verifikasi hanya "kelayakan
   teknis Rencana Anggaran Biaya". Dasar status "Usulan baru" untuk pola FEMA (dicek mesin: bila kelak teks memuat
   manfaat-biaya, skrip gagal dan status harus ditinjau).
7. **Peringatan dini**: Renstra mencatat keterpenuhan sistem peringatan dini baru 6% dari masyarakat terpapar berisiko tinggi;
   IKP Renstra hanya naik dari 6,10% ke 6,32% sampai 2029.

## 5. Keterbatasan

- Invarian kab/kota (514 / 119 Jawa) tidak berlaku: paket ini tidak berisi data per kab/kota. Invarian wilayah yang dicek:
  38 provinsi terbagi habis ke tiga Direktorat Penanganan Darurat tanpa duplikasi, dan enam provinsi Jawa punya direktorat
  (Jateng dan DIY: Wilayah I; DKJ, Banten, Jabar: Wilayah II; Jatim: Wilayah III).
- Program dalam negeri jarang dievaluasi dengan pembanding; "belum terbukti" berarti bukti tidak ditemukan pada penelusuran
  23 Okt 2026, bukan program tidak bermanfaat.
- Dasar hukum yang tidak ada di korpus (Perpres 93/2019, Perpres 120/2020, Perpres 15/2018, Inpres 1/2018, Inpres 3/2020,
  Pergub DKI 93/2021, Kepmen ESDM 291.K/2023, PMK 97/2019, Perpres 75/2021, SNI ketahanan gempa) disebut sebagai kutipan
  sekunder atau rujukan umum di kolom `dasar`; teksnya tidak diperiksa di sesi ini.
- Nomenklatur K/L mengikuti Renas PB 2025-2029 (kabinet 2024); belum dicek ke susunan kabinet Oktober 2026.
- Renstra SP6 (biro-biro Sestama) dan SP7 (Inspektorat) hanya dimuat di tingkat program, tidak per sasaran kegiatan.
- SEADRIF (ASEAN) dan program DRR Filipina tingkat nasional selain evakuasi preemptif tidak ditelusuri bukti dampaknya.
- RIPB diambil dari kutipan Renas PB (Tabel 1.2), bukan dari teks Perpres 87/2020 (tidak ada di korpus).
