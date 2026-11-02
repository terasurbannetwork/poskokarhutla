# ALUR: Pegawai dan Relawan Lapangan

Alur ujung ke ujung tiap peran. Kode F-* merujuk `PRD.md` §4.

## A1. Pegawai masuk ke sistem (sekali)

1. Super Admin mengunggah CSV Biro SDM (F-02): nama, NIP, unit, jabatan, WA, email. Pratinjau menunjukkan baris baru,
   baris berubah, baris ditolak (NIP ganda, WA tidak sah). Simpan.
2. Tiap baris jadi `orang` jenis `pegawai`, tertaut ke `staf` bila NIP sama.
3. Sistem membuat kode pribadi (F-03). Super Admin menekan "Kirim tautan": bot WA mengirim `centurisk97.id/petugas#k=<kode>`
   ke WA pegawai, atau tautan disalin bila WA kosong.

## A2. Relawan masuk ke sistem

1. Relawan mendaftar di modul relawan yang sudah ada; diverifikasi kampus atau admin.
2. Saat status jadi `diverifikasi`, dibuat baris `orang` jenis `relawan` tertaut ke `relawan.id`; kode pribadi relawan yang
   sudah ada dipakai (tidak dibuat kode kedua).

## A3. Daftar wajah (sekali per orang, bisa diulang)

1. Buka tautan. Layar Persetujuan (F-04): teks singkat apa yang disimpan, untuk apa, berapa lama, cara menghapus. Setuju.
2. Kamera depan menyala. Panduan bergiliran: **hadap depan, toleh kiri, toleh kanan, angkat dagu, tunduk** (F-05).
   Tiap arah: lingkaran pemandu, panah arah, centang hijau saat sudut tercapai dan stabil (ALGORITMA §2).
3. Tiap arah menghasilkan satu vektor wajah. Foto acuan hanya dari arah depan.
4. Kirim. Server memeriksa lima vektor saling cocok (orang yang sama) dan mutu cukup. Lolos: status wajah `terdaftar`.
   Gagal: pesan arah mana yang diulang.

## A4. Tugas lapangan dibuat

1. Peninjau atau ketua regu membuat tugas (F-06): judul, bencana, titik (klik peta atau tempel koordinat Renlap),
   radius (bawaan 2 km untuk lapangan, 300 m untuk posko), mulai dan selesai, anggota.
2. Bot WA mengirim pesan penugasan beserta tautan Renlap ke tiap anggota (F-14).

## A5. Absen masuk (tiap hari tugas)

1. Petugas buka tautan, pilih tugas hari ini (otomatis bila hanya satu), tekan "Absen masuk".
2. Server memberi nonce sekali pakai berumur 5 menit dan satu tantangan acak (kedip, toleh kiri, toleh kanan).
3. HP mengambil tiga sampel GPS (jeda 1 detik) sambil kamera depan memindai wajah dan meminta tantangan.
4. Sesudah tantangan lolos, HP membuat vektor wajah dan foto berstempel (F-08), lalu mengirim: nonce, vektor, skor
   anti-spoof, hasil tantangan, sampel GPS, zona waktu, waktu HP, foto.
5. Server: cek nonce, hitung kemiripan dengan lima vektor terdaftar, `nilaiGps`, jarak ke titik tugas, selisih waktu,
   sha256 foto unik. Hasil: **lolos otomatis** atau **tinjau** dengan alasan (ALGORITMA §5).
6. Layar menampilkan hasil dan jam server. Tanpa sinyal: tersimpan di antrean (F-10), terkirim saat ada sinyal, ditandai
   `luring`.
7. Relawan: absen lolos atau disahkan membuka sesi `relawan_jam` (F-15).

## A6. Logbook harian

1. Kapan saja hari itu, petugas mengisi logbook (F-09): kegiatan (pilih jenis + teks), hasil, kendala, kebutuhan, foto
   bergeotag berstempel (1 sampai 6).
2. Untuk tugas karhutla: kondisi titik (menyala, bara, padam, bukan api), tebal gambut, jarak ke air, akses. Untuk banjir:
   tinggi genangan, pengungsi. Isian terstruktur ini jadi label (F-16).
3. Simpan. Bisa disunting sampai 23.59 WIB hari itu; sesudahnya terkunci.

## A7. Absen pulang

Sama dengan A5, jenis `pulang`. Relawan: sesi `relawan_jam` ditutup, menit dihitung.

## A8. Tinjauan

1. Peninjau membuka antrean (F-11): tiap baris memuat foto berstempel, foto acuan depan, skor, alasan, peta titik.
2. Putus: **sah** atau **tolak**, catatan wajib bila tolak. Keputusan tercatat dengan nama peninjau.

## A9. Panel pimpinan (F-12)

Peta personel hari ini (titik absen per tugas), angka hadir, belum absen, belum mengisi logbook, antrean tinjauan, dan
pengisian logbook Dirdalops. Klik nama: riwayat absen dan logbook orang itu.

## A10. Panggilan relawan (F-13)

1. Peninjau membuat panggilan: tugas, keahlian, kab/prov, kuota, batas balas.
2. Sistem memilih relawan `siap_tugas` yang cocok (urut jarak domisili), memasukkan ke antrean kirim.
3. Gateway WA di Mac mini menarik antrean tiap menit dan mengirim lewat limiter.
4. Relawan membalas `SIAP <kode>` atau `TIDAK <kode>`. Balasan SIAP sampai kuota: relawan masuk anggota tugas,
   dikirimi tautan dan Renlap (A4 langkah 2). Sisanya diberi tahu kuota penuh.

## A11. Keluar dan hapus data wajah

Orang yang keluar atau mencabut persetujuan: vektor dan foto acuan dihapus, absen lama tetap dengan foto berstempel
(bukti kehadiran) tanpa vektor. Relawan yang mencabut diri: mengikuti anonimisasi modul relawan.
