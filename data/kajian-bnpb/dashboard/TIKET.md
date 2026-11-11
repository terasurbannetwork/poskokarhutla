# TIKET: Sistem Desain Dashboard (DB-*)

Kerjakan urut. Tiap tiket layar: baca dokumen "baca dulu" modulnya (AGENTS §2), pengerja = pemilik berkas
(`node scripts/agents/ilmu.mjs pemilik <berkas>`), pemeriksa `inp-reviewer` + `selera-angka`, tinjau di
`http://localhost:8800/<jalur>`. Dokumen KEPUTUSAN modul menang atas sistem ini bila bertentangan.

## Fondasi

| Tiket | Isi | Bukti siap |
| ----- | --- | ---------- |
| DB-01 | Ekstrak token + komponen `/operasi` ke `public/inti/dasbor.css` (`.db-*`), `/operasi` memakainya tanpa perubahan tampilan | tangkapan layar `/operasi` sebelum/sesudah sama; `npm run uji:agen` |
| DB-02 | Ekstrak pembantu ke `public/inti/dasbor.js` (`lbl`, `bagian`, `tabelH`, `urutTabel`, `lipatGrup`, saringan, `kolomSim`, `bukaDialog`, tooltip terang) | `/operasi` jalan; uji unit pembantu |
| DB-03 | Gerbang `tests/agen/gerbang-dasbor.test.mjs`: daftar LAYAR dashboard; tiap layar memuat `dasbor.css`, tanpa latar gelap selain L1/kepala tabel, tanpa `·`, wadah penumpuk gap >= 12px | gerbang merah pada pelanggaran buatan |
| DB-04 | Pasang uPlot di `public/vendor/uplot/` (MIT); grafik tren `/operasi` pindah ke uPlot dengan tooltip terang dan legenda di bawah | tren tampil sama/lebih baik; INP < 200ms |

## Penerapan per layar (urutan pemilik, D25)

| Tiket | Layar | Catatan |
| ----- | ----- | ------- |
| DB-10 | `/bnpb/dalops` | baca `data/kajian-bnpb/cek-kabar/` dulu |
| DB-11 | `/admin` | |
| DB-12 | `/operasi` Darat + `/bnpb/operasi_lapangan` | calon integrasi I1 |
| DB-13 | `/bnpb/kinerja`, `/bnpb/sitrep`, `/bnpb/siaga`, `/bnpb/logbook` | calon integrasi I2 |
| DB-14 | `/bnpb/rapor-sumber` + `/bnpb/silang` | calon integrasi I3; baca `data/kajian-bnpb/silang-sumber/` |
| DB-15 | `/bnpb/unit` | baca `data/kajian-bnpb/kedeputian/` |
| DB-16 | `/logpal` | baca `data/kajian-bnpb/logpal/` |
| DB-17 | `/siklus` | baca `data/kajian-bnpb/siklus/` |
| DB-18 | `/petugas` panel pimpinan | baca `data/kajian-bnpb/lapangan/` |
| DB-19 | `/kemitraan` | baca `data/kajian-bnpb/kampus/` |
| DB-20 | `/prediksi` | baca `data/kajian-bnpb/tangga/` |
| DB-21 | `/pipa` (SIPPA) | KEPUTUSAN-SIPPA menang; hanya token, kepala, pil, tabel (Q3) |

## Integrasi (D26), usulan menunggu persetujuan pemilik

Usulan di bawah baru dari nama dan peran layar; isi tiap layar belum diperiksa. Diperiksa di tiket layarnya sebelum digabung.

| Kode | Usulan |
| ---- | ------ |
| I1 | `/bnpb/operasi_lapangan` masuk `/operasi` sebagai seksi Darat (satu tautan Operasi: Udara, Darat) |
| I2 | `/bnpb/kinerja`, `/bnpb/sitrep`, `/bnpb/siaga`, `/bnpb/logbook` jadi satu layar Pusdalops berpanel seksi kiri (Siaga, Sitrep, Logbook, Kinerja) |
| I3 | `/bnpb/rapor-sumber` dan `/bnpb/silang` jadi satu layar Sumber Data (seksi Rapor sumber, Beda sumber) |
| I4 | `/bnpb/dalops` menampung I2 bila isinya beririsan (keputusan sesudah DB-10 dibaca) |
