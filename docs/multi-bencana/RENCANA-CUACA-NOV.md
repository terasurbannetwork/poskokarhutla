# Rancangan pengembangan Cuaca Ekstrem, November 2026

Ditulis 1 Nov 2026 atas permintaan pemilik: "bagusin semua yang Cuaca Ekstrem, koreksi silang model dengan logbook,
ambil inspirasi dari karhutla dan banjir". Dasar: tiga audit 1 Nov (layar, data publik, uji silang logbook) dan
audit paritas 19 Okt (`bencana/cuaca.md`). Pengerja semua berkas: `cuaca-udara`. Tidak ada push atau deploy
dari sesi ini; data live dibuat GitHub Actions (`lintas.yml`) dan terbit lewat `wrangler deploy` di workflow.

## Temuan yang mengarahkan rancangan

1. **Layar tertinggal dari banjir.** Panel kiri berupa kartu bebas tanpa peringkat, laci memakai `.kpi` bukan
   ubin `.kv`, tabel provinsi Insight tidak bisa diklik, tidak ada kartu Kejadian di Insight, tidak ada gambar
   OG, tidak ada tombol buka ulang pop-up harian, tidak ada spanduk data basi. Pemisah "·" di 30-an tempat,
   kata tingkat BMKG Inggris (Moderate, Severe) tampil mentah, teks BMKG huruf kapital semua.
2. **Model belum lolos uji logbook.** Logbook Pusdalops jenis `cuaca` (12.467 baris 2013-2026) dibandingkan
   hujan ERA5 per kab-hari, latih 2016-2021, uji 2022-2025, 41 kabupaten, 59.901 hari uji, 1.122 kejadian:
   - hujan harian maksimum sel: AUC 0,603; ambang 50 mm POD 0,020, FAR 0,978, ETS 0,002;
   - klimatologi kab x bulan dari logbook: AUC 0,865, ETS 0,138 pada laju alarm yang sama;
   - persistensi (ada kejadian kemarin): ETS 0,127.
   Hujan ERA5 adalah "prakiraan sempurna", jadi angka hujan ini batas atas. Ambang embusan belum bisa diuji:
   prakiraan embusan tidak pernah diarsipkan. Arsip nowcast BMKG baru sejak 12 Okt.
3. **Data live segar**, salinan lokal sengaja basi (data tidak masuk git). Sumber BMKG menolak IP lokal (403);
   akses dari runner belum dibuktikan untuk `api.bmkg.go.id/publik`.

## Tahap 1: tampilan setara banjir (dikerjakan sekarang)

| Kode | Pekerjaan | Rujukan |
| --- | --- | --- |
| L1 | Baris panel kiri: provinsi jadi judul, jam ringkas, tingkat berwarna, kecamatan huruf biasa (selesai 1 Nov) | `cuaca/peta.js`, `cuaca/cuaca.css` |
| L2 | Ubin laci `kot()` jadi `.kv` Oyenza; grid menyesuaikan jumlah ubin | `inti/peta.css:141`, `banjir/peta.js` |
| L3 | Hapus semua "·"; kata tingkat BMKG lewat `SEV_ID`; teks BMKG lewat `hurufJudul`; buang label ganda | audit layar 2.1-2.4 |
| L4 | Tabel provinsi Insight bisa diklik ke peta; kartu Kejadian di Insight | `banjir/insight.js:39,350` |
| L5 | Gambar OG cuaca, tombol buka ulang pop-up harian, spanduk data basi, Tentang disembunyikan seperti banjir | `banjir/index.html` |
| L6 | Pil lokal diganti kelas inti (`.pl`), `.toast` lokal dibuang | `inti/insight.css:41` |
| L7 | Kunci i18n EN untuk label khusus cuaca | `i18n/en.json` |

## Tahap 2: jujur terhadap logbook (dikerjakan sekarang)

| Kode | Pekerjaan |
| --- | --- |
| M1 | `scripts/cuaca/uji_logbook.py`: uji hujan vs logbook kab-hari dengan pembagian waktu terkunci dan pembanding klimatologi + persistensi; keluaran `public/banjir/data/cuaca_uji_logbook.json`. Cache ERA5 hanya di mesin lokal, jadi berkas hasilnya dibekukan dan dicatat tanggalnya |
| M2 | Kartu Insight "Seberapa tepat" menampilkan AUC hujan vs klimatologi dan ETS ambang 50 mm apa adanya; pil "hipotesis" pada tingkat hujan dan embusan tetap sampai lolos |
| M3 | `verifikasi.py` menambah pembanding klimatologi dan persistensi; `kartuBukti` tidak lagi menampilkan POD tanpa FAR dan pembanding |
| M4 | Arsip prospektif append-only: prakiraan hujan + embusan per kab dan Status kecamatan per hari (pola `banjir` prospektif), supaya embusan bisa diuji 6-12 bulan lagi |
| M5 | Lapisan dan kartu "Langganan cuaca ekstrem bulan ini": peluang dasar kab x bulan dari logbook (prediktor terkuat yang sudah teruji, AUC 0,865), dengan catatan bahwa ia juga mencerminkan kebiasaan lapor |

## Tahap 3: data publik baru (dikerjakan sekarang bila lolos swa-uji)

| Kode | Sumber | Guna |
| --- | --- | --- |
| D1 | JMA `www.jma.go.jp/bosai/typhoon/data/targetTc.json` | silang cek lintasan dan kekuatan siklon JTWC |
| D2 | METAR `aviationweather.gov/api/data/metar` bandara Indonesia | embusan, hujan, jarak pandang teramati: verifikasi angin + lapisan observasi |
| D3 | RainViewer radar komposit (dengan atribusi) | lapisan radar 2 jam terakhir di peta, bukan data resmi |

## Tahap 4: perlu keputusan pemilik (tidak dikerjakan)

1. Uji akses `api.bmkg.go.id/publik/prakiraan-cuaca` dari runner (prakiraan resmi per desa) lewat langkah percobaan di workflow.
2. Akun NASA Earthdata gratis untuk IMERG (hujan satelit 30 menit) sebagai pengganti ERA5 dalam uji.
3. Logbook belum memisahkan puting beliung, angin kencang, hujan es; tanpa subjenis, uji per bahaya tidak mungkin.
4. Posko cuaca (laporan lapangan) seperti banjir.
5. Panel kiri jadi tabel provinsi bertingkat (provinsi ke kab ke kecamatan) seperti banjir: butuh `cuaca_kec` per kab.

## Bukti siap

- `node --check` semua `public/cuaca/*.js`; `python3 scripts/cuaca/<skrip>.py uji` untuk tiap skrip baru.
- `npm run uji:agen` hijau.
- Tangkapan layar 1440 dan 375 px halaman `/cuaca/` dengan data live.
- Pemeriksa konteks bersih: `selera-angka`, `inp-reviewer`, `validasi-model`.
