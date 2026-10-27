"""Sisipkan slide depan 'Peta Hotspot untuk Pengendalian dan Penanganan Karhutla 2026' (data 20 Okt) ke deck hasil ganti.py.
Pakai: python3 -I tambah_peta.py <deck.pptx> <peta.png> <angka_nasional.json> [operasi]  (deck ditimpa; 'operasi' = halaman operasi ikut)"""
import json, math, os, re, sys, zipfile
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kisi import lebar_teks   # noqa: E402
DECK, PNG, AN = sys.argv[1], sys.argv[2], sys.argv[3]
OPERASI = sys.argv[4:] == ['operasi']
A = json.load(open(AN))['prov']
NAMA = {k: v['nama'] for k, v in json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', '..', 'public', 'data', 'laporan.json')))['prov'].items()}
I, IP = 3, 2
PAR = json.load(open('param.json'))
LBL_HA, LBL_LUAS = PAR.get('ha_lbl'), PAR.get('luas_lbl')   # luas (& belum padam) = hari utuh terakhir (penanganan.py ha_utuh, belum_kini)
def bul(v): return int(math.floor(v + 0.5))
def f0(v): return f"{bul(v):,}".replace(',', '.')
z = zipfile.ZipFile(DECK); F = {n: z.read(n) for n in z.namelist()}; z.close()
s1 = F['ppt/slides/slide1.xml'].decode()
head, tree_tail = s1.split('<p:spTree>', 1); tree, tail = tree_tail.split('</p:spTree>', 1)
shapes = [m.group(0) for m in re.finditer(r'<p:(sp|pic|cxnSp|grpSp)>.*?</p:\1>', tree, re.S)]
pre = tree[:tree.index(shapes[0])]
def geom(b):
    o = re.search(r'<a:off x="(\d+)" y="(\d+)"/>\s*<a:ext cx="(\d+)" cy="(\d+)"/>', b); return tuple(map(int, o.groups()))
keep = [b for b in shapes if geom(b)[1] < 1350000 or geom(b)[1] >= 6150000 or geom(b)[:2] == (548640, 1353312)]
def settexts(b, texts):
    it = iter(texts)
    return re.sub(r'<a:t>[^<]*</a:t>', lambda m: f'<a:t>{next(it, "")}</a:t>', b)
rows = sorted(A, key=lambda k: -A[k]['hot'][I]); ada = [k for k in rows if A[k]['hot'][I] > 0]
HOT = sum(A[k]['hot'][I] for k in A); HOTP = sum(A[k]['hot'][IP] for k in A)
LUAS = sum(bul(A[k]['luas'][I]) for k in A); BEL = sum(bul(A[k]['belum'][I]) for k in A)
FS = sum(A[k]['fs'][I] for k in A)
top = rows[0]
out = []
for b in keep:
    t = ''.join(re.findall(r'<a:t>([^<]*)</a:t>', b))
    if t.startswith('Penanganan dan Pengendalian'):
        b = settexts(b, ['Peta Hotspot untuk Pengendalian dan Penanganan Karhutla 2026'])
    elif t.startswith(('5 provinsi', '6 provinsi')):
        runs = re.findall(r'<a:r>.*?</a:r>', b, re.S)
        oranye = re.search(r'<a:rPr.*?</a:rPr>', runs[0], re.S).group(0); biasa = re.search(r'<a:rPr.*?</a:rPr>', runs[1], re.S).group(0)
        SUB = [('Terbanyak di ', 0), (NAMA[top], 1), (' (', 0), (f'{f0(A[top]["hot"][I])} titik', 1), ('). Total: ', 0), (f'{f0(HOT)} titik', 1),
               (', ', 0), (f'{f0(LUAS)} ha', 1), (' terbakar' + (f' ({LBL_LUAS})' if LBL_LUAS else '') + ', ', 0), (f'{f0(BEL)} ha', 1), (' belum padam' + (f' ({LBL_HA})' if LBL_HA else ''), 0)]
        baru = ''.join(f'<a:r>{oranye if o else biasa}<a:t>{t}</a:t></a:r>' for t, o in SUB)
        b = b[:b.index(runs[0])] + baru + b[b.index(runs[-1]) + len(runs[-1]):]
    out.append(b)
NID = [9000]
def nid(): NID[0] += 1; return NID[0]
def rpr(sz, b, col, it=False, sp=0):
    return (f'<a:rPr lang="id-ID" sz="{sz}"{" b=\"1\"" if b else ""}{" i=\"1\"" if it else ""}{f" spc=\"{sp}\"" if sp else ""} dirty="0">'
            f'<a:solidFill><a:srgbClr val="{col}"/></a:solidFill><a:latin typeface="Roboto"/><a:ea typeface="Roboto"/><a:cs typeface="Roboto"/></a:rPr>')
def kotak(x, y, cx, cy, paras=(), fill=None, line=None, geomp='rect', algn='l', anchor='ctr', adj=None, ins=0, wrap='square'):
    """paras: [[(teks, sz, bold, warna, sp)], ...] satu daftar run per paragraf"""
    av = f'<a:gd name="adj" fmla="val {adj}"/>' if adj is not None else ''
    fl = f'<a:solidFill><a:srgbClr val="{fill}"/></a:solidFill>' if fill else '<a:noFill/>'
    ln = f'<a:ln w="15875"><a:solidFill><a:srgbClr val="{line}"/></a:solidFill></a:ln>' if line else '<a:ln><a:noFill/></a:ln>'
    ps = ''.join(f'<a:p><a:pPr algn="{algn}"><a:buNone/></a:pPr>' + ''.join(f'<a:r>{rpr(r[1], r[2], r[3], sp=r[4] if len(r) > 4 else 0)}<a:t>{r[0]}</a:t></a:r>' for r in p) + '</a:p>' for p in paras) or '<a:p><a:endParaRPr lang="id-ID"/></a:p>'
    i = nid()
    return (f'<p:sp><p:nvSpPr><p:cNvPr id="{i}" name="Peta {i}"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="{x}" y="{y}"/><a:ext cx="{cx}" cy="{cy}"/></a:xfrm>'
            f'<a:prstGeom prst="{geomp}"><a:avLst>{av}</a:avLst></a:prstGeom>{fl}{ln}</p:spPr><p:txBody><a:bodyPr wrap="{wrap}" lIns="{ins}" tIns="0" rIns="{ins}" bIns="0" anchor="{anchor}"/><a:lstStyle/>{ps}</p:txBody></p:sp>')
def gambar(rid, x, y, w, h, nama):
    i = nid()
    return (f'<p:pic><p:nvPicPr><p:cNvPr id="{i}" name="{nama}"/><p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr><p:nvPr/></p:nvPicPr>'
            f'<p:blipFill><a:blip r:embed="{rid}"/><a:stretch><a:fillRect/></a:stretch></p:blipFill><p:spPr><a:xfrm><a:off x="{x}" y="{y}"/><a:ext cx="{w}" cy="{h}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr></p:pic>')
L, R_ = 640080, 11551920                     # tepi dalam panel
# 1) empat kotak angka nasional selebar panel: ikon + label + angka (tanpa ±, tanpa keterangan).
# FIRESPOT (keputusan pemilik 25 Okt 2026) memakai merah Firespot layar; satuannya TITIK, sama dengan hotspot, karena firespot
# adalah bagian dari hotspot (titik yang sudah terkonfirmasi api). Ikon beda tiap kategori, sama di semua slide (pemilik 27 Okt 2026):
# HOTSPOT api templat, FIRESPOT lingkaran bidik deck 25 Okt (rIdIkFs), LUAS kotak, BELUM PADAM peringatan.
ky, kh, gap = 1435608, 502920, 91440; kw = (R_ - L - 3 * gap) // 4
KP = [('051C2C', 'AFC3DA', 'rIdIk1', 'HOTSPOT', f0(HOT), 'titik'),
      ('C9503A', 'FFE3DC', 'rIdIkFs', 'FIRESPOT', f0(FS), 'titik'),
      ('3F5F80', 'D3DFEA', 'rIdIk2', 'LUAS TERBAKAR', f0(LUAS), 'ha'),
      ('D9600B', 'FFDCC2', 'rIdIk3', 'BELUM PADAM', f0(BEL), 'ha')]
for n, (col, muda, rid, lab, val, sat) in enumerate(KP):
    x = L + n * (kw + gap)
    # empat kotak lebih sempit dari tiga: ikon dirapatkan dan huruf dikecilkan supaya label dan angka tidak bertemu
    out.append(kotak(x, ky, kw, kh, fill=col, geomp='roundRect', adj=13636))
    out.append(gambar(rid, x + 128016, ky + (kh - 237744) // 2, 237744, 237744, 'Ikon ' + lab.title()))
    out.append(kotak(x + 438912, ky, kw - 438912 - 109728, kh, [[(lab, 820, True, muda, 80)]], anchor='ctr'))
    out.append(kotak(x + 438912, ky, kw - 438912 - 137160, kh, [[(val, 1600, True, 'FFFFFF'), (' ' + sat, 900, False, 'FFFFFF')]], algn='r', anchor='ctr'))
top_isi = ky + kh + 91440; dasar = 5724144
# 2) peringkat 10 provinsi di kanan; judul kolom bergaya judul kolom slide tabel (kotak warna + ikon + label* + satuan)
CW = [256032, 950000, 800000, 800000, 880000, 820000]; RW = sum(CW); RX = R_ - RW; cx = [RX + sum(CW[:j]) for j in range(6)]
hh = 338328
out.append(kotak(cx[1], top_isi, CW[1], hh, [[('PROVINSI', 750, True, '6B7280', 150)]], anchor='ctr'))
KOL = [(2, 'hot', '051C2C', 'E6ECF3', 'rIdIk1', 'HOTSPOT*', '(titik)'), (3, 'fs', 'C9503A', 'FFE3DC', 'rIdIkFs', 'FIRESPOT*', '(titik)'),
       (4, 'luas', '3F5F80', 'E6ECF3', 'rIdIk2', 'LUAS TERBAKAR*', '(ha)'),
       (5, 'belum', 'D9600B', 'FFE6D5', 'rIdIk3', 'BELUM PADAM*', '(ha)')]
for j, key, col, muda, rid, t, sat in KOL:
    bx, bw = cx[j] + 27432, CW[j] - 27432
    out.append(kotak(bx, top_isi, bw, hh, fill=col, geomp='roundRect', adj=13636))
    tw = lebar_teks([(t, 450, True), (' ' + sat, 450, False)]); x0 = bx + (bw - 100584 - 18288 - tw) // 2   # ikon + tulisan rata tengah
    out.append(gambar(rid, x0, top_isi + (hh - 100584) // 2, 100584, 100584, 'Ikon ' + t))
    out.append(kotak(x0 + 118872, top_isi, tw + 45720, hh, [[(t, 450, True, 'FFFFFF'), (' ' + sat, 450, False, muda)]], anchor='ctr', wrap='none'))
TOP = rows[:10]
MX = {key: max(A[k][key][I] for k in TOP) or 1 for _, key, *_ in KOL}
ry = top_isi + hh + 45720; rh = (dasar - ry) // 10
for n, k in enumerate(TOP):
    y = ry + n * rh; o = A[k]
    if n: out.append(kotak(RX, y, RW, 6350, fill='DCE1E7'))
    out.append(kotak(cx[0] + 27432, y + (rh - 192024) // 2, 192024, 192024, [[(str(n + 1), 700, True, 'FFFFFF')]], fill='051C2C', geomp='ellipse', algn='ctr'))
    out.append(kotak(cx[1] + 45720, y, CW[1] - 45720, rh, [[(NAMA[k], 800 if len(NAMA[k]) <= 18 else 700, True, '1A1A1A')]], anchor='ctr'))
    for j, key, col, *_ in KOL:
        v = o[key][I]; cur, prv = bul(v), bul(o[key][IP])   # persen dari angka yang tampil, vs 19 Okt
        pr = bul((cur - prv) / prv * 100) if prv else None
        ar, ac = (('baru', 'A9B4C2') if pr is None else (f'▲{f0(pr)}%', 'D9600B') if pr > 0 else (f'▼{f0(-pr)}%', '2F86D1') if pr < 0 else ('0%', '6B7280'))
        VW = CW[j] - 329184   # angka rata kanan di kolom tetap, persen rata kiri di kolom tetap: lurus ke bawah
        out.append(kotak(cx[j], y, VW, rh, [[(f0(v), 850, True, '1A1A1A')]], algn='r', anchor='ctr'))
        out.append(kotak(cx[j] + VW + 45720, y, 329184 - 45720, rh, [[(ar, 580, True, ac)]], algn='l', anchor='ctr'))
# 3) peta di kiri, selebar sisa panel, ditengahkan vertikal
X0 = L; W = RX - 182880 - L; H = round(W * 1664 / 4144); Y0 = top_isi + (dasar - top_isi - H) // 2
i = nid()
out.append(f'<p:pic><p:nvPicPr><p:cNvPr id="{i}" name="Peta hotspot 20 Okt"/><p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr><p:nvPr/></p:nvPicPr>'
           f'<p:blipFill><a:blip r:embed="rIdPeta"/><a:stretch><a:fillRect/></a:stretch></p:blipFill><p:spPr><a:xfrm><a:off x="{X0}" y="{Y0}"/><a:ext cx="{W}" cy="{H}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr></p:pic>')
# 4) legenda di bawah panel, posisi & ukuran sama dengan slide tabel
LEG = [('ellipse', 'D9600B', 'Ukuran lingkaran sebanding jumlah titik panas'), ('rect', '051C2C', 'Provinsi dengan titik panas'), ('rect', 'DCE1E7', 'Tanpa titik panas'),
       ('rect', 'D9600B', 'naik dari hari sebelumnya'), ('rect', '2F86D1', 'turun dari hari sebelumnya')]
lw = [128016 + 91440 + round(len(t) * 750 / 100 * 0.5 * 12700) + 320040 for _, _, t in LEG]
x = 548640 + (11094415 - sum(lw)) // 2
for (g, col, t), w in zip(LEG, lw):
    out.append(kotak(x, 5939028, 128016, 128016, fill=col, geomp=g))
    out.append(kotak(x + 219456, 5897880, w - 219456, 210312, [[(t, 750, False, '1A1A1A')]], anchor='ctr'))
    x += w
s4 = head + '<p:spTree>' + pre + ''.join(out) + '</p:spTree>' + tail
# rels: logo + layout dari slide1, peta baru
r1 = F['ppt/slides/_rels/slide1.xml.rels'].decode()
logo = re.search(r'Id="rId1"[^>]*Target="([^"]+)"', r1).group(1)
lay = re.search(r'<Relationship [^>]*slideLayout[^>]*/>', r1).group(0)
assert 'r:embed="rId1"' in s4
rels = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        f'<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="{logo}"/>'
        '<Relationship Id="rIdPeta" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/peta-hotspot-20okt.png"/>'
        + ''.join(f'<Relationship Id="rIdIk{n}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image-1-{n + 1}.png"/>' for n in (1, 2, 3))
        + '<Relationship Id="rIdIkFs" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/ikon-firespot.png"/>'   # ditulis ganti.py
        + re.sub(r'Id="[^"]+"', 'Id="rIdLay"', lay) + '</Relationships>')
# Slide yang dibuang dari deck atas permintaan pemilik: slide2 "Provinsi Tambahan" (22 Okt 2026) dan
# slide3 "Operasi Penanganan Karhutla" (25 Okt 2026; sumbernya teks WA satgas, tidak ada untuk hari lampau), kecuali WA-nya ada (27 Okt).
# Sisa deck: slide4 peta (halaman 1), slide1 tabel (halaman 2), slide3 operasi (halaman 3) bila ikut.
def buang_slide(n, penanda):
    assert penanda in F[f'ppt/slides/slide{n}.xml'].decode(), (n, penanda)
    r = F.pop(f'ppt/slides/_rels/slide{n}.xml.rels', b'').decode()
    for t in re.findall(r'Target="\.\./notesSlides/([^"]+)"', r):
        F.pop('ppt/notesSlides/' + t, None); F.pop('ppt/notesSlides/_rels/' + t + '.rels', None)
        F['[Content_Types].xml'] = re.sub(r'<Override PartName="/ppt/notesSlides/' + re.escape(t) + r'"[^>]*/>', '', F['[Content_Types].xml'].decode()).encode()
    F.pop(f'ppt/slides/slide{n}.xml')
    PR0 = F['ppt/_rels/presentation.xml.rels'].decode()
    rid = re.search(r'Id="(\w+)"[^>]*Target="slides/slide' + str(n) + r'\.xml"', PR0).group(1)
    F['ppt/_rels/presentation.xml.rels'] = re.sub(r'<Relationship [^>]*Target="slides/slide' + str(n) + r'\.xml"/>', '', PR0).encode()
    F['ppt/presentation.xml'] = re.sub(r'<p:sldId id="\d+" r:id="' + rid + r'"/>', '', F['ppt/presentation.xml'].decode()).encode()
    F['[Content_Types].xml'] = F['[Content_Types].xml'].decode().replace(
        f'<Override PartName="/ppt/slides/slide{n}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>', '').encode()
buang_slide(2, 'Provinsi Tambahan')
if not OPERASI:
    buang_slide(3, 'Operasi Penanganan Karhutla')
# nomor halaman: tabel jadi halaman 2
def halaman(x, n):
    return re.sub(r'(<a:off x="11094415" y="6510528"/>.*?<a:t>)\d+(</a:t>)', lambda m: m.group(1) + str(n) + m.group(2), x, count=1, flags=re.S)
F['ppt/slides/slide1.xml'] = halaman(F['ppt/slides/slide1.xml'].decode(), 2).encode()
F['ppt/slides/slide4.xml'] = halaman(s4, 1).encode()
if OPERASI:
    F['ppt/slides/slide3.xml'] = halaman(F['ppt/slides/slide3.xml'].decode(), 3).encode()
F['ppt/slides/_rels/slide4.xml.rels'] = rels.encode()
F['ppt/media/peta-hotspot-20okt.png'] = open(PNG, 'rb').read()
P = F['ppt/presentation.xml'].decode()
assert 'r:id="rId99"' not in P
F['ppt/presentation.xml'] = P.replace('<p:sldIdLst>', '<p:sldIdLst><p:sldId id="300" r:id="rId99"/>', 1).encode()
PR = F['ppt/_rels/presentation.xml.rels'].decode()
F['ppt/_rels/presentation.xml.rels'] = PR.replace('</Relationships>', '<Relationship Id="rId99" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide4.xml"/></Relationships>').encode()
CT = F['[Content_Types].xml'].decode()
F['[Content_Types].xml'] = CT.replace('</Types>', '<Override PartName="/ppt/slides/slide4.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/></Types>').encode()
if 'docProps/app.xml' in F:
    F['docProps/app.xml'] = re.sub(r'<Slides>\d+</Slides>', f'<Slides>{3 if OPERASI else 2}</Slides>', F['docProps/app.xml'].decode()).encode()
zo = zipfile.ZipFile(DECK, 'w', zipfile.ZIP_DEFLATED)
for n in ['[Content_Types].xml'] + [n for n in F if n != '[Content_Types].xml']: zo.writestr(n, F[n])
zo.close()
print('ok', len(ada), 'prov', HOT, HOTP, LUAS, BEL, 'teratas', NAMA[top])
