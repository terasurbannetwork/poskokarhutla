"""Perbarui deck 'Laporan Penanganan Pengendalian Karhutla' ke angka baru tanpa membangun ulang dari templat BNPB.
Env opsional: FIRESPOT (keluaran firespot.py: kartu + kolom firespot di slide peta), URUT_HARI (indeks hari acuan urutan baris, bawaan 3), PETA_ANGKA (angka_nasional lain untuk slide peta).
Pakai: python3 -I perbarui.py <masuk.pptx> <angka_nasional.json> <keluar.pptx> "<cut-off>" ["<catatan sementara>"]
angka_nasional.json: 'hari' = 4 tanggal (indeks 0 = pembanding), 'prov' = hot/luas/belum/padam per provinsi (keluaran hitung_nasional.py).
- slide1.xml (tabel 6 provinsi): baris = 6 provinsi teratas hari terakhir (lihat pindah_baris); batang, label, panah, jumlah, subjudul, tanggal kolom, judul diganti di tempat.
  Pil PM2.5 dan cuaca tidak disentuh.
- slide4.xml (peta): isi panel dibangun ulang dengan kode tambah_peta.py (../satelit-2026-10-23/), peta dari peta.png.
- slide3.xml (operasi): tidak disentuh."""
import json, math, os, re, sys, zipfile
from datetime import date
REPO = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..'))   # akar repo: tiga tingkat di atas berkas ini
MASUK, AN, KELUAR, CUTOFF = sys.argv[1:5]; CATATAN = sys.argv[5] if len(sys.argv) > 5 else ''
J = json.load(open(AN)); A = J['prov']; HARI = [date.fromisoformat(d) for d in J['hari']]
NAMA = {k: v['nama'] for k, v in json.load(open(os.path.join(REPO, 'public', 'data', 'laporan.json')))['prov'].items()}
KODE = {v: k for k, v in NAMA.items()}
def bul(v): return int(math.floor(v + 0.5))
def f0(v): return f"{bul(v):,}".replace(',', '.')
def okt(d): return f'{d.day} Okt'
def rep(s, a, b, n=1):
    assert s.count(a) == n, (a, s.count(a)); return s.replace(a, b)
z = zipfile.ZipFile(MASUK); F = {n: z.read(n) for n in z.namelist()}; z.close()
GEOM = re.compile(r'<a:off x="(\d+)" y="(\d+)"/>\s*<a:ext cx="(\d+)" cy="(\d+)"/>')
def geom(b):
    o = GEOM.search(b); return tuple(map(int, o.groups())) if o else None
def setgeom(b, x, y, cx, cy): return GEOM.sub(f'<a:off x="{x}" y="{y}"/><a:ext cx="{cx}" cy="{cy}"/>', b, 1)
def settext(b, t):
    lama = re.findall(r'<a:t>[^<]*</a:t>', b); assert len(lama) == 1, lama; return b.replace(lama[0], f'<a:t>{t}</a:t>')
def setcol_text(b, c): return re.sub(r'(<a:rPr[^>]*>\s*<a:solidFill><a:srgbClr val=")\w+', r'\g<1>' + c, b)
def setcol_fill(b, c): return re.sub(r'(<p:spPr>.*?<a:solidFill><a:srgbClr val=")\w+', r'\g<1>' + c, b, count=1, flags=re.S)
NAIK, TURUN, ABU = 'D9600B', '2F86D1', 'A9B4C2'
def banding(cur, prev):   # sama dengan ganti.py
    if not prev: return ('', ABU, ABU) if cur else ('0%', '6B7280', ABU)
    p = bul((cur - prev) / prev * 100)
    if p > 0: return (f'▲{f0(p)}%', NAIK, NAIK)
    if p < 0: return (f'▼{f0(-p)}%', TURUN, TURUN)
    return ('0%', '6B7280', ABU)

# ---------- slide tabel ----------
LX = {'hot': [4663440, 5372913, 6082386], 'luas': [6974738, 7684211, 8393684], 'belum': [9286037, 9995510, 10704982]}
BX = {'hot': [4914907, 5624380, 6333853], 'luas': [7226206, 7935678, 8645151], 'belum': [9537504, 10246977, 10956450]}
T0, PB, H, AOFF = 2167128, 518160, 118872, 9144
BASE = [T0 + i * PB + 338328 for i in range(6)]
s1 = F['ppt/slides/slide1.xml'].decode()
SH = lambda s: list(re.finditer(r'<p:sp>.*?</p:sp>', s, re.S))
ROW = []   # kode provinsi per baris, dari teks nama di kolom provinsi
for base in BASE:
    nm = [re.findall(r'<a:t>([^<]*)</a:t>', m.group(0))[0] for m in SH(s1) if (g := geom(m.group(0))) and g[0] == 1225296 and base - PB < g[1] < base]
    assert len(nm) == 1, nm; ROW.append(KODE[nm[0]])
# baris = 6 provinsi teratas hari terakhir, urut hotspot. Isi kiri tiap baris (lambang, nama, pil) dan batang/label/panah digeser ke pita baru;
# latar pita dan garis dasar tetap. Provinsi baru menempati baris provinsi yang keluar: nama dan lambang (public/lambang/provinsi) diganti,
# pil PM2.5 dan cuaca dibuang karena laporan Koordalops tidak memuatnya.
URUT = int(os.environ.get('URUT_HARI', 3))   # hari acuan urutan baris; 2 = hari sebelum hari terakhir (hari terakhir sementara)
BARU = sorted(A, key=lambda k: -A[k]['hot'][URUT])[:6]
masuk = [k for k in BARU if k not in ROW]; keluar = [k for k in ROW if k not in BARU]
GANTI = dict(zip(keluar, masuk)); LAMBANG = {}
def pindah_baris(s):
    def f(m):
        b = m.group(0); g = geom(b)
        if not g or g[0] == 621792 and g[2] == 10948111 or g[2] == 2128418 and g[3] == 7315 or not T0 <= g[1] < T0 + 6 * PB: return b
        i = (g[1] - T0) // PB; k = ROW[i]; k2 = GANTI.get(k, k); j = BARU.index(k2)
        x, y, cx, cy = g; y += (j - i) * PB
        if k2 != k:
            if 2790000 <= x < 4650000: return ''
            if x == 1225296: b = settext(b, NAMA[k2]); cx = 1621048 if len(NAMA[k2]) <= 17 else 1711025
            if b.startswith('<p:pic>') and x < 1225296:
                rid = f'Lambang{k2}'; LAMBANG[rid] = k2
                b = re.sub(r'r:embed="\w+"', f'r:embed="{rid}"', b)
                import struct; pw, ph = struct.unpack('>II', open(os.path.join(REPO, 'public', 'lambang', 'provinsi', f'{k2}.png'), 'rb').read()[16:24])
                mx_, my_ = x + cx // 2, y + cy // 2; cx = 341757; cy = round(cx * ph / pw); x, y = mx_ - cx // 2, my_ - cy // 2
        return setgeom(b, x, y, cx, cy)
    return re.sub(r'<p:(sp|pic)>.*?</p:\1>', f, s, flags=re.S)
if BARU != ROW:
    s1 = pindah_baris(s1); ROW = BARU
def ubah(s, cocok, fn):
    hit = [m for m in SH(s) if (g := geom(m.group(0))) and cocok(*g)]
    assert len(hit) == 1, len(hit); m = hit[0]
    return s[:m.start()] + fn(m.group(0)) + s[m.end():]
for base, k in zip(BASE, ROW):
    for grp in ('hot', 'luas', 'belum'):
        v = A[k][grp]; tiga = v[1:4]; mx = max(tiga) or 1
        for i in range(3):
            h = max(18288, round(H * tiga[i] / mx)); top = base - h
            arr, ct, cb = banding(bul(tiga[i]), bul(v[i]))
            s1 = ubah(s1, lambda x, y, cx, cy: x == BX[grp][i] and cx == 297979 and base - H - 1 <= y < base, lambda b: setcol_fill(setgeom(b, BX[grp][i], top, 297979, h), cb))
            s1 = ubah(s1, lambda x, y, cx, cy: x == LX[grp][i] and cy == 164592 and base - H - 173736 - 1 <= y < base, lambda b: settext(setgeom(b, LX[grp][i], top - 173736, 800913, 164592), f0(tiga[i])))
            s1 = ubah(s1, lambda x, y, cx, cy: x == LX[grp][i] and y == base + AOFF and cy == 128016, lambda b: setcol_text(settext(b, arr), ct))
for grp in ('hot', 'luas', 'belum'):
    for i in range(3):
        tot = sum(bul(A[k][grp][i + 1]) for k in ROW)
        s1 = ubah(s1, lambda x, y, cx, cy: x == LX[grp][i] and y == 5330952, lambda b: settext(b, f0(tot)))
sub = [m for m in SH(s1) if '<a:off x="548640" y="905256"/>' in m.group(0)]; assert len(sub) == 1
b0 = sub[0].group(0); t = re.findall(r'<a:t>[^<]*</a:t>', b0); assert len(t) == 11, t
L1 = sum(bul(A[k]['luas'][1]) for k in ROW); D3 = sum(bul(A[k]['padam'][3]) for k in ROW); B3 = sum(bul(A[k]['belum'][3]) for k in ROW)
baru = [t[0], t[1], f'<a:t>{f0(D3)} ha</a:t>', t[3], f'<a:t>{bul(D3 / L1 * 100)} persen</a:t>', t[5], f'<a:t>{f0(L1)} ha</a:t>',
        f'<a:t> api {okt(HARI[1])} telah padam pada </a:t>', f'<a:t>{HARI[3].day}</a:t>', t[9], f'<a:t>{f0(B3)} ha</a:t>']
it = iter(baru); b1 = re.sub(r'<a:t>[^<]*</a:t>', lambda m: next(it), b0)
s1 = s1[:sub[0].start()] + b1 + s1[sub[0].end():]
jud = [m for m in SH(s1) if '<a:off x="548640" y="274320"/>' in m.group(0)]; assert len(jud) == 1
jb = re.sub(r'<a:t>\d+</a:t>', f'<a:t>{HARI[3].day}</a:t>', jud[0].group(0), count=1)
s1 = s1[:jud[0].start()] + jb + s1[jud[0].end():]
lama = re.findall(r'<a:t>(\d+ Okt)</a:t>', s1)
assert len(lama) == 9, lama
it = iter([okt(HARI[i]) for _ in range(3) for i in (1, 2, 3)])
s1 = re.sub(r'<a:t>\d+ Okt</a:t>', lambda m: f'<a:t>{next(it)}</a:t>', s1)

# ---------- slide peta (kode tambah_peta.py) ----------
I, IP = 3, 2
s1_asli = s1
# FIRESPOT (env, opsional) = keluaran firespot.py: {'prov': {kode: [titik hari sebelumnya, titik hari terakhir]}, 'titik': [...]}
KL = json.load(open(os.environ['FIRESPOT'])) if os.environ.get('FIRESPOT') else None
FSP = KL['prov'] if KL else None
A_TABEL = A
if os.environ.get('PETA_ANGKA'): A = json.load(open(os.environ['PETA_ANGKA']))['prov']   # slide peta boleh memakai hari lain
s1 = F['ppt/slides/slide4.xml'].decode()
head, tree_tail = s1.split('<p:spTree>', 1); tree, tail = tree_tail.split('</p:spTree>', 1)
shapes = [m.group(0) for m in re.finditer(r'<p:(sp|pic|cxnSp|grpSp)>.*?</p:\1>', tree, re.S)]
pre = tree[:tree.index(shapes[0])]
keep = [b for b in shapes if geom(b)[1] < 1350000 or geom(b)[1] >= 6150000 or geom(b)[:2] == (548640, 1353312)]
def settexts(b, texts):
    it = iter(texts)
    return re.sub(r'<a:t>[^<]*</a:t>', lambda m: f'<a:t>{next(it, "")}</a:t>', b)
rows = sorted(A, key=lambda k: -A[k]['hot'][I]); ada = [k for k in rows if A[k]['hot'][I] > 0]
HOT = sum(A[k]['hot'][I] for k in A)
LUAS = sum(bul(A[k]['luas'][I]) for k in A); BEL = sum(bul(A[k]['belum'][I]) for k in A)
top = rows[0]
out = []
for b in keep:
    t = ''.join(re.findall(r'<a:t>([^<]*)</a:t>', b))
    if t.startswith('Terbanyak di '):
        runs = re.findall(r'<a:r>.*?</a:r>', b, re.S)
        oranye = re.search(r'<a:rPr.*?</a:rPr>', runs[1], re.S).group(0); biasa = re.search(r'<a:rPr.*?</a:rPr>', runs[0], re.S).group(0)
        SUB = [('Terbanyak di ', 0), (NAMA[top], 1), (' (', 0), (f'{f0(A[top]["hot"][I])} titik', 1), ('). Total: ', 0), (f'{f0(HOT)} titik', 1),
               (', ', 0), (f'{f0(LUAS)} ha', 1), (' terbakar, ', 0), (f'{f0(BEL)} ha', 1), (' belum padam', 0)]
        baru = ''.join(f'<a:r>{oranye if o else biasa}<a:t>{t}</a:t></a:r>' for t, o in SUB)
        b = b[:b.index(runs[0])] + baru + b[b.index(runs[-1]) + len(runs[-1]):]
    out.append(b)
NID = [9000]
def nid(): NID[0] += 1; return NID[0]
def rpr(sz, b, col, it=False, sp=0):
    return (f'<a:rPr lang="id-ID" sz="{sz}"{" b=\"1\"" if b else ""}{" i=\"1\"" if it else ""}{f" spc=\"{sp}\"" if sp else ""} dirty="0">'
            f'<a:solidFill><a:srgbClr val="{col}"/></a:solidFill><a:latin typeface="Roboto"/><a:ea typeface="Roboto"/><a:cs typeface="Roboto"/></a:rPr>')
def kotak(x, y, cx, cy, paras=(), fill=None, line=None, geomp='rect', algn='l', anchor='ctr', adj=None, ins=0, wrap='square'):
    """paras: [[(teks, sz, bold, warna, sp)], ...] satu daftar run per paragraf"""
    av = f'<a:gd name="adj" fmla="val {adj}"/>' if adj is not None else ''
    fl = f'<a:solidFill><a:srgbClr val="{fill}"/></a:solidFill>' if fill else '<a:noFill/>'
    ln = f'<a:ln w="15875"><a:solidFill><a:srgbClr val="{line}"/></a:solidFill></a:ln>' if line else '<a:ln><a:noFill/></a:ln>'
    ps = ''.join(f'<a:p><a:pPr algn="{algn}"><a:buNone/></a:pPr>' + ''.join(f'<a:r>{rpr(r[1], r[2], r[3], sp=r[4] if len(r) > 4 else 0)}<a:t>{r[0]}</a:t></a:r>' for r in p) + '</a:p>' for p in paras) or '<a:p><a:endParaRPr lang="id-ID"/></a:p>'
    i = nid()
    return (f'<p:sp><p:nvSpPr><p:cNvPr id="{i}" name="Peta {i}"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="{x}" y="{y}"/><a:ext cx="{cx}" cy="{cy}"/></a:xfrm>'
            f'<a:prstGeom prst="{geomp}"><a:avLst>{av}</a:avLst></a:prstGeom>{fl}{ln}</p:spPr><p:txBody><a:bodyPr wrap="{wrap}" lIns="{ins}" tIns="0" rIns="{ins}" bIns="0" anchor="{anchor}"/><a:lstStyle/>{ps}</p:txBody></p:sp>')
def gambar(rid, x, y, w, h, nama):
    i = nid()
    return (f'<p:pic><p:nvPicPr><p:cNvPr id="{i}" name="{nama}"/><p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr><p:nvPr/></p:nvPicPr>'
            f'<p:blipFill><a:blip r:embed="{rid}"/><a:stretch><a:fillRect/></a:stretch></p:blipFill><p:spPr><a:xfrm><a:off x="{x}" y="{y}"/><a:ext cx="{w}" cy="{h}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr></p:pic>')
L, R_ = 640080, 11551920                     # tepi dalam panel
# 1) tiga kotak angka nasional selebar panel: ikon + label + angka (tanpa ±, tanpa keterangan)
ky, kh, gap = 1435608, 502920, 91440; kw = (R_ - L - (3 if KL else 2) * gap) // (4 if KL else 3)
KP = [('051C2C', 'AFC3DA', 'rIdIk1', 'HOTSPOT', f0(HOT), 'titik'),
      ('3F5F80', 'D3DFEA', 'rIdIk2', 'LUAS TERBAKAR', f0(LUAS), 'ha'),
      ('D9600B', 'FFDCC2', 'rIdIk3', 'BELUM PADAM', f0(BEL), 'ha')]
if KL: KP.insert(1, ('8C2A1C', 'F5C6BA', 'rIdIk4', 'FIRESPOT', f0(sum(v[1] for v in FSP.values())), 'titik'))
SZ_LAB, SZ_VAL, SZ_SAT = (800, 1600, 900) if KL else (900, 1800, 1000)
for n, (col, muda, rid, lab, val, sat) in enumerate(KP):
    x = L + n * (kw + gap)
    out.append(kotak(x, ky, kw, kh, fill=col, geomp='roundRect', adj=13636))
    out.append(gambar(rid, x + 164592, ky + (kh - 274320) // 2, 274320, 274320, 'Ikon ' + lab.title()))
    out.append(kotak(x + 566928, ky, kw - 566928 - 128016, kh, [[(lab, SZ_LAB, True, muda, 100)]], anchor='ctr'))
    out.append(kotak(x + 566928, ky, kw - 566928 - 164592, kh, [[(val, SZ_VAL, True, 'FFFFFF'), (' ' + sat, SZ_SAT, False, 'FFFFFF')]], algn='r', anchor='ctr'))
top_isi = ky + kh + 91440; dasar = 5724144
# 2) peringkat 10 provinsi di kanan; judul kolom bergaya judul kolom slide tabel (kotak warna + ikon + label* + satuan)
CW = [256032, 1006000, 880000, 1010000, 920000] if not KL else [256032, 1006000, 880000, 880000, 1010000, 920000]
RW = sum(CW); RX = R_ - RW; cx = [RX + sum(CW[:j]) for j in range(len(CW))]
hh = 338328
out.append(kotak(cx[1], top_isi, CW[1], hh, [[('PROVINSI', 750, True, '6B7280', 150)]], anchor='ctr'))
KOL = [(2, 'hot', '051C2C', 'E6ECF3', 'rIdIk1', 'HOTSPOT*', '(titik)'), (3, 'luas', '3F5F80', 'E6ECF3', 'rIdIk2', 'LUAS TERBAKAR*', '(ha)'),
       (4, 'belum', 'D9600B', 'FFE6D5', 'rIdIk3', 'BELUM PADAM*', '(ha)')]
if KL: KOL = [KOL[0], (3, 'fs', '8C2A1C', 'F5C6BA', 'rIdIk4', 'FIRESPOT', '(titik)'), (4,) + KOL[1][1:], (5,) + KOL[2][1:]]
for j, key, col, muda, rid, t, sat in KOL:
    bx, bw = cx[j] + 27432, CW[j] - 27432
    out.append(kotak(bx, top_isi, bw, hh, fill=col, geomp='roundRect', adj=13636))
    out.append(gambar(rid, bx + 54864, top_isi + (hh - 118872) // 2, 118872, 118872, 'Ikon ' + t))
    out.append(kotak(bx + 201168, top_isi, bw - 210312, hh, [[(t, 560, True, 'FFFFFF')] + ([(' ' + sat, 560, False, muda)] if sat else [])], anchor='ctr', wrap='none'))
TOP = rows[:10]
ry = top_isi + hh + 45720; rh = (dasar - ry) // 10
for n, k in enumerate(TOP):
    y = ry + n * rh; o = A[k]
    if n: out.append(kotak(RX, y, RW, 6350, fill='DCE1E7'))
    out.append(kotak(cx[0] + 27432, y + (rh - 192024) // 2, 192024, 192024, [[(str(n + 1), 700, True, 'FFFFFF')]], fill='051C2C', geomp='ellipse', algn='ctr'))
    out.append(kotak(cx[1] + 45720, y, CW[1] - 45720, rh, [[(NAMA[k], 800 if len(NAMA[k]) <= 18 else 700, True, '1A1A1A')]], anchor='ctr'))
    for j, key, col, *_ in KOL:
        v, vp = (FSP[k][1], FSP[k][0]) if key == 'fs' else (o[key][I], o[key][IP]); cur, prv = bul(v), bul(vp)   # persen dari angka yang tampil, vs 19 Okt
        pr = bul((cur - prv) / prv * 100) if prv else None
        ar, ac = (('baru', 'A9B4C2') if pr is None else (f'▲{f0(pr)}%', 'D9600B') if pr > 0 else (f'▼{f0(-pr)}%', '2F86D1') if pr < 0 else ('0%', '6B7280'))
        VW = CW[j] - 365760   # angka rata kanan di kolom tetap, persen rata kiri di kolom tetap: lurus ke bawah
        out.append(kotak(cx[j], y, VW, rh, [[(f0(v), 900, True, '1A1A1A')]], algn='r', anchor='ctr'))
        out.append(kotak(cx[j] + VW + 54864, y, 365760 - 54864, rh, [[(ar, 620, True, ac)]], algn='l', anchor='ctr'))
# 3) peta di kiri, selebar sisa panel, ditengahkan vertikal
X0 = L; W = RX - 182880 - L; H = round(W * 1664 / 4144); Y0 = top_isi + (dasar - top_isi - H) // 2
i = nid()
out.append(f'<p:pic><p:nvPicPr><p:cNvPr id="{i}" name="Peta hotspot 20 Okt"/><p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr><p:nvPr/></p:nvPicPr>'
           f'<p:blipFill><a:blip r:embed="rIdPeta"/><a:stretch><a:fillRect/></a:stretch></p:blipFill><p:spPr><a:xfrm><a:off x="{X0}" y="{Y0}"/><a:ext cx="{W}" cy="{H}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr></p:pic>')
# 4) legenda di bawah panel, posisi & ukuran sama dengan slide tabel
LEG = [('ellipse', 'D9600B', 'Ukuran lingkaran sebanding jumlah titik panas'), ('rect', '051C2C', 'Provinsi dengan titik panas'), ('rect', 'DCE1E7', 'Tanpa titik panas'),
       ('rect', 'D9600B', 'naik dari hari sebelumnya'), ('rect', '2F86D1', 'turun dari hari sebelumnya')]
if KL: LEG.insert(1, ('ellipse', 'FFC857', 'Firespot (titik)'))
lw = [128016 + 91440 + round(len(t) * 750 / 100 * 0.5 * 12700) + 320040 for _, _, t in LEG]
x = 548640 + (11094415 - sum(lw)) // 2
for (g, col, t), w in zip(LEG, lw):
    out.append(kotak(x, 5939028, 128016, 128016, fill=col, geomp=g))
    out.append(kotak(x + 219456, 5897880, w - 219456, 210312, [[(t, 750, False, '1A1A1A')]], anchor='ctr'))
    x += w
s4 = head + '<p:spTree>' + pre + ''.join(out) + '</p:spTree>' + tail
s1 = s1_asli; A = A_TABEL

# ---------- cut-off, catatan, simpan ----------
CUT_LAMA = re.search(r'<a:t>(\d+ Okt 2026, \d\d\.\d\d WIB)</a:t>', s1).group(1)
KAKI = '<a:t>*Data berdasarkan Geographic Information System (GIS) dengan satelit NASA (FIRMS: VIIRS dan MODIS).</a:t>'
def akhir(s, catatan=True):
    s = rep(s, f'<a:t>{CUT_LAMA}</a:t>', f'<a:t>{CUTOFF}</a:t>')
    if CATATAN and catatan: s = rep(s, KAKI, KAKI.replace(').</a:t>', f'). {CATATAN}</a:t>'))
    return s
s4 = akhir(s4, not os.environ.get('PETA_ANGKA'))
if KL:   # definisi firespot di ujung kaki slide peta (sesudah catatan sementara)
    kaki = re.findall(r'<a:t>\*Data berdasarkan[^<]*</a:t>', s4); assert len(kaki) == 1, kaki
    s4 = s4.replace(kaki[0], kaki[0][:-6] + ' Firespot: kriteria SIPANTAU Kemenhut.</a:t>')
F['ppt/slides/slide1.xml'] = akhir(s1).encode(); F['ppt/slides/slide4.xml'] = s4.encode()
if KL:
    F['ppt/media/ikon-firespot.png'] = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'ikon-firespot.png'), 'rb').read()
    R4 = F['ppt/slides/_rels/slide4.xml.rels'].decode(); assert 'rIdIk4' not in R4
    F['ppt/slides/_rels/slide4.xml.rels'] = R4.replace('</Relationships>', '<Relationship Id="rIdIk4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/ikon-firespot.png"/></Relationships>').encode()
if len(sys.argv) > 6 and sys.argv[6]: F['ppt/media/peta-hotspot-20okt.png'] = open(sys.argv[6], 'rb').read()
if LAMBANG:
    R1 = F['ppt/slides/_rels/slide1.xml.rels'].decode()
    for rid, k in LAMBANG.items():
        F[f'ppt/media/lambang-{k}.png'] = open(os.path.join(REPO, 'public', 'lambang', 'provinsi', f'{k}.png'), 'rb').read()
        R1 = R1.replace('</Relationships>', f'<Relationship Id="{rid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/lambang-{k}.png"/></Relationships>')
    F['ppt/slides/_rels/slide1.xml.rels'] = R1.encode()
    assert 'Extension="png"' in F['[Content_Types].xml'].decode()
zo = zipfile.ZipFile(KELUAR, 'w', zipfile.ZIP_DEFLATED)
for n in ['[Content_Types].xml'] + [n for n in F if n != '[Content_Types].xml']: zo.writestr(n, F[n])
zo.close()
print('ok baris', [NAMA[k] for k in ROW], 'padam', f0(D3), 'dari', f0(L1), 'belum', f0(B3), '| peta', NAMA[top], HOT, LUAS, BEL, len(ada), 'prov')
