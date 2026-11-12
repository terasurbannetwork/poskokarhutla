# ALGORITMA: Log tindak lanjut Usulan langkah

## 1. Kunci langkah

`kunci = "banjir|" + kab_kode + "|" + jenis`, dengan `kab_kode = "<2 digit prov>|<nama kab>"` dari `H.mitigasi()`, dan `jenis` dari awalan teks langkah:

| Awalan teks | jenis |
| --- | --- |
| `Posko ` | posko |
| `Siapkan evakuasi ` | evakuasi |
| `Pantau lereng ` | lereng |
| `Penuhi kebutuhan: ` | kebutuhan |
| `Atasi kendala: ` | kendala |
| `Konfirmasi status surut ke BPBD, ` | konfirmasi |
| `Tuntaskan pendataan dampak` | pendataan |
| `Pantauan khusus: ` | pantau |
| selain itu | lanjut |

Validasi Worker: `^banjir\|\d{2}\|[^|]{1,80}\|(posko|evakuasi|lereng|kebutuhan|kendala|konfirmasi|pendataan|pantau|lanjut)$`.

## 2. Status terkini

Satu baris `dl_tindak` per kunci; tiap Simpan menimpa barisnya (upsert) dan menambah satu baris `dl_tindak_log`. Kunci tanpa baris = Belum. Layar hanya meminta baris yang `waktu` > sekarang dikurangi 60 hari (indeks `dl_tindak_waktu`); yang lebih lama dianggap Belum lagi.

## 3. Hitungan pita

Per kelompok: `selesai = jumlah langkah dengan status selesai`, `semua = jumlah langkah di kelompok itu`. Tampil "`selesai` dari `semua` selesai".

## 4. Batas laju

`count(dl_tindak_log WHERE oleh = ? AND waktu > sekarang - 10 menit) + 1 <= 120`, indeks `dl_tindak_log_oleh`.
