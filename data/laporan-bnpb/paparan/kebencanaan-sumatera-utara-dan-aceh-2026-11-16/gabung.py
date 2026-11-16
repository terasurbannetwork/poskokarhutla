"""Gabungan Paparan Kebencanaan Sumatera Utara + Aceh 161126 (Revisi 1), permintaan Bang Ghozi dan pemilik 16 Nov 2026:
satu sampul berjudul Sumatera Utara dan Aceh, daftar isi dua bagian (01 Sumatera Utara, 02 Aceh), slide pembatas tiap
provinsi, judul tiap slide menyebut provinsinya, jarak judul ke bilah atas dilonggarkan.
Sumber: ../kebencanaan-*-2026-11-16/Revisi 1/*.pptx (jalankan perbaiki.py dulu)."""
import os, subprocess, tempfile
from pptx import Presentation

DIR = os.path.dirname(os.path.abspath(__file__)); PAP = os.path.dirname(DIR)
SU = os.path.join(PAP, 'kebencanaan-sumatera-utara-2026-11-16', 'Revisi 1', 'Paparan Kebencanaan Sumatera Utara 161126.pptx')
AC = os.path.join(PAP, 'kebencanaan-aceh-2026-11-16', 'Revisi 1', 'Paparan Kebencanaan Aceh 161126.pptx')
NAMA = 'Paparan Kebencanaan Sumatera Utara dan Aceh 161126'
A = '{http://schemas.openxmlformats.org/drawingml/2006/main}'
SISIP = {  # awalan judul -> provinsi disebut di judul
    'Gempa dan Tsunami:': 'Gempa dan Tsunami di {p}:',
    'Karhutla dan Gunung Api: Seluas': 'Karhutla dan Gunung Api di {p}: Seluas',
    'KK terdampak naik dari': 'KK terdampak banjir di {p} naik dari',
}
BAGIAN = [('01', 'Sumatera Utara', '4–11'), ('02', 'Aceh', '13–20')]
BARIS = 939800          # tinggi satu baris daftar isi
Y0 = 2019300            # baris 01 daftar isi


def tx(sh):
    return sh.text_frame.text.strip() if sh.has_text_frame else None


def isi(sh, t):
    p = sh.text_frame.paragraphs[0]
    p.runs[0].text = t
    for r in p.runs[1:]:
        r._r.getparent().remove(r._r)


def daftar(slide):
    """Daftar isi kanan: dua baris (Sumut, Aceh), baris 03 dibuang."""
    for sh in list(slide.shapes):
        if sh.left >= 4000000 and sh.top >= Y0 + 2 * BARIS - 1000 and sh.top < Y0 + 3 * BARIS:
            sh._element.getparent().remove(sh._element)
    for k, (no, nama, hal) in enumerate(BAGIAN):
        y = Y0 + k * BARIS
        for sh in slide.shapes:
            if not sh.has_text_frame or abs(sh.top - y) > 1000 and abs(sh.top - (y + 330200)) > 1000:
                continue
            if sh.left == 4318000: isi(sh, no)
            elif sh.left == 5105400: isi(sh, nama)
            elif sh.left == 10678160 and tx(sh): isi(sh, hal)


def judul(src, prov, out, ke):
    prs = Presentation(src)
    for s in prs.slides:
        for sh in s.shapes:
            if not sh.has_text_frame: continue
            for pa in sh.text_frame.paragraphs:
                for r in pa.runs:
                    for a, b in SISIP.items():
                        if r.text.startswith(a):
                            r.text = b.format(p=prov) + r.text[len(a):]
                            for rr in (x for q in sh.text_frame.paragraphs for x in q.runs):  # judul tetap dua baris
                                if rr.font.size: rr.font.size = int(rr.font.size * 0.84)
                            for br in sh._element.findall(f'.//{A}br'):  # pemutus baris paksa dibuang
                                nx = br.getnext(); t = nx.find(f'{A}t') if nx is not None else None
                                if t is not None and not t.text.startswith(' '): t.text = ' ' + t.text
                                br.getparent().remove(br)
    sl = prs.slides
    if ke == 0:
        # sampul: dua baris, tidak menabrak logo BNPB
        for sh in sl[0].shapes:
            if sh.has_text_frame and 'Kebencanaan' in sh.text_frame.text:
                ps = sh.text_frame.paragraphs
                ps[0].runs[0].text = 'Paparan Kebencanaan'
                ps[2].runs[0].text = 'Sumatera Utara dan Aceh'
                ps[1]._p.getparent().remove(ps[1]._p)
                for q in sh.text_frame.paragraphs:
                    for x in q.runs:
                        x.font.size = 377952  # 29,76 pt
        # daftar isi
        for sh in sl[1].shapes:
            if sh.name == 'Judul dokumen': isi(sh, 'Paparan Kebencanaan Sumatera Utara dan Aceh')
        daftar(sl[1])
    # pembatas (slide 3): nomor + nama provinsi, daftar mini dua baris, sorotan di baris provinsinya
    no, nama, _ = BAGIAN[ke]
    for sh in sl[2].shapes:
        if sh.left == 548640 and tx(sh) == '01': isi(sh, no)
        elif sh.left == 548640 and tx(sh) == 'Banjir 2025': isi(sh, nama)
        elif sh.left == 4114800 and sh.top == 2070100: sh.top += ke * BARIS
    if ke:  # gaya baris aktif (tebal) pindah ke baris provinsinya: tukar posisi baris 01 dan 02, lalu isi ulang
        for sh in sl[2].shapes:
            if sh.left >= 4318000 and sh.shape_type != 9:
                if Y0 - 1000 <= sh.top < Y0 + BARIS - 1000: sh.top += BARIS
                elif Y0 + BARIS - 1000 <= sh.top < Y0 + 2 * BARIS - 1000: sh.top -= BARIS
    daftar(sl[2])
    prs.save(out)


tmp = tempfile.mkdtemp()
su, ac = os.path.join(tmp, 'su.pptx'), os.path.join(tmp, 'ac.pptx')
judul(SU, 'Sumatera Utara', su, 0)
judul(AC, 'Aceh', ac, 1)
os.makedirs(os.path.join(DIR, 'Revisi 2'), exist_ok=True)
out = os.path.join(DIR, 'Revisi 2', NAMA + '.pptx')
pdf = out[:-5] + '.pdf'
for f in (out, pdf):
    if os.path.exists(f): os.remove(f)   # gagal di sini = berkas sedang dibuka di PowerPoint
ps = f"""
$ErrorActionPreference = 'Stop'
$p = New-Object -ComObject PowerPoint.Application
$d = $p.Presentations.Open('{su}', $false, $false, $false)
foreach ($i in 11,5) {{ $d.Slides.Item($i).Delete() }}
$null = $d.Slides.InsertFromFile('{ac}', 11, 3, 4)
$null = $d.Slides.InsertFromFile('{ac}', 13, 6, 10)
$null = $d.Slides.InsertFromFile('{ac}', 18, 12, 13)
$d.SaveAs('{out}')
Write-Output $d.Slides.Count
$d.Close(); $p.Quit()
"""
subprocess.run(['powershell', '-NoProfile', '-Command', ps], check=True)

prs = Presentation(out)
for i, s in enumerate(prs.slides, 1):
    for sh in s.shapes:
        # nomor halaman diurutkan ulang
        if sh.has_text_frame and sh.left == 11094720 and tx(sh).isdigit():
            sh.text_frame.paragraphs[0].runs[0].text = str(i)
        # jarak judul ke bilah navigasi atas (pemilik: "yang atas mepet")
        elif (sh.left, sh.top) in ((1031240, 274320), (548640, 351790), (617220, 420370)):
            sh.top += 80000   # judul berikon, lingkaran ikon, ikon
        elif (sh.left, sh.top) == (548640, 902970):
            sh.top += 50000   # subjudul
        elif (sh.left, sh.top) == (548640, 298450) and sh.has_text_frame:
            sh.top += 50000   # judul tanpa ikon
prs.save(out)
subprocess.run(['powershell', '-NoProfile', '-Command',
                f"$ErrorActionPreference = 'Stop'; $p = New-Object -ComObject PowerPoint.Application; "
                f"$d = $p.Presentations.Open('{out}', $true, $false, $false); $d.SaveAs('{pdf}', 32); $d.Close(); $p.Quit()"],
               check=True)
assert os.path.getmtime(pdf) >= os.path.getmtime(out), 'PDF tidak diperbarui'
print(out)
