"""Banjir dan Longsor 2025 di Aceh, Sumatera Utara, Sumatera Barat: tiga slide berformat Paparan Kebencanaan 161126 (permintaan 17 Nov 2026).

Deck paparan itu dibangun di luar repo (tidak ada generatornya), jadi slidenya disalin dari berkasnya:
  Aceh  = hal. 13, Sumatera Utara = hal. 4 dari ../../kebencanaan-sumatera-utara-dan-aceh-2026-11-16/Revisi 2/*.pptx (isi tidak diubah),
  Sumatera Barat = salinan hal. 4 yang diisi ulang dari DIBI.
Cara hitung (sama dengan slide asli, angka Sumut dan Aceh terbukti sama persis):
  DIBI dasbor publik, tahun 2025, jenis Banjir, Banjir Genangan, Banjir Bandang, Banjir dan Tanah Longsor, Tanah Longsor, Gerakan Tanah;
  korban = meninggal + hilang; rumah rusak = berat + sedang + ringan; rerata = jumlah korban 2008 s.d. 2024 / 17.
Tarikan DIBI (17 Nov 2026) disimpan di luar repo karena besar:
  ~/.claude/skills/ppt-konsultan/bnpb/assets/proyek-banjir-sumatra-2025/data/dibi25/dibi_kab_jenis_2008_2025.json
Rangkuman per kab/kota ikut ditulis ke ringkas_sumbar.csv di folder ini.

  python buat.py      -> Banjir dan Longsor 2025 Aceh Sumut Sumbar 171126.pptx (+ PDF lewat LibreOffice)
"""
import copy, csv, json, os, subprocess
from collections import Counter, defaultdict
from pathlib import Path

from pptx import Presentation

DIR = Path(__file__).resolve().parent
ASAL = DIR.parents[1] / 'kebencanaan-sumatera-utara-dan-aceh-2026-11-16' / 'Revisi 2' / 'Paparan Kebencanaan Sumatera Utara dan Aceh 161126.pptx'
DIBI = Path.home() / '.claude/skills/ppt-konsultan/bnpb/assets/proyek-banjir-sumatra-2025/data/dibi25/dibi_kab_jenis_2008_2025.json'
NAMA = 'Banjir dan Longsor 2025 Aceh Sumut Sumbar 171126'
JENIS = {'Banjir', 'Banjir Genangan', 'Banjir Bandang', 'Banjir dan Tanah Longsor', 'Tanah Longsor', 'Gerakan Tanah'}
R_EMBED = '{http://schemas.openxmlformats.org/officeDocument/2006/relationships}embed'


def ribu(n):
    return f'{n:,}'.replace(',', '.')


def koma(x):
    return f'{x:.1f}'.replace('.', ',')


# ---------- data Sumatera Barat ----------
data = json.loads(DIBI.read_text(encoding='utf-8'))
kab = defaultdict(Counter)
tahun = Counter()
for r in data:
    if r['provinsi'] != 'Sumatera Barat' or str(r['jenis_bencana']).strip() not in JENIS:
        continue
    mh = r['meninggal'] + r['hilang']
    tahun[r['tahun']] += mh
    if r['tahun'] == 2025:
        c = kab[r['kabupaten']]
        c['mh'] += mh
        c['ung'] += r['mengungsi']
        c['rr'] += r['rumah_rusak_berat'] + r['rumah_rusak_sedang'] + r['rumah_rusak_ringan']
urut = sorted(kab.items(), key=lambda x: (-x[1]['mh'], -x[1]['ung'], x[0]))
tot = {k: sum(c[k] for c in kab.values()) for k in ('mh', 'ung', 'rr')}
rerata = sum(tahun[t] for t in range(2008, 2025)) / 17
kali = tot['mh'] / rerata
n_kab_korban = sum(c['mh'] > 0 for c in kab.values())
atas, sisa = urut[:11], urut[11:]
lain = {k: sum(c[k] for _, c in sisa) for k in ('mh', 'ung', 'rr')}
top_mh = urut[0][0]
top_ung = max(kab.items(), key=lambda x: x[1]['ung'])
with (DIR / 'ringkas_sumbar.csv').open('w', newline='', encoding='utf-8') as f:
    w = csv.writer(f)
    w.writerow(['kab', 'meninggal_hilang', 'mengungsi', 'rumah_rusak'])
    w.writerows([(k, c['mh'], c['ung'], c['rr']) for k, c in urut])
    w.writerow(['Jumlah', tot['mh'], tot['ung'], tot['rr']])
    w.writerow(['Rerata korban 2008-2024', koma(rerata), '', ''])
print('Sumbar', tot, 'rerata', koma(rerata), 'kali', round(kali, 1), 'kab korban', n_kab_korban, 'kab', len(kab))


# ---------- penyunting ----------
def tulis(sh, teks):
    """Ganti isi kotak teks; format run pertama dipertahankan."""
    p = sh.text_frame.paragraphs[0]
    p.runs[0].text = teks
    for r in p.runs[1:]:
        r._r.getparent().remove(r._r)


def ganti_run(sh, peta):
    for p in sh.text_frame.paragraphs:
        for r in p.runs:
            if r.text in peta:
                r.text = peta[r.text]


def gandakan(prs, src):
    baru = prs.slides.add_slide(src.slide_layout)
    for sh in list(baru.shapes):
        sh._element.getparent().remove(sh._element)
    rid = {}
    for k, rel in src.part.rels.items():
        if 'image' in rel.reltype:
            rid[k] = baru.part.relate_to(rel._target, rel.reltype)
    for el in src.shapes._spTree.iterchildren():
        if el.tag.endswith('}extLst'):
            continue
        e = copy.deepcopy(el)
        for b in e.iter():
            if b.get(R_EMBED) in rid:
                b.set(R_EMBED, rid[b.get(R_EMBED)])
        baru.shapes._spTree.append(e)
    return baru


prs = Presentation(str(ASAL))
s_sumut, s_aceh = prs.slides[3], prs.slides[12]
s_sumbar = gandakan(prs, s_sumut)
nama = {sh.name: sh for sh in s_sumbar.shapes}

# judul dan subjudul
ganti_run(nama['TextBox 3'], {' 430 jiwa': f' {ribu(tot["mh"])} jiwa', ' 13': f' {n_kab_korban}'})
for p in nama['TextBox 3'].text_frame.paragraphs:
    for r in p.runs:
        r.text = r.text.replace('Sumatera Utara', 'Sumatera Barat')
ganti_run(nama['TextBox 4'], {'lebih dari 17': f'lebih dari {int(kali)}'})
assert 'Sumatera Barat' in nama['TextBox 3'].text_frame.text and str(n_kab_korban) in nama['TextBox 3'].text_frame.text
assert f'lebih dari {int(kali)}' in nama['TextBox 4'].text_frame.text

# tabel: baris = kotak teks berkolom kiri 777240, urut dari atas
X_NAMA, X_V = 777240, (2800980, 4714379, 5938054)
baris = sorted({sh.top for sh in s_sumbar.shapes if sh.has_text_frame and sh.left == X_NAMA and sh.top > 2000000})
assert len(baris) == 12, len(baris)
isi = [(k, c['mh'], c['ung'], c['rr']) for k, c in atas] + [(f'Lainnya ({len(sisa)} kabupaten dan kota)', lain['mh'], lain['ung'], lain['rr'])]
for y, (k, a, b, c) in zip(baris, isi):
    for sh in s_sumbar.shapes:
        if sh.has_text_frame and sh.top == y and sh.left in (X_NAMA, *X_V):
            tulis(sh, {X_NAMA: k, X_V[0]: ribu(a), X_V[1]: ribu(b), X_V[2]: ribu(c)}[sh.left])
for nm, v in (('TextBox 89', tot['mh']), ('TextBox 90', tot['ung']), ('TextBox 91', tot['rr'])):
    tulis(nama[nm], ribu(v))
assert lain['mh'] + sum(c['mh'] for _, c in atas) == tot['mh']

# sorotan dampak
tulis(nama['TextBox 98'], top_mh)
tulis(nama['TextBox 100'], ribu(kab[top_mh]['mh']))
tulis(nama['TextBox 105'], top_ung[0])
tulis(nama['TextBox 107'], ribu(top_ung[1]['ung']))
tulis(nama['TextBox 114'], ribu(tot['ung']))
tulis(nama['TextBox 121'], ribu(tot['rr']))
tulis(nama['TextBox 128'], koma(rerata))

# ---------- susun: Aceh, Sumut, Sumbar; buang slide lain ----------
lst = prs.slides._sldIdLst
ids = list(lst)
pakai = {s_aceh.slide_id: 0, s_sumut.slide_id: 1, s_sumbar.slide_id: 2}
for sid in ids:
    if int(sid.get('id')) not in pakai:
        prs.part.drop_rel(sid.get('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id'))
        lst.remove(sid)
for sid in sorted(list(lst), key=lambda e: pakai[int(e.get('id'))]):
    lst.remove(sid)
    lst.append(sid)

# navigasi atas dan nomor halaman
TAB = [('TextBox 13', '01', 'Aceh'), ('TextBox 15', '02', 'Sumatera Utara'), ('TextBox 16', '03', 'Sumatera Barat')]
for i, s in enumerate(prs.slides):
    nm = {sh.name: sh for sh in s.shapes}
    for j, (k, no, teks) in enumerate(TAB):
        r0, r1 = nm[k].text_frame.paragraphs[0].runs[:2]
        r0.text, r1.text = f'{no}  ', teks
        aktif = i == j
        r0.font.color.rgb = __import__('pptx').dml.color.RGBColor.from_string('D9600B' if aktif else '6B7280')
        r1.font.color.rgb = __import__('pptx').dml.color.RGBColor.from_string('051C2C' if aktif else '6B7280')
        r1.font.bold = aktif
    nm['Rectangle 14'].left = nm[TAB[i][0]].left + 76200
    tulis(nm['TextBox 11'], str(i + 1))

keluar = DIR / f'{NAMA}.pptx'
prs.save(keluar)
print(keluar)
SOFFICE = os.environ.get('SOFFICE', r'C:\Program Files\LibreOffice\program\soffice.exe')
subprocess.run([SOFFICE, '--headless', '--convert-to', 'pdf', '--outdir', str(DIR), str(keluar)], check=True)
