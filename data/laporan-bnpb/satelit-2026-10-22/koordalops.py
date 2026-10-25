"""Isi bagian deck yang bersumber laporan BNPB dari Laporan Harian Dit. Koordalops BNPB 21102026 (data 21 Okt 2026).
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
    Y = dict(kalteng=2316480, sumsel=2834640, kalsel=3352800, papsel=3870960, sulteng=4389120, kaltim=4907280)
    # PM2.5 (µg/m3, BMKG pm2p5-obs, 22 Okt 06.00 WIB): Musi 2 Palembang 741, Pangkalanbun 673,0, Banjarbaru 418,8, Lore Lindu 511,0,
    # Samarinda 204,0; nilai ke-10 Muaro Jambi 141,2. Jenis donor: Kalteng = berbahaya, Kalsel lama = tidak sehat.
    berbahaya, tdk_sehat = Y['kalteng'], Y['kalsel']
    s = isi_pil(s, X_PM, Y['kaltim'], '204 TIDAK SEHAT', donor_y=tdk_sehat)   # sebelum Kalsel berubah jenis
    s = isi_pil(s, X_PM, Y['kalteng'], '673 BERBAHAYA')
    s = isi_pil(s, X_PM, Y['sumsel'], '741 BERBAHAYA')
    s = isi_pil(s, X_PM, Y['kalsel'], '419 BERBAHAYA', donor_y=berbahaya)
    s = isi_pil(s, X_PM, Y['papsel'], 'PM2.5 &lt; 141')
    s = isi_pil(s, X_PM, Y['sulteng'], '511 BERBAHAYA', donor_y=berbahaya)
    # cuaca sepekan BMKG: hujan sedang di Sumsel, Sulteng, Papua Selatan; angin kencang di Sumsel, Kalsel; Kalteng dan Kaltim
    # tidak disebut = umumnya cerah berawan hingga hujan ringan. Jenis donor: Kalteng = matahari, Papsel = hujan.
    matahari, hujan = Y['kalteng'], Y['papsel']
    s = isi_pil(s, X_CU, Y['kaltim'], 'CERAH BERAWAN', donor_y=matahari)
    s = isi_pil(s, X_CU, Y['sumsel'], 'HUJAN, ANGIN', donor_y=hujan)
    s = isi_pil(s, X_CU, Y['kalteng'], 'CERAH BERAWAN')
    s = isi_pil(s, X_CU, Y['kalsel'], 'ANGIN KENCANG')
    s = isi_pil(s, X_CU, Y['papsel'], 'HUJAN SEDANG')
    s = isi_pil(s, X_CU, Y['sulteng'], 'HUJAN SEDANG')
    return rep(s, '<a:t>prakiraan cuaca 20–22 Okt</a:t>', '<a:t>prakiraan cuaca 20–26 Okt</a:t>')


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


# ringkasan WA Koordalops 22 Okt (data 21 Okt): patroli/CASA/OMC ; heli WB, urut total menurun
ARMADA = [('Kalimantan Selatan', 7, 7), ('Kalimantan Barat', 3, 7), ('Kalimantan Tengah', 2, 8), ('Sumatera Selatan', 4, 5),
          ('Riau', 1, 4), ('Jambi', 2, 3), ('Lampung', 1, 1), ('Kalimantan Timur/IKN', 0, 1)]
# perkiraan: registrasi sipil = sewa BNPB, nomor militer (A-, H-, HA-) = TNI; Kalsel tidak punya bagian di PDF, 9 unit diasumsikan sipil
PEMILIK = [('BNPB', 44), ('TNI', 10), ('Kemenhut', 1), ('PT Sinarmas', 1)]


def ganti_operasi(s):
    s = teks(s, '20', '21')                          # judul: '... per Tanggal ' + '20' + ' Oktober ' + '2026' (run terpisah)
    pat, wb = sum(r[1] for r in ARMADA), sum(r[2] for r in ARMADA)
    s = teks(s, '51', str(pat + wb))                 # subjudul: "... 56 armada udara"
    s = teks(s, '3 provinsi', '2 provinsi')          # subjudul: OMC di 4 provinsi dengan hujan di 2 provinsi (Kalbar, Kalteng)
    s = teks(s, '15', str(pat))                      # kotak PENANGANAN: pesawat patroli/OMC
    assert wb == 36; s = teks(s, '51 unit', f'{pat + wb} unit')
    s = teks(s, '15 ', f'{pat} ')                   # '15 ' + 'patroli/CASA/OMC'
    # ---- hujan setelah OMC 21 Okt (laporan: OMC menghasilkan hujan di Kalbar dan Kalteng; Sumsel dan Kalsel tidak ada laporan hujan)
    s = teks(s, '19 Okt', '21 Okt'); s = teks(s, '3 dari 4 provinsi hujan', '2 dari 4 provinsi hujan')
    s = ubah_sp(s, 3561885, 3170682, 'HUJAN RINGAN–SEDANG', cx=lebar_pil('HUJAN RINGAN–SEDANG'))
    s = teks(s, '13 kab/kota, termasuk 2 sasaran', '8 kab/kota, termasuk Ketapang')
    s = teks(s, 'Barito Selatan, Seruyan, Kotawaringin Timur dan Barat', 'Palangka Raya, Kotawaringin Timur dan Barat, Seruyan, dll.')
    s = teks(s, 'di 4 kabupaten sasaran', 'di Kotawaringin Barat')
    s = teks(s, 'Ogan Ilir, OKI, Banyuasin, Palembang', 'Palembang, Banyuasin')
    # Sumsel: pil biru HUJAN SANGAT RINGAN -> pil abu BELUM HUJAN (salin jenis dari baris Kalsel), titik biru -> abu
    a, b = sp_di(s, 3561885, 4501134)[0], sp_di(s, 3561885, 4501134)[-1]
    donor = re.sub(r'y="4501134"', 'y="4057650"', s[a[0]:b[1]])
    c, d = sp_di(s, 3561885, 4057650)[0], sp_di(s, 3561885, 4057650)[-1]
    ids = re.findall(r'<p:cNvPr id="(\d+)"', s[c[0]:d[1]]); donor = re.sub(r'<p:cNvPr id="\d+"', lambda m, it=iter(ids): f'<p:cNvPr id="{next(it)}"', donor)
    s = s[:c[0]] + donor + s[d[1]:]
    (e, f), = sp_di(s, 676656, 4181094); s = s[:e] + s[e:f].replace('val="4A9BE0"', 'val="C4CAD3"') + s[f:]
    s = teks(s, 'Ogan Ilir dan Lahat', 'belum ada laporan hujan 21 Okt')
    s = teks(s, 'Tabalong, Banjar, Barito Kuala', 'Tabalong, Kotabaru, Tanah Bumbu, Banjar, Barito Kuala')
    s = teks(s, 'radar BMKG 24 jam', 'belum ada laporan hujan 21 Okt')
    # ---- semai dry ice 21 Okt: Kalteng 5 sortie 4.400 kg (PK-SNL, PK-SNC, A-2103, A-2107 x2); Sumsel 5 sortie 4.000 kg (A-2117 x3, A-2104, PK-SNP)
    s = teks(s, '20 Okt', '21 Okt', 2)   # pil tanggal SEMAI DRY ICE dan ARMADA UDARA
    cx = lebar_pil('10 sortie, 8.400 kg') - 60000   # tepi kanan pil tetap (4.856.836 + 1.042.416), pil melebar ke kiri
    s = ubah_sp(s, 4856836, 4983480, '10 sortie, 8.400 kg', x_baru=4856836 + 1042416 - cx, cx=cx)
    s = teks(s, '3.900 kg', '4.400 kg'); s = teks(s, '800 kg', '4.000 kg'); s = teks(s, '1 sortie', '5 sortie')
    s = ubah_sp(s, 3561885, 5401818, 'BELUM DILAPORKAN', cx=lebar_pil('BELUM DILAPORKAN'))
    (g, h), = [x for x in sp_di(s, 3561885, 5401818) if '<a:t>' not in s[x[0]:x[1]]]
    s = s[:g] + s[g:h].replace('val="4A9BE0"', 'val="E6EAF0"') + s[h:]
    i0 = s.find('<a:t>BELUM DILAPORKAN</a:t>'); j0 = s.rfind('<a:srgbClr val="FFFFFF"/>', 0, i0); s = s[:j0] + '<a:srgbClr val="2E3440"/>' + s[j0 + 25:]
    s = teks(s, 'pagi, 1.907 ke 1.200', 'ISPU Palangka Raya 1.293, berbahaya')
    s = teks(s, 'Palembang, 700 m ke 7.000 m', 'Palembang, 200 m ke 2,5 km')
    return armada(s)


def armada(s):
    """Batang armada per provinsi: skala satu unit = panjang 10 unit lama / unit terbanyak, supaya batang terpanjang tetap selebar dulu."""
    Y = [2898648, 3282696, 3666744, 4050792, 4434840, 4818888, 5202936, 5586984]
    X0, U = 7792060, 2863440 / max(p + w for _, p, w in ARMADA)
    lama = {}
    for y in Y:   # baca teks lama tiap baris
        (a, b), = sp_di(s, 6329020, y); lama[y] = re.findall(r'<a:t>([^<]*)</a:t>', s[a:b])[0]
    assert [lama[y] for y in Y] == ['Kalimantan Barat', 'Kalimantan Tengah', 'Kalimantan Selatan', 'Sumatera Selatan', 'Riau', 'Jambi', 'Lampung', 'Kalimantan Timur/IKN']
    for y, (nama, p, w) in zip(Y, ARMADA):
        yb = y + 54864
        s = ubah_sp(s, 6329020, y, nama)
        navy = [x for x in sp_di(s, X0, yb) if 'val="051C2C"' in s[x[0]:x[1]]]
        if p:
            assert navy, nama
            wn = round(p * U); s = ubah_sp(s, X0, yb, str(p), cx=wn)
            # oranye: cari bentuk di baris ini selain navy
            xo = int(re.search(rf'<a:off x="(\d+)" y="{yb}"/>(?:(?!</p:sp>).)*?val="D9600B"', s, re.S).group(1))
        else:
            assert not navy, nama; wn = 0; xo = X0
        s = ubah_sp(s, xo, yb, str(w), x_baru=X0 + wn, cx=round(w * U))
        xt = int(re.search(rf'<a:off x="(\d+)" y="{y}"/>(?:(?!</p:sp>).)*?<a:t> unit</a:t>', s, re.S).group(1))
        s = ubah_sp(s, xt, y, str(p + w), x_baru=X0 + wn + round(w * U) + 91443)
    for lab, n in PEMILIK:   # '<lab>  ' + '<n>' (run terpisah)
        s, k = re.subn(rf'(<a:t>{lab}  </a:t>(?:(?!</p:sp>).)*?<a:t>)\d+(</a:t>)', rf'\g<1>{n}\g<2>', s, count=1, flags=re.S); assert k == 1, lab
    return s


zi = zipfile.ZipFile(MASUK); zo = zipfile.ZipFile(KELUAR, 'w', zipfile.ZIP_DEFLATED)
for it in zi.infolist():
    d = zi.read(it.filename)
    if it.filename == 'ppt/slides/slide1.xml': d = ganti_tabel(d.decode()).encode()
    if it.filename == 'ppt/slides/slide3.xml': d = ganti_operasi(d.decode()).encode()
    zo.writestr(it, d)
zo.close()
print('ok', KELUAR)
