# satelit.py (API untuk generator deck)

from satelit import hitung  # sys.path: data/laporan-bnpb/generator
a = hitung(date(2026,10,25), jam='12:00', hari_n=4)
a['hari']   -> ['2026-10-22', ..., '2026-10-25']  (hari WIB, terakhir = hari laporan, sementara s.d. jam)
a['cutoff'] -> '2026-10-25T12:00+07:00'
a['prov'][kode] / a['kab']['62|Kotawaringin Barat'] / a['kec']['62|Kab|Kec'] ->
    {'hot','hot_bersih','luas','belum','padam','fs'}: list sepanjang hari_n (float, bulatkan sekali; fs selalu 0)
hot = definisi peta_karhutla (deck Penanganan); hot_bersih = tanpa titik industri (= harian30.json / tabel website, dipakai laporan harian)
Kumulatif 1 Jan: tidak dihitung di sini; ambil dari peta_karhutla*.json website untuk hari lengkap lalu tambah luas hari berjalan.
CLI: python3 satelit.py --tanggal 2026-10-25 --jam 12:00 --keluar angka.json ; uji: python3 satelit.py --uji
