import math
import os, re, json, sys, zipfile
AKAR = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', '..'))
SP = sys.argv[1]; A = json.load(open(SP + '/angka.json'))['prov']
PAR = json.load(open(SP + '/param.json'))   # dari penanganan.py: cutoff, kolom [D-2, D-1, D], hari, padam_dari, bulan, bln
SRC = SP + '/deck/src.pptx'; OUT = sys.argv[2]
def bul(v): return int(math.floor(v + 0.5))  # pembulatan sekali, setengah ke atas
def f0(v): return f"{bul(v):,}".replace(',', '.')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kisi import (GRUP, KOL0, PITCH0, GW0, SELA, GW, PITCH, BW, LW, GX, LX, BX,   # noqa: E402  kisi tabel, dipakai cek6.py juga
                  HGX, HGX_MUDA, KEPALA, KEPALA_SZ, IKON_W, IKON_SELA, IKON, lebar_teks,
                  Y_KEPALA, Y_HARI, H_KEPALA, H_HARI, NX, BANJIR, IKON_BANJIR, nol)
s1 = open(SP + '/deck/x/ppt/slides/slide1.xml').read()
SHAPES = lambda s: list(re.finditer(r'<p:sp>.*?</p:sp>', s, re.S))
def geom(b):
    o = re.search(r'<a:off x="(\d+)" y="(\d+)"/>\s*<a:ext cx="(\d+)" cy="(\d+)"/>', b)
    return tuple(map(int, o.groups())) if o else None
def text(b): return ''.join(re.findall(r'<a:t>([^<]*)</a:t>', b))
# template dari baris pertama slide 1, plus kepala kolom HOTSPOT sebagai cetakan keempat kelompok
T = {}
for m in SHAPES(s1):
    b = m.group(0); g = geom(b)
    if not g: continue
    t = text(b)
    if t == '452,49': T['lab'] = b
    if t == '431,66': T['lab3'] = b
    if t == '▼9%': T['arr'] = b
    if g[0] == 7935678 and g[1] == 2404633: T['bar'] = b
    if g == (KOL0, Y_KEPALA, GW0, H_KEPALA): T['kepala'] = b
    if t == 'HOTSPOT*  (titik)': T['kepala_teks'] = b
    if g == (KOL0, Y_HARI, PITCH0, H_HARI): T['hari'] = b
    if g == (KOL0, 2587752, GW0, 7315): T['garis'] = b
for m in re.finditer(r'<p:pic>.*?</p:pic>', s1, re.S):
    if geom(m.group(0)) == (5030373, 1554480, 219456, 219456): T['ikon'] = m.group(0)
assert len(T) == 9, T.keys()
def setgeom(b, x, y, cx, cy):
    return re.sub(r'<a:off x="\d+" y="\d+"/>\s*<a:ext cx="\d+" cy="\d+"/>', f'<a:off x="{x}" y="{y}"/><a:ext cx="{cx}" cy="{cy}"/>', b, 1)
def settext(b, t):
    first = [True]
    def r(m):
        if first[0]: first[0] = False; return f'<a:t>{t}</a:t>'
        return '<a:t></a:t>'
    return re.sub(r'<a:t>[^<]*</a:t>', r, b)
def setcol_text(b, c): return re.sub(r'(<a:rPr[^>]*>\s*<a:solidFill><a:srgbClr val=")\w+', r'\g<1>' + c, b)
def setcol_fill(b, c): return re.sub(r'(<p:spPr>.*?<a:solidFill><a:srgbClr val=")\w+', r'\g<1>' + c, b, 1, re.S)
NAIK, TURUN, ABU = 'D9600B', '2F86D1', 'A9B4C2'
def banding(cur, prev):
    if not prev: return ('', ABU, ABU) if cur else ('0%', '6B7280', ABU)
    p = bul((cur - prev) / prev * 100)
    if p > 0: return (f'▲{f0(p)}%', NAIK, NAIK)
    if p < 0: return (f'▼{f0(-p)}%', TURUN, TURUN)
    return ('0%', '6B7280', ABU)
def isi_baris(s, base, H, k, nid, aoff=18288, ah=137160, hapus_lama=True):
    # buang label/bar/panah/NA lama di kolom luas & belum pada pita baris ini
    keep = []; pos = 0; out = []
    for m in SHAPES(s):
        b = m.group(0); g = geom(b)
        hapus = False
        if hapus_lama and g and base - H - 260000 < g[1] < base + 100000:
            x, y, cx, cy = g
            # dikenali dari UKURANNYA, bukan x-nya: posisi kolom berubah sejak tabel jadi 4 kelompok, yang dibuang tetap bentuk templat
            if cy in (164592, 137160) and cx == 800913: hapus = True      # kotak angka / panah
            if cx == 297979 and cy <= 201168: hapus = True                # batang
            if x in NX and cx == PITCH0 and cy == H_HARI: hapus = True     # "NA" selebar kolom lama
        out.append(s[pos:m.start()]); pos = m.end()
        if not hapus: out.append(b)
    out.append(s[pos:]); s = ''.join(out)
    baru = []
    for grp in GRUP:
        v = A[k][grp]; tiga = v[1:4]; mx = max(map(nol, tiga)) or 1
        for i in range(3):
            h = max(18288, round(H * nol(tiga[i]) / mx)); top = base - h
            arr, ct, cb = ('', ABU, ABU) if tiga[i] is None else banding(bul(tiga[i]), bul(nol(v[i])))  # panah dari angka yang tampil
            bar = setcol_fill(setgeom(T['bar'], BX[grp][i], top, BW, h), cb)
            lab = settext(setgeom(T['lab3' if i == 2 else 'lab'], LX[grp][i], top - 173736, LW, 164592), '–' if tiga[i] is None else f0(tiga[i]))
            ar = setcol_text(settext(setgeom(T['arr'], LX[grp][i], base + aoff, LW, ah), arr), ct)
            baru += [bar, lab, ar]
    out = []
    for b in baru:
        nid[0] += 1
        out.append(re.sub(r'<p:cNvPr id="\d+"', f'<p:cNvPr id="{nid[0]}"', b, 1))
    return s.replace('</p:spTree>', ''.join(out) + '</p:spTree>')
def ganti_total(s, y, kode, nid=None):
    """Baris jumlah: 9 kotak templat dibuang, 12 dibangun ulang di kolom baru. Kotak pertama jadi cetakannya (hurufnya
    sedikit dikecilkan karena kolomnya menyempit; angka 7 digit harus tetap muat)."""
    pola = [b for b in re.findall(r'<p:sp>.*?</p:sp>', s, re.S) if (lambda g: g and g[1] == y and g[2] == 800913)(geom(b))]
    if not pola:
        return s
    cetak = re.sub(r'sz="(\d+)"', lambda m: f'sz="{round(int(m.group(1)) * 0.94)}"', pola[0])
    cy = geom(pola[0])[3]
    for b in pola:
        s = s.replace(b, '', 1)
    baru = []
    for grp in GRUP:
        for i in range(3):
            xs = [A[k][grp][i + 1] for k in kode if A[k][grp][i + 1] is not None]   # jumlah = jumlah angka yang tampil; semua "–" = "–"
            baru.append(settext(setgeom(cetak, LX[grp][i], y, LW, cy), f0(sum(bul(x) for x in xs)) if xs else '–'))
    if nid is not None:
        baru = [re.sub(r'<p:cNvPr id="\d+"', f'<p:cNvPr id="{nid[0] + 1 + j}"', b, count=1) for j, b in enumerate(baru)]
        nid[0] += len(baru)
    return s.replace('</p:spTree>', ''.join(baru) + '</p:spTree>')


# label hari per kelompok: luas & belum padam boleh bergeser ke hari utuh terakhir (penanganan.py ha_utuh, pemilik 27 Okt 2026)
# belum padam boleh tetap di hari laporan sementara luas di hari utuh terakhir (belum_kini.json website, penanganan.py belum_kini)
KOLOM = {**{g_: PAR['kolom'] for g_ in GRUP}, 'luas': PAR.get('kolom_ha', PAR['kolom']), 'belum': PAR.get('kolom_belum', PAR.get('kolom_ha', PAR['kolom']))}


def kepala_tabel(s, nid):
    """Kepala 4 kolom + label hari + garis dasar tiap kelompok, dibangun ulang dari cetakan HOTSPOT templat.
    Yang lama (3 kelompok) dibuang dulu supaya tidak ada sisa di posisi templat."""
    for b in re.findall(r'<p:sp>.*?</p:sp>|<p:pic>.*?</p:pic>', s, re.S):
        g = geom(b)
        if not g:
            continue
        x, y, cx, cy = g
        if y == Y_KEPALA and cy == H_KEPALA: s = s.replace(b, '', 1)              # latar + tulisan kepala
        elif y == 1554480 and cx == 219456: s = s.replace(b, '', 1)               # ikon kepala
        elif y == Y_HARI and cx == PITCH0 and cy == H_HARI: s = s.replace(b, '', 1)   # label hari
    assert 'r:embed="rId2"' in T['ikon'], 'ikon kepala templat bukan rId2 (api): peta IKON kisi.py tak berlaku'
    baru = []
    for g_ in GRUP:
        lab, sat = KEPALA[g_]
        baru.append(setcol_fill(setgeom(T['kepala'], GX[g_], Y_KEPALA, GW, H_KEPALA), HGX[g_]))
        tw = lebar_teks([(lab, KEPALA_SZ, True), (sat, KEPALA_SZ, False)])
        x0 = GX[g_] + (GW - IKON_W - IKON_SELA - tw) // 2   # ikon + tulisan rata tengah di kotak (pemilik 27 Okt 2026)
        baru.append(setgeom(T['ikon'], x0, Y_KEPALA + (H_KEPALA - IKON_W) // 2, IKON_W, IKON_W).replace('r:embed="rId2"', f'r:embed="{IKON[g_]}"'))
        kt = setgeom(T['kepala_teks'], x0 + IKON_W + IKON_SELA, Y_KEPALA, tw + 91440, H_KEPALA)
        kt = re.sub(r'sz="\d+"', f'sz="{KEPALA_SZ}"', kt).replace('wrap="square"', 'wrap="none"')
        kt = kt.replace('<a:t>HOTSPOT*</a:t>', f'<a:t>{lab}</a:t>').replace('<a:t>  (titik)</a:t>', f'<a:t>{sat}</a:t>')
        kt = kt.replace('val="E6ECF3"', f'val="{HGX_MUDA[g_]}"')
        baru.append(kt)
        for i, hr in enumerate(KOLOM[g_]):
            baru.append(settext(setgeom(T['hari'], LX[g_][i], Y_HARI, LW, H_HARI), hr))
    out = []
    for b in baru:
        nid[0] += 1
        out.append(re.sub(r'<p:cNvPr id="\d+"', f'<p:cNvPr id="{nid[0]}"', b, 1))
    return s.replace('</p:spTree>', ''.join(out) + '</p:spTree>')
def rep(s, a, b):
    assert s.count(a) == 1, (a, s.count(a)); return s.replace(a, b)
def runs_ganti(s, awal, isi):
    """Isi ulang paragraf shape yang teksnya diawali `awal` dengan [(teks, i)]: gaya huruf disalin dari run ke-i templat."""
    b = next(m.group(0) for m in re.finditer(r'<p:sp>.*?</p:sp>', s, re.S) if text(m.group(0)).startswith(awal))
    runs = re.findall(r'<a:r>.*?</a:r>', b, re.S)
    gaya = [re.search(r'<a:rPr.*?</a:rPr>', x, re.S).group(0) for x in runs]
    baru = ''.join(f'<a:r>{gaya[i]}<a:t>{t}</a:t></a:r>' for t, i in isi)
    return s.replace(b, b[:b.index(runs[0])] + baru + b[b.index(runs[-1]) + len(runs[-1]):], 1)


def banjir_teks(s1):
    """Judul, subjudul, cut-off, dan catatan kaki slide tabel versi banjir (angka subjudul = jumlah 6 provinsi kolom D)."""
    jml = lambda g: sum(bul(nol(A[k][g][3])) for k in TOP6)
    s1 = rep(s1, '<a:t>Jumlah 5 provinsi</a:t>', '<a:t>Jumlah 6 provinsi</a:t>')
    s1 = runs_ganti(s1, 'Penanganan dan Pengendalian Karhutla', [('Penanganan Banjir, Longsor dan Rob per Tanggal ', 0), (PAR['hari'], 1), (f' {PAR["bulan"]} ', 2), (PAR['tahun'], 3)])
    s1 = runs_ganti(s1, '5 provinsi', [('6 provinsi', 0), (' teratas: ', 1), (f'{f0(jml("hot"))} kecamatan', 0), (' Siaga atau Awas banjir, ', 1),
                                     (f'{f0(jml("fs"))} kecamatan', 0), (' longsor, ', 1), (f'{f0(jml("belum"))} jiwa', 0), (f' terpapar pada {PAR["hari"]} {PAR["bln"]}', 1)])
    s1 = rep(s1, '<a:t>21 Okt 2026, 07.00 WIB</a:t>', f'<a:t>{PAR["cutoff"]}</a:t>')
    return rep(s1, '<a:t>*Hotspot berdasarkan GIS (Geographic Information System).</a:t>',
               '<a:t>*Kecamatan Siaga atau Awas dari prakiraan hujan dan indeks bahaya InaRISK; rob dari titik pantau BMKG; terpapar = penduduk kecamatan Siaga atau Awas banjir (WorldPop). –: tidak dipantau.</a:t>')


def sp_di_y(s, y):
    """(awal, akhir) tiap <p:sp> yang offsetnya di baris y; dipakai untuk mengecilkan huruf catatan kaki."""
    return [m.span() for m in re.finditer(r'<p:sp>.*?</p:sp>', s, re.S) if (lambda g: g and g[1] == y)(geom(m.group(0)))]
P5 = ['62', '16', '63', '15', '61', '14']; P3 = ['93', '72', '64']; P8 = P5 + P3   # P5 = 6 provinsi prioritas BNPB (nama variabel lama)
s2 = open(SP + '/deck/x/ppt/slides/slide2.xml').read()
nid = [5000]
LAMA = [2587752, 3209544, 3831336, 4453128, 5074920]
for base in LAMA:   # buang semua label/batang/panah lama 5 baris (dikenali dari ukurannya; posisi kolom sudah berubah)
    s1 = ''.join(b if not (lambda g: g and base - 201168 - 260000 < g[1] < base + 100000 and (
        (g[3] in (164592, 137160) and g[2] == 800913) or (g[2] == 297979 and g[3] <= 201168)))(geom(b)) else ''
        for b in re.split(r'(<p:sp>.*?</p:sp>)', s1, flags=re.S))
# tata ulang 6 baris = 6 provinsi dengan hotspot terbanyak 21 Okt (sama dengan peringkat slide peta)
T0, PL, PB, PITA = 2167128, 621792, 518160, 481584
GEOM = r'<a:off x="(\d+)" y="(\d+)"/>(\s*)<a:ext cx="(\d+)" cy="(\d+)"/>'
NAS = json.load(open(SP + '/angka_nasional.json'))['prov']
TOP6 = sorted(NAS, key=lambda k: -NAS[k]['hot'][3])[:6]
assert all(k in A for k in TOP6), TOP6
P5 = TOP6
def pindah(blok, y2, cy2=None):
    o = re.search(GEOM, blok)
    return blok[:o.start()] + f'<a:off x="{o.group(1)}" y="{y2}"/>{o.group(3)}<a:ext cx="{o.group(4)}" cy="{cy2 if cy2 is not None else o.group(5)}"/>' + blok[o.end():]
# isi baris (logo, nama, lencana) per provinsi dari templat: slide1 (5 baris) dan slide2 (3 baris tambahan)
SUMBER = {}   # kode -> (daftar blok, pusat nama lama)
def kumpul(xml, top0, pitch, kodes, awalan):
    for b in re.findall(r'<p:sp>.*?</p:sp>|<p:pic>.*?</p:pic>', xml, re.S):
        o = re.search(GEOM, b)
        if not o: continue
        x, y, cx = int(o.group(1)), int(o.group(2)), int(o.group(4))
        if x < 4650000 and cx != 10948111 and top0 <= y < top0 + len(kodes) * pitch:
            i = (y - top0) // pitch
            if awalan: b = re.sub(r'r:embed="(\w+)"', lambda q: f'r:embed="{awalan}{q.group(1)}"', b)
            SUMBER.setdefault(kodes[i], ([], top0 + i * pitch))[0].append(b)
kumpul(s1, T0, PL, ['62', '16', '63', '15', '61'], '')
kumpul(open(SP + '/deck/x/ppt/slides/slide2.xml').read(), 2167128, 731520, ['93', '72', '64'], 'S2')
PUSAT_NAMA = {'62': 292608, '16': 292608, '63': 292608, '15': 292608, '61': 292608, '93': 347472, '72': 347472, '64': 347472, '53': 347472}
LOGO = {}   # provinsi tanpa baris di templat BNPB: salin baris Kaltim, ganti nama dan logo (logo/<kode>.png, lambang provinsi Wikimedia Commons)
NAMA_PROV = {k: v['nama'] for k, v in json.load(open(os.path.join(AKAR, 'public/data/laporan.json')))['prov'].items()}
for kode in [k for k in TOP6 if k not in SUMBER]:
    jalur = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'logo', f'{kode}.png')
    if BANJIR and not os.path.exists(jalur):   # provinsi banjir di luar baris karhutla: lambang dari layar (sumber logo/81-82 juga)
        jalur = os.path.join(AKAR, 'public', 'lambang', 'provinsi', f'{kode}.png')
    if not os.path.exists(jalur):
        sys.exit(f'{NAMA_PROV[kode]} ({kode}) masuk 6 teratas tetapi tak punya baris di templat: taruh lambangnya di {jalur}')
    blok, atas = SUMBER['64']; nb = []
    xs = [int(re.search(GEOM, b).group(1)) for b in blok if b.startswith('<p:pic>')]
    for b in blok:
        if b.startswith('<p:pic>') and int(re.search(GEOM, b).group(1)) == min(xs):
            b = re.sub(r'r:embed="\w+"', f'r:embed="logo{kode}"', b)
        if '<a:t>Kalimantan Timur</a:t>' in b:
            b = b.replace('<a:t>Kalimantan Timur</a:t>', f'<a:t>{NAMA_PROV[kode]}</a:t>')
            if len(NAMA_PROV[kode]) > 16:   # nama lebih panjang: huruf 88%
                b = re.sub(r'sz="(\d+)"', lambda m: f'sz="{round(int(m.group(1)) * 0.88)}"', b)
            b = re.sub(r'(<a:ext cx=")\d+', r'\g<1>1563624', b, 1)
        nb.append(b)
    SUMBER[kode] = (nb, atas); PUSAT_NAMA[kode] = PUSAT_NAMA['64']; LOGO[kode] = jalur
# buang isi baris lama dari slide1 (latar dan garis dasar tetap)
s1 = ''.join('' if (b.startswith(('<p:sp>', '<p:pic>')) and (lambda o: o and int(o.group(1)) < 4650000 and int(o.group(4)) != 10948111 and T0 <= int(o.group(2)) < T0 + 5 * PL)(re.search(GEOM, b))) else b
             for b in re.split(r'(<p:sp>.*?</p:sp>|<p:pic>.*?</p:pic>)', s1, flags=re.S))
# latar baris & garis dasar ke pita baru
def geser(blok):
    o = re.search(GEOM, blok)
    if not o: return blok
    x, y, cx, cy = int(o.group(1)), int(o.group(2)), int(o.group(4)), int(o.group(5))
    if not (T0 <= y < T0 + 5 * PL): return blok
    i = (y - T0) // PL
    if x == 621792 and cx == 10948111 and cy == 585216: return pindah(blok, T0 + i * PB, PITA)
    return blok
s1 = ''.join(geser(b) if b.startswith(('<p:sp>', '<p:pic>')) else b for b in re.split(r'(<p:sp>.*?</p:sp>|<p:pic>.*?</p:pic>)', s1, flags=re.S))
# garis dasar: 3 kelompok x 5 baris templat dibuang, 4 x 6 dibangun ulang selebar kelompok baru
lama_garis = [b for b in re.findall(r'<p:sp>.*?</p:sp>', s1, re.S) if (lambda g: g and g[2] == GW0 and g[3] == 7315)(geom(b))]
assert len(lama_garis) == 15, len(lama_garis)
for b in lama_garis:
    s1 = s1.replace(b, '', 1)
baru = [setgeom(T['garis'], GX[g_], T0 + i * PB + 338328, GW, 7315) for i in range(6) for g_ in GRUP]
for i, k in enumerate(TOP6):
    blok, atas = SUMBER[k]; dy = (T0 + i * PB + PITA // 2) - (atas + PUSAT_NAMA[k])
    baru += [pindah(b, int(re.search(GEOM, b).group(2)) + dy) for b in blok]
out = []
for b in baru:
    nid[0] += 1; out.append(re.sub(r'<p:cNvPr id="\d+"', f'<p:cNvPr id="{nid[0]}"', b, 1))
s1 = s1.replace('</p:spTree>', ''.join(out) + '</p:spTree>')
s1 = kepala_tabel(s1, nid)   # kepala 4 kolom + label hari langsung bertanggal PAR['kolom']
REL_S2 = re.findall(r'<Relationship Id="(\w+)" Type="[^"]*/image" Target="([^"]+)"/>', open(SP + '/deck/x/ppt/slides/_rels/slide2.xml.rels').read())
BARU = [T0 + i * PB + 338328 for i in range(6)]
for base, k in zip(BARU, P5): s1 = isi_baris(s1, base, 118872, k, nid, aoff=9144, ah=128016, hapus_lama=False)
s1 = rep(s1, '<a:t>Jumlah 5 provinsi</a:t>', '<a:t>Jumlah 6 provinsi</a:t>')
if BANJIR:
    s1 = banjir_teks(s1)
else:
    s1 = rep(s1, '<a:t>5 provinsi</a:t>', '<a:t>6 provinsi</a:t>')
    s1 = rep(s1, '<a:t> prioritas; ±</a:t>', '<a:t> teratas; ±</a:t>')
    for base, k in zip([2697480, 3429000, 4160520], P3): s2 = isi_baris(s2, base, 310896, k, nid)
    s1 = ganti_total(s1, 5330952, P5, nid)
    s2 = ganti_total(s2, 4416552, P3, nid); s2 = ganti_total(s2, 4855464, P8, nid)
    L5 = sum(bul(A[k]['luas'][3]) for k in P5); T5 = sum(bul(A[k]['luas'][1]) for k in P5); B5 = sum(bul(A[k]['belum'][3]) for k in P5); B8 = sum(bul(A[k]['belum'][3]) for k in P8); D5 = sum(bul(A[k]['padam'][3]) for k in P5)
    s1 = rep(s1, '<a:t>502,08 ha</a:t>', f'<a:t>±{f0(D5)} ha</a:t>')   # ± menempel di angka oranye (pemilik 27 Okt 2026)
    s1 = rep(s1, '<a:t>51 persen</a:t>', f'<a:t>{bul(D5 / T5 * 100)} persen</a:t>')
    s1 = rep(s1, '<a:t>983,34 ha</a:t>', f'<a:t>±{f0(T5)} ha</a:t>')
    s1 = rep(s1, '<a:t> telah padam pada </a:t>', f'<a:t> api {PAR["padam_dari"]} {"" if PAR.get("belum_lbl") else "telah "}padam pada </a:t>')   # belum_lbl memanjangkan kalimat: "telah" dibuang supaya tak tertutup pil CUT OFF
    s1 = rep(s1, '<a:t>481,26 ha</a:t>', f'<a:t>±{f0(B5)} ha</a:t>')
    s2 = rep(s2, '<a:t>554,76 ha</a:t>', f'<a:t>{f0(B8)} ha</a:t>')
    s2 = rep(s2, '<a:t>LUAS TERBAKAR / TARGET</a:t>', '<a:t>LUAS TERBAKAR*</a:t>')   # kepala s1 dibangun ulang kepala_tabel()
    s2 = rep(s2, '<a:t>BELUM PADAM</a:t>', '<a:t>BELUM PADAM*</a:t>')
    for lama, i in (('272 FS', 1), ('269 FS', 2), ('279 FS', 3)):
        s2 = rep(s2, f'<a:t>{lama}</a:t>', f'<a:t>{f0(sum(A[k]["fs"][i] for k in P8))} titik</a:t>')
    s2 = rep(s2, '<a:t>Fire spot 8 provinsi</a:t>', '<a:t>Lokasi api bertahan, 8 provinsi</a:t>')
    s2 = rep(s2, '<a:t>3 provinsi tambahan masuk prioritas karena peningkatan hotspot.</a:t>', '<a:t>3 provinsi tambahan masuk daftar prioritas.</a:t>')
    CAT = '**Perkiraan satelit VIIRS S-NPP (NASA FIRMS), 4,3 ha per titik; belum padam = titik yang bertahan ≥1 hari di lokasi sama.'
    s1 = rep(s1, '<a:t>*Hotspot berdasarkan GIS (Geographic Information System).</a:t>',
             '<a:t>*Data berdasarkan Geographic Information System (GIS) dengan satelit NASA (FIRMS: VIIRS dan MODIS).</a:t>')   # pemilik 27 Okt 2026: tanpa kalimat Firespot dan "Angka D sementara"
    s2 = rep(s2, '<a:t>Fire spot belum termasuk Papua Selatan dan Sulawesi Tengah.</a:t>', '<a:t>Lokasi api bertahan = kluster titik api satelit yang menyala ≥1 hari di tempat sama; berbeda dari Fire Spot BNPB.</a:t>')
    s2 = rep(s2, '<a:t>*Hotspot berdasarkan GIS (Geographic Information System). NA: belum ada data laporan lapangan.</a:t>', '<a:t>*Data berdasarkan Geographic Information System (GIS) dengan satelit NASA (FIRMS: VIIRS dan MODIS).</a:t>')
    CUTOFF = PAR['cutoff']
    for s_ in ('s1', 's2'):
        globals()[s_] = rep(globals()[s_], '<a:t>21 Okt 2026, 07.00 WIB</a:t>', f'<a:t>{CUTOFF}</a:t>')
    # kolom tanggal slide2 18/19/20 -> kolom laporan (urutan ganti: 20 dulu supaya tidak terganti dua kali).
    # slide1 tidak ikut: label harinya sudah dibangun bertanggal oleh kepala_tabel().
    # Lewat penanda dulu, bukan langsung: untuk deck 18-20 Okt tanggal barunya SAMA dengan tanggal templat, jadi
    # penggantian beruntun akan menghitung ulang label yang baru saja ditulis.
    for j, a in enumerate(('18 Okt', '19 Okt', '20 Okt')):
        assert s2.count(f'<a:t>{a}</a:t>') == 3, (a, s2.count(f'<a:t>{a}</a:t>'))
        s2 = s2.replace(f'<a:t>{a}</a:t>', f'<a:t>@kolom{j}@</a:t>')
    for j in range(3):
        s2 = s2.replace(f'<a:t>@kolom{j}@</a:t>', f'<a:t>{PAR["kolom"][j]}</a:t>')
    # slide1: satu-satunya label hari yang boleh ada adalah ketiga kolom laporan, masing-masing sekali per kelompok
    hari_s1 = sorted(set(re.findall(r'<a:t>(\d{1,2} [A-Z][a-z]{2})</a:t>', s1)))
    harus = sorted({h for v in KOLOM.values() for h in v})
    assert hari_s1 == harus, f'label hari slide1 {hari_s1}, harusnya {harus}'
    for hr in harus:
        n_ = sum(v.count(hr) for v in KOLOM.values())
        assert s1.count(f'<a:t>{hr}</a:t>') == n_, f'label {hr} muncul {s1.count(f"<a:t>{hr}</a:t>")} kali, harusnya {n_}'
    # tanggal judul (21) dan subjudul (20) sama-sama jadi hari laporan; lewat penanda supaya deck 20 atau 21 Okt
    # tidak menghitung angka yang baru saja ditulis sebagai token templat yang belum diganti
    s1 = rep(s1, '<a:t>21</a:t>', '<a:t>@hari@</a:t>'); s1 = rep(s1, '<a:t>20</a:t>', '<a:t>@harisub@</a:t>')
    s1 = s1.replace('<a:t>@hari@</a:t>', f'<a:t>{PAR["hari"]}</a:t>').replace('<a:t>@harisub@</a:t>', f'<a:t>{PAR.get("hari_ha", PAR["hari"])}</a:t>')
    s1 = rep(s1, '<a:t> Oktober </a:t>', f'<a:t> {PAR["bulan"]} </a:t>')   # bulan judul   # subjudul: '... telah padam pada 21 Okt'
    for a in (' teratas; ±', ') dari ±', ' Okt, belum padam ±'):   # ± templat (hitam) dibuang; ± ikut angka oranye di atas
        s1 = rep(s1, f'<a:t>{a}</a:t>', f'<a:t>{a[:-1]}</a:t>')
    s1 = rep(s1, '<a:t> Okt, belum padam </a:t>', f'<a:t> {PAR["bln"]}, belum padam {PAR["belum_lbl"] + " " if PAR.get("belum_lbl") else ""}</a:t>')   # bulan subjudul; hari belum padam bila beda dari hari padam
    GES = 235639  # geser ikon+teks LUAS TERBAKAR agar rata tengah di kotaknya (slide2 saja; kepala slide1 sudah rata dari kepala_tabel)
    s2 = rep(s2, '<a:off x="7111898" y="1554480"/>', f'<a:off x="{7111898 + GES}" y="1554480"/>')
    s2 = rep(s2, '<a:off x="7386218" y="1463040"/>', f'<a:off x="{7386218 + GES}" y="1463040"/>')
zi = zipfile.ZipFile(SRC); zo = zipfile.ZipFile(OUT, 'w', zipfile.ZIP_DEFLATED)
for it in zi.infolist():
    d = zi.read(it.filename)
    if it.filename == 'ppt/slides/slide1.xml': d = s1.encode()
    if it.filename == 'ppt/slides/slide2.xml': d = s2.encode()
    if it.filename == 'ppt/slides/_rels/slide1.xml.rels':
        d = d.decode().replace('</Relationships>', ''.join(f'<Relationship Id="S2{r}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="{t}"/>' for r, t in REL_S2)
            + ''.join(f'<Relationship Id="logo{k}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/logo-{k}.png"/>' for k in LOGO)
            + ''.join(f'<Relationship Id="{r}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/ikon-{n}.png"/>' for r, n in IKON_BANJIR.items() if BANJIR)
            + '<Relationship Id="rIdFs" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/ikon-firespot.png"/></Relationships>').encode()
    zo.writestr(it, d)

for k, j in LOGO.items(): zo.writestr(f'ppt/media/logo-{k}.png', open(j, 'rb').read())
zo.writestr('ppt/media/ikon-firespot.png', open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'ikon', 'firespot.png'), 'rb').read())
for n in IKON_BANJIR.values() if BANJIR else ():
    zo.writestr(f'ppt/media/ikon-{n}.png', open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'ikon', f'{n}.png'), 'rb').read())
zo.close()
if BANJIR:
    print('ok banjir', {g_: f0(sum(bul(nol(A[k][g_][3])) for k in TOP6)) for g_ in GRUP})
else:
    print('ok luas20', f0(L5), 'luas18', f0(T5), 'padam', f0(D5), bul(D5 / T5 * 100), '% belum5', f0(B5), 'belum8', f0(B8))
