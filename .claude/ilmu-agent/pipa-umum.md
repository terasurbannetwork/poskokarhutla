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
