# API Laporan Karhutla: snapshot dan alur

Kode: `src/laporan_karhutla.js`. Spek bersama peramban dan Worker: `public/laporan_karhutla_spek.js`. Teks WA: `public/laporan_karhutla_wa.js`. Skema: `migrations/0032_laporan_karhutla.sql`. Alur dan hak: `SOP.md`.
Tanpa migrasi 0032 semua rute menjawab 503 `Laporan Karhutla belum diaktifkan`.

## Rute baca stabil: snapshot

`GET /api/laporan-karhutla/snapshot/:tanggal` (`:tanggal` = `tanggal_laporan` YYYY-MM-DD WIB)

- Akses: moderator (`modOK`), staf berperan apa pun (pimpinan baca saja). Akun instansi (pemprov) 403, tamu 401.
- Query: `?ralat=N` membuka versi lama (default = ralat terbaru). Nomor 0 = kunci pertama.
- 404 bila hari belum dikunci atau nomor ralat tidak ada. Snapshot yang sudah dikunci tidak pernah berubah; koreksi menjadi `ralat+1`.
- Respons:

```json
{"tanggal": "2026-10-21", "ralat": 0, "terbaru": true, "hash": "<sha256 isi>", "utuh": true, "dikunci_pada": 1792000000000,
 "alasan_ralat": null, "perubahan": [], "ralat_tersedia": [{"ralat": 0, "hash": "...", "alasan": null, "waktu": 0, "berubah": 0}],
 "snapshot": { ... }, "teks_wa": {"laporan_karhutla": "...", "gelar_pesawat": "...", "rekap_dry_ice": "...", "hasil_hujan_omc": "..."}}
```

`utuh` = sha256 teks `snapshot` sama dengan `hash` yang dibekukan. Pembaca (deck PPTX/PDF, dashboard) HANYA membaca angka dari sini dan tidak mengetik ulang.

### Bentuk `snapshot` (skema 1)

| Kunci | Isi |
| --- | --- |
| `tanggal_laporan`, `tanggal_data` | D dan D-1; jangan tertukar |
| `ralat`, `alasan_ralat`, `status`, `dikunci_oleh` (`admin`/`staf`), `dikunci_pada` | `status` = `dikunci` atau `dikunci_pengecualian` |
| `pengecualian[]` | `{sumber, label, alasan, data_terakhir}`: "lanjut tanpa X"; wajib dicetak di slide dan teks |
| `prioritas[]` | kode provinsi prioritas hari itu (urutan deck) |
| `nasional` | slide 1: `fs_ha {fs, fs_padam, fs_sisa, target_ha, padam_ha, sisa_ha}`, `hotspot {total, tinggi, sedang, sumber}`, `personel {total, unsur, tanpa_rincian, standby}`, `peralatan[]`, `kumulatif_tidak_dijumlah[]`, `udara`, `omc` |
| `wilayah[]` | slide 2: Kalimantan dan Sumatera (jumlah dari provinsi) |
| `provinsi[]` | slide 3: per provinsi `total`, `blok[]` (mis. Kalteng di luar TNTP dan TNTP), `fs[]`, `hotspot`, `personel`, `peralatan`, `kondisi`, `hambatan`, `upaya`, `darurat`, `lanjut_tanpa`, `data_terakhir` |
| `udara`, `omc`, `di_luar_prioritas` | sortie lintas provinsi dihitung SEKALI (`lintas_provinsi` = berapa yang lintas); `per_provinsi` menghitung per provinsi |
| `tiga_hari[]`, `riwayat[]` | dibaca dari snapshot sebelumnya, bukan dihitung ulang; `tiga_hari` = dua snapshot terakhir + hari ini |
| `lampiran` | `A1_fs_per_provinsi`, `A2_rincian_fs`, `A3_personel`, `A4_peralatan`, `A5_kondisi_wilayah`, `A6_hambatan_upaya`, `A7_kedaruratan`, `A8_armada_udara`, `A9_water_bombing_patroli`, `A10_omc`, `A11_di_luar_prioritas`, `B1_hotspot_provinsi`, `B2_tren_hotspot`, `B3_konsesi_gambut`, `B4_konsesi_terindikasi`, `B5_riwayat_tahunan` |
| `satelit` | `null` bila `public/data/laporan.json` tidak terbaca saat kunci |
| `kesimpulan[]` | kalimat otomatis dari angka |

Pemetaan A1-A11 dan B1-B5 ke nomor slide deck adalah usulan dari SOP §5 dan boleh digeser penggambar deck; kuncinya stabil. Nilai tak tersedia = `null` (jujur, bukan 0): `B3_konsesi_gambut` selalu `null` (belum ada aset persen konsesi/gambut per provinsi), `B4`/`B5` `null` bila aset satelit kosong. Nama perusahaan lampiran B hanya di laporan berotorisasi.

## Rute alur

| Rute | Hak | Fungsi |
| --- | --- | --- |
| `GET /api/laporan-karhutla/hari?tanggal=` | staf, moderator | kelengkapan per sumber, status hari, cek, tautan tagih WA; tanpa `tanggal` = 40 hari terakhir |
| `GET /api/laporan-karhutla/kiriman?tanggal=&sumber=` | pemilik sumber, staf, moderator | isi (draf otomatis bila belum ada), cek, riwayat; provinsi lain 404 |
| `POST /api/laporan-karhutla/draf` | pemilik sumber | simpan draf: `{tanggal, sumber, isi, versi_dasar, klien_id}`; 409 + header `x-versi` bila `versi_dasar` basi |
| `POST /api/laporan-karhutla/kirim` | pemilik sumber | validasi ulang di Worker + cek merah/kuning; menulis `lk_fs` untuk provinsi |
| `POST /api/laporan-karhutla/verifikasi` | verifikator, pusdalops, moderator | `{tanggal, sumber, aksi: setujui\|kembalikan, versi, catatan}`; setujui ditolak 422 bila ada cek merah |
| `POST /api/laporan-karhutla/prioritas` | verifikator | provinsi prioritas hari itu (sebelum kunci) |
| `POST /api/laporan-karhutla/kunci` | verifikator | `{tanggal, lanjut_tanpa: [{sumber, alasan}]}`; 409 + `belum[]` bila sumber wajib belum disetujui |
| `POST /api/laporan-karhutla/ralat` | verifikator | `{tanggal, alasan, ganti: {sumber: isi}}`; snapshot baru, lama utuh |
| `POST /api/laporan-karhutla/dummy` | Super Admin | `{aksi: isi\|hapus}` hari contoh 21 Okt 2026 |
| alias `GET /api/instansi/laporan/kiriman`, `POST /api/instansi/laporan/draf`, `POST /api/instansi/laporan/kirim` | akun pemprov aktif | jalur untuk halaman `/instansi` (cookie sesi instansi hanya terkirim ke `/api/instansi`); handler sama |

Operator provinsi = akun instansi `pemprov` aktif (satu provinsi, POST wajib `x-pb: 1`). Udara = staf `udara`, OMC = staf `tmc`, Koordalops = staf `koordalops` (moderator boleh mengisi ketiganya).
Draf otomatis tiap hari: cron `* * * * *` pada 00.01 UTC (07.01 WIB) dan 00.31 UTC (ulang bila gagal), idempoten.
