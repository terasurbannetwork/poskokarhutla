# ALGORITMA

## Masukan per tanggal T dan jenis J
- `P[kab]` = level sel prakiraan untuk T: dari `lalu.json` bila T sudah lewat, dari `prediksi.json` bila T di antara H+1 dan H+3. Level sel mengikuti `prediksi-besok/ALGORITMA.md`. Untuk gelombang: level = maks(level GEL, level ROB). Kab tanpa nilai = tidak ada prakiraan, tidak masuk kotak mana pun ("–").
- `KD` = kejadian Dalops jenis J; tiap kejadian: `kab_kode[]`, `mulai`.
- `LP` = laporan Lapor Bencana jenis J' (pasangan di bawah), status bukan `tidak_valid`; tiap laporan: `kab`, `waktu` (tanggal WIB).

## Pasangan jenis Lapor ke jenis Dalops
banjir = banjir; longsor = longsor; cuaca = cuaca; abrasi dan tsunami = gelombang; karhutla = karhutla. Jenis lain tidak ikut.

## Kotak
```
diprakirakan = P[kab] >= 2
terjadi      = ada k di KD dengan kab di k.kab_kode dan |k.mulai - T| <= 1 hari
            OR ada l di LP dengan l.kab = kab dan |l.waktu - T| <= 1 hari
berlangsung  = ada k di KD dengan kab di k.kab_kode, k.mulai < T - 1, belum surut pada T
kotak = Kena            bila diprakirakan dan terjadi
        Luput           bila tidak diprakirakan dan terjadi
        Belum ada laporan bila diprakirakan dan tidak terjadi
        Tenang          selainnya
matang = hari_ini - T >= 3   (Q2); Belum ada laporan yang belum matang ditulis "menunggu laporan"
```
`berlangsung` tidak mengubah kotak; ia hanya tanda di tabel dan pop-up.

## Ubin
Jumlah kab per kotak, sesudah saring provinsi. Tidak ada persen, tidak ada skor di Dalops (skor ada di rapor `/prediksi`).

## Label logbook untuk rapor (F-6)
Baris `[kab, tanggal, kode, "logbook", 1, null]` untuk tiap kab di `kab_kode` tiap kejadian Dalops dengan `mulai` = tanggal, kode menurut pasangan D3. Hanya positif. Tanggal tanpa baris untuk kab dihitung 0 hanya bila logbook hari itu ada (hari logbook kosong = tidak teramati, bukan nol). `nilai.py` menulis skor label ini dengan kunci `logbook`, terpisah dari `dibi`; vonis "belum teruji" bila n < 30.
