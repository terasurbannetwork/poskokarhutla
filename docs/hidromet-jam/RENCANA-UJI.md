# RENCANA UJI

| Lapis | Uji | Data |
| --- | --- | --- |
| Pengurai | Mode `uji` tiap skrip menjalankan fixture ASLI tersimpan di `scripts/cuaca/fixture/` atau `scripts/udara/fixture/` (METAR WIII 17 Nov, teks ABIO10, pindaian Himawari, respons Open-Meteo) | asli, bukan mock |
| Logika | Kasus positif wajib terdeteksi (WIII 17 Nov untuk A1); kasus negatif (hari cerah) tidak | asli |
| Integrasi | Skrip dijalankan penuh ke berkas sementara, lalu skema keluaran diperiksa | jaringan hidup, dicatat bila gagal |
| Alarm palsu (A1, A2) | Dihitung dari arsip, dilaporkan per stasiun/kab per bulan. Tidak ada ambang yang disetel ulang memakai data 2026 tanpa PRAREG | arsip |
| Faktor model | Hanya lewat PRAREG: latih 2008-2019, validasi 2020-2022, arsip uji hanya MENOLAK, vonis prospektif | lab |
| Layar | `npm run uji:layar`, inp-reviewer, server lokal dengan data asli | asli |

Kasus studi (bukan validasi): Ciwidey 14 Nov, Cikalintu 16 Nov, Kota Bandung 17 Nov, Subulussalam dan Aceh Tamiang 12-17 Nov,
Jakarta 1 Jan 2020.
