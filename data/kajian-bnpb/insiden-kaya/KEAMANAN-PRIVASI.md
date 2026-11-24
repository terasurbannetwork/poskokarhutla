# KEAMANAN-PRIVASI: Insiden Kaya

K2 membolehkan angka bangunan dekat api tampil publik per insiden. Paket ini menjaga agar yang publik hanya angka, tidak pernah letak bangunan.

## 1. Data dan sensitivitasnya

| Data | Sensitivitas | Tempat | Publik? |
| ---- | ------------ | ------ | ------- |
| Petak api, isokron, lompatan | rendah: turunan titik panas yang sudah publik | `public/data/progresi/` | ya |
| Perkiraan titik awal | sedang: bisa jatuh di lahan konsesi atau lahan warga, bisa dibaca sebagai penunjuk sebab | `public/data/progresi/` | ya, dengan aturan §4 (Q3) |
| Jumlah dan luas atap bangunan dalam 500 m | sedang: agregat per insiden, dibulatkan | `public/data/insiden_bangunan.json` | ya (K2) |
| Sel halus 110 m berikut jumlah bangunan | tinggi: sel di dekat insiden dapat menunjuk satu rumah | `data/terkunci/insiden/` | **tidak** |
| Koordinat bangunan tunggal | tinggi | tidak pernah dibuat di paket ini | tidak |
| Arsip deteksi per insiden | rendah, tetapi besar | cache `data-`, `public/data/progresi/arsip/` (di `.gitignore`) | tidak (tidak boleh terbit; `public/.assetsignore` belum memuatnya, IK-01) |

## 2. Aturan keras

1. **Tanpa koordinat bangunan tunggal** di berkas apa pun, publik atau terkunci. Open Buildings sendiri hanya dibaca per sel halus 110 m yang sudah dikumpulkan `bangunan.py`; paket ini tidak membaca poligon bangunan.
2. **Tanpa kunci rinci di berkas publik.** `insiden_bangunan.json` tidak memuat `sel`, `kec`, `desa`, `lat`, `lon`, `i`, `j`. Gerbang (RENCANA-UJI §5) menolak kunci itu.
3. **Rincian sel tidak dilayani Worker.** Tidak ada rute `/api/...` yang membaca `data/terkunci/insiden/`. Bila pemilik kelak meminta tampilan staf, itu paket baru dengan paket dokumennya sendiri.
4. **Pembulatan** (Q6, bawaan): di bawah 5 tampil "kurang dari 5", 5 ke atas ke kelipatan 5, luas atap ke 100 m². Nilai mentah tidak masuk berkas publik. Tujuan: mencegah identifikasi satu rumah dan mencegah selisih antarhari yang membuka sel.
5. **Angka kecil dekat titik publik.** Lingkaran 500 m tidak digambar bila angka yang tampil "kurang dari 5" atau petak segar < 5 [SEMENTARA, Q6; rumusan lama hanya menyebut petak < 5 dan membuat kasus 1 sampai 4 bangunan dengan banyak petak tak terjawab].
6. **Tanpa penghuni, tanpa jiwa, tanpa nama.** Bangunan bukan jiwa dan bukan orang; kartu tidak menulis "warga terdampak" atau "korban".
7. **Titik awal tanpa atribusi** (D8, Q3): tidak menyebut pemilik lahan, konsesi, desa, atau kata sebab dan pelaku; lingkaran berjari-jari galat. Kunci `desa` dan `nama` insiden (desa yang memuat titik panas terbanyak, `insiden.py`) menamai insiden, bukan titik awal; kartu tidak boleh menempelkannya pada titik awal atau menyiratkan desa itu tempat api mulai. Hubungan titik awal dengan konsesi (atribusi di modul asap) tidak dipakai di paket ini. Bila pemilik menjawab Q3 "hanya di balik sesi", berkas publik tidak memuat `titik_awal`.
8. **Tidak pernah menulis "aman"**; nol bangunan tidak berarti tidak ada bangunan (komisi dan omisi Open Buildings tidak dikoreksi).
9. **Atribusi lisensi**: Open Buildings CC BY 4.0 (Q8); MIT pembanding di kepala kode.
10. **Rahasia tidak masuk berkas yang dilacak git.** Tarik mundur Q1 tidak memakai kunci FIRMS (sumbernya `titik_hari` di repo); bila kelak memakainya, kunci hanya di secret Actions.
11. **Rincian terkunci tidak ikut unggah R2.** `bangunan.yml` mengunggah `data/terkunci/bangunan/*.json`; `data/terkunci/insiden/` harus tetap di luar glob itu (gerbang RENCANA-UJI §5 butir 7a).

## 3. Ancaman dan penangkal

| Ancaman | Penangkal |
| ------- | --------- |
| Pembaca menyimpulkan lokasi rumah dari lingkaran 500 m dan angka kecil | aturan 4 dan 5; lingkaran digambar di sekitar petak api (yang sudah publik) bukan di bangunan |
| Selisih angka antarhari mengungkap sel baru | pembulatan ke 5; angka hanya diperbarui harian |
| Berkas terkunci terbit tidak sengaja | `data/terkunci/` ada di `.gitignore`; gerbang memeriksa `public/` tak memuat `sel_halus`; `higiene-repo` sebelum commit besar |
| Klaim sebab dari titik awal | aturan 7; gerbang teks menolak kata "penyebab", "pelaku", "sumber api" di berkas kartu |
| Pembaca mengira "belum tercakup" berarti 0 | `null` + `alasan`, bukan 0 (gerbang) |
| XSS lewat data | kartu menyisipkan angka dan tanggal lewat `textContent`; tidak ada `innerHTML` dari berkas JSON (AGENTS `security-reviewer`) |
| Beban baca berlebih ke D1 | tidak ada D1 di paket ini; berkas statis |

## 4. Titik awal: aturan tampil (Q3)

Bawaan [SEMENTARA]: tampil publik sebagai lingkaran dengan jari-jari = `radius_m` (≥ 375 m), label "perkiraan titik awal terdeteksi", `title` menjelaskan bahwa satelit melihat api sesudah menyala dan titik ini bukan penentu sebab. Pemeriksa `security-reviewer` dan `selera-angka` menilai teksnya. Bila pemilik memilih "hanya di balik sesi", kunci `titik_awal` dikeluarkan dari berkas publik dan hanya tampil di layar staf (paket terpisah).

## 5. Retensi

- `public/data/progresi/<id>.json` mengikuti `SIMPAN_HARI` insiden (14 hari sesudah `tak_terdeteksi` atau `gabung`), lalu dihapus.
- Arsip deteksi di cache ikut dipangkas yang sama.
- `insiden_bangunan.json` hanya memuat insiden yang masih ada di `insiden.json`.
- Rincian terkunci dihapus bersama insiden-nya sesudah `SIMPAN_HARI`.

## 6. Periksa sebelum terbit

`security-reviewer`: grep kunci terlarang di `public/data/insiden_bangunan.json` dan `public/data/progresi/*.json`; ukuran; tidak ada rute baru. `guard-api`: tidak diperlukan (tidak ada rute). `selera-angka`: bentuk angka, pembulatan, tanpa kata terlarang.
