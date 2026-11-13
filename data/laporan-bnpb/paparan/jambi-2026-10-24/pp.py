"""Penyunting XML slide berbasis posisi + teks untuk templat paparan Jatim 231026."""
import re

BLK = re.compile(r'<p:sp>.*?</p:sp>|<p:pic>.*?</p:pic>|<p:cxnSp>.*?</p:cxnSp>', re.S)
GEO = re.compile(r'<a:off x="(-?\d+)" y="(-?\d+)"/>(\s*)<a:ext cx="(\d+)" cy="(\d+)"/>')
NID = [9000]


def geom(b):
    g = GEO.search(b)
    return tuple(int(g.group(i)) for i in (1, 2, 4, 5)) if g else None


def teks(b):
    return ''.join(re.findall(r'<a:t>([^<]*)</a:t>', b))


def isi(b):
    return '<a:t>' in b


class Slide:
    def __init__(self, xml):
        self.s = xml

    def blok(self):
        return [m.group(0) for m in BLK.finditer(self.s)]

    def ubah(self, pred, fn, n=None):
        hit = [0]

        def cb(m):
            b = m.group(0)
            if pred(b):
                hit[0] += 1
                return fn(b)
            return b
        self.s = BLK.sub(cb, self.s)
        assert n is None or hit[0] == n, (hit[0], n)
        return hit[0]

    def cari(self, pred):
        return [b for b in self.blok() if pred(b)]

    # ---------- predikat
    @staticmethod
    def di(x, y, teks_=None):
        return lambda b: (g := geom(b)) is not None and g[0] == x and g[1] == y and (teks_ is None or (isi(b) if teks_ else not isi(b)))

    # ---------- operasi
    def T(self, lama, baru, at=None, n=1):
        """Ganti teks blok yang teks gabungannya == lama. baru: str (run pertama, run lain dikosongkan) atau list per run."""
        def fn(b):
            rs = re.findall(r'<a:t>[^<]*</a:t>', b)
            nb = [baru] if isinstance(baru, str) else list(baru)
            nb += [''] * (len(rs) - len(nb))
            assert len(nb) == len(rs), (lama, baru)
            it = iter(nb)
            return re.sub(r'<a:t>[^<]*</a:t>', lambda m: f'<a:t>{esc(next(it))}</a:t>', b)
        pred = lambda b: teks(b) == lama and (at is None or geom(b)[:2] == at)
        return self.ubah(pred, fn, n)

    def G(self, x, y, nx=None, ny=None, cx=None, cy=None, n=None, hanya=None):
        """Ubah geometri semua blok di (x, y) (bentuk dan kotak teksnya)."""
        def fn(b):
            g = GEO.search(b)
            return b[:g.start()] + f'<a:off x="{nx if nx is not None else g.group(1)}" y="{ny if ny is not None else g.group(2)}"/>{g.group(3)}<a:ext cx="{cx if cx is not None else g.group(4)}" cy="{cy if cy is not None else g.group(5)}"/>' + b[g.end():]
        return self.ubah(lambda b: Slide.di(x, y, hanya)(b), fn, n)

    def warna(self, x, y, lama, baru, hanya=None):
        return self.ubah(lambda b: Slide.di(x, y, hanya)(b) and f'val="{lama}"' in b, lambda b: b.replace(f'val="{lama}"', f'val="{baru}"'))

    def hapus(self, pred):
        return self.ubah(pred, lambda b: '')

    def tambah(self, xml):
        self.s = self.s.replace('</p:spTree>', xml + '</p:spTree>')


def esc(t):
    return t.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')


def inst(b, x=None, y=None, cx=None, cy=None, runs=None, warna=None, rid=None):
    """Salinan blok prototipe dengan geometri/teks/warna/gambar baru dan id baru."""
    g = GEO.search(b)
    b = b[:g.start()] + f'<a:off x="{x if x is not None else g.group(1)}" y="{y if y is not None else g.group(2)}"/>{g.group(3)}<a:ext cx="{cx if cx is not None else g.group(4)}" cy="{cy if cy is not None else g.group(5)}"/>' + b[g.end():]
    if runs is not None:
        rs = re.findall(r'<a:t>[^<]*</a:t>', b)
        nb = [runs] if isinstance(runs, str) else list(runs)
        nb += [''] * (len(rs) - len(nb))
        it = iter(nb)
        b = re.sub(r'<a:t>[^<]*</a:t>', lambda m: f'<a:t>{esc(next(it))}</a:t>', b)
    for a, c in (warna or {}).items():
        b = b.replace(f'val="{a}"', f'val="{c}"')
    if rid:
        b = re.sub(r'r:embed="\w+"', f'r:embed="{rid}"', b)
    NID[0] += 1
    return re.sub(r'<p:cNvPr id="\d+"', f'<p:cNvPr id="{NID[0]}"', b, count=1)


def f0(v):
    return f"{int(round(v)):,}".replace(',', '.')


def pct(a, b):
    """(teks, warna) perubahan b terhadap a."""
    if a == 0:
        return ('baru', 'D9600B') if b else ('0%', '6B7280')
    d = round((b - a) / a * 100)
    return (f'▲{d}%', 'D9600B') if d > 0 else (f'▼{-d}%', '2F86D1') if d < 0 else ('0%', '6B7280')


def warna_batang(i, v, prev):
    if i == 0 or v == prev:
        return 'DCE1E7'
    naik = v > prev
    if i >= 5:
        return 'D9600B' if naik else '2F86D1'
    return 'F4C3A0' if naik else 'B7D3EE'


def tx(x, y, w, h, runs, al='l', an='ctr', wrap='none', spc=0):
    """Kotak teks native. runs = [(teks, sz100, tebal, warna)]."""
    NID[0] += 1
    r = ''.join(f'<a:r><a:rPr lang="id-ID" sz="{sz}" b="{1 if b else 0}"{f" spc=\"{spc}\"" if spc else ""} dirty="0"><a:solidFill><a:srgbClr val="{c}"/></a:solidFill>'
                f'<a:latin typeface="Roboto"/><a:ea typeface="Roboto"/><a:cs typeface="Roboto"/></a:rPr><a:t>{esc(t)}</a:t></a:r>' for t, sz, b, c in runs)
    return (f'<p:sp><p:nvSpPr><p:cNvPr id="{NID[0]}" name="T"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="{int(x)}" y="{int(y)}"/><a:ext cx="{int(w)}" cy="{int(h)}"/></a:xfrm>'
            f'<a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/></p:spPr><p:txBody><a:bodyPr wrap="{wrap}" lIns="0" tIns="0" rIns="0" bIns="0" anchor="{an}"/><a:lstStyle/>'
            f'<a:p><a:pPr algn="{al}"><a:spcBef><a:spcPts val="0"/></a:spcBef><a:buNone/></a:pPr>{r}</a:p></p:txBody></p:sp>')


def bentuk(x, y, w, h, fill=None, prst='rect', adj=None, ln=None, lw=9525, dash=None):
    NID[0] += 1
    av = ''.join(f'<a:gd name="{k}" fmla="val {v}"/>' for k, v in (adj or {}).items())
    f = f'<a:solidFill><a:srgbClr val="{fill}"/></a:solidFill>' if fill else '<a:noFill/>'
    l = (f'<a:ln w="{lw}"><a:solidFill><a:srgbClr val="{ln}"/></a:solidFill>' + (f'<a:prstDash val="{dash}"/>' if dash else '') + '</a:ln>') if ln else '<a:ln><a:noFill/></a:ln>'
    return (f'<p:sp><p:nvSpPr><p:cNvPr id="{NID[0]}" name="K"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="{int(x)}" y="{int(y)}"/><a:ext cx="{int(w)}" cy="{int(h)}"/></a:xfrm>'
            f'<a:prstGeom prst="{prst}"><a:avLst>{av}</a:avLst></a:prstGeom>{f}{l}</p:spPr></p:sp>')


def gambar(x, y, w, h, rid):
    NID[0] += 1
    return (f'<p:pic><p:nvPicPr><p:cNvPr id="{NID[0]}" name="G"/><p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr><p:nvPr/></p:nvPicPr><p:blipFill><a:blip r:embed="{rid}"/>'
            f'<a:stretch><a:fillRect/></a:stretch></p:blipFill><p:spPr><a:xfrm><a:off x="{int(x)}" y="{int(y)}"/><a:ext cx="{int(w)}" cy="{int(h)}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr></p:pic>')
