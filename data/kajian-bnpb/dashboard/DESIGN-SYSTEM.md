# DESIGN-SYSTEM: Dashboard Centurisk97

Turunan final dari perombakan `/operasi` (9 sampai 11 Nov 2026). Sumber kebenaran keputusan: `KEPUTUSAN-DASHBOARD.md`.
Implementasi bersama: `public/inti/dasbor.css` (token + komponen, awalan `.db-`) dan `public/inti/dasbor.js` (pembantu
`lbl`, `bagian`, `tabelH`, `urutTabel`, `lipatGrup`, saringan). Rujukan hidup: `http://localhost:8800/operasi`.

## 1. Token

| Token | Nilai | Pakai |
| ----- | ----- | ----- |
| `--db-navy` | `#0b2545` | kepala halaman L1, kepala tabel, teks judul, aksen kiri L2 |
| `--db-biru` | `#2f6fd6` | ikon, bilah, tautan, tint semua latar muda |
| `--db-h2` | `color-mix(in srgb,#2f6fd6 5%,#fff)` | latar kepala L2, kepala pop-up, kepala tooltip |
| `--db-h2-garis` | `color-mix(in srgb,#2f6fd6 16%,#fff)` | garis bawah kepala L2, tepi kartu |
| `--db-isi` | `color-mix(in srgb,#2f6fd6 2%,#fff)` | latar isi wadah L2 dan L3 |
| `--db-garis` | `var(--line)` | pemisah baris |
| `--db-merah-h2` | `color-mix(in srgb,#c0392b 5%,#fff)` | kepala "Perlu tindakan" |
| `--db-merah-isi` | `color-mix(in srgb,#c9503a 2%,#fff)` | isi "Perlu tindakan" |
| Status | Aman `#2e8b57`, Patroli/Info `#2f6fd6`, Siaga `#d9a21b`, Prioritas `#c0392b`, Perhatian `#e08a3a`, OMC `#7a4fd0`, Patroli misi `#0f9488` | pil status, ikon peta, batang bertumpuk |
| Huruf | `--display` untuk angka besar; `rem` saja; angka `tabular-nums` | semua |
| Sudut | L1 20px, L2 16px, kartu 12px, pil 999px | |
| Jarak | wadah penumpuk gap 12 sampai 20px (gerbang renggang), isi kartu 8 sampai 12px | |

Dilarang: abu tua sebagai latar, sorot abu-abu, latar gelap selain L1 dan kepala tabel, huruf kapital semua, titik tengah `·`.

## 2. Tingkat wadah

| Tingkat | Bentuk |
| ------- | ------ |
| L1 halaman | kartu putih sudut 20px; kepala navy solid, judul putih rata tengah berikon; tidak ikut tergulir |
| L2 bagian | `<details open>` kartu putih tepi `--db-h2-garis`; kepala `--db-h2` + aksen kiri 4px navy, ikon kotak navy 28px, nama seksi (bukan kalimat), pil keterangan + aksi di kanan; isi `--db-isi` |
| L3 grup | pita putih beraksen biru kiri 3px, pil jumlah di kanan (mis. "3 base", "21 armada"); grup bisa dilipat |
| L4 item | kartu putih tepi tipis sudut 12px; kepala `--db-h2` atau putih; nama navy + pil kode |
| Pop-up | `<dialog>`; kepala boleh navy (L1 pop-up); isi mengikuti L2 sampai L4 |

## 3. Tata letak

- Model A: panel seksi kiri (232px, grup berikon, angka kecil di kanan, kaki "Pembaruan data"), isi kanan satu tampilan per seksi, hash per seksi.
- Tinggi pas layar di >= 901px; gulir hanya di isi; tepi luar 8px.
- Kolom berdampingan berakhir sama tinggi (`align-items:stretch`); ukur di peramban sebelum lapor selesai.
- Grid simetris: `kolomSim(n)`; 1-5 sebaris, 6 = 3x2, 7-8 = 4x2, 9 = 3x3, 10 = 5x2.
- HP (< 900px): panel kiri jadi deret seksi yang bisa digeser; kolom turun.

## 4. Komponen (pola, kelas acuan di `/operasi`)

| Komponen | Acuan | Aturan |
| -------- | ----- | ------ |
| Angka utama | `.ops-rk`, `.ops-cmp` | ubin 3x2: kepala ikon + nama, dua kolom (periode ini pil tanggal + angka + delta, periode lalu redup); belum ada data = pil status, bukan "–" besar |
| Perlu tindakan | `.ops-tindak` | blok angka berikon di kiri tanpa latar, judul + nama + "+N", panah kanan; urut paling mendesak |
| Rencana tindakan | `.ops-apm`, `.ops-apr` | matriks per entitas x tenggat; kartu lain sama tinggi, aksen kiri warna kategori, kaki di bawah |
| Kartu entitas | `.ops-pb` | kepala nama + pil kode + pil sub (wilayah, jumlah, status); baris label kiri, nilai pil kanan, tinggi baris 34px; bilah hanya bila ada nilai |
| Tabel | `.ops-tw` | kepala navy teks putih, sudut 12px, angka rata tengah/kanan tabular, grup per wilayah bisa dilipat, klik kepala mengurutkan, saringan segmen + saklar berjumlah di kanan judul |
| Label kategori lurus | `.ops-layak` | grid slot tetap per kategori, slot kosong tetap ada |
| Pil | `.pill`, `.ops-lbl` | ikon 11-12px + teks 0.6875-0.75rem tebal; latar putih bergaris atau tint 8-12% |
| Grafik tren | `.ops-tren2` | batang muda tint 45%, garis rata-rata 7 hari tegas, grid putus-putus, sumbu y kiri; legenda pil di bawah grafik; tooltip terang |
| Batang harian bertumpuk | `.ops-ks` | satu kolom per hari, warna per kategori, angka di atas, tanggal di bawah, akhir pekan diarsir, legenda berjumlah di bawah |
| Tabel mini | `.ops-kp-t` | untuk ringkasan per wilayah; kolom tetap, tidak bisa meluber |
| Pemilih periode | `.ops-periode` | 3 baris, ikut tergulir, tinggi tetap |
| Peta | `.ops-peta` | laci kiri daftar entitas (grup L3, ikon berwarna tingkat), laci kanan rincian titik; legenda = saklar lapisan; label penanda putih berangka |
| Pop-up | `bukaDialog` | kepala identitas + pil; isi seksi `<details>`; baris ringkas sebaris (bukan kotak besar berangka) |
| Tooltip | `.ops-tip` | kartu putih, kepala `--db-h2`, kaki aksi biru |
| Galeri | `.ops-gl-hari` | kartu per hari: tanggal + pil jumlah + pil lokasi, pratinjau foto sebaris |

## 5. Interaksi dan kinerja

- Klik tidak membekukan layar: lipat/saring/pindah seksi mengubah `hidden`, tidak render ulang (INP, `~/.claude/INP.md`).
- Baris dan kartu yang bisa diklik: `tabindex="0"`, Enter membuka.
- Pemilih yang berkaitan dibungkus satu wadah berdekatan (`.ops-pilih2`).
- Status selalu warna + ikon + teks.

## 6. Pustaka

uPlot (MIT, sekitar 50 KB) boleh dipasang di `public/vendor/` untuk grafik tren yang butuh kursor dan tooltip. ApexCharts dilarang (lisensi berbayar di atas anggaran US$2 juta). Pola Tremor (BarList, CategoryBar, Tracker, BadgeDelta) ditiru bentuknya, bukan kodenya (React).
