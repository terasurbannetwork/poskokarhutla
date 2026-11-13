"""Dua peta PNG (lewat SVG + chromium headless): peta-jambi.svg (slide 1, cluster app per level, 3 cluster Prioritas bernomor) dan
peta-kawasan.svg (slide 3, titik 17-24 Okt per umur di koridor gambut Kumpeh-Sadu). Tanpa titik tengah dan em dash di teks gambar."""
import json
G = '/Users/alfatehanseptianta/Documents/GitHub/poskokarhutla/public/geo/'
KAB = json.load(open(G + 'kabupaten/15.json'))['features']; KEC = json.load(open(G + 'kecamatan/15.json'))['features']
KL = [f['properties'] for f in json.load(open('web/kluster_awal.json'))['features'] if f['properties']['prov'] == '15']
A = json.load(open('angka.json')); H = json.load(open('titik.json'))['hot']
def cincin(g): return [r for p in (g['coordinates'] if g['type'] == 'MultiPolygon' else [g['coordinates']]) for r in p]
def proj(b, W, H_, x0=0, y0=0):
    lo0, la0, lo1, la1 = b; s = min(W / (lo1 - lo0), H_ / (la1 - la0))
    ox = x0 + (W - (lo1 - lo0) * s) / 2; oy = y0 + (H_ - (la1 - la0) * s) / 2
    return lambda lo, la: (ox + (lo - lo0) * s, oy + (la1 - la) * s)
def path(g, pj): return ''.join('M' + 'L'.join('%.1f %.1f' % pj(*c) for c in r) + 'Z' for r in cincin(g))
# ---------- slide 1: 3024 x 1749; peta di ~62% kiri, kanan untuk label native
W1, H1 = 3024, 1749
pj = proj((101.1, -2.8, 104.55, -0.7), 2960, 1700, 20, 25)
ada = {c['kab'] for c in KL}
s = ''.join(f'<path d="{path(f["geometry"], pj)}" fill="{"#DCE1E7" if f["properties"]["kab"] in ada else "#EEF0F3"}" stroke="#fff" stroke-width="2.5" stroke-linejoin="round"/>' for f in KAB)
WARNA = {0: ('#B4BDC8', 7), 1: ('#F2C9A0', 9), 2: ('#E07A2E', 13), 3: ('#C8102E', 15)}
for c in sorted(KL, key=lambda c: c['level']):
    x, y = pj(c['lon'], c['lat']); w, r = WARNA[c['level']]
    s += f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{r}" fill="{w}" stroke="#fff" stroke-width="2"/>'
for i, c in enumerate(A['prio'], 1):
    x, y = pj(c['lon'], c['lat']); x, y = x + (-50, 40, 60)[i - 1], y + (30, -60, 50)[i - 1]   # tiga cluster berdempet: digeser sedikit agar nomornya terbaca
    s += f'<circle cx="{x:.1f}" cy="{y:.1f}" r="36" fill="#C8102E" stroke="#fff" stroke-width="6"/><text x="{x:.1f}" y="{y + 15:.1f}" text-anchor="middle" font-family="Roboto" font-weight="700" font-size="44" fill="#fff">{i}</text>'
open('peta-jambi.svg', 'w').write(f'<svg xmlns="http://www.w3.org/2000/svg" width="{W1}" height="{H1}" viewBox="0 0 {W1} {H1}">{s}</svg>')
# ---------- slide 3: 2240 x 1936, koridor gambut Kumpeh-Sadu
W3, H3 = 2240, 1936
b = (103.62, -1.72, 104.50, -1.08); pj = proj(b, W3, H3)
KAW = {('Muaro Jambi', 'Kumpeh'), ('Tanjung Jabung Timur', 'Sadu'), ('Tanjung Jabung Timur', 'Berbak'), ('Muaro Jambi', 'Kumpeh Ulu')}
s = '<rect width="100%" height="100%" fill="#F7F8FA"/>'
s += ''.join(f'<path d="{path(f["geometry"], pj)}" fill="{"#E4E9F0" if (f["properties"]["kab"], f["properties"]["kec"]) in KAW else "none"}" stroke="#D3D9E1" stroke-width="2"/>' for f in KEC)
s += ''.join(f'<path d="{path(f["geometry"], pj)}" fill="none" stroke="#6B7A8C" stroke-width="5" stroke-linejoin="round"/>' for f in KAB)
umur = lambda d: 0 if d <= '2026-10-19' else 1 if d <= '2026-10-22' else 2
WU = ['#B4BDC8', '#F2A35E', '#C8102E']
for p in sorted(H, key=lambda p: p['w']):
    x, y = pj(p['lon'], p['lat'])
    if -40 < x < W3 + 40 and -40 < y < H3 + 40:
        s += f'<circle cx="{x:.1f}" cy="{y:.1f}" r="16" fill="{WU[umur(p["w"][:10])]}" stroke="#fff" stroke-width="3"/>'
def label(t, x, y, w, c):
    return (f'<rect x="{x}" y="{y}" width="{w}" height="96" rx="48" fill="#fff" stroke="{c}" stroke-width="4"/>'
            f'<text x="{x + 44}" y="{y + 66}" font-family="Roboto" font-weight="700" font-size="60" fill="{c}">{t}</text>')
def tulis(t, lo, la, sz=46, c='#6B7A8C', sp=6):
    x, y = pj(lo, la); return f'<text x="{x:.0f}" y="{y:.0f}" text-anchor="middle" font-family="Roboto" font-weight="700" font-size="{sz}" letter-spacing="{sp}" fill="{c}" stroke="#F7F8FA" stroke-width="8" paint-order="stroke">{t}</text>'
s += tulis('KAB. MUARO JAMBI', 103.80, -1.66, 60); s += tulis('KAB. TANJUNG JABUNG TIMUR', 103.98, -1.17, 60)
s += tulis('KUMPEH', 104.10, -1.60, 70, '#3F5F80'); s += tulis('SADU', 104.36, -1.30, 70, '#3F5F80'); s += tulis('BERBAK', 104.40, -1.10, 54, '#3F5F80')
def alur(t, x, y, c, ke):   # pil label + garis penunjuk ke kelompok titik
    w = 88 + len(t) * 33
    return f'<line x1="{ke[0]}" y1="{ke[1]}" x2="{x + w / 2}" y2="{y + (96 if ke[1] > y else 0)}" stroke="{c}" stroke-width="4"/>' + label(t, x, y, w, c)
AL = json.load(open('alur.json')) if __import__('os').path.exists('alur.json') else []
for t, x, y, c, lo, la in AL: s += alur(t, x, y, c, pj(lo, la))
open('peta-kawasan.svg', 'w').write(f'<svg xmlns="http://www.w3.org/2000/svg" width="{W3}" height="{H3}" viewBox="0 0 {W3} {H3}">{s}</svg>')
# pusat titik tiap kelompok umur per kecamatan, untuk menaruh label alur api
for g in range(3):
    for k in ('Kumpeh', 'Sadu', 'Berbak'):
        P = [p for p in H if p['kec'] == k and umur(p['w'][:10]) == g]
        if P: print(g, k, len(P), round(sum(p['lon'] for p in P) / len(P), 3), round(sum(p['lat'] for p in P) / len(P), 3), [round(v) for v in pj(sum(p['lon'] for p in P) / len(P), sum(p['lat'] for p in P) / len(P))])
