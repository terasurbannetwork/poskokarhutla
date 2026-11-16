# Konvensi naskah Markdown untuk mesin DOCX

Berlaku untuk semua berkas di `naskah/`. Mesin di `mesin/` membaca konvensi ini. Jangan memakai
HTML mentah di naskah.

## Struktur

- Satu berkas per bab. Baris pertama `# BAB n Nama Bab` (bab), `# Lampiran X. Nama` (lampiran), atau
  `# Ringkasan Eksekutif`, `# Penutup`, `# Daftar Pustaka`.
- Subbab `## n.m Nama`, sub-subbab `### n.m.k Nama`. Paradoks memakai `### P-xx Nama`.
- Baris "Status: ..." di awal berkas adalah catatan kerja dan TIDAK dicetak (mesin membuangnya bila
  diawali "Status:"). Begitu juga paragraf "Singkatan dan istilah di bab ini:" tetap dicetak.
- Urutan berkas ditetapkan `mesin/urutan.json`.

## Tabel dan gambar

- Keterangan tabel: satu baris `Tabel n.m. Judul` tepat di atas tabel Markdown. Satu baris `Sumber: ...`
  tepat di bawahnya. Penomoran n.m mengikuti bab (Tabel 4.1).
- Gambar: `![Gambar n.m. Judul](gbr/nama.png)` lalu baris `Sumber: ...`. PNG dibuat mesin dari spesifikasi
  di `mesin/gambar/nama.json` (grafik) atau `mesin/gambar/nama.pohon.json` (pohon keputusan).

## Kotak khusus (blok berpagar tiga titik dua)

```
:::kalimat
Satu kalimat temuan utama (kotak berwarna, ringkasan eksekutif).
:::

:::kartu
3,4x | Rentang jumlah kejadian karhutla karena aturan gabung
51% | Kejadian lolos hanya karena kriteria terdampak
:::

:::temuan
#### Judul temuan 1
Isi singkat.
#### Judul temuan 2
Isi singkat.
:::

:::metode
Catatan metode (latar abu muda).
:::

:::tentang
Kotak "Tentang kajian ini".
:::

:::keputusan
#### Keputusan 1: judul
Pilihan A: akibat. Pilihan B: akibat.
:::

:::aksi
#### Sudah dilakukan
- butir
#### Sedang berjalan
- butir
#### Akan dilakukan
- butir
:::
```

## Pohon keputusan (`mesin/gambar/<nama>.pohon.json`)

```json
{"judul": "Pohon L1: apakah laporan ini kejadian baru?",
 "simpul": [
   {"id": "a", "tanya": "Jenis bahaya sama dengan kejadian aktif di kabupaten ini?", "ya": "b", "tidak": "baru"},
   {"id": "b", "tanya": "Laporan aktif terakhir kurang dari 7 hari?", "ya": "sama", "tidak": "baru"}
 ],
 "ujung": {"baru": "Buka kejadian baru", "sama": "Tambah pengkinian ke kejadian lama"}}
```
