"""Paparan Kebencanaan Kabupaten Solok 241126, dua slide (permintaan 24 Nov 2026: "buat slide kebencanaan kabupaten solok, 1-2 slide aja").

Cangkang: ../kebencanaan-sumatera-barat-2026-11-21/Paparan Kebencanaan Sumatera Barat 211126.pptx (pola paparan wilayah yang dipakai pemilik).
  hal. 1  dari cangkang hal. 4: riwayat bencana 2008-2025 per jenis (DIBI tahunan per kab), sorotan dampak
  hal. 2  dari cangkang hal. 13: IRBI 2025 per bahaya (InaRISK), dampak banjir bandang 22 Sep 2026 (DIBI harian, public/data/dibi_kejadian.json),
          ancaman lain: Gunung Talang (MAGMA, diperiksa 24 Nov 2026), skor risiko gempa (public/gempa/data/risiko.json), karhutla 2026 (centurisk97.id)
Banjir terkini (situasi_banjir.py 24 Nov, bahan/): Kab. Solok tidak lagi tercatat terdampak dalam 14 hari terakhir dan tidak berstatus Siaga 24-27 Nov.

  python buat.py   -> Paparan Kebencanaan Kabupaten Solok 241126.pptx + .pdf (PowerPoint)
"""
import copy, csv, json, math, subprocess, sys, urllib.request
from collections import Counter, defaultdict
from pathlib import Path

from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import MSO_ANCHOR, PP_ALIGN
from pptx.util import Emu, Pt

DIR = Path(__file__).resolve().parent
PAP = DIR.parent
AKAR = DIR.parents[3]
ASAL = PAP / 'kebencanaan-sumatera-barat-2026-11-21' / 'Paparan Kebencanaan Sumatera Barat 211126.pptx'
SKILL = Path.home() / '.claude/skills/ppt-konsultan/bnpb/assets'
DIBI = SKILL / 'proyek-banjir-sumatra-2025/data/dibi25/dibi_kab_jenis_2008_2025.json'
IRBI = SKILL / 'proyek-bnpb/data/irbi/irbi_kab_2025.csv'
NAMA = 'Paparan Kebencanaan Kabupaten Solok 241126'
PROV, KODE, KAB, TGL = 'Sumatera Barat', '13', 'Solok', '24 Nov 2026'
TALANG = 'Normal (Level I)'   # MAGMA Indonesia, tingkat aktivitas gunung api, diperiksa 24 Nov 2026
EMU = 12700
A = '{http://schemas.openxmlformats.org/drawingml/2006/main}'
R = '{http://schemas.openxmlformats.org/officeDocument/2006/relationships}'
NAVY, ORANYE, ABU, MUDA = '051C2C', 'D9600B', '5B6675', 'EEF5FC'


def ribu(n):
    return f'{round(n):,}'.replace(',', '.')


def koma(x, d=1):
    return f'{x:.{d}f}'.replace('.', ',')


def web(nama):
    ke = DIR / 'bahan' / 'web' / nama.replace('/', '_')
    if not ke.exists():
        ke.parent.mkdir(parents=True, exist_ok=True)
        req = urllib.request.Request('https://centurisk97.id/' + nama, headers={'User-Agent': 'Mozilla/5.0'})
        ke.write_bytes(urllib.request.urlopen(req, timeout=120).read())
    return json.loads(ke.read_text(encoding='utf-8'))


# ======================================================================= data
# --- hal. 1: DIBI tahunan 2008-2025. Kejadian DIBI dibagi rata antar-kab untuk kejadian lintas kab (mis. gempa 2009 = 0,0625),
#     jadi tiap baris tahun x jenis dihitung paling sedikit satu kejadian (pembulatan ke atas).
GABUNG = {'Banjir Bandang': 'Banjir bandang', 'Banjir': 'Banjir', 'Tanah Longsor': 'Tanah longsor', 'Cuaca Ekstrem': 'Cuaca ekstrem',
          'Angin Kencang': 'Angin kencang dan puting beliung', 'Puting Beliung': 'Angin kencang dan puting beliung',
          'Kebakaran Hutan dan Lahan': 'Kebakaran hutan dan lahan', 'Gempabumi': 'Gempa bumi', 'Kekeringan': 'Kekeringan'}
dibi = [r for r in json.loads(DIBI.read_text(encoding='utf-8')) if r['provinsi'] == PROV and r['kabupaten'] == KAB]
J, T = defaultdict(Counter), Counter()
for r in dibi:
    c = J[GABUNG[r['jenis_bencana'].strip()]]
    n = math.ceil(r['jumlah_kejadian'] - 1e-9)
    c['n'] += n; T[r['tahun']] += n
    c['mh'] += r['meninggal'] + r['hilang']; c['ung'] += r['mengungsi']
    c['rr'] += r['rumah_rusak_berat'] + r['rumah_rusak_sedang'] + r['rumah_rusak_ringan']
jenis = sorted(J.items(), key=lambda x: (-x[1]['n'], -x[1]['mh'], x[0]))
tot = {k: sum(c[k] for c in J.values()) for k in ('n', 'mh', 'ung', 'rr')}
assert len(jenis) == 8, [j for j, _ in jenis]
korban_top = max(J.items(), key=lambda x: x[1]['mh'])
ung_top = max(J.items(), key=lambda x: x[1]['ung'])
rr_top = max(J.items(), key=lambda x: x[1]['rr'])
tahun_top = max(T.items(), key=lambda x: (x[1], x[0]))
print('2008-2025', tot, jenis, 'tahun terbanyak', tahun_top)

# --- hal. 2: DIBI harian 2026 (28 Okt 2025 sampai 28 Okt 2026)
dk = json.loads((AKAR / 'public/data/dibi_kejadian.json').read_text(encoding='utf-8'))
sol = [r for r in dk['kejadian'] if r['prov_kode'] == KODE and r['kab'] == KAB]
bb = [r for r in sol if r['tanggal'] == '2026-09-22' and r['jenis'] == 'Banjir Bandang']
assert len(bb) == 1, sol
bb = bb[0]
assert (bb['meninggal'], bb['mengungsi'], bb['rr_berat'], bb['rr_sedang'], bb['rr_ringan']) == (2, 77, 19, 9, 33), bb   # sama dengan WA Koordalops 4 dan 9 Nov 2026
nov25 = [r for r in sol if r['tanggal'] == '2025-11-27' and r['jenis'] == 'Banjir'][0]
print('banjir bandang 22 Sep 2026', bb, '| banjir 27 Nov 2025 terdampak', nov25.get('terdampak'))

# IRBI 2025
irbi = [r for r in csv.DictReader(IRBI.open(encoding='utf-8')) if r['prov_kode'] == KODE]
assert len(irbi) == 19, len(irbi)
BAHAYA = [('banjir', 'Banjir'), ('longsor', 'Tanah longsor'), ('cuaca_ekstrem', 'Cuaca ekstrem'), ('gempabumi', 'Gempa bumi'),
          ('gunungapi', 'Gunung api'), ('kekeringan', 'Kekeringan'), ('karlahut', 'Kebakaran hutan dan lahan')]
ir = next(r for r in irbi if r['nama'] == KAB)


def peringkat(kol):
    v = sorted((float(r[kol]) for r in irbi if r[kol]), reverse=True)
    return v.index(float(ir[kol])) + 1, len(v)


ir_bahaya = [(lab, float(ir[k]), *peringkat(k)) for k, lab in BAHAYA]
ir_bahaya.sort(key=lambda x: (-x[1], x[2]))
ir_total, ir_kelas = float(ir['total']), ir['status_total_resmi']
ir_rank = peringkat('total')
print('IRBI', ir_total, ir_kelas, ir_rank, ir_bahaya)

# gempa
risiko = json.loads((AKAR / 'public/gempa/data/risiko.json').read_text(encoding='utf-8'))
assert risiko['kolom'][:6] == ['skor', 'kekerapan', 'besaran', 'tren', 'm_maks', 'n_2000_2025']
gk = sorted(((v[0], k.split('|')[1]) for k, v in risiko['kab'].items() if k.startswith(KODE + '|')), key=lambda x: (-x[0], x[1]))
g = risiko['kab'][f'{KODE}|{KAB}']
g_rank = 1 + sum(s > g[0] for s, _ in gk)   # peringkat bersama bila skor sama
print('gempa', g[:6], 'peringkat', g_rank, len(gk))

# karhutla 2026
P, K = web('data/peta_karhutla.json'), web('data/peta_karhutla_kab.json')
luas_kab = {v['nama']: sum(x[1] for x in v['d']) for k, v in K['kab'].items() if v['prov'] == KODE}
k_urut = sorted(luas_kab, key=lambda n: -luas_kab[n])
luas_sol, k_rank = round(luas_kab[KAB]), k_urut.index(KAB) + 1
print('karhutla', luas_sol, 'ha, peringkat', k_rank, 'dari', len(k_urut), '| data', P['dibuat'])


# ======================================================================= penyunting
def semua_bentuk(shapes):
    for sh in shapes:
        if sh.shape_type == 6: yield from semua_bentuk(sh.shapes)
        else: yield sh


def tulis(sh, t):
    p = sh.text_frame.paragraphs[0]
    p.runs[0].text = t
    for r in p.runs[1:]: r._r.getparent().remove(r._r)


def susun(sh, bagian):
    p = sh.text_frame.paragraphs[0]
    asal = [copy.deepcopy(r._r) for r in p.runs]
    for el in list(p._p):
        if el.tag in (A + 'r', A + 'br'): p._p.remove(el)
    akhir = p._p.find(A + 'endParaRPr')
    for t, i in bagian:
        r = copy.deepcopy(asal[i]); r.find(A + 't').text = t
        if akhir is not None: akhir.addprevious(r)
        else: p._p.append(r)
    for p2 in sh.text_frame.paragraphs[1:]: p2._p.getparent().remove(p2._p)


def per_nama(s):
    return {sh.name: sh for sh in s.shapes}


def hapus(sh):
    sh._element.getparent().remove(sh._element)


def pt(x):
    return Emu(int(round(x * EMU)))


def kotak(s, x, y, w, h, warna):
    sh = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, pt(x), pt(y), pt(w), pt(h))
    sh.fill.solid(); sh.fill.fore_color.rgb = RGBColor.from_string(warna); sh.line.fill.background(); sh.shadow.inherit = False
    return sh


def label(s, x, y, w, h, t, ukuran, warna=NAVY, tebal=False, rata=PP_ALIGN.LEFT):
    tb = s.shapes.add_textbox(pt(x), pt(y), pt(w), pt(h))
    tf = tb.text_frame; tf.word_wrap = True; tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
    p = tf.paragraphs[0]; p.alignment = rata
    r = p.add_run(); r.text = t
    r.font.name = 'Roboto'; r.font.size = Pt(ukuran); r.font.bold = tebal; r.font.color.rgb = RGBColor.from_string(warna)
    return tb


def ganti_ikon(pic, blob):
    _, rid = pic.part.get_or_add_image_part(__import__('io').BytesIO(blob))
    pic._element.find('.//' + A + 'blip').set(R + 'embed', rid)


def ikon(s, nama):
    return s.shapes._spTree.xpath(f'.//p:pic[p:nvPicPr/p:cNvPr/@name="{nama}"]')[0]


def blob_ikon(s, nama):
    pic = next(sh for sh in s.shapes if sh.name == nama)
    return pic.image.blob


# ======================================================================= bangun
prs = Presentation(str(ASAL))
S = list(prs.slides)
IKON_GEMPA = blob_ikon(S[11], 'Picture 2')
IKON_API = blob_ikon(S[12], 'Picture 2')
IKON_AIR = blob_ikon(S[3], 'Picture 2')
simpan = {id(S[3]), id(S[12])}
lst = prs.slides._sldIdLst
for sid, s in zip(list(lst), S):
    if id(s) not in simpan:
        prs.part.drop_rel(sid.rId); lst.remove(sid)
s1, s2 = prs.slides[0], prs.slides[1]

for s, no in ((s1, '1'), (s2, '2')):
    for sh in list(s.shapes):   # navigasi tiga bab paparan provinsi tidak dipakai di deck dua slide
        if sh.top / EMU < 20: hapus(sh)
    nm = per_nama(s)
    tulis(nm['TextBox 11'], no)

# ---------------- hal. 1: riwayat 2008-2025
nm = per_nama(s1)
susun(nm['TextBox 3'], [('Riwayat Bencana Kabupaten Solok 2008 sampai 2025:', 0), (f' {ribu(tot["n"])} kejadian', 1), (', ', 2),
                        (f'{ribu(tot["mh"])} jiwa', 1), (' meninggal dan hilang', 2)])
susun(nm['TextBox 4'], [(f'{korban_top[0]} menelan ', 0), (f'{korban_top[1]["mh"]} dari {tot["mh"]}', 1), (' korban jiwa; banjir paling sering terjadi', 2)])
tulis(nm['TextBox 20'], 'Kejadian dan dampak per jenis bencana, 2008 sampai 2025, urut kejadian')
for n_, t in (('TextBox 22', 'JENIS BENCANA'), ('TextBox 23', 'KEJADIAN'), ('TextBox 24', 'MENINGGAL DAN HILANG'), ('TextBox 25', 'RUMAH RUSAK')):
    tulis(nm[n_], t)
X_NAMA, X_V = 777240, (2800980, 4714379, 5938054)
Y0, Y1 = 161.6, 465.0
baris = sorted({sh.top for sh in s1.shapes if sh.has_text_frame and sh.left == X_NAMA and sh.top > 2000000 and sh.top / EMU < Y1})
assert len(baris) == 12, len(baris)
garis = sorted([sh for sh in s1.shapes if sh.shape_type == 9 and abs(sh.left / EMU - 53.2) < .5 and Y0 < sh.top / EMU < Y1 - 1], key=lambda x: x.top)
assert len(garis) == 11, len(garis)
N = len(jenis); tinggi = (Y1 - Y0) / N
sel_baris = [[sh for sh in s1.shapes if sh.has_text_frame and sh.top == y and sh.left in (X_NAMA, *X_V)] for y in baris]
assert all(len(x) == 4 for x in sel_baris)
for i, sel in enumerate(sel_baris):
    if i >= N:
        for sh in sel: hapus(sh)
        continue
    k, c = jenis[i]
    for sh in sel:
        tulis(sh, {X_NAMA: k, X_V[0]: ribu(c['n']), X_V[1]: ribu(c['mh']), X_V[2]: ribu(c['rr'])}[sh.left])
        sh.top, sh.height = pt(Y0 + i * tinggi), pt(tinggi)
for i, gr in enumerate(garis):
    if i >= N - 1: hapus(gr)
    else: gr.top = pt(Y0 + (i + 1) * tinggi)
for n_, v in (('TextBox 88', 'Jumlah'), ('TextBox 89', ribu(tot['n'])), ('TextBox 90', ribu(tot['mh'])), ('TextBox 91', ribu(tot['rr']))):
    tulis(nm[n_], v)
assert sum(c['n'] for _, c in jenis) == tot['n'] and sum(c['rr'] for _, c in jenis) == tot['rr']

# sorotan: (judul, keterangan, angka, satuan)
rerata = tot['n'] / 18
SOROT = [(korban_top[0], 'Korban jiwa terbanyak', ribu(korban_top[1]['mh']), 'jiwa'),
         (ung_top[0], 'Pengungsi terbanyak', ribu(ung_top[1]['ung']), 'jiwa'),
         ('Banjir Nov 2025', 'Jiwa terdampak, terbesar', ribu(nov25['terdampak']), 'jiwa'),
         (rr_top[0], 'Rumah rusak terbanyak', ribu(rr_top[1]['rr']), 'rumah'),
         ('Rerata tahunan', 'Kejadian per tahun', koma(rerata), 'kejadian')]
KOTAK = [('TextBox 98', 'TextBox 99', 'TextBox 100', 'TextBox 101'), ('TextBox 105', 'TextBox 106', 'TextBox 107', 'TextBox 108'),
         ('TextBox 112', 'TextBox 113', 'TextBox 114', 'TextBox 115'), ('TextBox 119', 'TextBox 120', 'TextBox 121', 'TextBox 122'),
         ('TextBox 126', 'TextBox 127', 'TextBox 128', 'TextBox 129')]
KANAN = 906.8   # tepi kanan satuan di cangkang
for (j, k, a, u), (nj, nk, na, nu) in zip(SOROT, KOTAK):
    tulis(nm[nj], j); tulis(nm[nk], k); tulis(nm[na], a); tulis(nm[nu], u)
    nm[nu].width = pt(5.2 * len(u) + 2); nm[nu].left = pt(KANAN - 5.2 * len(u) - 2)
    nm[na].width = pt(70); nm[na].left = pt(nm[nu].left / EMU - 73)
    nm[na].text_frame.paragraphs[0].alignment = PP_ALIGN.RIGHT
    nm[nk].text_frame.paragraphs[0].alignment = PP_ALIGN.LEFT
    nm[nj].width = nm[nk].width = pt(nm[na].left / EMU - 661.0 - 4)
susun(nm['TextBox 131'], [('Sumber: ', 0), ('DIBI BNPB 2008 sampai 2025, Nov 2026; DIBI BNPB harian, 28 Okt 2026', 1)])

# ---------------- hal. 2: risiko dan kondisi 2026
nm = per_nama(s2)
susun(nm['TextBox 3'], [('Kabupaten Solok 2026: Banjir bandang 22 September menelan', 0), (f' {bb["meninggal"]} jiwa', 1),
                        ('; indeks risiko', 2), (f' {koma(ir_total)}', 1), (f' kelas {ir_kelas}', 3)])
susun(nm['TextBox 4'], [('Status Transisi Darurat Provinsi berlaku sampai ', 0), ('13 April 2027', 1)])
# panel kiri: peta karhutla diganti grafik IRBI per bahaya
for sh in list(s2.shapes):
    if sh.left / EMU < 585 and 139 < sh.top / EMU < 428: hapus(sh)
tulis(nm['TextBox 36'], 'Indeks risiko per bahaya, IRBI 2025')
ganti_ikon(nm['Picture 35'], blob_ikon(s1, 'Picture 94'))
ganti_ikon(nm['Picture 2'], IKON_AIR); ganti_ikon(nm['Picture 106'], IKON_AIR)
YB0, YB1, XL, XB, XR = 147.0, 392.0, 55.2, 190.0, 574.8
LB = 290.0   # panjang batang untuk nilai terbesar
skala = LB / max(v for _, v, _, _ in ir_bahaya)
t_b = (YB1 - YB0) / len(ir_bahaya)
for i, (lab, v, rk, n) in enumerate(ir_bahaya):
    y = YB0 + i * t_b
    if i % 2 == 0: kotak(s2, 53.2, y, 521.6, t_b, MUDA)
    label(s2, XL + 4, y, XB - XL - 10, t_b, lab, 10, NAVY, True)
    kotak(s2, XB, y + t_b / 2 - 7, v * skala, 14, ORANYE if rk == 1 else NAVY)
    label(s2, XB + v * skala + 5, y, 40, t_b, ribu(v), 10, NAVY, True)
    label(s2, XR - 92, y, 88, t_b, 'tertinggi di provinsi' if rk == 1 else f'peringkat {rk} dari {n}', 8.5, ORANYE if rk == 1 else ABU, rk == 1, PP_ALIGN.RIGHT)
kotak(s2, 53.2, YB1 + 6, 521.6, 24, NAVY)
label(s2, XL + 4, YB1 + 6, 300, 24, f'Indeks total {koma(ir_total)}, kelas {ir_kelas}', 10, 'FFFFFF', True)
label(s2, XR - 200, YB1 + 6, 196, 24, f'peringkat {ir_rank[0]} dari {ir_rank[1]} kab/kota Sumatera Barat', 8.5, 'FFFFFF', False, PP_ALIGN.RIGHT)

# panel kanan: dampak banjir bandang
tulis(nm['TextBox 107'], 'Dampak banjir bandang 22 Sep 2026')
tulis(nm['TextBox 109'], 'DAMPAK'); tulis(nm['TextBox 111'], 'JUMLAH')
DAMPAK = [('Meninggal dunia', f'{bb["meninggal"]} jiwa'), ('Luka', f'{bb["luka"]} jiwa'), ('Mengungsi', f'{bb["mengungsi"]} jiwa'),
          ('Rumah rusak berat', f'{bb["rr_berat"]} unit'), ('Rumah rusak sedang', f'{bb["rr_sedang"]} unit'), ('Rumah rusak ringan', f'{bb["rr_ringan"]} unit'),
          ('Rumah terendam', f'{bb["terendam"]} unit'), ('Kantor rusak', f'{bb["f_kantor"]} unit'), ('Jembatan rusak', f'{bb["jembatan"]} unit')]
RY0, RY1 = 161.6, 406.0
kiri = sorted([sh for sh in s2.shapes if sh.has_text_frame and abs(sh.left / EMU - 635.3) < .5 and RY0 - 1 < sh.top / EMU < RY1 - 1], key=lambda x: x.top)
kanan_ = sorted([sh for sh in s2.shapes if sh.has_text_frame and abs(sh.left / EMU - 829.7) < .5 and RY0 - 1 < sh.top / EMU < RY1 - 1], key=lambda x: x.top)
bulat = [sh for sh in s2.shapes if sh.name.startswith('Oval') and abs(sh.left / EMU - 613.6) < .5]
assert len(kiri) == len(kanan_) == 13 and len(bulat) == 12, (len(kiri), len(kanan_), len(bulat))
for sh in bulat: hapus(sh)
for sh in list(s2.shapes):   # garis baris lama tabel kanan
    if sh.shape_type == 9 and sh.left / EMU > 600 and RY0 < sh.top / EMU < RY1: hapus(sh)
t_r = (RY1 - RY0) / len(DAMPAK)
for i, (a, b) in enumerate(zip(kiri, kanan_)):
    if i >= len(DAMPAK):
        hapus(a); hapus(b); continue
    tulis(a, DAMPAK[i][0]); tulis(b, DAMPAK[i][1])
    for sh in (a, b): sh.top, sh.height = pt(RY0 + i * t_r), pt(t_r)
    a.left, a.width = pt(613.6), pt(200)
    b.left, b.width = pt(818.0), pt(80.8)
for i in range(1, len(DAMPAK)):
    gl = s2.shapes.add_connector(1, pt(605.6), pt(RY0 + i * t_r), pt(906.8), pt(RY0 + i * t_r))
    gl.line.color.rgb = RGBColor.from_string('D3DBE5'); gl.line.width = Pt(0.5)
akhir = sorted([sh for sh in s2.shapes if sh.shape_type == 17 and sh.top / EMU > 405 and sh.top / EMU < 410 and sh.left / EMU > 600], key=lambda x: x.left)
assert len(akhir) == 2, len(akhir)
tulis(akhir[0], 'Transisi darurat sampai'); tulis(akhir[1], '13 Apr 2027')
akhir[0].left, akhir[0].width = pt(613.6), pt(200); akhir[1].left, akhir[1].width = pt(818.0), pt(80.8)
judul_kolom = [sh for sh in s2.shapes if sh.has_text_frame and sh.text_frame.text == 'DAMPAK'][0]
judul_kolom.left, judul_kolom.width = pt(613.6), pt(200)
nilai_kolom = [sh for sh in s2.shapes if sh.has_text_frame and sh.text_frame.text == 'JUMLAH'][0]
nilai_kolom.left, nilai_kolom.width = pt(818.0), pt(80.8)
pita = next(sh for sh in s2.shapes if sh.name == 'Pita kolom utama')
pita.width = pt(205)

# strip bawah: ancaman lain
tulis(nm['TextBox 18'], 'ANCAMAN LAIN')
tulis(nm['TextBox 21'], 'Gunung Talang'); tulis(nm['TextBox 22'], f'{TALANG}, {TGL}')
tulis(nm['TextBox 26'], 'Gempa bumi')
nm['TextBox 27'].text_frame.paragraphs[0]._p.getparent().replace(nm['TextBox 27'].text_frame.paragraphs[0]._p, copy.deepcopy(nm['TextBox 22'].text_frame.paragraphs[0]._p))
tulis(nm['TextBox 27'], f'Skor risiko {g[0]}, peringkat {g_rank} dari {len(gk)}; {g[5]} gempa M5 ke atas dalam 100 km sejak 2000')
ganti_ikon(nm['Picture 25'], IKON_GEMPA)
tulis(nm['TextBox 31'], 'Karhutla 2026')
nm['TextBox 32'].text_frame.paragraphs[0]._p.getparent().replace(nm['TextBox 32'].text_frame.paragraphs[0]._p, copy.deepcopy(nm['TextBox 22'].text_frame.paragraphs[0]._p))
tulis(nm['TextBox 32'], f'{ribu(luas_sol)} ha terbakar, peringkat {k_rank} dari {len(k_urut)} kab/kota')
for n_ in ('TextBox 22', 'TextBox 27', 'TextBox 32'): nm[n_].text_frame.paragraphs[0].alignment = PP_ALIGN.LEFT
ganti_ikon(nm['Picture 30'], IKON_API)
susun(nm['TextBox 174'], [('Sumber: ', 0), (f'InaRISK BNPB 2025; DIBI BNPB, 28 Okt 2026; PVMBG, USGS, NASA FIRMS diolah BNPB, {TGL}', 1)])

# ---------------- akhir
prs.core_properties.title = 'Paparan Kebencanaan Kabupaten Solok'
semua = ' '.join(sh.text_frame.text for s in prs.slides for sh in semua_bentuk(s.shapes) if sh.has_text_frame)
for lama in ('Agam', 'Pesisir Selatan', 'Marapi', 'Kerinci', 'Pasaman', '211126', '21 Nov'):
    assert lama not in semua, f'sisa teks cangkang: {lama!r}'
keluar = DIR / f'{NAMA}.pptx'
prs.save(keluar)
print(keluar)


def pdf(pptx, out):
    ps = (f"$p = New-Object -ComObject PowerPoint.Application; "
          f"$d = $p.Presentations.Open('{pptx}', $true, $false, $false); "
          f"$d.SaveAs('{out}', 32); $d.Close(); $p.Quit()")
    subprocess.run(['powershell', '-NoProfile', '-Command', ps], check=True)


if '--tanpa-pdf' not in sys.argv:
    pdf(str(keluar), str(keluar.with_suffix('.pdf')))
    print(keluar.with_suffix('.pdf'))
