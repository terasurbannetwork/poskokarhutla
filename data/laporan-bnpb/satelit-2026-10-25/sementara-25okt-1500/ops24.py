"""Slide operasi (slide3.xml) -> data 24 Okt dari Laporan Harian Dit. Koordalops BNPB 24102026 versi lengkap (131 hlm, s.d. 25 Okt 07.00 WIB).
Pakai: python3 -I ops24.py <masuk.pptx> <keluar.pptx>
Yang diubah hanya yang didukung laporan itu:
- Kalteng (hlm. bagian 19, update 25 Okt 01.58): OMC 24 Okt 9 sortie = PK-SNK 2 (dry ice 800 kg, NaCl 1.000 kg) + PK-SNK 1 (dry ice 500 kg)
  + A-2105, A-2103, A-2107 masing-masing 1 (dry ice 800 kg) + A-2119 2 (dry ice 2 x 800 kg) + CN295 A-2904 1 (NaCl 2.000 kg)
  -> dry ice 5.300 kg + NaCl 3.000 kg = 8.300 kg. Sasaran: Kota Palangka Raya, Katingan, Pulang Pisau, Kotawaringin Timur, Kotawaringin
  Barat (+ Tapin, Kalsel). Hasil: "hujan deras di wilayah Kab. Seruyan".
- Sumsel (bagian 2): GIAT OPERASI hanya "Jumat, 23 Oktober 2026" (OMC 7 sortie, 7.100 kg = isi slide lama), tidak ada OMC 24 Okt.
- Kalbar, Kalsel: tidak ada bagian di laporan. Riau OMC ditutup, Jambi OMC tidak terbang, Kaltim OMC nihil.
Tidak diubah (laporan tidak memuat rekap nasional): personel per instansi dan per provinsi (Kalteng 16.387, Riau 14.837, Jambi 5.984 sama
dengan laporan), armada udara (tetap berlabel 23 Okt)."""
import re, sys, zipfile
MASUK, KELUAR = sys.argv[1:3]
BIRU, ABU, TEKS_GELAP, PUTIH, TITIK_ABU = '4A9BE0', 'E6EAF0', '2E3440', 'FFFFFF', 'C4CAD3'
SP = re.compile(r'<p:sp>(?:(?!</p:sp>).)*?</p:sp>', re.S)


def di(s, x, y):
    hit = [m for m in SP.finditer(s) if f'<a:off x="{x}" y="{y}"/>' in m.group(0)]
    assert hit, (x, y); return hit


def teks(s, x, y, lama, baru):
    m = [h for h in di(s, x, y) if f'<a:t>{lama}</a:t>' in h.group(0)]
    assert len(m) == 1, (x, y, lama, len(m)); a, b = m[0].span()
    return s[:a] + s[a:b].replace(f'<a:t>{lama}</a:t>', f'<a:t>{baru}</a:t>', 1) + s[b:]


def pil(s, x, y, lama, baru, biru):
    """Pil (latar + teks di x, y): teks, warna (biru = hujan, abu = tidak/ belum ada), lebar seperti koordalops.lebar_pil."""
    cx = round(72000 * len(baru) + 130000)
    for m in reversed(di(s, x, y)):
        a, b = m.span(); p = s[a:b]
        p = re.sub(r'(<a:off x="\d+" y="\d+"/>\s*<a:ext cx=")\d+', rf'\g<1>{cx}', p, count=1)
        if '<a:t>' in p:
            assert f'<a:t>{lama}</a:t>' in p, (x, y, lama)
            p = p.replace(f'<a:t>{lama}</a:t>', f'<a:t>{baru}</a:t>', 1)
            p = re.sub(r'(<a:rPr[^>]*>\s*<a:solidFill><a:srgbClr val=")\w+', rf'\g<1>{PUTIH if biru else TEKS_GELAP}', p)
        else:
            p = re.sub(r'(<p:spPr>.*?<a:solidFill><a:srgbClr val=")\w+', rf'\g<1>{BIRU if biru else ABU}', p, count=1, flags=re.S)
        s = s[:a] + p + s[b:]
    return s


def titik(s, y, biru):
    (m,) = di(s, 676656, y); a, b = m.span()
    return s[:a] + re.sub(r'(<a:solidFill><a:srgbClr val=")\w+', rf'\g<1>{BIRU if biru else TITIK_ABU}', s[a:b], count=1) + s[b:]


def ubah(s):
    s = teks(s, 548640, 274320, '23', '24')   # judul: per Tanggal 24 Oktober 2026
    s = teks(s, 548640, 905256, ' armada udara, dan OMC di ', ' armada udara (23 Okt); OMC 24 Okt di ')
    s = teks(s, 548640, 905256, '4 provinsi', 'Kalteng')
    s = teks(s, 548640, 905256, '2 provinsi', 'Seruyan')
    # HUJAN SETELAH OMC
    s = teks(s, 2536546, 2752344, '23 Okt', '24 Okt')
    s = teks(s, 4628236, 2752344, '2 dari 4 provinsi hujan', '1 provinsi lapor hujan')
    TL = 'tidak ada di laporan 24 Okt'
    s = teks(s, 2027869, 3108960, 'Sekadau, Ketapang, Sintang', TL)
    s = pil(s, 3561885, 3170682, 'HUJAN RINGAN–SEDANG', 'BELUM ADA LAPORAN', False)
    s = teks(s, 3561885, 3335274, '7 kabupaten, termasuk 3 sasaran', 'laporan Koordalops 24 Okt tanpa Kalbar')
    s = titik(s, 3294126, False)
    s = teks(s, 2027869, 3552444, 'Katingan, Kotim, Kobar, Seruyan, Palangka Raya', 'Palangka Raya, Katingan, Pulpis, Kotim, Kobar')
    s = pil(s, 3561885, 3614166, 'BELUM HUJAN', 'HUJAN DERAS', True)
    s = teks(s, 3561885, 3778758, 'belum ada laporan hujan 23 Okt', 'di Kab. Seruyan, 24 Okt')
    s = titik(s, 3737610, True)
    s = teks(s, 2027869, 3995928, 'Palembang, Banyuasin, OKI', TL)
    s = pil(s, 3561885, 4057650, 'BELUM HUJAN', 'BELUM ADA LAPORAN', False)
    s = teks(s, 3561885, 4222242, 'belum ada laporan hujan 23 Okt', 'laporan Sumsel memuat kegiatan 23 Okt')
    s = teks(s, 2027869, 4439412, 'Kotabaru, Tanah Bumbu, Tanah Laut', TL)
    s = pil(s, 3561885, 4501134, 'HUJAN', 'BELUM ADA LAPORAN', False)
    s = teks(s, 3561885, 4665726, 'di Kotabaru, 23 Okt', 'laporan Koordalops 24 Okt tanpa Kalsel')
    s = titik(s, 4624578, False)
    # SEMAI OMC
    s = teks(s, 2185416, 4983480, '23 Okt', '24 Okt')
    s = teks(s, 4389252, 4983480, '15 sortie, 14.300 kg', '9 sortie, 8.300 kg')
    s = teks(s, 2027869, 5340096, '7.200 kg', '8.300 kg')
    s = pil(s, 3561885, 5401818, 'BELUM HUJAN', 'HUJAN DERAS', True)
    s = teks(s, 3561885, 5566410, 'NaCl 2.000 kg, dry ice 5.200 kg', 'NaCl 3.000 kg, dry ice 5.300 kg')
    s = teks(s, 2649661, 5479542, '8 sortie', '9 sortie')
    s = teks(s, 2027869, 5783580, '7.100 kg', '–')
    s = pil(s, 3561885, 5845302, 'JARAK PANDANG NAIK', 'BELUM ADA LAPORAN', False)
    s = teks(s, 3561885, 6009894, 'membaik menjelang siang', 'terakhir 23 Okt: 7 sortie, 7.100 kg')
    s = teks(s, 2649661, 5923026, '7 sortie', '–')
    return s


zi = zipfile.ZipFile(MASUK); zo = zipfile.ZipFile(KELUAR, 'w', zipfile.ZIP_DEFLATED)
for it in zi.infolist():
    d = zi.read(it.filename)
    if it.filename == 'ppt/slides/slide3.xml': d = ubah(d.decode()).encode()
    zo.writestr(it, d)
zo.close()
print('ok', KELUAR)
