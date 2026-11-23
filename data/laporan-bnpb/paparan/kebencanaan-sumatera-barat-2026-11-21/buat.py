"""Paparan Kebencanaan Sumatera Barat 211126, pola Aceh dan Sumatera Utara 161126 (permintaan 21 Nov 2026: "untuk sumbar pakai pola yang B").

Spek deck.py asal paparan 161126 ada di proyek-wilayah di mesin lain (tidak ada di sini), jadi deck disusun dari berkasnya,
cara yang sama dengan ../banjir-sumatra-2025/format-paparan/buat.py (17 Nov 2026):
  cangkang = ../kebencanaan-sumatera-utara-2026-11-16/Revisi 1/Paparan Kebencanaan Sumatera Utara 161126.pptx (sudah memuat catatan Bang Ghozi)
  hal. 4      Banjir dan Longsor 2025: diisi ulang dari DIBI (cara hitung sama dengan format-paparan/buat.py)
  hal. 6-10   Situasi banjir terkini: isi slide dari generator/situasi_banjir.py --lengkap (bahan/), navigasi tiga tab dari cangkang
  hal. 12     Gempa dan Tsunami: public/gempa/data/risiko.json (USGS, sama dengan angka Sumut) + korban gempa DIBI
  hal. 13     Karhutla dan Gunung Api: centurisk97.id/data peta_karhutla(.kab).json, status MAGMA, pengungsi erupsi DIBI; peta digambar ulang
Slide Logistik dan Mitigasi (pola A) tidak dibuat: bantuan peralatan per kabupaten (Direktorat Logistik) untuk Sumbar tidak ada di repo.

  python situasi_banjir.py --prov "Sumatera Barat" --lengkap --tanggal 2026-11-21 --hari 4 --keluar ../paparan/kebencanaan-sumatera-barat-2026-11-21/bahan
  python buat.py      -> Paparan Kebencanaan Sumatera Barat 211126.pptx + .pdf (PowerPoint)
"""
import copy, io, json, math, os, re, subprocess, sys, urllib.request
from collections import Counter, defaultdict
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont
from pptx import Presentation
from pptx.opc.constants import RELATIONSHIP_TYPE as RT
from pptx.opc.packuri import PackURI
from pptx.util import Emu, Pt

DIR = Path(__file__).resolve().parent
PAP = DIR.parent
AKAR = DIR.parents[3]
ASAL = PAP / 'kebencanaan-sumatera-utara-2026-11-16' / 'Revisi 1' / 'Paparan Kebencanaan Sumatera Utara 161126.pptx'
BANJIR = DIR / 'bahan' / 'Situasi Banjir Sumatera Barat 211126.pptx'
SKILL = Path.home() / '.claude/skills/ppt-konsultan/bnpb/assets'
DIBI = SKILL / 'proyek-banjir-sumatra-2025/data/dibi25/dibi_kab_jenis_2008_2025.json'
GEO = SKILL / 'proyek-bnpb/geo/kabupaten'
FONT = AKAR / 'data/laporan-bnpb/generator/font/Roboto-Bold.ttf'
NAMA = 'Paparan Kebencanaan Sumatera Barat 211126'
PROV, KODE, TGL, TGL_PJ = 'Sumatera Barat', '13', '21 Nov 2026', '21 November 2026'
# status MAGMA Indonesia (magma.esdm.go.id/v1/gunung-api/tingkat-aktivitas), diperiksa 21 Nov 2026; Talang dan Tandikat Level I
GUNUNG = [('Marapi', 'Waspada, radius ', '3 km'), ('Kerinci', 'Waspada, radius ', '3 km')]
EMU = 12700
A = '{http://schemas.openxmlformats.org/drawingml/2006/main}'
R = '{http://schemas.openxmlformats.org/officeDocument/2006/relationships}'
# warna impor deck.py yang dipakai slide banjir 161126 (manifest banjir-sumut, catatan impor_warna)
WARNA_IMPOR = {'EEF3F9': 'EEF5FC', 'FDF3E7': 'FDF1E8', 'C98A4B': 'B08A3E', 'D5DBE3': 'D3DBE5', '9A5B1E': '8A4B2A', '4F86C6': '2F86D1', '9CC3E6': 'A4CAEE'}


def ribu(n):
    return f'{round(n):,}'.replace(',', '.')


def koma(x, d=1):
    return f'{x:.{d}f}'.replace('.', ',')


def web(nama):
    """Berkas data situs tayang (salinan repo tertinggal, memori angka-karhutla-metode-deck); disimpan di bahan/web."""
    ke = DIR / 'bahan' / 'web' / nama.replace('/', '_')
    if not ke.exists():
        ke.parent.mkdir(parents=True, exist_ok=True)
        req = urllib.request.Request('https://centurisk97.id/' + nama, headers={'User-Agent': 'Mozilla/5.0'})
        ke.write_bytes(urllib.request.urlopen(req, timeout=120).read())
    return json.loads(ke.read_text(encoding='utf-8'))


# ======================================================================= data
dibi = json.loads(DIBI.read_text(encoding='utf-8'))
BANJIR25 = {'Banjir', 'Banjir Genangan', 'Banjir Bandang', 'Banjir dan Tanah Longsor', 'Tanah Longsor', 'Gerakan Tanah'}
GEMPA = {'Gempabumi', 'Gempa Bumi dan Tsunami', 'Tsunami'}
ERUPSI = {'Erupsi Gunung Api'}


def jenis(r):
    return str(r['jenis_bencana']).strip()


# --- hal. 4: banjir dan longsor 2025 (sama dengan format-paparan/buat.py)
kab25, tahun = defaultdict(Counter), Counter()
for r in dibi:
    if r['provinsi'] != PROV or jenis(r) not in BANJIR25: continue
    mh = r['meninggal'] + r['hilang']; tahun[r['tahun']] += mh
    if r['tahun'] == 2025:
        c = kab25[r['kabupaten']]; c['mh'] += mh; c['ung'] += r['mengungsi']
        c['rr'] += r['rumah_rusak_berat'] + r['rumah_rusak_sedang'] + r['rumah_rusak_ringan']
urut25 = sorted(kab25.items(), key=lambda x: (-x[1]['mh'], -x[1]['ung'], x[0]))
tot25 = {k: sum(c[k] for c in kab25.values()) for k in ('mh', 'ung', 'rr')}
rerata = sum(tahun[t] for t in range(2008, 2025)) / 17
kali = tot25['mh'] / rerata
n_kab_korban = sum(c['mh'] > 0 for c in kab25.values())
atas25, sisa25 = urut25[:11], urut25[11:]
lain25 = {k: sum(c[k] for _, c in sisa25) for k in ('mh', 'ung', 'rr')}
top_ung = max(kab25.items(), key=lambda x: x[1]['ung'])
print('banjir 2025', tot25, 'rerata', koma(rerata), 'kali', koma(kali), 'kab korban', n_kab_korban)


# --- hal. 12: gempa. Cara hitung diuji ke angka paparan 161126: Sumut 5 jiwa, Aceh 165 jiwa
def korban(prov, himp, per_kab=False):
    o = Counter()
    for r in dibi:
        if r['provinsi'] == prov and jenis(r) in himp: o[r['kabupaten'] if per_kab else 0] += r['meninggal'] + r['hilang']
    return o if per_kab else o[0]


assert korban('Sumatera Utara', GEMPA) == 5, korban('Sumatera Utara', GEMPA)
print('cek gempa Aceh (paparan 161126: 165):', korban('Aceh', GEMPA), '| cek erupsi Sumut (159.096):', sum(r['mengungsi'] for r in dibi if r['provinsi'] == 'Sumatera Utara' and jenis(r) in ERUPSI))
risiko = json.loads((AKAR / 'public/gempa/data/risiko.json').read_text(encoding='utf-8'))
assert risiko['kolom'][:6] == ['skor', 'kekerapan', 'besaran', 'tren', 'm_maks', 'n_2000_2025']
assert risiko['kab']['12|Nias Utara'][0] == 78   # angka paparan Sumut 161126
gk = sorted(((v[0], k.split('|')[1], v) for k, v in risiko['kab'].items() if k.startswith(KODE + '|')), key=lambda x: (-x[0], x[1]))
gempa12 = gk[:12]
korban_kab = korban(PROV, GEMPA, True)
korban_gempa = korban(PROV, GEMPA)
m_maks = max(v[4] for _, _, v in gk)
print('gempa', [(n, s) for s, n, _ in gempa12], 'korban', korban_gempa, 'M maks', m_maks)

# --- hal. 13: karhutla (luas = peta_karhutla.json kumulatif provinsi; per kab = peta_karhutla_kab.json, cara paparan 161126)
P, K = web('data/peta_karhutla.json'), web('data/peta_karhutla_kab.json')
luas_prov = {k: sum(v or 0 for v in p['luas']) for k, p in P['prov'].items()}
assert round(luas_prov['12']) == 6564 or P['dibuat'] > '2026-11-16', luas_prov['12']
peringkat = sorted(luas_prov, key=lambda k: -luas_prov[k]).index(KODE) + 1
luas_kab = {v['nama']: sum(x[1] for x in v['d']) for k, v in K['kab'].items() if v['prov'] == KODE}
uk = sorted(((round(l), n) for n, l in luas_kab.items() if round(l) > 0), key=lambda x: (-x[0], x[1]))
luas_tot = round(luas_prov[KODE])
kar12, n_lain = uk[:12], max(0, len(uk) - 12)
luas_lain = luas_tot - sum(l for l, _ in kar12)
ungsi_erupsi = sum(r['mengungsi'] for r in dibi if r['provinsi'] == PROV and jenis(r) in ERUPSI)
print('karhutla', luas_tot, 'ha, peringkat', peringkat, 'dari', len(luas_prov), '| kab', uk, '| lainnya', n_lain, luas_lain, '| pengungsi erupsi', ungsi_erupsi, '| data', P['dibuat'])


# ======================================================================= penyunting
def teks(sh):
    return sh.text_frame.text if sh.has_text_frame else ''


def semua_bentuk(shapes):
    for sh in shapes:
        if sh.shape_type == 6:
            yield from semua_bentuk(sh.shapes)
        else:
            yield sh


def tulis(sh, t):
    """Ganti isi kotak; format run pertama dipertahankan."""
    p = sh.text_frame.paragraphs[0]
    p.runs[0].text = t
    for r in p.runs[1:]: r._r.getparent().remove(r._r)


def susun(sh, bagian):
    """Isi paragraf pertama dari [(teks, indeks run asal yang formatnya dipakai)]; pindah baris paksa dibuang."""
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


def ganti_global(prs, peta):
    for s in prs.slides:
        for sh in semua_bentuk(s.shapes):
            if not sh.has_text_frame: continue
            for p in sh.text_frame.paragraphs:
                for r in p.runs:
                    for a, b in peta.items():
                        if a in r.text: r.text = r.text.replace(a, b)


def per_nama(s):
    return {sh.name: sh for sh in s.shapes}


def di(s, x, y, tol=1.0):
    """Bentuk teks di kiri-atas (x, y) pt."""
    return [sh for sh in s.shapes if sh.has_text_frame and abs(sh.left / EMU - x) < tol and abs(sh.top / EMU - y) < tol]


def hapus(sh):
    sh._element.getparent().remove(sh._element)


# ======================================================================= bangun
prs = Presentation(str(ASAL))
S = prs.slides
ganti_global(prs, {'Sumatera Utara': PROV, 'Sumatera\xa0Utara': 'Sumatera\xa0Barat', '16 November 2026': TGL_PJ})

# ---------------- hal. 4
s4 = S[3]; nm = per_nama(s4)
susun(nm['TextBox 3'], [('Banjir dan Longsor 2025:', 0), (f' {ribu(tot25["mh"])} jiwa', 1), (' Meninggal dan Hilang di', 2),
                        (f' {n_kab_korban} kabupaten dan kota', 3), (f' {PROV}', 5)])
susun(nm['TextBox 4'], [('Korban ', 0), (f'lebih dari {int(kali)}' if kali >= 2 else f'sekitar {koma(kali)}', 1), (' kali rerata korban tahunan 2008 sampai 2024', 2)])
X_NAMA, X_V = 777240, (2800980, 4714379, 5938054)
baris = sorted({sh.top for sh in s4.shapes if sh.has_text_frame and sh.left == X_NAMA and sh.top > 2000000})
assert len(baris) == 12, len(baris)
isi = [(k, c['mh'], c['ung'], c['rr']) for k, c in atas25] + [(f'Lainnya ({len(sisa25)} kabupaten dan kota)', lain25['mh'], lain25['ung'], lain25['rr'])]
for y, (k, a, b, c) in zip(baris, isi):
    for sh in s4.shapes:
        if sh.has_text_frame and sh.top == y and sh.left in (X_NAMA, *X_V):
            tulis(sh, {X_NAMA: k, X_V[0]: ribu(a), X_V[1]: ribu(b), X_V[2]: ribu(c)}[sh.left])
for n_, v in (('TextBox 89', tot25['mh']), ('TextBox 90', tot25['ung']), ('TextBox 91', tot25['rr'])): tulis(nm[n_], ribu(v))
tulis(nm['TextBox 98'], urut25[0][0]); tulis(nm['TextBox 100'], ribu(urut25[0][1]['mh']))
tulis(nm['TextBox 105'], top_ung[0]); tulis(nm['TextBox 107'], ribu(top_ung[1]['ung']))
tulis(nm['TextBox 114'], ribu(tot25['ung'])); tulis(nm['TextBox 121'], ribu(tot25['rr'])); tulis(nm['TextBox 128'], koma(rerata))
assert lain25['mh'] + sum(c['mh'] for _, c in atas25) == tot25['mh']


# ---------------- hal. 6-10: isi slide generator, navigasi tiga tab dari cangkang
def salin_isi(dst, src, lewati):
    pkg = dst.part.package
    for sh in src.shapes:
        if lewati(sh): continue
        el = copy.deepcopy(sh._element)
        for e in el.iter():
            for at in (R + 'embed', R + 'id', R + 'link'):
                rid = e.get(at)
                if not rid or rid not in src.part.rels: continue
                rel = src.part.rels[rid]
                if rel.reltype == RT.IMAGE:
                    _, baru = dst.part.get_or_add_image_part(io.BytesIO(rel.target_part.blob))
                elif rel.reltype == RT.CHART:
                    cp = rel.target_part
                    cp.partname = pkg.next_partname('/ppt/charts/chart%d.xml')
                    wb = cp.chart_workbook.xlsx_part
                    if wb is not None: wb.partname = pkg.next_partname('/ppt/embeddings/Microsoft_Excel_Worksheet%d.xlsx')
                    baru = dst.part.relate_to(cp, RT.CHART)
                else:
                    raise SystemExit(f'relasi belum ditangani: {rel.reltype}')
                e.set(at, baru)
            if e.tag == A + 'srgbClr' and e.get('val', '').upper() in WARNA_IMPOR:
                e.set('val', WARNA_IMPOR[e.get('val').upper()])
        dst.shapes._spTree.append(el)


B = Presentation(str(BANJIR))
assert len(B.slides) == 5
NAV = 20 * EMU
for i, src in enumerate(B.slides):
    dst = S[5 + i]
    for sh in list(dst.shapes):
        if (sh.top or 0) >= NAV: hapus(sh)
    salin_isi(dst, src, lambda sh: (sh.top or 0) < NAV)
    no = [sh for sh in dst.shapes if sh.has_text_frame and abs(sh.left / EMU - 873.6) < 1 and abs(sh.top / EMU - 512.6) < 1]
    assert len(no) == 1, len(no)
    tulis(no[0], str(6 + i))

# ---------------- hal. 12: gempa
s12 = S[11]; nm = per_nama(s12)
susun(nm['TextBox 3'], [('Gempa dan Tsunami: Skor risiko tertinggi', 0), (f' {gempa12[0][0]}', 1), (f' di {gempa12[0][1]}; korban ', 2),
                        (f'{ribu(korban_gempa)} jiwa', 3), (' sejak 2008', 4)])
susun(nm['TextBox 4'], [('Gempa terbesar sejak 2000 bermagnitudo ', 0), (koma(m_maks), 1)])
PT_SKOR = 302.3 / 78   # lebar batang per poin skor di cangkang (78 -> 302,3 pt)
X_BATANG = 166.2
label = sorted([sh for sh in s12.shapes if sh.has_text_frame and abs(sh.left / EMU - 53.2) < .5 and sh.top / EMU > 160], key=lambda x: x.top)
batang = sorted([sh for sh in s12.shapes if sh.name.startswith('Rectangle') and abs(sh.left / EMU - X_BATANG) < .5], key=lambda x: x.top)
nilai = sorted([sh for sh in s12.shapes if sh.has_text_frame and sh.width / EMU < 20 and 160 < sh.top / EMU < 490 and sh.left / EMU > 300 and sh.left / EMU < 500], key=lambda x: x.top)
assert len(label) == len(batang) == len(nilai) == 12, (len(label), len(batang), len(nilai))
for (skor, kab, v), lb, bt, nv in zip(gempa12, label, batang, nilai):
    tulis(lb, kab); bt.width = Emu(int(skor * PT_SKOR * EMU)); tulis(nv, str(skor)); nv.left = Emu(int((X_BATANG + skor * PT_SKOR + 3.0) * EMU))
KOL12 = {'nama': 526.3, 'm': 652.0, 'n': 738.6, 'korban': 839.0}
tops = sorted({round(sh.top / EMU, 1) for sh in s12.shapes if sh.has_text_frame and abs(sh.left / EMU - KOL12['nama']) < .5 and sh.top / EMU > 150})
assert len(tops) == 12, tops
for (skor, kab, v), y in zip(gempa12, tops):
    for k, x in KOL12.items():
        sel = di(s12, x, y, .6); assert len(sel) == 1, (k, y)
        tulis(sel[0], {'nama': kab, 'm': koma(v[4]), 'n': str(v[5]), 'korban': ribu(korban_kab.get(kab, 0))}[k])

# ---------------- hal. 13: karhutla dan gunung api
s13 = S[12]; nm = per_nama(s13)
susun(nm['TextBox 3'], [('Karhutla dan Gunung Api: Seluas', 0), (f' {ribu(luas_tot)} ha', 1), (' lahan terbakar', 2),
                        (f' sepanjang 2026; {" dan ".join(g[0] for g in GUNUNG)} berstatus Waspada', 3)])
susun(nm['TextBox 4'], [(f'Karhutla {PROV} peringkat ', 0), (str(peringkat), 1), (' nasional', 2)])
tulis(nm['TextBox 21'], GUNUNG[0][0]); susun(nm['TextBox 22'], [(GUNUNG[0][1], 0), (GUNUNG[0][2], 1)])
tulis(nm['TextBox 26'], GUNUNG[1][0])
nm['TextBox 27'].text_frame.paragraphs[0]._p.getparent().replace(nm['TextBox 27'].text_frame.paragraphs[0]._p, copy.deepcopy(nm['TextBox 22'].text_frame.paragraphs[0]._p))
susun(nm['TextBox 27'], [(GUNUNG[1][1], 0), (GUNUNG[1][2], 1)])
tulis(nm['TextBox 32'], f'{ribu(ungsi_erupsi)} jiwa')
susun(nm['TextBox 174'], [('Sumber: ', 0), (f'NASA FIRMS, diolah BNPB, {TGL}; MAGMA Indonesia, PVMBG, {TGL}; DIBI BNPB, Nov 2026', 1)])

# tabel Data Karhutla: kolom HOTSPOT dibuang (hotspot per kab setahun tidak tersedia; titik harian situs hanya 143 dari 324 hari)
for sh in list(s13.shapes):
    if sh.has_text_frame and abs(sh.left / EMU - 751.7) < .5 and sh.top / EMU >= 145: hapus(sh)
tops = sorted({round(sh.top / EMU, 1) for sh in s13.shapes if sh.has_text_frame and abs(sh.left / EMU - 635.3) < .5 and sh.top / EMU > 150})
assert len(tops) == 14, tops   # 12 kab + Lainnya + Jumlah
rows = [(k, ribu(l)) for l, k in kar12] + [(f'Lainnya ({n_lain} kab/kota)', ribu(luas_lain)), ('Jumlah', ribu(luas_tot))]
for (k, l), y in zip(rows, tops):
    a, b = di(s13, 635.3, y, .6), di(s13, 829.7, y, .6); assert len(a) == len(b) == 1, y
    tulis(a[0], k); tulis(b[0], l)
assert len(kar12) == 12


# --- peta kab Sumbar: kelas luas seperti legenda cangkang, gaya peta 161126
KELAS = [(100, 'FBE7D6'), (300, 'F4C3A0'), (600, 'E8894A'), (1000, 'D9600B'), (10 ** 9, '8F3F07')]


def warna_kelas(l):
    return next(w for b, w in KELAS if l < b)


def cincin(g):
    return [g['coordinates']] if g['type'] == 'Polygon' else g['coordinates']


G = {}
for f in sorted(GEO.glob('*.json')):
    for ft in json.loads(f.read_text(encoding='utf-8'))['features']:
        G[(f.stem[:2], ft['properties']['kab'])] = ft['geometry']
xs = [c for (p, _), g in G.items() if p == KODE for q in cincin(g) for c in q[0]]
lon0, lon1, lat0, lat1 = min(c[0] for c in xs), max(c[0] for c in xs), min(c[1] for c in xs), max(c[1] for c in xs)
BX, BY, BW, BH = 53.2, 145.0, 521.6, 209.6   # bingkai peta di cangkang (pt)
ISI = .94
s_pt = min(BH * ISI / (lat1 - lat0), 250 / (lon1 - lon0))   # pt per derajat
PW = (lon1 - lon0) * s_pt + BH * (1 - ISI)
PX = BX + BW / 2 - PW / 2
cx, cy = (lon0 + lon1) / 2, (lat0 + lat1) / 2
SX = lambda lon: PX + PW / 2 + (lon - cx) * s_pt
SY = lambda lat: BY + BH / 2 - (lat - cy) * s_pt
DPP = 3.2   # piksel per pt (peta cangkang 696 px untuk 217,4 pt)
W_, H_ = int(PW * DPP), int(BH * DPP)
im = Image.new('RGBA', (W_, H_), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
px = lambda lon, lat: ((SX(lon) - PX) * DPP, (SY(lat) - BY) * DPP)
for (p, k), g in G.items():   # daratan tetangga
    if p == KODE: continue
    for q in cincin(g):
        pts = [px(*c) for c in q[0]]
        if len(pts) > 2 and any(-50 < x < W_ + 50 and -50 < y < H_ + 50 for x, y in pts[::10]):
            d.polygon(pts, fill='#F1F3F6', outline='#FFFFFF', width=2)
pusat = {}
for (p, k), g in G.items():   # garis provinsi: garis tebal di bawah isian
    if p != KODE: continue
    for q in cincin(g):
        pts = [px(*c) for c in q[0]]
        if len(pts) > 2: d.line(pts + [pts[0]], fill='#A9B4C2', width=7, joint='curve')
for (p, k), g in G.items():
    if p != KODE: continue
    utama = max((q[0] for q in cincin(g)), key=len)
    pusat[k] = (sum(c[0] for c in utama) / len(utama), sum(c[1] for c in utama) / len(utama))
    for q in cincin(g):
        pts = [px(*c) for c in q[0]]
        if len(pts) > 2: d.polygon(pts, fill='#' + warna_kelas(luas_kab.get(k, 0)), outline='#FFFFFF', width=2)
png = DIR / 'bahan' / 'peta_karhutla_kab.png'
im.save(png, optimize=True)
assert all(k in pusat for _, k in kar12[:8]), [k for _, k in kar12[:8] if k not in pusat]

peta = nm['Picture 38']
blip = peta._element.find('.//' + A + 'blip')
_, rid = s13.part.get_or_add_image_part(str(png))
blip.set(R + 'embed', rid)
peta.left, peta.top, peta.width, peta.height = Emu(int(PX * EMU)), Emu(int(BY * EMU)), Emu(int(PW * EMU)), Emu(int(BH * EMU))

# skala 100 km
setengah = 100 / 111.32 * s_pt / 2
r98, r99 = nm['Rectangle 98'], nm['Rectangle 99']
r98.width = r99.width = Emu(int(setengah * EMU)); r99.left = Emu(r98.left + r98.width)
km = nm['TextBox 101']; km.left = Emu(int(r99.left + r99.width - km.width / 2))

# delapan label: [penghubung, titik, pil, lingkaran, ikon, teks] berurutan sesudah peta
urut_b = list(s13.shapes)
i0 = urut_b.index(peta) + 1; i1 = urut_b.index(nm['TextBox 87'])
grup = [urut_b[j:j + 6] for j in range(i0, i1, 6)]
assert len(grup) == 8 and all(g[0].shape_type == 9 and g[5].has_text_frame for g in grup), [len(g) for g in grup]
fb = ImageFont.truetype(str(FONT), 919)   # 9,19 pt x 100
lebar_pt = lambda t: fb.getlength(t) / 100
PAD = 47.7 - lebar_pt('Karo  638')   # kalibrasi kotak teks cangkang
titik = [(k, l, SX(pusat[k][0]), SY(pusat[k][1])) for l, k in kar12[:8]]
titik.sort(key=lambda t: t[2])
kiri, kanan = sorted(titik[:4], key=lambda t: t[3]), sorted(titik[4:], key=lambda t: t[3])
PH, Y0, Y1 = 21.2, BY + 6, BY + BH - 6
for sisi, kel in (('l', kiri), ('r', kanan)):
    ys = [min(max(t[3] - PH / 2, Y0), Y1 - PH) for t in kel]
    for j in range(1, len(ys)): ys[j] = max(ys[j], ys[j - 1] + PH + 6)
    lebih = ys[-1] + PH - Y1
    if lebih > 0: ys = [y - lebih for y in ys]
    for j in range(len(ys) - 2, -1, -1): ys[j] = min(ys[j], ys[j + 1] - PH - 6)
    for (k, l, dx, dy), y, g in zip(kel, ys, grup[:4] if sisi == 'l' else grup[4:]):
        con, dot, pil, ov, ik, tb = g
        r0, r1 = tb.text_frame.paragraphs[0].runs[:2]
        r0.text, r1.text = k, f'  {ribu(l)}'
        tw = lebar_pt(k + f'  {ribu(l)}') + PAD
        pw = 21.2 + tw + 4.0
        x0 = 58.2 if sisi == 'l' else BX + BW - 4.9 - pw
        pil.left, pil.top, pil.width = Emu(int(x0 * EMU)), Emu(int(y * EMU)), Emu(int(pw * EMU))
        ov.left, ov.top = Emu(int((x0 + 2.8) * EMU)), Emu(int((y + 2.7) * EMU))
        ik.left, ik.top = Emu(int((x0 + 5.6) * EMU)), Emu(int((y + 5.5) * EMU))
        tb.left, tb.top, tb.width = Emu(int((x0 + 21.2) * EMU)), Emu(int(y * EMU)), Emu(int(tw * EMU))
        dot.left, dot.top = Emu(int((dx - 2.2) * EMU)), Emu(int((dy - 2.2) * EMU))
        ujung = x0 + pw if sisi == 'l' else x0
        con.begin_x, con.begin_y = Emu(int(ujung * EMU)), Emu(int((y + PH / 2) * EMU))
        con.end_x, con.end_y = Emu(int(dx * EMU)), Emu(int(dy * EMU))

# ---------------- akhir: periksa, simpan, PDF
prs.core_properties.title = f'Paparan Kebencanaan {PROV}'
semua = ' '.join(teks(sh) for s in prs.slides for sh in semua_bentuk(s.shapes))
for lama in ('Sumatera Utara', 'Sumatera\xa0Utara', 'Nias', 'Sinabung', 'Sorik', 'Labuhanbatu', 'Deli Serdang', 'Tapanuli'):
    assert lama not in semua, f'sisa teks Sumut: {lama!r}'
luar_banjir = ' '.join(teks(sh) for j, s in enumerate(prs.slides) if not 5 <= j <= 9 for sh in semua_bentuk(s.shapes))
assert '16 Nov' not in luar_banjir and '161126' not in luar_banjir, 'sisa tanggal paparan 161126'
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
