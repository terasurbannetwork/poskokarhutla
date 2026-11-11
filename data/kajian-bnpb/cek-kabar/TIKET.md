# TIKET: Cek Kabar Luar (CK-*)

Kerjakan urut. Tiap tiket hanya cakupannya. Bukti siap = perintah di RENCANA-UJI yang disebut.

| Tiket | Cakupan | Pengerja | Bukti siap | Menunggu |
| --- | --- | --- | --- | --- |
| CK-01 | `dalops_kabar.py`: `cocok()` (daftar `kab_kode`, `KATA_JENIS`), `arah()` (pakai ulang `POLA`/`surut()` dari `dalops_banjir.py`, `AKTIF`), `label()` dengan `AMBANG` Q1 bawaan | pipa-data | `--uji` P1 sampai P6 (termasuk P1b sampai P1d), P8b, P9, P13 | |
| CK-02 | `alam()` per jenis: banjir dan longsor dari `status.json`, karhutla dari `peta_karhutla_kab.json`, kekeringan dari `gdo.json` | pipa-data | `--uji` P7, P8 | CK-01 |
| CK-03 | `muat_bahan()`: unduh berkas tayang, arsip berita lokal 60 hari, gagal unduh tidak menghentikan jalan | pipa-data | `--uji` P10 | CK-01 |
| CK-04 | `periksa()` dipanggil `dalops_banjir.py` sebelum `tulis()` di dua jalur (`satu()` dan `main_wa()`), menghapus `luar` baris yang sudah selesai; `arsipkan()` ke `cek_arsip.jsonl` | pipa-data | `--uji` P11, P12, `dalops_banjir.py --uji`, uji integrasi nyata | CK-02, CK-03 |
| CK-05 | `dalops_hitung.js`: `kelompok()` membawa label dan bukti kelompok, `perluDitanya()` memasukkan dan mengurutkan menurut label, `pesanWA()` menerima label | ruang-bnpb | L1, L1b, L2, L5 | CK-04 |
| CK-06 | `dalops.js`: kartu ringkasan `.ex-std`, label per baris, pop-up bukti, saring; `.dl-wa` masuk blok baca-saja di `menu_pusdalops.css` | ruang-bnpb | L3, L4, L6; tangkapan layar desktop dan HP; pemeriksa `inp-reviewer` dan `selera-angka` | CK-05 |
| CK-07 | `--rapor` ketepatan dari arsip beku | pipa-data | rapor tabel a/b/c/n | 60 hari arsip sesudah CK-04 tayang; Q6 |
| CK-08 | Umpan berita kebakaran permukiman (gelombang pasang sudah punya `berita_pesisir.json`) | pipa-data | jenis itu punya artikel cocok | Q2 |

## Catatan

- Tiket CK-01 sampai CK-04 bisa satu commit bila semua `--uji` hijau.
- Sesudah CK-06 tayang, ambang Q1 tetap bawaan sementara sampai rapor CK-07.
