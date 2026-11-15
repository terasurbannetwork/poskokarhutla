# ALUR: 3W dan tawaran

## A1. Organisasi hadir

1. Staf membuka kartu 3W kejadian, mencari organisasi di register; bila belum ada, membuat baru (nama, jenis, negara asal untuk internasional).
2. Staf mengisi baris 3W (kab, klaster, kegiatan, status) atau membuat tautan bertoken untuk organisasi itu (Q6) lalu mengirim tautannya sendiri lewat saluran apa pun.
3. Organisasi membuka tautan, melihat kejadian dan barisnya sendiri, menambah atau memperbarui baris 3W.

## A2. Peta 3W

1. Kartu menghitung per (kab, klaster) jumlah organisasi berstatus berjalan.
2. Kab terdampak (dari `sk_kejadian_kab`) dengan 0 di klaster yang relevan ditandai celah; lebih dari ambang (Q4) ditandai tumpang tindih.

## A3. Tawaran

1. Organisasi (lewat tautan) atau staf mencatat tawaran: barang, jumlah, satuan, syarat, mitra lokal (wajib untuk NGO internasional, Q2).
2. Sistem menampilkan kebutuhan cocok (D6) diurutkan dari yang paling lama menunggu.
3. Staf berhak memilih: diterima (dengan kebutuhan yang dipenuhi), dialihkan (ke kab atau kebutuhan lain, alasan wajib), ditolak (alasan wajib).
4. Riwayat tercatat; organisasi melihat status dan alasannya lewat tautannya.

## A4. Tutup

Kejadian selesai: tautan token berhenti berlaku; 3W dan tawaran menjadi baca-saja.
