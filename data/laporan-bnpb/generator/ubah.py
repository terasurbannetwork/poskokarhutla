"""BL-07 bot laporan: inventaris shape, terapkan operasi ubah, pratinjau PNG (KEPUTUSAN-BOT-LAPORAN D1, D3, D6, D8; ALGORITMA A5, A6, A8).

Claude tidak menyunting PPTX (D1): ia hanya mengeluarkan operasi (scripts/wa/claude/skema_operasi.json); berkas ini yang menerapkannya di atas
deck hasil generator. Nama shape stabil s<n>_* dari harian_ringkas.namai_deck; slide bernomor 1 seperti di <deck>.kunci.json.

Penomoran baris sama dengan `sel` di kunci: tabel asli (graphicFrame) baris 0 = kepala, data pertama = 1, kolom mulai 0. Shape teks biasa
diperlakukan sebagai daftar: baris = paragraf, paragraf pertama = 0. Baris baru tabel: sel dipisah '|'.

    py ubah.py inventaris <pptx>
    py ubah.py terapkan <pptx_in> <ops.json> <kunci.json> <pptx_out>
    py ubah.py pratinjau <pdf|pptx> <slide,slide> <dir>
Keluaran JSON ke stdout.
"""
import copy, io, json, os, re, shutil, subprocess, sys, tempfile, unicodedata, zipfile

from pptx import Presentation
from pptx.presentation import Presentation as _Deck
from pptx.util import Emu

try:   # satu sumber kata angka sistem (K4) dengan generator
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from harian_ringkas import KATA_KUNCI, _metrik
except Exception:   # pragma: no cover - cadangan bila generator tak bisa diimpor
    _metrik = lambda t: None
    KATA_KUNCI = re.compile(r'hot\s*-?\s*spot|fire\s*-?\s*spot|titik\s+(?:panas|api)|(?:luas|lahan|hutan|area)\s+(?:yang\s+)?terbakar|\bha\s+terbakar|'
                            r'belum\s+padam|sudah\s+padam|luas\s+padam', re.I)

A = '{http://schemas.openxmlformats.org/drawingml/2006/main}'
JENIS = ('ganti_teks', 'ganti_sel', 'tambah_baris', 'hapus_baris', 'catatan', 'sembunyikan_slide', 'tampilkan_slide', 'tanya')
WAKTU_ZIP = (1980, 1, 1, 0, 0, 0)


def norm(t):
    return ' '.join(str(t or '').split())


def norm_baris(t):   # baris tabel: pemisah sel '|' atau tab tidak dihitung
    return norm(re.sub(r'[|\t]', ' ', str(t or '')))


def bersih(t):
    """NFKC lalu buang karakter format Unicode (Cf: zero-width, soft hyphen) supaya 'hot\u200bspot' tetap terbaca kata kunci."""
    return ''.join(ch for ch in unicodedata.normalize('NFKC', str(t or '')) if unicodedata.category(ch) != 'Cf')


def kata_metrik(t):
    """True bila teks memuat kata angka sistem atau nama metrik (HOTSPOT, FIRESPOT, LUAS TERBAKAR, BELUM PADAM), dengan atau tanpa angka."""
    b = bersih(t)
    return bool(b) and (bool(KATA_KUNCI.search(b)) or any(_metrik(x) for x in b.split(chr(10))))


def teks_kunci(t):
    """True bila teks memuat kata angka sistem (hotspot, firespot, titik panas/api, luas terbakar, belum padam) bersama angka."""
    b = bersih(t)
    return bool(b) and bool(KATA_KUNCI.search(b)) and bool(re.search(r'\d', b))


def nama_label(nama, n):
    """Shape label/kepala angka sistem: nama berakhiran _label atau berawalan s<n>_kpi_."""
    return bool(nama) and (nama.endswith('_label') or nama.startswith(f's{n}_kpi_'))


def label_dilanggar(lama, baru):
    """Alasan tolak untuk teks label/kepala tabel: kata metrik di teks baru (tanpa syarat angka), atau kata metrik lama dihilangkan."""
    if kata_metrik(baru): return 'label atau kepala tabel tidak boleh memuat kata angka sistem; kepala metrik hanya dari generator'
    if kata_metrik(lama): return 'label atau kepala metrik angka sistem tidak boleh diganti namanya'
    return None


def _shapes(kumpulan):
    for sh in kumpulan:
        yield sh
        if sh.shape_type == 6:   # GROUP
            yield from _shapes(sh.shapes)


def _teks(sh):
    return sh.text_frame.text.replace('\v', '\n') if sh.has_text_frame else ''


def inventaris(pptx):
    """[{slide, shape, teks, tabel?}] per shape bertulisan atau tabel, urutan dokumen. Slide mulai 1."""
    prs = pptx if isinstance(pptx, _Deck) else Presentation(pptx)
    out = []
    for n, s in enumerate(prs.slides, 1):
        for sh in _shapes(s.shapes):
            if getattr(sh, 'has_table', False) and sh.has_table:
                out.append({'slide': n, 'shape': sh.name, 'teks': '', 'tabel': [[c.text.replace('\v', '\n') for c in r.cells] for r in sh.table.rows]})
            elif sh.has_text_frame and _teks(sh).strip():
                out.append({'slide': n, 'shape': sh.name, 'teks': _teks(sh)})
    return out


# ----------------------------------------------------------------------------- tulis teks dengan format run pertama

def _paragraf(txBody):
    return txBody.findall(A + 'p')


def _templat(p):
    """(pPr, rPr) paragraf p: pPr pertama dan rPr run pertama (atau endParaRPr) disalin."""
    ppr = p.find(A + 'pPr')
    r = p.find(A + 'r')
    rpr = r.find(A + 'rPr') if r is not None else None
    if rpr is None: rpr = p.find(A + 'endParaRPr')
    return (copy.deepcopy(ppr) if ppr is not None else None), (copy.deepcopy(rpr) if rpr is not None else None)


def _buat_p(ppr, rpr, teks):
    from lxml import etree
    p = etree.Element(A + 'p')
    if ppr is not None: p.append(copy.deepcopy(ppr))
    r = etree.SubElement(p, A + 'r')
    if rpr is not None:
        rp = copy.deepcopy(rpr); rp.tag = A + 'rPr'; r.append(rp)
    etree.SubElement(r, A + 't').text = teks
    return p


def tulis_teks(txBody, teks):
    """Ganti seluruh isi txBody dengan teks (baris dipisah '\\n'); font run pertama paragraf pertama dipertahankan."""
    par = _paragraf(txBody)
    acuan = next((p for p in par if p.find(A + 'r') is not None), par[0] if par else None)
    ppr, rpr = _templat(acuan) if acuan is not None else (None, None)
    pos = list(txBody).index(par[0]) if par else len(txBody)
    for p in par: txBody.remove(p)
    for k, baris in enumerate(str(teks).split('\n')):
        txBody.insert(pos + k, _buat_p(ppr, rpr, baris))


def _teks_p(p):
    return ''.join(t.text or '' for t in p.iter(A + 't'))


# ----------------------------------------------------------------------------- kunci

def baca_kunci(kunci):
    if kunci is None: return []
    if isinstance(kunci, str):
        if kunci in ('', '-') or not os.path.exists(kunci): return []
        with open(kunci, encoding='utf-8') as f: kunci = json.load(f)
    return list(kunci)


def _indeks_kunci(kunci):
    utuh, sel = set(), {}
    for e in baca_kunci(kunci):
        kc = (int(e['slide']), e['shape'])
        if e.get('sel'): sel.setdefault(kc, set()).add(tuple(int(x) for x in e['sel']))
        else: utuh.add(kc)
    return utuh, sel


# ----------------------------------------------------------------------------- terapkan

def _cari(slide, nama):
    return next((sh for sh in _shapes(slide.shapes) if sh.name == nama), None)


def _kaki_atas(prs, slide, n):
    """y teratas pita kaki (Pita kaki atau s<n>_kaki_*); cadangan tinggi slide - 350000 EMU."""
    ys = [sh.top for sh in slide.shapes if sh.top is not None and (sh.name == 'Pita kaki' or sh.name.startswith(f's{n}_kaki_'))]
    return min(ys) if ys else prs.slide_height - 350000


def _font_kecil(slide, n):
    """(ukuran sz, typeface) teks kecil deck: run kaki sumber, cadangan 800 Roboto."""
    sh = next((s for s in slide.shapes if s.name == f's{n}_kaki_sumber' and s.has_text_frame), None)
    if sh is not None:
        for p in sh.text_frame.paragraphs:
            for r in p.runs:
                rpr = r._r.find(A + 'rPr')
                lat = rpr.find(A + 'latin') if rpr is not None else None
                return (int(rpr.get('sz')) if rpr is not None and rpr.get('sz') else 800), (lat.get('typeface') if lat is not None else 'Roboto')
    return 800, 'Roboto'


def _catatan(prs, slide, n, teks):
    from lxml import etree
    ada = [sh for sh in slide.shapes if sh.name.startswith(f's{n}_catatan_bot_')]
    k = len(ada) + 1
    sz, huruf = _font_kecil(slide, n)
    tinggi = Emu(int(sz * 127 * 2.4))   # sz dalam 1/100 pt; 1 pt = 12700 EMU; dua baris longgar
    x = Emu(548640)
    lebar = Emu(prs.slide_width - 2 * x)
    y = Emu(_kaki_atas(prs, slide, n) - 30000 - k * (tinggi + 20000))
    tb = slide.shapes.add_textbox(x, y, lebar, tinggi)
    tb.name = f's{n}_catatan_bot_{k}'
    body = tb.text_frame._txBody
    bpr = body.find(A + 'bodyPr')
    for kk, v in (('lIns', '0'), ('tIns', '0'), ('rIns', '0'), ('bIns', '0'), ('anchor', 'b'), ('wrap', 'square')): bpr.set(kk, v)
    rpr = etree.Element(A + 'rPr'); rpr.set('lang', 'id-ID'); rpr.set('sz', str(sz)); rpr.set('i', '1'); rpr.set('dirty', '0')
    isi = etree.SubElement(rpr, A + 'solidFill'); etree.SubElement(isi, A + 'srgbClr').set('val', '595959')
    etree.SubElement(rpr, A + 'latin').set('typeface', huruf)
    for p in _paragraf(body): body.remove(p)
    for b in str(teks).split('\n'): body.append(_buat_p(None, rpr, b))
    return tb.name


def terapkan(pptx_in, ops, kunci, pptx_out):
    """Terapkan operasi berurutan. -> {diterapkan: [op], dilewati: [{ke, op, alasan}], tanya: [op]}. pptx_out ditulis deterministik."""
    if isinstance(ops, str):
        with open(ops, encoding='utf-8') as f: ops = json.load(f)
    if isinstance(ops, dict): ops = ops.get('operasi') or []
    utuh, sel_k = _indeks_kunci(kunci)
    prs = Presentation(pptx_in)
    slides = list(prs.slides)
    hasil = {'diterapkan': [], 'dilewati': [], 'tanya': []}

    def lewati(ke, op, alasan):
        hasil['dilewati'].append({'ke': ke, 'op': op, 'alasan': alasan})

    for ke, op in enumerate(ops):
        if not isinstance(op, dict) or op.get('jenis') not in JENIS:
            lewati(ke, op, 'jenis operasi tidak dikenal'); continue
        j = op['jenis']
        if j == 'tanya':
            hasil['tanya'].append(op); continue
        try: n = int(op.get('slide'))
        except (TypeError, ValueError): lewati(ke, op, 'nomor slide tidak sah'); continue
        if not 1 <= n <= len(slides):
            lewati(ke, op, f'slide {n} tidak ada (deck {len(slides)} slide)'); continue
        slide = slides[n - 1]
        baru = op.get('teks_baru') if 'teks_baru' in op else op.get('teks')
        if j in ('ganti_teks', 'ganti_sel', 'tambah_baris', 'catatan') and teks_kunci(baru):
            lewati(ke, op, 'teks baru memuat kata angka sistem bersama angka; angka sistem hanya dari generator'); continue
        if j in ('sembunyikan_slide', 'tampilkan_slide'):
            if j == 'sembunyikan_slide': slide._element.set('show', '0')
            elif 'show' in slide._element.attrib: del slide._element.attrib['show']
            hasil['diterapkan'].append(op); continue
        if j == 'catatan':
            if not norm(baru): lewati(ke, op, 'teks catatan kosong'); continue
            _catatan(prs, slide, n, baru); hasil['diterapkan'].append(op); continue
        sh = _cari(slide, op.get('shape'))
        if sh is None: lewati(ke, op, f"shape {op.get('shape')!r} tidak ada di slide {n}"); continue
        kc = (n, sh.name)
        if kc in utuh: lewati(ke, op, 'shape terkunci: memuat angka sistem'); continue
        tabel = sh.has_table if getattr(sh, 'has_table', False) else False
        if j == 'ganti_teks':
            if tabel: lewati(ke, op, 'shape berupa tabel; pakai ganti_sel'); continue
            if not sh.has_text_frame: lewati(ke, op, 'shape tidak bertulisan'); continue
            if norm(_teks(sh)) != norm(op.get('teks_lama')): lewati(ke, op, 'teks_lama tidak cocok dengan teks sekarang'); continue
            if nama_label(sh.name, n) and (a := label_dilanggar(_teks(sh), baru)): lewati(ke, op, a); continue
            tulis_teks(sh.text_frame._txBody, baru); hasil['diterapkan'].append(op); continue
        if j == 'ganti_sel':
            if not tabel: lewati(ke, op, 'shape bukan tabel; pakai ganti_teks'); continue
            try: r, c = int(op['baris']), int(op['kolom'])
            except (KeyError, TypeError, ValueError): lewati(ke, op, 'baris atau kolom tidak sah'); continue
            t = sh.table
            if not (0 <= r < len(t.rows) and 0 <= c < len(t.columns)): lewati(ke, op, f'sel [{r}, {c}] di luar tabel'); continue
            if (r, c) in sel_k.get(kc, ()): lewati(ke, op, f'sel [{r}, {c}] terkunci: memuat angka sistem'); continue
            sel = t.cell(r, c)
            if norm(sel.text) != norm(op.get('teks_lama')): lewati(ke, op, 'teks_lama tidak cocok dengan isi sel sekarang'); continue
            if r == 0 and (a := label_dilanggar(sel.text, baru)): lewati(ke, op, a); continue
            tulis_teks(sel.text_frame._txBody, baru); hasil['diterapkan'].append(op); continue
        # tambah_baris, hapus_baris
        if tabel and sel_k.get(kc):
            lewati(ke, op, 'tabel memuat sel terkunci; menyisip atau menghapus baris menggeser angka sistem'); continue
        if tabel:
            tbl = sh.table._tbl
            trs = tbl.findall(A + 'tr')
            if j == 'tambah_baris':
                try: b = int(op['setelah_baris'])
                except (KeyError, TypeError, ValueError): lewati(ke, op, 'setelah_baris tidak sah'); continue
                if not 0 <= b < len(trs): lewati(ke, op, f'setelah_baris {b} di luar tabel'); continue
                tr = copy.deepcopy(trs[b])
                isi = [x.strip() for x in str(baru).split('|')]
                for k, tc in enumerate(tr.findall(A + 'tc')):
                    tulis_teks(tc.find(A + 'txBody'), isi[k] if k < len(isi) else '')
                trs[b].addnext(tr); hasil['diterapkan'].append(op); continue
            try: b = int(op['baris'])
            except (KeyError, TypeError, ValueError): lewati(ke, op, 'baris tidak sah'); continue
            if b == 0: lewati(ke, op, 'baris kepala tabel tidak dihapus'); continue
            if not 0 < b < len(trs): lewati(ke, op, f'baris {b} di luar tabel'); continue
            lama = ' '.join(_teks_p(tc) for tc in trs[b].findall(A + 'tc'))
            if norm_baris(lama) != norm_baris(op.get('teks_lama')): lewati(ke, op, 'teks_lama tidak cocok dengan baris sekarang'); continue
            tbl.remove(trs[b]); hasil['diterapkan'].append(op); continue
        if not sh.has_text_frame: lewati(ke, op, 'shape bukan tabel atau daftar'); continue
        body = sh.text_frame._txBody
        par = _paragraf(body)
        if j == 'tambah_baris':
            try: b = int(op['setelah_baris'])
            except (KeyError, TypeError, ValueError): lewati(ke, op, 'setelah_baris tidak sah'); continue
            if not 0 <= b < len(par): lewati(ke, op, f'setelah_baris {b} di luar daftar ({len(par)} baris)'); continue
            if nama_label(sh.name, n) and (a := label_dilanggar('', baru)): lewati(ke, op, a); continue
            ppr, rpr = _templat(par[b])
            for k, t in enumerate(reversed(str(baru).split('\n'))): par[b].addnext(_buat_p(ppr, rpr, t))
            hasil['diterapkan'].append(op); continue
        try: b = int(op['baris'])
        except (KeyError, TypeError, ValueError): lewati(ke, op, 'baris tidak sah'); continue
        if not 0 <= b < len(par): lewati(ke, op, f'baris {b} di luar daftar ({len(par)} baris)'); continue
        if len(par) == 1: lewati(ke, op, 'baris satu-satunya; pakai ganti_teks'); continue
        if norm(_teks_p(par[b])) != norm(op.get('teks_lama')): lewati(ke, op, 'teks_lama tidak cocok dengan baris sekarang'); continue
        if nama_label(sh.name, n) and kata_metrik(_teks_p(par[b])): lewati(ke, op, 'label atau kepala metrik angka sistem tidak boleh dihapus'); continue
        body.remove(par[b]); hasil['diterapkan'].append(op)

    simpan(prs, pptx_out)
    return hasil


def simpan(prs, keluar):
    """Simpan dengan cap waktu zip tetap supaya masukan sama = berkas sama (D6, versi bisa dibandingkan)."""
    buf = io.BytesIO(); prs.save(buf); buf.seek(0)
    sementara = keluar + '.tmp'
    with zipfile.ZipFile(buf) as zi, zipfile.ZipFile(sementara, 'w', zipfile.ZIP_DEFLATED) as zo:
        for it in zi.infolist():
            zo.writestr(zipfile.ZipInfo(it.filename, WAKTU_ZIP), zi.read(it.filename), compress_type=zipfile.ZIP_DEFLATED)
    os.replace(sementara, keluar)


# ----------------------------------------------------------------------------- pratinjau (A8, D8)

def _png_fitz(pdf, slides, keluar, lebar=1280):
    import pymupdf as fitz
    out = []
    with fitz.open(pdf) as d:
        for n in slides:
            if not 1 <= n <= d.page_count: continue
            pg = d[n - 1]
            z = lebar / pg.rect.width
            f = os.path.join(keluar, f'pratinjau-{n}.png')
            pg.get_pixmap(matrix=fitz.Matrix(z, z)).save(f); out.append(f)
    return out


def _png_pdftoppm(pdf, slides, keluar):
    exe = shutil.which('pdftoppm')
    if not exe: raise RuntimeError('pdftoppm tidak ada')
    out = []
    for n in slides:
        akar = os.path.join(keluar, f'pratinjau-{n}')
        subprocess.run([exe, '-png', '-r', '96', '-f', str(n), '-l', str(n), '-singlefile', pdf, akar], check=True, capture_output=True, timeout=120)
        if os.path.exists(akar + '.png'): out.append(akar + '.png')
    return out


def _soffice():
    for c in (shutil.which('soffice'), shutil.which('soffice.exe'), r'C:\Program Files\LibreOffice\program\soffice.exe',
              r'C:\Program Files (x86)\LibreOffice\program\soffice.exe', '/Applications/LibreOffice.app/Contents/MacOS/soffice', '/usr/bin/soffice'):
        if c and os.path.exists(c): return c
    return None


def _pdf_soffice(pptx, tmp):
    exe = _soffice()
    if not exe: raise RuntimeError('LibreOffice soffice tidak ada')
    profil = 'file:///' + os.path.join(tmp, 'profil').replace('\\', '/').lstrip('/')   # profil sendiri: tak bentrok dengan LibreOffice yang sedang terbuka
    subprocess.run([exe, f'-env:UserInstallation={profil}', '--headless', '--convert-to', 'pdf', '--outdir', tmp, pptx],
                   check=True, capture_output=True, timeout=180)
    pdf = os.path.join(tmp, os.path.splitext(os.path.basename(pptx))[0] + '.pdf')
    if not os.path.exists(pdf): raise RuntimeError('soffice tidak menghasilkan PDF')
    return pdf


def _png_powerpoint(pptx, slides, keluar):
    """Ekspor PNG lewat PowerPoint COM. Jalur dan nomor slide lewat variabel lingkungan, tidak disisipkan ke teks -Command."""
    if os.name != 'nt': raise RuntimeError('PowerPoint COM hanya di Windows')
    ps = ("$a=New-Object -ComObject PowerPoint.Application;$p=$a.Presentations.Open($env:UBAH_PPTX,$true,$false,$false);"
          "try{foreach($n in $env:UBAH_SLIDES.Split(',')){$p.Slides.Item([int]$n).Export((Join-Path $env:UBAH_KELUAR ('pratinjau-'+$n+'.png')),'PNG',1280,720)}}"
          "finally{$p.Close();if($a.Presentations.Count -eq 0){$a.Quit()}}")
    env = dict(os.environ, UBAH_PPTX=os.path.abspath(pptx), UBAH_KELUAR=os.path.abspath(keluar), UBAH_SLIDES=','.join(str(int(n)) for n in slides))
    subprocess.run(['powershell', '-NoProfile', '-NonInteractive', '-Command', ps], check=True, capture_output=True, timeout=180, env=env)
    return [f for f in (os.path.join(keluar, f'pratinjau-{n}.png') for n in slides) if os.path.exists(f)]


def pratinjau_rinci(berkas, slides, keluar_dir):
    """-> (daftar png, metode atau None, catatan kegagalan). Urutan: PyMuPDF, pdftoppm, LibreOffice, PowerPoint COM."""
    keluar_dir = os.path.normpath(keluar_dir)
    os.makedirs(keluar_dir, exist_ok=True)
    slides = sorted({int(n) for n in slides})
    gagal = []
    pdf = berkas if berkas.lower().endswith('.pdf') else None
    tmp = None
    try:
        if pdf is None:   # PPTX: jadikan PDF dulu lewat LibreOffice, lalu render seperti PDF
            tmp = tempfile.mkdtemp(prefix='ubah_pratinjau_')
            try: pdf = _pdf_soffice(berkas, tmp)
            except Exception as e: gagal.append(f'soffice: {e}')
        if pdf:
            for nama, fn in (('pymupdf', _png_fitz), ('pdftoppm', _png_pdftoppm)):
                try:
                    out = fn(pdf, slides, keluar_dir)
                    if out: return out, nama + ('' if berkas == pdf else '+soffice'), gagal
                    gagal.append(f'{nama}: tidak ada halaman')
                except Exception as e: gagal.append(f'{nama}: {e}')
        if not berkas.lower().endswith('.pdf'):
            try:
                out = _png_powerpoint(berkas, slides, keluar_dir)
                if out: return out, 'powerpoint', gagal
                gagal.append('powerpoint: tidak ada PNG')
            except Exception as e: gagal.append(f'powerpoint: {e}')
    finally:
        if tmp: shutil.rmtree(tmp, ignore_errors=True)
    return [], None, gagal


def pratinjau(berkas, slides, keluar_dir):
    """PNG slide terpilih (pratinjau-<n>.png). Tanpa perender: [] dan alasan ke stderr, tidak berhenti."""
    out, metode, gagal = pratinjau_rinci(berkas, slides, keluar_dir)
    if metode: print(f'pratinjau: {metode}', file=sys.stderr)
    else: print('pratinjau: tidak ada perender yang jalan; ' + '; '.join(gagal), file=sys.stderr)
    return out


# ----------------------------------------------------------------------------- CLI

def utama(argv=None):
    a = list(sys.argv[1:] if argv is None else argv)
    pakai = 'pakai: ubah.py inventaris <pptx> | terapkan <pptx_in> <ops.json> <kunci.json> <pptx_out> | pratinjau <file> <slide,slide> <dir>'
    if not a: print(pakai, file=sys.stderr); return 2
    if a[0] == 'inventaris' and len(a) == 2: hasil = inventaris(a[1])
    elif a[0] == 'terapkan' and len(a) == 5: hasil = terapkan(a[1], a[2], a[3], a[4])
    elif a[0] == 'pratinjau' and len(a) == 4:
        png, metode, gagal = pratinjau_rinci(a[1], [int(x) for x in a[2].split(',') if x.strip()], a[3])
        if not metode: print('pratinjau: tidak ada perender yang jalan; ' + '; '.join(gagal), file=sys.stderr)
        hasil = {'png': png, 'metode': metode}
    else: print(pakai, file=sys.stderr); return 2
    sys.stdout.write(json.dumps(hasil, ensure_ascii=False, indent=1) + '\n')
    return 0


if __name__ == '__main__':
    sys.exit(utama())
