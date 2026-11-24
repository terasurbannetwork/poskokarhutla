*Bot Laporan BNPB v2.1: lebih paham bahasa biasa*

Mulai versi ini bot tidak perlu perintah kaku lagi. Berlaku untuk semua nomor terdaftar.

*1. Ngobrol biasa*
Tulis saja seperti ke rekan kerja, misalnya:
- _bikinin laporan harian kemarin ya_
- _laporanku udah jadi belum?_
- _udah oke, finalkan aja_
Untuk *final* dan *batal*, bot selalu bertanya dulu. Balas *ya* dalam 5 menit untuk menjalankannya.

*2. Tanya isi draf*
Contoh: _slide 3 isinya apa?_ atau _kejadian di Jateng ada berapa?_
Bot menjawab dari isi draf. Draf tidak berubah.

*3. Revisi dalam beberapa pesan*
Ketik:
```revisi```
Lalu kirim revisinya, boleh banyak pesan, boleh juga pesan yang diteruskan. Kalau sudah semua, ketik:
```selesai```
Semua revisi dikerjakan sekaligus jadi satu versi baru. Mau batal revisi? Ketik *batal*. Drafnya tetap tersimpan.
_Revisi satu kalimat tetap bisa langsung dikirim seperti biasa, tanpa ketik revisi dulu._

*4. Bahan WA berantakan*
Kalau format WA Koordalops meleset (misalnya "1 .Bencana" atau jumlah kejadian di kepala tidak cocok), bot meminta Claude merapikan bentuknya lalu membangun ulang. Angka korban dan dampak tidak pernah diubah. Ringkasan draf menyebut apa saja yang dirapikan.

*Pasang di Mac mini*
```cd ~/Developer/poskokarhutla && git pull origin main```
Lalu mulai ulang bot seperti biasa. Ketik *changelog* di WA untuk memastikan versinya *v2.1*.
