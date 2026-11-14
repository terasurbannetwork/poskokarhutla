"""Templat deck Situasi Banjir satu provinsi: sudah banjir, prakiraan N hari, dan Awas/Siaga di provinsi lain.

Meniru halaman banjir deck "Situasi Banjir dan Bencana Lain 091126" (pemilik 14 Nov 2026: "jadikan template ya,
khusus yang banjirnya aja"; "kalo ada yang awas dan siaga selain Aceh masukkan di slide lainnya").

    python situasi_banjir.py --prov Aceh [--hari 6] [--tanggal 2026-11-14] [--wa wa-13.txt wa-14.txt] [--keluar DIR]
    python situasi_banjir.py --uji

Halaman:
  1  Sudah banjir: peta kab/kota (belum surut, sudah surut) + tabel per kab/kota (kec., mulai, selesai, KK, mengungsi, kondisi).
  2  Prakiraan N hari: peta level tertinggi per kab/kota + tabel per kab/kota (kec. Awas, kec. Siaga, level per hari,
     puncak hujan tiga hari, kondisi kini) memuat juga kab/kota yang masih banjir.
  3  Provinsi lain: hanya dibuat bila ada kecamatan Siaga/Awas di luar provinsi pilihan; peta Indonesia + tabel per provinsi.
Masukan:
  - WA Koordalops ../harian/YYYY-MM/YYYY-MM-DD/wa-koordalops.txt (lewat jalur.py) (14 hari terakhir) + --wa, diurai wa_harian.koordalops. Kecamatan terdampak
    dari data/raw/dalops/banjir.json (logbook Pusdalops) bila ada.
  - Status banjir per kecamatan dihitung ulang N hari (paling banyak 6, batas hujan.json) dengan aturan scripts/banjir/status.py
    di atas data centurisk97.id/banjir/data. Empat hari pertama sama persis dengan status.json resmi (diperiksa saat jalan).
Templat: contoh/situasi-banjir/templat.pptx (kepala, logo BNPB dan KRIS, pita kaki dari deck 9 Nov).
"""
import argparse, copy, datetime as dt, glob, json, math, os, re, shutil, subprocess, sys, tempfile, urllib.request

from PIL import Image, ImageDraw, ImageFont
from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import MSO_ANCHOR, PP_ALIGN
from pptx.util import Emu, Inches, Pt

SINI = os.path.dirname(os.path.abspath(__file__))
AKAR = os.path.abspath(os.path.join(SINI, '..', '..', '..'))
TPL = os.path.join(SINI, 'contoh', 'situasi-banjir')
GEO = os.path.expanduser('~/.claude/skills/ppt-konsultan/bnpb/assets/proyek-bnpb/geo/kabupaten')
FONT = os.path.join(SINI, 'font')
SITUS = 'https://centurisk97.id/banjir/data/'
sys.path.insert(0, SINI); sys.path.insert(0, os.path.join(AKAR, 'scripts', 'banjir'))

NAVY, INK, ORANYE, ABU, GARIS = '051C2C', '1A1A1A', 'D9600B', '6B7280', 'D5DBE3'
PITA = 'DCEBF8'
# kondisi banjir: (isi pil, tegas)
KONDISI = {'Belum surut': ('F8DDE0', 'C8102E'), 'Sudah surut': ('DCEBF8', '1B5A93')}
# level status: (isi muda, tegas, teks)
LEVEL = {3: ('F8DDE0', '8F3F07', 'Awas'), 2: ('FBE7D6', 'E8894A', 'Siaga'), 1: ('FDF3E7', 'F3C9A0', 'Waspada')}
BULAN = 'Jan Feb Mar Apr Mei Jun Jul Agu Sep Okt Nov Des'.split()
BULAN_PANJANG = 'Januari Februari Maret April Mei Juni Juli Agustus September Oktober November Desember'.split()
HARI_SINGKAT = 'Sen Sel Rab Kam Jum Sab Min'.split()
NAMA_PROV = {}


def tgl(s, panjang=False):
    d = dt.date.fromisoformat(s[:10]); return f'{d.day} {(BULAN_PANJANG if panjang else BULAN)[d.month - 1]}'


def rb(n):
    return '–' if n is None else f'{n:,}'.replace(',', '.')


def kab_bersih(s):
    return re.sub(r'^(kab\.?|kabupaten)\s+', '', (s or '').strip(), flags=re.I)


# ---------------------------------------------------------------- data

def unduh(nama, ke):
    p = os.path.join(ke, nama)
    q = urllib.request.Request(SITUS + nama, headers={'User-Agent': 'Mozilla/5.0'})   # tanpa UA Python ditolak 403 Cloudflare
    with urllib.request.urlopen(q, timeout=60) as r, open(p, 'wb') as f:
        f.write(r.read())
    return p


def status_n_hari(n):
    """Jalankan status.py (aturan resmi) dengan HARI = n di atas data situs -> (status.json n hari, waktu dibuat)."""
    import status
    tmp = tempfile.mkdtemp(prefix='situasi-banjir-')
    for f in ('hujan.json', 'sungai.json', 'bahaya.json', 'hujan_ansambel.json', 'rob.json', 'status.json'):
        unduh(f, tmp)
    resmi = json.load(open(os.path.join(tmp, 'status.json')))
    os.rename(os.path.join(tmp, 'status.json'), os.path.join(tmp, 'status_resmi.json'))
    status.KELUAR, status.HARI = tmp, n
    status.main()
    st = json.load(open(os.path.join(tmp, 'status.json')))
    beda = [k for k, v in st['kec'].items() if k in resmi['kec'] and v['b'][:len(resmi['hari'])] != resmi['kec'][k]['b'][:n]]
    if st['hari'][:len(resmi['hari'])] == resmi['hari'][:n] and beda:
        sys.exit(f'status {n} hari tidak sama dengan status.json resmi di {len(beda)} kecamatan: {beda[:3]}')
    dibuat = json.load(open(os.path.join(tmp, 'meta.json')))['dibuat']
    shutil.rmtree(tmp, ignore_errors=True)
    return st, dibuat


def sudah_banjir(kode, tanggal, wa_tambahan=()):
    """Kab/kota provinsi `kode` yang dilaporkan banjir di WA Koordalops 14 hari terakhir -> (baris, tanggal laporan pertama, terakhir)."""
    import wa_harian
    from importlib import util
    s = util.spec_from_file_location('dalops_banjir', os.path.join(AKAR, 'scripts', 'data', 'dalops_banjir.py'))
    dl = util.module_from_spec(s); s.loader.exec_module(dl)
    awal = (dt.date.fromisoformat(tanggal) - dt.timedelta(days=14)).isoformat()
    berkas = {}
    import jalur
    for f in jalur.berkas_hari('harian', 'wa-koordalops.txt'):
        h = jalur.tanggal_dari(f)
        if awal <= h <= tanggal: berkas[h] = open(f, encoding='utf-8').read()
    for f in wa_tambahan:
        t = open(f, encoding='utf-8').read(); m = re.search(r's\.d\.?\s+(\d\d)/(\d\d)/(\d{4})', t)
        berkas[f'{m[3]}-{m[2]}-{m[1]}' if m else tanggal] = t
    J = {}
    for h in sorted(berkas):
        for x in wa_harian.koordalops(berkas[h], pagi=False, terima_kurang=True)['kejadian']:
            if x['prov'] != kode or not x['lokasi'] or (x['jenis'] != 'banjir' and 'banjir' not in (x.get('label') or '').lower()):
                continue
            kab = kab_bersih(x['lokasi']); t, a = x.get('teks', {}), x.get('angka', {})
            o = J.setdefault(kab, dict(kab=kab, pertama=h, akhir=h, kk=None, ungsi=None, kondisi='', surut_tgl=None))
            o['akhir'] = h; o['kondisi'] = t.get('kondisi') or o['kondisi']
            nk = _cari(o['kondisi'] + ' ' + (t.get('dampak') or ''), r'(\d+)\s*kec(?:amatan|\.)')
            if nk: o['kec_wa'] = nk
            kk = a.get('kk') or _cari(t.get('dampak'), r'([\d.,]+)\s*KK')
            if kk: o['kk'] = int(kk)
            u = a.get('mengungsi') or _cari(t.get('pengungsi'), r'([\d.,]+)\s*jiwa') or _cari(t.get('kondisi'), r'([\d.,]+)\s*jiwa\s*mengungsi')
            if u: o['ungsi'] = int(u)
            kn = o['kondisi'].lower()   # WA 14 Nov Pidie Jaya: "sebagian gampong sudah surut ... genangan kecil" = belum surut
            srt = dl.surut(o['kondisi']) and not re.search(r'mulai surut|berangsur|sebagian|genangan|belum surut', kn)
            o['surut_tgl'] = (o['surut_tgl'] or h) if srt else None
    # kecamatan dan tanggal mulai dari logbook Pusdalops (bila ada di mesin ini)
    lb = os.path.join(AKAR, 'data', 'raw', 'dalops', 'banjir.json')
    kej = json.load(open(lb))['kejadian'] if os.path.exists(lb) else []
    for o in J.values():
        batas = (dt.date.fromisoformat(awal) - dt.timedelta(days=30)).isoformat()   # kejadian yang lanjut dilaporkan WA sesudah logbook diam
        cocok = [e for e in kej if f'{kode}|{o["kab"]}' in e.get('kab_kode', []) and (e.get('mulai') or '') >= batas]
        kec = {k.strip() for e in cocok for k in e.get('kec') or []}
        o['kec'] = max(len(kec), o.get('kec_wa') or 0, *[e.get('n_kec') or 0 for e in cocok]) or None
        o['mulai'] = min([e['mulai'] for e in cocok if e.get('mulai')] + [o['pertama']])
        o['status'] = 'Sudah surut' if o['surut_tgl'] else 'Belum surut'
    baris = sorted(J.values(), key=lambda o: (o['status'] != 'Belum surut', -(o['kk'] or 0)))
    return baris, (min(berkas) if berkas else None), (max(berkas) if berkas else None)


def rapi(t):
    """Kondisi mutakhir WA apa adanya, hanya singkatan dan kapital tengah kalimat dirapikan."""
    t = re.sub(r'\byg\b', 'yang', re.sub(r'\s+', ' ', t or '').strip().rstrip('.'))
    t = re.sub(r'(?<=[a-z,] )(Kendaraan|Masyarakat|Desa|Personel)\b', lambda m: m[0].lower(), t)
    return (t[:1].upper() + t[1:] + '.') if t else '–'


def _cari(t, pola):
    m = re.search(pola, t or '', re.I)
    return int(m[1].replace('.', '').replace(',', '')) if m else None


def rekap_status(st):
    """Per kab/kota: kec Awas/Siaga (level tertinggi N hari), level kab per hari, puncak hujan tiga hari dan tanggalnya."""
    hari, kab = st['hari'], {}
    for k, v in st['kec'].items():
        pr, kb, _ = k.split('|'); b = v['b']
        o = kab.setdefault((pr, kb), dict(pr=pr, kab=kb, a=0, s=0, w=0, hari=[0] * len(hari), mm=0, tgl=None))
        m = max(b); o['a'] += m == 3; o['s'] += m == 2; o['w'] += m == 1
        o['hari'] = [max(x, y) for x, y in zip(o['hari'], b)]
        if m >= 2:
            i = max(range(len(b)), key=lambda d: (v['h3d'][d] if b[d] >= 2 else -1))
            if v['h3d'][i] > o['mm']: o['mm'], o['tgl'] = v['h3d'][i], hari[i]
    return kab


# ---------------------------------------------------------------- peta

def geo_kab(kode=None):
    out = {}
    for f in sorted(glob.glob(os.path.join(GEO, '*.json'))):
        kp = os.path.basename(f)[:2]
        if kode and kp != kode: continue
        for ft in json.load(open(f, encoding='utf-8'))['features']:
            out[f'{kp}|{ft["properties"]["kab"]}'] = ft['geometry']
    return out


def cincin(g):
    return [g['coordinates']] if g['type'] == 'Polygon' else g['coordinates']


def peta(png, w_in, h_in, warna, label=(), kode=None, kotak=None):
    """Peta kab/kota: warna {kunci: hex}; label [(kunci, teks, status_teks, isi, tegas, ikon)] di dua sisi; kotak (lon0, lon1, lat0, lat1)."""
    G = geo_kab(None)
    if kotak is None:
        xs = [c for k, g in G.items() if k[:2] == kode for q in cincin(g) for c in q[0]]
        kotak = (min(c[0] for c in xs), max(c[0] for c in xs), min(c[1] for c in xs), max(c[1] for c in xs))
    lon0, lon1, lat0, lat1 = kotak; SS, W = 2, int(w_in * 300); H = int(h_in * 300)
    W_, H_ = W * SS, H * SS
    # ruang label di kiri dan kanan bila ada label
    tepi = 0.30 if label else 0.03
    sx = (W_ * (1 - 2 * tepi)) / (lon1 - lon0); sy = H_ * 0.92 / (lat1 - lat0); s = min(sx, sy)
    cx, cy = (lon0 + lon1) / 2, (lat0 + lat1) / 2
    X = lambda o: W_ / 2 + (o - cx) * s; Y = lambda a: H_ / 2 - (a - cy) * s
    im = Image.new('RGB', (W_, H_), '#FFFFFF'); d = ImageDraw.Draw(im); pus = {}
    for k, g in G.items():
        utama = max((q[0] for q in cincin(g)), key=len)
        pus[k] = (sum(c[0] for c in utama) / len(utama), sum(c[1] for c in utama) / len(utama))
        luar = kode and k[:2] != kode
        for q in cincin(g):
            pts = [(X(c[0]), Y(c[1])) for c in q[0]]
            if len(pts) > 2:
                d.polygon(pts, fill=('#' + warna[k]) if k in warna else ('#F3F5F8' if luar else '#E1E6ED'), outline='#FFFFFF', width=SS)
    F = lambda n, b=True: ImageFont.truetype(os.path.join(FONT, 'Roboto-' + ('Bold' if b else 'Regular') + '.ttf'), n * SS)
    if label:
        fn, fs, ph, D = F(30), F(24, False), 52 * SS, 38 * SS
        A = [dict(k=k, n=n, st=t, isi=i, tg=c, ik=ik, ax=X(pus[k][0]), ay=Y(pus[k][1])) for k, n, t, i, c, ik in label if k in pus]
        A.sort(key=lambda a: a['ax']); h = (len(A) + 1) // 2; kiri, kanan = A[:h], A[h:]
        for grup, sisi in ((kiri, 'l'), (kanan, 'r')):
            grup.sort(key=lambda a: a['ay']); n = len(grup)
            for i, a in enumerate(grup):
                a['w'] = 8 * SS + D + 8 * SS + d.textlength(a['n'], font=fn) + 8 * SS + d.textlength(a['st'], font=fs) + 14 * SS
                y_ideal = min(max(a['ay'], ph), H_ - ph)
                a['y'] = y_ideal if n == 1 else ph + i * (H_ - 2 * ph) / (n - 1) * 0.5 + y_ideal * 0.5
                a['x0'] = 6 * SS if sisi == 'l' else W_ - 6 * SS - a['w']; a['x1'] = a['x0'] + a['w']
            for i in range(1, n):   # tanpa tumpuk
                grup[i]['y'] = max(grup[i]['y'], grup[i - 1]['y'] + ph + 8 * SS)
            lebih = grup[-1]['y'] + ph / 2 - H_ if grup else 0
            if lebih > 0:
                for a in grup: a['y'] -= lebih
        for a in A:
            ujung = a['x1'] if a in kiri else a['x0']
            d.line([(ujung, a['y']), (a['ax'], a['ay'])], fill='#' + NAVY, width=2 * SS)
            d.ellipse([a['ax'] - 6 * SS, a['ay'] - 6 * SS, a['ax'] + 6 * SS, a['ay'] + 6 * SS], fill='#FFFFFF', outline='#' + NAVY, width=2 * SS)
        for a in A:
            y0 = a['y'] - ph / 2
            d.rounded_rectangle([a['x0'], y0, a['x1'], y0 + ph], radius=ph / 2, fill='#' + a['isi'], outline='#' + a['tg'], width=SS)
            c0 = a['x0'] + 8 * SS; d.ellipse([c0, a['y'] - D / 2, c0 + D, a['y'] + D / 2], fill='#' + a['tg'])
            g_ = Image.open(os.path.join(TPL, a['ik'])).convert('RGBA').resize((int(D * .62), int(D * .62)), Image.LANCZOS)
            im.paste(g_, (int(c0 + D * .19), int(a['y'] - D * .31)), g_)
            tx = c0 + D + 8 * SS; d.text((tx, a['y']), a['n'], font=fn, fill='#' + NAVY, anchor='lm')
            d.text((tx + d.textlength(a['n'], font=fn) + 8 * SS, a['y'] + SS), a['st'], font=fs, fill='#' + a['tg'], anchor='lm')
    # skala 100 km dan arah utara
    px = 100 / 111.32 * s; x0, y0 = 30 * SS, H_ - 26 * SS
    d.line([(x0, y0), (x0 + px, y0)], fill='#' + NAVY, width=3 * SS)
    d.text((x0 + px / 2, y0 - 16 * SS), '100 km', font=F(20, False), fill='#' + NAVY, anchor='mm')
    d.polygon([(x0 + 6 * SS, y0 - 70 * SS), (x0, y0 - 46 * SS), (x0 + 12 * SS, y0 - 46 * SS)], fill='#' + NAVY)
    d.text((x0 + 6 * SS, y0 - 36 * SS), 'U', font=F(20), fill='#' + NAVY, anchor='mm')
    im.resize((W, H), Image.LANCZOS).save(png, optimize=True)


# ---------------------------------------------------------------- pptx

def warna(h): return RGBColor.from_string(h)


def kotak(sl, x, y, w, h, isi, bentuk=MSO_SHAPE.RECTANGLE, adj=None):
    s = sl.shapes.add_shape(bentuk, Inches(x), Inches(y), Inches(w), Inches(h))
    s.fill.solid(); s.fill.fore_color.rgb = warna(isi); s.line.fill.background(); s.shadow.inherit = False
    if adj is not None: s.adjustments[0] = adj
    return s


def tx(sl, x, y, w, h, runs, sz=9.19, b=False, c=INK, al='l', an='m', wrap=False):
    """runs: teks, atau [(teks, warna, tebal)]."""
    t = sl.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h)); f = t.text_frame
    f.margin_left = f.margin_right = f.margin_top = f.margin_bottom = 0; f.word_wrap = wrap
    f.vertical_anchor = {'t': MSO_ANCHOR.TOP, 'm': MSO_ANCHOR.MIDDLE, 'b': MSO_ANCHOR.BOTTOM}[an]
    p = f.paragraphs[0]; p.alignment = {'l': PP_ALIGN.LEFT, 'c': PP_ALIGN.CENTER, 'r': PP_ALIGN.RIGHT, 'j': PP_ALIGN.JUSTIFY}[al]
    for teks, cc, bb in ([(runs, c, b)] if isinstance(runs, str) else runs):
        r = p.add_run(); r.text = teks; r.font.size = Pt(sz); r.font.bold = bb; r.font.name = 'Roboto'; r.font.color.rgb = warna(cc)
    return t


def judul(sl, bagian):
    """bagian: [teks, angka, teks, ...]; angka diwarnai oranye seperti deck 9 Nov."""
    for sh in sl.shapes:
        if sh.name == 'TextBox 1':
            p = sh.text_frame.paragraphs[0]; contoh = p.runs[0]._r
            for r in list(p.runs): p._p.remove(r._r)
            for i, t in enumerate(bagian):
                r = copy.deepcopy(contoh); p._p.append(r); run = p.runs[-1]; run.text = t
                run.font.color.rgb = warna(ORANYE if i % 2 else INK)
            return


def sumber(sl, teks):
    for sh in sl.shapes:
        if sh.has_text_frame and sh.text_frame.text.startswith('Sumber:'):
            sh.text_frame.paragraphs[0].runs[1].text = teks; return


def nav(sl, judul_bagian, aktif, no):
    """Penanda bagian di pita atas: tulis ulang kotak nomor, buang sisanya, geser garis aktif."""
    kotak_nav = sorted([sh for sh in sl.shapes if sh.has_text_frame and re.match(r'^\d\d  ', sh.text_frame.text)], key=lambda s: s.left)
    garis = [sh for sh in sl.shapes if sh.name == 'Rectangle 11']   # garis bawah bagian aktif di templat
    lebar = Inches(12.13) / len(judul_bagian)   # dibagi rata ujung ke ujung (pemilik 14 Nov: bukan rata kiri)
    for i, sh in enumerate(kotak_nav):
        if i >= len(judul_bagian):
            sh._element.getparent().remove(sh._element); continue
        sh.left, sh.width = int(Inches(.6) + i * lebar), int(lebar)
        r = sh.text_frame.paragraphs[0].runs
        r[0].text = f'{i + 1:02d}  '; r[1].text = judul_bagian[i]
        for x in r:
            x.font.color.rgb = warna(ORANYE if (i == aktif and x is r[0]) else NAVY if i == aktif else ABU)
            x.font.bold = i == aktif or x is r[0]
        if i == aktif and garis:
            garis[0].left = sh.left + Inches(0.08); garis[0].width = sh.width - Inches(0.16)
    for sh in sl.shapes:
        if sh.has_text_frame and sh.text_frame.text.strip().isdigit() and sh.top > Inches(7):
            sh.text_frame.paragraphs[0].runs[0].text = str(no)


def tabel(sl, x, y, w, kol, baris, rh, y_maks):
    """kol [(judul, bobot, rata)]; baris: list sel | {'pita': teks, 'sel': [...]} | {'total': True, 'sel': [...]};
    sel = teks | ('teks', warna, tebal) | {'pil': teks, 'isi', 'tegas'} | {'kotak': teks, 'isi', 'tegas'}. -> y akhir."""
    tb = sum(k[1] for k in kol); L = [w * k[1] / tb for k in kol]; hk = .32 if any(len(k[0]) > 10 for k in kol) else .23
    rh = min(rh, (y_maks - y - hk) / sum(.65 if isinstance(b, dict) and 'pita' in b else 1 for b in baris))   # rh = batas atas tinggi baris
    kotak(sl, x, y, w, hk, NAVY, MSO_SHAPE.ROUNDED_RECTANGLE, .18)
    cx = x
    for k, lw in zip(kol, L):
        tx(sl, cx + .03, y, lw - .06, hk, k[0].upper() if len(k[0]) < 40 else k[0], sz=7.5, b=True, c='FFFFFF', al='c')
        cx += lw
    yy = y + hk
    for b in baris:
        pita, tot = isinstance(b, dict) and 'pita' in b, isinstance(b, dict) and b.get('total')
        sel = b.get('sel', []) if isinstance(b, dict) else b
        h = rh * (.65 if pita else 1)
        if yy + h > y_maks + 1e-6: raise ValueError(f'tabel tidak muat: {len(baris)} baris, tinggi baris {rh:.2f}')
        if pita: kotak(sl, x, yy, w, h, PITA); tx(sl, x + .1, yy, w * .6, h, b['pita'], sz=9.19, b=True)
        if tot: kotak(sl, x, yy, w, h, NAVY, MSO_SHAPE.ROUNDED_RECTANGLE, .14)
        cx = x
        for i, (k, lw) in enumerate(zip(kol, L)):
            v = sel[i] if i < len(sel) else None
            if isinstance(v, dict) and 'pil' in v:
                pw = min(lw - .08, .14 + len(v['pil']) * .065)
                kotak(sl, cx + (lw - pw) / 2, yy + h * .18, pw, h * .64, v['isi'], MSO_SHAPE.ROUNDED_RECTANGLE, .5)
                tx(sl, cx, yy, lw, h, v['pil'], sz=7.5, b=True, c=v['tegas'], al='c')
            elif isinstance(v, dict) and 'kotak' in v:
                kw = min(lw - .04, .26)
                kotak(sl, cx + (lw - kw) / 2, yy + h * .16, kw, h * .68, v['isi'], MSO_SHAPE.ROUNDED_RECTANGLE, .2)
                tx(sl, cx, yy, lw, h, v['kotak'], sz=7.5, b=True, c=v['tegas'], al='c')
            elif v not in ('', None):
                t_, c_, b_ = v if isinstance(v, tuple) else (v, 'FFFFFF' if tot else INK, tot or (i == 0 and not pita))
                bk = len(k) > 4 and k[4] == 'bungkus'
                kiri = k[2] in 'lj'
                tx(sl, cx + (.1 if kiri else .02), yy, lw - (.16 if kiri else .04), h, t_, sz=k[3] if len(k) > 3 else 9.19, b=b_, c=c_, al=k[2], wrap=bk)
            cx += lw
        yy += h
        if not pita and not tot: kotak(sl, x, yy - .004, w, .007, GARIS)
    return yy


def kartu(sl, x, y, w, angka, ket, isi, tegas, ikon):
    kotak(sl, x, y, w, .42, isi, MSO_SHAPE.ROUNDED_RECTANGLE, .13)
    kotak(sl, x + .07, y + .085, .25, .25, tegas, MSO_SHAPE.OVAL)
    sl.shapes.add_picture(os.path.join(TPL, ikon), Inches(x + .115), Inches(y + .13), Inches(.16), Inches(.16))
    tx(sl, x + .39, y + .04, w - .45, .19, angka, sz=12, b=True, c=NAVY)
    tx(sl, x + .39, y + .24, w - .45, .14, ket, sz=7)


def keterangan(sl, x, y, w, h, nama, teks, isi, tegas, ikon):
    kotak(sl, x, y, w, h, isi, MSO_SHAPE.ROUNDED_RECTANGLE, .08)
    kotak(sl, x + .08, y + .08, .22, .22, tegas, MSO_SHAPE.OVAL)
    sl.shapes.add_picture(os.path.join(TPL, ikon), Inches(x + .115), Inches(y + .115), Inches(.15), Inches(.15))
    tx(sl, x + .36, y + .08, w - .45, .22, nama, sz=9.19, b=True, c=NAVY)
    tx(sl, x + .1, y + .34, w - .2, h - .4, teks, sz=7.5, al='j', an='t', wrap=True)


def ramping(src, dst):
    """Templat dari deck 9 Nov: satu slide, hanya kepala (judul, nav, logo, garis) dan pita kaki."""
    P = Presentation(src)
    for sid in list(P.slides._sldIdLst)[1:]:
        P.part.drop_rel(sid.rId); P.slides._sldIdLst.remove(sid)
    sl = P.slides[0]
    for sh in list(sl.shapes):
        if sh.top is not None and Inches(1.36) <= sh.top < Inches(7.0):
            sh._element.getparent().remove(sh._element)
    P.save(dst)


def gandakan(P, n):
    """Tambah slide sampai n, tiap slide salinan slide 1 templat (bentuk dan gambar logo ikut)."""
    asal = P.slides[0]
    while len(P.slides) < n:
        sl = P.slides.add_slide(asal.slide_layout)
        for sh in list(sl.placeholders): sh._element.getparent().remove(sh._element)
        for sh in asal.shapes:
            el = copy.deepcopy(sh._element); sl.shapes._spTree.append(el)
            for blip in el.iter('{http://schemas.openxmlformats.org/drawingml/2006/main}blip'):
                rid = blip.get('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}embed')
                if rid:
                    part = asal.part.related_part(rid)
                    blip.set('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}embed', sl.part.relate_to(part, asal.part.rels[rid].reltype))
    return list(P.slides)


# ---------------------------------------------------------------- deck

def bangun(prov, n_hari, tanggal, keluar, wa=()):
    import wa_harian
    from wilayah import PROVINSI
    kode = {v.lower(): k for k, v in PROVINSI.items()}.get(prov.lower()) or sys.exit(f'provinsi tidak dikenal: {prov}')
    prov = PROVINSI[kode]
    st, dibuat = status_n_hari(n_hari)
    hari = st['hari']
    if hari[0] != tanggal: print(f'PERINGATAN: data hujan situs mulai {hari[0]}, bukan {tanggal}', file=sys.stderr)
    rk = rekap_status(st)
    lap, wa0, wa1 = sudah_banjir(kode, tanggal, wa)
    if wa1 and wa1 < tanggal:
        print(f'PERINGATAN: WA Koordalops terakhir {wa1}; aturan_slide.py menuntut sampai {tanggal}. Tambahkan --wa <berkas WA terbaru>.', file=sys.stderr)
    jam = dibuat[11:16].replace(':', '.')
    rentang = f'{dt.date.fromisoformat(hari[0]).day}-{tgl(hari[-1])}'
    gis = f'Prakiraan hujan ECMWF IFS, debit sungai GloFAS, bahaya InaRISK BNPB, {tgl(dibuat)} {dibuat[:4]} {jam} WIB'
    lain = {k: v for k, v in rk.items() if k[0] != kode and (v['a'] or v['s'])}
    n_sl = 3 if lain else 2
    bagian = ['Sudah banjir', f'Prakiraan {n_hari} hari'] + (['Provinsi lain'] if lain else [])

    os.makedirs(keluar, exist_ok=True)
    tpl = os.path.join(TPL, 'templat.pptx')
    P = Presentation(tpl); S = gandakan(P, n_sl); kerja = tempfile.mkdtemp(prefix='situasi-banjir-png-')

    # ---- 1. sudah banjir
    sl = S[0]; nav(sl, bagian, 0, 1)
    belum = [o for o in lap if o['status'] == 'Belum surut']
    n_kec = sum(o['kec'] or 0 for o in lap); n_kk = sum(o['kk'] or 0 for o in lap)
    if lap:
        mulai = min(o['mulai'] for o in lap)
        judul(sl, ['Terdapat', f' {len(lap)}', f' kab/kota di {prov} terdampak banjir (', f'{n_kec}', ' kecamatan, ', rb(n_kk),
                   f' KK) pada periode {tgl(mulai, True)} s.d. {tgl(wa1, True)} {wa1[:4]}'])
    else:
        judul(sl, ['Tidak ada kab/kota di ', prov, f' yang dilaporkan banjir pada {tgl(wa0 or tanggal, True)} s.d. {tgl(wa1 or tanggal, True)} 2026'])
    wr = {f'{kode}|{o["kab"]}': KONDISI[o['status']][1] for o in lap}
    lb = [(f'{kode}|{o["kab"]}', o['kab'], o['status'], *KONDISI[o['status']], 'banjir-putih.png' if o['status'] == 'Belum surut' else 'cek-putih.png') for o in lap]
    png = os.path.join(kerja, 'p1.png'); peta(png, 5.8, 4.7, wr, lb, kode)
    sl.shapes.add_picture(png, Inches(.6), Inches(1.42), Inches(5.8), Inches(4.7))
    kartu(sl, .6, 6.2, 2.86, str(len(belum)), 'Belum surut', *KONDISI['Belum surut'], 'banjir-putih.png')
    kartu(sl, 3.53, 6.2, 2.86, str(len(lap) - len(belum)), 'Sudah surut', *KONDISI['Sudah surut'], 'cek-putih.png')
    kol = [('Kab/Kota', 2.0, 'l'), ('Kec.', .5, 'c'), ('Mulai', .65, 'c'), ('Selesai', .75, 'c'), ('KK terdampak', 1.1, 'c'), ('Mengungsi', .95, 'c'), ('Kondisi', 1.4, 'c')]
    br = [{'pita': prov}] + [[o['kab'], rb(o['kec']), tgl(o['mulai']), tgl(o['surut_tgl']) if o['surut_tgl'] else '–', rb(o['kk']), rb(o['ungsi']),
                              {'pil': o['status'], 'isi': KONDISI[o['status']][0], 'tegas': KONDISI[o['status']][1]}] for o in lap]
    br.append({'total': True, 'sel': [f'Total {len(lap)} kab/kota', rb(n_kec), '', '', rb(n_kk), rb(sum(o['ungsi'] or 0 for o in lap) or None), '']})
    yb = tabel(sl, 6.55, 1.4, 6.19, kol, br, min(.33, (6.95 - 1.63) / max(len(br), 1)), 6.95)
    if belum and 6.95 - yb > .8:   # sisa ruang: kondisi mutakhir kab/kota yang belum surut, kata-kata laporan Koordalops
        kol2 = [('Kab/Kota', 1.45, 'l'), ('Laporan', .62, 'c'), ('Kondisi mutakhir', 4.12, 'j', 8.5, 'bungkus')]
        tabel(sl, 6.55, yb + .14, 6.19, kol2, [[o['kab'], tgl(o['akhir']), (rapi(o['kondisi']), INK, False)] for o in belum], .62, 6.95)
    sumber(sl, f'Laporan Dit. Koordalops BNPB, {tgl(wa0 or tanggal)} s.d. {tgl(wa1 or tanggal)} {(wa1 or tanggal)[:4]}; Logbook Pusdalops BNPB')

    # ---- 2. prakiraan N hari, provinsi pilihan
    sl = S[1]; nav(sl, bagian, 1, 2)
    kini = {o['kab']: o['status'] for o in lap}
    kab = sorted([v for k, v in rk.items() if k[0] == kode and (v['a'] or v['s'] or v['kab'] in kini)],
                 key=lambda v: (-v['a'], -v['s'], -v['mm'], v['kab']))
    a, s_ = sum(v['a'] for v in kab), sum(v['s'] for v in kab); nk = sum(1 for v in kab if v['a'] or v['s'])
    w_ = sum(v['w'] for k, v in rk.items() if k[0] == kode)
    # potongan genap = teks, ganjil = angka oranye; '' menjaga urutannya
    awal = (['Terdapat', f' {a}', ' kecamatan berstatus Awas,', f' {s_}', ' Siaga', ''] if a else ['Terdapat', f' {s_}', ' kecamatan berstatus Siaga', ''])
    judul(sl, awal + [' di', f' {nk}', f' kab/kota {prov} dan', f' {w_}', f' Waspada pada {n_hari} hari ke depan (', rentang, ')'])
    wr = {f'{kode}|{v["kab"]}': LEVEL[max(v['hari'])][1] for k, v in rk.items() if k[0] == kode and max(v['hari']) >= 1}
    lb = [(f'{kode}|{v["kab"]}', v['kab'], LEVEL[3 if v['a'] else 2][2], LEVEL[3 if v['a'] else 2][0], LEVEL[3 if v['a'] else 2][1],
           'awas-putih.png' if v['a'] else 'banjir-putih.png') for v in kab if v['a'] or v['s']]
    png = os.path.join(kerja, 'p2.png'); peta(png, 5.8, 3.82, wr, lb, kode)
    sl.shapes.add_picture(png, Inches(.6), Inches(1.42), Inches(5.8), Inches(3.82))
    lw3 = (5.8 - 2 * .07) / 3; xs = [.6 + i * (lw3 + .07) for i in range(3)]
    for x_, n_, nm, lv, ik, df in ((xs[0], a, 'Awas', 3, 'awas-putih.png', 'Hujan tiga hari 120 mm atau lebih di wilayah bahaya tinggi, atau debit sungai setara banjir 20 tahunan.'),
                                    (xs[1], s_, 'Siaga', 2, 'banjir-putih.png', 'Hujan tiga hari 80 mm atau lebih, hujan 30 mm per jam, atau peluang hujan lebat 50% di wilayah bahaya sedang ke atas, atau debit sungai setara banjir 5 tahunan.'),
                                    (xs[2], w_, 'Waspada', 1, 'hujan-putih.png', 'Hujan tiga hari 40 mm atau lebih, hujan 20 mm per jam, atau debit sungai setara banjir 2 tahunan.')):
        tegas = 'C98A4B' if lv == 1 else LEVEL[lv][1]
        kartu(sl, x_, 5.36, lw3, rb(n_), 'Kecamatan ' + nm, LEVEL[lv][0], tegas, ik)
        keterangan(sl, x_, 5.86, lw3, 1.09, nm, df, LEVEL[lv][0], tegas, ik)
    hk = [f'{HARI_SINGKAT[dt.date.fromisoformat(h).weekday()]} {dt.date.fromisoformat(h).day}' for h in hari]
    kol = [('Kab/Kota', 1.65, 'l'), ('Kec. Awas', .52, 'c'), ('Kec. Siaga', .52, 'c')] + [(h, .4, 'c') for h in hk] + [('Hujan 3 hari, mm', .7, 'c'), ('Tgl. puncak', .62, 'c'), ('Kini', .86, 'c')]

    def sel_hari(lv):
        return {'kotak': LEVEL[lv][2][0], 'isi': LEVEL[lv][0] if lv < 2 else LEVEL[lv][1], 'tegas': 'FFFFFF' if lv >= 2 else '9A5B1E'} if lv else '–'
    br = [[v['kab'], rb(v['a'] or None), rb(v['s'] or None)] + [sel_hari(x) for x in v['hari']] +
          [str(round(v['mm'])) if v['tgl'] else '–', tgl(v['tgl']) if v['tgl'] else '–',
           {'pil': kini[v['kab']], 'isi': KONDISI[kini[v['kab']]][0], 'tegas': KONDISI[kini[v['kab']]][1]} if v['kab'] in kini else '–'] for v in kab]
    br.append({'total': True, 'sel': [f'Jumlah {len(kab)} kab/kota', rb(a), rb(s_)] + [''] * (len(hari) + 3)})
    tabel(sl, 6.55, 1.4, 6.19, kol, br, .44, 6.95)
    sumber(sl, gis)

    # ---- 3. provinsi lain
    if lain:
        sl = S[2]; nav(sl, bagian, 2, 3)
        pv = {}
        for (pr, kb), v in lain.items():
            o = pv.setdefault(pr, dict(pr=pr, a=0, s=0, kab=[], mm=0, tgl=None, hari=[0] * len(hari)))
            o['a'] += v['a']; o['s'] += v['s']; o['kab'].append(v); o['hari'] = [max(x, y) for x, y in zip(o['hari'], v['hari'])]
            if v['mm'] > o['mm']: o['mm'], o['tgl'], o['kab_mm'] = v['mm'], v['tgl'], v['kab']
        pv = sorted(pv.values(), key=lambda o: (-o['a'], -o['s']))
        A, S2 = sum(o['a'] for o in pv), sum(o['s'] for o in pv)
        judul(sl, ['Di luar ' + prov + ', terdapat', f' {A}', ' kecamatan berstatus Awas,', f' {S2}', ' Siaga di', f' {len(pv)}',
                   f' provinsi pada periode {n_hari} hari ke depan (', rentang, ')'])
        wr = {f'{k[0]}|{k[1]}': LEVEL[3 if v['a'] else 2][1] for k, v in lain.items()}
        wr.update({f'{kode}|{v["kab"]}': 'B8C2CF' for v in kab})
        png = os.path.join(kerja, 'p3.png'); peta(png, 5.8, 3.5, wr, (), None, kotak=(95.0, 141.0, -11.0, 6.0))
        sl.shapes.add_picture(png, Inches(.6), Inches(1.42), Inches(5.8), Inches(3.5))
        kartu(sl, .6, 5.0, 2.86, str(A), 'Kecamatan Awas', LEVEL[3][0], LEVEL[3][1], 'awas-putih.png')
        kartu(sl, 3.53, 5.0, 2.86, str(S2), 'Kecamatan Siaga', LEVEL[2][0], LEVEL[2][1], 'banjir-putih.png')
        # kab/kota Awas di luar provinsi pilihan dirinci, karena paling mendesak
        aw = sorted([v for v in lain.values() if v['a']], key=lambda v: (-v['a'], -v['mm']))
        if aw:   # kab/kota Awas dirinci di tabel sendiri
            kolA = [('Kab/Kota Awas', 1.5, 'l'), ('Provinsi', 1.35, 'l'), ('Kec. Awas', .7, 'c'), ('Kec. Siaga', .7, 'c'), ('Hujan 3 hari, mm', .85, 'c'), ('Tgl. puncak', .75, 'c')]
            tabel(sl, .6, 5.55, 5.8, kolA, [[v['kab'], (PROVINSI[v['pr']], INK, False), rb(v['a']), rb(v['s'] or None), str(round(v['mm'])), tgl(v['tgl'])] for v in aw[:5]], .3, 6.95)
        kol = [('Provinsi', 1.7, 'l'), ('Kab/Kota', .44, 'c'), ('Kec. Awas', .5, 'c'), ('Kec. Siaga', .5, 'c')] + [(h, .37, 'c') for h in hk] + [('Hujan tertinggi', 1.6, 'l', 8.5), ('mm', .42, 'c')]
        br = [[PROVINSI[o['pr']], str(len(o['kab'])), rb(o['a'] or None), rb(o['s'] or None)] + [sel_hari(x) for x in o['hari']] +
              ([(o['kab_mm'], INK, False), str(round(o['mm']))] if o['tgl'] else ['–', '–']) for o in pv]
        br.append({'total': True, 'sel': [f'Jumlah {len(pv)} provinsi', str(sum(len(o['kab']) for o in pv)), rb(A), rb(S2)] + [''] * (len(hari) + 2)})
        tabel(sl, 6.55, 1.4, 6.19, kol, br, min(.33, (6.95 - 1.63) / max(len(br), 1)), 6.95)
        sumber(sl, gis)

    d = dt.date.fromisoformat(tanggal); nama = f'Situasi Banjir {prov} {d:%d%m%y}'
    out = os.path.join(keluar, nama + '.pptx'); P.save(out)
    shutil.rmtree(kerja, ignore_errors=True)
    from pdf import ke_pdf
    pdf = ke_pdf(out)
    print(json.dumps(dict(pptx=out, pdf=pdf, hari=hari, sudah_banjir=len(lap), belum_surut=len(belum), wa=[wa0, wa1],
                          kec_awas=a, kec_siaga=s_, provinsi_lain=len(lain) and len({k[0] for k in lain})), ensure_ascii=False))
    return out


def uji():
    assert kab_bersih('Kab. Pidie Jaya') == 'Pidie Jaya' and kab_bersih('Kota Subulussalam') == 'Kota Subulussalam'
    assert rb(10089) == '10.089' and rb(None) == '–' and tgl('2026-11-09') == '9 Nov' and tgl('2026-10-24', True) == '24 Oktober'
    st = {'hari': ['2026-11-14', '2026-11-15'], 'kec': {
        '11|Pidie Jaya|A': {'b': [2, 3], 'h3d': [90, 130]}, '11|Pidie Jaya|B': {'b': [1, 2], 'h3d': [50, 85]},
        '11|Bireuen|C': {'b': [1, 1], 'h3d': [45, 60]}}}
    r = rekap_status(st)
    assert r[('11', 'Pidie Jaya')]['a'] == 1 and r[('11', 'Pidie Jaya')]['s'] == 1 and r[('11', 'Pidie Jaya')]['hari'] == [2, 3]
    assert r[('11', 'Pidie Jaya')]['mm'] == 130 and r[('11', 'Pidie Jaya')]['tgl'] == '2026-11-15' and r[('11', 'Bireuen')]['tgl'] is None
    print('uji situasi_banjir: lolos')


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--prov', default='Aceh'); ap.add_argument('--hari', type=int, default=6)
    ap.add_argument('--tanggal', default=dt.date.today().isoformat()); ap.add_argument('--wa', nargs='*', default=[])
    ap.add_argument('--keluar'); ap.add_argument('--uji', action='store_true'); ap.add_argument('--ramping', nargs=2, metavar=('ASAL', 'TUJUAN'))
    a = ap.parse_args()
    if a.uji: uji()
    elif a.ramping: ramping(*a.ramping)
    else:
        if not 1 <= a.hari <= 6: sys.exit('--hari 1 sampai 6 (hujan.json memuat 6 hari ke depan)')
        bangun(a.prov, a.hari, a.tanggal, a.keluar or os.path.join(SINI, '..', 'paparan', f"situasi-banjir-{a.prov.lower().replace(' ', '-')}-{a.tanggal}"), a.wa)
