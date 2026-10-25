---
kajian: air
bab: 1
judul: Pendahuluan
pertanyaan: Mengapa Kepala BNPB membutuhkan kajian ketahanan air Pulau Jawa sekarang, dan apa batas kajian ini?
status: draf
---

# Pendahuluan {#bab:pendahuluan}

::: ringkasan-bab
**Temuan:**

- IRB nasional {{angka:irbi.nasional.persen_2015_2024|fmt=1|persen|arah}} dari 2015 ke 2024, tetapi penurunannya tidak merata antarkab/kota.

**Angka kunci:**

- {{angka:irbi.kab.tinggi.2023}} kab/kota kelas Tinggi IRBI 2023.

**Rekomendasi:** @rek:peringatan-dini
:::

## Latar Belakang {#sub:latar}

Indeks Risiko Bencana (IRB) nasional turun dari {{angka:irbi.nasional.2015|fmt=1}} pada 2015 menjadi {{angka:irbi.nasional.2024|fmt=2}}
pada 2024 [@bnpb-2025-renas], atau {{angka:irbi.nasional.persen_2015_2024|fmt=1|persen|arah}} dalam sembilan tahun.
Penurunan itu tidak merata: {{angka:irbi.kab.tinggi.2023}} dari {{angka:irbi.kab.dinilai.2023}} kab/kota masih
kelas Tinggi pada 2023[^kelas]. Tren tahunan tampil pada @gbr:tren-irb, dan sebaran per provinsi di Pulau Jawa
pada @tbl:provinsi.

::: gambar {#gbr:tren-irb}
berkas: naskah/_contoh/gambar/batang-irbi-nasional-2015-2024.png
jenis: grafik
judul: IRB nasional per tahun, 2015–2024 (indeks, rerata sederhana kab/kota)
sumber: InaRISK BNPB, IRBI 2015–2024
keyakinan: resmi
lebar: penuh
data_per: 23 Okt 2026
:::

Rencana Nasional Penanggulangan Bencana (Renas PB) menempatkan penurunan IRB sebagai indikator tata kelola penanggulangan bencana
[@bnpb-2025-renas, hlm. 32–33]. Rencana Strategis (Renstra) Badan Nasional Penanggulangan Bencana (BNPB) [-@bnpb-2025-renstra] memakai indikator yang sama untuk unit kerja,
sehingga kajian ini membaca angka risiko dari sumber yang sama dengan dokumen perencanaan BNPB[^sumber].

::: tabel {#tbl:provinsi}
judul: Enam provinsi di Pulau Jawa menurut rerata IRB kab/kota, IRBI 2024
csv: data/irbi/irbi_agregat_provinsi.csv
saring: pulau=Jawa; tahun=2024
urut: -total_sederhana
kolom: prov_nama="PROVINSI"; n_kab="KAB/KOTA" fmt=0; total_sederhana="IRB RERATA" fmt=1; n_tinggi="KELAS TINGGI (kab/kota)" fmt=0; n_sedang="KELAS SEDANG (kab/kota)" fmt=0
peringkat: ya
sorot: Jawa Tengah
sumber: InaRISK BNPB, IRBI 2024; pengolahan data Pantau Bencana
keyakinan: resmi
data_per: 23 Okt 2026
:::

### Dasar Hukum

Kewenangan BNPB menyusun kajian risiko berasal dari @ri-2007-uu24. Tiga dasar yang dipakai kajian ini:

- Undang-Undang Nomor 24 Tahun 2007 tentang Penanggulangan Bencana.
- Rencana Nasional Penanggulangan Bencana 2025–2029, dengan dua turunan yang dipakai:
  - indikator penurunan IRB;
  - indikator cakupan peringatan dini.
- Rencana Strategis BNPB 2025–2029.

#### Hubungan dengan Pola dan Rencana PSDA

Kajian ini memakai lensa risiko bencana. Pola dan Rencana Pengelolaan Sumber Daya Air Kementerian Pekerjaan Umum
dirujuk sebagai dokumen induk pengelolaan air, tidak ditandingi.

## Ruang Lingkup {#sub:lingkup}

Kajian dibatasi pada Pulau Jawa dan horizon 2026–2030. Komponen dan sumber datanya tampil pada @tbl:lingkup;
skenario musim hujan dibahas di @bab:musim-hujan.

::: tabel {#tbl:lingkup}
judul: Komponen kajian dan sumber data utamanya, 2026–2030
sumber: Analisis kajian ini
keyakinan: asumsi-kebijakan

| KOMPONEN | CAKUPAN | SUMBER DATA UTAMA |
| --- | --- | --- |
| Risiko musim hujan | banjir, tanah longsor, rob | InaRISK BNPB; DIBI BNPB |
| Risiko musim kemarau | kekeringan, kebakaran hutan dan lahan | InaRISK BNPB; DIBI BNPB |
| Kapasitas | peringatan dini, kesiapsiagaan | Renstra BNPB 2025–2029 |
| Pembanding luar negeri | program terbukti dengan dampak terukur | literatur bertelaah sejawat |
:::

Urutan kerja kajian:

1. Membaca profil risiko dari Indeks Risiko Bencana Indonesia (IRBI) dan Data dan Informasi Bencana Indonesia (DIBI).
2. Menyusun skenario terburuk yang masuk akal per musim.
3. Menurunkan rekomendasi berlembaga dengan horizon waktu.

[^kelas]: Kelas Tinggi menurut ambang resmi IRBI; jumlah kab/kota yang dinilai berbeda antartahun.
[^sumber]: Angka di bab ini dibaca dari registri angka kajian; tidak ada angka yang diketik tangan.
