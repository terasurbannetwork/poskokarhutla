"""Isi pil PM2.5 dan cuaca slide tabel untuk cut-off 24 Okt 15.00: PM2.5 stasiun BMKG pukul 15.00 (dasbor BMKG), cuaca BMKG 23-25 Okt.
Pakai: python3 -I pil.py <masuk.pptx> <keluar.pptx>   (masukan = keluaran perbarui.py dengan baris Kalteng, Sumsel, Kalbar, Papsel, Kalsel, Sultra)
PM2.5 = konsentrasi stasiun tertinggi di provinsi itu dari daftar 10 tertinggi; provinsi di luar daftar = "PM2.5 < nilai ke-10" (82,5 -> 83),
sama dengan aturan koordalops.py. Kategori 'sangat tidak sehat' belum ada di deck: pil berbahaya disalin dengan warna merah, legenda ditambah."""
import re, sys, zipfile
MASUK, KELUAR = sys.argv[1], sys.argv[2]
X_PM, X_CU = 2798064, 3767328
Y = dict(kalteng=2316480, sumsel=2834640, kalbar=3352800, papsel=3870960, kalsel=4389120, sultra=4907280)
STS = 'B42318'   # sangat tidak sehat


def blok(s, x, y):
    m = re.search(rf'<p:sp>(?:(?!</p:sp>).)*?<a:off x="{x}" y="{y}"/>(?:(?!</p:sp>).)*?</p:sp>\s*<p:pic>.*?</p:pic>\s*<p:sp>.*?</p:sp>', s, re.S)
    assert m and m.group(0).count('<p:sp>') == 2, (x, y); return m.start(), m.end()


def ada(s, x, y): return bool(re.search(rf'<a:off x="{x}" y="{y}"/>', s))


def isi(s, x, y, teks, donor_y=None, warna=None, sz=None):
    """Teks pil di (x, y). donor_y: salin jenis pil dari (x, donor_y) (pil lama diganti, atau ditambah bila belum ada)."""
    if donor_y is not None:
        da, db = blok(s, x, donor_y)
        baru = re.sub(r'<a:off x="(\d+)" y="(\d+)"/>', lambda m: f'<a:off x="{m.group(1)}" y="{int(m.group(2)) - donor_y + y}"/>', s[da:db])
        if ada(s, x, y):
            a, b = blok(s, x, y); ids = iter(re.findall(r'<p:cNvPr id="(\d+)"', s[a:b]))
            s = s[:a] + re.sub(r'<p:cNvPr id="\d+"', lambda m: f'<p:cNvPr id="{next(ids)}"', baru) + s[b:]
        else:
            n = [max(map(int, re.findall(r'<p:cNvPr id="(\d+)"', s)))]
            def nid(m): n[0] += 1; return f'<p:cNvPr id="{n[0]}"'
            s = s.replace('</p:spTree>', re.sub(r'<p:cNvPr id="\d+"', nid, baru) + '</p:spTree>')
    a, b = blok(s, x, y); pot = s[a:b]
    lama = re.findall(r'<a:t>([^<]*)</a:t>', pot); assert len(lama) == 1, lama
    pot = pot.replace(f'<a:t>{lama[0]}</a:t>', f'<a:t>{teks}</a:t>')
    if len(teks) > 12: pot = pot.replace('wrap="square"', 'wrap="none"')
    if warna: pot = re.sub(r'(<a:solidFill><a:srgbClr val=")\w+', rf'\g<1>{warna}', pot, count=1)
    if sz: pot = re.sub(r'sz="\d+"', f'sz="{sz}"', pot)   # teks panjang: huruf dikecilkan agar muat di pil (dicek di render PowerPoint)
    return s[:a] + pot + s[b:]


def legenda(s):
    """Sisipkan 'PM2.5 sangat tidak sehat' sesudah 'PM2.5 tidak sehat'; seluruh legenda digeser agar tetap di tengah."""
    TX, GAP = 1150000, 9144
    sw = re.search(r'<p:sp>(?:(?!</p:sp>).)*?<a:off x="6443320" y="5943600"/>.*?</p:sp>', s, re.S).group(0)
    tx = re.search(r'<p:sp>(?:(?!</p:sp>).)*?<a:off x="7961224" y="5897880"/>.*?</p:sp>', s, re.S).group(0)
    tambah = 201168 + 246888 + TX + GAP; kiri = tambah // 2
    def geser(m):
        b = m.group(0); o = re.search(r'<a:off x="(\d+)" y="(5939028|5943600|5897880)"/>', b)
        if not o: return b
        x = int(o.group(1)); x2 = x - kiri if x < 9084107 else x - kiri + tambah
        return b.replace(o.group(0), f'<a:off x="{x2}" y="{o.group(2)}"/>', 1)
    s = re.sub(r'<p:sp>.*?</p:sp>', geser, s, flags=re.S)
    x0 = 9084107 - kiri; n = [max(map(int, re.findall(r'<p:cNvPr id="(\d+)"', s)))]
    def nid(b): n[0] += 1; return re.sub(r'<p:cNvPr id="\d+"', f'<p:cNvPr id="{n[0]}"', b, count=1)
    sw2 = re.sub(r'<a:off x="\d+" y="5943600"/>', f'<a:off x="{x0}" y="5943600"/>', sw)
    sw2 = re.sub(r'(<a:solidFill><a:srgbClr val=")\w+', rf'\g<1>{STS}', sw2, count=1)
    tx2 = re.sub(r'<a:off x="\d+" y="5897880"/><a:ext cx="\d+"', f'<a:off x="{x0 + 246888}" y="5897880"/><a:ext cx="{TX}"', tx)
    tx2 = tx2.replace('<a:t>PM2.5 tidak sehat</a:t>', '<a:t>PM2.5 sangat tidak sehat</a:t>')
    return s.replace('</p:spTree>', nid(sw2) + nid(tx2) + '</p:spTree>')


def tabel(s):
    # donor jenis pil disimpan dulu (sebelum ada pil yang berubah jenis): berbahaya = Kalteng, tidak sehat = Kalbar, abu = Papsel
    donor = {j: s[slice(*blok(s, X_PM, Y[k]))] for j, k in (('bhy', 'kalteng'), ('ts', 'kalbar'), ('abu', 'papsel'))}
    def pasang(s, prov, jenis, teks, **kw):
        y = Y[prov]; baru = re.sub(r'<a:off x="(\d+)" y="(\d+)"/>', lambda m: f'<a:off x="{m.group(1)}" y="{int(m.group(2)) - Y[{'bhy': 'kalteng', 'ts': 'kalbar', 'abu': 'papsel'}[jenis]] + y}"/>', donor[jenis])
        if ada(s, X_PM, y):
            a, b = blok(s, X_PM, y); ids = iter(re.findall(r'<p:cNvPr id="(\d+)"', s[a:b]))
            s = s[:a] + re.sub(r'<p:cNvPr id="\d+"', lambda m: f'<p:cNvPr id="{next(ids)}"', baru) + s[b:]
        else:
            n = [max(map(int, re.findall(r'<p:cNvPr id="(\d+)"', s)))]
            def nid(m): n[0] += 1; return f'<p:cNvPr id="{n[0]}"'
            s = s.replace('</p:spTree>', re.sub(r'<p:cNvPr id="\d+"', nid, baru) + '</p:spTree>')
        return isi(s, X_PM, y, teks, **kw)
    # PM2.5 BMKG 24 Okt 15.00 WIB (dasbor cews.bmkg.go.id, deret 5 hari; pm25_24okt_1500.json): 10 tertinggi Palangkaraya 2587,7; Mempawah 360,1;
    # Kubu Raya 351,4; Pangkalanbun 302,3; Banjarbaru 153,2; Kota Jambi 147,9; Maros 76,3; Kotabaru 67,4; Musi 2 Palembang 67,0; Batam 66,6 (ke-10)
    s = pasang(s, 'kalteng', 'bhy', '2.588 BERBAHAYA', sz=600)
    s = pasang(s, 'kalbar', 'bhy', '360 BERBAHAYA')
    s = pasang(s, 'kalsel', 'bhy', '153 SGT TDK SEHAT', warna=STS, sz=520)
    s = pasang(s, 'sumsel', 'ts', '67 TIDAK SEHAT')
    s = pasang(s, 'papsel', 'abu', 'PM2.5 &lt; 67')
    s = pasang(s, 'sultra', 'abu', 'PM2.5 &lt; 67')
    # cuaca BMKG 23-25 Okt: Sultra tidak disebut di hujan sedang, siaga, maupun angin kencang -> umumnya cerah berawan
    s = isi(s, X_CU, Y['sultra'], 'CERAH BERAWAN', donor_y=Y['papsel'], sz=580)
    return legenda(s)


zi = zipfile.ZipFile(MASUK); zo = zipfile.ZipFile(KELUAR, 'w', zipfile.ZIP_DEFLATED)
for it in zi.infolist():
    d = zi.read(it.filename)
    if it.filename == 'ppt/slides/slide1.xml': d = tabel(d.decode()).encode()
    zo.writestr(it, d)
zo.close()
print('ok', KELUAR)
