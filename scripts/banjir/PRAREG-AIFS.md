# Prapendaftaran: ECMWF AIFS masuk ansambel hujan operasional

Dibuat 11 November 2026, SEBELUM `uji_aifs.py` dijalankan pada data nyata. Keputusan pemilik (10-11 Nov 2026): AIFS ditambahkan ke
ansambel hujan, tetapi harus lolos uji balik dulu. Yang sudah diperiksa sebelum dokumen ini hanya KETERSEDIAAN data (id model, rentang
tanggal), bukan skor. Dokumen ini tidak menyebut hasil.

## Yang diputuskan

Apakah AIFS (`ecmwf_aifs025` di ensemble-api Open-Meteo, 51 anggota) boleh ikut dalam `hujan_ansambel.json` yang dipakai `status.py`.
Selama belum LOLOS, AIFS hanya anggota bayangan: diambil dan dicatat di `hujan_ansambel_aifs.json`, tidak masuk status.

## Data

- Prakiraan: Open-Meteo previous-runs API (`previous-runs-api.open-meteo.com`), variabel `precipitation_previous_dayN`, N = waktu-tunda 1, 2, 3 hari,
  dijumlah per hari kalender Asia/Jakarta. Tiga model: `ecmwf_aifs025_single` (AIFS deterministik), `ecmwf_ifs025`, `gfs_global`
  (`gfs025` ternyata kosong di previous-runs; id diganti 11 Nov 2026 sebelum ada skor yang dihitung).
  Previous-runs tidak menyimpan anggota ansambel, jadi yang diuji adalah prakiraan deterministik tiap model. Ini PERKIRAAN untuk ansambel,
  bukan ukuran langsung (batas diakui; vonis memakai kata "deterministik").
- Kebenaran: ERA5 (`archive-api.open-meteo.com`, `precipitation_sum`, Asia/Jakarta), sama dengan hujan "sempurna" di `uji_balik.py`.
  ERA5 reanalisis, bukan pengamatan; model IFS dan ERA5 berbagi fisika HTESSEL/IFS sehingga IFS bisa diuntungkan. Bias ini DICATAT di keluaran
  dan menjadi alasan margin non-inferioritas di bawah, bukan alasan melonggarkan ambang.
- Sampel titik: sel darat 0,25 derajat dari `public/banjir/data/hujan.json`, diurutkan (lat, lon), diambil tiap sel ke-k sehingga ~30 titik (k = n // 30; batas kuota Open-Meteo harian).
  Satuan yang dinilai = sel-hari (sel adalah satuan yang dibawa ke kabupaten oleh `status.py`; agregasi ke kabupaten tidak dilakukan).
- Periode: semua hari ketika ketiga model punya nilai untuk waktu-tunda yang dinilai, mulai dari hari paling awal yang ada pada AIFS sampai 3 hari
  sebelum hari uji. Tanggal mulai dan akhir ditulis di keluaran.

## Metrik dan aturan keputusan

Kejadian "hujan lebat" = hujan harian >= 20 mm (ambang 50 mm terlalu jarang untuk sampel ini; dilaporkan saja sebagai sekunder, tidak menghakimi).
Tabel kontingensi sel-hari per model per waktu-tunda: a kena, b alarm palsu, c terlewat, d benar tidak; ETS = (a - ar)/(a+b+c - ar),
ar = (a+b)(a+c)/N. Prakiraan "ya" bila hujan prakiraan >= 20 mm (tanpa penyetelan ambang per model). Selang 95% dengan bootstrap blok-bergerak
atas hari (blok 7 hari, 1.000 ulangan, benih 7), selisih ETS dihitung pada resampel yang sama.

1. Belum cukup data bila hari yang dinilai < 365, atau kejadian ERA5 >= 20 mm < 300 sel-hari, pada waktu-tunda primer (1 hari).
   Tidak ada vonis lolos atau tidak lolos; AIFS tetap bayangan dan uji diulang di jadwal berikutnya.
2. LOLOS bila SEMUA terpenuhi pada waktu-tunda 1, 2, dan 3:
   a. batas bawah selang 95% ETS(AIFS) > 0;
   b. batas bawah selang 95% selisih ETS(AIFS) - ETS(IFS) > -0,03 (non-inferior terhadap IFS dengan margin 0,03);
   c. titik taksiran ETS(AIFS) >= ETS(GFS).
3. Selain itu TIDAK LOLOS. Vonis LOLOS atau TIDAK LOLOS pada data yang sudah cukup dikunci (`uji_aifs.json` menyimpan `vonis_kunci`); data berikutnya
   tidak membalikkannya kecuali pemilik menetapkan uji baru lewat dokumen amandemen.
4. Bias dan MAE (mm/hari) per model dilaporkan, tidak menghakimi.

## Sakelar operasional

`ansambel_hujan.py` membaca `public/banjir/data/uji_aifs.json`. Hanya `vonis == "LOLOS"` yang memasukkan AIFS ke berkas yang dipakai status
(bagaimana anggota digabung tidak diubah oleh dokumen ini; penggabungan dilakukan oleh pemilik modul status setelah vonis).
