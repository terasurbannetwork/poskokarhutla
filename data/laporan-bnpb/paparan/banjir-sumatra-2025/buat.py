"""Bahan deck tiga slide banjir 2025 di Aceh, Sumatera Utara, Sumatera Barat (permintaan 17 Nov 2026).

Sumber: DIBI BNPB lewat repo poskokarhutla.
  public/data/bnpb/dibi_kab_tahun.json  rekap tahunan per kab/kota (kelompok banjir), diunduh 30 Okt 2026
  public/data/dibi_kejadian.json        kejadian harian per kab/kota sejak 28 Okt 2025, diunduh 28 Okt 2026
Slide 1 rekap tahunan 2023-2025, slide 2 rincian kejadian Nov-Des 2025 per provinsi, slide 3 kab/kota korban terbanyak.
Pakai: ../../.venv/Scripts/python.exe buat.py
"""
import csv, hashlib, json, math
from collections import defaultdict, Counter
from pathlib import Path

import pymupdf
from PIL import Image, ImageDraw, ImageFont

AKAR = Path(__file__).resolve().parent
REPO = Path('D:/Project/Work/BNPB/poskokarhutla')
LAP = AKAR / 'data/lap'
PETA = AKAR / 'petanya'
GEO = AKAR / 'geo'
FONT = AKAR.parent / 'fonts'
LAP.mkdir(parents=True, exist_ok=True)
PETA.mkdir(exist_ok=True)
NAVY, ABU, ABU2 = '#051C2C', '#E6EAF0', '#F3F5F8'
PROV = {'11': 'Aceh', '12': 'Sumatera Utara', '13': 'Sumatera Barat'}

TAHUN = json.loads((REPO / 'public/data/bnpb/dibi_kab_tahun.json').read_text(encoding='utf-8'))
HARI = json.loads((REPO / 'public/data/dibi_kejadian.json').read_text(encoding='utf-8'))
WIL = json.loads((REPO / 'public/data/bnpb/wilayah.json').read_text(encoding='utf-8'))
NAMA = {k['kode']: k['nama'] for k in WIL['kab']}
for r in HARI['kejadian']:
    NAMA[r['kab_kode'].replace('.', '')] = r['kab']
for f in ('public/data/bnpb/dibi_kab_tahun.json', 'public/data/dibi_kejadian.json'):
    (LAP / Path(f).name).write_bytes((REPO / f).read_bytes())   # salinan masukan untuk sidik

# ---------- tahunan ----------
TH = defaultdict(lambda: [0] * 6)          # (prov, tahun) -> kejadian, mh, luka, terdampak, mengungsi, rrb
KAB25 = defaultdict(lambda: [0] * 6)       # kab -> 2025
for kab, th, jenis, *v in TAHUN['baris']:
    if jenis != 'banjir' or kab[:2] not in PROV:
        continue
    t = TH[(kab[:2], th)]
    for i, x in enumerate(v):
        t[i] += x
    if th == 2025:
        for i, x in enumerate(v):
            KAB25[kab][i] += x

# ---------- harian Nov-Des 2025 ----------
KOL = ['meninggal', 'hilang', 'luka', 'mengungsi', 'terdampak', 'rr_berat', 'rr_sedang', 'rr_ringan', 'terendam', 'jembatan']
HP = defaultdict(Counter)                  # prov -> indikator
HK = defaultdict(Counter)                  # (prov, kab) -> indikator
TGL = defaultdict(list)
for r in HARI['kejadian']:
    if not r['tanggal'].startswith('2025') or r['prov_kode'] not in PROV or 'Banjir' not in r['jenis']:
        continue
    for c in [HP[r['prov_kode']], HK[(r['prov_kode'], r['kab'])]]:
        c['kejadian'] += r['kejadian']
        for k in KOL:
            c[k] += r.get(k, 0)
    TGL[r['prov_kode']].append(r['tanggal'])
    TGL[(r['prov_kode'], r['kab'])].append(r['tanggal'])


def tulis_csv(nama, kepala, baris):
    with (LAP / nama).open('w', newline='', encoding='utf-8') as f:
        w = csv.writer(f)
        w.writerow(kepala)
        w.writerows(baris)


# slide 1: provinsi x tahun
s1 = []
for p in PROV:
    for th in (2023, 2024, 2025):
        k, mh, luka, dmp, ung, rrb = TH[(p, th)]
        s1.append((PROV[p], str(th), k, mh, dmp, ung, rrb))
tulis_csv('s1.csv', ['prov', 'tahun', 'kej', 'mh', 'dmp', 'ung', 'rrb'], s1)

# slide 2: indikator x provinsi
LABEL2 = [('Korban', 'meninggal', 'Meninggal'), ('Korban', 'hilang', 'Hilang'), ('Korban', 'luka', 'Luka'),
          ('Korban', 'mengungsi', 'Mengungsi'), ('Korban', 'terdampak', 'Terdampak'),
          ('Kerusakan', 'rr_berat', 'Rumah rusak berat'), ('Kerusakan', 'rr_sedang', 'Rumah rusak sedang'),
          ('Kerusakan', 'rr_ringan', 'Rumah rusak ringan'), ('Kerusakan', 'terendam', 'Rumah terendam'),
          ('Kerusakan', 'jembatan', 'Jembatan rusak')]
s2 = [(g, lab, HP['11'][k], HP['12'][k], HP['13'][k], sum(HP[p][k] for p in PROV)) for g, k, lab in LABEL2]
tulis_csv('s2.csv', ['kel', 'ind', 'aceh', 'sumut', 'sumbar', 'jml'], s2)


# slide 3: empat kab/kota korban terbanyak per provinsi
def bln(t):
    b = {'11': 'Nov', '12': 'Des'}
    d = sorted(t)
    a, z = d[0], d[-1]
    fa, fz = f'{int(a[8:])} {b[a[5:7]]}', f'{int(z[8:])} {b[z[5:7]]}'
    return fa if fa == fz else f'{fa} s.d. {fz}'


s3, top = [], []
for p in PROV:
    rows = sorted(((kab, c) for (pp, kab), c in HK.items() if pp == p), key=lambda x: -(x[1]['meninggal'] + x[1]['hilang']))[:4]
    for kab, c in rows:
        top.append((p, kab))
        s3.append((PROV[p], kab, bln(TGL[(p, kab)]), c['meninggal'], c['hilang'], c['mengungsi'], c['rr_berat']))
tulis_csv('s3.csv', ['prov', 'kab', 'tgl', 'mng', 'hil', 'ung', 'rrb'], s3)

# ---------- kelas peta ----------
KEJ = {k: v[0] for k, v in KAB25.items()}                 # slide 1: frekuensi kejadian 2025
K1 = [(1, 2), (3, 5), (6, 99)]
RRB = {pk: c['rr_berat'] for pk, c in HK.items()}         # slide 2: rumah rusak berat Nov-Des
K2 = [(0, 99), (100, 999), (1000, 10 ** 9)]
MH = {pk: c['meninggal'] + c['hilang'] for pk, c in HK.items()}   # slide 3: meninggal dan hilang
K3 = [(1, 9), (10, 49), (50, 10 ** 6)]


def hitung_kelas(nilai, kelas):
    return [sum(1 for v in nilai.values() if a <= v <= b) for a, b in kelas]


n1, n2, n3 = hitung_kelas(KEJ, K1), hitung_kelas(RRB, K2), hitung_kelas(MH, K3)
n2[0] = sum(1 for v in RRB.values() if v < 100)            # termasuk kab tanpa rumah rusak berat

t = {th: [sum(TH[(p, th)][i] for p in PROV) for i in range(6)] for th in (2023, 2024, 2025)}
jum = {k: sum(HP[p][k] for p in PROV) for k in ['kejadian'] + KOL}
ringkas = {
    'y.mh25': t[2025][1], 'y.mh24': t[2024][1], 'y.kali': round(t[2025][1] / t[2024][1]),
    'y.ung25': t[2025][4], 'y.kab': len(KEJ),
    'y.c1': n1[0], 'y.c2': n1[1], 'y.c3': n1[2],
    'h.kab': len(HK), 'h.ung': jum['mengungsi'], 'h.mng': jum['meninggal'], 'h.hil': jum['hilang'],
    'h.rrb': jum['rr_berat'], 'h.c1': n2[0], 'h.c2': n2[1], 'h.c3': n2[2],
    'k.top': len(top), 'k.mh': sum(MH[pk] for pk in top), 'k.mhall': sum(MH.values()),
    'k.c1': n3[0], 'k.c2': n3[1], 'k.c3': n3[2],
}
ringkas['k.persen'] = round(100 * ringkas['k.mh'] / ringkas['k.mhall'])
BATAS = {'b1.a': K1[0][0], 'b1.b': K1[0][1], 'b1.c': K1[1][0], 'b1.d': K1[1][1], 'b1.e': K1[2][0],
         'b2.a': K2[1][0], 'b2.b': K2[1][1], 'b2.c': K2[2][0],
         'b3.a': K3[0][0], 'b3.b': K3[0][1], 'b3.c': K3[1][0], 'b3.d': K3[1][1], 'b3.e': K3[2][0]}   # batas kelas legenda peta
ringkas.update(BATAS)
(LAP / 'ringkas.json').write_text(json.dumps(ringkas, ensure_ascii=False, indent=1), encoding='utf-8')
S_T = 'DIBI BNPB, rekap tahunan per kab/kota, diunduh 30 Okt 2026'
S_H = 'DIBI BNPB, kejadian harian per kab/kota, diunduh 28 Okt 2026'
SAT = {'y.mh25': ('jiwa', S_T), 'y.mh24': ('jiwa', S_T), 'y.kali': ('kali', S_T), 'y.ung25': ('jiwa', S_T),
       'y.kab': ('kab/kota', S_T), 'y.c1': ('kab/kota', S_T), 'y.c2': ('kab/kota', S_T), 'y.c3': ('kab/kota', S_T),
       'h.kab': ('kab/kota', S_H), 'h.ung': ('jiwa', S_H), 'h.mng': ('jiwa', S_H), 'h.hil': ('jiwa', S_H),
       'h.rrb': ('unit', S_H), 'h.c1': ('kab/kota', S_H), 'h.c2': ('kab/kota', S_H), 'h.c3': ('kab/kota', S_H),
       'k.top': ('kab/kota', S_H), 'k.mh': ('jiwa', S_H), 'k.mhall': ('jiwa', S_H), 'k.persen': ('persen', S_H),
       'k.c1': ('kab/kota', S_H), 'k.c2': ('kab/kota', S_H), 'k.c3': ('kab/kota', S_H)}
SAT.update({k: ({'b1': 'kali', 'b2': 'unit', 'b3': 'jiwa'}[k[:2]], 'Batas kelas peta, ditetapkan penyusun') for k in BATAS})
reg = {'angka': {k: {'berkas': 'lap/ringkas.json', 'jalur': f'[{k}]', 'satuan': s, 'keyakinan': 'terverifikasi', 'sumber': src}
                 for k, (s, src) in SAT.items()}}
(AKAR / 'data/angka.json').write_text(json.dumps(reg, ensure_ascii=False, indent=1), encoding='utf-8')

# ---------- peta ----------
PW = 1300
BBOX = (95.0, -3.5, 101.6, 6.0)
FITUR = {}
for p in ('11', '12', '13', '14', '15', '17', '21'):
    for ft in json.loads((GEO / 'kabupaten' / f'{p}.json').read_text(encoding='utf-8'))['features']:
        FITUR[(p, ft['properties']['kab'])] = ft['geometry']


def pusat(g):
    polys = [g['coordinates']] if g['type'] == 'Polygon' else g['coordinates']
    ring = max((pp[0] for pp in polys), key=len)
    return sum(y for _, y in ring) / len(ring), sum(x for x, _ in ring) / len(ring)


def peta(nama, warna_kab, titik=()):
    x0, y0, x1, y1 = BBOX
    ph = round(PW * (y1 - y0) / (x1 - x0))

    def pr(lon, lat):
        return (lon - x0) / (x1 - x0) * PW, (y1 - lat) / (y1 - y0) * ph

    el = []
    for (p, kab), g in FITUR.items():
        isi = warna_kab.get((p, kab), ABU if p in PROV else ABU2)
        polys = [g['coordinates']] if g['type'] == 'Polygon' else g['coordinates']
        d = []
        for pp in polys:
            pts, akhir = [], None
            for x, y in pp[0]:
                q = pr(x, y)
                if akhir is None or abs(q[0] - akhir[0]) + abs(q[1] - akhir[1]) > 0.8:
                    pts.append(q)
                    akhir = q
            if len(pts) > 2:
                d.append('M' + 'L'.join(f'{a:.1f} {b:.1f}' for a, b in pts) + 'Z')
        if d:
            el.append(f'<path d="{"".join(d)}" fill="{isi}" stroke="#FFFFFF" stroke-width="0.8"/>')
    svg = f'<svg xmlns="http://www.w3.org/2000/svg" width="{PW}" height="{ph}"><rect width="{PW}" height="{ph}" fill="#FFFFFF"/>{"".join(el)}</svg>'
    pix = pymupdf.open(stream=svg.encode(), filetype='svg')[0].get_pixmap(dpi=72)
    im = Image.frombytes('RGB', (pix.width, pix.height), pix.samples)
    dr = ImageDraw.Draw(im)
    fb = ImageFont.truetype(str(FONT / 'Roboto-Bold.ttf'), 46)
    taruh = []
    for no, lat, lon, w in titik:
        x, y = pr(lon, lat)
        for _ in range(40):
            if all(math.hypot(x - a, y - b) > 80 for a, b in taruh):
                break
            y += 12
            x += 10
        ox, oy = pr(lon, lat)
        if (x, y) != (ox, oy):
            dr.line([ox, oy, x, y], fill=NAVY, width=2)
            dr.ellipse([ox - 4, oy - 4, ox + 4, oy + 4], fill=NAVY)
        taruh.append((x, y))
        r = 36
        dr.ellipse([x - r, y - r, x + r, y + r], fill=w, outline='#FFFFFF', width=3)
        dr.text((x, y + 1), str(no), font=fb, fill='#FFFFFF', anchor='mm')
    fs = ImageFont.truetype(str(FONT / 'Roboto-Bold.ttf'), 40)
    ax, ay = PW - 70, 40
    dr.polygon([(ax, ay), (ax - 22, ay + 70), (ax + 22, ay + 70)], fill=NAVY)
    dr.text((ax, ay + 104), 'U', font=fs, fill=NAVY, anchor='mm')
    km = 200
    px = km / (111.32 * math.cos(math.radians((y0 + y1) / 2))) / (x1 - x0) * PW
    sy = ph - 50
    dr.line([PW - 60 - px, sy, PW - 60, sy], fill=NAVY, width=6)
    dr.text((PW - 60 - px / 2, sy - 36), f'{km} km', font=fs, fill=NAVY, anchor='mm')
    out = PETA / f'{nama}.png'
    im.save(out)
    man = {'unsur_peta': {'sumber_batas': 'Batas kab/kota BIG', 'sistem_referensi': 'WGS 84', 'proyeksi': 'ekuirektangular',
                          'catatan': 'Batas wilayah bukan rujukan resmi'},
           'masukan': {'../data/lap/' + n: hashlib.sha256((LAP / n).read_bytes()).hexdigest()
                       for n in ('s1.csv', 's2.csv', 's3.csv', 'dibi_kab_tahun.json', 'dibi_kejadian.json')}}
    (PETA / f'{nama}.json').write_text(json.dumps(man, ensure_ascii=False, indent=1), encoding='utf-8')
    print(out, im.size)


BIRU = ['#A4CAEE', '#2F86D1', '#1B5A93']       # skala.air.2, 4, 5
MRH = ['#F4C3A0', '#E8894A', '#8F3F07']        # skala.api.2, 3, 5


def kelas(v, kl, warna):
    for (a, b), w in zip(kl, warna):
        if a <= v <= b:
            return w
    return None


def nama_geo(kode):
    return NAMA[kode]


w1 = {}
for kode, v in KEJ.items():
    w = kelas(v, K1, BIRU)
    if w:
        w1[(kode[:2], nama_geo(kode))] = w
w2 = {pk: kelas(v, K2, MRH) for pk, v in RRB.items()}
w3 = {pk: kelas(v, K3, MRH) for pk, v in MH.items() if v > 0}
hilang = [pk for pk in list(w1) + list(w2) + list(w3) if pk not in FITUR]
assert not hilang, hilang
peta('s1-banjir2025', w1)
peta('s2-banjir2025', w2)
peta('s3-banjir2025', w3, [(i, *pusat(FITUR[pk]), NAVY) for i, pk in enumerate(top, 1)])
print(json.dumps(ringkas))
