# Ilmu gempa

> Kelas: pengerja · Model: sonnet · Definisi: `.claude/agents/gempa.md`
> Dibaca SEBELUM kerja (`node scripts/agents/ilmu.mjs baca gempa`). Kasus baru
> ditambah SESUDAH kerja lewat `node scripts/agents/ilmu.mjs kasus gempa "..."`.

## Peta berkas & tabel

Wilayahmu: `scripts/gempa/**` dan `public/gempa/**` (belum ada kode per 16 Okt 2026; semua masih RENCANA di `docs/multi-bencana/RINCI-GEMPA.md`, langkah G1-G10). Bacaan: RINCI-GEMPA (sumber, kosakata, kartu Insight), `bencana/gempa.md` (registry, aturan tingkat, model, uji balik), `COPYWRITING.md` §5 (kolom gempa), `RENCANA-20-JAM.md` §1 (A1-A25), `PELATIHAN-MODEL.md`.

Pembagian kerja (jangan dilanggar):
- Data hidup masuk lewat cron Worker `* * * * *` (`CRON_GEMPA`) ke D1 (`migrations/0010_gempa.sql`, `src/gempa.js`, `/api/gempa/*`): MILIK `warga-api`. Kamu hanya mengonsumsinya dari layar.
- Pipa Python milikmu hanya tiga: riwayat USGS sejak 1900 (`scripts/gempa/riwayat.py` -> `public/gempa/data/riwayat_m5.json`, `riwayat_prov.json`), risiko riwayat, berita (menumpang `scripts/data/berita.py`, milik pipa-data). Tidak ada `gempa.yml`: token tak bisa mendorong workflow.
- Keluaran yang di-commit: `public/gempa/data/`. Keluaran yang ditulis CI: `public/data/` (mis. `berita_gempa.json`), karena `titik.yml`/`data.yml` hanya melindungi dua folder itu saat terbit.
- Layar mengikuti kerangka `public/inti/` dan banjir L1; JANGAN menyalin mesin kartu dari `public/index.html` (gerbang `tanpa-salin`). Sampai P1 selesai, layar gempa hanya stub.
- Tab tampil: Peta, Insight, Tren, Berita, Dampak, Foto, Tentang. Disembunyikan (A24, dibuat tapi tersembunyi): Simulasi, Posko, Informasi, Metode (wajib ada), Ringkasan. Tren tanpa kalender musim (gempa tidak bermusim).
- Model: guncangan = GMPE + GMICE (Worden 2012 / Wald 1999) per pusat kecamatan (7.274 titik), koreksi residu GBDT kecil; susulan = Reasenberg-Jones (a -1,67; b 0,91; p 1,08; c 0,05 hari) dikalibrasi MLE Indonesia; kejadian G = gempa utama M>=5 + susulan (Gardner-Knopoff / Reasenberg), tampil 72 jam (7 hari bila M>=6,5). Uji balik: latih 2008-2019, validasi 2020-2022, uji 2023-2026 dibuka SEKALI. Prospektif append-only.

## Aturan & invarian

- Dua kosakata terpisah, jangan dicampur: (A) status resmi tsunami (BMKG `Potensi` + PTWC; pita teratas, selalu bersumber + jam terbit; tidak pernah diturunkan atau ditafsirkan ulang oleh kode kita) dan (B) "Tingkat Pantau Bencana" (Normal/Waspada/Siaga/Awas per kabupaten, 72 jam, pelengkap). Kata Awas/Siaga/Waspada tak boleh muncul tanpa label sumbernya.
- `Potensi` bukan hanya soal tsunami: memuat "tidak berpotensi tsunami" = kode 0; "berpotensi tsunami" tanpa "tidak" = 1-3 menurut kata Waspada/Siaga/Awas, tanpa tingkat = 1; selain itu `null` ditampilkan "BMKG tidak menyebut tsunami", TIDAK PERNAH "aman".
- Tidak meramal gempa utama, dan Metode menulisnya tegas. Peluang tampil sebagai angka langsung ("86%") tanpa kalimat basa-basi (A17).
- Model: uji dibuka sekali; tiap model punya pembanding sederhana dan tidak terbit bila kalah di validasi; uji kesetaraan Python-JS; fitur yang tak ada di peramban tak dipakai model peramban; ambang tabel `gempa.md` §4 hanya hipotesis, ditetapkan dari uji balik. Ubah model = panggil `validasi-model`.
- Kosakata kelas MMI I-XII (pil satu rona, bukan pelangi), kedalaman dangkal <60 / menengah 60-300 / dalam >300 km, format "M 5,7" koma desimal, "kedalaman 10 km", waktu "12 Okt 04.34 WIB". Pakai "pusat gempa" bukan "episentrum", "susulan" bukan "aftershock".
- Aturan pemilik tampilan (RENCANA-20-JAM §1): A1 tanpa teks penjelas/subjudul; A2 sebaris; A3 label = pil berwarna + ikon; A4 kartu ala Insight (pil, kalimat temuan berangka merah, grafik, kaki legenda + "Sumber:", bagikan ikon); A8 angka tertulis di grafik; A10 tabel standar (kepala gelap, urut, paginasi); A15 bahasa awam; A17 peluang jujur; A18 data kosong dibuang; A19 bagikan = ikon; A24 disembunyikan bukan dihapus (catat di memori `fitur-disembunyikan`); A25 sapaan "kamu", em dash DILARANG di teks tampil, ikon SVG garis.
- Judul kartu Insight: angka + satuan + kata kerja + tempat + jendela waktu, angka disorot `hl`; cacah kecil di awal kalimat dieja ("Tidak ada", "Satu"). Kosong = kartu dibuang kecuali kalimat "Tidak ada ...".
- Python 3.12 stdlib saja, tanpa pip; UA peramban penuh pada semua fetch BMKG.
- Selalu tulis berkas tampilan hanya di `public/gempa/**`; apa pun di luar itu lapor pemiliknya (`ilmu.mjs pemilik`).

## Ranjau yang pernah meledak

- `autogempa.json` BUKAN "M5+ terbaru": satu objek gempa terbaru berapa pun besarnya (16 Okt 2026: M 2,5 Bogor). `gempaterkini` baru M>=5 (larik 15). `gempadirasakan` tanpa `Potensi`/`Shakemap`.
- `Magnitude` dan `Kedalaman` adalah TEKS ("2.5", "9 km"). Pakai `DateTime` (ISO) dan `Coordinates` ("lat,lon" bertanda), bukan `Tanggal`/`Jam`/`Lintang`/`Bujur`.
- `Dirasakan` beragam: daftar ("III Darajat, III Pasirwangi"), rentang ("II - III Kab. Manggarai"), tunggal. Penguraian toleran; rentang ambil nilai tertinggi.
- Tidak ada ID di BMKG; kunci alami `DateTime|Coordinates`. Gabung dengan USGS bila selisih <=90 detik dan <=100 km.
- Kotak USGS Indonesia juga menjaring Filipina selatan, Timor Leste, PNG barat: saring ke Indonesia.
- Banyak gempa besar di laut: `cariWilayah` menolak titik jauh dari pusat kecamatan (8 km). Pakai `wilayahTerdekat` (batas 300 km, selebihnya teks `Wilayah` BMKG apa adanya).
- BMKG hanya menyimpan 15 butir `Dirasakan`; arsip D1 yang menjadi bahan uji balik. Tiap hari Worker mati = data uji hilang selamanya.
- Shakemap: pakai `https://cdn.bmkg.go.id/<Shakemap>`, `static.bmkg.go.id` 301.
- SUMBER-DATA mencatat UA `curl` 403, nyatanya 200 hari ini dari Mac; dari egress Cloudflare belum teruji. Jangan mengirim UA pendek.
- Berkas `public/gempa/data/` tak ikut terbit kecuali di-commit; keluaran CI harus ke `public/data/`.
- Ikon menu gempa "Coming Soon" dan `status: "mati"` di `public/bencana.json` milik warga-api/registry; jangan menyalakan `aktif` tanpa kata pemilik.

## Gerbang yang menghakimi

- `python3 scripts/gempa/<skrip>.py uji` untuk tiap skrip pipa (self-check `__main__`), pola `scripts/banjir`.
- `npm run uji:agen` (gerbang pemilik: tiap berkas tepat satu pemilik; gerbang `tanpa-salin`; gerbang model bila ada `public/**/data/model_*.json`: wajib `kinerja_uji`, `dibuat`, `catatan`, pasangan `scripts/**/uji_js*.py`, berkas prospektif).
- `npm run bencana:cek` bila menyentuh registry (milik warga-api).
- Layar: buktikan di browser preview pada lebar 1440 dan 390; panggil `selera-angka` (angka/kartu), `inp-reviewer` (klik/geser peta), `validasi-model` (model/ambang).
- Kamu tidak memverifikasi kerjamu sendiri (AGENTS.md §3.2); tidak commit, tidak push, tidak menyunting `.github/workflows`.

## Kasus
- 2026-10-16 · Rencana RINCI-GEMPA (16 Okt 2026) menyebut autogempa.json 'M5+ terbaru' di SUMBER-DATA padahal nyatanya gempa terbaru berapa pun besarnya (hari itu M 2,5), dan Potensi bisa tanpa kata tsunami. Sebab: dokumen sumber tak diuji ke respons live. Akibat: filter M>=5 salah dan 'tidak berpotensi tsunami' bisa tertulis untuk teks yang diam soal tsunami. Cara tahu: curl BMKG autogempa/gempaterkini lalu cek Magnitude dan Potensi; Potensi tanpa kata tsunami harus null.
- 2026-10-16 · 2026-10-16 G4/G5: place USGS 'X km of Kota, Timor Leste/Philippines/PNG' tetap jatuh di darat Indonesia untuk pulau perbatasan (Leti, Talaud, Sangihe, Jayapura), jadi penyaring memutuskan dari poligon kecamatan dulu, baru teks place. InaRISK getSamples sering 522/525 beruntun: ulang blok gagal dalam putaran. INDEKS_BAHAYA_TSUNAMI hanya bernilai di piksel pesisir sempit (39 dari 7274 pusat kecamatan) jadi dibuang sesuai A18. Jumlah USGS M>=4,5 sejak 2000 di kotak = 28134 (bukan 26004 di SUMBER-DATA). Cara tahu: riwayat.py periksa.
