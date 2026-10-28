---
kajian: neraca-air
lampiran: A
judul: Tabel Neraca per Kab/Kota
status: draf
orientasi: lanskap
---

# Tabel Neraca per Kab/Kota {#lamp:tabel-kab}

Kedua tabel memuat seluruh {{angka:neraca.jawa.n_kab}} kab/kota Pulau Jawa dari katalog wilayah paket data, dikelompokkan per provinsi [@pantaubencana-2026-neraca-air]. Semua angka neraca berlabel estimasi model; nilai Juni–Oktober per kab/kota adalah indikasi urutan karena aliran kemarau belum lolos validasi (Bab 8). Neraca memuat air yang lewat dari hulu dan tidak boleh dijumlahkan antar-kab/kota.

::: tabel {#tbl:a-neraca}
judul: Limpasan, aliran dari hulu, kebutuhan konsumtif, dan neraca tahunan, Juni–Oktober, kemarau andalan, serta iklim 1997 per kab/kota Pulau Jawa, 1991–2025 (juta m³)
csv: data/neraca-air/kab.csv
kolom: nama_tanda="KAB/KOTA"; prov_nama="PROVINSI"; R_tahunan="LIMPASAN" fmt=0; qin_tahunan="DARI HULU" fmt=0; konsumtif_tahunan="KONSUMTIF" fmt=0; N_tahunan="TAHUNAN" fmt=0; N_kemarau="JUN–OKT" fmt=0; N80_kemarau="ANDALAN" fmt=0; N_kemarau_1997="IKLIM 1997" fmt=0; ddl_status="DDL"
grup: PROVINSI
sumber: Pengolahan data Pantau Bencana, model neraca air kajian ini; WorldPop dan BPS untuk penduduk
keyakinan: estimasi-model
catatan: † tanpa industri; ‡ kota kecil; DDL = status gaya Permen LH 17/2009, bukan status resmi.
:::

::: tabel {#tbl:a-kebutuhan}
judul: Kebutuhan air per sektor per kab/kota Pulau Jawa, kebutuhan 2025 dan proyeksi 2030 (juta m³ per tahun)
csv: data/neraca-air/kab.csv
kolom: nama_tanda="KAB/KOTA"; prov_nama="PROVINSI"; domestik_tahunan="DOMESTIK" fmt=1; irigasi_tahunan="IRIGASI" fmt=0; ternak_tahunan="TERNAK" fmt=1; industri_tahunan="INDUSTRI" fmt=1; konsumtif_tahunan="KONSUMTIF" fmt=0; N2030_tahunan="NERACA 2030" fmt=0; bulan_defisit="BULAN NEGATIF" fmt=0
grup: PROVINSI
sumber: Pengolahan data Pantau Bencana dari WorldPop, BPS, Permen PUPR 14/PRT/M/2015, dan koefisien SNI Neraca Sumber Daya Air 2002
keyakinan: estimasi-model
catatan: Industri "–" = data tenaga kerja industri BPS tidak tersedia; irigasi = kebutuhan potensial gaya KP-01.
:::
