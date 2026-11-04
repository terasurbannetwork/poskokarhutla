# Brief Narasi Publik Karhutla 041126

Paparan Kepala BNPB (Letnan Jenderal TNI Kristomei Sianturi, S.Sos., M.Si. (Han)), 4 November 2026, 20 slide.
Dibangun dengan skill `ppt-konsultan` (mesin `bnpb/scripts/deck.py`), akar proyek `bnpb/assets/proyek-narasi`.

- `Brief Narasi Publik Karhutla 041126.pptx` / `.pdf`: deck final.
- `spek/deck-narasi.json`: spek deck.
- `data/angka.json`: registri angka yang dipakai deck (kunci `karhutla.*`, `fs.*`).
- `data/karhutla/`: CSV paket data, `ringkas.json`, `firespot.json`, `bangun_data.py` (menyusun CSV dari `sumber/`),
  skrip hitung firespot (`fs_tahun.py`, `fs2.py`, `dl.py`, `rakit.py`), dan snapshot data sumber di `sumber/`
  (situs Pantau Bencana 4 Nov 2026, kajian peta aktor WALHI 2026, infografis Bakom 15 Okt 2026, rekap udara PDW BNPB).

Bangun ulang: salin `spek/` dan `data/karhutla/` ke akar `proyek-narasi` skill, lalu
`deck.py assets/proyek-narasi/spek/deck-narasi.json "<keluar>.pptx" --pdf --akar assets/proyek-narasi`.

Cut off data 3 Nov 2026, 23.59 WIB. Firespot = klasifikasi firespot sistem (pola Kemenhut SIPANTAU) atas NASA FIRMS VIIRS;
perbandingan antartahun memakai S-NPP saja, 1 Jan–27 Okt tiap tahun. Angka konsesi dan afiliasi asing memakai hotspot VIIRS
sepekan puncak (5–12 Okt). Keputusan pemilik selama revisi tercatat di skill `ppt-konsultan`,
`bnpb/references/keputusan-pemilik.md` bagian 4 Nov 2026.
