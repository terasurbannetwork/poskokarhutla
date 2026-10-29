# Kerangka buku kajian SIPPA

Versi 2, 26 Oktober 2026 (versi 1: 25 Oktober 2026). Versi 2 menjalankan keputusan pemilik 55 (Grand Design
Rehabilitasi dan Rekonstruksi Air dan Akses digabung ke SIPPA) dan 56 (air tanah, akses, dan jadwal pemeliharaan juga
di web `/pipa`); semua perubahan tercatat di `PENYELARASAN.md` bagian 26 Okt 2026.

**Status 26 Okt 2026: prioritas pemilik pindah ke web; restrukturisasi buku penuh DITUNDA.** Yang sudah ada di
versi 2 ini dan boleh dipakai: peta bahan rehab ke bab gabungan (§4.0), daftar 22 bab dengan spesifikasi bab baru 4,
12–15, register SR-21 sampai SR-38 dengan padanan R-RR, KD-8 sampai KD-12, lampiran M–Q, deck 18 slide. Yang belum
ditinjau dan wajib diperiksa sebelum tiket buku SP-058 dan seterusnya dijalankan: nomor Gambar dan Tabel di dalam bab
yang dinomori ulang, rujukan silang antarbab hasil penomoran ulang otomatis, dan alokasi halaman. Sampai ditinjau,
versi 1 tetap bisa dibaca di riwayat git untuk 17 bab kit saja. Kerangka tunggal untuk buku
**Grand Design Sistem Pipa Portabel Karhutla dan Banjir (SIPPA) Terintegrasi 2026–2030** (judul usulan, PRD §2.2 T-L; DOCX dan PDF) beserta deck paparan untuk Kepala BNPB (PPTX dan PDF). Berkas ini mengunci arah, urutan
bab, pertanyaan kunci, angka wajib berikut kunci registrinya, objek bernomor, rekomendasi, lampiran, deck, foto,
generator visual, dan urutan produksi. Penulis bab hanya mengisi bukti dan prosa; arah tidak diubah di tingkat bab.

**Urutan otoritas.** (1) `pipa/KEPUTUSAN-SIPPA.md` (keputusan pemilik 1–50 tanggal 24 Oktober 2026, §H 51–53
tanggal 25 Oktober 2026, dan 54–56 tanggal 26 Oktober 2026, menang atas semua berkas lain); (1a) `rehab/KEPUTUSAN-AWAL.md`
Q1–Q20 untuk bagian air tanah dan akses, sejauh tidak bertentangan dengan (1) (keputusan 55; status per butir di §0.4); (2) `KEPUTUSAN.md` (P1–P18, T1–T14) sejauh tidak dicabut oleh (1), lihat §0.2; (3) Buku Pegangan
`docs/buku-pegangan/pantau-bencana.md` (L1–L72, S1–S39); (4) berkas ini; (5) `pipa/PRD.md`; (6) `PEDOMAN-DESAIN.md`,
`bangun/NASKAH-SPEK.md`, `tema.json`, `ANTI-SLOP.md`. Bahan isi: `pipa/KRITIK-DAN-KEPUTUSAN.md` (disingkat KD),
`pipa/baca-A.md`, `baca-B.md`, `baca-C.md` (celah G01–G28), `pipa/data/README.md`, `pipa/data/matriks_jarak.md`, bahan
kajian `rehab` (`rehab/KERANGKA.md`, `rehab/riset/A`–`F`, `naskah/rehab/` final beserta `bukti/`, `deck.json`, dan kunci
`rehab.*` di `data/angka.json`; peta pemakaian ulang di §4.0), dan data repo yang didaftar di tiap bab. Penyesuaian berkas ini terhadap PRD §8 (§0.3) sudah diterapkan ke PRD pada
penyelarasan 25 Oktober 2026, sehingga keduanya sama isinya; bila kelak ditemukan beda baru, penulis berhenti dan
bertanya ke sesi induk (AGENTS.md §2.1).

**Konvensi.** Path relatif ke `data/kajian-bnpb/` kecuali diawali `public/`, `scripts/`, `src/`, atau `data/raw/`
(relatif ke akar repo). Angka di berkas ini adalah **nilai acuan** yang sudah dibaca dari sumbernya pada 24–25
Oktober 2026 dan dipakai penyunting substansi untuk mencocokkan; di naskah angka tampil hanya lewat token
`{{angka:sippa.<kunci>}}` atau, untuk bahan rehab, token kunci `rehab.*` dan `perka_2008.*` yang sudah ada (gerbang D-22). Kode G1–G25 di kolom objek adalah pilihan grafik `PEDOMAN-DESAIN.md` §B5.10;
kode B5.x adalah komponen PEDOMAN §B5. Gerbang program ditulis "gerbang G0" sampai "gerbang G6"; gambar teknik ditulis
"SIPPA-G-01" sampai "SIPPA-G-12". Rekomendasi berkode `SR-nn` (register §6) dan di naskah menjadi `::: rek
{#rek:<id>}`. Label keyakinan ditulis dengan kode `tema.json`: `resmi`, `terverifikasi`, `estimasi-model`,
`asumsi-kebijakan`, ditambah status slot `menunggu` (§2 butir 4). Halaman = isi utama di luar bagian depan, Daftar
Pustaka, dan lampiran; angka halaman adalah perkiraan beban kerja, bukan batas (keputusan 11, P18).

**Isi berkas.** §0 keputusan yang mengikat; §1 identitas buku; §2 prinsip isi; §3 bagian depan dan KD-1 sampai KD-12;
§4 bab demi bab (§4.0 peta bahan rehab, BAB 1 sampai BAB 22); §5 lampiran A–S; §6 register rekomendasi SR-01 sampai
SR-38 dengan tabel padanan R-RR; §7 foto, peta,
grafik, gambar teknik; §8 perubahan mesin; §9 urutan produksi dan gerbang QA; §10 butir terbuka; §11 deck.

---

## 0. Keputusan yang mengikat kerangka ini

### 0.1 Keputusan pemilik SIPPA yang dieksekusi buku

| No | Keputusan (`KEPUTUSAN-SIPPA.md`) | Letak di buku |
| --- | --- | --- |
| 1, 2, 3 | Nama SIPPA; pemilik program BNPB; pembaca Kepala BNPB | §1, seluruh buku |
| 4 | Pilot Oktober 2026; bila "dapat dipakai", kit dipakai untuk banjir November–Desember 2026 | Bab 16, Bab 11, KD-2 |
| 5 | Horizon 2026–2030 | Bab 21, rek.waktu |
| 6 | Provinsi lain dibahas penuh | Bab 6 (18 profil bertemplat), Lampiran C |
| 7 | Pemakaian ganda banjir masuk hitungan biaya-manfaat | Bab 11, Bab 18 (varian BCR + banjir) |
| 8 | Irigasi masuk, air dari sumber lain | Bab 11.5, Bab 18 (varian BCR + banjir + irigasi) |
| 9 | Injeksi 1,5 m untuk pilot; 3–5 m lengan uji kedua | Bab 2, Bab 7, Bab 10, SIPPA-G-03 |
| 10 | Surfaktan bebas PFAS sebagai lengan uji | Bab 2.5, Bab 16 |
| 11 | Tanpa batas halaman | §1, alokasi halaman perkiraan |
| 12 | Gambar teknik tingkat konstruksi; blok pengesahan insinyur berlisensi kosong | Bab 9, Lampiran F |
| 13 | RAB dihitung ulang | Bab 18, Lampiran E |
| 14 | Harga helikopter: angka BNPB menyusul | slot `menunggu` §2 butir 4, Bab 18.6, KD-5 |
| 15 | NPV, BCR, Monte Carlo | Bab 18 |
| 16, 17 | Matriks respons FRP dan luas | Bab 10.3 |
| 18 | Simulasi Three.js di web | Bab 20.4 (rujukan, bukan gambar utama) |
| 19 | Deck sekitar 15 slide (18 slide isi sesudah keputusan 55, T-M) | §11 |
| 20 | Tanpa bab kritik; arah desain ditulis langsung | §2 butir 2, seluruh bab |
| 21 | YonTP gudang, tenaga gelar, transport; komando Satgas; operator inti Manggala Agni | Bab 17 |
| 22 | Tanpa bagian dasar hukum TNI | Bab 17 (hanya MoU pinjam pakai BMN) |
| 23 | Aset BMN BNPB, pinjam pakai | Bab 17.3 |
| 24 | Matriks RACI per tahap | Bab 17.2 |
| 25 | Swasta/konsesi sebagai opsi kebijakan | Bab 17.5 |
| 26, 27 | Semua data terbuka ditarik; draf surat permintaan data sebagai lampiran | Lampiran A, Lampiran I |
| 28 | Batas data 23 Oktober 2026 pukul 23.59 WIB | §1, kolofon, pil CUT OFF deck |
| 29 | Label keyakinan di semua angka | §2 butir 4 |
| 30 | Ambang zona air 2,5 km, jalan 5 km | Bab 5 |
| 51 | Ambang zona memakai "<" (jarak tepat 2,50 atau 5,00 km = jauh) | Bab 5.1, Lampiran A (rekonsiliasi) |
| 52 | Warna zona buku dan deck biru dan emas, huruf A–D dan pola arsiran sama dengan web | §7.2 aturan 3 dan 5, Gambar 5.1, 5.2, 6.2, RE.1, deck slide 5 |
| 53 | Definisi vonis pilot "dapat dipakai" tujuh butir | Bab 16.1, 16.3, KD-2, Lampiran H |
| 54 | T-B dan T-C memakai bawaan PRD §2.2 (pilot 28 Okt–1 Nov 2026) | Bab 16.2 |
| 55 | GD SIPPA menyerap GD Rehabilitasi dan Rekonstruksi Air dan Akses: pipa + air tanah + akses jembatan + model pemeliharaan; tiga GD BNPB; kode `rehab` menjadi bahan bukti | §0.4, §1, §4.0, Bab 4, 12–15, tambahan di Bab 1, 7, 9, 10, 16–22, §5 M–Q, §6 SR-21 sampai SR-38, §11 |
| 56 | Air tanah, akses, dan jadwal pemeliharaan juga di web `/pipa` | Bab 15.8, Bab 20.7, Gambar 15.3 |
| 31–45 | Aplikasi web `/pipa` | Bab 20 (ringkas), Lampiran L |
| 46, 47, 48 | PRD dulu lalu buku dan web paralel; mitigasi ditunda; kuota | §9 |
| 49 | Deploy dari sesi induk setelah lolos uji | §9.5 |
| 50 | Enam larangan: "terbukti" tanpa uji, angka tanpa sumber, jaringan permanen nasional, pembelian massal sebelum pilot, injeksi > 5 m, nama/logo selain BNPB | §2 butir 3, 5, 6, 7; gerbang §9.4 |

### 0.2 Aturan `KEPUTUSAN.md` yang tetap berlaku dan yang tidak

| Kode | Status untuk SIPPA | Catatan |
| --- | --- | --- |
| P1 | berlaku | penerbit BNPB saja, tanpa tim penyusun, pembaca Kepala BNPB |
| P2 | tidak berlaku | judul SIPPA di §1 |
| P3 | berlaku dalam bentuk lain | rezim pengelolaan gambut dan pengambilan air dirujuk, tidak ditandingi (BRGM/Kemenhut untuk sekat kanal, BWS untuk izin air) |
| P4 | berlaku | horizon 2026–2030; peta jalan 100 hari, 2026–2027, 2028–2030 |
| P5 | **dicabut** oleh keputusan 13 dan 15 | buku memuat RAB, NPV, BCR, Monte Carlo |
| P6 | berlaku | "terbukti" hanya dengan kutipan uji; SIPPA berstatus usulan baru yang diuji |
| P7 | berlaku | status Sudah ada / Sudah ada, perlu dikembangkan / Usulan baru |
| P8 | berlaku | unit dari OTK BNPB berlaku (Perban BNPB 6/2025 jo. 11/2025, korpus JDIH lokal); K/L bernomenklatur Oktober 2026 |
| P9, P10, P11 | tidak berlaku | bukan kajian risiko multi-bencana |
| P12 | berlaku | DOCX A4 tegak, Roboto, logo BNPB, foto Commons beratribusi, tanpa ilustrasi AI |
| P13 | berlaku | empat berkas: DOCX + PDF, PPTX + PDF; halaman PDF sama dengan dokumen asal |
| P14 | berlaku dengan penyesuaian | deck 18 slide isi (keputusan 19, T-M), bukan 12 |
| P15 | berlaku | peta disimulasikan di web (`/pipa/peta`) lalu dirender untuk dokumen |
| P16, P17 | berlaku | gaya laporan kelas dunia; tanpa tata naskah dinas khusus, tanpa simulasi tanya-jawab |
| P18 | berlaku | tanpa batas halaman; D-12 lolos tanpa batas |
| T1 | berlaku | judul bab KAPITAL ("BAB 8 HIDRAULIKA DAN TITIK KERJA"), subbab huruf judul |
| T2, T3 | berlaku | oranye naik, biru turun; peta web di situs, tetapi di `/pipa` berlogin (keputusan 32), bukan `public/kajian/` |
| T4 | berlaku | kaki halaman alamat BNPB |
| T5 | dicabut (P18) | |
| T7 | berlaku | Kata Pengantar draf berpenanda periksa pemilik |
| T10 | berlaku | "prabencana", "tanggap darurat", "pascabencana" |
| T11, T12, T13 | berlaku | judul temuan berangka maks 2 baris; kode bagian A–E; pembatas GELAP |

### 0.3 Penyesuaian terhadap PRD §8 (sudah diterapkan ke PRD §8 pada penyelarasan 25 Okt 2026; PENYELARASAN.md)

| Pokok | PRD §8 | Kerangka ini | Alasan |
| --- | --- | --- | --- |
| Kode kajian | `kajian: pipa`, kunci `pipa.*` | `kajian: sippa`, kunci `sippa.*` | permintaan sesi induk 25 Okt 2026; nama program (keputusan 1) |
| Folder naskah | `naskah/pipa/` | `naskah/sippa/` | idem |
| Keluaran | `keluaran/pipa.docx` dst. | `keluaran/sippa.docx`, `sippa.pdf`, `sippa-deck.pptx`, `sippa-deck.pdf` (§1) | idem |
| Spek deck | `bangun/pptx/spek/pipa-deck.json` | `naskah/sippa/deck.json` | pola yang sudah jalan di `naskah/air/deck.json` |
| Jumlah bab | 15 | 22: profil 18 provinsi dan sistem data menjadi bab sendiri (versi 1, 17 bab), lalu lima bab dari keputusan 55 (beban pascabencana, air perpipaan, air tanah, akses, pemeliharaan) | provinsi lain "dibahas penuh"; GD terintegrasi |
| Huruf lampiran | A–K | A–S (§5) | BOM, RAB, profil provinsi, atribusi foto dipisah; lima lampiran dari bahan rehab dan pemeliharaan |
| Registri angka | berkas turunan di `data/sippa/keluaran/` (akar repo) | entri `angka.json` membaca paket `data/sippa/` di bawah `data/kajian-bnpb/data/` (§8.2) | `berkas` di `angka.json` relatif ke `data/kajian-bnpb/data/` |

### 0.4 Keputusan kajian `rehab` (Q1–Q20, R1–R5) di buku gabungan (keputusan 55)

| Kode | Isi asal | Status | Catatan |
| --- | --- | --- | --- |
| Q1 | Judul GD RR air dan akses | **diganti** | judul buku gabungan §1 (T-L) |
| Q2 | "Jembatan Merah Putih" menurut pemilik | berlaku | §2 butir 21, gerbang D-39 |
| Q3 | Perumahan sebagai beban dan pengikat lokasi | berlaku | Bab 4.3, 12.8 |
| Q4 | Biaya satuan boleh, tanpa pagu, total, NPV, BCR | berlaku untuk air tanah dan akses saja | keputusan 13 dan 15 (RAB, NPV, BCR, Monte Carlo) tetap untuk kit dan model pemeliharaan; T-N |
| Q5 | Bencana alam berkerusakan fisik | berlaku | Bab 1.4, 4.6 |
| Q6 | Empat besaran RR menggantikan besaran P10 | berlaku | Bab 4.6, Lampiran M |
| Q7 | Satgas Sumatra dan Inpres 18/2025 hanya angka resmi | berlaku | Bab 17.8 |
| Q8 | BNPB tidak memerintah program jembatan K/L | berlaku | Bab 14, 17.8 |
| Q9 | Usulan perubahan Perban 4/2024 untuk aset desa | berlaku | Bab 14.6, KD-9, SR-27 |
| Q10 | Sumur bor RR hanya di luar zona rusak dan kritis atau dengan rekomendasi Badan Geologi | berlaku, kini juga ditegakkan web | Bab 13.7; CHECK `sippa_aset` (keputusan 56) |
| Q11 | Standar waktu pulih sebagai sasaran setelah garis dasar 2027 | berlaku | Bab 12.6, 21.5, KD-8 |
| Q12 | Unit pemimpin Deputi Bidang RR | berlaku untuk air dan akses | Bab 17.7; unit pemimpin kit tetap §6 |
| Q13 | Register bersama berkode R-RR-nn | **diubah** | R-RR-01 sampai 15 menjadi SR-21 sampai SR-35; kode R-RR tetap sebagai kolom padanan (§6) |
| Q14 | Mesin produksi untuk kode `rehab` | **diubah** | kode buku `sippa`; `rehab` dan berkas bangunnya tetap sebagai sumber (§8.1 M1) |
| Q15 | Tanpa draf surat ke K/L (P17) | **dicabut** oleh keputusan 27 | permintaan data rehab masuk Lampiran I sebagai surat (13 surat) |
| Q16 | Angka media hanya di lampiran rekonsiliasi | berlaku | §2 butir 22, gerbang D-40 |
| Q17 | Peta kab/kota menunggu DIBI per kab | berlaku | Bab 4.7, `jembatan_dibi.json` |
| Q18 | Deck 15 slide isi | **diubah** | 18 slide isi untuk satu buku gabungan (T-M, §11) |
| Q19 | Studi kasus luar negeri | berlaku | Bab 12, 13, 14, Lampiran K |
| Q20 | Uji coba paket air dan akses Sumatra | berlaku | Bab 16.8, SR-34 |
| R1 | SIPPA hanya dirujuk satu kotak, tanpa menggabung rekomendasi | **dicabut** oleh keputusan 55 | integrasi penuh, Bab 12.3 |
| R2 | Program jembatan menurut pemiliknya | berlaku | §2 butir 21 |
| R3 | Empat label; "media" bukan label | berlaku | §2 butir 4, 22 |
| R4 | Perka 7/2008 berlabel resmi | berlaku | kunci `perka_2008.*` |
| R5 | Kode `rehab`, namespace `rehab.*` | berlaku untuk kunci registri saja | naskah memakai `rehab.*` apa adanya, tidak disalin |
| T3 rehab | Peta web publik `public/kajian/rehab/` | **dicabut** oleh keputusan 32 dan 56 | semua di `/pipa` berlogin (T-O) |

---

## 1. Identitas buku

| Medan | Isi |
| --- | --- |
| Judul | Grand Design Sistem Pipa Portabel Karhutla dan Banjir (SIPPA) Terintegrasi 2026–2030 (usulan, T-L; nama SIPPA tetap, keputusan 1) |
| Subjudul | Kit Pipa Bergerak, Air Pascabencana, Akses Jembatan, dan Pemeliharaan Aset |
| Judul pendek (kepala halaman) | Grand Design SIPPA Terintegrasi |
| Penerbit | Badan Nasional Penanggulangan Bencana (satu-satunya nama dan logo di sampul, kepala, kaki, deck; P1, keputusan 50) |
| Terbit | Desember 2026 (versi serah minggu 49, PRD §4.1); kolofon menulis tanggal versi |
| Pembaca | Kepala BNPB; pembaca kedua: Deputi Bidang Penanganan Darurat, Deputi Bidang Logistik dan Peralatan, Deputi Bidang Rehabilitasi dan Rekonstruksi, Satgas Karhutla provinsi |
| Batas data | 23 Oktober 2026 pukul 23.59 WIB untuk semua data sekunder dan resmi; satu pengecualian bertanda: hasil pilot Oktober 2026 dan operasi banjir 2026 dari D1 `sippa_*` (diberi pil "pilot, n kecil" dan tanggal tarik sendiri, Bab 16.3) |
| Horizon | 2026–2030 |
| Cakupan | Kit: Kalimantan Tengah sampai tingkat kompleks api (865 kompleks) dan sel 2,2 km; 18 provinsi sampai tingkat provinsi (9 provinsi dengan zona A–D dari `kendala.json`). Air dan akses pascabencana: 38 provinsi, kab/kota bila data tersedia, bencana alam berkerusakan fisik (rehab Q5). Pemeliharaan: semua aset yang dipegang atau dicatat SIPPA |
| Cakupan sampul | "Cakupan: 865 kompleks api Kalimantan Tengah, 18 provinsi rawan kebakaran hutan dan lahan dengan pemakaian ganda musim banjir, serta air dan akses pascabencana di 38 provinsi." |
| Kata kunci | BNPB; grand design; kebakaran hutan dan lahan; gambut; kit relay portabel; banjir; air tanah; jembatan; pemeliharaan aset; SIPPA |
| Format | DOCX A4 tegak, Roboto, logo BNPB; Lampiran F gambar teknik A3 lipat (PDF tersendiri disisipkan, halaman dihitung di PDF) |
| Folder naskah | `naskah/sippa/` (bab-01.md s.d. bab-22.md, `00-depan-kata-pengantar.md`, `00-depan-ringkasan-eksekutif.md`, `90-lampiran-a.md` s.d. `90-lampiran-q.md`, `deck.json`); `naskah/rehab/` tetap sebagai sumber, tidak dibangun untuk serah |
| Folder bukti | `naskah/sippa/bukti/bab-NN.md`, `bab-NN.angka.json`, `bab-NN.pustaka.json` (pola `naskah/air/bukti/`) |
| Keluaran | `keluaran/sippa.docx`, `keluaran/sippa.pdf`, `keluaran/sippa.manifest.json`, `keluaran/sippa-deck.pptx`, `keluaran/sippa-deck.pdf`, `keluaran/sippa-deck.manifest.json`; salinan bernama untuk serah "Kajian SIPPA Terintegrasi {DDMMYY}.docx/.pdf" dan "Kajian SIPPA Terintegrasi {DDMMYY} Paparan.pptx/.pdf" |
| QA | `keluaran/qa/slop-sippa.md`, `keluaran/qa/sippa.md`, `keluaran/qa/sippa-deck.md` |
| Gambar | `gambar/sippa/*.png` (300 dpi), `gambar/sippa/teknik/*.pdf` (A3) dan `*.png` |

Entri `tema.json` yang ditambahkan (`kajian.sippa`), bentuk sama dengan `air` dan `mitigasi`:

```json
"sippa": {
  "judul": "Grand Design Sistem Pipa Portabel Karhutla dan Banjir (SIPPA) Terintegrasi 2026–2030",
  "subjudul": "Kit Pipa Bergerak, Air Pascabencana, Akses Jembatan, dan Pemeliharaan Aset",
  "judul_pendek": "Grand Design SIPPA Terintegrasi",
  "nama_berkas": "Kajian SIPPA Terintegrasi {DDMMYY}",
  "batas_halaman_isi": null,
  "lampiran": "ABCDEFGHIJKLMNOPQRS",
  "kata_kunci": ["BNPB", "grand design", "kebakaran hutan dan lahan", "gambut", "kit relay portabel", "banjir", "air tanah", "jembatan", "pemeliharaan aset", "SIPPA"],
  "cakupan_sampul": "Cakupan: 865 kompleks api Kalimantan Tengah, 18 provinsi rawan kebakaran hutan dan lahan dengan pemakaian ganda musim banjir, serta air dan akses pascabencana di 38 provinsi."
}

Entri `kajian.rehab` di `tema.json` tidak dihapus: berkas final rehab tetap bisa dibangun ulang sebagai sumber, tetapi
tidak diserahkan sebagai grand design (keputusan 55). Lampiran R (Glosarium) dan S (Atribusi Foto) dibangkitkan; kode
huruf keduanya diambil pembangun dari ujung string `lampiran` (`bangun/docx/bangun.py:1704`), jadi tidak ada huruf yang
dikunci di kode.
```

Ditambah `qa.pustaka.kajian_min.sippa = 50` (PRD §8.3; separuh resmi atau primer; 8 sumber berbeda per bab, L65).

---

## 2. Prinsip isi

1. **Suara dan posisi BNPB.** Buku adalah dokumen keputusan program milik BNPB (keputusan 2). Kalimat aktif dengan
   pelaku lembaga ("BNPB menetapkan", "Satgas memutus"). SIPPA diposisikan sebagai pelengkap sarana yang sudah ada
   (regu darat, sekat kanal, water bombing, OMC), bukan pengganti. Heli tetap untuk front yang tidak tercapai regu darat
   dalam 6 jam (`jam_tiba`, `public/data/operasi.json`); OMC tetap keputusan BMKG dan Kemenhut.
2. **Arah ditulis langsung, tanpa bab kritik (keputusan 20).** Temuan KD §2 (K-01 sampai K-19) masuk sebagai **dasar
   desain** di bab tempat keputusan teknisnya diambil, dalam kalimat positif ("titik kerja ditetapkan di ujung
   manifold 2–4 bar karena ..."). Dilarang di naskah: frasa yang merujuk dokumen awal sebagai salah ("dokumen awal
   keliru", "klaim sebelumnya", "tidak berdasar"), daftar kesalahan, tabel putusan NO-GO per dokumen pemilik, dan
   angka Rp364 M. Pilihan yang ditutup (backbone permanen, koridor HDPE semi-permanen, injeksi dalam, sumur dalam sebagai bawaan, baja dan pipa
   tertanam, HDPE pasang-bongkar) ditulis sebagai **batas desain** berikut alasan fisik dan biayanya (Bab 7.6).
3. **"Terbukti" hanya dengan uji yang dikutip.** Kata "terbukti" dan turunannya hanya untuk sekat kanal dan
   pembasahan ulang dengan rujukan program resmi, dan untuk hasil uji lapangan yang dikutip dari naskah aslinya. Untuk
   SIPPA dipakai "hipotesis", "diuji pada gerbang G4", "belum diuji". `data/glosarium.json` `varian_terlarang`
   ditambah "terbukti efektif", "sudah terbukti", "teruji" tanpa rujukan (gerbang D-10, T-9). Vonis pilot dipisah dua:
   "dapat dipakai" dan "lebih baik dari cara konvensional" (Bab 16).
4. **Label keyakinan di semua angka (keputusan 29).** Empat label `tema.json` dipakai di tiap tabel, kartu angka,
   gambar data, dan chip slide, identik dengan `keyakinan` entri `angka.json`. Slot yang menunggu data (harga heli,
   radius larangan surfaktan, hasil RFQ, hasil pilot sebelum ditarik) ditulis sebagai entri berstatus `menunggu`
   yang tampil "–" dengan alasan di catatan, tidak pernah angka tebakan. Harga helikopter: kunci
   `sippa.heli.biaya_jam` dan `sippa.heli.biaya_sorti` berstatus `menunggu` sampai pemilik menyerahkan angka BNPB
   (keputusan 14); sampai itu pembanding hanya "> Rp200 juta per sorti satu jam" (pernyataan BNPB September 2023,
   `resmi`, pernyataan, bukan kontrak).
5. **Tanpa angka tanpa sumber.** Semua angka lewat token `{{angka:sippa.*}}` (D-22). Tabel dari data memakai `csv:`.
   Angka yang hanya ada di berita masuk naskah `status: draf` saja; naskah `final` menolak pustaka sekunder, jadi angka
   pembanding berita (OMC, sekat kanal, sumur dangkal) dibuka ke dokumen resmi atau dipindah ke catatan berlabel.
6. **Tanpa nama merek dan tanpa nama perusahaan (keputusan 50).** Spesifikasi alat ditulis sebagai kelas kinerja
   "atau setara" ("pompa portabel kelas 1.500 L/min pada 1,0 MPa"). Merek dan model hanya di `pustaka.json` sebagai
   rujukan lembar data dan di kolom "RUJUKAN DATASHEET" Lampiran D, bukan di badan teks, judul, gambar, atau deck. Nama
   perusahaan konsesi tidak ditulis; kompleks di konsesi disebut "di areal berizin". Logo hanya BNPB.
7. **Lantai angka tercatat.** Angka perencanaan tidak boleh lebih ringan daripada keadaan tercatat terburuk dalam
   periode acuan untuk wilayah yang sama: jumlah kit memakai luas terbakar puncak SiPongi (maksimum 2019 atau 2023),
   kebutuhan respons memakai musim 2015 sebagai musim acuan terberat (VIIRS 2012–2025), kebutuhan air memakai nilai atas
   bila probe belum ada, dan P90 Monte Carlo tidak boleh di bawah biaya realisasi pilot 2026. Angka model yang
   melampaui angka tercatat tidak masuk judul tanpa penjelasan; pita yang lebarnya lebih dari satu orde tidak masuk
   judul, kartu angka, atau Pesan Kunci.
8. **Lebih dari satu versi bila hasil bergantung pada data yang belum diverifikasi.** Zona A–D Kalteng selalu tampil
   berdampingan dalam tiga versi (PRD §5.1, aturan "<" keputusan 51): **versi `kendala.json`** (air dan jalan
   `kendala.json`, label "konservatif") sebagai angka perencanaan; **versi jalan utama OSM** (jalan tersier ke atas ×
   semua air OSM) sebagai pembanding tengah; dan **versi semua jalan OSM** (semua jalan kendaraan termasuk `track` ×
   semua air OSM, label "optimistis") sebagai batas atas, dengan syarat verifikasi lapangan per `track` sebelum
   kompleks dinaikkan zonanya. Hal yang sama untuk RAB (kendaraan dan perahu
   dipinjam lawan dibeli) dan BCR (inti, + banjir, + banjir + irigasi).
9. **Gerbang mendahului belanja.** Tiap tingkat anggaran T0–T4 hanya dibuka setelah gerbangnya lulus (Bab 18.2).
   Pengadaan 81 kit nasional ditulis "rencana bersyarat, bukan pengadaan" di tiap tabel, peta, dan slide. Tidak ada
   jaringan pipa tetap dalam bentuk apa pun: tanpa koridor semi-permanen dan tanpa backbone (keputusan 60).
10. **Doktrin kedalaman.** Injeksi 0–1,5 m; lengan uji 3–5 m hanya di petak yang probe 1,0 m masih > 50 °C setelah
    injeksi 1,5 m; tidak pernah > 5 m. Kalimat, tabel, atau gambar yang menyebut kedalaman injeksi > 5 m ditolak.
11. **Gambar teknik tingkat konstruksi, tetap wajib disahkan.** Tiap gambar teknik memuat blok pengesahan insinyur
    berlisensi (nama, nomor STRA/SKA, tanda tangan, tanggal) yang dikosongkan, dan baris tetap "Wajib verifikasi dan
    pengesahan insinyur berlisensi sebelum dibangun". Buku tidak menyebut gambar sebagai DED atau dokumen pengadaan.
12. **Pemakaian ganda bersyarat keras.** Banjir: pompa api head tinggi tidak dipakai untuk genangan; modul banjir
    head rendah terpisah; tidak membuang air ke kanal gambut. Irigasi: air dari sumber di luar kubah gambut, bukan air
    pemadaman atau kanal gambut; tidak boleh menurunkan muka air gambut; bila syarat tidak terpenuhi di satu kabupaten,
    manfaat irigasinya nol. Manfaat keduanya dihitung sebagai varian BCR tersendiri, tidak pernah dicampur ke BCR inti.
13. **Pembanding biaya bukan bukti keunggulan.** Perbandingan dengan heli, OMC, sekat kanal, dan regu darat dipakai
    untuk urutan besaran, karena tugasnya berbeda. Kalimat "lebih murah dari heli" tanpa satuan tugas yang sama
    dilarang.
14. **Satu register rekomendasi.** Semua rekomendasi dari register §6, ID `SR-nn`, tampil sekali di bab
    asal sebagai rujukan dan lengkap hanya di Bab 22 dan Bab 21 (peta jalan). Satu daftar keputusan yang diminta
    (KD-1 sampai KD-12, §3.5), dipakai identik di Pesan Kunci, Bab 22, dan deck. Rekomendasi rehab R-RR-nn tidak tampil
    dengan kode lamanya di naskah; padanannya di §6.
15. **Tanpa pengulangan (L64).** Data dan pola di Bab 3–6; desain kit di Bab 7–9; operasi di Bab 10–11; air dan akses
    pascabencana di Bab 12–14; pemeliharaan di Bab 15; uji di Bab 16; lembaga di Bab 17; uang di Bab 18; rekomendasi di
    Bab 21–22. Bab lain merujuk silang (`@sub:`), tidak menyalin.
16. **Produsen data dan tiga keluaran satu sumber.** Keluaran hitungan platform Pantau Bencana bukan Data Bencana
    menurut Perban BNPB 1/2023; tiap gambar dan tabel turunan memuat pernyataan produsen di samping label. Peta dan
    grafik dibangun dari satu set data, tampil di `/pipa`, dirender PNG untuk DOCX, dan dipakai deck; angka identik di
    ketiganya.
17. **Bahasa.** Bahasa Indonesia formal, PUEBI, tanpa em dash, tanpa titik tengah, tanpa panah, tanpa emoji
    (`NASKAH-SPEK.md` §4); singkatan dieja pada kemunculan pertama tiap bab (L66); semua bab LULUS `qa/slop.py`
    (`ANTI-SLOP.md`, T-4, T-8).
18. **Satu grand design, bukan dua buku dijahit (keputusan 55).** Kit, air pascabencana, akses, dan pemeliharaan
    ditulis sebagai satu sistem aset: gudang, transport, data `/pipa`, dan model pemeliharaan yang sama. Bab 12–14
    membuka dengan kaitannya ke kit (Bab 7.7) dan Bab 15 menutup semua kelas aset. Kata "kajian rehab" tidak muncul di
    naskah; bahannya dipakai sebagai temuan bersumber.
19. **Tiga lapis waktu pascabencana (rehab prinsip 3).** Bab 12–14 menulis tiap program dalam lapis darurat, sementara,
    dan permanen dengan titik serah dan pemutusnya; tiap rekomendasi air dan akses menyebut lapisnya.
20. **Lensa layanan (rehab prinsip 4).** Pemulihan air diukur dalam jiwa atau sambungan terlayani dan liter per orang
    per hari; akses dalam desa atau jiwa tersambung dan hari sampai akses darurat terbuka; "unit berfungsi" bukan ukuran
    tunggal.
21. **Program menurut pemiliknya (rehab R2, Q2, Q8).** Nama program jembatan dan sumur ditulis bersama pemiliknya
    (Satgas Pembangunan Jembatan TNI AD atau Jembatan Garuda, Jembatan Merah Putih Presisi Polri, jembatan gantung
    Kementerian PU, bailey DSP BNPB); "Jembatan Merah Putih" tidak dipakai sebagai nama program tunggal (gerbang D-39).
    Nama program lembaga pemerintah bukan nama atau logo pihak lain dalam arti keputusan 50; logo tetap hanya BNPB.
    Dasar hukum Satgas TNI AD tidak diuraikan (keputusan 22).
22. **Angka sekunder hanya di rekonsiliasi (rehab R3, Q16).** Angka yang sumbernya media (kunci `rehab.sekunder.*`)
    hanya boleh di Lampiran A (gerbang D-40). Angka rehab bertanggal sesudah batas data 23 Oktober 2026 pukul 23.59 WIB
    tidak dipakai kecuali diberi pil tanggal tarik sendiri seperti data pilot (§1 batas data).

---

## 3. Bagian depan

Urutan (L6): Sampul, Kolofon, Kata Pengantar, Daftar Isi, Daftar Tabel, Daftar Gambar, Daftar Lampiran, Daftar
Singkatan, Ringkasan Eksekutif, lalu BAB 1. Nomor romawi kecil. Sampul, kolofon, daftar, dan sampul belakang
dibangkitkan pembangun; yang ditulis tangan hanya Kata Pengantar dan Ringkasan Eksekutif.

### 3.1 Sampul dan sampul belakang

Sampul pola kajian air (judul, subjudul, cakupan sampul, logo BNPB, satu foto Commons beratribusi dari §7.1 topik F1
atau F2). Sampul belakang navy (L70): logo BNPB, alamat T4, satu paragraf ringkas (3 kalimat: api dan banjir yang
kembali ke tempat yang sama, bentuk SIPPA terintegrasi, gerbang sebelum belanja) yang diambil dari kunci `sippa.tesis|teks`.

### 3.2 Kolofon (halaman keterangan terbitan, L70)

Dibangkitkan dari `tema.json` dan manifest: judul dan subjudul; penerbit BNPB; alamat T4; versi dan tanggal; batas
data "23 Oktober 2026 pukul 23.59 WIB" dan pengecualian data pilot; pernyataan lisensi foto (Commons, atribusi di
Lampiran S); pernyataan produsen (prinsip 16); pernyataan gambar teknik ("Gambar teknik di Lampiran F wajib
diverifikasi dan disahkan insinyur berlisensi sebelum dibangun; bukan dokumen pengadaan"); pernyataan "Spesifikasi
alat ditulis sebagai kelas kinerja; merek dalam daftar pustaka hanya rujukan lembar data, bukan anjuran pengadaan".
Tanpa tim penyusun (P1), tanpa ISBN.

### 3.3 Kata Pengantar (1–2 hlm)

Berkas `00-depan-kata-pengantar.md`, front matter `bagian: kata-pengantar`, `catatan_pemilik: draf untuk
ditandatangani Kepala BNPB; nama dan gelar sesuai deck BNPB 21 Oktober 2026 (T7, PRD T-G)`. Isi empat paragraf: (1)
mengapa bara gambut menjadi persoalan pemadaman yang belum terjawab sarana udara; (2) apa itu SIPPA dalam satu
kalimat, termasuk air dan akses pascabencana dan pemeliharaan aset; (3) pendekatan bergerbang: uji dulu, belanja
kemudian; (4) harapan kepada Satgas, Manggala Agni, BPBD, YonTP, Kementerian PU, Badan Geologi, dan pemda. Tanpa objek bernomor, tanpa angka selain tahun.

### 3.4 Ringkasan Eksekutif (dua lapis, `00-depan-ringkasan-eksekutif.md`)

**Lapis keputusan (2 hlm, dapat dibaca terpisah).**

Halaman 1, Pesan Kunci (B5.26, L14). Kalimat pertama = token `{{angka:sippa.tesis|teks}}`. Bunyi tesis (kunci entri
teks, angkanya bertoken di dalamnya):

> "Api di Kalimantan Tengah kembali ke tempat yang sama, dan banjir merusak jembatan dan air bersih di tempat yang
> sama tiap musim: {sel85} deteksi 2023 jatuh di sel 2,2 km yang sudah terbakar tiga tahun atau lebih, {ab} kompleks
> api berada dalam 2,5 km dari sumber air, dan {jbt} jembatan rusak pada 2018–2025, {banjir} di antaranya karena banjir.
> SIPPA menjawabnya dengan satu sistem aset bergerak: kit relay portabel yang membasahi bara 0–1,5 m lalu dipindah ke
> banjir, air pascabencana dari pipa dan air tanah dalam batas Badan Geologi, akses jembatan menurut pemilik
> programnya, dan pemeliharaan yang tercatat; pengadaan hanya dibuka setelah gerbang uji lulus."

`{sel85}` = `sippa.sel22.kalteng.deteksi_2023_sel_berulang_persen` (85%, `terverifikasi`); `{ab}` =
`sippa.zona.kalteng.konservatif.ab.persen` (70%, `terverifikasi`); `{jbt}` = `rehab.dibi.jembatan_rusak.2018_2025`
(3.833, `resmi`); `{banjir}` = `rehab.dibi.jembatan_rusak.porsi_banjir_persen` (89,2%, `resmi`). Tesis lama tanpa air
dan akses tidak dipakai lagi.

Delapan temuan bernomor (satu berangka, paling banyak 3 baris, ikon putih dalam lingkaran navy). Temuan VIIRS per tahun
dan temuan hidraulika versi 1 pindah ke lapis rincian:

| No | Bagian | Temuan (bentuk) | Kunci utama | Keyakinan |
| --- | --- | --- | --- | --- |
| 1 | A Pola api dan beban | {85%} deteksi 2023 dan {72%} deteksi 2019 jatuh di sel 2,2 km yang sudah aktif tiga tahun atau lebih sebelumnya: lokasi api bisa ditebak | `sippa.sel22.kalteng.deteksi_2023_sel_berulang_persen`, `..._2019_...` | terverifikasi |
| 2 | A Pola api dan beban | Bencana alam merusak {3.833} jembatan pada 2018–2025, {89,2%} karena banjir, dan {1.088} pada 2025 saja | `rehab.dibi.jembatan_rusak.2018_2025`, `.porsi_banjir_persen`, `.2025` | resmi |
| 3 | B Kelayakan dan desain kit | {606} dari 865 kompleks Kalteng ({70%}) berada di zona A dan B yang dapat dilayani kit (versi konservatif); {170} kompleks zona D tidak dilayani kit | `sippa.zona.kalteng.konservatif.ab.n`, `.d.n` | terverifikasi |
| 4 | B Kelayakan dan desain kit | 18 provinsi membutuhkan {81} kit bila skala dibuka, {56} di provinsi gambut; zona D mencakup {34%} kompleks di sembilan provinsi | `sippa.kit.nasional.n`, `sippa.zona.sembilan.d.persen` | asumsi-kebijakan (kit), terverifikasi (zona) |
| 5 | B Kelayakan dan desain kit | Bara gambut berada pada {0,3–0,5} m; doktrin injeksi 0–1,5 m dengan lengan uji 3–5 m dan batas mutlak 5 m | `sippa.bara.kedalaman_m` | terverifikasi |
| 6 | C Air dan akses | Banjir Sumatra 2025 mengganggu {178} SPAM yang tercatat di Kementerian PU; DIBI tidak punya satu pun kolom air, sehingga waktu pulih air tidak terukur | `rehab.pipa.sumatra2025.spam_terdampak`, `rehab.dibi.kolom_air_n` | resmi |
| 7 | D Pemeliharaan dan lembaga | Hibah RR tidak dapat membiayai {7} jenis pembiayaan, termasuk aset desa dan pemeliharaan; SIPPA menetapkan model pemeliharaan sepuluh kelas aset dengan baris anggaran per pelaku | `rehab.hukum.hibah_rr_larangan_pembiayaan_huruf`, `sippa.pelihara.kelas_n` | resmi; asumsi-kebijakan |
| 8 | E Biaya dan jalan | Pilot dua musim dengan 3 kit dan 3 modul banjir: {Rp13,7–18,9 M} bila kendaraan dipinjam; tidak ada belanja skala sebelum gerbang G5 | `sippa.rab.t2.pinjam` | asumsi-kebijakan |

Pita keputusan ringkas di kaki Pesan Kunci: KD-1, KD-2, KD-3, KD-8 (kode dan satu baris pilihan, §3.5).

Halaman 2: direktif `keputusan` memuat KD-1 sampai KD-12 dengan akibat tiap pilihan (B5.25); 5 kartu angka (kartu
pertama: jumlah kompleks Kalteng yang dapat dilayani kit, versi konservatif; lalu kit nasional bersyarat, kedalaman
bara, CAPEX pilot T2, biaya pembanding heli per sorti); daftar rekomendasi 100 hari berlembaga (SR-01 sampai SR-04,
SR-19, SR-21, SR-24, SR-26, SR-31).

**Lapis rincian (5–7 hlm).** Delapan temuan lengkap ditambah temuan VIIRS per tahun dan hidraulika (versi 1 nomor 1 dan 6) gaya Isi Temuan (`::: temuan`), satu peta (Gambar RE.1 zona A–D
Kalteng versi konservatif, dari spek `sippa-01`), ringkasan gerbang G0–G6 (satu tabel 7 baris), ringkasan RAB
bertingkat (satu tabel T0–T4), ringkasan model pemeliharaan (satu tabel sepuluh kelas), tiga risiko teratas (R04, R01, R21), tiga kapasitas yang sudah ada (regu Manggala
Agni dan Daops, sekat kanal, pompa dan selang BPBD), dan yang belum diketahui (lima butir dari KD §7.1).

### 3.5 Keputusan yang diminta dari Kepala BNPB (KD-1 sampai KD-12, khusus buku ini)

Kode KD di buku ini berdiri sendiri (tidak berhubungan dengan KD-1 sampai KD-5 kajian air). Dikunci di Bab 22 dan
dipakai identik di Pesan Kunci dan deck slide 1 dan 18. KD-8 sampai KD-11 adalah KD-R1 sampai KD-R4 kajian rehab
(bunyi asal di `naskah/rehab/bab-12.md` 12.2); KD-12 baru dari model pemeliharaan.

| Kode | Keputusan | Pilihan dan akibat | Waktu |
| --- | --- | --- | --- |
| KD-1 | Menetapkan SIPPA sebagai program uji bergerbang BNPB 2026–2028 dengan nota putusan tertulis | (a) Tetapkan: pilot 2027–2028 berjalan dengan gerbang G0–G5 tertulis; pengadaan skala tertutup sampai G5 lulus; permintaan pembelian di luar tingkat T2 ditolak dengan dasar nota. (b) Tunda: musim kemarau 2027 lewat tanpa data A/B; keputusan skala 2029 tidak punya dasar dan tekanan pembelian besar tanpa uji tetap terbuka (R04) | hari ke-0 sampai 14 |
| KD-2 | Mengizinkan pemakaian ganda banjir November–Desember 2026 dengan alat pinjam dan modul banjir terpisah, bila vonis pilot "dapat dipakai" | (a) Izinkan: kit pinjam dan pompa banjir BPBD dipindah ke kabupaten banjir dengan transport YonTP; log jam pompa dan m³ menjadi data pertama manfaat banjir di BCR. (b) Tidak: varian BCR + banjir tetap bertumpu pada asumsi sampai musim hujan 2027/2028 | minggu 45 (2–8 Nov 2026) |
| KD-3 | Menyetujui tingkat anggaran T1 (Fase 0 2027) dan mencadangkan T2 (3 kit pilot, 3 modul banjir) bersyarat gerbang G0–G2 | (a) Setujui: survei tapak, bench test, izin air, dan protokol A/B selesai sebelum kemarau 2027; pengadaan 3 kit Mei 2027 hanya bila G2 lulus. (b) Hanya T1: pilot 2027 memakai alat pinjam, A/B berjalan dengan alat tak seragam, G3 dan G4 lebih sulit diputus | 100 hari |
| KD-4 | Menugaskan kelembagaan: komando Satgas Karhutla provinsi, operator inti Manggala Agni, YonTP untuk gudang, tenaga gelar, dan transport, dengan aset BMN BNPB lewat pinjam pakai | (a) Tugaskan dan mulai MoU pinjam pakai BMN dengan TNI dan nota kesepahaman operator dengan Kemenhut: gudang dan transport antar-daerah tersedia untuk siklus karhutla-banjir. (b) Tanpa MoU: kit tersimpan di gudang BNPB pusat; waktu pra-posisi dan pindah ke banjir bertambah dan tidak terukur | 2026–2027 |
| KD-5 | Menyerahkan angka kontrak helikopter water bombing BNPB dan menugaskan surat permintaan data ke 10 instansi | (a) Serahkan: tabel pembanding Bab 18 dan varian BCR "heli-hari terhindar" terisi dari angka kontrak. (b) Tidak: pembanding tetap hanya pernyataan "> Rp200 juta per sorti", varian heli tampil "–" | 100 hari |
| KD-6 | Menunjuk evaluator independen dan menetapkan aturan berhenti | (a) Tunjuk Januari 2027: protokol A/B pra-registrasi dikunci sebelum musim; bila G4 gagal, kit dilebur ke inventaris pompa biasa tanpa sengketa. (b) Tidak: hasil pilot dinilai pelaksana sendiri dan tidak dapat dipakai sebagai dasar skala | 2026–2027 |
| KD-7 | Membuka skema pinjam pompa banjir untuk irigasi kelompok tani di luar KHG pada Maret–April | (a) Buka sebagai uji di satu kabupaten 2027 dengan syarat keras (air dari luar kubah gambut, BBM ditanggung peminjam): varian BCR + irigasi mendapat data. (b) Tidak: manfaat irigasi tetap nol di semua hitungan | 2026–2027 |
| KD-8 | Menjadikan waktu pulih air dan akses ukuran keberhasilan rehabilitasi dan rekonstruksi (KD-R1) | (a) Tetapkan: Pusdatinkom menambah kolom DIBI dan garis dasar terbentuk 2027; sasaran masuk peninjauan Renas PB paling lambat 2027. (b) Tidak: pemulihan tetap diukur sebagai unit selesai dan selisih aset nasional dan daerah tidak terlihat | 100 hari |
| KD-9 | Mengusulkan jalur dana aset desa pascabencana (KD-R2) | (a) Ubah Perban BNPB 4/2024 Pasal 5 huruf e atau buka jalur Dana Bersama lewat R3P: jembatan dan SPAM desa masuk R3P berdana. (b) Tidak: aset desa bergantung pada APBDes dan program K/L di luar R3P | 2026–2027 |
| KD-10 | Mengajukan pengikatan program jembatan TNI AD dan Polri ke R3P lewat rakor Kemenko PMK (KD-R3) | (a) Ajukan: jembatan di daerah bencana tercatat di R3P, DIBI, dan `/pipa` dengan pemilik aset dan jadwal ganti permanen. (b) Tidak: jembatan berjalan di luar R3P; pemilik dan pemeliharaan tidak tertulis (R21) | 100 hari |
| KD-11 | Menugaskan protokol sumur bor RR bersama Badan Geologi (KD-R4) | (a) Tugaskan: sumur RR mengikuti zona konservasi dan uji mutu, tercatat di `/pipa/air`. (b) Tidak: sumur darurat dibangun tanpa daftar, uji mutu, dan pengelola (R22) | 100 hari |
| KD-12 | Menetapkan model pemeliharaan aset terpadu dan baris anggaran pemeliharaan tahunan (baru) | (a) Tetapkan: sepuluh kelas aset, siklus inspeksi, stok minimum, dan pemelihara per kelas berlaku sejak kit pertama; data kondisi wajib di `/pipa`; belanja pemeliharaan masuk RKA BNPB 2027. (b) Tidak: kit dan aset darurat dirawat tanpa jadwal; kesiapan pada hari pemicu tidak terukur (U12, R25) | 2026–2027 |

**Keputusan 14 hari pertama (hanya instrumen yang sudah ada):** (1) nota putusan KD-1; (2) surat ke BPBD Kalteng dan
Satgas tentang vonis pilot dan rencana banjir (KD-2); (3) penugasan Pusdatinkom untuk 10 surat permintaan data
(Lampiran I); (4) penyerahan angka heli internal (KD-5); (5) penugasan unit penyusun KAK Fase 0 dan protokol A/B;
(6) penugasan Deputi Bidang Rehabilitasi dan Rekonstruksi sebagai pemimpin bagian air dan akses; (7) inventaris bailey,
kit, IPA bergerak, dan truk tangki per Direktorat Penanganan Darurat Wilayah terhadap kartu agregat musim hujan (Bab 4.6);
(8) penugasan Pusdatinkom merancang kolom DIBI baru (KD-8).

### 3.6 Daftar singkatan

Dibangkitkan dari `data/glosarium.json`. Entri baru yang wajib ditambahkan (bentuk: singkatan, kepanjangan, definisi
satu kalimat untuk glosarium Lampiran R): AOI (wilayah kajian pilot), A/B (uji banding lengan), BBM, BCR, BMN, BOM,
BRGM, BWS, CAPEX, CHIRPS, DEM, DEMNAS, DN (diameter nominal), DSM, FAT, FEED, FRP, FWI, GA (gambar susunan), GSW,
HDPE, KHG, LKPP, MCD64A1, NPSH, NPV, OD, OPEX, OSM, P&ID, PFAS, PN (tekanan nominal), RAB, RACI, RFQ, SDR, SIPPA, SOP,
TCO, TDH, TMA, VIIRS, YonTP, dan dari bahan rehab: BTT, CAT, DIBI, DSP, Huntap, Huntara, IPA, Jitupasna, PDAM, PDNA,
PKTD, R3P, RR, SPAM. Istilah tanpa singkatan yang masuk glosarium: layflat, lance, manifold, relay, booster,
kopling Storz, foot valve, totalizer, piezometer, dingin terverifikasi, kompleks api, sel 2,2 km, zona A–D, modul
banjir, depot depan, gudang induk, pra-posisi, nyala ulang, head gesek, head minor, derating suhu, lonjakan tekanan, lapis darurat, lapis sementara, lapis permanen, titik serah,
zona konservasi air tanah, jembatan bailey, jembatan gantung, aset tanpa pemilik, skor kondisi, stok minimum, tidak laik
gelar, tidak laik minum.

---

## 4. Bab demi bab

Pola tiap bab: judul baku; subbab; pertanyaan kunci (menjadi front matter `pertanyaan`, digabung satu kalimat
majemuk); isi per subbab; angka wajib (kunci registri, nilai acuan, berkas sumber, keyakinan); objek bernomor (jenis,
kode pilihan grafik, data, generator); rekomendasi yang lahir di bab itu; alokasi halaman (perkiraan); berkas bukti.
Tiap bab dibuka `::: ringkasan-bab` (Temuan, Angka kunci, Rekomendasi) dengan BLUF (L59) dan ditutup paragraf
"Implikasi bagi keputusan" yang merujuk KD. Paket data turunan yang disebut `data/sippa/...` berada di
`data/kajian-bnpb/data/sippa/` (§8.2).

### 4.0 Peta bahan kajian `rehab` ke bab gabungan (keputusan 55)

Penulis memakai ulang naskah final, bukti, dan kunci registri rehab; tidak meriset ulang. Untuk tiap bab yang memakai
bahan rehab, berkas `naskah/sippa/bukti/bab-NN.md` memuat Inti, rujukan baris ke berkas bukti rehab (bukan salinan), dan
hanya temuan baru yang mengaitkan bahan itu ke kit dan model pemeliharaan. Token angka memakai kunci `rehab.*` dan
`perka_2008.*` yang sudah ada di `data/angka.json` (715 kunci `rehab.*` per 26 Okt 2026, dibangun `bangun/rehab_angka.py`
yang tetap menjadi produsennya); kunci pustaka rehab di `pustaka.json` dipakai apa adanya.

| Bahan rehab (naskah final, bukti, riset) | Bab gabungan | Catatan pemakaian |
| --- | --- | --- |
| Bab 1 Pendahuluan (1.1–1.6) | Bab 1.1, 1.4, 1.5 | latar Sumatra 2025, tiga lapis waktu, status dokumen dan jalur adopsi |
| Bab 2 Tinjauan Pustaka (2.1 konsep, 2.2 dokumen BNPB, 2.3 kronologi regulasi, 2.4 kelembagaan, 2.5 praktik, 2.6 Jitupasna) | Bab 1.5 (2.3), Bab 7.7 (2.1), Bab 17.6 (2.4), Lampiran K (2.5), Lampiran A (2.6), Lampiran P (2.3 rinci) | tinjauan tidak menjadi bab tersendiri |
| Bab 3 Metodologi dan Data (3.1–3.8) | Bab 4.1 ringkas; Lampiran A rinci; aturan daftar perhatian 3.6 di Bab 4.7 | rekonsiliasi dan keterbatasan ke Lampiran A |
| Bab 4 Beban RR 2015–2025 (4.1–4.5) | Bab 4.2–4.5, 4.7 | Gambar 4.1–4.5 dari spek rehab |
| Bab 5 Akses (5.1–5.7) | Bab 14.1–14.5, 14.7, 14.8 | program menurut pemilik |
| Bab 6 Air Perpipaan (6.1–6.8) | Bab 12.1–12.7; kotak SIPPA (R1) diganti 12.3 terintegrasi | biaya satuan tanpa total (Q4) |
| Bab 7 Air Tanah (7.1–7.8) | Bab 13.1–13.6 | batas Badan Geologi (Q10) |
| Bab 8 Skenario Terburuk (8.1–8.11) | Bab 4.6 (ringkas, Tabel 4.2, Gambar 4.6); Lampiran M (kartu penuh) | kartu agregat musim hujan 8.9 juga dipakai Bab 21.1 |
| Bab 9 Kesenjangan (9.1–9.7) | 9.1 ke Bab 14.6 dan 18.9; 9.2 ke Bab 17; 9.3 ke Bab 4.4 dan 20.8; 9.4 ke Bab 15.1; 9.5 ke Bab 13.6; 9.6 ke Bab 16.8; 9.7 ke Bab 17.10 | tidak menjadi bab tersendiri; risiko ke Bab 19 |
| Bab 10 Grand Design RR (10.1–10.10) | 10.1–10.4 ke Bab 7.7 (kerangka program, kode PA/PW/PG/PH/PD); 10.5 ke Bab 14.8; 10.6 ke Bab 12; 10.7 ke Bab 13.7; 10.8 ke Bab 12.8; 10.9 ke Bab 7.5 dan 21; 10.10 ke Bab 16.8 | sasaran 10.2 ke Bab 21.5 |
| Bab 11 Kelembagaan, Pembiayaan, Peta Jalan (11.1–11.9) | 11.1–11.4 dan 11.6 ke Bab 17; 11.5 ke Bab 15.6 dan 18.9; 11.7–11.9 ke Bab 21 | |
| Bab 12 Kesimpulan dan Rekomendasi | Bab 22; R-RR-01 sampai 15 ke SR-21 sampai SR-35 (§6); KD-R1 sampai R4 ke KD-8 sampai KD-11 | |
| Ringkasan eksekutif dan kata pengantar rehab | §3.3, §3.4 (temuan 2, 6, 7) | |
| Lampiran rehab A, B, C | Lampiran M | |
| Lampiran rehab D | Lampiran A | rekap DIBI dan rekonsiliasi |
| Lampiran rehab E, K | Lampiran P | |
| Lampiran rehab F, G | Lampiran N | |
| Lampiran rehab H | Lampiran O | |
| Lampiran rehab I | Lampiran K | |
| Lampiran rehab J | §6 dan Lampiran P (irisan register dengan GD Mitigasi) | |
| Lampiran rehab L | Lampiran I (menjadi surat) | |
| Lampiran rehab M | Lampiran R (glosarium dibangkitkan) | |
| `naskah/rehab/bukti/bab-01` s.d. `bab-12` (`.md`, `.angka.json`, `.pustaka.json`) | bukti bab gabungan di kolom kedua baris yang sama | rujukan baris, bukan salinan |
| `naskah/rehab/deck.json` | §11 slide 4, 10, 11, 12, 15 | judul slide rehab menjadi titik awal |
| `rehab/riset/A`–`F` | Bab 14, 17 (A); Bab 14 (B); Bab 13 (C); Bab 12 (D); Bab 12–14, 16.8, Lampiran K (E); Bab 4 (F) | |
| Kunci `rehab.dibi.*`, `.lantai.*`, `.sebaran.*`, `.perhatian.*`, `.kelas_dampak_rr.*`, `.kejadian.*`, `.preseden.*`, `.musim.*` | Bab 4, Lampiran M | |
| Kunci `rehab.pipa.*`, `.darurat.*`, `.pulih.*`, `.pembanding.*` | Bab 12 | |
| Kunci `rehab.akuifer.*` | Bab 13 | |
| Kunci `rehab.jembatan.*`, `.akses.*` | Bab 14 | |
| Kunci `rehab.hukum.*`, `.dana.*`, `.renas.*`, `.renstra.*`, `.sasaran.*`, `.progsun2026.*`, `.keppres2026_1.*`, `.juklak7.*`, `.lembaga.*`, `.r3p.*` | Bab 1.5, 14.6, 15.6, 17, 18.9, 21.5 | |
| Kunci `rehab.rekomendasi.*`, `.register.*`, `.keputusan.*`, `.tidak_direkomendasikan.*`, `.tesis` | tidak dipakai; diganti hitungan register gabungan `sippa.rek.*` (§11) | angka rehab untuk 15 rekomendasi tidak lagi benar setelah digabung |
| Kunci `rehab.sekunder.*`, `.rekon.*` | Lampiran A saja (gerbang D-40) | |
| Spek `bangun/visual/spek-rehab/*` | `sippa-19` sampai `sippa-30` (§7.2) dan diagram Bab 7, 12, 13, 14, 18 | disalin lewat `spek_sippa.py`, tidak digambar ulang |

### BAB 1 PENDAHULUAN (7 hlm)

- **Subbab:** 1.1 Latar Belakang; 1.2 Bara Gambut sebagai Celah Pemadaman; 1.3 Tujuan dan Keluaran; 1.4 Lingkup,
  Horizon, dan Batas Kajian; 1.5 Kedudukan terhadap Kebijakan Karhutla yang Berlaku; 1.6 Sistematika Buku.
- **Pertanyaan kunci:**
  1. Mengapa BNPB memerlukan sarana pemadaman bara bawah permukaan di samping water bombing, OMC, dan regu darat?
  2. Apa yang dicakup dan apa yang tidak dicakup buku ini (bukan DED, bukan pengadaan, bukan jaringan permanen)?
  3. Di mana SIPPA berdiri terhadap kewenangan Kemenhut (Manggala Agni), BRGM, BPBD, dan Satgas?
- **Isi per subbab:**
  - 1.1 Musim 2015, 2019, dan 2023 di Kalteng; luas terbakar resmi; personel yang dikerahkan 2026.
  - 1.2 Sarana udara memadamkan nyala permukaan; bara gambut terus menyala di bawah permukaan dan memicu nyala ulang;
    kecepatan padam ditentukan luas yang bisa dicari, ditusuk, disiram, dan dicek regu per hari (KD §1).
  - 1.3 Tujuan PRD §1.2 butir 1–4 dalam satu paragraf; keluaran: buku, deck, alat kerja `/pipa`.
  - 1.4 Kalteng rinci, 18 provinsi tingkat provinsi; 2026–2030; batas: gambar wajib pengesahan insinyur, angka harga
    wajib RFQ, efikasi belum diuji.
  - 1.5 UU 24/2007 (peran BNPB pada prabencana dan tanggap darurat); Inpres atau peraturan karhutla yang berlaku
    dirujuk dari korpus JDIH lokal (`data/raw/hukum/teks`, skill `hukum-bnpb`); Permen LHK P.32/2016 (pengendalian
    karhutla, Manggala Agni); PP 57/2016 (gambut). Tanpa pasal TNI (keputusan 22).
- **Angka wajib:**

| Kunci | Nilai acuan | Berkas sumber | Keyakinan |
| --- | --- | --- | --- |
| `sippa.luas.kalteng.2019` | 317.749 ha | `public/data/luas_resmi.json` (disalin ke `data/sippa/luas_resmi.csv`) | resmi |
| `sippa.luas.kalteng.2023` | 165.896 ha | idem | resmi |
| `sippa.personel.kalteng.total` | 4.686 orang (per 12 Okt 2026; ditarik ulang per 23 Okt) | `public/data/operasi.json` | resmi |
| `sippa.personel.kalteng.manggala_agni` | 176 | idem | resmi |
| `sippa.daops.kalteng.n`, `.regu`, `.anggota` | 4 Daops, 14 regu, 210 anggota | idem | resmi |
| `sippa.heli.armada_2026` | 33 heli | rekap BNPB 12 Okt 2026 (dibuka ke dokumen sebelum `final`) | resmi |

- **Objek:** Gambar 1.1 alur empat lapis SIPPA dari pencegahan sampai verifikasi (diagram, G21 diagram aliran
  berikon, generator `bangun/visual/teknik/lapis.mjs`); Tabel 1.1 lingkup dan batas kajian (tabel teks: termasuk,
  tidak termasuk, alasan); Tabel 1.2 kedudukan terhadap peraturan (B5.7, kolom PERATURAN, PASAL, PENGATURAN, KAITAN
  SIPPA); foto F1 (§7.1) sebagai pembuka bab.
- **Rekomendasi asal:** tidak ada (bab pengantar).
- **Bukti:** `naskah/sippa/bukti/bab-01.md` (Inti, Temuan bersumber, Inferensi, Celah per pertanyaan, L57).
- **Tambahan GD terintegrasi (keputusan 55):** 1.1 menambah rangkaian banjir dan longsor Sumatra November 2025 dan
  seri jembatan DIBI 2018–2025 (rehab 1.1; `rehab.dibi.jembatan_rusak.2018_2025`); 1.3 menambah tujuan PRD §1.2 butir
  5–6; 1.4 menambah tiga lapis waktu dan cakupan 38 provinsi untuk air dan akses (rehab 1.4, Q5: bencana alam
  berkerusakan fisik); 1.5 menambah rantai norma RR (UU 24/2007 Pasal 48 huruf f, 56–59; PP 21/2008 Pasal 54–60,
  75–80; Perban BNPB 5/2017, 6/2017, 4/2024, 4/2020; Perka BNPB 7/2008; rehab 1.2, 2.3) dan posisi terhadap R3P dan Renas
  PB (rehab 1.2, 1.5). Gambar 1.1 menjadi alur sistem terintegrasi empat lapis: karhutla, banjir dan irigasi, air dan
  akses pascabencana, pemeliharaan. Tabel 1.1 lingkup menjadi jenis bencana × sektor (rehab Tabel 1.1). Sumber dipakai
  ulang: `naskah/rehab/bab-01.md`, `bab-02.md`, bukti `bab-01`, `bab-02`.

### BAB 2 BARA GAMBUT DAN CARA MEMADAMKANNYA (8 hlm)

- **Subbab:** 2.1 Gambut, Muka Air Tanah, dan Kedalaman Bakar; 2.2 Kebutuhan Air per Volume Gambut Membara; 2.3
  Sifat Hidrofobik dan Penetrasi Air; 2.4 Injeksi Dangkal dengan Lance; 2.5 Surfaktan Bebas PFAS sebagai Lengan Uji;
  2.6 Verifikasi Dingin.
- **Pertanyaan kunci:**
  1. Di kedalaman berapa bara gambut berada, dan mengapa tidak lebih dalam dari muka air tanah?
  2. Berapa air yang dibutuhkan per volume gambut membara, dan dari mana angka perencanaannya?
  3. Apa yang diketahui dan belum diketahui tentang injeksi dangkal dan surfaktan?
  4. Kapan sebuah petak dinyatakan dingin?
- **Isi per subbab:**
  - 2.1 Gambut di bawah muka air jenuh tidak membara; kedalaman bakar terukur 0,3–0,5 m (Page dkk. 2002; Ballhorn
    dkk. 2009, dicek ke naskah asli sebelum `final`); PP 57/2016 kriteria kerusakan 0,4 m. Dasar desain: doktrin 0–1,5
    m, lengan uji 3–5 m, batas mutlak 5 m.
  - 2.2 Air dihitung per m³ gambut membara hasil probe (KD K-08); nilai perencanaan bawah, tengah, atas; uji lab UI
    3,81–4,22 L/kg; Santoso dkk. 2021 7,2 L/m².
  - 2.3 Gambut kering bersifat hidrofobik; penetrasi dari permukaan lambat; alasan fisik injeksi.
  - 2.4 Debit lance 15–40 L/min pada 2–4 bar; orifis dari bench (8 lubang 2 mm sekitar 19 L/min pada 2 bar); bukti
    lapangan baru satu uji (Palangka Raya 2021): status hipotesis.
  - 2.5 Surfaktan Class A 0,1–0,3% bebas PFAS; lembar data ekotoksisitas; zona larangan dari intake air minum dan
    perairan ikan (radius `menunggu`); kecepatan penetrasi diukur dari probe, klaim kecepatan pabrikan tidak dipakai.
  - 2.6 Definisi "dingin terverifikasi": semua probe 0,1/0,3/0,5/1,0 m < 50 °C pada cek 24 dan 72 jam dan tanpa nyala
    ulang pada cek 7 hari (ambang usulan, bukan standar pemerintah); drone termal hanya penyaring permukaan.
- **Angka wajib:**

| Kunci | Nilai acuan | Sumber | Keyakinan |
| --- | --- | --- | --- |
| `sippa.bara.kedalaman_m` (rendah 0,3, tinggi 0,5) | 0,3–0,5 m | pustaka `page-2002-...`, `ballhorn-2009-...` | terverifikasi |
| `sippa.bara.pp57_kriteria_m` | 0,4 m | pustaka PP 57/2016 | resmi |
| `sippa.air.m3_per_ha.rendah` | 72 m³/ha | `public/data/operasi.json` (`air_bara` lo), pustaka Santoso dkk. 2021 | terverifikasi |
| `sippa.air.m3_per_ha.tengah` | 200 m³/ha | `operasi.json` | asumsi-kebijakan |
| `sippa.air.m3_per_ha.atas` | 500 m³/ha | `operasi.json` | asumsi-kebijakan |
| `sippa.air.lab_l_per_kg` | 3,81–4,22 L/kg | pustaka Mulyasih (UI) | terverifikasi |
| `sippa.lance.debit_l_min` | 15–40 L/min | PRD §6.5, pustaka A2 (baca-A) | asumsi-kebijakan (sampai bench G2) |
| `sippa.surfaktan.dosis_persen` | 0,1–0,3% | pustaka lembar data kelas Class A | terverifikasi |
| `sippa.surfaktan.radius_larangan_m` | `menunggu` (kajian lingkungan Fase 0) | | menunggu |
| `sippa.verifikasi.ambang_c` | 50 °C | pustaka A2 | asumsi-kebijakan |

- **Objek:** Gambar 2.1 penampang gambut: muka air tanah, zona bara, kedalaman lance 1,5 m dan 3–5 m, probe empat
  kedalaman (diagram teknik, generator `teknik/penampang.mjs`, skala vertikal tertulis); Tabel 2.1 koefisien air
  per ha dan per kg dengan keyakinan (B5.7, `keyakinan: campuran`); Gambar 2.2 rentang debit lance per diameter
  orifis pada 2–4 bar (G12 rentang, `grafik.mjs rentang`, data `data/sippa/lance_orifis.csv` hitungan orifis
  `estimasi-model; belum diuji balik`); `::: catatan` definisi dingin terverifikasi; foto F3 (probe atau gambut
  terbakar).
- **Rekomendasi asal:** SR-06 (bench lance dan surfaktan di G2).
- **Bukti:** `bukti/bab-02.md`; pustaka minimum 8 sumber berbeda, sebagian besar jurnal primer.

### BAB 3 POLA API: KAPAN DAN DI MANA (10 hlm)

- **Subbab:** 3.1 Deteksi Satelit per Tahun 2012–2025; 3.2 Kekerapan per Sel 2,2 km; 3.3 Keterpredikian Lokasi:
  Uji 2019 dan 2023; 3.4 Riwayat Area Terbakar 2001–2025; 3.5 Kemarau Juli–Oktober dan Tahun Terkering; 3.6 Luas
  Terbakar Resmi 18 Provinsi.
- **Pertanyaan kunci:**
  1. Seberapa episodik api Kalteng dari tahun ke tahun?
  2. Seberapa terpusat deteksi di sel yang sama, dan seberapa jarang sel yang terbakar hampir tiap tahun?
  3. Seberapa baik riwayat tiga tahun memprediksi lokasi api musim berikutnya?
  4. Tahun mana yang terkering, dan bagaimana luas terbakar resmi tersebar di 18 provinsi?
- **Isi per subbab:**
  - 3.1 VIIRS S-NPP Kalteng selatan (bbox lon 111,0–114,6, lat −3,6 s.d. −1,5; tepi Kalsel ikut, ditulis di catatan).
    Dasar desain: aset tetap akan diam di sebagian besar tahun, sehingga aset harus bergerak.
  - 3.2 Tabel ambang ≥ 3/5/7/10 dari 14 tahun: porsi sel lawan porsi deteksi.
  - 3.3 72% deteksi 2019 dan 85% deteksi 2023 di sel aktif ≥ 3 tahun sebelumnya: dasar pra-posisi; hanya 61 sel aktif
    ≥ 10 tahun: lokasi kronis jarang, jadi aset tetap tidak dibenarkan (keputusan 60).
  - 3.4 MODIS MCD64A1 2001–2025: jumlah tahun terbakar per kompleks (jendela 2,3 km dan 5 km).
  - 3.5 CHIRPS anomali Juli–Oktober per tahun; empat tahun terkering 2006, 2015, 2002, 2019; hubungan dengan pemicu
    pra-posisi (Bab 10.2).
  - 3.6 Luas SiPongi per provinsi 2019 dan 2023; dasar jumlah kit Bab 6.
- **Angka wajib:**

| Kunci | Nilai acuan | Berkas sumber | Keyakinan |
| --- | --- | --- | --- |
| `sippa.viirs.kalteng.<tahun>` (2012–2025) | 2015 169.782; 2019 76.211; 2023 26.771; 2020 750; 2021 716; 2022 527 | `data/sippa/viirs_tahunan.csv` dari `scripts/data/sippa/sel22.py` atas `data/raw/firms/viirs*.csv` | terverifikasi |
| `sippa.viirs.kalteng.maks_2020_2022` | 750 | idem | terverifikasi |
| `sippa.sel22.kalteng.ge<n>.sel`, `.porsi_sel_persen`, `.porsi_deteksi_persen` (n = 3, 5, 7, 10) | ≥3: 6.212 / 56,8% / 81,9%; ≥7: 825 / 7,5% / 18,4%; ≥10: 61 / 0,6% / 0,7% | `data/sippa/sel22.json` | terverifikasi |
| `sippa.sel22.kalteng.deteksi_2019_sel_berulang_persen` | 72% | idem | terverifikasi |
| `sippa.sel22.kalteng.deteksi_2023_sel_berulang_persen` | 85% | idem | terverifikasi |
| `sippa.mcd.kalteng.kompleks_ge3_tahun` | 300 dari 865 | `pipa/data/area_terbakar.csv` (disalin ke `data/sippa/`) | terverifikasi |
| `sippa.chirps.kalteng.anomali.<tahun>` | 2015 −55%; 2019 −44%; 2023 −16% | `pipa/data/chirps_anomali_tahunan.csv`, `chirps_ringkas.csv` | terverifikasi |
| `sippa.chirps.kalteng.terkering_urut` (teks) | 2006, 2015, 2002, 2019 | `chirps_ringkas.csv` | terverifikasi |
| `sippa.luas.<prov>.puncak` (18 prov) | per provinsi | `data/sippa/luas_resmi.csv` | resmi |

- **Objek:** Gambar 3.1 deteksi VIIRS per tahun 2012–2025 (G1 batang tegak, 14 periode, satu seri, label nilai hanya
  2015, 2019, 2023; `grafik.mjs batang`; spek `sippa-03`); Gambar 3.2 peta kekerapan sel 2,2 km Kalteng (G19
  koroplet sel 5 kelas diskret 1–2, 3–4, 5–6, 7–9, ≥ 10 tahun, ramp api satu warna; perender sel baru §8.3; spek
  `sippa-04`); Tabel 3.1 ambang kekerapan: sel lawan deteksi (B5.7, `csv:`); Gambar 3.3 keterpredikian: porsi
  deteksi 2019 dan 2023 di sel berulang (G14 pasangan batang, spek `sippa-05`); Gambar 3.4 sebaran jumlah tahun
  terbakar per kompleks 2001–2025 (G1 batang per jumlah tahun 0–25, spek `sippa-06`); Gambar 3.5 anomali CHIRPS
  Juli–Oktober 2001–2025 (G7 divergen dari nol, warna arah T2, label kata "lebih kering"/"lebih basah", spek
  `sippa-07`); Tabel 3.2 luas terbakar puncak 18 provinsi (B5.7, `csv: data/sippa/luas_resmi.csv`, `urut: -puncak`).
- **Rekomendasi asal:** SR-12 (pemicu pra-posisi harian).
- **Bukti:** `bukti/bab-03.md`; skrip `sel22.py` wajib self-check `__main__` sebelum angka dipakai.

### BAB 4 BEBAN PASCABENCANA: JEMBATAN, AIR, DAN RUMAH 2015–2025 (10 hlm, baru dari kajian `rehab`)

- **Subbab:** 4.1 Data Beban Pascabencana dan Batas Tafsirnya; 4.2 Jembatan Rusak 2018–2025; 4.3 Rumah dan Fasilitas
  Umum Rusak 2015–2025; 4.4 Layanan Air yang Tidak Tercatat; 4.5 Kejadian Besar sebagai Preseden dan Kecepatan Pulih;
  4.6 Skenario Terburuk Beban Pascabencana per Jenis Bencana; 4.7 Sebaran per Provinsi, Daftar Perhatian, dan Irisan
  dengan Provinsi Kit.
- **Pertanyaan kunci:**
  1. Berapa jembatan, rumah, dan fasilitas umum rusak per tahun dan per jenis bencana, dan apa yang tidak tercatat DIBI?
  2. Provinsi dan kab/kota mana menanggung beban berulang, dan di mana beban itu beririsan dengan provinsi kit SIPPA?
  3. Seberapa cepat lapis sementara dan lapis permanen pulih pada kejadian besar?
  4. Berapa beban pada skenario terburuk yang masuk akal per jenis bencana?
- **Isi per subbab:**
  - 4.1 Ringkasan metode rehab Bab 3 (3.1–3.3, 3.7, 3.8): kolom jembatan DIBI terisi sejak 2018; DIBI tidak punya
    kolom SPAM; rekonsiliasi DIBI lawan R3P dan rilis K/L; rincian metode dan rekonsiliasi pindah ke Lampiran A.
  - 4.2 Rehab 4.2 dan 5.1. Nilai porsi banjir memakai registri (89,2%), bukan "sekitar 91%" di draf
    `rehab/KERANGKA.md` §3.
  - 4.3 Rehab 4.1 (rumah RB/RS/RR per jenis dan tahun, patahan kategori 2018 dan 2024).
  - 4.4 Rehab 6.1 dan 9.3: kerusakan sistem air hanya tercatat di rilis Kementerian PU dan R3P, tidak di DIBI.
  - 4.5 Rehab 4.4 dan 4.5: lapis sementara pulih cepat, lapis permanen dan aset daerah tertinggal (Sumatra 2025:
    jalan dan jembatan nasional 100% berfungsi Mei 2026, jembatan daerah 67%).
  - 4.6 Rehab Bab 8 diringkas menjadi satu tabel tujuh jenis (gempa, tsunami, likuefaksi, banjir dan banjir bandang,
    longsor, erupsi, cuaca ekstrem) dengan empat besaran (rumah, jembatan dan akses, layanan air, durasi pulih); kartu
    penuh dan kepekaan di Lampiran M. Aturan lantai rehab prinsip 7 dipakai apa adanya.
  - 4.7 Rehab 4.3, 8.10, dan aturan daftar perhatian rehab 3.6; tambahan baru: jembatan rusak di delapan provinsi
    gambut yang berpasangan musim banjir (Bab 6.6) dihitung dari `dibi/rekap_provinsi_tahunan.csv`.
  - Dasar desain: banjir mendominasi kerusakan jembatan, sehingga musim banjir kit (Bab 11), kesiapan akses darurat
    (Bab 14), dan pemeliharaan pra-musim (Bab 15) jatuh pada bulan yang sama; ini dasar kalender aset terpadu (Bab 7.5).
- **Angka wajib (kunci `rehab.*` dipakai ulang apa adanya; dicek ke `data/angka.json` 26 Okt 2026):**

| Kunci | Nilai acuan | Berkas sumber | Keyakinan |
| --- | --- | --- | --- |
| `rehab.dibi.jembatan_rusak.2018_2025` | 3.833 | `dibi/rekap_nasional_tahunan.csv` lewat `bangun/rehab_angka.py` | resmi |
| `rehab.dibi.jembatan_rusak.2025` | 1.088 | idem | resmi |
| `rehab.dibi.jembatan_rusak.rasio_2025_rerata` | 2,8 kali rerata 2018–2024 | idem | resmi |
| `rehab.dibi.jembatan_rusak.porsi_banjir_persen` | 89,2% | idem | resmi |
| `rehab.dibi.jembatan_rusak.tahun_awal_terisi` | 2018 | idem | resmi |
| `rehab.dibi.jembatan_rusak.prov.aceh.2018_2025`, `.prov.sumbar.2018_2025` | 633; 521 | `dibi/rekap_provinsi_tahunan.csv` | resmi |
| `rehab.dibi.jembatan_rusak.porsi_6prov_persen` | 54,5% | idem | resmi (turunan) |
| `rehab.dibi.rumah_rb.2015_2025`, `rehab.dibi.fasum_rusak.2015_2025` | 301.311; 21.703 | `dibi/rekap_nasional_tahunan.csv` | resmi |
| `rehab.dibi.kolom_dampak_n`, `rehab.dibi.kolom_air_n` | 19; 0 | DIBI | resmi |
| `rehab.pipa.sumatra2025.spam_terdampak` | 178 | rilis Kementerian PU | resmi |
| `rehab.pulih.sumatra2025.jalan_jembatan_nasional_fungsi_persen_2026_05`, `.jembatan_daerah_fungsi_persen_2026_05` | 100%; 67% | rilis Kementerian PU | resmi |
| `rehab.lantai.*` (per jenis) | rehab Bab 8 | `dibi/kejadian_besar.csv`, pustaka | resmi |
| `sippa.irisan.prov_kit_banjir.jembatan_2018_2025` (baru) | jumlah jembatan rusak di delapan provinsi pasangan kit-banjir | `dibi/rekap_provinsi_tahunan.csv` lewat `bangun/sippa_angka.py` | resmi (turunan) |

- **Objek:** Gambar 4.1 jembatan rusak per tahun 2018–2025 (G1; spek rehab `bab01-jembatan-rusak-tahunan` dipakai
  ulang sebagai `sippa-19`); Gambar 4.2 jembatan rusak per jenis bencana (G8; `bab04-jembatan-jenis` sebagai
  `sippa-20`); Gambar 4.3 peta jembatan rusak per provinsi 2018–2025 dengan penanda delapan provinsi pasangan
  kit-banjir (G20; `bab04-peta-jembatan-provinsi` ditambah lapisan penanda, `sippa-21`); Gambar 4.4 rumah RB per tahun
  bertumpuk kelompok bahaya (G9; `bab04-rumah-rb-tahunan` sebagai `sippa-22`); Tabel 4.1 preseden kejadian besar ×
  besaran (rehab Tabel 4.1, L55); Gambar 4.5 capaian pulih per lapis dan pemilik aset Sumatra 2025
  (`bab04-pulih-sumatra-pemilik-aset` sebagai `sippa-23`); Tabel 4.2 skenario terburuk tujuh jenis × empat besaran
  (ringkasan rehab Kartu 8.2–8.8); Gambar 4.6 matriks kemungkinan × dampak (G17; `bab08-matriks-kemungkinan-dampak`
  sebagai `sippa-24`).
- **Rekomendasi asal:** SR-21 (rehab R-RR-01, kolom air dan jembatan di DIBI), SR-22 (R-RR-02, garis dasar waktu pulih).
- **Sumber yang dipakai ulang:** `naskah/rehab/bab-03.md`, `bab-04.md`, `bab-08.md`; `naskah/rehab/bukti/bab-03`,
  `bab-04`, `bab-08` (`.md`, `.angka.json`, `.pustaka.json`); `naskah/rehab/90-lampiran-a.md` s.d. `-d.md`;
  `rehab/riset/F-data-repo.md`.
- **Bukti:** `bukti/bab-04.md` berisi Inti, rujukan baris ke tiga berkas bukti rehab di atas, dan temuan baru irisan
  provinsi kit; `.pustaka.json` memakai ulang kunci pustaka rehab.

### BAB 5 KELAYAKAN KIT DI KALIMANTAN TENGAH (12 hlm)

- **Subbab:** 5.1 Aturan Zona A–D; 5.2 Tiga Versi Zona: `kendala.json`, Jalan Utama OSM, dan Semua Jalan OSM; 5.3 Jarak ke Air dan ke Jalan;
  5.4 Beda Elevasi Air dan Kompleks; 5.5 Air yang Tidak Terlihat Satelit; 5.6 Zona per Kabupaten; 5.7 Calon Wilayah
  Pilot.
- **Pertanyaan kunci:**
  1. Berapa kompleks api Kalteng yang dapat dilayani kit, dan berapa yang tidak?
  2. Seberapa besar hasil zona bergantung pada jalan `track` OpenStreetMap, dan bagaimana keraguan itu ditutup?
  3. Apa yang diketahui dari elevasi dan citra air tentang kesulitan memompa dan debit kemarau?
  4. Di mana tiga wilayah pilot 2027 dipilih, dan mengapa?
- **Isi per subbab:**
  - 5.1 Rumus zona PRD §5.1 dengan ambang air 2,5 km dan jalan 5 km (keputusan 30) dan pembanding ketat "<"
    (keputusan 51: jarak tepat 2,50 atau 5,00 km masuk kelas jauh); kompleks tanpa data jalan dihitung jauh. Dasar desain: kit melayani A dan B; C memakai sumur dangkal; D tidak dipra-posisikan.
  - 5.2 Tiga versi berdampingan (versi `kendala.json`, jalan utama OSM, semua jalan OSM); pergeseran 263 kompleks B ke
    A dan 83 D ke C antara versi `kendala.json` dan semua jalan OSM berasal dari `track`; versi `kendala.json`
    menjadi angka perencanaan; kenaikan zona hanya setelah verifikasi lapangan (`jalan_terverifikasi`).
  - 5.3 Median dan p90 jarak air dan jalan; 44 kompleks tanpa jalan kendaraan OSM dalam 16 km.
  - 5.4 Median beda elevasi −3,9 m (DSM berkanopi): pompa hampir selalu mendorong ke atas; profil trase dari DEMNAS
    wajib per AOI.
  - 5.5 GSW di titik air terdekat 120 permanen, 103 musiman, 642 tidak terdeteksi; "tidak terdeteksi" bukan kering;
    gerbang G1 (debit terukur) tidak dapat dilewati.
  - 5.6 Tabel zona per kabupaten (tiga versi).
  - 5.7 Calon AOI: satu mudah (Kota Palangka Raya, Bukit Batu/Jekan Raya), satu menengah (Pulang Pisau), satu sulit
    (Kapuas, Mantangai), dengan saringan berangka KD §3.2; status "belum disurvei"; AOI di areal berizin hanya dengan
    persetujuan tertulis; nama perusahaan tidak ditulis.
- **Angka wajib:**

| Kunci | Nilai acuan | Berkas sumber | Keyakinan |
| --- | --- | --- | --- |
| `sippa.kompleks.kalteng.n` | 865 | `pipa/data/kompleks.csv` | terverifikasi |
| `sippa.kompleks.kalteng.gambut` | 644 | `kendala.json` | terverifikasi |
| `sippa.zona.kalteng.konservatif.<a,b,c,d>.n` (versi `kendala.json`) | 188, 418, 89, 170 | `data/sippa/zona.json` (versi `k`) dari `scripts/data/sippa/zona.py` atas `kendala.json` dan `osm_jarak.csv`, aturan "<" | terverifikasi |
| `sippa.zona.kalteng.utama.<a,b,c,d>.n` (jalan utama OSM) | 198, 429, 81, 157 | idem (versi `u`) | terverifikasi |
| `sippa.zona.kalteng.optimistis.<a,b,c,d>.n` (semua jalan OSM) | 469, 158, 167, 71 | idem (versi `o`) | terverifikasi |
| `sippa.zona.kalteng.konservatif.ab.n`, `.ab.persen` | 606; 70% | idem | terverifikasi |
| `sippa.zona.kalteng.utama.ab.persen`, `sippa.zona.kalteng.optimistis.ab.persen` | 72%; 72% (627 kompleks pada keduanya) | idem | terverifikasi |
| `sippa.zona.kalteng.pindah_b_ke_a`, `.pindah_d_ke_c` | 263; 83 | `pipa/data/matriks_jarak.md` (tabel perpindahan) | terverifikasi |
| `sippa.jarak.air.median_km`, `.p90_km` | 1,02; 5,79 | `osm_jarak.csv` | terverifikasi |
| `sippa.jarak.air_kecil.median_km` | 1,67 | idem | terverifikasi |
| `sippa.jarak.jalan.median_km`, `.p90_km` | 2,27; 11,74 | idem | terverifikasi |
| `sippa.jarak.tanpa_jalan_16km.n` | 44 | idem | terverifikasi |
| `sippa.dem.beda_median_m` | −3,9 m | `pipa/data/dem_elevasi.csv` | terverifikasi |
| `sippa.gsw.<permanen,musiman,tak_terdeteksi>.n` | 120; 103; 642 | `pipa/data/gsw_air_terdekat.csv` | terverifikasi |
| `sippa.aoi.<kode>.kekerapan_sel`, `.median_air_km` | KD §3.2 | `data/sippa/aoi_calon.json` | terverifikasi (saringan) |

- **Objek:** Gambar 5.1 peta zona A–D per kompleks versi konservatif (titik berwarna kategori A–D, empat warna
  kategorikal urutan tetap, legenda empat kelas; `peta.mjs` lapisan titik; spek `sippa-01`, dipakai juga sebagai
  Gambar RE.1); Gambar 5.2 peta yang sama versi semua jalan OSM (peta kecil berganda dengan 4.1, skala dan warna identik,
  spek `sippa-02`); warna zona biru (air dekat) dan emas (air jauh) dengan huruf A–D dan pola penuh, cincin,
  setengah, silang (keputusan 52, DESIGN-SYSTEM §2.1.3); Tabel 5.1 matriks zona tiga versi dan tabel perpindahan (B5.7, `csv: data/sippa/zona_versi.csv`);
  Gambar 5.3 sebaran jarak ke air dan ke jalan (G12 rentang median dan p90 per ukuran jarak, spek `sippa-08`); Gambar
  4.4 sebaran beda elevasi air lawan kompleks (G1 batang per kelas 1 m, spek `sippa-09`); Tabel 5.2 status air GSW
  (B5.7); Tabel 5.3 zona per kabupaten tiga versi (B5.7, `grup: KABUPATEN`, `total: ya`); Tabel 5.4 calon AOI (B5.7,
  kolom KAB/KOTA, KECAMATAN, KEKERAPAN SEL, MEDIAN AIR, KELAS MEDAN, STATUS LAHAN, CATATAN); `::: catatan` pernyataan
  produsen dan atribusi OSM (ODbL).
- **Rekomendasi asal:** SR-05 (pemilihan AOI, persetujuan pemegang hak, izin air), SR-20 (verifikasi `track` dan
  pelengkapan `akses.json`).
- **Bukti:** `bukti/bab-05.md`; keterbatasan dari `pipa/data/README.md` disalin ke Celah.

### BAB 6 KEBUTUHAN KIT 18 PROVINSI (16 hlm)

- **Subbab:** 6.1 Rumus Jumlah Kit per Provinsi; 6.2 Provinsi Gambut; 6.3 Provinsi Mineral dan Sabana; 6.4 Zona A–D
  di Sembilan Provinsi; 6.5 Profil 18 Provinsi; 6.6 Depot dan Musim Banjir Pasangan.
- **Pertanyaan kunci:**
  1. Berapa kit yang dibutuhkan tiap provinsi bila skala dibuka setelah gerbang G5, dan seberapa peka angka itu
     terhadap asumsi?
  2. Di provinsi mana kit tidak menjawab sebagian besar kompleks (zona D)?
  3. Di mana depot diusulkan dan ke mana kit dipindah pada musim banjir?
- **Isi per subbab:**
  - 6.1 Kit = luas puncak SiPongi (maks 2019 atau 2023) dibagi sekitar 22.700 ha per kit, dibulatkan, minimal 1 bila
    luas puncak ≥ 10.000 ha di gambut atau sabana; kit mineral dan sabana 75% biaya kit gambut; kepekaan ±50% (Bab
    13.7). Dasar: prinsip lantai angka tercatat (§2 butir 7).
  - 6.2 Delapan provinsi gambut: Sumsel 15, Kalteng 14, Kalsel 8, Kalbar 7, Riau 4, Kaltim 3, Jambi 3, Lampung 2
    (jumlah 56).
  - 6.3 Sepuluh provinsi mineral dan sabana: Papua Selatan 7, NTT 6, NTB 3, Jatim 2, Maluku 2, Sultra 1, Sulsel 1,
    Sulteng 1, Jabar 1, Jateng 1 (jumlah 25); konfigurasi tanpa lance dan node suhu gambut.
  - 6.4 Zona dari `kendala.json` untuk sembilan provinsi yang tercakup; D 34% di sembilan provinsi, 53% di Papua
    Selatan; provinsi tanpa data zona ditulis "zona belum dihitung" dengan permintaan data.
  - 6.5 **Satu provinsi satu profil bertemplat identik (L20, S26)**, urut kit terbanyak: kartu 4 angka (luas puncak,
    tahun puncak, kit bersyarat, porsi zona D atau "belum dihitung"), peta kecil provinsi (titik kompleks bila ada),
    musim kemarau dan musim banjir pasangan, depot calon (Daops atau BPBD), kelas kit (gambut atau mineral),
    catatan khusus satu kalimat. 18 profil x 2 profil per halaman = 9 hlm di badan teks; versi dasbor lengkap di
    Lampiran C.
  - 6.6 Pasangan musim: kit gambut di provinsi berpasangan banjir mendapat modul banjir (Kalteng, Kalsel, Kalbar,
    Sumsel, Riau, Jambi, Kaltim, Lampung); NTT dan Papua Selatan ditimbang per kasus.
- **Angka wajib:**

| Kunci | Nilai acuan | Berkas sumber | Keyakinan |
| --- | --- | --- | --- |
| `sippa.kit.ha_per_kit` | sekitar 22.700 ha | `data/sippa/kit_nasional.json` dari `scripts/data/sippa/nasional.py` | asumsi-kebijakan |
| `sippa.kit.<prov>.n` (18) | daftar 5.2–5.3 | idem | asumsi-kebijakan |
| `sippa.kit.nasional.n`, `.gambut`, `.mineral` | 81; 56; 25 | idem | asumsi-kebijakan |
| `sippa.kit.mineral_porsi_biaya` | 75% | idem | asumsi-kebijakan |
| `sippa.kit.nasional.n_rendah`, `.n_tinggi` | kepekaan ±50% ha per kit (dihitung) | idem | asumsi-kebijakan |
| `sippa.zona.sembilan.d.persen` | 34% | `data/sippa/zona_provinsi.csv` dari `kendala.json` | terverifikasi |
| `sippa.zona.papua_selatan.d.persen` | 53% | idem | terverifikasi |
| `sippa.luas.<prov>.puncak`, `.tahun_puncak` | per provinsi | `data/sippa/luas_resmi.csv` | resmi |
| `sippa.banjir.<prov>.kejadian_2015_2025` | per provinsi | `data/dibi/rekap_provinsi_tahunan.csv` | resmi |

- **Objek:** Gambar 6.1 peta Indonesia jumlah kit bersyarat per provinsi (G20 simbol sebanding tiga ukuran legenda,
  warna dua kelas gambut lawan mineral; pil "rencana bersyarat, bukan pengadaan"; spek `sippa-10`); Tabel 6.1 kit per
  provinsi (B5.7, `csv: data/sippa/kit_nasional.csv`, `grup: KELOMPOK`, `total: ya`, kolom PROVINSI, LUAS PUNCAK
  (ha), TAHUN, KIT, KIT RENDAH, KIT TINGGI, KELAS); Gambar 6.2 porsi zona A–D di sembilan provinsi (G8 batang
  bertumpuk 100%, empat kategori, urutan warna sama dengan Gambar 5.1, spek `sippa-11`); 18 profil provinsi
  (komponen profil wilayah B5.x bertemplat, data `data/sippa/profil_provinsi.csv`, peta kecil dari `peta.mjs` spek
  `sippa-p-<kode>`); Tabel 6.2 depot calon dan musim banjir pasangan (B5.7).
- **Rekomendasi asal:** SR-17 (rencana nasional bertahap bersyarat).
- **Bukti:** `bukti/bab-06.md`; tiap profil punya satu baris sumber; provinsi tanpa `kendala.json` diberi Celah.

### BAB 7 DESAIN SIPPA TERINTEGRASI (11 hlm)

- **Subbab:** 7.1 Empat Lapis Sistem; 7.2 Doktrin per Zona; 7.3 Kit Gambut dan Kit Mineral; 7.4 Modul Banjir; 7.5
  Siklus Tahunan Kit; 7.6 Batas Desain.
- **Pertanyaan kunci:**
  1. Apa bentuk sistem SIPPA dari pencegahan sampai verifikasi?
  2. Sarana apa dipakai di tiap zona, dan apa yang sengaja tidak dipakai?
  3. Bagaimana satu kit berpindah antara musim karhutla, musim banjir, dan servis?
  4. Pilihan teknis apa yang ditutup, dan mengapa?
- **Isi per subbab:**
  - 7.1 Hibrida empat lapis KD §3.1: pencegahan di sel inti (sekat kanal dan pembasahan ulang, sumur dangkal
    pra-posisi); kit relay portabel pra-posisi pada tahun kering; protokol perimeter-inti-verifikasi. Tanpa
    koridor semi-permanen (keputusan 60): lokasi kronis dilayani sekat kanal, sumur dangkal, dan depot kit terdekat.
  - 7.2 Tabel doktrin zona PRD §5.1 (arti, doktrin, sarana inti, yang tidak dilakukan).
  - 7.3 Kit gambut (2 pompa N+1, layflat DN100 1.000 m, DN65 500 m, 8 lance, manifold, flowmeter, sensor, APD 20
    orang) dan kit mineral (tanpa lance dan node suhu, DN100 800 m, 10 nozzle).
  - 7.4 Modul banjir: pompa debit besar head rendah, layflat DN150 300 m, intake terapung; berbagi gudang, truk, kru;
    tidak berbagi pompa.
  - 7.5 Mei–Oktober karhutla (depot depan saat pemicu), November–April banjir, Maret–April servis dan irigasi;
    status lacak `gudang`, `depot`, `gelar`, `banjir`, `servis`, `hilang`.
  - 7.6 Batas desain sebagai kalimat positif: debit kerja kit 300 L/min (5 L/s) karena delapan lance menyerap paling
    banyak 320 L/min; 600 L/min dengan delapan lance ditulis sebagai contoh konfigurasi yang ditolak (NO-GO
    serapan); jumlah lance per kit dipastikan bench G2; tanpa trunk 2.000 L/min
    sebagai standar; tanpa HDPE dan tanpa jaringan pipa tetap (2 km HDPE OD200 sekitar 20 ton dan sekitar
    160 sambungan fusi, tidak tahan bara; keputusan 60); injeksi ≤ 5 m; sumur dalam 50–100 m hanya pengecualian; tanpa baja
    berlapis dan pipa tertanam (sekitar 2,7 kali harga HDPE, merusak hidrologi gambut); umur HDPE 50 tahun berlaku
    pada kondisi standar, tidak di gambut terbakar.
- **Angka wajib:** `sippa.kit.debit_operasi_ls` (5 L/s, asumsi-kebijakan); `sippa.kit.debit_operasi_l_min` (300 L/min,
  asumsi-kebijakan); `sippa.kit.panjang_dn100_m` (1.000 m);
  `sippa.kit.panjang_dn65_m` (500 m); `sippa.kit.lance_n` (8); `sippa.modul_banjir.debit_min_ls` (100 L/s, head 3–5
  m, asumsi-kebijakan); `sippa.hdpe.od200_2km_ton` (sekitar 20 ton, estimasi-model); `sippa.hdpe.od200_2km_sambungan`
  (sekitar 160, estimasi-model); `sippa.baja.rasio_harga_hdpe` (sekitar 2,7, asumsi-kebijakan); `sippa.sumur.biaya_titik`
  (Rp1,5–6 juta, terverifikasi sampai dibuka ke dokumen resmi). Semua dari
  `data/sippa/parameter.csv` (satu tabel parameter dengan kolom sumber, PRD §6) atau pustaka.
- **Objek:** Gambar 7.1 diagram empat lapis (G21 diagram berikon, ulang dari Gambar 1.1 tidak boleh: Gambar 1.1
  ringkas alur, Gambar 7.1 rinci per lapis dengan sarana; generator `teknik/lapis.mjs` mode rinci); Tabel 7.1 doktrin
  per zona (B5.7); Gambar 7.2 siklus tahunan kit (G23 kalender 12 bulan, pita status; `teknik/siklus.mjs`); Tabel 7.2
  aset yang dibagi dan tidak dibagi karhutla-banjir (B5.7); Tabel 7.3 batas desain: pilihan, alasan fisik, alasan
  biaya, syarat dibuka kembali (B5.7); Gambar 7.3 ringkasan diagram zona A–D dan alur keputusan sarana (SIPPA-G-11
  versi buku).
- **Rekomendasi asal:** SR-01 (nota putusan bergerbang), SR-11 (sekat kanal sel inti sebagai lengan pembanding).
- **Bukti:** `bukti/bab-07.md`.
- **Tambahan GD terintegrasi (keputusan 55):** subbab baru 7.7 "Aset Pascabencana dalam Sistem yang Sama": kit,
  sumur, perpipaan sementara, dan jembatan darurat berbagi gudang YonTP, transport, data `/pipa`, dan model
  pemeliharaan; tiga lapis waktu rehab (darurat, sementara, permanen) dipetakan ke empat lapis SIPPA (rehab 2.1,
  10.1–10.4; kerangka program rehab berkode A, W, G, H, D ditulis ulang PA-, PW-, PG-, PH-, PD- supaya tidak bentrok
  dengan kode gerbang G0–G6 dan kode grafik G1–G25). 7.5 siklus tahunan menambah kesiapan akses dan air musim hujan
  November–April (rehab 10.9, Gambar `bab10-g23-kalender-musim-hujan`) dan jatuh tempo pemeliharaan pra-musim (Bab 15).
  Objek tambahan: Tabel 7.4 kerangka program terintegrasi (kode, lapis, status P7, pemimpin, peran BNPB, bukti; rehab
  Tabel 10.1 + program kit). Sumber: `naskah/rehab/bab-02.md` (2.1), `bab-10.md` (10.1–10.4, 10.9).

### BAB 8 HIDRAULIKA DAN TITIK KERJA (10 hlm)

- **Subbab:** 8.1 Rumus dan Asumsi; 8.2 Titik Kerja di Ujung Manifold; 8.3 Kehilangan Head per Diameter; 8.4 Serapan
  Lance dan Debit Pompa; 8.5 Tekanan, Suhu, dan Lonjakan; 8.6 Profil Trase dan Booster; 8.7 BBM dan Emisi BBM.
- **Pertanyaan kunci:**
  1. Pompa dan selang apa yang cukup untuk relay 1 km, dan kapan booster dibutuhkan?
  2. Berapa debit yang benar-benar dapat diserap regu dengan lance, dan bagaimana neraca debitnya ditutup?
  3. Batas tekanan, suhu, dan kecepatan apa yang menolak sebuah konfigurasi?
  4. Berapa BBM dan emisi BBM per jam dan per musim?
- **Isi per subbab:**
  - 8.1 Tabel rumus PRD §6.4 (Hazen-Williams SI, head minor, TDH, daya poros, BBM, derating HDPE, gerbang tekanan,
    kecepatan, Joukowsky, volume isi, neraca air sumber); fungsi kembar `public/pipa/hitung.js` dan
    `scripts/data/sippa/hidraulika.py`, diuji terhadap nilai acuan (Lampiran J).
  - 8.2 Spesifikasi sebagai tekanan di ujung 2–4 bar pada debit operasi, dipilih dari kurva Q-H; kasus acuan relay
    DN100 1 km 10 L/s, C 130, +2 m, K 5, sisa 3 bar, dengan 3,5 m hisap: head gesek 19,06 m/km, TDH 55,6 m, tekanan
    pompa 5,45 bar, daya poros 8,4 kW; pada debit kerja 300 L/min head gesek 5,28 m/km dan tekanan pompa 4,18 bar
    (ID asumsi 96 mm).
  - 8.3 Kurva head loss DN65, DN100, DN150 layflat dan HDPE OD160/OD200 terhadap debit.
  - 8.4 Gerbang serapan: NO-GO bila debit pompa > jumlah lance × 40 L/min + debit pemakai lain yang tercatat.
    **Neraca debit kit di Tabel 8.3** (diputus sesi induk 25 Okt 2026): 8 lance × 40 L/min = 320 L/min, jadi debit
    kerja bawaan 300 L/min (5 L/s) lolos; 600 L/min (10 L/s) dengan 8 lance adalah contoh ajar yang ditolak; debit di
    atas serapan lance hanya sah bila selang serang 38 mm atau pembasahan perimeter dicatat sebagai pemakai lain.
    Jumlah lance per kit dipastikan bench test G2 (SR-06).
  - 8.5 Derating suhu HDPE 35 °C = 0,79; uji invarian OD160 SDR11 2.000 L/min 2 km +10 m, C 130, tanpa 3,5 m hisap,
    NO-GO (12,49 bar > 11,12 bar; 12,84 bar bila hisap dihitung) dan OD200 lolos (6,20 bar tanpa hisap; 6,54 bar
    dengan hisap); katup tutup lambat; relief ≤ 88% PN.
  - 8.6 Profil trase contoh dari DEMNAS AOI (SIPPA-G-08); booster dihitung dari profil, bukan jarak tetap.
  - 8.7 BBM 22 L/jam per pompa kelas 1.500 L/min pada rating; emisi pilot sekitar 73 ton CO2 per musim (hanya BBM).
- **Angka wajib (semua `estimasi-model` dari `data/sippa/hidraulika_skenario.csv` keluaran `hidraulika.py`, kecuali
  disebut):** `sippa.hid.dn100_10ls.hf_m_per_km` (19,06); `sippa.hid.dn100_1km.tdh_m` (55,6);
  `sippa.hid.dn100_1km.tekanan_pompa_bar` (5,45); `sippa.hid.dn100_1km.daya_kw` (8,4);
  `sippa.hid.dn100_5ls.hf_m_per_km` (5,28); `sippa.hid.bawaan.tekanan_pompa_bar` (4,18);
  `sippa.hid.dn100_1km.volume_isi_m3` (7,85); `sippa.hid.dn100_1km.waktu_isi_menit` (13,09);
  `sippa.hid.od160.tekanan_bar` (12,49, tanpa hisap) dan `.batas_bar` (11,12); `sippa.hid.od200.tekanan_bar` (6,20, tanpa
  hisap); nilai acuan sama persis dengan kasus H1–H8 DESAIN-TEKNIS §5.8;
  `sippa.hid.derating_35c` (0,79, asumsi-kebijakan); `sippa.hid.serap.lance8_l_min` (320); `sippa.pompa.kelas_l_min`
  (1.500 L/min pada 1,0 MPa, terverifikasi lembar data); `sippa.pompa.bbm_l_jam` (22, terverifikasi);
  `sippa.co2.pilot_musim_ton` (sekitar 73).
- **Objek:** Gambar 8.1 kehilangan head per km terhadap debit untuk lima diameter (garis, satu sumbu, lima seri,
  legenda dan label di ujung garis, warna kategorikal urutan tetap; `grafik.mjs garis`; spek `sippa-12`); Tabel 8.1
  rumus dan nilai bawaan (B5.7); Tabel 8.2 skenario hidraulika: relay DN100 1 km, 1,5 km, 2 km; HDPE OD160 NO-GO; OD200
  lolos (B5.7, `csv:`, kolom VONIS dengan pil teks GO/NO-GO, bukan warna saja); Tabel 8.3 neraca debit kit (B5.7);
  Gambar 8.2 profil trase contoh AOI (SIPPA-G-08 versi buku; `teknik/profil.mjs` dari DEMNAS); Tabel 8.4 BBM per
  insiden dan per musim (B5.7).
- **Rekomendasi asal:** SR-06 (bench G2: kurva Q-H, head loss ±15%, lance, uji 1,5 kali tekanan kerja).
- **Bukti:** `bukti/bab-08.md`; uji kembar JS-Python hijau dilampirkan sebagai bukti, bukan klaim.

### BAB 9 SPESIFIKASI KOMPONEN DAN GAMBAR TEKNIK (12 hlm)

- **Subbab:** 9.1 Struktur Kode Komponen; 9.2 Kit Gambut; 9.3 Kit Mineral dan Sabana; 9.4 Modul Banjir; 9.5 Sensor
  dan Telemetri Lapangan; 9.6 Kriteria Terima; 9.7 Gudang Induk dan Depot Depan; 9.8 Daftar Gambar
  Teknik.
- **Pertanyaan kunci:**
  1. Apa isi kit sampai komponen terkecil, dengan titik kerja dan kriteria terima per komponen?
  2. Bagaimana tiap komponen dirawat dan diperiksa sebelum dan sesudah musim?
  3. Gambar teknik apa yang tersedia, dan apa batas pemakaiannya?
- **Isi per subbab:**
  - 9.1 Kode P-/H-/I-/M-/C-/ST-/SF-/V-/FT-/PT-/T-/GWT-/U-/Q-/S-/B- (pola paket pemilik, baca-B §2) supaya RFQ cocok.
  - 9.2 BOM kit gambut ringkas (rinci sampai baut di Lampiran D): kelas kinerja, jumlah, titik kerja, keyakinan harga.
    Tanpa merek (§2 butir 6).
  - 9.3 Selisih kit mineral.
  - 9.4 BOM modul banjir.
  - 9.5 Sensor yang menentukan gerbang G1–G4 dan laju sampel (PRD §6.6); pilot 2026 manual; sensor mulai 2027.
  - 9.6 Kriteria terima per komponen; filter: mesh ditetapkan dari uji sumbat G2; FAT kurva Q-H sebelum bayar.
    Interval pemeliharaan di Bab 15.
  - 9.7 Gudang induk (ukuran rujukan 24 × 12 × 5 m, asumsi; volume simpan sekitar 12 m³ per kit dihitung dari BOM);
    depot depan kontainer 20 kaki.
  - 9.8 SIPPA-G-01 sampai G-12 dengan kriteria terima PRD §6.9; gambar penuh di Lampiran F; semua bertanda wajib
    pengesahan insinyur.
- **Angka wajib:** `sippa.bom.kit_gambut.<kode>.jumlah` dan `.harga` (dari `data/sippa/harga.csv`, satu baris satu
  komponen, keyakinan per baris); `sippa.bom.kit_gambut.total` (rentang); `sippa.bom.kit_mineral.total`;
  `sippa.bom.modul_banjir.total`; `sippa.pompa.harga_listing` (Rp190,78 juta termasuk PPN, terverifikasi);
  `sippa.layflat.dn100.harga_m` (Rp275 ribu, asumsi-kebijakan); `sippa.layflat.dn65.harga_m` (Rp165 ribu);
  `sippa.gudang.volume_kit_m3` (sekitar 12, estimasi-model); `sippa.gambar.n` (12).
- **Objek:** Tabel 9.1 BOM kit gambut (B5.7, `csv: data/sippa/bom_gambut.csv`, kolom KODE, KOMPONEN, JUMLAH, TITIK
  KERJA, KRITERIA TERIMA, HARGA, KEYAKINAN; `keyakinan: campuran`); Tabel 9.2 selisih kit mineral (B5.7); Tabel 9.3
  BOM modul banjir (B5.7); Tabel 9.4 sensor dan laju sampel (B5.7); Gambar 9.1 susunan kit relay (SIPPA-G-01 diperkecil); Gambar 9.2 P&ID kit relay (SIPPA-G-02
  diperkecil); Gambar 9.3 detail lance (SIPPA-G-03 diperkecil); Tabel 9.5 daftar gambar teknik dan kriteria terima
  (B5.7). Gambar teknik di badan teks berjenis `diagram` dan keterangan selalu memuat kalimat pengesahan.
- **Rekomendasi asal:** SR-07 (pengadaan 3 kit dan 3 modul banjir bersyarat G2, RFQ e-katalog dan 3 penawaran).
- **Bukti:** `bukti/bab-09.md`; tiap harga punya baris di `harga.csv` dengan `sumber`, `tanggal`, `keyakinan`.
- **Perubahan GD terintegrasi (keputusan 55):** 9.6 hanya "Kriteria Terima" (FAT kurva Q-H sebelum bayar, mesh filter
  dari uji sumbat G2); interval pemeliharaan dan Tabel 9.5 lama pindah ke Bab 15 (Tabel 15.2). Pertanyaan kunci 2
  dijawab dengan rujukan ke Bab 15.

### BAB 10 OPERASI: PEMICU, RESPONS, SOP, K3, LOGISTIK, DAN PELATIHAN (14 hlm)

- **Subbab:** 10.1 Alur Operasi dari Pemicu sampai Verifikasi; 10.2 Pemicu Pra-posisi; 10.3 Matriks Respons FRP, Luas,
  dan Zona; 10.4 Enam Keluarga SOP; 10.5 Keselamatan dan Kesehatan Kerja; 10.6 BBM; 10.7 Logistik Antar-daerah; 10.8
  Pelatihan dan Latihan Tahunan.
- **Pertanyaan kunci:**
  1. Kapan kit dipindah ke depot depan, dan siapa memutuskannya?
  2. Berapa regu, hari, dan sarana dibutuhkan pada tiap tingkat api, dan kapan heli dipanggil?
  3. Prosedur apa yang wajib, dan di titik mana pekerjaan dihentikan?
  4. Siapa dilatih, berapa jam, dan kapan latihan diulang?
- **Isi per subbab:**
  - 10.1 Alur hulu-hilir: pemicu, pra-posisi, deteksi, survei trase cepat, gelar, injeksi, verifikasi, bongkar, kembali.
  - 10.2 Pemicu dari `iklim_outlook.json`, `fwi_ansambel.json`, dan kelayakan kompleks (keluaran `pemicu.json`
    harian); ambang ditulis `asumsi-kebijakan` sampai diuji terhadap musim 2015, 2019, 2023 (uji balik ditulis hasilnya,
    bukan klaim).
  - 10.3 Matriks PRD §5.4 (tingkat 1–4); FRP hanya penanda nyala permukaan; koefisien `bara_regu` 0,5–2,8
    ha/regu/hari dan `orang_regu` 15 dari `operasi.json`; ambang FRP diuji terhadap log 2026 sebelum `final`.
  - 10.4 SOP-01 sampai SOP-06 ringkas (tujuan, pelaku, titik berhenti); teks lengkap di Lampiran G.
  - 10.5 CO dan PM2.5, APD, larangan masuk gambut tak tertopang, jalur lolos, medik, komunikasi.
  - 10.6 Penerimaan, penyaluran, mesin mati dan dingin saat isi, wadah berpenampung sekunder, log tambah-saja,
    cadangan 1,25 kali.
  - 10.7 Gudang YonTP terdekat Daops; transport antar-daerah dengan permintaan tertulis Satgas atau BPBD penerima;
    ETA p50 dan p90 dicatat; kendaraan dan perahu bawaan pinjam.
  - 10.8 Kurikulum operator inti 58 jam (ekologi 4, FWI dan GIS 6, pompa dan hidraulika 8, pipa dan selang 6, injeksi
    dan probing 8, drone 4, HSE 6, lapangan terpadu 8, malam 4, asesmen 4); modul YonTP 8 jam teori + 12 jam latihan;
    latihan basah gabungan tanpa membakar tiap tahun (gerbang G6).
- **Angka wajib:** `sippa.respons.bara_regu.rendah/.tengah/.tinggi` (0,5/1,0/2,8 ha/regu/hari, kasus Manggala
  Agni 2026 di `operasi.json` `koef.bara_regu` hi/mid/lo, dibaca saat bangun); `sippa.respons.orang_regu` (15); `sippa.respons.jam_tiba_heli` (6 jam,
  asumsi-kebijakan); `sippa.respons.tingkat<n>.*` (regu, hari dari `respons.py`); `sippa.pelatihan.jam_inti` (58);
  `sippa.pelatihan.jam_yontp` (20); `sippa.latihan.biaya_lokasi_tahun` (Rp52–95 juta, asumsi-kebijakan);
  `sippa.bbm.cadangan_kali` (1,25).
- **Objek:** Gambar 10.1 alur operasi (G21 diagram berikon, `teknik/alur.mjs`); Tabel 10.1 pemicu pra-posisi dan
  ambangnya (B5.7); Tabel 10.2 matriks respons FRP × luas × zona (B5.7, `csv: data/sippa/respons.csv`); Tabel 10.3
  ringkasan SOP dan titik berhenti (B5.7); Tabel 10.4 kurikulum (B5.7, `total: ya`); `::: catatan` FRP bukan
  kedalaman bara; foto F4 (regu pemadam di lahan gambut).
- **Rekomendasi asal:** SR-09 (SOP disahkan Satgas, pelatihan operator inti), SR-14 (latihan tahunan G6).
- **Bukti:** `bukti/bab-10.md`.
- **Tambahan GD terintegrasi (keputusan 55):** 10.7 menambah bahwa jadwal YonTP memuat nyala uji bulanan dan servis
  ringan (Bab 15.6) dan bahwa stok bailey DSP di gudang yang sama ikut inventaris tahunan (rehab R-RR-06, SR-26).

### BAB 11 PEMAKAIAN GANDA: BANJIR DAN IRIGASI (9 hlm)

- **Subbab:** 11.1 Mengapa Pompa Api Tidak Dipakai untuk Genangan; 11.2 Modul Banjir dan Kapasitasnya; 11.3 Provinsi
  dan Musim Banjir Pasangan; 11.4 Operasi Banjir November–Desember 2026; 11.5 Irigasi dengan Air dari Sumber Lain;
  11.6 Manfaat dalam Hitungan Biaya-Manfaat.
- **Pertanyaan kunci:**
  1. Berapa kapasitas modul banjir dalam satuan genangan yang dipahami BPBD?
  2. Ke kabupaten mana kit dipindah pada musim hujan, dan apa buktinya pada 2026?
  3. Dengan syarat apa irigasi masuk tanpa mengeringkan gambut?
  4. Bagaimana manfaat banjir dan irigasi dihitung tanpa mencampur BCR inti?
- **Isi per subbab:**
  - 11.1 1 ha × 0,5 m = 5.000 m³; pada 30 L/s sekitar 46 jam, pada 100 L/s sekitar 14 jam: pompa api head tinggi
    debit kecil tidak cocok; modul head rendah terpisah.
  - 11.2 BOM modul banjir ringkas (rujuk Bab 9.4); kapasitas m³ per jam dan ha genangan per hari.
  - 11.3 Kejadian banjir per provinsi (DIBI) dan bulan puncak; delapan provinsi gambut berpasangan banjir.
  - 11.4 Hasil operasi 2026 dari D1 `sippa_gerak` dan `sippa_log_gelar` (jam pompa, m³, lokasi, waktu pindah), pil
    "pilot, n kecil"; bila belum ada, tabel berisi "–" beralasan.
  - 11.5 Syarat keras PRD §5.7; pinjam ke kelompok tani di luar KHG Maret–April; BBM ditanggung peminjam; paket pilot
    irigasi; manfaat nol bila syarat gagal.
  - 11.6 Varian BCR inti, + banjir, + banjir + irigasi; rumus manfaat banjir (m³ terpompa × nilai per m³ atau biaya
    pompa sewa terhindar, label `asumsi-kebijakan`); rujuk Bab 18.5.
- **Angka wajib:** `sippa.banjir.genangan_1ha_05m_m3` (5.000); `sippa.banjir.jam_30ls` (sekitar 46);
  `sippa.banjir.jam_100ls` (sekitar 14) dari `hidraulika.py` (estimasi-model); `sippa.banjir.<prov>.kejadian_2015_2025`
  (resmi, DIBI); `sippa.banjir.2026.jam_pompa`, `.m3`, `.kabupaten_n`, `.waktu_pindah_jam` (terverifikasi, D1, slot
  `menunggu` sampai ditarik); `sippa.irigasi.paket_pilot_rp` (Rp140 juta, asumsi-kebijakan).
- **Objek:** Tabel 11.1 kapasitas modul banjir (B5.7); Gambar 11.1 kalender kit karhutla-banjir-irigasi per provinsi
  (G23, baris provinsi berpasangan, pita bulan; `teknik/siklus.mjs` mode provinsi); Tabel 11.2 provinsi dan musim
  banjir pasangan (B5.7, `csv:`); Tabel 11.3 operasi banjir 2026 (B5.7, pil pilot); Tabel 11.4 syarat keras irigasi
  dan cara periksa (B5.7); foto F6 (pompa banjir atau genangan).
- **Rekomendasi asal:** SR-03 (pemakaian banjir November–Desember 2026), SR-13 (uji irigasi satu kabupaten).
- **Bukti:** `bukti/bab-11.md`.

### BAB 12 AIR PASCABENCANA: PERPIPAAN DARI DARURAT KE PERMANEN (11 hlm, baru dari kajian `rehab`)

- **Subbab:** 12.1 Kerusakan Sistem Air Minum pada Kejadian Besar; 12.2 Tiga Lapis Waktu dan Titik Serah; 12.3 Lapis
  Darurat: Truk Tangki, Hidran Umum, IPA Bergerak, dan Kit SIPPA untuk Air Baku; 12.4 Lapis Sementara: Transmisi HDPE
  dan Sistem Gravitasi; 12.5 Lapis Permanen: Rehabilitasi SPAM; 12.6 Waktu Pulih dalam Jiwa Terlayani; 12.7 Biaya
  Satuan sebagai Pembanding; 12.8 Pengikat Hunian: Sumber Air sebelum Lokasi Huntap.
- **Pertanyaan kunci:**
  1. Berapa SPAM dan jiwa terdampak per kejadian, dan berapa lama layanan pulih?
  2. Kapan truk tangki diganti perpipaan sementara, siapa memutus, dan pada pemicu apa?
  3. Di lapis mana pompa dan selang SIPPA dipakai untuk air pascabencana, dan dengan syarat apa?
  4. Standar apa yang mengikat tiap lapis?
- **Isi per subbab:**
  - 12.1 Rehab 6.1 (Lombok 2018, Cianjur 2022, Sumatra 2025).
  - 12.2 Rehab 2.1 dan 10.3: lapis darurat (status tanggap darurat dan transisi), sementara (sampai R3P berjalan),
    permanen (masa R3P paling lama 3 tahun); titik serah dan pemutusnya.
  - 12.3 Rehab 6.2. Kotak "kit pipa bergerak SIPPA" di rehab (R1) diganti integrasi penuh: pompa kit relay dan
    modul banjir beserta layflat DN100 atau DN150 dapat mengalirkan **air baku** dari sumber ke IPA bergerak atau
    tandon, tidak pernah langsung sebagai air minum. Syarat: selang air bersih berkode tersendiri, tidak pernah dipakai
    untuk api atau surfaktan; uji mutu sebelum distribusi (Permenkes 2/2023); kit karhutla tidak ditarik dari
    kabupaten yang sedang PRA-POSISI atau GELAR. Status P7: Usulan baru, diuji pada operasi banjir 2026 bila ada;
    tidak ada klaim efikasi.
  - 12.4 Rehab 6.3; transmisi HDPE sementara adalah wewenang Kementerian PU dan PDAM; batas desain HDPE di Bab 7.6
    (bukan di perimeter api, umur 50 tahun hanya kondisi standar) tetap berlaku.
  - 12.5 Rehab 6.4: membangun kembali lebih baik dalam R3P; BNPB tidak membangun SPAM permanen sendiri.
  - 12.6 Rehab 6.5 dan prinsip lensa layanan (§2 butir 20).
  - 12.7 Rehab 6.6: biaya satuan berlabel dan bertahun harga, tanpa total program, NPV, atau BCR (rehab Q4, T-N).
  - 12.8 Rehab 10.8 dan 7.7: lokasi huntap disahkan hanya bila sumber air dan akses tersedia (rehab H1, Q3).
  - Dasar desain: pemicu tertulis peralihan truk ke pipa (rehab R-RR-08) dan ukuran jiwa terlayani (R-RR-09).
- **Angka wajib:** `perka_2008.air_bersih_3hari_liter` (7, resmi), `perka_2008.air_bersih_liter_hari` (15, resmi),
  `rehab.pipa.standar.sphere_orang_per_keran` (250, terverifikasi); `rehab.pipa.sumatra2025.spam_terdampak` (178),
  `.spam_berfungsi_feb2026` (143), `.persen_fungsi_mei2026` (95,5%), `.sarana_darurat_feb2026` (537),
  `.sumur_bor_feb2026` (128), `rehab.pipa.sumbar.target_permanen` (Agustus 2028), semua resmi;
  `rehab.pipa.lombok.spam_rusak` (37, resmi); `rehab.pipa.pulih.kobe_90` (38 hari), `.kobe_100` (81), `.tohoku_90`
  (36), terverifikasi; `rehab.pipa.biaya.per_lps_*` (estimasi-model); baru `sippa.air.kit_transmisi_ls` (10 L/s relay
  DN100 1 km, dari `hidraulika.py`, estimasi-model) dan `sippa.air.kit_batas_jiwa` (debit × 86.400 / 15 L, batas atas
  hidraulik, bukan kapasitas layanan; kapasitas IPA yang membatasi; estimasi-model).
- **Objek:** Tabel 12.1 kerusakan sistem air per kejadian besar (rehab Tabel 6.1, L55); Gambar 12.1 tiga lapis dan
  titik serah (`bab06-rantai-lapis-air`, diagram); Gambar 12.2 persen layanan pulih lawan hari: Kobe, Tohoku, Sumatra
  2025 (G24; `bab06-garis-pulih-air` sebagai `sippa-25`); Tabel 12.2 standar per lapis (B5.7); Tabel 12.3 peran
  komponen SIPPA di lapis darurat air: dipakai, tidak dipakai, syarat (B5.7, baru); Gambar 12.3 biaya per m³ truk
  lawan pipa (G14; `bab06-biaya-renk` dan `bab06-biaya-hsu` sebagai `sippa-26`, `sippa-27`); halaman studi kasus
  SCIRT Christchurch (B5.30, rehab).
- **Rekomendasi asal:** SR-28 (R-RR-08), SR-29 (R-RR-09), SR-32 (R-RR-12).
- **Sumber yang dipakai ulang:** `naskah/rehab/bab-06.md`, `bab-10.md` (10.3, 10.6, 10.8); `naskah/rehab/bukti/bab-06`,
  `bab-10`; `rehab/riset/D-sistem-pipa.md`; Lampiran G dan H rehab.
- **Bukti:** `bukti/bab-12.md` (rujukan baris ke bukti rehab + delta integrasi kit dari PRD §6.1, §6.3).

### BAB 13 AIR TANAH PASCABENCANA DALAM BATAS BADAN GEOLOGI (11 hlm, baru dari kajian `rehab`)

- **Subbab:** 13.1 Cekungan Air Tanah dan Zona Konservasi; 13.2 Sumur Bor Darurat dan Sumur Produksi menurut
  Pelaksana; 13.3 Mutu Air Tanah Pascabencana; 13.4 Intrusi Air Laut Pascatsunami dan Akuifer Terdampak Likuefaksi;
  13.5 Batas Pengambilan: Penurunan Muka Tanah dan Kubah Gambut; 13.6 Rantai Sumur Darurat: Lokasi, Uji Mutu, Serah
  Terima, Pengelola; 13.7 Protokol Sumur Bor RR bersama Badan Geologi.
- **Pertanyaan kunci:**
  1. Di CAT dan zona mana sumur bor RR aman dibangun?
  2. Berapa debit, kedalaman, jiwa terlayani, dan biaya satuan sumur bor?
  3. Bagaimana mutu air diuji, oleh siapa, dan kapan sumur dinyatakan tidak laik minum?
  4. Apa yang terjadi pada akuifer setelah tsunami dan likuefaksi?
  5. Bagaimana sumur darurat diserahkan dan dirawat sesudah status berakhir?
- **Isi per subbab:**
  - 13.1–13.4 Rehab 7.1–7.5.
  - 13.5 Rehab 7.6 ditambah kaitan SIPPA: sumur dalam 50–100 m bukan bawaan SIPPA (batas desain Bab 7.6); sumur
    dangkal pra-posisi di zona C (Bab 5.1) tunduk pada aturan yang sama; pengambilan air tanah tidak boleh menurunkan
    muka air gambut (§2 butir 12).
  - 13.6 Rehab 7.7–7.8 dan 9.5; rantai yang terputus di empat titik menjadi kartu inspeksi K7 (Bab 15) dan daftar
    bersama di `/pipa/air` (Bab 20, keputusan 56).
  - 13.7 Rehab 10.7 (program air tanah G1–G2, di buku ini berkode PG-1 dan PG-2): sumur bor RR hanya di luar zona
    rusak dan kritis, atau dengan rekomendasi teknis Badan Geologi (rehab Q10); di kawasan penurunan muka tanah pesisir
    utara Jawa diutamakan air permukaan dan perpipaan.
- **Angka wajib:** `rehab.akuifer.sumur_bg_kedalaman_tipikal` (125 m), `.sumur_bg_debit_min` dan `.sumur_bg_debit_maks`
  (1–2,4 L/detik), `.sumur_bg_jiwa_per_sumur` (2.000), `.sumur_bg_kumulatif_2005_2018` (2.290),
  `.sumur_bg_jiwa_kumulatif_2005_2018` (6,6 juta), resmi; `.biaya_sumur_dalam_per_unit_2020` (Rp572 juta),
  `.biaya_sumur_dangkal_darurat_per_unit` (Rp142 juta), estimasi-model; `.tniad_sumber_air_2026_08` (3.000, resmi);
  `.aceh_barat_waktu_pulih_salinitas` (2 tahun), `.aceh_barat_salinitas_awal` dan `_akhir` (10 dan 2 mS/cm),
  terverifikasi; `.permenkes_ecoli_maks` (0 CFU/100 ml), `.permenkes_arsen_maks` (0,01 mg/L), resmi;
  `.sphere_ecoli_tanpa_klorin_maks` (10, terverifikasi); jumlah CAT dari `cat.json` (kunci `sippa.cat.n`, resmi setelah
  lampiran Permen ESDM 2/2017 dicek ulang; draf rehab menulis 421).
- **Objek:** Gambar 13.1 status zona konservasi CAT per provinsi (G19 bila poligon Badan Geologi diterima, bila tidak
  tabel provinsi; spek `sippa-28` dari `cat.json`); Tabel 13.1 pelaksana sumur × jumlah × kedalaman × debit × biaya
  satuan × sumber (rehab Tabel 7.1); Tabel 13.2 standar mutu air per lapis (B5.7); Gambar 13.2 rantai sumur darurat
  (`bab07-g21-rantai-sumur-darurat`); Gambar 13.3 rumah tangga bergantung air tanah dan kebutuhan sumur
  (`bab07-g9-rumah-tangga-air-tanah`, `bab07-g9-kebutuhan-sumur-model-tercatat` sebagai `sippa-29`); Kotak 13.1 air
  tanah di kawasan penurunan muka tanah (argumen tandingan L63); halaman studi kasus pemulihan salinitas Aceh Barat.
- **Rekomendasi asal:** SR-30 (R-RR-10, protokol sumur bor RR bersama Badan Geologi), SR-31 (R-RR-11, satu daftar sumur
  darurat semua pelaksana; diwujudkan di `/pipa/air`).
- **Sumber yang dipakai ulang:** `naskah/rehab/bab-07.md`, `bab-09.md` (9.5), `bab-10.md` (10.7);
  `naskah/rehab/bukti/bab-07`; `rehab/riset/C-akuifer.md`; Lampiran G rehab.
- **Bukti:** `bukti/bab-13.md`.

### BAB 14 AKSES PASCABENCANA: JEMBATAN MENURUT PEMILIK PROGRAM (12 hlm, baru dari kajian `rehab`)

- **Subbab:** 14.1 Kerusakan Jembatan dan Desa Terputus; 14.2 Lapis Darurat: Bailey dan Rangka Baja DSP BNPB; 14.3
  Program Jembatan menurut Pemilik: Satgas Pembangunan Jembatan TNI AD (Jembatan Garuda), Jembatan Merah Putih Presisi
  Polri, dan Jembatan Gantung Kementerian PU; 14.4 Status Nama "Jembatan Merah Putih"; 14.5 Lapis Permanen dan
  Pengganti Jembatan Darurat; 14.6 Celah Dana Aset Desa; 14.7 Bukti Dampak Jembatan Pedesaan; 14.8 Pengikatan ke R3P,
  DIBI, dan Data Aset.
- **Pertanyaan kunci:**
  1. Berapa jembatan rusak dan desa terputus per kejadian, dan berapa hari sampai akses darurat terbuka?
  2. Program jembatan mana yang ada, milik siapa, jenis apa, berapa unit, dan berapa yang di daerah bencana?
  3. Bagaimana jembatan darurat diganti permanen tanpa menjadi aset tanpa pemilik?
  4. Mengapa jembatan desa pascabencana tidak terdanai, dan jalur apa yang membukanya?
- **Isi per subbab:**
  - 14.1–14.5 Rehab 5.1–5.5; program ditulis menurut pemiliknya (rehab R2); dasar hukum Satgas TNI AD tidak diuraikan
    (keputusan 22) dan angka program hanya dari rilis resmi.
  - 14.2 tambahan SIPPA: stok bailey DSP dicatat di gudang yang sama dengan kit (YonTP, Bab 10.7) dan di `/pipa` sebagai
    aset kelas K9 (Bab 15, Bab 20); transport kit ke kabupaten banjir bergantung pada akses darurat yang sama.
  - 14.6 Rehab 9.1 dan Tabel celah dana: hibah RR tidak dapat membiayai aset rusak milik pemerintah desa (Perban BNPB
    4/2024 Pasal 5 huruf e), pembelian lahan (huruf d), serta biaya operasional dan pemeliharaan (huruf b); jalur Dana
    Bersama lewat R3P dan jalur perubahan Pasal 5 huruf e (KD-9).
  - 14.7 Rehab 5.6 (RCT Rwanda dan Nicaragua, padanan di Indonesia; posisi program Indonesia: berjalan, wajib evaluasi
    dampak).
  - 14.8 Rehab 5.7, 9.2, 10.5 (program akses A1–A4, di buku ini berkode PA-1 sampai PA-4).
- **Angka wajib:** `rehab.jembatan.garuda.titik_2026_08` (3.008), `.selesai_2026_08` (2.500),
  `.titik_wilayah_bencana_2026_08` (798); `rehab.jembatan.polri_mpp.jumlah_total_2026_08` (895), `.selesai_2026_08`
  (874), `.polda_2026_08` (30); `rehab.jembatan.pu.gantung_2025_anggaran` (Rp246,36 miliar), `.gantung_2025_unit` (43),
  `.gantung_2026_anggaran` (Rp920 miliar), `.gantung_2026_unit_rencana` (122), `.gantung_bentang_maks_m` (120), semua
  resmi; `.gantung_biaya_rata2_2025` (Rp5,73 miliar per unit, asumsi-kebijakan); `rehab.jembatan.bnpb.bailey_penggantian_2024`
  dan `_2025`; `rehab.akses.aceh.jembatan_putus_des2025` (14, resmi); `rehab.hukum.hibah_rr_larangan_pembiayaan_huruf`
  (7, resmi); `rehab.pembanding.rwanda_jembatan_rct` (terverifikasi); `rehab.dibi.jembatan_rusak.2025` (1.088).
- **Objek:** Tabel 14.1 program jembatan × pemilik × jenis × jumlah × wilayah bencana × biaya satuan × sumber (rehab
  Tabel 5.1); Gambar 14.1 jembatan program lawan jembatan rusak DIBI 2025 (G9; `bab05-program-lawan-rusak` sebagai
  `sippa-30`); Kotak 14.1 status nama "Jembatan Merah Putih"; Gambar 14.2 rantai darurat ke permanen untuk jembatan
  (`bab05-rantai-jembatan`, diagram); Tabel 14.2 celah dana per instrumen × jenis aset (rehab Tabel celah-dana Bab 9);
  halaman studi kasus RCT Rwanda (terverifikasi).
- **Rekomendasi asal:** SR-24 (R-RR-04), SR-25 (R-RR-05), SR-26 (R-RR-06), SR-27 (R-RR-07), SR-33 (R-RR-13).
- **Sumber yang dipakai ulang:** `naskah/rehab/bab-05.md`, `bab-09.md` (9.1, 9.2), `bab-10.md` (10.5);
  `naskah/rehab/bukti/bab-05`, `bab-09`; `rehab/riset/B-jembatan.md`, `A-hukum-kelembagaan.md`; Lampiran F rehab.
- **Bukti:** `bukti/bab-14.md`.

### BAB 15 MODEL PEMELIHARAAN ASET TERPADU (10 hlm, baru)

- **Subbab:** 15.1 Mengapa Pemeliharaan Menjadi Bagian Grand Design; 15.2 Sepuluh Kelas Aset dan Pemiliknya; 15.3
  Siklus Inspeksi per Kelas; 15.4 Skor Kondisi dan Ambang Tindakan; 15.5 Suku Cadang dan Stok Minimum; 15.6 Siapa
  Memelihara: BNPB, YonTP, BPBD, Kementerian PU, Pemda, dan Desa; 15.7 Biaya Pemeliharaan per Tahun dan Baris
  Anggarannya; 15.8 Data Kondisi di `/pipa`.
- **Pertanyaan kunci:**
  1. Aset apa yang dipelihara, oleh siapa, dan kapan?
  2. Kapan aset dinyatakan tidak laik, dan apa tindakannya?
  3. Berapa biaya pemeliharaan per tahun per kelas, dan dari baris anggaran mana?
  4. Bagaimana kondisi dicatat dan dipakai memutus pra-posisi, servis, dan pengadaan pengganti?
- **Isi per subbab:** satu sumber, PRD §6.10 (model lengkap); bab ini menulis isinya dengan angka bertoken.
  - 15.1 Kit hanya bernilai bila siap pada hari pemicu (U12); rehab menemukan pemeliharaan sesudah RR tidak berdana
    (Perban BNPB 4/2024 Pasal 5 huruf b; rehab 9.4 dan 11.5).
  - 15.2 PRD §6.10.1 (K1–K10). Kelas K10 jembatan permanen dicatat, tidak dipelihara BNPB.
  - 15.3 PRD §6.10.2; menggantikan interval Bab 9.6 lama; jadwal dihitung dari inspeksi terakhir dan jam operasi.
  - 15.4 PRD §6.10.3–§6.10.4: skala 0–3 sama dengan `sippa_komponen.kondisi`; "tidak laik gelar", "tidak laik
    minum", "tanpa jadwal ganti".
  - 15.5 PRD §6.10.5: rumus stok minimum dan laju pakai bawaan; kalibrasi dari musim 2027.
  - 15.6 PRD §6.10.6, ditambah tabel pembiayaan sesudah RR per jenis aset dari rehab 11.5 (APBN K/L; APBD dan tarif
    PDAM; APBDes dan Padat Karya Tunai Desa).
  - 15.7 PRD §6.10.7; rata-rata tertimbang kit sekitar 7% CAPEX berada di rentang servis 5–8% (Bab 18.3).
  - 15.8 PRD §6.10.8 dan layar `/pipa/pelihara` (Bab 20.7).
- **Angka wajib:** `sippa.pelihara.kelas_n` (10); `sippa.pelihara.interval.<kelas>.<jenis>_hari` dan `.jam` dari
  `data/sippa/pelihara.csv` (dibangkitkan dari `public/pipa/pelihara.js`, asumsi-kebijakan); `sippa.pelihara.laju.<kelas>`
  (K1 8%, K2 6%, K3 5%, K4 8%, K5 10%, K7 3%, K9 2%; asumsi-kebijakan); `sippa.pelihara.kit_gambut.laju_tertimbang`
  (sekitar 7%, estimasi-model dari BOM); `sippa.pelihara.biaya_tahun.<kelas>` dan `.total_t2` (estimasi-model,
  `bangun/sippa_keuangan.py`); `sippa.pelihara.stok_min.<kode>` (asumsi-kebijakan); `sippa.opex.servis_persen_capex`
  (5–8%); `sippa.target.kehilangan_komponen_persen` (< 5%); `rehab.hukum.hibah_rr_larangan_pembiayaan_huruf` (7).
- **Objek:** Tabel 15.1 kelas aset, pemilik, pemelihara tingkat 1 dan 2, sumber data (B5.7); Tabel 15.2 matriks kelas ×
  interval (B5.7, menggantikan Tabel 9.5 lama); Gambar 15.1 kalender pemeliharaan 12 bulan terhadap musim karhutla dan
  banjir (G23; `teknik/siklus.mjs` mode aset); Tabel 15.3 skor kondisi dan ambang tindakan (B5.7); Tabel 15.4 aturan
  stok minimum (B5.7); Tabel 15.5 biaya pemeliharaan per tahun per kelas dan baris anggaran (B5.7,
  `csv: data/sippa/pelihara_biaya.csv`, `keyakinan: campuran`); Gambar 15.2 alur data kondisi dari inspeksi ke keputusan
  (G21; `teknik/alur_data.mjs` mode pelihara); Gambar 15.3 tangkapan layar `/pipa/pelihara` (`jenis: diagram`, data
  nyata per batas data, tidak pernah dummy).
- **Rekomendasi asal:** SR-36 (tetapkan model pemeliharaan), SR-37 (catat kondisi di `/pipa`), SR-38 (baris anggaran
  pemeliharaan dan jalur dana operasi dan pemeliharaan aset desa).
- **Sumber yang dipakai ulang:** `naskah/rehab/bab-09.md` (9.4), `bab-11.md` (11.5); PRD §6.1, §6.5, §6.6, §6.9, §6.10.
  Sumber baru yang wajib dibuka sebelum `final`: interval servis lembar data kelas pompa dan layflat; pedoman pemeriksaan
  jembatan Bina Marga; pedoman operasi dan pemeliharaan SPAM Cipta Karya; Permenkes 2/2023.
- **Bukti:** `bukti/bab-15.md`.

### BAB 16 PILOT 2026 DAN PROGRAM UJI 2027–2028 (13 hlm)

- **Subbab:** 16.1 Dua Vonis: Dapat Dipakai dan Lebih Baik; 16.2 Pilot Oktober 2026; 16.3 Hasil Pilot Oktober 2026;
  16.4 Gerbang G0–G6; 16.5 Protokol A/B Empat Lengan; 16.6 Waktu Gelar per Kelas Medan; 16.7 Evaluasi Independen dan
  Aturan Berhenti.
- **Pertanyaan kunci:**
  1. Apa yang diputus pilot Oktober 2026, dan apa yang belum dapat diputus?
  2. Gerbang apa yang harus lulus sebelum tiap belanja, dengan ambang berangka apa?
  3. Bagaimana uji A/B dirancang supaya hasilnya tidak dapat diperdebatkan?
  4. Apa yang terjadi bila hasilnya nol?
- **Isi per subbab:**
  - 16.1 "Dapat dipakai" menurut tujuh butir keputusan 53 (air sampai ujung lance ≥ 2 sesi di ≥ 2 petak;
    tiba-sampai-air ≤ 4 jam pada sesi terbaik dengan lima waktu tercatat; tekanan ujung ≥ 2 bar ≥ 30 menit; tanpa
    gerbang keras kalkulator; data probe ≥ 90% lengkap pada tahap sebelum, sesudah, dan 24 jam; nol kecelakaan dan
    tanpa henti bocor > 30 menit; ≥ 95% komponen kembali berfungsi), dengan tiga vonis: dapat dipakai, dapat dipakai
    bersyarat (satu butir di luar 1 dan 6 gagal; perbaikan tertulis sebelum banjir), belum dapat dipakai (butir 1
    atau 6 gagal); lawan "lebih baik" (ha dingin terverifikasi per regu-hari dan nyala ulang 7 hari antara petak
    lance dan konvensional) yang tidak diputus dari pilot karena n < 8 per lengan.
  - 16.2 AOI, tanggal, alat pinjam, 2 lance sederhana, termometer tusuk 0,1/0,3/0,5/1,0 m, formulir G3-lite.
  - 16.3 Hasil dari ekspor D1 (`/api/sippa/log.csv` dan `/api/sippa/probe.csv`, lewat `bangun/sippa_pilot.py`) dengan
    vonis tujuh butir dari fungsi yang sama dengan web (`vonisPilot`), dengan tanggal tarik sendiri; setiap angka berpil "pilot, n
    kecil"; tidak ada kata "terbukti".
  - 16.4 Tabel gerbang PRD §4.4 dengan ambang, waktu, dan arti gagal; G3 per kelas medan (I p50 ≤ 4 jam, p90 ≤ 6 jam;
    II p50 ≤ 8, p90 ≤ 12; III p50 ≤ 24, p90 ≤ 36; semua asumsi-kebijakan); hipotesis atas mesin Studio pemilik dicatat
    sebagai batas yang harus dikalahkan.
  - 16.5 Empat lengan (konvensional; kit + lance; kit + surfaktan; sekat kanal dan pembasahan ulang); outcome primer
    ha dingin terverifikasi 30 hari per regu-hari dan nyala ulang 30 hari; titik cek 24 jam, 72 jam, 7, 30, 90 hari;
    n ≥ 8 petak per lengan; 95% CI; pra-registrasi sebelum musim; tidak menyalakan gambut.
  - 16.6 Time-motion ≥ 5 ulangan per kelas medan.
  - 16.7 Evaluator independen; bila G4 gagal: kit dilebur ke inventaris pompa biasa; bila musim basah: perpanjang
    satu musim, jangan beli.
- **Angka wajib:** `sippa.gerbang.g4.ambang_persen` (30%); `.n_min_lengan` (8); `.biaya_ha_rasio_maks` (1,2);
  `sippa.gerbang.g3.<kelas>.p50_jam`, `.p90_jam`; `sippa.gerbang.g1.rasio_debit` (1,5); `.piezometer_cm` (10);
  `sippa.gerbang.g2.headloss_toleransi_persen` (15); `sippa.gerbang.g5.hari_aktif_min` (30); `sippa.studio.g3.<kelas>`
  (22–27, 43–55, 74 jam; estimasi-model; belum diuji balik); `sippa.pilot.2026.<sesi_n, petak_n, waktu_gelar_jam,
  suhu_turun_c, nyala_ulang_n, vonis, butir_1..butir_7>` (terverifikasi, D1, `menunggu` sampai ditarik). Semua ambang dari
  `data/sippa/gerbang.csv` (asumsi-kebijakan).
- **Objek:** Gambar 16.1 garis waktu gerbang 2026–2029 (G23 kronologi, pita horizon; `teknik/gerbang.mjs`); Tabel 16.1
  gerbang G0–G6 (direktif `tabel`, kolom GERBANG, KAPAN, LULUS BILA, GAGAL BERARTI); Tabel 16.2 lengan A/B dan outcome
  (B5.7); Tabel 16.3 hasil pilot Oktober 2026 (B5.7, `csv: data/sippa/pilot_2026.csv`); Gambar 16.2 waktu gelar per
  kelas medan: ambang G3 lawan hipotesis Studio lawan hasil pilot (G12 rentang, spek `sippa-13`); Gambar 16.3 tata
  letak petak A/B dan grid probe (SIPPA-G-12 diperkecil).
- **Rekomendasi asal:** SR-02 (vonis pilot dan laporan), SR-10 (protokol A/B dan evaluator), SR-15 (evaluasi G4/G5).
- **Bukti:** `bukti/bab-16.md`; hasil pilot ditulis ulang setelah ekspor D1 (tugas B-10 PRD).
- **Tambahan GD terintegrasi (keputusan 55):** subbab baru 16.8 "Agenda Bukti Air dan Akses" dari rehab 10.10:
  evaluasi dampak program jembatan pedesaan (desa tersambung, waktu tempuh, akses sekolah dan pasar; rancangan mengikuti
  RCT Rwanda; SR-33), uji coba paket air dan akses di satu kabupaten Sumatra 2026–2027 dengan garis dasar dan pembanding
  (rehab Q20; SR-34), evaluasi fungsi sumur darurat 12 bulan sesudah serah terima (SR-30). Objek tambahan: Tabel 16.4
  agenda bukti (rehab Tabel 10.4). Sumber: `naskah/rehab/bab-10.md` (10.10), bukti `bab-10`.

### BAB 17 KELEMBAGAAN DAN TATA KELOLA ASET (11 hlm)

- **Subbab:** 17.1 Peran Lembaga; 17.2 Matriks RACI per Tahap; 17.3 Aset BMN BNPB dan Pinjam Pakai; 17.4 Komando,
  Operator, dan Tenaga Gelar; 17.5 Opsi Peran Pemegang Izin Konsesi.
- **Pertanyaan kunci:**
  1. Siapa memutus, mengerjakan, dikonsultasikan, dan diberi tahu pada tiap tahap?
  2. Bagaimana aset tetap milik BNPB tetapi disimpan, digelar, dan dipindah lembaga lain?
  3. Opsi apa yang tersedia bagi pemegang izin konsesi, dan apa syaratnya?
- **Isi per subbab:**
  - 17.1 BNPB pemilik program dan BMN; Satgas Karhutla provinsi komando; Manggala Agni operator inti bersertifikat
    (Permen LHK P.32/2016); BPBD regu, pompa, data kejadian; YonTP gudang, tenaga gelar, transport; BRGM atau walidata
    KHG yang berlaku untuk sekat kanal dan TMA; BWS untuk izin pengambilan air; BIG, BMKG untuk data; LKPP untuk
    e-katalog.
  - 17.2 RACI 14 tahap PRD §3.3, satu A per baris.
  - 17.3 BMN BNPB dengan pinjam pakai (MoU) ke penerima; pencatatan inventaris dan jejak di `/pipa/kit`.
  - 17.4 Komando di Satgas; operator inti bukan TNI untuk menahan dampak rotasi personel; YonTP tanpa uraian dasar
    hukum TNI (keputusan 22), cukup MoU pinjam pakai BMN dan permintaan tertulis.
  - 17.5 Tiga opsi kebijakan PRD §3.4 berikut syarat; tidak mengklaim kewajiban hukum baru; nama perusahaan tidak
    ditulis.
- **Angka wajib:** `sippa.raci.tahap.n` (14); tidak ada angka lain kecuali personel di Bab 1.
- **Objek:** Tabel 17.1 matriks RACI per tahap (direktif `matriks-lembaga` tidak cocok karena kolomnya fase; dipakai
  `::: tabel` B5.7 kolom TAHAP, BNPB, SATGAS PROV, MANGGALA AGNI, BPBD, YONTP, BRGM, KEMENHUT, PEMEGANG HAK, BWS/BIG/BMKG,
  sel kode R/A/C/I; `keyakinan: asumsi-kebijakan`); Tabel 17.2 aset, pemilik, penerima pinjam pakai, dokumen (B5.7);
  Tabel 17.3 opsi peran konsesi dan syarat (B5.7); Gambar 17.1 alur komando dan alur aset (G21 diagram berikon,
  chip lembaga tanpa logo; `teknik/lembaga.mjs`).
- **Rekomendasi asal:** SR-08 (MoU pinjam pakai BMN dengan TNI untuk YonTP), SR-18 (opsi konsesi).
- **Bukti:** `bukti/bab-17.md`; nama unit dicek ke `data/raw/hukum/teks/perban-nomor-6-tahun-2025.json` dan
  `perban-nomor-11-tahun-2025.json`; nomenklatur K/L dari `data/lembaga/lembaga.csv`.
- **Tambahan GD terintegrasi (keputusan 55):** subbab baru 17.6 Mandat Tertulis Lembaga × Lapis × Sektor untuk air dan
  akses (rehab 11.1, kode K/P/R/I, S22); 17.7 Unit BNPB untuk Air dan Akses: Deputi Bidang Rehabilitasi dan
  Rekonstruksi (Direktorat RR Infrastruktur) pemimpin, pendukung Deputi Bidang Penanganan Darurat, Deputi Bidang
  Logistik dan Peralatan, Pusdatinkom (rehab Q12, 11.2); 17.8 Forum Koordinasi dan Jalur Adopsi, termasuk rakor Kemenko
  PMK untuk program jembatan TNI AD dan Polri (rehab Q8, 11.3–11.4); 17.9 Instrumen Hukum dengan kolom Progsun (rehab
  11.6: perubahan Perban 4/2024, pembaruan Perka 12/2010, juklak protokol sumur bor, templat R3P); 17.10 Yang Sudah
  Berjalan dan Tidak Boleh Dikorbankan (rehab 9.7). RACI 14 tahap SIPPA tetap; matriks mandat air dan akses berdiri
  sendiri (Tabel 17.4). Tanpa uraian dasar hukum TNI (keputusan 22). Angka tambahan: `rehab.sasaran.*`,
  `rehab.renas.*` sesuai rehab 11.8. Sumber: `naskah/rehab/bab-11.md` (11.1–11.4, 11.6), `bab-09.md` (9.2, 9.7),
  `90-lampiran-e.md`, bukti `bab-11`.

### BAB 18 ANGGARAN, PEMBIAYAAN, NPV, BCR, DAN MONTE CARLO (16 hlm)

- **Subbab:** 18.1 Aturan Hitung; 18.2 Anggaran Bertingkat Gerbang T0–T4; 18.3 RAB Kit dan Modul Banjir; 18.4 OPEX
  Tahun Kering dan Tahun Basah; 18.5 TCO, NPV, dan BCR dalam Tiga Skenario Manfaat dan Tiga Varian Pemakaian; 18.6
  Pembanding Biaya Bersumber; 18.7 Monte Carlo dan Kepekaan; 18.8 Ambang Impas yang Harus Dicapai Pilot.
- **Pertanyaan kunci:**
  1. Berapa biaya tiap tingkat program, dan gerbang apa yang membukanya?
  2. Dengan manfaat apa SIPPA impas, dan seberapa jauh hasil itu bergantung pada pemakaian banjir dan irigasi?
  3. Seberapa lebar ketidakpastian biaya, dan asumsi mana yang paling menggeser hasil?
  4. Berapa biaya per ha dingin terverifikasi yang harus dicapai supaya kit layak diperluas?
- **Isi per subbab:**
  - 18.1 Delapan aturan PRD §11.1 (satu item satu satuan alokasi; harga bersumber apa adanya, sisanya ±30%;
    kontingensi 25% item asumsi dan 10% item bersumber, kontingensi seragam Studio 20% ditampilkan sebagai pembanding;
    PPN tidak ditambah untuk listing ber-PPN; OPEX tahun kering dan basah; TCO nominal dan terdiskonto 8%; kepekaan
    wajib; harga heli `menunggu`). Semua angka dari `bangun/sippa_keuangan.py` atas `data/sippa/harga.csv`.
  - 18.2 T0 pilot Oktober 2026 (realisasi kuitansi); T0B banjir 2026 (realisasi); T1 Fase 0 2027; T2 pilot 2027–2028;
    T3 skala Kalteng 2029 ke atas; T4 nasional 2030 ke atas, paling banyak 25 kit tambahan pada 2030. Tiap baris
    menyebut gerbang pembuka; T3 dan T4 berlabel "rencana bersyarat, bukan pengadaan".
  - 18.3 Ringkasan RAB per kit gambut, kit mineral, modul banjir; baris tambahan (kendaraan dan perahu pinjam lawan
    beli, keamanan, telemetri, logistik, latihan, servis 5–8% CAPEX, irigasi, platform web Rp0 di repo ini).
  - 18.4 Porsi tahun kering 40% (asumsi-kebijakan, kepekaan 20–60%); jam pompa dan hari regu tidak terjadi tiap tahun.
  - 18.5 Tiga skenario manfaat: (i) nol (bawaan, seperti Studio pemilik); (ii) biaya regu konvensional terhindar; (iii)
    biaya heli-hari terhindar (`menunggu` angka kontrak, tampil "–" sampai ada). Tiga varian pemakaian: inti; + banjir
    (keputusan 7); + banjir + irigasi (keputusan 8). Matriks 3 × 3 NPV dan BCR; sel heli "–" beralasan. Dua definisi
    biaya per ha berdampingan (OPEX saja ala Studio; dengan CAPEX teramortisasi ala KD), sesuai celah G09.
  - 18.6 Pembanding: water bombing > Rp200 juta per sorti satu jam (resmi, pernyataan); OMC Rp2,3–2,5 M per provinsi
    per 10–12 hari; sekat kanal Rp20,6 juta per unit; restorasi hidrologi; sumur dangkal Rp1,5–6 juta per titik; regu
    konvensional Rp2,25–3,75 juta per regu-hari. Cara baca: TCO 5 tahun skala Kalteng setara jumlah heli-hari tertentu
    (dihitung, bukan diketik), dan itu bukan bukti kit lebih murah per ha karena tugasnya berbeda (§2 butir 13).
  - 18.7 Monte Carlo 800 sampel berbenih, pengali seragam Studio (CAPEX 0,78–1,28; BBM 0,65–1,40; upah 0,70–1,45;
    operasi lain 0,75–1,35); P10, P50, P90; tornado kepekaan: ha per kit ±50%, harga layflat ±30%, jam pompa ±50%,
    porsi tahun kering 20–60%, kontingensi 20% lawan 25%.
  - 18.8 Biaya per ha dingin terverifikasi 30 hari = (CAPEX teramortisasi + OPEX + regu) / ha terverifikasi; regu
    konvensional Rp0,8–7,5 juta per ha tenaga; kit layak bila produktivitas naik ≥ 30% atau nyala ulang turun ≥ 30%
    (gerbang G4) dan biaya per ha ≤ 1,2 kali konvensional.
- **Angka wajib (semua dari `data/sippa/keuangan.json` keluaran `sippa_keuangan.py` kecuali disebut):**

| Kunci | Nilai acuan (titik awal KD dan PRD, diganti hasil skrip) | Keyakinan |
| --- | --- | --- |
| `sippa.rab.t0` | realisasi kuitansi pilot 2026 (`menunggu`) | terverifikasi setelah realisasi |
| `sippa.rab.t0b` | realisasi banjir 2026 (`menunggu`) | terverifikasi setelah realisasi |
| `sippa.rab.t1` | Rp1,1–2,1 M | asumsi-kebijakan |
| `sippa.rab.t2.kd` | Rp10,5–14,7 M | asumsi-kebijakan |
| `sippa.rab.t2.pinjam`, `sippa.rab.t2.beli` | Rp13,7–18,9 M; Rp16,2–21,4 M | asumsi-kebijakan |
| `sippa.rab.t3.capex`, `sippa.rab.t3.tco5` | Rp37,4–43,1 M; Rp64–90 M | asumsi-kebijakan |
| `sippa.rab.t4.capex` | dihitung dari per-kit T2 dan `kit_nasional.json` (tanpa angka dokumen awal) | asumsi-kebijakan |
| `sippa.rab.kit_gambut`, `.kit_mineral`, `.modul_banjir` | dari BOM | campuran |
| `sippa.opex.lokasi_tahun.tambahan` | Rp276–439 juta | asumsi-kebijakan |
| `sippa.npv.<manfaat>.<varian>`, `sippa.bcr.<manfaat>.<varian>` | 9 sel; sel heli `menunggu` | asumsi-kebijakan |
| `sippa.mc.t2.p10`, `.p50`, `.p90` | dihitung | estimasi-model |
| `sippa.heli.biaya_sorti_pernyataan` | > Rp200 juta | resmi (pernyataan) |
| `sippa.heli.biaya_jam`, `sippa.heli.biaya_sorti` | `menunggu` (KD-5) | menunggu |
| `sippa.omc.biaya_provinsi` | Rp2,3–2,5 M per 10–12 hari | resmi (dibuka ke dokumen sebelum `final`) |
| `sippa.sekat.biaya_unit` | Rp20,6 juta | resmi (dibuka ke dokumen sebelum `final`) |
| `sippa.regu.biaya_hari` | Rp2,25–3,75 juta | asumsi-kebijakan |
| `sippa.regu.biaya_ha` | Rp0,8–7,5 juta | estimasi-model |
| `sippa.diskonto_persen` | 8% | asumsi-kebijakan |
| `sippa.mc.n_sampel` | 800 | |

- **Objek:** Tabel 18.1 tingkat anggaran T0–T4 dan gerbang pembuka (B5.7); Gambar 18.1 CAPEX bertingkat T1–T4 (G9 batang
  bertumpuk per tingkat dengan komponen kit, modul banjir, aset pendukung, kontingensi; satu sumbu rupiah; total di
  atas; pil "rencana bersyarat" pada T3 dan T4; spek `sippa-14`); Tabel 18.2 RAB per kit dan modul (B5.7, `csv:`);
  Tabel 18.3 baris tambahan dan aturannya (B5.7); Tabel 18.4 OPEX tahun kering dan basah (B5.7); Tabel 18.5 matriks
  NPV dan BCR 3 × 3 (B5.7; sel tanpa angka "–" dengan alasan di `catatan:`); Gambar 18.2 kipas Monte Carlo biaya T2
  (G11 pita melebar P10–P90 per tahun, garis tengah navy, angka rentang tertulis; spek `sippa-15`); Gambar 18.3 tornado
  kepekaan (G4 batang horizontal terurut menurut lebar ayunan, satu sumbu; spek `sippa-16`); Tabel 18.6 pembanding
  biaya bersumber dengan satuan tugas (B5.7, kolom METODE, ANGKA, SATUAN TUGAS, SUMBER, KEYAKINAN).
- **Rekomendasi asal:** SR-19 (harga heli internal dan rekap water bombing 2019–2026).
- **Bukti:** `bukti/bab-18.md`; skrip keuangan wajib self-check yang menolak item ganda satuan dan kontingensi ganda.
- **Tambahan GD terintegrasi (keputusan 55):** subbab baru 18.9 Arsitektur Pembiayaan per Lapis dan Jenis Aset (rehab
  11.5: DSP, hibah RR dengan pengecualian Pasal 5, Dana Bersama pascabencana lewat R3P, APBN K/L, APBD dan BTT, dana
  desa; tanpa pagu); 18.10 Biaya Satuan Air, Air Tanah, dan Jembatan sebagai Pembanding (rehab 3.5, 6.6, 7.2, 5.3;
  tanpa total program, NPV, atau BCR, rehab Q4, T-N; rinci Lampiran O); 18.11 Biaya Pemeliharaan dalam TCO (Bab 15.7:
  OPEX tahun kering dan basah memuat `sippa.pelihara.biaya_tahun.*`, menggantikan baris "servis 5–8% CAPEX" yang kini
  menjadi pemeriksa rentang). Objek tambahan: Gambar 18.4 lapisan pembiayaan × jenis aset (`bab11-lapisan-pembiayaan`,
  diagram); Tabel 18.7 biaya satuan berlabel air dan akses (B5.7). Sumber: `naskah/rehab/bab-11.md` (11.5),
  `90-lampiran-h.md`, bukti `bab-11`.

### BAB 19 RISIKO DAN MITIGASI (6 hlm)

- **Subbab:** 19.1 Cara Menilai Risiko; 19.2 Register Risiko Program; 19.3 Risiko Teknis Peralatan; 19.4 Pemantauan
  dan Pemicu.
- **Pertanyaan kunci:**
  1. Apa yang paling mungkin menggagalkan program, dan siapa pemilik tiap risiko?
  2. Penangkal apa yang sudah dibangun ke desain dan gerbang?
  3. Tanda apa yang dipantau supaya risiko terlihat sebelum terjadi?
- **Isi per subbab:**
  - 19.1 Skala kemungkinan dan dampak 1–5; skor = K × D; matriks risiko B5.27.
  - 19.2 Risiko program R01–R13 PRD §11.2 (musim basah, pilot tanpa api, hasil nol, tekanan membeli besar, sumber air
    gagal, kecelakaan, pencurian, rotasi personel, izin lahan, surfaktan, angka pembanding dipersoalkan, `track` OSM
    tak bisa dilalui, pengeringan gambut oleh modul banjir atau irigasi).
  - 19.3 FMEA pemilik (A2) diringkas per komponen: pompa, selang, lance, filter, sensor; batas pemakaian alat
    keputusan (G22, G23).
  - 19.4 Pemicu pantau per risiko dengan sumber datanya (`iklim_outlook`, titik panas 24 jam AOI, U8 kehilangan
    komponen, neraca air).
- **Angka wajib:** `sippa.risiko.<kode>.k`, `.d`, `.skor` (asumsi-kebijakan, `data/sippa/risiko.csv`);
  `sippa.target.kehilangan_komponen_persen` (< 5%).
- **Objek:** Gambar 19.1 matriks kemungkinan × dampak (G17, bulatan navy bernomor kode risiko; `grafik.mjs matriks`;
  spek `sippa-17`); Tabel 19.1 register risiko (B5.7, kolom KODE, RISIKO, K, D, SKOR, PEMILIK, PENANGKAL, PEMICU PANTAU;
  `urut: -skor`); Tabel 19.2 FMEA ringkas peralatan (B5.7).
- **Rekomendasi asal:** tidak ada baru; penangkal merujuk SR yang sudah ada.
- **Bukti:** `bukti/bab-19.md`. Risiko web (R14–R20 PRD) tidak masuk buku kecuali R14 (kebocoran data staf), R15
  (kiriman luring), R19 (simulator dipakai menyimpulkan kelayakan jaringan).
- **Tambahan GD terintegrasi (keputusan 55):** register risiko memuat R21–R26 PRD §11.2 (aset jembatan tanpa pemilik,
  sumur tanpa uji mutu, air tanah di zona kritis, angka program hanya di media, pemeliharaan tak berdana, data kondisi
  tidak diisi); kesenjangan rehab Bab 9 yang berupa risiko ditulis sebagai baris register, bukan bab tersendiri.

### BAB 20 SISTEM DATA DAN PEMANTAUAN (7 hlm)

- **Subbab:** 20.1 Alat Kerja Staf BNPB di `/pipa`; 20.2 Inventaris dan Lacak Kit Antar-daerah; 20.3 Log Gelar,
  Probe, dan Dasbor A/B; 20.4 Simulator Keputusan dan Simulasi Tiga Dimensi; 20.5 Telemetri; 20.6 Batas Pemakaian Alat.
- **Pertanyaan kunci:**
  1. Data apa yang dicatat sejak pilot, oleh siapa, dan bagaimana dipakai memutus gerbang?
  2. Bagaimana kit dilacak dari gudang ke depot, ke gelar, ke banjir, dan kembali?
  3. Apa yang tidak boleh disimpulkan dari simulator dan peta kelayakan?
- **Isi per subbab:**
  - 20.1 Layar `/pipa` (ringkas, peta kelayakan dan saran sarana, kalkulator, pemicu, kit, log, A/B, data dan metode,
    studio, 3D, lapangan, laporan PDF) hanya untuk staf BNPB di balik login (keputusan 32); bahasa Indonesia; ponsel
    untuk lapangan.
  - 20.2 Status kit, jejak gerak, kehilangan komponen per musim (U8).
  - 20.3 Formulir lapangan luring yang terkirim saat ada sinyal; ekspor CSV untuk evaluator independen.
  - 20.4 Simulator membandingkan semua skenario dengan gerbang keras (menolak semi-permanen dan backbone, kedalaman > 5 m,
    debit tak terserap); simulasi Three.js pola `public/sim_*` untuk pemahaman ruang, bukan bukti.
  - 20.5 Format pesan dan laju sampel; kerangka siap terima data sejak 2026, sensor mulai 2027.
  - 20.6 Batas alat (G22, G23); manfaat bawaan nol; keluaran alat bukan Data Bencana (Perban BNPB 1/2023).
- **Angka wajib:** `sippa.web.layar_n` (dihitung dari PRD §9.1.1); `sippa.telemetri.laju_<sensor>`; tidak ada angka
  efikasi.
- **Objek:** Gambar 20.1 peta layar dan alur data (G21 diagram berikon; `teknik/alur_data.mjs`); Tabel 20.1 layar,
  pengguna, data yang dicatat, gerbang yang dilayani (B5.7); Gambar 20.2 tangkapan layar peta kelayakan `/pipa/peta`
  mode terang (`jenis: diagram`, bukan `foto`, karena bukan foto Commons; sumber "Pantau Bencana, layar staf"; tangkapan
  memakai data nyata per batas data, tidak pernah data dummy).
- **Rekomendasi asal:** SR-12 (pemicu harian), SR-20 (telemetri dan verifikasi `track`).
- **Bukti:** `bukti/bab-20.md`; rujuk PRD §9 dan uji `tests/warga/sippa*.test.mjs` (hijau sebagai bukti, bukan klaim).
- **Tambahan GD terintegrasi (keputusan 55, 56):** subbab baru 20.7 Layar Air Tanah, Akses, dan Pemeliharaan
  (`/pipa/air`, `/pipa/akses`, `/pipa/pelihara`, `/pipa/aset/:id`; PRD §9.4.9–§9.4.12); 20.8 Data Pemulihan yang Belum
  Ada: kolom DIBI untuk SPAM terdampak, jiwa tanpa air perpipaan, jembatan per status jalan, dan hari pulih (rehab 9.3,
  program D1 berkode PD-1, SR-21), dan daftar sumur bersama (SR-31) yang kini berjalan di `/pipa/air`. Tabel 20.1
  menambah tiga layar. Sumber: `naskah/rehab/bab-09.md` (9.3), `bab-11.md` (11.9).

### BAB 21 PETA JALAN 2026–2030 (8 hlm)

- **Subbab:** 21.1 Hari ke-0 dan Keputusan 14 Hari Pertama; 21.2 Rencana 100 Hari; 21.3 Rencana 2026–2027; 21.4
  Rencana 2028–2030; 21.5 Indikator Kinerja Program; 21.6 Pelaporan.
- **Pertanyaan kunci:**
  1. Apa yang dikerjakan minggu demi minggu sampai akhir 2026, bulan demi bulan pada 2027, dan tahun demi tahun
     2028–2030?
  2. Indikator apa yang dipakai Kepala BNPB untuk menilai program tanpa membaca seluruh buku?
  3. Kapan dan dalam bentuk apa program dilaporkan?
- **Isi per subbab:**
  - 21.1 Hari ke-0 = tanggal penetapan nota putusan (KD-1); keputusan 14 hari pertama (§3.5).
  - 21.2 Minggu 44–53 PRD §4.1 yang jatuh di 100 hari.
  - 21.3 Bulan demi bulan 2027 PRD §4.2.
  - 21.4 Tahun demi tahun 2028–2030 PRD §4.3; skala Kalteng 20 kit dan 7 depot hanya bila G5; nasional bertahap mulai
    provinsi gambut terbesar; paling banyak 25 kit tambahan pada 2030.
  - 21.5 Indikator U3–U9 PRD §1.3 (vonis pilot, A/B, waktu gelar, efikasi, keutuhan aset, pemakaian ganda).
  - 21.6 Laporan pilot (minggu 46), laporan mingguan operasi banjir, laporan antara Desember 2027, evaluasi G4/G5,
    evaluasi akhir horizon 2030; semua dari laporan PDF otomatis `/pipa/laporan`.
- **Angka wajib:** `sippa.jalan.kit_kalteng_skala` (14); `sippa.jalan.depot_kalteng` (7); `sippa.jalan.kit_2030_maks`
  (25); `sippa.indikator.<U3..U9>.target` (dari `data/sippa/indikator.csv`, asumsi-kebijakan).
- **Objek:** direktif `garis-waktu` per horizon tidak dipakai karena kolom FASE wajib prabencana, tanggap darurat,
  pascabencana; diganti Tabel 21.1 garis waktu program (B5.7, kolom WAKTU, TONGGAK, GERBANG, UNIT, REK, pil horizon;
  G23); Tabel 21.2 indikator kinerja program (G22 tabel indikator B5.19, kolom INDIKATOR, BASELINE, TARGET, CARA UKUR,
  KAPAN); direktif `matriks-rekomendasi` dua blok (`kelompok: internal` dan `kelompok: lintas`) dengan anak `rek`
  dari register §6.
- **Rekomendasi asal:** SR-16, SR-17 (rencana skala bersyarat); tampil penuh semua SR.
- **Bukti:** `bukti/bab-21.md`.
- **Tambahan GD terintegrasi (keputusan 55):** 21.1 menambah keputusan 14 hari rehab (penugasan Deputi Bidang RR,
  inventaris bailey, kit, IPA bergerak, dan truk per Direktorat Penanganan Darurat Wilayah, permintaan data Kementerian
  PU, Badan Geologi, TNI AD, Polri; rehab §6); 21.2–21.4 menambah langkah peta jalan rehab 11.7 dan kesiapan musim hujan
  2026/2027 dan pemutakhiran R3P Sumatra (rehab 10.9); 21.5 menambah indikator rehab 11.8 (sasaran Renstra dan Renas,
  garis dasar waktu pulih 2027) dan U11–U12 PRD §1.3; 21.6 menambah pelaporan rehab 11.9. Sumber: `naskah/rehab/bab-10.md`
  (10.2, 10.9), `bab-11.md` (11.7–11.9), bukti `bab-10`, `bab-11`.

### BAB 22 KESIMPULAN DAN KEPUTUSAN YANG DIMINTA (5 hlm)

- **Subbab:** 22.1 Kesimpulan; 22.2 Keputusan yang Diminta dari Kepala BNPB; 22.3 Yang Sengaja Tidak Direkomendasikan;
  22.4 Yang Belum Diketahui.
- **Pertanyaan kunci:**
  1. Delapan kesimpulan berangka apa yang menopang tesis?
  2. Keputusan apa yang hanya dapat diambil Kepala BNPB, dan apa akibat tiap pilihan?
  3. Apa yang sengaja tidak diusulkan, dan apa yang belum diketahui?
- **Isi per subbab:**
  - 22.1 Delapan kesimpulan (satu per bagian A–E plus tiga dari Bab 10, 17, 18), angka identik dengan Pesan Kunci dan
    deck; tanpa mengulang paragraf bab (L64).
  - 22.2 Direktif `keputusan` KD-1 sampai KD-12, identik dengan §3.5.
  - 22.3 Tidak direkomendasikan: jaringan pipa permanen nasional; pembelian massal sebelum G5; pipa HDPE pasang-bongkar
    tiap musim; injeksi lebih dari 5 m; sumur dalam sebagai bawaan; menyalakan gambut untuk latihan; memindahkan
    anggaran heli sebelum G5; menyatakan padam dari drone termal saja; memakai pompa api untuk genangan; irigasi dari
    kanal gambut.
  - 22.4 Belum diketahui: efikasi injeksi lance di lapangan; debit kemarau di intake; volume bara per ha; waktu gelar
    nyata per kelas medan; garis dasar operasi konvensional; harga riil; dampak pengambilan air kanal terhadap muka air
    gambut; harga heli kontrak.
- **Angka wajib:** tidak ada kunci baru; semua angka kesimpulan memakai kunci bab asal; tesis `sippa.tesis|teks`.
- **Objek:** kisi kesimpulan 4 × 2 dan pita keputusan (B5.25); direktif `keputusan`.
- **Rekomendasi asal:** tidak ada baru.
- **Bukti:** `bukti/bab-22.md` (hanya peta silang kesimpulan ke bab asal).
- **Tambahan GD terintegrasi (keputusan 55):** 22.1 menjadi sepuluh kesimpulan (delapan semula ditambah satu air dan satu
  akses dari rehab 12.1); 22.2 memuat KD-1 sampai KD-12 (§3.5); 22.3 menambah lima butir rehab yang sengaja tidak
  direkomendasikan (BNPB membangun jembatan atau SPAM permanen sendiri di luar pemilik aset; sumur bor di zona rusak tanpa
  rekomendasi Badan Geologi; angka total kebutuhan RR nasional sebagai satu angka; menyebut "Jembatan Merah Putih"
  sebagai program tunggal; memakai unit SPAM berfungsi sebagai ukuran tunggal pemulihan); 22.4 menambah butir yang belum
  diketahui rehab 12.6. Kisi kesimpulan menjadi 5 × 2. Sumber: `naskah/rehab/bab-12.md`, bukti `bab-12`.

**Jumlah perkiraan:** 7 + 8 + 10 + 10 + 12 + 16 + 11 + 10 + 12 + 14 + 9 + 11 + 11 + 12 + 10 + 13 + 11 + 16 + 6 + 7 + 8
+ 5 = 229 hlm isi utama (versi 1: 164), ditambah bagian depan sekitar 18 hlm dan lampiran (Lampiran B, F, dan M
terbesar). Tidak ada batas (keputusan 11).

---

## 5. Lampiran

| Huruf | Judul | Isi | Sumber dan bentuk | Berkas naskah |
| --- | --- | --- | --- | --- |
| A | Metode, Data, dan Rekonsiliasi | metode beban pascabencana, rekap DIBI, dan rekonsiliasi rehab (naskah rehab Bab 3 dan Lampiran D; satu-satunya tempat kunci `rehab.sekunder.*` dan `rehab.rekon.*`, berpenanda sekunder); inventaris dataset PRD §7.1 dengan status, garis keturunan PRD §7.2, tanggal tarik per paket, batas data 23 Okt 2026 23.59 WIB, label keyakinan dan status `menunggu`, keterbatasan per dataset (`pipa/data/README.md`), rekonsiliasi angka: zona lama A188/B418/C89/D170 direproduksi persis dari `kendala.json` (cocok, `matriks_jarak.md`), ambang lama 2/3 km lawan ambang baru 2,5/5 km, median air 1,28 km lama lawan 1,02 km baru, dua set CAPEX pemilik (Excel lawan Studio) lawan RAB kajian (G02), harga heli Studio tidak dipakai (G13); GloFAS tidak ditarik dan alasannya; pernyataan produsen | tabel `csv:` dari `data/sippa/inventaris.csv`, `rekonsiliasi.csv` | `90-lampiran-a.md` |
| B | Kelayakan per Kompleks Kalimantan Tengah | 865 baris: ID, kabupaten, kecamatan, lat, lon (3 desimal), gambut, jarak air dan jalan (`kendala.json`, jalan utama OSM, semua jalan OSM), zona tiga versi, beda elevasi, status GSW, tahun terbakar MCD64A1, kekerapan sel, status lahan (berizin/lain/konservasi, tanpa nama perusahaan), `jalan_terverifikasi` | `csv: data/sippa/kelayakan_kompleks.csv`, `grup: KABUPATEN`, `orientasi: lanskap`; juga `.xlsx` serah | `90-lampiran-b.md` |
| C | Dasbor 18 Provinsi | satu halaman per provinsi bertemplat identik (L20): kartu angka, peta, luas per tahun 2015–2025, zona bila ada, kit dan depot, musim banjir pasangan, data yang belum ada | `csv: data/sippa/profil_provinsi.csv`; peta `sippa-p-<kode>` | `90-lampiran-c.md` |
| D | Daftar Bahan sampai Baut dan Kriteria Terima | BOM kit gambut, kit mineral, modul banjir, depot, gudang: kode, uraian kelas kinerja, jumlah, satuan, titik kerja, material, kriteria terima, uji (FAT, tekanan 1,5 kali, kebocoran), interval pemeliharaan, suku cadang per musim, rujukan datasheet (satu-satunya kolom yang boleh memuat merek). Baut, mur, ring, gasket dihitung **dari gambar** SIPPA-G-04, G-05, G-06, G-09 (jumlah per sambungan flensa menurut kelas PN di gambar), bukan diperkirakan; sambungan Storz tanpa baut ditulis "0, sambungan tanpa baut". Baris tanpa gambar bertanda "menunggu gambar" | `csv: data/sippa/bom_rinci.csv` | `90-lampiran-d.md` |
| E | Rencana Anggaran Biaya Rinci | `harga.csv` lengkap (kode, uraian, satuan, harga, sumber, tanggal, keyakinan, rentang, per), RAB T0–T4, OPEX per tahun 2026–2030 tahun kering dan basah, arus kas dan diskonto 8%, NPV dan BCR 3 × 3, sebaran Monte Carlo, tabel kepekaan | `csv:` dari `data/sippa/keuangan_*.csv` | `90-lampiran-e.md` |
| F | Gambar Teknik SIPPA-G-01 sampai SIPPA-G-12 | daftar gambar, kriteria terima, lalu 12 lembar A3 lipat: G-01 susunan kit relay; G-02 P&ID kit relay; G-03 detail lance 1,5 m dan teleskopik 3–5 m; G-04 manifold DN100 ke 4 × DN65; G-05 depot depan kontainer 20 kaki; G-06 gudang induk YonTP; G-07 dicabut (keputusan 60); G-08 profil trase contoh dari DEMNAS; G-09 modul banjir GA dan P&ID; G-10 telemetri dan daya; G-11 diagram zona A–D dan alur keputusan sarana; G-12 tata letak petak A/B dan grid probe. Blok judul: nomor, revisi, skala, satuan, tanggal, digambar, diperiksa, blok pengesahan insinyur berlisensi kosong, catatan wajib pengesahan | PDF A3 dari `bangun/visual/teknik/*.mjs`; halaman PDF disisipkan pembangun DOCX | `90-lampiran-f.md` (pengantar dan daftar; lembar disisipkan) |
| G | Prosedur Operasi Standar dan Formulir | SOP-01 sampai SOP-06 bernomor (tujuan, pelaku RACI, prasyarat, langkah bernomor, titik berhenti, formulir, rujukan); formulir G3-lite, probe empat kedalaman, BBM, gerak kit, survei trase, inspeksi pasca-musim | teks; formulir juga `pipa/formulir/*.pdf` | `90-lampiran-g.md` |
| H | Protokol Pilot dan Uji A/B | protokol pilot Oktober 2026 (lokasi, alat, urutan sesi, data yang dicatat, vonis); protokol A/B pra-registrasi empat lengan (hipotesis, outcome primer dan sekunder, ukuran petak, pengacakan petak, n, analisis, aturan berhenti, etika: tidak menyalakan gambut, persetujuan pemegang hak); formulir analisis | teks + tabel; salinan `pipa/protokol-ab.md` | `90-lampiran-h.md` |
| I | Draf Surat Permintaan Data | 13 surat berkop BNPB (keputusan 27 mencabut rehab Q15). Tiga baru dari bahan rehab: Kementerian PU (Bina Marga, Cipta Karya, SDA: jembatan, SPAM, waktu pulih per kab/kota), Mabes TNI AD (daftar jembatan dan sumur Satgas), Mabes Polri (daftar Jembatan Merah Putih Presisi dan sumur); surat Badan Geologi diperluas dengan CAT, zona konservasi, sumur 2019–2026, dan surat BNPB internal dengan kolom DIBI dan stok bailey DSP. Sepuluh semula: BIG; BWS Kalimantan II; walidata KHG atau badan restorasi gambut yang berlaku; BMKG; BPBD Kalteng dan kabupaten pilot; Manggala Agni; Badan Geologi; ATR/BPN dan pemda; LKPP dan penyedia; BNPB internal), ID data D01–D36 pemilik dipertahankan, format dan tenggat | teks; salinan `pipa/surat/*.md` | `90-lampiran-i.md` |
| J | Rumus dan Uji Invarian Hidraulika | rumus lengkap, satuan, nilai bawaan, rentang sah; nilai acuan dan hasil uji kembar JS-Python (relay DN100 1 km; OD160 NO-GO; OD200 lolos; volume isi; serapan lance) | tabel `csv: data/sippa/uji_hidraulika.csv` | `90-lampiran-j.md` |
| K | Rujukan Praktik dan Katalog Program menurut Posisi Bukti | katalog program rehab menurut rubrik `program-terbukti` (rehab Lampiran I: SCIRT Christchurch, hibah bertermin Nepal, ERRA, Kobe, Tohoku, Chile, Haiyan, Turki 2023, RCT Rwanda), ditambah relay layflat dan pemadaman gambut di negara lain, tiap baris berlabel "belum diverifikasi" sampai dikutip dari naskah aslinya (G18); kolom padanan di Indonesia | `::: program` dengan `jenis: uji-coba` | `90-lampiran-k.md` |
| L | Batas Pemakaian Alat Keputusan `/pipa` | yang dihitung dan tidak dihitung kalkulator dan simulator (G22, G23); gerbang keras; manfaat bawaan nol; peta kelayakan bukan izin | teks + tabel | `90-lampiran-l.md` |
| M | Beban Pascabencana per Provinsi dan Kab/Kota, Kartu Skenario, dan Daftar Perhatian | daftar perhatian RR per kab/kota dengan syarat (juga `.xlsx`), profil provinsi beban (rumah, jembatan, fasilitas umum) 2015–2025, kartu skenario tujuh jenis dan kepekaan, kartu agregat musim hujan | `naskah/rehab/90-lampiran-a.md`, `-b.md`, `-c.md` diadaptasi; `csv:` dari paket DIBI | `90-lampiran-m.md` |
| N | Program Jembatan per Pemilik dan Sumur Bor per Kejadian | program Satgas Pembangunan Jembatan TNI AD, Jembatan Merah Putih Presisi Polri, jembatan gantung Kementerian PU, bailey DSP BNPB; status nama; sumur dan sistem air per kejadian | `naskah/rehab/90-lampiran-f.md`, `-g.md` | `90-lampiran-n.md` |
| O | Biaya Satuan Berlabel Air, Air Tanah, dan Jembatan | biaya satuan bertahun harga, sumber, label; tanpa total (rehab Q4, T-N) | `naskah/rehab/90-lampiran-h.md` | `90-lampiran-o.md` |
| P | Kronologi Regulasi RR, Penyelarasan Dokumen BNPB, dan Irisan Register | kronologi dan matriks regulasi RR; penyelarasan Perban 6/2017, Perka 12/2010, katalog JDIH; irisan SR-21 sampai SR-35 dengan register GD Mitigasi (R-A04, R-M10, R-M17, R-M19, R-M23) | `naskah/rehab/90-lampiran-e.md`, `-k.md`, `-j.md` | `90-lampiran-p.md` |
| Q | Jadwal Pemeliharaan Rinci dan Kartu Inspeksi | per kode BOM dan kelas aset K1–K10: interval, jam, uji, kriteria afkir, stok minimum, pemelihara; kartu inspeksi kertas per kelas (medan sama dengan dialog inspeksi `/pipa/pelihara`) | `csv: data/sippa/pelihara.csv` dari `public/pipa/pelihara.js`; PRD §6.10 | `90-lampiran-q.md` |
| R | Glosarium | dibangkitkan dari `data/glosarium.json` (§3.6), menyerap glosarium rehab | pembangun | tidak ditulis |
| S | Atribusi Foto | dibangkitkan dari atribut foto (`pengarang`, `lisensi`, `url`) dan `pustaka.json`; lisensi CC BY, CC BY-SA, CC0, PD saja | pembangun | tidak ditulis |

Tiap lampiran data memuat pernyataan produsen (prinsip 16). Lampiran B, E, dan M juga diserahkan sebagai `.xlsx`.

---

## 6. Register rekomendasi SIPPA

Satu register, berkas `data/sippa/rekomendasi.csv` (kolom: id, langkah ≤ 8 kata, rincian, jenis, status P7, unit
pemimpin; unit pendukung, K/L pemimpin; pendukung, waktu, indikator selesai, dasar (bab dan regulasi), butuh,
membuka, kelompok internal/lintas). Di naskah menjadi `::: rek {#rek:<id>}` dengan atribut NASKAH-SPEK §11.1. Unit
BNPB dicocokkan ke OTK berlaku: Perban BNPB 6/2025 jo. 11/2025 (korpus `data/raw/hukum/teks`); nama di tabel ini sudah
ditemukan di kedua teks itu, pembagian Direktorat Penanganan Darurat Wilayah I–III untuk Kalteng dicek sebelum `final`.
Rekomendasi yang pemimpinnya bukan BNPB masuk `kelompok: lintas`.

| ID | Langkah | Jenis | Status | Unit BNPB pemimpin; pendukung | K/L pemimpin; pendukung | Waktu | Indikator selesai | Dasar |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SR-01 | Tetapkan nota putusan program uji bergerbang | regulasi | baru | Deputi Bidang Penanganan Darurat; Deputi Bidang Sistem dan Strategi, Biro Hukum, Organisasi, dan Kerja Sama | – | 100-hari | nota ditandatangani, gerbang G0–G6 tertulis | Bab 7, 16, 18; KD-1 |
| SR-02 | Tetapkan vonis pilot Oktober 2026 | data | baru | Direktorat Dukungan Sumber Daya Darurat; Pusat Data, Informasi, dan Komunikasi Kebencanaan | Kemenhut (Manggala Agni); BPBD Kalteng | 100-hari | laporan pilot PDF dengan dua vonis | Bab 16 |
| SR-03 | Pindahkan kit pinjam ke banjir 2026 | infrastruktur | baru | Direktorat Pengelolaan Logistik dan Peralatan; Direktorat Penanganan Darurat Wilayah (sesuai pembagian) | TNI AD (YonTP); BPBD penerima | 100-hari | log jam pompa dan m³ per kabupaten | Bab 11; KD-2 |
| SR-04 | Kirim sepuluh surat permintaan data | data | baru | Pusat Data, Informasi, dan Komunikasi Kebencanaan; Direktorat Mitigasi Bencana | BIG; Kementerian PU (BWS Kalimantan II); Kemenhut; BMKG; LKPP | 100-hari | 10 surat terkirim, tanda terima | Lampiran I; KD-5 |
| SR-05 | Pilih tiga AOI dan ajukan izin air | data | baru | Direktorat Mitigasi Bencana; Direktorat Dukungan Sumber Daya Darurat | Kementerian PU (BWS Kalimantan II); BPBD Kalteng | 2026-2027 | gerbang G0 lulus | Bab 5; PRD §4.4 |
| SR-06 | Jalankan survei tapak dan uji bangku | infrastruktur | baru | Direktorat Dukungan Sumber Daya Darurat; Direktorat Pengelolaan Logistik dan Peralatan | Kemenhut (Manggala Agni) | 2026-2027 | gerbang G1 dan G2 diputus | Bab 2, 8 |
| SR-07 | Adakan tiga kit dan tiga modul banjir | infrastruktur | baru | Direktorat Pengelolaan Logistik dan Peralatan; Biro Keuangan | LKPP | 2026-2027 | kontrak setelah G2, FAT lulus | Bab 9, 18; KD-3 |
| SR-08 | Tanda tangani pinjam pakai BMN YonTP | regulasi | baru | Deputi Bidang Logistik dan Peralatan; Biro Hukum, Organisasi, dan Kerja Sama | TNI AD; Kemhan | 2026-2027 | MoU ditandatangani | Bab 17; KD-4 |
| SR-09 | Sahkan SOP dan latih operator inti | kapasitas | baru | Direktorat Kesiapsiagaan; Pusat Pendidikan dan Pelatihan Penanggulangan Bencana | Kemenhut (Manggala Agni); BPBD | 2026-2027 | 6 SOP disahkan Satgas; operator bersertifikat | Bab 10 |
| SR-10 | Kunci protokol A/B dan evaluator | data | baru | Deputi Bidang Sistem dan Strategi; Direktorat Pemetaan dan Evaluasi Risiko Bencana | – | 2026-2027 | protokol pra-registrasi terkunci sebelum Juli 2027 | Bab 16; KD-6 |
| SR-11 | Pasang sekat kanal di sel inti | infrastruktur | sudah-ada | Direktorat Mitigasi Bencana (pendukung) | Kemenhut atau badan restorasi gambut yang berlaku; BPBD | 2026-2027 | sekat di 3 AOI sebagai lengan pembanding | Bab 7, 16 |
| SR-12 | Jalankan pemicu pra-posisi harian | data | baru | Direktorat Peringatan Dini; Pusat Data, Informasi, dan Komunikasi Kebencanaan | BMKG | 2026-2027 | `pemicu.json` harian; uji balik 2015/2019/2023 ditulis | Bab 3, 10 |
| SR-13 | Uji irigasi di satu kabupaten | infrastruktur | baru | Direktorat Pengelolaan Logistik dan Peralatan | Kementerian Pertanian; BPBD | 2026-2027 | catatan pinjam dan syarat keras terpenuhi | Bab 11; KD-7 |
| SR-14 | Gelar latihan basah tahunan | kapasitas | baru | Direktorat Kesiapsiagaan | BPBD; Kemenhut (Manggala Agni) | 2028-2030 | gerbang G6 tiap lokasi tiap tahun | Bab 10 |
| SR-15 | Putus gerbang efikasi dan skala | data | baru | Deputi Bidang Sistem dan Strategi; Deputi Bidang Penanganan Darurat | – | 2028-2030 | laporan evaluasi independen G4/G5 | Bab 16 |
| SR-16 | Siapkan skala Kalteng bila lulus | infrastruktur | baru | Deputi Bidang Logistik dan Peralatan | BPBD Kalteng; Kemenhut | 2028-2030 | rencana 20 kit dan 7 depot terhubung G5 | Bab 6, 18, 21 |
| SR-17 | Tahapkan rencana nasional bersyarat | pembiayaan | baru | Biro Perencanaan; Deputi Bidang Logistik dan Peralatan | Bappenas; Kemenkeu | 2028-2030 | paling banyak 25 kit pada 2030 setelah G5 | Bab 6, 18 |
| SR-18 | Rumuskan opsi peran konsesi | regulasi | baru | Deputi Bidang Pencegahan | Kemenhut; KLH | 2028-2030 | naskah opsi dengan syarat tertulis | Bab 17 |
| SR-19 | Serahkan harga kontrak heli | data | baru | Direktorat Dukungan Sumber Daya Darurat; Biro Keuangan | – | 100-hari | slot heli terisi di `angka.json` | Bab 18; KD-5 |
| SR-20 | Verifikasi jalan dan pasang telemetri | data | baru | Pusat Data, Informasi, dan Komunikasi Kebencanaan; Direktorat Dukungan Sumber Daya Darurat | BPBD Kalteng | 2026-2027 | `jalan_terverifikasi` di AOI; telemetri menerima data | Bab 5, 20 |

| SR-21 | Tambah kolom air dan jembatan di DIBI | data | dikembangkan | Pusat Data, Informasi, dan Komunikasi Kebencanaan | Kementerian PU; BPBD | 100-hari | kolom SPAM terdampak, jiwa tanpa air perpipaan, jembatan per status jalan, hari pulih ada di DIBI | Bab 4, 20; KD-8 |
| SR-22 | Tetapkan garis dasar waktu pulih air dan akses | data | baru | Direktorat Rehabilitasi dan Rekonstruksi Infrastruktur | Kementerian PU | 2026-2027 | garis dasar 2027 terbit | Bab 4, 12; KD-8 |
| SR-23 | Masukkan baris waktu pulih ke templat R3P | regulasi | dikembangkan | Deputi Bidang Rehabilitasi dan Rekonstruksi | Bappenas; Kemendagri | 2026-2027 | templat R3P memuat baris waktu pulih | Bab 12, 17 |
| SR-24 | Ikat jembatan TNI AD dan Polri ke R3P | regulasi | baru | Direktorat Rehabilitasi dan Rekonstruksi Infrastruktur | TNI AD; Polri; Kementerian PU; Kemenko PMK | 100-hari | jembatan di daerah bencana tercatat di R3P, DIBI, dan `/pipa/akses` dengan pemilik aset | Bab 14; KD-10 |
| SR-25 | Tetapkan standar hari pemasangan akses darurat | regulasi | dikembangkan | Deputi Bidang Penanganan Darurat | Kementerian PU; TNI | 2026-2027 | standar hari dalam pembaruan Perka 12/2010 | Bab 14 |
| SR-26 | Hitung stok bailey per Direktorat Penanganan Darurat Wilayah | infrastruktur | baru | Deputi Bidang Logistik dan Peralatan | Kementerian PU; TNI | 100-hari | stok tercatat di `/pipa` kelas K9 | Bab 4.6, 14, 15 |
| SR-27 | Buka jalur dana jembatan dan SPAM desa | pembiayaan | baru | Biro Hukum, Organisasi, dan Kerja Sama; Direktorat Rehabilitasi dan Rekonstruksi Infrastruktur | Kemendesa; Kemendagri; Kemenkeu | 2026-2027 | perubahan Pasal 5 huruf e atau jalur Dana Bersama tertulis | Bab 14.6, 18.9; KD-9 |
| SR-28 | Tulis pemicu peralihan truk ke pipa | regulasi | dikembangkan | Deputi Bidang Penanganan Darurat | Kementerian PU; PDAM | 2026-2027 | pemicu tertulis di juklak | Bab 12 |
| SR-29 | Ukur pemulihan air dalam jiwa terlayani | data | baru | Direktorat Rehabilitasi dan Rekonstruksi Infrastruktur | Kementerian PU | 2026-2027 | laporan R3P memakai jiwa terlayani | Bab 12 |
| SR-30 | Susun protokol sumur bor RR bersama Badan Geologi | regulasi | baru | Direktorat Rehabilitasi dan Rekonstruksi Infrastruktur | Kementerian ESDM (Badan Geologi) | 2026-2027 | protokol ditandatangani; zona dan uji mutu dipakai | Bab 13; KD-11 |
| SR-31 | Satukan daftar sumur darurat semua pelaksana | data | baru | Pusat Data, Informasi, dan Komunikasi Kebencanaan | Badan Geologi; TNI AD; Polri; Kementerian PU | 100-hari | daftar berjalan di `/pipa/air` | Bab 13, 20 |
| SR-32 | Syaratkan sumber air sebelum lokasi huntap | regulasi | baru | Direktorat Rehabilitasi dan Rekonstruksi Perumahan | Kementerian PKP; pemda | 2026-2027 | syarat tertulis di pedoman lokasi huntap | Bab 12.8 |
| SR-33 | Evaluasi dampak program jembatan pedesaan | data | baru | Direktorat Pengembangan Strategi Penanggulangan Bencana | TNI AD; Polri; Kementerian PU; Bappenas | 2028-2030 | laporan evaluasi dengan garis dasar | Bab 14.7, 16.8 |
| SR-34 | Uji coba paket air dan akses Sumatra | infrastruktur | baru | Deputi Bidang Rehabilitasi dan Rekonstruksi | Satgas Sumatra; Kementerian PU | 2026-2027 | satu kabupaten dengan garis dasar dan pembanding | Bab 16.8 |
| SR-35 | Selaraskan Perban 6/2017, Perka 12/2010, dan katalog JDIH | regulasi | dikembangkan | Biro Hukum, Organisasi, dan Kerja Sama | – | 2026-2027 | daftar penyelarasan selesai | Bab 17.9, Lampiran P |
| SR-36 | Tetapkan model pemeliharaan aset terpadu | regulasi | baru | Deputi Bidang Logistik dan Peralatan; Direktorat Pengelolaan Logistik dan Peralatan | TNI AD (YonTP); BPBD | 100-hari | keputusan sepuluh kelas, interval, pemelihara; KD-12 | Bab 15; KD-12 |
| SR-37 | Catat kondisi aset di `/pipa` tiap inspeksi | data | baru | Direktorat Pengelolaan Logistik dan Peralatan; Pusat Data, Informasi, dan Komunikasi Kebencanaan | BPBD; Kemenhut (Manggala Agni) | 2026-2027 | U11 ≥ 90% per musim | Bab 15.8, 20.7 |
| SR-38 | Anggarkan pemeliharaan dan dana operasi aset desa | pembiayaan | baru | Biro Perencanaan; Biro Keuangan | Kemendagri; Kemendesa | 2026-2027 | baris belanja pemeliharaan di RKA BNPB 2027; jalur APBDes atau PKTD untuk aset desa tertulis | Bab 15.6, 18.11 |

Status register memakai tiga nilai P7: `baru` (Usulan baru), `dikembangkan` (Sudah ada, perlu dikembangkan),
`sudah-ada`. Kolom `kajian_asal` di `rekomendasi.csv` diisi `sippa` atau `rehab`.

**Padanan register rehab ke register gabungan.** Kode R-RR tidak dipakai di naskah gabungan; tabel ini masuk Lampiran P.

| R-RR | SR | Perubahan isi |
| --- | --- | --- |
| R-RR-01 | SR-21 | tetap |
| R-RR-02 | SR-22 | tetap |
| R-RR-03 | SR-23 | tetap |
| R-RR-04 | SR-24 | indikator ditambah pencatatan di `/pipa/akses` (keputusan 56) |
| R-RR-05 | SR-25 | tetap |
| R-RR-06 | SR-26 | indikator ditambah aset kelas K9 di `/pipa` |
| R-RR-07 | SR-27 | tetap; terhubung ke SR-38 |
| R-RR-08 | SR-28 | tetap |
| R-RR-09 | SR-29 | tetap |
| R-RR-10 | SR-30 | tetap |
| R-RR-11 | SR-31 | indikator menjadi daftar yang berjalan di `/pipa/air` |
| R-RR-12 | SR-32 | tetap |
| R-RR-13 | SR-33 | tetap |
| R-RR-14 | SR-34 | tetap |
| R-RR-15 | SR-35 | tetap |

Irisan dengan register GD Mitigasi tetap seperti rehab Lampiran J: R-A04 dengan SR-26, R-M10 dengan SR-35, R-M17 dengan
SR-21 dan SR-23, R-M19 dengan SR-33, R-M23 dengan SR-32.

Langkah ≤ 8 kata dan berwaktu (D-31). Urutan tampil di Bab 21: internal dulu menurut waktu, lalu lintas. Jumlah: 38
rekomendasi; 100 hari: SR-01 sampai SR-04, SR-19, SR-21, SR-24, SR-26, SR-31, SR-36 (10).

---

## 7. Foto, peta, grafik, dan gambar teknik

### 7.1 Foto Wikimedia Commons yang dicari

Hanya Commons dengan lisensi CC BY, CC BY-SA, CC0, atau PD (NC dan ND ditolak, D-15); tanpa ilustrasi AI (P12); tanpa
foto yang menampilkan merek alat atau logo lembaga selain BNPB secara menonjol (keputusan 50; logo kecil di seragam
boleh bila tidak terbaca). Kandidat ditambahkan ke `kandidat-foto-commons.csv` dengan `kajian=sippa`, lalu dipilih
dan diberi atribut `pengarang`, `lisensi`, `url` di direktif `gambar` `jenis: foto`.

| Kode | Topik | Kueri Commons (urut dicoba) | Dipakai di |
| --- | --- | --- | --- |
| F1 | Asap dan api di lahan gambut Kalimantan | "peat fire Kalimantan"; "2015 Southeast Asian haze Central Kalimantan"; "kebakaran lahan gambut" | sampul, Bab 1 |
| F2 | Kebakaran 2019 di Kalimantan Tengah | "2019 Indonesian forest fires Central Kalimantan"; "Palangka Raya haze 2019" | sampul alternatif, Bab 3 |
| F3 | Gambut terbakar atau bekas bakar, profil tanah | "burnt peatland Indonesia"; "peat soil profile"; "peat swamp forest fire scar" | Bab 2 |
| F4 | Regu pemadam darat di gambut, selang dan pompa | "firefighters peatland Indonesia"; "Manggala Agni"; "forest firefighter hose Indonesia" | Bab 10 |
| F5 | Kanal gambut dan sekat kanal | "canal blocking peatland Indonesia"; "peat canal Central Kalimantan"; "Ex-Mega Rice Project canal" | Bab 7 |
| F6 | Banjir di Kalimantan atau pompa banjir | "flood Kalimantan"; "banjir Kalimantan Tengah"; "flood pump Indonesia" | Bab 11 |
| F7 | Sungai Kahayan atau Sebangau (sumber air) | "Kahayan River"; "Sebangau National Park river" | Bab 5 |
| F8 | Water bombing helikopter | "water bombing helicopter Indonesia"; "helicopter forest fire Indonesia" | Bab 1 atau Bab 18 (tanpa nama operator terbaca) |
| F9 | Selang layflat tergelar | "lay-flat hose"; "fire hose relay pumping" | Bab 8 (bila tanpa merek terbaca) |
| F10 | Jembatan bailey atau rangka baja darurat | "Bailey bridge Indonesia"; "temporary steel bridge flood Indonesia" | Bab 14 |
| F11 | Jembatan gantung pedesaan | "suspension bridge Indonesia village"; "jembatan gantung" | Bab 14 |
| F12 | Sumur bor atau pompa air tanah | "borehole well Indonesia"; "deep well pump Indonesia" | Bab 13 |
| F13 | Truk tangki atau hidran umum pascabencana | "water tanker disaster Indonesia"; "public water tank earthquake Lombok" | Bab 12 |

Paling sedikit satu foto per bab yang punya padanan topik; foto boleh ditambah sebanyak yang relevan (P18). Atribusi
otomatis di Lampiran S.

### 7.2 Peta dan grafik yang dibangkitkan

Generator: `bangun/visual/render.mjs` atas spek di `bangun/visual/spek-sippa/*.json` (pola `spek-air/`), data
disiapkan `bangun/visual/data_sippa.py` (pola `data_air.py`) dari paket `data/sippa/`. Keluaran `gambar/sippa/*.png`
300 dpi + SVG + manifest; gerbang D-8, D-21, D-24, D-28. Tiap spek memakai `pesan` kode G yang punya perender atau
`alasan` satu kalimat.

| Spek | Gambar | Kode G | Perender | Data |
| --- | --- | --- | --- | --- |
| `sippa-01` | Zona A–D per kompleks Kalteng, konservatif (Gambar 5.1, RE.1, deck B1) | G16 kategori pada titik (alasan tertulis) | `peta.mjs` lapisan titik kategori | `data/sippa/kelayakan_kompleks.csv` |
| `sippa-02` | Zona A–D, optimistis (Gambar 5.2) | idem | idem | idem |
| `sippa-03` | Deteksi VIIRS per tahun 2012–2025 (Gambar 3.1, deck A1) | G1 | `grafik.mjs batang` | `data/sippa/viirs_tahunan.csv` |
| `sippa-04` | Kekerapan sel 2,2 km (Gambar 3.2, deck A2) | G19 | `peta.mjs` perender sel baru (§8.3) | `data/sippa/sel22.json` |
| `sippa-05` | Deteksi di sel berulang 2019 dan 2023 (Gambar 3.3) | G14 | `grafik.mjs batang` berpasangan | `sel22.json` |
| `sippa-06` | Jumlah tahun terbakar per kompleks (Gambar 3.4) | G1 | `grafik.mjs batang` | `area_terbakar.csv` |
| `sippa-07` | Anomali CHIRPS Juli–Oktober (Gambar 3.5) | G7 | perender divergen baru atau `batang` bertanda (§8.3) | `chirps_anomali_tahunan.csv` |
| `sippa-08` | Jarak air dan jalan median dan p90 (Gambar 5.3) | G12 | `grafik.mjs rentang` | `osm_jarak.csv` |
| `sippa-09` | Beda elevasi air lawan kompleks (Gambar 5.4) | G1 | `grafik.mjs batang` | `dem_elevasi.csv` |
| `sippa-10` | Kit bersyarat per provinsi (Gambar 6.1, deck B2) | G20 | `peta.mjs` simbol sebanding | `kit_nasional.csv` |
| `sippa-11` | Porsi zona A–D sembilan provinsi (Gambar 6.2) | G8 | `grafik.mjs bertumpuk` | `zona_provinsi.csv` |
| `sippa-p-<kode>` (18) | Peta kecil per provinsi (Bab 6.5, Lampiran C) | G20 | `peta.mjs` | `profil_provinsi.csv` |
| `sippa-12` | Head loss per km lawan debit, lima diameter (Gambar 8.1, deck B4) | alasan: hubungan dua besaran kontinu, satu sumbu y | `grafik.mjs garis` | `hidraulika_kurva.csv` |
| `sippa-13` | Waktu gelar per kelas medan (Gambar 16.2) | G12 | `grafik.mjs rentang` | `gerbang.csv`, `pilot_2026.csv` |
| `sippa-14` | CAPEX bertingkat T1–T4 (Gambar 18.1, deck E1) | G9 | `grafik.mjs bertumpuk` | `keuangan_tingkat.csv` |
| `sippa-15` | Kipas Monte Carlo T2 (Gambar 18.2, deck E1) | G11 | perender pita baru (§8.3) | `keuangan_mc.csv` |
| `sippa-16` | Tornado kepekaan (Gambar 18.3) | G4 | `grafik.mjs horizontal` | `keuangan_kepekaan.csv` |
| `sippa-17` | Matriks risiko (Gambar 19.1) | G17 | `grafik.mjs matriks` | `risiko.csv` |
| `sippa-18` | Matriks respons tingkat 1–4 (deck lampiran L6, bila tabel native tidak dipakai) | G16 | `grafik.mjs matriks-titik` | `respons.csv` |
| `sippa-19` | Jembatan rusak per tahun 2018–2025 (Gambar 4.1, deck A3) | G1 | salinan spek rehab `bab01-jembatan-rusak-tahunan` | `dibi/rekap_nasional_tahunan.csv` |
| `sippa-20` | Jembatan rusak per jenis (Gambar 4.2) | G8 | `bab04-jembatan-jenis` | idem |
| `sippa-21` | Peta jembatan rusak per provinsi + penanda provinsi kit-banjir (Gambar 4.3) | G20 | `bab04-peta-jembatan-provinsi` + lapisan penanda | `dibi/rekap_provinsi_tahunan.csv`, `kit_nasional.csv` |
| `sippa-22` | Rumah RB per tahun (Gambar 4.4) | G9 | `bab04-rumah-rb-tahunan` | `dibi/rekap_nasional_tahunan.csv` |
| `sippa-23` | Pulih per lapis Sumatra 2025 (Gambar 4.5) | G22 | `bab04-pulih-sumatra-pemilik-aset` | kunci `rehab.pulih.*` |
| `sippa-24` | Matriks kemungkinan × dampak beban pascabencana (Gambar 4.6) | G17 | `bab08-matriks-kemungkinan-dampak` | rehab Bab 8 |
| `sippa-25` | Persen layanan air pulih lawan hari (Gambar 12.2, deck C1) | G24 | `bab06-garis-pulih-air` | kunci `rehab.pipa.*` |
| `sippa-26`, `sippa-27` | Biaya per m³ truk lawan pipa (Gambar 12.3) | G14 | `bab06-biaya-renk`, `bab06-biaya-hsu` | Lampiran O |
| `sippa-28` | Status zona konservasi CAT per provinsi (Gambar 13.1, deck C2) | G19 atau tabel | baru | `cat.json` |
| `sippa-29` | Rumah tangga air tanah dan kebutuhan sumur (Gambar 13.3) | G9 | `bab07-g9-*` | rehab Bab 7 |
| `sippa-30` | Jembatan program lawan rusak DIBI 2025 (Gambar 14.1, deck C3) | G9 | `bab05-program-lawan-rusak` | kunci `rehab.jembatan.*` |

Spek `sippa-19` sampai `sippa-30` disalin dari `bangun/visual/spek-rehab/grafik.json` oleh `bangun/visual/spek_sippa.py`
(M20) dengan id dan nomor gambar baru; data dan perender tidak berubah. Diagram rehab (`spek-rehab/diagram.json`:
tiga lapis, rantai jembatan, rantai air, rantai sumur, lapisan pembiayaan, kalender musim hujan) dipakai dengan cara yang
sama untuk Gambar 7.x, 12.1, 13.2, 14.2, 18.4.

**Aturan grafik (skill `dataviz`, tunduk pada `tema.json` dan PEDOMAN §B5.10 bila bertentangan):**

1. Bentuk dipilih dari tugas data dulu, warna terakhir; angka tunggal menjadi kartu angka, bukan grafik.
2. Satu sumbu y per grafik; dua besaran beda skala menjadi dua grafik atau peta kecil berganda (G25 melarang sumbu
   ganda).
3. Warna zona A–D di buku dan deck adalah biru (air dekat: A, B) dan emas (air jauh: C, D) dengan huruf A–D dan pola
   isi penuh, cincin, setengah, silang yang sama dengan web (keputusan 52; nilai di DESIGN-SYSTEM §2.1.3); kelompok
   gambut lawan mineral diberi urutan tetap dari `tema.json`; warna tidak berubah antargambar, antarversi, dan di
   deck; warna mengikuti entitas, bukan peringkat.
4. Sekuensial satu rona terang ke gelap (kekerapan sel, ramp api); divergen dua rona dengan titik tengah netral
   (anomali CHIRPS, warna arah T2).
5. Palet zona biru dan emas (keputusan 52) diuji dengan validator skill `dataviz`
   (`scripts/validate_palette.js "<hex,...>" --mode light`, lalu `--mode dark` untuk layar `/pipa`) dan ΔE CIEDE2000
   antarpasangan dicatat seperti T6; hex hanya dari `tema.json` (D-9). Status GO/NO-GO selalu dengan teks atau ikon,
   tidak warna saja.
6. Legenda untuk ≥ 2 seri, label langsung untuk ≤ 4 seri; tanpa angka di tiap titik; teks memakai warna teks, bukan
   warna seri.
7. Tiap grafik di layar web punya tampilan tabel; versi cetak memakai pola atau label untuk pembaca buta warna.
8. Render dilihat (lembar bukti `render.mjs --lembar` lalu `pdftoppm`) sebelum dinyatakan selesai: irisan label,
   geometri, luapan.

### 7.3 Gambar teknik

Generator baru `bangun/visual/teknik/*.mjs` (Node stdlib, pola `bangun/visual`): `kit_ga.mjs` (G-01), `pid.mjs` (G-02,
G-09, G-10), `lance.mjs` (G-03), `manifold.mjs` (G-04), `depot.mjs` (G-05), `gudang.mjs` (G-06), `rumah_pompa.mjs`
(G-07), `profil.mjs` (G-08, dari DEMNAS AOI; bila DEMNAS belum diterima dari BIG, memakai Copernicus GLO-30 dengan
catatan DSM berkanopi dan label `terverifikasi; DSM`), `zona.mjs` (G-11, membaca aturan `saranSarana` dari
`public/pipa/hitung.js` supaya identik), `petak.mjs` (G-12), ditambah diagram buku `lapis.mjs`, `siklus.mjs`,
`penampang.mjs`, `alur.mjs`, `lembaga.mjs`, `gerbang.mjs`, `alur_data.mjs`. Keluaran: SVG, PNG 300 dpi untuk badan
teks, PDF A3 untuk Lampiran F. Blok judul satu modul bersama `teknik/blok_judul.mjs`; uji diri menolak gambar tanpa
blok pengesahan kosong atau tanpa kalimat wajib pengesahan, dan menolak dimensi tanpa satuan. Tag P&ID identik dengan
skema telemetri PRD §9.11 (diuji silang).

---

## 8. Perubahan mesin yang diperlukan

Berkas yang disentuh dimiliki `pipa-data` (semua `data/kajian-bnpb/**`, PRD §10.3), kecuali gerbang (`penulis-gerbang`)
dan `public/pipa/**` (agent `sippa` atau `layar-peta` sesuai roster). Subagent tidak commit; sesi induk yang commit
dengan path spesifik.

### 8.1 Kontrak dan pembangun

| No | Berkas | Perubahan | Bukti |
| --- | --- | --- | --- |
| M1 | `tema.json` | blok `kajian.sippa` (§1, judul T-L, lampiran `ABCDEFGHIJKLMNOPQRS`); `qa.pustaka.kajian_min.sippa = 50`; palet zona A–D sebagai token warna kategori; blok `kajian.rehab` tidak dihapus | `python3 bangun/kontrak/tema.py` |
| M2 | `bangun/kontrak/naskah.py` | daftar kajian sah dibaca dari kunci `tema.json` `kajian` (bukan tuple `('air', 'mitigasi', 'rehab')` baris 426; `rehab` tetap sah sebagai sumber); fixture baru menolak kajian tak dikenal | uji diri `python3 bangun/kontrak/naskah.py` |
| M3 | `bangun/docx/bangun.py` | `choices` argumen kajian dari `tema.json` (baris 2021); peta JUDUL sampul (baris 1572) sudah membaca `kj['judul']`, cukup diuji; penyisipan halaman PDF A3 Lampiran F sebagai halaman lipat (fitur baru, atau Lampiran F diserahkan sebagai PDF terpisah bila fitur belum ada, dicatat §10) | `.venv/bin/python bangun/docx/bangun.py sippa` |
| M4 | `qa/periksa.py` | `_kajian()` (baris 1285), `--kajian` (baris 2530), dan T-5 (baris 2091) membaca daftar kajian dari `tema.json`; gerbang baru di §9.4 | `qa/periksa.py --docx ... --kajian sippa` |
| M5 | `bangun/pptx/deck.py` | memastikan spek `naskah/sippa/deck.json` dan stem `sippa-deck` berbeda dari DOCX; tidak ada pemetaan kajian lain yang dikunci | `bangun/pptx/periksa.py` |
| M6 | Workflow `naskah-kajian.js` dan `rakit-kajian.js` di `~/.claude/projects/-Users-alfatehanseptianta-Documents-GitHub-poskokarhutla/6b4ae72d-ad19-4e2b-b9ca-73f12c9d80a1/workflows/scripts/` (di luar repo, tidak di-commit; tiket SP-005 `pipa/TIKET.md`) | kini bercabang tetap `KAJIAN === 'air' ? ... : ...` (baris 17–20). Cabang `sippa`: `JUDUL` = judul §1; `NAMA` = "Kajian SIPPA {DDMMYY}"; otoritas = `pipa/KEPUTUSAN-SIPPA.md`, `KEPUTUSAN.md` (§0.2 berkas ini), Buku Pegangan, `pipa/KERANGKA-BUKU.md` menggantikan "KERANGKA.md bagian ${BAGIAN}" (bab §4, register §6, butir terbuka §10, deck §11); peta BAGIAN deck A Pola api, B Kelayakan, C Desain, D Operasi dan lembaga, E Biaya dan jalan; "KD-1..KD-5" diganti "KD-1..KD-7"; "±13 slide isi" diganti 15; cek batas halaman (rakit baris 41, 110/150) dilewati untuk `sippa` (keputusan 11); nama berkas depan dan lampiran mengikuti pola repo yang dibaca `bangun.py` (`00-depan-*.md`, `90-lampiran-<huruf>.md`, seperti `naskah/air/`), bukan `00-depan.md` dan `90-lampiran.md` tunggal; larangan keputusan 50 dan "tanpa bab kritik" disisipkan ke prompt penulis; `agentType` penulis, penyunting, dan proofread diganti dari `general-purpose` ke `penulis-kajian` untuk tulis dan agent baru berkonteks bersih untuk sunting (agent `penulis-kajian` dibuat di TIKET SP-085) | diff dibaca pemeriksa berkonteks bersih: cabang `air` dan `mitigasi` tidak berubah perilaku |
| M7 | `data/glosarium.json` | singkatan dan istilah §3.6; `varian_terlarang`: "terbukti efektif", "sudah terbukti", "teruji" tanpa rujukan, nama merek alat yang dipakai di pustaka datasheet, "jaringan pipa nasional" | T-9, D-10 |
| M8 | `pustaka.json` | ≥ 50 sumber, separuh resmi atau primer: Page dkk. 2002, Ballhorn dkk. 2009, Santoso dkk. 2021, Mulyasih (UI), PP 57/2016, Permen LHK P.32/2016, UU 24/2007, Perban BNPB 1/2023, 6/2025, 11/2025, lembar data pompa dan layflat, CHIRPS, WorldCover, FIRMS, MCD64A1, GSW (Pekel dkk. 2016), Copernicus DEM, OSM, SiPongi, DIBI, pernyataan BNPB 2023, Kemenhut OMC 2026, BRGM 2021, LPDS 2016 | T-11, D-19 |
| M9 | `kandidat-foto-commons.csv` | baris `kajian=sippa` per §7.1 | D-15 |

### 8.2 Paket data dan registri angka

| No | Berkas | Perubahan |
| --- | --- | --- |
| M10 | `data/sippa/` (di `data/kajian-bnpb/data/`) dengan `README.md` (sumber, lisensi, keterbatasan, tanggal tarik, batas data) | paket kajian: salinan beku per batas data dari `pipa/data/*.csv`, `public/data/luas_resmi.json`, `kendala.json`, `operasi.json`, ditambah turunan: `viirs_tahunan.csv`, `sel22.json`, `zona.json`, `zona_versi.csv`, `zona_provinsi.csv`, `kelayakan_kompleks.csv`, `aoi_calon.json`, `kit_nasional.csv/json`, `profil_provinsi.csv`, `parameter.csv`, `hidraulika_skenario.csv`, `hidraulika_kurva.csv`, `uji_hidraulika.csv`, `lance_orifis.csv`, `respons.csv`, `gerbang.csv`, `harga.csv`, `bom_gambut.csv`, `bom_rinci.csv`, `keuangan*.csv/json`, `risiko.csv`, `indikator.csv`, `rekomendasi.csv`, `inventaris.csv`, `rekonsiliasi.csv`, `pilot_2026.csv` |
| M11 | `bangun/pipa_data.py` | langkah baru `paket` yang menulis M10 dari keluaran langkah yang sudah ada dan dari `scripts/data/sippa/*.py` (PRD §7.2); self-check `__main__` memeriksa reproduksi A188/B418/C89/D170 dan jumlah 865 |
| M12 | `bangun/sippa_angka.py` | membangun entri `angka` kunci `sippa.*` di `data/angka.json` dengan `berkas` relatif ke `data/` (contoh `"berkas": "sippa/zona.json"`), label, sumber; tidak menimpa kunci yang ada; entri `menunggu` ditulis dengan `nilai: null` dan `keyakinan: "menunggu"` |
| M13 | `bangun/sippa_keuangan.py` | RAB, OPEX, TCO, NPV, BCR 3 × 3, Monte Carlo 800 sampel berbenih, kepekaan, dari `harga.csv`; self-check menolak item di dua satuan alokasi dan kontingensi ganda |
| M14 | Kontrak `angka.json` dan pembaca token | status `menunggu` dikenali: token berstatus `menunggu` tampil "–" dan wajib catatan alasan; D-22 dan D-14 menerima "–" dari entri `menunggu`; `tema.json` `kosakata.keyakinan` ditambah `menunggu` untuk pil |
| M15 | Pemicu ekspor D1 | skrip `bangun/sippa_pilot.py` membaca CSV ekspor `/api/sippa/log.csv` yang diunduh staf ke `data/sippa/pilot_2026.csv` (tanpa kredensial di repo) |

### 8.3 Visual

| No | Berkas | Perubahan |
| --- | --- | --- |
| M16 | `bangun/visual/peta.mjs` | lapisan titik kategori (zona A–D) dan perender sel grid 2,2 km (koroplet sel, bukan wilayah administratif); cakupan Kalteng dan nasional |
| M17 | `bangun/visual/grafik.mjs` | perender divergen G7 (bila `batang` tidak cukup) dan pita G11 |
| M18 | `bangun/visual/data_sippa.py`, `spek-sippa/*.json` | pola `data_air.py` dan `spek-air/` |
| M19 | `bangun/visual/teknik/*.mjs` | §7.3, dengan `uji.mjs` sendiri |
| M20 | `bangun/visual/spek_sippa.py` | menyalin spek rehab ke `spek-sippa/sippa-19` s.d. `sippa-30` dengan id baru; self-check menolak spek sumber yang hilang |
| M21 | `bangun/sippa_angka.py` (tambahan) | kunci `sippa.pelihara.*` dari `data/sippa/pelihara.csv` (dibangkitkan dari `public/pipa/pelihara.js`, satu sumber), `sippa.irisan.*`, `sippa.air.*`, `sippa.cat.n`, `sippa.rek.*` (38 rekomendasi); tidak menyalin kunci `rehab.*` |
| M22 | `bangun/sippa_keuangan.py` (tambahan) | biaya pemeliharaan per kelas PRD §6.10.7 ke OPEX; self-check gagal bila laju tertimbang kit gambut di luar 5–8% |

---

## 9. Urutan produksi dan gerbang QA

### 9.1 Pemetaan fase skill produksi buku ke mesin repo

Skill `book-production-rules` memakai 14 fase; aturan repo menang bila bertentangan (Buku Pegangan baris "Pembaca beta
3–5 orang ... tidak ditiru" dan `KEPUTUSAN.md`). Pemetaannya:

| Fase skill | Padanan di repo | Catatan |
| --- | --- | --- |
| 1 Ideation | PRD §1, KEPUTUSAN-SIPPA | selesai |
| 2 Research | berkas bukti `bukti/bab-NN.md` (L56, L57); pustaka ≥ 50 | minimal pustaka repo (L65) lebih ketat dari skill |
| 3 Outline | berkas ini | selesai saat disetujui sesi induk |
| 4 Draft | naskah bab dialek NASKAH-SPEK | |
| 5 Self-edit | QA lapis (a) L68 | |
| 6 Beta reader | **tidak dijalankan** | diganti penyunting independen per bab (Buku Pegangan) |
| 7 Revise | sesudah lapis (b) dan (c) | |
| 8 Copy edit | lapis (b) substansi dan (c) bahasa | |
| 9 Proofread | lapis (d) pada render (L72) | |
| 10 Format, 11 Layout | `bangun/docx/bangun.py` dari `tema.json` (Roboto, A4, L1) | font skill (Garamond) tidak berlaku |
| 12 Cover | sampul dan sampul belakang dibangkitkan (§3.1) | |
| 13 ISBN | **tidak** (kolofon tanpa ISBN) | |
| 14 Publish | serah berkas `keluaran/` ke pemilik; tanpa epub, tanpa materi pemasaran | |

Glosarium dan pemindai varian (aturan skill 7) dijalankan lewat T-9; pemenggalan id-ID (aturan 8) lewat L67.

### 9.2 Urutan kerja

| Langkah | Kerja | Pengerja | Bergantung | Paralel dengan | Bukti selesai |
| --- | --- | --- | --- | --- | --- |
| S1 | Persetujuan kerangka ini oleh sesi induk; PRD §8 diperbarui sesuai §0.3 | sesi induk | – | – | catatan sesi |
| S2 | Mesin M1–M5, M7, M14 | `pipa-data`, gerbang oleh `penulis-gerbang` | S1 | S3, S4 | uji diri kontrak hijau |
| S3 | Paket data M10–M13 dan skrip `scripts/data/sippa/*.py` dengan self-check | `pipa-data` | S1 | S2 | `.venv/bin/python bangun/pipa_data.py paket`; `bangun/sippa_angka.py` |
| S4 | Pustaka M8, foto M9, glosarium M7 | penulis riset | S1 | S2, S3 | `qa/periksa.py` bagian pustaka |
| S5 | Berkas bukti bab 1–22 dalam empat kelompok paralel: (a) Bab 1–6, (b) Bab 7–11, (c) Bab 12–15 dari bahan rehab dan PRD §6.10, (d) Bab 16–22 | empat instans `penulis-kajian` | S3 | S6, S7 | tiap bab punya Inti, Temuan bersumber, Inferensi, Celah, `.angka.json`, `.pustaka.json` |
| S6 | Visual §7.2 (M16–M18) | `pipa-data` | S3 | S5, S7 | `node render.mjs --lembar`; `qa/periksa.py --visual` |
| S7 | Gambar teknik §7.3 (M19) | `pipa-data` | S1 | S5, S6 | daftar periksa PRD §6.9 diisi pengulas lain |
| S8 | Naskah bab, bagian depan, lampiran A–Q; paling banyak empat penulis paralel | `penulis-kajian` | S5, S4 | S6, S7 | `python3 bangun/kontrak/naskah.py naskah/sippa/*.md`; `qa/slop.py --ambang --laporan` per bab |
| S9 | Bab 11.4 dan 16.3 dari ekspor D1 (M15) | `penulis-kajian` + `pipa-data` (kunci) | ekspor pilot 1 Nov dan banjir | S8 | pil "pilot, n kecil" |
| S10 | QA lapis (b) substansi, (c) bahasa, per bab, oleh agent berbeda dari penulis (AGENTS.md §3.2) | penyunting | S8 | antar bab | nol angka ketikan; semua bab LULUS |
| S11 | Bangun DOCX dan PDF | `pipa-data` | S10, S6, S7 | S12 | `cd data/kajian-bnpb && .venv/bin/python bangun/docx/bangun.py sippa` |
| S12 | Deck: `naskah/sippa/deck.json` (spek oleh `penulis-kajian`) lalu PPTX dan PDF | `pipa-data` | S3, S6, Bab 22 final | S11 | `.venv/bin/python bangun/pptx/deck.py naskah/sippa/deck.json keluaran/sippa-deck.pptx --pdf`; `bangun/pptx/periksa.py --serah keluaran/sippa-deck.pptx` |
| S13 | QA lapis (d) proofread render dan (e) gerbang mekanis | pengulas berbeda | S11, S12 | – | `keluaran/qa/sippa.md`, `sippa-deck.md` |
| S14 | Serah versi minggu 49 | sesi induk | S13 | – | berkas di `keluaran/` + manifest |

Fan-out yang menulis memakai `isolation: "worktree"` (AGENTS.md §3.3). Tiap subagent yang dibuat sesi induk diberi
kalimat "You are a subagent. Don't run memo."

### 9.3 QA lima lapis (L68)

1. **(a) Penulis:** dialek lolos `naskah.py`; token, kutipan, rujukan terurai; pertanyaan kunci terjawab berurutan.
2. **(b) Substansi:** tiap angka dicocokkan ke `angka.json` dan sumbernya; nilai acuan di berkas ini dibandingkan
   dengan hasil skrip, selisih dicatat; paragraf tanpa angka, sumber, atau keputusan dipotong; label keyakinan
   benar; "terbukti" diperiksa manual.
3. **(c) Bahasa:** `qa/slop.py --ambang --laporan` sampai LULUS; ditambah enam cek skill `anti-ai-checker` sebagai
   pemindai pendamping: kata terlarang (`ANTI-SLOP.md` adalah daftar yang berlaku), em dash nol (lebih ketat dari ambang
   skill 3,0 per 1.000 kata), kepadatan titik dua ≤ 20 per 1.500 kata di prosa (tidak berlaku untuk label paragraf dan
   sel tabel), pembuka klise di 50 kata pertama tiap bab, frasa pagar ≤ 2 per 1.500 kata, daftar tiga sejajar ≤ 5 per
   1.000 kata. Vonis skill HARD FAIL (≥ 3 pelanggaran) menahan bab seperti vonis `slop.py`.
4. **(d) Proofread render:** dibaca dari PNG halaman PDF (L72): judul dua baris, tabel terpotong, rujukan "Gambar n.m"
   cocok, pil keyakinan terbaca, gambar teknik terbaca pada A3.
5. **(e) Gerbang mekanis:** `qa/periksa.py --docx keluaran/sippa.docx --pdf keluaran/sippa.pdf --pptx
   keluaran/sippa-deck.pptx --pptx-pdf keluaran/sippa-deck.pdf --visual bangun/visual/keluaran --kajian sippa --ketat`
   dengan D-1 sampai D-40 dan T-1 sampai T-12 nol gagal (D-33 sampai D-40 di §9.4, T-12 di RENCANA-UJI §5.4); D-12
   lolos tanpa batas (P18).

### 9.4 Gerbang baru khusus SIPPA (`penulis-gerbang`, dengan fixture negatif)

| Kode usulan | Memeriksa | Ditolak bila |
| --- | --- | --- |
| D-33 | Nama merek dan perusahaan | kata dari daftar merek di `glosarium.json` muncul di luar Daftar Pustaka dan kolom RUJUKAN DATASHEET Lampiran D |
| D-34 | Kedalaman injeksi | pola angka kedalaman injeksi > 5 m di prosa, tabel, atau slide |
| D-35 | Gambar teknik di DOCX | gambar berawalan "SIPPA-G-" tanpa kalimat wajib pengesahan di keterangan; isi lembar (blok judul, blok pengesahan kosong, nomor, konsistensi tag) diperiksa gerbang T-12 (RENCANA-UJI §5.4) atas SVG keluaran `bangun/visual/teknik/` |
| D-36 | Slot menunggu | entri `menunggu` tampil selain "–", atau "–" tanpa catatan alasan |
| D-37 | Rencana bersyarat | tabel, peta, atau slide yang memuat kunci `sippa.kit.nasional.*`, `sippa.rab.t3.*`, `sippa.rab.t4.*` tanpa frasa "rencana bersyarat" |
| D-38 | "Terbukti" | kata "terbukti" atau "teruji" dalam kalimat tanpa kutipan pustaka di kalimat yang sama |
| D-39 | Nama program jembatan (keputusan 55, rehab R2) | "Jembatan Merah Putih" tanpa "Presisi" atau "Polri" di kalimat yang sama; "Jembatan Garuda" tanpa "TNI AD" di kalimat yang sama |
| D-40 | Angka sekunder (rehab R3, Q16) | token kunci `rehab.sekunder.*` atau `rehab.rekon.*` di luar Lampiran A |

Gerbang-gerbang ini juga dijalankan untuk deck (`bangun/pptx/periksa.py`) sejauh berlaku.

### 9.5 Batas

Tidak ada `wrangler deploy` atau push dari subagent; buku tidak dideploy. Kata Pengantar tetap berpenanda periksa
pemilik sampai dilepas pemilik (T7). Berkas `* 2.*` tidak disunting atau dipakai.

---

## 10. Butir terbuka

| No | Butir | Bawaan sementara | Pemutus |
| --- | --- | --- | --- |
| O1 | Harga helikopter kontrak BNPB per jam dan per sorti (keputusan 14, KD-5); pertanyaan pemilik T-A (PRD §2.2) | slot `menunggu`; pembanding pernyataan "> Rp200 juta per sorti" | pemilik (T-A) |
| O2 | Neraca debit kit (Bab 8.4) | **diputus** 25 Okt 2026: debit kerja 300 L/min dengan 8 lance; 600 L/min contoh ajar NO-GO; jumlah lance dipastikan bench G2 | selesai |
| O3 | Workflow `naskah-kajian.js` dan `rakit-kajian.js` ada di `~/.claude/projects/-Users-alfatehanseptianta-Documents-GitHub-poskokarhutla/6b4ae72d-ad19-4e2b-b9ca-73f12c9d80a1/workflows/scripts/`, di luar repo dan tidak terlacak git | perubahan M6 dikerjakan tiket SP-005 tanpa commit; sampai selesai, workflow tidak boleh dijalankan untuk `sippa` | sesi induk (`mekanik-mesin`) |
| O4 | Pembagian Direktorat Penanganan Darurat Wilayah I–III untuk Kalteng dan provinsi banjir | ditulis "sesuai pembagian wilayah" | penulis Bab 17 dengan skill `hukum-bnpb` |
| O5 | Nama lembaga restorasi gambut dan walidata KHG yang berlaku Oktober 2026 | "Kemenhut atau badan restorasi gambut yang berlaku" | penulis Bab 17 |
| O6 | Penyisipan halaman A3 lipat ke DOCX (M3) | bila belum didukung, Lampiran F menjadi PDF A3 terpisah dan halaman di DOCX berisi daftar dan rujukan; T-2 tetap terpenuhi | `pipa-data` |
| O7 | DEMNAS AOI belum diterima dari BIG | SIPPA-G-08 dan Gambar 8.2 memakai Copernicus GLO-30 berlabel DSM | surat Lampiran I |
| O8 | Tanggal terbit buku | Desember 2026 | sesi induk |

Kode O adalah butir produksi buku yang diputus sesi induk atau pengerja. Pertanyaan untuk pemilik hanya T-A sampai
T-K di PRD §2.2; yang berdampak ke buku: T-A (heli), T-D (provinsi banjir), T-E (OPEX regu), T-F (nilai manfaat),
T-G (penanda tangan Kata Pengantar).
| O9 | Ambang FRP matriks respons belum diuji terhadap log 2026 | tabel PRD §5.4 berlabel asumsi-kebijakan | `pipa-data` sebelum `final` |
| O10 | Angka pembanding berita (OMC, sekat kanal, sumur dangkal, armada heli) belum dibuka ke dokumen resmi | hanya di naskah `draf`; bila tidak terbuka, pindah ke catatan berlabel | penulis riset |
| O11 | Dokumen primer rehab yang belum dibuka (Keppres 1/2026, Inpres 18/2025, Juklak 5/2024, R3P Aceh, Sumut, Sumbar, lampiran Permen ESDM 2/2017, data sumur Badan Geologi 2019–2026, SE Menteri PU 02/SE/M/2010; rehab KERANGKA §11) | tidak dikutip isinya; surat Lampiran I | penulis Bab 13, 14, 17 |
| O12 | Interval servis pabrikan kelas pompa dan layflat, pedoman pemeriksaan jembatan Bina Marga | interval PRD §6.10 berlabel asumsi-kebijakan | penulis Bab 15 sebelum `final` |
| O13 | Angka rehab bertanggal sesudah batas data 23 Okt 2026 | tidak dipakai, atau berpil tanggal tarik sendiri | penyunting substansi |
| O14 | Bahan rehab Bab 8 dan Lampiran C memakai kunci `hidromet.*` kajian mitigasi | dipakai apa adanya; tidak disalin | penulis Bab 4 |

Pertanyaan pemilik yang berdampak ke buku sesudah keputusan 55: T-L (judul), T-M (deck 18 slide), T-N (RAB untuk air
tanah dan akses), T-O (peta publik rehab dicabut), T-Q (jadwal serah).

---

## 11. Deck paparan (18 slide isi, T-M)

Spek `naskah/sippa/deck.json` dibaca `bangun/pptx/deck.py` (pola `naskah/air/deck.json`); keluaran
`keluaran/sippa-deck.pptx` dan `.pdf`. Mengikuti Buku Pegangan S1–S39 dan templat rumah BNPB (slide master
`bangun/pptx/templat`: garis y95 dan y507,6, nomor halaman, logo BNPB, pil CUT OFF `23 Okt 2026, 23.59 WIB` di slide
data). Dari skill `alfatehan-pptx-rules` dipakai yang tidak bertentangan dengan Buku Pegangan: Roboto saja; nol emoji
dan nol simbol Unicode sebagai ikon (ikon dari registri `tema.json` `glif`); tanpa garis aksen di bawah judul; tiap
slide bervisual (S36); paling banyak 6 butir, dua tingkat inden (S38); tiap angka bersumber dan bertahun di baris
Sumber; variasi tata letak (S35); kata terlarang `ANTI-SLOP.md`; em dash nol. Ukuran judul mengikuti Buku Pegangan (19
pt, maks 2 baris, T11), bukan 36–44 pt skill; palet dari `tema.json`, bukan palet skill.

`pesan_kunci` akar spek: "Api dan banjir kembali ke tempat yang sama; SIPPA memindah kit, air, dan akses ke sana dalam satu
sistem aset yang terpelihara, dan dibeli hanya setelah gerbang uji lulus."

Bagian: **A** Pola api dan beban; **B** Kelayakan dan desain kit; **C** Air dan akses pascabencana; **D** Pemeliharaan dan
lembaga; **E** Biaya dan jalan (tetap lima kode A–E, T12). Judul slide berkode dan slide 18 wajib `judul_bentuk: temuan`
(NASKAH-SPEK §17); hanya slide 1 (Pesan Kunci) deskriptif. Urutan `jenis_slide`: navigasi, grafik, peta, grafik, peta,
tabel, panel, grafik, tabel, grafik, panel, tabel, matriks, panel, matriks, grafik, rekomendasi, navigasi (tidak ada dua
jenis sama berurutan). Versi 1 slide C3 (BOM) dan D1 (matriks respons) pindah ke lampiran deck L5 dan L6.

| No | Kode | `jenis_slide` | `judul_bentuk` | Judul (bentuk, token) | `pesan` | Visual dan sumber |
| --- | --- | --- | --- | --- | --- | --- |
| – | sampul | – | – | Grand Design Sistem Pipa Portabel Karhutla dan Banjir (SIPPA) Terintegrasi 2026–2030 | – | sampul rumah BNPB, subjudul, foto F1 atau F10 beratribusi |
| 1 | – | navigasi | deskriptif | Pesan Kunci: api dan banjir kembali ke tempat yang sama, aset bergerak ke sana, belanja menunggu gerbang | tesis, lima temuan satu per bagian, pita KD-1, KD-2, KD-3, KD-8 | tesis `{{angka:sippa.tesis\|teks}}`; lima kartu "Temuan A.1" sampai "Temuan E.1" berpil keyakinan; pita keputusan |
| 2 | A1 | grafik | temuan | Deteksi VIIRS Kalteng `{{angka:sippa.viirs.kalteng.2015}}` titik pada 2015 dan di bawah `{{angka:sippa.viirs.kalteng.maks_2020_2022}}` per tahun pada 2020–2022 | aset tetap akan diam di sebagian besar tahun | batang G1 `sippa-03` native; pil Terverifikasi |
| 3 | A2 | peta | temuan | `{{angka:sippa.sel22.kalteng.deteksi_2023_sel_berulang_persen\|persen}}` deteksi 2023 jatuh di sel 2,2 km yang sudah terbakar tiga tahun atau lebih | lokasi api dapat ditebak | peta `sippa-04` + kartu angka 72% (2019) dan 825 sel aktif ≥ 7 tahun; Sumber: NASA FIRMS VIIRS 2012–2025, olahan Pantau Bencana |
| 4 | A3 | grafik | temuan | Bencana alam merusak `{{angka:rehab.dibi.jembatan_rusak.2018_2025}}` jembatan pada 2018–2025, `{{angka:rehab.dibi.jembatan_rusak.2025}}` di antaranya pada 2025 | banjir merusak akses di bulan yang sama dengan musim banjir kit | G1 `sippa-19`; tiga kartu angka (porsi banjir, Aceh, Sumatera Barat); judul rehab slide A1 sebagai titik awal; pil Resmi |
| 5 | B1 | peta | temuan | `{{angka:sippa.zona.kalteng.konservatif.ab.n}}` kompleks Kalteng (`{{angka:sippa.zona.kalteng.konservatif.ab.persen\|persen}}`) berada di zona yang dapat dilayani kit | kit menjawab sebagian besar, zona D dijawab pencegahan | dua peta kecil `sippa-01` dan `sippa-02`, zona biru dan emas berhuruf dan berpola; tabel mini A–D tiga versi |
| 6 | B2 | tabel | temuan | `{{angka:sippa.kit.nasional.n}}` kit bersyarat untuk 18 provinsi, `{{angka:sippa.kit.nasional.gambut}}` di provinsi gambut | kebutuhan nasional terukur tetapi bersyarat G5 | tabel native 18 baris + peta kecil `sippa-10`; teks "rencana bersyarat, bukan pengadaan" |
| 7 | B3 | panel | temuan | Bara gambut berada pada `{{angka:sippa.bara.kedalaman_m\|rentang\|satuan}}`; injeksi dibatasi 0–1,5 m dan paling dalam 5 m | doktrin kedalaman dari fisika gambut | penampang Gambar 2.1 + tiga kartu angka |
| 8 | B4 | grafik | temuan | Delapan lance menyerap `{{angka:sippa.hid.serap.lance8_l_min}}` L/min, jadi kit bekerja pada `{{angka:sippa.kit.debit_operasi_l_min}}` L/min; relay DN100 1 km cukup satu pompa | titik kerja di ujung manifold | garis `sippa-12` + panel serapan dengan pil NO-GO untuk 600 L/min |
| 9 | B5 | tabel | temuan | Modul banjir mengeringkan 1 ha genangan 0,5 m dalam sekitar `{{angka:sippa.banjir.jam_100ls}}` jam, pompa api perlu sekitar `{{angka:sippa.banjir.jam_30ls}}` jam | pemakaian ganda butuh modul terpisah | tabel kapasitas + kalender kit karhutla-banjir-irigasi (Gambar 11.1) |
| 10 | C1 | grafik | temuan | `{{angka:rehab.pipa.sumatra2025.persen_fungsi_mei2026\|persen}}` dari `{{angka:rehab.pipa.sumatra2025.spam_terdampak}}` SPAM Sumatra berfungsi pada Mei 2026, perbaikan permanen baru `{{angka:rehab.pipa.sumbar.target_permanen\|teks}}` | lapis darurat cepat, lapis permanen tertinggal; DIBI tidak mencatat air | chip AIR PERPIPAAN; G24 `sippa-25` (Sumatra, Kobe, Tohoku); judul rehab slide B2 sebagai titik awal |
| 11 | C2 | panel | temuan | Satu sumur bor Badan Geologi melayani sekitar `{{angka:rehab.akuifer.sumur_bg_jiwa_per_sumur}}` jiwa; sumur RR hanya di luar zona kritis dan rusak atau dengan rekomendasi Badan Geologi | air tanah sebagai jawaban dan sebagai risiko | chip AIR TANAH; panel CAT dan zona (`sippa-28`), panel pelaksana sumur, panel mutu dan intrusi |
| 12 | C3 | tabel | temuan | Satgas TNI AD menyelesaikan `{{angka:rehab.jembatan.garuda.selesai_2026_08}}` titik jembatan, `{{angka:rehab.jembatan.garuda.titik_wilayah_bencana_2026_08}}` di daerah bencana; jembatan desa tetap di luar hibah RR | program jembatan menurut pemilik dan celah aset desa | chip AKSES; tabel program per pemilik (Jembatan Merah Putih Presisi Polri, jembatan gantung Kementerian PU, bailey DSP); kotak status nama; Perban 4/2024 Pasal 5 huruf e |
| 13 | D1 | matriks | temuan | `{{angka:sippa.pelihara.kelas_n}}` kelas aset dengan siklus inspeksi, skor kondisi, dan pemelihara tertulis; kit dengan komponen kritis rusak berat tidak laik gelar | aset hanya berguna bila siap pada hari pemicu | matriks kelas × interval × pemelihara (Tabel 15.2 ringkas); kartu biaya pemeliharaan per tahun berpil asumsi-kebijakan |
| 14 | D2 | panel | temuan | Gerbang efikasi menuntut kenaikan ≥ `{{angka:sippa.gerbang.g4.ambang_persen\|persen}}` dengan sedikitnya `{{angka:sippa.gerbang.g4.n_min_lengan}}` petak per lengan | belanja dibuka gerbang demi gerbang | tujuh kartu gerbang G0–G6 + garis waktu ringkas |
| 15 | D3 | matriks | temuan | `{{angka:sippa.raci.tahap.n}}` tahap kit dengan satu pemutus per tahap; air dan akses dipimpin Deputi Bidang Rehabilitasi dan Rekonstruksi | siapa memegang apa | matriks RACI (≤ 12 baris) + matriks mandat air dan akses K/P/R/I, chip lembaga tanpa logo (S22, S23) |
| 16 | E1 | grafik | temuan | Pilot dua musim membutuhkan `{{angka:sippa.rab.t2.pinjam\|rupiah\|rentang}}`; skala dibuka hanya setelah gerbang G5 | biaya bertingkat dan ketidakpastiannya | batang bertumpuk `sippa-14` + kipas `sippa-15` (dua panel); pembanding heli "> Rp200 juta per sorti" dan slot kontrak "–"; catatan "air tanah dan akses: biaya satuan saja" |
| 17 | E2 | rekomendasi | temuan | `{{angka:sippa.rek.n}}` langkah dalam tiga horizon; `{{angka:sippa.rek.seratus_hari.n}}` di antaranya dimulai dalam 100 hari pertama | 38 rekomendasi per horizon | baris LANGKAH, RINCIAN, PENANGGUNG JAWAB, pil status, pita horizon (S28, S29); paling banyak 6 baris di slide, lanjutan di lampiran deck |
| 18 | – | navigasi | temuan | Keputusan KD-1, KD-2, KD-3, dan KD-8 membuka pilot 2027 dan garis dasar pemulihan; belanja skala tetap tertutup sampai gerbang G5 | 10 kesimpulan dan keputusan yang sama dengan slide 1 | kisi 5 × 2 (S32) + pita ARAHAN berisi KD-1, KD-2, KD-3, KD-8; angka identik dengan slide 2–17 |
| – | penutup | – | – | Terima kasih | – | layout GELAP, alamat T4 |
| L1 | lampiran | lampiran | deskriptif | Zona A–D per kabupaten Kalteng, tiga versi | – | tabel native (lanjutan per 24 baris) |
| L2 | lampiran | lampiran | deskriptif | Profil 18 provinsi | – | tabel native seri S26 |
| L3 | lampiran | lampiran | deskriptif | Register rekomendasi SR-01 sampai SR-38 | – | tabel native |
| L4 | lampiran | lampiran | deskriptif | Keputusan KD-1 sampai KD-12 dan akibatnya | – | tabel native |
| L5 | lampiran | lampiran | deskriptif | Isi kit gambut: komponen berkode dan CAPEX | – | GA ringkas SIPPA-G-01 + tabel BOM 8 baris (slide C3 versi 1) |
| L6 | lampiran | lampiran | deskriptif | Matriks respons tingkat 1–4 | – | tabel native atau `sippa-18` (slide D1 versi 1) |
| L7 | lampiran | lampiran | deskriptif | Metode, data yang belum ada, dan singkatan | – | tabel native |

Kunci yang dipakai deck tetapi belum ditulis di §4 dan wajib dibuat M12 dan M21: `sippa.bom.kit_gambut.n_kode`,
`sippa.respons.tingkat4.regu_min`, `sippa.raci.bnpb_a.n`, `sippa.rek.n` (38), `sippa.rek.seratus_hari.n` (10, jumlah SR
berwaktu `100-hari` di register §6), `sippa.kit.debit_operasi_l_min` (300), `sippa.pelihara.kelas_n` (10). QA deck:
`bangun/pptx/periksa.py` lalu `qa/periksa.py --pptx --pptx-pdf --ketat`, daftar periksa Buku Pegangan butir 1–10 (§ deck),
laporan `keluaran/qa/sippa-deck.md`.
