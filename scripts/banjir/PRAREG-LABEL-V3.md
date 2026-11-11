# Prapendaftaran: label_bersatu_v3 (v2 + bukti radar OPERA DSWx-S1)

Status: DIBEKUKAN 11 Nov 2026, sebelum satu hari DSWx pun diproses (`opera_dswx.json` `di_atas_min_ha` kosong; hanya katalog granul 10 hari).
Keputusan pemilik 11 Nov 2026: air permukaan DSWx masuk label banjir bersatu sebagai `label_bersatu_v3`. Kode: `scripts/banjir/label_bersatu_v3.py`.
Penerus `label_bersatu_v2.py`, yang menyatakan "revisi sesudah label dipakai menilai model = v3". v1 dan v2 BEKU dan tidak disentuh.

## 1. Apa yang berubah dan apa yang tidak

- v3 membaca `data/raw/banjir/label_bersatu_v2/kab_hari.csv.gz` apa adanya, menambahkan satu sumber (`dswx`, grup baru **RADAR**) dan tiga kolom:
  `dswx`, `dswx_ha`, `dswx_saja`. Keluaran: `data/raw/banjir/label_bersatu_v3/kab_hari.csv.gz` dan `public/banjir/data/label_bersatu_v3_ringkas.json`.
- Aturan keyakinan v2 tidak diubah: TINGGI = RESMI + grup lain mana pun (atau logbook berdampak), SEDANG = RESMI saja, RENDAH = tanpa RESMI. RADAR hanya
  menjadi grup ketiga: **RESMI + RADAR naik dari SEDANG ke TINGGI**; DSWx saja, DSWx + media, DSWx + warga tetap **RENDAH**.
- **DSWx kosong maka v3 == v2.** Tiap baris v2 muncul tak berubah (kolom `dswx` nol); `susun` menegaskannya dengan `assert` dan ringkasan memuat
  `v3_sama_dengan_v2: true`.

## 2. Aturan hari-kab positif DSWx (beku)

Sumber nilai: `opera_dswx.json["di_atas_min_ha"][kab][tanggal]` (INDEKS: air terbuka di atas minimum 60 hari sebelumnya, bukan luas banjir, dibekukan oleh
`opera_dswx.py` setelah umur >= 2 hari) dan `kab_hari[kab][tanggal][0]` (luas valid teramati).

1. **Positif** bila `di_atas_min_ha >= 100 ha` DAN `valid >= 5.000 ha` DAN `di_atas_min_ha / valid >= 2%`. Tiga syarat itu: bebas dari noise kecil (100 ha =
   `AMBANG_HA` `opera_dswx.py`), dari hari teramati sebagian (5.000 ha), dan dari kab luas yang air tetapnya fluktuatif (2%).
2. **Kronis dibuang:** kab dengan >= 10 hari teramati dan >= 50% di antaranya positif (tambak, sawah irigasi, pasang) tidak menghasilkan positif apa pun.
3. **Gugus dan pencocokan:** hari positif digugus oleh `V2.klaster` (jangkar, selang +1 hari). Gugus radar cocok dengan gugus v2 kab yang sama bila ada hari radar
   `r` dengan `a-1 <= r <= a+1` (a = tanggal jangkar v2). Cocok: gugus v2 mendapat sumber `dswx`, tanggal jangkar v2 tidak bergeser. Tak cocok: baris baru
   **`dswx_saja = 1`**, keyakinan RENDAH, episode = tanggalnya sendiri.
4. **Penanda dan uji:** `dswx_saja = 1` bukan positif untuk uji yang mensyaratkan TINGGI atau SEDANG (mis. `PRAREG-GEOGLOWS.md`). `jendela_j3` ditandai seperti v2.
5. **Simpanan beku:** `opera_dswx.json` hanya bergulir 60 hari; `susun` menyalin nilai ke `data/raw/banjir/label_bersatu_v3/dswx_beku.json` dan TIDAK
   menimpa nilai yang sudah masuk. Hari yang tak pernah masuk simpanan sebelum bergulir hilang dan tidak dapat dipulihkan.
6. Silang MCDWD (`opera_dswx.silang_mcdwd`) hanya diteruskan ke ringkasan sebagai bukti, tidak mengubah label.

## 3. Yang TIDAK ada di v3 dan batasnya

- DSWx baru ada sejak 27 Okt 2026; **tidak ada** DSWx untuk 2016-2025. v3 tidak dapat memperbaiki label tahun latih model mana pun. Manfaatnya: label prospektif
  2026-11 dan sesudahnya (periode uji murni) lebih lengkap, dan cek silang independen terhadap DIBI/logbook yang lambat terisi.
- Radar hanya mengukur air di permukaan di atas dasar 60 hari: banjir singkat yang surut sebelum lintasan satelit (6-12 hari) tidak terlihat; vegetasi
  rapat dan perkotaan padat menekan deteksi; kab luas membuat indeks relatif kecil. Tidak adanya DSWx bukan bukti negatif.
- Ambang (100 ha, 5.000 ha, 2%, kronis 50% dari 10 hari) ditetapkan sebelum ada data dan TIDAK disetel terhadap label; perubahan setelah ada hasil = amandemen tertulis.

## 4. Konsumen

Tetap di v2 sampai v3 punya data DSWx nyata (>= beberapa pekan) dan pemilik memutuskan. Yang akan berpindah: `model_kab2.py` (`V2.OUT_KAB`, `V2.OUT_HARI`),
`model_kab_campur.py` (sha label dan `kab_hari.csv.gz`/`cakupan_hari.csv.gz` terkunci di sidik; pindah = amandemen + kunci sha baru),
`susun_label_v2.py`, `gfm_label.py` (hanya kunci `pp|Nama`), serta dokumen PRAREG-KAB2/CAMPUR/BANDANG yang menyebut v2. Prospektif 2026-11-01..2027-04-30 memakai
label yang dikunci di PRAREG masing-masing, jadi v3 tidak mengubah ukuran yang sedang berjalan.
