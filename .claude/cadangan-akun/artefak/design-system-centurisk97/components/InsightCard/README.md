# InsightCard

Kartu Insight: satu temuan per kartu, kepala bergradasi surface, isi grafik interaktif, kaki sumber.

- Struktur: `.ex` > `.ex-hd` (eyebrow `.ex-ey` + judul h3 `card-title`), `.ex-bd` (grafik atau tabel), `.ex-ft` (legenda + sumber).
- Judul = fakta + angka + sumber; angka kunci di depan, disorot `.hl` (`bad`) atau `f2`. Tanpa subjudul, tanpa kotak KPI, tanpa "Pesan Kunci".
- Tiap grafik interaktif dengan tooltip saat hover (lihat Tooltip). Paragraf rata kiri-kanan.
- Kontrol di kartu (`.ctl`) memakai Segmented penuh lebar dan Select.
- Radius `r-lg` (18px), padding `space-6`.
