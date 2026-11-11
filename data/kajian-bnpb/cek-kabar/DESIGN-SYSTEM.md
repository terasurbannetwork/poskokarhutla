# DESIGN-SYSTEM: Cek Kabar Luar

Tidak ada token atau komponen baru di luar yang sudah dipakai `public/bnpb/dalops.css`. Bagian baru mengikuti kartu laporan standar `.ex.ex-std` (AGENTS.md 3.5) dan pemilih tab `.dl-seg`.

## Label

Memakai `label()` yang sudah ada di `dalops.js` (`.dl-tag` + nada), dengan ikon dari `window.Wilayah.ikon`:

| Label | Teks | Nada | Ikon |
| --- | --- | --- | --- |
| masih | Masih berlangsung | merah | ikon jenis (`J.ik`) |
| mungkin_selesai | Kemungkinan selesai | biru | `ok` |
| belum_ada | Belum ada kabar luar | kuning | `peringatan` |

Tiap label diikuti pil kecil "Deteksi Centurisk97" pada pop-up bukti, bukan pada baris (supaya baris tidak penuh).

## Ringkasan per tab

Satu kartu `.ex.ex-std` berjudul kalimat temuan dengan angka disorot `.hl`, contoh: "**12** kejadian kemungkinan sudah selesai tapi belum dilaporkan". Isi: tiga angka berdampingan (deretan rata ujung ke ujung, ikon, warna status) yang juga berfungsi sebagai saring baris. Tanpa kaki sumber (AGENTS.md 3.5); definisi tiap label di `title` angkanya.

## Pop-up bukti

Daftar artikel: judul (tautan, `target=_blank rel=noopener`), media, tanggal pendek (`tglPendek`), arah bukti (pil "masih" atau "pulih"). Lalu satu baris angka alam bila dipakai, contoh "Prakiraan banjir hari ini: tidak ada kecamatan berstatus". Teks data lewat `textContent`; tautan hanya `http(s)`.

## Aturan teks

Bahasa lugas, tanpa titik tengah. Angka format Indonesia. Tidak ada kata "aman". "Kemungkinan selesai" selalu dengan kata "kemungkinan".
