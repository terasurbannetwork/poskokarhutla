"""Peta 3D timbul dan miring untuk deck BNPB (Buku Pegangan, Selera presentasi > Komponen > Peta; keputusan pemilik 25 Okt 2026,
diambil dari skill ppt-format-meti scripts/peta.js). Tiap wilayah = freeform native bernama "<jenis> - <Nama>" (warnanya bisa diganti
di PowerPoint lewat Shape Fill), proyeksi miring (tinggi x0,8), tiga lapis sisi slate yang digeser turun, bayangan kabur (PNG dari SVG).
Semua satuan EMU (1 pt = 12.700). Stdlib saja.

    P = Peta3D(fitur, kotak=(x, y, w, h), nama=lambda f: 'Kabupaten - ' + f['properties']['kab'], warna=lambda f: ('E6EAF0', 'A9B4C2'))
    xml = P.xml()                      # sisi + permukaan, urutan gambar benar
    x, y = P.titik(lon, lat)           # posisi penanda di permukaan
    open('bayangan.svg', 'w').write(P.bayangan_svg()); P.kotak_bayangan  # PNG-nya dipasang di bawah xml()
"""
import itertools

TILT = 0.8                                          # wajib miring (pemilik: "betul dimiringin")
SISI = (('7A93AD', 1.0), ('93A8BE', 0.66), ('AFC0D1', 0.33))   # slate 5B7A99 bertingkat, dari bawah ke atas
TEBAL = 114300                                      # tebal sisi 9 pt
_id = itertools.count(30000)


def cincin(g):
    return [r for p in (g['coordinates'] if g['type'] == 'MultiPolygon' else [g['coordinates']]) for r in p]


def rdp(pts, eps):
    """Ramer-Douglas-Peucker iteratif."""
    if len(pts) < 4:
        return pts
    keep = [False] * len(pts); keep[0] = keep[-1] = True; st = [(0, len(pts) - 1)]
    while st:
        a, b = st.pop(); (x1, y1), (x2, y2) = pts[a], pts[b]; dx, dy = x2 - x1, y2 - y1; L = (dx * dx + dy * dy) ** .5
        i, dm = -1, 0
        for k in range(a + 1, b):
            px, py = pts[k]   # cincin tertutup: ujung = pangkal, jaraknya jarak titik
            d = abs(dy * px - dx * py + x2 * y1 - y2 * x1) / L if L > 1e-6 else ((px - x1) ** 2 + (py - y1) ** 2) ** .5
            if d > dm: i, dm = k, d
        if dm > eps and i > 0:
            keep[i] = True; st += [(a, i), (i, b)]
    return [p for p, k in zip(pts, keep) if k]


def freeform(rings, nama, fill=None, ln=None, lw=6350, dy=0):
    """Satu <p:sp> custGeom berisi beberapa cincin (sudah dalam EMU)."""
    xs = [x for r in rings for x, _ in r]; ys = [y + dy for r in rings for _, y in r]
    x0, y0 = min(xs), min(ys); w, h = max(max(xs) - x0, 1), max(max(ys) - y0, 1)
    jalur = ''.join('<a:moveTo><a:pt x="%d" y="%d"/></a:moveTo>' % (r[0][0] - x0, r[0][1] + dy - y0)
                    + ''.join('<a:lnTo><a:pt x="%d" y="%d"/></a:lnTo>' % (x - x0, y + dy - y0) for x, y in r[1:]) + '<a:close/>' for r in rings)
    f = f'<a:solidFill><a:srgbClr val="{fill}"/></a:solidFill>' if fill else '<a:noFill/>'
    l = f'<a:ln w="{lw}"><a:solidFill><a:srgbClr val="{ln}"/></a:solidFill><a:round/></a:ln>' if ln else '<a:ln><a:noFill/></a:ln>'
    return (f'<p:sp><p:nvSpPr><p:cNvPr id="{next(_id)}" name="{nama}"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="{int(x0)}" y="{int(y0)}"/>'
            f'<a:ext cx="{int(w)}" cy="{int(h)}"/></a:xfrm><a:custGeom><a:avLst/><a:gdLst/><a:ahLst/><a:cxnLst/><a:rect l="0" t="0" r="r" b="b"/>'
            f'<a:pathLst><a:path w="{int(w)}" h="{int(h)}">{jalur}</a:path></a:pathLst></a:custGeom>{f}{l}</p:spPr></p:sp>')


class Peta3D:
    def __init__(self, fitur, kotak, nama, warna, bbox=None, eps=6000, min_luas=0.02):
        """fitur: GeoJSON features; kotak: (x, y, w, h) EMU tempat peta (dipusatkan, rasio dijaga, tinggi sudah termasuk sisi);
        nama(f) -> nama shape; warna(f) -> (isi, garis); eps = toleransi penyederhanaan (EMU); cincin < min_luas x cincin terbesar fiturnya dibuang."""
        self.f = fitur
        lon = [c[0] for f in fitur for r in cincin(f['geometry']) for c in r]; lat = [c[1] for f in fitur for r in cincin(f['geometry']) for c in r]
        lo0, la0, lo1, la1 = bbox or (min(lon), min(lat), max(lon), max(lat))
        x, y, w, h = kotak
        s = min(w / (lo1 - lo0), (h - TEBAL) / ((la1 - la0) * TILT))
        ox = x + (w - (lo1 - lo0) * s) / 2; oy = y + (h - TEBAL - (la1 - la0) * s * TILT) / 2
        self.titik = lambda lo, la: (ox + (lo - lo0) * s, oy + (la1 - la) * s * TILT)
        self.kotak_peta = (ox, oy, (lo1 - lo0) * s, (la1 - la0) * s * TILT + TEBAL)
        self.wil = []
        for f in fitur:
            rs = [[self.titik(*c) for c in r] for r in cincin(f['geometry'])]
            luas = [abs(sum(a[0] * b[1] - b[0] * a[1] for a, b in zip(r, r[1:]))) / 2 for r in rs]
            m = max(luas)
            rs = [rdp(r, eps) for r, a in zip(rs, luas) if a >= m * min_luas]
            self.wil.append((f, [r for r in rs if len(r) >= 4]))
        self.nama, self.warna = nama, warna

    def xml(self):
        semua = [r for _, rs in self.wil for r in rs]
        o = ''.join(freeform(semua, 'Sisi peta', fill=c, dy=TEBAL * k) for c, k in SISI)
        for f, rs in self.wil:
            isi, garis = self.warna(f)
            o += freeform(rs, self.nama(f), fill=isi, ln=garis, lw=11430 if garis == 'FFFFFF' else 7620)
        return o

    def bayangan_svg(self, skala=1 / 1270, geser=TEBAL * 2.2, blur=14, pad=40):
        """SVG bayangan kabur (051C2C 28%) di bawah peta; pasang PNG-nya di self.kotak_bayangan sebelum xml()."""
        x0, y0, w, h = self.kotak_peta
        px = lambda x, y: ((x - x0) * skala + pad, (y - y0 + geser) * skala + pad)
        d = ''.join('M' + 'L'.join('%.1f %.1f' % px(*p) for p in r) + 'Z' for _, rs in self.wil for r in rs)
        W, H = round(w * skala + 2 * pad), round((h + geser) * skala + 2 * pad)
        self.kotak_bayangan = (x0 - pad / skala, y0 - pad / skala, W / skala, H / skala)
        return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}"><filter id="b" x="-20%" y="-20%" width="140%" height="140%">'
                f'<feGaussianBlur stdDeviation="{blur}"/></filter><path d="{d}" fill="#051C2C" fill-opacity="0.28" filter="url(#b)"/></svg>')


if __name__ == '__main__':
    # uji: dua persegi, proyeksi miring, sisi di bawah permukaan, penyederhanaan tidak membuang sudut
    sq = lambda lo, la: {'properties': {'n': f'{lo}'}, 'geometry': {'type': 'Polygon', 'coordinates': [[[lo, la], [lo + 1, la], [lo + 1, la + 1], [lo, la + 1], [lo, la]]]}}
    P = Peta3D([sq(100, 0), sq(101, 0)], (0, 0, 2_000_000, 2_000_000), lambda f: 'Wilayah - ' + f['properties']['n'], lambda f: ('E6EAF0', 'A9B4C2'))
    (ax, ay), (bx, by) = P.titik(100, 1), P.titik(100, 0)
    assert abs((by - ay) / (P.titik(101, 0)[0] - bx) - TILT) < 1e-9, 'tinggi harus 0,8 x lebar'
    x = P.xml(); assert x.count('<p:sp>') == 5 and x.index('Sisi peta') < x.index('Wilayah - 100') and 'name="Wilayah - 101"' in x
    assert all(len(r) == 5 for _, rs in P.wil for r in rs), 'sudut persegi hilang'
    assert P.kotak_peta[3] <= 2_000_000 and 'feGaussianBlur' in P.bayangan_svg()
    print('peta3d: uji lolos')
