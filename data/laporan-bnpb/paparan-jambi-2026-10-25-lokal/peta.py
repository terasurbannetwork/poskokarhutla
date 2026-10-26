"""Peta paparan Jambi dari data.json -> peta1.png (provinsi, titik 24 jam) dan peta3.png (Kawasan Berbak, titik 8 hari per periode).
SVG ditulis di sini lalu dirender Chrome headless 3x. Posisi penanda peringkat peta 1 ikut ditulis ke peta1.json.
Pakai: python3 peta.py <chrome-headless-shell>"""
import json, math, os, subprocess, sys
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../..'))
GEO = ROOT + '/public/geo/'
D = json.load(open('data.json'))
KAW = json.load(open(ROOT + '/public/data/lahan/kawasan.geojson'))['features']
LAND, LINE, SEA = '#E3E7ED', '#FFFFFF', '#FFFFFF'

def rings(g): return [r for poly in ([g['coordinates']] if g['type'] == 'Polygon' else g['coordinates']) for r in poly[:1]]
class Proj:
    def __init__(s, bb, w): s.bb = bb; s.k = w / ((bb[2] - bb[0]) * math.cos(math.radians((bb[1] + bb[3]) / 2))); s.w = w; s.h = (bb[3] - bb[1]) * s.k
    def __call__(s, x, y): return ((x - s.bb[0]) * s.k * math.cos(math.radians((s.bb[1] + s.bb[3]) / 2)), (s.bb[3] - y) * s.k)
    def path(s, g, step=1):
        out = []
        for r in rings(g):
            pts = [s(*p) for p in r[::step]] or [s(*r[0])]
            out.append('M' + 'L'.join(f'{x:.1f},{y:.1f}' for x, y in pts) + 'Z')
        return ''.join(out)
def render(svg, nama, w, h):
    open(nama + '.svg', 'w').write(svg)
    subprocess.run([sys.argv[1], '--headless', f'--screenshot={nama}.png', f'--window-size={w},{h}', '--force-device-scale-factor=3',
                    '--default-background-color=00000000', '--hide-scrollbars', 'file://' + os.path.abspath(nama + '.svg')], check=True, capture_output=True)
    os.remove(nama + '.svg')
FONT = "font-family='Roboto, Helvetica, Arial, sans-serif'"

# ---------------------------------------------------------------- peta 1: Provinsi Jambi
KAB = json.load(open(GEO + 'kabupaten/15.json'))['features']
PROV = [f for f in json.load(open(GEO + 'provinsi.json'))['features'] if f['properties']['kode'] in ('13', '14', '16', '17', '21')]
BB1 = (101.05, -2.82, 104.62, -0.68)
p1 = Proj(BB1, 360)
s = [f"<svg xmlns='http://www.w3.org/2000/svg' width='{p1.w:.0f}' height='{p1.h:.0f}' {FONT}>"]
s.append(''.join(f"<path d='{p1.path(f['geometry'])}' fill='#F3F5F8' stroke='#FFFFFF' stroke-width='.8'/>" for f in PROV))
s.append(''.join(f"<path d='{p1.path(f['geometry'])}' fill='{LAND}' stroke='{LINE}' stroke-width='1'/>" for f in KAB))
s.append(f"<path d='{''.join(p1.path(f['geometry']) for f in KAB)}' fill='none' stroke='#B9C2CE' stroke-width='.6'/>")
for x, y in D['t24']:
    px, py = p1(x, y); s.append(f"<circle cx='{px:.1f}' cy='{py:.1f}' r='2.1' fill='#E0761F' fill-opacity='.85' stroke='#FFFFFF' stroke-width='.35'/>")
# penanda peringkat: pusat titik 24 jam di 3 kecamatan teratas
pos = []
for n, (kec, kab, c) in enumerate(D['kec24'][:3], 1):
    g = next(f for f in json.load(open(GEO + 'kecamatan/15.json'))['features'] if f['properties']['kec'] == kec and f['properties']['kab'] == kab)
    r = rings(g['geometry'])[0]; cx = sum(p[0] for p in r) / len(r); cy = sum(p[1] for p in r) / len(r)
    near = sorted(D['t24'], key=lambda q: (q[0] - cx) ** 2 + (q[1] - cy) ** 2)[:max(1, c // 2)]
    mx = sum(q[0] for q in near) / len(near); my = sum(q[1] for q in near) / len(near); px, py = p1(mx, my)
    pos.append([px / p1.w, py / p1.h])
    s.append(f"<circle cx='{px:.1f}' cy='{py:.1f}' r='6.2' fill='#C05A0B' stroke='#FFFFFF' stroke-width='1.2'/><text x='{px:.1f}' y='{py + 2.9:.1f}' font-size='7.6' font-weight='700' fill='#FFFFFF' text-anchor='middle'>{n}</text>")
s.append('</svg>')
render(''.join(s), 'peta1', round(p1.w), round(p1.h))
json.dump({'w': p1.w, 'h': p1.h, 'pos': pos}, open('peta1.json', 'w'))

# ---------------------------------------------------------------- peta 3: Kawasan Berbak
BB3 = (103.88, -1.74, 104.58, -1.13)
p3 = Proj(BB3, 300)
KEC = json.load(open(GEO + 'kecamatan/15.json'))['features']
KAB16 = json.load(open(GEO + 'kabupaten/16.json'))['features']
s = [f"<svg xmlns='http://www.w3.org/2000/svg' width='{p3.w:.0f}' height='{p3.h:.0f}' {FONT}>",
     f"<defs><clipPath id='c'><rect width='{p3.w:.0f}' height='{p3.h:.0f}' rx='4'/></clipPath></defs><g clip-path='url(#c)'>",
     f"<rect width='{p3.w:.0f}' height='{p3.h:.0f}' fill='#E9F0F7'/>"]
s.append(''.join(f"<path d='{p3.path(f['geometry'])}' fill='#F2F3F5' stroke='#FFFFFF' stroke-width='.8'/>" for f in KAB16))
s.append(''.join(f"<path d='{p3.path(f['geometry'])}' fill='{LAND}' stroke='#FFFFFF' stroke-width='.7'/>" for f in KEC))
s.append(f"<path d='{''.join(p3.path(f['geometry']) for f in KAB)}' fill='none' stroke='#A9B4C2' stroke-width='.9' stroke-dasharray='3 2'/>")
s.append(f"<path d='{p3.path(KAW[1229]['geometry'])}' fill='#C9D3DF' fill-opacity='.85' stroke='#5B7A99' stroke-width='1'/>")
s.append(f"<path d='{p3.path(KAW[1232]['geometry'])}' fill='#D8E4D6' fill-opacity='.9' stroke='#5E8A5A' stroke-width='1'/>")
D8 = D['D8']; per = [D8[0:3], D8[3:6], D8[6:8]]; WR = ['#A9B4C2', '#F0A35E', '#C8102E']
for j in range(3):
    for x, y, d, kw in D['pts3']:
        if d in per[j]:
            px, py = p3(x, y); s.append(f"<circle cx='{px:.1f}' cy='{py:.1f}' r='{1.9 if j < 2 else 2.2}' fill='{WR[j]}' fill-opacity='{.75 if j < 2 else .95}' stroke='#FFFFFF' stroke-width='.3'/>")
def teks(x, y, t, c='#3F5F80', sz=7.2, w=700, ls=1.2, a='middle'):
    return f"<text x='{x:.1f}' y='{y:.1f}' font-size='{sz}' font-weight='{w}' fill='{c}' letter-spacing='{ls}' text-anchor='{a}'>{t}</text>"
tx, ty = p3(104.30, -1.40); s.append(teks(tx, ty, 'TN BERBAK', '#3F5F80', 8.4))
tx, ty = p3(104.07, -1.31); s.append(teks(tx, ty, 'TAHURA OKH', '#4F7A4A', 6.4))
tx, ty = p3(103.95, -1.715); s.append(teks(7, ty, 'KAB. MUARO JAMBI', '#7A8696', 6.2, a='start'))
tx, ty = p3(104.40, -1.715); s.append(teks(tx, ty, 'KAB. BANYUASIN (SUMSEL)', '#A0A9B5', 5.6))
tx, ty = p3(104.0, -1.165); s.append(teks(7, ty, 'KAB. TANJUNG JABUNG TIMUR', '#7A8696', 5.6, a='start'))
s.append('</g></svg>')
render(''.join(s), 'peta3', round(p3.w), round(p3.h))
json.dump({'w': p3.w, 'h': p3.h}, open('peta3.json', 'w'))
print('peta1', round(p1.w), round(p1.h), 'peta3', round(p3.w), round(p3.h), pos)
