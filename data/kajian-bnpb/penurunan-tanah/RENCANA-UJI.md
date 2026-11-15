# RENCANA-UJI: Penurunan tanah

Python stdlib saja; swa-uji `__main__` untuk skrip, `node --test` untuk bentuk berkas dan layar. Tanpa mock data fiktif sebagai bukti validasi.

| Kode | Kriteria terima | Bukti |
| --- | --- | --- |
| T1 | Dekomposisi: tiga kombinasi (vU, vE) dikembalikan tepat; satu geometri memberi metode "satu"; E/U hampir sama memberi "rata"; NaN, pencilan, dan U kecil menghasilkan None. | `python3 scripts/banjir/subsiden.py uji` |
| T2 | Agregasi: kisi 8x8 dengan setengah kolom kosong menghasilkan satu kecamatan dengan n, median, dan cakupan benar; kecamatan di bawah `MIN_PIKSEL` tidak dilaporkan. | sama |
| T3 | Gerbang pola Jakarta lolos bila utara lebih turun, gagal bila sama atau tanpa pembanding; kota tanpa gerbang tidak diterbitkan sebagai terukur. | sama dan `proyeksi_tanah.py uji` |
| T4 | Proyeksi: laju -2 cm per tahun memberi 20 dan 40 cm; rentang rendah <= pusat <= tinggi; cakupan di bawah 30 persen atau deret di bawah 3 tahun tidak diproyeksikan. | `python3 scripts/banjir/proyeksi_tanah.py uji` |
| T5 | Berkas `subsiden.json` yang tayang punya kunci `label` berisi kata hipotesis, `atribusi` tidak kosong, nilai `med` dalam rentang masuk akal (-30 sampai +5 cm per tahun), dan semua kecamatan punya n >= 10. | `node --test tests/banjir/subsiden.test.mjs` |
| T6 | Proyeksi tidak memuat satu angka gabungan: tidak ada kunci yang menjumlahkan penurunan dan muka laut atau status rob. | sama |
| T7 | Berkas beku J4 tidak berubah: sidik `scripts/banjir/genangan/j4_sidik.json` masih cocok (`python3 scripts/banjir/genangan/kunci_j4.py cek`). | perintah tertulis di PRAREG-J4 |
| T8 | Layar: tanpa `subsiden.json` lapis jatuh ke literatur tanpa galat konsol; klik kecamatan membuka kartu seketika. | tinjau lokal, `inp-reviewer` |
| T9 | Kartu rob dan kartu penurunan terpisah: tidak ada angka gabungan di layar; catatan kaki `lapis_air.js:122` diperbarui. | tinjau lokal, `selera-angka` |
| T10 | Validasi ALGORITMA 6: nilai terdalam kota antara 0,5 dan 2 kali maksimum Sidiq 2021 (Jakarta 2,5 sampai 28 cm per tahun), galat tahan-waktu kurang dari 2 s, bias dan RMSE GNSS bila ada, dilaporkan di `RISET-SUBSIDEN.md`. Gagal = angka terukur dan proyeksi kota itu tidak tayang (hanya literatur). | `validasi-model` |

Layar ditinjau pemilik di `http://localhost:8800/banjir/` (lapis Penurunan tanah). Kegagalan T10 memblokir tayangnya angka terukur dan proyeksi kota itu; literatur berlabel tetap tampil. Tiap tiket menyertakan bukti `python3 scripts/banjir/genangan/kunci_j4.py cek` (berkas beku J4 utuh) di samping bukti tiketnya.
