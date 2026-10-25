"""Kolom FIRESPOT di slide tabel (slide1.xml), di kiri kelompok HOTSPOT. Pakai: python3 -I firespot_tabel.py <masuk.pptx> <firespot.json> <keluar.pptx>
Firespot = titik firespot hari terakhir per provinsi (keluaran firespot.py: titik di cluster berstatus firespot "ya", aturan harian.py).
Satu kolom (hari terakhir). Tiga kelompok kolom (hotspot, luas, belum) digeser ke kanan dan disempitkan faktor F agar kolom baru muat;
gaya kolom baru disalin dari elemen yang ada (kepala kelompok, label tanggal, label angka, sel jumlah). Masukan harus keluaran perbarui.py
dengan FIRESPOT (ikon ppt/media/ikon-firespot.png sudah ada)."""
import collections, json, re, sys, zipfile
MASUK, KL, KELUAR = sys.argv[1:4]
HARI_FS = f"{int(json.load(open(KL))['hari'][-1][-2:])} Okt"
FSP = {k: v[1] for k, v in json.load(open(KL))['prov'].items()}   # firespot titik hari terakhir (keluaran firespot.py)
NAMA = {k: v['nama'] for k, v in json.load(open('/Users/hhizari/WebProjects/poskokarhutla/public/data/laporan.json'))['prov'].items()}
KODE = {v: k for k, v in NAMA.items()}
X0, KANAN, LEBAR = 4663440, 10704982 + 800913, 914400       # tepi kiri kelompok hotspot, tepi kanan kelompok belum padam, lebar kolom firespot
F = (KANAN - X0 - LEBAR) / (KANAN - X0)
Y_ATAS, Y_BAWAH, T0, PB, PITA = 1450000, 5715000, 2167128, 518160, 481584
GEOM = re.compile(r'<a:off x="(\d+)" y="(\d+)"/>(\s*)<a:ext cx="(\d+)" cy="(\d+)"/>')
BLOK = re.compile(r'<p:(sp|pic)>.*?</p:\1>', re.S)


def geom(b):
    o = GEOM.search(b); return tuple(int(o.group(i)) for i in (1, 2, 4, 5)) if o else None


def setgeom(b, x, y, cx, cy):
    return GEOM.sub(lambda o: f'<a:off x="{x}" y="{y}"/>{o.group(3)}<a:ext cx="{cx}" cy="{cy}"/>', b, 1)


def cari(s, x, y, ada_teks=None):
    hit = [m.group(0) for m in BLOK.finditer(s) if (g := geom(m.group(0))) and g[:2] == (x, y) and (ada_teks is None or ('<a:t>' in m.group(0)) == ada_teks)]
    assert len(hit) == 1, (x, y, len(hit)); return hit[0]


def teks(b, t, sz=None):
    run = re.findall(r'<a:t>[^<]*</a:t>', b)
    b = b.replace(run[0], f'<a:t>{t}</a:t>', 1)
    for r in run[1:]: b = b.replace(r, '<a:t></a:t>', 1)
    return re.sub(r'sz="\d+"', f'sz="{sz}"', b) if sz else b


def f0(v): return f"{v:,}".replace(',', '.')


def ubah(s):
    # baris provinsi dari nama di kolom provinsi
    row = []
    for i in range(6):
        nm = [re.findall(r'<a:t>([^<]*)</a:t>', m.group(0))[0] for m in BLOK.finditer(s) if (g := geom(m.group(0))) and g[0] == 1225296 and T0 + i * PB <= g[1] < T0 + (i + 1) * PB]
        assert len(nm) == 1, nm; row.append(KODE[nm[0]])
    # templat gaya, diambil sebelum digeser
    kepala = [cari(s, 4709160, 1463040), cari(s, 5030373, 1554480), cari(s, 5304693, 1463040)]
    tgl = cari(s, 6128106, 1911096)
    jml = cari(s, 6082386, 5330952)
    lab = [m.group(0) for m in BLOK.finditer(s) if (g := geom(m.group(0))) and g[0] == 6082386 and g[3] == 164592 and T0 <= g[1] < T0 + PB][0]
    # geser + sempitkan tiga kelompok kolom (latar pita selebar tabel tidak ikut)
    def geser(m):
        b = m.group(0); g = geom(b)
        if not g or g[0] < X0 - 20000 or g[2] >= 10_000_000 or not Y_ATAS <= g[1] < Y_BAWAH: return b
        x, y, cx, cy = g
        return setgeom(b, round(X0 + LEBAR + (x - X0) * F), y, round(cx * F), cy)
    s = BLOK.sub(geser, s)
    baru = []
    # kepala: kotak merah + ikon + teks
    kx, kw = X0 + 45720, LEBAR - 91440
    k0 = re.sub(r'(<a:solidFill><a:srgbClr val=")\w+', r'\g<1>8C2A1C', setgeom(kepala[0], kx, 1463040, kw, 402336), count=1)
    k1 = re.sub(r'r:embed="\w+"', 'r:embed="rIdFirespot"', setgeom(kepala[1], kx + 82296, 1554480 + 27432, 164592, 164592))
    k2 = re.sub(r'wrap="square"', 'wrap="none"', teks(setgeom(kepala[2], kx + 292608, 1463040, kw - 320040, 402336), 'FIRESPOT', 820))
    baru += [k0, k1, k2]
    baru.append(teks(setgeom(tgl, X0, 1911096, LEBAR, 182880), HARI_FS))
    for i, k in enumerate(row):   # nilai di tengah pita baris
        baru.append(teks(setgeom(lab, X0, T0 + i * PB, LEBAR, PITA), f0(FSP[k]), 1000).replace('anchor="b"', 'anchor="ctr"'))
    baru.append(teks(setgeom(jml, X0, 5330952, LEBAR, 384048), f0(sum(FSP[k] for k in row))))
    n = [max(map(int, re.findall(r'<p:cNvPr id="(\d+)"', s)))]
    def nid(b): n[0] += 1; return re.sub(r'<p:cNvPr id="\d+"', f'<p:cNvPr id="{n[0]}"', b, count=1)
    return s.replace('</p:spTree>', ''.join(nid(b) for b in baru) + '</p:spTree>'), row


zi = zipfile.ZipFile(MASUK); zo = zipfile.ZipFile(KELUAR, 'w', zipfile.ZIP_DEFLATED)
assert 'ppt/media/ikon-firespot.png' in zi.namelist()
for it in zi.infolist():
    d = zi.read(it.filename)
    if it.filename == 'ppt/slides/slide1.xml': x, row = ubah(d.decode()); d = x.encode()
    if it.filename == 'ppt/slides/_rels/slide1.xml.rels':
        d = d.decode().replace('</Relationships>', '<Relationship Id="rIdFirespot" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/ikon-firespot.png"/></Relationships>').encode()
    zo.writestr(it, d)
zo.close()
print('ok', KELUAR, 'faktor', round(F, 3), {NAMA[k]: FSP[k] for k in row})
