"""Isi bagian deck yang bersumber laporan BNPB: PM2.5 BMKG 24 Okt 06.00, operasi dari ringkasan WA 24 Okt (data 23 Okt).
Pakai: python3 -I koordalops.py <masuk.pptx> <keluar.pptx>
- slide tabel (slide1.xml): pil PM2.5 = konsentrasi tertinggi stasiun BMKG di provinsi itu (daftar 10 tertinggi, 22 Okt 06.00 WIB);
  provinsi di luar daftar = "PM2.5 < nilai ke-10". Pil cuaca = potensi cuaca sepekan BMKG (periode 20-26 Okt).
- slide operasi (slide3.xml): lihat ganti_operasi(). Template tidak diubah: hanya teks, jenis pil (salin dari pil lain di slide yang sama), dan panjang batang."""
import re, sys, zipfile

MASUK, KELUAR = sys.argv[1], sys.argv[2]
X_PM, X_CU = 2798064, 3767328   # x pil PM2.5 dan pil cuaca di tiap baris


def rep(s, a, b, n=1):
    assert s.count(a) == n, (a, s.count(a)); return s.replace(a, b)


def blok(s, x, y):
    """(awal, akhir) potongan XML satu pil: <p:sp> bentuk di (x, y) + <p:pic> ikon + <p:sp> teks."""
    m = re.search(rf'<p:sp>(?:(?!</p:sp>).)*?<a:off x="{x}" y="{y}"/>(?:(?!</p:sp>).)*?</p:sp>\s*<p:pic>.*?</p:pic>\s*<p:sp>.*?</p:sp>', s, re.S)
    assert m and m.group(0).count('<p:sp>') == 2, (x, y); return m.start(), m.end()


def isi_pil(s, x, y, teks, donor_y=None):
    """Ganti teks pil di (x, y). donor_y: salin jenis pil (warna, ikon, warna teks) dari pil di (x, donor_y)."""
    a, b = blok(s, x, y)
    if donor_y is not None:
        da, db = blok(s, x, donor_y)
        baru = re.sub(r'<a:off x="(\d+)" y="(\d+)"/>', lambda m: f'<a:off x="{m.group(1)}" y="{int(m.group(2)) - donor_y + y}"/>', s[da:db])
        ids = re.findall(r'<p:cNvPr id="(\d+)"', s[a:b])   # pakai id pil lama: tetap unik
        baru = re.sub(r'<p:cNvPr id="\d+"', lambda m, it=iter(ids): f'<p:cNvPr id="{next(it)}"', baru)
        s = s[:a] + baru + s[b:]; a, b = blok(s, x, y)
    pot = s[a:b]
    lama = re.findall(r'<a:t>([^<]*)</a:t>', pot); assert len(lama) == 1, lama
    pot = pot.replace(f'<a:t>{lama[0]}</a:t>', f'<a:t>{teks}</a:t>')
    if len(teks) > 12: pot = pot.replace('wrap="square"', 'wrap="none"')   # "CERAH BERAWAN" sedikit lebih lebar dari kotak teks; muat di dalam pil
    return s[:a] + pot + s[b:]


def ganti_tabel(s):
    Y = dict(kalteng=2316480, kalbar=2834640, sumsel=3352800, kalsel=3870960, papsel=4389120, kaltim=4907280)   # urutan hotspot 23 Okt
    # PM2.5 (µg/m3, BMKG pm2p5-obs, 24 Okt 06.00 WIB): Pangkalan Bun 603,0, Kota Jambi 418,3, Palangkaraya 399,1, Musi 2 Palembang 284,4,
    # Samarinda 104,4, Sintang 104,2, Banjarbaru 95,5, nilai ke-10 Sorong 87,8; Papua Selatan di luar daftar. Donor: Kalteng = berbahaya, Kalsel = tidak sehat.
    tdk_sehat = Y['kalsel']
    s = isi_pil(s, X_PM, Y['kalbar'], '104 TIDAK SEHAT', donor_y=tdk_sehat)
    s = isi_pil(s, X_PM, Y['kaltim'], '104 TIDAK SEHAT', donor_y=tdk_sehat)
    s = isi_pil(s, X_PM, Y['kalsel'], '96 TIDAK SEHAT')
    s = isi_pil(s, X_PM, Y['kalteng'], '603 BERBAHAYA')
    s = isi_pil(s, X_PM, Y['sumsel'], '284 BERBAHAYA')
    s = isi_pil(s, X_PM, Y['papsel'], 'PM2.5 &lt; 88')
    hujan = Y['papsel']   # cuaca BMKG 23-25 Okt
    s = isi_pil(s, X_CU, Y['kaltim'], 'HUJAN SEDANG', donor_y=hujan)
    s = isi_pil(s, X_CU, Y['kalbar'], 'HUJAN, ANGIN', donor_y=hujan)
    s = isi_pil(s, X_CU, Y['kalteng'], 'HUJAN, ANGIN', donor_y=hujan)
    s = isi_pil(s, X_CU, Y['sumsel'], 'HUJAN SEDANG', donor_y=hujan)
    s = isi_pil(s, X_CU, Y['kalsel'], 'ANGIN KENCANG')
    s = isi_pil(s, X_CU, Y['papsel'], 'HUJAN SEDANG')
    return rep(s, '<a:t>prakiraan cuaca 20–22 Okt</a:t>', '<a:t>prakiraan cuaca 23–25 Okt</a:t>')


def teks(s, lama, baru, n=1):
    return rep(s, f'<a:t>{lama}</a:t>', f'<a:t>{baru}</a:t>', n)


def sp_di(s, x, y):
    """(awal, akhir) satu <p:sp> dengan offset (x, y); harus tunggal."""
    hit = [m.span() for m in re.finditer(r'<p:sp>(?:(?!</p:sp>).)*?</p:sp>', s, re.S) if f'<a:off x="{x}" y="{y}"/>' in m.group(0)]
    assert len(hit) >= 1, (x, y); return hit


def ubah_sp(s, x, y, teks_baru=None, x_baru=None, cx=None, semua=True):
    """Ubah semua <p:sp> di (x, y) (bentuk + kotak teksnya): teks, posisi x, lebar."""
    for a, b in reversed(sp_di(s, x, y)):
        p = s[a:b]
        if teks_baru is not None and '<a:t>' in p:
            lama = re.findall(r'<a:t>([^<]*)</a:t>', p)   # teks bertingkat ('10' + ' unit'): run pertama saja
            p = p.replace(f'<a:t>{lama[0]}</a:t>', f'<a:t>{teks_baru}</a:t>', 1)
        if cx is not None: p = re.sub(r'(<a:off x=")\d+(" y="\d+"/><a:ext cx=")\d+', lambda m: f'{m.group(1)}{x_baru if x_baru is not None else x}{m.group(2)}{cx}', p)
        elif x_baru is not None: p = p.replace(f'<a:off x="{x}" y="{y}"/>', f'<a:off x="{x_baru}" y="{y}"/>')
        s = s[:a] + p + s[b:]
    return s


def lebar_pil(t): return round(72000 * len(t) + 130000)   # sejalan dengan pil yang ada: 'BELUM HUJAN' 925.373, 'HUJAN RINGAN–LEBAT' 1.386.230


# ringkasan WA "Laporan Upaya Pemadaman Karhutla oleh Satgas" 24 Okt (data 23 Okt): patroli/CASA/OMC ; heli WB, urut total menurun.
ARMADA = [('Kalimantan Selatan', 9, 6), ('Sumatera Selatan', 5, 5), ('Kalimantan Tengah', 2, 8), ('Kalimantan Barat', 2, 7), ('Riau', 1, 4),
          ('Jambi', 1, 3), ('Jawa Timur', 1, 1), ('Lampung', 1, 1), ('Jawa Barat', 1, 1), ('Kalimantan Timur/IKN', 0, 1), ('Papua Selatan', 1, 0)]


def tukar_pil(s, y1, y2):
    """Tukar jenis pil HASIL (biru hujan <-> abu belum hujan) antara baris y1 dan y2; teks diganti sesudahnya."""
    b1 = s[sp_di(s, 3561885, y1)[0][0]:sp_di(s, 3561885, y1)[-1][1]]; b2 = s[sp_di(s, 3561885, y2)[0][0]:sp_di(s, 3561885, y2)[-1][1]]
    n1 = re.sub(f'y="{y1}"', f'y="{y2}"', b1); n2 = re.sub(f'y="{y2}"', f'y="{y1}"', b2)
    s = s.replace(b1, '@@1@@').replace(b2, '@@2@@')
    return s.replace('@@1@@', n2).replace('@@2@@', n1)


def ganti_operasi(s):
    s = teks(s, '20', '23')                          # judul: '... per Tanggal ' + '20' + ' Oktober ' + '2026'
    pat, wb = sum(r[1] for r in ARMADA), sum(r[2] for r in ARMADA)
    s = teks(s, '51', str(pat + wb)); s = teks(s, '3 provinsi', '2 provinsi')   # OMC di 4 provinsi, hujan di Kalbar dan Kalsel
    s = teks(s, '15', str(pat)); s = teks(s, '36', str(wb))
    s = teks(s, '51 unit', f'{pat + wb} unit'); s = teks(s, '15 ', f'{pat} '); s = teks(s, '36 ', f'{wb} ')
    # ---- hujan setelah OMC 23 Okt: Kalbar (radar BMKG, 7 kabupaten) dan Kalsel (Kotabaru); Kalteng dan Sumsel belum ada laporan hujan
    s = teks(s, '19 Okt', '23 Okt'); s = teks(s, '3 dari 4 provinsi hujan', '2 dari 4 provinsi hujan')
    s = teks(s, 'Ketapang, Kayong Utara', 'Sekadau, Ketapang, Sintang')
    s = ubah_sp(s, 3561885, 3170682, 'HUJAN RINGAN–SEDANG', cx=lebar_pil('HUJAN RINGAN–SEDANG'))
    s = teks(s, '13 kab/kota, termasuk 2 sasaran', '7 kabupaten, termasuk 3 sasaran')
    s = teks(s, 'Barito Selatan, Seruyan, Kotawaringin Timur dan Barat', 'Katingan, Kotim, Kobar, Seruyan, Palangka Raya')
    s = teks(s, 'Tabalong, Banjar, Barito Kuala', 'Kotabaru, Tanah Bumbu, Tanah Laut')
    s = tukar_pil(s, 3614166, 4501134)   # Kalteng jadi BELUM HUJAN, Kalsel jadi HUJAN
    s = teks(s, 'di 4 kabupaten sasaran', 'belum ada laporan hujan 23 Okt')
    s = teks(s, 'radar BMKG 24 jam', 'di Kotabaru, 23 Okt')
    s = teks(s, 'Ogan Ilir, OKI, Banyuasin, Palembang', 'Palembang, Banyuasin, OKI')
    # Sumsel: pil biru HUJAN SANGAT RINGAN -> abu BELUM HUJAN (salin dari baris Kalteng yang kini abu)
    a, b = sp_di(s, 3561885, 3614166)[0], sp_di(s, 3561885, 3614166)[-1]
    donor = re.sub(r'y="3614166"', 'y="4057650"', s[a[0]:b[1]])
    c, d = sp_di(s, 3561885, 4057650)[0], sp_di(s, 3561885, 4057650)[-1]
    ids = re.findall(r'<p:cNvPr id="(\d+)"', s[c[0]:d[1]]); donor = re.sub(r'<p:cNvPr id="\d+"', lambda m, it=iter(ids): f'<p:cNvPr id="{next(it)}"', donor)
    s = s[:c[0]] + donor + s[d[1]:]
    s = teks(s, 'Ogan Ilir dan Lahat', 'belum ada laporan hujan 23 Okt', 1)
    # titik baris: Kalbar & Kalsel biru, Kalteng & Sumsel abu
    for y, w in ((3737610, 'C4CAD3'), (4181094, 'C4CAD3'), (4624578, '4A9BE0')):
        hit = sp_di(s, 676656, y)
        for e, f in hit: s = s[:e] + re.sub(r'val="(4A9BE0|C4CAD3)"', f'val="{w}"', s[e:f]) + s[f:]
    # ---- semai 23 Okt (Kalteng dan Sumsel; Kalbar dan Kalsel masing-masing 1 sortie NaCl 1.000 kg)
    s = teks(s, 'SEMAI DRY ICE', 'SEMAI OMC'); s = teks(s, 'BAHAN SEMAI', 'DRY ICE + NaCl')
    s = teks(s, '20 Okt', '23 Okt', 2)
    cx = lebar_pil('15 sortie, 14.300 kg') - 60000
    s = ubah_sp(s, 4856836, 4983480, '15 sortie, 14.300 kg', x_baru=4856836 + 1042416 - cx, cx=cx)
    s = teks(s, '3.900 kg', '7.200 kg'); s = teks(s, '800 kg', '7.100 kg'); s = teks(s, '5 sortie', '8 sortie'); s = teks(s, '1 sortie', '7 sortie')
    s = ubah_sp(s, 3561885, 5401818, 'BELUM HUJAN', cx=lebar_pil('BELUM HUJAN'))
    (g, h), = [x for x in sp_di(s, 3561885, 5401818) if '<a:t>' not in s[x[0]:x[1]]]
    s = s[:g] + s[g:h].replace('val="4A9BE0"', 'val="E6EAF0"') + s[h:]
    i0 = s.find('<a:t>BELUM HUJAN</a:t>', s.find('SEMAI OMC')); j0 = s.rfind('<a:srgbClr val="FFFFFF"/>', 0, i0); s = s[:j0] + '<a:srgbClr val="2E3440"/>' + s[j0 + 25:]
    s = teks(s, 'pagi, 1.907 ke 1.200', 'NaCl 2.000 kg, dry ice 5.200 kg')
    s = teks(s, 'Palembang, 700 m ke 7.000 m', 'membaik menjelang siang')
    return armada(s)


def armada(s):
    """Batang armada per provinsi. Baris PEMILIK dibuang; baris tambahan disalin dari baris Riau; jarak baris dipadatkan supaya muat."""
    Y0, P0 = 2898648, 384048; N = len(ARMADA); Y = [Y0 + i * P0 for i in range(N)]
    X0, U = 7792060, 2863440 / max(p + w for _, p, w in ARMADA)
    s = re.sub(r'<p:sp>(?:(?!</p:sp>).)*?<a:off x="\d+" y="(?:6108192|6044184)"/>(?:(?!</p:sp>).)*?</p:sp>', '', s, flags=re.S)
    s = re.sub(r'<p:pic>(?:(?!</p:pic>).)*?<a:off x="\d+" y="6140196"/>(?:(?!</p:pic>).)*?</p:pic>', '', s, flags=re.S)
    nid = [max(map(int, re.findall(r'<p:cNvPr id="(\d+)"', s)))]
    riau = [m.group(0) for m in re.finditer(r'<p:sp>(?:(?!</p:sp>).)*?</p:sp>', s, re.S)
            if re.search(r'<a:off x="(\d+)" y="(4434840|4489704)"/>', m.group(0)) and int(re.search(r'<a:off x="(\d+)"', m.group(0)).group(1)) >= 6329020]
    assert len(riau) == 6, len(riau)
    tambah = ''
    for i in range(8, N):
        dy = Y[i] - Y[4]
        for b in riau:
            nid[0] += 1
            b = re.sub(r'<a:off x="(\d+)" y="(\d+)"/>', lambda q: f'<a:off x="{q.group(1)}" y="{int(q.group(2)) + dy}"/>', b, count=1)
            tambah += re.sub(r'<p:cNvPr id="\d+"', f'<p:cNvPr id="{nid[0]}"', b, count=1)
    s = s.replace('</p:spTree>', tambah + '</p:spTree>')
    for y, (nama, p, w) in zip(Y, ARMADA):
        yb = y + 54864
        s = ubah_sp(s, 6329020, y, nama)
        navy = [x for x in sp_di(s, X0, yb) if 'val="051C2C"' in s[x[0]:x[1]]]
        if p and not navy:   # baris templat tanpa patroli: salin batang oranye sebagai navy
            xo0 = int(re.search(rf'<a:off x="(\d+)" y="{yb}"/>(?:(?!</p:sp>).)*?val="D9600B"', s, re.S).group(1))
            if xo0 == X0: s = ubah_sp(s, X0, yb, x_baru=X0 + 1); xo0 = X0 + 1   # oranye minggir dulu supaya navy bisa di X0
            blk = ''.join(s[a_:b_] for a_, b_ in sp_di(s, xo0, yb)).replace(f'<a:off x="{xo0}" y="{yb}"/>', f'<a:off x="{X0}" y="{yb}"/>').replace('val="D9600B"', 'val="051C2C"')
            blk = re.sub(r'<p:cNvPr id="\d+"', lambda m: (nid.__setitem__(0, nid[0] + 1), f'<p:cNvPr id="{nid[0]}"')[1], blk)
            s = s.replace('</p:spTree>', blk + '</p:spTree>'); navy = [x for x in sp_di(s, X0, yb) if 'val="051C2C"' in s[x[0]:x[1]]]
        if p:
            wn = round(p * U); s = ubah_sp(s, X0, yb, str(p), cx=wn)
            xo = int(re.search(rf'<a:off x="(\d+)" y="{yb}"/>(?:(?!</p:sp>).)*?val="D9600B"', s, re.S).group(1))
        else:
            for a_, b_ in reversed(navy): s = s[:a_] + s[b_:]
            wn = 0; xo = int(re.search(rf'<a:off x="(\d+)" y="{yb}"/>(?:(?!</p:sp>).)*?val="D9600B"', s, re.S).group(1))
        if w: s = ubah_sp(s, xo, yb, str(w), x_baru=X0 + wn, cx=round(w * U))
        else:
            for a_, b_ in reversed(sp_di(s, xo, yb)): s = s[:a_] + s[b_:]
        xt = int(re.search(rf'<a:off x="(\d+)" y="{y}"/>(?:(?!</p:sp>).)*?<a:t> unit</a:t>', s, re.S).group(1))
        s = ubah_sp(s, xt, y, str(p + w), x_baru=X0 + wn + round(w * U) + 91443)
    # padatkan: baris i pindah ke Y0 + i*P, tinggi kotak diskala P/P0
    P = min(P0, (6300000 - Y0) // N); k = P / P0
    def geser(m):
        x, y, cx, cy = map(int, m.groups())
        if x < 6329020 or not (Y0 <= y < Y0 + N * P0): return m.group(0)
        i, off = divmod(y - Y0, P0)
        return f'<a:off x="{x}" y="{Y0 + i * P + round(off * k)}"/><a:ext cx="{cx}" cy="{round(cy * k)}"/>'
    return re.sub(r'<a:off x="(\d+)" y="(\d+)"/><a:ext cx="(\d+)" cy="(\d+)"/>', geser, s)


zi = zipfile.ZipFile(MASUK); zo = zipfile.ZipFile(KELUAR, 'w', zipfile.ZIP_DEFLATED)
for it in zi.infolist():
    d = zi.read(it.filename)
    if it.filename == 'ppt/slides/slide1.xml': d = ganti_tabel(d.decode()).encode()
    if it.filename == 'ppt/slides/slide3.xml': d = ganti_operasi(d.decode()).encode()
    zo.writestr(it, d)
zo.close()
print('ok', KELUAR)
