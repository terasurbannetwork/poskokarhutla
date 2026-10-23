#!/usr/bin/env python3
"""Pemuat dan validator tema.json (token desain dua kajian BNPB). Stdlib saja.

    from tema import muat, warna
    t = muat(); warna(t, 'navy') -> '#051C2C'; warna(t, 'skala.air.4') -> '#2F86D1'

`python3 tema.py` menjalankan semua pemeriksaan dan berhenti di pelanggaran pertama.
"""
import json
import re
import sys
from itertools import combinations
from math import atan2, cos, degrees, exp, hypot, radians, sin, sqrt
from pathlib import Path

AKAR = Path(__file__).resolve().parents[2]  # data/kajian-bnpb
RE_HEX = re.compile(r'#[0-9A-Fa-f]{6}\b')


def muat(path=None):
    return json.loads(Path(path or AKAR / 'tema.json').read_text(encoding='utf-8'))


def warna(t, nama):
    """Nama token -> hex. 'navy', 'tint.api.pita', 'kategori.api', 'skala.air.4', 'arah.naik'."""
    w = t['warna']
    if nama.startswith('#'):
        raise KeyError(f'rujukan warna harus nama token, bukan hex: {nama}')
    for grup in ('inti', 'aksen'):
        if nama in w[grup]:
            return w[grup][nama]['hex']
    bag = nama.split('.')
    if bag[0] == 'tint' and len(bag) == 3:
        return w['tint'][bag[1]][bag[2]]
    if bag[0] == 'kategori' and len(bag) == 2:
        return w['kategori'][bag[1]]['hex']
    if bag[0] == 'skala' and len(bag) == 3:
        return w['skala'][bag[1]]['kelas'][int(bag[2]) - 1]
    if bag[0] == 'arah' and len(bag) == 2:
        v = w['arah'][bag[1]]
        return v['hex'] if isinstance(v, dict) else warna(t, v)
    raise KeyError(f'token warna tidak dikenal: {nama}')


# ---- warna: CIE Lab D65 dan CIEDE2000 (Sharma, Wu, Dalal 2005) ----

def lab(h):
    def lin(c):
        c /= 255
        return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    r, g, b = (lin(int(h[i:i + 2], 16)) for i in (1, 3, 5))
    x = (0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / 0.95047
    y = 0.2126729 * r + 0.7151522 * g + 0.0721750 * b
    z = (0.0193339 * r + 0.1191920 * g + 0.9503041 * b) / 1.08883
    f = lambda v: v ** (1 / 3) if v > 216 / 24389 else (24389 / 27 * v + 16) / 116
    fx, fy, fz = f(x), f(y), f(z)
    return 116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)


def de2000_lab(p, q):
    (L1, a1, b1), (L2, a2, b2) = p, q
    cb = (hypot(a1, b1) + hypot(a2, b2)) / 2
    g = 0.5 * (1 - sqrt(cb ** 7 / (cb ** 7 + 25 ** 7)))
    a1p, a2p = (1 + g) * a1, (1 + g) * a2
    c1, c2 = hypot(a1p, b1), hypot(a2p, b2)
    h1 = degrees(atan2(b1, a1p)) % 360 if c1 else 0.0
    h2 = degrees(atan2(b2, a2p)) % 360 if c2 else 0.0
    dh = 0.0 if c1 * c2 == 0 else (h2 - h1 + 180) % 360 - 180
    dH = 2 * sqrt(c1 * c2) * sin(radians(dh / 2))
    lb, cbp = (L1 + L2) / 2, (c1 + c2) / 2
    if c1 * c2 == 0:
        hb = h1 + h2
    elif abs(h1 - h2) <= 180:
        hb = (h1 + h2) / 2
    else:
        hb = (h1 + h2 + 360) / 2 if h1 + h2 < 360 else (h1 + h2 - 360) / 2
    T = (1 - 0.17 * cos(radians(hb - 30)) + 0.24 * cos(radians(2 * hb))
         + 0.32 * cos(radians(3 * hb + 6)) - 0.20 * cos(radians(4 * hb - 63)))
    rt = -sin(radians(60 * exp(-((hb - 275) / 25) ** 2))) * 2 * sqrt(cbp ** 7 / (cbp ** 7 + 25 ** 7))
    sl = 1 + 0.015 * (lb - 50) ** 2 / sqrt(20 + (lb - 50) ** 2)
    sc, sh = 1 + 0.045 * cbp, 1 + 0.015 * cbp * T
    dl, dc, dh2 = (L2 - L1) / sl, (c2 - c1) / sc, dH / sh
    return sqrt(dl ** 2 + dc ** 2 + dh2 ** 2 + rt * dc * dh2)


def de(h1, h2):
    return de2000_lab(lab(h1), lab(h2))


def kontras(h1, h2):
    def lum(h):
        def ch(c):
            c /= 255
            return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
        r, g, b = (ch(int(h[i:i + 2], 16)) for i in (1, 3, 5))
        return 0.2126 * r + 0.7152 * g + 0.0722 * b
    a, b = sorted((lum(h1), lum(h2)), reverse=True)
    return (a + 0.05) / (b + 0.05)


# ---- pemeriksaan ----

def _jalan(o, jalur=''):
    """Semua (jalur, kunci, nilai) daun di tema."""
    if isinstance(o, dict):
        for k, v in o.items():
            yield from _jalan(v, f'{jalur}.{k}' if jalur else k)
    elif isinstance(o, list):
        for i, v in enumerate(o):
            yield from _jalan(v, f'{jalur}[{i}]')
    else:
        yield jalur, jalur.rsplit('.', 1)[-1], o


def periksa(t):
    """Kembalikan ringkasan angka; AssertionError pada pelanggaran pertama."""
    w, v = t['warna'], t['validasi']
    putih = warna(t, 'kertas')
    ringkas = {}

    # 1. teks tampil tanpa em dash dan titik tengah; hex berbentuk baku dan tidak terlarang
    terlarang = {h.upper() for h in w['terlarang']}
    for jalur, kunci, nilai in _jalan(t):
        if not isinstance(nilai, str):
            continue
        assert '\u2014' not in nilai and '\u00b7' not in nilai, f'{jalur}: em dash atau titik tengah di "{nilai}"'
        if jalur.startswith('warna.terlarang'):
            continue
        for h in RE_HEX.findall(nilai):
            assert h.upper() not in terlarang, f'{jalur}: hex terlarang {h} (PEDOMAN B1.6)'
            assert h == h.upper(), f'{jalur}: hex {h} harus huruf kapital'
        # 2. tiap rujukan warna menunjuk token yang ada
        if (kunci == 'warna' or kunci.startswith('warna_') or kunci.startswith('pil_')) and not jalur.startswith('warna.'):
            try:
                warna(t, nilai)
            except (KeyError, IndexError, ValueError) as e:
                raise AssertionError(f'{jalur}: rujukan warna "{nilai}" tidak terurai ({e})')
    for k in ('naik', 'turun', 'nol', 'naik_di_navy', 'turun_di_navy'):
        warna(t, f'arah.{k}')
    for kel, isi in w['kategori'].items():
        if kel.startswith('_'):
            continue
        assert isi['tint'] in w['tint'], f'warna.kategori.{kel}.tint "{isi["tint"]}" bukan tint yang ada'
        for j in isi['jenis']:
            assert j in t['ikon'], f'jenis {j} (kategori {kel}) tidak punya ikon di registri'
            assert j in t['kosakata']['jenis_bencana'], f'jenis {j} tidak punya label di kosakata.jenis_bencana'

    # 3. kategori: beda warna dan kontras grafis (PEDOMAN B1.3)
    kat = {k: x['hex'] for k, x in w['kategori'].items() if not k.startswith('_')}
    kat['merah'], kat['navy'] = warna(t, 'merah'), warna(t, 'navy')
    pas = min(((de(kat[a], kat[b]), a, b) for a, b in combinations(kat, 2)))
    assert pas[0] >= v['kategori_de_min'], f'kategori {pas[1]} vs {pas[2]}: CIEDE2000 {pas[0]:.1f} < {v["kategori_de_min"]}'
    ringkas['kategori_de_min'] = (round(pas[0], 1), pas[1], pas[2])
    for k, h in kat.items():
        c = kontras(h, putih)
        assert c >= v['kategori_kontras_min'], f'kategori {k} {h}: kontras {c:.2f}:1 < {v["kategori_kontras_min"]}:1 terhadap putih'

    # 4. ramp: kelas bersebelahan, kelas 1 terhadap putih, kelas IRBI (PEDOMAN B1.4, KEPUTUSAN T8)
    d_sebelah, d_putih = 99.0, 99.0
    for nama, r in w['skala'].items():
        if not isinstance(r, dict) or 'kelas' not in r or nama == 'irbi':
            continue
        k = r['kelas']
        assert len(k) == 5, f'skala.{nama}: {len(k)} kelas, harus 5'
        for a, b in zip(k, k[1:]):
            d = de(a, b)
            assert d >= v['ramp_sebelah_de_min'], f'skala.{nama} {a}->{b}: CIEDE2000 {d:.1f} < {v["ramp_sebelah_de_min"]}'
            d_sebelah = min(d_sebelah, d)
        d = de(k[0], putih)
        assert d >= v['ramp_kelas1_vs_putih_de_min'], f'skala.{nama} kelas 1 {k[0]} vs putih: {d:.1f} < {v["ramp_kelas1_vs_putih_de_min"]}'
        d_putih = min(d_putih, d)
    irbi = w['skala']['irbi']
    assert len(irbi['kelas']) == len(irbi['label']), 'skala.irbi: jumlah kelas dan label berbeda'
    hex_irbi = [w['skala'][irbi['ramp']]['kelas'][i - 1] for i in irbi['kelas']]
    d_irbi = min(de(a, b) for a, b in combinations(hex_irbi, 2))
    assert d_irbi >= v['irbi_de_min'], f'kelas IRBI {hex_irbi}: CIEDE2000 terkecil {d_irbi:.1f} < {v["irbi_de_min"]}'
    ringkas.update(ramp_sebelah_de_min=round(d_sebelah, 1), ramp_kelas1_putih_de_min=round(d_putih, 1),
                   irbi_de_min=round(d_irbi, 1))

    # 5. kontras teks di putih dan di tint; pil berteks putih
    for k in v['token_teks']:
        c = kontras(warna(t, k), putih)
        assert c >= v['teks_kontras_min'], f'token teks {k}: kontras {c:.2f}:1 < {v["teks_kontras_min"]}:1'
    for tema_t, isi in w['tint'].items():
        if tema_t.startswith('_'):
            continue
        for h in (x for x in isi.values()):
            c = kontras(warna(t, 'teks'), h)
            assert c >= v['teks_kontras_min'], f'teks di tint.{tema_t} {h}: {c:.2f}:1'
    for jalur, kunci, nilai in _jalan(t['kosakata']):
        if kunci == 'pil_teks' and nilai == 'kertas':
            induk = jalur.rsplit('.', 1)[0]
            isi = _ambil(t['kosakata'], induk).get('pil_isi')
            assert isi, f'kosakata.{induk}: teks putih tanpa pil_isi'
            c = kontras(warna(t, isi), putih)
            assert c >= v['teks_kontras_min'], f'kosakata.{induk}: teks putih di {isi} {c:.2f}:1 < 4,5:1 (PEDOMAN B1.1)'

    # 6. batas bawah huruf
    for blok, batas in ((t['tipografi_docx'], t['tipografi_docx']['batas_bawah_pt']),
                        (t['slide']['tipografi'], t['slide']['tipografi']['batas_bawah_pt'])):
        for nama, isi in blok.items():
            if not isinstance(isi, dict) or 'ukuran_pt' not in isi or nama == 'pengecualian_bawah':
                continue
            u = isi['ukuran_pt']
            kecil = min(u) if isinstance(u, list) else u
            assert kecil >= batas, f'tipografi {nama}: {kecil} pt < batas bawah {batas} pt'

    # 7. geometri halaman: lebar isi dan kolom menjumlah
    h, m = t['halaman'], t['halaman']['margin_cm']
    isi = h['lebar_cm'] - m['kiri'] - m['kanan']
    assert abs(isi - h['lebar_isi_cm']) < 0.005, f'lebar isi {h["lebar_isi_cm"]} cm != {h["lebar_cm"]} - {m["kiri"]} - {m["kanan"]} = {isi:.2f} cm'
    lb, s = t['objek']['lebar_cm'], h['sela_kolom_cm']
    assert lb['penuh'] == h['lebar_isi_cm'], 'objek.lebar_cm.penuh != halaman.lebar_isi_cm'
    assert abs(2 * lb['dua-kolom'] + s - isi) < 0.01, f'dua kolom 2 x {lb["dua-kolom"]} + {s} != {isi:.2f} cm'
    assert abs(3 * lb['tiga-kolom'] + 2 * s - isi) < 0.01, f'tiga kolom 3 x {lb["tiga-kolom"]} + 2 x {s} != {isi:.2f} cm'

    # 8. berkas yang dirujuk tema ada (logo resmi, font Roboto)
    for p in [t['header_footer']['header']['logo']] + list(t['font']['berkas'].values()):
        q = Path(p).expanduser() if p.startswith('~') else AKAR / p
        assert q.exists(), f'berkas tema tidak ada: {p} -> {q}'

    # 9. satu glif satu arti (D-25)
    glif = [(k, g) for k, g in t['ikon'].items() if not k.startswith('_')]
    dobel = {g for _, g in glif if sum(1 for _, x in glif if x == g) > 1}
    assert not dobel, f'ikon: glif dipakai dua konsep: {sorted(dobel)}'
    for k in list(t['kosakata']['fase']) + list(t['kosakata']['jenis_aksi']):
        if not k.startswith('_'):
            assert k in t['ikon'], f'kosakata {k} tidak punya ikon'
    return ringkas


def _ambil(o, jalur):
    for k in jalur.split('.'):
        o = o[k]
    return o


def _uji_diri():
    # pasangan uji resmi Sharma et al. 2005 (tabel 1, baris 1 dan 17)
    assert abs(de2000_lab((50, 2.6772, -79.7751), (50, 0, -82.7485)) - 2.0425) < 1e-4
    assert abs(de2000_lab((50, 2.5, 0), (73, 25, -18)) - 27.1492) < 1e-4
    assert abs(kontras('#FFFFFF', '#000000') - 21) < 1e-9
    t = muat()
    assert warna(t, 'navy') == '#051C2C' and warna(t, 'skala.air.4') == '#2F86D1'
    assert warna(t, 'arah.naik') == '#D9600B' and warna(t, 'tint.api.pita') == '#FBE7D6'
    # fixture negatif: tema rusak harus ditolak
    import copy
    for rusak, harap in (
        (lambda x: x['warna']['kategori']['nonalam'].update(hex='#3D6B5B') or x['warna']['kategori']['sosial'].update(hex='#3D6B5A'), 'CIEDE2000'),
        (lambda x: x['tipografi_docx']['isi'].update(ukuran_pt=7), 'batas bawah'),
        (lambda x: x['tipografi_docx']['isi'].update(warna='navi'), 'tidak terurai'),
        (lambda x: x['halaman']['margin_cm'].update(kiri=3.0), 'lebar isi'),
        (lambda x: x['grafik'].update(warna_rata_rata='#D9650B'), 'terlarang'),
        (lambda x: x['kajian']['air'].update(subjudul='A \u2014 B'), 'em dash'),
        (lambda x: x['ikon'].update(sekolah='lucide:sun'), 'glif'),
    ):
        x = copy.deepcopy(t)
        rusak(x)
        try:
            periksa(x)
        except AssertionError as e:
            assert harap in str(e), f'fixture "{harap}" ditolak dengan pesan lain: {e}'
        else:
            raise AssertionError(f'fixture negatif "{harap}" lolos, validator rusak')


if __name__ == '__main__':
    _uji_diri()
    hasil = periksa(muat(sys.argv[1] if len(sys.argv) > 1 else None))
    print('tema.json lolos:', json.dumps(hasil, ensure_ascii=False))
