---
kajian: air
bab: 2
judul: Profil Risiko Musim Hujan
pertanyaan: Kab/kota mana di Pulau Jawa yang paling berisiko tergenang saat musim hujan, dan seberapa besar skenario terburuknya?
status: draf
target_halaman: 20
---

# Profil Risiko Musim Hujan {#bab:musim-hujan}

::: ringkasan-bab
**Temuan:**

- IRB nasional {{angka:irbi.nasional.persen_2015_2024|fmt=1|persen|arah}} dari 2015 ke 2024, tetapi {{angka:irbi.kab.tinggi.2023}} kab/kota masih kelas Tinggi pada 2023.
- Musim hujan La Niña {{angka:hidromet.jawa.lanina.tahun_analog|tahun}}/2021 menjadi analog skenario terburuk Pulau Jawa.

**Angka kunci:**

- Korban jiwa skenario {{angka:hidromet.jawa.lanina.korban_jiwa|satuan}}.

**Rekomendasi:** @rek:peringatan-dini, @rek:data-genangan
:::

## Sebaran Risiko Banjir {#sub:sebaran}

Indeks Risiko Bencana (IRB) nasional turun dari {{angka:irbi.nasional.2015|fmt=1}} pada 2015 menjadi
{{angka:irbi.nasional.2024|fmt=2}} pada 2024 [@bnpb-2025-renas]. Rerata kab/kota di Pulau Jawa
{{angka:irbi.jawa.2024|fmt=1}} pada 2024[^pulau]. Rencana Nasional Penanggulangan Bencana (Renas PB) menetapkan penurunan nilai IRB sebagai
indikator tata kelola [@bnpb-2025-renas, hlm. 32–33], dan Rencana Strategis (Renstra) Badan Nasional Penanggulangan Bencana (BNPB) [-@bnpb-2025-renstra]
memuat tren IRB sejak 2019. Kedua dokumen menjadi rujukan sasaran 2030
[@bnpb-2025-renas; @bnpb-2025-renstra]. Kewenangan menyusun kajian risiko berasal dari
@ri-2007-uu24.

Sebaran kelas Indeks Risiko Bencana Indonesia (IRBI) kab/kota tampil pada @gbr:peta-banjir, dan delapan kab/kota
dengan IRB tertinggi pada @tbl:irbi-jawa.

::: gambar {#gbr:peta-banjir}
berkas: naskah/_contoh/gambar/peta-irbi-total-2024-nasional.png
jenis: peta
judul: Kelas IRBI kab/kota di Indonesia, IRBI 2024
sumber: InaRISK BNPB, IRBI 2024; ambang kelas Tinggi turunan Renstra dan Renas PB, pengolahan Pantau Bencana
keyakinan: asumsi-kebijakan
lebar: penuh
data_per: 23 Okt 2026
:::

::: tabel {#tbl:irbi-jawa}
judul: Delapan kab/kota di Pulau Jawa dengan IRB tertinggi, IRBI 2025
csv: data/irbi/irbi_kab_2025.csv
saring: pulau=Jawa
urut: -total
batas: 8
kolom: nama_kepmendagri="KAB/KOTA"; prov_nama="PROVINSI"; penduduk_2026="PENDUDUK (jiwa)" fmt=0; total="IRB" fmt=1; status_total_resmi="KELAS"
peringkat: ya
sumber: InaRISK BNPB, IRBI 2025; WorldPop 2026
keyakinan: resmi
data_per: 23 Okt 2026
catatan: Kolom penduduk dari WorldPop 2026 berlabel asumsi kebijakan.
:::

::: catatan
IRBI 2025 memakai skala yang berbeda dari IRBI 2015–2024, sehingga nilai 2025 tidak
dibandingkan langsung dengan tahun sebelumnya.
:::

::: kartu-angka
pil: DATA RESMI
nada: data
sumber: InaRISK BNPB, IRBI 2023 dan 2024
keyakinan: resmi

| NILAI | SATUAN | LABEL | IKON | WARNA |
| --- | --- | --- | --- | --- |
| {{angka:irbi.kab.tinggi.2023}} | kab/kota | kelas Tinggi IRBI 2023 | wilayah | navy |
| {{angka:irbi.kab.dinilai.2023}} | kab/kota | dinilai IRBI 2023 | wilayah | |
| {{angka:irbi.nasional.2024|fmt=2}} | | IRB nasional 2024 | data | navy |
:::

::: temuan
judul: {{angka:irbi.kab.tinggi.2023}} dari {{angka:irbi.kab.dinilai.2023}} kab/kota masih kelas Tinggi IRBI pada 2023
sifat: fakta

**Bukti:** IRBI mencatat {{angka:irbi.kab.tinggi.2023}} kab/kota kelas Tinggi pada 2023 [@bnpb-irbi].

**Dampak:** Kab/kota kelas Tinggi menjadi sasaran pertama kajian risiko dan peringatan dini;
skenario musim hujan Pulau Jawa ada di @sub:skenario.

**Pembuka:** Pusat Data, Informasi, dan Komunikasi Kebencanaan membuka data genangan per
kab/kota (rekomendasi @rek:data-genangan).
:::

::: koreksi
IRB nasional adalah rerata indeks gabungan; nilainya dapat turun karena kapasitas naik walau
bahaya banjir di kab/kota yang sama tetap.
:::

## Skenario Musim Hujan Terburuk yang Masuk Akal {#sub:skenario}

### Dasar Skenario

Skenario memakai musim La Niña {{angka:hidromet.jawa.lanina.tahun_analog|tahun}}/2021 sebagai
analog, dipilih dari musim La Niña sejak 2008 [@bnpb-dibi]. Korban jiwa berupa rentang model
{{angka:hidromet.jawa.lanina.korban_jiwa|satuan}} yang belum diuji balik; rumah rusak dan pengungsi adalah catatan
resmi musim analog.

:::: skenario {#tbl:skenario-hujan}
jenis: banjir
judul: Musim hujan La Niña setara 2020/2021 di Pulau Jawa
dasar: Musim analog dipilih dari musim La Niña 2008 sampai 2025 menurut peringkat gabungan kejadian, korban, pengungsi, dan rumah rusak DIBI; ekstrem yang sangat tidak mungkin disisihkan.
kemungkinan: 4
peta: gambar/air/jejak-skenario-hujan.png
lembaga: Deputi Bidang Penanganan Darurat; BMKG; Kementerian Pekerjaan Umum; BPBD provinsi
sumber: DIBI BNPB 2008–2026; InaRISK BNPB; simulasi skenario Pantau Bencana
kaki: Simulasi skenario Pantau Bencana, belum divalidasi; korban jiwa berupa rentang model.
data_per: 23 Okt 2026

::: kerusakan
| BESARAN | RENDAH | TINGGI | KEYAKINAN | SUMBER |
| --- | ---: | ---: | --- | --- |
| Kependudukan: korban jiwa | {{angka:hidromet.jawa.lanina.korban_jiwa|rendah}} | {{angka:hidromet.jawa.lanina.korban_jiwa|tinggi}} | estimasi-model | DIBI; simulasi |
| Kependudukan: pengungsi tercatat | {{angka:hidromet.jawa.lanina.mengungsi}} | – | resmi | DIBI |
| Kependudukan: pengungsi-hari | {{angka:hidromet.jawa.lanina.hari_mengungsi|rendah}} | {{angka:hidromet.jawa.lanina.hari_mengungsi|tinggi}} | asumsi-kebijakan | DIBI; asumsi lama |
| Infrastruktur/fisik: rumah rusak berat | {{angka:hidromet.jawa.lanina.rumah_rusak_berat}} | – | resmi | DIBI |
| Infrastruktur/fisik: rumah rusak sedang | {{angka:hidromet.jawa.lanina.rumah_rusak_sedang}} | – | resmi | DIBI |
| Infrastruktur/fisik: rumah rusak ringan | {{angka:hidromet.jawa.lanina.rumah_rusak_ringan}} | – | resmi | DIBI |
| Lingkungan: bahaya tinggi banjir | {{angka:hidromet.jawa.lanina.luas_bahaya_tinggi_banjir|ringkas|satuan}} | – | resmi | InaRISK |
| Ekonomi: stimulan rumah | {{angka:hidromet.jawa.lanina.materiil_batas_bawah|rendah|rupiah}} | {{angka:hidromet.jawa.lanina.materiil_batas_bawah|tinggi|rupiah}} | asumsi-kebijakan | stimulan BNPB |
| Layanan sipil: sekolah, faskes | – | – | – | menunggu data K/L |
| Kebutuhan respons: logistik | – | – | – | menunggu data pengungsi |
:::

::: kebijakan
Bila cakupan peringatan dini naik ke target Renas 2029, korban jiwa skenario dihitung
{{angka:hidromet.jawa.lanina.pd_renas.korban_jiwa|fmt=0|satuan}}, dibanding
{{angka:hidromet.jawa.lanina.korban_jiwa|satuan}} pada cakupan sekarang.
:::

::: kepekaan
| TUAS | NILAI DASAR | NILAI DIGESER | KORBAN JIWA | KERUGIAN MATERIIL |
| --- | ---: | ---: | ---: | --- |
| Cakupan peringatan dini (Renas 1.c) | {{angka:hidromet.jawa.lanina.pd_renas.cakupan_2025|satuan}} | {{angka:hidromet.jawa.lanina.pd_renas.cakupan_2029|satuan}} | {{angka:hidromet.jawa.lanina.pd_renas.korban_jiwa|fmt=0}} | tidak berubah: peringatan dini tidak mengurangi rumah rusak |
| Cakupan peringatan dini (Renstra) | {{angka:hidromet.jawa.lanina.pd_renstra.cakupan_2025|fmt=2|satuan}} | {{angka:hidromet.jawa.lanina.pd_renstra.cakupan_2029|fmt=2|satuan}} | {{angka:hidromet.jawa.lanina.pd_renstra.korban_jiwa|fmt=0}} | tidak berubah |
:::

::: respons
- Pos komando aktif di kab/kota kelas Tinggi saat peringatan banjir terbit.
- Logistik dan tempat pengungsian disiapkan sebelum puncak musim hujan.
- BPBD mengirim data genangan harian ke BNPB.
:::

::: pemulihan
- Kajian kebutuhan pascabencana memakai data rumah rusak per kab/kota.
- Kementerian Pekerjaan Umum memperbaiki tanggul dan saluran.
- Stimulan rumah untuk rumah rusak berat dan sedang.
:::
::::

#### Pembanding dari Luar Negeri

::: program
nama: Paket kesiapsiagaan siklon Bangladesh
lokasi: Bangladesh
lembaga: Pemerintah Bangladesh; Bulan Sabit Merah Bangladesh
periode: 1970–2007
dampak: Kematian akibat siklon turun dari {{angka:bukti.bangladesh_siklon.kematian_1970|satuan}} pada 1970 menjadi {{angka:bukti.bangladesh_siklon.kematian_2007|satuan}} pada 2007
sumber: @haque-2012-siklon
keyakinan: terverifikasi
jenis: program

**Yang dilakukan:** peringatan dini siklon berjenjang sampai desa, tempat perlindungan
siklon, tanggul pesisir, dan relawan desa.

**Yang ditiru:** peringatan dini yang sampai ke desa dan rute evakuasi ke tempat
perlindungan yang dikenal warga.

**Yang tidak cocok:** penurunan itu hasil paket selama empat dekade; tidak ada satu program
yang bisa diberi seluruh penurunan.

**Penyesuaian Indonesia:** untuk banjir bandang dan longsor yang berwaktu tunggu pendek,
manfaat peringatan dini lebih kecil daripada untuk siklon.
:::

## Strategi Musim Hujan {#sub:strategi}

::: garis-waktu {#tbl:garis-waktu-hujan}
judul: Aksi prabencana, tanggap darurat, dan pascabencana musim hujan di Pulau Jawa, 2026–2030
musim: hujan
sumber: Rekomendasi kajian ini
keyakinan: asumsi-kebijakan

| FASE | AKSI | REK | LEMBAGA |
| --- | --- | --- | --- |
| prabencana | Perbarui peta risiko banjir kab/kota kelas Tinggi | @rek:data-genangan | Pusat Data, Informasi, dan Komunikasi Kebencanaan |
| prabencana | Sebarkan peringatan dini berbasis dampak sebelum musim hujan | @rek:peringatan-dini | Direktorat Peringatan Dini |
| prabencana | Latih BPBD membaca prakiraan musim hujan BMKG | @rek:peringatan-dini | Direktorat Kesiapsiagaan |
| tanggap-darurat | Aktifkan pos komando saat peringatan banjir terbit | @rek:peringatan-dini | Deputi Bidang Penanganan Darurat |
| tanggap-darurat | Catat genangan harian per kab/kota | @rek:data-genangan | BPBD kab/kota |
| tanggap-darurat | Salurkan logistik ke lokasi pengungsian tercatat | @rek:data-genangan | Deputi Bidang Logistik dan Peralatan |
| pascabencana | Kaji kebutuhan pascabencana dengan data genangan | @rek:data-genangan | Deputi Bidang Rehabilitasi dan Rekonstruksi |
| pascabencana | Evaluasi ketepatan peringatan dini musim berjalan | @rek:peringatan-dini | Direktorat Peringatan Dini |
| pascabencana | Perbarui kajian risiko dengan kejadian musim berjalan | @rek:data-genangan | Direktorat Pemetaan dan Evaluasi Risiko Bencana |
:::

:::: matriks-rekomendasi {#tbl:rekomendasi-hujan}
judul: Rekomendasi internal BNPB untuk musim hujan di Pulau Jawa, 2026–2030
kelompok: internal
sumber: Analisis kajian ini; Renas PB 2025–2029
keyakinan: asumsi-kebijakan

::: rek {#rek:peringatan-dini}
langkah: Perluas peringatan dini banjir kab/kota kelas Tinggi
jenis: data
status: dikembangkan
program: Layanan peringatan dini cuaca BMKG
unit: Direktorat Peringatan Dini; Direktorat Kesiapsiagaan
kl: BMKG; Kementerian Pekerjaan Umum
waktu: 2026-2027
indikator: cakupan peringatan dini masyarakat terpapar mencapai {{angka:hidromet.jawa.lanina.pd_renas.cakupan_2029|satuan}}
dasar: Renas PB 2025–2029 indikator 1.c [@bnpb-2025-renas]
butuh: @rek:data-genangan

Cakupan peringatan dini masyarakat terpapar di kawasan risiko tinggi baru
{{angka:hidromet.jawa.lanina.pd_renas.cakupan_2025|satuan}}, di bawah target Renas 2029.
:::

::: rek {#rek:data-genangan}
langkah: Buka data genangan musim hujan per kab/kota
jenis: data
status: baru
unit: Pusat Data, Informasi, dan Komunikasi Kebencanaan
kl: Kementerian Pekerjaan Umum; BMKG
waktu: 100-hari
indikator: data genangan musim hujan 2026/2027 terbit per kab/kota sebelum Maret 2027
dasar: UU 24/2007 [@ri-2007-uu24]

Data genangan per kab/kota belum terbuka, sehingga kajian risiko dan evaluasi peringatan dini
belum bisa diuji terhadap kejadian.
:::
::::

::: matriks-lembaga {#tbl:lembaga-hujan}
judul: Pembagian tugas lembaga per fase musim hujan, 2026–2030
sumber: UU 24/2007; analisis kajian ini
keyakinan: asumsi-kebijakan

| LEMBAGA | PRABENCANA | TANGGAP DARURAT | PASCABENCANA |
| --- | --- | --- | --- |
| BNPB | pemimpin: peringatan dini dan kajian risiko (@rek:peringatan-dini) | pemimpin: komando tanggap darurat bersama BPBD | pemimpin: kajian kebutuhan pascabencana |
| BMKG | pemimpin: prakiraan musim hujan dan peringatan dini cuaca | pendukung: pembaruan peringatan cuaca selama kejadian | tidak berlaku: pemulihan prasarana dan permukiman di luar kewenangan BMKG |
| Kementerian Pekerjaan Umum | pemimpin: operasi waduk dan pemeliharaan tanggul | pendukung: perbaikan darurat tanggul | pemimpin: rehabilitasi prasarana sumber daya air |
| BPBD | pendukung: penyebaran peringatan dini ke desa | pemimpin: penanganan darurat di kab/kota | pendukung: pendataan kerusakan |
:::

::: matriks-jenis {#tbl:jenis-hujan}
judul: Aksi per fase untuk dua ancaman musim hujan, 2026–2030
sumber: Rekomendasi kajian ini
keyakinan: asumsi-kebijakan

| JENIS | PRABENCANA | TANGGAP DARURAT | PASCABENCANA |
| --- | --- | --- | --- |
| banjir | peringatan dini berbasis dampak (@rek:peringatan-dini) | pencatatan genangan harian (@rek:data-genangan) | kajian kebutuhan dengan data genangan (@rek:data-genangan) |
| rob | peringatan pasang tinggi (@rek:peringatan-dini) | pencatatan genangan rob (@rek:data-genangan) | tidak berlaku: pemulihan pesisir dibahas di Bab 4 |
:::

::: keputusan
judul: Keputusan yang diminta dari Kepala BNPB

- Menetapkan target cakupan peringatan dini kab/kota kelas Tinggi di Pulau Jawa sebelum musim hujan 2026/2027.
  - Bila ditetapkan: BPBD bekerja dengan sasaran yang sama dengan Renas PB 2025–2029.
  - Bila tidak: cakupan mengikuti kemampuan tiap daerah.
:::

[^pulau]: Rerata sederhana kab/kota per pulau; pengelompokan pulau adalah pilihan penyusun.
