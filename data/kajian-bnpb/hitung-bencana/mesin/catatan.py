"""Praproses naskah: URL dan path berkas di paragraf diganti penanda catatan bernomor.

Penanda dalam teks: U+E100 + nomor (dipisah koma bila beberapa) + U+E101. naskah.inline() mengubahnya
menjadi potongan berbendera 'n'. Teks catatan per berkas ada di DAFTAR[nama] = [[butir, ...], ...]
(nomor mulai 1 per berkas; HTML memakai catatan akhir bab, DOCX catatan kaki asli).
Dikecualikan: pustaka.md dan lampiran-g.md (daftar sumber, tercetak apa adanya) dan kolom "Sumber" tabel di lampiran-c.md.
"""
import re

KECUALI = {'pustaka.md', 'lampiran-g.md'}
KECUALI_KOLOM = {'lampiran-c.md': 'sumber'}
DAFTAR = {}

URL = r'https?://[^\s`()<>\]\[]+'
KODE = r'`[^`]+`'
EKS = r'(?:json|py|md|mjs|js|cjs|csv|docx|pdf|html|sql|ya?ml|css|png|jpe?g|txt|geojson|xlsx|pptx|ps1|sh|toml)'
RE_URL = re.compile(URL)
RE_TOKEN = re.compile(f'({KODE}|{URL})')
AWAL, AKHIR = '\uE100', '\uE101'


def _url_bersih(u):
    return u.rstrip('.,;:')


def _butir(tok):
    """Token -> teks butir catatan, atau None bila bukan URL / path berkas."""
    if tok.startswith('`'):
        s = tok[1:-1].strip()
        if RE_URL.fullmatch(s):
            return s
        if ' ' in s or '\n' in s:
            return None
        if re.search(r'\.' + EKS + r'$', s, re.I) or (
                '/' in s and re.search(r'[A-Za-z]{2}', s) and not re.fullmatch(r'[\d./\s]+', s) and re.fullmatch(r'[\w./\\*{}\[\]-]+', s) and re.search(r'[\w]/[\w*{]|^/|/$', s)):
            return s
        return None
    return _url_bersih(tok)


def _tokens(c):
    out = []
    for m in RE_TOKEN.finditer(c):
        t = m.group(0)
        if not t.startswith('`'):
            t = _url_bersih(t)
        b = _butir(t)
        if b:
            out.append((m.start(), m.start() + len(t), b))
    return out


def proses_teks(t, notes):
    if not t or ('/' not in t and '`' not in t):
        return t
    simpan = []

    def tahan(m):
        simpan.append(m.group(0))
        return f'\x01{len(simpan) - 1}\x01'
    t = re.sub(r'\[[^\]]+\]\([^)\s]+\)', tahan, t)

    def tanda(items):
        notes.append(items)
        return f'{AWAL}{len(notes)}{AKHIR}'

    def kurung(m):
        lead, c = m.group(1), m.group(2)
        tk = _tokens(c)
        if not tk:
            return m.group(0)
        sisa = c
        for a, b, _ in sorted(tk, reverse=True):
            sisa = sisa[:a] + '\x02' + sisa[b:]
        if re.sub(r'\b(dan|serta|atau)\b|[,;\s.\x02]', '', sisa) == '':
            return tanda([x[2] for x in tk])
        bersih = re.sub(r'\s*[,;]?\s*(?:\b(?:dan|serta|atau)\s+)?\x02', '', sisa).strip(' ,;')
        bersih = re.sub(r'^\x02', '', bersih).strip(' ,;')
        return f'{lead}({bersih}){tanda([x[2] for x in tk])}'
    t = re.sub(r'(\s*)\(([^()]*)\)', kurung, t)

    def telanjang(m):
        tok = m.group(2)
        akhir = ''
        if not tok.startswith('`'):
            b = _url_bersih(tok)
            akhir = tok[len(b):]
            tok = b
        it = _butir(tok)
        if not it:
            return m.group(0)
        return tanda([it]) + akhir
    t = re.sub(rf'\s*[,;]\s*(?=(?:{KODE}|{URL})\))', '', t)   # "...; https://x)" -> "..." + catatan
    t = re.sub(rf'(\s*)({KODE}|{URL})', telanjang, t)
    # gabung penanda berdampingan (dipisah koma, titik koma, "dan")
    t = re.sub(AKHIR + r'(?:\s*[,;]\s*|\s+dan\s+|\s*)' + AWAL, ',', t)
    return re.sub(r'\x01(\d+)\x01', lambda m: simpan[int(m.group(1))], t)


def _walk(b, f, kolom_kecuali=None):
    k = b[0]
    if k in ('p', 'kutip', 'kalimat'):
        return (k, f(b[1]))
    if k == 'list':
        def it(x):
            return {**x, 'teks': f(x['teks']), 'sub': [it(s) for s in x['sub']]}
        return ('list', [it(x) for x in b[1]])
    if k == 'tabel':
        d = dict(b[1])
        skip = None
        if kolom_kecuali:
            for i, kp in enumerate(d['kepala']):
                if kp.strip().lower() == kolom_kecuali:
                    skip = i
        d['baris'] = [[c if i == skip else f(c) for i, c in enumerate(r)] for r in d['baris']]
        return ('tabel', d)
    if k == 'kartu':
        return ('kartu', [(v, f(l)) for v, l in b[1]])
    if k in ('temuan', 'keputusan', 'aksi'):
        return (k, [(j, [_walk(x, f) for x in bl]) for j, bl in b[1]])
    if k in ('metode', 'tentang'):
        return (k, [_walk(x, f) for x in b[1]])
    if k == 'paradoks':
        d = dict(b[1])
        d['meta'] = f(d['meta']) if d['meta'] else d['meta']
        d['blok'] = [_walk(x, f) for x in d['blok']]
        return ('paradoks', d)
    return b


def buang_singkatan(blok, nama):
    out = []
    for b in blok:
        if b[0] == 'singkatan':
            print(f'PERINGATAN {nama}: kotak "Singkatan dan istilah" tidak dicetak (dibuang dari keluaran)')
            continue
        if b[0] in ('temuan', 'keputusan', 'aksi'):
            b = (b[0], [(j, buang_singkatan(bl, nama)) for j, bl in b[1]])
        elif b[0] in ('metode', 'tentang'):
            b = (b[0], buang_singkatan(b[1], nama))
        elif b[0] == 'paradoks':
            d = dict(b[1])
            d['blok'] = buang_singkatan(d['blok'], nama)
            b = ('paradoks', d)
        out.append(b)
    return out


def proses(nama, blok):
    """-> blok baru; DAFTAR[nama] terisi."""
    blok = buang_singkatan(blok, nama)
    notes = []
    DAFTAR[nama] = notes
    if nama in KECUALI:
        return blok
    return [_walk(b, lambda t: proses_teks(t, notes), KECUALI_KOLOM.get(nama)) for b in blok]
