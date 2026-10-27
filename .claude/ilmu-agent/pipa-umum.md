# Ilmu pipa-umum

> Kelas: pengerja · Model: sonnet · Definisi: `.claude/agents/pipa-umum.md`
> Dibaca SEBELUM kerja (`node scripts/agents/ilmu.mjs baca pipa-umum`). Kasus baru
> ditambah SESUDAH kerja lewat `node scripts/agents/ilmu.mjs kasus pipa-umum "..."`.

## Peta berkas & tabel

Wilayah: `scripts/umum/**`. Per 16 Okt 2026 folder BELUM ADA; lahir di FASE-0 tahap B. Bacaan wajib: `docs/multi-bencana/ARSITEKTUR.md` §5.2 (tabel modul + asal), `FASE-0.md` B0-B7, `MODUL-PLUG-AND-PLAY.md` §5.

Modul rencana dan asalnya: `jaring.py` (ambil/retry/batas laju, dari `scripts/banjir/umum.py`), `simpan.py` (`simpan_json`, `dibuat` kunci pertama), `waktu.py`, `wilayah.py` (satukan `scripts/data/wilayah.py` dan `scripts/banjir/wilayah.py`, dua salinan identik; `PRIORITAS` karhutla tetap di `scripts/data/`), `bencana.py` (baca `public/bencana.json`, `folder_data(id)`, subperintah `daftar` dan `js`), `uji.py` (kerangka self-check), `status.py`, `riwayat.py`, `posko.py`, `ujibalik.py`, `prospektif.py`, `berita.py` (leksikon disuntik per bencana), `penduduk.py`, `inarisk.py`, `dibi.py`, `og.py`, `cek_sumber.py` (B0).

Data lintas bencana pindah ke `public/data/umum/` (`peringatan.json`, `pusat_kec.json`, `iklim.json`, `inarisk_kec.json`, `kejadian_dibi.json`).

Batas pemilik:
- `scripts/data/**` (`pipa-data`), `scripts/banjir/**` (`banjir`), `scripts/sebaran/**` (`model-sebaran`): sumber pindahan. Penggantian pembungkus impor satu baris di sana dikerjakan pemiliknya atau lewat serah-terima orkestrator; kamu tidak menyunting diam-diam.
- `.github/workflows/**` termasuk `_pipa.yml`, `cek-sumber.yml`: `mekanik-mesin`.
- `scripts/og/**` tetap `layar-peta` sampai `og.py` pindah.

## Aturan & invarian

- Python 3.12 stdlib saja; tidak ada `pip install` di Actions.
- Pemindahan = keluaran JSON identik byte demi byte (uji pembanding) sebelum/sesudah; lama jadi pembungkus, dihapus setelah semua impor diganti.
- `grep -r "def Poligon"` hanya satu hasil sesudah B1.
- Kunci `"dibuat"` pertama di tiap JSON (dibaca `/api/status`).
- Tiap modul punya `uji` (`python3 scripts/umum/<m>.py uji`) yang dipanggil workflow sebagai langkah inti.
- Tidak ada logika khas satu bencana; yang khas disuntik dari `scripts/<id>/`.
- Kuota Open-Meteo dibagi semua bencana (600/menit, 5.000/jam, 10.000/hari); modul baru menghitung dampaknya.

## Ranjau yang pernah meledak

- Dua salinan `wilayah.py` identik (data dan banjir) menyimpang bila disunting sebelah.
- Open-Meteo kirim JSON rusak (banjir diulang 10 menit); `jaring.ambil` harus tahan itu.
- Kuota habis (`KuotaHabis`) harus dipropagasi, bukan ditelan.

## Gerbang yang menghakimi

`python3 scripts/umum/<m>.py uji`, uji pembanding byte-identik, `npm run uji:agen`. Pemeriksa: `validasi-model` bila rumus status/riwayat/uji balik berubah.

## Kasus
- 2026-10-16 · Bukti identik berita karhutla: bandingkan main(ambil_rss=False) lama vs baru pada arsip.json nyata dengan waktu dibekukan; field validasi.lembaga.ci95 berubah antar-jalan bahkan lama-vs-lama (bootstrap tak berbenih), abaikan. Berkas scripts/umum/berita.py dan scripts/data/berita.py sama-sama bernama berita: muat lewat importlib dengan nama unik (umum_berita), jangan sys.path.
- 2026-10-16 · sosmed.py: berita.muat dan karhutla._muat berbagi nama modul umum_berita lewat sys.modules; muat umum_berita dulu dengan nama itu supaya tak dobel. pusat.json karhutla ada di data/raw/berita/ (tanpa subfolder id), bukan data/raw/berita/<id>/ seperti default jalankan(). Tes paritas: olah_ringan(judul=teks, ringkas='') harus sama dengan label sosmed.
- 2026-10-19 · 2026-10-19 · dibi.bnpb.go.id timeout dari sandbox (data.bnpb.go.id, IRI, PSL jalan). outlook12 butuh cache data/raw/iklim/dibi_bulanan.json (ditulis sendiri bila DIBI terjangkau di Actions); tanpa itu jatuh ke klimatologi riwayat.json + berantai 3 tahun. IRI CHIRPS: hanya data.tsv (satu angka per baris, urut waktu) yang jalan; potong 5 tahun per permintaan; jumlah sel pakai bulan tetap (Jan 2000), 'T/last' bisa NaN.
- 2026-10-19 · 2026-10-19 · Lift berantai terhadap acak seragam menipu untuk bahaya musiman (banjir/longsor tampak berantai). Pembanding harus permutasi di dalam bulan yang sama; setelah koreksi semua pasangan di data 3 tahun lift ~1 dan daftar tampil kosong. Skill analog dihitung per bulan, bukan dipool (karhutla pool 0,43 tapi hanya 6/12 bulan positif).
- 2026-10-19 · kejadian.py: pilihan 'terbesar' dari himpunan (max atas set) tanpa tie-break kunci membuat keluaran berbeda antar-jalan (PYTHONHASHSEED): selalu max(key=(nilai, kunci)). Kode kejadian dicocokkan ke registri kejadian_<id>_nomor.json (anggota+pusat+jenis), bukan ke _awal; anggota calon yang identik antar uji dengan jarak berbeda lolos sebagai 'sama' (uji jarak harus pakai anggota beda). Geo kabupaten dibulatkan 2 desimal: kekeringan 1,2 MB, udara 0,4 MB (dimuat malas). peringatan.json basi (>1 hari) = CAP tak dianggap aktif.
- 2026-10-19 · 2026-10-19 · video: kuota YouTube dihitung di uji() (search=100 unit); karhutla 3.600 + 6 bencana x 600 = ~7.340/hari. Jaga jeda 20 jam supaya dispatch ulang tak melipatkan kuota. 'rob' perlu batas kata (robot).
- 2026-10-20 · Open Buildings v3: pakai ubin S2 level 6 (CSV tanpa header, 3.330 ubin; Indonesia 278 ubin 12,7 GB) bukan level 4 (satu ubin sampai 5,9 GB, memuat negara tetangga). Kolom: lat,lon,area,confidence,WKT,pluscode; WKT tak perlu diurai (split(b',',4)). Urai 600 rb baris/dtk; WAKTU = unduh (jaringan sandbox 0,1-0,5 MB/s: Kalteng 440 MB = 25 mnt). Token S2 dihitung sendiri (token_s2) dan divalidasi: semua token Indonesia ada di daftar bucket. Dict berisi pembagian per sumbu meledak di lat 0 (z=0): pakai lambda.
- 2026-10-21 · Geo.cari: nama kab yang sekaligus kata umum (Padang) tak boleh masuk KAB_LEMAH mentah-mentah; pakai penolak konteks BLOK_SESUDAH/BLOK_SEBELUM. Kota/kab kembar satu provinsi (Solok) ditandai e=2: provinsi saja, kab tidak ditebak; 'Kabupaten X' eksplisit memilih non-Kota. 'Medan Utara' bukan kecamatan di geo repo (hasil kab Kota Medan benar). Frasa kec yang berawalan nama kabnya (Medan Barat, Seruyan Hilir) eksplisit, tapi jangan tambah entri kec (k,False) kedua: kunci sama dua kali dianggap ambigu. Ukur baru-vs-lama dengan menyalin berita.py HEAD ke scratchpad dan mengganti AKAR (bukan sed BSD).
- 2026-10-21 · Regex leksikon berita tanpa \b meloloskan 'merapat'=rapat dan 'meninggalkan'=meninggal; pakai K() (batas kata) dan tulis imbuhan eksplisit. Peringatan_berita.py untracked: salinan 'sebelum' harus disimpan dari berkas keluaran sebelum diubah. Sufiks media di judul dipotong di Geo.potong_media kecuali bagian itu nama wilayah utuh ('- Medan'). Ukur: sampel acak 40 entri dinilai manual, bukan hanya uji.
- 2026-10-22 · 2026-10-22 TikTok: tagar pencarian (karhutla dkk) wajib dibuang dari teks klasifikasi; nama akun media ('Metro TV') dibuang dari teks geocode atau jadi Kota Metro; tagar huruf kecil tersambung dipecah lewat frasa Geo >= 7 huruf. Kebijakan pejabat (Prabowo menegaskan menindak) masih lolos sebagai kejadian dan jatuh ke DKI Jakarta.
- 2026-10-22 · tugas.py: gempa G#### hanya di D1 (tak ada berkas statis); adaptor mengambil /api/gempa/terbaru (GEMPA_API, atau --gempa berkas) dan menghitung jiwa_mmi6 dari scripts/gempa/guncangan.py x penduduk.json; skala tingkat disamakan src/peringatan.js (CAP Severe=Siaga, Extreme=Awas, Moderate tak jadi tugas). Uji lokal berkas kejadian_* basi (>2 hari) = tugas tidak ditulis; periksa dengan --akar ke salinan data live di scratchpad. 404 berkas kejadian live biasanya hanya karena lintas.yml belum berhasil jalan sejak langkahnya ditambah, cek curl dulu sebelum menyunting skrip.
- 2026-10-27 · 2026-10-27 bangunan.py grid halus: hasil per ubin kini memuat 'halus' (cache lama tanpa kunci itu diurai ulang, butuh CSV lagi); halus_<prov>.json 110 m = 3,8 MB (Kalsel 1,85 jt bangunan), 5,3 MB (Sumbar 2,1 jt), 20,7 MB (Jateng 17,6 jt) JSON polos, cukup tanpa biner. kec.json DITIMPA tiap jalan dengan provinsi jalan itu saja (jalankan --prov 63,33,13 sekali bila mau kec.json gabungan). public/geo/kecamatan/13.json punya fitur kab/kec=None (danau) yang dulu menabrak '|'.join: kini dianggap tak terpetakan. bangunan_di(prov,kotak|titik) memuat berkas ke memori (tembolok per proses).
