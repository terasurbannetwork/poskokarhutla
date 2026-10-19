# Ilmu selera-angka

> Kelas: pemeriksa · Model: haiku · Definisi: `.claude/agents/selera-angka.md`
> Dibaca SEBELUM kerja (`node scripts/agents/ilmu.mjs baca selera-angka`). Kasus baru
> ditambah SESUDAH kerja lewat `node scripts/agents/ilmu.mjs kasus selera-angka "..."`.

## Peta berkas & tabel

Kamu read-only; periksa angka yang tampil, bukan kebenaran model. Tempat angka diformat:

- **`public/index.html`**: `fmt` (baris 1536) = `toLocaleString("id-ID", {maximumFractionDigits: 1})`, `"–"` bila kosong/NaN; `jamWIB` (1541) = "14 Okt 21.20 WIB" via `id-ID` zona `Asia/Jakarta`; `rb` (3238) = singkatan ribu/juta (`>=1e6` "jt", `>=1e4` "rb", `>=1e3` desimal + "rb"); `fmtJam` (2601); `angkaID` (1570) untuk teks BNPB campur; `tglPendek`/`labelHari` (2003-2005) = "hari ini/kemarin" + tanggal; pil angka `Insight.pil` (3260-an); tooltip `rapikanTip` (3610) yang mengenali pola `\d rb|jt titik`.
- **Modul:** `cerita_karhutla.js` `nf` (baris 9) dan `rbk` (42); `operasi.js` `rb0` (157; "M"/"jt"); `dampak.js` `jt` (70) = `rb()` lalu "rb" -> "ribu", "jt" -> "juta"; `statistik_publik.js` `fmt` (5); `bagikan.js` (gambar bagikan, caption, `Sumber:`); `ringkasan.js`, `citra.js`, `databaru.js`, `informasi.js`.
- **EN:** `public/i18n.js` mengubah locale `id-ID` jadi `en-GB` (1,234.5) dan `angkaEN()` (baris ~33) mengubah "rb/jt/M/T" jadi "thousand/million/bn/tn" (khusus `Rp`), jadi sumber angka tetap ditulis gaya Indonesia di kode.
- **Sumber & waktu pada kartu:** footer `Insight.ex` memecah catatan pada `Sumber:` lalu mencetak `<em>Sumber: ...</em>` miring di kaki kartu (kaki juga memuat legenda). Header situs `#upd` = "Data " + `jamWIB(S.acuan)` (waktu lintasan satelit terakhir; `title` memuat waktu olah `meta.dibuat`). Gambar bagikan: baris sumber per tema di `bagikan.js` (karhutla: "Sumber: NASA FIRMS, BMKG/Open-Meteo, BNPB"; banjir: Open-Meteo, Copernicus GloFAS, BMKG Maritim, ...); caption memakai "sumber + tanggal".
- Aturan gaya pemilik (memori `gaya-kartu-insight`) menentukan *bentuk* angka tampil; lihat Aturan.


## Aturan & invarian

1. **Pemisah ribuan titik, desimal koma** (`id-ID`). `toFixed(n)` menghasilkan titik desimal: ia hanya boleh dipakai untuk koordinat SVG/jalur (`ringkasan.js:164`, `dampak.js:248`, `index.html:5933`) atau diikuti `.replace(".", ",")` (contoh benar `index.html:2285`, `4555`, `5790`). `toFixed(1)` mentah pada teks tampil (mis. `index.html:1983` "x.x km", `2161` dan `2225` "x.x× normal/rata-rata", `2287` tooltip) adalah temuan: harus `fmt(...)` atau `.replace(".", ",")`.
2. **Satuan selalu tertulis** (titik, ha, jiwa, desa, sekolah, km, mm, °C, µg/m³, jam/menit); angka telanjang tanpa satuan di kartu = temuan. Perubahan ditulis ▲ (merah, naik) / ▼ (hijau, turun) dan rasio dengan "×" ("2,3× rata-rata").
3. **Singkatan "rb"/"jt" hanya untuk label sempit** (ujung batang, pil, sumbu). Dalam kalimat judul dan perbandingan tulis angka penuh atau "ribu"/"juta" (`dampak.js` `jt()`); pemilik menolak "rb" dalam perbandingan (13 Okt 2026).
4. **Presisi jujur:** prakiraan/probabilitas dibulatkan kasar (persen bulat atau kelas "Sangat tinggi/Tinggi/Sedang/Rendah" seperti `Kp`), bukan 0,4732. Angka kinerja model tampil dari JSON uji, tidak diketik tangan. Pecahan paling banyak 1 desimal (`fmt`), kecuali koordinat.
5. **Tiap angka punya sumber dan waktu:** kartu Insight wajib punya `Sumber: ...` di kaki (`Insight.ex`); angka "hari ini/kemarin" mengikuti hari kalender WIB data (`labelHari`), bukan jam peramban. Tidak ada tanggal ISO mentah di UI (format "14 Okt", `jamWIB`).
6. **Data kosong = "–"** (en dash, `fmt`), bukan 0, "NaN", atau "undefined". Hari tanpa data PM2.5 kolomnya dibuang (bukan "belum ada data").
7. **Judul kartu:** satu kalimat temuan dengan angka berwarna merah (`Insight.hl`), tanpa subjudul/baris satuan. Frasa kelompok wilayah: "provinsi yang sering mengalami karhutla", BUKAN "9 provinsi prioritas".
8. **Total di atas tiap bar chart**; garis rata-rata berpil navy "rata-rata"; angka di ujung batang/kolom tabel = pil.
9. Bahasa konsesi netral: "titik panas berada di dalam areal konsesi", bukan penyebab/pembakar.


## Ranjau yang pernah meledak

- **`toFixed` di teks tampil** menulis "2.3×" (titik) di halaman berbahasa Indonesia; ditemukan di `index.html` 2161, 2225, 2287, 1983 saat ilmu ini ditulis (belum dibereskan). Di mode EN `en-GB` malah benar; di ID salah.
- **BNPB campur format** (`1926.23` number vs `"22.790,83"` teks): memakai `+v` langsung menggeser angka 1000x. Selalu `angkaID()`.
- **"9 provinsi prioritas"** tersisa di `index.html` ~3535 dan ~4825 serta `title="Provinsi prioritas"` ~2227; pemilik melarang frasa ini. `dampak.js` sudah memakai "9 provinsi yang sering mengalami karhutla".
- **Singkatan "rb"** dalam perbandingan ditolak pemilik; `rb()` (index.html:3238) dan `rbk` dipakai pada pil/sumbu, bukan kalimat. `rapikanTip` menjadikan "N rb titik" pil sehingga pola teks tooltip harus tetap sesuai regex.
- **Pencabutan tulisan tanpa sumber:** catatan seperti "Ini peluang, bukan kepastian", "terbakar" di tooltip tahun, "% dari total" saat satu provinsi, subjudul "3 hari terakhir vs sebelumnya" sudah dihapus pemilik (memori fitur-disembunyikan); jangan dimunculkan lagi sebagai "perbaikan".
- **Tooltip footer "Prakiraan CAMS via Open-Meteo" dan kotak "posko" di kartu wilayah** dihapus pemilik; sumber tetap wajib ada di kaki kartu Insight, bukan di tooltip.


## Gerbang yang menghakimi

Tidak ada uji otomatis format angka; kamu adalah gerbangnya. Perintah bantu (read-only):

```
grep -nE 'toFixed\([0-9]\)' public/*.js public/index.html | grep -v ' 2\.js'     # teks tampil tanpa replace(".", ",")
grep -nE 'prioritas' public/index.html public/*.js | grep -iE '9 provinsi|Provinsi prioritas'
grep -nE '\b(NaN|undefined|null)\b' public/*.js | head                                 # bocor ke teks
grep -c 'Sumber:' public/index.html public/*.js                                          # kartu tanpa sumber
```

Vonis per berkas: `bersih`/`temuan`; catat lewat `node scripts/agents/ilmu.mjs catat selera-angka <berkas> <vonis> "<ringkas>"`. Mode EN dibuktikan `node scripts/i18n/kumpul.mjs --bahasa en` (angka EN tidak boleh bercampur "rb"/"jt" tanpa padanan). Kebenaran angka model = validasi-model, bukan kamu. Pengerja layar yang memperbaiki temuanmu: `layar-peta`.


## Kasus

- 2026-10-15 · Ilmu awal diisi dari kode `public/index.html` (fmt, jamWIB, rb, angkaID), `cerita_karhutla.js`, `operasi.js`, `dampak.js`, `i18n.js`, dan memori gaya-kartu-insight. Dicatat: `toFixed` mentah di teks tampil memakai titik desimal; sisa "9 provinsi prioritas" di index.html; "rb" ditolak pemilik dalam perbandingan.
- 2026-10-16 · Sapuan copy massal: kunci en.json dicocokkan ke teks kode dengan skrip frasa (split {n}), bukan hanya 'kunci ada'. Pola gagal: kode dihapus angka '9' tapi kunci tetap '{0} provinsi'; em dash di kunci tertinggal saat kode diganti ':'. Cara tahu: node membandingkan kunci baru terhadap code.txt.
- 2026-10-16 · Pola rb-dalam-judul lolos ke kode baru (kekeringan, gunungapi, tren): rb ditolak pemilik untuk kalimat judul, tapi modul baru menyalinnya dari dampak/rb tanpa cek. Cara tahu: grep this.ex(/Kartu.ex( yang memuat rb( di baris judul.
- 2026-10-17 · Jam tampil: berita (6 modul), aktor.js:151, dan gunungapi/app.js:16 menulis 13:20 WIB; berita.js:171 (banjir, gempa) sudah ganti ':' jadi '.'. Cek: grep 'slice(11, 16)' tanpa replace. Pemilik menghapus nama kajian sumber (17 Okt) tapi footer 'Sumber:' tetap wajib; kartu aktor tanpa kata Sumber.
- 2026-10-17 · Blok pop-up gambut (p.bara): rentang besar (67x) ditampilkan dengan angka penuh dan dua angka penting; untuk warga pakai juta/ribu dan satu angka tengah, dan sebut sumber + waktu deteksi di kaki. Cara tahu: hitung tampilan contoh data dengan node, lalu cek kolom satuan dan Sumber.
- 2026-10-17 · 2026-10-17 · Halaman laporan: sumber internal ('pemilik platform', 'status taktis dari model aturan') masuk teks sumber dari JSON, lolos karena tt() hanya mengganti dash. Cara tahu: grep kata internal di data sumber, bukan hanya di kode.
- 2026-10-17 · 2026-10-17 · Screenshot kartu laporan (c_kurva_nas, c_luasb_prov93) tidak cocok dengan kode sekarang: footer lama tampil, sel 0 padahal kode bikin '–'. Cara tahu: bandingkan teks footer dan sel dengan kode & JSON sebelum vonis. Sumber yang bocor (SP + NRT, laporan.json) sudah dihapus jadi SUMBER_MUSIM.
- 2026-10-17 · 2026-10-17 · Total pembagi di peta provinsi dihitung dari baris yang sudah difilter provinsi, sehingga 'Porsi' selalu 100%. Cara tahu: saat mode ?prov=, cek apakah pembagi berasal dari seri terfilter. Pola sama: total harus dari seri nasional, bukan seri tampil.
- 2026-10-17 · Modul cari baru menulis hitungan ke HTML mentah (${xs.length}), lolos karena kode lama memakai fmt. Cara tahu: grep '${[a-z.]*length}' di teks tampil lalu cek nilai maksimumnya dengan node (pabrik 1410 tampil '1410', bukan '1.410').
- 2026-10-18 · Label 'hari ini' dan 'prakiraan 3 hari ke depan' di banjir dipasang di kode tanpa cek tanggal data. Data status 13 Okt, dibuat 18 Okt: label salah 5 hari. Cara tahu: bandingkan hari[0] JSON dengan tanggal WIB hari ini; cek 'hari ini' hanya boleh bila hari == hari WIB ini.
- 2026-10-18 · 2026-10-18 cuaca: hujan.json.hari_ini masih 13 Okt sedangkan cuaca_riwayat berakhir 18 Okt dan laporan memberi cutoff hari ini; laporan jadi 'Data s.d. 18 Okt' padahal deret 5 hari lebih tua. Cara tahu: bandingkan hari_ini dengan tgl terakhir riwayat dan dibuat; prakiraan dibuat 13 Okt dipakai untuk kartu 'hari ini'.
- 2026-10-18 · Kosong dibaca sebagai nol: pakai '?? 0' untuk peluang tak tercatat menampilkan '0%', padahal berkas bilang tak tercatat = di bawah 10% (teks hover memakai '<10%'). Cara tahu: bandingkan fallback di isi() dan teks() dengan catatan kunci di prakiraan72.json.
- 2026-10-18 · 2026-10-18 gempa: tinggi & waktu tiba tsunami tampil sebagai angka tunggal (laci.js 'sekitar 1,2 m', sim.js 'dalam 23 menit'), sementara sim.js juga punya rentang; sebab: model dan kartu dikerjakan terpisah. Cara tahu: grep 'menit|sekitar.*m' lalu cocokkan dengan 'tinggi_lo sampai tinggi_hi'. Nol dirender '–' di tabel bukti.js (r[k] ? ... : '–'): kosong dan nol tertukar.
- 2026-10-19 · 2026-10-19 udara: dua skala kategori hidup berdampingan di satu halaman (KAT di app.js: Baik/Sedang/Tidak sehat/Sangat tidak sehat/Berbahaya; ST di murni.js: Normal/Waspada/Siaga/Awas, batas sama 55,4/150,4/250,4 tapi nama beda). Cara tahu: grep 'ST_NAMA\|const KAT' public/udara; cocokkan nama di laci kota vs laci provinsi.
