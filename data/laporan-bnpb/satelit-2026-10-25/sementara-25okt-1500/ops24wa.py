"""Slide operasi (slide3.xml) -> data 24 Okt dari "LAPORAN PENANGANAN KARHUTLA DI ENAM PROVINSI PRIORITAS" (WA, 25 Okt 2026 18.03), sumber
yang sama dengan isi slide sebelumnya (laporan WA). Pakai: python3 -I ops24wa.py <masuk.pptx> <keluar.pptx>  (masukan = slide 3 asli 23 Okt)
- Personel 71.878 dan rincian per provinsi: sama dengan laporan (tidak berubah).
- Armada 24 Okt: patroli/CASA/OMC 24 unit; heli WB 39 unit (Jawa Barat 3, sebelumnya 1) -> 63 unit. Baris Jawa Barat dipindah ke bawah Jambi.
- OMC 24 Okt: Kalteng 8 sortie (NaCl 3.000 kg + dry ice 4.500 kg = 7.500 kg), hujan deras di Seruyan; Kalsel 2 sortie NaCl 2.000 kg (PK-SNK),
  hujan di Tapin dan Kotabaru; Sumsel 8 sortie (dry ice 3.300 kg + NaCl 8.800 kg = 12.100 kg), hujan di Muba, Palembang, Banyuasin, OKI;
  Kalbar OMC tidak dilaksanakan, hujan sedang di Kapuas Hulu. Total 18 sortie, 21.600 kg. Hujan dilaporkan di 6 provinsi (+ Riau, Jambi).
  Catatan: Laporan Harian Koordalops 24102026 mencatat Kalteng 9 sortie / dry ice 5.300 kg (satu sortie dry ice 800 kg PK-SNK lebih);
  dipakai angka WA (rekap konsolidasi, sumber slide ini)."""
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


def geser_baris(s, y_lama, y_baru):
    """Semua bentuk armada (x >= 6,3 juta EMU) di pita baris y_lama .. +309213 digeser ke baris y_baru."""
    def f(m):
        b = m.group(0); o = re.search(r'<a:off x="(\d+)" y="(\d+)"/>', b)
        if not o or int(o.group(1)) < 6300000 or not y_lama <= int(o.group(2)) < y_lama + 309213: return b
        return b.replace(o.group(0), f'<a:off x="{o.group(1)}" y="{int(o.group(2)) - y_lama + y_baru}"/>', 1)
    return SP.sub(f, s)


def ubah(s):
    s = teks(s, 548640, 274320, '23', '24')
    s = teks(s, 548640, 905256, '61', '63')
    s = teks(s, 548640, 905256, '4 provinsi', '3 provinsi')
    s = teks(s, 548640, 905256, ' dengan hujan di ', ' dengan hujan dilaporkan di ')
    s = teks(s, 548640, 905256, '2 provinsi', '6 provinsi')
    s = teks(s, 2203704, 1572768, '37', '39')                      # PENANGANAN: heli water bombing
    # HUJAN SETELAH OMC 24 Okt
    s = teks(s, 2536546, 2752344, '23 Okt', '24 Okt')
    s = teks(s, 4628236, 2752344, '2 dari 4 provinsi hujan', '4 dari 4 provinsi hujan')
    s = teks(s, 2027869, 3108960, 'Sekadau, Ketapang, Sintang', 'OMC tidak dilaksanakan')
    s = pil(s, 3561885, 3170682, 'HUJAN RINGAN–SEDANG', 'HUJAN SEDANG', True)
    s = teks(s, 3561885, 3335274, '7 kabupaten, termasuk 3 sasaran', 'di Kapuas Hulu, 24 Okt (tanpa OMC)')
    s = teks(s, 2027869, 3552444, 'Katingan, Kotim, Kobar, Seruyan, Palangka Raya', 'Palangka Raya, Katingan, Pulpis, Kotim, Kobar')
    s = pil(s, 3561885, 3614166, 'BELUM HUJAN', 'HUJAN DERAS', True)
    s = teks(s, 3561885, 3778758, 'belum ada laporan hujan 23 Okt', 'di Kab. Seruyan, 24 Okt')
    s = titik(s, 3737610, True)
    s = teks(s, 2027869, 3995928, 'Palembang, Banyuasin, OKI', 'Palembang, Banyuasin, OKI, Muba')
    s = pil(s, 3561885, 4057650, 'BELUM HUJAN', 'HUJAN', True)
    s = teks(s, 3561885, 4222242, 'belum ada laporan hujan 23 Okt', 'di Muba, Palembang, Banyuasin, OKI')
    s = titik(s, 4181094, True)
    s = teks(s, 2027869, 4439412, 'Kotabaru, Tanah Bumbu, Tanah Laut', 'Tala, Kotabaru, Batola, Tapin, HSS, HSU, Balangan')
    s = teks(s, 3561885, 4665726, 'di Kotabaru, 23 Okt', 'di Tapin dan Kotabaru; 2 sortie, 2.000 kg NaCl')
    # SEMAI OMC 24 Okt (baris Kalteng dan Sumsel; Kalsel di baris hujan, masuk total)
    s = teks(s, 2185416, 4983480, '23 Okt', '24 Okt')
    s = teks(s, 4389252, 4983480, '15 sortie, 14.300 kg', '18 sortie, 21.600 kg')
    s = teks(s, 2027869, 5340096, '7.200 kg', '7.500 kg')
    s = pil(s, 3561885, 5401818, 'BELUM HUJAN', 'HUJAN DERAS', True)
    s = teks(s, 3561885, 5566410, 'NaCl 2.000 kg, dry ice 5.200 kg', 'NaCl 3.000 kg, dry ice 4.500 kg')
    s = teks(s, 2027869, 5783580, '7.100 kg', '12.100 kg')
    s = pil(s, 3561885, 5845302, 'JARAK PANDANG NAIK', 'HUJAN', True)
    s = teks(s, 3561885, 6009894, 'membaik menjelang siang', 'NaCl 8.800 kg, dry ice 3.300 kg')
    s = teks(s, 2649661, 5923026, '7 sortie', '8 sortie')
    # ARMADA UDARA 24 Okt
    s = teks(s, 7792060, 2327148, '23 Okt', '24 Okt')
    s = teks(s, 6786220, 2487168, '61 unit', '63 unit')
    s = teks(s, 9143543, 2514600, '37 ', '39 ')
    U = 190896   # satu unit = lebar batang 1 unit
    for h in reversed(di(s, 7982956, 5416525)):
        a, b = h.span(); p = re.sub(r'(<a:off x="7982956" y="5416525"/>\s*<a:ext cx=")\d+', rf'\g<1>{3 * U}', s[a:b], count=1)
        s = s[:a] + p.replace('<a:t>1</a:t>', '<a:t>3</a:t>') + s[b:]
    s = teks(s, 8265295, 5372352, '2', '4')
    (h,) = [x for x in di(s, 8265295, 5372352)]; a, b = h.span()
    s = s[:a] + s[a:b].replace('<a:off x="8265295" y="5372352"/>', f'<a:off x="{7982956 + 3 * U + 91443}" y="5372352"/>', 1) + s[b:]
    # urutan: Jawa Barat (4 unit) naik ke bawah Jambi; Jawa Timur dan Lampung turun satu baris
    s = geser_baris(s, 5372352, 9_000_000)
    s = geser_baris(s, 5063139, 5372352)
    s = geser_baris(s, 4753926, 5063139)
    s = geser_baris(s, 9_000_000, 4753926)
    return s


zi = zipfile.ZipFile(MASUK); zo = zipfile.ZipFile(KELUAR, 'w', zipfile.ZIP_DEFLATED)
for it in zi.infolist():
    d = zi.read(it.filename)
    if it.filename == 'ppt/slides/slide3.xml': d = ubah(d.decode()).encode()
    zo.writestr(it, d)
zo.close()
print('ok', KELUAR)
