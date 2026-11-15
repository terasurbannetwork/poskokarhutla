# ALGORITMA: 3W dan tawaran

## 1. Celah

Untuk kejadian K dan kab k di `sk_kejadian_kab(K)`: klaster c adalah celah bila tidak ada baris 3W (K, k, c) berstatus berjalan. Klaster yang ditampilkan sebagai celah hanya yang ditandai relevan untuk jenis kejadian (tabel konstanta jenis x klaster, bawaan semua klaster relevan kecuali pendidikan untuk kejadian kurang dari 3 hari).

## 2. Tumpang tindih

(K, k, c) tumpang tindih bila jumlah organisasi berbeda berstatus berjalan lebih dari ambang Q4 (HIPOTESIS 3).

## 3. Pencocokan tawaran

Untuk tawaran t (barang b, jumlah j) di kejadian K:
1. Kandidat = baris meja logistik dengan barang b, status diminta atau disetujui, kab di `sk_kejadian_kab(K)`, tanggal sesudah mulai K; ditambah `logpal_permintaan` dengan item b di kab yang sama.
2. Urutan: paling lama menunggu dulu, lalu sisa kebutuhan terbesar.
3. Tidak ada pembagian otomatis; staf memilih.

Barang "lainnya" tidak dicocokkan otomatis.

## 4. Nama kab

Meja dan LogPal menyimpan prov + nama kab; dipetakan ke kab4 dengan `kab4Dari` (`src/siklus_kab.js`). Tidak terpetakan = tidak muncul sebagai kandidat, dihitung di catatan.

## 5. Token

Token acak 32 byte, base64url; disimpan sha-256; satu token per (organisasi, kejadian); dicabut = baris token ditandai cabut, bukan dihapus.
