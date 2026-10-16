Penilai harga barang bekas dan properti

# Buku Pegangan Worth It

Disegarkan 3 Okt 2026\
commit bdd9cfa

[Keputusan pemilik](#keputusan) [Selera tampilan](#selera) [Gerbang](#gerbang) [Armada](#armada) [Riwayat](#riwayat)

CLAUDE.md dan dua spec 3 Okt 2026

## Keputusan pemilik

Yang sudah diputus tidak dibuka lagi tanpa pemilik. Yang belum diputus jangan ditebak.

Diputus

**Cangkok, bukan fondasi ulang**

Worth It tetap basis. Dibawa dari Gemah Ripah dan Betutu Sambe hanya yang generik. Modul back-office tidak ikut.

Diputus

**Urutan fase**

Fase 0 selesai, lalu Fase 2 tampilan, lalu Fase 1 keamanan, lalu Fase 3, lalu Fase 4.

Diputus

**Bank data properti**

Jabodetabek, sesudah Fase 1. Data panen tidak masuk DB sebelum celah keamanan tertutup. Harga tampil berlabel "harga minta"; ambang 30 dan 75 listing unik per kelurahan.

Diputus

**Migrasi digulung ulang**

DB belum tayang, jadi 16 migrasi jadi baseline bersih dengan perbaikan keamanan di dalamnya, bukan ditambal.

Diputus

**Angka dari rumus**

Satu rumus per besaran. Model AI hanya mengekstrak atribut. Kredit dipotong hanya saat vonis berhasil. Server crawler hanya menyentuh sumber publik.

Diputus

**Model**

Opus merencanakan, pengerja Sonnet, pemeriksa pola Haiku.

Belum diputus

**Supabase dan Vercel**

Belum dibuat. Rekomendasi: Supabase terpisah di org PANGANTARA ($10/bulan, Singapore), Vercel tim "MBG Babel's projects" region sin1. Keputusan pemilik.

Belum diputus

**Paket Vercel dan jam routine**

Cron tiap 30 menit butuh Pro. Routine pembaru buku ini menunggu jam dari pemilik.

selera-pinka dan app/globals.css

## Selera tampilan

Palet navy identitas Worth It, terang dan gelap sejak awal. Kanon selera hidup di repo pangantara lewat symlink.

Navy #0b2545

Gradient #1d4e89

Paper #f5f7fb

Emas #c9a227

- Emas hanya aksen tipis. Gradient navy dari `#1d4e89` ke `#0b2545`.
- Warna vonis khusus vonis: sangat murah dan murah emerald, wajar sky, mahal amber, sangat mahal merah, curiga penipuan merah plus ikon peringatan.
- Tabel berwarna vonis ditutup `LegendaTabel`.
- Landing adalah produk konsumen publik, jadi hero dibolehkan.
- Nol em dash di teks yang terlihat. Nol kartu angka berlatar blok warna pekat. Format Rupiah lewat komponen, bukan tulis tangan.
- Klik tidak boleh membekukan layar: chrome kontrol urgent, subtree berat deferred.

tests/unit/gerbang-\*.test.ts

## Gerbang

Aturan tanpa gerbang mekanis dianggap belum jadi. Dari sesi Claude, suite penuh diblokir hook pemilik; jalankan per berkas.

| Gerbang | Yang ditolaknya |
| --- | --- |
| `selera`, `inp-transisi` | Tampilan menyimpang dari selera; klik yang membekukan layar |
| `migrasi`, `penjaga-definisi` | Migrasi tidak idempoten, tabel tanpa RLS, definisi yang dibaca versi mati |
| `test-integrasi` | Objek SQL tanpa vonis di `cakupan.json` (antre 66 objek) |
| `angka-vonis`, `ai-kuota` | Angka kartu dari teks model; pemanggilan AI tanpa kuota (antre 3 route) |
| `extension-uang` | Izin extension terlalu lebar, harga dari klien, webhook tanpa tanda tangan |
| `deploy`, `cron-katalog`, `batas-klien` | Konfigurasi deploy salah, cron tidak terdaftar, kode server bocor ke klien |
| `dummy`, `halaman`, `kategori`, `sumber`, `berkas-kosong` | Mesin dummy rusak, halaman tanpa guard, kategori tanpa mesin, sumber tak sah, berkas kosong |
| `model-agent`, `ilmu-agent` | Agent tanpa model, tanpa ilmu, atau berkas tanpa pemilik tunggal |

scripts/agents/roster.json dan AGENTS.md

## Armada

28 agent. Satu agent satu wilayah; pemilik berkas dicari dengan `node scripts/agents/ilmu.mjs pemilik`.

9 pengerja (Sonnet)

mesin-harga, pintu-masukan, vonis-kartu, cari-peringkat, extension, uang-kredit, panen-crawler, akun-auth, admin

6 platform (Sonnet)

tukang-layar, db-migrator, penulis-e2e, penulis-gerbang, pelunas, mekanik-mesin

6 pemeriksa pola (Haiku)

guard-api, rls-auditor, migrasi-idempoten, higiene-repo, selera-angka, selera-tabel

7 pemeriksa nalar (Sonnet)

security-reviewer, service-role-auditor, uang-auditor, llm-auditor, perf-reviewer, inp-reviewer, selera-guard

Terbaru di atas

## Riwayat bertanggal

Keputusan dan perubahan penting per tanggal.

1. 3 Okt 2026
   - **Audit kode**: README mengklaim lima tahap selesai, kenyataannya baru fondasi dan mesin A mobil. Tiga celah keamanan diverifikasi manual (saldo kredit bisa diubah sendiri, fungsi terbuka, SSRF). Belum ada data yang bocor karena repo belum tersambung ke Supabase atau Vercel.
   - **Spec v2 disetujui**: cangkok fondasi Gemah Ripah dan Betutu Sambe, tutup celah, rombak tampilan. Spec bank data properti Jabodetabek disetujui, bergantung pada Fase 1.
   - **Fase 0 selesai**: husky, CI, sembilan gerbang baru, penangkap error, `vercel.json` dengan lima cron, header keamanan, armada 28 agent beserta ilmunya.
   - **Landing boleh punya hero** karena Worth It produk konsumen publik, bukan kokpit internal.
   - **Temuan baru** dari penulisan ilmu agent dicatat untuk Fase 1 dan 3: pelunasan menimpa status sebelum cek idempoten, saldo naik walau log kredit bentrok, antrian menggantung tak dipulihkan, tidak ada zona Asia/Jakarta di kode.