"""Aturan status taktis kompleks kebakaran (revisi setelah peer review 12 Okt 2026).

1. Bahaya cuaca = kelas FWI BMKG apa adanya (0-1 rendah, 2-6 sedang, 7-13 tinggi, >13 sangat tinggi).
   Tidak ada lagi kenaikan kelas otomatis dari FFMC/ISI: FFMC > 82 terlampaui hampir tiap hari kemarau
   sehingga matriks runtuh. FFMC (penyulutan), ISI (laju), DC (gambut/asap) ditampilkan terpisah.
2. Keparahan dari pengamatan satelit (S1-S3), lihat keparahan().
3. Cuaca hanya boleh MENAIKKAN status, tidak boleh menurunkan api besar yang teramati (S3 minimal siaga).
   Cuaca tidak tersedia -> status dari keparahan saja, bukan dianggap rendah.
4. "Prioritas pemadaman" bukan ambang, melainkan peringkat: k kompleks teratas per wilayah kerja Daops
   (k = regu Daops / 2) atau per kabupaten di luar jangkauan Daops (k = 2). Lihat skor().
"""
import math

STATUS = ["Pencegahan rutin", "Patroli terpadu", "Siaga pemadaman awal", "Prioritas pemadaman"]


def kelas_fwi(fwi):
    return 0 if fwi < 2 else 1 if fwi < 7 else 2 if fwi < 14 else 3


def kelas_dc(dc):
    """BMKG: 0-140 basah, 141-260 lembap, 261-350 kering, > 350 sangat kering (larang bakar, risiko asap)."""
    return 0 if dc <= 140 else 1 if dc <= 260 else 2 if dc <= 350 else 3


def keparahan(n, hari_aktif, hari_ini, kemarin, px24):
    """S3: front aktif 24 jam >= 10 piksel (~140 ha), bertahan >= 3 hari dengan front >= 3 piksel,
    atau naik >= 50% dari kemarin dengan >= 5 deteksi. S1: < 3 deteksi, 1 hari. Selain itu S2."""
    naik = kemarin > 0 and hari_ini >= 1.5 * kemarin and hari_ini >= 5
    if px24 >= 10 or (hari_aktif >= 3 and px24 >= 3) or naik:
        return 3
    if n < 3 and hari_aktif <= 1:
        return 1
    return 2


def status(fdrs, s):
    """Status dasar 0-2. fdrs None = cuaca tidak tersedia. Level 3 hanya lewat peringkat (lihat docstring)."""
    if fdrs is None:
        dasar = {1: 1, 2: 1, 3: 2}[s]
    elif fdrs <= 1:
        dasar = 0 if s == 1 else 1
    elif fdrs == 2:
        dasar = 1 if s == 1 else 2
    else:
        dasar = 2 if s >= 2 else 1
    return max(dasar, 2 if s == 3 else 0)  # cuaca tidak boleh menurunkan api besar yang teramati


def skor(px24, frp24, hari_aktif, isi, dc, jarak_daops_km):
    """Skor peringkat = bahaya x (1 + celah respons).
    Bahaya: luas front aktif (px24), intensitas (FRP 24 jam, log), bertahan, laju (ISI), kekeringan (DC > 350).
    Celah respons: makin jauh dari Daops makin perlu didahulukan (dibatasi 2x).
    Paparan (permukiman searah angin, gambut, kawasan lindung) ditambahkan saat data lahan/OSM tersedia."""
    bahaya = max(px24, 1) * (1 + math.log1p(max(frp24, 0)) / 5) * (1 + min(hari_aktif, 5) / 5)
    bahaya *= 1 + min(max(isi or 0, 0), 20) / 20 + (0.5 if (dc or 0) > 350 else 0)
    celah = min((jarak_daops_km or 0) / 150, 1)
    return round(bahaya * (1 + celah), 2)


if __name__ == "__main__":
    assert [kelas_fwi(x) for x in (0.9, 1.99, 2, 6.9, 7, 13.9, 14)] == [0, 0, 1, 1, 2, 2, 3]
    assert [kelas_dc(x) for x in (140, 141, 260, 350, 351)] == [0, 1, 1, 2, 3]
    assert keparahan(2, 1, 2, 0, 1) == 1 and keparahan(5, 2, 2, 3, 2) == 2 and keparahan(30, 1, 30, 0, 12) == 3
    assert keparahan(40, 1, 40, 0, 6) == 2
    assert keparahan(9, 3, 3, 3, 3) == 3 and keparahan(9, 3, 1, 1, 1) == 2
    assert keparahan(8, 2, 6, 2, 4) == 3 and keparahan(5, 2, 3, 2, 2) == 2
    # cuaca rendah / tak tersedia tidak boleh menurunkan api besar (peer review C1)
    assert status(0, 3) == 2 and status(1, 3) == 2 and status(None, 3) == 2
    assert status(0, 1) == 0 and status(2, 2) == 2 and status(3, 1) == 1 and status(None, 1) == 1
    assert all(status(f, s) <= 2 for f in (None, 0, 1, 2, 3) for s in (1, 2, 3))  # level 3 hanya lewat peringkat
    assert skor(20, 500, 3, 8, 400, 120) > skor(20, 500, 3, 8, 400, 10) > skor(5, 500, 3, 8, 400, 10)
    print("ok")
