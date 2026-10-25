import math
import re, json, sys, zipfile
SP = sys.argv[1]; A = json.load(open(SP + '/angka.json'))['prov']
SRC = SP + '/deck/src.pptx'; OUT = sys.argv[2]
def bul(v): return int(math.floor(v + 0.5))  # pembulatan sekali, setengah ke atas
def f0(v): return f"{bul(v):,}".replace(',', '.')
LX = {'hot': [4663440, 5372913, 6082386], 'luas': [6974738, 7684211, 8393684], 'belum': [9286037, 9995510, 10704982]}
BX = {'hot': [4914907, 5624380, 6333853], 'luas': [7226206, 7935678, 8645151], 'belum': [9537504, 10246977, 10956450]}
NX = [4709160, 5418633, 6128106, 7020458, 7729931, 8439404, 9331757, 10041230, 10750702]
s1 = open(SP + '/deck/x/ppt/slides/slide1.xml').read()
SHAPES = lambda s: list(re.finditer(r'<p:sp>.*?</p:sp>', s, re.S))
def geom(b):
    o = re.search(r'<a:off x="(\d+)" y="(\d+)"/><a:ext cx="(\d+)" cy="(\d+)"/>', b)
    return tuple(map(int, o.groups())) if o else None
def text(b): return ''.join(re.findall(r'<a:t>([^<]*)</a:t>', b))
# template dari baris pertama slide 1
T = {}
for m in SHAPES(s1):
    b = m.group(0); g = geom(b)
    if not g: continue
    t = text(b)
    if t == '452,49': T['lab'] = b
    if t == '431,66': T['lab3'] = b
    if t == '▼9%': T['arr'] = b
    if g[0] == 7935678 and g[1] == 2404633: T['bar'] = b
assert len(T) == 4, T.keys()
def setgeom(b, x, y, cx, cy):
    return re.sub(r'<a:off x="\d+" y="\d+"/><a:ext cx="\d+" cy="\d+"/>', f'<a:off x="{x}" y="{y}"/><a:ext cx="{cx}" cy="{cy}"/>', b, 1)
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
            if x in LX['hot'] + LX['luas'] + LX['belum'] and cy in (164592, 137160) and cx == 800913: hapus = True
            if x in BX['hot'] + BX['luas'] + BX['belum'] and cx == 297979: hapus = True
            if x in NX and cx == 709473 and cy == 182880: hapus = True
        out.append(s[pos:m.start()]); pos = m.end()
        if not hapus: out.append(b)
    out.append(s[pos:]); s = ''.join(out)
    baru = []
    for grp in ('hot', 'luas', 'belum'):
        v = A[k][grp]; tiga = v[1:4]; mx = max(tiga) or 1
        for i in range(3):
            h = max(18288, round(H * tiga[i] / mx)); top = base - h
            arr, ct, cb = banding(bul(tiga[i]), bul(v[i]))  # panah dari angka yang tampil
            bar = setcol_fill(setgeom(T['bar'], BX[grp][i], top, 297979, h), cb)
            lab = settext(setgeom(T['lab3' if i == 2 else 'lab'], LX[grp][i], top - 173736, 800913, 164592), f0(tiga[i]))
            ar = setcol_text(settext(setgeom(T['arr'], LX[grp][i], base + aoff, 800913, ah), arr), ct)
            baru += [bar, lab, ar]
    out = []
    for b in baru:
        nid[0] += 1
        out.append(re.sub(r'<p:cNvPr id="\d+"', f'<p:cNvPr id="{nid[0]}"', b, 1))
    return s.replace('</p:spTree>', ''.join(out) + '</p:spTree>')
def ganti_total(s, y, kode):
    for grp in ('hot', 'luas', 'belum'):
        for i in range(3):
            tot = sum(bul(A[k][grp][i + 1]) for k in kode)  # jumlah = jumlah angka yang tampil
            def r(m):
                b = m.group(0); g = geom(b)
                if g and g[0] == LX[grp][i] and g[1] == y: return settext(b, f0(tot))
                return b
            s = re.sub(r'<p:sp>.*?</p:sp>', r, s, flags=re.S)
    return s
def rep(s, a, b):
    assert s.count(a) == 1, (a, s.count(a)); return s.replace(a, b)
P5 = ['62', '16', '63', '15', '61', '14']; P3 = ['93', '72', '64']; P8 = P5 + P3   # P5 = 6 provinsi prioritas BNPB (nama variabel lama)
s2 = open(SP + '/deck/x/ppt/slides/slide2.xml').read()
nid = [5000]
LAMA = [2587752, 3209544, 3831336, 4453128, 5074920]
for base in LAMA:   # buang semua label/batang/panah lama 5 baris
    s1 = ''.join(b if not (lambda g: g and base - 201168 - 260000 < g[1] < base + 100000 and (
        (g[0] in LX['hot'] + LX['luas'] + LX['belum'] and g[3] in (164592, 137160) and g[2] == 800913) or
        (g[0] in BX['hot'] + BX['luas'] + BX['belum'] and g[2] == 297979)))(geom(b)) else '' for b in re.split(r'(<p:sp>.*?</p:sp>)', s1, flags=re.S))
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
LOGO_NTT = None
if '53' in TOP6:   # NTT tidak ada di templat BNPB: salin baris Kaltim, ganti nama dan logo (lambang NTT, Wikimedia Commons)
    blok, atas = SUMBER['64']; nb = []
    xs = [int(re.search(GEOM, b).group(1)) for b in blok if b.startswith('<p:pic>')]
    for b in blok:
        if b.startswith('<p:pic>') and int(re.search(GEOM, b).group(1)) == min(xs):
            b = re.sub(r'r:embed="\w+"', 'r:embed="NTTlogo"', b)
        if '<a:t>Kalimantan Timur</a:t>' in b:
            b = b.replace('<a:t>Kalimantan Timur</a:t>', '<a:t>Nusa Tenggara Timur</a:t>')
            b = re.sub(r'sz="(\d+)"', lambda m: f'sz="{round(int(m.group(1)) * 0.88)}"', b)   # nama lebih panjang: huruf 88%
            b = re.sub(r'(<a:ext cx=")\d+', r'\g<1>1563624', b, 1)
        nb.append(b)
    SUMBER['53'] = (nb, atas); LOGO_NTT = SP + '/logo-ntt.png'
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
    if x in (4709160, 7020458, 9331757) and cx == 2128418 and cy == 7315: return pindah(blok, T0 + i * PB + 338328)
    return blok
s1 = ''.join(geser(b) if b.startswith(('<p:sp>', '<p:pic>')) else b for b in re.split(r'(<p:sp>.*?</p:sp>|<p:pic>.*?</p:pic>)', s1, flags=re.S))
baru = []
garis4 = [b for b in re.findall(r'<p:sp>.*?</p:sp>', s1, re.S) if (lambda o: o and int(o.group(4)) == 2128418 and int(o.group(5)) == 7315 and int(o.group(2)) == T0 + 3 * PB + 338328)(re.search(GEOM, b))]
assert len(garis4) == 3, len(garis4)
baru += [pindah(b, T0 + 5 * PB + 338328) for b in garis4]   # garis dasar baris ke-6
for i, k in enumerate(TOP6):
    blok, atas = SUMBER[k]; dy = (T0 + i * PB + PITA // 2) - (atas + PUSAT_NAMA[k])
    baru += [pindah(b, int(re.search(GEOM, b).group(2)) + dy) for b in blok]
out = []
for b in baru:
    nid[0] += 1; out.append(re.sub(r'<p:cNvPr id="\d+"', f'<p:cNvPr id="{nid[0]}"', b, 1))
s1 = s1.replace('</p:spTree>', ''.join(out) + '</p:spTree>')
REL_S2 = re.findall(r'<Relationship Id="(\w+)" Type="[^"]*/image" Target="([^"]+)"/>', open(SP + '/deck/x/ppt/slides/_rels/slide2.xml.rels').read())
BARU = [T0 + i * PB + 338328 for i in range(6)]
for base, k in zip(BARU, P5): s1 = isi_baris(s1, base, 118872, k, nid, aoff=9144, ah=128016, hapus_lama=False)
s1 = rep(s1, '<a:t>Jumlah 5 provinsi</a:t>', '<a:t>Jumlah 6 provinsi</a:t>')
s1 = rep(s1, '<a:t>5 provinsi</a:t>', '<a:t>6 provinsi</a:t>')
s1 = rep(s1, '<a:t> prioritas; ±</a:t>', '<a:t> teratas; ±</a:t>')
for base, k in zip([2697480, 3429000, 4160520], P3): s2 = isi_baris(s2, base, 310896, k, nid)
s1 = ganti_total(s1, 5330952, P5)
s2 = ganti_total(s2, 4416552, P3); s2 = ganti_total(s2, 4855464, P8)
L5 = sum(bul(A[k]['luas'][3]) for k in P5); T5 = sum(bul(A[k]['luas'][1]) for k in P5); B5 = sum(bul(A[k]['belum'][3]) for k in P5); B8 = sum(bul(A[k]['belum'][3]) for k in P8); D5 = sum(bul(A[k]['padam'][3]) for k in P5)
s1 = rep(s1, '<a:t>502,08 ha</a:t>', f'<a:t>{f0(D5)} ha</a:t>')
s1 = rep(s1, '<a:t>51 persen</a:t>', f'<a:t>{bul(D5 / T5 * 100)} persen</a:t>')
s1 = rep(s1, '<a:t>983,34 ha</a:t>', f'<a:t>{f0(T5)} ha</a:t>')
s1 = rep(s1, '<a:t> telah padam pada </a:t>', '<a:t> api 21 Okt telah padam pada </a:t>')
s1 = rep(s1, '<a:t>481,26 ha</a:t>', f'<a:t>{f0(B5)} ha</a:t>')
s2 = rep(s2, '<a:t>554,76 ha</a:t>', f'<a:t>{f0(B8)} ha</a:t>')
for s_ in ('s1', 's2'):
    globals()[s_] = rep(globals()[s_], '<a:t>LUAS TERBAKAR / TARGET</a:t>', '<a:t>LUAS TERBAKAR*</a:t>')
    globals()[s_] = rep(globals()[s_], '<a:t>BELUM PADAM</a:t>', '<a:t>BELUM PADAM*</a:t>')
for lama, i in (('272 FS', 1), ('269 FS', 2), ('279 FS', 3)):
    s2 = rep(s2, f'<a:t>{lama}</a:t>', f'<a:t>{f0(sum(A[k]["fs"][i] for k in P8))} lokasi</a:t>')
s2 = rep(s2, '<a:t>Fire spot 8 provinsi</a:t>', '<a:t>Lokasi api bertahan, 8 provinsi</a:t>')
s2 = rep(s2, '<a:t>3 provinsi tambahan masuk prioritas karena peningkatan hotspot.</a:t>', '<a:t>3 provinsi tambahan masuk daftar prioritas.</a:t>')
CAT = '**Perkiraan satelit VIIRS S-NPP (NASA FIRMS), 4,3 ha per titik; belum padam = titik yang bertahan ≥1 hari di lokasi sama.'
s1 = rep(s1, '<a:t>*Hotspot berdasarkan GIS (Geographic Information System).</a:t>', '<a:t>*Data berdasarkan Geographic Information System (GIS) dengan satelit NASA (FIRMS: VIIRS dan MODIS).</a:t>')
s2 = rep(s2, '<a:t>Fire spot belum termasuk Papua Selatan dan Sulawesi Tengah.</a:t>', '<a:t>Lokasi api bertahan = kluster titik api satelit yang menyala ≥1 hari di tempat sama; berbeda dari Fire Spot BNPB.</a:t>')
s2 = rep(s2, '<a:t>*Hotspot berdasarkan GIS (Geographic Information System). NA: belum ada data laporan lapangan.</a:t>', '<a:t>*Data berdasarkan Geographic Information System (GIS) dengan satelit NASA (FIRMS: VIIRS dan MODIS).</a:t>')
CUTOFF = '23 Okt 2026, 15.00 WIB'  # FIRMS ditarik 14.58 WIB; hari 23 Okt sementara
for s_ in ('s1', 's2'):
    globals()[s_] = rep(globals()[s_], '<a:t>21 Okt 2026, 07.00 WIB</a:t>', f'<a:t>{CUTOFF}</a:t>')
# kolom tanggal 18/19/20 -> 19/20/21 Okt (urutan ganti: 20->21 dulu supaya tidak terganti dua kali)
for s_ in ('s1', 's2'):
    x = globals()[s_]
    for a, b in (('20 Okt', '23 Okt'), ('19 Okt', '22 Okt'), ('18 Okt', '21 Okt')):
        assert x.count(f'<a:t>{a}</a:t>') == 3, (s_, a, x.count(f'<a:t>{a}</a:t>'))
        x = x.replace(f'<a:t>{a}</a:t>', f'<a:t>{b}</a:t>')
    globals()[s_] = x
s1 = rep(s1, '<a:t>21</a:t>', '<a:t>23</a:t>')   # judul: per Tanggal 22 Oktober
s1 = rep(s1, '<a:t>20</a:t>', '<a:t>23</a:t>')   # subjudul: '... telah padam pada 21 Okt'
for a in (' teratas; ±', ') dari ±', ' Okt, belum padam ±'):   # selera pemilik: tanpa ± (22 Okt 2026)
    s1 = rep(s1, f'<a:t>{a}</a:t>', f'<a:t>{a[:-1]}</a:t>')
GES = 235639  # geser ikon+teks LUAS TERBAKAR agar rata tengah di kotaknya
for s_ in ('s1', 's2'):
    globals()[s_] = rep(globals()[s_], '<a:off x="7111898" y="1554480"/>', f'<a:off x="{7111898 + GES}" y="1554480"/>')
    globals()[s_] = rep(globals()[s_], '<a:off x="7386218" y="1463040"/>', f'<a:off x="{7386218 + GES}" y="1463040"/>')
zi = zipfile.ZipFile(SRC); zo = zipfile.ZipFile(OUT, 'w', zipfile.ZIP_DEFLATED)
for it in zi.infolist():
    d = zi.read(it.filename)
    if it.filename == 'ppt/slides/slide1.xml': d = s1.encode()
    if it.filename == 'ppt/slides/slide2.xml': d = s2.encode()
    if it.filename == 'ppt/slides/_rels/slide1.xml.rels':
        d = d.decode().replace('</Relationships>', ''.join(f'<Relationship Id="S2{r}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="{t}"/>' for r, t in REL_S2)
            + ('<Relationship Id="NTTlogo" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/logo-ntt.png"/>' if LOGO_NTT else '') + '</Relationships>').encode()
    zo.writestr(it, d)

if LOGO_NTT: zo.writestr('ppt/media/logo-ntt.png', open(LOGO_NTT, 'rb').read())
zo.close()
print('ok luas20', f0(L5), 'luas18', f0(T5), 'padam', f0(D5), bul(D5 / T5 * 100), '% belum5', f0(B5), 'belum8', f0(B8))
