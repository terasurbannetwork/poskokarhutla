"""Dua peta PNG (lewat SVG + chromium headless): peta-lampung.svg (slide 1, kompleks app per level) dan peta-tnwk.svg (slide 3, titik 16-23 Okt
per umur di sekitar TN Way Kambas). Tanpa titik tengah dan em dash di teks yang dibakar ke gambar."""
import json, math
G = '/Users/alfatehanseptianta/Documents/GitHub/poskokarhutla/public/geo/'
KAB = json.load(open(G + 'kabupaten/18.json'))['features']; KEC = json.load(open(G + 'kecamatan/18.json'))['features']
KL = [f['properties'] for f in json.load(open('../h24/web/kluster_awal.json'))['features'] if f['properties']['prov'] == '18']
A = json.load(open('angka.json')); TN = json.load(open('tnwk.geojson'))['features']; H = json.load(open('titik.json'))['hot']
def cincin(g): return [r for p in (g['coordinates'] if g['type'] == 'MultiPolygon' else [g['coordinates']]) for r in p]
def proj(b, W, H_, x0=0, y0=0):
    lo0, la0, lo1, la1 = b; s = min(W / (lo1 - lo0), H_ / (la1 - la0))
    ox = x0 + (W - (lo1 - lo0) * s) / 2; oy = y0 + (H_ - (la1 - la0) * s) / 2
    return lambda lo, la: (ox + (lo - lo0) * s, oy + (la1 - la) * s)
def path(g, pj): return ''.join('M' + 'L'.join('%.1f %.1f' % pj(*c) for c in r) + 'Z' for r in cincin(g))
# ---------- slide 1: 3024 x 1749 (rasio gambar slide 4297680 x 2485000); peta di 62% kiri, kanan untuk label native
W1, H1 = 3024, 1749
pj = proj((103.55, -6.0, 106.05, -3.7), 1700, 1700, 20, 25)
ada = {c['kab'] for c in KL}
s = ''.join(f'<path d="{path(f["geometry"], pj)}" fill="{"#DCE1E7" if f["properties"]["kab"] in ada else "#EEF0F3"}" stroke="#fff" stroke-width="2.5" stroke-linejoin="round"/>' for f in KAB)
WARNA = {0: ('#B4BDC8', 7), 1: ('#F2C9A0', 9), 2: ('#E07A2E', 13), 3: ('#C8102E', 15)}
for c in sorted(KL, key=lambda c: c['level']):
    x, y = pj(c['lon'], c['lat']); w, r = WARNA[c['level']]
    s += f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{r}" fill="{w}" stroke="#fff" stroke-width="2"/>'
for i, c in enumerate(A['siaga_top'], 1):
    x, y = pj(c['lon'], c['lat'])
    s += f'<circle cx="{x:.1f}" cy="{y:.1f}" r="36" fill="#E07A2E" stroke="#fff" stroke-width="6"/><text x="{x:.1f}" y="{y + 15:.1f}" text-anchor="middle" font-family="Roboto" font-weight="700" font-size="44" fill="#fff">{i}</text>'
open('peta-lampung.svg', 'w').write(f'<svg xmlns="http://www.w3.org/2000/svg" width="{W1}" height="{H1}" viewBox="0 0 {W1} {H1}">{s}</svg>')
# ---------- slide 3: 2240 x 1936 (rasio 3474720 x 3003000), zoom TNWK sisi utara
W3, H3 = 2240, 1936
b = (105.40, -5.08, 105.99, -4.57); pj = proj(b, W3, H3)
s = '<rect width="100%" height="100%" fill="#F7F8FA"/>'
s += ''.join(f'<path d="{path(f["geometry"], pj)}" fill="none" stroke="#D3D9E1" stroke-width="2"/>' for f in KEC)
s += ''.join(f'<path d="{path(f["geometry"], pj)}" fill="#E4E9F0" fill-opacity=".9" stroke="#5B7A99" stroke-width="7" stroke-linejoin="round"/>' for f in TN)
s += ''.join(f'<path d="{path(f["geometry"], pj)}" fill="none" stroke="#6B7A8C" stroke-width="5" stroke-linejoin="round"/>' for f in KAB)
umur = lambda d: 0 if d <= '2026-10-19' else 1 if d <= '2026-10-22' else 2
WU = ['#B4BDC8', '#F2A35E', '#C8102E']
for p in sorted(H, key=lambda p: p['w']):
    x, y = pj(p['lon'], p['lat'])
    if -40 < x < W3 + 40 and -40 < y < H3 + 40:
        s += f'<circle cx="{x:.1f}" cy="{y:.1f}" r="20" fill="{WU[umur(p["w"][:10])]}" stroke="#fff" stroke-width="3"/>'
def label(t, x, y, w, c):
    return (f'<rect x="{x}" y="{y}" width="{w}" height="96" rx="48" fill="#fff" stroke="{c}" stroke-width="4"/>'
            f'<text x="{x + 44}" y="{y + 66}" font-family="Roboto" font-weight="700" font-size="60" fill="{c}">{t}</text>')
def tulis(t, lo, la, sz=46, c='#6B7A8C', sp=6):
    x, y = pj(lo, la); return f'<text x="{x:.0f}" y="{y:.0f}" text-anchor="middle" font-family="Roboto" font-weight="700" font-size="{sz}" letter-spacing="{sp}" fill="{c}" stroke="#F7F8FA" stroke-width="8" paint-order="stroke">{t}</text>'
s += tulis('TN WAY KAMBAS', 105.80, -4.93, 80, '#3F5F80')
s += tulis('KAB. LAMPUNG TENGAH', 105.555, -4.75, 60); s += tulis('KAB. LAMPUNG TIMUR', 105.53, -5.045, 60)
def alur(t, x, y, c, ke):   # pil label + garis penunjuk ke kelompok titik
    w = 88 + len(t) * 33
    return f'<line x1="{ke[0]}" y1="{ke[1]}" x2="{x + w / 2 if ke[1] > y else x + w / 2}" y2="{y + (96 if ke[1] > y else 0)}" stroke="{c}" stroke-width="4"/>' + label(t, x, y, w, c)
s += alur('Awal 17–19 Okt: Way Bungur, Labuhan Ratu', 600, 1060, '#5B6878', (1020, 880))
s += alur('20–22 Okt: Purbolinggo', 60, 1280, '#B5480A', (560, 1440))
s += alur('Terbaru 23–24 Okt: Labuhan Ratu', 260, 440, '#C8102E', (1640, 420))
s += alur('24 Okt: Sukadana', 1150, 1700, '#C8102E', (1040, 1660))
open('peta-tnwk-dasar.svg', 'w').write(f'<svg xmlns="http://www.w3.org/2000/svg" width="{W3}" height="{H3}" viewBox="0 0 {W3} {H3}">{s}</svg>')
# label alur api: pusat titik tiap kelompok umur di TNWK, ditulis ke peta-tnwk.json untuk diatur lalu digabung
cent = []
for g in range(3):
    P = [p for p in H if p['tn'] and umur(p['w'][:10]) == g]
    cent.append(pj(sum(p['lon'] for p in P) / len(P), sum(p['lat'] for p in P) / len(P)))
json.dump({'cent': cent}, open('peta-tnwk.json', 'w'))
print('ok', cent)
