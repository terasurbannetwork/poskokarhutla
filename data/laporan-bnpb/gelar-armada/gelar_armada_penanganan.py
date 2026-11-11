#!/usr/bin/env python3
"""Satu lembar Gelar Pesawat dan Helikopter Karhutla dengan tampilan halaman Operasi laporan Penanganan Pengendalian Karhutla.

Cetakan: slide 3 (Operasi) dari laporan penanganan yang sudah jadi. Semua isi lama (personel, OMC, semai, armada 5 Nov) dibuang
dan diganti data pesan WA "LAPORAN GELAR PESAWAT DAN HELIKOPTER KARHUTLA". Angka per instansi dihitung dari rincian per provinsi
(rekap instansi di WA 6 Nov tidak menutup dengan rinciannya). Logo KRIS di kiri logo BNPB.

python gelar_armada_penanganan.py <cetakan penanganan.pptx> <logo kris.png> <keluar.pptx>
"""
import copy
from pathlib import Path
import sys

from PIL import Image
from pptx import Presentation
from pptx.util import Inches, Pt

TGL, TGL_PENDEK = '6 November 2026', '6 Nov'
# provinsi (urutan WA): [(instansi, patroli/OMC, WB)]
RINCI = {
    'Kalimantan Barat': [('BNPB', 2, 2), ('TNI', 0, 3)],
    'Kalimantan Tengah': [('BNPB', 3, 4), ('TNI', 0, 1), ('Kemenhut', 0, 1), ('PT Sinarmas', 0, 1)],
    'Kalimantan Selatan': [('BNPB', 2, 3), ('TNI', 1, 1)],
    'Sumatera Selatan': [('BNPB', 2, 4), ('TNI', 2, 0)],
    'Riau': [('BNPB', 1, 1)],
    'Jambi': [('BNPB', 1, 3)],
    'Papua Selatan': [('BNPB', 2, 0)],
    'Jawa Timur': [('Pemda', 0, 1)],
    'Papua Barat Daya': [('PT LNG', 0, 1)],
    'Sulawesi Tenggara': [('TNI', 1, 0)],
    'Maluku Utara': [('BNPB', 1, 0)],
}
# pangkalan Kalimantan Tengah dari WA: (lokasi, patroli/OMC, WB, instansi)
KALTENG = [('Palangka Raya', 2, 3, 'BNPB'), ('Pangkalan Bun', 1, 0, 'BNPB'), ('Sampit', 0, 1, 'BNPB'),
           ('Seruyan', 0, 3, 'TNI, Kemenhut, PT Sinarmas')]
SUMBER = f'Laporan Gelar Pesawat dan Helikopter Karhutla, data {TGL_PENDEK} 2026; patroli/OMC termasuk OMC CASA/CN TNI'
PENDEK = {'Kalimantan Tengah': 'Kalteng', 'Kalimantan Barat': 'Kalbar', 'Kalimantan Selatan': 'Kalsel', 'Sumatera Selatan': 'Sumsel'}

E = 914400


def ins(v):
    return int(round(v * E))


def runs(sh, *teks):
    """Ganti teks run berurutan; run berlebih dikosongkan, format tiap run tetap."""
    rr = [r for p in sh.text_frame.paragraphs for r in p.runs]
    for i, r in enumerate(rr):
        r.text = teks[i] if i < len(teks) else ''


def klon(slide, sh, x=None, y=None, w=None, h=None):
    el = copy.deepcopy(sh._element if hasattr(sh, '_element') else sh)
    slide.shapes._spTree.append(el)
    b = slide.shapes[-1]
    if x is not None: b.left = ins(x)
    if y is not None: b.top = ins(y)
    if w is not None: b.width = ins(w)
    if h is not None: b.height = ins(h)
    return b


def ikon_pin(jalur, warna=(5, 28, 44)):
    """Ikon lokasi navy (gaya ikon pesawat/heli cetakan, garis tebal tanpa isi) untuk butir provinsi."""
    from PIL import ImageDraw
    n = 256; im = Image.new('RGBA', (n, n), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    cx, cy, r, t = n / 2, n * .4, n * .3, int(n * .085)
    d.polygon([(cx - r * .78, cy + r * .62), (cx + r * .78, cy + r * .62), (cx, n * .95)], fill=warna)
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=warna)
    r2 = r - t; d.ellipse([cx - r2, cy - r2, cx + r2, cy + r2], fill=(0, 0, 0, 0))
    d.polygon([(cx - r2 * .72, cy + r2 * .7), (cx + r2 * .72, cy + r2 * .7), (cx, n * .95 - t * 1.6)], fill=(0, 0, 0, 0))
    r3 = r * .36; d.ellipse([cx - r3, cy - r3, cx + r3, cy + r3], fill=warna)
    im.save(jalur)


def buang(sh):
    sh._element.getparent().remove(sh._element)


def main():
    cetak, kris, keluar = sys.argv[1:4]
    prs = Presentation(cetak)
    lst = prs.slides._sldIdLst
    for i, el in reversed(list(enumerate(lst))):
        if i != 2:
            prs.part.drop_rel(el.get('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id'))
            lst.remove(el)
    s = prs.slides[0]
    S = list(s.shapes)
    T = {k: copy.deepcopy(S[k]._element) for k in range(len(S))}   # cetakan elemen sebelum dibuang

    # ---- data
    prov = []
    for p, r in RINCI.items():
        prov.append((p, sum(x[1] for x in r), sum(x[2] for x in r)))
    prov = sorted(prov, key=lambda r: -(r[1] + r[2]))        # stabil: urutan WA untuk jumlah sama (seperti generator)
    inst = {}
    for r in RINCI.values():
        for i, pa, w in r:
            inst.setdefault(i, [0, 0]); inst[i][0] += pa; inst[i][1] += w
    inst = sorted(inst.items(), key=lambda kv: -sum(kv[1]))
    pat, wb = sum(r[1] for r in prov), sum(r[2] for r in prov)
    tot = pat + wb
    assert (pat, wb, tot) == (18, 26, 44)
    assert sum(sum(v) for _, v in inst) == tot and sum(p_ + w_ for _, p_, w_, _ in KALTENG) == 10

    # ---- buang isi lama: tab atas, personel, panel kiri, baris armada
    hapus = set(range(17, 37)) | set(range(38, 99)) | set(range(112, 187)) | set(range(193, 197)) | {8, 9, 10, 39}
    for k in sorted(hapus, reverse=True):
        buang(S[k])

    # ---- kepala
    runs(S[0], 'Gelar Armada Udara Karhutla per Tanggal ', '6', ' November ', '2026')
    runs(S[1], str(tot), ' armada udara di ', f'{len(prov)} provinsi', ': ', str(pat), ' pesawat patroli/OMC dan ',
         f'{wb} heli water bombing')
    w0, h0 = Image.open(kris).size
    hk = 0.36; wk = hk * w0 / h0
    # pusat vertikal kedua logo = pusat huruf judul (render: logo cetakan 0,12 in lebih tinggi dari judul, pemilik 6 Nov 2026 "ga center")
    S[3].top = ins(S[3].top / E + 0.12)
    s.shapes.add_picture(kris, ins(12.25 - wk), ins(S[3].top / E + (S[3].height / E - hk) / 2), ins(wk), ins(hk)).name = 'KRIS logo'

    # ---- strip angka kiri atas: heli WB, pesawat patroli/OMC, provinsi
    runs(S[7], 'ARMADA UDARA')
    ic = klon(s, T[101], x=0.84, y=1.75, w=0.22, h=0.22)       # ikon pesawat putih di lingkaran
    S[6]._element.getparent().remove(S[6]._element)
    # tiga butir sama lebar dibagi rata dari teks kartu sampai tepi kanan kartu, ikon setinggi angka
    # (pemilik 6 Nov 2026: "size and spacingnya ga proporsional")
    S[4].width = ins(7.78)
    pin = Path(keluar).with_name('_ikon_pin.png'); ikon_pin(pin)
    n3 = klon(s, T[15]); l3 = klon(s, T[16])
    p3 = s.shapes.add_picture(str(pin), 0, 0, ins(0.26), ins(0.26))
    X0, KOLW, IK = 1.26, (0.6 + 7.78 - 0.2 - 1.26) / 3, 0.26
    for k, (ik, n, lab, v, teks_) in enumerate([(S[11], S[12], S[13], wb, 'heli water bombing'),
                                                 (S[14], S[15], S[16], pat, 'pesawat patroli/OMC'),
                                                 (p3, n3, l3, len(prov), 'provinsi')]):
        x = X0 + k * KOLW
        ik.left, ik.top, ik.width, ik.height = ins(x), ins(1.78), ins(IK), ins(IK)
        n.left, n.top, n.width, n.height = ins(x + IK + 0.08), ins(1.71), ins(KOLW - IK - 0.1), ins(0.36)
        lab.left, lab.top, lab.width = ins(x + IK + 0.08), ins(2.05), ins(KOLW - IK - 0.1)
        runs(n, str(v)); runs(lab, teks_)
        for r in [r for p in n.text_frame.paragraphs for r in p.runs]: r.font.size = Pt(17)
        for r in [r for p in lab.text_frame.paragraphs for r in p.runs]: r.font.size = Pt(7.5)

    # ---- kotak kanan atas: unit per instansi (gaya PERSONEL PER PROVINSI)
    klon(s, T[17])
    t = klon(s, T[18]); runs(t, 'UNIT PER INSTANSI')
    gx, gy = [8.69, 10.01, 11.33], [1.72, 2.0]
    for k, (nama, (pa, w)) in enumerate(inst):
        x, y = gx[k % 3], gy[k // 3]
        klon(s, T[19], x=x, y=y)
        a = klon(s, T[20], x=x + 0.08, y=y); runs(a, nama)
        b = klon(s, T[21], x=x + 0.5, y=y); runs(b, f'{pa + w}  ', f'{round(100 * (pa + w) / tot)}%')

    # ---- panel kiri: per instansi dan pangkalan Kalteng
    klon(s, T[100], x=0.74, y=2.52, w=0.36, h=0.36)
    klon(s, T[110], x=0.82, y=2.6, w=0.2, h=0.2)
    t = klon(s, T[40]); runs(t, 'RINCIAN ARMADA')

    def sub(y, judul, pil_kiri, pil_kanan, ikon):
        klon(s, T[41], y=y - 0.05)
        klon(s, T[42], y=y - 0.01)
        klon(s, T[ikon], x=0.79, y=y + 0.04, w=0.13, h=0.13)
        a = klon(s, T[44], y=y, w=3.0 if not pil_kiri else None); runs(a, judul)
        if pil_kiri:   # pil tanggal hanya di sub pertama; judul panjang butuh lebar itu
            klon(s, T[45], y=y + 0.01); b = klon(s, T[46], y=y + 0.01); runs(b, pil_kiri)
        klon(s, T[47], y=y + 0.01); c = klon(s, T[48], y=y + 0.01); runs(c, pil_kanan)

    KOL = [(0.74, 1.6), (2.34, 1.15), (3.49, 1.25), (4.74, 1.71)]   # x, lebar kolom tabel

    def kepala(y, nama):
        klon(s, T[49], y=y)
        for (x, w), n in zip(KOL, nama):
            c = klon(s, T[50], x=x, y=y, w=w); runs(c, n)

    def baris(y, h, sel, garis=True):
        klon(s, T[53], y=y + h / 2 - 0.045)
        for k, ((x, w), v) in enumerate(zip(KOL, sel)):
            if k == 0:
                c = klon(s, T[54], x=0.87, y=y, w=w - 0.13, h=h)
            else:
                c = klon(s, T[55], x=x, y=y, w=w, h=h)
                for p in c.text_frame.paragraphs: p.alignment = 2   # tengah
            runs(c, v)
        if garis:
            klon(s, T[183], y=y + h)

    sub(3.0, 'PER INSTANSI', TGL_PENDEK, f'{len(inst)} instansi, {tot} unit', 107)
    kepala(3.26, ['INSTANSI', 'PATROLI/OMC', 'WATER BOMBING', 'JUMLAH'])
    y, h = 3.45, 0.27
    for k, (nama, (pa, w)) in enumerate(inst):
        baris(y, h, [nama, str(pa), str(w), f'{pa + w} unit'], garis=k < len(inst) - 1)
        y += h
    kt = sum(p_ + w_ for _, p_, w_, _ in KALTENG)
    sub(5.2, 'PANGKALAN KALIMANTAN TENGAH', None, f'{len(KALTENG)} lokasi, {kt} unit', 110)
    kepala(5.46, ['LOKASI', 'PATROLI/OMC', 'WATER BOMBING', 'INSTANSI'])
    y, h = 5.65, 0.31
    for k, (lok, pa, w, i_) in enumerate(KALTENG):
        baris(y, h, [lok, str(pa), str(w), i_], garis=k < len(KALTENG) - 1)
        y += h

    # ---- panel kanan: armada udara per provinsi
    runs(S[104], TGL_PENDEK)
    runs(S[105], f'{tot} unit')
    runs(S[108], f'{pat} ', 'patroli/CASA/OMC')
    runs(S[111], f'{wb} ', 'heli water bombing')
    U, X0, Y0, P = 0.3133, 8.52, 3.17, 0.31
    for k, (nama, pa, w) in enumerate(prov):
        y = Y0 + k * P
        a = klon(s, T[112], y=y); runs(a, nama)
        x = X0
        if pa:
            klon(s, T[113], x=x, y=y + 0.04, w=pa * U); b = klon(s, T[114], x=x, y=y + 0.04, w=pa * U); runs(b, str(pa)); x += pa * U
        if w:
            klon(s, T[115], x=x, y=y + 0.04, w=w * U); b = klon(s, T[116], x=x, y=y + 0.04, w=w * U); runs(b, str(w)); x += w * U
        c = klon(s, T[117], x=x + 0.1, y=y); runs(c, str(pa + w), ' unit')

    # ---- kaki
    runs(S[192], 'Sumber: ', SUMBER)
    runs(S[190], '1')
    prs.core_properties.title = f'Gelar Armada Udara Karhutla {TGL}'
    prs.save(keluar)
    print('ok', keluar, dict(inst))


if __name__ == '__main__':
    main()
