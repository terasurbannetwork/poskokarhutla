"""Halaman perusahaan di Laporan Penanganan Karhutla 081126 (pemilik 9 Nov). Rev4: top 10 luas terbakar, pemegang saham asing, lampiran 99 perusahaan.
Daftar perusahaan dari web/aktor_karhutla.json (salinan centurisk97.id/data terbitan 9 Nov), saringan sama dengan public/aktor.js.
Angka 1 Jan s.d. 9 Nov dari perusahaan_angka.json (perusahaan_hitung.py).

tambah(pptx) menempelkan slide ke berkas generator sebelum lewat_deck, jadi logo KRIS dan bingkai deck.py ikut seperti slide lain.
Kepala slide (judul, subjudul, garis, logo, kaki) dibuat sama dengan slide Operasi.
"""
import json, os, re, zipfile
from xml.sax.saxutils import escape

S = os.path.dirname(os.path.abspath(__file__))
LOGO_GRUP = os.path.normpath(os.path.join(S, '..', '..', '..', '..', '..', 'public', 'img', 'logo-grup'))
NAVY, ORG, MERAH, BIRU_ABU, INK, TEKS, ABU, GARIS, LATAR = '051C2C', 'D9600B', 'C8102E', '3F5F80', '1A1A1A', '2E3440', '6B7280', 'BFC5CC', 'F7F8FA'
X0, W, Y0, Y_BAWAH = 548640, 11094415, 1325880, 6390000
IND = {'Kelapa sawit': ORG, 'Hutan tanaman (pulp)': BIRU_ABU, 'Hutan alam (HPH)': NAVY}
LOGO = [(r'Nordic Forest', 'stora-enso'), (r'Salween', 'gic'), (r'Gochean', 'tpg'), (r'Sampoerna|AGPA', 'sampoerna-agro'), (r'POSCO', 'posco'), (r'Musim Mas', 'musim-mas')]
SINGKAT = {'Nordic Forest Development Holdings Pte Ltd': 'Nordic Forest', 'Premier Palmoil Energy Pte Ltd': 'Premier Palmoil', 'Salween Investment Pte Ltd': 'Salween Investment'}
R1 = '1 Jan s.d. 9 Nov'
FR_10 = (.03, .22, .075, .15, .14, .13, .13, .125)
FR_99 = (.03, .225, .07, .16, .135, .125, .13, .125)
PER = 20
fmt = lambda v: f'{int(v):,}'.replace(',', '.')


def muat():
    """Saringan layar: hanya yang ada di peta konsesi; poligon senama di provinsi lain memakai provinsi peta (aktor.js A.muat, exAktor)."""
    d = json.load(open(os.path.join(S, 'web', 'aktor_karhutla.json'), encoding='utf-8'))
    P = [p for p in d['perusahaan'] if (p.get('cek') or {}).get('poligon')]
    for p in P:
        if p['cek'].get('lokasi') == 'beda' and p['cek'].get('prov_peta'):
            p['prov'], p['cek']['lokasi'] = p['cek']['prov_peta'], 'cocok'
    return d, P, [p for p in P if p.get('titik_agu') is not None or p.get('titik_sep') is not None]


def angka():
    """{nama: baris perusahaan_angka.json} hasil perusahaan_hitung.py (1 Jan s.d. 9 Nov)."""
    return {x['nama']: x for x in json.load(open(os.path.join(S, 'perusahaan_angka.json'), encoding='utf-8'))['perusahaan']}


def urut_luas(Semua, A_):
    return sorted(Semua, key=lambda p: (-A_[p['nama']]['luas'], p['nama']))


class Halaman:
    def __init__(s, nid=100): s.n, s.o, s.gbr = nid, [], {}

    def nid(s): s.n += 1; return s.n

    def _rpr(s, sz, b, c): return (f'<a:rPr lang="id-ID" sz="{int(sz)}"{" b=\"1\"" if b else ""} dirty="0"><a:solidFill><a:srgbClr val="{c}"/></a:solidFill>'
                                   '<a:latin typeface="Roboto"/><a:ea typeface="Roboto"/><a:cs typeface="Roboto"/></a:rPr>')

    def tx(s, x, y, w, h, paras, sz=950, c=INK, b=False, al='l', an='ctr', wrap='square'):
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


def tabel(h, baris, no0, A_, FR, KP, RH, sz, total=None):
    """Tabel perusahaan: luas terbakar dan satu kolom hotspot akumulatif 1 Jan s.d. 9 Nov (pemilik 9 Nov)."""
    PAD = 120000; IW = W - 2 * PAD; xs, x = [], X0 + PAD
    for f in FR: xs.append((x, IW * f)); x += IW * f
    n = len(baris) + (1 if total else 0); PH = 70000 + KP + 30000 + n * RH + 45000
    h.kotak(X0, Y0, W, PH, 'FFFFFF', 'roundRect', ln=GARIS, adj=2500)
    y = Y0 + 70000; KK = int(KP * .58)
    for (xx, ww), t in zip(xs, ('NO', 'PERUSAHAAN', 'NEGARA', 'GRUP', 'INDUSTRI', 'PROVINSI')):
        h.tx(xx, y, ww, KP, [t], sz=800, b=True, c=ABU, al='ctr', wrap='none')
    for i0, i1, lab, w_ in ((6, 6, [[('INDIKASI LUAS', 'FFFFFF', True)], [('TERBAKAR ', 'FFFFFF', True), ('(ha)', 'E6ECF3', False)]], BIRU_ABU),
                            (7, 7, [[('HOTSPOT ', 'FFFFFF', True), ('(titik)', 'E6ECF3', False)]], NAVY)):
        xa, wa = xs[i0][0] + 22000, xs[i1][0] + xs[i1][1] - xs[i0][0] - 44000
        # ikon sama dengan kepala kolom slide 2 (pemilik 9 Nov: "coba tambahin icon"); ikon + teks satu blok di tengah kotak
        ic, tw, ik = 170000, 880000 if i0 == 6 else 760000, 'ikon-luas' if i0 == 6 else 'ikon-hotspot'; gx = xa + (wa - ic - 60000 - tw) / 2
        h.kotak(xa, y, wa, KK, w_, 'roundRect', adj=12000); h.gambar(gx, y + (KK - ic) / 2, ic, ic, os.path.join(S, 'perusahaan-aset', ik + '.png'))
        h.tx(gx + ic + 60000, y, tw, KK, lab, sz=800, wrap='none')
    for i, t in ((6, R1), (7, R1)):
        h.tx(xs[i][0], y + KK, xs[i][1], KP - KK, [t], sz=700, c=ABU, b=True, al='ctr', wrap='none')
    y += KP + 30000
    fb = 150000 if RH > 300000 else 105000; lb = fb * 4 / 3; gap = 26000
    for i, p in enumerate(baris, no0):
        if (i - no0) % 2 == 0: h.kotak(X0 + PAD, y, IW, RH, LATAR)
        a = A_[p['nama']]
        h.tx(xs[0][0], y, xs[0][1], RH, [str(i)], sz=sz, al='ctr', c=TEKS, wrap='none')
        h.tx(xs[1][0] + 50000, y, xs[1][1] - 50000, RH, [p['nama']], sz=sz + 50, b=True, wrap='none')
        kode = [k for k in p['negara'] if k != 'ID']; x_b = xs[2][0] + (xs[2][1] - (len(kode) * lb + max(0, len(kode) - 1) * gap)) / 2
        for n_, k in enumerate(kode): h.bendera(x_b + n_ * (lb + gap), y + (RH - fb) / 2, k, fb)
        if not kode: h.tx(xs[2][0], y, xs[2][1], RH, ['–'], sz=sz, al='ctr', c=ABU)
        g_ = ', '.join(SINGKAT.get(g, g) for g in p['grup'])
        h.tx(xs[3][0], y, xs[3][1], RH, [g_ or '–'], sz=sz - 50, c=TEKS if g_ else ABU, al='ctr', wrap='none')
        d_ = 82296; ind = p.get('industri') or ''
        h.kotak(xs[4][0] + 50000, y + (RH - d_) / 2, d_, d_, IND.get(ind, ABU))
        h.tx(xs[4][0] + 50000 + d_ + 50000, y, xs[4][1] - 180000, RH, [ind], sz=sz - 50, c=TEKS, wrap='none')
        h.tx(xs[5][0], y, xs[5][1], RH, [p['prov']], sz=sz - 50, c=TEKS, al='ctr', wrap='none')
        for (xx, ww), v in zip(xs[6:], (a['luas'], a['hs_total'])):
            h.tx(xx, y, ww, RH, ['–' if v is None else fmt(v)], sz=sz + 100, b=bool(v), c=INK if v else ABU, al='ctr', wrap='none')
        y += RH
    if total:
        h.kotak(X0 + PAD, y, IW, RH, NAVY, 'roundRect', adj=9000)
        h.tx(xs[0][0] + 80000, y, 3000000, RH, [total[0]], sz=sz + 100, b=True, c='FFFFFF', wrap='none')
        for (xx, ww), v in zip(xs[6:], total[1]): h.tx(xx, y, ww, RH, [fmt(v)], sz=sz + 100, b=True, c='FFFFFF', al='ctr', wrap='none')


def s_tabel(d, Semua, A_):
    assert len(Semua) == 99, len(Semua)
    h = Halaman(); RH = (Y_BAWAH - Y0 - 70000 - 560000 - 30000 - 45000) // 10
    tabel(h, urut_luas(Semua, A_)[:10], 1, A_, FR_10, 560000, RH, 950)
    return h, 'Top 10 Perusahaan dengan Indikasi Luas Terbakar Terluas di Tahun 2026', [(f"{sum(1 for p in Semua if A_[p['nama']]['hs_total'])} dari {len(Semua)} perusahaan", 1), (' terdapat hotspot di lahan konsesinya', 0)]   # firespot dibuang pemilik 9 Nov; 2 perusahaan nol hotspot, jadi tidak ditulis "99"


def s_lampiran(d, Semua, A_):
    """Semua perusahaan, 20 baris per halaman, baris terakhir jumlah (tally dengan kolom di atasnya)."""
    urut = urut_luas(Semua, A_); hal = [urut[i:i + PER] for i in range(0, len(urut), PER)]; out = []
    jum = [sum(A_[p['nama']][m] or 0 for p in urut) for m in ('luas', 'hs_total')]
    RH = (Y_BAWAH - Y0 - 70000 - 500000 - 30000 - 45000) // PER
    for i, ps in enumerate(hal):
        h = Halaman(); akhir = i == len(hal) - 1
        tabel(h, ps, i * PER + 1, A_, FR_99, 500000, RH, 800, total=('Jumlah 99 perusahaan', jum) if akhir else None)
        out.append((h, f'Lampiran: Daftar 99 Perusahaan Terindikasi Karhutla ({i + 1}/{len(hal)})', [(f'Peringkat {i * PER + 1} sampai {i * PER + len(ps)}', 1), (', urut indikasi luas terbakar terbesar tahun 2026', 0)]))
    return out


def s_asing(d, P, A_):
    from PIL import Image
    h = Halaman(); g = {}
    for p in P:
        for x in p.get('pemegang') or []:
            if x['negara'] != 'ID': g.setdefault(x['negara'], {}).setdefault(p['nama'], (p, []))[1].append(x['nama'])
    urut = sorted(g.items(), key=lambda a: -len(a[1]))
    nP, nN = len({n for _, v in urut for n in v}), len(urut); assert (nP, nN) == (8, 5), (nP, nN)
    titik = lambda p: A_[p['nama']]['hs_total']

    def kepala(x, y, w, kode, nama, n):
        h.kotak(x, y, w, 330000, NAVY, 'roundRect', adj=14000)
        h.bendera(x + 110000, y + 75000, kode, 180000)
        h.tx(x + 110000 + 240000 + 80000, y, w - 900000, 330000, [nama], sz=1000, b=True, c='FFFFFF', wrap='none')
        h.tx(x + w - 800000, y, 700000, 330000, [f'{n} perusahaan'], sz=850, c='E6ECF3', al='r', wrap='none')

    def logo_dari(p, nama_p):
        if p['nama'] == 'PT Mayawana Persada': return os.path.join(S, 'perusahaan-aset', 'mayawana-tanda.png')   # tanda logo situs resmi perusahaan (versi berteks putih pucat di latar putih)
        if re.search('Gochean', nama_p): return os.path.join(S, 'perusahaan-aset', 'tpg.png')   # logo situs resmi TPG (ikon layar 32 px terlalu kasar)
        if re.search('First Resources', nama_p): return os.path.join(S, 'perusahaan-aset', 'first-resources.png')   # logo situs resmi grup
        f = next((f for r, f in LOGO if re.search(r, nama_p)), None)
        return os.path.join(LOGO_GRUP, f + '.png') if f else None

    def butir(x, y, w, ch, p, xs, kolom_logo=640000, kecil=False):
        nama_p = '; '.join(xs); f = logo_dari(p, nama_p); tx0 = x + kolom_logo
        if f:   # logo utuh dalam kotak, rasio asli
            w0, h0 = Image.open(f).size; bw, bh = kolom_logo - 90000, min(ch - 180000, 520000); k = min(bw / w0, bh / h0); lw, lh = w0 * k, h0 * k
            h.gambar(x + (bw - lw) / 2, y + (ch - lh) / 2, lw, lh, f)
        h.tx(tx0, y + 70000, x + w - tx0, 230000, [p['nama']], sz=1050, b=True, wrap='none')
        h.tx(tx0, y + 305000, x + w - tx0, ch - 305000 - 250000, ['Pemegang: ' + nama_p], sz=900, c=TEKS, an='t')
        d_ = 91440; yb = y + ch - 235000
        h.kotak(tx0, yb + (180000 - d_) / 2, d_, d_, IND.get(p.get('industri'), ABU))
        h.tx(tx0 + d_ + 60000, yb, 1500000, 180000, [p.get('industri') or ''], sz=800 if kecil else 900, c=TEKS, wrap='none')
        h.tx(x + w - 1150000, yb, 1150000, 180000, [[(fmt(titik(p)), MERAH, True), (' hotspot', TEKS, False)]], sz=850 if kecil else 950, al='r', wrap='none')

    GAP = 96000; CH = (Y_BAWAH - Y0 - 2 * 330000 - 2 * 60000 - GAP) // 4
    (k0, v0), lain = urut[0], urut[1:]
    ps = sorted(v0.values(), key=lambda a: -titik(a[0])); PH = 330000 + 3 * CH + 60000
    h.kotak(X0, Y0, W, PH, 'FFFFFF', 'roundRect', ln=GARIS, adj=2500)
    kepala(X0, Y0, W, k0, d['negara'][k0], len(ps))
    cw = (W - 2 * 130000 - 2 * 170000) / 3
    for i, (p, xs) in enumerate(ps):
        butir(X0 + 130000 + (i % 3) * (cw + 170000), Y0 + 330000 + 30000 + (i // 3) * CH + 25000, cw, CH - 50000, p, xs)
    jum = sum(titik(p) for p, _ in ps); sw = sum(1 for p, _ in ps if p.get('industri') == 'Kelapa sawit'); cx = X0 + 130000 + cw + 170000; cy = Y0 + 330000 + 30000 + 2 * CH + 60000
    h.kotak(cx, cy, 2 * cw + 170000, CH - 110000, LATAR, 'roundRect', adj=9000)
    h.tx(cx + 200000, cy, 2000000, CH - 110000, [fmt(jum)], sz=3200, b=True, c=MERAH, wrap='none')
    h.tx(cx + 2150000, cy, 2 * cw + 170000 - 2300000, CH - 110000, [[(f'hotspot di {len(ps)} konsesi berpemegang saham Singapura', INK, True)], [(f'{sw} kelapa sawit, {len(ps) - sw} hutan tanaman (pulp); 1 Jan s.d. 9 Nov 2026', TEKS, False, 900)]], sz=1050)
    y2 = Y0 + PH + GAP; n = len(lain); w2 = (W - (n - 1) * GAP) / n; H2 = 330000 + CH + 60000
    for i, (k, v) in enumerate(lain):
        x = X0 + i * (w2 + GAP)
        h.kotak(x, y2, w2, H2, 'FFFFFF', 'roundRect', ln=GARIS, adj=5000)
        kepala(x, y2, w2, k, d['negara'][k], len(v))
        p, xs = next(iter(v.values())); butir(x + 90000, y2 + 330000 + 45000, w2 - 180000, CH - 30000, p, xs, kolom_logo=470000, kecil=True)
    return h, 'Pemegang Saham Asing Perusahaan Terindikasi Karhutla', [(f'{nP} perusahaan', 1), (' memiliki pemegang saham di ', 0), (f'{nN} negara', 1)]


def tambah(pptx):
    """Slide baru sesudah Operasi: top 10, pemegang saham asing, lalu lampiran. Kepala disusun dari slide Operasi (slide3.xml)."""
    d, P, Semua = muat(); A_ = angka()
    z = zipfile.ZipFile(pptx); F = {n: z.read(n) for n in z.namelist()}; z.close()
    x3, r3 = F['ppt/slides/slide3.xml'].decode(), F['ppt/slides/_rels/slide3.xml.rels'].decode()
    sp = re.findall(r'<p:(?:sp|pic)>.*?</p:(?:sp|pic)>', x3, re.S)[:7]   # judul, subjudul, dua garis, logo BNPB, kaki, nomor
    awal, akhir = x3[:x3.index(sp[0])], x3[x3.index('</p:spTree>'):]
    rid_logo = re.search(r'r:embed="([^"]+)"', sp[4])[1]
    rel_logo = re.search(rf'<Relationship [^>]*Id="{rid_logo}"[^>]*/>', r3)[0]
    rel_tata = re.search(r'<Relationship [^>]*slideLayout[^>]*/>', r3)[0]
    susunan = [s_tabel(d, Semua, A_), s_asing(d, P, A_)] + s_lampiran(d, Semua, A_)
    for i, (h, judul, sub) in enumerate(susunan):
        no = 5 + i; kp = Halaman(nid=10)
        kp.tx(548640, 274320, 10454335, 603504, [judul], sz=2600, b=True, an='b')
        if len(judul) > 64: kp.o[-1] = kp.o[-1].replace(' dirty="0">', ' spc="-45" dirty="0">', 1)   # judul pemilik 69 huruf: tetap satu baris (gerbang D-50)
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
