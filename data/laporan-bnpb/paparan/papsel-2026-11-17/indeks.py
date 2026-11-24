"""Peta indeks di tiap peta (pemilik 17 Nov: "untuk tiap peta, tambahkan indeks petanya juga; peta papsel -> indo; peta kecamatan -> papsel").

- Slide 1 (peta Papua Selatan): indeks Indonesia, Papua Selatan merah.
- Slide 3-4 (Pulau Kimaam, Naukenjerai-Sota): indeks Papua Selatan, kotak merah = cakupan peta.
Gambar dicari dari posisi dan ukurannya (diperiksa), indeks ditaruh di sudut yang kosong.

    python indeks.py keluar7.pptx keluar8.pptx
"""
import json
import math
import os
import sys

from PIL import Image, ImageDraw
from pptx import Presentation
from pptx.util import Emu

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('KAWASAN', 'wasur')
SRC, OUT = sys.argv[1], sys.argv[2]
DIR = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(DIR, '..', '..', '..', '..'))
PROV = json.load(open(os.path.join(REPO, 'public/geo/provinsi.json'), encoding='utf-8'))['features']
KAB = json.load(open(os.path.join(REPO, 'public/geo/kabupaten/93.json'), encoding='utf-8'))['features']
PX = 4 / 12700   # piksel per EMU (4 px per pt)


def cincin(g):
    return [p[0] for p in ([g['coordinates']] if g['type'] == 'Polygon' else g['coordinates'])]


def indeks(w, h, bbox, poligon, kotak=None):
    """poligon: [(geometry, isi)]; kotak: (lon0, lat0, lon1, lat1) cakupan peta utama."""
    pw, ph = round(w * PX), round(h * PX)
    im = Image.new('RGB', (pw, ph), 'white'); dr = ImageDraw.Draw(im)
    x0, y0, x1, y1 = bbox
    cl = math.cos(math.radians((y0 + y1) / 2))
    k = min((pw - 16) / ((x1 - x0) * cl), (ph - 16) / (y1 - y0))
    ox = (pw - (x1 - x0) * cl * k) / 2; oy = (ph - (y1 - y0) * k) / 2
    p = lambda lon, lat: (ox + (lon - x0) * cl * k, oy + (y1 - lat) * k)
    for g, isi in poligon:
        for c in cincin(g):
            pts = [p(x, y) for x, y in c[::2] or c]
            if len(pts) > 2:
                dr.polygon(pts, fill=isi, outline='white')
    if kotak:
        a, b = p(kotak[0], kotak[3]), p(kotak[2], kotak[1])
        dr.rectangle([a[0], a[1], b[0], b[1]], outline='#C8102E', width=5)
    dr.rectangle([0, 0, pw - 1, ph - 1], outline='#9AA5B1', width=3)
    return im


p = Presentation(SRC)


def pasang(no, cari, im, nama, sudut, w, h, tepi=45720):
    s = p.slides[no - 1]
    pic = [x for x in s.shapes if x.shape_type == 13 and cari(x)]
    assert len(pic) == 1, (no, nama, len(pic))
    g = pic[0]
    x = g.left + tepi if 'kiri' in sudut else g.left + g.width - w - tepi
    y = g.top + tepi if 'atas' in sudut else g.top + g.height - h - tepi
    f = os.path.join(DIR, f'indeks-{nama}.png'); im.save(f)
    s.shapes.add_picture(f, Emu(x), Emu(y), Emu(w), Emu(h))


ABU, MERAH, MUDA = '#C9D1DB', '#C8102E', '#E3E8EE'
# slide 1: Indonesia
W1, H1 = 1150000, 430000
im = indeks(W1, H1, (94.8, -11.2, 141.2, 6.1), [(f['geometry'], MERAH if f['properties']['kode'] == '93' else ABU) for f in PROV])
pasang(1, lambda x: x.width == 4297680, im, 'indonesia', 'kiri-atas', W1, H1)

# slide 3, 4, 5: Papua Selatan dengan kotak cakupan
PAPSEL = (137.45, -9.25, 141.1, -4.5)
KAB_POL = [(f['geometry'], MUDA) for f in KAB]
import importlib  # noqa: E402
import kawasan  # noqa: E402


def cfg(k):
    os.environ['KAWASAN'] = k
    return importlib.reload(kawasan).CFG


W2, H2 = 560000, 740000
for no, k, sudut in ((3, 'pulau', 'kiri-atas'), (4, 'wasur', 'kanan-atas')):
    pasang(no, lambda x: x.width == 3474720, indeks(W2, H2, PAPSEL, KAB_POL, cfg(k)['bbox']), k, sudut, W2, H2)
W4, H4 = 380000, 500000   # slide 2: peta kecamatan Kab. Merauke
pasang(2, lambda x: x.left < 700000 and 2700000 < x.top < 3000000 and x.width > 2000000, indeks(W4, H4, PAPSEL, KAB_POL, (137.55, -9.20, 141.08, -6.45)), 'merauke', 'kiri-atas', W4, H4)
p.save(OUT)
print('ok', OUT)
