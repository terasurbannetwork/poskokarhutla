"""Isi bagian deck yang bersumber laporan BNPB: PM2.5 dan cuaca dari Laporan Harian Dit. Koordalops 22102026, operasi dari ringkasan WA 23 Okt (data 22 Okt).
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
    Y = dict(kalteng=2316480, kalsel=2834640, sumsel=3352800, kalbar=3870960, kaltim=4389120, papsel=4907280)   # urutan hotspot 23 Okt
    # PM2.5 (µg/m3, BMKG pm2p5-obs, 23 Okt 04.00 WIB, Koordalops 22102026): Musi 2 Palembang 898,2, Banjarbaru 824,2, Palangkaraya 686,9,
    # Samarinda 265,4, Kubu Raya 127,0 (nilai ke-10); Papua Selatan di luar daftar. Jenis donor: Kalteng = berbahaya, Kalsel lama = tidak sehat.
    berbahaya, tdk_sehat = Y['kalteng'], Y['kalsel']
    s = isi_pil(s, X_PM, Y['kalbar'], '127 TIDAK SEHAT', donor_y=tdk_sehat)   # sebelum Kalsel berubah jenis
    s = isi_pil(s, X_PM, Y['kaltim'], '265 BERBAHAYA', donor_y=berbahaya)
    s = isi_pil(s, X_PM, Y['kalteng'], '687 BERBAHAYA')
    s = isi_pil(s, X_PM, Y['sumsel'], '898 BERBAHAYA')
    s = isi_pil(s, X_PM, Y['kalsel'], '824 BERBAHAYA', donor_y=berbahaya)
    s = isi_pil(s, X_PM, Y['papsel'], 'PM2.5 &lt; 127')
    # cuaca BMKG 23-25 Okt: hujan sedang di Sumsel, Kalbar, Kalteng, Kaltim, Papua Selatan; angin kencang di Kalbar, Kalteng, Kalsel.
    # Jenis donor: Papsel = hujan.
    hujan = Y['papsel']
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


# ringkasan WA "Laporan Penanganan Karhutla di Enam Provinsi Prioritas" 23 Okt (data 22 Okt): patroli/CASA/OMC ; heli WB, urut total menurun.
# Baris PEMILIK templat dibuang: pembagian BNPB/TNI 21 Okt adalah perkiraan dan tidak bisa diperbarui dari laporan 22 Okt.
ARMADA = [('Kalimantan Selatan', 8, 7), ('Kalimantan Barat', 3, 7), ('Kalimantan Tengah', 2, 8), ('Sumatera Selatan', 4, 5),
          ('Riau', 1, 4), ('Jambi', 2, 3), ('Lampung', 1, 1), ('Kalimantan Timur/IKN', 0, 1), ('Papua Selatan', 1, 0)]


def ganti_operasi(s):
    s = teks(s, '20', '22')                          # judul: '... per Tanggal ' + '20' + ' Oktober ' + '2026' (run terpisah)
    pat, wb = sum(r[1] for r in ARMADA), sum(r[2] for r in ARMADA)
    s = teks(s, '51', str(pat + wb))                 # subjudul: "... 58 armada udara"
    s = teks(s, '4 provinsi', '2 provinsi'); s = teks(s, '3 provinsi', '1 provinsi')   # OMC di Kalteng dan Sumsel; hujan di Kalteng (Murung Raya)
    s = teks(s, '15', str(pat))                      # kotak PENANGANAN: pesawat patroli/OMC
    assert wb == 36; s = teks(s, '51 unit', f'{pat + wb} unit')
    s = teks(s, '15 ', f'{pat} ')                   # '15 ' + 'patroli/CASA/OMC'
    # ---- hujan setelah OMC 22 Okt: sortie hanya di Kalteng (7) dan Sumsel (9); Kalbar dan Kalsel tanpa sortie
    s = teks(s, '19 Okt', '22 Okt'); s = teks(s, '3 dari 4 provinsi hujan', 'OMC di 2 provinsi')
    s = teks(s, 'Ketapang, Kayong Utara', 'tidak ada sortie, awan belum mendukung')
    s = ubah_sp(s, 3561885, 3170682, 'HUJAN RINGAN', cx=lebar_pil('HUJAN RINGAN'))
    s = teks(s, '13 kab/kota, termasuk 2 sasaran', 'Sambas, Singkawang, Mempawah, Sintang')
    s = teks(s, 'Barito Selatan, Seruyan, Kotawaringin Timur dan Barat', 'Murung Raya, Gunung Mas, Palangka Raya, TNTP')
    s = teks(s, 'di 4 kabupaten sasaran', 'di Murung Raya')
    s = teks(s, 'Ogan Ilir, OKI, Banyuasin, Palembang', 'Palembang, lintas Lampung–OKU Timur')
    # Sumsel: pil biru HUJAN SANGAT RINGAN -> pil abu BELUM HUJAN (salin jenis dari baris Kalsel), titik biru -> abu
    a, b = sp_di(s, 3561885, 4501134)[0], sp_di(s, 3561885, 4501134)[-1]
    donor = re.sub(r'y="4501134"', 'y="4057650"', s[a[0]:b[1]])
    c, d = sp_di(s, 3561885, 4057650)[0], sp_di(s, 3561885, 4057650)[-1]
    ids = re.findall(r'<p:cNvPr id="(\d+)"', s[c[0]:d[1]]); donor = re.sub(r'<p:cNvPr id="\d+"', lambda m, it=iter(ids): f'<p:cNvPr id="{next(it)}"', donor)
    s = s[:c[0]] + donor + s[d[1]:]
    (e, f), = sp_di(s, 676656, 4181094); s = s[:e] + s[e:f].replace('val="4A9BE0"', 'val="C4CAD3"') + s[f:]
    s = teks(s, 'Ogan Ilir dan Lahat', 'jarak pandang naik, PM2,5 turun')
    s = teks(s, 'Tabalong, Banjar, Barito Kuala', 'tidak ada sortie, armada siaga')
    s = teks(s, 'radar BMKG 24 jam', 'tidak ada laporan hujan 22 Okt')
    # ---- semai 22 Okt: Kalteng 7 sortie (5.000 kg dry ice + 1.000 kg NaCl); Sumsel 9 sortie (5.800 kg dry ice + 1.800 kg NaCl)
    s = teks(s, 'SEMAI DRY ICE', 'SEMAI OMC'); s = teks(s, 'BAHAN SEMAI', 'DRY ICE + NaCl')
    s = teks(s, '20 Okt', '22 Okt', 2)   # pil tanggal SEMAI dan ARMADA UDARA
    cx = lebar_pil('16 sortie, 13.600 kg') - 60000   # tepi kanan pil tetap (4.856.836 + 1.042.416), pil melebar ke kiri
    s = ubah_sp(s, 4856836, 4983480, '16 sortie, 13.600 kg', x_baru=4856836 + 1042416 - cx, cx=cx)
    s = teks(s, '3.900 kg', '6.000 kg'); s = teks(s, '800 kg', '7.600 kg'); s = teks(s, '5 sortie', '7 sortie'); s = teks(s, '1 sortie', '9 sortie')
    s = ubah_sp(s, 3561885, 5401818, 'HUJAN', cx=lebar_pil('HUJAN'))
    s = teks(s, 'pagi, 1.907 ke 1.200', 'Murung Raya, 22 Okt')
    s = teks(s, 'Palembang, 700 m ke 7.000 m', 'PM2,5 turun siang–sore')
    return armada(s)


def armada(s):
    """Batang armada per provinsi: skala satu unit = panjang 10 unit lama / unit terbanyak. Baris PEMILIK dibuang, tempatnya dipakai
    baris ke-9 (salinan baris Riau)."""
    Y = [2898648, 3282696, 3666744, 4050792, 4434840, 4818888, 5202936, 5586984, 5971032]
    X0, U = 7792060, 2863440 / max(p + w for _, p, w in ARMADA)
    # buang baris PEMILIK + garis pemisahnya
    s = re.sub(r'<p:sp>(?:(?!</p:sp>).)*?<a:off x="\d+" y="(?:6108192|6044184)"/>(?:(?!</p:sp>).)*?</p:sp>', '', s, flags=re.S)
    s = re.sub(r'<p:pic>(?:(?!</p:pic>).)*?<a:off x="\d+" y="6140196"/>(?:(?!</p:pic>).)*?</p:pic>', '', s, flags=re.S)
    assert 'PEMILIK' not in s
    # salin baris Riau ke baris ke-9
    dy = Y[8] - Y[4]; nid = [max(map(int, re.findall(r'<p:cNvPr id="(\d+)"', s)))]
    def salin(m):
        nid[0] += 1; b = m.group(0)
        b = re.sub(r'<a:off x="(\d+)" y="(\d+)"/>', lambda q: f'<a:off x="{q.group(1)}" y="{int(q.group(2)) + dy}"/>', b, count=1)
        return re.sub(r'<p:cNvPr id="\d+"', f'<p:cNvPr id="{nid[0]}"', b, count=1)
    riau = [m for m in re.finditer(r'<p:sp>(?:(?!</p:sp>).)*?</p:sp>', s, re.S)
            if re.search(r'<a:off x="(\d+)" y="(4434840|4489704)"/>', m.group(0)) and int(re.search(r'<a:off x="(\d+)"', m.group(0)).group(1)) >= 6329020]
    assert len(riau) == 6, len(riau)
    s = s.replace('</p:spTree>', ''.join(salin(m) for m in riau) + '</p:spTree>')
    lama = {}
    for y in Y:
        (a, b), = sp_di(s, 6329020, y); lama[y] = re.findall(r'<a:t>([^<]*)</a:t>', s[a:b])[0]
    assert [lama[y] for y in Y] == ['Kalimantan Barat', 'Kalimantan Tengah', 'Kalimantan Selatan', 'Sumatera Selatan', 'Riau', 'Jambi', 'Lampung', 'Kalimantan Timur/IKN', 'Riau']
    for y, (nama, p, w) in zip(Y, ARMADA):
        yb = y + 54864
        s = ubah_sp(s, 6329020, y, nama)
        navy = [x for x in sp_di(s, X0, yb) if 'val="051C2C"' in s[x[0]:x[1]]]
        if p:
            assert navy, nama
            wn = round(p * U); s = ubah_sp(s, X0, yb, str(p), cx=wn)
            xo = int(re.search(rf'<a:off x="(\d+)" y="{yb}"/>(?:(?!</p:sp>).)*?val="D9600B"', s, re.S).group(1))
        else:
            assert not navy, nama; wn = 0; xo = X0
        if w:
            s = ubah_sp(s, xo, yb, str(w), x_baru=X0 + wn, cx=round(w * U))
        else:   # tanpa heli WB: batang oranye dibuang
            for a_, b_ in reversed(sp_di(s, xo, yb)): s = s[:a_] + s[b_:]
        xt = int(re.search(rf'<a:off x="(\d+)" y="{y}"/>(?:(?!</p:sp>).)*?<a:t> unit</a:t>', s, re.S).group(1))
        s = ubah_sp(s, xt, y, str(p + w), x_baru=X0 + wn + round(w * U) + 91443)
    return s


zi = zipfile.ZipFile(MASUK); zo = zipfile.ZipFile(KELUAR, 'w', zipfile.ZIP_DEFLATED)
for it in zi.infolist():
    d = zi.read(it.filename)
    if it.filename == 'ppt/slides/slide1.xml': d = ganti_tabel(d.decode()).encode()
    if it.filename == 'ppt/slides/slide3.xml': d = ganti_operasi(d.decode()).encode()
    zo.writestr(it, d)
zo.close()
print('ok', KELUAR)
