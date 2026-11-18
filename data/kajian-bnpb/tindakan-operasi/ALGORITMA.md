# ALGORITMA: kategori tindakan dari logbook

## 1. Kata kunci per tindakan

Teks satu entri = gabungan `upaya`, `kondisi`, `peralatan`. Pola dicocokkan tanpa membedakan huruf besar. Satu teks boleh masuk beberapa tindakan. Pola tinggal di satu tempat: `POLA` di `scripts/data/logbook_tindakan.py`.

| Kode | Label | Pola (regex) |
| --- | --- | --- |
| kaji_cepat | Kaji cepat dan pendataan | `assess?ment\|kaji cepat\|\btrc\b\|pendataan\|survei` |
| evakuasi | Evakuasi warga | `evakuasi` |
| sar | Pencarian dan pertolongan korban | `pencarian\|pencaharian\|operasi sar\|basarnas\|korban hilang` |
| pembersihan | Pembersihan material dan lumpur | `pembersihan\|membersihkan\|kerja bakti\|penyingkiran` |
| alat_berat | Pengerahan alat berat | `alat berat\|excavator\|ekskavator\|beko\|loader\|backhoe` |
| buka_akses | Buka akses jalan | `(buka\|pembukaan\|membuka) akses\|akses jalan` |
| pohon_tumbang | Potong pohon tumbang | `pohon tumbang\|(memotong\|pemotongan) pohon\|chainsaw\|gergaji` |
| logistik | Distribusi logistik | `logistik\|sembako\|bantuan\|permakanan` |
| dapur_umum | Dapur umum | `dapur umum` |
| pengungsian | Pengungsian dan tenda | `pengungsian\|posko pengungsi\|tenda\|huntara` |
| air_bersih | Distribusi air bersih | `air bersih\|drop(p)?ing air\|distribusi air\|tangki air\|mobil tangki` |
| kesehatan | Layanan kesehatan | `kesehatan\|puskesmas\|medis\|pengobatan\|rumah sakit` |
| perbaikan_darurat | Perbaikan darurat rumah dan atap | `perbaikan\|terpal\|atap\|genteng` |
| tanggul | Tanggul darurat dan karung pasir | `tanggul\|karung pasir\|sand ?bag\|bronjong` |
| pompa | Penyedotan genangan | `pompa\|penyedotan\|menyedot` |
| masker | Pembagian masker | `masker` |
| pantau | Pemantauan lokasi atau aktivitas | `pemantauan\|memantau\|monitoring` |
| posko | Posko dan rapat koordinasi | `posko\|rapat koordinasi\|rakor` |
| imbauan | Sosialisasi dan imbauan | `sosialisasi\|imbauan\|himbauan\|mengimbau\|menghimbau` |
| rambu | Rambu, garis bahaya, tutup jalur | `rambu\|garis polisi\|police line\|penutupan (jalur\|jalan)` |
| status_darurat | Usulan penetapan status darurat | `status (tanggap\|siaga) darurat\|penetapan status\|sk status` |
| omc | Operasi modifikasi cuaca | `\bomc\b\|\btmc\b\|modifikasi cuaca` |
| patroli | Patroli | `patroli` |

Pemadaman dihitung di skrip hanya untuk laporan buang (`pemadaman(?! listrik)(?! aliran)\|memadamkan\|damkar`), tidak masuk katalog (KEPUTUSAN D4).

## 2. Hitungan

```
untuk tiap entri e dengan teks(e) >= 5 huruf:
    b = JENIS_LOGBOOK_KE_BENCANA[e.jenis]; lewati bila tidak ada atau b == "karhutla"
    berisi[b].tambah(e.id_kejadian)
    untuk tiap kode k dengan POLA[k] cocok teks(e): kena[b][k].tambah(e.id_kejadian)
persen[b][k] = 100 * |kena[b][k]| / |berisi[b]|, dibulatkan 1 desimal
```

Keluaran menyimpan `n` (kejadian berisi) dan hitungan mentah per kode, bukan hanya persen, supaya pembaca bisa menghitung ulang.

## 3. Masuk daftar bencana

Kode masuk `kemampuan.tindakan` bencana b bila `persen[b][k] >= 2`, atau ada sumber kedua tercatat (OMC banjir). Daftar diurutkan dari persen terbesar. Skrip `uji` memeriksa bahwa daftar registri sama dengan aturan ini untuk keluaran yang di-commit (kecuali kode bersumber kedua dan udara, yang dicatat di `PENGECUALIAN` skrip dengan alasannya).

## 4. Validasi tulis tindakan (Worker)

```
tindakan absen        -> set lama tidak disentuh
tindakan bukan daftar -> 400
panjang > 12          -> 400
kode ganda            -> 400
kode di luar kemampuan(bencana renlap).tindakan -> 400
lain: hapus set lama (renlap, target) lalu sisip kode baru, satu batch bersama upsert hasil dan pb_log
```
