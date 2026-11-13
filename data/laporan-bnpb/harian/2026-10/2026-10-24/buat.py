"""Laporan Kejadian Bencana Harian 22-23 Okt 2026 dalam format deck 221026 (berkas pemilik). Tanpa sampul dan penutup (pemilik 23 Okt):
hanya slide 2 (ringkasan + peta + status + yang akan dilakukan) dan 3 (rincian karhutla, kekeringan, bencana lainnya per jenis) digambar ulang, bernomor 1-2,
dengan posisi, warna, ukuran huruf, dan ikon dari 221026; panel Bencana lainnya dipecah per jenis berikon seperti laporan 18-19 Okt.
Angka karhutla = data website (data.py). Tanpa titik tengah di teks tampil. Pakai: python3 -I buat.py ref.pptx keluar.pptx"""
import json, posixpath, re, sys, zipfile
from xml.sax.saxutils import escape
REF, OUT = sys.argv[1], sys.argv[2]
NAVY, ORG, MERAH, KER, SLATE, INK, ABU, TEKS = '051C2C', 'D9600B', 'C8102E', 'B08A3E', '5B7A99', '1A1A1A', '6B7280', '2E3440'
T_NAVY, T_ORG, T_MERAH, T_KER, T_SLATE = 'E6EAF0', 'FBE7D6', 'F8DDE0', 'F4ECDC', 'E3EAF1'
M = 'tpl/ppt/media/'; IK = 'ik/'
N = [300]; MED = {}
def nid(): N[0] += 1; return N[0]
def f0(v): return f'{int(round(v)):,}'.replace(',', '.')
def rpr(sz, b, c, spc=0): return f'<a:rPr lang="id-ID" sz="{sz}"{" b=\"1\"" if b else ""}{f" spc=\"{spc}\"" if spc else ""} dirty="0"><a:solidFill><a:srgbClr val="{c}"/></a:solidFill><a:latin typeface="Roboto"/><a:ea typeface="Roboto"/><a:cs typeface="Roboto"/></a:rPr>'
def tx(x, y, w, h, paras, sz=1000, c=INK, b=False, al='l', an='t', spc=0, wrap='square'):
    ps = ''
    for p in paras:
        runs = [(p, c, b)] if isinstance(p, str) else [r if len(r) == 3 else (r[0], r[1], b) for r in p]
        ps += f'<a:p><a:pPr algn="{al}"><a:buNone/></a:pPr>' + ''.join(f'<a:r>{rpr(sz, rb, rc, spc)}<a:t>{escape(t)}</a:t></a:r>' for t, rc, rb in runs) + f'<a:endParaRPr lang="id-ID" sz="{sz}"/></a:p>'
    return (f'<p:sp><p:nvSpPr><p:cNvPr id="{nid()}" name="T"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="{int(x)}" y="{int(y)}"/><a:ext cx="{max(int(w), 1)}" cy="{max(int(h), 1)}"/></a:xfrm>'
            f'<a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/></p:spPr><p:txBody><a:bodyPr wrap="{wrap}" lIns="0" tIns="0" rIns="0" bIns="0" anchor="{an}"/><a:lstStyle/>{ps}</p:txBody></p:sp>')
def kotak(x, y, w, h, fill=None, geom='rect', ln=None, adj=None, lw=9525):
    av = f'<a:gd name="adj" fmla="val {adj}"/>' if adj is not None else ''
    f = f'<a:solidFill><a:srgbClr val="{fill}"/></a:solidFill>' if fill else '<a:noFill/>'
    l = f'<a:ln w="{lw}"><a:solidFill><a:srgbClr val="{ln}"/></a:solidFill></a:ln>' if ln else '<a:ln><a:noFill/></a:ln>'
    return f'<p:sp><p:nvSpPr><p:cNvPr id="{nid()}" name="K"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="{int(x)}" y="{int(y)}"/><a:ext cx="{max(int(w), 1)}" cy="{max(int(h), 1)}"/></a:xfrm><a:prstGeom prst="{geom}"><a:avLst>{av}</a:avLst></a:prstGeom>{f}{l}</p:spPr></p:sp>'
def garis(x, y, w, c=INK, t=9525, h=0):
    return f'<p:cxnSp><p:nvCxnSpPr><p:cNvPr id="{nid()}" name="L"/><p:cNvCxnSpPr/><p:nvPr/></p:nvCxnSpPr><p:spPr><a:xfrm><a:off x="{int(x)}" y="{int(y)}"/><a:ext cx="{int(w)}" cy="{int(h)}"/></a:xfrm><a:prstGeom prst="line"><a:avLst/></a:prstGeom><a:ln w="{t}"><a:solidFill><a:srgbClr val="{c}"/></a:solidFill></a:ln></p:spPr></p:cxnSp>'
def gambar(x, y, w, h, nama):
    rid = MED.setdefault(nama, f'rIdM{len(MED) + 1}')
    return f'<p:pic><p:nvPicPr><p:cNvPr id="{nid()}" name="G"/><p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr><p:nvPr/></p:nvPicPr><p:blipFill><a:blip r:embed="{rid}"/><a:stretch><a:fillRect/></a:stretch></p:blipFill><p:spPr><a:xfrm><a:off x="{int(x)}" y="{int(y)}"/><a:ext cx="{int(w)}" cy="{int(h)}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr></p:pic>'
# ikon 221026 (media pptx pemilik) + ikon garis buatan ikon.mjs untuk bencana lainnya
I = {'papan_p': M + 'image-2-2.png', 'awas_p': M + 'image-2-3.png', 'papan_n': M + 'image-2-4.png', 'seru_n': M + 'image-2-5.png', 'api_o': M + 'image-2-6.png',
     'daun_k': M + 'image-2-7.png', 'api_m': M + 'image-2-8.png', 'cek_p': M + 'image-2-10.png', 'titik3_p': M + 'image-2-11.png', 'api_p': M + 'image-2-12.png',
     'api_o2': M + 'image-2-13.png', 'heli_p': M + 'image-2-30.png', 'pendaki_p': M + 'image-2-31.png', 'daun_p': M + 'image-2-32.png', 'api_n': M + 'image-3-4.png',
     'rumah_k': M + 'image-3-36.png', 'orang_k': M + 'image-3-37.png', 'tetes_k': M + 'image-3-38.png', 'daun2_p': M + 'image-3-34.png',
     'awas_p2': IK + 'awas-putih.png', 'awas_b': IK + 'awas-baja.png'}
for n in ('gempa', 'api', 'banjir', 'tenda', 'rumah', 'orang', 'hati', 'kalender', 'sampah', 'awas'):
    for w in ('putih', 'slate', 'merah', 'oranye', 'navy'): I[f'{n}_{w}'] = IK + f'{n}-{w}.png'

D = json.load(open('data.json')); KJ = D['kejadian']; ISI = D['isi']; TT = json.load(open('titik.json'))
KH = [x for x in KJ if x['jenis'] == 'karhutla']; KR = [x for x in KJ if x['jenis'] == 'kekeringan']; LN = [x for x in KJ if x['jenis'] not in ('karhutla', 'kekeringan')]
tangani = lambda x: x['tangani']; serius = lambda x: x['perhatian']   # aturannya di data.py, dipakai juga peta.mjs
KH_T = [x for x in KH if tangani(x)]; KH_S = [x for x in KJ if serius(x)];   # perlu perhatian semua jenis
N_SEL = sum(1 for x in KJ if not tangani(x)); N_TOT = len(KJ); N_PROV = len({x['prov'] for x in KJ})
NAMA = {'12': 'Sumatera Utara', '14': 'Riau', '15': 'Jambi', '16': 'Sumatera Selatan', '19': 'Kep. Bangka Belitung', '32': 'Jawa Barat', '33': 'Jawa Tengah', '35': 'Jawa Timur',
        '53': 'Nusa Tenggara Timur', '61': 'Kalimantan Barat', '62': 'Kalimantan Tengah', '71': 'Sulawesi Utara', '72': 'Sulawesi Tengah', '73': 'Sulawesi Selatan',
        '82': 'Maluku Utara', '96': 'Papua Barat Daya', '18': 'Lampung', '76': 'Sulawesi Barat', '74': 'Sulawesi Tenggara', '52': 'Nusa Tenggara Barat', '63': 'Kalimantan Selatan',
        '64': 'Kalimantan Timur', '93': 'Papua Selatan', '95': 'Papua Pegunungan'}
PENDEK = {'12': 'Sum. Utara', '16': 'Sum. Selatan', '19': 'Kep. Babel', '53': 'NTT', '61': 'Kal. Barat', '62': 'Kal. Tengah', '71': 'Sul. Utara', '72': 'Sul. Tengah',
          '73': 'Sul. Selatan', '82': 'Maluku Utara', '96': 'Papua Barat Daya', '52': 'NTB', '76': 'Sul. Barat', '74': 'Sul. Tenggara', '63': 'Kal. Selatan',
          '64': 'Kal. Timur'}
H = lambda t: (t, ORG, True); P = lambda t: (t, INK, True)

def kartu(x, y, ikon, tint, nilai, lab, warna, w=2021373):
    return (kotak(x, y, w, 512064, 'FFFFFF', 'roundRect', ln='BFC5CC', adj=14286) + kotak(x + 109728, y + 91440, 329184, 329184, tint, 'ellipse')
            + gambar(x + 182880, y + 164592, 182880, 182880, I[ikon]) + tx(x + 512064, y + 36576, w - 548640, 274320, [nilai], sz=1700, b=True, c=warna, an='ctr')
            + tx(x + 512064, y + 301752, w - 548640, 155448, [lab], sz=750, c=TEKS))
def pil_bagian(x, y, w, teks, ikon, warna):
    return kotak(x, y, w, 182880, warna, 'roundRect', adj=50000) + gambar(x + 73152, y + 36576, 109728, 109728, I[ikon]) + tx(x + 237744, y, w - 260000, 182880, [teks], sz=660, b=True, c='FFFFFF', spc=100, an='ctr', wrap='none')
def status_ikon(x, y, d, st):
    return kotak(x, y, d, d, ORG if st else NAVY, 'ellipse') + gambar(x + d * .18, y + d * .18, d * .64, d * .64, I['titik3_p' if st else 'cek_p'])
def pil(x, y, teks, fill, warna, ikon=None, sz=620, h=164592, b=True):
    w = 120000 + len(teks) * sz * 62 + (h * .9 if ikon else 0)
    o = kotak(x, y, w, h, fill, 'roundRect', adj=50000)
    if ikon: o += gambar(x + h * .35, y + h * .2, h * .6, h * .6, I[ikon])
    return o + tx(x + (h * .95 if ikon else 0), y, w - (h * .95 if ikon else 0), h, [teks], sz=sz, b=b, c=warna, al='ctr', an='ctr', wrap='none'), w

# ------------------------------------------------------------------ slide 2: ringkasan
def s2():
    o = kotak(548640, 1280160, 8579267, 932688, 'F3F5F8', 'roundRect', adj=7843) + pil_bagian(658368, 1335024, 1525219, 'KEJADIAN BENCANA', 'papan_p', NAVY)
    o += kotak(9402227, 1280160, 2240829, 932688, 'FCF1F2', 'roundRect', adj=7843) + pil_bagian(9511955, 1335024, 1453896, 'PERLU PERHATIAN', 'awas_p', MERAH)
    T = [('papan_n', T_NAVY, f0(ISI['laporan_masuk']), 'laporan kejadian', NAVY), ('seru_n', T_NAVY, f0(N_TOT), 'kejadian menonjol', NAVY),
         ('api_o', T_ORG, f0(len(KH)), 'karhutla', ORG), ('daun_k', T_KER, f0(len(KR)), 'kekeringan', KER), ('awas_b', T_SLATE, f0(len(LN)), 'bencana lainnya', SLATE)]
    kw = (8359811 - 4 * 91440) // 5
    for i, t in enumerate(T): o += kartu(658368 + i * (kw + 91440), 1591056, *t, w=kw)
    o += kartu(9511955, 1591056, 'awas_merah', T_MERAH, f0(len(KH_S)), 'kejadian perlu perhatian', MERAH)
    # peta + lingkaran per provinsi (karhutla jingga bernomor, kekeringan coklat, lainnya biru-abu, ! perlu perhatian)
    MX, MY, MW, MH = 502920, 2331720, 7680960, 2880360
    o += gambar(MX, MY, MW, MH, 'peta.png')
    per = {}
    for x in KJ: per.setdefault(x['prov'], []).append(x)
    KIRI = {'15', '16', '61', '12', '32', '71', '64', '93', '95'}; BAWAH = {'33', '63', '73'}   # label di kiri / di bawah lingkaran supaya tidak menabrak tetangga
    GESER = {'19': (40, 25), '32': (0, 10), '35': (40, 0), '96': (-30, 0), '73': (0, 30), '72': (-20, 0)}
    for p, xs in per.items():
        px, py = TT['pusat'][p]; dx, dy = GESER.get(p, (0, 0)); cx = MX + (px + dx) / TT['PW'] * MW; cy = MY + (py + dy) / TT['PH'] * MH
        nk = sum(1 for x in xs if x['jenis'] == 'karhutla'); nr = sum(1 for x in xs if x['jenis'] == 'kekeringan'); nl = len(xs) - nk - nr
        wl = JENIS_LAIN[next(x['jenis'] for x in xs if x['jenis'] not in ('karhutla', 'kekeringan'))][2] if nl else SLATE
        utama, warna = (nk, ORG) if nk else (nl, wl)
        d = 219456 if utama <= 1 else 265176 if utama <= 3 else 310896
        o += kotak(cx - d / 2, cy - d / 2, d, d, warna, 'ellipse', ln='FFFFFF', lw=19050) + tx(cx - d / 2, cy - d / 2, d, d, [str(utama)], sz=850, b=True, c='FFFFFF', al='ctr', an='ctr')
        for n, w, sdx in ((nr, KER, 1), (nl if nk else 0, wl, -1)):
            if n: s = 155448; o += kotak(cx + sdx * d * .42 - s / 2, cy + d * .42 - s / 2, s, s, w, 'ellipse', ln='FFFFFF', lw=12700) + tx(cx + sdx * d * .42 - s / 2, cy + d * .42 - s / 2, s, s, [str(n)], sz=650, b=True, c='FFFFFF', al='ctr', an='ctr')
        if any(serius(x) for x in xs):
            s = 137160; o += kotak(cx + d * .42 - s / 2, cy - d * .42 - s / 2, s, s, MERAH, 'ellipse', ln='FFFFFF', lw=12700) + tx(cx + d * .42 - s / 2, cy - d * .42 - s / 2, s, s, ['!'], sz=700, b=True, c='FFFFFF', al='ctr', an='ctr')
        nm = PENDEK.get(p, NAMA[p]); yb = max(d / 2 + 27432, d * .42 + 77724 + 18288 if nr or (nl and nk) else 0)   # badge di pinggir lingkaran, tidak menutupi angka; label bawah turun di bawah badge
        o += (tx(cx - d / 2 - 54864 - 1463040, cy - 73152, 1463040, 146304, [nm], sz=750, b=True, al='r', an='ctr') if p in KIRI
              else tx(cx - 731520, cy + yb, 1463040, 146304, [nm], sz=750, b=True, al='ctr', an='ctr') if p in BAWAH
              else tx(cx + d / 2 + 54864, cy - 73152, 1463040, 146304, [nm], sz=750, b=True, an='ctr'))
    lx = 1371600
    for bentuk, w, t, seru in [('rect', ORG, 'karhutla', False), ('ellipse', KER, 'kekeringan', False)] + [('ellipse', v[2], v[0][0].lower() + v[0][1:], False) for k, v in JENIS_LAIN.items() if any(x['jenis'] == k for x in LN)] + [('ellipse', MERAH, 'perlu perhatian', True)]:
        s = 128016 if bentuk == 'rect' else 146304
        o += kotak(lx, 5207508 + (146304 - s) / 2, s, s, w, bentuk) + (tx(lx, 5207508, s, s, ['!'], sz=750, b=True, c='FFFFFF', al='ctr', an='ctr') if seru else '')
        o += tx(lx + s + 54864, 5184648, 1100000, 192024, [t], sz=750, an='ctr'); lx += s + 54864 + len(t) * 52000 + 228600
    # status penanganan
    o += kotak(8503920, 2331720, 3139135, 3017520, 'FFFFFF', 'roundRect', ln='BFC5CC', adj=3000) + tx(8668512, 2441448, 2864815, 182880, ['STATUS PENANGANAN'], sz=750, b=True, c=NAVY, spc=100)
    # padat (pemilik 24 Okt): kotak selesai/dalam penanganan dilebur ke batang berlabel, ruangnya untuk daftar
    BW = 2809951; YB, HB = 2697480, 256032
    SEG = [(N_SEL, NAVY, 'selesai', 'cek_p'), (N_TOT - N_SEL, ORG, 'belum selesai', 'titik3_p')]   # pemilik 24 Okt: selesai dan belum selesai saja
    lw = [max(731520, round(BW * SEG[0][0] / N_TOT))]; lw.append(BW - lw[0]); x0 = 8668512
    for (n, c, lab, ik), w0 in zip(SEG, lw):
        lt = 52000 * (len(lab) + len(f0(n)) + 1); xi = x0 + max(64008, (w0 - lt - 164592) // 2)   # ikon + teks di tengah segmen
        if n: o += kotak(x0, YB, w0, HB, c) + gambar(xi, YB + (HB - 118872) / 2, 118872, 118872, I[ik]) + tx(xi + 164592, YB, lt + 40000, HB, [[(f0(n), 'FFFFFF', True), (f' {lab}', 'FFFFFF', False)]], sz=800, an='ctr', wrap='none')
        x0 += w0
    YH = YB + HB + 91440; YL = YH + 228600
    o += tx(8668512, YH, 2864815, 182880, [f'PERLU PERHATIAN ({len(KH_S)})'], sz=750, b=True, c=MERAH, spc=60)   # pemilik 24 Okt: daftar hanya yang perlu perhatian
    LAIN_T = [x for x in KJ if x['jenis'] != 'karhutla' and tangani(x)]   # kekeringan, gempa, TPA yang masih ditangani ikut tercantum: jumlah baris = kotak dalam penanganan
    daftar = sorted([x for x in KH_S if 'sat' in x], key=lambda x: -x['sat']['sisa']) + [x for x in KH_S if 'sat' not in x]; rp = min(164592, (5280000 - YL) // max(1, len(daftar)))
    for n, x in enumerate(daftar):
        y = YL + n * rp; s = int(rp * .8)
        if n: o += garis(8668512, y - (rp - s) // 2, 2809951, 'F1F2F4')
        kar = x['jenis'] == 'karhutla'
        wj, ij = (ORG, 'api_p') if kar else (KER, 'daun_p') if x['jenis'] == 'kekeringan' else (JENIS_LAIN[x['jenis']][2], JENIS_LAIN[x['jenis']][1] + '_putih')
        o += kotak(8668512, y, s, s, wj, 'ellipse') + gambar(8668512 + s * .19, y + s * .19, s * .62, s * .62, I[ij])
        if False:   # tanda ! sama dengan peta, supaya 10 baris ini terbaca 8 perlu perhatian
            b = s * .55; o += kotak(8668512 + s * .7, y - s * .2, b, b, MERAH, 'ellipse', ln='FFFFFF', lw=6350) + tx(8668512 + s * .7, y - s * .2, b, b, ['!'], sz=500, b=True, c='FFFFFF', al='ctr', an='ctr')
        nm = [(NAMA[x['prov']], INK, True)] + ([(', ' + x['lokasi'], TEKS, False)] if x['lokasi'] else [])
        o += tx(8869680, y - (164592 - s) // 2, 1758391, 164592, [nm], sz=680, an='ctr', wrap='none')
        if not kar:
            ikp = {'kekeringan': 'daun_k', 'gempabumi': 'gempa_slate', 'banjir': 'banjir_slate'}.get(x['jenis'], 'sampah_slate')
            o += kotak(10545775, y, 932688, s, 'F3F5F8', 'roundRect', adj=50000) + gambar(10609783, y + s * .16, s * .68, s * .68, I[ikp]) + tx(10746943, y, 713232, s, [x['utama'].replace('jiwa ', '').replace('± ', '±')], sz=620, b=True, c=INK, an='ctr', wrap='none'); continue
        sis = f"sisa ± {f0(x['sat']['sisa'])} ha" if x['sat']['sisa'] else 'sisa –'
        o += kotak(10545775, y, 932688, s, T_ORG, 'roundRect', adj=50000) + gambar(10609783, y + s * .16, s * .68, s * .68, I['api_o2']) + tx(10746943, y, 713232, s, [sis], sz=620, b=True, c=ORG, an='ctr', wrap='none')
    # yang akan dilakukan
    o += kotak(548640, 5468112, 11094415, 822960, 'FDF4EC', 'roundRect', adj=8889) + tx(694944, 5541264, 3657600, 182880, ['YANG AKAN DILAKUKAN BNPB'], sz=750, b=True, c=ORG, spc=100)
    for i, (ik, jd, isi) in enumerate(TINDAK):
        x = 694944 + i * 3600602
        if i: o += garis(x - 73152, 5797296, 0, 'F2D3BA', h=457200)
        o += kotak(x, 5815584, 329184, 329184, ORG, 'ellipse') + gambar(x + 73152, 5888736, 182880, 182880, I[ik])
        o += tx(x + 420624, 5760720, 3051962, 201168, [jd], sz=900, b=True) + tx(x + 420624, 5961888, 3051962, 329184, isi, sz=720, c=TEKS)
    return o

# ------------------------------------------------------------------ slide 3: rincian
def kepala(x, y, w, warna, tint, ikon, nama, n, h=457200):
    return (kotak(x, y, w, h, tint, 'roundRect', adj=16000) + kotak(x, y + h * .6, w, h * .4, tint) + kotak(x + 128016, y + (h - 292608) / 2, 292608, 292608, warna, 'ellipse')
            + gambar(x + 182880, y + (h - 182880) / 2, 182880, 182880, I[ikon]) + tx(x + 502920, y, w - 1100000, h, [nama], sz=1100, b=True, an='ctr')
            + tx(x + w - 640080, y, 512064, h, [str(n)], sz=1800, b=True, c=warna, al='r', an='ctr'))
def s3():
    o = kotak(548640, 1325880, 6720840, 5029200, 'FFFFFF', 'roundRect', ln='BFC5CC', adj=2000) + kepala(548640, 1325880, 6720840, ORG, T_ORG, 'api_p', 'Karhutla', len(KH))
    for t, x, w, al in (('LOKASI', 676656, 2194560, 'l'), ('TERBAKAR 1 JAN–23 OKT', 3291840, 1280160, 'l'), ('23 OKT: HOTSPOT, SISA', 4617720, 2523744, 'ctr')):
        o += tx(x, 1856232, w, 164592, [t], sz=650, b=True, c=ABU, spc=60, al=al)
    o += garis(676656, 2039112, 6464808, INK)
    baris = []
    for p in dict.fromkeys(x['prov'] for x in KH):
        xs = [x for x in KH if x['prov'] == p]
        if len(xs) > 1: baris.append(('grup', p, xs))
        baris += [('anak' if len(xs) > 1 else 'satu', p, [x]) for x in xs]
    y0, yb = 2057400, 6300000; rp = (yb - y0) // len(baris); k = rp / 300446
    sz_n, sz_p = (int(920 * max(k, .78)), int(760 * max(k, .8))) if k < 1 else (920, 760)
    for n, (jenis, p, xs) in enumerate(baris):
        y = y0 + n * rp
        if n and jenis != 'grup': o += garis(676656, y, 6464808, 'EEF0F3')
        if jenis == 'grup':
            tot = sum(x['sat']['kum'] for x in xs); ph = int(rp * .62)
            o += kotak(676656, y + rp * .06, 6464808, rp * .88, 'F7F8FA') + tx(749808, y, 1645920, rp, [NAMA[p]], sz=sz_n, b=True, an='ctr')
            wn = 1645920 if len(NAMA[p]) > 14 else 1040000
            o += kotak(749808 + wn - 80000, y + (rp - ph) / 2, 638251, ph, T_ORG, 'roundRect', adj=50000) + gambar(749808 + wn - 80000 + ph * .35, y + (rp - ph) / 2 + ph * .2, ph * .6, ph * .6, I['api_o2']) + tx(749808 + wn - 80000 + ph * .8, y + (rp - ph) / 2, 638251 - ph * .8, ph, [f'{len(xs)} kejadian'], sz=int(sz_p * .9), b=True, c=ORG, al='ctr', an='ctr')
            o += kotak(3291840, y + (rp - ph) / 2, 1005840, ph, 'FFFFFF', 'roundRect', ln='F2C9A8', adj=50000) + gambar(3291840 + ph * .4, y + (rp - ph) / 2 + ph * .2, ph * .6, ph * .6, I['api_o2']) + tx(3291840 + ph * .8, y + (rp - ph) / 2, 1005840 - ph * .8, ph, [f'total ± {f0(tot)} ha'], sz=int(sz_p * .95), b=True, al='ctr', an='ctr')
            continue
        x = xs[0]; s = x['sat']; ind = 164592 if jenis == 'anak' else 0; d = int(min(201168, rp * .66))
        o += status_ikon(676656 + ind, y + (rp - d) / 2, d, tangani(x))
        nm = [(x['lokasi'], INK, False)] if jenis == 'anak' else [(NAMA[p], INK, True)] + ([(', ' + x['lokasi'], INK, False)] if x['lokasi'] else [])
        o += tx(950976 + ind, y, 2112264 - ind, rp, [nm], sz=sz_n, an='ctr', wrap='none')
        o += tx(3291840, y, 1234440, rp, [f"±  {f0(s['kum'])} ha"], sz=int(sz_n * .98), b=True, an='ctr')
        if tangani(x):
            ph = int(min(210312, rp * .7)); yy = y + (rp - ph) / 2; ic = int(ph * .65)
            o += kotak(4739006, yy, 1052584, ph, T_NAVY, 'roundRect', adj=50000) + gambar(4812158, yy + (ph - ic) / 2, ic, ic, I['api_n']) + tx(4985894, yy, 796552, ph, [f"{f0(s['hot'])} hotspot"], sz=sz_p, b=True, c=NAVY, an='ctr', wrap='none')
            sis = f"sisa ± {f0(s['sisa'])} ha" if s['sisa'] else 'sisa –'
            o += kotak(5864742, yy, 1155436, ph, T_ORG, 'roundRect', adj=50000) + gambar(5937894, yy + (ph - ic) / 2, ic, ic, I['api_o2']) + tx(6111630, yy, 899404, ph, [sis], sz=sz_p, b=True, c=ORG, an='ctr', wrap='none')
    QX, QW = 7406640, 4236415; XL, XR = 7571232, 11478463
    # bencana lainnya (dibangun dulu untuk tahu tingginya): satu bagian per jenis, tiap bagian berpita ikon + jumlah, kejadian di bawahnya
    lain, yy, SEK = '', 0, []
    for jn, (nama, ikon, warna, tint) in JENIS_LAIN.items():
        xs = [x for x in LN if x['jenis'] == jn]
        if not xs: continue
        if yy: yy += 54864
        SEK.append(yy)
        lain += f'@{yy}@' + kotak(XL, 0, XR - XL, 182880, 'F3F5F8', 'roundRect', adj=30000) + kotak(XL + 45720, 18288, 146304, 146304, warna, 'ellipse') + gambar(XL + 73152, 45720, 91440, 91440, I[f'{ikon}_putih'])
        p_, w_ = pil(XL + 300000 + len(nama) * 64000, 27432, f'{len(xs)} kejadian', tint, warna, ikon={'gempa': 'gempa_slate', 'api': 'api_merah', 'banjir': 'banjir_navy'}[ikon], sz=580, h=128016)
        lain += tx(XL + 237744, 0, 1600000, 182880, [nama], sz=820, b=True, an='ctr', wrap='none') + p_ + '@@'
        yy += 182880 + 18288
        for x in xs:
            dt = DETAIL[(x['prov'], x['lokasi'])]
            lain += f'@{yy}@' + status_ikon(XL + 18288, 18288, 146304, tangani(x)) + tx(XL + 219456, 0, 2286000, 182880, [[(NAMA[x['prov']], INK, True)] + ([(', ' + x['lokasi'], INK, False)] if x['lokasi'] else [])], sz=760, an='ctr', wrap='none')
            px_ = XR; pills = ''
            px_ -= 18288
            for t, f, c, ik in reversed(dt.get('pil', [])):
                ww = 120000 + len(t) * 600 * 62 + (164592 * .9 if ik else 0); px_ -= ww; pills += pil(px_, 9144, t, f, c, ik, sz=600, h=164592)[0]; px_ -= 36576
            lain += pills + '@@'
            yy += 182880 + 9144
            if dt.get('stat'):
                sw = (XR - XL - 219456 - 2 * 45720) // len(dt['stat']); sx = XL + 219456
                lain += f'@{yy}@'
                for v, lab, ik, c in dt['stat']:
                    lain += kotak(sx, 0, sw, 320040, 'F7F8FA', 'roundRect', adj=14000) + gambar(sx + 64008, 45720, 118872, 118872, I[ik]) + tx(sx + 219456, 18288, sw - 240000, 164592, [v], sz=950, b=True, c=c, an='ctr', wrap='none')
                    lain += tx(sx + 64008, 182880, sw - 100000, 118872, [lab], sz=620, c=TEKS, an='ctr', wrap='none')
                    sx += sw + 45720
                lain += '@@'; yy += 320040 + 18288
            yy += 9144
    LH = 411480 + yy + 64008
    # pemilik 24 Okt: ruang kosong di dalam kontainer dipadatkan. Panel kekeringan setinggi isinya; sisa ruang dibagi rata sebagai jarak antarjenis
    # di panel bencana lainnya
    KB_isi = 2304288 + 320040 * (len(KR) + (len(KR) > 1)) + 137160
    if KR and 6007608 - (KB_isi + 91440) >= LH:
        LY = KB_isi + 91440; extra = 0   # panel lainnya langsung di bawah, setinggi isinya
    else: LY = 6007608 - LH; extra = 0
    tambah = lambda y0: extra * sum(1 for s0 in SEK[1:] if s0 <= y0) // len(SEK) + extra // (2 * len(SEK)) if SEK else 0
    # kekeringan: baris per kabupaten (lokasi, terdampak, bantuan air) di atas panel bencana lainnya
    KB = LY - 91440
    o += kotak(QX, 1325880, QW, KB - 1325880, 'FFFFFF', 'roundRect', ln='BFC5CC', adj=3000) + kepala(QX, 1325880, QW, KER, T_KER, 'daun2_p', 'Kekeringan', len(KR))
    for p in dict.fromkeys(x['prov'] for x in KR):
        xs = [x for x in KR if x['prov'] == p]
        angka = lambda t: int(re.sub(r'[^0-9]', '', t) or 0)
        tkk, tjw, tl = sum(angka(x['utama']) for x in xs), sum(angka(x['kedua']) for x in xs), sum(angka(x['ket']) for x in xs)
        o += tx(XL, 1856232, 1828800, 201168, [NAMA[p]], sz=950, b=True, an='ctr') + kotak(8458200, 1883664, 640080, 146304, T_KER, 'roundRect', adj=50000) + gambar(8458200 + 51206, 1883664 + 29261, 87782, 87782, I['daun_k']) + tx(8458200 + 117043, 1883664, 640080 - 117043, 146304, [f'{len(xs)} kejadian'], sz=620, b=True, c='8A6A2E', al='ctr', an='ctr')
        pass   # total jadi baris pertama tabel (gaya 18-19), lihat di bawah
        for t, x0 in (('LOKASI', XL), ('TERDAMPAK', 8686800), ('BANTUAN AIR', 10241280)): o += tx(x0, 2121408, 1200000, 146304, [t], sz=620, b=True, c=ABU, spc=60)
        o += garis(XL, 2286000, XR - XL, INK)
        tot = len(xs) > 1   # baris TOTAL hanya bila lebih dari satu kabupaten
        rp = min(320040, (KB - 91440 - 2304288) // (len(xs) + tot))
        # baris TOTAL berpita abu: rumah + KK + jiwa, tetes + liter (ikon sama dengan baris kabupaten)
        y = 2304288
        if tot:
            o += kotak(XL, y + rp * .08, XR - XL, rp * .84, 'F3F5F8', 'roundRect', adj=12000) + tx(XL + 91440, y, 1000000, rp, ['TOTAL'], sz=700, b=True, c=ABU, spc=60, an='ctr')
            o += gambar(8686800, y + (rp - 109728) / 2, 109728, 109728, I['rumah_k']) + tx(8832000, y, 1380000, rp, [[(f'{f0(tkk)} KK', INK, True), (f'  {f0(tjw)} jiwa', TEKS, False)]], sz=800, an='ctr', wrap='none')
            o += kotak(10241280, y + (rp - 155448) / 2, 1237183, 155448, 'FFFFFF', 'roundRect', ln='B08A3E', adj=50000) + gambar(10296144, y + (rp - 155448) / 2 + 27432, 100584, 100584, I['tetes_k'])
            o += tx(10424160, y + (rp - 155448) / 2, 1030000, 155448, [[(f'{f0(tl)} liter', '8A6A2E', True), (f', {sum(int(TANGKI[x["lokasi"]].split()[0]) for x in xs)} tangki', TEKS, False)]], sz=700, an='ctr', wrap='none')
        for n, x in enumerate(xs):
            y = 2304288 + (n + tot) * rp; kk = x['utama'].replace('±', '').strip(); jw = x['kedua'] or 'dalam pendataan'
            if n: o += garis(XL, y, XR - XL, 'EEF0F3')
            o += status_ikon(XL, y + (rp - 164592) / 2, 164592, True) + tx(XL + 228600, y, 1100000, rp, [x['lokasi']], sz=850, b=True, an='ctr')
            o += gambar(8686800, y + (rp - 109728) / 2, 109728, 109728, I['rumah_k']) + tx(8832000, y, 640000, rp, [kk], sz=800, b=True, an='ctr', wrap='none') + gambar(8832000 + 676656, y + (rp - 109728) / 2, 109728, 109728, I['orang_k']) + tx(8832000 + 822960, y, 760000, rp, [jw], sz=800, c=TEKS, an='ctr', wrap='none')
            o += kotak(10241280, y + (rp - 155448) / 2, 1237183, 155448, 'FFFFFF', 'roundRect', ln='E2D3B5', adj=50000) + gambar(10296144, y + (rp - 155448) / 2 + 27432, 100584, 100584, I['tetes_k'])
            o += tx(10424160, y + (rp - 155448) / 2, 1030000, 155448, [[(x['ket'], INK, True), (f", {TANGKI.get(x['lokasi'], '')}", TEKS, False)]], sz=700, an='ctr', wrap='none')
    o += kotak(QX, LY, QW, LH, 'FFFFFF', 'roundRect', ln='BFC5CC', adj=4000) + kepala(QX, LY, QW, SLATE, T_SLATE, 'awas_p2', 'Bencana lainnya', len(LN), h=365760)
    o += re.sub(r'@(\d+)@(.*?)@@', lambda m: geser(m.group(2), LY + 411480 + int(m.group(1)) + tambah(int(m.group(1)))), lain, flags=re.S)
    # keterangan
    ket = ''
    ket += kotak(QX, 6080760, QW, 274320, 'F7F8FA', 'roundRect', adj=30000) + tx(7974025, 6080760, 868680, 274320, ['KETERANGAN'], sz=680, b=True, spc=100, an='ctr')
    for x0, w, ik, t in ((9117025, NAVY, 'cek_p', 'selesai'), (10011308, ORG, 'titik3_p', 'dalam penanganan')):
        ket += kotak(x0, 6140196, 155448, 155448, w, 'ellipse') + gambar(x0 + 32004, 6172200, 91440, 91440, I[ik]) + tx(x0 + 210312, 6080760, 1064362, 274320, [t], sz=750, an='ctr')
    o += geser(ket, LY + LH + 73152 - 6080760)   # keterangan menempel di bawah panel lainnya
    return o
def geser(xml, dy):   # baris bencana lainnya digambar relatif y=0, lalu digeser ke tempatnya
    return re.sub(r'<a:off x="(\d+)" y="(-?\d+)"/>', lambda m: f'<a:off x="{m.group(1)}" y="{int(m.group(2)) + dy}"/>', xml)

TANGKI = {'Pekalongan': '17 tangki'}
JENIS_LAIN = {'gempabumi': ('Gempa bumi', 'gempa', SLATE, T_SLATE), 'lainnya': ('Kebakaran TPA', 'api', 'A23B2A', 'F5E1DD'), 'banjir': ('Banjir', 'banjir', '2F6FB5', 'DCE7F5')}
DETAIL = {('53', ''): {'pil': [('Transisi s.d. 27 Des', T_ORG, ORG, 'kalender_oranye'), ('193 huntara', T_NAVY, NAVY, 'rumah_navy')],
                       'stat': [('±27.563', 'jiwa mengungsi', 'tenda_slate', SLATE), ('156', 'jiwa meninggal', 'hati_merah', MERAH), ('118.834', 'rumah rusak', 'rumah_slate', SLATE)]},
          ('35', 'TPA Supit Urang'): {'pil': [('± 15,5 ha terbakar', 'F7F8FA', INK, 'sampah_slate'), ('pendinginan', T_ORG, ORG, 'api_oranye')]}}
KK_KER = sum(int(x['utama'].replace('±', '').replace('KK', '').replace('.', '').strip()) for x in KR)
TINDAK = [('heli_p', 'Pemadaman prioritas', ['•  TN Tanjung Puting masih terbakar ±1.407 ha, pemadaman udara', '•  Karanganyar dan Lampung Timur (TNWK) masih pemadaman']),
          ('pendaki_p', 'Keselamatan warga', ['•  Masker dan layanan ISPA di Pangkalan Bun, Kota Jambi, Palangka Raya, dan Palembang, kota dengan PM2.5 Berbahaya']),
          ('daun_p', 'Air bersih', [f'•  Distribusi air bersih untuk ±{f0(KK_KER)} KK di Kab. Pekalongan', '•  Sudah tersalur 17 tangki, 71.000 liter'])]
N_LAIN = len(LN)
J2 = [P('Laporan 23–24 Oktober 2026: '), H(f0(N_TOT)), P(' kejadian menonjol di '), H(f'{N_PROV} provinsi'), P(', terdiri atas '), H(f0(len(KH))), P(' karhutla, '),
      H(f0(len(KR))), P(' kekeringan, dan '), H(f0(N_LAIN)), P(' bencana lainnya; '), H(f0(len(KH_T))), P(' karhutla masih dalam proses penanganan')]
J3 = [P('Rincian '), H(f0(N_TOT)), P(' kejadian menonjol: '), H(f0(len(KH))), P(' karhutla ('), H(f0(len(KH_T))), P(' di antaranya masih dalam proses penanganan), '),
      H(f0(len(KR))), P(' kekeringan di Jawa Tengah, dan '), H(f0(N_LAIN)), P(' bencana lainnya')]

zi = zipfile.ZipFile(REF); F = {n: zi.read(n) for n in zi.namelist()}
GEO = r'<a:off x="(\d+)" y="(\d+)"/>\s*<a:ext cx="(\d+)" cy="(\d+)"/>'
for i, judul, fn, szj in ((2, J2, s2, 2000), (3, J3, s3, 2200)):   # judul selalu dua baris (pemilik): slide 2 lebih panjang, hurufnya sedikit lebih kecil
    N[0] = 300; MED.clear()
    sk = F[f'ppt/slides/slide{i}.xml'].decode(); a = sk.index('</p:grpSpPr>') + len('</p:grpSpPr>'); b = sk.index('</p:spTree>')
    simpan = []
    for blk in re.findall(r'<p:sp>.*?</p:sp>|<p:pic>.*?</p:pic>|<p:cxnSp>.*?</p:cxnSp>', sk[a:b], re.S):
        g = re.search(GEO, blk); g = tuple(map(int, g.groups())) if g else None
        if blk.startswith('<p:pic>') and 'r:embed="rId1"' in blk: simpan.append(blk); continue
        if g and ((g[3] == 0 and g[1] in (1207008, 6446520)) or g[1] == 6510528): simpan.append(blk)
    body = fn()
    jd = tx(548640, 292608, 10454335, 822960, [[(t, c, True) for t, c, _ in judul]], sz=szj, an='b')
    F[f'ppt/slides/slide{i}.xml'] = (sk[:a] + ''.join(simpan) + jd + body + sk[b:]).encode()
    rel = F[f'ppt/slides/_rels/slide{i}.xml.rels'].decode()
    lain = ''.join(r for r in re.findall(r'<Relationship [^>]*/>', rel) if 'Id="rId1"' in r or '/image"' not in r)
    F[f'ppt/slides/_rels/slide{i}.xml.rels'] = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' + lain
        + ''.join(f'<Relationship Id="{r}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/h23-{nm.replace("/", "-")}"/>' for nm, r in MED.items()) + '</Relationships>').encode()
    for nm in MED: F[f'ppt/media/h23-{nm.replace("/", "-")}'] = open(nm, 'rb').read()
# sampul dan penutup = slide 1 dan 4 templat 221026 dengan tanggal diganti (pemilik 24 Okt: "tetap kasih cover dan penutup")
GANTI = {1: [('21 Okt 2026, 07.00  –  22 Okt 2026, 07.00 WIB', '23 Okt 2026, 07.00  –  24 Okt 2026, 07.00 WIB'), ('Kamis, 22 Oktober 2026', 'Sabtu, 24 Oktober 2026')],
         4: [('Laporan Kejadian Bencana Harian, 21–22 Oktober 2026', 'Laporan Kejadian Bencana Harian, 23–24 Oktober 2026')]}
for i, gs in GANTI.items():
    s = F[f'ppt/slides/slide{i}.xml'].decode()
    for a_, b_ in gs: assert s.count(a_) == 1, a_; s = s.replace(a_, b_)
    F[f'ppt/slides/slide{i}.xml'] = s.encode()
# penutup: penunjuk lampiran dibuang, deck ini tanpa lampiran (pemilik 23 Okt: "Hilangkan")
s = F['ppt/slides/slide4.xml'].decode(); blk = [b for b in re.findall(r'<p:sp>.*?</p:sp>', s, re.S) if 'Lampiran (data rinci)' in b]
assert len(blk) == 1; F['ppt/slides/slide4.xml'] = s.replace(blk[0], '').encode()
for i in (1, 2, 3, 4):
    assert '·' not in re.sub(r'<[^>]+>', '', F[f'ppt/slides/slide{i}.xml'].decode()), f'titik tengah di slide {i}'
dipakai = set()   # media yang tidak dirujuk rels mana pun (foto sampul/penutup, ikon templat yang diganti) dibuang
for n, v in F.items():
    if n.endswith('.rels'):
        dipakai |= {t[1:] if t.startswith('/') else posixpath.normpath(posixpath.join(posixpath.dirname(posixpath.dirname(n)), t)) for t in re.findall(r'Target="([^"]+)"', v.decode())}
for n in [n for n in F if n.startswith('ppt/media/') and n not in dipakai]: del F[n]
ct = F['[Content_Types].xml'].decode()
F['[Content_Types].xml'] = re.sub(r'<Override PartName="/([^"]+)"[^>]*/>', lambda m: m.group(0) if m.group(1) in F else '', ct).encode()
zo = zipfile.ZipFile(OUT, 'w', zipfile.ZIP_DEFLATED)
for n in ['[Content_Types].xml'] + [n for n in F if n != '[Content_Types].xml']: zo.writestr(n, F[n])
zo.close(); print('ok', OUT, 'karhutla', len(KH), 'dalam penanganan', len(KH_T), 'perlu perhatian', [x['lokasi'] or x['prov'] for x in KH_S], 'selesai', N_SEL, '/', N_TOT, 'provinsi', N_PROV)
