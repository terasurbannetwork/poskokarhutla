# Alur data dan pembagian beban

Halaman ini menjelaskan pembagian kerja GitHub Actions dan Worker, alur data dari sumber sampai pengguna, cache, dan status kesegaran.

## Pembagian beban: GitHub Actions menghitung, Worker melayani

Worker Cloudflare paket Free memiliki batas CPU per permintaan dan batas baca D1 per hari, sehingga hitungan berat dilakukan di luar Worker:

- Pipeline Python 3.12 (hanya pustaka standar, kecuali job lab) berjalan di GitHub Actions, menulis JSON ke `public/data`, lalu meng-commit dan menerbitkannya (`data.yml:836-839`).
- Worker hanya menyajikan aset statis, menjawab API berbasis D1 atau R2, dan menjalankan tugas ringan terjadwal.
- Pembacaan awal berkas besar dibatasi: pemeriksaan umur data hanya membaca 1 KB pertama berkas (`dibuat` selalu kunci pertama), tidak mengurai berkas penuh (`src/worker.js:525-536`). Konsesi per provinsi disajikan sebagai berkas `.ringkas.json` (sekitar 65 KB) saat difilter nama, karena berkas penuh 2 sampai 3 MB terlalu mahal diurai di Workers (`src/api_v1.js:46-49`).

## Alur data dari sumber sampai pengguna

1. Workflow data (`titik.yml`, `data.yml`, `banjir.yml`, `gempa.yml`, `lintas.yml`, `prediksi.yml`, `statis.yml`, dan seterusnya) mengambil sumber luar dan menghitung keluaran.
2. Keluaran ditulis ke `public/data` (dan `public/<modul>/data`), di-cache sebagai cache Actions bernama `data-`, dan di-commit (`git add public/data`).
3. `terbit.yml` memulihkan cache data terakhir (banjir, gunung api, citra), memeriksa bahwa data tidak lebih tua dari yang sudah tayang (`scripts/terbit/isi_data.py perlu`), menjalankan uji node, lalu `wrangler 4.42.0 deploy` (`terbit.yml:35-148`). Uji merah berarti tidak ada deploy.
4. Perubahan kode tampilan (`public/**` selain data, `src/**`, `wrangler.jsonc`, `migrations/**`) dipicu oleh `terbit_antre.yml` pada push ke `main`: workflow ini menunggu slot antre bebas lalu men-dispatch `terbit.yml`, supaya push tidak mengusir pipeline data terjadwal dari satu-satunya slot antre grup `data`.
5. Semua workflow penulis data berbagi grup `concurrency: data` dengan `cancel-in-progress: false`.

![Lima langkah dari hitung data sampai situs tayang: workflow data, commit JSON, pemeriksaan terbit.yml, wrangler deploy, Worker menyajikan; uji merah menghentikan deploy.](gambar/arsitektur-alur-terbit.svg)

Grup `data` hanya punya satu slot antre; karena itu workflow penjaga seperti `jalur-mutlak.yml`, `paritas.yml`, `graf.yml`, dan `lab.yml` sengaja di luar grup itu.

## Cache

- Aset statis: `public/_headers` memberi `/data/*` dan `/banjir/data/*` 5 menit segar dan disajikan lama sambil diperbarui (3.600 detik). JS dan CSS diberi `?v=<hash isi>` oleh `scripts/terbit/versi.py` saat terbit dan ditandai immutable; HTML `no-cache`.
- Cache tepi untuk rute GET publik di Worker (`cacheTepi`, baris 858): kunci adalah URL dengan parameter terurut, hanya jawaban 200 yang disimpan, dan pemanggilan Worker tetap terhitung, jadi yang dihemat adalah baca D1 dan CPU. `/api/status` memakai kunci tanpa query supaya `?x=acak` tidak melewati cache.
- Gerbang `gerbang-headers.test.mjs` menjaga hasil `versi.py` tetap di bawah batas 100 aturan header Cloudflare.

## Status kesegaran dan registri bencana

- Registri `public/bencana.json` adalah sumber kebenaran daftar bencana: id, status (`aktif`, `uji`, `mati`), tab halaman, `sumber_status`, dan katalog tindakan. `src/bencana.js` menurunkan rute HTML, jalur OG, `sumberStatus`, `sumberUji`, dan sitemap darinya (`src/bencana.js:36-43`). Saat ini status aktif untuk karhutla, banjir, pesisir, cuaca, gempa, udara, gunung api, dan kekeringan; longsor berstatus `mati`.
- `periksaStatus` (`src/worker.js:542`) memeriksa tiap sumber di `sumber_status` bencana aktif. Basi bila `ambang_jam` ada dan umur melebihinya atau waktu `dibuat` tidak terbaca. Sumber `uji` dilaporkan tanpa memengaruhi status. Informasi tambahan: jalur SIHKA (resmi atau cadangan), sumber sungai DSDA dan SIPANTAU, jeda per sensor satelit (M, N, N20, N21), dan jeda lintasan ke data tayang.
- Tiap jam hasilnya dicatat ke riwayat status (`status_riwayat`) dan dipakai dasbor kinerja.
- Penjaga di CI: `scripts/agents/kesegaran.py` menetapkan batas umur tiap berkas. Gerbang `gerbang-kesegaran` mewajibkan batas itu minimal selang cron sumbernya ditambah 1 jam, dan mewajibkan `titik.yml` menjalankan penjaga sebelum deploy.
