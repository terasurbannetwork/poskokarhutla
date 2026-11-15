# PRD: Pembiayaan risiko per kejadian

## Tujuan

Untuk tiap kejadian yang punya permohonan DSP atau Jitupasna (Q5), staf pembiayaan dan pimpinan melihat dua sisi berdampingan: kerugian (resmi, atau perkiraan bila ada model terbukti) dan dana (realisasi DSP dari sistem, saldo DSP dan PFB dari input staf), masing-masing dengan tingkat keyakinan, sumber, dan tanggalnya.

## Pengguna

| Peran | Kebutuhan |
| --- | --- |
| Staf pembiayaan (BNPB) | Memasukkan saldo DSP/PFB bersumber; mencatat skema parametrik; membaca perbandingan. |
| Pimpinan | Membaca perbandingan per kejadian tanpa harus bertanya. |
| Pusdalops | Melihat status DSP dan kerugian yang sama dengan meja dan `/siklus`. |

## Fitur

| Kode | Fitur | Keputusan |
| --- | --- | --- |
| F-1 | Kartu "Kerugian" per kejadian: nilai Jitupasna (kerusakan, kerugian) dengan tingkat keyakinan harga; "belum ada angka resmi" bila belum. | D2, D3 |
| F-2 | Kartu "Perkiraan awal" hanya bila satu model lulus pra-registrasi dan uji balik; rentang bawah, tengah, atas, berlabel hipotesis sampai lulus. | D2, D3, Q3 |
| F-3 | Kartu "Dana" dari realisasi meja DSP per kejadian (diajukan, disetujui, cair, realisasi). | D4 |
| F-4 | Form staf saldo DSP/PFB: nilai, tanggal data, sumber (teks), bukan angka 0 bila belum diisi. | D4, Q1, Q2 |
| F-5 | Pembandingan dua baris berdampingan dengan selisih dan keyakinan; tanpa vonis. | D5 |
| F-6 | Catatan skema parametrik (nama, penerbit, pemicu, bayaran, masa berlaku) dan pemantau yang membandingkan kejadian dengan pemicu tertulis. | D6, Q4 |
| F-7 | Ringkasan di `/bnpb/dalops` untuk staf. | Q5 |
| F-8 | Tabel di Laporan Berkala. | Q6 |

## Larangan

- Tidak ada angka kerugian rupiah tanpa sumber: Jitupasna atau model terdaftar yang lulus uji balik.
- Tidak ada saldo yang tampil 0 bila belum diisi.
- Tidak ada pemicu parametrik yang tidak tertulis di polis yang dicatat staf.
- Tidak ada kata "cukup", "kurang", "aman" sebagai vonis; tidak ada skor gabungan.
- Tidak ada data uang di `public/`, tidak publik, tidak di PDF yang dibagikan keluar.
- Tidak ada buku kejadian kedua (D1).
