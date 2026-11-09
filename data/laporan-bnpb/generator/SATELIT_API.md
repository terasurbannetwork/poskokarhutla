# satelit.py (API untuk generator deck)

from satelit import hitung  # sys.path: data/laporan-bnpb/generator
a = hitung(date(2026,10,25), jam='12:00', hari_n=4)
a['hari']   -> ['2026-10-22', ..., '2026-10-25']  (hari WIB, terakhir = hari laporan, sementara s.d. jam)
a['cutoff'] -> '2026-10-25T12:00+07:00'
a['prov'][kode] / a['kab']['62|Kotawaringin Barat'] / a['kec']['62|Kab|Kec'] ->
    {'hot','hot_bersih','luas','belum','padam','fs'}: list sepanjang hari_n (float, bulatkan sekali; fs selalu 0)
belum (9 Nov 2026) = lokasi unik hari itu yang bertahan (sel 3x3 terdeteksi NOAA-20/21 12-36 jam sebelumnya) atau baru di cluster firespot "ya" (peta_karhutla.fs_hari), x peta_karhutla.F_LOK ha; luas tetap per deteksi; hitung() menarik 7 hari UTC ke belakang untuk cluster.
hot = definisi peta_karhutla (deck Penanganan); hot_bersih = tanpa titik industri (= harian30.json / tabel website, dipakai laporan harian)
Kumulatif 1 Jan: tidak dihitung di sini; ambil dari peta_karhutla*.json website untuk hari lengkap lalu tambah luas hari berjalan.
CLI: python3 satelit.py --tanggal 2026-10-25 --jam 12:00 --keluar angka.json ; uji: python3 satelit.py --uji
