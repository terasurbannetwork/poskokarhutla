---
kajian: air
lampiran: D
judul: Bendungan dalam Paket Data
status: final
---

# Bendungan dalam Paket Data {#lamp:bendungan}

Paket data kajian memuat {{angka:airjawa.bendungan.n_paket}} bendungan, dan {{angka:airjawa.bendungan.n_resmi_pj2021}} di antaranya bersumber dari inventaris resmi BBWS Pemali-Juana status Juli 2021 [@bbwspj-2021-bendungan]. Sisanya bersumber sekunder dan disajikan terpisah tanpa angka kapasitas. Kedua tabel bukan inventaris lengkap bendungan Pulau Jawa; daftar Rencana Tindak Darurat bendungan hulu permukiman diminta lewat @rek:r-a07.

::: tabel {#tbl:d-resmi}
judul: Bendungan dari inventaris resmi BBWS Pemali-Juana, status Juli 2021 (juta m³)
csv: data/air-jawa/bendungan.csv
saring: label_kapasitas=resmi
urut: -kapasitas_desain_juta_m3
kolom: nama="BENDUNGAN"; kab_nama="KAB/KOTA"; kapasitas_desain_juta_m3="VOLUME DESAIN (juta m³)" fmt=2; tampungan_terukur_juta_m3="TAMPUNGAN 2021 (juta m³)" fmt=2; sedimentasi_juta_m3="KEHILANGAN (juta m³)" fmt=2; kehilangan_tampungan_persen="KEHILANGAN (%)" fmt=2
sumber: BBWS Pemali-Juana, Daftar Inventarisasi Bendungan, status Juli 2021; pengolahan Pantau Bencana
keyakinan: resmi
data_per: 23 Okt 2026
catatan: Kehilangan = volume desain dikurangi tampungan 2021; persen seluruh balai di Subbab 4.4.
:::

::: tabel {#tbl:d-sekunder}
judul: Bendungan dari sumber sekunder dalam paket data menurut kab/kota dan status, 2021–2026
csv: data/air-jawa/bendungan.csv
saring: label_kapasitas=sekunder
kolom: nama="BENDUNGAN"; kab_nama="KAB/KOTA"; status="STATUS"
sumber: Berita dan laman instansi pemerintah yang tercatat per baris di paket data; pengolahan Pantau Bencana
keyakinan: terverifikasi
data_per: 23 Okt 2026
catatan: Kapasitas bersumber sekunder tidak disajikan karena belum dicocokkan ke dokumen balai.
:::
