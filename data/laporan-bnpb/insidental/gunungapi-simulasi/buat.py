"""Templat Laporan Insidental Erupsi Gunung Api (Simulasi), dibuat 12 Nov 2026.

Halaman 1 NYATA: status semua gunung api dari laporan pagi PVMBG 8 Nov 2026 pukul 06.00 WIB (harian-2026-11-08/wa-pvmbg.txt;
jumlah per level sama dengan laporan 9 Nov). Teks WA hanya menyebut nama gunung Level III; daftar Level II diambil dari status
MAGMA (public/banjir/data/gunungapi_status.json, 10 Nov) dan dikembalikan ke keadaan 8 Nov memakai perubahan level 10 Nov
(public/gunungapi/data/perubahan_level.json: Bur Ni Telong turun 2 ke 1, Gamkonora naik 1 ke 2). Versi 19 Okt di git sama.

Halaman 2-6 SIMULASI (data contoh untuk uji format): Merapi naik dari Level III ke Level IV. Tiap halaman berpita
"SIMULASI, data contoh" dan sumbernya diawali "Data contoh (simulasi);". Penduduk nyata: piksel WorldPop 1 km di
public/gunungapi/data/pop/merapi.json, zona KRB PVMBG 2018 di paparan_geo.json, batas kecamatan public/geo/kecamatan.
Zona bahaya radius 10 km, arah awan panas, sebaran abu, status bandara, pengungsi, dan kebutuhan adalah rekaan.

    python buat.py          # isi.pptx -> deck.py (sampul, daftar isi, tab bagian, penutup) -> PPTX + PDF
    python buat.py --isi    # hanya slide isi
"""
import importlib.util, json, math, os, sys
from collections import defaultdict
from datetime import date

from pptx.enum.shapes import MSO_SHAPE
from PIL import Image, ImageDraw

SINI = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(SINI, '..', '..', '..', '..'))
LB = os.path.join(REPO, 'data', 'laporan-bnpb')
PUB = os.path.join(REPO, 'public')
NAMA = 'Laporan Insidental Erupsi Gunung Api (Simulasi)'

_s = importlib.util.spec_from_file_location('bl', os.path.join(LB, 'mingguan/2026-11-09/banjir-longsor', 'buat.py'))
BL = importlib.util.module_from_spec(_s); _s.loader.exec_module(BL)
BL.B.SINI = SINI   # ikon ditulis ke folder deck ini, bukan ke folder acuan
os.makedirs(os.path.join(SINI, 'bahan', 'ikon'), exist_ok=True)
R, ikon, judul, tabel, kepala_panel, rt, f0 = BL.R, BL.ikon, BL.judul, BL.tabel, BL.kepala_panel, BL.rt, BL.f0
sys.path.insert(0, os.path.join(LB, 'generator'))

TEKS, NAVY, ORANYE, MERAH, PUTIH = '1A1A1A', '051C2C', 'D9600B', 'C8102E', 'FFFFFF'
BIRU, BIRU_TUA, PITA_BIRU, PITA_MERAH, KAB_TINT = '68A8E0', '1B5A93', 'DCEBF8', 'F8DDE0', 'EEF5FC'
TEKS2, TEKS3, GARIS, GARIS_PANAH = '2E3440', '6B7280', 'BFC5CC', '7A8699'
SIAGA_W, WASPADA_W, NORMAL_W, PITA_ORANYE, PITA_KUNING, PITA_ABU = 'E8894A', 'C9A227', 'A9B4C2', 'FBE7D6', 'F4ECDC', 'E6EAF0'
RGBA = lambda h, a=255: tuple(int(h[i:i + 2], 16) for i in (0, 2, 4)) + (a,)
DARAT = (0xDC, 0xE3, 0xEB, 255)

SIM = 'Data contoh (simulasi); '
MERAPI = (110.442, -7.542)   # gunung.json / gunungapi_status.json
KM_LAT = 110.574
KM_LON = 111.320 * math.cos(math.radians(MERAPI[1]))


def jarak(lon, lat, o=MERAPI):
    return math.hypot((lat - o[1]) * KM_LAT, (lon - o[0]) * KM_LON)


def arah(lon, lat, o=MERAPI):
    return math.degrees(math.atan2((lon - o[0]) * KM_LON, (lat - o[1]) * KM_LAT)) % 360


def titik_arah(bearing, km, o=MERAPI):
    return (o[0] + km * math.sin(math.radians(bearing)) / KM_LON, o[1] + km * math.cos(math.radians(bearing)) / KM_LAT)


def fbulat(v, n=10):
    return f0(int(round(v / n)) * n)


# ======================================================================== geometri
def _dalam(x, y, r):
    c, j = False, len(r) - 1
    for i in range(len(r)):
        xi, yi = r[i][0], r[i][1]; xj, yj = r[j][0], r[j][1]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi:
            c = not c
        j = i
    return c


def poligon(g):
    return g['coordinates'] if g['type'] == 'MultiPolygon' else [g['coordinates']]


def di_dalam(g, x, y):
    return any(_dalam(x, y, p[0]) and not any(_dalam(x, y, h) for h in p[1:]) for p in poligon(g))


def pusat_geom(g):
    best = max((p[0] for p in poligon(g)), key=lambda r: abs(BL._luas(r)))
    a = BL._luas(best); cx = cy = 0
    for (x0, y0), (x1, y1) in zip(best, best[1:] + best[:1]):
        c = x0 * y1 - x1 * y0; cx += (x0 + x1) * c; cy += (y0 + y1) * c
    return cx / (6 * a), cy / (6 * a)


def muat(p):
    return json.load(open(os.path.join(PUB, p), encoding='utf-8'))


KEC = [(f['properties']['kab'], f['properties']['kec'], f['geometry']) for kp in ('33', '34') for f in muat(f'geo/kecamatan/{kp}.json')['features']]
KAB = [(kp, f['properties']['kab'], f['geometry']) for kp in ('33', '34') for f in muat(f'geo/kabupaten/{kp}.json')['features']]
KRB = muat('gunungapi/data/paparan_geo.json')['merapi']['zona']


class Peta:
    """Kanvas PNG peta: ext = (lon0, lon1, lat_atas, lat_bawah), ditempel di slide pada (x, y, w, h) pt."""
    def __init__(self, ext, x, y, w, h, skala=5):
        self.ext, self.x, self.y, self.w, self.h = ext, x, y, w, h
        self.W, self.H = int(w * skala), int(h * skala)
        self.im = Image.new('RGBA', (self.W, self.H), (0, 0, 0, 0))

    def px(self, lon, lat):
        lon0, lon1, la1, la0 = self.ext
        return (lon - lon0) / (lon1 - lon0) * self.W, (la1 - lat) / (la1 - la0) * self.H

    def pt(self, lon, lat):
        a, b = self.px(lon, lat)
        return self.x + a / self.W * self.w, self.y + b / self.H * self.h

    def km_pt(self, km):
        return km / KM_LON / (self.ext[1] - self.ext[0]) * self.w

    def lapis(self, gambar):
        """gambar(draw) di lapisan baru lalu ditumpuk (alpha)."""
        L = Image.new('RGBA', (self.W, self.H), (0, 0, 0, 0))
        gambar(ImageDraw.Draw(L))
        self.im = Image.alpha_composite(self.im, L)

    def poligon(self, dr, g, isi=None, garis=None, tebal=2):
        for p in poligon(g):
            pts = [self.px(x, y) for x, y in p[0]]
            if max(q[0] for q in pts) < 0 or min(q[0] for q in pts) > self.W or max(q[1] for q in pts) < 0 or min(q[1] for q in pts) > self.H:
                continue
            if isi:
                dr.polygon(pts, fill=isi)
                for h in p[1:]:
                    dr.polygon([self.px(x, y) for x, y in h], fill=(0, 0, 0, 0))
            if garis:
                dr.line(pts + pts[:1], fill=garis, width=tebal)

    def lingkaran(self, dr, km, warna, tebal=4, putus=False):
        n = 180
        pts = [self.px(*titik_arah(i * 360 / n, km)) for i in range(n + 1)]
        for i in range(n):
            if not putus or i % 4 < 2:
                dr.line([pts[i], pts[i + 1]], fill=warna, width=tebal)

    def simpan(self, nama, k):
        p = os.path.join(SINI, 'bahan', nama)
        self.im.save(p)
        k.gambar(p, self.x, self.y, self.w, self.h)


def peta_kec(P, warna_kec, tebal_kab=5):
    """Dasar peta kecamatan Jawa Tengah dan DIY: isi per kecamatan, batas kecamatan putih, batas kabupaten abu tebal."""
    def g(dr):
        for kb, kc, gm in KEC:
            P.poligon(dr, gm, isi=RGBA(warna_kec[(kb, kc)]) if (kb, kc) in warna_kec else DARAT, garis=(255, 255, 255, 255), tebal=2)
    P.lapis(g)
    P.lapis(lambda dr: [P.poligon(dr, gm, garis=RGBA('8C9AA8'), tebal=tebal_kab) for _, _, gm in KAB])


def segitiga(dr, x, y, s, isi, garis=(255, 255, 255, 255), tebal=2):
    pts = [(x, y - s * 0.62), (x - s * 0.55, y + s * 0.38), (x + s * 0.55, y + s * 0.38)]
    dr.polygon(pts, fill=isi)
    dr.line(pts + pts[:1], fill=garis, width=tebal)


def panah(dr, P, bearing, km, warna, tebal=9):
    a = P.px(*MERAPI); b = P.px(*titik_arah(bearing, km))
    dr.line([a, b], fill=warna, width=tebal)
    ang = math.atan2(b[1] - a[1], b[0] - a[0]); s = tebal * 3.2
    dr.polygon([b, (b[0] - s * math.cos(ang - 0.45), b[1] - s * math.sin(ang - 0.45)),
                (b[0] - s * math.cos(ang + 0.45), b[1] - s * math.sin(ang + 0.45))], fill=warna)


# ======================================================================== alat slide
def pita_simulasi(k, y=99.5):
    """Pita wajib di tiap halaman data contoh."""
    k.bulat(43.2, y, 873.6, 15, PITA_MERAH, radius=3)
    k.kotak(46, y + 2, 11, 11, MERAH, bentuk=MSO_SHAPE.OVAL)
    k.gambar(ikon('peringatan'), 47.9, y + 3.9, 7.2, 7.2)
    k.teks(62, y, 850, 15, [R('SIMULASI, data contoh. ', 8.5, MERAH, True),
                            R('Kejadian dan angka di halaman ini rekaan untuk menguji format laporan.', 8, TEKS2, True)],
           bungkus=False)


def pil_peta(k, x, y, nama, status, isi, titik_w, titik, konsep='gunungapi', w_maks=None):
    """Label pil berikon + garis penunjuk ke titik (pola label_peta deck acuan, tanpa batas kolom tabel)."""
    lebar = ((len(nama) + 0.3 * sum(c.isupper() for c in nama)) * 9 + len(status) * 7.5) * 0.53 + 28
    tx, ty = titik
    if tx < x or tx > x + lebar:
        ax, ay = (x + lebar if tx > x + lebar else x), y + 7.9
    else:
        ax, ay = tx, (y + 15.8 if ty > y + 15.8 else y)
    if abs(ax - tx) + abs(ay - ty) > 4:
        k.garis(ax, ay, tx, ty, GARIS_PANAH, 0.75)
    k.bulat(x, y, lebar, 15.8, isi)
    k.kotak(x + 2.2, y + 2.2, 11.5, 11.5, titik_w, bentuk=MSO_SHAPE.OVAL)
    k.gambar(ikon(konsep), x + 4, y + 4, 7.9, 7.9)
    k.teks(x + 17.3, y, lebar - 18, 15.8, [R(nama, 9, TEKS, True), R('  ' + status, 7.5, titik_w if titik_w != SIAGA_W else ORANYE, True)],
           bungkus=False)


def kartu_w(k, x, y, w, nilai, label, isi, bulat, konsep, h=30):
    k.bulat(x, y, w, h, isi, radius=4)
    k.kotak(x + 5, y + (h - 18) / 2, 18, 18, bulat, bentuk=MSO_SHAPE.OVAL)
    k.gambar(ikon(konsep), x + 8.2, y + (h - 18) / 2 + 3.2, 11.5, 11.5)
    k.teks(x + 28, y + 3, w - 30, 14, [R(str(nilai), 12, NAVY, True)], bungkus=False)
    k.teks(x + 28, y + 17, w - 30, 10, [R(label, 7, TEKS)], bungkus=False)


def kotak_legenda(k, x, y, w, butir, judul_l=None):
    """butir = [(jenis, warna, teks)], jenis 'kotak' | 'garis' | 'putus' | 'segitiga' | 'bulat'."""
    h = 9 + (11 if judul_l else 0) + 11 * len(butir)
    k.bulat(x, y, w, h, PUTIH, 'CBD3DE', radius=3)
    yy = y + 3
    if judul_l:
        k.teks(x + 5, yy, w - 8, 10, [R(judul_l, 7, TEKS, True)], bungkus=False); yy += 11
    for jenis, warna, teks in butir:
        if jenis == 'kotak':
            k.kotak(x + 5, yy + 2, 10, 7, warna)
        elif jenis == 'garis':
            k.kotak(x + 5, yy + 4.5, 10, 1.6, warna)
        elif jenis == 'putus':
            k.kotak(x + 5, yy + 4.5, 4, 1.6, warna); k.kotak(x + 11, yy + 4.5, 4, 1.6, warna)
        elif jenis == 'segitiga':
            k.kotak(x + 6, yy + 1.5, 8, 7.5, warna, bentuk=MSO_SHAPE.ISOSCELES_TRIANGLE)
        elif jenis == 'bulat':
            k.kotak(x + 6.5, yy + 2, 7, 7, warna, PUTIH, bentuk=MSO_SHAPE.OVAL)
        k.teks(x + 19, yy, w - 22, 11, [R(teks, 7, TEKS)], bungkus=False)
        yy += 11
    return y + h


def utara_skala(k, x, y, km_pt, label):
    k.kotak(x + 7, y, 8.6, 12.2, NAVY, bentuk=MSO_SHAPE.ISOSCELES_TRIANGLE)
    k.teks(x, y + 13, 23, 9.4, [R('U', 8, NAVY, True)], rata='c', bungkus=False)
    k.kotak(x + 30, y + 17.5, km_pt, 1.2, NAVY)
    k.teks(x + 30, y + 5, max(40, km_pt), 10.8, [R(label, 8, NAVY, True)], rata='c' if km_pt >= 40 else 'l', bungkus=False)


def pil_status(k, x, y, w, h, teks, isi, bulat, konsep, warna_teks=TEKS, pt=8):
    k.bulat(x, y, w, h, isi)
    d = h - 3
    k.kotak(x + 1.5, y + 1.5, d, d, bulat, bentuk=MSO_SHAPE.OVAL)
    g = d * 0.64
    k.gambar(ikon(konsep), x + 1.5 + (d - g) / 2, y + 1.5 + (d - g) / 2, g, g)
    k.teks(x + d + 2, y, w - d - 4, h, [R(teks, pt, warna_teks, True)], rata='c', bungkus=False)


# ======================================================================== data NYATA: status gunung api 8 Nov 2026 06.00 WIB
def status_8nov():
    teks = open(os.path.join(LB, 'harian/2026-11/2026-11-08', 'wa-pvmbg.txt'), encoding='utf-8').read()
    import re
    m = re.search(r'(\d+) \([^)]*\) gunung api pada Level IV.*?(\d+) \([^)]*\) gunung api pada Level III.*?(\d+) \([^)]*\) gunung api pada Level II'
                  r'.*?(\d+) \([^)]*\) gunung api pada Level I \(', teks, re.S)
    jumlah = {4: int(m[1]), 3: int(m[2]), 2: int(m[3]), 1: int(m[4])}
    siaga_wa = re.findall(r'^\*Gn\. ([^*]+)\*', teks, re.M)
    st = muat('banjir/data/gunungapi_status.json')
    level = {g['nama']: g['level'] for g in st['gunung']}
    for b in muat('gunungapi/data/perubahan_level.json')['baris']:   # kembalikan perubahan sesudah 8 Nov
        if b['tanggal'] > '2026-11-08' and b['jenis'] == 'perubahan':
            assert level[b['gunung']] == b['ke'], b
            level[b['gunung']] = b['dari']
    hit = {lv: sum(1 for v in level.values() if v == lv) for lv in (1, 2, 3, 4)}
    assert hit == jumlah, (hit, jumlah)
    assert sorted(siaga_wa) == sorted(n for n, v in level.items() if v == 3), siaga_wa
    gn = muat('gunungapi/data/gunung.json')
    return jumlah, level, gn


SIAGA_RINCI = {   # dari wa-pvmbg.txt 8 Nov 2026 (rekomendasi dan kegempaan)
    'Anak Krakatau': ('Lampung', 'Radius 5 km dari pusat erupsi; 1 km dari pulau baru di sektor barat laut dan tenggara',
                      '2 hembusan, 1 tremor menerus'),
    'Merapi': ('Jawa Tengah dan DIY', 'Sektor selatan-barat daya sampai 7 km, tenggara sampai 5 km; lontaran material 3 km',
               '11 guguran, 9 hybrid, 3 vulkanik dangkal'),
    'Semeru': ('Jawa Timur', 'Sektor tenggara sepanjang Besuk Kobokan 13 km; radius 5 km dari puncak',
               '20 letusan, 8 guguran, 6 hembusan'),
}
WARNA_LV = {4: MERAH, 3: SIAGA_W, 2: WASPADA_W, 1: NORMAL_W}


def s_status(Dk):
    jumlah, level, gn = status_8nov()
    s, k = Dk.slide(judul(f'Pada 8 November 2026 pukul 06.00 WIB tidak ada gunung api berstatus Awas; [{jumlah[3]}] gunung api '
                          f'berstatus Siaga dan [{jumlah[2]}] Waspada'))
    # peta Indonesia
    ext = (94.9, 131.2, 6.0, -10.0)   # busur gunung api (Bur Ni Telong sampai Banda Api); Papua tanpa gunung api terpantau
    P = Peta(ext, 43.2, 101, 470, 470 * (ext[2] - ext[3]) / (ext[1] - ext[0]), skala=5)
    base = os.path.join(SINI, 'bahan', 'dasar-indonesia.png')
    BL.gambar_peta(base, ext, (P.W, P.H), {}, BL.SEMUA_PROV, garis=1)
    P.im = Image.open(base).convert('RGBA')

    def tanda(dr):
        for lv in (1, 2, 3):
            for n, v in level.items():
                if v == lv:
                    x, y = P.px(gn[n]['lon'], gn[n]['lat'])
                    segitiga(dr, x, y, {1: 24, 2: 38, 3: 56}[lv], RGBA(WARNA_LV[lv]), (255, 255, 255, 255) if lv < 3 else RGBA(NAVY), 3)
    P.lapis(tanda)
    P.simpan('peta-status.png', k)
    POS = {'Anak Krakatau': (55, 270), 'Merapi': (196, 289), 'Semeru': (262, 236)}
    for n, (x, y) in POS.items():
        pil_peta(k, x, y, n, 'Siaga', PITA_ORANYE, SIAGA_W, P.pt(gn[n]['lon'], gn[n]['lat']))
    yk = P.y + P.h + 6
    w4 = (470 - 3 * 5) / 4
    for i, (lv, nm, isi) in enumerate(((4, 'Level IV (Awas)', PITA_MERAH), (3, 'Level III (Siaga)', PITA_ORANYE),
                                       (2, 'Level II (Waspada)', PITA_KUNING), (1, 'Level I (Normal)', PITA_ABU))):
        kartu_w(k, 43.2 + i * (w4 + 5), yk, w4, jumlah[lv], nm, isi, WARNA_LV[lv], 'gunungapi')
    # tabel Level III
    kol = [('LEVEL III (SIAGA)', 92, 'l'), ('ZONA BAHAYA MENURUT PVMBG', 228, 'l'), ('GEMPA (LAPORAN 8 NOV)', 150, 'l')]
    baris = []
    for n in sorted(x for x, v in level.items() if v == 3):
        prov, zona, gempa = SIAGA_RINCI[n]
        baris.append(('data', [('runs', [R(n, 9, TEKS, True), '\n', R(prov, 7.5, TEKS3)]), rt(zona, 8), rt(gempa, 8)]))
    tabel(k, 43.2, yk + 37, kol, baris, bawah=452, maks=34)
    # arti level (Permen ESDM 15/2011 lewat pedoman_krb.json)
    pk = muat('gunungapi/data/pedoman_krb.json')['level']
    for i, (lv, isi) in enumerate(((4, PITA_MERAH), (3, PITA_ORANYE), (2, PITA_KUNING), (1, PITA_ABU))):
        x = 43.2 + i * (w4 + 5)
        k.bulat(x, 458, w4, 42, isi, radius=4)
        k.teks(x + 6, 461, w4 - 10, 11, [R(f"Level {'I' * lv if lv < 4 else 'IV'} ({pk[str(lv)]['nama']})", 7.5, TEKS, True)], bungkus=False)
        k.teks(x + 6, 472, w4 - 10, 26, [R(pk[str(lv)]['bahaya'], 7, TEKS2)], jangkar='t')
    # tabel Level II: dua kolom 12 baris
    wasp = sorted((n for n, v in level.items() if v == 2))
    assert len(wasp) == 24
    kepala_panel(k, 528, 101, 388.8, f'Gunung api Level II (Waspada): {len(wasp)}', 'gunungapi')
    for j in range(2):
        kol = [('GUNUNG API', 84, 'l'), ('PROVINSI', 109.4, 'l')]
        rows = [('data', [('runs', [R(n, 8.5, TEKS, True), '\n', R(f"{f0(gn[n]['tinggi'])} mdpl", 7, TEKS3)]), rt(gn[n]['prov'], 8)], (500 - 156.6) / 12)
                for n in wasp[j * 12:(j + 1) * 12]]
        tabel(k, 528 + j * 195.4, 140, kol, rows, bawah=500)


# ======================================================================== SIMULASI: kronologi dan parameter
HARI = ['H-6', 'H-5', 'H-4', 'H-3', 'H-2', 'H-1', 'Hari H']
GEMPA = {'Hybrid': (WASPADA_W, [52, 58, 71, 96, 140, 210, 180]), 'Vulkanik dangkal': ('5B7A99', [5, 6, 9, 14, 22, 41, 38]),
         'Guguran': (BIRU, [9, 12, 15, 21, 30, 48, 95])}
APG_HARI = [0, 0, 0, 1, 2, 6, 14]
KRONO = [
    ('Sejak 5 Nov 2020', SIAGA_W, 'Data nyata PVMBG: Level III (Siaga), sektor bahaya selatan-barat daya sampai 7 km'),
    ('H-3', SIAGA_W, 'Gempa hybrid naik ke 96 kali per hari; jarak tunjam EDM (pengukur jarak elektronik) memendek 12 cm per hari'),
    ('H-1 21.40', SIAGA_W, 'Awan panas guguran pertama ke Kali Gendol sejauh 3 km; lava pijar teramati dari pos pengamatan Jrakah'),
    ('H 04.55', MERAH, 'Erupsi eksplosif: kolom abu 6.000 m di atas puncak, condong ke barat daya'),
    ('H 05.30', MERAH, 'PVMBG menaikkan status ke Level IV (Awas); zona bahaya diperluas menjadi radius 10 km dari puncak gunung'),
    ('H 09.10', MERAH, 'Awan panas beruntun: Gendol 7 km, Krasak 6,5 km, Boyong 5,5 km; hujan abu di Magelang dan Kulon Progo'),
]
APG = [('Gendol', 168, 7.0, (14, 6)), ('Woro', 140, 4.0, (16, 0)), ('Boyong', 196, 5.5, (10, 11)), ('Bedog', 214, 5.0, (-14, 12)),
       ('Bebeng', 232, 6.0, (-30, -1)), ('Krasak', 250, 6.5, (-26, -9))]   # arah perkiraan alur sungai; (dx, dy) label pt


def s_kronologi(Dk):
    s, k = Dk.slide(judul('Simulasi: PVMBG menaikkan Gunung Merapi ke Level IV (Awas) setelah kolom abu [6.000] m '
                          'dan awan panas meluncur [7] km'))
    pita_simulasi(k)
    kepala_panel(k, 43.2, 121, 418, 'Urutan kejadian', 'kalender')
    y, hb = 160, 56.5
    k.kotak(43.2 + 34.5, y + 8, 1.5, hb * (len(KRONO) - 1), GARIS)
    for i, (wkt, w, isi) in enumerate(KRONO):
        yy = y + i * hb
        k.kotak(43.2 + 29, yy + 3, 12.5, 12.5, w, PUTIH, bentuk=MSO_SHAPE.OVAL)
        k.teks(43.2 + 50, yy, 360, 18, [R(wkt, 10, ORANYE if w == MERAH else NAVY, True)], jangkar='m', bungkus=False)
        k.teks(43.2 + 50, yy + 17, 365, hb - 19, [R(isi, 9, TEKS2)], jangkar='t')
    # kanan: parameter + grafik
    X, W = 478, 438.8
    kepala_panel(k, X, 121, W, 'Parameter erupsi pada hari H', 'gunungapi')
    kw = (W - 3 * 6) / 4
    for i, (v, lab, isi, b, kon) in enumerate((('6.000 m', 'tinggi kolom abu', PITA_MERAH, MERAH, 'naik'),
                                               ('7 km', 'luncuran awan panas', PITA_MERAH, MERAH, 'peringatan'),
                                               ('14 kali', 'awan panas guguran', PITA_ORANYE, SIAGA_W, 'gunungapi'),
                                               ('10 km', 'radius zona bahaya', PITA_BIRU, BIRU, 'wilayah'))):
        kartu_w(k, X + i * (kw + 6), 160, kw, v, lab, isi, b, kon, h=34)
    # grafik batang bertumpuk kegempaan harian
    kepala_panel(k, X, 205, W, 'Kegempaan harian dan awan panas guguran', 'data')
    gx0, gy0, gy1 = X + 30, 262, 470
    tot = [sum(GEMPA[j][1][i] for j in GEMPA) for i in range(7)]
    skala = (gy1 - gy0) / 350
    for t in (0, 100, 200, 300):
        yy = gy1 - t * skala
        k.kotak(gx0, yy - 0.25, W - 34, 0.5, 'DCE1E7')
        k.teks(X, yy - 5, 26, 10, [R(str(t), 7, TEKS3)], rata='r', bungkus=False)
    bw, sela = 36, (W - 34 - 7 * 36) / 7
    for i in range(7):
        bx = gx0 + sela / 2 + i * (bw + sela)
        yy = gy1
        for nm, (w, v) in GEMPA.items():
            h = v[i] * skala
            k.kotak(bx, yy - h, bw, h, w)
            yy -= h
        k.teks(bx - 10, yy - 12, bw + 20, 11, [R(str(tot[i]), 8, NAVY, True)], rata='c', bungkus=False)
        k.teks(bx - 10, gy1 + 2, bw + 20, 10, [R(HARI[i], 7.5, TEKS, True)], rata='c', bungkus=False)
        if APG_HARI[i]:
            k.bulat(bx + 3, yy - 26, bw - 6, 12, PITA_MERAH)
            k.teks(bx + 3, yy - 26, bw - 6, 12, [R(f'APG {APG_HARI[i]}', 7, MERAH, True)], rata='c', bungkus=False)
    lx = X + 4
    for nm, (w, _) in GEMPA.items():
        k.kotak(lx, 246, 9, 7, w); k.teks(lx + 12, 244, 90, 11, [R(f'Gempa {nm.lower()}', 7.5, TEKS)], bungkus=False)
        lx += 100
    k.bulat(lx, 245, 22, 9, PITA_MERAH); k.teks(lx, 245, 22, 9, [R('APG', 6, MERAH, True)], rata='c', bungkus=False)
    k.teks(lx + 25, 244, 120, 11, [R('awan panas guguran (kali)', 7.5, TEKS)], bungkus=False)
    k.teks(X, 484, W, 12, [R('Jumlah gempa per hari pukul 00.00 s.d. 24.00 WIB; angka di atas batang menjumlahkan semua jenis gempa pada legenda.', 7, TEKS3)],
           bungkus=False)


# ======================================================================== SIMULASI: zona bahaya dan penduduk
RADIUS = 10


def paparan():
    pix = muat('gunungapi/data/pop/merapi.json')['piksel']
    agg = defaultdict(lambda: {'r5': 0, 'r10': 0, 'krb3': 0, 'sx': 0.0, 'sy': 0.0})
    for lat, lon, n in pix:
        d = jarak(lon, lat)
        if d > RADIUS:
            continue
        kk = next(((kb, kc) for kb, kc, g in KEC if di_dalam(g, lon, lat)), None)
        assert kk, (lat, lon)
        a = agg[kk]
        a['r10'] += n; a['sx'] += lon * n; a['sy'] += lat * n
        if d <= 5:
            a['r5'] += n
        if di_dalam(KRB['III'], lon, lat):
            a['krb3'] += n
    for a in agg.values():
        a['pusat'] = (a['sx'] / a['r10'], a['sy'] / a['r10'])
    return {kk: a for kk, a in agg.items() if a['r10'] >= 500}


EXT_Z = (110.246, 110.638, -7.384, -7.706)


def s_zona(Dk, pap):
    kab_urut = ['Sleman', 'Magelang', 'Klaten', 'Boyolali']
    tot10 = sum(a['r10'] for a in pap.values()); tot3 = sum(a['krb3'] for a in pap.values()); tot5 = sum(a['r5'] for a in pap.values())
    nkab = len({kb for kb, _ in pap})
    s, k = Dk.slide(judul(f'Zona bahaya simulasi radius 10 km mencakup [{len(pap)}] kecamatan di [{nkab}] kabupaten '
                          f'dengan sekitar [{fbulat(tot10, 100)}] penduduk'))
    pita_simulasi(k)
    P = Peta(EXT_Z, 43.2, 121, 418, 418 * (EXT_Z[2] - EXT_Z[3]) * KM_LAT / ((EXT_Z[1] - EXT_Z[0]) * KM_LON))
    peta_kec(P, {kk: 'FBEBDD' for kk in pap})
    P.lapis(lambda dr: P.poligon(dr, KRB['II'], isi=RGBA(SIAGA_W, 95)))
    P.lapis(lambda dr: P.poligon(dr, KRB['III'], isi=RGBA(MERAH, 120), garis=RGBA(MERAH), tebal=3))

    def atas(dr):
        P.lingkaran(dr, 5, RGBA(NAVY), 4, putus=True)
        P.lingkaran(dr, RADIUS, RGBA(MERAH), 7)
        for _, b, km, _ in APG:
            panah(dr, P, b, km, RGBA('7A2E1E'), 8)
        x, y = P.px(*MERAPI)
        segitiga(dr, x, y, 60, RGBA(NAVY), (255, 255, 255, 255), 4)
    P.lapis(atas)
    P.simpan('peta-zona.png', k)
    # label sungai di ujung panah
    for nm, b, km, (dx, dy) in APG:
        x, y = P.pt(*titik_arah(b, km))
        x += dx; y += dy
        k.teks(x - 22, y - 5, 44, 10, [R(nm, 7.5, '7A2E1E', True)], rata='c', bungkus=False)
    # label kabupaten
    for nm, (lon, lat) in {'MAGELANG': (110.30, -7.47), 'BOYOLALI': (110.585, -7.45), 'SLEMAN': (110.38, -7.665), 'KLATEN': (110.56, -7.655)}.items():
        x, y = P.pt(lon, lat)
        k.teks(x - 40, y - 5, 80, 10, [R(nm, 8, TEKS3, True, 0.8)], rata='c', bungkus=False)
    # nomor kecamatan
    urut = [kk for kb in kab_urut for kk in sorted((x for x in pap if x[0] == kb), key=lambda x: -pap[x]['r10'])]
    for i, kk in enumerate(urut, 1):
        x, y = P.pt(*pap[kk]['pusat'])
        k.nomor(x - 6, y - 6, i, d=12)
    kotak_legenda(k, P.x + 4, P.y + 4, 142, [('garis', MERAH, 'Zona bahaya radius 10 km'), ('putus', NAVY, 'Radius 5 km'),
                                              ('kotak', MERAH, 'Kawasan rawan bencana (KRB) III'), ('kotak', 'F2A35E', 'KRB II (PVMBG 2018)'),
                                              ('garis', '7A2E1E', 'Luncuran awan panas'), ('kotak', 'FBEBDD', 'Kecamatan terpapar')])
    utara_skala(k, P.x + 4, P.y + P.h - 26, P.km_pt(5), '5 km')
    yk = P.y + P.h + 5
    kw = (418 - 2 * 5) / 3
    kartu_w(k, 43.2, yk, kw, fbulat(tot10, 100), 'penduduk dalam radius 10 km', PITA_MERAH, MERAH, 'jiwa')
    kartu_w(k, 43.2 + kw + 5, yk, kw, fbulat(tot5, 100), 'penduduk dalam radius 5 km', PITA_ORANYE, SIAGA_W, 'jiwa')
    kartu_w(k, 43.2 + 2 * (kw + 5), yk, kw, fbulat(tot3, 100), 'penduduk di KRB III', PITA_BIRU, BIRU, 'wilayah')
    # tabel kecamatan
    kol = [('NO', 24, 'c'), ('KABUPATEN DAN KECAMATAN', 145, 'l'), ('DALAM 5 KM', 82, 'c'), ('DALAM 10 KM', 98, 'c'), ('DI KRB III', 96.5, 'c')]
    baris, i = [], 0
    for kb in kab_urut:
        ks = [kk for kk in urut if kk[0] == kb]
        baris.append(('sub', ['', f'Kab. {kb}', fbulat(sum(pap[x]['r5'] for x in ks)), fbulat(sum(pap[x]['r10'] for x in ks)),
                              fbulat(sum(pap[x]['krb3'] for x in ks))]))
        for kk in ks:
            i += 1
            a = pap[kk]
            baris.append(('data', [i, kk[1], fbulat(a['r5']) if a['r5'] >= 5 else '–', fbulat(a['r10']), fbulat(a['krb3']) if a['krb3'] >= 5 else '–']))
    baris.append(('total', ['', f'Total {len(pap)} kecamatan', fbulat(tot5, 100), fbulat(tot10, 100), fbulat(tot3, 100)]))
    tabel(k, 471.3, 121, kol, baris, bawah=500, pt=8.5)
    return urut


# ======================================================================== SIMULASI: abu dan penerbangan
EXT_A = (109.50, 111.18, -6.84, -8.22)
ABU_ARAH, ABU_PANJANG = 245, 95
BAND = [(0, 20, 'Tebal', 'lebih dari 5 mm', (0x4B, 0x4F, 0x58, 150)), (20, 50, 'Sedang', '1 s.d. 5 mm', (0x7F, 0x93, 0xAA, 135)),
        (50, ABU_PANJANG, 'Tipis', 'kurang dari 1 mm', (0xAE, 0xBB, 0xCB, 120))]


def di_abu(lon, lat):
    """Jarak sepanjang sumbu sebaran (km) bila titik di dalam kerucut abu; None bila di luar."""
    d, b = jarak(lon, lat), arah(lon, lat)
    sel = (b - ABU_ARAH + 180) % 360 - 180
    s_, l_ = d * math.cos(math.radians(sel)), d * math.sin(math.radians(sel))
    if s_ <= 0 or s_ > ABU_PANJANG:
        return None
    return s_ if abs(l_) <= 2.5 + 0.34 * s_ else None


def kab_abu():
    out = []
    for kp, kb, g in KAB:
        n = hit = 0; smin = 999
        xs = [c[0] for p in poligon(g) for c in p[0]]; ys = [c[1] for p in poligon(g) for c in p[0]]
        lon = min(xs)
        while lon <= max(xs):
            lat = min(ys)
            while lat <= max(ys):
                if di_dalam(g, lon, lat):
                    n += 1
                    s_ = di_abu(lon, lat)
                    if s_ is not None:
                        hit += 1; smin = min(smin, s_)
                lat += 0.01
            lon += 0.01
        if n and hit / n >= 0.05:
            cat = next(b for b in BAND if b[0] <= smin < b[1])
            out.append((kp, kb, hit / n, cat, smin))
    return sorted(out, key=lambda t: t[4])


BANDARA = [('WAHI', 'Yogyakarta International Airport (YIA)', 'Ditutup sementara', 'merah'),
           ('WAHH', 'Adisutjipto (JOG)', 'Beroperasi, pemantauan ketat', 'oranye'),
           ('WAHQ', 'Adi Soemarmo (SOC)', 'Beroperasi normal', 'biru'),
           ('WAHS', 'Jenderal Ahmad Yani (SRG)', 'Beroperasi normal', 'biru')]
GAYA = {'merah': (PITA_MERAH, MERAH, 'peringatan'), 'oranye': (PITA_ORANYE, SIAGA_W, 'peringatan'), 'biru': (PITA_BIRU, BIRU, 'infrastruktur')}


def s_abu(Dk):
    kabs = kab_abu()
    bd = {b['icao']: b for b in muat('gunungapi/data/bandara.json')}
    s, k = Dk.slide(judul(f'Simulasi sebaran abu ke barat daya mengenai [{len(kabs)}] kab/kota; Yogyakarta International Airport '
                          'ditutup sementara'))
    pita_simulasi(k)
    P = Peta(EXT_A, 43.2, 121, 418, 418 * (EXT_A[2] - EXT_A[3]) * KM_LAT / ((EXT_A[1] - EXT_A[0]) * KM_LON))
    kena = {(kp, kb): c for kp, kb, _, c, _ in kabs}

    def dasar(dr):
        for kp, kb, g in KAB:
            P.poligon(dr, g, isi=DARAT, garis=(255, 255, 255, 255), tebal=3)
    P.lapis(dasar)

    def abu(dr):   # pita kerucut abu, dari tipis ke tebal
        for a, b, _, _, w in reversed(BAND):
            pts = []
            for s_ in [a + (b - a) * i / 20 for i in range(21)]:
                hw = 2.5 + 0.34 * s_
                c = titik_arah(ABU_ARAH, s_)
                pts.append(P.px(*titik_arah(ABU_ARAH - 90, hw, c)))
            for s_ in [b - (b - a) * i / 20 for i in range(21)]:
                hw = 2.5 + 0.34 * s_
                c = titik_arah(ABU_ARAH, s_)
                pts.append(P.px(*titik_arah(ABU_ARAH + 90, hw, c)))
            dr.polygon(pts, fill=w)
    P.lapis(abu)
    P.lapis(lambda dr: [P.poligon(dr, g, garis=RGBA(NAVY) if (kp, kb) in kena else (255, 255, 255, 255), tebal=4 if (kp, kb) in kena else 2)
                        for kp, kb, g in KAB if (kp, kb) in kena])

    def puncak(dr):
        x, y = P.px(*MERAPI)
        segitiga(dr, x, y, 46, RGBA(MERAH), (255, 255, 255, 255), 3)
    P.lapis(puncak)
    P.simpan('peta-abu.png', k)
    # label bandara
    POSB = {'WAHI': (60, 404), 'WAHH': (300, 384), 'WAHQ': (330, 270), 'WAHS': (290, 140)}
    for icao, nm, st, g in BANDARA:
        b = bd[icao]
        isi, w, kon = GAYA[g]
        pil_peta(k, *POSB[icao], nm.split('(')[1][:3], st.split(',')[0], isi, w, P.pt(b['lon'], b['lat']), konsep='infrastruktur')
    xm, ym = P.pt(*MERAPI)
    k.teks(xm + 6, ym - 14, 60, 10, [R('Merapi', 8, MERAH, True)], bungkus=False)
    for kp, kb, _, c, _ in kabs:
        g = next(g for p, n, g in KAB if (p, n) == (kp, kb))
        lon, lat = pusat_geom(g)
        if kb == 'Kota Magelang':
            continue
        x, y = P.pt(lon, lat)
        k.teks(x - 40, y - 5, 80, 10, [R(kb, 7, NAVY, True)], rata='c', bungkus=False)
    kotak_legenda(k, P.x + 4, P.y + 4, 150, [('kotak', '4B4F58', 'Abu tebal, lebih dari 5 mm'), ('kotak', '7F93AA', 'Abu sedang, 1 s.d. 5 mm'),
                                              ('kotak', 'AEBBCB', 'Abu tipis, kurang dari 1 mm'), ('segitiga', MERAH, 'Gunung Merapi')],
                  'Hujan abu (contoh)')
    utara_skala(k, P.x + 4, P.y + P.h - 26, P.km_pt(25), '25 km')
    yk = P.y + P.h + 5
    kw = (418 - 2 * 5) / 3
    kartu_w(k, 43.2, yk, kw, len(kabs), 'kab/kota terkena hujan abu', PITA_ABU, '5B7A99', 'wilayah')
    kartu_w(k, 43.2 + kw + 5, yk, kw, sum(1 for b in BANDARA if b[3] == 'merah'), 'bandara ditutup sementara', PITA_MERAH, MERAH, 'peringatan')
    kartu_w(k, 43.2 + 2 * (kw + 5), yk, kw, '6.000 m', 'tinggi kolom abu di atas puncak', PITA_ORANYE, SIAGA_W, 'naik')
    # kanan: VONA, kab/kota, bandara
    X, W = 471.3, 445.5
    k.bulat(X, 121, W, 36, PITA_MERAH, radius=4)
    k.kotak(X + 6, 128, 22, 22, MERAH, bentuk=MSO_SHAPE.OVAL)
    k.gambar(ikon('peringatan'), X + 10.5, 132.5, 13, 13)
    k.teks(X + 34, 123, W - 40, 15, [R('VONA Gunung Merapi: kode warna MERAH', 11, MERAH, True)], bungkus=False)
    k.teks(X + 34, 138, W - 40, 14, [R('VONA: peringatan abu vulkanik untuk penerbangan. Abu 6.000 m di atas puncak, angin ke barat daya.', 8, TEKS2)],
           bungkus=False)
    kol = [('KAB/KOTA TERKENA ABU', 118, 'l'), ('PROVINSI', 82, 'l'), ('LUAS TERKENA (%)', 84, 'c'), ('KETEBALAN', 161.5, 'c')]
    rows = []
    for kp, kb, fr, c, smin in kabs:
        isi = {'Tebal': PITA_MERAH, 'Sedang': PITA_ORANYE, 'Tipis': PITA_ABU}[c[2]]
        bul = {'Tebal': MERAH, 'Sedang': SIAGA_W, 'Tipis': NORMAL_W}[c[2]]
        rows.append(('data', [kb if kb.startswith('Kota') else f'Kab. {kb}', 'Jawa Tengah' if kp == '33' else 'DIY', round(fr * 100),
                              ('pil', f'{c[2]}, {c[3]}', isi, bul)], 32.5))
    y = tabel_pil(k, X, 165, kol, rows)
    kol = [('BANDARA', 178, 'l'), ('JARAK (KM)', 106, 'c'), ('STATUS (CONTOH)', 161.5, 'c')]
    rows = []
    for icao, nm, st, g in BANDARA:
        b = bd[icao]
        rows.append(('data', [nm, round(jarak(b['lon'], b['lat'])), ('pil', st) + GAYA[g]], 32.5))
    tabel_pil(k, X, y + 9, kol, rows)
    return kabs


def tabel_pil(k, x, y, kol, baris):
    """tabel() acuan dengan sel pil berwarna bebas: ('pil', teks, isi, bulat[, ikon])."""
    alih = []
    sel2 = []
    for b in baris:
        sel = []
        for j, s_ in enumerate(b[1]):
            if isinstance(s_, tuple) and s_[0] == 'pil':
                alih.append((j, len(sel2), s_)); sel.append('')
            else:
                sel.append(s_)
        sel2.append(('data', sel, b[2]))
    yb = tabel(k, x, y, kol, sel2, bawah=500, pt=8.5)
    xs = [x]
    for c in kol:
        xs.append(xs[-1] + c[1])
    yy = y + 16.6
    tinggi = [b[2] for b in sel2]
    for j, i, s_ in alih:
        y0 = yy + sum(tinggi[:i])
        h = tinggi[i]; ph = min(15, h - 4)
        konsep = s_[4] if len(s_) > 4 else 'peringatan'
        pil_status(k, xs[j] + 3, y0 + (h - ph) / 2, kol[j][1] - 6, ph, s_[1], s_[2], s_[3], konsep)
    return yb


# ======================================================================== SIMULASI: evakuasi dan pengungsi
TITIK = {'Sleman': ['Ngemplak', 'Ngaglik', 'Tempel'], 'Magelang': ['Mungkid', 'Mertoyudan', 'Candimulyo'],
         'Klaten': ['Jatinom', 'Karangnongko', 'Kebonarum'], 'Boyolali': ['Boyolali', 'Mojosongo', 'Ampel']}
PORSI_UNGSI = {'Sleman': 0.90, 'Magelang': 0.75, 'Klaten': 0.80, 'Boyolali': 0.60}
BAGI = [0.45, 0.35, 0.20]
# acuan kebutuhan per orang per hari: air 15 liter dan 1 jamban per 20 orang (Sphere 2018); beras 0,4 kg (Perka BNPB 7/2008);
# masker 2 lembar (asumsi contoh)
EXT_E = (110.16, 110.78, -7.316, -7.825)


def s_evakuasi(Dk, pap):
    kab_urut = ['Sleman', 'Magelang', 'Klaten', 'Boyolali']
    ung = {kb: int(round(sum(a['r10'] for kk, a in pap.items() if kk[0] == kb) * PORSI_UNGSI[kb] / 10)) * 10 for kb in kab_urut}
    tot = sum(ung.values())
    n_titik = sum(len(v) for v in TITIK.values())
    s, k = Dk.slide(judul(f'Simulasi: sekitar [{f0(tot)}] jiwa mengungsi ke [{n_titik}] titik pengungsian di luar zona bahaya; '
                          f'kebutuhan air bersih [{f0(round(tot * 15 / 1000))}] m³ per hari'))
    pita_simulasi(k)
    P = Peta(EXT_E, 43.2, 121, 418, 418 * (EXT_E[2] - EXT_E[3]) * KM_LAT / ((EXT_E[1] - EXT_E[0]) * KM_LON))
    peta_kec(P, {kk: 'FBEBDD' for kk in pap})

    def atas(dr):
        P.lingkaran(dr, RADIUS, RGBA(MERAH), 6)
        x, y = P.px(*MERAPI)
        segitiga(dr, x, y, 50, RGBA(NAVY), (255, 255, 255, 255), 4)
    P.lapis(atas)
    P.simpan('peta-evakuasi.png', k)
    titik, no = [], 0
    for kb in kab_urut:
        for j, kc in enumerate(TITIK[kb]):
            g = next(g for b, c, g in KEC if (b, c) == (kb, kc))
            lon, lat = pusat_geom(g)
            assert jarak(lon, lat) > RADIUS + 1, (kc, jarak(lon, lat))
            no += 1
            titik.append((no, kb, kc, int(round(ung[kb] * BAGI[j] / 10)) * 10, round(jarak(lon, lat))))
            x, y = P.pt(lon, lat)
            k.kotak(x - 7, y - 7, 14, 14, BIRU_TUA, PUTIH, bentuk=MSO_SHAPE.OVAL)
            k.teks(x - 9, y - 7, 18, 14, [R(str(no), 7, PUTIH, True)], rata='c', bungkus=False)
    for nm, (lon, lat) in {'MAGELANG': (110.23, -7.42), 'BOYOLALI': (110.70, -7.43), 'SLEMAN': (110.33, -7.70), 'KLATEN': (110.63, -7.74)}.items():
        x, y = P.pt(lon, lat)
        k.teks(x - 40, y - 5, 80, 10, [R(nm, 8, TEKS3, True, 0.8)], rata='c', bungkus=False)
    kotak_legenda(k, P.x + 4, P.y + 4, 140, [('garis', MERAH, 'Zona bahaya radius 10 km'), ('kotak', 'FBEBDD', 'Kecamatan asal pengungsi'),
                                              ('bulat', BIRU_TUA, 'Titik pengungsian (nomor tabel)')])
    utara_skala(k, P.x + 4, P.y + P.h - 26, P.km_pt(10), '10 km')
    yk = P.y + P.h + 5
    kw = (418 - 5) / 2
    kartu_w(k, 43.2, yk, kw, f0(tot), f'pengungsi ({round(tot / sum(a["r10"] for a in pap.values()) * 100)} persen penduduk zona bahaya)',
            PITA_MERAH, MERAH, 'pengungsi')
    kartu_w(k, 43.2 + kw + 5, yk, kw, n_titik, 'titik pengungsian di luar radius 10 km', PITA_BIRU, BIRU, 'rumah')
    # tabel kebutuhan per kabupaten
    X = 471.3
    kol = [('KABUPATEN', 92, 'l'), ('PENGUNGSI', 64, 'c'), ('AIR (M³/HARI)', 72, 'c'), ('BERAS (TON/HARI)', 80, 'c'), ('JAMBAN', 56, 'c'),
           ('MASKER/HARI', 81.5, 'c')]
    rows = [('data', [f'Kab. {kb}', f0(ung[kb]), f0(round(ung[kb] * 15 / 1000)), f'{ung[kb] * 0.4 / 1000:.1f}'.replace('.', ','),
                      f0(math.ceil(ung[kb] / 20)), f0(ung[kb] * 2)], 18) for kb in kab_urut]
    rows.append(('total', ['Total', f0(tot), f0(round(tot * 15 / 1000)), f'{tot * 0.4 / 1000:.1f}'.replace('.', ','), f0(math.ceil(tot / 20)),
                           f0(tot * 2)]))
    y = tabel(k, X, 121, kol, rows, bawah=500, pt=8.5)
    k.teks(X, y + 2, 445.5, 11, [R('Acuan per orang per hari: air 15 liter dan 1 jamban per 20 orang (Sphere); beras 0,4 kg (Perka BNPB 7/2008); masker 2 lembar.',
                                   6.8, TEKS3)], bungkus=False)
    kol = [('NO', 24, 'c'), ('TEMPAT EVAKUASI DI KECAMATAN', 160, 'l'), ('KABUPATEN', 92, 'l'), ('JARAK (KM)', 72, 'c'), ('PENGUNGSI (JIWA)', 97.5, 'c')]
    rows = [('data', [n, kc, kb, d, f0(j)]) for n, kb, kc, j, d in titik]
    tabel(k, X, y + 18, kol, rows, bawah=500, pt=8.5)
    return tot, ung


# ======================================================================== SIMULASI: rekomendasi dan tindak lanjut
REKOM_PVMBG = [
    'Masyarakat tidak beraktivitas dalam radius 10 km dari puncak Gunung Merapi.',
    'Waspadai awan panas guguran sampai 12 km dari puncak di enam sungai yang tergambar pada peta zona bahaya.',
    'Waspadai lahar saat hujan di semua sungai yang berhulu di Gunung Merapi.',
    'Gunakan masker dan pelindung mata di wilayah hujan abu; tutup sumber air terbuka.',
    'Status ditinjau kembali bila aktivitas berubah nyata.',
]
TINDAK = [
    ('peringatan', 'BPBD DIY dan Jawa Tengah', 'Kosongkan permukiman dalam radius 10 km; sirene dan pengeras suara masjid di desa KRB III', 'H, pukul 12.00'),
    ('tanggap-darurat', 'Bupati Sleman, Magelang, Klaten, Boyolali', 'Tetapkan status tanggap darurat dan buka pos komando kabupaten', 'H, dalam 6 jam'),
    ('lembaga', 'BNPB (Deputi Penanganan Darurat)', 'Kirim Tim Reaksi Cepat dan dana siap pakai; dampingi pos komando', 'H sampai H+1'),
    ('pengungsi', 'Dinas Sosial dan BPBD kabupaten', 'Siapkan 12 titik pengungsian dengan dapur umum; data pengungsi per desa', 'H sampai H+2'),
    ('kesehatan', 'Dinas Kesehatan provinsi dan kabupaten', 'Bagikan masker di wilayah abu; layanan infeksi saluran pernapasan dan kesehatan jiwa di titik pengungsian', 'H sampai H+3'),
    ('infrastruktur', 'Kemenhub dan AirNav Indonesia', 'Terbitkan pemberitahuan penerbangan (NOTAM); alihkan penerbangan YIA ke Adi Soemarmo', 'H, sesudah VONA'),
    ('data', 'Pusdalops BNPB', 'Kirim laporan situasi tiap 6 jam; perbarui peta zona bahaya bila PVMBG mengubah radius', 'Tiap 6 jam'),
]


def s_rekomendasi(Dk):
    s, k = Dk.slide(judul(f'Simulasi: PVMBG memberi [{len(REKOM_PVMBG)}] rekomendasi dan BNPB bersama BPBD menjalankan '
                          f'[{len(TINDAK)}] langkah tindak lanjut'))
    pita_simulasi(k)
    XL, WL = 43.2, 300
    kepala_panel(k, XL, 121, WL, 'Rekomendasi PVMBG (contoh)', 'gunungapi')
    hb = (500 - 160 + 6) / len(REKOM_PVMBG)
    for i, t in enumerate(REKOM_PVMBG):
        y = 160 + i * hb
        h = hb - 6
        k.bulat(XL, y, WL, h, 'FCF1F2', radius=4)
        k.kotak(XL, y, 3, h, MERAH)
        k.kotak(XL + 11, y + (h - 18) / 2, 18, 18, MERAH, bentuk=MSO_SHAPE.OVAL)
        k.teks(XL + 10, y + (h - 18) / 2, 20, 18, [R(str(i + 1), 9, PUTIH, True)], rata='c', bungkus=False)
        k.teks(XL + 38, y, WL - 46, h, [R(t, 9.5, TEKS2)], jangkar='m')
    X, W = 360, 556.8
    kepala_panel(k, X, 121, W, 'Tindak lanjut BNPB dan BPBD bersama pemangku kepentingan', 'tanggap-darurat')
    kol = [('', 36, 'c'), ('SIAPA', 142, 'l'), ('APA', 288, 'l'), ('KAPAN', 90.8, 'c')]
    hr = (500 - 160 - 16.6) / len(TINDAK)
    rows = [('data', ['', ('runs', [R(siapa, 9, NAVY, True)]), rt(apa, 9), rt(kpn, 9, True)], hr) for _, siapa, apa, kpn in TINDAK]
    tabel(k, X, 160, kol, rows, bawah=500)
    for i, (kon, *_r) in enumerate(TINDAK):
        k.ikon_bulat(kon, X + 7, 160 + 16.6 + i * hr + (hr - 22) / 2, 22)


# ======================================================================== rakit
def main():
    Dk = BL.Deck()
    s_status(Dk)
    s_kronologi(Dk)
    pap = paparan()
    s_zona(Dk, pap)
    kabs = s_abu(Dk)
    tot, ung = s_evakuasi(Dk, pap)
    s_rekomendasi(Dk)
    print('kab abu:', [(kb, c[2], round(fr, 2), round(sm)) for _, kb, fr, c, sm in kabs])
    print('pengungsi:', tot, ung)
    isi = os.path.join(SINI, f'{NAMA}.pptx')
    Dk.I.simpan(isi)
    if '--isi' in sys.argv:
        print('isi saja:', isi); return
    sb = {1: 'PVMBG, laporan 8 Nov 2026 pukul 06.00 WIB; Level II dari MAGMA per 8 Nov; arti level Permen ESDM 15/2011',
          2: SIM + 'status Level III sejak 5 Nov 2020 dari PVMBG',
          3: SIM + 'penduduk WorldPop 2026; KRB PVMBG 2018; batas kecamatan Kemendagri',
          4: SIM + 'koordinat bandara OurAirports; batas kab/kota Kemendagri',
          5: SIM + 'penduduk WorldPop 2026; acuan Sphere 2018 dan Perka BNPB 7/2008',
          6: SIM + 'rekomendasi dan langkah rekaan untuk uji format'}
    bagian_hal = {1: 1, 2: 2, 3: 2, 4: 2, 5: 3, 6: 3}
    susun = [{'jenis': 'sampul'}, {'jenis': 'daftar-isi'}]
    susun += [{'halaman': n, 'bagian': bagian_hal[n], 'sumber': sb[n]} for n in range(1, 7)]
    foto = os.path.join(SINI, 'bahan', 'sampul.jpg').replace(os.sep, '/')
    kredit = 'Foto: Robert Friedman, USAID Indonesia (OFDA), domain publik, Wikimedia Commons'
    susun.append({'jenis': 'penutup', 'layout': 'putih', 'foto': [foto], 'kredit': kredit})
    tetap = {}
    for no, b in enumerate(susun, 1):
        if b.get('bagian'):
            tetap.setdefault(b['bagian'], []).append(no)
    bagian = [{'judul': j, 'label': j} for j in ('Status gunung api', 'Erupsi Merapi (simulasi)', 'Penanganan (simulasi)')]
    for n, b in enumerate(bagian, 1):
        b['halaman_tetap'] = tetap[n]
    import lewat_deck
    keluar = lewat_deck.bingkai(
        isi, 'kajian', 'Laporan Insidental Erupsi Gunung Api (Simulasi)', 'Skenario contoh: Gunung Merapi naik ke Level IV (Awas), data contoh untuk uji format', date(2026, 11, 9),
        foto=([foto], kredit), penyaji={'nama': 'Tim Ahli dan Tim Sus IT BNPB', 'jabatan': 'Badan Nasional Penanggulangan Bencana'},
        kepada='Disampaikan kepada Kepala Badan Nasional Penanggulangan Bencana', bagian=bagian, susun=susun,
        spek_tambah={'panel_sisi': 'gelap', 'subjek_dokumen': 'Laporan Insidental Erupsi Gunung Api', 'skala_logo_bnpb': 1.1})
    print(keluar)


if __name__ == '__main__':
    main()
