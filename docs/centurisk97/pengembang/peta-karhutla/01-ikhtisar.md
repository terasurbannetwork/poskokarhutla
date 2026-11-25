# Ikhtisar peta karhutla

Halaman ini meringkas cakupan peta utama karhutla, status kode tiap bagian, hak membuka, dan menu tab.

Peta utama karhutla adalah halaman beranda Centurisk97 (`/`) yang memantau kebakaran hutan dan lahan di seluruh Indonesia. Halaman ini menampilkan titik panas satelit, kompleks api (cluster), status penanganan tiap cluster, luas terbakar, api yang belum padam, cuaca dan asap, serta lapisan lahan, konsesi, dan fasilitas penanganan. Di atas peta ada tab untuk ringkasan pimpinan, Insight, Tren, Dampak, Posko, Simulasi, dan Metode.

Masalah yang dijawab: petugas dan pimpinan perlu tahu di mana api sedang terdeteksi, api mana yang perlu didahulukan, dan apakah cuaca mendukung penjalarannya, tanpa membaca ribuan titik koordinat mentah. Titik yang bersambung digabung menjadi satu cluster, diberi status taktis, lalu diurutkan.

Pengguna utama: staf BNPB dan Pusdalops, BPBD, Manggala Agni, instansi (TNI, Polri, pemda) yang memegang akun, dan pimpinan lewat tab Dashboard (tersembunyi dari menu, lihat [Layar peta dan laci cluster](/docs/pengembang/peta-karhutla/layar-peta)). Halaman HTML peta utama ada di balik sesi masuk (lihat bagian akses di [Layar peta dan laci cluster](/docs/pengembang/peta-karhutla/layar-peta)). Berkas data di `public/data/*.json` adalah aset statis.

Cakupan dokumen ini, dengan status kode per 24 November 2026:

| Bagian | Status |
| --- | --- |
| Peta, cluster, laci cluster, tab Insight, Tren, Dampak, Prioritas provinsi | Sudah berjalan |
| Bagian "Insiden api" di laci cluster (nama desa, bukti, riwayat petak) | Sudah berjalan |
| Pipeline arsip deteksi, perkembangan api, dan bangunan dekat api per insiden | Pipeline sudah ada; kartu di layar belum dibangun (IK-09 dan IK-10 belum dikerjakan) |
| Desa Waspada | Hanya paket dokumen di `data/kajian-bnpb/desa-waspada/`; belum ada kode |
| Alat gambar wilayah | Hanya paket dokumen di `data/kajian-bnpb/alat-gambar/`; belum ada kode |

Bagian yang belum ada kodenya ditulis sebagai rancangan dan tidak boleh dibaca sebagai fitur yang sudah tersedia.

## Akses dan hak membuka

Halaman utama `https://centurisk97.id/` termasuk halaman HTML yang terkunci: daftar halaman yang boleh dibuka tanpa sesi (`PUBLIK_TANPA_SESI`) tidak memuat `/`, dan keterangan di daftar itu menyebut peta utama tetap terkunci (`src/worker.js:758`, keterangan peta utama di baris 773; rute `/` sendiri datang dari registri bencana, `src/worker.js:722`). Pengguna masuk lewat `/admin/masuk` (staf), `/masuk` (satu nomor WhatsApp dan kode sekali pakai), atau akun instansi di `/instansi`. Peran yang persisnya diizinkan membuka `/` belum terdokumentasi di satu tempat di kode yang dibaca untuk dokumen ini. Beberapa kontrol hanya muncul untuk akun yang sudah masuk, misalnya tautan atur drone di laci cluster dan lapisan risiko eksperimental (`public/index.html:2225`, `public/index.html:7232`). Akun pemirsa bertab tertentu hanya melihat tab miliknya (`public/index.html:1770`).

Berkas data di `public/data/*.json` adalah aset statis tanpa Worker. Panel presiden agregat di `/presiden` memang dibuka tanpa sesi, tetapi itu halaman lain.

## Menu tab

Tab yang terdaftar di `public/index.html:1737` ada 19: Dashboard, Peta, Operasi, Dalops, Insight, Saham, Berita, Tren, Satelit, Cluster, Posko, Dampak, Metode, Simulasi, Monitor, Informasi, Foto, Laporan, dan Tentang. Tidak semuanya tampil di menu. Untuk akun staf dan instansi, tujuh tab disembunyikan dari menu atas atas permintaan pemilik: Dashboard (`ringkasan`), Posko, Informasi, Cluster (`kompleks`), Satelit, Tentang, dan Foto (`TAB_SEMBUNYI`, `public/index.html:1806`, sama dengan `tab_sembunyi` karhutla di `public/bencana.json`). Tab Operasi dirender dengan atribut `hidden` secara bawaan (`public/index.html:1810`). Tab yang disembunyikan tetap bisa dibuka lewat tautan langsung. Akun pemirsa memakai daftar tab miliknya sendiri (`PEMIRSA`, `public/index.html:1770`, dan `TB` di baris 1810), bukan daftar `TAB_SEMBUNYI`. Tab Tentang juga disembunyikan lewat CSS di `*.workers.dev` (`public/index.html:1375`), dan `/tentang` dialihkan ke peta di situs Centurisk97 (`src/worker.js:816` sampai `818`). Tab lama yang sudah digabung tetap bisa dibuka lewat tautan lama: Prioritas menjadi Cluster, Sarana dan Keputusan menjadi bagian Posko (`public/index.html:1739`). Tab Satelit berisi riwayat lintasan, kedatangan data, dan deteksi per satelit, tetapi tersembunyi dari menu. Di sisi kanan kepala ada pil jam data (lintasan satelit), tautan laporan harian, rincian situasi hari ini, ikon Prioritas provinsi, pengganti tema, dan tombol keluar.
