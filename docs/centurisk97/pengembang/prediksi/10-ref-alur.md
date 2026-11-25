# Referensi: workflow, keluaran, uji

Halaman ini mendaftar workflow, jadwal, berkas keluaran, dan uji modul Prediksi.

## Workflow dan jadwal

| Workflow | Jadwal | Pekerjaan |
| --- | --- | --- |
| `.github/workflows/prediksi.yml` | `50 1 * * *` UTC (08.50 WIB), setelah `banjir.yml` | Uji mandiri delapan skrip; tarik `status.json`, `rob.json`, `hujan_ansambel.json`, `prakiraan72.json`, `fwi_ansambel.json`, `hotspot.json`, dan `prakiraan.json` udara dari situs live; `catat`, `nilai`, `kalibrasi`, `koreksi`, `terbit`, `dampak`; giliran jalan (maksimal 15 kab per hari, batas 25 menit, boleh gagal) yang lebih dulu menjalankan `tangga.py`; commit hanya `public/prediksi/data`. `PIPA_TOKEN` kosong atau ditolak membuat konfirmasi dilewati dengan log |
| `.github/workflows/data.yml` | harian | Membangun `kalender_risiko.json` (`data.yml:614`) |
| `scripts/agents/kesegaran.py` | lewat penjaga kesegaran | `prediksi.json` dijaga dengan batas umur 30 jam (`kesegaran.py:38`) |

Belum terdokumentasi di kode: pemicu terjadwal untuk `musim_rawan.py` dan `nilai.py ujibalik`.

## Berkas keluaran di `public/prediksi/data`

`prediksi.json`, `lalu.json`, `lengas.json`, `skor.json`, `pasangan.json`, `ujibalik.json` (bila dijalankan), `kalibrasi.json`, `kalibrasi_aktif.json`, `koreksi_riwayat.jsonl`, `tangga.json`, `tangga_arsip/YYYY-MM.jsonl`, `arsip/YYYY-MM.jsonl`, `amatan/<KODE>.json` (HJN, API, KRH, konfirmasi), `bayangan/hujan_harian.json`, `kalender_risiko.json`, `musim_rawan.json`, `dampak.json`, `jalan.json`.

## Uji dan gerbang

| Perintah | Membuktikan |
| --- | --- |
| `npm run uji:prediksi` (menjalankan `node --test --test-concurrency=1 tests/prediksi/*.test.mjs`) | `catat`, `nilai`, `kalibrasi`, `terbit`, `kalender`, `koreksi`, `dampak`, `jalan` `uji` lulus; invarian arsip dan `prediksi.json` (514 kab, peluang 0 sampai 1, menurun menurut ambang); fungsi murni level sel dan pil; halaman memakai inti bukan salinan; `tangga.py uji`, sinyal terhitung ulang cocok dengan `r`, tanpa kata terlarang di keluaran; fungsi murni laporan provinsi |
| `python3 scripts/prediksi/<catat, nilai, kalibrasi, koreksi, terbit, tangga, dampak, jalan, konfirmasi>.py uji` | Self-check tanpa jaringan tiap skrip |
| `python3 scripts/prediksi/bayangan/model.py uji` | Fitur model bayangan cocok dengan skrip lab, 514 kab terpetakan |
| `node --test tests/warga/prediksi_konfirmasi.test.mjs` | Rute konfirmasi pada Worker utuh dengan D1 lokal |
| `npm run uji:agen` | Gerbang repo: kartu standar (`tests/agen/gerbang-kartu-std.test.mjs`), dasbor (`gerbang-dasbor.test.mjs`), kesegaran (`gerbang-kesegaran.test.mjs`), tanpa branch, token warna, agen dan ilmu |
| Tinjau di `http://localhost:8800/prediksi` | Tampilan, klik tab, peta, tanpa galat konsol (server tinjau lokal) |
