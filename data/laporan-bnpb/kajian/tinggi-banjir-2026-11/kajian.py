"""Kajian Mengukur dan Melaporkan Tinggi Banjir (BNPB, 12 Nov 2026), format A4 yang meniru Laporan Bencana Oktober 2026.

Urutan:  py kajian.py  ->  node cetak.mjs  ->  py gabung.py  (ulang kajian.py + cetak.mjs + gabung.py sekali lagi supaya nomor
halaman daftar isi terisi)  ->  node tangkap.mjs  ->  py word.py
Angka logbook dihitung langsung dari public/data/logbook_kejadian.json (tidak ada angka logbook yang diketik).
Gaya: gaya.css salinan laporan bulanan Oktober (bulanan-2026-10/a4), ikon glif deck ppt-konsultan, logo BNPB dan KRIS.
"""
import json, os, html, base64, mimetypes, collections, statistics
from pathlib import Path

SINI = Path(__file__).resolve().parent
AKAR = SINI.parents[2]
HOME = os.path.expanduser('~').replace(chr(92), '/') + '/'
SK = HOME + '.claude/skills/ppt-konsultan/bnpb/'
LOGO_BNPB = SK + 'assets/proyek-bnpb/logo/sumber-bnpb.png'
LOGO_KRIS = str(AKAR / 'data/laporan-bnpb/generator/sampul/media/kris-logo.png')
FONT = AKAR / 'data/laporan-bnpb/generator/font'
META = json.load(open(SINI / 'meta.json', encoding='utf-8'))

C = dict(navy='#051C2C', oranye='#D9600B', biru='#2F86D1', merah='#C8102E', teks='#1A1A1A', teks2='#2E3440', teks3='#6B7280',
         garis='#BFC5CC', tint='#F1F3F6', tintair='#DCEBF8', tanah='#E9DFCC', tanah2='#B08A3E', hijau='#2E7D5B', slate='#5B7A99', abu='#DCE1E7')


def f(x, d=0):
    if isinstance(x, str):
        return x
    s = f'{x:,.{d}f}'
    return s.replace(',', '#').replace('.', ',').replace('#', '.')


def B(x, d=0):
    return f'<b>{f(x, d)}</b>'


def gambar(p):
    p = Path(p)
    return 'data:' + (mimetypes.guess_type(p.name)[0] or 'image/png') + ';base64,' + base64.b64encode(p.read_bytes()).decode()


# ---------------- angka logbook ----------------
LB = json.load(open(AKAR / 'public/data/logbook_kejadian.json', encoding='utf-8'))
BJ = [x for x in LB['kejadian'] if x['jenis'] in ('banjir', 'banjir_longsor', 'banjir_bandang')]
TM = [x for x in BJ if 'tma_cm' in x]
MAKS = [x['tma_cm'][1] for x in TM]
A = {
    'n': len(BJ), 'tma': len(TM), 'tma_p': 100 * len(TM) / len(BJ),
    'rentang': sum(1 for x in TM if x['tma_cm'][0] != x['tma_cm'][1]),
    'med': statistics.median(MAKS), 'q1': statistics.quantiles(MAKS, n=4)[0], 'q3': statistics.quantiles(MAKS, n=4)[2],
    'lebar': statistics.median([x['tma_cm'][1] - x['tma_cm'][0] for x in TM if x['tma_cm'][0] != x['tma_cm'][1]]),
    'rendah': sum(1 for m in MAKS if m < 75), 'sedang': sum(1 for m in MAKS if 75 <= m <= 150), 'tinggi': sum(1 for m in MAKS if m > 150),
    'm300': sum(1 for m in MAKS if m > 300), 'kab': len({x.get('kab_kode') for x in BJ}), 'lap': LB['n_laporan'],
    'rumah': sum(1 for x in BJ if x.get('rumah')), 'rumah_tanpa': sum(1 for x in BJ if x.get('rumah') and 'tma_cm' not in x),
    'surut': sum(1 for x in BJ if x.get('surut')),
}
A['rentang_p'] = 100 * A['rentang'] / A['tma']
A['tunggal'] = A['tma'] - A['rentang']
A['tanpa'] = A['n'] - A['tma']
PV = collections.Counter(x['prov'] for x in BJ)
PT = collections.Counter(x['prov'] for x in TM)
SUMBER_LB = f'Logbook harian Pusdalops BNPB, 1 Januari sampai 29 Oktober 2026 ({f(A["lap"])} laporan harian), diolah'

# ---------------- ikon ----------------
GLIF = json.load(open(SK + 'scripts/glif.json', encoding='utf-8'))
GLIF.update({
    'x:penggaris': '<path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.41 2.41 0 0 1 0-3.4l2.6-2.6a2.41 2.41 0 0 1 3.4 0Z"/><path d="m14.5 12.5 2-2"/><path d="m11.5 9.5 2-2"/><path d="m8.5 6.5 2-2"/><path d="m17.5 15.5 2-2"/>',
    'x:kamera': '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>',
    'x:satelit': '<path d="M13 7 9 3 5 7l4 4"/><path d="m17 11 4 4-4 4-4-4"/><path d="m8 12 4 4 6-6-4-4Z"/><path d="m16 8 3-3"/><path d="M9 21a6 6 0 0 0-6-6"/>',
    'x:toa': '<path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>',
    'x:grafik': '<path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>',
    'x:ponsel': '<rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/>',
    'x:ombak': '<path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/>',
    'x:alat': '<path d="m12 14 4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/>',
})
IK = {'banjir': 'deck:banjir', 'orang': 'deck:orang', 'rumah': 'deck:rumah', 'kalender': 'deck:kalender', 'data': 'lucide:database',
      'daftar': 'lucide:list-checks', 'awas': 'lucide:triangle-alert', 'peta': 'lucide:map-pin', 'lembaga': 'lucide:landmark',
      'perisai': 'lucide:shield-check', 'sirene': 'lucide:siren', 'air': 'lucide:droplet', 'hukum': 'lucide:scale', 'buku': 'lucide:book-open',
      'dokumen': 'lucide:file-text', 'periksa': 'lucide:clipboard-check', 'target': 'lucide:target', 'jaringan': 'lucide:network',
      'menara': 'lucide:radio-tower', 'ide': 'lucide:lightbulb', 'tangan': 'lucide:handshake', 'warga': 'lucide:users', 'bagi': 'lucide:share-2',
      'penggaris': 'x:penggaris', 'kamera': 'x:kamera', 'satelit': 'x:satelit', 'toa': 'x:toa', 'grafik': 'x:grafik', 'ponsel': 'x:ponsel',
      'ombak': 'x:ombak', 'alat': 'x:alat', 'mikroskop': 'lucide:microscope'}


def ikon(k, warna=C['navy'], uk=20, bulat=True, isi=None):
    gl = GLIF[IK.get(k, k)]
    if not bulat:
        return f'<svg class="ik" width="{uk}" height="{uk}" viewBox="0 0 24 24" fill="none" stroke="{warna}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">{gl}</svg>'
    latar = isi or (warna + '22')
    return (f'<svg class="ik" width="{uk}" height="{uk}" viewBox="-6 -6 36 36"><circle cx="12" cy="12" r="17.5" fill="{latar}"/>'
            f'<g fill="none" stroke="{warna}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">{gl}</g></svg>')


# ---------------- komponen ----------------
def kartu(item, kolom=4):
    return f'<div class="kartu k{kolom}">' + ''.join(
        f'<div class="kt" style="border-top-color:{w}"><div class="kti">{ikon(ik, w, 22)}<div class="kn" style="color:{w}">{v}</div></div><div class="kl">{l}</div></div>'
        for v, l, w, ik in item) + '</div>'


def tabel(kolom, baris, kanan=(), lebar=None, kelas=''):
    cg = ''.join(f'<col style="width:{x}%">' for x in lebar) if lebar else ''
    th = ''.join(f'<th class="{"r" if i in kanan else ""}">{k}</th>' for i, k in enumerate(kolom))
    tr = ''.join('<tr>' + ''.join(f'<td class="{"r" if i in kanan else ""}">{c}</td>' for i, c in enumerate(b)) + '</tr>' for b in baris)
    return f'<table class="tb {kelas}"><colgroup>{cg}</colgroup><thead><tr>{th}</tr></thead><tbody>{tr}</tbody></table>'


NOMOR = {'gambar': 0, 'tabel': 0}


def fig(isi, judul, sumber, jenis='gambar'):
    NOMOR[jenis] += 1
    lab = ('Gambar ' if jenis == 'gambar' else 'Tabel ') + str(NOMOR[jenis])
    return f'<figure><figcaption><span class="lab">{lab}.</span> {judul}</figcaption><div class="gbr">{isi}</div><div class="sb"><b>Sumber:</b> {sumber}</div></figure>'


def temuan(item):
    return '<div class="temuan">' + ''.join(f'<div class="tm"><div class="tmk">{ikon(ik, w, 30)}</div><div>{t}</div></div>' for ik, w, t in item) + '</div>'


def aksi(kolom):
    ik = ['sirene', 'kalender', 'target']
    return '<div class="aksi">' + ''.join(
        f'<div class="ak {"akan" if i == 2 else ""}"><div class="akh">{ikon(ik[i], "#FFFFFF", 16, False)} {j}</div><ul>' + ''.join(f'<li>{b}</li>' for b in bt) + '</ul></div>'
        for i, (j, bt) in enumerate(kolom)) + '</div>'


def svg_open(w, h):
    return f'<svg viewBox="0 0 {w} {h}" width="100%" xmlns="http://www.w3.org/2000/svg" font-family="Roboto" font-size="11">'


def teks(x, y, t, uk=10.5, w=C['teks2'], tebal=False, anchor='start'):
    return f'<text x="{x}" y="{y}" font-size="{uk}" fill="{w}" text-anchor="{anchor}"{" font-weight=\"700\"" if tebal else ""}>{html.escape(t)}</text>'


def panah(x, y1, y2, w):
    """panah dua arah vertikal"""
    return (f'<line x1="{x}" x2="{x}" y1="{y1 + 6}" y2="{y2 - 6}" stroke="{w}" stroke-width="1.8"/>'
            f'<path d="M{x - 4},{y1 + 7} L{x},{y1} L{x + 4},{y1 + 7}Z" fill="{w}"/><path d="M{x - 4},{y2 - 7} L{x},{y2} L{x + 4},{y2 - 7}Z" fill="{w}"/>')


def batang_h(rows, w=640, rowh=26, satuan=''):
    """rows: [(label, nilai, warna)]"""
    mx = max(v for _, v, _ in rows)
    lw = 230
    s = [svg_open(w, rowh * len(rows) + 8)]
    for i, (lab, v, c) in enumerate(rows):
        y = 4 + i * rowh
        bw = v / mx * (w - lw - 110)
        s.append(teks(lw - 8, round(y + rowh * .64, 1), lab, 10.5, C['teks'], anchor='end'))
        s.append(f'<rect x="{lw}" y="{y + 4}" width="{bw:.1f}" height="{rowh - 9}" fill="{c}"/>')
        s.append(f'<text x="{lw + bw + 6:.1f}" y="{y + rowh * .64:.1f}" fill="{C["navy"]}" font-weight="700" font-size="10.5">{f(v)}{satuan}</text>')
    s.append('</svg>')
    return ''.join(s)


# ---------------- gambar khusus ----------------
def penampang():
    w, h = 680, 270
    s = [svg_open(w, h)]
    tanah = [(0, 128), (110, 132), (140, 212), (232, 216), (262, 140), (430, 150), (680, 148)]
    muka = 98
    pts = ' '.join(f'{x},{y}' for x, y in tanah)
    s.append(f'<rect x="0" y="{muka}" width="{w}" height="{250 - muka}" fill="{C["tintair"]}"/>')
    s.append(f'<line x1="0" x2="{w}" y1="{muka}" y2="{muka}" stroke="{C["biru"]}" stroke-width="2"/>')
    s.append(f'<polygon points="{pts} {w},250 0,250" fill="{C["tanah"]}" stroke="{C["tanah2"]}" stroke-width="1.5"/>')
    s.append(f'<line x1="0" x2="{w}" y1="250" y2="250" stroke="{C["teks3"]}" stroke-dasharray="5 4"/>')
    s.append(teks(w - 6, 264, 'Datum: permukaan laut rata-rata (0 m)', 9.5, C['teks3'], anchor='end'))
    # rumah
    s.append(f'<rect x="440" y="92" width="80" height="58" fill="#fff" stroke="{C["navy"]}" stroke-width="1.5"/>')
    s.append(f'<path d="M432,94 L480,62 L528,94Z" fill="{C["slate"]}"/>')
    s.append(f'<rect x="440" y="{muka}" width="80" height="{150 - muka}" fill="{C["biru"]}" opacity=".28"/>')
    # papan duga
    s.append(f'<rect x="178" y="42" width="16" height="174" fill="#fff" stroke="{C["navy"]}" stroke-width="1.2"/>')
    for i in range(0, 174, 12):
        s.append(f'<line x1="178" x2="{186 if i % 24 else 194}" y1="{216 - i}" y2="{216 - i}" stroke="{C["navy"]}" stroke-width="1"/>')
    s.append(teks(186, 36, 'papan duga', 9, C['teks3'], anchor='middle'))
    # panah
    s.append(panah(548, muka, 149, C['oranye']))
    s.append(teks(558, 120, 'Kedalaman genangan (d):', 10, C['oranye'], True))
    s.append(teks(558, 133, 'dari tanah ke muka air', 10, C['oranye'], True))
    s.append(panah(206, muka, 216, C['navy']))
    s.append(f'<line x1="210" x2="266" y1="170" y2="170" stroke="{C["navy"]}" stroke-width="1" stroke-dasharray="3 2"/>')
    s.append(teks(270, 166, 'Tinggi muka air', 10, C['navy'], True))
    s.append(teks(270, 179, '(TMA) dari nol papan', 10, C['navy'], True))
    s.append(panah(40, muka, 250, C['slate']))
    s.append(teks(48, 185, 'Elevasi muka air', 10, C['slate'], True))
    s.append(teks(48, 198, 'banjir dari datum', 10, C['slate'], True))
    s.append(teks(340, 90, 'Muka air banjir', 10, C['biru'], True, 'middle'))
    s.append(teks(185, 238, 'sungai', 9.5, C['teks3'], anchor='middle'))
    s.append(teks(372, 205, 'dataran banjir dan permukiman', 9.5, C['teks3'], anchor='middle'))
    s.append('</svg>')
    return ''.join(s)


def skala_tubuh():
    w, h = 680, 300
    y0, k = 280, 1.55          # garis tanah, piksel per cm
    s = [svg_open(w, h)]
    pita = [(0, 75, '#EAF3FB', 'Rendah, di bawah 0,75 m'), (75, 150, '#C9E0F4', 'Sedang, 0,75 sampai 1,5 m'), (150, 172, '#93BFE6', 'Tinggi, di atas 1,5 m')]
    for a, b, c, lab in pita:
        s.append(f'<rect x="0" y="{y0 - b * k:.1f}" width="{w}" height="{(b - a) * k:.1f}" fill="{c}"/>')
        s.append(teks(w - 8, round(y0 - b * k + 13, 1) if b < 172 else round(y0 - a * k - 5, 1), lab, 9, C['navy'], True, 'end'))
    s.append(f'<line x1="0" x2="{w}" y1="{y0}" y2="{y0}" stroke="{C["tanah2"]}" stroke-width="2"/>')
    # sosok dewasa sekitar 165 cm
    cx = 130
    j = lambda cm: y0 - cm * k
    s.append(f'<g fill="{C["navy"]}">'
             f'<rect x="{cx - 15}" y="{j(88):.1f}" width="12" height="{88 * k:.1f}" rx="4"/><rect x="{cx + 3}" y="{j(88):.1f}" width="12" height="{88 * k:.1f}" rx="4"/>'
             f'<rect x="{cx - 18}" y="{j(142):.1f}" width="36" height="{56 * k:.1f}" rx="7"/>'
             f'<rect x="{cx - 29}" y="{j(140):.1f}" width="10" height="{62 * k:.1f}" rx="4"/><rect x="{cx + 19}" y="{j(140):.1f}" width="10" height="{62 * k:.1f}" rx="4"/>'
             f'<circle cx="{cx}" cy="{j(154):.1f}" r="{11 * k:.1f}"/></g>')
    titik = [(10, 'mata kaki', 'sekitar 10 cm'), (45, 'lutut', 'sekitar 45 cm'), (70, 'paha', 'sekitar 70 cm'), (95, 'pinggang', 'sekitar 95 cm'),
             (120, 'dada', 'sekitar 120 cm'), (140, 'bahu', 'sekitar 140 cm')]
    for cm, nama, ang in titik:
        y = j(cm)
        s.append(f'<line x1="{cx + 32}" x2="300" y1="{y:.1f}" y2="{y:.1f}" stroke="{C["oranye"]}" stroke-width="1.2" stroke-dasharray="3 2"/>')
        s.append(f'<circle cx="300" cy="{y:.1f}" r="3" fill="{C["oranye"]}"/>')
        s.append(teks(310, round(y + 4, 1), nama.capitalize(), 10.5, C['navy'], True))
        s.append(teks(380, round(y + 4, 1), ang, 10.5, C['teks2']))
    s.append('</svg>')
    return ''.join(s)


def alur():
    w, h = 696, 196
    kotak = [('Warga dan relawan', 'foto, titik lokasi,', 'perkiraan tinggi', 'warga'), ('Petugas BPBD', 'ukur di benda tetap,', 'tandai bekas air', 'penggaris'),
             ('Pusdalops BPBD', 'periksa kelengkapan,', 'beri kelas mutu', 'periksa'), ('Pusdalops BNPB', 'gabung ke satu', 'nomor kejadian', 'jaringan'),
             ('Basis data bersama', 'titik, waktu, metode,', 'mutu, foto', 'data'), ('Analisis dan informasi', 'peta, kajian,', 'pesan kepada warga', 'toa')]
    bw, gap = 100, 18
    s = [svg_open(w, h)]
    for i, (j, a, b, ik) in enumerate(kotak):
        x = 2 + i * (bw + gap)
        warna = C['oranye'] if i == 5 else C['navy'] if i in (3, 4) else C['slate']
        s.append(f'<rect x="{x}" y="20" width="{bw}" height="132" rx="6" fill="#fff" stroke="{warna}" stroke-width="1.5"/>')
        s.append(f'<rect x="{x}" y="20" width="{bw}" height="6" fill="{warna}"/>')
        s.append(f'<g transform="translate({x + bw / 2 - 17},36) scale(1.4)"><circle cx="12" cy="12" r="12" fill="{warna}22"/>'
                 f'<g transform="translate(4,4) scale(.6667)" fill="none" stroke="{warna}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">{GLIF[IK[ik]]}</g></g>')
        kata = j.split(' ')
        b1 = ' '.join(kata[:2]) if len(kata) > 2 else j
        b2 = ' '.join(kata[2:]) if len(kata) > 2 else ''
        s.append(teks(x + bw / 2, 90, b1, 10, C['navy'], True, 'middle'))
        if b2:
            s.append(teks(x + bw / 2, 103, b2, 10, C['navy'], True, 'middle'))
        s.append(teks(x + bw / 2, 124, a, 8.6, C['teks2'], anchor='middle'))
        s.append(teks(x + bw / 2, 136, b, 8.6, C['teks2'], anchor='middle'))
        s.append(teks(x + bw / 2, 13, str(i + 1), 10, warna, True, 'middle'))
        if i < 5:
            ax = x + bw + 2
            s.append(f'<path d="M{ax},86 L{ax + gap - 6},86" stroke="{C["teks3"]}" stroke-width="1.6"/><path d="M{ax + gap - 7},81 L{ax + gap - 1},86 L{ax + gap - 7},91Z" fill="{C["teks3"]}"/>')
    s.append(f'<path d="M{2 + 5 * (bw + gap) + bw / 2},152 L{2 + 5 * (bw + gap) + bw / 2},176 L52,176 L52,152" fill="none" stroke="{C["oranye"]}" stroke-width="1.4" stroke-dasharray="4 3"/>')
    s.append(f'<path d="M47,159 L52,152 L57,159Z" fill="{C["oranye"]}"/>')
    s.append(teks(345, 190, 'Informasi kembali ke warga: tinggi air terkini, lokasi berbahaya, dan arahan', 9.5, C['oranye'], True, 'middle'))
    s.append('</svg>')
    return ''.join(s)


# ================= ISI =================
DAFTAR = [('Ringkasan Eksekutif', 'Ringkasan Eksekutif', 'daftar'),
          ('Bab 1', 'Bab 1. Apa yang Diukur', 'penggaris'),
          ('Bab 2', 'Bab 2. Pencatatan Tinggi Banjir di BNPB Saat Ini', 'data'),
          ('Bab 3', 'Bab 3. Metode Pengukuran yang Ada', 'alat'),
          ('Bab 4', 'Bab 4. Praktik Lembaga Lain', 'lembaga'),
          ('Bab 5', 'Bab 5. Cara Mengukur dan Melaporkan yang Diusulkan', 'periksa'),
          ('Bab 6', 'Bab 6. Analisis dan Informasi kepada Masyarakat', 'toa'),
          ('Bab 7', 'Bab 7. Rekomendasi dan Tahapan', 'target'),
          ('Lampiran', 'Lampiran. Formulir Isian dan Daftar Pustaka', 'dokumen')]
TOC = json.load(open(SINI / 'toc.json', encoding='utf-8')) if (SINI / 'toc.json').exists() else {}
BIRU = C['biru']


def bab(label, judul, ik, warna=BIRU):
    return (f'<div class="bab" style="--w:{warna}"><div class="babi">{ikon(ik, "#FFFFFF", 44, True, warna)}</div>'
            f'<span>{label.upper()}</span>{judul}</div>')


def h3(t, ik):
    return f'<h3>{ikon(ik, C["navy"], 20)} {t}</h3>'


H = []
m = META
H.append(f'''<section class="sampul">
<div class="sp-kiri">
 <div class="logo-baris"><img src="{gambar(LOGO_BNPB)}" class="lg-bnpb"></div>
 <div class="sp-jenis">{m["jenis"]}</div>
 <h1 class="sp-judul">{m["judul_sampul"]}</h1>
 <div class="sp-sub">{m["sub"]}</div>
 <div class="sp-garis"></div>
 <div class="sp-kepada">Disampaikan kepada<br><b>{m["kepada"]}</b><br>{m["kepada_jabatan"]}</div>
 <div class="sp-oleh">Disusun oleh<br><b>{m["oleh"]}</b><br>{m["oleh_jabatan"]}</div>
 <div class="pil-tgl">{m["tanggal"]}</div>
 <div class="sp-kaki">© 2026 Badan Nasional Penanggulangan Bencana<br><i>Ketangguhan Bangsa dalam Menghadapi Bencana</i></div>
</div>
<div class="sp-kanan" style="background-image:url('{gambar(SINI / 'sampul.jpg')}')">
 <div class="sp-logo2"><img src="{gambar(LOGO_KRIS)}"></div>
 <div class="sp-kredit">{m["kredit_foto"]}</div>
</div></section>''')

H.append(f'''<section class="hal">
<h2 class="judul-bagian">Daftar Isi</h2>
<ol class="toc">{''.join(f'<li><span>{ikon(ik, C["navy"], 22)} {t}</span><em>{TOC.get(k, "")}</em></li>' for k, t, ik in DAFTAR)}</ol>
<div class="kotak-info"><b>Tentang kajian ini.</b> Kajian ini menjawab tiga pertanyaan: cara apa saja yang selama ini dipakai untuk mengukur tinggi banjir,
seberapa teliti masing-masing cara, dan bagaimana BNPB sebaiknya mengumpulkan, menyimpan, menganalisis, dan menyampaikan angka tinggi banjir
dari seluruh daerah. Gambaran pencatatan saat ini dihitung dari {B(A["lap"])} laporan harian Pusat Pengendalian Operasi (Pusdalops) BNPB periode 1 Januari sampai 29 Oktober 2026.
Uraian metode bersumber dari pedoman resmi, makalah ilmiah, dan uji coba di sistem data BNPB. Daftar sumber ada di Lampiran.
Usulan pada Bab 5 sampai Bab 7 masih berupa rancangan untuk dibahas, belum menjadi ketentuan.</div>
</section>''')

H.append(f'''<section class="hal">
<h2 class="judul-bagian">Ringkasan Eksekutif</h2>
<p class="tesis">Tinggi banjir menentukan seberapa besar bahaya bagi warga dan seberapa berat kerusakan, tetapi saat ini hanya sekitar
empat dari sepuluh laporan banjir ke BNPB yang menyebut angkanya, dan angka itu belum bisa dibandingkan antardaerah.</p>
{kartu([(f(A["n"]), 'kejadian banjir dalam logbook Pusdalops BNPB, Januari sampai Oktober 2026', C['navy'], 'banjir'),
        (f(A["tma_p"], 1) + '%', 'di antaranya menyebut tinggi air dalam angka', C['oranye'], 'penggaris'),
        (f(A["rentang_p"], 0) + '%', 'dari angka itu ditulis sebagai rentang, misalnya 30 sampai 50 cm', BIRU, 'grafik'),
        (f(A["med"]) + ' cm', 'nilai tengah tinggi air tertinggi yang dilaporkan', C['slate'], 'air')])}
<p>Selama Januari sampai Oktober 2026, logbook harian Pusdalops BNPB mencatat {B(A["n"])} kejadian banjir di {B(A["kab"])} kabupaten dan kota.
Hanya {B(A["tma"])} kejadian atau {B(A["tma_p"], 1)} persen yang menyebut tinggi air dalam angka. Angka itu ditulis dalam teks bebas, sebagian besar berupa
rentang, tanpa keterangan titik ukur, waktu ukur, dan cara mengukur. Akibatnya angka tinggi banjir belum dapat dipakai untuk membandingkan
kejadian, menilai kelas bahaya, atau menguji model prakiraan.</p>
<h3>{ikon('daftar', C['navy'], 20)} Empat temuan utama</h3>
{temuan([('penggaris', C['oranye'], '<b>Yang diukur belum seragam.</b> Kata "tinggi air" dipakai untuk tiga besaran berbeda: kedalaman genangan di permukiman, tinggi muka air sungai pada papan duga, dan elevasi muka air dari permukaan laut. Ketiganya tercampur di laporan.'),
         ('data', BIRU, f'<b>Angka ada, tetapi tidak terstruktur.</b> Dari {B(A["rumah"])} kejadian yang melaporkan jumlah rumah, {B(A["rumah_tanpa"])} kejadian tidak menyebut tinggi air sama sekali. Tabel kejadian Data dan Informasi Bencana Indonesia (DIBI) juga tidak memiliki kolom tinggi air.'),
         ('satelit', C['slate'], '<b>Satelit belum bisa menggantikan pengukuran lapangan.</b> Uji coba penaksiran kedalaman dari citra radar dan model elevasi global 30 m di lima kabupaten Jawa Tengah menghasilkan kedalaman tengah 0 m, karena galat model elevasi lebih besar daripada kedalaman banjirnya.'),
         ('ide', C['hijau'], '<b>Cara yang teliti sudah tersedia dan murah.</b> Pengukuran pada benda tetap, tanda bekas air tertinggi, dan foto dengan benda acuan cukup untuk mencapai ketelitian 10 sampai 25 cm, asalkan dicatat bersama titik, waktu, dan cara mengukurnya.')])}
<h3>{ikon('target', C['navy'], 20)} Usulan utama</h3>
<p>Kajian ini mengusulkan satu definisi baku, yaitu <b>kedalaman genangan dalam sentimeter di satu titik berkoordinat, diukur dari permukaan tanah
pada saat air tertinggi</b>. Setiap angka disertai cara mengukur dan kelas mutu A sampai D. Formulir logbook dan isian kejadian diberi kolom terstruktur
untuk itu, Badan Penanggulangan Bencana Daerah (BPBD) dibekali pedoman ukur sederhana, dan data dari semua daerah masuk ke satu basis data bersama. Dari sana BNPB dapat menyusun peta
kedalaman, menguji model, dan menyampaikan pesan kepada warga dalam bahasa yang mudah dipahami, misalnya "air setinggi lutut orang dewasa, sekitar 45 cm".
Tahapan pelaksanaannya diuraikan di Bab 7.</p>
</section>''')

# ---------- BAB 1 ----------
istilah = tabel(['Istilah', 'Diukur dari', 'Contoh pemakaian', 'Satuan'], [
    ['<b>Kedalaman genangan</b>', 'Permukaan tanah atau lantai di titik itu sampai muka air', 'Rumah, jalan, sawah yang tergenang', 'cm'],
    ['<b>Tinggi muka air (TMA)</b>', 'Titik nol papan duga atau sensor di pos sungai', 'Pos duga air sungai, pintu air, bendung', 'cm atau m'],
    ['<b>Elevasi muka air banjir</b>', 'Datum tetap, biasanya permukaan laut rata-rata', 'Peta banjir, model hidraulika, survei bekas air', 'm'],
    ['<b>Kedalaman tertinggi (puncak)</b>', 'Sama dengan kedalaman genangan, pada saat air paling tinggi', 'Penilaian kerusakan, kelas bahaya', 'cm'],
    ['<b>Lama genangan</b>', 'Waktu air mulai masuk sampai surut', 'Kerusakan bangunan dan tanaman, kebutuhan pengungsian', 'jam atau hari'],
    ['<b>Kecepatan arus</b>', 'Laju air di titik itu', 'Banjir bandang, keselamatan orang dan kendaraan', 'm/detik'],
], lebar=[24, 31, 33, 12], kelas='rapat')
kelas = tabel(['Kelas bahaya', 'Kedalaman genangan', 'Gambaran di lapangan'], [
    ['<span class="pil biru">Rendah</span>', 'Di bawah 0,75 m', 'Air setinggi mata kaki sampai paha orang dewasa'],
    ['<span class="pil biru">Sedang</span>', '0,75 sampai 1,5 m', 'Air setinggi pinggang sampai dada, lantai rumah satu lantai terendam'],
    ['<span class="pil merah">Tinggi</span>', 'Di atas 1,5 m', 'Air melewati bahu orang dewasa, mendekati plafon rumah satu lantai'],
], lebar=[18, 24, 58], kelas='rapat')
H.append(f'''<section class="hal">
{bab('Bab 1', 'Apa yang Diukur', 'penggaris')}
{h3('1.1 Tiga besaran yang sering tertukar', 'penggaris')}
<p>Dalam laporan kejadian, kata "tinggi air" atau "TMA" dipakai untuk tiga besaran yang berbeda. <b>Kedalaman genangan</b> adalah jarak tegak dari
permukaan tanah atau lantai sampai muka air di satu titik. <b>Tinggi muka air (TMA)</b> adalah bacaan papan duga atau sensor di pos sungai, diukur dari
titik nol alat yang letaknya berbeda di tiap pos. <b>Elevasi muka air banjir</b> adalah ketinggian muka air terhadap datum tetap, biasanya permukaan
laut rata-rata, dan dipakai dalam peta serta model. TMA 250 cm di sebuah pos sungai tidak berarti permukiman di sekitarnya tergenang 250 cm,
karena titik nol papan duga berada di dasar alur sungai.</p>
{fig('<div class="penampang">' + penampang() + '</div>', 'Tiga cara menyatakan tinggi banjir pada satu penampang', 'Disusun tim kajian dari Koenig dkk. (2016) dan Surat Edaran Direktur Jenderal Sumber Daya Air Nomor 10 Tahun 2021')}
<p>Untuk menilai bahaya bagi warga dan kerusakan bangunan, besaran yang dibutuhkan adalah <b>kedalaman genangan</b>. TMA sungai tetap penting untuk
peringatan dini, sedangkan elevasi muka air dibutuhkan untuk peta dan model. Ketiganya boleh dicatat, asalkan diberi nama yang berbeda dan tidak
dicampur dalam satu kolom.</p>
{fig(istilah, 'Istilah dan cara mengukur', 'Koenig dkk. (2016); Surat Edaran Direktur Jenderal Sumber Daya Air Nomor 10 Tahun 2021; diolah', 'tabel')}
{h3('1.2 Mengapa kedalaman penting', 'awas')}
<p>Kedalaman genangan menentukan tiga hal. Pertama, <b>keselamatan</b>: Badan Cuaca Nasional Amerika Serikat (NWS) mengingatkan bahwa air mengalir
setinggi sekitar 15 cm dapat menjatuhkan orang dewasa, sekitar 30 cm dapat menghanyutkan mobil kecil, dan sekitar 60 cm dapat menghanyutkan
kendaraan besar. Kedua, <b>kerusakan</b>: semakin dalam dan semakin lama genangan, semakin besar kerusakan rumah, perabot, dan tanaman. Ketiga,
<b>kelas bahaya</b>: Peraturan Kepala BNPB Nomor 2 Tahun 2012 tentang Pedoman Umum Pengkajian Risiko Bencana membagi bahaya banjir menurut kedalaman genangan.</p>
{fig(kelas, 'Kelas bahaya banjir menurut kedalaman genangan', 'Peraturan Kepala BNPB Nomor 2 Tahun 2012, sebagaimana dikutip Mongabay (2026); gambaran lapangan disusun tim kajian', 'tabel')}
<p class="catatan">Kedalaman saja belum cukup untuk banjir bandang. Bahaya bagi orang bergantung pada kedalaman dan kecepatan arus sekaligus.
Para pakar yang membahas revisi pedoman pengkajian risiko pada awal 2026 mengusulkan agar kecepatan arus ikut dipertimbangkan (Mongabay, 2026).
Karena itu kajian ini mengusulkan kolom arus tenang atau deras di formulir, walaupun belum ada alat ukur kecepatan di lapangan.</p>
</section>''')

# ---------- BAB 2 ----------
prov = [(p, n, PT[p]) for p, n in PV.most_common(10)]
tb_prov = tabel(['Provinsi', 'Kejadian banjir', 'Menyebut tinggi air', 'Persen'],
                [[p, f(n), f(t), f(100 * t / n, 0) + '%'] for p, n, t in prov] +
                [['<b>Seluruh Indonesia</b>', B(A['n']), B(A['tma']), B(A['tma_p'], 0) + '<b>%</b>']],
                kanan=(1, 2, 3), lebar=[40, 20, 22, 18], kelas='rapat total')
H.append(f'''<section class="hal">
{bab('Bab 2', 'Pencatatan Tinggi Banjir di BNPB Saat Ini', 'data')}
{h3('2.1 Logbook harian Pusdalops', 'data')}
<p>Laporan harian Pusdalops BNPB memuat kronologi tiap kejadian dalam teks bebas yang dikirim BPBD. Tinggi air muncul sebagai kalimat seperti
"TMA 30 sampai 50 cm" atau "ketinggian air sekitar 1 meter". Sistem data BNPB membaca kalimat itu secara otomatis. Hasilnya, dari {B(A["n"])} kejadian
banjir pada Januari sampai Oktober 2026, hanya {B(A["tma"])} kejadian yang memuat angka tinggi air.</p>
{kartu([(f(A["tanpa"]), 'kejadian tanpa angka tinggi air', C['merah'], 'awas'), (f(A["rentang"]), 'kejadian dengan angka berupa rentang', C['oranye'], 'grafik'),
        (f(A["tunggal"]), 'kejadian dengan satu angka', BIRU, 'penggaris'), (f(A["lebar"]) + ' cm', 'lebar tengah rentang yang ditulis', C['slate'], 'air')])}
{fig(tb_prov, 'Sepuluh provinsi dengan kejadian banjir terbanyak dan laporan yang menyebut tinggi air', SUMBER_LB, 'tabel')}
<p>Kelengkapan berbeda jauh antarprovinsi. Jawa Timur dan Banten menyebut tinggi air pada lebih dari separuh kejadian, sedangkan Aceh dan Sulawesi Tengah
kurang dari seperempat. Perbedaan ini diduga mencerminkan kebiasaan menulis laporan di tiap BPBD, bukan perbedaan besarnya banjir.</p>
{h3('2.2 Isi angka yang dilaporkan', 'grafik')}
<p>Nilai tengah tinggi air tertinggi yang dilaporkan adalah {B(A["med"])} cm. Separuh kejadian berada antara {B(A["q1"])} dan {B(A["q3"])} cm. Bila dikelompokkan menurut kelas bahaya
Peraturan Kepala BNPB Nomor 2 Tahun 2012, sebanyak {B(A["rendah"])} kejadian masuk kelas rendah, {B(A["sedang"])} kelas sedang, dan {B(A["tinggi"])} kelas tinggi.</p>
{fig(batang_h([('Rendah, di bawah 75 cm', A['rendah'], '#93BFE6'), ('Sedang, 75 sampai 150 cm', A['sedang'], BIRU), ('Tinggi, di atas 150 cm', A['tinggi'], C['navy'])], w=640, satuan=' kejadian'),
     'Kejadian banjir menurut kelas tinggi air tertinggi yang dilaporkan', SUMBER_LB)}
<p>Pengelompokan ini perlu dibaca hati-hati karena tiga hal. Pertama, rentang seperti "30 sampai 80 cm" dibaca sebagai 80 cm, padahal bisa jadi
angka 80 cm hanya berlaku di satu titik terendah. Kedua, {B(A["m300"])} kejadian menyebut angka di atas 3 meter. Angka sebesar itu hampir pasti bacaan TMA sungai,
bukan kedalaman genangan permukiman. Ketiga, waktu ukur tidak dicatat, sehingga tidak diketahui apakah angka itu tinggi puncak atau tinggi pada saat laporan dibuat.</p>
{h3('2.3 Akibatnya bagi analisis', 'mikroskop')}
<p>Tim data BNPB sudah menguji apakah tinggi air yang dilaporkan dapat dijelaskan dengan curah hujan. Korelasi peringkat antara tinggi air tertinggi dan curah hujan
tiga hari pada 140 kejadian di 73 kabupaten hampir nol, dengan nilai rho -0,00 dan selang kepercayaan -0,17 sampai 0,16. Salah satu dugaan penyebabnya adalah
angka yang tercampur antara TMA sungai, genangan permukiman, dan genangan jalan. Tanpa angka yang seragam, model prakiraan tidak dapat dilatih atau diuji.</p>
<p>Data kejadian DIBI memuat jumlah rumah terendam, tetapi tidak memuat tinggi air. Jumlah rumah terendam tidak membedakan rumah yang tergenang 20 cm
dengan rumah yang tergenang 2 meter, padahal kebutuhan bantuan dan perbaikannya sangat berbeda.</p>
{h3('2.4 Uji coba penaksiran dari satelit', 'satelit')}
<p>Sistem data BNPB juga menguji penaksiran kedalaman dari citra radar Sentinel-1, melalui layanan Copernicus Global Flood Monitoring, dan model elevasi
global Copernicus GLO-30 beresolusi 30 m, memakai metode Floodwater Depth Estimation Tool (FwDET). Pada lima kabupaten di Jawa Tengah yang dapat diuji,
kedalaman tengah hasil taksiran adalah 0,0 m, karena galat model elevasi yang ikut mengukur atap rumah dan pohon lebih besar daripada kedalaman banjirnya.
Perkiraan warga terdampak dari metode ini juga masih sekitar 22 kali lebih kecil daripada angka DIBI. Banjir kota seperti di Semarang dan Banjarmasin tidak tertangkap;
dugaan penyebabnya adalah radar tidak dapat membaca air di sela bangunan, sehingga wilayah seperti itu membutuhkan model hidraulika dua dimensi.
Perbaikannya membutuhkan model elevasi permukaan tanah yang lebih tajam, seperti Model Elevasi Digital Nasional (DEMNAS) 8 m dari Badan Informasi Geospasial,
serta data kedalaman lapangan sebagai pembanding. Status metode ini masih eksperimen dan belum diterbitkan.</p>
</section>''')

# ---------- BAB 3 ----------
metode = tabel(['Metode', 'Yang diukur', 'Ketelitian', 'Kapan tersedia', 'Kelebihan dan batasan'], [
    ['<b>Papan duga dan pencatat otomatis (AWLR)</b> di pos sungai', 'TMA sungai', '1 sampai 2 cm', 'Seketika, terus-menerus', 'Teliti dan berkala, tetapi hanya satu titik di sungai, bukan genangan permukiman'],
    ['<b>Sensor genangan</b> ultrasonik, radar, atau tekanan di jalan dan permukiman', 'Kedalaman genangan', '1 sampai 5 cm', 'Seketika', 'Teliti, tetapi butuh biaya pasang, listrik, dan perawatan'],
    ['<b>Kamera pengawas dengan papan skala</b>', 'Kedalaman genangan', '5 sampai 10 cm', 'Seketika', 'Bisa dibaca jarak jauh, tetapi terganggu malam hari dan hujan lebat'],
    ['<b>Pengukuran langsung petugas</b> dengan meteran pada benda tetap', 'Kedalaman genangan', '5 sampai 10 cm', 'Saat kejadian', 'Murah dan cepat, tetapi petugas harus berada di lokasi dan aman'],
    ['<b>Tanda bekas air tertinggi</b> pada dinding, tiang, pohon', 'Kedalaman puncak', '3 sampai 15 cm', '1 sampai 7 hari sesudah surut', 'Mengukur puncak yang sering terlewat, tetapi bekas air cepat hilang'],
    ['<b>Laporan warga</b> dengan skala tubuh atau benda', 'Kedalaman genangan', '20 sampai 30 cm', 'Seketika', 'Cakupan luas dan cepat, tetapi kasar dan perlu diperiksa'],
    ['<b>Foto dengan benda acuan</b>, dibaca manusia atau kecerdasan buatan', 'Kedalaman genangan', '10 sampai 25 cm', 'Seketika sampai beberapa jam', 'Bisa diperiksa ulang, tetapi butuh benda acuan yang terlihat jelas'],
    ['<b>Citra satelit dan model elevasi</b>, misalnya FwDET', 'Kedalaman genangan wilayah', '20 cm sampai lebih dari 1 m', '6 jam sampai beberapa hari', 'Cakupan luas, tetapi buta di kota dan bergantung pada mutu model elevasi'],
    ['<b>Model hidraulika dua dimensi</b>', 'Kedalaman dan kecepatan per sel', 'Bergantung data', 'Sebelum dan sesudah kejadian', 'Lengkap untuk perencanaan, tetapi butuh data sungai dan elevasi rinci'],
    ['<b>Pesawat nirawak dan pemindai laser (LiDAR)</b>', 'Elevasi muka air dan tanah', '5 sampai 15 cm', 'Beberapa jam sampai hari', 'Rinci untuk wilayah kecil, tetapi butuh izin terbang dan pengolahan'],
], lebar=[25, 14, 13, 15, 33], kelas='rapat mini')
H.append(f'''<section class="hal">
{bab('Bab 3', 'Metode Pengukuran yang Ada', 'alat')}
<p>Metode mengukur tinggi banjir dapat dikelompokkan menjadi empat: alat ukur tetap, pengukuran manual di lapangan, laporan warga, dan penaksiran
jarak jauh dengan satelit atau model. Tidak ada satu metode yang unggul di semua keadaan. Alat tetap teliti tetapi jarang, laporan warga luas tetapi kasar,
dan satelit luas tetapi buta di permukiman padat. Tabel 4 merangkum kesepuluh metode yang ditemukan.</p>
{fig(metode, 'Perbandingan metode pengukuran tinggi banjir', 'Koenig dkk. (2016); Cohen dkk. (2019); Chaudhary dkk. (2020); dokumentasi Copernicus GFM; uji coba sistem data BNPB. Angka ketelitian adalah kisaran umum, bukan hasil uji di Indonesia', 'tabel')}
{h3('3.1 Alat ukur tetap', 'menara')}
<p>Pos duga air di sungai membaca TMA dengan papan berskala atau alat pencatat tinggi muka air otomatis (automatic water level recorder, AWLR). Pembangunannya diatur dalam Peraturan Menteri Pekerjaan Umum
Nomor 5 Tahun 2009, dan mutu datanya dikendalikan melalui Surat Edaran Direktur Jenderal Sumber Daya Air Nomor 10 Tahun 2021. Data ini dikelola balai wilayah sungai,
sehingga BNPB cukup memakainya, bukan mengukur ulang. Untuk genangan di jalan dan permukiman, sensor jarak ultrasonik atau radar yang dipasang menghadap
ke bawah dapat mengukur kedalaman setiap beberapa menit. Kamera pengawas yang mengarah ke papan skala menjadi pilihan lebih murah di titik langganan banjir.</p>
{h3('3.2 Pengukuran manual dan tanda bekas air', 'penggaris')}
<p>Petugas yang berada di lokasi dapat mengukur kedalaman dengan meteran atau tongkat berskala pada benda tetap, seperti tiang listrik, pagar, atau dinding rumah.
Setelah air surut, garis lumpur, sampah yang tersangkut, dan bekas basah pada dinding menunjukkan <b>tinggi air puncak</b>. Survei Geologi Amerika Serikat (USGS)
menerbitkan pedoman khusus untuk mengenali, mengukur, dan menyimpan tanda bekas air tertinggi, termasuk penilaian ketidakpastian setiap tanda (Koenig dkk., 2016).
Tanda bekas air paling baik diukur dalam satu sampai tujuh hari, sebelum dibersihkan warga atau hilang karena hujan.</p>
{h3('3.3 Laporan warga dan foto', 'kamera')}
<p>Warga adalah sumber tercepat dan terluas. Platform PetaBencana.id, misalnya, menerima laporan banjir lewat media sosial dan aplikasi pesan, lengkap dengan lokasi,
tinggi air, dan foto, lalu menampilkannya di peta yang juga dipakai BPBD DKI Jakarta. Ketelitian laporan warga meningkat bila tinggi air dinyatakan dengan
<b>bagian tubuh orang dewasa atau benda yang ukurannya diketahui</b>. Penelitian juga menunjukkan bahwa kedalaman dapat ditaksir otomatis dari foto media sosial
dengan pembelajaran mesin yang membaca seberapa tinggi benda acuan terendam (Chaudhary dkk., 2020).</p>
{fig(skala_tubuh(), 'Skala tubuh orang dewasa untuk memperkirakan kedalaman genangan', 'Perkiraan tim kajian untuk orang dewasa setinggi sekitar 165 cm; pita warna mengikuti kelas bahaya Peraturan Kepala BNPB Nomor 2 Tahun 2012')}
{h3('3.4 Satelit dan model', 'satelit')}
<p>Citra radar dapat memetakan luas genangan pada siang dan malam serta menembus awan. Kedalaman lalu ditaksir dengan menggabungkan luas genangan dengan model elevasi:
tinggi tanah di tepi genangan dianggap sama dengan tinggi muka air, lalu kedalaman dihitung sebagai selisih muka air dan tanah di setiap titik. Metode FwDET versi 2.0
mencapai selisih rata-rata 0,18 m pada model elevasi 1 m dan 0,31 m pada model elevasi 10 m (Cohen dkk., 2019). Dengan model elevasi global 30 m, galatnya jauh lebih besar,
seperti terlihat pada uji coba di Bab 2. Layanan Copernicus juga menandai wilayah perkotaan dan vegetasi rapat sebagai wilayah yang tidak dapat dibaca radar.
Model hidraulika dua dimensi menghitung kedalaman dan kecepatan di setiap sel, tetapi membutuhkan data penampang sungai dan elevasi rinci yang belum tersedia di sebagian besar daerah.</p>
</section>''')

# ---------- BAB 4 ----------
H.append(f'''<section class="hal">
{bab('Bab 4', 'Praktik Lembaga Lain', 'lembaga')}
{h3('4.1 Survei Geologi Amerika Serikat (USGS)', 'lembaga')}
<p>USGS menggabungkan tiga lapis pengukuran. Pos sungai permanen memberi TMA terus-menerus. Menjelang badai besar, petugas memasang alat ukur sementara
dan sensor gelombang pasang di lokasi yang diperkirakan terdampak, lalu mencabutnya kembali sesudah kejadian. Setelah air surut, tim lapangan mengukur tanda bekas air
tertinggi dengan pedoman baku. Semua data masuk ke basis data Short-Term Network dan dibuka untuk umum melalui peta Flood Event Viewer, lengkap dengan foto, koordinat,
elevasi, dan tingkat ketidakpastian setiap titik.</p>
{h3('4.2 Copernicus Emergency Management Service', 'satelit')}
<p>Layanan Global Flood Monitoring memetakan luas genangan dari setiap citra Sentinel-1 secara otomatis. Layanan ini memberi lapisan khusus untuk wilayah yang tidak
dapat dibaca radar, termasuk perkotaan dan vegetasi rapat, sehingga pengguna tahu bahwa wilayah kosong di peta belum tentu kering. Kedalaman tidak disediakan
langsung dan perlu dihitung sendiri dengan model elevasi.</p>
{h3('4.3 PetaBencana.id dan BPBD DKI Jakarta', 'ponsel')}
<p>PetaBencana.id mengumpulkan laporan warga melalui media sosial dan aplikasi pesan. Pada banjir awal 2020, lebih dari 800 warga mengirim laporan dalam waktu kurang dari 24 jam.
Laporan diterbitkan di peta bersama data resmi, dan aplikasi Pantau Banjir milik BPBD DKI Jakarta ikut menampilkannya. Pelajaran pentingnya: laporan warga bermanfaat
bila formulirnya sederhana, lokasi diambil otomatis dari ponsel, dan foto wajib dilampirkan.</p>
{h3('4.4 Pengelolaan data hidrologi Kementerian Pekerjaan Umum', 'menara')}
<p>Data TMA dan debit sungai dikumpulkan balai wilayah sungai dengan prosedur kendali mutu yang tertulis, termasuk pemeriksaan titik nol alat dan penandaan data
yang diragukan. BNPB dapat meniru prinsip ini untuk data kedalaman genangan: setiap angka disertai keterangan cara mengukur dan tanda mutunya.</p>
<div class="kotak-info"><b>Pelajaran untuk BNPB.</b> USGS dan Kementerian Pekerjaan Umum memisahkan dengan tegas TMA sungai dan kedalaman genangan, mencatat setiap angka
bersama titik, waktu, dan cara mengukurnya, serta menandai mutu setiap data. Copernicus menunjukkan pentingnya menandai wilayah yang tidak dapat dibaca,
dan PetaBencana.id menunjukkan bahwa formulir sederhana berfoto membuat warga mau melapor.</div>
</section>''')

# ---------- BAB 5 ----------
mutu = tabel(['Kelas', 'Cara mengukur', 'Perkiraan ketelitian', 'Bukti yang dilampirkan'], [
    ['<span class="pil biru">A</span>', 'Alat ukur atau sensor, atau survei bekas air dengan elevasi terukur', 'Sekitar 5 cm', 'Nama alat atau pos, data bacaan'],
    ['<span class="pil biru">B</span>', 'Petugas mengukur dengan meteran atau tongkat berskala pada benda tetap', 'Sekitar 10 cm', 'Foto meteran di lokasi'],
    ['<span class="pil abu">C</span>', 'Foto dengan benda acuan, atau perkiraan petugas dengan skala tubuh', 'Sekitar 25 cm', 'Foto dan nama benda acuan'],
    ['<span class="pil merah">D</span>', 'Keterangan lisan, laporan tanpa foto, atau taksiran model dan satelit', 'Lebih dari 25 cm', 'Sumber keterangan'],
], lebar=[9, 45, 18, 28], kelas='rapat')
skema = tabel(['Kolom', 'Isi', 'Contoh'], [
    ['Nomor kejadian', 'Nomor kejadian yang sama dengan DIBI dan logbook', 'Satu nomor untuk satu banjir, banyak titik ukur'],
    ['Titik', 'Lintang dan bujur dari ponsel, nama desa dan kecamatan', '-6,9647; 110,4405; Kemijen, Semarang Timur'],
    ['Waktu ukur', 'Tanggal dan jam pengukuran, WIB, WITA, atau WIT', '14 Maret 2024 pukul 07.30 WIB'],
    ['Besaran', 'Kedalaman genangan, TMA sungai, atau elevasi', 'Kedalaman genangan'],
    ['Nilai', 'Satu angka dalam sentimeter, bukan rentang', '80'],
    ['Puncak', 'Apakah angka ini tinggi tertinggi kejadian', 'Ya, dari bekas air di dinding'],
    ['Cara ukur dan kelas mutu', 'Pilihan tetap, lalu kelas A sampai D otomatis', 'Meteran pada tiang listrik, kelas B'],
    ['Arus', 'Tenang atau deras', 'Tenang'],
    ['Foto', 'Minimal satu foto berlokasi', 'Foto meteran di depan rumah warga'],
    ['Pelapor dan status', 'Peran pelapor dan status pemeriksaan', 'Petugas BPBD, sudah diperiksa Pusdalops BPBD'],
    ['Surut', 'Tanggal dan jam air surut di titik itu', '16 Maret 2024 pukul 18.00 WIB'],
], lebar=[22, 42, 36], kelas='rapat')
H.append(f'''<section class="hal">
{bab('Bab 5', 'Cara Mengukur dan Melaporkan yang Diusulkan', 'periksa')}
{h3('5.1 Satu definisi untuk semua daerah', 'target')}
<p>Usulan dasar kajian ini adalah satu definisi baku: <b>kedalaman genangan dalam sentimeter, di satu titik berkoordinat, diukur dari permukaan tanah pada saat air tertinggi</b>.
Bila diukur di dalam rumah, yang dicatat tetap kedalaman dari permukaan tanah di luar rumah, sedangkan tinggi air di atas lantai dicatat sebagai keterangan.
TMA sungai dicatat di kolom tersendiri dan tidak pernah digabung dengan kedalaman genangan. Satu kejadian banjir boleh memiliki banyak titik ukur.
Untuk ringkasan kabupaten, yang dilaporkan adalah kedalaman tertinggi dan nilai tengah semua titik, bukan rata-rata wilayah.</p>
{h3('5.2 Cara mengukur di lapangan', 'penggaris')}
<ul>
<li><b>Pilih benda tetap.</b> Ukur pada tiang listrik, pagar, dinding, atau pohon yang tidak bergeser, di tempat air tenang dan bukan di cekungan atau gundukan.</li>
<li><b>Ukur tegak dan foto.</b> Tegakkan meteran atau tongkat berskala dari tanah sampai muka air, lalu foto meteran beserta benda di sekitarnya.</li>
<li><b>Catat waktu dan titik.</b> Ambil lokasi dari ponsel, catat jam ukur, dan tandai apakah air masih naik, tetap, atau sudah turun.</li>
<li><b>Ukur puncak sesudah surut.</b> Dalam satu sampai tujuh hari sesudah surut, ukur garis lumpur atau bekas basah tertinggi pada dinding, lalu tandai dengan cat agar bisa diukur ulang.</li>
<li><b>Utamakan keselamatan.</b> Petugas tidak masuk ke air yang mengalir deras atau lebih dalam dari lutut. Dalam keadaan itu, gunakan foto dari tempat aman dan skala tubuh atau benda.</li>
</ul>
{h3('5.3 Kelas mutu setiap angka', 'periksa')}
<p>Setiap angka diberi kelas mutu menurut cara mengukurnya. Kelas ini dipilih otomatis dari jawaban "cara ukur" di formulir, sehingga pelapor tidak perlu menilai sendiri.
Kelas mutu memungkinkan analis memakai semua data tanpa menyamakan perkiraan lisan dengan hasil alat ukur.</p>
{fig(mutu, 'Usulan kelas mutu data kedalaman genangan', 'Usulan tim kajian, mengacu pada penilaian ketidakpastian tanda bekas air dalam Koenig dkk. (2016)', 'tabel')}
{h3('5.4 Alur pelaporan', 'jaringan')}
<p>Alur pelaporan mengikuti jalur yang sudah ada, yaitu dari BPBD melalui Pusdalops ke BNPB, dengan dua tambahan: laporan warga masuk sebagai bahan yang diperiksa petugas,
dan informasi hasil olahan kembali kepada warga.</p>
{fig(alur(), 'Usulan alur pengukuran, pelaporan, dan penyebaran informasi tinggi banjir', 'Usulan tim kajian')}
{h3('5.5 Isian minimum di basis data bersama', 'data')}
<p>Agar data dari semua daerah dapat digabung, setiap titik ukur memuat isian minimum pada Tabel 6. Isian ini sejalan dengan Peraturan Kepala BNPB Nomor 8 Tahun 2011
tentang Standardisasi Data Kebencanaan dan prinsip Satu Data Indonesia dalam Peraturan Presiden Nomor 39 Tahun 2019: satu definisi, satu format, dan satu kode wilayah.</p>
{fig(skema, 'Isian minimum untuk setiap titik ukur', 'Usulan tim kajian', 'tabel')}
</section>''')

# ---------- BAB 6 ----------
pesan = tabel(['Kedalaman', 'Bahasa untuk warga', 'Pesan keselamatan'], [
    ['Di bawah 30 cm', 'Air setinggi mata kaki sampai betis', 'Hindari berjalan di air yang mengalir, sepeda motor dapat mogok atau tergelincir'],
    ['30 sampai 75 cm', 'Air setinggi lutut sampai paha', 'Jangan menyeberang dengan kendaraan, mobil kecil dapat hanyut di air yang mengalir'],
    ['75 sampai 150 cm', 'Air setinggi pinggang sampai dada', 'Matikan listrik, pindahkan anak, lansia, dan penyandang disabilitas ke tempat tinggi'],
    ['Di atas 150 cm', 'Air melewati bahu orang dewasa', 'Segera mengungsi ke lantai atas atau tempat evakuasi, tunggu bantuan petugas'],
], lebar=[17, 30, 53], kelas='rapat')
H.append(f'''<section class="hal">
{bab('Bab 6', 'Analisis dan Informasi kepada Masyarakat', 'toa')}
{h3('6.1 Analisis', 'grafik')}
<p>Data titik ukur yang seragam membuka empat jenis analisis yang saat ini belum bisa dilakukan.</p>
<ul>
<li><b>Peta kedalaman kejadian.</b> Titik ukur lapangan digabung dengan luas genangan dari satelit dan model elevasi DEMNAS. Titik lapangan menjadi patokan,
dan satelit mengisi wilayah di antaranya.</li>
<li><b>Penilaian kerusakan.</b> Kedalaman dan lama genangan per titik dipadukan dengan data bangunan untuk memperkirakan rumah rusak dan kebutuhan bantuan,
sebagai pelengkap jumlah rumah terendam di DIBI.</li>
<li><b>Uji model prakiraan.</b> Model prakiraan banjir milik BNPB dapat diuji dengan kedalaman terukur, bukan hanya dengan ada atau tidaknya laporan kejadian.</li>
<li><b>Kajian risiko.</b> Kelas bahaya banjir di portal kajian risiko InaRISK milik BNPB dapat dibandingkan dengan kedalaman yang benar-benar terjadi, sehingga peta bahaya dapat diperbaiki dari waktu ke waktu.</li>
</ul>
<p class="catatan">Angka dari sumber yang berbeda tidak dijumlahkan atau dirata-ratakan begitu saja. Angka kelas A dan B menjadi patokan, sedangkan kelas C dan D dipakai
untuk mengisi wilayah yang tidak terukur dan selalu ditandai sebagai perkiraan.</p>
{h3('6.2 Informasi kepada masyarakat', 'toa')}
<p>Warga lebih mudah memahami tinggi air dalam ukuran tubuh daripada dalam sentimeter. Karena itu setiap angka yang disebarkan kepada masyarakat disertai padanan tubuh
dan pesan keselamatan yang sesuai, misalnya "air setinggi lutut orang dewasa, sekitar 45 cm". Informasi juga selalu menyebut lokasi dan jam pengukuran, karena tinggi air
berubah dari jam ke jam.</p>
{fig(pesan, 'Usulan bahasa dan pesan keselamatan menurut kedalaman', 'Usulan tim kajian; ambang keselamatan kendaraan mengacu pada imbauan National Weather Service (NWS) Amerika Serikat', 'tabel')}
<p>Saluran penyebarannya memakai jalur yang sudah ada: siaran pers dan media sosial BNPB, grup pesan BPBD, serta aplikasi InaRISK Personal. Peta titik ukur yang sudah diperiksa
dapat dibuka untuk umum tanpa data pribadi pelapor, mengikuti contoh Flood Event Viewer milik USGS.</p>
</section>''')

# ---------- BAB 7 ----------
H.append(f'''<section class="hal">
{bab('Bab 7', 'Rekomendasi dan Tahapan', 'target')}
<p>Rekomendasi disusun bertahap, dimulai dari perubahan yang hampir tanpa biaya, yaitu memperbaiki formulir dan cara menulis laporan.</p>
{aksi([('Segera, 0 sampai 3 bulan', ['Menetapkan definisi baku kedalaman genangan dan memisahkannya dari TMA sungai.',
                                     'Menambah kolom terstruktur di formulir logbook dan isian kejadian: titik, waktu ukur, nilai, puncak, cara ukur, foto.',
                                     'Menyebarkan pedoman ukur satu halaman dan skala tubuh kepada seluruh BPBD.',
                                     'Mulai memberi kelas mutu A sampai D pada setiap angka yang masuk.']),
       ('Menengah, 3 sampai 12 bulan', ['Memasang penanda tinggi banjir di titik langganan banjir bersama BPBD dan pemerintah desa.',
                                       'Melatih petugas BPBD dan Tim Reaksi Cepat mengukur tanda bekas air sesudah banjir besar.',
                                       'Menyambungkan data pos duga air balai wilayah sungai ke basis data BNPB.',
                                       'Menguji penaksiran kedalaman dari satelit dengan DEMNAS 8 m dan titik ukur lapangan.']),
       ('Jangka panjang, lebih dari 12 bulan', ['Memasang sensor dan kamera berpapan skala di kota yang sering tergenang.',
                                               'Menyusun model hidraulika dua dimensi untuk kota prioritas.',
                                               'Memasukkan kecepatan arus ke dalam kelas bahaya pada revisi pedoman pengkajian risiko.',
                                               'Membuka peta titik ukur untuk umum dan untuk perguruan tinggi.'])])}
{h3('7.1 Yang dibutuhkan dari pimpinan', 'lembaga')}
<p>Tiga keputusan dibutuhkan agar rekomendasi dapat berjalan. Pertama, persetujuan definisi baku dan isian minimum sebagai bagian dari standardisasi data kebencanaan.
Kedua, penugasan Pusat Data, Informasi, dan Komunikasi Kebencanaan bersama Pusdalops untuk mengubah formulir dan basis data. Ketiga, surat edaran kepada BPBD tentang
cara mengukur dan melaporkan kedalaman genangan, disertai pedoman satu halaman.</p>
<div class="kotak-info"><b>Ukuran keberhasilan.</b> Saat ini {B(A["tma_p"], 0)} persen laporan banjir menyebut tinggi air, dan belum ada yang berkoordinat atau berkelas mutu.
Sasarannya, pada musim hujan pertama sesudah formulir diubah, sedikitnya separuh laporan banjir memuat kedalaman genangan berkoordinat dengan kelas mutu,
lalu delapan dari sepuluh laporan pada musim hujan berikutnya. Angka ini dapat dipantau setiap bulan dari logbook yang sama.</div>
</section>''')

# ---------- LAMPIRAN ----------
form = tabel(['No.', 'Pertanyaan', 'Pilihan jawaban'], [
    ['1', 'Di mana Anda mengukur?', 'Lokasi otomatis dari ponsel, ditambah nama desa'],
    ['2', 'Jam berapa Anda mengukur?', 'Otomatis, dapat diubah'],
    ['3', 'Apa yang diukur?', 'Genangan permukiman, genangan jalan, sawah, atau papan duga sungai'],
    ['4', 'Berapa tinggi air dari permukaan tanah?', 'Angka dalam sentimeter'],
    ['5', 'Bagaimana Anda mengukur?', 'Alat atau sensor, meteran, bekas air, foto dengan benda acuan, skala tubuh, keterangan warga'],
    ['6', 'Apakah ini tinggi tertinggi?', 'Ya, belum tahu, atau air masih naik'],
    ['7', 'Bagaimana arusnya?', 'Tenang atau deras'],
    ['8', 'Lampirkan foto', 'Minimal satu foto yang memperlihatkan benda acuan'],
], lebar=[7, 38, 55], kelas='rapat')
H.append(f'''<section class="hal">
{bab('Lampiran', 'Formulir Isian dan Daftar Pustaka', 'dokumen', C['navy'])}
{h3('Contoh formulir isian kedalaman genangan', 'ponsel')}
{fig(form, 'Contoh pertanyaan formulir untuk petugas dan warga', 'Usulan tim kajian', 'tabel')}
{h3('Daftar pustaka', 'buku')}
<ul class="sumber">
<li>Badan Nasional Penanggulangan Bencana. (2011). <i>Peraturan Kepala BNPB Nomor 8 Tahun 2011 tentang Standardisasi Data Kebencanaan</i>.</li>
<li>Badan Nasional Penanggulangan Bencana. (2012). <i>Peraturan Kepala BNPB Nomor 2 Tahun 2012 tentang Pedoman Umum Pengkajian Risiko Bencana</i>.</li>
<li>Badan Nasional Penanggulangan Bencana. (2026). <i>Logbook harian Pusdalops BNPB, 1 Januari sampai 29 Oktober 2026</i>, diolah sistem data BNPB.</li>
<li>Chaudhary, P., D'Aronco, S., Leitão, J. P., Schindler, K., dan Wegner, J. D. (2020). Water level prediction from social media images with a multi-task ranking approach. <i>ISPRS Journal of Photogrammetry and Remote Sensing</i>, 167, 252–262.</li>
<li>Cohen, S., Raney, A., Munasinghe, D., dkk. (2019). The Floodwater Depth Estimation Tool (FwDET v2.0) for improved remote sensing analysis of coastal flooding. <i>Natural Hazards and Earth System Sciences</i>, 19, 2053–2065.</li>
<li>Copernicus Emergency Management Service. <i>Global Flood Monitoring: Product Definition Document dan Product User Manual</i>. Diakses November 2026.</li>
<li>Direktorat Jenderal Sumber Daya Air. (2021). <i>Surat Edaran Nomor 10 Tahun 2021 tentang Kendali Mutu Data Hidrologi</i>. Kementerian Pekerjaan Umum dan Perumahan Rakyat.</li>
<li>Kementerian Pekerjaan Umum. (2009). <i>Peraturan Menteri Pekerjaan Umum Nomor 5 Tahun 2009 tentang Pedoman Pembangunan Pos Duga Air Tipe Konsol</i>.</li>
<li>Koenig, T. A., Bruce, J. L., O'Connor, J. E., dkk. (2016). <i>Identifying and Preserving High-Water Mark Data</i>. U.S. Geological Survey Techniques and Methods 3-A24.</li>
<li>Mongabay Indonesia. (2 Januari 2026). <i>Para pakar usul revisi pedoman kajian risiko bencana</i>.</li>
<li>National Weather Service. <i>Turn Around Don't Drown</i>. National Oceanic and Atmospheric Administration, Amerika Serikat.</li>
<li>PetaBencana.id. (2020). <i>PetaBencana.id collaborates with NASA, BNPB, government agencies, and residents in response to historic 2020 flood event</i>.</li>
<li>Presiden Republik Indonesia. (2019). <i>Peraturan Presiden Nomor 39 Tahun 2019 tentang Satu Data Indonesia</i>.</li>
</ul>
</section>''')

CSS = (SINI / 'gaya.css').read_text(encoding='utf-8')
CSS = CSS.replace('{FONT_R}', gambar(FONT / 'Roboto-Regular.ttf')).replace('{FONT_M}', gambar(FONT / 'Roboto-Medium.ttf')).replace('{FONT_B}', gambar(FONT / 'Roboto-Bold.ttf'))
bungkus = lambda isi: f'<!doctype html><html lang="id"><head><meta charset="utf-8"><title>{m["judul"]}</title><style>{CSS}</style></head><body>{isi}</body></html>'
(SINI / 'sampul.html').write_text(bungkus(H[0]), encoding='utf-8')
isi = ''.join(H[1:]).replace('<section class="hal">', '<section class="awal">', 1)
(SINI / 'laporan.html').write_text(bungkus(isi), encoding='utf-8')
json.dump({k: v for k, v in A.items()}, open(SINI / 'angka.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('html', len(isi) // 1024, 'KB', NOMOR, {k: round(v, 1) if isinstance(v, float) else v for k, v in A.items()})
