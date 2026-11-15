# DESAIN-TEKNIS: 3W dan tawaran

## Berkas

| Berkas | Isi | Pengerja |
| --- | --- | --- |
| `src/tiga_w.js` | Rute register organisasi, 3W, tawaran, token; `RUTE_TIGAW` digabung ke `RUTE_SIKLUS` | warga-api |
| `src/siklus.js` | Gabung `RUTE_TIGAW` ke `RUTE_SIKLUS` (pola `:id` KJ- dan kamus izin `LOLOS` yang sudah ada) | warga-api |
| `src/worker.js` | `HTML_RUTE` bantu -> bantu.html, entri `PUBLIK_TANPA_SESI` beralasan untuk `/bantu`, rute `/api/bantu` di tabel `RUTE` (berpintu token, bukan tamu bebas) | warga-api |
| `public/_headers` | Periksa blok CSP untuk `/bantu` terhadap `tests/agen/gerbang-headers.test.mjs` | warga-api |
| `src/hak.js` bagian TigaW | SQL | warga-api |
| `public/siklus/tiga_w.js` | Kartu Siapa di mana dan Tawaran di halaman kejadian | siklus |
| `public/bantu.html`, `public/bantu.js` | Halaman organisasi bertoken | layar-peta |
| `public/inti/klaster.js` | Konstanta delapan klaster (dipakai juga `public/fungsi_direktori.js`) | inti-layar |

## D1

Nomor migrasi diambil saat tiket. Semua `CREATE ... IF NOT EXISTS`, waktu ms. Tanpa kolom `dummy` (data dummy pensiun 11 Nov 2026).

| Tabel | Kolom pokok |
| --- | --- |
| `org` | id 16 hex, nama, singkatan, jenis CHECK (kl, tni, polri, ngo_nasional, ngo_internasional, dunia_usaha, kampus, pmi, pbb_regional, lainnya), negara (ISO2, wajib bila internasional), institusi_id (opsional, FK institusi), dibuat, oleh |
| `tw_baris` | id, kejadian_id FK sk_kejadian, kab4, klaster CHECK delapan, org_id FK org, kegiatan (5-200), status CHECK (rencana, berjalan, selesai), mulai, selesai, sumber CHECK (staf, token), diubah, oleh |
| `tw_token` | id, org_id, kejadian_id, token_sha UNIQUE, dibuat, cabut |
| `tw_tawaran` | id, kejadian_id, org_id, barang, barang_lain, jumlah, satuan, syarat, mitra_lokal_org_id, status CHECK (masuk, dicocokkan, diterima, dialihkan, ditolak), alasan_internal (staf saja), alasan_organisasi (tampil ke organisasi), kebutuhan JSON (rujukan meja/logpal), diubah |
| `tw_tawaran_riwayat` | append-only: id, tawaran_id, kejadian_id FK sk_kejadian, status, alasan_internal, alasan_organisasi, oleh, dibuat |

Indeks: `tw_baris (kejadian_id, kab4, klaster)`, `tw_tawaran (kejadian_id, status)`, `tw_token (token_sha)`. Barang meja logistik ada di JSON `meja_catatan.data`, jadi TW-02 membuat indeks ekspresi sendiri `meja_catatan (meja, prov, kab, json_extract(data, '$.barang')) WHERE meja = 'logistik'` dan pencocokan diuji EXPLAIN (tidak bergantung pada paket Lifeline).

## Rute

| Rute | Hak |
| --- | --- |
| `GET/POST /api/siklus/kejadian/:id/tiga-w` | staf (tulis: pusdalops, koordalops; baca: juga pimpinan); BPBD baca kab wilayahnya lewat `/api/instansi/siklus/kejadian/:id/tiga-w` dengan izin `BP` |
| `GET/POST /api/siklus/kejadian/:id/tawaran` | sama; keputusan sesuai Q1 |
| `POST /api/siklus/kejadian/:id/tiga-w/token` | pusdalops (Q6) |
| `GET/POST /api/siklus/org` | staf (di bawah awalan siklus supaya dilayani `layaniSk`) |
| `GET/POST /api/bantu` (header `x-bantu` token) | organisasi pemegang token, hanya baris miliknya; didaftarkan di `src/worker.js`, bukan di `RUTE_SIKLUS` |
