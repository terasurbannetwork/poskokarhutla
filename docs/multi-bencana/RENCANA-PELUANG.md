# Rencana peluang & outlook lintas bencana (dari bedah emisi.app, 19 Okt 2026)

Pemilik minta semua pola terbaik emisi.app ("Oyen Asap") diterapkan ke seluruh bencana. Yang dibawa adalah
cara kerjanya, bukan tampilannya (maskot, ilustrasi AI, dan tab "Rangkaian" tidak ditiru).

## Pola yang dibawa

| Kode | Pola | Bentuk di kita |
| --- | --- | --- |
| P1 | Peluang lewat ambang + rentang p10–p90, bukan satu angka | `scripts/umum/peluang.py` → `public/<id>/data/peluang.json` (kontrak `peluang/1`) |
| P2 | Kalimat vonis satu baris di atas angka | `peluang.vonis()`; ditulis ke berkas, layar tinggal menampilkan |
| P3 | Bobot skenario dicocokkan ke alat ukur (ESS) | `peluang.bobot_obs()`; dipakai modul yang punya alat ukur (udara: WAQI, banjir: pos duga bila terjangkau) |
| P4 | Telusur asal: "dari mana" dalam persen | udara: lintasan mundur per kota → provinsi/kompleks/konsesi; banjir: hujan hulu per DAS (fase 2) |
| P5 | Buang deteksi palsu dari sumber statis | karhutla: titik panas industri, suar migas, PLTU, kawah gunung api |
| P6 | Outlook iklim: rumus hujan Niño × Dipol 45 tahun + tahun pembanding | `scripts/umum/iklim_outlook.py` → `public/data/iklim_outlook.json` |
| P7 | Tabel bahaya 12 bulan lintas bencana + kombinasi berantai berpreseden | `scripts/umum/outlook12.py` → `public/data/outlook12.json`, DARI DATA (frekuensi kejadian historis di tahun pembanding), bukan aturan karangan |
| P8 | Kalender pasang astronomi (siklus nodal 18,6 tahun, jendela pasang tertinggi) | `scripts/banjir/pasang_astro.py` → `public/banjir/data/pasang_astro.json` |
| P9 | Laju kejadian jujur untuk bahaya yang tak bisa diramal | gempa: peluang M6+/M7+ dangkal 12 bulan per wilayah dari katalog |
| P10 | Kurva kumulatif tahun ini vs tahun parah pada minggu yang sama | karhutla (titik/luas), banjir (kejadian) |
| P11 | Bagian "Batasan" + uji balik tampil di layar | medan `batasan` wajib di kontrak; `uji_balik` bila ada |
| P12 | Skenario sebagai titik yang bisa diklik + panel kesehatan sumber | komponen `public/inti/peluang.js` (fase 2) |

## Pembagian kerja fase 1 (data; berkas tidak bertumpuk)

| Pengerja | Berkas | Keluaran |
| --- | --- | --- |
| `pipa-umum` | `scripts/umum/iklim_outlook.py`, `scripts/umum/outlook12.py` | P6, P7 |
| `banjir` | `scripts/banjir/peluang_banjir.py`, `scripts/banjir/pasang_astro.py` | P1/P2 banjir (hujan 15 hari per kab), P8 |
| `gempa` | `scripts/gempa/peluang_gempa.py` | P9 + strip susulan dalam kontrak peluang/1 |
| `gunungapi-kering` | `scripts/gunungapi/peluang_abu.py`, `scripts/kekeringan/peluang_kering.py` | abu: peluang abu di bandara/kota dari anggota angin; kekeringan: peluang hari kering/SPI |
| `cuaca-udara` | `scripts/cuaca/peluang_cuaca.py`, `scripts/udara/peluang_udara.py`, `scripts/udara/asal.py` | cuaca: angin/hujan/panas; udara: peluang status PM2,5 + P3 + P4 |
| `pipa-data` | `scripts/data/titik_palsu.py`, `scripts/data/peluang_karhutla.py`, `scripts/data/kumulatif.py` | P5, P1 karhutla dari `fwi_ansambel.json`, P10 |

Aturan semua pengerja: tidak menyunting `.github/workflows/**` (sesi induk yang merangkai), tidak commit,
tiap skrip punya `uji` luring, angka tanpa sumber tidak dikarang, batasan ditulis jujur.

## Fase 2 (layar) dan fase 3

- `inti-layar`: `public/inti/peluang.js` + css: strip peluang (batang per hari, % di atas batang, pil ambang),
  kalimat vonis, rentang, daftar batasan; titik skenario bila berkas memuat anggota. Dipasang di tab Insight tiap bencana.
- `/semua`: kartu outlook iklim + tabel bahaya 12 bulan + kombinasi berantai.
- Fase 3: laporan kejadian otomatis (pola "Makalah"), telusur hulu banjir per DAS.

## Fase 3 (19 Okt 2026): selesai

| Bagian | Berkas | Keluaran | Jadwal |
| --- | --- | --- | --- |
| Telusur hulu per DAS | `scripts/banjir/bukti_das.py subdas` (manual, butuh zip HydroBASINS) lalu `scripts/banjir/hulu.py` | `public/banjir/data/bukti/<slug>.json` medan `subdas`; `public/banjir/data/hulu.json` (kontrak `hulu/1`) | `hulu.py` dipanggil `laporan_banjir.py` di `banjir.yml` harian |
| Laporan kejadian | `scripts/umum/laporan_kejadian.py` (mesin `laporan.py` v1 + medan opsional `fokus`) | `public/{banjir,udara}/data/kejadian/<modul>-<kode>.json` + `index.json` (`kejadian/1`) | banjir dan cuaca lewat `laporan_banjir.py`; udara lewat `scripts/udara/jalan.py` |
| Layar | `public/kejadian.html` (mesin `public/inti/laporan.js`), kartu "Telusur hulu" di Insight banjir, kartu "Laporan kejadian" di `/semua` | | |

Persen hulu = bagian volume hujan (mm x km² irisan sub-DAS dengan sel 0,25 derajat), bukan debit. Laporan kejadian hanya
merakit angka yang sudah terbit di modul (kronologi, asal, uji balik, jiwa) dan menulis bagian Batasan. Belum memicu laporan:
gempa, gunung api, kekeringan, karhutla (belum ada status Siaga per kab/kota di `laporan.json` modulnya).
