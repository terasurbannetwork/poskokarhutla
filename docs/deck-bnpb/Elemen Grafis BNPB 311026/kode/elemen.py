"""Pustaka elemen grafis BNPB plug-and-play (pemilik 31 Okt 2026: "elemen grafis sebanyak-banyaknya, plug and play,
tidak harus kotak", tanpa bentuk meliuk). Semua geometris, bentuk native PowerPoint, palet lembaga, tanpa menggambar
ulang lambang. Tiap fungsi: gambar(d, kv, x, y, w, h, warna) di kotak (x, y, w, h) pt; warna = daftar token tema.

Pakai di spek slide mana pun:
    "hiasan": [{"jenis": "gelombang", "x": 760, "y": 360, "w": 200, "h": 180, "warna": ["oranye"], "arah": "kanan-bawah"}]
"""
import math

PALET = ['oranye', 'biru-lembaga', 'navy', 'skala.netral.2']

MAKNA = {
    'kotak_tangga': 'Langkah bertahap dan eskalasi penanganan',
    'piksel': 'Citra satelit, titik panas, pemantauan data',
    'gelombang': 'Episentrum gempa dan sinyal peringatan dini',
    'kontur': 'Kontur lereng dan terasering, mitigasi longsor',
    'bilah': 'Seismograf, curah hujan, data terukur',
    'chevron': 'Prabencana, tanggap darurat, pascabencana',
    'halftone': 'Sebaran, kepadatan, dan cakupan layanan',
    'arsir': 'Pita peringatan dan zona bahaya',
    'seperempat': 'Radius dampak dan jangkauan layanan',
    'silang': 'Titik koordinat, posko, dan lokasi',
    'cincin_target': 'Radius bahaya dan zona evakuasi',
    'lingkaran_tangga': 'Eskalasi dan tahapan',
    'sinyal': 'Peringatan dini dan siaran informasi',
    'orbit': 'Pemantauan satelit',
    'kotak_garis': 'Wilayah dan cakupan berlapis',
    'siku_fokus': 'Fokus wilayah prioritas',
    'setengah': 'Gelombang laut, bentuk geometris',
    'pelangi': 'Cuaca dan iklim',
    'horizon': 'Cakrawala dan permukaan air',
    'simpul': 'Tahapan waktu dan peta jalan',
    'progres_batang': 'Capaian dan kemajuan',
    'kotak_tumpuk': 'Koordinasi lintas lembaga',
}


def _w(warna, i):
    w = warna or PALET
    return w[i % len(w)]


def kotak_tangga(d, kv, x, y, w, h, warna=None, **_):
    """Kotak bertangga diagonal, empat ukuran (pola PwC)."""
    u = min(w, h) / 4
    for i, (cx, cy, s) in enumerate([(0, 3, 1.0), (1, 2.2, 0.7), (1.7, 1.4, 1.0), (2.9, 0.4, 0.6), (3.3, 1.6, 0.5)]):
        kv.bentuk('kotak', x + cx * u, y + cy * u, s * u, s * u, _w(warna, i))


RAMP = {'oranye': 'api', 'biru-lembaga': 'air', 'navy': 'netral', 'skala.netral.2': 'netral'}


def piksel(d, kv, x, y, w, h, warna=None, **_):
    """Grid kotak kecil satu rona yang memudar dari pojok kiri bawah, seperti piksel citra satelit."""
    n = 8
    s = min(w, h) / n
    w0 = _w(warna, 0)
    if w0 in RAMP:
        tok = [f'skala.{RAMP[w0]}.{k}' for k in (5, 4, 3, 2)]
    else:   # putih di atas foto: satu rona, satu piksel aksen
        tok = [w0] * 4
    for r in range(n):
        for c in range(n):
            t = (c + (n - 1 - r)) / (2 * (n - 1))   # 0 di pojok kiri bawah
            if t > 0.62 or (t > 0.4 and (r + c) % 3 == 0):
                continue
            aksen = w0 not in RAMP and (r, c) == (n - 3, 2)
            kv.bentuk('kotak', x + c * s + s * 0.1, y + r * s + s * 0.1, s * 0.8, s * 0.8, _w(warna, 1) if aksen else tok[min(3, int(t / 0.62 * 4))])


def gelombang(d, kv, x, y, w, h, warna=None, arah='kanan-bawah', **_):
    """Busur konsentris dari satu sudut: episentrum dan gelombang sinyal."""
    tok = _w(warna, 0)
    pusat = {'kanan-bawah': (x + w, y + h, 180), 'kiri-bawah': (x, y + h, 270), 'kanan-atas': (x + w, y, 90), 'kiri-atas': (x, y, 0)}[arah]
    cx, cy, mulai = pusat
    R = min(w, h)
    for i in range(1, 7):
        r = R * i / 6
        b = kv.bentuk('busur', cx - r, cy - r, 2 * r, 2 * r, tok)
        b.adjustments[0] = mulai * 0.6 % 216
        b.adjustments[1] = (mulai + 90) * 0.6 % 216
        b.adjustments[2] = min(0.5, 3.2 / (2 * r))   # tebal pita busur sekitar 3,2 pt
    kv.bentuk('elips', cx - 5, cy - 5, 10, 10, _w(warna, 1) if warna and len(warna) > 1 else tok)


def kontur(d, kv, x, y, w, h, warna=None, **_):
    """Empat garis bertangga sejajar seperti kontur terasering: anak tangga lebar, siku tegas, tanpa liukan."""
    tok = _w(warna, 0)
    n, langkah = 4, 4
    lw, naik = w / langkah, h * 0.55 / langkah
    lw = w / (langkah + 0.9)   # ruang untuk geser jenjang
    for i in range(n):
        y0 = y + h - i * (h * 0.11) - 4
        gx = x + i * lw * 0.3   # tiap garis bergeser: anak tangga berjenjang, tidak bertumpuk jadi jala
        pts = []
        for k in range(langkah):
            yy = y0 - k * naik
            pts += [(gx + k * lw, yy), (gx + (k + 1) * lw, yy)]
        for (x1, y1), (x2, y2) in zip(pts, pts[1:]):
            kv.garis(x1, y1, x2, y2, tok if i % 2 == 0 else _w(warna, 1) if warna and len(warna) > 1 else tok, 2.5)


def bilah(d, kv, x, y, w, h, warna=None, **_):
    """Batang vertikal beragam tinggi seperti seismograf atau curah hujan."""
    tinggi = [0.25, 0.4, 0.3, 0.55, 0.9, 0.6, 1.0, 0.45, 0.7, 0.35, 0.5, 0.2, 0.38, 0.28]
    n = len(tinggi)
    bw = w / n
    for i, t in enumerate(tinggi):
        tok = _w(warna, 0) if t >= 0.85 else (_w(warna, 1) if len(warna or PALET) > 1 else _w(warna, 0))
        kv.bentuk('kotak', x + i * bw + bw * 0.2, y + h * (1 - t), bw * 0.6, h * t, tok)


def chevron(d, kv, x, y, w, h, warna=None, n=3, **_):
    """Chevron berderet: tiga fase penanggulangan bencana, makin pekat ke kanan."""
    tok = warna or ['skala.netral.2', 'biru-lembaga', 'oranye']
    cw = w / (n * 0.78 + 0.22)
    for i in range(n):
        kv.bentuk('chevron', x + i * cw * 0.78, y, cw, h, tok[min(i, len(tok) - 1)])


def halftone(d, kv, x, y, w, h, warna=None, **_):
    """Grid titik yang mengecil menjauhi pojok kiri bawah."""
    tok = _w(warna, 0)
    n = 10
    s = min(w, h) / n
    for r in range(n):
        for c in range(n):
            t = math.hypot(c, n - 1 - r) / math.hypot(n - 1, n - 1)
            dm = s * 0.8 * (1 - t)
            if dm < s * 0.12:
                continue
            kv.bentuk('elips', x + c * s + (s - dm) / 2, y + r * s + (s - dm) / 2, dm, dm, tok)


def arsir(d, kv, x, y, w, h, warna=None, **_):
    """Pita diagonal sejajar seperti pita peringatan, dipotong di kotaknya."""
    tok = _w(warna, 0)
    jarak = 14
    k = -h
    while k < w:
        x1, y1 = x + max(k, 0), y + h - max(0, -k)
        x2 = x + min(k + h, w)
        y2 = y + h - (x2 - x - k)
        if x2 > x1:
            kv.garis(x1, y1, x2, y2, tok, 4)
        k += jarak


def seperempat(d, kv, x, y, w, h, warna=None, **_):
    """Empat seperempat lingkaran di grid dua kali dua, tiap ubin diisi satu busur penuh dengan pusat di sudut berbeda."""
    s = min(w, h) / 2
    ubin = [((x + s, y + s), 180), ((x + s, y), 0), ((x, y + 2 * s), 270), ((x + 2 * s, y + 2 * s), 180)]   # (pusat, sudut awal)
    for i, ((cx, cy), mulai) in enumerate(ubin):
        p = kv.bentuk('pie', cx - s, cy - s, 2 * s, 2 * s, _w(warna, i))
        p.adjustments[0] = mulai * 0.6 % 216
        p.adjustments[1] = (mulai + 90) * 0.6 % 216


def silang(d, kv, x, y, w, h, warna=None, **_):
    """Tanda silang di grid seperti titik koordinat GIS; satu titik disorot sebagai lokasi."""
    tok = _w(warna, 0)
    n = 6
    s = min(w, h) / n
    for r in range(n):
        for c in range(n):
            cx, cy = x + c * s + s / 2, y + r * s + s / 2
            if (r, c) == (2, 3):
                kv.bentuk('elips', cx - s * 0.22, cy - s * 0.22, s * 0.44, s * 0.44, _w(warna, 1) if warna and len(warna) > 1 else 'oranye')
                continue
            a = s * 0.16
            kv.garis(cx - a, cy, cx + a, cy, tok, 1.1)
            kv.garis(cx, cy - a, cx, cy + a, tok, 1.1)


def cincin_target(d, kv, x, y, w, h, warna=None, **_):
    """Lingkaran konsentris bergantian warna, pusat titik: radius bahaya dan zona evakuasi."""
    R = min(w, h) / 2
    cx, cy = x + w / 2, y + h / 2
    for i, f in enumerate((1.0, 0.75, 0.5)):
        r = R * f
        b = kv.bentuk('cincin', cx - r, cy - r, 2 * r, 2 * r, _w(warna, i % 2) if i < 2 else 'skala.netral.2')
        b.adjustments[0] = min(0.5, (R * 0.11) / (2 * r))
    kv.bentuk('elips', cx - R * 0.12, cy - R * 0.12, R * 0.24, R * 0.24, _w(warna, 0))


def lingkaran_tangga(d, kv, x, y, w, h, warna=None, **_):
    """Lingkaran penuh beragam ukuran bertangga diagonal, bersinggungan."""
    u = min(w, h) / 4
    for i, (cx, cy, dm) in enumerate([(0, 2.8, 1.2), (1.2, 2.2, 0.8), (1.9, 1.2, 1.1), (3.0, 0.5, 0.7), (3.3, 1.5, 0.45)]):
        kv.bentuk('elips', x + cx * u, y + cy * u, dm * u, dm * u, _w(warna, i) if i != 4 else 'skala.netral.2')


def sinyal(d, kv, x, y, w, h, warna=None, **_):
    """Tiga busur dari satu titik ke atas seperti siaran: peringatan dini."""
    cx, cy = x + w / 2, y + h * 0.85
    R = min(w / 2, h * 0.8)
    for i in range(1, 4):
        r = R * i / 3
        b = kv.bentuk('busur', cx - r, cy - r, 2 * r, 2 * r, _w(warna, 0) if i < 3 else _w(warna, 1) if warna and len(warna) > 1 else _w(warna, 0))
        b.adjustments[0] = 225 * 0.6
        b.adjustments[1] = 315 * 0.6
        b.adjustments[2] = min(0.5, (R * 0.1) / (2 * r))
    kv.bentuk('elips', cx - R * 0.09, cy - R * 0.09, R * 0.18, R * 0.18, _w(warna, 0))


def orbit(d, kv, x, y, w, h, warna=None, **_):
    """Cincin tipis dengan satu satelit kecil dan inti penuh: pemantauan satelit."""
    R = min(w, h) / 2
    cx, cy = x + w / 2, y + h / 2
    for f in (1.0, 0.68):
        b = kv.bentuk('cincin', cx - R * f, cy - R * f, 2 * R * f, 2 * R * f, 'skala.netral.2')
        b.adjustments[0] = min(0.5, 1.6 / (2 * R * f))
    kv.bentuk('elips', cx - R * 0.32, cy - R * 0.32, R * 0.64, R * 0.64, _w(warna, 0))
    kv.bentuk('elips', cx + R * 0.68 * 0.707 - 6, cy - R * 0.68 * 0.707 - 6, 12, 12, _w(warna, 1) if warna and len(warna) > 1 else 'navy')
    kv.bentuk('elips', cx - R - 4, cy - 4, 8, 8, _w(warna, 0))


def kotak_garis(d, kv, x, y, w, h, warna=None, **_):
    """Tiga kotak bergaris bertumpuk geser: wilayah dan cakupan berlapis."""
    s = min(w, h) * 0.62
    for i in range(3):
        kv.bentuk('kotak', x + i * s * 0.3, y + h - s - i * s * 0.3, s, s, None, _w(warna, i % 2) if i < 2 else 'skala.netral.2', 2.5)


def siku_fokus(d, kv, x, y, w, h, warna=None, **_):
    """Tanda sudut bidik di empat pojok dengan titik di tengah: fokus wilayah prioritas."""
    tok = _w(warna, 0)
    a = min(w, h) * 0.22
    for (px, py, sx, sy) in [(x, y, 1, 1), (x + w, y, -1, 1), (x, y + h, 1, -1), (x + w, y + h, -1, -1)]:
        kv.garis(px, py, px + sx * a, py, tok, 3)
        kv.garis(px, py, px, py + sy * a, tok, 3)
    r = min(w, h) * 0.1
    kv.bentuk('elips', x + w / 2 - r, y + h / 2 - r, 2 * r, 2 * r, _w(warna, 1) if warna and len(warna) > 1 else tok)


def setengah(d, kv, x, y, w, h, warna=None, **_):
    """Deret setengah lingkaran menghadap atas, dua baris berselang: gelombang laut versi geometris."""
    n = 4
    s = w / n
    for baris in range(2):
        for i in range(n):
            ox = x + i * s + (s / 2 if baris else 0)
            if ox + s > x + w + 0.1:
                continue
            p = kv.bentuk('pie', ox, y + h * 0.35 + baris * s * 0.55, s, s, _w(warna, (i + baris) % 2))
            p.adjustments[0] = 180 * 0.6
            p.adjustments[1] = 0


def pelangi(d, kv, x, y, w, h, warna=None, **_):
    """Busur setengah lingkaran konsentris di atas garis dasar: cuaca dan iklim."""
    R = min(w / 2, h)
    cx, cy = x + w / 2, y + h
    tok = [_w(warna, 0), 'skala.netral.2', _w(warna, 1) if warna and len(warna) > 1 else 'navy', 'skala.netral.1']
    for i in range(4):
        r = R * (1 - i * 0.22)
        b = kv.bentuk('busur', cx - r, cy - r, 2 * r, 2 * r, tok[i])
        b.adjustments[0] = 180 * 0.6
        b.adjustments[1] = 0
        b.adjustments[2] = min(0.5, (R * 0.17) / (2 * r))


def horizon(d, kv, x, y, w, h, warna=None, **_):
    """Garis datar yang makin rapat ke atas dan makin pendek: cakrawala dan permukaan air."""
    tok = _w(warna, 0)
    yy, jarak, i = y + h, h * 0.2, 0
    while yy > y and i < 10:
        lw = w * (1 - i * 0.08)
        kv.garis(x + (w - lw), yy, x + w, yy, tok if i % 3 else (_w(warna, 1) if warna and len(warna) > 1 else tok), 3 - i * 0.2)
        yy -= jarak
        jarak *= 0.78
        i += 1


def simpul(d, kv, x, y, w, h, warna=None, **_):
    """Titik bersambung garis, titik terakhir disorot: tahapan waktu dan peta jalan."""
    n = 5
    cy = y + h / 2
    r = min(h * 0.12, w / (n * 4))
    kv.garis(x + r, cy, x + w - r, cy, 'skala.netral.2', 2)
    for i in range(n):
        cx = x + r + i * (w - 2 * r) / (n - 1)
        rr = r * (1.6 if i == n - 1 else 1)
        kv.bentuk('elips', cx - rr, cy - rr, 2 * rr, 2 * rr, _w(warna, 0) if i == n - 1 else _w(warna, 1) if warna and len(warna) > 1 else 'navy')


def progres_batang(d, kv, x, y, w, h, warna=None, **_):
    """Batang mendatar bertingkat panjangnya: capaian dan kemajuan."""
    pj = [0.35, 0.55, 0.7, 0.85, 1.0]
    bh = h / (len(pj) * 1.6)
    for i, f in enumerate(pj):
        kv.bentuk('kotak', x, y + i * bh * 1.6, w * f, bh, _w(warna, 0) if i == len(pj) - 1 else ('skala.netral.2' if i < 2 else _w(warna, 1) if warna and len(warna) > 1 else 'navy'))


def kotak_tumpuk(d, kv, x, y, w, h, warna=None, **_):
    """Kotak penuh menumpuk geser: koordinasi lintas lembaga."""
    s = min(w, h) * 0.6
    for i, tok in enumerate(['skala.netral.2', _w(warna, 1) if warna and len(warna) > 1 else 'navy', _w(warna, 0)]):
        kv.bentuk('kotak', x + i * s * 0.33, y + h - s - i * s * 0.33, s, s, tok)


ELEMEN = {'kotak_tangga': kotak_tangga, 'piksel': piksel, 'gelombang': gelombang, 'bilah': bilah,   # kontur dibuang: kusut di ukuran kecil (31 Okt)
          'chevron': chevron, 'halftone': halftone, 'arsir': arsir, 'seperempat': seperempat, 'silang': silang,
          'cincin_target': cincin_target, 'lingkaran_tangga': lingkaran_tangga, 'sinyal': sinyal, 'orbit': orbit,
          'kotak_garis': kotak_garis, 'siku_fokus': siku_fokus, 'setengah': setengah, 'pelangi': pelangi, 'horizon': horizon,
          'simpul': simpul, 'progres_batang': progres_batang, 'kotak_tumpuk': kotak_tumpuk}


def pasang(d, kv, daftar, asal=''):
    """Gambar daftar hiasan dari spek: [{"jenis", "x", "y", "w", "h", "warna"?, ...}]."""
    for h_ in daftar or []:
        fn = ELEMEN.get(h_.get('jenis'))
        if not fn:
            raise d.Galat(f'{asal}: hiasan "{h_.get("jenis")}" tidak dikenal: {", ".join(sorted(ELEMEN))}')
        opsi = {k: v for k, v in h_.items() if k not in ('jenis', 'x', 'y', 'w', 'h', 'warna')}
        fn(d, kv, h_['x'], h_['y'], h_['w'], h_['h'], h_.get('warna'), **opsi)
