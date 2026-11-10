# RISET: Silang Sumber

Hanya yang diperiksa di repo ini pada 10 Nov 2026. Metode statistik pada bagian 3 adalah metode lazim; kutipan lengkapnya diperiksa agent saat tiket yang memakainya dikerjakan.

## 1. Bukti data nyata 10 Nov 2026

| No | Temuan | Berkas | Dipakai oleh |
| --- | --- | --- | --- |
| B1 | Status H-1 Centurisk97 lawan DIBI: POD 6,5%, FAR 59%, CSI 0,06. Alasan rapor sumber perlu ada: tanpa skor, tidak ada yang tahu sumber mana layak dipercaya. | `public/banjir/data/cuaca_verifikasi.json` | F1, F3 |
| B2 | SYNOP MOS untuk hujan: CSI 0,11, vonis GAGAL. | `public/banjir/data/cuaca_verif_synop.json` | F1 |
| B3 | Teks kondisi BMKG 10 hari per kabupaten tidak memuat "hujan lebat" dari 5.150 baris, padahal prakiraan sepekan BMKG pada hari yang sama menulis Awas untuk Sumatera Utara. Teks 10 hari bukan sinyal bahaya; skor sumber ini dinilai sebagai informasi, bukan peringatan. | `public/banjir/data/cuaca_bmkg_kab10.json`, `cuaca_sepekan.json` | F1, F3 |
| B4 | Gelombang BMKG lebih tinggi daripada model: median 0,5 m di 91 perairan, 0,1 m di 342 pelabuhan, untuk satu hari. Contoh beda sumber yang nyata. | `public/banjir/data/cuaca_gelombang.json`, `cuaca_maritim.json` | F3 |
| B5 | Tsunami 15 Agu 2026: magnitudo diperbarui dari 7,0 ke 7,7 dan zona peringatan dari 2 ke 22 dalam 12 menit. Lima kejadian arsip memuat 60 zona unik. Nama zona berbentuk seperti "MANGGARAI BAGIAN UTARA" dan "KOTA-BITUNG". Tinggi terukur maksimum 0,94 m. | `public/gempa/data/inatews_tsunami.json` | F2 |
| B6 | Narasi gempa InaTEWS: 32 narasi, mekanisme terbaca pada 31, susulan pada 20. | `public/gempa/data/inatews_detail_*.json` | F5 |
| B7 | Katalog gempa InaTEWS dibaca append-only karena BMKG menyimpan sekitar 3 bulan; berisi 885 baris pada 10 Nov 2026. | `public/gempa/data/inatews_katalog.json` | F5 |

## 2. Skema berkas yang dibaca (dari berkas)

| Berkas | Bentuk | Catatan |
| --- | --- | --- |
| `cuaca_verifikasi.json` | `{dibuat, bmkg:{mulai, n_peringatan, kejadian, nasional:{a,b,c,n,pod,far,csi}, prov:{}, n_min:30, dinilai_sampai, catatan}, kita:{...}}` | Pola yang diperluas F1: a, b, c, n_min 30, tanggal "dinilai sampai", catatan telat lapor DIBI. |
| `inatews_tsunami.json` | `{dibuat, sumber, kejadian:{<id>:{id, buletin[], t, lat, lon, area, m}}}`; tiap buletin punya `zona` berupa baris `[provinsi, nama zona, tingkat, epoch]`, `judul` (memuat pengukuran muka air dan jam), `peta`, `instruksi`, `terbit` | Pengukuran muka air tertanam di teks `judul`; diurai oleh SS-12. |
| `inatews_katalog.json` | `{dibuat, sumber, catatan, kolom:[id,t,lat,lon,m,dalam,tempat,status,fokal], baris:[...]}` | Waktu epoch detik UTC. |
| `riwayat_grid.json` | USGS M >= 4,5 tahun 2000 sampai 2025, sel 0,1 derajat | Bukan katalog kecil: M < 4,5 tidak ada. |
| `laju.json` | USGS M >= 5, 1990 sampai 2025, declustering Gardner-Knopoff | Sudah memakai Poisson. |
| `public/data/bnpb/dibi_kab_tahun.json` | baris = kabupaten x tahun x kelompok jenis | Resolusi tahunan, tidak bulanan. Untuk bulan F6 memakai `dibi_kejadian.json` dan logbook. |
| `public/prediksi/data/kalender_risiko.json` | per kabupaten x jenis: `ada[12]`, `n[12]`, `p[12]`, `kecil` dari logbook tahun penuh | Sudah ada; milik prediksi (KEPUTUSAN D7). |
| `public/banjir/data/iklim_bmkg.json` dan `iklim_bmkg_arsip.json` | narasi prakiraan bulanan dan dasarian per kabupaten | Kode kabupaten di berkas ini bukan Kepmendagri; cocokkan lewat nama (temuan yang sama dengan `data/kajian-bnpb/tangga/RISET.md`). |
| `scripts/umum/nama_wilayah.py` | `nk()` menormalkan nama kabupaten | Dipakai F6 dan F2 untuk pencocokan nama; jangan mengimpor `scripts/prediksi/dasar.py`. |

## 3. Metode lazim untuk F1 dan F5

| Metode | Dipakai untuk | Catatan |
| --- | --- | --- |
| Tabel kontingensi a, b, c, d; POD, FAR, CSI, ETS | F1 | ETS mengoreksi hit yang terjadi karena kebetulan. Rumus ada di ALGORITMA. |
| Magnitudo kelengkapan Mc dengan metode maximum curvature | F5 | Katalog gempa kecil tidak lengkap di bawah Mc; laju dihitung hanya M >= Mc. |
| Hubungan Gutenberg-Richter, nilai b | F5 | Memeriksa apakah Mc yang dipilih masuk akal. |
| Peluang ekor Poisson terhadap baseline | F5 | Statistik kejutan; dikoreksi untuk banyaknya sel yang diperiksa. |
| Declustering gempa susulan | F5 | Sudah ada contoh Gardner-Knopoff di `laju.json`; gempa beruntun justru yang dicari, jadi declustering hanya untuk baseline. |

## 4. Yang belum ada di repo

Peta waktu tiba tsunami hanya berupa gambar BMKG (`peta.ttmap`). Daftar sesar aktif dengan segmen tidak ada. Katalog gempa kecil panjang dari BMKG tidak ada (Q1). Tinggi tsunami terukur per stasiun ada hanya sebagai teks buletin.
