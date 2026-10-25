# Tambahan dari skill anti-ai-checker untuk naskah kajian

Dinilai 23 Okt 2026. Dilebur ke ANTI-SLOP.md dan `qa/slop.py` setelah workflow anti-slop
selesai. Daftar `banned-ai-words.txt` milik pemilik (182 baris) ditemukan di
knowledge-hub dan disalin ke `riset/anti-slop/banned-ai-words.txt`; dipakai untuk teks
Inggris dan dibuatkan padanan Indonesianya di ANTI-SLOP.md.

## Ambang terukur yang dipakai

| Cek | Ambang skill | Ambang kajian BNPB | Alasan penyesuaian |
| --- | --- | --- | --- |
| Em dash | ≤ 3 per 1.000 kata | 0 di teks tampil | Aturan pemilik lebih ketat |
| Titik dua | ≤ 20 per 1.500 kata | ≤ 20 per 1.500 kata di paragraf isi; label tabel, keterangan gambar ("Gambar 3.1 :"), dan "Sumber:" tidak dihitung | Pola "Label: penjelasan" khas teks mesin; komponen baku laporan dikecualikan |
| Pembuka klise | dipindai di 50 kata pertama | dipindai di 50 kata pertama tiap bab DAN tiap subbab; padanan Indonesia: "Di era", "Dalam lanskap", "Seiring perkembangan zaman", "Tidak dapat dipungkiri", "Pada hakikatnya", "Sebagaimana kita ketahui", "Dalam rangka", "Perlu diketahui" | Tiap subbab dibaca terpisah oleh pimpinan |
| Hedging | > 2 per < 1.500 kata gagal | sama; padanan: "perlu dicatat bahwa", "patut dicatat", "penting untuk diperhatikan", "dapat dikatakan bahwa", "tampaknya", "cenderung" tanpa data | |
| Tiga-serangkai | > 5 per 1.000 kata gagal | > 3 per 1.000 kata gagal; daftar tiga yang faktual (tiga provinsi, tiga skenario bernama) tetap boleh dan tidak dihitung bila berisi nama diri atau angka | Larangan total akan menolak daftar faktual; yang dicegah adalah ritme tiga sebagai gaya |

## Vonis tiga tingkat

| Pelanggaran per bab | Vonis | Tindakan |
| --- | --- | --- |
| 0 | LULUS | lanjut ke render |
| 1–2 | GAGAL RINGAN | ditulis ulang oleh penyunting; tidak boleh diserahkan apa adanya karena pemilik tidak memeriksa |
| ≥ 3 | GAGAL BERAT | bab dikembalikan ke penulis, ditulis ulang, dipindai ulang |

Karena pemilik menerima hasil tanpa memeriksa, GAGAL RINGAN tidak bisa "diterima
pemilik" seperti di skill: semua bab wajib LULUS sebelum diserahkan.

## Format laporan

Laporan pindaian per bab mengikuti format skill (berkas, jumlah kata, status, jumlah
pelanggaran, kata terlarang beserta lokasi paragraf, struktur: rasio em dash dan titik
dua, pembuka, usulan tulis ulang, vonis), ditulis ke `keluaran/qa/slop-<kajian>.md`.
