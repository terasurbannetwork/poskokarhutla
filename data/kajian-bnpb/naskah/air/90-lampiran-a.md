---
kajian: air
lampiran: A
judul: Tabel Indikator Kab/Kota
status: final
orientasi: lanskap
---

# Tabel Indikator Kab/Kota {#lamp:indikator}

Kedua tabel lampiran ini memuat seluruh {{angka:airjawa.jawa.n_kab}} kab/kota Pulau Jawa dari katalog wilayah paket data, termasuk wilayah yang datanya belum tersedia, dikelompokkan per provinsi. Nilai IRBI dan kelasnya berasal dari InaRISK [@bnpb-irbi], hitungan kejadian dan korban dari DIBI [@bnpb-dibi], dan komponen air dari BPS dan Permen PUPR 14/2015 [@bps-2025-air-minum-layak-prov; @pupr-2015-permen14]. Tabel ini disusun platform Pantau Bencana dari data produsen tersebut dan bukan Data Bencana menurut Perban BNPB 1/2023 [@bnpb-2023-satudata]; tingkat data tiap komponen mengikuti @tbl:resolusi.

::: tabel {#tbl:a-risiko}
judul: Penduduk, IRBI 2025, dan catatan DIBI bahaya air per kab/kota Pulau Jawa, 2015–2025
csv: data/air-jawa/kab_jawa.csv
kolom: nama_kepmendagri="KAB/KOTA"; prov_nama="PROVINSI"; penduduk_worldpop_2026="PENDUDUK 2026 (jiwa)" fmt=0; irbi2025_total="IRB 2025" fmt=1; irbi2025_status="KELAS IRB"; dibi1525_kejadian_banjir="KEJADIAN BANJIR" fmt=0; dibi1525_kejadian_longsor="KEJADIAN LONGSOR" fmt=0; dibi1525_kejadian_kekeringan="KEJADIAN KEKERINGAN" fmt=0; dibi1525_meninggal_hilang_air="MENINGGAL DAN HILANG (jiwa)" fmt=0
grup: PROVINSI
sumber: InaRISK BNPB, IRBI 2025; DIBI BNPB 2015–2025; WorldPop 2026; pengolahan Pantau Bencana
keyakinan: resmi
data_per: 23 Okt 2026
catatan: Kejadian lintas kab/kota dibagi rata dan dibulatkan; data DIBI 2024 tidak lengkap karena patahan seri.
:::

::: tabel {#tbl:a-komponen}
judul: Komponen air per kab/kota Pulau Jawa menurut tingkat data, 2023–2025
csv: data/air-jawa/kab_jawa.csv
kolom: nama_kepmendagri="KAB/KOTA"; prov_nama="PROVINSI"; tingkat_data_air_minum="TINGKAT DATA AIR MINUM"; air_minum_layak_kab_2025="AIR MINUM LAYAK 2025 (%)" fmt=2; irigasi_pusat_ha="IRIGASI PUSAT (ha)" fmt=0; irigasi_total_ha="IRIGASI TOTAL (ha)" fmt=0
grup: PROVINSI
sumber: BPS 2025; Permen PUPR 14/2015 Lampiran I–III; pengolahan Pantau Bencana
keyakinan: resmi
data_per: 23 Okt 2026
catatan: Air minum layak hanya untuk Jawa Tengah; irigasi = DI pusat, provinsi, dan kab/kota yang teratribusi.
:::
