"""Paparan BNPB 19 Nov 2026: Dampak Bencana 2026 terhadap lingkungan, masyarakat, UMKM dan petani kecil (karhutla dan gempa).
Lima slide padat bergaya slide padat 8 Nov (padat_slide.py): judul bersorot oranye, logo KRIS dan BNPB, kepala seksi berikon,
tabel berkepala navy, pita Sumber navy. Grafik digambar sebagai bentuk PPT agar angka berformat Indonesia.
Pakai: python bangun.py  -> 'Dampak Bencana 2026 dan Pelajarannya 191126.pptx' (angka dari data.json, dibuat data.py)."""
import json, math, os
from PIL import ImageFont
from pptx import Presentation
from pptx.util import Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.oxml.ns import qn

S = os.path.dirname(os.path.abspath(__file__))
IK = os.path.normpath(os.path.join(S, '../banjir-bang-ghozi-2026-11-08/kerja-slide3/ik'))
FON = os.path.expanduser('~/.claude/skills/ppt-konsultan/bnpb/assets/fonts/')
GEO = os.path.expanduser('~/.claude/skills/ppt-konsultan/bnpb/assets/proyek-bnpb/geo/kabupaten/')
D = json.load(open(os.path.join(S, 'data.json'), encoding='utf-8'))
KELUAR = os.path.join(S, 'Dampak Bencana 2026 dan Pelajarannya 191126.pptx')

NAVY, ORG, MERAH, INK, ABU, TEKS, SLATE = '051C2C', 'D9600B', 'C8102E', '1A1A1A', '6B7280', '2E3440', '5B7A99'
T_NAVY, T_ORG, T_MERAH, T_BIRU, BIRU, PITA, GARIS = 'E6EAF0', 'FBE7D6', 'F8DDE0', 'DCEBF8', '1B5A93', 'DCE9F5', 'D5DBE3'
X0, W0, Y0, YB = 43.2, 873.6, 110.0, 494.0
F = {(b): ImageFont.truetype(FON + ('Roboto-Bold.ttf' if b else 'Roboto-Regular.ttf'), 100) for b in (False, True)}


def lebar(t, sz, b=False):
    return F[b].getlength(t) * sz / 100


def baris_n(t, sz, w, b=False):
    """Jumlah baris teks t di lebar w (pt), pemenggalan per kata."""
    n, cur = 1, ''
    for k in t.split():
        c = (cur + ' ' + k).strip()
        if lebar(c, sz, b) > w and cur:
            n += 1; cur = k
        else:
            cur = c
    return n


def fid(v, d=0):
    s = f'{v:,.{d}f}'
    return s.replace(',', '#').replace('.', ',').replace('#', '.')


def rgb(h):
    return RGBColor.from_string(h)


class Slide:
    def __init__(s, prs, no):
        s.sl = prs.slides.add_slide(prs.slide_layouts[6]); s.no = no; s.cek = []

    def kotak(s, x, y, w, h, isi=None, bentuk='rect', garis=None, lg=0.75, adj=None):
        sh = s.sl.shapes.add_shape({'rect': MSO_SHAPE.RECTANGLE, 'round': MSO_SHAPE.ROUNDED_RECTANGLE, 'oval': MSO_SHAPE.OVAL,
                                    'chev': MSO_SHAPE.CHEVRON, 'penta': MSO_SHAPE.PENTAGON}[bentuk], Pt(x), Pt(y), Pt(w), Pt(h))
        if isi: sh.fill.solid(); sh.fill.fore_color.rgb = rgb(isi)
        else: sh.fill.background()
        if garis: sh.line.color.rgb = rgb(garis); sh.line.width = Pt(lg)
        else: sh.line.fill.background()
        if adj is not None: sh.adjustments[0] = adj
        sh.shadow.inherit = False
        tf = sh.text_frame; tf.text = ''
        return sh

    def garis(s, x, y, w, warna=INK, tebal=0.75):
        return s.kotak(x, y, w, tebal, warna)

    def tx(s, x, y, w, h, isi, sz=8, b=False, c=INK, al='l', an='m', i=False, cek=True, spasi=None):
        """isi = teks, atau daftar paragraf; paragraf = teks atau daftar run (teks, warna, tebal)."""
        sz = 6.8 if sz < 7 else 7.2 if sz < 8 else 8.5 if sz < 9 else 9 if sz < 10 else 10 if sz < 12 else 13 if sz < 16 else sz   # paling banyak 7 ukuran per slide
        tb = s.sl.shapes.add_textbox(Pt(x), Pt(y), Pt(w), Pt(h)); tf = tb.text_frame; tf.word_wrap = True
        tf.margin_left = tf.margin_right = Pt(0); tf.margin_top = tf.margin_bottom = Pt(0)
        tf.vertical_anchor = {'t': MSO_ANCHOR.TOP, 'm': MSO_ANCHOR.MIDDLE, 'b': MSO_ANCHOR.BOTTOM}[an]
        par = isi if isinstance(isi, list) else [isi]
        nb = 0
        for k, p in enumerate(par):
            pp = tf.paragraphs[0] if k == 0 else tf.add_paragraph()
            pp.alignment = {'l': PP_ALIGN.LEFT, 'c': PP_ALIGN.CENTER, 'r': PP_ALIGN.RIGHT, 'j': PP_ALIGN.JUSTIFY}[al]
            if spasi: pp.space_after = Pt(spasi)
            runs = p if isinstance(p, list) else [(p, c, b)]
            for t, cc, bb in runs:
                r = pp.add_run(); r.text = t; f = r.font; f.name = 'Roboto'; f.size = Pt(sz); f.bold = bb; f.italic = i; f.color.rgb = rgb(cc)
            teks = ''.join(t for t, _, _ in runs)
            nb += baris_n(teks, sz, w, any(bb for _, _, bb in runs) and all(bb for _, _, bb in runs))
        tinggi = nb * sz * 1.2 + (len(par) - 1) * (spasi or 0)
        if cek and tinggi > h + 1.5: s.cek.append(f'slide {s.no}: teks meluap ({tinggi:.0f} > {h:.0f} pt): {str(isi)[:70]}')
        return tb

    def gambar(s, x, y, w, h, berkas):
        return s.sl.shapes.add_picture(berkas, Pt(x), Pt(y), Pt(w), Pt(h))

    def ikon(s, x, y, d, nama, warna='putih'):
        return s.gambar(x, y, d, d, os.path.join(IK, f'{nama}-{warna}.png'))

    # --- kerangka halaman
    def kepala(s, runs):
        TAB = ['Gambaran 2026', 'Lingkungan', 'Masyarakat', 'UMKM dan petani', 'Pelajaran']
        tw = W0 / len(TAB)
        s.garis(X0, 21, W0, GARIS, 0.6)
        for k, t in enumerate(TAB):
            aktif = k == s.no - 1; xt = X0 + k * tw
            s.tx(xt, 6, tw, 13, [[(f'{k + 1:02d} ', ORG if aktif else ABU, True), (t, INK if aktif else ABU, aktif)]], sz=7.2, al='c', an='m', cek=False)
            if aktif: s.kotak(xt, 19.6, tw, 2.2, ORG)
        s.tx(X0, 28, 708, 68, [runs], sz=20, b=True, an='m')
        lebar_judul = lebar(''.join(t for t, _, _ in runs), 20, True)
        if lebar_judul > 708 * 2 - 30: s.cek.append(f'slide {s.no}: judul mungkin 3 baris')
        h = 103 * 393 / 1690
        s.gambar(764.7, 56 - h / 2, 103, h, os.path.join(S, 'kris-logo.png'))
        s.gambar(875.7, 56 - 25.95, 41.1, 51.9, os.path.join(S, 'logo-bnpb.png'))
        s.garis(X0, 99, W0, INK, 0.75)

    def kaki(s, sumber):
        s.kotak(X0, 502, W0, 24, NAVY, 'round', adj=0.18)
        s.kotak(X0 + 8, 507, 2.4, 14, '5AA9E6')
        s.tx(X0 + 16, 502, 600, 24, [[('Sumber: ', 'FFFFFF', True), (sumber, 'FFFFFF', False)]], sz=7, i=True, an='m')
        s.tx(X0 + 600, 502, 240, 24, '© 2026 Badan Nasional Penanggulangan Bencana', sz=7.5, c='FFFFFF', al='r', an='m')
        s.tx(X0 + 845, 502, 20, 24, str(s.no), sz=8.5, b=True, c='FFFFFF', al='r', an='m')

    def sek(s, x, y, w, ikon, judul, kanan=None, tab=None):
        d = 15
        s.kotak(x, y, d, d, NAVY, 'oval'); s.ikon(x + d * .2, y + d * .2, d * .6, ikon)
        s.tx(x + d + 5, y, w - d - 5, d, judul, sz=9, b=True, an='m')
        if tab:
            tw = lebar(tab, 6.8, True) + 14; s.kotak(x + w - tw, y + 1.5, tw, 12, tab_warna(tab), 'round', adj=0.5)
            s.tx(x + w - tw, y + 1.5, tw, 12, tab, sz=6.8, b=True, c='FFFFFF', al='c', an='m', cek=False)
        elif kanan: s.tx(x + w - 160, y, 160, d, kanan, sz=7, c=ABU, al='r', an='m')
        s.garis(x, y + d + 2.5, w, INK, 0.6)
        return y + d + 7

    def kartu(s, x, y, w, h, tint, warna, ikon, nilai, lab):
        d = 22
        s.kotak(x, y, w, h, tint, 'round', adj=0.12)
        s.kotak(x + 7, y + (h - d) / 2, d, d, warna, 'oval'); s.ikon(x + 7 + d * .2, y + (h - d) / 2 + d * .2, d * .6, ikon)
        s.tx(x + d + 13, y + 4, w - d - 17, h * .5, nilai, sz=13, b=True, c=warna, an='b')
        s.tx(x + d + 13, y + h * .54, w - d - 17, h * .42, lab, sz=7, c=TEKS, an='t')

    def tabel(s, x, y, w, kol, baris, rh, hk=15, sz=7.2):
        """kol = [(judul, bobot, rata)]; baris = daftar sel | {'pita': teks} | {'total': 1, 'sel': [...]} | {'sorot': warna, 'sel': [...]};
        sel = teks, atau (teks, warna, tebal), atau ('#bar', nilai, maks, warna, label)."""
        tb = sum(k[1] for k in kol); L = [w * k[1] / tb for k in kol]
        s.kotak(x, y, w, hk, NAVY, 'round', adj=0.2); cx = x
        for k, lw in zip(kol, L):
            s.tx(cx + 3, y, lw - 6, hk, k[0], sz=7, b=True, c='FFFFFF', al='c', an='m'); cx += lw
        yy = y + hk
        for b in baris:
            dct = isinstance(b, dict)
            pita, tot, sor = dct and 'pita' in b, dct and 'total' in b, dct and b.get('sorot')
            sel = b.get('sel', []) if dct else b
            if pita: s.kotak(x, yy, w, rh, PITA); s.tx(x + 5, yy, w - 10, rh, b['pita'], sz=sz, b=True, an='m')
            if tot: s.kotak(x, yy, w, rh, NAVY, 'round', adj=0.2)
            if sor: s.kotak(x, yy, w, rh, sor)
            cx = x
            for i, (k, lw) in enumerate(zip(kol, L)):
                if i < len(sel) and sel[i] not in ('', None):
                    v = sel[i]
                    if isinstance(v, tuple) and v[0] == '#bar':
                        _, nil, mak, warna, lab = v; lb = lebar(lab, sz, True) + 4; bw = max((lw - 10 - lb) * nil / mak, 1.5) if nil else -2
                        if nil: s.kotak(cx + 4, yy + rh * .25, bw, rh * .5, warna)
                        s.tx(cx + 6 + bw, yy, lb + 4, rh, lab, sz=sz, b=True, c=warna if warna != GARIS else TEKS, an='m', cek=False)
                    else:
                        t_, c_, b_ = v if isinstance(v, tuple) else (v, 'FFFFFF' if tot else INK, bool(tot or (i == 0 and not pita)))
                        s.tx(cx + 4, yy + 0.5, lw - 8, rh - 1, t_, sz=sz, b=b_, c=c_, al=k[2], an='m')
                cx += lw
            yy += rh
            if not pita and not tot: s.garis(x, yy - 0.3, w, GARIS, 0.5)
        return yy

    def kolom(s, x, y, w, h, label, nilai, warna, fmt, catat=None, judul_nilai=None):
        """Grafik kolom: label bawah, nilai di atas batang; warna = satu warna atau daftar per batang."""
        n = len(nilai); gap = w / n; bw = gap * .62; mak = max(nilai); hb = h - 26
        s.garis(x, y + h - 13, w, ABU, 0.6)
        for i, (l, v) in enumerate(zip(label, nilai)):
            c = warna[i] if isinstance(warna, list) else warna; t = v / mak * (hb - 4)
            bx = x + i * gap + (gap - bw) / 2
            s.kotak(bx, y + h - 13 - t, bw, t, c)
            s.tx(bx - 8, y + h - 13 - t - 11, bw + 16, 10, fmt(v), sz=6.8, b=True, c=c if c != GARIS else TEKS, al='c', an='b', cek=False)
            s.tx(x + i * gap - 2, y + h - 11, gap + 4, 10, l, sz=6.8, c=TEKS, al='c', an='t', cek=False)

    def peta(s, x, y, w, h, nilai, kotak_geo, episenter, kelas):
        """Kab/kota sebagai bentuk bebas; nilai = {kab: angka}; kelas = [(batas_bawah, warna, label)] urut naik."""
        lo0, lo1, la0, la1 = kotak_geo
        sk = min(w / (lo1 - lo0), h / (la1 - la0))
        ox = x + (w - (lo1 - lo0) * sk) / 2; oy = y + (h - (la1 - la0) * sk) / 2
        P = lambda lo, la: (Pt(ox + (lo - lo0) * sk), Pt(oy + (la1 - la) * sk))
        warna = lambda v: next((c for b, c, _ in reversed(kelas) if v >= b), 'EEF1F4')
        pos = {}
        for kode in ('53', '52', '73', '74'):
            fs = json.load(open(GEO + kode + '.json', encoding='utf-8'))['features']
            for f in fs:
                kab = f['properties']['kab']; g = f['geometry']
                polys = [g['coordinates']] if g['type'] == 'Polygon' else g['coordinates']
                for poly in polys:
                    ring = poly[0]
                    if not any(lo0 <= lo <= lo1 and la0 <= la <= la1 for lo, la in ring): continue
                    ring = [(min(max(lo, lo0), lo1), min(max(la, la0), la1)) for lo, la in ring[::3]]
                    if len(ring) < 4: continue
                    ff = s.sl.shapes.build_freeform(*P(*ring[0]), scale=1.0)
                    ff.add_line_segments([P(*q) for q in ring[1:]], close=True)
                    sh = ff.convert_to_shape()
                    v = nilai.get(kab) if kode == '53' else None
                    sh.fill.solid(); sh.fill.fore_color.rgb = rgb(warna(v) if v is not None else 'EEF1F4')
                    sh.line.color.rgb = rgb('FFFFFF'); sh.line.width = Pt(0.5); sh.shadow.inherit = False
                    if kode == '53' and kab in nilai:
                        a = sum(abs(ring[i][0] * ring[i - 1][1] - ring[i - 1][0] * ring[i][1]) for i in range(len(ring)))
                        if a > pos.get(kab, (0,))[0]:
                            pos[kab] = (a, sum(q[0] for q in ring) / len(ring), sum(q[1] for q in ring) / len(ring))
        return P, pos


def tab_warna(t):
    return {'Indikator lingkungan': '1B7A3E', 'Indikator masyarakat': BIRU, 'Indikator UMKM dan petani': ORG}.get(t, NAVY)


def judul(*bagian):
    return [(t, ORG if k % 2 else INK, True) for k, t in enumerate(bagian)]


def jumlah_rumah(c):
    return c.get('rr_berat', 0) + c.get('rr_sedang', 0) + c.get('rr_ringan', 0)


prs = Presentation(); prs.slide_width, prs.slide_height = Emu(12192000), Emu(6858000)
SEMUA = []
T, J = D['total'], D['jenis']
KH, GM = J['Karhutla'], J['Gempa bumi']
pk = lambda a, b: a / b * 100

# ---------------------------------------------------------------- slide 1: potret 2026
s = Slide(prs, 1); SEMUA.append(s)
s.kepala(judul('Sepanjang 2026 tercatat ', f"{fid(T['kejadian'])} bencana", '; karhutla paling sering terjadi (', f"{fid(pk(KH['kejadian'], T['kejadian']))}%", ' kejadian), gempa paling merusak (', f"{fid(pk(GM['rumah'], T['rumah']))}%", ' rumah rusak)'))
K = [(T_NAVY, NAVY, 'awas', fid(T['kejadian']), 'kejadian bencana, 1 Jan s.d. 18 Nov'), (T_MERAH, MERAH, 'hati', fid(T['meninggal']), f"jiwa meninggal, {T['hilang']} hilang"),
     (T_BIRU, BIRU, 'orang', f"{fid(T['terdampak'] / 1e6, 2)} juta", 'jiwa terdampak'), (T_BIRU, BIRU, 'tenda', fid(T['mengungsi']), 'jiwa pernah mengungsi'), (T_ORG, ORG, 'rumah', fid(T['rumah']), 'rumah rusak berat, sedang, ringan')]
kw = (W0 - 4 * 8) / 5
for i, k in enumerate(K): s.kartu(X0 + i * (kw + 8), Y0, kw, 44, *k)
y2 = Y0 + 54; wA = 492; xB = X0 + wA + 14; wB = X0 + W0 - xB
yy = s.sek(X0, y2, wA, 'awas', 'Kejadian dan dampak menurut jenis bencana', 'urut jumlah kejadian')
urut = sorted(J.items(), key=lambda kv: -kv[1]['kejadian'])
urut = [kv for kv in urut if kv[0] != 'Lainnya'] + [kv for kv in urut if kv[0] == 'Lainnya']
mk, mr = max(v['kejadian'] for _, v in urut), max(v['rumah'] for _, v in urut)
B = []
for n, v in urut:
    sor = T_ORG if n in ('Karhutla', 'Gempa bumi') else None
    sel = [n, ('#bar', v['kejadian'], mk, ORG if n == 'Karhutla' else SLATE, fid(v['kejadian'])), fid(v['meninggal']) if v['meninggal'] else '–',
           fid(v['mengungsi']) if v['mengungsi'] else '–', f"{fid(v['terdampak'] / 1e6, 2)} juta" if v['terdampak'] >= 1e6 else (fid(v['terdampak']) if v['terdampak'] else '–'), ('#bar', v['rumah'], mr, ORG if n == 'Gempa bumi' else SLATE, fid(v['rumah']) if v['rumah'] else '–')]
    B.append({'sorot': sor, 'sel': sel} if sor else sel)
yb = s.tabel(X0, yy, wA, [('Jenis bencana', 96, 'l'), ('Kejadian', 118, 'l'), ('Meninggal', 52, 'c'), ('Mengungsi', 56, 'c'), ('Terdampak', 60, 'c'), ('Rumah rusak', 118, 'l')], B, (YB - yy - 15 - 38) / len(B))
s.tx(X0, yb + 4, wA, YB - yb - 4, [[('Cara membaca: ', NAVY, True), ('karhutla menyumbang sepertiga kejadian tetapi hampir tidak merusak rumah; gempa hanya 62 kejadian tetapi merusak hampir 9 dari 10 rumah yang rusak tahun ini. Banjir dan kekeringan menyentuh warga paling banyak, tetapi tidak menjadi fokus paparan ini. Terdampak dan mengungsi dicatat terpisah, jadi pengungsi bisa lebih banyak dari terdampak.', TEKS, False)]], sz=7.6, al='j', an='t')
yy = s.sek(xB, y2, wB, 'integratif', 'Karhutla dan gempa: dua pola dampak')
C = [('Porsi kejadian', (f"{fid(pk(KH['kejadian'], T['kejadian']))}%", ORG, True), (f"{fid(pk(GM['kejadian'], T['kejadian']), 1)}%", ORG, True)),
     ('Porsi rumah rusak', (f"{fid(pk(KH['rumah'], T['rumah']), 1)}%", ORG, True), (f"{fid(pk(GM['rumah'], T['rumah']))}%", ORG, True)),
     ('Meninggal', f"{KH['meninggal']} jiwa", f"{GM['meninggal']} jiwa"),
     ('Cara datang', 'Berbulan-bulan, terpantau satelit setiap hari', 'Tiba-tiba, dalam hitungan detik'),
     ('Dampak terbesar', 'Udara, kesehatan, hutan dan gambut', 'Rumah, sekolah, korban jiwa'),
     ('Yang paling menanggung', 'Warga di bawah asap, pekebun dan peladang', 'Warga di rumah tidak tahan gempa'),
     ('Bisa dicegah?', ('Bisa, bila pencegahan selesai sebelum kemarau', '1B7A3E', True), ('Tidak, tetapi korban bisa ditekan dengan bangunan tahan gempa', BIRU, True))]
yc = s.tabel(xB, yy, wB, [('Aspek', 78, 'l'), ('Karhutla', 120, 'l'), ('Gempa bumi', 120, 'l')], [list(c) for c in C], (YB - yy - 15 - 8 - 22 - 34) / len(C))
# alur paparan
ya = yc + 8; yy = s.sek(xB, ya, wB, 'arah', 'Alur paparan')
lab = [('Lingkungan', 'hal. 2'), ('Masyarakat', 'hal. 3'), ('UMKM, petani', 'hal. 4'), ('Pelajaran', 'hal. 5')]
cw = (wB + 3 * 4) / 4; hh = YB - yy
for i, (a, b) in enumerate(lab):
    sh = s.kotak(xB + i * (cw - 4), yy, cw, hh, NAVY if i == 3 else T_NAVY, 'penta' if i == 0 else 'chev', adj=0.25)
    s.tx(xB + i * (cw - 4) + 10, yy, cw - 18, hh, [[(a, 'FFFFFF' if i == 3 else NAVY, True)], [(b, 'FFFFFF' if i == 3 else ABU, False)]], sz=7.4, al='c', an='m')
s.kaki('DIBI (Data Informasi Bencana Indonesia) BNPB, data 1 Januari s.d. 18 November 2026 (ditarik 18 Nov 2026)')

# ---------------------------------------------------------------- slide 2: lingkungan (karhutla)
k = D['karhutla']; bh = k['bulan_hot']; ags = sum(bh[m] for m in ('2026-08', '2026-09', '2026-10'))
gam = k['gambut']['gambut'] / (k['gambut']['gambut'] + k['gambut']['mineral']) * 100
s = Slide(prs, 2); SEMUA.append(s)
s.kepala(judul('Lingkungan: karhutla 2026 diperkirakan membakar ', f"{fid(k['luas'] / 1e6, 1)} juta hektare", ', terluas kedua setelah 2015; ', f"{fid(ags / k['hot'] * 100)}% titik panas", ' muncul Agustus s.d. Oktober'))
K = [(T_ORG, ORG, 'api', f"{fid(k['hot'] / 1e6, 2)} juta", 'titik panas, 1 Jan s.d. 17 Nov'), (T_ORG, 'B84E08', 'tetes', f'{fid(gam)}%', 'api menyala di lahan gambut (14 Okt)'),
     (T_MERAH, MERAH, 'hati', '401.586', 'kasus infeksi saluran pernapasan (ISPA), 7 provinsi'), (T_NAVY, NAVY, 'asap', '3 juta+', 'warga terpapar asap di 37 kab/kota'), (T_BIRU, BIRU, 'radius', '3 negara', 'tetangga terkena asap lintas batas')]
for i, kk in enumerate(K): s.kartu(X0 + i * (kw + 8), Y0, kw, 44, *kk)
y2 = Y0 + 54; wA, wB = 300, 262; xB = X0 + wA + 12; xC = xB + wB + 12; wC = X0 + W0 - xC; hp = 252; hg = hp - 62
yy = s.sek(X0, y2, wA, 'kalender', 'Luas terbakar per tahun, ribu hektare')
th = [(t[0].replace('1997–1998', ''), t[1]) for t in k['tahunan'] if t[0] >= '2015'][:-1] + [('2026', k['luas'])]
s.kolom(X0, yy + 2, wA, hg, [t[0][2:] if t[0] != '2026' else '2026' for t in th], [t[1] / 1000 for t in th],
        [ORG if t[0] == '2026' else (SLATE if t[0] in ('2015', '2019') else 'A9B8C8') for t in th], lambda v: fid(v))
s.tx(X0, yy + hg + 6, wA, 34, [[('2015 s.d. 2025: ', NAVY, True), ('luas resmi BNPB dan KLHK. ', TEKS, False), ('2026: ', ORG, True), ('perkiraan satelit sistem BNPB, rentang 1,5 s.d. 2,7 juta ha; riset FireWatch 2,88 juta ha. Pembanding: SiPongi KLHK 202 ribu ha (Januari s.d. Juli), luas yang dipadamkan 129.956 ha (s.d. 15 Okt).', TEKS, False)]], sz=6.8, an='t')
yy = s.sek(xB, y2, wB, 'api', 'Titik panas per bulan 2026, ribu titik')
BL = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov']
s.kolom(xB, yy + 2, wB, hg, BL, [bh[f'2026-{i:02d}'] / 1000 for i in range(1, 12)], [ORG if i in (8, 9, 10) else 'A9B8C8' for i in range(1, 12)], lambda v: fid(v))
s.tx(xB, yy + hg + 6, wB, 24, [[('Agustus s.d. Oktober: ', ORG, True), (f"{fid(ags / 1e6, 2)} juta titik. November baru sampai tanggal 17.", TEKS, False)]], sz=6.8, an='t')
yy = s.sek(xC, y2, wC, 'radius', 'Provinsi terluas terbakar, 2026')
P_ = k['prov'][:8]; mp = P_[0][1]
yb = s.tabel(xC, yy, wC, [('Provinsi', 92, 'l'), ('Luas, ribu ha', 120, 'l')], [[p[0], ('#bar', p[1], mp, ORG if i < 3 else SLATE, fid(p[1] / 1000))] for i, p in enumerate(P_)], (hp - 22 - 15 - 24) / 8)
s.tx(xC, yb + 3, wC, 22, f"Delapan provinsi ini mencakup {fid(sum(p[1] for p in P_) / k['luas'] * 100)}% luas terbakar nasional.", sz=6.8, c=TEKS, an='t')
y3 = y2 + hp + 6; yy = s.sek(X0, y3, W0, 'asap', 'Asap: dampak ke kesehatan, sekolah, dan negara tetangga')
A = [('hati', MERAH, 'Kesehatan', '165.747 kasus ISPA di Kalimantan Barat saja; Kemenkes mencatat lonjakan ISPA di 63 kab/kota.'),
     ('orang', NAVY, 'Sekolah', 'Sekolah diliburkan di Jambi, Pekanbaru, dan Pelalawan; jam masuk diundur di Palangka Raya dan Banjarbaru.'),
     ('radius', BIRU, 'Lintas batas', 'Malaysia menutup sekolah (9 Okt), indeks udara Singapura 181 (12 Okt), Timor Leste meliburkan sekolah.'),
     ('tetes', 'B84E08', 'Gambut', 'Api gambut membara di bawah permukaan, sulit dipadamkan, dan menghasilkan asap paling pekat.')]
aw = (W0 - 3 * 8) / 4; ah = YB - yy
for i, (ik, c, h_, t) in enumerate(A):
    xa = X0 + i * (aw + 8); s.kotak(xa, yy, aw, ah, 'F4F6F9', 'round', adj=0.1)
    s.kotak(xa + 7, yy + 6, 16, 16, c, 'oval'); s.ikon(xa + 10.2, yy + 9.2, 9.6, ik)
    s.tx(xa + 28, yy + 6, aw - 34, 16, h_, sz=8.2, b=True, c=c, an='m')
    s.tx(xa + 8, yy + 24, aw - 14, ah - 26, t, sz=7, c=TEKS, an='t', al='l')
s.kaki('Sistem pemantauan karhutla BNPB (NASA FIRMS), 18 Nov 2026; BNPB dan KLHK 2015 s.d. 2025; SiPongi KLHK; data operasi pemadaman BNPB, 15 Okt 2026; Katadata 22 Agu dan 3 Nov 2026; NU Online 2 Nov 2026; Jawa Pos; Al Jazeera 9 Okt 2026; The Jakarta Post 12 dan 14 Okt 2026')

# ---------------------------------------------------------------- slide 3: masyarakat (gempa)
N = D['ntt']; FL = ['Nagekeo', 'Manggarai', 'Manggarai Timur', 'Ngada', 'Manggarai Barat', 'Ende', 'Sikka']
nt = {x: sum(N[kb].get(x, 0) for kb in N) for x in ('meninggal', 'luka', 'mengungsi', 'rr_berat', 'rr_sedang', 'rr_ringan', 'f_pendidikan', 'f_kantor', 'jembatan')}
rumah_ntt = nt['rr_berat'] + nt['rr_sedang'] + nt['rr_ringan']
s = Slide(prs, 3); SEMUA.append(s)
s.kepala(judul('Masyarakat: gempa M7,7 Flores 15 Agustus merusak ', f'{fid(rumah_ntt / 1000)} ribu rumah', ' dan ', f"{fid(nt['f_pendidikan'])} sekolah", ', ', f"{fid(nt['mengungsi'] / 1000)} ribu warga", ' sempat mengungsi'))
K = [(T_NAVY, NAVY, 'gempa', 'M7,7', 'kedalaman 15 km, 30 km timur laut Nagekeo'), (T_ORG, ORG, 'awas', '4 menit', 'perkiraan tsunami tiba di pesisir setelah gempa'),
     (T_NAVY, NAVY, 'radius', '13.156', 'gempa susulan tercatat'), (T_BIRU, BIRU, 'kalender', '14 hari', 'tanggap darurat, 15 s.d. 28 Agustus'), (T_ORG, ORG, 'kolaborasi', 'Rp5 triliun', 'disiagakan Kemenkeu untuk penanganan')]
for i, kk in enumerate(K): s.kartu(X0 + i * (kw + 8), Y0, kw, 44, *kk)
y2 = Y0 + 54; wA = 330; xB = X0 + wA + 12; wB = X0 + W0 - xB
yy = s.sek(X0, y2, wA, 'radius', 'Rumah rusak per kabupaten di Flores')
kelas = [(1, 'F6C9A7', 'di bawah 10 ribu'), (10000, 'E8894A', '10 s.d. 25 ribu'), (25000, 'B84E08', 'di atas 25 ribu')]
nil = {kb: jumlah_rumah(N[kb]) for kb in FL}
mh = 124
P, pos = s.peta(X0, yy, wA, mh, nil, (119.8, 122.9, -9.0, -8.05), None, kelas)
ex, ey = P(121.39, -8.41)
s.kotak(Emu(ex).pt - 6, Emu(ey).pt - 6, 12, 12, MERAH, 'oval', garis='FFFFFF', lg=1)
s.tx(Emu(ex).pt + 8, Emu(ey).pt - 16, 70, 10, 'Pusat gempa', sz=6.8, b=True, c=MERAH, cek=False)
nama_pendek = {'Manggarai Barat': 'Mabar', 'Manggarai Timur': 'Matim', 'Manggarai': 'Manggarai', 'Ngada': 'Ngada', 'Nagekeo': 'Nagekeo', 'Ende': 'Ende', 'Sikka': 'Sikka'}
geser = {'Manggarai': (0, -6), 'Manggarai Timur': (0, 6), 'Ngada': (-2, 4), 'Nagekeo': (2, 8), 'Ende': (0, 4), 'Sikka': (0, 0), 'Manggarai Barat': (0, 0)}
for kb, (_, lo, la) in pos.items():
    px, py = P(lo, la); dx, dy = geser.get(kb, (0, 0))
    s.tx(Emu(px).pt - 30 + dx, Emu(py).pt - 5 + dy, 60, 10, nama_pendek.get(kb, kb), sz=6.5, b=True, c=INK, al='c', cek=False)
yl = yy + mh + 4
for i, (_, c, lb) in enumerate(kelas):
    s.kotak(X0 + i * 108, yl + 2, 9, 9, c); s.tx(X0 + i * 108 + 12, yl, 95, 13, lb, sz=6.8, c=TEKS, cek=False)
yy = s.sek(X0, yl + 20, wA, 'cek', 'Bantuan pemulihan yang berjalan')
BT = [('Rusak ringan', 'Rp15 juta per rumah untuk perbaikan'), ('Rusak sedang', 'Rp30 juta per rumah untuk perbaikan'), ('Rusak berat', 'Dibangun ulang pemerintah'), ('Tunggu hunian', 'Rp600 ribu per KK, atau tinggal di hunian sementara')]
s.tabel(X0, yy, wA, [('Kategori', 70, 'l'), ('Bantuan', 200, 'l')], [list(b) for b in BT], (YB - yy - 15) / 4)
yy = s.sek(xB, y2, wB, 'rumah', 'Dampak per kabupaten/kota, DIBI 18 November')
B = []
for kb in FL:
    c = N[kb]; B.append([kb, fid(c['meninggal']), fid(c['luka']), fid(c['mengungsi']), fid(c['rr_berat']), fid(c['rr_sedang']), fid(c['rr_ringan']), fid(c['f_pendidikan']), fid(c['f_kantor'])])
lain = [kb for kb in N if kb not in FL]; cl = {x: sum(N[kb].get(x, 0) for kb in lain) for x in nt}
B.append(['Lainnya (4 kab/kota)', fid(cl['meninggal']) if cl['meninggal'] else '–', fid(cl['luka']), fid(cl['mengungsi']), fid(cl['rr_berat']) if cl['rr_berat'] else '–', fid(cl['rr_sedang']), fid(cl['rr_ringan']), '–', fid(cl['f_kantor'])])
B.append({'total': 1, 'sel': ['Jumlah', fid(nt['meninggal']), fid(nt['luka']), fid(nt['mengungsi']), fid(nt['rr_berat']), fid(nt['rr_sedang']), fid(nt['rr_ringan']), fid(nt['f_pendidikan']), fid(nt['f_kantor'])]})
yb = s.tabel(xB, yy, wB, [('Kabupaten', 104, 'l'), ('Meninggal', 50, 'c'), ('Luka', 42, 'c'), ('Mengungsi', 54, 'c'), ('Rusak berat', 52, 'c'), ('Rusak sedang', 54, 'c'), ('Rusak ringan', 54, 'c'), ('Sekolah', 44, 'c'), ('Kantor', 40, 'c')], B, 17.5, hk=17)
s.tx(xB, yb + 3, wB, 20, [[('Lainnya: ', NAVY, True), ('Kepulauan Selayar (Sulawesi Selatan), Bima dan Kota Bima (NTB), Sumba Timur. Rumah rusak = berat + sedang + ringan.', TEKS, False)]], sz=6.8, an='t')
yy = s.sek(xB, yb + 26, wB, 'gempa', 'Gempa merusak lain sepanjang 2026')
GL = {(a, b): c for a, b, c in D['gempa_lain']}
sg, sl_, mal = GL[('2026-06-16', 'Sulawesi Tengah')], GL[('2026-06-08', 'Sulawesi Utara')], GL[('2026-04-02', 'Maluku Utara')]
G = [('16 Jun', 'Sigi, Palu, Parigi Moutong (Sulteng)', 'M6,7', fid(jumlah_rumah(sg)), f"{sg['meninggal']} meninggal, {sg['f_pendidikan']} sekolah rusak"),
     ('8 Jun', 'Kepulauan Sangihe (Sulut)', 'M7,7', fid(jumlah_rumah(sl_)), f"{fid(sl_['mengungsi'])} jiwa mengungsi"),
     ('17 Nov', 'Kepulauan Tanimbar (Maluku)', 'M6,8', '–', 'Pendataan dampak oleh BPBD berjalan')]
s.tabel(xB, yy, wB, [('Tanggal', 40, 'c'), ('Wilayah', 170, 'l'), ('Kekuatan', 46, 'c'), ('Rumah rusak', 58, 'c'), ('Keterangan', 160, 'l')], [list(g) for g in G], (YB - yy - 15) / 3)
s.kaki('BMKG, 15 Agu dan 17 Nov 2026; DIBI BNPB, data s.d. 18 Nov 2026; Antara Bali; Katadata; Fortune IDN; Infopublik, Agustus 2026')

# ---------------------------------------------------------------- slide 4: UMKM dan petani
L = k['lahan']; lt = sum(L.values())
s = Slide(prs, 4); SEMUA.append(s)
s.kepala(judul('UMKM dan petani: kerugiannya ', 'belum terdata', ', padahal ', f"{fid(L['apl'] / lt * 100)}% api karhutla", ' menyala di luar kawasan hutan dan gempa Flores merusak pasar serta hotel'))
y2 = Y0; wA, wB = 282, 282; xB = X0 + wA + 13; xC = xB + wB + 13; wC = X0 + W0 - xC; hp = 210
yy = s.sek(X0, y2, wA, 'api', 'Di lahan apa api karhutla menyala (14 Okt)')
NM = {'apl': 'Di luar kawasan hutan (APL)', 'hutan_produksi': 'Hutan produksi', 'konservasi': 'Kawasan konservasi', 'konsesi_hph': 'Konsesi kayu (HPH)', 'konsesi_sawit': 'Konsesi sawit', 'lindung': 'Hutan lindung'}
LL = sorted(L.items(), key=lambda kv: -kv[1]); ml = LL[0][1]
yb = s.tabel(X0, yy, wA, [('Jenis lahan', 120, 'l'), ('Porsi luas', 130, 'l')], [[NM[a], ('#bar', v, ml, ORG if a == 'apl' else SLATE, f'{fid(v / lt * 100)}%')] for a, v in LL], 22.5)
s.tx(X0, yb + 4, wA, y2 + hp - yb - 4, [[('APL ', ORG, True), ('adalah areal penggunaan lain di luar kawasan hutan, termasuk kebun, ladang, sawah, dan permukiman warga. Api di sini memukul pekebun sawit dan karet rakyat serta peladang, yang tidak punya cadangan modal seperti perusahaan. Berapa petani yang lahannya terbakar belum dihitung siapa pun.', TEKS, False)]], sz=7.4, an='t', al='j')
yy = s.sek(xB, y2, wB, 'tetes', 'Biaya ekonomi karhutla, triliun rupiah')
s.kolom(xB, yy + 2, wB, 140, ['2015, Bank Dunia', '2019, Bank Dunia', '2026, CELIOS'], [221, 73, 340], [SLATE, SLATE, ORG], lambda v: fid(v))
s.tx(xB, yy + 148, wB, y2 + hp - yy - 148, [[('2026 ', ORG, True), ('adalah hitungan lembaga riset CELIOS per 20 Oktober; biaya kesehatan ISPA ditambah Rp19 s.d. 225 triliun, dan pajak daerah yang hilang Rp4,06 triliun. Pemerintah belum menerbitkan hitungan resmi.', TEKS, False)]], sz=7.2, an='t', al='j')
yy = s.sek(xC, y2, wC, 'gempa', 'Gempa Flores: tempat usaha yang rusak')
U = [('rumah', '4 pasar', 'rusak, penilaian awal Kemendag'), ('tenda', '54 usaha', 'perhotelan rusak (per 24 Agu)'), ('arah', '5 dari 15', 'bandara di Flores terdampak'),
     ('truk', '1 pelabuhan', 'Maumere rusak, jalur barang terganggu'), ('orang', '986 wisatawan', 'Pulau Padar dipulangkan saat gempa')]
uh = (y2 + hp - yy) / len(U)
for i, (ik, a, b) in enumerate(U):
    yu = yy + i * uh
    s.kotak(xC, yu + 1.5, wC, uh - 3, 'F4F6F9', 'round', adj=0.15)
    s.kotak(xC + 6, yu + (uh - 18) / 2, 18, 18, ORG if i < 2 else NAVY, 'oval'); s.ikon(xC + 9.6, yu + (uh - 18) / 2 + 3.6, 10.8, ik)
    s.tx(xC + 30, yu, 78, uh, a, sz=9.5, b=True, c=ORG if i < 2 else NAVY, an='m')
    s.tx(xC + 108, yu, wC - 112, uh, b, sz=7.2, c=TEKS, an='m')
y3 = y2 + hp + 12; yy = s.sek(X0, y3, W0, 'kolaborasi', 'Jaring pengaman yang sudah ada dan celahnya')
JP = [('Perlakuan khusus kredit', 'OJK dan bank', 'Debitur di 8 kabupaten Flores selama 3 tahun sejak 28 Sep 2026; cicilan yang diringankan tidak dianggap kredit macet', ('Hanya untuk usaha yang punya pinjaman bank; pedagang dan petani tanpa pinjaman tidak terjangkau', MERAH, False)),
      ('Bantuan perbaikan rumah', 'BNPB dan Kementerian PKP', 'Rp15 juta rusak ringan, Rp30 juta rusak sedang, rusak berat dibangun ulang', ('Modal usaha dan barang dagangan yang hilang tidak dihitung', MERAH, False)),
      ('Asuransi Usaha Tani Padi', 'Kementan', '100 ribu ha, premi Rp36 ribu per ha (80% dibayar pemerintah), klaim sampai Rp6 juta per ha', ('Hanya padi, untuk banjir, kekeringan, hama; kebakaran lahan dan kebun tidak dijamin', MERAH, False)),
      ('Pendataan bencana (DIBI)', 'BNPB dan BPBD', 'Korban jiwa, pengungsi, rumah, sekolah, kantor, jembatan', ('Belum mencatat usaha dan lahan tani terdampak; karhutla tercatat 30.307 jiwa terdampak', MERAH, False))]
s.tabel(X0, yy, W0, [('Skema', 104, 'l'), ('Penyelenggara', 90, 'l'), ('Yang sudah dijangkau', 290, 'l'), ('Celah', 290, 'l')], [list(j) for j in JP], (YB - yy - 15) / 4)
s.kaki('Sistem pemantauan karhutla BNPB, 14 Okt 2026; Bank Dunia 2015 dan 2019; CELIOS via Katadata, 2 Nov 2026; Kemendag; RRI, 24 Agu 2026; Warta Ekonomi; OJK SP 184, 5 Okt 2026; Kementan 2026; DIBI BNPB, 18 Nov 2026')

# ---------------------------------------------------------------- slide 5: pelajaran
s = Slide(prs, 5); SEMUA.append(s)
s.kepala(judul('Tiga pelajaran 2026: ', 'cegah api sebelum kemarau', ', ', 'bangun rumah dan sekolah tahan gempa', ', dan ', 'lindungi penghasilan warga', ' sebelum bencana datang'))
PL = [('api', ORG, T_ORG, 'Karhutla: cegah sebelum kemarau',
       [(f"{fid(ags / k['hot'] * 100)}%", 'titik panas muncul Agustus s.d. Oktober'), (f'{fid(gam)}%', 'api menyala di gambut yang sulit dipadamkan')],
       ['Basahi gambut dan tutup kanal sebelum Juli, saat muka air tanah masih tinggi', 'Tetapkan status siaga darurat dari prakiraan kemarau, bukan setelah asap datang', 'Jaga kebun dan ladang warga di luar kawasan hutan dengan regu peduli api desa'],
       'Pemda, BPBD, Kementerian Kehutanan, pemegang konsesi, Masyarakat Peduli Api'),
      ('gempa', NAVY, T_NAVY, 'Gempa: bangun lebih kuat',
       [(f"{fid(pk(GM['rumah'], T['rumah']))}%", 'rumah rusak 2026 berasal dari gempa'), (fid(nt['f_pendidikan']), 'sekolah rusak dalam satu gempa Flores')],
       ['Syaratkan standar tahan gempa pada bantuan perbaikan Rp15 s.d. 30 juta, dengan pendamping teknis', 'Periksa dan perkuat sekolah di zona gempa, dimulai dari sekolah dekat sesar aktif', 'Latih evakuasi mandiri: tsunami diperkirakan tiba di pesisir Manggarai 4 menit setelah gempa'],
       'Kementerian PKP, Kemendikdasmen, pemda, BNPB, BMKG'),
      ('kolaborasi', BIRU, T_BIRU, 'Ekonomi: lindungi penghasilan warga',
       [('Rp340 T', 'biaya ekonomi karhutla menurut CELIOS'), ('30.307', 'jiwa terdampak karhutla di DIBI, padahal ISPA 401.586 kasus')],
       ['Catat usaha, kios, dan lahan tani yang rusak dalam pendataan bencana', 'Perluas asuransi tani dan asuransi mikro UMKM ke risiko kebakaran dan gempa', 'Jadikan perlakuan khusus kredit otomatis begitu status darurat ditetapkan'],
       'OJK, perbankan, Kementan, Kementerian UMKM, BNPB')]
pw = (W0 - 2 * 12) / 3; hk = 300
for i, (ik, c, t, hj, bukti, aksi, pihak) in enumerate(PL):
    x = X0 + i * (pw + 12); y = Y0
    s.kotak(x, y, pw, hk, 'FFFFFF', 'round', garis='C9D1DB', adj=0.04)
    s.kotak(x, y, pw, 30, c, 'round', adj=0.25); s.kotak(x, y + 15, pw, 15, c)
    s.kotak(x + 8, y + 6, 18, 18, 'FFFFFF', 'oval'); s.ikon(x + 11.6, y + 9.6, 10.8, ik, 'navy' if c == NAVY else ('oranye' if c == ORG else 'navy'))
    s.tx(x + 32, y, pw - 40, 30, hj, sz=10, b=True, c='FFFFFF', an='m')
    s.tx(x + 10, y + 36, pw - 20, 11, 'Bukti dari 2026', sz=6.8, b=True, c=ABU, cek=False)
    bw_ = (pw - 26) / 2
    for j, (a, b) in enumerate(bukti):
        xb = x + 10 + j * (bw_ + 6); s.kotak(xb, y + 50, bw_, 48, t, 'round', adj=0.12)
        s.tx(xb + 6, y + 53, bw_ - 12, 20, a, sz=14, b=True, c=c, an='m')
        s.tx(xb + 6, y + 73, bw_ - 12, 22, b, sz=7, c=TEKS, an='t')
    s.tx(x + 10, y + 106, pw - 20, 11, 'Yang perlu dilakukan', sz=6.8, b=True, c=ABU, cek=False)
    for j, a in enumerate(aksi):
        ya_ = y + 121 + j * 42
        s.kotak(x + 10, ya_ + 2, 14, 14, c, 'oval'); s.ikon(x + 13, ya_ + 5, 8, 'cek')
        s.tx(x + 30, ya_, pw - 40, 38, a, sz=8, c=INK, an='t')
    s.garis(x + 10, y + 248, pw - 20, GARIS, 0.6)
    s.tx(x + 10, y + 252, pw - 20, 11, 'Pihak yang memimpin', sz=6.8, b=True, c=ABU, cek=False)
    s.tx(x + 10, y + 265, pw - 20, 30, pihak, sz=7.6, b=True, c=c, an='t')
ya = Y0 + hk + 10
s.kotak(X0, ya, W0, YB - ya, NAVY, 'round', adj=0.08)
s.tx(X0 + 14, ya + 8, 200, 14, 'Yang kami harapkan dari forum ini', sz=9, b=True, c='FFFFFF', an='m')
AJ = [('Pemerintah daerah', 'Anggarkan pencegahan karhutla dan pemeriksaan sekolah sebelum kemarau 2027'), ('Dunia usaha dan perbankan', 'Siapkan produk asuransi mikro dan restrukturisasi yang cepat untuk usaha kecil di daerah rawan'),
      ('Kampus dan masyarakat sipil', 'Bantu BPBD menghitung kerugian usaha dan pertanian setiap kejadian'), ('Kami, BNPB', 'Menambahkan data usaha dan lahan tani terdampak ke pendataan bencana, dan membagikannya terbuka')]
aw = (W0 - 28 - 3 * 10) / 4
for i, (a, b) in enumerate(AJ):
    xa = X0 + 14 + i * (aw + 10)
    s.tx(xa, ya + 26, aw, 12, a, sz=8, b=True, c='F6C9A7', an='t')
    s.tx(xa, ya + 39, aw, YB - ya - 43, b, sz=7.6, c='FFFFFF', an='t')
s.kaki('Rangkuman halaman 1 s.d. 4; DIBI BNPB, 18 Nov 2026; sistem pemantauan karhutla BNPB, 18 Nov 2026; BMKG, 15 Agu 2026; CELIOS, 2 Nov 2026')

prs.save(KELUAR)
for sl in SEMUA:
    for c in sl.cek: print('PERIKSA', c)
print('selesai', KELUAR)
