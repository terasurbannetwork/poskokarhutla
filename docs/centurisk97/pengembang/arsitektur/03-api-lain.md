# Titik waktu nyata, MCP, Atom, status

Halaman ini mendokumentasikan titik panas hampir waktu nyata, data mitra berkunci, server MCP, feed Atom, status kesegaran, serta kode galat dan batas laju.

## Titik panas hampir waktu nyata (`/api/titik`) dan sumber status lain

Akses: publik, `GET`.

| Jalur | Isi | Cache tepi |
| --- | --- | --- |
| `/api/titik` | Putaran titik panas terakhir dari D1 (`titik_terbaru`), format sama dengan `hotspot.json`; 404 bila belum ada putaran | 600 detik |
| `/api/himawari` | Titik Himawari dari R2 (diunggah `himawari.yml`); kosong bila belum ada | 300 detik |
| `/api/satelit/jeda` | Ringkasan jeda lintasan satelit ke data tampil, 30 hari; tanpa parameter | 6 jam |
| `/api/status` | Umur data per sumber; 200 bila segar, 503 bila ada sumber kunci yang basi | 60 detik |
| `/api/gempa/*`, `/api/cuaca/*`, `/api/gunungapi/*`, `/api/banjir/*`, `/api/peringatan/*` | Katalog gempa, nowcast BMKG, level gunung api, sungai terukur, peringatan dini | per modul |
| `/sitemap.xml` | Peta situs dari registri bencana | 1 jam |
| `/api/publik?r=` (`24j`, `7h`, `30h`, atau `semua`) | Statistik pengunjung publik (manusia, asisten AI, perayap) | 60 detik |

## Data mitra berkunci

Akses: perlu header `X-API-Key` dengan kunci berbentuk `pb_` diikuti 64 karakter heksadesimal. Kunci di query string tidak dibaca supaya tidak tercatat di log. Satu kunci hanya membuka cakupan yang diberikan padanya.

Cara memperoleh kunci: hubungi admin. Penerbitan kunci hanya oleh Super Admin lewat halaman `/admin/kunci-api`; moderator ke atas dapat melihat daftar dan mencabut (`src/api_v1.js:174-200`). Kunci tampil sekali saat diterbitkan, dan yang tersimpan hanya hash-nya. Kunci berlaku 365 hari; sesudahnya dijawab 401 seperti kunci yang dicabut.

| Endpoint | Cakupan | Isi |
| --- | --- | --- |
| `GET /api/v1/rumah-rusak` | `rumah_rusak` | Laporan rumah rusak berat, sedang, ringan berstatus sah; terbaru dulu; tanpa data pelapor, foto, dan catatan; koordinat dibulatkan 4 desimal (sekitar 11 m). Parameter: `bencana`, `prov`, `kab`, `dari`, `sampai`, `bbox` |
| `GET /api/v1/rumah-rusak/rekap` | `rumah_rusak` | Jumlah berat, sedang, ringan per kecamatan (maksimal 1.000 baris) dan per kabupaten/kota; rentang paling lama 366 hari |
| `GET /api/v1/bangunan/terpapar` | `bangunan` | Ringkasan nasional bangunan Google Open Buildings yang terpapar bahaya aktif |
| `GET /api/v1/bangunan/kec` | `bangunan` | Paparan bangunan per kecamatan |
| `GET /api/v1/bangunan/grid?prov=62` | `bangunan` | Paparan per sel grid satu provinsi (`prov` wajib) |
| `GET /api/v1/laporan-bnpb?jenis=harian` | `laporan_bnpb` | Laporan Harian dan Paparan Presiden BNPB; tanpa `tanggal` berupa daftar tanggal, dengan `tanggal=YYYY-MM-DD` berupa isi |
| `GET /api/v1/konsesi?prov=62&nama=...` | `konsesi` | Perusahaan pemegang konsesi satu provinsi beserta titik panas di dalamnya; `nama` menyaring potongan nama PT |

Simpan kunci di server Anda, jangan di JavaScript peramban. Bila bocor, minta admin mencabutnya.

Contoh dari server Node.js:

```js
const r = await fetch("https://centurisk97.id/api/v1/rumah-rusak?prov=62&dari=2026-10-01", {
  headers: {"X-API-Key": process.env.CENTURISK_API_KEY},
});
if (!r.ok) throw new Error("galat " + r.status);
const {jumlah, laporan} = await r.json();
```

## Server MCP untuk asisten AI (`/mcp`)

Akses: alamat `https://centurisk97.id/mcp`, transport Streamable HTTP tanpa sesi (tiap `POST` JSON-RPC 2.0 berdiri sendiri; `GET` dijawab 405). Tool publik tersedia tanpa kunci, dengan batas 600 permintaan per jam per jaringan. Tool berkunci hanya muncul di `tools/list` bila header `X-API-Key` yang sah dikirim.

Pasang di klien MCP jenis HTTP:

```json
{
  "mcpServers": {
    "centurisk97": {
      "url": "https://centurisk97.id/mcp",
      "headers": {"X-API-Key": "pb_GANTI_DENGAN_KUNCI_ANDA"}
    }
  }
}
```

Tanpa kunci, hapus bagian `headers`.

Tool publik (`src/mcp.js:201-219`): `titik_api_terkini` (24 atau 72 jam, urut FRP, saring `prov` dan `kab`, `limit` sampai 200), `status_kabupaten`, `laporan_harian`, `kualitas_udara`, `peringatan_aktif`, `daftar_wilayah`, `riwayat_lokasi`, `cari_peraturan_bnpb`, `baca_peraturan_bnpb`, `relasi_peraturan_bnpb`, dan `kejadian_resmi` (hanya kejadian yang sudah dipublikasikan Koordalops, tanpa paparan rinci dan tanpa nama korban). Tool berkunci: `rumah_rusak` dan `rumah_rusak_rekap` (cakupan `rumah_rusak`), `bangunan_terpapar` (`bangunan`), `konsesi_perusahaan` (`konsesi`), `laporan_bnpb` (`laporan_bnpb`).

Hal yang sering disalahpahami:

- Hasil lebih dari 24.000 karakter dikembalikan sebagai galat tool dengan saran memperkecil `limit` atau menyempitkan filter, bukan sebagai badan raksasa (`src/mcp.js:20`).
- Panggilan dari halaman web di localhost atau jaringan privat ditolak (perlindungan DNS rebinding). Klien non-peramban seperti `curl` tidak terpengaruh.
- Server belum memakai OAuth, jadi klien yang hanya menerima alamat tanpa header hanya mendapat tool publik.
- Pasal peraturan yang dijawab tool hukum harus dikutip dengan label pasal dan id dokumen. Dokumen bertanda `resmi=0` adalah salinan tidak resmi; periksa sumber resmi di `jdih.bnpb.go.id`.

## Feed Atom peringatan

Akses: publik. Tersedia feed `nasional.xml` dan satu feed per provinsi di `/data/feeds/<provinsi>.xml`, serta `/data/feeds/index.json` sebagai daftarnya. Feed dibuat oleh `data.yml` sesudah kluster, peluang, dan prakiraan udara dihitung (`.github/workflows/data.yml:291`). Gunakan pembaca feed biasa untuk berlangganan.

## Membaca status kesegaran data (`/api/status`)

1. Buka `https://centurisk97.id/api/status`.
2. `ok: true` (HTTP 200) berarti semua sumber kunci masih dalam ambangnya. `ok: false` (HTTP 503) berarti ada sumber di daftar `basi`.
3. Tiap sumber memuat `dibuat`, `umur_jam`, dan `ambang_jam`. `ambang_jam: null` berarti hanya dilaporkan, tidak pernah membuat status merah. Bagian `uji` memuat sumber bencana berstatus uji, juga tidak pernah membuat status merah.
4. Sumber yang `dibuat`-nya tidak terbaca dianggap basi bila punya ambang. Jadi "tidak diketahui" tidak pernah tampil sebagai segar.

Ambang saat ini dibaca dari registri (`public/bencana.json`, kunci `sumber_status`). Contoh: karhutla titik 8 jam, berita 30 jam, Himawari 3 jam; gempa terbaru 0,5 jam; nowcast cuaca 2 jam; kualitas udara 18 jam.

## Kode galat dan batas laju API

| Kode | Arti |
| --- | --- |
| 400 | Parameter tidak sah; pesan menyebut yang salah |
| 401 | Header kunci tidak ada, salah, dicabut, atau lewat 365 hari |
| 403 | Kunci sah tetapi cakupannya tidak termasuk endpoint ini |
| 404 | Rute atau nama data tidak ada, atau berkas belum tersedia |
| 405 | Metode selain `GET`, `HEAD`, `OPTIONS` |
| 429 | Batas laju terlewati; tunggu sebanyak header `Retry-After` |
| 503 | Layanan belum tersedia atau data kunci basi (`/api/status`) |

Batas laju: data publik tidak dihitung per kunci; riwayat titik 600 per jam per jaringan; data berkunci 1.000 per jam per kunci; MCP tanpa kunci 600 per jam per jaringan; lebih dari 300 kunci salah per jam dari satu jaringan menutup jaringan itu selama sejam.
