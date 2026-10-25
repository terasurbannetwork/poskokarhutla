---
kajian: air
lampiran: B
judul: Profil Provinsi
status: final
---

# Profil Provinsi {#lamp:provinsi}

Profil enam provinsi Pulau Jawa merangkum {{angka:airjawa.jawa.n_kab}} kab/kota menurut provinsi, dari paket data yang sama dengan Lampiran A [@bnpb-irbi; @bnpb-dibi; @pupr-2015-permen14]. Rekap irigasi per provinsi memakai total tercetak Permen PUPR 14/2015, sehingga dapat berbeda dari jumlah kab/kota di Lampiran A; selisihnya diurai di Lampiran F.

::: tabel {#tbl:b-risiko}
judul: Kab/kota, penduduk, kab/kota berkelas IRB tinggi, dan catatan DIBI bahaya air per provinsi Pulau Jawa, 2015–2025
csv: data/air-jawa/provinsi.csv
kolom: prov_nama="PROVINSI"; n_kab="KAB/KOTA" fmt=0; penduduk_worldpop_2026="PENDUDUK 2026 (jiwa)" fmt=0; irbi2025_n_kab_tinggi="KAB/KOTA IRB TINGGI" fmt=0; dibi1525_kejadian_banjir="KEJADIAN BANJIR" fmt=0; dibi1525_kejadian_longsor="KEJADIAN LONGSOR" fmt=0; dibi1525_kejadian_kekeringan="KEJADIAN KEKERINGAN" fmt=0; dibi1525_meninggal_hilang_air="MENINGGAL DAN HILANG (jiwa)" fmt=0
total: ya
sumber: InaRISK BNPB, IRBI 2025; DIBI BNPB 2015–2025; WorldPop 2026; pengolahan Pantau Bencana
keyakinan: resmi
data_per: 23 Okt 2026
catatan: Kejadian lintas kab/kota dibagi rata, dijumlah per provinsi; data DIBI 2024 tidak lengkap.
:::

::: tabel {#tbl:b-komponen}
judul: Akses air minum, luas daerah irigasi, bendungan dalam paket, dan wilayah sungai per provinsi Pulau Jawa, 2015–2025
csv: data/air-jawa/provinsi.csv
kolom: prov_nama="PROVINSI"; air_minum_layak_2025="AIR MINUM LAYAK 2025 (%)" fmt=2; air_minum_leding_2023="LEDING 2023 (%)" fmt=2; irigasi_total_ha_tercetak="IRIGASI TERCETAK (ha)" fmt=0; irigasi_permukaan_ha_rekap="IRIGASI PERMUKAAN (ha)" fmt=0; n_bendungan_dalam_paket="BENDUNGAN DALAM PAKET" fmt=0; n_ws="WILAYAH SUNGAI" fmt=0
sumber: BPS 2023 dan 2025; Permen PUPR 14/2015; Permen PUPR 4/2015; pengolahan Pantau Bencana
keyakinan: resmi
data_per: 23 Okt 2026
catatan: DKI Jakarta tanpa daerah irigasi; WS lintas provinsi terhitung di tiap provinsi, jadi tidak dijumlah.
:::
