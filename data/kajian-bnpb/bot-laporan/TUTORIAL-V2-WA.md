*Pasang Bot Laporan V2 di Mac mini*

Bot V2 menjalankan Claude Code di Mac mini untuk tiap laporan, jadi hasilnya sepintar membuat laporan langsung di aplikasi Claude: ikut laporan kemarin, paham jawaban singkat, dan bisa revisi tata letak (hapus atau lebarkan panel). Angka hotspot, firespot, luas terbakar, dan belum padam tetap dikunci mesin.

Untuk sementara V2 hanya untuk nomor pemilik. Nomor lain tetap memakai bot V1.

Buka *Terminal* di Mac mini, lalu jalankan langkah berikut satu per satu.

*1. Ambil kode terbaru*
```cd ~/Developer/poskokarhutla && git pull origin main```
_Kalau folder repo di Mac berbeda, sesuaikan jalurnya._

*2. Pasang paket agen*
```cd scripts/wa/gateway && npm ci && cd ../../..```
Tunggu sampai selesai (bisa beberapa menit, paketnya besar).

*3. Pasang modul revisi (kalau belum)*
```~/.wa-bot/py/bin/python3 -m pip install python-pptx```

*4. Nyalakan V2*
Buka berkas pengaturan bot:
```open -e scripts/wa/.env```
Tambahkan dua baris ini di bagian bawah, lalu simpan:
```BL_VERSI=2
BL_BATAS_USD=25```
_Dianjurkan: buat kunci API khusus V2 di Console Anthropic (workspace baru dengan batas belanja), lalu tambahkan baris `BL_AGEN_KUNCI=<kunci itu>`._

*5. Periksa kesiapan*
```node scripts/wa/proyek.mjs --kering```
Semua isian harus *true*, termasuk _agen_sdk_ dan _agen_nomor_. Kalau ada yang *false*, kirim tangkapan layarnya.

*6. Nyalakan ulang gateway*
```launchctl kickstart -k gui/$(id -u)/id.centurisk97.wa-gateway```

*7. Uji dari WA (nomor pemilik)*
- Kirim *buat harian*, teruskan bahannya, lalu *lanjut*.
- Draf V2 butuh 2 sampai 6 menit. Selama itu bot menampilkan "sedang mengetik".
- Coba revisi bebas, misalnya: _hapus panel OMC dan Hujan di slide 3, panel armada udara dilebarkan_
- Kalau bot bertanya, jawab singkat saja. Ketik *lanjut* kalau ingin bot melanjutkan tanpa jawaban.

*Kembali ke V1*
Hapus baris `BL_VERSI=2` di `scripts/wa/.env`, lalu ulangi langkah 6.

*Kalau ada masalah*
Kirim hasil perintah ini:
```tail -n 40 ~/.wa-bot/log/gateway.log```

Terima kasih 🙏
