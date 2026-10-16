# Banjir, longsor, rob (naik kelas)

Pengerja: `banjir`. Urutan: 1. Modul sudah hidup di `/banjir/` (13 skrip `scripts/banjir/`,
14 tab), tetapi tersembunyi dari menu. Tujuannya menutup celah terhadap PAKET-FITUR, lalu
`"status": "aktif"`. Rincian tahap ada di [`../FASE-0.md`](../FASE-0.md) tahap E.

## Daftar periksa (dari pemetaan 15 Okt 2026)

`ada` = sudah ada di kode, `celah` = harus dibuat, `T` = tidak berlaku.

| Kode | Kondisi | Catatan |
| --- | --- | --- |
| A01 | ada | Open-Meteo hujan kisi 0,25°, GloFAS 192 sungai, muka laut + gauge IOC |
| A02 | celah | Hanya harian; tambah potongan 24/72 jam untuk peringatan |
| A03 | celah | Peringatan BMKG ke `kejadian_langsung` tiap 15 menit |
| A04 | celah | Kejadian banjir `B` = kecamatan ≥ Siaga yang bersebelahan |
| A05 | celah | Atribut kejadian (luas kecamatan, penduduk, sungai, hujan, InaRISK) |
| A06 | celah | Poligon gabungan kecamatan |
| A07 | celah | `kejadian_awal` + `kejadian_geo` |
| A08–A11 | ada | hujan, ansambel 51 anggota, CAPE, kelembapan tanah |
| A12 | T | — |
| A13 | ada | `status.py` Normal/Waspada/Siaga/Awas, terkalibrasi DIBI |
| A14 | celah | Prioritas tertulis dengan angka uji balik |
| A15–A16 | ada | `riwayat.py`, kalender musim La Niña vs biasa |
| A17 | ada | memakai iklim |
| A18–A19 | ada | DIBI 11.374 baris, riwayat grid |
| A20 | ada | InaRISK, peringatan BMKG |
| A21 | ada | Posko tiga tingkat Perka BNPB 3/2016 |
| A22 | ada | Sarana |
| A23 | celah | Perahu karet / heli evakuasi: putuskan A atau T |
| A24 | ada | Keputusan Monte Carlo, CBA, SMAA |
| A25 | celah | Preventif (normalisasi, biopori, peringatan dini desa) |
| A26 | T | — |
| A27 | celah | Dampak: penduduk tergenang, sekolah, jalan putus, sawah, kerugian |
| A28–A29 | celah | Paparan penduduk dan fasilitas per kejadian |
| A30 | celah | `ringkasan.json` |
| A31 | T | Simulasi memakai aturan status, bukan cuaca per jam |
| A32 | celah | Citra sebelum/sesudah (Sentinel-2 bila awan memungkinkan) atau T dengan alasan |
| A33–A34 | celah | Berita dan video banjir |
| A35 | celah | Penerbangan/kereta/jalan tol terdampak: putuskan A atau T |
| A36 | ada | `param_banjir.json` (kurasi tangan) |
| A37 | ada | `meta.json` |
| A38 | ada | — |
| A39 | celah | Seri harian status per wilayah |
| A40 | celah | Unit respons banjir (BPBD, Basarnas, pos SAR) |
| B01 | ada | Aturan status (bukan ML) |
| B02 | ada | `uji_balik.py` POD/FAR/CSI/PSS/ETS 2016–2025 |
| B03 | celah | Prospektif append-only |
| B04–B06 | celah | Kasus besar, pendorong, tren |
| B07 | ada | Simulasi klien identik untuk 7.274 kecamatan |
| B08–B10 | ada | `RISET-*.md` |
| C01 | celah | Menu dari registry (FASE-0 A2) |
| C02 | celah | Tab hash → URL bersih (FASE-0 D4) |
| C03–C11, C13 | ada | — |
| C12 | celah | Laci kejadian banjir |
| C14–C15 | ada / celah | Insight 8 eksibit ada; tabel kejadian B celah |
| C16 | celah | Cerita banjir |
| C17 | celah | Berita |
| C18–C19 | ada | Tren, Posko, Sarana, Keputusan |
| C20 | celah | Dampak |
| C21 | celah | Dashboard pimpinan |
| C22–C24 | ada | Metode 17 bagian, Simulasi, Lapor Warga |
| C25 | celah | Foto: kategori banjir |
| C26 | celah | Pop-up situasi |
| C27 | ada | Bagikan cabang banjir |
| C28 | celah | OG per provinsi/kejadian |
| C29–C35 | ada / celah | i18n ada; Tentang dan statistik dari registry celah |
| C36 | celah | Pemilah bahaya di admin |
| C37–C39 | ada | Bersama |
| D01–D10 | sebagian | Ikut FASE-0 tahap C |
| E01–E10 | sebagian | `uji` tiap skrip ada; gerbang registry/inti celah |
| F01–F04 | sebagian | Pengerja `banjir` ada; dokumen ini baru |
