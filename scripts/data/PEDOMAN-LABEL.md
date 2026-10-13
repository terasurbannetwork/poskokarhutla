# Pedoman label judul berita karhutla

**Status: dilabeli oleh asisten AI (Claude), 13 Okt 2026, belum diperiksa manusia.** Label ini dipakai melatih dan
menguji model nada di `berita.py`. Sebelum angka akurasinya dipakai untuk keputusan, minta dua orang memeriksa
`data/raw/berita/periksa_manusia.json` (100 judul acak) dengan pedoman ini, lalu hitung kesepakatannya. Bila
kesepakatan manusia vs label AI < 80%, label AI tidak layak dijadikan acuan dan harus dilabeli ulang.

Berkas:

| Berkas | Isi |
| ------ | --- |
| `data/raw/berita/label_uji.json` | 204 judul label tangan lama (manusia, jalan pertama) |
| `data/raw/berita/label_ai.json` | judul tambahan, label AI, disampel bertingkat per bulan × provinsi × topik dari arsip 120 hari |
| `data/raw/berita/periksa_manusia.json` | 100 judul acak dari `label_ai.json`, kolom label manusia dikosongkan |

Yang dinilai **hanya judul** (cuplikan RSS biasanya cuma mengulang judul). Jangan menebak isi artikel.

## 1. Relevan (`relevan`)

`false` bila judul bukan soal kebakaran hutan/lahan/asap di Indonesia: kebakaran rumah, pasar, kendaraan, TPA di
tengah kota, kebakaran di luar negeri tanpa kaitan Indonesia, iklan, atau kata "api"/"asap" kiasan. Judul tak
relevan tidak diberi label nada.

## 2. Situasi (`situasi`): keadaan api/asap yang dilaporkan judul

Pertanyaan: **"Setelah membaca judul ini, apakah keadaan kebakaran/asap terdengar memburuk, membaik, atau tidak ada
kabar keadaan?"**

| Label | Kapan | Contoh |
| ----- | ----- | ------ |
| `negatif` (memburuk / sedang berlangsung) | Api sedang terjadi, muncul, meluas, sulit dipadamkan; titik panas bertambah/banyak; asap menyelimuti, ISPU tidak sehat, ISPA naik, sekolah diliburkan, penerbangan terganggu; korban; status darurat ditetapkan karena keadaan; peringatan bahaya yang naik (FDRS tinggi, "waspada", "berpotensi") | "Karhutla di Muara Ohong meluas", "Kabut asap selimuti Pekanbaru", "BMKG: 120 titik panas terdeteksi di Kalbar" |
| `positif` (membaik) | Api padam / berhasil dipadamkan / terkendali; titik panas turun / nihil; hujan turun mengurangi api; udara membaik; sekolah/penerbangan kembali normal; luas terbakar menurun | "Kebakaran lahan 3 ha di Sepunggur padam", "Titik panas Kaltara nihil" |
| `netral` | Tidak ada kabar keadaan: kebijakan, rapat, anggaran, patroli/sosialisasi pencegahan, apel siaga, penegakan hukum, analisis, opini, profil, kajian, video umum | "Prabowo gelar ratas soal karhutla", "Polda Riau tetapkan 63 tersangka" |

Aturan pemutus:

1. **Kejadian kebakaran yang dilaporkan = `negatif`**, walau kecil ("Lahan 2 hektare terbakar di Kampar"), kecuali
   judulnya sekaligus menyebut sudah padam → `positif` ("Lahan 2 ha terbakar, api berhasil dipadamkan").
2. Pemadaman yang **sedang berjalan** tanpa hasil ("Petugas berjibaku padamkan api", "Water bombing dikerahkan ke
   Seruyan") = `negatif`: apinya masih menyala. Yang **berhasil** ("berhasil dipadamkan", "padam") = `positif`.
   Kata kerja aktif "padamkan" tanpa penanda selesai dihitung sedang berjalan, kecuali konteksnya jelas tuntas
   (mis. "Babinsa dan damkar padamkan kebakaran lahan tebu" tanpa kata lain → dianggap tuntas = `positif`; ikut
   label lama).
3. Campuran ("Hotspot turun tapi asap masih pekat"): pilih **bagian akhir / yang ditekankan**; bila benar-benar
   seimbang → `netral`.
4. Pencegahan/antisipasi ("Cegah karhutla meluas, ...") = `netral`; kata "meluas" di situ tidak dihitung.
5. Angka saja tanpa arah ("Hotspot Sumatera 2.279 titik, Riau tersisa satu") = `netral`, kecuali besaran jelas
   dibingkai buruk ("capai ribuan", "melonjak") → `negatif`.
6. Prakiraan/peringatan risiko yang naik ("BMKG: potensi karhutla tinggi pekan depan") = `negatif`; prakiraan hujan
   yang meredakan = `positif`.
7. Dampak lanjutan (satwa terluka, gagal panen, kerugian) = `negatif`; satwa korban **dilepasliarkan** = `netral`.

## 3. Respons (`respons`): nada terhadap penanganan / pihak yang bertanggung jawab

Pertanyaan: **"Apakah judul ini menggambarkan penanganan (pemerintah, aparat, perusahaan) secara baik, buruk, atau
sekadar melaporkan?"**

| Label | Kapan | Contoh |
| ----- | ----- | ------ |
| `positif` | Penanganan berhasil/efektif/cepat; pujian/apresiasi; penegakan hukum yang menghasilkan (tersangka, ditahan, disegel, divonis, izin dicabut); pengorbanan petugas/relawan yang ditonjolkan | "Water bombing percepat penanganan, titik panas IKN berkurang", "20 tersangka karhutla ditahan Polda Sumsel" |
| `negatif` | Kritik, kecaman, gugatan, desakan, tuntutan; penanganan lamban/gagal/terhambat (air habis, alat kurang, medan sulit, helikopter tertunda); kelalaian; dugaan pembiaran; perusahaan tidak ditindak | "Warga gugat pemerintah soal karhutla", "Pemadaman di Bromo terhambat medan curam" |
| `netral` | Laporan kegiatan biasa (rapat, patroli, apel, sosialisasi, anggaran turun, kunjungan), kejadian tanpa penilaian penanganan | "Bupati HSS ajak semua pihak perkuat kesiapsiagaan" |

Aturan pemutus: keberhasilan pemadaman yang dilaporkan datar ("api padam") = `netral` untuk respons (itu kabar
keadaan); baru `positif` bila kinerja penangannya ditonjolkan ("berkat water bombing", "sigap", "gerak cepat").
Desakan/permintaan warga atau DPR kepada pemerintah = `negatif` (tanda tuntutan belum terpenuhi).

## 4. Sikap per lembaga (`sasaran`)

Hanya diisi bila judul **menyebut** lembaganya dan **menilainya** (bukan sekadar menyebut). Nilai `+` (digambarkan baik /
bertindak efektif), `-` (dikritik, didesak, gagal, atau — untuk perusahaan — ditindak/digugat/dituding membakar).

Kode lembaga: `BNPB`, `BPBD`, `KEMENHUT` (Kementerian Kehutanan / KLHK lama / Manggala Agni / BKSDA / balai TN),
`KLH` (Kementerian LH / BPLH / Gakkum), `BMKG`, `TNI`, `POLRI`, `PEMDA` (gubernur, bupati, wali kota, pemprov,
pemkab, dinas, damkar daerah), `PUSAT` (Presiden, istana, menko, "pemerintah" tanpa keterangan), `DPR` (DPR/DPRD),
`PERUSAHAAN` (PT, korporasi, konsesi, perkebunan), `MALAYSIA_SG` (pemerintah Malaysia/Singapura).

## 5. Format label ringkas yang dipakai saat melabeli

`<no> <S><R> [KODE±...]` dengan S,R ∈ `-` `0` `+`, atau `<no> x` untuk tidak relevan. Contoh: `17 -0`,
`18 0+ POLRI+ PERUSAHAAN-`.

## 6. Batas yang diketahui

- Satu pelabel (AI), tanpa pelabel kedua: kesepakatan antar-pelabel belum diukur.
- Sampel bertingkat merata per bulan × provinsi × topik, jadi provinsi kecil terwakili lebih banyak daripada
  porsinya di arus berita; akurasi di sampel ini bukan persis akurasi di arus berita harian.
- Judul yang ambigu dilabeli menurut aturan pemutus di atas, bukan menurut tebakan isi artikel.
