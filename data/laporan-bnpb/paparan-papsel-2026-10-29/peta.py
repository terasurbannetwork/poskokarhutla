"""Dua peta PNG (lewat SVG + chromium headless, render.mjs): peta-papsel.svg (slide 1, cluster keadaan akhir 29 Okt per level dari
kluster_hari/2026-10-29.json lewat angka.json; arsip hanya menyimpan pusat level >= 1, jadi Rutin tidak digambar; 3 cluster teratas
bernomor; nama kabupaten) dan peta-kawasan.svg (slide 3, titik 24-29 Okt per umur di koridor Jagebob-Tanah Miring, Kab. Merauke).
Papua Selatan lebih tinggi daripada lebar, jadi peta provinsi ditaruh di 60% kiri kotak; label cluster native di kanan. Tanpa titik tengah dan em dash."""
import json, os

AKAR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
G = os.path.join(AKAR, 'public', 'geo')
KAB = json.load(open(os.path.join(G, 'kabupaten', '93.json')))['features']; KEC = json.load(open(os.path.join(G, 'kecamatan', '93.json')))['features']
A = json.load(open('angka.json')); H = json.load(open('titik.json'))['hot']


def cincin(g): return [r for p in (g['coordinates'] if g['type'] == 'MultiPolygon' else [g['coordinates']]) for r in p]


def proj(b, W, H_, x0=0, y0=0):
    lo0, la0, lo1, la1 = b; s = min(W / (lo1 - lo0), H_ / (la1 - la0))
    ox = x0 + (W - (lo1 - lo0) * s) / 2; oy = y0 + (H_ - (la1 - la0) * s) / 2
    return lambda lo, la: (ox + (lo - lo0) * s, oy + (la1 - la) * s)


def path(g, pj): return ''.join('M' + 'L'.join('%.1f %.1f' % pj(*c) for c in r) + 'Z' for r in cincin(g))


def tulis(pj, t, lo, la, sz=46, c='#6B7A8C', sp=6, latar='#FFFFFF'):
    x, y = pj(lo, la)
    return f'<text x="{x:.0f}" y="{y:.0f}" text-anchor="middle" font-family="Roboto" font-weight="700" font-size="{sz}" letter-spacing="{sp}" fill="{c}" stroke="{latar}" stroke-width="8" paint-order="stroke">{t}</text>'


# ---------- slide 1: 3024 x 1749; peta di ~60% kiri, kanan untuk label native
W1, H1 = 3024, 1749
pj = proj((137.45, -9.18, 141.08, -4.50), 1800, 1700, 20, 25)
ada = {k for k, v in A['kab'].items() if v['komp']}
s = ''.join(f'<path d="{path(f["geometry"], pj)}" fill="{"#DCE1E7" if f["properties"]["kab"] in ada else "#EEF0F3"}" stroke="#fff" stroke-width="2.5" stroke-linejoin="round"/>' for f in KAB)
WARNA = {0: ('#B4BDC8', 7), 1: ('#F2C9A0', 9), 2: ('#E07A2E', 13), 3: ('#C8102E', 15)}
for lo, la, lv in sorted(A['kl'], key=lambda c: c[2]):
    x, y = pj(lo, la); w, r = WARNA[lv]
    s += f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{r}" fill="{w}" stroke="#fff" stroke-width="2"/>'
for t, lo, la in (('BOVEN DIGOEL', 140.35, -5.55), ('MAPPI', 139.25, -6.75), ('ASMAT', 138.30, -5.55), ('MERAUKE', 139.60, -7.30)):
    s += tulis(pj, t, lo, la, 50, '#5B6878')
for i, c in enumerate(A['prio'], 1):   # 1 Kontuar dan 3 Waan berdempet: digeser berlawanan
    x, y = pj(c['lon'], c['lat']); x, y = x + (50, 55, -55)[i - 1], y + (-55, -55, 50)[i - 1]
    s += f'<circle cx="{x:.1f}" cy="{y:.1f}" r="36" fill="{WARNA[c["level"]][0]}" stroke="#fff" stroke-width="6"/><text x="{x:.1f}" y="{y + 15:.1f}" text-anchor="middle" font-family="Roboto" font-weight="700" font-size="44" fill="#fff">{i}</text>'
open('peta-papsel.svg', 'w').write(f'<svg xmlns="http://www.w3.org/2000/svg" width="{W1}" height="{H1}" viewBox="0 0 {W1} {H1}">{s}</svg>')

# ---------- slide 3: 2240 x 1936, koridor Jagebob-Tanah Miring
W3, H3 = 2240, 1936
pj = proj((140.05, -8.62, 141.03, -7.62), W3, H3)
KAW = set(A['kaw_nama'])
s = '<rect width="100%" height="100%" fill="#F7F8FA"/>'
s += ''.join(f'<path d="{path(f["geometry"], pj)}" fill="{"#E4E9F0" if f["properties"]["kab"] == "Merauke" and f["properties"]["kec"] in KAW else "none"}" stroke="#D3D9E1" stroke-width="2"/>' for f in KEC)
s += ''.join(f'<path d="{path(f["geometry"], pj)}" fill="none" stroke="#6B7A8C" stroke-width="5" stroke-linejoin="round"/>' for f in KAB)
umur = lambda d: 0 if d <= '2026-10-25' else 1 if d <= '2026-10-27' else 2
WU = ['#B4BDC8', '#F2A35E', '#C8102E']
for p in sorted(H, key=lambda p: p['w']):
    x, y = pj(p['lon'], p['lat'])
    if -40 < x < W3 + 40 and -40 < y < H3 + 40:
        s += f'<circle cx="{x:.1f}" cy="{y:.1f}" r="13" fill="{WU[umur(p["w"])]}" stroke="#fff" stroke-width="3"/>'
PUSAT = {'Jagebob': (140.80, -7.93), 'Tanah Miring': (140.60, -8.36), 'Animha': (140.33, -7.80), 'Semangga': (140.32, -8.47)}
for k, (lo, la) in PUSAT.items(): s += tulis(pj, k.upper(), lo, la, 64, '#3F5F80', latar='#F7F8FA')
s += tulis(pj, 'KOTA MERAUKE', 140.42, -8.55, 44, '#6B7A8C', latar='#F7F8FA')


def alur(t, x, y, c, ke):   # pil label + garis penunjuk ke kelompok titik (pola peta-kawasan Jambi 241026)
    w = 88 + len(t) * 33
    return (f'<line x1="{ke[0]:.0f}" y1="{ke[1]:.0f}" x2="{x + w / 2:.0f}" y2="{y + (96 if ke[1] > y else 0)}" stroke="{c}" stroke-width="4"/>'
            f'<rect x="{x}" y="{y}" width="{w}" height="96" rx="48" fill="#fff" stroke="{c}" stroke-width="4"/>'
            f'<text x="{x + 44}" y="{y + 66}" font-family="Roboto" font-weight="700" font-size="60" fill="{c}">{t}</text>')


for t, x, y, c, lo, la in json.load(open('alur.json')): s += alur(t, x, y, c, pj(lo, la))
for i, c in enumerate(A['prio'], 1):
    if c['kec'] not in KAW: continue
    x, y = pj(c['lon'], c['lat'])
    s += f'<circle cx="{x:.1f}" cy="{y:.1f}" r="40" fill="{WARNA[c["level"]][0]}" stroke="#fff" stroke-width="6"/><text x="{x:.1f}" y="{y + 16:.1f}" text-anchor="middle" font-family="Roboto" font-weight="700" font-size="46" fill="#fff">{i}</text>'
open('peta-kawasan.svg', 'w').write(f'<svg xmlns="http://www.w3.org/2000/svg" width="{W3}" height="{H3}" viewBox="0 0 {W3} {H3}">{s}</svg>')
# pusat titik tiap kelompok umur per kecamatan kawasan, untuk alur api
for g in range(3):
    for k in A['kaw_nama']:
        Q = [p for p in H if p['kec'] == k and umur(p['w']) == g]
        if Q: print(g, k, len(Q), round(sum(p['lon'] for p in Q) / len(Q), 3), round(sum(p['lat'] for p in Q) / len(Q), 3))
