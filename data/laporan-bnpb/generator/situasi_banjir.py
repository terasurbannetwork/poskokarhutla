"""Templat deck Situasi Banjir satu provinsi: sudah banjir, prakiraan N hari, dan Awas/Siaga di provinsi lain.

Meniru halaman banjir deck "Situasi Banjir dan Bencana Lain 091126" (pemilik 14 Nov 2026: "jadikan template ya,
khusus yang banjirnya aja"; "kalo ada yang awas dan siaga selain Aceh masukkan di slide lainnya").

    python situasi_banjir.py --prov Aceh [--hari 6] [--tanggal 2026-11-14] [--wa wa-13.txt wa-14.txt] [--keluar DIR]
    python situasi_banjir.py --uji

Halaman:
  1  Sudah banjir: peta kab/kota (belum surut, sudah surut) + tabel per kab/kota (kec., mulai, selesai, KK, mengungsi, kondisi).
  2  Prakiraan N hari: peta level tertinggi per kab/kota + tabel per kab/kota (kec. Awas, kec. Siaga, level per hari,
     puncak hujan tiga hari, kondisi kini) memuat juga kab/kota yang masih banjir.
  3  Provinsi lain: hanya dengan --provinsi-lain (pemilik 15 Nov 2026: "yang ini gausah ada") dan bila ada Siaga/Awas di luar provinsi pilihan.
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
    # WA menulis "Lima puluh Kota"; tanpa huruf kapital baku jadi dua baris dengan "Lima Puluh Kota" (22 Nov 2026)
    s = re.sub(r'\s+', ' ', re.sub(r'^(kab\.?|kabupaten)\s+', '', (s or '').strip(), flags=re.I))
    s = re.sub(r'^limapuluh\b', 'Lima Puluh', s, flags=re.I)   # WA 23 Nov 2026 menulis "Limapuluh Kota"
    return ' '.join(w if w.isupper() else w[:1].upper() + w[1:] for w in s.split(' '))


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
    dibuat = json.load(open(unduh('meta.json', tmp)))['dibuat']   # jam data situs, bukan jam hitung ulang ini
    shutil.rmtree(tmp, ignore_errors=True)
    return st, dibuat


def sudah_banjir(kode, tanggal, wa_tambahan=(), awal=None):
    """Kab/kota provinsi `kode` yang dilaporkan banjir di WA Koordalops 14 hari terakhir -> (baris, tanggal laporan pertama, terakhir).
    kode None = semua provinsi (baris membawa 'prov'); awal = tanggal berkas WA paling awal (bawaan 14 hari sebelum `tanggal`, banjir_sepekan.py)."""
    import wa_harian
    from importlib import util
    s = util.spec_from_file_location('dalops_banjir', os.path.join(AKAR, 'scripts', 'data', 'dalops_banjir.py'))
    dl = util.module_from_spec(s); s.loader.exec_module(dl)
    awal = awal or (dt.date.fromisoformat(tanggal) - dt.timedelta(days=14)).isoformat()
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
            if (kode and x['prov'] != kode) or not x['lokasi'] or (x['jenis'] != 'banjir' and 'banjir' not in (x.get('label') or '').lower()):
                continue
            kab = kab_bersih(x['lokasi']); t, a = x.get('teks', {}), x.get('angka', {})
            o = J.setdefault((x['prov'], kab), dict(prov=x['prov'], kab=kab, pertama=h, akhir=h, kk=None, ungsi=None, kondisi='', surut_tgl=None))
            o['akhir'] = h; o['kondisi'] = t.get('kondisi') or o['kondisi']
            o['butir'] = butir_wa(berkas[h], kab) or o.get('butir') or {}
            jw = _cari(t.get('dampak') or o['butir'].get('Dampak'), r'KK\s*/\s*([\d.,]+)\s*jiwa')   # "x KK / y jiwa", bukan "1 jiwa hilang"
            if jw: o['jiwa'] = jw
            ug = _cari(o['butir'].get('Pengungsi'), r'([\d.,]+)\s*jiwa')
            hl = _cari(o['butir'].get('Dampak'), r'(\d+)(?:\s*\(\w+\))?\s*jiwa\s*hilang')
            md = _cari(o['butir'].get('Dampak'), r'(\d+)(?:\s*\(\w+\))?\s*jiwa\s*meninggal')
            if hl is not None: o['hilang'] = hl
            if md is not None: o['meninggal'] = md
            nk = _cari(o['kondisi'] + ' ' + (t.get('dampak') or ''), r'(\d+)\s*kec(?:amatan|\.)')
            if nk: o['kec_wa'] = nk
            kk = a.get('kk') or _cari(t.get('dampak'), r'([\d.,]+)\s*KK')
            if kk: o['kk'] = int(kk)
            u = a.get('mengungsi') or _cari(t.get('pengungsi'), r'([\d.,]+)\s*jiwa') or _cari(t.get('kondisi'), r'([\d.,]+)\s*jiwa\s*mengungsi')
            if re.search(r'^\s*nihil', o['butir'].get('Pengungsi') or '', re.I): o['ungsi'] = 0   # "Pengungsi: Nihil" menimpa angka lama
            elif u: o['ungsi'] = int(u)
            elif ug: o['ungsi'] = ug
            o.setdefault('seri', {})[h] = (o['kk'], o['ungsi'])
            kn = o['kondisi'].lower()   # WA 14 Nov Pidie Jaya: "sebagian gampong sudah surut ... genangan kecil" = belum surut
            srt = dl.surut(o['kondisi']) and not re.search(r'mulai surut|berangsur|sebagian|genangan|belum surut', kn)
            o['surut_tgl'] = (o['surut_tgl'] or h) if srt else None
    # kecamatan dan tanggal mulai dari logbook Pusdalops (bila ada di mesin ini)
    lb = os.path.join(AKAR, 'data', 'raw', 'dalops', 'banjir.json')
    kej = json.load(open(lb))['kejadian'] if os.path.exists(lb) else []
    for o in J.values():
        batas = (dt.date.fromisoformat(awal) - dt.timedelta(days=30)).isoformat()   # kejadian yang lanjut dilaporkan WA sesudah logbook diam
        cocok = [e for e in kej if f'{o["prov"]}|{o["kab"]}' in e.get('kab_kode', []) and (e.get('mulai') or '') >= batas]
        kec = {k.strip() for e in cocok for k in e.get('kec') or []}
        o['kec'] = max(len(kec), o.get('kec_wa') or 0, *[e.get('n_kec') or 0 for e in cocok]) or None
        o['mulai'] = min([e['mulai'] for e in cocok if e.get('mulai')] + [o['pertama']])
        o['status'] = 'Sudah surut' if o['surut_tgl'] else 'Belum surut'
    baris = sorted(J.values(), key=lambda o: (o['status'] != 'Belum surut', -(o['kk'] or 0)))
    return baris, (min(berkas) if berkas else None), (max(berkas) if berkas else None)


def butir_wa(teks, kab):
    """Butir '- Kunci: isi' satu kejadian banjir kab/kota dari teks WA Koordalops mentah (Dampak, Pengungsi, Kerusakan, ...)."""
    for blok in re.split(r'\n\s*\d+\.\s*', '\n' + teks)[1:]:
        kepala = blok.split('\n', 1)[0]
        if 'banjir' in kepala.lower() and re.search(rf'\b{re.escape(kab)}\b', kepala, re.I):
            out = {}
            for m in re.finditer(r'^[\s\-*•⁠]*([A-Za-z][A-Za-z ]{2,30}?)\s*[:;]\s*(.+)$', blok.split('\n\n')[0], re.M):
                out.setdefault(m[1].strip().capitalize(), m[2].strip())
            return out
    return {}


def rapi(t):
    """Kondisi mutakhir WA apa adanya, hanya singkatan dan kapital tengah kalimat dirapikan."""
    t = re.sub(r'\s*\([^()]*pendataan[^()]*\)', '', t or '')   # "(masih dalam pendataan)" berulang di tiap butir (pemilik 15 Nov 2026: "bagusin")
    t = re.sub(r'±\s*', '', t)
    t = re.sub(r'\byg\b', 'yang', re.sub(r'\s+', ' ', t).strip().rstrip('.,'))
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
        # pil berlabel; status boleh dua baris "ringkas\nrincian" (mis. jumlah dan nama kecamatan Siaga), baris kedua di bawah nama
        fn, fs, f2, D = F(34), F(28), F(26, False), 42 * SS
        A = [dict(k=k, n=n, st=t.split('\n')[0], st2=(t.split('\n') + [''])[1], isi=i, tg=c, ik=ik, ax=X(pus[k][0]), ay=Y(pus[k][1]))
             for k, n, t, i, c, ik in label if k in pus]
        for a in A:
            a['ph'] = 58 * SS; a['blok'] = a['ph'] + (40 * SS if a['st2'] else 0)   # nama kecamatan di bawah pil, di luar pil
            a['w'] = 8 * SS + D + 10 * SS + d.textlength(a['n'], font=fn) + 8 * SS + d.textlength(a['st'], font=fs) + 16 * SS
        A.sort(key=lambda a: a['ax']); h = (len(A) + 1) // 2; kiri, kanan = A[:h], A[h:]
        for grup, sisi in ((kiri, 'l'), (kanan, 'r')):
            grup.sort(key=lambda a: a['ay']); n = len(grup)
            for i, a in enumerate(grup):
                y_ideal = min(max(a['ay'], a['ph']), H_ - a['blok'])
                a['y'] = y_ideal if n == 1 else a['ph'] + i * (H_ - 2 * a['blok']) / (n - 1) * 0.5 + y_ideal * 0.5
                a['x0'] = 6 * SS if sisi == 'l' else W_ - 6 * SS - a['w']; a['x1'] = a['x0'] + a['w']
            for i in range(1, n):   # tanpa tumpuk
                grup[i]['y'] = max(grup[i]['y'], grup[i - 1]['y'] - grup[i - 1]['ph'] / 2 + grup[i - 1]['blok'] + grup[i]['ph'] / 2 + 10 * SS)
            lebih = grup[-1]['y'] - grup[-1]['ph'] / 2 + grup[-1]['blok'] - H_ if grup else 0
            if lebih > 0:
                for a in grup: a['y'] -= lebih
        for a in A:
            ujung = a['x1'] if a in kiri else a['x0']
            d.line([(ujung, a['y']), (a['ax'], a['ay'])], fill='#' + NAVY, width=2 * SS)
            d.ellipse([a['ax'] - 6 * SS, a['ay'] - 6 * SS, a['ax'] + 6 * SS, a['ay'] + 6 * SS], fill='#FFFFFF', outline='#' + NAVY, width=2 * SS)
        for a in A:
            ph = a['ph']; y0 = a['y'] - ph / 2
            d.rounded_rectangle([a['x0'], y0, a['x1'], y0 + ph], radius=ph / 2, fill='#' + a['isi'], outline='#' + a['tg'], width=SS)
            c0 = a['x0'] + 8 * SS; d.ellipse([c0, a['y'] - D / 2, c0 + D, a['y'] + D / 2], fill='#' + a['tg'])
            g_ = Image.open(os.path.join(TPL, a['ik'])).convert('RGBA').resize((int(D * .62), int(D * .62)), Image.LANCZOS)
            im.paste(g_, (int(c0 + D * .19), int(a['y'] - D * .31)), g_)
            tx = c0 + D + 10 * SS
            d.text((tx, a['y']), a['n'], font=fn, fill='#' + NAVY, anchor='lm')
            d.text((tx + d.textlength(a['n'], font=fn) + 8 * SS, a['y'] + SS), a['st'], font=fs, fill='#' + a['tg'], anchor='lm')
            if a['st2']:
                xs2 = a['x0'] + 12 * SS if a in kiri else a['x1'] - 12 * SS - d.textlength(a['st2'], font=f2)
                d.text((xs2, y0 + ph + 22 * SS), a['st2'], font=f2, fill='#' + NAVY, anchor='lm', stroke_width=3 * SS, stroke_fill='#FFFFFF')
    # skala 100 km dan arah utara
    px = 100 / 111.32 * s; x0, y0 = 30 * SS, H_ - 26 * SS
    d.line([(x0, y0), (x0 + px, y0)], fill='#' + NAVY, width=3 * SS)
    d.text((x0 + px / 2, y0 - 16 * SS), '100 km', font=F(20, False), fill='#' + NAVY, anchor='mm')
    d.polygon([(x0 + 6 * SS, y0 - 70 * SS), (x0, y0 - 46 * SS), (x0 + 12 * SS, y0 - 46 * SS)], fill='#' + NAVY)
    d.text((x0 + 6 * SS, y0 - 36 * SS), 'U', font=F(20), fill='#' + NAVY, anchor='mm')
    im.resize((W, H), Image.LANCZOS).save(png, optimize=True)


def peta_kec(png, w_in, h_in, kode, kab, level):
    """Peta kecamatan satu kab/kota: warna level tertinggi N hari {kec: 0..3}, nama kecamatan di tengahnya, kab tetangga abu muda."""
    G = json.load(open(os.path.join(AKAR, 'public', 'geo', 'kecamatan', f'{kode}.json'), encoding='utf-8'))['features']
    K = geo_kab(kode)
    xs = [c for f in G if f['properties']['kab'] == kab for q in cincin(f['geometry']) for c in q[0]]
    lon0, lon1, lat0, lat1 = min(c[0] for c in xs), max(c[0] for c in xs), min(c[1] for c in xs), max(c[1] for c in xs)
    SS, W, H = 2, int(w_in * 300), int(h_in * 300); W_, H_ = W * SS, H * SS
    s = min(W_ * .9 / (lon1 - lon0), H_ * .9 / (lat1 - lat0)); cx, cy = (lon0 + lon1) / 2, (lat0 + lat1) / 2
    X = lambda o: W_ / 2 + (o - cx) * s; Y = lambda a: H_ / 2 - (a - cy) * s
    im = Image.new('RGB', (W_, H_), '#FFFFFF'); d = ImageDraw.Draw(im)
    isi = {3: LEVEL[3][1], 2: LEVEL[2][1], 1: 'F6D9BC', 0: 'E1E6ED'}
    for k, g in K.items():
        if k != f'{kode}|{kab}':
            for q in cincin(g):
                d.polygon([(X(c[0]), Y(c[1])) for c in q[0]], fill='#F3F5F8', outline='#FFFFFF', width=SS)
    pus = {}
    for f in G:
        if f['properties']['kab'] != kab: continue
        n = f['properties']['kec']; lv = level.get(n, 0)
        for q in cincin(f['geometry']):
            pts = [(X(c[0]), Y(c[1])) for c in q[0]]
            if len(pts) > 2: d.polygon(pts, fill='#' + isi[lv], outline='#FFFFFF', width=2 * SS)
            if len(q[0]) > len(pus.get(n, (0, []))[1]): pus[n] = (lv, q[0])
    F = lambda n, b=True: ImageFont.truetype(os.path.join(FONT, 'Roboto-' + ('Bold' if b else 'Regular') + '.ttf'), n * SS)
    for n, (lv, ring) in pus.items():
        x, y = X(sum(c[0] for c in ring) / len(ring)), Y(sum(c[1] for c in ring) / len(ring))
        d.text((x, y), n, font=F(24), fill='#FFFFFF' if lv >= 2 else '#' + NAVY, anchor='mm', stroke_width=0)
    px = 10 / 111.32 * s; x0, y0 = 30 * SS, H_ - 26 * SS
    d.line([(x0, y0), (x0 + px, y0)], fill='#' + NAVY, width=3 * SS)
    d.text((x0 + px / 2, y0 - 16 * SS), '10 km', font=F(20, False), fill='#' + NAVY, anchor='mm')
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
    tb = sum(k[1] for k in kol); L = [w * k[1] / tb for k in kol]; hk = .23   # kepala tabel satu baris (pemilik 15 Nov 2026)
    rh = min(rh, (y_maks - y - hk) / sum(.65 if isinstance(b, dict) and 'pita' in b else 1 for b in baris))   # rh = batas atas tinggi baris
    kotak(sl, x, y, w, hk, NAVY, MSO_SHAPE.ROUNDED_RECTANGLE, .18)
    cx = x
    for k, lw in zip(kol, L):
        tx(sl, cx + .03, y, lw - .06, hk, k[0].upper() if len(k[0]) < 40 else k[0], sz=7.5, b=True, c='FFFFFF', al='c')
        cx += lw
    yy = y + hk
    for bi, b in enumerate(baris):
        pita, tot = isinstance(b, dict) and 'pita' in b, isinstance(b, dict) and b.get('total')
        sel = b.get('sel', []) if isinstance(b, dict) else b
        h = b['h'] if isinstance(b, dict) and 'h' in b else rh * (.65 if pita else 1)
        if yy + h > y_maks + 1e-6: raise ValueError(f'tabel tidak muat: {len(baris)} baris, tinggi baris {rh:.2f}')
        if pita: kotak(sl, x, yy, w, h, PITA); tx(sl, x + .1, yy, w * .6, h, b['pita'], sz=9.19, b=True)
        if tot: kotak(sl, x, yy, w, h, NAVY, MSO_SHAPE.ROUNDED_RECTANGLE, .14)
        cx = x
        for i, (k, lw) in enumerate(zip(kol, L)):
            v = sel[i] if i < len(sel) else None
            if isinstance(v, dict) and 'pil' in v:
                ik = v.get('ikon'); ph = min(h * .64, .26); d = ph * .78
                pw = min(lw - .06, .16 + len(v['pil']) * .062 + (d + .05 if ik else 0))
                px, py = cx + (lw - pw) / 2, yy + (h - ph) / 2
                kotak(sl, px, py, pw, ph, v['isi'], MSO_SHAPE.ROUNDED_RECTANGLE, .5)
                if ik:   # ikon putih di lingkaran warna tegas (pemilik 15 Nov 2026: "kasih icon")
                    kotak(sl, px + (ph - d) / 2, py + (ph - d) / 2, d, d, v.get('lingkar', v['tegas']), MSO_SHAPE.OVAL)
                    sl.shapes.add_picture(os.path.join(TPL, ik), Inches(px + (ph - d) / 2 + d * .2), Inches(py + (ph - d) / 2 + d * .2), Inches(d * .6), Inches(d * .6))
                    tx(sl, px + d + .07, yy, pw - d - .1, h, v['pil'], sz=7.5, b=True, c=v['tegas'], al='c')
                else:
                    tx(sl, cx, yy, lw, h, v['pil'], sz=7.5, b=True, c=v['tegas'], al='c')
            elif isinstance(v, dict) and 'daftar' in v:   # butir bertumpuk berikon, tanpa pemisah koma (pemilik 15 Nov 2026)
                lh = min(.22, h / len(v['daftar'])); d = .17; y0 = yy + (h - lh * len(v['daftar'])) / 2   # ukuran ikon sama di semua baris
                WI = {'rumah-putih.png': '1B5A93', 'jalan-putih.png': 'D9600B', 'jembatan-putih.png': '8F3F07'}   # warna per jenis (pemilik: "iconnya ga keliatan")
                for j, (ik, tk) in enumerate(v['daftar']):
                    yj = y0 + j * lh
                    kotak(sl, cx + .08, yj + (lh - d) / 2, d, d, WI.get(ik, NAVY), MSO_SHAPE.OVAL)
                    sl.shapes.add_picture(os.path.join(TPL, ik), Inches(cx + .08 + d * .17), Inches(yj + (lh - d) / 2 + d * .17), Inches(d * .66), Inches(d * .66))
                    tx(sl, cx + .14 + d, yj, lw - d - .18, lh, tk, sz=8)
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
        lanjut = bi + 1 < len(baris) and isinstance(baris[bi + 1], list) and baris[bi + 1][0] == ''   # baris lanjutan kelompok: tanpa garis
        if not pita and not tot and not lanjut: kotak(sl, x, yy - .004, w, .007, GARIS)
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


def ubin(sl, x, y, w, h, angka, ket, isi='EEF3F9', tegas=NAVY, ikon='orang-putih.png'):
    """Ubin angka kunci: ikon putih di lingkaran berwarna, angka besar, keterangan (pemilik 15 Nov 2026: "kasih icon")."""
    kotak(sl, x, y, w, h, isi, MSO_SHAPE.ROUNDED_RECTANGLE, .1)
    d = h * .66; cy = y + (h - d) / 2
    kotak(sl, x + .12, cy, d, d, tegas, MSO_SHAPE.OVAL)
    sl.shapes.add_picture(os.path.join(TPL, ikon), Inches(x + .12 + d * .2), Inches(cy + d * .2), Inches(d * .6), Inches(d * .6))
    tx(sl, x + .24 + d, y + .04, w - d - .3, h * .56, angka, sz=17, b=True, c=tegas)
    tx(sl, x + .24 + d, y + h * .58, w - d - .3, h * .34, ket, sz=8, c=INK)


PALET = ['051C2C', '1B5A93', '4F86C6', '9CC3E6', 'D9600B', 'E8894A', 'F3C9A0', '8F3F07', '6B7280', 'B8C2CF']


def grafik_tumpuk(sl, x, y, w, h, kategori, seri, judul_g):
    """Kolom bertumpuk native: seri {nama: [nilai per kategori]}."""
    from pptx.chart.data import CategoryChartData
    from pptx.enum.chart import XL_CHART_TYPE, XL_LEGEND_POSITION
    cd = CategoryChartData(); cd.categories = kategori
    for nm, v in seri.items(): cd.add_series(nm, v)
    g = sl.shapes.add_chart(XL_CHART_TYPE.COLUMN_STACKED, Inches(x), Inches(y), Inches(w), Inches(h), cd).chart
    g.has_title = True; g.chart_title.text_frame.text = judul_g
    rr = g.chart_title.text_frame.paragraphs[0].runs[0]; rr.font.size = Pt(9.19); rr.font.bold = True; rr.font.name = 'Roboto'; rr.font.color.rgb = warna(NAVY)
    g.has_legend = False   # legenda digambar sendiri sebagai kisi rata (legenda bawaan berantakan, pemilik 15 Nov 2026)
    g.plots[0].gap_width = 60; g.plots[0].overlap = 100
    for i, sr in enumerate(g.series):
        sr.format.fill.solid(); sr.format.fill.fore_color.rgb = warna(PALET[i % len(PALET)])
    for ax in (g.category_axis, g.value_axis):
        ax.tick_labels.font.size = Pt(7.5); ax.tick_labels.font.name = 'Roboto'; ax.format.line.color.rgb = warna(GARIS)
    g.value_axis.tick_labels.number_format = '#,##0'; g.value_axis.tick_labels.number_format_is_linked = False
    g.value_axis.major_gridlines.format.line.color.rgb = warna('E6EAF0')
    return g


def legenda(sl, x, y, w, nama, kolom=3, tinggi=.22):
    """Legenda kisi rata: kotak warna PALET + nama, `kolom` per baris. -> y akhir."""
    lw = w / kolom
    for i, n in enumerate(nama):
        cx, cy = x + (i % kolom) * lw, y + (i // kolom) * tinggi
        kotak(sl, cx, cy + .06, .11, .11, PALET[i % len(PALET)], MSO_SHAPE.ROUNDED_RECTANGLE, .2)
        tx(sl, cx + .18, cy, lw - .2, tinggi, n, sz=8)
    return y + math.ceil(len(nama) / kolom) * tinggi


def butir_kerusakan(t):
    """'27 unit rumah terdampak, 10 titik akses jalan terdampak dan 1 jembatan kayu rusak' -> [(ikon, butir)]."""
    t = rapi(t).rstrip('.')
    if t == '–': return []
    out = []
    for b in re.split(r'(?<!\d),\s*(?![^()]*\))|,(?!\d)\s*(?![^()]*\))|\s+dan\s+(?=\d)', t):   # "494,5 ha" tidak dipecah (22 Nov 2026)
        b = b.strip().rstrip('.')
        if len(b) > 45: b = re.sub(r'\s*\([^)]*\)', '', b)   # rincian dalam kurung membuat butir dua baris dan menimpa butir berikutnya (22 Nov 2026)
        if not b: continue
        lb = b.lower()
        ik = 'jembatan-putih.png' if 'jembatan' in lb else 'jalan-putih.png' if re.search(r'jalan|akses', lb) else 'rumah-putih.png' if re.search(r'rumah|ruko|fas', lb) else 'awas-putih.png'
        out.append((ik, b[:1].upper() + b[1:]))
    return out


def angka_kerusakan(t):
    """Rumah, jembatan, akses jalan dari butir Kerusakan WA; None bila tidak disebut."""
    t = t or ''
    def jml(pola):
        xs = [int(m.replace('.', '').replace(',', '')) for m in re.findall(pola, t, re.I)]
        return sum(xs) if xs else None
    return (jml(r'([\d.,]+)\s*unit\s*rumah'), jml(r'(\d+)\s*(?:unit\s*)?jembatan'), jml(r'(\d+)\s*(?:titik\s*|ruas\s*)?(?:akses\s*)?jalan'))


def pil_kondisi(st):
    return {'pil': st, 'isi': KONDISI[st][0], 'tegas': KONDISI[st][1], 'ikon': 'banjir-putih.png' if st == 'Belum surut' else 'cek-putih.png'}


def pil_level(lv, singkat=False):
    if not lv: return '–'
    nm = LEVEL[lv][2]
    return {'pil': nm[0] if singkat else nm, 'isi': LEVEL[lv][0], 'tegas': LEVEL[lv][1] if lv >= 2 else '9A5B1E', 'lingkar': LEVEL[lv][1] if lv >= 2 else 'C98A4B',
            **({} if singkat else {'ikon': {3: 'awas-putih.png', 2: 'banjir-putih.png', 1: 'hujan-putih.png'}[lv]})}


DARURAT = {'tanggap': ('Tanggap Darurat', 'F8DDE0', 'C8102E'), 'siaga': ('Siaga Darurat', 'FBE7D6', 'B84E08'),
           'transisi': ('Transisi Darurat', 'DCEBF8', '1B5A93'), 'proses': ('Dalam penetapan', 'EEF0F3', '6B7280')}


def pil_darurat(t):
    """Butir Penetapan Status -> (pil jenis status, tanggal berakhir)."""
    t = (t or '').strip(); lt = t.lower()
    j = 'tanggap' if 'tanggap' in lt else 'transisi' if 'transisi' in lt else 'siaga' if 'siaga' in lt else 'proses' if t and t != '-' else None
    if not j: return '–', '–'
    nm, isi, tg = DARURAT[j]
    if 'provinsi' in lt: nm += ' Prov.'
    m = re.search(r's\.?d\.?\s*(\d{1,2})/(\d{1,2})/(\d{4})', t)
    return {'pil': nm, 'isi': isi, 'tegas': tg}, (f'{int(m[1])} {BULAN[int(m[2]) - 1]} {m[3]}' if m else '–')


def status_darurat(t):
    """'Siaga Darurat Provinsi TMT 11/11/2026 s.d 31/01/2027' -> 'Siaga Darurat Provinsi s.d. 31 Jan 2027'."""
    t = (t or '').strip()
    m = re.search(r'^(.*?)\s*TMT\s*[\d/]+\s*s\.?d\.?\s*(\d{1,2})/(\d{1,2})/(\d{4})', t, re.I)
    if not m: return t.rstrip('.') or '–'
    jenis = re.sub(r'^Penetapan Status\s*', '', m[1]).strip()
    return f'{jenis} s.d. {int(m[2])} {BULAN[int(m[3]) - 1]} {m[4]}'


BMKG = {'hujan ringan': 1, 'hujan sedang': 2, 'hujan lebat': 3, 'hujan petir': 3, 'petir': 3, 'hujan sangat lebat': 3}
BMKG_GAYA = {1: ('Ringan', 'DCEBF8', '1B5A93'), 2: ('Sedang', '9CC3E6', '051C2C'), 3: ('Lebat', '1B5A93', 'FFFFFF')}


# ---------------------------------------------------------------- deck

def slide_lengkap(L):
    """Slide ringkasan, perkembangan dan kerusakan, hujan dan sungai untuk paket --lengkap (dipanggil dari bangun dengan locals())."""
    buka, sel_hari, hk, hari, rk, lap, kode, prov = L['buka'], L['sel_hari'], L['hk'], L['hari'], L['rk'], L['lap'], L['kode'], L['prov']
    wa0, wa1, tanggal, gis, dibuat, n_hari, rentang, kerja = L['wa0'], L['wa1'], L['tanggal'], L['gis'], L['dibuat'], L['n_hari'], L['rentang'], L['kerja']
    sk = f'Laporan Dit. Koordalops BNPB, {tgl(wa0 or tanggal)} s.d. {tgl(wa1 or tanggal)} {(wa1 or tanggal)[:4]}'
    tmp = tempfile.mkdtemp(prefix='situasi-banjir-lengkap-')
    sungai = json.load(open(unduh('sungai.json', tmp)))
    bmkg = json.load(open(unduh('cuaca_bmkg_kab10.json', tmp)))
    shutil.rmtree(tmp, ignore_errors=True)
    # debit sungai per titik di provinsi ini pada hari prakiraan
    j0 = sungai['hari'].index(hari[0]) if hari[0] in sungai['hari'] else None
    titik = []
    for t in sungai['titik']:
        if t['prov'] != kode or not t.get('q2') or j0 is None or not t.get('kab'): continue
        qf = [x for x in t['q'][j0:j0 + n_hari] if x is not None]
        if not qf: continue
        pk = max(qf); i = t['q'][j0:j0 + n_hari].index(pk)
        kls = 3 if pk >= t['q20'] else 2 if pk >= t['q5'] else 1 if pk >= t['q2'] else 0
        titik.append(dict(kab=t['kab'] or '–', kec=t['kec'] or '–', pk=pk, q2=t['q2'], r=pk / t['q2'], kls=kls, tgl=hari[i]))
    titik.sort(key=lambda t: -t['r'])
    sg_kab = {}
    for t in titik: sg_kab[t['kab']] = max(sg_kab.get(t['kab'], 0), t['r'])
    # ---------- 1. ringkasan
    sl = buka('ringkas')
    belum = [o for o in lap if o['status'] == 'Belum surut']
    kk, jiwa = sum(o['kk'] or 0 for o in lap), sum(o.get('jiwa') or 0 for o in lap)
    ungsi = sum(o['ungsi'] or 0 for o in lap); hilang = sum(o.get('hilang') or 0 for o in lap); md = sum(o.get('meninggal') or 0 for o in lap)
    kab_pr = {v['kab']: v for k, v in rk.items() if k[0] == kode}
    cS = sum(v['s'] for v in kab_pr.values()); cA = sum(v['a'] for v in kab_pr.values()); cW = sum(v['w'] for v in kab_pr.values())
    surut_ = (['', ' semua sudah surut,'] if lap and not belum else [f' {len(belum)}', ' belum surut,'])   # "0 belum surut" janggal (23 Nov 2026)
    judul(sl, ['Banjir melanda', f' {len(lap)}', f' kab/kota {prov} (', rb(kk), ' KK);', *surut_,
               f' {sum(1 for v in kab_pr.values() if v["s"] or v["a"])}', f' kabupaten/kota Siaga{"/Awas" if cA else ""} pada', f' {rentang}', ''])   # pemilik 23 Nov 2026: "ubah jadi 6 kabupaten/kota" (tabel per kab/kota)
    w4 = (12.13 - 3 * .07) / 4
    ub = [(rb(len(lap)), 'Kab/kota terdampak banjir', 'EEF3F9', NAVY, 'radius-putih.png'),
          (rb(len(belum)), 'Kab/kota belum surut', KONDISI['Belum surut'][0], KONDISI['Belum surut'][1], 'banjir-putih.png'),
          (rb(kk), 'KK terdampak', 'EEF3F9', NAVY, 'rumah-putih.png'), (rb(jiwa or None), 'Jiwa terdampak', 'EEF3F9', NAVY, 'orang-putih.png'),
          (rb(ungsi or None), 'Jiwa mengungsi', 'EEF3F9', NAVY, 'tenda-putih.png'),
          (rb(hilang + md or None), 'Jiwa meninggal atau hilang' + (', ' + ', '.join(o['kab'] for o in lap if o.get('hilang') or o.get('meninggal')) if hilang + md else ''), KONDISI['Belum surut'][0], KONDISI['Belum surut'][1], 'hati-putih.png'),
          (rb(cA + cS), 'Kecamatan Siaga dan Awas', LEVEL[2][0], LEVEL[2][1], 'awas-putih.png'), (rb(cW), 'Kecamatan Waspada', LEVEL[1][0], 'C98A4B', 'hujan-putih.png')]
    for i, (n_, ket, isi, tg, ik) in enumerate(ub):
        ubin(sl, .6 + (i % 4) * (w4 + .07), 1.45 + (i // 4) * .66, w4, .6, n_, ket, isi, tg, ik)
    nama = list(dict.fromkeys([o['kab'] for o in lap] + [v['kab'] for v in sorted(kab_pr.values(), key=lambda v: (-v['a'], -v['s'], -v['mm'])) if v['a'] or v['s']]))
    lpk = {o['kab']: o for o in lap}
    # pemilik 22 Nov 2026: "Ini mulai banjirnya kapan masukin. Dan itu sudah surut. kapan surutnya"
    kol = [('Kab/Kota', 1.45, 'l'), ('Kondisi kini', 1.1, 'c'), ('Mulai banjir', .72, 'c'), ('Surut', .62, 'c'), ('KK', .6, 'c'), ('Jiwa', .65, 'c'), ('Mengungsi', .75, 'c'),
           ('Status darurat', 1.6, 'c'), ('Berakhir', .85, 'c'), ('Prakiraan', 1.0, 'c'), ('Mulai Siaga', .72, 'c'), ('Hujan 3 hari', .75, 'c')]
    br = []
    for n in nama:
        o, v = lpk.get(n), kab_pr.get(n, {'hari': [0] * n_hari, 'mm': 0, 'tgl': None})
        lv = max(v['hari']); ms = next((hari[i] for i, x in enumerate(v['hari']) if x >= 2), None)
        pd_, sd_ = pil_darurat((o.get('butir') or {}).get('Penetapan status')) if o else ('–', '–')
        br.append([n, pil_kondisi(o['status']) if o else '–', tgl(o['mulai']) if o and o.get('mulai') else '–',
                   tgl(o['surut_tgl']) if o and o.get('surut_tgl') else '–', rb(o['kk']) if o else '–', rb(o.get('jiwa')) if o else '–', rb(o['ungsi']) if o else '–',
                   pd_, sd_, pil_level(lv), tgl(ms) if ms else '–', f"{round(v['mm'])} mm" if v['tgl'] else '–'])
    tabel(sl, .6, 2.86, 12.13, kol, br, .4, 6.95)
    sumber(sl, f'{sk}; {gis}')
    # ---------- 3. perkembangan dan kerusakan
    sl = buka('tren')
    hari_wa = sorted({h for o in lap for h in o.get('seri', {})})
    seri = {}
    for o in sorted(lap, key=lambda o: -(o['kk'] or 0)):
        nil, akhir = [], None
        for h in hari_wa:
            kk_h = (o['seri'].get(h) or (None, None))[0]
            if kk_h and kk_h >= .1 * (akhir or 0): akhir = kk_h   # laporan kejadian baru kecil (<10%) di kab/kota yang sama tidak menimpa angka
            akhir = akhir or 0
            nil.append(akhir)
        seri[o['kab']] = nil
    tot = [sum(v[i] for v in seri.values()) for i in range(len(hari_wa))]
    i0 = next((i for i, x in enumerate(tot) if x), 0)
    kr = {o['kab']: angka_kerusakan((o.get('butir') or {}).get('Kerusakan')) for o in lap}
    rum, jem, jal = (sum(x[j] or 0 for x in kr.values()) for j in range(3))
    arah = 'naik' if tot[-1] > tot[i0] else 'turun' if tot[-1] < tot[i0] else 'tetap'
    judul(sl, [f'KK terdampak {arah} dari', f' {rb(tot[i0])}', f' ({tgl(hari_wa[i0])}) menjadi', f' {rb(tot[-1])}', f' ({tgl(hari_wa[-1])}); kerusakan',
               f' {rb(rum)}', ' rumah,', f' {rb(jem)}', ' jembatan, dan', f' {rb(jal)}', ' akses jalan'])
    n_baris = math.ceil(len(seri) / 3)
    grafik_tumpuk(sl, .6, 1.42, 5.8, 5.5 - n_baris * .22 - .1, [tgl(h) for h in hari_wa[i0:]], {k: v[i0:] for k, v in seri.items()}, 'KK terdampak per kab/kota, laporan harian')
    legenda(sl, .75, 6.95 - n_baris * .22, 5.6, list(seri))
    kolR = [('Kab/Kota', 1.35, 'l'), ('Rumah', .62, 'c'), ('Jembatan', .7, 'c'), ('Jalan', .55, 'c'), ('Rincian kerusakan', 2.97, 'l')]
    isi_r = [butir_kerusakan((o.get('butir') or {}).get('Kerusakan')) for o in lap]
    unit = min(.3, (6.95 - 1.4 - .23 - .4) / max(1, sum(max(1, len(x)) for x in isi_r)))   # tinggi per butir; baris = jumlah butir x unit
    brR = [{'sel': [o['kab'], rb(kr[o['kab']][0]), rb(kr[o['kab']][1]), rb(kr[o['kab']][2]), {'daftar': x} if x else '–'],
            'h': max(1, len(x)) * unit} for o, x in zip(lap, isi_r)]
    brR.append({'total': True, 'sel': [f'Total {len(lap)} kab/kota', rb(rum), rb(jem), rb(jal), ''], 'h': .4})
    tabel(sl, 6.55, 1.4, 6.19, kolR, brR, .6, 6.95)
    sumber(sl, sk)
    # ---------- 5. hujan (BMKG) dan sungai (GloFAS)
    sl = buka('pemicu')
    bk = {}
    for kd, v in bmkg['kab'].items():
        if v.get('prov') != kode: continue
        hh = {x['tgl']: BMKG.get((x.get('kondisi') or '').strip().lower(), 0) for x in v.get('hari', [])}
        bk[kab_bersih(v['nama'])] = [hh.get(h) for h in hari]
    n_lebat = sum(1 for v in bk.values() if any((x or 0) >= 3 for x in v))
    naik = [t for t in titik if t['kls'] >= 1]
    tt = titik[0] if titik else None
    # judul tanpa debit sungai (pemilik 15 Nov 2026: "Debit sungai tertinggi gausah disebut")
    judul(sl, ['BMKG memprakirakan hujan lebat atau petir di', f' {n_lebat}', f' kab/kota {prov} pada {n_hari} hari ke depan (', rentang, ')'])
    kolB = [('Kab/Kota', 1.5, 'l')] + [(h, .7, 'c') for h in hk]   # tanpa kolom prakiraan kita (pemilik 15 Nov 2026: "Hilangkan")

    def sel_b(x):
        return {'pil': BMKG_GAYA[x][0], 'isi': BMKG_GAYA[x][1], 'tegas': BMKG_GAYA[x][2]} if x else '–'
    urut_b = sorted(bk, key=lambda n: (-sum(x or 0 for x in bk[n]), n))[:22]   # baris tetap terbaca di provinsi besar
    brB = []
    for n in urut_b:
        brB.append([n] + [sel_b(x) for x in bk[n]])
    tabel(sl, .6, 1.4, 5.8, kolB, brB, .3, 6.95)
    kolS = [('Kab/Kota', 1.3, 'l'), ('Kecamatan', 1.15, 'l'), ('Debit, m³/dtk', .9, 'c'), ('Batas meluap', 1.2, 'c'), ('% batas meluap', 1.0, 'c'), ('Puncak', .7, 'c')]
    # dikelompokkan per kab/kota (pemilik 15 Nov 2026): kab/kota urut persen tertinggi, nama hanya di baris pertama kelompok
    pilih = titik[:len(urut_b)]; urut_kab = list(dict.fromkeys(t['kab'] for t in pilih))
    pilih = [t for k in urut_kab for t in pilih if t['kab'] == k]
    pilih = [dict(t, kab_tampil=t['kab'] if i == 0 or pilih[i - 1]['kab'] != t['kab'] else '') for i, t in enumerate(pilih)]
    brS = [[t['kab_tampil'], (t['kec'], INK, False), rb(round(t['pk'])), rb(round(t['q2'])),
            ({'pil': f'{round(100 * t["r"])}%', 'isi': LEVEL[min(3, t['kls'] + 1)][0] if t['kls'] else 'EEF3F9', 'tegas': LEVEL[min(3, t['kls'] + 1)][1] if t['kls'] else NAVY}),
            tgl(t["tgl"])] for t in pilih]
    tabel(sl, 6.55, 1.4, 6.19, kolS, brS, .4, 6.95)
    sumber(sl, f'BMKG prakiraan cuaca, {tgl(bmkg["dibuat"])} {bmkg["dibuat"][:4]} {bmkg["dibuat"][11:16].replace(":", ".")} WIB; GloFAS, {tgl(dibuat)} {dibuat[:4]}')


def bangun(prov, n_hari, tanggal, keluar, wa=(), kab_fokus=None, provinsi_lain=False, lengkap=False, surut=None):
    import wa_harian
    from wilayah import PROVINSI
    kode = {v.lower(): k for k, v in PROVINSI.items()}.get(prov.lower()) or sys.exit(f'provinsi tidak dikenal: {prov}')
    prov = PROVINSI[kode]
    st, dibuat = status_n_hari(n_hari)
    if st['hari'][0] < tanggal <= st['hari'][-1]:   # data situs belum diperbarui hari ini: buang hari yang sudah lewat
        i = st['hari'].index(tanggal); st['hari'] = st['hari'][i:]
        for v in st['kec'].values(): v['b'], v['h3d'] = v['b'][i:], v['h3d'][i:]
        print(f'PERINGATAN: data situs dibuat {dibuat}; prakiraan dipotong jadi {len(st["hari"])} hari mulai {tanggal}', file=sys.stderr)
    hari = st['hari']; n_hari = len(hari)
    rk = rekap_status(st)
    lap, wa0, wa1 = sudah_banjir(kode, tanggal, wa)
    if surut:   # konfirmasi Koordalops di luar laporan harian: semua kab/kota provinsi ini sudah surut (Sumbar 23 Nov 2026 10.39)
        for o in lap:
            if o['status'] == 'Belum surut': o['status'], o['surut_tgl'] = 'Sudah surut', surut
        wa1 = max(wa1 or surut, surut)
    if wa1 and wa1 < tanggal:
        print(f'PERINGATAN: WA Koordalops terakhir {wa1}; aturan_slide.py menuntut sampai {tanggal}. Tambahkan --wa <berkas WA terbaru>.', file=sys.stderr)
    jam = dibuat[11:16].replace(':', '.')
    rentang = f'{dt.date.fromisoformat(hari[0]).day}-{tgl(hari[-1])}'
    gis = f'ECMWF IFS, GloFAS, InaRISK BNPB, {tgl(dibuat)} {dibuat[:4]} {jam} WIB'
    lain = {} if not provinsi_lain else {k: v for k, v in rk.items() if k[0] != kode and (v['a'] or v['s'])}
    if lengkap:   # paket paling banyak 5 slide (pemilik 15 Nov 2026)
        urut = ['ringkas', 'sudah', 'tren', 'prakiraan', 'pemicu']
        label = {'ringkas': 'Ringkasan', 'sudah': 'Sudah banjir', 'tren': 'Perkembangan', 'prakiraan': f'Prakiraan {n_hari} hari', 'pemicu': 'Hujan dan sungai'}
    else:
        urut = (['fokus'] if kab_fokus else []) + ['sudah', 'prakiraan'] + (['lain'] if lain else [])
        label = {'fokus': kab_fokus, 'sudah': 'Sudah banjir', 'prakiraan': f'Prakiraan {n_hari} hari', 'lain': 'Provinsi lain'}
    pos = {k: i for i, k in enumerate(urut)}; bagian = [label[k] for k in urut]; n_sl = len(urut)

    os.makedirs(keluar, exist_ok=True)
    tpl = os.path.join(TPL, 'templat.pptx')
    P = Presentation(tpl); S = gandakan(P, n_sl); kerja = tempfile.mkdtemp(prefix='situasi-banjir-png-')

    def buka(jenis):
        i = pos[jenis]; nav(S[i], bagian, i, i + 1); return S[i]

    def sel_hari(lv):
        return {'kotak': LEVEL[lv][2][0], 'isi': LEVEL[lv][0] if lv < 2 else LEVEL[lv][1], 'tegas': 'FFFFFF' if lv >= 2 else '9A5B1E'} if lv else '–'
    hk = [f'{HARI_SINGKAT[dt.date.fromisoformat(h).weekday()]} {dt.date.fromisoformat(h).day}' for h in hari]

    # ---- 0. fokus satu kab/kota: peta kecamatan, laporan Koordalops, status per kecamatan
    if 'fokus' in pos:
        sl = buka('fokus')
        kec = {k.split('|')[2]: v for k, v in st['kec'].items() if k.startswith(f'{kode}|{kab_fokus}|')}
        semua = sorted({f['properties']['kec'] for f in json.load(open(os.path.join(AKAR, 'public', 'geo', 'kecamatan', f'{kode}.json')))['features']
                        if f['properties']['kab'] == kab_fokus})
        if not semua: sys.exit(f'kab/kota tidak dikenal di {prov}: {kab_fokus}')
        mx = {n: max(kec[n]['b']) if n in kec else 0 for n in semua}
        cA, cS, cW = (sum(1 for v in mx.values() if v == x) for x in (3, 2, 1))
        lp = next((o for o in lap if o['kab'] == kab_fokus), None)
        ada = [(n_, nm) for n_, nm in ((cA, 'Awas'), (cS, 'Siaga'), (cW, 'Waspada')) if n_]   # tanpa "0 kecamatan ..."
        st_kab = []
        for j, (n_, nm) in enumerate(ada):
            st_kab += [(' ' if j else '') + str(n_), (' kecamatan ' if j == 0 else ' ') + nm + (',' if j < len(ada) - 2 else ' dan' if j == len(ada) - 2 else '')]
        ekor = [f' pada {n_hari} hari ke depan (', rentang, ')'] if ada else [f'tanpa kecamatan berstatus pada {n_hari} hari ke depan (', rentang, ')']
        kepala = f'Banjir {kab_fokus} sejak {tgl(lp["mulai"])} berdampak pada' if lp else f'Di {kab_fokus} terdapat'
        isi = ([kepala, f' {rb(lp["kk"])}', ' KK; '] if lp else [kepala + ' ']) if ada else ([kepala, f' {rb(lp["kk"])}', ' KK, '] if lp else [f'{kab_fokus} '])
        if len(isi) % 2 == 0: isi.append('')
        pre = isi + st_kab if ada else isi + ['']
        if len(pre) % 2: pre.append('')   # ekor mulai dari potongan teks (indeks genap)
        judul(sl, pre + ekor)
        png = os.path.join(kerja, 'p0.png'); peta_kec(png, 5.8, 4.33, kode, kab_fokus, mx)
        sl.shapes.add_picture(png, Inches(.6), Inches(1.42), Inches(5.8), Inches(4.33))
        lw3 = (5.8 - 2 * .07) / 3
        for i, (n_, nm, lv, ik) in enumerate(((cA, 'Awas', 3, 'awas-putih.png'), (cS, 'Siaga', 2, 'banjir-putih.png'), (cW, 'Waspada', 1, 'hujan-putih.png'))):
            kartu(sl, .6 + i * (lw3 + .07), 5.86, lw3, rb(n_), 'Kecamatan ' + nm, LEVEL[lv][0], 'C98A4B' if lv == 1 else LEVEL[lv][1], ik)
        sisa_kosong = 6.95 - 6.28
        if sisa_kosong > .4 and lp:   # status penanganan di bawah kartu
            kartu(sl, .6, 6.53, 5.8, KONDISI[lp['status']][1] and lp['status'], (lp.get('butir') or {}).get('Penetapan status', '–'), *KONDISI[lp['status']],
                  'banjir-putih.png' if lp['status'] == 'Belum surut' else 'cek-putih.png')
        y = 1.4
        if lp and lp.get('butir'):
            b = lp['butir']; kolL = [('Butir', 1.25, 'l'), (f'Laporan Koordalops {tgl(lp["akhir"])}', 4.94, 'j', 8.5, 'bungkus')]
            brL = [[nm.replace('mutakhir', 'terakhir'), (rapi(b[nm]), INK, False)] for nm in ('Dampak', 'Pengungsi', 'Kerusakan', 'Kondisi mutakhir') if b.get(nm)]   # pemilik 15 Nov: "Kondisi terakhir"
            y = tabel(sl, 6.55, 1.4, 6.19, kolL, brL, .36, 1.4 + .23 + .36 * len(brL)) + .14
        kolK = [('Kecamatan', 1.7, 'l')] + [(h, .4, 'c') for h in hk] + [('Hujan 3 hari', .8, 'c'), ('Tgl. puncak', .72, 'c')]

        def puncak_kec(v):
            i = max(range(len(v['b'])), key=lambda d: (v['b'][d], v['h3d'][d]))
            return str(round(v['h3d'][i])), tgl(hari[i])
        urut = sorted(semua, key=lambda n: (-mx[n], -(max(kec[n]['h3d']) if n in kec else 0), n))
        brK = [[n] + ([sel_hari(x) for x in kec[n]['b']] + list(puncak_kec(kec[n])) if n in kec else ['–'] * (len(hari) + 2)) for n in urut]
        tabel(sl, 6.55, y, 6.19, kolK, brK, .4, 6.95)
        sumber(sl, (f'Laporan Dit. Koordalops BNPB, {tgl(lp["akhir"])} {lp["akhir"][:4]}; ' if lp else '') + gis)

    # ---- 1. sudah banjir
    sl = buka('sudah')
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
                              pil_kondisi(o['status'])] for o in lap]
    br.append({'total': True, 'sel': [f'Total {len(lap)} kab/kota', rb(n_kec), '', '', rb(n_kk), rb(sum(o['ungsi'] or 0 for o in lap) or None), '']})
    # tabel kondisi mutakhir di bawah: tinggi baris tabel atas diperkecil (paling kecil .24) supaya kondisi muat; yang tak muat = KK terkecil
    m_eff, rk_ = len(br) - .35, .28
    rh1 = min(.33, max(.23, (6.95 - 1.4 - .23 - .14 - .23 - len(belum) * rk_ - .23) / m_eff)) if belum else .33
    yb = tabel(sl, 6.55, 1.4, 6.19, kol, br, rh1, 6.95)
    n_k = int((6.95 - yb - .14 - .23) // rk_)
    if belum and n_k >= 1:   # kondisi mutakhir kab/kota yang belum surut, kata-kata laporan Koordalops
        kol2 = [('Kab/Kota', 1.35, 'l'), ('Laporan', .58, 'c'), ('Kondisi terakhir', 4.26, 'j', 8, 'bungkus')]
        tabel(sl, 6.55, yb + .14, 6.19, kol2, [[o['kab'], tgl(o['akhir']), (rapi(o['kondisi']), INK, False)] for o in belum[:n_k]], rk_, 6.95)
    sumber(sl, f'Laporan Dit. Koordalops BNPB, {tgl(wa0 or tanggal)} s.d. {tgl(wa1 or tanggal)} {(wa1 or tanggal)[:4]}; Logbook Pusdalops BNPB')

    # ---- 2. prakiraan N hari, provinsi pilihan
    sl = buka('prakiraan')
    kini = {o['kab']: o['status'] for o in lap}
    kab = sorted([v for k, v in rk.items() if k[0] == kode and (v['a'] or v['s'] or v['kab'] in kini)],
                 key=lambda v: (-v['a'], -v['s'], -v['mm'], v['kab']))
    a, s_ = sum(v['a'] for v in kab), sum(v['s'] for v in kab); nk = sum(1 for v in kab if v['a'] or v['s'])
    w_ = sum(v['w'] for k, v in rk.items() if k[0] == kode)
    # potongan genap = teks, ganjil = angka oranye; '' menjaga urutannya
    awal = (['Terdapat', f' {a}', ' kecamatan berstatus Awas,', f' {s_}', ' Siaga', ''] if a else ['Terdapat', f' {s_}', ' kecamatan berstatus Siaga', ''])
    judul(sl, awal + [' di', f' {nk}', f' kab/kota {prov} dan', f' {w_}', f' Waspada pada {n_hari} hari ke depan (', rentang, ')'])
    wr = {f'{kode}|{v["kab"]}': LEVEL[max(v['hari'])][1] for k, v in rk.items() if k[0] == kode and max(v['hari']) >= 1}
    # label peta: jumlah dan nama kecamatan Siaga/Awas (pemilik 15 Nov 2026: "kasih tau kecamatannya apa aja", "sama jumlahnya")
    kec_st = {}
    for k_, v_ in st['kec'].items():
        pr_, kb_, kc_ = k_.split('|')
        if pr_ == kode and max(v_['b']) >= 2: kec_st.setdefault(kb_, []).append((max(v_['b']), kc_))
    def teks_kec(kb_):
        xs = sorted(kec_st.get(kb_, []), reverse=True); a_ = [c for l_, c in xs if l_ == 3]; s2 = [c for l_, c in xs if l_ == 2]
        ring = ', '.join(x for x in (f'{len(a_)} kec. Awas' if a_ else '', f'{len(s2)} kec. Siaga' if s2 else '') if x)
        nm = a_ + s2
        return ring + '\n' + ', '.join(nm[:3]) + (f' +{len(nm) - 3} lainnya' if len(nm) > 3 else '')
    lb = [(f'{kode}|{v["kab"]}', v['kab'], teks_kec(v['kab']), LEVEL[3 if v['a'] else 2][0], LEVEL[3 if v['a'] else 2][1],
           'awas-putih.png' if v['a'] else 'banjir-putih.png') for v in kab if v['a'] or v['s']][:6]   # paling banyak 6 label supaya peta terbaca
    LP = 4.9   # panel kiri disempitkan, tabel kanan lebih lega (pemilik 15 Nov 2026)
    png = os.path.join(kerja, 'p2.png'); peta(png, LP, 3.82, wr, lb, kode)
    sl.shapes.add_picture(png, Inches(.6), Inches(1.42), Inches(LP), Inches(3.82))
    lw3 = (LP - 2 * .07) / 3; xs = [.6 + i * (lw3 + .07) for i in range(3)]
    for x_, n_, nm, lv, ik, df in ((xs[0], a, 'Awas', 3, 'awas-putih.png', 'Hujan tiga hari 120 mm atau lebih di wilayah bahaya tinggi, atau debit sungai setara banjir 20 tahunan.'),
                                    (xs[1], s_, 'Siaga', 2, 'banjir-putih.png', 'Hujan tiga hari 80 mm atau lebih, hujan 30 mm per jam, atau peluang hujan lebat 50% di wilayah bahaya sedang ke atas, atau debit sungai setara banjir 5 tahunan.'),
                                    (xs[2], w_, 'Waspada', 1, 'hujan-putih.png', 'Hujan tiga hari 40 mm atau lebih, hujan 20 mm per jam, atau debit sungai setara banjir 2 tahunan.')):
        tegas = 'C98A4B' if lv == 1 else LEVEL[lv][1]
        kartu(sl, x_, 5.36, lw3, rb(n_), 'Kecamatan ' + nm, LEVEL[lv][0], tegas, ik)
        keterangan(sl, x_, 5.86, lw3, 1.09, nm, df, LEVEL[lv][0], tegas, ik)
    # kolom Awas hanya bila ada kecamatan Awas, supaya kepala dan pil tetap satu baris
    kol = [('Kab/Kota', 1.55, 'l')] + ([('Awas', .5, 'c')] if a else []) + [('Siaga', .5, 'c')] + [(h, .5, 'c') for h in hk] + [('Hujan', .7, 'c'), ('Puncak', .7, 'c'), ('Kini', 1.1, 'c')]

    br = [[v['kab']] + ([rb(v['a'] or None)] if a else []) + [rb(v['s'] or None)] + [sel_hari(x) for x in v['hari']] +
          [f"{round(v['mm'])} mm" if v['tgl'] else '–', tgl(v['tgl']) if v['tgl'] else '–',   # hujan dan tanggal dipisah (pemilik 15 Nov 2026)
           pil_kondisi(kini[v['kab']]) if v['kab'] in kini else '–'] for v in kab]
    br.append({'total': True, 'sel': [f'{len(kab)} kab/kota'] + ([rb(a)] if a else []) + [rb(s_)] + [''] * (len(hari) + 3)})
    tabel(sl, .6 + LP + .15, 1.4, 12.73 - (.6 + LP + .15), kol, br, .44, 6.95)
    sumber(sl, gis)

    # ---- 3. provinsi lain
    if 'lain' in pos:
        sl = buka('lain')
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
            kolA = [('Kab/Kota Awas', 1.5, 'l'), ('Provinsi', 1.35, 'l'), ('Kec. Awas', .7, 'c'), ('Kec. Siaga', .7, 'c'), ('Hujan 3 hari', .85, 'c'), ('Tgl. puncak', .75, 'c')]
            tabel(sl, .6, 5.55, 5.8, kolA, [[v['kab'], (PROVINSI[v['pr']], INK, False), rb(v['a']), rb(v['s'] or None), str(round(v['mm'])), tgl(v['tgl'])] for v in aw[:5]], .3, 6.95)
        kol = [('Provinsi', 1.7, 'l'), ('Kab/Kota', .44, 'c'), ('Kec. Awas', .5, 'c'), ('Kec. Siaga', .5, 'c')] + [(h, .37, 'c') for h in hk] + [('Hujan tertinggi', 1.6, 'l', 8.5), ('mm', .42, 'c')]
        br = [[PROVINSI[o['pr']], str(len(o['kab'])), rb(o['a'] or None), rb(o['s'] or None)] + [sel_hari(x) for x in o['hari']] +
              ([(o['kab_mm'], INK, False), str(round(o['mm']))] if o['tgl'] else ['–', '–']) for o in pv]
        br.append({'total': True, 'sel': [f'Jumlah {len(pv)} provinsi', str(sum(len(o['kab']) for o in pv)), rb(A), rb(S2)] + [''] * (len(hari) + 2)})
        tabel(sl, 6.55, 1.4, 6.19, kol, br, min(.33, (6.95 - 1.63) / max(len(br), 1)), 6.95)
        sumber(sl, gis)

    if lengkap:
        slide_lengkap(locals())
    d = dt.date.fromisoformat(tanggal); nama = f'Situasi Banjir {kab_fokus + " dan " if kab_fokus and not lengkap else ""}{prov} {d:%d%m%y}'
    out = os.path.join(keluar, nama + '.pptx'); P.save(out)
    shutil.rmtree(kerja, ignore_errors=True)
    from pdf import ke_pdf
    pdf = ke_pdf(out)
    print(json.dumps(dict(pptx=out, pdf=pdf, hari=hari, sudah_banjir=len(lap), belum_surut=len(belum), wa=[wa0, wa1],
                          kec_awas=a, kec_siaga=s_, provinsi_lain=len(lain) and len({k[0] for k in lain})), ensure_ascii=False))
    return out


def uji():
    assert kab_bersih('Kab. Pidie Jaya') == 'Pidie Jaya' and kab_bersih('Kota Subulussalam') == 'Kota Subulussalam'
    assert [x[1] for x in butir_kerusakan('494,5 ha lahan terdampak, 344 rumah terdampak')] == ['494,5 ha lahan terdampak', '344 rumah terdampak']
    assert kab_bersih('Kab. Limapuluh Kota') == 'Lima Puluh Kota'
    assert kab_bersih('Kab. Lima puluh Kota') == 'Lima Puluh Kota' and kab_bersih('Kab. Kep.  Mentawai') == 'Kep. Mentawai'
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
    ap.add_argument('--prov', default='Aceh'); ap.add_argument('--kab', help='kab/kota fokus di slide pertama, mis. "Aceh Singkil"'); ap.add_argument('--provinsi-lain', action='store_true', help='tambah slide Awas/Siaga provinsi lain (bawaan: tidak, pemilik 15 Nov 2026)'); ap.add_argument('--hari', type=int, default=6)
    ap.add_argument('--tanggal', default=dt.date.today().isoformat()); ap.add_argument('--wa', nargs='*', default=[])
    ap.add_argument('--lengkap', action='store_true', help='paket 5 slide: ringkasan, sudah banjir, perkembangan, prakiraan, hujan dan sungai')
    ap.add_argument('--surut', metavar='TANGGAL', help='konfirmasi Koordalops: semua kab/kota provinsi ini sudah surut pada TANGGAL (YYYY-MM-DD)')
    ap.add_argument('--keluar'); ap.add_argument('--uji', action='store_true'); ap.add_argument('--ramping', nargs=2, metavar=('ASAL', 'TUJUAN'))
    a = ap.parse_args()
    if a.uji: uji()
    elif a.ramping: ramping(*a.ramping)
    else:
        if not 1 <= a.hari <= 6: sys.exit('--hari 1 sampai 6 (hujan.json memuat 6 hari ke depan)')
        nm = (a.kab + ' ' if a.kab and not a.lengkap else '') + a.prov + (' lengkap' if a.lengkap else '')
        bangun(a.prov, a.hari, a.tanggal, a.keluar or os.path.join(SINI, '..', 'paparan', f"situasi-banjir-{nm.lower().replace(' ', '-')}-{a.tanggal}"), a.wa, a.kab, a.provinsi_lain, a.lengkap, a.surut)
