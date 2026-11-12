# RENCANA-UJI: Log tindak lanjut Usulan langkah

## Uji integrasi (`node --test tests/warga/dalops_tindak.test.mjs`, Miniflare + D1 hasil semua migrasi)

| No | Kasus | Harapan |
| --- | --- | --- |
| T1 | GET tanpa sesi; akun gerbang situs | 401 |
| T2 | POST oleh tamu, akun gerbang situs, staf berperan pimpinan | 401/403 |
| T3 | POST moderator kunci sah, status selesai, catatan | 201; `dl_tindak` 1 baris, `dl_tindak_log` 1 baris berisi teks langkah |
| T4 | POST kedua kunci sama status proses | `dl_tindak` tetap 1 baris berstatus proses; log 2 baris |
| T5 | Kunci salah bentuk, status di luar daftar, catatan 301 karakter | 400 |
| T6 | GET terkini | butir berisi kunci itu dengan `oleh_nama` "Moderator", `boleh_tulis` true untuk moderator |
| T7 | GET riwayat | terbaru dulu, 2 baris |
| T8 | Staf pusdalops berwilayah 11 menulis kab provinsi 12 | 403; provinsi 11: 201 dan `oleh_nama` = nama staf |
| T9 | 121 tulis dalam 10 menit | 429 |
| T10 | Migrasi 0128 belum ada (`siapkan(..., {sampai: "0128_"})`) | 503 dengan pesan migrasi |
| T11 | Rencana kueri literal | tanpa pindai penuh (`gerbang-d1-pindai`) |

## Gerbang

`npm run uji:agen` (D1 hanya di hak.js, pindai, migrasi beku), `node --test tests/bnpb/dalops.test.mjs`.

## Layar

Tinjau di `http://localhost:8800/bnpb/dalops#banjir`, menu Penanganan: tanda status tampil, dialog terbuka, Simpan mengganti tanda dan hitungan pita, pemeriksa `inp-reviewer` dan `selera-angka`.
