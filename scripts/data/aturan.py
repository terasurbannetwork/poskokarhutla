"""Aturan status taktis kompleks kebakaran (revisi setelah peer review 12 Okt 2026).

1. Bahaya cuaca = kelas FWI BMKG apa adanya (0-1 rendah, 2-6 sedang, 7-13 tinggi, >13 sangat tinggi).
   Tidak ada lagi kenaikan kelas otomatis dari FFMC/ISI: FFMC > 82 terlampaui hampir tiap hari kemarau
   sehingga matriks runtuh. FFMC (penyulutan), ISI (laju), DC (gambut/asap) ditampilkan terpisah.
2. Keparahan dari pengamatan satelit (S1-S3), lihat keparahan().
3. Cuaca hanya boleh MENAIKKAN status, tidak boleh menurunkan api besar yang teramati (S3 minimal siaga).
   Cuaca tidak tersedia -> status dari keparahan saja, bukan dianggap rendah.
4. "Prioritas pemadaman" = front aktif 24 jam >= PRIOR_PX piksel DAN FWI >= 7 (atau FWI tidak tersedia).
   Uji balik Agu-Okt 2019 & 2023 (S-NPP): ambang px24 >= 10 & FWI >= 7 menangkap 90-95% api yang akhirnya besar
   (>= 100 piksel) sebelum mencapai separuh ukurannya, presisi 35-53%, porsi 0,8-1,9% kompleks-hari.
   Versi peringkat berkuota (k = regu/2 per Daops) hanya menangkap 60-76% dan 7 dari 10 prioritas hilang esok harinya,
   jadi ditinggalkan. Skor dipakai untuk MENGURUTKAN prioritas, bukan membatasi jumlahnya.
   Pipeline harian memakai 3 satelit VIIRS (lebih banyak lintasan dari S-NPP saja), jadi ambangnya 15 piksel.
"""

PRIOR_PX = 15
import math

STATUS = ["Pencegahan rutin", "Patroli terpadu", "Siaga pemadaman awal", "Prioritas pemadaman"]


def kelas_fwi(fwi):
    return 0 if fwi < 2 else 1 if fwi < 7 else 2 if fwi < 14 else 3


def kelas_dc(dc):
    """BMKG: 0-140 basah, 141-260 lembap, 261-350 kering, > 350 sangat kering (larang bakar, risiko asap)."""
    return 0 if dc <= 140 else 1 if dc <= 260 else 2 if dc <= 350 else 3


def keparahan(n, hari_aktif, hari_ini, kemarin, px24):
    """S3: front aktif 24 jam >= 10 piksel (~140 ha), atau bertahan >= 4 hari dengan front >= 5 piksel.
    S1: < 3 deteksi, 1 hari. Selain itu S2. (Klausul 'naik 50%' dibuang: uji balik menunjukkan ia menambah
    kompleks tanpa menangkap api besar tambahan.)"""
    if px24 >= 10 or (hari_aktif >= 4 and px24 >= 5):
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


def prioritas(px24, fwi):
    """Level 3 bila front aktif besar dan cuaca mendukung (FWI tinggi), atau cuaca tidak tersedia."""
    return px24 >= PRIOR_PX and (fwi is None or fwi >= 7)


def skor(px24, frp24, hari_aktif, isi, dc, jarak_daops_km):
    """Skor peringkat = bahaya x (1 + celah respons).
    Bahaya: luas front aktif (px24), intensitas (FRP 24 jam, log), bertahan, laju (ISI), kekeringan (DC > 350).
    Celah respons: makin jauh dari Daops makin perlu didahulukan (dibatasi 2x).
    Paparan (permukiman searah angin, gambut, kawasan lindung) ditambahkan saat data lahan/OSM tersedia."""
    bahaya = max(px24, 1) * (1 + math.log1p(max(frp24, 0)) / 5) * (1 + min(hari_aktif, 5) / 5)
    bahaya *= 1 + min(max(isi or 0, 0), 20) / 20 + (0.5 if (dc or 0) > 350 else 0)
    celah = min((jarak_daops_km or 0) / 150, 1)
    return round(bahaya * (1 + celah), 2)


def risiko_riwayat(per_tahun, tahun, maks_total, mulai_baru="2023"):
    """Indeks risiko historis wilayah 0-100 (sama dengan peringkat di halaman Tren):
    50% kekerapan (tahun dengan >= 10 titik), 30% besaran (log total / log total terbesar),
    20% tren (rata-rata sejak mulai_baru vs sebelumnya; turun separuh = 0, naik dua kali = 1)."""
    if not per_tahun or maks_total <= 0:
        return 0
    i = tahun.index(mulai_baru) if mulai_baru in tahun else len(tahun) // 2
    lama = sum(per_tahun[:i]) / max(i, 1)
    baru = sum(per_tahun[i:]) / max(len(tahun) - i, 1)
    tren = min(1, max(0, (math.log2((baru + 1) / (lama + 1)) + 1) / 2))
    total = sum(per_tahun)
    return round(100 * (.5 * sum(1 for x in per_tahun if x >= 10) / len(tahun) + .3 * math.log1p(total) / math.log1p(maks_total) + .2 * tren))


def skor_dengan_riwayat(skor_dasar, risiko):
    """Kompleks di kecamatan langganan api didahulukan: skor x (1 + risiko/100), maksimal 2x."""
    return round(skor_dasar * (1 + max(0, min(risiko, 100)) / 100), 2)


if __name__ == "__main__":
    th = [str(y) for y in range(2015, 2027)]
    assert risiko_riwayat([0] * 12, th, 100) == 20 * 0 + round(100 * .2 * .5)  # tanpa api: hanya komponen tren netral
    kronis = risiko_riwayat([500] * 12, th, 6000)
    sekali = risiko_riwayat([6000] + [0] * 11, th, 6000)
    assert kronis > sekali, (kronis, sekali)  # terbakar tiap tahun lebih berisiko dari satu kali besar
    assert skor_dengan_riwayat(10, 100) == 20 and skor_dengan_riwayat(10, 0) == 10
    assert [kelas_fwi(x) for x in (0.9, 1.99, 2, 6.9, 7, 13.9, 14)] == [0, 0, 1, 1, 2, 2, 3]
    assert [kelas_dc(x) for x in (140, 141, 260, 350, 351)] == [0, 1, 1, 2, 3]
    assert keparahan(2, 1, 2, 0, 1) == 1 and keparahan(5, 2, 2, 3, 2) == 2 and keparahan(30, 1, 30, 0, 12) == 3
    assert keparahan(40, 1, 40, 0, 6) == 2
    assert keparahan(20, 4, 3, 3, 5) == 3 and keparahan(9, 3, 3, 3, 3) == 2   # bertahan: >= 4 hari & front >= 5
    assert keparahan(8, 2, 6, 2, 4) == 2                                       # 'naik 50%' tidak lagi membuat S3
    assert prioritas(15, 7) and prioritas(20, None) and not prioritas(14, 30) and not prioritas(40, 6.9)
    # cuaca rendah / tak tersedia tidak boleh menurunkan api besar (peer review C1)
    assert status(0, 3) == 2 and status(1, 3) == 2 and status(None, 3) == 2
    assert status(0, 1) == 0 and status(2, 2) == 2 and status(3, 1) == 1 and status(None, 1) == 1
    assert all(status(f, s) <= 2 for f in (None, 0, 1, 2, 3) for s in (1, 2, 3))  # level 3 hanya lewat peringkat
    assert skor(20, 500, 3, 8, 400, 120) > skor(20, 500, 3, 8, 400, 10) > skor(5, 500, 3, 8, 400, 10)
    print("ok")
