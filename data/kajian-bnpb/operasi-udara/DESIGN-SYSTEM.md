# DESIGN-SYSTEM: Pantauan Operasi Udara

Semua kartu memakai kartu standar `.ex.ex-std` (AGENTS §3.5) dan token situs Centurisk97. Gaya modul ada di
`public/operasi_peta.css`, semua selektor diawali `#opsLaporan` (pop-up ditaruh di dalam `#opsLaporan` supaya ikut).

## 1. Aturan selera (mengikat, K4)

- Tidak ada huruf kapital semua: `#opsLaporan th, .ex-ey {text-transform:none}`.
- Tidak ada latar sorot abu-abu di baris, ubin, atau label. Pembeda memakai garis tipis `var(--line)`, warna lembut per jenis, atau ikon.
- Label = ikon 12 px + teks (`lbl(kunci, teks)` di `public/operasi_laporan.js`). Label berwarna hanya bila jenisnya bermakna.
- Kartu dan bagian tidak menempel: wadah kartu `display:grid; gap:20px` (gerbang `tests/agen/gerbang-kartu-renggang.test.mjs`).
- Tanpa titik tengah `·` sebagai pemisah; pakai koma atau baris baru.
- Angka: format Indonesia, satuan disebut, belum lapor = "–" dengan keterangan, bukan 0.
- Ukuran huruf memakai `rem`, bukan `px` literal (gerbang tipografi, ratchet).
- Tabel muat tanpa geser di lebar 1440: kolom panjang dipindah ke baris kecil di bawah sel utama.

## 2. Warna makna

| Makna | Warna | Dipakai |
| ----- | ----- | ------- |
| Jarak pandang | biru `#1f56ad` di atas 11% | label kelayakan, misi WB di linimasa |
| Angin | hijau toska `#0b6f66` di atas 12% | label kelayakan, misi patroli |
| Jam laporan | garis tipis, teks `--ink2` | label jam |
| Asap | cokelat `#6e5426` | ikon saja, teks di tooltip |
| Badai petir, telat, belum didatangi | merah bata `#a63a26` | ikon, teks status |
| Didatangi, padam, berjalan | hijau `#2e8b57` | progres renlap, nomor target, kontrak berjalan |
| Siap tapi menganggur | oranye `#e08a3a` | garis kiri baris operator, titik alasan renlap |
| OMC | ungu `#5b35a8` | misi OMC |

Status armada memakai titik warna `--w` dari `STATUS_AR` (`public/operasi_peta.js`): siap, beroperasi, siaga, tidak siap, belum lapor.

## 3. Komponen yang sudah ada (dipakai ulang, jangan dibuat ulang)

| Komponen | Kelas | Isi |
| -------- | ----- | --- |
| Ubin ringkasan | `.ops-lap-angka` | ikon dalam kotak biru, angka besar, keterangan; redup bila belum ada data |
| Tabel base | `tr.ops-grup`, `tr.ops-bb`, `tr.ops-rinci` | grup per pulau bisa dilipat, baris base bisa dibuka |
| Saringan | `.ops-saring`, `.ops-tanda` | segmen pulau + saklar kondisi berjumlah |
| Kartu armada | `.ops-akt` | foto 150 px penuh, registrasi di atas foto, status di pojok, daftar berikon, kaki "Histori ›" |
| Pop-up armada | `.ops-dlg`, `.ops-pa` | `<dialog>`: kepala foto + identitas, deret 6 angka bergaris, linimasa kegiatan, kartu kontrak |
| Label kelayakan | `.ops-layak` | grid slot tetap: pil status, jarak pandang, angin, jam, ikon cuaca |
| Blok renlap | `.ops-rl-blok` | `<details>` per base: nama + versi, bilah progres, unduhan; isi kartu target bernomor |
| Dokumentasi | `.ops-gl-hari` | baris per hari dengan strip foto mini, klik membuka galeri |
| Bilah utilisasi | `.ops-util` | persen + bilah 5 px |

## 4. Komponen baru untuk tiket UD-*

| Komponen | Pola | Untuk |
| -------- | ---- | ----- |
| Penanda telat | label merah bata berikon jam di kolom Siap dan saklar "Telat lapor" | F-1 |
| Strip 7 hari | 7 titik status per pesawat di kartu armada dan pop-up | F-2 |
| Pita prakiraan | 6 kotak per jam (sekarang +1..+6) berwarna kelayakan, di baris base | F-3 |
| Sisa jam terang | label ikon matahari "terbenam 17:52, sisa 3 j 10 m" | F-4 |
| Kartu celah | kartu standar, tabel cluster tanpa jangkauan + base terdekat | F-7 |
| Distribusi respons | median besar + bilah p25–p75 per base | F-7 |
| Tombol unduh | `.ops-kml` (pil biru tua berikon unduh): PDF, KML, GPX | F-15 |
| Bilah kontrak | bilah sisa jam berwarna, perkiraan tanggal habis | F-19 |

## 5. Wireframe tingkat kartu (urutan di layar)

1. Ubin ringkasan (+ ubin "telat lapor", "celah jangkauan")
2. Base (tabel per pulau; kolom kelayakan + pita prakiraan; renlap PDF/KML/GPX)
3. Celah jangkauan dan respons
4. Renlap (blok per base + kepatuhan)
5. Aksi armada, tren 30 hari
6. Hasil per kabupaten (padam, api muncul lagi)
7. Operator (utilisasi, menganggur, kepatuhan renlap)
8. Kontrak (sisa jam)
9. Keselamatan dan perawatan (setelah Q3–Q5)
10. Jejak ADS-B, temuan pilot, OMC, dokumentasi, efektivitas

## 6. Gerak dan aksesibilitas

- Lipat/buka hanya mengubah atribut `hidden` atau `<details>`; tanpa render ulang (INP).
- Pop-up `<dialog>` bawaan: Esc, tombol ×, klik latar menutup; fokus kembali ke kartu asal.
- Kartu dan baris yang bisa diklik punya `tabindex="0"` dan bisa dibuka dengan Enter.
- `prefers-reduced-motion`: tanpa efek angkat kartu.

## 7. Tata letak model A: panel seksi kiri (pemilik 11 Nov 2026)

Riset (NN/g accordions dan vertical nav, Stephen Few, Esri ArcGIS Dashboards, Grafana kiosk) dan rujukan Oyenza:
kartu yang semuanya terlipat menyembunyikan isi yang hampir selalu dibutuhkan; dashboard = yang terpenting dalam satu layar,
pengecualian (Perlu tindakan) dulu, rincian sesudahnya. Pola Oyenza dipinjam, bukan ditiru mentah: kepala situs navy,
token Centurisk97, kartu berkepala §3.5 tetap.

| Bagian | Isi |
| ------ | --- |
| Panel kiri (sticky, 232 px, bisa ditarik 200 sampai 320 px, bisa diciutkan jadi ikon) | Udara/Darat, lalu grup seksi berikon dengan angka kecil di kanan; yang aktif berlatar navy lembut. Udara: **Hari ini** (Ringkasan, Base dan armada, Peta, Renlap dan aksi), **Kinerja** (Tren, Efektivitas, Operator dan histori), **Kontrak** (Kontrak 2026, Modifikasi cuaca). Kaki panel: pil kesegaran data per sumber |
| Kepala isi (satu baris) | Judul seksi besar di kiri; di kanan pemilih periode satu baris: segmen Hari/Minggu/Bulan/Rentang/12 Bulan + ‹ tanggal › |
| Tampilan Ringkasan | Kiri: Ringkasan 3x2 berpembanding, papan base. Kanan (kolom 360 px): Perlu tindakan sebagai daftar tegak. Tanpa klik |
| Tampilan lain | Kartu seksi terbuka bawaan; lipatan hanya untuk rincian sekunder (foto, jejak ADS-B) |
| HP (< 900 px) | Panel kiri jadi deret seksi yang bisa digeser di atas isi; kolom kanan turun ke bawah |
| TV | `?tv=1` (UD-24) |

Satu tampilan = satu hash (`#ringkasan`, `#base`, ...), jadi tombol kembali dan tautan bekerja. Pindah seksi hanya
mengganti `hidden` pada grup kartu yang sudah dirender (INP).

## 8. Tingkat wadah (pemilik 11 Nov 2026)

Warna gelap hanya di L1. Tingkat di bawahnya makin ringan, supaya mata tahu urutan tanpa banyak bilah navy.

| Tingkat | Contoh | Bentuk |
| ------- | ------ | ------ |
| L1 halaman | wadah isi kanan | putih, sudut 20px; kepala navy `#0b2545` berisi judul seksi rata tengah, teks putih |
| L2 bagian | Angka utama, Renlap, Papan base, Rencana tindakan | kartu putih bergaris tipis; kepala terang: ikon di kotak navy 28px + judul navy 1rem, garis bawah tipis. Perlu tindakan: kepala merah muda, teks merah tua |
| L3 grup | pulau (Sumatera, Kalimantan) | wadah biru sangat muda (`--brand2` 4%), pita label biru muda dengan ikon kotak navy |
| L4 item | kartu base, kartu renlap, kartu Angka utama | kartu putih bergaris; kepala biru muda (`--brand2` 7%), nama navy, kode ICAO pil navy, label bergaris tipis |
| Label nilai | Siap, Renlap, Sortie | pil `.pill` sama bentuk: hijau baik, oranye perlu perhatian, merah prioritas, abu netral kosong |

Warna kepala per tingkat (11 Nov 2026): satu keluarga navy, makin dalam makin terang. L1 navy solid `#0b2545` teks putih; L2 navy 8% (`--h2`) dengan garis navy 14% dan judul navy; L3 pita putih beraksen biru kiri di atas wadah biru sangat muda; L4 kepala putih dengan garis pemisah saja. Perlu tindakan memakai tone merah yang setara L2. Tingkat dibedakan oleh tone, bukan warna-warni.

Pembaruan kepala (riset 11 Nov 2026): Palantir Workshop menyarankan gaya berlatar hanya sekali per halaman; Shopify Polaris memperlakukan susunan bertingkat sebagai struktur, bukan kartu berlatar, maksimal 2-3 tingkat; EUI dan SAP Fiori membatasi kepala ke ikon, judul, keterangan, dan 2-3 aksi dalam satu baris. Maka: hanya L1 berlatar navy; semua kepala L2 putih, tinggi minimal 52px, ikon kotak navy, judul 1.0625rem tebal navy, pil keterangan, aksi di kanan, garis bawah navy 12%. Perlu tindakan: ikon dan judul merah, tanpa latar.
