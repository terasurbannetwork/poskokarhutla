"""Aturan status taktis kompleks kebakaran. Sumber tiap ambang ada di halaman Metode & data.

Kelas FDRS (BMKG): FWI 0-1 rendah, 2-6 sedang, 7-13 tinggi, >13 sangat tinggi; naik satu kelas bila
FFMC > 82 (penyulutan sangat mudah, de Groot dkk. 2005/2007) atau ISI > 5 (BMKG: perlu bakar balik).
Keparahan kompleks (usulan riset, dikalibrasi supaya tingkat tertinggi hanya beberapa persen kompleks):
  px24 = piksel VIIRS 375 m unik yang menyala 24 jam terakhir (luas front aktif, 1 px = 14 ha).
  S3: px24 >= 10 (front >= 140 ha), atau bertahan >= 3 dari 5 hari dengan px24 >= 3, atau naik >= 50% dari kemarin
      dengan >= 5 deteksi hari ini.  S1: < 3 deteksi dan hanya 1 hari.  Selain itu S2.
"""

STATUS = ["Pencegahan rutin", "Patroli terpadu", "Siaga pemadaman awal", "Prioritas pemadaman"]


def kelas_fwi(fwi):
    return 0 if fwi < 2 else 1 if fwi < 7 else 2 if fwi < 14 else 3


def kelas_fdrs(fwi, ffmc, isi):
    return min(3, kelas_fwi(fwi) + (1 if ffmc > 82 or isi > 5 else 0))


def kelas_dc(dc):
    """BMKG: 0-140 basah, 141-260 lembap, 261-350 kering, > 350 sangat kering (larang bakar, risiko asap)."""
    return 0 if dc <= 140 else 1 if dc <= 260 else 2 if dc <= 350 else 3


def keparahan(n, hari_aktif, hari_ini, kemarin, px24):
    naik = kemarin > 0 and hari_ini >= 1.5 * kemarin and hari_ini >= 5
    if px24 >= 10 or (hari_aktif >= 3 and px24 >= 3) or naik:
        return 3
    if n < 3 and hari_aktif <= 1:
        return 1
    return 2


def status(fdrs, s):
    if fdrs <= 1:
        return 0 if s == 1 else 1
    if fdrs == 2:
        return 1 if s == 1 else 2
    return 3 if s == 3 else 2


if __name__ == "__main__":
    assert [kelas_fwi(x) for x in (0.9, 1.99, 2, 6.9, 7, 13.9, 14)] == [0, 0, 1, 1, 2, 2, 3]
    assert kelas_fdrs(5, 83, 2) == 2 and kelas_fdrs(5, 80, 6) == 2 and kelas_fdrs(20, 90, 9) == 3
    assert [kelas_dc(x) for x in (140, 141, 260, 350, 351)] == [0, 1, 1, 2, 3]
    assert keparahan(2, 1, 2, 0, 1) == 1 and keparahan(5, 2, 2, 3, 2) == 2 and keparahan(30, 1, 30, 0, 12) == 3
    assert keparahan(40, 1, 40, 0, 6) == 2                                    # banyak deteksi, front kecil
    assert keparahan(9, 3, 3, 3, 3) == 3 and keparahan(9, 3, 1, 1, 1) == 2   # bertahan 3 hari: perlu front aktif
    assert keparahan(8, 2, 6, 2, 4) == 3 and keparahan(5, 2, 3, 2, 2) == 2   # naik 200% dgn >= 5 deteksi
    # matriks: rendah/sedang x S1 = rutin; tinggi x S2 = siaga; sangat tinggi x S3 = prioritas; tidak ada level 3 tanpa S3
    assert status(0, 1) == 0 and status(1, 3) == 1 and status(2, 1) == 1 and status(2, 2) == 2
    assert status(3, 2) == 2 and status(3, 3) == 3
    assert all(status(f, s) < 3 for f in range(4) for s in (1, 2))
    print("ok")
