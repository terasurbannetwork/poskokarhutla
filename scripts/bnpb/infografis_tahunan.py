#!/usr/bin/env python3
"""Infografis "Bencana Indonesia <periode>" (model infografis resmi BNPB) -> PPTX, PDF, PNG.

Pakai:  python3 scripts/bnpb/infografis_tahunan.py 2025|2026-10|2026-T3 [--keluar FOLDER] [--cetak-saja]
        (tahun | bulan | triwulan)
Data  : HANYA public/data/dibi_tren.json (DIBI, is_bencana = TRUE), kategori bencana alam.
Bulan dan triwulan: DIBI tidak punya rincian fasilitas dan rumah berat/sedang/ringan per bulan, jadi slide hanya memuat ukuran
        yang ada (meninggal+hilang digabung, rumah rusak total, estimasi kerugian rumah) plus pembanding periode yang sama tahun lalu.
        Periode yang belum genap (bulan berjalan) DITOLAK: angkanya bergerak tiap hari dan tidak sebanding dengan tahun lalu yang
        sudah penuh. Periode genap di tahun berjalan tetap berlabel data sementara beserta tanggal potong DIBI.
Mesin : skill ppt-konsultan (bnpb/scripts/deck.py, proyek assets/proyek-infografis). Satu slide jenis `bebas` berkanvas.
Keluar: <proyek>/keluaran/<tahun>/Bencana Indonesia <tahun>.{pptx,pdf,png} + tabel-angka.json (angka dan selisih ke resmi bila ada).
"""
import argparse, datetime as dt, json, math, os, re, shutil, subprocess, sys
from collections import defaultdict
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
SKILL = Path.home() / '.claude/skills/ppt-konsultan/bnpb'
PROYEK = SKILL / 'assets/proyek-infografis'
DIBI = REPO / 'public/data/dibi_tren.json'
GEO = REPO / 'public/geo/provinsi.json'

ALAM = ['Banjir', 'Kebakaran hutan dan lahan', 'Cuaca ekstrem', 'Longsor', 'Kekeringan', 'Gelombang pasang / Abrasi',
        'Gempabumi', 'Erupsi gunung api', 'Tsunami']
JENIS = [  # slug, kategori DIBI, label, ikon
    ('banjir', 'Banjir', 'Banjir', 'banjir'),
    ('karhutla', 'Kebakaran hutan dan lahan', 'Kebakaran hutan dan lahan', 'karhutla'),
    ('cuaca', 'Cuaca ekstrem', 'Cuaca ekstrem', 'cuaca-ekstrem'),
    ('longsor', 'Longsor', 'Tanah longsor', 'longsor'),
    ('kekeringan', 'Kekeringan', 'Kekeringan', 'kekeringan'),
    ('gelombang', 'Gelombang pasang / Abrasi', 'Gelombang pasang dan abrasi', 'gelombang-abrasi'),
    ('gempa', 'Gempabumi', 'Gempa bumi', 'gempa'),
    ('erupsi', 'Erupsi gunung api', 'Erupsi gunung api', 'gunungapi')]
# angka resmi infografis BNPB 2024 (uji kecocokan)
RESMI_2024 = {'total': 3472, 'k.banjir': 1420, 'k.karhutla': 973, 'k.cuaca': 733, 'k.longsor': 207, 'k.kekeringan': 89,
              'k.gelombang': 27, 'k.gempa': 15, 'k.erupsi': 8, 'd.meninggal': 540, 'd.hilang': 63, 'd.luka': 11531,
              'd.terdampak': 8136271, 'r.berat': 13104, 'r.sedang': 15295, 'r.ringan': 51905, 'f.pendidikan': 612,
              'f.ibadah': 415, 'f.kesehatan': 82, 'f.kantor': 89, 'f.jembatan': 445}


def hitung(tahun):
    d = json.load(open(DIBI))
    kat, kol = d['kategori'], d['kolom_tahun'][3:]
    ix = {k: i for i, k in enumerate(kol)}
    jen = defaultdict(lambda: defaultdict(float))
    prov = defaultdict(int)
    for r in d['tahun_kab']:
        if r[0] != tahun or kat[r[1]] not in ALAM:
            continue
        for i, v in enumerate(r[3:]):
            jen[kat[r[1]]][kol[i]] += v
        prov[d['kab'][r[2]][1]] += r[3 + ix['kejadian']]
    if not jen:
        sys.exit(f'tahun {tahun} tidak ada di DIBI')
    S = lambda k: int(round(sum(j[k] for j in jen.values())))
    v = {'total': S('kejadian'),
         'k': {s: int(jen[c]['kejadian']) for s, c, _, _ in JENIS},
         'd': {'meninggal': S('meninggal'), 'hilang': S('hilang'), 'luka': S('luka'), 'terdampak': S('terdampak')},
         'r': {'berat': S('rr_berat'), 'sedang': S('rr_sedang'), 'ringan': S('rr_ringan')},
         'f': {'pendidikan': S('f_pendidikan'), 'ibadah': S('f_ibadah'), 'kesehatan': S('f_kesehatan'),
               'kantor': S('f_kantor'), 'jembatan': S('jembatan')},
         'p': {f['properties']['kode']: int(prov.get(f['properties']['kode'], 0)) for f in json.load(open(GEO))['features']},
         'amb': {'a': 50, 'b': 150}}
    return v, d


BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
SAT = {'total': 'kejadian', 'k': 'kejadian', 'd': 'jiwa', 'r': 'unit', 'f': 'unit', 'p': 'kejadian', 'amb': '', 'rg': 'Rp', 'b': '%'}
SAT_L = {'kejadian': 'kejadian', 'mdh': 'jiwa', 'terdampak': 'jiwa', 'rumah': 'unit'}


def satuan(k):
    a, _, b = k.partition('.')
    return SAT_L[b] if a == 'l' else SAT[a]


def periode(s):
    """'2025' | '2026-10' | '2026-T3' -> {tahun, awal, akhir (bulan), kode, label, jenis}."""
    m = re.fullmatch(r'(\d{4})(?:-(?:(0[1-9]|1[0-2])|T([1-4])))?', s)
    if not m:
        sys.exit(f'periode "{s}" tidak dikenal; pakai 2025, 2026-10 (bulan), atau 2026-T3 (triwulan)')
    y, bl, tw = int(m[1]), m[2], m[3]
    if bl:
        b = int(bl)
        return dict(tahun=y, awal=b, akhir=b, kode=s, label=f'{BULAN[b - 1]} {y}', jenis='bulan')
    if tw:
        q = int(tw)
        return dict(tahun=y, awal=3 * q - 2, akhir=3 * q, kode=s, label=f'Triwulan {"I II III IV".split()[q - 1]} {y}', jenis='triwulan')
    return dict(tahun=y, awal=1, akhir=12, kode=s, label=str(y), jenis='tahun')


def hitung_periode(per, d):
    """Bulan atau triwulan dari bulan_prov. Jumlahkan dulu (kejadian bisa pecahan), baru bulatkan."""
    kat, kol = d['kategori'], d['kolom_bulan']
    ci = {k: i for i, k in enumerate(kol)}

    def jumlah(tahun):
        lo, hi = tahun * 100 + per['awal'], tahun * 100 + per['akhir']
        jen = defaultdict(lambda: defaultdict(float))
        prov = defaultdict(float)
        for r in d['bulan_prov']:
            if lo <= r[0] <= hi and kat[r[1]] in ALAM:
                for k in ('kejadian', 'mdh', 'luka', 'terdampak', 'rumah', 'rugi_rumah'):
                    jen[kat[r[1]]][k] += r[ci[k]]
                prov[r[2]] += r[ci['kejadian']]
        return jen, prov
    jen, prov = jumlah(per['tahun'])
    if not jen:
        sys.exit(f'periode {per["label"]} tidak ada di DIBI')
    S = lambda j, k: sum(x[k] for x in j.values())
    lalu, _ = jumlah(per['tahun'] - 1)
    n = per['akhir'] - per['awal'] + 1
    a = max(1, round(50 * n / 12))   # ambang warna peta tahunan (50 dan 150) diskalakan ke lama periode
    v = {'total': int(round(S(jen, 'kejadian'))),
         'k': {s: int(round(jen[c]['kejadian'])) for s, c, _, _ in JENIS},
         'd': {'mdh': int(round(S(jen, 'mdh'))), 'luka': int(round(S(jen, 'luka'))), 'terdampak': int(round(S(jen, 'terdampak')))},
         'r': {'rumah': int(round(S(jen, 'rumah')))},
         'rg': int(round(S(jen, 'rugi_rumah'))) * 1_000_000,   # kolom DIBI dalam juta rupiah
         'p': {f['properties']['kode']: int(round(prov.get(f['properties']['kode'], 0))) for f in json.load(open(GEO))['features']},
         'amb': {'a': a, 'b': max(a + 1, round(150 * n / 12))}}
    if lalu:
        L = {'kejadian': S(lalu, 'kejadian'), 'mdh': S(lalu, 'mdh'), 'terdampak': S(lalu, 'terdampak'), 'rumah': S(lalu, 'rumah')}
        L = {k: int(round(x)) for k, x in L.items()}
        now = {'kejadian': v['total'], 'mdh': v['d']['mdh'], 'terdampak': v['d']['terdampak'], 'rumah': v['r']['rumah']}
        v['l'], v['n'] = L, now
        v['b'] = {k: int(round((now[k] - L[k]) / L[k] * 100)) for k in L if L[k]}   # tanpa pembanding bila periode lalu 0
    return v


def datar(v, pre=''):
    for k, x in v.items():
        if isinstance(x, dict):
            yield from datar(x, pre + k + '.')
        else:
            yield pre + k, x


# ------------------------------------------------------------------ geometri
W, H = 873.6, 390.0           # area isi slide (pt) dikurangi jarak aman 7 pt di tepi bawah (gerbang T-7)
MX, MY, MW = 0.0, 24.0, 560.0   # kotak peta (pt) di dalam kanvas


def cincin(geo):
    for f in geo['features']:
        g = f['geometry']
        ps = [g['coordinates']] if g['type'] == 'Polygon' else g['coordinates']
        yield f['properties']['kode'], [p[0] for p in ps]


def dp(pts, tol):
    if len(pts) < 3:
        return pts
    (x1, y1), (x2, y2) = pts[0], pts[-1]
    dx, dy = x2 - x1, y2 - y1
    n = math.hypot(dx, dy) or 1e-9
    j, m = 0, -1
    for i in range(1, len(pts) - 1):
        dd = abs(dy * (pts[i][0] - x1) - dx * (pts[i][1] - y1)) / n
        if dd > m:
            j, m = i, dd
    if m <= tol:
        return [pts[0], pts[-1]]
    return dp(pts[:j + 1], tol)[:-1] + dp(pts[j:], tol)


def luas(r):
    return abs(sum(a[0] * b[1] - b[0] * a[1] for a, b in zip(r, r[1:] + r[:1]))) / 2


def pusat(r):
    a = sum(p[0] * q[1] - q[0] * p[1] for p, q in zip(r, r[1:] + r[:1])) / 2 or 1e-9
    cx = sum((p[0] + q[0]) * (p[0] * q[1] - q[0] * p[1]) for p, q in zip(r, r[1:] + r[:1])) / (6 * a)
    cy = sum((p[1] + q[1]) * (p[0] * q[1] - q[0] * p[1]) for p, q in zip(r, r[1:] + r[:1])) / (6 * a)
    return cx, cy


GESER = {'31': (-2, -16), '34': (4, 12), '36': (-12, 2), '51': (2, 12), '35': (8, 4), '32': (-4, 4), '33': (0, 4),
         '52': (-2, 11), '19': (0, -2), '21': (6, 2), '18': (-10, 8), '16': (4, 0), '17': (-8, 4), '65': (-4, 2),
         '92': (-3, 0), '96': (0, -4), '82': (0, -2), '81': (-4, 6), '76': (-4, 0), '75': (-2, -8), '71': (6, -4)}


def peta(v):
    geo = json.load(open(GEO))
    semua = [p for _, rs in cincin(geo) for r in rs for p in r]
    lo0, lo1 = min(p[0] for p in semua), max(p[0] for p in semua)
    la0, la1 = min(p[1] for p in semua), max(p[1] for p in semua)
    sk = MW / (lo1 - lo0)
    MH = (la1 - la0) * sk
    pr = lambda p: (MX + (p[0] - lo0) * sk, MY + (la1 - p[1]) * sk)
    el, pil = [], []
    for kode, rs in cincin(geo):
        n = v['p'].get(kode, 0)
        warna = 'tanpa-data' if n == 0 else ('skala.air.1' if n < v['amb']['a'] else 'skala.air.3' if n <= v['amb']['b'] else 'skala.air.5')
        besar = max(rs, key=luas)
        for r in rs:
            q = [pr(p) for p in r]
            m = len(q) // 2   # cincin tertutup: pecah dua dulu supaya Douglas-Peucker tidak menciut jadi garis
            pp = dp(q[:m + 1], 0.3)[:-1] + dp(q[m:], 0.3)
            pp = pp[:-1] if pp[0] == pp[-1] else pp
            if len(pp) >= 3 and luas(pp) >= 1.2:
                el.append({'k': 'poligon', 'pt': True, 'titik': [[round(a, 1), round(b, 1)] for a, b in pp], 'isi': warna, 'garis': 'kertas', 'tebal': 0.4})
        cx, cy = pr(pusat(besar))
        gx, gy = GESER.get(kode, (0, 0))
        pil.append([kode, cx + gx, cy + gy])
    PW, PH = 17.0, 9.5
    for _ in range(60):   # sebar label yang bertumpuk
        for i in range(len(pil)):
            for j in range(i + 1, len(pil)):
                dx, dy = pil[j][1] - pil[i][1], pil[j][2] - pil[i][2]
                if abs(dx) < PW + 1 and abs(dy) < PH + 1:
                    if abs(dx) / (PW + 1) > abs(dy) / (PH + 1):
                        s = (PW + 1 - abs(dx)) / 2 * (1 if dx >= 0 else -1)
                        pil[i][1] -= s; pil[j][1] += s
                    else:
                        s = (PH + 1 - abs(dy)) / 2 * (1 if dy >= 0 else -1)
                        pil[i][2] -= s; pil[j][2] += s
    for kode, x, y in pil:
        x = min(max(x, MX + PW / 2), MX + MW - PW / 2); y = min(max(y, MY + PH / 2), MY + MH - PH / 2)
        el.append({'k': 'kotak', 'pt': True, 'x': round(x - PW / 2, 1), 'y': round(y - PH / 2, 1), 'w': PW, 'h': PH, 'isi': 'kertas', 'garis': 'skala.netral.3', 'tebal': 0.4, 'bentuk': 'bulat', 'radius': PH / 2})
        el.append({'k': 'teks', 'pt': True, 't': '{{angka:ig.p.%s}}' % kode, 'sz': 6.5, 'tebal': True, 'warna': 'navy', 'x': round(x - PW / 2, 1), 'y': round(y - PH / 2, 1), 'w': PW, 'h': PH, 'jangkar': 'm', 'rata': 'c', 'maks': 1})
    return el, MH


# ------------------------------------------------------------------ elemen kanvas
def T(t, x, y, w, h, sz=8, tebal=False, warna='teks', rata='l', jangkar='m', maks=1, bungkus=False):
    e = {'k': 'teks', 'pt': True, 't': t, 'sz': sz, 'tebal': tebal, 'warna': warna, 'x': round(x, 1), 'y': round(y, 1), 'w': round(w, 1), 'h': round(h, 1), 'jangkar': jangkar, 'rata': rata, 'maks': maks}
    if bungkus:
        e['bungkus'] = True
    return e


def K(x, y, w, h, isi, garis=None, bentuk='kotak', radius=None):
    e = {'k': 'kotak', 'pt': True, 'x': round(x, 1), 'y': round(y, 1), 'w': round(w, 1), 'h': round(h, 1), 'isi': isi, 'bentuk': bentuk}
    if garis:
        e['garis'] = garis; e['tebal'] = 0.75
    if radius is not None:
        e['radius'] = radius
    return e


def IK(konsep, x, y, d=22, isi='navy'):
    return {'k': 'ikon', 'pt': True, 'konsep': konsep, 'd': d, 'isi': isi, 'warna': 'kertas', 'x': round(x, 1), 'y': round(y, 1)}


def kepala(teks, ikon, x, y, w):
    return [IK(ikon, x, y, 16), T(teks, x + 21, y, w - 21, 16, 10, True, 'navy'),
            {'k': 'garis', 'pt': True, 'x': x, 'y': y + 19, 'x2': x + w, 'y2': y + 19, 'warna': 'garis-kuat', 'tebal': 0.75}]


def kanvas(v, per, catatan=''):
    tahun = per['tahun']
    el = []
    # ---- peta
    el += kepala('Sebaran kejadian bencana alam per provinsi', 'wilayah', 0, 0, MW)
    pe, MH = peta(v)
    el.append(K(MX, MY, MW, MH, 'kertas', 'garis'))
    el += pe
    ly = MY + MH - 46   # legenda kiri bawah, di atas Samudra Hindia
    el.append(K(2, ly, 112, 44, 'kertas', 'garis'))
    for i, (tok, t) in enumerate([('skala.air.1', 'Kurang dari {{angka:ig.amb.a}}'), ('skala.air.3', '{{angka:ig.amb.a}} sampai {{angka:ig.amb.b}}'), ('skala.air.5', 'Lebih dari {{angka:ig.amb.b}}')]):
        el.append(K(7, ly + 5 + i * 10, 10, 7, tok))
        el.append(T(t, 21, ly + 3.5 + i * 10, 90, 10, 7, False, 'teks'))
    # ---- jenis bencana
    y0 = MY + MH + 8
    el += kepala('Jumlah kejadian per jenis bencana alam', 'ringkasan', 0, y0, MW)
    cw, ch, g = (MW - 3 * 6) / 4, (H - y0 - 24 - 6) / 2, 6
    for i, (s, _, lab, ik) in enumerate(JENIS):
        cx, cy = (i % 4) * (cw + g), y0 + 24 + (i // 4) * (ch + g)
        el.append(K(cx, cy, cw, ch, 'tint.basah.muda', 'garis', 'bulat', 4))
        el.append(IK(ik, cx + 6, cy + (ch - 24) / 2, 24))
        el.append(T('{{angka:ig.k.%s}}' % s, cx + 34, cy + 3, cw - 38, ch / 2, 13, True, 'navy'))
        el.append(T(lab, cx + 34, cy + ch / 2 - 1, cw - 38, ch / 2 - 2, 7.5, False, 'teks', jangkar='t', maks=2, bungkus=True))
    # ---- kolom kanan
    X, RW = 580.0, W - 580.0
    if per['jenis'] != 'tahun':
        return el + kanan_periode(v, per, catatan, X, RW)
    el.append(K(X, 0, RW, 68, 'navy', None, 'bulat', 5))
    el.append(T('Total bencana %d' % tahun, X + 12, 3 if catatan else 6, RW - 24, 14 if catatan else 16, 10, True, 'kertas'))
    el.append(T('{{angka:ig.total}}', X + 12, 17 if catatan else 21, RW - 24, 30 if catatan else 36, 26 if catatan else 30, True, 'kertas'))
    if catatan:
        el.append(T(catatan, X + 12, 47, RW - 24, 10, 7, False, 'kertas'))
    y = 76
    el += kepala('Dampak', 'jiwa', X, y, RW)
    for i, (s, ik, lab) in enumerate([('meninggal', 'jiwa', 'Meninggal dunia'), ('hilang', 'wilayah', 'Hilang'),
                                      ('luka', 'kesehatan', 'Luka atau sakit'), ('terdampak', 'pengungsi', 'Menderita dan mengungsi')]):
        yy = y + 25 + i * 27
        el.append(IK(ik, X, yy, 22))
        el.append(T('{{angka:ig.d.%s}}' % s, X + 30, yy, 88, 22, 12, True, 'navy'))
        el.append(T(lab, X + 120, yy, RW - 120, 22, 8.5, False, 'teks'))
    y = 76 + 25 + 4 * 27 + 2
    el += kepala('Dampak kerusakan', 'infrastruktur', X, y, RW)
    ry = y + 24
    el.append(T('Rumah rusak', X, ry, RW, 11, 8, True, 'teks-2'))
    bw = (RW - 2 * 5) / 3
    for i, (s, lab) in enumerate([('berat', 'Rusak berat'), ('sedang', 'Rusak sedang'), ('ringan', 'Rusak ringan')]):
        bx = X + i * (bw + 5)
        el.append(K(bx, ry + 13, bw, 34, 'tint.netral.muda', 'garis', 'bulat', 4))
        el.append(T('{{angka:ig.r.%s}}' % s, bx + 4, ry + 14, bw - 8, 18, 11, True, 'navy', 'c'))
        el.append(T(lab, bx + 4, ry + 31, bw - 8, 13, 7.5, False, 'teks', 'c'))
    fy = ry + 54
    el.append(T('Fasilitas rusak', X, fy, RW, 11, 8, True, 'teks-2'))
    for i, (s, ik, lab) in enumerate([('pendidikan', 'sekolah', 'Satuan pendidikan'), ('ibadah', 'situs', 'Rumah ibadat'),
                                      ('kesehatan', 'kesehatan', 'Fasilitas pelayanan kesehatan'), ('kantor', 'lembaga', 'Kantor'), ('jembatan', 'infrastruktur', 'Jembatan')]):
        yy = fy + 14 + i * 17
        el.append(IK(ik, X, yy, 14))
        el.append(T('{{angka:ig.f.%s}}' % s, X + 19, yy - 1, 52, 16, 10, True, 'navy'))
        el.append(T(lab, X + 74, yy - 1, RW - 74, 16, 8, False, 'teks'))
    return el


def kanan_periode(v, per, catatan, X, RW):
    """Kolom kanan bulan/triwulan: hanya ukuran yang ada per bulan di DIBI + pembanding tahun lalu."""
    el = [K(X, 0, RW, 68, 'navy', None, 'bulat', 5),
          T('Total bencana %s' % per['label'], X + 12, 3, RW - 24, 14, 10, True, 'kertas'),
          T('{{angka:ig.total}}', X + 12, 17, RW - 24, 30, 26, True, 'kertas')]
    if catatan:
        el.append(T(catatan, X + 12, 47, RW - 24, 10, 7, False, 'kertas'))
    y = 76
    el += kepala('Dampak', 'jiwa', X, y, RW)
    for i, (s, ik, lab) in enumerate([('mdh', 'jiwa', 'Meninggal dunia dan hilang'), ('luka', 'kesehatan', 'Luka atau sakit'),
                                      ('terdampak', 'pengungsi', 'Menderita dan mengungsi')]):
        yy = y + 25 + i * 27
        el += [IK(ik, X, yy, 22), T('{{angka:ig.d.%s}}' % s, X + 30, yy, 88, 22, 12, True, 'navy'), T(lab, X + 120, yy, RW - 120, 22, 8.5, False, 'teks')]
    y = 76 + 25 + 3 * 27 + 2
    el += kepala('Dampak kerusakan rumah', 'infrastruktur', X, y, RW)
    bw, by = (RW - 5) / 2, y + 24
    for i, (tok, lab) in enumerate([('{{angka:ig.r.rumah}}', 'Rumah rusak'), ('{{angka:ig.rg|rupiah}}', 'Estimasi kerugian rumah (rumus DIBI)')]):
        bx = X + i * (bw + 5)
        el += [K(bx, by, bw, 34, 'tint.netral.muda', 'garis', 'bulat', 4), T(tok, bx + 4, by + 1, bw - 8, 18, 11, True, 'navy', 'c'),
               T(lab, bx + 4, by + 19, bw - 8, 13, 7.5, False, 'teks', 'c')]
    if 'l' not in v:
        return el
    y = by + 44
    el += kepala('Dibanding %s tahun lalu' % ('periode yang sama' if per['jenis'] == 'triwulan' else 'bulan yang sama'), 'ringkasan', X, y, RW)
    cx = [(X + 108, 54), (X + 164, 56), (X + 224, RW - 224)]   # periode ini, tahun lalu, perubahan
    hy = y + 24
    for (cxx, cw), t in zip(cx, ('%d' % per['tahun'], '%d' % (per['tahun'] - 1), 'Perubahan')):
        el.append(T(t, cxx, hy, cw, 11, 7.5, True, 'teks-2', 'r'))
    kini = {'kejadian': 'total', 'mdh': 'd.mdh', 'terdampak': 'd.terdampak', 'rumah': 'r.rumah'}
    for i, (s, lab) in enumerate([('kejadian', 'Kejadian'), ('mdh', 'Meninggal dan hilang'), ('terdampak', 'Menderita dan mengungsi'), ('rumah', 'Rumah rusak')]):
        yy = hy + 13 + i * 18
        ub = ('{{angka:ig.b.%s|arah|persen}}' % s) if s in v['b'] else ('tetap' if v['n'][s] == 0 else 'tanpa pembanding')   # periode lalu 0: tanpa persen
        el.append(T(lab, X, yy, 106, 16, 8, False, 'teks'))
        for (cxx, cw), isi, tebal, warna in zip(cx, ('{{angka:ig.%s}}' % kini[s], '{{angka:ig.l.%s}}' % s, ub), (True, False, True), ('navy', 'teks-2', 'navy')):
            el.append(T(isi, cxx, yy, cw, 16, 9, tebal, warna, 'r'))
    return el


def spek(v, per, sementara, potong=''):
    thn, lab = per['jenis'] == 'tahun', per['label']
    sumber = 'DIBI BNPB (dibi.bnpb.go.id), bencana alam sesuai Juklak BNPB 7/2023, data %s' % lab   # label sementara di badan slide: baris Sumber hanya sumber dan tanggal
    jns = 'tahunan' if thn else 'bulanan' if per['jenis'] == 'bulan' else 'triwulanan'
    return {'kajian': 'infografis', 'tanggal': dt.date.today().isoformat(),
            'pesan_kunci': 'Rekap kejadian dan dampak bencana alam Indonesia %s %s dari DIBI BNPB.' % ('tahun' if thn else 'periode', lab),
            'judul_dokumen': 'Bencana Indonesia %s' % lab, 'subjek_dokumen': 'Infografis %s kejadian dan dampak bencana alam' % jns,
            'slide': [{'jenis': 'bebas', 'jenis_slide': 'panel', 'judul_bentuk': 'deskriptif', 'pesan': 'Rekap %s kejadian dan dampak bencana alam' % jns,
                       'cut_off': False, 'judul': 'Bencana Indonesia %s' % lab, 'sumber': sumber,
                       'modul': [{'x': 0, 'y': 0, 'w': 1, 'h': 1, 'kanvas': {'elemen': kanvas(v, per, 'Data DIBI per %s, belum final' % potong if sementara else ''), 'sumber': sumber}}]}]}, sumber


def siapkan_proyek():
    if not PROYEK.exists():
        shutil.copytree(SKILL / 'assets/proyek-presiden', PROYEK, symlinks=True)
        shutil.rmtree(PROYEK / 'spek', ignore_errors=True)
        shutil.rmtree(PROYEK / 'data/pres', ignore_errors=True)
        for b in PROYEK.glob('**/*.bak*'):
            b.unlink()
        t = json.load(open(PROYEK / 'tema.json'))
        t['kajian']['infografis'] = dict(t['kajian']['presiden'], judul='Bencana Indonesia', subjudul='Infografis tahunan', judul_pendek='Infografis Bencana Indonesia',
                                         nama_berkas='Bencana Indonesia {DDMMYY}', kata_kunci=['BNPB', 'DIBI', 'bencana alam'], cakupan_sampul='Rekap tahunan bencana alam Indonesia.')
        json.dump(t, open(PROYEK / 'tema.json', 'w'), ensure_ascii=False, indent=1)
    (PROYEK / 'spek').mkdir(exist_ok=True)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('periode', help='2025 (tahun), 2026-10 (bulan), 2026-T3 (triwulan)')
    ap.add_argument('--keluar')
    ap.add_argument('--cetak-saja', action='store_true', help='cetak angka saja, tanpa membangun')
    a = ap.parse_args()
    per = periode(a.periode)
    d = json.load(open(DIBI))
    potong = d['dibuat'][:10]   # tanggal potong DIBI
    if per['jenis'] == 'tahun':
        v, d = hitung(per['tahun'])
    else:
        # periode berjalan ditolak: angkanya bergerak tiap hari dan tidak sebanding dengan periode yang sama tahun lalu yang sudah penuh
        if per['tahun'] * 100 + per['akhir'] >= int(potong[:4]) * 100 + int(potong[5:7]):
            sys.exit(f'{per["label"]} belum genap pada tanggal potong data {potong}; infografis hanya dibuat untuk bulan atau triwulan yang sudah lewat')
        v = hitung_periode(per, d)
    sementara = per['tahun'] >= d.get('sementara', 9999)
    tgl = dt.date.fromisoformat(potong)
    potong_id = '%d %s %d' % (tgl.day, BULAN[tgl.month - 1], tgl.year)
    if a.cetak_saja:
        print(json.dumps(v, ensure_ascii=False, indent=1)); return
    siapkan_proyek()
    kode, nama = per['kode'], f'Bencana Indonesia {per["label"]}'
    keluar = Path(a.keluar) if a.keluar else PROYEK / 'keluaran' / str(per['tahun'])
    keluar.mkdir(parents=True, exist_ok=True)
    sp, sumber = spek(v, per, sementara, potong_id)
    (PROYEK / 'data/infografis').mkdir(exist_ok=True)
    json.dump(v, open(PROYEK / f'data/infografis/ig-{kode}.json', 'w'), ensure_ascii=False)
    reg = {}
    for k, _ in datar(v):
        reg['ig.' + k] = {'berkas': f'infografis/ig-{kode}.json', 'jalur': k, 'satuan': satuan(k), 'keyakinan': 'terverifikasi', 'sumber': sumber}
    pa = PROYEK / 'data/angka.json'   # gerbang QA D-6 membaca data/angka.json proyek, jadi entri digabung ke sana
    if pa.is_symlink():
        pa.unlink()
    ang = json.load(open(pa)) if pa.exists() else {'angka': {}}
    ang['angka'] = {k: x for k, x in ang['angka'].items() if not k.startswith('ig.')}
    ang['angka'].update(reg)
    json.dump(ang, open(pa, 'w'), ensure_ascii=False)
    sf = PROYEK / f'spek/infografis-{kode}.json'
    json.dump(sp, open(sf, 'w'), ensure_ascii=False, indent=1)
    pptx = keluar / f'{nama}.pptx'
    py = SKILL / '.venv/bin/python'
    r = subprocess.run([str(py), 'scripts/deck.py', str(sf), str(pptx), '--pdf', '--akar', str(PROYEK)], cwd=SKILL)
    if r.returncode:
        sys.exit(r.returncode)
    subprocess.run(['pdftoppm', '-r', '150', '-png', '-singlefile', str(pptx.with_suffix('.pdf')), str(keluar / nama)], check=True)
    thn = per['jenis'] == 'tahun'
    tabel = {k: {'sistem': x, 'resmi': RESMI_2024.get(k), 'selisih': (x - RESMI_2024[k]) if per['tahun'] == 2024 and thn and k in RESMI_2024 else None} for k, x in datar(v) if not k.startswith(('p.', 'amb.'))}
    json.dump(tabel, open(keluar / ('tabel-angka.json' if thn else f'tabel-angka {per["label"]}.json'), 'w'), ensure_ascii=False, indent=1)
    subprocess.run([str(py), 'scripts/aturan_slide.py', str(pptx)], cwd=SKILL)
    print('selesai:', keluar)


if __name__ == '__main__':
    main()
