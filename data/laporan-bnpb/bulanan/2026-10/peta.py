"""Peta deck Laporan Bencana Oktober 2026, gaya tangkapan layar pemilik (pil nama + status, garis penunjuk, sisipan se-Indonesia).

python peta.py  -> <proyek>/petanya/{karhutla,banjir,cuaca,geologi}.png + manifest .json
Angka tidak ditulis di gambar; angka tampil di kartu legenda dan tabel slide (token registri).
"""
import json, glob, os, math, hashlib, shutil
from PIL import Image, ImageDraw, ImageFont, ImageFilter

HOME = os.path.expanduser('~').replace(chr(92), '/') + '/'
SK = HOME + '.claude/skills/ppt-konsultan/bnpb/assets/'
P = SK + 'proyek-bulanan/'
GK, GP = SK + 'proyek-bnpb/geo/kabupaten/', SK + 'proyek-bnpb/geo/provinsi.json'
LB = P + 'data/lb/'
SS = 2
NAVY = '#24384F'
TANAH, LUAR, GARIS = '#E3E8EF', '#EEF1F5', '#FFFFFF'
WARNA = {'merah': '#C8102E', 'biru': '#2F86D1', 'abu': '#7F93AA', 'oranye': '#D9600B', 'emas': '#A07A32', 'coklat': '#8A4B2A',
         'api1': '#FBE7D6', 'api2': '#F4C3A0', 'api3': '#E8894A', 'api4': '#D9600B', 'api5': '#8F3F07'}
TINT = {'merah': '#FBE3E6', 'biru': '#DCEBF8', 'abu': '#EEF1F5', 'oranye': '#FBE7D6', 'emas': '#F4ECDC', 'coklat': '#F1E4DC',
        'api5': '#FBE7D6', 'api4': '#FBE7D6', 'api3': '#FBE7D6'}
ALIAS = {'Pangkajene Dan Kepulauan': 'Pangkajene Kepulauan', 'Kota Parepare': 'Kota Pare Pare'}
F = lambda s, b=True: ImageFont.truetype(SK + 'fonts/Roboto-' + ('Bold' if b else 'Medium') + '.ttf', int(s * SS))
rings = lambda g: [g['coordinates']] if g['type'] == 'Polygon' else g['coordinates']

KAB, KABP = {}, {}
for f_ in sorted(glob.glob(GK + '*.json')):
    kp = os.path.basename(f_)[:2]
    for ft in json.load(open(f_, encoding='utf-8'))['features']:
        KAB[ft['properties']['kab']] = ft['geometry']
        KABP[ft['properties']['kab']] = kp
PROV = {ft['properties']['kode']: ft['geometry'] for ft in json.load(open(GP, encoding='utf-8'))['features']}


def geom_kab(nama):
    return KAB.get(ALIAS.get(nama, nama))


def pusat(g):
    """titik dalam poligon terbesar (pusat luas sederhana)."""
    best, la = None, 0
    for q in rings(g):
        r = q[0]
        A = sum(r[i][0] * r[i - 1][1] - r[i - 1][0] * r[i][1] for i in range(len(r))) / 2
        if abs(A) > la:
            la, best = abs(A), r
    cx = sum(p[0] for p in best) / len(best)
    cy = sum(p[1] for p in best) / len(best)
    return cx, cy


class Peta:
    def __init__(s, lon0, lon1, lat0, lat1, pw, k=3.6):
        s.k = k   # piksel per pt di slide: ukuran huruf ditulis dalam pt
        s.e = (lon0, lon1, lat0, lat1)
        s.PW = pw
        s.PH = int(pw * (lat1 - lat0) / (lon1 - lon0))
        s.im = Image.new('RGB', (s.PW * SS, s.PH * SS), '#FFFFFF')
        s.d = ImageDraw.Draw(s.im)

    def X(s, o): return (o - s.e[0]) / (s.e[1] - s.e[0]) * s.PW * SS
    def Y(s, a): return (s.e[3] - a) / (s.e[3] - s.e[2]) * s.PH * SS

    def poli(s, g, isi, garis=GARIS, lebar=1):
        for q in rings(g):
            pts = [(s.X(c[0]), s.Y(c[1])) for c in q[0]]
            if len(pts) > 2:
                s.d.polygon(pts, fill=isi, outline=garis, width=lebar)

    def dasar(s, prov_fokus=None, tingkat='kab'):
        if tingkat == 'prov':
            for k, g in PROV.items():
                s.poli(g, TANAH, GARIS, 2 * SS)
            return
        for nm, g in KAB.items():
            s.poli(g, TANAH if (prov_fokus is None or KABP[nm] in prov_fokus) else LUAR, GARIS, 1)

    def bayang(s, x0, y0, x1, y1, rad, isi='#FFFFFF', tepi=None):
        t = 22 * SS
        w, h = int(x1 - x0), int(y1 - y0)
        m = Image.new('L', (w + 2 * t, h + 2 * t), 0)
        ImageDraw.Draw(m).rounded_rectangle([t, t, t + w, t + h], radius=rad, fill=70)
        m = m.filter(ImageFilter.GaussianBlur(6 * SS))
        s.im.paste(Image.new('RGB', m.size, NAVY), (int(x0) - t, int(y0) - t + 3 * SS), m)
        s.d.rounded_rectangle([x0, y0, x1, y1], radius=rad, fill=isi, outline=tepi, width=(2 * SS if tepi else 0))

    def pil(s, cx, cy, nama, status, w_tok, sisi='tengah'):
        """pil bertint: bulatan berwarna + nama tebal + status berwarna. Kembalikan kotak."""
        f1, f2 = F(9 * s.k), F(7.5 * s.k, False)
        tw = s.d.textlength(nama, font=f1) + (s.d.textlength('  ' + status, font=f2) if status else 0)
        h = 19 * s.k * SS
        w = tw + h + 8 * s.k * SS
        x0 = cx - w / 2 if sisi == 'tengah' else (cx if sisi == 'kiri' else cx - w)
        y0 = cy - h / 2
        s.bayang(x0, y0, x0 + w, y0 + h, h / 2, TINT.get(w_tok, '#FFFFFF'))
        r = h / 2 - 5 * SS
        bx, by = x0 + h / 2, cy
        s.d.ellipse([bx - r, by - r, bx + r, by + r], fill=WARNA[w_tok])
        if not status:          # pil tanpa status: bulatan polos
            pass
        elif w_tok in ('merah', 'oranye'):   # tanda seru dalam segitiga
            s.d.polygon([(bx, by - r * .62), (bx - r * .62, by + r * .45), (bx + r * .62, by + r * .45)], outline='#FFFFFF', width=2 * SS)
            s.d.line([(bx, by - r * .22), (bx, by + r * .12)], fill='#FFFFFF', width=2 * SS)
        else:                  # rumah
            s.d.polygon([(bx, by - r * .55), (bx - r * .55, by - r * .05), (bx + r * .55, by - r * .05)], fill='#FFFFFF')
            s.d.rectangle([bx - r * .38, by - r * .05, bx + r * .38, by + r * .5], fill='#FFFFFF')
        tx = x0 + h - 1 * s.k * SS
        s.d.text((tx, cy), nama, font=f1, fill=NAVY, anchor='lm')
        if status:
            s.d.text((tx + s.d.textlength(nama, font=f1), cy), '  ' + status, font=f2, fill=WARNA[w_tok], anchor='lm')
        return x0, y0, x0 + w, y0 + h

    def titik(s, x, y, w_tok='merah'):
        r = 2.4 * s.k * SS
        s.d.ellipse([x - r, y - r, x + r, y + r], fill=NAVY, outline='#FFFFFF', width=int(0.6 * s.k * SS))

    def kolom(s, item, sisi, y0, y1, tepi_x):
        """item: (nama, status, w_tok, ax, ay). Pil disusun satu kolom; garis ke jangkar."""
        item = sorted(item, key=lambda t: t[4])
        gap = 24 * s.k * SS
        ys = [min(max(t[4], y0), y1) for t in item]
        for _ in range(300):
            for i in range(len(ys) - 1):
                if ys[i + 1] - ys[i] < gap:
                    g = (gap - (ys[i + 1] - ys[i])) / 2
                    ys[i] -= g
                    ys[i + 1] += g
            ys = [min(max(y, y0), y1) for y in ys]
        for i, (nm, st, w, ax, ay) in enumerate(item):
            y = ys[i]
            kotak = s.pil(tepi_x, y, nm, st, w, 'kiri' if sisi == 'l' else 'kanan')
            ujung = kotak[2] if sisi == 'l' else kotak[0]
            s.d.line([(ujung, y), (ax, ay)], fill=NAVY, width=int(0.7 * s.k * SS))
            s.titik(ax, ay)
            s.pil(tepi_x, y, nm, st, w, 'kiri' if sisi == 'l' else 'kanan')   # gambar ulang di atas garis

    def pita(s, item, y, x0, x1):
        """pil berjajar mendatar di satu baris (laut), garis ke jangkar; posisi x didorong agar tidak bertumpuk."""
        item = sorted(item, key=lambda t: t[3])
        f1, f2 = F(9 * s.k), F(7.5 * s.k, False)
        lebar = [s.d.textlength(t[0], font=f1) + (s.d.textlength('  ' + t[1], font=f2) if t[1] else 0) + 27 * s.k * SS for t in item]
        xs = [min(max(t[3], x0 + w / 2), x1 - w / 2) for t, w in zip(item, lebar)]
        for _ in range(200):
            for i in range(len(xs) - 1):
                ruang = (lebar[i] + lebar[i + 1]) / 2 + 4 * s.k * SS
                if xs[i + 1] - xs[i] < ruang:
                    g = (ruang - (xs[i + 1] - xs[i])) / 2
                    xs[i] -= g
                    xs[i + 1] += g
            xs = [min(max(x, x0 + w / 2), x1 - w / 2) for x, w in zip(xs, lebar)]
        for (nm, st, w, ax, ay), x in zip(item, xs):
            s.d.line([(x, y), (ax, ay)], fill=NAVY, width=int(0.7 * s.k * SS))
            s.titik(ax, ay)
        for (nm, st, w, ax, ay), x in zip(item, xs):
            s.pil(x, y, nm, st, w)

    def sisipan(s, kotak_px, sorot, titik_luar=(), judul='Se-Indonesia'):
        x0, y0, x1, y1 = kotak_px
        s.bayang(x0, y0, x1, y1, 12 * SS)
        s.d.text((x0 + 5 * s.k * SS, y0 + 7 * s.k * SS), judul, font=F(8 * s.k), fill=NAVY, anchor='lm')
        L0, L1, A0, A1 = 94.6, 141.4, -11.4, 6.5
        ip = 10 * SS
        iw, ih = x1 - x0 - 2 * ip, y1 - y0 - 14 * s.k * SS - ip
        IX = lambda o: x0 + ip + (o - L0) / (L1 - L0) * iw
        IY = lambda a: y0 + 13 * s.k * SS + (A1 - a) / (A1 - A0) * ih
        for k, g in PROV.items():
            for q in rings(g):
                pts = [(IX(c[0]), IY(c[1])) for c in q[0][::3]]
                if len(pts) > 2:
                    s.d.polygon(pts, fill='#DCE3EB')
        a, b, c, d_ = s.e
        s.d.rectangle([IX(a), IY(d_), IX(b), IY(c)], outline=NAVY, width=2 * SS)
        for lon, lat, w in titik_luar:
            x, y = IX(lon), IY(lat)
            s.d.ellipse([x - 5 * SS, y - 5 * SS, x + 5 * SS, y + 5 * SS], fill=WARNA[w], outline='#FFFFFF', width=1 * SS)

    def skala(s, lon, lat):
        km = 111.32 * math.cos(math.radians(lat))
        px = 100 / km / (s.e[1] - s.e[0]) * s.PW * SS
        x0, y0 = s.X(lon), s.Y(lat)
        ax, k = x0 + 3 * s.k * SS, s.k * SS
        s.d.polygon([(ax, y0 - 30 * k), (ax - 3.5 * k, y0 - 20 * k), (ax + 3.5 * k, y0 - 20 * k)], fill=NAVY)
        s.d.text((ax, y0 - 15 * k), 'U', font=F(8 * s.k), fill=NAVY, anchor='mm')
        s.d.line([(x0, y0), (x0 + px, y0)], fill=NAVY, width=3 * SS)
        s.d.line([(x0, y0 - 5 * SS), (x0, y0 + 5 * SS)], fill=NAVY, width=2 * SS)
        s.d.line([(x0 + px, y0 - 5 * SS), (x0 + px, y0 + 5 * SS)], fill=NAVY, width=2 * SS)
        s.d.text((x0 + px / 2, y0 - 5 * s.k * SS), '100 km', font=F(7.5 * s.k, False), fill=NAVY, anchor='mm')

    def simpan(s, nama, masukan):
        im = s.im.resize((s.PW, s.PH), Image.LANCZOS)
        png = P + f'petanya/{nama}.png'
        im.save(png, optimize=True)
        mas = P + f'petanya/{nama}-masukan.json'
        json.dump(masukan, open(mas, 'w', encoding='utf-8'), ensure_ascii=False)
        sha = hashlib.sha256(open(mas, 'rb').read()).hexdigest()
        json.dump({'unsur_peta': {'sumber_batas': 'Batas kab/kota dan provinsi BIG', 'sistem_referensi': 'WGS 84', 'proyeksi': 'ekuirektangular',
                                  'catatan': 'Batas wilayah bukan rujukan resmi'}, 'masukan': {f'{nama}-masukan.json': sha}},
                  open(P + f'petanya/{nama}.json', 'w', encoding='utf-8'), ensure_ascii=False)
        print(nama, im.size)


K = json.load(open(LB + 'kab_kelompok.json', encoding='utf-8'))
ST = {'banjir': {'belum': ('Belum surut', 'merah'), 'selesai': ('Sudah surut', 'biru'), 'tanpa': ('', 'abu')},
      'karhutla': {'belum': ('Belum padam', 'merah'), 'selesai': ('Sudah padam', 'biru'), 'tanpa': ('', 'abu')}}


def jangkar(pt, nama):
    g = geom_kab(nama)
    if not g:
        print('tanpa geometri:', nama)
        return None
    lon, lat = pusat(g)
    return pt.X(lon), pt.Y(lat), lon, lat


# ---------------- 1. Karhutla: koroplet titik panas per provinsi (sistem) + pil 8 provinsi teratas ----------------
def karhutla():
    T = json.load(open(LB + 'kh_prov_titik.json', encoding='utf-8'))
    amb = [2000, 8000, 20000, 60000]
    kelas = lambda v: 'api1' if v < amb[0] else 'api2' if v < amb[1] else 'api3' if v < amb[2] else 'api4' if v < amb[3] else 'api5'
    pt = Peta(94.0, 141.6, -14.2, 8.6, 2400, k=3.5)
    for k, g in PROV.items():
        v = T.get(k, 0)
        pt.poli(g, WARNA[kelas(v)] if v else TANAH, GARIS, 2 * SS)
    nama_prov = {}
    import csv
    for r in csv.DictReader(open(LB + 'kh_prov.csv', encoding='utf-8')):
        nama_prov[r['kode']] = r['provinsi']
    top = sorted(T.items(), key=lambda x: -x[1])[:8]
    atas, bawah = [], []
    for k, v in top:
        lon, lat = pusat(PROV[k])
        it = (nama_prov.get(k, k), '', kelas(v), pt.X(lon), pt.Y(lat))
        (atas if lat > -1.6 else bawah).append(it)
    pt.pita(atas, pt.Y(7.0), 30 * SS, pt.PW * SS - 30 * SS)
    pt.pita(bawah, pt.Y(-12.4), 30 * SS, pt.PW * SS - 30 * SS)
    pt.skala(95.0, -8.8)
    pt.simpan('karhutla', {'titik_prov': T, 'ambang': amb})
    return amb


# ---------------- 2. Banjir dan longsor: Sumatera bagian utara, sisipan untuk Jawa dan Papua ----------------
def banjir():
    pt = Peta(94.7, 101.6, -1.6, 6.15, 1500, k=4.0)
    pt.dasar(prov_fokus={'11', '12', '13', '14', '21'})
    rows = K['banjir']
    lon0, lon1, lat0, lat1 = pt.e
    dalam, luar = [], []
    for r in rows:
        g = geom_kab(r['kab'])
        if not g:
            continue
        lab, w = ST['banjir'][r['status']]
        pt.poli(g, WARNA[w] if w != 'abu' else '#9FB0C4', GARIS, 1)
        lon, lat = pusat(g)
        (dalam if lon0 < lon < lon1 and lat0 < lat < lat1 else luar).append((r, lon, lat, w))
    for r in K['longsor']:
        g = geom_kab(r['kab'])
        if g:
            lon, lat = pusat(g)
            if lon0 < lon < lon1 and lat0 < lat < lat1 and r['kab'] not in [x[0]['kab'] for x in dalam]:
                pt.poli(g, WARNA['coklat'], GARIS, 1)
    # pil: 12 kab teratas (terdampak) di dalam bingkai, kolom kiri dan kanan
    pilih = sorted(dalam, key=lambda t: (-(t[0]['status'] != 'tanpa'), -t[0]['tdm']))[:10]
    item = []
    for r, lon, lat, w in pilih:
        lab, w = ST['banjir'][r['status']]
        item.append((r['kab'], lab, w, pt.X(lon), pt.Y(lat)))
    item.sort(key=lambda t: t[3])
    tengah = (pt.X(97.9))
    kiri = [t for t in item if t[3] < tengah]
    kanan = [t for t in item if t[3] >= tengah]
    k = pt.k * SS
    pt.kolom(kiri, 'l', 14 * k, pt.PH * SS * .75, 4 * k)
    pt.kolom(kanan, 'r', pt.PH * SS * .30, pt.PH * SS - 14 * k, pt.PW * SS - 4 * k)
    W_, H_ = pt.PW * SS, pt.PH * SS
    pt.sisipan((W_ - 118 * k, 4 * k, W_ - 4 * k, 4 * k + 62 * k),
               None, [(lon, lat, w) for r, lon, lat, w in luar])
    pt.skala(94.95, -1.35)
    pt.simpan('banjir', {'banjir': rows, 'longsor': K['longsor']})
    return len(dalam), len(luar)


# ---------------- 3 dan 4. Nasional: titik kab per jenis, pil di pita laut atas dan bawah ----------------
GA = [('Gn. Anak Krakatau', 105.423, -6.102), ('Gn. Merapi', 110.446, -7.541), ('Gn. Semeru', 112.922, -8.108)]   # Level III Siaga, PVMBG 1 Nov 2026


def nasional(nama, grup, n_pita=6, gunung=False):
    """grup: [(kelompok, w_tok)]; warna = jenis bencana (kartu legenda), pil tanpa teks status."""
    pt = Peta(94.0, 127.6, -11.8, 7.6, 2200, k=3.1)
    pt.dasar(tingkat='prov')
    atas, bawah, masuk = [], [], {}
    for kel, w in grup:
        for r in K[kel]:
            g = geom_kab(r['kab'])
            if not g:
                continue
            pt.poli(g, WARNA[w], GARIS, 1)
            lon, lat = pusat(g)
            masuk.setdefault(kel, []).append(r)
            if any(t[0] == r['kab'] for t in atas + bawah):
                continue
            it = (r['kab'], '', w, pt.X(lon), pt.Y(lat), r)
            (atas if lat > -4.2 else bawah).append(it)
    pilih = lambda xs: sorted(xs, key=lambda t: -(t[5]['tdm'] + 10 * t[5]['rumah'] + 100 * t[5]['kej']))[:n_pita]
    atas, bawah = [t[:5] for t in pilih(atas)], [t[:5] for t in pilih(bawah)]
    if gunung:
        bawah = [t for t in bawah if t[0] not in ('Pandeglang',)]
        for nm, lon, lat in GA:
            x, y = pt.X(lon), pt.Y(lat)
            r = 4.2 * pt.k * SS
            pt.d.polygon([(x, y - r), (x - r * .95, y + r * .7), (x + r * .95, y + r * .7)], fill=WARNA['oranye'], outline='#FFFFFF')
            bawah.append((nm, 'Siaga', 'oranye', x, y))
    pt.pita(atas, pt.Y(6.6), 24 * SS, pt.PW * SS - 24 * SS)
    pt.pita(bawah, pt.Y(-10.8), 24 * SS, pt.PW * SS - 24 * SS)
    pt.skala(95.0, -8.6)
    pt.simpan(nama, masuk)


if __name__ == '__main__':
    os.makedirs(P + 'petanya', exist_ok=True)
    print('ambang karhutla', karhutla())
    print('banjir dalam/luar', banjir())
    nasional('cuaca', [('cuaca', 'emas'), ('kekeringan', 'oranye')], n_pita=7)
    nasional('geologi', [('gempa', 'coklat'), ('erupsi', 'merah')], gunung=True)
