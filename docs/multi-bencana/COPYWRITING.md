# Copywriting: suara karhutla, ditiru tiap bencana

Dipetakan 16 Okt 2026 dari string nyata di `public/**`, `src/**`, `scripts/og/**`, memori pemilik
(`gaya-kartu-insight.md`, `fitur-disembunyikan.md`), ilmu `selera-angka` dan `layar-peta`, dan
`scripts/i18n/GLOSARIUM.md`. Nomor baris diadu ke berkas per hari itu.

Tiap bencana baru menulis copy dengan pola di bawah, lalu mengganti KATA-nya lewat tabel padanan
(§5). Pola tidak boleh diubah per bencana; yang berubah cuma kosakata.

## 1. Suara

Bahasa Indonesia polos dan faktual, seperti redaktur berita. Satu baris = satu temuan, angka di
depan. Hampir tidak pernah menyapa pembaca. Perintah pakai kalimat perintah pendek ("Pilih titik di
peta", "Coba lagi"). Judul dan label huruf kalimat (sentence case). Tanpa emoji, tanpa basa-basi.

## 2. Pola per permukaan

| Permukaan | Pola | Contoh karhutla (berkas) |
| --- | --- | --- |
| Judul kartu Insight | **angka + satuan + kata kerja + tempat + jendela waktu**, kadang klausa sumber. Angka disorot `Insight.hl` | "Asap tidak sehat (PM2.5 > 55) menyelimuti **N provinsi** hari ini" (`index.html` ~3500); "**N ha** lahan terbakar ditangani **N personel** di N provinsi, menurut laporan BNPB" (3563) |
| Pil kategori kartu | Kata benda pendek | "Citra satelit", "Tren harian", "Cuaca", "Kesehatan", "Riwayat 25 tahun" (`Insight.LABEL`, 3370) |
| Pop-up Situasi hari ini | Eyebrow "Situasi {bencana} hari ini" → judul berangka + selisih kemarin (▲/▼ atau "sama dengan kemarin") → chip → seksi → kaki "Sumber: …" + tombol "Lihat peta" | `sapa.js:55-79` |
| Kosong | "Belum ada …" / "Tidak ada …" + langkah berikutnya bila ada | "Belum ada foto" + "Jadilah yang pertama mengirim foto dari lokasimu." + "Ambil foto" (`foto.js:102`) |
| Angka kosong | "–" (en dash) | `fmt`, `index.html:1592` |
| Galat / toast | Keadaan dulu, lalu jalan keluarnya; kalimat bertitik | "Akses lokasi ditolak. Buka pengaturan peramban, izinkan lokasi untuk situs ini, lalu coba lagi." (`foto.js:318`) |
| Tombol | Kata kerja + objek, huruf kalimat | "Lihat peta", "Ambil foto", "Salin tautan", "Unduh gambar ringkasan" |
| Tooltip | Pita kepala + kolom label/nilai, ▲ merah naik / ▼ hijau turun, tanpa tanggal ISO mentah | `rapikanTip`; memori `gaya-kartu-insight` |
| Metode | **Singkatnya → Alurnya (LANGKAH 1…n) → Contoh dengan data hari ini → Rincian teknis (terlipat) → Batasan**. "Singkatnya" tanpa jargon, diakhiri catatan jujur | `index.html:4889`, 5018-5053 |
| Keterangan sumber | `Sumber: A, B, C` miring di kaki kartu (`Insight.ex`) | "Sumber: WorldPop 2026 (CC BY 4.0), CAMS via Open-Meteo." |
| Teks bagikan | **kalimat temuan → konteks → "Data per {tgl}, diolah dari {sumber}." → ajakan membuka situs → tagar**. Tanpa emoji (vonis pemilik 14 Okt 2026, `bagikan.js:914`) | `bagikan.js:914-927`, `teksWil` 334-347 |
| OG | Judul "{Halaman} · Pantau Bencana"; deskripsi "{tgl}: {N} {kejadian}, {N} {dampak}. …" dibangun dari data | `scripts/og/buat.py:43-97` |

## 3. Angka, satuan, waktu (berlaku semua bencana)

- `fmt` id-ID, paling banyak 1 desimal, titik ribuan, koma desimal. `toFixed` mentah haram di teks tampil.
- "rb"/"jt" cuma di label sempit (`rb`, `index.html:3346`). Kalimat memakai "ribu/juta".
- Cacah kecil di awal kalimat dieja: "Tidak ada", "Satu" … "Sepuluh" (`ringkasan.js:38`).
- Simbol: "×" rasio, ▲/▼, "±", "≤ / ≥", "<" berspasi ("< 1 mm"), "·" pemisah, en dash untuk rentang ("2002–2025").
- Satuan selalu ditulis: titik, ha, jiwa, desa, km, mm, °C, µg/m³, jam/menit. Bencana baru menambah: M (magnitudo), km kedalaman, MMI, m di atas puncak, mm/hari, hari tanpa hujan.
- Waktu: "14 Okt 21.20 WIB" (`jamWIB`, `index.html:1597`); relatif "baru saja / N mnt lalu / N jam lalu", "hari ini / kemarin / N hari lalu". Jendela: "dalam 24 jam terakhir", "3 hari terakhir", "30 hari ke depan".
- Tiap angka menyebut sumber dan waktunya.

## 4. Aturan tertulis dan pelanggaran yang masih ada

| Topik | Aturan | Sumber |
| --- | --- | --- |
| Huruf kapital | Huruf kalimat untuk judul | GLOSARIUM "Gaya" |
| Emoji/ikon | Caption tanpa emoji; ikon SVG garis tulisan tangan (`IK`, `MT_IKON`) | `bagikan.js:914`; `layar-peta` |
| Fitur disembunyikan | Disembunyikan, bukan dihapus; tiap "hilangkan" dicatat di `fitur-disembunyikan.md` | memori |
| Kartu Insight | Pil + kalimat temuan berangka merah + kontrol segmen / grafik / kaki legenda + "Sumber:". Tanpa subjudul, tanpa paragraf caveat, tanpa kotak KPI navy | `gaya-kartu-insight.md` |
| Frasa wilayah | "9 provinsi prioritas" haram; tulis "provinsi yang sering mengalami karhutla" | memori; `selera-angka` 7 |
| Konsesi | Netral: "titik panas berada di dalam areal konsesi", tanpa menuduh | `selera-angka` 9 |
| i18n | UI ditulis Indonesia; Inggris dari `i18n/en.json`; angka di kunci jadi `{0}`; nama, judul berita, isi pengguna tidak diterjemahkan | GLOSARIUM |
| Em dash | **Dilarang di teks tampil** (diputus 16 Okt 2026, §6). Sebelumnya: rentang pakai en dash, pemisah "·" dan ":"; em dash cuma 1 di UI (`informasi.js:239`) | kode |

**Sisa pelanggaran, dibereskan di FASE-0 sebelum disalin ke bencana lain:**

1. "provinsi prioritas" tampil di `ringkasan.js:427,441` dan `index.html:5565`.
2. Merek lama "Posko Karhutla" di `privasi.html:7,45,50`, `warga/index.html:33`, `src/admin_halaman.js:19,24,34,40`, `public/admin/pesan.js:12`.
3. "titik api" vs glosarium "titik panas" di `sapa.js:68,74`, `bagikan.js:382`.
4. Teks pengembang bocor ke pengguna: "Jalankan scripts/data/dampak.py." (`dampak.js:471`), "Sumber: scripts/sebaran/kasus.py." (`insight_sebaran.js`, tersembunyi).
5. og:title karhutla terpasang di `tentang.html:14` dan `privasi.html:15`.
6. "Coming Soon" Title Case Inggris di menu bahaya (`index.html:1475`, 4 kali), "Real Time" (1498), "Chat Admin" (`public/pesan.js:76`).
7. "Tautan foto disalin" tanpa titik (`foto.js:202`), sementara toast lain bertitik.

## 5. Kosakata padanan per bencana

Pola kalimat tetap; kolom ini yang diganti. Istilah resmi dari BMKG, PVMBG, BNPB, dan ambangnya
wajib diadu lagi ke halaman lembaga saat tahap riset (`ALUR.md` tahap 1).

| Konsep (karhutla) | Gempa & tsunami | Gunung api | Cuaca ekstrem | Kekeringan | Kualitas udara | Banjir/longsor/rob |
| --- | --- | --- | --- | --- | --- | --- |
| Satuan deteksi ("titik panas") | kejadian gempa: M 5,2, kedalaman km, pusat gempa | erupsi, kolom abu (m di atas puncak), gempa vulkanik, tremor | peringatan dini cuaca | hari tanpa hujan (HTH) | PM2.5/PM10 (µg/m³), ISPU | curah hujan (mm), tinggi muka air, debit |
| Satuan kelompok ("kompleks api") | gempa utama + susulan | per gunung api | wilayah peringatan | wilayah kekeringan | kota/stasiun | kecamatan berstatus banjir |
| Kode kejadian (K0001) | G0001 | V + nomor GVP | C… | D… | U… | B… |
| Indeks bahaya ("FWI") | intensitas MMI I–XII | Level aktivitas | intensitas hujan: lebat 50–100, sangat lebat 100–150, ekstrem > 150 mm/hari; angin; gelombang | HTH pendek 6–10 … ekstrem > 60 hari; SPI | ISPU | indeks bahaya banjir |
| Tingkat resmi | Tsunami Waspada/Siaga/Awas (InaTEWS); "tidak berpotensi tsunami" | Level I Normal, II Waspada, III Siaga, IV Awas | Waspada/Siaga/Awas | Waspada/Siaga/Awas | Baik, Sedang, Tidak sehat, Sangat tidak sehat, Berbahaya | Normal/Waspada/Siaga/Awas (pintu air DKI: Siaga 4 terendah sampai Siaga 1) |
| Status tindakan ("Pencegahan rutin … Prioritas pemadaman") | Pemantauan → Kaji cepat → Siaga evakuasi → Tanggap darurat | ikut rekomendasi PVMBG + radius (km) | Pantau → Siaga → Evakuasi | Pantau → Hemat air → Distribusi air bersih | Pakai masker → Kurangi aktivitas luar → Ruang udara bersih | sudah ada (`banjir/status.py`) |
| Respons ("pemadaman") | pencarian dan pertolongan, evakuasi, pengungsian | evakuasi, pengosongan radius, penutupan jalur | evakuasi, penebangan pohon rawan | dropping air bersih | masker, ruang udara bersih | evakuasi, perahu, pompa |
| Faktor tapak ("gambut") | jenis tanah/likuefaksi, sesar aktif | KRB I/II/III | lereng, pesisir | sawah | – | dataran banjir, DAS |
| Lembaga lapangan | BMKG, Basarnas, TRC BPBD | PVMBG, Pos Pengamatan Gunung Api | BMKG, BPBD | BPBD, PDAM | Dinkes, KLH | BPBD, Tagana |
| Dampak ("jiwa terpapar asap") | penduduk terpapar guncangan per MMI | penduduk dalam radius/KRB, hujan abu, bandara terdampak (VONA) | penduduk di wilayah peringatan | penduduk krisis air bersih | jiwa menghirup udara tidak sehat | jiwa terdampak/terendam |
| Kata kerja | terjadi / dirasakan / mereda | erupsi / level naik / turun | berpotensi terjadi / berlaku hingga | berlangsung N hari | menyelimuti / membaik | tergenang / surut |
| Frasa wilayah | "provinsi yang sering diguncang gempa" | "provinsi dengan gunung api aktif" | "provinsi yang sering dilanda cuaca ekstrem" | "provinsi yang sering mengalami kekeringan" | "kota dengan udara paling tercemar" | "kecamatan langganan banjir" |
| Musim | sepanjang tahun | – | musim hujan, pancaroba | musim kemarau | musim kemarau (asap) | musim hujan |
| Kategori foto | Kerusakan bangunan, Retakan tanah, Pengungsian, Genangan tsunami | Hujan abu, Lahar, Pengungsian | Pohon tumbang, Genangan, Atap rusak | Sumur kering, Sawah puso, Antre air | Asap/kabut, Jarak pandang | Genangan, Arus, Longsor |
| Tagar | #gempa #infogempa #tsunami | #gunungapi #erupsi | #cuacaekstrem #peringatandini | #kekeringan #krisisair | #kualitasudara #ISPU | #banjir #longsor #rob |
| Inggris | earthquake, magnitude, MMI intensity, aftershock | Level II (Waspada) alert, ash column, hazard zone (KRB) | heavy / very heavy / extreme rain | consecutive dry days | ISPU (air pollution index) | sudah ada |

Kosakata ini tinggal di registry (`kata{unit,kejadian,tindakan,frasa_wilayah}`, lihat
[`MODUL-PLUG-AND-PLAY.md`](MODUL-PLUG-AND-PLAY.md)), bukan ditulis ulang di tiap berkas layar.

## 6. Keputusan pemilik (diputus 16 Okt 2026)

1. **Sapaan pembaca: "kamu".** Berlaku di semua teks yang menyapa pembaca. Yang masih memakai "Anda"
   (`informasi.js:377`, `privasi.html` 23 kali) diganti "kamu"; kalimat yang tidak perlu menyapa tetap
   tanpa kata ganti.
2. **Em dash dilarang di teks tampil.** Pakai ":" atau "·" sebagai pemisah; en dash tetap untuk rentang
   ("2002–2025"), dan "–" tetap penanda angka kosong. Sisa yang diketahui: `informasi.js:239`.
3. **Ikon: SVG garis**, seragam dengan karhutla (`IK`, `MT_IKON`), bukan emoji dalam lingkaran.

## 7. Gerbang yang diusulkan

`tests/agen/gerbang-copy.test.mjs` (pemilik `penulis-gerbang`), menyapu `public/**/*.{js,html}`
dan `src/**`:

- frasa haram: "provinsi prioritas", "Posko Karhutla", "Coming Soon", "Jalankan scripts/", "Sumber: scripts/";
- `toFixed(` di string tampil (sudah dijaga sebagian oleh `selera-angka`);
- em dash di teks tampil (§6.2);
- "Anda" di teks tampil (§6.1);
- tiap `rute` di registry punya entri OG dan trio hreflang.

RATCHET: daftar sisa cuma boleh menyusut; berkas bencana baru wajib nol.
