"""Pembaca naskah Markdown kajian menjadi daftar blok (satu bentuk untuk HTML dan DOCX).

Konvensi lengkap: ../riset/KONVENSI-NASKAH.md dan mesin/README.md.
Blok yang dihasilkan (tuple):
  ('h', tingkat, teks)                     judul 1..4
  ('p', teks)                              paragraf (teks mentah, sebaris Markdown)
  ('singkatan', teks)                      paragraf "Singkatan dan istilah di bab ini:"
  ('list', [butir])                        butir = {'jenis':'ul'|'ol','no':'3','teks':..,'sub':[butir]}
  ('tabel', {'no','judul','kepala','rata','baris','sumber'})
  ('gambar', {'no','judul','berkas','sumber'})
  ('kutip', teks)
  ('kode', teks)
  ('kalimat', teks) ('kartu', [(nilai,label)]) ('temuan', [(judul,[blok])]) ('keputusan', [(judul,[blok])])
  ('metode', [blok]) ('tentang', [blok]) ('aksi', [(judul,[blok])])
  ('paradoks', {'kode','nama','meta','blok'})
"""
import re
from pathlib import Path

RE_BULLET = re.compile(r'^(\s*)([-*+]|\d{1,3}[.)])\s+(.*)$')
RE_CAP = re.compile(r'^(Tabel|Gambar)\s+(\d+(?:\.\d+)*)\.?\s+(.*)$', re.S)
RE_HEAD = re.compile(r'^(#{1,4})\s+(.*?)\s*#*\s*$')
RE_IMG = re.compile(r'^!\[(.*?)\]\((.*?)\)\s*$')
RE_SEP = re.compile(r'^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$')


def _starter(ln):
    """True bila baris ini memulai blok baru (memutus paragraf)."""
    s = ln.strip()
    if not s:
        return True
    if RE_HEAD.match(s) or s.startswith(':::') or s.startswith('```') or s.startswith('>') or s.startswith('|') or RE_IMG.match(s):
        return True
    if re.match(r'^-{3,}$', s):
        return True
    m = RE_BULLET.match(ln)
    if m and not ln.startswith(' ') and (m.group(2) in '-*+' or True):
        return True
    if RE_CAP.match(s) and re.match(r'^(Tabel|Gambar)\s+\d+(\.\d+)*\.\s', s):
        return True
    if s.startswith('Sumber:'):
        return True
    return False


def _sel(baris):
    b = baris.strip()
    b = b.replace('\\|', '\x00')
    if b.startswith('|'):
        b = b[1:]
    if b.endswith('|'):
        b = b[:-1]
    return [c.replace('\x00', '|').strip() for c in b.split('|')]


def _rata(sep):
    out = []
    for c in _sel(sep):
        if c.startswith(':') and c.endswith(':'):
            out.append('c')
        elif c.endswith(':'):
            out.append('r')
        else:
            out.append('l')
    return out


def _daftar(lines, i):
    """Baca daftar mulai baris i; kembalikan (butir top-level, indeks berikut)."""
    n = len(lines)
    top = []
    base = None
    cur_top = cur = None
    while i < n:
        ln = lines[i]
        if not ln.strip():
            j = i + 1
            while j < n and not lines[j].strip():
                j += 1
            if j >= n:
                i = j
                break
            nx = lines[j]
            if RE_BULLET.match(nx) or (nx.startswith('  ') and not nx.strip().startswith(('|', '#', ':::'))):
                i = j
                continue
            break
        m = RE_BULLET.match(ln)
        if m:
            ind = len(m.group(1).replace('\t', '    '))
            if base is None:
                base = ind
            jenis = 'ol' if m.group(2)[0].isdigit() else 'ul'
            it = {'jenis': jenis, 'no': m.group(2).rstrip('.)') if jenis == 'ol' else '', 'teks': m.group(3).strip(), 'sub': []}
            if ind >= base + 2 and cur_top is not None:
                cur_top['sub'].append(it)
                cur = it
            else:
                top.append(it)
                cur_top = cur = it
            i += 1
            continue
        if ln.startswith(' ') or (cur is not None and not _starter(ln)):
            if ln.strip().startswith(('|', '#', ':::')):
                break
            if cur is not None:
                cur['teks'] += ' ' + ln.strip()
            i += 1
            continue
        break
    return top, i


def _kotak(nama, inner, galat):
    if nama == 'kalimat':
        return ('kalimat', ' '.join(s.strip() for s in inner if s.strip()))
    if nama == 'kartu':
        item = []
        for s in inner:
            if '|' in s:
                a, b = s.split('|', 1)
                item.append((a.strip(), b.strip()))
        return ('kartu', item)
    if nama in ('temuan', 'keputusan', 'aksi'):
        grup, judul, buf = [], None, []
        for s in inner + ['#### \x00akhir']:
            if s.startswith('#### '):
                if judul is not None:
                    grup.append((judul, parse_baris(buf)))
                judul, buf = s[5:].strip(), []
            else:
                buf.append(s)
        return (nama, grup)
    if nama in ('metode', 'tentang'):
        return (nama, parse_baris(inner))
    galat.append('blok ::: tidak dikenal: ' + nama)
    return ('metode', parse_baris(inner))


def parse_baris(lines, galat=None):
    galat = [] if galat is None else galat
    n = len(lines)
    i = 0
    out = []
    while i < n:
        ln = lines[i]
        s = ln.strip()
        if not s:
            i += 1
            continue
        m = re.match(r'^:::\s*(\w+)\s*$', s)
        if m:
            j = i + 1
            while j < n and lines[j].strip() != ':::':
                j += 1
            out.append(_kotak(m.group(1), lines[i + 1:j], galat))
            i = j + 1
            continue
        if s.startswith('```'):
            j = i + 1
            while j < n and not lines[j].strip().startswith('```'):
                j += 1
            out.append(('kode', '\n'.join(lines[i + 1:j])))
            i = j + 1
            continue
        m = RE_HEAD.match(s)
        if m:
            out.append(('h', len(m.group(1)), m.group(2).strip()))
            i += 1
            continue
        if re.match(r'^-{3,}$', s):
            i += 1
            continue
        if s.startswith('|') and i + 1 < n and RE_SEP.match(lines[i + 1]):
            kepala = _sel(s)
            rata = _rata(lines[i + 1])
            baris = []
            j = i + 2
            while j < n and lines[j].strip().startswith('|'):
                r = _sel(lines[j])
                r = (r + [''] * len(kepala))[:len(kepala)]
                baris.append(r)
                j += 1
            out.append(('tabel', {'no': '', 'judul': '', 'kepala': kepala, 'rata': (rata + ['l'] * len(kepala))[:len(kepala)], 'baris': baris, 'sumber': ''}))
            i = j
            continue
        m = RE_IMG.match(s)
        if m:
            alt, berkas = m.group(1), m.group(2)
            mc = RE_CAP.match(alt)
            out.append(('gambar', {'no': mc.group(2) if mc else '', 'judul': (mc.group(3) if mc else alt).strip(), 'berkas': berkas, 'sumber': ''}))
            i += 1
            continue
        if s.startswith('>'):
            buf = []
            while i < n and lines[i].strip().startswith('>'):
                buf.append(lines[i].strip().lstrip('>').strip())
                i += 1
            out.append(('kutip', ' '.join(b for b in buf if b)))
            continue
        if RE_BULLET.match(ln):
            top, i = _daftar(lines, i)
            # pisahkan bila jenis tingkat atas berganti
            grup = []
            for it in top:
                if grup and grup[-1][0]['jenis'] == it['jenis']:
                    grup[-1].append(it)
                else:
                    grup.append([it])
            for g in grup:
                out.append(('list', g))
            continue
        buf = [s]
        i += 1
        while i < n and not _starter(lines[i]):
            buf.append(lines[i].strip())
            i += 1
        t = ' '.join(buf)
        out.append(('singkatan', t) if t.startswith('Singkatan dan istilah') else ('p', t))
    return out


def _pasang_keterangan(blok):
    """Tempel 'Tabel n.m. Judul' dan 'Sumber: ...' ke tabel atau gambar terdekat."""
    out = []
    i = 0
    while i < len(blok):
        b = blok[i]
        if b[0] == 'p' and RE_CAP.match(b[1]) and re.match(r'^(Tabel|Gambar)\s+\d+(\.\d+)*\.\s', b[1]) and i + 1 < len(blok) and blok[i + 1][0] in ('tabel', 'gambar'):
            m = RE_CAP.match(b[1])
            nb = dict(blok[i + 1][1])
            nb['no'], nb['judul'] = m.group(2), m.group(3).strip()
            blok[i + 1] = (blok[i + 1][0], nb)
            i += 1
            continue
        if b[0] == 'p' and b[1].startswith('Sumber:') and out and out[-1][0] in ('tabel', 'gambar') and not out[-1][1]['sumber']:
            out[-1][1]['sumber'] = b[1][len('Sumber:'):].strip()
            i += 1
            continue
        out.append(b)
        i += 1
    return out


def _kelompok_paradoks(blok):
    out = []
    i = 0
    while i < len(blok):
        b = blok[i]
        m = re.match(r'^(P-\d+)\s+(.*)$', b[2]) if b[0] == 'h' and b[1] == 3 else None
        if m:
            j = i + 1
            while j < len(blok) and not (blok[j][0] == 'h' and blok[j][1] <= 3):
                j += 1
            isi = blok[i + 1:j]
            meta = ''
            if isi and isi[0][0] == 'p' and isi[0][1].startswith('**Kelompok'):
                meta = isi[0][1]
                isi = isi[1:]
            out.append(('paradoks', {'kode': m.group(1), 'nama': m.group(2).strip(), 'meta': meta, 'blok': isi}))
            i = j
            continue
        out.append(b)
        i += 1
    return out


def baca(path):
    """-> (blok, galat). Berkas tidak ada: ([], ['tidak ada'])."""
    p = Path(path)
    galat = []
    txt = p.read_text(encoding='utf-8-sig').replace('\r\n', '\n').replace('\r', '\n')
    blok = parse_baris(txt.split('\n'), galat)
    blok = _pasang_keterangan(blok)
    # buang "Status:" sebelum subbab pertama
    hasil, lewat = [], False
    for b in blok:
        if b[0] == 'h' and b[1] == 2:
            lewat = True
        if not lewat and b[0] == 'p' and b[1].startswith('Status:'):
            continue
        hasil.append(b)
    hasil = _kelompok_paradoks(hasil)
    return hasil, galat


# ---------- sebaris ----------
_RE_LINK = re.compile(r'\[([^\]]+)\]\(([^)\s]+)\)')


def inline(t):
    """Teks Markdown sebaris -> [(teks, flags)] dengan flags subset 'bic'."""
    t = _RE_LINK.sub(lambda m: m.group(1), t)
    ESC = '*_`[]#|'
    t = re.sub(r'\\([*_`\[\]#|])', lambda m: chr(0xE000 + ESC.index(m.group(1))), t)
    hasil = []

    def kode(s, f):
        # pisah `kode`
        for k, bag in enumerate(re.split(r'`([^`]*)`', s)):
            if k % 2:
                hasil.append((bag, f + 'c'))
            elif bag:
                miring(bag, f)

    def miring(s, f):
        pos = 0
        for m in re.finditer(r'(?<![\w*])\*(?!\s|\*)(.+?)(?<![\s*])\*(?![\w*])', s):
            if m.start() > pos:
                hasil.append((s[pos:m.start()], f))
            hasil.append((m.group(1), f + 'i'))
            pos = m.end()
        if pos < len(s):
            hasil.append((s[pos:], f))

    def tebal(s, f):
        # tebal mungkin memuat kode, jadi pisah tebal dulu kecuali di dalam kode
        potong = re.split(r'(`[^`]*`)', s)
        gabung = ''
        bagian = []
        for k, bag in enumerate(potong):
            bagian.append(bag)
        s2 = ''.join(bagian)
        pos = 0
        # cari **...** di luar kode
        mask = list(s2)
        for m in re.finditer(r'`[^`]*`', s2):
            for q in range(m.start(), m.end()):
                mask[q] = '\x03'
        s3 = ''.join(mask)
        for m in re.finditer(r'\*\*(?!\s)(.+?)(?<!\s)\*\*', s3):
            if m.start() > pos:
                kode(s2[pos:m.start()], f)
            kode(s2[m.start() + 2:m.end() - 2], f + 'b')
            pos = m.end()
        if pos < len(s2):
            kode(s2[pos:], f)

    tebal(t, '')
    keluar = []
    for tx, f in hasil:
        tx = ''.join(ESC[ord(c) - 0xE000] if 0xE000 <= ord(c) <= 0xE006 else c for c in tx)
        if tx:
            if keluar and keluar[-1][1] == f:
                keluar[-1] = (keluar[-1][0] + tx, f)
            else:
                keluar.append((tx, f))
    # penanda catatan (catatan.py) -> potongan berbendera 'n' berisi nomor, mis. ('1,2', 'n')
    akhir = []
    for tx, f in keluar:
        for k, bag in enumerate(re.split(r'([\d,]+)', tx)):
            if k % 2:
                akhir.append((bag, f + 'n'))
            elif bag:
                akhir.append((bag, f))
    return akhir


def polos(t):
    return ''.join(x for x, f in inline(t) if 'n' not in f)


# ---------- bantu bersama HTML dan DOCX ----------
def pecah_h1(t):
    """'BAB 5 Judul' -> ('BAB 5', 'Judul'); 'Lampiran A, kelompok B: X' -> ('LAMPIRAN A', 'Kelompok B: X'); lain -> (None, t)."""
    m = re.match(r'^(BAB\s+\d+)\s*[.:,]?\s*(.*)$', t, re.I)
    if m:
        return re.sub(r'\s+', ' ', m.group(1).upper()), m.group(2).strip()
    m = re.match(r'^Lampiran\s+([A-Z])\s*[.,:]?\s*(.*)$', t)
    if m:
        sisa = m.group(2).strip()
        return 'LAMPIRAN ' + m.group(1), (sisa[:1].upper() + sisa[1:]) if sisa else ''
    return None, t


def teks_toc(t):
    lb, jd = pecah_h1(polos(t))
    return (lb + '  ' + jd).strip() if lb else polos(t)


def bobot_kolom(kepala, baris):
    """Persen lebar kolom dari isi sel (tanpa colgroup di Markdown)."""
    n = len(kepala)
    w = []
    for k in range(n):
        sel = [polos(r[k]) for r in baris] or ['']
        avg = sum(len(s) for s in sel) / len(sel)
        kata = max([len(x) for s in sel for x in s.split()] + [1.5 * max([len(x) for x in polos(kepala[k]).split()] or [4])])
        num = all(re.fullmatch(r'[\d.,%\s+\-–/x≥≤<>]*', s) for s in sel)
        v = max(min(avg, 55), 1.25 * min(kata, 22), 5)
        if num:
            v = max(1.25 * min(kata, 22), 6, min(v, 11))
        w.append(v)
    tot = sum(w)
    pct = [100 * x / tot for x in w]
    # lebar minimum supaya kata terpanjang (dan kata kepala, huruf kapital lebih lebar) tidak terpotong:
    # sekitar 1,1 persen lebar tabel per huruf, ditambah ruang sel pada ukuran huruf tabel
    mins = []
    for k in range(n):
        kata_sel = max([len(x) for r in baris for x in polos(r[k]).split()] or [1])
        kata_kepala = max([len(x) for x in polos(kepala[k]).split()] or [1])
        mins.append(min(40, (max(kata_sel, 1.25 * kata_kepala) + 2.5) * 1.1))
    for _ in range(4):
        kurang = [k for k in range(n) if pct[k] < mins[k]]
        if not kurang:
            break
        tambah = sum(mins[k] - pct[k] for k in kurang)
        sisa = [k for k in range(n) if k not in kurang]
        ruang = sum(pct[k] - mins[k] for k in sisa if pct[k] > mins[k])
        if ruang <= 0:
            break
        f = min(1, tambah / ruang)
        for k in sisa:
            if pct[k] > mins[k]:
                pct[k] -= (pct[k] - mins[k]) * f
        for k in kurang:
            pct[k] = mins[k]
    tot = sum(pct)
    return [round(100 * x / tot, 2) for x in pct]


def ukuran_tabel(ncol):
    return 9 if ncol <= 3 else 8.6 if ncol == 4 else 8 if ncol == 5 else 7.6 if ncol == 6 else 7.1


def isi_singkatan(t):
    return t.split(':', 1)[1].strip() if ':' in t else t
