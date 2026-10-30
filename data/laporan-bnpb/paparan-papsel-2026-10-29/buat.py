"""Paparan Karhutla Provinsi Papua Selatan 291026 (per 29 Okt, cut-off 29 Okt 2026 24.00 WIB, hari penuh). Dua pola dari satu pembangun:
  bawaan  = pola paparan Jambi 241026: 4 slide (provinsi, Kab. Merauke, koridor Jagebob-Tanah Miring, banjir dan longsor 30 Okt-2 Nov);
  --3d    = pola paparan Jambi 251026: 2 slide (provinsi dengan peta 3D miring + slot foto, banjir dan longsor).
Templat = deck pemilik "Paparan Karhutla Jawa Timur - Malang - Arjuno 221026.pptx" (ref/j221026.pptx). Pembangun Jambi/Lampung memakai
versi 231026 yang tidak ada di mesin ini; posisi blok 221026 sama, jadi jangkar teks di sini memakai teks 221026 dan tabel kab/kota
digambar ulang dari blok prototipe (221026 masih punya kolom persen). Angka dari angka.json (angka.py; sumber tiap angka di docstring-nya),
peta dari peta.py + render.mjs, ikon pil dari ikon.mjs (ik/). Semua titik, luas, belum padam = data kita (situs), bukan angka lapangan
(laphar: luas 63 ha pendataan). Angka kecamatan berjendela 24-29 Okt (hotspot.json tidak memuat 22-23 Okt). Cluster = keadaan akhir 29 Okt.
Fakta lapangan: Laphar Dit. Koordalops 28 Okt entri 3 (Merauke) dan rekap WA 29 Okt, WA Satgas 28-29 Okt, WA BMKG 29 Okt.
Pakai: python3 buat.py ref/j221026.pptx keluar.pptx [--3d]"""
import json, math, os, re, subprocess, sys, zipfile
from pp import Slide, inst, geom, teks, isi, f0, pct, warna_batang, GEO, NID, tx, bentuk, gambar

sys.path.insert(0, '../generator')
from peta3d import Peta3D  # noqa: E402
import foto as FOTO  # noqa: E402

AKAR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
REF, OUT = sys.argv[1], sys.argv[2]; TIGA_D = '--3d' in sys.argv
A = json.load(open('angka.json'))
P, FK, KW, HARI, HK, BJ, KEC = A['prov'], A['kab']['Merauke'], A['kaw'], A['HARI'], A['HK'], A['banjir'], A['kec']
KKN = A['kaw_nama']
zi = zipfile.ZipFile(REF); F = {n: zi.read(n) for n in zi.namelist()}
S = {i: Slide(F[f'ppt/slides/slide{i}.xml'].decode()) for i in (1, 2, 3, 4)}
RELS = {i: F[f'ppt/slides/_rels/slide{i}.xml.rels'].decode() for i in (1, 2, 3, 4)}
CUT = '29 Okt 2026, 24.00 WIB'; HR, HR1, JD, JK = '29 Okt', '28 Okt', '22–29 Okt', '24–29 Okt'
LEVEL = {3: ('Prioritas', 'C8102E'), 2: ('Siaga', 'E07A2E'), 1: ('Patroli', 'F2C9A0'), 0: ('Rutin', 'B4BDC8')}
KAWN = 'Jagebob–Tanah Miring'
kec = lambda kab, k: KEC[f'{kab}|{k}']   # hot = deret 24-29 Okt, luas/belum = 29 Okt


def rel(i, target):
    """rId gambar di ppt/media; ikon lpg-ik-* disalin dari ik/ saat pertama dipakai."""
    m = re.search(rf'Id="(\w+)" Type="[^"]*/image" Target="../media/{re.escape(target)}"', RELS[i])
    if m: return m.group(1)
    if target.startswith('lpg-ik-') and f'ppt/media/{target}' not in F: F[f'ppt/media/{target}'] = open('ik/' + target, 'rb').read()
    assert f'ppt/media/{target}' in F, target
    rid = f'rIdL{len(re.findall("rIdL", RELS[i])) + 1}'
    RELS[i] = RELS[i].replace('</Relationships>', f'<Relationship Id="{rid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/{target}"/></Relationships>')
    return rid


ik = lambda i, n, w: rel(i, f'lpg-ik-{n}-{w}.png')
GAYA = {'merah': ('F8DDE0', 'C8102E', 'merah'), 'navy': ('E6EAF0', '051C2C', 'navy'), 'oranye': ('FBE7D6', 'D9600B', 'oranye'), 'abu': ('E6EAF0', '051C2C', 'navy'),
        'biru': ('DCEBF8', '2F86D1', 'biru')}
STATUS = {'belum padam': ('merah', 'api'), 'prioritas': ('merah', 'awas'), 'berjalan': ('oranye', 'putar'), 'pantau': ('navy', 'mata'), 'kumulatif': ('navy', 'lapis'), 'selesai': ('navy', 'centang')}


def pil(i, x, y, t, gaya, ikon, h=137160, sz=600, kar=None, w=None):
    """Pil berikon: kotak membulat penuh, pad kiri 5 pt, ikon 60% tinggi, jeda 3 pt, teks tebal, pad kanan 6 pt. -> (xml, lebar)."""
    f, c, wi = GAYA[gaya]; s_ik = round(h * 0.6); kar = kar or round(sz * 76)
    w = w or 63500 + s_ik + 38100 + kar * len(t) + 76200
    o = bentuk(x, y, w, h, f, 'roundRect', {'adj': 50000}) + gambar(x + 63500, y + (h - s_ik) / 2, s_ik, s_ik, ik(i, ikon, wi))
    o += tx(x + 63500 + s_ik + 38100, y, w - 63500 - s_ik - 38100 - 38100, h, [(t, sz, True, c)])
    return o, w


def deret(i, x, y, chips, xmaks, h=137160, gap=45720, lipat=False):
    o, x0 = '', x
    for t, gy, ikon in chips:
        p, w = pil(i, x, y, t, gy, ikon, h)
        if lipat and x + w > xmaks and x > x0:
            x, y = x0, y + h + 36576; p, w = pil(i, x, y, t, gy, ikon, h)
        o += p; x += w + gap
        assert x - gap <= xmaks, (chips, x, xmaks)
    return o


def status_pil(i, xkanan, y, t):
    gy, ikon = STATUS[t]; w = pil(i, 0, 0, t, gy, ikon)[1]
    return pil(i, xkanan - w, y, t, gy, ikon)[0]


def baris(i, x0, y0, xkanan, judul, chips, status, bulat, ikon_putih):
    """Baris panel status: bulatan berikon, judul, pil status rata kanan, deret pil berikon di bawah judul."""
    o = bentuk(x0 - 265176, y0 + 18288, 201168, 201168, bulat, 'ellipse') + gambar(x0 - 224028, y0 + 59436, 118872, 118872, ik(i, ikon_putih, 'putih'))
    o += tx(x0, y0, xkanan - x0 - 900000, 146304, [(judul, 760, True, '1A1A1A')])
    o += status_pil(i, xkanan, y0 + 4572, status)
    return o + deret(i, x0, y0 + 160020, chips, xkanan)


def ganti_ikon(s, i, x, y, nama):
    s.ubah(Slide.di(x, y), lambda b: re.sub(r'r:embed="\w+"', f'r:embed="{rel(i, nama)}"', b), 1)


def garis(x, y, w, warna, tebal=6350):
    NID[0] += 1
    return (f'<p:cxnSp><p:nvCxnSpPr><p:cNvPr id="{NID[0]}" name="L"/><p:cNvCxnSpPr/><p:nvPr/></p:nvCxnSpPr><p:spPr><a:xfrm><a:off x="{int(x)}" y="{int(y)}"/>'
            f'<a:ext cx="{int(w)}" cy="0"/></a:xfrm><a:prstGeom prst="line"><a:avLst/></a:prstGeom><a:ln w="{tebal}"><a:solidFill><a:srgbClr val="{warna}"/></a:solidFill></a:ln></p:spPr></p:cxnSp>')


def grafik(i, x0, x1, base, maxh, vals, hari, lab_y, pct_y, bw_frac=0.62, sz_v=760, sz_d=650, sz_p=600, pct_on=True, lab_akhir=True):
    """Grafik batang harian: batang pertama DCE1E7, hari lama tint, tiga terakhir pekat, naik D9600B, turun 2F86D1.
    Hari terakhir hari penuh (cut-off 24.00), jadi digambar pekat seperti hari lain. Nilai di atas, tanggal di bawah."""
    n = len(vals); slot = (x1 - x0) / n; bw = slot * bw_frac; m = max(vals) or 1
    o = garis(x0, base, x1 - x0, 'BFC5CC', 9525)
    for k, v in enumerate(vals):
        cx = x0 + slot * (k + .5); h = max(18288, v / m * maxh); top = base - h
        o += bentuk(cx - bw / 2, top, bw, h, warna_batang(k, v, vals[k - 1] if k else v), 'round2SameRect', {'adj1': 22000, 'adj2': 0})
        o += tx(cx - slot / 2, top - 30000 - sz_v * 160, slot, sz_v * 150, [(f0(v), sz_v, True, '051C2C')], al='ctr', an='b')
        d = hari[k][8:].lstrip('0')
        o += tx(cx - slot / 2, lab_y, slot, sz_d * 140, [(f'{d} Okt' if k == n - 1 and lab_akhir else d, sz_d, False, '6B7280')], al='ctr', an='t')
        if k and pct_on:
            t, cc = pct(vals[k - 1], v); o += tx(cx - slot / 2, pct_y, slot, sz_p * 140, [(t, sz_p, True, cc)], al='ctr', an='t')
    return o


def kartu_label(s, x, y, nilai, label, ikon=None, i=None, latar=None, warna=None):
    """Kartu template di (x, y) = posisi angka: ganti angka, label, ikon dan warna."""
    lama = [teks(b) for b in s.cari(Slide.di(x, y, True))][0]; s.T(lama, nilai, at=(x, y))
    lama = [teks(b) for b in s.cari(Slide.di(x, y + 265176, True))][0]; s.T(lama, label, at=(x, y + 265176))
    if warna: s.ubah(Slide.di(x, y, True), lambda b: re.sub(r'(<a:solidFill><a:srgbClr val=")\w+', rf'\g<1>{warna}', b))
    if latar: s.ubah(Slide.di(x - 402336, y + 73152), lambda b: re.sub(r'(<a:solidFill><a:srgbClr val=")\w+', rf'\g<1>{latar}', b, count=1), 1)
    if ikon: ganti_ikon(s, i, x - 329184, y + 146304, ikon)


# ================================================================== umum
for i in (1, 2, 3):
    S[i].T('22 Okt 2026, 23.00 WIB', CUT)
    S[i].T('*Data berdasarkan Geographic Information System (GIS) dengan satelit NASA (FIRMS: VIIRS dan MODIS).', '*Data berdasarkan Geographic Information System (GIS) dengan satelit NASA (FIRMS: VIIRS dan MODIS). 24 Okt ditandai celah lintasan satelit di FIRMS: titik hari itu bisa terlalu rendah.')
S[4].T('*Data berdasarkan Geographic Information System (GIS) dengan satelit NASA (FIRMS: VIIRS dan MODIS).', '*Status banjir dan longsor serta hujan 3 hari terbesar (jendela 29 Okt–3 Nov): sistem pantau banjir kita dari prakiraan hujan '
       'Open-Meteo. Kejadian: DIBI BNPB 2008–2025. Hujan dan angin: WA BMKG 29 Okt.')

# ================================================================== SLIDE 1: provinsi
s1 = S[1]
s1.T('Sebaran Titik Panas dan Kebakaran di Jawa Timur per 22 Oktober', ['Sebaran Titik Panas dan Kebakaran di ', 'Papua Selatan', ' per 29 Oktober'])
kartu_label(s1, 1170432, 1673352, f0(P['hot'][-1]), f'titik panas {HR}')
kartu_label(s1, 2931109, 1673352, f"{f0(P['luas'][-1])} ha", f'luas terbakar {HR}')
kartu_label(s1, 4691786, 1673352, f"{f0(P['belum'][-1])} ha", f'belum padam {HR}')
kartu_label(s1, 8615477, 1673352, str(A['prio_total']), 'cluster Prioritas')
kartu_label(s1, 10376154, 1673352, '1–5 km', 'jarak pandang (laphar)', 'lpg-ik-mata-navy.png', 1, 'E6EAF0', '051C2C')
KOTAK = None
if TIGA_D:   # peta 3D miring (generator/peta3d.py) menggantikan PNG peta; penanda cluster dan nomor native
    mp = [b for b in s1.blok() if b.startswith('<p:pic>') and 'r:embed="rIdM9"' in b]; assert len(mp) == 1
    KOTAK = geom(mp[0]); s1.hapus(lambda b: b == mp[0])
    KL = [{'lon': lo, 'lat': la, 'level': lv} for lo, la, lv in A['kl']]   # keadaan akhir 29 Okt, level >= 1 (arsip tanpa pusat Rutin)
    ada = {k for k, v in A['kab'].items() if v['komp']}
    KABF = json.load(open(os.path.join(AKAR, 'public/geo/kabupaten/93.json')))['features']
    kx, ky, kw, kh = KOTAK; KOTAK3 = (kx, ky, round(kw * 0.62), kh)   # provinsi tinggi: 62% kiri kotak, label cluster di kanan
    PT = Peta3D(KABF, KOTAK3, lambda f: 'Kabupaten - ' + f['properties']['kab'],
                lambda f: ('D3DBE5', 'FFFFFF') if f['properties']['kab'] in ada else ('E6EAF0', 'A9B4C2'))
    open('bayangan.svg', 'w').write(PT.bayangan_svg())
    subprocess.run(['node', 'render.mjs', 'bayangan.svg', 'bayangan.png'], check=True)
    F['ppt/media/pps-bayangan.png'] = open('bayangan.png', 'rb').read()
    bx, by, bw, bh = PT.kotak_bayangan
    o = gambar(bx, by, bw, bh, rel(1, 'pps-bayangan.png')) + PT.xml()
    R_LV = {0: 27940, 1: 34925, 2: 50800, 3: 58420}   # jari-jari penanda 2,2 / 2,75 / 4 / 4,6 pt
    for c in sorted(KL, key=lambda c: c['level']):
        x, y = PT.titik(c['lon'], c['lat']); r = R_LV[c['level']]
        o += bentuk(x - r, y - r, 2 * r, 2 * r, LEVEL[c['level']][1], 'ellipse', ln='FFFFFF', lw=6350)
    GESER = ((110000, -110000), (110000, -120000), (-130000, 110000))   # 1 Kontuar dan 3 Waan berdempet: digeser berlawanan
    for i, c in enumerate(A['prio'], 1):
        x0, y0 = PT.titik(c['lon'], c['lat']); x, y = x0 + GESER[i - 1][0], y0 + GESER[i - 1][1]; r = 69850
        lx, ly = min(x0, x), min(y0, y); fl = (' flipH="1"' if (x < x0) != (y < y0) else '')
        o += (f'<p:cxnSp><p:nvCxnSpPr><p:cNvPr id="{8900 + i}" name="Penunjuk {i}"/><p:cNvCxnSpPr/><p:nvPr/></p:nvCxnSpPr><p:spPr><a:xfrm{fl}><a:off x="{int(lx)}" y="{int(ly)}"/>'
              f'<a:ext cx="{int(abs(x - x0))}" cy="{int(abs(y - y0))}"/></a:xfrm><a:prstGeom prst="line"><a:avLst/></a:prstGeom><a:ln w="9525"><a:solidFill><a:srgbClr val="{LEVEL[c["level"]][1]}"/></a:solidFill></a:ln></p:spPr></p:cxnSp>')
        o += bentuk(x - r, y - r, 2 * r, 2 * r, LEVEL[c['level']][1], 'ellipse', ln='FFFFFF', lw=15875)
        o += tx(x - r, y - r, 2 * r, 2 * r, [(str(i), 600, True, 'FFFFFF')], al='ctr')
    s1.tambah(o)
else:
    RELS[1] = RELS[1].replace('../media/jt-jatim3.png', '../media/pps-peta-papsel.png'); F['ppt/media/pps-peta-papsel.png'] = open('peta-papsel.png', 'rb').read()
# label 3 cluster teratas di kanan peta (Papua Selatan menempati 60% kiri kotak peta)
o = ''
XL = 3420000
for k, (y, c) in enumerate(zip((4170000, 4316304, 4462608), A['prio'])):
    nm, wn = LEVEL[c['level']]
    t1, t2 = f"{c['kec']}, {c['kab']}", '  ' + nm; w = 36000 * len(t1 + t2) + 230000
    assert XL + w < 4846320, (t1, w)
    o += bentuk(XL, y, w, 128016, 'FFFFFF', 'roundRect', {'adj': 50000}, ln=wn, lw=6350)
    o += bentuk(XL + 27432, y + 18288, 91440, 91440, wn, 'ellipse') + tx(XL + 27432, y + 18288, 91440, 91440, [(str(k + 1), 500, True, 'FFFFFF')], al='ctr')
    o += tx(XL + 155808, y, w - 180000, 128016, [(t1, 560, True, '1A1A1A'), (t2, 560, True, wn)])
# legenda cluster menggantikan legenda lingkaran 221026
s1.hapus(lambda b: (g := geom(b)) and g[1] in (4974336, 5001768) and g[0] < 5300000)
L = A['level']
o += tx(640080, 4974336, 1400000, 173736, [(f"{f0(A['n_komp'])} CLUSTER AKTIF", 700, True, '051C2C')], spc=60)
for nx, lv in zip((2070000, 2750000, 3350000, 4050000), (3, 2, 1, 0)):
    o += bentuk(nx, 5001768, 118872, 118872, LEVEL[lv][1], 'ellipse') + tx(nx + 155448, 4974336, 600000, 173736, [(f"{LEVEL[lv][0]} {f0(L.get(str(lv), 0))}", 700, lv == 3, 'C8102E' if lv == 3 else '6B7280')])
s1.tambah(o)
# tabel kab/kota: kepala pil baru, baris digambar ulang dari blok prototipe 221026 (tanpa kolom persen)
s1.hapus(lambda b: (gg := geom(b)) and gg[0] >= 6000000 and gg[1] in (2349500, 2395220))
KOL, xk, o = [('TITIK*', '051C2C', 'api'), ('LUAS (HA)*', '3F5F80', 'luas'), ('BELUM PADAM*', 'C8102E', 'awas'), ('CLUSTER AKTIF', 'B5480A', 'pin')], 6060000, ''
UJUNG = []
for nama, warna_, ikn in KOL:
    w = 36576 + 82296 + 27432 + 40000 * len(nama) + 36576
    o += bentuk(xk, 2349500, w, 210312, warna_, 'roundRect', {'adj': 30000}) + gambar(xk + 36576, 2349500 + 64008, 82296, 82296, ik(1, ikn, 'putih'))
    o += tx(xk + 36576 + 82296 + 27432, 2349500, w - 146304, 210312, [(nama, 520, True, 'FFFFFF')])
    UJUNG.append(xk + w); xk += w + 18288
assert xk - 18288 <= 8532080, xk
proto = lambda pred: [b for b in s1.blok() if pred(b)][0]
Y1, RH = 2624328, 219456
PR = {'garis': proto(lambda b: b.startswith('<p:cxnSp>') and geom(b)[:2] == (4983480, Y1 + RH)),
      'sorot': proto(lambda b: 'val="FDF1E8"' in b), 'bulat': proto(lambda b: geom(b)[:2] == (5001768, Y1 + 22860) and not isi(b)),
      'nomor': proto(Slide.di(5001768, Y1 + 22860, True)), 'nama': proto(Slide.di(5248656, Y1, True)), 'nilai': proto(Slide.di(6012080, Y1, True)),
      'tlatar': proto(lambda b: geom(b)[:2] == (4983480, 4837176) and not isi(b)), 'tnama': proto(Slide.di(5074920, 4837176, True)),
      'tnilai': proto(Slide.di(6012080, 4837176, True))}
s1.hapus(lambda b: (g := geom(b)) and 4983480 <= g[0] < 8600000 and Y1 - 1000 <= g[1] <= 4837176)
for k, kb in enumerate(A['rank']):
    y = Y1 + k * RH; d = A['kab'][kb]
    if kb == 'Merauke': o += inst(PR['sorot'], y=y)
    if k: o += inst(PR['garis'], y=y)
    o += inst(PR['bulat'], y=y + 22860) + inst(PR['nomor'], y=y + 22860, runs=str(k + 1))
    o += inst(PR['nama'], y=y, runs=kb).replace('wrap="square"', 'wrap="none"')
    for ujung, v in zip(UJUNG, (d['hot'][-1], d['luas'][-1], d['belum'][-1], d['komp'])):
        o += inst(PR['nilai'], x=ujung - 54864 - geom(PR['nilai'])[2], y=y, runs=f0(v))
YT = Y1 + len(A['rank']) * RH + 45720
o += inst(PR['tlatar'], y=YT) + inst(PR['tnama'], y=YT, runs='Papua Selatan')
for ujung, v in zip(UJUNG, (P['hot'][-1], P['luas'][-1], P['belum'][-1], A['n_komp'])):
    o += inst(PR['tnilai'], x=ujung - 54864 - geom(PR['tnilai'])[2], y=YT, runs=f0(v))
o += tx(4983480, YT + 290000, 3548600, 100000, [('*29 Okt 2026, hari penuh s.d. 24.00 WIB; tiap baris dibulatkan sendiri, jumlah bisa selisih 1', 650, False, '6B7280')])
# bar komposisi titik 8 hari: Merauke vs kab lain
tot = {k: sum(A['kab'][k]['hot']) for k in A['rank']}; nm_, sm = tot['Merauke'], sum(tot.values()); p_m = round(nm_ / sm * 100)
X0, X1, YB, HB = 4983480, 8532080, YT + 760000, 200000
w_t = round((X1 - X0) * nm_ / sm)
o += tx(X0, YB - 130000, 2400000, 100000, [(f'SEBARAN TITIK {JD.upper()}', 660, True, '6B7280')], spc=100, an='b')
o += bentuk(X0, YB, X1 - X0, HB, 'DCE1E7', 'roundRect', {'adj': 50000})
o += bentuk(X0, YB, HB, HB, 'D9600B', 'ellipse') + bentuk(X0 + HB / 2, YB, w_t - HB / 2, HB, 'D9600B')
o += gambar(X0 + 91440, YB + (HB - 118872) / 2, 118872, 118872, ik(1, 'pin', 'putih'))
o += tx(X0 + 246888, YB, w_t - 300000, HB, [(f'Merauke  {f0(nm_)} titik ({p_m}%)', 700, True, 'FFFFFF')])
o += tx(X0 + w_t, YB, X1 - X0 - w_t, HB, [(f'{100 - p_m}%', 650, True, '2E3440')], al='ctr')
lain = ', '.join(f'{k} {f0(tot[k])}' for k in sorted(tot, key=lambda k: -tot[k]) if k != 'Merauke')
o += tx(X0, YB + HB + 50000, X1 - X0, 120000, [('Kab. lain: ', 650, True, '2E3440'), (lain + ' titik', 650, False, '2E3440')], an='t')
s1.tambah(o)
# panel kejadian dan status
s1.hapus(lambda b: (g := geom(b)) and 8820000 <= g[0] and 2820000 <= g[1] < 5200000)
BARIS = []
for kab_, kec_ in dict.fromkeys((c['kab'], c['kec']) for c in A['prio']):
    d = kec(kab_, kec_); bp = d['belum']
    BARIS.append((f"{kec_}, {kab_}", [(f"{f0(d['hot'][-1])} titik {HR}", 'oranye', 'api'), (f"belum padam {f0(bp)} ha", 'merah', 'awas')],
                  'belum padam' if bp else 'pantau', 'D9600B' if bp else '5B7A99', 'api'))
OMC = ('OMC BNPB, sejak 22 Okt', [('9 sortie s.d. 27 Okt', 'navy', 'pesawat'), ('9.000 kg bahan semai', 'navy', 'tetes')], 'berjalan', '051C2C', 'pesawat')
TD = ('Tanggap Darurat Prov. Papua Selatan', [('14–28 Okt', 'navy', 'kalender'), ('perpanjangan belum tercatat', 'merah', 'awas')], 'pantau', '5B7A99', 'perisai')
KUM = ('Karhutla 2026', [(f"{f0(P['kum'])} ha terbakar", 'oranye', 'luas'), (f'1 Jan–{HR}', 'navy', 'kalender')], 'kumulatif', '051C2C', 'lapis')
BARIS += [TD, KUM] if TIGA_D else [OMC, TD, KUM]
PIT = 290000 if TIGA_D else 320040   # --3d: lima baris + slot foto >= 50 pt, tanpa garis pemisah (tak ada celah)
s1.T('7', str(len(BARIS)), at=(10543055, 2386584))
o = ''
for k, (j, ch, st, bl, ikb) in enumerate(BARIS):
    y0 = 2834640 + k * PIT
    if k and not TIGA_D: o += garis(8823960, y0 - 22860, 2681935, 'F1F2F4')
    o += baris(1, 9089136, y0, 11505895, j, ch, st, bl, ikb)
if TIGA_D:   # slot foto: sisa ruang panel di bawah baris terakhir, hanya bila >= 50 pt
    FY = 2834640 + (len(BARIS) - 1) * PIT + 297180 + 91440; FB = 2331720 + 2788920 - 91440
    assert FB - FY >= 635000, ('slot foto < 50 pt', FB - FY)
    FJ = os.path.join(AKAR, 'data/kajian-bnpb/gambar/foto/mit-b10-pemadam.jpg')
    F['ppt/media/pps-foto-pemadam.jpg'] = open(FJ, 'rb').read()
    o += FOTO.slot(8823960, FY, 11505895 - 8823960, FB - FY, rel(1, 'pps-foto-pemadam.jpg'), FJ,
                   'Foto: DenY Krisbiyantoro, CC BY-SA 4.0', 'Pemadaman bara gambut, Sebangau, Kalteng, 2019')
s1.tambah(o)
# pita bawah: tren titik 8 hari
s1.hapus(lambda b: (g := geom(b)) and 5150000 <= g[1] < 6200000)
o = bentuk(658368, 5394960, 1340000, 182880, '051C2C', 'roundRect', {'adj': 50000}) + gambar(731520, 5431536, 109728, 109728, rel(1, 'jt-ik-api-putih.png'))
o += tx(896112, 5394960, 1080000, 182880, [('TREN TITIK PANAS', 660, True, 'FFFFFF')], spc=100)
t, c = pct(P['hot'][-2], P['hot'][-1])
o += tx(7000000, 5394960, 4533327, 182880, [(t, 760, True, c), (f'  {HR} dibanding {HR1}', 700, False, '6B7280')], al='r')
o += grafik(1, 658368, 11533327, 5940000, 300000, P['hot'], HARI, 5955000, 6047000, bw_frac=0.58)
s1.tambah(o)

# ================================================================== SLIDE 2: Kab. Merauke
s2 = S[2]
s2.T('Sebaran Titik Panas dan Kebakaran di Kab. Malang per 22 Oktober', ['Sebaran Titik Panas dan Kebakaran di ', 'Kab. Merauke', ' per 29 Oktober'])
kartu_label(s2, 1170432, 1673352, f0(FK['hot'][-1]), f'titik panas {HR}')
kartu_label(s2, 2931109, 1673352, f"{f0(FK['luas'][-1])} ha", f'luas terbakar {HR}')
kartu_label(s2, 4691786, 1673352, f"{f0(FK['belum'][-1])} ha", f'belum padam {HR}')
KB, VB = A['fk_belum']
kartu_label(s2, 8615477, 1673352, f'{f0(VB)} ha', f'belum padam {KB}')
kartu_label(s2, 10376154, 1673352, '9 sortie', 'OMC s.d. 27 Okt', 'lpg-ik-pesawat-navy.png', 2, None, '051C2C')
s2.T('Tren harian 15–22 Oktober', 'Tren Harian')
s2.hapus(lambda b: (g := geom(b)) and g[0] < 6000000 and 2800000 <= g[1] < 6150000)
o = ''
for k, (judul, v) in enumerate((('Titik panas', FK['hot']), ('Luas terbakar (ha)', FK['luas']), ('Belum padam (ha)', FK['belum']))):
    y0 = 2843784 + k * 1100000
    o += tx(685800, y0, 4220640, 228600, [(judul, 900, True, '1A1A1A')])
    o += grafik(2, 685800, 5815584, y0 + 780000, 360000, v, HARI, y0 + 798000, y0 + 890000, bw_frac=0.62)
s2.tambah(o)
# titik per kecamatan; pil = kecamatan ber-cluster Prioritas, atau gambut
s2.T('Titik panas per kecamatan, 15–22 Okt', f'Titik Panas per Kecamatan, {JK}'); s2.T('394', f0(sum(FK['hot'][2:])), at=(10543055, 2386584))
YK = [2852928, 3081528, 3310128, 3538728, 3767328, 3995928]
kl6 = A['fk_kec'][:6]; mx = kl6[0][1]; GB = set(A['gambut_kec']); LVK = A['lv_kec']
assert sum(n for _, n in A['fk_kec']) == sum(FK['hot'][2:]), 'kecamatan Merauke != kab'
s2.hapus(lambda b: (g := geom(b)) and g[0] == 7507224 and 2850000 < g[1] < 4100000)
o = ''
for y, (k, n) in zip(YK, kl6):
    tag = ('Prioritas', 'merah', 'awas') if LVK[f'Merauke|{k}'] == 3 else ('gambut', 'oranye', 'gambut') if f'Merauke|{k}' in GB else None
    lama = [teks(b) for b in s2.cari(Slide.di(6446520, y, True))][0]; s2.T(lama, k, at=(6446520, y))
    if tag: o += pil(2, 7507224, y + 22860, tag[0], tag[1], tag[2], h=182880, sz=660, w=760000)[0]
    wb = max(36576, round(n / mx * 2400000))
    s2.ubah(Slide.di(8641080, y + 54864), lambda b: re.sub(r'val="\w+"', f'val="{"D9600B" if tag else "A9B4C2"}"', b, count=1), 1); s2.G(8641080, y + 54864, cx=wb)
    xv = [geom(b)[0] for b in s2.blok() if (g := geom(b)) and g[1] == y and g[2] == 500000 and isi(b)][0]
    lama = [teks(b) for b in s2.cari(Slide.di(xv, y, True))][0]; s2.T(lama, f0(n), at=(xv, y)); s2.G(xv, y, nx=8641080 + wb + 54864)
s2.tambah(o)
s2.ubah(lambda b: (gg := geom(b)) and gg[0] >= 6200000 and 2852928 < gg[1] < 4251960,
        lambda b: re.sub(r'<a:off x="(\d+)" y="(\d+)"/>', lambda m: f'<a:off x="{m.group(1)}" y="{round(2852928 + (int(m.group(2)) - 2852928) * 0.83)}"/>', b, count=1))
# bar komposisi titik Merauke: koridor Jagebob-Tanah Miring, Pulau Kimaam, lainnya
s2.hapus(lambda b: (g := geom(b)) and g[1] == 4251960)
nk = sum(KW['hot']); ni = A['kimaam']['hot']; nt = sum(FK['hot'][2:]); nl = nt - nk - ni   # semua 24-29 Okt (hotspot.json)
X0, X1, YB, HB = 6208776, 11515039, 4150000, 190000
SEG = [('Koridor ' + KAWN, nk, 'D9600B'), ('Pulau Kimaam', ni, '3F5F80'), ('kecamatan lain', nl, 'A9B4C2')]
o = tx(X0, 4030000, 2400000, 100000, [(f'SEBARAN TITIK {JK.upper()}', 660, True, '6B7280')], spc=100, an='b')
xa = X0
for k, (nm, n, wn) in enumerate(SEG):
    w = (X1 - X0) * n / nt if k < 2 else X1 - xa
    o += bentuk(xa, YB, w, HB, wn, 'roundRect' if k in (0, 2) else 'rect', {'adj': 50000} if k in (0, 2) else None)
    o += tx(xa, YB, w, HB, [(f'{round(n / nt * 100)}%', 700, True, 'FFFFFF')], al='ctr')
    xa += w
xl = X0
for nm, n, wn in SEG:
    o += bentuk(xl, YB + HB + 75000, 91440, 91440, wn, 'ellipse'); t_ = f'{nm} {f0(n)}'
    o += tx(xl + 128016, YB + HB + 45720, 40000 * len(t_), 150000, [(t_, 640, False, '2E3440')]); xl += 128016 + 37000 * len(t_) + 120000
assert xl < X1 + 120000, xl
s2.tambah(o)
# situasi lapangan
s2.hapus(lambda b: (g := geom(b)) and 6200000 <= g[0] and 5100000 <= g[1] < 6150000 and not b.startswith('<p:cxnSp>'))
o = ''
kt = kec('Merauke', 'Kontuar'); assert LVK['Merauke|Kontuar'] == 3
lahan_kt = [c['tanggung'] for c in A['prio'] if c['kec'] == 'Kontuar'][0]
for y, (j, ch, st, bl, ikb) in zip((5129784, 5468112, 5806440), [
        ('Kontuar, Pulau Kimaam: cluster Prioritas', [(f"belum padam {f0(kt['belum'])} ha, {HR}", 'merah', 'awas'), (lahan_kt, 'navy', 'pohon'), (f"{f0(sum(kt['hot']))} titik {JK}", 'navy', 'api')], 'belum padam', 'D9600B', 'api'),
        ('OMC BNPB dari Lanud J.A. Dimara', [('27 Okt: 2 sortie, 2.000 kg NaCl', 'navy', 'pesawat'), ('hujan 3,2 mm, 26–27 Okt', 'navy', 'tetes'), ('Merauke, Mappi, Boven Digoel', 'navy', 'pin')], 'berjalan', '051C2C', 'pesawat'),
        ('Jarak pandang dan asap, laphar 28 Okt', [('1–5 km, 05.30–14.00 WIT', 'merah', 'mata'), ('7–8 km, 14.30 WIT', 'navy', 'mata'), ('asap lintas batas PNG', 'navy', 'sinyal')], 'pantau', '5B7A99', 'mata')]):
    o += baris(2, 6483096, y, 11505895, j, ch, st, bl, ikb)
s2.tambah(o)

# ================================================================== SLIDE 3: koridor Jagebob-Tanah Miring
s3 = S[3]
s3.T('Sebaran Titik Panas dan Kebakaran di Arjuno–Welirang per 22 Oktober', ['Sebaran Titik Panas dan Kebakaran di ', KAWN, ' per 29 Oktober'])
kartu_label(s3, 1170432, 1673352, f0(KW['hot'][-1]), f'titik panas {HR}', 'jt-ik-api-oranye.png', 3, 'FBE7D6', 'D9600B')
kartu_label(s3, 4691786, 1673352, f"{f0(KW['luas'])} ha", f'luas terbakar {HR}', 'jt-ik-luas-navy.png', 3, 'E6EAF0', '051C2C')
kartu_label(s3, 6452463, 1673352, f"{f0(KW['belum'])} ha", f'belum padam {HR}', 'jt-ik-belum-merah.png', 3, 'F8DDE0', 'C8102E')
s3.hapus(lambda b: teks(b) == '1.023' and geom(b)[:2] == (7495360, 2386584))   # deck Jambi 241026 yang dipaparkan: judul panel tanpa angka
s3.ubah(lambda b: b.startswith('<p:pic>') and 'r:embed="rIdM1"' in b and geom(b)[0] < 1000000, lambda b: b.replace('r:embed="rIdM1"', f'r:embed="{rel(3, "jt-ik-api-putih.png")}"'))
s3.T('Sisi Malang', 'Jagebob dan Tanah Miring')
KLV = A['kaw_level']; assert '3' not in KLV, 'koridor punya cluster Prioritas: tulis ulang kartu dan subjudul'
JG, TM = kec('Merauke', 'Jagebob'), kec('Merauke', 'Tanah Miring'); KKL = A['kaw_kec_level']
s3.T('titik api masih ada', f"{f0(JG['hot'][-1])} dan {f0(TM['hot'][-1])} titik, belum padam {f0(JG['belum'] + TM['belum'])} ha, "
                            f"{f0(KKL['Jagebob'].get('2', 0) + KKL['Tanah Miring'].get('2', 0))} Siaga ({HR})")
s3.T('Sebaran titik panas, 15–22 Okt', 'Sebaran Titik Panas')
RELS[3] = RELS[3].replace('../media/jt-arjuno4.png', '../media/pps-peta-kawasan.png'); F['ppt/media/pps-peta-kawasan.png'] = open('peta-kawasan.png', 'rb').read()
s3.T('15–18 Okt', '24–25 Okt'); s3.T('19–20 Okt', '26–27 Okt'); s3.T('21–22 Okt, terbaru', '28–29 Okt, terbaru')
s3.hapus(lambda b: (g := geom(b)) and 4600000 <= g[0] < 8600000 and 2800000 <= g[1] < 5500000)
o = ''
for (k, x0, y0) in zip(KKN, (4654296, 6583680, 4654296, 6583680), (2834640, 2834640, 4160520, 4160520)):
    o += tx(x0, y0, 1800000, 228600, [(k, 900, True, '1A1A1A')]) + tx(x0, y0 + 201168, 1800000, 146304, [('Kab. Merauke', 650, False, '6B7280')])
    o += grafik(3, x0, x0 + 1850000, y0 + 1078992, 560000, kec('Merauke', k)['hot'], HK, y0 + 1106424, 0, bw_frac=0.62, sz_v=700, sz_d=600, pct_on=False, lab_akhir=False)
s3.tambah(o)
s3.hapus(lambda b: (g := geom(b)) and g[1] == 5715000)
s3.T('ALUR API', 'ALUR API, URUTAN WAKTU')
s3.ubah(lambda b: teks(b) == 'ALUR API, URUTAN WAKTU', lambda b: re.sub(r'<a:ext cx="\d+"', '<a:ext cx="3000000"', b, count=1).replace('wrap="square"', 'wrap="none"'), 1)
TT = json.load(open('titik.json'))['hot']


def dua_teratas(d0, d1):
    n = {k: sum(1 for p in TT if p['kab'] == 'Merauke' and p['kec'] == k and d0 <= p['w'] <= d1) for k in KKN}
    return ', '.join(k for k, _ in sorted(n.items(), key=lambda x: -x[1])[:2])


TAHAP = [('24–25 Okt', [dua_teratas('2026-10-24', '2026-10-25')], 'abu'), ('26–27 Okt', [dua_teratas('2026-10-26', '2026-10-27')], 'oranye'),
         ('28–29 Okt, terbaru', [dua_teratas('2026-10-28', '2026-10-29')], 'merah')]
X0, X1, ya, o = 4654296, 8595360, 5660000, ''
lebar = [sum(pil(3, 0, 0, t_, gy, 'pin', h=164592, sz=560)[1] for t_ in ts) + 45720 * (len(ts) - 1) for _, ts, gy in TAHAP]
celah = (X1 - X0 - sum(lebar)) / (len(TAHAP) - 1); assert celah > 200000, celah
xa = X0
for k, ((tgl, ts, gy), w) in enumerate(zip(TAHAP, lebar)):
    o += tx(xa, ya, w, 140000, [(tgl, 650, True, {'abu': '6B7280', 'oranye': 'D9600B', 'merah': 'C8102E'}[gy])])
    o += pil(3, xa, ya + 160000, ts[0], gy, 'pin', h=164592, sz=560)[0]
    if k < len(TAHAP) - 1:
        o += bentuk(xa + w + celah / 2 - 60000, ya + 160000 + 32296, 120000, 100000, 'BFC5CC', 'rightArrow')
    xa += w + celah
s3.tambah(o)
s3.hapus(lambda b: (g := geom(b)) and g[0] >= 8860000 and 2870000 <= g[1] < 6150000)
PK = A['kaw_puncak']   # puncak koridor 2026 dari peta_karhutla_wil (seri kecamatan sejak 1 Jan)
EV = [(f"{PK['hari'][8:].lstrip('0')} Okt", [(f"{f0(PK['hot'])} titik", 'oranye', 'api'), (f"tertinggi {PK['hari'][:4]}", 'navy', 'kalender')], 'D9600B', 'api'),
      ('14 Okt', [('Tanggap Darurat Prov.', 'navy', 'perisai'), ('s.d. 28 Okt', 'navy', 'kalender')], '051C2C', 'perisai'),
      ('22 Okt', [('Posko OMC BNPB aktif', 'navy', 'pesawat'), ('9 sortie s.d. 27 Okt', 'navy', 'pesawat')], '051C2C', 'pesawat'),
      (HR, [(f"{f0(KW['hot'][-1])} titik", 'merah', 'api'), (f"belum padam {f0(KW['belum'])} ha", 'merah', 'awas')], 'C8102E', 'awas')]
assert PK['hari'][:7] == '2026-10', PK
Y0, PIT = 2898648, 440000; cxl = 8869680 + 100584
o = bentuk(cxl - 6350, Y0 + 18288 + 100584, 12700, PIT * (len(EV) - 1), 'E5E7EB')
for k, (j, ch, bl, ikb) in enumerate(EV):
    y = Y0 + k * PIT
    if k == len(EV) - 1: o += bentuk(8869680 - 36576, y + 18288 - 36576, 274320, 274320, None, 'ellipse', ln='C8102E', lw=12700)
    o += bentuk(8869680, y + 18288, 201168, 201168, bl, 'ellipse', ln='FFFFFF', lw=12700) + gambar(8910828, y + 59436, 118872, 118872, ik(3, ikb, 'putih'))
    o += tx(9134856, y, 2371039, 146304, [(j, 760, True, '1A1A1A')])
    o += deret(3, 9134856, y + 160020, ch, 11550000, lipat=True)
UNSUR = [('BPBD Provinsi', 'perisai'), ('BPBD Kab. Merauke', 'perisai'), ('TNI', 'bintang'), ('Polri', 'lencana'), ('Damkar', 'tetes'),
         ('Banpol PP', 'orang'), ('1 pesawat OMC BNPB', 'pesawat'), ('1 mobil water supply', 'tetes'), ('1 mobil patroli', 'mata'), ('2 motor patroli', 'mata')]
yu = Y0 + PIT * len(EV) - 60000
o += tx(8869680, yu, 2636215, 182880, [('UNSUR DAN SARANA, LAPHAR 28 OKT', 750, True, '051C2C')], spc=100)
CW = (11505895 - 8869680 - 91440) // 2; RH = 190000; RG = 54864
for k, (t, ikn) in enumerate(UNSUR):
    x = 8869680 + (k % 2) * (CW + 91440); y = yu + 246888 + (k // 2) * (RH + RG)
    o += bentuk(x, y, CW, RH, 'E6EAF0', 'roundRect', {'adj': 50000}) + gambar(x + 73152, y + (RH - 128016) / 2, 128016, 128016, ik(3, ikn, 'navy'))
    o += tx(x + 256032, y, CW - 300000, RH, [(t, 600, True, '051C2C')])
assert y + RH < 6150000, y
s3.tambah(o)

# ================================================================== SLIDE 4: banjir dan longsor 30 Okt-2 Nov
s4 = S[4]
HB_ = '30 Okt–2 Nov'
s4.T('Waspada saat peralihan musim: 9 kawasan di Jawa Timur berisiko banjir bandang, longsor, dan lahar',
     ['Waspada peralihan musim: ', f"{BJ['kec_waspada']} dari {BJ['n_kec']}", f' kecamatan di Papua Selatan berstatus Waspada banjir atau longsor {HB_}'])
s4.T('PERINGATAN BMKG', 'PRAKIRAAN HUJAN')
s4.T('Kering', 'Sedang'); s4.T('hingga pertengahan Nov', 'hujan BMKG, 27–29 Okt')
s4.T('Hujan lokal', 'Kencang'); s4.T('petir, angin kencang', 'angin BMKG, 27–29 Okt')
h3k = max(BJ['kab'], key=lambda k: BJ['kab'][k]['h3']); h3 = BJ['kab'][h3k]['h3']
s4.T('Longsor', f"{f0(h3)} mm"); s4.T('material dan genangan', 'hujan 3 hari terbesar*')
# kartu keempat (Lahar) dibuang lewat kartu_ulang: tidak ada angka peluang hujan Papua Selatan yang bisa dirujuk ("potensi > 70%" di laphar OMC
# 28 Okt adalah legenda kelas peta, bukan nilai untuk Papua Selatan)
D = BJ['dibi']; th_ada = [t for t, v in D['v'].items() if v]
s4.T('Banjir bandang dari lereng terbakar', 'Banjir di DIBI BNPB sejak 2008')
s4.hapus(lambda b: (g := geom(b)) and g[1] == 1938528 and g[0] >= 8615477)
s4.tambah(deret(4, 8615477, 1938528, [(f"{f0(D['banjir'])} kejadian banjir", 'merah', 'tetes'), (', '.join(th_ada), 'navy', 'kalender'), (f"{f0(D['longsor'])} longsor", 'navy', 'awas')], 11450000, h=155448))
s4.T('Wilayah hilir berisiko', f'Kabupaten berstatus Waspada, {HB_}')
s4.hapus(lambda b: (g := geom(b)) and 2840000 < g[1] < 5200000 and g[0] < 7900000)
rows = sorted(BJ['kab'].items(), key=lambda x: (-len({n for n, _ in x[1]['banjir'] + x[1]['longsor']}), -x[1]['h3']))
lama = [teks(b) for b in s4.cari(Slide.di(6763840, 2386584, True))][0]; s4.T(lama, str(len(rows)), at=(6763840, 2386584))
XN, XC, XH, XD, XA = 886968, 2650000, 4900000, 5800000, 6400800
KOLOM = [(676656, 2600000, 'KABUPATEN'), (XC, 4850000, 'KECAMATAN WASPADA, HUJAN TERBESAR'), (XH, 5750000, 'HUJAN 3 HARI'), (XD, 6350000, 'DIBI*'), (XA, 7735824, 'ANCAMAN')]
o = ''.join(tx(x0, 2852928, x1 - x0, 164592, [(t, 600, True, '6B7280')], al='ctr', spc=100) for x0, x1, t in KOLOM)
o += garis(676656, 3035808, 7059168, '1A1A1A', 9525)
y = 3063240; RH = min(420000, (4900000 - y) // len(rows))
for no, (k, v) in enumerate(rows, 1):
    nw = len({n for n, _ in v['banjir'] + v['longsor']}); top = list(dict.fromkeys(n for n, _ in sorted(v['banjir'] + v['longsor'], key=lambda x: -x[1])))[:3]
    o += bentuk(676656, y + (RH - 128016) / 2, 128016, 128016, '051C2C', 'ellipse') + tx(676656, y + (RH - 128016) / 2, 128016, 128016, [(str(no), 480, True, 'FFFFFF')], al='ctr')
    o += tx(XN, y, 1700000, RH, [(k, 760, True, '1A1A1A')])
    o += tx(XC, y, 2200000, RH, [(f"{nw} dari {v['n_kec']}: ", 700, True, '2F86D1'), (', '.join(top), 680, False, '051C2C')]) + tx(XH, y, 850000, RH, [(f"{f0(v['h3'])} mm", 760, True, '2F86D1')], al='ctr')
    o += tx(XD, y, 550000, RH, [(f0(v['dibi_banjir'] + v['dibi_longsor']), 700, True, '051C2C')], al='ctr')
    ch = ([('banjir', 'biru', 'tetes')] if v['banjir'] else []) + ([('longsor', 'oranye', 'awas')] if v['longsor'] else [])
    lebar = sum(pil(4, 0, 0, t_, g_, i_, h=128016)[1] for t_, g_, i_ in ch) + 45720 * (len(ch) - 1)
    o += deret(4, XA + (7735824 - XA - lebar) / 2, y + (RH - 128016) / 2, ch, 7800000, h=128016)
    y += RH
    if no < len(rows): o += garis(676656, y, 7059168, 'EEF0F3')
assert y < 4960000, y
xl = 676656
o += tx(xl, 4983480, 700000, 164592, [('ANCAMAN:', 600, True, '6B7280')], spc=60); xl += 600000
for t_, gy, ikn, ket in (('banjir', 'biru', 'tetes', 'luapan sungai dan genangan'), ('longsor', 'oranye', 'awas', 'lereng jenuh air runtuh')):
    p, w = pil(4, xl, 4983480, t_, gy, ikn, h=137160); o += p; xl += w + 73152
    wk = 40000 * len(ket); o += tx(xl, 4983480, wk, 164592, [(ket, 600, False, '2E3440')]); xl += wk + 120000
o += tx(xl, 4983480, 7863840 - xl, 164592, [(f"*DIBI = kejadian banjir dan longsor {D['th0']}–{D['th1']}", 600, False, '6B7280')])
s4.tambah(o)
# panel kanan: ringkasan status dan DIBI
s4.T('Kesiapan BPBD Jatim', 'Status banjir dan riwayat DIBI')
ganti_ikon(s4, 4, 8183880, 2468880, 'jt-ik-kalender-putih.png')
KBJ = BJ['kab']; tk = max(KBJ, key=lambda k: len(KBJ[k]['banjir']))
lsr = [n for k in KBJ for n, _ in KBJ[k]['longsor']]
SAR = [(f0(BJ['kec_waspada_b']), 'kecamatan Waspada banjir', 'jt-ik-air-navy.png'), (f0(BJ['kec_waspada_l']), 'kecamatan Waspada longsor', 'lpg-ik-awas-navy.png'),
       (f"{len(KBJ[tk]['banjir'])} dari {KBJ[tk]['n_kec']}", f'kecamatan {tk} Waspada', 'lpg-ik-pin-navy.png'), (f"{f0(h3)} mm", f'hujan 3 hari, {h3k}', 'jt-ik-air-navy.png'),
       (f0(D['banjir']), f"banjir DIBI {D['th0']}–{D['th1']}", 'jt-ik-kalender-navy.png'), (f0(D['longsor']), f"longsor DIBI {D['th0']}–{D['th1']}", 'jt-ik-kalender-navy.png')]
for (xv, yv), (v, l, ikn) in zip(((8622792, 2990088), (10360152, 2990088), (8622792, 3685032), (10360152, 3685032), (8622792, 4379976), (10360152, 4379976)), SAR):
    for yy, isi_ in ((yv, v), (yv + 274320, l)):
        lama = [teks(b) for b in s4.cari(Slide.di(xv, yy, True))][0]; s4.T(lama, isi_, at=(xv, yy))
    ganti_ikon(s4, 4, xv - 329184, yv + 146304, ikn)
mk = KBJ.get('Merauke', {'banjir': [], 'n_kec': 22})
for (j0, i0), (j, i) in zip((('Bersihkan alur sungai', 'Material dan kayu terbakar di alur hilir Arjuno, Argopuro, Ijen, Tengger'),
                             ('Pengamat dan sirene', 'Pengamat hujan di hulu; sirene banjir bandang Bumiaji, Prigen, Panti'),
                             ('Jalur evakuasi desa hilir', 'Peta evakuasi dan titik kumpul desa di bawah kawasan terbakar'),
                             ('Siaga lahar Semeru', 'Patuhi larangan 13 km Besuk Kobokan saat hujan di puncak')),
                            (('Siaga banjir di Asmat dan Mappi', f"{len(KBJ['Asmat']['banjir'])} dari {KBJ['Asmat']['n_kec']} kecamatan Asmat dan {len(KBJ['Mappi']['banjir'])} dari {KBJ['Mappi']['n_kec']} kecamatan Mappi Waspada banjir: siapkan perahu dan titik kumpul kampung tepi sungai"),
                             ('Pengamat longsor di Boven Digoel', f"{', '.join(lsr)} Waspada longsor: pasang pengamat hujan dan sirene di kampung lereng"),
                             ('DIBUANG', 'DIBUANG'),
                             ('Api Merauke tetap dikejar', f"Hanya {len(mk['banjir'])} dari {mk['n_kec']} kecamatan Merauke Waspada banjir; {f0(FK['hot'][-1])} titik dan {f0(FK['belum'][-1])} ha belum padam {HR}: OMC dan satgas darat diteruskan"))):
    s4.T(j0, j); s4.T(i0, i)
P0, P4 = 694944, 2736927; P3 = P4 * 4 // 3
s4.hapus(lambda b: (g := geom(b)) and 5500000 < g[1] < 6200000 and (P0 + 2 * P4 - 100000 <= g[0] < P0 + 3 * P4 - 100000))


def regang(b):
    g = GEO.search(b); x, w = int(g.group(1)), int(g.group(4))
    k = (x - P0 + 100000) // P4; dx = x - (P0 + k * P4); k2 = k - 1 if k == 3 else k
    nw = w + (P3 - P4) if w == 2137027 else w
    return b[:g.start()] + f'<a:off x="{P0 + k2 * P3 + dx}" y="{g.group(2)}"/>{g.group(3)}<a:ext cx="{nw}" cy="{g.group(5)}"/>' + b[g.end():]


s4.ubah(lambda b: (g := geom(b)) and 5500000 < g[1] < 6200000 and g[0] >= P0 - 100000, regang)
s4.ubah(lambda b: (g := geom(b)) and 5500000 < g[1] < 6200000 and 'algn="just"' in b, lambda b: b.replace('algn="just"', 'algn="l"'))
if TIGA_D: s4.T('4', '2', at=(11094415, 6510528))


# ================================================================== kartu DATA SATELIT: kartu keempat dibuang, sisa kartu dibagi rata
def kartu_ulang(s, buang):
    XS = [658368, 2419045, 4179722, 5940399]
    anak = lambda x0: (lambda b: (gg := geom(b)) and 1600000 < gg[1] < 2200000 and gg[0] in (x0, x0 + 109728, x0 + 182880, x0 + 512064))
    s.hapus(anak(buang))
    sisa = [x for x in XS if x != buang]; w = (7170725 - 2 * 109728 - 2 * 91440) // 3
    for k, x0 in enumerate(sisa):
        nx = 658368 + k * (w + 91440)

        def fn(b, x0=x0, nx=nx):
            gg = GEO.search(b); x, cx = int(gg.group(1)), int(gg.group(4))
            d = x - x0; ncx = w if d == 0 else (w - 548640 if d == 512064 else cx)
            return b[:gg.start()] + f'<a:off x="{nx + d}" y="{gg.group(2)}"/>{gg.group(3)}<a:ext cx="{ncx}" cy="{gg.group(5)}"/>' + b[gg.end():]
        s.ubah(anak(x0), fn)


kartu_ulang(S[1], 5940399); kartu_ulang(S[2], 5940399); kartu_ulang(S[3], 2419045); kartu_ulang(S[4], 5940399)


# ================================================================== kepala rapat ke atas, isi meregang mengisi ruang yang dibebaskan
def kepala(s, sz, ada_pil=True):
    jb = [b for b in s.blok() if (g := geom(b)) and g[0] == 548640 and g[1] == 274320][0]
    s.ubah(lambda b: b == jb, lambda b: b.replace('sz="2000"', f'sz="{sz}"'), 1); jb = jb.replace('sz="2000"', f'sz="{sz}"')
    g = geom(jb); L = len(teks(jb)); baris_ = max(1, math.ceil(L * 0.49 * sz / 100 / (g[2] / 12700)))
    tinggi = round(baris_ * sz / 100 * 1.18 * 12700); top = 365760
    s.ubah(lambda b: b == jb, lambda b: re.sub(r'<a:off x="548640" y="274320"/>(\s*)<a:ext cx="(\d+)" cy="\d+"/>', rf'<a:off x="548640" y="{top}"/>\1<a:ext cx="\2" cy="{tinggi}"/>', b, count=1).replace('anchor="b"', 'anchor="t"'), 1)
    garis_y = max(top + tinggi, 365760 + 438912) + 101600
    if ada_pil:
        py = top + tinggi // 2 - 105156
        s.ubah(lambda b: (gg := geom(b)) and gg[1] == 877824, lambda b: re.sub(r'y="877824"', f'y="{py}"', b, count=1))
        s.ubah(lambda b: (gg := geom(b)) and gg[1] == 914400 and gg[0] > 8000000, lambda b: re.sub(r'y="914400"', f'y="{py + 36576}"', b, count=1))
    lama0, bawah = 1207008, 6446520
    k = (bawah - garis_y) / (bawah - lama0)

    def peta(y): return garis_y + (y - lama0) * k

    def fn(b):
        gg = GEO.search(b); x, y, cx, cy = int(gg.group(1)), int(gg.group(2)), int(gg.group(4)), int(gg.group(5))
        if y == lama0 and cy == 0: return b[:gg.start()] + f'<a:off x="{x}" y="{garis_y}"/>{gg.group(3)}<a:ext cx="{cx}" cy="0"/>' + b[gg.end():]
        if not (lama0 < y < bawah): return b
        kecil = b.startswith('<p:pic>') or 'prst="ellipse"' in b or cy < 260000
        if kecil: ny, ncy = round(peta(y + cy / 2) - cy / 2), cy
        else: ny, ncy = round(peta(y)), round(cy * k)
        return b[:gg.start()] + f'<a:off x="{x}" y="{ny}"/>{gg.group(3)}<a:ext cx="{cx}" cy="{ncy}"/>' + b[gg.end():]
    s.ubah(lambda b: GEO.search(b) is not None, fn)
    return baris_, garis_y


DIPAKAI = (1, 4) if TIGA_D else (1, 2, 3, 4)
for i, sz in ((1, 2000), (2, 2000), (3, 1700), (4, 2000)):
    if i in DIPAKAI: print('slide', i, 'judul/garis', kepala(S[i], sz, i != 4))
NS = A['nasional']; pc = lambda a, b_: round(a / b_ * 100)
SUB = {1: [(f"Peringkat ke-{NS['hot']} nasional", 1000, True, 'C8102E'), (f" untuk titik panas dan ke-{NS['belum']} untuk belum padam, {HR} (dari {NS['n_prov']} provinsi); ke-{NS['luas']} untuk luas terbakar", 1000, False, '2E3440')],
       2: [('Kab/kota urutan pertama di Papua Selatan:', 1000, True, 'C8102E'), (f" {pc(FK['hot'][-1], P['hot'][-1])}% titik, {pc(FK['luas'][-1], P['luas'][-1])}% luas terbakar, {pc(FK['belum'][-1], P['belum'][-1])}% belum padam Papua Selatan, {HR}", 1000, False, '2E3440')],
       3: [(('Separuh' if 45 <= pc(KW['belum'], P['belum'][-1]) <= 55 else f"{pc(KW['belum'], P['belum'][-1])}%") + ' belum padam Papua Selatan:', 1000, True, 'C8102E'),
           (f" {f0(KW['belum'])} dari {f0(P['belum'][-1])} ha ada di {', '.join(KKN[:-1])}, dan {KKN[-1]}, {HR}; juga {pc(KW['hot'][-1], P['hot'][-1])}% titik provinsi", 1000, False, '2E3440')]}
for i, runs in SUB.items():
    if i in DIPAKAI: S[i].tambah(tx(548640, 690000, 8200000, 190000, runs, an='t'))

# ------------------------------------------------------------------ tulis + cek
for i in DIPAKAI:
    for blk in S[i].blok():
        g = geom(blk)
        if g and 1800000 < g[1] < 2050000 and g[3] <= 160000 and g[2] < 2000000 and 'b="1"' not in blk and len(teks(blk)) > 24:
            raise SystemExit(f'slide {i}: label kartu terlalu panjang, melipat dan menabrak bingkai: {teks(blk)!r}')
    tt = re.sub(r'<[^>]+>', '', S[i].s)
    assert '·' not in tt and '—' not in tt, f'titik tengah / em dash di slide {i}'
    for x in ('±', 'DIBUANG', 'Jawa Timur', 'Jatim', 'Malang', 'Arjuno', 'Semeru', 'Bondowoso', 'Argopuro', 'Batu', '63 ha'):
        assert x not in tt, f'{x!r} tersisa di slide {i}'
    F[f'ppt/slides/slide{i}.xml'] = S[i].s.encode(); F[f'ppt/slides/_rels/slide{i}.xml.rels'] = RELS[i].encode()
for n in ('ppt/media/jt-jatim3.png', 'ppt/media/jt-arjuno4.png'): F.pop(n, None)
# slide yang tidak dipakai (221026 punya slide 5 RTL; --3d juga membuang slide 2-3) dibuang dari presentasi beserta berkasnya
PR = F['ppt/_rels/presentation.xml.rels'].decode(); PX = F['ppt/presentation.xml'].decode(); CT = F['[Content_Types].xml'].decode()
for i in [j for j in (1, 2, 3, 4, 5) if j not in DIPAKAI]:
    rid = re.search(rf'Id="(\w+)"[^>]*Target="slides/slide{i}.xml"', PR).group(1)
    PR = re.sub(rf'<Relationship [^>]*Target="slides/slide{i}.xml"/>', '', PR); PX = re.sub(rf'<p:sldId [^>]*r:id="{rid}"/>', '', PX)
    CT = CT.replace(f'<Override PartName="/ppt/slides/slide{i}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>', '')
    for n in (f'ppt/slides/slide{i}.xml', f'ppt/slides/_rels/slide{i}.xml.rels'): F.pop(n)
    assert f'slide{i}.xml' not in PR + CT, i
F['ppt/_rels/presentation.xml.rels'] = PR.encode(); F['ppt/presentation.xml'] = PX.encode(); F['[Content_Types].xml'] = CT.encode()
zo = zipfile.ZipFile(OUT, 'w', zipfile.ZIP_DEFLATED)
for n in ['[Content_Types].xml'] + [n for n in F if n != '[Content_Types].xml']: zo.writestr(n, F[n])
zo.close(); print('ok', OUT)
