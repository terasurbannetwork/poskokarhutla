"""Dua halaman perusahaan di Laporan Penanganan Karhutla 081126 (pemilik 9 Nov: tangkapan kartu Perusahaan + Modal asing tab Insight,
"masukin ini untuk di laphar karhutla kemarin"). Angka dari web/aktor_karhutla.json (salinan centurisk97.id/data terbitan 9 Nov), saringan
dan urutan sama dengan public/aktor.js, bukan disalin dari gambar.

tambah(pptx) menempelkan slide ke berkas generator sebelum lewat_deck, jadi logo KRIS dan bingkai deck.py ikut seperti slide lain.
Kepala slide (judul, subjudul, garis, logo, kaki) dibuat sama dengan slide Operasi.
"""
import json, os, re, zipfile
from xml.sax.saxutils import escape

S = os.path.dirname(os.path.abspath(__file__))
LOGO_GRUP = os.path.normpath(os.path.join(S, '..', '..', '..', 'public', 'img', 'logo-grup'))
NAVY, ORG, MERAH, BIRU_ABU, INK, TEKS, ABU, GARIS, LATAR = '051C2C', 'D9600B', 'C8102E', '3F5F80', '1A1A1A', '2E3440', '6B7280', 'BFC5CC', 'F7F8FA'
X0, W, Y0, Y_BAWAH = 548640, 11094415, 1325880, 6390000
IND = {'Kelapa sawit': ORG, 'Hutan tanaman (pulp)': BIRU_ABU, 'Hutan alam (HPH)': NAVY}
LOGO = [(r'Nordic Forest', 'stora-enso'), (r'Salween', 'gic'), (r'Gochean', 'tpg'), (r'Sampoerna|AGPA', 'sampoerna-agro'), (r'POSCO', 'posco'), (r'Musim Mas', 'musim-mas')]
fmt = lambda v: f'{int(v):,}'.replace(',', '.')


def muat():
    """Saringan layar: hanya yang ada di peta konsesi; poligon senama di provinsi lain memakai provinsi peta (aktor.js A.muat, exAktor)."""
    d = json.load(open(os.path.join(S, 'web', 'aktor_karhutla.json'), encoding='utf-8'))
    P = [p for p in d['perusahaan'] if (p.get('cek') or {}).get('poligon')]
    for p in P:
        if p['cek'].get('lokasi') == 'beda' and p['cek'].get('prov_peta'):
            p['prov'], p['cek']['lokasi'] = p['cek']['prov_peta'], 'cocok'
    return d, P, [p for p in P if p.get('titik_agu') is not None or p.get('titik_sep') is not None]


class Halaman:
    def __init__(s, nid=100): s.n, s.o, s.gbr = nid, [], {}

    def nid(s): s.n += 1; return s.n

    def _rpr(s, sz, b, c): return (f'<a:rPr lang="id-ID" sz="{int(sz)}"{" b=\"1\"" if b else ""} dirty="0"><a:solidFill><a:srgbClr val="{c}"/></a:solidFill>'
                                   '<a:latin typeface="Roboto"/><a:ea typeface="Roboto"/><a:cs typeface="Roboto"/></a:rPr>')

    def tx(s, x, y, w, h, paras, sz=950, c=INK, b=False, al='l', an='ctr', wrap='square', spc=None):
        """paras: daftar paragraf; tiap paragraf teks atau daftar run (teks, warna, tebal[, ukuran])."""
        isi = ''
        for p in paras:
            runs = [(p, c, b)] if isinstance(p, str) else p
            isi += f'<a:p><a:pPr algn="{al}"/>' + ''.join(f'<a:r>{s._rpr(r[3] if len(r) > 3 else sz, r[2], r[1])}<a:t>{escape(r[0])}</a:t></a:r>' for r in runs) + '</a:p>'
        s.o.append(f'<p:sp><p:nvSpPr><p:cNvPr id="{s.nid()}" name="Teks"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="{int(x)}" y="{int(y)}"/><a:ext cx="{int(w)}" cy="{int(h)}"/></a:xfrm>'
                   f'<a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/></p:spPr><p:txBody><a:bodyPr wrap="{wrap}" lIns="0" tIns="0" rIns="0" bIns="0" anchor="{an}"/><a:lstStyle/>{isi}</p:txBody></p:sp>')

    def kotak(s, x, y, w, h, fill=None, geom='rect', ln=None, adj=None):
        av = f'<a:avLst><a:gd name="adj" fmla="val {adj}"/></a:avLst>' if adj is not None else '<a:avLst/>'
        isi = f'<a:solidFill><a:srgbClr val="{fill}"/></a:solidFill>' if fill else '<a:noFill/>'
        gr = f'<a:ln w="9525"><a:solidFill><a:srgbClr val="{ln}"/></a:solidFill></a:ln>' if ln else '<a:ln><a:noFill/></a:ln>'
        s.o.append(f'<p:sp><p:nvSpPr><p:cNvPr id="{s.nid()}" name="Bentuk"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="{int(x)}" y="{int(y)}"/><a:ext cx="{int(w)}" cy="{int(h)}"/></a:xfrm>'
                   f'<a:prstGeom prst="{geom}">{av}</a:prstGeom>{isi}{gr}</p:spPr></p:sp>')

    def gambar(s, x, y, w, h, path):
        rid = s.gbr.setdefault(path, f'rIdPr{len(s.gbr) + 1}')
        s.o.append(f'<p:pic><p:nvPicPr><p:cNvPr id="{s.nid()}" name="Gambar"/><p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr><p:nvPr/></p:nvPicPr><p:blipFill><a:blip r:embed="{rid}"/>'
                   f'<a:stretch><a:fillRect/></a:stretch></p:blipFill><p:spPr><a:xfrm><a:off x="{int(x)}" y="{int(y)}"/><a:ext cx="{int(w)}" cy="{int(h)}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr></p:pic>')

    def bendera(s, x, y, kode, h=150000):
        s.gambar(x, y, h * 4 / 3, h, os.path.join(S, 'perusahaan-aset', kode.lower() + '.png'))
        s.kotak(x, y, h * 4 / 3, h, None, ln=GARIS)   # separuh putih bendera (Singapura) tetap terbaca di baris putih

    def keterangan(s, y, baris):
        s.kotak(X0, y, W, Y_BAWAH - y, LATAR, 'roundRect', adj=9000)
        s.tx(X0 + 128016, y, 1000000, Y_BAWAH - y, ['KETERANGAN'], sz=800, b=True)
        s.tx(X0 + 1150000, y + 30000, W - 1280000, Y_BAWAH - y - 60000, baris, sz=850, c=TEKS)


def s_tabel(d, Semua):
    h = Halaman(); s26 = lambda p: p.get('sawit26') or {}
    urut = sorted(Semua, key=lambda p: -(s26(p).get('luas_bakar_ha') if s26(p).get('luas_bakar_ha') is not None else -1))[:10]
    FR = (.035, .205, .07, .135, .125, .115, .095, .08, .07, .07); PAD = 120000; KP, RH = 530000, 372000
    IW = W - 2 * PAD; xs, x = [], X0 + PAD
    for f in FR: xs.append((x, IW * f)); x += IW * f
    PH = 80000 + KP + 40000 + 10 * RH + 50000
    h.kotak(X0, Y0, W, PH, 'FFFFFF', 'roundRect', ln=GARIS, adj=2500)
    y = Y0 + 80000
    for (xx, ww), t in zip(xs, ('NO', 'PERUSAHAAN', 'NEGARA', 'GRUP', 'INDUSTRI', 'PROVINSI')):
        h.tx(xx, y, ww, KP, [t], sz=800, b=True, c=ABU, al='ctr', wrap='none')
    awal, kini = '1 Jan s.d. 27 Okt', '2 s.d. 9 Nov'
    for (xx, ww), (lab, sat, per, w_) in zip(xs[6:], (('INDIKASI LUAS', 'TERBAKAR (ha)', awal, BIRU_ABU), ('HOTSPOT', '(titik)', awal, NAVY), ('HOTSPOT', '(titik)', kini, NAVY), ('FIRESPOT', '(titik)', kini, MERAH))):
        h.kotak(xx + 22000, y, ww - 44000, KP, w_, 'roundRect', adj=9000)
        h.tx(xx + 22000, y, ww - 44000, KP, [[(lab, 'FFFFFF', True)], [(sat, 'FFFFFF', lab.startswith('INDIKASI'))], [(per, 'E6ECF3', False, 700)]], sz=780, al='ctr', wrap='none')
    y += KP + 40000
    for i, p in enumerate(urut, 1):
        if i % 2: h.kotak(X0 + PAD, y, IW, RH, LATAR)
        c = p['cek']
        h.tx(xs[0][0], y, xs[0][1], RH, [str(i)], al='ctr', c=TEKS)
        h.tx(xs[1][0] + 60000, y, xs[1][1] - 60000, RH, [p['nama']], sz=1000, b=True, wrap='none')
        kode = [k for k in p['negara'] if k != 'ID']; bw = 200000; x_b = xs[2][0] + (xs[2][1] - (len(kode) * bw + max(0, len(kode) - 1) * 30000)) / 2
        if kode:
            for n, k in enumerate(kode): h.bendera(x_b + n * (bw + 30000), y + (RH - 150000) / 2, k)
        else: h.tx(xs[2][0], y, xs[2][1], RH, ['–'], al='ctr', c=ABU)
        h.tx(xs[3][0], y, xs[3][1], RH, [', '.join(p['grup']) or '–'], sz=900, c=TEKS if p['grup'] else ABU, al='ctr', wrap='none')
        d_ = 91440; ind = p.get('industri') or ''
        h.kotak(xs[4][0] + 60000, y + (RH - d_) / 2, d_, d_, IND.get(ind, ABU))
        h.tx(xs[4][0] + 60000 + d_ + 60000, y, xs[4][1] - 200000, RH, [ind], sz=900, c=TEKS, wrap='none')
        h.tx(xs[5][0], y, xs[5][1], RH, [p['prov']], sz=900, c=TEKS, al='ctr', wrap='none')
        for (xx, ww), v in zip(xs[6:], (s26(p).get('luas_bakar_ha'), s26(p).get('titik'), c.get('titik_terkini'), c.get('firespot_terkini'))):
            h.tx(xx, y, ww, RH, ['–' if v is None else fmt(v)], sz=1050, b=bool(v), c=INK if v else ABU, al='ctr', wrap='none')
        y += RH
    asing = sum(any(k != 'ID' for k in p['negara']) for p in Semua)
    n_kini = sum(1 for p in Semua if p['cek'].get('titik_terkini') and p['cek'].get('lokasi') != 'beda')
    h.keterangan(Y0 + PH + 80000, ['10 dari 99 perusahaan, urut indikasi luas terbakar terbesar. Indikasi dari satelit, bukan penetapan pelanggaran. Bendera = negara afiliasi grup atau pemegang saham.',
                                   'Luas = piksel VIIRS unik x 14,06 ha per konsesi (bukan citra). Hotspot = titik VIIRS 375 m di poligon konsesi senama. Firespot = titik di cluster yang lolos syarat metode Kemenhut.'])
    assert (len(Semua), asing, n_kini) == (99, 81, 22), (len(Semua), asing, n_kini)
    return h, 'Perusahaan Terindikasi Karhutla Tahun 2026', [(f'{len(Semua)} perusahaan', 1), (' terindikasi karhutla 2026, ', 0), (str(asing), 1), (' terafiliasi luar negeri; ', 0), (str(n_kini), 1), (' masih ada hotspot di konsesinya 2 s.d. 9 Nov', 0)]


def s_asing(d, P):
    h = Halaman(); g = {}
    for p in P:
        for x in p.get('pemegang') or []:
            if x['negara'] != 'ID': g.setdefault(x['negara'], {}).setdefault(p['nama'], (p, []))[1].append(x['nama'])
    urut = sorted(g.items(), key=lambda a: -len(a[1]))
    nP, nN = len({n for _, v in urut for n in v}), len(urut); assert (nP, nN) == (8, 5), (nP, nN)
    titik = lambda p: p['cek'].get('titik_viirs') or 0

    def kepala(x, y, w, kode, nama, n):
        h.kotak(x, y, w, 330000, NAVY, 'roundRect', adj=14000)
        h.bendera(x + 110000, y + 75000, kode, 180000)
        h.tx(x + 110000 + 240000 + 80000, y, w - 900000, 330000, [nama], sz=1000, b=True, c='FFFFFF', wrap='none')
        h.tx(x + w - 800000, y, 700000, 330000, [f'{n} perusahaan'], sz=850, c='E6ECF3', al='r', wrap='none')

    def butir(x, y, w, ch, p, xs):
        nama_p = '; '.join(xs); f = next((f for r, f in LOGO if re.search(r, nama_p)), None); tx0 = x
        if f: h.gambar(x, y + (ch - 300000) / 2, 300000, 300000, os.path.join(LOGO_GRUP, f + '.png')); tx0 = x + 380000
        h.tx(tx0, y + 40000, x + w - tx0, 215000, [p['nama']], sz=1000, b=True, wrap='none')
        h.tx(tx0, y + 255000, x + w - tx0, ch - 255000 - 225000, ['Pemegang: ' + nama_p], sz=850, c=TEKS, an='t')
        d_ = 91440; yb = y + ch - 200000
        h.kotak(tx0, yb + (170000 - d_) / 2, d_, d_, IND.get(p.get('industri'), ABU))
        h.tx(tx0 + d_ + 60000, yb, 1500000, 170000, [p.get('industri') or ''], sz=850, c=TEKS, wrap='none')
        h.tx(x + w - 1000000, yb, 1000000, 170000, [[(fmt(titik(p)), MERAH, True), (' hotspot', TEKS, False)]], sz=900, al='r', wrap='none')

    GAP, CH = 96000, 835000
    (k0, v0), lain = urut[0], urut[1:]
    ps = sorted(v0.values(), key=lambda a: -titik(a[0])); PH = 330000 + 3 * CH + 60000
    h.kotak(X0, Y0, W, PH, 'FFFFFF', 'roundRect', ln=GARIS, adj=2500)
    kepala(X0, Y0, W, k0, d['negara'][k0], len(ps))
    cw = (W - 2 * 130000 - 2 * 170000) / 3
    for i, (p, xs) in enumerate(ps):
        cx = X0 + 130000 + (i % 3) * (cw + 170000); cy = Y0 + 330000 + 30000 + (i // 3) * CH
        butir(cx, cy + 25000, cw, CH - 50000, p, xs)
    # dua sel sisa baris ketiga: jumlah hotspot konsesi Singapura (= jumlah butir di atasnya)
    jum = sum(titik(p) for p, _ in ps); sw = sum(1 for p, _ in ps if p.get('industri') == 'Kelapa sawit'); cx = X0 + 130000 + cw + 170000; cy = Y0 + 330000 + 30000 + 2 * CH + 40000
    h.kotak(cx, cy, 2 * cw + 170000, CH - 90000, LATAR, 'roundRect', adj=9000)
    h.tx(cx + 200000, cy, 1700000, CH - 90000, [fmt(jum)], sz=2800, b=True, c=MERAH, wrap='none')
    h.tx(cx + 1750000, cy, 2 * cw + 170000 - 1900000, CH - 90000, [[('hotspot di 7 konsesi berpemegang saham Singapura', INK, True)], [(f'{sw} kelapa sawit, {len(ps) - sw} hutan tanaman (pulp); 1 Jan s.d. 31 Agu 2026', TEKS, False, 850)]], sz=1000)
    y2 = Y0 + PH + GAP; n = len(lain); w2 = (W - (n - 1) * GAP) / n; H2 = 330000 + CH + 60000
    for i, (k, v) in enumerate(lain):
        x = X0 + i * (w2 + GAP)
        h.kotak(x, y2, w2, H2, 'FFFFFF', 'roundRect', ln=GARIS, adj=5000)
        kepala(x, y2, w2, k, d['negara'][k], len(v))
        p, xs = next(iter(v.values())); butir(x + 110000, y2 + 330000 + 45000, w2 - 220000, CH - 30000, p, xs)
    h.keterangan(y2 + H2 + 80000, ['Tiga perusahaan punya pemegang saham di dua negara, jadi tercatat di dua kotak: PT Hutan Ketapang Industri (Singapura, Korea Selatan), PT Mayawana Persada (BVI, Samoa), PT Sumber Mardhika Graha (Singapura, Kep. Cayman).',
                                   'Hotspot = titik VIIRS di poligon konsesi, 1 Jan s.d. 31 Agu 2026. Indikasi dari satelit, bukan penetapan pelanggaran.'])
    return h, 'Pemegang Saham Asing Perusahaan Terindikasi Karhutla', [(f'{nP} perusahaan', 1), (' memiliki pemegang saham di ', 0), (f'{nN} negara', 1), (', termasuk yurisdiksi rahasia BVI dan Samoa', 0)]


def tambah(pptx):
    """Slide baru ke-4 dan ke-5, disusun dari kepala slide Operasi (slide3.xml)."""
    d, P, Semua = muat()
    z = zipfile.ZipFile(pptx); F = {n: z.read(n) for n in z.namelist()}; z.close()
    x3, r3 = F['ppt/slides/slide3.xml'].decode(), F['ppt/slides/_rels/slide3.xml.rels'].decode()
    sp = re.findall(r'<p:(?:sp|pic)>.*?</p:(?:sp|pic)>', x3, re.S)[:7]   # judul, subjudul, dua garis, logo BNPB, kaki, nomor
    awal, akhir = x3[:x3.index(sp[0])], x3[x3.index('</p:spTree>'):]
    rid_logo = re.search(r'r:embed="([^"]+)"', sp[4])[1]
    rel_logo = re.search(rf'<Relationship [^>]*Id="{rid_logo}"[^>]*/>', r3)[0]
    rel_tata = re.search(r'<Relationship [^>]*slideLayout[^>]*/>', r3)[0]
    for i, (no, h_) in enumerate(((5, s_tabel(d, Semua)), (6, s_asing(d, P)))):
        h, judul, sub = h_
        kp = Halaman(nid=10)
        kp.tx(548640, 274320, 10454335, 603504, [judul], sz=2600, b=True, an='b')
        kp.tx(548640, 905256, 10454335, 256032, [[(t, ORG if b_ else INK, bool(b_)) for t, b_ in sub]], sz=1200, an='b')
        kaki = sp[2] + sp[3] + sp[4] + sp[5] + re.sub(r'<a:t>\d+</a:t>', f'<a:t>{i + 4}</a:t>', sp[6])
        rel = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' + rel_tata + rel_logo
        for path, rid in h.gbr.items():
            media = 'prs-' + os.path.basename(path); F['ppt/media/' + media] = open(path, 'rb').read()
            rel += f'<Relationship Id="{rid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/{media}"/>'
        F[f'ppt/slides/slide{no}.xml'] = (awal.replace('name="Slide 3"', f'name="Slide {i + 4}"') + ''.join(kp.o) + kaki + ''.join(h.o) + akhir).encode()
        F[f'ppt/slides/_rels/slide{no}.xml.rels'] = (rel + '</Relationships>').encode()
        F['ppt/_rels/presentation.xml.rels'] = F['ppt/_rels/presentation.xml.rels'].replace(b'</Relationships>', f'<Relationship Id="rId{200 + i}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide{no}.xml"/></Relationships>'.encode())
        F['ppt/presentation.xml'] = F['ppt/presentation.xml'].replace(b'</p:sldIdLst>', f'<p:sldId id="{400 + i}" r:id="rId{200 + i}"/></p:sldIdLst>'.encode())
        F['[Content_Types].xml'] = F['[Content_Types].xml'].replace(b'</Types>', f'<Override PartName="/ppt/slides/slide{no}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/></Types>'.encode())
    if b'Extension="png"' not in F['[Content_Types].xml']:
        F['[Content_Types].xml'] = F['[Content_Types].xml'].replace(b'<Default ', b'<Default Extension="png" ContentType="image/png"/><Default ', 1)
    t = pptx + '.tmp'
    with zipfile.ZipFile(t, 'w', zipfile.ZIP_DEFLATED) as zo:
        for n in ['[Content_Types].xml'] + [n for n in F if n != '[Content_Types].xml']: zo.writestr(n, F[n])
    os.replace(t, pptx)
    return pptx
